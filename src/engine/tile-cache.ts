// Tile Cache - Offscreen canvas for static tile rendering
import { TILE, SCREEN_WIDTH, SCREEN_HEIGHT, COLORS, TileType } from '../utils/constants.js';
import type { Camera } from './camera.js';
import type { Level } from '../world/level.js';
import type { SpriteSheet } from '../sprites/sprites.js';
import type { AnimationFrames } from './renderer.js';

const MARGIN = 2; // extra tile columns cached on each side

export class TileCache {
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private startCol = -1;
  private endCol = -1;
  private cacheW: number;
  private dirtyTiles: Set<string> = new Set();
  private bgColor = '';
  private fullRebuild = true;

  constructor() {
    const cols = Math.ceil(SCREEN_WIDTH / TILE) + MARGIN * 2 + 2;
    this.cacheW = cols * TILE;
    const c = document.createElement('canvas');
    c.width = this.cacheW; c.height = SCREEN_HEIGHT;
    this.offscreen = c;
    this.offCtx = c.getContext('2d')!;
  }

  invalidateAll(): void {
    this.fullRebuild = true; this.startCol = -1; this.endCol = -1;
    this.dirtyTiles.clear();
  }

  invalidateTile(col: number, row: number): void {
    this.dirtyTiles.add(`${col},${row}`);
  }

  renderTiles(ctx: CanvasRenderingContext2D, camera: Camera, level: Level,
    sprites: SpriteSheet, anim: AnimationFrames, bg: string): void {
    const sc = Math.floor(camera.x / TILE) - MARGIN;
    const ec = Math.ceil((camera.x + SCREEN_WIDTH) / TILE) + MARGIN;
    if (this.fullRebuild || bg !== this.bgColor || sc !== this.startCol || ec !== this.endCol) {
      this.rebuild(level, sprites, sc, ec, bg);
      this.startCol = sc; this.endCol = ec; this.bgColor = bg; this.fullRebuild = false;
    } else if (this.dirtyTiles.size > 0) {
      this.patchDirty(level, sprites, bg);
    }
    ctx.drawImage(this.offscreen, camera.screenX(sc * TILE), 0);
    this.drawDynamic(ctx, camera, level, sprites, anim, bg);
  }

  private rebuild(level: Level, sp: SpriteSheet, sc: number, ec: number, bg: string): void {
    this.offCtx.clearRect(0, 0, this.cacheW, SCREEN_HEIGHT);
    const ug = bg === '#000000';
    for (let r = 0; r < level.data.height; r++) {
      for (let c = sc; c <= ec; c++) {
        const t = level.getTile(c, r);
        if (t === TileType.EMPTY || t === TileType.QUESTION || t === TileType.LAVA) continue;
        this.drawStatic(this.offCtx, t, (c - sc) * TILE, r * TILE, r, c, ug, sp);
      }
    }
    this.dirtyTiles.clear();
  }

  private patchDirty(level: Level, sp: SpriteSheet, bg: string): void {
    const oc = this.offCtx; const ug = bg === '#000000';
    for (const key of this.dirtyTiles) {
      const i = key.indexOf(',');
      const col = parseInt(key.substring(0, i), 10);
      const row = parseInt(key.substring(i + 1), 10);
      if (col < this.startCol || col > this.endCol) continue;
      const sx = (col - this.startCol) * TILE, sy = row * TILE;
      oc.clearRect(sx, sy, TILE, TILE);
      const t = level.getTile(col, row);
      if (t !== TileType.EMPTY && t !== TileType.QUESTION && t !== TileType.LAVA)
        this.drawStatic(oc, t, sx, sy, row, col, ug, sp);
    }
    this.dirtyTiles.clear();
  }

