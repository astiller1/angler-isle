import { describe, expect, it } from 'vitest';
import { Composer, chordDegrees, degreeToMidi } from '../src/audio/compose';
import { MUSIC } from '../src/data/music';

const pc = (m: number) => ((m % 12) + 12) % 12;
const loopBars = MUSIC.form.length * 8;

describe('music composer', () => {
  it('maps scale degrees to F major', () => {
    expect(degreeToMidi(0)).toBe(65); // F4
    expect(degreeToMidi(4)).toBe(72); // C5
    expect(degreeToMidi(7)).toBe(77); // F5
    const inKey = new Set(MUSIC.scale.map((s) => pc(MUSIC.tonic + s)));
    for (let d = -10; d < 20; d++) expect(inKey.has(pc(degreeToMidi(d)))).toBe(true);
  });

  it('only the dominant gets a seventh (C7)', () => {
    expect(chordDegrees(4)).toHaveLength(4);
    expect(chordDegrees(0)).toHaveLength(3);
  });

  it('keeps the melody in range, in key, and on chord tones on strong beats', () => {
    const c = new Composer(42);
    const lo = degreeToMidi(MUSIC.melodyRange[0]);
    const hi = degreeToMidi(MUSIC.melodyRange[1]);
    for (let i = 0; i < loopBars * 2; i++) {
      const bar = c.next();
      const chordPcs = new Set(bar.chord.map((d) => pc(degreeToMidi(d))));
      expect(bar.melody.length).toBeGreaterThan(0);
      for (const n of bar.melody) {
        expect(n.midi).toBeGreaterThanOrEqual(lo);
        expect(n.midi).toBeLessThanOrEqual(hi);
        expect(n.beat).toBeGreaterThanOrEqual(0);
        expect(n.beat + n.len).toBeLessThanOrEqual(4.01);
        if (n.beat === 0 || n.beat === 2) expect(chordPcs.has(pc(n.midi))).toBe(true);
      }
      for (const b of bar.bass) expect(b.midi).toBeLessThanOrEqual(64);
    }
  });

  it('ends every section on the tonic chord', () => {
    const c = new Composer(7);
    const tonic = new Set(chordDegrees(0).map((d) => pc(degreeToMidi(d))));
    for (let i = 0; i < loopBars; i++) {
      const bar = c.next();
      if (bar.barInSection === 7) {
        expect(bar.chordRoot).toBe(0);
        expect(tonic.has(pc(bar.melody[0].midi))).toBe(true);
      }
    }
  });

  it('repeats the A melody within a loop (catchy) but invents a new one next loop', () => {
    const c = new Composer(3);
    const bars = Array.from({ length: loopBars * 2 }, () => c.next());
    const melodyOf = (start: number) => JSON.stringify(bars.slice(start, start + 8).map((b) => b.melody));
    expect(melodyOf(0)).toBe(melodyOf(8)); // A, A
    expect(melodyOf(0)).toBe(melodyOf(24)); // … A again after B
    expect(melodyOf(0)).not.toBe(melodyOf(16)); // B differs
    expect(melodyOf(0)).not.toBe(melodyOf(loopBars)); // new loop, new tune
  });
});
