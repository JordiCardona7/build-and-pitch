"""Recepción y procesamiento en segundo plano de hojas fotografiadas (Puerta Aula y Puerta Solo)."""
import logging
import time
from typing import Optional

from .. import config
from ..schemas import Diagnosis, Exercise
from ..store import DIAGNOSES, LOCK, STUDENTS, DiagRec, find_or_create_student, new_id
from . import vision
from .grok import GrokError

log = logging.getLogger("sheets")


def save_image(raw: bytes) -> tuple[str, str]:
    """Guarda la foto (ya normalizada a JPG) y devuelve (url pública, hash del original)."""
    h = vision.image_hash(raw)
    name = f"{h}.jpg"
    path = config.STORAGE_DIR / name
    if not path.exists():
        try:
            path.write_bytes(vision.prepare_image(raw))
        except Exception:  # noqa: BLE001 — si no es imagen válida igual la guardamos tal cual
            path.write_bytes(raw)
    return f"/api/files/{name}", h


def create_pending(raw: bytes, exercise: Exercise, student_name: str, student_id: Optional[str],
                   assignment_id: Optional[str], context: str) -> Diagnosis:
    url, h = save_image(raw)
    d = Diagnosis(id=new_id("dg"), status="pending", student_name=student_name or "", exercise=exercise, image_url=url,
                  feedback="Revisando la hoja…")
    with LOCK:
        DIAGNOSES[d.id] = DiagRec(diagnosis=d, student_id=student_id, assignment_id=assignment_id, context=context,
                                  created_at=time.time(), image_hash=h)
    return d


def process(diag_id: str, raw: bytes, class_code: Optional[str]) -> None:
    """Corre en segundo plano: Grok visión + reglas → actualiza el diagnóstico y el progreso del alumno."""
    rec = DIAGNOSES[diag_id]
    d = rec.diagnosis
    try:
        fields = vision.diagnose(raw, d.exercise)
    except (GrokError, Exception) as e:  # noqa: BLE001
        log.warning("diagnóstico %s falló: %s", diag_id, e)
        with LOCK:
            rec.diagnosis = d.model_copy(update={
                "status": "failed", "confidence": 0.0,
                "feedback": "No pude leer bien la hoja. Prueba con otra foto, con buena luz y de frente."})
        return

    ai_name = fields.pop("ai_student_name", None)
    with LOCK:
        name = d.student_name or ai_name or f"Alumno {sum(1 for r in DIAGNOSES.values() if r.assignment_id == rec.assignment_id)}"
        if rec.student_id is None:                       # Puerta Aula: el alumno se identifica por el nombre de la hoja
            st = find_or_create_student(name, class_code, "aula")
            rec.student_id = st.id
        st = STUDENTS[rec.student_id]
        rec.diagnosis = d.model_copy(update={**fields, "student_name": st.name if rec.context == "solo" else name})
        if fields["correct"]:
            st.stars += 1
            if rec.context == "solo" and st.lesson_done_at:
                st.correct_after_lesson += 1
                if st.correct_after_lesson >= config.VERIFY_STREAK:
                    st.verified = True
        elif rec.context == "solo":
            st.correct_after_lesson = 0
