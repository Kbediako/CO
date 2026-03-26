import { join, isAbsolute } from 'node:path';
import process from 'node:process';

import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV
} from '../../../scripts/lib/provider-run-contract.js';
import { PROVIDER_LINEAR_AUDIT_ENV_VAR } from './control/providerLinearWorkflowAudit.js';
import type { DispatchPilotSourceSetup } from './control/trackerDispatchPilot.js';
import {
  appendProviderLinearWorkerChildStreamRecord,
  defaultExecRunner,
  loadProviderLinearWorkerContext,
  type ProviderLinearWorkerChildStreamRecord,
  type ProviderLinearWorkerExecRequest,
  type ProviderLinearWorkerExecResult
} from './providerLinearWorkerRunner.js';
import { slugify } from './utils/strings.js';

const ALLOWED_PROVIDER_CHILD_PIPELINES = [
  'docs-review',
  'implementation-gate',
  'docs-relevance-advisory'
] as const;
const PROVIDER_LINEAR_CHILD_STREAM_ENV_KEYS_TO_REMOVE = [
  'MCP_RUNNER_TASK_ID',
  'CODEX_ORCHESTRATOR_TASK_ID',
  'CODEX_ORCHESTRATOR_RUN_ID',
  'CODEX_ORCHESTRATOR_PIPELINE_ID',
  'CODEX_ORCHESTRATOR_MANIFEST_PATH',
  'CODEX_ORCHESTRATOR_RUN_DIR',
  'CODEX_ORCHESTRATOR_RUNTIME_MODE',
  'CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE',
  'CODEX_RUNTIME_MODE',
  'CODEX_ORCHESTRATOR_APPSERVER_SESSION_ID',
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV,
  PROVIDER_LINEAR_AUDIT_ENV_VAR
] as const;

export type ProviderLinearChildStreamPipelineId = (typeof ALLOWED_PROVIDER_CHILD_PIPELINES)[number];

export interface ProviderLinearChildRunResult {
  run_id: string;
  task_id: string;
  pipeline_id: ProviderLinearChildStreamPipelineId;
  status: string;
  artifact_root: string;
  manifest_path: string;
  log_path: string | null;
  summary: string | null;
  runtime_mode_requested: string | null;
  runtime_mode: string | null;
  runtime_provider: string | null;
}

export interface ProviderLinearChildStreamSuccessResult {
  ok: true;
  operation: 'child-stream';
  action: 'launched';
  issue: {
    id: string;
    identifier: string;
  };
  source_setup: DispatchPilotSourceSetup | null;
  stream: string;
  pipeline_id: ProviderLinearChildStreamPipelineId;
  child_run: ProviderLinearChildRunResult;
}

export interface ProviderLinearChildStreamFailureResult {
  ok: false;
  operation: 'child-stream';
  issue_id: string | null;
  issue_identifier: string | null;
  source_setup: DispatchPilotSourceSetup | null;
  stream: string | null;
  pipeline_id: string | null;
  child_run: ProviderLinearChildRunResult | null;
  error: {
    code: string;
    message: string;
    status: number;
  };
}

export type ProviderLinearChildStreamResult =
  | ProviderLinearChildStreamSuccessResult
  | ProviderLinearChildStreamFailureResult;

export interface RunProviderLinearChildStreamShellParams {
  pipelineId: string;
  streamName?: string | null;
  env?: NodeJS.ProcessEnv;
}

interface ProviderLinearChildStreamShellDependencies {
  execRunner: (request: ProviderLinearWorkerExecRequest) => Promise<ProviderLinearWorkerExecResult>;
  appendChildStreamRecord: (
    runDir: string,
    record: ProviderLinearWorkerChildStreamRecord
  ) => Promise<ProviderLinearWorkerChildStreamRecord[]>;
  now: () => string;
}

const DEFAULT_DEPENDENCIES: ProviderLinearChildStreamShellDependencies = {
  execRunner: defaultExecRunner,
  appendChildStreamRecord: async (runDir, record) =>
    await appendProviderLinearWorkerChildStreamRecord(runDir, record),
  now: () => new Date().toISOString()
};

