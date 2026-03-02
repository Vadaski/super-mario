import {
  TILE, FPS, STAR_DURATION, GameState, EntityType,
} from './utils/constants.js';
import { input } from './engine/input.js';
import { Mario } from './entities/mario.js';
import { Piranha, type Entity } from './entities/entities.js';
import { MovingPlatform } from './entities/platforms.js';
import { Camera } from './engine/camera.js';
import { Level } from './world/level.js';
import { audio } from './audio/audio.js';
import { EntityManager } from './engine/entity-manager.js';
import { compactEntities } from './engine/object-pool.js';
import { AchievementManager } from './engine/achievements.js';
import { SpeedrunTimer } from './engine/speedrun.js';
import type { LevelConfig } from './world/level-registry.js';
import type { CastleState } from './castle-logic.js';
import { updateCastle } from './castle-logic.js';
import { playLevelMusic } from './level-loader.js';

export interface GameplayState {
  entities: Entity[];
  timer: number;
  timerFrame: number;
  fireballCooldown: number;
  questionAnimFrame: number;
  questionAnimTimer: number;
  coinAnimFrame: number;
  coinAnimTimer: number;
  globalFrame: number;
  prevMarioCoins: number;
  brickHits: Map<string, number>;
  paused: boolean;
  state: number;
  stateTimer: number;
}

export interface GameplayDeps {
  mario: Mario;
  camera: Camera;
  level: Level;
  entityManager: EntityManager;
  achievements: AchievementManager;
  speedrun: SpeedrunTimer;
  levelConfig: LevelConfig;
  castle: CastleState;
  onStartFlagpole: () => void;
  onAdvanceLevel: () => void;
  onDie: () => void;
}

