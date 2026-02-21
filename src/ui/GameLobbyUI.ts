import { MiniGameConfig } from "../minigame/MiniGame";

export interface GameLobbyCallbacks {
  getAvailableGames(): MiniGameConfig[];
  getConnectedPlayerIds(): string[];
  getPlayerName(id: string): string;
  getLocalPlayerId(): string | null;
  onStartGame(gameId: string, players: string[], cpuCount: number): void;
  isPlaying(): boolean;
  onStopGame(): void;
}

export class GameLobbyUI {
  private callbacks: GameLobbyCallbacks;
  private playBtn: HTMLButtonElement;
  private panel: HTMLDivElement | null = null;
  private isOpen = false;
  private selectedGameId: string | null = null;
  private cpuCount = 2;

  constructor(callbacks: GameLobbyCallbacks) {
    this.callbacks = callbacks;

    // Play button (top-left, next to debug button)
    this.playBtn = document.createElement("button");
    this.playBtn.textContent = "Play";
    this.playBtn.style.cssText =
      "position:fixed;left:62px;top:10px;height:40px;padding:0 16px;" +
      "border-radius:20px;border:2px solid rgba(100,200,100,0.5);" +
      "background:rgba(0,0,0,0.5);color:#6c6;font-size:14px;font-weight:bold;" +
      "cursor:pointer;z-index:100;font-family:sans-serif;" +
      "backdrop-filter:blur(4px);transition:background 0.15s,border-color 0.15s;";
    this.playBtn.addEventListener("click", () => this.toggle());
    this.playBtn.addEventListener("touchstart", (e) => e.stopPropagation());
    document.body.appendChild(this.playBtn);
  }

  private toggle(): void {
    if (this.callbacks.isPlaying()) {
      this.callbacks.onStopGame();
      this.playBtn.textContent = "Play";
      this.playBtn.style.borderColor = "rgba(100,200,100,0.5)";
      this.playBtn.style.color = "#6c6";
      return;
    }

    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    if (this.panel) return;
    this.isOpen = true;

    this.panel = document.createElement("div");
    this.panel.style.cssText =
      "position:fixed;left:62px;top:60px;width:280px;" +
      "background:rgba(10,10,30,0.9);border:1px solid rgba(100,200,100,0.3);" +
      "border-radius:10px;padding:16px;z-index:100;font-family:sans-serif;" +
      "color:#fff;backdrop-filter:blur(8px);pointer-events:auto;";

    this.renderPanel();
    document.body.appendChild(this.panel);
  }

