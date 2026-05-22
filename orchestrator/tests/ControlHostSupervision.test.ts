import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS,
  buildControlHostSupervisionConfig,
  buildInitialControlHostSupervisionState,
  buildControlHostSupervisionPlist,
  evaluateControlHostSupervisionHealthPayload,
  parseControlHostSupervisionCsv,
  resolveControlHostSupervisionPaths,
  resolveDefaultControlHostSupervisionEntrypoint
} from '../src/cli/control/controlHostSupervision.js';
import { buildMachineStatusDataset } from '../src/cli/control/controlMachineStatusPresenter.js';
import { __test__ as controlHostSupervisionShellTest } from '../src/cli/controlHostSupervisionCliShell.js';
import type { ProviderControlHostFreshnessGaugeReport } from '../src/cli/control/providerControlHostFreshnessGauge.js';
import type { ProviderIntakeClaimRecord } from '../src/cli/control/providerIntakeState.js';
import { sanitizeProviderOverrideEnv } from '../src/cli/utils/providerOverrideEnv.js';

const {
  assertControlHostSupervisionInstallPaths,
  assertStoredControlHostSupervisionConfig,
  bootstrapLaunchctlPlist,
  buildNextControlHostSupervisionState,
  buildControlHostSupervisionStatusPayload,
  classifyControlHostSupervisionRollout,
  captureExistingControlHostSupervisionInstall,
  createSleepWaiter,
  createControlHostSupervisionChildEventPromises,
  ensureTrackedProcessTreeExited,
  extractLaunchctlServicePid,
  formatControlHostSupervisionStatus,
  hasHealthyLiveProviderControlHostFreshness,
  inspectControlHostSupervisionLiveHealth,
  inspectControlHostSupervisionLaunchAgent,
  isIgnorableLaunchctlBootoutFailure,
  isRetryableLaunchctlBootstrapError,
  loadBootstrapEnvironment,
  parseNulDelimitedEnv,
  probeControlHostHealth,
  readFormatFlag,
  readStringFlag,
  resolveEffectiveControlHostSupervisionState,
  resolveControlHostSupervisionProviderIntakeStatePath,
  resolveControlHostSupervisionQuarantineUnhealthySamples,
  readIntegerFlag,
  removeInstalledControlHostSupervisionArtifacts,
  resolveReportedSupervisedChildPid,
  restoreExistingControlHostSupervisionInstall,
  restartExistingControlHostSupervision,
  isTrackedSupervisedProcessGroup,
  rollbackFailedControlHostSupervisionInstall,
  resolveControlHostSupervisionProbeTimeoutMs,
  resolveControlHostSupervisionServiceTarget,
  terminateChildProcess,
  waitForProcessGroupToExitWithinTimeout,
  writeRuntimeStateWithCleanup
} = controlHostSupervisionShellTest;

function buildProbeTimeoutPollingFixture(): Record<string, unknown> {
  return {
    updated_at: '2026-04-21T07:21:00.000Z',
    checking: true,
    queued: true,
    stuck: true,
    restart_required: true,
    reason: 'provider_refresh_lifecycle_stuck',
    last_error: 'provider_refresh_lifecycle_stuck',
    refresh_phase: 'refresh:claim_issue_by_id_reconcile',
    refresh_request_class: 'claim_issue_by_id:running',
    refresh_provider_keys: ['linear:issue-1'],
    operation_elapsed_ms: 47_000,
    stalled_after_ms: 45_000,
    control_host_owner: null
  };
}

function buildFreshZeroWipPollingFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    updated_at: '2026-04-21T07:21:00.000Z',
    checking: false,
    queued: false,
    stuck: false,
    restart_required: false,
    reason: null,
    last_error: null,
    refresh_phase: 'refresh:idle',
    refresh_request_class: 'idle',
    refresh_provider_keys: [],
    active_claims: [],
    progress_updated_at: '2026-04-21T07:20:59.000Z',
    progress_elapsed_ms: 1_000,
    operation_elapsed_ms: 1_000,
    stalled_after_ms: 45_000,
    control_host_owner: null,
    ...overrides
  };
}

function buildMachineStatusDegradedPayload(overrides: Record<string, unknown> = {}) {
  return {
    generated_at: '2026-04-21T07:21:00.000Z',
    mode: 'control_machine_status',
    read_only: true,
    host: 'test-host',
    counts: {
      running: 0,
      retrying: 0,
      issues: 0,
      max_allowed: null
    },
    polling: null,
    running: [],
    retrying: [],
    issues: [],
    machine_status_degraded: {
      reason: 'read_timeout',
      source: 'machine_status_controller',
      message: 'control-host machine-status read timed out after 5000ms.',
      timeout_ms: 5000
    },
    ...overrides
  };
}

function buildProbeTimeoutDiagnosticFixture() {
  return {
    counts: {
      running: 1,
      retrying: null,
      max_allowed: null
    },
    polling: {
      updated_at: '2026-04-21T07:21:00.000Z',
      checking: true,
      queued: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      last_error: 'provider_refresh_lifecycle_stuck',
      refresh_phase: 'refresh:claim_issue_by_id_reconcile',
      refresh_request_class: 'claim_issue_by_id:running',
      refresh_provider_keys: ['linear:issue-1'],
      operation_elapsed_ms: 47_000,
      stalled_after_ms: 45_000,
      control_host_owner: null
    },
    running_workers: [
      {
        issue_id: 'issue-1',
        issue_identifier: 'CO-225',
        state: 'running',
        display_state: 'In Progress',
        pid: null,
        worker_host: 'host-a',
        session_id: 'run-1',
        started_at: '2026-04-21T07:00:00.000Z',
        last_event_at: '2026-04-21T07:21:00.000Z'
      }
    ]
  };
}

function buildProviderIntakeClaimFixture(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'linear',
    provider_key: 'linear:issue-1',
    issue_id: 'issue-1',
    issue_identifier: 'CO-225',
    issue_title: 'Provider worker stays healthy',
    issue_state: 'In Progress',
    issue_state_type: 'started',
    issue_updated_at: '2026-04-21T07:20:00.000Z',
    task_id: 'linear-issue-1',
    mapping_source: 'provider_id_fallback',
    state: 'running',
    reason: null,
    accepted_at: '2026-04-21T07:00:00.000Z',
    updated_at: '2026-04-21T07:21:00.000Z',
    last_delivery_id: null,
    last_event: null,
    last_action: null,
    last_webhook_timestamp: null,
    run_id: 'run-1',
    run_manifest_path: null,
    worker_host: 'host-a',
    launch_source: 'control-host',
    launch_token: null,
    launch_started_at: '2026-04-21T07:00:00.000Z',
    retry_queued: false,
    retry_attempt: null,
    retry_due_at: null,
    retry_error: null,
    ...overrides
  };
}

