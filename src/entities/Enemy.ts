import Phaser from "phaser";
import { deathBurst } from "../effects/ParticleEffects";

export abstract class Enemy {
  sprite: Phaser.Physics.Arcade.Sprite;
  hp: number;
  protected scene: Phaser.Scene;
  protected alive = true;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, hp: number) {
    this.scene = scene;
    this.hp = hp;
    this.sprite = scene.physics.add.sprite(x, y, texture);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setData("enemy", this);
  }

  abstract update(dt: number): void;

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp -= amount;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.alive && this.sprite.active) {
        this.sprite.clearTint();
      }
    });
    if (this.hp <= 0) {
      this.die();
    }
  }

  die(): void {
    this.alive = false;
    deathBurst(this.scene, this.sprite.x, this.sprite.y - 12, 0xff4444);
    this.sprite.destroy();
  }

  isAlive(): boolean {
    return this.alive;
  }
}
