import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

function mat(scene: Scene, r: number, g: number, b: number): StandardMaterial {
  const m = new StandardMaterial("m" + Math.random().toString(36).slice(2), scene);
  m.diffuseColor = new Color3(r, g, b);
  return m;
}

export class AssetFactory {
  /** Box-style humanoid character */
  static createCharacter(scene: Scene, color: Color3): TransformNode {
    const root = new TransformNode("character", scene);

    const bodyMat = mat(scene, color.r, color.g, color.b);
    const skinMat = mat(scene, 1, 0.8, 0.6);
    const legMat = mat(scene, 0.27, 0.27, 0.4);

    const body = CreateBox("body", { width: 0.5, height: 0.7, depth: 0.3 }, scene);
    body.material = bodyMat;
    body.position.y = 0.75;
    body.parent = root;

    const head = CreateBox("head", { width: 0.35, height: 0.35, depth: 0.35 }, scene);
    head.material = skinMat;
    head.position.y = 1.3;
    head.parent = root;

    const eyeMat = mat(scene, 0.13, 0.13, 0.13);
    const leftEye = CreateSphere("leye", { diameter: 0.08, segments: 8 }, scene);
    leftEye.material = eyeMat;
    leftEye.position.set(-0.08, 1.35, 0.18);
    leftEye.parent = root;
    const rightEye = CreateSphere("reye", { diameter: 0.08, segments: 8 }, scene);
    rightEye.material = eyeMat;
    rightEye.position.set(0.08, 1.35, 0.18);
    rightEye.parent = root;

    const leftLeg = CreateBox("lleg", { width: 0.15, height: 0.4, depth: 0.2 }, scene);
    leftLeg.material = legMat;
    leftLeg.position.set(-0.13, 0.2, 0);
    leftLeg.parent = root;
    const rightLeg = CreateBox("rleg", { width: 0.15, height: 0.4, depth: 0.2 }, scene);
    rightLeg.material = legMat;
    rightLeg.position.set(0.13, 0.2, 0);
    rightLeg.parent = root;

    const leftArm = CreateBox("larm", { width: 0.12, height: 0.5, depth: 0.15 }, scene);
    leftArm.material = bodyMat;
    leftArm.position.set(-0.37, 0.75, 0);
    leftArm.parent = root;
    const rightArm = CreateBox("rarm", { width: 0.12, height: 0.5, depth: 0.15 }, scene);
    rightArm.material = bodyMat;
    rightArm.position.set(0.37, 0.75, 0);
    rightArm.parent = root;

    return root;
  }

