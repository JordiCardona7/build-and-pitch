import type {
  Assignment,
  AssignmentKeyResult,
  Board,
  ClassRoom,
  Diagnosis,
  ErrorCode,
  MetaResponse,
} from "../types";
import { delay, exerciseDemo, metaMock, reseedDemo, store } from "./data";

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export const mockApi = {
  async getMeta(): Promise<MetaResponse> {
    await delay(150);
    return metaMock;
  },

  async createClass(name: string): Promise<ClassRoom> {
    await delay(300);
    const slug =
      name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
        .slice(0, 6) || "AULA";
    store.classroom = { code: `${slug.slice(0, 3)}-1B`, name };
    return store.classroom;
  },

  async listAssignments(classCode: string): Promise<Assignment[]> {
    await delay(200);
    return store.assignments.filter((a) => a.class_code === classCode);
  },

  async createAssignment(
    classCode: string,
    body: { key_text?: string; key_image?: File },
  ): Promise<AssignmentKeyResult> {
    await delay(700);
    void body.key_image;
    const text = body.key_text?.trim() || "1/2+1/3=3/6+2/6=5/6";
    const id = uid("asg");
    const assignment: Assignment = {
      id,
      class_code: classCode,
      title: "Nueva tarea",
      exercise: exerciseDemo,
      key_answer: { n: 5, d: 6 },
      key_transcript: [
        {
          index: 0,
          text: text.split("=")[0]?.trim() || exerciseDemo.text,
          ok: true,
        },
        { index: 1, text: "5/6", ok: true },
      ],
      created_at: new Date().toISOString(),
    };
    store.assignments = [assignment, ...store.assignments];
    store.boards[id] = {
      class_code: classCode,
      assignment_id: id,
      exercise: exerciseDemo,
      counts: { rojo: 0, amarillo: 0, verde: 0, revisar: 0 },
      total: 0,
      groups: [],
    };
    return {
      id,
      exercise: assignment.exercise,
      key_answer: assignment.key_answer,
      key_transcript: assignment.key_transcript,
    };
  },

  async uploadSheet(
    assignmentId: string,
    image: File,
    studentName?: string,
  ): Promise<Diagnosis> {
    await delay(250);
    const id = uid("diag");
    const name =
      studentName?.trim() || image.name.replace(/\.[^.]+$/, "") || "";
    const diagnosis: Diagnosis = {
      id,
      status: "pending",
      student_name: name,
      exercise: exerciseDemo,
      image_url: URL.createObjectURL(image),
      transcript: [],
      final_answer: null,
      correct: false,
      error_code: null,
      error_line: null,
      error_box: null,
      feedback: "",
      confidence: 0,
      teacher_override: false,
      note: null,
    };
    store.diagnoses[id] = diagnosis;

    const timer = setTimeout(() => {
      const done: Diagnosis = {
        ...diagnosis,
        status: name ? "done" : "needs_review",
        student_name: name || "Sin nombre",
        transcript: [
          { index: 0, text: "1/2 + 1/3", ok: true },
          { index: 1, text: "2/5", ok: false },
        ],
        final_answer: { n: 2, d: 5 },
        error_code: "SUMA_DIRECTA",
        error_line: 1,
        error_box: { x: 0.1, y: 0.3, w: 0.32, h: 0.1 },
        feedback: "Sumaste también los de abajo.",
        confidence: name ? 0.88 : 0.45,
      };
      store.diagnoses[id] = done;

      const board = store.boards[assignmentId];
      if (board) {
        const student = {
          id: uid("stu"),
          name: done.student_name,
          status:
            done.status === "needs_review"
              ? ("revisar" as const)
              : ("rojo" as const),
          error_code: done.error_code,
          stars: 0,
          last_diagnosis_id: id,
          source: "aula" as const,
        };
        const groupCode =
          student.status === "revisar" ? "REVISAR" : "SUMA_DIRECTA";
        let group = board.groups.find((g) => g.error_code === groupCode);
        if (!group) {
          group = {
            error_code: groupCode,
            label:
              groupCode === "REVISAR"
                ? "Revisar"
                : "Sumaron también los de abajo",
            students: [],
          };
          board.groups = [group, ...board.groups];
        }
        group.students = [student, ...group.students];
        board.total += 1;
        board.counts[student.status] += 1;
      }
      pendingTimers.delete(id);
    }, 1800);
    pendingTimers.set(id, timer);

    return diagnosis;
  },

  async getDiagnosis(id: string): Promise<Diagnosis> {
    await delay(120);
    const d = store.diagnoses[id];
    if (!d) throw new Error("No encontré ese diagnóstico.");
    return d;
  },

  async getBoard(assignmentId: string): Promise<Board> {
    await delay(180);
    const board = store.boards[assignmentId];
    if (!board) throw new Error("No encontré esa tarea.");
    return structuredClone(board);
  },

  async patchDiagnosis(
    id: string,
    body: { error_code: ErrorCode | null; student_name?: string },
  ): Promise<Diagnosis> {
    await delay(250);
    const current = store.diagnoses[id];
    if (!current) throw new Error("No encontré ese diagnóstico.");
    const next: Diagnosis = {
      ...current,
      error_code: body.error_code,
      student_name: body.student_name ?? current.student_name,
      teacher_override: true,
      status: "done",
      correct: body.error_code === null,
    };
    store.diagnoses[id] = next;
    return next;
  },

  async seedDemo(classCode: string): Promise<Board> {
    await delay(500);
    const assignmentId = store.assignments[0]?.id ?? "asg-1";
    return reseedDemo(classCode, assignmentId);
  },

  getClass(): ClassRoom {
    return store.classroom;
  },
};
