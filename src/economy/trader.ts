import type { GameState } from '../state/GameState';
import { removeFromCooler } from '../inventory/Cooler';

/** Sell fish to the trader at their stored value. Returns coins earned. */
export function sellFish(state: GameState, uids: string[]): number {
  let total = 0;
  for (const uid of uids) {
    const f = removeFromCooler(state, uid);
    if (f) total += f.value;
  }
  state.coins += total;
  state.totalEarned += total;
  return total;
}
