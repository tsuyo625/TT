import * as THREE from "three";
import * as CANNON from "cannon-es";
import { AssetFactory } from "../core/AssetFactory";
import { InputManager } from "../core/InputManager";

export type PlayerRole = "seeker" | "hider";

export class Player {
  readonly mesh: THREE.Group;
  readonly body: CANNON.Body;
  role: PlayerRole = "hider";
  captured = false;

  private readonly moveSpeed = 12;
  private readonly input: InputManager;
  private targetRotation = 0;

  constructor(input: InputManager, color: number, x: number, z: number) {
    this.input = input;
    this.mesh = AssetFactory.createCharacter(color);
    this.mesh.position.set(x, 0, z);

    this.body = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.75, 0.15)),
      position: new CANNON.Vec3(x, 0.75, z),
      fixedRotation: true,
      linearDamping: 0.9,
    });
  }

  update(dt: number): void {
    if (this.captured) {
      this.body.velocity.set(0, this.body.velocity.y, 0);
      this.sync();
      return;
    }

    const drag = this.input.drag;
    if (drag.active && drag.magnitude > 0.05) {
      // Convert screen drag to world movement
      // Screen X → World X, Screen Y → World -Z (forward)
      const vx = drag.direction.x * drag.magnitude * this.moveSpeed;
      const vz = drag.direction.y * drag.magnitude * this.moveSpeed;

      this.body.velocity.x = vx;
      this.body.velocity.z = vz;

      // Face movement direction
      this.targetRotation = Math.atan2(vx, vz);
    } else {
      this.body.velocity.x = 0;
      this.body.velocity.z = 0;
    }

    // Smooth rotation
    const current = this.mesh.rotation.y;
    let diff = this.targetRotation - current;
    // Wrap around
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, dt * 10);

    this.sync();
  }

  /** Sync mesh position with physics body */
  private sync(): void {
    this.mesh.position.x = this.body.position.x;
    this.mesh.position.z = this.body.position.z;
    // Keep Y at ground level (physics handles collision)
    this.mesh.position.y = 0;
  }

  getPosition(): { x: number; z: number } {
    return { x: this.body.position.x, z: this.body.position.z };
  }

  distanceTo(x: number, z: number): number {
    const dx = this.body.position.x - x;
    const dz = this.body.position.z - z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  setPosition(x: number, z: number): void {
    this.body.position.set(x, 0.75, z);
    this.body.velocity.set(0, 0, 0);
    this.mesh.position.set(x, 0, z);
  }
}
