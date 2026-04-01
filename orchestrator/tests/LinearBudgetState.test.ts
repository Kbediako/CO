import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  readSharedLinearBudgetStatus,
  recordLinearBudgetHeadersObservation,
  resolveLinearBudgetPreflight,
  resolveLinearPollingInterval
} from '../src/cli/control/linearBudgetState.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('linearBudgetState', () => {
  it('persists shared cooldown state when a response exhausts the request bucket', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const resetAtMs = Date.now() + 60_000;
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

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
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

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

  it('expires exhausted bucket suppression once the recorded reset window has passed', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

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
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

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
    expect(
      resolveLinearPollingInterval({
        budget,
        default_interval_ms: 15_000
      })
    ).toMatchObject({
      interval_ms: 60_000,
      reason: 'linear_budget_requests_exhausted'
    });
  });

  it('expires exhausted buckets without reset metadata after the fallback grace window', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-budget-state-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

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
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

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
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

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
      default_interval_ms: 15_000
    });

    expect(schedule).toMatchObject({
      interval_ms: 60_000,
      reason: 'linear_budget_requests_low',
      linear_budget: {
        suppression: 'low',
        cooldown_active: false
      }
    });
  });
});
