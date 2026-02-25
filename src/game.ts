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
import { Goomba, Koopa, Shell, Mushroom, FireFlower, Star, Piranha, Fireball, CoinPopup, CoinPickup, BrickParticle, ScorePopup, type Entity } from './entities/entities.js';
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
import { SpeedrunTimer } from './engine/speedrun.js';
import { VolumeControl } from './audio/volume-control.js';
import { CRTShader } from './engine/crt-shader.js';
import { SaveStateManager, type SaveStateData } from './engine/save-states.js';
import { AchievementManager } from './engine/achievements.js';
import { TouchControls } from './input/touch-controls.js';
import { AccessibilityManager } from './engine/accessibility.js';
import { LevelEditor } from './engine/level-editor.js';
import { compactEntities } from './engine/object-pool.js';
import { FpsCounter } from './engine/fps-counter.js';

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
  private saveStateManager = new SaveStateManager();
  private achievements = new AchievementManager();
  private prevMarioCoins = 0;
  private speedrun = new SpeedrunTimer();
  private volumeControl = new VolumeControl();
  private crtShader = new CRTShader();
  private touchControls: TouchControls;
  private accessibility = new AccessibilityManager();
  private editor: LevelEditor | null = null;
  private fpsCounter = new FpsCounter();

  constructor() {
    this.gc = new GameCanvas();
    this.ctx = this.gc.ctx;
    this.levelConfig = getLevelConfig(this.currentLevelId);
    const data = this.levelConfig.data;
    this.camera = new Camera(data.width);
    this.mario = new Mario(data.startX, data.startY);
    this.level = new Level(data, this.levelConfig.contents);
    this.renderer = new GameRenderer(this.gc);
    this.level.onTileChange = (col, row) => this.renderer.getTileCache().invalidateTile(col, row);
    this.entityManager = new EntityManager();
    this.touchControls = new TouchControls();
    input.setTouchControls(this.touchControls);
  }

  async init(): Promise<void> {
    await initSprites();
    this.checkLevelImport();
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
    // Volume controls work in all states
    for (const code of ['KeyM', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract']) {
      if (input.justPressed(code)) {
        this.volumeControl.handleKey(code);
      }
    }

    // Accessibility key handlers (F3/F4/F6/F7, S on title)
    this.accessibility.handleKeys(
      (code: string) => input.justPressed(code),
      this.state,
      GameState.TITLE,
    );

    // If remap overlay or settings menu is open, consume input
    if (this.accessibility.isRemapOpen || this.accessibility.isSettingsOpen) {
      input.update();
      return;
    }

    this.achievements.update();
    if (input.justPressed('Tab')) this.achievements.toggleViewer();
    if (this.achievements.isViewerOpen) { input.update(); return; }

    if (this.transition.active) {
      this.transition.update();
      input.update();
      return;
    }
    if (input.justPressed('F1')) this.speedrun.toggle();
    if (input.justPressed('F2')) this.crtShader.toggle();
    if (input.justPressed('F9')) this.fpsCounter.toggle();
    if (this.state === GameState.PLAYING && (input.justPressed('KeyP') || input.justPressed('Escape') || input.gamepad.startPressed)) {
      this.paused = !this.paused;
      if (this.paused) audio.pause();
    }
    if (this.paused) { input.update(); return; }

    // Slow-motion: skip every other update frame
    if (this.accessibility.shouldSkipUpdate()) { input.update(); return; }

    // Save/load state keys
    if (this.state === GameState.PLAYING) {
      if (input.justPressed('F5')) {
        this.handleSaveState();
      } else if (input.justPressed('F8')) {
        this.handleLoadState();
      }
    }
    this.saveStateManager.updateToast();

    this.stateTimer++;
    switch (this.state) {
      case GameState.TITLE:
        if (input.justPressed('F10')) {
          this.editor = new LevelEditor(this.gc.canvas, this.gc.getScale());
          this.state = GameState.EDITOR;
          this.stateTimer = 0;
          break;
        }
        if (input.startPressed) {
          this.initAudio();
          this.currentLevelId = '1-1';
          this.achievements.onGameStart();
          this.state = GameState.LEVEL_INTRO;
          this.stateTimer = 0;
          this.speedrun.startRun();
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
      case GameState.EDITOR:
        this.updateEditor();
        break;
    }
    input.update();
  }

  private updatePlaying(): void {
    // Speedrun: start timer on first gameplay input
    if (input.left || input.right || input.jump || input.run || input.down) {
      this.speedrun.notifyInput();
    }

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

    const enemiesBeforeHeadHit = this.countEnemies();
    this.checkHeadHits(oldVy);
    const headHitKills = enemiesBeforeHeadHit - this.countEnemies();
    for (let k = 0; k < headHitKills; k++) this.achievements.onEnemyKill();
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
    const enemiesBefore = this.countEnemies();
    const wasFireState = this.mario.isFire;
    const newFromCollisions = this.entityManager.checkEntityCollisions(this.entities, this.mario);
    this.entities.push(...newFromCollisions);
    const killed = enemiesBefore - this.countEnemies();
    for (let k = 0; k < killed; k++) this.achievements.onEnemyKill();
    if (!wasFireState && this.mario.isFire) this.achievements.onFireFlower();
    this.entities.length = compactEntities(this.entities);

    this.level.updateBumps();
    this.timerFrame++;
    if (this.timerFrame >= FPS) {
      this.timerFrame = 0;
      this.timer--;
      if (this.timer === 100) audio.warning();
      if (this.timer <= 0) {
        this.mario.die();
        audio.stopMusic(); audio.die();
        this.achievements.onDeath();
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
    else if (this.mario.starPower > 0 && this.mario.starPower <= 2) { audio.stopMusic(); this.playLevelMusic(); }
    // Track coin collection for achievements (coins wrap at 100)
    if (this.mario.coins !== this.prevMarioCoins) {
      const coinDiff = this.mario.coins - this.prevMarioCoins;
      const gained = coinDiff >= 0 ? coinDiff : coinDiff + 100;
      for (let c = 0; c < gained; c++) this.achievements.onCoinCollect();
      this.prevMarioCoins = this.mario.coins;
    }
    if (this.mario.dying && this.state === GameState.PLAYING) {
      audio.stopMusic(); audio.die();
      this.achievements.onDeath();
      this.state = GameState.DYING; this.stateTimer = 0; this.paused = false;
    }
    this.speedrun.update(this.mario.x, this.mario.y);

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
    if (oldVy >= 0) return;
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
      this.achievements.onDeath();
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
          this.achievements.onDeath();
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
        if (this.mario.dead) {
          audio.stopMusic(); audio.die();
          this.state = GameState.DYING; this.stateTimer = 0;
          return;
        }
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
          this.achievements.onBowserDefeated();
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
    this.achievements.onLevelComplete();
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
    this.speedrun.recordSplit();
    const nextId = this.levelConfig.nextLevel;
    if (!nextId) {
      this.speedrun.finishRun();
      this.state = GameState.TITLE; this.stateTimer = 0;
      return;
    }
    audio.stopMusic();
    this.currentLevelId = nextId;
    this.transition.startFadeOut(() => {
      this.state = GameState.LEVEL_INTRO; this.stateTimer = 0;
      this.transition.startFadeIn();
    });
  }

  private countEnemies(): number {
    let count = 0;
    for (const e of this.entities) {
      if (!e.alive) continue;
      if (e.type === EntityType.GOOMBA || e.type === EntityType.KOOPA || e.type === EntityType.PIRANHA) count++;
    }
    return count;
  }

  private countTotalCoins(contents: { col: number; row: number; content: string }[]): number {
    let total = 0;
    for (const c of contents) {
      if (c.content === 'coin') total++;
      else if (c.content === 'multi-coin') total += 10;
    }
    return total;
  }

  private handleSaveState(): void {
    let slot: number | undefined;
    for (const code of ['Digit1', 'Digit2', 'Digit3']) {
      const s = SaveStateManager.parseSlotFromKey(code);
      if (s >= 0 && input.justPressed(code)) { slot = s; break; }
    }
    this.saveStateManager.save({
      currentLevelId: this.currentLevelId,
      mario: this.mario,
      entities: this.entities,
      camera: this.camera,
      level: this.level,
      timer: this.timer,
      timerFrame: this.timerFrame,
      fireballCooldown: this.fireballCooldown,
      brickHits: this.brickHits,
      globalFrame: this.globalFrame,
      questionAnimFrame: this.questionAnimFrame,
      questionAnimTimer: this.questionAnimTimer,
      coinAnimFrame: this.coinAnimFrame,
      coinAnimTimer: this.coinAnimTimer,
    }, slot);
  }

  private handleLoadState(): void {
    let slot: number | undefined;
    for (const code of ['Digit1', 'Digit2', 'Digit3']) {
      const s = SaveStateManager.parseSlotFromKey(code);
      if (s >= 0 && input.justPressed(code)) { slot = s; break; }
    }
    const data = slot !== undefined
      ? this.saveStateManager.loadFromSlot(slot)
      : this.saveStateManager.load();
    if (!data) return;
    this.restoreSaveState(data);
  }

  private restoreSaveState(data: SaveStateData): void {
    this.currentLevelId = data.currentLevelId;
    this.levelConfig = getLevelConfig(this.currentLevelId);
    const levelData = this.levelConfig.data;
    this.level = new Level(levelData, this.levelConfig.contents);
    this.level.onTileChange = (col, row) => this.renderer.getTileCache().invalidateTile(col, row);
    this.renderer.getTileCache().invalidateAll();
    for (const tc of data.levelState.tileChanges) this.level.setTile(tc.col, tc.row, tc.value);
    this.level.blockContents.clear();
    for (const bc of data.levelState.remainingBlockContents) this.level.blockContents.set(bc.key, bc.value);
    this.level.bumpedBlocks.clear();
    for (const bb of data.levelState.bumpedBlocks) this.level.bumpedBlocks.set(bb.key, bb.timer);
    this.camera.reset(levelData.width);
    this.camera.x = data.camera.x; this.camera.y = data.camera.y;
    const m = data.mario;
    this.mario.x = m.x; this.mario.y = m.y; this.mario.vx = m.vx; this.mario.vy = m.vy;
    this.mario.width = m.width; this.mario.height = m.height;
    this.mario.state = m.state as typeof this.mario.state;
    this.mario.facingRight = m.facingRight; this.mario.onGround = m.onGround;
    this.mario.jumping = m.jumping; this.mario.jumpHeld = m.jumpHeld;
    this.mario.crouching = m.crouching; this.mario.invincible = m.invincible;
    this.mario.starPower = m.starPower; this.mario.dead = m.dead;
    this.mario.dying = m.dying; this.mario.deathTimer = m.deathTimer;
    this.mario.onFlagpole = m.onFlagpole; this.mario.flagSlideY = m.flagSlideY;
    this.mario.walkFrame = m.walkFrame; this.mario.walkTimer = m.walkTimer;
    this.mario.growTimer = m.growTimer; this.mario.growState = m.growState;
    this.mario.stompCombo = m.stompCombo; this.mario.lives = m.lives;
    this.mario.coins = m.coins; this.mario.score = m.score;
    this.mario.finishedLevel = m.finishedLevel;
    this.entities = []; this.castleBowser = null;
    for (const ed of data.entities) {
      const entity = this.reconstructEntity(ed);
      if (entity) {
        this.entities.push(entity);
        if (entity instanceof Bowser) this.castleBowser = entity;
      }
    }
    this.timer = data.timer; this.timerFrame = data.timerFrame;
    this.fireballCooldown = data.fireballCooldown;
    this.brickHits.clear();
    for (const bh of data.brickHits) this.brickHits.set(bh.key, bh.count);
    this.globalFrame = data.globalFrame;
    this.questionAnimFrame = data.questionAnimFrame; this.questionAnimTimer = data.questionAnimTimer;
    this.coinAnimFrame = data.coinAnimFrame; this.coinAnimTimer = data.coinAnimTimer;
    this.state = GameState.PLAYING; this.paused = false;
    this.bridgeCollapsing = false; this.showToadMessage = false;
    audio.stopMusic();
    if (this.mario.starPower > 0) audio.playStarTheme();
    else this.playLevelMusic();
  }

  private reconstructEntity(ed: SaveStateData['entities'][number]): Entity | null {
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

  private startLevel(levelId: string): void {
    this.levelConfig = getLevelConfig(levelId);
    const d = this.levelConfig.data;
    this.level = new Level(d, this.levelConfig.contents);
    this.level.onTileChange = (col, row) => this.renderer.getTileCache().invalidateTile(col, row);
    this.renderer.getTileCache().invalidateAll();
    this.camera.reset(d.width);
    this.mario.reset(d.startX, d.startY);
    this.entities = []; this.timer = LEVEL_TIME;
    this.speedrun.beginLevel(levelId);
    this.timerFrame = 0; this.fireballCooldown = 0; this.paused = false; this.brickHits.clear();
    this.prevMarioCoins = this.mario.coins;
    this.achievements.onLevelStart(levelId, this.countTotalCoins(this.levelConfig.contents));
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
        this.entities.push(new FireBar(s.x, s.y, s.speed));
      } else if (s.type === 'bowser') {
        const bowser = new Bowser(s.x, s.y, s.bridgeStart ?? s.x - 80, s.bridgeEnd ?? s.x + 80);
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
    if (!this.audioInitialized) {
      audio.init();
      this.volumeControl.applyToEngine();
      this.audioInitialized = true;
    }
  }

  private render(): void {
    this.fpsCounter.beginFrame();
    switch (this.state) {
      case GameState.TITLE:
        drawTitleScreen(this.ctx, this.stateTimer);
        break;
      case GameState.LEVEL_INTRO:
        drawLevelIntro(this.ctx, this.currentLevelId, this.mario.lives);
        break;
      case GameState.GAME_OVER:
        drawGameOver(this.ctx);
        break;
      case GameState.EDITOR:
        if (this.editor && !this.editor.testPlaying) {
          this.editor.render(this.ctx);
          break;
        }
        // fall through to default for test-play rendering
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
        // High-contrast outlines for Mario and entities
        this.accessibility.drawHighContrastOutlines(this.ctx, this.camera.x, this.entities, this.mario);
        drawHUD(this.ctx, sprites, this.mario.score, this.mario.coins, this.currentLevelId, this.timer, this.mario.lives);
        this.speedrun.renderGhost(this.ctx, this.camera.x);
        this.speedrun.render(this.ctx);
        break;
      }
    }
    this.transition.render(this.ctx);
    this.saveStateManager.drawToast(this.ctx, SCREEN_WIDTH, SCREEN_HEIGHT);
    if (this.paused) this.drawPauseOverlay();
    this.achievements.render(this.ctx);
    this.volumeControl.renderOverlay(this.ctx);

    // Accessibility indicators and overlays
    this.accessibility.renderSlowIndicator(this.ctx);
    this.accessibility.renderColorblindIndicator(this.ctx);
    this.accessibility.renderRemapOverlay(this.ctx, (code: string) => input.justPressed(code));
    this.accessibility.renderSettingsMenu(this.ctx, (code: string) => input.justPressed(code));

    this.fpsCounter.render(this.ctx);
    this.crtShader.apply(this.ctx, this.gc.canvas);
  }

  private updateEditor(): void {
    if (!this.editor) return;
    if (this.editor.testPlaying) {
      // Escape returns to editor
      if (input.justPressed('Escape')) {
        this.editor.testPlaying = false;
        audio.stopMusic();
        return;
      }
      this.updatePlaying();
      return;
    }
    // Editor mode key handling
    if (input.justPressed('Escape')) {
      // Exit editor back to title
      this.editor.destroy();
      this.editor = null;
      this.state = GameState.TITLE;
      this.stateTimer = 0;
      return;
    }
    if (input.justPressed('ArrowLeft')) this.editor.handleScroll(-3);
    if (input.justPressed('ArrowRight')) this.editor.handleScroll(3);
    if (input.justPressed('Enter')) {
      // Test-play
      this.initAudio();
      const built = this.editor.buildLevelData();
      this.levelConfig = {
        id: 'editor',
        data: built.data,
        contents: built.contents,
        bgColor: '#5C94FC',
        music: 'overworld',
        nextLevel: null,
      };
      this.level = new Level(built.data, built.contents);
      this.camera.reset(built.data.width);
      this.mario.reset(built.data.startX, built.data.startY);
      this.mario.lives = 3;
      this.mario.score = 0;
      this.mario.coins = 0;
      this.entities = [];
      this.timer = LEVEL_TIME;
      this.timerFrame = 0;
      this.fireballCooldown = 0;
      this.brickHits.clear();
      for (const s of built.data.entities) {
        if (s.type === 'goomba') this.entities.push(new Goomba(s.x, s.y));
        else if (s.type === 'koopa') this.entities.push(new Koopa(s.x, s.y));
        else if (s.type === 'piranha') this.entities.push(new Piranha(s.x, s.y));
      }
      this.editor.testPlaying = true;
      audio.playOverworldTheme();
      return;
    }
    if (input.justPressed('KeyE')) {
      // Export
      const encoded = this.editor.exportBase64();
      const url = new URL(window.location.href);
      url.searchParams.set('level', encoded);
      window.history.replaceState(null, '', url.toString());
      navigator.clipboard.writeText(url.toString()).catch(() => { /* ignore */ });
    }
  }

  private checkLevelImport(): void {
    const params = new URLSearchParams(window.location.search);
    const levelParam = params.get('level');
    if (!levelParam) return;
    const imported = LevelEditor.importBase64(levelParam);
    if (!imported) return;
    imported.attach(this.gc.canvas, this.gc.getScale());
    this.editor = imported;
    this.state = GameState.EDITOR;
    this.stateTimer = 0;
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