  /** Hollow house with interior – returns door pivot for interaction */
  static createHouse(scene: Scene, w: number, h: number, d: number, wallColor: Color3, roofColor: Color3): { root: TransformNode; doorPivot: TransformNode } {
    const root = new TransformNode("house", scene);
    const t = 0.15;        // wall thickness
    const doorW = 1.2;     // wide enough for player ellipsoid (0.8 diameter)
    const doorH = 1.8;

    const wallMat = mat(scene, wallColor.r, wallColor.g, wallColor.b);
    const roofMat = mat(scene, roofColor.r, roofColor.g, roofColor.b);

    // helper: create a wall segment with shadow + collision
    const wall = (name: string, bw: number, bh: number, bd: number, x: number, y: number, z: number) => {
      const m = CreateBox(name, { width: bw, height: bh, depth: bd }, scene);
      m.material = wallMat; m.position.set(x, y, z);
      m.parent = root; m.receiveShadows = true; m.checkCollisions = true;
      return m;
    };

    // ── Outer walls (hollow) ──
    wall("bWall", w, h, t, 0, h / 2, -d / 2 + t / 2);                       // back
    wall("lWall", t, h, d, -w / 2 + t / 2, h / 2, 0);                       // left
    wall("rWall", t, h, d, w / 2 - t / 2, h / 2, 0);                        // right

    // front wall – two sections flanking the door opening + lintel above
    const sideW = (w - doorW) / 2;
    wall("fWallL", sideW, h, t, -(doorW + sideW) / 2, h / 2, d / 2 - t / 2);
    wall("fWallR", sideW, h, t, (doorW + sideW) / 2, h / 2, d / 2 - t / 2);
    const lintelH = h - doorH;
    if (lintelH > 0) {
      wall("lintel", doorW, lintelH, t, 0, doorH + lintelH / 2, d / 2 - t / 2);
    }

    // ── Roof (same stepped style) ──
    const roofB = CreateBox("roof", { width: w + 0.6, height: 0.3, depth: d + 0.6 }, scene);
    roofB.material = roofMat; roofB.position.y = h + 0.15; roofB.parent = root;

    const peak = CreateBox("peak", { width: w * 0.7, height: 0.3, depth: d * 0.7 }, scene);
    peak.material = roofMat; peak.position.y = h + 0.45; peak.parent = root;

    const tip = CreateBox("tip", { width: w * 0.35, height: 0.25, depth: d * 0.35 }, scene);
    tip.material = roofMat; tip.position.y = h + 0.7; tip.parent = root;

    // ── Door with pivot + collision (blocks entry when closed) ──
    const doorMat = mat(scene, 0.35, 0.22, 0.1);
    const doorPivot = new TransformNode("doorPivot", scene);
    doorPivot.position.set(-doorW / 2, 0, d / 2 - t / 2);
    doorPivot.parent = root;

    const doorMesh = CreateBox("door", { width: doorW, height: doorH, depth: 0.08 }, scene);
    doorMesh.material = doorMat;
    doorMesh.position.set(doorW / 2, doorH / 2, 0);
    doorMesh.parent = doorPivot;
    doorMesh.checkCollisions = true;

    // door handle
    const handleMat = mat(scene, 0.75, 0.7, 0.3);
    const handle = CreateBox("handle", { width: 0.06, height: 0.06, depth: 0.08 }, scene);
    handle.material = handleMat;
    handle.position.set(doorW * 0.35, doorH * 0.45, 0.06);
    handle.parent = doorPivot;

    // ── Windows ──
    const winMat = mat(scene, 0.6, 0.8, 1.0);

    // front windows (only if wall sections wide enough)
    if (sideW > 0.7) {
      [-(doorW + sideW) / 2, (doorW + sideW) / 2].forEach((wx, i) => {
        const fw = CreateBox(`fWin${i}`, { width: 0.5, height: 0.5, depth: 0.05 }, scene);
        fw.material = winMat; fw.position.set(wx, h * 0.6, d / 2 + 0.03); fw.parent = root;
      });
    }

    // side windows (visible from outside & inside)
    [[-w / 2 - 0.03, 0.05, 0.5], [w / 2 + 0.03, 0.05, 0.5]].forEach(([wx, ww, wd], i) => {
      const sw = CreateBox(`sWin${i}`, { width: ww, height: 0.5, depth: wd }, scene);
      sw.material = winMat; sw.position.set(wx, h * 0.55, 0); sw.parent = root;
    });

    // back windows
    [-w / 4, w / 4].forEach((wx, i) => {
      const bw = CreateBox(`bWin${i}`, { width: 0.5, height: 0.5, depth: 0.05 }, scene);
      bw.material = winMat; bw.position.set(wx, h * 0.6, -d / 2 - 0.03); bw.parent = root;
    });

    // ── Interior ──
    const iw = w - t * 2;   // interior width
    const id = d - t * 2;   // interior depth

    // floor (wood)
    const floorMat = mat(scene, 0.6, 0.45, 0.25);
    const fl = CreateBox("iFloor", { width: iw, height: 0.05, depth: id }, scene);
    fl.material = floorMat; fl.position.set(0, 0.025, 0); fl.parent = root;

    // ceiling
    const ceilMat = mat(scene, 0.92, 0.9, 0.85);
    const ceil = CreateBox("ceil", { width: iw, height: 0.05, depth: id }, scene);
    ceil.material = ceilMat; ceil.position.set(0, h - 0.025, 0); ceil.parent = root;

    // rug under table
    const rugMat = mat(scene, 0.55, 0.2, 0.18);
    const rug = CreateBox("rug", { width: Math.min(1.8, iw * 0.45), height: 0.01, depth: Math.min(1.4, id * 0.35) }, scene);
    rug.material = rugMat; rug.position.set(0, 0.06, 0); rug.parent = root;

    // table
    const tblMat = mat(scene, 0.55, 0.38, 0.18);
    const tblW = Math.min(1.0, iw * 0.25);
    const tblD = Math.min(0.6, id * 0.18);
    const tblTop = CreateBox("tblTop", { width: tblW, height: 0.04, depth: tblD }, scene);
    tblTop.material = tblMat; tblTop.position.set(0, 0.65, 0); tblTop.parent = root;

    const lx = tblW / 2 - 0.04, lz = tblD / 2 - 0.04;
    [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([px, pz], i) => {
      const leg = CreateBox(`tl${i}`, { width: 0.04, height: 0.63, depth: 0.04 }, scene);
      leg.material = tblMat; leg.position.set(px, 0.315, pz); leg.parent = root;
    });

    // bookshelf against back wall
    const shelfMat = mat(scene, 0.45, 0.3, 0.15);
    const shW = Math.min(iw * 0.35, 1.5);
    const shH = Math.min(h * 0.45, 1.3);
    const shelf = CreateBox("shelf", { width: shW, height: shH, depth: 0.3 }, scene);
    shelf.material = shelfMat;
    shelf.position.set(iw * 0.18, shH / 2, -d / 2 + t + 0.15);
    shelf.parent = root; shelf.checkCollisions = true;

    // books on shelf
    const bookCols: [number, number, number][] = [[0.7, 0.2, 0.2], [0.2, 0.5, 0.7], [0.6, 0.6, 0.2], [0.3, 0.6, 0.3]];
    const bkW = shW / (bookCols.length + 1);
    bookCols.forEach(([r, g, b], i) => {
      const bk = CreateBox(`bk${i}`, { width: bkW * 0.8, height: shH * 0.22, depth: 0.18 }, scene);
      bk.material = mat(scene, r, g, b);
      bk.position.set(iw * 0.18 - shW / 2 + bkW * (i + 0.5) + bkW * 0.1, shH * 0.65, -d / 2 + t + 0.15);
      bk.parent = root;
    });

    // small cabinet on left side
    const cabMat = mat(scene, 0.5, 0.35, 0.2);
    const cab = CreateBox("cab", { width: 0.5, height: 0.6, depth: 0.4 }, scene);
    cab.material = cabMat;
    cab.position.set(-iw / 2 + 0.35, 0.3, -id / 2 + 0.3);
    cab.parent = root; cab.checkCollisions = true;

    return { root, doorPivot };
  }

