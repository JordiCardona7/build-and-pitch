import {
  isAbort,
  makeCtx,
  resetContext,
  throwIfAborted,
  type BoardElements,
  type DrawContext,
} from "./context";
import { moveTo, setMarkerColor } from "./marker";
import { tween, waitResume } from "./tween";
import { drawOps } from "../ops";
import type {
  Lesson,
  Op,
  PlayerHandle,
  PlayerState,
  Speaker,
  Step,
} from "../types";

export type PlayerEvents = {
  onSay?: (sentence: string) => void;
  onStepChange?: (index: number) => void;
  onDone?: () => void;
  onCheckpoint?: (prompt: string) => void;
  onCheckpointAnswered?: () => void;
  onStateChange?: (state: PlayerState) => void;
  onAsideChange?: (visible: boolean) => void;
};
export const estimatedSpeechMs = (text: string): number =>
  text.trim() ? text.trim().split(/\s+/u).length * 330 : 0;
export const silentSpeaker: Speaker = {
  speak: (text, { signal }) =>
    new Promise((resolve) => {
      if (signal.aborted) {
        resolve("interrupted");
        return;
      }
      const abort = (): void => {
        clearTimeout(timer);
        resolve("interrupted");
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve("ok");
      }, estimatedSpeechMs(text));
      signal.addEventListener("abort", abort, { once: true });
    }),
  stop: () => undefined,
};

/** Cost model follows the prototype's path durations, including marker travel.
 * Scales drawing toward estimated speech duration without changing explicit waits. */
function opCost(op: Op): number {
  switch (op.op) {
    case "write":
      return 180 + Math.max(300, Array.from(op.text).length * 80);
    case "frac":
      return 1500 + (String(op.num).length + String(op.den).length) * 80;
    case "pie":
      return (
        2 * Math.PI * op.r * 0.9 +
        180 +
        (op.parts > 1 ? op.parts * (180 + Math.max(220, op.r * 2.2)) : 0) +
        (op.shade > 0 ? 680 + 260 * op.shade : 0)
      );
    case "bar":
      return (
        180 +
        (op.w + op.h) * 1.6 +
        (op.parts - 1) * (180 + Math.max(220, op.h * 2)) +
        (op.shade > 0
          ? 180 + ((op.w * op.shade) / op.parts / 8) * op.h * 0.3
          : 0)
      );
    case "wait":
      return 0;
    case "clear":
      return 1500;
    case "circle":
      return 180 + Math.PI * (op.rx + (op.ry ?? op.rx));
    default:
      return 650;
  }
}

export class BoardPlayer implements PlayerHandle {
  state: PlayerState = "idle";
  currentStep = -1;
  private run?: AbortController;
  private main?: DrawContext;
  private aside?: DrawContext;
  private speech?: AbortController;
  private speechOwner?: DrawContext;
  private speed = 1;
  private checkpoint?: {
    ctx: DrawContext;
    prompt: string;
    resolve: () => void;
  };
  private asideTask?: Promise<void>;
  constructor(
    private elements: BoardElements,
    private getSpeaker: () => Speaker,
    private events: PlayerEvents = {},
  ) {}

