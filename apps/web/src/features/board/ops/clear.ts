import { el, uniqueId, type DrawContext } from "../engine/context";
import { tween } from "../engine/tween";

/** A clip boundary follows the eraser. Resources are removed along with the ink. */
export async function clear(ctx: DrawContext): Promise<void> {
  const clip = el("clipPath", { id: uniqueId("erase") }, ctx.resources);
  const lowerRows = el("rect", { x: 0, y: 0, width: 1000, height: 600 }, clip);
  const currentRow = el("rect", { x: 0, y: 0, width: 1000, height: 100 }, clip);
  ctx.layer.setAttribute("clip-path", `url(#${clip.id})`);
  ctx.marker.setAttribute("visibility", "hidden");
  ctx.eraser.removeAttribute("visibility");
  try {
    await tween(
      1500,
      (p) => {
        const row = Math.min(5, Math.floor(p * 6));
        const phase = p * 6 - row;
        const x = row % 2 === 0 ? phase * 1120 - 60 : 1060 - phase * 1120;
        const edge = Math.max(0, Math.min(1000, x));
        lowerRows.setAttribute("y", String((row + 1) * 100));
        lowerRows.setAttribute("height", String(600 - (row + 1) * 100));
        currentRow.setAttribute("y", String(row * 100));
        currentRow.setAttribute("x", String(row % 2 === 0 ? edge : 0));
        currentRow.setAttribute(
          "width",
          String(row % 2 === 0 ? 1000 - edge : edge),
        );
        ctx.eraser.setAttribute(
          "transform",
          `translate(${x} ${row * 100 + 50})`,
        );
      },
      ctx,
    );
    ctx.layer.replaceChildren();
    ctx.resources.replaceChildren();
  } finally {
    ctx.layer.removeAttribute("clip-path");
    ctx.eraser.setAttribute("visibility", "hidden");
    ctx.marker.removeAttribute("visibility");
  }
}
