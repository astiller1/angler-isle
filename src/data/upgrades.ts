/**
 * Upgrade stats and prices. Milestone 1 uses only tier 1 of rods and coolers; the shop (Milestone 2)
 * and boat (Milestone 3) read the rest. Tuned so the boat is affordable after ~2–3 rounds.
 */
export interface RodTier {
  tier: number;
  name: string;
  price: number;
  /** Max cast distance in meters. */
  castMax: number;
  /** Tension at which the line snaps (1.0 = basic). */
  tensionLimit: number;
  /** Reel speed multiplier. */
  reelSpeed: number;
  model: string;
}

export interface CoolerTier {
  tier: number;
  name: string;
  price: number;
  slots: number;
  model: string;
}

export interface BaitDef {
  id: string;
  name: string;
  price: number;
  /** Multiplies the spot weight of these species while the bait is active. */
  attracts: Record<string, number>;
  /** Bite delay multiplier (<1 = faster). */
  biteSpeed: number;
}

export const RODS: RodTier[] = [
  { tier: 1, name: 'Bambusrute', price: 0, castMax: 15, tensionLimit: 1.0, reelSpeed: 1.0, model: 'props/rod' },
  { tier: 2, name: 'Glasfaserrute', price: 180, castMax: 20, tensionLimit: 1.3, reelSpeed: 1.2, model: 'props/rod' },
  { tier: 3, name: 'Karbon-Profirute', price: 450, castMax: 26, tensionLimit: 1.7, reelSpeed: 1.4, model: 'props/rod' },
];

export const COOLERS: CoolerTier[] = [
  { tier: 1, name: 'Kleine Kühlbox', price: 0, slots: 4, model: 'props/cooler_small' },
  { tier: 2, name: 'Mittlere Kühlbox', price: 150, slots: 6, model: 'props/cooler_small' },
  { tier: 3, name: 'Große Kühlbox', price: 350, slots: 8, model: 'props/cooler_small' },
];

export const BAITS: BaitDef[] = [
  { id: 'krabbe', name: 'Krabbenköder', price: 12, attracts: { zackenbarsch: 2.5, drueckerfisch: 1.5 }, biteSpeed: 0.85 },
  { id: 'garnele', name: 'Garnelenköder', price: 10, attracts: { bonefisch: 2.5, schnapper: 1.8 }, biteSpeed: 0.85 },
  { id: 'glitzer', name: 'Glitzerlöffel', price: 20, attracts: { tarpun: 2.5, snook: 1.3 }, biteSpeed: 0.9 },
];

export const BOAT = {
  name: 'Ruderboot',
  price: 800,
  speed: 5,
  motor: { name: 'Außenbordmotor', price: 400, speed: 10 },
};

export function rodTier(tier: number): RodTier {
  return RODS.find((r) => r.tier === tier) ?? RODS[0];
}

export function coolerTier(tier: number): CoolerTier {
  return COOLERS.find((c) => c.tier === tier) ?? COOLERS[0];
}
