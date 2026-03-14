import { TaskManager } from '../../manager.js';
import type { ManagerOptions } from '../../manager.js';
import type { TaskContext, ExecutionMode, PlanItem } from '../../types.js';
import { RunManifestWriter } from '../../persistence/RunManifestWriter.js';
import { TaskStateStore } from '../../persistence/TaskStateStore.js';
import {
  CommandPlanner,
  CommandBuilder,
  CommandTester,
  CommandReviewer,
  type PipelineExecutor
} from '../adapters/index.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { CliManifest, PipelineDefinition, PipelineRunExecutionResult } from '../types.js';
import type { RuntimeSelection } from '../runtime/types.js';
import { determineOrchestratorExecutionMode } from './orchestratorExecutionModePolicy.js';
import {
  routeOrchestratorExecution,
  type OrchestratorExecutionRouteOptions
} from './orchestratorExecutionRouter.js';

export type ExecutePipelineOptions = Omit<
  OrchestratorExecutionRouteOptions,
  'applyRuntimeSelection' | 'executeCloudPipeline' | 'runAutoScout' | 'startSubpipeline'
>;

export interface BuildOrchestratorTaskManagerOptionsParams {
  runId: string;
  pipeline: PipelineDefinition;
  executePipeline: PipelineExecutor;
  getResult: () => PipelineRunExecutionResult | null;
  plannerInstance: CommandPlanner | undefined;
  env: EnvironmentPaths;
  modeOverride?: ExecutionMode;
}

export interface ExecuteOrchestratorPipelineWithRouteAdapterParams {
  options: ExecutePipelineOptions;
  applyRuntimeSelection: (manifest: CliManifest, selection: RuntimeSelection) => void;
  executeCloudPipeline: (
    options: ExecutePipelineOptions
  ) => Promise<PipelineRunExecutionResult>;
  runAutoScout: OrchestratorExecutionRouteOptions['runAutoScout'];
  startSubpipeline: OrchestratorExecutionRouteOptions['startSubpipeline'];
  routeExecution?: typeof routeOrchestratorExecution;
}

export function buildOrchestratorTaskManagerOptions(
  params: BuildOrchestratorTaskManagerOptionsParams
): ManagerOptions {
  const planner = params.plannerInstance ?? new CommandPlanner(params.pipeline);
  const builder = new CommandBuilder(params.executePipeline);
  const tester = new CommandTester(params.getResult);
  const reviewer = new CommandReviewer(params.getResult);
  const stateStore = new TaskStateStore({ outDir: params.env.outRoot, runsDir: params.env.runsRoot });
  const manifestWriter = new RunManifestWriter({ runsDir: params.env.runsRoot });

  return {
    planner,
    builder,
    tester,
    reviewer,
    runIdFactory: () => params.runId,
    modePolicy: (task: TaskContext, subtask: PlanItem) =>
      determineOrchestratorExecutionMode(task, subtask, params.modeOverride),
    persistence: { autoStart: true, stateStore, manifestWriter }
  };
}

export function createOrchestratorTaskManager(
  params: BuildOrchestratorTaskManagerOptionsParams
): TaskManager {
  return new TaskManager(buildOrchestratorTaskManagerOptions(params));
}

export async function executeOrchestratorPipelineWithRouteAdapter(
  params: ExecuteOrchestratorPipelineWithRouteAdapterParams
): Promise<PipelineRunExecutionResult> {
  const routeExecution = params.routeExecution ?? routeOrchestratorExecution;
  return routeExecution({
    ...params.options,
    applyRuntimeSelection: params.applyRuntimeSelection,
    executeCloudPipeline: (options) => params.executeCloudPipeline(options),
    runAutoScout: params.runAutoScout,
    startSubpipeline: params.startSubpipeline
  });
}
