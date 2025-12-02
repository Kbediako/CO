import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { appendCommandError, bootstrapManifest } from '../src/cli/run/manifest.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { CliManifestCommand, PipelineDefinition } from '../src/cli/types.js';

const MAX_ERROR_DETAIL_CHARS = 8 * 1024;

describe('appendCommandError', () => {
  it('truncates oversized stderr payloads and flags the truncation', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-error-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'test-task'
    };

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    const runId = 'run-append-error';
    const { manifest, paths } = await bootstrapManifest(runId, {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const command: CliManifestCommand = {
      index: 1,
      id: 'stage-test',
      title: 'Stage Test',
      command: 'echo test',
      kind: 'command',
      status: 'failed',
      started_at: null,
      completed_at: null,
      exit_code: null,
      summary: null,
      log_path: null,
      error_file: null,
      sub_run_id: null
    };

    const longStderr = 'x'.repeat(MAX_ERROR_DETAIL_CHARS + 500);
    const relativePath = await appendCommandError(env, paths, manifest, command, 'command-failed', {
      exit_code: 1,
      stderr: longStderr,
      stdout_truncated: true
    });

    const errorPath = join(repoRoot, relativePath);
    const payload = JSON.parse(await readFile(errorPath, 'utf-8')) as {
      details: Record<string, unknown>;
    };

    expect(typeof payload.details.stderr).toBe('string');
    const stderr = payload.details.stderr as string;
    expect(stderr.length).toBe(MAX_ERROR_DETAIL_CHARS + 1);
    expect(stderr.endsWith('…')).toBe(true);
    expect(payload.details.stderr_truncated).toBe(true);
    expect(payload.details.stdout_truncated).toBe(true);
  });
});
