export class HUD {
  private container: HTMLDivElement;
  private phaseLabel: HTMLDivElement;
  private timerLabel: HTMLDivElement;
  private statusLabel: HTMLDivElement;
  private actionButton: HTMLButtonElement;
  private messageOverlay: HTMLDivElement;

  onAction: (() => void) | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "hud";
    this.container.innerHTML = `
      <style>
        #hud {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 10;
          font-family: 'Segoe UI', sans-serif;
        }
        #hud > * { pointer-events: auto; }
        .hud-top {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px;
        }
        .hud-phase {
          background: rgba(0,0,0,0.6); color: #fff;
          padding: 6px 14px; border-radius: 20px; font-size: 14px;
          font-weight: bold;
        }
        .hud-timer {
          background: rgba(0,0,0,0.6); color: #ff6b6b;
          padding: 6px 14px; border-radius: 20px; font-size: 18px;
          font-weight: bold; min-width: 50px; text-align: center;
        }
        .hud-status {
          position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.6); color: #fff;
          padding: 6px 16px; border-radius: 16px; font-size: 13px;
          white-space: nowrap;
        }
        .hud-action {
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
          background: #e74c3c; color: #fff; border: none;
          padding: 14px 32px; border-radius: 30px; font-size: 18px;
          font-weight: bold; cursor: pointer; display: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          -webkit-tap-highlight-color: transparent;
        }
        .hud-action:active { background: #c0392b; transform: translateX(-50%) scale(0.95); }
        .hud-message {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: rgba(0,0,0,0.8); color: #fff;
          padding: 24px 40px; border-radius: 16px; font-size: 24px;
          font-weight: bold; display: none; text-align: center;
        }
      </style>
      <div class="hud-top">
        <div class="hud-phase"></div>
        <div class="hud-timer"></div>
      </div>
      <div class="hud-status"></div>
      <button class="hud-action"></button>
      <div class="hud-message"></div>
    `;
    document.body.appendChild(this.container);

    this.phaseLabel = this.container.querySelector(".hud-phase")!;
    this.timerLabel = this.container.querySelector(".hud-timer")!;
    this.statusLabel = this.container.querySelector(".hud-status")!;
    this.actionButton = this.container.querySelector(".hud-action")!;
    this.messageOverlay = this.container.querySelector(".hud-message")!;

    this.actionButton.addEventListener("click", () => {
      this.onAction?.();
    });
  }

  setPhase(text: string): void {
    this.phaseLabel.textContent = text;
  }

  setTimer(seconds: number): void {
    this.timerLabel.textContent = `${Math.ceil(seconds)}`;
  }

  setStatus(text: string): void {
    this.statusLabel.textContent = text;
    this.statusLabel.style.display = text ? "block" : "none";
  }

  showAction(label: string): void {
    this.actionButton.textContent = label;
    this.actionButton.style.display = "block";
  }

  hideAction(): void {
    this.actionButton.style.display = "none";
  }

  showMessage(text: string, durationMs = 2000): void {
    this.messageOverlay.textContent = text;
    this.messageOverlay.style.display = "block";
    if (durationMs > 0) {
      setTimeout(() => {
        this.messageOverlay.style.display = "none";
      }, durationMs);
    }
  }

  hideMessage(): void {
    this.messageOverlay.style.display = "none";
  }

  hide(): void {
    this.container.style.display = "none";
  }

  show(): void {
    this.container.style.display = "block";
  }

  dispose(): void {
    this.container.remove();
  }
}
