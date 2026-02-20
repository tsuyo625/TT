import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { AssetFactory } from "../core/AssetFactory";
import { RemotePlayerState } from "../network/types";

// Interpolation settings
const LERP_FACTOR = 0.15;
const ROTATION_LERP = 0.2;
const WALK_THRESHOLD = 0.05;
const STALE_TIMEOUT_MS = 5000;

// Animation constants (matching Player.ts)
const WALK_ANIM_SPEED = 10;
const ARM_SWING = 0.6;
const LEG_SWING = 0.5;
const ANIM_RETURN_SPEED = 8;

export class RemotePlayer {
  readonly mesh: TransformNode;
  readonly playerId: string;
  private playerName: string = "";

  // Joint references for animation
  private leftShoulder: TransformNode;
  private rightShoulder: TransformNode;
  private leftHip: TransformNode;
  private rightHip: TransformNode;

  // Interpolation state
  private targetPosition: Vector3;
  private targetRotationY: number;
  private velocity: Vector3;
  private lastUpdate: number;

  // Animation state
  private walkPhase = 0;
  private isMoving = false;

  constructor(scene: Scene, playerId: string, initialState: RemotePlayerState) {
    this.playerId = playerId;

    // Generate a consistent color based on player ID
    const color = this.getColorForPlayer(playerId);
    const char = AssetFactory.createCharacter(scene, color);

    this.mesh = char.root;
    this.leftShoulder = char.leftShoulder;
    this.rightShoulder = char.rightShoulder;
    this.leftHip = char.leftHip;
    this.rightHip = char.rightHip;

    // Initialize state
    this.targetPosition = new Vector3(
      initialState.position.x,
      initialState.position.y,
      initialState.position.z
    );
    this.targetRotationY = initialState.rotation.y;
    this.velocity = new Vector3(
      initialState.velocity.x,
      initialState.velocity.y,
      initialState.velocity.z
    );
    this.lastUpdate = Date.now();

    // Set initial position
    this.mesh.position.copyFrom(this.targetPosition);
    this.mesh.rotation.y = this.targetRotationY;
  }

  /** Generate consistent color based on player ID hash */
  private getColorForPlayer(playerId: string): Color3 {
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
      hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0;
    }

    // Use golden ratio for better color distribution
    const hue = (hash * 0.618033988749895) % 1;

    // Convert HSL to RGB (S=0.6, L=0.5)
    const s = 0.6;
    const l = 0.5;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
    const m = l - c / 2;

    let r = 0,
      g = 0,
      b = 0;
    const h6 = hue * 6;
    if (h6 < 1) {
      r = c;
      g = x;
    } else if (h6 < 2) {
      r = x;
      g = c;
    } else if (h6 < 3) {
      g = c;
      b = x;
    } else if (h6 < 4) {
      g = x;
      b = c;
    } else if (h6 < 5) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

    return new Color3(r + m, g + m, b + m);
  }

  /** Called when new state arrives from server */
  updateFromServer(state: RemotePlayerState): void {
    this.targetPosition.set(
      state.position.x,
      state.position.y,
      state.position.z
    );
    this.targetRotationY = state.rotation.y;
    this.velocity.set(state.velocity.x, state.velocity.y, state.velocity.z);
    this.lastUpdate = Date.now();
  }

  /** Called every frame to interpolate and animate */
  update(dt: number): void {
    // Interpolate position
    this.mesh.position.x +=
      (this.targetPosition.x - this.mesh.position.x) * LERP_FACTOR;
    this.mesh.position.y +=
      (this.targetPosition.y - this.mesh.position.y) * LERP_FACTOR;
    this.mesh.position.z +=
      (this.targetPosition.z - this.mesh.position.z) * LERP_FACTOR;

    // Interpolate rotation (handle wrap-around)
    let rotDiff = this.targetRotationY - this.mesh.rotation.y;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    this.mesh.rotation.y += rotDiff * ROTATION_LERP;

    // Determine if moving based on velocity magnitude
    const speed = Math.sqrt(
      this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z
    );
    this.isMoving = speed > WALK_THRESHOLD;

    // Animate limbs
    this.animateLimbs(dt);
  }

  private animateLimbs(dt: number): void {
    if (this.isMoving) {
      // Advance walk cycle
      this.walkPhase += WALK_ANIM_SPEED * dt;
      const s = Math.sin(this.walkPhase);

      // Arms swing opposite to legs
      this.leftShoulder.rotation.x = s * ARM_SWING;
      this.rightShoulder.rotation.x = -s * ARM_SWING;

      // Legs
      this.leftHip.rotation.x = -s * LEG_SWING;
      this.rightHip.rotation.x = s * LEG_SWING;
    } else {
      // Return to rest pose smoothly
      const r = Math.min(1, dt * ANIM_RETURN_SPEED);
      this.leftShoulder.rotation.x *= 1 - r;
      this.rightShoulder.rotation.x *= 1 - r;
      this.leftHip.rotation.x *= 1 - r;
      this.rightHip.rotation.x *= 1 - r;

      // Reset walk phase when stopped
      if (Math.abs(this.leftHip.rotation.x) < 0.01) {
        this.walkPhase = 0;
      }
    }
  }

  /** Check if player data is stale */
  isStale(): boolean {
    return Date.now() - this.lastUpdate > STALE_TIMEOUT_MS;
  }

  /** Set player display name */
  setName(name: string): void {
    this.playerName = name;
    // TODO: Add 3D name label above character
  }

  /** Get player display name */
  getName(): string {
    return this.playerName || this.playerId.slice(0, 8);
  }

  /** Cleanup */
  dispose(): void {
    this.mesh.dispose();
  }
}
