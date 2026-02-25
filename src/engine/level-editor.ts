// Level Editor - In-game tile/entity editor (SMB-040)
import { TILE, SCREEN_WIDTH, SCREEN_HEIGHT, COLORS, TileType } from '../utils/constants.js';
import type { LevelData, EntitySpawn, BlockContent } from '../world/levels/world-1-1.js';

interface TileItem { kind: 'tile'; label: string; tile: number; pattern?: number[][] }
interface EntityItem { kind: 'entity'; label: string; entityType: EntitySpawn['type'] | 'mario' | 'flag'; content?: BlockContent['content'] }
type PaletteItem = TileItem | EntityItem;

const PIPE_PAT = [[TileType.PIPE_TL, TileType.PIPE_TR], [TileType.PIPE_BL, TileType.PIPE_BR]];
const PALETTE: PaletteItem[] = [
  { kind: 'tile', label: 'Ground', tile: TileType.GROUND },
  { kind: 'tile', label: 'Brick', tile: TileType.BRICK },
  { kind: 'tile', label: '? Block', tile: TileType.QUESTION },
  { kind: 'tile', label: 'Pipe', tile: TileType.PIPE_TL, pattern: PIPE_PAT },
  { kind: 'tile', label: 'Stair', tile: TileType.BLOCK },
  { kind: 'tile', label: 'Erase', tile: TileType.EMPTY },
  { kind: 'entity', label: 'Goomba', entityType: 'goomba' },
  { kind: 'entity', label: 'Koopa', entityType: 'koopa' },
  { kind: 'entity', label: 'Piranha', entityType: 'piranha' },
  { kind: 'entity', label: 'Mushroom', entityType: 'goomba', content: 'mushroom' },
  { kind: 'entity', label: 'Coin Blk', entityType: 'goomba', content: 'coin' },
  { kind: 'entity', label: 'Star Blk', entityType: 'goomba', content: 'star' },
  { kind: 'entity', label: 'Mario', entityType: 'mario' },
  { kind: 'entity', label: 'Flagpole', entityType: 'flag' },
];
const LW = 212, LH = 15, PW = 56;

function tColor(t: number): string | null {
  if (t === TileType.GROUND) return COLORS.GROUND_DARK;
  if (t === TileType.BRICK) return COLORS.BRICK_DARK;
  if (t === TileType.QUESTION) return COLORS.QUESTION_LIGHT;
  if (t === TileType.BLOCK) return COLORS.CASTLE_GRAY;
  if (t >= TileType.PIPE_TL && t <= TileType.PIPE_BR) return COLORS.PIPE_DARK;
  if (t === TileType.FLAGPOLE || t === TileType.FLAGPOLE_TOP) return '#888';
  if (t === TileType.CASTLE) return COLORS.CASTLE_GRAY;
  return null;
}

interface EditorState {
  tiles: number[][]; entities: EntitySpawn[]; contents: BlockContent[];
  startX: number; startY: number; flagCol: number; castleCol: number;
}

export class LevelEditor {
  private tiles: number[][];
  private entities: EntitySpawn[] = [];
  private contents: BlockContent[] = [];
  private startX = 3; private startY = 12;
  private flagCol = 199; private castleCol = 203;
  private sel = 0; private scrollX = 0;
  private mCol = 0; private mRow = 0; private mIn = false;
  private canvas!: HTMLCanvasElement;
  testPlaying = false;

  constructor(canvas: HTMLCanvasElement, _scale: number) {
    this.canvas = canvas;
    this.tiles = Array.from({ length: LH }, () => new Array(LW).fill(TileType.EMPTY));
    for (let c = 0; c < LW; c++) { this.tiles[13][c] = TileType.GROUND; this.tiles[14][c] = TileType.GROUND; }
    this.bindMouse();
  }

