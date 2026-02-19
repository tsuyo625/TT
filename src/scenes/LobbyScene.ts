export class LobbyScene {
  private container: HTMLDivElement;
  onJoin: ((name: string) => void) | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.innerHTML = `
      <style>
        .lobby-screen {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; z-index: 100;
          font-family: 'Segoe UI', sans-serif;
        }
        .lobby-title {
          font-size: 24px; color: #e94560; font-weight: bold; margin-bottom: 30px;
        }
        .lobby-input {
          background: rgba(255,255,255,0.1); border: 2px solid #e94560;
          color: #fff; padding: 12px 20px; border-radius: 12px;
          font-size: 18px; text-align: center; width: 200px;
          margin-bottom: 20px; outline: none;
        }
        .lobby-input::placeholder { color: #666; }
        .lobby-join {
          background: #e74c3c; color: #fff; border: none;
          padding: 14px 40px; border-radius: 25px; font-size: 18px;
          font-weight: bold; cursor: pointer;
        }
        .lobby-join:active { transform: scale(0.95); }
        .lobby-players {
          margin-top: 30px; color: #a0a0c0; font-size: 14px;
        }
        .lobby-status {
          margin-top: 10px; color: #777; font-size: 13px;
        }
      </style>
      <div class="lobby-screen">
        <div class="lobby-title">ルームに参加</div>
        <input class="lobby-input" type="text" placeholder="名前を入力" maxlength="8" />
        <button class="lobby-join">参加する</button>
        <div class="lobby-players"></div>
        <div class="lobby-status"></div>
      </div>
    `;
    document.body.appendChild(this.container);

    const input = this.container.querySelector<HTMLInputElement>(".lobby-input")!;
    const joinBtn = this.container.querySelector(".lobby-join")!;

    joinBtn.addEventListener("click", () => {
      const name = input.value.trim() || `Player${Math.floor(Math.random() * 100)}`;
      this.onJoin?.(name);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        joinBtn.dispatchEvent(new Event("click"));
      }
    });
  }

  setStatus(text: string): void {
    this.container.querySelector<HTMLDivElement>(".lobby-status")!.textContent = text;
  }

  setPlayers(count: number, max: number): void {
    this.container.querySelector<HTMLDivElement>(".lobby-players")!.textContent =
      `プレイヤー: ${count} / ${max}`;
  }

  dispose(): void {
    this.container.remove();
  }
}
