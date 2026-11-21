# AGENTS.md — Instrucciones para la IA que programa en este repo

Eres una IA de programación trabajando con **una de cuatro personas** que construyen en paralelo, en un hackathon de un día, una app web llamada **[NOMBRE]** (nombre pendiente). Otras tres IAs están modificando el mismo repositorio al mismo tiempo. Tu prioridad es avanzar rápido **sin romper el trabajo de los demás**.

## 0. Antes de escribir una sola línea
1. Pregúntale a tu humano **qué rol tiene: P1, P2, P3 o P4** (si no te lo dijo ya).
2. Lee, en este orden:
   - `PRD.md` — qué construimos y por qué (sobre todo §1, §5, §6).
   - `docs/CONTRACTS.md` — tipos, endpoints y formato de lección. **Es ley.**
   - `docs/WORKFLOW.md` — qué carpetas son de quién y cómo se hacen ramas y PR.
   - `docs/DESIGN.md` — si tocas cualquier cosa visible.
   - `docs/roles/P<n>.md` — **tu lista de tareas**, en orden, con criterios de aceptación.
3. Resume en 5 líneas a tu humano qué vas a hacer primero y qué archivos vas a tocar. Luego empieza.

## 1. El producto en 30 segundos
Una IA que **enseña en una pizarra, no en un chat**. Tema único: **suma de fracciones con distinto denominador**, 1ro básico, Guatemala.
- **Puerta Aula:** el docente sube la clave y fotos de hojas resueltas a mano → la IA encuentra el paso exacto del error de cada alumno → **semáforo** del salón agrupado por tipo de error → cada alumno recibe una clase sobre su error.
- **Puerta Solo:** el alumno pide "ponme un problema" (lo resuelve en papel, sube la foto, se diagnostica, se explica, otro problema) o "no sé nada, explícame".
- **Pizarra Viva:** un marcador escribe y dibuja (tortillas, barras, fracciones, círculos rojos) mientras una voz explica. El alumno interrumpe **levantando la mano** o diciendo **"no entendí"**: se pausa a medio trazo, aclara en una hoja aparte y retoma.

## 2. Reglas de oro (no negociables)
1. **Solo modifica archivos de tu rol** (tabla en `docs/WORKFLOW.md` §1). Si necesitas un cambio en archivo ajeno, **detente y dile a tu humano** qué pedirle al dueño. Mientras, resuélvelo localmente dentro de tu carpeta.
2. **Nunca cambies `docs/CONTRACTS.md`, `shared/api/types.ts` ni `apps/api/app/schemas.py`** salvo que seas P1 y tu humano lo pida explícitamente. Consume los contratos tal cual.
3. **No agregues dependencias** sin decírselo a tu humano primero (ver `WORKFLOW.md` §5). Usa lo que ya está instalado.
4. **No hagas refactors masivos, ni reformatees, ni renombres** archivos que no son tuyos. Diffs pequeños y enfocados.
5. **Nada de inglés visible** para el usuario. Todo texto en español de Guatemala, de tú, cálido (ver `DESIGN.md` §8).
6. **Nunca escribas el nombre del producto a mano**: usa `BRAND.name` de `shared/brand.ts`.
7. **Nunca subas secretos.** La llave va en `.env` (ignorado por git).
8. Antes de proponer un commit: `git status` y `git diff --stat`. Si aparecen archivos fuera de tu rol, **restáuralos**.
9. Si el contrato no alcanza para lo que te piden, **no lo inventes**: explícale a tu humano el hueco para que lo hable con P1.

## 3. Stack y comandos

```
apps/web   React 18 + Vite + TypeScript (strict) + Tailwind + Framer Motion + React Router
           @mediapipe/tasks-vision (mano), Web Speech API (voz/oído de respaldo)
apps/api   Python 3.11 + FastAPI + Pydantic v2 + SQLModel (SQLite) + openai SDK (para la API de xAI)
```

```bash
# Web
cd apps/web && npm install
npm run dev                 # http://localhost:5173  (proxy /api → http://localhost:8000)
VITE_USE_MOCKS=true npm run dev   # sin backend
npm run check               # tsc + eslint + build: debe pasar antes de cada PR

# API
cd apps/api && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
cp ../../.env.example ../../.env    # poner XAI_API_KEY
uvicorn app.main:app --reload --port 8000
pytest -q
```

