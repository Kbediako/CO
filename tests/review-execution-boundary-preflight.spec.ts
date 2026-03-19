import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  allowHeavyReviewCommands,
  enforceBoundedReviewMode,
  prepareReviewExecutionBoundaryPreflight,
  resolveReviewLowSignalTimeoutMs,
  resolveReviewMetaSurfaceTimeoutMs,
  resolveReviewMonitorIntervalMs,
  resolveReviewStallTimeoutMs,
  resolveReviewStartupLoopMinEvents,
  resolveReviewStartupLoopTimeoutMs,
  resolveReviewTimeoutMs,
  resolveReviewVerdictStabilityTimeoutMs
} from '../scripts/lib/review-execution-boundary-preflight.js';

const createdSandboxes: string[] = [];

function makeRuntimeContext() {
  return {
    runtime: {
      requested_mode: 'cli',
      selected_mode: 'cli',
      provider: 'chatgpt',
      fallback: {
        occurred: false,
        code: null,
        reason: null
      }
    },
    env: {}
  };
}

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-boundary-preflight-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

async function makeManifest(sandbox: string, taskId = 'sample-task', runId = 'sample-run'): Promise<{
  manifestPath: string;
  runnerLogPath: string;
}> {
  const runDir = join(sandbox, '.runs', taskId, 'cli', runId);
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  const runnerLogPath = join(runDir, 'runner.ndjson');
  await writeFile(manifestPath, JSON.stringify({ run_id: runId }), 'utf8');
  await writeFile(runnerLogPath, '{"event":"sample"}\n', 'utf8');
  return { manifestPath, runnerLogPath };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    createdSandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

describe('review-execution-boundary-preflight', () => {
  it('parses heavy-command and bounded-mode env flags', () => {
    expect(allowHeavyReviewCommands({})).toBe(false);
    expect(allowHeavyReviewCommands({ CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1' })).toBe(true);
    expect(allowHeavyReviewCommands({ CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: 'yes' })).toBe(true);

    expect(enforceBoundedReviewMode({})).toBe(false);
    expect(enforceBoundedReviewMode({ CODEX_REVIEW_ENFORCE_BOUNDED_MODE: 'true' })).toBe(true);
  });

  it('resolves timeout, stall, startup-loop, and monitor interval envs', () => {
    expect(resolveReviewTimeoutMs({})).toBeNull();
    expect(resolveReviewTimeoutMs({ CODEX_REVIEW_TIMEOUT_SECONDS: '1.25' })).toBe(1250);
    expect(resolveReviewTimeoutMs({ CODEX_REVIEW_TIMEOUT_SECONDS: '0' })).toBeNull();

    expect(resolveReviewStallTimeoutMs({})).toBeNull();
    expect(resolveReviewStallTimeoutMs({ CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '2' })).toBe(2000);
    expect(resolveReviewStallTimeoutMs({ CODEX_REVIEW_STALL_TIMEOUT_SECONDS: '0' })).toBeNull();

    expect(resolveReviewStartupLoopTimeoutMs({})).toBeNull();
    expect(
      resolveReviewStartupLoopTimeoutMs({ CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: '3' })
    ).toBe(3000);
    expect(
      resolveReviewStartupLoopTimeoutMs({ CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: '0' })
    ).toBeNull();

    expect(resolveReviewStartupLoopMinEvents({})).toBe(8);
    expect(resolveReviewStartupLoopMinEvents({ CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS: '3' })).toBe(3);

    expect(resolveReviewMonitorIntervalMs({})).toBe(60_000);
    expect(resolveReviewMonitorIntervalMs({ CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: '0.5' })).toBe(
      500
    );
    expect(resolveReviewMonitorIntervalMs({ CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: '0' })).toBeNull();
  });

  it('throws on invalid numeric boundary env values', () => {
    expect(() =>
      resolveReviewTimeoutMs({ CODEX_REVIEW_TIMEOUT_SECONDS: 'nope' })
    ).toThrow('CODEX_REVIEW_TIMEOUT_SECONDS must be a finite number.');
    expect(() =>
      resolveReviewStallTimeoutMs({ CODEX_REVIEW_STALL_TIMEOUT_SECONDS: 'NaN' })
    ).toThrow('CODEX_REVIEW_STALL_TIMEOUT_SECONDS must be a finite number.');
    expect(() =>
      resolveReviewStartupLoopTimeoutMs({ CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS: 'NaN' })
    ).toThrow('CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS must be a finite number.');
    expect(() =>
      resolveReviewStartupLoopMinEvents({ CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS: '0.5' })
    ).toThrow('CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS must be a positive integer.');
    expect(() =>
      resolveReviewMonitorIntervalMs({ CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: 'nope' })
    ).toThrow('CODEX_REVIEW_MONITOR_INTERVAL_SECONDS must be a finite number.');
    expect(() =>
      resolveReviewLowSignalTimeoutMs({ CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: 'oops' })
    ).toThrow('CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS must be a finite number.');
    expect(() =>
      resolveReviewVerdictStabilityTimeoutMs({
        CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS: 'oops'
      })
    ).toThrow('CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS must be a finite number.');
    expect(() =>
      resolveReviewMetaSurfaceTimeoutMs({ CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: 'oops' })
    ).toThrow('CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS must be a finite number.');
  });

  it('uses bounded default low-signal, verdict-stability, and meta-surface guard windows', () => {
    expect(resolveReviewLowSignalTimeoutMs({})).toBe(180_000);
    expect(resolveReviewVerdictStabilityTimeoutMs({})).toBe(180_000);
    expect(resolveReviewMetaSurfaceTimeoutMs({})).toBe(180_000);

    expect(resolveReviewLowSignalTimeoutMs({ CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS: '0' })).toBeNull();
    expect(
      resolveReviewVerdictStabilityTimeoutMs({
        CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS: '0'
      })
    ).toBeNull();
    expect(
      resolveReviewMetaSurfaceTimeoutMs({ CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS: '0' })
    ).toBeNull();
  });

  it('derives diff-surface boundaries and architecture touched-path augmentation', async () => {
    const sandbox = await makeSandbox();
    const { manifestPath, runnerLogPath } = await makeManifest(sandbox);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const diffPreflight = await prepareReviewExecutionBoundaryPreflight({
      cliOptions: {},
      manifestPath,
      env: {},
      repoRoot: sandbox,
      reviewSurface: 'diff',
      architectureSurfacePaths: [],
      scopeTouchedPaths: ['scripts/run-review.ts'],
      activeCloseoutBundleRoots: ['out/sample-task'],
      runnerLogExists: true,
      runnerLogPath,
      allowHeavyCommands: false,
      resolveReviewRuntimeContextFn: async () => makeRuntimeContext() as any
    });

    expect(diffPreflight.startupAnchorMode).toBe('diff');
    expect(diffPreflight.enforceStartupAnchorBoundary).toBe(true);
    expect(diffPreflight.enforceActiveCloseoutBundleRereadBoundary).toBe(true);
    expect(diffPreflight.enforceRelevantReinspectionDwellBoundary).toBe(true);
    expect(diffPreflight.lowSignalTimeoutMs).toBe(180_000);
    expect(diffPreflight.verdictStabilityTimeoutMs).toBe(180_000);
    expect(diffPreflight.metaSurfaceTimeoutMs).toBe(180_000);
    expect(diffPreflight.allowedMetaSurfaceKinds).toEqual([]);
    expect(diffPreflight.touchedPaths).toEqual(['scripts/run-review.ts']);

    const architecturePath = join(sandbox, 'docs', 'architecture.md');
    await mkdir(dirname(architecturePath), { recursive: true });
    await writeFile(architecturePath, '# Architecture\n', 'utf8');
    const architecturePreflight = await prepareReviewExecutionBoundaryPreflight({
      cliOptions: {},
      manifestPath,
      env: {},
      repoRoot: sandbox,
      reviewSurface: 'architecture',
      architectureSurfacePaths: [architecturePath],
      scopeTouchedPaths: ['scripts/run-review.ts'],
      activeCloseoutBundleRoots: [],
      runnerLogExists: true,
      runnerLogPath,
      allowHeavyCommands: false,
      resolveReviewRuntimeContextFn: async () => makeRuntimeContext() as any
    });

    expect(architecturePreflight.startupAnchorMode).toBeNull();
    expect(architecturePreflight.enforceStartupAnchorBoundary).toBe(false);
    expect(architecturePreflight.enforceRelevantReinspectionDwellBoundary).toBe(true);
    expect(architecturePreflight.allowedMetaSurfaceKinds).toEqual([
      'architecture-context',
      'review-support',
      'review-docs'
    ]);
    expect(architecturePreflight.allowedMetaSurfacePaths).toEqual([architecturePath]);
    expect(architecturePreflight.touchedPaths).toEqual([
      'scripts/run-review.ts',
      'docs/architecture.md'
    ]);

    const heavyPreflight = await prepareReviewExecutionBoundaryPreflight({
      cliOptions: {},
      manifestPath,
      env: {},
      repoRoot: sandbox,
      reviewSurface: 'diff',
      architectureSurfacePaths: [],
      scopeTouchedPaths: ['scripts/run-review.ts'],
      activeCloseoutBundleRoots: ['out/sample-task'],
      runnerLogExists: true,
      runnerLogPath,
      allowHeavyCommands: true,
      resolveReviewRuntimeContextFn: async () => makeRuntimeContext() as any
    });

    expect(heavyPreflight.startupAnchorMode).toBeNull();
    expect(heavyPreflight.enforceStartupAnchorBoundary).toBe(false);
    expect(heavyPreflight.enforceActiveCloseoutBundleRereadBoundary).toBe(false);
    expect(heavyPreflight.enforceRelevantReinspectionDwellBoundary).toBe(false);
    expect(heavyPreflight.lowSignalTimeoutMs).toBeNull();
    expect(heavyPreflight.verdictStabilityTimeoutMs).toBeNull();
    expect(heavyPreflight.metaSurfaceTimeoutMs).toBeNull();
  });

  it('derives audit-surface startup anchors and env-var allowlists', async () => {
    const sandbox = await makeSandbox();
    const { manifestPath, runnerLogPath } = await makeManifest(sandbox);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const preflight = await prepareReviewExecutionBoundaryPreflight({
      cliOptions: {},
      manifestPath,
      env: {},
      repoRoot: sandbox,
      reviewSurface: 'audit',
      architectureSurfacePaths: [],
      scopeTouchedPaths: [],
      activeCloseoutBundleRoots: [],
      runnerLogExists: true,
      runnerLogPath,
      allowHeavyCommands: false,
      resolveReviewRuntimeContextFn: async () => makeRuntimeContext() as any
    });

    expect(preflight.startupAnchorMode).toBe('audit');
    expect(preflight.enforceStartupAnchorBoundary).toBe(true);
    expect(preflight.auditStartupAnchorPaths).toEqual([manifestPath, runnerLogPath]);
    expect(preflight.allowedMetaSurfacePaths).toEqual([manifestPath, runnerLogPath]);
    expect(preflight.auditStartupAnchorEnvVarPaths).toEqual({
      MANIFEST: manifestPath,
      RUNNER_LOG: runnerLogPath,
      RUN_LOG: runnerLogPath
    });
    expect(preflight.allowedMetaSurfaceEnvVarPaths).toEqual({
      MANIFEST: manifestPath,
      RUNNER_LOG: runnerLogPath,
      RUN_LOG: runnerLogPath
    });
    expect(preflight.allowedMetaSurfaceKinds).toEqual(['run-manifest', 'run-runner-log']);
  });
});
