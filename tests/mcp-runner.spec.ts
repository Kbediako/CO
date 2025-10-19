import * as childProcess from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = promisify(childProcess.execFile);
const importModule = async (target: string) => import(`${target}?test=${Date.now()}${Math.random()}`);

describe('mcp runner durability + telemetry', () => {
  let tempDir: string;
  let runnerModule: typeof import('../scripts/agents_mcp_runner.mjs');

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-runner-'));
    process.env.MCP_RUNNER_REPO_ROOT = tempDir;
    process.env.MCP_RUNNER_TASK_RUNS_ROOT = path.join(tempDir, '.runs', '0001', 'mcp');
    process.env.MCP_RUNNER_LEGACY_ROOT = path.join(tempDir, '.runs', 'local-mcp');
    process.env.MCP_RUNNER_METRICS_ROOT = path.join(tempDir, '.runs', '0001');

    runnerModule = await importModule('../scripts/agents_mcp_runner.mjs');
  });

  afterEach(async () => {
    delete process.env.MCP_RUNNER_REPO_ROOT;
    delete process.env.MCP_RUNNER_TASK_RUNS_ROOT;
    delete process.env.MCP_RUNNER_LEGACY_ROOT;
    delete process.env.MCP_RUNNER_METRICS_ROOT;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('records metrics entry for a completed run', async () => {
    const { appendMetricsEntry, constants, isoTimestamp } = runnerModule;
    const runId = 'test-run';
    const runDir = path.join(constants.taskRunsRoot, runId);
    const manifestPath = path.join(runDir, 'manifest.json');

    await fs.mkdir(runDir, { recursive: true });
    const manifest = {
      run_id: runId,
      status: 'succeeded',
      started_at: isoTimestamp(),
      completed_at: isoTimestamp(),
      commands: [
        {
          index: 1,
          command: 'bash scripts/spec-guard.sh --dry-run',
          status: 'succeeded',
        },
      ],
      artifact_root: path.relative(constants.repoRoot, runDir),
      metrics_recorded: false,
      task_id: constants.TASK_ID,
    };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    await appendMetricsEntry(manifest, manifestPath);

    const metricsData = await fs.readFile(path.join(constants.metricsRoot, 'metrics.json'), 'utf8');
    const entry = JSON.parse(metricsData.trim());

    expect(entry.run_id).toBe(runId);
    expect(entry.status).toBe('succeeded');
    expect(entry.guardrails_present).toBe(true);

    const updatedManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    expect(updatedManifest.metrics_recorded).toBe(true);
  });

  it('creates a compatibility pointer to the new artifact root', async () => {
    const { createCompatibilityPointer, constants } = runnerModule;
    const runId = 'resume-friendly';
    const runDir = path.join(constants.taskRunsRoot, runId);
    const manifestPath = path.join(runDir, 'manifest.json');

    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify({ run_id: runId }, null, 2));

    const { compatDir } = await createCompatibilityPointer(runId, manifestPath, runDir);
    const compatManifestPath = path.join(compatDir, 'manifest.json');

    const stat = await fs.lstat(compatManifestPath);
    if (stat.isSymbolicLink()) {
      const target = await fs.readlink(compatManifestPath);
      expect(target).toBe(path.relative(compatDir, manifestPath));
    } else {
      const stub = JSON.parse(await fs.readFile(compatManifestPath, 'utf8'));
      expect(stub.redirect_to).toBe(path.relative(constants.repoRoot, runDir));
      expect(stub.manifest).toBe(path.relative(constants.repoRoot, manifestPath));
    }
  });

  it('marks heartbeat as stale when the timestamp is older than the threshold', () => {
    const { computeHeartbeatState, HEARTBEAT_STALE_THRESHOLD_MS } = runnerModule;
    const staleAt = new Date(Date.now() - HEARTBEAT_STALE_THRESHOLD_MS - 1000).toISOString();
    const result = computeHeartbeatState({ heartbeat_at: staleAt });
    expect(result.stale).toBe(true);
    expect(result.ageSeconds).toBeGreaterThan(HEARTBEAT_STALE_THRESHOLD_MS / 1000);
  });

  it('migrates a legacy run directory and leaves a pointer', async () => {
    const { constants } = runnerModule;
    const runId = 'legacy-run';
    const legacyDir = path.join(constants.legacyRunsRoot, runId);

    await fs.mkdir(legacyDir, { recursive: true });
    await fs.writeFile(
      path.join(legacyDir, 'manifest.json'),
      JSON.stringify(
        {
          run_id: runId,
          status: 'succeeded',
          started_at: runnerModule.isoTimestamp(),
          completed_at: runnerModule.isoTimestamp(),
          commands: [],
        },
        null,
        2,
      ),
    );

    const env = {
      ...process.env,
      MCP_RUNNER_REPO_ROOT: tempDir,
      MCP_RUNNER_TASK_RUNS_ROOT: constants.taskRunsRoot,
      MCP_RUNNER_LEGACY_ROOT: constants.legacyRunsRoot,
      MCP_RUNNER_METRICS_ROOT: constants.metricsRoot,
    };

    await execFileAsync('node', ['scripts/mcp-runner-migrate.js', '--run-id', runId], {
      cwd: path.resolve('.'),
      env,
    });

    const migratedManifestPath = path.join(constants.taskRunsRoot, runId, 'manifest.json');
    const migratedManifest = JSON.parse(await fs.readFile(migratedManifestPath, 'utf8'));
    expect(migratedManifest.artifact_root).toBe(
      path.relative(constants.repoRoot, path.join(constants.taskRunsRoot, runId)),
    );

    const compatManifestPath = path.join(constants.legacyRunsRoot, runId, 'manifest.json');
    await fs.access(compatManifestPath);
  });

  it('summarizes metrics entries with success and guardrail coverage', async () => {
    const { constants } = runnerModule;
    const metricsPath = path.join(constants.metricsRoot, 'metrics.json');

    await fs.mkdir(path.dirname(metricsPath), { recursive: true });
    const entries = [
      { status: 'succeeded', guardrails_present: true, duration_seconds: 12 },
      { status: 'failed', guardrails_present: false, duration_seconds: 30 },
    ];
    await fs.writeFile(
      metricsPath,
      `${entries.map((item) => JSON.stringify(item)).join('\n')}\n`,
      'utf8',
    );

    const env = {
      ...process.env,
      MCP_RUNNER_REPO_ROOT: tempDir,
      MCP_RUNNER_TASK_RUNS_ROOT: constants.taskRunsRoot,
      MCP_RUNNER_LEGACY_ROOT: constants.legacyRunsRoot,
      MCP_RUNNER_METRICS_ROOT: constants.metricsRoot,
    };

    await execFileAsync('node', ['scripts/mcp-runner-metrics.js'], {
      cwd: path.resolve('.'),
      env,
    });

    const summaryPath = path.join(constants.metricsRoot, 'metrics-summary.json');
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));

    expect(summary.entries_total).toBe(2);
    expect(summary.entries_succeeded).toBe(1);
    expect(summary.guardrail_coverage).toBeCloseTo(0.5, 5);
    expect(summary.average_duration_seconds).toBeCloseTo(21);
  });

  it('recommends diagnostics when guardrail command is missing', async () => {
    const { appendMetricsEntry, constants, isoTimestamp } = runnerModule;
    const runId = 'missing-guardrail';
    const runDir = path.join(constants.taskRunsRoot, runId);
    const manifestPath = path.join(runDir, 'manifest.json');

    await fs.mkdir(runDir, { recursive: true });
    const manifest = {
      run_id: runId,
      status: 'succeeded',
      started_at: isoTimestamp(),
      completed_at: isoTimestamp(),
      commands: [
        {
          index: 1,
          command: 'npm run build',
          status: 'succeeded',
        },
      ],
      metrics_recorded: false,
    };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let calls: unknown[][] = [];
    try {
      await appendMetricsEntry(manifest, manifestPath);
      calls = warnSpy.mock.calls.slice();
    } finally {
      warnSpy.mockRestore();
    }

    expect(calls.some((call) => String(call[0]).includes('scripts/run-mcp-diagnostics.sh --no-watch'))).toBe(true);

    const updatedManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    expect(updatedManifest.summary).toContain('scripts/run-mcp-diagnostics.sh --no-watch');
    const metricsData = await fs.readFile(path.join(constants.metricsRoot, 'metrics.json'), 'utf8');
    const entry = JSON.parse(metricsData.trim());
    expect(entry.guardrails_present).toBe(false);
  });

  it('appends diagnostics recommendation when guardrail command fails', async () => {
    const { appendMetricsEntry, constants, isoTimestamp } = runnerModule;
    const runId = 'failing-guardrail';
    const runDir = path.join(constants.taskRunsRoot, runId);
    const manifestPath = path.join(runDir, 'manifest.json');

    await fs.mkdir(runDir, { recursive: true });
    const manifest = {
      run_id: runId,
      status: 'failed',
      started_at: isoTimestamp(),
      completed_at: isoTimestamp(),
      summary: 'Primary command sequence interrupted.',
      commands: [
        {
          index: 1,
          command: 'bash scripts/spec-guard.sh --dry-run',
          status: 'failed',
        },
      ],
      metrics_recorded: false,
    };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let calls: unknown[][] = [];
    try {
      await appendMetricsEntry(manifest, manifestPath);
      calls = warnSpy.mock.calls.slice();
    } finally {
      warnSpy.mockRestore();
    }

    expect(calls.some((call) => String(call[0]).includes('Guardrail command failed'))).toBe(true);

    const updatedManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    expect(updatedManifest.summary).toMatch(/Primary command sequence interrupted./);
    expect(updatedManifest.summary).toMatch(/scripts\/run-mcp-diagnostics\.sh --no-watch/);
  });

  it('writes structured error artifacts with run metadata', async () => {
    const { recordCommandErrorArtifact, constants, isoTimestamp } = runnerModule;
    const runId = 'failure-run';
    const runDir = path.join(constants.taskRunsRoot, runId);
    await fs.mkdir(runDir, { recursive: true });

    const manifest = {
      run_id: runId,
      task_id: constants.TASK_ID,
      started_at: isoTimestamp(),
    };
    const entry = {
      index: 3,
      command: "bash -lc 'exit 2'",
    };

    const relativePath = await recordCommandErrorArtifact({
      manifest,
      entry,
      runDir,
      reason: 'command-failed',
      details: { exit_code: 2 },
    });

    expect(relativePath).toBe(
      path.join('.runs', '0001', 'mcp', runId, 'errors', '03-bash-lc-exit-2.json'),
    );

    const artifactPath = path.join(constants.repoRoot, relativePath);
    const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
    expect(artifact.run_id).toBe(runId);
    expect(artifact.reason).toBe('command-failed');
    expect(artifact.details.exit_code).toBe(2);
    expect(artifact.command).toBe(entry.command);
    expect(artifact.command_index).toBe(3);
  });

  it('resets metrics bookkeeping when preparing a manifest for resume', () => {
    const { resetManifestForResume, isoTimestamp } = runnerModule;
    const manifest = {
      completed_at: isoTimestamp(),
      metrics_recorded: true,
      status_detail: 'command-failed',
    };

    resetManifestForResume(manifest);

    expect(manifest.metrics_recorded).toBe(false);
    expect(manifest.completed_at).toBeNull();
    expect(manifest.status_detail).toBe('resuming');
  });

  it('outputs structured json when polling with format=json', async () => {
    const { pollRun, constants, isoTimestamp } = runnerModule;
    const runId = 'json-mode-run';
    const runDir = path.join(constants.taskRunsRoot, runId);
    const manifestPath = path.join(runDir, 'manifest.json');

    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          run_id: runId,
          status: 'succeeded',
          status_detail: null,
          started_at: isoTimestamp(),
          completed_at: isoTimestamp(),
          heartbeat_at: isoTimestamp(),
          commands: [
            {
              index: 1,
              command: 'echo ok',
              status: 'succeeded',
              summary: 'ok',
              error_file: null,
            },
          ],
          artifact_root: path.relative(constants.repoRoot, runDir),
        },
        null,
        2,
      ),
      'utf8',
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    let calls: unknown[][] = [];
    try {
      await pollRun(runId, { watch: false, interval: 1, format: 'json' });
      expect(logSpy).toHaveBeenCalled();
      calls = logSpy.mock.calls.slice();
    } finally {
      logSpy.mockRestore();
    }

    expect(calls.length).toBeGreaterThan(0);
    const payload = JSON.parse(String(calls[0][0]));
    expect(payload.run_id).toBe(runId);
    expect(payload.manifest).toBe(path.relative(constants.repoRoot, manifestPath));
    expect(payload.heartbeat.stale).toBe(false);
    expect(payload.commands[0].command).toBe('echo ok');
    expect(payload.commands[0]).toHaveProperty('error_file');
    expect(payload.commands[0].error_file).toBeNull();
  });
});
