"""Puerta Solo: alumno, problemas, hojas, quiz de 'No sé nada, explícame' y progreso."""
import time

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from ..schemas import (Diagnosis, Exercise, ProblemIn, ProgressIn, QuizIn, QuizOut, QuizResult, StudentDetail, StudentIn,
                       StudentOut, StudentSummary)
from ..services import board as board_svc
from ..services import problems, sheets
from ..store import CLASSES, DIAGNOSES, LOCK, STUDENTS, find_or_create_student
from .teacher import read_upload

router = APIRouter(tags=["solo"])


def get_student(student_id: str):
    st = STUDENTS.get(student_id)
    if not st:
        raise HTTPException(404, "No encontré a ese alumno.")
    return st


@router.post("/students", response_model=StudentOut)
def create_student(body: StudentIn):
    code = (body.class_code or "").strip().upper() or None
    if code and code not in CLASSES:
        raise HTTPException(404, "Ese código de salón no existe. Pídeselo a tu profe o déjalo vacío.")
    st = find_or_create_student(body.name, code, "solo")
    return StudentOut(id=st.id, name=st.name, class_code=st.class_code)


@router.get("/students/{student_id}", response_model=StudentDetail)
def student_detail(student_id: str):
    st = get_student(student_id)
    diag = board_svc.latest_diag(st.id)
    s: StudentSummary = board_svc.summary(st, diag)
    history = sorted((r for r in DIAGNOSES.values() if r.student_id == st.id), key=lambda r: r.created_at, reverse=True)
    return StudentDetail(**s.model_dump(), history=[r.diagnosis for r in history])


@router.post("/students/{student_id}/problem", response_model=Exercise)
def new_problem(student_id: str, body: ProblemIn):
    st = get_student(student_id)
    ex = problems.new_problem(body.difficulty, body.target_error)
    st.problems[ex.id] = ex
    return ex


@router.post("/students/{student_id}/problem/{exercise_id}/sheet", response_model=Diagnosis)
async def upload_problem_sheet(student_id: str, exercise_id: str, background: BackgroundTasks, image: UploadFile = File(...)):
    st = get_student(student_id)
    ex = st.problems.get(exercise_id)
    if not ex:
        raise HTTPException(404, "No encontré ese problema. Pide uno nuevo.")
    raw = await read_upload(image)
    d = sheets.create_pending(raw, ex, st.name, st.id, None, "solo")
    background.add_task(sheets.process, d.id, raw, st.class_code)
    return d


@router.get("/students/{student_id}/explain/quiz", response_model=QuizOut)
def quiz(student_id: str):
    get_student(student_id)
    return QuizOut(items=problems.QUIZ)


@router.post("/students/{student_id}/explain/quiz", response_model=QuizResult)
def submit_quiz(student_id: str, body: QuizIn):
    get_student(student_id)
    level = problems.quiz_level(body.answers)
    return QuizResult(level=level, lesson_id=f"level:{level}")


@router.post("/students/{student_id}/progress", response_model=StudentSummary)
def progress(student_id: str, body: ProgressIn):
    st = get_student(student_id)
    with LOCK:
        if body.event == "lesson_done":
            st.lesson_done_at = time.time()
            st.correct_after_lesson = 0
            st.stars += 1
        elif body.event == "explained" and not st.explained:
            st.explained = True
            st.stars += 1
    return board_svc.summary(st, board_svc.latest_diag(st.id))
