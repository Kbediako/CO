import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readSharedLinearBudgetStatus,
  recordLinearBudgetHeadersObservation,
  recordLinearBudgetRateLimitObservation,
  reserveLinearBudgetReservation,
  resolveLinearBudgetPreflight,
  resolveLinearPollingInterval
} from '../src/cli/control/linearBudgetState.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function createEnv(codexHome: string, token = 'lin-api-token'): NodeJS.ProcessEnv {
  return {
    CODEX_HOME: codexHome,
    CO_LINEAR_API_TOKEN: token
  };
}

describe('linearBudgetState', () => {
  it('persists shared cooldown state when a response exhausts the request bucket', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const resetAtMs = Date.now() + 60_000;
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '0',
        'x-ratelimit-requests-reset': String(resetAtMs),
        'x-request-id': 'req-123'
      }
    });

    const budget = await readSharedLinearBudgetStatus(env);
    expect(budget).toMatchObject({
      source: 'dispatch_source_issue_by_id',
      request_id: 'req-123',
      cooldown_active: true,
      suppression: 'cooldown',
      requests: {
        limit: 100,
        remaining: 0
      }
    });
    expect(Date.parse(budget?.cooldown_until ?? '')).toBeGreaterThan(Date.now());
  });

  it('ignores request-id-only header observations so they cannot clear shared budget state', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const resetAtMs = Date.now() + 60_000;
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '0',
        'x-ratelimit-requests-reset': String(resetAtMs),
        'x-request-id': 'req-123'
      }
    });

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-request-id': 'req-456'
      }
    });

    await expect(readSharedLinearBudgetStatus(env)).resolves.toMatchObject({
      source: 'dispatch_source_issue_by_id',
      request_id: 'req-123',
      cooldown_active: true,
      suppression: 'cooldown',
      requests: {
        limit: 100,
        remaining: 0
      }
    });
  });

  it('ignores headerless rate-limit observations so they cannot clear shared budget state', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const resetAtMs = Date.now() + 60_000;
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '0',
        'x-ratelimit-requests-reset': String(resetAtMs),
        'x-request-id': 'req-123'
      }
    });

    await recordLinearBudgetRateLimitObservation({
      env,
      source: 'provider-linear:issue-context',
      rateLimit: {
        code: 'linear_rate_limited',
        message: 'Linear API rate limit exceeded.',
        status: 429,
        retryable: true,
        details: {
          errors: [{ message: 'Rate limit exceeded' }]
        }
      }
    });

    await expect(readSharedLinearBudgetStatus(env)).resolves.toMatchObject({
      source: 'dispatch_source_issue_by_id',
      request_id: 'req-123',
      cooldown_active: true,
      suppression: 'cooldown',
      requests: {
        limit: 100,
        remaining: 0
      }
    });
  });

  it('merges user-scoped observations across tokens for the same viewer scope', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const envA = createEnv(codexHome, 'lin-api-token-a');
    const envB = createEnv(codexHome, 'lin-api-token-b');

    await recordLinearBudgetHeadersObservation({
      env: envA,
      source: 'dispatch_source_issue_by_id',
      scope: {
        workspaceId: 'workspace-1',
        viewerId: 'viewer-1'
      },
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '40'
      }
    });
    await recordLinearBudgetHeadersObservation({
      env: envB,
      source: 'provider-linear:issue-context:read-issue-context',
      scope: {
        workspaceId: 'workspace-1',
        viewerId: 'viewer-1'
      },
      headers: {
        'x-ratelimit-complexity-limit': '1000',
        'x-ratelimit-complexity-remaining': '900'
      }
    });

    const budget = await readSharedLinearBudgetStatus(envB);
    expect(budget).toMatchObject({
      scope_kind: 'user',
      viewer_id: 'viewer-1',
      workspace_id: 'workspace-1',
      requests: {
        limit: 100,
        remaining: 40
      },
      complexity: {
        limit: 1000,
        remaining: 900
      }
    });
    expect(new Set(budget?.token_fingerprints ?? []).size).toBe(2);
    await expect(readdir(join(codexHome, 'orchestrator', 'linear-budget', 'scopes'))).resolves.toHaveLength(1);
  });

  it('keeps older shared scope endpoint buckets and reservations when a newer legacy token snapshot exists', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const envA = createEnv(codexHome, 'lin-api-token-a');
    const envB = createEnv(codexHome, 'lin-api-token-b');
    const scopedObservedAt = '2026-04-07T09:00:00.000Z';
    const legacyObservedAt = '2026-04-07T09:05:00.000Z';
    const migratedObservedAt = '2026-04-07T09:10:00.000Z';

    await recordLinearBudgetHeadersObservation({
      env: envA,
      source: 'dispatch_source_issue_by_id',
      observedAt: scopedObservedAt,
      scope: {
        workspaceId: 'workspace-1',
        viewerId: 'viewer-1'
      },
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '2',
        'x-ratelimit-endpoint-name': 'IssueContext',
        'x-ratelimit-endpoint-requests-limit': '20',
        'x-ratelimit-endpoint-requests-remaining': '5'
      }
    });

    const reserved = await reserveLinearBudgetReservation({
      env: envA,
      operation: 'dispatch_source_issue_by_id'
    });
    expect(reserved.ok).toBe(true);

    try {
      await recordLinearBudgetHeadersObservation({
        env: envB,
        source: 'provider-linear:issue-context:read-issue-context',
        observedAt: legacyObservedAt,
        headers: {
          'x-ratelimit-complexity-limit': '1000',
          'x-ratelimit-complexity-remaining': '900'
        }
      });

      await recordLinearBudgetHeadersObservation({
        env: envB,
        source: 'provider-linear:issue-context:read-issue-context',
        observedAt: migratedObservedAt,
        scope: {
          workspaceId: 'workspace-1',
          viewerId: 'viewer-1'
        },
        headers: {
          'x-ratelimit-complexity-limit': '1000',
          'x-ratelimit-complexity-remaining': '850'
        }
      });

      const budget = await readSharedLinearBudgetStatus(envB, {
        operation: 'dispatch_source_issue_by_id'
      });
      expect(budget).toMatchObject({
        scope_kind: 'user',
        viewer_id: 'viewer-1',
        workspace_id: 'workspace-1',
        requests: {
          limit: 100,
          remaining: 1
        },
        complexity: {
          limit: 1000,
          remaining: 850
        },
        endpoint_name: 'IssueContext',
        endpoint_requests: {
          limit: 20,
          remaining: 4
        },
        reservations_active: 1
      });
      expect(new Set(budget?.token_fingerprints ?? []).size).toBe(2);
      expect(Object.values(budget?.endpoints ?? {})[0]).toMatchObject({
        endpoint_name: 'IssueContext',
        requests: {
          limit: 20,
          remaining: 5
        }
      });
    } finally {
      if (reserved.ok) {
        await reserved.reservation?.release();
      }
    }
  });

  it('lets a newer scoped snapshot clear stale legacy cooldown state during mixed-file reads', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T09:00:00.000Z'));

    try {
      const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
      tempDirs.push(codexHome);
      const env = createEnv(codexHome);
      const legacyObservedAt = new Date(Date.now()).toISOString();
      const scopedObservedAt = new Date(Date.now() + 5_000).toISOString();

      await recordLinearBudgetHeadersObservation({
        env,
        source: 'dispatch_source_issue_by_id',
        observedAt: legacyObservedAt,
        headers: {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': String(Date.now() + 60_000)
        }
      });

      await recordLinearBudgetHeadersObservation({
        env,
        source: 'provider-linear:issue-context:read-issue-context',
        observedAt: scopedObservedAt,
        scope: {
          workspaceId: 'workspace-1',
          viewerId: 'viewer-1'
        },
        headers: {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '50'
        }
      });

      await expect(readSharedLinearBudgetStatus(env)).resolves.toMatchObject({
        scope_kind: 'user',
        viewer_id: 'viewer-1',
        workspace_id: 'workspace-1',
        cooldown_until: null,
        cooldown_active: false,
        requests: {
          limit: 100,
          remaining: 50
        }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not resurrect released reservations from the legacy migration file', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_tracked_issues',
      observedAt: '2026-04-07T09:00:00.000Z',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '2'
      }
    });

    const reserved = await reserveLinearBudgetReservation({
      env,
      operation: 'dispatch_source_tracked_issues'
    });
    expect(reserved.ok).toBe(true);

    try {
      await recordLinearBudgetHeadersObservation({
        env,
        source: 'dispatch_source_tracked_issues',
        observedAt: '2026-04-07T09:05:00.000Z',
        scope: {
          workspaceId: 'workspace-1',
          viewerId: 'viewer-1'
        },
        headers: {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '2'
        }
      });

      await expect(
        readSharedLinearBudgetStatus(env, {
          operation: 'dispatch_source_tracked_issues'
        })
      ).resolves.toMatchObject({
        scope_kind: 'user',
        reservations_active: 1
      });
    } finally {
      if (reserved.ok) {
        await reserved.reservation?.release();
      }
    }

    const afterRelease = await readSharedLinearBudgetStatus(env, {
      operation: 'dispatch_source_tracked_issues'
    });
    expect(afterRelease).toMatchObject({
      scope_kind: 'user',
      viewer_id: 'viewer-1',
      workspace_id: 'workspace-1',
      reservations_active: 0
    });
    expect(afterRelease).toMatchObject({
      reservations: []
    });
  });

  it('serializes reservations across tokens that share a user-scoped budget', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const envA = createEnv(codexHome, 'lin-api-token-a');
    const envB = createEnv(codexHome, 'lin-api-token-b');

    for (const env of [envA, envB]) {
      await recordLinearBudgetHeadersObservation({
        env,
        source: 'dispatch_source_tracked_issues',
        scope: {
          workspaceId: 'workspace-1',
          viewerId: 'viewer-1'
        },
        headers: {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '2'
        }
      });
    }

    const [first, second] = await Promise.all([
      reserveLinearBudgetReservation({
        env: envA,
        operation: 'dispatch_source_tracked_issues'
      }),
      reserveLinearBudgetReservation({
        env: envB,
        operation: 'dispatch_source_tracked_issues'
      })
    ]);

    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
    expect([first.ok, second.ok].filter((value) => !value)).toHaveLength(1);
    const budget = await readSharedLinearBudgetStatus(envA, {
      operation: 'dispatch_source_tracked_issues'
    });
    expect(budget).toMatchObject({
      scope_kind: 'user',
      reservations_active: 1,
      requests: {
        remaining: 1
      }
    });

    if (first.ok) {
      await first.reservation?.release();
    }
    if (second.ok) {
      await second.reservation?.release();
    }
  });

  it('stores endpoint-specific buckets by endpoint identity and preserves x-complexity', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);
    const resetAtMs = Date.now() + 60_000;

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context:read-issue-context',
      headers: {
        'x-ratelimit-endpoint-name': 'IssueContext',
        'x-ratelimit-endpoint-requests-limit': '20',
        'x-ratelimit-endpoint-requests-remaining': '5',
        'x-ratelimit-endpoint-requests-reset': String(resetAtMs),
        'x-complexity': '7'
      }
    });
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:attach-pr:read-issue-context',
      headers: {
        'x-ratelimit-endpoint-name': 'IssueContext',
        'x-ratelimit-endpoint-complexity-limit': '50',
        'x-ratelimit-endpoint-complexity-remaining': '6',
        'x-ratelimit-endpoint-complexity-reset': String(resetAtMs)
      }
    });

    const budget = await readSharedLinearBudgetStatus(env, {
      operation: 'provider-linear:attach-pr:read-issue-context'
    });
    expect(budget?.endpoint_name).toBe('IssueContext');
    expect(budget?.request_complexity).toBe(7);
    expect(budget?.endpoint_requests).toMatchObject({
      limit: 20,
      remaining: 5
    });
    expect(budget?.endpoint_complexity).toMatchObject({
      limit: 50,
      remaining: 6
    });
    expect(Object.keys(budget?.endpoints ?? {})).toHaveLength(1);
    expect(Object.values(budget?.endpoints ?? {})[0]).toMatchObject({
      endpoint_name: 'IssueContext',
      aliases: expect.arrayContaining([
        'provider-linear:issue-context:read-issue-context',
        'provider-linear:attach-pr:read-issue-context'
      ]),
      request_complexity: 7
    });
  });

  it('matches step-scoped endpoint observations when preflighting a top-level provider operation', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);
    const resetAtMs = Date.now() + 60_000;

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:attach-pr:read-issue-context',
      headers: {
        'x-ratelimit-endpoint-name': 'IssueContext',
        'x-ratelimit-endpoint-requests-limit': '20',
        'x-ratelimit-endpoint-requests-remaining': '0',
        'x-ratelimit-endpoint-requests-reset': String(resetAtMs),
        'x-complexity': '7'
      }
    });

    const budget = await readSharedLinearBudgetStatus(env, {
      operation: 'provider-linear:attach-pr'
    });
    expect(budget?.selected_endpoint_key).toBe('endpoint:issuecontext');
    expect(budget?.cooldown_active).toBe(false);
    expect(budget?.endpoint_requests).toMatchObject({
      limit: 20,
      remaining: 0
    });
    expect(budget?.request_complexity).toBe(7);
    expect(
      resolveLinearBudgetPreflight({
        budget,
        operation: 'provider-linear:attach-pr',
        minimum_requests_remaining: 1
      })
    ).toMatchObject({
      ok: false,
      error: {
        code: 'linear_rate_limited',
        details: {
          shortfall_bucket: 'endpoint_requests'
        }
      }
    });
  });

  it('ignores unrelated endpoint request pressure for other operations', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);
    const resetAtMs = Date.now() + 60_000;

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context:read-issue-context',
      headers: {
        'x-ratelimit-endpoint-name': 'IssueContext',
        'x-ratelimit-endpoint-requests-limit': '20',
        'x-ratelimit-endpoint-requests-remaining': '0',
        'x-ratelimit-endpoint-requests-reset': String(resetAtMs)
      }
    });

    const budget = await readSharedLinearBudgetStatus(env, {
      operation: 'provider-linear:attach-pr'
    });
    expect(budget?.cooldown_active).toBe(false);
    expect(budget?.selected_endpoint_key).toBeNull();
    expect(budget?.endpoint_requests).toBeNull();
    expect(
      resolveLinearBudgetPreflight({
        budget,
        operation: 'provider-linear:attach-pr',
        minimum_requests_remaining: 1
      })
    ).toEqual({ ok: true });
  });

  it('preserves richer bucket metadata when newer observations only include partial fields', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);
    const resetAtMs = Date.now() + 60_000;

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      observedAt: '2026-04-07T09:00:00.000Z',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '10',
        'x-ratelimit-requests-reset': String(resetAtMs)
      }
    });
    await recordLinearBudgetRateLimitObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      observedAt: '2026-04-07T09:00:05.000Z',
      rateLimit: {
        code: 'linear_rate_limited',
        message: 'Linear API rate limit exceeded.',
        status: 429,
        retryable: true,
        details: {
          requests_remaining: 9
        }
      }
    });

    await expect(readSharedLinearBudgetStatus(env)).resolves.toMatchObject({
      requests: {
        limit: 100,
        remaining: 9
      }
    });
    expect((await readSharedLinearBudgetStatus(env))?.requests?.reset_at).not.toBeNull();
  });

  it('persists shared request-burn history with run and process attribution', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = {
      ...createEnv(codexHome),
      CODEX_ORCHESTRATOR_RUN_ID: 'run-budget-history-1'
    };
    const firstResetAtMs = Date.parse('2026-04-08T01:00:00.000Z');
    const secondResetAtMs = Date.parse('2026-04-08T01:05:00.000Z');

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      observedAt: '2026-04-08T00:00:00.000Z',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '12',
        'x-ratelimit-requests-reset': String(firstResetAtMs),
        'x-request-id': 'req-history-1'
      }
    });
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      observedAt: '2026-04-08T00:00:05.000Z',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '9',
        'x-ratelimit-requests-reset': String(secondResetAtMs),
        'x-request-id': 'req-history-2'
      }
    });

    await expect(readSharedLinearBudgetStatus(env)).resolves.toMatchObject({
      request_burn_history: [
        {
          source: 'dispatch_source_issue_by_id',
          operation: 'dispatch_source_issue_by_id',
          run_id: 'run-budget-history-1',
          process_pid: process.pid,
          request_id: 'req-history-1',
          request_bucket: 'requests',
          remaining: 12,
          remaining_delta: null,
          reset_at: '2026-04-08T01:00:00.000Z',
          cooldown_reason: null
        },
        {
          source: 'provider-linear:issue-context',
          operation: 'provider-linear:issue-context',
          run_id: 'run-budget-history-1',
          process_pid: process.pid,
          request_id: 'req-history-2',
          request_bucket: 'requests',
          remaining: 9,
          remaining_delta: -3,
          reset_at: '2026-04-08T01:05:00.000Z',
          suppression_reason: null,
          cooldown_reason: null
        }
      ]
    });
  });

  it('uses request complexity to fail preflight when complexity headroom is insufficient', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context:read-issue-context',
      headers: {
        'x-ratelimit-complexity-limit': '100',
        'x-ratelimit-complexity-remaining': '5',
        'x-complexity': '3'
      }
    });

    const budget = await readSharedLinearBudgetStatus(env);
    expect(
      resolveLinearBudgetPreflight({
        budget,
        operation: 'provider-linear:issue-context:read-issue-context',
        minimum_requests_remaining: 2
      })
    ).toMatchObject({
      ok: false,
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          required_complexity_remaining: 6,
          shortfall_bucket: 'complexity',
          shortfall_remaining: 5,
          request_complexity: 3
        }
      }
    });
  });

  it('does not infer complexity headroom from an unrelated endpoint', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context:read-issue-context',
      headers: {
        'x-ratelimit-endpoint-name': 'IssueContext',
        'x-ratelimit-complexity-limit': '100',
        'x-ratelimit-complexity-remaining': '10',
        'x-complexity': '7'
      }
    });

    const budget = await readSharedLinearBudgetStatus(env, {
      operation: 'provider-linear:attach-pr'
    });
    expect(budget?.selected_endpoint_key).toBeNull();
    expect(budget?.request_complexity).toBeNull();
    expect(
      resolveLinearBudgetPreflight({
        budget,
        operation: 'provider-linear:attach-pr',
        minimum_requests_remaining: 2
      })
    ).toEqual({ ok: true });
  });

  it('selects the reservation-adjusted bottleneck endpoint for multi-step operations', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:attach-pr:step-a',
      headers: {
        'x-ratelimit-endpoint-name': 'AttachPrStepA',
        'x-ratelimit-endpoint-requests-limit': '10',
        'x-ratelimit-endpoint-requests-remaining': '5'
      }
    });
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:attach-pr:step-b',
      headers: {
        'x-ratelimit-endpoint-name': 'AttachPrStepB',
        'x-ratelimit-endpoint-requests-limit': '10',
        'x-ratelimit-endpoint-requests-remaining': '6'
      }
    });

    const reserved = await reserveLinearBudgetReservation({
      env,
      operation: 'provider-linear:attach-pr:step-b',
      request_units: 5
    });
    expect(reserved.ok).toBe(true);

    const budget = await readSharedLinearBudgetStatus(env, {
      operation: 'provider-linear:attach-pr'
    });
    expect(budget?.selected_endpoint_key).toBe('endpoint:attachprstepb');
    expect(budget?.endpoint_requests).toMatchObject({
      remaining: 1
    });
    expect(
      resolveLinearBudgetPreflight({
        budget,
        operation: 'provider-linear:attach-pr',
        minimum_requests_remaining: 1
      })
    ).toMatchObject({
      ok: false,
      error: {
        details: {
          request_headroom_reserve_bucket: 'endpoint_requests',
          request_headroom_remaining: 1,
          request_headroom_reserve: 1,
          request_headroom_usable_remaining: 0
        }
      }
    });

    if (reserved.ok) {
      await reserved.reservation?.release();
    }
  });

  it('uses the later retry-after timestamp when it outlasts the bucket reset', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T09:00:00.000Z'));

    try {
      const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
      tempDirs.push(codexHome);
      const env = createEnv(codexHome);
      const observedAt = new Date(Date.now()).toISOString();
      const requestResetAt = new Date(Date.now() + 30_000).toISOString();

      await recordLinearBudgetRateLimitObservation({
        env,
        source: 'dispatch_source_issue_by_id',
        observedAt,
        rateLimit: {
          code: 'linear_rate_limited',
          message: 'Linear API rate limit exceeded.',
          status: 429,
          retryable: true,
          details: {
            retry_after_seconds: 90,
            requests_limit: 100,
            requests_remaining: 0,
            requests_reset_at: requestResetAt
          }
        }
      });

      await expect(readSharedLinearBudgetStatus(env)).resolves.toMatchObject({
        cooldown_until: new Date(Date.now() + 90_000).toISOString()
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the later exhausted reset timestamp when it outlasts retry-after', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T09:00:00.000Z'));

    try {
      const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
      tempDirs.push(codexHome);
      const env = createEnv(codexHome);
      const observedAt = new Date(Date.now()).toISOString();
      const requestResetAt = new Date(Date.now() + 120_000).toISOString();

      await recordLinearBudgetRateLimitObservation({
        env,
        source: 'dispatch_source_issue_by_id',
        observedAt,
        rateLimit: {
          code: 'linear_rate_limited',
          message: 'Linear API rate limit exceeded.',
          status: 429,
          retryable: true,
          details: {
            retry_after_seconds: 30,
            requests_limit: 100,
            requests_remaining: 0,
            requests_reset_at: requestResetAt
          }
        }
      });

      await expect(readSharedLinearBudgetStatus(env)).resolves.toMatchObject({
        cooldown_until: requestResetAt
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('reserves request units across concurrent callers and releases them cleanly', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_tracked_issues',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '3'
      }
    });

    const first = await reserveLinearBudgetReservation({
      env,
      operation: 'dispatch_source_tracked_issues'
    });
    const second = await reserveLinearBudgetReservation({
      env,
      operation: 'dispatch_source_tracked_issues'
    });
    const third = await reserveLinearBudgetReservation({
      env,
      operation: 'dispatch_source_tracked_issues'
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third).toMatchObject({
      ok: false,
      error: {
        code: 'linear_rate_limited',
        details: {
          shared_budget_reservations_active: 2,
          request_headroom_reserve_bucket: 'requests',
          request_headroom_remaining: 1,
          request_headroom_reserve: 1,
          request_headroom_usable_remaining: 0
        }
      }
    });
    expect(
      await readSharedLinearBudgetStatus(env, {
        operation: 'dispatch_source_tracked_issues'
      })
    ).toMatchObject({
      reservations_active: 2,
      requests: {
        remaining: 1
      }
    });

    if (first.ok) {
      await first.reservation?.release();
    }
    if (second.ok) {
      await second.reservation?.release();
    }

    const afterRelease = await reserveLinearBudgetReservation({
      env,
      operation: 'dispatch_source_tracked_issues'
    });
    expect(afterRelease.ok).toBe(true);
    if (afterRelease.ok) {
      await afterRelease.reservation?.release();
    }
  });

  it('defaults reservation TTL to the configured Linear request timeout plus grace', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T09:00:00.000Z'));

    try {
      const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
      tempDirs.push(codexHome);
      const env = {
        ...createEnv(codexHome),
        CO_LINEAR_REQUEST_TIMEOUT_MS: '45000'
      };

      await recordLinearBudgetHeadersObservation({
        env,
        source: 'dispatch_source_tracked_issues',
        headers: {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '2'
        }
      });

      const reserved = await reserveLinearBudgetReservation({
        env,
        operation: 'dispatch_source_tracked_issues'
      });
      expect(reserved.ok).toBe(true);

      const budget = await readSharedLinearBudgetStatus(env, {
        operation: 'dispatch_source_tracked_issues'
      });
      expect(budget?.reservations).toHaveLength(1);
      expect(budget?.reservations[0]).toMatchObject({
        created_at: '2026-04-07T09:00:00.000Z',
        expires_at: '2026-04-07T09:00:50.000Z'
      });

      if (reserved.ok) {
        await reserved.reservation?.release();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('expires exhausted bucket suppression once the recorded reset window has passed', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '0',
        'x-ratelimit-requests-reset': String(Date.now() - 1_000)
      }
    });

    await expect(readSharedLinearBudgetStatus(env)).resolves.toMatchObject({
      cooldown_active: false,
      suppression: 'none',
      requests: {
        limit: 100,
        remaining: null,
        reset_at: null
      }
    });
  });

  it('preserves fresh exhausted buckets when reset metadata is missing', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '0'
      }
    });

    const budget = await readSharedLinearBudgetStatus(env);
    expect(budget).toMatchObject({
      cooldown_active: false,
      suppression: 'exhausted',
      requests: {
        limit: 100,
        remaining: 0,
        reset_at: null
      }
    });
    expect(
      resolveLinearBudgetPreflight({
        budget,
        operation: 'provider-linear:issue-context',
        minimum_requests_remaining: 1
      })
    ).toMatchObject({
      ok: false,
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          required_requests_remaining: 1,
          shortfall_bucket: 'requests',
          shortfall_remaining: 0,
          requests_remaining: 0
        }
      }
    });

    const schedule = resolveLinearPollingInterval({
      budget,
      default_interval_ms: 15_000,
      nowMs: 1_700_000_000_000
    });
    expect(schedule.reason).toBe('linear_budget_requests_exhausted');
    expect(schedule.interval_ms).toBeGreaterThanOrEqual(60_000);
    expect(schedule.interval_ms).toBeLessThanOrEqual(66_000);
  });

  it('expires exhausted buckets without reset metadata after the fallback grace window', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      observedAt: new Date(Date.now() - 61_000).toISOString(),
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '0'
      }
    });

    const budget = await readSharedLinearBudgetStatus(env);
    expect(budget).toMatchObject({
      cooldown_active: false,
      suppression: 'none',
      requests: {
        limit: 100,
        remaining: null,
        reset_at: null
      }
    });
    expect(
      resolveLinearBudgetPreflight({
        budget,
        operation: 'provider-linear:issue-context',
        minimum_requests_remaining: 1
      })
    ).toEqual({ ok: true });
  });

  it('fails helper preflight when the remaining request budget is clearly insufficient', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '2',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });

    const budget = await readSharedLinearBudgetStatus(env);
    const preflight = resolveLinearBudgetPreflight({
      budget,
      operation: 'provider-linear:create-follow-up',
      minimum_requests_remaining: 3
    });

    expect(preflight).toMatchObject({
      ok: false,
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true,
          required_requests_remaining: 3,
          shortfall_bucket: 'requests',
          shortfall_remaining: 2,
          requests_remaining: 2
        }
      }
    });
  });

  it('fails helper preflight when spending the last request would violate the shared reserve', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });

    const budget = await readSharedLinearBudgetStatus(env);
    const preflight = resolveLinearBudgetPreflight({
      budget,
      operation: 'provider-linear:issue-context',
      minimum_requests_remaining: 1
    });

    expect(preflight).toMatchObject({
      ok: false,
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true,
          required_requests_remaining: 1,
          request_headroom_reserve_bucket: 'requests',
          request_headroom_remaining: 1,
          request_headroom_reserve: 1,
          request_headroom_usable_remaining: 0,
          requests_remaining: 1
        }
      }
    });
  });

  it('expires stale reserve-floor request buckets without reset metadata after the fallback grace window', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      observedAt: new Date(Date.now() - 61_000).toISOString(),
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1'
      }
    });

    const budget = await readSharedLinearBudgetStatus(env);
    expect(budget).toMatchObject({
      requests: {
        limit: 100,
        remaining: null,
        reset_at: null
      }
    });
    expect(
      resolveLinearBudgetPreflight({
        budget,
        operation: 'provider-linear:issue-context',
        minimum_requests_remaining: 1
      })
    ).toEqual({ ok: true });
  });

  it('keeps request exhaustion distinct when complexity headroom remains high', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);
    const resetAt = String(Date.now() + 60_000);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '5000',
        'x-ratelimit-requests-remaining': '0',
        'x-ratelimit-requests-reset': resetAt,
        'x-ratelimit-complexity-limit': '3000000',
        'x-ratelimit-complexity-remaining': '2999592',
        'x-ratelimit-complexity-reset': resetAt
      }
    });

    const budget = await readSharedLinearBudgetStatus(env);
    const preflight = resolveLinearBudgetPreflight({
      budget,
      operation: 'provider-linear:issue-context',
      minimum_requests_remaining: 1
    });

    expect(preflight.ok).toBe(false);
    expect(preflight.ok ? null : preflight.error).toMatchObject({
      status: 429,
      details: {
        shared_budget_cooldown_active: true,
        requests_remaining: 0,
        complexity_remaining: 2999592
      }
    });
    expect(preflight.ok ? null : preflight.error.message).not.toContain('complexity budget is insufficient');
  });

  it('stretches polling before static low thresholds when request headroom is running out before reset', () => {
    const schedule = resolveLinearPollingInterval({
      budget: {
        observed_at: '2026-04-08T00:00:00.000Z',
        source: 'dispatch_source_tracked_issues',
        request_id: 'req-reset-headroom',
        retry_after_seconds: null,
        cooldown_until: null,
        cooldown_active: false,
        suppression: 'none',
        suppression_reason: null,
        scope_kind: 'user',
        scope_key: 'viewer-scope',
        viewer_id: 'viewer-1',
        workspace_id: 'workspace-1',
        token_fingerprints: [],
        requests: {
          limit: 5000,
          remaining: 100,
          reset_at: '2026-04-08T01:00:00.000Z'
        },
        endpoint_requests: null,
        complexity: {
          limit: 3000000,
          remaining: 2999592,
          reset_at: '2026-04-08T01:00:00.000Z'
        },
        endpoint_complexity: null,
        endpoint_name: null,
        selected_endpoint_key: 'source:dispatch-source-tracked-issues',
        request_complexity: 207,
        endpoints: {},
        reservations: [],
        reservations_active: 0
      },
      default_interval_ms: 15_000,
      nowMs: Date.parse('2026-04-08T00:00:00.000Z'),
      operation: 'dispatch_source_tracked_issues'
    });

    expect(schedule.reason).toBe('linear_budget_requests_reset_headroom');
    expect(schedule.linear_budget).toMatchObject({
      suppression: 'low',
      suppression_reason: 'linear_budget_requests_reset_headroom'
    });
    expect(schedule.interval_ms).toBeGreaterThanOrEqual(72_000);
    expect(schedule.interval_ms).toBeLessThanOrEqual(80_000);
  });

  it('preserves a non-request suppression reason when request headroom only lengthens the interval', () => {
    const schedule = resolveLinearPollingInterval({
      budget: {
        observed_at: '2026-04-08T00:00:00.000Z',
        source: 'dispatch_source_tracked_issues',
        request_id: 'req-complexity-dominant-headroom',
        retry_after_seconds: null,
        cooldown_until: null,
        cooldown_active: false,
        suppression: 'low',
        suppression_reason: 'linear_budget_complexity_low',
        scope_kind: 'user',
        scope_key: 'viewer-scope',
        viewer_id: 'viewer-1',
        workspace_id: 'workspace-1',
        token_fingerprints: [],
        requests: {
          limit: 5000,
          remaining: 100,
          reset_at: '2026-04-08T01:00:00.000Z'
        },
        endpoint_requests: null,
        complexity: {
          limit: 100,
          remaining: 5,
          reset_at: '2026-04-08T01:00:00.000Z'
        },
        endpoint_complexity: null,
        endpoint_name: null,
        selected_endpoint_key: 'source:dispatch-source-tracked-issues',
        request_complexity: 207,
        endpoints: {},
        reservations: [],
        reservations_active: 0
      },
      default_interval_ms: 15_000,
      nowMs: Date.parse('2026-04-08T00:00:00.000Z'),
      operation: 'dispatch_source_tracked_issues'
    });

    expect(schedule.reason).toBe('linear_budget_complexity_constrained');
    expect(schedule.linear_budget).toMatchObject({
      suppression: 'constrained',
      suppression_reason: 'linear_budget_complexity_constrained'
    });
    expect(schedule.interval_ms).toBeGreaterThanOrEqual(72_000);
    expect(schedule.interval_ms).toBeLessThanOrEqual(80_000);
  });

  it('keeps reset-aware slowdown active after remaining requests fall inside the reserve window', () => {
    const schedule = resolveLinearPollingInterval({
      budget: {
        observed_at: '2026-04-08T00:00:00.000Z',
        source: 'dispatch_source_tracked_issues',
        request_id: 'req-reset-reserve-floor',
        retry_after_seconds: null,
        cooldown_until: null,
        cooldown_active: false,
        suppression: 'constrained',
        suppression_reason: 'linear_budget_requests_constrained',
        scope_kind: 'user',
        scope_key: 'viewer-scope',
        viewer_id: 'viewer-1',
        workspace_id: 'workspace-1',
        token_fingerprints: [],
        requests: {
          limit: 5000,
          remaining: 49,
          reset_at: '2026-04-08T01:00:00.000Z'
        },
        endpoint_requests: null,
        complexity: {
          limit: 3000000,
          remaining: 2999592,
          reset_at: '2026-04-08T01:00:00.000Z'
        },
        endpoint_complexity: null,
        endpoint_name: null,
        selected_endpoint_key: 'source:dispatch-source-tracked-issues',
        request_complexity: 207,
        endpoints: {},
        reservations: [],
        reservations_active: 0
      },
      default_interval_ms: 15_000,
      nowMs: Date.parse('2026-04-08T00:00:00.000Z'),
      operation: 'dispatch_source_tracked_issues'
    });

    expect(schedule.reason).toBe('linear_budget_requests_reset_headroom');
    expect(schedule.linear_budget).toMatchObject({
      suppression: 'low',
      suppression_reason: 'linear_budget_requests_reset_headroom'
    });
    expect(schedule.interval_ms).toBeGreaterThanOrEqual(3_600_000);
    expect(schedule.interval_ms).toBeLessThanOrEqual(3_960_000);
  });

  it('stretches control-host polling when the shared budget is low but not yet exhausted', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);
    const nowMs = Date.now();

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_tracked_issues',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': String(nowMs + 60_000)
      }
    });

    const budget = await readSharedLinearBudgetStatus(env);
    const schedule = resolveLinearPollingInterval({
      budget,
      default_interval_ms: 15_000,
      nowMs
    });

    expect(schedule.reason).toBe('linear_budget_requests_low');
    expect(schedule.linear_budget).toMatchObject({
      suppression: 'low',
      suppression_reason: 'linear_budget_requests_low',
      cooldown_active: false
    });
    expect(schedule.interval_ms).toBeGreaterThanOrEqual(60_000);
    expect(schedule.interval_ms).toBeLessThanOrEqual(66_000);
  });

  it('uses the active shared cooldown window as the next polling delay when it exceeds the default interval', () => {
    const schedule = resolveLinearPollingInterval({
      budget: {
        observed_at: '2026-04-08T00:00:00.000Z',
        source: 'dispatch_source_tracked_issues',
        request_id: 'req-cooldown-window',
        retry_after_seconds: 90,
        cooldown_until: '2026-04-08T00:01:30.000Z',
        cooldown_active: true,
        suppression: 'cooldown',
        suppression_reason: 'linear_budget_shared_cooldown',
        scope_kind: 'token',
        scope_key: 'legacy',
        viewer_id: null,
        workspace_id: null,
        token_fingerprints: [],
        requests: {
          limit: 100,
          remaining: 0,
          reset_at: '2026-04-08T00:01:30.000Z'
        },
        endpoint_requests: null,
        complexity: {
          limit: 200,
          remaining: 75,
          reset_at: '2026-04-08T00:00:45.000Z'
        },
        endpoint_complexity: null,
        endpoint_name: null,
        selected_endpoint_key: null,
        request_complexity: null,
        endpoints: {},
        reservations: [],
        reservations_active: 0
      },
      default_interval_ms: 15_000,
      nowMs: Date.parse('2026-04-08T00:00:00.000Z')
    });

    expect(schedule).toMatchObject({
      reason: 'linear_budget_shared_cooldown',
      interval_ms: 90_000,
      linear_budget: {
        cooldown_until: '2026-04-08T00:01:30.000Z',
        suppression: 'cooldown'
      }
    });
  });

  it('stretches polling more aggressively when a segmented tracked-issues poll inherits constrained endpoint budget', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);
    const nowMs = Date.now();

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_tracked_issues',
      headers: {
        'x-ratelimit-endpoint-name': 'TrackedIssues',
        'x-ratelimit-endpoint-requests-limit': '100',
        'x-ratelimit-endpoint-requests-remaining': '1',
        'x-ratelimit-endpoint-requests-reset': String(nowMs + 60_000)
      }
    });

    const budget = await readSharedLinearBudgetStatus(env, {
      operation: 'dispatch_source_tracked_issues:recovery_sweep'
    });
    const schedule = resolveLinearPollingInterval({
      budget,
      default_interval_ms: 15_000,
      nowMs,
      operation: 'dispatch_source_tracked_issues:recovery_sweep'
    });

    expect(schedule.reason).toBe('linear_budget_endpoint_requests_low');
    expect(schedule.interval_ms).toBeGreaterThanOrEqual(90_000);
    expect(schedule.interval_ms).toBeLessThanOrEqual(99_000);
  });
});
