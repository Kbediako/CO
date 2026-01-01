import type { AdapterCommandEvaluationConfig } from '../types.js';

const DEFAULT_EVALUATION: AdapterCommandEvaluationConfig = {
  cwd: '{fixture}',
  requiresCleanFixture: true
};

export function withFixtureEvaluation(
  overrides: AdapterCommandEvaluationConfig = {}
): AdapterCommandEvaluationConfig {
  return { ...DEFAULT_EVALUATION, ...overrides };
}
