import Phaser from "phaser";
import { TILE_SIZE } from "../config/Constants";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  create(): void {
    this.generateTextures();
    this.scene.start("TitleScene");
  }

  private generateTextures(): void {
    const gfx = this.add.graphics();

    // Player (24x32, green)
    gfx.fillStyle(0x44cc44, 1);
    gfx.fillRect(0, 0, 24, 32);
    gfx.generateTexture("player", 24, 32);
    gfx.clear();

    // Player with wings (24x32, green body + blue wing hints)
    gfx.fillStyle(0x44cc44, 1);
    gfx.fillRect(4, 0, 16, 32);
    gfx.fillStyle(0x4488ff, 1);
    gfx.fillTriangle(0, 8, 4, 4, 4, 16);
    gfx.fillTriangle(24, 8, 20, 4, 20, 16);
    gfx.generateTexture("player-wings", 24, 32);
    gfx.clear();

    // Patrol enemy (24x24, red)
    gfx.fillStyle(0xcc4444, 1);
    gfx.fillRect(0, 0, 24, 24);
    gfx.generateTexture("patrol-enemy", 24, 24);
    gfx.clear();

    // Shooter enemy (24x24, orange)
    gfx.fillStyle(0xcc8844, 1);
    gfx.fillRect(0, 0, 24, 24);
    gfx.generateTexture("shooter-enemy", 24, 24);
    gfx.clear();

    // Projectile (8x8, yellow)
    gfx.fillStyle(0xcccc44, 1);
    gfx.fillRect(0, 0, 8, 8);
    gfx.generateTexture("projectile", 8, 8);
    gfx.clear();

    // Ground tile (32x32, brown)
    gfx.fillStyle(0x8b6914, 1);
    gfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    gfx.lineStyle(1, 0x6b4f0f, 0.5);
    gfx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    gfx.generateTexture("ground-tile", TILE_SIZE, TILE_SIZE);
    gfx.clear();

    // Wall tile (32x32, dark gray)
    gfx.fillStyle(0x555555, 1);
    gfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    gfx.lineStyle(1, 0x444444, 0.5);
    gfx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    gfx.generateTexture("wall-tile", TILE_SIZE, TILE_SIZE);
    gfx.clear();

    // Platform tile (32x32, lighter brown)
    gfx.fillStyle(0xa0855b, 1);
    gfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    gfx.lineStyle(1, 0x8a7050, 0.5);
    gfx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    gfx.generateTexture("platform-tile", TILE_SIZE, TILE_SIZE);
    gfx.clear();

    // Spike (32x16, red triangle)
    gfx.fillStyle(0xcc2222, 1);
    gfx.fillTriangle(TILE_SIZE / 2, 0, 0, 16, TILE_SIZE, 16);
    gfx.generateTexture("spike", TILE_SIZE, 16);
    gfx.clear();

    // Goal (32x64, gold)
    gfx.fillStyle(0xffd700, 1);
    gfx.fillRect(0, 0, 32, 64);
    gfx.fillStyle(0xffaa00, 1);
    gfx.fillRect(4, 4, 24, 12);
    gfx.generateTexture("goal", 32, 64);
    gfx.clear();

    // Attack hitbox visual (48x32, white semi-transparent)
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillRect(0, 0, 48, 32);
    gfx.generateTexture("attack-hitbox", 48, 32);
    gfx.clear();

    // Particle (4x4, white)
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRect(0, 0, 4, 4);
    gfx.generateTexture("particle", 4, 4);
    gfx.clear();

    // Checkpoint flag (16x48, cyan)
    gfx.fillStyle(0x00cccc, 1);
    gfx.fillRect(0, 0, 4, 48);
    gfx.fillStyle(0x00ffff, 1);
    gfx.fillTriangle(4, 0, 4, 16, 16, 8);
    gfx.generateTexture("checkpoint", 16, 48);
    gfx.clear();

    gfx.destroy();
  }
}
