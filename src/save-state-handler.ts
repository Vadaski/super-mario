import { EntityType } from './utils/constants.js';
import { input } from './engine/input.js';
import { Mario } from './entities/mario.js';
import { Goomba, Koopa, Shell, Mushroom, FireFlower, Star, Piranha, Fireball, CoinPopup, CoinPickup, ScorePopup, type Entity } from './entities/entities.js';
import { MovingPlatform } from './entities/platforms.js';
import { FireBar } from './entities/fire-bar.js';
import { Bowser, BowserFire, Axe } from './entities/bowser.js';
import { Camera } from './engine/camera.js';
import { Level } from './world/level.js';
import { GameRenderer } from './engine/renderer.js';
import { SaveStateManager, type SaveStateData } from './engine/save-states.js';
import { getLevelConfig, type LevelConfig } from './world/level-registry.js';
import { audio } from './audio/audio.js';
import type { CastleState } from './castle-logic.js';
import { GameState } from './utils/constants.js';

export interface SaveLoadContext {
  currentLevelId: string;
  mario: Mario;
  entities: Entity[];
  camera: Camera;
  level: Level;
  timer: number;
  timerFrame: number;
  fireballCooldown: number;
  brickHits: Map<string, number>;
  globalFrame: number;
  questionAnimFrame: number;
  questionAnimTimer: number;
  coinAnimFrame: number;
  coinAnimTimer: number;
}

export function handleSaveState(
  ctx: SaveLoadContext,
  saveStateManager: SaveStateManager,
): void {
  let slot: number | undefined;
  for (const code of ['Digit1', 'Digit2', 'Digit3']) {
    const s = SaveStateManager.parseSlotFromKey(code);
    if (s >= 0 && input.justPressed(code)) { slot = s; break; }
  }
  saveStateManager.save({
    currentLevelId: ctx.currentLevelId,
    mario: ctx.mario,
    entities: ctx.entities,
    camera: ctx.camera,
    level: ctx.level,
    timer: ctx.timer,
    timerFrame: ctx.timerFrame,
    fireballCooldown: ctx.fireballCooldown,
    brickHits: ctx.brickHits,
    globalFrame: ctx.globalFrame,
    questionAnimFrame: ctx.questionAnimFrame,
    questionAnimTimer: ctx.questionAnimTimer,
    coinAnimFrame: ctx.coinAnimFrame,
    coinAnimTimer: ctx.coinAnimTimer,
  }, slot);
}

export function handleLoadState(
  saveStateManager: SaveStateManager,
): SaveStateData | null {
  let slot: number | undefined;
  for (const code of ['Digit1', 'Digit2', 'Digit3']) {
    const s = SaveStateManager.parseSlotFromKey(code);
    if (s >= 0 && input.justPressed(code)) { slot = s; break; }
  }
  const data = slot !== undefined
    ? saveStateManager.loadFromSlot(slot)
    : saveStateManager.load();
  return data;
}

export interface RestoreResult {
  levelConfig: LevelConfig;
  level: Level;
  entities: Entity[];
  castleBowser: Bowser | null;
}

