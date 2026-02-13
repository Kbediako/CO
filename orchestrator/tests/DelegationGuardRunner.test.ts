import { describe, expect, it } from 'vitest';

import {
  buildDelegationGuardEnv,
  hasRepoStrictMarkers,
  parseGuardProfile,
  resolveEffectiveGuardProfile
} from '../src/cli/utils/delegationGuardRunner.js';

describe('delegation guard profile parsing', () => {
  it('parses known profiles and defaults unknown values to auto', () => {
    expect(parseGuardProfile('strict')).toBe('strict');
    expect(parseGuardProfile('warn')).toBe('warn');
    expect(parseGuardProfile('auto')).toBe('auto');
    expect(parseGuardProfile('AUTO')).toBe('auto');
    expect(parseGuardProfile('unknown')).toBe('auto');
    expect(parseGuardProfile(undefined)).toBe('auto');
  });
});

describe('delegation guard profile resolution', () => {
  it('uses explicit profile overrides when provided', () => {
    const strict = resolveEffectiveGuardProfile('/repo', { CODEX_ORCHESTRATOR_GUARD_PROFILE: 'strict' }, () => false);
    const warn = resolveEffectiveGuardProfile('/repo', { CODEX_ORCHESTRATOR_GUARD_PROFILE: 'warn' }, () => true);
    expect(strict).toBe('strict');
    expect(warn).toBe('warn');
  });

  it('resolves auto to strict when repo markers are present', () => {
    const exists = (path: string) =>
      path.endsWith('/AGENTS.md') || path.endsWith('/tasks/index.json') || path.endsWith('/docs/TASKS.md');
    expect(resolveEffectiveGuardProfile('/repo', {}, exists)).toBe('strict');
  });

  it('resolves auto to warn when repo markers are missing', () => {
    expect(resolveEffectiveGuardProfile('/repo', {}, () => false)).toBe('warn');
  });
});

describe('repo marker detection', () => {
  it('requires all strict markers', () => {
    const all = (path: string) =>
      path.endsWith('/AGENTS.md') || path.endsWith('/tasks/index.json') || path.endsWith('/docs/TASKS.md');
    const partial = (path: string) => path.endsWith('/AGENTS.md');
    expect(hasRepoStrictMarkers('/repo', all)).toBe(true);
    expect(hasRepoStrictMarkers('/repo', partial)).toBe(false);
  });
});

describe('delegation guard env shaping', () => {
  it('injects an override reason for warn profile when task id is missing', () => {
    const env = buildDelegationGuardEnv({}, 'warn');
    expect(env.DELEGATION_GUARD_OVERRIDE_REASON).toContain('No MCP_RUNNER_TASK_ID provided');
  });

  it('does not override existing reasons or strict mode', () => {
    const withTask = buildDelegationGuardEnv({ MCP_RUNNER_TASK_ID: 'task-1' }, 'warn');
    const strict = buildDelegationGuardEnv({}, 'strict');
    const existing = buildDelegationGuardEnv(
      { DELEGATION_GUARD_OVERRIDE_REASON: 'manual override' },
      'warn'
    );
    expect(withTask.DELEGATION_GUARD_OVERRIDE_REASON).toBeUndefined();
    expect(strict.DELEGATION_GUARD_OVERRIDE_REASON).toBeUndefined();
    expect(existing.DELEGATION_GUARD_OVERRIDE_REASON).toBe('manual override');
  });
});
