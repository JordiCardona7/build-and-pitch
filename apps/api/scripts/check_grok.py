"""Verifica que la llave de Grok funcione para todo lo que usa la app.
Correr desde apps/api:   python -m scripts.check_grok
"""
import io
import sys
import time

from PIL import Image, ImageDraw, ImageFont

from app import config
from app.services import grok


def ok(msg):
    print(f"  ✅ {msg}")


def fail(msg, e):
    print(f"  ❌ {msg}: {e}")


def sheet_image() -> bytes:
    """Una 'hoja' sencilla con 1/2 + 1/3 = 2/5 para probar la visión."""
    img = Image.new("RGB", (900, 500), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 64)
    except OSError:
        try:
            font = ImageFont.truetype("DejaVuSans.ttf", 64)
        except OSError:
            font = ImageFont.load_default()
    d.text((60, 60), "Kevin", fill="black", font=font)
    d.text((60, 180), "1/2 + 1/3", fill="black", font=font)
    d.text((60, 300), "= 2/5", fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    return buf.getvalue()


def main() -> int:
    print("\n1) Llave")
    if not config.has_ai():
        print("  ❌ No encontré XAI_API_KEY. Debe estar en el archivo .env de la raíz del repo (no en .env.example).")
        return 1
    k = config.XAI_API_KEY
    ok(f"cargada ({k[:4]}…{k[-4:]}) · visión: {config.XAI_VISION_MODEL} · texto: {config.XAI_TEXT_MODEL} · voz: {config.XAI_TTS_VOICE}")
    errors = 0

    print("\n2) Texto (lecciones y aclaraciones)")
    try:
        t = time.time()
        r = grok.text_json("Responde SOLO JSON.", 'Devuelve exactamente {"ok": true, "saludo": "hola"}')
        ok(f"respondió {r} en {time.time() - t:.1f} s")
    except Exception as e:  # noqa: BLE001
        errors += 1
        fail("falló", e)

    print("\n3) Visión (leer hojas)")
    try:
        t = time.time()
        r = grok.vision_json('Transcribe lo que dice la imagen. Responde SOLO JSON: {"nombre": "...", "renglones": ["..."]}', sheet_image(), retries=0)
        ok(f"leyó {r} en {time.time() - t:.1f} s")
    except Exception as e:  # noqa: BLE001
        errors += 1
        fail("falló", e)

    print("\n4) Voz (Grok Voice)")
    try:
        t = time.time()
        audio = grok.tts("Hola. Soy tu pizarra. Si te pierdes, levanta la mano.")
        with open("prueba_voz.mp3", "wb") as f:
            f.write(audio)
        ok(f"{len(audio) // 1024} KB en {time.time() - t:.1f} s → abre apps/api/prueba_voz.mp3 para escucharla")
    except Exception as e:  # noqa: BLE001
        errors += 1
        fail("falló", e)

    print("\n" + ("🎉 Todo listo." if not errors else
                  f"⚠️  {errors} prueba(s) fallaron. Si dice 401: la llave está mal copiada. 403 o 'credits': la cuenta no tiene "
                  "créditos de API (los de Premium no cuentan). 404 o 'model': cambia el modelo en .env (revisa 'Models' en la consola)."))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
