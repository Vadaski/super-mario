import { TILE, SCORES, GameState, LEVEL_TIME, FPS, SCREEN_WIDTH, SCREEN_HEIGHT } from './utils/constants.js';
import { GameCanvas } from './engine/canvas.js';
import { Camera } from './engine/camera.js';
import { input } from './engine/input.js';
import { Mario } from './entities/mario.js';
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
import { FpsCounter } from './engine/fps-counter.js';
import type { CastleState } from './castle-logic.js';
import { handleSaveState, handleLoadState, restoreSaveState } from './save-state-handler.js';
import { startLevel, playLevelMusic } from './level-loader.js';
import { updateEditor, checkLevelImport } from './editor-handler.js';
import { updatePlaying, type GameplayState } from './gameplay-update.js';

export class Game {
  private gc: GameCanvas; private ctx: CanvasRenderingContext2D;
  private camera: Camera; private mario: Mario; private level: Level;
  private gps: GameplayState; private state = GameState.TITLE; private stateTimer = 0;
  private audioInitialized = false; private winSeq = new WinSequence();
  private renderer: GameRenderer; private entityManager: EntityManager;
  private currentLevelId = '1-1'; private levelConfig: LevelConfig;
  private transition = new TransitionManager();
  private castle: CastleState = { bridgeCollapsing: false, bridgeCollapseCol: 0, bridgeCollapseTimer: 0, bridgeCollapseEnd: 0, toadMessageTimer: 0, showToadMessage: false, castleBowser: null };
  private saveStateManager = new SaveStateManager(); private achievements = new AchievementManager();
  private speedrun = new SpeedrunTimer(); private volumeControl = new VolumeControl();
  private crtShader = new CRTShader(); private touchControls: TouchControls;
  private accessibility = new AccessibilityManager();
  private editor: LevelEditor | null = null; private fpsCounter = new FpsCounter();

  constructor() {
    this.gc = new GameCanvas(); this.ctx = this.gc.ctx;
    this.levelConfig = getLevelConfig(this.currentLevelId);
    const d = this.levelConfig.data;
    this.camera = new Camera(d.width);
    this.mario = new Mario(d.startX, d.startY);
    this.level = new Level(d, this.levelConfig.contents);
    this.renderer = new GameRenderer(this.gc);
    this.level.onTileChange = (col, row) => this.renderer.getTileCache().invalidateTile(col, row);
    this.entityManager = new EntityManager();
    this.touchControls = new TouchControls(); input.setTouchControls(this.touchControls);
    this.gps = {
      entities: [], timer: LEVEL_TIME, timerFrame: 0, fireballCooldown: 0, questionAnimFrame: 0,
      questionAnimTimer: 0, coinAnimFrame: 0, coinAnimTimer: 0, globalFrame: 0, prevMarioCoins: 0,
      brickHits: new Map(), paused: false, state: this.state, stateTimer: this.stateTimer,
    };
  }

  async init(): Promise<void> {
    await initSprites();
    const imported = checkLevelImport(this.gc);
    if (imported) { this.editor = imported; this.state = GameState.EDITOR; this.stateTimer = 0; }
    this.startLoop();
  }

