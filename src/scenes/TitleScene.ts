export class TitleScene {
  private container: HTMLDivElement;
  onOffline: (() => void) | null = null;
  onOnline: (() => void) | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.innerHTML = `
      <style>
        .title-screen {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; z-index: 100;
          font-family: 'Segoe UI', sans-serif;
          -webkit-tap-highlight-color: transparent;
        }
        .title-can {
          width: 60px; height: 80px; background: #ccc;
          border-radius: 8px; position: relative; margin-bottom: 20px;
          box-shadow: 0 4px 20px rgba(231, 76, 60, 0.5);
          animation: canBounce 2s ease-in-out infinite;
        }
        .title-can::after {
          content: ''; position: absolute; top: 25%; left: 0; right: 0;
          height: 30%; background: #e74c3c; border-radius: 4px;
        }
        @keyframes canBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .title-name {
          font-size: 42px; font-weight: bold; color: #e94560;
          margin-bottom: 8px; letter-spacing: 4px;
        }
        .title-sub {
          font-size: 16px; color: #a0a0c0; margin-bottom: 40px;
        }
        .title-buttons {
          display: flex; flex-direction: column; gap: 14px; align-items: center;
        }
        .title-btn {
          color: #fff; border: none;
          padding: 16px 48px; border-radius: 30px; font-size: 18px;
          font-weight: bold; cursor: pointer; min-width: 220px;
          -webkit-tap-highlight-color: transparent;
        }
        .title-btn:active { transform: scale(0.95); }
        .btn-offline {
          background: #e74c3c;
          box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
          animation: pulse 2s ease-in-out infinite;
        }
        .btn-online {
          background: #2980b9;
          box-shadow: 0 4px 20px rgba(41, 128, 185, 0.3);
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4); }
          50% { box-shadow: 0 4px 30px rgba(231, 76, 60, 0.7); }
        }
        .title-info {
          position: fixed; bottom: 20px; color: #555; font-size: 11px;
        }
      </style>
      <div class="title-screen">
        <div class="title-can"></div>
        <div class="title-name">缶けり</div>
        <div class="title-sub">KANKERI ONLINE</div>
        <div class="title-buttons">
          <button class="title-btn btn-offline">ひとりで練習</button>
          <button class="title-btn btn-online">オンライン対戦</button>
        </div>
        <div class="title-info">Three.js + Colyseus + Capacitor</div>
      </div>
    `;
    document.body.appendChild(this.container);

    this.container.querySelector(".btn-offline")!.addEventListener("click", () => {
      this.onOffline?.();
    });
    this.container.querySelector(".btn-online")!.addEventListener("click", () => {
      this.onOnline?.();
    });
  }

  dispose(): void {
    this.container.remove();
  }
}
