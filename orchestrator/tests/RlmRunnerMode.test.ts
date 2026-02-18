import { describe, expect, it } from 'vitest';

import { __test__ as rlmRunnerTest } from '../src/cli/rlmRunner.js';

const { resolveRlmMode, DEFAULT_SYMBOLIC_MIN_BYTES } = rlmRunnerTest;
const {
  parseFeatureFlagsFromText,
  resolveCollabFeatureKeyFromFlags,
  COLLAB_FEATURE_CANONICAL,
  COLLAB_FEATURE_LEGACY
} = rlmRunnerTest;

describe('rlmRunner mode resolution', () => {
  it('keeps iterative when delegated in auto but context is below large-context threshold', () => {
    const mode = resolveRlmMode(undefined, {
      delegated: true,
      contextBytes: 0,
      hasContextPath: false,
      symbolicMinBytes: DEFAULT_SYMBOLIC_MIN_BYTES
    });
    expect(mode).toBe('iterative');
  });

  it('defaults to symbolic when context path is set and context is large in auto', () => {
    const mode = resolveRlmMode(undefined, {
      delegated: false,
      contextBytes: DEFAULT_SYMBOLIC_MIN_BYTES,
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

  it('keeps iterative for large context without explicit context signal', () => {
    const mode = resolveRlmMode(undefined, {
      delegated: false,
      contextBytes: DEFAULT_SYMBOLIC_MIN_BYTES + 1024,
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

describe('rlmRunner collab feature key resolution', () => {
  it('prefers canonical multi_agent key when available', () => {
    const flags = parseFeatureFlagsFromText(
      ['multi_agent experimental true', 'collaboration_modes stable true'].join('\n')
    );
    expect(resolveCollabFeatureKeyFromFlags(flags)).toBe(COLLAB_FEATURE_CANONICAL);
  });

  it('falls back to legacy collab key when canonical key is absent', () => {
    const flags = parseFeatureFlagsFromText(['collab experimental true'].join('\n'));
    expect(resolveCollabFeatureKeyFromFlags(flags)).toBe(COLLAB_FEATURE_LEGACY);
  });

  it('keeps legacy collab fallback when neither key is present', () => {
    const flags = parseFeatureFlagsFromText(['steer stable true'].join('\n'));
    expect(resolveCollabFeatureKeyFromFlags(flags)).toBe(COLLAB_FEATURE_LEGACY);
  });
});
