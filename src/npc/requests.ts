import { ECONOMY } from '../data/economy';
import type { FishDef, NeighborDef, SpotDef } from '../data/types';
import type { GameState, RequestState } from '../state/GameState';
import { removeFromCooler } from '../inventory/Cooler';
import type { Rng } from '../fishing/logic';

/**
 * Neighbor request rounds (pure). Each round every neighbor asks for one fish; each neighbor accepts
 * one delivery per round; when all are served a new round starts.
 */
export interface RequestContext {
  neighbors: readonly NeighborDef[];
  fish: readonly FishDef[];
  spots: readonly SpotDef[];
  hasBoat: boolean;
  rng: Rng;
}

/** Fish the player can currently reach (shore spots, or boat spots once the boat exists). */
export function reachableFish(ctx: RequestContext, rodTier: number): Set<string> {
  const out = new Set<string>();
  for (const s of ctx.spots) {
    if (s.hidden) continue;
    if (s.access === 'boat' && !ctx.hasBoat) continue;
    for (const e of s.species) {
      const f = ctx.fish.find((x) => x.id === e.fishId);
      if (f && f.minRodTier <= rodTier) out.add(f.id);
    }
  }
  return out;
}

export function rollRequests(state: GameState, ctx: RequestContext, round: number): Record<string, RequestState> {
  const reachable = reachableFish(ctx, state.rodTier);
  const taken = new Set<string>();
  const out: Record<string, RequestState> = {};
  for (const n of ctx.neighbors) {
    const prev = state.requests[n.id]?.fishId;
    let pool = n.requestPool.filter((id) => reachable.has(id));
    if (round === 1) {
      const easy = pool.filter((id) => (ECONOMY.firstRoundRarities as readonly string[]).includes(ctx.fish.find((f) => f.id === id)!.rarity));
      if (easy.length) pool = easy;
    }
    const fresh = pool.filter((id) => !taken.has(id) && id !== prev);
    const choices = fresh.length ? fresh : pool.filter((id) => !taken.has(id)).length ? pool.filter((id) => !taken.has(id)) : pool;
    const fishId = choices[Math.floor(ctx.rng() * choices.length)];
    taken.add(fishId);
    const def = ctx.fish.find((f) => f.id === fishId)!;
    const mult = n.rewardMultiplier[0] + ctx.rng() * (n.rewardMultiplier[1] - n.rewardMultiplier[0]);
    const reward = Math.max(ECONOMY.rewardStep, Math.round((def.basePrice * mult) / ECONOMY.rewardStep) * ECONOMY.rewardStep);
    out[n.id] = { fishId, reward, delivered: false };
  }
  return out;
}

export function startRound(state: GameState, ctx: RequestContext): void {
  state.round += 1;
  state.requests = rollRequests(state, ctx, state.round);
}

export function allDelivered(state: GameState): boolean {
  const r = Object.values(state.requests);
  return r.length > 0 && r.every((x) => x.delivered);
}

/** The heaviest matching fish in the cooler for a neighbor's request, or null. */
export function matchingFish(state: GameState, neighborId: string) {
  const req = state.requests[neighborId];
  if (!req || req.delivered) return null;
  const matches = state.cooler.filter((f) => f.fishId === req.fishId);
  return matches.sort((a, b) => b.weight - a.weight)[0] ?? null;
}

export interface DeliveryResult {
  coins: number;
  roundAdvanced: boolean;
}

export function deliver(state: GameState, neighborId: string, ctx: RequestContext): DeliveryResult | null {
  const req = state.requests[neighborId];
  const fish = matchingFish(state, neighborId);
  if (!req || !fish) return null;
  removeFromCooler(state, fish.uid);
  req.delivered = true;
  state.coins += req.reward;
  state.totalEarned += req.reward;
  let roundAdvanced = false;
  if (allDelivered(state)) {
    startRound(state, ctx);
    roundAdvanced = true;
  }
  return { coins: req.reward, roundAdvanced };
}

/** Uids of fish currently wanted by an open request (so the trader can warn before selling them). */
export function reservedFish(state: GameState): Map<string, string> {
  const out = new Map<string, string>();
  for (const [nid, req] of Object.entries(state.requests)) {
    if (req.delivered) continue;
    const f = matchingFish(state, nid);
    if (f && !out.has(f.uid)) out.set(f.uid, nid);
  }
  return out;
}
