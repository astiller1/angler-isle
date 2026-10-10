import { describe, expect, it } from 'vitest';
import { FISH, fishById } from '../src/data/fish';
import { SPOTS } from '../src/data/spots';
import { NEIGHBORS } from '../src/data/neighbors';
import { BOAT, RODS } from '../src/data/upgrades';
import { fishValue } from '../src/data/economy';
import { validateData } from '../src/data/validate';
import { newGameState, type CaughtFish } from '../src/state/GameState';
import { addToCooler, coolerCapacity, coolerFull } from '../src/inventory/Cooler';
import { castDistance, rollFish, startFight, stepFight, weightedPick } from '../src/fishing/logic';
import { allDelivered, deliver, reachableFish, reservedFish, startRound, type RequestContext } from '../src/npc/requests';
import { sellFish } from '../src/economy/trader';
import { buyNextRod, rodOffers } from '../src/economy/shop';
import { DAY, skyKeysAt, sunDirection, clockText } from '../src/data/daycycle';

function seeded(seed = 42) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

const ctx = (rng = seeded()): RequestContext => ({ neighbors: NEIGHBORS, fish: FISH, spots: SPOTS, hasBoat: false, rng });

const fish = (fishId: string, uid = fishId + Math.random(), weight = 1): CaughtFish => ({ uid, fishId, weight, value: 10 });

/** Simple bot: reel while tension is below a fraction of the rod's limit. */
function simulate(fishId: string, weight: number, threshold: number, seed = 5, rod = RODS[0]) {
  const rng = seeded(seed);
  const f = startFight(fishById(fishId), weight, rod, rng);
  for (let t = 0; t < 120; t += 1 / 60) {
    const r = stepFight(f, f.tension < threshold * rod.tensionLimit, rod, 1 / 60, rng);
    if (r !== 'fighting') return { r, t };
  }
  return { r: 'timeout' as const, t: 120 };
}

describe('data', () => {
  it('passes validation', () => {
    expect(validateData()).toEqual([]);
  });
  it('flags unknown references', () => {
    const bad = [{ ...SPOTS[0], id: 'x', species: [{ fishId: 'nope', weight: 1 }] }];
    expect(validateData(FISH, [...SPOTS, ...bad]).some((e) => e.includes('nope'))).toBe(true);
  });
  it('rare fish are worth noticeably more than common ones', () => {
    const avg = (r: string) => {
      const list = FISH.filter((f) => f.rarity === r);
      return list.reduce((s, f) => s + f.basePrice, 0) / list.length;
    };
    expect(avg('rare')).toBeGreaterThan(avg('common') * 3.5);
  });
  it('fish value grows with weight', () => {
    const f = fishById('schnapper');
    expect(fishValue(f.basePrice, f.weight[1], f.weight)).toBeGreaterThan(fishValue(f.basePrice, f.weight[0], f.weight));
  });
});

describe('cooler', () => {
  it('holds four fish at tier 1', () => {
    const s = newGameState();
    expect(coolerCapacity(s)).toBe(4);
    for (let i = 0; i < 4; i++) expect(addToCooler(s, fish('grunzer'))).toBe(true);
    expect(coolerFull(s)).toBe(true);
    expect(addToCooler(s, fish('grunzer'))).toBe(false);
  });
});

