import { TUNE_CREDITS } from './tunes';

/** Background music settings (tunes: data/tunes.ts, player: audio/MusicPlayer.ts). */
export const MUSIC = {
  /** Default master volume 0..1. */
  volume: 0.6,
  /** Tempo in quarter notes per minute, by time signature (Jekyll marks these dances "Allegro"). */
  tempo: { '2/4': 116, '6/8': 138, '3/4': 132 } as Record<string, number>,
  /** Night: tempo factor (the night band is also softer). */
  nightTempo: 0.8,
  /** How often each tune is played before the next one. */
  repeats: 2,
  /** Levels of the band parts (0 = off). The bass is kept light on purpose. */
  levels: { melody: 0.32, strum: 0.2, bass: 0.12, shaker: 0.035 },
  /** Bars of strummed chords between tunes. */
  interludeBars: 2,
};

export function musicCredits(): string {
  return TUNE_CREDITS;
}
