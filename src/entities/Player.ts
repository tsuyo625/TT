import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { AssetFactory } from "../core/AssetFactory";
import { InputManager } from "../core/InputManager";
import type { ViewMode } from "../core/Engine";

const WALK_ANIM_SPEED = 10;   // radians per second for limb swing
const ARM_SWING = 0.6;         // max rotation (radians) for arms
const LEG_SWING = 0.5;         // max rotation (radians) for legs
const HEAD_BOB_AMOUNT = 0.03;  // vertical head bob
const ANIM_RETURN_SPEED = 8;   // how fast limbs return to rest

// Stamina constants
const MAX_STAMINA = 100;
const STAMINA_DRAIN_RATE = 30;       // per second while dash-moving
const STAMINA_RECOVER_RATE = 12;     // per second when not dashing (normal)
const EXHAUST_DURATION = 3.0;        // seconds of blue bar
const RED_REFILL_RATE = 20;          // per second after exhaustion ends
const DASH_SPEED_MULT = 1.8;
const EXHAUST_SPEED_MULT = 0.35;

export type StaminaState = "normal" | "exhausted" | "recovery";

export class Player {
  readonly mesh: TransformNode;
  private readonly collider: Mesh;
  private readonly moveSpeed = 10;
  private readonly input: InputManager;
  private targetRotation = 0;

  // Joint references for animation
  private leftShoulder: TransformNode;
  private rightShoulder: TransformNode;
  private leftHip: TransformNode;
  private rightHip: TransformNode;
  private headNode: TransformNode;
  private walkPhase = 0;
  private isMoving = false;
  private hasDashMoved = false; // true once player actually moved while dash is on

  // Dash / stamina
  private _dashOn = false;
  stamina = MAX_STAMINA;
  exhaustTimer = 0;              // countdown during blue phase
  staminaState: StaminaState = "normal";

  get dashOn(): boolean { return this._dashOn; }
  set dashOn(v: boolean) {
    this._dashOn = v;
    this.hasDashMoved = false; // reset so auto-off doesn't fire immediately
  }

  // Jump / gravity
  private velocityY = 0;
  private readonly gravity = -20;
  private readonly jumpForce = 8;
  private isGrounded = true;

  constructor(scene: Scene, input: InputManager, color: Color3, x: number, z: number) {
    this.input = input;
    const char = AssetFactory.createCharacter(scene, color);
    this.mesh = char.root;
    this.leftShoulder = char.leftShoulder;
    this.rightShoulder = char.rightShoulder;
    this.leftHip = char.leftHip;
    this.rightHip = char.rightHip;
    this.headNode = char.headNode;
    this.mesh.position = new Vector3(x, 0, z);

    // Invisible collision proxy
    this.collider = CreateBox("playerCollider", { width: 0.1, height: 0.1, depth: 0.1 }, scene);
    this.collider.isVisible = false;
    this.collider.checkCollisions = true;
    this.collider.ellipsoid = new Vector3(0.4, 0.8, 0.4);
    this.collider.ellipsoidOffset = new Vector3(0, 0.8, 0);
    this.collider.position = new Vector3(x, 0, z);
  }

  update(dt: number, viewMode: ViewMode = "third", fpsYaw = 0, cameraAlpha = -Math.PI / 2): void {
    // Update stamina state machine
    this.updateStamina(dt);

    const drag = this.input.drag;
    this.isMoving = false;

    if (drag.active && drag.magnitude > 0.05) {
      // Speed multiplier from stamina state
      let speedMult = 1;
      if (this.staminaState === "exhausted") {
        speedMult = EXHAUST_SPEED_MULT;
      } else if (this.dashOn && this.staminaState !== "recovery" && this.stamina > 0) {
        speedMult = DASH_SPEED_MULT;
      } else if (this.dashOn && this.staminaState === "recovery") {
        speedMult = 1; // normal speed during recovery even if dash is on
      }

      const speed = drag.magnitude * this.moveSpeed * speedMult * dt;
      let vx = 0, vz = 0;

      if (viewMode === "first") {
        const inputX = drag.dirX;
        const inputZ = -drag.dirY;
        const cosY = Math.cos(fpsYaw);
        const sinY = Math.sin(fpsYaw);
        vx = (inputX * cosY + inputZ * sinY) * speed;
        vz = (-inputX * sinY + inputZ * cosY) * speed;
      } else {
        const angle = cameraAlpha + Math.PI / 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const inputX = drag.dirX;
        const inputZ = -drag.dirY;
        vx = (inputX * cosA - inputZ * sinA) * speed;
        vz = (inputX * sinA + inputZ * cosA) * speed;
      }

      // Move with collision detection (horizontal)
      this.collider.moveWithCollisions(new Vector3(vx, 0, vz));
      this.mesh.position.x = this.collider.position.x;
      this.mesh.position.z = this.collider.position.z;

      this.targetRotation = Math.atan2(vx, vz);
      this.isMoving = true;
    }

    // Track that we actually moved while dashing
    if (this._dashOn && this.isMoving) {
      this.hasDashMoved = true;
    }
    // Auto-off dash only after the player has moved and then stopped
    if (this._dashOn && !this.isMoving && this.hasDashMoved) {
      this._dashOn = false;
      this.hasDashMoved = false;
    }

    // Gravity & jump (vertical)
    this.velocityY += this.gravity * dt;
    const prevY = this.collider.position.y;
    this.collider.moveWithCollisions(new Vector3(0, this.velocityY * dt, 0));
    this.mesh.position.y = this.collider.position.y;

    // Ground detection: if vertical movement was blocked (or on ground)
    if (this.collider.position.y <= 0) {
      this.collider.position.y = 0;
      this.mesh.position.y = 0;
      this.velocityY = 0;
      this.isGrounded = true;
    } else if (Math.abs(this.collider.position.y - prevY) < Math.abs(this.velocityY * dt) * 0.5 && this.velocityY < 0) {
      // Hit something below (collision stopped the fall)
      this.velocityY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Smooth rotation
    const current = this.mesh.rotation.y;
    let diff = this.targetRotation - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, dt * 10);

    // Animate limbs
    this.animateLimbs(dt);
  }

