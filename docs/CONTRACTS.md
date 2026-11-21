# Contratos — la única fuente de verdad entre las 4 partes

> **Congelados desde el final de F0.** Para cambiar algo: (1) avisar en el grupo, (2) PR que **solo** cambia este archivo + `apps/web/src/shared/api/types.ts` + `apps/api/app/schemas.py`, (3) aprobación de P1 y de quien consume el cambio. Agregar campos **opcionales** está permitido sin romper a nadie; quitar o renombrar, no.

Prefijo de todas las rutas: `/api`. JSON en `snake_case`. Fracciones como `{"n": 1, "d": 2}`.

---

## 1. Tipos compartidos

```ts
type Frac = { n: number; d: number };

type ErrorCode =
  | "SUMA_DIRECTA" | "NUMERADOR_SIN_AJUSTAR" | "SUMA_DENOMINADORES"
  | "AMPLIFICACION_INCORRECTA" | "DENOMINADOR_NO_COMUN" | "MULTIPLICA"
  | "ERROR_ARITMETICO" | "OTRO";

type Level = "CONCEPTO_FRACCION" | "EQUIVALENCIA" | "DENOMINADOR_COMUN" | "SUMA";

type LightStatus = "rojo" | "amarillo" | "verde" | "revisar";

type Exercise = { id: string; a: Frac; b: Frac; text: string };   // text: "1/2 + 1/3"

type TranscriptLine = { index: number; text: string; ok: boolean };

type Diagnosis = {
  id: string;
  status: "pending" | "done" | "needs_review" | "failed";
  student_name: string;
  exercise: Exercise;
  image_url: string;
  transcript: TranscriptLine[];        // renglones leídos de la hoja
  final_answer: Frac | null;
  correct: boolean;
  error_code: ErrorCode | null;        // null si correct
  error_line: number | null;           // índice en transcript del primer paso equivocado
  error_box: { x: number; y: number; w: number; h: number } | null;  // 0..1 relativo a la imagen (opcional, S4)
  feedback: string;                    // 1 frase para el alumno: "Sumaste también los de abajo."
  confidence: number;                  // 0..1
  teacher_override: boolean;
  note: string | null;                 // observación, ej. "puedes simplificar"
};

type StudentSummary = {
  id: string; name: string; status: LightStatus;
  error_code: ErrorCode | null; stars: number;
  last_diagnosis_id: string | null; source: "aula" | "solo" | "demo";
};

type Board = {                         // el semáforo
  class_code: string; assignment_id: string; exercise: Exercise;
  counts: Record<LightStatus, number>; total: number;
  groups: { error_code: ErrorCode | "CORRECTO" | "REVISAR"; label: string; students: StudentSummary[] }[];
};
```

Etiquetas en español de cada `ErrorCode`: `GET /api/meta` (no las escribas a mano en el front).

---

## 2. Endpoints

### Meta
| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/meta` | `{ error_labels: Record<ErrorCode,string>, level_labels: Record<Level,string>, demo_mode: boolean }` |

### Puerta Aula (docente)
| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/classes` | `{ name: string }` | `{ code: string, name: string }` |
| POST | `/classes/{code}/assignments` | multipart: `key_image?` (archivo) **o** `key_text?` ("1/2+1/3=3/6+2/6=5/6") | `{ id, exercise: Exercise, key_answer: Frac, key_transcript: TranscriptLine[] }` |
| POST | `/assignments/{id}/sheets` | multipart: `image` (archivo), `student_name?` | `Diagnosis` con `status:"pending"` (se procesa en segundo plano) |
| GET | `/diagnoses/{id}` | — | `Diagnosis` (hacer polling cada 1.5 s hasta `status != "pending"`) |
| GET | `/assignments/{id}/board` | — | `Board` (polling cada 2–3 s) |
| PATCH | `/diagnoses/{id}` | `{ error_code: ErrorCode \| null, student_name?: string }` | `Diagnosis` con `teacher_override:true` |
| POST | `/demo/seed` | `{ class_code }` | `Board` con ~25 alumnos simulados + 3 hojas demo |

### Puerta Solo (alumno)
| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/students` | `{ name, class_code? }` | `{ id, name, class_code }` |
| GET | `/students/{id}` | — | `StudentSummary & { history: Diagnosis[] }` |
| POST | `/students/{id}/problem` | `{ target_error?: ErrorCode, difficulty?: 1\|2\|3 }` | `Exercise` |
| POST | `/students/{id}/problem/{exercise_id}/sheet` | multipart: `image` | `Diagnosis` (`pending` → polling `/diagnoses/{id}`) |
| GET | `/students/{id}/explain/quiz` | — | `{ items: { id, prompt, draw: Op[], options: string[] }[] }` (S1) |
| POST | `/students/{id}/explain/quiz` | `{ answers: Record<string,string> }` | `{ level: Level, lesson_id: string }` (S1) |
| POST | `/students/{id}/progress` | `{ event: "lesson_done" \| "explained", lesson_id }` | `StudentSummary` |

### Lecciones e interacción
| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/lessons/for-diagnosis/{diagnosis_id}` | — | `Lesson` personalizada con los números del alumno |
| GET | `/lessons/{lesson_id}` | — | `Lesson` (ids: `error:SUMA_DIRECTA`, `level:EQUIVALENCIA`) |
| POST | `/lessons/ask` | `{ lesson_id, step_index, question }` | `{ steps: Step[] }` (1–3 pasos de aclaración) |
| POST | `/lessons/explain-back` | `{ lesson_id, transcript }` | `{ feedback: string, understood: boolean }` (S2) |
| POST | `/tts` | `{ text, voice? }` | `audio/mpeg` (501 si no está configurado → el front usa la voz del navegador) |

