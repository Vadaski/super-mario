import { describe, it, expect } from 'vitest';
import {
  Goomba, Koopa, Shell, Mushroom, FireFlower, Star,
  Fireball, CoinPopup, CoinPickup, BrickParticle, ScorePopup, Piranha,
} from '../src/entities/entities.js';
import { GOOMBA_SPEED, KOOPA_SPEED, SHELL_SPEED, MUSHROOM_SPEED, FIREBALL_SPEED, GRAVITY, SCREEN_HEIGHT } from '../src/utils/constants.js';

// ---------------------------------------------------------------------------
// Minimal mock Level that has no solid tiles (open space).
// Entity update() methods call resolveMapCollision which calls level.isSolid().
// ---------------------------------------------------------------------------
function createOpenLevel() {
  return {
    isSolid: () => false,
    getTile: () => 0,
    setTile: () => {},
    getBlockContent: () => undefined,
  } as any;
}

/** A level with a solid floor at tile row `floorRow`. */
function createFloorLevel(floorRow: number) {
  return {
    isSolid: (_col: number, row: number) => row >= floorRow,
    getTile: () => 0,
    setTile: () => {},
    getBlockContent: () => undefined,
  } as any;
}

// ===========================================================================
// Goomba
// ===========================================================================
describe('Goomba', () => {
  it('initialises with correct defaults', () => {
    const g = new Goomba(100, 200);
    expect(g.x).toBe(100);
    expect(g.y).toBe(200);
    expect(g.vx).toBe(-GOOMBA_SPEED);
    expect(g.vy).toBe(0);
    expect(g.width).toBe(16);
    expect(g.height).toBe(16);
    expect(g.alive).toBe(true);
    expect(g.active).toBe(false);
    expect(g.flat).toBe(false);
  });

  it('applies gravity on update', () => {
    const g = new Goomba(100, 100);
    const level = createOpenLevel();
    g.update(level);
    // After one update, vy should have increased by GRAVITY
    expect(g.vy).toBeCloseTo(GRAVITY);
  });

  it('moves left by default', () => {
    const g = new Goomba(100, 100);
    const startX = g.x;
    const level = createOpenLevel();
    g.update(level);
    expect(g.x).toBeLessThan(startX);
  });

  it('stomp sets flat state and stops horizontal movement', () => {
    const g = new Goomba(100, 200);
    g.stomp();
    expect(g.flat).toBe(true);
    expect(g.vx).toBe(0);
    expect(g.flatTimer).toBe(30);
  });

  it('dies after flat timer expires', () => {
    const g = new Goomba(100, 200);
    g.stomp();
    const level = createOpenLevel();
    for (let i = 0; i < 30; i++) {
      g.update(level);
    }
    expect(g.alive).toBe(false);
  });

  it('dies when falling below the screen', () => {
    const g = new Goomba(100, SCREEN_HEIGHT + 33);
    const level = createOpenLevel();
    g.update(level);
    expect(g.alive).toBe(false);
  });

  it('increments animation timer on update', () => {
    const g = new Goomba(100, 100);
    const level = createOpenLevel();
    expect(g.timer).toBe(0);
    g.update(level);
    expect(g.timer).toBe(1);
    g.update(level);
    expect(g.timer).toBe(2);
  });
});

// ===========================================================================
// Koopa
// ===========================================================================
describe('Koopa', () => {
  it('initialises with correct defaults', () => {
    const k = new Koopa(100, 200);
    expect(k.x).toBe(100);
    expect(k.y).toBe(192); // constructor subtracts 8
    expect(k.vx).toBe(-KOOPA_SPEED);
    expect(k.width).toBe(16);
    expect(k.height).toBe(24);
    expect(k.alive).toBe(true);
    expect(k.winged).toBe(false);
  });

  it('winged Koopa bounces in sine wave without walking', () => {
    const k = new Koopa(100, 200);
    k.winged = true;
    k.wingBaseY = k.y;
    const level = createOpenLevel();
    const startX = k.x;
    for (let i = 0; i < 10; i++) k.update(level);
    // X should not change because winged Koopas don't walk
    expect(k.x).toBe(startX);
    // wingBounceY should have incremented
    expect(k.wingBounceY).toBe(10);
  });

  it('removeWings makes Koopa a regular Koopa', () => {
    const k = new Koopa(100, 200);
    k.winged = true;
    k.removeWings();
    expect(k.winged).toBe(false);
  });

  it('dies when falling below screen', () => {
    // Constructor does this.y = y - 8, so we need y - 8 > SCREEN_HEIGHT + 32
    // i.e. y > SCREEN_HEIGHT + 40
    const k = new Koopa(100, SCREEN_HEIGHT + 50);
    const level = createOpenLevel();
    k.update(level);
    expect(k.alive).toBe(false);
  });
});

