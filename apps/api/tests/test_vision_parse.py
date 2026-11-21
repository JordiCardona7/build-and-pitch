from app.schemas import Exercise, Frac
from app.services.grok import extract_json
from app.services.vision import _confidence, _error_line, merge


def test_extract_json_skips_broken_braces():
    raw = 'nota {no es json luego {"lines": [{"text": "1/2"}], "final_answer": "2/5"}'
    assert extract_json(raw)["final_answer"] == "2/5"


def test_merge_accepts_string_fields():
    ex = Exercise(id="e", a=Frac(n=1, d=2), b=Frac(n=1, d=3), text="1/2 + 1/3")
    result = merge(ex, {
        "lines": [{"text": "1/2 + 1/3", "ok": True}, {"text": "= 2/5", "ok": False}],
        "final_answer": "2/5",
        "error_line": "1",
        "error_code": "SUMA_DIRECTA",
        "confidence": "90%",
        "feedback": "Sumaste también los de abajo.",
    })
    assert result["status"] == "done"
    assert result["error_line"] == 1
    assert result["error_code"] == "SUMA_DIRECTA"
    assert _confidence("alta") == 0.5
    assert _error_line("x", 2, False) is None
