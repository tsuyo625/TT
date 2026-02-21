import { MiniGame, MiniGameConfig, MiniGameCallbacks } from "./MiniGame";
import { TagGame } from "./TagGame";

export type MiniGameFactory = (callbacks: MiniGameCallbacks) => MiniGame;

interface GameEntry {
  config: MiniGameConfig;
  factory: MiniGameFactory;
}

export class MiniGameManager {
  private registry: Map<string, GameEntry> = new Map();
  private currentGame: MiniGame | null = null;
  private callbacks: MiniGameCallbacks;
  private overlay: HTMLDivElement | null = null;

  constructor(callbacks: MiniGameCallbacks) {
    this.callbacks = callbacks;
    this.registerBuiltInGames();
  }

  private registerBuiltInGames(): void {
    this.register(TagGame.CONFIG, (cb) => new TagGame(cb));
  }

  register(config: MiniGameConfig, factory: MiniGameFactory): void {
    this.registry.set(config.id, { config, factory });
  }

  getAvailableGames(): MiniGameConfig[] {
    return Array.from(this.registry.values()).map((e) => e.config);
  }

  /** Start a game by id */
  startGame(gameId: string, players: string[], hostId: string): void {
    if (this.currentGame?.isActive()) {
      this.currentGame.stop();
      this.removeOverlay();
    }

    const entry = this.registry.get(gameId);
    if (!entry) return;

    this.currentGame = entry.factory(this.callbacks);
    this.currentGame.start(players, hostId);
    this.createOverlay();
  }

  /** Handle incoming network action */
  handleAction(playerId: string, action: string, params: unknown): void {
    // Handle game management actions
    if (action === "minigame_start") {
      const p = params as { gameId: string; players: string[]; hostId: string };
      this.startGame(p.gameId, p.players, p.hostId);
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
