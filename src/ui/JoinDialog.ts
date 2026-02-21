export interface JoinResult {
  name: string;
  color: { r: number; g: number; b: number };
}

const COLOR_PRESETS: { label: string; r: number; g: number; b: number }[] = [
  { label: "青", r: 0.2, g: 0.6, b: 0.85 },
  { label: "赤", r: 0.85, g: 0.2, b: 0.2 },
  { label: "緑", r: 0.2, g: 0.75, b: 0.3 },
  { label: "黄", r: 0.9, g: 0.8, b: 0.15 },
  { label: "紫", r: 0.6, g: 0.25, b: 0.85 },
  { label: "橙", r: 0.95, g: 0.5, b: 0.1 },
  { label: "桃", r: 0.95, g: 0.4, b: 0.6 },
  { label: "水", r: 0.2, g: 0.85, b: 0.85 },
  { label: "白", r: 0.9, g: 0.9, b: 0.9 },
  { label: "黒", r: 0.15, g: 0.15, b: 0.15 },
];

/**
 * Join dialog for entering player name and choosing color before connecting
 */
export class JoinDialog {
  private container: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private resolvePromise: ((result: JoinResult) => void) | null = null;
  private selectedColorIndex = 0;
  private swatches: HTMLDivElement[] = [];

  /**
   * Show the dialog and wait for user input
   * @returns Promise that resolves with the player name and chosen color
   */
  show(): Promise<JoinResult> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.mount();
    });
  }

  private mount(): void {
    // Restore saved color index
    const savedIdx = parseInt(localStorage.getItem("playerColorIndex") || "0", 10);
    this.selectedColorIndex = (savedIdx >= 0 && savedIdx < COLOR_PRESETS.length) ? savedIdx : 0;

    // Create overlay
    this.container = document.createElement("div");
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    // Create dialog box
    const dialog = document.createElement("div");
    dialog.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #4a9eff;
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(74, 158, 255, 0.3);
      min-width: 300px;
    `;

    // Title
    const title = document.createElement("h2");
    title.textContent = "Open World";
    title.style.cssText = `
      color: #fff;
      margin: 0 0 8px 0;
      font-size: 24px;
      font-family: sans-serif;
    `;

    // Subtitle
    const subtitle = document.createElement("p");
    subtitle.textContent = "Multiplayer";
    subtitle.style.cssText = `
      color: #4a9eff;
      margin: 0 0 24px 0;
      font-size: 14px;
      font-family: sans-serif;
    `;

    // Input label
    const label = document.createElement("label");
    label.textContent = "Enter your name";
    label.style.cssText = `
      display: block;
      color: #aaa;
      margin-bottom: 8px;
      font-size: 14px;
      font-family: sans-serif;
    `;

    // Input field
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.placeholder = "Player";
    this.input.maxLength = 20;
    this.input.style.cssText = `
      width: 100%;
      padding: 12px;
      border: 1px solid #4a9eff;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-size: 16px;
      font-family: sans-serif;
      outline: none;
      box-sizing: border-box;
      margin-bottom: 16px;
    `;

    // Color label
    const colorLabel = document.createElement("label");
    colorLabel.textContent = "キャラクターの色";
    colorLabel.style.cssText = `
      display: block;
      color: #aaa;
      margin-bottom: 8px;
      font-size: 14px;
      font-family: sans-serif;
    `;

    // Color swatches
    const colorContainer = document.createElement("div");
    colorContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-bottom: 20px;
    `;

    this.swatches = [];
    COLOR_PRESETS.forEach((c, i) => {
      const swatch = document.createElement("div");
      const cssColor = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
      swatch.style.cssText = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${cssColor};
        cursor: pointer;
        border: 3px solid transparent;
        transition: border-color 0.15s, transform 0.1s;
        box-sizing: border-box;
      `;
      if (i === this.selectedColorIndex) {
        swatch.style.borderColor = "#fff";
        swatch.style.transform = "scale(1.15)";
      }
      swatch.addEventListener("click", () => this.selectColor(i));
      colorContainer.appendChild(swatch);
      this.swatches.push(swatch);
    });

    // Join button
    const button = document.createElement("button");
    button.textContent = "Join Game";
    button.style.cssText = `
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 6px;
      background: linear-gradient(135deg, #4a9eff 0%, #0066cc 100%);
      color: #fff;
      font-size: 16px;
      font-family: sans-serif;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    `;
    button.onmouseenter = () => {
      button.style.transform = "scale(1.02)";
      button.style.boxShadow = "0 4px 12px rgba(74, 158, 255, 0.5)";
    };
    button.onmouseleave = () => {
      button.style.transform = "scale(1)";
      button.style.boxShadow = "none";
    };

    // Event handlers
    const submit = () => {
      const name = this.input?.value.trim() || "Player";
      const color = COLOR_PRESETS[this.selectedColorIndex];
      localStorage.setItem("playerName", name);
      localStorage.setItem("playerColorIndex", String(this.selectedColorIndex));
      this.unmount();
      this.resolvePromise?.({ name, color: { r: color.r, g: color.g, b: color.b } });
    };

    button.onclick = submit;
    this.input.onkeydown = (e) => {
      if (e.key === "Enter") submit();
    };

    // Assemble dialog
    dialog.appendChild(title);
    dialog.appendChild(subtitle);
    dialog.appendChild(label);
    dialog.appendChild(this.input);
    dialog.appendChild(colorLabel);
    dialog.appendChild(colorContainer);
    dialog.appendChild(button);
    this.container.appendChild(dialog);
    document.body.appendChild(this.container);

    // Restore saved name
    const saved = localStorage.getItem("playerName");
    if (saved && this.input) {
      this.input.value = saved;
    }

    // Focus input
    setTimeout(() => this.input?.focus(), 100);
  }

  private selectColor(index: number): void {
    // Deselect old
    if (this.swatches[this.selectedColorIndex]) {
      this.swatches[this.selectedColorIndex].style.borderColor = "transparent";
      this.swatches[this.selectedColorIndex].style.transform = "scale(1)";
    }
    // Select new
    this.selectedColorIndex = index;
    this.swatches[index].style.borderColor = "#fff";
    this.swatches[index].style.transform = "scale(1.15)";
  }

  private unmount(): void {
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
      this.input = null;
      this.swatches = [];
    }
  }
}
