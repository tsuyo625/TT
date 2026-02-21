import { MiniGame, MiniGameConfig, MiniGameCallbacks } from "./MiniGame";
import { CpuPlayerManager } from "./CpuPlayerManager";

const TAG_RANGE = 2.5; // distance to tag another player
const TAG_COOLDOWN = 2.0; // seconds before the new "it" can tag someone

export class TagGame extends MiniGame {
  static readonly CONFIG: MiniGameConfig = {
    id: "tag",
    name: "Tag",
    nameJa: "おにごっこ",
    description: "One player is the oni! Run away or tag others!",
    minPlayers: 2,
    maxPlayers: 10,
    durationSec: 90,
  };

  private cpuManager: CpuPlayerManager;
  private oniId: string | null = null; // current "it" player
  private scores: Map<string, number> = new Map(); // time spent NOT as oni (higher = better)
  private tagCooldown = 0;

  constructor(callbacks: MiniGameCallbacks, cpuManager: CpuPlayerManager) {
    super(TagGame.CONFIG, callbacks);
    this.cpuManager = cpuManager;
  }

  start(players: string[], hostId: string): void {
    this.active = true;
    this.hostId = hostId;
    this.players = new Set(players);
    this.timeRemaining = this.config.durationSec;
    this.tagCooldown = 0;

    // Initialize scores
    this.scores.clear();
    for (const p of players) {
      this.scores.set(p, 0);
    }

    // Pick random oni
    const arr = Array.from(players);
    this.oniId = arr[Math.floor(Math.random() * arr.length)];

    const localId = this.callbacks.getLocalPlayerId();
    if (localId === hostId) {
      // Host broadcasts game start with the chosen oni
      this.callbacks.sendAction("tag_start", {
        oniId: this.oniId,
        players: arr,
      });
    }

    const oniName = this.getPlayerName(this.oniId!);
    this.callbacks.showMessage(`おにごっこ開始! ${oniName} が鬼だ!`);
  }

  update(dt: number): void {
    if (!this.active) return;

    this.timeRemaining -= dt;
    if (this.tagCooldown > 0) this.tagCooldown -= dt;

    // Accumulate score for non-oni players
    for (const p of this.players) {
      if (p !== this.oniId) {
        this.scores.set(p, (this.scores.get(p) ?? 0) + dt);
      }
    }

    // Time's up
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.endGame();
      return;
    }

    // Build combined positions (real + cpu) for AI and tag checks
    const allPositions = this.getAllPositions();

    // Update CPU AI
    this.cpuManager.update(dt, this.oniId, allPositions);

