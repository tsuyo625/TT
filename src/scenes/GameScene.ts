import * as THREE from "three";
import { Engine } from "../core/Engine";
import { InputManager } from "../core/InputManager";
import { Player } from "../entities/Player";
import { RemotePlayer } from "../entities/RemotePlayer";
import { Ground } from "../world/Ground";
import { Obstacle } from "../world/Obstacle";
import { Can } from "../world/Can";
import { PARK_MAP, CAN_POSITION, SEEKER_SPAWN, HIDER_SPAWNS } from "../world/GameMap";
import { HUD } from "../ui/HUD";
import { NetworkManager } from "../network/NetworkManager";

type GamePhase = "lobby" | "countdown" | "seeking" | "finished";

const PLAYER_COLORS = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c];
const KICK_RANGE = 2.0;
const FIND_RANGE = 3.0;

export class GameScene {
  private engine: Engine;
  private input: InputManager;
  private hud: HUD;
  private network: NetworkManager;

  private player!: Player;
  private remotePlayers = new Map<string, RemotePlayer>();
  private can!: Can;
  private obstacles: Obstacle[] = [];

  private phase: GamePhase = "lobby";
  private timer = 0;
  private localColor: number;

  constructor(
    engine: Engine,
    input: InputManager,
    hud: HUD,
    network: NetworkManager,
    playerIndex: number
  ) {
    this.engine = engine;
    this.input = input;
    this.hud = hud;
    this.network = network;
    this.localColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
  }

  async init(): Promise<void> {
    // Ground
    const ground = new Ground(60);
    this.engine.scene.add(ground.mesh);
    this.engine.physicsWorld.addBody(ground.body);

    // Obstacles
    for (const data of PARK_MAP) {
      const obs = new Obstacle(data);
      this.engine.scene.add(obs.mesh);
      this.engine.physicsWorld.addBody(obs.body);
      this.obstacles.push(obs);
    }

    // Can
    this.can = new Can(CAN_POSITION.x, CAN_POSITION.z);
    this.engine.scene.add(this.can.mesh);
    this.engine.physicsWorld.addBody(this.can.body);

    // Local player
    const spawn = HIDER_SPAWNS[0];
    this.player = new Player(this.input, this.localColor, spawn.x, spawn.z);
    this.engine.scene.add(this.player.mesh);
    this.engine.physicsWorld.addBody(this.player.body);

    // HUD
    this.hud.show();
    this.hud.setPhase("待機中...");
    this.hud.setStatus("プレイヤーを待っています");
    this.hud.onAction = () => this.handleAction();

    // Input tap -> action
    this.input.onTap = () => this.handleAction();

    // Network handlers
    this.setupNetworkHandlers();

    // Game loop
    this.engine.onUpdate((dt) => this.update(dt));
  }

  private setupNetworkHandlers(): void {
    this.network.onStateChange((state) => {
      this.phase = state.phase;
      this.timer = state.timer;

      // Update local player role
      const localState = state.players.get(this.network.sessionId);
      if (localState) {
        this.player.role = localState.role;
        this.player.captured = localState.captured;
      }

      // Sync remote players
      state.players.forEach((pState, id) => {
        if (id === this.network.sessionId) return;

        let remote = this.remotePlayers.get(id);
        if (!remote) {
          const idx = Array.from(state.players.keys()).indexOf(id);
          const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
          remote = new RemotePlayer(id, color, pState.x, pState.z);
          this.remotePlayers.set(id, remote);
          this.engine.scene.add(remote.mesh);
        }

        remote.setTarget(pState.x, pState.z, pState.rotation);
        remote.role = pState.role;
        remote.captured = pState.captured;
      });

      // Remove disconnected players
      for (const [id, remote] of this.remotePlayers) {
        if (!state.players.has(id)) {
          remote.dispose(this.engine.scene);
          this.remotePlayers.delete(id);
        }
      }

      // Sync can position from server
      if (state.can) {
        this.can.body.position.set(state.can.x, state.can.y, state.can.z);
      }
    });

    this.network.onMessage("kicked", () => {
      this.hud.showMessage("缶が蹴られた!", 2000);
    });

    this.network.onMessage("found", (raw: unknown) => {
      const data = raw as { targetId: string };
      if (data.targetId === this.network.sessionId) {
        this.hud.showMessage("見つかった!", 2000);
      }
    });

    this.network.onMessage("gameOver", (raw: unknown) => {
      const data = raw as { winner: string };
      this.hud.showMessage(
        data.winner === "seeker" ? "鬼の勝ち!" : "逃げ切り成功!",
        0
      );
    });
  }

