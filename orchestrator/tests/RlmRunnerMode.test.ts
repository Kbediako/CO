import { describe, expect, it } from 'vitest';

import { __test__ as rlmRunnerTest } from '../src/cli/rlmRunner.js';

const { resolveRlmMode, DEFAULT_SYMBOLIC_MIN_BYTES } = rlmRunnerTest;
const {
  resolveSymbolicMultiAgentConfig,
  resolveSymbolicMultiAgentRolePolicyConfig,
  resolveSymbolicMultiAgentAllowDefaultRoleConfig,
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

describe('rlmRunner symbolic multi-agent env resolution', () => {
  it('prefers canonical env key when present', () => {
    const resolved = resolveSymbolicMultiAgentConfig({
      RLM_SYMBOLIC_MULTI_AGENT: '1',
      RLM_SYMBOLIC_COLLAB: '0'
    } as NodeJS.ProcessEnv);
    expect(resolved).toEqual({ enabled: true, source: 'canonical' });
  });

  it('falls back to legacy env key when canonical is absent', () => {
    const resolved = resolveSymbolicMultiAgentConfig({
      RLM_SYMBOLIC_COLLAB: '1'
    } as NodeJS.ProcessEnv);
    expect(resolved).toEqual({ enabled: true, source: 'legacy' });
  });

  it('returns disabled when neither env key is present', () => {
    const resolved = resolveSymbolicMultiAgentConfig({} as NodeJS.ProcessEnv);
    expect(resolved).toEqual({ enabled: false, source: null });
  });
});

describe('rlmRunner symbolic multi-agent role-policy env resolution', () => {
  it('prefers canonical role-policy env key when present', () => {
    const resolved = resolveSymbolicMultiAgentRolePolicyConfig({
      RLM_SYMBOLIC_MULTI_AGENT_ROLE_POLICY: 'warn',
      RLM_COLLAB_ROLE_POLICY: 'off'
    } as NodeJS.ProcessEnv);
    expect(resolved).toEqual({ value: 'warn', source: 'canonical' });
  });

  it('falls back to legacy role-policy env key when canonical is absent', () => {
    const resolved = resolveSymbolicMultiAgentRolePolicyConfig({
      RLM_COLLAB_ROLE_POLICY: 'off'
    } as NodeJS.ProcessEnv);
    expect(resolved).toEqual({ value: 'off', source: 'legacy' });
  });
});

describe('rlmRunner symbolic multi-agent allow-default-role env resolution', () => {
  it('prefers canonical allow-default-role env key when present', () => {
    const resolved = resolveSymbolicMultiAgentAllowDefaultRoleConfig({
      RLM_SYMBOLIC_MULTI_AGENT_ALLOW_DEFAULT_ROLE: '1',
      RLM_COLLAB_ALLOW_DEFAULT_ROLE: '0'
    } as NodeJS.ProcessEnv);
    expect(resolved).toEqual({ value: true, source: 'canonical' });
  });

  it('falls back to legacy allow-default-role env key when canonical is absent', () => {
    const resolved = resolveSymbolicMultiAgentAllowDefaultRoleConfig({
      RLM_COLLAB_ALLOW_DEFAULT_ROLE: '1'
    } as NodeJS.ProcessEnv);
    expect(resolved).toEqual({ value: true, source: 'legacy' });
  });
});
