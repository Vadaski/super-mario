import { EntityType, SCREEN_HEIGHT } from '../utils/constants.js';
import type { Level } from '../world/level.js';
import type { SpriteSheet } from '../sprites/sprites.js';
import type { Camera } from '../engine/camera.js';
import type { Entity } from './entities.js';

/**
 * Fire Bar - a chain of fireballs rotating around a center pivot block.
 * Passes through all terrain. Damages Mario on contact.
 */
export class FireBar implements Entity {
  type = EntityType.FIRE_BAR;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  width = 16;
  height = 16;
  alive = true;
  active = false;
  timer = 0;
  frame = 0;
  facingRight = true;
  onGround = true;

  centerX: number;
  centerY: number;
  angle: number;
  speed: number;
  numBalls: number;
  ballSpacing: number;

  constructor(cx: number, cy: number, speed = 0.03, numBalls = 6, ballSpacing = 8) {
    this.centerX = cx;
    this.centerY = cy;
    this.x = cx;
    this.y = cy;
    this.angle = 0;
    this.speed = speed;
    this.numBalls = numBalls;
    this.ballSpacing = ballSpacing;
  }

  update(_level: Level): void {
    this.angle += this.speed;
    this.timer++;
    this.frame = Math.floor(this.timer / 4) % 4;
  }

  /** Check if a point (Mario's AABB) overlaps any fireball in the chain */
  overlapsEntity(ex: number, ey: number, ew: number, eh: number): boolean {
    const ballRadius = 4;
    for (let i = 1; i <= this.numBalls; i++) {
      const bx = this.centerX + 8 + Math.cos(this.angle) * i * this.ballSpacing;
      const by = this.centerY + 8 + Math.sin(this.angle) * i * this.ballSpacing;
      // Circle vs AABB overlap
      const closestX = Math.max(ex, Math.min(bx, ex + ew));
      const closestY = Math.max(ey, Math.min(by, ey + eh));
      const dx = bx - closestX;
      const dy = by - closestY;
      if (dx * dx + dy * dy < ballRadius * ballRadius) return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D, _sprites: SpriteSheet, camera: Camera): void {
    // Draw center block
    const sx = camera.screenX(this.centerX);
    const sy = camera.screenY(this.centerY);
    ctx.fillStyle = '#585858';
    ctx.fillRect(sx, sy, 16, 16);

    // Draw fireball chain
    for (let i = 1; i <= this.numBalls; i++) {
      const bx = this.centerX + 8 + Math.cos(this.angle) * i * this.ballSpacing;
      const by = this.centerY + 8 + Math.sin(this.angle) * i * this.ballSpacing;
      const fbsx = camera.screenX(bx) - 4;
      const fbsy = camera.screenY(by) - 4;
      const color = (this.frame + i) % 2 === 0 ? '#FC7C00' : '#D82800';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(fbsx + 4, fbsy + 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
