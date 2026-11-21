import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LessonPlayer, silentSpeaker, type PlayerHandle, type PlayerState } from "@/features/board";
import {
  InteractIndicators,
  InterruptOverlay,
  preloadHandModel,
  useInterruptTriggers,
  useQuestionCapture,
  useSpeaker,
} from "@/features/interact";
import { api, type Lesson } from "@/shared/api";
import { Button, EmptyState, ScribbleLoader } from "@/shared/ui";
import { friendlyError } from "../message";
import { loadSession, saveSession } from "../session";
import { requestClarification } from "../clarification";

export function ClassPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const diagnosisId = params.get("diagnosis");
  const lessonId = params.get("lesson");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [captionsOnly, setCaptionsOnly] = useState(false);
  const [boardReady, setBoardReady] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [overlay, setOverlay] = useState(false);
  const [clarifying, setClarifying] = useState(false);
  const [notice, setNotice] = useState("");
  const [checkpoint, setCheckpoint] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [feedback, setFeedback] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [progress, setProgress] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const queryClient = useQueryClient();
  const handleRef = useRef<PlayerHandle | null>(null);
  const reported = useRef(false);
  const generation = useRef(0);
  const questionRequest = useRef<AbortController | null>(null);
  const asking = useRef(false);
  const speaker = useSpeaker();
  const capture = useQuestionCapture();
  const triggers = useInterruptTriggers({
    enabled: started && playerState === "playing" && !overlay && !clarifying,
    onTrigger: () => {
      const handle = handleRef.current;
      if (!handle || handle.state !== "playing") return;
      handle.pause();
      setOverlay(true);
    },
  });

  useEffect(() => {
    if (!diagnosisId && !lessonId) return;
    void preloadHandModel();
  }, [diagnosisId, lessonId]);

  useEffect(() => {
    let cancel = false;
    generation.current += 1;
    questionRequest.current?.abort();
    asking.current = false;
    handleRef.current?.pause();
    speaker.stop();
    setLesson(null);
    setStarted(false);
    setBoardReady(false);
    setPlayerState("idle");
    setOverlay(false);
    setClarifying(false);
    setCheckpoint("");
    setAnswer("");
    setExplanation("");
    setFeedback("");
    setNotice("");
    setProgress("idle");
    setExplaining(false);
    reported.current = false;
    setLoading(true);
    setError("");
    const request = diagnosisId
      ? api.lessonForDiagnosis(diagnosisId)
      : lessonId
        ? api.getLesson(lessonId)
        : null;
    if (!request) {
      setLoading(false);
      return;
    }
    request
      .then((next) => {
        if (!cancel) setLesson(next);
      })
      .catch((cause: unknown) => {
        if (!cancel) setError(friendlyError(cause, "No pude abrir la clase. Probemos otra vez."));
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
      generation.current += 1;
      questionRequest.current?.abort();
      speaker.stop();
    };
  }, [diagnosisId, lessonId, speaker]);

  const saveProgress = useCallback(async () => {
    if (!lesson || reported.current) return;
    const session = loadSession();
    if (!session) return;
    reported.current = true;
    setProgress("saving");
    const token = generation.current;
    try {
      await api.progress(session.id, "lesson_done", lesson.id);
        const current = loadSession();
        if (token !== generation.current || current?.id !== session.id) return;
        saveSession({
          ...current,
          lessonArmed: true,
          postLessonStreak: 0,
          targetError: lesson.error_code ?? session.targetError,
        });
        setProgress("saved");
        void queryClient.invalidateQueries({ queryKey: ["student", session.id] });
    } catch {
        if (token !== generation.current) return;
        reported.current = false;
        setProgress("error");
        setNotice("Terminaste la clase, pero no pudimos guardar el avance. Puedes volver a intentarlo.");
    }
  }, [lesson, queryClient]);

  useEffect(() => {
    if (playerState === "done") void saveProgress();
  }, [playerState, saveProgress]);

  const begin = () => {
    const handle = handleRef.current;
    if (!lesson || !handle) return;
    window.speechSynthesis?.resume();
    setNotice("");
    setStarted(true);
    void handle.play(lesson).catch(() => {
      setStarted(false);
      setNotice("No pude empezar la clase. Puedes elegir seguir con subtítulos e intentarlo otra vez.");
    });
  };

  const ask = async (question: string) => {
    if (asking.current) return;
    const token = generation.current;
    const handle = handleRef.current;
    if (!lesson || !handle) return;
    asking.current = true;
    const controller = new AbortController();
    questionRequest.current = controller;
    setOverlay(false);
    setClarifying(true);
    setNotice("");
    try {
      const step = handle?.currentStep ?? 0;
      const aside = await requestClarification(() => api.ask(lesson.id, step, question), lesson, controller.signal);
      if (token !== generation.current) return;
      if (aside.fallback) setNotice("Vamos a verlo con otro ejemplo mientras vuelve la conexión.");
      setClarifying(false);
      await handle?.playAside(aside.steps);
      if (token === generation.current) handle?.resume();
    } catch (cause) {
      if (token === generation.current) {
        setNotice(friendlyError(cause, "No pude aclararlo ahora. Puedes preguntar otra vez o seguir."));
      }
    } finally {
      if (token === generation.current) { asking.current = false; setClarifying(false); }
    }
  };

  const explainBack = async (transcript: string) => {
    if (!lesson || !transcript.trim() || explaining) return;
    const token = generation.current;
    const session = loadSession();
    setExplaining(true);
    setNotice("");
    try {
      const result = await api.explainBack(lesson.id, transcript.trim());
      if (token !== generation.current) return;
      if (session && loadSession()?.id === session.id && result.understood) {
        await api.progress(session.id, "explained", lesson.id);
        void queryClient.invalidateQueries({ queryKey: ["student", session.id] });
      }
      if (token !== generation.current) return;
      setFeedback(result.feedback);
    } catch (cause) {
      if (token === generation.current) setNotice(friendlyError(cause, "No pude escuchar tu explicación. Puedes escribirla."));
    } finally {
      if (token === generation.current) setExplaining(false);
    }
  };

  if (!diagnosisId && !lessonId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Todavía no hay una clase"
          description="Pide un problema o pide que te explique desde cero."
          action={<Link to="/alumno" className="font-semibold text-marker-blue">Ir a tu espacio</Link>}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      {loading ? <ScribbleLoader label="Preparando tu clase…" /> : null}
      {error ? (
        <EmptyState title="No pude abrir la clase" description={error} action={<Button onClick={() => window.location.reload()}>Probar otra vez</Button>} />
      ) : null}

      {lesson ? (
        <>
          <LessonPlayer
            lesson={lesson}
            speak={captionsOnly ? silentSpeaker : speaker}
            autoPlay={false}
            controls={false}
            onReady={(handle) => {
              handleRef.current = handle;
              setBoardReady(true);
            }}
            onStateChange={setPlayerState}
            onCheckpoint={setCheckpoint}
            onDone={() => setPlayerState("done")}
          />

          {!started ? (
            <section className="mx-auto max-w-xl space-y-4 rounded-card border border-line bg-card p-6 text-center shadow-warm">
              <h2 className="font-display text-3xl font-extrabold">Tu clase está lista</h2>
              <p className="text-ink-soft">
                El marcador va a escribir mientras te explica. Si te pierdes, levanta la mano, di «no entendí» o toca el botón.
                Tú eliges si activas la cámara y el micrófono. El botón siempre está disponible.
              </p>
              <label className="flex justify-center gap-2"><input type="checkbox" checked={captionsOnly} onChange={(event) => setCaptionsOnly(event.target.checked)} />Seguir con subtítulos</label>
              <Button size="lg" onClick={begin} disabled={!boardReady}>
                Empezar clase
              </Button>
            </section>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <InteractIndicators handStatus={triggers.handStatus} micStatus={triggers.micStatus} />
              <Button
                variant="secondary"
                disabled={playerState !== "playing"}
                onClick={() => triggers.trigger("button")}
              >
                ✋ Me perdí
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={triggers.cameraEnabled ? triggers.disableCamera : triggers.enableCamera}>{triggers.cameraEnabled ? "Apagar cámara" : "Activar cámara"}</Button>
            <Button variant="ghost" onClick={triggers.micEnabled ? triggers.disableMic : triggers.enableMic}>{triggers.micEnabled ? "Apagar micrófono" : "Activar micrófono"}</Button>
            {playerState === "paused" && !checkpoint && !clarifying && <><Button variant="secondary" onClick={() => setOverlay(true)}>Preguntar otra vez</Button><Button onClick={() => handleRef.current?.resume()}>Seguir con la clase</Button></>}
          </div>
          <video
            ref={triggers.videoRef}
            muted
            playsInline
            aria-label="Vista previa de tu mano"
            className={triggers.cameraEnabled
              ? "ml-auto h-24 w-32 -scale-x-100 rounded-xl border border-line object-cover"
              : "pointer-events-none fixed left-0 top-0 h-24 w-32 opacity-0"}
          />

          {clarifying ? <ScribbleLoader label="Buscando otra forma de explicarlo…" /> : null}
          {notice ? <p role="status" className="text-ink-soft">{notice}</p> : null}

          {checkpoint ? (
            <form
              className="mx-auto max-w-xl space-y-3 rounded-card border border-line bg-paper-2 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!answer.trim()) return;
                handleRef.current?.answerCheckpoint(answer);
                setCheckpoint("");
                setAnswer("");
              }}
            >
              <label className="block font-semibold" htmlFor="checkpoint-answer">{checkpoint}</label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="checkpoint-answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-card p-3"
                />
                <Button type="submit" disabled={!answer.trim()}>Continuar</Button>
              </div>
            </form>
          ) : null}

          {playerState === "done" ? (
            <section className="space-y-4 rounded-card border border-line bg-card p-5 shadow-warm">
              <h2 className="font-display text-2xl font-bold">Tu turno: explícamelo con tus palabras</h2>
              <p className="text-ink-soft">Cuéntame por qué no se suman los de abajo. Una frase basta.</p>
              {capture.transcript ? <p role="status">{capture.transcript}</p> : null}
              {["denied", "unsupported", "error"].includes(capture.status) && <p role="status">No pudimos usar el micrófono. Puedes escribir tu explicación.</p>}
              <label className="block space-y-2 font-semibold" htmlFor="explain-back">
                Tu explicación
                <textarea
                  id="explain-back"
                  rows={3}
                  maxLength={600}
                  value={explanation}
                  onChange={(event) => {
                    capture.cancel();
                    setExplanation(event.target.value);
                  }}
                  className="w-full rounded-xl border border-line bg-paper p-3 font-normal"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  disabled={explaining || capture.status === "active" || capture.status === "loading"}
                  onClick={() => {
                    setExplanation("");
                    void capture.start().then((text) => { if (text) setExplanation(text); });
                  }}
                >
                  🎙️ Decirlo
                </Button>
                <Button
                  disabled={explaining || !explanation.trim()}
                  onClick={() => void explainBack(explanation)}
                >
                  {explaining ? "Escuchando…" : "Enviar"}
                </Button>
              </div>
              {feedback ? <p className="font-hand text-2xl text-ink">{feedback}</p> : null}
              {progress === "saving" && <ScribbleLoader label="Guardando tu avance…" />}
              {progress === "error" && <Button onClick={() => void saveProgress()}>Volver a guardar mi avance</Button>}
              <Button size="lg" variant="secondary" disabled={progress === "saving" || progress === "error"} onClick={() => navigate("/alumno/problema")}>
                Ponme un problema para comprobarlo
              </Button>
            </section>
          ) : null}
        </>
      ) : null}

      <InterruptOverlay
        open={overlay}
        listen={triggers.micEnabled}
        onCancel={() => {
          setOverlay(false);
          handleRef.current?.resume();
        }}
        onQuestion={(question) => void ask(question)}
      />
    </main>
  );
}
