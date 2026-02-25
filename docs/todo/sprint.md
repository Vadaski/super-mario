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
| — | — | — | — | — |

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
| SMB-010 | Fix type safety | 2026-02-25 | Zero `as any`, tsc passes |
| SMB-011 | Refactor game.ts | 2026-02-25 | 827→292 lines, 3 modules, tsc clean |
| SMB-012 | Block bump animation | 2026-02-25 | Sine curve bump, 8 frames |
| SMB-013 | Flag & flagpole animation | 2026-02-25 | WinSequence class, 6 phases, fireworks |
| SMB-014 | Stomp combo scoring | 2026-02-25 | NES-accurate escalation, 1UP at 9th |
| SMB-015 | Pause functionality | 2026-02-25 | P/Esc toggle, overlay, reset on death |
| SMB-016 | Piranha proximity check | 2026-02-25 | 2-tile check, NES behavior |
| SMB-017 | Star power palette cycling | 2026-02-25 | CSS filter cycling, 4 palettes |
| SMB-018 | Shell breaks bricks | 2026-02-25 | Particles + 50pts, shell continues |
| SMB-020 | Level transition system | 2026-02-25 | Registry + TransitionManager, fade/pipe transitions |
| SMB-021 | World 1-2 underground | 2026-02-25 | 426 lines, dark palette, warp zone, ceiling |
| SMB-022 | World 1-3 athletic | 2026-02-25 | 298 lines, MovingPlatform, red Koopa, Paratroopa |
| SMB-023 | World 1-4 castle | 2026-02-25 | 228 lines, Bowser, FireBar, lava, bridge collapse |
| SMB-030 | Speedrun timer | 2026-02-25 | F1 toggle, splits, ghost replay, PB localStorage |
| SMB-031 | Gamepad support | 2026-02-25 | Gamepad API, Xbox/PS, analog stick, toast |
| SMB-032 | Save states | 2026-02-25 | F5/F8, 3 slots, full state serialization |
| SMB-033 | Sound controls | 2026-02-25 | M/+/-, speaker overlay, localStorage |
| SMB-034 | CRT shader effect | 2026-02-25 | F2, scanlines, distortion, bloom, vignette |
| SMB-035 | Responsive mobile UX | 2026-02-25 | Touch D-pad, CSS scaling, portrait warning |
| SMB-041 | Achievement system | 2026-02-25 | 10 trophies, toast, Tab viewer, localStorage |

## Backlog

### Phase 1: Foundation & Polish

| ID | Priority | Task | Description |
|----|----------|------|-------------|

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
