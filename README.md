# Super Mario Bros. — Browser Edition

> A complete Super Mario Bros. recreation built entirely in the browser with TypeScript + Canvas 2D.
> **Zero runtime dependencies. 37 modules. 10,000 lines. 41KB gzipped.**
>
> **Built from a single wish using the [VA Wishing Engine](https://github.com/Vadaski/va-wish-engine) — a universal autonomous development protocol for any frontier model.**

## [Play Now](https://vadaski.github.io/super-mario/)

<p align="center">
  <a href="https://vadaski.github.io/super-mario/"><img src="https://img.shields.io/badge/Play_Now-vadaski.github.io/super--mario-E52521?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik04IDV2MTRMIDE5IDEyeiIvPjwvc3ZnPg==&logoColor=white" alt="Play Now" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Dependencies-0-brightgreen" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/Bundle-41KB_gzip-orange" alt="Bundle Size" />
</p>

---

## The VA Wishing Engine — One Wish, Full Autonomy

This project exists as a **showcase** for the [VA Wishing Engine](https://github.com/Vadaski/va-wish-engine) — a universal autonomous development protocol from the **VA Series**.

### What is the VA Wishing Engine?

The VA Wishing Engine is **not a plugin for any specific AI tool**. It's a **model-agnostic protocol** — a structured methodology that works with **any frontier model** (Claude, GPT, Gemini, or whatever comes next) to turn a single, vague wish into a fully autonomous development pipeline.

```
Input:  "完成你的理想，你的游戏梦"  (Complete your ideal, your game dream)
Output: 28 features, 37 modules, 10,000 lines, 4 levels — fully playable in the browser
```

### How It Works

The Wishing Engine is a **3-layer autonomous protocol**:

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Wish Decomposition                         │
│  "Build a game" → 28 structured tasks with           │
│  priorities, dependencies, and acceptance criteria    │
├─────────────────────────────────────────────────────┤
│  Layer 2: Multi-Agent Orchestration                  │
│  Orchestrator delegates to parallel sub-agents       │
│  (up to 7 concurrent), each in isolated workspace    │
├─────────────────────────────────────────────────────┤
│  Layer 3: Quality Gate & Integration                 │
│  Type check → Build → Review → Merge → Next task     │
└─────────────────────────────────────────────────────┘
```

**Key principle**: The orchestrating agent **never writes code**. It only plans, delegates, reviews, and integrates. The actual coding is done by sub-agents with clear briefs and isolated workspaces.

### Why It's Universal

The VA Wishing Engine doesn't depend on any specific model's API or tool ecosystem. It's built on:

- **A sprint board protocol** — A state machine (`Backlog → In Progress → Review → Testing → Done`) that any model can follow
- **Structured task decomposition** — Breaking wishes into prioritized, independent work units
- **Parallel delegation with isolation** — Sub-agents work in git worktrees (or any isolation mechanism) to avoid conflicts
- **Quality gates** — Automated verification (type check, build, test) after every integration

This means: **swap the model, keep the protocol, get the same results.** The Wishing Engine is the methodology, not the model.

### The Development Timeline of This Game

The entire project — from empty directory to playable game with 28 features — was completed in **one continuous session**:

| Phase | Tasks | Strategy | Parallelism |
|-------|-------|----------|-------------|
| Foundation | 9 tasks | Sequential | 1 agent (establish patterns) |
| New Levels | 4 tasks | Parallel | 3 agents (underground, athletic, castle) |
| Modern Features | 6 tasks | Parallel | **7 concurrent agents** |
| Extraordinary | 4 tasks | Parallel | 3 agents (editor, accessibility, perf) |

### What the Wishing Engine Did in This Project

1. **Analyzed the empty repo** — Detected TypeScript + Vite, no tests, no source code
2. **Generated 28 tasks across 4 phases** — Each with priority (P0-P3), description, and acceptance criteria
3. **Chose parallelization strategy** — Sequential for foundation (to establish patterns), then massively parallel for features
4. **Delegated with clear briefs** — Each sub-agent received: files to modify, constraints, completion criteria
5. **Resolved merge conflicts** — When 7 agents simultaneously modified `game.ts`, the orchestrator manually integrated each diff
6. **Quality-gated every step** — `tsc --noEmit` + `vite build` after every integration, zero tolerance for type errors

### Learn More / Use It Yourself

**[github.com/Vadaski/va-wish-engine](https://github.com/Vadaski/va-wish-engine)** — The VA Series Wishing Engine. Works with any frontier model. Give it a wish and watch it build.

---

## Game Features

### NES-Accurate Gameplay
- **Stomp combo scoring**: 100 → 200 → 400 → 800 → 1000 → 2000 → 4000 → 8000 → 1UP (9th+ consecutive stomp)
- **Piranha Plant proximity**: Won't emerge within 2 tiles of Mario (authentic NES behavior)
- **Star power palette cycling**: CSS filter cycling through 4 color palettes
- **Shell physics**: Kick shells into bricks for destruction + particle effects + 50pts + shell continues
- **Block bump animation**: Sine curve bump over 8 frames when hit from below
- **Win sequence**: 6-phase animation — flag slide → walk to castle → castle flag raise → fireworks → level complete

### Complete World 1 (4 Levels)
- **1-1 Overworld** — Hills, pipes, Goombas, Koopas, question blocks, the flagpole
- **1-2 Underground** — Dark palette, ceiling tiles, warp zone ("WELCOME TO WARP ZONE!")
- **1-3 Athletic** — Moving platforms, balance lifts, Red Koopas, Paratroopas
- **1-4 Castle** — Bowser boss AI, rotating fire bars, lava shimmer, axe + bridge collapse, Toad message

### 14 Modern Features

| Feature | Key | Description |
|---------|-----|-------------|
| Speedrun Timer | `F1` | mm:ss.ms splits, personal bests, **ghost replay** |
| CRT Shader | `F2` | Scanlines, barrel distortion, bloom, vignette |
| Colorblind Mode | `F3` | Protanopia / Deuteranopia / Tritanopia |
| Slow Motion | `F4` | 50% speed for accessibility |
| Save States | `F5`/`F8` | 3 slots, full state serialization |
| High Contrast | `F6` | Enhanced visibility mode |
| Key Remapping | `F7` | Fully customizable controls |
| FPS Counter | `F9` | Color-coded performance monitoring |
| Level Editor | `F10` | Grid placement, test-play, Base64 export/import |
| Achievements | `Tab` | 10 trophies with toast notifications |
| Volume | `M`/`+`/`-` | Mute toggle, volume control |
| Pause | `P`/`Esc` | Pause with overlay |
| Gamepad | Auto | Xbox/PS, analog stick, plug & play |
| Touch | Auto | Virtual D-pad, multi-touch, portrait warning |

---

## Technical Highlights

| Technique | What It Does |
|-----------|-------------|
| **Procedural sprites** | All graphics generated at runtime via Canvas 2D — zero image assets |
| **Web Audio synthesis** | Sound effects from oscillators — zero audio files |
| **Offscreen tile cache** | Pre-renders to offscreen canvas, only re-draws changed tiles |
| **Entity object pool** | Zero-allocation array compaction in the game loop — no GC pauses |
| **Const enums** | TypeScript const enums for zero-overhead type safety at runtime |

### The Numbers

| Metric | Value |
|--------|-------|
| TypeScript modules | 37 |
| Lines of code | ~10,000 |
| Production dependencies | **0** |
| Gzipped bundle | **41 KB** |
| Build time | 237ms |
| Autonomous tasks completed | 28 |

---

## Quick Start

```bash
git clone https://github.com/Vadaski/super-mario.git
cd super-mario
npm install
npm run dev
```

### Controls

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move | Arrow Keys / WASD | D-pad / Left Stick |
| Jump | Space / Z | A |
| Run / Fireball | Shift / X | B / X |
| Pause | P / Esc | Start |

---

## Architecture

```
src/
├── main.ts                    # Entry point
├── game.ts                    # Game orchestrator (~850 lines)
├── engine/                    # 13 engine modules
│   ├── camera.ts, canvas.ts, input.ts, renderer.ts
│   ├── entity-manager.ts, tile-cache.ts, object-pool.ts
│   ├── crt-shader.ts, save-states.ts, achievements.ts
│   ├── speedrun.ts, accessibility.ts, level-editor.ts
│   ├── fps-counter.ts, transitions.ts, win-sequence.ts
├── entities/                  # 5 entity modules
│   ├── mario.ts, entities.ts, bowser.ts
│   ├── fire-bar.ts, platforms.ts
├── world/                     # Level system
│   ├── level.ts, level-registry.ts
│   └── levels/ (1-1, 1-2, 1-3, 1-4)
├── physics/collision.ts       # AABB + stomp detection
├── sprites/sprites.ts         # Procedural sprite generation
├── audio/                     # Web Audio synthesis + volume
├── input/                     # Gamepad + touch controls
├── ui/hud.ts                  # Score, coins, timer display
└── utils/constants.ts         # Physics, colors, scoring
```

---

## License

MIT

---

<p align="center">
  <b>Built with the <a href="https://github.com/Vadaski/va-wish-engine">VA Wishing Engine</a></b><br/>
  <sub>One wish. Fully autonomous. Any frontier model.</sub><br/>
  <sub>37 modules | 0 dependencies | 41KB gzipped</sub>
</p>
