import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/constants.js';

/**
 * Canvas renderer with NES-accurate pixel scaling.
 * Renders at 256x240 native resolution, scales to fit window.
 */
export class GameCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private scale = 1;

  constructor() {
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.canvas.width = SCREEN_WIDTH;
    this.canvas.height = SCREEN_HEIGHT;
    this.ctx.imageSmoothingEnabled = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    // Integer scaling for pixel-perfect rendering
    this.scale = Math.max(1, Math.floor(Math.min(maxW / SCREEN_WIDTH, maxH / SCREEN_HEIGHT)));
    this.canvas.style.width = `${SCREEN_WIDTH * this.scale}px`;
    this.canvas.style.height = `${SCREEN_HEIGHT * this.scale}px`;
  }

  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  getScale(): number {
    return this.scale;
  }
}
