import { MUSIC } from '../data/music';
import { TUNES } from '../data/tunes';
import { chordAt, parseTune, type Chord, type ParsedTune } from './tune';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * Plays traditional Jamaican folk tunes (data/tunes.ts) with a small island band, synthesized in the
 * browser: steel pan melody (marimba at night), Karplus-Strong ukulele strums, a light plucked bass and
 * a shaker. Each tune is scheduled as a whole pass; by day the lively dances play, at night the waltzes.
 */
export class MusicPlayer {
  readonly master: GainNode;
  private bus: GainNode;
  private tunes: ParsedTune[] = TUNES.map(parseTune);
  private plucks = new Map<string, AudioBuffer>();
  private noise: AudioBuffer;
  private nextStart = 0;
  private lastId = '';
  private volume = MUSIC.volume;
  private muted = false;
  private started = false;
  /** 0 = day … 1 = night (set by the game). */
  night = 0;

  constructor(readonly ctx: BaseAudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 2.5;
    this.master.connect(comp).connect(ctx.destination);
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    // small room reverb
    const verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
    }
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.18;
    this.bus.connect(verb).connect(wet).connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  /** Kept for API symmetry with file-based players; everything is generated. */
  async load(): Promise<void> {}

  setVolume(v: number, muted: boolean): void {
    this.volume = v;
    this.muted = muted;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(muted ? 0 : v, t, 0.4);
  }

  start(): void {
    this.started = true;
    this.nextStart = this.ctx.currentTime + 0.3;
    this.setVolume(this.volume, this.muted);
    this.update();
  }

  /** Call regularly: schedules the next tune shortly before the current one ends. */
  update(): void {
    if (!this.started) return;
    while (this.nextStart < this.ctx.currentTime + 1.5) this.nextStart = this.playTune(this.pick(), this.nextStart);
  }

  /** Render everything up to `seconds` (offline previews). */
  renderUntil(seconds: number): void {
    this.started = true;
    while (this.nextStart < seconds) this.nextStart = this.playTune(this.pick(), this.nextStart);
  }

  private pick(): ParsedTune {
    const night = this.night > 0.5;
    const pool = this.tunes.filter((t) => t.tune.when === 'any' || t.tune.when === (night ? 'night' : 'day'));
    const options = pool.filter((t) => t.tune.id !== this.lastId);
    const p = options[Math.floor(Math.random() * options.length)] ?? pool[0] ?? this.tunes[0];
    this.lastId = p.tune.id;
    return p;
  }

  /** Schedules one tune (all repeats + interlude) starting at t0; returns the end time. */
  private playTune(p: ParsedTune, t0: number): number {
    const night = this.night > 0.5;
    const meter = `${p.tune.meter[0]}/${p.tune.meter[1]}`;
    const q = 60 / ((MUSIC.tempo[meter] ?? 120) * (night ? MUSIC.nightTempo : 1)); // seconds per quarter
    const L = MUSIC.levels;
    const pickup = -p.start * q;
    let t = t0 + pickup;
    for (let r = 0; r < MUSIC.repeats; r++) {
      const second = r % 2 === 1;
      // melody (2nd pass an octave higher on steel pan by day for some lift)
      for (const n of p.notes) {
        const at = t + n.t * q;
        const midi = n.midi + (second && !night && n.midi < 72 ? 12 : 0);
        if (night) this.marimba(at, midi, L.melody * 0.9);
        else this.pan(at, midi, n.len * q, L.melody);
      }
      this.band(p, t, q, night, p.chords, p.length);
      t += p.length * q;
    }
    // interlude: tonic, then dominant (leads into the next tune)
    const tonic = p.chords.find((c) => c.degree === 0) ?? p.chords[0];
    const dominant = p.chords.find((c) => c.degree === 4) ?? tonic;
    const bars = MUSIC.interludeBars;
    const inter = [{ ...tonic, t: 0 }, { ...dominant, t: Math.max(1, bars - 1) * p.bar }];
    this.band(p, t, q, night, inter, bars * p.bar);
    return t + bars * p.bar * q;
  }

