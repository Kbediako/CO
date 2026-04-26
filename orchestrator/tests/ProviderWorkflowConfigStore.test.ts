import { chmod, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import {
  cloneProviderWorkflowStatusPayload,
  createProviderWorkflowConfigStore,
  OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT,
  OPERATOR_AUTOPILOT_STATUS_TEXT_FIELD_LIMIT
} from '../src/cli/control/providerWorkflowConfigStore.js';
import { REPO_CONFIG_PATH_ENV_KEY } from '../src/cli/config/userConfig.js';
import type { ProviderOperatorAutopilotResult } from '../src/cli/control/providerOperatorAutopilot.js';
import { logger } from '../src/logger.js';

let workspaceRoot: string;
let revisionTick = 0;
const initialRepoConfigPathEnv = process.env[REPO_CONFIG_PATH_ENV_KEY];

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'provider-workflow-store-'));
  revisionTick = 0;
  delete process.env[REPO_CONFIG_PATH_ENV_KEY];
});

afterEach(async () => {
  if (initialRepoConfigPathEnv === undefined) {
    delete process.env[REPO_CONFIG_PATH_ENV_KEY];
  } else {
    process.env[REPO_CONFIG_PATH_ENV_KEY] = initialRepoConfigPathEnv;
  }
  vi.doUnmock('node:fs/promises');
  vi.resetModules();
  vi.restoreAllMocks();
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('providerWorkflowConfigStore', () => {
  it('fails closed at startup when the repo config is missing', async () => {
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await expect(store.bootstrap()).rejects.toThrow(
      /Failed to load provider workflow config path=.*codex\.orchestrator\.json/
    );
  });

  it('boots from the last known good snapshot when startup reload fails', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const runDir = join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host');
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const initialStore = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir,
      pipelineId: 'provider-linear-worker'
    });

    await initialStore.bootstrap();
    const snapshotPath = await initialStore.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    await writeRepoConfig('{ invalid json');
    const restartedStore = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir,
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await restartedStore.bootstrap();

    expect(bootstrapped).toMatchObject({
      status: 'reload_failed',
      pipeline_id: 'provider-linear-worker',
      snapshot_path: snapshotPath
    });
    expect(bootstrapped.last_error).toBeTruthy();
    expect(bootstrapped.terminal_cleanup).toMatchObject({
      enabled: true,
      close_attached_pr: {
        enabled: true,
        comment_template:
          'Closing because the Linear issue for branch {{branch}} entered a terminal state without merge.'
      }
    });
    expect(await restartedStore.getLaunchConfigPath()).toBe(snapshotPath);
    expect(await readFile(snapshotPath, 'utf8')).toBe(initialSnapshot);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('keeping last known good configuration')
    );
  });

  it('keeps the last known good snapshot when a later reload becomes invalid', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    expect(bootstrapped.status).toBe('ready');
    expect(JSON.parse(initialSnapshot)).toMatchObject({
      pipelines: [{ id: 'provider-linear-worker', title: 'Provider worker v1' }]
    });

    await writeRepoConfig('{ invalid json');
    const degraded = await store.refresh();

    expect(degraded.status).toBe('reload_failed');
    expect(degraded.snapshot_path).toBe(snapshotPath);
    expect(degraded.last_error).toBeTruthy();
    expect(await readFile(snapshotPath, 'utf8')).toBe(initialSnapshot);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('keeping last known good configuration')
    );
  });

  it('preserves the last known good snapshot when a later reload has invalid worker_hosts metadata', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    await writeRepoConfig(
      buildValidProviderConfig('broken', {
        worker_hosts: {
          hosts: [
            {
              name: 'worker-host-01'
            }
          ]
        }
      })
    );
    const degraded = await store.refresh();

    expect(degraded.status).toBe('reload_failed');
    expect(degraded.snapshot_path).toBe(snapshotPath);
    expect(degraded.last_error).toContain('ssh_destination');
    expect(await readFile(snapshotPath, 'utf8')).toBe(initialSnapshot);
    expect(await store.getLaunchConfigPath()).toBe(snapshotPath);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('keeping last known good configuration')
    );
  });

  it('fails closed when worker_hosts.hosts is present but not an array', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    await writeRepoConfig(
      buildValidProviderConfig('broken-shape', {
        worker_hosts: {
          hosts: {}
        }
      })
    );
    const degraded = await store.refresh();

    expect(degraded.status).toBe('reload_failed');
    expect(degraded.snapshot_path).toBe(snapshotPath);
    expect(degraded.last_error).toContain('"hosts" must be an array');
    expect(await readFile(snapshotPath, 'utf8')).toBe(initialSnapshot);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('keeping last known good configuration')
    );
  });

  it('replaces the snapshot and clears the error when a later valid reload succeeds', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    await writeRepoConfig('{ invalid json');
    const degraded = await store.refresh();

    expect(degraded.status).toBe('reload_failed');
    expect(degraded.last_error).toBeTruthy();

    await writeRepoConfig(buildValidProviderConfig('v2'));
    const recovered = await store.refresh();
    const snapshotPath = await store.getLaunchConfigPath();
    const recoveredSnapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as {
      pipelines: Array<{ title: string }>;
    };

    expect(recovered.status).toBe('ready');
    expect(recovered.last_error).toBeNull();
    expect(recovered.last_error_at).toBeNull();
    expect(recovered.last_success_at).toBeTruthy();
    expect(recoveredSnapshot.pipelines[0]?.title).toBe('Provider worker v2');
  });

  it('returns defensive copies from its public state accessors', async () => {
    const providerConfig = buildValidProviderConfig('v1');
    const metadata = (providerConfig.pipelines as Array<{ metadata: Record<string, unknown> }>)[0]!
      .metadata;
    metadata.operator_autopilot = {
      ...(metadata.operator_autopilot as Record<string, unknown>),
      post_merge_rollout: {
        enabled: true,
        summary: 'Merge closeout completed; local rollout follow-up may still be required.',
        execution: {
          enabled: true,
          actions: [
            {
              id: 'rollout-main',
              enabled: true,
              order: 1,
              runner: 'npm_script',
              script: 'rollout:main',
              args: ['--issue', '{{issue.identifier}}'],
              supported_platforms: ['darwin'],
              deploy_class: true,
              deploy_opt_in: true
            }
          ]
        }
      }
    };
    await writeRepoConfig(providerConfig);
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await store.bootstrap();
    bootstrapped.status = 'reload_failed';
    bootstrapped.last_error = 'mutated bootstrap state';
    const bootstrappedExecution = bootstrapped.operator_autopilot?.post_merge_rollout
      .execution as {
      actions: Array<{ args: string[]; supported_platforms: string[] }>;
    };
    bootstrappedExecution.actions[0]!.args[0] = 'mutated-bootstrap-arg';
    bootstrappedExecution.actions[0]!.supported_platforms.push('linux');

    expect(store.snapshot()).toMatchObject({
      status: 'ready',
      pipeline_id: 'provider-linear-worker',
      last_error: null
    });

    const snapshotted = store.snapshot();
    snapshotted.pipeline_id = 'mutated-pipeline-id';
    const snapshottedExecution = snapshotted.operator_autopilot?.post_merge_rollout
      .execution as {
      actions: Array<{ args: string[]; supported_platforms: string[] }>;
    };
    snapshottedExecution.actions[0]!.args.push('mutated-snapshot-arg');

    expect(store.snapshot()).toMatchObject({
      status: 'ready',
      pipeline_id: 'provider-linear-worker'
    });
    expect(
      (
        store.snapshot().operator_autopilot?.post_merge_rollout.execution as {
          actions: Array<{ args: string[]; supported_platforms: string[] }>;
        }
      ).actions[0]
    ).toMatchObject({
      args: ['--issue', '{{issue.identifier}}'],
      supported_platforms: ['darwin']
    });

    await writeRepoConfig('{ invalid json');
    const degraded = await store.refresh();
    degraded.status = 'ready';
    degraded.last_error = 'mutated degraded state';

    expect(store.snapshot()).toMatchObject({
      status: 'reload_failed'
    });
    expect(store.snapshot().last_error).toBeTruthy();
    expect(store.snapshot().last_error).not.toBe('mutated degraded state');
  });

  it('loads terminal cleanup metadata and records the latest cleanup result', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await store.bootstrap();

    expect(bootstrapped.terminal_cleanup).toMatchObject({
      enabled: true,
      close_attached_pr: {
        enabled: true,
        comment_template:
          'Closing because the Linear issue for branch {{branch}} entered a terminal state without merge.'
      },
      last_result: null
    });

    store.recordTerminalCleanupResult({
      attemptedAt: '2026-03-27T00:00:00.000Z',
      status: 'failed',
      summary: 'Terminal cleanup could not close the attached PR.',
      error: 'gh pr close exited 1 stderr="close failed"',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-5',
      workspacePath: '/repo/.workspaces/linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8',
      branch: 'feature/co-5',
      attachedPrUrls: ['https://github.com/example/co/pull/123'],
      matchingOpenPrUrls: ['https://github.com/example/co/pull/123'],
      closedPrUrls: []
    });

    expect(store.snapshot().terminal_cleanup?.last_result).toMatchObject({
      status: 'failed',
      issue_identifier: 'CO-5',
      branch: 'feature/co-5',
      attached_pr_urls: ['https://github.com/example/co/pull/123']
    });

    if (bootstrapped.terminal_cleanup?.last_result) {
      bootstrapped.terminal_cleanup.last_result.status = 'succeeded';
    }

    expect(store.snapshot().terminal_cleanup?.last_result?.status).toBe('failed');
  });

  it('loads optional worker-host inventory metadata into the provider workflow snapshot', async () => {
    await writeRepoConfig(
      buildValidProviderConfig('v1', {
        worker_hosts: {
          hosts: [
            {
              name: 'worker-host-01',
              transport: 'ssh',
              ssh_destination: 'codex@worker-host-01',
              ssh_options: ['-p', '2222'],
              max_concurrent_agents: 2,
              node_path: '/opt/homebrew/bin/node'
            },
            {
              name: 'worker-host-02',
              ssh_destination: 'codex@worker-host-02',
              max_concurrent_agents: 1
            }
          ]
        }
      })
    );
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await store.bootstrap();

    expect(bootstrapped.worker_hosts).toEqual([
      {
        name: 'worker-host-01',
        transport: 'ssh',
        ssh_destination: 'codex@worker-host-01',
        ssh_options: ['-p', '2222'],
        max_concurrent_agents: 2,
        node_path: '/opt/homebrew/bin/node'
      },
      {
        name: 'worker-host-02',
        transport: 'ssh',
        ssh_destination: 'codex@worker-host-02',
        ssh_options: [],
        max_concurrent_agents: 1,
        node_path: null
      }
    ]);
  });

  it('defaults optional worker-host max_concurrent_agents to one when omitted', async () => {
    await writeRepoConfig(
      buildValidProviderConfig('v1', {
        worker_hosts: {
          hosts: [
            {
              name: 'worker-host-01',
              ssh_destination: 'codex@worker-host-01'
            }
          ]
        }
      })
    );
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await store.bootstrap();

    expect(bootstrapped.worker_hosts).toEqual([
      {
        name: 'worker-host-01',
        transport: 'ssh',
        ssh_destination: 'codex@worker-host-01',
        ssh_options: [],
        max_concurrent_agents: 1,
        node_path: null
      }
    ]);
  });


  it('loads operator autopilot metadata and records the latest autopilot result', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await store.bootstrap();

    expect(bootstrapped.operator_autopilot).toMatchObject({
      enabled: true,
      backlog_promotion: {
        enabled: true,
        state_name: 'Backlog',
        target_state_name: 'Ready',
        snapshot_retention: {
          max_untracked_cycles: 3,
          terminal_state_types: ['completed', 'canceled']
        }
      },
      review_handoff_rework: {
        enabled: true,
        target_state_name: 'Rework',
        excluded_action_required_reasons: [
          'draft',
          'label:do-not-merge',
          'review=REVIEW_REQUIRED',
          'required_checks_query_failed'
        ]
      },
      post_merge_rollout: {
        enabled: true,
        summary: 'Merge closeout completed; local rollout follow-up may still be required.'
      },
      last_result: null
    });
    expect(bootstrapped.operator_autopilot?.audit_path).toContain(
      'provider-operator-autopilot.jsonl'
    );
    expect(bootstrapped.operator_autopilot?.lifecycle_path).toContain(
      'provider-operator-autopilot-lifecycle.json'
    );

    store.recordOperatorAutopilotResult({
      recorded_at: '2026-04-09T09:30:00.000Z',
      status: 'acted',
      summary: 'Promoted backlog head CO-118 to Ready.',
      error: null,
      actions: [
        {
          kind: 'backlog_promotion',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          reason: 'backlog_head_promoted',
          summary: 'Promoted backlog head CO-118 to Ready.',
          transition: {
            status: 'transitioned',
            attempted_at: '2026-04-09T09:30:00.000Z',
            previous_state: 'Backlog',
            target_state: 'Ready',
            issue_state: 'Ready',
            issue_state_type: 'unstarted',
            issue_updated_at: '2026-04-09T09:30:00.000Z',
            force_path_used: true,
            error: null
          },
          action_required_reasons: []
        }
      ],
      holds: [
        {
          kind: 'backlog_promotion',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          issue_state: 'Backlog',
          issue_state_type: 'backlog',
          issue_updated_at: '2026-04-09T09:40:00.000Z',
          promotion_attempted_at: '2026-04-09T09:30:00.000Z',
          promotion_issue_updated_at: '2026-04-09T09:30:00.000Z',
          force_path_used: true,
          reason: 'backlog_head_manual_demotion_unacknowledged',
          summary: 'Backlog head CO-118 remains parked after manual demotion.',
          action_required_reasons: []
        }
      ],
      pending_actions: [],
      terminal_blocker_advisories: [
        {
          kind: 'terminal_blocker_cleanup',
          issue_id: 'lin-issue-2',
          issue_identifier: 'CO-253',
          issue_state: 'Blocked',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-09T09:40:00.000Z',
          blockers: [
            {
              id: 'lin-issue-1',
              identifier: 'CO-118',
              state: 'Done',
              state_type: 'completed'
            }
          ],
          canonical_owner_hints: [
            'codex-orchestrator:canonical-owner-key=blocked-terminal-blocker-cleanup-advisory'
          ],
          duplicate_hints: ['outbound:duplicate:CO-118:Done'],
          recommended_action: 'duplicate_cleanup',
          summary:
            'Blocked issue CO-253 has only terminal blockers (CO-118 Done/completed); recommend duplicate-cleanup candidate.'
        }
      ],
      resolved_actions: [],
      lifecycle_records: [],
      backlog_promotion_snapshots: [
        {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T09:30:00.000Z',
          issue_updated_at: '2026-04-09T09:30:00.000Z',
          force_path_used: true,
          untracked_cycles: 1
        }
      ],
      backlog_promotion_snapshot_retention_records: [
        {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T09:30:00.000Z',
          issue_updated_at: '2026-04-09T09:30:00.000Z',
          evaluated_at: '2026-04-09T09:40:30.000Z',
          decision: 'retained',
          reason: 'temporarily_untracked',
          age_ms: 630000,
          untracked_cycles: 1,
          max_untracked_cycles: 3,
          issue_state: null,
          issue_state_type: null,
          issue_archived_at: null,
          issue_trashed: null,
          issue_observed_updated_at: null,
          terminal_state_evidence: false,
          force_path_used: true
        }
      ]
    });

    expect(store.snapshot().operator_autopilot?.last_result).toMatchObject({
      status: 'acted',
      actions: [
        {
          kind: 'backlog_promotion',
          issue_identifier: 'CO-118',
          transition: {
            issue_updated_at: '2026-04-09T09:30:00.000Z',
            force_path_used: true
          }
        }
      ],
      holds: [
        {
          kind: 'backlog_promotion',
          issue_identifier: 'CO-118',
          issue_updated_at: '2026-04-09T09:40:00.000Z',
          promotion_attempted_at: '2026-04-09T09:30:00.000Z',
          promotion_issue_updated_at: '2026-04-09T09:30:00.000Z',
          force_path_used: true,
          reason: 'backlog_head_manual_demotion_unacknowledged'
        }
      ],
      terminal_blocker_advisories: [
        {
          issue_identifier: 'CO-253',
          recommended_action: 'duplicate_cleanup'
        }
      ],
      backlog_promotion_snapshots: [
        {
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T09:30:00.000Z',
          issue_updated_at: '2026-04-09T09:30:00.000Z',
          force_path_used: true,
          untracked_cycles: 1
        }
      ],
      backlog_promotion_snapshot_retention_records: [
        {
          issue_identifier: 'CO-118',
          decision: 'retained',
          reason: 'temporarily_untracked',
          age_ms: 630000,
          untracked_cycles: 1,
          max_untracked_cycles: 3,
          terminal_state_evidence: false,
          force_path_used: true
        }
      ]
    });

    const snapshotted = store.snapshot();
    expect(snapshotted.operator_autopilot?.last_result).toBeTruthy();
    if (snapshotted.operator_autopilot?.last_result) {
      snapshotted.operator_autopilot.last_result.status = 'failed';
      snapshotted.operator_autopilot.last_result.actions[0]!.transition.force_path_used = false;
      snapshotted.operator_autopilot.last_result.holds[0]!.issue_updated_at = 'mutated';
      snapshotted.operator_autopilot.last_result.terminal_blocker_advisories[0]!.recommended_action =
        'ready_to_unblock';
      snapshotted.operator_autopilot.last_result.backlog_promotion_snapshots![0]!.force_path_used = false;
      snapshotted.operator_autopilot.last_result.backlog_promotion_snapshot_retention_records![0]!.force_path_used = false;
    }

    expect(store.snapshot().operator_autopilot?.last_result?.status).toBe('acted');
    expect(
      store.snapshot().operator_autopilot?.last_result?.actions[0]?.transition.force_path_used
    ).toBe(true);
    expect(store.snapshot().operator_autopilot?.last_result?.holds[0]?.issue_updated_at).toBe(
      '2026-04-09T09:40:00.000Z'
    );
    expect(
      store.snapshot().operator_autopilot?.last_result?.terminal_blocker_advisories[0]
        ?.recommended_action
    ).toBe('duplicate_cleanup');
    expect(
      store.snapshot().operator_autopilot?.last_result?.backlog_promotion_snapshots?.[0]?.force_path_used
    ).toBe(true);
    expect(
      store.snapshot().operator_autopilot?.last_result
        ?.backlog_promotion_snapshot_retention_records?.[0]?.force_path_used
    ).toBe(true);
  });

  it('bounds operator autopilot last-result history before exposing status snapshots', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const largeResult = buildLargeOperatorAutopilotResult(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT + 25
    );
    largeResult.actions = largeResult.actions.map((action, index) => ({
      ...action,
      transition: {
        ...action.transition,
        attempted_at: new Date(Date.UTC(2026, 3, 25, 18, index, 0, 0)).toISOString(),
        issue_updated_at: new Date(Date.UTC(2026, 3, 25, 18, index, 0, 1)).toISOString()
      }
    }));
    largeResult.actions = [
      ...largeResult.actions.slice(OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT),
      ...largeResult.actions.slice(0, OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT)
    ];
    store.recordOperatorAutopilotResult(largeResult);

    const operationalLastResult = store.snapshot().operator_autopilot?.last_result;
    expect(operationalLastResult?.actions).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT + 25
    );
    expect(operationalLastResult?.backlog_promotion_snapshots).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT + 25
    );
    expect(operationalLastResult?.status_dataset_bounds).toBeUndefined();

    const lastResult = cloneProviderWorkflowStatusPayload(store.snapshot()).operator_autopilot
      ?.last_result;
    expect(lastResult?.actions).toHaveLength(OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT);
    expect(lastResult?.holds).toHaveLength(OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT);
    expect(lastResult?.pending_actions).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT + 25
    );
    expect(lastResult?.terminal_blocker_advisories).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT
    );
    expect(lastResult?.resolved_actions).toHaveLength(OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT);
    expect(lastResult?.lifecycle_records).toHaveLength(OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT);
    expect(lastResult?.local_rollout_execution_attempts).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT
    );
    expect(lastResult?.backlog_promotion_snapshots).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT
    );
    expect(lastResult?.backlog_promotion_snapshot_retention_records).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT
    );
    expect(lastResult?.actions[0]?.issue_identifier).toBe('CO-25');
    expect(lastResult?.actions[lastResult.actions.length - 1]?.issue_identifier).toBe('CO-74');
    expect(lastResult?.status_dataset_bounds).toEqual({
      limit: OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT,
      truncated: true,
      omitted_counts: {
        actions: 25,
        holds: 25,
        pending_actions: 0,
        terminal_blocker_advisories: 25,
        resolved_actions: 25,
        lifecycle_records: 25,
        local_rollout_execution_attempts: 25,
        backlog_promotion_snapshots: 25,
        backlog_promotion_snapshot_retention_records: 25
      }
    });

    const snapshotted = store.snapshot().operator_autopilot?.last_result;
    expect(snapshotted?.actions).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT + 25
    );
    const snapshottedStatus = cloneProviderWorkflowStatusPayload(store.snapshot()).operator_autopilot
      ?.last_result;
    expect(snapshottedStatus?.status_dataset_bounds?.omitted_counts.actions).toBe(25);
    expect(snapshottedStatus?.actions).toHaveLength(OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT);
    expect(snapshottedStatus?.pending_actions).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT + 25
    );
    expect(
      snapshottedStatus?.local_rollout_execution_attempts?.[0]?.stdout
    ).toContain('[truncated ');
    expect(
      snapshottedStatus?.local_rollout_execution_attempts?.[0]?.stdout?.length ?? 0
    ).toBeLessThanOrEqual(OPERATOR_AUTOPILOT_STATUS_TEXT_FIELD_LIMIT);
    expect(
      snapshottedStatus?.local_rollout_execution_attempts?.[0]?.stderr
    ).toContain('[truncated ');
    expect(
      snapshottedStatus?.local_rollout_execution_attempts?.[0]?.stderr?.length ?? 0
    ).toBeLessThanOrEqual(OPERATOR_AUTOPILOT_STATUS_TEXT_FIELD_LIMIT);

    await writeRepoConfig(buildValidProviderConfig('v2'));
    const refreshed = await store.refresh();
    expect(refreshed.operator_autopilot?.last_result?.actions).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT + 25
    );
    expect(refreshed.operator_autopilot?.last_result?.status_dataset_bounds).toBeUndefined();
    const directStatus = await store.refreshStatus!();
    expect(directStatus.operator_autopilot?.last_result?.actions).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT
    );
    expect(directStatus.operator_autopilot?.last_result?.status_dataset_bounds?.omitted_counts).toMatchObject({
      actions: 25,
      pending_actions: 0,
      local_rollout_execution_attempts: 25,
      backlog_promotion_snapshot_retention_records: 25
    });
    const refreshedStatus = cloneProviderWorkflowStatusPayload(refreshed);
    expect(refreshedStatus.operator_autopilot?.last_result?.status_dataset_bounds?.omitted_counts).toMatchObject({
      actions: 25,
      pending_actions: 0,
      local_rollout_execution_attempts: 25,
      backlog_promotion_snapshot_retention_records: 25
    });
    expect(refreshedStatus.operator_autopilot?.last_result?.actions).toHaveLength(
      OPERATOR_AUTOPILOT_STATUS_DATASET_ITEM_LIMIT
    );
  });

  it('retries a failed revision when the config is repaired without metadata change', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');
    const recoveredRaw = `${JSON.stringify(buildValidProviderConfig('v2'), null, 2)}\n`;
    const brokenRaw = recoveredRaw.replace('"defaultPipeline"', "'defaultPipeline'");
    const configPath = getRepoConfigPath();
    const fixedRevisionTime = new Date(Date.UTC(2026, 2, 24, 0, 0, 50));

    expect(brokenRaw).not.toBe(recoveredRaw);
    expect(brokenRaw.length).toBe(recoveredRaw.length);

    await writeFile(configPath, brokenRaw, 'utf8');
    await utimes(configPath, fixedRevisionTime, fixedRevisionTime);
    const degraded = await store.refresh();

    expect(degraded.status).toBe('reload_failed');
    expect(degraded.snapshot_path).toBe(snapshotPath);
    expect(degraded.last_error).toBeTruthy();
    expect(await readFile(snapshotPath, 'utf8')).toBe(initialSnapshot);

    await writeFile(configPath, recoveredRaw, 'utf8');
    await utimes(configPath, fixedRevisionTime, fixedRevisionTime);

    const recovered = await store.refresh();
    const recoveredSnapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as {
      pipelines: Array<{ title: string }>;
    };

    expect(recovered.status).toBe('ready');
    expect(recovered.last_error).toBeNull();
    expect(recoveredSnapshot.pipelines[0]?.title).toBe('Provider worker v2');
  });

  it('regenerates the launch snapshot when the cached snapshot file is removed', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    await rm(snapshotPath, { force: true });

    const regeneratedSnapshotPath = await store.getLaunchConfigPath();
    const regeneratedSnapshot = await readFile(regeneratedSnapshotPath, 'utf8');

    expect(regeneratedSnapshotPath).toBe(snapshotPath);
    expect(regeneratedSnapshot).toBe(initialSnapshot);
    expect(store.snapshot().status).toBe('ready');
  });

  it('fails closed when the cached snapshot path stops being a file', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();

    await rm(snapshotPath, { force: true });
    await mkdir(snapshotPath, { recursive: true });

    const degraded = await store.refresh();

    expect(degraded).toMatchObject({
      status: 'reload_failed',
      snapshot_path: snapshotPath
    });
    expect(degraded.last_error).toBeTruthy();
    await expect(store.getLaunchConfigPath()).rejects.toThrow(
      /Provider workflow config snapshot is unavailable:/
    );
    expect(store.snapshot()).toMatchObject({
      status: 'reload_failed',
      snapshot_path: snapshotPath
    });
    expect(store.snapshot().last_error).toBeTruthy();
  });

  it('rewrites a corrupted snapshot before short-circuiting an unchanged revision', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    await writeFile(snapshotPath, '{ invalid json', 'utf8');

    const refreshed = await store.refresh();
    const healedSnapshot = await readFile(snapshotPath, 'utf8');

    expect(refreshed.status).toBe('ready');
    expect(refreshed.last_error).toBeNull();
    expect(healedSnapshot).toBe(initialSnapshot);
    expect(await store.getLaunchConfigPath()).toBe(snapshotPath);
  });

  it('preserves the last known good snapshot when rewriting it fails', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const runDir = join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host');
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir,
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    await writeRepoConfig(buildValidProviderConfig('v2'));
    await chmod(runDir, 0o500);

    try {
      const degraded = await store.refresh();

      expect(degraded.status).toBe('reload_failed');
      expect(degraded.snapshot_path).toBe(snapshotPath);
      expect(degraded.last_error).toBeTruthy();
      expect(await readFile(snapshotPath, 'utf8')).toBe(initialSnapshot);
    } finally {
      await chmod(runDir, 0o700);
    }

    const recovered = await store.refresh();
    const recoveredSnapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as {
      pipelines: Array<{ title: string }>;
    };

    expect(recovered.status).toBe('ready');
    expect(recovered.last_error).toBeNull();
    expect(recoveredSnapshot.pipelines[0]?.title).toBe('Provider worker v2');
  });

  it('serializes concurrent refresh and launch-path reads while rewriting the snapshot', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const runDir = join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host');
    const snapshotPath = join(runDir, 'provider-workflow.last-known-good.json');
    const tempSnapshotPath = `${snapshotPath}.tmp`;
    const firstSnapshotWriteEntered = createDeferred<void>();
    const releaseFirstSnapshotWrite = createDeferred<void>();
    let observeSnapshotWrites = false;
    let observedSnapshotTempWriteCalls = 0;
    let activeSnapshotTempWrites = 0;
    let maxConcurrentSnapshotTempWrites = 0;

    vi.resetModules();
    const actualFsPromises = await vi.importActual<typeof import('node:fs/promises')>(
      'node:fs/promises'
    );
    vi.doMock('node:fs/promises', () => ({
      ...actualFsPromises,
      writeFile: vi.fn(
        async (...args: Parameters<typeof actualFsPromises.writeFile>) => {
          const [path] = args;
          if (path === tempSnapshotPath && observeSnapshotWrites) {
            observedSnapshotTempWriteCalls += 1;
            activeSnapshotTempWrites += 1;
            maxConcurrentSnapshotTempWrites = Math.max(
              maxConcurrentSnapshotTempWrites,
              activeSnapshotTempWrites
            );
            try {
              if (observedSnapshotTempWriteCalls === 1) {
                firstSnapshotWriteEntered.resolve();
                await releaseFirstSnapshotWrite.promise;
              }
              return await actualFsPromises.writeFile(...args);
            } finally {
              activeSnapshotTempWrites -= 1;
            }
          }
          return await actualFsPromises.writeFile(...args);
        }
      )
    }));
    const { createProviderWorkflowConfigStore: createIsolatedProviderWorkflowConfigStore } =
      await import('../src/cli/control/providerWorkflowConfigStore.js');
    const store = createIsolatedProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir,
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    await store.getLaunchConfigPath();
    observeSnapshotWrites = true;
    await writeRepoConfig(buildValidProviderConfig('v2'));
    const refreshPromise = store.refresh();
    await firstSnapshotWriteEntered.promise;

    const launchPathPromise = store.getLaunchConfigPath();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(maxConcurrentSnapshotTempWrites).toBe(1);

    releaseFirstSnapshotWrite.resolve();
    const [refreshed, launchPath] = await Promise.all([refreshPromise, launchPathPromise]);
    const recoveredSnapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as {
      pipelines: Array<{ title: string }>;
    };

    expect(refreshed.status).toBe('ready');
    expect(launchPath).toBe(snapshotPath);
    expect(observedSnapshotTempWriteCalls).toBe(1);
    expect(maxConcurrentSnapshotTempWrites).toBe(1);
    expect(recoveredSnapshot.pipelines[0]?.title).toBe('Provider worker v2');
  });

  it('watches the resolved repo-config override path when one is provided', async () => {
    const overridePath = join(workspaceRoot, 'config', 'provider.json');
    process.env[REPO_CONFIG_PATH_ENV_KEY] = overridePath;
    await mkdir(join(workspaceRoot, 'config'), { recursive: true });
    await writeFile(overridePath, `${JSON.stringify(buildValidProviderConfig('override'), null, 2)}\n`, 'utf8');
    revisionTick += 1;
    const revisionTime = new Date(Date.UTC(2026, 2, 24, 0, 0, revisionTick));
    await utimes(overridePath, revisionTime, revisionTime);

    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await store.bootstrap();

    expect(bootstrapped.status).toBe('ready');
    expect(bootstrapped.source_path).toBe(overridePath);
  });
});

