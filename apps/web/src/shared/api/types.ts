/* Espejo exacto de docs/CONTRACTS.md §1 y §3 (y de apps/api/app/schemas.py).   DUEÑO: P1
   No modificar sin seguir el proceso de cambio de contratos. */

export type Frac = { n: number; d: number };

export type ErrorCode =
  | "SUMA_DIRECTA" | "NUMERADOR_SIN_AJUSTAR" | "SUMA_DENOMINADORES"
  | "AMPLIFICACION_INCORRECTA" | "DENOMINADOR_NO_COMUN" | "MULTIPLICA"
  | "ERROR_ARITMETICO" | "OTRO";

export type Level = "CONCEPTO_FRACCION" | "EQUIVALENCIA" | "DENOMINADOR_COMUN" | "SUMA";
export type LightStatus = "rojo" | "amarillo" | "verde" | "revisar";
export type DiagnosisStatus = "pending" | "done" | "needs_review" | "failed";

export type Exercise = { id: string; a: Frac; b: Frac; text: string };
export type TranscriptLine = { index: number; text: string; ok: boolean };
export type Box = { x: number; y: number; w: number; h: number };

export type Diagnosis = {
  id: string;
  status: DiagnosisStatus;
  student_name: string;
  exercise: Exercise;
  image_url: string;                 // relativo (/api/files/...) o data URL en mocks; "" si no hay foto
  transcript: TranscriptLine[];
  final_answer: Frac | null;
  correct: boolean;
  error_code: ErrorCode | null;
  error_line: number | null;
  error_box: Box | null;             // 0..1 relativo a la imagen
  feedback: string;
  confidence: number;
  teacher_override: boolean;
  note: string | null;
};

export type StudentSummary = {
  id: string; name: string; status: LightStatus;
  error_code: ErrorCode | null; stars: number;
  last_diagnosis_id: string | null; source: "aula" | "solo" | "demo";
};
export type StudentDetail = StudentSummary & { history: Diagnosis[] };

export type BoardGroupKey = ErrorCode | "CORRECTO" | "REVISAR";
export type BoardGroup = { error_code: BoardGroupKey; label: string; students: StudentSummary[] };
export type Board = {
  class_code: string; assignment_id: string; exercise: Exercise;
  counts: Record<LightStatus, number>; total: number;
  groups: BoardGroup[];               // ya ordenados: errores más grandes primero, REVISAR y CORRECTO al final
};

export type Meta = { error_labels: Record<ErrorCode, string>; level_labels: Record<Level, string>; demo_mode: boolean };
export type ClassOut = { code: string; name: string };
export type ClassDetail = ClassOut & { assignments: { id: string; exercise: Exercise }[] };   // adicional (GET /classes/{code})
export type AssignmentOut = { id: string; exercise: Exercise; key_answer: Frac; key_transcript: TranscriptLine[] };
export type StudentOut = { id: string; name: string; class_code: string | null };
export type QuizItem = { id: string; prompt: string; draw: Op[]; options: string[] };
export type QuizResult = { level: Level; lesson_id: string };

/* ---------- Lecciones (Pizarra) — CONTRACTS.md §3 ---------- */
export type InkColor = "negro" | "azul" | "rojo" | "verde" | "morado" | "naranja";

export type Op =
  | { op: "write"; text: string; x: number; y: number; size?: number; color?: InkColor; anchor?: "start" | "middle" }
  | { op: "frac"; num: string; den: string; x: number; y: number; size?: number; color?: InkColor }
  | { op: "pie"; cx: number; cy: number; r: number; parts: number; shade: number; color?: InkColor }
  | { op: "bar"; x: number; y: number; w: number; h: number; parts: number; shade: number; color?: InkColor }
  | { op: "line"; x1: number; y1: number; x2: number; y2: number; color?: InkColor; width?: number }
  | { op: "arrow"; x1: number; y1: number; x2: number; y2: number; color?: InkColor }
  | { op: "rect"; x: number; y: number; w: number; h: number; color?: InkColor }
  | { op: "circle"; cx: number; cy: number; rx: number; ry?: number; color?: InkColor }
  | { op: "underline"; x: number; y: number; w: number; color?: InkColor }
  | { op: "cross"; x: number; y: number; w: number; h: number; color?: InkColor }
  | { op: "clear" }
  | { op: "wait"; ms: number };

export type Step = { say: string; draw: Op[]; checkpoint?: { prompt: string; answer: string } | null };

export type Lesson = {
  id: string;                         // "error:SUMA_DIRECTA" | "level:EQUIVALENCIA" | "diag:<id>"
  title: string;
  error_code: ErrorCode | null;
  level: Level | null;
  steps: Step[];
};

export type ProgressEvent = "lesson_done" | "explained";
