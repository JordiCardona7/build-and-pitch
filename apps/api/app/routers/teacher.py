"""Puerta Aula: salones, tareas (clave), hojas, diagnósticos y semáforo."""
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .. import config
from ..schemas import (AssignmentOut, Board, ClassIn, ClassOut, Diagnosis, DiagnosisPatch, SeedIn, TranscriptLine)
from ..services import board as board_svc
from ..services import demo, sheets, vision
from ..services import fractions as F
from ..services.grok import GrokError
from ..services.problems import make_exercise
from ..store import ASSIGNMENTS, CLASSES, DIAGNOSES, LOCK, STUDENTS, AssignmentRec, ClassRec, make_class_code, new_id

router = APIRouter(tags=["aula"])
MAX_BYTES = 12 * 1024 * 1024


async def read_upload(f: UploadFile) -> bytes:
    raw = await f.read()
    if not raw:
        raise HTTPException(400, "La foto llegó vacía.")
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "La foto pesa demasiado (máximo 12 MB).")
    return raw


@router.post("/classes", response_model=ClassOut)
def create_class(body: ClassIn):
    with LOCK:
        code = make_class_code(body.name)
        CLASSES[code] = ClassRec(code=code, name=body.name.strip() or "Mi salón")
        return ClassOut(code=code, name=CLASSES[code].name)


@router.get("/classes/{code}")
def get_class(code: str):
    """Adicional al contrato: el salón y sus tareas (para la pantalla 'Mis tareas')."""
    c = CLASSES.get(code)
    if not c:
        raise HTTPException(404, "No encontré ese salón.")
    return {"code": c.code, "name": c.name,
            "assignments": [{"id": a.id, "exercise": a.exercise.model_dump()} for a in ASSIGNMENTS.values() if a.class_code == code]}


@router.post("/classes/{code}/assignments", response_model=AssignmentOut)
async def create_assignment(code: str, key_text: Optional[str] = Form(None), key_image: Optional[UploadFile] = File(None)):
    if code not in CLASSES:
        CLASSES[code] = ClassRec(code=code, name=code)
    lines: list[str] = []
    pair = F.parse_exercise(key_text or "") if key_text else None
    if key_text:
        lines = [p.strip() for p in key_text.replace("\n", " ").split("=") if p.strip()]
        lines = [lines[0]] + [f"= {x}" for x in lines[1:]] if lines else []
    if pair is None and key_image is not None:
        raw = await read_upload(key_image)
        try:
            data = vision.read_key(raw)
        except GrokError as e:
            raise HTTPException(503, "No pude leer la foto de la clave. Escríbela, por ejemplo: 1/2 + 1/3 = 5/6") from e
        pair = F.parse_exercise(str(data.get("exercise", "")))
        lines = [str(x) for x in data.get("lines", [])] or lines
    if pair is None:
        raise HTTPException(400, "No encontré el ejercicio. Escríbelo así: 1/2 + 1/3 = 5/6")
    ex = make_exercise(*pair)
    right = F.correct_sum(*pair)
    asg = AssignmentRec(id=new_id("as"), class_code=code, exercise=ex,
                        key_transcript=[TranscriptLine(index=i, text=t, ok=True) for i, t in enumerate(lines or [ex.text])])
    ASSIGNMENTS[asg.id] = asg
    return AssignmentOut(id=asg.id, exercise=ex, key_answer={"n": right.numerator, "d": right.denominator},
                         key_transcript=asg.key_transcript)


@router.post("/assignments/{assignment_id}/sheets", response_model=Diagnosis)
async def upload_sheet(assignment_id: str, background: BackgroundTasks, image: UploadFile = File(...),
                       student_name: Optional[str] = Form(None)):
    asg = ASSIGNMENTS.get(assignment_id)
    if not asg:
        raise HTTPException(404, "No encontré esa tarea.")
    raw = await read_upload(image)
    d = sheets.create_pending(raw, asg.exercise, (student_name or "").strip(), None, asg.id, "aula")
    background.add_task(sheets.process, d.id, raw, asg.class_code)
    return d


@router.get("/diagnoses/{diagnosis_id}", response_model=Diagnosis)
def get_diagnosis(diagnosis_id: str):
    rec = DIAGNOSES.get(diagnosis_id)
    if not rec:
        raise HTTPException(404, "No encontré ese diagnóstico.")
    return rec.diagnosis


@router.patch("/diagnoses/{diagnosis_id}", response_model=Diagnosis)
def patch_diagnosis(diagnosis_id: str, body: DiagnosisPatch):
    with LOCK:
        rec = DIAGNOSES.get(diagnosis_id)
        if not rec:
            raise HTTPException(404, "No encontré ese diagnóstico.")
        upd: dict = {"teacher_override": True, "status": "done", "error_code": body.error_code, "correct": body.error_code is None}
        if body.error_code is None:
            upd.update(error_line=None, error_box=None, feedback="¡Bien resuelto!")
        if body.student_name:
            upd["student_name"] = body.student_name.strip()
            if rec.student_id in STUDENTS and rec.context != "solo":
                STUDENTS[rec.student_id].name = body.student_name.strip()
        rec.diagnosis = rec.diagnosis.model_copy(update=upd)
        return rec.diagnosis


@router.get("/assignments/{assignment_id}/board", response_model=Board)
def get_board(assignment_id: str):
    if assignment_id not in ASSIGNMENTS:
        raise HTTPException(404, "No encontré esa tarea.")
    return board_svc.build_board(assignment_id)


@router.post("/demo/seed", response_model=Board)
def seed(body: SeedIn):
    asg_id = demo.seed(body.class_code)
    return board_svc.build_board(asg_id)


@router.get("/files/{name}", include_in_schema=False)
def get_file(name: str):
    path = (config.STORAGE_DIR / name).resolve()
    if path.parent != config.STORAGE_DIR.resolve() or not path.exists():
        raise HTTPException(404, "Archivo no encontrado.")
    return FileResponse(path)
