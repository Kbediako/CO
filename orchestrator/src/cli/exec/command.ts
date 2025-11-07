import process from 'node:process';
import { join } from 'node:path';

import type { EnvironmentPaths } from '../run/environment.js';
import { relativeToRepo } from '../run/runPaths.js';
import { bootstrapManifest, finalizeStatus, saveManifest } from '../run/manifest.js';
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
import type { ExecEvent, RunSummaryEvent, RunSummaryEventPayload } from '../../../../packages/shared/events/types.js';
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

  const commandEntry = manifest.commands[0];
  const runStatus = determineRunStatus(commandEntry);

  manifest.summary = commandEntry?.summary ?? manifest.summary;
  finalizeStatus(manifest, runStatus, commandEntry?.status === 'failed' ? 'exec-failed' : null);
  await saveManifest(paths, manifest);

  const summarySnapshot = runResultSummary as RunResultSummary | null;
  let resultExitCode = extractExecMetadataField(toolRecord, 'exitCode') ?? null;
  if (summarySnapshot && summarySnapshot.exitCode !== undefined) {
    resultExitCode = summarySnapshot.exitCode;
  }
  let resultSignal = extractExecMetadataField(toolRecord, 'signal') ?? null;
  if (summarySnapshot && summarySnapshot.signal !== undefined) {
    resultSignal = summarySnapshot.signal;
  }

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
    cwd: stage.cwd ?? null
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
    cwd
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
    metrics: undefined,
    notifications: {
      targets: notificationTargets,
      delivered: [],
      failures: []
    }
  };
}
