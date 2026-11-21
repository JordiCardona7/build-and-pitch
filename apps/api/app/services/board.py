"""Estado del semáforo: de diagnósticos y progreso de cada alumno → luces y grupos."""
from typing import Optional

from ..schemas import ERROR_GROUP_PHRASES, Board, BoardGroup, StudentSummary
from ..store import ASSIGNMENTS, DIAGNOSES, LOCK, STUDENTS, DiagRec, StudentRec

GROUP_ORDER = ["SUMA_DIRECTA", "NUMERADOR_SIN_AJUSTAR", "SUMA_DENOMINADORES", "AMPLIFICACION_INCORRECTA",
               "DENOMINADOR_NO_COMUN", "MULTIPLICA", "ERROR_ARITMETICO", "OTRO", "REVISAR", "CORRECTO"]
GROUP_LABELS = {**ERROR_GROUP_PHRASES, "REVISAR": "necesitan que revises su hoja", "CORRECTO": "lo resolvieron bien"}


def light(student: StudentRec, diag: Optional[DiagRec]) -> str:
    if diag is None:
        return "verde" if student.verified else ("amarillo" if student.lesson_done_at else "rojo")
    d = diag.diagnosis
    if d.status in ("needs_review", "failed"):
        return "revisar"
    if d.correct or student.verified:
        return "verde"
    if student.lesson_done_at:
        return "amarillo"
    return "rojo"


def latest_diag(student_id: str, assignment_id: Optional[str] = None, context: Optional[str] = None) -> Optional[DiagRec]:
    recs = [r for r in DIAGNOSES.values()
            if r.student_id == student_id and r.diagnosis.status != "pending"
            and (assignment_id is None or r.assignment_id == assignment_id)
            and (context is None or r.context == context)]
    return max(recs, key=lambda r: r.created_at) if recs else None


def summary(student: StudentRec, diag: Optional[DiagRec]) -> StudentSummary:
    d = diag.diagnosis if diag else None
    return StudentSummary(
        id=student.id, name=student.name, status=light(student, diag),
        error_code=d.error_code if d and not d.correct else None, stars=student.stars,
        last_diagnosis_id=d.id if d else None, source=student.source if student.source in ("aula", "solo", "demo") else "aula",
    )


def build_board(assignment_id: str) -> Board:
    with LOCK:
        asg = ASSIGNMENTS[assignment_id]
        groups: dict[str, list[StudentSummary]] = {}
        for st in STUDENTS.values():
            if st.class_code != asg.class_code:
                continue
            diag = latest_diag(st.id, assignment_id) or latest_diag(st.id, context="solo")
            if diag is None and st.source != "demo":
                continue                                   # aún no hay nada que mostrar de este alumno
            s = summary(st, diag)
            if s.status == "revisar":
                key = "REVISAR"
            elif diag and diag.diagnosis.correct:
                key = "CORRECTO"
            else:
                key = s.error_code or "CORRECTO"
            groups.setdefault(key, []).append(s)

        counts = {c: 0 for c in ("rojo", "amarillo", "verde", "revisar")}
        for lst in groups.values():
            for s in lst:
                counts[s.status] += 1
            lst.sort(key=lambda s: ({"rojo": 0, "amarillo": 1, "revisar": 2, "verde": 3}[s.status], s.name))

        ordered = [BoardGroup(error_code=k, label=GROUP_LABELS.get(k, k), students=groups[k])
                   for k in sorted(groups, key=lambda k: (k not in GROUP_ORDER, GROUP_ORDER.index(k) if k in GROUP_ORDER else 0,
                                                          -len(groups[k])))]
        # los grupos de error más grandes primero, REVISAR y CORRECTO al final
        errors = sorted([g for g in ordered if g.error_code not in ("REVISAR", "CORRECTO")], key=lambda g: -len(g.students))
        tail = [g for g in ordered if g.error_code in ("REVISAR", "CORRECTO")]
        return Board(class_code=asg.class_code, assignment_id=asg.id, exercise=asg.exercise, counts=counts,
                     total=sum(counts.values()), groups=errors + tail)