// ===========================================================================
// Shell
// ===========================================================================
describe('Shell', () => {
  it('initialises stationary', () => {
    const s = new Shell(100, 200);
    expect(s.vx).toBe(0);
    expect(s.moving).toBe(false);
    expect(s.alive).toBe(true);
  });

  it('kick sets velocity and moving flag', () => {
    const s = new Shell(100, 200);
    s.kick(true); // kicked from the left
    expect(s.vx).toBe(SHELL_SPEED);
    expect(s.moving).toBe(true);
  });

  it('kick from right gives negative velocity', () => {
    const s = new Shell(100, 200);
    s.kick(false);
    expect(s.vx).toBe(-SHELL_SPEED);
    expect(s.moving).toBe(true);
  });

  it('increments shellTimer when stationary', () => {
    const s = new Shell(100, 200);
    const level = createOpenLevel();
    expect(s.shellTimer).toBe(0);
    s.update(level);
    expect(s.shellTimer).toBe(1);
  });

  it('does not increment shellTimer when moving', () => {
    const s = new Shell(100, 100);
    s.kick(true);
    const level = createOpenLevel();
    s.update(level);
    expect(s.shellTimer).toBe(0);
  });
});

// ===========================================================================
// Mushroom
// ===========================================================================
describe('Mushroom', () => {
  it('starts in emerging state below the block', () => {
    const m = new Mushroom(100, 200);
    expect(m.emerging).toBe(true);
    expect(m.y).toBe(216); // starts 16 px below emergeY
    expect(m.emergeY).toBe(200);
  });

  it('rises during emerging phase', () => {
    const m = new Mushroom(100, 200);
    const level = createOpenLevel();
    const startY = m.y;
    m.update(level);
    expect(m.y).toBe(startY - 1);
  });

  it('stops emerging once it reaches emergeY', () => {
    const m = new Mushroom(100, 200);
    const level = createOpenLevel();
    // Run 16 updates to fully emerge (moves 1px per frame, 16px to go)
    for (let i = 0; i < 16; i++) m.update(level);
    expect(m.emerging).toBe(false);
    expect(m.y).toBe(200);
  });

  it('moves right by default after emerging', () => {
    const m = new Mushroom(100, 200);
    expect(m.vx).toBe(MUSHROOM_SPEED);
  });
});

// ===========================================================================
// FireFlower
// ===========================================================================
describe('FireFlower', () => {
  it('starts in emerging state', () => {
    const f = new FireFlower(100, 200);
    expect(f.emerging).toBe(true);
    expect(f.vx).toBe(0); // doesn't move
  });

  it('does not move after emerging (stationary item)', () => {
    const f = new FireFlower(100, 200);
    const level = createOpenLevel();
    // Fully emerge
    for (let i = 0; i < 16; i++) f.update(level);
    expect(f.emerging).toBe(false);
    const xAfterEmerge = f.x;
    f.update(level);
    expect(f.x).toBe(xAfterEmerge);
  });

  it('animates frames after emerging', () => {
    const f = new FireFlower(100, 200);
    const level = createOpenLevel();
    for (let i = 0; i < 16; i++) f.update(level);
    expect(f.frame).toBe(0);
    // 4 more updates should change frame (frame cycles every 4 ticks)
    for (let i = 0; i < 4; i++) f.update(level);
    expect(f.frame).toBe(1);
  });
});

// ===========================================================================
// Star
// ===========================================================================
describe('Star', () => {
  it('starts emerging like other power-ups', () => {
    const s = new Star(100, 200);
    expect(s.emerging).toBe(true);
    expect(s.y).toBe(216);
  });

  it('has initial upward velocity for bouncing', () => {
    const s = new Star(100, 200);
    expect(s.vy).toBe(-4);
  });
});

// ===========================================================================
// Fireball
// ===========================================================================
describe('Fireball', () => {
  it('shoots right when goRight is true', () => {
    const fb = new Fireball(100, 100, true);
    expect(fb.vx).toBe(FIREBALL_SPEED);
    expect(fb.facingRight).toBe(true);
  });

  it('shoots left when goRight is false', () => {
    const fb = new Fireball(100, 100, false);
    expect(fb.vx).toBe(-FIREBALL_SPEED);
    expect(fb.facingRight).toBe(false);
  });

  it('has smaller hitbox than normal entities', () => {
    const fb = new Fireball(100, 100, true);
    expect(fb.width).toBe(8);
    expect(fb.height).toBe(8);
  });

  it('dies after exceeding bounce count', () => {
    const fb = new Fireball(100, 100, true);
    fb.bounceCount = 5; // > 4
    const level = createOpenLevel();
    fb.update(level);
    expect(fb.alive).toBe(false);
  });
});

