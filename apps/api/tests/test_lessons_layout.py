"""Ninguna lección dibuja fuera de la pizarra 1000x600, para varios problemas al azar."""
import random

from app.services import lessons as L
from app.services.problems import PAIRS
from app.schemas import ERROR_LABELS

VALID = {"write", "frac", "pie", "bar", "line", "arrow", "rect", "circle", "underline", "cross", "clear", "wait"}


def check(lesson):
    for st in lesson.steps:
        assert len(st.say.split()) <= 45, st.say
        for o in st.draw:
            assert o["op"] in VALID
            for k in ("x", "cx", "x1", "x2"):
                if k in o and isinstance(o[k], (int, float)):
                    assert 0 <= o[k] <= 1000, (o, lesson.id)
            for k in ("y", "cy", "y1", "y2"):
                if k in o and isinstance(o[k], (int, float)):
                    assert 0 <= o[k] <= 600, (o, lesson.id)
            if o["op"] == "bar":
                assert o["x"] + o["w"] <= 1000 and o["y"] + o["h"] <= 600
            if o["op"] == "pie":
                assert o["cx"] - o["r"] >= 0 and o["cx"] + o["r"] <= 1000 and o["cy"] + o["r"] <= 600


def test_layouts():
    random.seed(1)
    for diff, pairs in PAIRS.items():
        for d1, d2 in pairs:
            a, b = (1, d1), (d2 - 1, d2)
            for code in list(ERROR_LABELS) + [None]:
                wrong = (a[0] + b[0], d1 + d2)
                check(L.build_for_error(code, a, b, wrong, "t"))
