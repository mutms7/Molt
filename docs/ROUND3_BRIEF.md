# Molt, development round 3 brief

> **STATUS: implemented.** Everything below shipped (movement retune, ability-intro order,
> min-moments gate + HUD, checkpoint and end-of-level animations, the trapped-moment fix,
> both map reworks, and the lore title intro). Kept as the record of intent and the
> challenge-idea bank. README and BUILDING_LEVELS reflect the shipped state.

Read this AFTER [../README.md](../README.md) and [BUILDING_LEVELS.md](BUILDING_LEVELS.md).
Those two explain the game, the zone wiring, the entity API, and the movement budget. This
file is the task list and design spec for the current round of work. Do everything here,
keep the game runnable, run `npm run build` before committing, and verify with the scripts
in `scripts/`. To push, the `mutms7` account owns the repo: `gh auth switch --user mutms7`.

Style note for any player-facing copy you write (intro, HUD labels): natural, flowing
sentences, and never use em dashes. Use commas, parentheses, or two sentences instead.

## Current state (what you are starting from)

Two playable zones, both textured obbies: `src/zones/TrendMile.tsx` (zone 1) and
`src/zones/Glasshouse.tsx` (zone 2). Per-zone `spawn` / `killY` / `checkpoints` live in
`CFG` in `src/components/Game.tsx`. Movement constants are in `src/components/Player.tsx`;
the suit morph speed is `SUIT_TRANSITION_SPEED` there, and the committed state flips in
`src/game/store.ts`. Textures are procedural (`src/components/textures.ts` + the `Block`
component in `src/components/Blocks.tsx`). Moments per zone are counted in
`MOMENT_COUNT` in `src/zones/zones.ts`; the live HUD reads `moments`/`totalMoments`.

## The goals of this round, in order

### 1. Retune movement: slower gravity, bigger jumps, faster molt

The point is to give the player real airtime so they can switch state in the middle of a
jump. Lower the gravity, scale the jumps up to match, and speed up the morph so a mid-air
switch is dexterous rather than fiddly.

Starting points to tune from (then verify and adjust to feel):

- `GRAVITY`: from `-52` to around `-32`. Floatier, much more airtime.
- Suited `jump`: around `16`, keep the double-jump. Bare `jump`: around `14`.
- `SUIT_TRANSITION_SPEED`: from `2.4` to around `5.0`, so a full morph takes ~0.2 s. A
  suited jump now lasts ~1 s, so you can comfortably molt once or twice in the air.
- Speeds can stay (`SUIT.speed 9`, `BARE.speed 5.5`) or nudge bare up slightly for feel.
- Dash stays `24` for `0.2 s` (only used/taught in zone 2, see below).

Because the jumps are bigger, the gaps must grow too, or the platforming turns trivial.
After you settle the numbers, **re-derive the reach budget and update the table in
BUILDING_LEVELS.md** (bare single up/flat, suited single, suited double, suited dash-jump),
then design every gap against the new numbers and re-verify reach.

Keep the movement feel intact: per-axis wall slide, no jitter/stick/launch. `verify-wall.mjs`
must still pass (the invariant is "vertical preserved against a wall", not a specific rise).

### 2. Ability introduction order

- **Zone 1 (Trend Mile)** introduces exactly two ideas: the **molt switch** (suited = more
  mobility, bare = more platforms) and the **double-jump**. It must be solvable without ever
  dashing. Do not require dash anywhere in zone 1.
- **Zone 2 (Glasshouse)** introduces the **dash**, and leans on combinations.

### 3. Moments: fewer gimmes, real detours, and a per-level minimum

- Cut the easy moments that sit right on the path. Most moments should require going out of
  your way: a detour off the main route, an extra molt, a risk, a precise sub-climb.
- Add a **minimum moments per level** that the player must collect to finish, and **show it
  on the HUD** (for example `moments 2 / 4 needed`, with the zone total still trackable).
  Add a `minMoments` field per zone in `src/zones/zones.ts`, gate `Goal`/`completeZone` on
  it (reaching the goal under the minimum should nudge the player to find more, not hard-
  fail cruelly), and update the HUD in `src/ui/HUD.tsx`. Keep the minimum modest so it is a
  challenge, not a grind.

### 4. Checkpoint activation animation

Checkpoints are currently invisible logic (the `checkpoints` predicates in `CFG`, armed in
`Player.tsx`). Give them a visible marker that plays an activation animation the moment it
arms (a pop/flare scale-up, an emissive flash, a small particle burst, plus an audio blip
via the existing `audio` engine). Suggested approach: track the active checkpoint index
(expose it from `Player` via `src/game/fx.ts` or the store), place a small `Checkpoint`
marker component at each checkpoint `at` position in the zone, and animate it when its index
becomes active. Keep markers cheap (no extra colliders).

### 5. End-of-level animation (a couple of seconds before the level ends)

Right now `Goal` calls `completeZone` instantly. Instead, on reaching the goal, enter a brief
finishing state for ~2 seconds (freeze input, play a flourish: the player already has a
victory pose when `screen === 'complete'`, so add a camera push-in and/or an expanding ring
or particle burst at the goal), then transition to the complete screen. Guard against
double-triggering.

### 6. Fix the trapped moment (then keep the lesson)

In the current `TrendMile.tsx`, platform `T1` at `[-7, 3.0, -68]` (its underside is at
y ≈ 2.75) sits directly above the gust ledge, and the moment at `[-8, 2.2, -67]` is pinned in
the gap between them, effectively uncollectable. The zone 1 rework will replace this layout,
but the general rule stands: **never place a moment in a pocket under an overhanging
platform.** When you place moments, give them clear vertical headroom.

