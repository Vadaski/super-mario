// =============================================================================
// Transition Manager - Handles screen transitions between levels
// =============================================================================

import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/constants.js';

const FADE_OUT_FRAMES = 20;
const FADE_IN_FRAMES = 20;
const PIPE_ENTRY_FRAMES = 30;

type TransitionType = 'none' | 'fade-out' | 'fade-in' | 'pipe-entry';

export class TransitionManager {
  private type: TransitionType = 'none';
  private frame = 0;
  private maxFrames = 0;
  private alpha = 0;
  private onComplete: (() => void) | null = null;
  private pipeDirection: 'down' | 'up' = 'down';
  private pipeX = 0;
  private pipeY = 0;

  /** Whether any transition is currently active. */
  get active(): boolean {
    return this.type !== 'none';
  }

  /** Start a pipe entry animation. Mario slides into/out of a pipe. */
  startPipeEntry(
    marioX: number,
    marioY: number,
    direction: 'down' | 'up',
    onComplete?: () => void,
  ): void {
    this.type = 'pipe-entry';
    this.frame = 0;
    this.maxFrames = PIPE_ENTRY_FRAMES;
    this.pipeX = marioX;
    this.pipeY = marioY;
    this.pipeDirection = direction;
    this.onComplete = onComplete ?? null;
  }

  /** Fade the screen to black, then call the callback. */
  startFadeOut(onComplete?: () => void): void {
    this.type = 'fade-out';
    this.frame = 0;
    this.maxFrames = FADE_OUT_FRAMES;
    this.alpha = 0;
    this.onComplete = onComplete ?? null;
  }

  /** Fade from black back to visible. */
  startFadeIn(onComplete?: () => void): void {
    this.type = 'fade-in';
    this.frame = 0;
    this.maxFrames = FADE_IN_FRAMES;
    this.alpha = 1;
    this.onComplete = onComplete ?? null;
  }

  /** Advance the transition by one frame. Returns true while active. */
  update(): boolean {
    if (this.type === 'none') return false;

    this.frame++;
    const progress = Math.min(this.frame / this.maxFrames, 1);

    switch (this.type) {
      case 'fade-out':
        this.alpha = progress;
        break;
      case 'fade-in':
        this.alpha = 1 - progress;
        break;
      case 'pipe-entry':
        // pipe offset handled in render via progress
        break;
    }

    if (this.frame >= this.maxFrames) {
      const cb = this.onComplete;
      this.onComplete = null;
      this.type = 'none';
      if (cb) cb();
      return false;
    }
    return true;
  }

  /** Draw the transition overlay on the canvas. */
  render(ctx: CanvasRenderingContext2D): void {
    if (this.type === 'none') return;

    if (this.type === 'fade-out' || this.type === 'fade-in') {
      ctx.fillStyle = `rgba(0,0,0,${this.alpha})`;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      return;
    }

    if (this.type === 'pipe-entry') {
      const progress = Math.min(this.frame / this.maxFrames, 1);
      // Draw gradually expanding black from bottom (down) or top (up)
      if (this.pipeDirection === 'down') {
        const h = SCREEN_HEIGHT * progress;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, SCREEN_HEIGHT - h, SCREEN_WIDTH, h);
      } else {
        const h = SCREEN_HEIGHT * progress;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, SCREEN_WIDTH, h);
      }
    }
  }
}
