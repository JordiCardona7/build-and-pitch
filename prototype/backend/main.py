"""Pizarra Viva — backend (FastAPI).

Correr:
    cd backend
    pip install -r requirements.txt
    export XAI_API_KEY=tu_llave        # opcional: sin llave se usan las lecciones guardadas
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Luego abrir:
    http://localhost:8000/dashboard.html   (semáforo del docente, proyectado)
    http://localhost:8000/alumno.html      (teléfono del alumno)
    http://localhost:8000/pizarra.html     (la pizarra viva)
"""
import json
import os
import random
import re
from fractions import Fraction
from math import lcm
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE = Path(__file__).parent
LESSONS_DIR = BASE / "lessons"
FRONTEND_DIR = BASE.parent / "frontend"
LESSONS_DIR.mkdir(exist_ok=True)

XAI_API_KEY = os.getenv("XAI_API_KEY")
XAI_MODEL = os.getenv("XAI_MODEL", "grok-4.7")  # verifica el nombre exacto en console.x.ai

app = FastAPI(title="Pizarra Viva")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─────────────────────────────────────────────────────────────
# TEMA: suma de fracciones con distinto denominador (1ro básico)
# ─────────────────────────────────────────────────────────────
EXERCISES = [
    {"id": "e1", "a": [1, 2], "b": [1, 3]},
    {"id": "e2", "a": [2, 5], "b": [1, 4]},
    {"id": "e3", "a": [3, 4], "b": [1, 6]},
]
PRACTICE = {"id": "p1", "a": [1, 4], "b": [2, 3]}  # = 11/12
CHALLENGE = {  # reto estilo PISA, en contexto guatemalteco
    "id": "r1",
    "text": "Don Mario siembra 1/4 de su terreno con maíz y 2/5 con frijol. "
            "¿Qué fracción del terreno está sembrada?",
    "answer": [13, 20],
}

ERRORS = {
    "SUMA_DIRECTA": "Suma numeradores y denominadores (1/2 + 1/3 = 2/5)",
    "NUMERADOR_SIN_AJUSTAR": "Busca denominador común pero no ajusta los numeradores",
    "MULTIPLICA": "Multiplica en vez de sumar",
    "OTRO": "Otro error (revisar a mano)",
}


def parse_frac(text: str) -> Optional[tuple]:
    m = re.fullmatch(r"\s*(-?\d+)\s*(?:/\s*(\d+))?\s*", text or "")
    if not m:
        return None
    n = int(m.group(1))
    d = int(m.group(2)) if m.group(2) else 1
    return (n, d) if d != 0 else None


def classify(a, b, answer_text: str) -> str:
    """Clasifica la respuesta de a + b. Reglas deterministas: rápidas y confiables para la demo."""
    n1, d1 = a
    n2, d2 = b
    parsed = parse_frac(answer_text)
    if parsed is None:
        return "OTRO"
    n, d = parsed
    if Fraction(n, d) == Fraction(n1, d1) + Fraction(n2, d2):
        return "CORRECTO"
    if n == n1 + n2 and d == d1 + d2:
        return "SUMA_DIRECTA"
    if n == n1 + n2 and d in (d1, d2, d1 * d2, lcm(d1, d2)):
        return "NUMERADOR_SIN_AJUSTAR"
    if Fraction(n, d) == Fraction(n1 * n2, d1 * d2):
        return "MULTIPLICA"
    return "OTRO"


def frac_text(e) -> str:
    return f'{e["a"][0]}/{e["a"][1]} + {e["b"][0]}/{e["b"][1]}'


# ─────────────────────────────────────────────────────────────
# ESTADO DEL SALÓN (en memoria; suficiente para la demo)
# ─────────────────────────────────────────────────────────────
STUDENTS: dict = {}


def main_error(results: dict) -> Optional[str]:
    errs = [r for r in results.values() if r != "CORRECTO"]
    if not errs:
        return None
    return max(set(errs), key=errs.count)


def status_of(s: dict) -> str:
    if s["steps"].get("reto") or not s["error"]:
        return "verde"
    if s["steps"].get("clase"):
        return "amarillo"
    return "rojo"


def public(s: dict) -> dict:
    return {
        **s,
        "status": status_of(s),
        "error_label": ERRORS.get(s["error"]) if s["error"] else None,
    }