// ===========================================================================
// CoinPopup
// ===========================================================================
describe('CoinPopup', () => {
  it('starts with upward velocity and dies when returning to start Y', () => {
    const c = new CoinPopup(100, 200);
    expect(c.vy).toBe(-6);
    expect(c.startY).toBe(200);
    const level = createOpenLevel();
    // Run until it comes back down
    let frames = 0;
    while (c.alive && frames < 200) {
      c.update(level);
      frames++;
    }
    expect(c.alive).toBe(false);
    expect(frames).toBeLessThan(200);
  });
});

// ===========================================================================
// CoinPickup
// ===========================================================================
describe('CoinPickup', () => {
  it('does not move (stationary floating coin)', () => {
    const c = new CoinPickup(100, 200);
    const level = createOpenLevel();
    c.update(level);
    expect(c.x).toBe(100);
    expect(c.y).toBe(200);
  });

  it('animates frames', () => {
    const c = new CoinPickup(100, 200);
    const level = createOpenLevel();
    for (let i = 0; i < 6; i++) c.update(level);
    expect(c.frame).toBe(1); // timer=6, floor(6/6) % 4 = 1
  });
});

// ===========================================================================
// BrickParticle
// ===========================================================================
describe('BrickParticle', () => {
  it('moves according to initial velocity', () => {
    const bp = new BrickParticle(100, 100, 2, -3);
    const level = createOpenLevel();
    bp.update(level);
    // update: x += vx, y += vy, vy += GRAVITY (gravity applied after position update)
    expect(bp.x).toBe(102);
    expect(bp.y).toBe(97);
    expect(bp.vy).toBeCloseTo(-3 + GRAVITY);
  });

  it('dies when falling below screen', () => {
    const bp = new BrickParticle(100, SCREEN_HEIGHT + 33, 0, 1);
    const level = createOpenLevel();
    bp.update(level);
    expect(bp.alive).toBe(false);
  });
});

// ===========================================================================
// ScorePopup
// ===========================================================================
describe('ScorePopup', () => {
  it('stores score text and floats upward', () => {
    const sp = new ScorePopup(100, 200, 100);
    expect(sp.text).toBe('100');
    const level = createOpenLevel();
    sp.update(level);
    expect(sp.y).toBe(199); // moves up by 1
  });

  it('accepts string score', () => {
    const sp = new ScorePopup(100, 200, '1UP');
    expect(sp.text).toBe('1UP');
  });

  it('dies after 40 frames', () => {
    const sp = new ScorePopup(100, 200, 200);
    const level = createOpenLevel();
    for (let i = 0; i < 40; i++) sp.update(level);
    expect(sp.timer).toBe(40);
    // timer > 40 is the check, so at 40 it's still alive, one more kills it
    sp.update(level);
    expect(sp.alive).toBe(false);
  });
});

// ===========================================================================
// Piranha
// ===========================================================================
describe('Piranha', () => {
  it('starts in hidden state below the pipe', () => {
    const p = new Piranha(100, 200);
    expect(p.state).toBe('hidden');
    expect(p.y).toBe(224); // baseY + 24
    expect(p.baseY).toBe(200);
  });

  it('does not emerge when Mario is too close', () => {
    const p = new Piranha(100, 200);
    p.marioX = 110; // within 32px
    p.active = true;
    const level = createOpenLevel();
    for (let i = 0; i < 100; i++) p.update(level);
    expect(p.state).toBe('hidden');
  });

  it('begins emerging when Mario is far enough away and timer expires', () => {
    const p = new Piranha(100, 200);
    p.marioX = 300; // far away
    p.active = true;
    const level = createOpenLevel();
    // Run 61 frames to trigger emerge (emergeTimer > 60)
    for (let i = 0; i < 61; i++) p.update(level);
    expect(p.state).toBe('emerging');
  });

  it('transitions through full lifecycle: hidden -> emerging -> visible -> retreating -> hidden', () => {
    const p = new Piranha(100, 200);
    p.marioX = 300;
    const level = createOpenLevel();

    // Phase 1: hidden for 61 frames
    for (let i = 0; i < 61; i++) p.update(level);
    expect(p.state).toBe('emerging');

    // Phase 2: emerging - moves 0.5 px/frame upward for 24px / 0.5 = 48 frames
    for (let i = 0; i < 48; i++) p.update(level);
    expect(p.state).toBe('visible');
    expect(p.y).toBe(200);

    // Phase 3: visible for 91 frames (retreatTimer > 90)
    for (let i = 0; i < 91; i++) p.update(level);
    expect(p.state).toBe('retreating');

    // Phase 4: retreating for 48 frames (24px / 0.5)
    for (let i = 0; i < 48; i++) p.update(level);
    expect(p.state).toBe('hidden');
    expect(p.y).toBe(224);
  });
});
