import { MUSIC } from '../data/music';

/**
 * Pure music generator (no Web Audio): turns the song form into note events, bar by bar.
 * Melodies are re-invented every time the song form loops, but stay catchy: a 2-bar motif is
 * repeated over the next chords, varied, and the section closes on the tonic.
 */
export interface NoteEvent {
  /** Beat offset within the bar (0..4). */
  beat: number;
  midi: number;
  /** Length in beats. */
  len: number;
  vel: number;
}

export interface BarEvents {
  section: 'A' | 'B';
  barInSection: number;
  chordRoot: number;
  chord: number[];
  bass: NoteEvent[];
  strum: { beat: number; notes: number[] }[];
  melody: NoteEvent[];
}

export type Rng = () => number;

export function seeded(seed: number): Rng {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scale degree (may be negative or > 6) → MIDI note. */
export function degreeToMidi(d: number): number {
  const s = MUSIC.scale;
  const oct = Math.floor(d / 7);
  return MUSIC.tonic + s[((d % 7) + 7) % 7] + 12 * oct;
}

/** Chord tones (scale degrees, root position) of a diatonic chord. */
export function chordDegrees(root: number): number[] {
  const tones = [root, root + 2, root + 4];
  if (MUSIC.sevenths.includes(((root % 7) + 7) % 7)) tones.push(root + 6);
  return tones;
}

/** Nearest scale degree in `range` that belongs to the chord. */
function nearestChordTone(target: number, root: number, range: [number, number]): number {
  const pcs = chordDegrees(root).map((d) => ((d % 7) + 7) % 7);
  let best = target;
  let bestDist = Infinity;
  for (let d = range[0]; d <= range[1]; d++) {
    if (!pcs.includes(((d % 7) + 7) % 7)) continue;
    const dist = Math.abs(d - target);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

interface Motif {
  rhythm: number[][]; // per bar: beat offsets
  shape: number[][]; // per bar: degree offsets relative to the first chord tone
}

function makeMotif(rng: Rng): Motif {
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
  const rhythm = [pick(MUSIC.rhythms), pick(MUSIC.rhythms)];
  const shape = rhythm.map((r) => {
    let d = 0;
    return r.map((_, i) => {
      if (i > 0) d += pick([-2, -1, -1, 1, 1, 2, 0]);
      return d;
    });
  });
  return { rhythm, shape };
}

/** A whole 8-bar section of melody notes. */
function sectionMelody(roots: number[], rng: Rng, prevEnd: number): NoteEvent[][] {
  const range = MUSIC.melodyRange;
  const motif = makeMotif(rng);
  const bars: NoteEvent[][] = [];
  let anchor = nearestChordTone(prevEnd, roots[0], range);
  for (let b = 0; b < 8; b++) {
    const root = roots[b];
    const m = b % 2;
    const notes: NoteEvent[] = [];
    if (b === 7) {
      // cadence: land on the tonic (or its third) with a long note
      const end = nearestChordTone(anchor, 0, range);
      notes.push({ beat: 0, midi: degreeToMidi(end), len: 3, vel: 0.9 });
      bars.push(notes);
      anchor = end;
      continue;
    }
    if (m === 0) anchor = nearestChordTone(anchor + (b === 4 ? 2 : 0), root, range);
    const rhythm = motif.rhythm[m];
    let shape = motif.shape[m];
    if (b >= 4 && b < 6) shape = shape.map((d, i) => (i === shape.length - 1 ? d + 1 : d)); // small variation
    rhythm.forEach((beat, i) => {
      let d = anchor + shape[i];
      d = Math.max(range[0], Math.min(range[1], d));
      // strong beats snap to chord tones so it always fits the harmony
      if (beat === 0 || beat === 2) d = nearestChordTone(d, root, range);
      const next = rhythm[i + 1] ?? 4;
      notes.push({ beat, midi: degreeToMidi(d), len: Math.min(1.5, next - beat), vel: beat % 1 === 0 ? 0.85 : 0.65 });
    });
    bars.push(notes);
  }
  return bars;
}

/** Generates bar events forever, following MUSIC.form. */
export class Composer {
  private rng: Rng;
  private bar = 0;
  private melodies = new Map<'A' | 'B', NoteEvent[][]>();
  private lastNote = 7;

  constructor(seed = Date.now()) {
    this.rng = seeded(seed);
  }

  next(): BarEvents {
    const sectionsPerLoop = MUSIC.form.length;
    const loopBar = this.bar % (sectionsPerLoop * 8);
    const sectionIdx = Math.floor(loopBar / 8);
    const section = MUSIC.form[sectionIdx];
    const barInSection = loopBar % 8;
    const roots = MUSIC.sections[section];
    // new melodies at the start of every loop (A is reused within a loop — that is what makes it catchy)
    if (loopBar === 0) this.melodies.clear();
    if (barInSection === 0 && !this.melodies.has(section)) {
      this.melodies.set(section, sectionMelody(roots, this.rng, this.lastNote));
    }
    const root = roots[barInSection];
    const chord = chordDegrees(root);
    const melody = this.melodies.get(section)![barInSection];

    let bassRoot = degreeToMidi(root) - 24;
    while (bassRoot > 52) bassRoot -= 12; // keep the groove low: F2 … E3
    const bass = MUSIC.bass.map(([beat, oct]) => ({
      beat,
      midi: oct === 0.5 ? bassRoot + 7 : bassRoot + 12 * oct,
      len: 0.45,
      vel: beat === 0 ? 1 : 0.75,
    }));
    const voicing = chord.slice(0, 3).map((d) => degreeToMidi(d) - 5 + (degreeToMidi(d) - 5 < 57 ? 12 : 0));
    const strum = MUSIC.strums.map((beat) => ({ beat, notes: voicing }));
    this.bar++;
    return { section, barInSection, chordRoot: root, chord, bass, strum, melody };
  }
}