export async function runProviderLinearChildStreamShell(
  params: RunProviderLinearChildStreamShellParams,
  overrides: Partial<ProviderLinearChildStreamShellDependencies> = {}
): Promise<ProviderLinearChildStreamResult> {
  const deps = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const env = params.env ?? process.env;
  let context;
  try {
    context = await loadProviderLinearWorkerContext(env);
  } catch (error) {
    return failureResult({
      issueId: null,
      issueIdentifier: null,
      sourceSetup: null,
      stream: null,
      pipelineId: params.pipelineId,
      childRun: null,
      code: 'provider_worker_child_stream_context_missing',
      message: error instanceof Error ? error.message : String(error),
      status: 412
    });
  }

  const sourceSetup = context.sourceSetup ?? null;
  if (context.pipelineId !== 'provider-linear-worker') {
    return failureResult({
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      pipelineId: params.pipelineId,
      childRun: null,
      code: 'provider_worker_child_stream_requires_provider_worker',
      message: 'linear child-stream is only available inside provider-linear-worker runs.',
      status: 409
    });
  }
  if (
    !context.providerControlHostRecordedInManifest ||
    !context.providerControlHostTaskId ||
    !context.providerControlHostRunId ||
    !context.providerControlHostMatchesManifest
  ) {
    return failureResult({
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      pipelineId: params.pipelineId,
      childRun: null,
      code: 'provider_worker_child_stream_provenance_invalid',
      message: 'linear child-stream requires provider control-host provenance recorded on the parent provider-worker manifest and matching active environment.',
      status: 412
    });
  }

  const pipelineId = normalizeProviderChildPipelineId(params.pipelineId);
  if (!pipelineId) {
    return failureResult({
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      pipelineId: params.pipelineId,
      childRun: null,
      code: 'provider_worker_child_stream_pipeline_unsupported',
      message: `Unsupported child stream pipeline: ${params.pipelineId}. Allowed pipelines: ${ALLOWED_PROVIDER_CHILD_PIPELINES.join(', ')}.`,
      status: 422
    });
  }

  if (!context.taskId) {
    return failureResult({
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      pipelineId,
      childRun: null,
      code: 'provider_worker_child_stream_task_missing',
      message: 'Provider worker child streams require a parent task id.',
      status: 412
    });
  }

  const stream = normalizeChildStreamName(params.streamName ?? pipelineId);
  if (!stream) {
    return failureResult({
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      pipelineId,
      childRun: null,
      code: 'provider_worker_child_stream_stream_invalid',
      message: 'Provider worker child streams require a non-empty stream name after slug normalization.',
      status: 422
    });
  }

  const childTaskId = `${context.taskId}-${stream}`;
  const invocation = resolveCodexOrchestratorInvocation(env);
  const args = [
    ...invocation.argsPrefix,
    'start',
    pipelineId,
    '--task',
    childTaskId,
    '--parent-run',
    context.runId,
    '--issue-provider',
    'linear',
    '--issue-id',
    context.issueId,
    '--issue-identifier',
    context.issueIdentifier,
    '--format',
    'json',
    '--no-interactive'
  ];
  if (context.issueUpdatedAt) {
    args.push('--issue-updated-at', context.issueUpdatedAt);
  }
  const runtimeMode = normalizeRuntimeMode(
    env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE ?? env.CODEX_ORCHESTRATOR_RUNTIME_MODE
  );
  if (runtimeMode) {
    args.push('--runtime-mode', runtimeMode);
  }

  let execResult: ProviderLinearWorkerExecResult;
  try {
    execResult = await deps.execRunner({
      command: invocation.command,
      args,
      cwd: context.repoRoot,
      env: buildProviderLinearChildStartEnv(env, context.repoRoot),
      mirrorOutput: false
    });
  } catch (error) {
    return failureResult({
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      pipelineId,
      childRun: null,
      code: 'provider_worker_child_stream_launch_failed',
      message: error instanceof Error ? error.message : String(error),
      status: 502
    });
  }

  const childRun = parseProviderChildRunResult(execResult.stdout, context.repoRoot, pipelineId, childTaskId);
  if (!childRun) {
    const detail = [execResult.stderr.trim(), execResult.stdout.trim()].filter(Boolean)[0] ?? 'unknown child-stream output';
    return failureResult({
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      pipelineId,
      childRun: null,
      code: 'provider_worker_child_stream_output_invalid',
      message: `Could not parse child stream output: ${detail}`,
      status: 502
    });
  }

  await deps.appendChildStreamRecord(context.runDir, {
    stream,
    pipeline_id: pipelineId,
    task_id: childTaskId,
    run_id: childRun.run_id,
    status: childRun.status,
    manifest_path: childRun.manifest_path,
    artifact_root: childRun.artifact_root,
    log_path: childRun.log_path,
    summary: childRun.summary,
    issue_id: context.issueId,
    issue_identifier: context.issueIdentifier,
    workspace_path: context.workspacePath,
    source_setup: sourceSetup,
    launched_at: deps.now()
  });

  if (execResult.exitCode !== 0 || childRun.status !== 'succeeded') {
    return failureResult({
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      pipelineId,
      childRun,
      code: 'provider_worker_child_stream_run_failed',
      message: `Child stream ${pipelineId} (${stream}) completed with status ${childRun.status}.`,
      status: 502
    });
  }

  return {
    ok: true,
    operation: 'child-stream',
    action: 'launched',
    issue: {
      id: context.issueId,
      identifier: context.issueIdentifier
    },
    source_setup: sourceSetup,
    stream,
    pipeline_id: pipelineId,
    child_run: childRun
  };
}

