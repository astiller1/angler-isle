import type { SpotDef } from './types';

/**
 * Fishing spots. The circle marks the *water* where the bobber has to land; bubbles show it in game.
 * Boat spots are only reachable with the rowboat. Later: Flussmündung, Lagune (shore).
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
  // ---- boat-only spots (reachable with the rowboat; see data/boat.ts)
  {
    id: 'riffkante',
    name: 'Riffkante',
    access: 'boat',
    x: 72,
    z: -150,
    radius: 20,
    species: [
      { fishId: 'papageifisch', weight: 55 },
      { fishId: 'barrakuda', weight: 30 },
      { fishId: 'zackenbarsch', weight: 15 },
    ],
    biteDelay: [3, 7],
  },
  {
    id: 'offenesee',
    name: 'Offene See',
    access: 'boat',
    x: -200,
    z: -70,
    radius: 24,
    species: [
      { fishId: 'goldmakrele', weight: 55 },
      { fishId: 'barrakuda', weight: 20 },
      { fishId: 'thunfisch', weight: 25 },
    ],
    biteDelay: [4, 9],
  },
  {
    id: 'sandbank',
    name: 'Sandbank',
    access: 'boat',
    x: 150,
    z: 80,
    radius: 22,
    species: [
      { fishId: 'bonefisch', weight: 40 },
      { fishId: 'pompano', weight: 30 },
      { fishId: 'permit', weight: 30 },
    ],
    biteDelay: [4, 9],
  },
] as const satisfies readonly SpotDef[];

export function spotAt(x: number, z: number, spots: readonly SpotDef[] = SPOTS): SpotDef | null {
  for (const s of spots) if (Math.hypot(x - s.x, z - s.z) <= s.radius) return s;
  return null;
}
