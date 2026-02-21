import { WebSocket, WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import type { Server as HttpServer } from "http";

/** Per-player state tracked on the server */
interface PlayerInfo {
  id: string;
  name: string;
  ws: WebSocket;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  lastUpdate: number;
}

const BROADCAST_INTERVAL_MS = 50; // 20 Hz state broadcast
const PACKET_POSITION = 0x01;
const PACKET_STATE_BROADCAST = 0xff;

export function attachOpenWorldWs(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: "/ws/game" });
  const players = new Map<string, PlayerInfo>();

  // Periodic state broadcast (binary, same format as WebTransport datagrams)
  setInterval(() => {
    if (players.size === 0) return;

    const buf = buildStateBroadcast(players);
    const data = Buffer.from(buf);

    for (const p of players.values()) {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(data);
      }
    }
  }, BROADCAST_INTERVAL_MS);

  wss.on("connection", (ws) => {
    const playerId = randomUUID();
    const player: PlayerInfo = {
      id: playerId,
      name: "Player",
      ws,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      lastUpdate: Date.now(),
    };
    players.set(playerId, player);

    // Send welcome
    sendJson(ws, { type: "welcome", playerId, serverTime: Date.now() });

    // Notify others
    broadcastJson(players, { type: "player_joined", playerId }, playerId);

    // Send existing players to the new client
    for (const [id, other] of players) {
      if (id !== playerId) {
        sendJson(ws, { type: "player_joined", playerId: id, name: other.name });
      }
    }

    ws.on("message", (raw, isBinary) => {
      if (isBinary) {
        handleBinaryMessage(player, raw as Buffer);
      } else {
        handleTextMessage(player, players, raw.toString());
      }
    });

    ws.on("close", () => {
      players.delete(playerId);
      broadcastJson(players, { type: "player_left", playerId });
    });

    ws.on("error", () => {
      players.delete(playerId);
    });
  });

  console.log("  Open World WebSocket handler attached at /ws/game");
}

/** Handle binary position packet (same 25-byte format as WebTransport) */
function handleBinaryMessage(player: PlayerInfo, data: Buffer): void {
  if (data.length < 25) return;
  const type = data.readUInt8(0);
  if (type !== PACKET_POSITION) return;

  player.position.x = data.readFloatLE(1);
  player.position.y = data.readFloatLE(5);
  player.position.z = data.readFloatLE(9);
  // bytes 13-16: rotX (unused)
  player.rotation.y = data.readFloatLE(17);
  // bytes 21-24: rotZ (unused)

  // Compute velocity from position delta (approximate)
  player.lastUpdate = Date.now();
}

/** Handle JSON text messages (chat, set_name, action) */
function handleTextMessage(
  player: PlayerInfo,
  players: Map<string, PlayerInfo>,
  raw: string,
): void {
  let msg: { type: string; [key: string]: unknown };
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  switch (msg.type) {
    case "chat":
      broadcastJson(players, {
        type: "chat",
        playerId: player.id,
        message: msg.message as string,
        timestamp: Date.now(),
      });
      break;

    case "set_name":
      player.name = (msg.name as string) || "Player";
      broadcastJson(players, {
        type: "player_name",
        playerId: player.id,
        name: player.name,
      });
      break;

    case "action":
      broadcastJson(players, {
        type: "action",
        playerId: player.id,
        action: msg.action as string,
        params: msg.params,
        timestamp: Date.now(),
      });
      break;
  }
}

/** Build binary state broadcast (same format as WebTransport datagrams) */
function buildStateBroadcast(players: Map<string, PlayerInfo>): ArrayBuffer {
  // Header: 1 byte type + 8 byte timestamp + 2 byte playerCount = 11
  // Per player: 36 byte id + 12 pos + 12 rot + 12 vel = 72
  const headerSize = 11;
  const perPlayer = 72;
  const buf = new ArrayBuffer(headerSize + players.size * perPlayer);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);

  view.setUint8(0, PACKET_STATE_BROADCAST);
  view.setBigUint64(1, BigInt(Date.now()), true);
  view.setUint16(9, players.size, true);

  let offset = headerSize;
  for (const p of players.values()) {
    // Player ID (36 bytes, padded with nulls)
    const idBytes = new TextEncoder().encode(p.id);
    u8.set(idBytes.subarray(0, 36), offset);
    offset += 36;

    // Position
    view.setFloat32(offset, p.position.x, true);
    view.setFloat32(offset + 4, p.position.y, true);
    view.setFloat32(offset + 8, p.position.z, true);
    offset += 12;

    // Rotation
    view.setFloat32(offset, 0, true);
    view.setFloat32(offset + 4, p.rotation.y, true);
    view.setFloat32(offset + 8, 0, true);
    offset += 12;

    // Velocity (approximate from deltas - for now send zeros)
    view.setFloat32(offset, 0, true);
    view.setFloat32(offset + 4, 0, true);
    view.setFloat32(offset + 8, 0, true);
    offset += 12;
  }

  return buf;
}

function sendJson(ws: WebSocket, obj: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcastJson(
  players: Map<string, PlayerInfo>,
  obj: unknown,
  excludeId?: string,
): void {
  const data = JSON.stringify(obj);
  for (const p of players.values()) {
    if (p.id !== excludeId && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(data);
    }
  }
}
