// =============================================================================
// Level Registry - Central catalog of all game levels
// =============================================================================

import type { LevelData, BlockContent } from './levels/world-1-1.js';
import { WORLD_1_1, blockContents } from './levels/world-1-1.js';
import { WORLD_1_2, blockContents_1_2 } from './levels/world-1-2.js';
import { WORLD_1_3, blockContents_1_3 } from './levels/world-1-3.js';
import { WORLD_1_4, blockContents_1_4 } from './levels/world-1-4.js';

export interface LevelConfig {
  id: string;
  data: LevelData;
  contents: BlockContent[];
  bgColor: string;
  music: 'overworld' | 'underground' | 'castle' | 'star';
  nextLevel: string | null;
}

export const LEVEL_ORDER = ['1-1', '1-2', '1-3', '1-4'];

const registry = new Map<string, LevelConfig>();

function register(config: LevelConfig): void {
  registry.set(config.id, config);
}

// Register World 1-1
register({
  id: '1-1',
  data: WORLD_1_1,
  contents: blockContents,
  bgColor: '#5C94FC',
  music: 'overworld',
  nextLevel: '1-2',
});

// Register World 1-2
register({
  id: '1-2',
  data: WORLD_1_2,
  contents: blockContents_1_2,
  bgColor: '#000000',
  music: 'underground',
  nextLevel: '1-3',
});

// Register World 1-3
register({
  id: '1-3',
  data: WORLD_1_3,
  contents: blockContents_1_3,
  bgColor: '#5C94FC',
  music: 'overworld',
  nextLevel: '1-4',
});

// Register World 1-4
register({
  id: '1-4',
  data: WORLD_1_4,
  contents: blockContents_1_4,
  bgColor: '#000000',
  music: 'castle',
  nextLevel: null,
});

/**
 * Retrieve a level configuration by ID.
 * Falls back to '1-1' if the requested level does not exist yet.
 */
export function getLevelConfig(id: string): LevelConfig {
  const config = registry.get(id);
  if (config) return config;

  // Fallback: level data not yet implemented, reload 1-1 as placeholder
  const fallback = registry.get('1-1');
  if (!fallback) throw new Error('Level registry is empty');
  return { ...fallback, id, nextLevel: getNextLevel(id) };
}

function getNextLevel(id: string): string | null {
  const idx = LEVEL_ORDER.indexOf(id);
  if (idx === -1 || idx >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1];
}

/** Check whether a level has its own dedicated data (not a fallback). */
export function hasLevelData(id: string): boolean {
  return registry.has(id);
}
