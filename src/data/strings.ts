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
  rackLook: 'Neue Angeln ansehen',
  talk: 'Reden',
  sell: 'Fische verkaufen',
  cast: 'Auswerfen (halten)',
  hook: 'Anschlagen!',
  reel: 'Einholen (halten)',
  cancelFishing: 'Abbrechen',
  boardBoat: 'Ins Boot steigen',
  dockBoat: 'Anlegen ({dock})',

  intro: [
    'Willkommen auf der Angler-Insel, Mika!',
    'Deine Bambusrute hast du schon dabei. Finde die Angelplätze rund um die Insel — achte auf blubberndes Wasser.',
    'Die Nachbarn wünschen sich bestimmte Fische. Fische verkaufen kannst du bei Pelle am Hafen — und bessere Angeln gibt es hier bei Rocco.',
    'Mit {mapKey} öffnest du deine Karte. Sie füllt sich, während du die Insel erkundest.',
  ],
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
  musicCredit: 'Musik: {credits}',

  // game menu
  menuTitle: 'Menü',
  menuVersion: 'Version {version}',
  menuResume: '▶ Weiterspielen',
  menuMusicOn: '🔊 Musik: an',
  menuMusicOff: '🔇 Musik: aus',
  menuHarbor: '🏠 Zurück zum Hafen',
  menuHarborHint: 'Falls du irgendwo feststeckst',
  menuControls: '🎮 Steuerung',
  menuRestart: '🔄 Neues Spiel',
  menuRestartHint: 'Fortschritt löschen und von vorn beginnen',
  restartTitle: 'Wirklich neu anfangen?',
  restartText: 'Münzen, Angeln, Fische und Runden gehen verloren. Das lässt sich nicht rückgängig machen.',
  restartYes: 'Ja, neues Spiel starten',
  restartNo: 'Nein, zurück',
  rescued: 'Hoppla! Mika ist wieder an Land.',
  backToHarbor: 'Zurück am Hafen.',
  controlsTouch: 'Links Daumen ziehen = laufen · rechts wischen = Kamera · großer Knopf = angeln/reden/kaufen · ⤒ springen · ✕ abbrechen · 🗺 Karte',

  // shop
  shop: 'Laden (Rocco)',
  shopTitle: 'Rocco — Angeln & Boote',
  shopGreet: 'Moin, Mika! Bessere Angel, größere Fische. Du angelst gerade mit der <b>{rod}</b>.',
  shopMax: 'Du hast schon die beste Angel der Insel!',
  shopBuy: '{rod} — {price} Münzen',
  shopOwned: '✔ {rod}',
  shopOwnedHint: 'Gehört dir',
  shopLocked: 'Erst die {rod} kaufen',
  shopMissing: 'Dir fehlen noch {coins} Münzen',
  shopStats: 'Wurfweite {cast} m · Schnur hält {tension} % · Einholen {reel} %',
  shopThanks: 'Viel Spaß mit der neuen {rod}! Probier sie gleich am Wasser aus.',
  rodUpgraded: 'Neue Angel: {rod}!',
  shopBoatSection: 'Boot',
  shopGear: '{name} — {price} Münzen',
  shopGearLocked: 'Erst das {name} kaufen',
  shopCoolerLocked: 'Erst die {name} kaufen',
  boatBought: 'Dein Ruderboot liegt jetzt am Ende vom langen Pier! Steig dort ein. Anlegen kannst du an jedem ⚓ Anleger.',
  motorBought: 'Der Außenbordmotor ist montiert. Brumm brumm!',
  gearBought: 'Neu: {name}!',
  coolerUpgraded: 'Deine Kühlbox fasst jetzt {slots} Fische!',
  tooStrong: 'Der ist zu stark für deine Angel! Im Laden gibt es bessere.',

  // boat
  boatBrought: 'Rocco hat dein Boot hierher gebracht.',
  boatDocked: 'Angelegt: {dock}',
  boatTooFar: 'Die Strömung treibt dich zurück zur Insel.',
  boatAground: 'Zu flach für das Boot!',
  noFishFromBoat: 'Erst anhalten, dann auswerfen.',

  // map
  map: 'Karte',
  mapTitle: 'Karte der Angler-Insel',
  mapLegend: '🎣 Angelplatz · ⚓ Anlegestelle · ★ Ort',
  mapClose: 'Schließen',
  mapNew: 'Neu auf der Karte: {name}',
  mapHint: '{name} hat dir die {spot} auf der Karte eingezeichnet!',
  mapYou: 'Du',
  mapBoat: 'Dein Boot',
  mapExplored: '{pct} % erkundet',
  mapShop: 'Angeln & Boote',

  weight: '{kg} kg',
  rarity: { common: 'Häufig', uncommon: 'Ungewöhnlich', rare: 'Selten' },
  controlsKeyboard: 'WASD laufen · Pfeiltasten/Rechtsklick Kamera · Leertaste springen · Shift rennen · E interagieren · F/Linksklick angeln · Q abbrechen · K Karte · M Musik',
  controlsGamepad: 'Linker Stick laufen · Rechter Stick Kamera · A springen · X interagieren · RT angeln · B abbrechen · LT rennen · Select Karte · Start Menü',
} as const;

/** Simple {placeholder} replacement. */
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function kg(weight: number): string {
  return fmt(T.weight, { kg: weight.toFixed(1).replace('.', ',') });
}
