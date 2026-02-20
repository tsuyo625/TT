export interface DragState {
  dirX: number;
  dirY: number;
  magnitude: number;
  active: boolean;
}

export interface CameraDelta {
  dx: number;
  dy: number;
}

const JOYSTICK_ZONE_RATIO = 0.38; // left 38% / bottom 38% of screen = joystick zone

export class InputManager {
  // Movement joystick
  private _drag: DragState = { dirX: 0, dirY: 0, magnitude: 0, active: false };
  private readonly maxRadius: number;

  // Camera
  private _cameraDelta: CameraDelta = { dx: 0, dy: 0 };

  // Touch tracking (multi-touch: joystick + camera simultaneously)
  private joystickTouchId: number | null = null;
  private cameraTouchId: number | null = null;
  private cameraPrevX = 0;
  private cameraPrevY = 0;

  // Mouse
  private mouseJoystick = false;
  private mouseCamera = false;
  private mousePrevX = 0;
  private mousePrevY = 0;

  onTap: (() => void) | null = null;
  private wasDrag = false;

  // Joystick UI (fixed bottom-left)
  private joystickBase: HTMLDivElement;
  private joystickKnob: HTMLDivElement;
  private joystickCenterX = 0;
  private joystickCenterY = 0;

  get drag(): Readonly<DragState> { return this._drag; }
  get cameraDelta(): Readonly<CameraDelta> { return this._cameraDelta; }

  constructor(element: HTMLElement, maxRadius = 60) {
    this.maxRadius = maxRadius;

    // Fixed joystick base - bottom left
    this.joystickBase = document.createElement("div");
    this.joystickBase.style.cssText =
      "position:fixed;width:120px;height:120px;border-radius:50%;" +
      "background:rgba(255,255,255,0.06);border:2px solid rgba(255,255,255,0.15);" +
      "pointer-events:none;z-index:20;left:24px;bottom:24px;" +
      "transform:none;display:block;";
    this.joystickKnob = document.createElement("div");
    this.joystickKnob.style.cssText =
      "position:absolute;width:48px;height:48px;border-radius:50%;" +
      "background:rgba(255,255,255,0.3);left:50%;top:50%;" +
      "transform:translate(-50%,-50%);transition:background 0.1s;";
    this.joystickBase.appendChild(this.joystickKnob);
    document.body.appendChild(this.joystickBase);

    this.updateJoystickCenter();
    window.addEventListener("resize", () => this.updateJoystickCenter());

    element.addEventListener("touchstart", this.onTouchStart, { passive: false });
    element.addEventListener("touchmove", this.onTouchMove, { passive: false });
    element.addEventListener("touchend", this.onTouchEnd, { passive: false });
    element.addEventListener("touchcancel", this.onTouchEnd, { passive: false });
    element.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);

    // Prevent right-click menu for camera drag
    element.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private updateJoystickCenter(): void {
    // Center of the fixed joystick base
    this.joystickCenterX = 24 + 60; // left + half width
    this.joystickCenterY = window.innerHeight - 24 - 60; // bottom + half height
  }

  /** Check if screen position is in the joystick zone */
  private isJoystickZone(x: number, y: number): boolean {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return x < w * JOYSTICK_ZONE_RATIO && y > h * (1 - JOYSTICK_ZONE_RATIO);
  }

  // ── Touch handlers ──

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (this.isJoystickZone(t.clientX, t.clientY) && this.joystickTouchId === null) {
        this.joystickTouchId = t.identifier;
        this.wasDrag = false;
        this.startJoystick();
      } else if (this.cameraTouchId === null) {
        this.cameraTouchId = t.identifier;
        this.cameraPrevX = t.clientX;
        this.cameraPrevY = t.clientY;
      }
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    this._cameraDelta.dx = 0;
    this._cameraDelta.dy = 0;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.joystickTouchId) {
        this.moveJoystick(t.clientX, t.clientY);
      } else if (t.identifier === this.cameraTouchId) {
        this._cameraDelta.dx = t.clientX - this.cameraPrevX;
        this._cameraDelta.dy = t.clientY - this.cameraPrevY;
        this.cameraPrevX = t.clientX;
        this.cameraPrevY = t.clientY;
      }
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.endJoystick();
      } else if (t.identifier === this.cameraTouchId) {
        this.cameraTouchId = null;
        this._cameraDelta.dx = 0;
        this._cameraDelta.dy = 0;
      }
    }
  };

  // ── Mouse handlers (left=joystick in zone, right=camera anywhere) ──

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 2 || (e.button === 0 && !this.isJoystickZone(e.clientX, e.clientY))) {
      // Right click or left click outside joystick zone → camera
      this.mouseCamera = true;
      this.mousePrevX = e.clientX;
      this.mousePrevY = e.clientY;
    } else if (e.button === 0 && this.isJoystickZone(e.clientX, e.clientY)) {
      // Left click in joystick zone → joystick
      this.mouseJoystick = true;
      this.wasDrag = false;
      this.startJoystick();
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    this._cameraDelta.dx = 0;
    this._cameraDelta.dy = 0;

    if (this.mouseJoystick) {
      this.moveJoystick(e.clientX, e.clientY);
    }
    if (this.mouseCamera) {
      this._cameraDelta.dx = e.clientX - this.mousePrevX;
      this._cameraDelta.dy = e.clientY - this.mousePrevY;
      this.mousePrevX = e.clientX;
      this.mousePrevY = e.clientY;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0 && this.mouseJoystick) {
      this.mouseJoystick = false;
      this.endJoystick();
    }
    if ((e.button === 2 || e.button === 0) && this.mouseCamera) {
      this.mouseCamera = false;
      this._cameraDelta.dx = 0;
      this._cameraDelta.dy = 0;
    }
  };

  // ── Joystick logic (relative to fixed center) ──

  private startJoystick(): void {
    this._drag.active = true;
    this._drag.magnitude = 0;
    this._drag.dirX = 0;
    this._drag.dirY = 0;
    this.joystickKnob.style.transform = "translate(-50%,-50%)";
  }

  private moveJoystick(x: number, y: number): void {
    const dx = x - this.joystickCenterX;
    const dy = y - this.joystickCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) this.wasDrag = true;

    const clamped = Math.min(dist, this.maxRadius);
    this._drag.magnitude = clamped / this.maxRadius;

    if (dist > 0.001) {
      this._drag.dirX = dx / dist;
      this._drag.dirY = dy / dist;
    }

    const knobX = (dx / Math.max(dist, 0.001)) * clamped;
    const knobY = (dy / Math.max(dist, 0.001)) * clamped;
    this.joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    this.joystickKnob.style.background =
      this._drag.magnitude > 0.7 ? "rgba(231,76,60,0.5)" : "rgba(255,255,255,0.3)";
  }

  private endJoystick(): void {
    if (!this.wasDrag && this.onTap) {
      this.onTap();
    }
    this._drag.active = false;
    this._drag.magnitude = 0;
    this._drag.dirX = 0;
    this._drag.dirY = 0;
    this.joystickKnob.style.transform = "translate(-50%,-50%)";
    this.joystickKnob.style.background = "rgba(255,255,255,0.3)";
  }

  /** Call at end of each frame to reset per-frame camera delta */
  consumeCameraDelta(): CameraDelta {
    const d = { dx: this._cameraDelta.dx, dy: this._cameraDelta.dy };
    this._cameraDelta.dx = 0;
    this._cameraDelta.dy = 0;
    return d;
  }
}
