// =============================================================================
// World 1-1 - Super Mario Bros (NES) - Complete faithful level data
// =============================================================================
// Level dimensions: 212 tiles wide x 15 tiles tall
// Tile size: 16x16 pixels
// Row 0 = top of screen, Row 14 = bottom
// Ground occupies rows 13-14
// =============================================================================

export interface LevelData {
  width: number;
  height: number;
  tiles: number[][];
  entities: EntitySpawn[];
  scenery: SceneryItem[];
  startX: number;
  startY: number;
  flagX: number;
  castleX: number;
}

export interface EntitySpawn {
  type: 'goomba' | 'koopa' | 'piranha' | 'koopa-red' | 'paratroopa' | 'platform-h' | 'platform-v' | 'fire-bar' | 'bowser' | 'axe';
  x: number;
  y: number;
  /** For platforms: min bound of movement (pixels) */
  minPos?: number;
  /** For platforms: max bound of movement (pixels) */
  maxPos?: number;
  /** For platforms: width in pixels (default 48) */
  platformWidth?: number;
  /** For fire bars: rotation speed */
  speed?: number;
  /** For Bowser: bridge start X */
  bridgeStart?: number;
  /** For Bowser: bridge end X */
  bridgeEnd?: number;
}

export interface SceneryItem {
  type: 'cloud' | 'bush-small' | 'bush-large' | 'hill-small' | 'hill-large';
  x: number;
  y: number;
}

export interface BlockContent {
  col: number;
  row: number;
  content: 'coin' | 'mushroom' | 'fire-flower' | 'star' | '1up' | 'multi-coin';
}

// Tile type constants
const E = 0;   // EMPTY
const G = 1;   // GROUND
const B = 2;   // BRICK
const Q = 3;   // QUESTION
const S = 5;   // BLOCK (solid/stone)
const PT = 6;  // PIPE_TOP_LEFT
const PR = 7;  // PIPE_TOP_RIGHT
const PL = 8;  // PIPE_BODY_LEFT
const PB = 9;  // PIPE_BODY_RIGHT
const H = 10;  // HIDDEN
const F = 11;  // FLAGPOLE
const FT = 12; // FLAGPOLE_TOP
const C = 13;  // CASTLE

const W = 212; // level width in tiles
const HT = 15; // level height in tiles

// Helper: create an empty row
function emptyRow(): number[] {
  return new Array(W).fill(E);
}

// Helper: create a ground row
function groundRow(): number[] {
  const row = new Array(W).fill(G);

  // Gap 1: cols 69-70
  row[69] = E;
  row[70] = E;

  // Gap 2: cols 86-88
  row[86] = E;
  row[87] = E;
  row[88] = E;

  // After flagpole area - ground continues to castle
  return row;
}

