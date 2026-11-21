/* Único punto de contacto del frontend con el backend.   DUEÑO: P1
   Uso:  import { api } from "@/shared/api";   (o ruta relativa)
   Con VITE_USE_MOCKS=true responde con datos simulados (ver ./mocks.ts) sin backend. */
import type {
  AssignmentOut, Board, ClassDetail, ClassOut, Diagnosis, ErrorCode, Exercise, Lesson, Meta,
  ProgressEvent, QuizItem, QuizResult, Step, StudentDetail, StudentOut, StudentSummary,
} from "./types";
import { mockApi } from "./mocks";
import { ApiError } from "./errors";

export { ApiError };

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor. Revisa tu internet.");
  }
  if (!r.ok) {
    let detail = "Algo se trabó. Probemos otra vez.";
    try { detail = (await r.json()).detail ?? detail; } catch { /* sin cuerpo JSON */ }
    throw new ApiError(r.status, detail);
  }
  return r.json() as Promise<T>;
}
const json = (method: string, body: unknown): RequestInit =>
  ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const form = (fields: Record<string, string | Blob | undefined>): RequestInit => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== "") fd.append(k, v);
  return { method: "POST", body: fd };
};

const realApi = {
  meta: () => req<Meta>("/meta"),

  /* ---- Puerta Aula ---- */
  createClass: (name: string) => req<ClassOut>("/classes", json("POST", { name })),
  getClass: (code: string) => req<ClassDetail>(`/classes/${encodeURIComponent(code)}`),
  /** La clave del docente: texto ("1/2 + 1/3 = 5/6") o foto. */
  createAssignment: (classCode: string, key: { text?: string; image?: Blob }) =>
    req<AssignmentOut>(`/classes/${encodeURIComponent(classCode)}/assignments`, form({ key_text: key.text, key_image: key.image })),
  /** Responde al instante con status "pending"; luego haz polling con getDiagnosis / useDiagnosisPolling. */
  uploadSheet: (assignmentId: string, image: Blob, studentName?: string) =>
    req<Diagnosis>(`/assignments/${assignmentId}/sheets`, form({ image, student_name: studentName })),
  getDiagnosis: (id: string) => req<Diagnosis>(`/diagnoses/${id}`),
  /** Corrección del docente. error_code null = "lo tiene bien". */
  patchDiagnosis: (id: string, patch: { error_code: ErrorCode | null; student_name?: string }) =>
    req<Diagnosis>(`/diagnoses/${id}`, json("PATCH", patch)),
  getBoard: (assignmentId: string) => req<Board>(`/assignments/${assignmentId}/board`),
  seedDemo: (classCode: string) => req<Board>("/demo/seed", json("POST", { class_code: classCode })),

  /* ---- Puerta Solo ---- */
  createStudent: (name: string, classCode?: string) => req<StudentOut>("/students", json("POST", { name, class_code: classCode || null })),
  getStudent: (id: string) => req<StudentDetail>(`/students/${id}`),
  newProblem: (studentId: string, opts: { target_error?: ErrorCode; difficulty?: 1 | 2 | 3 } = {}) =>
    req<Exercise>(`/students/${studentId}/problem`, json("POST", opts)),
  uploadProblemSheet: (studentId: string, exerciseId: string, image: Blob) =>
    req<Diagnosis>(`/students/${studentId}/problem/${exerciseId}/sheet`, form({ image })),
  explainQuiz: (studentId: string) => req<{ items: QuizItem[] }>(`/students/${studentId}/explain/quiz`),
  submitQuiz: (studentId: string, answers: Record<string, string>) =>
    req<QuizResult>(`/students/${studentId}/explain/quiz`, json("POST", { answers })),
  progress: (studentId: string, event: ProgressEvent, lessonId: string) =>
    req<StudentSummary>(`/students/${studentId}/progress`, json("POST", { event, lesson_id: lessonId })),

  /* ---- Lecciones ---- */
  lessonForDiagnosis: (diagnosisId: string) => req<Lesson>(`/lessons/for-diagnosis/${diagnosisId}`),
  getLesson: (lessonId: string) => req<Lesson>(`/lessons/${encodeURIComponent(lessonId)}`),
  ask: (lessonId: string, stepIndex: number, question: string) =>
    req<{ steps: Step[] }>("/lessons/ask", json("POST", { lesson_id: lessonId, step_index: stepIndex, question })),
  explainBack: (lessonId: string, transcript: string) =>
    req<{ feedback: string; understood: boolean }>("/lessons/explain-back", json("POST", { lesson_id: lessonId, transcript })),

  /* ---- Voz (Grok Voice) ----
     Devuelve el audio MP3. Lanza ApiError 501 si no está configurada → usar la voz del navegador. */
  tts: async (text: string, voice?: string): Promise<Blob> => {
    const r = await fetch("/api/tts", json("POST", { text, voice }));
    if (!r.ok) throw new ApiError(r.status, "La voz de Grok no está disponible.");
    return r.blob();
  },
};

export type Api = typeof realApi;
export const api: Api = USE_MOCKS ? (mockApi as Api) : realApi;
export const usingMocks = USE_MOCKS;
