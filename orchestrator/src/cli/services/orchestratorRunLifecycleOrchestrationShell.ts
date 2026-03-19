import type { TaskManager } from '../../manager.js';
import type { ControlPlaneValidationResult } from '../../control-plane/types.js';
import type { SchedulerPlan } from '../../scheduler/types.js';
import type { TaskContext, ExecutionMode } from '../../types.js';
import type { CommandPlanner } from '../adapters/index.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { ManifestPersister } from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import type { RuntimeMode, RuntimeModeSource } from '../runtime/types.js';
import type {
  CliManifest,
  PipelineDefinition,
  PipelineExecutionResult,
  RunSummary
} from '../types.js';
import type { ControlPlaneService } from './controlPlaneService.js';
import { getPrivacyGuard } from './execRuntime.js';
import { completeOrchestratorRunLifecycle } from './orchestratorRunLifecycleCompletion.js';
import {
  createOrchestratorRunLifecycleTaskManager,
  type CreateOrchestratorRunLifecycleTaskManagerParams
} from './orchestratorRunLifecycleTaskManagerShell.js';
import type { SchedulerService } from './schedulerService.js';

export interface OrchestratorRunLifecycleContext {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  planner: CommandPlanner;
  taskContext: TaskContext;
  runId: string;
  runEvents?: RunEventPublisher;
  eventStream?: RunEventStream;
  onEventEntry?: (entry: RunEventStreamEntry) => void;
  persister: ManifestPersister;
  envOverrides: NodeJS.ProcessEnv;
  runtimeModeRequested: RuntimeMode;
  runtimeModeSource: RuntimeModeSource;
  executionModeOverride?: ExecutionMode;
}

export interface RunOrchestratorRunLifecycleOptions extends OrchestratorRunLifecycleContext {
  executePipeline: CreateOrchestratorRunLifecycleTaskManagerParams['executePipeline'];
  controlPlaneGuard: (args: Parameters<ControlPlaneService['guard']>[0]) => ReturnType<ControlPlaneService['guard']>;
  createSchedulerPlan: (
    args: Parameters<SchedulerService['createPlanForRun']>[0]
  ) => ReturnType<SchedulerService['createPlanForRun']>;
  finalizePlan: (args: Parameters<SchedulerService['finalizePlan']>[0]) => ReturnType<SchedulerService['finalizePlan']>;
  applySchedulerToRunSummary: (summary: RunSummary, plan: SchedulerPlan) => void;
  applyControlPlaneToRunSummary: (
    summary: RunSummary,
    result: ControlPlaneValidationResult
  ) => void;
}

export interface RunOrchestratorRunLifecycleGuardAndPlanningOptions
  extends Pick<
    OrchestratorRunLifecycleContext,
    'env' | 'pipeline' | 'manifest' | 'paths' | 'taskContext' | 'runId' | 'persister'
  > {
  controlPlaneGuard: RunOrchestratorRunLifecycleOptions['controlPlaneGuard'];
  createSchedulerPlan: RunOrchestratorRunLifecycleOptions['createSchedulerPlan'];
}

export async function executeOrchestratorRunLifecycleTask(
  manager: Pick<TaskManager, 'execute'>,
  taskContext: TaskContext,
  pipelineId: string,
  runEvents?: RunEventPublisher
): Promise<RunSummary> {
  try {
    return await manager.execute(taskContext);
  } catch (error) {
    runEvents?.runError({
      pipelineId,
      message: (error as Error)?.message ?? String(error),
      stageId: null
    });
    throw error;
  }
}

export async function runOrchestratorRunLifecycleGuardAndPlanning(
  options: RunOrchestratorRunLifecycleGuardAndPlanningOptions
): Promise<{ controlPlaneResult: ControlPlaneValidationResult; schedulerPlan: SchedulerPlan }> {
  const controlPlaneResult = await options.controlPlaneGuard({
    env: options.env,
    manifest: options.manifest,
    paths: options.paths,
    pipeline: options.pipeline,
    task: options.taskContext,
    runId: options.runId,
    requestedBy: { actorId: 'codex-cli', channel: 'cli', name: 'Codex CLI' },
    persister: options.persister
  });

  const schedulerPlan = await options.createSchedulerPlan({
    env: options.env,
    manifest: options.manifest,
    paths: options.paths,
    controlPlaneResult,
    persister: options.persister
  });

  return { controlPlaneResult, schedulerPlan };
}

export async function runOrchestratorRunLifecycle(
  options: RunOrchestratorRunLifecycleOptions
): Promise<PipelineExecutionResult> {
  const manager = createOrchestratorRunLifecycleTaskManager({
    runId: options.runId,
    env: options.env,
    pipeline: options.pipeline,
    manifest: options.manifest,
    paths: options.paths,
    planner: options.planner,
    taskContext: options.taskContext,
    runEvents: options.runEvents,
    eventStream: options.eventStream,
    onEventEntry: options.onEventEntry,
    persister: options.persister,
    envOverrides: options.envOverrides,
    runtimeModeRequested: options.runtimeModeRequested,
    runtimeModeSource: options.runtimeModeSource,
    executionModeOverride: options.executionModeOverride,
    executePipeline: options.executePipeline
  });

  getPrivacyGuard().reset();

  const { controlPlaneResult, schedulerPlan } = await runOrchestratorRunLifecycleGuardAndPlanning({
    env: options.env,
    pipeline: options.pipeline,
    manifest: options.manifest,
    paths: options.paths,
    taskContext: options.taskContext,
    runId: options.runId,
    persister: options.persister,
    controlPlaneGuard: options.controlPlaneGuard,
    createSchedulerPlan: options.createSchedulerPlan
  });

  const runSummary = await executeOrchestratorRunLifecycleTask(
    manager,
    options.taskContext,
    options.pipeline.id,
    options.runEvents
  );

  return await completeOrchestratorRunLifecycle({
    env: options.env,
    pipeline: options.pipeline,
    manifest: options.manifest,
    paths: options.paths,
    runSummary,
    schedulerPlan,
    controlPlaneResult,
    runEvents: options.runEvents,
    persister: options.persister,
    finalizePlan: options.finalizePlan,
    applySchedulerToRunSummary: options.applySchedulerToRunSummary,
    applyControlPlaneToRunSummary: options.applyControlPlaneToRunSummary
  });
}
