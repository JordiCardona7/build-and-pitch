import { throwIfAborted, type DrawContext } from "./context";

/** Ported from prototype/frontend/board-engine-modular.js.
 * Paused frames never mutate SVG or accrue time; cancellation releases the RAF. */
export function tween(
  ms: number,
  update: (progress: number) => void,
  ctx: DrawContext,
): Promise<void> {
  throwIfAborted(ctx.signal);
  return new Promise((resolve, reject) => {
    let elapsed = 0;
    let last: number | undefined;
    let wasPaused = ctx.paused;
    let raf = 0;
    const abort = (): void => {
      cancelAnimationFrame(raf);
      reject(new DOMException("Reproducción cancelada", "AbortError"));
    };
    ctx.signal.addEventListener("abort", abort, { once: true });
    const frame = (now: number): void => {
      const delta = last === undefined ? 0 : Math.min(now - last, 64);
      last = now;
      if (!ctx.paused) {
        if (!wasPaused) elapsed += (delta * ctx.speed) / ctx.timing;
        const progress = ms <= 0 ? 1 : Math.min(1, elapsed / ms);
        update(progress);
        if (progress === 1) {
          ctx.signal.removeEventListener("abort", abort);
          resolve();
          return;
        }
      }
      wasPaused = ctx.paused;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}
export const waitResume = (ctx: DrawContext): Promise<void> =>
  tween(0, () => undefined, ctx);
