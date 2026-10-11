import { BOAT, RODS, rodTier, type RodTier } from '../data/upgrades';
import type { GameState } from '../state/GameState';

/** Pure shop rules for rod upgrades. */
export type RodOffer =
  | { rod: RodTier; status: 'owned' }
  | { rod: RodTier; status: 'buyable' }
  | { rod: RodTier; status: 'tooExpensive'; missing: number }
  | { rod: RodTier; status: 'locked'; requires: RodTier };

/** Every purchasable rod (tier ≥ 2) with its status for this player. Tiers must be bought in order. */
export function rodOffers(state: GameState): RodOffer[] {
  return RODS.filter((r) => r.price > 0).map((rod) => {
    if (!state.hasRod) return { rod, status: 'locked', requires: RODS[0] };
    if (rod.tier <= state.rodTier) return { rod, status: 'owned' };
    if (rod.tier > state.rodTier + 1) return { rod, status: 'locked', requires: rodTier(rod.tier - 1) };
    if (state.coins < rod.price) return { rod, status: 'tooExpensive', missing: rod.price - state.coins };
    return { rod, status: 'buyable' };
  });
}

/** Buy the next rod tier. Returns the new rod, or null if not possible. No money is lost on failure. */
export function buyNextRod(state: GameState): RodTier | null {
  const next = RODS.find((r) => r.tier === state.rodTier + 1);
  if (!next || state.coins < next.price || !state.hasRod) return null;
  state.coins -= next.price;
  state.rodTier = next.tier;
  return next;
}

/** Boat & motor: the motor needs the boat first. */
export type GearOffer =
  | { id: 'boat' | 'motor'; name: string; price: number; status: 'owned' | 'buyable' }
  | { id: 'boat' | 'motor'; name: string; price: number; status: 'tooExpensive'; missing: number }
  | { id: 'boat' | 'motor'; name: string; price: number; status: 'locked'; requires: string };

export function boatOffers(state: GameState): GearOffer[] {
  const offer = (id: 'boat' | 'motor', name: string, price: number, owned: boolean, requires: string | null): GearOffer => {
    if (owned) return { id, name, price, status: 'owned' };
    if (requires) return { id, name, price, status: 'locked', requires };
    if (state.coins < price) return { id, name, price, status: 'tooExpensive', missing: price - state.coins };
    return { id, name, price, status: 'buyable' };
  };
  return [
    offer('boat', BOAT.name, BOAT.price, state.boat.owned, null),
    offer('motor', BOAT.motor.name, BOAT.motor.price, state.boat.motor, state.boat.owned ? null : BOAT.name),
  ];
}

/** Buy the boat or the motor. Returns false (and changes nothing) if not possible. */
export function buyGear(state: GameState, id: 'boat' | 'motor'): boolean {
  const o = boatOffers(state).find((x) => x.id === id);
  if (!o || o.status !== 'buyable') return false;
  state.coins -= o.price;
  if (id === 'boat') {
    state.boat.owned = true;
    state.boat.dock = 'hafen';
  } else state.boat.motor = true;
  return true;
}
