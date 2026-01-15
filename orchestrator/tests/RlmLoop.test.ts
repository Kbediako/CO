import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runRlmLoop } from '../src/cli/rlm/runner.js';

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('rlm loop', () => {
  it('stops when validator passes after failing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-loop-'));
    const validatorResults = [1, 0];

    const result = await runRlmLoop({
      mode: 'iterative',
      context: {
        object_id: 'sha256:test',
        index_path: '.runs/test/rlm/context/index.json',
        chunk_count: 1
      },
      goal: 'Fix tests',
      validatorCommand: 'npm test',
      maxIterations: 5,
      roles: 'single',
      subagentsEnabled: false,
      repoRoot: tempDir,
      runDir: join(tempDir, 'rlm'),
      runAgent: async () => ({ output: 'Summary: applied fix' }),
      runValidator: async () => ({
        exitCode: validatorResults.shift() ?? 1,
        stdout: 'validator output',
        stderr: ''
      }),
      collectDiffSummary: async () => 'clean'
    });

    expect(result.exitCode).toBe(0);
    expect(result.state.final?.status).toBe('passed');
    expect(result.state.iterations).toHaveLength(2);
  });

  it('stops at max iterations when validator keeps failing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-loop-'));

    const result = await runRlmLoop({
      mode: 'iterative',
      context: {
        object_id: 'sha256:test',
        index_path: '.runs/test/rlm/context/index.json',
        chunk_count: 1
      },
      goal: 'Fix tests',
      validatorCommand: 'npm test',
      maxIterations: 2,
      roles: 'single',
      subagentsEnabled: false,
      repoRoot: tempDir,
      runDir: join(tempDir, 'rlm'),
      runAgent: async () => ({ output: 'Summary: attempt' }),
      runValidator: async () => ({ exitCode: 1, stdout: '', stderr: 'fail' }),
      collectDiffSummary: async () => 'dirty'
    });

    expect(result.exitCode).toBe(3);
    expect(result.state.final?.status).toBe('max_iterations');
    expect(result.state.iterations).toHaveLength(2);
  });
});
