# Un solo servicio: compila el frontend y lo sirve desde FastAPI. Ver docs/DEPLOY.md (dueño: P1)
FROM node:20-alpine AS web
WORKDIR /web
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /srv
COPY apps/api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/api/ ./
COPY --from=web /web/dist ./static
ENV PORT=8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