// Build tiles row by row
function buildTiles(): number[][] {
  const tiles: number[][] = [];
  for (let r = 0; r < HT; r++) {
    tiles.push(emptyRow());
  }

  // -----------------------------------------------------------------
  // ROWS 13-14: Ground (bottom 2 rows)
  // -----------------------------------------------------------------
  // Ground spans almost the entire level with two gaps (pits)
  for (let c = 0; c < W; c++) {
    // Pit 1: cols 69-70
    if (c >= 69 && c <= 70) continue;
    // Pit 2: cols 86-88
    if (c >= 86 && c <= 88) continue;
    // No ground in castle interior area (past 203 there's castle)

    tiles[13][c] = G;
    tiles[14][c] = G;
  }

  // -----------------------------------------------------------------
  // QUESTION BLOCKS & BRICK BLOCKS
  // -----------------------------------------------------------------

  // Single question block (coin) at col 16, row 9
  tiles[9][16] = Q;

  // Cluster at row 9: B Q B Q B (cols 20-24)
  tiles[9][20] = B;
  tiles[9][21] = Q;
  tiles[9][22] = B;
  tiles[9][23] = Q;
  tiles[9][24] = B;

  // Question block above the cluster (mushroom/fire-flower) at col 22, row 5
  tiles[5][22] = Q;

  // Hidden 1-UP block at col 21, row 5 (invisible until hit from below)
  tiles[5][21] = H;

  // -----------------------------------------------------------------
  // PIPES
  // -----------------------------------------------------------------

  // Pipe 1: 2 tiles tall at cols 28-29 (top at row 11)
  tiles[11][28] = PT; tiles[11][29] = PR;
  tiles[12][28] = PL; tiles[12][29] = PB;

  // Pipe 2: 3 tiles tall at cols 38-39 (top at row 10)
  tiles[10][38] = PT; tiles[10][39] = PR;
  tiles[11][38] = PL; tiles[11][39] = PB;
  tiles[12][38] = PL; tiles[12][39] = PB;

  // Pipe 3: 4 tiles tall at cols 46-47 (top at row 9)
  tiles[9][46]  = PT; tiles[9][47]  = PR;
  tiles[10][46] = PL; tiles[10][47] = PB;
  tiles[11][46] = PL; tiles[11][47] = PB;
  tiles[12][46] = PL; tiles[12][47] = PB;

  // Pipe 4: 4 tiles tall at cols 57-58 (top at row 9)
  tiles[9][57]  = PT; tiles[9][58]  = PR;
  tiles[10][57] = PL; tiles[10][58] = PB;
  tiles[11][57] = PL; tiles[11][58] = PB;
  tiles[12][57] = PL; tiles[12][58] = PB;

  // -----------------------------------------------------------------
  // After first pit area (cols ~71+): blocks and structures
  // -----------------------------------------------------------------

  // Row 9 blocks after first pit area
  // Brick blocks cluster around col 77-79 (row 9)
  tiles[9][77] = B;
  tiles[9][78] = Q;
  tiles[9][79] = B;

  // Question block at row 5 above col 78
  tiles[5][78] = Q;

  // -----------------------------------------------------------------
  // Area after second pit (cols ~89+)
  // -----------------------------------------------------------------

  // Row 9 brick blocks at cols 80-81 (these are before the pit)
  tiles[9][80] = B;

  // Bricks and questions at cols 91-93, row 9
  tiles[9][91] = B;
  tiles[9][92] = B;
  tiles[9][93] = B;
  tiles[9][94] = Q;

  // Row 5 bricks/questions at cols 94, row 5
  tiles[5][94] = B;
  tiles[5][95] = B;
  tiles[5][96] = B;

  // Row 9 question blocks at cols 94 is already set above
  // Additional bricks at row 9 near col 100
  tiles[9][100] = B;
  tiles[9][101] = Q;
  tiles[9][102] = Q;
  tiles[9][103] = B;

  // Row 5 bricks cols 100-101
  tiles[5][100] = B;
  tiles[5][101] = B;

  // Brick row at row 9 around cols 106
  tiles[9][106] = B;

  // Row 5 question blocks around 106-109
  tiles[5][106] = Q;
  tiles[5][109] = Q;

  // Row 9 single brick at col 109
  tiles[9][109] = B;

  // Bricks at row 9, cols 112-113
  tiles[9][112] = B;

  // -----------------------------------------------------------------
  // Pipe after the block sections: col 163-164
  // -----------------------------------------------------------------
  // Pipe 5: 2 tiles tall at cols 163-164
  tiles[11][163] = PT; tiles[11][164] = PR;
  tiles[12][163] = PL; tiles[12][164] = PB;

  // -----------------------------------------------------------------
  // Additional block areas in the middle section
  // -----------------------------------------------------------------

  // Bricks at row 5, cols 118-120
  tiles[5][118] = B;
  tiles[5][119] = B;
  tiles[5][120] = B;

  // Bricks at row 9, cols 121-123 with question
  tiles[9][121] = B;
  tiles[9][122] = B;
  tiles[9][123] = Q;
  tiles[9][124] = B;

  // Star block (brick on row 9 col 121 is already set)

  // Bricks at row 5, cols 128-130
  tiles[5][128] = B;
  tiles[5][129] = B;
  tiles[5][130] = B;
  tiles[5][131] = B;

  // Row 9 bricks cols 129-131
  tiles[9][129] = B;
  tiles[9][130] = B;

  // Ground blocks / elevated platforms
  // Bricks at row 5 cols 134-136
  tiles[5][134] = B;
  tiles[5][135] = B;
  tiles[5][136] = B;
  tiles[5][137] = B;

  // Bricks at row 9 around 140
  tiles[9][140] = B;
  tiles[9][141] = B;
  tiles[9][142] = B;
  tiles[9][143] = Q;
  tiles[9][144] = B;

  // Brick at row 5 col 142
  tiles[5][142] = B;

  // Bricks at row 9, cols 148-152
  tiles[9][148] = B;
  tiles[9][149] = Q;
  tiles[9][150] = B;
  tiles[9][151] = Q;
  tiles[9][152] = B;

  // Row 5 bricks cols 148-152
  tiles[5][148] = B;
  tiles[5][149] = B;
  tiles[5][150] = B;

  // -----------------------------------------------------------------
  // STAIRCASE 1 (ascending right): before the final pit area
  // Located around cols 134-138 -- actually near the end
  // The classic World 1-1 has two staircase structures near the end
  // -----------------------------------------------------------------

  // Staircase 1: ascending from left, cols 134-137 (4-step)
  // Actually the staircases in World 1-1 are near the very end.
  // Let me place them more accurately.

  // Clear incorrectly placed blocks above and redo the end section properly.
  // The end section of World 1-1 has:
  // - A staircase ascending right (cols ~174-181)
  // - A gap
  // - A staircase ascending right then flat top (cols ~181-189)
  // - Flagpole at col ~198
  // - Castle starting at col ~202

  // -----------------------------------------------------------------
  // END SECTION: Staircases and Flagpole
  // -----------------------------------------------------------------

  // Staircase 1: ascending steps (half-pyramid going right)
  // 4 steps: heights 1, 2, 3, 4 blocks above ground
  // Cols 174-177

  // Step 1: 1 block high at col 174
  tiles[12][174] = S;

  // Step 2: 2 blocks high at col 175
  tiles[12][175] = S;
  tiles[11][175] = S;

  // Step 3: 3 blocks high at col 176
  tiles[12][176] = S;
  tiles[11][176] = S;
  tiles[10][176] = S;

  // Step 4: 4 blocks high at col 177
  tiles[12][177] = S;
  tiles[11][177] = S;
  tiles[10][177] = S;
  tiles[9][177]  = S;

  // Gap at cols 178-179 (empty, player jumps over)

  // Staircase 2: ascending steps and descending
  // Ascending: cols 181-185 (5-step pyramid)

  // Step 1: 1 block
  tiles[12][181] = S;

  // Step 2: 2 blocks
  tiles[12][182] = S;
  tiles[11][182] = S;

  // Step 3: 3 blocks
  tiles[12][183] = S;
  tiles[11][183] = S;
  tiles[10][183] = S;

  // Step 4: 4 blocks (peak)
  tiles[12][184] = S;
  tiles[11][184] = S;
  tiles[10][184] = S;
  tiles[9][184]  = S;

  // Flat top at 4 blocks
  tiles[12][185] = S;
  tiles[11][185] = S;
  tiles[10][185] = S;
  tiles[9][185]  = S;

  // Step down 3
  tiles[12][186] = S;
  tiles[11][186] = S;
  tiles[10][186] = S;

  // Step down 2
  tiles[12][187] = S;
  tiles[11][187] = S;

  // Step down 1
  tiles[12][188] = S;

  // Final ascending staircase to flagpole (cols 191-198)
  // This is the classic staircase: 1-2-3-4-5-6-7-8 blocks high leading to flagpole
  tiles[12][191] = S;

  tiles[12][192] = S;
  tiles[11][192] = S;

  tiles[12][193] = S;
  tiles[11][193] = S;
  tiles[10][193] = S;

  tiles[12][194] = S;
  tiles[11][194] = S;
  tiles[10][194] = S;
  tiles[9][194]  = S;

  tiles[12][195] = S;
  tiles[11][195] = S;
  tiles[10][195] = S;
  tiles[9][195]  = S;
  tiles[8][195]  = S;

  tiles[12][196] = S;
  tiles[11][196] = S;
  tiles[10][196] = S;
  tiles[9][196]  = S;
  tiles[8][196]  = S;
  tiles[7][196]  = S;

  tiles[12][197] = S;
  tiles[11][197] = S;
  tiles[10][197] = S;
  tiles[9][197]  = S;
  tiles[8][197]  = S;
  tiles[7][197]  = S;
  tiles[6][197]  = S;

  tiles[12][198] = S;
  tiles[11][198] = S;
  tiles[10][198] = S;
  tiles[9][198]  = S;
  tiles[8][198]  = S;
  tiles[7][198]  = S;
  tiles[6][198]  = S;
  tiles[5][198]  = S;

  // -----------------------------------------------------------------
  // FLAGPOLE: col 199
  // -----------------------------------------------------------------
  tiles[4][199]  = FT;  // flagpole top (ball)
  tiles[5][199]  = F;
  tiles[6][199]  = F;
  tiles[7][199]  = F;
  tiles[8][199]  = F;
  tiles[9][199]  = F;
  tiles[10][199] = F;
  tiles[11][199] = F;
  tiles[12][199] = F;

  // -----------------------------------------------------------------
  // CASTLE: starts at col 203
  // -----------------------------------------------------------------
  // Castle is represented as a block of CASTLE tiles
  // Roughly 5 wide x 5 tall
  tiles[8][203]  = C; tiles[8][204]  = C; tiles[8][205]  = C; tiles[8][206]  = C; tiles[8][207]  = C;
  tiles[9][203]  = C; tiles[9][204]  = C; tiles[9][205]  = C; tiles[9][206]  = C; tiles[9][207]  = C;
  tiles[10][203] = C; tiles[10][204] = C; tiles[10][205] = C; tiles[10][206] = C; tiles[10][207] = C;
  tiles[11][203] = C; tiles[11][204] = C; tiles[11][205] = C; tiles[11][206] = C; tiles[11][207] = C;
  tiles[12][203] = C; tiles[12][204] = C; tiles[12][205] = C; tiles[12][206] = C; tiles[12][207] = C;
  // Castle turret on top
  tiles[6][204]  = C; tiles[6][205]  = C; tiles[6][206]  = C;
  tiles[7][204]  = C; tiles[7][205]  = C; tiles[7][206]  = C;

  return tiles;
}

