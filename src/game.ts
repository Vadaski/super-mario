import {
  TILE, SCORES, GameState,
  LEVEL_TIME, FPS, STAR_DURATION,
  SCREEN_WIDTH, SCREEN_HEIGHT,
} from './utils/constants.js';
import { GameCanvas } from './engine/canvas.js';
import { Camera } from './engine/camera.js';
import { input } from './engine/input.js';
import { Mario } from './entities/mario.js';
import { Goomba, Koopa, Piranha, type Entity } from './entities/entities.js';
import { Level } from './world/level.js';
import { sprites, initSprites } from './sprites/sprites.js';
import { audio } from './audio/audio.js';
import { drawHUD, drawTitleScreen, drawLevelIntro, drawGameOver } from './ui/hud.js';
import { GameRenderer } from './engine/renderer.js';
import { EntityManager } from './engine/entity-manager.js';
import { WinSequence } from './engine/win-sequence.js';
import { TransitionManager } from './engine/transitions.js';
import { getLevelConfig, type LevelConfig } from './world/level-registry.js';

export class Game {
  private gc: GameCanvas;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private mario: Mario;
  private level: Level;
  private entities: Entity[] = [];
  private state = GameState.TITLE;
  private timer = LEVEL_TIME;
  private timerFrame = 0;
  private stateTimer = 0;
  private questionAnimFrame = 0;
  private questionAnimTimer = 0;
  private coinAnimFrame = 0;
  private coinAnimTimer = 0;
  private audioInitialized = false;
  private fireballCooldown = 0;
  private brickHits = new Map<string, number>();
  private winSeq = new WinSequence();
  private paused = false;
  private renderer: GameRenderer;
  private entityManager: EntityManager;
  private currentLevelId = '1-1';
  private levelConfig: LevelConfig;
  private transition = new TransitionManager();

  constructor() {
    this.gc = new GameCanvas();
    this.ctx = this.gc.ctx;
    this.levelConfig = getLevelConfig(this.currentLevelId);
    const data = this.levelConfig.data;
    this.camera = new Camera(data.width);
    this.mario = new Mario(data.startX, data.startY);
    this.level = new Level(data, this.levelConfig.contents);
    this.renderer = new GameRenderer(this.gc);
    this.entityManager = new EntityManager();
  }

  async init(): Promise<void> {
    await initSprites();
    this.startLoop();
  }

