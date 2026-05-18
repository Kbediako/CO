import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runCodexReview } from '../scripts/lib/review-execution-runtime.js';

const createdSandboxes: string[] = [];

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-execution-runtime-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  await Promise.all(
    createdSandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

function baseRunOptions(sandbox: string) {
  return {
    command: process.execPath,
    args: ['-e', 'process.exit(0)'],
    env: process.env,
    activeCloseoutBundleRoots: [],
    blockHeavyCommands: false,
    allowValidationCommandIntents: false,
    timeoutMs: 5_000,
    stallTimeoutMs: null,
    startupLoopTimeoutMs: null,
    startupLoopMinEvents: 0,
    monitorIntervalMs: null,
    lowSignalTimeoutMs: null,
    verdictStabilityTimeoutMs: null,
    metaSurfaceTimeoutMs: null,
    enforceStartupAnchorBoundary: false,
    enforceActiveCloseoutBundleRereadBoundary: false,
    enforceRelevantReinspectionDwellBoundary: false,
    allowedMetaSurfaceKinds: [],
    scopeMode: 'uncommitted' as const,
    startupAnchorMode: null,
    auditStartupAnchorPaths: [],
    allowedMetaSurfacePaths: [],
    auditStartupAnchorEnvVarPaths: {},
    allowedMetaSurfaceEnvVarPaths: {},
    repoRoot: sandbox,
    touchedPaths: [],
    outputLogPath: join(sandbox, 'review-output.log')
  };
}

describe('review-execution-runtime', () => {
  it('fails closed when stdin prompt delivery is requested without a stdin pipe', async () => {
    const sandbox = await makeSandbox();

    await expect(
      runCodexReview({
        ...baseRunOptions(sandbox),
        stdinInput: 'authoritative prompt\n',
        stdio: ['ignore', 'pipe', 'pipe']
      })
    ).rejects.toThrow('codex review stdin prompt requested but child stdin is not available');
  });
});
