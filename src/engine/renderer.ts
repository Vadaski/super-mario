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

export interface AnimationFrames {
  questionAnimFrame: number;
  coinAnimFrame: number;
}

export class GameRenderer {
  private gc: GameCanvas;
  private ctx: CanvasRenderingContext2D;

  constructor(gc: GameCanvas) {
    this.gc = gc;
    this.ctx = gc.ctx;
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
  ): void {
    // Sky background
    this.gc.clear(COLORS.SKY);

    // Scenery (behind tiles)
    this.renderScenery(camera, scenery);

    // Tiles
    this.renderTiles(camera, level, spriteSheet, animFrames);

    // Entities
    for (const e of entities) {
      if (!e.alive || !e.active) continue;
      if (!camera.isVisible(e.x, e.y, e.width, e.height)) continue;
      e.draw(this.ctx, spriteSheet, camera);
    }

    // Mario
    if (!mario.dead || mario.dying) {
      mario.draw(this.ctx, spriteSheet, camera);
    }
  }

  private renderTiles(
    camera: Camera,
    level: Level,
    spriteSheet: SpriteSheet,
    animFrames: AnimationFrames,
  ): void {
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
            spriteSheet.draw(this.ctx, row === 13 ? 'ground-top' : 'ground', sx, sy);
            break;
          case TileType.BRICK:
            spriteSheet.draw(this.ctx, 'brick', sx, sy);
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

  private drawHill(x: number, y: number, width: number, height: number): void {
    this.ctx.fillStyle = COLORS.HILL_GREEN;
    // Simple triangle-ish hill
    const cx = x + width / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + height);
    this.ctx.lineTo(cx, y);
    this.ctx.lineTo(x + width, y + height);
    this.ctx.closePath();
    this.ctx.fill();
    // Highlight
    this.ctx.fillStyle = COLORS.HILL_LIGHT;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 2, y + 4);
    this.ctx.lineTo(cx + 2, y + 4);
    this.ctx.lineTo(cx, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawBush(x: number, y: number, width: number): void {
    this.ctx.fillStyle = COLORS.BUSH_GREEN;
    const h = 16;
    // Three circles for bush
    const r = h / 2;
    for (let i = 0; i < width; i += r) {
      this.ctx.beginPath();
      this.ctx.arc(x + r + i, y + r, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawCloud(x: number, y: number): void {
    this.ctx.fillStyle = COLORS.CLOUD_WHITE;
    // Three circles for cloud
    this.ctx.beginPath();
    this.ctx.arc(x + 12, y + 8, 8, 0, Math.PI * 2);
    this.ctx.arc(x + 24, y + 4, 10, 0, Math.PI * 2);
    this.ctx.arc(x + 36, y + 8, 8, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
