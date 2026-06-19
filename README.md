# Molt

> A 3D browser game about stepping out of your shell, and actually seeing the world.

In a city where everyone moves sealed inside a decorated exo-suit, you learn to *molt*:
shed the suit at will. **Suited**, you're fast and armored and you blend into the crowd,
but the world is muted gray and most of what's real stays invisible to you. **Bare**,
you're slow and exposed, but color, sound, hidden paths, and the true state of people and
things come flooding back. The whole game is the moment-to-moment question of when to wear
the shell and when to leave it.

This is its own game. It takes the universe-flavor (suits as masks, the quiet power of
presence, four recurring motifs) from a separate finished visual-novel project and builds
something new in that register: gentle, wistful, never cruel. Hope is intimate, not
societal. The world doesn't transform; your attention does.

Register references: Ghibli, Mushishi, A Short Hike, Kentucky Route Zero.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Build a static bundle (drop the `dist/` folder on any static host):

```bash
npm run build
npm run preview
```

Controls: **WASD** move · **Mouse** look (click the scene to capture the cursor, Esc to
release) · **Space** jump (double-jump while suited) · **Shift** dash (suited only) ·
**Q** molt (toggle the suit on/off).

## The core mechanic: the Shell

One instant toggle, a real trade-off both ways. The cost of being suited isn't a timer,
it's *perceptual*: you literally cannot see the solution.

| | Suited | Bare |
|---|---|---|
| Speed | fast + dash + double jump | slow, single jump |
| Hazards | armored, bull through | vulnerable (exposure drains in gusts) |
| Crowd | blends in | stands out |
| The world | desaturated, muffled, hidden geometry invisible | floods with color + sound, hidden platforms appear, "moments" become collectable |

Mastery is fluid switching mid-traversal. Speedrunners optimize the switches; the unhurried
linger bare and notice things. Both are first-class.

## Secondary mechanics

- **Moments** — glowing details only visible (and collectable) while bare. Slowing down to
  notice is mechanically rewarded. This is the thesis, made playable.
- **Hidden platforms** — stepping stones you can only see, and only stand on, while bare.
- **Gusts** — being bare in a gust drains *exposure*; empty it and you're forced back into
  the suit (a gentle reset, never a death).
- Planned: a **sticker / decoration** system with real gameplay effects + crowd-blend
  social currency; **rain** that amplifies bare-perception; the **hummed melody** as a
  collectable call-and-response; **ants** as a diegetic guidance system.

## Zones (a hub + 5, each its own palette and twist)

1. **The Trend Mile** — glossy promenade. Crowd-blend + the gap you cross differently
   suited vs bare. *(playable now — the vertical slice)*
2. **The Glasshouse** — rain-soaked atrium. Rain opens hidden water-routes. *(planned)*
3. **The Underhum** — service substrata. Trade your suit-light for the glow only stillness
   shows. *(planned)*
4. **The Gallery of Faces** — mirrored plaza. Wear the right face to pass, then take it off.
   *(planned)*
5. **The Open Field** — the edge of the city. No suit to help you. Just the air. *(planned)*

## Tech

- **React-Three-Fiber + Three.js + Vite + TypeScript** — good-looking 3D, ships static.
- **Rapier** (`@react-three/rapier`) — physics + character controller.
- **`@react-three/postprocessing`** — the suited↔bare flood (a custom desaturation grade +
  bloom) lives in `src/components/PostFX.tsx`.
- **Zustand** — game state (`src/game/store.ts`), progress persisted to localStorage.
- **Web Audio** (custom, `src/audio/audio.ts`) — procedural ambient score; the suit is a
  real low-pass filter that opens when you go bare; the hummed melody fades in with bareness.
  No audio files shipped.

Desktop packaging (later): wrap with **Tauri** for a small downloadable build.

## Layout

```
src/
  game/        store (zustand), input, shared per-frame refs (fx)
  audio/       procedural Web Audio engine
  zones/       zone metadata + The Trend Mile geometry
  components/  Game (Canvas), Player (controller + camera), PostFX, SceneRig,
               SkyDome, Particles, and the gameplay entities
  ui/          Title, LevelSelect, HUD, Complete
scripts/
  verify.mjs   headless puppeteer smoke-test (console errors + screenshots)
```

Adding a zone: add an entry to `src/zones/zones.ts`, build its geometry component (model
it on `TrendMile.tsx`), and wire it into `src/components/Game.tsx` with a palette config.

## Verify

```bash
npm run dev               # in one terminal
node scripts/verify.mjs   # loads the game headless, checks console errors, saves shots
```
