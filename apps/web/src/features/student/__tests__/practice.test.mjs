import assert from "node:assert/strict";
import { test } from "node:test";
import { confirmedGreen, nextPracticeSession } from "../practice.ts";
import { fallbackClarification, requestClarification } from "../clarification.ts";
const { AbortController } = globalThis;
const session = { id: "s1", name: "Kevin", classCode: null, difficulty: 1, targetError: "SUMA_DIRECTA", lessonArmed: true, postLessonStreak: 0 };
const correct = { status: "done", correct: true, error_code: null };
const lesson = { id: "l1", title: "Fracciones", level: null, error_code: "SUMA_DIRECTA", steps: [{ say: "Sumemos.", draw: [{ op: "frac", num: "1", den: "2", x: 10, y: 10 }, { op: "frac", num: "1", den: "3", x: 50, y: 10 }] }] };

test("primer acierto conserva el tipo de error y la dificultad", () => {
  const next = nextPracticeSession(session, correct);
  assert.equal(next.postLessonStreak, 1);
  assert.equal(next.targetError, "SUMA_DIRECTA");
  assert.equal(next.difficulty, 1);
  assert.equal(confirmedGreen(next, "verde"), false);
});
test("dos aciertos permiten avanzar, pero verde requiere confirmación del servidor", () => {
  const next = nextPracticeSession(nextPracticeSession(session, correct), correct);
  assert.equal(next.postLessonStreak, 2);
  assert.equal(next.targetError, null);
  assert.equal(next.difficulty, 2);
  assert.equal(confirmedGreen(next, "rojo"), false);
  assert.equal(confirmedGreen(next, "verde"), true);
});
test("equivocarse reinicia la racha; una hoja en revisión no la cambia", () => {
  const one = nextPracticeSession(session, correct);
  assert.equal(nextPracticeSession(one, { ...correct, correct: false, error_code: "MULTIPLICA" }).postLessonStreak, 0);
  assert.equal(nextPracticeSession(one, { ...correct, status: "needs_review" }), one);
});
test("el respaldo usa los números del alumno y fracciones equivalentes", () => {
  const steps = fallbackClarification(lesson);
  assert.equal(steps.length, 3);
  const fractions = steps[1].draw.filter(op => op.op === "frac");
  assert.deepEqual(fractions.map(op => [op.num, op.den]), [["3", "6"], ["2", "6"]]);
  assert.ok(steps.every(step => step.say.split(/\s+/).length <= 35));
});
test("cambia a barras si la clase ya usaba tortillas", () => {
  const steps = fallbackClarification({ ...lesson, steps: [{ say: "", draw: [{ op: "pie", cx: 100, cy: 100, r: 50, parts: 2, shade: 1 }] }] });
  assert.ok(steps[0].draw.some(op => op.op === "bar"));
  assert.ok(steps[0].draw.some(op => op.text === "Un ejemplo con barras"));
});
test("una caída de la API o aclaración vacía usa el respaldo", async () => {
  const signal = new AbortController().signal;
  assert.equal((await requestClarification(async () => { throw new Error("Sin conexión"); }, lesson, signal)).fallback, true);
  assert.equal((await requestClarification(async () => ({ steps: [] }), lesson, signal)).fallback, true);
});
test("una petición colgada tiene límite y una cancelada no reproduce un respaldo", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const signal = new AbortController().signal;
  const pending = requestClarification(() => new Promise(() => {}), lesson, signal);
  context.mock.timers.tick(10_000);
  assert.equal((await pending).fallback, true);
  const controller = new AbortController();
  const cancel = requestClarification(() => new Promise(() => {}), lesson, controller.signal);
  controller.abort();
  await assert.rejects(cancel, { name: "AbortError" });
});
