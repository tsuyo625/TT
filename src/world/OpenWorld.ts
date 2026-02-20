import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { AssetFactory } from "../core/AssetFactory";

export interface DoorInfo {
  pivot: TransformNode;
  isOpen: boolean;
  currentAngle: number;
}

/** Axis-aligned bounding box for indoor detection (world-space) */
export interface BuildingBounds {
  minX: number; maxX: number;
  minZ: number; maxZ: number;
  maxY: number;
}

export interface ElevatorInfo {
  platform: Mesh;
  /** world-space position of the elevator shaft center */
  worldX: number;
  worldZ: number;
  floorH: number;
  numFloors: number;
  currentFloor: number;
  targetFloor: number;
  currentY: number;
  moving: boolean;
}

function mat(scene: Scene, r: number, g: number, b: number): StandardMaterial {
  const m = new StandardMaterial("m" + Math.random().toString(36).slice(2), scene);
  m.diffuseColor = new Color3(r, g, b);
  return m;
}

export class OpenWorld {
  readonly doors: DoorInfo[] = [];
  readonly elevators: ElevatorInfo[] = [];
  readonly buildingBounds: BuildingBounds[] = [];

  constructor(scene: Scene, shadowGen: ShadowGenerator) {
    this.buildGround(scene);
    this.buildTerrain(scene, shadowGen);
    this.buildRoads(scene);
    this.buildHouses(scene, shadowGen);
    this.buildBuildings(scene, shadowGen);
    this.buildShops(scene, shadowGen);
    this.buildPark(scene, shadowGen);
    this.buildTrees(scene, shadowGen);
    this.buildStreetLamps(scene);
    this.buildFences(scene);
    this.buildSewer(scene);
    this.buildManholes(scene);
  }

  private buildGround(scene: Scene): void {
    const ground = CreateGround("ground", { width: 200, height: 200, subdivisions: 4 }, scene);
    const groundMat = new StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new Color3(0.4, 0.55, 0.3);
    ground.material = groundMat;
    ground.receiveShadows = true;
    ground.checkCollisions = true;
  }

