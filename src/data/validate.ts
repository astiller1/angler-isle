import { FISH } from './fish';
import { SPOTS } from './spots';
import { NEIGHBORS } from './neighbors';
import { RODS, COOLERS, BAITS } from './upgrades';
import type { FishDef, NeighborDef, SpotDef } from './types';

/** Cross-reference checks for the data files. Returns a list of problems (empty = OK). */
export function validateData(
  fish: readonly FishDef[] = FISH,
  spots: readonly SpotDef[] = SPOTS,
  neighbors: readonly NeighborDef[] = NEIGHBORS,
): string[] {
  const errors: string[] = [];
  const fishIds = new Set(fish.map((f) => f.id));
  const spotIds = new Set(spots.map((s) => s.id));
  const baitIds = new Set(BAITS.map((b) => b.id));
  const dup = (ids: string[], what: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`duplicate ${what} id "${id}"`);
      seen.add(id);
    }
  };
  dup(fish.map((f) => f.id), 'fish');
  dup(spots.map((s) => s.id), 'spot');
  dup(neighbors.map((n) => n.id), 'neighbor');

  for (const f of fish) {
    if (f.weight[0] > f.weight[1]) errors.push(`fish ${f.id}: weight range inverted`);
    if (f.basePrice <= 0) errors.push(`fish ${f.id}: basePrice must be > 0`);
    if (!RODS.some((r) => r.tier === f.minRodTier)) errors.push(`fish ${f.id}: minRodTier ${f.minRodTier} has no rod`);
    if (!spots.some((s) => s.species.some((e) => e.fishId === f.id))) errors.push(`fish ${f.id}: not found in any spot`);
  }
  for (const s of spots) {
    if (!s.species.length) errors.push(`spot ${s.id}: no species`);
    for (const e of s.species) if (!fishIds.has(e.fishId)) errors.push(`spot ${s.id}: unknown fish "${e.fishId}"`);
    if (s.biteDelay[0] > s.biteDelay[1]) errors.push(`spot ${s.id}: biteDelay inverted`);
  }
  for (const n of neighbors) {
    if (!n.requestPool.length) errors.push(`neighbor ${n.id}: empty request pool`);
    for (const id of n.requestPool) if (!fishIds.has(id)) errors.push(`neighbor ${n.id}: unknown fish "${id}"`);
    for (const r of n.extraRewards) {
      if (r.type === 'hint' && !spotIds.has(r.spotId)) errors.push(`neighbor ${n.id}: hint to unknown spot "${r.spotId}"`);
      if (r.type === 'bait' && !baitIds.has(r.baitId)) errors.push(`neighbor ${n.id}: unknown bait "${r.baitId}"`);
    }
    // every neighbor must have at least two shore-catchable requests so rounds stay doable
    const shoreFish = new Set(spots.filter((s) => s.access === 'shore').flatMap((s) => s.species.map((e) => e.fishId)));
    if (n.requestPool.filter((id) => shoreFish.has(id)).length < 2) errors.push(`neighbor ${n.id}: needs >= 2 shore-catchable fish`);
  }
  for (const b of BAITS) for (const id of Object.keys(b.attracts)) if (!fishIds.has(id)) errors.push(`bait ${b.id}: unknown fish "${id}"`);
  if (COOLERS[0].slots < 1) errors.push('cooler tier 1 needs slots');
  return errors;
}
