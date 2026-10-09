# Angler-Insel — project context

Original single-player 3D browser fishing game. Cute, warm, stylized Caribbean look on a **tiny spherical
water planet** with a clearly curved horizon. The angler is a **cartoon cat**; neighbors are other cartoon
animals. In-game language is **German** (all player-facing text lives in `src/data/strings.ts`).

## Game vision (summary — full text lives in the first session prompt; keep this in sync)
- One main island (+ tiny offshore islet later): harbor village with colorful stilt houses, mangroves, rocky
  coast, coral-reef lagoon, jungle hill, river mouth, surf beach — connected by sandy paths and boardwalks.
- Scale: ~2–3 min to walk around the island, 20–40 s between neighboring fishing spots.
  5–6 shore spots + 2–3 boat-only spots, each with its own species and look.
- Vertical exploration: lighthouse with stairs, stilt-house upper floors, rope bridges, long pier.
- Start: bait-and-tackle shack on the dock, beside a rod rack.
- Core loop: take rod → find spots → cast / wait for bite / reel with light tension → fish go into a
  visible cooler (4 slots, upgradable 6/8) → sell to the fish trader (base price) or deliver to neighbors
  (2–3× price, sometimes extra rewards: hidden-spot hint, special bait, cosmetic). Each neighbor takes one
  delivery per round; when all are served a new round with new requests starts.
- Shop (tackle shack): 3 rod tiers (cast range, tension tolerance, rare fish need better rods), coolers,
  species bait, rowboat (major milestone, ~after 2–3 rounds) + motor. Rare fish worth noticeably more.
  No money loss, no time pressure.
- Boat: board/leave only at fixed piers; simple forgiving controls; some species boat-only.
- Discovery & small delights: hidden coves, tide pools, crabs, falling coconuts, seagulls stealing fish.

See `ROADMAP.md` for milestones. **Milestone 1** = planet + island + harbor village, walking + camera,
4 shore spots, fishing mini-game, cooler (4), trader + coins, 3 neighbors with rounds.

## Run
```bash
npm install
npm run dev          # http://localhost:5173  (add ?debug for tuning panel + stats)
npm test             # vitest: pure game logic + data validation
npm run typecheck
npm run art          # rebuild ALL .glb from Blender scripts (Blender 4.2+, auto-detected or BLENDER_PATH)
npm run art -- fish  # rebuild scripts whose path contains "fish"
npm run art -- --open characters/cat   # open Blender GUI with that model built (for hand-editing)
node tools/glb-info.mjs art/props/cooler_small.glb   # print node tree of a glb
```

## Tech stack
Three.js + Vite + TypeScript (strict). `three-mesh-bvh` for collision/raycasts (custom capsule controller,
no physics engine — "up" changes across the planet). Plain DOM/CSS HUD. Vitest for logic. lil-gui in `?debug`.

## Architecture
- `src/core/` — `Game` (loop + system registry), typed `EventBus`, `Input` (keyboard + gamepad → actions),
  `Assets` (glb loading via `import.meta.glob('/art/**/*.glb')`).
- `src/planet/` — **all sphere math** (`Planet.ts`): planet center is the origin, the island sits at the
  north pole (+Y). Map coordinates `(x, z)` in meters (x = east, z = south) are projected with an azimuthal
  equidistant projection (`mapToWorld`). Height `h` is relative to sea level (= planet radius).
  Never assume world +Y is up — use `Planet.up(pos)`.
- `src/world/` — builds the island from `data/layout.ts`: static models are *bent* onto the sphere per vertex
  (so long piers follow the curvature), scattered vegetation is instanced. Collision = terrain + all `COL_*`
  proxies merged into one BVH (`Collision.ts`).
- `src/player/` — `PlayerController` (capsule vs BVH, radial gravity, movement modes — `OnFoot` now, `InBoat`
  later), `CameraRig` (orbit in the player's tangent frame, parallel-transported reference), `PartAnimator`
  (procedural animation of named model parts).
- `src/fishing/` — `logic.ts` is a pure, unit-tested state machine + tension model; `FishingSystem.ts` does visuals.
- `src/inventory/`, `src/npc/`, `src/economy/`, `src/interaction/`, `src/ui/`, `src/state/` — one concern each.
- Systems communicate through `EventBus` events (`fish:caught`, `fish:sold`, `request:delivered`, `round:started`…).
  All persistent progress is in `GameState` (versioned localStorage save).

## Data-driven content (`src/data/`)
`fish.ts`, `spots.ts`, `neighbors.ts`, `economy.ts`, `upgrades.ts`, `layout.ts`, `strings.ts`.
Typed with `satisfies`; `validate.ts` checks cross references at startup and in tests.
**Rebalance by editing data only.** Add a fish: data entry + `art/fish/<id>.py` → `npm run art -- fish`.

## Art pipeline conventions (`art/`)
- One Blender Python script per model; the exported `.glb` sits next to it (same name). `art/_lib/` = shared
  kit (`kit.py` primitives/export, `palette.py` colors, `animals.py`, `fishkit.py`). Folders starting with `_`
  are not exported.
- Single material "Palette" + vertex colors ("Col"). Low poly. Models face Blender **-Y** (three.js +Z).
- `COL_*` objects = collision proxies (hidden in game). `ANCHOR_*` / `SLOT_*` empties = attachment points.
- Characters are rigid named parts (`body`, `head`, `arm_L/R`, `leg_L/R`, `tail`, …) with pivots at the
  joints; animation is procedural in code.
- Terrain: `art/terrain/island.py` reads `art/terrain/island_shape.json` (also imported by the game for the
  planet radius). Change island shape there, re-run `npm run art -- terrain`.

## Conventions
- TypeScript strict, small modules, no default exports. Game text only via `strings.ts` (German).
- Pure logic (no three.js) in testable modules; add vitest tests for rules/balance logic.
- Commit after each working step. Keep this file and `ROADMAP.md` current.