export function updatePlaying(gs: GameplayState, deps: GameplayDeps): void {
  const { mario, camera, level, entityManager, achievements, speedrun, levelConfig, castle } = deps;

  if (input.left || input.right || input.jump || input.run || input.down) speedrun.notifyInput();

  const oldVy = mario.vy;
  const wasOnGround = mario.onGround;
  mario.update(input, level);
  if (mario.x < camera.x + 2) { mario.x = camera.x + 2; mario.vx = Math.max(0, mario.vx); }
  if (!wasOnGround && mario.onGround) mario.stompCombo = 0;
  if (wasOnGround && !mario.onGround && mario.vy < 0) audio.jump();

  updatePlatformRiding(mario, gs.entities);

  const enemiesBeforeHeadHit = countEnemies(gs.entities);
  checkHeadHits(oldVy, mario, gs.entities, entityManager, level, gs.brickHits);
  const headHitKills = enemiesBeforeHeadHit - countEnemies(gs.entities);
  for (let k = 0; k < headHitKills; k++) achievements.onEnemyKill();

  const fbResult = entityManager.handleFireball(mario, gs.entities, gs.fireballCooldown, input);
  gs.fireballCooldown = fbResult.cooldown;
  gs.entities.push(...fbResult.newEntities);

  camera.update(mario.centerX, mario.y);
  entityManager.activateEntities(gs.entities, camera);

  for (const e of gs.entities) {
    if (!e.alive || !e.active) continue;
    if (e instanceof Piranha) e.marioX = mario.x;
    e.update(level);
  }

  const newFromBricks = entityManager.processShellBricks(gs.entities, mario);
  gs.entities.push(...newFromBricks);

  const enemiesBefore = countEnemies(gs.entities);
  const wasFireState = mario.isFire;
  const newFromCollisions = entityManager.checkEntityCollisions(gs.entities, mario);
  gs.entities.push(...newFromCollisions);
  const killed = enemiesBefore - countEnemies(gs.entities);
  for (let k = 0; k < killed; k++) achievements.onEnemyKill();
  if (!wasFireState && mario.isFire) achievements.onFireFlower();
  gs.entities.length = compactEntities(gs.entities);

  level.updateBumps();
  gs.timerFrame++;
  if (gs.timerFrame >= FPS) {
    gs.timerFrame = 0; gs.timer--;
    if (gs.timer === 100) audio.warning();
    if (gs.timer <= 0) {
      mario.die(); audio.stopMusic(); audio.die();
      achievements.onDeath();
      gs.state = GameState.DYING; gs.stateTimer = 0;
    }
  }

  gs.questionAnimTimer++;
  if (gs.questionAnimTimer >= 12) { gs.questionAnimTimer = 0; gs.questionAnimFrame = (gs.questionAnimFrame + 1) % 3; }
  gs.coinAnimTimer++;
  if (gs.coinAnimTimer >= 8) { gs.coinAnimTimer = 0; gs.coinAnimFrame = (gs.coinAnimFrame + 1) % 4; }
  gs.globalFrame++;
  if (gs.fireballCooldown > 0) gs.fireballCooldown--;

  if (mario.starPower === STAR_DURATION - 1) { audio.stopMusic(); audio.playStarTheme(); }
  else if (mario.starPower > 0 && mario.starPower <= 2) { audio.stopMusic(); playLevelMusic(levelConfig); }

  if (mario.coins !== gs.prevMarioCoins) {
    const coinDiff = mario.coins - gs.prevMarioCoins;
    const gained = coinDiff >= 0 ? coinDiff : coinDiff + 100;
    for (let c = 0; c < gained; c++) achievements.onCoinCollect();
    gs.prevMarioCoins = mario.coins;
  }

  if (mario.dying && gs.state === GameState.PLAYING) {
    audio.stopMusic(); audio.die();
    achievements.onDeath();
    gs.state = GameState.DYING; gs.stateTimer = 0; gs.paused = false;
  }

  speedrun.update(mario.x, mario.y);

  if (levelConfig.music === 'castle') {
    updateCastle(
      mario, gs.entities, level, castle, achievements,
      deps.onDie,
      deps.onAdvanceLevel,
    );
  } else if (!mario.onFlagpole && !mario.finishedLevel) {
    const flagCol = Math.floor(levelConfig.data.flagX / TILE);
    if (Math.floor(mario.centerX / TILE) === flagCol && mario.y < 12 * TILE) {
      deps.onStartFlagpole();
    }
  }
}

function checkHeadHits(
  oldVy: number, mario: Mario, entities: Entity[],
  entityManager: EntityManager, level: Level, brickHits: Map<string, number>,
): void {
  if (oldVy >= 0) return;
  const headRow = Math.floor(mario.y / TILE);
  const lCol = Math.floor((mario.x + 2) / TILE);
  const rCol = Math.floor((mario.x + mario.width - 2) / TILE);
  for (let c = lCol; c <= rCol; c++) {
    entities.push(...entityManager.hitBlock(c, headRow, level.getTile(c, headRow), level, mario, entities, brickHits));
  }
}

function updatePlatformRiding(mario: Mario, entities: Entity[]): void {
  if (mario.vy < 0 || mario.dying) return;
  for (const e of entities) {
    if (e.type !== EntityType.PLATFORM || !e.alive || !e.active) continue;
    const plat = e as MovingPlatform;
    const mBottom = mario.y + mario.height;
    const onTop = mBottom >= plat.y && mBottom <= plat.y + plat.height + 4;
    const xOverlap = mario.x + mario.width > plat.x && mario.x < plat.x + plat.width;
    if (onTop && xOverlap) {
      mario.x += plat.vx; mario.y = plat.y - mario.height;
      mario.vy = 0; mario.onGround = true; mario.jumping = false;
      break;
    }
  }
}

export function countEnemies(entities: Entity[]): number {
  let count = 0;
  for (const e of entities) {
    if (!e.alive) continue;
    if (e.type === EntityType.GOOMBA || e.type === EntityType.KOOPA || e.type === EntityType.PIRANHA) count++;
  }
  return count;
}
