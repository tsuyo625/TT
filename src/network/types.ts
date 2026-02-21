// Packet type constants
export const PACKET_POSITION = 0x01;
export const PACKET_VELOCITY = 0x02;
export const PACKET_INPUT = 0x03;
export const PACKET_STATE_BROADCAST = 0xff;

// Remote player state from server broadcast
export interface RemotePlayerState {
  playerId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  lastUpdate: number;
}

// Network events emitted to the scene
export type NetworkEvent =
  | { type: "connected"; localPlayerId: string }
  | { type: "disconnected"; reason: string }
  | { type: "player_joined"; playerId: string; name?: string }
  | { type: "player_left"; playerId: string }
  | { type: "player_name"; playerId: string; name: string }
  | {
      type: "state_update";
      players: Map<string, RemotePlayerState>;
      serverTime: number;
    }
  | { type: "chat"; playerId: string; message: string; timestamp: number }
  | { type: "action"; playerId: string; action: string; params: unknown };

// Outgoing messages (JSON over BiDi stream)
export interface ChatMessage {
  type: "chat";
  message: string;
  id: number;
}

export interface ActionMessage {
  type: "action";
  action: string;
  params: unknown;
  id: number;
}

export interface PingMessage {
  type: "ping";
}

export interface GetStateMessage {
  type: "get_state";
}

export type OutgoingMessage =
  | ChatMessage
  | ActionMessage
  | PingMessage
  | GetStateMessage;

// Incoming responses (JSON)
export interface AckResponse {
  type: "ack";
  id: number;
}

export interface PongResponse {
  type: "pong";
  timestamp: number;
}

export interface FullStateResponse {
  type: "full_state";
  players: Record<
    string,
    {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      velocity: { x: number; y: number; z: number };
      lastUpdate: number;
    }
  >;
  serverTime: number;
}

export interface ErrorResponse {
  type: "error";
  message: string;
}

// Broadcast messages from server (via unidirectional streams)
export interface WelcomeBroadcast {
  type: "welcome";
  playerId: string;
  serverTime: number;
}

export interface PlayerJoinedBroadcast {
  type: "player_joined";
  playerId: string;
  name?: string;
}

export interface PlayerLeftBroadcast {
  type: "player_left";
  playerId: string;
}

export interface PlayerNameBroadcast {
  type: "player_name";
  playerId: string;
  name: string;
}

export interface ChatBroadcast {
  type: "chat";
  playerId: string;
  message: string;
  timestamp: number;
}

export interface ActionBroadcast {
  type: "action";
  playerId: string;
  action: string;
  params: unknown;
  timestamp: number;
}

export type IncomingBroadcast =
  | WelcomeBroadcast
  | PlayerJoinedBroadcast
  | PlayerLeftBroadcast
  | PlayerNameBroadcast
  | ChatBroadcast
  | ActionBroadcast;

// Network config
export interface NetworkConfig {
  serverUrl: string;
  /** WebSocket fallback URL (used when WebTransport is unavailable) */
  wsUrl?: string;
  reconnectAttempts?: number;
  reconnectDelayMs?: number;
  /** Base64-encoded SHA-256 certificate hash for self-signed certs */
  certHash?: string;
}
