import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

import { resolveEnvironmentPaths } from '../../scripts/lib/run-manifests.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
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
});

afterEach(async () => {
  restoreEnv('CODEX_ORCHESTRATOR_ROOT', ORIGINAL_ENV.root);
  restoreEnv('CODEX_ORCHESTRATOR_RUNS_DIR', ORIGINAL_ENV.runs);
  restoreEnv('CODEX_ORCHESTRATOR_OUT_DIR', ORIGINAL_ENV.out);
  restoreEnv('MCP_RUNNER_TASK_ID', ORIGINAL_ENV.task);
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
});
