import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Engine, ViewMode } from "../core/Engine";
import { InputManager } from "../core/InputManager";
import { Player } from "../entities/Player";
import { OpenWorld, DoorInfo, ElevatorInfo, BuildingBounds } from "../world/OpenWorld";

const CAMERA_SENSITIVITY = 0.012;
const FPS_YAW_SENSITIVITY = 0.01;
const FPS_PITCH_SENSITIVITY = 0.008;
const TRANSITION_DURATION = 0.5;
const DOOR_INTERACT_RANGE = 3;
const ELEVATOR_INTERACT_RANGE = 2.5;
const ELEVATOR_SPEED = 3; // units per second

export class OpenWorldScene {
  private engine: Engine;
  private input: InputManager;
  private player!: Player;
  private world!: OpenWorld;

  // First-person camera state
  private fpsYaw = 0;
  private fpsPitch = 0;

  // Camera transition state
  private transitionCam!: UniversalCamera;
  private isTransitioning = false;
  private transitionT = 0;
  private transStartPos = Vector3.Zero();
  private transStartTarget = Vector3.Zero();
  private transStartFov = 0.8;
  private transTargetMode: ViewMode = "third";

  // Indoor detection
  private wasIndoors = false;

  // UI
  private viewToggleBtn!: HTMLButtonElement;
  private actionBtn!: HTMLButtonElement;
  private jumpBtn!: HTMLButtonElement;
  private dashBtn!: HTMLButtonElement;
  private staminaBarFill!: HTMLDivElement;
  private staminaBarBg!: HTMLDivElement;
  private nearDoor = false;

  constructor(engine: Engine, input: InputManager) {
    this.engine = engine;
    this.input = input;
  }

  init(): void {
    const scene = this.engine.scene;

    this.world = new OpenWorld(scene, this.engine.shadowGenerator);

    this.player = new Player(
      scene,
      this.input,
      new Color3(0.2, 0.6, 0.85),
      0, 8
    );

    this.player.mesh.getChildMeshes().forEach((m) => {
      this.engine.shadowGenerator.addShadowCaster(m);
    });

    // Transition camera (used during view switch animation)
    this.transitionCam = new UniversalCamera("transCam", Vector3.Zero(), this.engine.scene);
    this.transitionCam.minZ = 0.1;
    this.transitionCam.inputs.clear();

    this.createUI();

    this.engine.onUpdate((dt) => this.update(dt));
  }

  private createUI(): void {
    // View toggle button (top-right)
    this.viewToggleBtn = document.createElement("button");
    this.viewToggleBtn.textContent = "1P";
    this.viewToggleBtn.style.cssText =
      "position:fixed;right:24px;top:24px;width:56px;height:56px;" +
      "border-radius:50%;border:2px solid rgba(255,255,255,0.25);" +
      "background:rgba(0,0,0,0.4);color:#fff;font-size:16px;font-weight:bold;" +
      "cursor:pointer;z-index:25;-webkit-tap-highlight-color:transparent;" +
      "display:flex;align-items:center;justify-content:center;" +
      "backdrop-filter:blur(4px);transition:background 0.15s;";
    this.viewToggleBtn.addEventListener("click", () => this.toggleView());
    this.viewToggleBtn.addEventListener("touchstart", (e) => e.stopPropagation());
    document.body.appendChild(this.viewToggleBtn);

    // Action button (bottom-right)
    this.actionBtn = document.createElement("button");
    this.actionBtn.textContent = "A";
    this.actionBtn.style.cssText =
      "position:fixed;right:24px;bottom:96px;width:56px;height:56px;" +
      "border-radius:50%;border:2px solid rgba(255,255,255,0.25);" +
      "background:rgba(0,0,0,0.4);color:#fff;font-size:20px;font-weight:bold;" +
      "cursor:pointer;z-index:25;-webkit-tap-highlight-color:transparent;" +
      "display:flex;align-items:center;justify-content:center;" +
      "backdrop-filter:blur(4px);transition:background 0.15s,opacity 0.2s,border-color 0.2s;" +
      "opacity:0.4;";
    this.actionBtn.addEventListener("click", () => this.tryInteract());
    this.actionBtn.addEventListener("touchstart", (e) => e.stopPropagation());
    document.body.appendChild(this.actionBtn);

    // Dash button (above action button)
    this.dashBtn = document.createElement("button");
    this.dashBtn.textContent = "D";
    this.dashBtn.style.cssText =
      "position:fixed;right:24px;bottom:168px;width:56px;height:56px;" +
      "border-radius:50%;border:2px solid rgba(255,255,255,0.25);" +
      "background:rgba(0,0,0,0.4);color:#fff;font-size:18px;font-weight:bold;" +
      "cursor:pointer;z-index:25;-webkit-tap-highlight-color:transparent;" +
      "display:flex;align-items:center;justify-content:center;" +
      "backdrop-filter:blur(4px);transition:background 0.15s,border-color 0.15s;";
    this.dashBtn.addEventListener("click", () => this.toggleDash());
    this.dashBtn.addEventListener("touchstart", (e) => e.stopPropagation());
    document.body.appendChild(this.dashBtn);

    // Jump button (below action button)
    this.jumpBtn = document.createElement("button");
    this.jumpBtn.textContent = "J";
    this.jumpBtn.style.cssText =
      "position:fixed;right:24px;bottom:24px;width:56px;height:56px;" +
      "border-radius:50%;border:2px solid rgba(255,255,255,0.25);" +
      "background:rgba(0,0,0,0.4);color:#fff;font-size:20px;font-weight:bold;" +
      "cursor:pointer;z-index:25;-webkit-tap-highlight-color:transparent;" +
      "display:flex;align-items:center;justify-content:center;" +
      "backdrop-filter:blur(4px);transition:background 0.15s;";
    this.jumpBtn.addEventListener("click", () => this.player.jump());
    this.jumpBtn.addEventListener("touchstart", (e) => e.stopPropagation());
    document.body.appendChild(this.jumpBtn);

    // Stamina gauge (bottom-center)
    this.staminaBarBg = document.createElement("div");
    this.staminaBarBg.style.cssText =
      "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);" +
      "width:160px;height:14px;border-radius:7px;" +
      "background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.2);" +
      "z-index:25;overflow:hidden;backdrop-filter:blur(4px);";
    this.staminaBarFill = document.createElement("div");
    this.staminaBarFill.style.cssText =
      "width:100%;height:100%;border-radius:7px;" +
      "background:#e03030;transition:background-color 0.3s;";
    this.staminaBarBg.appendChild(this.staminaBarFill);
    document.body.appendChild(this.staminaBarBg);
  }

