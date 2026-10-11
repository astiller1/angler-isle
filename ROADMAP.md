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

## Version 5 (replaced)
- Tried a CC0 recording ("Feel Good Island") with bass removal — rejected (sounded odd)

## Version 6 ✔
- Music = 8 public-domain Jamaican folk tunes (Jekyll 1907) in a 5.5 KB data file, auto-harmonized and played
  by a synthesized island band (steel pan, Karplus-Strong ukulele, light bass, shaker); dances by day,
  waltzes on marimba at night

## Version 7 ✔
- Game menu (☰ / Esc / gamepad Start): resume, music on/off, back to the harbor, controls, new game (with confirm)
- Invisible skirts under dock, pier, mangrove boardwalk and stilt houses + automatic rescue when stuck in water
- Cat model: straw hat level/centred, tail curls out below and beside the cooler
- The bamboo rod is owned from the start (no pickup); the shack rack is a sales display showing only the rods
  you can still buy — it opens Rocco's shop, bought rods leave the rack and replace the one in the paw

## Version 8 — Boot & Karte ✔
- Rowboat (800) and outboard motor (400) at Rocco's; board/leave only at the 4 piers (Hafen-Anleger at the end of
  the long pier, Strand-, Mangroven- and Inselchen-Anleger) — `InBoat` movement mode, forgiving camera-relative
  steering, grounding on shallows/posts, current pushes back beyond 300 m; fishing from the boat when stopped
- Offshore: Kokos-Inselchen (islet with jetty and palms), reef plateau and a sandbank with a tiny dry cay
- Boat-only spots Riffkante, Offene See, Sandbank with 5 new species (Papageifisch, Barrakuda, Goldmakrele,
  Permit, Gelbflossen-Thun — barracuda/permit need rod tier 2, tuna tier 3)
- Fold-out map (K / Select / 🗺): painted from the terrain, fog of war revealed while exploring, markers for spots,
  piers, neighbors (with open-wish badge), shops and places; "Neu auf der Karte" toasts; Walter may mark the
  Riffkante as a delivery bonus (hint reward)

## Milestone 2 — Shop & upgrades (rest)
- Coolers 4 → 6 → 8 (cooler view already reads slot count from data)
- Bait items that bias spot species tables
- Neighbor extra rewards: bait, cosmetics (hint rewards are live since v8)

## Milestone 3 — Boat & offshore (rest)
- Remaining shore spots: Flussmündung, Lagune
- Boat extras: night lantern, wake foam, a neighbor on the islet

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
