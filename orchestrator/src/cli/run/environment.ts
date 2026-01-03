import type { resolveEnvironmentPaths } from '../../../../scripts/lib/run-manifests.js';
import { sanitizeTaskId } from '../../persistence/sanitizeTaskId.js';

export type EnvironmentPaths = ReturnType<typeof resolveEnvironmentPaths>;

export function normalizeTaskId(value: string): string {
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

export function normalizeEnvironmentPaths(paths: EnvironmentPaths): EnvironmentPaths {
  return { ...paths, taskId: normalizeTaskId(paths.taskId) };
}

export { sanitizeTaskId };
