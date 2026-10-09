/** Shared data schemas. Content files in this folder are plain typed objects — edit them to rebalance. */

export type Rarity = 'common' | 'uncommon' | 'rare';

export interface FishDef {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  /** Trader base price in coins (for an average-weight fish). */
  basePrice: number;
  /** Weight range in kg. Heavier fish are worth more and fight harder. */
  weight: [number, number];
  /** Model length in meters at average weight (the .glb is 1 m long). */
  length: number;
  fight: {
    /** 0..1 how hard the fish pulls. */
    strength: number;
    /** 0..1 how often it makes sudden runs. */
    burst: number;
    /** 0..1 how long before it tires. */
    stamina: number;
  };
  /** Minimum rod tier needed to land it (line snaps more easily below). */
  minRodTier: number;
  /** Asset key, e.g. "fish/grunzer". */
  model: string;
}

export interface SpotDef {
  id: string;
  name: string;
  /** 'boat' spots are only reachable once the boat exists (Milestone 3). */
  access: 'shore' | 'boat';
  /** Center of the fishing water in map coordinates (meters). */
  x: number;
  z: number;
  radius: number;
  /** Weighted species table. */
  species: { fishId: string; weight: number }[];
  /** Seconds until a bite [min, max]. */
  biteDelay: [number, number];
  /** Hidden spots get revealed by neighbor hints (later milestone). */
  hidden?: boolean;
}

export type RewardDef =
  | { type: 'coins'; amount: number }
  | { type: 'hint'; spotId: string }
  | { type: 'bait'; baitId: string; count: number }
  | { type: 'cosmetic'; itemId: string };

export type Anchor = { anchor: string } | { x: number; z: number; rot: number; h?: number };

export interface NeighborDef {
  id: string;
  name: string;
  /** Short role shown under the name, e.g. "Alter Fischer". */
  title: string;
  model: string;
  at: Anchor;
  /** Pose: 'stand' | 'sit' | 'lie' (hammock). */
  pose: 'stand' | 'sit' | 'lie';
  /** Fish this neighbor may ask for. */
  requestPool: string[];
  /** Reward multiplier on the trader base price [min, max]. */
  rewardMultiplier: [number, number];
  /** Chance (0..1) that a delivery also gives an extra reward (Milestone 2+). */
  extraRewardChance: number;
  extraRewards: RewardDef[];
  lines: {
    greet: string[];
    request: string;
    thanks: string[];
    done: string[];
  };
}

export interface Placement {
  model: string;
  x: number;
  z: number;
  /** Degrees; direction the model's front faces: 0 = south (+z), 90 = east, 180 = north, 270 = west. */
  rot?: number;
  /** Height above sea level of the model origin; 'ground' samples the terrain. */
  h?: number | 'ground';
}

export interface ScatterRule {
  models: string[];
  count: number;
  /** Circle in map coordinates, or the whole island. */
  area: { x: number; z: number; r: number } | 'island';
  /** Allowed terrain height range. */
  minH: number;
  maxH: number;
  /** Max terrain slope (rise/run). */
  maxSlope?: number;
  scale: [number, number];
  /** Minimum distance between instances of this rule. */
  spacing: number;
  /** Keep this far from path centerlines (in addition to half the path width). */
  pathMargin?: number;
  /** Sink into the ground by this many meters. */
  sink?: number;
  /** Instances get collision (from the model's COL_* meshes). */
  collide: boolean;
  seed: number;
}
