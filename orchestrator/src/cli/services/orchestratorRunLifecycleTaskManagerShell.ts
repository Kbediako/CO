import type { CommandPlanner } from '../adapters/index.js';
import { createOrchestratorTaskManager } from './orchestratorExecutionRouteAdapterShell.js';
import { attachOrchestratorPlanTargetTracker } from './orchestratorPlanTargetTracker.js';
import {
  createOrchestratorRunLifecycleExecutionRegistration,
  type OrchestratorRunLifecycleExecutionRegistrationOptions
} from './orchestratorRunLifecycleExecutionRegistration.js';

export interface CreateOrchestratorRunLifecycleTaskManagerParams
  extends Omit<OrchestratorRunLifecycleExecutionRegistrationOptions, 'executePipeline'> {
  runId: string;
  planner: CommandPlanner | undefined;
  executePipeline: OrchestratorRunLifecycleExecutionRegistrationOptions['executePipeline'];
}

export function createOrchestratorRunLifecycleTaskManager(
  params: CreateOrchestratorRunLifecycleTaskManagerParams
) {
  const registration = createOrchestratorRunLifecycleExecutionRegistration({
    env: params.env,
    pipeline: params.pipeline,
    manifest: params.manifest,
    paths: params.paths,
    taskContext: params.taskContext,
    runEvents: params.runEvents,
    eventStream: params.eventStream,
    onEventEntry: params.onEventEntry,
    persister: params.persister,
    envOverrides: params.envOverrides,
    runtimeModeRequested: params.runtimeModeRequested,
    runtimeModeSource: params.runtimeModeSource,
    executionModeOverride: params.executionModeOverride,
    executePipeline: params.executePipeline
  });

  const manager = createOrchestratorTaskManager({
    runId: params.runId,
    pipeline: params.pipeline,
    executePipeline: registration.executePipeline,
    getResult: registration.getResult,
    plannerInstance: params.planner,
    env: params.env,
    modeOverride: params.executionModeOverride
  });

  attachOrchestratorPlanTargetTracker({
    manager,
    manifest: params.manifest,
    paths: params.paths,
    persister: params.persister
  });

  return manager;
}
