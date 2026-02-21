import Phaser from "phaser";
import { TILE_SIZE } from "../config/Constants";
import { PatrolEnemy } from "../entities/PatrolEnemy";
import { ShooterEnemy } from "../entities/ShooterEnemy";
import { Enemy } from "../entities/Enemy";
import {
  PROTOTYPE_LEVEL,
  PROTOTYPE_ENEMIES,
  LEVEL_WIDTH_TILES,
  LEVEL_HEIGHT_TILES,
  type EnemyPlacement,
} from "./LevelData";

export interface LevelObjects {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  spikes: Phaser.Physics.Arcade.StaticGroup;
  goal: Phaser.Physics.Arcade.Sprite;
  enemies: Enemy[];
  deathY: number;
  levelWidth: number;
  levelHeight: number;
}

export class LevelBuilder {
  build(
    scene: Phaser.Scene,
    playerSprite: Phaser.Physics.Arcade.Sprite,
    projectileGroup: Phaser.GameObjects.Group,
  ): LevelObjects {
    const platforms = scene.physics.add.staticGroup();
    const spikes = scene.physics.add.staticGroup();
    let goal!: Phaser.Physics.Arcade.Sprite;
    const enemies: Enemy[] = [];

    // Build tilemap
    for (let row = 0; row < LEVEL_HEIGHT_TILES; row++) {
      for (let col = 0; col < LEVEL_WIDTH_TILES; col++) {
        const tile = PROTOTYPE_LEVEL[row][col];
        if (tile === 0) continue;

        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;

        switch (tile) {
          case 1: // Ground
            platforms.create(x, y, "ground-tile");
            break;
          case 2: // Wall
            platforms.create(x, y, "wall-tile");
            break;
          case 3: { // One-way platform
            const plat = platforms.create(x, y, "platform-tile") as Phaser.Physics.Arcade.Sprite;
            plat.setData("oneWay", true);
            // Adjust body to only be on top portion
            (plat.body as Phaser.Physics.Arcade.StaticBody).setSize(TILE_SIZE, 8);
            (plat.body as Phaser.Physics.Arcade.StaticBody).setOffset(0, 0);
            break;
          }
          case 4: { // Spike
            const spike = spikes.create(x, y + 8, "spike") as Phaser.Physics.Arcade.Sprite;
            (spike.body as Phaser.Physics.Arcade.StaticBody).setSize(TILE_SIZE - 8, 10);
            (spike.body as Phaser.Physics.Arcade.StaticBody).setOffset(4, 6);
            break;
          }
          case 5: // Goal
            goal = scene.physics.add.sprite(x, y - 16, "goal");
            goal.setOrigin(0.5, 0.5);
            (goal.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
            (goal.body as Phaser.Physics.Arcade.Body).setImmovable(true);
            break;
        }
      }
    }

    // Build enemies
    for (const ep of PROTOTYPE_ENEMIES) {
      const ex = ep.tileX * TILE_SIZE + TILE_SIZE / 2;
      const ey = ep.tileY * TILE_SIZE + TILE_SIZE / 2;

      if (ep.type === "patrol") {
        enemies.push(new PatrolEnemy(scene, ex, ey, ep.patrolRange ?? 5));
      } else {
        enemies.push(new ShooterEnemy(scene, ex, ey, playerSprite, projectileGroup));
      }
    }

    const levelWidth = LEVEL_WIDTH_TILES * TILE_SIZE;
    const levelHeight = LEVEL_HEIGHT_TILES * TILE_SIZE;
    const deathY = levelHeight + 100;

    return { platforms, spikes, goal, enemies, deathY, levelWidth, levelHeight };
  }
}
