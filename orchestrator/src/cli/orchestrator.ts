import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { TaskManager } from '../manager.js';
import type { ManagerOptions } from '../manager.js';
import type { TaskContext, ExecutionMode, PlanItem } from '../types.js';
import {
  CommandPlanner,
  CommandBuilder,
  CommandTester,
  CommandReviewer
} from './adapters/index.js';
import { resolveEnvironment } from './run/environment.js';
import type { EnvironmentPaths } from './run/environment.js';
import {
  bootstrapManifest,
  loadManifest,
  saveManifest,
  updateHeartbeat,
  writeHeartbeatFile,
  finalizeStatus,
  appendSummary,
  ensureGuardrailStatus,
  resetForResume,
  recordResumeEvent
} from './run/manifest.js';
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
  RunSummary
} from './types.js';
import { generateRunId } from './utils/runId.js';
import { runCommandStage } from './services/commandRunner.js';
import { appendMetricsEntry } from './metrics/metricsRecorder.js';
import { isoTimestamp } from './utils/time.js';
import type { RunPaths } from './run/runPaths.js';
import { resolveRunPaths, relativeToRepo } from './run/runPaths.js';
import { logger } from '../logger.js';
import { getPrivacyGuard } from './services/execRuntime.js';
import { PipelineResolver } from './services/pipelineResolver.js';
import { ControlPlaneService } from './services/controlPlaneService.js';
import { SchedulerService } from './services/schedulerService.js';
import {
  applyHandlesToRunSummary,
  applyPrivacyToRunSummary,
  persistRunSummary
} from './services/runSummaryWriter.js';
import {
  prepareRun,
  resolvePipelineForResume,
  overrideTaskEnvironment
} from './services/runPreparation.js';
import { loadUserConfig } from './config/userConfig.js';
import { RunEventPublisher, snapshotStages, type RunEventEmitter } from './events/runEvents.js';


interface ExecutePipelineOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  runEvents?: RunEventPublisher;
}

interface RunLifecycleContext {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  planner: CommandPlanner;
  taskContext: TaskContext;
  runId: string;
  runEvents?: RunEventPublisher;
}

export class CodexOrchestrator {
  private readonly controlPlane = new ControlPlaneService();
  private readonly scheduler = new SchedulerService();

  constructor(private readonly baseEnv: EnvironmentPaths = resolveEnvironment()) {}

  async start(options: StartOptions = {}): Promise<PipelineExecutionResult> {
    const preparation = await prepareRun({
      baseEnv: this.baseEnv,
      taskIdOverride: options.taskId,
      pipelineId: options.pipelineId,
      targetStageId: options.targetStageId ?? null,
      planTargetFallback: null
    });
    const runId = generateRunId();
    const { manifest, paths } = await bootstrapManifest(runId, {
      env: preparation.env,
      pipeline: preparation.pipeline,
      parentRunId: options.parentRunId ?? null,
      taskSlug: preparation.metadata.slug,
      approvalPolicy: options.approvalPolicy ?? null,
      planTargetId: preparation.planPreview?.targetId ?? preparation.plannerTargetId ?? null
    });

    const runEvents = this.createRunEventPublisher({
      runId,
      pipeline: preparation.pipeline,
      manifest,
      paths,
      emitter: options.runEvents
    });

    return await this.performRunLifecycle({
      env: preparation.env,
      pipeline: preparation.pipeline,
      manifest,
      paths,
      planner: preparation.planner,
      taskContext: preparation.taskContext,
      runId,
      runEvents
    });
  }

