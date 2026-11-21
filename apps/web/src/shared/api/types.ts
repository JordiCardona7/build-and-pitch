export type Frac = { n: number; d: number };

export type ErrorCode =
  | "SUMA_DIRECTA"
  | "NUMERADOR_SIN_AJUSTAR"
  | "SUMA_DENOMINADORES"
  | "AMPLIFICACION_INCORRECTA"
  | "DENOMINADOR_NO_COMUN"
  | "MULTIPLICA"
  | "ERROR_ARITMETICO"
  | "OTRO";

export type Level =
  | "CONCEPTO_FRACCION"
  | "EQUIVALENCIA"
  | "DENOMINADOR_COMUN"
  | "SUMA";

export type LightStatus = "rojo" | "amarillo" | "verde" | "revisar";

export type Exercise = {
  id: string;
  a: Frac;
  b: Frac;
  text: string;
};

export type TranscriptLine = { index: number; text: string; ok: boolean };

export type Diagnosis = {
  id: string;
  status: "pending" | "done" | "needs_review" | "failed";
  student_name: string;
  exercise: Exercise;
  image_url: string;
  transcript: TranscriptLine[];
  final_answer: Frac | null;
  correct: boolean;
  error_code: ErrorCode | null;
  error_line: number | null;
  error_box: { x: number; y: number; w: number; h: number } | null;
  feedback: string;
  confidence: number;
  teacher_override: boolean;
  note: string | null;
};

export type StudentSummary = {
  id: string;
  name: string;
  status: LightStatus;
  error_code: ErrorCode | null;
  stars: number;
  last_diagnosis_id: string | null;
  source: "aula" | "solo" | "demo";
};

export type BoardGroup = {
  error_code: ErrorCode | "CORRECTO" | "REVISAR";
  label: string;
  students: StudentSummary[];
};

export type Board = {
  class_code: string;
  assignment_id: string;
  exercise: Exercise;
  counts: Record<LightStatus, number>;
  total: number;
  groups: BoardGroup[];
};

export type ClassRoom = {
  code: string;
  name: string;
};

export type Assignment = {
  id: string;
  class_code: string;
  title: string;
  exercise: Exercise;
  key_answer: Frac;
  key_transcript: TranscriptLine[];
  created_at: string;
};

export type AssignmentKeyResult = {
  id: string;
  exercise: Exercise;
  key_answer: Frac;
  key_transcript: TranscriptLine[];
};

export type MetaResponse = {
  error_labels: Record<ErrorCode, string>;
  level_labels: Record<Level, string>;
  demo_mode: boolean;
};

export type Op =
  | {
      op: "write";
      text: string;
      x: number;
      y: number;
      size?: number;
      color?: string;
      anchor?: "start" | "middle";
    }
  | {
      op: "frac";
      num: string | number;
      den: string | number;
      x: number;
      y: number;
      size?: number;
      color?: string;
    }
  | {
      op: "pie";
      cx: number;
      cy: number;
      r: number;
      parts: number;
      shade: number;
      color?: string;
    }
  | {
      op: "bar";
      x: number;
      y: number;
      w: number;
      h: number;
      parts: number;
      shade: number;
      color?: string;
    }
  | {
      op: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color?: string;
      width?: number;
    }
  | { op: "arrow"; x1: number; y1: number; x2: number; y2: number; color?: string }
  | { op: "rect"; x: number; y: number; w: number; h: number; color?: string }
  | { op: "circle"; cx: number; cy: number; rx: number; ry?: number; color?: string }
  | { op: "underline"; x: number; y: number; w: number; color?: string }
  | { op: "cross"; x: number; y: number; w: number; h: number; color?: string }
  | { op: "clear" }
  | { op: "wait"; ms: number };

export type Step = {
  say: string;
  draw: Op[];
  checkpoint?: { prompt: string; answer: string };
};

export type Lesson = {
  id: string;
  title: string;
  error_code: ErrorCode | null;
  level: Level | null;
  steps: Step[];
};
