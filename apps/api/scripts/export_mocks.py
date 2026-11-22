"""Genera apps/web/src/shared/api/mocks.data.json usando el backend REAL (sin Grok: respuestas simuladas).
Así los mocks del frontend siempre coinciden con el contrato.   Correr desde apps/api:  python -m scripts.export_mocks"""
import io
import json
import random
from pathlib import Path
from urllib.parse import quote

from fastapi.testclient import TestClient
from PIL import Image

from app import config, store
from app.main import app
from app.services import vision

OUT = Path(__file__).resolve().parents[2] / "web" / "src" / "shared" / "api" / "mocks.data.json"
random.seed(7)
config.XAI_API_KEY = ""          # los respaldos sin IA (ask, explain-back) también se exportan


def sheet_svg(name: str, lines: list[str]) -> str:
    """Hoja de cuaderno vertical (3:4) con letra 'a mano', para que las pantallas se vean reales con mocks."""
    rows = "".join(f'<text x="110" y="{230 + i * 72}" font-size="44">{t}</text>' for i, t in enumerate(lines))
    rules = "".join(f'<line x1="0" x2="600" y1="{110 + i * 36}" y2="{110 + i * 36}" stroke="#c9dcf0" stroke-width="1.5"/>' for i, _ in enumerate(range(20)))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">'
           f'<rect width="600" height="800" fill="#fffdf6"/>{rules}<line x1="80" x2="80" y1="0" y2="800" stroke="#f3a3a3" stroke-width="2"/>'
           f'<g font-family="Segoe Print, Bradley Hand, Comic Sans MS, cursive" fill="#22304f">'
           f'<text x="110" y="120" font-size="36">{name}</text>{rows}</g></svg>')
    return "data:image/svg+xml;utf8," + quote(svg)


def jpeg(seed: int) -> bytes:
    b = io.BytesIO()
    Image.new("RGB", (64, 64), ((seed * 90) % 255, (seed * 40) % 255, 120)).save(b, "JPEG")
    return b.getvalue()


SHEETS = [
    ("Kevin", "2/5", "SUMA_DIRECTA", ["1/2 + 1/3", "= 2/5"]),
    ("Sofía", "2/6", "NUMERADOR_SIN_AJUSTAR", ["1/2 + 1/3", "= 1/6 + 1/6", "= 2/6"]),
    ("Ana Lucía", "5/6", None, ["1/2 + 1/3", "= 3/6 + 2/6", "= 5/6"]),
]


def main() -> None:
    store.reset()
    vision.CACHE_DIR = Path("/tmp")
    c = TestClient(app)
    out: dict = {"meta": c.get("/api/meta").json()}
    cls = c.post("/api/classes", json={"name": "1ro Básico B"}).json()
    out["class"] = cls
    asg = c.post(f"/api/classes/{cls['code']}/assignments", data={"key_text": "1/2 + 1/3 = 3/6 + 2/6 = 5/6"}).json()
    out["assignment"] = asg

    diags = []
    for i, (name, ans, code, lines) in enumerate(SHEETS):
        vision.run_ai = (lambda ans=ans, code=code, lines=lines, name=name: (lambda _i, _e: {
            "student_name": name, "lines": [{"text": t, "ok": True} for t in lines], "final_answer": ans,
            "error_line": len(lines) - 1 if code else None, "error_code": code,
            "feedback": "", "confidence": 0.93, "error_box": {"x": 0.14, "y": (180 + 72 * (len(lines) - 1)) / 800, "w": 0.5, "h": 0.085}}))()
        d = c.post(f"/api/assignments/{asg['id']}/sheets", files={"image": (f"{i}.jpg", jpeg(i), "image/jpeg")}).json()
        d = c.get(f"/api/diagnoses/{d['id']}").json()
        d["image_url"] = sheet_svg(name, lines)
        diags.append(d)
    out["diagnoses"] = diags
    out["pending_diagnosis"] = {**diags[0], "status": "pending", "transcript": [], "final_answer": None, "error_code": None,
                                "error_line": None, "error_box": None, "feedback": "Revisando la hoja…", "confidence": 0,
                                "student_name": ""}
    board = c.post("/api/demo/seed", json={"class_code": cls["code"]}).json()
    by_name = {d["student_name"]: d for d in diags}
    for g in board["groups"]:
        for s in g["students"]:
            if s["name"] in by_name:
                s["last_diagnosis_id"] = by_name[s["name"]]["id"]
    out["board"] = board

    out["lesson_for_diagnosis"] = c.get(f"/api/lessons/for-diagnosis/{diags[0]['id']}").json()
    out["lessons"] = {lid: c.get(f"/api/lessons/{lid}").json() for lid in [
        "error:SUMA_DIRECTA", "error:NUMERADOR_SIN_AJUSTAR", "error:SUMA_DENOMINADORES", "error:MULTIPLICA",
        "level:CONCEPTO_FRACCION", "level:EQUIVALENCIA", "level:DENOMINADOR_COMUN", "level:SUMA"]}
    out["ask"] = c.post("/api/lessons/ask", json={"lesson_id": "error:SUMA_DIRECTA", "step_index": 3, "question": "¿por qué no se suman?"}).json()
    out["explain_back"] = c.post("/api/lessons/explain-back", json={"lesson_id": "error:SUMA_DIRECTA",
                                                                    "transcript": "porque los pedazos no son del mismo tamaño"}).json()
    st = c.post("/api/students", json={"name": "Kevin", "class_code": cls["code"]}).json()
    out["student"] = st
    out["problem"] = {"id": "ex_mock01", "a": {"n": 2, "d": 5}, "b": {"n": 1, "d": 4}, "text": "2/5 + 1/4"}
    out["student_detail"] = {**c.get(f"/api/students/{st['id']}").json(), "history": [diags[0]]}
    out["quiz"] = c.get(f"/api/students/{st['id']}/explain/quiz").json()
    out["quiz_result"] = {"level": "EQUIVALENCIA", "lesson_id": "level:EQUIVALENCIA"}

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), "utf-8")
    print(f"✅ mocks → {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
