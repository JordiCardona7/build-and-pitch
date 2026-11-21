"""Cliente de la API de xAI (Grok). Compatible con el SDK de OpenAI: base_url=https://api.x.ai/v1"""
import base64
import json
import logging
import re
import time
from typing import Any, Optional

import httpx

from .. import config

log = logging.getLogger("grok")


class GrokError(RuntimeError):
    pass


def _client(timeout: float):
    if not config.has_ai():
        raise GrokError("Falta XAI_API_KEY")
    from openai import OpenAI
    return OpenAI(api_key=config.XAI_API_KEY, base_url=config.XAI_BASE_URL, timeout=httpx.Timeout(timeout), max_retries=0)


def extract_json(text: str) -> dict[str, Any]:
    """Saca el primer objeto JSON de la respuesta (tolera ```json ... ``` y texto alrededor)."""
    text = (text or "").strip()
    blobs = [text]
    fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    if fence:
        blobs.insert(0, fence.group(1))
    decoder = json.JSONDecoder()
    for blob in blobs:
        start = 0
        while True:
            i = blob.find("{", start)
            if i < 0:
                break
            try:
                value, _ = decoder.raw_decode(blob[i:])
            except json.JSONDecodeError:
                start = i + 1
                continue
            if isinstance(value, dict):
                return value
            start = i + 1
    raise GrokError(f"Grok no devolvió JSON. Respondió: {text[:160]!r}")


def _reasoning(effort: str) -> dict[str, Any]:
    return {"reasoning": {"effort": effort}} if effort else {}


def vision_json(prompt: str, image_jpeg: bytes, system: Optional[str] = None, retries: int = 1) -> dict[str, Any]:
    """Imagen + instrucciones → JSON. Usa la Responses API con input_image (docs.x.ai, Image Understanding).
    Si Grok se pasa del tiempo NO se reintenta (duplicaría la espera); solo se reintenta si la respuesta llega mal formada."""
    client = _client(config.VISION_TIMEOUT_S)
    b64 = base64.b64encode(image_jpeg).decode()
    content = [
        {"type": "input_image", "image_url": f"data:image/jpeg;base64,{b64}", "detail": "high"},
        {"type": "input_text", "text": prompt},
    ]
    messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": content}]
    extra = _reasoning(config.XAI_VISION_REASONING)
    last: Exception | None = None
    for attempt in range(retries + 1):
        t0 = time.monotonic()
        try:
            try:
                r = client.responses.create(model=config.XAI_VISION_MODEL, input=messages, store=False, **extra)
            except Exception as e:  # noqa: BLE001 — si el modelo no acepta "reasoning", seguir sin él
                if extra and "reason" in str(e).lower():
                    log.warning("el modelo no acepta reasoning (%s); sigo sin él", e)
                    extra = {}
                    r = client.responses.create(model=config.XAI_VISION_MODEL, input=messages, store=False)
                else:
                    raise
            log.info("visión %s: %.1f s", config.XAI_VISION_MODEL, time.monotonic() - t0)
            return extract_json(r.output_text)
        except GrokError as e:            # JSON mal formado → vale la pena reintentar
            last = e
            log.warning("visión devolvió algo raro (intento %d): %s", attempt + 1, e)
        except Exception as e:  # noqa: BLE001 — tiempo agotado, red, 4xx/5xx: no reintentar
            log.warning("visión falló tras %.1f s: %s", time.monotonic() - t0, e)
            raise GrokError(str(e)) from e
    raise GrokError(str(last))


def text_json(system: str, user: str, timeout: Optional[float] = None) -> dict[str, Any]:
    """Texto → JSON con la Responses API (la que documenta xAI hoy)."""
    client = _client(timeout or config.TEXT_TIMEOUT_S)
    r = client.responses.create(
        model=config.XAI_TEXT_MODEL,
        input=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        store=False,
    )
    return extract_json(r.output_text or "")


def tts(text: str, voice: Optional[str] = None) -> bytes:
    """Grok Voice — texto a voz. POST /v1/tts {text, voice_id, language} → audio (MP3)."""
    if not config.has_ai():
        raise GrokError("Falta XAI_API_KEY")
    r = httpx.post(
        f"{config.XAI_BASE_URL}/tts",
        headers={"Authorization": f"Bearer {config.XAI_API_KEY}"},
        json={"text": text, "voice_id": voice or config.XAI_TTS_VOICE, "language": config.XAI_TTS_LANGUAGE},
        timeout=config.TTS_TIMEOUT_S,
    )
    if r.status_code != 200:
        raise GrokError(f"TTS {r.status_code}: {r.text[:200]}")
    return r.content