  private toGrid(cx: number, cy: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    const sx = (cx - r.left) / (r.width / SCREEN_WIDTH);
    const sy = (cy - r.top) / (r.height / SCREEN_HEIGHT);
    return [Math.floor((sx - PW + this.scrollX * TILE) / TILE), Math.floor(sy / TILE)];
  }
  private onMM = (e: MouseEvent): void => {
    [this.mCol, this.mRow] = this.toGrid(e.clientX, e.clientY); this.mIn = true;
    if (e.buttons === 1) this.place(this.mCol, this.mRow);
    if (e.buttons === 2) this.erase(this.mCol, this.mRow);
  };
  private onMD = (e: MouseEvent): void => {
    const r = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left) / (r.width / SCREEN_WIDTH);
    const sy = (e.clientY - r.top) / (r.height / SCREEN_HEIGHT);
    if (sx < PW) { const i = Math.floor(sy / 16); if (i >= 0 && i < PALETTE.length) this.sel = i; e.preventDefault(); return; }
    if (e.button === 0) this.place(this.mCol, this.mRow);
    if (e.button === 2) this.erase(this.mCol, this.mRow);
    e.preventDefault();
  };
  private onCM = (e: Event): void => { e.preventDefault(); };
  private onML = (): void => { this.mIn = false; };

  private bindMouse(): void {
    this.canvas.addEventListener('mousemove', this.onMM);
    this.canvas.addEventListener('mousedown', this.onMD);
    this.canvas.addEventListener('contextmenu', this.onCM);
    this.canvas.addEventListener('mouseleave', this.onML);
  }
  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.onMM);
    this.canvas.removeEventListener('mousedown', this.onMD);
    this.canvas.removeEventListener('contextmenu', this.onCM);
    this.canvas.removeEventListener('mouseleave', this.onML);
  }

  private ok(c: number, r: number): boolean { return c >= 0 && c < LW && r >= 0 && r < LH; }

  private place(col: number, row: number): void {
    if (!this.ok(col, row)) return;
    const item = PALETTE[this.sel];
    if (item.kind === 'tile') {
      if (item.pattern) {
        for (let dr = 0; dr < item.pattern.length; dr++)
          for (let dc = 0; dc < item.pattern[0].length; dc++)
            if (this.ok(col + dc, row + dr)) this.tiles[row + dr][col + dc] = item.pattern[dr][dc];
      } else { this.tiles[row][col] = item.tile; }
    } else if (item.entityType === 'mario') { this.startX = col; this.startY = row; }
    else if (item.entityType === 'flag') { this.flagCol = col; this.castleCol = col + 4; }
    else if (item.content) {
      this.tiles[row][col] = TileType.QUESTION;
      this.contents = this.contents.filter(c => !(c.col === col && c.row === row));
      this.contents.push({ col, row, content: item.content });
    } else {
      const px = col * TILE, py = row * TILE;
      this.entities = this.entities.filter(e => !(e.x === px && e.y === py));
      this.entities.push({ type: item.entityType as EntitySpawn['type'], x: px, y: py });
    }
  }
  private erase(col: number, row: number): void {
    if (!this.ok(col, row)) return;
    this.tiles[row][col] = TileType.EMPTY;
    const px = col * TILE, py = row * TILE;
    this.entities = this.entities.filter(e => !(e.x === px && e.y === py));
    this.contents = this.contents.filter(c => !(c.col === col && c.row === row));
  }
  handleScroll(dir: number): void { this.scrollX = Math.max(0, Math.min(this.scrollX + dir, LW - 12)); }

  buildLevelData(): { data: LevelData; contents: BlockContent[] } {
    const tc = this.tiles.map(r => [...r]);
    for (let r = 4; r <= 12; r++) if (this.ok(this.flagCol, r)) tc[r][this.flagCol] = r === 4 ? TileType.FLAGPOLE_TOP : TileType.FLAGPOLE;
    return {
      data: { width: LW, height: LH, tiles: tc, entities: [...this.entities], scenery: [],
        startX: this.startX * TILE, startY: this.startY * TILE,
        flagX: this.flagCol * TILE, castleX: this.castleCol * TILE },
      contents: [...this.contents],
    };
  }

  exportBase64(): string {
    const o: EditorState = { tiles: this.tiles, entities: this.entities, contents: this.contents,
      startX: this.startX, startY: this.startY, flagCol: this.flagCol, castleCol: this.castleCol };
    return btoa(JSON.stringify(o));
  }
  static importBase64(str: string): LevelEditor | null {
    try {
      const o = JSON.parse(atob(str)) as EditorState;
      const ed = Object.create(LevelEditor.prototype) as LevelEditor;
      ed.tiles = o.tiles; ed.entities = o.entities; ed.contents = o.contents;
      ed.startX = o.startX; ed.startY = o.startY; ed.flagCol = o.flagCol; ed.castleCol = o.castleCol;
      ed.sel = 0; ed.scrollX = 0; ed.mCol = 0; ed.mRow = 0; ed.mIn = false; ed.testPlaying = false;
      return ed;
    } catch { return null; }
  }
  attach(canvas: HTMLCanvasElement, _scale: number): void { this.canvas = canvas; this.bindMouse(); }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.SKY; ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    const s0 = this.scrollX, vc = Math.ceil((SCREEN_WIDTH - PW) / TILE) + 1;
    // Tiles
    for (let r = 0; r < LH; r++) for (let ci = 0; ci < vc; ci++) {
      const c = s0 + ci; if (c < 0 || c >= LW) continue;
      const col = tColor(this.tiles[r][c]);
      if (col) { ctx.fillStyle = col; ctx.fillRect(PW + ci * TILE, r * TILE, TILE, TILE); }
    }
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.5;
    for (let ci = 0; ci <= vc; ci++) { const x = PW + ci * TILE; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SCREEN_HEIGHT); ctx.stroke(); }
    for (let r = 0; r <= LH; r++) { const y = r * TILE; ctx.beginPath(); ctx.moveTo(PW, y); ctx.lineTo(SCREEN_WIDTH, y); ctx.stroke(); }
    // Entities
    for (const e of this.entities) {
      const ec = Math.floor(e.x / TILE), er = Math.floor(e.y / TILE);
      if (ec < s0 || ec >= s0 + vc) continue;
      const sx = PW + (ec - s0) * TILE, sy = er * TILE;
      ctx.fillStyle = e.type === 'goomba' ? COLORS.GOOMBA_BROWN : e.type === 'koopa' ? COLORS.KOOPA_GREEN : COLORS.PIPE_DARK;
      ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = '#FFF'; ctx.font = '5px monospace'; ctx.fillText(e.type[0].toUpperCase(), sx + 4, sy + 11);
    }
    // Mario start
    if (this.startX >= s0 && this.startX < s0 + vc) {
      const sx = PW + (this.startX - s0) * TILE, sy = this.startY * TILE;
      ctx.fillStyle = COLORS.MARIO_RED; ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = '#FFF'; ctx.font = '6px monospace'; ctx.fillText('M', sx + 4, sy + 12);
    }
    // Flag
    if (this.flagCol >= s0 && this.flagCol < s0 + vc) {
      const sx = PW + (this.flagCol - s0) * TILE;
      ctx.fillStyle = COLORS.FLAG_GREEN; ctx.fillRect(sx, 4 * TILE, TILE, 9 * TILE);
      ctx.fillStyle = '#FFF'; ctx.font = '5px monospace'; ctx.fillText('F', sx + 4, 8 * TILE);
    }
    // Cursor
    if (this.mIn && this.ok(this.mCol, this.mRow)) {
      const ci = this.mCol - s0;
      if (ci >= 0 && ci < vc) { ctx.strokeStyle = 'rgba(255,255,0,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(PW + ci * TILE + .5, this.mRow * TILE + .5, TILE - 1, TILE - 1); }
    }
    // Palette
    ctx.fillStyle = '#1A1A2E'; ctx.fillRect(0, 0, PW, SCREEN_HEIGHT);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PW, 0); ctx.lineTo(PW, SCREEN_HEIGHT); ctx.stroke();
    for (let i = 0; i < PALETTE.length; i++) {
      const y = i * 16;
      if (i === this.sel) { ctx.fillStyle = '#3A3A5E'; ctx.fillRect(0, y, PW, 16); }
      const it = PALETTE[i];
      ctx.fillStyle = it.kind === 'tile' ? (tColor(it.tile) ?? '#333') : it.entityType === 'mario' ? COLORS.MARIO_RED : it.entityType === 'flag' ? COLORS.FLAG_GREEN : COLORS.GOOMBA_BROWN;
      ctx.fillRect(2, y + 2, 12, 12);
      ctx.fillStyle = '#CCC'; ctx.font = '5px monospace'; ctx.fillText(it.label, 16, y + 11);
    }
    // HUD
    ctx.fillStyle = '#FFF'; ctx.font = '6px monospace';
    ctx.fillText('EDITOR  Enter=Test  Esc=Exit  E=Export', PW + 2, 232);
    ctx.fillText(`Arrows=Scroll  LClick=Place  RClick=Erase  Col:${this.scrollX}`, PW + 2, 238);
  }
}