describe('fishing', () => {
  it('weighted pick respects weights', () => {
    const rng = seeded(1);
    let a = 0;
    for (let i = 0; i < 2000; i++) if (weightedPick([{ id: 'a', weight: 3 }, { id: 'b', weight: 1 }], rng).id === 'a') a++;
    expect(a / 2000).toBeGreaterThan(0.68);
    expect(a / 2000).toBeLessThan(0.82);
  });
  it('cast distance scales with power and rod', () => {
    expect(castDistance(0, RODS[0])).toBe(4);
    expect(castDistance(1, RODS[0])).toBe(RODS[0].castMax);
    expect(castDistance(1, RODS[2])).toBeGreaterThan(castDistance(1, RODS[0]));
  });
  it('rolls species from the spot table with weights in range', () => {
    const rng = seeded(3);
    for (let i = 0; i < 50; i++) {
      const { fish: f, weight } = rollFish(SPOTS[0], fishById, rng);
      expect(SPOTS[0].species.some((s) => s.fishId === f.id)).toBe(true);
      expect(weight).toBeGreaterThanOrEqual(f.weight[0]);
      expect(weight).toBeLessThanOrEqual(f.weight[1]);
    }
  });

  it('a common fish is landed by simply holding reel', () => {
    const { r, t } = simulate('grunzer', 0.6, 99);
    expect(r).toBe('landed');
    expect(t).toBeLessThan(15);
  });
  it('a big rare fish snaps the line when reeled carelessly', () => {
    const outcomes = [1, 2, 3, 4, 5, 6].map((s) => simulate('zackenbarsch', 11, 99, s).r);
    expect(outcomes.filter((r) => r === 'snap').length).toBeGreaterThanOrEqual(2);
  });
  it('a tarpon on the right rod still needs tension control', () => {
    const careless = [1, 2, 3, 4, 5, 6].map((s) => simulate('tarpun', 22, 99, s, RODS[1]).r);
    expect(careless.filter((r) => r === 'snap').length).toBeGreaterThanOrEqual(2);
  });
  it('a big rare fish can be landed with tension control', () => {
    const outcomes = [1, 2, 3, 4, 5].map((s) => simulate('tarpun', 22, 0.82, s, RODS[1]));
    expect(outcomes.filter((o) => o.r === 'landed').length).toBeGreaterThanOrEqual(4);
    for (const o of outcomes) if (o.r === 'landed') expect(o.t).toBeLessThan(60);
  });
  it('idle line goes slack for weak fish', () => {
    const rng = seeded(9);
    const f = startFight(fishById('grunzer'), 0.3, RODS[0], rng);
    let r = 'fighting';
    for (let t = 0; t < 30 && r === 'fighting'; t += 1 / 60) r = stepFight(f, false, RODS[0], 1 / 60, rng);
    expect(r).toBe('slack');
  });
});

describe('requests & rounds', () => {
  it('starts a round with one request per neighbor, all reachable and distinct', () => {
    const s = newGameState();
    startRound(s, ctx());
    expect(s.round).toBe(1);
    const reach = reachableFish(ctx(), 1);
    const ids = Object.values(s.requests).map((r) => r.fishId);
    expect(ids.length).toBe(NEIGHBORS.length);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(reach.has(id)).toBe(true);
    // round 1: no rare fish
    for (const id of ids) expect(fishById(id).rarity).not.toBe('rare');
  });
  it('rewards are 2–3x the base price', () => {
    const s = newGameState();
    for (let i = 0; i < 20; i++) {
      startRound(s, ctx(seeded(i)));
      for (const [nid, r] of Object.entries(s.requests)) {
        const n = NEIGHBORS.find((x) => x.id === nid)!;
        const base = fishById(r.fishId).basePrice;
        expect(r.reward).toBeGreaterThanOrEqual(Math.floor(base * n.rewardMultiplier[0] - 5));
        expect(r.reward).toBeLessThanOrEqual(Math.ceil(base * n.rewardMultiplier[1] + 5));
      }
    }
  });
  it('accepts one delivery per neighbor and rolls a new round when all are served', () => {
    const s = newGameState();
    const c = ctx();
    startRound(s, c);
    const ids = Object.entries(s.requests);
    let coins = 0;
    for (const [nid, r] of ids) {
      s.cooler.push(fish(r.fishId), fish(r.fishId));
      expect(reservedFish(s).size).toBeGreaterThan(0);
      const res = deliver(s, nid, c)!;
      coins += res.coins;
      // second delivery in the same round is refused
      if (!res.roundAdvanced) expect(deliver(s, nid, c)).toBeNull();
    }
    expect(s.round).toBe(2);
    expect(allDelivered(s)).toBe(false);
    expect(s.coins).toBe(coins);
  });
  it('refuses delivery without the right fish', () => {
    const s = newGameState();
    startRound(s, ctx());
    s.cooler.push(fish('definitely-not'));
    expect(deliver(s, NEIGHBORS[0].id, ctx())).toBeNull();
  });
});

