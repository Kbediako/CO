import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['orchestrator/tests/**/*.test.ts'],
    coverage: {
      enabled: false
    }
  }
});
