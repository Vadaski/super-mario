import {
  TILE, SCREEN_WIDTH, COLORS, TileType,
} from '../utils/constants.js';
import type { Camera } from './camera.js';
import type { GameCanvas } from './canvas.js';
import type { Level } from '../world/level.js';
import type { Mario } from '../entities/mario.js';
import type { Entity } from '../entities/entities.js';
import type { SpriteSheet } from '../sprites/sprites.js';
import type { SceneryItem } from '../world/levels/world-1-1.js';
import type { Firework } from './win-sequence.js';
import { TileCache } from './tile-cache.js';

export interface AnimationFrames {
  questionAnimFrame: number;
  coinAnimFrame: number;
  globalFrame: number;
}

export class GameRenderer {
  private gc: GameCanvas;
  private ctx: CanvasRenderingContext2D;
  private tileCache = new TileCache();

  constructor(gc: GameCanvas) {
    this.gc = gc;
    this.ctx = gc.ctx;
  }

  getTileCache(): TileCache {
    return this.tileCache;
  }

  renderGame(
    camera: Camera,
    level: Level,
    entities: Entity[],
    mario: Mario,
    spriteSheet: SpriteSheet,
    animFrames: AnimationFrames,
    scenery: SceneryItem[],
    timer: number,
    bgColor: string = COLORS.SKY,
  ): void {
    // Background color (sky for overworld, black for underground)
    this.gc.clear(bgColor);

    // Scenery (behind tiles)
    this.renderScenery(camera, scenery);

    // Tiles
    this.tileCache.renderTiles(this.ctx, camera, level, spriteSheet, animFrames, bgColor);

    // Entities
    for (const e of entities) {
      if (!e.alive || !e.active) continue;
      if (!camera.isVisible(e.x, e.y, e.width, e.height)) continue;
      e.draw(this.ctx, spriteSheet, camera);
    }

    // Coin sparkles on question blocks
    this.drawCoinSparkles(camera, level, animFrames);

    // Mario
    if (!mario.dead || mario.dying) {
      mario.draw(this.ctx, spriteSheet, camera);
    }
  }

  private static readonly SPARKLE_CORNERS = [[2, 2], [10, 2], [2, 10], [10, 10]];

  private drawCoinSparkles(camera: Camera, level: Level, anim: AnimationFrames): void {
    const startCol = Math.floor(camera.x / TILE);
    const endCol = Math.ceil((camera.x + SCREEN_WIDTH) / TILE);
    const corners = GameRenderer.SPARKLE_CORNERS;
    for (let col = startCol; col <= endCol; col++) {
      for (let row = 0; row < level.data.height; row++) {
        if (level.getTile(col, row) !== TileType.QUESTION) continue;
        // Each block sparkles at different times based on position
        const phase = (anim.globalFrame + col * 17 + row * 31) % 120;
        if (phase >= 8) continue; // sparkle visible for 8 frames every 120
        const ci = Math.floor(phase / 2) % 4;
        const sx = camera.screenX(col * TILE) + corners[ci][0];
        const sy = camera.screenY(row * TILE) + level.getBumpOffset(col, row) + corners[ci][1];
        this.ctx.fillStyle = '#FCFCFC';
        this.ctx.fillRect(sx, sy, 2, 2);
      }
    }
  }

