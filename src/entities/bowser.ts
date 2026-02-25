import {
  EntityType, GRAVITY, MAX_FALL_SPEED, SCREEN_HEIGHT,
} from '../utils/constants.js';
import { resolveMapCollision } from '../physics/collision.js';
import type { Level } from '../world/level.js';
import type { SpriteSheet } from '../sprites/sprites.js';
import type { Camera } from '../engine/camera.js';
import type { Entity } from './entities.js';

/**
 * Bowser - the castle boss. Walks back and forth on a bridge, jumps, and
 * breathes fire. Defeated by 5 fireballs or by touching the axe (bridge
 * collapse).
 */
export class Bowser implements Entity {
  type = EntityType.BOWSER;
  x: number;
  y: number;
  vx = -0.5;
  vy = 0;
  width = 32;
  height = 32;
  alive = true;
  active = false;
  timer = 0;
  frame = 0;
  facingRight = false;
  onGround = false;

  health = 5;
  bridgeStart: number;
  bridgeEnd: number;
  jumpTimer = 0;
  fireTimer = 0;
  hitFlash = 0;
  pendingFire = false;
  falling = false;

  constructor(x: number, y: number, bridgeStart: number, bridgeEnd: number) {
    this.x = x;
    this.y = y;
    this.bridgeStart = bridgeStart;
    this.bridgeEnd = bridgeEnd;
  }

  update(level: Level): void {
    if (this.falling) {
      this.vy += GRAVITY;
      if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;
      this.y += this.vy;
      if (this.y > SCREEN_HEIGHT + 64) this.alive = false;
      return;
    }

    this.timer++;
    this.frame = Math.floor(this.timer / 12) % 2;

    if (this.hitFlash > 0) this.hitFlash--;

    // Gravity
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

    const aabb = { x: this.x, y: this.y, width: this.width, height: this.height, vx: this.vx, vy: this.vy };
    const result = resolveMapCollision(aabb, level);
    this.x = aabb.x;
    this.y = aabb.y;
    this.vx = aabb.vx;
    this.vy = aabb.vy;
    this.onGround = result.bottom;

    // Reverse at bridge edges
    if (this.x <= this.bridgeStart) {
      this.x = this.bridgeStart;
      this.vx = 0.5;
    } else if (this.x + this.width >= this.bridgeEnd) {
      this.x = this.bridgeEnd - this.width;
      this.vx = -0.5;
    }
    this.facingRight = this.vx > 0;

    // Jump every ~120 frames
    this.jumpTimer++;
    if (this.jumpTimer >= 120 && this.onGround) {
      this.vy = -5;
      this.jumpTimer = 0;
    }

    // Fire every ~90 frames
    this.fireTimer++;
    if (this.fireTimer >= 90) {
      this.pendingFire = true;
      this.fireTimer = 0;
    }

    // Fall off screen
    if (this.y > SCREEN_HEIGHT + 64) this.alive = false;
  }

  hitByFireball(): boolean {
    this.health--;
    this.hitFlash = 15;
    if (this.health <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  startFalling(): void {
    this.falling = true;
    this.vy = 0;
    this.vx = 0;
  }

  draw(ctx: CanvasRenderingContext2D, _sprites: SpriteSheet, camera: Camera): void {
    if (this.hitFlash > 0 && this.hitFlash % 2 === 0) return;

    const sx = camera.screenX(this.x);
    const sy = camera.screenY(this.y);

    // Body (green shell)
    ctx.fillStyle = '#00A800';
    ctx.fillRect(sx + 4, sy + 8, 24, 20);

    // Shell spikes
    ctx.fillStyle = '#006000';
    ctx.fillRect(sx + 8, sy + 6, 4, 4);
    ctx.fillRect(sx + 16, sy + 6, 4, 4);
    ctx.fillRect(sx + 24, sy + 10, 4, 4);

    // Head
    ctx.fillStyle = '#00A800';
    const headX = this.facingRight ? sx + 22 : sx - 2;
    ctx.fillRect(headX, sy + 4, 12, 14);

    // Eyes
    ctx.fillStyle = '#FCFCFC';
    ctx.fillRect(headX + 3, sy + 6, 3, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(headX + 4, sy + 7, 2, 2);

    // Horns
    ctx.fillStyle = '#FCA044';
    ctx.fillRect(headX + 2, sy, 3, 6);
    ctx.fillRect(headX + 7, sy, 3, 6);

    // Mouth / fire breath indicator
    ctx.fillStyle = '#D82800';
    const mouthX = this.facingRight ? headX + 8 : headX;
    ctx.fillRect(mouthX, sy + 14, 4, 3);

    // Legs (animate)
    ctx.fillStyle = '#00A800';
    const legOffset = this.frame === 0 ? 0 : 2;
    ctx.fillRect(sx + 6, sy + 28, 6, 4 - legOffset);
    ctx.fillRect(sx + 20, sy + 28, 6, 4 - legOffset + (legOffset ? 2 : 0));

    // Belly
    ctx.fillStyle = '#FCA044';
    ctx.fillRect(sx + 8, sy + 16, 16, 10);
  }
}

/**
 * BowserFire - a fireball breathed by Bowser. Travels left with a slight
 * downward arc.
 */
export class BowserFire implements Entity {
  type = EntityType.BOWSER_FIRE;
  x: number;
  y: number;
  vx = -2;
  vy = 0.3;
  width = 16;
  height = 8;
  alive = true;
  active = true;
  timer = 0;
  frame = 0;
  facingRight = false;
  onGround = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(_level: Level): void {
    this.x += this.vx;
    this.y += this.vy;
    this.timer++;
    this.frame = Math.floor(this.timer / 4) % 2;
    if (this.x < -32 || this.y > SCREEN_HEIGHT + 32) this.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D, _sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x);
    const sy = camera.screenY(this.y);
    ctx.fillStyle = this.frame === 0 ? '#FC7C00' : '#D82800';
    ctx.fillRect(sx, sy, 16, 8);
    ctx.fillStyle = '#FCA044';
    ctx.fillRect(sx + 2, sy + 2, 12, 4);
  }
}

/**
 * Axe - touch to trigger bridge collapse and defeat Bowser.
 */
export class Axe implements Entity {
  type = EntityType.AXE;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  width = 16;
  height = 16;
  alive = true;
  active = true;
  timer = 0;
  frame = 0;
  facingRight = true;
  onGround = true;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(_level: Level): void {
    this.timer++;
    this.frame = Math.floor(this.timer / 8) % 2;
  }

  draw(ctx: CanvasRenderingContext2D, _sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x);
    const sy = camera.screenY(this.y);

    // Axe handle
    ctx.fillStyle = '#AC7C00';
    ctx.fillRect(sx + 6, sy + 4, 3, 12);

    // Axe blade
    ctx.fillStyle = this.frame === 0 ? '#A4A4A4' : '#FCFCFC';
    ctx.fillRect(sx + 1, sy + 1, 8, 6);
    ctx.fillRect(sx + 3, sy, 4, 8);
  }
}
