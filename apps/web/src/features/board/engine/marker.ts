import type { DrawContext } from "./context";
import { tween } from "./tween";

export function moveTo(x: number, y: number, ctx: DrawContext): void {
  ctx.position = { x, y };
  const angle = ctx.reducedMotion
    ? -38
    : -38 + Math.sin(x * 0.015 + y * 0.01) * 3;
  ctx.marker.setAttribute(
    "transform",
    `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)})`,
  );
}
export function setMarkerColor(value: string, ctx: DrawContext): void {
  ctx.ink = value;
  ctx.marker.setAttribute("color", value);
}
export async function travel(
  x: number,
  y: number,
  ctx: DrawContext,
): Promise<void> {
  const { x: sx, y: sy } = ctx.position;
  await tween(
    Math.min(380, 90 + Math.hypot(x - sx, y - sy) * 0.35),
    (p) => {
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      moveTo(sx + (x - sx) * eased, sy + (y - sy) * eased, ctx);
    },
    ctx,
  );
}
