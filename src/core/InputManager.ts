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
  private dragStart = new THREE.Vector2();
  private dragCurrent = new THREE.Vector2();
  private _drag: DragState = {
    direction: new THREE.Vector2(),
    magnitude: 0,
    active: false,
  };
  private readonly maxRadius: number;

  /** Callback fired on single-tap (not drag) */
  onTap: ((screenPos: THREE.Vector2) => void) | null = null;
  private wasDrag = false;

  // Virtual joystick visuals
  private joystickBase: HTMLDivElement;
  private joystickKnob: HTMLDivElement;

  get drag(): Readonly<DragState> {
    return this._drag;
  }

  constructor(element: HTMLElement, maxRadius = 80) {
    this.maxRadius = maxRadius;

    // Create joystick UI
    this.joystickBase = document.createElement("div");
    this.joystickBase.style.cssText =
      "position:fixed;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.2);pointer-events:none;z-index:20;display:none;transform:translate(-50%,-50%);";
    this.joystickKnob = document.createElement("div");
    this.joystickKnob.style.cssText =
      "position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.35);left:50%;top:50%;transform:translate(-50%,-50%);transition:background 0.1s;";
    this.joystickBase.appendChild(this.joystickKnob);
    document.body.appendChild(this.joystickBase);

    element.addEventListener("touchstart", this.onTouchStart, { passive: false });
    element.addEventListener("touchmove", this.onTouchMove, { passive: false });
    element.addEventListener("touchend", this.onTouchEnd, { passive: false });

    // Mouse fallback for browser testing
    element.addEventListener("mousedown", this.onMouseDown);
    element.addEventListener("mousemove", this.onMouseMove);
    element.addEventListener("mouseup", this.onMouseUp);
  }

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    this.startDrag(t.clientX, t.clientY);
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    this.moveDrag(t.clientX, t.clientY);
  };

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    this.endDrag();
  };

  private onMouseDown = (e: MouseEvent) => {
    this.startDrag(e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this._drag.active) this.moveDrag(e.clientX, e.clientY);
  };

  private onMouseUp = () => {
    this.endDrag();
  };

  private startDrag(x: number, y: number): void {
    this.dragStart.set(x, y);
    this.dragCurrent.set(x, y);
    this._drag.active = true;
    this._drag.magnitude = 0;
    this._drag.direction.set(0, 0);
    this.wasDrag = false;

    // Show joystick at touch point
    this.joystickBase.style.left = x + "px";
    this.joystickBase.style.top = y + "px";
    this.joystickBase.style.display = "block";
    this.joystickKnob.style.transform = "translate(-50%,-50%)";
  }

  private moveDrag(x: number, y: number): void {
    this.dragCurrent.set(x, y);
    const dx = this.dragCurrent.x - this.dragStart.x;
    const dy = this.dragCurrent.y - this.dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) this.wasDrag = true;

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

  private endDrag(): void {
    if (!this.wasDrag && this.onTap) {
      this.onTap(this.dragStart.clone());
    }
    this._drag.active = false;
    this._drag.magnitude = 0;
    this._drag.direction.set(0, 0);

    // Hide joystick
    this.joystickBase.style.display = "none";
  }
}
