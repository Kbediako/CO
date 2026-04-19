import { describe, expect, it } from 'vitest';

import {
  markProviderPollingCompleted,
  markProviderPollingStarted,
  markProviderPollingStuck,
  readProviderPollingHealth,
  recordProviderPollingProgress,
  resolveControlPollingNextRefreshProjection
} from '../src/cli/control/providerPollingHealth.js';
import type { LinearBudgetStatus } from '../src/cli/control/linearBudgetState.js';
import type { ProviderIssueHandoffService } from '../src/cli/control/providerIssueHandoff.js';

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

  it('exposes refresh phase counts while a refresh is active or stuck', async () => {
    const service = {} as ProviderIssueHandoffService;

    markProviderPollingStarted(service, {
      mode: 'refresh',
      atMs: Date.parse('2026-04-14T09:00:00.000Z')
    });
    recordProviderPollingProgress(service, {
      phase: 'refresh:claim_issue_by_id_reconcile',
      requestClass: 'claim_issue_by_id:running',
      providerKeys: ['linear:issue-1', 'linear:issue-1', '  ', 'linear:issue-2'],
      counts: {
        claims_scanned: 2,
        issue_by_id_reads: 1,
        ignored_non_finite: Number.POSITIVE_INFINITY
      },
      atMs: Date.parse('2026-04-14T09:00:01.000Z')
    });

    const activeHealth = readProviderPollingHealth(
      service,
      Date.parse('2026-04-14T09:00:02.000Z')
    );
    expect(activeHealth).toMatchObject({
      checking: true,
      stuck: false,
      refresh_phase: 'refresh:claim_issue_by_id_reconcile',
      refresh_request_class: 'claim_issue_by_id:running',
      refresh_provider_keys: ['linear:issue-1', 'linear:issue-2']
    });
    expect(activeHealth.refresh_counts).toEqual({
      claims_scanned: 2,
      issue_by_id_reads: 1
    });

    await markProviderPollingStuck(service, {
      atMs: Date.parse('2026-04-14T09:00:03.000Z')
    });

    const stuckHealth = readProviderPollingHealth(
      service,
      Date.parse('2026-04-14T09:00:04.000Z')
    );
    expect(stuckHealth).toMatchObject({
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      refresh_phase: 'refresh:claim_issue_by_id_reconcile',
      refresh_request_class: 'claim_issue_by_id:running',
      refresh_provider_keys: ['linear:issue-1', 'linear:issue-2']
    });
    expect(stuckHealth.refresh_counts).toEqual({
      claims_scanned: 2,
      issue_by_id_reads: 1
    });

    markProviderPollingCompleted(service, {
      atMs: Date.parse('2026-04-14T09:00:05.000Z')
    });

    expect(readProviderPollingHealth(service, Date.parse('2026-04-14T09:00:06.000Z'))).toMatchObject({
      stuck: false,
      restart_required: false,
      refresh_phase: null,
      refresh_request_class: null,
      refresh_provider_keys: null,
      refresh_counts: null
    });
  });

  it('retains request class and provider keys when progress omits optional diagnostics', () => {
    const service = {} as ProviderIssueHandoffService;

    markProviderPollingStarted(service, {
      mode: 'refresh',
      atMs: Date.parse('2026-04-18T18:00:00.000Z')
    });
    recordProviderPollingProgress(service, {
      phase: 'refresh:claim_reconcile',
      requestClass: 'claim_reconcile:running',
      providerKeys: ['linear:CO-207', 'linear:CO-210'],
      counts: {
        claims_scanned: 2
      },
      atMs: Date.parse('2026-04-18T18:00:01.000Z')
    });
    recordProviderPollingProgress(service, {
      phase: 'refresh:rehydrated',
      counts: {
        claims_scanned: 2,
        fresh_discovery_runs: 0
      },
      atMs: Date.parse('2026-04-18T18:00:02.000Z')
    });

    expect(
      readProviderPollingHealth(service, Date.parse('2026-04-18T18:00:03.000Z'))
    ).toMatchObject({
      refresh_phase: 'refresh:rehydrated',
      refresh_request_class: 'claim_reconcile:running',
      refresh_provider_keys: ['linear:CO-207', 'linear:CO-210'],
      refresh_counts: {
        claims_scanned: 2,
        fresh_discovery_runs: 0
      }
    });

    recordProviderPollingProgress(service, {
      phase: 'refresh:complete',
      requestClass: null,
      providerKeys: null,
      counts: null,
      atMs: Date.parse('2026-04-18T18:00:04.000Z')
    });

    expect(
      readProviderPollingHealth(service, Date.parse('2026-04-18T18:00:05.000Z'))
    ).toMatchObject({
      refresh_phase: 'refresh:complete',
      refresh_request_class: null,
      refresh_provider_keys: null,
      refresh_counts: null
    });
  });

  it('clears stale provider keys when a new request class omits provider diagnostics', () => {
    const service = {} as ProviderIssueHandoffService;

    markProviderPollingStarted(service, {
      mode: 'refresh',
      atMs: Date.parse('2026-04-18T18:10:00.000Z')
    });
    recordProviderPollingProgress(service, {
      phase: 'refresh:claim_reconcile',
      requestClass: 'claim_reconcile:running',
      providerKeys: ['linear:CO-207'],
      counts: {
        claims_scanned: 1
      },
      atMs: Date.parse('2026-04-18T18:10:01.000Z')
    });
    recordProviderPollingProgress(service, {
      phase: 'refresh:fresh_dispatch',
      requestClass: 'fresh_dispatch',
      counts: {
        claims_scanned: 1,
        fresh_discovery_candidates: 1
      },
      atMs: Date.parse('2026-04-18T18:10:02.000Z')
    });

    expect(
      readProviderPollingHealth(service, Date.parse('2026-04-18T18:10:03.000Z'))
    ).toMatchObject({
      refresh_phase: 'refresh:fresh_dispatch',
      refresh_request_class: 'fresh_dispatch',
      refresh_provider_keys: null,
      refresh_counts: {
        claims_scanned: 1,
        fresh_discovery_candidates: 1
      }
    });
  });
});
