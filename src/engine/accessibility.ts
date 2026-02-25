import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/constants.js';

type ColorblindMode = 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
interface ControlBinding { left: string; right: string; jump: string; run: string; down: string; start: string }

const CB_CYCLE: ColorblindMode[] = ['off', 'protanopia', 'deuteranopia', 'tritanopia'];
const CB_FILTERS: Record<string, string> = {
  protanopia: '0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0',
  deuteranopia: '0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0',
  tritanopia: '0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0',
};
const CTRL_KEY = 'smb-controls';
const SETTINGS_KEY = 'smb-accessibility';
const DEFAULTS: ControlBinding = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space', run: 'ShiftLeft', down: 'ArrowDown', start: 'Enter' };
const ACTIONS: (keyof ControlBinding)[] = ['left', 'right', 'jump', 'run', 'down', 'start'];

export class AccessibilityManager {
  private cbIndex = 0;
  private _slow = false;
  private slowFrame = 0;
  private _hc = false;
  private bindings: ControlBinding = { ...DEFAULTS };
  private remapOpen = false;
  private remapTarget: keyof ControlBinding | null = null;
  private remapFn: ((e: KeyboardEvent) => void) | null = null;
  private _settings = false;

  constructor() {
    this.loadControls();
    this.loadSettings();
    this.initSVG();
  }

  get colorblindMode(): ColorblindMode { return CB_CYCLE[this.cbIndex]; }
  get slowMotion(): boolean { return this._slow; }
  get highContrast(): boolean { return this._hc; }
  get isRemapOpen(): boolean { return this.remapOpen; }
  get isSettingsOpen(): boolean { return this._settings; }
  get controlBindings(): Readonly<ControlBinding> { return this.bindings; }

  shouldSkipUpdate(): boolean {
    if (!this._slow) return false;
    this.slowFrame++;
    return this.slowFrame % 2 === 0;
  }

  handleKeys(jp: (code: string) => boolean, state: number, title: number): void {
    if (jp('F3')) { this.cbIndex = (this.cbIndex + 1) % CB_CYCLE.length; this.applyCSS(); this.saveSettings(); }
    if (jp('F4')) { this._slow = !this._slow; this.slowFrame = 0; this.saveSettings(); }
    if (jp('F6')) { this._hc = !this._hc; this.applyCSS(); this.saveSettings(); }
    if (jp('F7')) { this.remapOpen ? this.closeRemap() : this.openRemap(); }
    if (state === title && jp('KeyS')) this._settings = !this._settings;
  }

  private initSVG(): void {
    if (document.getElementById('smb-cb-svg')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'smb-cb-svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.pointerEvents = 'none';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    for (const mode of ['protanopia', 'deuteranopia', 'tritanopia']) {
      const f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      f.setAttribute('id', `smb-cb-${mode}`);
      const m = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
      m.setAttribute('type', 'matrix');
      m.setAttribute('values', CB_FILTERS[mode]);
      f.appendChild(m);
      defs.appendChild(f);
    }
    svg.appendChild(defs);
    document.body.appendChild(svg);
  }

  private applyCSS(): void {
    const c = document.getElementById('game') as HTMLCanvasElement | null;
    if (!c) return;
    const cb = this.colorblindMode !== 'off' ? `url(#smb-cb-${this.colorblindMode}) ` : '';
    const hc = this._hc ? 'brightness(1.3) contrast(1.5)' : '';
    c.style.filter = (cb + hc).trim() || '';
  }

  drawHighContrastOutlines(
    ctx: CanvasRenderingContext2D, camX: number,
    entities: Array<{ x: number; y: number; width: number; height: number; alive: boolean; active: boolean }>,
    mario: { x: number; y: number; width: number; height: number; dead: boolean },
  ): void {
    if (!this._hc) return;
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    if (!mario.dead) ctx.strokeRect(Math.round(mario.x - camX) - 1, Math.round(mario.y) - 1, mario.width + 2, mario.height + 2);
    for (const e of entities) {
      if (!e.alive || !e.active) continue;
      ctx.strokeRect(Math.round(e.x - camX) - 1, Math.round(e.y) - 1, e.width + 2, e.height + 2);
    }
    ctx.restore();
  }

  private openRemap(): void { this.remapOpen = true; this.remapTarget = null; }
  private closeRemap(): void {
    this.remapOpen = false;
    this.remapTarget = null;
    if (this.remapFn) { window.removeEventListener('keydown', this.remapFn); this.remapFn = null; }
  }

