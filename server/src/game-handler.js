/**
 * GameHandler - Manages player connections and game state synchronization
 */
export class GameHandler {
  constructor() {
    // Map<sessionId, PlayerState>
    this.players = new Map();

    // Broadcast interval for state sync (60 FPS = ~16ms)
    this.broadcastInterval = setInterval(() => this.broadcastState(), 16);
  }

  /**
   * Add a new player to the game
   */
  addPlayer(sessionId, session) {
    this.players.set(sessionId, {
      session,
      name: '',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      lastUpdate: Date.now(),
      metadata: {},
    });

    console.log(`👤 Player added: ${sessionId} (total: ${this.players.size})`);

    // Send welcome message with assigned sessionId
    this.sendToPlayer(sessionId, {
      type: 'welcome',
      playerId: sessionId,
      serverTime: Date.now(),
    });

    // Notify other players
    this.broadcastToOthers(sessionId, {
      type: 'player_joined',
      playerId: sessionId,
      name: '',
    });
  }

  /**
   * Remove a player from the game
   */
  removePlayer(sessionId) {
    this.players.delete(sessionId);
    console.log(`👤 Player removed: ${sessionId} (total: ${this.players.size})`);

    // Notify other players
    this.broadcastToAll({
      type: 'player_left',
      playerId: sessionId,
    });
  }

  /**
   * Handle reliable messages (chat, commands, important game events)
   */
  handleReliableMessage(sessionId, message) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'chat':
          this.broadcastToAll({
            type: 'chat',
            playerId: sessionId,
            message: data.message,
            timestamp: Date.now(),
          });
          return JSON.stringify({ type: 'ack', id: data.id });

        case 'action':
          // Handle game actions (attack, interact, etc.)
          return this.handleAction(sessionId, data);

        case 'ping':
          return JSON.stringify({ type: 'pong', timestamp: Date.now() });

        case 'get_state':
          // Send full game state to requesting player
          return JSON.stringify({
            type: 'full_state',
            players: this.getPlayersState(),
            serverTime: Date.now(),
          });

        case 'set_name':
          // Set player name
          const player = this.players.get(sessionId);
          if (player) {
            player.name = data.name || '';
            console.log(`👤 Player ${sessionId.slice(0, 8)} set name: ${player.name}`);
            // Notify all players of name change
            this.broadcastToAll({
              type: 'player_name',
              playerId: sessionId,
              name: player.name,
            });
          }
          return JSON.stringify({ type: 'ack', id: data.id });

