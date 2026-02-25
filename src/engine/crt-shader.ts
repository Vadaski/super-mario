import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/constants.js';

const STORAGE_KEY = 'smb-crt-enabled';
const FPS_THRESHOLD = 55;
const FPS_SAMPLE_COUNT = 30;
const DISTORTION_STRENGTH = 0.03;
const BLOOM_STRENGTH = 0.15;
const SCANLINE_OPACITY = 0.3;
const VIGNETTE_OPACITY = 0.4;
const TINT_OPACITY = 0.04;

type TintMode = 'none' | 'green' | 'amber';

/**
 * CRT (cathode ray tube) post-processing shader effect.
 * Applies scanlines, barrel distortion, color bloom, vignette,
 * and optional green/amber tint to simulate a retro CRT display.
 */
export class CRTShader {
  private enabled: boolean;
  private offCanvas: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private tintMode: TintMode = 'green';

  // FPS tracking for auto-disable
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private autoDisabled = false;

  // Pre-rendered overlays (cached for performance)
  private scanlineCanvas: HTMLCanvasElement | null = null;
  private vignetteCanvas: HTMLCanvasElement | null = null;

  constructor() {
    this.enabled = this.loadState();

    this.offCanvas = document.createElement('canvas');
    this.offCanvas.width = SCREEN_WIDTH;
    this.offCanvas.height = SCREEN_HEIGHT;
    const ctx = this.offCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to create offscreen canvas context');
    }
    this.offCtx = ctx;
  }

  /** Whether the CRT effect is currently active. */
  get isEnabled(): boolean {
    return this.enabled && !this.autoDisabled;
  }

  /** Toggle the CRT effect on/off. Persists to localStorage. */
  toggle(): void {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.autoDisabled = false;
      this.frameTimes = [];
    }
    this.saveState();
  }

  /** Cycle through tint modes: none -> green -> amber -> none. */
  cycleTint(): void {
    if (this.tintMode === 'none') this.tintMode = 'green';
    else if (this.tintMode === 'green') this.tintMode = 'amber';
    else this.tintMode = 'none';
  }

  /**
   * Apply CRT post-processing effects to the main canvas.
   * Call this at the very end of the render loop.
   */
  apply(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    if (!this.isEnabled) return;

    if (!this.checkFPS()) {
      this.autoDisabled = true;
      return;
    }

    const w = canvas.width;
    const h = canvas.height;

    // Copy main canvas to offscreen buffer
    this.offCtx.drawImage(canvas, 0, 0);

    // Read source pixels for distortion and bloom
    const srcData = this.offCtx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);

    this.applyDistortionAndBloom(srcData.data, dst.data, w, h);

    // Write processed pixels back to main canvas
    ctx.putImageData(dst, 0, 0);

    // Apply overlay effects (scanlines, vignette, tint)
    this.drawScanlines(ctx, w, h);
    this.drawVignette(ctx, w, h);
    this.drawTint(ctx, w, h);
  }

  /**
   * Barrel distortion + color bloom in a single pixel pass.
   * For each destination pixel, compute the source coordinate with
   * barrel distortion, then sample with horizontal color bleed.
   */
  private applyDistortionAndBloom(
    src: Uint8ClampedArray,
    dst: Uint8ClampedArray,
    w: number,
    h: number,
  ): void {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const k = DISTORTION_STRENGTH;
    const bloomPx = 2; // pixels of horizontal bleed
    const bloomW = BLOOM_STRENGTH;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Normalized coords from center [-1, 1]
        const nx = (x - cx) / cx;
        const ny = (y - cy) / cy;
        const r2 = nx * nx + ny * ny;

        // Barrel distortion: push pixels outward from center
        const distort = 1.0 + k * r2;
        const sx = nx * distort;
        const sy = ny * distort;

        // Map back to pixel coords
        const srcX = sx * cx + cx;
        const srcY = sy * cy + cy;

        const di = (y * w + x) * 4;

        if (srcX < 0 || srcX >= w - 1 || srcY < 0 || srcY >= h - 1) {
          // Outside bounds: black
          dst[di] = 0;
          dst[di + 1] = 0;
          dst[di + 2] = 0;
          dst[di + 3] = 255;
          continue;
        }

        // Bilinear sample the center pixel
        const px = Math.floor(srcX);
        const py = Math.floor(srcY);
        const si = (py * w + px) * 4;

        let r = src[si];
        let g = src[si + 1];
        let b = src[si + 2];

        // Color bloom: blend with horizontal neighbors
        for (let bx = 1; bx <= bloomPx; bx++) {
          const leftX = Math.max(0, px - bx);
          const rightX = Math.min(w - 1, px + bx);
          const li = (py * w + leftX) * 4;
          const ri = (py * w + rightX) * 4;
          const weight = bloomW / bx;

          r += (src[li] + src[ri]) * weight;
          g += (src[li + 1] + src[ri + 1]) * weight;
          b += (src[li + 2] + src[ri + 2]) * weight;
        }

        // Normalize after bloom accumulation
        const totalWeight = 1 + bloomPx * 2 * bloomW;
        dst[di] = Math.min(255, r / totalWeight);
        dst[di + 1] = Math.min(255, g / totalWeight);
        dst[di + 2] = Math.min(255, b / totalWeight);
        dst[di + 3] = 255;
      }
    }
  }

  /** Draw horizontal scanlines (cached overlay). */
  private drawScanlines(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ): void {
    if (!this.scanlineCanvas) {
      this.scanlineCanvas = document.createElement('canvas');
      this.scanlineCanvas.width = w;
      this.scanlineCanvas.height = h;
      const sCtx = this.scanlineCanvas.getContext('2d');
      if (!sCtx) return;

      sCtx.fillStyle = `rgba(0, 0, 0, ${SCANLINE_OPACITY})`;
      for (let y = 0; y < h; y += 2) {
        sCtx.fillRect(0, y, w, 1);
      }
    }
    ctx.drawImage(this.scanlineCanvas, 0, 0);
  }

  /** Draw vignette: radial gradient from transparent center to dark edges. */
  private drawVignette(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ): void {
    if (!this.vignetteCanvas) {
      this.vignetteCanvas = document.createElement('canvas');
      this.vignetteCanvas.width = w;
      this.vignetteCanvas.height = h;
      const vCtx = this.vignetteCanvas.getContext('2d');
      if (!vCtx) return;

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.sqrt(cx * cx + cy * cy);
      const gradient = vCtx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(0, 0, 0, ${VIGNETTE_OPACITY})`);

      vCtx.fillStyle = gradient;
      vCtx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(this.vignetteCanvas, 0, 0);
  }

  /** Apply subtle color tint via globalCompositeOperation. */
  private drawTint(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ): void {
    if (this.tintMode === 'none') return;

    const prevOp = ctx.globalCompositeOperation;
    const prevAlpha = ctx.globalAlpha;

    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = TINT_OPACITY;

    if (this.tintMode === 'green') {
      ctx.fillStyle = '#00FF40';
    } else {
      ctx.fillStyle = '#FFA500';
    }

    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = prevOp;
    ctx.globalAlpha = prevAlpha;
  }

  /**
   * Track frame times and check if FPS is above threshold.
   * Returns false if FPS has dropped below threshold consistently.
   */
  private checkFPS(): boolean {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime;
      this.frameTimes.push(delta);
      if (this.frameTimes.length > FPS_SAMPLE_COUNT) {
        this.frameTimes.shift();
      }

      if (this.frameTimes.length === FPS_SAMPLE_COUNT) {
        let sum = 0;
        for (let i = 0; i < this.frameTimes.length; i++) {
          sum += this.frameTimes[i];
        }
        const avgDelta = sum / this.frameTimes.length;
        const avgFPS = 1000 / avgDelta;
        if (avgFPS < FPS_THRESHOLD) {
          return false;
        }
      }
    }
    this.lastFrameTime = now;
    return true;
  }

  private loadState(): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) return true; // default on for new players
      return saved === 'true';
    } catch {
      return true;
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(this.enabled));
    } catch {
      // localStorage may be unavailable
    }
  }
}
