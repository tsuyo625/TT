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

  /* ================================================================
     Japanese-style assets (和風)
     ================================================================ */

  /** Torii gate (鳥居) */
  static createTorii(scene: Scene, height = 8, width = 7): TransformNode {
    const root = new TransformNode("torii", scene);
    const redMat = mat(scene, 0.75, 0.12, 0.1);
    const darkMat = mat(scene, 0.2, 0.08, 0.06);

    // Two main pillars
    const pillarH = height;
    const pillarD = 0.4;
    const lPillar = CreateCylinder("toriiLP", { height: pillarH, diameter: pillarD, tessellation: 12 }, scene);
    lPillar.material = redMat; lPillar.position.set(-width / 2, pillarH / 2, 0); lPillar.parent = root;
    lPillar.checkCollisions = true;

    const rPillar = CreateCylinder("toriiRP", { height: pillarH, diameter: pillarD, tessellation: 12 }, scene);
    rPillar.material = redMat; rPillar.position.set(width / 2, pillarH / 2, 0); rPillar.parent = root;
    rPillar.checkCollisions = true;

    // Top beam (笠木 - kasagi) - extends beyond pillars
    const kasagi = CreateBox("kasagi", { width: width + 2, height: 0.35, depth: 0.6 }, scene);
    kasagi.material = darkMat; kasagi.position.set(0, pillarH + 0.15, 0); kasagi.parent = root;

    // Second beam (島木 - shimagi)
    const shimagi = CreateBox("shimagi", { width: width + 1.2, height: 0.25, depth: 0.45 }, scene);
    shimagi.material = redMat; shimagi.position.set(0, pillarH - 0.3, 0); shimagi.parent = root;

    // Cross beam (貫 - nuki)
    const nuki = CreateBox("nuki", { width: width, height: 0.2, depth: 0.3 }, scene);
    nuki.material = redMat; nuki.position.set(0, pillarH * 0.65, 0); nuki.parent = root;

    return root;
  }

  /** Japanese temple / shrine (神社) */
  static createTemple(scene: Scene): TransformNode {
    const root = new TransformNode("temple", scene);
    const woodMat = mat(scene, 0.5, 0.35, 0.18);
    const darkWoodMat = mat(scene, 0.3, 0.2, 0.1);
    const roofMat = mat(scene, 0.2, 0.22, 0.25);
    const whiteMat = mat(scene, 0.92, 0.9, 0.85);
    const goldMat = mat(scene, 0.85, 0.7, 0.2);

    // Raised platform (基壇)
    const platform = CreateBox("templePlatform", { width: 16, height: 1.2, depth: 12 }, scene);
    platform.material = whiteMat; platform.position.set(0, 0.6, 0); platform.parent = root;
    platform.checkCollisions = true;

    // Steps at front
    for (let i = 0; i < 4; i++) {
      const step = CreateBox(`templeStep${i}`, { width: 6, height: 0.3, depth: 0.8 }, scene);
      step.material = whiteMat;
      step.position.set(0, 0.15 + i * 0.3, 6.4 + i * 0.8);
      step.parent = root; step.checkCollisions = true;
    }

    // Main hall walls
    const wallH = 4;
    const bWall = CreateBox("tBWall", { width: 14, height: wallH, depth: 0.3 }, scene);
    bWall.material = whiteMat; bWall.position.set(0, 1.2 + wallH / 2, -5); bWall.parent = root;
    bWall.checkCollisions = true;

    const lWall = CreateBox("tLWall", { width: 0.3, height: wallH, depth: 10 }, scene);
    lWall.material = whiteMat; lWall.position.set(-7, 1.2 + wallH / 2, 0); lWall.parent = root;
    lWall.checkCollisions = true;

    const rWall = CreateBox("tRWall", { width: 0.3, height: wallH, depth: 10 }, scene);
    rWall.material = whiteMat; rWall.position.set(7, 1.2 + wallH / 2, 0); rWall.parent = root;
    rWall.checkCollisions = true;

    // Front wall sections
    const fwL = CreateBox("tFWL", { width: 4, height: wallH, depth: 0.3 }, scene);
    fwL.material = whiteMat; fwL.position.set(-5, 1.2 + wallH / 2, 5); fwL.parent = root;
    fwL.checkCollisions = true;

    const fwR = CreateBox("tFWR", { width: 4, height: wallH, depth: 0.3 }, scene);
    fwR.material = whiteMat; fwR.position.set(5, 1.2 + wallH / 2, 5); fwR.parent = root;
    fwR.checkCollisions = true;

    // Pillars (柱) at front
    for (let i = -2; i <= 2; i++) {
      const pillar = CreateCylinder(`tPillar${i}`, { height: wallH, diameter: 0.35, tessellation: 10 }, scene);
      pillar.material = darkWoodMat;
      pillar.position.set(i * 3.5, 1.2 + wallH / 2, 5.2);
      pillar.parent = root; pillar.checkCollisions = true;
    }

    // Roof - layered (入母屋造り style)
    const roofBase = CreateBox("roofBase", { width: 18, height: 0.4, depth: 14 }, scene);
    roofBase.material = roofMat; roofBase.position.set(0, 1.2 + wallH + 0.2, 0); roofBase.parent = root;

    // Peaked roof layers
    for (let i = 0; i < 4; i++) {
      const scale = 1 - i * 0.2;
      const roofLayer = CreateBox(`roofL${i}`, { width: 18 * scale, height: 0.3, depth: 14 * scale }, scene);
      roofLayer.material = roofMat;
      roofLayer.position.set(0, 1.2 + wallH + 0.6 + i * 0.8, 0);
      roofLayer.parent = root;
    }

    // Ridge ornament (鬼瓦)
    const ridge = CreateBox("ridge", { width: 1.2, height: 1, depth: 0.5 }, scene);
    ridge.material = goldMat; ridge.position.set(0, 1.2 + wallH + 4, 0); ridge.parent = root;

    // Floor inside
    const floor = CreateBox("templeFloor", { width: 13.5, height: 0.05, depth: 9.5 }, scene);
    floor.material = woodMat; floor.position.set(0, 1.23, 0); floor.parent = root;

    return root;
  }

  /** Stone lantern (石灯篭) */
  static createStoneLantern(scene: Scene): TransformNode {
    const root = new TransformNode("lantern", scene);
    const stoneMat = mat(scene, 0.55, 0.53, 0.5);
    const lightMat = mat(scene, 1, 0.9, 0.5);
    lightMat.emissiveColor = new Color3(0.6, 0.5, 0.2);

    // Base
    const base = CreateCylinder("lBase", { height: 0.3, diameter: 0.8, tessellation: 6 }, scene);
    base.material = stoneMat; base.position.y = 0.15; base.parent = root;

    // Shaft
    const shaft = CreateCylinder("lShaft", { height: 1.2, diameter: 0.25, tessellation: 6 }, scene);
    shaft.material = stoneMat; shaft.position.y = 0.9; shaft.parent = root;

    // Light box (火袋)
    const box = CreateBox("lBox", { width: 0.6, height: 0.5, depth: 0.6 }, scene);
    box.material = stoneMat; box.position.y = 1.75; box.parent = root;

    // Light glow
    const glow = CreateBox("lGlow", { width: 0.35, height: 0.3, depth: 0.35 }, scene);
    glow.material = lightMat; glow.position.y = 1.75; glow.parent = root;

    // Roof (笠)
    const roof = CreateBox("lRoof", { width: 0.9, height: 0.15, depth: 0.9 }, scene);
    roof.material = stoneMat; roof.position.y = 2.1; roof.parent = root;

    // Tip
    const tip = CreateSphere("lTip", { diameter: 0.2, segments: 6 }, scene);
    tip.material = stoneMat; tip.position.y = 2.35; tip.parent = root;

    return root;
  }

  /** Cherry blossom tree (桜) */
  static createCherryTree(scene: Scene): TransformNode {
    const root = new TransformNode("cherry", scene);
    const trunkMat = mat(scene, 0.45, 0.3, 0.18);
    const blossomMat = mat(scene, 0.95, 0.7, 0.78);
    const blossomMat2 = mat(scene, 0.98, 0.8, 0.85);

    // Trunk (slightly curved look)
    const trunk = CreateCylinder("cTrunk", { height: 2.5, diameterTop: 0.2, diameterBottom: 0.35, tessellation: 8 }, scene);
    trunk.material = trunkMat; trunk.position.y = 1.25; trunk.parent = root;
    trunk.checkCollisions = true;

    // Branch
    const branch = CreateCylinder("cBranch", { height: 1.5, diameterTop: 0.08, diameterBottom: 0.15, tessellation: 6 }, scene);
    branch.material = trunkMat; branch.rotation.z = 0.6; branch.position.set(0.5, 2.2, 0); branch.parent = root;

    // Main blossom clouds
    const b1 = CreateSphere("blossom1", { diameterX: 3, diameterY: 2, diameterZ: 3, segments: 8 }, scene);
    b1.material = blossomMat; b1.position.set(0, 3.2, 0); b1.parent = root;

    const b2 = CreateSphere("blossom2", { diameterX: 2, diameterY: 1.5, diameterZ: 2, segments: 8 }, scene);
    b2.material = blossomMat2; b2.position.set(1, 2.8, 0.5); b2.parent = root;

    const b3 = CreateSphere("blossom3", { diameterX: 1.8, diameterY: 1.2, diameterZ: 1.8, segments: 6 }, scene);
    b3.material = blossomMat; b3.position.set(-0.8, 2.9, -0.3); b3.parent = root;

    return root;
  }

  /** Bamboo cluster (竹) */
  static createBambooCluster(scene: Scene, count = 6): TransformNode {
    const root = new TransformNode("bamboo", scene);
    const bambooMat = mat(scene, 0.35, 0.55, 0.25);
    const leafMat = mat(scene, 0.25, 0.5, 0.2);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const rx = Math.cos(angle) * (0.3 + Math.random() * 0.4);
      const rz = Math.sin(angle) * (0.3 + Math.random() * 0.4);
      const h = 3 + Math.random() * 3;

      const stalk = CreateCylinder(`bamStalk${i}`, { height: h, diameterTop: 0.06, diameterBottom: 0.08, tessellation: 8 }, scene);
      stalk.material = bambooMat; stalk.position.set(rx, h / 2, rz); stalk.parent = root;

      // Leaf cluster at top
      const leaf = CreateSphere(`bamLeaf${i}`, { diameterX: 0.8, diameterY: 0.4, diameterZ: 0.8, segments: 6 }, scene);
      leaf.material = leafMat; leaf.position.set(rx, h - 0.2, rz); leaf.parent = root;
    }

    return root;
  }

  /** Zen garden (枯山水) with raked gravel and rocks */
  static createZenGarden(scene: Scene): TransformNode {
    const root = new TransformNode("zenGarden", scene);
    const gravelMat = mat(scene, 0.85, 0.83, 0.78);
    const stoneMat = mat(scene, 0.45, 0.43, 0.4);
    const borderMat = mat(scene, 0.5, 0.35, 0.2);

    // Gravel base
    const gravel = CreateBox("gravel", { width: 20, height: 0.05, depth: 15 }, scene);
    gravel.material = gravelMat; gravel.position.y = 0.03; gravel.parent = root;

    // Wooden border
    const borders = [
      { x: 0, z: -7.5, w: 20.4, d: 0.2 },
      { x: 0, z: 7.5, w: 20.4, d: 0.2 },
      { x: -10, z: 0, w: 0.2, d: 15 },
      { x: 10, z: 0, w: 0.2, d: 15 },
    ];
    for (let i = 0; i < borders.length; i++) {
      const b = borders[i];
      const border = CreateBox(`zenBorder${i}`, { width: b.w, height: 0.3, depth: b.d }, scene);
      border.material = borderMat; border.position.set(b.x, 0.15, b.z); border.parent = root;
      border.checkCollisions = true;
    }

    // Decorative rocks
    const rocks = [
      { x: -3, z: -2, sx: 1.5, sy: 1, sz: 1.2 },
      { x: 4, z: 1, sx: 2, sy: 1.4, sz: 1.6 },
      { x: -1, z: 3, sx: 1, sy: 0.8, sz: 0.9 },
      { x: 6, z: -3, sx: 0.8, sy: 0.6, sz: 0.7 },
      { x: -5, z: 2, sx: 1.2, sy: 0.9, sz: 1.1 },
    ];
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i];
      const rock = CreateSphere(`zenRock${i}`, { diameterX: r.sx, diameterY: r.sy, diameterZ: r.sz, segments: 6 }, scene);
      rock.material = stoneMat; rock.position.set(r.x, r.sy * 0.3, r.z); rock.parent = root;
      rock.checkCollisions = true;
    }

    // Raked lines (decorative grooves in gravel)
    const lineMat = mat(scene, 0.78, 0.76, 0.72);
    for (let i = -8; i <= 8; i += 1) {
      const line = CreateBox(`zenLine${i}`, { width: 18, height: 0.02, depth: 0.08 }, scene);
      line.material = lineMat; line.position.set(0, 0.06, i * 0.8); line.parent = root;
    }

    return root;
  }

  /** Wooden bridge (橋) */
  static createWoodenBridge(scene: Scene, length = 10, width = 3): TransformNode {
    const root = new TransformNode("bridge", scene);
    const woodMat = mat(scene, 0.55, 0.38, 0.18);
    const railMat = mat(scene, 0.5, 0.32, 0.15);

    // Bridge deck with slight arch
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const y = Math.sin(t * Math.PI) * 0.8;
      const plank = CreateBox(`plank${i}`, { width: width, height: 0.12, depth: length / 12 }, scene);
      plank.material = woodMat;
      plank.position.set(0, y + 0.06, -length / 2 + (i + 0.5) * (length / 12));
      plank.parent = root; plank.checkCollisions = true;
    }

    // Railings
    for (const side of [-1, 1]) {
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const y = Math.sin(t * Math.PI) * 0.8;
        const post = CreateBox(`railPost${side}_${i}`, { width: 0.1, height: 1, depth: 0.1 }, scene);
        post.material = railMat;
        post.position.set(side * width / 2, y + 0.5, -length / 2 + i * (length / 6));
        post.parent = root; post.checkCollisions = true;
      }
      // Top rail
      const topRail = CreateBox(`topRail${side}`, { width: 0.08, height: 0.06, depth: length }, scene);
      topRail.material = railMat;
      topRail.position.set(side * width / 2, 1.4, 0);
      topRail.parent = root;
    }

    return root;
  }

  /** Pond (池) */
  static createPond(scene: Scene, radiusX = 8, radiusZ = 6): TransformNode {
    const root = new TransformNode("pond", scene);
    const waterMat = mat(scene, 0.15, 0.35, 0.45);
    waterMat.alpha = 0.7;
    const edgeMat = mat(scene, 0.4, 0.38, 0.35);

    // Water surface
    const water = CreateSphere("pondWater", { diameterX: radiusX * 2, diameterY: 0.3, diameterZ: radiusZ * 2, segments: 16 }, scene);
    water.material = waterMat; water.position.y = -0.05; water.parent = root;

    // Edge rocks
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const rx = Math.cos(angle) * (radiusX + 0.3 + Math.random() * 0.3);
      const rz = Math.sin(angle) * (radiusZ + 0.3 + Math.random() * 0.3);
      const s = 0.4 + Math.random() * 0.6;
      const rock = CreateSphere(`pondRock${i}`, { diameterX: s, diameterY: s * 0.6, diameterZ: s, segments: 6 }, scene);
      rock.material = edgeMat; rock.position.set(rx, 0.1, rz); rock.parent = root;
    }

    return root;
  }

  /* ================================================================
     Forest & Cave assets
     ================================================================ */

  /** Large tree for dense forest */
  static createLargeTree(scene: Scene): TransformNode {
    const root = new TransformNode("largeTree", scene);
    const trunkMat = mat(scene, 0.4, 0.28, 0.1);
    const foliageMat = mat(scene, 0.12, 0.45, 0.18);
    const foliageMat2 = mat(scene, 0.15, 0.5, 0.22);

    // Thick trunk
    const trunk = CreateCylinder("lgTrunk", { height: 4, diameterTop: 0.35, diameterBottom: 0.6, tessellation: 10 }, scene);
    trunk.material = trunkMat; trunk.position.y = 2; trunk.parent = root;
    trunk.checkCollisions = true;

    // Large foliage clusters
    const f1 = CreateSphere("lgFoliage1", { diameterX: 4, diameterY: 3, diameterZ: 4, segments: 8 }, scene);
    f1.material = foliageMat; f1.position.set(0, 5, 0); f1.parent = root;

    const f2 = CreateSphere("lgFoliage2", { diameterX: 3, diameterY: 2.2, diameterZ: 3, segments: 8 }, scene);
    f2.material = foliageMat2; f2.position.set(1.2, 4.5, 0.8); f2.parent = root;

    const f3 = CreateSphere("lgFoliage3", { diameterX: 2.5, diameterY: 2, diameterZ: 2.5, segments: 6 }, scene);
    f3.material = foliageMat; f3.position.set(-1, 4.2, -0.6); f3.parent = root;

    return root;
  }

  /** Fallen log */
  static createFallenLog(scene: Scene): TransformNode {
    const root = new TransformNode("fallenLog", scene);
    const logMat = mat(scene, 0.35, 0.25, 0.12);
    const mossMat = mat(scene, 0.2, 0.4, 0.15);

    const log = CreateCylinder("logBody", { height: 4, diameter: 0.4, tessellation: 8 }, scene);
    log.material = logMat; log.rotation.z = Math.PI / 2; log.position.y = 0.2; log.parent = root;
    log.checkCollisions = true;

    // Moss patches
    const moss = CreateSphere("moss", { diameterX: 1, diameterY: 0.15, diameterZ: 0.5, segments: 6 }, scene);
    moss.material = mossMat; moss.position.set(0.5, 0.35, 0); moss.parent = root;

    return root;
  }

  /** Mushroom cluster */
  static createMushrooms(scene: Scene): TransformNode {
    const root = new TransformNode("mushrooms", scene);
    const stemMat = mat(scene, 0.85, 0.82, 0.75);
    const capMat = mat(scene, 0.7, 0.2, 0.15);
    const capMat2 = mat(scene, 0.8, 0.65, 0.3);

    const mushData = [
      { x: 0, z: 0, h: 0.4, cap: 0.3, m: capMat },
      { x: 0.3, z: 0.2, h: 0.3, cap: 0.25, m: capMat2 },
      { x: -0.2, z: 0.15, h: 0.5, cap: 0.35, m: capMat },
    ];
    for (let i = 0; i < mushData.length; i++) {
      const md = mushData[i];
      const stem = CreateCylinder(`mStem${i}`, { height: md.h, diameterTop: 0.06, diameterBottom: 0.08, tessellation: 8 }, scene);
      stem.material = stemMat; stem.position.set(md.x, md.h / 2, md.z); stem.parent = root;

      const cap = CreateSphere(`mCap${i}`, { diameterX: md.cap * 2, diameterY: md.cap, diameterZ: md.cap * 2, segments: 8 }, scene);
      cap.material = md.m; cap.position.set(md.x, md.h + md.cap * 0.3, md.z); cap.parent = root;
    }

    return root;
  }

  /** Cave stalactite or stalagmite */
  static createStalactite(scene: Scene, height = 2, hanging = true): Mesh {
    const stoneMat = mat(scene, 0.4, 0.38, 0.35);
    const cone = CreateCylinder("stalactite", {
      height,
      diameterTop: hanging ? 0.5 : 0.05,
      diameterBottom: hanging ? 0.05 : 0.5,
      tessellation: 8,
    }, scene);
    cone.material = stoneMat;
    cone.checkCollisions = true;
    return cone;
  }

  /** Glowing crystal formation */
  static createCrystal(scene: Scene, color: Color3 = new Color3(0.3, 0.6, 1)): TransformNode {
    const root = new TransformNode("crystal", scene);
    const crystalMat = mat(scene, color.r, color.g, color.b);
    crystalMat.emissiveColor = new Color3(color.r * 0.4, color.g * 0.4, color.b * 0.4);
    crystalMat.alpha = 0.85;

    const shards = [
      { x: 0, z: 0, h: 1.8, d: 0.2, rx: 0, rz: 0 },
      { x: 0.15, z: 0.1, h: 1.3, d: 0.15, rx: 0.15, rz: -0.1 },
      { x: -0.1, z: 0.12, h: 1.5, d: 0.18, rx: -0.1, rz: 0.2 },
      { x: 0.08, z: -0.1, h: 1, d: 0.12, rx: 0.1, rz: 0.15 },
    ];
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i];
      const shard = CreateCylinder(`shard${i}`, { height: s.h, diameterTop: 0.02, diameterBottom: s.d, tessellation: 6 }, scene);
      shard.material = crystalMat;
      shard.position.set(s.x, s.h / 2, s.z);
      shard.rotation.set(s.rx, 0, s.rz);
      shard.parent = root;
    }

    return root;
  }

  /* ================================================================
     Area-specific giant creatures (エリア固有の巨大生物)
     ================================================================ */

  /** Japanese Dragon 龍神 – serpentine dragon for the Japanese area */
  static createDragon(scene: Scene): TitanMesh {
    const root = new TransformNode("dragon", scene);
    const s = 6;

    const bodyMat = mat(scene, 0.1, 0.35, 0.3);
    const scaleMat = mat(scene, 0.15, 0.45, 0.35);
    const goldMat = mat(scene, 0.85, 0.7, 0.2);
    goldMat.emissiveColor = new Color3(0.3, 0.25, 0.05);
    const eyeMat = mat(scene, 0.6, 0.9, 1);
    eyeMat.emissiveColor = new Color3(0.4, 0.7, 1);

    const bodyH = 2.5 * s;

    // Serpentine body – long and narrow
    const body = CreateBox("dragonBody", { width: 2 * s, height: 1.8 * s, depth: 6 * s }, scene);
    body.material = bodyMat;
    body.position.set(0, bodyH, 0);
    body.parent = root;

    // Dorsal fins along the spine
    for (let i = 0; i < 7; i++) {
      const fin = CreateBox("dragonFin" + i, { width: 0.15 * s, height: (1 + Math.sin(i * 0.6) * 0.5) * s, depth: 0.5 * s }, scene);
      fin.material = goldMat;
      fin.position.set(0, bodyH + 1.2 * s, -2.5 * s + i * 0.9 * s);
      fin.parent = root;
    }

    // Neck
    const neck = new TransformNode("dragonNeck", scene);
    neck.position.set(0, bodyH + 0.5 * s, 3 * s);
    neck.parent = root;

    const neckMesh = CreateCylinder("dragonNeckMesh", { height: 3.5 * s, diameterTop: 0.7 * s, diameterBottom: 1.2 * s, tessellation: 12 }, scene);
    neckMesh.material = scaleMat;
    neckMesh.rotation.x = -0.6;
    neckMesh.position.set(0, 1.5 * s, 1 * s);
    neckMesh.parent = neck;

    // Head – angular and fierce
    const head = CreateBox("dragonHead", { width: 1.4 * s, height: 0.9 * s, depth: 2.2 * s }, scene);
    head.material = scaleMat;
    head.position.set(0, 3.2 * s, 2.5 * s);
    head.parent = neck;

    // Snout
    const snout = CreateBox("dragonSnout", { width: 0.8 * s, height: 0.5 * s, depth: 1.2 * s }, scene);
    snout.material = bodyMat;
    snout.position.set(0, 2.9 * s, 3.8 * s);
    snout.parent = neck;

    // Antlers (鹿角 – classic Japanese dragon)
    for (const side of [-1, 1]) {
      const antler = CreateCylinder("dragonAntler", { height: 2 * s, diameterTop: 0.06 * s, diameterBottom: 0.2 * s, tessellation: 6 }, scene);
      antler.material = goldMat;
      antler.rotation.z = side * 0.5;
      antler.rotation.x = -0.3;
      antler.position.set(side * 0.5 * s, 4 * s, 2 * s);
      antler.parent = neck;

      // Branch
      const branch = CreateCylinder("dragonAntlerB", { height: 0.8 * s, diameterTop: 0.04 * s, diameterBottom: 0.1 * s, tessellation: 6 }, scene);
      branch.material = goldMat;
      branch.rotation.z = side * 0.8;
      branch.position.set(side * 0.7 * s, 4.5 * s, 2.2 * s);
      branch.parent = neck;
    }

    // Glowing eyes
    for (const side of [-1, 1]) {
      const eye = CreateSphere("dragonEye", { diameter: 0.35 * s, segments: 8 }, scene);
      eye.material = eyeMat;
      eye.position.set(side * 0.45 * s, 3.4 * s, 3.3 * s);
      eye.parent = neck;
    }

    // Whiskers (龍のひげ)
    for (const side of [-1, 1]) {
      const whisker = CreateCylinder("dragonWhisker", { height: 2 * s, diameterTop: 0.02 * s, diameterBottom: 0.06 * s, tessellation: 4 }, scene);
      whisker.material = goldMat;
      whisker.rotation.z = side * 0.6;
      whisker.rotation.x = 0.4;
      whisker.position.set(side * 0.5 * s, 2.8 * s, 4 * s);
      whisker.parent = neck;
    }

    // Tail
    const tail = new TransformNode("dragonTail", scene);
    tail.position.set(0, bodyH, -3 * s);
    tail.parent = root;

    for (let i = 0; i < 8; i++) {
      const seg = CreateBox("dragonTailSeg" + i, { width: (1.5 - i * 0.15) * s, height: (1 - i * 0.1) * s, depth: 1 * s }, scene);
      seg.material = i % 2 === 0 ? bodyMat : scaleMat;
      seg.position.set(0, -0.2 * i * s, -1 * i * s);
      seg.parent = tail;
    }

    // Tail fin
    const tailFin = CreateBox("dragonTailFin", { width: 1.5 * s, height: 0.1 * s, depth: 1.2 * s }, scene);
    tailFin.material = goldMat;
    tailFin.position.set(0, -1.5 * s, -8 * s);
    tailFin.parent = tail;

    // Dragon legs (shorter, clawed)
    const legH = 2.5 * s;
    const legW = 0.7 * s;
    const makeDragonLeg = (name: string, x: number, z: number) => {
      const joint = new TransformNode(name, scene);
      joint.position.set(x, bodyH - 0.8 * s, z);
      joint.parent = root;
      const upper = CreateBox(name + "U", { width: legW, height: legH * 0.5, depth: legW }, scene);
      upper.material = bodyMat;
      upper.position.set(0, -legH * 0.25, 0);
      upper.parent = joint;
      const lower = CreateBox(name + "L", { width: legW * 0.7, height: legH * 0.4, depth: legW * 0.8 }, scene);
      lower.material = scaleMat;
      lower.position.set(0, -legH * 0.6, 0);
      lower.parent = joint;
      const claw = CreateBox(name + "C", { width: legW * 1.3, height: legW * 0.3, depth: legW * 1.8 }, scene);
      claw.material = goldMat;
      claw.position.set(0, -legH * 0.85, legW * 0.3);
      claw.parent = joint;
      return joint;
    };

    const fl = makeDragonLeg("dragonFL", -1 * s, 2 * s);
    const fr = makeDragonLeg("dragonFR", 1 * s, 2 * s);
    const bl = makeDragonLeg("dragonBL", -1 * s, -2 * s);
    const br = makeDragonLeg("dragonBR", 1 * s, -2 * s);

    // Glowing pearl (宝珠) on forehead
    const pearl = CreateSphere("dragonPearl", { diameter: 0.5 * s, segments: 12 }, scene);
    const pearlMat = mat(scene, 0.7, 0.95, 1);
    pearlMat.emissiveColor = new Color3(0.5, 0.8, 1);
    pearlMat.alpha = 0.9;
    pearl.material = pearlMat;
    pearl.position.set(0, 3.8 * s, 3 * s);
    pearl.parent = neck;

    return { root, fl, fr, bl, br, neck, tail };
  }

  /** Forest Guardian 森の守護者 – a massive tree-like creature */
  static createForestGuardian(scene: Scene): TitanMesh {
    const root = new TransformNode("forestGuardian", scene);
    const s = 7;

    const barkMat = mat(scene, 0.35, 0.22, 0.12);
    const darkBarkMat = mat(scene, 0.25, 0.15, 0.08);
    const mossMat = mat(scene, 0.2, 0.5, 0.15);
    mossMat.emissiveColor = new Color3(0.05, 0.15, 0.03);
    const leafMat = mat(scene, 0.15, 0.55, 0.1);
    const glowMat = mat(scene, 0.3, 0.9, 0.2);
    glowMat.emissiveColor = new Color3(0.2, 0.7, 0.1);

    const bodyH = 3 * s;

    // Trunk-like body
    const body = CreateCylinder("guardianBody", { height: 3 * s, diameterTop: 2.5 * s, diameterBottom: 3 * s, tessellation: 10 }, scene);
    body.material = barkMat;
    body.position.set(0, bodyH, 0);
    body.parent = root;

    // Bark ridges
    for (let i = 0; i < 6; i++) {
      const ridge = CreateBox("guardianRidge" + i, { width: 0.4 * s, height: 2 * s, depth: 0.5 * s }, scene);
      ridge.material = darkBarkMat;
      const angle = (i / 6) * Math.PI * 2;
      ridge.position.set(Math.cos(angle) * 1.3 * s, bodyH, Math.sin(angle) * 1.3 * s);
      ridge.rotation.y = angle;
      ridge.parent = root;
    }

    // Moss patches
    for (let i = 0; i < 4; i++) {
      const moss = CreateSphere("guardianMoss" + i, { diameter: 1 * s, segments: 6 }, scene);
      moss.material = mossMat;
      const angle = (i / 4) * Math.PI * 2 + 0.3;
      moss.position.set(Math.cos(angle) * 1.2 * s, bodyH + 0.8 * s, Math.sin(angle) * 1.2 * s);
      moss.scaling.set(1, 0.5, 1);
      moss.parent = root;
    }

    // Crown of branches and leaves (head area)
    const neck = new TransformNode("guardianNeck", scene);
    neck.position.set(0, bodyH + 1.5 * s, 0);
    neck.parent = root;

    // Upper trunk / neck
    const upperTrunk = CreateCylinder("guardianUpperTrunk", { height: 2 * s, diameterTop: 1.2 * s, diameterBottom: 2 * s, tessellation: 8 }, scene);
    upperTrunk.material = barkMat;
    upperTrunk.position.set(0, 0.5 * s, 0);
    upperTrunk.parent = neck;

    // Face – hollow eyes in bark
    const face = CreateBox("guardianFace", { width: 1.5 * s, height: 1.2 * s, depth: 0.8 * s }, scene);
    face.material = darkBarkMat;
    face.position.set(0, 1 * s, 0.6 * s);
    face.parent = neck;

    // Glowing eyes
    for (const side of [-1, 1]) {
      const eye = CreateSphere("guardianEye", { diameter: 0.35 * s, segments: 8 }, scene);
      eye.material = glowMat;
      eye.position.set(side * 0.4 * s, 1.2 * s, 1 * s);
      eye.parent = neck;
    }

    // Crown branches
    for (let i = 0; i < 5; i++) {
      const branch = CreateCylinder("guardianBranch" + i, { height: 2.5 * s, diameterTop: 0.05 * s, diameterBottom: 0.3 * s, tessellation: 6 }, scene);
      branch.material = barkMat;
      const angle = (i / 5) * Math.PI * 2;
      branch.rotation.z = 0.4 + Math.random() * 0.3;
      branch.rotation.y = angle;
      branch.position.set(Math.cos(angle) * 0.4 * s, 2 * s, Math.sin(angle) * 0.4 * s);
      branch.parent = neck;

      // Leaf clusters on branches
      const leaves = CreateSphere("guardianLeaf" + i, { diameter: 1.5 * s, segments: 6 }, scene);
      leaves.material = leafMat;
      leaves.position.set(Math.cos(angle) * 1.5 * s, 3 * s, Math.sin(angle) * 1.5 * s);
      leaves.scaling.set(1, 0.6, 1);
      leaves.parent = neck;
    }

    // Tail – a thick root tendril
    const tail = new TransformNode("guardianTail", scene);
    tail.position.set(0, bodyH - 1 * s, -1.5 * s);
    tail.parent = root;

    for (let i = 0; i < 5; i++) {
      const seg = CreateCylinder("guardianTailSeg" + i, { height: 1.2 * s, diameterTop: (0.8 - i * 0.12) * s, diameterBottom: (1 - i * 0.12) * s, tessellation: 8 }, scene);
      seg.material = i % 2 === 0 ? barkMat : darkBarkMat;
      seg.position.set(0, -0.3 * i * s, -1 * i * s);
      seg.parent = tail;
    }

    // Root-like legs
    const legH = 3 * s;
    const makeGuardianLeg = (name: string, x: number, z: number) => {
      const joint = new TransformNode(name, scene);
      joint.position.set(x, bodyH - 1.5 * s, z);
      joint.parent = root;

      const upper = CreateCylinder(name + "U", { height: legH * 0.5, diameterTop: 0.5 * s, diameterBottom: 0.8 * s, tessellation: 8 }, scene);
      upper.material = barkMat;
      upper.position.set(0, -legH * 0.25, 0);
      upper.parent = joint;

      const lower = CreateCylinder(name + "L", { height: legH * 0.5, diameterTop: 0.4 * s, diameterBottom: 0.6 * s, tessellation: 8 }, scene);
      lower.material = darkBarkMat;
      lower.position.set(0, -legH * 0.6, 0);
      lower.parent = joint;

      // Root-like foot spread
      for (let r = 0; r < 3; r++) {
        const rootToe = CreateCylinder(name + "R" + r, { height: 1.2 * s, diameterTop: 0.05 * s, diameterBottom: 0.15 * s, tessellation: 6 }, scene);
        rootToe.material = darkBarkMat;
        const ra = ((r - 1) / 3) * Math.PI * 0.6;
        rootToe.rotation.z = Math.cos(ra) * 0.7;
        rootToe.rotation.x = Math.sin(ra) * 0.7;
        rootToe.position.set(0, -legH * 0.85, 0);
        rootToe.parent = joint;
      }

      return joint;
    };

    const fl = makeGuardianLeg("guardianFL", -1.3 * s, 1.3 * s);
    const fr = makeGuardianLeg("guardianFR", 1.3 * s, 1.3 * s);
    const bl = makeGuardianLeg("guardianBL", -1.3 * s, -1.3 * s);
    const br = makeGuardianLeg("guardianBR", 1.3 * s, -1.3 * s);

    // Glowing rune markings on trunk
    for (let i = 0; i < 3; i++) {
      const rune = CreateBox("guardianRune" + i, { width: 0.6 * s, height: 0.15 * s, depth: 0.6 * s }, scene);
      rune.material = glowMat;
      rune.position.set(0, bodyH - 0.5 * s + i * 0.8 * s, 1.5 * s);
      rune.parent = root;
    }

    return { root, fl, fr, bl, br, neck, tail };
  }

  /** Cave Golem 洞窟のゴーレム – a massive stone/crystal creature */
  static createCaveGolem(scene: Scene): TitanMesh {
    const root = new TransformNode("caveGolem", scene);
    const s = 6;

    const stoneMat = mat(scene, 0.3, 0.28, 0.32);
    const darkStoneMat = mat(scene, 0.2, 0.18, 0.22);
    const crystalMat = mat(scene, 0.4, 0.2, 0.8);
    crystalMat.emissiveColor = new Color3(0.3, 0.1, 0.6);
    crystalMat.alpha = 0.9;
    const lavaMat = mat(scene, 1, 0.4, 0.1);
    lavaMat.emissiveColor = new Color3(1, 0.3, 0.05);

    const bodyH = 3 * s;

    // Massive boulder body
    const body = CreateSphere("golemBody", { diameter: 4 * s, segments: 8 }, scene);
    body.material = stoneMat;
    body.scaling.set(1, 0.8, 1.2);
    body.position.set(0, bodyH, 0);
    body.parent = root;

    // Rock plates / armor chunks
    for (let i = 0; i < 8; i++) {
      const plate = CreateBox("golemPlate" + i, { width: (0.8 + Math.random() * 0.5) * s, height: (0.5 + Math.random() * 0.3) * s, depth: (0.6 + Math.random() * 0.4) * s }, scene);
      plate.material = darkStoneMat;
      const angle = (i / 8) * Math.PI * 2;
      plate.position.set(Math.cos(angle) * 1.5 * s, bodyH + (Math.random() - 0.3) * s, Math.sin(angle) * 1.8 * s);
      plate.rotation.set(Math.random() * 0.3, angle, Math.random() * 0.2);
      plate.parent = root;
    }

    // Crystal formations growing from body
    const crystalPositions = [
      { x: 0.8, y: 1.5, z: 0.5, h: 2, rx: 0.2, rz: -0.3 },
      { x: -0.6, y: 1.3, z: -0.3, h: 1.5, rx: -0.15, rz: 0.4 },
      { x: 0.2, y: 1.6, z: -0.8, h: 1.8, rx: 0.1, rz: 0.2 },
      { x: -0.9, y: 1.2, z: 0.6, h: 1.3, rx: -0.2, rz: -0.2 },
    ];
    for (let i = 0; i < crystalPositions.length; i++) {
      const cp = crystalPositions[i];
      const crystal = CreateCylinder("golemCrystal" + i, { height: cp.h * s, diameterTop: 0.05 * s, diameterBottom: 0.3 * s, tessellation: 6 }, scene);
      crystal.material = crystalMat;
      crystal.position.set(cp.x * s, bodyH + cp.y * s, cp.z * s);
      crystal.rotation.set(cp.rx, 0, cp.rz);
      crystal.parent = root;
    }

    // Neck / head area – hunched forward
    const neck = new TransformNode("golemNeck", scene);
    neck.position.set(0, bodyH + 1 * s, 1.5 * s);
    neck.parent = root;

    // Head – rough boulder
    const head = CreateSphere("golemHead", { diameter: 2 * s, segments: 6 }, scene);
    head.material = darkStoneMat;
    head.scaling.set(1, 0.8, 1);
    head.position.set(0, 0.5 * s, 0.5 * s);
    head.parent = neck;

    // Lava eyes
    for (const side of [-1, 1]) {
      const eye = CreateSphere("golemEye", { diameter: 0.4 * s, segments: 6 }, scene);
      eye.material = lavaMat;
      eye.position.set(side * 0.5 * s, 0.6 * s, 1.2 * s);
      eye.parent = neck;
    }

    // Lava mouth crack
    const mouth = CreateBox("golemMouth", { width: 0.8 * s, height: 0.15 * s, depth: 0.3 * s }, scene);
    mouth.material = lavaMat;
    mouth.position.set(0, 0.1 * s, 1.3 * s);
    mouth.parent = neck;

    // Horn-like crystal on head
    const headCrystal = CreateCylinder("golemHeadCrystal", { height: 1.5 * s, diameterTop: 0.04 * s, diameterBottom: 0.25 * s, tessellation: 6 }, scene);
    headCrystal.material = crystalMat;
    headCrystal.position.set(0, 1.5 * s, 0.3 * s);
    headCrystal.rotation.x = -0.3;
    headCrystal.parent = neck;

    // Tail – dragging rubble trail
    const tail = new TransformNode("golemTail", scene);
    tail.position.set(0, bodyH - 0.5 * s, -2 * s);
    tail.parent = root;

    for (let i = 0; i < 5; i++) {
      const chunk = CreateSphere("golemTailChunk" + i, { diameter: (1.2 - i * 0.18) * s, segments: 6 }, scene);
      chunk.material = i % 2 === 0 ? stoneMat : darkStoneMat;
      chunk.position.set(0, -0.3 * i * s, -0.9 * i * s);
      chunk.parent = tail;
    }

    // Tail crystal tip
    const tailCrystal = CreateCylinder("golemTailCrystal", { height: 1 * s, diameterTop: 0.04 * s, diameterBottom: 0.2 * s, tessellation: 6 }, scene);
    tailCrystal.material = crystalMat;
    tailCrystal.rotation.x = 1;
    tailCrystal.position.set(0, -1.5 * s, -4.5 * s);
    tailCrystal.parent = tail;

    // Massive stone/golem legs
    const legH = 2.8 * s;
    const makeGolemLeg = (name: string, x: number, z: number) => {
      const joint = new TransformNode(name, scene);
      joint.position.set(x, bodyH - 1 * s, z);
      joint.parent = root;

      const upper = CreateBox(name + "U", { width: 1.2 * s, height: legH * 0.5, depth: 1.2 * s }, scene);
      upper.material = stoneMat;
      upper.position.set(0, -legH * 0.25, 0);
      upper.parent = joint;

      const lower = CreateBox(name + "L", { width: 1 * s, height: legH * 0.45, depth: 1 * s }, scene);
      lower.material = darkStoneMat;
      lower.position.set(0, -legH * 0.6, 0);
      lower.parent = joint;

      // Flat stone foot
      const foot = CreateBox(name + "F", { width: 1.8 * s, height: 0.4 * s, depth: 2 * s }, scene);
      foot.material = darkStoneMat;
      foot.position.set(0, -legH * 0.85, 0.3 * s);
      foot.parent = joint;

      return joint;
    };

    const fl = makeGolemLeg("golemFL", -1.5 * s, 1.5 * s);
    const fr = makeGolemLeg("golemFR", 1.5 * s, 1.5 * s);
    const bl = makeGolemLeg("golemBL", -1.5 * s, -1.5 * s);
    const br = makeGolemLeg("golemBR", 1.5 * s, -1.5 * s);

    // Lava cracks glowing on body
    for (let i = 0; i < 3; i++) {
      const crack = CreateBox("golemCrack" + i, { width: 0.12 * s, height: 1.5 * s, depth: 0.12 * s }, scene);
      crack.material = lavaMat;
      const angle = (i / 3) * Math.PI * 2;
      crack.position.set(Math.cos(angle) * 1.6 * s, bodyH, Math.sin(angle) * 2 * s);
      crack.rotation.set(0, angle, 0.2);
      crack.parent = root;
    }

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
