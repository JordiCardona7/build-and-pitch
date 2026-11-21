/** Sostener 400 ms, tolerar un fallo de menos de 200 ms y huecos de hasta 500 ms. 3 s entre disparos. */
export class GestureGate {
  private startedAt: number | null = null;
  private previousAt: number | null = null;
  private negativeSince: number | null = null;
  private lastTriggerAt = -Infinity;
  private armed = true;

  resetHold(): void {
    this.startedAt = null;
    this.previousAt = null;
    this.negativeSince = null;
  }

  update(raised: boolean, now: number): boolean {
    if (this.previousAt !== null && (now - this.previousAt > 500 || now < this.previousAt)) {
      this.startedAt = null;
      this.negativeSince = null;
    }
    this.previousAt = now;

    if (!raised) {
      if (this.startedAt !== null) {
        this.negativeSince ??= now;
        if (now - this.negativeSince >= 200) {
          this.startedAt = null;
          this.negativeSince = null;
          this.armed = true;
        }
      } else {
        this.armed = true;
      }
      return false;
    }

    this.negativeSince = null;
    if (!this.armed || now - this.lastTriggerAt < 3_000) return false;
    this.startedAt ??= now;
    if (now - this.startedAt < 400) return false;
    this.lastTriggerAt = now;
    this.armed = false;
    this.startedAt = null;
    return true;
  }
}
