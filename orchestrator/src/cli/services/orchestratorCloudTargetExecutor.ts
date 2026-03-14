import process from 'node:process';

import type { TaskContext, PlanItem } from '../../types.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import { appendSummary } from '../run/manifest.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest, PipelineDefinition } from '../types.js';
import { isoTimestamp } from '../utils/time.js';
import { resolveCodexCliBin } from '../utils/codexCli.js';
import { buildCloudPrompt, type CloudPromptManifest } from './orchestratorCloudPromptBuilder.js';
import {
  CodexCloudTaskExecutor,
  type CloudExecutionManifest,
  type CloudTaskExecutionResult,
  type CloudTaskExecutorInput
} from '../../cloud/CodexCloudTaskExecutor.js';

const DEFAULT_CLOUD_POLL_INTERVAL_SECONDS = 10;
const DEFAULT_CLOUD_TIMEOUT_SECONDS = 1800;
const DEFAULT_CLOUD_ATTEMPTS = 1;
const DEFAULT_CLOUD_STATUS_RETRY_LIMIT = 12;
const DEFAULT_CLOUD_STATUS_RETRY_BACKOFF_MS = 1500;

type PersistOptions = { manifest?: boolean; heartbeat?: boolean; force?: boolean };

interface CloudTargetExecutorOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  target: PlanItem;
  task: TaskContext;
  envOverrides?: NodeJS.ProcessEnv;
  runEvents?: RunEventPublisher;
  controlWatcher: {
    sync(): Promise<void>;
    waitForResume(): Promise<void>;
    isCanceled(): boolean;
  };
  schedulePersist(options?: PersistOptions): Promise<void>;
}

type CloudTargetPreflightFailure = {
  success: false;
  notes: string[];
};

type CloudTargetPreflightSuccess = {
  success: true;
  targetStage: PipelineDefinition['stages'][number];
  targetEntry: CliManifest['commands'][number];
};

