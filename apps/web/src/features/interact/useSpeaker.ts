import { useEffect, useMemo, useRef } from "react";
import { createSpeaker } from "./speaker";
import type { Speaker, SpeakerOptions } from "./types";
import { api } from "../../shared/api/client";
import { createTtsCache } from "./ttsCache";

export function useSpeaker(options: SpeakerOptions = {}): Speaker {
  const transport = options.tts ?? api.tts;
  const cachedTts = useMemo(() => createTtsCache(transport), [transport]);
  const optionsRef = useRef<SpeakerOptions>({ ...options, tts: cachedTts });
  optionsRef.current = { ...options, tts: cachedTts };
  const speakerRef = useRef<Speaker | null>(null);
  if (!speakerRef.current) speakerRef.current = createSpeaker(() => optionsRef.current);
  const speaker = speakerRef.current;
  useEffect(() => () => speaker.stop(), [speaker]);
  return speaker;
}
