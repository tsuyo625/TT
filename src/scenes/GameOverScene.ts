import Phaser from "phaser";
import type { DeathCause, EvolutionType } from "../types";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/Constants";

interface GameOverData {
  won: boolean;
  deathCounts: Record<DeathCause, number>;
  totalDeaths: number;
  evolution: EvolutionType | null;
  timeElapsed: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data: GameOverData): void {
    const centerX = GAME_WIDTH / 2;
    let y = 60;

    // Title
    const title = data.won ? "STAGE CLEAR!" : "GAME OVER";
    const titleColor = data.won ? "#ffd700" : "#e94560";
    this.add.text(centerX, y, title, {
      fontSize: "48px",
      fontFamily: "monospace",
      color: titleColor,
      fontStyle: "bold",
    }).setOrigin(0.5);

    y += 80;

    // Death stats
    this.add.text(centerX, y, `Deaths: ${data.totalDeaths}`, {
      fontSize: "24px",
      fontFamily: "monospace",
      color: "#ffffff",
    }).setOrigin(0.5);

    y += 40;

    // Breakdown
    const counts = data.deathCounts;
    this.add.text(centerX, y, `Fall: ${counts.fall}  |  Enemy: ${counts.enemy}  |  Timeout: ${counts.timeout}`, {
      fontSize: "16px",
      fontFamily: "monospace",
      color: "#a0a0c0",
    }).setOrigin(0.5);

    y += 50;

    // Evolution
    if (data.evolution) {
      const evoNames: Record<EvolutionType, string> = {
        wings: "Wings (Double Jump)",
        power: "Rage (Attack x2)",
        speed: "Haste (Speed +50%)",
      };
      this.add.text(centerX, y, `Evolution: ${evoNames[data.evolution]}`, {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#ffdd44",
      }).setOrigin(0.5);
      y += 40;
    }

    // Time
    const min = Math.floor(data.timeElapsed / 60);
    const sec = Math.floor(data.timeElapsed % 60);
    this.add.text(centerX, y, `Time: ${min}:${sec.toString().padStart(2, "0")}`, {
      fontSize: "18px",
      fontFamily: "monospace",
      color: "#a0a0c0",
    }).setOrigin(0.5);

    y += 70;

    // Retry button
    const retryBtn = this.add.text(centerX - 80, y, "[ RETRY ]", {
      fontSize: "24px",
      fontFamily: "monospace",
      color: "#44cc44",
      fontStyle: "bold",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on("pointerover", () => retryBtn.setColor("#88ff88"));
    retryBtn.on("pointerout", () => retryBtn.setColor("#44cc44"));
    retryBtn.on("pointerdown", () => {
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });

    // Title button
    const titleBtn = this.add.text(centerX + 80, y, "[ TITLE ]", {
      fontSize: "24px",
      fontFamily: "monospace",
      color: "#4488ff",
      fontStyle: "bold",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    titleBtn.on("pointerover", () => titleBtn.setColor("#88bbff"));
    titleBtn.on("pointerout", () => titleBtn.setColor("#4488ff"));
    titleBtn.on("pointerdown", () => {
      this.scene.start("TitleScene");
    });

    // Keyboard shortcuts
    this.input.keyboard!.once("keydown-SPACE", () => {
      this.scene.start("GameScene");
      this.scene.launch("UIScene");
    });
  }
}
