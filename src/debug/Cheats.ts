import type { Game } from '../core/Game';
import type { GameState } from '../state/GameState';

/** Coins granted per cheat activation. */
const CHEAT_COINS = 5000;
/** Secret word typed on the keyboard. */
const WORD = 'bling'; // only letters that are not game keys
/** Taps on the coin badge within TAP_WINDOW ms (phones). */
const TAPS = 5;
const TAP_WINDOW = 2000;

/**
 * Hidden testing cheat: type "bling" (keyboard) or tap the coin counter 5× quickly (touch / mouse)
 * → +5000 coins, so everything in Rocco's shop can be bought right away.
 */
export function installCheats(game: Game, state: GameState, coinBadge: HTMLElement, toast: (text: string) => void): void {
  const grant = () => {
    state.coins += CHEAT_COINS;
    game.events.emit('coins:changed', { coins: state.coins, delta: CHEAT_COINS });
    toast('🐞 Test-Modus: +5000 Münzen');
  };
  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-WORD.length);
    if (typed === WORD) {
      typed = '';
      grant();
    }
  });
  let taps: number[] = [];
  coinBadge.style.pointerEvents = 'auto';
  coinBadge.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const now = performance.now();
    taps = [...taps.filter((t) => now - t < TAP_WINDOW), now];
    if (taps.length >= TAPS) {
      taps = [];
      grant();
    }
  });
}