  async resume(options: ResumeOptions): Promise<PipelineExecutionResult> {
    const env = this.baseEnv;
    const { manifest, paths } = await loadManifest(env, options.runId);
    const actualEnv = overrideTaskEnvironment(env, manifest.task_id);

    const resolver = new PipelineResolver();
    const designConfig = await resolver.loadDesignConfig(actualEnv.repoRoot);

    const userConfig = await loadUserConfig(actualEnv);
    const pipeline = resolvePipelineForResume(actualEnv, manifest, userConfig);
    resolver.ensureDesignPipelineEnv(pipeline.id, designConfig);
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
      resolver,
      taskIdOverride: manifest.task_id,
      targetStageId: options.targetStageId,
      planTargetFallback: manifest.plan_target_id ?? null
    });
    manifest.plan_target_id = preparation.planPreview?.targetId ?? preparation.plannerTargetId ?? null;
    await saveManifest(paths, manifest);
    await writeHeartbeatFile(paths, manifest);

    const runEvents = this.createRunEventPublisher({
      runId: manifest.run_id,
      pipeline,
      manifest,
      paths,
      emitter: options.runEvents
    });

    return await this.performRunLifecycle({
      env: preparation.env,
      pipeline,
      manifest,
      paths,
      planner: preparation.planner,
      taskContext: preparation.taskContext,
      runId: manifest.run_id,
      runEvents
    });
  }

  async status(options: StatusOptions): Promise<CliManifest> {
    const env = this.baseEnv;
    const { manifest, paths } = await loadManifest(env, options.runId);
    if (options.format === 'json') {
      const payload = this.buildStatusPayload(env, manifest, paths);
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      return manifest;
    }
    this.renderStatus(manifest);
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

  private createRunEventPublisher(params: {
    runId: string;
    pipeline: PipelineDefinition;
    manifest: CliManifest;
    paths: RunPaths;
    emitter?: RunEventEmitter;
  }): RunEventPublisher | undefined {
    if (!params.emitter) {
      return undefined;
    }
    return new RunEventPublisher(params.emitter, {
      taskId: params.manifest.task_id,
      runId: params.runId,
      pipelineId: params.pipeline.id,
      pipelineTitle: params.pipeline.title,
      manifestPath: params.paths.manifestPath,
      logPath: params.paths.logPath
    });
  }

  private createTaskManager(
    runId: string,
    pipeline: PipelineDefinition,
    executePipeline: () => Promise<PipelineRunExecutionResult>,
    getResult: () => PipelineRunExecutionResult | null,
    plannerInstance?: CommandPlanner
  ): TaskManager {
    const planner = plannerInstance ?? new CommandPlanner(pipeline);
    const builder = new CommandBuilder(executePipeline);
    const tester = new CommandTester(getResult);
    const reviewer = new CommandReviewer(getResult);

    const options: ManagerOptions = {
      planner,
      builder,
      tester,
      reviewer,
      runIdFactory: () => runId,
      modePolicy: (task, subtask) => this.determineMode(task, subtask),
      persistence: { autoStart: true }
    };

    return new TaskManager(options);
  }

  private determineMode(task: TaskContext, subtask: PlanItem): ExecutionMode {
    if (this.requiresCloudExecution(task, subtask)) {
      return 'cloud';
    }
    return 'mcp';
  }

  private requiresCloudExecution(task: TaskContext, subtask: PlanItem): boolean {
    const requiresCloudFlag = subtask.requires_cloud ?? subtask.requiresCloud;
    if (typeof requiresCloudFlag === 'boolean') {
      return requiresCloudFlag;
    }
    const metadataMode = typeof subtask.metadata?.executionMode === 'string'
      ? (subtask.metadata.executionMode as string)
      : typeof subtask.metadata?.mode === 'string'
        ? (subtask.metadata.mode as string)
        : null;
    if (metadataMode) {
      const normalized = metadataMode.toLowerCase();
      if (normalized === 'cloud') {
        return true;
      }
      if (normalized === 'mcp') {
        return false;
      }
    }
    if (task.metadata?.execution?.parallel) {
      return true;
    }
    return false;
  }

  private createPipelineExecutor(
    context: ExecutePipelineOptions,
    writeResult: (result: PipelineRunExecutionResult) => void
  ): () => Promise<PipelineRunExecutionResult> {
    let executing: Promise<PipelineRunExecutionResult> | null = null;
    return async () => {
      if (!executing) {
        executing = this.executePipeline(context).then((result) => {
          writeResult(result);
          return result;
        });
      }
      return executing;
    };
  }

  private createResultAccessor(): {
    (): PipelineRunExecutionResult | null;
    (result: PipelineRunExecutionResult): void;
  } {
    let value: PipelineRunExecutionResult | null = null;
    const accessor = (result?: PipelineRunExecutionResult) => {
      if (result) {
        value = result;
      }
      return value;
    };
    return accessor;
  }

  private async executePipeline(options: ExecutePipelineOptions): Promise<PipelineRunExecutionResult> {
    const { env, pipeline, manifest, paths, runEvents } = options;
    const notes: string[] = [];
    let success = true;
    manifest.guardrail_status = undefined;

    const persistIntervalMs = Math.max(1000, manifest.heartbeat_interval_seconds * 1000);
    let dirtyManifest = false;
    let dirtyHeartbeat = false;
    let timer: NodeJS.Timeout | null = null;
    let timerResolver: (() => void) | null = null;
    let lastPersistAt = 0;
    let pendingPersist = Promise.resolve();

    const flushPersist = async (): Promise<void> => {
      if (!dirtyManifest && !dirtyHeartbeat) {
        return;
      }
      const writeManifest = dirtyManifest;
      const writeHeartbeat = dirtyHeartbeat;
      dirtyManifest = false;
      dirtyHeartbeat = false;
      lastPersistAt = Date.now();
      if (writeManifest) {
        await saveManifest(paths, manifest);
      }
      if (writeHeartbeat) {
        await writeHeartbeatFile(paths, manifest);
      }
    };

    const schedulePersist = (
      options: { manifest?: boolean; heartbeat?: boolean; force?: boolean } = {}
    ): Promise<void> => {
      const { manifest: includeManifest = false, heartbeat: includeHeartbeat = false, force = false } = options;
      dirtyManifest = dirtyManifest || includeManifest;
      dirtyHeartbeat = dirtyHeartbeat || includeHeartbeat;
      if (!dirtyManifest && !dirtyHeartbeat) {
        return pendingPersist;
      }
      if (force) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (timerResolver) {
          const resolver = timerResolver;
          timerResolver = null;
          resolver();
          return pendingPersist;
        }
        pendingPersist = pendingPersist.then(() => flushPersist());
        return pendingPersist;
      }
      if (timer) {
        return pendingPersist;
      }
      const waitMs = Math.max(0, lastPersistAt + persistIntervalMs - Date.now());
      pendingPersist = pendingPersist
        .then(
          () =>
            new Promise<void>((resolve) => {
              timerResolver = resolve;
              timer = setTimeout(() => {
                timer = null;
                timerResolver = null;
                resolve();
              }, waitMs);
            })
        )
        .then(() => flushPersist());
      return pendingPersist;
    };

    const pushHeartbeat = (forceManifest = false): Promise<void> => {
      updateHeartbeat(manifest);
      return schedulePersist({ manifest: forceManifest, heartbeat: true, force: forceManifest });
    };

    manifest.status = 'in_progress';
    updateHeartbeat(manifest);
    await schedulePersist({ manifest: true, heartbeat: true, force: true });
    runEvents?.runStarted(snapshotStages(manifest, pipeline), manifest.status);

    const heartbeatInterval = setInterval(() => {
      void pushHeartbeat(false).catch((error) => {
        logger.warn(
          `Heartbeat update failed for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`
        );
      });
    }, manifest.heartbeat_interval_seconds * 1000);

    try {
      for (let i = 0; i < pipeline.stages.length; i += 1) {
        const stage = pipeline.stages[i];
        const entry = manifest.commands[i];
        if (!entry) {
          continue;
        }
        if (entry.status === 'succeeded' || entry.status === 'skipped') {
          notes.push(`${stage.title}: ${entry.status}`);
          continue;
        }

        entry.status = 'pending';
        entry.started_at = isoTimestamp();
        void schedulePersist({ manifest: true });

        if (stage.kind === 'command') {
          try {
            const result = await runCommandStage({
              env,
              paths,
              manifest,
              stage,
              index: entry.index,
              events: runEvents
            });
            notes.push(`${stage.title}: ${result.summary}`);
            const updatedEntry = manifest.commands[i];
            if (updatedEntry?.status === 'failed') {
              manifest.status_detail = `stage:${stage.id}:failed`;
              appendSummary(manifest, `Stage '${stage.title}' failed with exit code ${result.exitCode}.`);
              success = false;
              await schedulePersist({ manifest: true, force: true });
              break;
            }
          } catch (error) {
            entry.status = 'failed';
            entry.completed_at = isoTimestamp();
            entry.summary = `Execution error: ${(error as Error)?.message ?? String(error)}`;
            manifest.status_detail = `stage:${stage.id}:error`;
            appendSummary(manifest, entry.summary);
            await schedulePersist({ manifest: true, force: true });
            runEvents?.stageCompleted({
              stageId: stage.id,
              stageIndex: entry.index,
              title: stage.title,
              kind: 'command',
              status: entry.status,
              exitCode: entry.exit_code,
              summary: entry.summary,
              logPath: entry.log_path
            });
            success = false;
            break;
          }
        } else {
          entry.status = 'running';
          await schedulePersist({ manifest: true, force: true });
          runEvents?.stageStarted({
            stageId: stage.id,
            stageIndex: entry.index,
            title: stage.title,
            kind: 'subpipeline',
            logPath: entry.log_path,
            status: entry.status
          });
          const child = await this.start({
            taskId: env.taskId,
            pipelineId: stage.pipeline,
            parentRunId: manifest.run_id,
            format: 'json'
          });
          entry.completed_at = isoTimestamp();
          entry.sub_run_id = child.manifest.run_id;
          entry.summary = child.runSummary.review.summary ?? null;
          entry.status = child.manifest.status === 'succeeded' ? 'succeeded' : stage.optional ? 'skipped' : 'failed';
          entry.command = null;
          manifest.child_runs.push({
            run_id: child.manifest.run_id,
            pipeline_id: stage.pipeline,
            status: child.manifest.status,
            manifest: relativeToRepo(env, resolveRunPaths(env, child.manifest.run_id).manifestPath)
          });
          notes.push(`${stage.title}: ${entry.status}`);
          await schedulePersist({ manifest: true, force: true });
          runEvents?.stageCompleted({
            stageId: stage.id,
            stageIndex: entry.index,
            title: stage.title,
            kind: 'subpipeline',
            status: entry.status,
            exitCode: entry.exit_code,
            summary: entry.summary,
            logPath: entry.log_path,
            subRunId: entry.sub_run_id
          });
          if (!stage.optional && entry.status === 'failed') {
            manifest.status_detail = `subpipeline:${stage.pipeline}:failed`;
            appendSummary(manifest, `Sub-pipeline '${stage.pipeline}' failed.`);
            await schedulePersist({ manifest: true, force: true });
            success = false;
            break;
          }
        }
      }
    } finally {
      clearInterval(heartbeatInterval);
      await schedulePersist({ force: true });
    }

    if (success) {
      finalizeStatus(manifest, 'succeeded');
    } else {
      finalizeStatus(manifest, 'failed', manifest.status_detail ?? 'pipeline-failed');
    }

    const guardrailStatus = ensureGuardrailStatus(manifest);
    if (guardrailStatus.recommendation) {
      appendSummary(manifest, guardrailStatus.recommendation);
    }

    updateHeartbeat(manifest);
    await schedulePersist({ manifest: true, heartbeat: true, force: true }).catch((error) => {
      logger.warn(
        `Heartbeat update failed for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`
      );
    });
    await schedulePersist({ force: true });
    await appendMetricsEntry(env, paths, manifest);

    return {
      success,
      notes,
      manifest,
      manifestPath: relativeToRepo(env, paths.manifestPath),
      logPath: relativeToRepo(env, paths.logPath)
    };
  }

  private async performRunLifecycle(context: RunLifecycleContext): Promise<PipelineExecutionResult> {
    const { env, pipeline, manifest, paths, planner, taskContext, runId } = context;
    const getResult = this.createResultAccessor();
    const executePipeline = this.createPipelineExecutor(
      { env, pipeline, manifest, paths, runEvents: context.runEvents },
      getResult
    );
    const manager = this.createTaskManager(runId, pipeline, executePipeline, getResult, planner);
    this.attachPlanTargetTracker(manager, manifest, paths);

    getPrivacyGuard().reset();

    const controlPlaneResult = await this.controlPlane.guard({
      env,
      manifest,
      paths,
      pipeline,
      task: taskContext,
      runId,
      requestedBy: { actorId: 'codex-cli', channel: 'cli', name: 'Codex CLI' }
    });

    const schedulerPlan = await this.scheduler.createPlanForRun({
      env,
      manifest,
      paths,
      controlPlaneResult
    });

    let runSummary: RunSummary;
    try {
      runSummary = await manager.execute(taskContext);
    } catch (error) {
      context.runEvents?.runError({
        pipelineId: pipeline.id,
        message: (error as Error)?.message ?? String(error),
        stageId: null
      });
      throw error;
    }


    await this.scheduler.finalizePlan({
      manifest,
      paths,
      plan: schedulerPlan
    });

    this.scheduler.applySchedulerToRunSummary(runSummary, schedulerPlan);
    applyHandlesToRunSummary(runSummary, manifest);
    applyPrivacyToRunSummary(runSummary, manifest);
    this.controlPlane.applyControlPlaneToRunSummary(runSummary, controlPlaneResult);

    await persistRunSummary(env, paths, manifest, runSummary);
    context.runEvents?.runCompleted({
      pipelineId: pipeline.id,
      status: manifest.status,
      manifestPath: paths.manifestPath,
      runSummaryPath: manifest.run_summary_path,
      metricsPath: join(env.runsRoot, env.taskId, 'metrics.json'),
      summary: manifest.summary ?? null
    });

    return { manifest, runSummary };
  }

  private attachPlanTargetTracker(manager: TaskManager, manifest: CliManifest, paths: RunPaths): void {
    manager.bus.on('plan:completed', (event) => {
      const targetId = event.payload.plan.targetId ?? null;
      if (manifest.plan_target_id === targetId) {
        return;
      }
      manifest.plan_target_id = targetId;
      void saveManifest(paths, manifest).catch((error) => {
        logger.warn(
          `Failed to persist plan target for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`
        );
      });
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

  private buildStatusPayload(env: EnvironmentPaths, manifest: CliManifest, paths: RunPaths): Record<string, unknown> {
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
      commands: manifest.commands,
      child_runs: manifest.child_runs
    };
  }

  private renderStatus(manifest: CliManifest): void {
    logger.info(`Run: ${manifest.run_id}`);
    logger.info(
      `Status: ${manifest.status}${manifest.status_detail ? ` (${manifest.status_detail})` : ''}`
    );
    logger.info(`Started: ${manifest.started_at}`);
    logger.info(`Completed: ${manifest.completed_at ?? 'in-progress'}`);
    logger.info(`Manifest: ${manifest.artifact_root}/manifest.json`);
    logger.info('Commands:');
    for (const command of manifest.commands) {
      const summary = command.summary ? ` — ${command.summary}` : '';
      logger.info(`  [${command.status}] ${command.title}${summary}`);
    }
  }
}
