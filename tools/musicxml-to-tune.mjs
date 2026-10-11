// Converts a (single-voice) MusicXML melody into the compact tune format used by src/data/tunes.ts.
//   node tools/musicxml-to-tune.mjs path/to/tune.xml [id]
// Output: { id, title, fifths, beats, beatType, notes } where notes = "midi:len midi:len …" (len in quarter
// notes, r = rest). Repeats (|: :|) and 1st/2nd endings are expanded, ties are merged, chords keep the top note.
import { readFileSync } from 'node:fs';

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const tag = (s, t) => (s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1];

export function convert(xml, id = 'tune') {
  const title = (tag(xml, 'movement-title') || tag(xml, 'work-title') || id).replace(/^\d+\.\s*/, '').trim();
  const part = tag(xml, 'part') ?? xml;
  const measures = [...part.matchAll(/<measure[^>]*>([\s\S]*?)<\/measure>/g)].map((m) => m[1]);
  let divisions = 1;
  let fifths = 0;
  let beats = 4;
  let beatType = 4;
  const parsed = measures.map((m) => {
    if (tag(m, 'divisions')) divisions = Number(tag(m, 'divisions'));
    if (tag(m, 'fifths')) fifths = Number(tag(m, 'fifths'));
    if (tag(m, 'beats')) beats = Number(tag(m, 'beats'));
    if (tag(m, 'beat-type')) beatType = Number(tag(m, 'beat-type'));
    const notes = [];
    for (const nm of m.matchAll(/<note[^>]*>([\s\S]*?)<\/note>/g)) {
      const n = nm[1];
      if (/<grace/.test(n)) continue;
      const voice = Number(tag(n, 'voice') ?? 1);
      if (voice !== 1) continue;
      const len = Number(tag(n, 'duration') ?? 0) / divisions;
      if (/<chord\s*\/>/.test(n)) {
        // keep the highest pitch of a chord as melody
        const p = pitchOf(n);
        const last = notes[notes.length - 1];
        if (p !== null && last && last.midi !== null && p > last.midi) last.midi = p;
        continue;
      }
      const midi = /<rest/.test(n) ? null : pitchOf(n);
      notes.push({ midi, len, tieStop: /<tie type="stop"\s*\/>/.test(n) });
    }
    return {
      notes,
      forward: /<repeat direction="forward"/.test(m),
      backward: /<repeat direction="backward"/.test(m),
      ending: (m.match(/<ending number="([\d, ]+)" type="start"/) || [])[1]?.split(/[ ,]+/).map(Number) ?? null,
    };
  });

  // expand repeats (|: … :|) with optional 1st/2nd endings
  const order = [];
  let start = 0;
  for (let i = 0; i < parsed.length; i++) {
    const m = parsed[i];
    if (m.forward) start = i;
    if (m.ending && !m.ending.includes(1)) continue; // 2nd endings are reached from the repeat below
    order.push(i);
    if (m.backward) {
      for (let j = start; j <= i; j++) if (!(parsed[j].ending && parsed[j].ending.includes(1))) order.push(j);
      const second = parsed.findIndex((x, k) => k > i && x.ending && x.ending.includes(2));
      if (second > 0) {
        order.push(second);
        i = second;
      }
      start = i + 1;
    }
  }
  // merge tied notes (also across bar lines)
  const out = [];
  for (const n of order.flatMap((i) => parsed[i].notes)) {
    const last = out[out.length - 1];
    if (n.tieStop && last && last.midi === n.midi) last.len += n.len;
    else out.push({ midi: n.midi, len: n.len });
  }
  const notes = out
    .filter((n) => n.len > 0)
    .map((n) => `${n.midi ?? 'r'}:${+n.len.toFixed(3)}`)
    .join(' ');
  return { id, title, fifths, beats, beatType, notes };
}

function pitchOf(n) {
  const p = tag(n, 'pitch');
  if (!p) return null;
  return 12 * (Number(tag(p, 'octave')) + 1) + STEP[tag(p, 'step').trim()] + Number(tag(p, 'alter') ?? 0);
}

if (process.argv[2]) {
  const t = convert(readFileSync(process.argv[2], 'utf8'), process.argv[3]);
  console.log(JSON.stringify(t, null, 2));
}