def get_student(name: str) -> dict:
    s = STUDENTS.get(name)
    if not s:
        raise HTTPException(404, f"No existe el alumno {name}")
    return s


class Submit(BaseModel):
    student: str
    answers: dict


class Override(BaseModel):
    student: str
    error: Optional[str] = None  # None = "lo tiene correcto"


class Progress(BaseModel):
    student: str
    step: str  # "clase" | "practica" | "reto"
    answer: Optional[str] = None


@app.get("/api/exercises")
def exercises():
    return {
        "exercises": [{"id": e["id"], "text": frac_text(e)} for e in EXERCISES],
        "practice": {"id": PRACTICE["id"], "text": frac_text(PRACTICE)},
        "challenge": {"id": CHALLENGE["id"], "text": CHALLENGE["text"]},
    }


@app.post("/api/submit")
def submit(body: Submit):
    name = body.student.strip() or "Alumno"
    results = {e["id"]: classify(e["a"], e["b"], str(body.answers.get(e["id"], ""))) for e in EXERCISES}
    err = main_error(results)
    s = {
        "name": name,
        "answers": body.answers,
        "results": results,
        "ai_error": err,
        "error": err,
        "teacher_override": False,
        "steps": {"diagnostico": True},
        "stars": sum(r == "CORRECTO" for r in results.values()),
    }
    STUDENTS[name] = s
    return public(s)


@app.get("/api/student/{name}")
def student(name: str):
    return public(get_student(name))


@app.get("/api/class")
def class_state():
    students = [public(s) for s in STUDENTS.values()]
    groups = {k: [] for k in ERRORS}
    groups["CORRECTO"] = []
    for s in students:
        groups[s["error"] or "CORRECTO"].append(s["name"])
    counts = {c: sum(1 for s in students if s["status"] == c) for c in ("rojo", "amarillo", "verde")}
    return {"students": students, "groups": groups, "labels": ERRORS, "counts": counts, "total": len(students)}


@app.post("/api/teacher/override")
def override(body: Override):
    s = get_student(body.student)
    if body.error is not None and body.error not in ERRORS:
        raise HTTPException(400, "Tipo de error desconocido")
    s["error"] = body.error
    s["teacher_override"] = body.error != s["ai_error"]
    return public(s)


@app.post("/api/progress")
def progress(body: Progress):
    s = get_student(body.student)
    correct = True
    if body.step == "practica":
        correct = classify(PRACTICE["a"], PRACTICE["b"], body.answer or "") == "CORRECTO"
    elif body.step == "reto":
        p = parse_frac(body.answer or "")
        correct = p is not None and Fraction(*p) == Fraction(*CHALLENGE["answer"])
    if correct and not s["steps"].get(body.step):
        s["steps"][body.step] = True
        s["stars"] += 1
    return {"correct": correct, **public(s)}


NAMES = [
    "Ana", "José", "María", "Luis", "Sofía", "Carlos", "Valeria", "Diego", "Camila", "Javier",
    "Daniela", "Andrés", "Lucía", "Fernando", "Gabriela", "Mateo", "Isabel", "Kevin", "Ximena",
    "Pedro", "Andrea", "Brayan", "Fátima", "Héctor", "Alejandra", "Wilson", "Marta", "Óscar",
    "Rosa", "Edgar", "Juana", "Cristian",
]


@app.post("/api/seed")
def seed(n: int = 24):
    """Llena el salón con alumnos simulados para que el tablero se vea como un salón real de ~25."""
    pool = [x for x in NAMES if x not in STUDENTS]
    for name in random.sample(pool, min(n, len(pool))):
        err = random.choices(list(ERRORS) + [None], weights=[45, 20, 10, 5, 20])[0]
        steps = {"diagnostico": True}
        if err and random.random() < 0.15:
            steps["clase"] = True
        STUDENTS[name] = {
            "name": name, "answers": {}, "results": {}, "ai_error": err, "error": err,
            "teacher_override": False, "steps": steps, "stars": random.randint(0, 3), "demo": True,
        }
    return class_state()


@app.post("/api/reset")
def reset():
    STUDENTS.clear()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────
