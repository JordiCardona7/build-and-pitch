import { el, uniqueId, type DrawContext } from "../engine/context";
import { moveTo, setMarkerColor, travel } from "../engine/marker";
import { lineD, strokePath } from "../engine/strokes";
import { color } from "../engine/theme";
import { tween } from "../engine/tween";
import type { Op } from "../types";

export async function write(
  o: Extract<Op, { op: "write" }>,
  ctx: DrawContext,
  fractionId?: string,
): Promise<DOMRect> {
  const size = Math.max(1, o.size ?? 42);
  const x = Math.max(8, Math.min(992, o.x));
  const text = el(
    "text",
    {
      x,
      y: o.y,
      "font-size": size,
      fill: color(o.color),
      "fill-opacity": 0.95,
      "font-family": "Caveat, cursive",
      "font-weight": 700,
      "text-anchor": o.anchor ?? "start",
      visibility: "hidden",
    },
    ctx.layer,
  );
  text.textContent = o.text;
  if (fractionId) text.dataset.boardFraction = fractionId;
  let box = text.getBBox();
  const available =
    o.anchor === "middle"
      ? Math.max(1, 2 * (Math.min(x, 1000 - x) - 8))
      : Math.max(1, 992 - x);
  if (box.width > available && available > 0) {
    text.setAttribute("font-size", String((size * available) / box.width));
    box = text.getBBox();
  }
  const dx = Math.max(0, 6 - box.x) - Math.max(0, box.x + box.width - 994);
  const dy = Math.max(0, 6 - box.y) - Math.max(0, box.y + box.height - 594);
  if (dx || dy) {
    text.setAttribute("x", String(x + dx));
    text.setAttribute("y", String(o.y + dy));
    box = text.getBBox();
  }
  const clip = el("clipPath", { id: uniqueId("text") }, ctx.resources);
  const reveal = el(
    "rect",
    { x: box.x - 2, y: box.y - 2, width: 0, height: box.height + 4 },
    clip,
  );
  text.setAttribute("clip-path", `url(#${clip.id})`);
  text.removeAttribute("visibility");
  setMarkerColor(color(o.color), ctx);
  await travel(box.x, box.y + box.height * 0.7, ctx);
  await tween(
    Math.max(300, Array.from(o.text).length * 80),
    (p) => {
      const w = (box.width + 4) * p;
      reveal.setAttribute("width", String(w));
      moveTo(
        box.x - 2 + w,
        box.y +
          box.height *
            (0.68 + Math.sin(p * Math.max(1, o.text.length) * 3.1) * 0.2),
        ctx,
      );
    },
    ctx,
  );
  text.removeAttribute("clip-path");
  clip.remove();
  return box;
}
export async function frac(
  o: Extract<Op, { op: "frac" }>,
  ctx: DrawContext,
): Promise<void> {
  const size = o.size ?? 44;
  const fractionId = uniqueId("fraction");
  const box = await write(
    {
      op: "write",
      text: String(o.num),
      x: o.x,
      y: o.y - size * 0.18,
      size,
      color: o.color,
      anchor: "middle",
    },
    ctx,
    fractionId,
  );
  const w = Math.max(box.width, size * 0.5 * String(o.den).length) + 18;
  await strokePath(lineD(o.x - w / 2, o.y, o.x + w / 2, o.y), ctx, {
    color: color(o.color),
    width: 3.5,
    speed: 2,
  });
  await write(
    {
      op: "write",
      text: String(o.den),
      x: o.x,
      y: o.y + size * 0.82,
      size,
      color: o.color,
      anchor: "middle",
    },
    ctx,
    fractionId,
  );
}
