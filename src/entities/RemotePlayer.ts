import * as THREE from "three";
import { AssetFactory } from "../core/AssetFactory";
import type { PlayerRole } from "./Player";

export class RemotePlayer {
  readonly mesh: THREE.Group;
  readonly id: string;
  role: PlayerRole = "hider";
  captured = false;

  private targetX = 0;
  private targetZ = 0;
  private targetRotation = 0;

  constructor(id: string, color: number, x: number, z: number) {
    this.id = id;
    this.mesh = AssetFactory.createCharacter(color);
    this.mesh.position.set(x, 0, z);
    this.targetX = x;
    this.targetZ = z;
  }

  /** Update target from network state */
  setTarget(x: number, z: number, rotation: number): void {
    this.targetX = x;
    this.targetZ = z;
    this.targetRotation = rotation;
  }

  /** Interpolate towards target position */
  update(dt: number): void {
    const lerpFactor = Math.min(1, dt * 10);

    this.mesh.position.x += (this.targetX - this.mesh.position.x) * lerpFactor;
    this.mesh.position.z += (this.targetZ - this.mesh.position.z) * lerpFactor;

    // Smooth rotation
    let diff = this.targetRotation - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * lerpFactor;

    // Visual feedback when captured
    this.mesh.visible = true;
    if (this.captured) {
      this.mesh.position.y = 0;
      // Dim captured players
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.opacity = 0.5;
          child.material.transparent = true;
        }
      });
    }
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }
}