  private update(dt: number): void {
    // Player movement
    this.player.update(dt);

    // Camera follows player
    const px = this.player.mesh.position.x;
    const pz = this.player.mesh.position.z;
    this.engine.camera.position.set(px, 12, pz + 10);
    this.engine.camera.lookAt(px, 0, pz);

    // Can physics sync
    this.can.sync();

    // Remote players interpolation
    for (const remote of this.remotePlayers.values()) {
      remote.update(dt);
    }

    // Send position to server
    this.network.sendPosition(
      this.player.body.position.x,
      this.player.body.position.z,
      this.player.mesh.rotation.y
    );

    // Update HUD
    this.updateHUD();
  }

  private updateHUD(): void {
    switch (this.phase) {
      case "lobby":
        this.hud.setPhase("待機中");
        this.hud.setTimer(0);
        break;
      case "countdown":
        this.hud.setPhase("隠れろ!");
        this.hud.setTimer(this.timer);
        this.hud.hideAction();
        break;
      case "seeking":
        this.hud.setPhase(this.player.role === "seeker" ? "探せ!" : "隠れろ!");
        this.hud.setTimer(this.timer);
        this.updateActionButton();
        break;
      case "finished":
        this.hud.setPhase("終了");
        this.hud.hideAction();
        break;
    }

    const capturedCount = Array.from(this.remotePlayers.values())
      .filter((p) => p.captured).length + (this.player.captured ? 1 : 0);
    const totalHiders = this.remotePlayers.size + 1 - 1; // minus 1 seeker
    this.hud.setStatus(`捕獲: ${capturedCount} / ${Math.max(totalHiders, 1)}`);
  }

  private updateActionButton(): void {
    const distToCan = this.player.distanceTo(CAN_POSITION.x, CAN_POSITION.z);

    if (this.player.role === "hider" && !this.player.captured && distToCan < KICK_RANGE) {
      this.hud.showAction("缶を蹴る!");
    } else if (this.player.role === "seeker") {
      // Check if any hider is nearby
      let nearbyHider: string | null = null;
      for (const [id, remote] of this.remotePlayers) {
        if (remote.role === "hider" && !remote.captured) {
          const dx = this.player.body.position.x - remote.mesh.position.x;
          const dz = this.player.body.position.z - remote.mesh.position.z;
          if (Math.sqrt(dx * dx + dz * dz) < FIND_RANGE) {
            nearbyHider = id;
            break;
          }
        }
      }

      if (nearbyHider) {
        this.hud.showAction("見つけた!");
      } else if (distToCan < KICK_RANGE) {
        // Seeker needs to touch the can to declare
        this.hud.showAction("宣言する!");
      } else {
        this.hud.hideAction();
      }
    } else {
      this.hud.hideAction();
    }
  }

  private handleAction(): void {
    if (this.phase !== "seeking") return;

    const distToCan = this.player.distanceTo(CAN_POSITION.x, CAN_POSITION.z);

    if (this.player.role === "hider" && !this.player.captured && distToCan < KICK_RANGE) {
      // Kick the can
      this.can.kick(this.player.body.position.x, this.player.body.position.z);
      this.network.sendKick();
    } else if (this.player.role === "seeker") {
      // Find nearest hider
      let nearestId: string | null = null;
      let nearestDist = FIND_RANGE;
      for (const [id, remote] of this.remotePlayers) {
        if (remote.role === "hider" && !remote.captured) {
          const dx = this.player.body.position.x - remote.mesh.position.x;
          const dz = this.player.body.position.z - remote.mesh.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestId = id;
          }
        }
      }

      if (nearestId) {
        this.network.sendFind(nearestId);
      }
    }
  }

  dispose(): void {
    this.hud.dispose();
  }
}
