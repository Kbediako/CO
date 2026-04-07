import { describe, expect, it } from 'vitest';

import { resolveControlPollingNextRefreshProjection } from '../src/cli/control/providerPollingHealth.js';
import type { LinearBudgetStatus } from '../src/cli/control/linearBudgetState.js';

function buildLinearBudget(
  overrides: Partial<LinearBudgetStatus> = {}
): LinearBudgetStatus {
  return {
    observed_at: '2026-04-08T00:00:00.000Z',
    source: 'control-host-polling',
    request_id: 'budget-1',
    retry_after_seconds: null,
    cooldown_until: null,
    cooldown_active: false,
    suppression: 'none',
    suppression_reason: null,
    scope_kind: 'token',
    scope_key: 'legacy',
    viewer_id: null,
    workspace_id: null,
    token_fingerprints: [],
    requests: null,
    endpoint_requests: null,
    complexity: null,
    endpoint_complexity: null,
    endpoint_name: null,
    selected_endpoint_key: null,
    request_complexity: null,
    endpoints: {},
    reservations: [],
    reservations_active: 0,
    ...overrides
  };
}

describe('providerPollingHealth next-refresh projection', () => {
  it('prefers active cooldown over stale scheduled countdown and in-flight checking', () => {
    const projection = resolveControlPollingNextRefreshProjection({
      checking: true,
      nextPollAt: '2026-04-08T00:58:11.000Z',
      nextPollInMs: (58 * 60 + 11) * 1000,
      operationStartedAt: '2026-04-08T00:00:00.000Z',
      linearBudget: buildLinearBudget({
        retry_after_seconds: 29 * 60 + 32,
        cooldown_until: '2026-04-08T00:29:32.000Z',
        cooldown_active: true,
        suppression: 'cooldown',
        suppression_reason: 'linear_budget_shared_cooldown',
        requests: {
          limit: 30,
          remaining: 0,
          reset_at: '2026-04-08T00:29:32.000Z'
        }
      }),
      nowMs: Date.parse('2026-04-08T00:00:00.000Z')
    });

    expect(projection).toEqual({
      state: 'cooldown',
      at: '2026-04-08T00:29:32.000Z',
      in_ms: (29 * 60 + 32) * 1000
    });
  });

  it('switches to checking once cooldown expires and polling is still active', () => {
    const projection = resolveControlPollingNextRefreshProjection({
      checking: true,
      nextPollAt: '2026-04-08T00:58:11.000Z',
      nextPollInMs: (58 * 60 + 11) * 1000,
      operationStartedAt: '2026-04-08T00:29:32.000Z',
      linearBudget: buildLinearBudget({
        cooldown_until: '2026-04-08T00:29:32.000Z',
        cooldown_active: true,
        suppression: 'cooldown',
        suppression_reason: 'linear_budget_shared_cooldown',
        requests: {
          limit: 30,
          remaining: 0,
          reset_at: '2026-04-08T00:29:32.000Z'
        }
      }),
      nowMs: Date.parse('2026-04-08T00:29:33.000Z')
    });

    expect(projection).toEqual({
      state: 'checking',
      at: null,
      in_ms: null
    });
  });

  it('uses the scheduled next poll when there is no active cooldown or in-flight polling', () => {
    const projection = resolveControlPollingNextRefreshProjection({
      checking: false,
      nextPollAt: '2026-04-08T00:15:00.000Z',
      nextPollInMs: 15_000,
      operationStartedAt: null,
      linearBudget: buildLinearBudget(),
      nowMs: Date.parse('2026-04-08T00:14:45.000Z')
    });

    expect(projection).toEqual({
      state: 'scheduled',
      at: '2026-04-08T00:15:00.000Z',
      in_ms: 15_000
    });
  });
});
