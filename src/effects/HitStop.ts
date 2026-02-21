import Phaser from "phaser";
import { HIT_STOP_DURATION_MS } from "../config/Constants";

export function hitStop(scene: Phaser.Scene, durationMs: number = HIT_STOP_DURATION_MS): void {
  scene.physics.pause();
  scene.time.delayedCall(durationMs, () => {
    scene.physics.resume();
  });
}
