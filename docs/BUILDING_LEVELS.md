# Molt, handoff: building new levels (zones)

This doc is for a fresh chat whose job is to add new playable zones to Molt. Read
[../README.md](../README.md) first for the big picture, then this for the how. Molt is a
**3D puzzle platformer**: the player runs/jumps/dashes and toggles between **suited** and
**bare** states to solve traversal puzzles. Treat it as a game-feel project first.

The vertical-slice zone, `The Trend Mile`, is the reference implementation. Copy its shape.

## Run / verify / deploy

```bash
npm install
npm run dev                    # http://localhost:5173
npm run build                  # tsc -b && vite build (STRICT: unused vars fail the build)
node scripts/verify.mjs        # headless smoke test + screenshots (shot-suited.png, shot-bare.png)
node scripts/verify-wall.mjs   # headless physics check (per-axis wall collision)
node scripts/verify-reach.mjs  # plays Trend Mile's hardest jumps for real (dash gap, step-up, respawn)
node scripts/verify-glasshouse.mjs  # smoke + the bare-only water-route twist (a per-zone template)
```

- Repo is `mutms7/Molt`, branch `main`. Vercel auto-deploys `main`.
- To push, the **mutms7** account must be active in gh:
  `gh auth switch --user mutms7` → `git push` → (optionally `gh auth switch --user wchenyinmethod`).
- Do **not** touch the separate visual-novel repo at `../visualnovel` ("The Air Outside").
- Always keep it runnable; run `npm run build` before committing (it type-checks).

## How a zone is wired (4 touch points)

A zone is plain data + a geometry component. To add one (example: `glasshouse`):

1. **`src/zones/zones.ts`** — the zone already exists as `status: 'soon'`. Flip it to
   `status: 'play'` and set `next` if it chains to another zone. (`id`, `idx`, `name`,
   `tag`, `twist`, `colors` drive the level-select card.)

2. **`src/zones/Glasshouse.tsx`** — the geometry component. Model it exactly on
   [../src/zones/TrendMile.tsx](../src/zones/TrendMile.tsx): arrays of pieces mapped to
   entity components, wrapped in a `<group>`. **It must set the moment count on mount:**
   ```tsx
   useEffect(() => { useGame.setState({ totalMoments: MOMENTS.length, moments: 0 }) }, [])
   ```

3. **`src/components/Game.tsx`** — add a palette + spawn/respawn entry to `CFG` and render
   the zone (see the `Cfg` type for the full shape, incl. `killY`/`checkpoints` above):
   ```tsx
   const CFG = {
     'glasshouse': {
       skyTop:'#1d9e75', skyBottom:'#c2d9db', fog:'#bcd6d4', sun:'#eafff6',
       spawn:[0,1.4,8], killY:-4, checkpoints:[/* ... */],
     },
   }
   // ...inside <Physics>:
   {zoneId === 'glasshouse' && <Glasshouse />}
   ```

4. **Moment count** is now a single source: `MOMENT_COUNT` in
   [../src/zones/zones.ts](../src/zones/zones.ts), imported by `LevelSelect` and
   `CompleteScreen`. Add your zone's count there (keep it in sync with the zone's `MOMENTS`
   array). The zone's `useEffect` is still the source of truth for the live HUD; this map
   only seeds the count passed to `startZone`/replay.

**Unlocking:** a zone shows as playable only if `status: 'play'` AND its `id` is in the
store's `unlocked[]`. Finishing a zone calls `completeZone(zoneId, nextId)` (from `Goal`),
which adds `nextId` to `unlocked`. For testing a zone directly, either add its id to the
default `unlocked` in [../src/game/store.ts](../src/game/store.ts) or clear localStorage
(key `molt-progress`) after wiring. Progress is persisted, so re-test in a fresh profile or
clear that key when unlock logic changes.

## ✅ Done: spawn / checkpoint / kill-plane are per-zone config

This used to be hardcoded to Trend Mile in `Player.tsx`. It now lives in each `CFG` entry in
[../src/components/Game.tsx](../src/components/Game.tsx) and is passed into `<Player />`:

```ts
spawn: [x, y, z],
killY: -4,                                   // fall below this -> respawn to last checkpoint
checkpoints: [                               // arm in order as the player advances
  { when: (p) => p.z < -6, at: [0, 1.6, -7] },
  { when: (p) => p.z < -23, at: [0, 1.6, -26] },
],
```

`Player.tsx` exports the `Checkpoint` type, seeds the checkpoint to `spawn` on mount (the
default), and each frame arms the next checkpoint whose `when(pos)` is true. Just author the
two fields per zone; no Player edits needed.

## Coordinate & scale conventions

