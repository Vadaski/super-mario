import {
  TILE, SCREEN_WIDTH, SCORES, STOMP_SCORES, EntityType, TileType, STAR_DURATION,
} from '../utils/constants.js';
import { aabbOverlap, isStomping } from '../physics/collision.js';
import type { Camera } from './camera.js';
import type { Mario } from '../entities/mario.js';
import {
  Goomba, Koopa, Shell, Mushroom, FireFlower, Star,
  Fireball, CoinPopup, BrickParticle, ScorePopup, type Entity,
} from '../entities/entities.js';
import { audio } from '../audio/audio.js';
import type { Input } from './input.js';
import type { Level } from '../world/level.js';

function boxOf(e: { x: number; y: number; width: number; height: number; vx: number; vy: number }) {
  return { x: e.x, y: e.y, width: e.width, height: e.height, vx: e.vx, vy: e.vy };
}

export class EntityManager {
  activateEntities(entities: Entity[], camera: Camera): void {
    const activateX = camera.x + SCREEN_WIDTH + 32;
    for (const e of entities) {
      if (!e.active && e.x < activateX && e.x > camera.x - 32) e.active = true;
    }
  }

  checkEntityCollisions(entities: Entity[], mario: Mario): Entity[] {
    const out: Entity[] = [];
    const mb = boxOf(mario);
    for (const e of entities) {
      if (!e.alive || !e.active) continue;
      if (!aabbOverlap(mb, boxOf(e))) continue;
      switch (e.type) {
        case EntityType.GOOMBA: this.handleGoombaCollision(e as Goomba, mario, out); break;
        case EntityType.KOOPA: this.handleKoopaCollision(e as Koopa, mario, out); break;
        case EntityType.SHELL: this.handleShellCollision(e as Shell, mario); break;
        case EntityType.MUSHROOM: this.handleMushroomCollision(e as Mushroom, mario, out); break;
        case EntityType.FIRE_FLOWER:
          e.alive = false; mario.powerUp(); audio.powerUp();
          mario.addScore(SCORES.FIRE_FLOWER);
          out.push(new ScorePopup(e.x, e.y, SCORES.FIRE_FLOWER));
          break;
        case EntityType.STAR:
          e.alive = false; mario.starPower = STAR_DURATION; audio.powerUp();
          mario.addScore(SCORES.STAR);
          out.push(new ScorePopup(e.x, e.y, SCORES.STAR));
          break;
        case EntityType.PIRANHA:
          if (mario.starPower > 0) { e.alive = false; }
          else if (!mario.isInvincible) {
            const damaged = mario.takeDamage();
            if (damaged && !mario.dead) audio.powerDown();
          }
          break;
      }
    }
    for (const fb of entities) {
      if (fb.type !== EntityType.FIREBALL || !fb.alive) continue;
      for (const e of entities) {
        if (!e.alive || !e.active) continue;
        if (e.type !== EntityType.GOOMBA && e.type !== EntityType.KOOPA && e.type !== EntityType.PIRANHA) continue;
        if (aabbOverlap(boxOf(fb), boxOf(e))) {
          fb.alive = false; e.alive = false; audio.kick();
          mario.addScore(SCORES.SHELL_KILL);
          out.push(new ScorePopup(e.x, e.y, SCORES.SHELL_KILL));
        }
      }
    }
    for (const sh of entities) {
      if (sh.type !== EntityType.SHELL || !sh.alive || !(sh as Shell).moving) continue;
      for (const e of entities) {
        if (!e.alive || !e.active || e === sh) continue;
        if (e.type !== EntityType.GOOMBA && e.type !== EntityType.KOOPA && e.type !== EntityType.SHELL) continue;
        if (aabbOverlap(boxOf(sh), boxOf(e))) {
          e.alive = false; mario.addScore(SCORES.SHELL_KILL);
          out.push(new ScorePopup(e.x, e.y, SCORES.SHELL_KILL));
        }
      }
    }
    return out;
  }