  private renderTiles(
    camera: Camera,
    level: Level,
    spriteSheet: SpriteSheet,
    animFrames: AnimationFrames,
    bgColor: string = COLORS.SKY,
  ): void {
    const underground = bgColor === '#000000';
    const startCol = Math.floor(camera.x / TILE);
    const endCol = Math.ceil((camera.x + SCREEN_WIDTH) / TILE);

    for (let row = 0; row < level.data.height; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = level.getTile(col, row);
        if (tile === TileType.EMPTY) continue;

        const sx = camera.screenX(col * TILE);
        const bumpOffset = level.getBumpOffset(col, row);
        const sy = camera.screenY(row * TILE) + bumpOffset;

        switch (tile) {
          case TileType.GROUND:
            spriteSheet.draw(this.ctx, underground ? (row === 13 ? 'ground-top-ug' : 'ground-ug') : (row === 13 ? 'ground-top' : 'ground'), sx, sy);
            break;
          case TileType.BRICK:
            spriteSheet.draw(this.ctx, underground ? 'brick-ug' : 'brick', sx, sy);
            break;
          case TileType.QUESTION:
            spriteSheet.draw(this.ctx, `question-${animFrames.questionAnimFrame + 1}`, sx, sy);
            break;
          case TileType.QUESTION_EMPTY:
            spriteSheet.draw(this.ctx, 'question-empty', sx, sy);
            break;
          case TileType.BLOCK:
            spriteSheet.draw(this.ctx, 'block', sx, sy);
            break;
          case TileType.PIPE_TL:
            spriteSheet.draw(this.ctx, 'pipe-top-left', sx, sy);
            break;
          case TileType.PIPE_TR:
            spriteSheet.draw(this.ctx, 'pipe-top-right', sx, sy);
            break;
          case TileType.PIPE_BL:
            spriteSheet.draw(this.ctx, 'pipe-left', sx, sy);
            break;
          case TileType.PIPE_BR:
            spriteSheet.draw(this.ctx, 'pipe-right', sx, sy);
            break;
          case TileType.FLAGPOLE:
            // Draw pole
            this.ctx.fillStyle = COLORS.BUSH_GREEN;
            this.ctx.fillRect(sx + 7, sy, 2, TILE);
            break;
          case TileType.FLAGPOLE_TOP:
            // Draw ball on top
            this.ctx.fillStyle = COLORS.BUSH_GREEN;
            this.ctx.fillRect(sx + 5, sy + 2, 6, 6);
            this.ctx.fillRect(sx + 7, sy, 2, TILE);
            break;
          case TileType.CASTLE:
            spriteSheet.draw(this.ctx, 'block', sx, sy); // Use block as castle tile
            break;
          case TileType.BRIDGE:
            this.drawBridge(sx, sy);
            break;
          case TileType.LAVA:
            this.drawLava(sx, sy, animFrames.globalFrame, col);
            break;
          case TileType.CASTLE_STONE:
            this.drawCastleStone(sx, sy, row, col);
            break;
        }
      }
    }
  }

  private renderScenery(camera: Camera, scenery: SceneryItem[]): void {
    for (const item of scenery) {
      if (!camera.isVisible(item.x, item.y, 64, 48)) continue;
      const sx = camera.screenX(item.x);
      const sy = camera.screenY(item.y);

      switch (item.type) {
        case 'hill-large':
          this.drawHill(sx, sy, 80, 32);
          break;
        case 'hill-small':
          this.drawHill(sx, sy, 48, 16);
          break;
        case 'bush-large':
          this.drawBush(sx, sy, 48);
          break;
        case 'bush-small':
          this.drawBush(sx, sy, 32);
          break;
        case 'cloud':
          this.drawCloud(sx, sy);
          break;
      }
    }
  }

  private drawHill(x: number, y: number, w: number, h: number): void {
    const cx = x + w / 2;
    this.ctx.fillStyle = COLORS.HILL_GREEN;
    this.ctx.beginPath(); this.ctx.moveTo(x, y + h); this.ctx.lineTo(cx, y); this.ctx.lineTo(x + w, y + h); this.ctx.closePath(); this.ctx.fill();
    this.ctx.fillStyle = COLORS.HILL_LIGHT;
    this.ctx.beginPath(); this.ctx.moveTo(cx - 2, y + 4); this.ctx.lineTo(cx + 2, y + 4); this.ctx.lineTo(cx, y); this.ctx.closePath(); this.ctx.fill();
  }

  private drawBush(x: number, y: number, w: number): void {
    this.ctx.fillStyle = COLORS.BUSH_GREEN;
    const r = 8;
    for (let i = 0; i < w; i += r) { this.ctx.beginPath(); this.ctx.arc(x + r + i, y + r, r, 0, Math.PI * 2); this.ctx.fill(); }
  }

  private drawCloud(x: number, y: number): void {
    this.ctx.fillStyle = COLORS.CLOUD_WHITE;
    this.ctx.beginPath(); this.ctx.arc(x + 12, y + 8, 8, 0, Math.PI * 2); this.ctx.arc(x + 24, y + 4, 10, 0, Math.PI * 2); this.ctx.arc(x + 36, y + 8, 8, 0, Math.PI * 2); this.ctx.fill();
  }

  private drawBridge(x: number, y: number): void {
    // Gray bridge block
    this.ctx.fillStyle = '#A4A4A4';
    this.ctx.fillRect(x, y, TILE, TILE);
    this.ctx.fillStyle = '#585858';
    this.ctx.fillRect(x, y, TILE, 2);
    this.ctx.fillRect(x, y + TILE - 2, TILE, 2);
    // Chain links on sides
    this.ctx.fillRect(x, y + 4, 2, 4);
    this.ctx.fillRect(x + TILE - 2, y + 4, 2, 4);
  }

  private drawLava(x: number, y: number, globalFrame: number, col: number): void {
    // Animated lava shimmer
    const phase = (globalFrame + col * 4) % 16;
    this.ctx.fillStyle = phase < 8 ? '#D82800' : '#FC7C00';
    this.ctx.fillRect(x, y, TILE, TILE);
    // Highlights
    this.ctx.fillStyle = phase < 8 ? '#FC7C00' : '#FCA044';
    const waveOffset = Math.sin((globalFrame + col * 3) * 0.15) * 3;
    this.ctx.fillRect(x + 2, y + 2 + waveOffset, 4, 3);
    this.ctx.fillRect(x + 10, y + 6 - waveOffset, 4, 3);
  }

  private drawCastleStone(x: number, y: number, row: number, col: number): void {
    // Gray stone brick pattern
    this.ctx.fillStyle = '#585858';
    this.ctx.fillRect(x, y, TILE, TILE);
    // Lighter mortar lines
    this.ctx.fillStyle = '#A4A4A4';
    const offset = (row % 2 === 0) ? 0 : 8;
    this.ctx.fillRect(x + offset, y, 1, TILE);
    this.ctx.fillRect(x + offset + 8, y, 1, TILE);
    this.ctx.fillRect(x, y + 7, TILE, 1);
  }

  drawToadMessage(camera: Camera, text: string, toadX: number, toadY: number): void {
    const sx = camera.screenX(toadX), sy = camera.screenY(toadY);
    this.ctx.fillStyle = '#D82800'; this.ctx.fillRect(sx + 2, sy, 12, 8);
    this.ctx.fillStyle = '#FCFCFC'; this.ctx.fillRect(sx + 5, sy + 1, 3, 5); this.ctx.fillRect(sx + 9, sy + 1, 3, 5);
    this.ctx.fillRect(sx + 4, sy + 8, 8, 8);
    this.ctx.font = '8px monospace'; this.ctx.textAlign = 'center'; this.ctx.fillText(text, sx + 8, sy - 8); this.ctx.textAlign = 'left';
  }

  drawPoleFlag(camera: Camera, flagX: number, flagY: number): void {
    const sx = camera.screenX(flagX);
    const sy = camera.screenY(flagY);
    this.ctx.fillStyle = COLORS.FLAG_GREEN;
    // Green flag triangle pointing left from the pole
    this.ctx.beginPath();
    this.ctx.moveTo(sx + 8, sy);
    this.ctx.lineTo(sx - 4, sy + 4);
    this.ctx.lineTo(sx + 8, sy + 8);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawCastleFlag(camera: Camera, castleX: number, flagY: number): void {
    const sx = camera.screenX(castleX + 2.5 * TILE);
    const sy = camera.screenY(flagY);
    // Pole
    this.ctx.fillStyle = COLORS.BLACK;
    this.ctx.fillRect(sx, sy, 1, 16);
    // Flag triangle
    this.ctx.fillStyle = '#B81810';
    this.ctx.beginPath();
    this.ctx.moveTo(sx + 1, sy);
    this.ctx.lineTo(sx + 9, sy + 3);
    this.ctx.lineTo(sx + 1, sy + 6);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawFireworks(camera: Camera, fireworks: Firework[]): void {
    const colors = ['#FCFCFC', '#B81810', '#FCA044', '#00A800'];
    for (const fw of fireworks) {
      const sx = camera.screenX(fw.x);
      const sy = camera.screenY(fw.y);
      const progress = fw.frame / fw.maxFrames;
      const radius = 4 + progress * 16;
      const count = 8;
      const colorIdx = fw.frame % colors.length;
      this.ctx.fillStyle = colors[colorIdx];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const px = sx + Math.cos(angle) * radius;
        const py = sy + Math.sin(angle) * radius;
        this.ctx.fillRect(px - 1, py - 1, 3, 3);
      }
      // Center burst
      if (progress < 0.5) {
        this.ctx.fillRect(sx - 1, sy - 1, 3, 3);
      }
    }
  }
}