  startRemap(action: keyof ControlBinding): void {
    this.remapTarget = action;
    if (this.remapFn) window.removeEventListener('keydown', this.remapFn);
    this.remapFn = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== 'Escape') { this.bindings[action] = e.code; this.saveControls(); }
      this.remapTarget = null;
      if (this.remapFn) { window.removeEventListener('keydown', this.remapFn); this.remapFn = null; }
    };
    window.addEventListener('keydown', this.remapFn);
  }

  getBindingForAction(action: keyof ControlBinding): string { return this.bindings[action]; }

  renderSlowIndicator(ctx: CanvasRenderingContext2D): void {
    if (!this._slow) return;
    ctx.save();
    ctx.font = '8px monospace'; ctx.fillStyle = '#FFFF00';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('SLOW', SCREEN_WIDTH - 4, SCREEN_HEIGHT - 14);
    ctx.restore();
  }

  renderColorblindIndicator(ctx: CanvasRenderingContext2D): void {
    if (this.colorblindMode === 'off') return;
    const labels: Record<string, string> = { protanopia: 'CB:P', deuteranopia: 'CB:D', tritanopia: 'CB:T' };
    ctx.save();
    ctx.font = '8px monospace'; ctx.fillStyle = '#FFFF00';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(labels[this.colorblindMode], SCREEN_WIDTH - 4, SCREEN_HEIGHT - 24);
    ctx.restore();
  }

  renderRemapOverlay(ctx: CanvasRenderingContext2D, jp: (code: string) => boolean): void {
    if (!this.remapOpen) return;
    if (this.remapTarget === null) {
      for (let i = 0; i < ACTIONS.length; i++) { if (jp(`Digit${i + 1}`)) { this.startRemap(ACTIONS[i]); break; } }
      if (jp('Escape')) { this.closeRemap(); return; }
    }
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.font = '8px monospace'; ctx.fillStyle = '#FCFCFC'; ctx.textAlign = 'center';
    ctx.fillText('REMAP CONTROLS', SCREEN_WIDTH / 2, 24);
    ctx.fillText('Press number to remap, ESC to close', SCREEN_WIDTH / 2, 36);
    for (let i = 0; i < ACTIONS.length; i++) {
      const a = ACTIONS[i]; const isTgt = this.remapTarget === a;
      ctx.fillStyle = isTgt ? '#FFFF00' : '#FCFCFC';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}. ${a.toUpperCase()}`, 40, 56 + i * 16);
      ctx.textAlign = 'right';
      ctx.fillText(isTgt ? '>> PRESS KEY <<' : this.fmtKey(this.bindings[a]), SCREEN_WIDTH - 40, 56 + i * 16);
    }
    ctx.restore();
  }

  renderSettingsMenu(ctx: CanvasRenderingContext2D, jp: (code: string) => boolean): void {
    if (!this._settings) return;
    if (jp('Escape') || jp('KeyS')) { this._settings = false; return; }
    if (jp('Digit1')) { this.cbIndex = (this.cbIndex + 1) % CB_CYCLE.length; this.applyCSS(); this.saveSettings(); }
    if (jp('Digit2')) { this._slow = !this._slow; this.slowFrame = 0; this.saveSettings(); }
    if (jp('Digit3')) { this._hc = !this._hc; this.applyCSS(); this.saveSettings(); }
    if (jp('Digit4')) { this._settings = false; this.openRemap(); return; }
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.font = '8px monospace'; ctx.fillStyle = '#FCFCFC'; ctx.textAlign = 'center';
    ctx.fillText('ACCESSIBILITY SETTINGS', SCREEN_WIDTH / 2, 30);
    ctx.fillText('Press number to toggle, ESC to close', SCREEN_WIDTH / 2, 44);
    const items = [
      `1. COLORBLIND: ${this.colorblindMode.toUpperCase()}`,
      `2. SLOW-MOTION: ${this._slow ? 'ON' : 'OFF'}`,
      `3. HIGH-CONTRAST: ${this._hc ? 'ON' : 'OFF'}`,
      '4. REMAP CONTROLS',
    ];
    ctx.textAlign = 'left';
    for (let i = 0; i < items.length; i++) ctx.fillText(items[i], 40, 70 + i * 18);
    ctx.fillStyle = '#808080'; ctx.textAlign = 'center';
    ctx.fillText('F3=Colorblind  F4=Slow  F6=Contrast  F7=Remap', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 20);
    ctx.restore();
  }

  private saveControls(): void {
    try { localStorage.setItem(CTRL_KEY, JSON.stringify(this.bindings)); } catch { /* noop */ }
  }

  private loadControls(): void {
    try {
      const raw = localStorage.getItem(CTRL_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, unknown>;
      if (!obj || typeof obj !== 'object') return;
      for (const k of ACTIONS) { if (typeof obj[k] === 'string') this.bindings[k] = obj[k] as string; }
    } catch { /* noop */ }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        colorblindIndex: this.cbIndex, slowMotion: this._slow, highContrast: this._hc,
      }));
    } catch { /* noop */ }
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, unknown>;
      if (!obj || typeof obj !== 'object') return;
      if (typeof obj['colorblindIndex'] === 'number') {
        this.cbIndex = Math.max(0, Math.min(CB_CYCLE.length - 1, obj['colorblindIndex'] as number));
      }
      if (typeof obj['slowMotion'] === 'boolean') this._slow = obj['slowMotion'] as boolean;
      if (typeof obj['highContrast'] === 'boolean') this._hc = obj['highContrast'] as boolean;
    } catch { /* noop */ }
    this.applyCSS();
  }

  private fmtKey(code: string): string {
    return code.replace('Arrow', '').replace('Key', '').replace('Digit', '')
      .replace('ShiftLeft', 'L-Shift').replace('ShiftRight', 'R-Shift');
  }
}
