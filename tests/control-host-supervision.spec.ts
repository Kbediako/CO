import { describe, expect, it } from 'vitest';

import { DEFAULT_ATTACH_REQUEST_TIMEOUT_MS } from '../orchestrator/src/cli/coStatusAttachCliShell.js';
import { __test__ as supervisionShellTest } from '../orchestrator/src/cli/controlHostSupervisionCliShell.js';
import {
  buildControlHostSupervisionConfig,
  evaluateControlHostSupervisionHealthPayload
} from '../orchestrator/src/cli/control/controlHostSupervision.js';

function buildTestConfig() {
  return buildControlHostSupervisionConfig({
    cwd: process.cwd(),
    repoRoot: process.cwd(),
    nodePath: process.execPath,
    cliEntrypoint: 'bin/codex-orchestrator.js',
    taskId: 'local-mcp',
    runId: 'control-host',
    healthIntervalSeconds: 1,
    envFiles: []
  });
}

function buildHealthyStatusPayload(): string {
  return JSON.stringify({
    counts: {
      running: 3,
      retrying: 0,
      max_allowed: 3
    },
    polling: {
      updated_at: '2026-04-23T10:01:49.611Z',
      stuck: false,
      restart_required: false
    },
    running: [
      {
        issue_identifier: 'CO-328',
        state: 'running',
        pid: '1234',
        started_at: '2026-04-23T09:59:00.000Z'
      }
    ]
  });
}

function buildControlHostOwner(sourceRootFreshness: Record<string, unknown>): Record<string, unknown> {
  return {
    status: 'owned',
    reason: null,
    updated_at: '2026-05-18T23:10:00.000Z',
    owner: {
      owner_token: 'owner-token',
      status: 'owned',
      pid: 12345,
      ppid: 123,
      hostname: 'localhost',
      acquired_at: '2026-05-18T23:00:00.000Z',
      updated_at: '2026-05-18T23:10:00.000Z',
      released_at: null,
      repo_root: '/repo',
      task_id: 'local-mcp',
      run_id: 'control-host',
      run_dir: '/repo/.runs/local-mcp/cli/control-host',
      pipeline_id: 'provider-linear-worker',
      source_root_freshness: sourceRootFreshness,
      lock_dir: '/repo/.runs/local-mcp/cli/control-host/.control-host-owner.lock',
      owner_path: '/repo/.runs/local-mcp/cli/control-host/control-host-owner.json'
    },
    diagnostic_path: null,
    lock_dir: '/repo/.runs/local-mcp/cli/control-host/.control-host-owner.lock',
    owner_path: '/repo/.runs/local-mcp/cli/control-host/control-host-owner.json'
  };
}

function buildSourceRootFreshness(input: {
  sourceStatus: string;
  intendedStatus: string;
  intendedDirty?: 'clean' | 'dirty';
  driftClasses?: string[];
}): Record<string, unknown> {
  return {
    schema_version: 1,
    status: input.sourceStatus === 'current' ? 'current' : 'warning',
    observed_at: '2026-05-18T23:10:00.000Z',
    intended_repo_root: '/repo',
    intended_repo_root_realpath: '/repo',
    command_path: '/repo/bin/codex-orchestrator.js',
    command_path_realpath: '/repo/bin/codex-orchestrator.js',
    package_root: '/repo',
    package_root_realpath: '/repo',
    source_root: '/repo',
    source_root_realpath: '/repo',
    entrypoint_kind: 'bootstrap',
    base_ref: 'origin/main',
    source_checkout: buildCheckout(input.sourceStatus),
    intended_checkout: buildCheckout(input.intendedStatus, input.intendedDirty ?? 'clean'),
    drift_classes: input.driftClasses ?? ['supervised_source_root_drift'],
    provenance: {
      command_path_source: 'argv',
      package_root_source: 'command_path',
      source_root_source: 'package_root',
      command_path_inside_package: true,
      package_root_matches_intended: true,
      source_root_matches_intended: true,
      source_entry_exists: true,
      dist_entry_exists: true
    },
    guidance: ['Restart or relaunch the supervised control-host from the intended current source root before trusting provider-worker posture.'],
    detail: 'Detected source/root drift: supervised_source_root_drift.'
  };
}

function buildCheckout(status: string, dirty: 'clean' | 'dirty' = 'clean'): Record<string, unknown> {
  return {
    status,
    repo_root: '/repo',
    inside_git_worktree: true,
    base_ref: 'origin/main',
    ahead: status === 'ahead' || status === 'diverged' ? 1 : 0,
    behind: status === 'stale' || status === 'diverged' ? 1 : 0,
    dirty: {
      status: dirty,
      changed_paths: dirty === 'dirty' ? 1 : 0,
      detail: dirty === 'dirty' ? '1 changed path' : 'working tree clean'
    },
    head: {
      hash: '489463e41e000000000000000000000000000000',
      short_hash: '489463e41e',
      committed_date: '2026-05-18T22:00:00.000Z',
      subject: 'old source'
    },
    upstream: {
      hash: '495585bcc4000000000000000000000000000000',
      short_hash: '495585bcc4',
      committed_date: '2026-05-18T23:00:00.000Z',
      subject: 'current source'
    },
    detail: status === 'stale' ? 'HEAD is 1 commit behind origin/main.' : 'checkout detail'
  };
}

