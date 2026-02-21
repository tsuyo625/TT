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

/** NPC state simulated on the server */
interface NpcInfo {
  index: number;
  kind: string;
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  rotY: number;
  targetX: number;
  targetZ: number;
  state: "walk" | "pause";
  timer: number;
  speed: number;
  wanderRadius: number;
  mapHalf: number;
}

// NPC spawn definitions (must match client order exactly)
const NPC_SPAWNS: { kind: string; x: number; z: number }[] = [
  // Animals
  { kind: "cat", x: 12, z: 8 },
  { kind: "cat", x: -14, z: 12 },
  { kind: "cat", x: 18, z: -8 },
  { kind: "cat", x: -20, z: -14 },
  { kind: "cat", x: 5, z: 30 },
  { kind: "cat", x: -8, z: -30 },
  { kind: "cat", x: 270, z: 260 },
  { kind: "cat", x: 290, z: 310 },
  { kind: "elephant", x: 55, z: 25 },
  { kind: "elephant", x: -55, z: -30 },
  { kind: "elephant", x: 200, z: 150 },
  { kind: "elephant", x: -200, z: -200 },
  { kind: "lion", x: 35, z: 40 },
  { kind: "lion", x: -35, z: -40 },
  { kind: "lion", x: 50, z: -15 },
  { kind: "lion", x: 300, z: -100 },
  { kind: "lion", x: -250, z: 150 },
  { kind: "cat", x: -300, z: 280 },
  { kind: "cat", x: -280, z: 300 },
  // Giant creatures
  { kind: "titan", x: -80, z: -80 },
  { kind: "dragon", x: 280, z: 280 },
  { kind: "forest_guardian", x: -300, z: 280 },
  { kind: "cave_golem", x: -320, z: -280 },
];

const NPC_SPEEDS: Record<string, number> = {
  cat: 2.0, elephant: 1.5, lion: 2.5,
  titan: 3, dragon: 4, forest_guardian: 2, cave_golem: 1.5,
};
const NPC_WANDER: Record<string, number> = {
  cat: 25, elephant: 40, lion: 35,
  titan: 300, dragon: 150, forest_guardian: 120, cave_golem: 100,
};
const NPC_MAP_HALF: Record<string, number> = {
  cat: 80, elephant: 80, lion: 80,
  titan: 500, dragon: 500, forest_guardian: 500, cave_golem: 500,
};
// Override map half for animals in expanded areas (index 6+ animals)
const EXPANDED_ANIMAL_INDICES = new Set([6, 7, 10, 11, 15, 16, 17, 18]);

const PAUSE_MIN = 1.5;
const PAUSE_MAX = 5.0;
const GIANT_PAUSE_MIN = 5;
const GIANT_PAUSE_MAX = 15;

const BROADCAST_INTERVAL_MS = 50; // 20 Hz state broadcast
const NPC_BROADCAST_INTERVAL_MS = 100; // 10 Hz NPC broadcast
const NPC_SIM_INTERVAL_MS = 50; // 20 Hz simulation tick
const PACKET_POSITION = 0x01;
const PACKET_NPC_STATE = 0xfe;
const PACKET_STATE_BROADCAST = 0xff;

function createNpcs(): NpcInfo[] {
  return NPC_SPAWNS.map((spawn, index) => {
    const isGiant = index >= 19;
    const mapHalf = EXPANDED_ANIMAL_INDICES.has(index) ? 500 : (NPC_MAP_HALF[spawn.kind] ?? 80);
    return {
      index,
      kind: spawn.kind,
      homeX: spawn.x,
      homeZ: spawn.z,
      x: spawn.x,
      z: spawn.z,
      rotY: 0,
      targetX: spawn.x,
      targetZ: spawn.z,
      state: "pause" as const,
      timer: Math.random() * (isGiant ? GIANT_PAUSE_MAX : PAUSE_MAX),
      speed: NPC_SPEEDS[spawn.kind] ?? 2,
      wanderRadius: NPC_WANDER[spawn.kind] ?? 25,
      mapHalf,
    };
  });
}

function pickNpcTarget(npc: NpcInfo): void {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * npc.wanderRadius;
  npc.targetX = npc.homeX + Math.cos(angle) * dist;
  npc.targetZ = npc.homeZ + Math.sin(angle) * dist;
  npc.targetX = Math.max(-npc.mapHalf, Math.min(npc.mapHalf, npc.targetX));
  npc.targetZ = Math.max(-npc.mapHalf, Math.min(npc.mapHalf, npc.targetZ));
}

function updateNpc(npc: NpcInfo, dt: number): void {
  const isGiant = npc.index >= 19;

  if (npc.state === "pause") {
    npc.timer -= dt;
    if (npc.timer <= 0) {
      pickNpcTarget(npc);
      npc.state = "walk";
    }
    return;
  }

  const dx = npc.targetX - npc.x;
  const dz = npc.targetZ - npc.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const arrivalDist = isGiant ? 5 : 0.5;

  if (dist < arrivalDist) {
    npc.state = "pause";
    const pMin = isGiant ? GIANT_PAUSE_MIN : PAUSE_MIN;
    const pMax = isGiant ? GIANT_PAUSE_MAX : PAUSE_MAX;
    npc.timer = pMin + Math.random() * (pMax - pMin);
    return;
  }

  const nx = dx / dist;
  const nz = dz / dist;
  const step = npc.speed * dt;
  npc.x += nx * step;
  npc.z += nz * step;

  // Face direction (giant creatures turn slowly)
  const targetRot = Math.atan2(nx, nz);
  if (isGiant) {
    let diff = targetRot - npc.rotY;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    npc.rotY += diff * dt * 0.5;
  } else {
    npc.rotY = targetRot;
  }
}

function buildNpcBroadcast(npcs: NpcInfo[]): ArrayBuffer {
  // Header: 1 byte type + 2 byte count = 3
  // Per NPC: 1 byte index + 4 x + 4 z + 4 rotY = 13
  const headerSize = 3;
  const perNpc = 13;
  const buf = new ArrayBuffer(headerSize + npcs.length * perNpc);
  const view = new DataView(buf);

  view.setUint8(0, PACKET_NPC_STATE);
  view.setUint16(1, npcs.length, true);

  let offset = headerSize;
  for (const npc of npcs) {
    view.setUint8(offset, npc.index);
    view.setFloat32(offset + 1, npc.x, true);
    view.setFloat32(offset + 5, npc.z, true);
    view.setFloat32(offset + 9, npc.rotY, true);
    offset += perNpc;
  }

  return buf;
}

export function attachOpenWorldWs(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: "/ws/game" });
  const players = new Map<string, PlayerInfo>();
  const npcs = createNpcs();

  // NPC simulation tick
  let lastNpcTick = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = (now - lastNpcTick) / 1000;
    lastNpcTick = now;
    for (const npc of npcs) {
      updateNpc(npc, dt);
    }
  }, NPC_SIM_INTERVAL_MS);

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

  // NPC state broadcast at 10 Hz
  setInterval(() => {
    if (players.size === 0) return;

    const buf = buildNpcBroadcast(npcs);
    const data = Buffer.from(buf);

    for (const p of players.values()) {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(data);
      }
    }
  }, NPC_BROADCAST_INTERVAL_MS);

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
