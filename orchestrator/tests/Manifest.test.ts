import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { appendCommandError, bootstrapManifest, loadManifest } from '../src/cli/run/manifest.js';
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

describe('loadManifest', () => {
  it('resolves manifests by run id across task directories', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-load-'));
    const targetTask = 'task-target';
    const requesterTask = 'task-requester';
    const runId = '2026-02-14T00-00-00-000Z-load-test';

    const targetEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: targetTask
    };
    const requesterEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: requesterTask
    };

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    await bootstrapManifest(runId, {
      env: targetEnv,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const loaded = await loadManifest(requesterEnv, runId);
    expect(loaded.manifest.task_id).toBe(targetTask);
    expect(loaded.paths.manifestPath).toContain(
      join('.runs', targetTask, 'cli', runId, 'manifest.json')
    );
  });

  it('ignores non-manifest local-mcp stubs and falls back to task cli manifests', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-load-stub-'));
    const targetTask = 'task-target';
    const requesterTask = 'task-requester';
    const runId = '2026-02-14T00-00-00-000Z-load-stub';

    const targetEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: targetTask
    };
    const requesterEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: requesterTask
    };

    const localCompatPath = join(repoRoot, '.runs', 'local-mcp', runId, 'manifest.json');
    await mkdir(join(repoRoot, '.runs', 'local-mcp', runId), { recursive: true });
    await writeFile(localCompatPath, JSON.stringify({ redirect_to: '.runs/invalid-path' }), 'utf8');

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    await bootstrapManifest(runId, {
      env: targetEnv,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const loaded = await loadManifest(requesterEnv, runId);
    expect(loaded.manifest.task_id).toBe(targetTask);
    expect(loaded.paths.manifestPath).toContain(
      join('.runs', targetTask, 'cli', runId, 'manifest.json')
    );
  });

  it('falls back when local-mcp symlink is dangling', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-load-dangling-'));
    const targetTask = 'task-target';
    const requesterTask = 'task-requester';
    const runId = '2026-02-14T00-00-00-000Z-load-dangling';

    const targetEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: targetTask
    };
    const requesterEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: requesterTask
    };

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    await bootstrapManifest(runId, {
      env: targetEnv,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const localCompatPath = join(repoRoot, '.runs', 'local-mcp', runId, 'manifest.json');
    await rm(localCompatPath, { force: true });
    await symlink('missing-manifest.json', localCompatPath);

    const loaded = await loadManifest(requesterEnv, runId);
    expect(loaded.manifest.task_id).toBe(targetTask);
    expect(loaded.paths.manifestPath).toContain(
      join('.runs', targetTask, 'cli', runId, 'manifest.json')
    );
  });
});
