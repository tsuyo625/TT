import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { createServer } from "http";
import { KankeriRoom } from "./rooms/KankeriRoom.js";

const app = express();
const httpServer = createServer(app);

const port = Number(process.env.PORT) || 2567;

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("kankeri", KankeriRoom);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

gameServer.listen(port).then(() => {
  console.log(`🎮 Kankeri server running on ws://localhost:${port}`);
});
