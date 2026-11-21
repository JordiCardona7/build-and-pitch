import type { Lesson } from "./types";

/** JSON is an untrusted boundary. Unknown operations are deliberately allowed
 * (CONTRACTS.md §3); malformed known operations get an actionable message. */
const fields: Record<string, string[]> = {
  write: ["text", "x", "y"],
  frac: ["num", "den", "x", "y"],
  pie: ["cx", "cy", "r", "parts", "shade"],
  bar: ["x", "y", "w", "h", "parts", "shade"],
  line: ["x1", "y1", "x2", "y2"],
  arrow: ["x1", "y1", "x2", "y2"],
  rect: ["x", "y", "w", "h"],
  circle: ["cx", "cy", "rx"],
  underline: ["x", "y", "w"],
  cross: ["x", "y", "w", "h"],
  clear: [],
  wait: ["ms"],
};
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export function parseLesson(json: string): Lesson {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error(
      "Revisa el JSON: hay una coma, comilla o llave fuera de lugar.",
    );
  }
  if (
    !record(value) ||
    typeof value.title !== "string" ||
    !Array.isArray(value.steps) ||
    !value.steps.length
  )
    throw new Error(
      "La lección necesita un título y al menos un paso en steps.",
    );
  if (value.steps.length > 100)
    throw new Error("Prueba con una lección de hasta 100 pasos.");
  value.steps.forEach((step: unknown, index: number) => {
    const fail = (message: string): never => {
      throw new Error(`Paso ${index + 1}: ${message}`);
    };
    if (
      !record(step) ||
      typeof step.say !== "string" ||
      !Array.isArray(step.draw)
    )
      return fail("necesita say (texto) y draw (lista).");
    if (step.draw.length > 200)
      return fail("usa hasta 200 operaciones por paso.");
    if (
      step.checkpoint != null &&
      (!record(step.checkpoint) ||
        typeof step.checkpoint.prompt !== "string" ||
        typeof step.checkpoint.answer !== "string")
    )
      return fail("checkpoint necesita prompt y answer como texto.");
    step.draw.forEach((op: unknown) => {
      if (!record(op) || typeof op.op !== "string")
        return fail("cada dibujo necesita el campo op.");
      if (!Object.prototype.hasOwnProperty.call(fields, op.op)) return;
      for (const field of fields[op.op] ?? []) {
        const item = op[field];
        if (["text", "num", "den"].includes(field)) {
          if (
            typeof item !== "string" &&
            !(
              field !== "text" &&
              typeof item === "number" &&
              Number.isFinite(item)
            )
          )
            return fail(`${op.op}.${field} necesita texto o un número válido.`);
          if (String(item).length > 1000)
            return fail(`${op.op}.${field} es demasiado largo.`);
        } else if (typeof item !== "number" || !Number.isFinite(item))
          return fail(`${op.op}.${field} necesita un número válido.`);
      }
      if (op.op === "frac") {
        op.num = String(op.num);
        op.den = String(op.den);
      }
      for (const field of ["size", "width", "ry"])
        if (
          op[field] !== undefined &&
          (typeof op[field] !== "number" ||
            !Number.isFinite(op[field]) ||
            op[field] <= 0)
        )
          return fail(`${op.op}.${field} debe ser mayor que cero.`);
      for (const field of ["parts", "r", "rx", "w", "h"])
        if (
          typeof op[field] === "number" &&
          (op[field] <= 0 || op[field] > 10000)
        )
          return fail(`${op.op}.${field} debe estar entre 0 y 10000.`);
      if (typeof op.ms === "number" && (op.ms < 0 || op.ms > 60000))
        return fail("wait.ms debe estar entre 0 y 60000.");
      if (
        op.color !== undefined &&
        !["negro", "azul", "rojo", "verde", "morado", "naranja"].includes(
          String(op.color),
        )
      )
        return fail("usa un color de marcador del contrato.");
    });
  });
  // Keep full API payload metadata while accepting the old prototype fixtures.
  return {
    ...value,
    id: typeof value.id === "string" ? value.id : "board:preview",
    error_code: value.error_code ?? null,
    level: value.level ?? null,
  } as Lesson;
}
