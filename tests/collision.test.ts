import { describe, it, expect } from 'vitest';
import { aabbOverlap, isStomping, entityDistance, resolveMapCollision } from '../src/physics/collision.js';
import type { AABB } from '../src/physics/collision.js';

// ---------------------------------------------------------------------------
// Helper: create a minimal mock Level for resolveMapCollision tests
// ---------------------------------------------------------------------------
function createMockLevel(solidTiles: Set<string> = new Set()) {
  return {
    isSolid(col: number, row: number): boolean {
      return solidTiles.has(`${col},${row}`);
    },
    getTile(_col: number, _row: number): number { return 0; },
    setTile(_col: number, _row: number, _type: number): void {},
    getBlockContent(_col: number, _row: number): string | undefined { return undefined; },
  } as any;
}

function makeAABB(x: number, y: number, width: number, height: number, vx = 0, vy = 0): AABB {
  return { x, y, width, height, vx, vy };
}

// ===========================================================================
// aabbOverlap
// ===========================================================================
describe('aabbOverlap', () => {
  it('detects overlap between two intersecting boxes', () => {
    const a = makeAABB(0, 0, 16, 16);
    const b = makeAABB(8, 8, 16, 16);
    expect(aabbOverlap(a, b)).toBe(true);
  });

  it('returns false for boxes that do not overlap', () => {
    const a = makeAABB(0, 0, 16, 16);
    const b = makeAABB(100, 100, 16, 16);
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('returns false for boxes that are exactly touching on the right edge (no overlap)', () => {
    const a = makeAABB(0, 0, 16, 16);
    const b = makeAABB(16, 0, 16, 16);
    // a.x + a.width === b.x  =>  16 > 16 is false
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('returns false for boxes touching on the bottom edge', () => {
    const a = makeAABB(0, 0, 16, 16);
    const b = makeAABB(0, 16, 16, 16);
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('detects overlap when one box contains the other', () => {
    const outer = makeAABB(0, 0, 100, 100);
    const inner = makeAABB(10, 10, 5, 5);
    expect(aabbOverlap(outer, inner)).toBe(true);
    expect(aabbOverlap(inner, outer)).toBe(true);
  });

  it('handles zero-width entity (degenerate box)', () => {
    const a = makeAABB(10, 10, 0, 16);
    const b = makeAABB(5, 5, 16, 16);
    // a.x + a.width = 10, b.x = 5 => 10 > 5 true
    // a.x = 10, b.x + b.width = 21 => 10 < 21 true
    // but a.width is 0, so a.x + a.width = 10 > 5 is true and a.x = 10 < 21 is true
    // y: a.y=10 < b.y+b.height=21 true, a.y+a.height=26 > b.y=5 true
    // Actually all conditions pass, so it overlaps
    expect(aabbOverlap(a, b)).toBe(true);
  });

  it('handles zero-size entity (zero width and height)', () => {
    const a = makeAABB(10, 10, 0, 0);
    const b = makeAABB(5, 5, 16, 16);
    // a.x < b.x + b.width => 10 < 21 true
    // a.x + a.width > b.x => 10 > 5 true
    // a.y < b.y + b.height => 10 < 21 true
    // a.y + a.height > b.y => 10 > 5 true
    expect(aabbOverlap(a, b)).toBe(true);
  });

  it('returns false when boxes are separated horizontally', () => {
    const a = makeAABB(0, 0, 10, 10);
    const b = makeAABB(20, 0, 10, 10);
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('returns false when boxes are separated vertically', () => {
    const a = makeAABB(0, 0, 10, 10);
    const b = makeAABB(0, 20, 10, 10);
    expect(aabbOverlap(a, b)).toBe(false);
  });
});

// ===========================================================================
// isStomping
// ===========================================================================
describe('isStomping', () => {
  it('returns true when Mario is falling and feet are in the top half of the enemy', () => {
    // Mario at y=0, height=16 => bottom = 16
    // Enemy at y=14, height=16 => mid = 14 + 8 = 22
    // aBottom (16) <= bMid + 4 (26) => true
    const mario = makeAABB(0, 0, 16, 16, 0, 2); // falling (vy > 0)
    const enemy = makeAABB(0, 14, 16, 16);
    expect(isStomping(mario, enemy)).toBe(true);
  });

  it('returns false when Mario is not falling (vy <= 0)', () => {
    const mario = makeAABB(0, 0, 16, 16, 0, 0);
    const enemy = makeAABB(0, 14, 16, 16);
    expect(isStomping(mario, enemy)).toBe(false);
  });

  it('returns false when Mario is jumping upward', () => {
    const mario = makeAABB(0, 0, 16, 16, 0, -3);
    const enemy = makeAABB(0, 14, 16, 16);
    expect(isStomping(mario, enemy)).toBe(false);
  });

  it('returns false when Mario bottom is well below the enemy midpoint', () => {
    // Mario at y=20, height=16 => bottom = 36
    // Enemy at y=14, height=16 => mid = 22, mid+4 = 26
    // 36 <= 26 => false
    const mario = makeAABB(0, 20, 16, 16, 0, 2);
    const enemy = makeAABB(0, 14, 16, 16);
    expect(isStomping(mario, enemy)).toBe(false);
  });

  it('detects stomp at the boundary (bottom exactly at mid + 4)', () => {
    // enemy mid = 100 + 8 = 108, mid + 4 = 112
    // mario bottom needs to be <= 112, so y + 16 = 112 => y = 96
    const mario = makeAABB(0, 96, 16, 16, 0, 1);
    const enemy = makeAABB(0, 100, 16, 16);
    expect(isStomping(mario, enemy)).toBe(true);
  });
});

// ===========================================================================
// entityDistance
// ===========================================================================
describe('entityDistance', () => {
  it('returns 0 for identical positions and sizes', () => {
    const a = makeAABB(10, 10, 16, 16);
    const b = makeAABB(10, 10, 16, 16);
    expect(entityDistance(a, b)).toBe(0);
  });

  it('calculates correct horizontal distance', () => {
    const a = makeAABB(0, 0, 10, 10); // center: (5, 5)
    const b = makeAABB(20, 0, 10, 10); // center: (25, 5)
    expect(entityDistance(a, b)).toBe(20);
  });

  it('calculates correct diagonal distance', () => {
    const a = makeAABB(0, 0, 10, 10); // center: (5, 5)
    const b = makeAABB(30, 40, 10, 10); // center: (35, 45)
    // dx = 30, dy = 40 => sqrt(900 + 1600) = sqrt(2500) = 50
    expect(entityDistance(a, b)).toBeCloseTo(50);
  });

  it('is symmetric', () => {
    const a = makeAABB(0, 0, 16, 16);
    const b = makeAABB(50, 50, 8, 8);
    expect(entityDistance(a, b)).toBe(entityDistance(b, a));
  });
});

// ===========================================================================
// resolveMapCollision
// ===========================================================================
describe('resolveMapCollision', () => {
  it('does not report collision when moving through empty space', () => {
    const entity = makeAABB(32, 32, 16, 16, 2, 0);
    const level = createMockLevel();
    const result = resolveMapCollision(entity, level);
    expect(result.top).toBe(false);
    expect(result.bottom).toBe(false);
    expect(result.left).toBe(false);
    expect(result.right).toBe(false);
    expect(result.hitTiles).toHaveLength(0);
  });

  it('resolves right-side collision and stops horizontal velocity', () => {
    // Entity at x=28, moving right with vx=4 => new x = 32
    // Entity width=16, so right edge = 48 => tile col 3 (48/16=3)
    // Mark tile col 3 as solid
    const solidTiles = new Set(['3,2']);
    const entity = makeAABB(28, 32, 16, 16, 4, 0);
    const level = createMockLevel(solidTiles);
    const result = resolveMapCollision(entity, level);
    expect(result.right).toBe(true);
    expect(entity.vx).toBe(0);
    // Entity should be pushed back so right edge aligns with tile left edge
    expect(entity.x).toBe(3 * 16 - 16); // 48 - 16 = 32
  });

  it('resolves left-side collision and stops horizontal velocity', () => {
    // Entity moving left into a solid tile
    // Entity at x=32, vx=-4 => new x = 28
    // Left edge at 28, tile col = floor(28/16) = 1
    // Mark tile col 1 as solid
    const solidTiles = new Set(['1,2']);
    const entity = makeAABB(32, 32, 16, 16, -4, 0);
    const level = createMockLevel(solidTiles);
    const result = resolveMapCollision(entity, level);
    expect(result.left).toBe(true);
    expect(entity.vx).toBe(0);
    // Entity pushed to right edge of the solid tile
    expect(entity.x).toBe((1 + 1) * 16); // 32
  });

  it('resolves bottom collision (landing on ground)', () => {
    // Entity falling downward
    // Entity at y=44, vy=4 => after X move (no x movement), y becomes 48
    // Entity height=16, bottom = 48 + 16 = 64, tile row = floor(64/16) = 4
    // Mark row 4 as solid ground
    const solidTiles = new Set(['2,4']);
    const entity = makeAABB(32, 44, 16, 16, 0, 4);
    const level = createMockLevel(solidTiles);
    const result = resolveMapCollision(entity, level);
    expect(result.bottom).toBe(true);
    expect(entity.vy).toBe(0);
    expect(entity.y).toBe(4 * 16 - 16); // 64 - 16 = 48
  });

  it('resolves top collision (hitting head on ceiling)', () => {
    // Entity jumping upward
    // Entity at y=36, vy=-4 => after X move, y = 32
    // top edge = 32, tile row = floor(32/16) = 2
    // Mark row 2 as solid
    const solidTiles = new Set(['2,2']);
    const entity = makeAABB(32, 36, 16, 16, 0, -4);
    const level = createMockLevel(solidTiles);
    const result = resolveMapCollision(entity, level);
    expect(result.top).toBe(true);
    expect(entity.vy).toBe(0);
    expect(entity.y).toBe((2 + 1) * 16); // 48
  });

  it('records all hit tiles', () => {
    // Wide entity spanning 2 tile columns falling onto solid ground
    // entity width=32, at x=0 => cols 0 and 1
    const solidTiles = new Set(['0,4', '1,4']);
    const entity = makeAABB(0, 44, 32, 16, 0, 4);
    const level = createMockLevel(solidTiles);
    const result = resolveMapCollision(entity, level);
    expect(result.bottom).toBe(true);
    expect(result.hitTiles.length).toBeGreaterThanOrEqual(2);
  });

  it('does not modify entity when velocity is zero and no tiles are solid', () => {
    const entity = makeAABB(50, 50, 16, 16, 0, 0);
    const level = createMockLevel();
    resolveMapCollision(entity, level);
    // Position unchanged (x += 0, y += 0)
    expect(entity.x).toBe(50);
    expect(entity.y).toBe(50);
  });
});
