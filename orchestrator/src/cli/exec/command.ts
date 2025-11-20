import process from 'node:process';
import { join } from 'node:path';

import type { EnvironmentPaths } from '../run/environment.js';
import { relativeToRepo } from '../run/runPaths.js';
import {
  appendCommandError,
  bootstrapManifest,
  finalizeStatus,
  saveManifest,
  updateCommandStatus
} from '../run/manifest.js';
import type {
  CommandStage,
  CliManifest,
  CliManifestCommand,
  RunStatus,
  PipelineDefinition,
  TfgrpoManifestSection
} from '../types.js';
import { generateRunId } from '../utils/runId.js';
import { JsonlWriter } from '../utils/jsonlWriter.js';
import { runCommandStage, type CommandRunHooks } from '../services/commandRunner.js';
import { appendMetricsEntry } from '../metrics/metricsRecorder.js';
import { writeJsonAtomic } from '../utils/fs.js';
import {
  serializeExecEvent,
  serializeRunSummaryEvent
} from '../../../../packages/shared/events/serializer.js';
import type {
  ExecEvent,
  RunSummaryEvent,
  RunSummaryEventPayload,
  RunMetricSummary,
  ToolMetricSummary
} from '../../../../packages/shared/events/types.js';
import { ExperienceStore, type ExperienceRecord } from '../../persistence/ExperienceStore.js';
import {
  summarizeTrajectory,
  optimizeExperience,
  framesFromToolMetrics,
  type TfgrpoPolicyConfig
} from './experience.js';
import type { ToolRunRecord, SandboxState, ToolRunStatus } from '../../../../packages/shared/manifest/types.js';
import { sanitizeToolRunRecord } from '../../../../packages/shared/manifest/writer.js';
import {
  createTelemetrySink,
  type ExecTelemetrySink
} from '../../../../packages/orchestrator/src/telemetry/otel-exporter.js';
import {
  createNotificationSink,
  type ExecNotificationSink
} from '../../../../packages/orchestrator/src/notifications/index.js';
import type { RunPaths } from '../run/runPaths.js';
import { logger } from '../../logger.js';
import { isoTimestamp } from '../utils/time.js';

export type ExecOutputMode = 'interactive' | 'json' | 'jsonl';

export interface ExecCommandInvocation {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  outputMode: ExecOutputMode;
  notifyTargets?: string[];
  otelEndpoint?: string | null;
  jsonPretty?: boolean;
  session?: {
    id?: string;
    reuse?: boolean;
    persist?: boolean;
  };
  approvalRequired?: boolean;
  approvalKey?: string;
  description?: string;
}

export interface ExecCommandContext {
  env: EnvironmentPaths;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
  runIdFactory?: () => string;
  telemetrySink?: ExecTelemetrySink;
  notificationSink?: ExecNotificationSink;
}

export interface ExecRunSummary {
  runId: string;
  manifestPath: string;
  logPath: string;
  status: 'succeeded' | 'failed';
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  shellCommand: string;
  argv: string[];
  events: ExecEvent[];
  summaryEvent: RunSummaryEvent;
  toolRun: ToolRunRecord | null;
}

interface RunResultSummary {
  correlationId: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  status: ToolRunStatus;
  sandboxState: SandboxState;
}

const COST_PER_TOKEN_USD = 0.000002;
const DEFAULT_EXPERIENCE_WORD_LIMIT = 32;

