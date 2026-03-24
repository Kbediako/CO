import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ReviewExecutionState } from '../scripts/lib/review-execution-state.js';
import { CodexReviewError } from '../scripts/lib/review-execution-runtime.js';
import {
  prepareReviewArtifacts,
  runReviewLaunchAttemptShell
} from '../scripts/lib/review-launch-attempt.js';

const createdSandboxes: string[] = [];

function makeState(repoRoot: string): ReviewExecutionState {
  return new ReviewExecutionState({ repoRoot });
}

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-launch-attempt-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

async function makeManifest(sandbox: string): Promise<string> {
  const runDir = join(sandbox, '.runs', 'sample-task', 'cli', 'sample-run');
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ run_id: 'sample-run' }), 'utf8');
  return manifestPath;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    createdSandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

describe('review-launch-attempt', () => {
  it('prepares prompt and output artifacts beside the manifest review directory', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);

    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Review prompt body', sandbox);

    expect(artifactPaths.reviewDir).toBe(join(sandbox, '.runs', 'sample-task', 'cli', 'sample-run', 'review'));
    await expect(readFile(artifactPaths.promptPath, 'utf8')).resolves.toBe('Review prompt body\n');
    expect(artifactPaths.outputLogPath).toBe(join(artifactPaths.reviewDir, 'output.log'));
    expect(artifactPaths.telemetryPath).toBe(join(artifactPaths.reviewDir, 'telemetry.json'));
  });

  it('fails instead of retrying when explicit base scope would be dropped', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const failureState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', base: 'origin/main' },
        prompt: 'Prompt body',
        retryWithoutScopeFlagsGateError:
          'explicit `--base` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: false,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        runReview: async (resolved) => {
          launchArgs.push(resolved.args);
          throw new CodexReviewError('custom prompt cannot be combined with --base', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: 'custom prompt cannot be combined with --base',
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow('retrying without them would remove explicit review scope');

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--base');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      expect.stringContaining('explicit `--base` review scope must remain auditable'),
      null
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('fails instead of retrying when explicit uncommitted scope would be dropped', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const failureState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', uncommitted: true },
        prompt: 'Prompt body',
        retryWithoutScopeFlagsGateError:
          'explicit `--uncommitted` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: false,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        runReview: async (resolved) => {
          launchArgs.push(resolved.args);
          throw new CodexReviewError('custom prompt cannot be combined with --uncommitted', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: 'custom prompt cannot be combined with --uncommitted',
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow('retrying without them would remove explicit review scope');

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--uncommitted');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      expect.stringContaining('explicit `--uncommitted` review scope must remain auditable'),
      null
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('fails instead of retrying when explicit uncommitted scope is rejected with generic diff-scoping wording', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const failureState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', uncommitted: true },
        prompt: 'Prompt body',
        retryWithoutScopeFlagsGateError:
          'explicit `--uncommitted` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: false,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        runReview: async (resolved) => {
          launchArgs.push(resolved.args);
          throw new CodexReviewError('custom prompt cannot be combined with diff scoping', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: 'custom prompt cannot be combined with diff scoping',
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow('retrying without them would remove explicit review scope');

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--uncommitted');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      expect.stringContaining('explicit `--uncommitted` review scope must remain auditable'),
      null
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('fails instead of retrying without scope flags when the fallback would violate the large-scope gate', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const failureState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', base: 'origin/main' },
        prompt: 'Prompt body',
        retryWithoutScopeFlagsGateError:
          'explicit `--base` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: false,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        runReview: async (resolved) => {
          launchArgs.push(resolved.args);
          throw new CodexReviewError('custom prompt cannot be combined with --base', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: 'custom prompt cannot be combined with --base',
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow(
      'retrying without them would remove explicit review scope'
    );

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--base');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      expect.any(ReviewExecutionState),
      'failed',
      expect.stringContaining('retrying without them would remove explicit review scope'),
      null
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('fails instead of retrying when a prompt incompatibility lists the scope flag only in a usage footer', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const failureState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', base: 'origin/main' },
        prompt: 'Prompt body',
        retryWithoutScopeFlagsGateError:
          'large uncommitted review scope requires explicit scoping or override (3 files, 6 lines; thresholds: 2 files / 2 lines).',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: false,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        runReview: async (resolved) => {
          launchArgs.push(resolved.args);
          throw new CodexReviewError('custom prompt cannot be combined with diff scoping', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: `custom prompt cannot be combined with diff scoping
Usage: codex review [options]
  --base <ref>
  --commit <sha>`,
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow(
      'retrying without them would remove explicit review scope'
    );

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--base');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      expect.stringContaining('retrying without them would remove explicit review scope'),
      null
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('preserves unrelated CLI option failures instead of rewriting them as scope-gate errors', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const failureState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', base: 'origin/main', title: 'Sample review' },
        prompt: 'Prompt body',
        retryWithoutScopeFlagsGateError:
          'large uncommitted review scope requires explicit scoping or override (3 files, 6 lines; thresholds: 2 files / 2 lines).',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: false,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        runReview: async (resolved) => {
          launchArgs.push(resolved.args);
          throw new CodexReviewError('unknown option --title', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: 'unknown option --title',
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow('unknown option --title');

    expect(launchArgs).toHaveLength(2);
    expect(launchArgs[0]).toContain('--base');
    expect(launchArgs[0]).toContain('--title');
    expect(launchArgs[1]).not.toContain('--base');
    expect(launchArgs[1]).toContain('--title');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      'unknown option --title',
      null
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('preserves unrelated CLI option failures when a usage footer lists explicit scope flags', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const failureState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', base: 'origin/main', title: 'Sample review' },
        prompt: 'Prompt body',
        retryWithoutScopeFlagsGateError:
          'large uncommitted review scope requires explicit scoping or override (3 files, 6 lines; thresholds: 2 files / 2 lines).',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: false,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        runReview: async (resolved) => {
          launchArgs.push(resolved.args);
          throw new CodexReviewError('unknown option --title', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: `unknown option --title
Usage: codex review [options]
  --base <ref>
  --commit <sha>`,
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow('unknown option --title');

    expect(launchArgs).toHaveLength(2);
    expect(launchArgs[0]).toContain('--base');
    expect(launchArgs[0]).toContain('--title');
    expect(launchArgs[1]).not.toContain('--base');
    expect(launchArgs[1]).toContain('--title');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      'unknown option --title',
      null
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('fails instead of retrying when a title/base incompatibility would drop explicit scope', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const failureState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', base: 'origin/main', title: 'Sample review' },
        prompt: 'Prompt body',
        retryWithoutScopeFlagsGateError:
          'explicit `--base` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: false,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        runReview: async (resolved) => {
          launchArgs.push(resolved.args);
          throw new CodexReviewError('--title cannot be used with --base', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: '--title cannot be used with --base',
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow('retrying without them would remove explicit review scope');

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--base');
    expect(launchArgs[0]).toContain('--title');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      expect.stringContaining('explicit `--base` review scope must remain auditable'),
      null
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('fails instead of retrying when a quoted explicit base scope rejection would drop scope', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const failureState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', base: 'origin/main', title: 'Sample review' },
        prompt: 'Prompt body',
        retryWithoutScopeFlagsGateError:
          'explicit `--base` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: false,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        runReview: async (resolved) => {
          launchArgs.push(resolved.args);
          throw new CodexReviewError("unknown option '--base'", {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: "unknown option '--base'",
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow('retrying without them would remove explicit review scope');

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--base');
    expect(launchArgs[0]).toContain('--title');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      expect.stringContaining('explicit `--base` review scope must remain auditable'),
      null
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('fails instead of retrying when a quoted title/base incompatibility would drop scope', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const failureState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', base: 'origin/main', title: 'Sample review' },
        prompt: 'Prompt body',
        retryWithoutScopeFlagsGateError:
          'explicit `--base` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: false,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        runReview: async (resolved) => {
          launchArgs.push(resolved.args);
          throw new CodexReviewError('--title cannot be used with "--base"', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: '--title cannot be used with "--base"',
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow('retrying without them would remove explicit review scope');

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--base');
    expect(launchArgs[0]).toContain('--title');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      expect.stringContaining('explicit `--base` review scope must remain auditable'),
      null
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('captures failure state and partial-output hint when the retry also fails on a timeout boundary', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const captureReviewFailureIssueLogFn = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    const timeoutBoundary = {
      kind: 'timeout',
      provenance: 'review-timeout',
      reason: 'review timed out',
      sample: null
    } as const;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let attemptCount = 0;

    await expect(
      runReviewLaunchAttemptShell({
        cliOptions: { task: 'sample-task', uncommitted: true },
        prompt: 'Prompt body',
        runtimeContext: {} as any,
        repoRoot: sandbox,
        manifestPath,
        artifactPaths,
        autoIssueLogEnabled: true,
        telemetryDebugEnabled: false,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
        ensureReviewCommandAvailableFn: async () => {},
        resolveReviewCommandFn: (reviewArgs) => ({ command: 'codex', args: reviewArgs }),
        captureReviewFailureIssueLogFn,
        runReview: async () => {
          attemptCount += 1;
          if (attemptCount === 1) {
            throw new CodexReviewError('custom prompt cannot be combined with --uncommitted', {
              exitCode: 1,
              signal: null,
              timedOut: false,
              outputPreview: 'custom prompt cannot be combined with --uncommitted'
            });
          }
          throw new CodexReviewError('review timed out', {
            exitCode: 1,
            signal: null,
            timedOut: true,
            outputPreview: 'review timed out',
            reviewState: makeState(sandbox),
            terminationBoundary: timeoutBoundary
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toBeInstanceOf(CodexReviewError);

    expect(captureReviewFailureIssueLogFn).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      expect.any(ReviewExecutionState),
      'failed',
      'review timed out',
      timeoutBoundary
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledWith(timeoutBoundary);
    expect(errorSpy).toHaveBeenCalledWith(
      `Review output log (partial): ${join('.runs', 'sample-task', 'cli', 'sample-run', 'review', 'output.log')}`
    );
  });
});
