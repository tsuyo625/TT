import * as THREE from "three";
import * as CANNON from "cannon-es";
import { AssetFactory } from "../core/AssetFactory";
import type { PlayerRole } from "./Player";

/** Simple AI-controlled player for offline practice mode */
export class AIPlayer {
  readonly mesh: THREE.Group;
  readonly body: CANNON.Body;
  role: PlayerRole;
  captured = false;

  private moveSpeed = 40;
  private targetX = 0;
  private targetZ = 0;
  private wanderTimer = 0;
  private readonly fieldSize = 13;

  constructor(color: number, x: number, z: number, role: PlayerRole) {
    this.role = role;
    this.mesh = AssetFactory.createCharacter(color);
    this.mesh.position.set(x, 0, z);
    this.targetX = x;
    this.targetZ = z;

    this.body = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.75, 0.15)),
      position: new CANNON.Vec3(x, 0.75, z),
      fixedRotation: true,
      linearDamping: 0.9,
    });

    if (role === "seeker") {
      this.moveSpeed = 17.5;
    }
  }

  /** Update AI behavior */
  update(dt: number, playerX: number, playerZ: number): void {
    if (this.captured) {
      this.body.velocity.set(0, this.body.velocity.y, 0);
      this.sync();
      return;
    }

    if (this.role === "seeker") {
      this.updateSeeker(dt, playerX, playerZ);
    } else {
      this.updateHider(dt, playerX, playerZ);
    }

    this.sync();
  }

  private updateSeeker(_dt: number, playerX: number, playerZ: number): void {
    // Chase the player
    this.targetX = playerX;
    this.targetZ = playerZ;

    const dx = this.targetX - this.body.position.x;
    const dz = this.targetZ - this.body.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.5) {
      this.body.velocity.x = (dx / dist) * this.moveSpeed;
      this.body.velocity.z = (dz / dist) * this.moveSpeed;

      // Face movement direction
      this.mesh.rotation.y = Math.atan2(dx, dz);
    } else {
      this.body.velocity.x = 0;
      this.body.velocity.z = 0;
    }
  }

  private updateHider(dt: number, playerX: number, playerZ: number): void {
    this.wanderTimer -= dt;

    // If seeker is close, run away
    const dx = this.body.position.x - playerX;
    const dz = this.body.position.z - playerZ;
    const distToPlayer = Math.sqrt(dx * dx + dz * dz);

    if (distToPlayer < 6) {
      // Flee from player
      const nx = dx / (distToPlayer || 1);
      const nz = dz / (distToPlayer || 1);
      this.targetX = this.body.position.x + nx * 5;
      this.targetZ = this.body.position.z + nz * 5;
      // Clamp to field
      this.targetX = Math.max(-this.fieldSize, Math.min(this.fieldSize, this.targetX));
      this.targetZ = Math.max(-this.fieldSize, Math.min(this.fieldSize, this.targetZ));
      this.wanderTimer = 1;
    } else if (this.wanderTimer <= 0) {
      // Random wander
      this.targetX = (Math.random() - 0.5) * this.fieldSize * 2;
      this.targetZ = (Math.random() - 0.5) * this.fieldSize * 2;
      this.wanderTimer = 2 + Math.random() * 3;
    }

    const tdx = this.targetX - this.body.position.x;
    const tdz = this.targetZ - this.body.position.z;
    const tdist = Math.sqrt(tdx * tdx + tdz * tdz);

    if (tdist > 0.3) {
      this.body.velocity.x = (tdx / tdist) * this.moveSpeed;
      this.body.velocity.z = (tdz / tdist) * this.moveSpeed;
      this.mesh.rotation.y = Math.atan2(tdx, tdz);
    } else {
      this.body.velocity.x = 0;
      this.body.velocity.z = 0;
    }
  }

  private sync(): void {
    this.mesh.position.x = this.body.position.x;
    this.mesh.position.z = this.body.position.z;
    this.mesh.position.y = 0;

    if (this.captured) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.opacity = 0.5;
          child.material.transparent = true;
        }
      });
    }
  }

  distanceTo(x: number, z: number): number {
    const dx = this.body.position.x - x;
    const dz = this.body.position.z - z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  getPosition(): { x: number; z: number } {
    return { x: this.body.position.x, z: this.body.position.z };
  }
}