function normalizeProviderChildPipelineId(
  value: string
): ProviderLinearChildStreamPipelineId | null {
  const normalized = value.trim();
  return ALLOWED_PROVIDER_CHILD_PIPELINES.find((candidate) => candidate === normalized) ?? null;
}

function normalizeChildStreamName(value: string): string | null {
  const normalized = slugify(value, 'stream').toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRuntimeMode(value: string | undefined): 'cli' | 'appserver' | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'cli' || normalized === 'appserver' ? normalized : null;
}

function buildProviderLinearChildStartEnv(
  env: NodeJS.ProcessEnv,
  repoRoot: string
): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = { ...process.env, ...env };
  for (const key of PROVIDER_LINEAR_CHILD_STREAM_ENV_KEYS_TO_REMOVE) {
    delete sanitized[key];
  }
  sanitized.CODEX_ORCHESTRATOR_ROOT = repoRoot;
  return sanitized;
}

function resolveCodexOrchestratorInvocation(env: NodeJS.ProcessEnv): {
  command: string;
  argsPrefix: string[];
} {
  const packageRoot = typeof env.CODEX_ORCHESTRATOR_PACKAGE_ROOT === 'string'
    ? env.CODEX_ORCHESTRATOR_PACKAGE_ROOT.trim()
    : '';
  if (packageRoot.length > 0) {
    return {
      command: process.execPath,
      argsPrefix: [join(packageRoot, 'dist', 'bin', 'codex-orchestrator.js')]
    };
  }
  return {
    command: 'codex-orchestrator',
    argsPrefix: []
  };
}

function parseProviderChildRunResult(
  raw: string,
  repoRoot: string,
  pipelineId: ProviderLinearChildStreamPipelineId,
  taskId: string
): ProviderLinearChildRunResult | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const runId = normalizeOptionalString(record.run_id);
  const status = normalizeOptionalString(record.status);
  const artifactRoot = normalizeOptionalString(record.artifact_root);
  const manifestPath = normalizeOptionalString(record.manifest) ?? (artifactRoot ? `${artifactRoot}/manifest.json` : null);
  if (!runId || !status || !artifactRoot || !manifestPath) {
    return null;
  }
  return {
    run_id: runId,
    task_id: taskId,
    pipeline_id: pipelineId,
    status,
    artifact_root: artifactRoot,
    manifest_path: resolveRunPath(repoRoot, manifestPath),
    log_path: normalizeOptionalString(record.log_path),
    summary: normalizeOptionalString(record.summary),
    runtime_mode_requested: normalizeOptionalString(record.runtime_mode_requested),
    runtime_mode: normalizeOptionalString(record.runtime_mode),
    runtime_provider: normalizeOptionalString(record.runtime_provider)
  };
}

function resolveRunPath(repoRoot: string, value: string): string {
  return isAbsolute(value) ? value : join(repoRoot, value);
}

function failureResult(input: {
  issueId: string | null;
  issueIdentifier: string | null;
  sourceSetup: DispatchPilotSourceSetup | null;
  stream: string | null;
  pipelineId: string | null;
  childRun: ProviderLinearChildRunResult | null;
  code: string;
  message: string;
  status: number;
}): ProviderLinearChildStreamFailureResult {
  return {
    ok: false,
    operation: 'child-stream',
    issue_id: input.issueId,
    issue_identifier: input.issueIdentifier,
    source_setup: input.sourceSetup,
    stream: input.stream,
    pipeline_id: input.pipelineId,
    child_run: input.childRun,
    error: {
      code: input.code,
      message: input.message,
      status: input.status
    }
  };
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
