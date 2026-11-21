"""Estado en memoria. Suficiente para el hackathon: el contenedor se reinicia en cada despliegue
y al arrancar se puede volver a cargar el salón demo. Todo acceso pasa por aquí."""
import random
import string
import threading
import unicodedata
import uuid
from dataclasses import dataclass, field
from typing import Optional

from .schemas import Diagnosis, Exercise, Lesson

LOCK = threading.RLock()


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
    base = "".join(c for c in norm_name(name).upper() if c.isalnum())[:3] or "MAT"
    while True:
        code = f"{base}-{''.join(random.choices(string.digits, k=3))}"
        if code not in CLASSES:
            return code


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
