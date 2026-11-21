import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createDemoRecorder } from "../recorderEngine.ts";
const { Blob } = globalThis;
class Track {
  constructor(kind) { this.kind = kind; this.stopped = 0; this.listeners = new Map(); }
  stop() { this.stopped++; }
  addEventListener(event, listener) { this.listeners.set(event, listener); }
}
class Stream {
  constructor(tracks = []) { this.tracks = tracks; }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter(track => track.kind === "audio"); }
  getVideoTracks() { return this.tracks.filter(track => track.kind === "video"); }
}
class Recorder {
  static instances = [];
  static isTypeSupported(type) { return type === "video/webm"; }
  constructor(stream, options) { this.stream = stream; this.mimeType = options.mimeType; this.state = "inactive"; Recorder.instances.push(this); }
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["video"]) }); this.onstop?.(); }
}
let display;
let changes;
let devices;
beforeEach(() => {
  changes = [];
  display = new Stream([new Track("video"), new Track("audio")]);
  devices = { getDisplayMedia: async () => display, getUserMedia: async () => new Stream([new Track("audio")]) };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: devices } });
  globalThis.MediaRecorder = Recorder;
  globalThis.MediaStream = Stream;
  Recorder.instances = [];
});
const make = () => createDemoRecorder(value => changes.push(value));

test("graba, detiene y crea un archivo con audio; salir revoca su dirección", async (context) => {
  const revoke = context.mock.method(globalThis.URL, "revokeObjectURL");
  const recorder = make();
  await recorder.start();
  assert.equal(changes.at(-1).status, "recording");
  recorder.stop();
  assert.equal(changes.at(-1).status, "done");
  assert.equal(changes.at(-1).hasAudio, true);
  assert.ok(changes.at(-1).url);
  assert.ok(display.getTracks().every(track => track.stopped >= 1));
  recorder.dispose();
  assert.equal(revoke.mock.calls.length, 1);
});
test("informa si la pantalla no aporta audio", async () => {
  display = new Stream([new Track("video")]);
  const recorder = make();
  await recorder.start();
  assert.equal(changes.at(-1).hasAudio, false);
  recorder.stop();
  assert.match(changes.at(-1).message, /no tiene audio/);
  recorder.dispose();
});
test("un permiso denegado vuelve a un estado recuperable", async () => {
  devices.getDisplayMedia = async () => { throw new Error("Denied"); };
  const recorder = make();
  await recorder.start();
  assert.equal(changes.at(-1).status, "error");
  devices.getDisplayMedia = async () => display;
  await recorder.start();
  assert.equal(changes.at(-1).status, "recording");
  recorder.dispose();
});
test("cancelar la selección cierra los tracks que lleguen tarde", async () => {
  let deliver;
  devices.getDisplayMedia = () => new Promise(resolve => { deliver = resolve; });
  const recorder = make();
  const start = recorder.start();
  recorder.stop();
  deliver(display);
  await start;
  assert.equal(changes.at(-1).status, "ready");
  assert.ok(display.getTracks().every(track => track.stopped >= 1));
  assert.equal(Recorder.instances.length, 0);
});
test("salir durante la selección no inicia una grabación después", async () => {
  let deliver;
  devices.getDisplayMedia = () => new Promise(resolve => { deliver = resolve; });
  const recorder = make();
  const start = recorder.start();
  recorder.dispose();
  const count = changes.length;
  deliver(display);
  await start;
  assert.equal(changes.length, count);
  assert.ok(display.getTracks().every(track => track.stopped >= 1));
});
test("terminar compartir pantalla también termina la grabación", async () => {
  const recorder = make();
  await recorder.start();
  display.getVideoTracks()[0].listeners.get("ended")();
  assert.equal(changes.at(-1).status, "done");
  recorder.dispose();
});
test("errores del grabador limpian los dispositivos", async () => {
  const recorder = make();
  await recorder.start();
  Recorder.instances[0].onerror();
  assert.equal(changes.at(-1).status, "error");
  assert.ok(display.getTracks().every(track => track.stopped >= 1));
  recorder.dispose();
});
test("se detiene automáticamente a los cuatro minutos", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const recorder = make();
  await recorder.start();
  context.mock.timers.tick(240_000);
  assert.equal(changes.at(-1).status, "done");
  recorder.dispose();
});
test("negar el micrófono conserva el video y el audio compartido", async () => {
  devices.getUserMedia = async () => { throw new Error("Denied"); };
  const recorder = make();
  await recorder.start(true);
  assert.equal(changes.at(-1).status, "recording");
  assert.match(changes.at(-1).message, /No pudimos agregar el micrófono/);
  recorder.dispose();
});
test("mezcla micrófono y pestaña en una pista y cierra ambos al salir", async () => {
  const mic = new Stream([new Track("audio")]);
  devices.getUserMedia = async () => mic;
  let closed = 0;
  globalThis.AudioContext = class {
    createMediaStreamDestination() { return { stream: new Stream([new Track("audio")]) }; }
    createMediaStreamSource() { return { connect() {} }; }
    resume() { return Promise.resolve(); }
    close() { closed++; return Promise.resolve(); }
  };
  const recorder = make();
  await recorder.start(true);
  assert.equal(Recorder.instances[0].stream.getAudioTracks().length, 1);
  recorder.dispose();
  assert.equal(closed, 1);
  assert.ok(mic.getTracks().every(track => track.stopped >= 1));
});
test("una pestaña anterior no detiene la grabación nueva con un evento tardío", async () => {
  const recorder = make();
  await recorder.start();
  const oldEnd = display.getVideoTracks()[0].listeners.get("ended");
  recorder.stop();
  display = new Stream([new Track("video")]);
  await recorder.start();
  oldEnd();
  assert.equal(changes.at(-1).status, "recording");
  recorder.dispose();
});
