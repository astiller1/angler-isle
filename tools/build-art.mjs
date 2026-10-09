// Runs the Blender Python scripts in art/ headless and exports a .glb next to each script.
//   npm run art                 -> rebuild every model
//   npm run art -- fish         -> rebuild every script whose path contains "fish"
//   npm run art -- --open props/rod  -> open Blender GUI with that model built (no export)
// Set BLENDER_PATH if Blender is not in a default location.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import os from 'node:os';

const root = join(import.meta.dirname, '..');
const artDir = join(root, 'art');

function findBlender() {
  if (process.env.BLENDER_PATH) return process.env.BLENDER_PATH;
  const candidates = [];
  for (const base of ['C:\\Program Files\\Blender Foundation', 'C:\\Program Files (x86)\\Blender Foundation']) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base).sort().reverse()) candidates.push(join(base, d, 'blender.exe'));
  }
  candidates.push('/Applications/Blender.app/Contents/MacOS/Blender', '/usr/bin/blender', '/snap/bin/blender');
  return candidates.find((c) => existsSync(c)) ?? 'blender';
}

function listScripts(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!name.startsWith('_')) out.push(...listScripts(p));
    } else if (name.endsWith('.py') && !name.startsWith('_')) out.push(p);
  }
  return out;
}

function run(blender, args) {
  return new Promise((resolve) => {
    const proc = spawn(blender, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    proc.stdout.on('data', (d) => (log += d));
    proc.stderr.on('data', (d) => (log += d));
    proc.on('close', (code) => resolve({ code, log }));
  });
}

const args = process.argv.slice(2);
const blender = findBlender();
const open = args.includes('--open');
const filters = args.filter((a) => !a.startsWith('--'));

let scripts = listScripts(artDir);
if (filters.length) scripts = scripts.filter((s) => filters.some((f) => relative(artDir, s).split(sep).join('/').includes(f)));
if (!scripts.length) {
  console.error('No matching scripts.');
  process.exit(1);
}

if (open) {
  spawn(blender, ['--python', scripts[0]], { stdio: 'inherit', detached: true }).unref();
  console.log(`Opening ${relative(root, scripts[0])} in Blender…`);
} else {
  const queue = [...scripts];
  let failed = 0;
  const worker = async () => {
    while (queue.length) {
      const s = queue.shift();
      const rel = relative(root, s);
      const t = Date.now();
      const { code, log } = await run(blender, ['--background', '--factory-startup', '--python-exit-code', '1', '--python', s]);
      if (code === 0 && !/Traceback/.test(log)) console.log(`✓ ${rel} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
      else {
        failed++;
        console.error(`✗ ${rel}\n${log.split('\n').filter((l) => !/^(Blender|Read|Warning: 'Unsupported)/.test(l)).slice(-25).join('\n')}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, os.cpus().length) }, worker));
  console.log(failed ? `${failed} script(s) failed.` : `Built ${scripts.length} model(s).`);
  process.exit(failed ? 1 : 0);
}