  /* ---- Terrain: hills, mountains, rocky outcrops ---- */
  private buildTerrain(scene: Scene, shadowGen: ShadowGenerator): void {
    const grassMat = mat(scene, 0.35, 0.5, 0.25);
    const rockMat = mat(scene, 0.5, 0.48, 0.44);
    const snowMat = mat(scene, 0.92, 0.94, 0.96);
    const dirtMat = mat(scene, 0.45, 0.38, 0.28);

    // ── Large mountain (far NE corner) ──
    const mt1 = CreateSphere("mountain1", { diameterX: 40, diameterY: 22, diameterZ: 35, segments: 12 }, scene);
    mt1.material = rockMat;
    mt1.position.set(70, 0, 65);
    mt1.scaling.set(1, 1, 1);
    mt1.receiveShadows = true;
    mt1.checkCollisions = true;
    shadowGen.addShadowCaster(mt1);

    // Snow cap
    const snow1 = CreateSphere("snow1", { diameterX: 18, diameterY: 6, diameterZ: 16, segments: 10 }, scene);
    snow1.material = snowMat;
    snow1.position.set(70, 10, 65);
    shadowGen.addShadowCaster(snow1);

    // ── Medium mountain (far NW) ──
    const mt2 = CreateSphere("mountain2", { diameterX: 30, diameterY: 16, diameterZ: 28, segments: 10 }, scene);
    mt2.material = rockMat;
    mt2.position.set(-65, 0, 70);
    mt2.receiveShadows = true;
    mt2.checkCollisions = true;
    shadowGen.addShadowCaster(mt2);

    const snow2 = CreateSphere("snow2", { diameterX: 14, diameterY: 4, diameterZ: 12, segments: 8 }, scene);
    snow2.material = snowMat;
    snow2.position.set(-65, 7, 70);

    // ── Rocky hill (far south) ──
    const mt3 = CreateSphere("mountain3", { diameterX: 35, diameterY: 14, diameterZ: 30, segments: 10 }, scene);
    mt3.material = rockMat;
    mt3.position.set(10, 0, -70);
    mt3.receiveShadows = true;
    mt3.checkCollisions = true;
    shadowGen.addShadowCaster(mt3);

    // ── Rolling hills (gentle mounds scattered around outskirts) ──
    const hills = [
      { x: 55, z: -40, sx: 20, sy: 5, sz: 18 },
      { x: -55, z: -45, sx: 22, sy: 4, sz: 20 },
      { x: 60, z: 30, sx: 16, sy: 3.5, sz: 14 },
      { x: -60, z: 20, sx: 18, sy: 4, sz: 16 },
      { x: 75, z: -10, sx: 24, sy: 6, sz: 20 },
      { x: -75, z: -15, sx: 20, sy: 5, sz: 18 },
      { x: 30, z: 70, sx: 22, sy: 4.5, sz: 20 },
      { x: -30, z: -65, sx: 18, sy: 3.5, sz: 16 },
      { x: 0, z: 80, sx: 30, sy: 5, sz: 25 },
      { x: 80, z: 50, sx: 16, sy: 3, sz: 14 },
    ];
    for (let i = 0; i < hills.length; i++) {
      const h = hills[i];
      const hill = CreateSphere(`hill${i}`, { diameterX: h.sx, diameterY: h.sy, diameterZ: h.sz, segments: 10 }, scene);
      hill.material = grassMat;
      hill.position.set(h.x, 0, h.z);
      hill.receiveShadows = true;
      hill.checkCollisions = true;
      shadowGen.addShadowCaster(hill);
    }

    // ── Small rocky outcrops (near roads, decorative) ──
    const outcrops = [
      { x: 48, z: 20, s: 2.5 },
      { x: -48, z: -20, s: 3 },
      { x: 55, z: -15, s: 2 },
      { x: -55, z: 45, s: 2.8 },
      { x: 70, z: -30, s: 1.8 },
    ];
    for (let i = 0; i < outcrops.length; i++) {
      const o = outcrops[i];
      const rock = CreateSphere(`rock${i}`, { diameterX: o.s * 2, diameterY: o.s * 1.2, diameterZ: o.s * 1.8, segments: 6 }, scene);
      rock.material = rockMat;
      rock.position.set(o.x, 0, o.z);
      rock.checkCollisions = true;
      shadowGen.addShadowCaster(rock);
    }

    // ── Dirt patches (transition areas near hills) ──
    const dirtPatches = [
      { x: 55, z: -38, w: 8, d: 6 },
      { x: -55, z: -43, w: 7, d: 5 },
      { x: 68, z: 63, w: 10, d: 8 },
      { x: -63, z: 68, w: 8, d: 7 },
    ];
    for (let i = 0; i < dirtPatches.length; i++) {
      const p = dirtPatches[i];
      const patch = CreateBox(`dirt${i}`, { width: p.w, height: 0.02, depth: p.d }, scene);
      patch.material = dirtMat;
      patch.position.set(p.x, 0.015, p.z);
    }
  }