  private startLoop(): void {
    let lastTime = performance.now(), accumulator = 0; const step = 1000 / FPS;
    const loop = (now: number) => {
      accumulator += now - lastTime; lastTime = now;
      if (accumulator > step * 5) accumulator = step * 5;
      while (accumulator >= step) { this.update(); accumulator -= step; }
      this.render(); requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private syncGps(): void { this.gps.state = this.state; this.gps.stateTimer = this.stateTimer; }
  private readGps(): void { this.state = this.gps.state; this.stateTimer = this.gps.stateTimer; }

  private runPlaying(): void {
    this.syncGps();
    updatePlaying(this.gps, {
      mario: this.mario, camera: this.camera, level: this.level,
      entityManager: this.entityManager, achievements: this.achievements,
      speedrun: this.speedrun, levelConfig: this.levelConfig, castle: this.castle,
      onStartFlagpole: () => this.startFlagpole(),
      onAdvanceLevel: () => this.advanceLevel(),
      onDie: () => { this.gps.state = GameState.DYING; this.gps.stateTimer = 0; },
    });
    this.readGps();
  }

  private update(): void {
    for (const code of ['KeyM', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract']) {
      if (input.justPressed(code)) this.volumeControl.handleKey(code);
    }
    this.accessibility.handleKeys((code: string) => input.justPressed(code), this.state, GameState.TITLE);
    if (this.accessibility.isRemapOpen || this.accessibility.isSettingsOpen) { input.update(); return; }
    this.achievements.update();
    if (input.justPressed('Tab')) this.achievements.toggleViewer();
    if (this.achievements.isViewerOpen) { input.update(); return; }
    if (this.transition.active) { this.transition.update(); input.update(); return; }
    if (input.justPressed('F1')) this.speedrun.toggle();
    if (input.justPressed('F2')) this.crtShader.toggle();
    if (input.justPressed('F9')) this.fpsCounter.toggle();
    if (this.state === GameState.PLAYING && (input.justPressed('KeyP') || input.justPressed('Escape') || input.gamepad.startPressed)) {
      this.gps.paused = !this.gps.paused;
      if (this.gps.paused) audio.pause();
    }
    if (this.gps.paused) { input.update(); return; }
    if (this.accessibility.shouldSkipUpdate()) { input.update(); return; }
    if (this.state === GameState.PLAYING) {
      if (input.justPressed('F5')) this.doSaveState();
      else if (input.justPressed('F8')) { const d = handleLoadState(this.saveStateManager); if (d) this.applyLoadedState(d); }
    }
    this.saveStateManager.updateToast();
    this.stateTimer++;
    switch (this.state) {
      case GameState.TITLE:
        if (input.justPressed('F10')) {
          this.editor = new LevelEditor(this.gc.canvas, this.gc.getScale());
          this.state = GameState.EDITOR; this.stateTimer = 0; break;
        }
        if (input.startPressed) {
          this.initAudio(); this.currentLevelId = '1-1';
          this.achievements.onGameStart();
          this.state = GameState.LEVEL_INTRO; this.stateTimer = 0;
          this.speedrun.startRun();
        }
        break;
      case GameState.LEVEL_INTRO:
        if (this.stateTimer > 150) {
          this.doStartLevel(this.currentLevelId);
          this.state = GameState.PLAYING; playLevelMusic(this.levelConfig);
        }
        break;
      case GameState.PLAYING: this.runPlaying(); break;
      case GameState.DYING:
        this.mario.update(input, this.level);
        if (this.stateTimer > 180) {
          if (this.mario.lives <= 0) {
            this.state = GameState.GAME_OVER; this.stateTimer = 0;
            audio.stopMusic(); audio.gameOver();
          } else { this.state = GameState.LEVEL_INTRO; this.stateTimer = 0; }
        }
        break;
      case GameState.GAME_OVER:
        if (this.stateTimer > 300) {
          this.state = GameState.TITLE; this.stateTimer = 0;
          this.mario.lives = 3; this.mario.score = 0; this.mario.coins = 0;
          this.currentLevelId = '1-1';
        }
        break;
      case GameState.WIN: this.updateWin(); break;
      case GameState.EDITOR: this.doUpdateEditor(); break;
    }
    input.update();
  }

  private startFlagpole(): void {
    const { flagX, castleX } = this.levelConfig.data;
    const relY = this.mario.y / TILE;
    this.mario.addScore(relY <= 5 ? SCORES.FLAGPOLE_TOP : relY <= 9 ? SCORES.FLAGPOLE_MID : SCORES.FLAGPOLE_LOW);
    this.achievements.onLevelComplete();
    this.winSeq.start(this.mario, flagX, castleX, this.gps.timer);
    this.gps.state = GameState.WIN; this.gps.stateTimer = 0;
  }

  private updateWin(): void {
    const r = this.winSeq.update(this.mario, this.camera, this.gps.timer);
    this.gps.timer = r.newTimer;
    if (r.scoreAdd > 0) this.mario.addScore(r.scoreAdd);
    if (r.finished && r.advanceLevel) this.advanceLevel();
    else if (r.finished) { this.state = GameState.TITLE; this.stateTimer = 0; }
  }

  private advanceLevel(): void {
    this.speedrun.recordSplit();
    const nextId = this.levelConfig.nextLevel;
    if (!nextId) { this.speedrun.finishRun(); this.state = GameState.TITLE; this.stateTimer = 0; return; }
    audio.stopMusic(); this.currentLevelId = nextId;
    const onDone = () => { this.state = GameState.LEVEL_INTRO; this.stateTimer = 0; this.transition.startFadeIn(); };
    if (this.levelConfig.music === 'underground') this.transition.startPipeEntry(this.mario.x, this.mario.y, 'up', onDone);
    else this.transition.startFadeOut(onDone);
  }

  private resetCastle(bowser: import('./entities/bowser.js').Bowser | null = null): void {
    this.castle = { bridgeCollapsing: false, bridgeCollapseCol: 0, bridgeCollapseTimer: 0, bridgeCollapseEnd: 0, toadMessageTimer: 0, showToadMessage: false, castleBowser: bowser };
  }

  private doStartLevel(levelId: string): void {
    const r = startLevel(levelId, this.mario, this.camera, this.renderer, this.speedrun, this.achievements);
    this.levelConfig = r.levelConfig; this.level = r.level;
    this.gps.entities = r.entities; this.gps.timer = LEVEL_TIME; this.gps.timerFrame = 0;
    this.gps.fireballCooldown = 0; this.gps.paused = false; this.gps.brickHits.clear();
    this.gps.prevMarioCoins = this.mario.coins; this.resetCastle(r.castleBowser);
  }

  private applyLoadedState(d: SaveStateData): void {
    const r = restoreSaveState(d, this.mario, this.camera, this.renderer);
    this.currentLevelId = d.currentLevelId;
    this.levelConfig = r.levelConfig; this.level = r.level;
    this.gps.entities = r.entities; this.resetCastle(r.castleBowser);
    this.gps.timer = d.timer; this.gps.timerFrame = d.timerFrame;
    this.gps.fireballCooldown = d.fireballCooldown; this.gps.brickHits.clear();
    for (const bh of d.brickHits) this.gps.brickHits.set(bh.key, bh.count);
    this.gps.globalFrame = d.globalFrame;
    this.gps.questionAnimFrame = d.questionAnimFrame; this.gps.questionAnimTimer = d.questionAnimTimer;
    this.gps.coinAnimFrame = d.coinAnimFrame; this.gps.coinAnimTimer = d.coinAnimTimer;
    this.state = GameState.PLAYING; this.gps.paused = false;
    audio.stopMusic();
    if (this.mario.starPower > 0) audio.playStarTheme(); else playLevelMusic(this.levelConfig);
  }

  private initAudio(): void {
    if (!this.audioInitialized) { audio.init(); this.volumeControl.applyToEngine(); this.audioInitialized = true; }
  }

  private doSaveState(): void {
    const g = this.gps;
    handleSaveState({
      currentLevelId: this.currentLevelId, mario: this.mario, entities: g.entities,
      camera: this.camera, level: this.level, timer: g.timer, timerFrame: g.timerFrame,
      fireballCooldown: g.fireballCooldown, brickHits: g.brickHits, globalFrame: g.globalFrame,
      questionAnimFrame: g.questionAnimFrame, questionAnimTimer: g.questionAnimTimer,
      coinAnimFrame: g.coinAnimFrame, coinAnimTimer: g.coinAnimTimer,
    }, this.saveStateManager);
  }

  private doUpdateEditor(): void {
    if (!this.editor) return;
    const r = updateEditor(this.editor, this.mario, this.camera, this.gc, () => this.initAudio(), () => this.runPlaying());
    if (r.destroyed) this.editor = null;
    if (r.newState !== undefined) { this.state = r.newState; this.stateTimer = r.stateTimer ?? 0; }
    if (r.levelConfig) this.levelConfig = r.levelConfig;
    if (r.level) this.level = r.level;
    if (r.entities) this.gps.entities = r.entities;
    if (r.timer !== undefined) this.gps.timer = r.timer;
    if (r.timerFrame !== undefined) this.gps.timerFrame = r.timerFrame;
    if (r.fireballCooldown !== undefined) this.gps.fireballCooldown = r.fireballCooldown;
    if (r.clearBrickHits) this.gps.brickHits.clear();
  }

  private render(): void {
    this.fpsCounter.beginFrame();
    switch (this.state) {
      case GameState.TITLE: drawTitleScreen(this.ctx, this.stateTimer); break;
      case GameState.LEVEL_INTRO: drawLevelIntro(this.ctx, this.currentLevelId, this.mario.lives); break;
      case GameState.GAME_OVER: drawGameOver(this.ctx); break;
      case GameState.EDITOR:
        if (this.editor && !this.editor.testPlaying) { this.editor.render(this.ctx); break; }
        // fall through for test-play rendering
      default: {
        const data = this.levelConfig.data;
        this.renderer.renderGame(
          this.camera, this.level, this.gps.entities, this.mario, sprites,
          { questionAnimFrame: this.gps.questionAnimFrame, coinAnimFrame: this.gps.coinAnimFrame, globalFrame: this.gps.globalFrame },
          data.scenery, this.gps.timer, this.levelConfig.bgColor,
        );
        if (this.state === GameState.WIN) {
          this.renderer.drawPoleFlag(this.camera, data.flagX, this.winSeq.flagY);
          this.renderer.drawCastleFlag(this.camera, data.castleX, this.winSeq.castleFlagY);
          if (this.winSeq.fireworks.length > 0) this.renderer.drawFireworks(this.camera, this.winSeq.fireworks);
        }
        if (this.castle.showToadMessage) {
          this.renderer.drawToadMessage(this.camera, 'THANK YOU HERO!', 94 * TILE + 8, 10 * TILE);
          this.ctx.fillStyle = '#FCFCFC'; this.ctx.font = '8px monospace'; this.ctx.textAlign = 'center';
          this.ctx.fillText('GREAT JOB!', this.camera.screenX(94 * TILE + 24), this.camera.screenY(8 * TILE));
          this.ctx.fillText('BUT THE QUEST CONTINUES!', this.camera.screenX(94 * TILE + 24), this.camera.screenY(8 * TILE + 12));
          this.ctx.textAlign = 'left';
        }
        this.accessibility.drawHighContrastOutlines(this.ctx, this.camera.x, this.gps.entities, this.mario);
        drawHUD(this.ctx, sprites, this.mario.score, this.mario.coins, this.currentLevelId, this.gps.timer, this.mario.lives);
        this.speedrun.renderGhost(this.ctx, this.camera.x);
        this.speedrun.render(this.ctx);
        break;
      }
    }
    const c = this.ctx; const jp = (code: string) => input.justPressed(code);
    this.transition.render(c);
    this.saveStateManager.drawToast(c, SCREEN_WIDTH, SCREEN_HEIGHT);
    if (this.gps.paused) {
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      c.font = '8px monospace'; c.fillStyle = '#FCFCFC';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('PAUSE', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    }
    this.achievements.render(c); this.volumeControl.renderOverlay(c);
    this.accessibility.renderSlowIndicator(c); this.accessibility.renderColorblindIndicator(c);
    this.accessibility.renderRemapOverlay(c, jp); this.accessibility.renderSettingsMenu(c, jp);
    this.fpsCounter.render(c); this.crtShader.apply(c, this.gc.canvas);
  }
}
