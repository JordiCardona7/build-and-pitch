# Flujo de trabajo para 4 personas (y sus 4 IAs)

La regla que evita casi todos los conflictos: **cada archivo tiene un dueño, y solo su dueño (o su IA) lo modifica.** Lo demás es disciplina de ramas pequeñas.

## 1. Quién es dueño de qué

| Persona | Rol | Carpetas que le pertenecen |
|---|---|---|
| **P1** | Backend e IA (Python) | `apps/api/**`, `apps/web/src/shared/api/**` (cliente, tipos y mocks), `docs/CONTRACTS.md` |
| **P2** | Pizarra Viva (motor y reproductor) | `apps/web/src/features/board/**`, `apps/web/src/pages/sandbox/BoardSandbox.tsx`, `apps/web/public/board/**` |
| **P3** | Puerta Aula + sistema de diseño | `apps/web/src/features/teacher/**`, `apps/web/src/shared/ui/**`, `apps/web/src/shared/brand.ts`, `apps/web/src/styles/**`, `apps/web/tailwind.config.ts`, `apps/web/src/app/**` (rutas y layout), `apps/web/src/pages/Landing.tsx`, `docs/DESIGN.md` |
| **P4** | Puerta Solo + voz e interrupción | `apps/web/src/features/student/**`, `apps/web/src/features/interact/**`, `apps/web/src/pages/sandbox/InteractSandbox.tsx` |

**Archivos compartidos** (cambiar solo con aviso en el grupo y PR propio y pequeño): `apps/web/package.json`/`package-lock.json`, `apps/api/requirements.txt`, `PRD.md`, `AGENTS.md`, `docs/WORKFLOW.md`, `.env.example`.

**¿Necesitas algo en un archivo ajeno?** No lo toques: pídeselo al dueño por el grupo ("P3: necesito un `variant="danger"` en Button"). Mientras, hazlo local dentro de tu carpeta y lo reemplazas cuando llegue.

`.github/CODEOWNERS` refleja esta tabla; GitHub pedirá la revisión del dueño automáticamente.

## 2. Ramas
- `main` siempre corre (`npm run build` y la API arrancan). Nadie hace push directo a `main`.
- Ramas cortas desde `main`, con prefijo de persona: `p2/pie-op`, `p3/semaforo-grupos`, `p1/vision-diagnosis`, `p4/hand-raise`.
- **Vida máxima de una rama: ~60–90 min.** Mejor 6 PR chicos que 1 gigante.

## 3. El ciclo (repetirlo todo el día)
```bash
git switch main && git pull
git switch -c p2/pie-op
# ... trabajar con tu IA, commits pequeños ...
git fetch origin && git rebase origin/main     # traer lo nuevo antes de abrir PR
(cd apps/web && npm run check)                 # tipos + lint + build   |   API: (cd apps/api && pytest -q)
git push -u origin p2/pie-op
gh pr create --fill                            # o desde GitHub
```
- **Merge:** *Squash and merge*. Si el PR solo toca tus carpetas y `npm run check` (en `apps/web`) pasa, **puedes hacer merge tú mismo**. Si toca compartidos o contratos, necesita aprobación del dueño afectado.
- Tras cada merge, avisa en el grupo con una línea: `✅ main: P2 agregó op "pie"`.
- Todos hacen `git pull --rebase` en `main` al menos **cada hora** y en cada integración.

## 4. Commits
Formato: `tipo(área): qué` — `feat(board): op pie con coloreado en barrido`, `fix(teacher): polling del semáforo`, `chore(api): mocks de board`. Tipos: `feat`, `fix`, `style`, `refactor`, `chore`, `docs`.

## 5. Dependencias (la fuente #1 de conflictos)
- P3 crea el esqueleto con **todas** las dependencias previstas instaladas desde el inicio (lista en `docs/roles/P3.md`).
- Si alguien necesita una nueva: PR **solo** con `package.json` + lock, merge inmediato, aviso en el grupo. Si hay conflicto en `package-lock.json`: `git checkout --theirs package-lock.json && npm install` y commit.

## 6. Contratos primero, mocks siempre
- Hasta el final de F0, P1 congela `docs/CONTRACTS.md` y publica tipos + mocks en `shared/api`.
- El frontend trabaja contra mocks (`VITE_USE_MOCKS=true`) hasta Integración 1. **Nadie espera a nadie.**
- Cambios a contratos: ver la cabecera de `CONTRACTS.md`.

## 7. Agenda (relativa al inicio del trabajo)
| Hora | Qué pasa | Quién |
|---|---|---|
| 0:00 | Repo en GitHub con estos docs. Todos clonan y le dan a su IA `AGENTS.md` + su `docs/roles/Px.md` | P1 |
| 0:00–0:30 | **Esqueleto web** con rutas y páginas vacías para todos, tokens de diseño, deps → merge | P3 |
| 0:00–0:30 | **Esqueleto API** + tipos TS + mocks → merge | P1 |
| 0:00–0:45 | P2: motor de pizarra en `features/board` (puede arrancar en paralelo, solo su carpeta). P4: prueba de concepto de mano levantada y voz en su sandbox | P2, P4 |
| **0:45** | ✋ Punto de control: todos ven la app corriendo con mocks | Todos, 5 min |
| 1:00 | Esqueleto **desplegado** con URL HTTPS (Railway); cada merge a `main` se despliega solo | P1 |
| 3:30 | **Integración 1:** flujo docente con API real (foto → diagnóstico → semáforo → clase) | Todos |
| 6:30 | **Integración 2:** demo completa de punta a punta | Todos |
| 7:00 | **Congelar funciones.** Solo bugs, pulido y datos demo | Todos |
| 7:30 | Grabar el **video de respaldo** de la demo | P4 + P3 |
| 8:00 | Ensayo del pitch ×3 | Todos |

En cada integración: todos hacen merge de lo que tengan estable, `git pull`, prueban juntos 15 min y arreglan en ramas `fix/...`.

## 8. Variables y secretos
- `.env` nunca se sube. Copia `.env.example` → `.env`.
- Solo P1 maneja la llave de xAI; los demás pueden usar mocks o la llave que P1 comparta por mensaje privado.

## 9. Si algo sale mal
- **Conflicto en tu rama:** `git rebase origin/main`, resuelve solo en tus archivos; si el conflicto es en archivo ajeno, quédate con la versión de `main` (`git checkout --theirs <archivo>`).
- **`main` se rompió:** quien lo rompió lo revierte de inmediato (`git revert <sha>`), luego arregla con calma.
- **Tu IA tocó archivos ajenos:** `git restore <archivo>` antes de hacer commit. Revisa siempre `git status` y `git diff --stat` antes de cada commit.
