import { describe, expect, it } from 'vitest';
import { TUNES } from '../src/data/tunes';
import { harmonicUnit, parseTune, tonicPc } from '../src/audio/tune';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

describe('folk tunes', () => {
  it('key signatures map to the right tonic', () => {
    expect(tonicPc(0)).toBe(0); // C
    expect(tonicPc(2)).toBe(2); // D
    expect(tonicPc(-1)).toBe(5); // F
    expect(tonicPc(-3)).toBe(3); // Eb
  });

  for (const tune of TUNES) {
    describe(tune.title, () => {
      const p = parseTune(tune);

      it('parses into whole bars', () => {
        expect(p.notes.length).toBeGreaterThan(20);
        expect(p.length % p.bar).toBeCloseTo(0, 5);
        expect(p.chords.length).toBe(Math.round(p.length / harmonicUnit(tune.meter)));
      });

      it('is a major-key tune that ends on a tonic-chord tone', () => {
        const inKey = p.notes.filter((n) => MAJOR.includes((((n.midi - p.tonic) % 12) + 12) % 12)).length;
        expect(inKey / p.notes.length).toBeGreaterThan(0.9);
        const last = p.notes[p.notes.length - 1];
        const rel = (((last.midi - p.tonic) % 12) + 12) % 12;
        expect([0, 4, 7]).toContain(rel);
        expect(p.chords[p.chords.length - 1].degree).toBe(0);
      });

      it('harmony fits the melody on the downbeats', () => {
        let hit = 0;
        let total = 0;
        for (const c of p.chords) {
          const pcs = c.notes.map((m) => m % 12);
          const down = p.notes.find((n) => n.t <= c.t + 0.01 && n.t + n.len > c.t + 0.01);
          if (!down) continue;
          total++;
          if (pcs.includes(down.midi % 12)) hit++;
        }
        expect(hit / total).toBeGreaterThan(0.8);
      });
    });
  }

  it('has lively tunes for the day and calm ones for the night', () => {
    expect(TUNES.filter((t) => t.when !== 'night').length).toBeGreaterThanOrEqual(3);
    expect(TUNES.filter((t) => t.when === 'night').length).toBeGreaterThanOrEqual(1);
  });
});
