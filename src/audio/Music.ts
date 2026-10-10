import { MUSIC } from '../data/music';
import { Composer, type BarEvents } from './compose';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * Live-synthesized island music (Web Audio, no audio files). A look-ahead scheduler plays one bar
 * at a time from the Composer. `night` (0..1, from the day cycle) slows the tempo and swaps the
 * band for a mellow late-evening set: pads + marimba instead of strums + steel pan, no drums.
 * Works with a realtime AudioContext and with an OfflineAudioContext (for tests/previews).
 */
export class Music {
  readonly master: GainNode;
  private bus: GainNode;
  private noise: AudioBuffer;
  private composer: Composer;
  private nextBar = 0;
  private timer: number | null = null;
  /** 0 = day band, 1 = night band. Set every frame by the game. */
  night = 0;
  private volume = MUSIC.volume;
  private muted = false;

  constructor(
    readonly ctx: BaseAudioContext,
    seed = Date.now(),
  ) {
    this.composer = new Composer(seed);
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    // dry bus + a small generated reverb for a warm, airy feel
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    const verb = ctx.createConvolver();
    verb.buffer = this.impulse(2.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    this.bus.connect(verb).connect(wet).connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  private impulse(seconds: number): AudioBuffer {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  setVolume(v: number, muted: boolean): void {
    this.volume = v;
    this.muted = muted;
    const target = muted ? 0 : v;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(target, t, 0.4);
  }

  /** Start the realtime scheduler (call after a user gesture has resumed the context). */
  start(): void {
    if (this.timer !== null) return;
    this.nextBar = this.ctx.currentTime + 0.1;
    this.setVolume(this.volume, this.muted);
    // generous look-ahead so throttled timers (busy frames, background tabs) never leave gaps
    this.timer = window.setInterval(() => this.schedule(this.ctx.currentTime + 1.2), 100);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  /** Schedule every bar that starts before `until` (also used directly for offline rendering). */
  schedule(until: number): void {
    while (this.nextBar < until) {
      const bpm = MUSIC.dayBpm + (MUSIC.nightBpm - MUSIC.dayBpm) * this.night;
      const beat = 60 / bpm;
      this.playBar(this.composer.next(), this.nextBar, beat);
      this.nextBar += beat * 4;
    }
  }

  // ------------------------------------------------------------------ arrangement

  private playBar(bar: BarEvents, t0: number, beat: number): void {
    const n = this.night;
    const day = 1 - n;
    const at = (b: number) => t0 + b * beat;
    // a little swing on the off-beats
    const swing = (b: number) => at(b + (b % 1 === 0.5 ? 0.06 : 0));

    for (const e of bar.bass) this.bass(swing(e.beat), e.midi, e.len * beat, e.vel * (0.55 + 0.15 * day));

    if (day > 0.05) for (const s of bar.strum) this.chuck(swing(s.beat), s.notes, 0.13 * day);
    if (n > 0.05) this.pad(t0, bar.strum[0].notes, beat * 4, 0.028 * n);

    for (const e of bar.melody) {
      if (n > 0.5 && e.beat % 1 !== 0 && Math.random() < n * 0.6) continue; // sparser at night
      if (n < 0.5) this.pan(swing(e.beat), e.midi, e.len * beat, 0.22 * e.vel);
      else this.marimba(swing(e.beat), e.midi - 12, 0.2 * e.vel);
    }

    const drums = Math.max(0, 1 - n * 1.15);
    if (drums > 0.02) {
      for (let s = 0; s < 8; s++) this.shaker(swing(s * 0.5), (s % 2 ? 0.05 : 0.08) * drums);
      this.kick(at(0), 0.35 * drums);
      this.kick(at(2), 0.25 * drums);
      for (const [b, hi] of [[1.5, true], [2.5, false], [3, true], [3.5, false]] as [number, boolean][]) {
        if (bar.barInSection % 2 === 1 || b !== 3) this.bongo(swing(b), hi, 0.16 * drums);
      }
    } else if (n > 0.6) {
      this.shaker(at(1), 0.025);
      this.shaker(at(3), 0.025);
    }
  }

  // ------------------------------------------------------------------ instruments

  private env(t: number, peak: number, attack: number, decay: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, dest: AudioNode): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  /** Steel pan: bright sine partials, the 4th slightly out of tune, quick shimmer decay. */
  private pan(t: number, midi: number, len: number, vel: number): void {
    const f = mtof(midi);
    const dur = Math.max(0.5, Math.min(1.2, len + 0.4));
    const g = this.env(t, vel, 0.006, dur);
    g.connect(this.bus);
    this.osc('sine', f, t, dur, g);
    const h2 = this.ctx.createGain();
    h2.gain.value = 0.32;
    h2.connect(g);
    this.osc('sine', f * 2, t, dur, h2);
    const h3 = this.env(t, vel * 0.12, 0.004, 0.18);
    h3.connect(this.bus);
    this.osc('sine', f * 3.92, t, 0.25, h3);
  }

  private marimba(t: number, midi: number, vel: number): void {
    const f = mtof(midi);
    const g = this.env(t, vel, 0.004, 0.7);
    g.connect(this.bus);
    this.osc('sine', f, t, 0.75, g);
    const h = this.env(t, vel * 0.25, 0.002, 0.08);
    h.connect(this.bus);
    this.osc('sine', f * 4, t, 0.1, h);
  }

  private bass(t: number, midi: number, len: number, vel: number): void {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const g = this.env(t, vel * 0.5, 0.012, Math.max(0.2, len));
    lp.connect(g).connect(this.bus);
    this.osc('triangle', mtof(midi), t, len + 0.1, lp);
    this.osc('sine', mtof(midi), t, len + 0.1, lp);
  }

  /** Muted off-beat guitar strum ("chuck"). */
  private chuck(t: number, notes: number[], vel: number): void {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    lp.Q.value = 0.6;
    const g = this.env(t, vel, 0.004, 0.16);
    lp.connect(g).connect(this.bus);
    notes.forEach((m, i) => this.osc('sawtooth', mtof(m), t + i * 0.008, 0.2, lp));
  }

  private pad(t: number, notes: number[], dur: number, vel: number): void {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(g).connect(this.bus);
    for (const m of notes) {
      this.osc('triangle', mtof(m), t, dur + 0.5, lp);
      this.osc('sine', mtof(m) * 1.004, t, dur + 0.5, lp);
    }
  }

  private shaker(t: number, vel: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const g = this.env(t, vel, 0.003, 0.05);
    src.connect(hp).connect(g).connect(this.bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.1);
  }

  private bongo(t: number, high: boolean, vel: number): void {
    const f = high ? 330 : 230;
    const g = this.env(t, vel, 0.002, 0.14);
    g.connect(this.bus);
    const o = this.osc('sine', f, t, 0.2, g);
    o.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.08);
  }

  private kick(t: number, vel: number): void {
    const g = this.env(t, vel, 0.003, 0.22);
    g.connect(this.bus);
    const o = this.osc('sine', 120, t, 0.3, g);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
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