  private handleGoombaCollision(goomba: Goomba, mario: Mario, out: Entity[]): void {
    if (mario.starPower > 0) {
      goomba.alive = false; mario.addScore(SCORES.GOOMBA_STOMP); audio.kick(); return;
    }
    if (isStomping(boxOf(mario), boxOf(goomba))) {
      goomba.stomp(); mario.bounce(); audio.stomp();
      this.awardStompScore(mario, goomba.x, goomba.y, out);
    } else {
      const damaged = mario.takeDamage();
      if (damaged && !mario.dead) audio.powerDown();
    }
  }

  private handleKoopaCollision(koopa: Koopa, mario: Mario, out: Entity[]): void {
    if (mario.starPower > 0) {
      koopa.alive = false; mario.addScore(SCORES.KOOPA_STOMP); audio.kick(); return;
    }
    if (isStomping(boxOf(mario), boxOf(koopa))) {
      koopa.alive = false;
      out.push(new Shell(koopa.x, koopa.y + 8));
      mario.bounce(); audio.stomp();
      this.awardStompScore(mario, koopa.x, koopa.y, out);
    } else {
      const damaged = mario.takeDamage();
      if (damaged && !mario.dead) audio.powerDown();
    }
  }

  private awardStompScore(mario: Mario, x: number, y: number, out: Entity[]): void {
    const combo = mario.stompCombo;
    if (combo >= STOMP_SCORES.length) {
      // 9th+ consecutive stomp: award 1UP
      mario.lives++;
      out.push(new ScorePopup(x, y, '1UP'));
      audio.oneUp();
    } else {
      const points = STOMP_SCORES[combo];
      mario.addScore(points);
      out.push(new ScorePopup(x, y, points));
    }
    mario.stompCombo++;
  }

  private handleShellCollision(shell: Shell, mario: Mario): void {
    if (shell.moving) {
      if (mario.starPower > 0) { shell.alive = false; return; }
      if (isStomping(boxOf(mario), boxOf(shell))) {
        shell.moving = false; shell.vx = 0; mario.bounce();
      } else {
        const damaged = mario.takeDamage();
        if (damaged && !mario.dead) audio.powerDown();
      }
    } else {
      shell.kick(mario.centerX < shell.x + shell.width / 2);
      audio.kick();
    }
  }

  private handleMushroomCollision(mushroom: Mushroom, mario: Mario, out: Entity[]): void {
    mushroom.alive = false;
    if (mushroom.isOneUp) {
      mario.lives++; audio.oneUp();
      out.push(new ScorePopup(mushroom.x, mushroom.y, 0));
    } else {
      mario.powerUp(); audio.powerUp();
      mario.addScore(SCORES.MUSHROOM);
      out.push(new ScorePopup(mushroom.x, mushroom.y, SCORES.MUSHROOM));
    }
  }

  spawnFromBlock(col: number, row: number, content: string, mario: Mario): Entity[] {
    const x = col * TILE, y = row * TILE;
    const out: Entity[] = [];
    switch (content) {
      case 'coin':
        out.push(new CoinPopup(x, y - TILE));
        mario.addCoin(); audio.coin();
        out.push(new ScorePopup(x, y - TILE, SCORES.QUESTION_COIN));
        break;
      case 'mushroom':
      case 'fire-flower':
        out.push(mario.isSmall ? new Mushroom(x, y - TILE) : new FireFlower(x, y - TILE));
        break;
      case 'star':
        out.push(new Star(x, y - TILE));
        break;
      case '1up': {
        const m = new Mushroom(x, y - TILE); m.isOneUp = true; out.push(m);
        break;
      }
    }
    return out;
  }

