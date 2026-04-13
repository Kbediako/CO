import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

import {
  resolveEnvironmentPaths,
  resolveEnvironmentPathsForProcess
} from '../../scripts/lib/run-manifests.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID,
  codexTask: process.env.CODEX_ORCHESTRATOR_TASK_ID,
  taskAlias: process.env.TASK,
  pipeline: process.env.CODEX_ORCHESTRATOR_PIPELINE_ID,
  manifest: process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH,
  preserveArtifactRoots: process.env.CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS
};

let workspaceRoot: string;

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'env-paths-'));
  delete process.env.CODEX_ORCHESTRATOR_ROOT;
  delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
  delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
  delete process.env.MCP_RUNNER_TASK_ID;
  delete process.env.CODEX_ORCHESTRATOR_TASK_ID;
  delete process.env.TASK;
  delete process.env.CODEX_ORCHESTRATOR_PIPELINE_ID;
  delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
  delete process.env.CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS;
});

afterEach(async () => {
  restoreEnv('CODEX_ORCHESTRATOR_ROOT', ORIGINAL_ENV.root);
  restoreEnv('CODEX_ORCHESTRATOR_RUNS_DIR', ORIGINAL_ENV.runs);
  restoreEnv('CODEX_ORCHESTRATOR_OUT_DIR', ORIGINAL_ENV.out);
  restoreEnv('MCP_RUNNER_TASK_ID', ORIGINAL_ENV.task);
  restoreEnv('CODEX_ORCHESTRATOR_TASK_ID', ORIGINAL_ENV.codexTask);
  restoreEnv('TASK', ORIGINAL_ENV.taskAlias);
  restoreEnv('CODEX_ORCHESTRATOR_PIPELINE_ID', ORIGINAL_ENV.pipeline);
  restoreEnv('CODEX_ORCHESTRATOR_MANIFEST_PATH', ORIGINAL_ENV.manifest);
  restoreEnv(
    'CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS',
    ORIGINAL_ENV.preserveArtifactRoots
  );
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('resolveEnvironmentPaths', () => {
  it('resolves relative env paths against cwd and repo root', () => {
    const relativeRoot = relative(process.cwd(), workspaceRoot) || '.';
    process.env.CODEX_ORCHESTRATOR_ROOT = relativeRoot;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = '.runs-local';
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = 'out-local';
    process.env.MCP_RUNNER_TASK_ID = 'task-xyz';

    const env = resolveEnvironmentPaths();
    const repoRoot = resolve(process.cwd(), relativeRoot);

    expect(env.repoRoot).toBe(repoRoot);
    expect(env.runsRoot).toBe(resolve(repoRoot, '.runs-local'));
    expect(env.outRoot).toBe(resolve(repoRoot, 'out-local'));
    expect(env.taskId).toBe('task-xyz');
  });

  it('keeps absolute env paths and defaults task id', () => {
    const repoRoot = resolve(workspaceRoot, 'abs-root');
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(repoRoot, 'custom-runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(repoRoot, 'custom-out');

    const env = resolveEnvironmentPaths();

    expect(env.repoRoot).toBe(repoRoot);
    expect(env.runsRoot).toBe(join(repoRoot, 'custom-runs'));
    expect(env.outRoot).toBe(join(repoRoot, 'custom-out'));
    expect(env.taskId).toBe('0101');
  });

  it('uses the provider issue workspace cwd when a worker review wrapper has a stale shared root', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = 'stale-linear-issue';
    process.env.CODEX_ORCHESTRATOR_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(repoRoot, '.runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(repoRoot, 'out');

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(issueWorkspacePath, '.runs'));
    expect(env.outRoot).toBe(join(issueWorkspacePath, 'out'));
    expect(env.taskId).toBe(taskId);
  });

  it('rebases configured runs layout roots to the provider issue workspace', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(repoRoot, 'runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(repoRoot, 'out');

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(issueWorkspacePath, 'runs'));
    expect(env.outRoot).toBe(join(issueWorkspacePath, 'out'));
    expect(env.taskId).toBe(taskId);
  });

  it('scopes relative custom artifact roots to the provider issue workspace', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join('artifacts', 'runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join('artifacts', 'out');

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(issueWorkspacePath, 'artifacts', 'runs'));
    expect(env.outRoot).toBe(join(issueWorkspacePath, 'artifacts', 'out'));
    expect(env.taskId).toBe(taskId);
  });

  it('preserves configured runs layout roots when a stale manifest is outside that runs root', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    const staleManifestPath = join(repoRoot, '.runs', taskId, 'cli', 'provider-parent-run', 'manifest.json');
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(repoRoot, 'runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(repoRoot, 'out');
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = staleManifestPath;
    process.env.CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS = '1';

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(repoRoot, 'runs'));
    expect(env.outRoot).toBe(join(repoRoot, 'out'));
    expect(env.taskId).toBe(taskId);
  });

  it('rebases default shared roots when the configured provider root is already the issue workspace', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = issueWorkspacePath;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(repoRoot, '.runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(repoRoot, 'out');

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(issueWorkspacePath, '.runs'));
    expect(env.outRoot).toBe(join(issueWorkspacePath, 'out'));
    expect(env.taskId).toBe(taskId);
  });

  it('preserves shared artifact roots when the active provider manifest has no workspace counterpart', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    const sharedManifestPath = join(repoRoot, '.runs', taskId, 'cli', 'provider-parent-run', 'manifest.json');
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(repoRoot, '.runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(repoRoot, 'out');
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = sharedManifestPath;
    process.env.CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS = '1';

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(repoRoot, '.runs'));
    expect(env.outRoot).toBe(join(repoRoot, 'out'));
    expect(env.taskId).toBe(taskId);
  });

  it('preserves relative shared artifact roots when a provider manifest has no workspace counterpart', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    const sharedManifestPath = join(repoRoot, '.runs', taskId, 'cli', 'provider-parent-run', 'manifest.json');
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = '.runs';
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = 'out';
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = relative(repoRoot, sharedManifestPath);
    process.env.CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS = '1';

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(repoRoot, '.runs'));
    expect(env.outRoot).toBe(join(repoRoot, 'out'));
    expect(env.taskId).toBe(taskId);
  });

  it('preserves relative shared runs layout roots when a provider manifest has no workspace counterpart', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    const sharedManifestPath = join(repoRoot, 'runs', taskId, 'cli', 'provider-parent-run', 'manifest.json');
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = 'runs';
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = 'out';
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = relative(repoRoot, sharedManifestPath);
    process.env.CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS = '1';

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(repoRoot, 'runs'));
    expect(env.outRoot).toBe(join(repoRoot, 'out'));
    expect(env.taskId).toBe(taskId);
  });

  it('normalizes absolute shared roots before applying provider issue workspace override', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = join(repoRoot, 'nested', '..');
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(repoRoot, '.runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(repoRoot, 'out');

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(issueWorkspacePath, '.runs'));
    expect(env.outRoot).toBe(join(issueWorkspacePath, 'out'));
  });

  it('preserves explicit external artifact roots for provider issue workspace helpers', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const externalRoot = resolve(workspaceRoot, 'external-artifacts');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(externalRoot, 'runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(externalRoot, 'out');

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(externalRoot, 'runs'));
    expect(env.outRoot).toBe(join(externalRoot, 'out'));
  });

  it('preserves custom absolute shared artifact roots without a workspace manifest counterpart', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(repoRoot, 'artifacts', 'runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(repoRoot, 'artifacts', 'out');

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(repoRoot, 'artifacts', 'runs'));
    expect(env.outRoot).toBe(join(repoRoot, 'artifacts', 'out'));
  });

  it('rebases custom absolute shared artifact roots after a workspace manifest counterpart is proven', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    const sharedManifestPath = join(
      repoRoot,
      'artifacts',
      'runs',
      taskId,
      'cli',
      'provider-parent-run',
      'manifest.json'
    );
    const workspaceManifestPath = join(
      issueWorkspacePath,
      'artifacts',
      'runs',
      taskId,
      'cli',
      'provider-parent-run',
      'manifest.json'
    );
    await mkdir(issueWorkspacePath, { recursive: true });
    await mkdir(dirname(workspaceManifestPath), { recursive: true });
    await writeFile(workspaceManifestPath, '{}', 'utf8');
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'provider-linear-worker';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(repoRoot, 'artifacts', 'runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(repoRoot, 'artifacts', 'out');
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = sharedManifestPath;
    process.env.CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS = '1';

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(issueWorkspacePath);
    expect(env.runsRoot).toBe(join(issueWorkspacePath, 'artifacts', 'runs'));
    expect(env.outRoot).toBe(join(issueWorkspacePath, 'artifacts', 'out'));
  });

  it('keeps the configured root when the cwd workspace is outside provider-worker context', async () => {
    const repoRoot = resolve(workspaceRoot, 'repo-root');
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(repoRoot, '.workspaces', taskId);
    await mkdir(issueWorkspacePath, { recursive: true });
    process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
    process.env.CODEX_ORCHESTRATOR_PIPELINE_ID = 'docs-review';
    process.env.MCP_RUNNER_TASK_ID = taskId;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(repoRoot, '.runs');
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(repoRoot, 'out');

    const env = resolveEnvironmentPathsForProcess(process.env, issueWorkspacePath);

    expect(env.repoRoot).toBe(repoRoot);
    expect(env.runsRoot).toBe(join(repoRoot, '.runs'));
    expect(env.outRoot).toBe(join(repoRoot, 'out'));
    expect(env.taskId).toBe(taskId);
  });
});
