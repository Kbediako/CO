import { describe, expect, it } from 'vitest';

import { __test__ } from '../src/cli/rlmRunner.js';

const { parseMaxIterations, parsePositiveInt, DEFAULT_MAX_ITERATIONS, DEFAULT_MAX_MINUTES } = __test__;

describe('rlmRunner config parsing', () => {
  it('defaults max iterations when undefined', () => {
    expect(parseMaxIterations(undefined, DEFAULT_MAX_ITERATIONS)).toBe(DEFAULT_MAX_ITERATIONS);
  });

  it('accepts unbounded iteration aliases', () => {
    expect(parseMaxIterations('unlimited', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('UNBOUNDED', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('infinite', DEFAULT_MAX_ITERATIONS)).toBe(0);
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
});
