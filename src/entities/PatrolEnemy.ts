import Phaser from "phaser";
import { Enemy } from "./Enemy";
import { PATROL_ENEMY_SPEED, PATROL_ENEMY_HP, TILE_SIZE } from "../config/Constants";

export class PatrolEnemy extends Enemy {
  private direction = 1;
  private originX: number;
  private patrolRange: number;

  constructor(scene: Phaser.Scene, x: number, y: number, patrolRange: number = 5) {
    super(scene, x, y, "patrol-enemy", PATROL_ENEMY_HP);
    this.originX = x;
    this.patrolRange = patrolRange * TILE_SIZE;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 22);
    body.setOffset(1, 2);
  }

  update(_dt: number): void {
    if (!this.alive) return;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    // Reverse at patrol bounds or when hitting a wall
    if (this.sprite.x > this.originX + this.patrolRange) {
      this.direction = -1;
    } else if (this.sprite.x < this.originX - this.patrolRange) {
      this.direction = 1;
    }

    if (body.blocked.left) this.direction = 1;
    if (body.blocked.right) this.direction = -1;

    body.setVelocityX(this.direction * PATROL_ENEMY_SPEED);
    this.sprite.setFlipX(this.direction < 0);
  }
}
