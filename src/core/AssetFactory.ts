import * as THREE from "three";

/** Generates 3D models programmatically (no external assets needed) */
export class AssetFactory {
  /** Box-style humanoid character */
  static createCharacter(color: number): THREE.Group {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.3;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 1.35, 0.18);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 1.35, 0.18);
    group.add(rightEye);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.15, 0.4, 0.2);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x444466 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.13, 0.2, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.13, 0.2, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.12, 0.5, 0.15);
    const armMat = new THREE.MeshLambertMaterial({ color });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.37, 0.75, 0);
    leftArm.castShadow = true;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.37, 0.75, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    return group;
  }

  /** Tin can object */
  static createCan(): THREE.Group {
    const group = new THREE.Group();

    const geo = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.7,
      roughness: 0.3,
    });
    const can = new THREE.Mesh(geo, mat);
    can.position.y = 0.2;
    can.castShadow = true;
    can.receiveShadow = true;
    group.add(can);

    // Label stripe
    const stripeGeo = new THREE.CylinderGeometry(0.153, 0.153, 0.15, 16);
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 0.2;
    group.add(stripe);

    return group;
  }

  /** Wall obstacle */
  static createWall(width: number, height: number, depth: number): THREE.Mesh {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
    const wall = new THREE.Mesh(geo, mat);
    wall.position.y = height / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  /** Tree obstacle */
  static createTree(): THREE.Group {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage
    const foliageGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x2d8b46 });
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.y = 2.0;
    foliage.castShadow = true;
    group.add(foliage);

    return group;
  }

  /** Crate obstacle */
  static createCrate(): THREE.Mesh {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xc4a35a });
    const crate = new THREE.Mesh(geo, mat);
    crate.position.y = 0.5;
    crate.castShadow = true;
    crate.receiveShadow = true;
    return crate;
  }
}
