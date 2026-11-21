# Pizarra · integración de P2

Motor portado de `prototype/frontend/board-engine-modular.js`, sin importar ni modificar el prototipo. Todo el estado del trazo pertenece a cada instancia. Solo usa las dependencias previstas: React, Framer Motion y Tailwind.

## P3: ruta del laboratorio

La rama de P3 ya registra este export nombrado en `/sandbox/pizarra`. Si se integra sobre un esqueleto distinto:

```tsx
import { BoardSandbox } from '../pages/sandbox/BoardSandbox';
// En el árbol de React Router:
<Route path="/sandbox/pizarra" element={<BoardSandbox />} />
```

Consume los tokens de `docs/DESIGN.md`. La fuente Caveat 700 y su licencia OFL están en `public/board/`; se sirven localmente. Los colores SVG se centralizan en `engine/theme.ts`. No hay peticiones a servicios externos.

## P4: voz e interrupción

```tsx
import { LessonPlayer, type PlayerHandle } from '../board';

const player = useRef<PlayerHandle>();
// speaker cumple el contrato Speaker de CONTRACTS.md §4.
<LessonPlayer
  lesson={lesson}
  speak={speaker}
  onReady={handle => { player.current = handle; }}
  onStepChange={setStepIndex}
  onSay={setSubtitle}
  onCheckpoint={setCheckpointPrompt}
  onDone={markLessonDone}
  controls={false}
/>

// Desde un gesto del alumno, para permitir la voz del navegador:
await player.current?.play(lesson);

// El controlador de interrupción de P4:
player.current?.pause();
const { steps } = await api.ask(lesson.id, player.current?.currentStep ?? 0, question);
await player.current?.playAside(steps);
player.current?.resume();

// Tras capturar una respuesta al checkpoint:
player.current?.answerCheckpoint(answer);
```

- `autoPlay` es `false` por defecto. `true` reproduce al recibir/cambiar `lesson`.
- `controls` es `true` por defecto: inicio, pausa, reanudación y un formulario para checkpoints. Con `false`, P4 dibuja sus controles y captura las respuestas.
- `playAside` mantiene el fondo congelado y regresa en estado `paused`. P4 llama explícitamente a `resume`. Repetir `playAside` mientras ya corre devuelve la misma promesa.
- `pause` detiene el audio y el trazo de inmediato. `resume` repite la oración interrumpida y conserva el progreso del dibujo.
- Un checkpoint espera cualquier respuesta no vacía. La evaluación pedagógica corresponde a la capa de interacción/API; P2 no decide si el alumno comprendió.
- `state` y `currentStep` son valores vivos del handle. Para actualizar React, usar `onStateChange` y `onStepChange`.
- `speed` (prop) o `setSpeed` (handle) aceptan 0.25–4. Ajustan trazo y respaldo silencioso. La velocidad de un speaker externo la administra P4.
- Sin `speak`, espera 330 ms por palabra. Cada paso ejecuta voz y dibujo en paralelo. La duración del dibujo se ajusta a una estimación de la voz, no a la duración real de un archivo de audio.
- Otra llamada a `play` o desmontar el componente cancela la ejecución anterior, su audio, animaciones y preguntas pendientes.
- Las operaciones desconocidas se avisan en consola y se omiten. `clear` borra en barridos con borrador y elimina también los clips del texto y las barras.

## P1: lecciones y tipos

`types.ts` reexporta `Lesson`, `Step`, `Op` y los colores directamente de `shared/api/types.ts`, publicado por P1. Solo declara localmente las interfaces del reproductor y de voz de §4. Acepta checkpoints nulos de la API. No se modificó el contrato.

El laboratorio permite pegar una lección completa en JSON. Acepta también las dos lecciones antiguas del prototipo sin metadatos `id/error_code/level`. `parseLesson` valida los campos antes de reproducir y convierte numeradores/denominadores numéricos a texto. El botón «Cargar lecciones» consulta `api.meta()` y `api.getLesson()`; con `VITE_USE_MOCKS=true` usa los mocks de P1. También acepta `lessons?: Lesson[]` para inyectar fixtures. Deduplica por id porque algunos mocks de P1 regresan la misma lección de respaldo para distintos códigos.

`examples.ts` contiene una clase de fracciones y una aclaración local. Son fixtures de P2, no sustituyen los mocks/API de P1.

## Verificación sin dependencias adicionales

Con Vite corriendo, abrir `/src/features/board/tests/index.html`. Las pruebas usan el SVG real del navegador y un reloj de animación determinista: las 12 ops, pausa al colorear tortillas y barras, aclaración, voz interrumpida que no resuelve, checkpoints, reemplazo de lección, instancias independientes, texto dentro del lienzo y validación de JSON.

El reloj simulado comprueba continuidad y cancelación; no es un benchmark de rendimiento. `runBoardRegressionTests(lessons)` permite añadir las lecciones de P1 y revisar encimados entre textos. En la verificación se reprodujeron las 8 lecciones incluidas en sus mocks y las 2 del prototipo: 22 pruebas pasaron, sin encimados entre textos independientes. Incluye restauración del marcador a medio coloreado y del borrador tras una aclaración.

En Chrome local se probó además el flujo completo: inicio, pausa real de 350 ms sin mutaciones del trazo ni marcador, aclaración, reanudación, respuesta al checkpoint, fin de clase y carga de las 8 lecciones de mocks. Una muestra de 120 frames durante el dibujo dio mediana de 16.7 ms y p95 de 16.8 ms; es una medición local, no una garantía para todos los dispositivos.

`npm run check` pasó en la app integrada: TypeScript estricto (incluido `noUncheckedIndexedAccess`), ESLint y build de Vite. Los ajustes de mocks necesarios para combinar P1 y P3 ya están en `main`; esta rama solo modifica archivos de P2.
