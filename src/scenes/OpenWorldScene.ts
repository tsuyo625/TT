import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Engine, ViewMode } from "../core/Engine";
import { InputManager } from "../core/InputManager";
import { Player } from "../entities/Player";
import { OpenWorld } from "../world/OpenWorld";

const CAMERA_SENSITIVITY = 0.005;
const FPS_YAW_SENSITIVITY = 0.004;
const FPS_PITCH_SENSITIVITY = 0.003;

export class OpenWorldScene {
  private engine: Engine;
  private input: InputManager;
  private player!: Player;

  // First-person camera state
  private fpsYaw = 0;
  private fpsPitch = 0;

  // UI
  private viewToggleBtn!: HTMLButtonElement;

  constructor(engine: Engine, input: InputManager) {
    this.engine = engine;
    this.input = input;
  }

  init(): void {
    const scene = this.engine.scene;

    new OpenWorld(scene, this.engine.shadowGenerator);

    this.player = new Player(
      scene,
      this.input,
      new Color3(0.2, 0.6, 0.85),
      0, 8
    );

    this.player.mesh.getChildMeshes().forEach((m) => {
      this.engine.shadowGenerator.addShadowCaster(m);
    });

    this.createUI();

    this.engine.onUpdate((dt) => this.update(dt));
  }

  private createUI(): void {
    // View toggle button (bottom-right)
    this.viewToggleBtn = document.createElement("button");
    this.viewToggleBtn.textContent = "1P";
    this.viewToggleBtn.style.cssText =
      "position:fixed;right:24px;bottom:24px;width:56px;height:56px;" +
      "border-radius:50%;border:2px solid rgba(255,255,255,0.25);" +
      "background:rgba(0,0,0,0.4);color:#fff;font-size:16px;font-weight:bold;" +
      "cursor:pointer;z-index:25;-webkit-tap-highlight-color:transparent;" +
      "display:flex;align-items:center;justify-content:center;" +
      "backdrop-filter:blur(4px);transition:background 0.15s;";
    this.viewToggleBtn.addEventListener("click", () => this.toggleView());
    // Prevent touch events on button from propagating to canvas
    this.viewToggleBtn.addEventListener("touchstart", (e) => e.stopPropagation());
    document.body.appendChild(this.viewToggleBtn);
  }

  private toggleView(): void {
    const next: ViewMode = this.engine.viewMode === "third" ? "first" : "third";
    this.engine.setViewMode(next);

    if (next === "first") {
      this.viewToggleBtn.textContent = "3P";
      // Hide player mesh in first person
      this.player.mesh.setEnabled(false);
      // Initialize FPS yaw from player rotation
      this.fpsYaw = this.player.mesh.rotation.y;
      this.fpsPitch = 0;
    } else {
      this.viewToggleBtn.textContent = "1P";
      this.player.mesh.setEnabled(true);
      // Restore third-person camera angle from FPS yaw
      this.engine.thirdPersonCam.alpha = -this.fpsYaw - Math.PI / 2;
    }
  }

  private update(dt: number): void {
    this.player.update(dt, this.engine.viewMode, this.fpsYaw);

    const camDelta = this.input.consumeCameraDelta();
    const pos = this.player.getPosition();

    if (this.engine.viewMode === "third") {
      this.updateThirdPerson(camDelta, pos);
    } else {
      this.updateFirstPerson(camDelta, pos);
    }
  }

  private updateThirdPerson(camDelta: { dx: number; dy: number }, pos: Vector3): void {
    const cam = this.engine.thirdPersonCam;

    // Camera rotation from drag
    if (camDelta.dx !== 0 || camDelta.dy !== 0) {
      cam.alpha -= camDelta.dx * CAMERA_SENSITIVITY;
      cam.beta -= camDelta.dy * CAMERA_SENSITIVITY;
      // Clamp beta
      cam.beta = Math.max(cam.lowerBetaLimit ?? 0.3, Math.min(cam.upperBetaLimit ?? Math.PI / 2.5, cam.beta));
    }

    cam.target.set(pos.x, 1, pos.z);
  }

  private updateFirstPerson(camDelta: { dx: number; dy: number }, pos: Vector3): void {
    const cam = this.engine.firstPersonCam;

    // Rotate camera from drag
    if (camDelta.dx !== 0 || camDelta.dy !== 0) {
      this.fpsYaw -= camDelta.dx * FPS_YAW_SENSITIVITY;
      this.fpsPitch -= camDelta.dy * FPS_PITCH_SENSITIVITY;
      // Clamp pitch
      this.fpsPitch = Math.max(-1.2, Math.min(1.2, this.fpsPitch));
    }

    // Position camera at player head
    cam.position.set(pos.x, 1.4, pos.z);

    // Look direction from yaw + pitch
    const lookX = Math.sin(this.fpsYaw) * Math.cos(this.fpsPitch);
    const lookY = Math.sin(this.fpsPitch);
    const lookZ = Math.cos(this.fpsYaw) * Math.cos(this.fpsPitch);
    cam.setTarget(new Vector3(
      pos.x + lookX,
      1.4 + lookY,
      pos.z + lookZ
    ));
  }
}
