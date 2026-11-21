"""Diagnóstico de una hoja escrita a mano: Grok visión transcribe y propone el error; las reglas verifican."""
import hashlib
import io
import json
import logging
from typing import Any, Optional

from PIL import Image, ImageOps

from .. import config
from ..schemas import ERROR_LABELS, Box, Exercise, Frac, TranscriptLine
from . import fractions as F
from .grok import GrokError, vision_json

log = logging.getLogger("vision")
CACHE_DIR = config.STORAGE_DIR / "diag_cache"          # resultados de hojas ya leídas (no versionado)
DEMO_CACHE_DIR = config.DATA_DIR / "demo_cache"          # hojas demo: copiar aquí su .json para la demo sin internet
CACHE_DIR.mkdir(parents=True, exist_ok=True)

FEEDBACK = {   # respaldo si la IA no da una frase buena
    "SUMA_DIRECTA": "Sumaste también los de abajo: los pedazos tienen que ser del mismo tamaño primero.",
    "NUMERADOR_SIN_AJUSTAR": "Cambiaste el denominador, pero el de arriba también tiene que cambiar.",
    "SUMA_DENOMINADORES": "Ya tenías pedazos iguales; el de abajo no se suma, solo dice el tamaño.",
    "AMPLIFICACION_INCORRECTA": "Multiplicaste por un número que no era el que tocaba.",
    "DENOMINADOR_NO_COMUN": "Ese denominador no funciona para las dos fracciones.",
    "MULTIPLICA": "Aquí había que sumar, y multiplicaste.",
    "ERROR_ARITMETICO": "Vas muy bien; solo se te fue una cuenta.",
    "OTRO": "Aquí algo no cuadra. Veámoslo juntos.",
}


def prepare_image(raw: bytes) -> bytes:
    """Rota según EXIF, pasa a JPG y limita a 1600 px de lado largo."""
    img = Image.open(io.BytesIO(raw))
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((1600, 1600))
    out = io.BytesIO()
    img.save(out, "JPEG", quality=85)
    return out.getvalue()


