import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/Constants";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    const titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, "DEATH EVOLUTION", {
      fontSize: "48px",
      fontFamily: "monospace",
      color: "#e94560",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const subtitleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, "死んで進化する2Dアクション", {
      fontSize: "18px",
      fontFamily: "monospace",
      color: "#a0a0c0",
    }).setOrigin(0.5);

    const startText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, "Press SPACE or Click to Start", {
      fontSize: "20px",
      fontFamily: "monospace",
      color: "#ffffff",
    }).setOrigin(0.5);

    // Blink the start text
    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Controls help
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, "Controls: Arrow/WASD = Move | SPACE/X = Jump | Z = Attack", {
      fontSize: "12px",
      fontFamily: "monospace",
      color: "#606080",
    }).setOrigin(0.5);

    // Start on space or click/tap
    this.input.keyboard?.once("keydown-SPACE", () => this.startGame());
    this.input.once("pointerdown", () => this.startGame());
  }

  private startGame(): void {
    this.scene.start("GameScene");
    this.scene.launch("UIScene");
  }
}
