import { resolveEnvironmentPaths } from '../../../../scripts/lib/run-manifests.js';
import { sanitizeTaskId } from '../../persistence/sanitizeTaskId.js';

export type EnvironmentPaths = ReturnType<typeof resolveEnvironmentPaths>;

export function resolveEnvironment(): EnvironmentPaths {
  const { repoRoot, runsRoot, outRoot, taskId: rawTaskId } = resolveEnvironmentPaths();
  return { repoRoot, runsRoot, outRoot, taskId: normalizeTaskId(rawTaskId) };
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