Errores: HTTP 4xx/5xx con `{ "detail": "mensaje en español" }`.

---

## 3. Formato de lección (Pizarra)

```ts
type Lesson = {
  id: string;
  title: string;                       // "¿Por qué 1/2 + 1/3 no es 2/5?"
  error_code: ErrorCode | null;
  level: Level | null;
  steps: Step[];
};

type Step = {
  say: string;                         // lo que dice la voz (≤ 35 palabras, 1–2 oraciones)
  draw: Op[];                          // lo que dibuja el marcador MIENTRAS habla
  checkpoint?: { prompt: string; answer: string };   // pregunta opcional al final del paso
};
```

### Pizarra: lienzo lógico de **1000 × 600** (x → derecha, y ↓ abajo). Colores: `negro | azul | rojo | verde | morado | naranja`.

| op | Campos | Qué dibuja |
|---|---|---|
| `write` | `text, x, y, size?=42, color?, anchor?="start"\|"middle"` | Texto escrito a mano letra por letra. `x,y` = línea base |
| `frac` | `num, den, x, y, size?=44, color?` | Fracción vertical. `x,y` = centro de la rayita |
| `pie` | `cx, cy, r, parts, shade, color?` | **Tortilla**: círculo partido en `parts` rebanadas, colorea `shade` |
| `bar` | `x, y, w, h, parts, shade, color?` | Barra (entero) partida en `parts`, colorea `shade` |
| `line` | `x1, y1, x2, y2, color?, width?` | Línea a mano |
| `arrow` | `x1, y1, x2, y2, color?` | Flecha |
| `rect` | `x, y, w, h, color?` | Rectángulo a mano |
| `circle` | `cx, cy, rx, ry?, color?="rojo"` | Encierra algo (el error) |
| `underline` | `x, y, w, color?` | Subraya |
| `cross` | `x, y, w, h, color?="rojo"` | Tacha (una X sobre algo) |
| `clear` | — | Borra la pizarra (desvanece) |
| `wait` | `ms` | Pausa |

Reglas para quien genere lecciones (humano o IA): nada fuera de 1000×600; un texto de tamaño 40 ocupa ~18 px por carácter; no encimar; usar `clear` para cambiar de idea; escribir poco (la voz explica); el paso 1 muestra el ejercicio del alumno y encierra su error en rojo.

**Op desconocida → el reproductor la ignora y sigue** (nunca truena una clase). Ops nuevas se agregan aquí primero.

### Ejemplo mínimo
```json
{
  "id": "error:SUMA_DIRECTA", "title": "¿Por qué 1/2 + 1/3 no es 2/5?", "error_code": "SUMA_DIRECTA", "level": null,
  "steps": [
    { "say": "Sumaste un medio más un tercio y te dio dos quintos. Veamos por qué no puede ser.",
      "draw": [
        { "op": "frac", "num": "1", "den": "2", "x": 110, "y": 100 },
        { "op": "write", "text": "+", "x": 170, "y": 116, "size": 52, "anchor": "middle" },
        { "op": "frac", "num": "1", "den": "3", "x": 230, "y": 100 },
        { "op": "write", "text": "=", "x": 290, "y": 116, "size": 52, "anchor": "middle" },
        { "op": "frac", "num": "2", "den": "5", "x": 350, "y": 100, "color": "rojo" },
        { "op": "circle", "cx": 350, "cy": 100, "rx": 46, "ry": 62 } ] },
    { "say": "Esta tortilla está partida en dos y pinto una mitad.",
      "draw": [ { "op": "pie", "cx": 160, "cy": 330, "r": 90, "parts": 2, "shade": 1, "color": "naranja" } ] }
  ]
}
```

---

## 4. Contrato interno del frontend: Pizarra ↔ Interacción (P2 ↔ P4)

`features/board` expone (P2):
```ts
type PlayerHandle = {
  play(lesson: Lesson): Promise<void>;
  pause(): void;                         // congela trazo y voz a medio paso (< 1 s)
  resume(): void;                        // repite la oración interrumpida y sigue
  playAside(steps: Step[]): Promise<void>; // hoja de aclaración encima; al terminar la quita
  state: "idle" | "playing" | "paused" | "aside" | "done";
  currentStep: number;
};
// <LessonPlayer lesson onReady={(h: PlayerHandle) => ...} onStepChange onDone speak={Speaker} />
```

`features/interact` expone (P4):
```ts
type Speaker = { speak(text: string, opts: { signal: AbortSignal }): Promise<"ok" | "interrupted">; stop(): void };
function useSpeaker(): Speaker;                                  // Grok TTS → respaldo navegador
function useInterruptTriggers(opts: { enabled: boolean; onTrigger(source: "button"|"hand"|"voice"|"key"): void }): {
  handReady: boolean; micReady: boolean; lastTranscript: string };
function useQuestionCapture(): { start(): Promise<string>; cancel(): void };   // escucha la duda
<InterruptOverlay open onQuestion={(q) => ...} onCancel />                     // UI "Te escucho…"
```

La página de clase (P4 la arma en `features/student`, P3 la reutiliza en `features/teacher`) conecta: trigger → `handle.pause()` → `InterruptOverlay` → `api.ask()` → `handle.playAside(steps)` → `handle.resume()`.

---

## 5. Mocks
`apps/web/src/shared/api/mocks/` tiene respuestas de ejemplo para **todos** los endpoints. Con `VITE_USE_MOCKS=true` el front funciona sin backend. Quien agregue un endpoint agrega su mock.
