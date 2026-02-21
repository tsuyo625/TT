import { MiniGame, MiniGameConfig, MiniGameCallbacks } from "./MiniGame";
import { TagGame } from "./TagGame";
import { CpuPlayerManager } from "./CpuPlayerManager";

export type MiniGameFactory = (callbacks: MiniGameCallbacks, cpuManager: CpuPlayerManager) => MiniGame;

interface GameEntry {
  config: MiniGameConfig;
  factory: MiniGameFactory;
}

export class MiniGameManager {
  private registry: Map<string, GameEntry> = new Map();
  private currentGame: MiniGame | null = null;
  private callbacks: MiniGameCallbacks;
  private overlay: HTMLDivElement | null = null;
  private cpuManager: CpuPlayerManager = new CpuPlayerManager();

  constructor(callbacks: MiniGameCallbacks) {
    this.callbacks = callbacks;
    this.registerBuiltInGames();
  }

  private registerBuiltInGames(): void {
    this.register(TagGame.CONFIG, (cb, cpu) => new TagGame(cb, cpu));
  }

  register(config: MiniGameConfig, factory: MiniGameFactory): void {
    this.registry.set(config.id, { config, factory });
  }

  getAvailableGames(): MiniGameConfig[] {
    return Array.from(this.registry.values()).map((e) => e.config);
  }

  /** Start a game by id */
  startGame(gameId: string, players: string[], hostId: string, cpuCount = 0): void {
    if (this.currentGame?.isActive()) {
      this.currentGame.stop();
      this.removeOverlay();
    }

    const entry = this.registry.get(gameId);
    if (!entry) return;

    // Spawn CPUs near the local player
    const localPos = this.callbacks.getLocalPosition();
    this.cpuManager = new CpuPlayerManager(localPos.x, localPos.z);
    const cpuIds = this.cpuManager.spawn(cpuCount);
    const allPlayers = [...players, ...cpuIds];

    this.currentGame = entry.factory(this.callbacks, this.cpuManager);
    this.currentGame.start(allPlayers, hostId);
    this.createOverlay();
  }

  /** Handle incoming network action */
  handleAction(playerId: string, action: string, params: unknown): void {
    // Handle game management actions
    if (action === "minigame_start") {
      const p = params as { gameId: string; players: string[]; hostId: string; cpuCount?: number };
      this.startGame(p.gameId, p.players, p.hostId, p.cpuCount ?? 0);
      return;
    }

    if (action === "minigame_stop") {
      this.stopCurrentGame();
      return;
    }

    // Forward to current game
    this.currentGame?.handleAction(playerId, action, params);
  }

  update(dt: number): void {
    if (!this.currentGame?.isActive()) {
      if (this.currentGame) {
        this.removeOverlay();
        this.currentGame = null;
        this.cpuManager.clear();
      }
      return;
    }

    this.currentGame.update(dt);
    this.updateOverlay();
  }

  stopCurrentGame(): void {
    if (this.currentGame) {
      this.currentGame.stop();
      this.removeOverlay();
      this.currentGame = null;
      this.cpuManager.clear();
    }
  }

  isPlaying(): boolean {
    return this.currentGame?.isActive() ?? false;
  }

  private createOverlay(): void {
    if (this.overlay) return;
    this.overlay = document.createElement("div");
    this.overlay.id = "minigame-overlay";
    this.overlay.style.cssText =
      "position:fixed;top:60px;left:50%;transform:translateX(-50%);" +
      "padding:8px 16px;border-radius:8px;" +
      "background:rgba(0,0,0,0.6);color:#fff;font-family:sans-serif;" +
      "font-size:14px;z-index:50;pointer-events:none;text-align:center;" +
      "backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.15);";
    document.body.appendChild(this.overlay);
  }

  private updateOverlay(): void {
    if (!this.overlay || !this.currentGame) return;
    this.overlay.innerHTML = this.currentGame.getOverlayHtml();
  }

  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
