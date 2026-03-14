import { readFile } from 'node:fs/promises';

import type { TaskContext, ExecutionMode, PlanItem } from '../types.js';
import { resolveEnvironmentPaths } from '../../../scripts/lib/run-manifests.js';
import { normalizeEnvironmentPaths } from './run/environment.js';
import type { EnvironmentPaths } from './run/environment.js';
import { finalizeStatus } from './run/manifest.js';
import { persistManifest } from './run/manifestPersister.js';
import type {
  CliManifest,
  PipelineDefinition,
  PipelineExecutionResult,
  PipelineRunExecutionResult,
  PlanPreviewResult,
  PlanOptions,
  StartOptions,
  ResumeOptions,
  StatusOptions,
} from './types.js';
import type { RunPaths } from './run/runPaths.js';
import { logger } from '../logger.js';
import { ControlPlaneService } from './services/controlPlaneService.js';
import { SchedulerService } from './services/schedulerService.js';
import type { AdvancedAutopilotDecision } from './utils/advancedAutopilot.js';
import {
  type OrchestratorAutoScoutOutcome
} from './services/orchestratorExecutionRouter.js';
import { recordOrchestratorAutoScoutEvidence } from './services/orchestratorAutoScoutEvidenceRecorder.js';
import {
  runOrchestratorRunLifecycle,
  type OrchestratorRunLifecycleContext
} from './services/orchestratorRunLifecycleOrchestrationShell.js';
import {
  executeOrchestratorPipelineRouteEntryShell,
  type ExecutePipelineOptions
} from './services/orchestratorExecutionRouteAdapterShell.js';
import { runOrchestratorControlPlaneLifecycleShell } from './services/orchestratorControlPlaneLifecycleShell.js';
import { runOrchestratorStartPreparationShell } from './services/orchestratorStartPreparationShell.js';
import { runOrchestratorResumePreparationShell } from './services/orchestratorResumePreparationShell.js';
import { runOrchestratorStatusShell } from './services/orchestratorStatusShell.js';
import { runOrchestratorPlanShell } from './services/orchestratorPlanShell.js';
import {
  applyRequestedRuntimeModeToManifest,
  applyRuntimeSelectionToManifest
} from './services/orchestratorRuntimeManifestMutation.js';

const resolveBaseEnvironment = (): EnvironmentPaths =>
  normalizeEnvironmentPaths(resolveEnvironmentPaths());

const RESUME_PRE_START_FAILURE_STATUS_DETAIL = 'resume-pre-start-failed';

export class CodexOrchestrator {
  private readonly controlPlane = new ControlPlaneService();
  private readonly scheduler = new SchedulerService();

  constructor(private readonly baseEnv: EnvironmentPaths = resolveBaseEnvironment()) {}

  async start(options: StartOptions = {}): Promise<PipelineExecutionResult> {
    const { preparation, runId, runtimeModeResolution, manifest, paths, persister } =
      await runOrchestratorStartPreparationShell({
        baseEnv: this.baseEnv,
        options,
        applyRequestedRuntimeMode: applyRequestedRuntimeModeToManifest
      });

    return await runOrchestratorControlPlaneLifecycleShell({
      repoRoot: preparation.env.repoRoot,
      paths,
      pipeline: preparation.pipeline,
      manifest,
      emitter: options.runEvents,
      runWithLifecycle: ({ runEvents, eventStream, onEventEntry }) =>
        this.performRunLifecycle({
          env: preparation.env,
          pipeline: preparation.pipeline,
          manifest,
          paths,
          planner: preparation.planner,
          taskContext: preparation.taskContext,
          runId,
          runEvents,
          eventStream,
          onEventEntry,
          persister,
          envOverrides: preparation.envOverrides,
          runtimeModeRequested: runtimeModeResolution.mode,
          runtimeModeSource: runtimeModeResolution.source,
          executionModeOverride: options.executionMode
        })
    });
  }

