import Phaser from "phaser";
import { HIT_STOP_DURATION_MS } from "../config/Constants";

// Reference-counted physics pause to prevent race conditions
// between hitStop and evolution sequences
let pauseCount = 0;

export function physicsPause(scene: Phaser.Scene): void {
  pauseCount++;
  if (pauseCount === 1) {
    scene.physics.pause();
  }
}

export function physicsResume(scene: Phaser.Scene): void {
  pauseCount = Math.max(0, pauseCount - 1);
  if (pauseCount === 0) {
    scene.physics.resume();
  }
}

export function resetPauseCount(): void {
  pauseCount = 0;
}

export function hitStop(scene: Phaser.Scene, durationMs: number = HIT_STOP_DURATION_MS): void {
  physicsPause(scene);
  scene.time.delayedCall(durationMs, () => {
    physicsResume(scene);
  });
}
