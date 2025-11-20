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
import type { CommandStage, CliManifest, CliManifestCommand, RunStatus, PipelineDefinition } from '../types.js';
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
  RunMetricSummary
} from '../../../../packages/shared/events/types.js';
import type { ToolRunRecord, SandboxState } from '../../../../packages/shared/manifest/types.js';
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
import { isoTimestamp } from '../utils/time.js';
import { ExperienceStore } from '../../persistence/ExperienceStore.js';
import {
  createRunMetricSummary,
  createToolMetricSnapshot,
  mergeTfgrpoManifest,
  persistExperienceRecords,
  resolveExperiencePolicy,
  resolveTfgrpoContext,
  type TfgrpoContext
} from './tfgrpo.js';
import type { RunResultSummary } from './types.js';

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

interface ExecRunContext {
  env: EnvironmentPaths;
  invocation: ExecCommandInvocation;
  argv: string[];
  shellCommand: string;
  outputMode: ExecOutputMode;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  runId: string;
  pipeline: PipelineDefinition;
  stage: CommandStage;
  manifest: CliManifest;
  paths: RunPaths;
  telemetrySink: ExecTelemetrySink;
  notificationSink: ExecNotificationSink;
  jsonlWriter: JsonlWriter | null;
  experienceStore: ExperienceStore;
  execEvents: ExecEvent[];
  telemetryTasks: Array<Promise<void>>;
}

interface StageRunResult {
  summary: RunResultSummary | null;
  toolRecord: ToolRunRecord | null;
  commandError: unknown;
}

interface CommandFinalization {
  commandEntry: CliManifestCommand | undefined;
  runStatus: RunStatus;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  summarySnapshot: RunResultSummary | null;
  toolRecord: ToolRunRecord | null;
  commandError: unknown;
}

export async function executeExecCommand(
  context: ExecCommandContext,
  invocation: ExecCommandInvocation
): Promise<ExecRunSummary> {
  if (!invocation.command) {
    throw new Error('exec command requires a command to run.');
  }

  const runContext = await bootstrapExecContext(context, invocation);
  const stageResult = await runExecStage(runContext);
  const finalization = await finalizeCommandLifecycle(runContext, stageResult);

  const tfgrpoContext = resolveTfgrpoContext();
  const runMetricSummary = await handleTfgrpoArtifacts(runContext, finalization, tfgrpoContext);

  const summaryPayload = createRunSummaryPayload({
    env: runContext.env,
    paths: runContext.paths,
    manifest: runContext.manifest,
    runStatus: finalization.runStatus,
    shellCommand: runContext.shellCommand,
    argv: runContext.argv,
    resultSummary: finalization.summarySnapshot,
    toolRecord: finalization.toolRecord,
    execEvents: runContext.execEvents,
    exitCode: finalization.exitCode,
    signal: finalization.signal,
    notificationTargets: runContext.notificationSink.targets,
    cwd: runContext.stage.cwd ?? null,
    metrics: runMetricSummary
  });
  const summaryEvent = serializeRunSummaryEvent(summaryPayload);

  await deliverNotifications(runContext, summaryPayload, summaryEvent);
  recordSummaryTelemetry(runContext, summaryEvent);
  renderRunOutput(runContext, summaryPayload, summaryEvent);

  await flushTelemetry(runContext);
  await persistRunOutputs(runContext, summaryEvent);
  await appendMetricsEntry(runContext.env, runContext.paths, runContext.manifest);

  await shutdownSinks(runContext);
  emitCommandError(runContext, finalization.commandError);

  return buildExecRunSummary({
    manifest: runContext.manifest,
    summaryPayload,
    summaryEvent,
    shellCommand: runContext.shellCommand,
    argv: runContext.argv,
    events: runContext.execEvents,
    toolRecord: finalization.toolRecord
  });
}

async function bootstrapExecContext(
  context: ExecCommandContext,
  invocation: ExecCommandInvocation
): Promise<ExecRunContext> {
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

  return {
    env,
    invocation,
    argv,
    shellCommand,
    outputMode,
    stdout,
    stderr,
    runId,
    pipeline,
    stage,
    manifest,
    paths,
    telemetrySink,
    notificationSink,
    jsonlWriter,
    experienceStore,
    execEvents: [],
    telemetryTasks: []
  };
}

async function runExecStage(context: ExecRunContext): Promise<StageRunResult> {
  let runResultSummary: RunResultSummary | null = null;
  let toolRecord: ToolRunRecord | null = null;

  const hooks: CommandRunHooks = {
    onEvent: (event) => {
      context.execEvents.push(event);
      const serialized = serializeExecEvent(event);
      context.telemetryTasks.push(Promise.resolve(context.telemetrySink.record(serialized)).then(() => undefined));
      if (context.outputMode === 'jsonl' && context.jsonlWriter) {
        context.jsonlWriter.write(serialized);
      } else if (context.outputMode === 'interactive') {
        streamInteractive(context.stdout, context.stderr, event);
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
        env: context.env,
        paths: context.paths,
        manifest: context.manifest,
        stage: context.stage,
        index: 1
      },
      hooks
    );
  } catch (error) {
    commandError = error;
  }

  return {
    summary: runResultSummary,
    toolRecord,
    commandError
  };
}

