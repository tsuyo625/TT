import * as THREE from "three";

export interface DragState {
  /** Normalized direction the player is dragging (-1 to 1 on each axis) */
  direction: THREE.Vector2;
  /** Drag distance in pixels (clamped to maxRadius) */
  magnitude: number;
  /** Whether the user is currently dragging */
  active: boolean;
}

export class InputManager {
  private _drag: DragState = {
    direction: new THREE.Vector2(),
    magnitude: 0,
    active: false,
  };
  private readonly maxRadius: number;

  /** Callback fired on single-tap (not drag) on the camera zone */
  onTap: ((screenPos: THREE.Vector2) => void) | null = null;

  // Joystick touch tracking
  private joystickTouchId: number | null = null;
  private joystickStart = new THREE.Vector2();

  // Camera touch tracking
  private cameraTouchId: number | null = null;
  private cameraPrevX = 0;
  private cameraPrevY = 0;
  private cameraWasDrag = false;
  private _cameraYaw = 0;
  private _cameraPitch = 0.876; // default angle ≈ atan2(12,10)
  private readonly PITCH_MIN = 0.2;
  private readonly PITCH_MAX = 1.4;

  // Virtual joystick visuals
  private joystickBase: HTMLDivElement;
  private joystickKnob: HTMLDivElement;

  // Joystick zone: bottom-left region of the screen
  private readonly ZONE_W_RATIO = 0.35;
  private readonly ZONE_H_RATIO = 0.40;

  // Fixed joystick center position
  private readonly JOY_LEFT = 75;
  private readonly JOY_BOTTOM = 90;

  get drag(): Readonly<DragState> {
    return this._drag;
  }

  get cameraYaw(): number {
    return this._cameraYaw;
  }

  get cameraPitch(): number {
    return this._cameraPitch;
  }

  constructor(element: HTMLElement, maxRadius = 80) {
    this.maxRadius = maxRadius;

    // Create joystick UI - always visible at bottom-left
    this.joystickBase = document.createElement("div");
    this.joystickBase.style.cssText =
      `position:fixed;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.2);pointer-events:none;z-index:20;left:${this.JOY_LEFT}px;bottom:${this.JOY_BOTTOM}px;transform:translate(-50%,50%);`;
    this.joystickKnob = document.createElement("div");
    this.joystickKnob.style.cssText =
      "position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.35);left:50%;top:50%;transform:translate(-50%,-50%);transition:background 0.1s;";
    this.joystickBase.appendChild(this.joystickKnob);
    document.body.appendChild(this.joystickBase);

    element.addEventListener("touchstart", this.onTouchStart, { passive: false });
    element.addEventListener("touchmove", this.onTouchMove, { passive: false });
    element.addEventListener("touchend", this.onTouchEnd, { passive: false });
    element.addEventListener("touchcancel", this.onTouchEnd, { passive: false });

    // Mouse fallback for browser testing
    element.addEventListener("mousedown", this.onMouseDown);
    element.addEventListener("mousemove", this.onMouseMove);
    element.addEventListener("mouseup", this.onMouseUp);
  }

  private isInJoystickZone(x: number, y: number): boolean {
    return (
      x < window.innerWidth * this.ZONE_W_RATIO &&
      y > window.innerHeight * (1 - this.ZONE_H_RATIO)
    );
  }

  // ── Touch events (multi-touch) ──

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (this.isInJoystickZone(t.clientX, t.clientY) && this.joystickTouchId === null) {
        this.joystickTouchId = t.identifier;
        this.startJoystick(t.clientX, t.clientY);
      } else if (this.cameraTouchId === null) {
        this.cameraTouchId = t.identifier;
        this.cameraPrevX = t.clientX;
        this.cameraPrevY = t.clientY;
        this.cameraWasDrag = false;
      }
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.joystickTouchId) {
        this.moveJoystick(t.clientX, t.clientY);
      } else if (t.identifier === this.cameraTouchId) {
        this.moveCamera(t.clientX, t.clientY);
      }
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.joystickTouchId) {
        this.endJoystick();
        this.joystickTouchId = null;
      } else if (t.identifier === this.cameraTouchId) {
        if (!this.cameraWasDrag && this.onTap) {
          this.onTap(new THREE.Vector2(t.clientX, t.clientY));
        }
        this.cameraTouchId = null;
      }
    }
  };

  // ── Joystick ──

  private startJoystick(x: number, y: number): void {
    this.joystickStart.set(x, y);
    this._drag.active = true;
    this._drag.magnitude = 0;
    this._drag.direction.set(0, 0);
    this.joystickKnob.style.transform = "translate(-50%,-50%)";
  }

  private moveJoystick(x: number, y: number): void {
    const dx = x - this.joystickStart.x;
    const dy = y - this.joystickStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const clamped = Math.min(dist, this.maxRadius);
    this._drag.magnitude = clamped / this.maxRadius; // 0-1

    if (dist > 0.001) {
      this._drag.direction.set(dx / dist, dy / dist);
    }

    // Move joystick knob
    const knobX = (dx / Math.max(dist, 0.001)) * clamped;
    const knobY = (dy / Math.max(dist, 0.001)) * clamped;
    this.joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    this.joystickKnob.style.background =
      this._drag.magnitude > 0.7 ? "rgba(231,76,60,0.5)" : "rgba(255,255,255,0.35)";
  }

  private endJoystick(): void {
    this._drag.active = false;
    this._drag.magnitude = 0;
    this._drag.direction.set(0, 0);
    this.joystickKnob.style.transform = "translate(-50%,-50%)";
    this.joystickKnob.style.background = "rgba(255,255,255,0.35)";
  }

  // ── Camera ──

  private moveCamera(x: number, y: number): void {
    const dx = x - this.cameraPrevX;
    const dy = y - this.cameraPrevY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.cameraWasDrag = true;
    this._cameraYaw += dx * 0.005;
    this._cameraPitch = Math.max(
      this.PITCH_MIN,
      Math.min(this.PITCH_MAX, this._cameraPitch - dy * 0.004),
    );
    this.cameraPrevX = x;
    this.cameraPrevY = y;
  }

  // ── Mouse fallback ──

  private mouseDragType: "joystick" | "camera" | null = null;

  private onMouseDown = (e: MouseEvent) => {
    if (this.isInJoystickZone(e.clientX, e.clientY)) {
      this.mouseDragType = "joystick";
      this.startJoystick(e.clientX, e.clientY);
    } else {
      this.mouseDragType = "camera";
      this.cameraPrevX = e.clientX;
      this.cameraPrevY = e.clientY;
      this.cameraWasDrag = false;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.mouseDragType === "joystick") {
      this.moveJoystick(e.clientX, e.clientY);
    } else if (this.mouseDragType === "camera") {
      this.moveCamera(e.clientX, e.clientY);
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (this.mouseDragType === "joystick") {
      this.endJoystick();
    } else if (this.mouseDragType === "camera") {
      if (!this.cameraWasDrag && this.onTap) {
        this.onTap(new THREE.Vector2(e.clientX, e.clientY));
      }
    }
    this.mouseDragType = null;
  };
}
