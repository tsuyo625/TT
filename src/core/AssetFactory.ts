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
  /** Box-style humanoid character with joint pivots for animation */
  static createCharacter(scene: Scene, color: Color3): {
    root: TransformNode;
    leftShoulder: TransformNode; rightShoulder: TransformNode;
    leftHip: TransformNode; rightHip: TransformNode;
    headNode: TransformNode;
  } {
    const root = new TransformNode("character", scene);

    const bodyMat = mat(scene, color.r, color.g, color.b);
    const skinMat = mat(scene, 1, 0.8, 0.6);
    const legMat = mat(scene, 0.27, 0.27, 0.4);

    const body = CreateBox("body", { width: 0.5, height: 0.7, depth: 0.3 }, scene);
    body.material = bodyMat;
    body.position.y = 0.75;
    body.parent = root;

    // Head on a pivot for bobbing
    const headNode = new TransformNode("headJoint", scene);
    headNode.position.set(0, 1.3, 0);
    headNode.parent = root;

    const head = CreateBox("head", { width: 0.35, height: 0.35, depth: 0.35 }, scene);
    head.material = skinMat;
    head.position.set(0, 0, 0);
    head.parent = headNode;

    const eyeMat = mat(scene, 0.13, 0.13, 0.13);
    const leftEye = CreateSphere("leye", { diameter: 0.08, segments: 8 }, scene);
    leftEye.material = eyeMat;
    leftEye.position.set(-0.08, 0.05, 0.18);
    leftEye.parent = headNode;
    const rightEye = CreateSphere("reye", { diameter: 0.08, segments: 8 }, scene);
    rightEye.material = eyeMat;
    rightEye.position.set(0.08, 0.05, 0.18);
    rightEye.parent = headNode;

    // Shoulder joints (pivot at top of torso)
    const leftShoulder = new TransformNode("lShoulderJoint", scene);
    leftShoulder.position.set(-0.31, 1.0, 0);
    leftShoulder.parent = root;

    const leftArm = CreateBox("larm", { width: 0.12, height: 0.5, depth: 0.15 }, scene);
    leftArm.material = bodyMat;
    leftArm.position.set(-0.06, -0.25, 0); // offset down from joint
    leftArm.parent = leftShoulder;

    const rightShoulder = new TransformNode("rShoulderJoint", scene);
    rightShoulder.position.set(0.31, 1.0, 0);
    rightShoulder.parent = root;

    const rightArm = CreateBox("rarm", { width: 0.12, height: 0.5, depth: 0.15 }, scene);
    rightArm.material = bodyMat;
    rightArm.position.set(0.06, -0.25, 0);
    rightArm.parent = rightShoulder;

    // Hip joints (pivot at bottom of torso)
    const leftHip = new TransformNode("lHipJoint", scene);
    leftHip.position.set(-0.13, 0.4, 0);
    leftHip.parent = root;

    const leftLeg = CreateBox("lleg", { width: 0.15, height: 0.4, depth: 0.2 }, scene);
    leftLeg.material = legMat;
    leftLeg.position.set(0, -0.2, 0); // offset down from joint
    leftLeg.parent = leftHip;

    const rightHip = new TransformNode("rHipJoint", scene);
    rightHip.position.set(0.13, 0.4, 0);
    rightHip.parent = root;

    const rightLeg = CreateBox("rleg", { width: 0.15, height: 0.4, depth: 0.2 }, scene);
    rightLeg.material = legMat;
    rightLeg.position.set(0, -0.2, 0);
    rightLeg.parent = rightHip;

    return { root, leftShoulder, rightShoulder, leftHip, rightHip, headNode };
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

  /** Tall building / apartment – hollow interior with working elevator + exterior fire escape */
  static createBuilding(scene: Scene, w: number, h: number, d: number, color: Color3): {
    root: TransformNode; doorPivot: TransformNode; elevPlatform: Mesh;
    elevShaftX: number; elevShaftZ: number; floorH: number; numFloors: number;
  } {
    const root = new TransformNode("building", scene);
    const t = 0.2; // wall thickness
    const doorW = 1.4;
    const doorH = 2.2;
    const floorH = 2.8; // per-floor height
    const numFloors = Math.max(1, Math.floor(h / floorH));

    const wallMat = mat(scene, color.r, color.g, color.b);
    const darkMat = mat(scene, color.r * 0.7, color.g * 0.7, color.b * 0.7);
    const winMat = mat(scene, 0.7, 0.85, 1.0);
    const floorMatl = mat(scene, 0.45, 0.43, 0.4);
    const metalMat = mat(scene, 0.4, 0.4, 0.45);
    const elevMat = mat(scene, 0.55, 0.55, 0.6);
    const railMat = mat(scene, 0.35, 0.35, 0.38);

    // ── Outer walls (hollow shell) ──
    const bWall = CreateBox("bWall", { width: w, height: h, depth: t }, scene);
    bWall.material = wallMat; bWall.position.set(0, h / 2, -d / 2 + t / 2);
    bWall.parent = root; bWall.checkCollisions = true; bWall.receiveShadows = true;

    const lWall = CreateBox("lWall", { width: t, height: h, depth: d }, scene);
    lWall.material = wallMat; lWall.position.set(-w / 2 + t / 2, h / 2, 0);
    lWall.parent = root; lWall.checkCollisions = true; lWall.receiveShadows = true;

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

    const handleMt = mat(scene, 0.75, 0.7, 0.3);
    const handle = CreateBox("handle", { width: 0.08, height: 0.08, depth: 0.1 }, scene);
    handle.material = handleMt; handle.position.set(doorW * 0.35, doorH * 0.45, 0.06);
    handle.parent = doorPivot;

    // ── Floor slabs per level (with hole for elevator shaft) ──
    const shaftW = 1.8;
    const shaftD = 1.8;
    const shaftX = -w / 2 + t + shaftW / 2 + 0.3;
    const shaftZ = -d / 2 + t + shaftD / 2 + 0.3;

    for (let f = 0; f <= numFloors; f++) {
      const flY = f * floorH;
      if (flY > h) break;
      const fl = CreateBox(`floor${f}`, { width: w - t * 2, height: 0.1, depth: d - t * 2 }, scene);
      fl.material = floorMatl; fl.position.set(0, flY + 0.05, 0);
      fl.parent = root; fl.checkCollisions = true;
    }

    // Ceiling
    const ceil = CreateBox("ceil", { width: w - t * 2, height: 0.1, depth: d - t * 2 }, scene);
    ceil.material = floorMatl; ceil.position.set(0, h - 0.05, 0); ceil.parent = root;

    // ── Windows ──
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

    // ── Elevator shaft (back-left corner) ──
    // Shaft walls (3 sides, open toward front/center of building)
    const swL = CreateBox("shaftWL", { width: 0.1, height: h, depth: shaftD }, scene);
    swL.material = elevMat; swL.position.set(shaftX - shaftW / 2, h / 2, shaftZ);
    swL.parent = root; swL.checkCollisions = true;

    const swR = CreateBox("shaftWR", { width: 0.1, height: h, depth: shaftD }, scene);
    swR.material = elevMat; swR.position.set(shaftX + shaftW / 2, h / 2, shaftZ);
    swR.parent = root; swR.checkCollisions = true;

    const swB = CreateBox("shaftWB", { width: shaftW, height: h, depth: 0.1 }, scene);
    swB.material = elevMat; swB.position.set(shaftX, h / 2, shaftZ - shaftD / 2);
    swB.parent = root; swB.checkCollisions = true;

    // Elevator platform (movable – NOT parented to root so it can be positioned in world space later)
    const elevPlatform = CreateBox("elevPlat", { width: shaftW - 0.2, height: 0.15, depth: shaftD - 0.2 }, scene);
    elevPlatform.material = metalMat;
    elevPlatform.position.set(shaftX, 0.08, shaftZ);
    elevPlatform.parent = root;
    elevPlatform.checkCollisions = true;

    // Elevator call buttons (yellow) at each floor – near shaft opening
    const btnMat = mat(scene, 0.9, 0.8, 0.2);
    for (let f = 0; f < numFloors; f++) {
      const btnY = f * floorH + 1.2;
      const btn = CreateBox(`elevBtn${f}`, { width: 0.15, height: 0.15, depth: 0.05 }, scene);
      btn.material = btnMat;
      btn.position.set(shaftX + shaftW / 2 + 0.08, btnY, shaftZ + shaftD / 2 - 0.3);
      btn.parent = root;
    }

    // ── Exterior: Fire escape stairs (switchback design on right side) ──
    const stairW = 1.8;     // width of stair platform
    const stairDepth = 3.0; // total Z extent of the staircase
    const stairX = w / 2 + stairW / 2 + 0.15; // offset from building wall
    const stairCenterZ = 0;
    const halfZ = stairDepth / 2;
    const stepsPerFlight = 6; // steps per half-floor
    const stepDepthEach = 0.45; // depth of each step (walkable!)
    const stepHeight = floorH / (stepsPerFlight * 2); // height per step

    for (let f = 0; f < numFloors; f++) {
      const baseY = f * floorH;

      // Lower landing (at floor level, front side)
      const lowerLand = CreateBox(`landLow${f}`, { width: stairW, height: 0.15, depth: 1.4 }, scene);
      lowerLand.material = metalMat;
      lowerLand.position.set(stairX, baseY + 0.075, stairCenterZ - halfZ + 0.7);
      lowerLand.parent = root; lowerLand.checkCollisions = true; lowerLand.receiveShadows = true;

      // First flight: front→back, rising to mid-level
      for (let s = 0; s < stepsPerFlight; s++) {
        const sy = baseY + stepHeight * (s + 1);
        const sz = stairCenterZ - halfZ + 1.4 + stepDepthEach * s;
        const step = CreateBox(`stepA${f}_${s}`, { width: stairW - 0.1, height: 0.12, depth: stepDepthEach - 0.02 }, scene);
        step.material = metalMat;
        step.position.set(stairX, sy, sz);
        step.parent = root; step.checkCollisions = true;
      }

      // Mid landing (at half-floor height, back side)
      const midY = baseY + floorH / 2;
      const midLand = CreateBox(`landMid${f}`, { width: stairW, height: 0.15, depth: 1.4 }, scene);
      midLand.material = metalMat;
      midLand.position.set(stairX, midY + 0.075, stairCenterZ + halfZ - 0.7);
      midLand.parent = root; midLand.checkCollisions = true; midLand.receiveShadows = true;

      // Second flight: back→front, rising to next floor
      for (let s = 0; s < stepsPerFlight; s++) {
        const sy = midY + stepHeight * (s + 1);
        const sz = stairCenterZ + halfZ - 1.4 - stepDepthEach * s;
        const step = CreateBox(`stepB${f}_${s}`, { width: stairW - 0.1, height: 0.12, depth: stepDepthEach - 0.02 }, scene);
        step.material = metalMat;
        step.position.set(stairX, sy, sz);
        step.parent = root; step.checkCollisions = true;
      }

      // Railings (outer edge for entire floor section)
      const railH = floorH + 0.3;
      const railOut = CreateBox(`railO${f}`, { width: 0.06, height: railH, depth: stairDepth + 0.2 }, scene);
      railOut.material = railMat;
      railOut.position.set(stairX + stairW / 2, baseY + railH / 2, stairCenterZ);
      railOut.parent = root; railOut.checkCollisions = true;

      // Front railing
      const railFront = CreateBox(`railF${f}`, { width: stairW, height: 1.0, depth: 0.06 }, scene);
      railFront.material = railMat;
      railFront.position.set(stairX, baseY + 0.5, stairCenterZ - halfZ);
      railFront.parent = root;

      // Back railing
      const railBack = CreateBox(`railB${f}`, { width: stairW, height: 1.0, depth: 0.06 }, scene);
      railBack.material = railMat;
      railBack.position.set(stairX, midY + 0.5, stairCenterZ + halfZ);
      railBack.parent = root;
    }

    // Top landing (roof access)
    const topY = numFloors * floorH;
    const topLand = CreateBox("topLand", { width: stairW, height: 0.15, depth: 1.4 }, scene);
    topLand.material = metalMat;
    topLand.position.set(stairX, topY + 0.075, stairCenterZ - halfZ + 0.7);
    topLand.parent = root; topLand.checkCollisions = true;

    // Support columns (4 corners of stair structure)
    const colPositions = [
      [stairX - stairW / 2, stairCenterZ - halfZ],
      [stairX + stairW / 2, stairCenterZ - halfZ],
      [stairX - stairW / 2, stairCenterZ + halfZ],
      [stairX + stairW / 2, stairCenterZ + halfZ],
    ];
    for (let i = 0; i < colPositions.length; i++) {
      const [cx, cz] = colPositions[i];
      const col = CreateCylinder(`stairCol${i}`, { height: h + 0.5, diameter: 0.1, tessellation: 8 }, scene);
      col.material = railMat;
      col.position.set(cx, (h + 0.5) / 2, cz);
      col.parent = root; col.checkCollisions = true;
    }

    // Flat roof edge
    const edge = CreateBox("edge", { width: w + 0.2, height: 0.3, depth: d + 0.2 }, scene);
    edge.material = darkMat; edge.position.y = h + 0.15; edge.parent = root;

    return { root, doorPivot, elevPlatform, elevShaftX: shaftX, elevShaftZ: shaftZ, floorH, numFloors };
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

  /* ================================================================
     Animals – box-style with 4-leg joints for walk animation
     ================================================================ */

  static createCat(scene: Scene): AnimalMesh {
    const root = new TransformNode("cat", scene);
    const bodyMat = mat(scene, 0.3, 0.3, 0.32);   // dark gray
    const noseMat = mat(scene, 0.85, 0.55, 0.55);
    const earMat  = mat(scene, 0.4, 0.35, 0.35);
    const eyeM    = mat(scene, 0.15, 0.6, 0.15);   // green eyes
    const tailMat = bodyMat;

    const bodyH = 0.35;
    // Body
    const body = CreateBox("catBody", { width: 0.25, height: 0.22, depth: 0.55 }, scene);
    body.material = bodyMat; body.position.set(0, bodyH, 0); body.parent = root;

    // Head
    const head = CreateBox("catHead", { width: 0.22, height: 0.2, depth: 0.2 }, scene);
    head.material = bodyMat; head.position.set(0, bodyH + 0.12, 0.32); head.parent = root;

    // Ears
    const earL = CreateBox("catEarL", { width: 0.06, height: 0.1, depth: 0.06 }, scene);
    earL.material = earMat; earL.position.set(-0.07, bodyH + 0.26, 0.32); earL.parent = root;
    const earR = CreateBox("catEarR", { width: 0.06, height: 0.1, depth: 0.06 }, scene);
    earR.material = earMat; earR.position.set(0.07, bodyH + 0.26, 0.32); earR.parent = root;

    // Eyes
    const eyeL = CreateSphere("catEyeL", { diameter: 0.05, segments: 6 }, scene);
    eyeL.material = eyeM; eyeL.position.set(-0.06, bodyH + 0.16, 0.42); eyeL.parent = root;
    const eyeR = CreateSphere("catEyeR", { diameter: 0.05, segments: 6 }, scene);
    eyeR.material = eyeM; eyeR.position.set(0.06, bodyH + 0.16, 0.42); eyeR.parent = root;

    // Nose
    const nose = CreateBox("catNose", { width: 0.04, height: 0.03, depth: 0.03 }, scene);
    nose.material = noseMat; nose.position.set(0, bodyH + 0.1, 0.43); nose.parent = root;

    // Tail
    const tail = CreateBox("catTail", { width: 0.04, height: 0.04, depth: 0.35 }, scene);
    tail.material = tailMat; tail.position.set(0, bodyH + 0.1, -0.4); tail.rotation.x = -0.3;
    tail.parent = root;

    // Legs with joints
    const legH = 0.22; const legW = 0.07;
    const legs = AssetFactory.makeQuadLegs(scene, root, bodyMat, 0.09, bodyH - 0.08, 0.18, legW, legH);

    return { root, ...legs, eyeHeight: bodyH + 0.2 };
  }

  static createElephant(scene: Scene): AnimalMesh {
    const root = new TransformNode("elephant", scene);
    const grayMat  = mat(scene, 0.55, 0.55, 0.56);
    const darkMat  = mat(scene, 0.4, 0.4, 0.42);
    const eyeM     = mat(scene, 0.15, 0.12, 0.1);
    const tuskMat  = mat(scene, 0.92, 0.9, 0.82);

    const bodyH = 1.3;
    // Body (large)
    const body = CreateBox("eleBody", { width: 1.2, height: 1.0, depth: 1.6 }, scene);
    body.material = grayMat; body.position.set(0, bodyH, 0); body.parent = root;

    // Head
    const head = CreateBox("eleHead", { width: 0.7, height: 0.65, depth: 0.6 }, scene);
    head.material = grayMat; head.position.set(0, bodyH + 0.35, 0.9); head.parent = root;

    // Trunk
    const trunk = CreateCylinder("eleTrunk", { height: 0.9, diameterTop: 0.12, diameterBottom: 0.22, tessellation: 8 }, scene);
    trunk.material = darkMat; trunk.rotation.x = 0.4;
    trunk.position.set(0, bodyH - 0.05, 1.25); trunk.parent = root;

    // Ears (flat wide)
    const earL = CreateBox("eleEarL", { width: 0.45, height: 0.5, depth: 0.06 }, scene);
    earL.material = darkMat; earL.position.set(-0.55, bodyH + 0.35, 0.75); earL.parent = root;
    const earR = CreateBox("eleEarR", { width: 0.45, height: 0.5, depth: 0.06 }, scene);
    earR.material = darkMat; earR.position.set(0.55, bodyH + 0.35, 0.75); earR.parent = root;

    // Eyes
    const eyeL = CreateSphere("eleEyeL", { diameter: 0.1, segments: 6 }, scene);
    eyeL.material = eyeM; eyeL.position.set(-0.28, bodyH + 0.5, 1.15); eyeL.parent = root;
    const eyeR = CreateSphere("eleEyeR", { diameter: 0.1, segments: 6 }, scene);
    eyeR.material = eyeM; eyeR.position.set(0.28, bodyH + 0.5, 1.15); eyeR.parent = root;

    // Tusks
    const tuskL = CreateCylinder("tuskL", { height: 0.5, diameterTop: 0.04, diameterBottom: 0.08, tessellation: 6 }, scene);
    tuskL.material = tuskMat; tuskL.rotation.x = 0.5;
    tuskL.position.set(-0.2, bodyH - 0.05, 1.2); tuskL.parent = root;
    const tuskR = CreateCylinder("tuskR", { height: 0.5, diameterTop: 0.04, diameterBottom: 0.08, tessellation: 6 }, scene);
    tuskR.material = tuskMat; tuskR.rotation.x = 0.5;
    tuskR.position.set(0.2, bodyH - 0.05, 1.2); tuskR.parent = root;

    // Tail
    const tail = CreateCylinder("eleTail", { height: 0.6, diameterTop: 0.03, diameterBottom: 0.06, tessellation: 6 }, scene);
    tail.material = darkMat; tail.rotation.x = -0.6;
    tail.position.set(0, bodyH + 0.15, -0.85); tail.parent = root;

    // Legs – thick columns
    const legH = 0.75; const legW = 0.2;
    const legs = AssetFactory.makeQuadLegs(scene, root, grayMat, 0.4, bodyH - 0.45, 0.5, legW, legH);

    return { root, ...legs, eyeHeight: bodyH + 0.5 };
  }

  static createLion(scene: Scene): AnimalMesh {
    const root = new TransformNode("lion", scene);
    const furMat   = mat(scene, 0.78, 0.6, 0.3);
    const maneMat  = mat(scene, 0.6, 0.4, 0.15);
    const noseMat  = mat(scene, 0.3, 0.2, 0.15);
    const eyeM     = mat(scene, 0.55, 0.45, 0.15);
    const tailMat  = furMat;

    const bodyH = 0.7;
    // Body
    const body = CreateBox("lionBody", { width: 0.5, height: 0.45, depth: 0.9 }, scene);
    body.material = furMat; body.position.set(0, bodyH, 0); body.parent = root;

    // Head
    const head = CreateBox("lionHead", { width: 0.38, height: 0.35, depth: 0.32 }, scene);
    head.material = furMat; head.position.set(0, bodyH + 0.2, 0.5); head.parent = root;

    // Mane (larger box behind head)
    const mane = CreateSphere("lionMane", { diameterX: 0.6, diameterY: 0.55, diameterZ: 0.45, segments: 8 }, scene);
    mane.material = maneMat; mane.position.set(0, bodyH + 0.22, 0.4); mane.parent = root;

    // Eyes
    const eyeL = CreateSphere("lionEyeL", { diameter: 0.06, segments: 6 }, scene);
    eyeL.material = eyeM; eyeL.position.set(-0.1, bodyH + 0.28, 0.65); eyeL.parent = root;
    const eyeR = CreateSphere("lionEyeR", { diameter: 0.06, segments: 6 }, scene);
    eyeR.material = eyeM; eyeR.position.set(0.1, bodyH + 0.28, 0.65); eyeR.parent = root;

    // Nose
    const nose = CreateBox("lionNose", { width: 0.08, height: 0.05, depth: 0.05 }, scene);
    nose.material = noseMat; nose.position.set(0, bodyH + 0.18, 0.67); nose.parent = root;

    // Tail
    const tail = CreateBox("lionTail", { width: 0.05, height: 0.05, depth: 0.5 }, scene);
    tail.material = tailMat; tail.position.set(0, bodyH + 0.15, -0.65); tail.rotation.x = -0.2;
    tail.parent = root;
    // Tail tuft
    const tuft = CreateSphere("lionTuft", { diameter: 0.1, segments: 6 }, scene);
    tuft.material = maneMat; tuft.position.set(0, bodyH + 0.2, -0.88); tuft.parent = root;

    // Legs
    const legH = 0.4; const legW = 0.1;
    const legs = AssetFactory.makeQuadLegs(scene, root, furMat, 0.18, bodyH - 0.2, 0.3, legW, legH);

    return { root, ...legs, eyeHeight: bodyH + 0.3 };
  }

  /** Helper: create 4 leg joints for quadruped animals */
  private static makeQuadLegs(
    scene: Scene, root: TransformNode, legMat: StandardMaterial,
    halfSpreadX: number, jointY: number, halfSpreadZ: number,
    legW: number, legH: number,
  ): { fl: TransformNode; fr: TransformNode; bl: TransformNode; br: TransformNode } {
    const make = (name: string, x: number, z: number) => {
      const joint = new TransformNode(name, scene);
      joint.position.set(x, jointY, z);
      joint.parent = root;
      const leg = CreateBox(name + "Mesh", { width: legW, height: legH, depth: legW }, scene);
      leg.material = legMat;
      leg.position.set(0, -legH / 2, 0);
      leg.parent = joint;
      return joint;
    };
    return {
      fl: make("legFL", -halfSpreadX, halfSpreadZ),
      fr: make("legFR", halfSpreadX, halfSpreadZ),
      bl: make("legBL", -halfSpreadX, -halfSpreadZ),
      br: make("legBR", halfSpreadX, -halfSpreadZ),
    };
  }

  /** Create a massive titan creature (~40 units tall, 5x building size) */
  static createTitan(scene: Scene): TitanMesh {
    const root = new TransformNode("titan", scene);
    const scale = 8; // Scale factor for massive size

    // Dark rocky/ancient materials
    const bodyMat = mat(scene, 0.25, 0.22, 0.28);
    const armorMat = mat(scene, 0.35, 0.25, 0.2);
    const glowMat = mat(scene, 0.9, 0.3, 0.1);
    glowMat.emissiveColor = new Color3(0.9, 0.3, 0.1);
    const eyeMat = mat(scene, 1, 0.2, 0.1);
    eyeMat.emissiveColor = new Color3(1, 0.3, 0.1);

    const bodyH = 3.0 * scale; // Body center height

    // Massive body
    const body = CreateBox("titanBody", {
      width: 3.5 * scale,
      height: 2.5 * scale,
      depth: 5 * scale
    }, scene);
    body.material = bodyMat;
    body.position.set(0, bodyH, 0);
    body.parent = root;

    // Armor plates on back
    for (let i = 0; i < 5; i++) {
      const plate = CreateBox("titanPlate" + i, {
        width: 2.5 * scale,
        height: 0.8 * scale,
        depth: 0.6 * scale
      }, scene);
      plate.material = armorMat;
      plate.position.set(0, bodyH + 1.5 * scale, -2 * scale + i * scale);
      plate.rotation.x = 0.3;
      plate.parent = root;
    }

    // Neck joint (for animation)
    const neck = new TransformNode("titanNeck", scene);
    neck.position.set(0, bodyH + 0.5 * scale, 2.5 * scale);
    neck.parent = root;

    // Long neck
    const neckMesh = CreateCylinder("titanNeckMesh", {
      height: 3 * scale,
      diameterTop: 0.8 * scale,
      diameterBottom: 1.5 * scale,
      tessellation: 12
    }, scene);
    neckMesh.material = bodyMat;
    neckMesh.rotation.x = -0.5;
    neckMesh.position.set(0, 1.2 * scale, 0.8 * scale);
    neckMesh.parent = neck;

    // Head
    const head = CreateBox("titanHead", {
      width: 1.5 * scale,
      height: 1.2 * scale,
      depth: 2 * scale
    }, scene);
    head.material = armorMat;
    head.position.set(0, 2.8 * scale, 2 * scale);
    head.parent = neck;

    // Horns
    const hornL = CreateCylinder("titanHornL", {
      height: 1.5 * scale,
      diameterTop: 0.1 * scale,
      diameterBottom: 0.3 * scale,
      tessellation: 8
    }, scene);
    hornL.material = armorMat;
    hornL.rotation.z = 0.4;
    hornL.position.set(-0.6 * scale, 3.5 * scale, 1.5 * scale);
    hornL.parent = neck;

    const hornR = CreateCylinder("titanHornR", {
      height: 1.5 * scale,
      diameterTop: 0.1 * scale,
      diameterBottom: 0.3 * scale,
      tessellation: 8
    }, scene);
    hornR.material = armorMat;
    hornR.rotation.z = -0.4;
    hornR.position.set(0.6 * scale, 3.5 * scale, 1.5 * scale);
    hornR.parent = neck;

    // Glowing eyes
    const eyeL = CreateSphere("titanEyeL", { diameter: 0.4 * scale, segments: 8 }, scene);
    eyeL.material = eyeMat;
    eyeL.position.set(-0.5 * scale, 3.1 * scale, 2.8 * scale);
    eyeL.parent = neck;

    const eyeR = CreateSphere("titanEyeR", { diameter: 0.4 * scale, segments: 8 }, scene);
    eyeR.material = eyeMat;
    eyeR.position.set(0.5 * scale, 3.1 * scale, 2.8 * scale);
    eyeR.parent = neck;

    // Tail joint (for animation)
    const tail = new TransformNode("titanTail", scene);
    tail.position.set(0, bodyH, -2.5 * scale);
    tail.parent = root;

    // Long segmented tail
    for (let i = 0; i < 6; i++) {
      const seg = CreateBox("titanTailSeg" + i, {
        width: (1.2 - i * 0.15) * scale,
        height: (0.8 - i * 0.1) * scale,
        depth: 1.2 * scale
      }, scene);
      seg.material = i % 2 === 0 ? bodyMat : armorMat;
      seg.position.set(0, -0.3 * i * scale, -1.2 * i * scale);
      seg.parent = tail;
    }

    // Tail spike
    const spike = CreateCylinder("titanSpike", {
      height: 1.5 * scale,
      diameterTop: 0.05 * scale,
      diameterBottom: 0.4 * scale,
      tessellation: 6
    }, scene);
    spike.material = armorMat;
    spike.rotation.x = 1.2;
    spike.position.set(0, -2 * scale, -7 * scale);
    spike.parent = tail;

    // Massive legs
    const legH = 3 * scale;
    const legW = 1 * scale;
    const makeTitanLeg = (name: string, x: number, z: number) => {
      const joint = new TransformNode(name, scene);
      joint.position.set(x, bodyH - 1 * scale, z);
      joint.parent = root;

      // Upper leg
      const upper = CreateBox(name + "Upper", {
        width: legW,
        height: legH * 0.6,
        depth: legW * 1.2
      }, scene);
      upper.material = bodyMat;
      upper.position.set(0, -legH * 0.3, 0);
      upper.parent = joint;

      // Lower leg
      const lower = CreateBox(name + "Lower", {
        width: legW * 0.8,
        height: legH * 0.5,
        depth: legW
      }, scene);
      lower.material = armorMat;
      lower.position.set(0, -legH * 0.7, 0);
      lower.parent = joint;

      // Foot/claw
      const foot = CreateBox(name + "Foot", {
        width: legW * 1.5,
        height: legW * 0.4,
        depth: legW * 2
      }, scene);
      foot.material = armorMat;
      foot.position.set(0, -legH, legW * 0.3);
      foot.parent = joint;

      return joint;
    };

    const fl = makeTitanLeg("titanLegFL", -1.5 * scale, 1.5 * scale);
    const fr = makeTitanLeg("titanLegFR", 1.5 * scale, 1.5 * scale);
    const bl = makeTitanLeg("titanLegBL", -1.5 * scale, -1.5 * scale);
    const br = makeTitanLeg("titanLegBR", 1.5 * scale, -1.5 * scale);

    // Glowing markings on body
    const marking1 = CreateBox("titanMark1", {
      width: 2 * scale,
      height: 0.1 * scale,
      depth: 3 * scale
    }, scene);
    marking1.material = glowMat;
    marking1.position.set(0, bodyH + 1.3 * scale, 0);
    marking1.parent = root;

    return { root, fl, fr, bl, br, neck, tail };
  }
}

export interface AnimalMesh {
  root: TransformNode;
  fl: TransformNode; fr: TransformNode;
  bl: TransformNode; br: TransformNode;
  eyeHeight: number;
}

export interface TitanMesh {
  root: TransformNode;
  fl: TransformNode; fr: TransformNode;
  bl: TransformNode; br: TransformNode;
  neck: TransformNode;
  tail: TransformNode;
}
