import { useEffect, useState } from "react";
import { Button, Card } from "../../shared/ui";
import { createDemoRecorder, type RecordingSnapshot } from "./recorderEngine";

export function DemoRecorder() {
  const [snapshot, setSnapshot] = useState<RecordingSnapshot>({ status: "ready" });
  const [microphone, setMicrophone] = useState(false);
  const [recorder, setRecorder] = useState<ReturnType<typeof createDemoRecorder> | null>(null);
  useEffect(() => {
    const instance = createDemoRecorder(setSnapshot);
    setRecorder(instance);
    return () => instance.dispose();
  }, []);
  const active = snapshot.status === "recording" || snapshot.status === "choosing";
  return <Card className="space-y-4">
    <h2 className="text-xl font-bold">Video de respaldo de la demo</h2>
    <ol className="list-inside list-decimal space-y-2 text-ink-soft">
      <li>Abre la demo en otra pestaña y deja esta abierta.</li>
      <li>Pulsa «Grabar respaldo», elige la pestaña de la demo y activa compartir audio.</li>
      <li>Haz el recorrido, vuelve aquí y detén la grabación para descargarla.</li>
    </ol>
    <label className="flex items-center gap-2"><input type="checkbox" checked={microphone} disabled={active} onChange={(event) => setMicrophone(event.target.checked)} />Incluir también mi micrófono</label>
    <div className="flex flex-wrap gap-3">
      <Button disabled={active || !recorder} onClick={() => void recorder?.start(microphone)}>Grabar respaldo</Button>
      <Button variant="secondary" disabled={!active} onClick={() => recorder?.stop()}>{snapshot.status === "choosing" ? "Cancelar selección" : "Detener grabación"}</Button>
      {snapshot.url && <a href={snapshot.url} download={`demo-fracciones.${snapshot.mimeType?.includes("mp4") ? "mp4" : "webm"}`} className="inline-flex items-center rounded-full bg-marker-blue px-5 py-3 font-semibold text-white">Descargar video</a>}
    </div>
    <p role={snapshot.status === "error" ? "alert" : "status"}>{snapshot.status === "choosing" ? "Elige qué pestaña quieres grabar en la ventana del navegador." : snapshot.message}</p>
    <p className="text-sm text-ink-soft">Hasta 4 minutos. El video se queda en tu equipo; no se sube a ningún servidor.</p>
    {snapshot.url && <video controls src={snapshot.url} className="aspect-video w-full rounded-xl bg-paper-2" aria-label="Vista previa del video de respaldo" />}
  </Card>;
}
