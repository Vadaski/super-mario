import { TILE, GameState, EntityType, TileType } from './utils/constants.js';
import { aabbOverlap } from './physics/collision.js';
import { audio } from './audio/audio.js';
import type { Mario } from './entities/mario.js';
import type { Entity } from './entities/entities.js';
import { ScorePopup, BrickParticle } from './entities/entities.js';
import type { FireBar } from './entities/fire-bar.js';
import { Bowser, BowserFire } from './entities/bowser.js';
import type { Level } from './world/level.js';
import type { AchievementManager } from './engine/achievements.js';

export interface CastleState {
  bridgeCollapsing: boolean;
  bridgeCollapseCol: number;
  bridgeCollapseTimer: number;
  bridgeCollapseEnd: number;
  toadMessageTimer: number;
  showToadMessage: boolean;
  castleBowser: Bowser | null;
}

export function updateCastle(
  mario: Mario,
  entities: Entity[],
  level: Level,
  castle: CastleState,
  achievements: AchievementManager,
  onDie: () => void,
  onAdvance: () => void,
): void {
  if (mario.dead || mario.dying) return;

  // Check lava collision (instant death)
  const mCol = Math.floor(mario.centerX / TILE);
  const mBottomRow = Math.floor((mario.y + mario.height + 2) / TILE);
  const lavaTile = level.getTile(mCol, mBottomRow);
  if (lavaTile === TileType.LAVA) {
    mario.die();
    audio.stopMusic(); audio.die();
    achievements.onDeath();
    onDie();
    return;
  }

  // Check fire bar collisions
  for (const e of entities) {
    if (e.type !== EntityType.FIRE_BAR || !e.alive || !e.active) continue;
    const fb = e as FireBar;
    if (fb.overlapsEntity(mario.x, mario.y, mario.width, mario.height)) {
      if (mario.starPower > 0) continue;
      const damaged = mario.takeDamage();
      if (damaged && !mario.dead) audio.powerDown();
      if (mario.dead) {
        audio.stopMusic(); audio.die();
        achievements.onDeath();
        onDie();
        return;
      }
    }
  }

  // Check Bowser fire collision
  for (const e of entities) {
    if (e.type !== EntityType.BOWSER_FIRE || !e.alive) continue;
    const mb = { x: mario.x, y: mario.y, width: mario.width, height: mario.height, vx: 0, vy: 0 };
    const fb = { x: e.x, y: e.y, width: e.width, height: e.height, vx: 0, vy: 0 };
    if (aabbOverlap(mb, fb)) {
      if (mario.starPower > 0) { e.alive = false; continue; }
      const damaged = mario.takeDamage();
      if (damaged && !mario.dead) audio.powerDown();
      if (mario.dead) {
        audio.stopMusic(); audio.die();
        onDie();
        return;
      }
    }
  }

  // Bowser fire spawning
  if (castle.castleBowser && castle.castleBowser.alive && castle.castleBowser.pendingFire) {
    castle.castleBowser.pendingFire = false;
    const bx = castle.castleBowser.facingRight
      ? castle.castleBowser.x + castle.castleBowser.width
      : castle.castleBowser.x - 16;
    entities.push(new BowserFire(bx, castle.castleBowser.y + 8));
  }

  // Mario's fireballs hitting Bowser
  if (castle.castleBowser && castle.castleBowser.alive) {
    for (const e of entities) {
      if (e.type !== EntityType.FIREBALL || !e.alive) continue;
      const fb = { x: e.x, y: e.y, width: e.width, height: e.height, vx: 0, vy: 0 };
      const bb = { x: castle.castleBowser.x, y: castle.castleBowser.y, width: castle.castleBowser.width, height: castle.castleBowser.height, vx: 0, vy: 0 };
      if (aabbOverlap(fb, bb)) {
        e.alive = false;
        const killed = castle.castleBowser.hitByFireball();
        audio.kick();
        if (killed) {
          mario.addScore(5000);
          entities.push(new ScorePopup(castle.castleBowser.x, castle.castleBowser.y, 5000));
        }
      }
    }
  }

  // Axe collision: start bridge collapse
  if (!castle.bridgeCollapsing && !castle.showToadMessage) {
    for (const e of entities) {
      if (e.type !== EntityType.AXE || !e.alive) continue;
      const mb = { x: mario.x, y: mario.y, width: mario.width, height: mario.height, vx: 0, vy: 0 };
      const ab = { x: e.x, y: e.y, width: e.width, height: e.height, vx: 0, vy: 0 };
      if (aabbOverlap(mb, ab)) {
        e.alive = false;
        castle.bridgeCollapsing = true;
        castle.bridgeCollapseCol = 88;
        castle.bridgeCollapseEnd = 71;
        castle.bridgeCollapseTimer = 0;
        audio.stopMusic();
        achievements.onBowserDefeated();
      }
    }
  }

  // Bridge collapse animation
  if (castle.bridgeCollapsing) {
    castle.bridgeCollapseTimer++;
    if (castle.bridgeCollapseTimer % 4 === 0 && castle.bridgeCollapseCol >= castle.bridgeCollapseEnd) {
      level.setTile(castle.bridgeCollapseCol, 12, TileType.EMPTY);
      if (castle.castleBowser && castle.castleBowser.alive) {
        const bowserCol = Math.floor((castle.castleBowser.x + 16) / TILE);
        if (bowserCol >= castle.bridgeCollapseCol) {
          castle.castleBowser.startFalling();
          audio.bowserFall();
        }
      }
      castle.bridgeCollapseCol--;
    }
    if (castle.bridgeCollapseCol < castle.bridgeCollapseEnd) {
      castle.bridgeCollapsing = false;
      castle.showToadMessage = true;
      castle.toadMessageTimer = 0;
    }
  }

  // Toad message after bridge collapse
  if (castle.showToadMessage) {
    castle.toadMessageTimer++;
    if (castle.toadMessageTimer > 180) {
      castle.showToadMessage = false;
      onAdvance();
    }
  }
}
