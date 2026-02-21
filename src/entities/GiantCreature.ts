import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { AssetFactory, TitanMesh } from "../core/AssetFactory";

const DEFAULTS = {
  wanderRadius: 300,
  moveSpeed: 3,
  pauseMin: 5,
  pauseMax: 15,
  legSwing: 0.15,
  neckBob: 0.08,
  tailSwing: 0.1,
  mapHalf: 500,
};

export interface GiantCreatureOpts {
  meshFactory?: (scene: Scene) => TitanMesh;
  wanderRadius?: number;
  moveSpeed?: number;
  legSwing?: number;
  neckBob?: number;
  tailSwing?: number;
}

export class GiantCreature {
  readonly root: TransformNode;
  private fl: TransformNode;
  private fr: TransformNode;
  private bl: TransformNode;
  private br: TransformNode;
  private neck: TransformNode;
  private tail: TransformNode;

  // per-instance motion params
  private wanderRadius: number;
  private moveSpeed: number;
  private legSwing: number;
  private neckBob: number;
  private tailSwing: number;

  // Server-driven state
  private serverX: number | null = null;
  private serverZ: number | null = null;
  private serverRotY: number | null = null;

  // AI state (used as fallback when not connected)
  private homeX: number;
  private homeZ: number;
  private targetX = 0;
  private targetZ = 0;
  private state: "walk" | "pause" = "pause";
  private timer = 0;
  private walkPhase = 0;

  constructor(scene: Scene, x: number, z: number, shadowGen: ShadowGenerator, opts?: GiantCreatureOpts) {
    this.wanderRadius = opts?.wanderRadius ?? DEFAULTS.wanderRadius;
    this.moveSpeed = opts?.moveSpeed ?? DEFAULTS.moveSpeed;
    this.legSwing = opts?.legSwing ?? DEFAULTS.legSwing;
    this.neckBob = opts?.neckBob ?? DEFAULTS.neckBob;
    this.tailSwing = opts?.tailSwing ?? DEFAULTS.tailSwing;

    const factory = opts?.meshFactory ?? AssetFactory.createTitan;
    const mesh: TitanMesh = factory(scene);

    this.root = mesh.root;
    this.fl = mesh.fl;
    this.fr = mesh.fr;
    this.bl = mesh.bl;
    this.br = mesh.br;
    this.neck = mesh.neck;
    this.tail = mesh.tail;

    this.root.position.set(x, 0, z);
    this.homeX = x;
    this.homeZ = z;

    // Add shadow for the massive creature
    this.root.getChildMeshes().forEach((m) => shadowGen.addShadowCaster(m));

    // Start with a random pause
    this.timer = Math.random() * DEFAULTS.pauseMax;
    this.pickTarget();
  }

  private pickTarget(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * this.wanderRadius;
    this.targetX = this.homeX + Math.cos(angle) * dist;
    this.targetZ = this.homeZ + Math.sin(angle) * dist;
    // Clamp to extended map bounds
    this.targetX = Math.max(-DEFAULTS.mapHalf, Math.min(DEFAULTS.mapHalf, this.targetX));
    this.targetZ = Math.max(-DEFAULTS.mapHalf, Math.min(DEFAULTS.mapHalf, this.targetZ));
  }

  /** Apply server-authoritative position */
  updateFromServer(x: number, z: number, rotY: number): void {
    this.serverX = x;
    this.serverZ = z;
    this.serverRotY = rotY;
  }

  update(dt: number): void {
    if (this.serverX !== null && this.serverZ !== null && this.serverRotY !== null) {
      this.updateServerDriven(dt);
      return;
    }

    // Fallback: local AI when not connected
    if (this.state === "pause") {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.pickTarget();
        this.state = "walk";
      }
      this.easeToRest(dt);
      this.idleAnimation(dt);
      return;
    }

    const px = this.root.position.x;
    const pz = this.root.position.z;
    const dx = this.targetX - px;
    const dz = this.targetZ - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 5) {
      this.state = "pause";
      this.timer = DEFAULTS.pauseMin + Math.random() * (DEFAULTS.pauseMax - DEFAULTS.pauseMin);
      return;
    }

    const nx = dx / dist;
    const nz = dz / dist;
    const step = this.moveSpeed * dt;

    this.root.position.x += nx * step;
    this.root.position.z += nz * step;

    const targetRot = Math.atan2(nx, nz);
    let rotDiff = targetRot - this.root.rotation.y;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    this.root.rotation.y += rotDiff * dt * 0.5;

    this.walkPhase += this.moveSpeed * 0.8 * dt;
    const sn = Math.sin(this.walkPhase);

    this.fl.rotation.x = sn * this.legSwing;
    this.br.rotation.x = sn * this.legSwing;
    this.fr.rotation.x = -sn * this.legSwing;
    this.bl.rotation.x = -sn * this.legSwing;

    this.neck.rotation.x = Math.sin(this.walkPhase * 2) * this.neckBob;

    this.tail.rotation.y = Math.sin(this.walkPhase * 0.7) * this.tailSwing;
    this.tail.rotation.x = Math.sin(this.walkPhase * 0.5) * this.tailSwing * 0.5;
  }

  private updateServerDriven(dt: number): void {
    const tx = this.serverX!;
    const tz = this.serverZ!;

    const dx = tx - this.root.position.x;
    const dz = tz - this.root.position.z;
    const speed = Math.sqrt(dx * dx + dz * dz);

    // Smooth interpolation toward server position
    this.root.position.x += dx * Math.min(1, dt * 4);
    this.root.position.z += dz * Math.min(1, dt * 4);

    // Smooth rotation interpolation
    let rotDiff = this.serverRotY! - this.root.rotation.y;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    this.root.rotation.y += rotDiff * Math.min(1, dt * 4);

    if (speed > 0.05) {
      // Walking: animate legs, neck, tail
      this.walkPhase += this.moveSpeed * 0.8 * dt;
      const sn = Math.sin(this.walkPhase);

      this.fl.rotation.x = sn * this.legSwing;
      this.br.rotation.x = sn * this.legSwing;
      this.fr.rotation.x = -sn * this.legSwing;
      this.bl.rotation.x = -sn * this.legSwing;

      this.neck.rotation.x = Math.sin(this.walkPhase * 2) * this.neckBob;
      this.tail.rotation.y = Math.sin(this.walkPhase * 0.7) * this.tailSwing;
      this.tail.rotation.x = Math.sin(this.walkPhase * 0.5) * this.tailSwing * 0.5;
    } else {
      // Idle: ease legs to rest + breathing
      this.easeToRest(dt);
      this.idleAnimation(dt);
    }
  }

  private easeToRest(dt: number): void {
    const r = Math.min(1, dt * 2);
    this.fl.rotation.x *= (1 - r);
    this.fr.rotation.x *= (1 - r);
    this.bl.rotation.x *= (1 - r);
    this.br.rotation.x *= (1 - r);
    if (Math.abs(this.fl.rotation.x) < 0.01) this.walkPhase = 0;
  }

  private idleAnimation(dt: number): void {
    // Subtle breathing motion
    const breathe = Math.sin(Date.now() * 0.001) * 0.02;
    this.neck.rotation.x = breathe;
    this.tail.rotation.y = Math.sin(Date.now() * 0.0007) * 0.05;
  }
}
