import { describe, expect, it } from 'vitest';
import ensureRunSummaryFields from '../ensure-run-summary-fields.js';
import { runCodemod } from '../../tests/runCodemod.js';

describe('ensure-run-summary-fields codemod', () => {
  it('adds mode and timestamp properties when missing', () => {
    const input = `
      function createSummary(taskId, plan, build, test, review, mode) {
        return { taskId, plan, build, test, review };
      }
    `;
    const output = runCodemod(ensureRunSummaryFields, input);
    expect(output).toContain('mode,');
    expect(output).toContain("timestamp: new Date().toISOString()");
  });

  it('does not duplicate existing fields', () => {
    const input = `
      function createSummary(taskId, plan, build, test, review, mode) {
        return {
          taskId,
          plan,
          build,
          test,
          review,
          mode,
          timestamp: timestampFormatter()
        };
      }
    `;
    const output = runCodemod(ensureRunSummaryFields, input);
    const modeMatches = output.match(/mode,/g) ?? [];
    expect(modeMatches.length).toBe(1);
    const timestampMatches = output.match(/timestamp:/g) ?? [];
    expect(timestampMatches.length).toBe(1);
  });
});
