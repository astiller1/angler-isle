import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import pkg from './package.json';

/** Game version from the latest git tag: "9" on tag v9, "9+62e8d98" for later commits (package.json as fallback). */
function gameVersion(): string {
  try {
    const d = execSync('git describe --tags --long', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const [, tag, ahead, hash] = /^(.*)-(\d+)-g([0-9a-f]+)$/.exec(d) ?? [];
    if (tag) return ahead === '0' ? tag.replace(/^v/, '') : `${tag.replace(/^v/, '')}+${hash}`;
  } catch {
    // no git / no tags
  }
  return pkg.version;
}

export default defineConfig({
  // relative asset URLs: the build works from any sub-path (e.g. GitHub Pages /angler-isle/)
  base: './',
  assetsInclude: ['**/*.glb'],
  define: { __GAME_VERSION__: JSON.stringify(gameVersion()) },
  server: { port: 5173, open: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
} as never);
