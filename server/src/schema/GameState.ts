import { Schema, MapSchema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("number") x: number = 0;
  @type("number") z: number = 0;
  @type("number") rotation: number = 0;
  @type("string") role: string = "hider"; // "seeker" | "hider"
  @type("boolean") captured: boolean = false;
  @type("string") name: string = "";
}

export class CanState extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0.2;
  @type("number") z: number = 0;
  @type("boolean") kicked: boolean = false;
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(CanState) can = new CanState();
  @type("string") phase: string = "lobby"; // "lobby" | "countdown" | "seeking" | "finished"
  @type("number") timer: number = 0;
  @type("number") capturedCount: number = 0;
}