  private setState(state: PlayerState): void {
    this.state = state;
    this.events.onStateChange?.(state);
  }
  setSpeed(speed: number): void {
    this.speed = Number.isFinite(speed)
      ? Math.min(4, Math.max(0.25, speed))
      : 1;
    if (this.main) this.main.speed = this.speed;
    if (this.aside) this.aside.speed = this.speed;
  }
  private stopSpeech(ctx?: DrawContext): void {
    if (ctx && this.speechOwner !== ctx) return;
    this.speech?.abort();
    this.getSpeaker().stop();
  }
  pause(): void {
    if (this.state !== "playing" || !this.main) return;
    this.main.paused = true;
    this.stopSpeech(this.main);
    this.setState("paused");
  }
  resume(): void {
    if (this.state !== "paused" || !this.main || this.checkpoint) return;
    moveTo(this.main.position.x, this.main.position.y, this.main);
    setMarkerColor(this.main.ink, this.main);
    this.main.paused = false;
    this.setState("playing");
  }
  answerCheckpoint(text: string): void {
    if (
      !text.trim() ||
      !this.checkpoint ||
      (this.state === "aside" && this.checkpoint.ctx === this.main)
    )
      return;
    const pending = this.checkpoint;
    this.checkpoint = undefined;
    this.events.onCheckpointAnswered?.();
    pending.resolve();
  }
  dispose(): void {
    this.run?.abort();
    this.stopSpeech();
    this.checkpoint = undefined;
    this.asideTask = undefined;
    for (const ctx of [this.main, this.aside])
      if (ctx) {
        resetContext(ctx);
        ctx.resources.remove();
      }
    this.main = undefined;
    this.aside = undefined;
    this.elements.eraser.setAttribute("visibility", "hidden");
    this.elements.marker.removeAttribute("visibility");
  }
  async play(lesson: Lesson): Promise<void> {
    this.dispose();
    const run = new AbortController();
    this.run = run;
    const main = makeCtx(this.elements, this.elements.main, run.signal);
    this.main = main;
    main.speed = this.speed;
    this.currentStep = -1;
    this.events.onAsideChange?.(false);
    this.events.onCheckpointAnswered?.();
    this.events.onSay?.("");
    this.setState("playing");
    try {
      // The font is bundled locally; wait before measuring text geometry.
      if (document.fonts) await document.fonts.load("700 42px Caveat");
      throwIfAborted(run.signal);
      for (const [i, step] of lesson.steps.entries()) {
        await waitResume(main);
        this.currentStep = i;
        this.events.onStepChange?.(i);
        await this.runStep(step, main);
      }
      await waitResume(main);
      this.setState("done");
      this.events.onDone?.();
    } catch (error) {
      if (!isAbort(error) && !run.signal.aborted) {
        run.abort();
        this.stopSpeech();
        this.setState("idle");
        throw error;
      }
    }
  }
  playAside(steps: Step[]): Promise<void> {
    if (this.asideTask) return this.asideTask;
    if (!this.main || !this.run || !["playing", "paused"].includes(this.state))
      return Promise.resolve();
    this.pause();
    const task = this.runAside(steps, this.run.signal);
    this.asideTask = task;
    void task
      .finally(() => {
        if (this.asideTask === task) this.asideTask = undefined;
      })
      .catch(() => undefined);
    return task;
  }
  private async runAside(steps: Step[], signal: AbortSignal): Promise<void> {
    const ctx = makeCtx(this.elements, this.elements.aside, signal);
    this.aside = ctx;
    ctx.speed = this.speed;
    const mainCheckpoint = this.checkpoint;
    const markerVisibility =
      this.elements.marker.getAttribute("visibility") ?? "visible";
    const eraserVisibility =
      this.elements.eraser.getAttribute("visibility") ?? "visible";
    const eraserPosition = this.elements.eraser.getAttribute("transform") ?? "";
    this.elements.marker.removeAttribute("visibility");
    this.elements.eraser.setAttribute("visibility", "hidden");
    this.checkpoint = undefined;
    this.events.onCheckpointAnswered?.();
    this.setState("aside");
    this.events.onAsideChange?.(true);
    try {
      await tween(ctx.reducedMotion ? 0 : 280, () => undefined, ctx);
      for (const step of steps) await this.runStep(step, ctx);
      await tween(300, () => undefined, ctx);
      this.events.onAsideChange?.(false);
      await tween(ctx.reducedMotion ? 0 : 280, () => undefined, ctx);
      resetContext(ctx);
      ctx.resources.remove();
      this.aside = undefined;
      this.checkpoint = mainCheckpoint;
      if (mainCheckpoint) this.events.onCheckpoint?.(mainCheckpoint.prompt);
      this.setState("paused");
      // P4 explicitly resumes after the clarification. The main clock stays frozen.
      if (this.main) {
        moveTo(this.main.position.x, this.main.position.y, this.main);
        setMarkerColor(this.main.ink, this.main);
      }
      this.elements.marker.setAttribute("visibility", markerVisibility);
      this.elements.eraser.setAttribute("visibility", eraserVisibility);
      this.elements.eraser.setAttribute("transform", eraserPosition);
    } catch (error) {
      if (!isAbort(error) && !signal.aborted) {
        this.events.onAsideChange?.(false);
        resetContext(ctx);
        ctx.resources.remove();
        this.aside = undefined;
        this.checkpoint = mainCheckpoint;
        this.setState("paused");
        this.elements.marker.setAttribute("visibility", markerVisibility);
        this.elements.eraser.setAttribute("visibility", eraserVisibility);
        this.elements.eraser.setAttribute("transform", eraserPosition);
        throw error;
      }
    }
  }
  private async runStep(step: Step, ctx: DrawContext): Promise<void> {
    const speechDuration = estimatedSpeechMs(step.say);
    const drawingDuration = step.draw.reduce((sum, op) => sum + opCost(op), 0);
    const waitDuration = step.draw.reduce(
      (sum, op) => sum + (op.op === "wait" ? op.ms : 0),
      0,
    );
    ctx.timing =
      speechDuration > 0 && drawingDuration > 0
        ? Math.max(
            0.12,
            Math.min(4, (speechDuration - waitDuration) / drawingDuration),
          )
        : 1;
    await Promise.all([this.say(step.say, ctx), drawOps(step.draw, ctx)]);
    await waitResume(ctx);
    if (step.checkpoint) {
      const prompt = step.checkpoint.prompt;
      await new Promise<void>((resolve, reject) => {
        const abort = (): void =>
          reject(new DOMException("Reproducción cancelada", "AbortError"));
        ctx.signal.addEventListener("abort", abort, { once: true });
        this.checkpoint = {
          ctx,
          prompt,
          resolve: () => {
            ctx.signal.removeEventListener("abort", abort);
            resolve();
          },
        };
        this.events.onCheckpoint?.(prompt);
      });
      await waitResume(ctx);
    }
  }
  private async say(text: string, ctx: DrawContext): Promise<void> {
    const sentences = text.match(/[^.!?¿¡]+[.!?]*|[¿¡][^.!?]+[.!?]*/gu) ?? [];
    for (const part of sentences) {
      const sentence = part.trim();
      if (!sentence) continue;
      let complete = false;
      while (!complete) {
        await waitResume(ctx);
        this.events.onSay?.(sentence);
        const attempt = new AbortController();
        const cancel = (): void => attempt.abort();
        ctx.signal.addEventListener("abort", cancel, { once: true });
        this.speech = attempt;
        this.speechOwner = ctx;
        const speaker = this.getSpeaker();
        try {
          // Race cancellation even if an external speaker's stop() never settles its promise.
          const result = await new Promise<"ok" | "interrupted">(
            (resolve, reject) => {
              const abort = (): void => resolve("interrupted");
              attempt.signal.addEventListener("abort", abort, { once: true });
              const speaking =
                speaker === silentSpeaker
                  ? this.silentSentence(sentence, ctx, attempt.signal)
                  : speaker.speak(sentence, { signal: attempt.signal });
              void speaking
                .then(resolve, reject)
                .finally(() =>
                  attempt.signal.removeEventListener("abort", abort),
                )
                .catch(() => undefined);
            },
          );
          throwIfAborted(ctx.signal);
          complete = result === "ok" && !attempt.signal.aborted;
          // Yield before retrying a speaker that resolves "interrupted" immediately.
          if (!complete) await tween(80, () => undefined, ctx);
        } finally {
          ctx.signal.removeEventListener("abort", cancel);
          if (this.speech === attempt) {
            this.speech = undefined;
            this.speechOwner = undefined;
          }
        }
      }
    }
  }
  private async silentSentence(
    sentence: string,
    ctx: DrawContext,
    signal: AbortSignal,
  ): Promise<"ok" | "interrupted"> {
    const clock: DrawContext = {
      ...ctx,
      signal,
      timing: 1,
      get paused() {
        return ctx.paused;
      },
      get speed() {
        return ctx.speed;
      },
    };
    try {
      await tween(estimatedSpeechMs(sentence), () => undefined, clock);
      return "ok";
    } catch (error) {
      if (isAbort(error)) return "interrupted";
      throw error;
    }
  }
}
