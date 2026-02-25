// =============================================================================
// Level Manager - Handles tile access, collision queries, and block contents
// =============================================================================

import type { LevelData, BlockContent } from './levels/world-1-1.js';

/** Tile size in pixels (NES tiles are 16x16) */
const TILE_SIZE = 16;

/** Tile type constants matching the project's const enum */
const enum TileType {
  EMPTY          = 0,
  GROUND         = 1,
  BRICK          = 2,
  QUESTION       = 3,
  QUESTION_EMPTY = 4,
  BLOCK          = 5,
  PIPE_TL        = 6,
  PIPE_TR        = 7,
  PIPE_BL        = 8,
  PIPE_BR        = 9,
  HIDDEN         = 10,
  FLAGPOLE       = 11,
  FLAGPOLE_TOP   = 12,
  CASTLE         = 13,
}

export class Level {
  data: LevelData;
  blockContents: Map<string, string>;

  constructor(data: LevelData, contents: BlockContent[]) {
    this.data = data;
    this.blockContents = new Map();

    for (const entry of contents) {
      const key = `${entry.col},${entry.row}`;
      this.blockContents.set(key, entry.content);
    }
  }

  // ---------------------------------------------------------------------------
  // Tile access
  // ---------------------------------------------------------------------------

  /** Get the tile type at the given column and row. Returns EMPTY for out-of-bounds. */
  getTile(col: number, row: number): number {
    if (col < 0 || col >= this.data.width || row < 0 || row >= this.data.height) {
      return TileType.EMPTY;
    }
    return this.data.tiles[row][col];
  }

  /** Set the tile type at the given column and row. No-op for out-of-bounds. */
  setTile(col: number, row: number, type: number): void {
    if (col < 0 || col >= this.data.width || row < 0 || row >= this.data.height) {
      return;
    }
    this.data.tiles[row][col] = type;
  }

  // ---------------------------------------------------------------------------
  // Block contents (items inside ? blocks, bricks, etc.)
  // ---------------------------------------------------------------------------

  /** Get the content type of a block (coin, mushroom, etc.), or undefined if empty. */
  getBlockContent(col: number, row: number): string | undefined {
    return this.blockContents.get(`${col},${row}`);
  }

  /** Remove the content from a block after it has been hit. */
  removeBlockContent(col: number, row: number): void {
    this.blockContents.delete(`${col},${row}`);
  }

  // ---------------------------------------------------------------------------
  // Collision helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns true if the tile at (col, row) is solid and blocks movement.
   * Ground, bricks, question blocks, pipes, stone blocks, and castle tiles
   * are all solid. Empty, hidden (until activated), flagpole, and
   * question-empty blocks are non-solid or handled differently.
   */
  isSolid(col: number, row: number): boolean {
    const tile = this.getTile(col, row);

    switch (tile) {
      case TileType.GROUND:
      case TileType.BRICK:
      case TileType.QUESTION:
      case TileType.QUESTION_EMPTY:
      case TileType.BLOCK:
      case TileType.PIPE_TL:
      case TileType.PIPE_TR:
      case TileType.PIPE_BL:
      case TileType.PIPE_BR:
      case TileType.CASTLE:
        return true;

      case TileType.HIDDEN:
        // Hidden blocks only become solid after being hit (turned into QUESTION_EMPTY).
        // While hidden, they are not solid from above -- the player can walk through.
        // However they ARE solid when hit from below (handled by physics, not here).
        return false;

      case TileType.EMPTY:
      case TileType.FLAGPOLE:
      case TileType.FLAGPOLE_TOP:
      default:
        return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Coordinate conversions
  // ---------------------------------------------------------------------------

  /** Convert a pixel coordinate to a tile index (floor division). */
  pixelToTile(px: number): number {
    return Math.floor(px / TILE_SIZE);
  }

  /** Convert a tile index to the pixel coordinate of that tile's left/top edge. */
  tileToPixel(tile: number): number {
    return tile * TILE_SIZE;
  }
}
