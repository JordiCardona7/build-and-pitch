"""Voz: Grok Voice (texto a voz). Si no hay llave → 501 y el front usa la voz del navegador."""
import hashlib
from collections import OrderedDict

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

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
