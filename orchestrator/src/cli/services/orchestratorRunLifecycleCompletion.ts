import { join } from 'node:path';

import type { ControlPlaneValidationResult } from '../../control-plane/types.js';
import type { SchedulerPlan } from '../../scheduler/types.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { ManifestPersister } from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest, PipelineExecutionResult, PipelineDefinition, RunSummary } from '../types.js';
import {
  applyCloudExecutionToRunSummary,
  applyCloudFallbackToRunSummary,
  applyHandlesToRunSummary,
  applyPrivacyToRunSummary,
  applyRuntimeToRunSummary,
  applyUsageKpiToRunSummary,
  persistRunSummary
} from './runSummaryWriter.js';

export interface OrchestratorRunLifecycleCompletionOptions {
  env: EnvironmentPaths;
  pipeline: Pick<PipelineDefinition, 'id'>;
  manifest: CliManifest;
  paths: RunPaths;
  runSummary: RunSummary;
  schedulerPlan: SchedulerPlan;
  controlPlaneResult: ControlPlaneValidationResult;
  runEvents?: Pick<RunEventPublisher, 'runCompleted'>;
  persister?: ManifestPersister;
  finalizePlan(options: {
    manifest: CliManifest;
    paths: RunPaths;
    plan: SchedulerPlan;
    persister?: ManifestPersister;
  }): Promise<void>;
  applySchedulerToRunSummary(runSummary: RunSummary, plan: SchedulerPlan): void;
  applyControlPlaneToRunSummary(runSummary: RunSummary, result: ControlPlaneValidationResult): void;
}

export async function completeOrchestratorRunLifecycle(
  options: OrchestratorRunLifecycleCompletionOptions
): Promise<PipelineExecutionResult> {
  await options.finalizePlan({
    manifest: options.manifest,
    paths: options.paths,
    plan: options.schedulerPlan,
    persister: options.persister
  });

  options.applySchedulerToRunSummary(options.runSummary, options.schedulerPlan);
  applyRuntimeToRunSummary(options.runSummary, options.manifest);
  applyHandlesToRunSummary(options.runSummary, options.manifest);
  applyPrivacyToRunSummary(options.runSummary, options.manifest);
  applyCloudExecutionToRunSummary(options.runSummary, options.manifest);
  applyCloudFallbackToRunSummary(options.runSummary, options.manifest);
  applyUsageKpiToRunSummary(options.runSummary, options.manifest);
  options.applyControlPlaneToRunSummary(options.runSummary, options.controlPlaneResult);

  await persistRunSummary(
    options.env,
    options.paths,
    options.manifest,
    options.runSummary,
    options.persister
  );
  options.runEvents?.runCompleted({
    pipelineId: options.pipeline.id,
    status: options.manifest.status,
    manifestPath: options.paths.manifestPath,
    runSummaryPath: options.manifest.run_summary_path,
    metricsPath: join(options.env.runsRoot, options.env.taskId, 'metrics.json'),
    summary: options.manifest.summary ?? null
  });

  return {
    manifest: options.manifest,
    runSummary: options.runSummary
  };
}