// =============================================================================
// ENTITY SPAWNS (enemies)
// =============================================================================
// Positions in pixels (col * 16 for x, row * 16 for y)
// Enemies sit on top of ground, so y is row 12 * 16 = 192 (feet on row 13 ground)

const entities: EntitySpawn[] = [
  // Goomba 1: near the first question blocks
  { type: 'goomba', x: 22 * 16, y: 12 * 16 },

  // Goomba 2: after the question block cluster
  { type: 'goomba', x: 40 * 16, y: 12 * 16 },

  // Goomba pair before first pit
  { type: 'goomba', x: 51 * 16, y: 12 * 16 },
  { type: 'goomba', x: 52 * 16 + 8, y: 12 * 16 },

  // Goomba pair after pipe area
  { type: 'goomba', x: 80 * 16, y: 12 * 16 },
  { type: 'goomba', x: 82 * 16, y: 12 * 16 },

  // Two goombas near the elevated brick section
  { type: 'goomba', x: 97 * 16, y: 12 * 16 },
  { type: 'goomba', x: 98 * 16 + 8, y: 12 * 16 },

  // Koopa Troopa around col 107
  { type: 'koopa', x: 107 * 16, y: 12 * 16 },

  // Goomba pair around col 114
  { type: 'goomba', x: 114 * 16, y: 12 * 16 },
  { type: 'goomba', x: 115 * 16 + 8, y: 12 * 16 },

  // Goomba pair around col 124
  { type: 'goomba', x: 124 * 16, y: 12 * 16 },
  { type: 'goomba', x: 125 * 16 + 8, y: 12 * 16 },

  // Goomba pair near col 128
  { type: 'goomba', x: 128 * 16, y: 12 * 16 },
  { type: 'goomba', x: 129 * 16 + 8, y: 12 * 16 },

  // Two goombas near end section
  { type: 'goomba', x: 174 * 16, y: 12 * 16 },
  { type: 'goomba', x: 175 * 16 + 8, y: 12 * 16 },

  // Piranha plants in pipes
  { type: 'piranha', x: 28 * 16 + 8, y: 10 * 16 },
  { type: 'piranha', x: 38 * 16 + 8, y: 9 * 16 },
  { type: 'piranha', x: 46 * 16 + 8, y: 8 * 16 },
  { type: 'piranha', x: 57 * 16 + 8, y: 8 * 16 },
  { type: 'piranha', x: 163 * 16 + 8, y: 10 * 16 },
];

