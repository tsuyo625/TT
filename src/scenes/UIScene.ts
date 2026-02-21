import Phaser from "phaser";
import type { DeathCause, EvolutionDefinition } from "../types";
import { GAME_WIDTH, GAME_HEIGHT, MAX_DEATHS } from "../config/Constants";

export class UIScene extends Phaser.Scene {
  private livesText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private deathCauseText!: Phaser.GameObjects.Text;
  private evolutionText!: Phaser.GameObjects.Text;
  private deathFlashText!: Phaser.GameObjects.Text;
  private evolutionPopup!: Phaser.GameObjects.Container;

  private deathCounts: Record<DeathCause, number> = { fall: 0, enemy: 0, timeout: 0 };

  constructor() {
    super("UIScene");
  }

  create(): void {
    // Lives display (top-left)
    this.livesText = this.add.text(16, 16, `Lives: ${MAX_DEATHS}`, {
      fontSize: "20px",
      fontFamily: "monospace",
      color: "#ffffff",
      fontStyle: "bold",
    });

    // Timer (top-right)
    this.timerText = this.add.text(GAME_WIDTH - 16, 16, "3:00", {
      fontSize: "20px",
      fontFamily: "monospace",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(1, 0);

    // Death cause counters (bottom-left)
    this.deathCauseText = this.add.text(16, GAME_HEIGHT - 60, "", {
      fontSize: "12px",
      fontFamily: "monospace",
      color: "#a0a0c0",
      lineSpacing: 4,
    });
    this.updateDeathCauseDisplay();

    // Evolution indicator (bottom-left, above death counts)
    this.evolutionText = this.add.text(16, GAME_HEIGHT - 90, "", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#ffdd44",
      fontStyle: "bold",
    });

    // Death flash text (center, hidden by default)
    this.deathFlashText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "", {
      fontSize: "32px",
      fontFamily: "monospace",
      color: "#ff4444",
      fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0);

    // Evolution popup container (hidden by default)
    this.evolutionPopup = this.createEvolutionPopup();
    this.evolutionPopup.setVisible(false);

    // Listen to GameScene events
    const gameScene = this.scene.get("GameScene");
    gameScene.events.on("timer-update", this.onTimerUpdate, this);
    gameScene.events.on("player-death", this.onPlayerDeath, this);
    gameScene.events.on("evolution-granted", this.onEvolution, this);
    gameScene.events.on("stage-clear", this.onStageClear, this);
  }

  private onTimerUpdate(remaining: number): void {
    const min = Math.floor(remaining / 60);
    const sec = Math.floor(remaining % 60);
    this.timerText.setText(`${min}:${sec.toString().padStart(2, "0")}`);

    // Flash red when low
    if (remaining < 30) {
      this.timerText.setColor(remaining % 1 < 0.5 ? "#ff4444" : "#ffffff");
    }
  }

  private onPlayerDeath(data: {
    cause: DeathCause;
    deathCount: number;
    maxDeaths: number;
    counts: Record<DeathCause, number>;
  }): void {
    this.deathCounts = data.counts;
    const remaining = data.maxDeaths - data.deathCount;
    this.livesText.setText(`Lives: ${remaining}`);

    if (remaining <= 1) {
      this.livesText.setColor("#ff4444");
    }

    this.updateDeathCauseDisplay();

    // Flash death cause text
    const causeNames: Record<DeathCause, string> = {
      fall: "FALL DEATH!",
      enemy: "ENEMY DEATH!",
      timeout: "TIME OVER!",
    };
    this.deathFlashText.setText(causeNames[data.cause]);
    this.deathFlashText.setAlpha(1);
    this.tweens.add({
      targets: this.deathFlashText,
      alpha: 0,
      duration: 1200,
      ease: "Power2",
    });
  }

  private onEvolution(evo: EvolutionDefinition): void {
    this.evolutionText.setText(`[${evo.name}] ${evo.description}`);

    // Show popup
    this.showEvolutionPopup(evo);
  }

  private onStageClear(): void {
    const clearText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "STAGE CLEAR!", {
      fontSize: "48px",
      fontFamily: "monospace",
      color: "#ffd700",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.tweens.add({
      targets: clearText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      yoyo: true,
      repeat: 2,
    });
  }

  private updateDeathCauseDisplay(): void {
    this.deathCauseText.setText(
      `Falls: ${this.deathCounts.fall}  Enemy: ${this.deathCounts.enemy}  Timeout: ${this.deathCounts.timeout}`
    );
  }

  private createEvolutionPopup(): Phaser.GameObjects.Container {
    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const bg = this.add.rectangle(0, 0, 400, 160, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0xffdd44);

    const title = this.add.text(0, -40, "EVOLUTION!", {
      fontSize: "36px",
      fontFamily: "monospace",
      color: "#ffdd44",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const desc = this.add.text(0, 20, "", {
      fontSize: "18px",
      fontFamily: "monospace",
      color: "#ffffff",
    }).setOrigin(0.5);
    desc.setName("evo-desc");

    container.add([bg, title, desc]);
    return container;
  }

  private showEvolutionPopup(evo: EvolutionDefinition): void {
    const desc = this.evolutionPopup.getByName("evo-desc") as Phaser.GameObjects.Text;
    desc.setText(`${evo.name} - ${evo.description}`);

    this.evolutionPopup.setVisible(true);
    this.evolutionPopup.setAlpha(0);
    this.evolutionPopup.setScale(0.5);

    this.tweens.add({
      targets: this.evolutionPopup,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(1600, () => {
          this.tweens.add({
            targets: this.evolutionPopup,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              this.evolutionPopup.setVisible(false);
            },
          });
        });
      },
    });
  }
}
