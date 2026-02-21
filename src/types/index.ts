export type DeathCause = "fall" | "enemy" | "timeout";

export type EvolutionType = "wings" | "power" | "speed";

export interface EvolutionDefinition {
  type: EvolutionType;
  triggerCause: DeathCause;
  name: string;
  description: string;
}

export interface RunStats {
  deathCounts: Record<DeathCause, number>;
  totalDeaths: number;
  evolution: EvolutionType | null;
  timeElapsed: number;
  won: boolean;
}
