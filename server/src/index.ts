import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { createServer } from "http";
import { KankeriRoom } from "./rooms/KankeriRoom.js";
import { attachOpenWorldWs } from "./rooms/OpenWorldRoom.js";

const app = express();
const httpServer = createServer(app);

const port = Number(process.env.PORT) || 2567;

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("kankeri", KankeriRoom);

// Attach Open World WebSocket handler (separate from Colyseus)
attachOpenWorldWs(httpServer);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

gameServer.listen(port).then(() => {
  console.log(`🎮 Server running on ws://localhost:${port}`);
  console.log(`  - Kankeri (Colyseus): ws://localhost:${port}`);
  console.log(`  - Open World (WS):    ws://localhost:${port}/ws/game`);
});
