/** Everything that persists between sessions. Bump SAVE_VERSION and migrate in save.ts when changing shape. */
export const SAVE_VERSION = 1;

export interface CaughtFish {
  uid: string;
  fishId: string;
  /** kg */
  weight: number;
  /** Trader value in coins (already includes the weight bonus). */
  value: number;
}

export interface RequestState {
  fishId: string;
  reward: number;
  delivered: boolean;
}

export interface GameState {
  version: number;
  coins: number;
  totalEarned: number;
  round: number;
  hasRod: boolean;
  rodTier: number;
  coolerTier: number;
  cooler: CaughtFish[];
  /** Keyed by neighbor id. */
  requests: Record<string, RequestState>;
  /** Catch log keyed by fish id. */
  log: Record<string, { count: number; best: number }>;
  player: { x: number; z: number; h: number; yaw: number } | null;
  /** Game clock in hours (0..24). */
  timeOfDay: number;
  boat: BoatState;
  map: MapState;
}

export interface BoatState {
  owned: boolean;
  motor: boolean;
  /** Pier where the boat is moored (data/boat.ts DOCKS). */
  dock: string;
  /** Set while the cat is out in the boat (map position + heading in degrees). */
  at: { x: number; z: number; yaw: number } | null;
}

export interface MapState {
  /** Explored cells of the map grid as a base64 bit field (see map/Exploration.ts). */
  fog: string;
  /** Ids of map markers already discovered (spots, piers, places…). */
  known: string[];
}

export function newGameState(): GameState {
  return {
    version: SAVE_VERSION,
    coins: 0,
    totalEarned: 0,
    round: 0,
    hasRod: true,
    rodTier: 1,
    coolerTier: 1,
    cooler: [],
    requests: {},
    log: {},
    player: null,
    timeOfDay: 8,
    boat: { owned: false, motor: false, dock: 'hafen', at: null },
    map: { fog: '', known: [] },
  };
}
