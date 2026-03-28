import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vitest runs through Vite middleware mode, which otherwise spins up the
  // default dev websocket listener on port 24678 and can keep non-tty runs alive.
  server: {
    ws: false
  },
  test: {
    environment: 'node',
    include: [
      'orchestrator/tests/**/*.test.ts',
      'packages/orchestrator/tests/**/*.test.ts',
      'packages/control-plane-schemas/tests/**/*.test.ts',
      'packages/sdk-node/tests/**/*.test.ts',
      'packages/shared/tests/**/*.test.ts',
      'patterns/**/*.test.ts',
      'adapters/**/*.test.ts',
      'evaluation/tests/**/*.test.ts',
      'tests/**/*.spec.ts'
    ],
    coverage: {
      enabled: false
    }
  }
});
