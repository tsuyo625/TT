import {
  NetworkConfig,
  NetworkEvent,
  RemotePlayerState,
  PACKET_POSITION,
  PACKET_STATE_BROADCAST,
  IncomingBroadcast,
} from "./types";

const DEFAULT_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY_MS = 2000;

export class NetworkManager {
  private config: NetworkConfig;

  // WebTransport state
  private transport: WebTransport | null = null;
  private bidiWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private bidiReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private datagramWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;

  // WebSocket state
  private ws: WebSocket | null = null;
  private useWebSocket = false;

  private connected = false;
  private reconnecting = false;
  private reconnectAttempt = 0;
  private destroyed = false;

  localPlayerId: string | null = null;
  onEvent: ((event: NetworkEvent) => void) | null = null;

  constructor(config: NetworkConfig) {
    this.config = {
      ...config,
      reconnectAttempts: config.reconnectAttempts ?? DEFAULT_RECONNECT_ATTEMPTS,
      reconnectDelayMs: config.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS,
    };
  }

  async connect(): Promise<void> {
    if (this.destroyed) return;

    // Try WebTransport first, fall back to WebSocket
    if (typeof WebTransport !== "undefined" && !this.useWebSocket) {
      try {
        await this.connectWebTransport();
        return;
      } catch (error) {
        console.warn("[Network] WebTransport failed, trying WebSocket fallback...", error);
        this.cleanup();
        this.useWebSocket = true;
      }
    }

    await this.connectWebSocket();
  }

  // ─── WebTransport ────────────────────────────────────────

  private async connectWebTransport(): Promise<void> {
    console.log(`[Network] Connecting via WebTransport to ${this.config.serverUrl}...`);

    const options: WebTransportOptions = {};

    if (this.config.certHash) {
      const hashBytes = Uint8Array.from(atob(this.config.certHash), (c) =>
        c.charCodeAt(0)
      );
      options.serverCertificateHashes = [
        { algorithm: "sha-256", value: hashBytes.buffer },
      ];
      console.log("[Network] Using certificate hash for self-signed cert");
    }

    this.transport = new WebTransport(this.config.serverUrl, options);
    await this.transport.ready;

    this.connected = true;
    this.reconnectAttempt = 0;

    console.log(`[Network] WebTransport ready, waiting for server welcome...`);

    const bidiStream = await this.transport.createBidirectionalStream();
    this.bidiWriter = bidiStream.writable.getWriter();
    this.bidiReader = bidiStream.readable.getReader();
    this.datagramWriter = this.transport.datagrams.writable.getWriter();

    this.handleDatagrams();
    this.handleBidiMessages();
    this.handleUnidirectionalStreams();

    this.transport.closed
      .then(() => this.handleDisconnect("Connection closed"))
      .catch((err) => this.handleDisconnect(`Connection error: ${err.message}`));
  }

  // ─── WebSocket fallback ──────────────────────────────────

  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.wsUrl;
      if (!wsUrl) {
        reject(new Error("No WebSocket URL configured"));
        return;
      }

