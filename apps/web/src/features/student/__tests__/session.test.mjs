import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { clearSession, loadSession, saveSession } from "../session.ts";

let values;
const example = { id: "student-1", name: "Kevin", classCode: "MAT-1B", difficulty: 1, targetError: null, postLessonStreak: 0, lessonArmed: false };
beforeEach(() => {
  values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  clearSession();
});
test("conserva la identidad y el ejercicio entre pantallas", () => {
  saveSession(example);
  assert.deepEqual(loadSession(), example);
});
test("rechaza una sesión dañada o con identidad de tipo incorrecto", () => {
  values.set("pizarra.alumno", "{mal");
  assert.equal(loadSession(), null);
  values.set("pizarra.alumno", JSON.stringify({ id: 42, name: "Kevin" }));
  assert.equal(loadSession(), null);
});
test("normaliza dificultad y aciertos que no sean válidos", () => {
  values.set("pizarra.alumno", JSON.stringify({ ...example, difficulty: 99, postLessonStreak: -2 }));
  assert.equal(loadSession().difficulty, 1);
  assert.equal(loadSession().postLessonStreak, 0);
});
test("sigue funcionando si el navegador bloquea el almacenamiento", () => {
  globalThis.localStorage = { getItem() { throw new Error("Bloqueado"); }, setItem() { throw new Error("Bloqueado"); }, removeItem() { throw new Error("Bloqueado"); } };
  assert.doesNotThrow(() => saveSession(example));
  assert.deepEqual(loadSession(), example);
  assert.doesNotThrow(clearSession);
  assert.equal(loadSession(), null);
});
test("No soy yo elimina la sesión anterior", () => {
  saveSession(example);
  clearSession();
  assert.equal(loadSession(), null);
});
