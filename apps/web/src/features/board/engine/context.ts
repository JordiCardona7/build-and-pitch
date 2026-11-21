import { COLORS } from "./theme";

export const NS = "http://www.w3.org/2000/svg";
let sequence = 0;
export const uniqueId = (prefix: string): string =>
  `board-${prefix}-${++sequence}`;
export function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent: SVGElement,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs))
    node.setAttribute(key, String(value));
  parent.appendChild(node);
  return node;
}
export type BoardElements = {
  svg: SVGSVGElement;
  defs: SVGDefsElement;
  main: SVGGElement;
  aside: SVGGElement;
  marker: SVGGElement;
  eraser: SVGGElement;
};
export type DrawContext = {
  paused: boolean;
  layer: SVGGElement;
  resources: SVGDefsElement;
  signal: AbortSignal;
  marker: SVGGElement;
  eraser: SVGGElement;
  position: { x: number; y: number };
  ink: string;
  speed: number;
  timing: number;
  reducedMotion: boolean;
};
export function makeCtx(
  elements: BoardElements,
  layer: SVGGElement,
  signal: AbortSignal,
): DrawContext {
  return {
    paused: false,
    layer,
    signal,
    resources: el("defs", {}, elements.defs),
    marker: elements.marker,
    eraser: elements.eraser,
    position: { x: 900, y: 540 },
    ink: COLORS.azul,
    speed: 1,
    timing: 1,
    reducedMotion:
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  };
}
export function resetContext(ctx: DrawContext): void {
  ctx.layer.replaceChildren();
  ctx.resources.replaceChildren();
  ctx.layer.removeAttribute("clip-path");
}
export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted)
    throw new DOMException("Reproducción cancelada", "AbortError");
}
export const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";
