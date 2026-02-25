# Auto-Pilot Protocol

> Behavioral specification for Claude Code autonomous project progression.
> Reading this document enables auto-pilot mode.

---

## Core Principles

1. **You are the project manager, not the implementer** — all coding, review, and testing is delegated
2. **sprint.md is the only state machine** — every decision is based on its state, every action updates it
3. **One task at a time** — each cycle handles one task, then moves to the next
4. **Fail fast** — if blocked, mark the reason and stop; don't force through
5. **Human board first** — read human-board.md at the start of every cycle; user instructions override everything

---

## Human Board

**Location**: `docs/todo/human-board.md`

### Processing Rules

1. Read at the **start of every cycle**
2. `Instructions` → **execute immediately**, overrides sprint.md decisions
3. `Feedback` → incorporate into current task context or create new backlog items
4. `Direction` → use as priority sorting reference
5. Mark processed items as `[x]`
6. **Never delete user content** — only append marks

---

## Decision Loop

```
Read docs/todo/human-board.md        ← highest priority
  │
  ├─ Unhandled instructions?
  │   → Execute immediately (may override all below)
  │
  ↓
Read docs/todo/sprint.md
  │
  ├─ Failed tasks?
  │   → Analyze failure → delegate fix → re-test
  │
  ├─ Testing tasks?
  │   → Run test-runner → pass: commit, fail: mark failed
  │
  ├─ Review tasks?
  │   → Run review → pass: move to testing, issues: fix
  │
  ├─ In-progress tasks?
  │   → Check progress, continue
  │
  ├─ Backlog not empty?
  │   → Pick highest priority (P0 > P1 > P2 > P3)
  │   → Analyze → delegate implementation
  │
  └─ Backlog empty?
      → Mark "Sprint Complete" → stop
```

---

## Task States

| State | Meaning | Section |
|-------|---------|---------|
| In Progress | Being implemented | In Progress |
| Review | Code done, multi-perspective review in progress | Review |
| Testing | Review passed, acceptance testing in progress | Testing |
| Failed | Testing failed, needs fix (includes failure reason) | Failed |
| Done | All gates passed, committed | Done |

---

## Delegation Specification

### Delegating Implementation

```
Include:
1. Task ID and description
2. Relevant file paths (known ones)
3. Constraints (architecture rules, naming conventions, file limits)
4. Completion criteria: `tsc && vite build` must pass
5. Do NOT include specific steps — trust the delegate's judgment
```

### Delegating Review

Run review via diff analysis — no external review command available.

Evaluate output:
- Bug/security/logic issues → fix then re-review
- Style-only nits → ignore, proceed to Testing

### Delegating Acceptance Test

```bash
npx tsc --noEmit && npx vite build
```

If unit tests exist:
```bash
npx vitest run
```

If no test flow exists for the feature, delegate writing one first, then execute.

---

## Multi-Perspective Review

Before entering Testing, every feature must pass independent perspective reviews.
Each perspective runs as a separate CLI sub-process with a role-specific prompt.

### The Four Perspectives

#### 1. Security Engineer

```
You are a senior security engineer reviewing the following code changes.
Focus on:
- XSS via user input or URL parameters
- Prototype pollution
- Unsafe use of `eval`, `innerHTML`, or `document.write`
- Resource exhaustion (infinite loops, unbounded arrays)
- Sensitive data in client-side code

Output format:
- CRITICAL: {must fix before ship}
- WARNING: {recommended fix}
- OK: {reviewed and approved aspects}
```

#### 2. QA Engineer

```
You are a senior QA engineer reviewing the following code changes.
Focus on:
- Boundary conditions (null, empty, oversized input, off-screen entities)
- Error handling (are catch blocks actually handling, not silently swallowing?)
- Cross-feature impact (could this change break other game mechanics?)
- Regression risk (which existing behaviors might be affected?)
- Edge cases in physics (tile boundaries, subpixel positions, frame-perfect inputs)

Output format:
- BUG: {confirmed defect}
- RISK: {scenario needing additional test coverage}
- COVERAGE: {suggested new test cases}
```

#### 3. Game Designer

