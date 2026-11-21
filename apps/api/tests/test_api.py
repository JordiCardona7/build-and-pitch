import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import config, store
from app.main import app
from app.services import vision

c = TestClient(app)


def jpeg(color=(250, 250, 250)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (400, 300), color).save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture(autouse=True)
def clean(monkeypatch, tmp_path):
    store.reset()
    monkeypatch.setattr(vision, "CACHE_DIR", tmp_path)
    yield


def fake_ai(answer, code=None, name="Kevin", conf=0.9):
    def run(_img, _ex):
        return {"student_name": name, "lines": [{"text": "1/2 + 1/3", "ok": True}, {"text": f"= {answer}", "ok": code is None}],
                "final_answer": answer, "error_line": 1 if code else None, "error_code": code,
                "feedback": "Sumaste también los de abajo.", "confidence": conf, "error_box": {"x": .1, "y": .5, "w": .5, "h": .1}}
    return run


def test_meta_and_tts_without_key(monkeypatch):
    monkeypatch.setattr(config, "XAI_API_KEY", "")
    assert "SUMA_DIRECTA" in c.get("/api/meta").json()["error_labels"]
    assert c.post("/api/tts", json={"text": "hola"}).status_code == 501


def test_teacher_flow(monkeypatch):
    code = c.post("/api/classes", json={"name": "1ro Básico B"}).json()["code"]
    asg = c.post(f"/api/classes/{code}/assignments", data={"key_text": "1/2 + 1/3 = 3/6 + 2/6 = 5/6"}).json()
    assert asg["exercise"]["text"] == "1/2 + 1/3" and asg["key_answer"] == {"n": 5, "d": 6}

    monkeypatch.setattr(vision, "run_ai", fake_ai("2/5", "SUMA_DIRECTA"))
    d = c.post(f"/api/assignments/{asg['id']}/sheets", files={"image": ("h.jpg", jpeg(), "image/jpeg")}).json()
    assert d["status"] == "pending"
    d = c.get(f"/api/diagnoses/{d['id']}").json()
    assert d["status"] == "done" and d["error_code"] == "SUMA_DIRECTA" and d["student_name"] == "Kevin"
    assert d["error_line"] == 1 and d["image_url"].startswith("/api/files/")
    assert c.get(d["image_url"]).status_code == 200

    monkeypatch.setattr(vision, "run_ai", fake_ai("5/6", None, name="Ana"))
    c.post(f"/api/assignments/{asg['id']}/sheets", files={"image": ("h2.jpg", jpeg((240, 240, 240)), "image/jpeg")})

    board = c.get(f"/api/assignments/{asg['id']}/board").json()
    assert board["counts"]["rojo"] == 1 and board["counts"]["verde"] == 1
    assert board["groups"][0]["error_code"] == "SUMA_DIRECTA"

    p = c.patch(f"/api/diagnoses/{d['id']}", json={"error_code": "NUMERADOR_SIN_AJUSTAR"}).json()
    assert p["teacher_override"] and p["error_code"] == "NUMERADOR_SIN_AJUSTAR"

    lesson = c.get(f"/api/lessons/for-diagnosis/{d['id']}").json()
    assert lesson["steps"] and lesson["id"] == f"diag:{d['id']}"


def test_ai_disagreement_goes_to_review(monkeypatch):
    code = c.post("/api/classes", json={"name": "x"}).json()["code"]
    asg = c.post(f"/api/classes/{code}/assignments", data={"key_text": "1/2+1/3"}).json()
    monkeypatch.setattr(vision, "run_ai", fake_ai("2/5", "MULTIPLICA"))
    d = c.post(f"/api/assignments/{asg['id']}/sheets", files={"image": ("h.jpg", jpeg(), "image/jpeg")}).json()
    d = c.get(f"/api/diagnoses/{d['id']}").json()
    assert d["status"] == "needs_review" and d["error_code"] == "SUMA_DIRECTA"


def test_vision_failure_marks_failed(monkeypatch):
    code = c.post("/api/classes", json={"name": "x"}).json()["code"]
    asg = c.post(f"/api/classes/{code}/assignments", data={"key_text": "1/2+1/3"}).json()
    def boom(*_): raise vision.GrokError("sin red")
    monkeypatch.setattr(vision, "run_ai", boom)
    d = c.post(f"/api/assignments/{asg['id']}/sheets", files={"image": ("h.jpg", jpeg(), "image/jpeg")}).json()
    assert c.get(f"/api/diagnoses/{d['id']}").json()["status"] == "failed"


