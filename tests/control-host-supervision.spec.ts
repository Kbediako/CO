import { describe, expect, it } from 'vitest';

import { DEFAULT_ATTACH_REQUEST_TIMEOUT_MS } from '../orchestrator/src/cli/coStatusAttachCliShell.js';
import { __test__ as supervisionShellTest } from '../orchestrator/src/cli/controlHostSupervisionCliShell.js';
import { buildControlHostSupervisionConfig } from '../orchestrator/src/cli/control/controlHostSupervision.js';

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
});
