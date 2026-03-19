import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCloudPreflightFailureContract
} from '../src/cli/services/orchestratorCloudRouteFallbackContract.js';
import type { RuntimeSelection } from '../src/cli/runtime/types.js';

function createRuntimeSelection(overrides: Partial<RuntimeSelection> = {}): RuntimeSelection {
  return {
    requested_mode: 'appserver',
    selected_mode: 'appserver',
    source: 'default',
    provider: 'AppServerRuntimeProvider',
    runtime_session_id: null,
    fallback: {
      occurred: false,
      code: null,
      reason: null,
      from_mode: null,
      to_mode: null,
      checked_at: '2026-03-14T00:00:00.000Z'
    },
    env_overrides: {},
    ...overrides
  };
}

function createContractInput(
  overrides: {
    runtimeSelection?: Partial<RuntimeSelection>;
    envOverrides?: NodeJS.ProcessEnv;
  } = {}
) {
  return {
    runtimeModeRequested: createRuntimeSelection(overrides.runtimeSelection).selected_mode,
    runtimeModeSource: createRuntimeSelection(overrides.runtimeSelection).source,
    envOverrides: overrides.envOverrides ?? {}
  };
}

describe('buildCloudPreflightFailureContract', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a fallback contract with manifest payload and reroute options when fallback is allowed', () => {
    const contract = buildCloudPreflightFailureContract(
      createContractInput({
        runtimeSelection: {
          requested_mode: 'appserver',
          selected_mode: 'cli',
          source: 'default'
        },
        envOverrides: {
          OUTER_FLAG: '1',
          CODEX_CLOUD_BRANCH: 'router-preflight'
        }
      }),
      [
        { code: 'missing_environment', message: 'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId).' },
        {
          code: 'branch_missing',
          message:
            "Cloud branch 'router-preflight' was not found on origin. Push it first or set CODEX_CLOUD_BRANCH to an existing remote branch."
        }
      ]
    );

    expect(contract.outcome).toBe('fallback');
    if (contract.outcome !== 'fallback') {
      return;
    }
    expect(contract.detail).toBe(
      'Cloud preflight failed; falling back to mcp. ' +
        'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId). ' +
        "Cloud branch 'router-preflight' was not found on origin. Push it first or set CODEX_CLOUD_BRANCH to an existing remote branch."
    );
    expect(contract.manifestFallback).toMatchObject({
      mode_requested: 'cloud',
      mode_used: 'mcp',
      reason: contract.detail
    });
    expect(contract.reroute).toEqual({
      mode: 'mcp',
      executionModeOverride: 'mcp',
      runtimeModeRequested: 'cli',
      runtimeModeSource: 'default',
      envOverrides: {
        OUTER_FLAG: '1',
        CODEX_CLOUD_BRANCH: 'router-preflight'
      }
    });
  });

  it('returns a fail contract when fallback is denied through environment policy', () => {
    vi.stubEnv('CODEX_ORCHESTRATOR_CLOUD_FALLBACK', 'deny');

    const contract = buildCloudPreflightFailureContract(createContractInput(), [
      { code: 'missing_environment', message: 'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId).' }
    ]);

    expect(contract).toEqual({
      outcome: 'fail',
      detail:
        'Cloud preflight failed and cloud fallback is disabled. ' +
        'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId).'
    });
  });

  it('prefers envOverrides fallback policy over ambient process env', () => {
    vi.stubEnv('CODEX_ORCHESTRATOR_CLOUD_FALLBACK', 'deny');

    const contract = buildCloudPreflightFailureContract(
      createContractInput({
        envOverrides: {
          CODEX_ORCHESTRATOR_CLOUD_FALLBACK: 'allow'
        }
      }),
      [{ code: 'missing_environment', message: 'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId).' }]
    );

    expect(contract.outcome).toBe('fallback');
  });

  it.each(['0', 'false', 'off', 'deny', 'disabled', 'never', 'strict'])(
    'treats %s as a disabled fallback policy value',
    (policyValue) => {
      const contract = buildCloudPreflightFailureContract(
        createContractInput({
          envOverrides: {
            CODEX_ORCHESTRATOR_CLOUD_FALLBACK: policyValue
          }
        }),
        [{ code: 'missing_environment', message: 'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId).' }]
      );

      expect(contract).toEqual({
        outcome: 'fail',
        detail:
          'Cloud preflight failed and cloud fallback is disabled. ' +
          'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId).'
      });
    }
  );
});
