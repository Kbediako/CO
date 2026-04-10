import { defineConfig } from 'vitest/config';

import { createVitestProgressReporter } from './scripts/lib/vitest-progress-reporter.js';

const reporters = shouldEnableVitestProgressReporter(process.env)
  ? ['default', createVitestProgressReporter()]
  : null;
const workerLimits = shouldCapVitestWorkers(process.env)
  ? {
      maxWorkers: 4,
      minWorkers: 1
    }
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
    ...(workerLimits ? workerLimits : {}),
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

function shouldEnableVitestProgressReporter(env: NodeJS.ProcessEnv): boolean {
  // Provider-worker runs are non-interactive and can spend several minutes in
  // long final specs without default Vitest output. Keep the reporter enabled
  // for those lanes so quiet tails are observable instead of looking hung.
  return (
    envFlagEnabled(env.CI) ||
    envFlagEnabled(env.CODEX_VITEST_PROGRESS) ||
    envFlagEnabled(env.CODEX_NON_INTERACTIVE) ||
    envFlagEnabled(env.CODEX_NONINTERACTIVE) ||
    envFlagEnabled(env.CODEX_NO_INTERACTIVE)
  );
}

function shouldCapVitestWorkers(env: NodeJS.ProcessEnv): boolean {
  // CLI-heavy suites spawn nested Node processes and become timeout-prone when
  // the broad lane fully saturates worker threads in CI or explicit
  // stage-owned Vitest runs that opt into progress reporting.
  return envFlagEnabled(env.CI) || envFlagEnabled(env.CODEX_VITEST_PROGRESS);
}
