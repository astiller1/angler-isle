import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.glb'],
  server: { port: 5173, open: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
} as never);
