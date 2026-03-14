import type { TaskContext, ExecutionMode, PlanItem } from '../../types.js';
import { CLI_EXECUTION_MODE_PARSER, resolveRequiresCloudPolicy } from '../../utils/executionMode.js';

export function requiresCloudOrchestratorExecution(task: TaskContext, subtask: PlanItem): boolean {
  const requiresCloudFlag = resolveRequiresCloudPolicy({
    boolFlags: [subtask.requires_cloud, subtask.requiresCloud],
    metadata: {
      executionMode:
        typeof subtask.metadata?.executionMode === 'string'
          ? (subtask.metadata.executionMode as string)
          : null,
      mode: typeof subtask.metadata?.mode === 'string' ? (subtask.metadata.mode as string) : null
    },
    metadataOrder: ['executionMode', 'mode'],
    parseMode: CLI_EXECUTION_MODE_PARSER
  });
  if (requiresCloudFlag !== null) {
    return requiresCloudFlag;
  }
  return Boolean(task.metadata?.execution?.parallel);
}

export function determineOrchestratorExecutionMode(
  task: TaskContext,
  subtask: PlanItem,
  overrideMode?: ExecutionMode
): ExecutionMode {
  if (overrideMode) {
    return overrideMode;
  }
  if (requiresCloudOrchestratorExecution(task, subtask)) {
    return 'cloud';
  }
  return 'mcp';
}
