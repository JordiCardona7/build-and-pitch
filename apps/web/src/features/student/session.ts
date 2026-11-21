import type { ErrorCode } from "@/shared/api";

const KEY = "pizarra.alumno";
let memory: SoloSession | null = null;

export type SoloSession = {
  id: string;
  name: string;
  classCode: string | null;
  difficulty: 1 | 2 | 3;
  targetError: ErrorCode | null;
  /** Aciertos seguidos después de ver una clase. */
  postLessonStreak: number;
  /** La última clase ya se marcó como vista. */
  lessonArmed: boolean;
};

function isDifficulty(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

export function loadSession(): SoloSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return memory;
    const data = JSON.parse(raw) as Partial<SoloSession>;
    if (!data || typeof data.id !== "string" || !data.id || typeof data.name !== "string" || !data.name) return null;
    return {
      id: data.id,
      name: data.name,
      classCode: typeof data.classCode === "string" ? data.classCode : null,
      difficulty: isDifficulty(data.difficulty) ? data.difficulty : 1,
      targetError: data.targetError ?? null,
      postLessonStreak: typeof data.postLessonStreak === "number" && Number.isSafeInteger(data.postLessonStreak) && data.postLessonStreak >= 0 ? data.postLessonStreak : 0,
      lessonArmed: Boolean(data.lessonArmed),
    };
  } catch {
    return memory;
  }
}

export function saveSession(session: SoloSession): void {
  memory = session;
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* Sigue en memoria. */ }
}

export function clearSession(): void {
  memory = null;
  try { localStorage.removeItem(KEY); } catch { /* Sin almacenamiento disponible. */ }
}