- Y is up. Units are meters-ish.
- A floor `Slab` at `pos.y = -0.25` with `size.y = 0.5` has its **top at y = 0**. Most
  Trend Mile floors use this, so "ground level" is y = 0.
- Player capsule: radius `0.4`, half-height `0.5`; the body origin sits ~`0.9` above the
  feet. **Spawn** with y ≈ floorTop + 1.0 (Trend Mile uses `[0, 1.4, 8]`).
- Collectibles sit at y ≈ floorTop + 1 so they float at chest height.
- `Goal` triggers on horizontal distance < 2.0 and player y > `pos.y - 0.6`.

## Movement budget (design solvable jumps with these)

From `Player.tsx` constants: `GRAVITY = -52`, suited `{speed 9, jump 15, double-jump}`,
bare `{speed 5.5, jump 12.5, single}`, dash `24 u/s for 0.2s` (suited only), coyote `0.1s`.

Practical reach (use as ceilings, leave margin):

| | up (height) | flat gap |
|---|---|---|
| Bare (single jump) | ~1.3 m | ~2.5 m |
| Suited (single jump) | ~2.0 m | ~5 m |
| Suited (double jump) | ~3.5 m | wide |
| Suited dash-jump | ~2 m | ~6–7 m |

So: a ~6 m gap is crossable suited (dash-jump) but not bare (the Trend Mile dash gap,
z -8..-14, is exactly this, and forces the suit). A gap wider than a dash-jump (~8 m+) has
*no* suited answer, so a bare-only `HiddenPlatform` walkway is the only way over (the Trend
Mile stone crossing at z -23..-31, and both of the Glasshouse water-routes). Bridge such a
gap with overlapping stones (spacing < depth) so the bare player walks rather than
pixel-jumps. Steps ~0.85 m tall are climbable by both; a ~1.7 m step forces the suit (bare
tops out near 1.3 m). Lips ≤ 0.3 m are auto-stepped (no jump needed).

## The two-state design language

This is the heart of every puzzle. Suited and bare must each be the *only* answer to
different obstacles, so the player is rewarded for switching at the right moment.

- **Suited**: fast, dash, double-jump, armored (push through gusts), but the world is
  desaturated and **bare-only geometry is invisible and non-solid**.
- **Bare**: slow, single jump, fragile (exposure drains in gusts), but **sees and can stand
  on hidden platforms**, sees collectible "moments", and reads true state.

Puzzle patterns that work:
- **Perception gate**: a route only visible/solid while bare (`HiddenPlatform`) past a gap
  only crossable while suited (dash-jump). Forces a mid-air-adjacent state plan.
- **Power gate**: a tall wall or wide gap that needs the suited double-jump/dash.
- **Hazard gate**: a `GustZone` over a ledge holding a moment, so going bare there is a
  risk/reward (exposure drains; empty = forced re-suit, a gentle reset, never death).
- **Alternation**: chain segments that require suited, then bare, then suited, so the player
  toggles in flow. Keep the suit-transition cost in mind (see below).

Note on the transition: pressing `Q` drives a reversible morph (`suitProgress` 0→1).
Abilities only switch at the committed ends (0 or 1), so a half-toggle gives nothing. Don't
design puzzles that require ability access mid-morph.

## Level shape: a checkpointed obby

Zones are obbies now: courses of discrete floating platforms with real jumps, weaving
left/right and climbing/dropping toward a goal that is **up high and off to the side**, not
at the end of a straight hallway. Each segment introduces or escalates one trick and starts
with a checkpoint, so a fall costs one segment, never the whole run. The two playable zones
are the template:

- **The Trend Mile** (the tutorial): weaving hops (jump) → **CP1** → a 5.5 m gap (dash or
  double-jump) → **CP2/3** a +x scaffold reached by a double-jump, then a drop and a -x gap
  → **CP4** launch suited and *molt to bare in mid-air* to land on a hidden plank → **CP5**
  a gust ledge, then a spiralling tower climb (double-jumps) to the goal.
- **The Glasshouse** (escalation): a dash recap → **CP1** a mid-air molt onto the flooded
  nave, crossing a rain **gust** on the water-route before it re-suits you → **CP2** climb
  +x onto the glass roof → **CP3** a *second*, elevated mid-air molt onto a roof water-route
  → **CP4** the high far bank and the goal.

Design jumps to the movement budget above and **leave margin** (the shipped gaps sit well
under the max). Variety is the point: mix small precise hops, dash gaps, double-jump
up-and-overs, drops, and direction changes (`+x`, `-x`, `-z`, up). The signature advanced
beat is the **mid-air molt**: a gap only a *suited* launch can clear, landing on a
bare-only `HiddenPlatform`, so you must start the morph in the air to land solid (the morph
is ~0.4 s; a suited jump gives enough airtime).

