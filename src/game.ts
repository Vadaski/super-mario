import {
  TILE, SCORES, GameState,
  LEVEL_TIME, FPS, STAR_DURATION,
} from './utils/constants.js';
import { GameCanvas } from './engine/canvas.js';
import { Camera } from './engine/camera.js';
import { input } from './engine/input.js';
import { Mario } from './entities/mario.js';
import { Goomba, Koopa, Piranha, type Entity } from './entities/entities.js';
import { Level } from './world/level.js';
import { WORLD_1_1, blockContents } from './world/levels/world-1-1.js';
import { sprites, initSprites } from './sprites/sprites.js';
import { audio } from './audio/audio.js';
import { drawHUD, drawTitleScreen, drawLevelIntro, drawGameOver } from './ui/hud.js';
import { GameRenderer } from './engine/renderer.js';
import { EntityManager } from './engine/entity-manager.js';

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
  private flagDone = false;
  private walkToCastle = false;
  private brickHits = new Map<string, number>();
  private walkToCastleX = 0;
  private renderer: GameRenderer;
  private entityManager: EntityManager;

  constructor() {
    this.gc = new GameCanvas();
    this.ctx = this.gc.ctx;
    this.camera = new Camera(WORLD_1_1.width);
    this.mario = new Mario(WORLD_1_1.startX, WORLD_1_1.startY);
    this.level = new Level(WORLD_1_1, blockContents);
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
    this.stateTimer++;
    switch (this.state) {
      case GameState.TITLE:
        if (input.startPressed) {
          this.initAudio();
          this.state = GameState.LEVEL_INTRO;
          this.stateTimer = 0;
        }
        break;
      case GameState.LEVEL_INTRO:
        if (this.stateTimer > 150) {
          this.startLevel();
          this.state = GameState.PLAYING;
          audio.playOverworldTheme();
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
      e.update(this.level);
    }
    const newFromCollisions = this.entityManager.checkEntityCollisions(this.entities, this.mario);
    this.entities.push(...newFromCollisions);
    this.entities = this.entities.filter(e => e.alive);

    this.timerFrame++;
    if (this.timerFrame >= FPS) {
      this.timerFrame = 0;
      this.timer--;
      if (this.timer === 100) audio.warning();
      if (this.timer <= 0) {
        this.mario.die();
        audio.stopMusic();
        audio.die();
        this.state = GameState.DYING;
        this.stateTimer = 0;
      }
    }
    this.questionAnimTimer++;
    if (this.questionAnimTimer >= 12) { this.questionAnimTimer = 0; this.questionAnimFrame = (this.questionAnimFrame + 1) % 3; }
    this.coinAnimTimer++;
    if (this.coinAnimTimer >= 8) { this.coinAnimTimer = 0; this.coinAnimFrame = (this.coinAnimFrame + 1) % 4; }
    if (this.fireballCooldown > 0) this.fireballCooldown--;
    if (this.mario.starPower === STAR_DURATION - 1) { audio.stopMusic(); audio.playStarTheme(); }
    else if (this.mario.starPower === 1) { audio.stopMusic(); audio.playOverworldTheme(); }
    if (this.mario.dying && this.state === GameState.PLAYING) {
      audio.stopMusic();
      audio.die();
      this.state = GameState.DYING;
      this.stateTimer = 0;
    }
    if (!this.mario.onFlagpole && !this.mario.finishedLevel) {
      const flagCol = Math.floor(WORLD_1_1.flagX / TILE);
      if (Math.floor(this.mario.centerX / TILE) === flagCol && this.mario.y < 12 * TILE) {
        this.startFlagpole();
      }
    }
  }

  private checkHeadHits(oldVy: number): void {
    if (oldVy >= 0 || this.mario.vy >= 0) return;
    if (this.mario.vy !== 0) return;
    const headRow = Math.floor(this.mario.y / TILE);
    const leftCol = Math.floor((this.mario.x + 2) / TILE);
    const rightCol = Math.floor((this.mario.x + this.mario.width - 2) / TILE);
    for (let col = leftCol; col <= rightCol; col++) {
      const tile = this.level.getTile(col, headRow);
      this.entities.push(...this.entityManager.hitBlock(col, headRow, tile, this.level, this.mario, this.entities, this.brickHits));
    }
  }

  private startFlagpole(): void {
    this.mario.onFlagpole = true;
    this.mario.vx = 0;
    this.mario.vy = 0;
    this.mario.x = WORLD_1_1.flagX - 6;
    audio.stopMusic();
    audio.flagpole();
    const relY = this.mario.y / TILE;
    if (relY <= 5) this.mario.addScore(SCORES.FLAGPOLE_TOP);
    else if (relY <= 9) this.mario.addScore(SCORES.FLAGPOLE_MID);
    else this.mario.addScore(SCORES.FLAGPOLE_LOW);
    this.state = GameState.WIN;
    this.stateTimer = 0;
    this.flagDone = false;
    this.walkToCastle = false;
    this.walkToCastleX = WORLD_1_1.castleX + 16;
  }

  private updateWin(): void {
    if (!this.flagDone) {
      this.mario.y += 2;
      const poleBottom = 12 * TILE;
      if (this.mario.y >= poleBottom) {
        this.mario.y = poleBottom;
        this.flagDone = true;
        this.walkToCastle = true;
        this.mario.onFlagpole = false;
        this.mario.facingRight = true;
        this.stateTimer = 0;
        audio.stageClear();
      }
    } else if (this.walkToCastle) {
      this.mario.x += 1;
      this.mario.vx = 1;
      this.mario.walkTimer++;
      if (this.mario.walkTimer >= 6) {
        this.mario.walkTimer = 0;
        this.mario.walkFrame = (this.mario.walkFrame + 1) % 3;
      }
      this.camera.update(this.mario.centerX, this.mario.y);
      if (this.mario.x >= this.walkToCastleX) {
        this.walkToCastle = false;
        this.mario.finishedLevel = true;
        this.stateTimer = 0;
      }
    } else {
      if (this.timer > 0) {
        this.timer -= 2;
        if (this.timer < 0) this.timer = 0;
        this.mario.addScore(100);
      } else if (this.stateTimer > 120) {
        this.state = GameState.TITLE;
        this.stateTimer = 0;
      }
    }
  }

  private startLevel(): void {
    this.level = new Level(WORLD_1_1, blockContents);
    this.camera.reset(WORLD_1_1.width);
    this.mario.reset(WORLD_1_1.startX, WORLD_1_1.startY);
    this.entities = [];
    this.timer = LEVEL_TIME;
    this.timerFrame = 0;
    this.fireballCooldown = 0;
    for (const spawn of WORLD_1_1.entities) {
      switch (spawn.type) {
        case 'goomba': this.entities.push(new Goomba(spawn.x, spawn.y)); break;
        case 'koopa': this.entities.push(new Koopa(spawn.x, spawn.y)); break;
        case 'piranha': this.entities.push(new Piranha(spawn.x, spawn.y)); break;
      }
    }
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
        drawLevelIntro(this.ctx, '1-1', this.mario.lives);
        break;
      case GameState.GAME_OVER:
        drawGameOver(this.ctx);
        break;
      default:
        this.renderer.renderGame(
          this.camera, this.level, this.entities, this.mario, sprites,
          { questionAnimFrame: this.questionAnimFrame, coinAnimFrame: this.coinAnimFrame },
          WORLD_1_1.scenery, this.timer,
        );
        drawHUD(this.ctx, sprites, this.mario.score, this.mario.coins, '1-1', this.timer, this.mario.lives);
        break;
    }
  }
}
