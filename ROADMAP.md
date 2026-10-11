# Roadmap

## Milestone 1 — First playable ✔
- Water planet with the main island, curved horizon, stylized water
- Third-person walking + camera on the curved surface (keyboard + gamepad)
- Tackle shack start, harbor village (stilt house with stairs, long pier, dock)
- 4 shore fishing spots (Hafen-Pier, Felsküste, Mangroven, Brandungsstrand), 2 species each
- Fishing mini-game: cast → wait → bite → reel with tension
- Visible cooler (4 slots), fish trader, coin counter
- 3 neighbors with fish requests, once-per-round delivery, round rollover
- Local save (localStorage)

## Version 2 ✔
- Day–night cycle (24 real minutes = 24 game hours): sun and moon orbit the planet, Caribbean sky colors
  per time of day, stars, glowing lanterns, HUD clock (keyframes in `src/data/daycycle.ts`)
- No sliding on slopes (walkable surfaces resolve vertically) + ground snapping when walking downhill
- Cast prompt only with castable water ahead within the current rod's range
- Shop at the tackle shack (Rocco the raccoon) with rod tiers 1–3: Bambus (free) → Glasfaser (180) →
  Karbon (450); cast range, tension limit, reel speed; the tarpon needs tier 2

## Version 3 ✔
- Smartphone support (landscape only): touch joystick, drag camera, context action button, jump/cancel,
  tap-to-play gate with fullscreen + landscape lock (Android), rotate hint in portrait, compact HUD,
  low-quality render profile, web app manifest (landscape, fullscreen)

## Version 4 ✔
- Background music with mute via M / speaker button (first version: live-synthesized — replaced in v5)

## Version 5 ✔
- Human-made music: "Feel Good Island (Loop)" by Brandon Morris (CC0) with the bass removed (24 dB/oct
  high-pass at 200 Hz) + compressor/make-up
  gain; softer and quieter at night; ready for an extra night track (cross-fade)

## Milestone 2 — Shop & upgrades (rest)
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
- Sound effects (ambience, waves, splashes, reel, catch jingle)
- Armature-based animation pass (optional), particles, UI polish
- Settings (volume, camera sensitivity, invert), performance presets
- Balancing pass across all rounds
