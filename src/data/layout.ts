import type { Placement, ScatterRule } from './types';
import { DOCKS } from './boat';

/**
 * The island layout in map coordinates (meters; x = east, z = south). Static models are bent onto
 * the planet; scatter rules place instanced vegetation/rocks (deterministic by seed).
 * Terrain shape itself lives in art/terrain/island_shape.json.
 */

/** Deck height of the harbor (dock, pier, shack): 0.2 m above the village pad in island_shape.json (a step the player can climb). */
export const HARBOR_H = 2.2;

export const PLACEMENTS: Placement[] = [
  // Harbor
  { model: 'buildings/dock', x: 90, z: -3, rot: 0, h: HARBOR_H },
  { model: 'buildings/pier', x: 96, z: -3, rot: 90, h: HARBOR_H },
  { model: 'buildings/tackle_shack', x: 90, z: 8, rot: 270, h: HARBOR_H },
  { model: 'buildings/trader_stall', x: 89, z: -13, rot: 270, h: HARBOR_H },
  // Village street (z = -3) between the plaza and the dock
  { model: 'buildings/stilt_house_a', x: 71, z: -14.5, rot: 0, h: 'ground' },
  { model: 'buildings/stilt_house_b', x: 72, z: 9.5, rot: 180, h: 'ground' },
  { model: 'buildings/stilt_house_c', x: 58, z: -14.5, rot: 0, h: 'ground' },
  { model: 'buildings/stilt_house_d', x: 58.5, z: 9.5, rot: 180, h: 'ground' },
  { model: 'props/lantern', x: 64.5, z: -5.2, rot: 0, h: 'ground' },
  { model: 'props/lantern', x: 78, z: -0.8, rot: 180, h: 'ground' },
  { model: 'props/lantern', x: 52, z: -0.8, rot: 180, h: 'ground' },
  { model: 'props/bench', x: 65, z: -0.4, rot: 180, h: 'ground' },
  { model: 'props/bench', x: 50.5, z: -6, rot: 0, h: 'ground' },
  { model: 'props/flower_bed', x: 78.5, z: -6.2, rot: 0, h: 'ground' },
  { model: 'props/flower_bed', x: 51, z: 1.5, rot: 0, h: 'ground' },
  { model: 'props/crates', x: 81, z: 2.5, rot: 20, h: 'ground' },
  { model: 'props/crates', x: 47, z: -11, rot: 110, h: 'ground' },
  // Beach, mangroves
  { model: 'buildings/beach_shack', x: 22, z: 72, rot: 200, h: 'ground' },
  { model: 'buildings/hammock', x: -70, z: 29, rot: 30, h: 'ground' },
  { model: 'buildings/boardwalk', x: -93, z: 12, rot: 270, h: 0.9 },
  // Boat jetties (data/boat.ts)
  ...DOCKS.filter((d) => d.jetty).map((d) => ({ model: 'buildings/jetty', x: d.x, z: d.z, rot: d.rot, h: d.h })),
  // Kokos-Inselchen
  { model: 'props/bench', x: 125, z: -116, rot: 250, h: 'ground' },
  { model: 'props/crates', x: 121, z: -121, rot: 40, h: 'ground' },
];

const ISLAND = 'island' as const;
const ISLET = { x: 128, z: -122, r: 20 };
const SAND_CAY = { x: 150, z: 80, r: 6 };

