import { useEffect, useRef, useState } from "react";
import { Button, Card, ScribbleLoader } from "@/shared/ui";
import { InteractIndicators, InterruptOverlay, useInterruptTriggers, useSpeaker } from "../../features/interact";
import type { TriggerSource } from "../../features/interact";
import { useSpanishVoices } from "../../features/interact/useSpanishVoices";

const sample = "Vamos a sumar un medio más un tercio. Para sumar, necesitamos pedazos del mismo tamaño. Si te pierdes, puedes levantar la mano. Vamos a partir cada tortilla en seis pedazos iguales.";
const sources: Record<TriggerSource, string> = {
  button: "el botón", hand: "tu mano", voice: "tu voz", key: "la barra espaciadora",
};

export function InteractSandbox() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [phrase, setPhrase] = useState(sample);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const lastSentence = useRef("");
  const speechId = useRef(0);
  const { voices, voiceURI, setVoiceURI } = useSpanishVoices();
  const speaker = useSpeaker({ voiceURI, onSentence: (text) => { lastSentence.current = text; setSubtitle(text); } });
  const triggers = useInterruptTriggers({
    enabled: enabled && !open,
    onTrigger: (source) => {
      speechId.current += 1;
      speaker.stop();
      setSpeaking(false);
      setResumeAvailable(speaking && Boolean(lastSentence.current));
      setOpen(true);
      setEvents((previous) => [`Pausaste con ${sources[source]}.`, ...previous].slice(0, 6));
    },
  });

  useEffect(() => () => { speechId.current += 1; }, []);

  const speak = async (text: string) => {
    const id = ++speechId.current;
    setMessage("");
    setSpeaking(true);
    setResumeAvailable(false);
    try { await speaker.speak(text, { signal: new AbortController().signal }); }
    catch (error) {
      if (id === speechId.current) setMessage(error instanceof Error ? error.message : "No se pudo iniciar la voz.");
    } finally { if (id === speechId.current) setSpeaking(false); }
  };
  const resume = () => {
    setOpen(false);
    if (resumeAvailable && lastSentence.current) {
      const position = phrase.indexOf(lastSentence.current);
      void speak(position >= 0 ? phrase.slice(position) : lastSentence.current);
    }
  };
  const toggleTest = () => {
    setEnabled(!enabled);
    if (enabled) {
      speechId.current += 1;
      speaker.stop();
      setSpeaking(false);
      triggers.disableCamera();
      triggers.disableMic();
    }
  };

  return <main className="min-h-screen bg-paper px-4 py-8 text-ink sm:px-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-marker-blue">Prueba de interacción</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Una pizarra que te escucha</h1>
        <p className="max-w-2xl text-ink-soft">Prueba la voz y las formas de pausar. Tú eliges si activas la cámara y el micrófono.</p>
      </header>
      <Card className="space-y-5">
        <h2 className="text-xl font-bold">1. Prepara tu espacio</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={toggleTest}>{enabled ? "Terminar prueba" : "Empezar prueba"}</Button>
          <Button variant="secondary" disabled={!enabled} onClick={triggers.cameraEnabled ? triggers.disableCamera : triggers.enableCamera}>{triggers.cameraEnabled ? "Apagar cámara" : "Activar cámara"}</Button>
          <Button variant="secondary" disabled={!enabled} onClick={triggers.micEnabled ? triggers.disableMic : triggers.enableMic}>{triggers.micEnabled ? "Apagar micrófono" : "Activar micrófono"}</Button>
        </div>
        <InteractIndicators handStatus={triggers.handStatus} micStatus={triggers.micStatus} />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-paper-2">
            <video ref={triggers.videoRef} muted playsInline aria-label="Vista previa de tu mano" className="h-full w-full -scale-x-100 object-cover" />
            {!triggers.handReady && <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-ink-soft">
              {triggers.handStatus === "loading" ? <ScribbleLoader label="Preparando tu cámara…" />
                : triggers.handStatus === "denied" ? "Sin permiso de cámara. El botón de la mano sigue disponible."
                : triggers.handStatus === "error" ? "No pudimos preparar la cámara. Apágala y prueba otra vez."
                : triggers.handStatus === "unsupported" ? "La cámara no está disponible aquí. Usa el botón de la mano."
                : "Tu cámara está apagada."}
            </div>}
            {triggers.handRaised && <span className="absolute bottom-3 left-3 rounded-full bg-sticky-yellow px-3 py-1 text-sm font-semibold">Sostén tu mano…</span>}
          </div>
          <div className="space-y-3 self-center text-ink-soft">
            <p>✋ Abre la palma y mantenla arriba durante un momento.</p>
            <p>🎙️ Di «me perdí», «no entendí» o «espera».</p>
            <p>También puedes usar el botón o presionar la barra espaciadora fuera de un campo.</p>
            <p className="text-sm">La imagen de la mano se procesa en tu navegador. El reconocimiento de voz puede usar el servicio de tu navegador y necesitar conexión.</p>
          </div>
        </div>
      </Card>
      <Card className="space-y-5">
        <h2 className="text-xl font-bold">2. Escucha y haz una pausa</h2>
        <label htmlFor="spanish-voice" className="block font-semibold">Voz en español</label>
        <select id="spanish-voice" value={voiceURI} disabled={speaking || !voices.length} onChange={(event) => setVoiceURI(event.target.value)} className="w-full rounded-xl border border-line bg-paper p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marker-blue">
          <option value="">{voices.length ? "Español · selección automática" : "No hay una voz en español disponible"}</option>
          {voices.map((voice, index) => <option key={voice.voiceURI} value={voice.voiceURI}>Voz {index + 1} · {new Intl.DisplayNames(["es"], { type: "language" }).of(voice.lang.replace(/_/g, "-"))}</option>)}
        </select>
        <label htmlFor="sample-speech" className="block font-semibold">Lo que explica la pizarra</label>
        <textarea id="sample-speech" value={phrase} onChange={(event) => setPhrase(event.target.value)} rows={3} maxLength={1_000} className="w-full rounded-xl border border-line bg-paper p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marker-blue" />
        <div className="flex flex-wrap gap-3">
          <Button disabled={!enabled || !phrase.trim() || speaking} onClick={() => void speak(phrase)}>Escuchar explicación</Button>
          <Button variant="secondary" disabled={!enabled} onClick={() => triggers.trigger("button")}>✋ Me perdí</Button>
          {resumeAvailable && <Button variant="secondary" disabled={!enabled} onClick={resume}>Reanudar explicación</Button>}
          <Button variant="secondary" disabled={!speaking} onClick={() => { speechId.current += 1; speaker.stop(); setSpeaking(false); }}>Detener voz</Button>
        </div>
        <p aria-live="polite" className="min-h-16 rounded-xl bg-paper p-4 text-lg">{subtitle || "Los subtítulos de la explicación aparecerán aquí."}</p>
        {message && <p role="alert" className="text-ink-soft">{message}</p>}
      </Card>
      <Card className="space-y-3">
        <h2 className="text-xl font-bold">3. Revisa qué pasó</h2>
        <p className="break-words text-ink-soft">Última frase escuchada: {triggers.lastTranscript || "Todavía no hemos escuchado una frase."}</p>
        <div role="log" aria-live="polite">
          {events.length ? <ul className="space-y-2">{events.map((event, index) => <li key={`${index}-${event}`} className="rounded-lg bg-paper p-3">{event}</li>)}</ul>
            : <p className="text-ink-soft">Al pausar, verás aquí qué lo activó.</p>}
        </div>
      </Card>
      <InterruptOverlay open={open} listen={triggers.micEnabled} onCancel={resume} onQuestion={(question) => {
        setEvents((previous) => [`Tu duda: ${question}`, ...previous].slice(0, 6));
        setOpen(false);
        setMessage("Guardamos tu duda en esta prueba. La aclaración en la pizarra se conectará con la clase.");
      }} />
    </div>
  </main>;
}

export default InteractSandbox;
