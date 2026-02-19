export class TitleScene {
  private container: HTMLDivElement;
  private animFrame = 0;
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
          overflow: hidden;
          animation: titleFadeIn 0.6s ease-out;
        }
        @keyframes titleFadeIn {
          from { opacity: 0; transform: scale(1.05); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Floating particles */
        .title-particles {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; overflow: hidden;
        }
        .title-particle {
          position: absolute; border-radius: 50%; opacity: 0;
          animation: particleFloat linear infinite;
        }
        @keyframes particleFloat {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-20vh) scale(1); opacity: 0; }
        }

        .title-can {
          width: 60px; height: 80px; background: linear-gradient(180deg, #ddd 0%, #bbb 100%);
          border-radius: 8px; position: relative; margin-bottom: 20px;
          box-shadow: 0 4px 30px rgba(231, 76, 60, 0.6);
          animation: canBounce 2s ease-in-out infinite;
          z-index: 1;
        }
        .title-can::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          border-radius: 8px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 40%, transparent 100%);
        }
        .title-can::after {
          content: ''; position: absolute; top: 25%; left: 0; right: 0;
          height: 30%; background: linear-gradient(180deg, #e74c3c, #c0392b);
          border-radius: 4px;
        }
        @keyframes canBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(-3deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-8px) rotate(2deg); }
        }
        .title-name {
          font-size: 48px; font-weight: bold; color: #e94560;
          margin-bottom: 8px; letter-spacing: 6px;
          text-shadow: 0 0 30px rgba(233, 69, 96, 0.4);
          z-index: 1;
        }
        .title-sub {
          font-size: 14px; color: #a0a0c0; margin-bottom: 40px;
          letter-spacing: 8px; text-transform: uppercase;
          z-index: 1;
        }
        .title-buttons {
          display: flex; flex-direction: column; gap: 14px; align-items: center;
          z-index: 1;
        }
        .title-btn {
          color: #fff; border: none;
          padding: 16px 48px; border-radius: 30px; font-size: 18px;
          font-weight: bold; cursor: pointer; min-width: 220px;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .title-btn:active { transform: scale(0.93); }
        .btn-offline {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
          animation: pulse 2s ease-in-out infinite;
        }
        .btn-online {
          background: linear-gradient(135deg, #2980b9, #1a5276);
          box-shadow: 0 4px 20px rgba(41, 128, 185, 0.3);
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4); }
          50% { box-shadow: 0 6px 35px rgba(231, 76, 60, 0.7); }
        }
        .title-version {
          position: fixed; bottom: 20px; color: #444; font-size: 11px;
          z-index: 1;
        }
      </style>
      <div class="title-screen">
        <div class="title-particles" id="title-particles"></div>
        <div class="title-can"></div>
        <div class="title-name">缶けり</div>
        <div class="title-sub">KANKERI ONLINE</div>
        <div class="title-buttons">
          <button class="title-btn btn-offline">ひとりで練習</button>
          <button class="title-btn btn-online">オンライン対戦</button>
        </div>
        <div class="title-version">v0.1</div>
      </div>
    `;
    document.body.appendChild(this.container);

    // Spawn floating particles
    this.spawnParticles();

    this.container.querySelector(".btn-offline")!.addEventListener("click", () => {
      this.onOffline?.();
    });
    this.container.querySelector(".btn-online")!.addEventListener("click", () => {
      this.onOnline?.();
    });
  }

  private spawnParticles(): void {
    const container = this.container.querySelector("#title-particles");
    if (!container) return;

    const colors = ["#e94560", "#0f3460", "#2980b9", "#e74c3c", "#a0a0c0"];
    for (let i = 0; i < 20; i++) {
      const p = document.createElement("div");
      p.className = "title-particle";
      const size = 4 + Math.random() * 8;
      const left = Math.random() * 100;
      const duration = 6 + Math.random() * 8;
      const delay = Math.random() * duration;
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText += `width:${size}px;height:${size}px;left:${left}%;background:${color};animation-duration:${duration}s;animation-delay:-${delay}s;`;
      container.appendChild(p);
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.animFrame);
    this.container.remove();
  }
}
