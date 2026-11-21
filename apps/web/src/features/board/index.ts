export { Board } from "./Board";
export type { BoardProps } from "./Board";
export { LessonPlayer } from "./LessonPlayer";
export type { LessonPlayerProps } from "./LessonPlayer";
export { drawOps, OPS } from "./ops";
export { makeCtx } from "./engine/context";
export type { DrawContext, BoardElements } from "./engine/context";
export { DEFAULT_PLAYBACK_SPEED, silentSpeaker } from "./engine/player";
export type {
  PlayerHandle,
  PlayerState,
  Speaker,
  Lesson,
  Step,
  Op,
  MarkerColor,
} from "./types";
