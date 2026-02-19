import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { TaskManager } from '../manager.js';
import type { ManagerOptions } from '../manager.js';
import type { TaskContext, ExecutionMode, PlanItem } from '../types.js';
import { RunManifestWriter } from '../persistence/RunManifestWriter.js';
import { TaskStateStore } from '../persistence/TaskStateStore.js';
import {
  CommandPlanner,
  CommandBuilder,
  CommandTester,
  CommandReviewer,
  type PipelineExecutor
} from './adapters/index.js';
import { resolveEnvironmentPaths } from '../../../scripts/lib/run-manifests.js';
import { normalizeEnvironmentPaths } from './run/environment.js';
import type { EnvironmentPaths } from './run/environment.js';
import {
  bootstrapManifest,
  loadManifest,
  updateHeartbeat,
  finalizeStatus,
  appendSummary,
  ensureGuardrailStatus,
  resetForResume,
  recordResumeEvent
} from './run/manifest.js';
import { ManifestPersister, persistManifest } from './run/manifestPersister.js';
import { resolveRuntimeActivitySnapshot, type RuntimeActivitySnapshot } from './run/runtimeActivity.js';
import type {
  CliManifest,
  PipelineDefinition,
  PipelineExecutionResult,
  PipelineRunExecutionResult,
  PromptPackManifestEntry,
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
import { ControlWatcher } from './control/controlWatcher.js';
import { SchedulerService } from './services/schedulerService.js';
import {
  applyHandlesToRunSummary,
  applyPrivacyToRunSummary,
  applyCloudExecutionToRunSummary,
  applyCloudFallbackToRunSummary,
  applyUsageKpiToRunSummary,
  persistRunSummary
} from './services/runSummaryWriter.js';
import {
  prepareRun,
  resolvePipelineForResume,
  overrideTaskEnvironment
} from './services/runPreparation.js';
import { loadPackageConfig, loadUserConfig } from './config/userConfig.js';
import {
  loadDelegationConfigFiles,
  computeEffectiveDelegationConfig,
  parseDelegationConfigOverride,
  splitDelegationConfigOverrides,
  type DelegationConfigLayer
} from './config/delegationConfig.js';
import { ControlServer } from './control/controlServer.js';
import { RunEventEmitter, RunEventPublisher, snapshotStages } from './events/runEvents.js';
import { RunEventStream, attachRunEventAdapter } from './events/runEventStream.js';
import { CLI_EXECUTION_MODE_PARSER, resolveRequiresCloudPolicy } from '../utils/executionMode.js';
import { resolveCodexCliBin } from './utils/codexCli.js';
import { CodexCloudTaskExecutor } from '../cloud/CodexCloudTaskExecutor.js';
import { persistPipelineExperience } from './services/pipelineExperience.js';
import { runCloudPreflight } from './utils/cloudPreflight.js';
import { writeJsonAtomic } from './utils/fs.js';
import {
  buildAutoScoutEvidence,
  resolveAdvancedAutopilotDecision,
  type AdvancedAutopilotDecision
} from './utils/advancedAutopilot.js';

const resolveBaseEnvironment = (): EnvironmentPaths =>
  normalizeEnvironmentPaths(resolveEnvironmentPaths());

const CONFIG_OVERRIDE_ENV_KEYS = ['CODEX_CONFIG_OVERRIDES', 'CODEX_MCP_CONFIG_OVERRIDES'];
const DEFAULT_CLOUD_POLL_INTERVAL_SECONDS = 10;
const DEFAULT_CLOUD_TIMEOUT_SECONDS = 1800;
const DEFAULT_CLOUD_ATTEMPTS = 1;
const DEFAULT_CLOUD_STATUS_RETRY_LIMIT = 12;
const DEFAULT_CLOUD_STATUS_RETRY_BACKOFF_MS = 1500;
const DEFAULT_AUTO_SCOUT_TIMEOUT_MS = 4000;
const MAX_CLOUD_PROMPT_EXPERIENCES = 3;
const MAX_CLOUD_PROMPT_EXPERIENCE_CHARS = 320;

function collectDelegationEnvOverrides(env: NodeJS.ProcessEnv = process.env): DelegationConfigLayer[] {
  const layers: DelegationConfigLayer[] = [];
  for (const key of CONFIG_OVERRIDE_ENV_KEYS) {
    const raw = env[key];
    if (!raw) {
      continue;
    }
    const values = splitDelegationConfigOverrides(raw);
    for (const value of values) {
      try {
        const layer = parseDelegationConfigOverride(value, 'env');
        if (layer) {
          layers.push(layer);
        }
      } catch (error) {
        logger.warn(
          `Invalid delegation config override (env): ${(error as Error)?.message ?? String(error)}`
        );
      }
    }
  }
  return layers;
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

function allowCloudFallback(envOverrides?: NodeJS.ProcessEnv): boolean {
  const raw =
    readCloudString(envOverrides?.CODEX_ORCHESTRATOR_CLOUD_FALLBACK) ??
    readCloudString(process.env.CODEX_ORCHESTRATOR_CLOUD_FALLBACK);
  if (!raw) {
    return true;
  }
  const normalized = raw.toLowerCase();
  return !['0', 'false', 'off', 'deny', 'disabled', 'never', 'strict'].includes(normalized);
}

function normalizeCloudFallbackIssues(
  issues: { code: string; message: string }[]
): Array<{ code: string; message: string }> {
  return issues.map((issue) => ({ code: issue.code, message: issue.message }));
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
  manifest: CliManifest;
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

function resolveCloudEnvironmentId(
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

interface ExecutePipelineOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  mode: ExecutionMode;
  executionModeOverride?: ExecutionMode;
  target: PlanItem;
  task: TaskContext;
  runEvents?: RunEventPublisher;
  eventStream?: RunEventStream;
  onEventEntry?: (entry: import('./events/runEventStream.js').RunEventStreamEntry) => void;
  persister?: ManifestPersister;
  envOverrides?: NodeJS.ProcessEnv;
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
  eventStream?: RunEventStream;
  onEventEntry?: (entry: import('./events/runEventStream.js').RunEventStreamEntry) => void;
  persister: ManifestPersister;
  envOverrides: NodeJS.ProcessEnv;
  executionModeOverride?: ExecutionMode;
}

type AutoScoutOutcome =
  | { status: 'recorded'; path: string }
  | { status: 'timeout' | 'error'; message: string };

export class CodexOrchestrator {
  private readonly controlPlane = new ControlPlaneService();
  private readonly scheduler = new SchedulerService();

  constructor(private readonly baseEnv: EnvironmentPaths = resolveBaseEnvironment()) {}

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
    const persister = new ManifestPersister({
      manifest,
      paths,
      persistIntervalMs: Math.max(1000, manifest.heartbeat_interval_seconds * 1000)
    });

    const emitter = options.runEvents ?? new RunEventEmitter();
    let eventStream: RunEventStream | null = null;
    let controlServer: ControlServer | null = null;
    let detachStream: (() => void) | null = null;
    let onEventEntry: ((entry: import('./events/runEventStream.js').RunEventStreamEntry) => void) | undefined;

    try {
      const stream = await RunEventStream.create({
        paths,
        taskId: manifest.task_id,
        runId,
        pipelineId: preparation.pipeline.id,
        pipelineTitle: preparation.pipeline.title
      });
      eventStream = stream;
      const configFiles = await loadDelegationConfigFiles({ repoRoot: preparation.env.repoRoot });
      const envOverrideLayers = collectDelegationEnvOverrides();
      const layers = [configFiles.global, configFiles.repo, ...envOverrideLayers].filter(
        Boolean
      ) as DelegationConfigLayer[];
      const effectiveConfig = computeEffectiveDelegationConfig({
        repoRoot: preparation.env.repoRoot,
        layers
      });
      controlServer = effectiveConfig.ui.controlEnabled
        ? await ControlServer.start({
            paths,
            config: effectiveConfig,
            eventStream: stream,
            runId
          })
        : null;
      onEventEntry = (entry: import('./events/runEventStream.js').RunEventStreamEntry) => {
        controlServer?.broadcast(entry);
      };
      const onStreamError = (error: Error, payload: { event: string }) => {
        logger.warn(`Failed to append run event ${payload.event}: ${error.message}`);
      };
      detachStream = attachRunEventAdapter(emitter, stream, onEventEntry, onStreamError);
      const runEvents = this.createRunEventPublisher({
        runId,
        pipeline: preparation.pipeline,
        manifest,
        paths,
        emitter
      });

      return await this.performRunLifecycle({
        env: preparation.env,
        pipeline: preparation.pipeline,
        manifest,
        paths,
        planner: preparation.planner,
        taskContext: preparation.taskContext,
        runId,
        runEvents,
        eventStream: stream,
        onEventEntry,
        persister,
        envOverrides: preparation.envOverrides,
        executionModeOverride: options.executionMode
      });
    } finally {
      if (detachStream) {
        try {
          detachStream();
        } catch (error) {
          logger.warn(`Failed to detach run event stream: ${(error as Error)?.message ?? String(error)}`);
        }
      }
      if (controlServer) {
        try {
          await controlServer.close();
        } catch (error) {
          logger.warn(`Failed to close control server: ${(error as Error)?.message ?? String(error)}`);
        }
      }
      if (eventStream) {
        try {
          await eventStream.close();
        } catch (error) {
          logger.warn(`Failed to close run event stream: ${(error as Error)?.message ?? String(error)}`);
        }
      }
    }
  }

  async resume(options: ResumeOptions): Promise<PipelineExecutionResult> {
    const env = this.baseEnv;
    const { manifest, paths } = await loadManifest(env, options.runId);
    const actualEnv = overrideTaskEnvironment(env, manifest.task_id);

    const resolver = new PipelineResolver();
    const designConfig = await resolver.loadDesignConfig(actualEnv.repoRoot);

    const userConfig = await loadUserConfig(actualEnv);
    const fallbackConfig =
      manifest.pipeline_id === 'rlm' && userConfig?.source === 'repo'
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
      resolver,
      taskIdOverride: manifest.task_id,
      targetStageId: options.targetStageId,
      planTargetFallback: manifest.plan_target_id ?? null,
      envOverrides
    });
    manifest.plan_target_id = preparation.planPreview?.targetId ?? preparation.plannerTargetId ?? null;
    const persister = new ManifestPersister({
      manifest,
      paths,
      persistIntervalMs: Math.max(1000, manifest.heartbeat_interval_seconds * 1000)
    });
    await persister.schedule({ manifest: true, heartbeat: true, force: true });

    const emitter = options.runEvents ?? new RunEventEmitter();
    let eventStream: RunEventStream | null = null;
    let controlServer: ControlServer | null = null;
    let detachStream: (() => void) | null = null;
    let onEventEntry: ((entry: import('./events/runEventStream.js').RunEventStreamEntry) => void) | undefined;

    try {
      const stream = await RunEventStream.create({
        paths,
        taskId: manifest.task_id,
        runId: manifest.run_id,
        pipelineId: pipeline.id,
        pipelineTitle: pipeline.title
      });
      eventStream = stream;
      const configFiles = await loadDelegationConfigFiles({ repoRoot: preparation.env.repoRoot });
      const envOverrideLayers = collectDelegationEnvOverrides();
      const layers = [configFiles.global, configFiles.repo, ...envOverrideLayers].filter(
        Boolean
      ) as DelegationConfigLayer[];
      const effectiveConfig = computeEffectiveDelegationConfig({
        repoRoot: preparation.env.repoRoot,
        layers
      });
      controlServer = effectiveConfig.ui.controlEnabled
        ? await ControlServer.start({
            paths,
            config: effectiveConfig,
            eventStream: stream,
            runId: manifest.run_id
          })
        : null;
      onEventEntry = (entry: import('./events/runEventStream.js').RunEventStreamEntry) => {
        controlServer?.broadcast(entry);
      };
      const onStreamError = (error: Error, payload: { event: string }) => {
        logger.warn(`Failed to append run event ${payload.event}: ${error.message}`);
      };
      detachStream = attachRunEventAdapter(emitter, stream, onEventEntry, onStreamError);
      const runEvents = this.createRunEventPublisher({
        runId: manifest.run_id,
        pipeline,
        manifest,
        paths,
        emitter
      });

      return await this.performRunLifecycle({
        env: preparation.env,
        pipeline,
        manifest,
        paths,
        planner: preparation.planner,
        taskContext: preparation.taskContext,
        runId: manifest.run_id,
        runEvents,
        eventStream: stream,
        onEventEntry,
        persister,
        envOverrides: preparation.envOverrides
      });
    } finally {
      if (detachStream) {
        try {
          detachStream();
        } catch (error) {
          logger.warn(`Failed to detach run event stream: ${(error as Error)?.message ?? String(error)}`);
        }
      }
      if (controlServer) {
        try {
          await controlServer.close();
        } catch (error) {
          logger.warn(`Failed to close control server: ${(error as Error)?.message ?? String(error)}`);
        }
      }
      if (eventStream) {
        try {
          await eventStream.close();
        } catch (error) {
          logger.warn(`Failed to close run event stream: ${(error as Error)?.message ?? String(error)}`);
        }
      }
    }
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
    executePipeline: PipelineExecutor,
    getResult: () => PipelineRunExecutionResult | null,
    plannerInstance: CommandPlanner | undefined,
    env: EnvironmentPaths,
    modeOverride?: ExecutionMode
  ): TaskManager {
    const planner = plannerInstance ?? new CommandPlanner(pipeline);
    const builder = new CommandBuilder(executePipeline);
    const tester = new CommandTester(getResult);
    const reviewer = new CommandReviewer(getResult);
    const stateStore = new TaskStateStore({ outDir: env.outRoot, runsDir: env.runsRoot });
    const manifestWriter = new RunManifestWriter({ runsDir: env.runsRoot });

    const options: ManagerOptions = {
      planner,
      builder,
      tester,
      reviewer,
      runIdFactory: () => runId,
      modePolicy: (task, subtask) => this.determineMode(task, subtask, modeOverride),
      persistence: { autoStart: true, stateStore, manifestWriter }
    };

    return new TaskManager(options);
  }

  private determineMode(
    task: TaskContext,
    subtask: PlanItem,
    overrideMode?: ExecutionMode
  ): ExecutionMode {
    if (overrideMode) {
      return overrideMode;
    }
    if (this.requiresCloudExecution(task, subtask)) {
      return 'cloud';
    }
    return 'mcp';
  }

  private requiresCloudExecution(task: TaskContext, subtask: PlanItem): boolean {
    const requiresCloudFlag = resolveRequiresCloudPolicy({
      boolFlags: [subtask.requires_cloud, subtask.requiresCloud],
      metadata: {
        executionMode:
          typeof subtask.metadata?.executionMode === 'string'
            ? (subtask.metadata.executionMode as string)
            : null,
        mode: typeof subtask.metadata?.mode === 'string' ? (subtask.metadata.mode as string) : null
      },
      metadataOrder: ['executionMode', 'mode'],
      parseMode: CLI_EXECUTION_MODE_PARSER
    });
    if (requiresCloudFlag !== null) {
      return requiresCloudFlag;
    }
    return Boolean(task.metadata?.execution?.parallel);
  }

  private async executePipeline(options: ExecutePipelineOptions): Promise<PipelineRunExecutionResult> {
    if (options.mode === 'cloud') {
      const environmentId = resolveCloudEnvironmentId(options.task, options.target, options.envOverrides);
      const branch =
        readCloudString(options.envOverrides?.CODEX_CLOUD_BRANCH) ??
        readCloudString(process.env.CODEX_CLOUD_BRANCH);
      const mergedEnv = { ...process.env, ...(options.envOverrides ?? {}) };
      const codexBin = resolveCodexCliBin(mergedEnv);
      const preflight = await runCloudPreflight({
        repoRoot: options.env.repoRoot,
        codexBin,
        environmentId,
        branch,
        env: mergedEnv
      });
      if (!preflight.ok) {
        if (!allowCloudFallback(options.envOverrides)) {
          const detail =
            `Cloud preflight failed and cloud fallback is disabled. ` +
            preflight.issues.map((issue) => issue.message).join(' ');
          finalizeStatus(options.manifest, 'failed', 'cloud-preflight-failed');
          appendSummary(options.manifest, detail);
          logger.error(detail);
          return {
            success: false,
            notes: [detail],
            manifest: options.manifest,
            manifestPath: options.paths.manifestPath,
            logPath: options.paths.logPath
          };
        }

        const detail =
          `Cloud preflight failed; falling back to mcp. ` +
          preflight.issues.map((issue) => issue.message).join(' ');
        options.manifest.cloud_fallback = {
          mode_requested: 'cloud',
          mode_used: 'mcp',
          reason: detail,
          issues: normalizeCloudFallbackIssues(preflight.issues),
          checked_at: isoTimestamp()
        };
        appendSummary(options.manifest, detail);
        logger.warn(detail);
        const fallback = await this.executePipeline({ ...options, mode: 'mcp', executionModeOverride: 'mcp' });
        fallback.notes.unshift(detail);
        return fallback;
      }
      return await this.executeCloudPipeline(options);
    }

    const { env, pipeline, manifest, paths, runEvents, envOverrides } = options;
    const notes: string[] = [];
    let success = true;
    manifest.guardrail_status = undefined;

    const advancedDecision = resolveAdvancedAutopilotDecision({
      pipelineId: pipeline.id,
      targetMetadata: (options.target.metadata ?? null) as Record<string, unknown> | null,
      taskMetadata: (options.task.metadata ?? null) as Record<string, unknown> | null,
      env: { ...process.env, ...(envOverrides ?? {}) }
    });
    if (advancedDecision.enabled || advancedDecision.source !== 'default') {
      const advancedSummary =
        `Advanced mode (${advancedDecision.mode}) ${advancedDecision.enabled ? 'enabled' : 'disabled'}: ${advancedDecision.reason}.`;
      appendSummary(manifest, advancedSummary);
      notes.push(advancedSummary);
    }

    const persister =
      options.persister ??
      new ManifestPersister({
        manifest,
        paths,
        persistIntervalMs: Math.max(1000, manifest.heartbeat_interval_seconds * 1000)
      });
    const schedulePersist = (
      options: { manifest?: boolean; heartbeat?: boolean; force?: boolean } = {}
    ): Promise<void> => persister.schedule(options);

    const pushHeartbeat = (forceManifest = false): Promise<void> => {
      updateHeartbeat(manifest);
      return schedulePersist({ manifest: forceManifest, heartbeat: true, force: forceManifest });
    };

    const controlWatcher = new ControlWatcher({
      paths,
      manifest,
      eventStream: options.eventStream,
      onEntry: options.onEventEntry,
      persist: () => schedulePersist({ manifest: true, force: true })
    });

    manifest.status = 'in_progress';
    updateHeartbeat(manifest);
    await schedulePersist({ manifest: true, heartbeat: true, force: true });
    runEvents?.runStarted(snapshotStages(manifest, pipeline), manifest.status);

    if (advancedDecision.autoScout) {
      const scoutOutcome = await this.runAutoScout({
        env,
        paths,
        manifest,
        mode: options.mode,
        pipeline,
        target: options.target,
        task: options.task,
        envOverrides,
        advancedDecision
      });
      const scoutMessage =
        scoutOutcome.status === 'recorded'
          ? `Auto scout: evidence recorded at ${scoutOutcome.path}.`
          : `Auto scout: ${scoutOutcome.message} (non-blocking).`;
      appendSummary(manifest, scoutMessage);
      notes.push(scoutMessage);
      await schedulePersist({ manifest: true, force: true });
    }

    const heartbeatInterval = setInterval(() => {
      void pushHeartbeat(false).catch((error) => {
        logger.warn(
          `Heartbeat update failed for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`
        );
      });
    }, manifest.heartbeat_interval_seconds * 1000);

    try {
      for (let i = 0; i < pipeline.stages.length; i += 1) {
        await controlWatcher.sync();
        await controlWatcher.waitForResume();
        if (controlWatcher.isCanceled()) {
          manifest.status_detail = 'run-canceled';
          success = false;
          break;
        }
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
              events: runEvents,
              persister,
              envOverrides
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
          try {
            const child = await this.start({
              taskId: env.taskId,
              pipelineId: stage.pipeline,
              parentRunId: manifest.run_id,
              format: 'json',
              executionMode: options.executionModeOverride
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
          } catch (error) {
            entry.completed_at = isoTimestamp();
            entry.summary = `Sub-pipeline error: ${(error as Error)?.message ?? String(error)}`;
            entry.status = stage.optional ? 'skipped' : 'failed';
            entry.command = null;
            manifest.status_detail = `subpipeline:${stage.pipeline}:error`;
            appendSummary(manifest, entry.summary);
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
            if (!stage.optional) {
              success = false;
              break;
            }
          }
        }
      }
    } finally {
      clearInterval(heartbeatInterval);
      await schedulePersist({ force: true });
    }

    await controlWatcher.sync();

    if (controlWatcher.isCanceled()) {
      finalizeStatus(manifest, 'cancelled', manifest.status_detail ?? 'run-canceled');
    } else if (success) {
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
    await persistPipelineExperience({ env, pipeline, manifest, paths });
    await schedulePersist({ force: true });
    await appendMetricsEntry(env, paths, manifest, persister);

    return {
      success,
      notes,
      manifest,
      manifestPath: relativeToRepo(env, paths.manifestPath),
      logPath: relativeToRepo(env, paths.logPath)
    };
  }

  private async executeCloudPipeline(options: ExecutePipelineOptions): Promise<PipelineRunExecutionResult> {
    const { env, pipeline, manifest, paths, runEvents, target, task, envOverrides } = options;
    const notes: string[] = [];
    let success = true;
    manifest.guardrail_status = undefined;

    const persister =
      options.persister ??
      new ManifestPersister({
        manifest,
        paths,
        persistIntervalMs: Math.max(1000, manifest.heartbeat_interval_seconds * 1000)
      });
    const schedulePersist = (
      persistOptions: { manifest?: boolean; heartbeat?: boolean; force?: boolean } = {}
    ): Promise<void> => persister.schedule(persistOptions);

    const pushHeartbeat = (forceManifest = false): Promise<void> => {
      updateHeartbeat(manifest);
      return schedulePersist({ manifest: forceManifest, heartbeat: true, force: forceManifest });
    };

    const controlWatcher = new ControlWatcher({
      paths,
      manifest,
      eventStream: options.eventStream,
      onEntry: options.onEventEntry,
      persist: () => schedulePersist({ manifest: true, force: true })
    });

    manifest.status = 'in_progress';
    updateHeartbeat(manifest);
    await schedulePersist({ manifest: true, heartbeat: true, force: true });
    runEvents?.runStarted(snapshotStages(manifest, pipeline), manifest.status);

    const advancedDecision = resolveAdvancedAutopilotDecision({
      pipelineId: pipeline.id,
      targetMetadata: (target.metadata ?? null) as Record<string, unknown> | null,
      taskMetadata: (task.metadata ?? null) as Record<string, unknown> | null,
      env: { ...process.env, ...(envOverrides ?? {}) }
    });
    if (advancedDecision.enabled || advancedDecision.source !== 'default') {
      const advancedSummary =
        `Advanced mode (${advancedDecision.mode}) ${advancedDecision.enabled ? 'enabled' : 'disabled'}: ${advancedDecision.reason}.`;
      appendSummary(manifest, advancedSummary);
      notes.push(advancedSummary);
      await schedulePersist({ manifest: true, force: true });
    }
    if (advancedDecision.autoScout) {
      const scoutOutcome = await this.runAutoScout({
        env,
        paths,
        manifest,
        mode: options.mode,
        pipeline,
        target,
        task,
        envOverrides,
        advancedDecision
      });
      const scoutMessage =
        scoutOutcome.status === 'recorded'
          ? `Auto scout: evidence recorded at ${scoutOutcome.path}.`
          : `Auto scout: ${scoutOutcome.message} (non-blocking).`;
      appendSummary(manifest, scoutMessage);
      notes.push(scoutMessage);
      await schedulePersist({ manifest: true, force: true });
    }

    const heartbeatInterval = setInterval(() => {
      void pushHeartbeat(false).catch((error) => {
        logger.warn(
          `Heartbeat update failed for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`
        );
      });
    }, manifest.heartbeat_interval_seconds * 1000);

    const targetStageId = this.resolveTargetStageId(target, pipeline);
    const targetStage = targetStageId
      ? pipeline.stages.find((stage) => stage.id === targetStageId)
      : undefined;
    const targetEntry = targetStageId
      ? manifest.commands.find((command) => command.id === targetStageId)
      : undefined;

    try {
      await controlWatcher.sync();
      await controlWatcher.waitForResume();
      if (controlWatcher.isCanceled()) {
        manifest.status_detail = 'run-canceled';
        success = false;
      } else if (!targetStage || targetStage.kind !== 'command' || !targetEntry) {
        success = false;
        manifest.status_detail = 'cloud-target-missing';
        const detail = targetStageId
          ? `Cloud execution target "${targetStageId}" could not be resolved to a command stage.`
          : `Cloud execution target "${target.id}" could not be resolved.`;
        appendSummary(manifest, detail);
        notes.push(detail);
      } else {
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

        const environmentId = resolveCloudEnvironmentId(task, target, envOverrides);
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
        } else {
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

          const executor = new CodexCloudTaskExecutor();
          const prompt = this.buildCloudPrompt(task, target, pipeline, targetStage, manifest);
          const pollIntervalSeconds = readCloudNumber(
            envOverrides?.CODEX_CLOUD_POLL_INTERVAL_SECONDS ?? process.env.CODEX_CLOUD_POLL_INTERVAL_SECONDS,
            DEFAULT_CLOUD_POLL_INTERVAL_SECONDS
          );
          const timeoutSeconds = readCloudNumber(
            envOverrides?.CODEX_CLOUD_TIMEOUT_SECONDS ?? process.env.CODEX_CLOUD_TIMEOUT_SECONDS,
            DEFAULT_CLOUD_TIMEOUT_SECONDS
          );
          const attempts = readCloudNumber(
            envOverrides?.CODEX_CLOUD_EXEC_ATTEMPTS ?? process.env.CODEX_CLOUD_EXEC_ATTEMPTS,
            DEFAULT_CLOUD_ATTEMPTS
          );
          const statusRetryLimit = readCloudNumber(
            envOverrides?.CODEX_CLOUD_STATUS_RETRY_LIMIT ?? process.env.CODEX_CLOUD_STATUS_RETRY_LIMIT,
            DEFAULT_CLOUD_STATUS_RETRY_LIMIT
          );
          const statusRetryBackoffMs = readCloudNumber(
            envOverrides?.CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS ?? process.env.CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS,
            DEFAULT_CLOUD_STATUS_RETRY_BACKOFF_MS
          );
          const branch =
            readCloudString(envOverrides?.CODEX_CLOUD_BRANCH) ??
            readCloudString(process.env.CODEX_CLOUD_BRANCH);
          const enableFeatures = readCloudFeatureList(
            readCloudString(envOverrides?.CODEX_CLOUD_ENABLE_FEATURES) ??
              readCloudString(process.env.CODEX_CLOUD_ENABLE_FEATURES)
          );
          const disableFeatures = readCloudFeatureList(
            readCloudString(envOverrides?.CODEX_CLOUD_DISABLE_FEATURES) ??
              readCloudString(process.env.CODEX_CLOUD_DISABLE_FEATURES)
          );
          const codexBin = resolveCodexCliBin({ ...process.env, ...(envOverrides ?? {}) });
          const cloudEnvOverrides: NodeJS.ProcessEnv = {
            ...(envOverrides ?? {}),
            CODEX_NON_INTERACTIVE:
              envOverrides?.CODEX_NON_INTERACTIVE ?? process.env.CODEX_NON_INTERACTIVE ?? '1',
            CODEX_NO_INTERACTIVE:
              envOverrides?.CODEX_NO_INTERACTIVE ?? process.env.CODEX_NO_INTERACTIVE ?? '1',
            CODEX_INTERACTIVE: envOverrides?.CODEX_INTERACTIVE ?? process.env.CODEX_INTERACTIVE ?? '0'
          };
          const cloudResult = await executor.execute({
            codexBin,
            prompt,
            environmentId,
            repoRoot: env.repoRoot,
            runDir: paths.runDir,
            pollIntervalSeconds,
            timeoutSeconds,
            attempts,
            statusRetryLimit,
            statusRetryBackoffMs,
            branch,
            enableFeatures,
            disableFeatures,
            env: cloudEnvOverrides
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
        }
      }
    } finally {
      clearInterval(heartbeatInterval);
      await schedulePersist({ force: true });
    }

    await controlWatcher.sync();

    if (controlWatcher.isCanceled()) {
      finalizeStatus(manifest, 'cancelled', manifest.status_detail ?? 'run-canceled');
    } else if (success) {
      finalizeStatus(manifest, 'succeeded');
    } else {
      finalizeStatus(manifest, 'failed', manifest.status_detail ?? 'cloud-execution-failed');
    }

    updateHeartbeat(manifest);
    await schedulePersist({ manifest: true, heartbeat: true, force: true }).catch((error) => {
      logger.warn(
        `Heartbeat update failed for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`
      );
    });
    await persistPipelineExperience({ env, pipeline, manifest, paths });
    await schedulePersist({ force: true });
    await appendMetricsEntry(env, paths, manifest, persister);

    return {
      success,
      notes,
      manifest,
      manifestPath: relativeToRepo(env, paths.manifestPath),
      logPath: relativeToRepo(env, paths.logPath)
    };
  }

  private resolveTargetStageId(target: PlanItem, pipeline: PipelineDefinition): string | null {
    const metadataStageId =
      typeof target.metadata?.stageId === 'string' ? (target.metadata.stageId as string) : null;
    if (metadataStageId && pipeline.stages.some((stage) => stage.id === metadataStageId)) {
      return metadataStageId;
    }

    if (target.id.includes(':')) {
      const suffix = target.id.split(':').pop() ?? null;
      if (suffix && pipeline.stages.some((stage) => stage.id === suffix)) {
        return suffix;
      }
    }

    if (pipeline.stages.some((stage) => stage.id === target.id)) {
      return target.id;
    }
    return null;
  }

  private buildCloudPrompt(
    task: TaskContext,
    target: PlanItem,
    pipeline: PipelineDefinition,
    stage: PipelineDefinition['stages'][number],
    manifest: CliManifest
  ): string {
    const lines = [
      `Task ID: ${task.id}`,
      `Task title: ${task.title}`,
      task.description ? `Task description: ${task.description}` : null,
      `Pipeline: ${pipeline.id}`,
      `Target stage: ${stage.id} (${target.description})`,
      '',
      'Apply the required repository changes for this target stage and produce a diff.'
    ].filter((line): line is string => Boolean(line));

    lines.push(...buildCloudExperiencePromptLines({ manifest, pipeline, target, stage }));

    return lines.join('\n');
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
  }): Promise<AutoScoutOutcome> {
    const mergedEnv = { ...process.env, ...(params.envOverrides ?? {}) };
    const timeoutMs = readCloudNumber(
      mergedEnv.CODEX_ORCHESTRATOR_AUTO_SCOUT_TIMEOUT_MS,
      DEFAULT_AUTO_SCOUT_TIMEOUT_MS
    );

    const work = async (): Promise<AutoScoutOutcome> => {
      const cloudEnvironmentId = resolveCloudEnvironmentId(params.task, params.target, params.envOverrides);
      const cloudBranch =
        readCloudString(params.envOverrides?.CODEX_CLOUD_BRANCH) ??
        readCloudString(process.env.CODEX_CLOUD_BRANCH);
      const cloudRequested =
        params.mode === 'cloud' || params.manifest.cloud_fallback?.mode_requested === 'cloud';

      const evidence = buildAutoScoutEvidence({
        taskId: params.manifest.task_id,
        pipelineId: params.pipeline.id,
        targetId: params.target.id,
        targetDescription: params.target.description,
        executionMode: params.mode,
        cloudRequested,
        advanced: params.advancedDecision,
        cloudEnvironmentId,
        cloudBranch,
        env: mergedEnv,
        generatedAt: isoTimestamp()
      });
      const evidencePath = join(params.paths.runDir, 'auto-scout.json');
      await writeJsonAtomic(evidencePath, evidence);
      return { status: 'recorded', path: relativeToRepo(params.env, evidencePath) };
    };

    try {
      let timeoutHandle: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<AutoScoutOutcome>((resolve) => {
        timeoutHandle = setTimeout(() => {
          resolve({
            status: 'timeout',
            message: `timed out after ${Math.round(timeoutMs / 1000)}s`
          });
        }, timeoutMs);
        timeoutHandle.unref?.();
      });
      const workPromise = work().catch((error): AutoScoutOutcome => ({
        status: 'error',
        message: (error as Error)?.message ?? String(error)
      }));
      const result = await Promise.race([workPromise, timeoutPromise]);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      return result;
    } catch (error) {
      return {
        status: 'error',
        message: (error as Error)?.message ?? String(error)
      };
    }
  }

  private async performRunLifecycle(context: RunLifecycleContext): Promise<PipelineExecutionResult> {
    const {
      env,
      pipeline,
      manifest,
      paths,
      planner,
      taskContext,
      runId,
      persister,
      envOverrides,
      executionModeOverride
    } = context;
    let latestPipelineResult: PipelineRunExecutionResult | null = null;
    const executingByKey = new Map<string, Promise<PipelineRunExecutionResult>>();
    const executePipeline: PipelineExecutor = async (input) => {
      const key = `${input.mode}:${input.target.id}`;
      const existing = executingByKey.get(key);
      if (existing) {
        return existing;
      }
      const executing = this.executePipeline({
        env,
        pipeline,
        manifest,
        paths,
        mode: input.mode,
        executionModeOverride,
        target: input.target,
        task: taskContext,
        runEvents: context.runEvents,
        eventStream: context.eventStream,
        onEventEntry: context.onEventEntry,
        persister,
        envOverrides
      }).then((result) => {
        latestPipelineResult = result;
        return result;
      });
      executingByKey.set(key, executing);
      return executing;
    };
    const getResult = () => latestPipelineResult;
    const manager = this.createTaskManager(
      runId,
      pipeline,
      executePipeline,
      getResult,
      planner,
      env,
      executionModeOverride
    );
    this.attachPlanTargetTracker(manager, manifest, paths, persister);

    getPrivacyGuard().reset();

    const controlPlaneResult = await this.controlPlane.guard({
      env,
      manifest,
      paths,
      pipeline,
      task: taskContext,
      runId,
      requestedBy: { actorId: 'codex-cli', channel: 'cli', name: 'Codex CLI' },
      persister
    });

    const schedulerPlan = await this.scheduler.createPlanForRun({
      env,
      manifest,
      paths,
      controlPlaneResult,
      persister
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
      plan: schedulerPlan,
      persister
    });

    this.scheduler.applySchedulerToRunSummary(runSummary, schedulerPlan);
    applyHandlesToRunSummary(runSummary, manifest);
    applyPrivacyToRunSummary(runSummary, manifest);
    applyCloudExecutionToRunSummary(runSummary, manifest);
    applyCloudFallbackToRunSummary(runSummary, manifest);
    applyUsageKpiToRunSummary(runSummary, manifest);
    this.controlPlane.applyControlPlaneToRunSummary(runSummary, controlPlaneResult);

    await persistRunSummary(env, paths, manifest, runSummary, persister);
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

  private attachPlanTargetTracker(
    manager: TaskManager,
    manifest: CliManifest,
    paths: RunPaths,
    persister?: ManifestPersister
  ): void {
    manager.bus.on('plan:completed', (event) => {
      const targetId = event.payload.plan.targetId ?? null;
      if (manifest.plan_target_id === targetId) {
        return;
      }
      manifest.plan_target_id = targetId;
      void persistManifest(paths, manifest, persister, { force: true }).catch((error) => {
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
