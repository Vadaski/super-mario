# Human Board

> Write instructions, feedback, or direction here. Auto-pilot reads this every cycle.
> Processed items are marked `[x]`, never deleted (may be summarized).

---

## Instructions (highest priority, immediate execution)
<!-- Auto-pilot executes these immediately, overriding sprint.md -->

## Feedback (incorporated into next decision)
<!-- Feedback on completed features, discovered issues -->

## Direction (long-term reference)

### Vision

This is not a "Mario clone." This is **the definitive browser-based Super Mario Bros. experience** — the project that makes people say "I can't believe this runs in a browser with zero dependencies."

Every pixel, every frame, every physics quirk of the 1985 NES original must be honored. Then we go beyond it, adding things Nintendo couldn't do with 1985 hardware, without ever betraying the soul of the game.

---

### Phase 1: Complete the NES Original (P0/P1)

#### 1.1 All Four Worlds of World 1

**World 1-1** (exists, needs polish):
- Block bump animation: when Mario hits a ? block or brick from below, the block visually jumps up 4px then settles back. Currently blocks just instantly change sprite. This small animation is the difference between "feels right" and "feels cheap."
- Flag animation: when Mario touches the flagpole, a green flag should slide DOWN the pole as Mario slides down. Currently there is no flag sprite at all.
- Fireworks at level end: the original game spawns 1, 3, or 6 fireworks after the flag based on the last digit of the timer (1/3/6 if digit is 1/3/6). Each firework = 500 points. This tiny detail rewards skilled play.
- Castle flag: after Mario enters the castle, a small flag rises on top of the castle. Then "Thank you Mario!" text is NOT shown in 1-1 (only 1-4 has Toad).

