import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import {
  appendCommandError,
  finalizeStatus,
  updateCommandStatus
} from '../run/manifest.js';
import type { CliManifest, CliManifestCommand, RunStatus } from '../types.js';
import { isoTimestamp } from '../utils/time.js';
import type { SandboxState, ToolRunRecord } from '../../../../packages/shared/manifest/types.js';
import type { ExecRunContext } from './context.js';
import type { StageRunResult } from './stageRunner.js';
import type { RunResultSummary } from './types.js';
import { normalizeErrorMessage } from '../../utils/errorMessage.js';

export { normalizeErrorMessage };

export interface CommandFinalization {
  commandEntry: CliManifestCommand | undefined;
  runStatus: RunStatus;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  summarySnapshot: RunResultSummary | null;
  toolRecord: ToolRunRecord | null;
  commandError: unknown;
}

export async function finalizeCommandLifecycle(
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

export async function finalizeFailedCommandEntry(params: {
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

export function buildFailureSummary(
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

export function buildCommandErrorDetails(params: {
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

export function determineRunStatus(entry: CliManifestCommand | undefined): RunStatus {
  if (!entry) {
    return 'failed';
  }
  return entry.status === 'succeeded' ? 'succeeded' : 'failed';
}

interface ExecMetadataSnapshot {
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  sandboxState?: SandboxState;
  sessionId?: string;
  persisted?: boolean;
  correlationId?: string | null;
}

export function readExecMetadata(record: ToolRunRecord | null): ExecMetadataSnapshot | null {
  if (!record?.metadata || typeof record.metadata !== 'object') {
    return null;
  }
  const candidate = (record.metadata as Record<string, unknown>).exec;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  return candidate as ExecMetadataSnapshot;
}

export function extractExecMetadataField<T extends keyof ExecMetadataSnapshot>(
  record: ToolRunRecord | null,
  field: T
): ExecMetadataSnapshot[T] | undefined {
  const metadata = readExecMetadata(record);
  return metadata ? metadata[field] : undefined;
}
