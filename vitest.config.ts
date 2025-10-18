import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'orchestrator/tests/**/*.test.ts',
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
