import { useCallback, useEffect, useRef, useState } from "react";
import { findInterruptPhrase } from "./phrases";
import { getRecognitionConstructor, startRecognition } from "./recognition";
import { isRecentSpeechEcho } from "./speechActivity";
import { useHandRaise } from "./useHandRaise";
import type { InputStatus, TriggerSource } from "./types";

export type InterruptTriggerOptions = {
  enabled: boolean;
  onTrigger(source: TriggerSource): void;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, button, a, [contenteditable]:not([contenteditable='false']), [role='button'], [role='textbox'], [role='dialog']"));
}

export function useInterruptTriggers(options: InterruptTriggerOptions) {
  const latest = useRef(options);
  latest.current = options;
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micStatus, setMicStatus] = useState<InputStatus>("off");
  const [lastTranscript, setLastTranscript] = useState("");
  const stopRecognition = useRef<() => void>(() => {});
  const lastTriggerAt = useRef(-Infinity);
  const trigger = useCallback((source: TriggerSource = "button") => {
    const now = performance.now();
    if (!latest.current.enabled || now - lastTriggerAt.current < 800) return;
    lastTriggerAt.current = now;
    stopRecognition.current();
    setMicStatus("off");
    latest.current.onTrigger(source);
  }, []);
  const hand = useHandRaise({ cameraEnabled, enabled: options.enabled, onRaise: () => trigger("hand") });

  useEffect(() => {
    if (!options.enabled || !micEnabled) { setMicStatus("off"); return; }
    if (!window.isSecureContext || !getRecognitionConstructor()) { setMicStatus("unsupported"); return; }
    const stop = startRecognition({
      onStatus: setMicStatus,
      onTranscript: (_text, latestText, isFinal) => {
        setLastTranscript(latestText);
        const phrase = findInterruptPhrase(latestText, isFinal);
        if (phrase && !isRecentSpeechEcho(phrase)) trigger("voice");
      },
    });
    stopRecognition.current = stop;
    return stop;
  }, [options.enabled, micEnabled, trigger]);

  useEffect(() => {
    if (!options.enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || isInteractiveTarget(event.target)) return;
      event.preventDefault();
      trigger("key");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options.enabled, trigger]);

  return {
    handReady: hand.status === "active", micReady: micStatus === "active", lastTranscript,
    handStatus: hand.status, micStatus, videoRef: hand.videoRef, handRaised: hand.raised,
    cameraEnabled, micEnabled, trigger,
    enableCamera: () => setCameraEnabled(true), disableCamera: () => setCameraEnabled(false),
    enableMic: () => setMicEnabled(true), disableMic: () => { stopRecognition.current(); setMicEnabled(false); },
  };
}