  /* ---- Dash toggle ---- */

  private toggleDash(): void {
    this.player.dashOn = !this.player.dashOn;
    if (this.player.dashOn) {
      this.dashBtn.style.background = "rgba(220,60,60,0.6)";
      this.dashBtn.style.borderColor = "rgba(255,100,100,0.7)";
    } else {
      this.dashBtn.style.background = "rgba(0,0,0,0.4)";
      this.dashBtn.style.borderColor = "rgba(255,255,255,0.25)";
    }
  }

  /* ---- View toggle / camera transition ---- */

  private toggleView(): void {
    if (this.isTransitioning) return;

    const next: ViewMode = this.engine.viewMode === "third" ? "first" : "third";

    // Capture start position / target from current camera
    if (this.engine.viewMode === "third") {
      const cam = this.engine.thirdPersonCam;
      this.transStartPos.copyFrom(cam.position);
      this.transStartTarget.copyFrom(cam.target);
      this.transStartFov = cam.fov;
    } else {
      const cam = this.engine.firstPersonCam;
      this.transStartPos.copyFrom(cam.position);
      this.transStartTarget.copyFrom(cam.getTarget());
      this.transStartFov = cam.fov;
    }

    // Prepare target mode parameters
    if (next === "first") {
      this.fpsYaw = this.player.mesh.rotation.y;
      this.fpsPitch = 0;
    } else {
      this.player.mesh.setEnabled(true);
      this.engine.thirdPersonCam.alpha = -this.fpsYaw - Math.PI / 2;
    }

    // Activate transition camera at current position
    this.transitionCam.position.copyFrom(this.transStartPos);
    this.transitionCam.setTarget(this.transStartTarget);
    this.transitionCam.fov = this.transStartFov;
    this.engine.scene.activeCamera = this.transitionCam;

    // Start transition
    this.isTransitioning = true;
    this.transitionT = 0;
    this.transTargetMode = next;

    this.viewToggleBtn.textContent = next === "first" ? "3P" : "1P";
  }

  /* ---- Main update ---- */

  private update(dt: number): void {
    // Animate doors and elevators every frame
    this.animateDoors(dt);
    this.animateElevators(dt);

    // Player movement (pass camera alpha for third-person input rotation)
    this.player.update(dt, this.engine.viewMode, this.fpsYaw, this.engine.thirdPersonCam.alpha);

    const camDelta = this.input.consumeCameraDelta();
    const pos = this.player.getPosition();

    // Update action button hint
    this.updateActionHint(pos);

    // Auto-switch to first-person when entering a building
    this.checkIndoorAutoFPV(pos);

    // Update stamina gauge
    this.updateStaminaGauge();

    if (this.isTransitioning) {
      this.updateTransition(dt, pos);
      return;
    }

    if (this.engine.viewMode === "third") {
      this.updateThirdPerson(camDelta, pos);
    } else {
      this.updateFirstPerson(camDelta, pos);
    }
  }

