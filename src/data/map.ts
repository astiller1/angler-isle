/**
 * The explorable map: size of the charted area, how far the cat "sees" for revealing, and named places.
 * Fishing spots, piers, neighbors and the shops are added automatically (see map/MapSystem.ts).
 */
export const MAP_SETTINGS = {
  /** Charted area: map coordinates -half..half on both axes (m). */
  half: 240,
  /** Fog grid resolution (cells per side). */
  cells: 96,
  /** Reveal radius around the cat on foot / in the boat (m). */
  revealOnFoot: 36,
  revealInBoat: 52,
  /** Already known at the start: the harbor village. */
  start: { x: 78, z: -3, r: 46 },
};

export interface PlaceDef {
  id: string;
  name: string;
  icon: string;
  x: number;
  z: number;
}

/** Named places shown once explored (besides spots, piers and neighbors). */
export const PLACES: PlaceDef[] = [
  { id: 'dorf', name: 'Hafendorf', icon: '🏘️', x: 62, z: -3 },
  { id: 'gipfel', name: 'Dschungelgipfel', icon: '⛰️', x: -18, z: -22 },
  { id: 'felsbucht', name: 'Felsbucht', icon: '🪨', x: 52, z: -80 },
  { id: 'palmenstrand', name: 'Palmenstrand', icon: '🏖️', x: 30, z: 92 },
  { id: 'kokosinsel', name: 'Kokos-Inselchen', icon: '🌴', x: 131, z: -124 },
  { id: 'sandinsel', name: 'Sandinsel', icon: '🏝️', x: 150, z: 80 },
];

/** Emoji per neighbor / shopkeeper id. */
export const PERSON_ICONS: Record<string, string> = {
  walter: '🦭',
  bruno: '🐻',
  fritzi: '🦥',
  pelle: '🐟',
  rocco: '🦝',
};