def image_hash(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()[:24]


def cached(h: str) -> Optional[dict[str, Any]]:
    for folder in (DEMO_CACHE_DIR, CACHE_DIR):
        p = folder / f"{h}.json"
        if p.exists():
            return json.loads(p.read_text("utf-8"))
    return None


def save_cache(h: str, result: dict[str, Any]) -> None:
    (CACHE_DIR / f"{h}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), "utf-8")


TAXONOMY = "\n".join(
    f"- {code}: {label}" for code, label in ERROR_LABELS.items()
) + """
Ejemplos con 1/2 + 1/3 (correcto: 3/6 + 2/6 = 5/6):
- SUMA_DIRECTA → 2/5 · NUMERADOR_SIN_AJUSTAR → 2/6 · SUMA_DENOMINADORES → 3/6 + 2/6 = 5/12
- AMPLIFICACION_INCORRECTA → 1/2 = 2/6 · DENOMINADOR_NO_COMUN → usa 5 o 8 · MULTIPLICA → 1/6
- ERROR_ARITMETICO → 3/6 + 2/6 = 6/6"""

SYSTEM = "Eres una maestra guatemalteca de matemática de 1ro básico, experta en leer letra a mano de adolescentes. Respondes SOLO JSON válido."


def build_prompt(ex: Exercise) -> str:
    right = F.correct_sum((ex.a.n, ex.a.d), (ex.b.n, ex.b.d))
    return f"""Esta es la foto de la hoja de un alumno que resolvió: {ex.text}
La respuesta correcta es {right.numerator}/{right.denominator} (equivalentes también son correctas).

Haz esto:
1. Transcribe, renglón por renglón y en orden, lo que escribió el alumno para ESTE ejercicio (fracciones como a/b). Ignora tachones y garabatos.
2. Si aparece el nombre del alumno en la hoja, léelo.
3. Indica su respuesta final.
4. Marca cada renglón como correcto o no, y di el índice del PRIMER renglón equivocado.
5. Elige UN código de error (si está mal) de esta lista:
{TAXONOMY}
6. Escribe "feedback": UNA frase corta, cálida, de tú, para el alumno, que diga dónde se confundió sin darle la respuesta.
7. "confidence" de 0 a 1: qué tan seguro estás de haber leído bien la hoja.
8. "error_box": caja aproximada del renglón equivocado, en proporciones de la imagen (0 a 1), o null.

Responde SOLO con este JSON:
{{"student_name": "texto o null", "lines": [{{"text": "1/2 + 1/3", "ok": true}}], "final_answer": "a/b o null",
 "error_line": 0, "error_code": "CODIGO o null", "feedback": "...", "confidence": 0.9,
 "error_box": {{"x": 0.1, "y": 0.4, "w": 0.6, "h": 0.1}}}}"""


def run_ai(image_jpeg: bytes, ex: Exercise) -> dict[str, Any]:
    return vision_json(build_prompt(ex), image_jpeg, system=SYSTEM)


def merge(ex: Exercise, ai: dict[str, Any]) -> dict[str, Any]:
    """Combina la lectura de la IA con las reglas. Devuelve los campos de Diagnosis (sin id/imagen)."""
    a, b = (ex.a.n, ex.a.d), (ex.b.n, ex.b.d)
    lines = [l for l in (ai.get("lines") or []) if isinstance(l, dict) and str(l.get("text", "")).strip()]
    transcript = [TranscriptLine(index=i, text=str(l["text"]).strip(), ok=bool(l.get("ok", True))) for i, l in enumerate(lines)]

    ans = F.parse_frac(str(ai.get("final_answer") or "")) if ai.get("final_answer") else None
    if ans is None and transcript:                       # respaldo: última fracción escrita
        fr = F.find_fracs(transcript[-1].text)
        ans = fr[-1] if fr else None

    correct = F.is_correct(a, b, ans)
    rule = F.classify(a, b, ans)
    ai_code = ai.get("error_code") if ai.get("error_code") in ERROR_LABELS else None
    confidence = float(ai.get("confidence") or 0.5)
    note = None

    if correct:
        code, status = None, "done"
        if ans and not F.is_simplified(*ans):
            note = "Puedes simplificar tu respuesta."
        feedback = "¡Bien resuelto!" + (" Puedes simplificarla." if note else "")
    else:
        rule_code = rule if rule not in (None, "CORRECTO") else None
        code = rule_code or ai_code or "OTRO"
        disagree = bool(rule_code and ai_code and rule_code != ai_code)
        status = "needs_review" if (confidence < config.REVIEW_CONFIDENCE or ans is None or disagree or code == "OTRO") else "done"
        feedback = str(ai.get("feedback") or "").strip() or FEEDBACK[code]
        if disagree:
            note = f"La IA leyó «{ERROR_LABELS[ai_code]}»; las reglas dicen «{ERROR_LABELS[rule_code]}»."

    err_line = ai.get("error_line")
    err_line = int(err_line) if isinstance(err_line, (int, float)) and 0 <= int(err_line) < len(transcript) and not correct else None
    if err_line is None and not correct:
        bad = [t.index for t in transcript if not t.ok]
        err_line = bad[0] if bad else (len(transcript) - 1 if transcript else None)
    if err_line is not None:
        for t in transcript:
            t.ok = t.index < err_line

    box = None
    eb = ai.get("error_box")
    if not correct and isinstance(eb, dict):
        try:
            box = Box(**{k: max(0.0, min(1.0, float(eb[k]))) for k in ("x", "y", "w", "h")})
        except (KeyError, TypeError, ValueError):
            box = None

    return {
        "status": status,
        "ai_student_name": (ai.get("student_name") or "").strip() or None,
        "transcript": transcript,
        "final_answer": Frac(n=ans[0], d=ans[1]) if ans else None,
        "correct": correct,
        "error_code": code,
        "error_line": err_line,
        "error_box": box,
        "feedback": feedback,
        "confidence": round(confidence, 2),
        "note": note,
    }


def diagnose(raw: bytes, ex: Exercise) -> dict[str, Any]:
    """Hoja → campos del diagnóstico. Usa la caché si es una hoja ya vista (hojas demo, modo sin internet)."""
    h = image_hash(raw)
    hit = cached(h)
    if hit and hit.get("exercise_text") == ex.text:
        return merge(ex, hit["ai"])
    ai = run_ai(prepare_image(raw), ex)                 # puede lanzar GrokError
    save_cache(h, {"exercise_text": ex.text, "ai": ai})
    return merge(ex, ai)


def read_key(raw: bytes) -> dict[str, Any]:
    """Foto de la clave del docente → ejercicio y transcripción."""
    prompt = """Esta es la foto de un ejercicio de suma de fracciones resuelto por un docente.
Transcribe renglón por renglón y di cuál es el ejercicio (las dos fracciones que se suman).
Responde SOLO JSON: {"exercise": "a/b + c/d", "lines": ["1/2 + 1/3", "= 3/6 + 2/6", "= 5/6"]}"""
    return vision_json(prompt, prepare_image(raw), system=SYSTEM)


__all__ = ["diagnose", "read_key", "prepare_image", "image_hash", "merge", "GrokError"]
