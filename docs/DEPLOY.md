# Despliegue

**Dueño: P1.** Objetivo: una sola URL con HTTPS para todo (la cámara y el micrófono del navegador **solo funcionan con HTTPS**, así que el despliegue también es lo que permite probar en teléfonos).

## Decisión: un solo servicio
FastAPI sirve la API en `/api/*` **y** el frontend ya compilado (React) en todo lo demás.
- Una URL, sin CORS, sin configurar dos proveedores.
- El `Dockerfile` de la raíz compila el frontend y lo copia a `apps/api/static/`.

**Plataforma recomendada: Railway** (despliega desde GitHub con el `Dockerfile`, HTTPS automático, no se "duerme").
Alternativa: **Render** (Web Service con Docker). Ojo: el plan gratis se duerme tras 15 min sin uso y tarda ~1 min en despertar; si usan Render, ábranlo 5 minutos antes del pitch.

## Pasos (P1, en la primera hora: desplegar el esqueleto temprano)
1. En Railway: *New Project → Deploy from GitHub repo →* `build-and-pitch`. Detecta el `Dockerfile` solo.
2. Variables: `XAI_API_KEY`, `XAI_VISION_MODEL`, `XAI_TEXT_MODEL`, `XAI_TTS_VOICE`, `DEMO_MODE=true`.
3. *Settings → Networking → Generate Domain* → compartir la URL en el grupo.
4. Cada merge a `main` despliega solo. Si un despliegue falla, **main sigue siendo la versión anterior en producción**: arreglar en una rama `fix/...`.

## Lo que P1 debe tener en `app/main.py`
```python
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

STATIC = Path(__file__).parent.parent / "static"
if STATIC.exists():
    app.mount("/assets", StaticFiles(directory=STATIC / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = STATIC / path
        return FileResponse(f if f.is_file() else STATIC / "index.html")  # React Router
```
(Registrar este catch-all **después** de todos los routers de `/api`.)

## Datos
- SQLite y las fotos viven en el disco del contenedor: **se borran en cada despliegue**. Para la demo está bien: al arrancar, si la base está vacía, se cargan el salón demo y las hojas demo.
- Las lecciones pregeneradas y las hojas demo van en el repo (`apps/api/app/data/`), no en la base.

## Día de la demo
- Desplegar la versión final **al congelar funciones (7:00)** y no volver a hacer merge a `main` salvo arreglos críticos.
- Probar la URL en la red del evento desde un teléfono (cámara, micrófono y foto).
- Plan B: correr local (`npm run build` + `uvicorn`) en la laptop del pitch, y el video de respaldo.
