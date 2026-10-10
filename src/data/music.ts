/**
 * Background music settings: a cheerful calypso in F major, generated live (see src/audio/).
 * Chords are diatonic scale degrees (0 = F, 1 = G, … 6 = E). Tune tempo, form and patterns here.
 */
export const MUSIC = {
  /** MIDI note of the tonic (F4). */
  tonic: 65,
  /** Major scale steps. */
  scale: [0, 2, 4, 5, 7, 9, 11],
  dayBpm: 112,
  nightBpm: 82,
  /** Default music volume 0..1. */
  volume: 0.55,
  /** Song form; each section is 8 bars. */
  form: ['A', 'A', 'B', 'A'] as const,
  /** Chord roots (scale degrees) per bar; `seventh` adds the diatonic 7th (V7 = C7). */
  sections: {
    A: [0, 3, 4, 0, 5, 3, 4, 0],
    B: [3, 0, 1, 4, 3, 0, 4, 0],
  } as Record<'A' | 'B', number[]>,
  sevenths: [4],
  /** Melody range as scale degrees relative to the tonic (4 = C5 … 13 = D6). */
  melodyRange: [4, 13] as [number, number],
  /** Melody rhythm patterns (beat offsets within a 4/4 bar). Picked per motif. */
  rhythms: [
    [0, 1, 1.5, 2, 3],
    [0, 0.5, 1, 2, 2.5, 3.5],
    [0, 1.5, 2, 3],
    [0, 0.5, 1.5, 2, 3],
    [0.5, 1, 1.5, 2.5, 3],
  ],
  /** Calypso bass: [beat, octave offset (0 = root, 1 = octave, 0.5 = fifth)]. */
  bass: [
    [0, 0],
    [1.5, 0.5],
    [2, 0],
    [2.5, 1],
    [3.5, 0.5],
  ] as [number, number][],
  /** Off-beat strums ("chucks"). */
  strums: [0.5, 1.5, 2.5, 3.5],
};
