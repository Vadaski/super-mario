import { SCREEN_WIDTH, SCREEN_HEIGHT, FPS } from '../utils/constants.js';

interface AchievementDef { id: string; name: string; description: string; hint: string }
interface AchievementState { unlocked: boolean; date: string | null }
type SaveData = Record<string, { unlocked: boolean; date: string | null }>;
interface Toast { achievement: AchievementDef; timer: number }

const STORAGE_KEY = 'smb-achievements';
const TOAST_TOTAL = 3 * FPS + 30; // 3s display + 15 frame slide in/out
const SLIDE = 15;
const TH = 32, TW = 200, TM = 4;

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_steps', name: 'First Steps', description: 'Complete World 1-1', hint: 'Finish the first level' },
  { id: 'underground', name: 'Underground Explorer', description: 'Complete World 1-2', hint: 'Explore the depths' },
  { id: 'clouds', name: 'Head in the Clouds', description: 'Complete World 1-3', hint: 'Reach for the sky' },
  { id: 'dragon_slayer', name: 'Dragon Slayer', description: 'Defeat Bowser in World 1-4', hint: 'Conquer the castle boss' },
  { id: 'all_coins', name: 'No Coins Left Behind', description: 'Collect all coins in any level', hint: 'Collect every single coin' },
  { id: 'pacifist', name: 'Pacifist', description: 'Complete any level without killing any enemy', hint: 'A peaceful journey' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Complete World 1-1 in under 60 seconds', hint: 'Time is of the essence' },
  { id: 'fire_power', name: 'Fire Power', description: 'Get fire flower power-up', hint: 'Transform into something fiery' },
  { id: 'one_life', name: 'One Life Wonder', description: 'Complete all 4 worlds without dying', hint: 'Flawless from start to finish' },
  { id: 'hero', name: 'Mushroom Kingdom Hero', description: 'Complete all 4 worlds', hint: 'Save the kingdom' },
];

export class AchievementManager {
  private state: Map<string, AchievementState> = new Map();
  private toasts: Toast[] = [];
  private viewerOpen = false;
  private enemyKills = 0;
  private coinsCollected = 0;
  private totalCoinsInLevel = 0;
  private currentLevelId = '1-1';
  private levelStartTime = 0;
  private deathCount = 0;
  private completedLevels = new Set<string>();
  private gotFireFlower = false;