describe('rod tiers', () => {
  it('each tier is strictly better and pricier', () => {
    for (let i = 1; i < RODS.length; i++) {
      expect(RODS[i].castMax).toBeGreaterThan(RODS[i - 1].castMax);
      expect(RODS[i].tensionLimit).toBeGreaterThan(RODS[i - 1].tensionLimit);
      expect(RODS[i].price).toBeGreaterThan(RODS[i - 1].price);
    }
    expect(RODS[0].price).toBe(0);
  });
  it('a fish above the rod tier cannot be landed even with careful reeling', () => {
    const outcomes = [1, 2, 3, 4, 5].map((s) => simulate('tarpun', 15, 0.82, s, RODS[0]).r);
    expect(outcomes.filter((r) => r === 'landed').length).toBeLessThanOrEqual(1);
  });
  it('neighbors only ask for fish the current rod can land', () => {
    expect(reachableFish(ctx(), 1).has('tarpun')).toBe(false);
    expect(reachableFish(ctx(), 2).has('tarpun')).toBe(true);
  });
});

describe('shop', () => {
  it('sells rods in order and only with enough coins', () => {
    const s = newGameState();
    s.hasRod = true;
    s.coins = 100;
    expect(buyNextRod(s)).toBeNull();
    expect(s.coins).toBe(100); // no money lost
    expect(rodOffers(s).map((o) => o.status)).toEqual(['tooExpensive', 'locked']);
    s.coins = 700;
    expect(buyNextRod(s)?.tier).toBe(2);
    expect(s.coins).toBe(700 - RODS[1].price);
    expect(rodOffers(s).map((o) => o.status)).toEqual(['owned', 'buyable']);
    expect(buyNextRod(s)?.tier).toBe(3);
    expect(buyNextRod(s)).toBeNull(); // max tier
    expect(rodOffers(s).every((o) => o.status === 'owned')).toBe(true);
  });
  it('cannot buy before taking the starter rod', () => {
    const s = newGameState();
    s.coins = 1000;
    expect(buyNextRod(s)).toBeNull();
    expect(rodOffers(s).every((o) => o.status === 'locked')).toBe(true);
  });
});

describe('trader', () => {
  it('sells fish for their value', () => {
    const s = newGameState();
    s.cooler.push({ ...fish('grunzer', 'a'), value: 7 }, { ...fish('pompano', 'b'), value: 11 });
    expect(sellFish(s, ['a', 'b'])).toBe(18);
    expect(s.coins).toBe(18);
    expect(s.cooler.length).toBe(0);
  });
});

describe('balance', () => {
  it('the boat is affordable after roughly 2–3 rounds of play', () => {
    // A round ≈ 3 requests + selling ~10 extra catches at average value.
    const avgReq = NEIGHBORS.reduce((s, n) => {
      const pool = n.requestPool.map((id) => fishById(id).basePrice);
      const avg = pool.reduce((a, b) => a + b, 0) / pool.length;
      return s + avg * (n.rewardMultiplier[0] + n.rewardMultiplier[1]) / 2;
    }, 0);
    // average value of a catch = mean over shore spots of the weighted species price
    const shore = SPOTS.filter((sp) => sp.access === 'shore');
    const avgFish = shore.reduce((acc, sp) => {
      const total = sp.species.reduce((t, e) => t + e.weight, 0);
      return acc + sp.species.reduce((t, e) => t + (fishById(e.fishId).basePrice * e.weight) / total, 0);
    }, 0) / shore.length;
    const perRound = avgReq + 10 * avgFish;
    const rounds = BOAT.price / perRound;
    expect(rounds).toBeGreaterThan(2);
    expect(rounds).toBeLessThan(3.5);
  });
});

describe('day cycle', () => {
  it('24 real minutes make a full day', () => {
    expect(DAY.realSecondsPerGameHour * 24).toBe(24 * 60);
  });
  it('the sun is up at noon, below the planet at midnight, rises east and sets west', () => {
    expect(sunDirection(12)[1]).toBeGreaterThan(0.8);
    expect(sunDirection(0)[1]).toBeLessThan(-0.8);
    expect(sunDirection(6)[0]).toBeGreaterThan(0.9);
    expect(sunDirection(18)[0]).toBeLessThan(-0.9);
  });
  it('sky keys cover the whole day and interpolate', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const [a, b, t] = skyKeysAt(h);
      expect(a.hour).toBeLessThanOrEqual(h);
      expect(b.hour).toBeGreaterThanOrEqual(h);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
    expect(clockText(13.5)).toBe('13:30');
  });
});
