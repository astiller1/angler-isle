import type { SpotDef } from './types';

/**
 * Fishing spots. The circle marks the *water* where the bobber has to land; bubbles show it in game.
 * Later milestones add: Flussmündung, Lagune (shore), Riffkante, Offene See, Sandbank (access: 'boat').
 */
export const SPOTS = [
  {
    id: 'hafen',
    name: 'Hafen-Pier',
    access: 'shore',
    x: 127,
    z: 7,
    radius: 13,
    species: [
      { fishId: 'grunzer', weight: 70 },
      { fishId: 'schnapper', weight: 30 },
    ],
    biteDelay: [3, 8],
  },
  {
    id: 'felsen',
    name: 'Felsküste',
    access: 'shore',
    x: 6,
    z: -104,
    radius: 13,
    species: [
      { fishId: 'drueckerfisch', weight: 75 },
      { fishId: 'zackenbarsch', weight: 25 },
    ],
    biteDelay: [4, 9],
  },
  {
    id: 'mangroven',
    name: 'Mangroven',
    access: 'shore',
    x: -121,
    z: 12,
    radius: 12,
    species: [
      { fishId: 'snook', weight: 78 },
      { fishId: 'tarpun', weight: 22 },
    ],
    biteDelay: [4, 10],
  },
  {
    id: 'strand',
    name: 'Brandungsstrand',
    access: 'shore',
    x: 4,
    z: 101,
    radius: 14,
    species: [
      { fishId: 'pompano', weight: 70 },
      { fishId: 'bonefisch', weight: 30 },
    ],
    biteDelay: [3, 8],
  },
  {
    // Boat-only (Milestone 3) — already here so neighbor hints can point to it.
    id: 'riffkante',
    name: 'Riffkante',
    access: 'boat',
    x: 70,
    z: -150,
    radius: 18,
    species: [
      { fishId: 'zackenbarsch', weight: 50 },
      { fishId: 'schnapper', weight: 50 },
    ],
    biteDelay: [3, 7],
    hidden: true,
  },
] as const satisfies readonly SpotDef[];

export function spotAt(x: number, z: number, spots: readonly SpotDef[] = SPOTS): SpotDef | null {
  for (const s of spots) if (Math.hypot(x - s.x, z - s.z) <= s.radius) return s;
  return null;
}
