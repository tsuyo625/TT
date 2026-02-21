import Phaser from "phaser";
import type { DeathCause, EvolutionType } from "../types";
import { InputManager } from "../systems/InputManager";
import { deathBurst } from "../effects/ParticleEffects";
import {
  PLAYER_SPEED,
  PLAYER_ACCELERATION,
  PLAYER_DECELERATION,
  PLAYER_JUMP_VELOCITY,
  PLAYER_MAX_FALL_SPEED,
  COYOTE_TIME_MS,
  JUMP_BUFFER_MS,
  VARIABLE_JUMP_MULTIPLIER,
  ATTACK_RANGE,
  ATTACK_DAMAGE,
  ATTACK_DURATION_MS,
  ATTACK_COOLDOWN_MS,
  WING_EVOLUTION_EXTRA_JUMPS,
  POWER_EVOLUTION_DAMAGE_MULT,
  SPEED_EVOLUTION_SPEED_MULT,
} from "../config/Constants";

export class Player {
  sprite: Phaser.Physics.Arcade.Sprite;
  lastDamageSource: DeathCause = "fall";

  private scene: Phaser.Scene;
  private input: InputManager;

  // Movement
  private speed: number = PLAYER_SPEED;

  // Jump
  private isGrounded = false;
  private wasGrounded = false;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private isJumping = false;
  private airJumpsRemaining = 0;
  private maxAirJumps = 0;

  // Attack
  private attackCooldownTimer = 0;
  private attackDamage: number = ATTACK_DAMAGE;
  private facingRight = true;

  // Evolution
  private evolution: EvolutionType | null = null;

  // Invincibility after respawn
  private invincibleTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, input: InputManager) {
    this.scene = scene;
    this.input = input;

    this.sprite = scene.physics.add.sprite(x, y, "player");
    this.sprite.setOrigin(0.5, 1);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 30);
    body.setOffset(2, 2);
    body.setMaxVelocityY(PLAYER_MAX_FALL_SPEED);
    body.setCollideWorldBounds(false);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get isInvincible(): boolean {
    return this.invincibleTimer > 0;
  }

  update(dt: number): void {
    const dtMs = dt * 1000;

    // Invincibility timer
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dtMs;
      this.sprite.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.3);
      if (this.invincibleTimer <= 0) {
        this.sprite.setAlpha(1);
      }
    }

    // Attack cooldown
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= dtMs;
    }

    this.updateMovement(dtMs);
    this.updateJump(dtMs);
    this.updateAttack();
  }

  private updateMovement(dtMs: number): void {
    const body = this.body;

    if (this.input.left) {
      body.setAccelerationX(-PLAYER_ACCELERATION);
      body.setDragX(0);
      this.sprite.setFlipX(true);
      this.facingRight = false;
    } else if (this.input.right) {
      body.setAccelerationX(PLAYER_ACCELERATION);
      body.setDragX(0);
      this.sprite.setFlipX(false);
      this.facingRight = true;
    } else {
      body.setAccelerationX(0);
      body.setDragX(PLAYER_DECELERATION);
    }

    // Clamp horizontal speed
    if (Math.abs(body.velocity.x) > this.speed) {
      body.velocity.x = Phaser.Math.Clamp(body.velocity.x, -this.speed, this.speed);
    }
  }

  private updateJump(dtMs: number): void {
    const body = this.body;

    // Ground check
    this.wasGrounded = this.isGrounded;
    this.isGrounded = body.blocked.down;

    // Coyote time: fell off edge (not jumped)
    if (this.wasGrounded && !this.isGrounded && !this.isJumping) {
      this.coyoteTimer = COYOTE_TIME_MS;
    }
    if (!this.isGrounded) {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dtMs);
    }

    // Jump buffer
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dtMs);

    // Landing
    if (this.isGrounded && !this.wasGrounded) {
      this.isJumping = false;
      this.airJumpsRemaining = this.maxAirJumps;
      if (this.jumpBufferTimer > 0) {
        this.executeJump();
        this.jumpBufferTimer = 0;
      }
    }

    // Jump input
    if (this.input.consumeJump()) {
      const canJump = this.isGrounded || this.coyoteTimer > 0;
      if (canJump) {
        this.executeJump();
      } else if (this.airJumpsRemaining > 0) {
        this.executeAirJump();
      } else {
        this.jumpBufferTimer = JUMP_BUFFER_MS;
      }
    }

    // Variable jump height: release early = shorter jump
    if (this.isJumping && !this.input.jumpHeld && body.velocity.y < 0) {
      body.velocity.y *= VARIABLE_JUMP_MULTIPLIER;
      this.isJumping = false;
    }
  }

  private executeJump(): void {
    this.body.velocity.y = PLAYER_JUMP_VELOCITY;
    this.isJumping = true;
    this.coyoteTimer = 0;
    this.isGrounded = false;
  }

  private executeAirJump(): void {
    this.body.velocity.y = PLAYER_JUMP_VELOCITY * 0.85;
    this.airJumpsRemaining--;
    this.isJumping = true;
    deathBurst(this.scene, this.sprite.x, this.sprite.y, 0x4488ff);
  }

  private updateAttack(): void {
    if (!this.input.consumeAttack()) return;
    if (this.attackCooldownTimer > 0) return;

    this.attackCooldownTimer = ATTACK_COOLDOWN_MS;

    const dirX = this.facingRight ? 1 : -1;
    const hitboxX = this.sprite.x + dirX * (ATTACK_RANGE / 2 + 4);
    const hitboxY = this.sprite.y - 16;

    // Visual feedback
    const visual = this.scene.add.sprite(hitboxX, hitboxY, "attack-hitbox");
    visual.setAlpha(0.6);
    visual.setFlipX(!this.facingRight);

    // Physics hitbox
    const hitbox = this.scene.add.zone(hitboxX, hitboxY, ATTACK_RANGE, 32);
    this.scene.physics.add.existing(hitbox, false);
    (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Emit attack event with hitbox and damage info
    this.scene.events.emit("player-attack", hitbox, this.attackDamage);

    this.scene.time.delayedCall(ATTACK_DURATION_MS, () => {
      visual.destroy();
      hitbox.destroy();
    });
  }

  applyEvolution(type: EvolutionType): void {
    this.evolution = type;
    switch (type) {
      case "wings":
        this.maxAirJumps = WING_EVOLUTION_EXTRA_JUMPS;
        this.airJumpsRemaining = this.maxAirJumps;
        this.sprite.setTexture("player-wings");
        break;
      case "power":
        this.attackDamage = ATTACK_DAMAGE * POWER_EVOLUTION_DAMAGE_MULT;
        this.sprite.setTint(0xff6666);
        break;
      case "speed":
        this.speed = PLAYER_SPEED * SPEED_EVOLUTION_SPEED_MULT;
        this.sprite.setTint(0x6666ff);
        break;
    }
  }

  takeDamage(source: DeathCause): void {
    if (this.invincibleTimer > 0) return;
    this.lastDamageSource = source;
    this.scene.events.emit("player-hit", source);
  }

  respawnAt(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.body.setVelocity(0, 0);
    this.body.setAcceleration(0, 0);
    this.isJumping = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.airJumpsRemaining = this.maxAirJumps;
    this.invincibleTimer = 1500;
    this.sprite.setAlpha(0.5);
  }

  getEvolution(): EvolutionType | null {
    return this.evolution;
  }
}
