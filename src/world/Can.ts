import * as THREE from "three";
import * as CANNON from "cannon-es";
import { AssetFactory } from "../core/AssetFactory";

export class Can {
  readonly mesh: THREE.Group;
  readonly body: CANNON.Body;
  private originalPosition: THREE.Vector3;
  private parentScene: THREE.Scene | null = null;
  private particles: THREE.Points[] = [];

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

  /** Set parent scene for particle effects */
  setScene(scene: THREE.Scene): void {
    this.parentScene = scene;
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

    this.spawnKickParticles(nx, nz);
  }

  private spawnKickParticles(dirX: number, dirZ: number): void {
    if (!this.parentScene) return;

    const count = 24;
    const positions = new Float32Array(count * 3);
    const velocities: number[] = [];
    const canPos = this.mesh.position;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = canPos.x;
      positions[i * 3 + 1] = canPos.y + 0.3;
      positions[i * 3 + 2] = canPos.z;
      // Spread outward from kick direction
      velocities.push(
        dirX * (2 + Math.random() * 4) + (Math.random() - 0.5) * 3,
        1 + Math.random() * 3,
        dirZ * (2 + Math.random() * 4) + (Math.random() - 0.5) * 3
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xf39c12,
      size: 0.15,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    this.parentScene.add(points);
    this.particles.push(points);

    // Animate particles
    let elapsed = 0;
    const animate = () => {
      elapsed += 1 / 60;
      if (elapsed > 1.0) {
        this.parentScene?.remove(points);
        geometry.dispose();
        material.dispose();
        const idx = this.particles.indexOf(points);
        if (idx !== -1) this.particles.splice(idx, 1);
        return;
      }

      const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        posAttr.setX(i, posAttr.getX(i) + velocities[i * 3] * (1 / 60));
        posAttr.setY(i, posAttr.getY(i) + velocities[i * 3 + 1] * (1 / 60));
        posAttr.setZ(i, posAttr.getZ(i) + velocities[i * 3 + 2] * (1 / 60));
        velocities[i * 3 + 1] -= 9.8 * (1 / 60); // gravity
      }
      posAttr.needsUpdate = true;
      material.opacity = 1 - elapsed;

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
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
