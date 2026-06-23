# Molt

A 3D puzzle platformer about precise movement. You run, jump, and dash through hand-built
zones, switching between two states (suited and bare) to cross gaps, reveal hidden paths,
and solve traversal puzzles. Suited you're fast and armored but the world is muted and some
geometry is invisible to you; bare you're slower and exposed but the world opens up, hidden
platforms appear, and collectible "moments" come into view. The whole game is the question
of *when* to wear the shell and when to step out of it.

Built in the world-flavor of a separate visual-novel project (suits as masks, the quiet
power of presence), but it stands on its own as a movement game. Register references:
A Short Hike, Mushishi, Kentucky Route Zero.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Static production build (drop `dist/` on any static host):

```bash
npm run build      # tsc -b && vite build
npm run preview
```

## Controls

| Action | Binding |
|---|---|
| Move | `W A S D` or arrow keys |
| Look / camera | click the game to capture the cursor, then move the mouse (Esc releases) |
| Jump | `Space` (double-jump while suited) |
| Dash | `Shift` (suited only, short cooldown) |
| Switch state (molt) | `Q` or `E` |
| Pause | `Esc` or `P` |
| Restart zone | `R` |
| Back to the map | `M`, or from the pause menu |

The intro and this controls list show on the title screen and from the pause menu (the
"Controls" button). The game is keyboard + mouse; no gamepad support yet.

## The core mechanic: the Shell

One toggle, a real trade-off both ways. The cost of being suited isn't a timer, it's that
you can't perceive the solution.

| | Suited | Bare |
|---|---|---|
| Speed | fast, plus dash and double-jump | slower, single jump |
| Hazards | armored, push through | vulnerable (exposure drains in gusts) |
| The world | desaturated, muffled, hidden geometry invisible | floods with color and sound, hidden platforms appear, "moments" become collectible |

### The transition is reversible (and not exploitable)

Pressing `Q` doesn't snap states, it drives a transition. Think of it as a normalized
progress value from `0` (bare) to `1` (suited):

- `Q` starts moving progress toward the opposite state, with a visible morph between the two
  looks (the suit assembles or sheds).
- Tap `Q` again mid-transition and it reverses smoothly from wherever it currently is. No
  snapping, no waiting for it to finish, no double-trigger weirdness.
- The committed state only flips when progress actually reaches an end (`0` or `1`).
  **Your gameplay abilities stay on the current committed state for the whole transition**,
  so you can't get a target state's powers early by half-toggling. The HUD shows the live
  percent and which ability set is active while you're mid-morph.

## Movement feel

The character uses Rapier's kinematic character controller with per-axis move-and-slide,
so movement is crisp and predictable:

- **Walls don't kill your jump.** Horizontal and vertical motion resolve independently. Bump
  a side wall while rising and you keep rising, sliding up the wall; only an actual ceiling
  stops upward motion and only the ground stops downward motion.
- Fairly strong gravity (little float), snappy jumps, instant horizontal response.
- Coyote time, a suited double-jump, and a suited dash burst (dashing keeps your vertical
  velocity, so you can dash across mid-air).
- No physics jitter, sticking, or launching against walls.

## Character and animation

The player is a small procedurally-animated rig (no external model files) with distinct
states: idle, walk/run (speed-blended), jump takeoff, airborne rise and fall, a landing
squash, and a victory pose on level complete. The two states are genuinely different
silhouettes, not a tint: **bare** is a lean, simple figure; **suited** is a bulkier armored
shell with a back pack and a glowing chest panel. They cross-fade as the Shell transition
plays.

## Secondary mechanics

- **Moments** — glowing collectibles only visible (and collectible) while bare. Slowing down
  to notice is rewarded.
- **Hidden platforms** — stepping stones you can only see, and only stand on, while bare.
- **Gusts** — being bare in a gust drains *exposure*; empty it and you're forced back into
  the suit (a gentle reset, never a death).
- **The color flood** — a custom postprocessing grade (desaturate + bloom) sells the suited
  vs bare shift; the suit is also a real audio low-pass filter that opens when you go bare,
  and a hummed melody fades in.
- Planned: a sticker/decoration system with real effects + crowd-blend, rain that boosts
  bare perception, the melody as a collectible, ants as diegetic guidance.

## Zones (a hub + 5, each its own palette and twist)

| Zone | Twist | Status |
|---|---|---|
| The Trend Mile | a checkpointed obby that teaches one trick at a time: weaving hops, a dash gap, a double-jump scaffold, a mid-air molt onto a hidden plank, a gust, and a spiralling climb to the goal | **playable** |
| The Glasshouse | a harder obby in the rain: the suit can't cross water, so you molt in mid-air onto bare-only water-routes, twice, the second time up on the high glass roof | **playable** |
| The Underhum | trade your suit-light for the glow only stillness shows | planned |
| The Gallery of Faces | wear the right face to pass, then take it off | planned |
| The Open Field | no suit to help you, just the air | planned |

## Tech stack

| Layer | Choice |
|---|---|
| 3D / rendering | [Three.js](https://threejs.org) `0.184` via [React-Three-Fiber](https://r3f.docs.pmnd.rs) `9` |
| Build / dev | [Vite](https://vite.dev) `8` + TypeScript `6` (ships as static files) |
| Physics | [Rapier](https://rapier.rs) via `@react-three/rapier` `2` (WASM), kinematic character controller |
| Post-processing | `@react-three/postprocessing` `3` / `postprocessing` `6` (custom desaturation grade + bloom) |
| State | [Zustand](https://zustand.docs.pmnd.rs) `5`, progress persisted to `localStorage` |
| Audio | Web Audio API, hand-written procedural engine (no audio files): ambient pad through a low-pass "suit filter" + a hummed melody |
| Tests | Puppeteer headless smoke + physics checks (`scripts/`) |

Everything renders from code and primitives, no external 3D models, textures, or audio
files. Surface textures (tile, panel, glass, water, soil) and their bump maps are generated
once to a canvas at load (`src/components/textures.ts`). Desktop packaging later: wrap with
Tauri for a small downloadable build.

## Project layout

```
src/
  game/        store (zustand: screens, suit transition, pause, run id),
               input (keyboard + pointer lock), shared per-frame refs (fx)
  audio/       procedural Web Audio engine
  zones/       zone metadata + The Trend Mile geometry
  components/  Game (Canvas), Player (kinematic controller + animated rig + camera),
               PostFX (the flood), SceneRig, SkyDome, Particles, gameplay entities
  ui/          TitleScreen (intro + controls), ControlsGuide, LevelSelect,
               HUD, PauseMenu, CompleteScreen
scripts/
  verify.mjs        headless smoke test (loads the game, checks console, saves shots)
  verify-wall.mjs   headless physics test for per-axis wall collision
```

Adding a zone: add an entry to `src/zones/zones.ts`, build its geometry component (model it
on `TrendMile.tsx`), and wire it into `src/components/Game.tsx` with a palette config. See
[docs/BUILDING_LEVELS.md](docs/BUILDING_LEVELS.md) for the full level-authoring guide
(entity APIs, movement budget, the two-state puzzle language, and the spawn/checkpoint
cleanup to do first).

## Verify

```bash
npm run dev               # one terminal
node scripts/verify.mjs   # smoke test + screenshots (shot-suited.png, shot-bare.png)
node scripts/verify-wall.mjs   # confirms jumping into a wall preserves vertical momentum
```
