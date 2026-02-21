import Phaser from "phaser";
import { Enemy } from "./Enemy";
import { SHOOTER_ENEMY_FIRE_INTERVAL_MS, PROJECTILE_SPEED } from "../config/Constants";

export class ShooterEnemy extends Enemy {
  private fireTimer: number;
  private playerSprite: Phaser.Physics.Arcade.Sprite;
  private projectileGroup: Phaser.GameObjects.Group;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    projectileGroup: Phaser.GameObjects.Group,
  ) {
    super(scene, x, y, "shooter-enemy", 1);
    this.playerSprite = playerSprite;
    this.projectileGroup = projectileGroup;
    this.fireTimer = SHOOTER_ENEMY_FIRE_INTERVAL_MS;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 22);
    body.setOffset(1, 2);
    body.setImmovable(true);
    body.setAllowGravity(false);
  }

  update(dt: number): void {
    if (!this.alive) return;

    const dtMs = dt * 1000;
    this.fireTimer -= dtMs;

    // Only fire if player is within range
    const dist = Math.abs(this.playerSprite.x - this.sprite.x);
    if (dist > 400) return;

    if (this.fireTimer <= 0) {
      this.fire();
      this.fireTimer = SHOOTER_ENEMY_FIRE_INTERVAL_MS;
    }
  }

  private fire(): void {
    const dirX = this.playerSprite.x < this.sprite.x ? -1 : 1;
    const projectile = this.scene.physics.add.sprite(
      this.sprite.x + dirX * 16,
      this.sprite.y - 12,
      "projectile",
    );
    projectile.setOrigin(0.5);
    (projectile.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (projectile.body as Phaser.Physics.Arcade.Body).setVelocityX(dirX * PROJECTILE_SPEED);

    this.projectileGroup.add(projectile);

    // Destroy after 5 seconds
    this.scene.time.delayedCall(5000, () => {
      if (projectile.active) projectile.destroy();
    });

    this.sprite.setFlipX(dirX < 0);
  }
}