export const SCATTER: ScatterRule[] = [
  { models: ['vegetation/palm_a', 'vegetation/palm_b', 'vegetation/palm_c'], count: 150, area: ISLAND, minH: 0.5, maxH: 6, maxSlope: 0.5, scale: [0.85, 1.2], spacing: 5, pathMargin: 2, collide: true, seed: 1 },
  { models: ['vegetation/palm_b', 'vegetation/palm_a'], count: 30, area: { x: 5, z: 82, r: 42 }, minH: 0.35, maxH: 2.5, scale: [0.9, 1.2], spacing: 6, pathMargin: 2, collide: true, seed: 2 },
  { models: ['vegetation/jungle_tree'], count: 55, area: { x: -18, z: -22, r: 36 }, minH: 4, maxH: 30, maxSlope: 0.9, scale: [0.8, 1.3], spacing: 5, pathMargin: 2, collide: true, seed: 3 },
  { models: ['vegetation/jungle_tree', 'vegetation/palm_c'], count: 18, area: { x: -45, z: -50, r: 20 }, minH: 2, maxH: 30, scale: [0.8, 1.1], spacing: 5, pathMargin: 2, collide: true, seed: 4 },
  { models: ['vegetation/bush_a', 'vegetation/bush_b'], count: 130, area: ISLAND, minH: 0.9, maxH: 25, maxSlope: 0.8, scale: [0.7, 1.2], spacing: 3, pathMargin: 1.5, collide: true, seed: 5 },
  { models: ['vegetation/flowers'], count: 130, area: ISLAND, minH: 1.0, maxH: 12, maxSlope: 0.5, scale: [0.8, 1.3], spacing: 2, pathMargin: 1.2, collide: false, seed: 6 },
  { models: ['vegetation/grass'], count: 420, area: ISLAND, minH: 0.9, maxH: 25, maxSlope: 0.8, scale: [0.8, 1.6], spacing: 1.2, pathMargin: 1.0, collide: false, seed: 7 },
  { models: ['vegetation/mangrove'], count: 30, area: { x: -104, z: 10, r: 26 }, minH: -0.8, maxH: 0.4, scale: [0.85, 1.2], spacing: 4.5, pathMargin: 1, sink: 0.1, collide: true, seed: 8 },
  { models: ['rocks/rock_c'], count: 30, area: { x: 8, z: -90, r: 45 }, minH: -2.5, maxH: 2.5, scale: [0.7, 1.3], spacing: 5, pathMargin: 3, sink: 0.6, collide: true, seed: 9 },
  { models: ['rocks/rock_c', 'rocks/rock_a'], count: 14, area: { x: 50, z: -76, r: 25 }, minH: -2.5, maxH: 3, scale: [0.6, 1.1], spacing: 4, pathMargin: 2, sink: 0.4, collide: true, seed: 10 },
  { models: ['rocks/rock_a'], count: 60, area: ISLAND, minH: -1.2, maxH: 1.2, scale: [0.6, 1.3], spacing: 6, pathMargin: 2, sink: 0.25, collide: true, seed: 11 },
  { models: ['rocks/rock_a', 'rocks/rock_b', 'rocks/rock_c'], count: 22, area: { x: 5, z: -86, r: 40 }, minH: 2, maxH: 10, scale: [0.5, 1.0], spacing: 4, pathMargin: 2, sink: 0.3, collide: true, seed: 14 },
  { models: ['rocks/rock_b'], count: 14, area: { x: 6, z: -94, r: 26 }, minH: -0.6, maxH: 4, scale: [0.9, 1.3], spacing: 4, pathMargin: 2, sink: 0.2, collide: true, seed: 12 },
  // offshore: Kokos-Inselchen, the Sandbank cay and reef rocks at the Riffkante
  { models: ['vegetation/palm_a', 'vegetation/palm_b', 'vegetation/palm_c'], count: 14, area: ISLET, minH: 0.5, maxH: 8, scale: [0.9, 1.25], spacing: 4.5, collide: true, seed: 21 },
  { models: ['vegetation/bush_a', 'vegetation/bush_b'], count: 12, area: ISLET, minH: 1.0, maxH: 8, scale: [0.7, 1.1], spacing: 3, collide: true, seed: 22 },
  { models: ['vegetation/grass', 'vegetation/flowers'], count: 40, area: ISLET, minH: 1.0, maxH: 8, scale: [0.8, 1.4], spacing: 1.5, collide: false, seed: 23 },
  { models: ['rocks/rock_a'], count: 8, area: ISLET, minH: -1.0, maxH: 0.8, scale: [0.6, 1.2], spacing: 5, sink: 0.25, collide: true, seed: 24 },
  { models: ['vegetation/palm_b'], count: 2, area: SAND_CAY, minH: 0.05, maxH: 2, scale: [0.8, 1.0], spacing: 3, collide: true, seed: 25 },
  { models: ['rocks/rock_b', 'rocks/rock_a'], count: 10, area: { x: 72, z: -150, r: 24 }, minH: -2.6, maxH: -1.8, scale: [0.9, 1.3], spacing: 7, sink: 0.2, collide: true, seed: 26 },
  { models: ['rocks/pebble'], count: 90, area: ISLAND, minH: 0.2, maxH: 3, scale: [0.8, 1.6], spacing: 2.5, pathMargin: 0.5, collide: false, seed: 13 },
];
