import {
  TILE, GRAVITY, MAX_FALL_SPEED,
  MARIO_WALK_ACCEL, MARIO_RUN_ACCEL,
  MARIO_WALK_MAX, MARIO_RUN_MAX,
  MARIO_FRICTION, MARIO_SKID_DECEL,
  MARIO_JUMP_VELOCITY, MARIO_HIGH_JUMP_VELOCITY,
  MARIO_JUMP_GRAVITY, MARIO_BOUNCE_VELOCITY,
  MarioState, STAR_DURATION, INVINCIBLE_DURATION,
  SCREEN_HEIGHT,
} from '../utils/constants.js';
import { resolveMapCollision } from '../physics/collision.js';
import type { Level } from '../world/level.js';
import type { Input } from '../engine/input.js';
import type { SpriteSheet } from '../sprites/sprites.js';
import type { Camera } from '../engine/camera.js';

export class Mario {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  width = 14;  // slightly narrower than 16 for forgiving collision
  height = 16;

  state = MarioState.SMALL;
  facingRight = true;
  onGround = false;
  jumping = false;
  jumpHeld = false;
  crouching = false;
  invincible = 0;      // frames of invincibility after hit
  starPower = 0;       // frames of star power
  dead = false;
  dying = false;
  deathTimer = 0;
  enteringPipe = false;
  onFlagpole = false;
  flagSlideY = 0;
  walkFrame = 0;
  walkTimer = 0;
  growTimer = 0;       // growing/shrinking animation
  growState: 'none' | 'growing' | 'shrinking' = 'none';

  // Score combo for consecutive stomps without touching ground
  stompCombo = 0;