    // Check tags
    this.checkAllTags(allPositions);
  }

  /** Get positions of all participants (local, remote, cpu) */
  private getAllPositions(): Map<string, { x: number; y: number; z: number }> {
    const positions = new Map<string, { x: number; y: number; z: number }>();

    // Local player
    const localId = this.callbacks.getLocalPlayerId();
    if (localId && this.players.has(localId)) {
      positions.set(localId, this.callbacks.getLocalPosition());
    }

    // Remote players
    const remotes = this.callbacks.getRemotePositions();
    for (const [id, pos] of remotes) {
      if (this.players.has(id)) {
        positions.set(id, pos);
      }
    }

    // CPU players
    const cpuPositions = this.cpuManager.getAllPositions();
    for (const [id, pos] of cpuPositions) {
      if (this.players.has(id)) {
        positions.set(id, pos);
      }
    }

    return positions;
  }

  /** Check tags from all oni sources (local player if oni, and cpu if oni) */
  private checkAllTags(allPositions: Map<string, { x: number; y: number; z: number }>): void {
    if (this.tagCooldown > 0 || !this.oniId) return;

    const oniPos = allPositions.get(this.oniId);
    if (!oniPos) return;

    const localId = this.callbacks.getLocalPlayerId();
    // Only the host checks CPU-oni tags, and local player checks their own oni
    const isLocalOni = this.oniId === localId;
    const isCpuOni = this.cpuManager.isCpu(this.oniId);
    const isHost = localId === this.hostId;

    if (!isLocalOni && !(isCpuOni && isHost)) return;

    for (const [playerId, pos] of allPositions) {
      if (playerId === this.oniId) continue;
      if (!this.players.has(playerId)) continue;

      const dx = oniPos.x - pos.x;
      const dz = oniPos.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < TAG_RANGE) {
        this.oniId = playerId;
        this.tagCooldown = TAG_COOLDOWN;
        this.callbacks.sendAction("tag_tagged", { newOniId: playerId });
        const name = this.getPlayerName(playerId);
        this.callbacks.showMessage(`${name} が鬼になった!`);
        break;
      }
    }
  }

  handleAction(playerId: string, action: string, params: unknown): void {
    if (action === "tag_start") {
      const p = params as { oniId: string; players: string[] };
      this.oniId = p.oniId;
      this.players = new Set(p.players);
      this.scores.clear();
      for (const pl of p.players) {
        this.scores.set(pl, 0);
      }
      this.timeRemaining = this.config.durationSec;
      this.tagCooldown = 0;
      this.active = true;

      const oniName = this.getPlayerName(this.oniId);
      this.callbacks.showMessage(`おにごっこ開始! ${oniName} が鬼だ!`);
    }

    if (action === "tag_tagged") {
      const p = params as { newOniId: string };
      this.oniId = p.newOniId;
      this.tagCooldown = TAG_COOLDOWN;
      const name = this.getPlayerName(p.newOniId);
      this.callbacks.showMessage(`${name} が鬼になった!`);
    }
  }

  getOverlayHtml(): string {
    const secs = Math.ceil(this.timeRemaining);
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    const timeStr = `${min}:${sec.toString().padStart(2, "0")}`;

    const localId = this.callbacks.getLocalPlayerId();
    const isOni = localId === this.oniId;
    const oniName = this.oniId ? this.getPlayerName(this.oniId) : "???";

    const roleText = isOni
      ? '<span style="color:#ff4444;font-weight:bold">あなたが鬼!</span>'
      : '<span style="color:#44ff44">逃げろ!</span>';

    // Build scoreboard
    const sorted = Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const scoreLines = sorted
      .map(([id, score]) => {
        const name = this.getPlayerName(id);
        const isMe = id === localId;
        const isIt = id === this.oniId;
        const marker = isIt ? " [鬼]" : "";
        const style = isMe ? "color:#ffdd44" : "color:#ccc";
        return `<span style="${style}">${name}${marker}: ${Math.floor(score)}pt</span>`;
      })
      .join("<br>");

    return (
      `<div style="font-size:18px;font-weight:bold;margin-bottom:4px">おにごっこ</div>` +
      `<div style="font-size:24px;margin-bottom:4px">${timeStr}</div>` +
      `<div style="margin-bottom:6px">鬼: ${oniName}</div>` +
      `<div style="margin-bottom:6px">${roleText}</div>` +
      `<div style="font-size:12px;text-align:left">${scoreLines}</div>`
    );
  }

  /** Get player name, handling both real players and CPU */
  private getPlayerName(id: string): string {
    const cpuName = this.cpuManager.getName(id);
    if (cpuName) return cpuName;
    return this.callbacks.getPlayerName(id);
  }

  private endGame(): void {
    this.active = false;

    // Find winner (highest score = spent most time NOT as oni)
    let winnerId = "";
    let best = -1;
    for (const [id, score] of this.scores) {
      if (score > best) {
        best = score;
        winnerId = id;
      }
    }

    const winnerName = winnerId ? this.getPlayerName(winnerId) : "???";
    this.callbacks.showMessage(`おにごっこ終了! ${winnerName} の勝ち! (${Math.floor(best)}pt)`);
  }

  stop(): void {
    this.active = false;
    this.callbacks.showMessage("おにごっこ中止");
  }
}
