import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { InputManager } from "../systems/InputManager";
import { CameraManager } from "../systems/CameraManager";
import { DeathTracker } from "../systems/DeathTracker";
import { EvolutionManager } from "../systems/EvolutionManager";
import { LevelBuilder, type LevelObjects } from "../level/LevelBuilder";
import { CHECKPOINTS, PLAYER_START } from "../level/LevelData";
import { hitStop, physicsPause, physicsResume, resetPauseCount } from "../effects/HitStop";
import { deathBurst, evolutionBurst } from "../effects/ParticleEffects";
import type { DeathCause, EvolutionDefinition } from "../types";
import {
  MAX_DEATHS,
  TILE_SIZE,
  STAGE_TIME_LIMIT_SEC,
  PLAYER_JUMP_VELOCITY,
} from "../config/Constants";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private cameraManager!: CameraManager;
  private deathTracker!: DeathTracker;
  private evolutionManager!: EvolutionManager;
  private level!: LevelObjects;
  private projectileGroup!: Phaser.GameObjects.Group;

  private deathCount = 0;
  private stageTimer = 0;
  private lastCheckpoint = { x: 0, y: 0 };
  private isDead = false;
  private hasWon = false;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.deathCount = 0;
    this.stageTimer = STAGE_TIME_LIMIT_SEC;
    this.isDead = false;
    this.hasWon = false;
    resetPauseCount();

    this.deathTracker = new DeathTracker();
    this.evolutionManager = new EvolutionManager();
    this.inputManager = new InputManager(this);

    // Projectile group for shooter enemies (physics group for proper collision)
    this.projectileGroup = this.physics.add.group({ allowGravity: false });

    // Create player at start position
    const startX = PLAYER_START.tileX * TILE_SIZE + TILE_SIZE / 2;
    const startY = PLAYER_START.tileY * TILE_SIZE;
    this.player = new Player(this, startX, startY, this.inputManager);

    // Build level
    const builder = new LevelBuilder();
    this.level = builder.build(this, this.player.sprite, this.projectileGroup);

    // Set initial checkpoint
    this.lastCheckpoint = { x: startX, y: startY };

    // Camera
    this.cameraManager = new CameraManager(this);
    this.cameraManager.followPlayer(this.player.sprite);
    this.cameraManager.setBounds(0, 0, this.level.levelWidth, this.level.levelHeight);

    // Physics collisions
    this.setupCollisions();

    // Listen for player attack
    this.events.on("player-attack", this.onPlayerAttack, this);

    // Listen for player hit
    this.events.on("player-hit", this.onPlayerDeath, this);
  }

  private setupCollisions(): void {
    // Player vs platforms
    this.physics.add.collider(this.player.sprite, this.level.platforms, undefined, (_player, platform) => {
      // One-way platform: only collide if player is falling and above the platform
      const platGO = platform as Phaser.GameObjects.Sprite;
      if (platGO.getData("oneWay")) {
        const pBody = this.player.body;
        const platBody = platGO.body as Phaser.Physics.Arcade.StaticBody;
        return pBody.velocity.y >= 0 && pBody.bottom <= platBody.top + 8;
      }
      return true;
    });

    // Enemies vs platforms
    const enemySprites = this.level.enemies.map((e) => e.sprite);
    for (const es of enemySprites) {
      if (es.active) {
        this.physics.add.collider(es, this.level.platforms);
      }
    }

    // Player vs spikes
    this.physics.add.overlap(this.player.sprite, this.level.spikes, () => {
      this.player.takeDamage("fall");
    });

    // Player vs enemies (contact damage / stomp)
    for (const enemy of this.level.enemies) {
      this.physics.add.overlap(this.player.sprite, enemy.sprite, () => {
        if (!enemy.isAlive() || this.isDead) return;

        const playerBody = this.player.body;
        const enemyBody = enemy.sprite.body as Phaser.Physics.Arcade.Body;

        // Stomp check: player falling and above enemy
        if (playerBody.velocity.y > 0 && playerBody.bottom < enemyBody.top + 12) {
          // Stomp!
          playerBody.velocity.y = PLAYER_JUMP_VELOCITY * 0.6;
          enemy.takeDamage(1);
          hitStop(this);
          this.cameraManager.shake();
        } else {
          // Contact damage
          this.player.takeDamage("enemy");
        }
      });
    }

    // Player vs projectiles
    this.physics.add.overlap(this.player.sprite, this.projectileGroup, (_player, projectile) => {
      (projectile as Phaser.GameObjects.Sprite).destroy();
      this.player.takeDamage("enemy");
    });

    // Projectiles vs platforms (destroy on impact)
    this.physics.add.collider(this.projectileGroup, this.level.platforms, (_proj) => {
      (_proj as Phaser.GameObjects.Sprite).destroy();
    });

    // Player vs goal
    if (this.level.goal) {
      this.physics.add.overlap(this.player.sprite, this.level.goal, () => {
        if (!this.hasWon) {
          this.onWin();
        }
      });
    }
  }

  update(_time: number, delta: number): void {
    if (this.hasWon) return;

    const dt = Math.min(delta / 1000, 1 / 30);

    // Timer
    if (!this.isDead) {
      this.stageTimer -= dt;
      this.events.emit("timer-update", Math.max(0, this.stageTimer));

      if (this.stageTimer <= 0) {
        this.stageTimer = 0;
        this.onPlayerDeath("timeout");
        return;
      }
    }

    // Player update
    if (!this.isDead) {
      this.player.update(dt);
    }

    // Enemy update
    for (const enemy of this.level.enemies) {
      if (enemy.isAlive()) {
        enemy.update(dt);
      }
    }

    // Fall death check
    if (!this.isDead && this.player.sprite.y > this.level.deathY) {
      this.onPlayerDeath("fall");
    }

    // Checkpoint detection
    if (!this.isDead) {
      for (const cp of CHECKPOINTS) {
        const cpX = cp.tileX * TILE_SIZE + TILE_SIZE / 2;
        const cpY = cp.tileY * TILE_SIZE;
        if (this.player.sprite.x >= cpX && this.lastCheckpoint.x < cpX) {
          this.lastCheckpoint = { x: cpX, y: cpY };
        }
      }
    }
  }

  private onPlayerAttack(hitbox: Phaser.GameObjects.Zone, damage: number): void {
    for (const enemy of this.level.enemies) {
      if (!enemy.isAlive()) continue;

      const hb = hitbox.getBounds();
      const eb = enemy.sprite.getBounds();

      if (Phaser.Geom.Rectangle.Overlaps(hb, eb)) {
        enemy.takeDamage(damage);
        hitStop(this);
        this.cameraManager.shake();
      }
    }
  }

  private onPlayerDeath(cause: DeathCause): void {
    if (this.isDead || this.player.isInvincible) return;
    this.isDead = true;

    this.deathCount++;
    this.deathTracker.recordDeath(cause);

    // Visual effects
    deathBurst(this, this.player.sprite.x, this.player.sprite.y - 16);
    this.cameraManager.shake();
    this.cameras.main.flash(200, 255, 50, 50);

    // Emit for UI
    this.events.emit("player-death", {
      cause,
      deathCount: this.deathCount,
      maxDeaths: MAX_DEATHS,
      counts: this.deathTracker.getAllCounts(),
    });

    // Check game over
    if (this.deathCount >= MAX_DEATHS) {
      this.time.delayedCall(1500, () => {
        this.goToGameOver(false);
      });
      return;
    }

    // Check evolution
    const evo = this.evolutionManager.checkEvolution(this.deathTracker);
    if (evo) {
      this.time.delayedCall(800, () => {
        this.triggerEvolution(evo);
      });
    } else {
      this.time.delayedCall(1200, () => {
        this.respawn();
      });
    }
  }

  private triggerEvolution(evo: EvolutionDefinition): void {
    // Pause physics during evolution popup (reference-counted)
    physicsPause(this);

    this.events.emit("evolution-granted", evo);

    evolutionBurst(this, this.player.sprite.x, this.player.sprite.y - 16, 0xffdd44);

    this.time.delayedCall(2000, () => {
      this.player.applyEvolution(evo.type);
      physicsResume(this);
      this.respawn();
    });
  }

  private respawn(): void {
    this.isDead = false;
    this.player.respawnAt(this.lastCheckpoint.x, this.lastCheckpoint.y);
  }

  private onWin(): void {
    this.hasWon = true;
    physicsPause(this);
    this.cameras.main.flash(400, 255, 215, 0);

    this.events.emit("stage-clear");

    this.time.delayedCall(2000, () => {
      this.goToGameOver(true);
    });
  }

  private goToGameOver(won: boolean): void {
    this.scene.stop("UIScene");
    this.scene.start("GameOverScene", {
      won,
      deathCounts: this.deathTracker.getAllCounts(),
      totalDeaths: this.deathCount,
      evolution: this.evolutionManager.getCurrentEvolution(),
      timeElapsed: STAGE_TIME_LIMIT_SEC - this.stageTimer,
    });
  }
}