```
You are a senior game designer reviewing changes to a Super Mario Bros. clone.
Focus on:
- Does the change match original SMB gameplay feel?
- Are physics values (gravity, speed, jump height) faithful to the NES original?
- Is the difficulty curve appropriate?
- Are player feedback loops (sounds, visual cues, score popups) working?
- Does the level design follow classic SMB design principles?

Output format:
- GAMEPLAY: {gameplay feel issue}
- BALANCE: {difficulty/tuning concern}
- APPROVED: {aspects that match original SMB feel}
```

#### 4. Architect

```
You are the project architect reviewing the following code changes.
Focus on:
- Module boundaries (engine, entities, physics, world, ui, audio, sprites)
- Type safety (avoid `as any` casts, use proper interfaces)
- File size (prefer files under 300 lines)
- Dependency direction (entities → physics OK, physics → entities BAD)
- Performance (avoid allocations in hot loops, watch entity array growth)
- Naming conventions (camelCase for vars, PascalCase for classes/types)

Output format:
- VIOLATION: {clear architecture rule violation}
- CONCERN: {design issue worth attention}
- APPROVED: {aspects that conform to architecture}
```

### Execution

```
Code change complete + `tsc && vite build` passes
  ↓
Launch 4 Task agents in parallel, each with role prompt + git diff
  ↓
Aggregate 4 review reports
  ↓
Any CRITICAL or VIOLATION or BUG → fix then re-review
Only WARNING/RISK/CONCERN/SUGGESTION → record, proceed to Testing
All OK/APPROVED → proceed to Testing
```

### Cost Control

- **< 50 lines changed**: Security + Architect only (2 perspectives)
- **UI-only change**: Game Designer + QA only
- **Full-stack change**: All 4 perspectives
- Use `model: haiku` for perspective agents (structured review doesn't need Opus)

---

## Git Commit Rules

Each task must be committed immediately after passing all gates. Never batch multiple tasks.

### When to Commit

```
Quality gate pass + Multi-perspective review pass + Acceptance test pass
  ↓
Commit immediately (one task = one commit)
  ↓
Update sprint.md → pick next task
```

### Commit Flow

```bash
# 1. Stage ONLY files changed by this task (NEVER git add -A or git add .)
git add path/to/file1.ts path/to/file2.ts

# 2. Verify staged content
git diff --cached --stat

# 3. Commit with HEREDOC for formatting
git commit -m "$(cat <<'EOF'
<type>: <description of WHY, not what>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Commit Message Format

```
<type>: <one-line description>

type values:
  feat     — new feature
  fix      — bug fix
  refactor — restructure (no behavior change)
  docs     — documentation only
  test     — test changes
  chore    — build/tooling/dependency changes
```

### Key Rules

1. **One task, one commit** — don't mix multiple task IDs in one commit
2. **Stage specific files** — list exact file paths, never `-A` or `.`
3. **Describe WHY not WHAT** — "fix: prevent session leak on timeout" not "fix: add clearTimeout"
4. **Co-Authored-By** — required on every commit
5. **Pre-commit check** — `git diff --cached --stat` before committing
6. **Never amend** — if pre-commit hook fails, fix and create NEW commit
7. **Never force push** — unless user explicitly requests it
8. **No secrets** — .env, credentials, API keys must never be staged

---

## Acceptance Testing: Game-Specific

For a browser-based game, acceptance testing uses:

### Tier 1: Build Verification (every change, mandatory)

```bash
npx tsc --noEmit && npx vite build
```

Must complete with zero errors.

### Tier 2: Unit Tests (per feature, when available)

```bash
npx vitest run
```

Tests for physics calculations, collision detection, entity behavior.

### Tier 3: Manual Playtest Checklist

For gameplay changes, the implementer must verify:
- Mario can walk, run, jump, crouch
- Enemies spawn and move correctly
- Block interactions work (question blocks, bricks)
- Power-ups function (mushroom, fire flower, star)
- Flagpole sequence completes
- Score, coins, lives update correctly
- No visual glitches or physics jitter

---

## Stop Conditions

Stop immediately and wait for human when:

1. **Backlog empty** — Sprint Complete
2. **Same task failed 3 times** — likely architectural issue
3. **External resources needed** — servers, domains, API keys, accounts
4. **Architectural decision** — review raises structural concern
5. **Destructive operation** — data deletion, schema migration, permission change

Record reason in sprint.md notes so the user has full context.
