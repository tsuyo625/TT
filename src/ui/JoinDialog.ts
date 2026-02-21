/**
 * Join dialog for entering player name before connecting
 */
export class JoinDialog {
  private container: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private resolvePromise: ((name: string) => void) | null = null;

  /**
   * Show the dialog and wait for user input
   * @returns Promise that resolves with the player name
   */
  show(): Promise<string> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.mount();
    });
  }

  private mount(): void {
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
      localStorage.setItem("playerName", name);
      this.unmount();
      this.resolvePromise?.(name);
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

  private unmount(): void {
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
      this.input = null;
    }
  }
}
