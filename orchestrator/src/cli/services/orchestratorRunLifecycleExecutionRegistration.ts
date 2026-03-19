import type { PipelineExecutor } from '../adapters/index.js';
import type { ExecutionMode, PlanItem, TaskContext } from '../../types.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { ManifestPersister } from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import type { RuntimeMode, RuntimeModeSource } from '../runtime/types.js';
import type { CliManifest, PipelineDefinition, PipelineRunExecutionResult } from '../types.js';

export interface OrchestratorRunLifecycleRegisteredPipelineOptions {
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
  persister: ManifestPersister;
  envOverrides: NodeJS.ProcessEnv;
}

export interface OrchestratorRunLifecycleExecutionRegistrationOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  taskContext: TaskContext;
  runEvents?: RunEventPublisher;
  eventStream?: RunEventStream;
  onEventEntry?: (entry: RunEventStreamEntry) => void;
  persister: ManifestPersister;
  envOverrides: NodeJS.ProcessEnv;
  runtimeModeRequested: RuntimeMode;
  runtimeModeSource: RuntimeModeSource;
  executionModeOverride?: ExecutionMode;
  executePipeline(
    options: OrchestratorRunLifecycleRegisteredPipelineOptions
  ): Promise<PipelineRunExecutionResult>;
}

export function createOrchestratorRunLifecycleExecutionRegistration(
  options: OrchestratorRunLifecycleExecutionRegistrationOptions
): {
  executePipeline: PipelineExecutor;
  getResult: () => PipelineRunExecutionResult | null;
} {
  let latestPipelineResult: PipelineRunExecutionResult | null = null;
  const executingByKey = new Map<string, Promise<PipelineRunExecutionResult>>();

  const executePipeline: PipelineExecutor = async (input) => {
    const key = `${input.mode}:${input.target.id}`;
    const existing = executingByKey.get(key);
    if (existing) {
      return existing;
    }

    const executing = options
      .executePipeline({
        env: options.env,
        pipeline: options.pipeline,
        manifest: options.manifest,
        paths: options.paths,
        mode: input.mode,
        runtimeModeRequested: options.runtimeModeRequested,
        runtimeModeSource: options.runtimeModeSource,
        executionModeOverride: options.executionModeOverride,
        target: input.target,
        task: options.taskContext,
        runEvents: options.runEvents,
        eventStream: options.eventStream,
        onEventEntry: options.onEventEntry,
        persister: options.persister,
        envOverrides: options.envOverrides
      })
      .then((result) => {
        latestPipelineResult = result;
        return result;
      });

    executingByKey.set(key, executing);
    return executing;
  };

  const getResult = () => latestPipelineResult;
  return { executePipeline, getResult };
}
