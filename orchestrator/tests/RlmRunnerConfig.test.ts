import { describe, expect, it } from 'vitest';

import { __test__ } from '../src/cli/rlmRunner.js';

const {
  parseMaxIterations,
  parsePositiveInt,
  parseProbability,
  resolveAlignmentCheckerEnabled,
  resolveAlignmentCheckerEnforce,
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_MAX_MINUTES,
  DEFAULT_ALIGNMENT_CHECKER_ENABLED,
  DEFAULT_ALIGNMENT_CHECKER_ENFORCE
} = __test__;

describe('rlmRunner config parsing', () => {
  it('defaults max iterations when undefined', () => {
    expect(parseMaxIterations(undefined, DEFAULT_MAX_ITERATIONS)).toBe(DEFAULT_MAX_ITERATIONS);
  });

  it('accepts unbounded iteration aliases', () => {
    expect(parseMaxIterations('unlimited', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('UNBOUNDED', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('infinite', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('infinity', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('  unlimited  ', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('UnLiMiTeD', DEFAULT_MAX_ITERATIONS)).toBe(0);
  });

  it('parses numeric iteration values', () => {
    expect(parseMaxIterations('10', DEFAULT_MAX_ITERATIONS)).toBe(10);
    expect(parseMaxIterations('0', DEFAULT_MAX_ITERATIONS)).toBe(0);
  });

  it('rejects invalid iteration values', () => {
    expect(parseMaxIterations('-1', DEFAULT_MAX_ITERATIONS)).toBeNull();
    expect(parseMaxIterations('n/a', DEFAULT_MAX_ITERATIONS)).toBeNull();
  });

  it('defaults max minutes to 48 hours', () => {
    expect(DEFAULT_MAX_MINUTES).toBe(48 * 60);
    expect(parsePositiveInt(undefined, DEFAULT_MAX_MINUTES)).toBe(48 * 60);
  });

  it('parses probability ranges for alignment thresholds', () => {
    expect(parseProbability(undefined, 0.7)).toBe(0.7);
    expect(parseProbability('0.15', 0.7)).toBe(0.15);
    expect(parseProbability('1', 0.7)).toBe(1);
    expect(parseProbability('-0.1', 0.7)).toBeNull();
    expect(parseProbability('1.1', 0.7)).toBeNull();
    expect(parseProbability('n/a', 0.7)).toBeNull();
  });

  it('resolves alignment checker toggle defaults and overrides', () => {
    expect(resolveAlignmentCheckerEnabled({} as NodeJS.ProcessEnv)).toBe(
      DEFAULT_ALIGNMENT_CHECKER_ENABLED
    );
    expect(resolveAlignmentCheckerEnabled({ RLM_ALIGNMENT_CHECKER: '0' } as NodeJS.ProcessEnv)).toBe(
      false
    );
    expect(resolveAlignmentCheckerEnabled({ RLM_ALIGNMENT_CHECKER: '1' } as NodeJS.ProcessEnv)).toBe(
      true
    );
  });

  it('resolves alignment checker enforce defaults and overrides', () => {
    expect(resolveAlignmentCheckerEnforce({} as NodeJS.ProcessEnv)).toBe(
      DEFAULT_ALIGNMENT_CHECKER_ENFORCE
    );
    expect(
      resolveAlignmentCheckerEnforce({ RLM_ALIGNMENT_CHECKER_ENFORCE: '1' } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      resolveAlignmentCheckerEnforce({ RLM_ALIGNMENT_CHECKER_ENFORCE: '0' } as NodeJS.ProcessEnv)
    ).toBe(false);
  });
});
