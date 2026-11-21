/** Punta más arriba que la articulación media: índice, medio, anular, meñique. */
const EXTENDED_FINGER_JOINTS = [
  [8, 6],
  [12, 10],
  [16, 14],
  [20, 18],
] as const;

export type HandPoint = { y: number };

export type HandGesture = {
  categoryName?: string;
  score?: number;
};

export function countExtendedFingers(landmarks: readonly HandPoint[]): number {
  let count = 0;
  for (const [tip, middle] of EXTENDED_FINGER_JOINTS) {
    const tipPoint = landmarks[tip];
    const middlePoint = landmarks[middle];
    if (tipPoint && middlePoint && tipPoint.y < middlePoint.y) count += 1;
  }
  return count;
}

/**
 * Palma abierta (score ≥ 0.5), o la mano arriba (muñeca y < 0.55)
 * con al menos 3 dedos estirados aunque el gesto no se reconozca.
 */
export function isHandRaised(
  gesture: HandGesture | undefined,
  landmarks: readonly HandPoint[] | undefined,
): boolean {
  if (gesture?.categoryName === "Open_Palm" && (gesture.score ?? 0) >= 0.5) return true;
  const wrist = landmarks?.[0];
  if (!wrist || wrist.y >= 0.55 || !landmarks) return false;
  return countExtendedFingers(landmarks) >= 3;
}
