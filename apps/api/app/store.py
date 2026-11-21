"""Estado en memoria. Suficiente para el hackathon: el contenedor se reinicia en cada despliegue
y al arrancar se puede volver a cargar el salón demo. Todo acceso pasa por aquí."""
import logging
import os
import pickle
import random
import string
import threading
import time
import unicodedata
import uuid
from dataclasses import dataclass, field
from typing import Optional

from . import config
from .schemas import Diagnosis, Exercise, Lesson

LOCK = threading.RLock()
log = logging.getLogger("store")


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def norm_name(name: str) -> str:
    s = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode().lower()
    return " ".join(s.split())


@dataclass
class ClassRec:
    code: str
    name: str


@dataclass
class AssignmentRec:
    id: str
    class_code: str
    exercise: Exercise
    key_transcript: list


@dataclass
class StudentRec:
    id: str
    name: str
    class_code: Optional[str]
    source: str = "aula"               # aula | solo | demo
    stars: int = 0
    lesson_done_at: Optional[float] = None
    correct_after_lesson: int = 0
    verified: bool = False             # ya demostró que lo entendió → verde
    explained: bool = False
    problems: dict = field(default_factory=dict)       # exercise_id → Exercise


@dataclass
class DiagRec:
    diagnosis: Diagnosis
    student_id: Optional[str]
    assignment_id: Optional[str]       # None si viene de la Puerta Solo
    context: str                       # aula | solo | demo
    created_at: float
    image_hash: Optional[str] = None


CLASSES: dict[str, ClassRec] = {}
ASSIGNMENTS: dict[str, AssignmentRec] = {}
STUDENTS: dict[str, StudentRec] = {}
DIAGNOSES: dict[str, DiagRec] = {}
LESSONS: dict[str, Lesson] = {}        # lecciones servidas (para /lessons/ask)


def make_class_code(name: str) -> str:
    """Códigos fáciles de dictar en clase: MAT-194."""
    while True:
        code = f"MAT-{''.join(random.choices(string.digits, k=3))}"
        if code not in CLASSES and not any(c.endswith(code[-3:]) for c in CLASSES):
            return code


def _code_key(code: str) -> str:
    return "".join(ch for ch in (code or "").upper() if ch.isalnum())


def find_class_code(typed: str) -> Optional[str]:
    """Acepta 'MAT-194', 'mat194', 'mat 194' o solo '194'."""
    key = _code_key(typed)
    if not key:
        return None
    for code in CLASSES:
        if _code_key(code) == key:
            return code
    if key.isdigit():
        hits = [c for c in CLASSES if "".join(ch for ch in c if ch.isdigit()) == key]
        if len(hits) == 1:
            return hits[0]
    return None


def find_or_create_student(name: str, class_code: Optional[str], source: str) -> StudentRec:
    with LOCK:
        key = norm_name(name)
        for s in STUDENTS.values():
            if norm_name(s.name) == key and s.class_code == class_code:
                return s
        s = StudentRec(id=new_id("st"), name=name.strip() or "Alumno", class_code=class_code, source=source)
        STUDENTS[s.id] = s
        return s


def reset() -> None:
    with LOCK:
        for d in (CLASSES, ASSIGNMENTS, STUDENTS, DIAGNOSES, LESSONS):
            d.clear()
    mark_dirty()


# ---------- Persistencia: foto del estado en disco cada pocos segundos ----------
# Sobrevive a reinicios del proceso; con un Volume de Railway montado en /srv/storage, también a los despliegues.
STATE_FILE = config.STORAGE_DIR / "state.pkl"
_dirty = threading.Event()


def mark_dirty() -> None:
    _dirty.set()


def save() -> None:
    with LOCK:
        data = pickle.dumps({"classes": CLASSES, "assignments": ASSIGNMENTS, "students": STUDENTS, "diagnoses": DIAGNOSES})
    tmp = STATE_FILE.with_suffix(".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, STATE_FILE)


def load() -> None:
    if not STATE_FILE.exists():
        return
    try:
        data = pickle.loads(STATE_FILE.read_bytes())
        with LOCK:
            CLASSES.update(data["classes"]); ASSIGNMENTS.update(data["assignments"])
            STUDENTS.update(data["students"]); DIAGNOSES.update(data["diagnoses"])
        log.info("estado recuperado: %d salones, %d alumnos, %d hojas", len(CLASSES), len(STUDENTS), len(DIAGNOSES))
    except Exception as e:  # noqa: BLE001 — un archivo dañado no debe impedir que arranque la app
        log.warning("no pude leer el estado guardado (%s); empiezo vacío", e)


def start_autosave(every_s: float = 3.0) -> None:
    def loop():
        while True:
            time.sleep(every_s)
            if _dirty.is_set():
                _dirty.clear()
                try:
                    save()
                except Exception as e:  # noqa: BLE001
                    log.warning("no pude guardar el estado: %s", e)
    threading.Thread(target=loop, daemon=True, name="autosave").start()
