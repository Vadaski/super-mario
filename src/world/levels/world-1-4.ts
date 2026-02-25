// =============================================================================
// World 1-4 - Castle / Bowser Level
// =============================================================================
// Dark castle with fire bars, lava, narrow bridges, and the Bowser boss fight.
// Dimensions: 100 tiles wide x 15 tiles tall
// No question blocks (NES-accurate castle).
// =============================================================================

import type { LevelData, BlockContent, EntitySpawn, SceneryItem } from './world-1-1.js';

// Tile type constants
const E = 0;   // EMPTY
const G = 1;   // GROUND (used as castle wall)
const S = 5;   // BLOCK (solid stone)
const BR = 14; // BRIDGE
const LV = 15; // LAVA
const CS = 16; // CASTLE_STONE

const W = 100; // level width in tiles
const HT = 15; // level height in tiles

function buildTiles(): number[][] {
  const tiles: number[][] = [];
  for (let r = 0; r < HT; r++) {
    tiles.push(new Array(W).fill(E));
  }

  // -----------------------------------------------------------------
  // LAVA at bottom: rows 13-14
  // -----------------------------------------------------------------
  for (let c = 0; c < W; c++) {
    tiles[13][c] = LV;
    tiles[14][c] = LV;
  }

  // -----------------------------------------------------------------
  // CEILING: rows 0-1 castle stone
  // -----------------------------------------------------------------
  for (let c = 0; c < W; c++) {
    tiles[0][c] = CS;
    tiles[1][c] = CS;
  }

  // -----------------------------------------------------------------
  // Starting platform (cols 0-12): solid ground
  // -----------------------------------------------------------------
  for (let c = 0; c < 13; c++) {
    tiles[12][c] = CS;
    tiles[13][c] = CS;
    tiles[14][c] = CS;
  }

  // -----------------------------------------------------------------
  // Left wall (cols 0-1)
  // -----------------------------------------------------------------
  for (let r = 0; r < HT; r++) {
    tiles[r][0] = CS;
    tiles[r][1] = CS;
  }

  // -----------------------------------------------------------------
  // Section 1: Narrow bridge over lava (cols 13-20)
  // -----------------------------------------------------------------
  for (let c = 13; c <= 20; c++) {
    tiles[12][c] = BR;
  }

  // -----------------------------------------------------------------
  // Platform island (cols 21-28): fire bar section
  // -----------------------------------------------------------------
  for (let c = 21; c <= 28; c++) {
    tiles[12][c] = CS;
    tiles[13][c] = CS;
    tiles[14][c] = CS;
  }
  // Fire bar pivot at col 24, row 8 (placed as solid block)
  tiles[8][24] = S;

  // -----------------------------------------------------------------
  // Bridge over lava (cols 29-33)
  // -----------------------------------------------------------------
  for (let c = 29; c <= 33; c++) {
    tiles[12][c] = BR;
  }

  // -----------------------------------------------------------------
  // Platform with elevated section (cols 34-44)
  // -----------------------------------------------------------------
  for (let c = 34; c <= 44; c++) {
    tiles[12][c] = CS;
    tiles[13][c] = CS;
    tiles[14][c] = CS;
  }
  // Upper platform (cols 36-40, row 8)
  for (let c = 36; c <= 40; c++) {
    tiles[8][c] = CS;
  }
  // Fire bar pivot at col 38, row 5
  tiles[5][38] = S;

  // -----------------------------------------------------------------
  // Gap with narrow bridges (cols 45-52)
  // -----------------------------------------------------------------
  // Two small stepping bridges
  for (let c = 45; c <= 47; c++) {
    tiles[10][c] = BR;
  }
  for (let c = 50; c <= 52; c++) {
    tiles[10][c] = BR;
  }

  // -----------------------------------------------------------------
  // Platform section (cols 53-60)
  // -----------------------------------------------------------------
  for (let c = 53; c <= 60; c++) {
    tiles[12][c] = CS;
    tiles[13][c] = CS;
    tiles[14][c] = CS;
  }
  // Fire bar pivot at col 57, row 9
  tiles[9][57] = S;

  // -----------------------------------------------------------------
  // Bridge to boss area (cols 61-65)
  // -----------------------------------------------------------------
  for (let c = 61; c <= 65; c++) {
    tiles[12][c] = BR;
  }

  // -----------------------------------------------------------------
  // Pre-boss platform (cols 66-70)
  // -----------------------------------------------------------------
  for (let c = 66; c <= 70; c++) {
    tiles[12][c] = CS;
    tiles[13][c] = CS;
    tiles[14][c] = CS;
  }

  // -----------------------------------------------------------------
  // BOSS BRIDGE (cols 71-88): Bowser walks here
  // -----------------------------------------------------------------
  for (let c = 71; c <= 88; c++) {
    tiles[12][c] = BR;
  }

  // -----------------------------------------------------------------
  // AXE position: col 89, row 12 (just past the bridge)
  // Axe entity placed here; tile remains empty so Mario can walk there.
  // -----------------------------------------------------------------

  // -----------------------------------------------------------------
  // Post-axe: Toad room (cols 90-99)
  // -----------------------------------------------------------------
  for (let c = 90; c <= 99; c++) {
    tiles[12][c] = CS;
    tiles[13][c] = CS;
    tiles[14][c] = CS;
  }
  // Right wall
  for (let r = 0; r < HT; r++) {
    tiles[r][99] = CS;
    tiles[r][98] = CS;
  }
  // Wall separating boss from Toad room (cols 89-90, rows 2-11)
  // (but leave row 12 open so bridge collapse makes sense)
  for (let r = 2; r <= 11; r++) {
    tiles[r][89] = CS;
  }

  return tiles;
}

// =============================================================================
// ENTITY SPAWNS
// =============================================================================

const castleEntities: EntitySpawn[] = [
  // Fire bar 1: clockwise on platform island (col 24, row 8)
  { type: 'fire-bar', x: 24 * 16, y: 8 * 16, speed: 0.03 },
  // Fire bar 2: counter-clockwise on elevated section (col 38, row 5)
  { type: 'fire-bar', x: 38 * 16, y: 5 * 16, speed: -0.025 },
  // Fire bar 3: clockwise on platform section (col 57, row 9)
  { type: 'fire-bar', x: 57 * 16, y: 9 * 16, speed: 0.035 },

  // Bowser on the boss bridge
  {
    type: 'bowser',
    x: 80 * 16,
    y: 11 * 16 - 16,  // standing on bridge at row 12, height 32
    bridgeStart: 71 * 16,
    bridgeEnd: 88 * 16,
  },

  // Axe at the end of the bridge
  { type: 'axe', x: 89 * 16 - 8, y: 11 * 16 },
];

// =============================================================================
// BLOCK CONTENTS - None in castle levels (NES-accurate)
// =============================================================================
export const blockContents_1_4: BlockContent[] = [];

// =============================================================================
// SCENERY - No scenery in castle levels
// =============================================================================
const scenery: SceneryItem[] = [];

// =============================================================================
// ASSEMBLED LEVEL DATA
// =============================================================================

export const WORLD_1_4: LevelData = {
  width: W,
  height: HT,
  tiles: buildTiles(),
  entities: castleEntities,
  scenery,
  startX: 3 * 16,
  startY: 11 * 16,
  flagX: 89 * 16,     // Not used in castle, but needed by interface
  castleX: 94 * 16,   // Toad room area
};
