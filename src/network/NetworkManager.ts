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
  private transport: WebTransport | null = null;
  private bidiWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private bidiReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private datagramWriter: WritableStreamDefaultWriter<Uint8Array> | null =
    null;
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

    try {
      console.log(`[Network] Connecting to ${this.config.serverUrl}...`);

      // Build WebTransport options
      const options: WebTransportOptions = {};

      // Use certificate hash for self-signed certs in development
      if (this.config.certHash) {
        const hashBytes = Uint8Array.from(atob(this.config.certHash), (c) =>
          c.charCodeAt(0)
        );
        options.serverCertificateHashes = [
          {
            algorithm: "sha-256",
            value: hashBytes.buffer,
          },
        ];
        const hashHex = Array.from(hashBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(":");
        console.log("[Network] Using certificate hash for self-signed cert");
        console.log("[Network] Hash:", hashHex);
      }

      this.transport = new WebTransport(this.config.serverUrl, options);
      await this.transport.ready;

      this.connected = true;
      this.reconnectAttempt = 0;
      // localPlayerId will be set by server's welcome message

      console.log(`[Network] Transport ready, waiting for server welcome...`);

      // Open bidirectional stream for reliable messaging
      const bidiStream = await this.transport.createBidirectionalStream();
      this.bidiWriter = bidiStream.writable.getWriter();
      this.bidiReader = bidiStream.readable.getReader();

      // Get datagram writer for position updates
      this.datagramWriter = this.transport.datagrams.writable.getWriter();

      // Start reading datagrams (state broadcasts)
      this.handleDatagrams();

      // Start reading bidirectional messages
      this.handleBidiMessages();

      // Start reading unidirectional streams (broadcasts)
      this.handleUnidirectionalStreams();

      // Handle connection close
      this.transport.closed
        .then(() => {
          this.handleDisconnect("Connection closed");
        })
        .catch((err) => {
          this.handleDisconnect(`Connection error: ${err.message}`);
        });
    } catch (error) {
      console.error("[Network] Connection failed:", error);
      this.handleDisconnect(
        `Failed to connect: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  disconnect(): void {
    this.destroyed = true;
    this.cleanup();
  }

  private cleanup(): void {
    this.connected = false;

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
  }

  private handleDisconnect(reason: string): void {
    if (!this.connected && !this.reconnecting) return;

    this.cleanup();
    this.onEvent?.({ type: "disconnected", reason });

    // Attempt reconnection
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

  /** Send local player position via datagram (call every frame) */
  sendPosition(x: number, y: number, z: number, rotY: number): void {
    if (!this.connected || !this.datagramWriter) return;

    const buffer = new ArrayBuffer(25);
    const view = new DataView(buffer);
    view.setUint8(0, PACKET_POSITION);
    view.setFloat32(1, x, true);
    view.setFloat32(5, y, true);
    view.setFloat32(9, z, true);
    view.setFloat32(13, 0, true); // rotX (unused)
    view.setFloat32(17, rotY, true);
    view.setFloat32(21, 0, true); // rotZ (unused)

    this.datagramWriter.write(new Uint8Array(buffer)).catch(() => {
      // Datagram dropped, expected behavior
    });
  }

  /** Send chat message via reliable stream */
  async sendChat(message: string): Promise<void> {
    if (!this.connected || !this.bidiWriter) return;

    const data = JSON.stringify({
      type: "chat",
      message,
      id: Date.now(),
    });

    const encoded = new TextEncoder().encode(data);
    await this.bidiWriter.write(encoded);
  }

  /** Set player name via reliable stream */
  async setName(name: string): Promise<void> {
    if (!this.connected || !this.bidiWriter) return;

    const data = JSON.stringify({
      type: "set_name",
      name,
      id: Date.now(),
    });

    const encoded = new TextEncoder().encode(data);
    await this.bidiWriter.write(encoded);
  }

  /** Send game action via reliable stream */
  async sendAction(action: string, params: unknown): Promise<void> {
    if (!this.connected || !this.bidiWriter) return;

    const data = JSON.stringify({
      type: "action",
      action,
      params,
      id: Date.now(),
    });

    const encoded = new TextEncoder().encode(data);
    await this.bidiWriter.write(encoded);
  }

  /** Handle incoming datagrams (state broadcasts from server) */
  private async handleDatagrams(): Promise<void> {
    if (!this.transport) return;

    const reader = this.transport.datagrams.readable.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const players = this.parseStateDatagram(value);
        if (players.size > 0) {
          this.onEvent?.({
            type: "state_update",
            players,
            serverTime: Date.now(),
          });
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

  /** Handle incoming bidirectional stream messages */
  private async handleBidiMessages(): Promise<void> {
    if (!this.bidiReader) return;

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await this.bidiReader.read();
        if (done) break;

        try {
          const message = JSON.parse(decoder.decode(value));
          // Handle ack, pong, full_state, error responses
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

  /** Handle incoming unidirectional streams (broadcasts) */
  private async handleUnidirectionalStreams(): Promise<void> {
    if (!this.transport) return;

    const reader = this.transport.incomingUnidirectionalStreams.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value: stream, done } = await reader.read();
        if (done) break;

        // Read each stream
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

  private handleBroadcast(message: IncomingBroadcast): void {
    switch (message.type) {
      case "welcome":
        // Server assigned our ID
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

  /** Parse state broadcast datagram (0xFF packet) */
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

      // Read player ID (36 bytes)
      const idBytes = data.slice(offset, offset + 36);
      const playerId = new TextDecoder()
        .decode(idBytes)
        .replace(/\0/g, "")
        .trim();
      offset += 36;

      // Position (12 bytes)
      const position = {
        x: view.getFloat32(offset, true),
        y: view.getFloat32(offset + 4, true),
        z: view.getFloat32(offset + 8, true),
      };
      offset += 12;

      // Rotation (12 bytes)
      const rotation = {
        x: view.getFloat32(offset, true),
        y: view.getFloat32(offset + 4, true),
        z: view.getFloat32(offset + 8, true),
      };
      offset += 12;

      // Velocity (12 bytes)
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

  get isConnected(): boolean {
    return this.connected;
  }
}