export async function executeExecCommand(
  context: ExecCommandContext,
  invocation: ExecCommandInvocation
): Promise<ExecRunSummary> {
  if (!invocation.command) {
    throw new Error('exec command requires a command to run.');
  }

  const argv = [invocation.command, ...(invocation.args ?? [])];
  const shellCommand = buildShellCommand(argv);
  const stdout = context.stdout ?? process.stdout;
  const stderr = context.stderr ?? process.stderr;
  const outputMode = invocation.outputMode;

  if (outputMode === 'interactive') {
    stdout.write(`$ ${shellCommand}\n`);
  }

  const runIdFactory = context.runIdFactory ?? generateRunId;
  const env = context.env;
  const experienceStore = new ExperienceStore({
    outDir: env.outRoot,
    runsDir: env.runsRoot
  });
  const runId = runIdFactory();
  const pipeline = createPipeline(shellCommand, invocation, env);
  const stage = pipeline.stages[0] as CommandStage;
  const { manifest, paths } = await bootstrapManifest(runId, {
    env,
    pipeline,
    taskSlug: null,
    approvalPolicy: null
  });

  manifest.status = 'in_progress';
  await saveManifest(paths, manifest);

  const telemetrySink = context.telemetrySink ?? createTelemetrySink({
    endpoint: invocation.otelEndpoint,
    enabled: Boolean(invocation.otelEndpoint)
  });
  const envNotifications = parseNotificationEnv(process.env.CODEX_ORCHESTRATOR_NOTIFY);
  const notificationSink =
    context.notificationSink ??
    createNotificationSink({
      targets: invocation.notifyTargets,
      envTargets: envNotifications
    });

  const jsonlWriter = outputMode === 'jsonl' ? new JsonlWriter(stdout) : null;
  const execEvents: ExecEvent[] = [];
  const telemetryTasks: Array<Promise<void>> = [];
  let runResultSummary: RunResultSummary | null = null;
  let toolRecord: ToolRunRecord | null = null;

  const hooks: CommandRunHooks = {
    onEvent: (event) => {
      execEvents.push(event);
      const serialized = serializeExecEvent(event);
      telemetryTasks.push(Promise.resolve(telemetrySink.record(serialized)).then(() => undefined));
      if (outputMode === 'jsonl' && jsonlWriter) {
        jsonlWriter.write(serialized);
      } else if (outputMode === 'interactive') {
        streamInteractive(stdout, stderr, event);
      }
    },
    onResult: (result) => {
      runResultSummary = {
        correlationId: result.correlationId,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        signal: result.signal,
        durationMs: result.durationMs,
        status: result.status,
        sandboxState: result.sandboxState
      };
      toolRecord = sanitizeToolRunRecord(JSON.parse(JSON.stringify(result.record)) as ToolRunRecord);
    },
    onError: (error) => {
      toolRecord = sanitizeToolRunRecord(JSON.parse(JSON.stringify(error.record)) as ToolRunRecord);
    }
  };

  let commandError: unknown = null;
  try {
    await runCommandStage(
      {
        env,
        paths,
        manifest,
        stage,
        index: 1
      },
      hooks
    );
  } catch (error) {
    commandError = error;
  }

  const commandIndex = 0;
  let commandEntry = manifest.commands[commandIndex];
  const summarySnapshot = runResultSummary as RunResultSummary | null;
  let resultExitCode = extractExecMetadataField(toolRecord, 'exitCode') ?? null;
  if (summarySnapshot && summarySnapshot.exitCode !== undefined) {
    resultExitCode = summarySnapshot.exitCode;
  }
  let resultSignal = extractExecMetadataField(toolRecord, 'signal') ?? null;
  if (summarySnapshot && summarySnapshot.signal !== undefined) {
    resultSignal = summarySnapshot.signal;
  }
  if (commandError && resultExitCode === null) {
    resultExitCode = 1;
  }

  if (commandError && commandEntry) {
    commandEntry = await finalizeFailedCommandEntry({
      env,
      paths,
      manifest,
      commandEntry,
      commandIndex,
      error: commandError,
      exitCode: resultExitCode,
      signal: resultSignal,
      toolRecord,
      summarySnapshot,
      shellCommand
    });
  }

  const runStatus = determineRunStatus(commandEntry);

  manifest.summary = commandEntry?.summary ?? manifest.summary;
  finalizeStatus(manifest, runStatus, commandEntry?.status === 'failed' ? 'exec-failed' : null);

  const tfgrpoContext = resolveTfgrpoContext();
  const toolMetric = buildToolMetricSnapshot(toolRecord, summarySnapshot);
  const runMetricSummary = createRunMetricSummary(
    toolMetric ? [toolMetric] : [],
    tfgrpoContext
  );
  manifest.tfgrpo = mergeTfgrpoManifest(manifest.tfgrpo, runMetricSummary, tfgrpoContext);
  await persistExperienceRecords({
    store: experienceStore,
    manifest,
    env,
    paths,
    tfgrpoContext,
    runMetrics: runMetricSummary,
    execEvents,
    policy: resolveExperiencePolicy()
  });
  await saveManifest(paths, manifest);

  const summaryPayload = createRunSummaryPayload({
    env,
    paths,
    manifest,
    runStatus,
    shellCommand,
    argv,
    resultSummary: summarySnapshot,
    toolRecord,
    execEvents,
    exitCode: resultExitCode,
    signal: resultSignal,
    notificationTargets: notificationSink.targets,
    cwd: stage.cwd ?? null,
    metrics: runMetricSummary
  });
  const summaryEvent = serializeRunSummaryEvent(summaryPayload);

  const notificationOutcome = await notificationSink.notify(summaryEvent);
  if (summaryPayload.notifications) {
    summaryPayload.notifications.delivered = notificationOutcome.delivered;
    summaryPayload.notifications.failures = notificationOutcome.failures;
  }

  telemetryTasks.push(Promise.resolve(telemetrySink.recordSummary(summaryEvent)).then(() => undefined));

  if (outputMode === 'jsonl' && jsonlWriter) {
    jsonlWriter.write(summaryEvent);
  } else if (outputMode === 'json') {
    const spacing = invocation.jsonPretty ? 2 : 0;
    stdout.write(`${JSON.stringify(summaryEvent, null, spacing)}\n`);
  } else if (outputMode === 'interactive') {
    stdout.write(`\n${summaryPayload.run.id} ${summaryPayload.status.toUpperCase()}\n`);
    stdout.write(`Manifest: ${summaryPayload.run.manifest}\n`);
    stdout.write(`Log: ${summaryPayload.logs.runner}\n`);
  }

  await Promise.allSettled(telemetryTasks);
  await telemetrySink.flush();

  const runSummaryPath = join(paths.runDir, 'run-summary.json');
  await writeJsonAtomic(runSummaryPath, summaryEvent);
  manifest.run_summary_path = relativeToRepo(env, runSummaryPath);
  await saveManifest(paths, manifest);

  await appendMetricsEntry(env, paths, manifest);

  await telemetrySink.shutdown();
  await notificationSink.shutdown();

  if (commandError) {
    // ensure stderr receives detail if nothing was printed during run
    if (outputMode !== 'jsonl' && outputMode !== 'json') {
      stderr.write(
        `Command execution failed: ${(commandError as Error)?.message ?? String(commandError)}\n`
      );
    }
  }

  return {
    runId: manifest.run_id,
    manifestPath: summaryPayload.run.manifest,
    logPath: summaryPayload.logs.runner,
    status: summaryPayload.status,
    exitCode: summaryPayload.result.exitCode,
    signal: summaryPayload.result.signal,
    stdout: summaryPayload.outputs.stdout,
    stderr: summaryPayload.outputs.stderr,
    shellCommand,
    argv,
    events: execEvents,
    summaryEvent,
    toolRun: toolRecord ?? null
  };
}