## 4. Mapa del repo
```
PRD.md, AGENTS.md, CLAUDE.md
docs/  CONTRACTS.md  DESIGN.md  WORKFLOW.md  DEPLOY.md  roles/P1..P4.md
Dockerfile        Un solo servicio: compila el front y lo sirve desde FastAPI (P1)
prototype/        Prototipo HTML+FastAPI previo. SOLO REFERENCIA (motor de trazo, lecciones de ejemplo). No se modifica ni se importa.
apps/api/app/     main.py  schemas.py  routers/  services/  data/
apps/web/src/
  app/            rutas y layout                     (P3)
  pages/          Landing (P3), sandbox/ (P2, P4)
  features/board/      motor + reproductor de pizarra (P2)
  features/interact/   voz, oído, mano, interrupción  (P4)
  features/teacher/    Puerta Aula                    (P3)
  features/student/    Puerta Solo + página de clase  (P4)
  shared/ui/      componentes del sistema de diseño   (P3)
  shared/api/     cliente, tipos, mocks               (P1)
  shared/brand.ts nombre y textos de marca            (P3)
  styles/         globals.css                         (P3)
```

### Rutas (las crea P3 desde el inicio con páginas vacías; cada dueño las llena)
| Ruta | Página | Dueño |
|---|---|---|
| `/` | Landing: elige "Soy docente" / "Soy alumno" | P3 |
| `/docente` | Mis tareas + "Nueva tarea" | P3 |
| `/docente/tarea/:assignmentId` | Subir hojas + Semáforo | P3 |
| `/docente/tarea/:assignmentId/hoja/:diagnosisId` | Detalle de la hoja del alumno | P3 |
| `/alumno` | Inicio alumno: "No sé nada, explícame" / "Ponme un problema" | P4 |
| `/alumno/problema` | Problema → foto → resultado | P4 |
| `/alumno/explicame` | Mini diagnóstico → clase | P4 |
| `/clase` | Página de clase con Pizarra Viva (`?diagnosis=<id>` o `?lesson=<id>`) | P4 (usa `LessonPlayer` de P2) |
| `/sandbox/pizarra` | Prueba de todas las ops de dibujo | P2 |
| `/sandbox/interaccion` | Prueba de voz, mano y frases | P4 |

## 5. Convenciones de código
- TypeScript estricto; nada de `any` salvo en el límite con librerías. Componentes funcionales con hooks.
- Estilos **solo con Tailwind y los tokens** de `tailwind.config.ts` (`bg-paper`, `text-ink`, `bg-marker-blue`…). Nada de colores hex sueltos en componentes.
- Componentes de UI reutilizables vienen de `shared/ui`. Si falta uno, pídelo a P3; temporalmente, créalo dentro de tu feature con prefijo `Local`.
- Toda llamada al backend pasa por `shared/api` (`api.xxx()`), nunca `fetch` directo en features.
- Toda pantalla tiene **estado de carga** (`ScribbleLoader`), **vacío** y **error** con texto amable.
- Animaciones con Framer Motion; respetar `prefers-reduced-motion`.
- Python: tipado, funciones pequeñas, Pydantic para entrada/salida, errores HTTP con `detail` en español.
- Nombres de código en inglés; textos visibles en español.

## 6. Definición de "terminado" para cualquier tarea
- Cumple los criterios de aceptación de `docs/roles/P<n>.md`.
- Se ve como dice `DESIGN.md` (no como un prototipo).
- Funciona con mocks **y** con la API real (si aplica).
- `npm run check` / `pytest -q` pasan.
- Solo cambia archivos de tu rol. Commit con formato `tipo(área): qué`.

## 7. Cómo trabajar con tu humano
- Tareas en pasos cortos: al terminar cada uno, dile qué probar y cómo (URL exacta, qué clic dar).
- Sugiere hacer commit y PR cada vez que algo quede estable (~cada 45–60 min).
- Si una decisión de producto no está en el PRD, propón la opción más simple y pregúntale.
- Si detectas que otra parte del equipo va a necesitar algo de ti (ej. P4 necesita `pause()` en la pizarra), díselo a tu humano para que avise.
