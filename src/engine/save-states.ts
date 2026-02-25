// Save State Manager - Save/load game snapshots to localStorage
import { EntityType } from '../utils/constants.js';
import type { Entity } from '../entities/entities.js';

interface MarioData {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number; state: number;
  facingRight: boolean; onGround: boolean; jumping: boolean;
  jumpHeld: boolean; crouching: boolean; invincible: number;
  starPower: number; dead: boolean; dying: boolean;
  deathTimer: number; onFlagpole: boolean; flagSlideY: number;
  walkFrame: number; walkTimer: number; growTimer: number;
  growState: 'none' | 'growing' | 'shrinking';
  stompCombo: number; lives: number; coins: number;
  score: number; finishedLevel: boolean;
}

interface EntityData {
  entityType: number;
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  alive: boolean; active: boolean; timer: number; frame: number;
  facingRight: boolean; onGround: boolean;
  extra: Record<string, unknown>;
}

export interface SaveStateData {
  version: number; timestamp: number; currentLevelId: string;
  mario: MarioData; entities: EntityData[];
  camera: { x: number; y: number };
  levelState: {
    tileChanges: Array<{ col: number; row: number; value: number }>;
    remainingBlockContents: Array<{ key: string; value: string }>;
    bumpedBlocks: Array<{ key: string; timer: number }>;
  };
  timer: number; timerFrame: number; fireballCooldown: number;
  brickHits: Array<{ key: string; count: number }>;
  globalFrame: number;
  questionAnimFrame: number; questionAnimTimer: number;
  coinAnimFrame: number; coinAnimTimer: number;
}

// Map entity types to the extra property names to serialize via duck-typing
const ENTITY_EXTRA_KEYS: Partial<Record<number, string[]>> = {
  [EntityType.GOOMBA]: ['flat', 'flatTimer'],
  [EntityType.KOOPA]: ['red', 'winged', 'wingBounceY', 'wingBaseY'],
  [EntityType.SHELL]: ['moving', 'shellTimer'],
  [EntityType.MUSHROOM]: ['emerging', 'emergeY', 'isOneUp'],
  [EntityType.FIRE_FLOWER]: ['emerging', 'emergeY'],
  [EntityType.STAR]: ['emerging', 'emergeY'],
  [EntityType.FIREBALL]: ['bounceCount'],
  [EntityType.COIN_BLOCK]: ['startY'],
  [EntityType.SCORE_POPUP]: ['text'],
  [EntityType.PLATFORM]: ['direction', 'minPos', 'maxPos', 'speed'],
  [EntityType.FIRE_BAR]: ['centerX', 'centerY', 'angle', 'speed', 'numBalls', 'ballSpacing'],
  [EntityType.BOWSER]: ['health', 'bridgeStart', 'bridgeEnd', 'jumpTimer', 'fireTimer', 'hitFlash', 'pendingFire', 'falling'],
};

// Piranha needs special handling for 'state' -> 'piranhaState' rename
const PIRANHA_KEYS = ['baseY', 'hidden', 'emergeTimer', 'retreatTimer', 'marioX'];

function serializeEntity(e: Entity): EntityData {
  const extra: Record<string, unknown> = {};
  const keys = ENTITY_EXTRA_KEYS[e.type];
  const record = e as unknown as Record<string, unknown>;
  if (keys) {
    for (const k of keys) extra[k] = record[k];
  }
  if (e.type === EntityType.PIRANHA) {
    for (const k of PIRANHA_KEYS) extra[k] = record[k];
    extra.piranhaState = record['state'];
  }
  return {
    entityType: e.type, x: e.x, y: e.y, vx: e.vx, vy: e.vy,
    width: e.width, height: e.height, alive: e.alive, active: e.active,
    timer: e.timer, frame: e.frame, facingRight: e.facingRight, onGround: e.onGround,
    extra,
  };
}

const STORAGE_PREFIX = 'smb-savestate-';
const VERSION = 1;
const MAX_SLOTS = 3;
const TOAST_FRAMES = 60;

export class SaveStateManager {
  private currentSlot = 0;
  private toastMsg = '';
  private toastFrames = 0;

