import * as THREE from "three";
import * as CANNON from "cannon-es";
import { AssetFactory } from "../core/AssetFactory";

export class Can {
  readonly mesh: THREE.Group;
  readonly body: CANNON.Body;
  private originalPosition: THREE.Vector3;

  constructor(x: number, z: number) {
    this.mesh = AssetFactory.createCan();
    this.mesh.position.set(x, 0, z);
    this.originalPosition = new THREE.Vector3(x, 0, z);

    // Physics body
    this.body = new CANNON.Body({
      mass: 0.3,
      shape: new CANNON.Cylinder(0.15, 0.15, 0.4, 16),
      position: new CANNON.Vec3(x, 0.2, z),
      linearDamping: 0.5,
      angularDamping: 0.5,
    });
  }

  /** Apply a kick force from the given direction */
  kick(fromX: number, fromZ: number, force = 8): void {
    const dx = this.body.position.x - fromX;
    const dz = this.body.position.z - fromZ;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const nx = dx / dist;
    const nz = dz / dist;

    this.body.velocity.set(nx * force, 3, nz * force);
    this.body.angularVelocity.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 10
    );
  }

  /** Reset can to original position */
  reset(): void {
    this.body.position.set(
      this.originalPosition.x,
      0.2,
      this.originalPosition.z
    );
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.set(0, 0, 0, 1);
  }

  /** Sync Three.js mesh with physics body */
  sync(): void {
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y - 0.2,
      this.body.position.z
    );
    this.mesh.quaternion.set(
      this.body.quaternion.x,
      this.body.quaternion.y,
      this.body.quaternion.z,
      this.body.quaternion.w
    );
  }
}