def test_solo_flow_turns_green(monkeypatch):
    code = c.post("/api/classes", json={"name": "1ro"}).json()["code"]
    board = c.post("/api/demo/seed", json={"class_code": code}).json()
    assert board["total"] >= 20
    st = c.post("/api/students", json={"name": "Kevin", "class_code": code}).json()
    ex = c.post(f"/api/students/{st['id']}/problem", json={"target_error": "SUMA_DIRECTA"}).json()
    a, b = ex["a"], ex["b"]
    monkeypatch.setattr(vision, "run_ai", fake_ai(f"{a['n']+b['n']}/{a['d']+b['d']}", "SUMA_DIRECTA"))
    d = c.post(f"/api/students/{st['id']}/problem/{ex['id']}/sheet", files={"image": ("s.jpg", jpeg((10, 10, 10)), "image/jpeg")}).json()
    d = c.get(f"/api/diagnoses/{d['id']}").json()
    assert d["error_code"] == "SUMA_DIRECTA"
    assert c.get(f"/api/students/{st['id']}").json()["status"] == "rojo"
    c.post(f"/api/students/{st['id']}/progress", json={"event": "lesson_done", "lesson_id": f"diag:{d['id']}"})
    assert c.get(f"/api/students/{st['id']}").json()["status"] == "amarillo"
    ex2 = c.post(f"/api/students/{st['id']}/problem", json={}).json()
    from fractions import Fraction
    s = Fraction(ex2["a"]["n"], ex2["a"]["d"]) + Fraction(ex2["b"]["n"], ex2["b"]["d"])
    monkeypatch.setattr(vision, "run_ai", fake_ai(f"{s.numerator}/{s.denominator}", None))
    d2 = c.post(f"/api/students/{st['id']}/problem/{ex2['id']}/sheet", files={"image": ("s2.jpg", jpeg((20, 20, 20)), "image/jpeg")}).json()
    assert c.get(f"/api/diagnoses/{d2['id']}").json()["correct"]
    assert c.get(f"/api/students/{st['id']}").json()["status"] == "verde"


def test_quiz_and_level_lessons():
    st = c.post("/api/students", json={"name": "Ana"}).json()
    items = c.get(f"/api/students/{st['id']}/explain/quiz").json()["items"]
    assert len(items) == 3
    r = c.post(f"/api/students/{st['id']}/explain/quiz", json={"answers": {"q1": "3/4", "q2": "No, la de abajo tiene más"}}).json()
    assert r["level"] == "EQUIVALENCIA"
    for lid in ["level:CONCEPTO_FRACCION", "level:EQUIVALENCIA", "level:DENOMINADOR_COMUN", "level:SUMA", "error:SUMA_DIRECTA",
                "error:NUMERADOR_SIN_AJUSTAR", "error:SUMA_DENOMINADORES", "error:MULTIPLICA", "error:OTRO"]:
        assert c.get(f"/api/lessons/{lid}").json()["steps"], lid


def test_ask_and_explain_back_fallback(monkeypatch):
    monkeypatch.setattr(config, "XAI_API_KEY", "")
    steps = c.post("/api/lessons/ask", json={"lesson_id": "error:SUMA_DIRECTA", "step_index": 2, "question": "¿por qué?"}).json()["steps"]
    assert steps
    r = c.post("/api/lessons/explain-back", json={"lesson_id": "error:SUMA_DIRECTA", "transcript": "porque los pedazos no son del mismo tamaño"}).json()
    assert r["understood"]


def test_class_code_is_forgiving():
    code = c.post("/api/classes", json={"name": "5to B"}).json()["code"]
    assert code.startswith("MAT-")
    for typed in (code, code.lower(), code.replace("-", ""), code.replace("-", " "), code[-3:]):
        r = c.post("/api/students", json={"name": "Kevin", "class_code": typed})
        assert r.status_code == 200 and r.json()["class_code"] == code, typed
    assert c.post("/api/students", json={"name": "K", "class_code": "999"}).status_code == 404


def test_state_survives_restart(monkeypatch, tmp_path):
    monkeypatch.setattr(store, "STATE_FILE", tmp_path / "state.pkl")
    code = c.post("/api/classes", json={"name": "1ro"}).json()["code"]
    st = c.post("/api/students", json={"name": "Kevin", "class_code": code}).json()
    store.save()
    store.reset()
    assert c.get(f"/api/students/{st['id']}").status_code == 404
    store.load()
    assert c.get(f"/api/students/{st['id']}").json()["name"] == "Kevin"
