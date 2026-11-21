import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LessonPlayer, silentSpeaker } from "@/features/board";
import { api, useDiagnosisPolling, type Diagnosis, type Exercise } from "@/shared/api";
import { Button, CameraCapture, EmptyState, PhotoCard, ScribbleLoader, StickyNote } from "@/shared/ui";
import { celebrate } from "../celebrate";
import { friendlyError } from "../message";
import { loadSession, saveSession, type SoloSession } from "../session";
import { problemLesson } from "../sketches";
import { confirmedGreen, nextPracticeSession } from "../practice";

type Phase = "loading" | "solving" | "capture" | "reviewing" | "correct" | "wrong" | "review" | "error";

export function StudentProblem() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SoloSession | null>(() => loadSession());
  const [phase, setPhase] = useState<Phase>("loading");
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [green, setGreen] = useState(false);
  const [round, setRound] = useState(0);
  const settled = useRef<string | null>(null);
  const generation = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const diagnosis = useDiagnosisPolling(phase === "reviewing" ? diagnosisId : null);
  const sketch = useMemo(() => exercise ? problemLesson(exercise) : null, [exercise]);

  useEffect(() => {
    const current = sessionRef.current;
    if (!current) return;
    let cancel = false;
    generation.current += 1;
    setPhase("loading");
    setResult(null);
    setDiagnosisId(null);
    setGreen(false);
    setError("");
    const request = current.targetError
      ? api.newProblem(current.id, { target_error: current.targetError })
      : api.newProblem(current.id, { difficulty: current.difficulty });
    request
      .then((next) => {
        if (cancel) return;
        setExercise(next);
        setPhase("solving");
      })
      .catch((cause: unknown) => {
        if (cancel) return;
        setError(friendlyError(cause, "No pude armar un problema. Probemos otra vez."));
        setPhase("error");
      });
    return () => {
      cancel = true;
      generation.current += 1;
    };
  }, [session?.id, round]);

  useEffect(() => {
    const data = diagnosis.data;
    const current = sessionRef.current;
    if (!data || data.id !== diagnosisId || data.status === "pending" || !current) return;
    if (settled.current === data.id) return;
    settled.current = data.id;
    if (data.status === "failed") {
      setError(data.feedback || "No pude leer bien la hoja. Prueba con otra foto, con buena luz.");
      setPhase("capture");
      return;
    }
    setResult(data);
    if (data.status === "needs_review") {
      setPhase("review");
      return;
    }
    if (data.correct) {
      const next = nextPracticeSession(current, data);
      saveSession(next);
      setSession(next);
      setPhase("correct");
      celebrate();
      const token = generation.current;
      void api.getStudent(current.id).then((summary) => {
        if (token === generation.current && settled.current === data.id && confirmedGreen(next, summary.status)) setGreen(true);
      }).catch(() => { /* Solo el servidor puede confirmar el semáforo. */ });
      return;
    }
    const next = nextPracticeSession(current, data);
    saveSession(next);
    setSession(next);
    setPhase("wrong");
  }, [diagnosis.data, diagnosisId]);

  useEffect(() => {
    if (phase !== "reviewing") return;
    const timeout = setTimeout(() => {
      setError("La revisión está tardando. Puedes intentar otra foto con buena luz.");
      setPhase("capture");
    }, 45_000);
    return () => clearTimeout(timeout);
  }, [phase, diagnosisId]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Primero dime tu nombre"
          description="Así guardo tus estrellas y lo que vas practicando."
          action={<Link to="/alumno" className="font-semibold text-marker-blue">Volver al inicio</Link>}
        />
      </main>
    );
  }

  const upload = async (files: File[]) => {
    const file = files[0];
    if (!file || !exercise) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setError("Elige una foto de tu hoja de hasta 8 MB.");
      return;
    }
    setError("");
    setDiagnosisId(null);
    setPreviewUrl(URL.createObjectURL(file));
    setPhase("reviewing");
    try {
      const pending = await api.uploadProblemSheet(session.id, exercise.id, file);
      settled.current = null;
      setDiagnosisId(pending.id);
    } catch (cause) {
      setError(friendlyError(cause, "No pude subir la foto. Probemos otra vez."));
      setPhase("capture");
    }
  };

  const another = () => setRound((value) => value + 1);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-marker-blue">Ponme un problema</p>
          <h1 className="font-display text-3xl font-extrabold">Resuélvelo en tu hoja</h1>
        </div>
        <Link to="/alumno" className="text-sm font-semibold text-ink-soft hover:text-ink">Inicio</Link>
      </header>

      {phase === "loading" ? <ScribbleLoader label="Escribiendo tu problema…" /> : null}
      {phase === "error" ? (
        <EmptyState
          title="Algo se trabó"
          description={error}
          action={<Button onClick={another}>Probar otra vez</Button>}
        />
      ) : null}

      {exercise && phase !== "loading" && phase !== "error" ? (
        <LessonPlayer lesson={sketch} speak={silentSpeaker} autoPlay controls={false} />
      ) : null}

      {phase === "solving" ? (
        <Button size="lg" onClick={() => setPhase("capture")}>Ya lo resolví</Button>
      ) : null}

      {phase === "capture" ? (
        <div className="space-y-3">
          {error ? <p role="alert" className="text-ink-soft">{error}</p> : null}
          <CameraCapture multiple={false} label="Tomar foto de mi hoja" onFiles={(files) => void upload(files)} />
        </div>
      ) : null}

      {phase === "reviewing" ? (
        <div className="space-y-4">
          <ScribbleLoader label="Revisando tu hoja…" />
          {diagnosis.isError ? (
            <EmptyState
              title="No pude revisar la hoja"
              description={friendlyError(diagnosis.error, "Algo se trabó. Probemos otra vez.")}
              action={<Button onClick={() => setPhase("capture")}>Subir otra foto</Button>}
            />
          ) : null}
        </div>
      ) : null}

      {phase === "correct" && result ? (
        <StickyNote color="yellow" title="¡Bien!" rotation={1}>
          <p>{result.note ? `Está bien. ${result.note}` : "Está bien. El procedimiento cierra."}</p>
          {green ? <p className="mt-2 font-hand text-2xl">¡Ya estás en verde!</p> : null}
          {session.lessonArmed && session.postLessonStreak === 1 ? <p className="mt-2">Llevas un acierto. Comprobémoslo con otro problema del mismo tipo.</p> : null}
          <Button className="mt-4" onClick={another}>{session.lessonArmed && session.postLessonStreak === 1 ? "Comprobarlo con otro problema" : "Otro problema, un poco más difícil"}</Button>
        </StickyNote>
      ) : null}

      {phase === "review" && result ? <EmptyState title="Miremos tu hoja con calma" description={result.feedback || "No pudimos leer un paso con suficiente confianza. Pide ayuda a tu profe o intenta una foto más clara."} action={<Button onClick={() => setPhase("capture")}>Tomar otra foto</Button>} /> : null}

      {phase === "wrong" && result ? (
        <div className="space-y-4">
          <PhotoCard
            imageUrl={result.image_url || previewUrl || undefined}
            name={session.name}
            statusLabel="Te confundiste aquí 👇"
            errorBox={result.error_box}
            footer={<p>{result.feedback}</p>}
          />
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate(`/clase?diagnosis=${result.id}`)}>
              Explícamelo en la pizarra
            </Button>
            <Button variant="secondary" onClick={another}>Pedir otro problema</Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
