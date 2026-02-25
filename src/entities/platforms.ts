import {
  EntityType, SCREEN_HEIGHT, COLORS,
} from '../utils/constants.js';
import type { Level } from '../world/level.js';
import type { Camera } from '../engine/camera.js';
import type { SpriteSheet } from '../sprites/sprites.js';
import type { Entity } from './entities.js';

const PLATFORM_SPEED = 1;

export class MovingPlatform implements Entity {
  type = EntityType.PLATFORM;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  width: number;
  height = 8;
  alive = true;
  active = false;
  timer = 0;
  frame = 0;
  facingRight = true;
  onGround = false;

  direction: 'horizontal' | 'vertical';
  minPos: number;
  maxPos: number;
  speed: number;

  constructor(
    x: number,
    y: number,
    direction: 'horizontal' | 'vertical',
    minPos: number,
    maxPos: number,
    platformWidth = 48,
  ) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.minPos = minPos;
    this.maxPos = maxPos;
    this.width = platformWidth;
    this.speed = PLATFORM_SPEED;

    if (direction === 'horizontal') {
      this.vx = this.speed;
      this.vy = 0;
    } else {
      this.vx = 0;
      this.vy = this.speed;
    }
  }

  update(_level: Level): void {
    if (this.direction === 'horizontal') {
      this.x += this.vx;
      if (this.x >= this.maxPos) {
        this.x = this.maxPos;
        this.vx = -this.speed;
      } else if (this.x <= this.minPos) {
        this.x = this.minPos;
        this.vx = this.speed;
      }
    } else {
      this.y += this.vy;
      if (this.y >= this.maxPos) {
        this.y = this.maxPos;
        this.vy = -this.speed;
      } else if (this.y <= this.minPos) {
        this.y = this.minPos;
        this.vy = this.speed;
      }
    }

    if (this.y > SCREEN_HEIGHT + 64) this.alive = false;
    this.timer++;
  }

  draw(ctx: CanvasRenderingContext2D, _sprites: SpriteSheet, camera: Camera): void {
    const sx = camera.screenX(this.x);
    const sy = camera.screenY(this.y);

    // Draw platform as a series of block-like segments
    const segments = Math.floor(this.width / 16);
    for (let i = 0; i < segments; i++) {
      const px = sx + i * 16;
      // Top surface (light)
      ctx.fillStyle = COLORS.GROUND_LIGHT;
      ctx.fillRect(px, sy, 16, 2);
      // Body (dark)
      ctx.fillStyle = COLORS.GROUND_DARK;
      ctx.fillRect(px, sy + 2, 16, 6);
      // Highlight edges
      ctx.fillStyle = COLORS.WHITE;
      ctx.fillRect(px, sy, 1, 1);
    }
  }
}
