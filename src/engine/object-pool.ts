// =============================================================================
// Object Pool - Pre-allocates entity instances to reduce GC pressure
// =============================================================================

import type { Entity } from '../entities/entities.js';

/** Interface for entities that can be reset and reused from a pool. */
export interface Poolable extends Entity {
  /** Reinitialize this entity with fresh state for reuse. */
  reset(...args: number[]): void;
}

/**
 * Generic object pool for entities.
 * Pre-allocates a fixed number of instances and recycles them
 * instead of creating new objects each frame.
 */
export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;
  private activeCount = 0;

  constructor(factory: () => T, initialSize: number) {
    this.factory = factory;
    for (let i = 0; i < initialSize; i++) {
      const obj = this.factory();
      obj.alive = false;
      this.pool.push(obj);
    }
  }

  /**
   * Acquire an entity from the pool. Returns a recycled instance if available,
   * otherwise creates a new one. The caller must call reset() on the returned
   * entity to initialize it for use.
   */
  acquire(): T {
    // Search for a dead entity to reuse
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].alive) {
        this.activeCount++;
        return this.pool[i];
      }
    }
    // Pool exhausted: grow by one
    const obj = this.factory();
    obj.alive = false;
    this.pool.push(obj);
    this.activeCount++;
    return obj;
  }

  /**
   * Release an entity back to the pool by marking it dead.
   * The entity remains in the pool array for later reuse.
   */
  release(entity: T): void {
    entity.alive = false;
    if (this.activeCount > 0) this.activeCount--;
  }

  /** Number of currently active (alive) entities from this pool. */
  get active(): number {
    return this.activeCount;
  }

  /** Total capacity of the pool (active + available). */
  get size(): number {
    return this.pool.length;
  }

  /** Recalculate active count from actual pool state. */
  sync(): void {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].alive) count++;
    }
    this.activeCount = count;
  }
}

// =============================================================================
// Pre-allocated scratch objects for hot-path reuse
// =============================================================================

/** Reusable AABB object to avoid allocations in collision checks. */
export const scratchAABB = { x: 0, y: 0, width: 0, height: 0, vx: 0, vy: 0 };

/** Second scratch AABB for pair-wise collision checks. */
export const scratchAABB2 = { x: 0, y: 0, width: 0, height: 0, vx: 0, vy: 0 };

/** Fill a scratch AABB from an entity-like object. */
export function fillAABB(
  target: typeof scratchAABB,
  e: { x: number; y: number; width: number; height: number; vx: number; vy: number },
): typeof scratchAABB {
  target.x = e.x;
  target.y = e.y;
  target.width = e.width;
  target.height = e.height;
  target.vx = e.vx;
  target.vy = e.vy;
  return target;
}

/**
 * In-place compaction: removes dead entities from an array without
 * allocating a new array. Returns the new length.
 * Usage: arr.length = compactEntities(arr);
 */
export function compactEntities(entities: Entity[]): number {
  let write = 0;
  for (let read = 0; read < entities.length; read++) {
    if (entities[read].alive) {
      if (write !== read) {
        entities[write] = entities[read];
      }
      write++;
    }
  }
  return write;
}