  /* ---- Camera transition ---- */

  private updateTransition(dt: number, pos: Vector3): void {
    this.transitionT += dt / TRANSITION_DURATION;

    if (this.transitionT >= 1) {
      this.finishTransition();
      return;
    }

    // Smoothstep easing
    const t = this.transitionT;
    const ease = t * t * (3 - 2 * t);

    // Compute destination that tracks the player's current position
    const { endPos, endTarget, endFov } = this.computeTransitionEnd(pos);

    // Interpolate position, target, FOV
    const cam = this.transitionCam;
    Vector3.LerpToRef(this.transStartPos, endPos, ease, cam.position);
    const lerpTarget = Vector3.Lerp(this.transStartTarget, endTarget, ease);
    cam.setTarget(lerpTarget);
    cam.fov = this.transStartFov + (endFov - this.transStartFov) * ease;

    // Hide player mesh near end when going to first-person
    if (this.transTargetMode === "first" && ease > 0.75) {
      this.player.mesh.setEnabled(false);
    }
  }

  private computeTransitionEnd(pos: Vector3): { endPos: Vector3; endTarget: Vector3; endFov: number } {
    if (this.transTargetMode === "first") {
      const headPos = new Vector3(pos.x, pos.y + 1.4, pos.z);
      const lookX = Math.sin(this.fpsYaw) * Math.cos(this.fpsPitch);
      const lookY = Math.sin(this.fpsPitch);
      const lookZ = Math.cos(this.fpsYaw) * Math.cos(this.fpsPitch);
      return {
        endPos: headPos,
        endTarget: new Vector3(pos.x + lookX, pos.y + 1.4 + lookY, pos.z + lookZ),
        endFov: this.engine.firstPersonCam.fov,
      };
    } else {
      const cam = this.engine.thirdPersonCam;
      const target = new Vector3(pos.x, pos.y + 1, pos.z);
      cam.target.copyFrom(target);
      const endPos = new Vector3(
        target.x + cam.radius * Math.cos(cam.alpha) * Math.sin(cam.beta),
        target.y + cam.radius * Math.cos(cam.beta),
        target.z + cam.radius * Math.sin(cam.alpha) * Math.sin(cam.beta),
      );
      return { endPos, endTarget: target, endFov: cam.fov };
    }
  }

  private finishTransition(): void {
    this.isTransitioning = false;
    this.engine.setViewMode(this.transTargetMode);

    if (this.transTargetMode === "first") {
      this.player.mesh.setEnabled(false);
    }
  }

  /* ---- Door interaction ---- */

  private tryInteract(): void {
    const playerPos = this.player.getPosition();

    // Check elevator first (higher priority when near one)
    let nearestElev: ElevatorInfo | null = null;
    let nearestElevDist = Infinity;
    for (const elev of this.world.elevators) {
      const dx = playerPos.x - elev.worldX;
      const dz = playerPos.z - elev.worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < ELEVATOR_INTERACT_RANGE && dist < nearestElevDist) {
        nearestElev = elev;
        nearestElevDist = dist;
      }
    }

    if (nearestElev && !nearestElev.moving) {
      // Cycle to next floor
      nearestElev.targetFloor = (nearestElev.currentFloor + 1) % nearestElev.numFloors;
      nearestElev.moving = true;
      return;
    }

    // Otherwise check doors
    let nearest: DoorInfo | null = null;
    let nearestDist = Infinity;