        default:
          console.log(`Unknown message type: ${data.type}`);
          return null;
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
      return JSON.stringify({ type: 'error', message: 'Invalid message format' });
    }
  }

  /**
   * Handle datagrams (position updates, real-time state)
   * Format: [type(1), ...data]
   */
  handleDatagram(sessionId, data) {
    const player = this.players.get(sessionId);
    if (!player) return;

    const view = new DataView(data.buffer);
    const type = view.getUint8(0);

    switch (type) {
      case 0x01: // Position update
        if (data.byteLength >= 25) {
          player.position.x = view.getFloat32(1, true);
          player.position.y = view.getFloat32(5, true);
          player.position.z = view.getFloat32(9, true);
          player.rotation.x = view.getFloat32(13, true);
          player.rotation.y = view.getFloat32(17, true);
          player.rotation.z = view.getFloat32(21, true);
          player.lastUpdate = Date.now();
        }
        break;

      case 0x02: // Velocity update
        if (data.byteLength >= 13) {
          player.velocity.x = view.getFloat32(1, true);
          player.velocity.y = view.getFloat32(5, true);
          player.velocity.z = view.getFloat32(9, true);
        }
        break;

      case 0x03: // Input state (keys pressed)
        if (data.byteLength >= 2) {
          player.inputState = view.getUint8(1);
        }
        break;
    }
  }

  /**
   * Handle game actions (reliable)
   */
  handleAction(sessionId, data) {
    const result = {
      type: 'action_result',
      actionId: data.id,
      success: true,
    };

    // Broadcast action to all players
    this.broadcastToAll({
      type: 'action',
      playerId: sessionId,
      action: data.action,
      params: data.params,
      timestamp: Date.now(),
    });

    return JSON.stringify(result);
  }

  /**
   * Broadcast state to all players via datagrams
   */
  broadcastState() {
    if (this.players.size < 2) return;

    const stateBuffer = this.encodePlayersState();

    for (const [sessionId, player] of this.players) {
      try {
        const writer = player.session.datagrams.writable.getWriter();
        writer.write(stateBuffer).catch(() => {});
        writer.releaseLock();
      } catch (err) {
        // Session may be closed
      }
    }
  }

  /**
   * Encode all players' state into binary format
   */
  encodePlayersState() {
    const playerCount = this.players.size;
    // Header(1) + timestamp(8) + count(2) + per player: id(36) + pos(12) + rot(12) + vel(12)
    const buffer = new ArrayBuffer(11 + playerCount * 72);
    const view = new DataView(buffer);
    const encoder = new TextEncoder();

    let offset = 0;
    view.setUint8(offset++, 0xFF); // State packet type
    view.setBigUint64(offset, BigInt(Date.now()), true);
    offset += 8;
    view.setUint16(offset, playerCount, true);
    offset += 2;

    for (const [sessionId, player] of this.players) {
      // Write session ID (36 bytes UUID)
      const idBytes = encoder.encode(sessionId.padEnd(36, '\0'));
      new Uint8Array(buffer, offset, 36).set(idBytes.slice(0, 36));
      offset += 36;

      // Position
      view.setFloat32(offset, player.position.x, true); offset += 4;
      view.setFloat32(offset, player.position.y, true); offset += 4;
      view.setFloat32(offset, player.position.z, true); offset += 4;

      // Rotation
      view.setFloat32(offset, player.rotation.x, true); offset += 4;
      view.setFloat32(offset, player.rotation.y, true); offset += 4;
      view.setFloat32(offset, player.rotation.z, true); offset += 4;

      // Velocity
      view.setFloat32(offset, player.velocity.x, true); offset += 4;
      view.setFloat32(offset, player.velocity.y, true); offset += 4;
      view.setFloat32(offset, player.velocity.z, true); offset += 4;
    }

    return new Uint8Array(buffer);
  }

  /**
   * Get all players' state as JSON
   */
  getPlayersState() {
    const state = {};
    for (const [sessionId, player] of this.players) {
      state[sessionId] = {
        position: player.position,
        rotation: player.rotation,
        velocity: player.velocity,
        lastUpdate: player.lastUpdate,
      };
    }
    return state;
  }

  /**
   * Send reliable message to all players
   */
  async broadcastToAll(message) {
    const encoded = new TextEncoder().encode(JSON.stringify(message));

    for (const [sessionId, player] of this.players) {
      try {
        const stream = await player.session.createUnidirectionalStream();
        const writer = stream.getWriter();
        await writer.write(encoded);
        await writer.close();
      } catch (err) {
        // Session may be closed
      }
    }
  }

  /**
   * Send reliable message to all except one player
   */
  async broadcastToOthers(excludeSessionId, message) {
    const encoded = new TextEncoder().encode(JSON.stringify(message));

    for (const [sessionId, player] of this.players) {
      if (sessionId === excludeSessionId) continue;

      try {
        const stream = await player.session.createUnidirectionalStream();
        const writer = stream.getWriter();
        await writer.write(encoded);
        await writer.close();
      } catch (err) {
        // Session may be closed
      }
    }
  }

  /**
   * Send reliable message to a specific player
   */
  async sendToPlayer(sessionId, message) {
    const player = this.players.get(sessionId);
    if (!player) return;

    try {
      const encoded = new TextEncoder().encode(JSON.stringify(message));
      const stream = await player.session.createUnidirectionalStream();
      const writer = stream.getWriter();
      await writer.write(encoded);
      await writer.close();
    } catch (err) {
      // Session may be closed
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    clearInterval(this.broadcastInterval);
    this.players.clear();
  }
}
