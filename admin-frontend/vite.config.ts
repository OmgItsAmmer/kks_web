import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In development the app talks to the API through this proxy, so the browser sees one origin
// (http://localhost:5174) and the session cookie works without any CORS setup.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5174,
    proxy: { '/api': { target: process.env.VITE_DEV_API_TARGET ?? 'http://localhost:5000', changeOrigin: false } },
  },
  build: { sourcemap: true, chunkSizeWarningLimit: 900 },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'] },
});
