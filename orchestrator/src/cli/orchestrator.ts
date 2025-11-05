import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { TaskManager } from '../manager.js';
import type { ManagerOptions } from '../manager.js';
import type { TaskContext, RunSummary, ExecutionMode } from '../types.js';
import {
  CommandPlanner,
  CommandBuilder,
  CommandTester,
  CommandReviewer
} from './adapters/index.js';
import {
  buildRunRequestV2,
  ControlPlaneDriftReporter,
  ControlPlaneValidationError,
  ControlPlaneValidator
} from '../control-plane/index.js';
import type { ControlPlaneValidationResult, ControlPlaneValidationMode } from '../control-plane/types.js';
import {
  buildSchedulerRunSummary,
  createSchedulerPlan,
  finalizeSchedulerPlan,
  serializeSchedulerPlan
} from '../scheduler/index.js';
import type { SchedulerPlan } from '../scheduler/index.js';
import { resolveEnvironment, sanitizeTaskId } from './run/environment.js';
import type { EnvironmentPaths } from './run/environment.js';
import {
  bootstrapManifest,
  loadManifest,
  saveManifest,
  updateHeartbeat,
  writeHeartbeatFile,
  finalizeStatus,
  appendSummary,
  guardrailRecommendation,
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
  RunStatus
} from './types.js';
import { generateRunId } from './utils/runId.js';
import { loadUserConfig, findPipeline } from './config/userConfig.js';
import type { UserConfig } from './config/userConfig.js';
import { resolvePipeline } from './pipelines/index.js';
import { loadTaskMetadata } from './tasks/taskMetadata.js';
import { runCommandStage } from './services/commandRunner.js';
import { appendMetricsEntry } from './metrics/metricsRecorder.js';
import { writeJsonAtomic } from './utils/fs.js';
import { isoTimestamp } from './utils/time.js';
import type { RunPaths } from './run/runPaths.js';
import { resolveRunPaths, relativeToRepo } from './run/runPaths.js';
import { logger } from '../logger.js';
import { getPrivacyGuard } from './services/execRuntime.js';

const HEARTBEAT_MANIFEST_THROTTLE_MS = 30_000;
interface ExecutePipelineOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
}

export class CodexOrchestrator {
  constructor(private readonly baseEnv: EnvironmentPaths = resolveEnvironment()) {}

  async start(options: StartOptions = {}): Promise<PipelineExecutionResult> {
    const env = this.overrideTaskId(options.taskId);
    const userConfig = await loadUserConfig(env);
    const { pipeline } = resolvePipeline(env, { pipelineId: options.pipelineId, config: userConfig });
    const metadata = await loadTaskMetadata(env);
    const runId = generateRunId();

    const { manifest, paths } = await bootstrapManifest(runId, {
      env,
      pipeline,
      parentRunId: options.parentRunId ?? null,
      taskSlug: metadata.slug,
      approvalPolicy: options.approvalPolicy ?? null
    });

    const getResult = this.createResultAccessor();
    const executePipeline = this.createPipelineExecutor({ env, pipeline, manifest, paths }, getResult);

    const manager = this.createTaskManager(runId, pipeline, executePipeline, getResult);
    const taskContext = this.createTaskContext(metadata);

    getPrivacyGuard().reset();

    const controlPlaneResult = await this.guardControlPlane({
      env,
      manifest,
      paths,
      pipeline,
      task: taskContext,
      runId,
      requestedBy: { actorId: 'codex-cli', channel: 'cli', name: 'Codex CLI' }
    });

    const schedulerPlan = await this.createSchedulerPlanForRun({
      env,
      manifest,
      paths,
      controlPlaneResult
    });

    const runSummary = await manager.execute(taskContext);
    manager.dispose();

    await this.finalizeSchedulerPlanForManifest({
      env,
      manifest,
      paths,
      plan: schedulerPlan
    });

    this.applySchedulerToRunSummary(runSummary, schedulerPlan);
    this.applyHandlesToRunSummary(runSummary, manifest);
    this.applyPrivacyToRunSummary(runSummary, manifest);
    this.applyControlPlaneToRunSummary(runSummary, controlPlaneResult);

    await this.persistRunSummary(env, paths, manifest, runSummary);

    return { manifest, runSummary };
  }

