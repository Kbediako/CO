import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vitest runs through Vite middleware mode, which otherwise spins up the
  // default dev websocket listener on port 24678 and can keep non-tty runs alive.
  server: {
    ws: false
  },
  test: {
    environment: 'node',
    include: ['adapters/**/*.test.ts'],
    coverage: {
      enabled: false
    }
  }
});
