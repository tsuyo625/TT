import Phaser from "phaser";
import { CAMERA_LERP, SCREEN_SHAKE_DURATION_MS, SCREEN_SHAKE_INTENSITY } from "../config/Constants";

export class CameraManager {
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.camera = scene.cameras.main;
  }

  followPlayer(target: Phaser.GameObjects.Sprite): void {
    this.camera.startFollow(target, true, CAMERA_LERP, CAMERA_LERP);
    this.camera.setDeadzone(40, 20);
  }

  shake(): void {
    this.camera.shake(SCREEN_SHAKE_DURATION_MS, SCREEN_SHAKE_INTENSITY / 1000);
  }

  setBounds(x: number, y: number, w: number, h: number): void {
    this.camera.setBounds(x, y, w, h);
  }
}
