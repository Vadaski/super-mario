import { LEVEL_TIME, TILE } from './utils/constants.js';
import { Mario } from './entities/mario.js';
import { Goomba, Koopa, Piranha, type Entity } from './entities/entities.js';
import { MovingPlatform } from './entities/platforms.js';
import { FireBar } from './entities/fire-bar.js';
import { Bowser, Axe } from './entities/bowser.js';
import { Camera } from './engine/camera.js';
import { Level } from './world/level.js';
import { GameRenderer } from './engine/renderer.js';
import { getLevelConfig, type LevelConfig } from './world/level-registry.js';
import { audio } from './audio/audio.js';
import { SpeedrunTimer } from './engine/speedrun.js';
import { AchievementManager } from './engine/achievements.js';

export interface StartLevelResult {
  levelConfig: LevelConfig;
  level: Level;
  entities: Entity[];
  castleBowser: Bowser | null;
}

export function startLevel(
  levelId: string,
  mario: Mario,
  camera: Camera,
  renderer: GameRenderer,
  speedrun: SpeedrunTimer,
  achievements: AchievementManager,
): StartLevelResult {
  const levelConfig = getLevelConfig(levelId);
  const d = levelConfig.data;
  const level = new Level(d, levelConfig.contents);
  level.onTileChange = (col, row) => renderer.getTileCache().invalidateTile(col, row);
  renderer.getTileCache().invalidateAll();
  camera.reset(d.width);
  mario.reset(d.startX, d.startY);
  speedrun.beginLevel(levelId);
  achievements.onLevelStart(levelId, countTotalCoins(levelConfig.contents));

  const entities: Entity[] = [];
  let castleBowser: Bowser | null = null;
  for (const s of d.entities) {
    if (s.type === 'goomba') entities.push(new Goomba(s.x, s.y));
    else if (s.type === 'koopa') entities.push(new Koopa(s.x, s.y));
    else if (s.type === 'piranha') entities.push(new Piranha(s.x, s.y));
    else if (s.type === 'koopa-red') {
      const k = new Koopa(s.x, s.y); k.red = true; entities.push(k);
    } else if (s.type === 'paratroopa') {
      const k = new Koopa(s.x, s.y); k.winged = true; k.wingBaseY = s.y - 8; entities.push(k);
    } else if (s.type === 'platform-h') {
      entities.push(new MovingPlatform(s.x, s.y, 'horizontal', s.minPos ?? s.x - 48, s.maxPos ?? s.x + 48, s.platformWidth));
    } else if (s.type === 'platform-v') {
      entities.push(new MovingPlatform(s.x, s.y, 'vertical', s.minPos ?? s.y - 48, s.maxPos ?? s.y + 48, s.platformWidth));
    } else if (s.type === 'fire-bar') {
      entities.push(new FireBar(s.x, s.y, s.speed));
    } else if (s.type === 'bowser') {
      const bowser = new Bowser(s.x, s.y, s.bridgeStart ?? s.x - 80, s.bridgeEnd ?? s.x + 80);
      castleBowser = bowser;
      entities.push(bowser);
    } else if (s.type === 'axe') {
      entities.push(new Axe(s.x, s.y));
    }
  }

  return { levelConfig, level, entities, castleBowser };
}

export function countTotalCoins(contents: { col: number; row: number; content: string }[]): number {
  let total = 0;
  for (const c of contents) {
    if (c.content === 'coin') total++;
    else if (c.content === 'multi-coin') total += 10;
  }
  return total;
}

export function playLevelMusic(levelConfig: LevelConfig): void {
  if (levelConfig.music === 'overworld' || levelConfig.music === 'star') audio.playOverworldTheme();
  else if (levelConfig.music === 'underground') audio.playUndergroundTheme();
  else if (levelConfig.music === 'castle') audio.playCastleTheme();
}
