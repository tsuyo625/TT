import { TILE_SIZE } from "../config/Constants";

// Tile IDs: 0=empty, 1=ground, 2=wall, 3=platform(one-way), 4=spike, 5=goal
export const LEVEL_WIDTH_TILES = 120;
export const LEVEL_HEIGHT_TILES = 20;

export const LEVEL_WIDTH_PX = LEVEL_WIDTH_TILES * TILE_SIZE;
export const LEVEL_HEIGHT_PX = LEVEL_HEIGHT_TILES * TILE_SIZE;

// Enemy placement definitions
export interface EnemyPlacement {
  type: "patrol" | "shooter";
  tileX: number;
  tileY: number;
  patrolRange?: number;
}

// Checkpoint definitions
export interface Checkpoint {
  tileX: number;
  tileY: number;
}

// Build the prototype level procedurally for clarity
function buildLevel(): number[][] {
  const map: number[][] = [];
  for (let r = 0; r < LEVEL_HEIGHT_TILES; r++) {
    map.push(new Array(LEVEL_WIDTH_TILES).fill(0));
  }

  const set = (r: number, c: number, val: number) => {
    if (r >= 0 && r < LEVEL_HEIGHT_TILES && c >= 0 && c < LEVEL_WIDTH_TILES) {
      map[r][c] = val;
    }
  };

  const fillRow = (r: number, cStart: number, cEnd: number, val: number) => {
    for (let c = cStart; c <= cEnd; c++) set(r, c, val);
  };

  // === Bottom row: solid ground base ===
  // Row 19 (bottom) and Row 18 are ground everywhere except gaps
  fillRow(19, 0, 119, 1);
  fillRow(18, 0, 119, 1);

  // === Section 1 (tiles 0-30): Tutorial zone ===
  // Left wall
  for (let r = 0; r < 18; r++) set(r, 0, 2);

  // Gap at tiles 12-13 (small pit)
  set(18, 12, 0); set(18, 13, 0);
  set(19, 12, 0); set(19, 13, 0);

  // Small platform above the gap
  fillRow(15, 10, 14, 3);

  // Gap at tiles 22-23
  set(18, 22, 0); set(18, 23, 0);
  set(19, 22, 0); set(19, 23, 0);

  // === Section 2 (tiles 30-60): Platforming challenge ===
  // Raised ground section
  fillRow(16, 32, 38, 1);
  fillRow(17, 32, 38, 1);

  // Vertical platforms
  fillRow(14, 35, 38, 3);
  fillRow(11, 40, 44, 3);
  fillRow(14, 46, 50, 3);

  // Gap in main floor
  for (let c = 40; c <= 45; c++) {
    set(18, c, 0); set(19, c, 0);
  }

  // Spikes below the platforming section
  for (let c = 41; c <= 44; c++) {
    set(17, c, 4);
  }

  // Bridge platform over the gap
  fillRow(16, 42, 44, 3);

  // More platforms going up
  fillRow(12, 52, 55, 3);
  fillRow(9, 56, 59, 3);
  fillRow(12, 58, 62, 3);

  // === Section 3 (tiles 60-90): Combat zone ===
  // Checkpoint area - slightly elevated ground
  fillRow(16, 60, 70, 1);
  fillRow(17, 60, 70, 1);

  // Combat platforms
  fillRow(14, 72, 78, 3);
  fillRow(11, 75, 82, 3);
  fillRow(14, 80, 86, 3);

  // Gap
  for (let c = 74; c <= 76; c++) {
    set(18, c, 0); set(19, c, 0);
  }

  // Spikes in combat zone
  for (let c = 84; c <= 86; c++) {
    set(17, c, 4);
  }

  // === Section 4 (tiles 90-120): Final gauntlet ===
  // Narrow platforms
  fillRow(15, 92, 95, 3);
  fillRow(12, 96, 99, 3);
  fillRow(15, 100, 103, 3);

  // Gap in floor
  for (let c = 94; c <= 100; c++) {
    set(18, c, 0); set(19, c, 0);
  }

  // Spikes
  for (let c = 95; c <= 99; c++) {
    set(17, c, 4);
  }

  // Final platform to goal
  fillRow(16, 108, 116, 1);
  fillRow(17, 108, 116, 1);

  // Goal
  set(15, 115, 5);

  // Right wall
  for (let r = 0; r < 18; r++) set(r, 119, 2);

  return map;
}

export const PROTOTYPE_LEVEL: number[][] = buildLevel();

export const PROTOTYPE_ENEMIES: EnemyPlacement[] = [
  // Section 1: Tutorial
  { type: "patrol", tileX: 16, tileY: 17, patrolRange: 3 },

  // Section 2: Platforming
  { type: "shooter", tileX: 50, tileY: 17 },
  { type: "patrol", tileX: 36, tileY: 15, patrolRange: 2 },

  // Section 3: Combat
  { type: "patrol", tileX: 65, tileY: 15, patrolRange: 4 },
  { type: "patrol", tileX: 75, tileY: 13, patrolRange: 3 },
  { type: "shooter", tileX: 82, tileY: 10 },

  // Section 4: Gauntlet
  { type: "patrol", tileX: 100, tileY: 14, patrolRange: 2 },
  { type: "shooter", tileX: 110, tileY: 15 },
  { type: "patrol", tileX: 113, tileY: 15, patrolRange: 2 },
];

export const CHECKPOINTS: Checkpoint[] = [
  { tileX: 2, tileY: 17 },   // Start
  { tileX: 62, tileY: 15 },  // Section 3 start
];

export const PLAYER_START = { tileX: 2, tileY: 17 };
