import { useCallback, useEffect, useRef, useState } from "react";
import { startRecognition } from "./recognition";
import type { InputStatus } from "./types";

export function useQuestionCapture() {
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<InputStatus>("off");
  const cancelRef = useRef<() => void>(() => {});
  const cancel = useCallback(() => { cancelRef.current(); }, []);

  const start = useCallback((): Promise<string> => {
    cancelRef.current();
    setTranscript("");
    return new Promise((resolve) => {
      let latest = "";
      let finished = false;
      let stop: (() => void) | undefined = undefined;
      let silence: ReturnType<typeof setTimeout> | undefined;
      const finish = (result: string, keepStatus = false) => {
        if (finished) return;
        finished = true;
        clearTimeout(silence);
        clearTimeout(hardLimit);
        stop?.();
        if (!keepStatus) setStatus("off");
        resolve(result);
      };
      const armSilence = () => {
        clearTimeout(silence);
        silence = setTimeout(() => finish(latest), 1_200);
      };
      cancelRef.current = () => finish("");
      silence = setTimeout(() => finish(""), 10_000);
      const hardLimit = setTimeout(() => finish(latest), 45_000);
      stop = startRecognition({
        onStatus: setStatus,
        onUnavailable: () => finish(latest, true),
        onSpeechEnd: () => { if (latest) armSilence(); },
        onTranscript: (text) => {
          const bounded = text.slice(0, 600);
          if (finished || bounded === latest) return;
          latest = bounded;
          setTranscript(bounded);
          armSilence();
        },
      });
      if (finished) stop();
    });
  }, []);
  useEffect(() => () => cancelRef.current(), []);
  return { start, cancel, transcript, status };
}
