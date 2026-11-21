import { httpForm, httpJson } from "./http";
import { mockApi } from "./mocks/client";
import type {
  Assignment,
  AssignmentKeyResult,
  Board,
  ClassRoom,
  Diagnosis,
  ErrorCode,
  MetaResponse,
} from "./types";

const useMocks = import.meta.env.VITE_USE_MOCKS === "true";

export const api = {
  getMeta(): Promise<MetaResponse> {
    return useMocks ? mockApi.getMeta() : httpJson("/meta");
  },

  createClass(name: string): Promise<ClassRoom> {
    return useMocks
      ? mockApi.createClass(name)
      : httpJson("/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
  },

  listAssignments(classCode: string): Promise<Assignment[]> {
    if (useMocks) return mockApi.listAssignments(classCode);
    // Endpoint de listado no está en contratos; con API real P1 lo define.
    // Mientras, devolvemos vacío para no inventar rutas.
    void classCode;
    return Promise.resolve([]);
  },

  createAssignment(
    classCode: string,
    body: { key_text?: string; key_image?: File },
  ): Promise<AssignmentKeyResult> {
    if (useMocks) return mockApi.createAssignment(classCode, body);
    const form = new FormData();
    if (body.key_text) form.append("key_text", body.key_text);
    if (body.key_image) form.append("key_image", body.key_image);
    return httpForm(`/classes/${classCode}/assignments`, form);
  },

  uploadSheet(
    assignmentId: string,
    image: File,
    studentName?: string,
  ): Promise<Diagnosis> {
    if (useMocks) return mockApi.uploadSheet(assignmentId, image, studentName);
    const form = new FormData();
    form.append("image", image);
    if (studentName) form.append("student_name", studentName);
    return httpForm(`/assignments/${assignmentId}/sheets`, form);
  },

  getDiagnosis(id: string): Promise<Diagnosis> {
    return useMocks
      ? mockApi.getDiagnosis(id)
      : httpJson(`/diagnoses/${id}`);
  },

  getBoard(assignmentId: string): Promise<Board> {
    return useMocks
      ? mockApi.getBoard(assignmentId)
      : httpJson(`/assignments/${assignmentId}/board`);
  },

  patchDiagnosis(
    id: string,
    body: { error_code: ErrorCode | null; student_name?: string },
  ): Promise<Diagnosis> {
    return useMocks
      ? mockApi.patchDiagnosis(id, body)
      : httpJson(`/diagnoses/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
  },

  seedDemo(classCode: string): Promise<Board> {
    return useMocks
      ? mockApi.seedDemo(classCode)
      : httpJson("/demo/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ class_code: classCode }),
        });
  },

  getClass(): ClassRoom {
    return useMocks
      ? mockApi.getClass()
      : { code: "MAT-1B", name: "Mi salón" };
  },
};
