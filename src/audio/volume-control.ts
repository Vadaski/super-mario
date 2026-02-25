import { audio } from './audio.js';

const STORAGE_KEY = 'smb-volume';
const FADE_DURATION = 2000;
const VOLUME_STEP = 0.1;

interface VolumePreference { volume: number; muted: boolean }

export class VolumeControl {
  private volume = 1;
  private muted = false;
  private overlayTimer = 0;
  private overlayStart = 0;

  constructor() { this.load(); }

  /** Apply saved preference to the audio engine (call after audio.init). */
  applyToEngine(): void {
    audio.setMasterVolume(this.volume);
    if (this.muted) audio.mute();
  }

  /** Handle a keydown code. Returns true if the key was consumed. */
  handleKey(code: string): boolean {
    if (code === 'KeyM') { this.toggleMute(); return true; }
    if (code === 'Equal' || code === 'NumpadAdd') { this.changeVolume(VOLUME_STEP); return true; }
    if (code === 'Minus' || code === 'NumpadSubtract') { this.changeVolume(-VOLUME_STEP); return true; }
    return false;
  }

  /** Render the volume overlay icon on the canvas context. */
  renderOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.overlayTimer <= 0) return;
    const elapsed = performance.now() - this.overlayStart;
    if (elapsed >= FADE_DURATION) { this.overlayTimer = 0; return; }
    const alpha = elapsed < FADE_DURATION - 500 ? 1 : (FADE_DURATION - elapsed) / 500;

    ctx.save();
    ctx.globalAlpha = alpha;
    const x = 4, y = 4;

    // Speaker body
    ctx.fillStyle = '#FCFCFC';
    ctx.fillRect(x, y + 3, 4, 6);
    ctx.fillRect(x + 4, y + 1, 2, 10);

    if (this.muted) {
      ctx.strokeStyle = '#B81810';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 9, y + 2); ctx.lineTo(x + 15, y + 9);
      ctx.moveTo(x + 15, y + 2); ctx.lineTo(x + 9, y + 9);
      ctx.stroke();
    } else {
      const level = Math.round(this.volume * 10);
      ctx.fillStyle = '#FCFCFC';
      if (level > 0) ctx.fillRect(x + 8, y + 4, 1, 4);
      if (level > 3) ctx.fillRect(x + 10, y + 3, 1, 6);
      if (level > 6) ctx.fillRect(x + 12, y + 2, 1, 8);
    }

    ctx.fillStyle = '#FCFCFC';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.muted ? 'MUTE' : `${Math.round(this.volume * 100)}%`, x + 17, y + 2);
    ctx.restore();
  }

  private toggleMute(): void {
    this.muted = !this.muted;
    if (this.muted) { audio.mute(); }
    else { audio.unmute(); audio.setMasterVolume(this.volume); }
    this.showOverlay();
    this.save();
  }

  private changeVolume(delta: number): void {
    this.volume = Math.round(Math.min(1, Math.max(0, this.volume + delta)) * 10) / 10;
    if (this.muted && delta > 0) { this.muted = false; audio.unmute(); }
    audio.setMasterVolume(this.volume);
    this.showOverlay();
    this.save();
  }

  private showOverlay(): void {
    this.overlayTimer = 1;
    this.overlayStart = performance.now();
  }

  private save(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: this.volume, muted: this.muted })); }
    catch { /* localStorage may be unavailable */ }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const pref = JSON.parse(raw) as VolumePreference;
      if (typeof pref.volume === 'number') this.volume = Math.min(1, Math.max(0, pref.volume));
      if (typeof pref.muted === 'boolean') this.muted = pref.muted;
    } catch { /* ignore parse errors */ }
  }
}
