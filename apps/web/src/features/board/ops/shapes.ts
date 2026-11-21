import { el, uniqueId, type DrawContext } from "../engine/context";
import { moveTo, setMarkerColor, travel } from "../engine/marker";
import { ellipseD, lineD, rectD, strokePath } from "../engine/strokes";
import { color } from "../engine/theme";
import { tween } from "../engine/tween";
import type { Op } from "../types";

export async function arrow(
  o: Extract<Op, { op: "arrow" }>,
  ctx: DrawContext,
): Promise<void> {
  const ink = color(o.color);
  await strokePath(lineD(o.x1, o.y1, o.x2, o.y2), ctx, { color: ink });
  const angle = Math.atan2(o.y2 - o.y1, o.x2 - o.x1);
  for (const sign of [-1, 1])
    await strokePath(
      `M${o.x2} ${o.y2} L${o.x2 - 16 * Math.cos(angle + sign * 0.5)} ${o.y2 - 16 * Math.sin(angle + sign * 0.5)}`,
      ctx,
      { color: ink, speed: 3 },
    );
}
const divisions = (parts: number, shade: number): [number, number] => {
  const count = Math.max(1, Math.min(120, Math.floor(parts)));
  return [count, Math.max(0, Math.min(Math.floor(shade), count))];
};
export async function bar(
  o: Extract<Op, { op: "bar" }>,
  ctx: DrawContext,
): Promise<void> {
  const { x, y, w, h } = o;
  const [parts, shade] = divisions(o.parts, o.shade);
  if (shade > 0 && w > 0 && h > 0) {
    const clip = el("clipPath", { id: uniqueId("bar") }, ctx.resources);
    el("rect", { x, y, width: (w * shade) / parts, height: h }, clip);
    const shaded = el("g", { "clip-path": `url(#${clip.id})` }, ctx.layer);
    const shadeCtx: DrawContext = {
      ...ctx,
      layer: shaded,
      get paused() {
        return ctx.paused;
      },
      get speed() {
        return ctx.speed;
      },
      get position() {
        return ctx.position;
      },
      set position(value) {
        ctx.position = value;
      },
      get ink() {
        return ctx.ink;
      },
      set ink(value) {
        ctx.ink = value;
      },
    };
    const edge = x + (w * shade) / parts;
    let d = `M${x + 2} ${y + h}`;
    let up = true;
    for (let xx = x + 2; xx <= edge + 8; xx += 8) {
      d += ` L${xx} ${up ? y : y + h}`;
      up = !up;
    }
    await strokePath(d, shadeCtx, {
      color: color(o.color ?? "azul"),
      width: 10,
      speed: 0.3,
      opacity: 0.38,
    });
  }
  await strokePath(rectD(x, y, w, h), ctx, { speed: 0.8 });
  for (let i = 1; i < parts; i++)
    await strokePath(
      lineD(x + (w * i) / parts, y, x + (w * i) / parts, y + h),
      ctx,
      { width: 3, speed: 2 },
    );
}
export async function pie(
  o: Extract<Op, { op: "pie" }>,
  ctx: DrawContext,
): Promise<void> {
  const { cx, cy } = o;
  const r = Math.max(1, o.r);
  const [parts, shade] = divisions(o.parts, o.shade);
  const start = -Math.PI / 2;
  const outline = await strokePath(ellipseD(cx, cy, r, r, 1.015), ctx, {
    speed: 0.9,
  });
  for (let i = 0; i < parts && parts > 1; i++) {
    const a = start + (i / parts) * Math.PI * 2;
    await strokePath(
      lineD(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r),
      ctx,
      { width: 3, speed: 2.2 },
    );
  }
  if (!shade) return;
  const ink = color(o.color ?? "naranja");
  const wedge = el(
    "path",
    { fill: ink, "fill-opacity": 0.38, stroke: "none" },
    ctx.layer,
  );
  ctx.layer.insertBefore(wedge, outline);
  const inner = Math.max(0.5, r - 3);
  setMarkerColor(ink, ctx);
  await travel(cx, cy - inner, ctx);
  await tween(
    500 + 260 * shade,
    (p) => {
      const a = start + (shade / parts) * Math.PI * 2 * p;
      wedge.setAttribute(
        "d",
        p === 1 && shade === parts
          ? `M${cx - inner} ${cy} A${inner} ${inner} 0 1 1 ${cx + inner} ${cy} A${inner} ${inner} 0 1 1 ${cx - inner} ${cy} Z`
          : `M${cx} ${cy} L${cx} ${cy - inner} A${inner} ${inner} 0 ${a - start > Math.PI ? 1 : 0} 1 ${cx + Math.cos(a) * inner} ${cy + Math.sin(a) * inner} Z`,
      );
      const radius = inner * (0.6 + Math.sin(p * 40) * 0.25);
      moveTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, ctx);
    },
    ctx,
  );
}