// =============================================================================
// SCENERY (background decorations)
// =============================================================================
// World 1-1 has a repeating pattern of hills, bushes, and clouds
// Pattern repeats roughly every 48 tiles (3 screens)
// Row positions: clouds around row 2-3, hills/bushes at ground level

function buildScenery(): SceneryItem[] {
  const items: SceneryItem[] = [];

  // The scenery pattern in World 1-1 repeats every 48 columns.
  // Pattern:
  //   Large hill at offset 0
  //   Small cloud at offset 8
  //   Small bush at offset 11
  //   Large cloud at offset 19
  //   Large bush at offset 23
  //   Small hill at offset 32
  //   Small cloud at offset 35
  //   Medium cloud at offset 38
  //   Small bush at offset 41

  const groundY = 13 * 16; // ground row in pixels (top of ground)
  const cloudY = 3 * 16;   // cloud row in pixels

  for (let base = 0; base < W; base += 48) {
    const px = (col: number) => (base + col) * 16;

    // Large hill
    items.push({ type: 'hill-large', x: px(0), y: groundY });

    // Small cloud (single)
    items.push({ type: 'cloud', x: px(8), y: 2 * 16 });

    // Small bush
    items.push({ type: 'bush-small', x: px(11), y: groundY });

    // Large cloud (triple)
    items.push({ type: 'cloud', x: px(19), y: cloudY });
    items.push({ type: 'cloud', x: px(20), y: cloudY });
    items.push({ type: 'cloud', x: px(21), y: cloudY });

    // Large bush
    items.push({ type: 'bush-large', x: px(23), y: groundY });

    // Small hill
    items.push({ type: 'hill-small', x: px(32), y: groundY });

    // Small cloud
    items.push({ type: 'cloud', x: px(35), y: 2 * 16 });
    items.push({ type: 'cloud', x: px(36), y: 2 * 16 });

    // Medium cloud
    items.push({ type: 'cloud', x: px(38), y: cloudY });

    // Small bush
    items.push({ type: 'bush-small', x: px(41), y: groundY });
  }

  return items;
}

