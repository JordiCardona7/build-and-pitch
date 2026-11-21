import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { useQuestionCapture } from "../useQuestionCapture.ts";
import { useInterruptTriggers } from "../useInterruptTriggers.ts";
import { useHandRaise } from "../useHandRaise.ts";
import { beginSpeech } from "../speechActivity.ts";

class FakeElement {
  constructor(interactive) { this.interactive = interactive; }
  closest() { return this.interactive; }
}
class FakeRecognition {
  static instances = [];
  constructor() { FakeRecognition.instances.push(this); this.aborted = false; }
  start() { this.onstart?.(); }
  abort() { this.aborted = true; }
  result(text) {
    this.onresult?.({ resultIndex: 0, results: [{ 0: { transcript: text }, length: 1, isFinal: true }] });
  }
}
let listeners;
beforeEach(() => {
  listeners = new Map();
  FakeRecognition.instances = [];
  globalThis.Element = FakeElement;
  globalThis.window = {
    isSecureContext: true,
    SpeechRecognition: FakeRecognition,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); },
  };
});

test("la duda termina tras 1.2 s de silencio y libera la escucha", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let capture;
  function Probe() { capture = useQuestionCapture(); return null; }
  let view;
  act(() => { view = create(createElement(Probe)); });
  let result;
  act(() => { result = capture.start(); });
  const mic = FakeRecognition.instances[0];
  act(() => mic.result("¿Por qué cambia el numerador?"));
  assert.equal(capture.transcript, "¿Por qué cambia el numerador?");
  await act(async () => { context.mock.timers.tick(1_199); });
  assert.equal(mic.aborted, false);
  await act(async () => { context.mock.timers.tick(1); });
  assert.equal(await result, "¿Por qué cambia el numerador?");
  assert.equal(mic.aborted, true);
  act(() => view.unmount());
});

test("cancelar o salir siempre resuelve la captura pendiente", async () => {
  let capture;
  function Probe() { capture = useQuestionCapture(); return null; }
  let view;
  act(() => { view = create(createElement(Probe)); });
  let first;
  act(() => { first = capture.start(); });
  act(() => capture.cancel());
  assert.equal(await first, "");
  let second;
  act(() => { second = capture.start(); });
  act(() => view.unmount());
  assert.equal(await second, "");
  assert.equal(FakeRecognition.instances.at(-1).aborted, true);
});

test("sin permiso de micrófono la captura devuelve texto vacío", async () => {
  let capture;
  function Probe() { capture = useQuestionCapture(); return null; }
  let view;
  act(() => { view = create(createElement(Probe)); });
  let result;
  act(() => { result = capture.start(); });
  act(() => FakeRecognition.instances[0].onerror({ error: "not-allowed" }));
  assert.equal(await result, "");
  assert.equal(capture.status, "denied");
  act(() => view.unmount());
});

test("espacio respeta los campos y los botones, y elimina el atajo al salir", () => {
  const sources = [];
  function Probe() { useInterruptTriggers({ enabled: true, onTrigger: (source) => sources.push(source) }); return null; }
  let view;
  act(() => { view = create(createElement(Probe)); });
  const event = { code: "Space", target: new FakeElement(true), preventDefault() { this.prevented = true; } };
  act(() => listeners.get("keydown")(event));
  assert.deepEqual(sources, []);
  event.target = new FakeElement(false);
  act(() => listeners.get("keydown")(event));
  assert.deepEqual(sources, ["key"]);
  assert.equal(event.prevented, true);
  act(() => view.unmount());
  assert.equal(listeners.has("keydown"), false);
});

test("la escucha de frases requiere activación y se cierra al interrumpir", () => {
  let triggers;
  const sources = [];
  function Probe({ enabled }) { triggers = useInterruptTriggers({ enabled, onTrigger: (source) => sources.push(source) }); return null; }
  let view;
  act(() => { view = create(createElement(Probe, { enabled: true })); });
  assert.equal(FakeRecognition.instances.length, 0);
  act(() => triggers.enableMic());
  const mic = FakeRecognition.instances[0];
  assert.equal(triggers.micReady, true);
  act(() => mic.result("me perdí"));
  assert.deepEqual(sources, ["voice"]);
  assert.equal(mic.aborted, true);
  act(() => view.update(createElement(Probe, { enabled: false })));
  assert.equal(triggers.micReady, false);
  act(() => view.unmount());
});

test("un permiso de cámara que llega después de salir no deja la cámara encendida", async () => {
  let deliver;
  let stops = 0;
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalCancel = globalThis.cancelAnimationFrame;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: { getUserMedia: () => new Promise((resolve) => { deliver = resolve; }) } } });
  globalThis.cancelAnimationFrame = () => {};
  try {
    function Probe() { useHandRaise({ cameraEnabled: true, enabled: true, onRaise() {} }); return null; }
    let view;
    act(() => { view = create(createElement(Probe)); });
    act(() => view.unmount());
    await act(async () => { deliver({ getTracks: () => [{ stop: () => { stops += 1; } }] }); });
    assert.equal(stops, 1);
  } finally {
    if (original) Object.defineProperty(globalThis, "navigator", original);
    else delete globalThis.navigator;
    globalThis.cancelAnimationFrame = originalCancel;
  }
});

test("ignora el eco de la explicación y las frases normales", () => {
  let triggers;
  const sources = [];
  function Probe() { triggers = useInterruptTriggers({ enabled: true, onTrigger: (source) => sources.push(source) }); return null; }
  let view;
  act(() => { view = create(createElement(Probe)); });
  act(() => triggers.enableMic());
  const mic = FakeRecognition.instances[0];
  const endSpeech = beginSpeech("Si te pierdes, puedes decir no entendí.");
  act(() => mic.result("no entendí"));
  const conversation = ["Para sumar necesitamos partes iguales", "El patrón se repite", "Vamos a comparar las tortillas", "¿Cómo se suman las fracciones?", "Ahora tenemos seis partes", "Ya pinté tres pedazos"];
  for (let index = 0; index < 60; index += 1) act(() => mic.result(conversation[index % conversation.length]));
  assert.deepEqual(sources, []);
  endSpeech();
  act(() => view.unmount());
});
