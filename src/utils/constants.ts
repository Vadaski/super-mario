// NES native resolution
export const SCREEN_WIDTH = 256;
export const SCREEN_HEIGHT = 240;

// Tile size in pixels (16x16 NES tiles)
export const TILE = 16;

// Physics (tuned to match original SMB feel)
export const GRAVITY = 0.4375;
export const MAX_FALL_SPEED = 8;
export const MARIO_WALK_ACCEL = 0.046875;
export const MARIO_RUN_ACCEL = 0.0703125;
export const MARIO_WALK_MAX = 1.5625;
export const MARIO_RUN_MAX = 2.8125;
export const MARIO_FRICTION = 0.0625;
export const MARIO_SKID_DECEL = 0.125;
export const MARIO_JUMP_VELOCITY = -7.0;
export const MARIO_HIGH_JUMP_VELOCITY = -7.5;
export const MARIO_JUMP_GRAVITY = 0.21875; // lower gravity while holding jump
export const MARIO_BOUNCE_VELOCITY = -5.0;

// Enemy speeds
export const GOOMBA_SPEED = 0.5;
export const KOOPA_SPEED = 0.5;
export const SHELL_SPEED = 4;
export const MUSHROOM_SPEED = 1;
export const FIREBALL_SPEED = 3.5;
export const FIREBALL_BOUNCE = -4;

// Timing
export const FPS = 60;
export const FRAME_TIME = 1000 / FPS;
export const STAR_DURATION = 600; // frames
export const INVINCIBLE_DURATION = 120; // frames after getting hit

// Level
export const LEVEL_TIME = 400; // seconds

// Colors (NES palette)
export const COLORS = {
  SKY: '#5C94FC',
  GROUND_DARK: '#C84C0C',
  GROUND_LIGHT: '#FC9838',
  BRICK_DARK: '#A44400',
  BRICK_LIGHT: '#DC7E00',
  QUESTION_DARK: '#C84C0C',
  QUESTION_LIGHT: '#FCA044',
  QUESTION_SHINE: '#FCFCFC',
  PIPE_DARK: '#00A800',
  PIPE_LIGHT: '#80D010',
  PIPE_HIGHLIGHT: '#B8F818',
  MARIO_RED: '#B81810',
  MARIO_SKIN: '#FC9838',
  MARIO_BROWN: '#AC7C00',
  MARIO_GREEN: '#00A800',
  FIRE_WHITE: '#FCFCFC',
  FIRE_RED: '#B81810',
  GOOMBA_BROWN: '#C84C0C',
  GOOMBA_DARK: '#6C4400',
  KOOPA_GREEN: '#00A800',
  KOOPA_LIGHT: '#80D010',
  MUSHROOM_RED: '#B81810',
  MUSHROOM_WHITE: '#FCFCFC',
  STAR_YELLOW: '#FCA044',
  COIN_GOLD: '#FC9838',
  FLAG_GREEN: '#00A800',
  CASTLE_GRAY: '#A4A4A4',
  CASTLE_DARK: '#585858',
  WHITE: '#FCFCFC',
  BLACK: '#000000',
  CLOUD_WHITE: '#FCFCFC',
  BUSH_GREEN: '#00A800',
  BUSH_LIGHT: '#80D010',
  HILL_GREEN: '#00A800',
  HILL_LIGHT: '#80D010',
} as const;

// Tile types
export const enum TileType {
  EMPTY = 0,
  GROUND = 1,
  BRICK = 2,
  QUESTION = 3,
  QUESTION_EMPTY = 4,
  BLOCK = 5,           // solid metal block
  PIPE_TL = 6,
  PIPE_TR = 7,
  PIPE_BL = 8,
  PIPE_BR = 9,
  HIDDEN = 10,         // invisible until hit
  FLAGPOLE = 11,
  FLAGPOLE_TOP = 12,
  CASTLE = 13,
  BRIDGE = 14,
  LAVA = 15,
  CASTLE_STONE = 16,
}

// Entity types
export const enum EntityType {
  MARIO,
  GOOMBA,
  KOOPA,
  SHELL,
  MUSHROOM,
  FIRE_FLOWER,
  STAR,
  COIN_BLOCK,
  COIN_PICKUP,
  FIREBALL,
  BRICK_PARTICLE,
  SCORE_POPUP,
  FLAG,
  PIRANHA,
  PLATFORM,
  FIRE_BAR,
  BOWSER,
  BOWSER_FIRE,
  AXE,
}

// Mario states
export const enum MarioState {
  SMALL,
  BIG,
  FIRE,
}

// Game states
export const enum GameState {
  TITLE,
  PLAYING,
  DYING,
  GAME_OVER,
  WIN,
  LEVEL_INTRO,
  EDITOR,
}

// Stomp combo escalation (NES-accurate)
export const STOMP_SCORES = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
// Index 8+ = 1UP instead of points

// Scoring
export const SCORES = {
  COIN: 200,
  GOOMBA_STOMP: 100,
  KOOPA_STOMP: 100,
  SHELL_KILL: 200,
  MUSHROOM: 1000,
  FIRE_FLOWER: 1000,
  STAR: 1000,
  BRICK_COIN: 200,
  QUESTION_COIN: 200,
  FLAGPOLE_TOP: 5000,
  FLAGPOLE_MID: 2000,
  FLAGPOLE_LOW: 400,
  ONE_UP: 0,   // extra life instead
} as const;
