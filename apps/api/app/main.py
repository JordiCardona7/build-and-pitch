"""[NOMBRE] — API. Correr desde apps/api:  uvicorn app.main:app --reload --port 8000"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import config, store
from .routers import interact, lessons, student, teacher

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    store.load()            # recupera salones, alumnos y hojas tras un reinicio
    store.start_autosave()
    yield
    store.save()


app = FastAPI(title="Pizarra API", version="1.0", lifespan=lifespan)


@app.middleware("http")
async def mark_changes(request: Request, call_next):
    response = await call_next(request)
    if request.method != "GET":
        store.mark_dirty()
    return response
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])

for r in (interact.router, teacher.router, student.router, lessons.router):
    app.include_router(r, prefix="/api")


@app.get("/api/health", include_in_schema=False)
def health():
    return {"ok": True, "ai": config.has_ai(), "demo_mode": config.DEMO_MODE}


# Frontend compilado (lo copia el Dockerfile). Debe ir DESPUÉS de las rutas /api. Ver docs/DEPLOY.md
if config.STATIC_DIR.exists():
    if (config.STATIC_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=config.STATIC_DIR / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404, f"No existe la ruta /{path} en la API.")
        f = (config.STATIC_DIR / path).resolve()
        if path and f.is_file() and config.STATIC_DIR.resolve() in f.parents:
            return FileResponse(f)
        return FileResponse(config.STATIC_DIR / "index.html")     # React Router