**World 1-2** (underground level):
- Pipe transition from 1-1: pipe #4 (the tall one at col 57) warps to 1-2. Mario enters the pipe with a descent animation (slides down into pipe over ~30 frames) with the pipe-entry sound effect.
- Underground tileset: dark background (#000), blue-gray bricks, different ground tiles. The underground palette is: background #000000, bricks #585898, ground #A4A4A4.
- Warp Zone: the famous secret above the ceiling near the end of 1-2. Three pipes labeled "WELCOME TO WARP ZONE!" with numbers 4, 3, 2 above each pipe. These warp to Worlds 2, 3, 4 — but for our scope, show the warp zone text and have the pipes be non-functional (or warp back to 1-1 as a loop).
- Coin heaven: the vine from one of the bricks leads to a bonus area above the clouds with rows of coins.
- Exit pipe at end of 1-2 leads back to the overworld (outdoors) for the final stretch to the flagpole.

**World 1-3** (athletic/bridge level):
- This is the "treetop" level — no ground at all, only platforms, moving lifts, and bridges.
- Moving platforms (lifts): horizontal and vertical moving platforms. Two types: (a) single platform moving on a fixed path, (b) balance platforms (two platforms on a pulley — standing on one makes it go down and the other go up). The balance platform is ICONIC.
- Koopa Paratroopas: Koopas with wings that bounce up and down in a sine wave pattern. When stomped, they lose wings and become regular Koopas.
- Red Koopas: unlike green Koopas, red Koopas turn around at platform edges instead of walking off. This means red Koopas patrol back and forth on their platform.
- Bullet Bill: the cannon enemy that fires horizontally across the screen. Cannons are placed on columns. Bill moves at constant speed, ignoring terrain. Can be stomped.
- The level has zero ground — falling off any platform = death. This creates tension.

**World 1-4** (castle/Bowser level):
- Castle tileset: dark gray stone background, fire bars, lava.
- Fire bars: rotating bars of fireballs that spin around a center block. Two types: clockwise and counter-clockwise. Each bar has 6 fireballs. They spin at a constant angular velocity. Mario takes damage on contact (unless star-powered).
- Lava: at the bottom of the screen instead of pits. Touching lava = instant death (like falling in a pit). Lava has a simple animated shimmer.
- Bowser: the boss at the end. Bowser stands on a bridge, moves left-right, jumps, and breathes fire (fireballs that travel in a slight arc). Two ways to defeat him: (a) hit him with 5 fireballs (if Fire Mario), (b) grab the axe behind him, which destroys the bridge and Bowser falls into lava. The axe is a hitbox at the end of the bridge.
- Bridge collapse: when the axe is touched, the bridge tiles disappear one by one from the axe side to Bowser's side (~2 tiles per frame). Bowser falls when the tile under him is gone. This is one of the most satisfying moments in gaming.
- Toad: after Bowser falls, Toad appears and says "THANK YOU MARIO! BUT OUR PRINCESS IS IN ANOTHER CASTLE!" (for worlds 1-4 through 7-4). Screen fades to black, then level intro for next world.
- "Fake" Bowser: in World 1, Bowser is actually a Goomba in disguise. If killed with fireballs, the Goomba is revealed (the sprite changes as he falls). This is a hidden detail most players never discover.

#### 1.2 Missing Mechanics for Existing Content

- **Stomp combo scoring**: consecutive stomps without touching ground should escalate: 100 → 200 → 400 → 800 → 1000 → 2000 → 4000 → 8000 → 1UP. The current code tracks `stompCombo` but doesn't use it for scoring. This rewards skillful play.
- **Koopa shell interactions**: when a kicked shell hits a wall and comes back, Mario should be able to re-stomp or re-kick it. Currently this partially works but needs testing/polish.
- **Piranha Plant hide behavior**: in the original, Piranha Plants will NOT emerge if Mario is standing directly next to or on top of their pipe. Current implementation doesn't check Mario proximity.
- **Star power palette cycling**: when Mario has star power, his sprite should cycle through different color palettes every 4 frames (normal → green → red → black → repeat). Currently just draws normally.
- **Invincibility star music**: the star theme already exists and plays, but needs to smoothly resume the overworld theme when star power ends (with proper crossfade, not an abrupt cut).

---

### Phase 2: NES Authenticity Details (P1/P2)

These details are what separate "a game" from "a love letter":

- **Sub-pixel rendering**: the NES tracked positions in 256ths of a pixel internally. Our physics already uses floats, but rendering should `Math.round()` only at draw time (currently correct, verify it stays this way).
- **Block bump animation**: blocks bounce up 4px over 4 frames, then return. Use a `bumpTimer` on the Level class tracking which blocks are currently bumping. Draw them at `y - bumpOffset`.
- **Coin spin from blocks**: when a coin pops out of a ? block, it should spin (4-frame animation) while rising, then arc back down. Current `CoinPopup` does this but verify the arc height matches original (~3 tiles up).
- **Enemy stomp flattening**: Goomba flatten animation should last exactly 30 frames (0.5 seconds). Done - verify timing.
- **Kicked shell should destroy bricks**: a moving shell that hits a brick should break it (just like big Mario). This creates chain reactions that are deeply satisfying.
- **Power-up emergence**: mushrooms/stars should emerge from blocks slowly (rise over ~16 frames = 1 full tile height), then start moving. Current implementation does this - verify smoothness.
- **Mario's acceleration curves**: the original has specific acceleration values based on whether Mario is on ground vs. air, walking vs. running, and current speed. Our constants are close but should be verified against disassembly data.
- **Pause functionality**: pressing P or Escape should pause the game with a "PAUSE" text overlay and freeze all game logic. The pause sound effect is a single short tone.
- **Score display**: when Mario gets points, the score number (100, 200, etc.) should float up from the source for ~1 second then disappear. Current `ScorePopup` does this. Ensure the font matches NES pixel style.

---

### Phase 3: Modern Enhancements (P2/P3)

These features go beyond the NES but respect its spirit:

#### 3.1 Speedrun Mode
- Toggle with a key (F1 or a menu option).
- Displays a high-precision timer (mm:ss.ms) in the HUD.
- Per-level split times that compare against your personal best.
- Saves best times to localStorage.
- Ghost replay: records Mario's position every frame. On next run, shows a semi-transparent "ghost Mario" running your previous best route. This turns solo play into a race.

#### 3.2 CRT Shader (Toggle with F2)
- Scanline effect: every other horizontal line is slightly darker.
- Slight barrel distortion (curved screen edges).
- Color bloom/bleed between adjacent pixels.
- Vignette (darker corners).
- Implement via a second canvas with post-processing, or a WebGL overlay if perf allows.
- Must be buttery smooth — if it drops below 60fps, auto-disable.

#### 3.3 Gamepad Support
- Standard Gamepad API: D-pad for movement, A for jump, B for run, Start for pause.
- Auto-detect gamepad connection, show a brief notification.
- Support both Xbox and PlayStation button layouts.
- Analog stick support with a dead zone.

#### 3.4 Save States
- Press F5 to save, F8 to load.
- Serializes the entire game state (Mario position/state, all entity positions, level tile state, timer, score, camera position) to a JSON blob in localStorage.
- Up to 3 save slots.
- Brief "State Saved" / "State Loaded" notification overlay.

#### 3.5 Sound Toggle & Volume
- M key toggles mute/unmute.
- +/- keys adjust volume.
- Show a small volume icon in the corner briefly when changed.
- Remember preference in localStorage.

#### 3.6 Responsive Design
- Canvas scales to fit the browser window while maintaining the exact 256:240 aspect ratio.
- On window resize, recalculate scale factor.
- Use CSS `image-rendering: pixelated` (already done) to keep sharp pixels at any zoom.
- On mobile: detect orientation, suggest landscape mode.
- Touch controls should have larger hit areas and visual feedback (button press glow).

#### 3.7 Performance
- Object pool for entities (reuse dead entity objects instead of GC).
- Offscreen tile culling (only draw visible tiles — already done, verify).
- Pre-render static tiles to an offscreen canvas, only redraw when camera moves.
- Profile and ensure consistent 60fps on mid-range phones.

---

### Phase 4: Extraordinary Features (P3)

These are what make people share the link:

#### 4.1 Level Editor
- Press F10 or select from a menu to enter editor mode.
- Grid-based tile placement: click to place, right-click to erase.
- Palette on the side: ground, brick, question, pipe, enemy spawns, etc.
- Test-play: press Enter in editor to instantly play your level.
- Export/Import: levels serialize to a compact base64 string. Share via URL parameter (`?level=abc123`).
- Example levels bundled: "Kaizo Light", "Speedrun Training", "All Power-ups".

#### 4.2 Achievement System
- "First Steps" — complete World 1-1
- "Underground Explorer" — find the warp zone in 1-2
- "No Coins Left Behind" — collect all coins in a level
- "Pacifist" — complete a level without stomping any enemy
- "Speed Demon" — complete 1-1 in under 40 seconds
- "Fire Power" — defeat Bowser with fireballs
- "One Life Wonder" — complete all 4 levels without dying
- Achievements display as brief toast notifications with NES-style pixel art icons.
- Stored in localStorage, viewable from a menu.

#### 4.3 Accessibility
- Colorblind modes: Deuteranopia, Protanopia, Tritanopia filters.
- Slow-motion mode: game runs at 50% speed for players who need more reaction time.
- High-contrast mode: bolder outlines on all sprites, brighter colors.
- Screen reader support for menus (aria labels on DOM overlays).
- Remappable controls.

---

### Architecture Principles

- **Zero dependencies** in production. This game loads as a single HTML file with bundled JS. No React. No Three.js. No Pixi. Pure Canvas 2D and Web Audio API. This is non-negotiable — it's part of the statement.
- **One file per concern**, max 300 lines. If a file grows beyond 300 lines, split it. The current `game.ts` at 827 lines MUST be refactored — extract rendering, entity management, and game state transitions into separate modules.
- **No `as any`**: every type cast is a bug waiting to happen. Replace `(this as any).__brickHits` with a proper `Map<string, number>` on the Game class. Replace `(mushroom as any).isOneUp` with a proper `isOneUp` field on the Mushroom class.
- **Const enums for everything**: tile types, entity types, game states, mario states — all const enums for zero-cost abstraction.
- **Physics values documented**: every magic number in constants.ts should have a comment explaining where it came from (NES disassembly, community wiki, or manual tuning).

---

### Sprint Priority Order

Execute in this order for maximum impact at each stage:

1. **Fix type safety** (SMB-010) — clean foundation first
2. **Refactor game.ts** — extract into manageable modules (rendering, entity manager, state machine)
3. **Block bump animation + flag animation** — instant visual polish
4. **Stomp combo scoring** — reward skilled play
5. **Pause functionality** — basic missing feature
6. **World 1-2** (underground + pipe transition)
7. **World 1-3** (moving platforms + new enemies)
8. **World 1-4** (castle + Bowser boss fight)
9. **Speedrun timer + ghost replay**
10. **CRT shader toggle**
11. **Gamepad support**
12. **Save states**
13. **Level editor**
14. **Achievement system**
15. **Accessibility features**
16. **Unit tests** (write tests alongside each feature, not as a separate task)
