import assert from "node:assert/strict";
import { test } from "node:test";
import { createTtsCache } from "../ttsCache.ts";
const { Blob } = globalThis;

test("repite una oración usando el audio guardado", async () => {
  let calls = 0;
  const cached = createTtsCache(async () => { calls++; return new Blob(["audio"]); });
  const first = await cached("Hola.");
  assert.equal(await cached("Hola."), first);
  assert.equal(calls, 1);
});
test("comparte una petición pendiente entre dos consumidores", async () => {
  let deliver;
  let calls = 0;
  const cached = createTtsCache(() => { calls++; return new Promise(resolve => { deliver = resolve; }); });
  const first = cached("Hola.");
  const second = cached("Hola.");
  await Promise.resolve();
  deliver(new Blob(["audio"]));
  assert.equal(await first, await second);
  assert.equal(calls, 1);
});
test("no conserva audio vacío ni errores transitorios", async () => {
  let calls = 0;
  const cached = createTtsCache(async () => { calls++; if (calls === 1) return new Blob(); return new Blob(["audio"]); });
  await assert.rejects(cached("Hola."), /vacío/);
  assert.ok((await cached("Hola.")).size);
  assert.equal(calls, 2);
});
test("un 501 usa el respaldo sin repetir una petición por cada oración", async (context) => {
  context.mock.timers.enable({ apis: ["Date"] });
  let calls = 0;
  const cached = createTtsCache(async () => { calls++; throw { status: 501 }; });
  await assert.rejects(cached("Hola."));
  await assert.rejects(cached("Otra oración."));
  assert.equal(calls, 1);
  context.mock.timers.tick(30_001);
  await assert.rejects(cached("Otra oración."));
  assert.equal(calls, 2);
});
test("la caché elimina el audio menos reciente al llegar a 32 oraciones", async () => {
  let calls = 0;
  const cached = createTtsCache(async () => { calls++; return new Blob(["audio"]); });
  for (let i = 0; i < 33; i++) await cached(String(i));
  await cached("32");
  assert.equal(calls, 33);
  await cached("0");
  assert.equal(calls, 34);
});
