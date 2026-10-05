import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * Three pages, one origin:
 *   /          — the integration showcase (both systems side by side + live bus)
 *   /edos/     — EdOS, the student learning platform (UCT edition)
 *   /careers/  — the Careers Service platform
 *
 * Same origin is what lets the two apps share the in-browser integration bus
 * with no backend. In production they're separate deployments talking over the
 * webhooks described in docs/INTEGRATION.md.
 */
export default defineConfig({
  root: resolve(__dirname, 'apps'),
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { port: 3300, host: true, fs: { allow: [resolve(__dirname)] } },
  preview: { port: 3300, host: true },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        showcase: resolve(__dirname, 'apps/index.html'),
        edos: resolve(__dirname, 'apps/edos/index.html'),
        careers: resolve(__dirname, 'apps/careers/index.html'),
      },
    },
  },
});