  /** Tall building / apartment – hollow interior with elevator + exterior fire escape */
  static createBuilding(scene: Scene, w: number, h: number, d: number, color: Color3): { root: TransformNode; doorPivot: TransformNode } {
    const root = new TransformNode("building", scene);
    const t = 0.2; // wall thickness
    const doorW = 1.4;
    const doorH = 2.2;
    const floorH = 2.8; // per-floor height
    const numFloors = Math.max(1, Math.floor(h / floorH));

    const wallMat = mat(scene, color.r, color.g, color.b);
    const darkMat = mat(scene, color.r * 0.7, color.g * 0.7, color.b * 0.7);
    const winMat = mat(scene, 0.7, 0.85, 1.0);
    const floorMat = mat(scene, 0.45, 0.43, 0.4);
    const metalMat = mat(scene, 0.4, 0.4, 0.45);
    const elevMat = mat(scene, 0.55, 0.55, 0.6);
    const railMat = mat(scene, 0.35, 0.35, 0.38);

    // ── Outer walls (hollow shell) ──
    // Back wall (solid)
    const bWall = CreateBox("bWall", { width: w, height: h, depth: t }, scene);
    bWall.material = wallMat; bWall.position.set(0, h / 2, -d / 2 + t / 2);
    bWall.parent = root; bWall.checkCollisions = true; bWall.receiveShadows = true;

    // Left wall
    const lWall = CreateBox("lWall", { width: t, height: h, depth: d }, scene);
    lWall.material = wallMat; lWall.position.set(-w / 2 + t / 2, h / 2, 0);
    lWall.parent = root; lWall.checkCollisions = true; lWall.receiveShadows = true;

    // Right wall
    const rWall = CreateBox("rWall", { width: t, height: h, depth: d }, scene);
    rWall.material = wallMat; rWall.position.set(w / 2 - t / 2, h / 2, 0);
    rWall.parent = root; rWall.checkCollisions = true; rWall.receiveShadows = true;

    // Front wall – split around door
    const sideW = (w - doorW) / 2;
    const fwL = CreateBox("fwL", { width: sideW, height: h, depth: t }, scene);
    fwL.material = wallMat; fwL.position.set(-(doorW + sideW) / 2, h / 2, d / 2 - t / 2);
    fwL.parent = root; fwL.checkCollisions = true; fwL.receiveShadows = true;

    const fwR = CreateBox("fwR", { width: sideW, height: h, depth: t }, scene);
    fwR.material = wallMat; fwR.position.set((doorW + sideW) / 2, h / 2, d / 2 - t / 2);
    fwR.parent = root; fwR.checkCollisions = true; fwR.receiveShadows = true;

    const lintelH = h - doorH;
    if (lintelH > 0) {
      const lintel = CreateBox("lintel", { width: doorW, height: lintelH, depth: t }, scene);
      lintel.material = wallMat; lintel.position.set(0, doorH + lintelH / 2, d / 2 - t / 2);
      lintel.parent = root; lintel.checkCollisions = true;
    }

    // ── Front door with pivot ──
    const doorMat = mat(scene, 0.3, 0.25, 0.18);
    const doorPivot = new TransformNode("doorPivot", scene);
    doorPivot.position.set(-doorW / 2, 0, d / 2 - t / 2);
    doorPivot.parent = root;

    const doorMesh = CreateBox("door", { width: doorW, height: doorH, depth: 0.08 }, scene);
    doorMesh.material = doorMat; doorMesh.position.set(doorW / 2, doorH / 2, 0);
    doorMesh.parent = doorPivot; doorMesh.checkCollisions = true;

    const handleMat = mat(scene, 0.75, 0.7, 0.3);
    const handle = CreateBox("handle", { width: 0.08, height: 0.08, depth: 0.1 }, scene);
    handle.material = handleMat; handle.position.set(doorW * 0.35, doorH * 0.45, 0.06);
    handle.parent = doorPivot;

    // ── Floor slabs per level ──
    for (let f = 0; f <= numFloors; f++) {
      const flY = f * floorH;
      if (flY > h) break;
      const fl = CreateBox(`floor${f}`, { width: w - t * 2, height: 0.1, depth: d - t * 2 }, scene);
      fl.material = floorMat; fl.position.set(0, flY + 0.05, 0);
      fl.parent = root; fl.checkCollisions = true;
    }

    // Ceiling
    const ceil = CreateBox("ceil", { width: w - t * 2, height: 0.1, depth: d - t * 2 }, scene);
    ceil.material = floorMat; ceil.position.set(0, h - 0.05, 0); ceil.parent = root;

    // ── Windows (exterior decoration) ──
    const cols = Math.max(1, Math.floor(w / 2));
    for (let fl = 0; fl < numFloors; fl++) {
      for (let col = 0; col < cols; col++) {
        const winX = -((cols - 1) * 1.5) / 2 + col * 1.5;
        const winY = fl * floorH + floorH * 0.55;
        if (winY > h - 1) continue;

        const wf = CreateBox(`wf${fl}_${col}`, { width: 0.6, height: 0.8, depth: 0.05 }, scene);
        wf.material = winMat; wf.position.set(winX, winY, d / 2 + 0.03); wf.parent = root;

        const wb = CreateBox(`wb${fl}_${col}`, { width: 0.6, height: 0.8, depth: 0.05 }, scene);
        wb.material = winMat; wb.position.set(winX, winY, -d / 2 - 0.03); wb.parent = root;
      }
    }

    // ── Interior: Elevator shaft (back-left corner) ──
    const shaftW = 1.8;
    const shaftD = 1.8;
    const shaftX = -w / 2 + t + shaftW / 2 + 0.3;
    const shaftZ = -d / 2 + t + shaftD / 2 + 0.3;

    // Elevator shaft walls (partial - open front)
    const shaftWallL = CreateBox("shaftWL", { width: 0.1, height: h, depth: shaftD }, scene);
    shaftWallL.material = elevMat; shaftWallL.position.set(shaftX - shaftW / 2, h / 2, shaftZ);
    shaftWallL.parent = root; shaftWallL.checkCollisions = true;

    const shaftWallR = CreateBox("shaftWR", { width: 0.1, height: h, depth: shaftD }, scene);
    shaftWallR.material = elevMat; shaftWallR.position.set(shaftX + shaftW / 2, h / 2, shaftZ);
    shaftWallR.parent = root; shaftWallR.checkCollisions = true;

    const shaftWallB = CreateBox("shaftWB", { width: shaftW, height: h, depth: 0.1 }, scene);
    shaftWallB.material = elevMat; shaftWallB.position.set(shaftX, h / 2, shaftZ - shaftD / 2);
    shaftWallB.parent = root; shaftWallB.checkCollisions = true;

    // Elevator platform (moves between floors conceptually – static for now at ground)
    const elevPlatform = CreateBox("elevPlat", { width: shaftW - 0.2, height: 0.15, depth: shaftD - 0.2 }, scene);
    elevPlatform.material = metalMat; elevPlatform.position.set(shaftX, 0.08, shaftZ);
    elevPlatform.parent = root; elevPlatform.checkCollisions = true;

    // Floor indicator buttons at each level (decorative)
    for (let f = 0; f < numFloors; f++) {
      const btnY = f * floorH + 1.2;
      const btn = CreateBox(`elevBtn${f}`, { width: 0.15, height: 0.15, depth: 0.05 }, scene);
      btn.material = mat(scene, 0.9, 0.8, 0.2);
      btn.position.set(shaftX + shaftW / 2 + 0.08, btnY, shaftZ + shaftD / 2 - 0.3);
      btn.parent = root;
    }

    // ── Exterior: Fire escape stairs (right side) ──
    const stairW = 1.6;
    const stairD = 2.5;
    const stairX = w / 2 + stairW / 2 + 0.1;
    const stairZ = 0;
    const stepsPerFloor = 10;

    for (let f = 0; f < numFloors; f++) {
      const baseY = f * floorH;

      // Landing platform at each floor level
      const landing = CreateBox(`landing${f}`, { width: stairW, height: 0.12, depth: stairD * 0.4 }, scene);
      landing.material = metalMat;
      landing.position.set(stairX, baseY + 0.06, stairZ - stairD * 0.3);
      landing.parent = root; landing.checkCollisions = true; landing.receiveShadows = true;

      // Steps going up to next floor
      const stepH = floorH / stepsPerFloor;
      const stepD = (stairD * 0.6) / stepsPerFloor;
      for (let s = 0; s < stepsPerFloor; s++) {
        const step = CreateBox(`step${f}_${s}`, { width: stairW * 0.9, height: 0.08, depth: stepD * 0.9 }, scene);
        step.material = metalMat;
        const sy = baseY + stepH * (s + 1);
        // Alternate direction each floor
        const sz = (f % 2 === 0)
          ? stairZ - stairD * 0.3 + stairD * 0.4 * 0.5 + stepD * s
          : stairZ + stairD * 0.3 - stairD * 0.4 * 0.5 - stepD * s;
        step.position.set(stairX, sy, sz);
        step.parent = root; step.checkCollisions = true;
      }

      // Railing (outer side)
      const railOuter = CreateBox(`railO${f}`, { width: 0.06, height: floorH, depth: stairD }, scene);
      railOuter.material = railMat;
      railOuter.position.set(stairX + stairW / 2, baseY + floorH / 2, stairZ);
      railOuter.parent = root; railOuter.checkCollisions = true;

      // Railing (inner side – along building wall)
      const railInner = CreateBox(`railI${f}`, { width: 0.06, height: floorH, depth: stairD }, scene);
      railInner.material = railMat;
      railInner.position.set(stairX - stairW / 2, baseY + floorH / 2, stairZ);
      railInner.parent = root;
    }

    // Top landing
    const topLanding = CreateBox("topLand", { width: stairW, height: 0.12, depth: stairD * 0.4 }, scene);
    topLanding.material = metalMat;
    topLanding.position.set(stairX, numFloors * floorH + 0.06, stairZ - stairD * 0.3);
    topLanding.parent = root; topLanding.checkCollisions = true;

    // Support columns for stairs
    for (let i = 0; i < numFloors + 1; i++) {
      const col = CreateCylinder(`stairCol${i}`, { height: h, diameter: 0.12, tessellation: 8 }, scene);
      col.material = railMat;
      col.position.set(stairX + stairW / 2, h / 2, stairZ + (i % 2 === 0 ? -1 : 1) * stairD / 2);
      col.parent = root; col.checkCollisions = true;
    }

    // Flat roof edge
    const edge = CreateBox("edge", { width: w + 0.2, height: 0.3, depth: d + 0.2 }, scene);
    edge.material = darkMat; edge.position.y = h + 0.15; edge.parent = root;

    return { root, doorPivot };
  }

