import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  initializeProviderPollingHealth,
  markProviderPollingCompleted,
  markProviderPollingStarted,
  markProviderPollingStuck,
  readProviderPollingHealth,
  recordProviderPollingProgress,
  resolveControlPollingNextRefreshProjection
} from '../src/cli/control/providerPollingHealth.js';
import type { LinearBudgetStatus } from '../src/cli/control/linearBudgetState.js';
import type { ProviderIssueHandoffService } from '../src/cli/control/providerIssueHandoff.js';
import { inspectSourceRootFreshness } from '../src/cli/utils/sourceRootFreshness.js';

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

  it('uses the latest refresh progress time when deciding whether polling is stuck', () => {
    const service = {} as ProviderIssueHandoffService;

    initializeProviderPollingHealth(service, {
      intervalMs: null,
      stuckAfterMs: 45_000,
      skipInitialUpdate: true
    });
    markProviderPollingStarted(service, {
      mode: 'refresh',
      atMs: Date.parse('2026-05-21T10:09:15.000Z')
    });
    recordProviderPollingProgress(service, {
      phase: 'refresh:claim_issue_by_id_reconcile',
      requestClass: 'claim_issue_by_id:released_deferred',
      providerKeys: ['linear:co-531'],
      counts: {
        claims_scanned: 731,
        issue_by_id_deferred: 728
      },
      atMs: Date.parse('2026-05-21T10:10:40.000Z')
    });

    expect(
      readProviderPollingHealth(service, Date.parse('2026-05-21T10:10:56.000Z'))
    ).toMatchObject({
      checking: true,
      stuck: false,
      restart_required: false,
      refresh_phase: 'refresh:claim_issue_by_id_reconcile',
      refresh_request_class: 'claim_issue_by_id:released_deferred',
      refresh_provider_keys: ['linear:co-531']
    });
    expect(
      readProviderPollingHealth(service, Date.parse('2026-05-21T10:11:26.000Z'))
    ).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      stuck_since_at: '2026-05-21T10:11:25.000Z',
      refresh_phase: 'refresh:claim_issue_by_id_reconcile',
      refresh_request_class: 'claim_issue_by_id:released_deferred',
      refresh_provider_keys: ['linear:co-531']
    });
  });

  it('still marks an active refresh stuck when no progress follows the last request', () => {
    const service = {} as ProviderIssueHandoffService;

    initializeProviderPollingHealth(service, {
      intervalMs: null,
      stuckAfterMs: 45_000,
      skipInitialUpdate: true
    });
    markProviderPollingStarted(service, {
      mode: 'refresh',
      atMs: Date.parse('2026-05-21T10:09:15.000Z')
    });
    recordProviderPollingProgress(service, {
      phase: 'refresh:claim_issue_by_id_reconcile',
      requestClass: 'claim_issue_by_id:running',
      providerKeys: ['linear:active-worker'],
      counts: {
        claims_scanned: 1,
        issue_by_id_reads: 1
      },
      atMs: Date.parse('2026-05-21T10:09:20.000Z')
    });

    expect(
      readProviderPollingHealth(service, Date.parse('2026-05-21T10:10:06.000Z'))
    ).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      stuck_since_at: '2026-05-21T10:10:05.000Z',
      refresh_phase: 'refresh:claim_issue_by_id_reconcile',
      refresh_request_class: 'claim_issue_by_id:running',
      refresh_provider_keys: ['linear:active-worker']
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

  it('does not refresh control-host source-root freshness on hot polling health reads', async () => {
    const service = {} as ProviderIssueHandoffService;
    const repoRoot = await createSourceRootRepo('provider-polling-source-root-');

    try {
      initializeProviderPollingHealth(service, {
        intervalMs: 15_000,
        controlHostOwner: {
          status: 'owned',
          reason: null,
          updated_at: '2026-05-01T00:00:00.000Z',
          diagnostic_path: null,
          lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
          owner_path: join(repoRoot, '.runs', 'control-host-owner.json'),
          owner: {
            owner_token: 'owner-token',
            status: 'owned',
            pid: 123,
            ppid: 1,
            hostname: 'host.local',
            acquired_at: '2026-05-01T00:00:00.000Z',
            updated_at: '2026-05-01T00:00:00.000Z',
            released_at: null,
            repo_root: repoRoot,
            task_id: 'local-mcp',
            run_id: 'control-host',
            run_dir: join(repoRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
            pipeline_id: 'provider-linear-worker',
            source_root_freshness: inspectSourceRootFreshness({
              intendedRepoRoot: repoRoot,
              packageRoot: repoRoot,
              argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
              cwd: repoRoot,
              now: () => '2026-05-01T00:00:00.000Z'
            }),
            lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
            owner_path: join(repoRoot, '.runs', 'control-host-owner.json')
          }
        }
      });

      const baseHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();
      await writeFile(join(repoRoot, 'README.md'), 'origin advanced\n', 'utf8');
      git(repoRoot, ['add', '.']);
      git(repoRoot, ['commit', '-m', 'origin advanced']);
      git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
      git(repoRoot, ['reset', '--hard', baseHash]);

      expect(
        readProviderPollingHealth(
          service,
          Date.parse('2026-05-01T00:01:00.000Z')
        )?.control_host_owner?.owner?.source_root_freshness
      ).toMatchObject({
        status: 'current',
        drift_classes: [],
        source_checkout: {
          status: 'current',
          behind: 0
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});

async function createSourceRootRepo(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  await mkdir(join(root, 'bin'), { recursive: true });
  await writeFile(
    join(root, 'package.json'),
    `${JSON.stringify({ name: '@kbediako/codex-orchestrator' }, null, 2)}\n`,
    'utf8'
  );
  await writeFile(join(root, 'bin', 'codex-orchestrator.ts'), 'console.log("source");\n', 'utf8');
  git(root, ['init', '-b', 'main']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'base']);
  git(root, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  return root;
}

function git(cwd: string, args: string[]): { stdout: string } {
  const result = spawnSync(
    'git',
    ['-c', 'user.name=Codex Test', '-c', 'user.email=codex@example.test', ...args],
    {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr || result.error?.message || 'unknown error'}`
    );
  }
  return { stdout: String(result.stdout ?? '') };
}
