"""Modelos Pydantic = espejo exacto de docs/CONTRACTS.md §1. No cambiar sin seguir el proceso de contratos."""
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

ErrorCode = Literal[
    "SUMA_DIRECTA", "NUMERADOR_SIN_AJUSTAR", "SUMA_DENOMINADORES",
    "AMPLIFICACION_INCORRECTA", "DENOMINADOR_NO_COMUN", "MULTIPLICA",
    "ERROR_ARITMETICO", "OTRO",
]
Level = Literal["CONCEPTO_FRACCION", "EQUIVALENCIA", "DENOMINADOR_COMUN", "SUMA"]
LightStatus = Literal["rojo", "amarillo", "verde", "revisar"]
DiagnosisStatus = Literal["pending", "done", "needs_review", "failed"]

ERROR_LABELS: dict[str, str] = {
    "SUMA_DIRECTA": "Suma numeradores y denominadores",
    "NUMERADOR_SIN_AJUSTAR": "Cambia el denominador pero no ajusta los numeradores",
    "SUMA_DENOMINADORES": "Convierte bien, pero también suma los de abajo",
    "AMPLIFICACION_INCORRECTA": "Multiplica el numerador por el número equivocado",
    "DENOMINADOR_NO_COMUN": "Usa un denominador que no es común",
    "MULTIPLICA": "Multiplica en vez de sumar",
    "ERROR_ARITMETICO": "El procedimiento va bien, pero se equivocó en una cuenta",
    "OTRO": "Otro error (revisar)",
}
# Cómo lo dice el semáforo en lenguaje humano: "14 alumnos <frase>"
ERROR_GROUP_PHRASES: dict[str, str] = {
    "SUMA_DIRECTA": "sumaron también los de abajo",
    "NUMERADOR_SIN_AJUSTAR": "cambiaron el denominador sin ajustar el de arriba",
    "SUMA_DENOMINADORES": "convirtieron bien pero sumaron los denominadores",
    "AMPLIFICACION_INCORRECTA": "multiplicaron por el número equivocado",
    "DENOMINADOR_NO_COMUN": "usaron un denominador que no es común",
    "MULTIPLICA": "multiplicaron en vez de sumar",
    "ERROR_ARITMETICO": "se equivocaron en una cuenta",
    "OTRO": "tienen otro error",
}
LEVEL_LABELS: dict[str, str] = {
    "CONCEPTO_FRACCION": "Qué es una fracción",
    "EQUIVALENCIA": "Fracciones equivalentes",
    "DENOMINADOR_COMUN": "Pedazos del mismo tamaño",
    "SUMA": "Sumar con distinto denominador",
}


class Frac(BaseModel):
    n: int
    d: int


class Exercise(BaseModel):
    id: str
    a: Frac
    b: Frac
    text: str


class TranscriptLine(BaseModel):
    index: int
    text: str
    ok: bool


class Box(BaseModel):
    x: float
    y: float
    w: float
    h: float


class Diagnosis(BaseModel):
    id: str
    status: DiagnosisStatus
    student_name: str
    exercise: Exercise
    image_url: str
    transcript: list[TranscriptLine] = Field(default_factory=list)
    final_answer: Optional[Frac] = None
    correct: bool = False
    error_code: Optional[ErrorCode] = None
    error_line: Optional[int] = None
    error_box: Optional[Box] = None
    feedback: str = ""
    confidence: float = 0.0
    teacher_override: bool = False
    note: Optional[str] = None


class StudentSummary(BaseModel):
    id: str
    name: str
    status: LightStatus
    error_code: Optional[ErrorCode] = None
    stars: int = 0
    last_diagnosis_id: Optional[str] = None
    source: Literal["aula", "solo", "demo"] = "aula"


class StudentDetail(StudentSummary):
    history: list[Diagnosis] = Field(default_factory=list)


class BoardGroup(BaseModel):
    error_code: str            # ErrorCode | "CORRECTO" | "REVISAR"
    label: str
    students: list[StudentSummary]


class Board(BaseModel):
    class_code: str
    assignment_id: str
    exercise: Exercise
    counts: dict[str, int]
    total: int
    groups: list[BoardGroup]


# ---------- Lecciones ----------
class Checkpoint(BaseModel):
    prompt: str
    answer: str


class Step(BaseModel):
    say: str
    draw: list[dict[str, Any]] = Field(default_factory=list)
    checkpoint: Optional[Checkpoint] = None


class Lesson(BaseModel):
    id: str
    title: str
    error_code: Optional[ErrorCode] = None
    level: Optional[Level] = None
    steps: list[Step]


# ---------- Cuerpos de petición / respuestas ----------
class MetaOut(BaseModel):
    error_labels: dict[str, str]
    level_labels: dict[str, str]
    demo_mode: bool


class ClassIn(BaseModel):
    name: str


class ClassOut(BaseModel):
    code: str
    name: str


class AssignmentOut(BaseModel):
    id: str
    exercise: Exercise
    key_answer: Frac
    key_transcript: list[TranscriptLine]


class DiagnosisPatch(BaseModel):
    error_code: Optional[ErrorCode] = None
    student_name: Optional[str] = None


class SeedIn(BaseModel):
    class_code: str


class StudentIn(BaseModel):
    name: str
    class_code: Optional[str] = None


class StudentOut(BaseModel):
    id: str
    name: str
    class_code: Optional[str] = None


class ProblemIn(BaseModel):
    target_error: Optional[ErrorCode] = None
    difficulty: Optional[Literal[1, 2, 3]] = None


class QuizItem(BaseModel):
    id: str
    prompt: str
    draw: list[dict[str, Any]]
    options: list[str]


class QuizOut(BaseModel):
    items: list[QuizItem]


class QuizIn(BaseModel):
    answers: dict[str, str]


class QuizResult(BaseModel):
    level: Level
    lesson_id: str


class ProgressIn(BaseModel):
    event: Literal["lesson_done", "explained"]
    lesson_id: str


class AskIn(BaseModel):
    lesson_id: str
    step_index: int = 0
    question: str


class AskOut(BaseModel):
    steps: list[Step]


class ExplainBackIn(BaseModel):
    lesson_id: str
    transcript: str


class ExplainBackOut(BaseModel):
    feedback: str
    understood: bool


class TtsIn(BaseModel):
    text: str
    voice: Optional[str] = None
