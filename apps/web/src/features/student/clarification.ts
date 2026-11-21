import type { Lesson, Step } from "../../shared/api/types";

/** Respaldo pedagógico local; si faltan operandos se presenta un ejemplo nuevo. */
export function fallbackClarification(lesson: Lesson): Step[] {
  const fractions = lesson.steps[0]?.draw.filter((op) => op.op === "frac") ?? [];
  const operands = fractions.slice(0, 2).map((frac) => ({ n: Number(frac.num), d: Number(frac.den) }));
  const usable = operands.length === 2 && operands.every(({ n, d }) =>
    Number.isInteger(n) && Number.isInteger(d) && n >= 0 && n <= d && d > 0 && d <= 12);
  const a = usable ? operands[0]! : { n: 1, d: 2 };
  const b = usable ? operands[1]! : { n: 1, d: 3 };
  const gcd = (x: number, y: number): number => y ? gcd(y, x % y) : x;
  const common = a.d * b.d / gcd(a.d, b.d);
  const bars = lesson.steps.some((step) => step.draw.some((op) => op.op === "pie"));
  const picture = (n: number, d: number, x: number): Step["draw"][number] => bars
    ? { op: "bar", x: x - 150, y: 240, w: 300, h: 100, parts: d, shade: n, color: "naranja" }
    : { op: "pie", cx: x, cy: 290, r: 100, parts: d, shade: n, color: "naranja" };
  return [
    { say: "Mira estos dos enteros del mismo tamaño. Sus pedazos son distintos. Antes de juntarlos, necesitamos que los pedazos midan lo mismo.",
      draw: [{ op: "clear" }, { op: "write", text: usable ? "El entero no cambia" : bars ? "Un ejemplo con barras" : "Un ejemplo con tortillas", x: 80, y: 100, size: 40, color: "azul" }, picture(a.n, a.d, 250), picture(b.n, b.d, 720)] },
    { say: "Buscamos un denominador común. Lo que multiplicamos abajo también lo multiplicamos arriba. Así conservamos la cantidad y obtenemos pedazos del mismo tamaño.",
      draw: [{ op: "clear" }, { op: "write", text: "Partes del mismo tamaño", x: 80, y: 110, size: 40, color: "azul" },
        { op: "frac", num: String(a.n * common / a.d), den: String(common), x: 300, y: 300, size: 60 },
        { op: "write", text: "+", x: 500, y: 320, size: 60, anchor: "middle" },
        { op: "frac", num: String(b.n * common / b.d), den: String(common), x: 700, y: 300, size: 60 }] },
    { say: "Ahora contamos los pedazos sumando los de arriba. El número de abajo conserva su tamaño. ¿Ahora sí? Sigamos.",
      draw: [{ op: "write", text: "Sumamos arriba; conservamos abajo", x: 80, y: 470, size: 38, color: "verde" }] },
  ];
}

export async function requestClarification(
  request: () => Promise<{ steps: Step[] }>,
  lesson: Lesson,
  signal: AbortSignal,
  timeoutMs = 10_000,
): Promise<{ steps: Step[]; fallback: boolean }> {
  if (signal.aborted) throw new DOMException("La pregunta se canceló.", "AbortError");
  let timer: ReturnType<typeof setTimeout> | undefined = undefined;
  let cancel: () => void = () => {};
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => {
        if (signal.aborted) throw new DOMException("La pregunta se canceló.", "AbortError");
        return request();
      }),
      new Promise<never>((_resolve, reject) => {
        cancel = () => reject(new DOMException("La pregunta se canceló.", "AbortError"));
        signal.addEventListener("abort", cancel, { once: true });
        timer = setTimeout(() => reject(new Error("La aclaración tardó demasiado.")), timeoutMs);
      }),
    ]);
    if (!result.steps.length) throw new Error("La aclaración llegó vacía.");
    return { steps: result.steps, fallback: false };
  } catch (error) {
    if (signal.aborted) throw error;
    return { steps: fallbackClarification(lesson), fallback: true };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
