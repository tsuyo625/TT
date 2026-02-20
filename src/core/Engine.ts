import { Engine as BabylonEngine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";

// Side-effect imports for Babylon.js features
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/core/Collisions/collisionCoordinator";

export type ViewMode = "third" | "first";

export class Engine {
  readonly engine: BabylonEngine;
  readonly scene: Scene;
  readonly canvas: HTMLCanvasElement;
  readonly shadowGenerator: ShadowGenerator;

  // Cameras
  readonly thirdPersonCam: ArcRotateCamera;
  readonly firstPersonCam: UniversalCamera;
  private _viewMode: ViewMode = "third";

  private updateCallbacks: ((dt: number) => void)[] = [];

  get viewMode(): ViewMode { return this._viewMode; }

  get activeCamera(): ArcRotateCamera | UniversalCamera {
    return this._viewMode === "third" ? this.thirdPersonCam : this.firstPersonCam;
  }

  constructor(container: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.id = "renderCanvas";
    container.appendChild(this.canvas);

    this.engine = new BabylonEngine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.53, 0.81, 0.92, 1);
    this.scene.ambientColor = new Color3(0.3, 0.3, 0.3);
    this.scene.fogMode = Scene.FOGMODE_LINEAR;
    this.scene.fogColor = new Color3(0.53, 0.81, 0.92);
    this.scene.fogStart = 200;
    this.scene.fogEnd = 500;
    this.scene.collisionsEnabled = true;

    // Third-person camera (ArcRotate)
    this.thirdPersonCam = new ArcRotateCamera(
      "thirdCam",
      -Math.PI / 2,
      Math.PI / 3.5,
      18,
      Vector3.Zero(),
      this.scene
    );
    this.thirdPersonCam.lowerBetaLimit = 0.3;
    this.thirdPersonCam.upperBetaLimit = Math.PI / 2.5;
    this.thirdPersonCam.lowerRadiusLimit = 6;
    this.thirdPersonCam.upperRadiusLimit = 60;
    // Disable all built-in pointer inputs (we handle camera via InputManager)
    this.thirdPersonCam.inputs.clear();

    // First-person camera
    this.firstPersonCam = new UniversalCamera(
      "firstCam",
      new Vector3(0, 1.4, 0),
      this.scene
    );
    this.firstPersonCam.minZ = 0.1;
    this.firstPersonCam.fov = 1.2;
    // Disable all built-in inputs
    this.firstPersonCam.inputs.clear();

    // Start with third-person
    this.scene.activeCamera = this.thirdPersonCam;

    // Lighting
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.6;
    hemi.groundColor = new Color3(0.3, 0.35, 0.4);

    const sun = new DirectionalLight("sun", new Vector3(-1, -3, -1).normalize(), this.scene);
    sun.intensity = 0.8;
    sun.position = new Vector3(30, 50, 30);

    this.shadowGenerator = new ShadowGenerator(2048, sun);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;

    window.addEventListener("resize", () => this.engine.resize());
  }

  setViewMode(mode: ViewMode): void {
    this._viewMode = mode;
    this.scene.activeCamera = mode === "third" ? this.thirdPersonCam : this.firstPersonCam;
  }

  onUpdate(cb: (dt: number) => void): void {
    this.updateCallbacks.push(cb);
  }

  start(): void {
    this.engine.runRenderLoop(() => {
      const dt = this.engine.getDeltaTime() / 1000;
      const cappedDt = Math.min(dt, 1 / 30);

      for (const cb of this.updateCallbacks) {
        cb(cappedDt);
      }

      this.scene.render();
    });
  }

  dispose(): void {
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
    this.canvas.remove();
  }
}