      console.log(`[Network] Connecting via WebSocket to ${wsUrl}...`);

      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      this.ws = ws;

      ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempt = 0;
        console.log("[Network] WebSocket connected, waiting for server welcome...");
        resolve();
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Binary = state broadcast
          const data = new Uint8Array(event.data);
          const players = this.parseStateDatagram(data);
          if (players.size > 0) {
            this.onEvent?.({ type: "state_update", players, serverTime: Date.now() });
          }
        } else {
          // Text = JSON broadcast
          try {
            const message: IncomingBroadcast = JSON.parse(event.data);
            this.handleBroadcast(message);
          } catch {
            // Invalid JSON
          }
        }
      };

      ws.onclose = () => {
        this.handleDisconnect("WebSocket closed");
      };

      ws.onerror = (err) => {
        if (!this.connected) {
          reject(err);
        }
        // handleDisconnect will be called by onclose
      };
    });
  }

  // ─── Public send methods ─────────────────────────────────

  disconnect(): void {
    this.destroyed = true;
    this.cleanup();
  }

  /** Send local player position (binary) */
  sendPosition(x: number, y: number, z: number, rotY: number): void {
    if (!this.connected) return;

    const buffer = new ArrayBuffer(25);
    const view = new DataView(buffer);
    view.setUint8(0, PACKET_POSITION);
    view.setFloat32(1, x, true);
    view.setFloat32(5, y, true);
    view.setFloat32(9, z, true);
    view.setFloat32(13, 0, true);
    view.setFloat32(17, rotY, true);
    view.setFloat32(21, 0, true);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(buffer);
    } else if (this.datagramWriter) {
      this.datagramWriter.write(new Uint8Array(buffer)).catch(() => {});
    }
  }

  /** Send chat message (JSON) */
  async sendChat(message: string): Promise<void> {
    await this.sendJson({ type: "chat", message, id: Date.now() });
  }

  /** Set player name (JSON) */
  async setName(name: string): Promise<void> {
    await this.sendJson({ type: "set_name", name, id: Date.now() });
  }

  /** Send game action (JSON) */
  async sendAction(action: string, params: unknown): Promise<void> {
    await this.sendJson({ type: "action", action, params, id: Date.now() });
  }

  get isConnected(): boolean {
    return this.connected;
  }

  // ─── Internal helpers ────────────────────────────────────

  private async sendJson(obj: unknown): Promise<void> {
    if (!this.connected) return;

    const data = JSON.stringify(obj);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else if (this.bidiWriter) {
      const encoded = new TextEncoder().encode(data);
      await this.bidiWriter.write(encoded);
    }
  }

  private cleanup(): void {
    this.connected = false;

    // WebTransport cleanup
    if (this.bidiWriter) {
      this.bidiWriter.close().catch(() => {});
      this.bidiWriter = null;
    }
    if (this.bidiReader) {
      this.bidiReader.cancel().catch(() => {});
      this.bidiReader = null;
    }
    if (this.datagramWriter) {
      this.datagramWriter.close().catch(() => {});
      this.datagramWriter = null;
    }
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }

    // WebSocket cleanup
    if (this.ws) {
      this.ws.onclose = null; // prevent re-triggering handleDisconnect
      this.ws.close();
      this.ws = null;
    }
  }

  private handleDisconnect(reason: string): void {
    if (!this.connected && !this.reconnecting) return;

    this.cleanup();
    this.onEvent?.({ type: "disconnected", reason });

    if (!this.destroyed) {
      this.attemptReconnect();
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (
      this.reconnecting ||
      this.destroyed ||
      this.reconnectAttempt >= (this.config.reconnectAttempts ?? 5)
    ) {
      return;
    }

    this.reconnecting = true;
    this.reconnectAttempt++;

    console.log(
      `[Network] Reconnecting (attempt ${this.reconnectAttempt}/${this.config.reconnectAttempts})...`
    );

    await new Promise((resolve) =>
      setTimeout(resolve, this.config.reconnectDelayMs)
    );

    this.reconnecting = false;

    try {
      await this.connect();
    } catch {
      // Will trigger another reconnect attempt via handleDisconnect
    }
  }

  // ─── WebTransport-specific readers ───────────────────────

  private async handleDatagrams(): Promise<void> {
    if (!this.transport) return;

    const reader = this.transport.datagrams.readable.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const players = this.parseStateDatagram(value);
        if (players.size > 0) {
          this.onEvent?.({ type: "state_update", players, serverTime: Date.now() });
        }
      }
    } catch (err) {
      if (!this.destroyed) {
        console.warn("[Network] Datagram reader error:", err);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async handleBidiMessages(): Promise<void> {
    if (!this.bidiReader) return;

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await this.bidiReader.read();
        if (done) break;

        try {
          const message = JSON.parse(decoder.decode(value));
          console.log("[Network] BiDi message:", message.type);
        } catch {
          // Invalid JSON
        }
      }
    } catch (err) {
      if (!this.destroyed) {
        console.warn("[Network] BiDi reader error:", err);
      }
    }
  }

  private async handleUnidirectionalStreams(): Promise<void> {
    if (!this.transport) return;

    const reader = this.transport.incomingUnidirectionalStreams.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value: stream, done } = await reader.read();
        if (done) break;
        this.readUnidirectionalStream(stream, decoder);
      }
    } catch (err) {
      if (!this.destroyed) {
        console.warn("[Network] Unidirectional streams error:", err);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async readUnidirectionalStream(
    stream: ReadableStream<Uint8Array>,
    decoder: TextDecoder
  ): Promise<void> {
    const reader = stream.getReader();

    try {
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      const message: IncomingBroadcast = JSON.parse(decoder.decode(combined));
      this.handleBroadcast(message);
    } catch {
      // Invalid message
    } finally {
      reader.releaseLock();
    }
  }

  // ─── Shared message handling ─────────────────────────────

  private handleBroadcast(message: IncomingBroadcast): void {
    switch (message.type) {
      case "welcome":
        this.localPlayerId = message.playerId;
        console.log(`[Network] Connected! Server assigned ID: ${this.localPlayerId}`);
        this.onEvent?.({ type: "connected", localPlayerId: this.localPlayerId });
        break;
      case "player_joined":
        this.onEvent?.({
          type: "player_joined",
          playerId: message.playerId,
          name: message.name,
        });
        break;
      case "player_left":
        this.onEvent?.({ type: "player_left", playerId: message.playerId });
        break;
      case "player_name":
        this.onEvent?.({
          type: "player_name",
          playerId: message.playerId,
          name: message.name,
        });
        break;
      case "chat":
        this.onEvent?.({
          type: "chat",
          playerId: message.playerId,
          message: message.message,
          timestamp: message.timestamp,
        });
        break;
      case "action":
        this.onEvent?.({
          type: "action",
          playerId: message.playerId,
          action: message.action,
          params: message.params,
        });
        break;
    }
  }

  /** Parse state broadcast (0xFF binary packet) */
  private parseStateDatagram(data: Uint8Array): Map<string, RemotePlayerState> {
    const players = new Map<string, RemotePlayerState>();

    if (data.length < 11) return players;

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const type = view.getUint8(0);

    if (type !== PACKET_STATE_BROADCAST) return players;

    const serverTime = Number(view.getBigUint64(1, true));
    const playerCount = view.getUint16(9, true);

    let offset = 11;

    for (let i = 0; i < playerCount; i++) {
      if (offset + 72 > data.length) break;

      const idBytes = data.slice(offset, offset + 36);
      const playerId = new TextDecoder()
        .decode(idBytes)
        .replace(/\0/g, "")
        .trim();
      offset += 36;

      const position = {
        x: view.getFloat32(offset, true),
        y: view.getFloat32(offset + 4, true),
        z: view.getFloat32(offset + 8, true),
      };
      offset += 12;

      const rotation = {
        x: view.getFloat32(offset, true),
        y: view.getFloat32(offset + 4, true),
        z: view.getFloat32(offset + 8, true),
      };
      offset += 12;

      const velocity = {
        x: view.getFloat32(offset, true),
        y: view.getFloat32(offset + 4, true),
        z: view.getFloat32(offset + 8, true),
      };
      offset += 12;

      players.set(playerId, {
        playerId,
        position,
        rotation,
        velocity,
        lastUpdate: serverTime,
      });
    }

    return players;
  }
}
