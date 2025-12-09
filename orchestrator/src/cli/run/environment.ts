import { join, resolve } from 'node:path';
import { sanitizeTaskId } from '../../persistence/sanitizeTaskId.js';

const DEFAULT_TASK_ID = '0101';

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

  const rawTaskId = process.env.MCP_RUNNER_TASK_ID ?? DEFAULT_TASK_ID;
  const taskId = normalizeTaskId(rawTaskId);

  return { repoRoot, runsRoot, outRoot, taskId };
}

function normalizeTaskId(value: string): string {
  try {
    return sanitizeTaskId(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (value) {
      throw new Error(`Invalid MCP_RUNNER_TASK_ID "${value}": ${message}`);
    }
    throw new Error(`Invalid MCP_RUNNER_TASK_ID: ${message}`);
  }
}

export { sanitizeTaskId };
