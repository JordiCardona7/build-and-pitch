import { beginSpeech } from "./speechActivity";
import { chooseSpanishVoice, waitForSpanishVoice } from "./spanishVoices";
import type { Speaker, SpeakerOptions } from "./types";

const interrupted = () => new DOMException("La voz se detuvo.", "AbortError");

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { void promise.catch(() => {}); reject(interrupted()); return; }
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); reject(interrupted()); };
    const timer = setTimeout(() => { cleanup(); reject(new Error("La voz tardó demasiado.")); }, timeoutMs);
    signal.addEventListener("abort", abort, { once: true });
    promise.then((value) => { cleanup(); resolve(value); }, (error: unknown) => { cleanup(); reject(error); });
  });
}

async function browserSpeech(text: string, signal: AbortSignal, voiceURI?: string): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    throw new Error("No hay voz disponible. Puedes seguir con los subtítulos.");
  }
  const synthesis = window.speechSynthesis;
  const voice = chooseSpanishVoice(synthesis.getVoices(), voiceURI)
    ?? await waitForSpanishVoice(synthesis, signal, voiceURI);
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(interrupted());
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang.replace(/_/g, "-");
    utterance.rate = 1;
    const endSpeech = beginSpeech(text);
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      signal.removeEventListener("abort", abort);
      utterance.onend = null;
      utterance.onerror = null;
      endSpeech();
      if (error) reject(error); else resolve();
    };
    const abort = () => { finish(interrupted()); synthesis.cancel(); };
    // Algunos navegadores omiten onend/onerror al cancelar: nunca dependemos de eso.
    const watchdog = setTimeout(() => { finish(new Error("La voz se detuvo. Intenta reproducirla otra vez.")); synthesis.cancel(); }, 60_000);
    signal.addEventListener("abort", abort, { once: true });
    utterance.onend = () => finish();
    utterance.onerror = (event) => finish(event.error === "interrupted" || event.error === "canceled"
      ? interrupted() : new Error("No se pudo reproducir la voz. Puedes seguir con los subtítulos."));
    try { synthesis.speak(utterance); } catch { finish(new Error("No se pudo iniciar la voz.")); }
  });
}

function playAudio(blob: Blob, text: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(interrupted());
    if (!blob.size) return reject(new Error("El audio llegó vacío."));
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    let endSpeech = () => {};
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      signal.removeEventListener("abort", abort);
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      audio.pause();
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
      endSpeech();
      if (error) reject(error); else resolve();
    };
    const abort = () => finish(interrupted());
    const watchdog = setTimeout(() => finish(new Error("No se pudo terminar el audio.")), 60_000);
    signal.addEventListener("abort", abort, { once: true });
    audio.onplaying = () => { endSpeech(); endSpeech = beginSpeech(text); };
    audio.onended = () => finish();
    audio.onerror = () => finish(new Error("No se pudo abrir el audio."));
    audio.play().catch(() => finish(new Error("No se pudo iniciar el audio.")));
  });
}

export function createSpeaker(getOptions: () => SpeakerOptions = () => ({})): Speaker {
  let active: AbortController | undefined;
  const stop = () => { active?.abort(); active = undefined; };
  return {
    stop,
    async speak(text, { signal }) {
      stop();
      if (signal.aborted) return "interrupted";
      const controller = new AbortController();
      active = controller;
      const abort = () => controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      try {
        for (const sentence of splitSentences(text)) {
          if (controller.signal.aborted) return "interrupted";
          const options = getOptions();
          options.onSentence?.(sentence);
          if (options.tts) {
            try {
              const blob = await abortable(options.tts(sentence), controller.signal, options.ttsTimeoutMs ?? 3_000);
              await playAudio(blob, sentence, controller.signal);
              continue;
            } catch {
              if (controller.signal.aborted) return "interrupted";
              // 501, caída de red o reproducción fallida → voz local, misma oración.
            }
          }
          await browserSpeech(sentence, controller.signal, options.voiceURI);
        }
        return controller.signal.aborted ? "interrupted" : "ok";
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) return "interrupted";
        throw error;
      } finally {
        signal.removeEventListener("abort", abort);
        if (active === controller) active = undefined;
      }
    },
  };
}
