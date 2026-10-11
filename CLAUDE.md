# Angler-Insel — project context

Original single-player 3D browser fishing game. Cute, warm, stylized Caribbean look on a **tiny spherical
water planet** with a clearly curved horizon. The angler is a **cartoon cat**; neighbors are other cartoon
animals. In-game language is **German** (all player-facing text lives in `src/data/strings.ts`).

## Game vision (summary — full text lives in the first session prompt; keep this in sync)
- One main island (+ tiny offshore islet, Kokos-Inselchen): harbor village with colorful stilt houses, mangroves, rocky
  coast, coral-reef lagoon, jungle hill, river mouth, surf beach — connected by sandy paths and boardwalks.
- Scale: ~2–3 min to walk around the island, 20–40 s between neighboring fishing spots.
  5–6 shore spots + 2–3 boat-only spots, each with its own species and look.
- Vertical exploration: lighthouse with stairs, stilt-house upper floors, rope bridges, long pier.
- Start: bait-and-tackle shack on the dock, beside a rod rack.
- Core loop: take rod → find spots → cast / wait for bite / reel with light tension → fish go into a
  cooler on the back (4 slots, upgradable to 6/8 — a closed box that always looks the same) → sell to the fish trader (base price) or deliver to neighbors
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
npm run dev          # http://localhost:5173
                     #   ?debug  tuning panel (lil-gui), fps/draw-call counter, cheats
                     #   ?reset  start a new game (clears the localStorage save)
                     #   ?view=characters/cat | ?view=fish/ | ?view=all  model viewer (C toggles collision)
