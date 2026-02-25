import { TILE, TileType } from '../utils/constants.js';
import type { Level } from '../world/level.js';

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
}

export interface CollisionResult {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
  hitTiles: { col: number; row: number; side: 'top' | 'bottom' | 'left' | 'right' }[];
}

/**
 * Resolve entity collision against the tile map.
 * Moves the entity and returns which sides had collisions.
 */
export function resolveMapCollision(entity: AABB, level: Level): CollisionResult {
  const result: CollisionResult = { top: false, bottom: false, left: false, right: false, hitTiles: [] };

  // Move on X axis first
  entity.x += entity.vx;
  resolveTileCollisionX(entity, level, result);

  // Then move on Y axis
  entity.y += entity.vy;
  resolveTileCollisionY(entity, level, result);

  return result;
}

function resolveTileCollisionX(entity: AABB, level: Level, result: CollisionResult): void {
  const top = Math.floor(entity.y / TILE);
  const bottom = Math.floor((entity.y + entity.height - 1) / TILE);

  if (entity.vx > 0) {
    // Moving right
    const col = Math.floor((entity.x + entity.width) / TILE);
    for (let row = top; row <= bottom; row++) {
      if (level.isSolid(col, row)) {
        entity.x = col * TILE - entity.width;
        entity.vx = 0;
        result.right = true;
        result.hitTiles.push({ col, row, side: 'right' });
      }
    }
  } else if (entity.vx < 0) {
    // Moving left
    const col = Math.floor(entity.x / TILE);
    for (let row = top; row <= bottom; row++) {
      if (level.isSolid(col, row)) {
        entity.x = (col + 1) * TILE;
        entity.vx = 0;
        result.left = true;
        result.hitTiles.push({ col, row, side: 'left' });
      }
    }
  }
}

function resolveTileCollisionY(entity: AABB, level: Level, result: CollisionResult): void {
  const left = Math.floor(entity.x / TILE);
  // Use a slightly narrower hitbox for horizontal tile checks to avoid corner catches
  const right = Math.floor((entity.x + entity.width - 1) / TILE);

  if (entity.vy > 0) {
    // Falling down
    const row = Math.floor((entity.y + entity.height) / TILE);
    for (let col = left; col <= right; col++) {
      if (level.isSolid(col, row)) {
        entity.y = row * TILE - entity.height;
        entity.vy = 0;
        result.bottom = true;
        result.hitTiles.push({ col, row, side: 'bottom' });
      }
    }
  } else if (entity.vy < 0) {
    // Jumping up (hitting head)
    const row = Math.floor(entity.y / TILE);
    for (let col = left; col <= right; col++) {
      if (level.isSolid(col, row)) {
        entity.y = (row + 1) * TILE;
        entity.vy = 0;
        result.top = true;
        result.hitTiles.push({ col, row, side: 'top' });
      }
    }
  }
}

/** Check AABB overlap between two entities */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Check if entity A is stomping entity B (A's bottom hitting B's top half) */
export function isStomping(a: AABB, b: AABB): boolean {
  if (a.vy <= 0) return false; // Must be falling
  const aBottom = a.y + a.height;
  const bMid = b.y + b.height * 0.5;
  return aBottom <= bMid + 4; // A's feet are in the top half of B
}

/** Get distance between entity centers */
export function entityDistance(a: AABB, b: AABB): number {
  const dx = (a.x + a.width / 2) - (b.x + b.width / 2);
  const dy = (a.y + a.height / 2) - (b.y + b.height / 2);
  return Math.sqrt(dx * dx + dy * dy);
}
