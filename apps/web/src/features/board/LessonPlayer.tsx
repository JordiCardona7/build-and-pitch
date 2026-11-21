import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Board } from "./Board";
import { Button } from "../../shared/ui/Button";
import { ProgressDots } from "../../shared/ui/ProgressDots";
import type { BoardElements } from "./engine/context";
import { BoardPlayer, DEFAULT_PLAYBACK_SPEED, silentSpeaker } from "./engine/player";
import type { Lesson, PlayerHandle, PlayerState, Speaker } from "./types";

export type LessonPlayerProps = {
  lesson?: Lesson | null;
  speak?: Speaker;
  onReady?: (handle: PlayerHandle) => void;
  onSay?: (sentence: string) => void;
  onStepChange?: (index: number) => void;
  onDone?: () => void;
  onCheckpoint?: (prompt: string) => void;
  onStateChange?: (state: PlayerState) => void;
  onError?: (error: unknown) => void;
  autoPlay?: boolean;
  controls?: boolean;
  speed?: number;
  className?: string;
};
const stateLabels: Record<PlayerState, string> = {
  idle: "A tu ritmo",
  playing: "Escribiendo contigo",
  paused: "Nos detenemos aquí",
  aside: "Vamos de otra forma",
  done: "¡Ahora te toca a ti!",
};

export function LessonPlayer(props: LessonPlayerProps) {
  const {
    lesson,
    autoPlay = false,
    controls = true,
    speed = DEFAULT_PLAYBACK_SPEED,
    className = "",
  } = props;
  const latest = useRef(props);
  latest.current = props;
  const player = useRef<BoardPlayer>();
  const checkpointId = useId();
  const [state, setState] = useState<PlayerState>("idle");
  const [step, setStep] = useState(-1);
  const [subtitle, setSubtitle] = useState("");
  const [asideVisible, setAsideVisible] = useState(false);
  const [checkpoint, setCheckpoint] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const reportError = useCallback((reason: unknown) => {
    setError("Algo se trabó al abrir la clase. Probemos otra vez.");
    latest.current.onError?.(reason);
  }, []);
  const ready = useCallback((elements: BoardElements) => {
    const instance = new BoardPlayer(
      elements,
      () => latest.current.speak ?? silentSpeaker,
      {
        onSay: (sentence) => {
          setSubtitle(sentence);
          latest.current.onSay?.(sentence);
        },
        onStepChange: (index) => {
          setStep(index);
          latest.current.onStepChange?.(index);
        },
        onDone: () => latest.current.onDone?.(),
        onCheckpoint: (prompt) => {
          setCheckpoint(prompt);
          latest.current.onCheckpoint?.(prompt);
        },
        onCheckpointAnswered: () => {
          setCheckpoint("");
          setAnswer("");
        },
        onStateChange: (next) => {
          setState(next);
          if (next === "playing") setError("");
          latest.current.onStateChange?.(next);
        },
        onAsideChange: setAsideVisible,
      },
    );
    player.current = instance;
    instance.setSpeed(latest.current.speed ?? DEFAULT_PLAYBACK_SPEED);
    latest.current.onReady?.(instance);
    return () => {
      instance.dispose();
      if (player.current === instance) player.current = undefined;
    };
  }, []);
  useEffect(() => {
    player.current?.setSpeed(speed);
  }, [speed]);
  useEffect(() => {
    if (autoPlay && lesson) {
      void player.current?.play(lesson).catch(reportError);
      return () => {
        player.current?.dispose();
      };
    }
  }, [lesson, autoPlay, reportError]);
  const start = (): void => {
    setError("");
    if (lesson) void player.current?.play(lesson).catch(reportError);
  };
  return (
    <section
      className={`w-full text-ink ${className}`}
      aria-label="Clase en la pizarra"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-ink-soft">
            {checkpoint ? "Tu turno: lo pensamos juntos" : stateLabels[state]}
          </p>
          <h2 className="text-xl font-bold sm:text-2xl">
            {lesson?.title ?? "Tu pizarra está lista"}
          </h2>
        </div>
        {lesson && <ProgressDots total={lesson.steps.length} current={step} />}
      </header>
      <Board
        onReady={ready}
        asideVisible={asideVisible}
        label={lesson?.title}
      />
      <div
        className="mx-auto mt-2 min-h-20 max-w-3xl px-3 text-center text-lg leading-relaxed sm:text-xl"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="board-subtitle"
      >
        {error ||
          subtitle ||
          (lesson
            ? "Mira el marcador. Vamos paso a paso."
            : "Elige una lección para empezar a dibujar.")}
      </div>
      {controls && (
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {["idle", "done"].includes(state) && (
            <Button
              type="button"
              onClick={start}
              disabled={!lesson?.steps.length}
            >
              {state === "done" ? "Volver a ver" : "Empezar clase"}
            </Button>
          )}
          {state === "playing" && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => player.current?.pause()}
            >
              ✋ Espera, no entendí
            </Button>
          )}
          {state === "paused" && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => player.current?.resume()}
            >
              Sigamos
            </Button>
          )}
        </div>
      )}
      {controls && checkpoint && (
        <form
          className="mx-auto mt-4 max-w-xl rounded-2xl border border-line bg-paper-2 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            player.current?.answerCheckpoint(answer);
          }}
        >
          <label className="mb-2 block font-semibold" htmlFor={checkpointId}>
            {checkpoint}
          </label>
          <div className="flex gap-2">
            <input
              id={checkpointId}
              className="min-w-0 flex-1 rounded-lg border border-line bg-card p-3 text-ink"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Cuéntamelo con tus palabras"
            />
            <Button type="submit" disabled={!answer.trim()}>
              Continuar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
