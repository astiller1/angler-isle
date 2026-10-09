/** Prices and economy rules. Tune here. */
export const ECONOMY = {
  startCoins: 0,
  /** Trader pays basePrice * traderMultiplier * weightFactor. */
  traderMultiplier: 1.0,
  /** Weight factor ranges from (1 - weightBonus/2) for the lightest to (1 + weightBonus/2) for the heaviest. */
  weightBonus: 0.5,
  /** In round 1 neighbors only ask for these rarities (to ease new players in). */
  firstRoundRarities: ['common', 'uncommon'] as const,
  /** Round rewards are rounded to this step. */
  rewardStep: 5,
};

/** Value of a caught fish at the trader. */
export function fishValue(basePrice: number, weight: number, range: readonly [number, number]): number {
  const t = range[1] > range[0] ? (weight - range[0]) / (range[1] - range[0]) : 0.5;
  const factor = 1 - ECONOMY.weightBonus / 2 + ECONOMY.weightBonus * Math.min(1, Math.max(0, t));
  return Math.max(1, Math.round(basePrice * ECONOMY.traderMultiplier * factor));
}