function buildEnv(repoRoot: string): EnvironmentPaths {
  return {
    repoRoot,
    runsRoot: join(repoRoot, '.runs'),
    outRoot: join(repoRoot, 'out'),
    taskId: 'local-mcp'
  };
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

async function writeRepoConfig(config: Record<string, unknown> | string): Promise<void> {
  const configPath = getRepoConfigPath();
  const raw = typeof config === 'string' ? config : `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, raw, 'utf8');
  revisionTick += 1;
  const revisionTime = new Date(Date.UTC(2026, 2, 24, 0, 0, revisionTick));
  await utimes(configPath, revisionTime, revisionTime);
}

function getRepoConfigPath(): string {
  return join(workspaceRoot, 'codex.orchestrator.json');
}

function buildValidProviderConfig(
  version: string,
  metadataOverrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    defaultPipeline: 'provider-linear-worker',
    pipelines: [
      {
        id: 'provider-linear-worker',
        title: `Provider worker ${version}`,
        guardrailsRequired: false,
        metadata: {
          operator_autopilot: {
            enabled: true,
            backlog_promotion: {
              enabled: true,
              state_name: 'Backlog',
              target_state_name: 'Ready'
            },
            review_handoff_rework: {
              enabled: true,
              target_state_name: 'Rework',
              excluded_action_required_reasons: [
                'draft',
                'label:do-not-merge',
                'review=REVIEW_REQUIRED',
                'required_checks_query_failed'
              ]
            },
            post_merge_rollout: {
              enabled: true,
              summary: 'Merge closeout completed; local rollout follow-up may still be required.'
            }
          },
          terminal_cleanup: {
            enabled: true,
            close_attached_pr: {
              enabled: true,
              comment_template:
                'Closing because the Linear issue for branch {{branch}} entered a terminal state without merge.'
            }
          },
          ...metadataOverrides
        },
        stages: [
          {
            kind: 'command',
            id: 'echo',
            title: 'echo',
            command: `echo ${version}`
          }
        ]
      }
    ]
  };
}

function buildLargeOperatorAutopilotResult(count: number): ProviderOperatorAutopilotResult {
  return {
    recorded_at: '2026-04-25T18:20:00.000Z',
    status: 'acted',
    summary: `Generated ${count} synthetic operator-autopilot records.`,
    error: null,
    actions: Array.from({ length: count }, (_, index) => ({
      kind: 'backlog_promotion',
      issue_id: `lin-issue-${index}`,
      issue_identifier: `CO-${index}`,
      reason: 'backlog_head_promoted',
      summary: `Promoted CO-${index} to Ready.`,
      transition: {
        status: 'transitioned',
        attempted_at: `2026-04-25T18:${String(index % 60).padStart(2, '0')}:00.000Z`,
        previous_state: 'Backlog',
        target_state: 'Ready',
        issue_state: 'Ready',
        issue_state_type: 'unstarted',
        issue_updated_at: `2026-04-25T18:${String(index % 60).padStart(2, '0')}:01.000Z`,
        force_path_used: index % 2 === 0,
        error: null
      },
      action_required_reasons: []
    })),
    holds: Array.from({ length: count }, (_, index) => ({
      kind: 'review_handoff_rework',
      issue_id: `lin-hold-${index}`,
      issue_identifier: `CO-HOLD-${index}`,
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: `2026-04-25T17:${String(index % 60).padStart(2, '0')}:00.000Z`,
      promotion_attempted_at: null,
      promotion_issue_updated_at: null,
      force_path_used: false,
      reason: 'review_handoff_missing_pr',
      summary: `Held CO-HOLD-${index}.`,
      action_required_reasons: ['required_checks_query_failed']
    })),
    pending_actions: Array.from({ length: count }, (_, index) => ({
      kind: 'local_rollout',
      action_instance_id: `local_rollout:pending-${index}`,
      issue_id: `lin-pending-${index}`,
      issue_identifier: `CO-PENDING-${index}`,
      summary: `Local rollout pending for CO-PENDING-${index}.`,
      merge_closeout_recorded_at: `2026-04-25T16:${String(index % 60).padStart(2, '0')}:00.000Z`,
      merge_closeout_reason: 'merged_and_transitioned_done',
      shared_root_status: 'reconciled',
      linear_transition_status: 'transitioned',
      executable_action_ids: [`rollout-${index}`],
      lifecycle_state: 'pending',
      lifecycle_actor: null,
      lifecycle_reason: null,
      lifecycle_recorded_at: null
    })),
    terminal_blocker_advisories: Array.from({ length: count }, (_, index) => ({
      kind: 'terminal_blocker_cleanup',
      issue_id: `lin-advisory-${index}`,
      issue_identifier: `CO-ADVISORY-${index}`,
      issue_state: 'Blocked',
      issue_state_type: 'started',
      issue_updated_at: `2026-04-25T15:${String(index % 60).padStart(2, '0')}:00.000Z`,
      blockers: [
        {
          id: `lin-blocker-${index}`,
          identifier: `CO-BLOCKER-${index}`,
          state: 'Done',
          state_type: 'completed'
        }
      ],
      canonical_owner_hints: ['codex-orchestrator:canonical-owner-key=test-owner'],
      duplicate_hints: [`outbound:duplicate:CO-BLOCKER-${index}:Done`],
      recommended_action: 'duplicate_cleanup',
      summary: `Terminal blocker advisory for CO-ADVISORY-${index}.`
    })),
    resolved_actions: Array.from({ length: count }, (_, index) => ({
      kind: 'local_rollout',
      action_instance_id: `local_rollout:resolved-${index}`,
      issue_id: `lin-resolved-${index}`,
      issue_identifier: `CO-RESOLVED-${index}`,
      summary: `Local rollout resolved for CO-RESOLVED-${index}.`,
      merge_closeout_recorded_at: `2026-04-25T14:${String(index % 60).padStart(2, '0')}:00.000Z`,
      merge_closeout_reason: 'merged_and_transitioned_done',
      shared_root_status: 'reconciled',
      linear_transition_status: 'transitioned',
      executable_action_ids: [`rollout-resolved-${index}`],
      lifecycle_state: 'cleared',
      lifecycle_actor: 'operator-autopilot',
      lifecycle_reason: 'completed',
      lifecycle_recorded_at: `2026-04-25T14:${String(index % 60).padStart(2, '0')}:30.000Z`
    })),
    lifecycle_records: Array.from({ length: count }, (_, index) => ({
      action_instance_id: `local_rollout:lifecycle-${index}`,
      kind: 'local_rollout',
      issue_id: `lin-lifecycle-${index}`,
      issue_identifier: `CO-LIFECYCLE-${index}`,
      state: 'cleared',
      actor: 'operator-autopilot',
      reason: 'completed',
      recorded_at: `2026-04-25T13:${String(index % 60).padStart(2, '0')}:00.000Z`,
      source: 'operator-autopilot'
    })),
    local_rollout_execution_attempts: Array.from({ length: count }, (_, index) => ({
      record_kind: 'terminal',
      action_instance_id: `local_rollout:attempt-${index}`,
      action_id: `rollout-attempt-${index}`,
      issue_id: `lin-attempt-${index}`,
      issue_identifier: `CO-ATTEMPT-${index}`,
      preflight: {
        status: 'passed',
        reason: null,
        checked_at: `2026-04-25T12:${String(index % 60).padStart(2, '0')}:00.000Z`,
        summary: 'Preflight passed.'
      },
      started_at: `2026-04-25T12:${String(index % 60).padStart(2, '0')}:01.000Z`,
      ended_at: `2026-04-25T12:${String(index % 60).padStart(2, '0')}:30.000Z`,
      terminal_state: 'succeeded',
      reason: null,
      summary: `Rollout attempt ${index} succeeded.`,
      command: {
        runner: 'codex_orchestrator',
        command: 'codex-orchestrator',
        args: ['linear', 'local-rollout'],
        cwd: workspaceRoot,
        timeout_ms: 900000
      },
      exit_code: 0,
      stdout: 'o'.repeat(OPERATOR_AUTOPILOT_STATUS_TEXT_FIELD_LIMIT + 512),
      stderr: 'e'.repeat(OPERATOR_AUTOPILOT_STATUS_TEXT_FIELD_LIMIT + 256)
    })),
    backlog_promotion_snapshots: Array.from({ length: count }, (_, index) => ({
      issue_id: `lin-snapshot-${index}`,
      issue_identifier: `CO-SNAPSHOT-${index}`,
      target_state: 'Ready',
      attempted_at: `2026-04-25T11:${String(index % 60).padStart(2, '0')}:00.000Z`,
      issue_updated_at: `2026-04-25T11:${String(index % 60).padStart(2, '0')}:01.000Z`,
      force_path_used: false,
      untracked_cycles: index % 3
    })),
    backlog_promotion_snapshot_retention_records: Array.from({ length: count }, (_, index) => ({
      issue_id: `lin-retention-${index}`,
      issue_identifier: `CO-RETENTION-${index}`,
      target_state: 'Ready',
      attempted_at: `2026-04-25T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
      issue_updated_at: `2026-04-25T10:${String(index % 60).padStart(2, '0')}:01.000Z`,
      evaluated_at: `2026-04-25T10:${String(index % 60).padStart(2, '0')}:30.000Z`,
      decision: 'retained',
      reason: 'temporarily_untracked',
      age_ms: 60000 + index,
      untracked_cycles: index % 3,
      max_untracked_cycles: 3,
      issue_state: 'Backlog',
      issue_state_type: 'backlog',
      issue_archived_at: null,
      issue_trashed: null,
      issue_observed_updated_at: `2026-04-25T10:${String(index % 60).padStart(2, '0')}:01.000Z`,
      terminal_state_evidence: false,
      force_path_used: false
    }))
  };
}
