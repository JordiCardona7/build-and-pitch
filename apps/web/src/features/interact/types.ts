/** Contrato público P2 ↔ P4, docs/CONTRACTS.md §4. */
export type Speaker = {
  speak(text: string, opts: { signal: AbortSignal }): Promise<"ok" | "interrupted">;
  stop(): void;
};

export type TriggerSource = "button" | "hand" | "voice" | "key";
export type InputStatus = "off" | "loading" | "active" | "denied" | "unsupported" | "error";

/** Si no pasas `tts`, `useSpeaker` usa `api.tts` y, si falla, la voz del navegador. */
export type SpeakerOptions = {
  tts?: (text: string) => Promise<Blob>;
  onSentence?: (sentence: string) => void;
  ttsTimeoutMs?: number;
  voiceURI?: string;
};
