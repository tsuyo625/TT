import Phaser from "phaser";

export class InputManager {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> | null = null;

  private _jumpPressed = false;
  private _attackPressed = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) return; // No keyboard on mobile/touch devices

    this.cursors = kb.createCursorKeys();
    this.keys = {
      W: kb.addKey("W"),
      A: kb.addKey("A"),
      D: kb.addKey("D"),
      Z: kb.addKey("Z"),
      X: kb.addKey("X"),
      SPACE: kb.addKey("SPACE"),
    };

    kb.on("keydown-SPACE", () => { this._jumpPressed = true; });
    kb.on("keydown-X", () => { this._jumpPressed = true; });
    kb.on("keydown-UP", () => { this._jumpPressed = true; });
    kb.on("keydown-W", () => { this._jumpPressed = true; });
    kb.on("keydown-Z", () => { this._attackPressed = true; });
  }

  get left(): boolean {
    return (this.cursors?.left.isDown ?? false) || (this.keys?.A.isDown ?? false);
  }

  get right(): boolean {
    return (this.cursors?.right.isDown ?? false) || (this.keys?.D.isDown ?? false);
  }

  get jumpHeld(): boolean {
    return (this.cursors?.up.isDown ?? false) ||
      (this.keys?.SPACE.isDown ?? false) ||
      (this.keys?.X.isDown ?? false) ||
      (this.keys?.W.isDown ?? false);
  }

  consumeJump(): boolean {
    const v = this._jumpPressed;
    this._jumpPressed = false;
    return v;
  }

  consumeAttack(): boolean {
    const v = this._attackPressed;
    this._attackPressed = false;
    return v;
  }
}