  /* ---- Underground sewer system ---- */
  private buildSewer(scene: Scene): void {
    const tunnelMat = mat(scene, 0.3, 0.3, 0.32);
    const waterMat = mat(scene, 0.2, 0.35, 0.3);
    waterMat.alpha = 0.7;
    const pipeMat = mat(scene, 0.35, 0.32, 0.28);

    const sewerY = -2.5; // underground level
    const tunnelH = 2.5;
    const tunnelW = 3;

    // ── Main sewer tunnel (runs E-W under main road) ──
    // Floor
    const floorEW = CreateBox("sewerFloorEW", { width: 80, height: 0.15, depth: tunnelW }, scene);
    floorEW.material = tunnelMat;
    floorEW.position.set(0, sewerY, 0);
    floorEW.checkCollisions = true;

    // Walls
    const wallEW_L = CreateBox("sewerWallEW_L", { width: 80, height: tunnelH, depth: 0.2 }, scene);
    wallEW_L.material = tunnelMat;
    wallEW_L.position.set(0, sewerY + tunnelH / 2, -tunnelW / 2);
    wallEW_L.checkCollisions = true;

    const wallEW_R = CreateBox("sewerWallEW_R", { width: 80, height: tunnelH, depth: 0.2 }, scene);
    wallEW_R.material = tunnelMat;
    wallEW_R.position.set(0, sewerY + tunnelH / 2, tunnelW / 2);
    wallEW_R.checkCollisions = true;

    // Ceiling
    const ceilEW = CreateBox("sewerCeilEW", { width: 80, height: 0.2, depth: tunnelW + 0.4 }, scene);
    ceilEW.material = tunnelMat;
    ceilEW.position.set(0, sewerY + tunnelH, 0);
    ceilEW.checkCollisions = true;

    // Water stream
    const waterEW = CreateBox("waterEW", { width: 78, height: 0.08, depth: tunnelW * 0.6 }, scene);
    waterEW.material = waterMat;
    waterEW.position.set(0, sewerY + 0.2, 0);

    // ── Cross tunnel (runs N-S) ──
    const floorNS = CreateBox("sewerFloorNS", { width: tunnelW, height: 0.15, depth: 60 }, scene);
    floorNS.material = tunnelMat;
    floorNS.position.set(0, sewerY, 0);
    floorNS.checkCollisions = true;

    const wallNS_L = CreateBox("sewerWallNS_L", { width: 0.2, height: tunnelH, depth: 60 }, scene);
    wallNS_L.material = tunnelMat;
    wallNS_L.position.set(-tunnelW / 2, sewerY + tunnelH / 2, 0);
    wallNS_L.checkCollisions = true;

    const wallNS_R = CreateBox("sewerWallNS_R", { width: 0.2, height: tunnelH, depth: 60 }, scene);
    wallNS_R.material = tunnelMat;
    wallNS_R.position.set(tunnelW / 2, sewerY + tunnelH / 2, 0);
    wallNS_R.checkCollisions = true;

    const ceilNS = CreateBox("sewerCeilNS", { width: tunnelW + 0.4, height: 0.2, depth: 60 }, scene);
    ceilNS.material = tunnelMat;
    ceilNS.position.set(0, sewerY + tunnelH, 0);
    ceilNS.checkCollisions = true;

    const waterNS = CreateBox("waterNS", { width: tunnelW * 0.6, height: 0.08, depth: 58 }, scene);
    waterNS.material = waterMat;
    waterNS.position.set(0, sewerY + 0.2, 0);

    // ── Sewer side pipes (decorative) ──
    const pipePositions = [
      { x: -1.3, z: -10 }, { x: 1.3, z: -10 },
      { x: -1.3, z: 10 }, { x: 1.3, z: 10 },
      { x: -1.3, z: -20 }, { x: 1.3, z: -20 },
      { x: 15, z: -1.3 }, { x: 15, z: 1.3 },
      { x: -15, z: -1.3 }, { x: -15, z: 1.3 },
      { x: 30, z: -1.3 }, { x: 30, z: 1.3 },
      { x: -30, z: -1.3 }, { x: -30, z: 1.3 },
    ];
    for (let i = 0; i < pipePositions.length; i++) {
      const p = pipePositions[i];
      const pipe = CreateCylinder(`sewerPipe${i}`, { height: 0.6, diameter: 0.35, tessellation: 8 }, scene);
      pipe.material = pipeMat;
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(p.x, sewerY + 0.8, p.z);
    }

    // ── Sewer lights (dim glow marks at intervals) ──
    const lightMat = mat(scene, 0.6, 0.55, 0.3);
    const lightPositions = [
      { x: 0, z: 0 }, { x: 10, z: 0 }, { x: -10, z: 0 },
      { x: 20, z: 0 }, { x: -20, z: 0 }, { x: 30, z: 0 }, { x: -30, z: 0 },
      { x: 0, z: 10 }, { x: 0, z: -10 }, { x: 0, z: 20 }, { x: 0, z: -20 },
    ];
    for (let i = 0; i < lightPositions.length; i++) {
      const lp = lightPositions[i];
      const lamp = CreateBox(`sewerLight${i}`, { width: 0.3, height: 0.1, depth: 0.3 }, scene);
      lamp.material = lightMat;
      lamp.position.set(lp.x, sewerY + tunnelH - 0.15, lp.z);
    }
  }

