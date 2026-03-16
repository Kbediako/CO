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

  it('retries without scope flags when the scoped launch rejects prompt and scope flag pairing', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = await makeManifest(sandbox);
    const artifactPaths = await prepareReviewArtifacts(manifestPath, 'Prompt body', sandbox);
    const launchArgs: string[][] = [];
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await runReviewLaunchAttemptShell({
      cliOptions: { task: 'sample-task', uncommitted: true },
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
        if (launchArgs.length === 1) {
          throw new CodexReviewError('custom prompt cannot be combined with --uncommitted', {
            exitCode: 1,
            signal: null,
            timedOut: false,
            outputPreview: 'custom prompt cannot be combined with --uncommitted'
          });
        }
        return { preview: 'ok', state: makeState(sandbox) };
      },
      writeTelemetry: async () => null,
      logTelemetrySummary: () => {
        throw new Error('telemetry summary should not run when telemetry persistence returns null');
      },
      logTerminationBoundaryFallback: () => {
        throw new Error('termination fallback should not run on successful retry');
      }
    });

    expect(launchArgs).toHaveLength(2);
    expect(launchArgs[0]).toContain('--uncommitted');
    expect(launchArgs[1]).not.toContain('--uncommitted');
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
