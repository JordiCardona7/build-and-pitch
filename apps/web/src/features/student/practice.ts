import type { Diagnosis, LightStatus } from "../../shared/api/types";
import type { SoloSession } from "./session";

export function nextPracticeSession(current: SoloSession, diagnosis: Pick<Diagnosis, "correct" | "error_code" | "status">): SoloSession {
  if (diagnosis.status !== "done") return current;
  if (!diagnosis.correct) return { ...current, postLessonStreak: 0, targetError: diagnosis.error_code ?? current.targetError };
  const streak = current.lessonArmed ? current.postLessonStreak + 1 : 0;
  const verified = !current.lessonArmed || streak >= 2;
  return {
    ...current, postLessonStreak: streak,
    targetError: verified ? null : current.targetError,
    difficulty: verified ? Math.min(3, current.difficulty + 1) as 1 | 2 | 3 : current.difficulty,
  };
}

export function confirmedGreen(session: SoloSession, serverStatus: LightStatus): boolean {
  return serverStatus === "verde" && (!session.lessonArmed || session.postLessonStreak >= 2);
}
