import { ObstacleData } from "./Obstacle";

/** Predefined map layout: a park/playground with hiding spots */
export const PARK_MAP: ObstacleData[] = [
  // Perimeter walls
  { type: "wall", x: 0, z: -14, width: 30, height: 2.5, depth: 0.3 },
  { type: "wall", x: 0, z: 14, width: 30, height: 2.5, depth: 0.3 },
  { type: "wall", x: -15, z: 0, width: 0.3, height: 2.5, depth: 28 },
  { type: "wall", x: 15, z: 0, width: 0.3, height: 2.5, depth: 28 },

  // Central structures - near the can
  { type: "wall", x: -3, z: -3, width: 2, height: 2, depth: 0.3 },
  { type: "wall", x: 3, z: -3, width: 2, height: 2, depth: 0.3 },

  // Scattered hiding spots
  { type: "crate", x: -7, z: -5 },
  { type: "crate", x: -7, z: -4 },
  { type: "crate", x: 8, z: 6 },
  { type: "crate", x: 9, z: 6 },
  { type: "crate", x: 8, z: 7 },

  // Trees
  { type: "tree", x: -10, z: -8 },
  { type: "tree", x: -5, z: 8 },
  { type: "tree", x: 6, z: -9 },
  { type: "tree", x: 11, z: 3 },
  { type: "tree", x: -11, z: 4 },
  { type: "tree", x: 3, z: 10 },
  { type: "tree", x: -8, z: 10 },

  // L-shaped wall
  { type: "wall", x: -6, z: 3, width: 3, height: 2, depth: 0.3 },
  { type: "wall", x: -4.65, z: 4.5, width: 0.3, height: 2, depth: 3 },

  // Another hiding structure
  { type: "wall", x: 10, z: -4, width: 0.3, height: 2, depth: 4 },
  { type: "wall", x: 12, z: -4, width: 0.3, height: 2, depth: 4 },
  { type: "wall", x: 11, z: -6, width: 2, height: 2, depth: 0.3 },
];

/** Spawn points for hiders (away from center can) */
export const HIDER_SPAWNS = [
  { x: -12, z: -10 },
  { x: 12, z: -10 },
  { x: -12, z: 10 },
  { x: 12, z: 10 },
  { x: -10, z: 0 },
  { x: 10, z: 0 },
];

/** Seeker spawn (near the can at center) */
export const SEEKER_SPAWN = { x: 0, z: 1.5 };

/** Can position */
export const CAN_POSITION = { x: 0, z: 0 };