  private drawStatic(ctx: CanvasRenderingContext2D, t: number, sx: number, sy: number,
    row: number, col: number, ug: boolean, sp: SpriteSheet): void {
    switch (t) {
      case TileType.GROUND:
        sp.draw(ctx, ug ? (row === 13 ? 'ground-top-ug' : 'ground-ug') : (row === 13 ? 'ground-top' : 'ground'), sx, sy); break;
      case TileType.BRICK: sp.draw(ctx, ug ? 'brick-ug' : 'brick', sx, sy); break;
      case TileType.QUESTION_EMPTY: sp.draw(ctx, 'question-empty', sx, sy); break;
      case TileType.BLOCK: sp.draw(ctx, 'block', sx, sy); break;
      case TileType.PIPE_TL: sp.draw(ctx, 'pipe-top-left', sx, sy); break;
      case TileType.PIPE_TR: sp.draw(ctx, 'pipe-top-right', sx, sy); break;
      case TileType.PIPE_BL: sp.draw(ctx, 'pipe-left', sx, sy); break;
      case TileType.PIPE_BR: sp.draw(ctx, 'pipe-right', sx, sy); break;
      case TileType.FLAGPOLE:
        ctx.fillStyle = COLORS.BUSH_GREEN; ctx.fillRect(sx + 7, sy, 2, TILE); break;
      case TileType.FLAGPOLE_TOP:
        ctx.fillStyle = COLORS.BUSH_GREEN;
        ctx.fillRect(sx + 5, sy + 2, 6, 6); ctx.fillRect(sx + 7, sy, 2, TILE); break;
      case TileType.CASTLE: sp.draw(ctx, 'block', sx, sy); break;
      case TileType.BRIDGE:
        ctx.fillStyle = '#A4A4A4'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#585858'; ctx.fillRect(sx, sy, TILE, 2);
        ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
        ctx.fillRect(sx, sy + 4, 2, 4); ctx.fillRect(sx + TILE - 2, sy + 4, 2, 4); break;
      case TileType.CASTLE_STONE: {
        ctx.fillStyle = '#585858'; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#A4A4A4'; const o = (row % 2 === 0) ? 0 : 8;
        ctx.fillRect(sx + o, sy, 1, TILE); ctx.fillRect(sx + o + 8, sy, 1, TILE);
        ctx.fillRect(sx, sy + 7, TILE, 1); break;
      }
    }
  }

  private drawDynamic(ctx: CanvasRenderingContext2D, cam: Camera, level: Level,
    sp: SpriteSheet, anim: AnimationFrames, bg: string): void {
    const ug = bg === '#000000';
    const sc = Math.floor(cam.x / TILE), ec = Math.ceil((cam.x + SCREEN_WIDTH) / TILE);
    for (let r = 0; r < level.data.height; r++) {
      for (let c = sc; c <= ec; c++) {
        const t = level.getTile(c, r);
        const bump = level.getBumpOffset(c, r);
        const animated = t === TileType.QUESTION || t === TileType.LAVA;
        if (!animated && bump === 0) continue;
        if (t === TileType.EMPTY) continue;
        const sx = cam.screenX(c * TILE), sy = cam.screenY(r * TILE) + bump;
        if (animated) {
          if (t === TileType.QUESTION) {
            sp.draw(ctx, `question-${anim.questionAnimFrame + 1}`, sx, sy);
          } else {
            const ph = (anim.globalFrame + c * 4) % 16;
            ctx.fillStyle = ph < 8 ? '#D82800' : '#FC7C00'; ctx.fillRect(sx, sy, TILE, TILE);
            ctx.fillStyle = ph < 8 ? '#FC7C00' : '#FCA044';
            const w = Math.sin((anim.globalFrame + c * 3) * 0.15) * 3;
            ctx.fillRect(sx + 2, sy + 2 + w, 4, 3); ctx.fillRect(sx + 10, sy + 6 - w, 4, 3);
          }
        } else {
          switch (t) {
            case TileType.BRICK: sp.draw(ctx, ug ? 'brick-ug' : 'brick', sx, sy); break;
            case TileType.QUESTION_EMPTY: sp.draw(ctx, 'question-empty', sx, sy); break;
            case TileType.BLOCK: sp.draw(ctx, 'block', sx, sy); break;
            default: this.drawStatic(ctx, t, sx, sy, r, c, ug, sp); break;
          }
        }
      }
    }
  }
}
