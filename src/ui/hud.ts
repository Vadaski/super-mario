import { SCREEN_WIDTH, COLORS } from '../utils/constants.js';
import type { SpriteSheet } from '../sprites/sprites.js';

const FONT = '8px monospace';

/**
 * Draws the HUD:
 * HERO         WORLD    TIME
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
  ctx.fillText('HERO', 24, 8);
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

  // Hero mini icon — uses brand colors
  ctx.fillStyle = '#FCA044';
  ctx.fillRect(SCREEN_WIDTH / 2 - 20, 112, 8, 8);
  ctx.fillStyle = COLORS.MARIO_SKIN;
  ctx.fillRect(SCREEN_WIDTH / 2 - 20, 108, 8, 4);

  ctx.fillStyle = COLORS.WHITE;
  ctx.fillText(`\u00D7  ${lives}`, SCREEN_WIDTH / 2 + 4, 112);

  ctx.textAlign = 'left';
}

// --- Title screen animated elements ---

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = COLORS.CLOUD_WHITE;
  ctx.fillRect(x + 4, y, 8, 4);
  ctx.fillRect(x, y + 4, 16, 4);
}

function drawMiniHero(ctx: CanvasRenderingContext2D, x: number, y: number, walkFrame: number): void {
  // Head (skin)
  ctx.fillStyle = COLORS.MARIO_SKIN;
  ctx.fillRect(x + 2, y, 4, 4);
  // Body (gold brand color)
  ctx.fillStyle = '#FCA044';
  ctx.fillRect(x + 1, y + 4, 6, 4);
  // Legs — simple 2-frame walk
  ctx.fillStyle = COLORS.MARIO_SKIN;
  if (walkFrame === 0) {
    ctx.fillRect(x + 1, y + 8, 2, 4);
    ctx.fillRect(x + 5, y + 8, 2, 4);
  } else {
    ctx.fillRect(x + 2, y + 8, 2, 4);
    ctx.fillRect(x + 4, y + 8, 2, 4);
  }
}

function drawMiniGoomba(ctx: CanvasRenderingContext2D, x: number, y: number, walkFrame: number): void {
  ctx.fillStyle = COLORS.GOOMBA_BROWN;
  ctx.fillRect(x, y, 8, 6);
  ctx.fillStyle = COLORS.GOOMBA_DARK;
  ctx.fillRect(x + 1, y + 1, 2, 2);
  ctx.fillRect(x + 5, y + 1, 2, 2);
  // Feet
  ctx.fillStyle = COLORS.GOOMBA_BROWN;
  if (walkFrame === 0) {
    ctx.fillRect(x, y + 6, 3, 2);
    ctx.fillRect(x + 5, y + 6, 3, 2);
  } else {
    ctx.fillRect(x + 1, y + 6, 3, 2);
    ctx.fillRect(x + 4, y + 6, 3, 2);
  }
}

function drawSpinCoin(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number): void {
  const widths = [4, 3, 1, 3];
  const w = widths[phase];
  const offset = Math.floor((4 - w) / 2);
  ctx.fillStyle = COLORS.COIN_GOLD;
  ctx.fillRect(x + offset, y, w, 7);
  if (w > 1) {
    ctx.fillStyle = COLORS.GROUND_DARK;
    ctx.fillRect(x + offset + (w > 2 ? 1 : 0), y, w > 2 ? 2 : 1, 1);
    ctx.fillRect(x + offset + (w > 2 ? 1 : 0), y + 6, w > 2 ? 2 : 1, 1);
  }
}

export function drawTitleScreen(ctx: CanvasRenderingContext2D, frame: number): void {
  // Sky background
  ctx.fillStyle = COLORS.SKY;
  ctx.fillRect(0, 0, SCREEN_WIDTH, 240);

  // Scrolling clouds
  const cloudSpeed1 = 0.3, cloudSpeed2 = 0.5, cloudSpeed3 = 0.2;
  drawCloud(ctx, (frame * cloudSpeed1) % (SCREEN_WIDTH + 20) - 20, 30);
  drawCloud(ctx, (frame * cloudSpeed2 + 100) % (SCREEN_WIDTH + 20) - 20, 50);
  drawCloud(ctx, (frame * cloudSpeed3 + 200) % (SCREEN_WIDTH + 20) - 20, 20);

  // Ground
  ctx.fillStyle = COLORS.GROUND_DARK;
  ctx.fillRect(0, 208, SCREEN_WIDTH, 32);
  ctx.fillStyle = COLORS.GROUND_LIGHT;
  for (let x = 0; x < SCREEN_WIDTH; x += 16) {
    ctx.fillRect(x + 2, 208, 12, 2);
  }

  // Animated hero running right
  const heroX = (frame * 0.8) % (SCREEN_WIDTH + 16) - 8;
  const heroWalk = Math.floor(frame / 8) % 2;
  drawMiniHero(ctx, heroX, 196, heroWalk);

  // Animated goomba walking left
  const goombaX = SCREEN_WIDTH - ((frame * 0.5) % (SCREEN_WIDTH + 16)) + 8;
  const goombaWalk = Math.floor(frame / 10) % 2;
  drawMiniGoomba(ctx, goombaX, 200, goombaWalk);

  // Spinning coin
  const coinPhase = Math.floor(frame / 15) % 4;
  drawSpinCoin(ctx, SCREEN_WIDTH / 2 - 2, 105, coinPhase);

  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  // Title
  ctx.font = '16px monospace';
  ctx.fillStyle = '#FCA044';
  ctx.fillText('PIXEL DASH', SCREEN_WIDTH / 2, 40);

  // Subtitle
  ctx.font = FONT;
  ctx.fillStyle = COLORS.WHITE;
  ctx.fillText('A LOVE LETTER TO 8-BIT', SCREEN_WIDTH / 2, 62);

  // VA Wishing Engine branding
  ctx.fillStyle = COLORS.COIN_GOLD;
  ctx.fillText('\u2728 Powered by VA Wishing Engine \u2728', SCREEN_WIDTH / 2, 82);
  ctx.fillStyle = '#A4A4A4';
  ctx.font = '7px monospace';
  ctx.fillText('One wish. Fully autonomous. Any frontier model.', SCREEN_WIDTH / 2, 94);

  // Menu
  ctx.font = FONT;
  ctx.fillStyle = COLORS.WHITE;
  const blink = Math.floor(frame / 30) % 2 === 0;
  if (blink) {
    ctx.fillText('\u25B6  PRESS ENTER TO START', SCREEN_WIDTH / 2, 120);
  }

  // Feature highlights
  ctx.fillStyle = '#FCA044';
  ctx.fillText('4 WORLDS \u2022 28 FEATURES \u2022 ZERO DEPENDENCIES', SCREEN_WIDTH / 2, 142);

  // Controls
  ctx.fillStyle = '#A4A4A4';
  ctx.fillText('ARROWS/WASD = MOVE', SCREEN_WIDTH / 2, 162);
  ctx.fillText('SPACE/X = JUMP  Z = RUN', SCREEN_WIDTH / 2, 174);

  // Copyright
  ctx.fillStyle = '#585858';
  ctx.font = '7px monospace';
  ctx.fillText('\u00A9 2026 Pixel Dash Team \u2022 VA Wishing Engine', SCREEN_WIDTH / 2, 194);

  ctx.textAlign = 'left';
}

export function drawGameOver(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SCREEN_WIDTH, 240);
  ctx.font = FONT;
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
