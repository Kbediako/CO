import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const DEFAULT_TASK_ID = process.env.MCP_RUNNER_TASK_ID ?? '0101';

export interface EnvironmentPaths {
  repoRoot: string;
  runsRoot: string;
  outRoot: string;
  taskId: string;
}

export function resolveEnvironment(): EnvironmentPaths {
  const repoRoot = resolve(process.env.CODEX_ORCHESTRATOR_ROOT ?? process.cwd());
  const runsRoot = resolve(process.env.CODEX_ORCHESTRATOR_RUNS_DIR ?? join(repoRoot, '.runs'));
  const outRoot = resolve(process.env.CODEX_ORCHESTRATOR_OUT_DIR ?? join(repoRoot, 'out'));

  const taskId = sanitizeTaskId(process.env.MCP_RUNNER_TASK_ID ?? DEFAULT_TASK_ID);

  return { repoRoot, runsRoot, outRoot, taskId };
}

export function sanitizeTaskId(value: string): string {
  if (!value) {
    return DEFAULT_TASK_ID;
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
}

export async function ensureDirectories(paths: string[]): Promise<void> {
  await Promise.all(paths.map((dir) => mkdir(dir, { recursive: true })));
}

export function taskRunsDir(env: EnvironmentPaths): string {
  return join(env.runsRoot, env.taskId, 'cli');
}

export function legacyRunsDir(env: EnvironmentPaths): string {
  return join(env.runsRoot, env.taskId, 'mcp');
}

export function localCompatibilityDir(env: EnvironmentPaths): string {
  return join(env.runsRoot, 'local-mcp');
}
