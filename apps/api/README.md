# API (P1)

```bash
cd apps/api
pip install -r requirements.txt        # o en un venv
cp ../../.env.example ../../.env        # XAI_API_KEY=...  (sin llave funciona todo menos visión, aclaraciones con IA y voz de Grok)
uvicorn app.main:app --reload --port 8000
pytest -q
python -m scripts.export_mocks          # regenera apps/web/src/shared/api/mocks.data.json desde el backend real
```

- `GET /api/health` → `{ ai: true/false }` para saber si la llave está cargada.
- Lecciones: `app/services/lessons.py` (constructores por tipo de error, con los números del alumno, tortillas y barras).
- Diagnóstico: `app/services/vision.py` (Grok visión) + `app/services/fractions.py` (reglas).
- Hojas demo sin internet: ver `app/data/demo_cache/README.md`.