  async resume(options: ResumeOptions): Promise<PipelineExecutionResult> {
    const { preparation, runtimeModeResolution, manifest, paths, persister } =
      await runOrchestratorResumePreparationShell({
        baseEnv: this.baseEnv,
        options,
        validateResumeToken: this.validateResumeToken.bind(this),
        applyRequestedRuntimeMode: applyRequestedRuntimeModeToManifest
      });

    return await runOrchestratorControlPlaneLifecycleShell({
      repoRoot: preparation.env.repoRoot,
      paths,
      pipeline: preparation.pipeline,
      manifest,
      emitter: options.runEvents,
      onStartFailure: async () => {
        finalizeStatus(manifest, 'failed', RESUME_PRE_START_FAILURE_STATUS_DETAIL);
        try {
          await persistManifest(paths, manifest, persister, { force: true });
        } catch (persistError) {
          logger.warn(
            `Failed to persist resume pre-start failure state: ${
              (persistError as Error)?.message ?? String(persistError)
            }`
          );
        }
      },
      runWithLifecycle: ({ runEvents, eventStream, onEventEntry }) =>
        this.performRunLifecycle({
          env: preparation.env,
          pipeline: preparation.pipeline,
          manifest,
          paths,
          planner: preparation.planner,
          taskContext: preparation.taskContext,
          runId: manifest.run_id,
          runEvents,
          eventStream,
          onEventEntry,
          persister,
          envOverrides: preparation.envOverrides,
          runtimeModeRequested: runtimeModeResolution.mode,
          runtimeModeSource: runtimeModeResolution.source
        })
    });
  }

  async status(options: StatusOptions): Promise<CliManifest> {
    return await runOrchestratorStatusShell({
      baseEnv: this.baseEnv,
      options
    });
  }

  async plan(options: PlanOptions = {}): Promise<PlanPreviewResult> {
    return await runOrchestratorPlanShell({
      baseEnv: this.baseEnv,
      options
    });
  }

  private async executePipeline(options: ExecutePipelineOptions): Promise<PipelineRunExecutionResult> {
    return executeOrchestratorPipelineRouteEntryShell({
      options,
      applyRuntimeSelection: applyRuntimeSelectionToManifest,
      runAutoScout: this.runAutoScout.bind(this),
      startPipeline: this.start.bind(this)
    });
  }

  private async runAutoScout(params: {
    env: EnvironmentPaths;
    paths: RunPaths;
    manifest: CliManifest;
    mode: ExecutionMode;
    pipeline: PipelineDefinition;
    target: PlanItem;
    task: TaskContext;
    envOverrides?: NodeJS.ProcessEnv;
    advancedDecision: AdvancedAutopilotDecision;
  }): Promise<OrchestratorAutoScoutOutcome> {
    return await recordOrchestratorAutoScoutEvidence(params);
  }

  private async performRunLifecycle(context: OrchestratorRunLifecycleContext): Promise<PipelineExecutionResult> {
    return await runOrchestratorRunLifecycle({
      ...context,
      executePipeline: (options) => this.executePipeline(options),
      controlPlaneGuard: (options) => this.controlPlane.guard(options),
      createSchedulerPlan: (options) => this.scheduler.createPlanForRun(options),
      finalizePlan: (options) => this.scheduler.finalizePlan(options),
      applySchedulerToRunSummary: (summary, plan) => this.scheduler.applySchedulerToRunSummary(summary, plan),
      applyControlPlaneToRunSummary: (summary, result) =>
        this.controlPlane.applyControlPlaneToRunSummary(summary, result)
    });
  }

  private async validateResumeToken(paths: RunPaths, manifest: CliManifest, provided: string | null): Promise<void> {
    let stored = manifest.resume_token;
    if (!stored) {
      try {
        stored = (await readFile(paths.resumeTokenPath, 'utf8')).trim();
      } catch (error) {
        throw new Error(`Resume token missing for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`);
      }
    }
    if (provided && stored !== provided) {
      throw new Error('Resume token mismatch.');
    }
  }
}
