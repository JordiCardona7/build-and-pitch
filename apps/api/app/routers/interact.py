"""Voz: Grok Voice (texto a voz). Si no hay llave → 501 y el front usa la voz del navegador."""
import hashlib
from collections import OrderedDict

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response

from .. import config
from ..schemas import MetaOut, TtsIn
from ..schemas import ERROR_LABELS, LEVEL_LABELS
from ..services import grok

router = APIRouter(tags=["voz"])
_CACHE: "OrderedDict[str, bytes]" = OrderedDict()     # las lecciones se repiten: no pagar dos veces el mismo audio
_CACHE_MAX = 400


@router.get("/meta", response_model=MetaOut)
def meta():
    return MetaOut(error_labels=ERROR_LABELS, level_labels=LEVEL_LABELS, demo_mode=config.DEMO_MODE)


VOICES = ["eve", "carina", "luna", "zagan", "helix", "orion"]
SAMPLE = ("Hola. Sumaste un medio más un tercio y te dio dos quintos. Es de los errores más comunes; "
          "veamos juntos por qué no puede ser. Si te pierdes, levanta la mano.")


@router.get("/tts/preview", response_class=HTMLResponse, include_in_schema=False)
def tts_preview():
    """Página para escuchar y comparar las voces de Grok: /api/tts/preview"""
    current = config.XAI_TTS_VOICE
    rows = "".join(
        f'<li><b>{v}</b>{" (actual)" if v == current else ""}<br><audio controls preload="none" '
        f'src="/api/tts/sample?voice={v}"></audio></li>' for v in VOICES)
    status = "✅ llave cargada" if config.has_ai() else "❌ sin XAI_API_KEY: la app está usando la voz del navegador"
    return f"""<!doctype html><meta charset="utf-8"><title>Voces</title>
<body style="font-family:system-ui;max-width:640px;margin:40px auto;line-height:1.5">
<h1>Voces de Grok</h1><p>{status}</p><p><i>{SAMPLE}</i></p><ul style="list-style:none;padding:0">{rows}</ul>
<p>Para cambiarla: variable <code>XAI_TTS_VOICE</code> en Railway (y en tu .env).</p></body>"""


@router.get("/tts/sample", include_in_schema=False)
def tts_sample(voice: str = "eve"):
    return tts(TtsIn(text=SAMPLE, voice=voice if voice in VOICES else None))


@router.get("/diag/grok", include_in_schema=False)
def diag_grok():
    """Mide en el servidor cuánto tarda Grok en texto, visión y voz. Abrir en el navegador: /api/diag/grok"""
    import io
    import time as _t

    from PIL import Image, ImageDraw, ImageFont

    out: dict = {"modelos": {"vision": config.XAI_VISION_MODEL, "texto": config.XAI_TEXT_MODEL,
                             "razonamiento_vision": config.XAI_VISION_REASONING or "(por defecto)", "voz": config.XAI_TTS_VOICE},
                 "llave": config.has_ai()}
    if not config.has_ai():
        return out
    img = Image.new("RGB", (900, 500), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 64)
    except OSError:
        font = ImageFont.load_default()
    for y, txt in ((60, "Kevin"), (180, "1/2 + 1/3"), (300, "= 2/5")):
        d.text((60, y), txt, fill="black", font=font)
    buf = io.BytesIO(); img.save(buf, "JPEG")
    for nombre, fn in (("texto", lambda: grok.text_json("Responde SOLO JSON.", 'Devuelve {"ok": true}')),
                       ("vision", lambda: grok.vision_json('Transcribe la imagen. Responde SOLO JSON: {"renglones": ["..."]}', buf.getvalue(), retries=0)),
                       ("voz", lambda: len(grok.tts("Hola, soy tu pizarra.")))):
        t0 = _t.monotonic()
        try:
            r = fn()
            out[nombre] = {"ok": True, "segundos": round(_t.monotonic() - t0, 1), "respuesta": str(r)[:120]}
        except Exception as e:  # noqa: BLE001
            out[nombre] = {"ok": False, "segundos": round(_t.monotonic() - t0, 1), "error": str(e)[:200]}
    return out


@router.post("/tts")
def tts(body: TtsIn):
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(400, "No hay texto para leer.")
    if not config.has_ai():
        raise HTTPException(501, "La voz de Grok no está configurada.")
    key = hashlib.sha1(f"{body.voice}|{text}".encode()).hexdigest()
    audio = _CACHE.get(key)
    if audio is None:
        try:
            audio = grok.tts(text[:1200], body.voice)
        except grok.GrokError as e:
            raise HTTPException(502, "La voz de Grok no respondió.") from e
        _CACHE[key] = audio
        if len(_CACHE) > _CACHE_MAX:
            _CACHE.popitem(last=False)
    return Response(content=audio, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=86400"})