function createPipeline(
  shellCommand: string,
  invocation: ExecCommandInvocation,
  env: EnvironmentPaths
): PipelineDefinition {
  const stage: CommandStage = {
    kind: 'command',
    id: 'exec',
    title: invocation.description ?? `Execute ${shellCommand}`,
    command: shellCommand,
    cwd: invocation.cwd ?? env.repoRoot,
    env: invocation.env,
    session: invocation.session
  };

  return {
    id: 'exec',
    title: 'CLI Exec Command',
    stages: [stage],
    guardrailsRequired: false
  };
}

function buildShellCommand(argv: string[]): string {
  return argv.map(shellEscape).join(' ');
}

function shellEscape(value: string): string {
  if (value === '') {
    return "''";
  }
  if (/^[A-Za-z0-9_/.:=-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function streamInteractive(
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream,
  event: ExecEvent
): void {
  switch (event.type) {
    case 'exec:chunk':
      if (event.payload.stream === 'stdout') {
        stdout.write(event.payload.data);
      } else {
        stderr.write(event.payload.data);
      }
      break;
    case 'exec:retry':
      stderr.write(
        `[retry] attempt ${event.attempt} in ${event.payload.delayMs}ms — ${event.payload.errorMessage}\n`
      );
      break;
    default:
      break;
  }
}

async function finalizeFailedCommandEntry(params: {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  commandEntry: CliManifestCommand;
  commandIndex: number;
  error: unknown;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  toolRecord: ToolRunRecord | null;
  summarySnapshot: RunResultSummary | null;
  shellCommand: string;
}): Promise<CliManifestCommand> {
  const {
    env,
    paths,
    manifest,
    commandEntry,
    commandIndex,
    error,
    exitCode,
    signal,
    toolRecord,
    summarySnapshot,
    shellCommand
  } = params;

  const failureSummary = buildFailureSummary(error, exitCode, signal);
  const updatedEntry = updateCommandStatus(manifest, commandIndex, {
    status: 'failed',
    completed_at: commandEntry.completed_at ?? isoTimestamp(),
    exit_code: exitCode,
    summary: failureSummary
  });

  const errorDetails = buildCommandErrorDetails({
    error,
    exitCode,
    signal,
    toolRecord,
    summarySnapshot,
    shellCommand
  });
  const errorFile = await appendCommandError(
    env,
    paths,
    manifest,
    updatedEntry,
    'command-execution-error',
    errorDetails
  );

  return updateCommandStatus(manifest, commandIndex, {
    error_file: errorFile
  });
}

function buildFailureSummary(
  error: unknown,
  exitCode: number | null,
  signal: NodeJS.Signals | null
): string {
  const message = normalizeErrorMessage(error);
  if (signal) {
    return `Command failed with signal ${signal}${message ? `: ${message}` : ''}`;
  }
  if (exitCode !== null && exitCode !== undefined) {
    return `Command failed with code ${exitCode}${message ? `: ${message}` : ''}`;
  }
  return message ? `Command failed: ${message}` : 'Command failed.';
}

function buildCommandErrorDetails(params: {
  error: unknown;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  toolRecord: ToolRunRecord | null;
  summarySnapshot: RunResultSummary | null;
  shellCommand: string;
}): Record<string, unknown> {
  const { error, exitCode, signal, toolRecord, summarySnapshot, shellCommand } = params;
  const execMetadata = readExecMetadata(toolRecord);
  const details: Record<string, unknown> = {
    message: normalizeErrorMessage(error),
    command: shellCommand
  };

  if (exitCode !== null && exitCode !== undefined) {
    details.exit_code = exitCode;
  }
  if (signal) {
    details.signal = signal;
  }

  const sandboxState =
    summarySnapshot?.sandboxState ?? toolRecord?.sandboxState ?? execMetadata?.sandboxState;
  if (sandboxState) {
    details.sandbox_state = sandboxState;
  }
  const correlationId = execMetadata?.correlationId ?? null;
  if (correlationId) {
    details.correlation_id = correlationId;
  }
  if (execMetadata?.sessionId) {
    details.session_id = execMetadata.sessionId;
  }
  if (typeof execMetadata?.persisted === 'boolean') {
    details.persisted = execMetadata.persisted;
  }
  if (toolRecord?.id) {
    details.tool_run_id = toolRecord.id;
  }
  if (toolRecord?.status) {
    details.status = toolRecord.status;
  }
  if (typeof toolRecord?.attemptCount === 'number') {
    details.attempts = toolRecord.attemptCount;
  } else if (typeof toolRecord?.retryCount === 'number') {
    details.attempts = toolRecord.retryCount + 1;
  }

  return details;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function determineRunStatus(entry: CliManifestCommand | undefined): RunStatus {
  if (!entry) {
    return 'failed';
  }
  return entry.status === 'succeeded' ? 'succeeded' : 'failed';
}

function parseNotificationEnv(value: string | undefined): string[] | null {
  if (!value) {
    return null;
  }
  const tokens = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return tokens.length ? tokens : null;
}

interface ExecMetadataSnapshot {
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  sandboxState?: SandboxState;
  sessionId?: string;
  persisted?: boolean;
  correlationId?: string | null;
}

function readExecMetadata(record: ToolRunRecord | null): ExecMetadataSnapshot | null {
  if (!record?.metadata || typeof record.metadata !== 'object') {
    return null;
  }
  const candidate = (record.metadata as Record<string, unknown>).exec;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  return candidate as ExecMetadataSnapshot;
}

function extractExecMetadataField<T extends keyof ExecMetadataSnapshot>(
  record: ToolRunRecord | null,
  field: T
): ExecMetadataSnapshot[T] | undefined {
  const metadata = readExecMetadata(record);
  return metadata ? metadata[field] : undefined;
}

function createRunSummaryPayload(params: {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  runStatus: RunStatus;
  shellCommand: string;
  argv: string[];
  resultSummary: RunResultSummary | null;
  toolRecord: ToolRunRecord | null;
  execEvents: ExecEvent[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  notificationTargets: string[];
  cwd: string | null;
  metrics: RunMetricSummary | null;
}): RunSummaryEventPayload {
  const {
    env,
    paths,
    manifest,
    runStatus,
    shellCommand,
    argv,
    resultSummary,
    toolRecord,
    execEvents,
    exitCode,
    signal,
    notificationTargets,
    cwd,
    metrics
  } = params;
  const stdout = resultSummary?.stdout ?? '';
  const stderr = resultSummary?.stderr ?? '';
  const correlationId = resultSummary?.correlationId ?? execEvents[0]?.correlationId ?? manifest.run_id;
  const attempts = typeof toolRecord?.attemptCount === 'number'
    ? toolRecord.attemptCount
    : (toolRecord?.retryCount ?? 0) + 1;
  const execMetadata = readExecMetadata(toolRecord);
  const sessionId = typeof execMetadata?.sessionId === 'string' ? execMetadata.sessionId : 'default';
  const persisted = Boolean(execMetadata?.persisted);
  const metadataSandbox = execMetadata?.sandboxState;
  const sandboxState: SandboxState =
    resultSummary?.sandboxState ?? toolRecord?.sandboxState ?? metadataSandbox ?? 'sandboxed';

  return {
    status: runStatus === 'succeeded' ? 'succeeded' : 'failed',
    run: {
      id: manifest.run_id,
      taskId: manifest.task_id,
      pipelineId: manifest.pipeline_id,
      manifest: relativeToRepo(env, paths.manifestPath),
      artifactRoot: manifest.artifact_root,
      summary: manifest.summary
    },
    result: {
      exitCode,
      signal,
      durationMs: resultSummary?.durationMs ?? 0,
      status: resultSummary?.status ?? (toolRecord?.status ?? 'failed'),
      sandboxState,
      correlationId,
      attempts
    },
    command: {
      argv,
      shell: shellCommand,
      cwd,
      sessionId,
      persisted
    },
    outputs: {
      stdout,
      stderr
    },
    logs: {
      runner: relativeToRepo(env, paths.logPath),
      command: manifest.commands[0]?.log_path ?? null
    },
    toolRun: toolRecord,
    metrics: metrics ?? undefined,
    notifications: {
      targets: notificationTargets,
      delivered: [],
      failures: []
    }
  };
}

interface TfgrpoContext {
  epoch: number | null;
  groupId: string | null;
  groupSize: number | null;
  active: boolean;
}

function resolveTfgrpoContext(env: NodeJS.ProcessEnv = process.env): TfgrpoContext {
  const epoch = parsePositiveInteger(env.TFGRPO_EPOCH);
  const groupSize = parsePositiveInteger(env.TFGRPO_GROUP_SIZE);
  const groupId = env.TFGRPO_GROUP_ID?.trim() || null;
  return {
    epoch,
    groupId,
    groupSize,
    active: epoch !== null || groupSize !== null || groupId !== null
  };
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function resolveExperiencePolicy(): TfgrpoPolicyConfig {
  const configured = process.env.TFGRPO_EXPERIENCE_MAX_WORDS;
  const parsed = configured ? Number.parseInt(configured, 10) : NaN;
  const maxSummaryWords = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EXPERIENCE_WORD_LIMIT;
  return {
    maxSummaryWords,
    rewardFloor: 0
  };
}

function buildToolMetricSnapshot(
  toolRecord: ToolRunRecord | null,
  summary: RunResultSummary | null
): ToolMetricSummary | null {
  if (!toolRecord && !summary) {
    return null;
  }
  const stdout = summary?.stdout ?? '';
  const tokens = estimateTokenCount(stdout);
  const latencyMs = summary?.durationMs ?? deriveDurationFromEvents(toolRecord);
  const costUsd = roundCurrency(tokens * COST_PER_TOKEN_USD);
  const attempts = toolRecord?.attemptCount ?? 1;
  const status = toolRecord?.status ?? summary?.status ?? 'failed';
  const sandboxState = summary?.sandboxState ?? toolRecord?.sandboxState ?? 'sandboxed';
  const toolName = toolRecord?.tool ?? 'cli:command';
  return {
    tool: toolName,
    tokens,
    costUsd,
    latencyMs,
    attempts,
    status,
    sandboxState
  };
}

function deriveDurationFromEvents(record: ToolRunRecord | null): number {
  const events = record?.events;
  if (!Array.isArray(events) || events.length === 0) {
    return 0;
  }
  const first = events.find((event) => event.type === 'exec:begin');
  const last = [...events].reverse().find((event) => event.type === 'exec:end');
  if (!first || !last) {
    return 0;
  }
  const startedAt = Date.parse(first.timestamp);
  const completedAt = Date.parse(last.timestamp);
  if (Number.isNaN(startedAt) || Number.isNaN(completedAt) || completedAt < startedAt) {
    return 0;
  }
  return completedAt - startedAt;
}

function estimateTokenCount(output: string): number {
  const trimmed = output.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/u).filter(Boolean).length;
}

function roundCurrency(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function createRunMetricSummary(
  metrics: ToolMetricSummary[],
  context: TfgrpoContext
): RunMetricSummary | null {
  const toolCalls = metrics.length;
  if (toolCalls === 0 && !context.active) {
    return null;
  }
  const tokenTotal = metrics.reduce((sum, metric) => sum + metric.tokens, 0);
  const costUsd = roundCurrency(metrics.reduce((sum, metric) => sum + metric.costUsd, 0));
  const latencyMs = metrics.reduce((sum, metric) => sum + metric.latencyMs, 0);
  return {
    toolCalls,
    tokenTotal,
    costUsd,
    latencyMs,
    perTool: metrics,
    tfgrpo: context.active
      ? {
          epoch: context.epoch,
          groupSize: context.groupSize,
          groupId: context.groupId
        }
      : undefined
  };
}

function mergeTfgrpoManifest(
  existing: TfgrpoManifestSection | null | undefined,
  metrics: RunMetricSummary | null,
  context: TfgrpoContext
): TfgrpoManifestSection | null {
  if (!metrics && !existing && !context.active) {
    return null;
  }
  const manifestMetrics = metrics
    ? {
        tool_calls: metrics.toolCalls,
        token_total: metrics.tokenTotal,
        cost_usd: metrics.costUsd,
        latency_ms: metrics.latencyMs,
        per_tool: metrics.perTool.map((entry) => ({
          tool: entry.tool,
          tokens: entry.tokens,
          cost_usd: entry.costUsd,
          latency_ms: entry.latencyMs,
          attempts: entry.attempts,
          status: entry.status,
          sandbox_state: entry.sandboxState
        }))
      }
    : existing?.tool_metrics;
  return {
    epoch: context.epoch ?? existing?.epoch ?? null,
    group_id: context.groupId ?? existing?.group_id ?? null,
    group_size: context.groupSize ?? existing?.group_size ?? null,
    tool_metrics: manifestMetrics ?? existing?.tool_metrics,
    experiences: existing?.experiences
  };
}

async function persistExperienceRecords(params: {
  store: ExperienceStore;
  manifest: CliManifest;
  env: EnvironmentPaths;
  paths: RunPaths;
  tfgrpoContext: TfgrpoContext;
  runMetrics: RunMetricSummary | null;
  execEvents: ExecEvent[];
  policy: TfgrpoPolicyConfig;
}): Promise<ExperienceRecord[] | null> {
  const { runMetrics } = params;
  if (!runMetrics || runMetrics.perTool.length === 0) {
    return null;
  }
  const promptPack = params.manifest.prompt_packs?.[0];
  if (!promptPack?.domain || !promptPack.stamp) {
    return null;
  }
  const terminalEvent = findTerminalEvent(params.execEvents);
  if (!terminalEvent) {
    return null;
  }
  try {
    const frames = framesFromToolMetrics(runMetrics.perTool, terminalEvent);
    const trajectory = summarizeTrajectory({
      runId: params.manifest.run_id,
      taskId: params.manifest.task_id,
      epoch: params.tfgrpoContext.epoch,
      groupId: params.tfgrpoContext.groupId,
      domain: promptPack.domain,
      stampSignature: promptPack.stamp,
      frames,
      baseSummary: params.manifest.summary ?? undefined
    });
    const optimized = optimizeExperience(trajectory, params.policy);
    const manifestPath = relativeToRepo(params.env, params.paths.manifestPath);
    const written = await params.store.recordBatch([optimized], manifestPath);
    if (written.length > 0) {
      const existing = params.manifest.tfgrpo?.experiences ?? {
        ids: [],
        written: 0,
        manifest_path: manifestPath
      };
      const summary = {
        ids: [...existing.ids, ...written.map((record) => record.id)],
        written: existing.written + written.length,
        manifest_path: manifestPath
      };
      params.manifest.tfgrpo = {
        ...(params.manifest.tfgrpo ?? {
          epoch: params.tfgrpoContext.epoch,
          group_id: params.tfgrpoContext.groupId,
          group_size: params.tfgrpoContext.groupSize
        }),
        experiences: summary
      };
    }
    return written;
  } catch (error) {
    logger.warn(`Failed to persist TF-GRPO experience: ${String(error)}`);
    return null;
  }
}

function findTerminalEvent(events: ExecEvent[]): ExecEvent | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const candidate = events[index];
    if (candidate?.type === 'exec:end') {
      return candidate;
    }
  }
  return events.length > 0 ? events[events.length - 1]! : null;
}