export function restoreSaveState(
  data: SaveStateData,
  mario: Mario,
  camera: Camera,
  renderer: GameRenderer,
): RestoreResult {
  const levelConfig = getLevelConfig(data.currentLevelId);
  const levelData = levelConfig.data;
  const level = new Level(levelData, levelConfig.contents);
  level.onTileChange = (col, row) => renderer.getTileCache().invalidateTile(col, row);
  renderer.getTileCache().invalidateAll();
  for (const tc of data.levelState.tileChanges) level.setTile(tc.col, tc.row, tc.value);
  level.blockContents.clear();
  for (const bc of data.levelState.remainingBlockContents) level.blockContents.set(bc.key, bc.value);
  level.bumpedBlocks.clear();
  for (const bb of data.levelState.bumpedBlocks) level.bumpedBlocks.set(bb.key, bb.timer);
  camera.reset(levelData.width);
  camera.x = data.camera.x; camera.y = data.camera.y;
  const m = data.mario;
  mario.x = m.x; mario.y = m.y; mario.vx = m.vx; mario.vy = m.vy;
  mario.width = m.width; mario.height = m.height;
  mario.state = m.state as typeof mario.state;
  mario.facingRight = m.facingRight; mario.onGround = m.onGround;
  mario.jumping = m.jumping; mario.jumpHeld = m.jumpHeld;
  mario.crouching = m.crouching; mario.invincible = m.invincible;
  mario.starPower = m.starPower; mario.dead = m.dead;
  mario.dying = m.dying; mario.deathTimer = m.deathTimer;
  mario.onFlagpole = m.onFlagpole; mario.flagSlideY = m.flagSlideY;
  mario.walkFrame = m.walkFrame; mario.walkTimer = m.walkTimer;
  mario.growTimer = m.growTimer; mario.growState = m.growState;
  mario.stompCombo = m.stompCombo; mario.lives = m.lives;
  mario.coins = m.coins; mario.score = m.score;
  mario.finishedLevel = m.finishedLevel;

  const entities: Entity[] = [];
  let castleBowser: Bowser | null = null;
  for (const ed of data.entities) {
    const entity = reconstructEntity(ed);
    if (entity) {
      entities.push(entity);
      if (entity instanceof Bowser) castleBowser = entity;
    }
  }

  return { levelConfig, level, entities, castleBowser };
}

export function reconstructEntity(ed: SaveStateData['entities'][number]): Entity | null {
  const ex = ed.extra;
  const record = ex as Record<string, unknown>;
  let entity: Entity;
  switch (ed.entityType) {
    case EntityType.GOOMBA: entity = new Goomba(ed.x, ed.y); break;
    case EntityType.KOOPA: {
      const k = new Koopa(ed.x, ed.y);
      k.red = record.red as boolean ?? false;
      k.winged = record.winged as boolean ?? false;
      entity = k; break;
    }
    case EntityType.SHELL: { const s = new Shell(ed.x, ed.y); s.vx = ed.vx; entity = s; break; }
    case EntityType.MUSHROOM: { const m = new Mushroom(ed.x, ed.y); m.isOneUp = record.isOneUp as boolean ?? false; entity = m; break; }
    case EntityType.FIRE_FLOWER: entity = new FireFlower(ed.x, ed.y); break;
    case EntityType.STAR: entity = new Star(ed.x, ed.y); break;
    case EntityType.PIRANHA: entity = new Piranha(ed.x, ed.y); break;
    case EntityType.FIREBALL: entity = new Fireball(ed.x, ed.y, ed.vx > 0); break;
    case EntityType.COIN_BLOCK: entity = new CoinPopup(ed.x, ed.y); break;
    case EntityType.SCORE_POPUP: entity = new ScorePopup(ed.x, ed.y, record.text as number ?? 100); break;
    case EntityType.PLATFORM: entity = new MovingPlatform(ed.x, ed.y, record.direction as 'horizontal' | 'vertical', record.minPos as number, record.maxPos as number); break;
    case EntityType.FIRE_BAR: entity = new FireBar(record.centerX as number, record.centerY as number, record.speed as number, record.numBalls as number, record.ballSpacing as number); break;
    case EntityType.BOWSER: { const b = new Bowser(ed.x, ed.y, record.bridgeStart as number, record.bridgeEnd as number); entity = b; break; }
    case EntityType.BOWSER_FIRE: entity = new BowserFire(ed.x, ed.y); break;
    case EntityType.AXE: entity = new Axe(ed.x, ed.y); break;
    default: entity = new CoinPickup(ed.x, ed.y); break;
  }
  entity.x = ed.x; entity.y = ed.y; entity.vx = ed.vx; entity.vy = ed.vy;
  entity.alive = ed.alive; entity.active = ed.active;
  entity.facingRight = ed.facingRight; entity.onGround = ed.onGround;
  return entity;
}
