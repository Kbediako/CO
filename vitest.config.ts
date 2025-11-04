import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'orchestrator/tests/**/*.test.ts',
      'packages/orchestrator/tests/**/*.test.ts',
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
