import type { Tune } from '../data/tunes';

/** A note of a parsed tune; times in quarter notes from the start of the first full bar (pickup < 0). */
export interface TuneNote {
  t: number;
  midi: number;
  len: number;
}

export interface Chord {
  /** Bar start (quarters). */
  t: number;
  /** Chord root as scale degree 0..6 (0 = tonic). */
  degree: number;
  /** MIDI notes of the triad/seventh (root position, around middle C). */
  notes: number[];
  /** Bass root (low). */
  bass: number;
}

export interface ParsedTune {
  tune: Tune;
  notes: TuneNote[];
  /** Quarters per bar. */
  bar: number;
  /** Total length in quarters, rounded up to full bars. */
  length: number;
  /** Start offset of the first note (negative = pickup). */
  start: number;
  chords: Chord[];
  tonic: number;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** Tonic pitch class of a major key from its key signature. */
export function tonicPc(fifths: number): number {
  return (((fifths * 7) % 12) + 12) % 12;
}

/** Diatonic chord on a scale degree (triad, plus 7th on the dominant). */
function chordPcs(tonic: number, degree: number): number[] {
  const n = degree === 4 ? 4 : 3;
  return Array.from({ length: n }, (_, i) => (tonic + MAJOR[(degree + 2 * i) % 7]) % 12);
}

/** Preference of chord degrees in folk harmony (I, V, IV first). */
const CANDIDATES: [number, number][] = [
  [0, 1.0],
  [4, 0.95],
  [3, 0.9],
  [5, 0.7],
  [1, 0.65],
];

export function parseTune(tune: Tune): ParsedTune {
  const bar = (tune.meter[0] * 4) / tune.meter[1];
  const raw: { midi: number | null; len: number }[] = tune.notes.split(/\s+/).map((tok) => {
    const [m, l] = tok.split(':');
    return { midi: m === 'r' ? null : Number(m), len: Number(l) };
  });
  const total = raw.reduce((s, n) => s + n.len, 0);
  const rem = +(total % bar).toFixed(3);
  const start = rem > 0.01 && rem < bar - 0.01 ? -rem : 0; // incomplete first bar = pickup
  const notes: TuneNote[] = [];
  let t = start;
  for (const n of raw) {
    if (n.midi !== null) notes.push({ t, midi: n.midi, len: n.len });
    t += n.len;
  }
  const length = Math.ceil((t - 0.01) / bar) * bar;
  const tonic = tonicPc(tune.fifths);
  const chords = harmonize(notes, bar, harmonicUnit(tune.meter), length, tonic);
  return { tune, notes, bar, length, start, chords, tonic };
}

/** Harmonic rhythm in quarters: 6/8 → every dotted quarter, 3/4 → every bar, otherwise every beat. */
export function harmonicUnit(meter: [number, number]): number {
  const [beats, unit] = meter;
  if (unit === 8 && beats % 3 === 0) return 1.5;
  if (beats === 3) return 3;
  return 4 / unit;
}

/**
 * Picks diatonic chords so they cover the melody (notes sounding at the start of a unit weigh most),
 * with a small penalty for changing chords; the final bar is always the tonic.
 */
export function harmonize(notes: TuneNote[], bar: number, unit: number, length: number, tonic: number): Chord[] {
  const units = Math.round(length / unit);
  const degrees: number[] = [];
  for (let u = 0; u < units; u++) {
    const t0 = u * unit;
    const isLast = u === units - 1 || (u >= units - Math.round(bar / unit) && (u + 1) * unit >= length - 0.01);
    if (isLast) {
      degrees.push(0);
      continue;
    }
    const prev = degrees[degrees.length - 1];
    let best = -Infinity;
    let pick = 0;
    for (const [d, pref] of CANDIDATES) {
      const pcs = chordPcs(tonic, d);
      let score = 0;
      for (const n of notes) {
        const s = Math.max(n.t, t0);
        const e = Math.min(n.t + n.len, t0 + unit);
        if (e <= s) continue;
        const onset = n.t <= t0 + 0.01 ? 2.2 : 1;
        score += (pcs.includes(n.midi % 12) ? 1 : -0.45) * (e - s) * onset;
      }
      score = score * pref;
      if (prev !== undefined && d !== prev) score -= 0.25 * unit; // keep the harmony calm
      if (prev === undefined && d !== 0) score -= 0.5; // start on the tonic when in doubt
      if (score > best) {
        best = score;
        pick = d;
      }
    }
    degrees.push(pick);
  }
  return degrees.map((degree, u) => {
    const pcs = chordPcs(tonic, degree);
    const voiced = pcs
      .map((pc) => {
        let m = 55 + ((pc - (55 % 12) + 12) % 12);
        if (m > 69) m -= 12;
        return m;
      })
      .sort((a, b) => a - b);
    const root = pcs[0];
    return { t: u * unit, degree, notes: voiced, bass: 36 + root + (root < 4 ? 12 : 0) };
  });
}

/** The chord sounding at time t (quarters). */
export function chordAt(chords: Chord[], t: number): Chord {
  let c = chords[0];
  for (const x of chords) {
    if (x.t <= t + 0.001) c = x;
    else break;
  }
  return c;
}
