import * as THREE from "three";
import * as CANNON from "cannon-es";
import { AssetFactory } from "../core/AssetFactory";

export interface ObstacleData {
  type: "wall" | "tree" | "crate";
  x: number;
  z: number;
  width?: number;
  height?: number;
  depth?: number;
  rotation?: number;
}

export class Obstacle {
  readonly mesh: THREE.Object3D;
  readonly body: CANNON.Body;

  constructor(data: ObstacleData) {
    const w = data.width ?? 1;
    const h = data.height ?? 2;
    const d = data.depth ?? 1;

    switch (data.type) {
      case "wall":
        this.mesh = AssetFactory.createWall(w, h, d);
        break;
      case "tree":
        this.mesh = AssetFactory.createTree();
        break;
      case "crate":
        this.mesh = AssetFactory.createCrate();
        break;
    }

    this.mesh.position.set(data.x, 0, data.z);
    if (data.rotation) {
      this.mesh.rotation.y = data.rotation;
    }

    // Physics body
    let halfW: number, halfH: number, halfD: number;
    switch (data.type) {
      case "tree":
        halfW = 0.2; halfH = 1.5; halfD = 0.2;
        break;
      case "crate":
        halfW = 0.5; halfH = 0.5; halfD = 0.5;
        break;
      default:
        halfW = w / 2; halfH = h / 2; halfD = d / 2;
    }

    this.body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(halfW, halfH, halfD)),
      position: new CANNON.Vec3(data.x, halfH, data.z),
    });

    if (data.rotation) {
      this.body.quaternion.setFromEuler(0, data.rotation, 0);
    }
  }
}
