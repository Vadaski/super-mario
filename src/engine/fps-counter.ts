// FPS Counter - Toggleable performance overlay (F9)
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/constants.js';

export class FpsCounter {
  private visible = false;
  private frames = 0;
  private lastSecond = 0;
  private currentFps = 0;
  private minFps = 999;
  private minThisSec = 999;
  private lastTime = 0;
  private frameMs = 0;

  toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.frames = 0; this.lastSecond = performance.now();
      this.currentFps = 0; this.minFps = 999; this.minThisSec = 999;
    }
  }

  beginFrame(): void {
    if (!this.visible) return;
    const now = performance.now();
    if (this.lastTime > 0) {
      this.frameMs = now - this.lastTime;
      const iFps = 1000 / this.frameMs;
      if (iFps < this.minThisSec) this.minThisSec = iFps;
    }
    this.lastTime = now;
    this.frames++;
    if (now - this.lastSecond >= 1000) {
      this.currentFps = this.frames; this.minFps = this.minThisSec;
      this.frames = 0; this.lastSecond = now; this.minThisSec = 999;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    const x = SCREEN_WIDTH - 68, y = SCREEN_HEIGHT - 30;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, 66, 28);
    ctx.font = '7px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = this.currentFps >= 55 ? '#00FF00' : this.currentFps >= 30 ? '#FFFF00' : '#FF0000';
    ctx.fillText(`FPS: ${this.currentFps}`, x + 2, y + 2);
    const min = this.minFps > 900 ? '--' : Math.floor(this.minFps).toString();
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`MIN: ${min}`, x + 2, y + 10);
    ctx.fillText(`${this.frameMs.toFixed(1)}ms`, x + 2, y + 18);
    ctx.textBaseline = 'alphabetic';
  }

  get isVisible(): boolean { return this.visible; }
}
