import type { NeighborDef } from './types';

/**
 * Neighbors with fish requests. Each round every neighbor wants one fish from their pool; you can
 * deliver once per round. When everyone is served, a new round starts. `{fish}` / `{reward}` are
 * replaced in the lines.
 */
export const NEIGHBORS = [
  {
    id: 'walter',
    name: 'Opa Walter',
    title: 'Alter Fischer am Pier',
    model: 'characters/walrus',
    at: { anchor: 'ANCHOR_walter' },
    pose: 'sit',
    requestPool: ['schnapper', 'zackenbarsch', 'grunzer', 'bonefisch', 'tarpun', 'drueckerfisch'],
    rewardMultiplier: [2.2, 3.0],
    extraRewardChance: 0.3,
    extraRewards: [{ type: 'hint', spotId: 'riffkante' }],
    lines: {
      greet: ['Moin moin, Mika! Die Fische beißen heute, das spür ich im Schnurrbart.', 'Ahoi, junge Katze!'],
      request: 'Früher hab ich jeden Tag {fish} gefangen… Bringst du mir einen? Ich geb dir {reward} Münzen.',
      thanks: ['Na, sieh mal einer an! Der ist ja prächtig. Danke dir!', 'Hoho! Genau so einer. Hier, deine Münzen.'],
      done: ['Für heute bin ich glücklich. Schau morgen wieder vorbei — äh, nächste Runde!'],
    },
  },
  {
    id: 'bruno',
    name: 'Bruno',
    title: 'Koch der Strandküche',
    model: 'characters/bear',
    at: { anchor: 'ANCHOR_cook' },
    pose: 'stand',
    requestPool: ['pompano', 'grunzer', 'schnapper', 'snook', 'drueckerfisch', 'zackenbarsch'],
    rewardMultiplier: [2.0, 2.6],
    extraRewardChance: 0.3,
    extraRewards: [{ type: 'bait', baitId: 'krabbe', count: 3 }],
    lines: {
      greet: ['Mmmh, riechst du das? Kokos-Curry!', 'Willkommen in Brunos Strandküche!'],
      request: 'Für mein Tagesgericht brauche ich {fish}. Bringst du mir einen? {reward} Münzen!',
      thanks: ['Perfekt! Der kommt sofort auf den Grill.', 'Wunderbar frisch! Danke, Mika!'],
      done: ['Die Küche ist versorgt. Komm in der nächsten Runde wieder!'],
    },
  },
  {
    id: 'fritzi',
    name: 'Fritzi',
    title: 'Hängematten-Philosophin',
    model: 'characters/sloth',
    at: { anchor: 'ANCHOR_hammock' },
    pose: 'lie',
    requestPool: ['snook', 'pompano', 'bonefisch', 'grunzer', 'tarpun'],
    rewardMultiplier: [2.4, 3.0],
    extraRewardChance: 0.3,
    extraRewards: [{ type: 'cosmetic', itemId: 'blumenhut' }],
    lines: {
      greet: ['Ooooh… hallo… Mika…', 'Zzz… oh… Besuch…'],
      request: 'Ich hab… geträumt… von {fish}… Bringst du… mir… einen…? {reward}… Münzen…',
      thanks: ['Wie… schööön… Danke…', 'Mein Traum… wird wahr…'],
      done: ['Zzz… bis… zur nächsten… Runde…'],
    },
  },
] as const satisfies readonly NeighborDef[];

/** The fish trader is not a neighbor (no requests), just a buyer. */
export const TRADER = {
  id: 'pelle',
  name: 'Pelle',
  title: 'Fischhändler',
  model: 'characters/pelican',
  at: { anchor: 'ANCHOR_trader' },
  lines: {
    greet: ['Frischer Fang? Pelle kauft alles!', 'Hallo Mika! Was hast du heute im Kühlbehälter?'],
    empty: 'Deine Kühlbox ist leer. Komm mit Fisch wieder!',
    sold: 'Gutes Geschäft!',
  },
} as const;