function readCloudString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readCloudNumber(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function readCloudFeatureList(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  const seen = new Set<string>();
  const features: string[] = [];
  for (const token of raw.split(/[,\s]+/u)) {
    const feature = token.trim();
    if (!feature || seen.has(feature)) {
      continue;
    }
    seen.add(feature);
    features.push(feature);
  }
  return features;
}

export function resolveCloudEnvironmentId(
  task: TaskContext,
  target: PlanItem,
  envOverrides?: NodeJS.ProcessEnv
): string | null {
  const metadata = (target.metadata ?? {}) as Record<string, unknown>;
  const taskMetadata = (task.metadata ?? {}) as Record<string, unknown>;
  const taskCloud = (taskMetadata.cloud ?? null) as Record<string, unknown> | null;

  const candidates: Array<string | null> = [
    readCloudString(metadata.cloudEnvId),
    readCloudString(metadata.cloud_env_id),
    readCloudString(metadata.envId),
    readCloudString(metadata.environmentId),
    readCloudString(taskCloud?.envId),
    readCloudString(taskCloud?.environmentId),
    readCloudString(taskMetadata.cloudEnvId),
    readCloudString(taskMetadata.cloud_env_id),
    readCloudString(envOverrides?.CODEX_CLOUD_ENV_ID),
    readCloudString(process.env.CODEX_CLOUD_ENV_ID)
  ];

  return candidates.find((candidate) => candidate !== null) ?? null;
}

function resolveCloudTargetStage(params: {
  target: PlanItem;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
}): {
  targetStageId: string | null;
  targetStage: PipelineDefinition['stages'][number] | undefined;
  targetEntry: CliManifest['commands'][number] | undefined;
} {
  const metadataStageId =
    typeof params.target.metadata?.stageId === 'string' ? (params.target.metadata.stageId as string) : null;
  let targetStageId: string | null = null;
  if (metadataStageId && params.pipeline.stages.some((stage) => stage.id === metadataStageId)) {
    targetStageId = metadataStageId;
  } else if (params.target.id.includes(':')) {
    const suffix = params.target.id.split(':').pop() ?? null;
    if (suffix && params.pipeline.stages.some((stage) => stage.id === suffix)) {
      targetStageId = suffix;
    }
  } else if (params.pipeline.stages.some((stage) => stage.id === params.target.id)) {
    targetStageId = params.target.id;
  }

  const targetStage = targetStageId
    ? params.pipeline.stages.find((stage) => stage.id === targetStageId)
    : undefined;
  const targetEntry = targetStageId
    ? params.manifest.commands.find((command) => command.id === targetStageId)
    : undefined;
  return { targetStageId, targetStage, targetEntry };
}

async function prepareCloudTargetPreflight(params: {
  manifest: CliManifest;
  pipeline: PipelineDefinition;
  target: PlanItem;
  controlWatcher: CloudTargetExecutorOptions['controlWatcher'];
}): Promise<CloudTargetPreflightFailure | CloudTargetPreflightSuccess> {
  const notes: string[] = [];
  const { targetStageId, targetStage, targetEntry } = resolveCloudTargetStage({
    target: params.target,
    pipeline: params.pipeline,
    manifest: params.manifest
  });

  await params.controlWatcher.sync();
  await params.controlWatcher.waitForResume();
  if (params.controlWatcher.isCanceled()) {
    params.manifest.status_detail = 'run-canceled';
    return { success: false, notes };
  }

  if (!targetStageId || !targetStage || targetStage.kind !== 'command' || !targetEntry) {
    const detail = targetStageId
      ? `Cloud execution target "${targetStageId}" could not be resolved to a command stage.`
      : `Cloud execution target "${params.target.id}" could not be resolved.`;
    params.manifest.status_detail = 'cloud-target-missing';
    appendSummary(params.manifest, detail);
    notes.push(detail);
    return { success: false, notes };
  }

  for (let i = 0; i < params.manifest.commands.length; i += 1) {
    const entry = params.manifest.commands[i];
    if (!entry || entry.id === targetStageId) {
      continue;
    }
    entry.status = 'skipped';
    entry.started_at = entry.started_at ?? isoTimestamp();
    entry.completed_at = isoTimestamp();
    entry.summary = `Skipped in cloud mode (target stage: ${targetStageId}).`;
  }

  return {
    success: true,
    targetStage,
    targetEntry
  };
}

function buildCloudTaskExecutorRequest(params: {
  env: Pick<EnvironmentPaths, 'repoRoot'>;
  runDir: string;
  task: TaskContext;
  target: PlanItem;
  pipeline: PipelineDefinition;
  stage: PipelineDefinition['stages'][number];
  manifest: CloudPromptManifest;
  environmentId: string;
  envOverrides?: NodeJS.ProcessEnv;
}): Omit<CloudTaskExecutorInput, 'onUpdate'> {
  const prompt = buildCloudPrompt({
    task: params.task,
    target: params.target,
    pipeline: params.pipeline,
    stage: params.stage,
    manifest: params.manifest
  });
  const pollIntervalSeconds = readCloudNumber(
    params.envOverrides?.CODEX_CLOUD_POLL_INTERVAL_SECONDS ?? process.env.CODEX_CLOUD_POLL_INTERVAL_SECONDS,
    DEFAULT_CLOUD_POLL_INTERVAL_SECONDS
  );
  const timeoutSeconds = readCloudNumber(
    params.envOverrides?.CODEX_CLOUD_TIMEOUT_SECONDS ?? process.env.CODEX_CLOUD_TIMEOUT_SECONDS,
    DEFAULT_CLOUD_TIMEOUT_SECONDS
  );
  const attempts = readCloudNumber(
    params.envOverrides?.CODEX_CLOUD_EXEC_ATTEMPTS ?? process.env.CODEX_CLOUD_EXEC_ATTEMPTS,
    DEFAULT_CLOUD_ATTEMPTS
  );
  const statusRetryLimit = readCloudNumber(
    params.envOverrides?.CODEX_CLOUD_STATUS_RETRY_LIMIT ?? process.env.CODEX_CLOUD_STATUS_RETRY_LIMIT,
    DEFAULT_CLOUD_STATUS_RETRY_LIMIT
  );
  const statusRetryBackoffMs = readCloudNumber(
    params.envOverrides?.CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS ?? process.env.CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS,
    DEFAULT_CLOUD_STATUS_RETRY_BACKOFF_MS
  );
  const branch =
    readCloudString(params.envOverrides?.CODEX_CLOUD_BRANCH) ?? readCloudString(process.env.CODEX_CLOUD_BRANCH);
  const enableFeatures = readCloudFeatureList(
    readCloudString(params.envOverrides?.CODEX_CLOUD_ENABLE_FEATURES) ??
      readCloudString(process.env.CODEX_CLOUD_ENABLE_FEATURES)
  );
  const disableFeatures = readCloudFeatureList(
    readCloudString(params.envOverrides?.CODEX_CLOUD_DISABLE_FEATURES) ??
      readCloudString(process.env.CODEX_CLOUD_DISABLE_FEATURES)
  );
  const codexBin = resolveCodexCliBin({ ...process.env, ...(params.envOverrides ?? {}) });
  const cloudEnvOverrides: NodeJS.ProcessEnv = {
    ...(params.envOverrides ?? {}),
    CODEX_NON_INTERACTIVE:
      params.envOverrides?.CODEX_NON_INTERACTIVE ?? process.env.CODEX_NON_INTERACTIVE ?? '1',
    CODEX_NO_INTERACTIVE:
      params.envOverrides?.CODEX_NO_INTERACTIVE ?? process.env.CODEX_NO_INTERACTIVE ?? '1',
    CODEX_INTERACTIVE: params.envOverrides?.CODEX_INTERACTIVE ?? process.env.CODEX_INTERACTIVE ?? '0'
  };

  return {
    codexBin,
    prompt,
    environmentId: params.environmentId,
    repoRoot: params.env.repoRoot,
    runDir: params.runDir,
    pollIntervalSeconds,
    timeoutSeconds,
    attempts,
    statusRetryLimit,
    statusRetryBackoffMs,
    branch,
    enableFeatures,
    disableFeatures,
    env: cloudEnvOverrides
  };
}

function applyMissingCloudEnvironmentFailure(params: {
  manifest: CliManifest;
  notes: string[];
  targetEntry: CliManifest['commands'][number];
}): void {
  const detail =
    'Cloud execution requested but no environment id is configured. Set CODEX_CLOUD_ENV_ID or provide target metadata.cloudEnvId.';
  params.manifest.status_detail = 'cloud-env-missing';
  params.manifest.cloud_execution = {
    task_id: null,
    environment_id: null,
    status: 'failed',
    status_url: null,
    submitted_at: null,
    completed_at: isoTimestamp(),
    last_polled_at: null,
    poll_count: 0,
    poll_interval_seconds: DEFAULT_CLOUD_POLL_INTERVAL_SECONDS,
    timeout_seconds: DEFAULT_CLOUD_TIMEOUT_SECONDS,
    attempts: DEFAULT_CLOUD_ATTEMPTS,
    diff_path: null,
    diff_url: null,
    diff_status: 'unavailable',
    apply_status: 'not_requested',
    log_path: null,
    error: detail
  };
  appendSummary(params.manifest, detail);
  params.notes.push(detail);
  params.targetEntry.status = 'failed';
  params.targetEntry.started_at = params.targetEntry.started_at ?? isoTimestamp();
  params.targetEntry.completed_at = isoTimestamp();
  params.targetEntry.exit_code = 1;
  params.targetEntry.summary = detail;
}

async function startCloudTargetAndBuildUpdateHandler(params: {
  manifest: CliManifest;
  targetStage: PipelineDefinition['stages'][number];
  targetEntry: CliManifest['commands'][number];
  schedulePersist(options?: PersistOptions): Promise<void>;
  runEvents?: RunEventPublisher;
}): Promise<(cloudExecution: CloudExecutionManifest) => Promise<void>> {
  params.targetEntry.status = 'running';
  params.targetEntry.started_at = isoTimestamp();
  await params.schedulePersist({ manifest: true, force: true });
  params.runEvents?.stageStarted({
    stageId: params.targetStage.id,
    stageIndex: params.targetEntry.index,
    title: params.targetStage.title,
    kind: 'command',
    logPath: params.targetEntry.log_path,
    status: params.targetEntry.status
  });

  return async (cloudExecution) => {
    params.manifest.cloud_execution = cloudExecution;
    params.targetEntry.log_path = cloudExecution.log_path;
    await params.schedulePersist({ manifest: true, force: true });
  };
}

async function applyCloudTargetCompletion(params: {
  manifest: CliManifest;
  targetStage: PipelineDefinition['stages'][number];
  targetEntry: CliManifest['commands'][number];
  cloudResult: CloudTaskExecutionResult;
  schedulePersist(options?: PersistOptions): Promise<void>;
  runEvents?: RunEventPublisher;
}): Promise<void> {
  params.manifest.cloud_execution = params.cloudResult.cloudExecution;
  params.targetEntry.log_path = params.cloudResult.cloudExecution.log_path;
  params.targetEntry.completed_at = isoTimestamp();
  params.targetEntry.exit_code = params.cloudResult.success ? 0 : 1;
  params.targetEntry.status = params.cloudResult.success ? 'succeeded' : 'failed';
  params.targetEntry.summary = params.cloudResult.summary;
  if (!params.cloudResult.success) {
    params.manifest.status_detail = `cloud:${params.targetStage.id}:failed`;
    appendSummary(params.manifest, params.cloudResult.summary);
  }
  await params.schedulePersist({ manifest: true, force: true });
  params.runEvents?.stageCompleted({
    stageId: params.targetStage.id,
    stageIndex: params.targetEntry.index,
    title: params.targetStage.title,
    kind: 'command',
    status: params.targetEntry.status,
    exitCode: params.targetEntry.exit_code,
    summary: params.targetEntry.summary,
    logPath: params.targetEntry.log_path
  });
}

export async function executeOrchestratorCloudTarget(
  options: CloudTargetExecutorOptions
): Promise<{ success: boolean; notes: string[] }> {
  const notes: string[] = [];
  let success = true;
  const { manifest, pipeline, target, task, runEvents, controlWatcher, schedulePersist } = options;
  const preflight = await prepareCloudTargetPreflight({
    manifest,
    pipeline,
    target,
    controlWatcher
  });
  if (!preflight.success) {
    return preflight;
  }
  const { targetStage, targetEntry } = preflight;

  const environmentId = resolveCloudEnvironmentId(task, target, options.envOverrides);
  if (!environmentId) {
    success = false;
    applyMissingCloudEnvironmentFailure({ manifest, notes, targetEntry });
    return { success, notes };
  }

  const onUpdate = await startCloudTargetAndBuildUpdateHandler({
    manifest,
    targetStage,
    targetEntry,
    schedulePersist,
    runEvents
  });
  const request = buildCloudTaskExecutorRequest({
    env: options.env,
    runDir: options.paths.runDir,
    task,
    target,
    pipeline,
    stage: targetStage,
    manifest,
    environmentId,
    envOverrides: options.envOverrides
  });
  const executor = new CodexCloudTaskExecutor();
  const cloudResult = await executor.execute({
    ...request,
    onUpdate
  });

  success = cloudResult.success;
  notes.push(...cloudResult.notes);
  await applyCloudTargetCompletion({
    manifest,
    targetStage,
    targetEntry,
    cloudResult,
    schedulePersist,
    runEvents
  });

  return { success, notes };
}
