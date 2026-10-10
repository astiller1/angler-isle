import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset URLs: the build works from any sub-path (e.g. GitHub Pages /angler-isle/)
  base: './',
  assetsInclude: ['**/*.glb'],
  server: { port: 5173, open: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
} as never);
