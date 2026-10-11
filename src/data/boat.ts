/**
 * Rowboat handling and the fixed piers ("Anlegestellen") where you board and leave it.
 * Prices live in upgrades.ts (BOAT). Positions are map coordinates (x = east, z = south).
 */

export const BOAT_SETTINGS = {
  /** Top speed (m/s) rowing / with the outboard motor. Holding sprint rows harder. */
  rowSpeed: 4.2,
  rowSprint: 5.6,
  motorSpeed: 8.5,
  motorSprint: 10.5,
  /** Max turn rate (deg/s) — the boat turns toward the stick direction (camera relative). */
  turnRate: 75,
  /** Seconds to reach top speed / to coast to a stop. */
  accel: 1.4,
  drag: 1.1,
  /** The hull touches ground where the seabed is shallower than this (m below sea level). */
  draft: 0.45,
  /** Hull half length / half width (m) for grounding and obstacle checks. */
  halfLength: 1.7,
  halfWidth: 0.65,
  /** How far out you may row (distance from the island center, m) before the current turns you back. */
  maxRange: 300,
  /** Dock prompt radius around the mooring point (m). */
  dockRadius: 7,
  /** Waterline: how far below the surface the keel sits (m). */
  sink: 0.18,
};

export interface DockDef {
  id: string;
  name: string;
  /** The pier model placement (map coordinates, facing in degrees, deck height). */
  x: number;
  z: number;
  rot: number;
  h: number;
  /** Place a jetty model here (the harbor and mangroves reuse the existing pier/boardwalk). */
  jetty: boolean;
  /** Where the cat stands after leaving the boat — local offset in the pier's frame (x right, z forward). */
  stand: [number, number];
  /** Mooring spot of the boat — local offset (x, z) and boat heading relative to the pier (degrees). */
  moor: [number, number, number];
}

export const DOCKS = [
  { id: 'hafen', name: 'Hafen-Anleger', x: 96, z: -3, rot: 90, h: 2.2, jetty: false, stand: [-1.2, 50.2], moor: [0, 53.4, 90] },
  { id: 'strand', name: 'Strand-Anleger', x: -40, z: 84, rot: 0, h: 1.5, jetty: true, stand: [0.2, 10.8], moor: [1.95, 10.5, 0] },
  { id: 'mangroven', name: 'Mangroven-Anleger', x: -93, z: 12, rot: 270, h: 0.9, jetty: false, stand: [0, 25], moor: [0, 27.7, 90] },
  { id: 'inselchen', name: 'Inselchen-Anleger', x: 115, z: -119, rot: 270, h: 1.25, jetty: true, stand: [0.2, 10.8], moor: [1.95, 10.5, 0] },
] as const satisfies readonly DockDef[];

export type DockId = (typeof DOCKS)[number]['id'];

export function dockById(id: string): DockDef {
  return DOCKS.find((d) => d.id === id) ?? DOCKS[0];
}