  /* ---- Manholes (surface openings to sewer) ---- */
  private buildManholes(scene: Scene): void {
    const coverMat = mat(scene, 0.35, 0.35, 0.35);
    const rimMat = mat(scene, 0.3, 0.3, 0.3);
    const ladderMat = mat(scene, 0.4, 0.38, 0.3);

    // Manhole locations (on roads/sidewalks)
    const manholes = [
      { x: 0, z: 0 },
      { x: 15, z: 0 },
      { x: -15, z: 0 },
      { x: 0, z: 15 },
      { x: 0, z: -15 },
    ];

    for (let i = 0; i < manholes.length; i++) {
      const mh = manholes[i];

      // Manhole cover (circular on surface)
      const cover = CreateCylinder(`mhCover${i}`, { height: 0.06, diameter: 1.2, tessellation: 16 }, scene);
      cover.material = coverMat;
      cover.position.set(mh.x, 0.04, mh.z);

      // Rim
      const rim = CreateCylinder(`mhRim${i}`, { height: 0.1, diameter: 1.4, tessellation: 16 }, scene);
      rim.material = rimMat;
      rim.position.set(mh.x, 0.02, mh.z);

      // Cross pattern on cover (decorative)
      const bar1 = CreateBox(`mhBar1_${i}`, { width: 0.08, height: 0.07, depth: 1.0 }, scene);
      bar1.material = rimMat;
      bar1.position.set(mh.x, 0.08, mh.z);

      const bar2 = CreateBox(`mhBar2_${i}`, { width: 1.0, height: 0.07, depth: 0.08 }, scene);
      bar2.material = rimMat;
      bar2.position.set(mh.x, 0.08, mh.z);

      // Shaft going down to sewer
      const shaftWalls = [
        { dx: 0, dz: -0.55, w: 1.1, d: 0.1 },
        { dx: 0, dz: 0.55, w: 1.1, d: 0.1 },
        { dx: -0.55, dz: 0, w: 0.1, d: 1.0 },
        { dx: 0.55, dz: 0, w: 0.1, d: 1.0 },
      ];
      for (let j = 0; j < shaftWalls.length; j++) {
        const sw = shaftWalls[j];
        const wall = CreateBox(`mhShaft${i}_${j}`, { width: sw.w, height: 2.5, depth: sw.d }, scene);
        wall.material = rimMat;
        wall.position.set(mh.x + sw.dx, -1.25, mh.z + sw.dz);
        wall.checkCollisions = true;
      }

      // Ladder rungs going down
      for (let r = 0; r < 6; r++) {
        const rung = CreateBox(`mhRung${i}_${r}`, { width: 0.5, height: 0.06, depth: 0.06 }, scene);
        rung.material = ladderMat;
        rung.position.set(mh.x, -0.2 - r * 0.4, mh.z - 0.48);
        rung.checkCollisions = true;
      }
    }
  }

  private buildRoads(scene: Scene): void {
    // Main east-west road
    const road1 = AssetFactory.createRoad(scene, 200, 6);
    road1.position.z = 0;

    // Main north-south road
    const road2 = AssetFactory.createRoad(scene, 6, 200);
    road2.position.x = 0;

    // Secondary roads
    const road3 = AssetFactory.createRoad(scene, 200, 4);
    road3.position.z = 25;

    const road4 = AssetFactory.createRoad(scene, 200, 4);
    road4.position.z = -25;

    const road5 = AssetFactory.createRoad(scene, 4, 200);
    road5.position.x = 30;

    const road6 = AssetFactory.createRoad(scene, 4, 200);
    road6.position.x = -30;

    // Intersection crossing markings (white lines)
    const whiteMat = new StandardMaterial("whiteLine", scene);
    whiteMat.diffuseColor = new Color3(0.9, 0.9, 0.9);

    const crossings = [
      { x: 0, z: 0 },
      { x: 30, z: 0 },
      { x: -30, z: 0 },
      { x: 0, z: 25 },
      { x: 0, z: -25 },
    ];
    for (const c of crossings) {
      for (let i = -2; i <= 2; i++) {
        const stripe = CreateBox("stripe", { width: 0.4, height: 0.025, depth: 1.2 }, scene);
        stripe.material = whiteMat;
        stripe.position.set(c.x + i * 1.2, 0.02, c.z);
      }
    }
  }

