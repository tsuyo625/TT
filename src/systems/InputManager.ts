import Phaser from "phaser";

export class InputManager {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;

  private _jumpPressed = false;
  private _attackPressed = false;

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = {
      W: scene.input.keyboard!.addKey("W"),
      A: scene.input.keyboard!.addKey("A"),
      D: scene.input.keyboard!.addKey("D"),
      Z: scene.input.keyboard!.addKey("Z"),
      X: scene.input.keyboard!.addKey("X"),
      SPACE: scene.input.keyboard!.addKey("SPACE"),
    };

    scene.input.keyboard!.on("keydown-SPACE", () => { this._jumpPressed = true; });
    scene.input.keyboard!.on("keydown-X", () => { this._jumpPressed = true; });
    scene.input.keyboard!.on("keydown-UP", () => { this._jumpPressed = true; });
    scene.input.keyboard!.on("keydown-W", () => { this._jumpPressed = true; });
    scene.input.keyboard!.on("keydown-Z", () => { this._attackPressed = true; });
  }

  get left(): boolean {
    return this.cursors.left.isDown || this.keys.A.isDown;
  }

  get right(): boolean {
    return this.cursors.right.isDown || this.keys.D.isDown;
  }

  get jumpHeld(): boolean {
    return this.cursors.up.isDown || this.keys.SPACE.isDown || this.keys.X.isDown || this.keys.W.isDown;
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
