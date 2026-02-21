/** Configuration for a mini-game type */
export interface MiniGameConfig {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  durationSec: number;
}

/** Callbacks provided by the scene to the mini-game */
export interface MiniGameCallbacks {
  getLocalPosition(): { x: number; y: number; z: number };
  getRemotePositions(): Map<string, { x: number; y: number; z: number }>;
  sendAction(action: string, params: unknown): void;
  showMessage(msg: string): void;
  getLocalPlayerId(): string | null;
  getPlayerName(id: string): string;
  spawnCpuVisuals(cpus: { id: string; x: number; z: number }[]): void;
  despawnCpuVisuals(): void;
  updateCpuVisuals(positions: Map<string, { x: number; y: number; z: number }>): void;
}

/** Base class for all mini-games */
export abstract class MiniGame {
  readonly config: MiniGameConfig;
  protected callbacks: MiniGameCallbacks;
  protected active = false;
  protected hostId: string | null = null;
  protected players: Set<string> = new Set();
  protected timeRemaining = 0;

  constructor(config: MiniGameConfig, callbacks: MiniGameCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /** Start the game with the given players */
  abstract start(players: string[], hostId: string): void;

  /** Called every frame while game is active */
  abstract update(dt: number): void;

  /** Handle a network action from another player */
  abstract handleAction(playerId: string, action: string, params: unknown): void;

  /** Return HTML for the in-game HUD overlay */
  abstract getOverlayHtml(): string;

  /** Stop the game and clean up */
  abstract stop(): void;

  isActive(): boolean {
    return this.active;
  }
}