  /** Strums, bass and shaker bar by bar, following the time signature's groove and the chord at each hit. */
  private band(p: ParsedTune, t: number, q: number, night: boolean, chords: Chord[], length: number): void {
    const L = MUSIC.levels;
    const [beats, unit] = p.tune.meter;
    for (let b0 = 0; b0 < length - 0.01; b0 += p.bar) {
      const bar = t + b0 * q;
      const at = (off: number) => chordAt(chords, b0 + off);
      if (beats === 6 && unit === 8) {
        // 6/8: bass on 1 and 4, strums on the 3rd and 6th eighth
        this.bass(bar, at(0).bass, L.bass);
        this.bass(bar + 1.5 * q, at(1.5).bass + (at(1.5).degree === at(0).degree ? 7 : 0), L.bass * 0.8);
        for (const e of [1, 2.5]) this.strum(bar + e * q, at(e).notes, L.strum * (night ? 0.6 : 1));
        if (!night) for (let e = 0; e < 6; e++) this.shaker(bar + e * 0.5 * q, L.shaker * (e % 3 === 0 ? 1.3 : 0.8));
      } else if (beats === 3) {
        // waltz: bass on 1, chord on 2 and 3
        this.bass(bar, at(0).bass, L.bass);
        for (const b of [1, 2]) this.strum(bar + b * q, at(b).notes, L.strum * (night ? 0.55 : 0.8));
      } else {
        // 2/4 calypso: bass on 1 and 2 (root, fifth), strums on the off-beats
        this.bass(bar, at(0).bass, L.bass);
        this.bass(bar + q, at(1).bass + (at(1).degree === at(0).degree ? 7 : 0), L.bass * 0.8);
        for (const b of [0.5, 1.5]) this.strum(bar + b * q, at(b).notes, L.strum * (night ? 0.6 : 1));
        if (!night) for (let e = 0; e < 4; e++) this.shaker(bar + e * 0.5 * q, L.shaker * (e % 2 ? 0.8 : 1.2));
      }
    }
  }

  // ------------------------------------------------------------------ instruments

  /** Karplus-Strong plucked string, cached per pitch and brightness. */
  private pluckBuffer(midi: number, bright: number): AudioBuffer {
    const key = `${midi}|${bright}`;
    let buf = this.plucks.get(key);
    if (buf) return buf;
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 1.4);
    buf = this.ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / mtof(midi)));
    const ring = new Float32Array(period);
    let prev = 0;
    for (let i = 0; i < period; i++) {
      const v = Math.random() * 2 - 1;
      prev = prev + bright * (v - prev); // low-passed excitation = softer pick
      ring[i] = prev;
    }
    const damp = 0.996;
    for (let i = 0, j = 0; i < len; i++) {
      const a = ring[j];
      const b = ring[(j + 1) % period];
      out[i] = a;
      ring[j] = 0.5 * (a + b) * damp;
      j = (j + 1) % period;
    }
    this.plucks.set(key, buf);
    return buf;
  }

  private play(buf: AudioBuffer, t: number, vel: number, dur: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.setTargetAtTime(0, t + dur, 0.06);
    src.connect(g).connect(this.bus);
    src.start(t);
    src.stop(t + dur + 0.4);
  }

  private strum(t: number, notes: number[], vel: number): void {
    notes.forEach((m, i) => this.play(this.pluckBuffer(m, 0.5), t + i * 0.012, vel * (i === 0 ? 1 : 0.8), 0.22));
  }

  private bass(t: number, midi: number, vel: number): void {
    if (vel <= 0) return;
    this.play(this.pluckBuffer(midi, 0.25), t, vel, 0.35);
  }

  private env(t: number, peak: number, attack: number, decay: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  private osc(freq: number, t: number, dur: number, dest: AudioNode): void {
    const o = this.ctx.createOscillator();
    o.frequency.value = freq;
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Steel pan: harmonic partials (fundamental, octave, twelfth) with a bright, quickly fading attack. */
  private pan(t: number, midi: number, len: number, vel: number): void {
    const f = mtof(midi);
    const dur = Math.min(1.4, Math.max(0.45, len + 0.35));
    for (const [mult, amp, dec] of [[1, 1, dur], [2, 0.42, dur * 0.7], [3, 0.16, 0.35], [4, 0.07, 0.15]] as const) {
      const g = this.env(t, vel * amp, 0.005, dec);
      g.connect(this.bus);
      this.osc(f * mult, t, dec, g);
    }
  }

  private marimba(t: number, midi: number, vel: number): void {
    const f = mtof(midi - 12);
    const g = this.env(t, vel, 0.004, 0.8);
    g.connect(this.bus);
    this.osc(f, t, 0.85, g);
    const h = this.env(t, vel * 0.22, 0.002, 0.07);
    h.connect(this.bus);
    this.osc(f * 4, t, 0.1, h);
  }

  private shaker(t: number, vel: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = this.env(t, vel, 0.004, 0.045);
    src.connect(hp).connect(g).connect(this.bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.08);
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
