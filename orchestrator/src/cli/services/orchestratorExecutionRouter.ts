import type { TaskContext, ExecutionMode, PlanItem } from '../../types.js';
import { CLI_EXECUTION_MODE_PARSER, resolveRequiresCloudPolicy } from '../../utils/executionMode.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { ManifestPersister } from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import type { RuntimeMode, RuntimeModeSource, RuntimeSelection } from '../runtime/types.js';
import type {
  CliManifest,
  PipelineDefinition,
  PipelineExecutionResult,
  PipelineRunExecutionResult
} from '../types.js';
import type { AdvancedAutopilotDecision } from '../utils/advancedAutopilot.js';
export { routeOrchestratorExecution } from './orchestratorExecutionRouteDecisionShell.js';

export type OrchestratorAutoScoutOutcome =
  | { status: 'recorded'; path: string }
  | { status: 'timeout' | 'error'; message: string };

export interface OrchestratorAutoScoutParams {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  mode: ExecutionMode;
  pipeline: PipelineDefinition;
  target: PlanItem;
  task: TaskContext;
  envOverrides?: NodeJS.ProcessEnv;
  advancedDecision: AdvancedAutopilotDecision;
}

export interface OrchestratorExecutionRouteOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  mode: ExecutionMode;
  runtimeModeRequested: RuntimeMode;
  runtimeModeSource: RuntimeModeSource;
  executionModeOverride?: ExecutionMode;
  target: PlanItem;
  task: TaskContext;
  runEvents?: RunEventPublisher;
  eventStream?: RunEventStream;
  onEventEntry?: (entry: RunEventStreamEntry) => void;
  persister?: ManifestPersister;
  envOverrides?: NodeJS.ProcessEnv;
  applyRuntimeSelection(manifest: CliManifest, selection: RuntimeSelection): void;
  executeCloudPipeline(
    options: OrchestratorExecutionRouteOptions
  ): Promise<PipelineRunExecutionResult>;
  runAutoScout(params: OrchestratorAutoScoutParams): Promise<OrchestratorAutoScoutOutcome>;
  startSubpipeline(options: {
    pipelineId: string;
    executionModeOverride?: ExecutionMode;
    runtimeModeRequested: RuntimeMode;
  }): Promise<PipelineExecutionResult>;
}

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
