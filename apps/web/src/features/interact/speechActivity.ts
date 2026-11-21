import { isSpeechEcho } from "./phrases";

// También recuerda el final de la oración: el reconocimiento suele llegar tarde.
const recent: { text: string; until: number }[] = [];

export function beginSpeech(text: string): () => void {
  const entry = { text, until: Infinity };
  recent.push(entry);
  if (recent.length > 8) recent.shift();
  return () => { entry.until = Date.now() + 1_200; };
}

export function isRecentSpeechEcho(transcript: string): boolean {
  const now = Date.now();
  return recent.some((entry) => entry.until >= now && isSpeechEcho(transcript, entry.text));
}
