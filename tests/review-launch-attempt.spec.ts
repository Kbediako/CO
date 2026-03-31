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

function reviewLaunchContext(
  scopeFlagMode: 'commit' | 'base' | 'uncommitted' | null,
  promptDelivery: 'inline' | 'artifact-only' = scopeFlagMode === null ? 'inline' : 'artifact-only',
  options: {
    reviewerVisibleContextTransport?: 'inline-prompt' | 'scoped-title' | 'artifact-only';
    reviewerVisibleTitleSource?: 'user' | 'notes-surface' | null;
  } = {}
) {
  return {
    scope_flag_mode: scopeFlagMode,
    prompt_delivery: promptDelivery,
    reviewer_visible_context_transport:
      options.reviewerVisibleContextTransport ??
      (scopeFlagMode === null ? 'inline-prompt' : 'artifact-only'),
    reviewer_visible_title_source: options.reviewerVisibleTitleSource ?? null
  } as const;
}

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

  it('launches explicit base scope without an inline prompt argument', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const successState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await runReviewLaunchAttemptShell({
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
        return {
          preview: 'stdout-ok',
          state: successState,
          terminationBoundary: null
        };
      },
      writeTelemetry,
      logTelemetrySummary: () => {
        throw new Error('telemetry summary should not run when telemetry persistence returns null');
      },
      logTerminationBoundaryFallback
    });

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toEqual(['review', '--base', 'origin/main']);
    expect(launchArgs[0]).not.toContain('Prompt body');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      successState,
      'succeeded',
      null,
      null,
      reviewLaunchContext('base')
    );
    expect(logTerminationBoundaryFallback).not.toHaveBeenCalled();
  });

  it('launches explicit commit scope without an inline prompt argument', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const successState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await runReviewLaunchAttemptShell({
      cliOptions: { task: 'sample-task', commit: 'ce9314aa8' },
      prompt: 'Prompt body',
      retryWithoutScopeFlagsGateError:
        'explicit `--commit` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.',
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
        return {
          preview: 'stdout-ok',
          state: successState,
          terminationBoundary: null
        };
      },
      writeTelemetry,
      logTelemetrySummary: () => {
        throw new Error('telemetry summary should not run when telemetry persistence returns null');
      },
      logTerminationBoundaryFallback
    });

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toEqual(['review', '--commit', 'ce9314aa8']);
    expect(launchArgs[0]).not.toContain('Prompt body');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      successState,
      'succeeded',
      null,
      null,
      reviewLaunchContext('commit')
    );
    expect(logTerminationBoundaryFallback).not.toHaveBeenCalled();
  });

  it('launches explicit base scope with bounded scoped title transport when provided', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const successState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await runReviewLaunchAttemptShell({
      cliOptions: {
        task: 'sample-task',
        base: 'origin/main',
        title: 'Surface: diff | Goal: scoped transport',
        titleSource: 'notes-surface'
      },
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
        return {
          preview: 'stdout-ok',
          state: successState,
          terminationBoundary: null
        };
      },
      writeTelemetry,
      logTelemetrySummary: () => {
        throw new Error('telemetry summary should not run when telemetry persistence returns null');
      },
      logTerminationBoundaryFallback
    });

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toEqual([
      'review',
      '--title',
      'Surface: diff | Goal: scoped transport',
      '--base',
      'origin/main'
    ]);
    expect(launchArgs[0]).not.toContain('Prompt body');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      successState,
      'succeeded',
      null,
      null,
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'notes-surface'
      })
    );
    expect(logTerminationBoundaryFallback).not.toHaveBeenCalled();
  });

  it('launches explicit uncommitted scope without an inline prompt argument', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    const successState = makeState(sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await runReviewLaunchAttemptShell({
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
        return {
          preview: 'stdout-ok',
          state: successState,
          terminationBoundary: null
        };
      },
      writeTelemetry,
      logTelemetrySummary: () => {
        throw new Error('telemetry summary should not run when telemetry persistence returns null');
      },
      logTerminationBoundaryFallback
    });

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toEqual(['review', '--uncommitted']);
    expect(launchArgs[0]).not.toContain('Prompt body');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      successState,
      'succeeded',
      null,
      null,
      reviewLaunchContext('uncommitted')
    );
    expect(logTerminationBoundaryFallback).not.toHaveBeenCalled();
  });

  it('preserves impossible prompt-scope incompatibility errors once scoped launch already omitted the inline prompt', async () => {
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
    ).rejects.toThrow('custom prompt cannot be combined with diff scoping');

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--base');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      'custom prompt cannot be combined with diff scoping',
      null,
      reviewLaunchContext('base')
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('fails instead of retrying when explicit base scope is rejected with a direct scope-flag error', async () => {
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
          throw new CodexReviewError('unknown option --base', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: 'unknown option --base',
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
      null,
      reviewLaunchContext('base')
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

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--base');
    expect(launchArgs[0]).toContain('--title');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      'unknown option --title',
      null,
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'user'
      })
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

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--base');
    expect(launchArgs[0]).toContain('--title');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      'unknown option --title',
      null,
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'user'
      })
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('preserves prompt incompatibility failures for unrelated options even when a usage footer lists scope flags', async () => {
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
          throw new CodexReviewError('custom prompt cannot be combined with --title', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: `custom prompt cannot be combined with --title
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
    ).rejects.toThrow('custom prompt cannot be combined with --title');

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toContain('--base');
    expect(launchArgs[0]).toContain('--title');
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      'custom prompt cannot be combined with --title',
      null,
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'user'
      })
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('does not retry when dropping scope flags would not change the resolved review command', async () => {
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
        cliOptions: { task: 'sample-task', title: 'Sample review' },
        prompt: 'Prompt body',
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
          throw new CodexReviewError('custom prompt cannot be combined with --title', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: 'custom prompt cannot be combined with --title',
            reviewState: failureState
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toThrow('custom prompt cannot be combined with --title');

    expect(launchArgs).toHaveLength(1);
    expect(launchArgs[0]).toEqual(['review', '--title', 'Sample review', 'Prompt body']);
    expect(writeTelemetry).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).toHaveBeenCalledWith(
      failureState,
      'failed',
      'custom prompt cannot be combined with --title',
      null,
      reviewLaunchContext(null, 'inline')
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
      null,
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'user'
      })
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
      null,
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'user'
      })
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
      null,
      reviewLaunchContext('base', 'artifact-only', {
        reviewerVisibleContextTransport: 'scoped-title',
        reviewerVisibleTitleSource: 'user'
      })
    );
    expect(logTerminationBoundaryFallback).toHaveBeenCalledTimes(1);
  });

  it('does not retry into a timeout boundary after explicit uncommitted scope is rejected', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const writeTelemetry = vi.fn().mockResolvedValue(null);
    const captureReviewFailureIssueLogFn = vi.fn().mockResolvedValue(null);
    const logTerminationBoundaryFallback = vi.fn();
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
          throw new CodexReviewError('custom prompt cannot be combined with --uncommitted', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: 'custom prompt cannot be combined with --uncommitted'
          });
        },
        writeTelemetry,
        logTelemetrySummary: () => {
          throw new Error('telemetry summary should not run when telemetry persistence returns null');
        },
        logTerminationBoundaryFallback
      })
    ).rejects.toBeInstanceOf(CodexReviewError);

    expect(attemptCount).toBe(1);
    expect(captureReviewFailureIssueLogFn).toHaveBeenCalledTimes(1);
    expect(writeTelemetry).not.toHaveBeenCalled();
    expect(logTerminationBoundaryFallback).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Review output log (partial):')
    );
  });
});
