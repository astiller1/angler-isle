import { MUSIC, MUSIC_TRACKS, type MusicTrack } from '../data/music';

interface Loaded {
  track: MusicTrack;
  buffer: AudioBuffer;
  loopStart: number;
  loopEnd: number;
}

interface Playing {
  id: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/** Prefer Ogg Vorbis (exact loops); fall back to MP3 where Ogg is not supported (older iOS Safari). */
function preferredExt(): 'ogg' | 'mp3' {
  try {
    const a = document.createElement('audio');
    return a.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3';
  } catch {
    return 'mp3';
  }
}

/** Skip encoder padding (MP3 adds silence at both ends) so the loop stays seamless. */
function findLoop(buf: AudioBuffer): [number, number] {
  const ch = buf.getChannelData(0);
  const eps = 1e-5;
  let a = 0;
  while (a < ch.length && Math.abs(ch[a]) < eps) a++;
  let b = ch.length - 1;
  while (b > a && Math.abs(ch[b]) < eps) b--;
  // only trim a few hundred milliseconds at most — never real musical rests
  const max = buf.sampleRate * 0.3;
  a = Math.min(a, max);
  b = Math.max(b, ch.length - 1 - max);
  return [a / buf.sampleRate, (b + 1) / buf.sampleRate];
}

/**
 * Plays the background tracks from data/music.ts in a seamless loop through a bass-cut EQ.
 * `night` (0..1) either cross-fades to a night track or, with a single track, softens it
 * (low-pass + quieter). Volume/mute via the master gain.
 */
export class MusicPlayer {
  readonly master: GainNode;
  private bassCut: BiquadFilterNode;
  /** Two cascaded high-passes (24 dB/oct) that remove everything below the track's removeBelowHz. */
  private hp: BiquadFilterNode[] = [];
  /** Evens out what is left after heavy EQ (thin, peaky material) — followed by make-up gain. */
  private comp: DynamicsCompressorNode;
  private makeup: GainNode;
  private nightFilter: BiquadFilterNode;
  private nightGain: GainNode;
  private loaded = new Map<string, Loaded>();
  private playing: Playing | null = null;
  private volume = MUSIC.volume;
  private muted = false;
  night = 0;

  constructor(readonly ctx: BaseAudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.nightGain = ctx.createGain();
    this.nightFilter = ctx.createBiquadFilter();
    this.nightFilter.type = 'lowpass';
    this.nightFilter.frequency.value = 20000;
    this.nightFilter.Q.value = 0.5;
    this.bassCut = ctx.createBiquadFilter();
    this.bassCut.type = 'lowshelf';
    this.hp = [0, 1].map(() => {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 35;
      f.Q.value = 0.707;
      return f;
    });
    this.comp = ctx.createDynamicsCompressor();
    this.makeup = ctx.createGain();
    this.bassCut.connect(this.hp[0]).connect(this.hp[1]).connect(this.comp).connect(this.makeup).connect(this.nightFilter).connect(this.nightGain).connect(this.master).connect(ctx.destination);
  }

  /** Fetch and decode all tracks (call after the context exists). */
  async load(baseUrl = import.meta.env.BASE_URL): Promise<void> {
    const ext = preferredExt();
    await Promise.all(
      MUSIC_TRACKS.map(async (track) => {
        let buffer: AudioBuffer | null = null;
        for (const e of ext === 'ogg' ? ['ogg', 'mp3'] : ['mp3']) {
          try {
            const res = await fetch(`${baseUrl}music/${track.file}.${e}`);
            if (!res.ok) continue;
            buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
            break;
          } catch {
            /* try the next format */
          }
        }
        if (!buffer) return;
        const [loopStart, loopEnd] = findLoop(buffer);
        this.loaded.set(track.id, { track, buffer, loopStart, loopEnd });
      }),
    );
  }

  /** Add an already decoded buffer (tests / offline previews). */
  addBuffer(track: MusicTrack, buffer: AudioBuffer): void {
    const [loopStart, loopEnd] = findLoop(buffer);
    this.loaded.set(track.id, { track, buffer, loopStart, loopEnd });
  }

  setVolume(v: number, muted: boolean): void {
    this.volume = v;
    this.muted = muted;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(muted ? 0 : v, t, 0.4);
  }

  start(): void {
    this.setVolume(this.volume, this.muted);
    this.update();
  }

  /** Call regularly (each frame is fine): picks the right track and applies the night sound. */
  update(): void {
    const night = this.night > 0.5;
    const hasNight = [...this.loaded.values()].some((l) => l.track.when === 'night');
    const want =
      [...this.loaded.values()].find((l) => (hasNight ? l.track.when === (night ? 'night' : 'day') : false)) ??
      [...this.loaded.values()].find((l) => l.track.when === 'any' || l.track.when === 'day') ??
      [...this.loaded.values()][0];
    if (want && this.playing?.id !== want.track.id) this.play(want);

    // single-track nights: softer and quieter
    const n = hasNight ? 0 : this.night;
    const t = this.ctx.currentTime;
    const cutoff = 20000 * Math.pow(MUSIC.nightLowpassHz / 20000, n);
    this.nightFilter.frequency.setTargetAtTime(cutoff, t, 0.5);
    this.nightGain.gain.setTargetAtTime(1 + (MUSIC.nightGain - 1) * n, t, 0.5);
  }

  private play(l: Loaded): void {
    const t = this.ctx.currentTime;
    const fade = this.playing ? MUSIC.crossfade : 0.8;
    if (this.playing) {
      const old = this.playing;
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + fade);
      old.source.stop(t + fade + 0.1);
    }
    this.bassCut.frequency.setValueAtTime(l.track.bassHz, t);
    this.bassCut.gain.setValueAtTime(l.track.bassDb, t);
    for (const f of this.hp) f.frequency.setValueAtTime(l.track.removeBelowHz ?? 35, t);
    const c = l.track.compress;
    this.comp.threshold.setValueAtTime(c ? c.thresholdDb : 0, t);
    this.comp.ratio.setValueAtTime(c ? c.ratio : 1, t);
    this.comp.knee.setValueAtTime(c ? 8 : 0, t);
    this.comp.attack.setValueAtTime(0.004, t);
    this.comp.release.setValueAtTime(0.25, t);
    this.makeup.gain.setValueAtTime(Math.pow(10, (c ? c.makeupDb : 0) / 20), t);
    const source = this.ctx.createBufferSource();
    source.buffer = l.buffer;
    source.loop = true;
    source.loopStart = l.loopStart;
    source.loopEnd = l.loopEnd;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(l.track.gain, t + fade);
    source.connect(gain).connect(this.bassCut);
    source.start(t, l.loopStart);
    this.playing = { id: l.track.id, source, gain };
  }

  /** Live EQ tweak (debug panel). */
  setBass(hz: number, db: number): void {
    this.bassCut.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.05);
    this.bassCut.gain.setTargetAtTime(db, this.ctx.currentTime, 0.05);
  }
}

// ------------------------------------------------------------------ settings (per browser)

const KEY = 'angler-insel-audio';

export interface AudioSettings {
  volume: number;
  muted: boolean;
}

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { volume: MUSIC.volume, muted: false, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { volume: MUSIC.volume, muted: false };
}

export function saveAudioSettings(s: AudioSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
