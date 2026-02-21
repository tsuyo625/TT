import type { DeathCause } from "../types";
import { EVOLUTION_THRESHOLD } from "../config/Constants";

export class DeathTracker {
  private counts: Record<DeathCause, number> = {
    fall: 0,
    enemy: 0,
    timeout: 0,
  };

  recordDeath(cause: DeathCause): void {
    this.counts[cause]++;
  }

  getCount(cause: DeathCause): number {
    return this.counts[cause];
  }

  getMostFrequent(): { cause: DeathCause; count: number } | null {
    let maxCause: DeathCause | null = null;
    let maxCount = 0;
    for (const [cause, count] of Object.entries(this.counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxCause = cause as DeathCause;
      }
    }
    if (maxCause && maxCount >= EVOLUTION_THRESHOLD) {
      return { cause: maxCause, count: maxCount };
    }
    return null;
  }

  getTotalDeaths(): number {
    return Object.values(this.counts).reduce((a, b) => a + b, 0);
  }

  getAllCounts(): Record<DeathCause, number> {
    return { ...this.counts };
  }

  reset(): void {
    this.counts = { fall: 0, enemy: 0, timeout: 0 };
  }
}