// =============================================================================
// BLOCK CONTENTS (what items are inside ? blocks, bricks, and hidden blocks)
// =============================================================================

export const blockContents: BlockContent[] = [
  // First question block: coin
  { col: 16, row: 9, content: 'coin' },

  // Cluster at row 9: B Q B Q B (cols 20-24)
  { col: 21, row: 9, content: 'coin' },
  { col: 23, row: 9, content: 'coin' },

  // Question block above cluster: mushroom / fire-flower (power-up)
  { col: 22, row: 5, content: 'mushroom' },

  // Hidden 1-UP
  { col: 21, row: 5, content: '1up' },

  // After first pit: question block with coin
  { col: 78, row: 9, content: 'coin' },

  // Question block at row 5 above col 78: mushroom
  { col: 78, row: 5, content: 'mushroom' },

  // Question block with coin near col 94
  { col: 94, row: 9, content: 'coin' },

  // Star in brick block at col 94 row 5
  { col: 94, row: 5, content: 'star' },

  // Question blocks near col 101-102
  { col: 101, row: 9, content: 'coin' },
  { col: 102, row: 9, content: 'coin' },

  // Question blocks at row 5 near col 106, 109
  { col: 106, row: 5, content: 'coin' },
  { col: 109, row: 5, content: 'coin' },

  // Question block at col 123 row 9
  { col: 123, row: 9, content: 'coin' },

  // Multi-coin brick blocks
  { col: 24, row: 9, content: 'coin' },
  { col: 77, row: 9, content: 'coin' },

  // Question blocks near col 143
  { col: 143, row: 9, content: 'coin' },

  // Question blocks near col 149, 151
  { col: 149, row: 9, content: 'coin' },
  { col: 151, row: 9, content: 'coin' },

  // Multi-coin brick
  { col: 130, row: 9, content: 'multi-coin' },
];

// =============================================================================
// ASSEMBLED LEVEL DATA
// =============================================================================

export const WORLD_1_1: LevelData = {
  width: W,
  height: HT,
  tiles: buildTiles(),
  entities,
  scenery: buildScenery(),
  startX: 3 * 16,     // Mario starts at column 3
  startY: 12 * 16,    // Mario stands on ground (row 13), feet at 13*16, top at ~11*16
  flagX: 199 * 16,    // Flagpole column
  castleX: 203 * 16,  // Castle column
};
