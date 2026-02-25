import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE } from '../utils/constants.js';

/**
 * Side-scrolling camera that follows Mario.
 * Matches original SMB behavior: camera only scrolls right, never left.
 * Mario triggers scroll when passing ~40% of screen width.
 */
export class Camera {
  x = 0;
  y = 0;
  private levelWidth: number;

  constructor(levelWidthTiles: number) {
    this.levelWidth = levelWidthTiles * TILE;
  }

  update(targetX: number, _targetY: number): void {
    // Original SMB: camera follows Mario, dead zone on left side
    // Camera scrolls right when Mario passes ~40% mark
    const scrollTrigger = this.x + SCREEN_WIDTH * 0.4;

    if (targetX > scrollTrigger) {
      this.x = targetX - SCREEN_WIDTH * 0.4;
    }

    // Clamp to level bounds
    this.x = Math.max(0, Math.min(this.x, this.levelWidth - SCREEN_WIDTH));
    this.y = 0; // No vertical scrolling in World 1-1
  }

  /** Check if a world-space position is visible */
  isVisible(x: number, y: number, width: number, height: number): boolean {
    return (
      x + width > this.x &&
      x < this.x + SCREEN_WIDTH &&
      y + height > this.y &&
      y < this.y + SCREEN_HEIGHT
    );
  }

  /** Convert world-space to screen-space X */
  screenX(worldX: number): number {
    return Math.round(worldX - this.x);
  }

  /** Convert world-space to screen-space Y */
  screenY(worldY: number): number {
    return Math.round(worldY - this.y);
  }

  /** Reset camera for new level */
  reset(levelWidthTiles: number): void {
    this.x = 0;
    this.y = 0;
    this.levelWidth = levelWidthTiles * TILE;
  }
}