  jump(): void {
    if (this.isGrounded) {
      this.velocityY = this.jumpForce;
      this.isGrounded = false;
    }
  }

  private animateLimbs(dt: number): void {
    if (this.isMoving && this.isGrounded) {
      // Advance walk cycle (faster when dashing, slower when exhausted)
      let animMult = 1;
      if (this.staminaState === "exhausted") animMult = 0.5;
      else if (this.dashOn && this.staminaState === "normal" && this.stamina > 0) animMult = 1.6;
      this.walkPhase += WALK_ANIM_SPEED * animMult * dt;
      const s = Math.sin(this.walkPhase);

      // Arms swing opposite to legs
      this.leftShoulder.rotation.x = s * ARM_SWING;
      this.rightShoulder.rotation.x = -s * ARM_SWING;

      // Legs
      this.leftHip.rotation.x = -s * LEG_SWING;
      this.rightHip.rotation.x = s * LEG_SWING;

      // Head bob (double frequency)
      this.headNode.position.y = 1.3 + Math.abs(Math.sin(this.walkPhase * 2)) * HEAD_BOB_AMOUNT;
    } else {
      // Return to rest pose smoothly
      const r = Math.min(1, dt * ANIM_RETURN_SPEED);
      this.leftShoulder.rotation.x *= (1 - r);
      this.rightShoulder.rotation.x *= (1 - r);
      this.leftHip.rotation.x *= (1 - r);
      this.rightHip.rotation.x *= (1 - r);
      this.headNode.position.y += (1.3 - this.headNode.position.y) * r;

      // Reset walk phase when stopped to start clean next time
      if (Math.abs(this.leftHip.rotation.x) < 0.01) {
        this.walkPhase = 0;
      }
    }

    // In-air: tuck legs slightly forward
    if (!this.isGrounded) {
      const tuck = 0.3;
      const r = Math.min(1, dt * 6);
      this.leftHip.rotation.x += (tuck - this.leftHip.rotation.x) * r;
      this.rightHip.rotation.x += (tuck - this.rightHip.rotation.x) * r;
      // Arms up slightly
      this.leftShoulder.rotation.x += (-0.4 - this.leftShoulder.rotation.x) * r;
      this.rightShoulder.rotation.x += (-0.4 - this.rightShoulder.rotation.x) * r;
    }
  }

  /* ---- Stamina state machine ---- */

  private updateStamina(dt: number): void {
    switch (this.staminaState) {
      case "normal":
        if (this.dashOn && this.isMoving && this.stamina > 0) {
          // Drain stamina while dash-moving
          this.stamina -= STAMINA_DRAIN_RATE * dt;
          if (this.stamina <= 0) {
            this.stamina = 0;
            // Enter exhausted state
            this.staminaState = "exhausted";
            this.exhaustTimer = EXHAUST_DURATION;
          }
        } else if (!this.dashOn && this.stamina < MAX_STAMINA) {
          // Recover when not dashing
          this.stamina = Math.min(MAX_STAMINA, this.stamina + STAMINA_RECOVER_RATE * dt);
        }
        break;

      case "exhausted":
        // Blue bar counts down
        this.exhaustTimer -= dt;
        if (this.exhaustTimer <= 0) {
          this.exhaustTimer = 0;
          // Enter recovery state: red bar refills from 0
          this.staminaState = "recovery";
          this.stamina = 0;
        }
        break;

      case "recovery":
        // Red bar fills up at moderate speed
        this.stamina += RED_REFILL_RATE * dt;
        if (this.stamina >= MAX_STAMINA) {
          this.stamina = MAX_STAMINA;
          this.staminaState = "normal";
        }
        break;
    }
  }

  /** Normalized 0-1 for UI gauge */
  get staminaRatio(): number { return this.stamina / MAX_STAMINA; }
  get exhaustRatio(): number { return this.exhaustTimer / EXHAUST_DURATION; }

  getPosition(): Vector3 {
    return this.mesh.position;
  }

  /** Get full state for network sync */
  getNetworkState(): {
    position: { x: number; y: number; z: number };
    rotationY: number;
    velocityY: number;
    stamina: number;
    staminaState: StaminaState;
    dashOn: boolean;
    isMoving: boolean;
  } {
    return {
      position: {
        x: this.mesh.position.x,
        y: this.mesh.position.y,
        z: this.mesh.position.z,
      },
      rotationY: this.mesh.rotation.y,
      velocityY: this.velocityY,
      stamina: this.stamina,
      staminaState: this.staminaState,
      dashOn: this.dashOn,
      isMoving: this.isMoving,
    };
  }
}