  private buildHouses(scene: Scene, shadowGen: ShadowGenerator): void {
    const houses = [
      { x: 10, z: 10, w: 5, h: 3.5, d: 4, wall: new Color3(0.9, 0.85, 0.75), roof: new Color3(0.6, 0.25, 0.2), ry: 0 },
      { x: 20, z: 10, w: 4, h: 3, d: 5, wall: new Color3(0.85, 0.9, 0.85), roof: new Color3(0.3, 0.45, 0.3), ry: 0 },
      { x: 10, z: -10, w: 6, h: 4, d: 5, wall: new Color3(0.95, 0.9, 0.8), roof: new Color3(0.5, 0.3, 0.15), ry: Math.PI },
      { x: 22, z: -12, w: 5, h: 3, d: 4, wall: new Color3(0.8, 0.8, 0.9), roof: new Color3(0.35, 0.35, 0.5), ry: Math.PI },
      { x: -10, z: 10, w: 5, h: 3.5, d: 5, wall: new Color3(0.95, 0.92, 0.85), roof: new Color3(0.65, 0.3, 0.15), ry: 0 },
      { x: -20, z: 12, w: 4.5, h: 3, d: 4, wall: new Color3(0.88, 0.85, 0.82), roof: new Color3(0.4, 0.25, 0.15), ry: 0 },
      { x: -12, z: -10, w: 5, h: 3.5, d: 4.5, wall: new Color3(0.9, 0.88, 0.82), roof: new Color3(0.55, 0.2, 0.15), ry: Math.PI },
      { x: -22, z: -11, w: 4, h: 3, d: 5, wall: new Color3(0.85, 0.82, 0.75), roof: new Color3(0.3, 0.3, 0.35), ry: Math.PI },
      // Far area houses
      { x: 15, z: 35, w: 5, h: 3, d: 4, wall: new Color3(0.92, 0.88, 0.8), roof: new Color3(0.5, 0.25, 0.2), ry: 0 },
      { x: -15, z: 35, w: 4.5, h: 3.5, d: 5, wall: new Color3(0.85, 0.9, 0.85), roof: new Color3(0.35, 0.5, 0.3), ry: 0 },
      { x: 15, z: -35, w: 5, h: 3, d: 4, wall: new Color3(0.9, 0.85, 0.8), roof: new Color3(0.6, 0.3, 0.2), ry: Math.PI },
      { x: -15, z: -35, w: 4, h: 3, d: 5, wall: new Color3(0.88, 0.88, 0.82), roof: new Color3(0.4, 0.3, 0.2), ry: Math.PI },
    ];

    for (const h of houses) {
      const { root: house, doorPivot } = AssetFactory.createHouse(scene, h.w, h.h, h.d, h.wall, h.roof);
      house.position.set(h.x, 0, h.z);
      house.rotation.y = h.ry;
      house.getChildMeshes().forEach((m) => shadowGen.addShadowCaster(m));
      this.doors.push({ pivot: doorPivot, isOpen: false, currentAngle: 0 });
      this.buildingBounds.push({
        minX: h.x - h.w / 2, maxX: h.x + h.w / 2,
        minZ: h.z - h.d / 2, maxZ: h.z + h.d / 2,
        maxY: h.h,
      });
    }
  }

  private buildBuildings(scene: Scene, shadowGen: ShadowGenerator): void {
    const buildings = [
      { x: 40, z: 10, w: 8, h: 12, d: 8, color: new Color3(0.7, 0.7, 0.75), ry: 0 },
      { x: 40, z: -10, w: 6, h: 8, d: 6, color: new Color3(0.75, 0.7, 0.65), ry: 0 },
      { x: -40, z: 10, w: 7, h: 10, d: 7, color: new Color3(0.65, 0.65, 0.7), ry: Math.PI },
      { x: -40, z: -12, w: 8, h: 15, d: 6, color: new Color3(0.72, 0.72, 0.72), ry: Math.PI },
      { x: 40, z: 35, w: 10, h: 10, d: 8, color: new Color3(0.68, 0.7, 0.72), ry: 0 },
      { x: -40, z: 35, w: 7, h: 8, d: 7, color: new Color3(0.75, 0.72, 0.68), ry: Math.PI },
    ];

    for (const b of buildings) {
      const result = AssetFactory.createBuilding(scene, b.w, b.h, b.d, b.color);
      result.root.position.set(b.x, 0, b.z);
      result.root.rotation.y = b.ry;
      result.root.getChildMeshes().forEach((m) => shadowGen.addShadowCaster(m));
      this.doors.push({ pivot: result.doorPivot, isOpen: false, currentAngle: 0 });

      // Compute world-space elevator position accounting for rotation
      const cosR = Math.cos(b.ry);
      const sinR = Math.sin(b.ry);
      const localX = result.elevShaftX;
      const localZ = result.elevShaftZ;
      this.elevators.push({
        platform: result.elevPlatform,
        worldX: b.x + localX * cosR - localZ * sinR,
        worldZ: b.z + localX * sinR + localZ * cosR,
        floorH: result.floorH,
        numFloors: result.numFloors,
        currentFloor: 0,
        targetFloor: 0,
        currentY: 0.08,
        moving: false,
      });

      this.buildingBounds.push({
        minX: b.x - b.w / 2, maxX: b.x + b.w / 2,
        minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2,
        maxY: b.h,
      });
    }
  }