  async resume(options: ResumeOptions): Promise<PipelineExecutionResult> {
    const env = this.baseEnv;
    const { manifest, paths } = await loadManifest(env, options.runId);
    const actualEnv = this.overrideTaskId(manifest.task_id);
    const userConfig = await loadUserConfig(actualEnv);
    const pipeline = this.resolvePipelineForResume(actualEnv, manifest, userConfig);
    const metadata = await loadTaskMetadata(actualEnv);

    await this.validateResumeToken(paths, manifest, options.resumeToken ?? null);
    recordResumeEvent(manifest, {
      actor: options.actor ?? 'cli',
      reason: options.reason ?? 'manual-resume',
      outcome: 'accepted'
    });
    resetForResume(manifest);
    updateHeartbeat(manifest);
    await saveManifest(paths, manifest);
    await writeHeartbeatFile(paths, manifest);

    const getResult = this.createResultAccessor();
    const executePipeline = this.createPipelineExecutor({
      env: actualEnv,
      pipeline,
      manifest,
      paths
    }, getResult);

    const manager = this.createTaskManager(manifest.run_id, pipeline, executePipeline, getResult);
    const taskContext = this.createTaskContext(metadata);

    getPrivacyGuard().reset();

    const controlPlaneResult = await this.guardControlPlane({
      env: actualEnv,
      manifest,
      paths,
      pipeline,
      task: taskContext,
      runId: manifest.run_id,
      requestedBy: { actorId: 'codex-cli', channel: 'cli', name: 'Codex CLI' }
    });

    const schedulerPlan = await this.createSchedulerPlanForRun({
      env: actualEnv,
      manifest,
      paths,
      controlPlaneResult
    });

    const runSummary = await manager.execute(taskContext);
    manager.dispose();

    await this.finalizeSchedulerPlanForManifest({
      env: actualEnv,
      manifest,
      paths,
      plan: schedulerPlan
    });

    this.applySchedulerToRunSummary(runSummary, schedulerPlan);
    this.applyHandlesToRunSummary(runSummary, manifest);
    this.applyPrivacyToRunSummary(runSummary, manifest);
    this.applyControlPlaneToRunSummary(runSummary, controlPlaneResult);

    await this.persistRunSummary(actualEnv, paths, manifest, runSummary);

    return { manifest, runSummary };
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
    const env = this.overrideTaskId(options.taskId);
    const userConfig = await loadUserConfig(env);
    const { pipeline, source } = resolvePipeline(env, { pipelineId: options.pipelineId, config: userConfig });
    const metadata = await loadTaskMetadata(env);
    const planner = new CommandPlanner(pipeline);
    const taskContext = this.createTaskContext(metadata);
    const plan = await planner.plan(taskContext);

    const stages = pipeline.stages.map((stage, index) => {
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

    return {
      pipeline: {
        id: pipeline.id,
        title: pipeline.title,
        description: pipeline.description ?? null,
        source
      },
      stages,
      plan
    };
  }

  private overrideTaskId(taskId?: string): EnvironmentPaths {
    if (!taskId) {
      return { ...this.baseEnv };
    }
    const sanitized = sanitizeTaskId(taskId);
    return { ...this.baseEnv, taskId: sanitized };
  }

  private createTaskManager(
    runId: string,
    pipeline: PipelineDefinition,
    executePipeline: () => Promise<PipelineRunExecutionResult>,
    getResult: () => PipelineRunExecutionResult | null
  ): TaskManager {
    const planner = new CommandPlanner(pipeline);
    const builder = new CommandBuilder(executePipeline);
    const tester = new CommandTester(getResult);
    const reviewer = new CommandReviewer(getResult);

    const options: ManagerOptions = {
      planner,
      builder,
      tester,
      reviewer,
      runIdFactory: () => runId,
      modePolicy: () => this.determineMode(),
      persistence: { autoStart: true }
    };

    return new TaskManager(options);
  }

  private determineMode(): ExecutionMode {
    return 'mcp';
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
    const { env, pipeline, manifest, paths } = options;
    const notes: string[] = [];
    let success = true;

    manifest.status = 'in_progress';
    updateHeartbeat(manifest);
    await saveManifest(paths, manifest);
    await writeHeartbeatFile(paths, manifest);

    let heartbeatWrite = Promise.resolve();
    let lastHeartbeatManifestPersistMs = Date.now();
    const enqueueHeartbeat = (forceManifest = false) => {
      heartbeatWrite = heartbeatWrite.then(async () => {
        updateHeartbeat(manifest);
        try {
          const now = Date.now();
          if (forceManifest || now - lastHeartbeatManifestPersistMs >= HEARTBEAT_MANIFEST_THROTTLE_MS) {
            await saveManifest(paths, manifest);
            lastHeartbeatManifestPersistMs = now;
          }
          await writeHeartbeatFile(paths, manifest);
        } catch (error) {
          logger.warn(
            `Heartbeat update failed for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`
          );
        }
      });
      return heartbeatWrite;
    };

    const heartbeatInterval = setInterval(() => {
      void enqueueHeartbeat(false);
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
        await saveManifest(paths, manifest);

        if (stage.kind === 'command') {
          try {
            const result = await runCommandStage({ env, paths, manifest, stage, index: entry.index });
            notes.push(`${stage.title}: ${result.summary}`);
            const updatedEntry = manifest.commands[i];
            if (updatedEntry?.status === 'failed') {
              manifest.status_detail = `stage:${stage.id}:failed`;
              appendSummary(manifest, `Stage '${stage.title}' failed with exit code ${result.exitCode}.`);
              success = false;
              break;
            }
          } catch (error) {
            entry.status = 'failed';
            entry.completed_at = isoTimestamp();
            entry.summary = `Execution error: ${(error as Error)?.message ?? String(error)}`;
            manifest.status_detail = `stage:${stage.id}:error`;
            appendSummary(manifest, entry.summary);
            await saveManifest(paths, manifest);
            success = false;
            break;
          }
        } else {
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
          await saveManifest(paths, manifest);
          if (!stage.optional && entry.status === 'failed') {
            manifest.status_detail = `subpipeline:${stage.pipeline}:failed`;
            appendSummary(manifest, `Sub-pipeline '${stage.pipeline}' failed.`);
            success = false;
            break;
          }
        }
      }
    } finally {
      clearInterval(heartbeatInterval);
      await heartbeatWrite;
    }

    if (success) {
      finalizeStatus(manifest, 'succeeded');
    } else {
      finalizeStatus(manifest, 'failed', manifest.status_detail ?? 'pipeline-failed');
    }

    const recommendation = guardrailRecommendation(manifest);
    if (recommendation) {
      appendSummary(manifest, recommendation);
    }

    await enqueueHeartbeat(true);
    await saveManifest(paths, manifest);
    await appendMetricsEntry(env, paths, manifest);

    return {
      success,
      notes,
      manifest,
      manifestPath: relativeToRepo(env, paths.manifestPath),
      logPath: relativeToRepo(env, paths.logPath)
    };
  }

  private async guardControlPlane(options: {
    env: EnvironmentPaths;
    manifest: CliManifest;
    paths: RunPaths;
    pipeline: PipelineDefinition;
    task: TaskContext;
    runId: string;
    requestedBy: { actorId: string; channel: string; name?: string };
  }): Promise<ControlPlaneValidationResult | null> {
    const mode = this.resolveControlPlaneMode();
    const driftReporter = new ControlPlaneDriftReporter({
      repoRoot: options.env.repoRoot,
      taskId: options.env.taskId
    });
    const validator = new ControlPlaneValidator({ mode, driftReporter, now: () => new Date() });
    const request = buildRunRequestV2({
      runId: options.runId,
      task: options.task,
      pipeline: options.pipeline,
      manifest: options.manifest,
      env: options.env,
      requestedBy: options.requestedBy,
      now: () => new Date()
    });

    try {
      const result = await validator.validate(request);
      this.attachControlPlaneToManifest(options.env, options.manifest, result);
      await saveManifest(options.paths, options.manifest);
      return result;
    } catch (error: unknown) {
      if (error instanceof ControlPlaneValidationError) {
        this.attachControlPlaneToManifest(options.env, options.manifest, error.result);
        options.manifest.status = 'failed';
        options.manifest.status_detail = 'control-plane-validation-failed';
        options.manifest.completed_at = isoTimestamp();
        appendSummary(options.manifest, `Control plane validation failed: ${error.message}`);
        await saveManifest(options.paths, options.manifest);
      }
      throw error;
    }
  }

  private attachControlPlaneToManifest(
    env: EnvironmentPaths,
    manifest: CliManifest,
    result: ControlPlaneValidationResult
  ): void {
    const { request, outcome } = result;
    const drift = outcome.drift
      ? {
          report_path: relativeToRepo(env, outcome.drift.absoluteReportPath),
          total_samples: outcome.drift.totalSamples,
          invalid_samples: outcome.drift.invalidSamples,
          invalid_rate: outcome.drift.invalidRate,
          last_sampled_at: outcome.drift.lastSampledAt,
          mode: outcome.drift.mode
        }
      : undefined;

    manifest.control_plane = {
      schema_id: request.schema,
      schema_version: request.version,
      request_id: request.requestId,
      validation: {
        mode: outcome.mode,
        status: outcome.status,
        timestamp: outcome.timestamp,
        errors: outcome.errors.map((error) => ({ ...error }))
      },
      drift,
      enforcement: {
        enabled: outcome.mode === 'enforce',
        activated_at: outcome.mode === 'enforce' ? outcome.timestamp : null
      }
    };
  }

  private applyControlPlaneToRunSummary(
    runSummary: RunSummary,
    result: ControlPlaneValidationResult | null
  ): void {
    if (!result) {
      return;
    }
    const { request, outcome } = result;
    runSummary.controlPlane = {
      schemaId: request.schema,
      schemaVersion: request.version,
      requestId: request.requestId,
      validation: {
        mode: outcome.mode,
        status: outcome.status,
        timestamp: outcome.timestamp,
        errors: outcome.errors.map((error) => ({ ...error }))
      },
      drift: outcome.drift
        ? {
            mode: outcome.drift.mode,
            totalSamples: outcome.drift.totalSamples,
            invalidSamples: outcome.drift.invalidSamples,
            invalidRate: outcome.drift.invalidRate,
            lastSampledAt: outcome.drift.lastSampledAt
          }
        : undefined
    };
  }

  private resolveControlPlaneMode(): ControlPlaneValidationMode {
    const explicit = process.env.CODEX_CONTROL_PLANE_MODE ?? null;
    const enforce = process.env.CODEX_CONTROL_PLANE_ENFORCE ?? null;
    const candidate = explicit ?? enforce;
    if (!candidate) {
      return 'shadow';
    }
    const normalized = candidate.trim().toLowerCase();
    if (['1', 'true', 'enforce', 'on', 'yes'].includes(normalized)) {
      return 'enforce';
    }
    return 'shadow';
  }

  private async createSchedulerPlanForRun(options: {
    env: EnvironmentPaths;
    manifest: CliManifest;
    paths: RunPaths;
    controlPlaneResult: ControlPlaneValidationResult;
  }): Promise<SchedulerPlan> {
    const plan = createSchedulerPlan(options.controlPlaneResult.request, {
      now: () => new Date(),
      instancePrefix: sanitizeTaskId(options.env.taskId)
    });
    this.attachSchedulerPlanToManifest(options.env, options.manifest, plan);
    await saveManifest(options.paths, options.manifest);
    return plan;
  }

  private async finalizeSchedulerPlanForManifest(options: {
    env: EnvironmentPaths;
    manifest: CliManifest;
    paths: RunPaths;
    plan: SchedulerPlan;
  }): Promise<void> {
    const finalStatus = this.resolveSchedulerFinalStatus(options.manifest.status);
    finalizeSchedulerPlan(options.plan, finalStatus, isoTimestamp());
    this.attachSchedulerPlanToManifest(options.env, options.manifest, options.plan);
    await saveManifest(options.paths, options.manifest);
  }

  private attachSchedulerPlanToManifest(
    env: EnvironmentPaths,
    manifest: CliManifest,
    plan: SchedulerPlan
  ): void {
    manifest.scheduler = serializeSchedulerPlan(plan);
  }

  private resolveSchedulerFinalStatus(status: RunStatus): SchedulerAssignmentStatus {
    switch (status) {
      case 'succeeded':
        return 'succeeded';
      case 'in_progress':
        return 'running';
      default:
        return 'failed';
    }
  }

  private applySchedulerToRunSummary(runSummary: RunSummary, plan: SchedulerPlan): void {
    runSummary.scheduler = buildSchedulerRunSummary(plan);
  }

  private applyHandlesToRunSummary(runSummary: RunSummary, manifest: CliManifest): void {
    if (!manifest.handles || manifest.handles.length === 0) {
      return;
    }
    runSummary.handles = manifest.handles.map((handle) => ({
      handleId: handle.handle_id,
      correlationId: handle.correlation_id,
      stageId: handle.stage_id,
      status: handle.status,
      frameCount: handle.frame_count,
      latestSequence: handle.latest_sequence
    }));
  }

  private applyPrivacyToRunSummary(runSummary: RunSummary, manifest: CliManifest): void {
    if (!manifest.privacy) {
      return;
    }
    runSummary.privacy = {
      mode: manifest.privacy.mode,
      totalFrames: manifest.privacy.totals.total_frames,
      redactedFrames: manifest.privacy.totals.redacted_frames,
      blockedFrames: manifest.privacy.totals.blocked_frames,
      allowedFrames: manifest.privacy.totals.allowed_frames
    };
  }

  private async persistRunSummary(
    env: EnvironmentPaths,
    paths: RunPaths,
    manifest: CliManifest,
    runSummary: RunSummary
  ): Promise<void> {
    const summaryPath = join(paths.runDir, 'run-summary.json');
    await writeJsonAtomic(summaryPath, runSummary);
    manifest.run_summary_path = relativeToRepo(env, summaryPath);
    await saveManifest(paths, manifest);
  }

  private createTaskContext(metadata: { id: string; slug: string; title: string }): TaskContext {
    return {
      id: metadata.id,
      title: metadata.title,
      description: undefined,
      metadata: {
        slug: metadata.slug
      }
    };
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

  private resolvePipelineForResume(
    env: EnvironmentPaths,
    manifest: CliManifest,
    config: UserConfig | null
  ): PipelineDefinition {
    const existing = findPipeline(config ?? null, manifest.pipeline_id);
    if (existing) {
      return existing;
    }
    const { pipeline } = resolvePipeline(env, { pipelineId: manifest.pipeline_id, config });
    return pipeline;
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
