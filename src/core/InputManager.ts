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

  get drag(): Readonly<DragState> {
    return this._drag;
  }

  constructor(element: HTMLElement, maxRadius = 80) {
    this.maxRadius = maxRadius;

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
  }

  private endDrag(): void {
    if (!this.wasDrag && this.onTap) {
      this.onTap(this.dragStart.clone());
    }
    this._drag.active = false;
    this._drag.magnitude = 0;
    this._drag.direction.set(0, 0);
  }
}
