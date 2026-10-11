import { newGameState, SAVE_VERSION, type GameState } from './GameState';

const KEY = 'angler-insel-save';

/** Load the save (or a fresh state). `?reset` in the URL starts over. */
export function loadState(): { state: GameState; isNew: boolean } {
  try {
    if (new URLSearchParams(location.search).has('reset')) localStorage.removeItem(KEY);
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = migrate(JSON.parse(raw));
      if (s) return { state: s, isNew: false };
    }
  } catch {
    /* storage unavailable or corrupt → new game */
  }
  return { state: newGameState(), isNew: true };
}

export function saveState(state: GameState): void {
  if (wiped) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore (private mode etc.) */
  }
}

function migrate(s: Partial<GameState> & { version?: number }): GameState | null {
  if (!s || typeof s !== 'object') return null;
  if (s.version === SAVE_VERSION) return { ...newGameState(), ...s } as GameState;
  return null; // unknown version → new game (add migrations here when SAVE_VERSION changes)
}

let wiped = false;

/** Delete the save and stop further saving (until reload) — used by "Neues Spiel". */
export function wipeSave(): void {
  wiped = true;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function isWiped(): boolean {
  return wiped;
}
