const MESSAGE_DISPLAY_DURATION_MS = 5000;
const MAX_VISIBLE_MESSAGES = 5;

interface ChatMessageDisplay {
  playerId: string;
  message: string;
  timestamp: number;
  element: HTMLDivElement;
}

export class ChatUI {
  private container: HTMLDivElement;
  private messagesContainer: HTMLDivElement;
  private inputContainer: HTMLDivElement;
  private input: HTMLInputElement;
  private sendButton: HTMLButtonElement;
  private messages: ChatMessageDisplay[] = [];
  private onSend: ((message: string) => void) | null = null;
  private localPlayerId: string | null = null;

  constructor() {
    // Create container
    this.container = document.createElement("div");
    this.container.id = "chat-ui";
    this.container.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      width: 300px;
      z-index: 1000;
      pointer-events: none;
      font-family: sans-serif;
    `;

    // Messages display area
    this.messagesContainer = document.createElement("div");
    this.messagesContainer.id = "chat-messages";
    this.messagesContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    `;
    this.container.appendChild(this.messagesContainer);

    // Input area
    this.inputContainer = document.createElement("div");
    this.inputContainer.id = "chat-input-container";
    this.inputContainer.style.cssText = `
      display: flex;
      gap: 4px;
      pointer-events: auto;
    `;

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.placeholder = "Type a message...";
    this.input.maxLength = 200;
    this.input.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 14px;
      outline: none;
    `;

    this.sendButton = document.createElement("button");
    this.sendButton.textContent = "Send";
    this.sendButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: #4a90d9;
      color: white;
      font-size: 14px;
      cursor: pointer;
    `;

    this.inputContainer.appendChild(this.input);
    this.inputContainer.appendChild(this.sendButton);
    this.container.appendChild(this.inputContainer);

    // Event listeners
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
      // Stop propagation to prevent game input
      e.stopPropagation();
    });

    this.input.addEventListener("keyup", (e) => e.stopPropagation());

    this.sendButton.addEventListener("click", () => this.handleSend());

    // Focus/blur handling to manage game input
    this.input.addEventListener("focus", () => {
      this.input.style.background = "rgba(0, 0, 0, 0.8)";
    });

    this.input.addEventListener("blur", () => {
      this.input.style.background = "rgba(0, 0, 0, 0.6)";
    });
  }

  mount(): void {
    document.body.appendChild(this.container);
  }

  unmount(): void {
    this.container.remove();
  }

  setLocalPlayerId(id: string): void {
    this.localPlayerId = id;
  }

  setOnSend(callback: (message: string) => void): void {
    this.onSend = callback;
  }

  private handleSend(): void {
    const message = this.input.value.trim();
    if (message && this.onSend) {
      this.onSend(message);
      this.input.value = "";
    }
  }

  /** Display a chat message */
  addMessage(senderName: string, message: string, timestamp: number): void {
    // Create message element
    const element = document.createElement("div");
    element.style.cssText = `
      padding: 6px 10px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      font-size: 13px;
      word-wrap: break-word;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;
    element.innerHTML = `<strong style="color: #8bc">${this.escapeHtml(senderName)}:</strong> ${this.escapeHtml(message)}`;

    this.messagesContainer.appendChild(element);

    const chatMessage: ChatMessageDisplay = {
      playerId: senderName,
      message,
      timestamp,
      element,
    };
    this.messages.push(chatMessage);

    // Limit visible messages
    while (this.messages.length > MAX_VISIBLE_MESSAGES) {
      const old = this.messages.shift();
      old?.element.remove();
    }

    // Auto-fade after duration
    setTimeout(() => {
      element.style.opacity = "0";
      setTimeout(() => {
        const index = this.messages.indexOf(chatMessage);
        if (index !== -1) {
          this.messages.splice(index, 1);
          element.remove();
        }
      }, 300);
    }, MESSAGE_DISPLAY_DURATION_MS);
  }

  /** Show system message (connection status, etc.) */
  addSystemMessage(message: string): void {
    const element = document.createElement("div");
    element.style.cssText = `
      padding: 4px 10px;
      border-radius: 4px;
      background: rgba(100, 100, 100, 0.7);
      color: #ccc;
      font-size: 12px;
      font-style: italic;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;
    element.textContent = message;

    this.messagesContainer.appendChild(element);

    // Auto-fade after shorter duration
    setTimeout(() => {
      element.style.opacity = "0";
      setTimeout(() => element.remove(), 300);
    }, 3000);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /** Check if input is focused (to disable game input) */
  isInputFocused(): boolean {
    return document.activeElement === this.input;
  }
}