  private startLoop(): void {
    let lastTime = performance.now();
    let accumulator = 0;
    const step = 1000 / FPS;
    const loop = (now: number) => {
      accumulator += now - lastTime;
      lastTime = now;
      if (accumulator > step * 5) accumulator = step * 5;
      while (accumulator >= step) { this.update(); accumulator -= step; }
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update(): void {
    if (this.transition.active) {
      this.transition.update();
      input.update();
      return;
    }
    if (this.state === GameState.PLAYING && (input.justPressed('KeyP') || input.justPressed('Escape'))) {
      this.paused = !this.paused;
      audio.pause();
    }
    if (this.paused) { input.update(); return; }
    this.stateTimer++;
    switch (this.state) {
      case GameState.TITLE:
        if (input.startPressed) {
          this.initAudio();
          this.currentLevelId = '1-1';
          this.state = GameState.LEVEL_INTRO;
          this.stateTimer = 0;
        }
        break;
      case GameState.LEVEL_INTRO:
        if (this.stateTimer > 150) {
          this.startLevel(this.currentLevelId);
          this.state = GameState.PLAYING;
          this.playLevelMusic();
        }
        break;
      case GameState.PLAYING:
        this.updatePlaying();
        break;
      case GameState.DYING:
        this.mario.update(input, this.level);
        if (this.stateTimer > 180) {
          if (this.mario.lives <= 0) {
            this.state = GameState.GAME_OVER;
            this.stateTimer = 0;
            audio.stopMusic();
            audio.gameOver();
          } else {
            this.state = GameState.LEVEL_INTRO;
            this.stateTimer = 0;
          }
        }
        break;
      case GameState.GAME_OVER:
        if (this.stateTimer > 300) {
          this.state = GameState.TITLE;
          this.stateTimer = 0;
          this.mario.lives = 3;
          this.mario.score = 0;
          this.mario.coins = 0;
          this.currentLevelId = '1-1';
        }
        break;
      case GameState.WIN:
        this.updateWin();
        break;
    }
    input.update();
  }

  private updatePlaying(): void {
    const oldVy = this.mario.vy;
    const wasOnGround = this.mario.onGround;
    this.mario.update(input, this.level);
    if (this.mario.x < this.camera.x + 2) {
      this.mario.x = this.camera.x + 2;
      this.mario.vx = Math.max(0, this.mario.vx);
    }
    if (!wasOnGround && this.mario.onGround) this.mario.stompCombo = 0;
    if (wasOnGround && !this.mario.onGround && this.mario.vy < 0) audio.jump();

    this.checkHeadHits(oldVy);
    const fbResult = this.entityManager.handleFireball(this.mario, this.entities, this.fireballCooldown, input);
    this.fireballCooldown = fbResult.cooldown;
    this.entities.push(...fbResult.newEntities);
    this.camera.update(this.mario.centerX, this.mario.y);
    this.entityManager.activateEntities(this.entities, this.camera);
    for (const e of this.entities) {
      if (!e.alive || !e.active) continue;
      if (e instanceof Piranha) e.marioX = this.mario.x;
      e.update(this.level);
    }
    const newFromBricks = this.entityManager.processShellBricks(this.entities, this.mario);
    this.entities.push(...newFromBricks);
    const newFromCollisions = this.entityManager.checkEntityCollisions(this.entities, this.mario);
    this.entities.push(...newFromCollisions);
    this.entities = this.entities.filter(e => e.alive);

    this.level.updateBumps();
    this.timerFrame++;
    if (this.timerFrame >= FPS) {
      this.timerFrame = 0;
      this.timer--;
      if (this.timer === 100) audio.warning();
      if (this.timer <= 0) {
        this.mario.die();
        audio.stopMusic(); audio.die();
        this.state = GameState.DYING; this.stateTimer = 0;
      }
    }
    this.questionAnimTimer++;
    if (this.questionAnimTimer >= 12) { this.questionAnimTimer = 0; this.questionAnimFrame = (this.questionAnimFrame + 1) % 3; }
    this.coinAnimTimer++;
    if (this.coinAnimTimer >= 8) { this.coinAnimTimer = 0; this.coinAnimFrame = (this.coinAnimFrame + 1) % 4; }
    if (this.fireballCooldown > 0) this.fireballCooldown--;
    if (this.mario.starPower === STAR_DURATION - 1) { audio.stopMusic(); audio.playStarTheme(); }
    else if (this.mario.starPower === 1) { audio.stopMusic(); this.playLevelMusic(); }
    if (this.mario.dying && this.state === GameState.PLAYING) {
      audio.stopMusic(); audio.die();
      this.state = GameState.DYING; this.stateTimer = 0; this.paused = false;
    }
    if (!this.mario.onFlagpole && !this.mario.finishedLevel) {
      const flagCol = Math.floor(this.levelConfig.data.flagX / TILE);
      if (Math.floor(this.mario.centerX / TILE) === flagCol && this.mario.y < 12 * TILE) {
        this.startFlagpole();
      }
    }
  }

  private checkHeadHits(oldVy: number): void {
    if (oldVy >= 0 || this.mario.vy >= 0 || this.mario.vy !== 0) return;
    const headRow = Math.floor(this.mario.y / TILE);
    const lCol = Math.floor((this.mario.x + 2) / TILE);
    const rCol = Math.floor((this.mario.x + this.mario.width - 2) / TILE);
    for (let c = lCol; c <= rCol; c++) {
      this.entities.push(...this.entityManager.hitBlock(c, headRow, this.level.getTile(c, headRow), this.level, this.mario, this.entities, this.brickHits));
    }
  }

  private startFlagpole(): void {
    const { flagX, castleX } = this.levelConfig.data;
    const relY = this.mario.y / TILE;
    this.mario.addScore(relY <= 5 ? SCORES.FLAGPOLE_TOP : relY <= 9 ? SCORES.FLAGPOLE_MID : SCORES.FLAGPOLE_LOW);
    this.winSeq.start(this.mario, flagX, castleX, this.timer);
    this.state = GameState.WIN; this.stateTimer = 0;
  }

  private updateWin(): void {
    const r = this.winSeq.update(this.mario, this.camera, this.timer);
    this.timer = r.newTimer;
    if (r.scoreAdd > 0) this.mario.addScore(r.scoreAdd);
    if (r.finished && r.advanceLevel) this.advanceLevel();
    else if (r.finished) { this.state = GameState.TITLE; this.stateTimer = 0; }
  }

  private advanceLevel(): void {
    const nextId = this.levelConfig.nextLevel;
    if (!nextId) { this.state = GameState.TITLE; this.stateTimer = 0; return; }
    audio.stopMusic();
    this.currentLevelId = nextId;
    this.transition.startFadeOut(() => {
      this.state = GameState.LEVEL_INTRO; this.stateTimer = 0;
      this.transition.startFadeIn();
    });
  }

  private startLevel(levelId: string): void {
    this.levelConfig = getLevelConfig(levelId);
    const d = this.levelConfig.data;
    this.level = new Level(d, this.levelConfig.contents);
    this.camera.reset(d.width);
    this.mario.reset(d.startX, d.startY);
    this.entities = []; this.timer = LEVEL_TIME;
    this.timerFrame = 0; this.fireballCooldown = 0; this.paused = false; this.brickHits.clear();
    for (const s of d.entities) {
      if (s.type === 'goomba') this.entities.push(new Goomba(s.x, s.y));
      else if (s.type === 'koopa') this.entities.push(new Koopa(s.x, s.y));
      else if (s.type === 'piranha') this.entities.push(new Piranha(s.x, s.y));
    }
  }

  private playLevelMusic(): void {
    if (this.levelConfig.music === 'overworld' || this.levelConfig.music === 'star') audio.playOverworldTheme();
  }

  private initAudio(): void {
    if (!this.audioInitialized) { audio.init(); this.audioInitialized = true; }
  }

  private render(): void {
    switch (this.state) {
      case GameState.TITLE:
        drawTitleScreen(this.ctx);
        break;
      case GameState.LEVEL_INTRO:
        drawLevelIntro(this.ctx, this.currentLevelId, this.mario.lives);
        break;
      case GameState.GAME_OVER:
        drawGameOver(this.ctx);
        break;
      default: {
        const data = this.levelConfig.data;
        this.renderer.renderGame(
          this.camera, this.level, this.entities, this.mario, sprites,
          { questionAnimFrame: this.questionAnimFrame, coinAnimFrame: this.coinAnimFrame },
          data.scenery, this.timer,
        );
        if (this.state === GameState.WIN) {
          this.renderer.drawPoleFlag(this.camera, data.flagX, this.winSeq.flagY);
          this.renderer.drawCastleFlag(this.camera, data.castleX, this.winSeq.castleFlagY);
          if (this.winSeq.fireworks.length > 0) this.renderer.drawFireworks(this.camera, this.winSeq.fireworks);
        }
        drawHUD(this.ctx, sprites, this.mario.score, this.mario.coins, this.currentLevelId, this.timer, this.mario.lives);
        break;
      }
    }
    this.transition.render(this.ctx);
    if (this.paused) this.drawPauseOverlay();
  }

  private drawPauseOverlay(): void {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    c.font = '8px monospace'; c.fillStyle = '#FCFCFC';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('PAUSE', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  }
}
