"""Lecciones para la Pizarra Viva, aclaraciones y 'explícamelo con tus palabras'."""
from fastapi import APIRouter, HTTPException

from ..schemas import AskIn, AskOut, ExplainBackIn, ExplainBackOut, Lesson
from ..services import lessons as L
from ..store import DIAGNOSES, LESSONS, LOCK

router = APIRouter(tags=["lecciones"])


def remember(lesson: Lesson) -> Lesson:
    with LOCK:
        LESSONS[lesson.id] = lesson
    return lesson


@router.get("/lessons/for-diagnosis/{diagnosis_id}", response_model=Lesson)
def lesson_for_diagnosis(diagnosis_id: str):
    rec = DIAGNOSES.get(diagnosis_id)
    if not rec:
        raise HTTPException(404, "No encontré ese diagnóstico.")
    d = rec.diagnosis
    a, b = (d.exercise.a.n, d.exercise.a.d), (d.exercise.b.n, d.exercise.b.d)
    wrong = (d.final_answer.n, d.final_answer.d) if d.final_answer and not d.correct and d.final_answer.d else None
    code = None if d.correct else d.error_code
    return remember(L.build_for_error(code, a, b, wrong, f"diag:{d.id}"))


@router.get("/lessons/{lesson_id}", response_model=Lesson)
def get_lesson(lesson_id: str):
    lesson = LESSONS.get(lesson_id) or L.lesson_by_id(lesson_id)
    if not lesson:
        raise HTTPException(404, "No encontré esa lección.")
    return remember(lesson)


@router.post("/lessons/ask", response_model=AskOut)
def ask(body: AskIn):
    lesson = LESSONS.get(body.lesson_id) or L.lesson_by_id(body.lesson_id)
    return AskOut(steps=L.ask(lesson, body.step_index, body.question))


@router.post("/lessons/explain-back", response_model=ExplainBackOut)
def explain_back(body: ExplainBackIn):
    lesson = LESSONS.get(body.lesson_id) or L.lesson_by_id(body.lesson_id)
    feedback, ok = L.explain_back(lesson, body.transcript)
    return ExplainBackOut(feedback=feedback, understood=ok)
