export function normalizeSpeech(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
}

const phrases = ["no entendi", "no entiendo", "no le entiendo", "me perdi"];

export function findInterruptPhrase(text: string, isFinal = true): string | null {
  const normalized = normalizeSpeech(text);
  const padded = ` ${normalized} `;
  const phrase = phrases.find((candidate) => padded.includes(` ${candidate} `));
  if (phrase) return phrase;
  const request = normalized.match(/^(?:(?:puedes|podrias|por favor) )?(otra vez|repite)(?: |$)/);
  if (request) return request[1] ?? null;
  // «Para sumar» y «cómo se suman» son conversación normal, no órdenes.
  // Esperamos al resultado final: un «para» provisional puede acabar en «para sumar».
  if (!isFinal) return null;
  const command = normalized.match(/^(?:(?:por favor|un momento) )?(espera|para|como|por que)(?: un momento)?(?: por favor)?$/);
  return command?.[1] ?? null;
}

export function isSpeechEcho(transcript: string, sentence: string): boolean {
  const heard = normalizeSpeech(transcript);
  const spoken = normalizeSpeech(sentence);
  return Boolean(heard && spoken && (` ${spoken} `.includes(` ${heard} `) || ` ${heard} `.includes(` ${spoken} `)));
}
