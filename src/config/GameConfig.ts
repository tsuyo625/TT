import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { TitleScene } from "../scenes/TitleScene";
import { GameScene } from "../scenes/GameScene";
import { UIScene } from "../scenes/UIScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { GAME_WIDTH, GAME_HEIGHT } from "./Constants";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 900 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, TitleScene, GameScene, UIScene, GameOverScene],
  pixelArt: true,
  roundPixels: true,
};
