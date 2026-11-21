import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { ApiError } from "../../../shared/api/errors.ts";
import { recoverMissingStudent } from "../recoverSession.ts";
import { clearSession, loadSession, saveSession } from "../session.ts";

const student = { id: "old-student", name: "Kevin", classCode: null, difficulty: 1, targetError: null, postLessonStreak: 0, lessonArmed: false };
beforeEach(() => {
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  clearSession();
  saveSession(student);
});
test("alumno inexistente borra la sesión y reemplaza la ruta por /alumno", () => {
  const calls = [];
  const handled = recoverMissingStudent(new ApiError(404, "No encontré a ese alumno."), student.id, (...args) => calls.push(args));
  assert.equal(handled, true);
  assert.equal(loadSession(), null);
  assert.deepEqual(calls, [["/alumno", { replace: true }]]);
});
test("acepta el mensaje del alumno sin punto final", () => {
  assert.equal(recoverMissingStudent(new ApiError(404, "No encontré a ese alumno"), student.id, () => {}), true);
  assert.equal(loadSession(), null);
});
test("otro 404 conserva la sesión: solo se perdió el problema", () => {
  assert.equal(recoverMissingStudent(new ApiError(404, "No encontré ese problema. Pide uno nuevo."), student.id, () => assert.fail("No debe redirigir")), false);
  assert.equal(loadSession().id, student.id);
});
test("un error temporal o de conexión no cierra la sesión", () => {
  for (const error of [new ApiError(500, "Algo se trabó"), new ApiError(0, "Sin conexión"), new Error("No encontré a ese alumno")]) {
    assert.equal(recoverMissingStudent(error, student.id, () => assert.fail("No debe redirigir")), false);
    assert.equal(loadSession().id, student.id);
  }
});
test("un 404 tardío de otro alumno no borra la sesión nueva", () => {
  saveSession({ ...student, id: "new-student", name: "Ana" });
  assert.equal(recoverMissingStudent(new ApiError(404, "No encontré a ese alumno."), student.id, () => assert.fail("No debe redirigir")), true);
  assert.equal(loadSession().id, "new-student");
});
