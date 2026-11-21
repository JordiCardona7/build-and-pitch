const preferredLanguages = ["es-gt", "es-mx", "es-us", "es-419", "es-co", "es-ar", "es-es"];

export function spanishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const rank = (voice: SpeechSynthesisVoice) => {
    const index = preferredLanguages.indexOf(voice.lang.toLowerCase().replace(/_/g, "-"));
    return index < 0 ? preferredLanguages.length : index;
  };
  return voices.filter((voice) => /^es(?:[-_]|$)/i.test(voice.lang))
    .sort((a, b) => rank(a) - rank(b));
}

export function chooseSpanishVoice(voices: SpeechSynthesisVoice[], voiceURI?: string): SpeechSynthesisVoice | undefined {
  const available = spanishVoices(voices);
  return available.find((voice) => voiceURI && voice.voiceURI === voiceURI) ?? available[0];
}

/** La lista puede estar vacía al inicio; no dejamos que se use la voz predeterminada. */
export function waitForSpanishVoice(synthesis: SpeechSynthesis, signal: AbortSignal, voiceURI?: string): Promise<SpeechSynthesisVoice> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("La voz se detuvo.", "AbortError")); return; }
    const cleanup = () => {
      clearTimeout(deadline);
      clearInterval(poll);
      synthesis.removeEventListener?.("voiceschanged", check);
      signal.removeEventListener("abort", abort);
    };
    const check = () => {
      const voice = chooseSpanishVoice(synthesis.getVoices(), voiceURI);
      if (voice) { cleanup(); resolve(voice); }
    };
    const abort = () => { cleanup(); reject(new DOMException("La voz se detuvo.", "AbortError")); };
    const deadline = setTimeout(() => {
      cleanup();
      reject(new Error("Este navegador no tiene una voz en español disponible. Puedes seguir con los subtítulos mientras conectamos la voz de la clase."));
    }, 2_000);
    const poll = setInterval(check, 100);
    synthesis.addEventListener?.("voiceschanged", check);
    signal.addEventListener("abort", abort, { once: true });
    check();
  });
}
