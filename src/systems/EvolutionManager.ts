import type { EvolutionType, EvolutionDefinition } from "../types";
import { DeathTracker } from "./DeathTracker";

const EVOLUTIONS: EvolutionDefinition[] = [
  { type: "wings", triggerCause: "fall", name: "Wings", description: "Double jump unlocked" },
  { type: "power", triggerCause: "enemy", name: "Rage", description: "Attack power x2" },
  { type: "speed", triggerCause: "timeout", name: "Haste", description: "Movement speed +50%" },
];

export class EvolutionManager {
  private currentEvolution: EvolutionType | null = null;

  checkEvolution(tracker: DeathTracker): EvolutionDefinition | null {
    if (this.currentEvolution !== null) return null;

    const most = tracker.getMostFrequent();
    if (!most) return null;

    const evo = EVOLUTIONS.find((e) => e.triggerCause === most.cause);
    if (evo) {
      this.currentEvolution = evo.type;
      return evo;
    }
    return null;
  }

  getCurrentEvolution(): EvolutionType | null {
    return this.currentEvolution;
  }

  getDefinitions(): EvolutionDefinition[] {
    return EVOLUTIONS;
  }

  reset(): void {
    this.currentEvolution = null;
  }
}
