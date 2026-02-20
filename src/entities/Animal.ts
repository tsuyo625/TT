import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { AssetFactory, AnimalMesh } from "../core/AssetFactory";

export type AnimalKind = "cat" | "elephant" | "lion";

const WANDER_RADIUS: Record<AnimalKind, number> = { cat: 25, elephant: 40, lion: 35 };
const MOVE_SPEED: Record<AnimalKind, number>    = { cat: 2.0, elephant: 1.5, lion: 2.5 };
const PAUSE_MIN = 1.5;
const PAUSE_MAX = 5.0;
const LEG_SWING = 0.4;
const MAP_HALF = 80; // stay within ±80

export class Animal {
  readonly root: TransformNode;
  private fl: TransformNode;
  private fr: TransformNode;
  private bl: TransformNode;
  private br: TransformNode;
  private speed: number;
  private wanderRadius: number;

  // AI state
  private homeX: number;
  private homeZ: number;
  private targetX = 0;
  private targetZ = 0;
  private state: "walk" | "pause" = "pause";
  private timer = 0;
  private walkPhase = 0;

  constructor(scene: Scene, kind: AnimalKind, x: number, z: number, shadowGen: ShadowGenerator) {
    let mesh: AnimalMesh;
    switch (kind) {
      case "cat":      mesh = AssetFactory.createCat(scene); break;
      case "elephant":  mesh = AssetFactory.createElephant(scene); break;
      case "lion":      mesh = AssetFactory.createLion(scene); break;
    }

    this.root = mesh.root;
    this.fl = mesh.fl;
    this.fr = mesh.fr;
    this.bl = mesh.bl;
    this.br = mesh.br;

    this.root.position.set(x, 0, z);
    this.homeX = x;
    this.homeZ = z;
    this.speed = MOVE_SPEED[kind];
    this.wanderRadius = WANDER_RADIUS[kind];

    // Add shadow
    this.root.getChildMeshes().forEach((m) => shadowGen.addShadowCaster(m));

    // Start with a random pause
    this.timer = Math.random() * PAUSE_MAX;
    this.pickTarget();
  }

  private pickTarget(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * this.wanderRadius;
    this.targetX = this.homeX + Math.cos(angle) * dist;
    this.targetZ = this.homeZ + Math.sin(angle) * dist;
    // Clamp to map bounds
    this.targetX = Math.max(-MAP_HALF, Math.min(MAP_HALF, this.targetX));
    this.targetZ = Math.max(-MAP_HALF, Math.min(MAP_HALF, this.targetZ));
  }

  update(dt: number): void {
    if (this.state === "pause") {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.pickTarget();
        this.state = "walk";
      }
      // Ease legs back to rest
      this.easeLegsToRest(dt);
      return;
    }

    // Walk toward target
    const px = this.root.position.x;
    const pz = this.root.position.z;
    const dx = this.targetX - px;
    const dz = this.targetZ - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5) {
      // Arrived – pause
      this.state = "pause";
      this.timer = PAUSE_MIN + Math.random() * (PAUSE_MAX - PAUSE_MIN);
      return;
    }

    const nx = dx / dist;
    const nz = dz / dist;
    const step = this.speed * dt;

    this.root.position.x += nx * step;
    this.root.position.z += nz * step;

    // Face direction
    this.root.rotation.y = Math.atan2(nx, nz);

    // Walk animation
    this.walkPhase += this.speed * 5 * dt;
    const s = Math.sin(this.walkPhase);
    this.fl.rotation.x = s * LEG_SWING;
    this.fr.rotation.x = -s * LEG_SWING;
    this.bl.rotation.x = -s * LEG_SWING;
    this.br.rotation.x = s * LEG_SWING;
  }

  private easeLegsToRest(dt: number): void {
    const r = Math.min(1, dt * 6);
    this.fl.rotation.x *= (1 - r);
    this.fr.rotation.x *= (1 - r);
    this.bl.rotation.x *= (1 - r);
    this.br.rotation.x *= (1 - r);
    if (Math.abs(this.fl.rotation.x) < 0.01) this.walkPhase = 0;
  }
}
