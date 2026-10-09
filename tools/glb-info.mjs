// Prints the node tree and mesh attributes of a .glb (debug helper): node tools/glb-info.mjs art/props/x.glb
import { readFileSync } from 'node:fs';
const buf = readFileSync(process.argv[2]);
const len = buf.readUInt32LE(12);
const j = JSON.parse(buf.subarray(20, 20 + len).toString());
const show = (i, d) => {
  const n = j.nodes[i];
  const m = n.mesh != null ? j.meshes[n.mesh].primitives.map((p) => Object.keys(p.attributes).join('+') + ` (${j.accessors[p.attributes.POSITION].count}v)`).join(' | ') : '';
  console.log(`${'  '.repeat(d)}${n.name} t=${(n.translation ?? [0, 0, 0]).map((v) => v.toFixed(2))} ${m}`);
  (n.children ?? []).forEach((c) => show(c, d + 1));
};
j.scenes[0].nodes.forEach((i) => show(i, 0));
