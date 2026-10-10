/** All player-facing text (German). Keep game code free of literal UI strings. */
export const T = {
  title: 'Angler-Insel',
  loading: 'Lade Insel…',
  coins: 'Münzen',
  round: 'Runde',
  cooler: 'Kühlbox',
  coolerFull: 'Kühlbox voll!',
  requests: 'Wünsche der Nachbarn',
  delivered: 'erledigt',

  // prompts (verb shown after the button glyph)
  takeRod: 'Angel nehmen',
  talk: 'Reden',
  sell: 'Fische verkaufen',
  cast: 'Auswerfen (halten)',
  hook: 'Anschlagen!',
  reel: 'Einholen (halten)',
  cancelFishing: 'Abbrechen',

  intro: [
    'Willkommen auf der Angler-Insel, Mika!',
    'Nimm dir eine Angel vom Regal und finde die Angelplätze rund um die Insel — achte auf blubberndes Wasser.',
    'Die Nachbarn wünschen sich bestimmte Fische. Fische verkaufen kannst du bei Pelle am Hafen.',
  ],
  gotRod: 'Du hast eine Bambusrute! Geh zum Wasser und halte {fish}, um auszuwerfen.',
  noRod: 'Du brauchst erst eine Angel. Im Köderladen am Hafen hängt eine am Regal.',
  notWater: 'Da ist kein Wasser…',
  noFishHere: 'Hier beißt nichts. Such blubberndes Wasser!',
  bite: 'Biss!',
  missed: 'Zu langsam — der Fisch ist weg.',
  snapped: 'Die Schnur ist gerissen! Der Fisch ist entkommen.',
  slack: 'Zu locker — der Fisch hat sich losgerissen.',
  caught: 'Gefangen!',
  newSpecies: 'Neue Art!',
  rare: 'Selten!',
  spotEntered: 'Angelplatz: {name}',

  coolerFullTitle: 'Deine Kühlbox ist voll',
  coolerFullText: 'Welchen Fisch möchtest du freilassen?',
  releaseNew: '{fish} freilassen',
  releaseOld: '{fish} ({weight}) freilassen und neuen behalten',

  traderTitle: 'Pelle — Fischhandel',
  sellOne: '{fish} ({weight}) — {coins} Münzen',
  sellAll: 'Alle verkaufen — {coins} Münzen',
  leave: 'Tschüss!',
  reserved: '(gewünscht von {name})',

  deliver: '{fish} abgeben — {coins} Münzen',
  notYet: 'Ich habe noch keinen {fish}.',
  roundStart: 'Runde {round}: Die Nachbarn haben neue Wünsche!',
  roundDone: 'Alle Wünsche erfüllt! Eine neue Runde beginnt.',
  coinsGained: '+{coins} Münzen',

  // shop
  shop: 'Laden (Rocco)',
  shopTitle: 'Rocco — Köder & Angeln',
  shopGreet: 'Moin, Mika! Bessere Angel, größere Fische. Du angelst gerade mit der <b>{rod}</b>.',
  shopMax: 'Du hast schon die beste Angel der Insel! Mehr hab ich nicht im Laden.',
  shopBuy: '{rod} — {price} Münzen',
  shopOwned: '✔ {rod}',
  shopOwnedHint: 'Gehört dir',
  shopLocked: 'Erst die {rod} kaufen',
  shopMissing: 'Dir fehlen noch {coins} Münzen',
  shopStats: 'Wurfweite {cast} m · Schnur hält {tension} % · Einholen {reel} %',
  shopThanks: 'Viel Spaß mit der neuen {rod}! Probier sie gleich am Wasser aus.',
  rodUpgraded: 'Neue Angel: {rod}!',
  tooStrong: 'Der ist zu stark für deine Angel! Im Laden gibt es bessere.',

  weight: '{kg} kg',
  rarity: { common: 'Häufig', uncommon: 'Ungewöhnlich', rare: 'Selten' },
  controlsKeyboard: 'WASD laufen · Pfeiltasten/Rechtsklick Kamera · Leertaste springen · Shift rennen · E interagieren · F/Linksklick angeln · Q abbrechen · M Musik',
  controlsGamepad: 'Linker Stick laufen · Rechter Stick Kamera · A springen · X interagieren · RT angeln · B abbrechen · LT rennen',
} as const;

/** Simple {placeholder} replacement. */
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function kg(weight: number): string {
  return fmt(T.weight, { kg: weight.toFixed(1).replace('.', ',') });
}
