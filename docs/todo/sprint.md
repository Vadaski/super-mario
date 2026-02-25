# Sprint Board

> Last updated: 2026-02-25 by Claude Code
>
> **Rules**:
> - Single source of truth for all agent work status
> - Only Claude Code moves task states
> - Task ID: `SMB-{3-digit number}`
> - Priority: P0(blocking) / P1(important) / P2(routine) / P3(optimization)
>
> **State flow**:
> ```
> Backlog → In Progress → Review → Testing → Done
>                ↑                     │
>                └──── Failed ←────────┘
> ```

---

## In Progress
| ID | Task | Owner | Started | Notes |
|----|------|-------|---------|-------|
| SMB-010 | Fix type safety | agent-1 | 2026-02-25 | Delegated to sub-agent |

## Failed
| ID | Task | Fail Count | Reason | Last Failed |
|----|------|-----------|--------|-------------|
| — | — | — | — | — |

## Review (Multi-Perspective)
| ID | Task | Implementer | Security | QA | Domain | Architect |
|----|------|------------|----------|-----|--------|-----------|
| — | — | — | — | — | — | — |

## Testing
| ID | Task | Test Flow | MUST Rate | SHOULD Rate |
|----|------|----------|-----------|-------------|
| — | — | — | — | — |

## Done
| ID | Task | Completed | Verification |
|----|------|-----------|-------------|
| — | — | — | — |

## Backlog

### Phase 1: Foundation & Polish

| ID | Priority | Task | Description |
|----|----------|------|-------------|
| SMB-010 | P0 | Fix type safety | Replace all `as any` casts: `__brickHits` → `Map<string,number>` on Game, `isOneUp` → proper field on Mushroom. Zero `as any` policy. |
| SMB-011 | P0 | Refactor game.ts | Split 827-line game.ts into modules: `GameRenderer` (tile/scenery/entity drawing), `EntityManager` (spawn, activate, cleanup, collision), `GameStateMachine` (title/playing/dying/win transitions). Max 300 lines per file. |
| SMB-012 | P1 | Block bump animation | When Mario hits a block from below, the block visually bounces up 4px over 4 frames then returns. Track `bumpTimer` per block position. Applies to ? blocks, bricks, and hidden blocks. |
| SMB-013 | P1 | Flag & flagpole animation | Add flag sprite that slides DOWN the pole as Mario slides down. Add castle flag that rises after Mario enters castle. Implement fireworks (1/3/6 based on timer last digit, 500pts each). |
| SMB-014 | P1 | Stomp combo scoring | Use `stompCombo` counter to escalate scores: 100→200→400→800→1000→2000→4000→8000→1UP. Reset combo when Mario touches ground. |
| SMB-015 | P1 | Pause functionality | P or Escape pauses game. Freeze all logic, show "PAUSE" overlay, play pause SFX. Resume on same key. |
| SMB-016 | P1 | Piranha proximity check | Piranha Plants should not emerge if Mario is standing directly adjacent to or on top of their pipe (within 2 tiles horizontally). Match NES behavior. |
| SMB-017 | P1 | Star power palette cycling | During star power, cycle Mario's sprite palette every 4 frames: normal→green→red→black→repeat. Implement via color replacement at draw time. |
| SMB-018 | P1 | Shell breaks bricks | A moving shell that hits a brick tile should break it (set to EMPTY, spawn BrickParticles). This enables chain reactions. |

### Phase 2: New Levels

| ID | Priority | Task | Description |
|----|----------|------|-------------|
| SMB-020 | P1 | Level transition system | Implement pipe-entry animation (Mario slides down into pipe over 30 frames), screen transition (fade/iris), and level loading. Support overworld↔underground↔bonus area transitions. |
| SMB-021 | P1 | World 1-2 (underground) | Full underground level: dark palette (#000 bg, #585898 bricks), ceiling, underground layout matching NES original. Include warp zone area (3 pipes with "WELCOME TO WARP ZONE!" text). Exit pipe returns to overworld for flagpole. |
| SMB-022 | P1 | World 1-3 (athletic) | Treetop/bridge level with no ground. Implement: moving platforms (horizontal/vertical), balance lifts (pulley platforms), Koopa Paratroopas (winged bouncing Koopas), red Koopas (turn at edges). |
| SMB-023 | P1 | World 1-4 (castle) | Castle level: gray stone tileset, lava at bottom (instant death + shimmer animation), fire bars (rotating fireball chains, CW/CCW), Bowser boss (walk/jump/breathe fire pattern), axe + bridge collapse, Toad message. |
| SMB-024 | P2 | Coin heaven bonus area | Accessible via vine from certain bricks. Cloud-level area above the main level filled with coin rows. Auto-scrolling. Exit drops Mario back to main level. |
| SMB-025 | P2 | Red Koopa & Paratroopa entities | Red Koopa: turns at platform edges (checks if next tile is empty below). Paratroopa: Koopa with wings, bounces in sine wave, loses wings when stomped → becomes regular Koopa. |

### Phase 3: Modern Features

| ID | Priority | Task | Description |
|----|----------|------|-------------|
| SMB-030 | P2 | Speedrun timer | Toggle with F1. Shows mm:ss.ms timer. Per-level splits. Personal bests in localStorage. Ghost replay: record Mario position each frame, show transparent ghost on next run. |
| SMB-031 | P2 | Gamepad support | Standard Gamepad API. D-pad=move, A=jump, B=run, Start=pause. Auto-detect connection. Support Xbox/PS layouts. Analog stick with dead zone. |
| SMB-032 | P2 | Save states | F5=save, F8=load. Serialize full game state (Mario, entities, tiles, timer, score, camera) to localStorage JSON. 3 slots. Brief toast notification on save/load. |
| SMB-033 | P2 | Sound controls | M=mute toggle, +/-=volume. Small volume icon overlay. Remember preference in localStorage. |
| SMB-034 | P2 | CRT shader effect | Toggle with F2. Scanlines, barrel distortion, color bloom, vignette. Via second canvas post-processing. Auto-disable if FPS drops below 55. |
| SMB-035 | P3 | Responsive mobile UX | Detect orientation, suggest landscape. Larger touch hit areas. Button press glow feedback. Scale canvas perfectly to viewport. |

### Phase 4: Extraordinary

| ID | Priority | Task | Description |
|----|----------|------|-------------|
| SMB-040 | P3 | Level editor | F10 to enter editor. Grid-based tile/enemy placement. Side palette. Test-play with Enter. Export to base64 URL param. Import via ?level= query string. |
| SMB-041 | P3 | Achievement system | 8+ achievements (First Steps, Underground Explorer, No Coins Left Behind, Pacifist, Speed Demon, Fire Power, One Life Wonder, etc). Toast notifications. localStorage persistence. Menu viewer. |
| SMB-042 | P3 | Accessibility | Colorblind filters (3 types), slow-motion mode (50% speed), high-contrast mode, remappable controls. Stored in settings menu. |
| SMB-043 | P3 | Performance optimization | Entity object pool, offscreen tile cache canvas, minimize GC in hot loop. Profile on mid-range mobile. Target rock-solid 60fps. |
