# Roadmap

## Milestone 1 — First playable (current)
- Water planet with the main island, curved horizon, stylized water
- Third-person walking + camera on the curved surface (keyboard + gamepad)
- Tackle shack start, harbor village (stilt house with stairs, long pier, dock)
- 4 shore fishing spots (Hafen-Pier, Felsküste, Mangroven, Brandungsstrand), 2 species each
- Fishing mini-game: cast → wait → bite → reel with tension
- Visible cooler (4 slots), fish trader, coin counter
- 3 neighbors with fish requests, once-per-round delivery, round rollover
- Local save (localStorage)

## Milestone 2 — Shop & upgrades
- Tackle-shack shop UI (data already in `src/data/upgrades.ts`)
- Rod tiers 1–3 (cast distance, tension tolerance, rare fish gated by tier)
- Coolers 4 → 6 → 8 (cooler view already reads slot count from data)
- Bait items that bias spot species tables
- Neighbor extra rewards: hints, bait, cosmetics (reward types already typed)

## Milestone 3 — Boat & offshore
- Rowboat purchase, fixed piers (board/leave only at piers) — `InBoat` movement mode
- Motor upgrade (speed/range)
- Offshore islet, boat-only spots: Riffkante, Offene See, Sandbank (spots with `access: 'boat'`)
- Remaining shore spots: Flussmündung, Lagune

## Milestone 4 — Exploration & world extras
- Lighthouse with stairs + lighthouse-keeper neighbor
- Rope bridges between cliffs, jungle hill trail, hidden coves, tide pools
- Hidden fishing spots unlocked by neighbor hints
- Playful interactions: crabs scuttling, coconuts falling when bumping palms, splashing waves,
  seagulls stealing an unattended fish
- Fangbuch (catch log UI), cosmetics for the cat

## Milestone 5 — Polish
- Audio (ambience, splashes, reel, music)
- Armature-based animation pass (optional), particles, UI polish
- Settings (volume, camera sensitivity, invert), performance presets
- Balancing pass across all rounds