    for (const door of this.world.doors) {
      const doorPos = door.pivot.getAbsolutePosition();
      const dx = playerPos.x - doorPos.x;
      const dz = playerPos.z - doorPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < DOOR_INTERACT_RANGE && dist < nearestDist) {
        nearest = door;
        nearestDist = dist;
      }
    }

    if (nearest) {
      nearest.isOpen = !nearest.isOpen;
    }
  }

  private animateDoors(dt: number): void {
    for (const door of this.world.doors) {
      const target = door.isOpen ? -Math.PI / 2 : 0;
      const diff = target - door.currentAngle;
      if (Math.abs(diff) > 0.01) {
        door.currentAngle += diff * Math.min(1, dt * 8);
        door.pivot.rotation.y = door.currentAngle;
      }
    }
  }

  private animateElevators(dt: number): void {
    for (const elev of this.world.elevators) {
      if (!elev.moving) continue;

      const targetY = elev.targetFloor * elev.floorH + 0.08;
      const diff = targetY - elev.currentY;

      if (Math.abs(diff) < 0.05) {
        // Arrived
        elev.currentY = targetY;
        elev.currentFloor = elev.targetFloor;
        elev.moving = false;
      } else {
        // Move toward target
        const dir = Math.sign(diff);
        elev.currentY += dir * ELEVATOR_SPEED * dt;
        // Don't overshoot
        if (dir > 0 && elev.currentY > targetY) elev.currentY = targetY;
        if (dir < 0 && elev.currentY < targetY) elev.currentY = targetY;
      }

      // Update platform position (local Y within building root)
      elev.platform.position.y = elev.currentY;
    }
  }

  private updateActionHint(playerPos: Vector3): void {
    let near = false;

    // Check doors
    for (const door of this.world.doors) {
      const doorPos = door.pivot.getAbsolutePosition();
      const dx = playerPos.x - doorPos.x;
      const dz = playerPos.z - doorPos.z;
      if (dx * dx + dz * dz < DOOR_INTERACT_RANGE * DOOR_INTERACT_RANGE) {
        near = true;
        break;
      }
    }

    // Check elevators
    if (!near) {
      for (const elev of this.world.elevators) {
        const dx = playerPos.x - elev.worldX;
        const dz = playerPos.z - elev.worldZ;
        if (dx * dx + dz * dz < ELEVATOR_INTERACT_RANGE * ELEVATOR_INTERACT_RANGE) {
          near = true;
          break;
        }
      }
    }

    if (near !== this.nearDoor) {
      this.nearDoor = near;
      this.actionBtn.style.opacity = near ? "1" : "0.4";
      this.actionBtn.style.borderColor = near
        ? "rgba(100,200,255,0.7)"
        : "rgba(255,255,255,0.25)";
    }
  }

  /* ---- Indoor detection / auto-FPV ---- */

  private isPlayerIndoors(pos: Vector3): boolean {
    for (const b of this.world.buildingBounds) {
      if (pos.x >= b.minX && pos.x <= b.maxX &&
          pos.z >= b.minZ && pos.z <= b.maxZ &&
          pos.y < b.maxY) {
        return true;
      }
    }
    return false;
  }

  private checkIndoorAutoFPV(pos: Vector3): void {
    const indoors = this.isPlayerIndoors(pos);
    if (indoors && !this.wasIndoors && this.engine.viewMode === "third" && !this.isTransitioning) {
      this.toggleView(); // switches to first-person
    }
    this.wasIndoors = indoors;
  }

  /* ---- Stamina gauge UI ---- */

  private updateStaminaGauge(): void {
    const state = this.player.staminaState;
    if (state === "exhausted") {
      // Blue bar – shows exhaustion countdown
      this.staminaBarFill.style.width = (this.player.exhaustRatio * 100) + "%";
      this.staminaBarFill.style.backgroundColor = "#3080e0";
    } else {
      // Red bar – shows stamina amount (normal or recovery)
      this.staminaBarFill.style.width = (this.player.staminaRatio * 100) + "%";
      this.staminaBarFill.style.backgroundColor = "#e03030";
    }

    // Auto-disable dash button visual when exhausted or recovery
    if (state === "exhausted" || (state === "recovery" && this.player.dashOn)) {
      this.dashBtn.style.opacity = "0.4";
    } else {
      this.dashBtn.style.opacity = "1";
    }
  }

  /* ---- Camera updates ---- */

  private updateThirdPerson(camDelta: { dx: number; dy: number }, pos: Vector3): void {
    const cam = this.engine.thirdPersonCam;

    // Camera rotation from drag
    if (camDelta.dx !== 0 || camDelta.dy !== 0) {
      cam.alpha -= camDelta.dx * CAMERA_SENSITIVITY;
      cam.beta -= camDelta.dy * CAMERA_SENSITIVITY;
      // Clamp beta
      cam.beta = Math.max(cam.lowerBetaLimit ?? 0.3, Math.min(cam.upperBetaLimit ?? Math.PI / 2.5, cam.beta));
    }

    cam.target.set(pos.x, pos.y + 1, pos.z);
  }

  private updateFirstPerson(camDelta: { dx: number; dy: number }, pos: Vector3): void {
    const cam = this.engine.firstPersonCam;

    // Rotate camera from drag
    if (camDelta.dx !== 0 || camDelta.dy !== 0) {
      this.fpsYaw += camDelta.dx * FPS_YAW_SENSITIVITY;
      this.fpsPitch -= camDelta.dy * FPS_PITCH_SENSITIVITY;
      // Clamp pitch
      this.fpsPitch = Math.max(-1.2, Math.min(1.2, this.fpsPitch));
    }

    // Position camera at player head (accounts for jump height)
    cam.position.set(pos.x, pos.y + 1.4, pos.z);

    // Look direction from yaw + pitch
    const lookX = Math.sin(this.fpsYaw) * Math.cos(this.fpsPitch);
    const lookY = Math.sin(this.fpsPitch);
    const lookZ = Math.cos(this.fpsYaw) * Math.cos(this.fpsPitch);
    cam.setTarget(new Vector3(
      pos.x + lookX,
      pos.y + 1.4 + lookY,
      pos.z + lookZ
    ));
  }
}