async function finalizeCommandLifecycle(
  context: ExecRunContext,
  stageResult: StageRunResult
): Promise<CommandFinalization> {
  const commandIndex = 0;
  let commandEntry = context.manifest.commands[commandIndex];
  const summarySnapshot = stageResult.summary;
  let resultExitCode = extractExecMetadataField(stageResult.toolRecord, 'exitCode') ?? null;
  if (summarySnapshot && summarySnapshot.exitCode !== undefined) {
    resultExitCode = summarySnapshot.exitCode;
  }
  let resultSignal = extractExecMetadataField(stageResult.toolRecord, 'signal') ?? null;
  if (summarySnapshot && summarySnapshot.signal !== undefined) {
    resultSignal = summarySnapshot.signal;
  }
  if (stageResult.commandError && resultExitCode === null) {
    resultExitCode = 1;
  }

  if (stageResult.commandError && commandEntry) {
    commandEntry = await finalizeFailedCommandEntry({
      env: context.env,
      paths: context.paths,
      manifest: context.manifest,
      commandEntry,
      commandIndex,
      error: stageResult.commandError,
      exitCode: resultExitCode,
      signal: resultSignal,
      toolRecord: stageResult.toolRecord,
      summarySnapshot,
      shellCommand: context.shellCommand
    });
  }

  const runStatus = determineRunStatus(commandEntry);

  context.manifest.summary = commandEntry?.summary ?? context.manifest.summary;
  finalizeStatus(context.manifest, runStatus, commandEntry?.status === 'failed' ? 'exec-failed' : null);

  return {
    commandEntry,
    runStatus,
    exitCode: resultExitCode,
    signal: resultSignal,
    summarySnapshot,
    toolRecord: stageResult.toolRecord,
    commandError: stageResult.commandError
  };
}

async function handleTfgrpoArtifacts(
  context: ExecRunContext,
  finalization: CommandFinalization,
  tfgrpoContext: TfgrpoContext
): Promise<RunMetricSummary | null> {
  const toolMetric = createToolMetricSnapshot(finalization.toolRecord, finalization.summarySnapshot);
  const runMetricSummary = createRunMetricSummary(toolMetric ? [toolMetric] : [], tfgrpoContext);
  context.manifest.tfgrpo = mergeTfgrpoManifest(context.manifest.tfgrpo, runMetricSummary, tfgrpoContext);
  await persistExperienceRecords({
    store: context.experienceStore,
    manifest: context.manifest,
    env: context.env,
    paths: context.paths,
    tfgrpoContext,
    runMetrics: runMetricSummary,
    execEvents: context.execEvents,
    policy: resolveExperiencePolicy()
  });
  await saveManifest(context.paths, context.manifest);
  return runMetricSummary;
}

async function deliverNotifications(
  context: ExecRunContext,
  summaryPayload: RunSummaryEventPayload,
  summaryEvent: RunSummaryEvent
): Promise<void> {
  const notificationOutcome = await context.notificationSink.notify(summaryEvent);
  if (summaryPayload.notifications) {
    summaryPayload.notifications.delivered = notificationOutcome.delivered;
    summaryPayload.notifications.failures = notificationOutcome.failures;
  }
}

function recordSummaryTelemetry(context: ExecRunContext, summaryEvent: RunSummaryEvent): void {
  context.telemetryTasks.push(
    Promise.resolve(context.telemetrySink.recordSummary(summaryEvent)).then(() => undefined)
  );
}

function renderRunOutput(
  context: ExecRunContext,
  summaryPayload: RunSummaryEventPayload,
  summaryEvent: RunSummaryEvent
): void {
  if (context.outputMode === 'jsonl' && context.jsonlWriter) {
    context.jsonlWriter.write(summaryEvent);
    return;
  }
  if (context.outputMode === 'json') {
    const spacing = context.invocation.jsonPretty ? 2 : 0;
    context.stdout.write(`${JSON.stringify(summaryEvent, null, spacing)}\n`);
    return;
  }
  if (context.outputMode === 'interactive') {
    context.stdout.write(`\n${summaryPayload.run.id} ${summaryPayload.status.toUpperCase()}\n`);
    context.stdout.write(`Manifest: ${summaryPayload.run.manifest}\n`);
    context.stdout.write(`Log: ${summaryPayload.logs.runner}\n`);
  }
}

async function flushTelemetry(context: ExecRunContext): Promise<void> {
  await Promise.allSettled(context.telemetryTasks);
  await context.telemetrySink.flush();
}

async function persistRunOutputs(
  context: ExecRunContext,
  summaryEvent: RunSummaryEvent
): Promise<void> {
  const runSummaryPath = join(context.paths.runDir, 'run-summary.json');
  await writeJsonAtomic(runSummaryPath, summaryEvent);
  context.manifest.run_summary_path = relativeToRepo(context.env, runSummaryPath);
  await saveManifest(context.paths, context.manifest);
}

async function shutdownSinks(context: ExecRunContext): Promise<void> {
  await context.telemetrySink.shutdown();
  await context.notificationSink.shutdown();
}

function emitCommandError(context: ExecRunContext, commandError: unknown): void {
  if (!commandError) {
    return;
  }
  if (context.outputMode === 'jsonl' || context.outputMode === 'json') {
    return;
  }
  context.stderr.write(
    `Command execution failed: ${(commandError as Error)?.message ?? String(commandError)}\n`
  );
}

function buildExecRunSummary(params: {
  manifest: CliManifest;
  summaryPayload: RunSummaryEventPayload;
  summaryEvent: RunSummaryEvent;
  shellCommand: string;
  argv: string[];
  events: ExecEvent[];
  toolRecord: ToolRunRecord | null;
}): ExecRunSummary {
  return {
    runId: params.manifest.run_id,
    manifestPath: params.summaryPayload.run.manifest,
    logPath: params.summaryPayload.logs.runner,
    status: params.summaryPayload.status,
    exitCode: params.summaryPayload.result.exitCode,
    signal: params.summaryPayload.result.signal,
    stdout: params.summaryPayload.outputs.stdout,
    stderr: params.summaryPayload.outputs.stderr,
    shellCommand: params.shellCommand,
    argv: params.argv,
    events: params.events,
    summaryEvent: params.summaryEvent,
    toolRun: params.toolRecord ?? null
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
