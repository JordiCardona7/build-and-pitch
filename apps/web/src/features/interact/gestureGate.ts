/** Sostener 600 ms, bajar antes de repetir y dejar 3 s entre disparos. */
export class GestureGate {
  private startedAt: number | null = null;
  private previousAt: number | null = null;
  private lastTriggerAt = -Infinity;
  private armed = true;

  resetHold(): void {
    this.startedAt = null;
    this.previousAt = null;
  }

  update(raised: boolean, now: number): boolean {
    if (this.previousAt !== null && (now - this.previousAt > 250 || now < this.previousAt)) {
      this.startedAt = null;
    }
    this.previousAt = now;
    if (!raised) {
      this.startedAt = null;
      this.armed = true;
      return false;
    }
    if (!this.armed || now - this.lastTriggerAt < 3_000) return false;
    this.startedAt ??= now;
    if (now - this.startedAt < 600) return false;
    this.lastTriggerAt = now;
    this.armed = false;
    this.startedAt = null;
    return true;
  }
}
