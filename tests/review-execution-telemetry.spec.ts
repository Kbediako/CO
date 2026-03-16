import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewExecutionState } from '../scripts/lib/review-execution-state.js';
import {
  writeReviewExecutionTelemetry
} from '../scripts/lib/review-execution-telemetry.js';

const createdSandboxes: string[] = [];

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-execution-telemetry-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    createdSandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

describe('review-execution-telemetry', () => {
  it('persists success telemetry built from the provided state helper', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = join(sandbox, 'review', 'output.log');
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
    await mkdir(join(sandbox, 'review'), { recursive: true });
    const state = new ReviewExecutionState({ repoRoot: sandbox });

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'succeeded',
      outputLogPath,
      repoRoot: sandbox,
      telemetryPath,
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(payload).not.toBeNull();
    expect(payload?.status).toBe('succeeded');
    expect(payload?.termination_boundary).toBeNull();
    await expect(readFile(telemetryPath, 'utf8')).resolves.toContain('"status": "succeeded"');
  });

  it('persists failure telemetry with an explicit termination boundary', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = join(sandbox, 'review', 'output.log');
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
    await mkdir(join(sandbox, 'review'), { recursive: true });
    const state = new ReviewExecutionState({ repoRoot: sandbox });
    const terminationBoundary = {
      kind: 'stall',
      provenance: 'output-stall',
      reason: 'review stalled',
      sample: null
    } as const;

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'failed',
      error: 'review stalled',
      terminationBoundary,
      outputLogPath,
      repoRoot: sandbox,
      telemetryPath,
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(payload?.termination_boundary).toEqual(terminationBoundary);
    await expect(readFile(telemetryPath, 'utf8')).resolves.toContain('"kind": "stall"');
  });

  it('preserves omitted termination-boundary inference for failed telemetry', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = join(sandbox, 'review', 'output.log');
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
    await mkdir(join(sandbox, 'review'), { recursive: true });
    const state = new ReviewExecutionState({ repoRoot: sandbox });

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'failed',
      error: 'codex review timed out after 30s',
      outputLogPath,
      repoRoot: sandbox,
      telemetryPath,
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(payload?.termination_boundary?.kind).toBe('timeout');
    await expect(readFile(telemetryPath, 'utf8')).resolves.toContain('"kind": "timeout"');
  });

  it('logs and suppresses persistence failures', async () => {
    const sandbox = await makeSandbox();
    const state = new ReviewExecutionState({ repoRoot: sandbox });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'succeeded',
      outputLogPath: join(sandbox, 'review', 'output.log'),
      repoRoot: sandbox,
      telemetryPath: join(sandbox, 'missing', 'telemetry.json'),
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(payload).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[run-review] failed to persist review telemetry:')
    );
  });
});
