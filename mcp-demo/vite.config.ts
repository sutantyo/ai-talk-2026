import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    // Same origin in dev as in production: Vite forwards the server's routes to Fastify.
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: false },
      '/oauth': { target: 'http://localhost:8080', changeOrigin: false },
      '/.well-known': { target: 'http://localhost:8080', changeOrigin: false },
      '/mcp': { target: 'http://localhost:8080', changeOrigin: false }
    }
  },
  test: {
    environment: 'node',
    include: ['server/src/**/*.test.ts', 'shared/**/*.test.ts', 'src/**/*.test.ts'],
    testTimeout: 30000
  }
});
