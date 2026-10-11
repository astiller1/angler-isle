import { describe, expect, it } from 'vitest';
import { FISH } from '../src/data/fish';
import { SPOTS } from '../src/data/spots';
import { NEIGHBORS } from '../src/data/neighbors';
import { DOCKS } from '../src/data/boat';
import { BOAT } from '../src/data/upgrades';
import { MAP_SETTINGS, PLACES } from '../src/data/map';
import { newGameState } from '../src/state/GameState';
import { boatOffers, buyGear } from '../src/economy/shop';
import { reachableFish } from '../src/npc/requests';
import { FogGrid } from '../src/map/Exploration';
import { wrapDeg } from '../src/boat/Boat';

describe('boat shop', () => {
  it('sells the boat first, then the motor, never losing money', () => {
    const s = newGameState();
    s.coins = 500;
    expect(boatOffers(s).map((o) => o.status)).toEqual(['tooExpensive', 'locked']);
    expect(buyGear(s, 'boat')).toBe(false);
    expect(buyGear(s, 'motor')).toBe(false);
    expect(s.coins).toBe(500);
    s.coins = BOAT.price + BOAT.motor.price;
    expect(buyGear(s, 'boat')).toBe(true);
    expect(s.boat).toMatchObject({ owned: true, dock: 'hafen', motor: false });
    expect(boatOffers(s).map((o) => o.status)).toEqual(['owned', 'buyable']);
    expect(buyGear(s, 'motor')).toBe(true);
    expect(s.coins).toBe(0);
    expect(boatOffers(s).every((o) => o.status === 'owned')).toBe(true);
    expect(buyGear(s, 'boat')).toBe(false);
  });

  it('boat-only fish become requestable once the boat is owned', () => {
    const base = { neighbors: NEIGHBORS, fish: FISH, spots: SPOTS, rng: Math.random };
    expect(reachableFish({ ...base, hasBoat: false }, 3).has('goldmakrele')).toBe(false);
    expect(reachableFish({ ...base, hasBoat: true }, 3).has('goldmakrele')).toBe(true);
    expect(reachableFish({ ...base, hasBoat: true }, 2).has('thunfisch')).toBe(false); // needs the carbon rod
  });
});

describe('boat data', () => {
  it('has the three offshore spots, each with its own new species', () => {
    const boat = SPOTS.filter((s) => s.access === 'boat').map((s) => s.id);
    expect(boat).toEqual(['riffkante', 'offenesee', 'sandbank']);
    const shoreFish = new Set<string>(SPOTS.filter((s) => s.access === 'shore').flatMap((s) => s.species.map((e) => e.fishId)));
    for (const id of boat) {
      const spot = SPOTS.find((s) => s.id === id)!;
      expect(spot.species.some((e) => !shoreFish.has(e.fishId))).toBe(true);
    }
  });
  it('piers have unique ids and the harbor pier exists', () => {
    expect(new Set(DOCKS.map((d) => d.id)).size).toBe(DOCKS.length);
    expect(DOCKS.some((d) => d.id === 'hafen')).toBe(true);
  });
  it('wraps headings to -180..180', () => {
    expect(wrapDeg(190)).toBe(-170);
    expect(wrapDeg(-190)).toBe(170);
    expect(wrapDeg(360)).toBe(0);
  });
});

describe('map fog', () => {
  it('reveals a circle and survives a save round trip', () => {
    const f = new FogGrid(240, 96);
    expect(f.isRevealed(0, 0)).toBe(false);
    const n = f.reveal(0, 0, 20);
    expect(n).toBeGreaterThan(30);
    expect(f.reveal(0, 0, 20)).toBe(0); // nothing new
    expect(f.isRevealed(5, -5)).toBe(true);
    expect(f.isRevealed(40, 0)).toBe(false);
    const g = new FogGrid(240, 96, f.encode());
    expect(g.isRevealed(5, -5)).toBe(true);
    expect(g.explored()).toBeCloseTo(f.explored());
  });
  it('ignores positions outside the chart and corrupt saves', () => {
    const f = new FogGrid(240, 96, '%%%not base64');
    expect(f.explored()).toBe(0);
    expect(f.cellAt(500, 0)).toBe(-1);
    expect(f.isRevealed(500, 0)).toBe(false);
  });
  it('every spot and place lies inside the charted area', () => {
    const h = MAP_SETTINGS.half;
    for (const p of [...SPOTS, ...PLACES]) expect(Math.abs(p.x) < h && Math.abs(p.z) < h, p.id).toBe(true);
  });
});

describe('cooler upgrades', () => {
  it('add slots in order without changing anything else', async () => {
    const { coolerOffers, buyNextCooler } = await import('../src/economy/shop');
    const { coolerCapacity } = await import('../src/inventory/Cooler');
    const s = newGameState();
    expect(coolerCapacity(s)).toBe(4);
    s.coins = 100;
    expect(coolerOffers(s).map((o) => o.status)).toEqual(['tooExpensive', 'locked']);
    expect(buyNextCooler(s)).toBeNull();
    s.coins = 500;
    expect(buyNextCooler(s)?.slots).toBe(6);
    expect(coolerCapacity(s)).toBe(6);
    expect(buyNextCooler(s)?.slots).toBe(8);
    expect(s.coins).toBe(0);
    expect(buyNextCooler(s)).toBeNull();
  });
});
