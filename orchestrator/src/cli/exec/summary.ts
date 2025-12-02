import { join } from 'node:path';

import type { RunPaths } from '../run/runPaths.js';
import { relativeToRepo } from '../run/runPaths.js';
import { saveManifest } from '../run/manifest.js';
import { writeJsonAtomic } from '../utils/fs.js';
import type {
  ExecEvent,
  RunMetricSummary,
  RunSummaryEvent,
  RunSummaryEventPayload
} from '../../../../packages/shared/events/types.js';
import type { SandboxState, ToolRunRecord } from '../../../../packages/shared/manifest/types.js';
import type { ExecRunContext } from './context.js';
import { readExecMetadata } from './finalization.js';
import type { RunResultSummary } from './types.js';

export function createRunSummaryPayload(params: {
  env: ExecRunContext['env'];
  paths: RunPaths;
  manifest: ExecRunContext['manifest'];
  runStatus: ExecRunContext['manifest']['status'];
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

export function renderRunOutput(
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

export async function persistRunOutputs(
  context: ExecRunContext,
  summaryEvent: RunSummaryEvent
): Promise<void> {
  const runSummaryPath = join(context.paths.runDir, 'run-summary.json');
  await writeJsonAtomic(runSummaryPath, summaryEvent);
  context.manifest.run_summary_path = relativeToRepo(context.env, runSummaryPath);
  await saveManifest(context.paths, context.manifest);
}

export function emitCommandError(context: ExecRunContext, commandError: unknown): void {
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

export function buildExecRunSummary(params: {
  manifest: ExecRunContext['manifest'];
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