  private buildShops(scene: Scene, shadowGen: ShadowGenerator): void {
    const shops = [
      { x: 8, z: -4, ry: Math.PI },
      { x: -8, z: 4, ry: 0 },
      { x: 35, z: -4, ry: Math.PI },
    ];

    for (const s of shops) {
      const shop = AssetFactory.createShop(scene);
      shop.position.set(s.x, 0, s.z);
      shop.rotation.y = s.ry;
      shop.getChildMeshes().forEach((m) => shadowGen.addShadowCaster(m));
    }
  }

  private buildPark(scene: Scene, shadowGen: ShadowGenerator): void {
    // Park area with benches and trees around x=-5, z=35
    const parkTrees = [
      { x: -5, z: 38 }, { x: -8, z: 32 }, { x: -2, z: 32 },
      { x: -9, z: 38 }, { x: -1, z: 38 },
    ];
    for (const t of parkTrees) {
      const tree = AssetFactory.createTree(scene);
      tree.position.set(t.x, 0, t.z);
      tree.getChildMeshes().forEach((m) => shadowGen.addShadowCaster(m));
    }

    const benches = [
      { x: -5, z: 34, ry: 0 },
      { x: -5, z: 36, ry: Math.PI },
      { x: -3, z: 35, ry: Math.PI / 2 },
    ];
    for (const b of benches) {
      const bench = AssetFactory.createBench(scene);
      bench.position.set(b.x, 0, b.z);
      bench.rotation.y = b.ry;
    }
  }

  private buildTrees(scene: Scene, shadowGen: ShadowGenerator): void {
    // Scatter trees along roads and in open areas
    const treePositions = [
      { x: 5, z: 5 }, { x: -5, z: -5 }, { x: 5, z: -5 }, { x: -5, z: 5 },
      { x: 15, z: 5 }, { x: -15, z: 5 }, { x: 15, z: -5 }, { x: -15, z: -5 },
      { x: 25, z: 5 }, { x: -25, z: 5 }, { x: 25, z: -5 }, { x: -25, z: -5 },
      { x: 5, z: 20 }, { x: -5, z: 20 }, { x: 5, z: -20 }, { x: -5, z: -20 },
      { x: 25, z: 20 }, { x: -25, z: 20 },
      { x: 50, z: 5 }, { x: -50, z: 5 }, { x: 50, z: -5 }, { x: -50, z: -5 },
      { x: 50, z: 20 }, { x: -50, z: 20 }, { x: 50, z: -20 }, { x: -50, z: -20 },
      { x: 50, z: 40 }, { x: -50, z: 40 }, { x: 50, z: -40 }, { x: -50, z: -40 },
      // Trees on hills
      { x: 58, z: -38 }, { x: 62, z: -42 },
      { x: -58, z: -43 }, { x: -52, z: -47 },
      { x: 65, z: 28 }, { x: 55, z: 32 },
    ];

    for (const t of treePositions) {
      const tree = AssetFactory.createTree(scene);
      tree.position.set(t.x, 0, t.z);
      tree.getChildMeshes().forEach((m) => shadowGen.addShadowCaster(m));
    }
  }

  private buildStreetLamps(scene: Scene): void {
    const lampPositions = [
      { x: 4, z: 4 }, { x: 4, z: -4 }, { x: -4, z: 4 }, { x: -4, z: -4 },
      { x: 15, z: 4 }, { x: 15, z: -4 }, { x: -15, z: 4 }, { x: -15, z: -4 },
      { x: 25, z: 4 }, { x: -25, z: 4 },
      { x: 4, z: 15 }, { x: -4, z: 15 }, { x: 4, z: -15 }, { x: -4, z: -15 },
      { x: 35, z: 4 }, { x: -35, z: 4 }, { x: 4, z: 28 }, { x: -4, z: 28 },
      { x: 4, z: -28 }, { x: -4, z: -28 },
    ];

    for (const p of lampPositions) {
      const lamp = AssetFactory.createStreetLamp(scene);
      lamp.position.set(p.x, 0, p.z);
    }
  }

  private buildFences(scene: Scene): void {
    // Park fence
    const fenceSegments = [
      { x: -5, z: 30, w: 12, ry: 0 },
      { x: -5, z: 40, w: 12, ry: 0 },
      { x: -11, z: 35, w: 10, ry: Math.PI / 2 },
      { x: 1, z: 35, w: 10, ry: Math.PI / 2 },
    ];

    for (const f of fenceSegments) {
      const fence = AssetFactory.createFence(scene, f.w);
      fence.position.set(f.x, 0, f.z);
      fence.rotation.y = f.ry;
    }
  }
}
