import { readFile } from 'node:fs/promises';

import type { TaskContext, ExecutionMode, PlanItem } from '../types.js';
import { resolveEnvironmentPaths } from '../../../scripts/lib/run-manifests.js';
import { normalizeEnvironmentPaths } from './run/environment.js';
import type { EnvironmentPaths } from './run/environment.js';
import { loadManifest, updateHeartbeat, appendSummary, finalizeStatus, resetForResume, recordResumeEvent } from './run/manifest.js';
import { ManifestPersister, persistManifest } from './run/manifestPersister.js';
import { resolveRuntimeActivitySnapshot, type RuntimeActivitySnapshot } from './run/runtimeActivity.js';
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
import { isoTimestamp } from './utils/time.js';
import type { RunPaths } from './run/runPaths.js';
import { relativeToRepo } from './run/runPaths.js';
import { logger } from '../logger.js';
import { PipelineResolver } from './services/pipelineResolver.js';
import { ControlPlaneService } from './services/controlPlaneService.js';
import { SchedulerService } from './services/schedulerService.js';
import {
  prepareRun,
  resolvePipelineForResume,
  overrideTaskEnvironment
} from './services/runPreparation.js';
import { loadPackageConfig, loadUserConfig } from './config/userConfig.js';
import { formatRepoConfigRequiredError, isRepoConfigRequired } from './config/repoConfigPolicy.js';
import { resolveRuntimeMode } from './runtime/index.js';
import type { RuntimeMode, RuntimeSelection } from './runtime/types.js';
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
        applyRequestedRuntimeMode: this.applyRequestedRuntimeMode.bind(this)
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
    const env = this.baseEnv;
    const { manifest, paths } = await loadManifest(env, options.runId);
    const actualEnv = overrideTaskEnvironment(env, manifest.task_id);

    const resolver = new PipelineResolver();
    const designConfig = await resolver.loadDesignConfig(actualEnv.repoRoot);

    const repoConfigRequired = isRepoConfigRequired(process.env);
    const userConfig = await loadUserConfig(actualEnv, { allowPackageFallback: !repoConfigRequired });
    if (repoConfigRequired && userConfig?.source !== 'repo') {
      throw new Error(formatRepoConfigRequiredError(actualEnv.repoRoot));
    }
    const fallbackConfig =
      !repoConfigRequired && manifest.pipeline_id === 'rlm' && userConfig?.source === 'repo'
        ? await loadPackageConfig(actualEnv)
        : null;
    const pipeline = resolvePipelineForResume(actualEnv, manifest, userConfig, fallbackConfig);
    const envOverrides = resolver.resolveDesignEnvOverrides(designConfig, pipeline.id);
    await this.validateResumeToken(paths, manifest, options.resumeToken ?? null);
    recordResumeEvent(manifest, {
      actor: options.actor ?? 'cli',
      reason: options.reason ?? 'manual-resume',
      outcome: 'accepted'
    });
    resetForResume(manifest);
    updateHeartbeat(manifest);
    const preparation = await prepareRun({
      baseEnv: actualEnv,
      pipeline,
      runtimeModeDefault: userConfig?.runtimeMode ?? null,
      resolver,
      taskIdOverride: manifest.task_id,
      targetStageId: options.targetStageId,
      planTargetFallback: manifest.plan_target_id ?? null,
      envOverrides
    });
    if (preparation.configNotice && !(manifest.summary ?? '').includes(preparation.configNotice)) {
      appendSummary(manifest, preparation.configNotice);
    }
    const runtimeModeResolution = resolveRuntimeMode({
      flag: options.runtimeMode,
      env: { ...process.env, ...(preparation.envOverrides ?? {}) },
      configDefault: preparation.runtimeModeDefault,
      manifestMode: manifest.runtime_mode_requested ?? manifest.runtime_mode ?? null,
      preferManifest: true
    });
    this.applyRequestedRuntimeMode(manifest, runtimeModeResolution.mode);
    manifest.plan_target_id = preparation.planPreview?.targetId ?? preparation.plannerTargetId ?? null;
    const persister = new ManifestPersister({
      manifest,
      paths,
      persistIntervalMs: Math.max(1000, manifest.heartbeat_interval_seconds * 1000)
    });
    await persister.schedule({ manifest: true, heartbeat: true, force: true });

    return await runOrchestratorControlPlaneLifecycleShell({
      repoRoot: preparation.env.repoRoot,
      paths,
      pipeline,
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
          pipeline,
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
    const env = this.baseEnv;
    const { manifest, paths } = await loadManifest(env, options.runId);
    const activity = await resolveRuntimeActivitySnapshot(manifest, paths);
    if (options.format === 'json') {
      const payload = this.buildStatusPayload(env, manifest, paths, activity);
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      return manifest;
    }
    this.renderStatus(manifest, activity);
    return manifest;
  }

  async plan(options: PlanOptions = {}): Promise<PlanPreviewResult> {
    const preparation = await prepareRun({
      baseEnv: this.baseEnv,
      taskIdOverride: options.taskId,
      pipelineId: options.pipelineId,
      targetStageId: options.targetStageId,
      planTargetFallback: null
    });
    const plan = preparation.planPreview ?? (await preparation.planner.plan(preparation.taskContext));

    const stages = preparation.pipeline.stages.map((stage: PipelineDefinition['stages'][number], index: number) => {
      if (stage.kind === 'command') {
        return {
          index: index + 1,
          id: stage.id,
          title: stage.title,
          kind: stage.kind,
          command: stage.command,
          cwd: stage.cwd ?? null,
          env: stage.env ?? null,
          allowFailure: Boolean(stage.allowFailure),
          summaryHint: stage.summaryHint ?? null
        } as const;
      }
      return {
        index: index + 1,
        id: stage.id,
        title: stage.title,
        kind: stage.kind,
        pipeline: stage.pipeline,
        optional: Boolean(stage.optional)
      } as const;
    });

    const pipelineSource =
      preparation.pipelineSource === 'user'
        ? 'user'
        : preparation.pipelineSource === 'default'
          ? 'default'
          : null;

    return {
      pipeline: {
        id: preparation.pipeline.id,
        title: preparation.pipeline.title,
        description: preparation.pipeline.description ?? null,
        source: pipelineSource
      },
      stages,
      plan,
      targetId: plan.targetId ?? null
    };
  }

  private async executePipeline(options: ExecutePipelineOptions): Promise<PipelineRunExecutionResult> {
    return executeOrchestratorPipelineRouteEntryShell({
      options,
      applyRuntimeSelection: this.applyRuntimeSelection.bind(this),
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

  private applyRequestedRuntimeMode(manifest: CliManifest, mode: RuntimeMode): void {
    manifest.runtime_mode_requested = mode;
    manifest.runtime_mode = mode;
    manifest.runtime_provider = mode === 'appserver' ? 'AppServerRuntimeProvider' : 'CliRuntimeProvider';
    manifest.runtime_fallback = {
      occurred: false,
      code: null,
      reason: null,
      from_mode: null,
      to_mode: null,
      checked_at: isoTimestamp()
    };
  }

  private applyRuntimeSelection(manifest: CliManifest, selection: RuntimeSelection): void {
    manifest.runtime_mode_requested = selection.requested_mode;
    manifest.runtime_mode = selection.selected_mode;
    manifest.runtime_provider = selection.provider;
    manifest.runtime_fallback = selection.fallback;
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

  private buildStatusPayload(
    env: EnvironmentPaths,
    manifest: CliManifest,
    paths: RunPaths,
    activity: RuntimeActivitySnapshot
  ): Record<string, unknown> {
    return {
      run_id: manifest.run_id,
      status: manifest.status,
      status_detail: manifest.status_detail,
      started_at: manifest.started_at,
      completed_at: manifest.completed_at,
      manifest: relativeToRepo(env, paths.manifestPath),
      artifact_root: manifest.artifact_root,
      log_path: manifest.log_path,
      heartbeat_at: manifest.heartbeat_at,
      activity,
      commands: manifest.commands,
      child_runs: manifest.child_runs,
      runtime_mode_requested: manifest.runtime_mode_requested,
      runtime_mode: manifest.runtime_mode,
      runtime_provider: manifest.runtime_provider,
      runtime_fallback: manifest.runtime_fallback ?? null,
      cloud_execution: manifest.cloud_execution ?? null,
      cloud_fallback: manifest.cloud_fallback ?? null
    };
  }

  private renderStatus(manifest: CliManifest, activity: RuntimeActivitySnapshot): void {
    logger.info(`Run: ${manifest.run_id}`);
    logger.info(
      `Status: ${manifest.status}${manifest.status_detail ? ` (${manifest.status_detail})` : ''}`
    );
    logger.info(`Started: ${manifest.started_at}`);
    logger.info(`Completed: ${manifest.completed_at ?? 'in-progress'}`);
    logger.info(`Manifest: ${manifest.artifact_root}/manifest.json`);
    if (manifest.runtime_mode || manifest.runtime_mode_requested || manifest.runtime_provider) {
      const selectedMode = manifest.runtime_mode ?? 'unknown';
      logger.info(
        `Runtime: ${selectedMode}${manifest.runtime_mode_requested ? ` (requested ${manifest.runtime_mode_requested})` : ''}` +
          (manifest.runtime_provider ? ` via ${manifest.runtime_provider}` : '')
      );
    }
    if (manifest.runtime_fallback?.occurred) {
      const fallbackCode = manifest.runtime_fallback.code ?? 'runtime-fallback';
      logger.info(`Runtime fallback: ${fallbackCode} — ${manifest.runtime_fallback.reason ?? 'n/a'}`);
    }
    if (activity.observed_at) {
      const staleSuffix = activity.stale === null ? '' : activity.stale ? ' [stale]' : ' [active]';
      const sourceLabel = activity.observed_source ? ` via ${activity.observed_source}` : '';
      const ageLabel = activity.age_seconds === null ? '' : ` age=${activity.age_seconds}s`;
      logger.info(`Activity: ${activity.observed_at}${sourceLabel}${ageLabel}${staleSuffix}`);
    }
    if (manifest.cloud_execution?.task_id) {
      logger.info(
        `Cloud: ${manifest.cloud_execution.task_id} [${manifest.cloud_execution.status}]` +
          (manifest.cloud_execution.status_url ? ` ${manifest.cloud_execution.status_url}` : '')
      );
    }
    logger.info('Commands:');
    for (const command of manifest.commands) {
      const summary = command.summary ? ` — ${command.summary}` : '';
      logger.info(`  [${command.status}] ${command.title}${summary}`);
    }
  }
}
