import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { AssetFactory } from "../core/AssetFactory";
import { InputManager } from "../core/InputManager";
import type { ViewMode } from "../core/Engine";

export class Player {
  readonly mesh: TransformNode;
  private readonly collider: Mesh;
  private readonly moveSpeed = 10;
  private readonly input: InputManager;
  private targetRotation = 0;

  // Jump / gravity
  private velocityY = 0;
  private readonly gravity = -20;
  private readonly jumpForce = 8;
  private isGrounded = true;

  constructor(scene: Scene, input: InputManager, color: Color3, x: number, z: number) {
    this.input = input;
    this.mesh = AssetFactory.createCharacter(scene, color);
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
    const drag = this.input.drag;
    if (drag.active && drag.magnitude > 0.05) {
      const speed = drag.magnitude * this.moveSpeed * dt;
      let vx = 0, vz = 0;

      if (viewMode === "first") {
        // First-person: rotate input by camera yaw
        const inputX = drag.dirX;
        const inputZ = -drag.dirY;
        const cosY = Math.cos(fpsYaw);
        const sinY = Math.sin(fpsYaw);
        vx = (inputX * cosY + inputZ * sinY) * speed;
        vz = (-inputX * sinY + inputZ * cosY) * speed;
      } else {
        // Third-person: rotate input to match camera direction
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
  }

  jump(): void {
    if (this.isGrounded) {
      this.velocityY = this.jumpForce;
      this.isGrounded = false;
    }
  }

  getPosition(): Vector3 {
    return this.mesh.position;
  }
}