### 7. Rework zone 1 (Trend Mile): the gentle tutorial

Keep it as the welcoming intro, but rebuilt around the new airtime and the two taught ideas.
A good teaching arc:

1. Walk, then a gap a single jump cannot clear but a **double-jump** can (teach double-jump).
2. A gap with no suited landing at all, only **bare-only hidden platforms**, so you must
   molt to bare to reveal a path (teach: bare = more platforms).
3. A tall reach or wide gap only the **suited double-jump** makes (teach: suited = mobility).
4. A short **alternation**: suited hop, then a bare-only stretch, then suited again.
5. One **gentle mid-air molt**: a suited launch where you molt to bare in the air to land on
   a hidden plank. With the slower gravity this should feel generous, not twitchy.
6. Checkpoints (with the new activation animation) at the start of each segment.
7. A goal that is up high and off to the side (not a straight hallway), with the end
   animation. Moments: a handful, mostly off-path detours, plus the per-level minimum.

### 8. Rework zone 2 (Glasshouse): the rewarding challenge

Push harder here. Introduce the dash and combine mechanics. Keep the rain/water identity
(the suit cannot cross water, so water-routes are bare-only hidden platforms) and the gust.
Build at least these signature challenges (use them now, they are the fun part):

- A **far jump that needs dash plus double-jump plus a switch** (for example, dash-jump
  suited for the distance, double-jump for height, and molt to bare in the air to land on a
  hidden plank). One clean expert gap.
- A jump that **requires two switches** in one airtime (suited launch, molt to bare to land
  on a hidden plank, then immediately the next reach wants suited again, or vice versa).
- A **stack of blue (hidden) platforms layered close together** where you climb to a moment
  by timing molts: each plank is only solid while bare, so you ride them up while managing
  the state, an out-of-the-way moment as the reward.
- Keep a gust on a water-route as a risk beat, and keep the elevated roof section for
  vertical variety. Goal offset and elevated; end animation; per-level minimum of moments,
  most of them genuinely out of the way.

### 9. Title screen: lore, not controls

The title (`src/ui/TitleScreen.tsx`) currently shows the `ControlsGuide`. Replace that with a
short piece of **lore/context** for the story, written in long flowing sentences (the tone
register is A Short Hike, Mushishi, Kentucky Route Zero: gentle, a little wistful, never
exposition-dump). Keep the controls reachable, just not on the front page: leave them in the
pause menu (which already has a Controls button) and/or behind a small "Controls" toggle on
the title. Do not use em dashes.

Draft intro you can use or refine (matches the no-em-dash, long-sentence ask):

> There is a city that learned to wear itself like a coat, and almost everyone here keeps a
> shell, a bright and certain second skin that makes them quick and sure and just a little
> unreachable. Most people never take it off, because the world inside the shell is quieter
> and the colors are kinder and very little can get in. You have one too. The thing nobody
> says out loud is that the shell is also a kind of blindness, that the small bright moments
> and the paths around the edges only show themselves to the person willing to step out of it
> and be slow, and seen, and a little afraid for a while. So that is the whole of it, really:
> you move through these places, and again and again you arrive at the same quiet question,
> which is whether to keep the shell on and trust your speed, or to molt, and stand in the
> open, and finally notice what was there the entire time.

## Challenge idea bank (use a couple now, save the rest for zones 3 to 5)

These all build from the existing primitives (Block, HiddenPlatform, GustZone, dash,
double-jump, molt), so no new systems are needed:

- **Fall-switch**: a drop where you must molt to bare mid-fall to land on a hidden platform.
- **Gust gate**: switch to suit to push through a gust unharmed, then molt back to land on a
  bare-only plank just past it (a timed double switch around a hazard).
- **Hidden ladder**: alternating suited-only solid steps and bare-only hidden steps, forcing
  a switch on every step.
- **Dash corridor**: a long dash-only gap with a double-jump partway across for height.
- **Stacked planks**: several hidden platforms layered vertically, climbed by re-molting with
  good timing (used in zone 2 now for a moment, can scale up later).
- **False floor**: a wide deep drop spanned only by hidden platforms invisible while suited,
  read as a leap of faith that the bare eye can see.
- **Exposure dare**: a moment on a ledge inside a gust, so grabbing it bare is a real
  risk/reward against the exposure drain.

Save any further ideas you invent into this section so the next round can pull from it.

## Verification expectations

- `npm run build` clean (strict, unused vars fail).
- `node scripts/verify.mjs` (renders, color flood, no console errors), `verify-wall.mjs`
  (movement feel), and the per-zone twist/checkpoint/goal checks
  (`verify-reach.mjs`, `verify-glasshouse.mjs`), updated to the new coordinates.
- The textured scene runs the headless renderer slowly, so the verify scripts use the debug
  hooks (`window.__moltDebug.teleport` / `.setSuit`) and kill-plane teleports rather than
  replaying live platforming. Keep that approach. Add coverage for any new mechanic (the
  minimum-moments gate, the checkpoint marker, the end animation) where it is timing-free.
- Take before/after screenshots to eyeball texture and layout, and do a quick manual pass on
  the mid-air switch beats since headless cannot judge their feel.

## After the work

Update `MOMENT_COUNT` / `minMoments`, the README zone table, and the BUILDING_LEVELS movement
budget table and any entity notes to match what you actually shipped. Commit with a clear
message, then `gh auth switch --user mutms7` and push (and switch back afterward).
