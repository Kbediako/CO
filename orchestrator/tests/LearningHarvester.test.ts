import { describe, expect, it } from 'vitest';
import { mkdtemp, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { CliManifest } from '../src/cli/types.js';
import { runLearningHarvester } from '../src/learning/harvester.js';

const execFileAsync = promisify(execFile);

function createManifest(taskId: string, runId: string): CliManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    task_id: taskId,
    task_slug: taskId,
    run_id: runId,
    parent_run_id: null,
    pipeline_id: 'learning',
    pipeline_title: 'learning',
    runner: 'codex-cli',
    approval_policy: null,
    status: 'queued',
    status_detail: null,
    started_at: now,
    completed_at: null,
    updated_at: now,
    heartbeat_at: now,
    heartbeat_interval_seconds: 5,
    heartbeat_stale_after_seconds: 30,
    artifact_root: `.runs/${taskId}/cli/${runId}`,
    compat_path: `.runs/${taskId}/cli/${runId}/compat`,
    log_path: `.runs/${taskId}/cli/${runId}/log.ndjson`,
    summary: null,
    metrics_recorded: false,
    resume_token: 'token',
    resume_events: [],
    approvals: [],
    commands: [],
    child_runs: [],
    run_summary_path: null,
    plan_target_id: null,
    instructions_hash: null,
    instructions_sources: []
  };
}

async function initRepo(repoRoot: string): Promise<void> {
  const gitOptions = {
    cwd: repoRoot,
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1'
    }
  };
  await execFileAsync('git', ['init'], gitOptions);
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], gitOptions);
  await execFileAsync('git', ['config', 'user.name', 'learning-test'], gitOptions);
  await writeFile(join(repoRoot, 'README.md'), '# test repo', 'utf8');
  await execFileAsync('git', ['add', '.'], gitOptions);
  await execFileAsync('git', ['commit', '-m', 'init'], gitOptions);
}

describe('LearningHarvester', () => {
  it('captures snapshot metadata and queue payloads', { timeout: 20000 }, async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'learning-harvest-'));
    await initRepo(repoRoot);
    const previousGitConfigGlobal = process.env.GIT_CONFIG_GLOBAL;
    const previousGitConfigSystem = process.env.GIT_CONFIG_SYSTEM;
    const previousGitNoSystem = process.env.GIT_CONFIG_NOSYSTEM;
    process.env.GIT_CONFIG_GLOBAL = '/dev/null';
    process.env.GIT_CONFIG_SYSTEM = '/dev/null';
    process.env.GIT_CONFIG_NOSYSTEM = '1';

    const runsRoot = join(repoRoot, '.runs');
    const manifest = createManifest('0607-continuous-learning-pipeline', 'run-1');
    const manifestPath = join(repoRoot, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify({ ok: true }), 'utf8');
    const promptPath = join(repoRoot, 'prompt.txt');
    await writeFile(promptPath, 'Fix bug prompt', 'utf8');
    const untrackedPath = join(repoRoot, 'untracked.txt');
    await writeFile(untrackedPath, 'untracked content', 'utf8');

    try {
      const result = await runLearningHarvester(manifest, {
        repoRoot,
        runsRoot,
        manifestPath,
        taskId: manifest.task_id,
        runId: manifest.run_id,
        promptPath,
        executionHistoryPath: null,
        diffPath: null
      });

      expect(result.manifest.learning?.snapshot?.status).toBe('captured');
      expect(result.manifest.learning?.snapshot?.tarball_digest.length).toBeGreaterThan(10);
      expect(result.manifest.learning?.queue?.snapshot_id).toBe(result.manifest.learning?.snapshot?.tag);
      const storagePath = result.manifest.learning?.snapshot?.storage_path;
      expect(storagePath).toBeTruthy();
      const storageStat = await stat(join(repoRoot, storagePath ?? ''));
      expect(storageStat.isFile()).toBe(true);
      const { stdout: untrackedContent } = await execFileAsync('tar', [
        '-xOf',
        join(repoRoot, storagePath ?? ''),
        'untracked.txt'
      ]);
      expect(untrackedContent.trim()).toBe('untracked content');
      expect(result.queuePayloadPath).toBeTruthy();
    } finally {
      if (typeof previousGitConfigGlobal === 'undefined') {
        delete process.env.GIT_CONFIG_GLOBAL;
      } else {
        process.env.GIT_CONFIG_GLOBAL = previousGitConfigGlobal;
      }
      if (typeof previousGitConfigSystem === 'undefined') {
        delete process.env.GIT_CONFIG_SYSTEM;
      } else {
        process.env.GIT_CONFIG_SYSTEM = previousGitConfigSystem;
      }
      if (typeof previousGitNoSystem === 'undefined') {
        delete process.env.GIT_CONFIG_NOSYSTEM;
      } else {
        process.env.GIT_CONFIG_NOSYSTEM = previousGitNoSystem;
      }
    }
  });

  it('records snapshot_failed when git operations fail', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'learning-harvest-fail-'));
    const runsRoot = join(repoRoot, '.runs');
    const manifest = createManifest('0607-continuous-learning-pipeline', 'run-2');

    await runLearningHarvester(manifest, {
      repoRoot: join(repoRoot, 'non-repo'),
      runsRoot,
      manifestPath: join(repoRoot, 'manifest.json'),
      taskId: manifest.task_id,
      runId: manifest.run_id,
      maxAttempts: 1
    });

    expect(manifest.learning?.snapshot?.status).toBe('snapshot_failed');
    expect(manifest.learning?.alerts?.length ?? 0).toBeGreaterThan(0);
    expect(manifest.learning?.validation?.status).toBe('snapshot_failed');
  });
});
