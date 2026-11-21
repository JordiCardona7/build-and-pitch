// Se ejecuta con Node y tsx, sin cámara, micrófono ni servicios externos.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { GestureGate } from "../gestureGate.ts";
import { findInterruptPhrase, isSpeechEcho, normalizeSpeech } from "../phrases.ts";
import { createSpeaker, splitSentences } from "../speaker.ts";
import { startRecognition } from "../recognition.ts";
import { chooseSpanishVoice } from "../spanishVoices.ts";

const { AbortController, Blob, performance, setTimeout } = globalThis;

test("normaliza tildes, puntuación y mayúsculas", () => {
  assert.equal(normalizeSpeech(" ¡NO ENTENDÍ! "), "no entendi");
  for (const phrase of ["No entendí", "no entiendo", "no le entiendo", "me perdí", "espera", "para", "otra vez", "repite", "¿cómo?", "¿por qué?"]) {
    assert.ok(findInterruptPhrase(phrase), phrase);
  }
});

test("no trata palabras de una explicación como órdenes", () => {
  for (const phrase of ["Para sumar necesitamos partes iguales", "prepara las tortillas", "el patrón se repite", "vamos a comparar", "¿cómo se suman las fracciones?", "conocemos por qué se hace así"]) {
    assert.equal(findInterruptPhrase(phrase), null, phrase);
  }
  assert.equal(findInterruptPhrase("para", false), null);
  assert.equal(findInterruptPhrase("para", true), "para");
  assert.equal(findInterruptPhrase("no entiendo por qué", false), "no entiendo");
});

test("reconoce el eco y permite una duda distinta", () => {
  assert.equal(isSpeechEcho("no entendí", "Puedes decir no entendí."), true);
  assert.equal(isSpeechEcho("me perdí", "Para sumar necesitamos partes iguales."), false);
});

test("exige 600 ms y volver a bajar la mano antes de repetir", () => {
  const gate = new GestureGate();
  for (let now = 0; now < 600; now += 100) assert.equal(gate.update(true, now), false);
  assert.equal(gate.update(true, 600), true);
  for (let now = 700; now <= 5_000; now += 100) assert.equal(gate.update(true, now), false);
  gate.update(false, 5_100);
  for (let now = 5_200; now < 5_800; now += 100) assert.equal(gate.update(true, now), false);
  assert.equal(gate.update(true, 5_800), true);
});

test("respeta el enfriamiento y descarta huecos de cámara", () => {
  const gate = new GestureGate();
  for (let now = 0; now <= 600; now += 100) gate.update(true, now);
  gate.update(false, 700);
  for (let now = 800; now < 3_600; now += 100) assert.equal(gate.update(true, now), false);
  for (let now = 3_600; now < 4_200; now += 100) assert.equal(gate.update(true, now), false);
  assert.equal(gate.update(true, 4_200), true);
  const stalled = new GestureGate();
  stalled.update(true, 0);
  stalled.update(true, 100);
  assert.equal(stalled.update(true, 1_000), false);
  for (let now = 1_100; now < 1_600; now += 100) assert.equal(stalled.update(true, now), false);
  assert.equal(stalled.update(true, 1_600), true);
});

const utterances = [];
let cancellations = 0;
class FakeUtterance {
  constructor(text) { this.text = text; }
}
class FakeRecognition {
  static instances = [];
  constructor() { FakeRecognition.instances.push(this); this.aborted = false; }
  start() { this.onstart?.(); }
  abort() { this.aborted = true; }
  result(text, isFinal = true) {
    this.onresult?.({ resultIndex: 0, results: [{ 0: { transcript: text }, length: 1, isFinal }] });
  }
}

beforeEach(() => {
  utterances.length = 0;
  cancellations = 0;
  FakeRecognition.instances = [];
  globalThis.window = {
    SpeechRecognition: FakeRecognition,
    speechSynthesis: {
      getVoices: () => [{ lang: "en-US" }, { lang: "es-MX" }],
      speak: (utterance) => utterances.push(utterance),
      cancel: () => { cancellations += 1; },
    },
  };
  globalThis.SpeechSynthesisUtterance = FakeUtterance;
});

const signal = () => new AbortController().signal;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("habla por oraciones y elige una voz en español", async () => {
  assert.deepEqual(splitSentences("Una mitad. Un tercio.  "), ["Una mitad.", "Un tercio."]);
  const speaker = createSpeaker();
  const result = speaker.speak("Una mitad. Un tercio.", { signal: signal() });
  assert.equal(utterances[0].voice.lang, "es-MX");
  utterances[0].onend();
  await tick();
  assert.equal(utterances[1].text, "Un tercio.");
  utterances[1].onend();
  assert.equal(await result, "ok");
});

