import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { AssetFactory } from "../core/AssetFactory";
import { InputManager } from "../core/InputManager";
import type { ViewMode } from "../core/Engine";

export class Player {
  readonly mesh: TransformNode;
  private readonly moveSpeed = 10;
  private readonly input: InputManager;
  private targetRotation = 0;

  constructor(scene: Scene, input: InputManager, color: Color3, x: number, z: number) {
    this.input = input;
    this.mesh = AssetFactory.createCharacter(scene, color);
    this.mesh.position = new Vector3(x, 0, z);
  }

  update(dt: number, viewMode: ViewMode = "third", fpsYaw = 0): void {
    const drag = this.input.drag;
    if (drag.active && drag.magnitude > 0.05) {
      const speed = drag.magnitude * this.moveSpeed * dt;

      if (viewMode === "first") {
        // In first-person, move relative to camera yaw
        const inputX = drag.dirX;
        const inputZ = -drag.dirY;
        // Rotate input by fpsYaw
        const cosY = Math.cos(fpsYaw);
        const sinY = Math.sin(fpsYaw);
        const worldX = inputX * cosY + inputZ * sinY;
        const worldZ = -inputX * sinY + inputZ * cosY;

        this.mesh.position.x += worldX * speed;
        this.mesh.position.z += worldZ * speed;

        // Face movement direction
        this.targetRotation = Math.atan2(worldX, worldZ);
      } else {
        // Third-person: screen-relative movement
        const vx = drag.dirX * speed;
        const vz = -drag.dirY * speed;

        this.mesh.position.x += vx;
        this.mesh.position.z += vz;

        this.targetRotation = Math.atan2(vx, vz);
      }
    }

    // Smooth rotation (only matters for 3rd person visuals)
    const current = this.mesh.rotation.y;
    let diff = this.targetRotation - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, dt * 10);
  }

  getPosition(): Vector3 {
    return this.mesh.position;
  }
}
