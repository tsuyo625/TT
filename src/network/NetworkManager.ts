import { Client, Room } from "colyseus.js";

export interface NetworkPlayerState {
  x: number;
  z: number;
  rotation: number;
  role: "seeker" | "hider";
  captured: boolean;
  name: string;
}

export interface NetworkCanState {
  x: number;
  y: number;
  z: number;
  kicked: boolean;
}

export interface NetworkGameState {
  players: Map<string, NetworkPlayerState>;
  can: NetworkCanState;
  phase: "lobby" | "countdown" | "seeking" | "finished";
  timer: number;
  capturedCount: number;
}

export class NetworkManager {
  private client: Client;
  private room: Room | null = null;

  private stateCallbacks: ((state: NetworkGameState) => void)[] = [];
  private messageCallbacks = new Map<string, (data: unknown) => void>();

  private lastSendTime = 0;
  private sendInterval = 50; // ms between position updates

  get sessionId(): string {
    return this.room?.sessionId ?? "";
  }

  get connected(): boolean {
    return this.room !== null;
  }

  constructor(serverUrl: string) {
    this.client = new Client(serverUrl);
  }

  async joinOrCreate(name: string): Promise<number> {
    this.room = await this.client.joinOrCreate("kankeri", { name });

    // Set up state listener
    this.room.onStateChange((state) => {
      const mapped = this.mapState(state);
      for (const cb of this.stateCallbacks) {
        cb(mapped);
      }
    });

    // Forward messages
    for (const [type, cb] of this.messageCallbacks) {
      this.room.onMessage(type, cb);
    }

    // Determine player index
    let idx = 0;
    state: for (const key of (this.room.state as Record<string, unknown> & { players: Map<string, unknown> }).players.keys()) {
      if (key === this.room.sessionId) break state;
      idx++;
    }

    return idx;
  }

  private mapState(raw: unknown): NetworkGameState {
    const state = raw as {
      players: Map<string, NetworkPlayerState>;
      can: NetworkCanState;
      phase: string;
      timer: number;
      capturedCount: number;
    };

    return {
      players: state.players,
      can: state.can,
      phase: state.phase as NetworkGameState["phase"],
      timer: state.timer,
      capturedCount: state.capturedCount,
    };
  }

  onStateChange(cb: (state: NetworkGameState) => void): void {
    this.stateCallbacks.push(cb);
  }

  onMessage(type: string, cb: (data: unknown) => void): void {
    this.messageCallbacks.set(type, cb);
    // If already connected, register immediately
    if (this.room) {
      this.room.onMessage(type, cb);
    }
  }

  sendPosition(x: number, z: number, rotation: number): void {
    const now = Date.now();
    if (now - this.lastSendTime < this.sendInterval) return;
    this.lastSendTime = now;

    this.room?.send("position", { x, z, rotation });
  }

  sendKick(): void {
    this.room?.send("kick", {});
  }

  sendFind(targetId: string): void {
    this.room?.send("find", { targetId });
  }

  sendReady(): void {
    this.room?.send("ready", {});
  }

  async leave(): Promise<void> {
    await this.room?.leave();
    this.room = null;
  }
}
