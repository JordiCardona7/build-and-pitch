/* Respuestas simuladas (VITE_USE_MOCKS=true).   DUEÑO: P1
   Los datos de mocks.data.json se generan con el backend real: `cd apps/api && python -m scripts.export_mocks`.
   No los edites a mano; si falta un caso, pídeselo a P1. */
import data from "./mocks.data.json";
import { ApiError } from "./errors";
import type {
  AssignmentOut, Board, ClassDetail, ClassOut, Diagnosis, Exercise, Lesson, Meta, QuizItem, QuizResult, Step,
  StudentDetail, StudentOut, StudentSummary,
} from "./types";

const D = data as unknown as {
  meta: Meta; class: ClassOut; assignment: AssignmentOut; diagnoses: Diagnosis[]; pending_diagnosis: Diagnosis;
  board: Board; lesson_for_diagnosis: Lesson; lessons: Record<string, Lesson>; ask: { steps: Step[] };
  explain_back: { feedback: string; understood: boolean }; student: StudentOut; problem: Exercise;
  student_detail: StudentDetail; quiz: { items: QuizItem[] }; quiz_result: QuizResult;
};

const wait = (ms = 400 + Math.random() * 500) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(x: T): T => structuredClone(x);
async function ok<T>(x: T, ms?: number): Promise<T> { await wait(ms); return clone(x); }

// Hojas subidas en modo mock: quedan "pending" 2 consultas y luego se resuelven rotando los 3 diagnósticos de ejemplo.
const pending = new Map<string, { polls: number; result: Diagnosis }>();
let uploads = 0;
function fakeUpload(): Diagnosis {
  const sample = D.diagnoses[uploads % D.diagnoses.length] ?? D.diagnoses[0];
  if (!sample) throw new Error("Mocks sin diagnósticos de ejemplo.");
  const result = clone(sample);
  const id = `dg_mock_${Date.now()}_${uploads++}`;
  result.id = id;
  pending.set(id, { polls: 0, result });
  return { ...clone(D.pending_diagnosis), id, image_url: result.image_url };
}

const findDiag = (id: string) => D.diagnoses.find((d) => d.id === id);

export const mockApi = {
  meta: () => ok(D.meta, 100),
  createClass: (name: string) => ok({ ...D.class, name }),
  getClass: (code: string): Promise<ClassDetail> =>
    ok({ ...D.class, code, assignments: [{ id: D.assignment.id, exercise: D.assignment.exercise }] }),
  createAssignment: (_classCode: string, _key: { text?: string; image?: Blob }) => ok(D.assignment, 900),
  uploadSheet: (_assignmentId: string, _image: Blob, _studentName?: string) => ok(fakeUpload(), 300),
  getDiagnosis: async (id: string): Promise<Diagnosis> => {
    const p = pending.get(id);
    if (p) {
      p.polls += 1;
      return ok(p.polls >= 2 ? p.result : { ...D.pending_diagnosis, id, image_url: p.result.image_url }, 200);
    }
    const d = findDiag(id) ?? D.diagnoses[0];
    if (!d) throw new Error("Mocks sin diagnósticos de ejemplo.");
    return ok({ ...d, id });
  },
  patchDiagnosis: async (id: string, patch: { error_code: Diagnosis["error_code"]; student_name?: string }) => {
    const base = findDiag(id) ?? pending.get(id)?.result ?? D.diagnoses[0];
    if (!base) throw new Error("Mocks sin diagnósticos de ejemplo.");
    return ok({ ...base, id, error_code: patch.error_code, correct: patch.error_code === null, teacher_override: true,
                student_name: patch.student_name ?? base.student_name, status: "done" as const });
  },
  getBoard: (_assignmentId: string) => ok(D.board, 250),
  seedDemo: (_classCode: string) => ok(D.board, 700),

  createStudent: (name: string, classCode?: string) => ok({ ...D.student, name, class_code: classCode || null }),
  getStudent: (_id: string) => ok(D.student_detail),
  newProblem: (_studentId: string, _opts: object = {}) => ok({ ...D.problem, id: `ex_mock_${Date.now()}` }),
  uploadProblemSheet: (_studentId: string, _exerciseId: string, _image: Blob) => ok(fakeUpload(), 300),
  explainQuiz: (_studentId: string) => ok(D.quiz),
  submitQuiz: (_studentId: string, _answers: Record<string, string>) => ok(D.quiz_result),
  progress: (_studentId: string, event: string, _lessonId: string): Promise<StudentSummary> =>
    ok({ ...D.student_detail, status: event === "lesson_done" ? "amarillo" : D.student_detail.status }),

  lessonForDiagnosis: (_diagnosisId: string) => ok(D.lesson_for_diagnosis),
  getLesson: (lessonId: string) => ok(D.lessons[lessonId] ?? D.lessons["error:SUMA_DIRECTA"]),
  ask: (_lessonId: string, _stepIndex: number, _question: string) => ok(D.ask, 1200),
  explainBack: (_lessonId: string, _transcript: string) => ok(D.explain_back, 900),
  tts: async (_text: string, _voice?: string): Promise<Blob> => { throw new ApiError(501, "Sin voz de Grok en modo mock."); },
};
