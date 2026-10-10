import type { FishDef, SpotDef } from '../data/types';
import type { RodTier } from '../data/upgrades';

/**
 * Pure fishing rules: cast power, bite timing, and the reel/tension model.
 * No three.js here — FishingSystem turns this into visuals and input.
 */
export const FISHING = {
  chargeTime: 1.1,
  minCast: 4,
  /** Seconds the player has to hook after a bite. */
  biteWindow: 1.05,
  rareBiteWindow: 0.8,
  /** Nibbles (small bobber dips) before the real bite. */
  nibbles: [1, 3] as [number, number],
  /** Line progress per second at full reel for a weightless fish (1 = whole cast distance). */
  reelRate: 0.17,
  tensionResponse: 4.0,
  /** Seconds above the rod's tension limit before the line snaps. */
  snapTime: 0.55,
  /** Seconds of slack before the fish shakes off. */
  slackTime: 3.0,
  slackLevel: 0.08,
  /** Danger zone starts at this fraction of the limit (UI). */
  dangerFrom: 0.8,
  /** Line-out limit (relative to the cast) when a fish is too strong for the rod. */
  lineOut: 1.25,
};

export type Rng = () => number;

export function weightedPick<T extends { weight: number }>(items: readonly T[], rng: Rng): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const i of items) {
    r -= i.weight;
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}

export function castDistance(power: number, rod: RodTier): number {
  const p = Math.max(0, Math.min(1, power));
  return FISHING.minCast + (rod.castMax - FISHING.minCast) * p;
}

export function rollBiteDelay(spot: SpotDef, rng: Rng, speed = 1): number {
  return (spot.biteDelay[0] + rng() * (spot.biteDelay[1] - spot.biteDelay[0])) * speed;
}

export function rollFish(spot: SpotDef, fishById: (id: string) => FishDef, rng: Rng): { fish: FishDef; weight: number } {
  const entry = weightedPick(spot.species, rng);
  const fish = fishById(entry.fishId);
  // weights skew toward the lighter end; heavy ones are a nice surprise
  const t = Math.pow(rng(), 1.6);
  const weight = Math.round((fish.weight[0] + (fish.weight[1] - fish.weight[0]) * t) * 10) / 10;
  return { fish, weight };
}

export interface Fight {
  fish: FishDef;
  weight: number;
  /** Effective pull strength 0..~1.3. */
  strength: number;
  /** 1 = fresh, 0 = exhausted. */
  stamina: number;
  /** Line out, 1 = at the cast distance, 0 = landed. */
  distance: number;
  tension: number;
  overTime: number;
  slackTime: number;
  burstLeft: number;
  phase: number;
  time: number;
  /** The rod is below the fish's minRodTier: it never tires and strips line until it runs out. */
  overpowered: boolean;
}

export function startFight(fish: FishDef, weight: number, rod: RodTier, rng: Rng): Fight {
  const wt = fish.weight[1] > fish.weight[0] ? (weight - fish.weight[0]) / (fish.weight[1] - fish.weight[0]) : 0.5;
  const overpowered = fish.minRodTier > rod.tier;
  let strength = fish.fight.strength * (0.8 + 0.4 * wt);
  if (overpowered) strength *= 1.3;
  return { fish, weight, strength, stamina: 1, distance: 1, tension: 0.2, overTime: 0, slackTime: 0, burstLeft: 0, phase: rng() * 6, time: 0, overpowered };
}

export type FightResult = 'fighting' | 'landed' | 'snap' | 'slack';

/** Advance the reel/tension simulation. `reeling` = the player holds the reel button. */
export function stepFight(f: Fight, reeling: boolean, rod: RodTier, dt: number, rng: Rng): FightResult {
  const F = FISHING;
  f.time += dt;
  // sudden runs
  if (f.burstLeft > 0) f.burstLeft -= dt;
  else if (rng() < f.fish.fight.burst * 0.35 * dt * (0.4 + 0.6 * f.stamina)) f.burstLeft = 0.6 + rng() * 0.7;
  const wave = 0.55 + 0.45 * Math.sin(f.time * 1.7 + f.phase);
  let pull = f.strength * wave * (0.35 + 0.65 * f.stamina);
  if (f.burstLeft > 0) pull += 0.7 * f.strength;

  // tension follows reel effort + fish pull
  const target = reeling ? 0.3 + pull : pull * 0.3;
  f.tension += (target - f.tension) * Math.min(1, F.tensionResponse * dt);

  // stamina drains faster under tension
  const drain = f.overpowered ? 0 : (0.03 + f.tension * 0.09) / (0.5 + f.fish.fight.stamina);
  f.stamina = Math.max(0, f.stamina - drain * dt);

  // line distance
  if (reeling) f.distance -= F.reelRate * rod.reelSpeed * (1 - Math.min(0.85, pull * 0.8)) * dt;
  else f.distance += pull * (f.overpowered ? 0.18 : 0.05) * dt;
  if (f.overpowered) {
    // the fish runs and the line runs out
    f.distance += pull * 0.06 * dt;
    if (f.distance > FISHING.lineOut) return 'snap';
  } else f.distance = Math.min(1, f.distance);

  if (f.tension > rod.tensionLimit) f.overTime += dt;
  else f.overTime = Math.max(0, f.overTime - dt * 0.5);
  if (f.tension < F.slackLevel && !reeling) f.slackTime += dt;
  else f.slackTime = 0;

  if (f.overTime > F.snapTime) return 'snap';
  if (f.slackTime > F.slackTime) return 'slack';
  if (f.distance <= 0) return 'landed';
  return 'fighting';
}
