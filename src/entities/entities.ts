import {
  TILE, GRAVITY, MAX_FALL_SPEED, SCREEN_HEIGHT,
  GOOMBA_SPEED, KOOPA_SPEED, SHELL_SPEED, MUSHROOM_SPEED,
  FIREBALL_SPEED, FIREBALL_BOUNCE, EntityType, SCORES, TileType,
} from '../utils/constants.js';
import { resolveMapCollision, aabbOverlap, isStomping } from '../physics/collision.js';
import type { Level } from '../world/level.js';
import type { Camera } from '../engine/camera.js';
import type { SpriteSheet } from '../sprites/sprites.js';

export interface Entity {
  type: EntityType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  alive: boolean;
  active: boolean; // activated when scrolled into view
  timer: number;
  frame: number;
  facingRight: boolean;
  onGround: boolean;
  update(level: Level): void;
  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void;
}

// ─── GOOMBA ───
export class Goomba implements Entity {
  type = EntityType.GOOMBA;
  x: number; y: number; vx: number; vy = 0;
  width = 16; height = 16;
  alive = true; active = false;
  timer = 0; frame = 0; facingRight = false; onGround = false;
  flat = false; flatTimer = 0;

  constructor(x: number, y: number) {
    this.x = x; this.y = y; this.vx = -GOOMBA_SPEED;
  }

  update(level: Level): void {
    if (this.flat) {
      this.flatTimer--;
      if (this.flatTimer <= 0) this.alive = false;
      return;
    }
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

    const aabb = { x: this.x, y: this.y, width: this.width, height: this.height, vx: this.vx, vy: this.vy };
    const result = resolveMapCollision(aabb, level);
    this.x = aabb.x; this.y = aabb.y; this.vx = aabb.vx; this.vy = aabb.vy;
    this.onGround = result.bottom;

    if (result.left || result.right) this.vx = -this.vx;
    if (this.y > SCREEN_HEIGHT + 32) this.alive = false;

    this.timer++;
    this.frame = Math.floor(this.timer / 8) % 2;
  }

  stomp(): void {
    this.flat = true; this.flatTimer = 30; this.vx = 0;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    if (this.flat) { sprites.draw(ctx, 'goomba-flat', sx, sy + 8); }
    else { sprites.draw(ctx, `goomba-${this.frame + 1}`, sx, sy); }
  }
}

// ─── KOOPA ───
export class Koopa implements Entity {
  type = EntityType.KOOPA;
  x: number; y: number; vx: number; vy = 0;
  width = 16; height = 24;
  alive = true; active = false;
  timer = 0; frame = 0; facingRight = false; onGround = false;

  constructor(x: number, y: number) {
    this.x = x; this.y = y - 8; this.vx = -KOOPA_SPEED;
  }

  update(level: Level): void {
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

    const aabb = { x: this.x, y: this.y, width: this.width, height: this.height, vx: this.vx, vy: this.vy };
    const result = resolveMapCollision(aabb, level);
    this.x = aabb.x; this.y = aabb.y; this.vx = aabb.vx; this.vy = aabb.vy;
    this.onGround = result.bottom;

    if (result.left || result.right) this.vx = -this.vx;
    this.facingRight = this.vx > 0;
    if (this.y > SCREEN_HEIGHT + 32) this.alive = false;

    this.timer++;
    this.frame = Math.floor(this.timer / 8) % 2;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    sprites.draw(ctx, `koopa-walk-${this.frame + 1}`, sx, sy, this.facingRight);
  }
}

// ─── SHELL ───
export class Shell implements Entity {
  type = EntityType.SHELL;
  x: number; y: number; vx = 0; vy = 0;
  width = 16; height = 16;
  alive = true; active = true;
  timer = 0; frame = 0; facingRight = false; onGround = false;
  moving = false;
  shellTimer = 0; // Time before koopa pops out
  brokenBricks: { col: number; row: number }[] = [];

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
  }

  kick(fromLeft: boolean): void {
    this.vx = fromLeft ? SHELL_SPEED : -SHELL_SPEED;
    this.moving = true;
    this.shellTimer = 0;
  }

  update(level: Level): void {
    this.brokenBricks = [];
    if (!this.moving) {
      this.shellTimer++;
      // After 300 frames, Koopa pops back out (we'll handle this in game.ts)
      this.timer++;
      this.frame = this.shellTimer > 200 ? Math.floor(this.timer / 8) % 2 : 0;
      return;
    }

    this.vy += GRAVITY;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

    const savedVx = this.vx;
    const aabb = { x: this.x, y: this.y, width: this.width, height: this.height, vx: this.vx, vy: this.vy };
    const result = resolveMapCollision(aabb, level);
    this.x = aabb.x; this.y = aabb.y; this.vx = aabb.vx; this.vy = aabb.vy;
    this.onGround = result.bottom;

    // Check for brick tiles hit on left/right and break them
    let hitBrick = false;
    for (const hit of result.hitTiles) {
      if (hit.side !== 'left' && hit.side !== 'right') continue;
      const tile = level.getTile(hit.col, hit.row);
      if (tile === TileType.BRICK && !level.getBlockContent(hit.col, hit.row)) {
        level.setTile(hit.col, hit.row, TileType.EMPTY);
        this.brokenBricks.push({ col: hit.col, row: hit.row });
        hitBrick = true;
      }
    }

    if (hitBrick) {
      // Shell continues through broken bricks, restore velocity
      this.vx = savedVx;
    } else if (result.left || result.right) {
      this.vx = -this.vx;
    }
    if (this.y > SCREEN_HEIGHT + 32) this.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    const name = this.shellTimer > 200 ? 'shell-legs' : 'shell';
    sprites.draw(ctx, name, sx, sy);
  }
}