test("stop resuelve aun si el navegador omite sus eventos de cancelación", async () => {
  const speaker = createSpeaker();
  const result = speaker.speak("Una oración larga.", { signal: signal() });
  const started = performance.now();
  speaker.stop();
  assert.equal(await result, "interrupted");
  assert.ok(performance.now() - started < 200);
  assert.equal(cancellations, 1);
});

test("el AbortSignal corta la voz y no inicia la siguiente oración", async () => {
  const speaker = createSpeaker();
  const controller = new AbortController();
  const result = speaker.speak("Una mitad. Un tercio.", { signal: controller.signal });
  controller.abort();
  assert.equal(await result, "interrupted");
  assert.equal(utterances.length, 1);
});

test("una reproducción nueva cancela la anterior sin cancelar la nueva", async () => {
  const speaker = createSpeaker();
  const previous = speaker.speak("Primera.", { signal: signal() });
  const next = speaker.speak("Segunda.", { signal: signal() });
  assert.equal(await previous, "interrupted");
  assert.equal(utterances[1].text, "Segunda.");
  utterances[1].onend();
  assert.equal(await next, "ok");
});

test("un 501 o error de TTS pasa a voz local", async () => {
  const speaker = createSpeaker(() => ({ tts: async () => { throw new Error("501"); } }));
  const result = speaker.speak("Una mitad.", { signal: signal() });
  await tick();
  assert.equal(utterances[0].text, "Una mitad.");
  utterances[0].onend();
  assert.equal(await result, "ok");
});

test("un TTS que nunca responde tiene respaldo y se puede interrumpir", async () => {
  const speaker = createSpeaker(() => ({ tts: () => new Promise(() => {}), ttsTimeoutMs: 1 }));
  const result = speaker.speak("Una mitad.", { signal: signal() });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(utterances[0].text, "Una mitad.");
  speaker.stop();
  assert.equal(await result, "interrupted");
});

test("cancela durante la petición y no reproduce la respuesta tardía", async () => {
  let deliver;
  const speaker = createSpeaker(() => ({ tts: () => new Promise((resolve) => { deliver = resolve; }) }));
  const result = speaker.speak("Una mitad.", { signal: signal() });
  speaker.stop();
  assert.equal(await result, "interrupted");
  deliver(new Blob(["audio"], { type: "audio/mpeg" }));
  await tick();
  assert.equal(utterances.length, 0);
});

test("una señal ya cancelada no reproduce voz ni llama a TTS", async () => {
  let called = false;
  const speaker = createSpeaker(() => ({ tts: async () => { called = true; return new Blob(); } }));
  const controller = new AbortController();
  controller.abort();
  assert.equal(await speaker.speak("Una mitad.", { signal: controller.signal }), "interrupted");
  assert.equal(called, false);
  assert.equal(utterances.length, 0);
});

test("informa si no hay voz disponible", async () => {
  delete globalThis.window.speechSynthesis;
  await assert.rejects(createSpeaker().speak("Una mitad.", { signal: signal() }), /subtítulos/);
});

test("solo permite una sesión de reconocimiento y libera la anterior", () => {
  const heard = [];
  const options = { onStatus() {}, onTranscript: (text) => heard.push(text) };
  const stopFirst = startRecognition(options);
  const first = FakeRecognition.instances[0];
  startRecognition(options);
  const second = FakeRecognition.instances[1];
  assert.equal(first.aborted, true);
  assert.equal(first.onend, null);
  stopFirst();
  assert.equal(second.aborted, false);
  second.result("No entendí");
  assert.deepEqual(heard, ["No entendí"]);
  // Limpiar también el último propietario.
  const stop = startRecognition(options);
  stop();
});

test("permiso denegado no reintenta ni deja la sesión activa", () => {
  const statuses = [];
  const stop = startRecognition({ onStatus: (status) => statuses.push(status), onTranscript() {} });
  const current = FakeRecognition.instances[0];
  current.onerror({ error: "not-allowed" });
  assert.equal(current.aborted, true);
  assert.equal(current.onend, null);
  assert.equal(statuses.at(-1), "denied");
  stop();
});

