import { defineConfig } from 'vitest/config';

import { createVitestProgressReporter } from './scripts/lib/vitest-progress-reporter.js';

const reporters = envFlagEnabled(process.env.CI)
  ? ['default', createVitestProgressReporter()]
  : null;

export default defineConfig({
  // Vitest runs through Vite middleware mode, which otherwise spins up the
  // default dev websocket listener on port 24678 and can keep non-tty runs alive.
  server: {
    ws: false
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/vitest.setup.ts'],
    include: [
      'orchestrator/tests/**/*.test.ts',
      'packages/orchestrator/tests/**/*.test.ts',
      'packages/control-plane-schemas/tests/**/*.test.ts',
      'packages/sdk-node/tests/**/*.test.ts',
      'packages/shared/tests/**/*.test.ts',
      'patterns/**/*.test.ts',
      'tests/**/*.spec.ts'
    ],
    ...(reporters ? { reporters } : {}),
    coverage: {
      enabled: false
    }
  }
});

function envFlagEnabled(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
