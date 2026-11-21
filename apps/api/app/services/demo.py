"""Salón demo: ~25 alumnos con nombres guatemaltecos y una distribución realista de errores."""
import random
import time

from ..schemas import Diagnosis, Frac, TranscriptLine
from ..store import ASSIGNMENTS, CLASSES, DIAGNOSES, LOCK, STUDENTS, AssignmentRec, ClassRec, DiagRec, StudentRec, new_id
from .problems import make_exercise
from .vision import FEEDBACK

NAMES = ["Ana Lucía", "José Pablo", "María Fernanda", "Luis", "Sofía", "Carlos", "Valeria", "Diego", "Camila", "Javier",
         "Daniela", "Andrés", "Lucía", "Fernando", "Gabriela", "Mateo", "Isabel", "Brayan", "Ximena", "Pedro", "Andrea",
         "Wilson", "Fátima", "Héctor", "Alejandra", "Óscar", "Rosa", "Edgar", "Juana", "Cristian"]

# (código, respuesta, renglones) para 1/2 + 1/3
CASES = {
    "SUMA_DIRECTA": ((2, 5), ["1/2 + 1/3", "= 2/5"]),
    "NUMERADOR_SIN_AJUSTAR": ((2, 6), ["1/2 + 1/3", "= 1/6 + 1/6", "= 2/6"]),
    "SUMA_DENOMINADORES": ((5, 12), ["1/2 + 1/3", "= 3/6 + 2/6", "= 5/12"]),
    "MULTIPLICA": ((1, 6), ["1/2 + 1/3", "= 1×1 / 2×3", "= 1/6"]),
    "ERROR_ARITMETICO": ((6, 6), ["1/2 + 1/3", "= 3/6 + 2/6", "= 6/6"]),
    None: ((5, 6), ["1/2 + 1/3", "= 3/6 + 2/6", "= 5/6"]),
}
WEIGHTS = [("SUMA_DIRECTA", 45), ("NUMERADOR_SIN_AJUSTAR", 15), ("SUMA_DENOMINADORES", 10), ("MULTIPLICA", 5),
           ("ERROR_ARITMETICO", 5), (None, 20)]
WRONG_LINE = {"SUMA_DIRECTA": 1, "NUMERADOR_SIN_AJUSTAR": 1, "SUMA_DENOMINADORES": 2, "MULTIPLICA": 1, "ERROR_ARITMETICO": 2}


def seed(class_code: str, n: int = 24) -> str:
    """Crea (si hace falta) el salón y una tarea 1/2 + 1/3, y agrega alumnos simulados. Devuelve el id de la tarea."""
    with LOCK:
        if class_code not in CLASSES:
            CLASSES[class_code] = ClassRec(code=class_code, name="1ro Básico B")
        asg = next((a for a in ASSIGNMENTS.values() if a.class_code == class_code), None)
        if asg is None:
            ex = make_exercise((1, 2), (1, 3))
            asg = AssignmentRec(id=new_id("as"), class_code=class_code, exercise=ex,
                                key_transcript=[TranscriptLine(index=i, text=t, ok=True) for i, t in
                                                enumerate(["1/2 + 1/3", "= 3/6 + 2/6", "= 5/6"])])
            ASSIGNMENTS[asg.id] = asg
        taken = {s.name for s in STUDENTS.values() if s.class_code == class_code}
        names = [x for x in NAMES if x not in taken]
        random.shuffle(names)
        now = time.time()
        for i, name in enumerate(names[:n]):
            code = random.choices([c for c, _ in WEIGHTS], [w for _, w in WEIGHTS])[0]
            ans, lines = CASES[code]
            st = StudentRec(id=new_id("st"), name=name, class_code=class_code, source="demo", stars=random.randint(0, 3))
            if code and random.random() < 0.15:
                st.lesson_done_at = now
            STUDENTS[st.id] = st
            wl = WRONG_LINE.get(code)
            d = Diagnosis(
                id=new_id("dg"), status="done", student_name=name, exercise=asg.exercise, image_url="",
                transcript=[TranscriptLine(index=j, text=t, ok=(wl is None or j < wl)) for j, t in enumerate(lines)],
                final_answer=Frac(n=ans[0], d=ans[1]), correct=code is None, error_code=code, error_line=wl,
                feedback=FEEDBACK[code] if code else "¡Bien resuelto!", confidence=round(random.uniform(0.82, 0.98), 2),
            )
            DIAGNOSES[d.id] = DiagRec(diagnosis=d, student_id=st.id, assignment_id=asg.id, context="demo", created_at=now - 600 + i)
        return asg.id
