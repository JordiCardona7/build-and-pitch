import { el, type DrawContext } from "./context";
import { moveTo, setMarkerColor, travel } from "./marker";
import { COLORS } from "./theme";
import { tween } from "./tween";

// Geometry and dash reveal are ported from the working prototype.
const jitter = (amount = 2.5): number => (Math.random() - 0.5) * amount;
export const lineD = (x1: number, y1: number, x2: number, y2: number): string =>
  `M${x1 + jitter()} ${y1 + jitter()} Q${(x1 + x2) / 2 + jitter(4)} ${(y1 + y2) / 2 + jitter(4)} ${x2 + jitter()} ${y2 + jitter()}`;
export const rectD = (x: number, y: number, w: number, h: number): string =>
  `M${x + jitter()} ${y + jitter()} L${x + w + jitter()} ${y + jitter()} L${x + w + jitter()} ${y + h + jitter()} L${x + jitter()} ${y + h + jitter()} Z`;
export function ellipseD(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  overshoot = 1.1,
  wobble = 0.025,
): string {
  return Array.from({ length: 65 }, (_, i) => {
    const angle = -Math.PI * 0.65 + (i / 64) * Math.PI * 2 * overshoot;
    const k = 1 + jitter(wobble);
    return `${i ? "L" : "M"}${(cx + Math.cos(angle) * rx * k).toFixed(1)} ${(cy + Math.sin(angle) * ry * k).toFixed(1)}`;
  }).join(" ");
}
export async function strokePath(
  d: string,
  ctx: DrawContext,
  opts: {
    color?: string;
    width?: number;
    speed?: number;
    opacity?: number;
  } = {},
): Promise<SVGPathElement> {
  const ink = opts.color ?? COLORS.negro;
  const width = opts.width ?? 4;
  const path = el(
    "path",
    {
      d,
      fill: "none",
      stroke: ink,
      "stroke-width": width,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-opacity": opts.opacity ?? 0.95,
    },
    ctx.layer,
  );
  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length} ${length}`;
  path.style.strokeDashoffset = String(length);
  const start = path.getPointAtLength(0);
  setMarkerColor(ink, ctx);
  await travel(start.x, start.y, ctx);
  await tween(
    Math.max(220, length * (opts.speed ?? 1.4)),
    (p) => {
      path.style.strokeDashoffset = String(length * (1 - p));
      if (!ctx.reducedMotion)
        path.setAttribute(
          "stroke-width",
          String(width * (1 + Math.sin(p * 12) * 0.035)),
        );
      const point = path.getPointAtLength(length * p);
      moveTo(point.x, point.y, ctx);
    },
    ctx,
  );
  return path;
}
