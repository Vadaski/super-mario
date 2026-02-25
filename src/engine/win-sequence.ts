import { TILE } from '../utils/constants.js';
import { audio } from '../audio/audio.js';
import type { Mario } from '../entities/mario.js';
import type { Camera } from './camera.js';

export interface Firework {
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
}

export const enum WinPhase {
  SLIDING,
  WALK_TO_CASTLE,
  CASTLE_FLAG,
  FIREWORKS,
  TIMER_DRAIN,
  DONE,
}

export class WinSequence {
  phase = WinPhase.SLIDING;
  flagY = 0;
  castleFlagY = 0;
  castleFlagRising = false;
  fireworks: Firework[] = [];
  private fireworkCount = 0;
  private fireworksSpawned = 0;
  private fireworkDelay = 0;
  private walkToCastleX = 0;
  private flagPoleTopY = 0;
  private flagPoleBottomY = 0;
  private castleTopY = 0;
  private castleX = 0;
  private phaseTimer = 0;
  private timerLastDigit = 0;

  start(mario: Mario, flagX: number, castleX: number, timer: number): void {
    this.phase = WinPhase.SLIDING;
    this.phaseTimer = 0;
    this.flagPoleTopY = 4 * TILE + 8;
    this.flagPoleBottomY = 12 * TILE;
    this.flagY = this.flagPoleTopY;
    this.castleTopY = 6 * TILE - 8;
    this.castleX = castleX;
    this.castleFlagY = this.castleTopY + 16;
    this.castleFlagRising = false;
    this.walkToCastleX = castleX + 16;
    this.fireworks = [];
    this.fireworkCount = 0;
    this.fireworksSpawned = 0;
    this.fireworkDelay = 0;
    this.timerLastDigit = timer % 10;

    mario.onFlagpole = true;
    mario.vx = 0;
    mario.vy = 0;
    mario.x = flagX - 6;
    audio.stopMusic();
    audio.flagpole();
  }

  update(mario: Mario, camera: Camera, timer: number): { newTimer: number; scoreAdd: number; finished: boolean } {
    this.phaseTimer++;
    let scoreAdd = 0;
    let newTimer = timer;

    switch (this.phase) {
      case WinPhase.SLIDING:
        mario.y += 2;
        this.flagY = Math.min(this.flagY + 2, this.flagPoleBottomY);
        if (mario.y >= this.flagPoleBottomY) {
          mario.y = this.flagPoleBottomY;
          this.flagY = this.flagPoleBottomY;
          this.phase = WinPhase.WALK_TO_CASTLE;
          mario.onFlagpole = false;
          mario.facingRight = true;
          this.phaseTimer = 0;
          audio.stageClear();
        }
        break;

      case WinPhase.WALK_TO_CASTLE:
        mario.x += 1;
        mario.vx = 1;
        mario.walkTimer++;
        if (mario.walkTimer >= 6) {
          mario.walkTimer = 0;
          mario.walkFrame = (mario.walkFrame + 1) % 3;
        }
        camera.update(mario.centerX, mario.y);
        if (mario.x >= this.walkToCastleX) {
          mario.finishedLevel = true;
          this.phase = WinPhase.CASTLE_FLAG;
          this.castleFlagRising = true;
          this.phaseTimer = 0;
        }
        break;

      case WinPhase.CASTLE_FLAG:
        if (this.castleFlagRising) {
          this.castleFlagY -= 0.5;
          if (this.phaseTimer >= 30) {
            this.castleFlagRising = false;
            this.phase = WinPhase.FIREWORKS;
            this.phaseTimer = 0;
            this.determineFireworkCount();
          }
        }
        break;

      case WinPhase.FIREWORKS:
        if (this.fireworkCount === 0) {
          this.phase = WinPhase.TIMER_DRAIN;
          this.phaseTimer = 0;
        } else {
          this.fireworkDelay++;
          if (this.fireworksSpawned < this.fireworkCount && this.fireworkDelay >= 30) {
            this.fireworkDelay = 0;
            this.fireworksSpawned++;
            scoreAdd += 500;
            const fx = this.castleX + (Math.random() * 80 - 40);
            const fy = this.castleTopY - 16 + (Math.random() * 40 - 20);
            this.fireworks.push({ x: fx, y: fy, frame: 0, maxFrames: 20 });
          }
          for (const fw of this.fireworks) fw.frame++;
          this.fireworks = this.fireworks.filter(fw => fw.frame <= fw.maxFrames);
          if (this.fireworksSpawned >= this.fireworkCount && this.fireworks.length === 0) {
            this.phase = WinPhase.TIMER_DRAIN;
            this.phaseTimer = 0;
          }
        }
        break;

      case WinPhase.TIMER_DRAIN:
        if (newTimer > 0) {
          newTimer -= 2;
          if (newTimer < 0) newTimer = 0;
          scoreAdd += 100;
        } else if (this.phaseTimer > 120) {
          this.phase = WinPhase.DONE;
        }
        break;

      case WinPhase.DONE:
        return { newTimer, scoreAdd, finished: true };
    }

    return { newTimer, scoreAdd, finished: false };
  }

  private determineFireworkCount(): void {
    const d = this.timerLastDigit;
    if (d === 1) this.fireworkCount = 1;
    else if (d === 3) this.fireworkCount = 3;
    else if (d === 6) this.fireworkCount = 6;
    else this.fireworkCount = 0;
  }
}
