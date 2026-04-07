import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

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
          'x-ratelimit-requests-remaining': '1'
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
        remaining: 0
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
        'x-ratelimit-endpoint-requests-remaining': '5'
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
      remaining: 0
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
          shortfall_bucket: 'endpoint_requests',
          shortfall_remaining: 0
        }
      }
    });

    if (reserved.ok) {
      await reserved.reservation?.release();
    }
  });

  it('uses the later retry-after timestamp when it outlasts the bucket reset', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);
    const observedAt = '2026-04-07T09:00:00.000Z';
    const requestResetAt = '2026-04-07T09:00:30.000Z';

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
      cooldown_until: '2026-04-07T09:01:30.000Z'
    });
  });

  it('uses the later exhausted reset timestamp when it outlasts retry-after', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);
    const observedAt = '2026-04-07T09:00:00.000Z';
    const requestResetAt = '2026-04-07T09:02:00.000Z';

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
        'x-ratelimit-requests-remaining': '2'
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
          shortfall_bucket: 'requests',
          shortfall_remaining: 0
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
        remaining: 0
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

  it('stretches control-host polling when the shared budget is low but not yet exhausted', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_tracked_issues',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });

    const budget = await readSharedLinearBudgetStatus(env);
    const schedule = resolveLinearPollingInterval({
      budget,
      default_interval_ms: 15_000,
      nowMs: 1_700_000_000_000
    });

    expect(schedule.reason).toBe('linear_budget_requests_low');
    expect(schedule.linear_budget).toMatchObject({
      suppression: 'low',
      cooldown_active: false
    });
    expect(schedule.interval_ms).toBeGreaterThanOrEqual(60_000);
    expect(schedule.interval_ms).toBeLessThanOrEqual(66_000);
  });

  it('stretches polling more aggressively when the matching endpoint budget is constrained', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = createEnv(codexHome);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_tracked_issues',
      headers: {
        'x-ratelimit-endpoint-name': 'TrackedIssues',
        'x-ratelimit-endpoint-requests-limit': '100',
        'x-ratelimit-endpoint-requests-remaining': '1',
        'x-ratelimit-endpoint-requests-reset': String(Date.now() + 60_000)
      }
    });

    const budget = await readSharedLinearBudgetStatus(env, {
      operation: 'dispatch_source_tracked_issues'
    });
    const schedule = resolveLinearPollingInterval({
      budget,
      default_interval_ms: 15_000,
      nowMs: 1_700_000_000_000,
      operation: 'dispatch_source_tracked_issues'
    });

    expect(schedule.reason).toBe('linear_budget_endpoint_requests_low');
    expect(schedule.interval_ms).toBeGreaterThanOrEqual(90_000);
    expect(schedule.interval_ms).toBeLessThanOrEqual(99_000);
  });
});