// ─── MUSHROOM ───
export class Mushroom implements Entity {
  type = EntityType.MUSHROOM;
  x: number; y: number; vx = MUSHROOM_SPEED; vy = 0;
  width = 16; height = 16;
  alive = true; active = true;
  timer = 0; frame = 0; facingRight = true; onGround = false;
  emerging = true; emergeY: number;
  isOneUp = false;

  constructor(x: number, y: number) {
    this.x = x; this.emergeY = y; this.y = y + 16; // Start hidden inside block
  }

  update(level: Level): void {
    if (this.emerging) {
      this.y -= 1;
      if (this.y <= this.emergeY) {
        this.y = this.emergeY;
        this.emerging = false;
      }
      return;
    }

    this.vy += GRAVITY;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

    const aabb = { x: this.x, y: this.y, width: this.width, height: this.height, vx: this.vx, vy: this.vy };
    const result = resolveMapCollision(aabb, level);
    this.x = aabb.x; this.y = aabb.y; this.vx = aabb.vx; this.vy = aabb.vy;
    this.onGround = result.bottom;

    if (result.left || result.right) this.vx = -this.vx;
    if (this.y > SCREEN_HEIGHT + 32) this.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    if (this.emerging && this.y > this.emergeY + 8) return; // Still mostly hidden
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    sprites.draw(ctx, 'mushroom', sx, sy);
  }
}

// ─── FIRE FLOWER ───
export class FireFlower implements Entity {
  type = EntityType.FIRE_FLOWER;
  x: number; y: number; vx = 0; vy = 0;
  width = 16; height = 16;
  alive = true; active = true;
  timer = 0; frame = 0; facingRight = true; onGround = true;
  emerging = true; emergeY: number;

  constructor(x: number, y: number) {
    this.x = x; this.emergeY = y; this.y = y + 16;
  }

  update(_level: Level): void {
    if (this.emerging) {
      this.y -= 1;
      if (this.y <= this.emergeY) { this.y = this.emergeY; this.emerging = false; }
      return;
    }
    this.timer++;
    this.frame = Math.floor(this.timer / 4) % 4;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    if (this.emerging && this.y > this.emergeY + 8) return;
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    sprites.draw(ctx, `fire-flower-${this.frame + 1}`, sx, sy);
  }
}

// ─── STAR ───
export class Star implements Entity {
  type = EntityType.STAR;
  x: number; y: number; vx = MUSHROOM_SPEED; vy = -4;
  width = 16; height = 16;
  alive = true; active = true;
  timer = 0; frame = 0; facingRight = true; onGround = false;
  emerging = true; emergeY: number;

  constructor(x: number, y: number) {
    this.x = x; this.emergeY = y; this.y = y + 16;
  }

  update(level: Level): void {
    if (this.emerging) {
      this.y -= 1;
      if (this.y <= this.emergeY) { this.y = this.emergeY; this.emerging = false; }
      return;
    }

    this.vy += GRAVITY;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

    const aabb = { x: this.x, y: this.y, width: this.width, height: this.height, vx: this.vx, vy: this.vy };
    const result = resolveMapCollision(aabb, level);
    this.x = aabb.x; this.y = aabb.y; this.vx = aabb.vx; this.vy = aabb.vy;
    this.onGround = result.bottom;

    if (result.left || result.right) this.vx = -this.vx;
    // Star bounces
    if (result.bottom) this.vy = -5;
    if (this.y > SCREEN_HEIGHT + 32) this.alive = false;

    this.timer++;
    this.frame = Math.floor(this.timer / 4) % 4;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    if (this.emerging && this.y > this.emergeY + 8) return;
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    sprites.draw(ctx, `star-${this.frame + 1}`, sx, sy);
  }
}

// ─── FIREBALL (Mario shoots) ───
export class Fireball implements Entity {
  type = EntityType.FIREBALL;
  x: number; y: number; vx: number; vy = 0;
  width = 8; height = 8;
  alive = true; active = true;
  timer = 0; frame = 0; facingRight: boolean; onGround = false;
  bounceCount = 0;

  constructor(x: number, y: number, goRight: boolean) {
    this.x = x; this.y = y;
    this.facingRight = goRight;
    this.vx = goRight ? FIREBALL_SPEED : -FIREBALL_SPEED;
  }

