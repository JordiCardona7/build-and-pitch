import { useEffect, useRef, useState } from "react";
import type { GestureRecognizer } from "@mediapipe/tasks-vision";
import { GestureGate } from "./gestureGate";
import { isHandRaised } from "./handPose";
import type { InputStatus } from "./types";

const DEFAULT_MODEL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";
const DEFAULT_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

type ModelPaths = { modelAssetPath?: string; wasmBasePath?: string };

let sharedRecognizer: Promise<GestureRecognizer> | null = null;
let sharedKey = "";

function recognizerKey(modelAssetPath: string, wasmBasePath: string): string {
  return `${wasmBasePath} ${modelAssetPath}`;
}

/** Descarga WASM y el modelo antes de pedir la cámara, para que el primer gesto no espere la red. */
export function preloadHandModel(paths: ModelPaths = {}): Promise<void> {
  const modelAssetPath = paths.modelAssetPath ?? DEFAULT_MODEL;
  const wasmBasePath = paths.wasmBasePath ?? DEFAULT_WASM;
  return ensureRecognizer(modelAssetPath, wasmBasePath).then(() => undefined);
}

function ensureRecognizer(modelAssetPath: string, wasmBasePath: string): Promise<GestureRecognizer> {
  const key = recognizerKey(modelAssetPath, wasmBasePath);
  if (!sharedRecognizer || sharedKey !== key) {
    sharedKey = key;
    sharedRecognizer = createRecognizer(modelAssetPath, wasmBasePath).catch((error: unknown) => {
      if (sharedKey === key) sharedRecognizer = null;
      throw error;
    });
  }
  return sharedRecognizer;
}

async function createRecognizer(modelAssetPath: string, wasmBasePath: string): Promise<GestureRecognizer> {
  const { FilesetResolver, GestureRecognizer: Recognizer } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(wasmBasePath);
  const create = (delegate: "GPU" | "CPU") => Recognizer.createFromOptions(vision, {
    baseOptions: { modelAssetPath, delegate },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  try {
    return await create("GPU");
  } catch {
    return await create("CPU");
  }
}

export type HandOptions = {
  cameraEnabled: boolean;
  enabled: boolean;
  onRaise(): void;
  modelAssetPath?: string;
  wasmBasePath?: string;
};

export function useHandRaise(options: HandOptions) {
  const { cameraEnabled, modelAssetPath = DEFAULT_MODEL, wasmBasePath = DEFAULT_WASM } = options;
  const current = useRef(options);
  current.current = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<InputStatus>("off");
  const [raised, setRaised] = useState(false);
  const gate = useRef(new GestureGate());

  useEffect(() => {
    if (!cameraEnabled) { setStatus("off"); setRaised(false); return; }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    let disposed = false;
    let stream: MediaStream | undefined;
    let recognizer: GestureRecognizer | undefined;
    let frame = 0;
    let previousVideoTime = -1;
    let previousFrameAt = -Infinity;
    const video = videoRef.current;
    const stop = () => {
      clearTimeout(loadingTimer);
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      recognizer = undefined;
      if (video) video.srcObject = null;
      gate.current.resetHold();
    };
    const fail = (error: unknown) => {
      if (!disposed) {
        setStatus(error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError") ? "denied" : "error");
        setRaised(false);
      }
      disposed = true;
      stop();
    };
    const process = (now: number) => {
      if (disposed) return;
      try {
        if (!current.current.enabled || document.hidden) {
          gate.current.resetHold();
          setRaised((value) => value ? false : value);
        } else if (video && recognizer && video.readyState >= 2 && video.currentTime !== previousVideoTime && now - previousFrameAt >= 65) {
          previousVideoTime = video.currentTime;
          previousFrameAt = now;
          const result = recognizer.recognizeForVideo(video, now);
          const gesture = result.gestures[0]?.[0];
          const landmarks = result.landmarks[0];
          const isRaised = isHandRaised(gesture, landmarks);
          setRaised((value) => value === isRaised ? value : isRaised);
          if (gate.current.update(isRaised, now)) current.current.onRaise();
        }
        frame = requestAnimationFrame(process);
      } catch (error) { fail(error); }
    };
    setStatus("loading");
    const loadingTimer = setTimeout(() => fail(new Error("La cámara tardó demasiado.")), 12_000);
    void (async () => {
      try {
        const acquired = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 } } });
        if (disposed) { acquired.getTracks().forEach((track) => track.stop()); return; }
        stream = acquired;
        if (!video) throw new Error("No se encontró la vista de cámara.");
        video.srcObject = stream;
        await video.play();
        if (disposed) return;
        const loaded = await ensureRecognizer(modelAssetPath, wasmBasePath);
        if (disposed) return;
        recognizer = loaded;
        clearTimeout(loadingTimer);
        stream.getVideoTracks().forEach((track) => track.addEventListener("ended", () => {
          if (!disposed) fail(new Error("La cámara se desconectó."));
        }, { once: true }));
        setStatus("active");
        frame = requestAnimationFrame(process);
      } catch (error) { fail(error); }
    })();
    return () => { disposed = true; stop(); };
  }, [cameraEnabled, modelAssetPath, wasmBasePath]);

  return { videoRef, status, raised };
}
