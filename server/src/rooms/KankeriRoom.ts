import { Room, Client } from "colyseus";
import { GameState, PlayerState, CanState } from "../schema/GameState.js";

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;
const COUNTDOWN_TIME = 10;
const GAME_TIME = 120; // 2 minutes

const HIDER_SPAWNS = [
  { x: -12, z: -10 },
  { x: 12, z: -10 },
  { x: -12, z: 10 },
  { x: 12, z: 10 },
  { x: -10, z: 0 },
  { x: 10, z: 0 },
];

const SEEKER_SPAWN = { x: 0, z: 1.5 };

export class KankeriRoom extends Room<GameState> {
  private gameInterval: ReturnType<typeof setInterval> | null = null;
  private seekerId: string | null = null;

  onCreate(): void {
    this.setState(new GameState());
    this.maxClients = MAX_PLAYERS;
    this.state.can = new CanState();

    // Handle player position updates
    this.onMessage("position", (client, data: { x: number; z: number; rotation: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.z = data.z;
        player.rotation = data.rotation;
      }
    });

    // Handle can kick
    this.onMessage("kick", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== "hider" || player.captured) return;
      if (this.state.phase !== "seeking") return;

      this.state.can.kicked = true;

      // Free all captured hiders
      this.state.players.forEach((p) => {
        if (p.role === "hider" && p.captured) {
          p.captured = false;
          this.state.capturedCount = Math.max(0, this.state.capturedCount - 1);
        }
      });

      this.broadcast("kicked", { by: client.sessionId });

      // Reset can after delay
      this.clock.setTimeout(() => {
        this.state.can.x = 0;
        this.state.can.y = 0.2;
        this.state.can.z = 0;
        this.state.can.kicked = false;
      }, 3000);
    });

    // Handle seeker finding a hider
    this.onMessage("find", (client, data: { targetId: string }) => {
      if (client.sessionId !== this.seekerId) return;
      if (this.state.phase !== "seeking") return;

      const target = this.state.players.get(data.targetId);
      if (target && target.role === "hider" && !target.captured) {
        target.captured = true;
        this.state.capturedCount++;
        this.broadcast("found", { targetId: data.targetId, by: client.sessionId });

        // Check win condition
        this.checkWinCondition();
      }
    });

    // Auto-start when enough players
    this.onMessage("ready", () => {
      if (this.state.phase === "lobby" && this.state.players.size >= MIN_PLAYERS) {
        this.startGame();
      }
    });
  }

  onJoin(client: Client, options: { name?: string }): void {
    const player = new PlayerState();
    const idx = this.state.players.size;
    const spawn = HIDER_SPAWNS[idx % HIDER_SPAWNS.length];

    player.x = spawn.x;
    player.z = spawn.z;
    player.name = options.name || `Player${idx + 1}`;
    player.role = "hider";

    this.state.players.set(client.sessionId, player);

    // Auto-start when enough players join
    if (this.state.phase === "lobby" && this.state.players.size >= MIN_PLAYERS) {
      this.clock.setTimeout(() => {
        if (this.state.phase === "lobby" && this.state.players.size >= MIN_PLAYERS) {
          this.startGame();
        }
      }, 3000);
    }
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);

    if (client.sessionId === this.seekerId) {
      // Seeker left -> end game
      this.endGame("hider");
    }

    // Not enough players
    if (this.state.players.size < MIN_PLAYERS && this.state.phase !== "lobby") {
      this.endGame("draw");
    }
  }

  private startGame(): void {
    // Pick random seeker
    const ids = Array.from(this.state.players.keys());
    this.seekerId = ids[Math.floor(Math.random() * ids.length)];

    // Assign roles and positions
    let hiderIdx = 0;
    this.state.players.forEach((player, id) => {
      if (id === this.seekerId) {
        player.role = "seeker";
        player.x = SEEKER_SPAWN.x;
        player.z = SEEKER_SPAWN.z;
      } else {
        player.role = "hider";
        const spawn = HIDER_SPAWNS[hiderIdx % HIDER_SPAWNS.length];
        player.x = spawn.x;
        player.z = spawn.z;
        hiderIdx++;
      }
      player.captured = false;
    });

    // Reset can
    this.state.can.x = 0;
    this.state.can.y = 0.2;
    this.state.can.z = 0;
    this.state.can.kicked = false;
    this.state.capturedCount = 0;

    // Countdown phase
    this.state.phase = "countdown";
    this.state.timer = COUNTDOWN_TIME;

    this.gameInterval = setInterval(() => {
      this.state.timer -= 1;

      if (this.state.phase === "countdown" && this.state.timer <= 0) {
        this.state.phase = "seeking";
        this.state.timer = GAME_TIME;
      } else if (this.state.phase === "seeking" && this.state.timer <= 0) {
        this.endGame("hider"); // Time's up, hiders win
      }
    }, 1000);
  }

  private checkWinCondition(): void {
    let totalHiders = 0;
    let capturedHiders = 0;

    this.state.players.forEach((p) => {
      if (p.role === "hider") {
        totalHiders++;
        if (p.captured) capturedHiders++;
      }
    });

    if (capturedHiders >= totalHiders) {
      this.endGame("seeker");
    }
  }

  private endGame(winner: string): void {
    this.state.phase = "finished";
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    this.broadcast("gameOver", { winner });

    // Reset after delay
    this.clock.setTimeout(() => {
      this.state.phase = "lobby";
      this.state.timer = 0;
      this.state.capturedCount = 0;
      this.seekerId = null;
      this.state.players.forEach((p) => {
        p.role = "hider";
        p.captured = false;
      });
    }, 5000);
  }

  onDispose(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
  }
}
