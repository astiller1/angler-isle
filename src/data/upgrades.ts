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
  description: string;
}

export interface CoolerTier {
  tier: number;
  name: string;
  price: number;
  slots: number;
  description: string;
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

/** Rod progression: the starter rod is free; each next tier must be bought in order at the tackle shop. */
export const RODS: RodTier[] = [
  { tier: 1, name: 'Bambusrute', price: 0, castMax: 15, tensionLimit: 1.0, reelSpeed: 1.0, model: 'props/rod',
    description: 'Leicht und ehrlich. Reicht für die meisten Fische am Ufer.' },
  { tier: 2, name: 'Glasfaserrute', price: 180, castMax: 20, tensionLimit: 1.3, reelSpeed: 1.2, model: 'props/rod_glass',
    description: 'Weiter werfen, mehr aushalten. Damit hält die Schnur auch einem Tarpun stand.' },
  { tier: 3, name: 'Karbon-Profirute', price: 450, castMax: 26, tensionLimit: 1.7, reelSpeed: 1.4, model: 'props/rod_carbon',
    description: 'Für echte Profis: riesige Wurfweite, kaum zu zerreißen, blitzschnell eingeholt.' },
];

/** Cooler upgrades: the box on the cat's back stays the same, it just holds more fish (bought in order). */
export const COOLERS: CoolerTier[] = [
  { tier: 1, name: 'Kühlbox', price: 0, slots: 4, description: 'Platz für 4 Fische.' },
  { tier: 2, name: 'Kühlbox-Erweiterung', price: 150, slots: 6, description: 'Clever gepackt: Platz für 6 Fische.' },
  { tier: 3, name: 'Profi-Kühlbox', price: 350, slots: 8, description: 'Mit Eis-Trick: Platz für 8 Fische.' },
];

export const BAITS: BaitDef[] = [
  { id: 'krabbe', name: 'Krabbenköder', price: 12, attracts: { zackenbarsch: 2.5, drueckerfisch: 1.5 }, biteSpeed: 0.85 },
  { id: 'garnele', name: 'Garnelenköder', price: 10, attracts: { bonefisch: 2.5, schnapper: 1.8 }, biteSpeed: 0.85 },
  { id: 'glitzer', name: 'Glitzerlöffel', price: 20, attracts: { tarpun: 2.5, snook: 1.3 }, biteSpeed: 0.9 },
];

/** Boat purchase (handling and piers: data/boat.ts). */
export const BOAT = {
  name: 'Ruderboot',
  price: 800,
  description: 'Dein eigenes Boot! Anlegen und ablegen kannst du an den Stegen (⚓ auf der Karte).',
  motor: { name: 'Außenbordmotor', price: 400, description: 'Doppelt so schnell übers Wasser — ab zur offenen See!' },
};

export function rodTier(tier: number): RodTier {
  return RODS.find((r) => r.tier === tier) ?? RODS[0];
}

export function coolerTier(tier: number): CoolerTier {
  return COOLERS.find((c) => c.tier === tier) ?? COOLERS[0];
}
