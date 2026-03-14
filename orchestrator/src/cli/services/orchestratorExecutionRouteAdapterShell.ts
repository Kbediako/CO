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
import type {
  CliManifest,
  PipelineDefinition,
  PipelineExecutionResult,
  PipelineRunExecutionResult,
  StartOptions
} from '../types.js';
import type { RuntimeSelection } from '../runtime/types.js';
import { determineOrchestratorExecutionMode } from './orchestratorExecutionModePolicy.js';
import {
  routeOrchestratorExecution,
  type OrchestratorExecutionRouteOptions
} from './orchestratorExecutionRouter.js';
import { runOrchestratorCloudExecutionLifecycleShell } from './orchestratorCloudExecutionLifecycleShell.js';

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

type StartSubpipelineRun = (
  options: Pick<
    StartOptions,
    'taskId' | 'pipelineId' | 'parentRunId' | 'format' | 'executionMode' | 'runtimeMode'
  >
) => Promise<PipelineExecutionResult>;

export interface ExecuteOrchestratorPipelineRouteEntryShellParams {
  options: ExecutePipelineOptions;
  applyRuntimeSelection: (manifest: CliManifest, selection: RuntimeSelection) => void;
  runAutoScout: OrchestratorExecutionRouteOptions['runAutoScout'];
  startPipeline: StartSubpipelineRun;
  executePipelineWithRouteAdapter?: typeof executeOrchestratorPipelineWithRouteAdapter;
  runCloudExecutionLifecycleShell?: typeof runOrchestratorCloudExecutionLifecycleShell;
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

export async function executeOrchestratorPipelineRouteEntryShell(
  params: ExecuteOrchestratorPipelineRouteEntryShellParams
): Promise<PipelineRunExecutionResult> {
  const executePipelineWithRouteAdapter =
    params.executePipelineWithRouteAdapter ?? executeOrchestratorPipelineWithRouteAdapter;
  const runCloudExecutionLifecycle =
    params.runCloudExecutionLifecycleShell ?? runOrchestratorCloudExecutionLifecycleShell;

  return executePipelineWithRouteAdapter({
    options: params.options,
    applyRuntimeSelection: params.applyRuntimeSelection,
    executeCloudPipeline: (options) =>
      runCloudExecutionLifecycle({
        ...options,
        runAutoScout: params.runAutoScout
      }),
    runAutoScout: params.runAutoScout,
    startSubpipeline: ({ pipelineId, executionModeOverride, runtimeModeRequested }) =>
      params.startPipeline({
        taskId: params.options.env.taskId,
        pipelineId,
        parentRunId: params.options.manifest.run_id,
        format: 'json',
        executionMode: executionModeOverride,
        runtimeMode: runtimeModeRequested
      }),
    routeExecution: params.routeExecution
  });
}
