import type { InputStatus } from "./types";

type RecognitionResult = { isFinal: boolean; readonly length: number; [index: number]: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  abort(): void;
};
type RecognitionConstructor = new () => Recognition;

export function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition;
}

type SessionOptions = {
  onTranscript(text: string, latest: string, isFinal: boolean): void;
  onStatus(status: InputStatus): void;
  onSpeechEnd?: () => void;
  onUnavailable?: () => void;
};

let stopPrevious: (() => void) | undefined;

/** Una sola escucha a la vez: las frases ceden el micrófono a la duda. */
export function startRecognition(options: SessionOptions): () => void {
  stopPrevious?.();
  const Constructor = getRecognitionConstructor();
  if (!Constructor) {
    options.onStatus("unsupported");
    options.onUnavailable?.();
    return () => {};
  }

  let stopped = false;
  let failures = 0;
  let locale = "es-GT";
  let committed = "";
  let recognition: Recognition | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    stopped = true;
    clearTimeout(retry);
    if (recognition) {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.onspeechend = null;
      try { recognition.abort(); } catch { /* Ya estaba detenida. */ }
    }
    if (stopPrevious === stop) stopPrevious = undefined;
  };
  stopPrevious = stop;

  const unavailable = (status: InputStatus) => {
    stop();
    options.onStatus(status);
    options.onUnavailable?.();
  };

  const launch = () => {
    if (stopped) return;
    const current = new Constructor();
    recognition = current;
    current.lang = locale;
    current.continuous = true;
    current.interimResults = true;
    let hadResult = false;
    let silent = false;
    let sessionText = "";
    const startedAt = Date.now();
    options.onStatus("loading");
    current.onstart = () => { if (!stopped) options.onStatus("active"); };
    current.onresult = (event) => {
      if (stopped) return;
      hadResult = true;
      failures = 0;
      const results = Array.from(event.results);
      const text = results.map((result) => result[0]?.transcript ?? "").join(" ").trim();
      const latest = results.slice(event.resultIndex).map((result) => result[0]?.transcript ?? "").join(" ").trim();
      sessionText = text;
      options.onTranscript([committed, text].filter(Boolean).join(" "), latest, results.slice(event.resultIndex).every((result) => result.isFinal));
    };
    current.onspeechend = () => { if (!stopped) options.onSpeechEnd?.(); };
    current.onerror = ({ error }) => {
      if (stopped) return;
      if (error === "not-allowed" || error === "service-not-allowed") return unavailable("denied");
      if (error === "audio-capture") return unavailable("error");
      if (error === "no-speech") silent = true;
      if (error === "language-not-supported") {
        if (locale === "es-MX") return unavailable("unsupported");
        locale = "es-MX";
      } else if (error !== "no-speech" && ++failures >= 4) {
        return unavailable("error");
      }
      options.onStatus("loading");
    };
    current.onend = () => {
      if (stopped) return;
      committed = [committed, sessionText].filter(Boolean).join(" ").slice(-6_000);
      // El silencio normal no es un fallo. Sí limitamos desconexiones inmediatas.
      if (!hadResult && !silent && Date.now() - startedAt < 1_000) failures += 1;
      if (failures >= 5) return unavailable("error");
      options.onStatus("loading");
      retry = setTimeout(launch, Math.min(250 * 2 ** failures, 4_000));
    };
    try { current.start(); } catch { unavailable("error"); }
  };
  launch();
  return stop;
}