  /** Convenience store / shop */
  static createShop(scene: Scene): TransformNode {
    const root = new TransformNode("shop", scene);

    const wallMat = mat(scene, 0.95, 0.95, 0.9);
    const walls = CreateBox("walls", { width: 6, height: 3, depth: 5 }, scene);
    walls.material = wallMat;
    walls.position.y = 1.5;
    walls.parent = root;
    walls.receiveShadows = true;
    walls.checkCollisions = true;

    // Signboard
    const signMat = mat(scene, 0.1, 0.4, 0.8);
    const sign = CreateBox("sign", { width: 6.2, height: 0.8, depth: 0.1 }, scene);
    sign.material = signMat;
    sign.position.set(0, 3.4, 2.55);
    sign.parent = root;

    // Glass front
    const glassMat = mat(scene, 0.6, 0.85, 0.95);
    glassMat.alpha = 0.5;
    const glass = CreateBox("glass", { width: 4, height: 2.2, depth: 0.05 }, scene);
    glass.material = glassMat;
    glass.position.set(0, 1.4, 2.53);
    glass.parent = root;

    // Flat roof
    const roofMat = mat(scene, 0.7, 0.7, 0.7);
    const roof = CreateBox("roof", { width: 6.4, height: 0.15, depth: 5.4 }, scene);
    roof.material = roofMat;
    roof.position.y = 3.08;
    roof.parent = root;

    return root;
  }

