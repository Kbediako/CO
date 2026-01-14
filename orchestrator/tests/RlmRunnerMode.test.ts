import { describe, expect, it } from 'vitest';

import { __test__ as rlmRunnerTest } from '../src/cli/rlmRunner.js';

const { resolveRlmMode, DEFAULT_SYMBOLIC_MIN_BYTES } = rlmRunnerTest;

describe('rlmRunner mode resolution', () => {
  it('defaults to symbolic when delegated in auto', () => {
    const mode = resolveRlmMode(undefined, {
      delegated: true,
      contextBytes: 0,
      hasContextPath: false,
      symbolicMinBytes: DEFAULT_SYMBOLIC_MIN_BYTES
    });
    expect(mode).toBe('symbolic');
  });

  it('defaults to symbolic when context path is set in auto', () => {
    const mode = resolveRlmMode(undefined, {
      delegated: false,
      contextBytes: 0,
      hasContextPath: true,
      symbolicMinBytes: DEFAULT_SYMBOLIC_MIN_BYTES
    });
    expect(mode).toBe('symbolic');
  });

  it('defaults to iterative for small standalone auto runs', () => {
    const mode = resolveRlmMode(undefined, {
      delegated: false,
      contextBytes: DEFAULT_SYMBOLIC_MIN_BYTES - 1,
      hasContextPath: false,
      symbolicMinBytes: DEFAULT_SYMBOLIC_MIN_BYTES
    });
    expect(mode).toBe('iterative');
  });

  it('rejects unknown mode values', () => {
    const mode = resolveRlmMode('unknown', {
      delegated: false,
      contextBytes: 0,
      hasContextPath: false,
      symbolicMinBytes: DEFAULT_SYMBOLIC_MIN_BYTES
    });
    expect(mode).toBeNull();
  });
});
