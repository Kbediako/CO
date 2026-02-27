import { describe, expect, it } from 'vitest';

import {
  RUNTIME_MODE_OVERRIDE_ENV_KEYS,
  sanitizeRuntimeModeOverrideEnv
} from '../scripts/runtime-mode-canary.mjs';

describe('runtime-mode-canary env sanitization', () => {
  it('removes runtime override keys and preserves unrelated env values', () => {
    const env = {
      PATH: '/usr/bin',
      CUSTOM_FLAG: '1',
      CODEX_ORCHESTRATOR_RUNTIME_MODE: 'appserver',
      CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'appserver',
      CODEX_RUNTIME_MODE: 'appserver'
    } as NodeJS.ProcessEnv;

    const sanitized = sanitizeRuntimeModeOverrideEnv(env);

    expect(sanitized.PATH).toBe('/usr/bin');
    expect(sanitized.CUSTOM_FLAG).toBe('1');
    for (const key of RUNTIME_MODE_OVERRIDE_ENV_KEYS) {
      expect(sanitized[key]).toBeUndefined();
    }

    expect(env.CODEX_ORCHESTRATOR_RUNTIME_MODE).toBe('appserver');
    expect(env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE).toBe('appserver');
    expect(env.CODEX_RUNTIME_MODE).toBe('appserver');
  });

  it('returns a shallow copy even when no override keys are present', () => {
    const env = {
      PATH: '/usr/local/bin',
      HOME: '/tmp/home'
    } as NodeJS.ProcessEnv;

    const sanitized = sanitizeRuntimeModeOverrideEnv(env);

    expect(sanitized).toEqual(env);
    expect(sanitized).not.toBe(env);
  });
});