  /** Tree */
  static createTree(scene: Scene): TransformNode {
    const root = new TransformNode("tree", scene);

    const trunkMat = mat(scene, 0.55, 0.41, 0.08);
    const trunk = CreateCylinder("trunk", { height: 1.5, diameterTop: 0.15, diameterBottom: 0.25, tessellation: 8 }, scene);
    trunk.material = trunkMat;
    trunk.position.y = 0.75;
    trunk.parent = root;
    trunk.checkCollisions = true;

    const foliageMat = mat(scene, 0.18, 0.55, 0.27);
    const foliage = CreateSphere("foliage", { diameter: 1.8, segments: 8 }, scene);
    foliage.material = foliageMat;
    foliage.position.y = 2.2;
    foliage.parent = root;

    return root;
  }

  /** Street lamp */
  static createStreetLamp(scene: Scene): TransformNode {
    const root = new TransformNode("lamp", scene);

    const poleMat = mat(scene, 0.3, 0.3, 0.3);
    const pole = CreateCylinder("pole", { height: 4, diameter: 0.12, tessellation: 8 }, scene);
    pole.material = poleMat;
    pole.position.y = 2;
    pole.parent = root;
    pole.checkCollisions = true;

    const arm = CreateBox("arm", { width: 1, height: 0.08, depth: 0.08 }, scene);
    arm.material = poleMat;
    arm.position.set(0.5, 4, 0);
    arm.parent = root;

    const lampMat = mat(scene, 1, 0.95, 0.7);
    const lampHead = CreateBox("lamphead", { width: 0.5, height: 0.15, depth: 0.3 }, scene);
    lampHead.material = lampMat;
    lampHead.position.set(1, 3.9, 0);
    lampHead.parent = root;

    return root;
  }