# GROK: generación de lecciones y aclaraciones
# ─────────────────────────────────────────────────────────────
BOARD_SPEC = """
La pizarra mide 1000 x 600 (x a la derecha, y hacia abajo). Operaciones de dibujo ("draw"):
- {"op":"write","text":"...","x":60,"y":100,"size":42,"color":"negro","anchor":"start"}   (x,y = línea base del texto; anchor "start" o "middle"; size 32-50)
- {"op":"frac","num":"1","den":"2","x":110,"y":100,"size":44,"color":"azul"}   (fracción vertical; x,y = centro de la rayita)
- {"op":"line","x1":0,"y1":0,"x2":100,"y2":0,"color":"negro"}
- {"op":"arrow","x1":0,"y1":0,"x2":100,"y2":0,"color":"rojo"}
- {"op":"rect","x":0,"y":0,"w":100,"h":50,"color":"negro"}
- {"op":"circle","cx":100,"cy":100,"rx":50,"ry":60,"color":"rojo"}   (encerrar algo, ej. el error)
- {"op":"bar","x":80,"y":200,"w":360,"h":56,"parts":3,"shade":1,"color":"verde"}   (barra de fracción: entero partido en "parts", pinta "shade" partes)
- {"op":"clear"}   (borra la pizarra)
- {"op":"wait","ms":600}
Colores: negro, azul, rojo, verde, morado.
Reglas de diseño: todo dentro de 1000x600, sin encimar cosas (calcula posiciones; un texto de tamaño 40 ocupa ~18 px por carácter),
usa "clear" para cambiar de idea, escribe poco en la pizarra (palabras clave, fracciones, dibujos), no copies en la pizarra lo que dices en voz.
"""

LESSON_SYSTEM = f"""Eres una maestra guatemalteca de matemática de 1ro básico que explica en una pizarra mientras habla.
Generas una mini clase SOBRE UN ERROR ESPECÍFICO del alumno. Hablas de tú, cálida y clara, con ejemplos de Guatemala
(tortillas, quetzales, terrenos, la cancha). Cada "say" tiene 1-2 oraciones cortas (máx. 35 palabras).
Máximo 7 pasos. Paso 1: muestra el ejercicio donde falló y encierra en rojo su respuesta equivocada.
Usa barras de fracción para que el alumno VEA por qué está mal y cómo se hace bien. Último paso: pídele que explique con sus palabras.
{BOARD_SPEC}
Responde SOLO con JSON: {{"title":"...","steps":[{{"say":"...","draw":[...]}}]}}"""

ASK_SYSTEM = f"""Eres la misma maestra. El alumno te interrumpió en medio de la clase porque no entendió algo.
Responde su duda en una hoja aparte de la pizarra, con OTRA representación distinta a la que estabas usando
(si usabas barras, usa tortillas/círculos, una recta numérica o dinero en quetzales). 1 a 3 pasos, "say" de máx. 30 palabras.
Termina con una frase corta tipo "¿Ahora sí? Sigamos con la clase."
{BOARD_SPEC}
Responde SOLO con JSON: {{"steps":[{{"say":"...","draw":[...]}}]}}"""


def call_grok(system: str, user: str) -> dict:
    if not XAI_API_KEY:
        raise HTTPException(503, "Falta XAI_API_KEY")
    from openai import OpenAI  # la API de xAI es compatible con el SDK de OpenAI

    client = OpenAI(api_key=XAI_API_KEY, base_url="https://api.x.ai/v1")
    r = client.chat.completions.create(
        model=XAI_MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.4,
    )
    text = r.choices[0].message.content or ""
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise HTTPException(502, "Grok no devolvió JSON")
    return json.loads(m.group(0))


@app.get("/api/lesson/{error}")
def lesson(error: str, regenerate: bool = False):
    """Devuelve la lección guardada para ese error; si no existe (o regenerate=true), la genera con Grok y la guarda."""
    if error not in ERRORS:
        raise HTTPException(404, "Error desconocido")
    path = LESSONS_DIR / f"{error}.json"
    if path.exists() and not regenerate:
        return json.loads(path.read_text("utf-8"))
    data = call_grok(LESSON_SYSTEM, f"Error del alumno: {ERRORS[error]}. Ejercicio donde falló: 1/2 + 1/3. Genera la clase.")
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
    return data


class Ask(BaseModel):
    question: str
    context: str = ""
    lesson_title: str = ""


@app.post("/api/ask")
def ask(body: Ask):
    return call_grok(
        ASK_SYSTEM,
        f"Clase: {body.lesson_title}\nLo que estabas explicando: {body.context}\nDuda del alumno: {body.question}",
    )


# El frontend se sirve desde el mismo servidor (debe ir al final)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
