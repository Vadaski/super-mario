// =============================================================================
// World 1-3 - Athletic / Treetop Level
// =============================================================================
// No ground — entire level is platforms, trees, and bridges
// Series of treetop platforms at various heights with gaps
// Moving platforms, Red Koopas, Paratroopas
// =============================================================================

import type { LevelData, EntitySpawn, SceneryItem, BlockContent } from './world-1-1.js';

const E = 0;   // EMPTY
const G = 1;   // GROUND
const B = 2;   // BRICK
const Q = 3;   // QUESTION
const S = 5;   // BLOCK (solid)
const F = 11;  // FLAGPOLE
const FT = 12; // FLAGPOLE_TOP
const C = 13;  // CASTLE

const W = 170; // level width in tiles
const HT = 15; // level height in tiles

function buildTiles(): number[][] {
  const tiles: number[][] = [];
  for (let r = 0; r < HT; r++) {
    tiles.push(new Array(W).fill(E));
  }

  // ──── Starting platform (ground to give player safe start) ────
  // Rows 13-14, cols 0-12
  for (let c = 0; c <= 12; c++) {
    tiles[13][c] = G;
    tiles[14][c] = G;
  }

  // ──── Tree-top platform 1: cols 10-18 at row 11 ────
  for (let c = 10; c <= 18; c++) {
    tiles[11][c] = S;
  }

  // ──── Floating platform: cols 21-25 at row 9 ────
  for (let c = 21; c <= 25; c++) {
    tiles[9][c] = S;
  }

  // Question blocks above platform 2
  tiles[5][22] = Q;
  tiles[5][24] = Q;

  // ──── Bridge section 1: cols 28-35 at row 10 (single row) ────
  for (let c = 28; c <= 35; c++) {
    tiles[10][c] = B;
  }

  // ──── Tree-top platform 3: cols 38-44 at row 8 ────
  for (let c = 38; c <= 44; c++) {
    tiles[8][c] = S;
  }

  // Question block with mushroom
  tiles[4][41] = Q;

  // ──── Small stepping platforms: cols 47-48, 50-51, 53-54 ────
  tiles[10][47] = S; tiles[10][48] = S;
  tiles[8][50] = S; tiles[8][51] = S;
  tiles[6][53] = S; tiles[6][54] = S;

  // ──── Wide platform: cols 57-66 at row 9 ────
  for (let c = 57; c <= 66; c++) {
    tiles[9][c] = S;
  }

  // Brick blocks on top of wide platform
  tiles[5][59] = B;
  tiles[5][60] = Q;
  tiles[5][61] = B;
  tiles[5][62] = Q;
  tiles[5][63] = B;

  // ──── Bridge section 2: cols 69-73 at row 11 ────
  for (let c = 69; c <= 73; c++) {
    tiles[11][c] = B;
  }

  // ──── Vertical gap with moving platform at ~col 76 (entity) ────

  // ──── Tree-top platform 4: cols 80-88 at row 8 ────
  for (let c = 80; c <= 88; c++) {
    tiles[8][c] = S;
  }

  // ──── Small platform: cols 91-93 at row 10 ────
  for (let c = 91; c <= 93; c++) {
    tiles[10][c] = S;
  }

  // ──── Tree-top platform 5: cols 96-104 at row 7 ────
  for (let c = 96; c <= 104; c++) {
    tiles[7][c] = S;
  }

  // Question blocks
  tiles[3][99] = Q;
  tiles[3][101] = Q;

  // ──── Bridge section 3: cols 107-112 at row 9 ────
  for (let c = 107; c <= 112; c++) {
    tiles[9][c] = B;
  }

  // ──── Horizontal moving platform area ~col 115 (entity) ────

  // ──── Tree-top platform 6: cols 118-126 at row 10 ────
  for (let c = 118; c <= 126; c++) {
    tiles[10][c] = S;
  }

  // ──── Small stepping stones: cols 129-130, 133-134 at row 8, 6 ────
  tiles[8][129] = S; tiles[8][130] = S;
  tiles[6][133] = S; tiles[6][134] = S;

  // ──── Pre-flagpole platform: cols 137-145 at row 9 ────
  for (let c = 137; c <= 145; c++) {
    tiles[9][c] = S;
  }

  // ──── Flagpole staircase: cols 148-155 ────
  // Ground restoration for the end area
  for (let c = 148; c <= W - 1; c++) {
    tiles[13][c] = G;
    tiles[14][c] = G;
  }

  // Ascending staircase
  tiles[12][148] = S;

  tiles[12][149] = S;
  tiles[11][149] = S;

  tiles[12][150] = S;
  tiles[11][150] = S;
  tiles[10][150] = S;

  tiles[12][151] = S;
  tiles[11][151] = S;
  tiles[10][151] = S;
  tiles[9][151] = S;

  tiles[12][152] = S;
  tiles[11][152] = S;
  tiles[10][152] = S;
  tiles[9][152] = S;
  tiles[8][152] = S;

  tiles[12][153] = S;
  tiles[11][153] = S;
  tiles[10][153] = S;
  tiles[9][153] = S;
  tiles[8][153] = S;
  tiles[7][153] = S;

  tiles[12][154] = S;
  tiles[11][154] = S;
  tiles[10][154] = S;
  tiles[9][154] = S;
  tiles[8][154] = S;
  tiles[7][154] = S;
  tiles[6][154] = S;

  tiles[12][155] = S;
  tiles[11][155] = S;
  tiles[10][155] = S;
  tiles[9][155] = S;
  tiles[8][155] = S;
  tiles[7][155] = S;
  tiles[6][155] = S;
  tiles[5][155] = S;

  // ──── Flagpole: col 156 ────
  tiles[4][156] = FT;
  for (let r = 5; r <= 12; r++) {
    tiles[r][156] = F;
  }

  // ──── Castle: cols 160-164 ────
  for (let r = 8; r <= 12; r++) {
    for (let c = 160; c <= 164; c++) {
      tiles[r][c] = C;
    }
  }
  // Castle turret
  tiles[6][161] = C; tiles[6][162] = C; tiles[6][163] = C;
  tiles[7][161] = C; tiles[7][162] = C; tiles[7][163] = C;

  return tiles;
}

