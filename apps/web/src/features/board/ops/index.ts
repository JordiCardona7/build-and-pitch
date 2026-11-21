import { isAbort, throwIfAborted, type DrawContext } from "../engine/context";
import { ellipseD, lineD, rectD, strokePath } from "../engine/strokes";
import { color } from "../engine/theme";
import { tween, waitResume } from "../engine/tween";
import type { Op } from "../types";
import { clear } from "./clear";
import { arrow, bar, pie } from "./shapes";
import { frac, write } from "./write";

type Registry = {
  [K in Op["op"]]: (
    op: Extract<Op, { op: K }>,
    ctx: DrawContext,
  ) => Promise<unknown>;
};
export const OPS: Registry = {
  write,
  frac,
  bar,
  pie,
  arrow,
  line: (o, ctx) =>
    strokePath(lineD(o.x1, o.y1, o.x2, o.y2), ctx, {
      color: color(o.color),
      width: o.width ?? 4,
    }),
  rect: (o, ctx) =>
    strokePath(rectD(o.x, o.y, o.w, o.h), ctx, {
      color: color(o.color),
      speed: 0.8,
    }),
  circle: (o, ctx) =>
    strokePath(ellipseD(o.cx, o.cy, o.rx, o.ry ?? o.rx), ctx, {
      color: color(o.color ?? "rojo"),
      width: 5,
      speed: 0.9,
    }),
  underline: (o, ctx) =>
    strokePath(lineD(o.x, o.y, o.x + o.w, o.y), ctx, { color: color(o.color) }),
  cross: async (o, ctx) => {
    await strokePath(lineD(o.x, o.y, o.x + o.w, o.y + o.h), ctx, {
      color: color(o.color ?? "rojo"),
    });
    await strokePath(lineD(o.x + o.w, o.y, o.x, o.y + o.h), ctx, {
      color: color(o.color ?? "rojo"),
    });
  },
  clear: (_o, ctx) => clear(ctx),
  wait: (o, ctx) =>
    tween(Math.max(0, o.ms), () => undefined, {
      ...ctx,
      get paused() {
        return ctx.paused;
      },
      get speed() {
        return ctx.speed;
      },
      timing: 1,
    }),
};
export async function drawOps(
  ops: readonly Op[],
  ctx: DrawContext,
): Promise<void> {
  for (const op of ops) {
    await waitResume(ctx);
    if (!Object.prototype.hasOwnProperty.call(OPS, op.op)) {
      console.warn("Operación de pizarra desconocida:", op.op);
      continue;
    }
    // The registry retains the discriminated input types; dispatch narrows at this boundary.
    const draw = OPS[op.op] as (
      value: Op,
      context: DrawContext,
    ) => Promise<unknown>;
    try {
      await draw(op, ctx);
    } catch (error) {
      if (isAbort(error)) throw error;
      console.warn("No se pudo dibujar una operación:", op.op, error);
    }
    throwIfAborted(ctx.signal);
  }
}
