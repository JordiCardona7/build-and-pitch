import type { Lesson, Step } from "../../shared/api/types";
export type {
  Lesson,
  Step,
  Op,
  ErrorCode,
  Level,
  InkColor as MarkerColor,
} from "../../shared/api/types";

/** The speech/imperative interfaces belong to CONTRACTS.md §4 (P2 ↔ P4). */
export type Speaker = {
  speak(
    text: string,
    opts: { signal: AbortSignal },
  ): Promise<"ok" | "interrupted">;
  stop(): void;
};
export type PlayerState = "idle" | "playing" | "paused" | "aside" | "done";
export type PlayerHandle = {
  play(lesson: Lesson): Promise<void>;
  pause(): void;
  resume(): void;
  playAside(steps: Step[]): Promise<void>;
  answerCheckpoint(text: string): void;
  setSpeed(speed: number): void;
  readonly state: PlayerState;
  readonly currentStep: number;
};