test("reinicia con es-MX si es-GT no está disponible y conserva la duda", async () => {
  const texts = [];
  const stop = startRecognition({ onStatus() {}, onTranscript: (text) => texts.push(text) });
  const first = FakeRecognition.instances[0];
  first.result("No entiendo");
  first.onerror({ error: "language-not-supported" });
  first.onend();
  await new Promise((resolve) => setTimeout(resolve, 300));
  const second = FakeRecognition.instances[1];
  assert.equal(second.lang, "es-MX");
  second.result("el denominador");
  assert.equal(texts.at(-1), "No entiendo el denominador");
  stop();
});

test("sin reconocimiento de voz ofrece estado no disponible", () => {
  delete globalThis.window.SpeechRecognition;
  const statuses = [];
  const stop = startRecognition({ onStatus: (status) => statuses.push(status), onTranscript() {} });
  assert.deepEqual(statuses, ["unsupported"]);
  stop();
});

test("el audio remoto termina y libera su dirección temporal", async (context) => {
  const audios = [];
  globalThis.Audio = class {
    constructor() { audios.push(this); }
    play() { this.onplaying?.(); return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute(name) { this.removed = name; }
  };
  const revoke = context.mock.method(globalThis.URL, "revokeObjectURL");
  const speaker = createSpeaker(() => ({ tts: async () => new Blob(["audio"], { type: "audio/mpeg" }) }));
  const result = speaker.speak("Una mitad.", { signal: signal() });
  await tick();
  const audio = audios[0];
  audio.onended();
  assert.equal(await result, "ok");
  assert.equal(audio.paused, true);
  assert.equal(audio.removed, "src");
  assert.equal(revoke.mock.calls.length, 1);
  assert.equal(utterances.length, 0);
});

test("stop también corta el audio remoto sin iniciar el respaldo local", async (context) => {
  const audios = [];
  globalThis.Audio = class {
    constructor() { audios.push(this); }
    play() { this.onplaying?.(); return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() {}
  };
  const revoke = context.mock.method(globalThis.URL, "revokeObjectURL");
  const speaker = createSpeaker(() => ({ tts: async () => new Blob(["audio"]) }));
  const result = speaker.speak("Una mitad.", { signal: signal() });
  await tick();
  const audio = audios[0];
  speaker.stop();
  assert.equal(await result, "interrupted");
  assert.equal(audio.paused, true);
  assert.equal(revoke.mock.calls.length, 1);
  assert.equal(utterances.length, 0);
});

test("solo selecciona voces españolas, incluso si se pide una inglesa", () => {
  const english = { lang: "en-US", voiceURI: "english" };
  const mexico = { lang: "es_MX", voiceURI: "mexico" };
  const spain = { lang: "es-ES", voiceURI: "spain" };
  assert.equal(chooseSpanishVoice([english]), undefined);
  assert.equal(chooseSpanishVoice([english, spain, mexico], "english"), mexico);
  assert.equal(chooseSpanishVoice([spain, mexico], "spain"), spain);
});

test("espera voiceschanged antes de hablar si las voces cargan tarde", async () => {
  const synthesis = globalThis.window.speechSynthesis;
  let listener;
  let available = [];
  synthesis.getVoices = () => available;
  synthesis.addEventListener = (_name, callback) => { listener = callback; };
  synthesis.removeEventListener = () => { listener = undefined; };
  const speaker = createSpeaker();
  const result = speaker.speak("Hola, vamos a sumar.", { signal: signal() });
  assert.equal(utterances.length, 0);
  available = [{ lang: "es-MX", voiceURI: "spanish" }];
  listener();
  await tick();
  assert.equal(utterances[0].voice, available[0]);
  assert.equal(listener, undefined);
  utterances[0].onend();
  assert.equal(await result, "ok");
});

test("sin español informa el problema en vez de usar una voz inglesa", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  globalThis.window.speechSynthesis.getVoices = () => [{ lang: "en-US" }];
  const result = createSpeaker().speak("Hola.", { signal: signal() });
  const checked = assert.rejects(result, /no tiene una voz en español/);
  context.mock.timers.tick(2_000);
  await checked;
  assert.equal(utterances.length, 0);
});

test("se puede detener mientras se espera que cargue una voz española", async () => {
  globalThis.window.speechSynthesis.getVoices = () => [];
  const speaker = createSpeaker();
  const result = speaker.speak("Hola.", { signal: signal() });
  speaker.stop();
  assert.equal(await result, "interrupted");
  assert.equal(utterances.length, 0);
});