  lives = 3;
  coins = 0;
  score = 0;
  finishedLevel = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get centerX(): number { return this.x + this.width / 2; }
  get bottom(): number { return this.y + this.height; }
  get isSmall(): boolean { return this.state === MarioState.SMALL; }
  get isBig(): boolean { return this.state === MarioState.BIG || this.state === MarioState.FIRE; }
  get isFire(): boolean { return this.state === MarioState.FIRE; }
  get isInvincible(): boolean { return this.invincible > 0 || this.starPower > 0; }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.state = MarioState.SMALL;
    this.height = 16;
    this.facingRight = true;
    this.onGround = false;
    this.jumping = false;
    this.dead = false;
    this.dying = false;
    this.invincible = 0;
    this.starPower = 0;
    this.crouching = false;
    this.onFlagpole = false;
    this.finishedLevel = false;
    this.growTimer = 0;
    this.growState = 'none';
    this.stompCombo = 0;
  }

  update(input: Input, level: Level): void {
    if (this.dying) {
      this.updateDying();
      return;
    }
    if (this.onFlagpole) {
      this.updateFlagSlide();
      return;
    }
    if (this.growTimer > 0) {
      this.growTimer--;
      return; // Freeze during grow/shrink animation
    }

    // Decrement timers
    if (this.invincible > 0) this.invincible--;
    if (this.starPower > 0) this.starPower--;

    this.handleMovement(input);
    this.handleJump(input);
    this.handleCrouch(input);
    this.applyGravity();
    this.resolveCollisions(level);
    this.updateAnimation();

    // Fall off screen = death
    if (this.y > SCREEN_HEIGHT + 16) {
      this.die();
    }
  }

  private handleMovement(input: Input): void {
    const running = input.run;
    const maxSpeed = running ? MARIO_RUN_MAX : MARIO_WALK_MAX;
    const accel = running ? MARIO_RUN_ACCEL : MARIO_WALK_ACCEL;

    if (this.crouching && this.onGround) {
      // Can't move while crouching (but still have friction)
      this.applyFriction();
      return;
    }

    if (input.right) {
      this.facingRight = true;
      if (this.vx < 0 && this.onGround) {
        // Skidding
        this.vx += MARIO_SKID_DECEL;
      } else {
        this.vx += accel;
        if (this.vx > maxSpeed) this.vx = maxSpeed;
      }
    } else if (input.left) {
      this.facingRight = false;
      if (this.vx > 0 && this.onGround) {
        this.vx -= MARIO_SKID_DECEL;
      } else {
        this.vx -= accel;
        if (this.vx < -maxSpeed) this.vx = -maxSpeed;
      }
    } else {
      this.applyFriction();
    }
  }

  private applyFriction(): void {
    if (this.vx > 0) {
      this.vx = Math.max(0, this.vx - MARIO_FRICTION);
    } else if (this.vx < 0) {
      this.vx = Math.min(0, this.vx + MARIO_FRICTION);
    }
  }

  private handleJump(input: Input): void {
    if (input.jump && this.onGround && !this.jumping) {
      // Initiate jump
      const isRunning = Math.abs(this.vx) > MARIO_WALK_MAX;
      this.vy = isRunning ? MARIO_HIGH_JUMP_VELOCITY : MARIO_JUMP_VELOCITY;
      this.jumping = true;
      this.jumpHeld = true;
      this.onGround = false;
      this.stompCombo = 0;
      return; // Return true to play sound in game.ts
    }

    if (!input.jump) {
      this.jumpHeld = false;
    }
  }

  private handleCrouch(input: Input): void {
    if (this.isBig && input.down && this.onGround) {
      if (!this.crouching) {
        this.crouching = true;
        this.y += 16; // Drop down when crouching
        this.height = 16;
      }
    } else if (this.crouching) {
      this.crouching = false;
      this.y -= 16; // Stand back up
      this.height = 32;
    }
  }

  private applyGravity(): void {
    // Variable height jump: lower gravity while jump held
    const grav = (this.jumpHeld && this.vy < 0) ? MARIO_JUMP_GRAVITY : GRAVITY;
    this.vy += grav;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;
  }

  private resolveCollisions(level: Level): void {
    const aabb = { x: this.x, y: this.y, width: this.width, height: this.height, vx: this.vx, vy: this.vy };
    const result = resolveMapCollision(aabb, level);

    this.x = aabb.x;
    this.y = aabb.y;
    this.vx = aabb.vx;
    this.vy = aabb.vy;

    this.onGround = result.bottom;
    if (this.onGround) {
      this.jumping = false;
    }

    // Prevent going off left edge of screen (store camera reference via level)
    if (this.x < 0) {
      this.x = 0;
      this.vx = 0;
    }
  }

  /** Hit tiles list is used by game.ts for block interactions */
  getHitResult(level: Level): { col: number; row: number; side: string }[] {
    const aabb = { x: this.x, y: this.y, width: this.width, height: this.height, vx: this.vx, vy: this.vy };
    // We recalculate to get hit tiles — slightly wasteful but keeps things clean
    const testAabb = { ...aabb };
    testAabb.x += testAabb.vx;
    const left = Math.floor(testAabb.x / TILE);
    const right = Math.floor((testAabb.x + testAabb.width - 1) / TILE);
    testAabb.y += testAabb.vy;

    const tiles: { col: number; row: number; side: string }[] = [];
    if (testAabb.vy < 0) {
      const row = Math.floor(testAabb.y / TILE);
      for (let col = left; col <= right; col++) {
        if (level.isSolid(col, row)) {
          tiles.push({ col, row, side: 'top' });
        }
      }
    }
    return tiles;
  }

  private updateAnimation(): void {
    if (!this.onGround) return;
    if (Math.abs(this.vx) > 0.1) {
      this.walkTimer++;
      const speed = Math.abs(this.vx);
      const interval = speed > MARIO_WALK_MAX ? 4 : speed > 0.5 ? 6 : 10;
      if (this.walkTimer >= interval) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 3;
      }
    } else {
      this.walkFrame = 0;
      this.walkTimer = 0;
    }
  }

  private updateDying(): void {
    this.deathTimer++;
    if (this.deathTimer === 1) {
      this.vy = MARIO_JUMP_VELOCITY; // Pop up
      this.vx = 0;
    }
    if (this.deathTimer > 10) {
      this.vy += GRAVITY;
    }
    this.y += this.vy;
  }

  private updateFlagSlide(): void {
    this.flagSlideY += 2;
    this.y += 2;
    // Will be controlled by game.ts for the full flagpole sequence
  }

  /** Grow from small to big */
  powerUp(): void {
    if (this.state === MarioState.SMALL) {
      this.state = MarioState.BIG;
      this.height = 32;
      this.y -= 16; // Grow upward
      this.growTimer = 45;
      this.growState = 'growing';
    } else if (this.state === MarioState.BIG) {
      this.state = MarioState.FIRE;
      this.growTimer = 20;
      this.growState = 'growing';
    }
  }

  /** Take damage */
  takeDamage(): boolean {
    if (this.isInvincible) return false;

    if (this.state === MarioState.FIRE) {
      this.state = MarioState.BIG;
      this.invincible = INVINCIBLE_DURATION;
      return true;
    } else if (this.state === MarioState.BIG) {
      this.state = MarioState.SMALL;
      this.height = 16;
      this.y += 16; // Shrink downward
      this.invincible = INVINCIBLE_DURATION;
      this.growTimer = 45;
      this.growState = 'shrinking';
      return true;
    } else {
      this.die();
      return true;
    }
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    this.dying = true;
    this.deathTimer = 0;
    this.lives--;
  }

  addCoin(): void {
    this.coins++;
    this.score += 200;
    if (this.coins >= 100) {
      this.coins -= 100;
      this.lives++;
    }
  }

  addScore(points: number): void {
    this.score += points;
  }

  bounce(): void {
    this.vy = MARIO_BOUNCE_VELOCITY;
    this.jumping = true;
    this.stompCombo++;
  }

  /** Get sprite name for current state */
  getSpriteName(): string {
    const prefix = this.state === MarioState.FIRE ? 'mario-fire' :
      this.state === MarioState.BIG ? 'mario-big' : 'mario-small';

    if (this.dying) return 'mario-small-die';
    if (this.onFlagpole) return `${prefix}-flag`;

    if (this.crouching && this.isBig) return `${prefix}-crouch`;
    if (!this.onGround) return `${prefix}-jump`;

    // Skidding
    if (this.onGround && Math.abs(this.vx) > 0.5 &&
      ((this.vx > 0 && !this.facingRight) || (this.vx < 0 && this.facingRight))) {
      return `${prefix}-skid`;
    }

    if (Math.abs(this.vx) > 0.1) {
      return `${prefix}-walk-${this.walkFrame + 1}`;
    }

    return `${prefix}-idle`;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteSheet, camera: Camera): void {
    // Flashing when invincible
    if (this.invincible > 0 && !this.starPower && Math.floor(this.invincible / 2) % 2 === 0) {
      return; // Skip drawing for flash effect
    }

    const sx = camera.screenX(this.x - 1); // -1 to center 14px hitbox in 16px sprite
    const sy = camera.screenY(this.y);
    const spriteName = this.getSpriteName();

    // Growing animation: alternate between small and big
    if (this.growTimer > 0) {
      const alt = Math.floor(this.growTimer / 4) % 2;
      if (this.growState === 'growing') {
        const name = alt === 0 ? spriteName : spriteName.replace('big', 'small').replace('fire', 'small');
        sprites.draw(ctx, name, sx, alt === 0 ? sy : sy + 16, !this.facingRight);
      } else {
        const name = alt === 0 ? spriteName : spriteName.replace('small', 'big');
        sprites.draw(ctx, name, sx, alt === 0 ? sy : sy - 16, !this.facingRight);
      }
      return;
    }

    // Star power: cycle palette (handled by sprite tinting)
    sprites.draw(ctx, spriteName, sx, sy, !this.facingRight);
  }
}