Checkpoints arm in order and never un-arm (monotonic), so list them front-to-back and put
each `at` on a **solid** platform that opens the next segment (never on a bare-only plank, or
a re-suit could respawn you mid-air). A predicate can be on any axis (`p.z < -42`, `p.x > 6`,
`p.y > 5`); just make sure the path satisfies them in order. Set `killY` just under the
lowest floor (Trend Mile `-7`, Glasshouse `-3`). Keep the spawn area full-corridor width
(x ±12) with a side curb so `verify-wall.mjs` can still press a wall near the start.

## Entity API reference

All live in `src/components/`. Only `Block` (fixed cuboid) and `HiddenPlatform` (while bare)
and the player are **solid**. Decorative meshes (NPC, Pillar, Lamp, Pane, GustZone visuals)
have **no collider**, so every wall/floor/platform you can stand on must be a `Block` (or a
fixed RigidBody you add).

| Component | Props | Notes |
|---|---|---|
| `Block` (`components/Blocks.tsx`) | `pos, size, kind?, color?, roughness?, metalness?, bumpScale?` | The textured static cuboid floor/step/wall. `kind` ∈ `tile`/`panel`/`glass`/`water`/`soil` picks a procedural map+bump (see `components/textures.ts`); tiling scales to size. Replaces the old per-zone `Slab`. |
| `Pane`, `Lamp`, `Crate` (`Blocks.tsx`) | see signatures | Non-solid detail props: a glass wall pane, a glowing lamp post (adds a point light), a textured crate. |
| `HiddenPlatform` | `position, size?=[2,0.3,1.5]` | Bare-only: visible + solid only while bare; fades/de-collides when suited (textured caustic shimmer). The mid-air-molt target. |
| `Collectible` | `position` | A "moment". Visible + collectible only while bare; auto-collects within ~1.35 m; increments `moments`. |
| `GustZone` | `position, size` | Box hazard. While bare inside, drains `exposure`; at 0 forces re-suit. No collider. |
| `Goal` | `position, zoneId, nextId?` | Completes the zone (triggers `completeZone`) and unlocks `nextId`. One per zone. |
| `NPC` | `position, color, rot` | Decorative figure (crowd flavor). No collider. |
| `Pillar` / `Planter` / `Water` / `Rain` (local helpers) | — | Decorative; copy from a zone file. `Water` is a textured, non-solid surface; the kill-plane catches a fall through it. |

Textures are generated once to a canvas (`components/textures.ts`, `getTex`/`tiled`); there
are **no external image files**. The color flood, audio low-pass, particles, sky, and camera
are global (`PostFX`, `SceneRig`, `SkyDome`, `Particles`, `Player`); a new zone doesn't touch
them beyond the `CFG` palette.

## Testing a zone fast

- `npm run dev`, click into the zone from the level-select.
- In dev, the console exposes debug hooks (from `src/game/fx.ts`):
  `window.__moltPos` (live player Vector3), `window.__moltDebug.teleport(x, y, z)` to jump to
  a spot, and `window.__moltDebug.setSuit(bool)` to snap the suit state with no morph. The
  verify scripts use these.
- Headless `node scripts/verify.mjs` catches console/runtime errors and saves before/after
  (suited vs bare) screenshots. `verify-reach.mjs` / `verify-glasshouse.mjs` check the
  per-zone twist (hidden plank solid only while bare), checkpoint respawn, and the goal.
  Note: the rich textured scene runs the **headless** renderer slowly, so those scripts use
  the debug hooks and kill-plane teleports (timing-free) rather than replaying live
  platforming. On real hardware the game runs at 60 fps; the jumps are within budget.

## Planned zones and their distinct twist (keep them mechanically different)

From `zones.ts`: 2 `Glasshouse` (rain opens bare-only water routes), 3 `Underhum` (dark; the
suit-light blinds you to a glow only stillness shows), 4 `Gallery of Faces` (decoration /
identity puzzle), 5 `Open Field` (synthesis; little/no suit help). Each should introduce one
new idea, not reskin Trend Mile.

## Soul / scope guardrails (light touch)

Puzzle-platformer first, fun before theme. Tone is gentle, never cruel; no fail-states
harsher than the soft re-suit. The suited/bare duality and the four motifs (ants, a sticker/
decoration, rain, a hummed melody) are the identity, weave them in as mechanics, never as
exposition. Don't regress the movement feel: per-axis wall collision (you keep vertical
momentum sliding up a wall), snappy jumps, no jitter/stick/launch.