  save(gameState: {
    currentLevelId: string;
    mario: import('../entities/mario.js').Mario;
    entities: Entity[];
    camera: { x: number; y: number };
    level: import('../world/level.js').Level;
    timer: number; timerFrame: number; fireballCooldown: number;
    brickHits: Map<string, number>; globalFrame: number;
    questionAnimFrame: number; questionAnimTimer: number;
    coinAnimFrame: number; coinAnimTimer: number;
  }, slot?: number): boolean {
    const s = slot ?? this.currentSlot;
    const m = gameState.mario;
    const level = gameState.level;
    const ld = level.data;

    const tileChanges: SaveStateData['levelState']['tileChanges'] = [];
    for (let row = 0; row < ld.height; row++) {
      for (let col = 0; col < ld.width; col++) {
        tileChanges.push({ col, row, value: ld.tiles[row][col] });
      }
    }

    const remainingBlockContents: Array<{ key: string; value: string }> = [];
    for (const [key, value] of level.blockContents) remainingBlockContents.push({ key, value });

    const bumpedBlocks: Array<{ key: string; timer: number }> = [];
    for (const [key, timer] of level.bumpedBlocks) bumpedBlocks.push({ key, timer });

    const data: SaveStateData = {
      version: VERSION, timestamp: Date.now(), currentLevelId: gameState.currentLevelId,
      mario: {
        x: m.x, y: m.y, vx: m.vx, vy: m.vy, width: m.width, height: m.height,
        state: m.state as number, facingRight: m.facingRight, onGround: m.onGround,
        jumping: m.jumping, jumpHeld: m.jumpHeld, crouching: m.crouching,
        invincible: m.invincible, starPower: m.starPower, dead: m.dead,
        dying: m.dying, deathTimer: m.deathTimer, onFlagpole: m.onFlagpole,
        flagSlideY: m.flagSlideY, walkFrame: m.walkFrame, walkTimer: m.walkTimer,
        growTimer: m.growTimer, growState: m.growState, stompCombo: m.stompCombo,
        lives: m.lives, coins: m.coins, score: m.score, finishedLevel: m.finishedLevel,
      },
      entities: gameState.entities.filter(e => e.alive).map(serializeEntity),
      camera: { x: gameState.camera.x, y: gameState.camera.y },
      levelState: { tileChanges, remainingBlockContents, bumpedBlocks },
      timer: gameState.timer, timerFrame: gameState.timerFrame,
      fireballCooldown: gameState.fireballCooldown,
      brickHits: Array.from(gameState.brickHits.entries()).map(([key, count]) => ({ key, count })),
      globalFrame: gameState.globalFrame,
      questionAnimFrame: gameState.questionAnimFrame, questionAnimTimer: gameState.questionAnimTimer,
      coinAnimFrame: gameState.coinAnimFrame, coinAnimTimer: gameState.coinAnimTimer,
    };

    try {
      localStorage.setItem(`${STORAGE_PREFIX}${s}`, JSON.stringify(data));
    } catch {
      this.showToast('Save failed - storage full');
      return false;
    }

    if (slot === undefined) this.currentSlot = (this.currentSlot + 1) % MAX_SLOTS;
    this.showToast(`State saved to slot ${s + 1}`);
    return true;
  }

  load(slot?: number): SaveStateData | null {
    if (slot !== undefined) return this.loadSlot(slot);
    let best: SaveStateData | null = null;
    let bestSlot = 0;
    for (let i = 0; i < MAX_SLOTS; i++) {
      const d = this.loadSlot(i);
      if (d && (!best || d.timestamp > best.timestamp)) { best = d; bestSlot = i; }
    }
    this.showToast(best ? `State loaded from slot ${bestSlot + 1}` : 'No save state found');
    return best;
  }

  loadFromSlot(slot: number): SaveStateData | null {
    const data = this.loadSlot(slot);
    this.showToast(data ? `State loaded from slot ${slot + 1}` : `Slot ${slot + 1} is empty`);
    return data;
  }

  private loadSlot(slot: number): SaveStateData | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${slot}`);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveStateData;
      return data.version === VERSION ? data : null;
    } catch { return null; }
  }

  private showToast(message: string): void {
    this.toastMsg = message;
    this.toastFrames = TOAST_FRAMES;
  }

  updateToast(): void {
    if (this.toastFrames > 0) this.toastFrames--;
  }

  drawToast(ctx: CanvasRenderingContext2D, sw: number, sh: number): void {
    if (this.toastFrames <= 0) return;
    const alpha = this.toastFrames < 15 ? this.toastFrames / 15 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '8px monospace';
    const tw = ctx.measureText(this.toastMsg).width;
    const px = Math.round((sw - tw) / 2) - 6;
    const py = sh - 24;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(px, py - 2, tw + 12, 14);
    ctx.fillStyle = '#FCFCFC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.toastMsg, px + 6, py);
    ctx.restore();
  }

  static parseSlotFromKey(code: string): number {
    if (code === 'Digit1') return 0;
    if (code === 'Digit2') return 1;
    if (code === 'Digit3') return 2;
    return -1;
  }
}
