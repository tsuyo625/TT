import * as THREE from "three";
import * as CANNON from "cannon-es";

export class Ground {
  readonly mesh: THREE.Mesh;
  readonly body: CANNON.Body;

  constructor(size = 60) {
    // Visual
    const geo = new THREE.PlaneGeometry(size, size, size, size);
    const mat = new THREE.MeshLambertMaterial({ color: 0x5a8f3c });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;

    // Grid lines for visual reference
    const gridHelper = new THREE.GridHelper(size, size, 0x4a7f2c, 0x4a7f2c);
    gridHelper.position.y = 0.01;
    this.mesh.add(gridHelper);

    // Physics
    this.body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  }
}
