import { Engine } from "../core/Engine";
import { InputManager } from "../core/InputManager";
import { Player } from "../entities/Player";
import { AIPlayer } from "../entities/AIPlayer";
import { Ground } from "../world/Ground";
import { Obstacle } from "../world/Obstacle";
import { Can } from "../world/Can";
import { PARK_MAP, CAN_POSITION, SEEKER_SPAWN, HIDER_SPAWNS } from "../world/GameMap";
import { HUD } from "../ui/HUD";

type GamePhase = "countdown" | "seeking" | "finished";

const AI_COLORS = [0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6];
const KICK_RANGE = 2.0;
const FIND_RANGE = 3.0;
const COUNTDOWN_TIME = 10;
const GAME_TIME = 120;

export class OfflineGameScene {
  private engine: Engine;
  private input: InputManager;
  private hud: HUD;

  private player!: Player;
  private aiPlayers: AIPlayer[] = [];
  private can!: Can;

  private phase: GamePhase = "countdown";
  private timer = COUNTDOWN_TIME;
  private capturedCount = 0;
  private playerRole: "seeker" | "hider" = "hider";
  private onBack: (() => void) | null = null;

  constructor(engine: Engine, input: InputManager, hud: HUD, onBack: () => void) {
    this.engine = engine;
    this.input = input;
    this.hud = hud;
    this.onBack = onBack;
  }

  init(): void {
    // Ground
    const ground = new Ground(60);
    this.engine.scene.add(ground.mesh);
    this.engine.physicsWorld.addBody(ground.body);

    // Obstacles
    for (const data of PARK_MAP) {
      const obs = new Obstacle(data);
      this.engine.scene.add(obs.mesh);
      this.engine.physicsWorld.addBody(obs.body);
    }

    // Can
    this.can = new Can(CAN_POSITION.x, CAN_POSITION.z);
    this.engine.scene.add(this.can.mesh);
    this.engine.physicsWorld.addBody(this.can.body);

    // Player is hider, AI is seeker
    this.playerRole = "hider";
    const spawn = HIDER_SPAWNS[0];
    this.player = new Player(this.input, 0x3498db, spawn.x, spawn.z);
    this.player.role = "hider";
    this.engine.scene.add(this.player.mesh);
    this.engine.physicsWorld.addBody(this.player.body);

    // AI seeker (the oni)
    const seeker = new AIPlayer(0xe74c3c, SEEKER_SPAWN.x, SEEKER_SPAWN.z, "seeker");
    this.aiPlayers.push(seeker);
    this.engine.scene.add(seeker.mesh);
    this.engine.physicsWorld.addBody(seeker.body);

    // AI hiders (teammates)
    for (let i = 1; i < 3; i++) {
      const hiderSpawn = HIDER_SPAWNS[i];
      const hider = new AIPlayer(AI_COLORS[i], hiderSpawn.x, hiderSpawn.z, "hider");
      this.aiPlayers.push(hider);
      this.engine.scene.add(hider.mesh);
      this.engine.physicsWorld.addBody(hider.body);
    }

    // HUD
    this.hud.show();
    this.hud.setPhase("隠れろ!");
    this.hud.showMessage("鬼が数えている間に隠れろ!", 3000);
    this.hud.onAction = () => this.handleAction();
    this.input.onTap = () => {};

    // Game loop
    this.engine.onUpdate((dt) => this.update(dt));

    // Start countdown
    this.phase = "countdown";
    this.timer = COUNTDOWN_TIME;
  }

  private update(dt: number): void {
    // Timer
    this.timer -= dt;

    if (this.phase === "countdown" && this.timer <= 0) {
      this.phase = "seeking";
      this.timer = GAME_TIME;
      this.hud.showMessage("鬼が探し始めた!", 2000);
    } else if (this.phase === "seeking" && this.timer <= 0) {
      this.endGame("hider");
      return;
    }

    // Player movement
    this.player.update(dt);

    // Camera follows player
    const px = this.player.mesh.position.x;
    const pz = this.player.mesh.position.z;
    this.engine.camera.position.set(px, 12, pz + 10);
    this.engine.camera.lookAt(px, 0, pz);

    // Can sync
    this.can.sync();

    // AI updates
    const playerPos = this.player.getPosition();
    for (const ai of this.aiPlayers) {
      if (this.phase === "countdown" && ai.role === "seeker") {
        // Seeker stays still during countdown
        ai.body.velocity.set(0, ai.body.velocity.y, 0);
      } else {
        ai.update(dt, playerPos.x, playerPos.z);
      }
    }

    // AI seeker auto-finds nearby hiders
    if (this.phase === "seeking") {
      this.aiSeekerLogic();
    }

    // HUD
    this.updateHUD();
  }

