export type RecordingSnapshot = {
  status: "ready" | "choosing" | "recording" | "done" | "error";
  url?: string; mimeType?: string; hasAudio?: boolean; message?: string;
};
type Session = { streams: MediaStream[]; recorder?: MediaRecorder; context?: AudioContext; timer?: ReturnType<typeof setTimeout> };

/** Grabación local: ningún contenido capturado se envía a un servidor. */
export function createDemoRecorder(onChange: (snapshot: RecordingSnapshot) => void) {
  let active: Session | undefined;
  let disposed = false;
  let previousUrl: string | undefined;
  const release = (session: Session) => {
    clearTimeout(session.timer);
    new Set(session.streams.flatMap((stream) => stream.getTracks())).forEach((track) => track.stop());
    void session.context?.close().catch(() => {});
  };
  const stop = () => {
    const session = active;
    if (!session) return;
    if (session.recorder?.state === "recording") session.recorder.stop();
    else if (!session.recorder) {
      active = undefined; release(session);
      if (!disposed) onChange({ status: "ready" });
    }
  };
  return {
    stop,
    async start(microphone = false) {
      if (disposed || active) return;
      if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
        onChange({ status: "error", message: "Este navegador no permite grabar pantalla. Usa el grabador de pantalla de tu equipo." }); return;
      }
      if (previousUrl) { URL.revokeObjectURL(previousUrl); previousUrl = undefined; }
      const session: Session = { streams: [] };
      active = session;
      onChange({ status: "choosing" });
      const stillActive = () => !disposed && active === session;
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 24 }, audio: true });
        session.streams.push(display);
        if (!stillActive()) { release(session); return; }
        let output = display;
        let message = "";
        if (microphone) {
          try {
            const mic = await navigator.mediaDevices.getUserMedia({ video: false, audio: { echoCancellation: true } });
            session.streams.push(mic);
            if (!stillActive()) { release(session); return; }
            const context = new AudioContext();
            session.context = context;
            const destination = context.createMediaStreamDestination();
            if (display.getAudioTracks().length) context.createMediaStreamSource(display).connect(destination);
            context.createMediaStreamSource(mic).connect(destination);
            await context.resume();
            output = new MediaStream([...display.getVideoTracks(), ...destination.stream.getAudioTracks()]);
            session.streams.push(output);
          } catch {
            if (!stillActive()) { release(session); return; }
            session.streams.filter((stream) => stream !== display).forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
            session.streams = [display];
            void session.context?.close().catch(() => {});
            session.context = undefined;
            message = "No pudimos agregar el micrófono; conservamos la pantalla y el audio que compartiste.";
          }
        }
        if (!stillActive()) { release(session); return; }
        const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(output, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 2_000_000 });
        session.recorder = recorder;
        const chunks: Blob[] = [];
        let bytes = 0;
        const hasAudio = output.getAudioTracks().length > 0;
        recorder.ondataavailable = ({ data }) => {
          if (!stillActive()) return;
          if (data.size) { chunks.push(data); bytes += data.size; }
          if (bytes >= 64 * 1024 * 1024) stop();
        };
        recorder.onstop = () => {
          if (!stillActive()) { release(session); return; }
          active = undefined; release(session);
          if (!chunks.length) { onChange({ status: "error", message: "La grabación quedó vacía. Inténtalo otra vez." }); return; }
          const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" });
          previousUrl = URL.createObjectURL(blob);
          onChange({ status: "done", url: previousUrl, mimeType: blob.type, hasAudio, message: hasAudio ? "Tu video está listo para descargar." : "El video no tiene audio. Para grabar la voz, comparte también el audio de la pestaña." });
        };
        recorder.onerror = () => {
          if (!stillActive()) return;
          active = undefined; recorder.onstop = null;
          if (recorder.state !== "inactive") recorder.stop();
          release(session);
          onChange({ status: "error", message: "La grabación se interrumpió. Inténtalo otra vez." });
        };
        display.getVideoTracks().forEach((track) => track.addEventListener("ended", () => { if (stillActive()) stop(); }, { once: true }));
        recorder.start(1_000);
        session.timer = setTimeout(stop, 4 * 60_000);
        onChange({ status: "recording", hasAudio, message: message || (hasAudio ? "Grabando pantalla y audio." : "Grabando sin audio. Para incluir la voz, comparte el audio de la pestaña.") });
      } catch {
        const wasActive = stillActive();
        if (wasActive) active = undefined;
        release(session);
        if (wasActive) onChange({ status: "error", message: "No se inició la grabación. Elige la pestaña de la demo y permite compartirla." });
      }
    },
    dispose() {
      disposed = true;
      const session = active;
      active = undefined;
      if (session) {
        if (session.recorder) {
          session.recorder.onstop = null; session.recorder.ondataavailable = null; session.recorder.onerror = null;
          if (session.recorder.state !== "inactive") session.recorder.stop();
        }
        release(session);
      }
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      previousUrl = undefined;
    },
  };
}
