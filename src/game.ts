import {
  TILE, SCORES, GameState,
  LEVEL_TIME, FPS, STAR_DURATION,
  SCREEN_WIDTH, SCREEN_HEIGHT,
  EntityType, TileType,
} from './utils/constants.js';
import { GameCanvas } from './engine/canvas.js';
import { Camera } from './engine/camera.js';
import { input } from './engine/input.js';
import { Mario } from './entities/mario.js';
import { Goomba, Koopa, Piranha, Fireball, ScorePopup, type Entity } from './entities/entities.js';
import { MovingPlatform } from './entities/platforms.js';
import { FireBar } from './entities/fire-bar.js';
import { Bowser, BowserFire, Axe } from './entities/bowser.js';
import { aabbOverlap } from './physics/collision.js';
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
  private globalFrame = 0;
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
  // Castle / Bowser state
  private bridgeCollapsing = false;
  private bridgeCollapseCol = 0;
  private bridgeCollapseTimer = 0;
  private bridgeCollapseEnd = 0;
  private toadMessageTimer = 0;
  private showToadMessage = false;
  private castleBowser: Bowser | null = null;

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

    // Platform riding: move Mario with moving platforms
    this.updatePlatformRiding();

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
    this.globalFrame++;
    if (this.fireballCooldown > 0) this.fireballCooldown--;
    if (this.mario.starPower === STAR_DURATION - 1) { audio.stopMusic(); audio.playStarTheme(); }
    else if (this.mario.starPower === 1) { audio.stopMusic(); this.playLevelMusic(); }
    if (this.mario.dying && this.state === GameState.PLAYING) {
      audio.stopMusic(); audio.die();
      this.state = GameState.DYING; this.stateTimer = 0; this.paused = false;
    }
    if (this.levelConfig.music === 'castle') {
      this.updateCastle();
    } else if (!this.mario.onFlagpole && !this.mario.finishedLevel) {
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

  private updatePlatformRiding(): void {
    if (this.mario.vy < 0 || this.mario.dying) return;
    for (const e of this.entities) {
      if (e.type !== EntityType.PLATFORM || !e.alive || !e.active) continue;
      const plat = e as MovingPlatform;
      const mBottom = this.mario.y + this.mario.height;
      const onTop = mBottom >= plat.y && mBottom <= plat.y + plat.height + 4;
      const xOverlap = this.mario.x + this.mario.width > plat.x && this.mario.x < plat.x + plat.width;
      if (onTop && xOverlap) {
        this.mario.x += plat.vx;
        this.mario.y = plat.y - this.mario.height;
        this.mario.vy = 0;
        this.mario.onGround = true;
        this.mario.jumping = false;
        break;
      }
    }
  }

  private updateCastle(): void {
    if (this.mario.dead || this.mario.dying) return;

    // Check lava collision (instant death)
    const mCol = Math.floor(this.mario.centerX / TILE);
    const mBottomRow = Math.floor((this.mario.y + this.mario.height + 2) / TILE);
    const lavaTile = this.level.getTile(mCol, mBottomRow);
    if (lavaTile === TileType.LAVA) {
      this.mario.die();
      audio.stopMusic(); audio.die();
      this.state = GameState.DYING; this.stateTimer = 0;
      return;
    }

    // Check fire bar collisions
    for (const e of this.entities) {
      if (e.type !== EntityType.FIRE_BAR || !e.alive || !e.active) continue;
      const fb = e as FireBar;
      if (fb.overlapsEntity(this.mario.x, this.mario.y, this.mario.width, this.mario.height)) {
        if (this.mario.starPower > 0) continue;
        const damaged = this.mario.takeDamage();
        if (damaged && !this.mario.dead) audio.powerDown();
        if (this.mario.dead) {
          audio.stopMusic(); audio.die();
          this.state = GameState.DYING; this.stateTimer = 0;
          return;
        }
      }
    }

    // Check Bowser fire collision
    for (const e of this.entities) {
      if (e.type !== EntityType.BOWSER_FIRE || !e.alive) continue;
      const mb = { x: this.mario.x, y: this.mario.y, width: this.mario.width, height: this.mario.height, vx: 0, vy: 0 };
      const fb = { x: e.x, y: e.y, width: e.width, height: e.height, vx: 0, vy: 0 };
      if (aabbOverlap(mb, fb)) {
        if (this.mario.starPower > 0) { e.alive = false; continue; }
        const damaged = this.mario.takeDamage();
        if (damaged && !this.mario.dead) audio.powerDown();
      }
    }

    // Bowser fire spawning
    if (this.castleBowser && this.castleBowser.alive && this.castleBowser.pendingFire) {
      this.castleBowser.pendingFire = false;
      const bx = this.castleBowser.facingRight
        ? this.castleBowser.x + this.castleBowser.width
        : this.castleBowser.x - 16;
      this.entities.push(new BowserFire(bx, this.castleBowser.y + 8));
    }

    // Mario's fireballs hitting Bowser
    if (this.castleBowser && this.castleBowser.alive) {
      for (const e of this.entities) {
        if (e.type !== EntityType.FIREBALL || !e.alive) continue;
        const fb = { x: e.x, y: e.y, width: e.width, height: e.height, vx: 0, vy: 0 };
        const bb = { x: this.castleBowser.x, y: this.castleBowser.y, width: this.castleBowser.width, height: this.castleBowser.height, vx: 0, vy: 0 };
        if (aabbOverlap(fb, bb)) {
          e.alive = false;
          const killed = this.castleBowser.hitByFireball();
          audio.kick();
          if (killed) {
            this.mario.addScore(5000);
            this.entities.push(new ScorePopup(this.castleBowser.x, this.castleBowser.y, 5000));
          }
        }
      }
    }

    // Axe collision: start bridge collapse
    if (!this.bridgeCollapsing && !this.showToadMessage) {
      for (const e of this.entities) {
        if (e.type !== EntityType.AXE || !e.alive) continue;
        const mb = { x: this.mario.x, y: this.mario.y, width: this.mario.width, height: this.mario.height, vx: 0, vy: 0 };
        const ab = { x: e.x, y: e.y, width: e.width, height: e.height, vx: 0, vy: 0 };
        if (aabbOverlap(mb, ab)) {
          e.alive = false;
          this.bridgeCollapsing = true;
          this.bridgeCollapseCol = 88; // rightmost bridge tile
          this.bridgeCollapseEnd = 71; // leftmost bridge tile
          this.bridgeCollapseTimer = 0;
          audio.stopMusic();
        }
      }
    }

    // Bridge collapse animation
    if (this.bridgeCollapsing) {
      this.bridgeCollapseTimer++;
      if (this.bridgeCollapseTimer % 4 === 0 && this.bridgeCollapseCol >= this.bridgeCollapseEnd) {
        this.level.setTile(this.bridgeCollapseCol, 12, TileType.EMPTY);
        // Make Bowser fall when his tile is removed
        if (this.castleBowser && this.castleBowser.alive) {
          const bowserCol = Math.floor((this.castleBowser.x + 16) / TILE);
          if (bowserCol >= this.bridgeCollapseCol) {
            this.castleBowser.startFalling();
            audio.bowserFall();
          }
        }
        this.bridgeCollapseCol--;
      }
      if (this.bridgeCollapseCol < this.bridgeCollapseEnd) {
        this.bridgeCollapsing = false;
        this.showToadMessage = true;
        this.toadMessageTimer = 0;
      }
    }

    // Toad message after bridge collapse
    if (this.showToadMessage) {
      this.toadMessageTimer++;
      if (this.toadMessageTimer > 180) { // 3 seconds
        this.showToadMessage = false;
        this.advanceLevel();
      }
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
    this.bridgeCollapsing = false;
    this.showToadMessage = false;
    this.toadMessageTimer = 0;
    this.castleBowser = null;
    for (const s of d.entities) {
      if (s.type === 'goomba') this.entities.push(new Goomba(s.x, s.y));
      else if (s.type === 'koopa') this.entities.push(new Koopa(s.x, s.y));
      else if (s.type === 'piranha') this.entities.push(new Piranha(s.x, s.y));
      else if (s.type === 'koopa-red') {
        const k = new Koopa(s.x, s.y); k.red = true; this.entities.push(k);
      } else if (s.type === 'paratroopa') {
        const k = new Koopa(s.x, s.y); k.winged = true; k.wingBaseY = s.y - 8; this.entities.push(k);
      } else if (s.type === 'platform-h') {
        this.entities.push(new MovingPlatform(s.x, s.y, 'horizontal', s.minPos ?? s.x - 48, s.maxPos ?? s.x + 48, s.platformWidth));
      } else if (s.type === 'platform-v') {
        this.entities.push(new MovingPlatform(s.x, s.y, 'vertical', s.minPos ?? s.y - 48, s.maxPos ?? s.y + 48, s.platformWidth));
      } else if (s.type === 'fire-bar') {
        const fb = new FireBar(s.x, s.y, (s as { speed?: number }).speed);
        this.entities.push(fb);
      } else if (s.type === 'bowser') {
        const bs = s as { bridgeStart?: number; bridgeEnd?: number };
        const bowser = new Bowser(s.x, s.y, bs.bridgeStart ?? s.x - 80, bs.bridgeEnd ?? s.x + 80);
        this.castleBowser = bowser;
        this.entities.push(bowser);
      } else if (s.type === 'axe') {
        this.entities.push(new Axe(s.x, s.y));
      }
    }
  }

  private playLevelMusic(): void {
    if (this.levelConfig.music === 'overworld' || this.levelConfig.music === 'star') audio.playOverworldTheme();
    else if (this.levelConfig.music === 'underground') audio.playUndergroundTheme();
    else if (this.levelConfig.music === 'castle') audio.playCastleTheme();
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
          { questionAnimFrame: this.questionAnimFrame, coinAnimFrame: this.coinAnimFrame, globalFrame: this.globalFrame },
          data.scenery, this.timer, this.levelConfig.bgColor,
        );
        if (this.state === GameState.WIN) {
          this.renderer.drawPoleFlag(this.camera, data.flagX, this.winSeq.flagY);
          this.renderer.drawCastleFlag(this.camera, data.castleX, this.winSeq.castleFlagY);
          if (this.winSeq.fireworks.length > 0) this.renderer.drawFireworks(this.camera, this.winSeq.fireworks);
        }
        if (this.showToadMessage) {
          this.renderer.drawToadMessage(
            this.camera,
            'THANK YOU MARIO!',
            94 * TILE + 8,
            10 * TILE,
          );
          this.ctx.fillStyle = '#FCFCFC';
          this.ctx.font = '8px monospace';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('BUT OUR PRINCESS IS', this.camera.screenX(94 * TILE + 24), this.camera.screenY(8 * TILE));
          this.ctx.fillText('IN ANOTHER CASTLE!', this.camera.screenX(94 * TILE + 24), this.camera.screenY(8 * TILE + 12));
          this.ctx.textAlign = 'left';
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