  /** Bench */
  static createBench(scene: Scene): TransformNode {
    const root = new TransformNode("bench", scene);
    const woodMat = mat(scene, 0.55, 0.35, 0.15);
    const metalMat = mat(scene, 0.3, 0.3, 0.3);

    const seat = CreateBox("seat", { width: 1.5, height: 0.08, depth: 0.4 }, scene);
    seat.material = woodMat;
    seat.position.y = 0.45;
    seat.parent = root;

    const back = CreateBox("back", { width: 1.5, height: 0.5, depth: 0.06 }, scene);
    back.material = woodMat;
    back.position.set(0, 0.7, -0.17);
    back.parent = root;

    const leg1 = CreateBox("l1", { width: 0.06, height: 0.45, depth: 0.3 }, scene);
    leg1.material = metalMat;
    leg1.position.set(-0.6, 0.225, 0);
    leg1.parent = root;

    const leg2 = CreateBox("l2", { width: 0.06, height: 0.45, depth: 0.3 }, scene);
    leg2.material = metalMat;
    leg2.position.set(0.6, 0.225, 0);
    leg2.parent = root;

    return root;
  }

  /** Fence segment */
  static createFence(scene: Scene, length: number): Mesh {
    const fenceMat = mat(scene, 0.6, 0.45, 0.25);
    const fence = CreateBox("fence", { width: length, height: 1.0, depth: 0.1 }, scene);
    fence.material = fenceMat;
    fence.position.y = 0.5;
    fence.checkCollisions = true;
    return fence;
  }

  /** Road surface */
  static createRoad(scene: Scene, w: number, d: number): Mesh {
    const roadMat = mat(scene, 0.25, 0.25, 0.28);
    const road = CreateBox("road", { width: w, height: 0.02, depth: d }, scene);
    road.material = roadMat;
    road.position.y = 0.01;
    return road;
  }
}
