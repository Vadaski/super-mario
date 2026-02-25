// Speedrun Timer – F1 toggle, mm:ss.ms overlay, per-level splits,
// personal bests in localStorage, ghost replay.

import { SCREEN_WIDTH, FPS } from '../utils/constants.js';

const STORAGE_PB_KEY = 'smb-speedrun-pb';
const STORAGE_GHOST_KEY = 'smb-speedrun-ghost';

interface GhostFrame { x: number; y: number }
interface LevelGhost { levelId: string; frames: GhostFrame[] }
interface PersonalBest { totalMs: number; splits: LevelSplit[] }
interface LevelSplit { levelId: string; ms: number }

const GHOST_COLOR = '#88CCFF';
const GHOST_TRAIL_ALPHAS = [0.15, 0.1, 0.05];

const enum TimerState { IDLE, WAITING_FOR_INPUT, RUNNING, STOPPED }

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const ml = String(Math.floor(ms % 1000)).padStart(3, '0');
  return `${mm}:${ss}.${ml}`;
}

function loadPB(): PersonalBest | null {
  try {
    const raw = localStorage.getItem(STORAGE_PB_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersonalBest;
  } catch { return null; }
}

function savePB(pb: PersonalBest): void {
  try { localStorage.setItem(STORAGE_PB_KEY, JSON.stringify(pb)); } catch { /* quota exceeded */ }
}

function loadGhost(): LevelGhost[] {
  try {
    const raw = localStorage.getItem(STORAGE_GHOST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LevelGhost[];
  } catch { return []; }
}

function saveGhost(ghost: LevelGhost[]): void {
  try { localStorage.setItem(STORAGE_GHOST_KEY, JSON.stringify(ghost)); } catch { /* quota exceeded */ }
}

export class SpeedrunTimer {
  private enabled = false;
  private state: TimerState = TimerState.IDLE;
  private elapsedMs = 0;
  private lastTick = 0;
  private splits: LevelSplit[] = [];
  private currentLevelId = '';
  private levelStartMs = 0;
  private lastSplitDisplay = '';
  private lastSplitTimer = 0;
  private personalBest: PersonalBest | null = null;
  // Ghost playback
  private ghostData: LevelGhost[] = [];
  private ghostLevelIdx = -1;
  private ghostFrame = 0;
  // Ghost recording
  private recordingData: LevelGhost[] = [];
  private currentRecording: GhostFrame[] = [];

  get isEnabled(): boolean { return this.enabled; }

  toggle(): void {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.personalBest = loadPB();
      this.ghostData = loadGhost();
    }
  }

  /** Call when a new run starts (title -> level intro for 1-1). */
  startRun(): void {
    if (!this.enabled) return;
    this.state = TimerState.WAITING_FOR_INPUT;
    this.elapsedMs = 0;
    this.lastTick = 0;
    this.splits = [];
    this.lastSplitDisplay = '';
    this.lastSplitTimer = 0;
    this.recordingData = [];
    this.currentRecording = [];
    this.personalBest = loadPB();
    this.ghostData = loadGhost();
  }

  /** Call when a level begins (after intro screen). */
  beginLevel(levelId: string): void {
    if (!this.enabled) return;
    this.currentLevelId = levelId;
    this.levelStartMs = this.elapsedMs;
    this.currentRecording = [];
    this.ghostLevelIdx = this.ghostData.findIndex(g => g.levelId === levelId);
    this.ghostFrame = 0;
  }

  /** Notify that the player pressed a gameplay key – starts the clock. */
  notifyInput(): void {
    if (this.state !== TimerState.WAITING_FOR_INPUT) return;
    this.state = TimerState.RUNNING;
    this.lastTick = performance.now();
  }

  /** Called once per game-logic tick. */
  update(marioX: number, marioY: number): void {
    if (!this.enabled) return;
    if (this.state === TimerState.RUNNING) {
      const now = performance.now();
      if (this.lastTick > 0) this.elapsedMs += now - this.lastTick;
      this.lastTick = now;
      this.currentRecording.push({ x: marioX, y: marioY });
      if (this.ghostLevelIdx >= 0) this.ghostFrame++;
    }
    if (this.lastSplitTimer > 0) this.lastSplitTimer--;
  }

  /** Record a split when a level is completed. */
  recordSplit(): void {
    if (!this.enabled || this.state !== TimerState.RUNNING) return;
    const splitMs = this.elapsedMs - this.levelStartMs;
    this.splits.push({ levelId: this.currentLevelId, ms: splitMs });

    const pbSplit = this.personalBest?.splits.find(s => s.levelId === this.currentLevelId);
    let delta = '';
    if (pbSplit) {
      const diff = splitMs - pbSplit.ms;
      delta = ` (${diff <= 0 ? '-' : '+'}${formatTime(Math.abs(diff))})`;
    }
    this.lastSplitDisplay = `${this.currentLevelId}: ${formatTime(splitMs)}${delta}`;
    this.lastSplitTimer = FPS * 4;

    this.recordingData.push({ levelId: this.currentLevelId, frames: this.currentRecording });
    this.currentRecording = [];
  }

  /** Call when the final level is completed. */
  finishRun(): void {
    if (!this.enabled || this.state !== TimerState.RUNNING) return;
    this.state = TimerState.STOPPED;
    const totalMs = this.elapsedMs;
    if (!this.personalBest || totalMs < this.personalBest.totalMs) {
      const pb: PersonalBest = { totalMs, splits: this.splits };
      savePB(pb);
      this.personalBest = pb;
      saveGhost(this.recordingData);
      this.ghostData = this.recordingData;
    }
  }

  /** Get the ghost position for the current frame, or null. */
  private getGhostPosition(): GhostFrame | null {
    if (!this.enabled || this.state !== TimerState.RUNNING) return null;
    if (this.ghostLevelIdx < 0) return null;
    const lg = this.ghostData[this.ghostLevelIdx];
    if (!lg || this.ghostFrame >= lg.frames.length) return null;
    return lg.frames[this.ghostFrame];
  }

  /** Render the speedrun overlay in the top-right corner. */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled) return;
    const pad = 3, lh = 9, rm = 4;
    const lines: string[] = [formatTime(this.elapsedMs)];
    if (this.personalBest) lines.push(`PB: ${formatTime(this.personalBest.totalMs)}`);
    if (this.lastSplitTimer > 0 && this.lastSplitDisplay) lines.push(this.lastSplitDisplay);

    ctx.font = '7px monospace';
    let maxW = 0;
    for (const l of lines) { const w = ctx.measureText(l).width; if (w > maxW) maxW = w; }

    const bw = maxW + pad * 2, bh = lines.length * lh + pad * 2;
    const bx = SCREEN_WIDTH - bw - rm, by = 18;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#00FF00';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + pad, by + pad + i * lh);
    }
    ctx.textBaseline = 'alphabetic';
  }

  /** Draw a small Mario-like silhouette (head + body) at the given position. */
  private drawGhostShape(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
    ctx.fillStyle = GHOST_COLOR;
    // Head (rounded top, 8x6 centered on 14px width)
    ctx.fillRect(sx + 3, sy, 8, 6);
    // Body (wider torso, 12x6)
    ctx.fillRect(sx + 1, sy + 6, 12, 6);
    // Legs (two 4x4 blocks)
    ctx.fillRect(sx + 1, sy + 12, 4, 4);
    ctx.fillRect(sx + 9, sy + 12, 4, 4);
  }

  /** Render the ghost Mario (semi-transparent) on the game canvas. */
  renderGhost(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const pos = this.getGhostPosition();
    if (!pos) return;

    // Draw trail from previous positions with decreasing opacity
    for (let i = GHOST_TRAIL_ALPHAS.length; i > 0; i--) {
      const trailFrame = this.ghostFrame - i * 4;
      if (trailFrame < 0 || this.ghostLevelIdx < 0) continue;
      const lg = this.ghostData[this.ghostLevelIdx];
      if (!lg || trailFrame >= lg.frames.length) continue;
      const tp = lg.frames[trailFrame];
      ctx.globalAlpha = GHOST_TRAIL_ALPHAS[i - 1];
      this.drawGhostShape(ctx, tp.x - cameraX, tp.y);
    }

    // Draw main ghost
    ctx.globalAlpha = 0.3;
    this.drawGhostShape(ctx, pos.x - cameraX, pos.y);

    ctx.globalAlpha = 1.0;
  }
}
