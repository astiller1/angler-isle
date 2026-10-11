/**
 * Background music: human-made, license-free tracks in public/music/.
 * Add a track: drop the file(s) there (OGG + MP3 fallback for Safari), add an entry below, and credit it.
 */
export interface MusicTrack {
  id: string;
  title: string;
  author: string;
  license: string;
  source: string;
  /** File name without extension in public/music/ (both .ogg and .mp3 should exist). */
  file: string;
  /** When it plays. With no 'night' track, the day track continues at night with a softer filter. */
  when: 'day' | 'night' | 'any';
  /** Track gain (make-up gain after the EQ may exceed 1). */
  gain: number;
  /** Low-shelf EQ: frequencies below `bassHz` are cut by `bassDb` (negative = quieter bass). */
  bassHz: number;
  bassDb: number;
  /** Remove everything below this frequency (steep 24 dB/oct high-pass). Omit to keep the full bass. */
  removeBelowHz?: number;
  /** Optional compressor after the EQ (for thin/peaky material) with make-up gain in dB. */
  compress?: { thresholdDb: number; ratio: number; makeupDb: number };
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'feel-good-island',
    title: 'Feel Good Island (Loop)',
    author: 'Brandon Morris (Loop-Schnitt: AntumDeluge)',
    license: 'CC0',
    source: 'https://opengameart.org/content/feel-good-island-loop',
    file: 'feel_good_island_loop',
    when: 'any',
    // the bass is removed completely (user request). It carried most of the energy; what remains is thin and
    // peaky, so a compressor + make-up gain brings it back to a pleasant level (RMS ≈ −20 dB, peak ≈ 0.85).
    gain: 1,
    bassHz: 220,
    bassDb: 0,
    removeBelowHz: 200,
    compress: { thresholdDb: -45, ratio: 8, makeupDb: 10.6 },
  },
];

export const MUSIC = {
  /** Default master volume 0..1. */
  volume: 0.6,
  /** At night (when no night track exists): low-pass cutoff in Hz and volume factor. */
  nightLowpassHz: 2200,
  nightGain: 0.6,
  /** Cross-fade time between tracks (s). */
  crossfade: 3,
};

/** Credit line shown in the intro and README. */
export function musicCredits(): string {
  return MUSIC_TRACKS.map((t) => `„${t.title}“ von ${t.author} (${t.license})`).join(' · ');
}