  constructor() {
    for (const def of ACHIEVEMENTS) this.state.set(def.id, { unlocked: false, date: null });
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as SaveData;
      for (const [id, val] of Object.entries(data)) {
        if (this.state.has(id)) this.state.set(id, { unlocked: val.unlocked, date: val.date });
      }
    } catch { /* ignore corrupt data */ }
  }

  private save(): void {
    const data: SaveData = {};
    for (const [id, val] of this.state) data[id] = { unlocked: val.unlocked, date: val.date };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }

  private unlock(id: string): void {
    const s = this.state.get(id);
    if (!s || s.unlocked) return;
    s.unlocked = true;
    s.date = new Date().toLocaleDateString();
    this.save();
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (def) this.toasts.push({ achievement: def, timer: TOAST_TOTAL });
  }

  private checkAllWorlds(): void {
    if (this.completedLevels.has('1-1') && this.completedLevels.has('1-2') &&
        this.completedLevels.has('1-3') && this.completedLevels.has('1-4')) {
      this.unlock('hero');
      if (this.deathCount === 0) this.unlock('one_life');
    }
  }

  // --- Event tracking (called from Game) ---

  onLevelStart(levelId: string, totalCoins: number): void {
    this.currentLevelId = levelId;
    this.enemyKills = 0;
    this.coinsCollected = 0;
    this.totalCoinsInLevel = totalCoins;
    this.levelStartTime = performance.now();
  }

  onEnemyKill(): void { this.enemyKills++; }
  onCoinCollect(): void { this.coinsCollected++; }
  onDeath(): void { this.deathCount++; }

  onFireFlower(): void {
    if (!this.gotFireFlower) { this.gotFireFlower = true; this.unlock('fire_power'); }
  }

  onGameStart(): void {
    this.deathCount = 0;
    this.completedLevels.clear();
    this.gotFireFlower = false;
  }

  onLevelComplete(): void {
    const lvl = this.currentLevelId;
    this.completedLevels.add(lvl);
    if (lvl === '1-1') this.unlock('first_steps');
    if (lvl === '1-2') this.unlock('underground');
    if (lvl === '1-3') this.unlock('clouds');
    if (lvl === '1-1') {
      const elapsed = (performance.now() - this.levelStartTime) / 1000;
      if (elapsed < 60) this.unlock('speed_demon');
    }
    if (this.enemyKills === 0) this.unlock('pacifist');
    if (this.totalCoinsInLevel > 0 && this.coinsCollected >= this.totalCoinsInLevel) this.unlock('all_coins');
    this.checkAllWorlds();
  }

  onBowserDefeated(): void {
    this.completedLevels.add('1-4');
    this.unlock('dragon_slayer');
    this.checkAllWorlds();
  }

  // --- Viewer ---

  toggleViewer(): void { this.viewerOpen = !this.viewerOpen; }
  get isViewerOpen(): boolean { return this.viewerOpen; }

  // --- Update & Render ---

  update(): void {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].timer--;
      if (this.toasts[i].timer <= 0) this.toasts.splice(i, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderToasts(ctx);
    if (this.viewerOpen) this.renderViewer(ctx);
  }

  private renderToasts(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.toasts.length; i++) {
      const toast = this.toasts[i];
      const age = TOAST_TOTAL - toast.timer;
      let yOff: number;
      if (age < SLIDE) yOff = -TH + (age / SLIDE) * (TH + TM);
      else if (toast.timer < SLIDE) yOff = (toast.timer / SLIDE) * (TH + TM) - TH;
      else yOff = TM;
      const x = Math.floor((SCREEN_WIDTH - TW) / 2);
      const y = Math.floor(yOff + i * (TH + 2));
      // Background + gold border
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(x, y, TW, TH);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TW - 1, TH - 1);
      // Trophy icon
      this.drawTrophy(ctx, x + 4, y + TH / 2 - 5);
      // Text
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(toast.achievement.name, x + 18, y + 5);
      ctx.fillStyle = '#FCFCFC';
      ctx.font = '6px monospace';
      ctx.fillText(toast.achievement.description, x + 18, y + 18);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private renderViewer(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ACHIEVEMENTS', SCREEN_WIDTH / 2, 8);
    const startY = 22, rowH = 20;
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const def = ACHIEVEMENTS[i];
      const s = this.state.get(def.id);
      const unlocked = s?.unlocked ?? false;
      const y = startY + i * rowH;
      if (y + rowH > SCREEN_HEIGHT - 8) break;
      // Row bg + border
      ctx.fillStyle = unlocked ? 'rgba(255,215,0,0.1)' : 'rgba(128,128,128,0.1)';
      ctx.fillRect(8, y, SCREEN_WIDTH - 16, rowH - 2);
      ctx.strokeStyle = unlocked ? '#FFD700' : '#585858';
      ctx.lineWidth = 1;
      ctx.strokeRect(8.5, y + 0.5, SCREEN_WIDTH - 17, rowH - 3);
      // Icon
      if (unlocked) this.drawTrophy(ctx, 12, y + 3);
      else this.drawLock(ctx, 12, y + 3);
      // Name
      ctx.fillStyle = unlocked ? '#FFD700' : '#808080';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(def.name, 24, y + 2);
      // Description or hint
      ctx.font = '5px monospace';
      ctx.fillStyle = unlocked ? '#FCFCFC' : '#585858';
      ctx.fillText(unlocked ? def.description : '??? ' + def.hint, 24, y + 10);
      // Date
      if (unlocked && s?.date) {
        ctx.fillStyle = '#A0A0A0';
        ctx.font = '5px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(s.date, SCREEN_WIDTH - 12, y + 2);
      }
    }
    ctx.fillStyle = '#808080';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press TAB to close', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 10);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private drawTrophy(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + 2, y, 8, 6);     // cup
    ctx.fillRect(x, y + 1, 2, 3);     // left handle
    ctx.fillRect(x + 10, y + 1, 2, 3); // right handle
    ctx.fillRect(x + 5, y + 6, 2, 3); // stem
    ctx.fillRect(x + 3, y + 9, 6, 2); // base
  }

  private drawLock(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#585858';
    ctx.fillRect(x + 2, y + 4, 8, 7); // body
    ctx.strokeStyle = '#585858';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 6, y + 4, 3, Math.PI, 0); // shackle
    ctx.stroke();
  }
}
