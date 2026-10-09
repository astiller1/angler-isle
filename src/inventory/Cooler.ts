import type { CaughtFish, GameState } from '../state/GameState';
import { coolerTier } from '../data/upgrades';

/** Pure cooler rules (capacity from the cooler tier). */
export function coolerCapacity(state: GameState): number {
  return coolerTier(state.coolerTier).slots;
}

export function coolerFull(state: GameState): boolean {
  return state.cooler.length >= coolerCapacity(state);
}

export function addToCooler(state: GameState, fish: CaughtFish): boolean {
  if (coolerFull(state)) return false;
  state.cooler.push(fish);
  return true;
}

export function removeFromCooler(state: GameState, uid: string): CaughtFish | null {
  const i = state.cooler.findIndex((f) => f.uid === uid);
  if (i < 0) return null;
  return state.cooler.splice(i, 1)[0];
}

let uidCounter = 0;
export function newUid(): string {
  uidCounter = (uidCounter + 1) % 1e6;
  return `${Date.now().toString(36)}-${uidCounter.toString(36)}`;
}