async function writeProviderIntakeStateFixture(
  config: ReturnType<typeof buildControlHostSupervisionConfig>,
  options: { claimState?: string; polling?: Record<string, unknown>; claims?: Record<string, unknown>[] },
  env: NodeJS.ProcessEnv = {}
): Promise<void> {
  const statePath = resolveControlHostSupervisionProviderIntakeStatePath(config, env);
  await mkdir(dirname(statePath), { recursive: true });
  const claimState = options.claimState ?? 'running';
  const claims = options.claims ?? [buildProviderIntakeClaimFixture({ state: claimState })];
  await writeFile(
    statePath,
    `${JSON.stringify(
      {
        schema_version: 1,
        updated_at: '2026-04-21T07:21:00.000Z',
        rehydrated_at: null,
        latest_provider_key: 'linear:issue-1',
        latest_reason: null,
        polling: options.polling ?? buildProbeTimeoutPollingFixture(),
        claims
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

describe('controlHostSupervision helpers', () => {
  it('builds a configurable supervision config without host-local hard-coded paths', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task',
      runId: 'custom-run',
      pipelineId: 'custom-pipeline',
      healthIntervalSeconds: 45,
      unhealthyThreshold: 5,
      envFiles: ['/env/one', '/env/two'],
      shellPath: '/bin/zsh'
    });

    expect(config.label).toBe('com.example.control-host');
    expect(config.repoRoot).toBe('/repo/CO');
    expect(config.nodePath).toBe('/custom/node');
    expect(config.cliEntrypoint).toBe('/opt/codex-orchestrator.js');
    expect(config.taskId).toBe('custom-task');
    expect(config.runId).toBe('custom-run');
    expect(config.pipelineId).toBe('custom-pipeline');
    expect(config.healthIntervalSeconds).toBe(45);
    expect(config.unhealthyThreshold).toBe(5);
    expect(config.envFiles).toEqual(['/env/one', '/env/two']);
    expect(config.paths.plistPath).toBe(
      '/Users/tester/Library/LaunchAgents/com.example.control-host.plist'
    );
  });

  it('keeps the legacy launch agent label as the default for install continuity', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });

    expect(config.label).toBe('com.kbediako.co.control-host');
    expect(config.paths.plistPath).toBe(
      '/Users/tester/Library/LaunchAgents/com.kbediako.co.control-host.plist'
    );
  });

  it('renders a launchd plist that runs the packaged supervise runner', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });

    const plist = buildControlHostSupervisionPlist(config);

    expect(plist).toContain('<key>ProgramArguments</key>');
    expect(plist).toContain('<string>/custom/node</string>');
    expect(plist).toContain('<string>/opt/codex-orchestrator.js</string>');
    expect(plist).toContain('<string>control-host</string>');
    expect(plist).toContain('<string>supervise</string>');
    expect(plist).toContain('<string>run</string>');
    expect(plist).toContain(`<string>${config.paths.configPath}</string>`);
    expect(plist).toContain('<key>ThrottleInterval</key>');
  });

  it('pins installs to the packaged bootstrap entrypoint when running from source', () => {
    expect(
      resolveDefaultControlHostSupervisionEntrypoint(
        '/repo/bin/codex-orchestrator.ts',
        '/package/root'
      )
    ).toBe('/package/root/bin/codex-orchestrator.js');
  });

  it('defaults managed supervision configs to the source-first bootstrap entrypoint', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node'
    });

    expect(config.cliEntrypoint).toBe('/repo/CO/bin/codex-orchestrator.js');
  });

  it('treats restart_required health payloads as unhealthy', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload({
        polling: {
          restart_required: true
        }
      })
    ).toEqual({
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.'
    });
  });

  it('treats stale provider refresh restart_required snapshots from before child start as quiescent', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          polling: {
            restart_required: true,
            reason: 'provider_refresh_lifecycle_stuck',
            updated_at: '2026-04-14T05:02:27.000Z'
          }
        },
        {
          minPollingUpdatedAt: '2026-04-14T05:04:59.000Z'
        }
      )
    ).toEqual({
      healthy: true,
      reason: 'stale_restart_required',
      message:
        'co-status reported a stale provider_refresh_lifecycle_stuck restart_required snapshot from before the current supervised child start; treating it as quiescent while the current host refreshes.'
    });
  });

  it('treats stale provider refresh last_error snapshots from before child start as quiescent', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          polling: {
            restart_required: true,
            last_error: 'provider_refresh_lifecycle_stuck',
            updated_at: '2026-04-14T05:02:27.000Z'
          }
        },
        {
          minPollingUpdatedAt: '2026-04-14T05:04:59.000Z'
        }
      )
    ).toEqual({
      healthy: true,
      reason: 'stale_restart_required',
      message:
        'co-status reported a stale provider_refresh_lifecycle_stuck restart_required snapshot from before the current supervised child start; treating it as quiescent while the current host refreshes.'
    });
  });

  it('expires stale provider refresh restart_required quiescence after the startup grace window', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          polling: {
            restart_required: true,
            reason: 'provider_refresh_lifecycle_stuck',
            updated_at: '2026-04-14T05:02:27.000Z'
          }
        },
        {
          minPollingUpdatedAt: '2026-04-14T05:04:59.000Z',
          staleRestartRequiredGraceMs: 90_000,
          now: '2026-04-14T05:06:30.000Z'
        }
      )
    ).toEqual({
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.'
    });
  });

  it('keeps current provider refresh restart_required snapshots unhealthy', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          polling: {
            restart_required: true,
            reason: 'provider_refresh_lifecycle_stuck',
            updated_at: '2026-04-14T05:07:38.000Z'
          }
        },
        {
          minPollingUpdatedAt: '2026-04-14T05:04:59.000Z'
        }
      )
    ).toEqual({
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.'
    });
  });

  it('quarantines repeated active-worker provider refresh restart churn after one recovery', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          counts: {
            running: 1,
            retrying: 0
          },
          running: [
            {
              issue_id: 'issue-1',
              issue_identifier: 'CO-207',
              state: 'in_progress',
              display_state: 'In Progress',
              pid: '555',
              started_at: '2026-04-14T05:00:00.000Z'
            }
          ],
          polling: {
            restart_required: true,
            reason: 'provider_refresh_lifecycle_stuck',
            updated_at: '2026-04-14T05:07:38.000Z',
            refresh_phase: 'refresh:fresh_dispatch',
            refresh_request_class: 'fresh_dispatch:ready',
            refresh_provider_keys: ['linear:issue-2'],
            checking: true,
            queued: true,
            operation_elapsed_ms: 47_000,
            stalled_after_ms: 45_000
          }
        },
        {
          restartHistory: [
            {
              requested_at: '2026-04-14T05:06:30.000Z',
              reason: 'restart_required',
              message: 'launchd restart requested',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: {
                counts: {
                  running: 1,
                  retrying: 0
                },
                polling: {
                  updated_at: '2026-04-14T05:06:20.000Z',
                  checking: true,
                  queued: true,
                  stuck: true,
                  restart_required: true,
                  reason: 'provider_refresh_lifecycle_stuck',
                  last_error: 'provider_refresh_lifecycle_stuck',
                  refresh_phase: 'refresh:claim_issue_by_id_reconcile',
                  refresh_request_class: 'claim_issue_by_id:running',
                  refresh_provider_keys: ['linear:issue-1'],
                  operation_elapsed_ms: 46_000,
                  stalled_after_ms: 45_000,
                  control_host_owner: null
                },
                running_workers: [
                  {
                    issue_id: 'issue-1',
                    issue_identifier: 'CO-207',
                    state: 'in_progress',
                    display_state: 'In Progress',
                    pid: '555',
                    worker_host: null,
                    session_id: null,
                    started_at: '2026-04-14T05:00:00.000Z',
                    last_event_at: null
                  }
                ]
              }
            }
          ],
          activeWorkerRestartQuarantineMs: 10 * 60 * 1000,
          now: '2026-04-14T05:07:45.000Z'
        }
      )
    ).toEqual({
      healthy: true,
      reason: 'active_worker_restart_quarantine',
      message:
        'co-status reported restart_required=true for the same provider refresh stuck series already restarted at 2026-04-14T05:06:30.000Z; 1 active provider worker(s) remain visible, so supervision is quarantining repeated restart churn while retaining restart_required in co-status.'
    });
  });

  it('keeps repeated active-worker quarantine when machine-status is built from provider-intake', () => {
    const claim = {
      provider: 'linear',
      provider_key: 'linear:issue-572',
      issue_id: 'issue-572',
      issue_identifier: 'CO-572',
      issue_title: 'Recover co-status machine readiness',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-05-21T12:30:00.000Z',
      task_id: 'linear-f7007d31-6a20-43e8-8f38-ca774a890683',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider worker active',
      accepted_at: '2026-05-21T12:25:00.000Z',
      updated_at: '2026-05-21T12:31:00.000Z',
      last_delivery_id: 'delivery-572',
      last_event: 'provider_worker_progress',
      last_action: 'poll',
      last_webhook_timestamp: null,
      run_id: 'run-572',
      run_manifest_path: null,
      worker_host: 'host-a',
      launch_source: 'control-host',
      launch_token: null,
      launch_started_at: '2026-05-21T12:26:00.000Z'
    } satisfies ProviderIntakeClaimRecord;
    const payload = buildMachineStatusDataset({
      generatedAt: '2026-05-21T12:32:00.000Z',
      providerIntake: {
        provider: 'linear',
        summary_scope: 'single_claim',
        selection_strategy: null,
        claim_count: 1,
        active_claim_count: 1,
        running_claim_count: 1,
        active_issue_identifiers: ['CO-572'],
        running_issue_identifiers: ['CO-572'],
        selected_claim: {
          provider: 'linear',
          issue_id: 'issue-572',
          issue_identifier: 'CO-572',
          issue_title: 'Recover co-status machine readiness',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-05-21T12:30:00.000Z',
          issue_archived_at: null,
          issue_trashed: null,
          issue_viewer_id: null,
          issue_assignee_id: null,
          issue_assignee_name: null,
          task_id: 'linear-f7007d31-6a20-43e8-8f38-ca774a890683',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider worker active',
          run_id: 'run-572',
          worker_host: 'host-a',
          freshness: null,
          retry: null,
          updated_at: '2026-05-21T12:31:00.000Z'
        },
        rehydrated_at: null,
        is_rehydrated: false,
        updated_at: '2026-05-21T12:31:00.000Z'
      },
      runningClaims: [claim],
      polling: {
        enabled: true,
        interval_ms: 15000,
        checking: true,
        queued: true,
        stuck: true,
        restart_required: true,
        reason: 'provider_refresh_lifecycle_stuck',
        last_mode: 'poll',
        last_requested_at: '2026-05-21T12:31:00.000Z',
        last_completed_at: null,
        last_success_at: null,
        last_error_at: '2026-05-21T12:31:30.000Z',
        last_error: 'provider_refresh_lifecycle_stuck',
        next_poll_at: null,
        next_poll_in_ms: null,
        refresh_phase: 'refresh:claim_issue_by_id_reconcile',
        refresh_request_class: 'claim_issue_by_id:running',
        refresh_provider_keys: ['linear:issue-572'],
        operation_elapsed_ms: 48_000,
        stalled_after_ms: 45_000
      },
      maxConcurrentAgents: 1
    });

    expect(
      evaluateControlHostSupervisionHealthPayload(payload, {
        restartHistory: [
          {
            requested_at: '2026-05-21T12:31:45.000Z',
            reason: 'restart_required',
            message: 'launchd restart requested',
            consecutive_unhealthy_samples: 3,
            child_pid: 4321,
            diagnostic: {
              counts: {
                running: 1,
                retrying: 0,
                max_allowed: 1
              },
              polling: {
                updated_at: null,
                checking: true,
                queued: true,
                stuck: true,
                restart_required: true,
                reason: 'provider_refresh_lifecycle_stuck',
                last_error: 'provider_refresh_lifecycle_stuck',
                refresh_phase: 'refresh:claim_issue_by_id_reconcile',
                refresh_request_class: 'claim_issue_by_id:running',
                refresh_provider_keys: ['linear:issue-572'],
                operation_elapsed_ms: 46_000,
                progress_updated_at: null,
                progress_elapsed_ms: null,
                stalled_after_ms: 45_000,
                control_host_owner: null
              },
              running_workers: [
                {
                  issue_id: 'issue-572',
                  issue_identifier: 'CO-572',
                  state: 'running',
                  display_state: 'In Progress',
                  pid: null,
                  worker_host: 'host-a',
                  session_id: 'run-572',
                  started_at: '2026-05-21T12:26:00.000Z',
                  last_event_at: '2026-05-21T12:31:00.000Z'
                }
              ]
            }
          }
        ],
        activeWorkerRestartQuarantineMs: 10 * 60 * 1000,
        now: '2026-05-21T12:33:00.000Z'
      })
    ).toEqual({
      healthy: true,
      reason: 'active_worker_restart_quarantine',
      message:
        'co-status reported restart_required=true for the same provider refresh stuck series already restarted at 2026-05-21T12:31:45.000Z; 1 active provider worker(s) remain visible, so supervision is quarantining repeated restart churn while retaining restart_required in co-status.'
    });
  });

  it('keeps provider refresh restart_required unhealthy when the same worker series still has free capacity', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          counts: {
            running: 2,
            retrying: 0,
            max_allowed: 3
          },
          running: [
            {
              issue_id: 'issue-1',
              issue_identifier: 'CO-217',
              state: 'in_progress',
              display_state: 'In Progress',
              pid: '555',
              started_at: '2026-04-18T20:10:00.000Z'
            },
            {
              issue_id: 'issue-2',
              issue_identifier: 'CO-241',
              state: 'in_progress',
              display_state: 'In Progress',
              pid: '777',
              started_at: '2026-04-18T20:20:00.000Z'
            }
          ],
          polling: {
            restart_required: true,
            reason: 'provider_refresh_lifecycle_stuck',
            updated_at: '2026-04-18T20:57:22.582Z',
            refresh_phase: 'refresh:claim_reconcile',
            refresh_request_class: 'fresh_dispatch:ready',
            refresh_provider_keys: ['linear:ready-issue'],
            checking: true,
            queued: true,
            operation_elapsed_ms: 48_000,
            stalled_after_ms: 45_000
          }
        },
        {
          restartHistory: [
            {
              requested_at: '2026-04-18T20:56:00.000Z',
              reason: 'restart_required',
              message: 'launchd restart requested',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: {
                counts: {
                  running: 2,
                  retrying: 0,
                  max_allowed: 3
                },
                polling: {
                  updated_at: '2026-04-18T20:55:45.000Z',
                  checking: true,
                  queued: true,
                  stuck: true,
                  restart_required: true,
                  reason: 'provider_refresh_lifecycle_stuck',
                  last_error: 'provider_refresh_lifecycle_stuck',
                  refresh_phase: 'refresh:claim_reconcile',
                  refresh_request_class: 'fresh_dispatch:ready',
                  refresh_provider_keys: ['linear:ready-issue'],
                  operation_elapsed_ms: 46_000,
                  stalled_after_ms: 45_000,
                  control_host_owner: null
                },
                running_workers: [
                  {
                    issue_id: 'issue-1',
                    issue_identifier: 'CO-217',
                    state: 'in_progress',
                    display_state: 'In Progress',
                    pid: '555',
                    worker_host: null,
                    session_id: null,
                    started_at: '2026-04-18T20:10:00.000Z',
                    last_event_at: null
                  },
                  {
                    issue_id: 'issue-2',
                    issue_identifier: 'CO-241',
                    state: 'in_progress',
                    display_state: 'In Progress',
                    pid: '777',
                    worker_host: null,
                    session_id: null,
                    started_at: '2026-04-18T20:20:00.000Z',
                    last_event_at: null
                  }
                ]
              }
            }
          ],
          activeWorkerRestartQuarantineMs: 10 * 60 * 1000,
          now: '2026-04-18T20:58:00.000Z'
        }
      )
    ).toEqual({
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.'
    });
  });

  it('keeps repeated active-worker quarantine when retry reservations consume the remaining capacity', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          counts: {
            running: 2,
            retrying: 1,
            max_allowed: 3
          },
          running: [
            {
              issue_identifier: 'CO-217'
            },
            {
              issue_identifier: 'CO-241'
            }
          ],
          polling: {
            restart_required: true,
            reason: 'provider_refresh_lifecycle_stuck'
          }
        },
        {
          restartHistory: [
            {
              requested_at: '2026-04-18T20:56:00.000Z',
              reason: 'restart_required',
              message: 'launchd restart requested',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: {
                counts: {
                  running: 2,
                  retrying: 1,
                  max_allowed: 3
                },
                polling: {
                  updated_at: '2026-04-18T20:55:45.000Z',
                  checking: true,
                  queued: true,
                  stuck: true,
                  restart_required: true,
                  reason: 'provider_refresh_lifecycle_stuck',
                  last_error: 'provider_refresh_lifecycle_stuck',
                  refresh_phase: 'refresh:claim_reconcile',
                  refresh_request_class: 'fresh_dispatch:ready',
                  refresh_provider_keys: ['linear:ready-issue'],
                  operation_elapsed_ms: 46_000,
                  stalled_after_ms: 45_000,
                  control_host_owner: null
                },
                running_workers: [
                  {
                    issue_id: null,
                    issue_identifier: 'CO-217',
                    state: null,
                    display_state: null,
                    pid: null,
                    worker_host: null,
                    session_id: null,
                    started_at: null,
                    last_event_at: null
                  },
                  {
                    issue_id: null,
                    issue_identifier: 'CO-241',
                    state: null,
                    display_state: null,
                    pid: null,
                    worker_host: null,
                    session_id: null,
                    started_at: null,
                    last_event_at: null
                  }
                ]
              }
            }
          ],
          activeWorkerRestartQuarantineMs: 10 * 60 * 1000,
          now: '2026-04-18T20:58:00.000Z'
        }
      )
    ).toEqual({
      healthy: true,
      reason: 'active_worker_restart_quarantine',
      message:
        'co-status reported restart_required=true for the same provider refresh stuck series already restarted at 2026-04-18T20:56:00.000Z; 2 active provider worker(s) remain visible, so supervision is quarantining repeated restart churn while retaining restart_required in co-status.'
    });
  });

  it('preserves the unhealthy streak while active-worker restart churn is quarantined', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      unhealthyThreshold: 3
    });
    const priorState = buildInitialControlHostSupervisionState({
      config,
      updatedAt: '2026-04-14T05:06:30.000Z',
      status: 'restart_required',
      restartHistory: [
        {
          requested_at: '2026-04-14T05:00:30.000Z',
          reason: 'restart_required',
          message: 'older unrelated launchd restart requested.',
          consecutive_unhealthy_samples: 8,
          child_pid: 1200,
          diagnostic: null
        },
        {
          requested_at: '2026-04-14T05:06:30.000Z',
          reason: 'restart_required',
          message: 'launchd restart requested.',
          consecutive_unhealthy_samples: 3,
          child_pid: 1234,
          diagnostic: null
        }
      ]
    });

    expect(
      resolveControlHostSupervisionQuarantineUnhealthySamples({
        currentConsecutiveUnhealthySamples: 0,
        priorState,
        config
      })
    ).toBe(3);
    expect(
      resolveControlHostSupervisionQuarantineUnhealthySamples({
        currentConsecutiveUnhealthySamples: 4,
        priorState,
        config
      })
    ).toBe(4);
  });

  it('keeps provider refresh restart_required unhealthy after a newer unrelated restart record', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          counts: {
            running: 1,
            retrying: 0
          },
          running: [
            {
              issue_id: 'issue-1',
              issue_identifier: 'CO-207',
              state: 'in_progress',
              display_state: 'In Progress',
              pid: '555',
              started_at: '2026-04-14T05:00:00.000Z'
            }
          ],
          polling: {
            restart_required: true,
            reason: 'provider_refresh_lifecycle_stuck',
            updated_at: '2026-04-14T05:07:38.000Z',
            refresh_phase: 'refresh:fresh_dispatch',
            refresh_request_class: 'fresh_dispatch:ready',
            refresh_provider_keys: ['linear:issue-2'],
            checking: true,
            queued: true,
            operation_elapsed_ms: 47_000,
            stalled_after_ms: 45_000
          }
        },
        {
          restartHistory: [
            {
              requested_at: '2026-04-14T05:05:30.000Z',
              reason: 'restart_required',
              message: 'launchd restart requested',
              consecutive_unhealthy_samples: 3,
              child_pid: 4001,
              diagnostic: {
                counts: {
                  running: 1,
                  retrying: 0
                },
                polling: {
                  updated_at: '2026-04-14T05:05:20.000Z',
                  checking: true,
                  queued: true,
                  stuck: true,
                  restart_required: true,
                  reason: 'provider_refresh_lifecycle_stuck',
                  last_error: 'provider_refresh_lifecycle_stuck',
                  refresh_phase: 'refresh:claim_issue_by_id_reconcile',
                  refresh_request_class: 'claim_issue_by_id:running',
                  refresh_provider_keys: ['linear:issue-1'],
                  operation_elapsed_ms: 46_000,
                  stalled_after_ms: 45_000,
                  control_host_owner: null
                },
                running_workers: [
                  {
                    issue_id: 'issue-1',
                    issue_identifier: 'CO-207',
                    state: 'in_progress',
                    display_state: 'In Progress',
                    pid: '555',
                    worker_host: null,
                    session_id: null,
                    started_at: '2026-04-14T05:00:00.000Z',
                    last_event_at: null
                  }
                ]
              }
            },
            {
              requested_at: '2026-04-14T05:06:30.000Z',
              reason: 'restart_required',
              message: 'launchd restart requested',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: {
                counts: {
                  running: 1,
                  retrying: 0
                },
                polling: {
                  updated_at: '2026-04-14T05:06:20.000Z',
                  checking: true,
                  queued: true,
                  stuck: true,
                  restart_required: true,
                  reason: 'provider_refresh_lifecycle_stuck',
                  last_error: 'provider_refresh_lifecycle_stuck',
                  refresh_phase: 'refresh:fresh_dispatch',
                  refresh_request_class: 'fresh_dispatch:ready',
                  refresh_provider_keys: ['linear:issue-2'],
                  operation_elapsed_ms: 46_000,
                  stalled_after_ms: 45_000,
                  control_host_owner: null
                },
                running_workers: [
                  {
                    issue_id: 'issue-2',
                    issue_identifier: 'CO-210',
                    state: 'in_progress',
                    display_state: 'In Progress',
                    pid: '777',
                    worker_host: null,
                    session_id: null,
                    started_at: '2026-04-14T05:01:00.000Z',
                    last_event_at: null
                  }
                ]
              }
            }
          ],
          activeWorkerRestartQuarantineMs: 10 * 60 * 1000,
          now: '2026-04-14T05:07:45.000Z'
        }
      )
    ).toEqual({
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.'
    });
  });

  it('does not quarantine a new restart_required reason because of a retained provider-refresh last_error', () => {
    const diagnostic = buildProbeTimeoutDiagnosticFixture();
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          counts: diagnostic.counts,
          running: diagnostic.running_workers,
          polling: {
            ...diagnostic.polling,
            restart_required: true,
            reason: 'provider_poll_lifecycle_stuck',
            last_error: 'provider_refresh_lifecycle_stuck',
            updated_at: '2026-04-14T05:07:38.000Z',
            refresh_phase: 'poll:issue_snapshot',
            refresh_request_class: 'poll:issues',
            checking: true,
            queued: true,
            operation_elapsed_ms: 47_000,
            stalled_after_ms: 45_000
          }
        },
        {
          restartHistory: [
            {
              requested_at: '2026-04-14T05:06:30.000Z',
              reason: 'restart_required',
              message: 'launchd restart requested',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic
            }
          ],
          activeWorkerRestartQuarantineMs: 10 * 60 * 1000,
          now: '2026-04-14T05:07:45.000Z'
        }
      )
    ).toEqual({
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.'
    });
  });

  it('keeps provider refresh restart_required unhealthy when the active worker series changes', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          counts: {
            running: 1,
            retrying: 0
          },
          running: [
            {
              issue_id: 'issue-2',
              issue_identifier: 'CO-210',
              state: 'in_progress',
              display_state: 'In Progress',
              pid: '888',
              started_at: '2026-04-14T05:00:00.000Z'
            }
          ],
          polling: {
            restart_required: true,
            reason: 'provider_refresh_lifecycle_stuck',
            updated_at: '2026-04-14T05:07:38.000Z',
            refresh_phase: 'refresh:fresh_dispatch',
            refresh_request_class: 'fresh_dispatch:ready',
            refresh_provider_keys: ['linear:issue-2'],
            checking: true,
            queued: true,
            operation_elapsed_ms: 47_000,
            stalled_after_ms: 45_000
          }
        },
        {
          restartHistory: [
            {
              requested_at: '2026-04-14T05:06:30.000Z',
              reason: 'restart_required',
              message: 'launchd restart requested',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: {
                counts: {
                  running: 1,
                  retrying: 0
                },
                polling: {
                  updated_at: '2026-04-14T05:06:20.000Z',
                  checking: true,
                  queued: true,
                  stuck: true,
                  restart_required: true,
                  reason: 'provider_refresh_lifecycle_stuck',
                  last_error: 'provider_refresh_lifecycle_stuck',
                  refresh_phase: 'refresh:claim_issue_by_id_reconcile',
                  refresh_request_class: 'claim_issue_by_id:running',
                  refresh_provider_keys: ['linear:issue-1'],
                  operation_elapsed_ms: 46_000,
                  stalled_after_ms: 45_000,
                  control_host_owner: null
                },
                running_workers: [
                  {
                    issue_id: 'issue-1',
                    issue_identifier: 'CO-207',
                    state: 'in_progress',
                    display_state: 'In Progress',
                    pid: '555',
                    worker_host: null,
                    session_id: null,
                    started_at: '2026-04-14T05:00:00.000Z',
                    last_event_at: null
                  }
                ]
              }
            }
          ],
          activeWorkerRestartQuarantineMs: 10 * 60 * 1000,
          now: '2026-04-14T05:07:45.000Z'
        }
      )
    ).toEqual({
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.'
    });
  });

  it('keeps provider refresh restart_required unhealthy when no active workers remain visible', () => {
    expect(
      evaluateControlHostSupervisionHealthPayload(
        {
          counts: {
            running: 0,
            retrying: 0
          },
          running: [],
          polling: {
            restart_required: true,
            reason: 'provider_refresh_lifecycle_stuck',
            updated_at: '2026-04-14T05:07:38.000Z',
            refresh_phase: 'refresh:claim_issue_by_id_reconcile',
            refresh_request_class: 'claim_issue_by_id:running',
            refresh_provider_keys: ['linear:issue-1'],
            checking: true,
            queued: true,
            operation_elapsed_ms: 47_000,
            stalled_after_ms: 45_000
          }
        },
        {
          restartHistory: [
            {
              requested_at: '2026-04-14T05:06:30.000Z',
              reason: 'restart_required',
              message: 'launchd restart requested',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: {
                counts: {
                  running: 1,
                  retrying: 0
                },
                polling: {
                  updated_at: '2026-04-14T05:06:20.000Z',
                  checking: true,
                  queued: true,
                  stuck: true,
                  restart_required: true,
                  reason: 'provider_refresh_lifecycle_stuck',
                  last_error: 'provider_refresh_lifecycle_stuck',
                  refresh_phase: 'refresh:claim_issue_by_id_reconcile',
                  refresh_request_class: 'claim_issue_by_id:running',
                  refresh_provider_keys: ['linear:issue-1'],
                  operation_elapsed_ms: 46_000,
                  stalled_after_ms: 45_000,
                  control_host_owner: null
                },
                running_workers: [
                  {
                    issue_id: 'issue-1',
                    issue_identifier: 'CO-207',
                    state: 'in_progress',
                    display_state: 'In Progress',
                    pid: '555',
                    worker_host: null,
                    session_id: null,
                    started_at: '2026-04-14T05:00:00.000Z',
                    last_event_at: null
                  }
                ]
              }
            }
          ],
          activeWorkerRestartQuarantineMs: 10 * 60 * 1000,
          now: '2026-04-14T05:07:45.000Z'
        }
      )
    ).toEqual({
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.'
    });
  });

  it('treats missing polling state as healthy until restart_required is explicit', () => {
    expect(evaluateControlHostSupervisionHealthPayload({})).toEqual({
      healthy: true,
      reason: 'ok',
      message: 'co-status payload omitted polling state; treating it as healthy.'
    });
  });

  it('fails closed on degraded machine-status payloads before missing polling is treated as healthy', () => {
    expect(evaluateControlHostSupervisionHealthPayload(buildMachineStatusDegradedPayload())).toEqual({
      healthy: false,
      reason: 'machine_status_degraded',
      message:
        'co-status machine-status degraded (read_timeout after 5000ms): control-host machine-status read timed out after 5000ms.'
    });
  });

  it('parses env file csv values and the none sentinel', () => {
    expect(parseControlHostSupervisionCsv('/env/one, /env/two')).toEqual([
      '/env/one',
      '/env/two'
    ]);
    expect(parseControlHostSupervisionCsv('none')).toEqual([]);
    expect(parseControlHostSupervisionCsv('-')).toEqual([]);
    expect(parseControlHostSupervisionCsv('   ')).toBeNull();
  });

  it('rejects supervision labels that contain path separators', () => {
    expect(() =>
      resolveControlHostSupervisionPaths({
        homeDir: '/Users/tester',
        label: '../../../tmp/agent'
      })
    ).toThrow(
      'control-host supervision label may only contain letters, numbers, dots, underscores, and hyphens.'
    );
  });

  it('rejects supervision labels whose derived slug would be dot-only', () => {
    expect(() =>
      resolveControlHostSupervisionPaths({
        homeDir: '/Users/tester',
        label: '..'
      })
    ).toThrow('control-host supervision label may not resolve to "." or "..".');
  });

  it('rejects blank env file entries before resolving paths', () => {
    expect(() =>
      buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: '/repo/workspace',
        envFiles: ['   ']
      })
    ).toThrow('env file entry at index 0 must be non-empty.');
  });

  it('rejects timer-backed settings that exceed Node timeout limits', () => {
    const tooLarge = 2_147_484;

    expect(() =>
      buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: '/repo/workspace',
        healthIntervalSeconds: tooLarge
      })
    ).toThrow('health interval must be <= 2147483 seconds to stay within Node timer limits.');
    expect(() =>
      buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: '/repo/workspace',
        killTimeoutSeconds: tooLarge
      })
    ).toThrow('kill timeout must be <= 2147483 seconds to stay within Node timer limits.');
  });
});

describe('controlHostSupervision shell helpers', () => {
  it('formats status output with launchctl summary and restart reason', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);
    const payload = buildControlHostSupervisionStatusPayload({
      resolved: {
        label: config.label,
        paths: config.paths,
        config
      },
      serviceTarget,
      state: {
        version: 1,
        status: 'restart_required',
        updated_at: '2026-04-09T09:00:00.000Z',
        label: config.label,
        repo_root: config.repoRoot,
        service_target: serviceTarget,
        child_pid: null,
        last_started_at: '2026-04-09T08:30:00.000Z',
        last_exit_at: '2026-04-09T09:00:00.000Z',
        last_exit_code: 75,
        last_signal: null,
        last_health_check_at: '2026-04-09T08:59:30.000Z',
        last_health_status: 'restart_required',
        consecutive_unhealthy_samples: 3,
        restart_count: 2,
        unhealthy_threshold: 3,
        health_interval_seconds: 30,
        last_restart_reason: 'restart_required',
        last_restart_requested_at: '2026-04-09T09:00:00.000Z',
        message: 'launchd restart requested'
      },
      launchctl: {
        exitCode: 0,
        stdout: `${serviceTarget} = {\n\tactive count = 1\n}\n`,
        stderr: ''
      },
      launchAgent: {
        exists: true,
        program_arguments: [
          config.nodePath,
          config.cliEntrypoint,
          'control-host',
          'supervise',
          'run',
          '--config',
          config.paths.configPath
        ],
        working_directory: config.repoRoot,
        detected_program: config.nodePath,
        classification: 'managed_supervision'
      }
    });

    expect(payload.service.loaded).toBe(true);
    expect(payload.service.summary).toBe(`${serviceTarget} = {`);
    expect(payload.rollout).toEqual({
      mode: 'managed_supervision',
      migration_required: false,
      summary: 'LaunchAgent matches the stored managed supervision config.'
    });

    const rendered = formatControlHostSupervisionStatus(payload);
    expect(rendered).toContain('Control-host supervision: installed');
    expect(rendered).toContain('Rollout: managed_supervision');
    expect(rendered).toContain(`Service target: ${serviceTarget}`);
    expect(rendered).toContain(`CLI entrypoint: ${config.cliEntrypoint}`);
    expect(rendered).toContain('Configured runtime freshness:');
    expect(rendered).toContain('Supervised child pid: none recorded');
    expect(rendered).toContain('Last restart reason: restart_required');
    expect(rendered).toContain(`launchctl: ${serviceTarget} = {`);
  });

  it('reconciles stale launchctl and persisted restart-required state against healthy live host truth', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);
    const persistedState = {
      version: 1 as const,
      status: 'restart_required',
      updated_at: '2026-04-22T07:31:39.652Z',
      label: config.label,
      repo_root: config.repoRoot,
      service_target: serviceTarget,
      child_pid: 4321,
      last_started_at: '2026-04-22T07:20:00.000Z',
      last_exit_at: '2026-04-22T07:31:39.652Z',
      last_exit_code: 75,
      last_signal: null,
      last_health_check_at: '2026-04-22T07:31:39.652Z',
      last_health_status: 'probe_timeout',
      consecutive_unhealthy_samples: 3,
      restart_count: 2,
      unhealthy_threshold: 3,
      health_interval_seconds: 30,
      last_restart_reason: 'probe_timeout',
      last_restart_requested_at: '2026-04-22T07:31:39.652Z',
      message: 'co-status probe timed out after 5s.'
    };
    const liveHost = {
      checked_at: '2026-04-22T07:38:13.527Z',
      healthy: true,
      source: 'co_status' as const,
      reason: 'ok',
      message: 'co-status reported a healthy polling state.',
      stale_launchctl_metadata: false,
      stale_persisted_state: false,
      co_status: {
        healthy: true,
        reason: 'ok',
        message: 'co-status reported a healthy polling state.',
        diagnostic: null
      },
      freshness_gauge: null
    };

    expect(resolveEffectiveControlHostSupervisionState(persistedState, liveHost)).toMatchObject({
      status: 'healthy',
      last_health_status: 'ok',
      consecutive_unhealthy_samples: 0
    });

    const payload = buildControlHostSupervisionStatusPayload({
      resolved: {
        label: config.label,
        paths: config.paths,
        config
      },
      serviceTarget,
      state: persistedState,
      launchctl: {
        exitCode: 113,
        stdout: '',
        stderr: 'Bad request'
      },
      launchAgent: {
        exists: true,
        program_arguments: [
          config.nodePath,
          config.cliEntrypoint,
          'control-host',
          'supervise',
          'run',
          '--config',
          config.paths.configPath
        ],
        working_directory: config.repoRoot,
        detected_program: config.nodePath,
        classification: 'managed_supervision'
      },
      liveHost
    });

    expect(payload.service).toMatchObject({
      loaded: true,
      loaded_source: 'live_host',
      launchctl_loaded: false,
      stale_launchctl_metadata: true
    });
    expect(payload.state).toMatchObject({
      status: 'healthy',
      last_health_status: 'ok',
      consecutive_unhealthy_samples: 0
    });
    expect(payload.persisted_state).toMatchObject({
      status: 'restart_required',
      last_health_status: 'probe_timeout'
    });
    expect(payload.live_host).toMatchObject({
      healthy: true,
      stale_launchctl_metadata: true,
      stale_persisted_state: true
    });
    expect(payload.rollout).toEqual({
      mode: 'managed_supervision',
      migration_required: false,
      summary:
        'LaunchAgent matches the stored managed supervision config; launchctl metadata appears stale because live host evidence remains healthy.'
    });

    const rendered = formatControlHostSupervisionStatus(payload);
    expect(rendered).toContain('Service loaded: yes');
    expect(rendered).toContain(
      'launchctl loaded: no (stale metadata; live host evidence is healthier)'
    );
    expect(rendered).toContain('State status: healthy');
    expect(rendered).toContain('Persisted state status: restart_required');
    expect(rendered).toContain('Persisted last health: probe_timeout (3/3)');
    expect(rendered).toContain('Live host: healthy via co-status');
  });

  it('keeps probe-timeout quarantine live health mapped to quarantined', () => {
    const persistedState = {
      version: 1 as const,
      status: 'quarantined',
      updated_at: '2026-04-22T07:31:39.652Z',
      label: 'com.example.control-host',
      repo_root: '/repo/CO',
      service_target: 'gui/501/com.example.control-host',
      child_pid: 4321,
      last_started_at: '2026-04-22T07:20:00.000Z',
      last_exit_at: null,
      last_exit_code: null,
      last_signal: null,
      last_health_check_at: '2026-04-22T07:31:39.652Z',
      last_health_status: 'active_worker_probe_timeout_quarantine',
      consecutive_unhealthy_samples: 3,
      restart_count: 2,
      unhealthy_threshold: 3,
      health_interval_seconds: 30,
      last_restart_reason: 'probe_timeout',
      last_restart_requested_at: '2026-04-22T07:31:39.652Z',
      message: 'The active worker still appears healthy despite probe timeout.'
    };
    const liveHost = {
      checked_at: '2026-04-22T07:38:13.527Z',
      healthy: true,
      source: 'co_status' as const,
      reason: 'active_worker_probe_timeout_quarantine',
      message: 'The active worker still appears healthy despite probe timeout.',
      stale_launchctl_metadata: false,
      stale_persisted_state: false,
      co_status: {
        healthy: true,
        reason: 'active_worker_probe_timeout_quarantine',
        message: 'The active worker still appears healthy despite probe timeout.',
        diagnostic: null
      },
      freshness_gauge: null
    };

    expect(resolveEffectiveControlHostSupervisionState(persistedState, liveHost)).toMatchObject({
      status: 'quarantined',
      last_health_status: 'active_worker_probe_timeout_quarantine',
      consecutive_unhealthy_samples: 3
    });
  });

  it('strips workspace-scoped orchestrator roots from provider override environments when requested', () => {
    const sanitized = sanitizeProviderOverrideEnv(
      {
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
        CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host',
        CODEX_ORCHESTRATOR_ROOT: '/Users/tester/Code/CO/.workspaces/linear-issue',
        CODEX_ORCHESTRATOR_RUNS_DIR: '/Users/tester/Code/CO/.workspaces/linear-issue/.runs',
        CODEX_ORCHESTRATOR_OUT_DIR: '/Users/tester/Code/CO/.workspaces/linear-issue/out',
        CODEX_ORCHESTRATOR_PACKAGE_ROOT: '/Users/tester/Code/CO',
        CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT: '/Users/tester/Code/CO'
      },
      {
        stripWorkspaceArtifactEnv: true
      }
    );

    expect(sanitized.CODEX_ORCHESTRATOR_ROOT).toBeUndefined();
    expect(sanitized.CODEX_ORCHESTRATOR_RUNS_DIR).toBeUndefined();
    expect(sanitized.CODEX_ORCHESTRATOR_OUT_DIR).toBeUndefined();
    expect(sanitized.CODEX_ORCHESTRATOR_PACKAGE_ROOT).toBeUndefined();
  });

  it('falls back to healthy freshness artifacts when the co-status probe cannot execute cleanly', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);
    const expectedArtifactRoot = dirname(
      resolveControlHostSupervisionProviderIntakeStatePath(config, {})
    );
    const persistedState = {
      version: 1 as const,
      status: 'restart_required',
      updated_at: '2026-04-22T07:31:39.652Z',
      label: config.label,
      repo_root: config.repoRoot,
      service_target: serviceTarget,
      child_pid: 4321,
      last_started_at: '2026-04-22T07:20:00.000Z',
      last_exit_at: '2026-04-22T07:31:39.652Z',
      last_exit_code: 75,
      last_signal: null,
      last_health_check_at: '2026-04-22T07:31:39.652Z',
      last_health_status: 'probe_timeout',
      consecutive_unhealthy_samples: 3,
      restart_count: 2,
      unhealthy_threshold: 3,
      health_interval_seconds: 30,
      last_restart_reason: 'probe_timeout',
      last_restart_requested_at: '2026-04-22T07:31:39.652Z',
      message: 'co-status probe timed out after 5s.'
    };
    const freshnessReport = {
      verdict: 'degraded',
      metrics: {
        last_successful_refresh_age_ms: { verdict: 'healthy' },
        active_heartbeat_age_ms: { verdict: 'healthy' },
        polling_health: { verdict: 'healthy', value: 'ok' }
      }
    } as unknown as ProviderControlHostFreshnessGaugeReport;

    expect(hasHealthyLiveProviderControlHostFreshness(freshnessReport)).toBe(true);

    const liveHealth = await inspectControlHostSupervisionLiveHealth(config, persistedState, {
      loadBootstrapEnvironment: async () => ({
        HOME: '/Users/tester',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
        CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host',
        CODEX_ORCHESTRATOR_ROOT: '/Users/tester/Code/CO/.workspaces/linear-issue',
        CODEX_ORCHESTRATOR_RUNS_DIR: '/Users/tester/Code/CO/.workspaces/linear-issue/.runs',
        CODEX_ORCHESTRATOR_OUT_DIR: '/Users/tester/Code/CO/.workspaces/linear-issue/out'
      }),
      probeControlHostHealth: async (_config, env) => {
        expect(env.CODEX_ORCHESTRATOR_ROOT).toBeUndefined();
        expect(env.CODEX_ORCHESTRATOR_RUNS_DIR).toBeUndefined();
        expect(env.CODEX_ORCHESTRATOR_OUT_DIR).toBeUndefined();
        return {
          healthy: false,
          reason: 'probe_failed',
          message: 'ENOENT: no such file or directory',
          diagnostic: null
        };
      },
      evaluateFreshnessGauge: async ({ artifactRoot }) => {
        expect(artifactRoot).toBe(expectedArtifactRoot);
        return freshnessReport;
      }
    });

    expect(liveHealth).toMatchObject({
      healthy: true,
      source: 'co_status+freshness_gauge',
      reason: 'fresh_artifacts'
    });
  });

  it('detects the legacy shim LaunchAgent and marks migration as required', () => {
    const launchAgent = inspectControlHostSupervisionLaunchAgent(
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.kbediako.co.control-host</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/tester/.local/bin/co-control-host-supervisor.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/tester/Code/CO</string>
</dict>
</plist>`,
      null
    );

    expect(launchAgent).toEqual({
      exists: true,
      program_arguments: ['/Users/tester/.local/bin/co-control-host-supervisor.sh'],
      working_directory: '/Users/tester/Code/CO',
      detected_program: '/Users/tester/.local/bin/co-control-host-supervisor.sh',
      classification: 'legacy_shim'
    });
    expect(
      classifyControlHostSupervisionRollout({
        config: null,
        launchAgent,
        serviceLoaded: false
      })
    ).toEqual({
      mode: 'legacy_shim',
      migration_required: true,
      summary: 'LaunchAgent still targets the legacy shim wrapper.'
    });
  });

  it('preserves literal encoded plist entities when decoding string fields', () => {
    const launchAgent = inspectControlHostSupervisionLaunchAgent(
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>ProgramArguments</key>
  <array>
    <string>/tmp/&amp;lt;literal&amp;gt;.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/tmp/&amp;lt;literal&amp;gt;</string>
</dict>
</plist>`,
      null
    );

    expect(launchAgent.detected_program).toBe('/tmp/&lt;literal&gt;.js');
    expect(launchAgent.working_directory).toBe('/tmp/&lt;literal&gt;');
  });

  it('does not report managed rollout when launchctl does not confirm the service is loaded', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);

    const payload = buildControlHostSupervisionStatusPayload({
      resolved: {
        label: config.label,
        paths: config.paths,
        config
      },
      serviceTarget,
      state: null,
      launchctl: {
        exitCode: 113,
        stdout: '',
        stderr: `Could not find service ${serviceTarget} in domain gui/501.`
      },
      launchAgent: {
        exists: true,
        program_arguments: [
          config.nodePath,
          config.cliEntrypoint,
          'control-host',
          'supervise',
          'run',
          '--config',
          config.paths.configPath
        ],
        working_directory: config.repoRoot,
        detected_program: config.nodePath,
        classification: 'managed_supervision'
      }
    });

    expect(payload.service.loaded).toBe(false);
    expect(payload.rollout).toEqual({
      mode: 'mixed',
      migration_required: true,
      summary:
        'Managed LaunchAgent plist exists, but launchctl does not report the managed service target as loaded.'
    });

    const rendered = formatControlHostSupervisionStatus(payload);
    expect(rendered).toContain('Rollout: mixed');
    expect(rendered).toContain('Migration required: yes');
    expect(rendered).toContain('launchctl loaded: no');
  });

  it('rejects integer flags with non-numeric suffixes', () => {
    expect(() => readIntegerFlag({ 'health-interval': '30s' }, 'health-interval')).toThrow(
      '--health-interval must be an integer.'
    );
    expect(() => readIntegerFlag({ 'kill-timeout': '1.5' }, 'kill-timeout')).toThrow(
      '--kill-timeout must be an integer.'
    );
    expect(() => readIntegerFlag({ 'health-interval': true }, 'health-interval')).toThrow(
      '--health-interval requires a value.'
    );
    expect(readIntegerFlag({ 'unhealthy-threshold': '30' }, 'unhealthy-threshold')).toBe(30);
  });

  it('rejects unsupported format values', () => {
    expect(readFormatFlag({ format: 'json' })).toBe('json');
    expect(readFormatFlag({ format: 'text' })).toBe('text');
    expect(() => readFormatFlag({ format: 'yaml' })).toThrow(
      '--format must be either "text" or "json".'
    );
  });

  it('rejects valueless string flags instead of silently falling back to defaults', () => {
    expect(() => readStringFlag({ label: true }, 'label')).toThrow('--label requires a value.');
    expect(() => readStringFlag({ label: '   ' }, 'label')).toThrow(
      '--label requires a value.'
    );
  });

  it('validates the configured shell path during install-time path checks', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/missing/shell'
    });

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async (path) => path !== config.shellPath,
        async () => true,
        async () => true,
        async () => true
      )
    ).rejects.toThrow(
      `Shell executable not found: ${config.shellPath}`
    );
  });

  it('requires node and shell install paths to be executable regular files', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async (path) => path !== config.nodePath,
        async () => true,
        async () => true
      )
    ).rejects.toThrow(`Node executable is not executable: ${config.nodePath}`);

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async (path) => path !== config.shellPath,
        async () => true,
        async () => true
      )
    ).rejects.toThrow(`Shell executable is not executable: ${config.shellPath}`);

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async () => true,
        async () => true,
        async (path) => path !== config.nodePath
      )
    ).rejects.toThrow(`Node executable is not a regular file: ${config.nodePath}`);

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async () => true,
        async () => true,
        async (path) => path !== config.shellPath
      )
    ).rejects.toThrow(`Shell executable is not a regular file: ${config.shellPath}`);
  });

  it('requires the control-host supervision entrypoint to be a regular file', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async () => true,
        async () => true,
        async (path) => path !== config.cliEntrypoint
      )
    ).rejects.toThrow(
      `Control-host supervision entrypoint is not a regular file: ${config.cliEntrypoint}`
    );
  });

  it('requires repo root to be an existing directory during install validation', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    await expect(
      assertControlHostSupervisionInstallPaths(
        config,
        async () => true,
        async () => true,
        async (path) => path !== config.repoRoot
      )
    ).rejects.toThrow(`Control-host supervision repo root is not a directory: ${config.repoRoot}`);
  });

  it('rejects malformed stored config payloads before using label or path fields', () => {
    expect(() =>
      assertStoredControlHostSupervisionConfig('/tmp/invalid-config.json', {
        version: 1,
        paths: {}
      })
    ).toThrow(
      'Invalid control-host supervision config at /tmp/invalid-config.json: missing label.'
    );
  });

  it('rejects stored configs whose explicit config path is not the managed config path', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    expect(() =>
      assertStoredControlHostSupervisionConfig('/tmp/copied-config.json', config)
    ).toThrow(
      `Invalid control-host supervision config at /tmp/copied-config.json: config path must match the managed path ${config.paths.configPath}.`
    );
  });

  it('rejects stored configs whose managed directories do not match the stored home and label', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    expect(() =>
      assertStoredControlHostSupervisionConfig(config.paths.configPath, {
        ...config,
        paths: {
          ...config.paths,
          supportDir: '/tmp/unmanaged-support'
        }
      })
    ).toThrow(
      `Invalid control-host supervision config at ${config.paths.configPath}: paths.supportDir must match the managed path ${config.paths.supportDir}.`
    );
  });

  it('rejects stored config timer and threshold values that exceed the runtime contract', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      shellPath: '/bin/zsh'
    });

    expect(() =>
      assertStoredControlHostSupervisionConfig('/tmp/invalid-config.json', {
        ...config,
        healthIntervalSeconds: 0
      })
    ).toThrow(
      'Invalid control-host supervision config at /tmp/invalid-config.json: invalid healthIntervalSeconds.'
    );

    expect(() =>
      assertStoredControlHostSupervisionConfig('/tmp/invalid-config.json', {
        ...config,
        unhealthyThreshold: 0
      })
    ).toThrow(
      'Invalid control-host supervision config at /tmp/invalid-config.json: invalid unhealthyThreshold.'
    );

    expect(() =>
      assertStoredControlHostSupervisionConfig('/tmp/invalid-config.json', {
        ...config,
        killTimeoutSeconds: CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS + 1
      })
    ).toThrow(
      `Invalid control-host supervision config at /tmp/invalid-config.json: killTimeoutSeconds must be <= ${CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS}.`
    );
  });

  it('rolls back generated install artifacts when launchd registration fails', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-rollback-'));
    const paths = {
      supportDir: join(tempRoot, 'support'),
      configPath: join(tempRoot, 'support', 'config.json'),
      statePath: join(tempRoot, 'support', 'state.json'),
      plistPath: join(tempRoot, 'LaunchAgents', 'com.example.control-host.plist'),
      logsDir: join(tempRoot, 'logs'),
      stdoutLogPath: join(tempRoot, 'logs', 'stdout.log'),
      stderrLogPath: join(tempRoot, 'logs', 'stderr.log')
    };
    const serviceTarget = resolveControlHostSupervisionServiceTarget(
      'com.example.control-host'
    );
    const bootouts: string[] = [];

    try {
      await mkdir(join(tempRoot, 'LaunchAgents'), { recursive: true });
      await mkdir(paths.supportDir, { recursive: true });
      await mkdir(paths.logsDir, { recursive: true });
      await writeFile(paths.plistPath, '<plist/>', 'utf8');
      await writeFile(paths.configPath, '{}', 'utf8');
      await writeFile(paths.statePath, '{}', 'utf8');
      await writeFile(paths.stdoutLogPath, '', 'utf8');
      await writeFile(paths.stderrLogPath, '', 'utf8');

      await rollbackFailedControlHostSupervisionInstall(paths, serviceTarget, {
        bootout: async (target) => {
          bootouts.push(target);
        }
      });

      expect(bootouts).toEqual([serviceTarget]);
      await expect(stat(paths.plistPath)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(paths.supportDir)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(paths.logsDir)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('restores an existing install instead of deleting it after a failed reinstall', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-restore-'));
    const paths = {
      supportDir: join(tempRoot, 'support'),
      configPath: join(tempRoot, 'support', 'config.json'),
      statePath: join(tempRoot, 'support', 'state.json'),
      plistPath: join(tempRoot, 'LaunchAgents', 'com.example.control-host.plist'),
      logsDir: join(tempRoot, 'logs'),
      stdoutLogPath: join(tempRoot, 'logs', 'stdout.log'),
      stderrLogPath: join(tempRoot, 'logs', 'stderr.log')
    };
    const serviceTarget = resolveControlHostSupervisionServiceTarget(
      'com.example.control-host'
    );
    const bootouts: string[] = [];
    const bootstraps: string[][] = [];

    try {
      await mkdir(join(tempRoot, 'LaunchAgents'), { recursive: true });
      await mkdir(paths.supportDir, { recursive: true });
      await writeFile(paths.plistPath, '<plist>old</plist>', 'utf8');
      await writeFile(paths.configPath, '{"version":1,"label":"old"}\n', 'utf8');
      await writeFile(paths.statePath, '{"status":"running"}\n', 'utf8');

      const snapshot = await captureExistingControlHostSupervisionInstall(paths);
      expect(snapshot).not.toBeNull();

      await writeFile(paths.plistPath, '<plist>new</plist>', 'utf8');
      await writeFile(paths.configPath, '{"version":1,"label":"new"}\n', 'utf8');
      await writeFile(paths.statePath, '{"status":"failed"}\n', 'utf8');

      await restoreExistingControlHostSupervisionInstall(snapshot!, serviceTarget, {
        bootout: async (target) => {
          bootouts.push(target);
        },
        bootstrap: async (args) => {
          bootstraps.push(args);
        }
      });

      expect(bootouts).toEqual([serviceTarget]);
      expect(bootstraps).toEqual([
        ['bootstrap', `gui/${process.getuid?.()}`, paths.plistPath]
      ]);
      await expect(readFile(paths.plistPath, 'utf8')).resolves.toBe('<plist>old</plist>');
      await expect(readFile(paths.configPath, 'utf8')).resolves.toBe(
        '{"version":1,"label":"old"}\n'
      );
      await expect(readFile(paths.statePath, 'utf8')).resolves.toBe(
        '{"status":"running"}\n'
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('uninstall cleanup only removes managed supervision directories for the current home', async () => {
    const homeDir = await mkdtemp(join(tmpdir(), 'co-supervision-managed-home-'));
    const managedPaths = resolveControlHostSupervisionPaths({
      homeDir,
      label: 'com.example.control-host'
    });
    const tamperedRoot = await mkdtemp(join(tmpdir(), 'co-supervision-tampered-'));
    const tamperedPath = join(tamperedRoot, 'keep-me');
    const bootouts: string[] = [];

    try {
      await mkdir(join(homeDir, 'Library', 'LaunchAgents'), { recursive: true });
      await mkdir(managedPaths.supportDir, { recursive: true });
      await mkdir(managedPaths.logsDir, { recursive: true });
      await writeFile(managedPaths.plistPath, '<plist/>', 'utf8');
      await writeFile(managedPaths.configPath, '{}', 'utf8');
      await writeFile(managedPaths.statePath, '{}', 'utf8');
      await writeFile(managedPaths.stdoutLogPath, '', 'utf8');
      await writeFile(managedPaths.stderrLogPath, '', 'utf8');

      await mkdir(tamperedPath, { recursive: true });
      await writeFile(join(tamperedPath, 'sentinel.txt'), 'keep', 'utf8');

      const removedPaths = await removeInstalledControlHostSupervisionArtifacts(
        {
          label: 'com.example.control-host',
          paths: managedPaths
        },
        {
          bootout: async (target) => {
            bootouts.push(target);
          }
        }
      );

      expect(removedPaths).toEqual(managedPaths);
      expect(bootouts).toEqual([
        resolveControlHostSupervisionServiceTarget('com.example.control-host')
      ]);
      await expect(stat(managedPaths.plistPath)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(managedPaths.supportDir)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(managedPaths.logsDir)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(tamperedPath)).resolves.toBeTruthy();
    } finally {
      await rm(homeDir, { recursive: true, force: true });
      await rm(tamperedRoot, { recursive: true, force: true });
    }
  });

  it('uninstall cleanup uses the resolved install paths instead of recomputing from HOME', async () => {
    const installedHome = await mkdtemp(join(tmpdir(), 'co-supervision-installed-home-'));
    const currentHome = await mkdtemp(join(tmpdir(), 'co-supervision-current-home-'));
    const bootouts: string[] = [];
    const installedPaths = resolveControlHostSupervisionPaths({
      homeDir: installedHome,
      label: 'com.example.control-host'
    });
    const currentHomePaths = resolveControlHostSupervisionPaths({
      homeDir: currentHome,
      label: 'com.example.control-host'
    });

    try {
      await mkdir(join(installedHome, 'Library', 'LaunchAgents'), { recursive: true });
      await mkdir(installedPaths.supportDir, { recursive: true });
      await mkdir(installedPaths.logsDir, { recursive: true });
      await writeFile(installedPaths.plistPath, '<plist/>', 'utf8');
      await writeFile(installedPaths.configPath, '{}', 'utf8');
      await writeFile(installedPaths.statePath, '{}', 'utf8');
      await writeFile(installedPaths.stdoutLogPath, '', 'utf8');
      await writeFile(installedPaths.stderrLogPath, '', 'utf8');

      await mkdir(join(currentHome, 'Library', 'LaunchAgents'), { recursive: true });
      await mkdir(currentHomePaths.supportDir, { recursive: true });
      await mkdir(currentHomePaths.logsDir, { recursive: true });
      await writeFile(currentHomePaths.plistPath, '<plist/>', 'utf8');
      await writeFile(currentHomePaths.configPath, '{}', 'utf8');
      await writeFile(currentHomePaths.statePath, '{}', 'utf8');
      await writeFile(currentHomePaths.stdoutLogPath, '', 'utf8');
      await writeFile(currentHomePaths.stderrLogPath, '', 'utf8');

      const removedPaths = await removeInstalledControlHostSupervisionArtifacts(
        {
          label: 'com.example.control-host',
          paths: installedPaths
        },
        {
          bootout: async (target) => {
            bootouts.push(target);
          }
        }
      );

      expect(removedPaths).toEqual(installedPaths);
      expect(bootouts).toEqual([
        resolveControlHostSupervisionServiceTarget('com.example.control-host')
      ]);
      await expect(stat(installedPaths.plistPath)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(installedPaths.supportDir)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(installedPaths.logsDir)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(currentHomePaths.plistPath)).resolves.toBeTruthy();
      await expect(stat(currentHomePaths.supportDir)).resolves.toBeTruthy();
      await expect(stat(currentHomePaths.logsDir)).resolves.toBeTruthy();
    } finally {
      await rm(installedHome, { recursive: true, force: true });
      await rm(currentHome, { recursive: true, force: true });
    }
  });

  it('bounds co-status probe timeouts and surfaces timeout health state', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      healthIntervalSeconds: 5
    });
    let observedTimeoutMs: number | undefined;
    let observedArgs: string[] = [];

    const result = await probeControlHostHealth(
      config,
      {},
      {},
      async (
        _command: string,
        args: string[],
        options?: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
      ) => {
        observedArgs = args;
        observedTimeoutMs = options?.timeoutMs;
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'command timed out after 5000ms',
          timedOut: true
        };
      }
    );

    expect(observedTimeoutMs).toBe(resolveControlHostSupervisionProbeTimeoutMs(5));
    expect(observedArgs).toEqual(
      expect.arrayContaining([
        '--machine-status',
        '--machine-status-max-age-ms',
        '15000'
      ])
    );
    expect(result).toMatchObject({
      healthy: false,
      reason: 'probe_timeout',
      message: 'co-status probe timed out after 35s.',
      diagnostic: null
    });
    expect(result.probeDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('retains provider-intake diagnostics when the co-status probe times out', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-timeout-diagnostic-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, {});

      const result = await probeControlHostHealth(
        config,
        {},
        {},
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'command timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result).toMatchObject({
        healthy: false,
        reason: 'probe_timeout',
        message: 'co-status probe timed out after 35s.',
        diagnostic: {
          counts: {
            running: 1,
            retrying: null,
            max_allowed: null
          },
          polling: {
            checking: true,
            queued: true,
            stuck: true,
            restart_required: true,
            reason: 'provider_refresh_lifecycle_stuck',
            refresh_phase: 'refresh:claim_issue_by_id_reconcile',
            refresh_request_class: 'claim_issue_by_id:running',
            refresh_provider_keys: ['linear:issue-1'],
            operation_elapsed_ms: 47_000,
            stalled_after_ms: 45_000
          },
          running_workers: [
            {
              issue_id: 'issue-1',
              issue_identifier: 'CO-225',
              state: 'running',
              display_state: 'In Progress',
              worker_host: 'host-a',
              session_id: 'run-1',
              started_at: '2026-04-21T07:00:00.000Z',
              last_event_at: '2026-04-21T07:21:00.000Z'
            }
          ]
        }
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('does not fail closed solely from dashboard probe timeout when local polling is fresh zero-WIP', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-zero-wip-dashboard-timeout-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      const progressUpdatedAt = new Date(Date.now() - 1_000).toISOString();
      await writeProviderIntakeStateFixture(config, {
        polling: buildFreshZeroWipPollingFixture({
          updated_at: progressUpdatedAt,
          progress_updated_at: progressUpdatedAt
        }),
        claims: []
      });

      const result = await probeControlHostHealth(
        config,
        {},
        {},
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'dashboard /ui/data.json timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result.healthy).toBe(true);
      expect(result.reason).not.toBe('probe_timeout');
      expect(result.reason).not.toBe('probe_failed');
      expect(result.diagnostic?.running_workers).toEqual([]);
      expect(result.diagnostic?.counts).toMatchObject({
        running: 0,
        retrying: null,
        active: 0
      });
      expect(result.diagnostic?.polling).toMatchObject({
        stuck: false,
        restart_required: false
      });
      expect(result.diagnostic?.polling as Record<string, unknown>).toMatchObject({
        progress_updated_at: progressUpdatedAt,
        progress_elapsed_ms: 1_000
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails closed on zero-WIP probe timeout when polling timestamps are stale', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-zero-wip-stale-timeout-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, {
        polling: buildFreshZeroWipPollingFixture({
          updated_at: '2026-04-21T07:00:00.000Z',
          progress_updated_at: '2026-04-21T07:00:00.000Z'
        }),
        claims: []
      });

      const result = await probeControlHostHealth(
        config,
        {},
        {},
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'dashboard /ui/data.json timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result.healthy).toBe(false);
      expect(result.reason).toBe('probe_timeout');
      expect(result.diagnostic?.counts).toMatchObject({
        running: 0,
        active: 0
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails closed on zero-WIP probe timeout when polling progress is stalled', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-zero-wip-stalled-timeout-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, {
        polling: buildFreshZeroWipPollingFixture({
          checking: true,
          refresh_phase: 'refresh:claim_issue_by_id_reconcile',
          refresh_request_class: 'claim_issue_by_id:accepted',
          progress_updated_at: '2026-04-21T07:00:59.000Z',
          progress_elapsed_ms: 20 * 60 * 1_000,
          operation_elapsed_ms: 20 * 60 * 1_000,
          stalled_after_ms: 45_000
        }),
        claims: []
      });

      const result = await probeControlHostHealth(
        config,
        {},
        {},
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'co-status --machine-status timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result).toMatchObject({
        healthy: false,
        reason: 'probe_timeout',
        diagnostic: {
          counts: {
            running: 0,
            active: 0
          },
          polling: {
            checking: true,
            progress_elapsed_ms: 20 * 60 * 1_000,
            stalled_after_ms: 45_000
          },
          running_workers: []
        }
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('classifies machine-status same-endpoint timeout exits as probe timeouts', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-machine-status-exit-timeout-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, {
        polling: buildFreshZeroWipPollingFixture({
          checking: true,
          refresh_phase: 'refresh:claim_issue_by_id_reconcile',
          refresh_request_class: 'claim_issue_by_id:accepted',
          progress_updated_at: '2026-04-21T07:00:59.000Z',
          progress_elapsed_ms: 20 * 60 * 1_000,
          operation_elapsed_ms: 20 * 60 * 1_000,
          stalled_after_ms: 45_000
        }),
        claims: []
      });

      const result = await probeControlHostHealth(
        config,
        {},
        {},
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr:
            'control-host machine-status request timeout after 5000ms. The current resolved /ui/machine-status.json endpoint timed out again after endpoint re-resolution returned the same endpoint/token; this is a same-endpoint current-endpoint timeout.',
          timedOut: false
        })
      );

      expect(result).toMatchObject({
        healthy: false,
        reason: 'probe_timeout',
        diagnostic: {
          counts: {
            running: 0,
            active: 0
          },
          polling: {
            checking: true,
            progress_elapsed_ms: 20 * 60 * 1_000,
            stalled_after_ms: 45_000
          }
        }
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('treats rotated-endpoint machine-status timeout exits as probe failures', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-rotated-machine-status-timeout-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });

      const result = await probeControlHostHealth(
        config,
        {},
        {},
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr:
            'Re-resolving control_endpoint.json succeeded, but the refreshed endpoint is not readable: control-host machine-status request timeout after 5000ms.',
          timedOut: false
        })
      );

      expect(result).toMatchObject({
        healthy: false,
        reason: 'probe_failed',
        diagnostic: null
      });
      expect(result.message).toContain('co-status probe failed:');
      expect(result.message).toContain('refreshed endpoint is not readable');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails closed on probe timeout when provider-intake has active non-running WIP', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-active-accepted-timeout-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, {
        polling: buildFreshZeroWipPollingFixture({
          active_claims: ['linear:issue-1'],
          refresh_phase: 'refresh:claim_issue_by_id_reconcile',
          refresh_request_class: 'claim_issue_by_id:accepted'
        }),
        claims: [
          buildProviderIntakeClaimFixture({
            state: 'accepted',
            run_id: null,
            run_manifest_path: null
          })
        ]
      });

      const result = await probeControlHostHealth(
        config,
        {},
        {},
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'co-status --machine-status timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result).toMatchObject({
        healthy: false,
        reason: 'probe_timeout',
        diagnostic: {
          counts: {
            running: 0,
            active: 1
          },
          running_workers: []
        }
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('keeps true provider stuck fail-closed when the probe returns machine-readable status', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'local-mcp',
      runId: 'control-host',
      healthIntervalSeconds: 5
    });

    const result = await probeControlHostHealth(
      config,
      {},
      {},
      async () => ({
        exitCode: 0,
        stdout: JSON.stringify(buildProbeTimeoutDiagnosticFixture()),
        stderr: '',
        timedOut: false
      })
    );

    expect(result).toMatchObject({
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.',
      diagnostic: {
        counts: {
          running: 1
        },
        polling: {
          stuck: true,
          restart_required: true,
          reason: 'provider_refresh_lifecycle_stuck'
        }
      }
    });
  });

  it('keeps degraded zero-WIP machine-status JSON fail-closed instead of healthy OK', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-degraded-zero-wip-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, {
        polling: buildFreshZeroWipPollingFixture(),
        claims: []
      });

      const result = await probeControlHostHealth(
        config,
        {},
        {},
        async () => ({
          exitCode: 0,
          stdout: JSON.stringify(buildMachineStatusDegradedPayload()),
          stderr: '',
          timedOut: false
        })
      );

      expect(result).toMatchObject({
        healthy: false,
        reason: 'machine_status_degraded',
        diagnostic: {
          counts: {
            running: 0,
            active: 0
          },
          running_workers: []
        }
      });
      expect(result.message).toContain('co-status machine-status degraded (read_timeout after 5000ms)');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('quarantines repeated degraded machine-status timeouts for the same active worker series', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-degraded-active-worker-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, {});
      const restartedAt = '2026-04-21T07:22:30.000Z';

      const result = await probeControlHostHealth(
        config,
        {},
        {
          restartHistory: [
            {
              requested_at: restartedAt,
              reason: 'probe_timeout',
              message: 'co-status probe timed out after 5s.',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: buildProbeTimeoutDiagnosticFixture()
            }
          ],
          now: '2026-04-21T07:23:00.000Z'
        },
        async () => ({
          exitCode: 0,
          stdout: JSON.stringify(buildMachineStatusDegradedPayload()),
          stderr: '',
          timedOut: false
        })
      );

      expect(result.healthy).toBe(true);
      expect(result.reason).toBe('active_worker_probe_timeout_quarantine');
      expect(result.message).toContain(
        `same active provider worker series already restarted at ${restartedAt}`
      );
      expect(result.diagnostic?.running_workers.map((worker) => worker.issue_identifier)).toEqual([
        'CO-225'
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('resolves timeout diagnostics from CODEX_ORCHESTRATOR_ROOT when co-status uses an env root', async () => {
    const configRoot = await mkdtemp(join(tmpdir(), 'co-supervision-config-root-'));
    const envRoot = await mkdtemp(join(tmpdir(), 'co-supervision-env-root-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: configRoot,
        repoRoot: configRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      const env = { CODEX_ORCHESTRATOR_ROOT: envRoot };
      const statePath = resolveControlHostSupervisionProviderIntakeStatePath(config, env);
      expect(statePath.startsWith(join(envRoot, '.runs'))).toBe(true);
      await writeProviderIntakeStateFixture(config, {}, env);

      const result = await probeControlHostHealth(
        config,
        env,
        {},
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'command timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result.reason).toBe('probe_timeout');
      expect(result.diagnostic?.running_workers.map((worker) => worker.issue_identifier)).toEqual([
        'CO-225'
      ]);
    } finally {
      await rm(configRoot, { recursive: true, force: true });
      await rm(envRoot, { recursive: true, force: true });
    }
  });

  it('quarantines repeated same-worker probe timeout churn after one fail-closed timeout restart', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-timeout-quarantine-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, {});
      const restartedAt = '2026-04-21T07:22:30.000Z';

      const result = await probeControlHostHealth(
        config,
        {},
        {
          restartHistory: [
            {
              requested_at: restartedAt,
              reason: 'probe_timeout',
              message: 'co-status probe timed out after 5s.',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: buildProbeTimeoutDiagnosticFixture()
            }
          ],
          now: '2026-04-21T07:23:00.000Z'
        },
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'command timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result.healthy).toBe(true);
      expect(result.reason).toBe('active_worker_probe_timeout_quarantine');
      expect(result.message).toContain(
        `same active provider worker series already restarted at ${restartedAt}`
      );
      expect(result.diagnostic?.running_workers.map((worker) => worker.issue_identifier)).toEqual([
        'CO-225'
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('quarantines repeated same-endpoint machine-status timeout churn after one fail-closed timeout restart', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-same-endpoint-timeout-quarantine-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, {});
      const restartedAt = '2026-04-21T07:22:30.000Z';

      const result = await probeControlHostHealth(
        config,
        {},
        {
          restartHistory: [
            {
              requested_at: restartedAt,
              reason: 'probe_timeout',
              message: 'control-host machine-status request timeout after 5000ms.',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: buildProbeTimeoutDiagnosticFixture()
            }
          ],
          now: '2026-04-21T07:23:00.000Z'
        },
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr:
            'control-host machine-status request timeout after 5000ms. The current resolved /ui/machine-status.json endpoint timed out again after endpoint re-resolution returned the same endpoint/token; this is a same-endpoint current-endpoint timeout.',
          timedOut: false
        })
      );

      expect(result.healthy).toBe(true);
      expect(result.reason).toBe('active_worker_probe_timeout_quarantine');
      expect(result.message).toContain(
        `same active provider worker series already restarted at ${restartedAt}`
      );
      expect(result.diagnostic?.polling?.reason).toBe('provider_refresh_lifecycle_stuck');
      expect(result.diagnostic?.running_workers.map((worker) => worker.issue_identifier)).toEqual([
        'CO-225'
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('quarantines repeated probe timeout churn while provider refresh is active before restart_required', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-timeout-active-refresh-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      const activeRefreshPolling = {
        ...buildProbeTimeoutPollingFixture(),
        stuck: false,
        restart_required: false,
        reason: null,
        last_error: 'refresh request timeout',
        refresh_phase: 'refresh:rehydrate',
        refresh_request_class: 'rehydrate',
        operation_elapsed_ms: 14_000,
        stalled_after_ms: 45_000
      };
      const previousActiveRefreshPolling = {
        ...activeRefreshPolling,
        last_error: 'fetch failed'
      };
      const recurrenceWorkers = ['CO-351', 'CO-352', 'CO-355'].map((issueIdentifier) => ({
        issue_id: `issue-${issueIdentifier.toLowerCase()}`,
        issue_identifier: issueIdentifier,
        state: 'running',
        display_state: 'In Progress',
        pid: null,
        worker_host: 'host-a',
        session_id: `run-${issueIdentifier.toLowerCase()}`,
        started_at: '2026-04-21T07:00:00.000Z',
        last_event_at: '2026-04-21T07:21:00.000Z'
      }));
      await writeProviderIntakeStateFixture(config, {
        polling: activeRefreshPolling,
        claims: recurrenceWorkers.map((worker) =>
          buildProviderIntakeClaimFixture({
            provider_key: `linear:${worker.issue_id}`,
            issue_id: worker.issue_id,
            issue_identifier: worker.issue_identifier,
            issue_title: `${worker.issue_identifier} recurrent refresh worker`,
            task_id: `linear-${worker.issue_id}`,
            run_id: worker.session_id,
            worker_host: worker.worker_host,
            launch_started_at: worker.started_at,
            updated_at: worker.last_event_at
          })
        )
      });
      const restartedAt = '2026-04-21T07:22:30.000Z';

      const result = await probeControlHostHealth(
        config,
        {},
        {
          restartHistory: [
            {
              requested_at: restartedAt,
              reason: 'probe_timeout',
              message: 'co-status probe timed out after 5s.',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: {
                ...buildProbeTimeoutDiagnosticFixture(),
                counts: {
                  running: recurrenceWorkers.length,
                  retrying: null,
                  max_allowed: null
                },
                polling: previousActiveRefreshPolling,
                running_workers: recurrenceWorkers
              }
            }
          ],
          now: '2026-04-21T07:23:00.000Z'
        },
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'command timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result.healthy).toBe(true);
      expect(result.reason).toBe('active_worker_probe_timeout_quarantine');
      expect(result.diagnostic?.polling?.restart_required).toBe(false);
      expect(result.diagnostic?.polling?.last_error).toBe('refresh request timeout');
      expect(result.diagnostic?.polling?.refresh_phase).toBe('refresh:rehydrate');
      expect(result.diagnostic?.running_workers.map((worker) => worker.issue_identifier)).toEqual([
        'CO-351',
        'CO-352',
        'CO-355'
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('does not quarantine timeout diagnostics from before the supervised child start', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-timeout-stale-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, {});

      const result = await probeControlHostHealth(
        config,
        {},
        {
          minPollingUpdatedAt: '2026-04-21T07:22:00.000Z',
          restartHistory: [
            {
              requested_at: '2026-04-21T07:22:30.000Z',
              reason: 'probe_timeout',
              message: 'co-status probe timed out after 5s.',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: buildProbeTimeoutDiagnosticFixture()
            }
          ],
          now: '2026-04-21T07:23:00.000Z'
        },
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'command timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result.healthy).toBe(false);
      expect(result.reason).toBe('probe_timeout');
      expect(result.diagnostic?.polling?.updated_at).toBe('2026-04-21T07:21:00.000Z');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('does not quarantine repeated probe timeouts for non-lifecycle-stuck polling diagnostics', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-timeout-non-stuck-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      const polling = {
        ...buildProbeTimeoutPollingFixture(),
        stuck: false,
        restart_required: false,
        reason: 'transient_status_probe_error',
        last_error: 'transient_status_probe_error'
      };
      await writeProviderIntakeStateFixture(config, { polling });

      const result = await probeControlHostHealth(
        config,
        {},
        {
          restartHistory: [
            {
              requested_at: '2026-04-21T07:22:30.000Z',
              reason: 'probe_timeout',
              message: 'co-status probe timed out after 5s.',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: {
                ...buildProbeTimeoutDiagnosticFixture(),
                polling: {
                  ...buildProbeTimeoutDiagnosticFixture().polling,
                  stuck: false,
                  restart_required: false,
                  reason: 'transient_status_probe_error',
                  last_error: 'transient_status_probe_error'
                }
              }
            }
          ],
          now: '2026-04-21T07:23:00.000Z'
        },
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'command timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result.healthy).toBe(false);
      expect(result.reason).toBe('probe_timeout');
      expect(result.diagnostic?.polling?.restart_required).toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('does not treat stale terminal provider-intake claims as timeout-active workers', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-timeout-terminal-'));
    try {
      const config = buildControlHostSupervisionConfig({
        homeDir: '/Users/tester',
        cwd: tempRoot,
        repoRoot: tempRoot,
        nodePath: '/custom/node',
        cliEntrypoint: '/opt/codex-orchestrator.js',
        taskId: 'local-mcp',
        runId: 'control-host',
        healthIntervalSeconds: 5
      });
      await writeProviderIntakeStateFixture(config, { claimState: 'completed' });

      const result = await probeControlHostHealth(
        config,
        {},
        {
          restartHistory: [
            {
              requested_at: '2026-04-21T07:22:30.000Z',
              reason: 'probe_timeout',
              message: 'co-status probe timed out after 5s.',
              consecutive_unhealthy_samples: 3,
              child_pid: 4321,
              diagnostic: buildProbeTimeoutDiagnosticFixture()
            }
          ],
          now: '2026-04-21T07:23:00.000Z'
        },
        async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'command timed out after 5000ms',
          timedOut: true
        })
      );

      expect(result.healthy).toBe(false);
      expect(result.reason).toBe('probe_timeout');
      expect(result.diagnostic?.running_workers).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('bounds bootstrap env sourcing timeouts and surfaces timeout errors', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'co-supervision-bootstrap-timeout-'));
    const envFile = join(tempRoot, 'provider.env');
    await writeFile(envFile, 'CONTROL_HOST_MODE=managed\n', 'utf8');

    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      envFiles: [envFile],
      healthIntervalSeconds: 5
    });
    let observedTimeoutMs: number | undefined;

    try {
      await expect(
        loadBootstrapEnvironment(
          config,
          async (
            _command: string,
            _args: string[],
            options?: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
          ) => {
            observedTimeoutMs = options?.timeoutMs;
            return {
              exitCode: 1,
              stdout: Buffer.alloc(0),
              stderr: Buffer.from('command timed out after 5000ms', 'utf8'),
              timedOut: true
            };
          }
        )
      ).rejects.toThrow(
        'Timed out while sourcing control-host supervision env/bootstrap files after 35s.'
      );
      expect(observedTimeoutMs).toBe(resolveControlHostSupervisionProbeTimeoutMs(5));
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('ignores only missing-service launchctl bootout failures', () => {
    expect(
      isIgnorableLaunchctlBootoutFailure({
        exitCode: 3,
        stdout: '',
        stderr: 'Boot-out failed: 3: No such process'
      })
    ).toBe(true);
    expect(
      isIgnorableLaunchctlBootoutFailure({
        exitCode: 113,
        stdout: '',
        stderr: 'Could not find service "gui/501/com.example.control-host" in domain for system'
      })
    ).toBe(true);
    expect(
      isIgnorableLaunchctlBootoutFailure({
        exitCode: 1,
        stdout: '',
        stderr: 'Boot-out failed: 1: Operation not permitted'
      })
    ).toBe(false);
  });

  it('retries transient launchctl bootstrap input-output failures', async () => {
    const bootstrap = vi
      .fn(async () => undefined)
      .mockRejectedValueOnce(
        new Error(
          'launchctl bootstrap gui/501 /tmp/com.example.control-host.plist failed: Bootstrap failed: 5: Input/output error'
        )
      );
    const sleep = vi.fn(async () => undefined);

    await bootstrapLaunchctlPlist('/tmp/com.example.control-host.plist', {
      bootstrap,
      sleep
    });

    expect(bootstrap).toHaveBeenCalledTimes(2);
    expect(bootstrap).toHaveBeenNthCalledWith(1, [
      'bootstrap',
      `gui/${process.getuid?.()}`,
      '/tmp/com.example.control-host.plist'
    ]);
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it('does not retry non-transient launchctl bootstrap failures', async () => {
    const bootstrapError = new Error(
      'launchctl bootstrap gui/501 /tmp/com.example.control-host.plist failed: Bootstrap failed: 37: Operation already in progress'
    );
    const bootstrap = vi.fn(async () => {
      throw bootstrapError;
    });
    const sleep = vi.fn(async () => undefined);

    await expect(
      bootstrapLaunchctlPlist('/tmp/com.example.control-host.plist', {
        bootstrap,
        sleep
      })
    ).rejects.toThrow(bootstrapError.message);

    expect(bootstrap).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(isRetryableLaunchctlBootstrapError(bootstrapError)).toBe(false);
  });

  it('clears stale exit and health fields when a new child run starts', () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);

    const nextState = buildNextControlHostSupervisionState({
      priorState: {
        version: 1,
        status: 'restart_required',
        updated_at: '2026-04-09T09:00:00.000Z',
        label: config.label,
        repo_root: config.repoRoot,
        service_target: serviceTarget,
        child_pid: null,
        last_started_at: '2026-04-09T08:30:00.000Z',
        last_exit_at: '2026-04-09T09:00:00.000Z',
        last_exit_code: 75,
        last_signal: 'SIGTERM',
        last_health_check_at: '2026-04-09T08:59:30.000Z',
        last_health_status: 'restart_required',
        last_probe_duration_ms: 10_012,
        consecutive_unhealthy_samples: 3,
        restart_count: 2,
        unhealthy_threshold: 3,
        health_interval_seconds: 30,
        last_restart_reason: 'restart_required',
        last_restart_requested_at: '2026-04-09T09:00:00.000Z',
        message: 'launchd restart requested'
      },
      update: {
        status: 'running',
        updated_at: '2026-04-09T09:01:00.000Z',
        child_pid: 1234,
        last_started_at: '2026-04-09T09:01:00.000Z',
        message: 'control-host supervision runner started.'
      },
      config,
      serviceTarget
    });

    expect(nextState.status).toBe('running');
    expect(nextState.child_pid).toBe(1234);
    expect(nextState.last_exit_at).toBeNull();
    expect(nextState.last_exit_code).toBeNull();
    expect(nextState.last_signal).toBeNull();
    expect(nextState.last_health_check_at).toBeNull();
    expect(nextState.last_health_status).toBeNull();
    expect(nextState.last_probe_duration_ms).toBeNull();
    expect(nextState.consecutive_unhealthy_samples).toBe(0);
    expect(nextState.last_restart_reason).toBe('restart_required');
  });

  it('parses shell env output without restoring variables that were unset during bootstrap', () => {
    const parsed = parseNulDelimitedEnv(
      Buffer.from('HOME=/Users/tester\u0000PATH=/usr/bin\u0000CONTROL_HOST_MODE=managed\u0000', 'utf8')
    );

    expect(parsed).toEqual({
      HOME: '/Users/tester',
      PATH: '/usr/bin',
      CONTROL_HOST_MODE: 'managed'
    });
    expect(parsed.OPENAI_API_KEY).toBeUndefined();
  });

  it('keeps child error handling reachable when spawn fails before exit', async () => {
    const child = new EventEmitter();
    const spawnError = new Error('spawn failed');
    const { childExitPromise, childErrorPromise } =
      createControlHostSupervisionChildEventPromises(child);

    child.emit('error', spawnError);

    const exitOutcome = await Promise.race([
      childExitPromise.then(
        () => 'exit',
        (error) => `rejected:${(error as Error).message}`
      ),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('pending'), 0);
      })
    ]);

    expect(exitOutcome).toBe('pending');
    await expect(childErrorPromise).resolves.toEqual({
      type: 'child_error',
      error: spawnError
    });
  });

  it('terminates the spawned child when post-spawn state persistence fails', async () => {
    const child = Object.assign(new EventEmitter(), {
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      kill: vi.fn((signal: NodeJS.Signals) => {
        queueMicrotask(() => {
          child.exitCode = signal === 'SIGTERM' ? 0 : child.exitCode;
          child.signalCode = signal;
          child.emit('exit', child.exitCode, signal);
        });
        return true;
      })
    });
    const writeError = new Error('state write failed');

    await expect(
      writeRuntimeStateWithCleanup(child as never, 1, async () => {
        throw writeError;
      })
    ).rejects.toBe(writeError);
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('waits for the prior supervised child pid before reporting restart success', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task',
      runId: 'custom-run',
      pipelineId: 'custom-pipeline'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);
    const priorState = buildInitialControlHostSupervisionState({
      config,
      serviceTarget,
      updatedAt: '2026-04-12T14:54:00.000Z'
    });
    priorState.child_pid = 4200;
    const nextState = {
      ...priorState,
      updated_at: '2026-04-12T14:54:10.000Z',
      child_pid: 4300
    };
    const readState = vi
      .fn<(_: string) => Promise<typeof priorState | null>>()
      .mockResolvedValueOnce(priorState)
      .mockResolvedValueOnce(nextState);
    const kickstart = vi.fn(async () => undefined);
    const readProcessCommand = vi.fn(async (pid: number) =>
      pid === 4300
        ? '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
        : null
    );
    const ensureTrackedProcessTreeExitedStub = vi.fn(async () => ({
      result: 'exited_after_kickstart' as const,
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    }));

    const restart = await restartExistingControlHostSupervision(
      {
        label: config.label,
        paths: config.paths,
        config
      },
      serviceTarget,
      {
        kickstart,
        readState,
        ensureTrackedProcessTreeExited: ensureTrackedProcessTreeExitedStub,
        readProcessCommand
      }
    );

    expect(kickstart).toHaveBeenCalledWith(serviceTarget);
    expect(ensureTrackedProcessTreeExitedStub).toHaveBeenCalledWith(
      4200,
      config.killTimeoutSeconds,
      expect.objectContaining({
        shouldForceKillTrackedProcessGroup: expect.any(Function)
      })
    );
    expect(readProcessCommand).toHaveBeenCalledWith(4300);
    expect(restart).toEqual({
      previousChildPid: 4200,
      childPid: 4300,
      cleanup: {
        result: 'exited_after_kickstart',
        orphanedProcessGroupPids: [],
        orphanedDescendantPids: []
      }
    });
  });

  it('force-cleans a previously tracked supervised child tree when it survives kickstart', async () => {
    const listProcessGroupPids = vi
      .fn()
      .mockResolvedValueOnce([4200, 4201, 4202])
      .mockResolvedValueOnce([4200, 4201, 4202])
      .mockResolvedValueOnce([4200, 4201, 4202])
      .mockResolvedValueOnce([]);
    const listDescendantPids = vi.fn().mockResolvedValue([4201, 4202]);
    const killProcessGroup = vi.fn();

    const cleanup = await ensureTrackedProcessTreeExited(4200, 0, {
      listProcessGroupPids,
      listDescendantPids,
      killProcessGroup
    });

    expect(cleanup).toEqual({
      result: 'force_killed',
      orphanedProcessGroupPids: [4200, 4201, 4202],
      orphanedDescendantPids: [4201, 4202]
    });
    expect(killProcessGroup).toHaveBeenCalledWith(4200, 'SIGKILL');
  });

  it('skips force cleanup when the tracked process group exits before the kill step', async () => {
    const listProcessGroupPids = vi
      .fn()
      .mockResolvedValueOnce([4200])
      .mockResolvedValueOnce([4200])
      .mockResolvedValueOnce([]);
    const shouldForceKillTrackedProcessGroup = vi.fn().mockResolvedValue(true);
    const killProcessGroup = vi.fn();

    const cleanup = await ensureTrackedProcessTreeExited(4200, 0, {
      listProcessGroupPids,
      shouldForceKillTrackedProcessGroup,
      killProcessGroup
    });

    expect(cleanup).toEqual({
      result: 'exited_after_kickstart',
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    });
    expect(shouldForceKillTrackedProcessGroup).toHaveBeenCalledTimes(2);
    expect(killProcessGroup).not.toHaveBeenCalled();
  });

  it('fails closed when the tracked process-group recheck errors before force cleanup', async () => {
    const probeError = new Error('ps failed');
    const listProcessGroupPids = vi.fn().mockRejectedValue(probeError);
    const killProcessGroup = vi.fn();

    await expect(
      ensureTrackedProcessTreeExited(4200, 0, {
        listProcessGroupPids,
        killProcessGroup
      })
    ).rejects.toThrow('ps failed');
    expect(killProcessGroup).not.toHaveBeenCalled();
  });

  it('treats the prior child as exited when identity verification skips cleanup after the process group disappears', async () => {
    const listProcessGroupPids = vi
      .fn()
      .mockResolvedValueOnce([4200])
      .mockResolvedValueOnce([]);
    const shouldForceKillTrackedProcessGroup = vi.fn().mockResolvedValue(false);
    const killProcessGroup = vi.fn();

    const cleanup = await ensureTrackedProcessTreeExited(4200, 0, {
      listProcessGroupPids,
      shouldForceKillTrackedProcessGroup,
      killProcessGroup
    });

    expect(cleanup).toEqual({
      result: 'exited_after_kickstart',
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    });
    expect(shouldForceKillTrackedProcessGroup).toHaveBeenCalledWith(4200);
    expect(killProcessGroup).not.toHaveBeenCalled();
  });

  it('fails closed when identity verification skips cleanup but the previous process group is still alive', async () => {
    const listProcessGroupPids = vi.fn().mockResolvedValue([4200]);
    const shouldForceKillTrackedProcessGroup = vi.fn().mockResolvedValue(false);
    const killProcessGroup = vi.fn();

    await expect(
      ensureTrackedProcessTreeExited(4200, 0, {
        listProcessGroupPids,
        shouldForceKillTrackedProcessGroup,
        killProcessGroup
      })
    ).rejects.toThrow(
      'Previous supervised control-host child pid 4200 is still alive, but force cleanup was skipped because identity verification failed.'
    );
    expect(killProcessGroup).not.toHaveBeenCalled();
  });

  it('fails closed when identity verification cannot re-enumerate the previous process group', async () => {
    const listProcessGroupPids = vi
      .fn()
      .mockResolvedValueOnce([4200])
      .mockRejectedValueOnce(new Error('ps failed'));
    const shouldForceKillTrackedProcessGroup = vi.fn().mockResolvedValue(false);

    await expect(
      ensureTrackedProcessTreeExited(4200, 0, {
        listProcessGroupPids,
        shouldForceKillTrackedProcessGroup
      })
    ).rejects.toThrow('ps failed');
  });

  it('requires the expected supervised control-host command before allowing force cleanup', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task',
      runId: 'custom-run',
      pipelineId: 'custom-pipeline'
    });

    await expect(
      isTrackedSupervisedProcessGroup(4200, config, {
        readProcessCommand: async () =>
          '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
      })
    ).resolves.toBe(true);
    await expect(
      isTrackedSupervisedProcessGroup(4200, config, {
        readProcessCommand: async () => '/usr/bin/python3 unrelated.py'
      })
    ).resolves.toBe(false);
    await expect(
      isTrackedSupervisedProcessGroup(4200, config, {
        readProcessCommand: async () => null
      })
    ).resolves.toBe(false);
  });

  it('rejects overlapping task and run prefixes when verifying the supervised control-host command', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task-1',
      runId: 'custom-run-1',
      pipelineId: 'custom-pipeline-1'
    });

    await expect(
      isTrackedSupervisedProcessGroup(4200, config, {
        readProcessCommand: async () =>
          '/custom/node /opt/codex-orchestrator.js control-host --task custom-task-12 --run custom-run-12 --pipeline custom-pipeline-12 --format json'
      })
    ).resolves.toBe(false);
  });

  it('matches the supervised control-host when the CLI entrypoint path contains spaces', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/Codex Builds/codex-orchestrator.js',
      taskId: 'custom-task-1',
      runId: 'custom-run-1',
      pipelineId: 'custom-pipeline-1'
    });

    await expect(
      isTrackedSupervisedProcessGroup(4200, config, {
        readProcessCommand: async () =>
          '/custom/node /opt/Codex Builds/codex-orchestrator.js control-host --task custom-task-1 --run custom-run-1 --pipeline custom-pipeline-1 --format json'
      })
    ).resolves.toBe(true);
  });

  it('accepts lingering supervised group members when the root pid has already exited', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task',
      runId: 'custom-run',
      pipelineId: 'custom-pipeline'
    });

    await expect(
      isTrackedSupervisedProcessGroup(4200, config, {
        listProcessGroupPids: async () => [4201, 4202],
        readProcessCommand: async (pid: number) =>
          pid === 4202
            ? '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
            : null
      })
    ).resolves.toBe(true);
  });

  it('does not report a new supervised child pid until the state advances to a verified process', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task',
      runId: 'custom-run',
      pipelineId: 'custom-pipeline'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);
    const previousState = buildInitialControlHostSupervisionState({
      config,
      serviceTarget,
      updatedAt: '2026-04-12T14:54:00.000Z'
    });
    previousState.child_pid = 4200;

    await expect(
      resolveReportedSupervisedChildPid(
        {
          ...previousState
        },
        previousState,
        config,
        {
          readProcessCommand: async () =>
            '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
        }
      )
    ).resolves.toBeNull();

    await expect(
      resolveReportedSupervisedChildPid(
        {
          ...previousState,
          updated_at: '2026-04-12T14:54:10.000Z',
          child_pid: 4300
        },
        previousState,
        config,
        {
          readProcessCommand: async () =>
            '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
        }
      )
    ).resolves.toBe(4300);

    await expect(
      resolveReportedSupervisedChildPid(
        {
          ...previousState,
          updated_at: '2026-04-12T14:54:20.000Z',
          child_pid: 4400
        },
        previousState,
        config,
        {
          readProcessCommand: async (pid: number) =>
            pid === 4401
              ? '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
              : null,
        }
      )
    ).resolves.toBeNull();
  });

  it('extracts the supervised service pid from launchctl print output', () => {
    expect(
      extractLaunchctlServicePid([
        'gui/501/com.kbediako.co.control-host = {',
        '\tstate = running',
        '\tpid = 4300',
        '}'
      ].join('\n'))
    ).toBe(4300);
    expect(extractLaunchctlServicePid('gui/501/com.kbediako.co.control-host = {\n\tstate = waiting\n}')).toBeNull();
  });

  it('falls back to launchctl pid discovery when the stored supervision state is unreadable', async () => {
    const config = buildControlHostSupervisionConfig({
      homeDir: '/Users/tester',
      cwd: '/repo/workspace',
      label: 'com.example.control-host',
      repoRoot: '/repo/CO',
      nodePath: '/custom/node',
      cliEntrypoint: '/opt/codex-orchestrator.js',
      taskId: 'custom-task',
      runId: 'custom-run',
      pipelineId: 'custom-pipeline'
    });
    const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);
    const nextState = buildInitialControlHostSupervisionState({
      config,
      serviceTarget,
      updatedAt: '2026-04-12T14:54:10.000Z'
    });
    nextState.child_pid = 4300;
    const readState = vi
      .fn<(_: string) => Promise<typeof nextState | null>>()
      .mockRejectedValueOnce(new SyntaxError('Unexpected end of JSON input'))
      .mockResolvedValueOnce(nextState);
    const readLaunchctlPrint = vi.fn(async () => ({
      exitCode: 0,
      stdout: 'gui/501/com.example.control-host = {\n\tstate = running\n\tpid = 4200\n}\n',
      stderr: ''
    }));
    const kickstart = vi.fn(async () => undefined);
    const readProcessCommand = vi.fn(async (pid: number) =>
      pid === 4300
        ? '/custom/node /opt/codex-orchestrator.js control-host --task custom-task --run custom-run --pipeline custom-pipeline --format json'
        : null
    );
    const ensureTrackedProcessTreeExitedStub = vi.fn(async () => ({
      result: 'exited_after_kickstart' as const,
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    }));

    const restart = await restartExistingControlHostSupervision(
      {
        label: config.label,
        paths: config.paths,
        config
      },
      serviceTarget,
      {
        kickstart,
        readState,
        readLaunchctlPrint,
        ensureTrackedProcessTreeExited: ensureTrackedProcessTreeExitedStub,
        readProcessCommand
      }
    );

    expect(readLaunchctlPrint).toHaveBeenCalledWith(serviceTarget);
    expect(kickstart).toHaveBeenCalledWith(serviceTarget);
    expect(ensureTrackedProcessTreeExitedStub).toHaveBeenCalledWith(
      4200,
      config.killTimeoutSeconds,
      expect.objectContaining({
        shouldForceKillTrackedProcessGroup: expect.any(Function)
      })
    );
    expect(restart).toEqual({
      previousChildPid: 4200,
      childPid: 4300,
      cleanup: {
        result: 'exited_after_kickstart',
        orphanedProcessGroupPids: [],
        orphanedDescendantPids: []
      }
    });
  });

  it('kills only the stale process group while preserving detached descendants during timeout cleanup', async () => {
    const child = Object.assign(new EventEmitter(), {
      pid: 4200,
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      kill: vi.fn((signal: NodeJS.Signals) => {
        if (signal === 'SIGKILL') {
          queueMicrotask(() => {
            child.signalCode = signal;
            child.emit('exit', null, signal);
          });
        }
        return true;
      })
    });
    const listProcessGroupPids = vi.fn().mockResolvedValue([4200, 4201]);
    const killProcessGroup = vi.fn();
    const listDescendantPids = vi.fn().mockResolvedValue([4201, 4300]);

    await terminateChildProcess(child as never, 0, {
      listProcessGroupPids,
      killProcessGroup,
      listDescendantPids
    });

    expect(listProcessGroupPids).toHaveBeenCalledWith(4200);
    expect(killProcessGroup).toHaveBeenCalledWith(4200, 'SIGKILL');
    expect(listDescendantPids).toHaveBeenCalledWith(4200);
    expect(child.kill).toHaveBeenNthCalledWith(1, 'SIGTERM');
    expect(child.kill).toHaveBeenNthCalledWith(2, 'SIGKILL');
  });

  it('stops polling detached process groups once timeout cleanup returns', async () => {
    const child = Object.assign(new EventEmitter(), {
      pid: 4200,
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      kill: vi.fn((signal: NodeJS.Signals) => {
        if (signal === 'SIGKILL') {
          queueMicrotask(() => {
            child.signalCode = signal;
            child.emit('exit', null, signal);
          });
        }
        return true;
      })
    });
    const listProcessGroupPids = vi.fn().mockResolvedValue([4200, 4201]);

    await terminateChildProcess(child as never, 0, {
      listProcessGroupPids,
      listDescendantPids: vi.fn().mockResolvedValue([])
    });

    expect(listProcessGroupPids).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(listProcessGroupPids).toHaveBeenCalledTimes(1);
  });

  it('kills the detached process group even when the wrapper exits before the timeout escalation', async () => {
    const child = Object.assign(new EventEmitter(), {
      pid: 4200,
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      kill: vi.fn((signal: NodeJS.Signals) => {
        if (signal === 'SIGTERM') {
          queueMicrotask(() => {
            child.exitCode = 0;
            child.signalCode = signal;
            child.emit('exit', 0, signal);
          });
        }
        return true;
      })
    });
    let processGroupKilled = false;
    const listProcessGroupPids = vi.fn(async () => (processGroupKilled ? [] : [4202]));
    const killProcessGroup = vi.fn(() => {
      processGroupKilled = true;
    });
    const listDescendantPids = vi.fn();

    await terminateChildProcess(child as never, 0, {
      listProcessGroupPids,
      killProcessGroup,
      listDescendantPids
    });

    expect(killProcessGroup).toHaveBeenCalledWith(4200, 'SIGKILL');
    expect(listDescendantPids).not.toHaveBeenCalled();
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('treats process-group lookup failures as pending until timeout escalation runs', async () => {
    const child = Object.assign(new EventEmitter(), {
      pid: 4200,
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      kill: vi.fn((signal: NodeJS.Signals) => {
        if (signal === 'SIGKILL') {
          queueMicrotask(() => {
            child.signalCode = signal;
            child.emit('exit', null, signal);
          });
        }
        return true;
      })
    });
    const listProcessGroupPids = vi.fn().mockRejectedValue(new Error('ps failed'));
    const killProcessGroup = vi.fn();

    await expect(
      terminateChildProcess(child as never, 0, {
        listProcessGroupPids,
        killProcessGroup,
        listDescendantPids: vi.fn().mockResolvedValue([])
      })
    ).resolves.toBeUndefined();

    expect(listProcessGroupPids).toHaveBeenCalledWith(4200);
    expect(killProcessGroup).toHaveBeenCalledWith(4200, 'SIGKILL');
    expect(child.kill).toHaveBeenNthCalledWith(1, 'SIGTERM');
    expect(child.kill).toHaveBeenNthCalledWith(2, 'SIGKILL');
  });

  it('disposes sleep waiters before the tick fires', async () => {
    const waiter = createSleepWaiter(25);
    waiter.dispose();

    const outcome = await Promise.race([
      waiter.promise.then(() => 'tick'),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('pending'), 50);
      })
    ]);

    expect(outcome).toBe('pending');
  });

  it('treats process-group exit as complete when the group disappears before the timeout', async () => {
    const listProcessGroupPids = vi.fn().mockResolvedValue([]);

    await expect(
      waitForProcessGroupToExitWithinTimeout(4200, 0, {
        listProcessGroupPids
      })
    ).resolves.toBe(true);

    expect(listProcessGroupPids).toHaveBeenCalledWith(4200);
  });
});