// =============================================================================
// ENTITY SPAWNS
// =============================================================================

const entities: EntitySpawn[] = [
  // ── Goombas ──
  { type: 'goomba', x: 14 * 16, y: 10 * 16 },  // on platform 1
  { type: 'goomba', x: 60 * 16, y: 8 * 16 },    // on wide platform
  { type: 'goomba', x: 62 * 16, y: 8 * 16 },    // on wide platform

  // ── Red Koopas (patrol without falling off) ──
  { type: 'koopa-red', x: 23 * 16, y: 7 * 16 },   // on platform 2
  { type: 'koopa-red', x: 40 * 16, y: 6 * 16 },   // on platform 3
  { type: 'koopa-red', x: 100 * 16, y: 5 * 16 },  // on platform 5
  { type: 'koopa-red', x: 122 * 16, y: 8 * 16 },  // on platform 6

  // ── Paratroopas (bouncing up and down) ──
  { type: 'paratroopa', x: 32 * 16, y: 6 * 16 },  // above bridge 1
  { type: 'paratroopa', x: 72 * 16, y: 7 * 16 },  // above bridge 2
  { type: 'paratroopa', x: 109 * 16, y: 5 * 16 }, // above bridge 3

  // ── Moving Platforms ──
  // Vertical platform in the gap area (cols ~76)
  {
    type: 'platform-v', x: 76 * 16, y: 6 * 16,
    minPos: 4 * 16, maxPos: 12 * 16,
  },
  // Horizontal platform bridging a gap (cols ~115)
  {
    type: 'platform-h', x: 114 * 16, y: 8 * 16,
    minPos: 113 * 16, maxPos: 118 * 16,
  },
  // Vertical platform near stepping stones
  {
    type: 'platform-v', x: 46 * 16, y: 10 * 16,
    minPos: 5 * 16, maxPos: 12 * 16,
  },
];

// =============================================================================
// SCENERY
// =============================================================================

function buildScenery(): SceneryItem[] {
  const items: SceneryItem[] = [];
  const cloudY = 2 * 16;

  // Clouds scattered across the level
  for (let base = 0; base < W; base += 32) {
    items.push({ type: 'cloud', x: (base + 5) * 16, y: cloudY });
    items.push({ type: 'cloud', x: (base + 6) * 16, y: cloudY });
    items.push({ type: 'cloud', x: (base + 18) * 16, y: 3 * 16 });
    items.push({ type: 'cloud', x: (base + 25) * 16, y: cloudY });
  }

  return items;
}

// =============================================================================
// BLOCK CONTENTS
// =============================================================================

export const blockContents_1_3: BlockContent[] = [
  // Question blocks above platform 2
  { col: 22, row: 5, content: 'coin' },
  { col: 24, row: 5, content: 'coin' },

  // Mushroom/fire-flower on platform 3
  { col: 41, row: 4, content: 'mushroom' },

  // Blocks on wide platform
  { col: 60, row: 5, content: 'coin' },
  { col: 62, row: 5, content: 'coin' },

  // Question blocks on platform 5
  { col: 99, row: 3, content: 'coin' },
  { col: 101, row: 3, content: 'coin' },
];

// =============================================================================
// COIN PICKUPS (floating coins above platforms)
// =============================================================================
// Add coin pickup entities as part of the entities array
// We'll represent them as scenery-positioned coins via block contents
// placed in mid-air (the game handles CoinPickup entities separately)

// =============================================================================
// ASSEMBLED LEVEL DATA
// =============================================================================

export const WORLD_1_3: LevelData = {
  width: W,
  height: HT,
  tiles: buildTiles(),
  entities,
  scenery: buildScenery(),
  startX: 3 * 16,
  startY: 12 * 16,
  flagX: 156 * 16,
  castleX: 160 * 16,
};