describe('control-host supervision probe contract', () => {
  it('keeps the probe timeout above stale-endpoint recovery reads with bounded headroom', () => {
    const timeoutMs = supervisionShellTest.resolveControlHostSupervisionProbeTimeoutMs(1);

    expect(timeoutMs).toBeGreaterThan(DEFAULT_ATTACH_REQUEST_TIMEOUT_MS * 2);
    expect(timeoutMs).toBe(DEFAULT_ATTACH_REQUEST_TIMEOUT_MS * 2 + 5_000);
  });

  it('accepts a slow but successful co-status probe before counting an unhealthy sample', async () => {
    const config = buildTestConfig();
    let observedTimeoutMs = 0;

    const probe = await supervisionShellTest.probeControlHostHealth(
      config,
      {},
      {},
      async (_command, _args, options) => {
        observedTimeoutMs = options?.timeoutMs ?? 0;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          exitCode: 0,
          stdout: buildHealthyStatusPayload(),
          stderr: ''
        };
      }
    );

    expect(observedTimeoutMs).toBe(DEFAULT_ATTACH_REQUEST_TIMEOUT_MS * 2 + 5_000);
    expect(probe).toMatchObject({
      healthy: true,
      reason: 'ok'
    });
    expect(probe.probeDurationMs).toBeGreaterThanOrEqual(0);
    expect(probe.diagnostic?.running_workers[0]?.issue_identifier).toBe('CO-328');
  });

  it('still fails closed when the co-status probe exceeds the bounded budget', async () => {
    const config = buildTestConfig();

    const probe = await supervisionShellTest.probeControlHostHealth(
      config,
      {},
      {},
      async () => ({
        exitCode: 1,
        stdout: '',
        stderr: 'command timed out',
        timedOut: true
      })
    );

    expect(probe).toMatchObject({
      healthy: false,
      reason: 'probe_timeout',
      diagnostic: null
    });
    expect(probe.message).toContain('35s');
    expect(probe.probeDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('records probe duration on restart history records', () => {
    const record = supervisionShellTest.buildControlHostSupervisionRestartRecord({
      requestedAt: '2026-04-23T10:00:10.319Z',
      reason: 'probe_timeout',
      message: 'co-status probe timed out',
      consecutiveUnhealthySamples: 3,
      childPid: 40213,
      probeDurationMs: 20_123.6,
      diagnostic: null
    });

    expect(record).toMatchObject({
      requested_at: '2026-04-23T10:00:10.319Z',
      reason: 'probe_timeout',
      probe_duration_ms: 20124,
      child_pid: 40213
    });
  });

  it('requests a bounded restart when co-status reports stale supervised source on a clean current checkout', () => {
    const payload = {
      counts: {
        running: 0,
        retrying: 3,
        max_allowed: 3
      },
      polling: {
        updated_at: '2026-05-18T23:10:00.000Z',
        stuck: false,
        restart_required: false,
        control_host_owner: buildControlHostOwner(
          buildSourceRootFreshness({
            sourceStatus: 'stale',
            intendedStatus: 'current'
          })
        )
      },
      running: []
    };

    const evaluation = evaluateControlHostSupervisionHealthPayload(payload);

    expect(evaluation).toMatchObject({
      healthy: false,
      reason: 'stale_supervised_source_root'
    });
    expect(evaluation.message).toContain('bounded launchd restart');
  });

  it('does not request restart from a stale supervised source snapshot before current child start', () => {
    const payload = {
      counts: {
        running: 0,
        retrying: 3,
        max_allowed: 3
      },
      polling: {
        updated_at: '2026-05-18T23:10:00.000Z',
        stuck: false,
        restart_required: false,
        control_host_owner: buildControlHostOwner(
          buildSourceRootFreshness({
            sourceStatus: 'stale',
            intendedStatus: 'current'
          })
        )
      },
      running: []
    };

    const evaluation = evaluateControlHostSupervisionHealthPayload(payload, {
      minPollingUpdatedAt: '2026-05-18T23:12:00.000Z',
      staleRestartRequiredGraceMs: 30_000,
      now: '2026-05-18T23:12:10.000Z'
    });

    expect(evaluation).toMatchObject({
      healthy: true,
      reason: 'stale_restart_required'
    });
    expect(evaluation.message).toContain('stale supervised source freshness snapshot');
    expect(evaluation.message).not.toContain('bounded launchd restart');
  });

  it('fails closed without restart when stale source recovery would loop on an unsafe checkout', () => {
    const payload = {
      counts: {
        running: 0,
        retrying: 3,
        max_allowed: 3
      },
      polling: {
        updated_at: '2026-05-18T23:10:00.000Z',
        stuck: false,
        restart_required: false,
        control_host_owner: buildControlHostOwner(
          buildSourceRootFreshness({
            sourceStatus: 'stale',
            intendedStatus: 'current',
            intendedDirty: 'dirty'
          })
        )
      },
      running: []
    };

    const evaluation = evaluateControlHostSupervisionHealthPayload(payload);

    expect(evaluation).toMatchObject({
      healthy: true,
      reason: 'stale_supervised_source_fail_closed'
    });
    expect(evaluation.message).toContain('Restart is not attempted');
  });
});