  private close(): void {
    this.isOpen = false;
    this.selectedGameId = null;
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  private renderPanel(): void {
    if (!this.panel) return;

    const games = this.callbacks.getAvailableGames();
    const players = this.callbacks.getConnectedPlayerIds();
    const localId = this.callbacks.getLocalPlayerId();

    let html = `<div style="font-size:16px;font-weight:bold;margin-bottom:12px;color:#6c6">ミニゲーム</div>`;

    // Game selection
    html += `<div style="margin-bottom:12px">`;
    for (const g of games) {
      const selected = this.selectedGameId === g.id;
      const bg = selected ? "rgba(100,200,100,0.2)" : "rgba(255,255,255,0.05)";
      const border = selected ? "1px solid #6c6" : "1px solid rgba(255,255,255,0.1)";
      html +=
        `<div data-game-id="${g.id}" style="padding:10px;margin-bottom:6px;border-radius:6px;` +
        `background:${bg};border:${border};cursor:pointer;transition:background 0.15s">` +
        `<div style="font-weight:bold">${g.nameJa} (${g.name})</div>` +
        `<div style="font-size:12px;color:#aaa;margin-top:2px">${g.description}</div>` +
        `<div style="font-size:11px;color:#888;margin-top:2px">${g.minPlayers}-${g.maxPlayers}人 / ${g.durationSec}秒</div>` +
        `</div>`;
    }
    html += `</div>`;

    // CPU count selector
    const selectedGame = games.find((g) => g.id === this.selectedGameId);
    const maxCpu = selectedGame ? selectedGame.maxPlayers - players.length : 9;
    html += `<div style="margin-bottom:12px">`;
    html += `<div style="font-size:13px;color:#aaa;margin-bottom:6px">CPU人数</div>`;
    html += `<div style="display:flex;align-items:center;gap:8px">`;
    html += `<button data-action="cpu-dec" style="width:32px;height:32px;border-radius:50%;border:1px solid #888;` +
      `background:rgba(255,255,255,0.1);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">-</button>`;
    html += `<span style="font-size:20px;font-weight:bold;min-width:32px;text-align:center">${this.cpuCount}</span>`;
    html += `<button data-action="cpu-inc" style="width:32px;height:32px;border-radius:50%;border:1px solid #888;` +
      `background:rgba(255,255,255,0.1);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>`;
    html += `</div></div>`;

    // Player list
    const totalPlayers = players.length + this.cpuCount;
    html += `<div style="margin-bottom:12px">`;
    html += `<div style="font-size:13px;color:#aaa;margin-bottom:4px">参加者 (${totalPlayers}人)</div>`;
    for (const pid of players) {
      const name = this.callbacks.getPlayerName(pid);
      const isMe = pid === localId;
      const style = isMe ? "color:#ffdd44" : "color:#ccc";
      html += `<div style="padding:3px 8px;font-size:13px;${style}">${name}${isMe ? " (あなた)" : ""}</div>`;
    }
    if (this.cpuCount > 0) {
      html += `<div style="padding:3px 8px;font-size:13px;color:#8ad">CPU x${this.cpuCount}</div>`;
    }
    html += `</div>`;

    // Start button
    const canStart = selectedGame && totalPlayers >= selectedGame.minPlayers;
    const btnBg = canStart ? "linear-gradient(135deg,#4a9eff 0%,#0066cc 100%)" : "rgba(100,100,100,0.5)";
    const btnCursor = canStart ? "pointer" : "not-allowed";
    html +=
      `<button data-action="start" style="width:100%;padding:10px;border:none;border-radius:6px;` +
      `background:${btnBg};color:#fff;font-size:14px;font-weight:bold;` +
      `cursor:${btnCursor};font-family:sans-serif;">ゲーム開始</button>`;

    this.panel.innerHTML = html;

    // Bind game selection clicks
    const gameCards = this.panel.querySelectorAll<HTMLDivElement>("[data-game-id]");
    gameCards.forEach((card) => {
      card.addEventListener("click", () => {
        this.selectedGameId = card.getAttribute("data-game-id");
        this.renderPanel();
      });
    });

    // Bind CPU count buttons
    const decBtn = this.panel.querySelector<HTMLButtonElement>("[data-action='cpu-dec']");
    const incBtn = this.panel.querySelector<HTMLButtonElement>("[data-action='cpu-inc']");
    decBtn?.addEventListener("click", () => {
      if (this.cpuCount > 0) {
        this.cpuCount--;
        this.renderPanel();
      }
    });
    incBtn?.addEventListener("click", () => {
      if (this.cpuCount < Math.max(maxCpu, 9)) {
        this.cpuCount++;
        this.renderPanel();
      }
    });

    // Bind start button
    const startBtn = this.panel.querySelector<HTMLButtonElement>("[data-action='start']");
    if (startBtn && canStart) {
      startBtn.addEventListener("click", () => {
        if (this.selectedGameId) {
          this.callbacks.onStartGame(this.selectedGameId, players, this.cpuCount);
          this.close();
          this.playBtn.textContent = "Stop";
          this.playBtn.style.borderColor = "rgba(255,80,80,0.5)";
          this.playBtn.style.color = "#f66";
        }
      });
    }
  }

  /** Update button state when game ends externally */
  onGameEnded(): void {
    this.playBtn.textContent = "Play";
    this.playBtn.style.borderColor = "rgba(100,200,100,0.5)";
    this.playBtn.style.color = "#6c6";
  }

  dispose(): void {
    this.close();
    this.playBtn.remove();
  }
}
