"""Configuración leída de variables de entorno (.env en la raíz del repo)."""
import os
from pathlib import Path

from dotenv import load_dotenv

API_DIR = Path(__file__).resolve().parent.parent          # apps/api
REPO_ROOT = API_DIR.parent.parent
load_dotenv(REPO_ROOT / ".env")
load_dotenv(API_DIR / ".env")

XAI_API_KEY = os.getenv("XAI_API_KEY", "").strip()
XAI_BASE_URL = os.getenv("XAI_BASE_URL", "https://api.x.ai/v1")
def _model(var: str, default: str = "grok-4.7") -> str:
    v = (os.getenv(var) or "").split("#")[0].strip()
    return v if len(v) > 3 else default          # ignora valores vacíos o basura ("x")


XAI_VISION_MODEL = _model("XAI_VISION_MODEL")
XAI_TEXT_MODEL = _model("XAI_TEXT_MODEL")
XAI_TTS_VOICE = os.getenv("XAI_TTS_VOICE") or "eve"
XAI_TTS_LANGUAGE = os.getenv("XAI_TTS_LANGUAGE") or "es"
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

VISION_TIMEOUT_S = float(os.getenv("VISION_TIMEOUT_S", "40"))
TEXT_TIMEOUT_S = float(os.getenv("TEXT_TIMEOUT_S", "12"))
TTS_TIMEOUT_S = float(os.getenv("TTS_TIMEOUT_S", "15"))

DATA_DIR = Path(__file__).resolve().parent / "data"         # versionado: lecciones, caché de hojas demo
STORAGE_DIR = API_DIR / "storage"                           # NO versionado: fotos subidas
STATIC_DIR = API_DIR / "static"                             # frontend compilado (lo pone el Dockerfile)
STORAGE_DIR.mkdir(exist_ok=True)

# Un acierto después de ver la clase basta para pasar a verde (la demo no da para dos).
VERIFY_STREAK = int(os.getenv("VERIFY_STREAK", "1"))
REVIEW_CONFIDENCE = 0.6


def has_ai() -> bool:
    return bool(XAI_API_KEY)
