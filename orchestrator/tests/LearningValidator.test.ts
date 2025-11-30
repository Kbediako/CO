import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';

import type { CliManifest } from '../src/cli/types.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import { runScenarioValidation } from '../src/learning/validator.js';

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
    instructions_sources: [],
    prompt_packs: [],
    guardrails_required: true,
    tfgrpo: null
  };
}

async function initRepo(repoRoot: string): Promise<void> {
  await execFileAsync('git', ['init'], { cwd: repoRoot });
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot });
  await execFileAsync('git', ['config', 'user.name', 'learning-test'], { cwd: repoRoot });
  await writeFile(join(repoRoot, 'README.md'), '# test repo', 'utf8');
  await execFileAsync('git', ['add', '.'], { cwd: repoRoot });
  await execFileAsync('git', ['commit', '-m', 'init'], { cwd: repoRoot });
}

function buildEnv(repoRoot: string, runsRoot: string, taskId: string): EnvironmentPaths {
  return {
    repoRoot,
    runsRoot,
    outRoot: join(repoRoot, 'out'),
    taskId
  };
}

describe('LearningValidator', () => {
  it('marks validation as validated when commands succeed', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'learning-validator-success-'));
    await initRepo(repoRoot);
    const runsRoot = join(repoRoot, '.runs');
    const manifest = createManifest('0607-continuous-learning-pipeline', 'run-success');
    const env = buildEnv(repoRoot, runsRoot, manifest.task_id);
    const paths = resolveRunPaths(env, manifest.run_id);

    const learningDir = join(paths.runDir, 'learning');
    await mkdir(learningDir, { recursive: true });
    const scenarioPath = join(learningDir, 'scenario.json');
    await writeFile(
      scenarioPath,
      JSON.stringify(
        {
          id: 'learning-success',
          entrypoint: 'echo ok',
          commands: ['echo ok'],
          validation: { requiresCleanFixture: false }
        },
        null,
        2
      ),
      'utf8'
    );

    manifest.learning = {
      validation: { mode: 'per-task', grouping: null, status: 'pending' },
      scenario: {
        path: relative(repoRoot, scenarioPath),
        generated_at: new Date().toISOString(),
        source: 'execution_history',
        status: 'synthesized',
        attempts: 1,
        partial_path: null,
        manual_template: null,
        approver: null,
        reason: null
      },
      alerts: [],
      approvals: []
    };

    await runScenarioValidation({
      manifest,
      repoRoot,
      runsRoot,
      taskId: manifest.task_id,
      runId: manifest.run_id,
      paths,
      scenarioPath
    });

    expect(manifest.learning?.validation?.status).toBe('validated');
    expect(manifest.learning?.validation?.log_path).toBeTruthy();
  });

  it('marks snapshot_failed when a command exits non-zero', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'learning-validator-fail-'));
    await initRepo(repoRoot);
    const runsRoot = join(repoRoot, '.runs');
    const manifest = createManifest('0607-continuous-learning-pipeline', 'run-fail');
    const env = buildEnv(repoRoot, runsRoot, manifest.task_id);
    const paths = resolveRunPaths(env, manifest.run_id);

    const learningDir = join(paths.runDir, 'learning');
    await mkdir(learningDir, { recursive: true });
    const scenarioPath = join(learningDir, 'scenario.json');
    await writeFile(
      scenarioPath,
      JSON.stringify({ id: 'learning-fail', entrypoint: 'false', commands: ['false'], validation: { requiresCleanFixture: false } }, null, 2),
      'utf8'
    );

    manifest.learning = {
      validation: { mode: 'per-task', grouping: null, status: 'pending' },
      scenario: {
        path: relative(repoRoot, scenarioPath),
        generated_at: new Date().toISOString(),
        source: 'execution_history',
        status: 'synthesized',
        attempts: 1,
        partial_path: null,
        manual_template: null,
        approver: null,
        reason: null
      },
      alerts: [],
      approvals: []
    };

    await runScenarioValidation({
      manifest,
      repoRoot,
      runsRoot,
      taskId: manifest.task_id,
      runId: manifest.run_id,
      paths,
      scenarioPath
    });

    expect(manifest.learning?.validation?.status).toBe('snapshot_failed');
    expect(manifest.learning?.validation?.log_path).toBeTruthy();
  });

  it('marks stalled_snapshot when repo is dirty and clean fixture is required', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'learning-validator-dirty-'));
    await initRepo(repoRoot);
    await writeFile(join(repoRoot, 'untracked.txt'), 'dirty', 'utf8');
    const runsRoot = join(repoRoot, '.runs');
    const manifest = createManifest('0607-continuous-learning-pipeline', 'run-dirty');
    const env = buildEnv(repoRoot, runsRoot, manifest.task_id);
    const paths = resolveRunPaths(env, manifest.run_id);

    const learningDir = join(paths.runDir, 'learning');
    await mkdir(learningDir, { recursive: true });
    const scenarioPath = join(learningDir, 'scenario.json');
    await writeFile(
      scenarioPath,
      JSON.stringify({ id: 'learning-dirty', entrypoint: 'echo ok', commands: ['echo ok'], validation: { requiresCleanFixture: true } }, null, 2),
      'utf8'
    );

    manifest.learning = {
      validation: { mode: 'per-task', grouping: null, status: 'pending' },
      scenario: {
        path: relative(repoRoot, scenarioPath),
        generated_at: new Date().toISOString(),
        source: 'execution_history',
        status: 'synthesized',
        attempts: 1,
        partial_path: null,
        manual_template: null,
        approver: null,
        reason: null
      },
      alerts: [],
      approvals: []
    };

    await runScenarioValidation({
      manifest,
      repoRoot,
      runsRoot,
      taskId: manifest.task_id,
      runId: manifest.run_id,
      paths,
      scenarioPath
    });

    expect(manifest.learning?.validation?.status).toBe('stalled_snapshot');
    expect(manifest.learning?.validation?.git_status_path).toBeTruthy();
    const gitStatusPath = manifest.learning?.validation?.git_status_path;
    if (gitStatusPath) {
      const statResult = await stat(join(repoRoot, gitStatusPath));
      expect(statResult.isFile()).toBe(true);
    }
  });
});