  private aiSeekerLogic(): void {
    const seeker = this.aiPlayers.find((a) => a.role === "seeker");
    if (!seeker) return;

    // Check if seeker caught the player
    const distToPlayer = seeker.distanceTo(
      this.player.body.position.x,
      this.player.body.position.z
    );
    if (distToPlayer < FIND_RANGE && !this.player.captured) {
      // Seeker needs to go back to can to declare
      const distToCan = seeker.distanceTo(CAN_POSITION.x, CAN_POSITION.z);
      if (distToCan < KICK_RANGE) {
        this.player.captured = true;
        this.capturedCount++;
        this.hud.showMessage("見つかった!", 2000);
        this.checkWinCondition();
      }
    }

    // Check AI hiders
    for (const ai of this.aiPlayers) {
      if (ai.role === "hider" && !ai.captured) {
        const dist = seeker.distanceTo(ai.body.position.x, ai.body.position.z);
        if (dist < FIND_RANGE) {
          ai.captured = true;
          this.capturedCount++;
          this.checkWinCondition();
        }
      }
    }
  }

  private updateHUD(): void {
    const totalHiders = this.aiPlayers.filter((a) => a.role === "hider").length + 1;

    switch (this.phase) {
      case "countdown":
        this.hud.setPhase("隠れろ!");
        this.hud.hideAction();
        break;
      case "seeking": {
        this.hud.setPhase(this.player.captured ? "捕まった..." : "逃げろ!");
        // Show kick button if near can
        const distToCan = this.player.distanceTo(CAN_POSITION.x, CAN_POSITION.z);
        if (!this.player.captured && distToCan < KICK_RANGE) {
          this.hud.showAction("缶を蹴る!");
        } else {
          this.hud.hideAction();
        }
        break;
      }
      case "finished":
        this.hud.setPhase("終了");
        this.hud.hideAction();
        break;
    }

    this.hud.setTimer(Math.max(0, this.timer));
    this.hud.setStatus(`捕獲: ${this.capturedCount} / ${totalHiders}`);
  }

  private handleAction(): void {
    if (this.phase !== "seeking") return;
    if (this.player.captured) return;

    const distToCan = this.player.distanceTo(CAN_POSITION.x, CAN_POSITION.z);
    if (distToCan < KICK_RANGE) {
      this.can.kick(this.player.body.position.x, this.player.body.position.z);
      this.hud.showMessage("缶を蹴った! 仲間が解放された!", 2000);

      // Free all captured hiders
      this.player.captured = false;
      for (const ai of this.aiPlayers) {
        if (ai.role === "hider") {
          ai.captured = false;
        }
      }
      this.capturedCount = 0;

      // Reset can after delay
      setTimeout(() => this.can.reset(), 3000);
    }
  }

  private checkWinCondition(): void {
    const totalHiders = this.aiPlayers.filter((a) => a.role === "hider").length + 1;
    if (this.capturedCount >= totalHiders) {
      this.endGame("seeker");
    }
  }

  private endGame(winner: string): void {
    this.phase = "finished";
    const msg = winner === "seeker" ? "鬼の勝ち!" : "逃げ切り成功!";
    this.hud.showMessage(msg + "\n\nタップで戻る", 0);

    // Tap to go back to title
    setTimeout(() => {
      this.input.onTap = () => {
        this.dispose();
        this.onBack?.();
      };
    }, 1000);
  }

  private dispose(): void {
    // Clear scene (simple approach: remove all children)
    while (this.engine.scene.children.length > 0) {
      this.engine.scene.remove(this.engine.scene.children[0]);
    }
    this.hud.hide();
    this.hud.hideMessage();
  }
}
