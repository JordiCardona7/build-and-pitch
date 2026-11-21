import type { Exercise, Lesson, Op } from "@/shared/api";

export function problemLesson(exercise: Exercise): Lesson {
  return {
    id: `preview:${exercise.id}`,
    title: "Tu problema",
    error_code: null,
    level: null,
    steps: [
      {
        say: "Resuelve en tu hoja.",
        draw: [
          { op: "write", text: "Resuelve en tu hoja", x: 70, y: 140, size: 40, color: "azul" },
          { op: "frac", num: String(exercise.a.n), den: String(exercise.a.d), x: 250, y: 330, size: 72 },
          { op: "write", text: "+", x: 400, y: 350, size: 72, anchor: "middle" },
          { op: "frac", num: String(exercise.b.n), den: String(exercise.b.d), x: 550, y: 330, size: 72 },
        ],
      },
    ],
  };
}

export function quizLesson(id: string, prompt: string, draw: Op[]): Lesson {
  return {
    id: `quiz:${id}`,
    title: prompt,
    error_code: null,
    level: null,
    steps: [{ say: prompt, draw }],
  };
}
