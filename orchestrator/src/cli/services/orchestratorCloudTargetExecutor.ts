import process from 'node:process';

import type { TaskContext, PlanItem } from '../../types.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import { appendSummary } from '../run/manifest.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest, PipelineDefinition, PromptPackManifestEntry } from '../types.js';
import { isoTimestamp } from '../utils/time.js';
import { resolveCodexCliBin } from '../utils/codexCli.js';
import { CodexCloudTaskExecutor } from '../../cloud/CodexCloudTaskExecutor.js';

const DEFAULT_CLOUD_POLL_INTERVAL_SECONDS = 10;
const DEFAULT_CLOUD_TIMEOUT_SECONDS = 1800;
const DEFAULT_CLOUD_ATTEMPTS = 1;
const DEFAULT_CLOUD_STATUS_RETRY_LIMIT = 12;
const DEFAULT_CLOUD_STATUS_RETRY_BACKOFF_MS = 1500;
const MAX_CLOUD_PROMPT_EXPERIENCES = 3;
const MAX_CLOUD_PROMPT_EXPERIENCE_CHARS = 320;

type PersistOptions = { manifest?: boolean; heartbeat?: boolean; force?: boolean };
type CloudPromptManifest = Pick<CliManifest, 'prompt_packs'>;

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

function normalizePromptSnippet(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function truncatePromptSnippet(value: string): string {
  if (value.length <= MAX_CLOUD_PROMPT_EXPERIENCE_CHARS) {
    return value;
  }
  return `${value.slice(0, MAX_CLOUD_PROMPT_EXPERIENCE_CHARS - 1).trimEnd()}…`;
}

function readPromptPackDomain(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPromptPackDomainLower(pack: PromptPackManifestEntry): string | null {
  const domain = readPromptPackDomain(pack.domain);
  return domain ? domain.toLowerCase() : null;
}

function hasPromptPackExperiences(pack: PromptPackManifestEntry): boolean {
  if (!readPromptPackDomain(pack.domain)) {
    return false;
  }
  return (
    Array.isArray(pack.experiences) &&
    pack.experiences.some((entry) => typeof entry === 'string' && normalizePromptSnippet(entry).length > 0)
  );
}

function selectPromptPackForCloudPrompt(params: {
  promptPacks: PromptPackManifestEntry[] | null | undefined;
  pipeline: Pick<PipelineDefinition, 'id' | 'title' | 'tags'>;
  target: Pick<PlanItem, 'id' | 'description'>;
  stage: Pick<PipelineDefinition['stages'][number], 'id' | 'title'>;
}): PromptPackManifestEntry | null {
  const candidates = (params.promptPacks ?? []).filter(hasPromptPackExperiences);
  if (candidates.length === 0) {
    return null;
  }

  const haystack = [
    params.pipeline.id,
    params.pipeline.title,
    (params.pipeline.tags ?? []).join(' '),
    params.target.id,
    params.target.description ?? '',
    params.stage.id,
    params.stage.title
  ]
    .join(' ')
    .toLowerCase();

  const directMatch = candidates.find((pack) => {
    const domainLower = readPromptPackDomainLower(pack);
    return domainLower !== null && domainLower !== 'implementation' && haystack.includes(domainLower);
  });
  if (directMatch) {
    return directMatch;
  }

  const broadDirectMatch = candidates.find((pack) => {
    const domainLower = readPromptPackDomainLower(pack);
    return domainLower !== null && haystack.includes(domainLower);
  });
  if (broadDirectMatch) {
    return broadDirectMatch;
  }

  const implementation = candidates.find((pack) => readPromptPackDomainLower(pack) === 'implementation');
  if (implementation) {
    return implementation;
  }

  return candidates[0] ?? null;
}

function buildCloudExperiencePromptLines(params: {
  manifest: CloudPromptManifest;
  pipeline: PipelineDefinition;
  target: PlanItem;
  stage: PipelineDefinition['stages'][number];
}): string[] {
  const selectedPack = selectPromptPackForCloudPrompt({
    promptPacks: params.manifest.prompt_packs,
    pipeline: params.pipeline,
    target: params.target,
    stage: params.stage
  });
  if (!selectedPack || !Array.isArray(selectedPack.experiences)) {
    return [];
  }

  const snippets = selectedPack.experiences
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => normalizePromptSnippet(entry))
    .filter((entry) => entry.length > 0)
    .slice(0, MAX_CLOUD_PROMPT_EXPERIENCES)
    .map((entry) => truncatePromptSnippet(entry));
  if (snippets.length === 0) {
    return [];
  }

  const domainLabel = readPromptPackDomain(selectedPack.domain) ?? 'unknown';

  return [
    '',
    'Relevant prior experiences (hints, not strict instructions):',
    `Domain: ${domainLabel}`,
    ...snippets.map((entry, index) => `${index + 1}. ${entry}`)
  ];
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

export function buildCloudPrompt(params: {
  task: TaskContext;
  target: PlanItem;
  pipeline: PipelineDefinition;
  stage: PipelineDefinition['stages'][number];
  manifest: CloudPromptManifest;
}): string {
  const lines = [
    `Task ID: ${params.task.id}`,
    `Task title: ${params.task.title}`,
    params.task.description ? `Task description: ${params.task.description}` : null,
    `Pipeline: ${params.pipeline.id}`,
    `Target stage: ${params.stage.id} (${params.target.description})`,
    '',
    'Apply the required repository changes for this target stage and produce a diff.'
  ].filter((line): line is string => Boolean(line));

  lines.push(
    ...buildCloudExperiencePromptLines({
      manifest: params.manifest,
      pipeline: params.pipeline,
      target: params.target,
      stage: params.stage
    })
  );

  return lines.join('\n');
}

export async function executeOrchestratorCloudTarget(
  options: CloudTargetExecutorOptions
): Promise<{ success: boolean; notes: string[] }> {
  const notes: string[] = [];
  let success = true;
  const { manifest, pipeline, target, task, runEvents, controlWatcher, schedulePersist } = options;
  const { targetStageId, targetStage, targetEntry } = resolveCloudTargetStage({ target, pipeline, manifest });

  await controlWatcher.sync();
  await controlWatcher.waitForResume();
  if (controlWatcher.isCanceled()) {
    manifest.status_detail = 'run-canceled';
    return { success: false, notes };
  }

  if (!targetStage || targetStage.kind !== 'command' || !targetEntry) {
    success = false;
    manifest.status_detail = 'cloud-target-missing';
    const detail = targetStageId
      ? `Cloud execution target "${targetStageId}" could not be resolved to a command stage.`
      : `Cloud execution target "${target.id}" could not be resolved.`;
    appendSummary(manifest, detail);
    notes.push(detail);
    return { success, notes };
  }

  for (let i = 0; i < manifest.commands.length; i += 1) {
    const entry = manifest.commands[i];
    if (!entry || entry.id === targetStageId) {
      continue;
    }
    entry.status = 'skipped';
    entry.started_at = entry.started_at ?? isoTimestamp();
    entry.completed_at = isoTimestamp();
    entry.summary = `Skipped in cloud mode (target stage: ${targetStageId}).`;
  }

  const environmentId = resolveCloudEnvironmentId(task, target, options.envOverrides);
  if (!environmentId) {
    success = false;
    manifest.status_detail = 'cloud-env-missing';
    const detail =
      'Cloud execution requested but no environment id is configured. Set CODEX_CLOUD_ENV_ID or provide target metadata.cloudEnvId.';
    manifest.cloud_execution = {
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
    appendSummary(manifest, detail);
    notes.push(detail);
    targetEntry.status = 'failed';
    targetEntry.started_at = targetEntry.started_at ?? isoTimestamp();
    targetEntry.completed_at = isoTimestamp();
    targetEntry.exit_code = 1;
    targetEntry.summary = detail;
    return { success, notes };
  }

  targetEntry.status = 'running';
  targetEntry.started_at = isoTimestamp();
  await schedulePersist({ manifest: true, force: true });
  runEvents?.stageStarted({
    stageId: targetStage.id,
    stageIndex: targetEntry.index,
    title: targetStage.title,
    kind: 'command',
    logPath: targetEntry.log_path,
    status: targetEntry.status
  });

  const prompt = buildCloudPrompt({
    task,
    target,
    pipeline,
    stage: targetStage,
    manifest
  });
  const pollIntervalSeconds = readCloudNumber(
    options.envOverrides?.CODEX_CLOUD_POLL_INTERVAL_SECONDS ?? process.env.CODEX_CLOUD_POLL_INTERVAL_SECONDS,
    DEFAULT_CLOUD_POLL_INTERVAL_SECONDS
  );
  const timeoutSeconds = readCloudNumber(
    options.envOverrides?.CODEX_CLOUD_TIMEOUT_SECONDS ?? process.env.CODEX_CLOUD_TIMEOUT_SECONDS,
    DEFAULT_CLOUD_TIMEOUT_SECONDS
  );
  const attempts = readCloudNumber(
    options.envOverrides?.CODEX_CLOUD_EXEC_ATTEMPTS ?? process.env.CODEX_CLOUD_EXEC_ATTEMPTS,
    DEFAULT_CLOUD_ATTEMPTS
  );
  const statusRetryLimit = readCloudNumber(
    options.envOverrides?.CODEX_CLOUD_STATUS_RETRY_LIMIT ?? process.env.CODEX_CLOUD_STATUS_RETRY_LIMIT,
    DEFAULT_CLOUD_STATUS_RETRY_LIMIT
  );
  const statusRetryBackoffMs = readCloudNumber(
    options.envOverrides?.CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS ?? process.env.CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS,
    DEFAULT_CLOUD_STATUS_RETRY_BACKOFF_MS
  );
  const branch =
    readCloudString(options.envOverrides?.CODEX_CLOUD_BRANCH) ?? readCloudString(process.env.CODEX_CLOUD_BRANCH);
  const enableFeatures = readCloudFeatureList(
    readCloudString(options.envOverrides?.CODEX_CLOUD_ENABLE_FEATURES) ??
      readCloudString(process.env.CODEX_CLOUD_ENABLE_FEATURES)
  );
  const disableFeatures = readCloudFeatureList(
    readCloudString(options.envOverrides?.CODEX_CLOUD_DISABLE_FEATURES) ??
      readCloudString(process.env.CODEX_CLOUD_DISABLE_FEATURES)
  );
  const codexBin = resolveCodexCliBin({ ...process.env, ...(options.envOverrides ?? {}) });
  const cloudEnvOverrides: NodeJS.ProcessEnv = {
    ...(options.envOverrides ?? {}),
    CODEX_NON_INTERACTIVE: options.envOverrides?.CODEX_NON_INTERACTIVE ?? process.env.CODEX_NON_INTERACTIVE ?? '1',
    CODEX_NO_INTERACTIVE:
      options.envOverrides?.CODEX_NO_INTERACTIVE ?? process.env.CODEX_NO_INTERACTIVE ?? '1',
    CODEX_INTERACTIVE: options.envOverrides?.CODEX_INTERACTIVE ?? process.env.CODEX_INTERACTIVE ?? '0'
  };

  const executor = new CodexCloudTaskExecutor();
  const cloudResult = await executor.execute({
    codexBin,
    prompt,
    environmentId,
    repoRoot: options.env.repoRoot,
    runDir: options.paths.runDir,
    pollIntervalSeconds,
    timeoutSeconds,
    attempts,
    statusRetryLimit,
    statusRetryBackoffMs,
    branch,
    enableFeatures,
    disableFeatures,
    env: cloudEnvOverrides,
    onUpdate: async (cloudExecution) => {
      manifest.cloud_execution = cloudExecution;
      targetEntry.log_path = cloudExecution.log_path;
      await schedulePersist({ manifest: true, force: true });
    }
  });

  success = cloudResult.success;
  notes.push(...cloudResult.notes);
  manifest.cloud_execution = cloudResult.cloudExecution;
  targetEntry.log_path = cloudResult.cloudExecution.log_path;
  targetEntry.completed_at = isoTimestamp();
  targetEntry.exit_code = cloudResult.success ? 0 : 1;
  targetEntry.status = cloudResult.success ? 'succeeded' : 'failed';
  targetEntry.summary = cloudResult.summary;
  if (!cloudResult.success) {
    manifest.status_detail = `cloud:${targetStage.id}:failed`;
    appendSummary(manifest, cloudResult.summary);
  }
  await schedulePersist({ manifest: true, force: true });
  runEvents?.stageCompleted({
    stageId: targetStage.id,
    stageIndex: targetEntry.index,
    title: targetStage.title,
    kind: 'command',
    status: targetEntry.status,
    exitCode: targetEntry.exit_code,
    summary: targetEntry.summary,
    logPath: targetEntry.log_path
  });

  return { success, notes };
}
