import {
  TILE, SCREEN_WIDTH, SCREEN_HEIGHT, COLORS, SCORES,
  GameState, MarioState, TileType, EntityType,
  LEVEL_TIME, FPS, STAR_DURATION,
} from './utils/constants.js';
import { GameCanvas } from './engine/canvas.js';
import { Camera } from './engine/camera.js';
import { input } from './engine/input.js';
import { Mario } from './entities/mario.js';
import {
  Goomba, Koopa, Shell, Mushroom, FireFlower, Star,
  Fireball, CoinPopup, BrickParticle, ScorePopup, Piranha,
  type Entity,
} from './entities/entities.js';
import { aabbOverlap, isStomping } from './physics/collision.js';
import { Level } from './world/level.js';
import { WORLD_1_1, blockContents } from './world/levels/world-1-1.js';
import { sprites, initSprites } from './sprites/sprites.js';
import { audio } from './audio/audio.js';
import { drawHUD, drawTitleScreen, drawLevelIntro, drawGameOver } from './ui/hud.js';

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

  constructor() {
    this.gc = new GameCanvas();
    this.ctx = this.gc.ctx;
    this.camera = new Camera(WORLD_1_1.width);
    this.mario = new Mario(WORLD_1_1.startX, WORLD_1_1.startY);
    this.level = new Level(WORLD_1_1, blockContents);
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

      // Cap accumulator to prevent spiral of death
      if (accumulator > step * 5) accumulator = step * 5;

      while (accumulator >= step) {
        this.update();
        accumulator -= step;
      }

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
    // Save old position for head-hit detection
    const oldVy = this.mario.vy;
    const oldY = this.mario.y;

    // Update Mario
    const wasOnGround = this.mario.onGround;
    this.mario.update(input, this.level);

    // Clamp Mario to camera left edge
    if (this.mario.x < this.camera.x + 2) {
      this.mario.x = this.camera.x + 2;
      this.mario.vx = Math.max(0, this.mario.vx);
    }

    // Jump sound
    if (!wasOnGround && this.mario.onGround) {
      this.mario.stompCombo = 0;
    }
    if (wasOnGround && !this.mario.onGround && this.mario.vy < 0) {
      audio.jump();
    }

    // Head hit detection
    this.checkHeadHits(oldVy);

    // Fireball shooting
    this.handleFireball();

    // Camera
    this.camera.update(this.mario.centerX, this.mario.y);

    // Activate entities near camera
    this.activateEntities();

    // Update entities
    for (const e of this.entities) {
      if (!e.alive || !e.active) continue;
      e.update(this.level);
    }

    // Check entity collisions
    this.checkEntityCollisions();

    // Cleanup dead entities
    this.entities = this.entities.filter(e => e.alive);

    // Timer
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

    // Animations
    this.questionAnimTimer++;
    if (this.questionAnimTimer >= 12) { this.questionAnimTimer = 0; this.questionAnimFrame = (this.questionAnimFrame + 1) % 3; }
    this.coinAnimTimer++;
    if (this.coinAnimTimer >= 8) { this.coinAnimTimer = 0; this.coinAnimFrame = (this.coinAnimFrame + 1) % 4; }

    // Fireball cooldown
    if (this.fireballCooldown > 0) this.fireballCooldown--;

    // Star power music
    if (this.mario.starPower === STAR_DURATION - 1) {
      audio.stopMusic();
      audio.playStarTheme();
    } else if (this.mario.starPower === 1) {
      audio.stopMusic();
      audio.playOverworldTheme();
    }

    // Death check
    if (this.mario.dying && this.state === GameState.PLAYING) {
      audio.stopMusic();
      audio.die();
      this.state = GameState.DYING;
      this.stateTimer = 0;
    }

    // Flagpole check
    if (!this.mario.onFlagpole && !this.mario.finishedLevel) {
      const flagCol = Math.floor(WORLD_1_1.flagX / TILE);
      if (Math.floor(this.mario.centerX / TILE) === flagCol &&
        this.mario.y < 12 * TILE) {
        this.startFlagpole();
      }
    }
  }

  private checkHeadHits(oldVy: number): void {
    // Check if Mario hit his head on a block
    if (oldVy >= 0 || this.mario.vy >= 0) return; // Must have been going up
    if (this.mario.vy !== 0) return; // Must have been stopped (hit something)

    // Check tiles above Mario's head
    const headRow = Math.floor(this.mario.y / TILE);
    const leftCol = Math.floor((this.mario.x + 2) / TILE);
    const rightCol = Math.floor((this.mario.x + this.mario.width - 2) / TILE);

    for (let col = leftCol; col <= rightCol; col++) {
      const tile = this.level.getTile(col, headRow);
      this.hitBlock(col, headRow, tile);
    }
  }

  private hitBlock(col: number, row: number, tile: number): void {
    if (tile === TileType.QUESTION) {
      const content = this.level.getBlockContent(col, row);
      this.level.setTile(col, row, TileType.QUESTION_EMPTY);
      this.level.removeBlockContent(col, row);
      this.spawnFromBlock(col, row, content || 'coin');
      audio.bump();
    } else if (tile === TileType.BRICK) {
      const content = this.level.getBlockContent(col, row);
      if (content === 'multi-coin') {
        // Multi-coin brick: gives coins until depleted
        this.spawnFromBlock(col, row, 'coin');
        // Remove after ~10 coins (simplified)
        const key = `${col},${row}`;
        const hitCount = (this.brickHits.get(key) || 0) + 1;
        this.brickHits.set(key, hitCount);
        if (hitCount >= 10) {
          this.level.setTile(col, row, TileType.QUESTION_EMPTY);
          this.level.removeBlockContent(col, row);
        }
        audio.bump();
      } else if (content) {
        this.level.setTile(col, row, TileType.QUESTION_EMPTY);
        this.level.removeBlockContent(col, row);
        this.spawnFromBlock(col, row, content);
        audio.bump();
      } else if (this.mario.isBig) {
        // Break brick
        this.level.setTile(col, row, TileType.EMPTY);
        this.spawnBrickParticles(col, row);
        audio.breakBlock();
        this.mario.addScore(50);
      } else {
        audio.bump();
      }
      // Bump enemies on top of the block
      this.bumpEnemiesAbove(col, row);
    } else if (tile === TileType.HIDDEN) {
      const content = this.level.getBlockContent(col, row);
      this.level.setTile(col, row, TileType.QUESTION_EMPTY);
      this.level.removeBlockContent(col, row);
      this.spawnFromBlock(col, row, content || 'coin');
      audio.bump();
    }
  }

  private spawnFromBlock(col: number, row: number, content: string): void {
    const x = col * TILE;
    const y = row * TILE;

    switch (content) {
      case 'coin':
        this.entities.push(new CoinPopup(x, y - TILE));
        this.mario.addCoin();
        audio.coin();
        this.entities.push(new ScorePopup(x, y - TILE, SCORES.QUESTION_COIN));
        break;
      case 'mushroom':
        if (this.mario.isSmall) {
          const m = new Mushroom(x, y - TILE);
          this.entities.push(m);
        } else {
          const f = new FireFlower(x, y - TILE);
          this.entities.push(f);
        }
        break;
      case 'fire-flower':
        if (this.mario.isSmall) {
          this.entities.push(new Mushroom(x, y - TILE));
        } else {
          this.entities.push(new FireFlower(x, y - TILE));
        }
        break;
      case 'star':
        this.entities.push(new Star(x, y - TILE));
        break;
      case '1up':
        const m = new Mushroom(x, y - TILE);
        m.isOneUp = true;
        this.entities.push(m);
        break;
    }
  }

  private spawnBrickParticles(col: number, row: number): void {
    const x = col * TILE;
    const y = row * TILE;
    this.entities.push(new BrickParticle(x, y, -1.5, -5));
    this.entities.push(new BrickParticle(x + 8, y, 1.5, -5));
    this.entities.push(new BrickParticle(x, y, -1, -3));
    this.entities.push(new BrickParticle(x + 8, y, 1, -3));
  }

  private bumpEnemiesAbove(col: number, row: number): void {
    const bx = col * TILE;
    const by = (row - 1) * TILE;
    for (const e of this.entities) {
      if (!e.alive || !e.active) continue;
      if (e.type === EntityType.GOOMBA || e.type === EntityType.KOOPA) {
        if (e.x + e.width > bx && e.x < bx + TILE && Math.abs(e.y + e.height - by - TILE) < 4) {
          // Kill enemy by bump
          e.alive = false;
          this.mario.addScore(SCORES.GOOMBA_STOMP);
          this.entities.push(new ScorePopup(e.x, e.y, SCORES.GOOMBA_STOMP));
        }
      }
    }
  }

  private handleFireball(): void {
    if (!this.mario.isFire || this.fireballCooldown > 0) return;
    if (input.run && input.justPressed('KeyZ') || input.justPressed('ShiftLeft') || input.justPressed('ShiftRight')) {
      // Count current fireballs
      const fbCount = this.entities.filter(e => e.type === EntityType.FIREBALL && e.alive).length;
      if (fbCount < 2) {
        const fbX = this.mario.facingRight ? this.mario.x + this.mario.width : this.mario.x - 8;
        const fbY = this.mario.y + 8;
        this.entities.push(new Fireball(fbX, fbY, this.mario.facingRight));
        audio.fireball();
        this.fireballCooldown = 10;
      }
    }
  }

  private activateEntities(): void {
    const activateX = this.camera.x + SCREEN_WIDTH + 32;
    for (const e of this.entities) {
      if (!e.active && e.x < activateX && e.x > this.camera.x - 32) {
        e.active = true;
      }
    }
  }

  private checkEntityCollisions(): void {
    const marioBox = {
      x: this.mario.x, y: this.mario.y,
      width: this.mario.width, height: this.mario.height,
      vx: this.mario.vx, vy: this.mario.vy,
    };

    for (const e of this.entities) {
      if (!e.alive || !e.active) continue;
      const eBox = { x: e.x, y: e.y, width: e.width, height: e.height, vx: e.vx, vy: e.vy };

      if (!aabbOverlap(marioBox, eBox)) continue;

      switch (e.type) {
        case EntityType.GOOMBA:
          this.handleGoombaCollision(e as Goomba);
          break;
        case EntityType.KOOPA:
          this.handleKoopaCollision(e as Koopa);
          break;
        case EntityType.SHELL:
          this.handleShellCollision(e as Shell);
          break;
        case EntityType.MUSHROOM:
          this.handleMushroomCollision(e as Mushroom);
          break;
        case EntityType.FIRE_FLOWER:
          e.alive = false;
          this.mario.powerUp();
          audio.powerUp();
          this.mario.addScore(SCORES.FIRE_FLOWER);
          this.entities.push(new ScorePopup(e.x, e.y, SCORES.FIRE_FLOWER));
          break;
        case EntityType.STAR:
          e.alive = false;
          this.mario.starPower = STAR_DURATION;
          audio.powerUp();
          this.mario.addScore(SCORES.STAR);
          this.entities.push(new ScorePopup(e.x, e.y, SCORES.STAR));
          break;
        case EntityType.PIRANHA:
          if (this.mario.starPower > 0) {
            e.alive = false;
          } else if (!this.mario.isInvincible) {
            const damaged = this.mario.takeDamage();
            if (damaged && !this.mario.dead) audio.powerDown();
          }
          break;
      }
    }

    // Fireball vs enemy collisions
    for (const fb of this.entities) {
      if (fb.type !== EntityType.FIREBALL || !fb.alive) continue;
      for (const e of this.entities) {
        if (!e.alive || !e.active) continue;
        if (e.type !== EntityType.GOOMBA && e.type !== EntityType.KOOPA && e.type !== EntityType.PIRANHA) continue;
        const fbBox = { x: fb.x, y: fb.y, width: fb.width, height: fb.height, vx: fb.vx, vy: fb.vy };
        const eBox = { x: e.x, y: e.y, width: e.width, height: e.height, vx: e.vx, vy: e.vy };
        if (aabbOverlap(fbBox, eBox)) {
          fb.alive = false;
          e.alive = false;
          audio.kick();
          this.mario.addScore(SCORES.SHELL_KILL);
          this.entities.push(new ScorePopup(e.x, e.y, SCORES.SHELL_KILL));
        }
      }
    }

    // Shell vs enemy collisions
    for (const sh of this.entities) {
      if (sh.type !== EntityType.SHELL || !sh.alive || !(sh as Shell).moving) continue;
      for (const e of this.entities) {
        if (!e.alive || !e.active || e === sh) continue;
        if (e.type !== EntityType.GOOMBA && e.type !== EntityType.KOOPA && e.type !== EntityType.SHELL) continue;
        const shBox = { x: sh.x, y: sh.y, width: sh.width, height: sh.height, vx: sh.vx, vy: sh.vy };
        const eBox = { x: e.x, y: e.y, width: e.width, height: e.height, vx: e.vx, vy: e.vy };
        if (aabbOverlap(shBox, eBox)) {
          e.alive = false;
          this.mario.addScore(SCORES.SHELL_KILL);
          this.entities.push(new ScorePopup(e.x, e.y, SCORES.SHELL_KILL));
        }
      }
    }
  }

  private handleGoombaCollision(goomba: Goomba): void {
    if (this.mario.starPower > 0) {
      goomba.alive = false;
      this.mario.addScore(SCORES.GOOMBA_STOMP);
      audio.kick();
      return;
    }
    if (isStomping(
      { x: this.mario.x, y: this.mario.y, width: this.mario.width, height: this.mario.height, vx: this.mario.vx, vy: this.mario.vy },
      { x: goomba.x, y: goomba.y, width: goomba.width, height: goomba.height, vx: goomba.vx, vy: goomba.vy },
    )) {
      goomba.stomp();
      this.mario.bounce();
      audio.stomp();
      this.mario.addScore(SCORES.GOOMBA_STOMP);
      this.entities.push(new ScorePopup(goomba.x, goomba.y, SCORES.GOOMBA_STOMP));
    } else {
      const damaged = this.mario.takeDamage();
      if (damaged && !this.mario.dead) audio.powerDown();
    }
  }

  private handleKoopaCollision(koopa: Koopa): void {
    if (this.mario.starPower > 0) {
      koopa.alive = false;
      this.mario.addScore(SCORES.KOOPA_STOMP);
      audio.kick();
      return;
    }
    if (isStomping(
      { x: this.mario.x, y: this.mario.y, width: this.mario.width, height: this.mario.height, vx: this.mario.vx, vy: this.mario.vy },
      { x: koopa.x, y: koopa.y, width: koopa.width, height: koopa.height, vx: koopa.vx, vy: koopa.vy },
    )) {
      koopa.alive = false;
      const shell = new Shell(koopa.x, koopa.y + 8);
      this.entities.push(shell);
      this.mario.bounce();
      audio.stomp();
      this.mario.addScore(SCORES.KOOPA_STOMP);
      this.entities.push(new ScorePopup(koopa.x, koopa.y, SCORES.KOOPA_STOMP));
    } else {
      const damaged = this.mario.takeDamage();
      if (damaged && !this.mario.dead) audio.powerDown();
    }
  }

  private handleShellCollision(shell: Shell): void {
    if (shell.moving) {
      if (this.mario.starPower > 0) {
        shell.alive = false;
        return;
      }
      // Moving shell hurts Mario
      if (isStomping(
        { x: this.mario.x, y: this.mario.y, width: this.mario.width, height: this.mario.height, vx: this.mario.vx, vy: this.mario.vy },
        { x: shell.x, y: shell.y, width: shell.width, height: shell.height, vx: shell.vx, vy: shell.vy },
      )) {
        // Stop the shell
        shell.moving = false;
        shell.vx = 0;
        this.mario.bounce();
      } else {
        const damaged = this.mario.takeDamage();
        if (damaged && !this.mario.dead) audio.powerDown();
      }
    } else {
      // Kick the shell
      const fromLeft = this.mario.centerX < shell.x + shell.width / 2;
      shell.kick(fromLeft);
      audio.kick();
    }
  }

  private handleMushroomCollision(mushroom: Mushroom): void {
    if (mushroom.isOneUp) {
      mushroom.alive = false;
      this.mario.lives++;
      audio.oneUp();
      this.entities.push(new ScorePopup(mushroom.x, mushroom.y, 0));
    } else {
      mushroom.alive = false;
      this.mario.powerUp();
      audio.powerUp();
      this.mario.addScore(SCORES.MUSHROOM);
      this.entities.push(new ScorePopup(mushroom.x, mushroom.y, SCORES.MUSHROOM));
    }
  }

  private startFlagpole(): void {
    this.mario.onFlagpole = true;
    this.mario.vx = 0;
    this.mario.vy = 0;
    this.mario.x = WORLD_1_1.flagX - 6;
    audio.stopMusic();
    audio.flagpole();

    // Score based on height
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
      // Slide down flagpole
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
      // Walk towards castle
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
      // Count down remaining time to score
      if (this.timer > 0) {
        this.timer -= 2;
        if (this.timer < 0) this.timer = 0;
        this.mario.addScore(100);
      } else if (this.stateTimer > 120) {
        // Return to title after a delay
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

    // Spawn enemies from level data
    for (const spawn of WORLD_1_1.entities) {
      switch (spawn.type) {
        case 'goomba':
          this.entities.push(new Goomba(spawn.x, spawn.y));
          break;
        case 'koopa':
          this.entities.push(new Koopa(spawn.x, spawn.y));
          break;
        case 'piranha':
          this.entities.push(new Piranha(spawn.x, spawn.y));
          break;
      }
    }
  }

  private initAudio(): void {
    if (!this.audioInitialized) {
      audio.init();
      this.audioInitialized = true;
    }
  }

  // ─── RENDERING ───

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
        this.renderGame();
        break;
    }
  }

  private renderGame(): void {
    // Sky background
    this.gc.clear(COLORS.SKY);

    // Scenery (behind tiles)
    this.renderScenery();

    // Tiles
    this.renderTiles();

    // Entities
    for (const e of this.entities) {
      if (!e.alive || !e.active) continue;
      if (!this.camera.isVisible(e.x, e.y, e.width, e.height)) continue;
      e.draw(this.ctx, sprites, this.camera);
    }

    // Mario
    if (!this.mario.dead || this.mario.dying) {
      this.mario.draw(this.ctx, sprites, this.camera);
    }

    // HUD (always on top)
    drawHUD(this.ctx, sprites, this.mario.score, this.mario.coins, '1-1', this.timer, this.mario.lives);
  }

  private renderTiles(): void {
    const startCol = Math.floor(this.camera.x / TILE);
    const endCol = Math.ceil((this.camera.x + SCREEN_WIDTH) / TILE);

    for (let row = 0; row < this.level.data.height; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = this.level.getTile(col, row);
        if (tile === TileType.EMPTY) continue;

        const sx = this.camera.screenX(col * TILE);
        const sy = this.camera.screenY(row * TILE);

        switch (tile) {
          case TileType.GROUND:
            sprites.draw(this.ctx, row === 13 ? 'ground-top' : 'ground', sx, sy);
            break;
          case TileType.BRICK:
            sprites.draw(this.ctx, 'brick', sx, sy);
            break;
          case TileType.QUESTION:
            sprites.draw(this.ctx, `question-${this.questionAnimFrame + 1}`, sx, sy);
            break;
          case TileType.QUESTION_EMPTY:
            sprites.draw(this.ctx, 'question-empty', sx, sy);
            break;
          case TileType.BLOCK:
            sprites.draw(this.ctx, 'block', sx, sy);
            break;
          case TileType.PIPE_TL:
            sprites.draw(this.ctx, 'pipe-top-left', sx, sy);
            break;
          case TileType.PIPE_TR:
            sprites.draw(this.ctx, 'pipe-top-right', sx, sy);
            break;
          case TileType.PIPE_BL:
            sprites.draw(this.ctx, 'pipe-left', sx, sy);
            break;
          case TileType.PIPE_BR:
            sprites.draw(this.ctx, 'pipe-right', sx, sy);
            break;
          case TileType.FLAGPOLE:
            // Draw pole
            this.ctx.fillStyle = COLORS.BUSH_GREEN;
            this.ctx.fillRect(sx + 7, sy, 2, TILE);
            break;
          case TileType.FLAGPOLE_TOP:
            // Draw ball on top
            this.ctx.fillStyle = COLORS.BUSH_GREEN;
            this.ctx.fillRect(sx + 5, sy + 2, 6, 6);
            this.ctx.fillRect(sx + 7, sy, 2, TILE);
            break;
          case TileType.CASTLE:
            sprites.draw(this.ctx, 'block', sx, sy); // Use block as castle tile
            break;
        }
      }
    }
  }

  private renderScenery(): void {
    for (const item of WORLD_1_1.scenery) {
      if (!this.camera.isVisible(item.x, item.y, 64, 48)) continue;
      const sx = this.camera.screenX(item.x);
      const sy = this.camera.screenY(item.y);

      switch (item.type) {
        case 'hill-large':
          this.drawHill(sx, sy, 80, 32);
          break;
        case 'hill-small':
          this.drawHill(sx, sy, 48, 16);
          break;
        case 'bush-large':
          this.drawBush(sx, sy, 48);
          break;
        case 'bush-small':
          this.drawBush(sx, sy, 32);
          break;
        case 'cloud':
          this.drawCloud(sx, sy);
          break;
      }
    }
  }

  private drawHill(x: number, y: number, width: number, height: number): void {
    this.ctx.fillStyle = COLORS.HILL_GREEN;
    // Simple triangle-ish hill
    const cx = x + width / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + height);
    this.ctx.lineTo(cx, y);
    this.ctx.lineTo(x + width, y + height);
    this.ctx.closePath();
    this.ctx.fill();
    // Highlight
    this.ctx.fillStyle = COLORS.HILL_LIGHT;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 2, y + 4);
    this.ctx.lineTo(cx + 2, y + 4);
    this.ctx.lineTo(cx, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawBush(x: number, y: number, width: number): void {
    this.ctx.fillStyle = COLORS.BUSH_GREEN;
    const h = 16;
    // Three circles for bush
    const r = h / 2;
    for (let i = 0; i < width; i += r) {
      this.ctx.beginPath();
      this.ctx.arc(x + r + i, y + r, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawCloud(x: number, y: number): void {
    this.ctx.fillStyle = COLORS.CLOUD_WHITE;
    // Three circles for cloud
    this.ctx.beginPath();
    this.ctx.arc(x + 12, y + 8, 8, 0, Math.PI * 2);
    this.ctx.arc(x + 24, y + 4, 10, 0, Math.PI * 2);
    this.ctx.arc(x + 36, y + 8, 8, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
