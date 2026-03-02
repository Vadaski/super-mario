import { LEVEL_TIME, GameState } from './utils/constants.js';
import { input } from './engine/input.js';
import { Mario } from './entities/mario.js';
import { Goomba, Koopa, Piranha, type Entity } from './entities/entities.js';
import { Camera } from './engine/camera.js';
import { Level } from './world/level.js';
import { GameCanvas } from './engine/canvas.js';
import { LevelEditor } from './engine/level-editor.js';
import { audio } from './audio/audio.js';
import type { LevelConfig } from './world/level-registry.js';

export interface EditorUpdateResult {
  newState?: number;
  stateTimer?: number;
  levelConfig?: LevelConfig;
  level?: Level;
  entities?: Entity[];
  timer?: number;
  timerFrame?: number;
  fireballCooldown?: number;
  clearBrickHits?: boolean;
  testPlaying?: boolean;
  destroyed?: boolean;
}

export function updateEditor(
  editor: LevelEditor,
  mario: Mario,
  camera: Camera,
  gc: GameCanvas,
  initAudio: () => void,
  updatePlaying: () => void,
): EditorUpdateResult {
  if (editor.testPlaying) {
    if (input.justPressed('Escape')) {
      editor.testPlaying = false;
      audio.stopMusic();
      return {};
    }
    updatePlaying();
    return {};
  }

  // Escape exits editor back to title
  if (input.justPressed('Escape')) {
    editor.destroy();
    return { destroyed: true, newState: GameState.TITLE, stateTimer: 0 };
  }

  if (input.justPressed('ArrowLeft')) editor.handleScroll(-3);
  if (input.justPressed('ArrowRight')) editor.handleScroll(3);

  if (input.justPressed('Enter')) {
    initAudio();
    const built = editor.buildLevelData();
    const levelConfig: LevelConfig = {
      id: 'editor',
      data: built.data,
      contents: built.contents,
      bgColor: '#5C94FC',
      music: 'overworld',
      nextLevel: null,
    };
    const level = new Level(built.data, built.contents);
    camera.reset(built.data.width);
    mario.reset(built.data.startX, built.data.startY);
    mario.lives = 3;
    mario.score = 0;
    mario.coins = 0;
    const entities: Entity[] = [];
    for (const s of built.data.entities) {
      if (s.type === 'goomba') entities.push(new Goomba(s.x, s.y));
      else if (s.type === 'koopa') entities.push(new Koopa(s.x, s.y));
      else if (s.type === 'piranha') entities.push(new Piranha(s.x, s.y));
    }
    editor.testPlaying = true;
    audio.playOverworldTheme();
    return {
      levelConfig,
      level,
      entities,
      timer: LEVEL_TIME,
      timerFrame: 0,
      fireballCooldown: 0,
      clearBrickHits: true,
      testPlaying: true,
    };
  }

  if (input.justPressed('KeyE')) {
    const encoded = editor.exportBase64();
    const url = new URL(window.location.href);
    url.searchParams.set('level', encoded);
    window.history.replaceState(null, '', url.toString());
    navigator.clipboard.writeText(url.toString()).catch(() => { /* ignore */ });
  }

  return {};
}

export function checkLevelImport(gc: GameCanvas): LevelEditor | null {
  const params = new URLSearchParams(window.location.search);
  const levelParam = params.get('level');
  if (!levelParam) return null;
  const imported = LevelEditor.importBase64(levelParam);
  if (!imported) return null;
  imported.attach(gc.canvas, gc.getScale());
  return imported;
}
