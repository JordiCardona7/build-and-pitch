"""Generador de problemas para la Puerta Solo y quiz de "No sé nada, explícame"."""
import random
from fractions import Fraction
from math import gcd
from typing import Optional

from ..schemas import Exercise, Frac, QuizItem
from ..store import new_id

PAIRS = {
    1: [(2, 4), (3, 6), (2, 6), (4, 8), (3, 9), (5, 10), (2, 8)],   # uno múltiplo del otro
    2: [(2, 3), (2, 5), (3, 4), (3, 5), (4, 5), (2, 7)],            # coprimos pequeños
    3: [(4, 6), (6, 8), (6, 9), (8, 12), (9, 12), (4, 10), (6, 10)],  # mcm no trivial
}
# Qué dificultad hace más visible cada error
TARGET_DIFFICULTY = {
    "SUMA_DIRECTA": 2, "NUMERADOR_SIN_AJUSTAR": 2, "SUMA_DENOMINADORES": 1, "MULTIPLICA": 1,
    "AMPLIFICACION_INCORRECTA": 3, "DENOMINADOR_NO_COMUN": 3, "ERROR_ARITMETICO": 2, "OTRO": 2,
}


def _proper(d: int) -> int:
    opts = [n for n in range(1, d) if gcd(n, d) == 1]
    return random.choice(opts)


def make_exercise(a: tuple[int, int], b: tuple[int, int], ex_id: Optional[str] = None) -> Exercise:
    return Exercise(id=ex_id or new_id("ex"), a=Frac(n=a[0], d=a[1]), b=Frac(n=b[0], d=b[1]), text=f"{a[0]}/{a[1]} + {b[0]}/{b[1]}")


def new_problem(difficulty: Optional[int] = None, target_error: Optional[str] = None) -> Exercise:
    diff = difficulty or TARGET_DIFFICULTY.get(target_error or "", 2)
    for _ in range(50):
        d1, d2 = random.choice(PAIRS[diff])
        if random.random() < 0.5:
            d1, d2 = d2, d1
        a, b = (_proper(d1), d1), (_proper(d2), d2)
        if Fraction(*a) == Fraction(*b):
            continue
        if Fraction(*a) + Fraction(*b) <= 1 or diff == 3:     # que quepa en una tortilla casi siempre
            return make_exercise(a, b)
    return make_exercise((1, 2), (1, 3))


QUIZ = [
    QuizItem(id="q1", prompt="¿Qué fracción de la tortilla está pintada?",
             draw=[{"op": "pie", "cx": 500, "cy": 300, "r": 150, "parts": 4, "shade": 3, "color": "naranja"}],
             options=["3/4", "1/4", "4/3", "3/1"]),
    QuizItem(id="q2", prompt="¿Estas dos barras tienen la misma cantidad pintada?",
             draw=[{"op": "bar", "x": 200, "y": 180, "w": 600, "h": 70, "parts": 2, "shade": 1, "color": "azul"},
                   {"op": "bar", "x": 200, "y": 330, "w": 600, "h": 70, "parts": 4, "shade": 2, "color": "verde"}],
             options=["Sí, es lo mismo", "No, la de abajo tiene más", "No, la de arriba tiene más"]),
    QuizItem(id="q3", prompt="¿Cuánto es 1/5 + 2/5?",
             draw=[{"op": "frac", "num": "1", "den": "5", "x": 380, "y": 300, "size": 70},
                   {"op": "write", "text": "+", "x": 470, "y": 325, "size": 80, "anchor": "middle"},
                   {"op": "frac", "num": "2", "den": "5", "x": 560, "y": 300, "size": 70}],
             options=["3/5", "3/10", "2/25", "1/5"]),
]
QUIZ_ANSWERS = {"q1": "3/4", "q2": "Sí, es lo mismo", "q3": "3/5"}


def quiz_level(answers: dict[str, str]) -> str:
    """Dónde se rompe el entendimiento → nivel de entrada de la clase."""
    for qid, level in (("q1", "CONCEPTO_FRACCION"), ("q2", "EQUIVALENCIA"), ("q3", "DENOMINADOR_COMUN")):
        if (answers.get(qid) or "").strip() != QUIZ_ANSWERS[qid]:
            return level
    return "SUMA"