npm test             # vitest: pure game logic + data validation
npm run typecheck
npm run art          # rebuild ALL .glb from Blender scripts (Blender 4.2+, auto-detected or BLENDER_PATH)
npm run art -- fish  # rebuild scripts whose path contains "fish"
npm run art -- --open characters/cat   # open Blender GUI with that model built (for hand-editing)
node tools/glb-info.mjs art/props/cooler_small.glb   # print node tree of a glb
npm run deploy       # build + force-push dist/ to the gh-pages branch → https://astiller1.github.io/angler-isle/
```
Repo: https://github.com/astiller1/angler-isle (public; `main` = source, `gh-pages` = built game, Pages serves
`gh-pages`). Vite `base: './'` keeps asset URLs relative so the build works under the `/angler-isle/` sub-path.
Deploying uses a local script (not GitHub Actions) because the gh token lacks the `workflow` scope.
On Windows PowerShell use `npm.cmd …` if script execution is disabled.

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
- `src/player/` — `PlayerController` (capsule vs BVH, radial gravity, movement modes — `OnFoot`, `InBoat`
  in `boat/`), `CameraRig` (orbit in the player's tangent frame, parallel-transported reference, gentle auto-follow),
  `Character` (procedural pose animation of named model parts), `Player` (glues body, cat, rod, cooler, camera).
- `src/fishing/` — `logic.ts` is a pure, unit-tested state machine + tension model (a fish whose
  `minRodTier` is above the rod never tires and strips the line); `FishingSystem.ts` does visuals.
- `src/world/Environment.ts` — day–night cycle: one directional light follows the sun by day and the moon
  by night; sky/fog/water/ambient colors interpolate `SKY_KEYS` (`data/daycycle.ts`). Lantern glows come
  from `GLOW_*` empties in the models.
- `src/economy/` — `shop.ts` (pure rules: rod tiers, cooler tiers, boat → motor), `ShopSystem.ts` (Rocco + menu), `trader.ts`.
- `src/boat/` — `Boat.ts`: rowboat model floating on the waves at a map pose (x, z, yaw), camera-relative steering
  (turns toward the stick, pulls forward when facing it), grounding where the seabed is shallower than
  `BOAT_SETTINGS.draft` or a keel ray hits collision (posts, pier skirts, mangroves); `InBoat` is the
  `MovementMode` that drives it and seats the cat (`ANCHOR_seat`). `BoatSystem.ts`: piers (`data/boat.ts` DOCKS,
  local stand/moor offsets in the pier's frame; jetties are placed from that data), board/leave interactables,
  save (`state.boat`). Boat spots (`access: 'boat'`) are fished from the boat like shore spots.
- Map: `map/Exploration.ts` (pure fog grid, base64 in `state.map.fog`), `map/MapSystem.ts` (reveals around the cat,
  discovers markers, `map:hint` from neighbors), `ui/MapView.ts` (base map painted once from the Seabed height
  field + paths + building footprints, fog layer, DOM markers with label decluttering). Settings and places
  in `data/map.ts`.
- Mobile (phones are landscape-only): `ui/TouchControls.ts` (floating joystick left, drag-look right, context
  action button mirroring `Hud.current` + fishing phase, jump, cancel) feeds `Input` via `setVirtual` /
  `touchMove` / `addTouchLook` (device `'touch'`). `ui/MobileShell.ts`: tap-to-play gate (fullscreen +
  `screen.orientation.lock('landscape')` best effort — iOS can't lock), portrait "rotate" overlay that pauses
  input, `body.compact` HUD layout (`ui/mobile.css`). `core/Quality.ts`: `low` profile on touch/small screens
  (pixel ratio 1.3, 1024 shadows, 45 % decoration), `?quality=high|low` overrides. Test touch in the browser pane
  with a viewport narrower than 768 px (e.g. 740×360) — only then is touch emulated.
- Audio: real *human* melodies, no audio files. `data/tunes.ts` holds public-domain traditional Jamaican folk
  tunes from W. Jekyll, "Jamaican Song and Story" (1907, Project Gutenberg #35410, MusicXML per tune) as
  compact `"midi:len …"` strings (convert more with `tools/musicxml-to-tune.mjs`). `audio/tune.ts` (pure,
  tested) parses them and harmonizes with diatonic chords (I, V7, IV, vi, ii per beat / dotted beat, change
  penalty, tonic at the end). `audio/MusicPlayer.ts` plays them with a small band: steel pan melody (marimba
  at night), Karplus-Strong ukulele strums, light plucked bass, shaker; groove per meter (2/4 calypso
  off-beats, 6/8 lilt, 3/4 waltz). Day = dances, night = waltzes (`when`), switching at tune boundaries.
  Settings in `data/music.ts`. Volume/mute per browser in localStorage (`M` / speaker button); audio starts
  after the first user gesture; suspended while the tab is hidden. `window.anglerMusic()` for debugging.
  History: random procedural melodies were rejected ("zu KI-generiert"); a CC0 recording was rejected
  (bass, EQ sounded odd). Keep melodies human-made; only arrangement is generated.
- Movement: surfaces with normal·up > `PLAYER_SETTINGS.walkable` count as ground and are resolved straight
  up (no sliding on slopes); steeper ones are walls. Ground snapping keeps the cat on slopes going down.
- `src/inventory/`, `src/npc/`, `src/economy/`, `src/interaction/`, `src/ui/`, `src/state/` — one concern each.
- Systems communicate through `EventBus` events (`fish:caught`, `fish:sold`, `request:delivered`, `round:started`…).
  All persistent progress is in `GameState` (versioned localStorage save).

## Data-driven content (`src/data/`)
`fish.ts`, `spots.ts`, `neighbors.ts`, `economy.ts`, `upgrades.ts` (rods/coolers/bait/boat),
`daycycle.ts` (sky & light keyframes per hour, sun path, game-time speed), `layout.ts`, `strings.ts`.
Typed with `satisfies`; `validate.ts` checks cross references at startup and in tests.
**Rebalance by editing data only.** Add a fish: data entry + `art/fish/<id>.py` → `npm run art -- fish`.

## Art pipeline conventions (`art/`)
- One Blender Python script per model; the exported `.glb` sits next to it (same name). `art/_lib/` = shared
  kit (`kit.py` primitives/export, `palette.py` colors, `animals.py`, `fishkit.py`). Folders starting with `_`
  are not exported.
- Single material "Palette" + vertex colors ("Col"). Low poly. Models face Blender **-Y** (three.js +Z).
- Collision proxies: `COL_*` = solid (blocks the player AND the camera spring arm); `COLP_*` = player-only
  (railings, posts, tree trunks — the camera may pass through). `ANCHOR_*` / `SLOT_*` empties = attachment
  points; anchor names must be unique across the island (`World.anchors`).
- Static pieces longer than 4 m are tessellated before being bent onto the sphere (otherwise long boxes sag
  between their corners on the curved planet).
- Walkable surfaces should sit ≥ 0.2 m above surrounding ground (e.g. the dock is at 2.2, the village at 2.0),
  otherwise the capsule can slip into the deck's collision box from the side.
- Characters are rigid named parts (`body`, `head`, `arm_L/R`, `leg_L/R`, `tail`, …) with pivots at the
  joints; animation is procedural in code.
- Terrain: `art/terrain/island.py` reads `art/terrain/island_shape.json` (also imported by the game for the
  planet radius). Change island shape there, re-run `npm run art -- terrain`.

## Testing in the browser pane / automation
- `window.angler` exposes `{ game, state, player, world, fishing, neighbors, env }`.
- `angler.game.step(n, dt)` advances frames synchronously (useful when the tab is throttled/hidden —
  a hidden browser pane runs requestAnimationFrame at ~1 fps).
- Input latches key presses between frames, so synthetic keydown/keyup pairs work at any frame rate.
- Only one game tab at a time: every tab autosaves to the same localStorage key.

## Conventions
- TypeScript strict, small modules, no default exports. Game text only via `strings.ts` (German).
- Pure logic (no three.js) in testable modules; add vitest tests for rules/balance logic.
- Commit after each working step. Keep this file and `ROADMAP.md` current.
