import { useEffect, useRef } from "react";
import { createSpeaker } from "./speaker";
import type { Speaker, SpeakerOptions } from "./types";
import { api } from "../../shared/api/client";

export function useSpeaker(options: SpeakerOptions = {}): Speaker {
  const optionsRef = useRef<SpeakerOptions>({ ...options, tts: options.tts ?? api.tts });
  optionsRef.current = { ...options, tts: options.tts ?? api.tts };
  const speakerRef = useRef<Speaker | null>(null);
  if (!speakerRef.current) speakerRef.current = createSpeaker(() => optionsRef.current);
  const speaker = speakerRef.current;
  useEffect(() => () => speaker.stop(), [speaker]);
  return speaker;
}
