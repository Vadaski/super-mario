import { SCREEN_WIDTH, COLORS } from '../utils/constants.js';
import type { SpriteSheet } from '../sprites/sprites.js';

const FONT = '8px monospace';

/**
 * Draws the classic SMB HUD:
 * MARIO        WORLD    TIME
 * 000000  x00  1-1
 */
export function drawHUD(
  ctx: CanvasRenderingContext2D,
  _sprites: SpriteSheet,
  score: number,
  coins: number,
  world: string,
  time: number,
  lives: number,
): void {
  ctx.font = FONT;
  ctx.textBaseline = 'top';

  // Row 1: Labels
  ctx.fillStyle = COLORS.WHITE;
  ctx.fillText('MARIO', 24, 8);
  ctx.fillText('\u00D7' + pad2(coins), 96, 8);
  ctx.fillText('WORLD', 144, 8);
  ctx.fillText('TIME', 200, 8);

  // Row 2: Values
  ctx.fillText(padScore(score), 24, 16);
  ctx.fillText(world, 152, 16);
  ctx.fillText(time >= 0 ? pad3(time) : '', 208, 16);

  // Draw a small coin icon
  ctx.fillStyle = COLORS.COIN_GOLD;
  ctx.fillRect(88, 9, 4, 6);
  ctx.fillStyle = COLORS.GROUND_DARK;
  ctx.fillRect(89, 9, 2, 1);
  ctx.fillRect(89, 14, 2, 1);
}

export function drawLevelIntro(
  ctx: CanvasRenderingContext2D,
  world: string,
  lives: number,
): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SCREEN_WIDTH, 240);

  ctx.font = FONT;
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.WHITE;
  ctx.textAlign = 'center';

  ctx.fillText(`WORLD ${world}`, SCREEN_WIDTH / 2, 88);

  // Mario mini icon
  ctx.fillStyle = COLORS.MARIO_RED;
  ctx.fillRect(SCREEN_WIDTH / 2 - 20, 112, 8, 8);
  ctx.fillStyle = COLORS.MARIO_SKIN;
  ctx.fillRect(SCREEN_WIDTH / 2 - 20, 108, 8, 4);

  ctx.fillStyle = COLORS.WHITE;
  ctx.fillText(`\u00D7  ${lives}`, SCREEN_WIDTH / 2 + 4, 112);

  ctx.textAlign = 'left';
}

export function drawTitleScreen(ctx: CanvasRenderingContext2D, frame: number): void {
  // Sky background
  ctx.fillStyle = COLORS.SKY;
  ctx.fillRect(0, 0, SCREEN_WIDTH, 240);

  // Ground
  ctx.fillStyle = COLORS.GROUND_DARK;
  ctx.fillRect(0, 208, SCREEN_WIDTH, 32);
  ctx.fillStyle = COLORS.GROUND_LIGHT;
  for (let x = 0; x < SCREEN_WIDTH; x += 16) {
    ctx.fillRect(x + 2, 208, 12, 2);
  }

  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  // Title
  ctx.font = '16px monospace';
  ctx.fillStyle = COLORS.MARIO_RED;
  ctx.fillText('SUPER MARIO BROS.', SCREEN_WIDTH / 2, 40);

  // Subtitle
  ctx.font = '8px monospace';
  ctx.fillStyle = COLORS.WHITE;
  ctx.fillText('HTML5 EDITION', SCREEN_WIDTH / 2, 62);

  // VA Wishing Engine branding
  ctx.fillStyle = COLORS.COIN_GOLD;
  ctx.fillText('\u2728 Powered by VA Wishing Engine \u2728', SCREEN_WIDTH / 2, 82);
  ctx.fillStyle = '#A4A4A4';
  ctx.font = '7px monospace';
  ctx.fillText('One wish. Fully autonomous. Any frontier model.', SCREEN_WIDTH / 2, 94);

  // Menu
  ctx.font = '8px monospace';
  ctx.fillStyle = COLORS.WHITE;
  const blink = Math.floor(frame / 30) % 2 === 0;
  if (blink) {
    ctx.fillText('\u25B6  PRESS ENTER TO START', SCREEN_WIDTH / 2, 120);
  }

  // Feature highlights
  ctx.fillStyle = '#FCA044';
  ctx.fillText('28 FEATURES \u2022 4 WORLDS \u2022 0 DEPENDENCIES', SCREEN_WIDTH / 2, 142);

  // Controls
  ctx.fillStyle = '#A4A4A4';
  ctx.fillText('ARROWS/WASD = MOVE', SCREEN_WIDTH / 2, 162);
  ctx.fillText('SPACE/X = JUMP  Z = RUN', SCREEN_WIDTH / 2, 174);

  // Copyright
  ctx.fillStyle = '#585858';
  ctx.font = '7px monospace';
  ctx.fillText('\u00A9 2026 VA Series \u2022 github.com/user/va-wish-engine', SCREEN_WIDTH / 2, 194);

  ctx.textAlign = 'left';
}

export function drawGameOver(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SCREEN_WIDTH, 240);
  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.WHITE;
  ctx.fillText('GAME OVER', SCREEN_WIDTH / 2, 112);
  ctx.textAlign = 'left';
}

function padScore(n: number): string {
  return n.toString().padStart(6, '0');
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}