  spawnBrickParticles(col: number, row: number): Entity[] {
    const x = col * TILE, y = row * TILE;
    return [
      new BrickParticle(x, y, -1.5, -5), new BrickParticle(x + 8, y, 1.5, -5),
      new BrickParticle(x, y, -1, -3), new BrickParticle(x + 8, y, 1, -3),
    ];
  }

  bumpEnemiesAbove(col: number, row: number, entities: Entity[], mario: Mario): Entity[] {
    const bx = col * TILE, by = (row - 1) * TILE;
    const out: Entity[] = [];
    for (const e of entities) {
      if (!e.alive || !e.active) continue;
      if (e.type === EntityType.GOOMBA || e.type === EntityType.KOOPA) {
        if (e.x + e.width > bx && e.x < bx + TILE && Math.abs(e.y + e.height - by - TILE) < 4) {
          e.alive = false; mario.addScore(SCORES.GOOMBA_STOMP);
          out.push(new ScorePopup(e.x, e.y, SCORES.GOOMBA_STOMP));
        }
      }
    }
    return out;
  }

  hitBlock(col: number, row: number, tile: number, level: Level, mario: Mario, entities: Entity[], brickHits: Map<string, number>): Entity[] {
    const out: Entity[] = [];
    if (tile === TileType.QUESTION) {
      const content = level.getBlockContent(col, row);
      level.setTile(col, row, TileType.QUESTION_EMPTY);
      level.removeBlockContent(col, row);
      out.push(...this.spawnFromBlock(col, row, content || 'coin', mario));
      level.startBump(col, row);
      audio.bump();
    } else if (tile === TileType.BRICK) {
      const content = level.getBlockContent(col, row);
      if (content === 'multi-coin') {
        out.push(...this.spawnFromBlock(col, row, 'coin', mario));
        const key = `${col},${row}`;
        const hitCount = (brickHits.get(key) || 0) + 1;
        brickHits.set(key, hitCount);
        if (hitCount >= 10) { level.setTile(col, row, TileType.QUESTION_EMPTY); level.removeBlockContent(col, row); }
        level.startBump(col, row);
        audio.bump();
      } else if (content) {
        level.setTile(col, row, TileType.QUESTION_EMPTY);
        level.removeBlockContent(col, row);
        out.push(...this.spawnFromBlock(col, row, content, mario));
        level.startBump(col, row);
        audio.bump();
      } else if (mario.isBig) {
        level.setTile(col, row, TileType.EMPTY);
        level.startBump(col, row);
        out.push(...this.spawnBrickParticles(col, row));
        audio.breakBlock(); mario.addScore(50);
      } else { level.startBump(col, row); audio.bump(); }
      out.push(...this.bumpEnemiesAbove(col, row, entities, mario));
    } else if (tile === TileType.HIDDEN) {
      const content = level.getBlockContent(col, row);
      level.setTile(col, row, TileType.QUESTION_EMPTY);
      level.removeBlockContent(col, row);
      out.push(...this.spawnFromBlock(col, row, content || 'coin', mario));
      level.startBump(col, row);
      audio.bump();
    }
    return out;
  }

  handleFireball(mario: Mario, entities: Entity[], fireballCooldown: number, inputRef: Input): { cooldown: number; newEntities: Entity[] } {
    const newEntities: Entity[] = [];
    if (!mario.isFire || fireballCooldown > 0) return { cooldown: fireballCooldown, newEntities };
    if (inputRef.run && inputRef.justPressed('KeyZ') || inputRef.justPressed('ShiftLeft') || inputRef.justPressed('ShiftRight')) {
      const fbCount = entities.filter(e => e.type === EntityType.FIREBALL && e.alive).length;
      if (fbCount < 2) {
        const fbX = mario.facingRight ? mario.x + mario.width : mario.x - 8;
        newEntities.push(new Fireball(fbX, mario.y + 8, mario.facingRight));
        audio.fireball();
        return { cooldown: 10, newEntities };
      }
    }
    return { cooldown: fireballCooldown, newEntities };
  }
}