  update(level: Level): void {
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

    const aabb = { x: this.x, y: this.y, width: this.width, height: this.height, vx: this.vx, vy: this.vy };
    const result = resolveMapCollision(aabb, level);
    this.x = aabb.x; this.y = aabb.y; this.vx = aabb.vx; this.vy = aabb.vy;

    if (result.bottom) {
      this.vy = FIREBALL_BOUNCE;
      this.bounceCount++;
    }
    if (result.left || result.right) this.alive = false;
    if (this.bounceCount > 4 || this.y > SCREEN_HEIGHT) this.alive = false;

    this.timer++;
    this.frame = Math.floor(this.timer / 2) % 4;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    sprites.draw(ctx, `fireball-${this.frame + 1}`, sx, sy);
  }
}

// ─── COIN POPUP (from block) ───
export class CoinPopup implements Entity {
  type = EntityType.COIN_BLOCK;
  x: number; y: number; vx = 0; vy = -6;
  width = 16; height = 16;
  alive = true; active = true;
  timer = 0; frame = 0; facingRight = true; onGround = false;
  startY: number;

  constructor(x: number, y: number) {
    this.x = x; this.y = y; this.startY = y;
  }

  update(_level: Level): void {
    this.y += this.vy;
    this.vy += 0.3;
    this.timer++;
    this.frame = Math.floor(this.timer / 2) % 4;
    if (this.y >= this.startY) this.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    sprites.draw(ctx, `coin-${this.frame + 1}`, sx, sy);
  }
}

// ─── COIN PICKUP (floating coin) ───
export class CoinPickup implements Entity {
  type = EntityType.COIN_PICKUP;
  x: number; y: number; vx = 0; vy = 0;
  width = 16; height = 16;
  alive = true; active = true;
  timer = 0; frame = 0; facingRight = true; onGround = true;

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
  }

  update(_level: Level): void {
    this.timer++;
    this.frame = Math.floor(this.timer / 6) % 4;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    sprites.draw(ctx, `coin-${this.frame + 1}`, sx, sy);
  }
}

// ─── BRICK PARTICLE ───
export class BrickParticle implements Entity {
  type = EntityType.BRICK_PARTICLE;
  x: number; y: number; vx: number; vy: number;
  width = 8; height = 8;
  alive = true; active = true;
  timer = 0; frame = 0; facingRight = true; onGround = false;

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
  }

  update(_level: Level): void {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;
    this.timer++;
    if (this.y > SCREEN_HEIGHT + 32) this.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    sprites.draw(ctx, 'brick-particle', sx, sy);
  }
}

// ─── SCORE POPUP ───
export class ScorePopup implements Entity {
  type = EntityType.SCORE_POPUP;
  x: number; y: number; vx = 0; vy = -1;
  width = 0; height = 0;
  alive = true; active = true;
  timer = 0; frame = 0; facingRight = true; onGround = false;
  text: string;

  constructor(x: number, y: number, score: number | string) {
    this.x = x; this.y = y; this.text = score.toString();
  }

  update(_level: Level): void {
    this.y += this.vy;
    this.timer++;
    if (this.timer > 40) this.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D, _sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    ctx.fillStyle = '#FCFCFC';
    ctx.font = '8px monospace';
    ctx.fillText(this.text, sx, sy);
  }
}

// ─── PIRANHA PLANT ───
export class Piranha implements Entity {
  type = EntityType.PIRANHA;
  x: number; y: number; vx = 0; vy = 0;
  width = 16; height = 24;
  alive = true; active = false;
  timer = 0; frame = 0; facingRight = true; onGround = true;
  baseY: number;
  hidden = true;
  emergeTimer = 0;
  retreatTimer = 0;
  state: 'hidden' | 'emerging' | 'visible' | 'retreating' = 'hidden';
  marioX = 0;

  constructor(x: number, y: number) {
    this.x = x; this.baseY = y; this.y = y + 24; // start hidden
  }

  update(_level: Level): void {
    this.timer++;
    this.frame = Math.floor(this.timer / 8) % 2;

    switch (this.state) {
      case 'hidden':
        if (Math.abs(this.marioX - this.x) < 32) { this.emergeTimer = 0; break; }
        this.emergeTimer++;
        if (this.emergeTimer > 60) { this.state = 'emerging'; this.emergeTimer = 0; }
        break;
      case 'emerging':
        this.y -= 0.5;
        if (this.y <= this.baseY) { this.y = this.baseY; this.state = 'visible'; this.retreatTimer = 0; }
        break;
      case 'visible':
        this.retreatTimer++;
        if (this.retreatTimer > 90) { this.state = 'retreating'; }
        break;
      case 'retreating':
        this.y += 0.5;
        if (this.y >= this.baseY + 24) { this.y = this.baseY + 24; this.state = 'hidden'; this.emergeTimer = 0; }
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    if (this.state === 'hidden') return;
    const sx = camera.screenX(this.x); const sy = camera.screenY(this.y);
    sprites.draw(ctx, `piranha-${this.frame + 1}`, sx, sy);
  }
}
