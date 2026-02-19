import * as THREE from "three";
import * as CANNON from "cannon-es";

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly physicsWorld: CANNON.World;

  private clock = new THREE.Clock();
  private updateCallbacks: ((dt: number) => void)[] = [];

  constructor(container: HTMLElement) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 30, 80);

    // Camera (third-person overhead)
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 12, 10);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    this.scene.add(sun);

    // Physics
    this.physicsWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);

    // Resize
    window.addEventListener("resize", this.onResize);
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  onUpdate(cb: (dt: number) => void): void {
    this.updateCallbacks.push(cb);
  }

  removeUpdate(cb: (dt: number) => void): void {
    const idx = this.updateCallbacks.indexOf(cb);
    if (idx !== -1) this.updateCallbacks.splice(idx, 1);
  }

  start(): void {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = this.clock.getDelta();
      // Cap delta to avoid spiral of death
      const cappedDt = Math.min(dt, 1 / 30);

      this.physicsWorld.step(1 / 60, cappedDt, 10);

      for (const cb of this.updateCallbacks) {
        cb(cappedDt);
      }

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
  }
}
