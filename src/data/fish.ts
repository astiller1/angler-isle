import type { FishDef } from './types';

/** All fish species. Prices: common ~8–12, uncommon ~18–25, rare ~45–65 coins. */
export const FISH = [
  {
    id: 'grunzer',
    name: 'Blaustreifen-Grunzer',
    description: 'Grunzt leise, wenn man ihn aus dem Wasser holt. Liebt Hafenpfähle.',
    rarity: 'common',
    basePrice: 8,
    weight: [0.3, 0.9],
    length: 0.3,
    fight: { strength: 0.25, burst: 0.3, stamina: 0.3 },
    minRodTier: 1,
    model: 'fish/grunzer',
  },
  {
    id: 'schnapper',
    name: 'Rotschnapper',
    description: 'Leuchtend rot und ziemlich frech. Schnappt nach allem, was glänzt.',
    rarity: 'uncommon',
    basePrice: 19,
    weight: [1.0, 4.0],
    length: 0.5,
    fight: { strength: 0.45, burst: 0.45, stamina: 0.5 },
    minRodTier: 1,
    model: 'fish/schnapper',
  },
  {
    id: 'drueckerfisch',
    name: 'Königin-Drückerfisch',
    description: 'Bunt wie ein Papagei, stur wie ein Esel. Versteckt sich zwischen Felsen.',
    rarity: 'common',
    basePrice: 11,
    weight: [0.5, 1.5],
    length: 0.35,
    fight: { strength: 0.35, burst: 0.6, stamina: 0.35 },
    minRodTier: 1,
    model: 'fish/drueckerfisch',
  },
  {
    id: 'zackenbarsch',
    name: 'Zackenbarsch',
    description: 'Ein gemütlicher Riese, der sich in Felsspalten festsaugt. Selten und schwer!',
    rarity: 'rare',
    basePrice: 48,
    weight: [4, 12],
    length: 0.8,
    fight: { strength: 0.7, burst: 0.35, stamina: 0.75 },
    minRodTier: 1,
    model: 'fish/zackenbarsch',
  },
  {
    id: 'snook',
    name: 'Snook',
    description: 'Lauert im Schatten der Mangrovenwurzeln. Erkennbar am schwarzen Strich.',
    rarity: 'common',
    basePrice: 12,
    weight: [1, 3],
    length: 0.5,
    fight: { strength: 0.4, burst: 0.4, stamina: 0.45 },
    minRodTier: 1,
    model: 'fish/snook',
  },
  {
    id: 'tarpun',
    name: 'Silberkönig-Tarpun',
    description: 'Springt meterhoch aus dem Wasser. Der Stolz jeder Anglerin und jedes Anglers.',
    rarity: 'rare',
    basePrice: 62,
    weight: [8, 25],
    length: 1.0,
    fight: { strength: 0.85, burst: 0.7, stamina: 0.8 },
    minRodTier: 1,
    model: 'fish/tarpun',
  },
  {
    id: 'pompano',
    name: 'Pompano',
    description: 'Flitzt durch die Brandung und glänzt gelb am Bauch.',
    rarity: 'common',
    basePrice: 9,
    weight: [0.5, 1.8],
    length: 0.35,
    fight: { strength: 0.3, burst: 0.45, stamina: 0.3 },
    minRodTier: 1,
    model: 'fish/pompano',
  },
  {
    id: 'bonefisch',
    name: 'Grätenfisch',
    description: 'Der „Geist der Flachwasser“ — blitzschnell und schwer zu sehen.',
    rarity: 'uncommon',
    basePrice: 23,
    weight: [1, 4],
    length: 0.5,
    fight: { strength: 0.5, burst: 0.75, stamina: 0.5 },
    minRodTier: 1,
    model: 'fish/bonefisch',
  },
] as const satisfies readonly FishDef[];

export type FishId = (typeof FISH)[number]['id'];

const BY_ID = new Map<string, FishDef>(FISH.map((f) => [f.id, f]));

export function fishById(id: string): FishDef {
  const f = BY_ID.get(id);
  if (!f) throw new Error(`Unknown fish "${id}"`);
  return f;
}
