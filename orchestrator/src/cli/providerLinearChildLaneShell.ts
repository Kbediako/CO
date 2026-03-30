import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV
} from '../../../scripts/lib/provider-run-contract.js';
import { PROVIDER_LINEAR_AUDIT_ENV_VAR } from './control/providerLinearWorkflowAudit.js';
import type { DispatchPilotSourceSetup } from './control/trackerDispatchPilot.js';
import {
  resolveLiveLinearTrackedIssueById,
  type LiveLinearTrackedIssue
} from './control/linearDispatchSource.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';
import {
  appendProviderLinearWorkerChildLaneRecord,
  defaultExecRunner,
  loadProviderLinearWorkerContext,
  readProviderLinearWorkerChildLanes,
  refreshProviderLinearWorkerProofSnapshot,
  updateProviderLinearWorkerChildLaneRecord,
  type ProviderLinearWorkerChildLaneDecision,
  type ProviderLinearWorkerChildLaneRecord,
  type ProviderLinearWorkerChildLaneScope,
  type ProviderLinearWorkerExecRequest,
  type ProviderLinearWorkerExecResult
} from './providerLinearWorkerRunner.js';
import {
  PROVIDER_LINEAR_CHILD_LANE_FILES_ENV,
  PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_WORKSPACE_PATH_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PHASES_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME,
  PROVIDER_LINEAR_CHILD_LANE_PURPOSE_ENV,
  PROVIDER_LINEAR_CHILD_LANE_STREAM_ENV,
  type ProviderLinearChildLaneProof
} from './providerLinearChildLaneRunner.js';
import { slugify } from './utils/strings.js';

const execFileAsync = promisify(execFile);

const PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID = 'provider-linear-child-lane';
const PROVIDER_LINEAR_CHILD_LANE_MUTATION_REASON =
  'Only the parent provider-linear-worker may mutate the issue lifecycle. Same-issue child lanes are bounded helpers that must return patch artifacts for parent review.';
const PROVIDER_LINEAR_CHILD_LANE_ENV_KEYS_TO_REMOVE = [
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
const PROVIDER_LINEAR_CHILD_LANE_OPTIONAL_ENV_KEYS = [
  PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV
] as const;

export interface ProviderLinearChildLaneRunResult {
  run_id: string;
  task_id: string;
  pipeline_id: string;
  status: string;
  artifact_root: string;
  manifest_path: string;
  log_path: string | null;
  summary: string | null;
  runtime_mode_requested: string | null;
  runtime_mode: string | null;
  runtime_provider: string | null;
}

type ProviderLinearChildLaneAction = 'launch' | 'accept' | 'reject' | 'invalidate';

export interface ProviderLinearChildLaneSuccessResult {
  ok: true;
  operation: 'child-lane';
  action: 'launched' | 'accepted' | 'rejected' | 'invalidated';
  issue: { id: string; identifier: string };
  source_setup: DispatchPilotSourceSetup | null;
  stream: string;
  child_run: ProviderLinearChildLaneRunResult | null;
  child_lane: ProviderLinearWorkerChildLaneRecord;
}

export interface ProviderLinearChildLaneFailureResult {
  ok: false;
  operation: 'child-lane';
  action: ProviderLinearChildLaneAction;
  issue_id: string | null;
  issue_identifier: string | null;
  source_setup: DispatchPilotSourceSetup | null;
  stream: string | null;
  child_run: ProviderLinearChildLaneRunResult | null;
  child_lane: ProviderLinearWorkerChildLaneRecord | null;
  error: { code: string; message: string; status: number };
}

export type ProviderLinearChildLaneResult =
  | ProviderLinearChildLaneSuccessResult
  | ProviderLinearChildLaneFailureResult;

export interface RunProviderLinearChildLaneShellParams {
  action: string;
  streamName?: string | null;
  purpose?: string | null;
  files?: string[];
  phases?: string[];
  instructions?: string | null;
  reason?: string | null;
  env?: NodeJS.ProcessEnv;
}

interface ParentIssueSnapshot {
  issue_updated_at: string | null;
  issue_state: string | null;
  issue_state_type: string | null;
}

interface ProviderLinearChildLaneShellDependencies {
  execRunner: (request: ProviderLinearWorkerExecRequest) => Promise<ProviderLinearWorkerExecResult>;
  appendChildLaneRecord: (runDir: string, record: ProviderLinearWorkerChildLaneRecord) => Promise<ProviderLinearWorkerChildLaneRecord[]>;
  readChildLanes: (runDir: string) => Promise<ProviderLinearWorkerChildLaneRecord[]>;
  readParentDirtyPaths: (workspacePath: string) => Promise<string[]>;
  updateChildLaneRecord: (
    runDir: string,
    matcher: (record: ProviderLinearWorkerChildLaneRecord) => boolean,
    updater: (record: ProviderLinearWorkerChildLaneRecord) => ProviderLinearWorkerChildLaneRecord
  ) => Promise<ProviderLinearWorkerChildLaneRecord | null>;
  refreshProofSnapshot: (runDir: string, auditPath: string | null) => Promise<void>;
  readTrackedIssue: (input: {
    issueId: string;
    sourceSetup?: DispatchPilotSourceSetup | null;
    env?: NodeJS.ProcessEnv;
  }) => Promise<LiveLinearTrackedIssue | null>;
  readParentHeadSha: (workspacePath: string) => Promise<string | null>;
  applyPatchArtifact: (workspacePath: string, patchPath: string) => Promise<void>;
  readChildLaneProof: (proofPath: string) => Promise<ProviderLinearChildLaneProof>;
  now: () => string;
}

const DEFAULT_DEPENDENCIES: ProviderLinearChildLaneShellDependencies = {
  execRunner: defaultExecRunner,
  appendChildLaneRecord: async (runDir, record) => await appendProviderLinearWorkerChildLaneRecord(runDir, record),
  readChildLanes: async (runDir) => await readProviderLinearWorkerChildLanes(runDir),
  readParentDirtyPaths: async (workspacePath) => {
    const modified = await execFileAsync('git', ['-C', workspacePath, 'diff', '--name-only', '--relative', 'HEAD', '--'], {
      maxBuffer: 10 * 1024 * 1024
    });
    const untracked = await execFileAsync('git', ['-C', workspacePath, 'ls-files', '--others', '--exclude-standard'], {
      maxBuffer: 10 * 1024 * 1024
    });
    return normalizeScopeEntries([...modified.stdout.split(/\r?\n/u), ...untracked.stdout.split(/\r?\n/u)]);
  },
  updateChildLaneRecord: async (runDir, matcher, updater) =>
    await updateProviderLinearWorkerChildLaneRecord(runDir, matcher, updater),
  refreshProofSnapshot: async (runDir, auditPath) => {
    await refreshProviderLinearWorkerProofSnapshot(runDir, auditPath);
  },
  readTrackedIssue: async ({ issueId, sourceSetup, env }) => {
    const resolution = await resolveLiveLinearTrackedIssueById({
      issueId,
      sourceSetup,
      env
    });
    return resolution.kind === 'ready' ? resolution.tracked_issue : null;
  },
  readParentHeadSha: async (workspacePath) => {
    const result = await execFileAsync('git', ['-C', workspacePath, 'rev-parse', 'HEAD']);
    return normalizeOptionalString(result.stdout);
  },
  applyPatchArtifact: async (workspacePath, patchPath) => {
    await execFileAsync('git', ['-C', workspacePath, 'apply', '--3way', '--whitespace=nowarn', patchPath]);
  },
  readChildLaneProof: async (proofPath) =>
    JSON.parse(await readFile(proofPath, 'utf8')) as ProviderLinearChildLaneProof,
  now: () => new Date().toISOString()
};

export async function runProviderLinearChildLaneShell(
  params: RunProviderLinearChildLaneShellParams,
  overrides: Partial<ProviderLinearChildLaneShellDependencies> = {}
): Promise<ProviderLinearChildLaneResult> {
  const deps = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const env = params.env ?? process.env;
  let context;
  try {
    context = await loadProviderLinearWorkerContext(env);
  } catch (error) {
    return failureResult({
      action: normalizeAction(params.action) ?? 'launch',
      issueId: null,
      issueIdentifier: null,
      sourceSetup: null,
      stream: null,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_context_missing',
      message: error instanceof Error ? error.message : String(error),
      status: 412
    });
  }
  const sourceSetup = context.sourceSetup ?? null;
  if (context.pipelineId !== 'provider-linear-worker') {
    return failureResult({
      action: normalizeAction(params.action) ?? 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_requires_provider_worker',
      message: 'linear child-lane is only available inside provider-linear-worker runs.',
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
      action: normalizeAction(params.action) ?? 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_provenance_invalid',
      message: 'linear child-lane requires provider control-host provenance recorded on the parent provider-worker manifest and matching active environment.',
      status: 412
    });
  }

  const action = normalizeAction(params.action);
  if (!action) {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_action_invalid',
      message: 'linear child-lane requires --action launch|accept|reject|invalidate.',
      status: 422
    });
  }
  try {
    if (action === 'launch') {
      return await launchChildLane(
        {
          ...params,
          action,
          env
        },
        context,
        deps,
        sourceSetup
      );
    }

    return await resolveChildLaneDecision(
      {
        ...params,
        action,
        env
      },
      context,
      deps,
      sourceSetup
    );
  } catch (error) {
    return failureResult({
      action,
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: normalizeChildLaneStreamName(params.streamName) ?? params.streamName ?? null,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_unhandled_failure',
      message: error instanceof Error ? error.message : String(error),
      status: 502
    });
  }
}

async function launchChildLane(
  params: RunProviderLinearChildLaneShellParams & { action: 'launch'; env: NodeJS.ProcessEnv },
  context: Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
  deps: ProviderLinearChildLaneShellDependencies,
  sourceSetup: DispatchPilotSourceSetup | null
): Promise<ProviderLinearChildLaneResult> {
  const stream = normalizeChildLaneStreamName(params.streamName);
  if (!stream) {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_stream_invalid',
      message: 'Provider worker child lanes require a non-empty stream name after slug normalization.',
      status: 422
    });
  }
  const purpose = normalizeOptionalString(params.purpose);
  const scope = normalizeChildLaneScope(params.files ?? [], params.phases ?? [], context.repoRoot);
  if (!purpose || !scope) {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_scope_missing',
      message: 'Provider worker child lanes require --purpose and at least one declared file or phase scope.',
      status: 422
    });
  }
  const existing = await deps.readChildLanes(context.runDir);
  const conflicting = existing.find(
    (entry) =>
      entry.decision === 'pending' &&
      (entry.stream === stream || scopesOverlap(entry.scope, scope))
  );
  if (conflicting) {
    const message = conflicting.stream === stream
      ? `Child lane stream ${stream} already has unresolved lane ${conflicting.run_id}; accept, reject, or invalidate that lane before relaunching the same stream.`
      : `Child lane scope overlaps unresolved lane ${conflicting.stream} (${conflicting.run_id}); reject, accept, or invalidate that lane before launching another overlapping lane.`;
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: conflicting,
      code: 'provider_worker_child_lane_scope_conflict',
      message,
      status: 409
    });
  }

  let dirtyScopeConflict: string | null;
  try {
    dirtyScopeConflict = await resolveParentDirtyScopeConflict(context.repoRoot, scope, deps);
  } catch (error) {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_parent_dirty_check_failed',
      message: `Failed to inspect parent workspace state before launching child lane: ${error instanceof Error ? error.message : String(error)}`,
      status: 502
    });
  }
  if (dirtyScopeConflict) {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_parent_dirty',
      message: dirtyScopeConflict,
      status: 409
    });
  }

  const parentSnapshot = await resolveParentSnapshot(context, params.env, deps);
  const baseSha = await deps.readParentHeadSha(context.repoRoot);
  const childTaskId = `${context.taskId}-${stream}`;
  const invocation = resolveCodexOrchestratorInvocation(params.env);
  const args = [
    ...invocation.argsPrefix,
    'start',
    PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID,
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
    params.env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE ?? params.env.CODEX_ORCHESTRATOR_RUNTIME_MODE
  );
  if (runtimeMode) {
    args.push('--runtime-mode', runtimeMode);
  }
  const childStartEnv = buildProviderLinearChildLaneStartEnv(params.env, {
    repoRoot: context.repoRoot,
    taskId: childTaskId,
    stream,
    purpose,
    instructions: params.instructions ?? null,
    scope,
    parentWorkspacePath: context.repoRoot,
    parentSnapshot: {
      ...parentSnapshot,
      base_sha: baseSha
    },
    sourceSetup
  });

  let execResult: ProviderLinearWorkerExecResult;
  try {
    execResult = await deps.execRunner({
      command: invocation.command,
      args,
      cwd: context.repoRoot,
      env: childStartEnv,
      mirrorOutput: false
    });
  } catch (error) {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_launch_failed',
      message: error instanceof Error ? error.message : String(error),
      status: 502
    });
  }
  const childRun = parseProviderChildLaneRunResult(
    execResult.stdout,
    context.repoRoot,
    childStartEnv.CODEX_ORCHESTRATOR_RUNS_DIR ?? join(context.repoRoot, '.runs'),
    childTaskId
  );
  if (!childRun) {
    const detail = [execResult.stderr.trim(), execResult.stdout.trim()].filter(Boolean)[0] ?? 'unknown child-lane output';
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_output_invalid',
      message: `Could not parse child lane output: ${detail}`,
      status: 502
    });
  }

  const proofPath = join(childRun.artifact_root, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME);
  const childProof = await deps.readChildLaneProof(proofPath).catch(() => null);
  if (childRun.status === 'succeeded' && (!childProof || !childProof.patch_artifact_path)) {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun,
      childLane: null,
      code: 'provider_worker_child_lane_proof_missing',
      message: `Child lane ${stream} did not produce a readable proof bundle with a patch artifact.`,
      status: 502
    });
  }
  const childLane: ProviderLinearWorkerChildLaneRecord = {
    stream,
    pipeline_id: PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID,
    task_id: childTaskId,
    run_id: childRun.run_id,
    status: childRun.status,
    manifest_path: childRun.manifest_path,
    artifact_root: childRun.artifact_root,
    log_path: childRun.log_path,
    summary: childRun.summary,
    issue_id: context.issueId,
    issue_identifier: context.issueIdentifier,
    workspace_path: context.repoRoot,
    source_setup: sourceSetup,
    launched_at: deps.now(),
    purpose,
    instructions: normalizeOptionalString(params.instructions),
    scope,
    parent_snapshot: childProof?.parent_snapshot ?? {
      ...parentSnapshot,
      base_sha: baseSha,
      captured_at: deps.now()
    },
    lane_workspace_path: childProof?.lane_workspace_path ?? null,
    patch_artifact_path: childProof?.patch_artifact_path ?? null,
    patch_bytes: childProof?.patch_bytes ?? null,
    decision: 'pending',
    decision_at: null,
    decision_reason: null
  };

  try {
    await deps.appendChildLaneRecord(context.runDir, childLane);
    await deps.refreshProofSnapshot(context.runDir, params.env[PROVIDER_LINEAR_AUDIT_ENV_VAR] ?? null);
  } catch (error) {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun,
      childLane,
      code: 'provider_worker_child_lane_record_failed',
      message: `Failed to record child lane lineage: ${error instanceof Error ? error.message : String(error)}`,
      status: 502
    });
  }
  if (execResult.exitCode !== 0 || childRun.status !== 'succeeded') {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun,
      childLane,
      code: 'provider_worker_child_lane_run_failed',
      message: `Child lane ${stream} completed with status ${childRun.status}. ${PROVIDER_LINEAR_CHILD_LANE_MUTATION_REASON}`,
      status: 502
    });
  }
  return {
    ok: true,
    operation: 'child-lane',
    action: 'launched',
    issue: {
      id: context.issueId,
      identifier: context.issueIdentifier
    },
    source_setup: sourceSetup,
    stream,
    child_run: childRun,
    child_lane: childLane
  };
}

async function resolveChildLaneDecision(
  params: RunProviderLinearChildLaneShellParams & {
    action: 'accept' | 'reject' | 'invalidate';
    env: NodeJS.ProcessEnv;
  },
  context: Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
  deps: ProviderLinearChildLaneShellDependencies,
  sourceSetup: DispatchPilotSourceSetup | null
): Promise<ProviderLinearChildLaneResult> {
  const stream = normalizeChildLaneStreamName(params.streamName);
  if (!stream) {
    return failureResult({
      action: params.action,
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_stream_invalid',
      message: 'Provider worker child lane decisions require --stream.',
      status: 422
    });
  }
  const childLanes = await deps.readChildLanes(context.runDir);
  const target = [...childLanes]
    .reverse()
    .find((entry) => entry.stream === stream && entry.decision === 'pending');
  if (!target) {
    return failureResult({
      action: params.action,
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_not_found',
      message: `No pending child lane found for stream ${stream}.`,
      status: 404
    });
  }
  const provenanceViolation = resolveChildLaneDecisionProvenanceViolation(context, stream, target);
  if (provenanceViolation) {
    return failureResult({
      action: params.action,
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: target,
      code: 'provider_worker_child_lane_provenance_invalid',
      message: provenanceViolation,
      status: 409
    });
  }

  if (params.action === 'accept') {
    const currentHeadSha = await deps.readParentHeadSha(context.repoRoot);
    const currentIssue = await resolveParentSnapshot(context, params.env, deps);
    const staleReason = resolveChildLaneStaleReason(target, currentHeadSha, currentIssue);
    if (staleReason) {
      const invalidated = await deps.updateChildLaneRecord(
        context.runDir,
        (entry) => entry.stream === target.stream && entry.run_id === target.run_id,
        (entry) => ({
          ...entry,
          decision: 'invalidated',
          decision_at: deps.now(),
          decision_reason: staleReason
        })
      );
      await deps.refreshProofSnapshot(context.runDir, params.env[PROVIDER_LINEAR_AUDIT_ENV_VAR] ?? null);
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: invalidated ?? target,
        code: 'provider_worker_child_lane_stale',
        message: staleReason,
        status: 409
      });
    }
    if (target.status !== 'succeeded' || !target.patch_artifact_path) {
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: target,
        code: 'provider_worker_child_lane_patch_missing',
        message: 'Child lane has no accepted patch artifact to apply.',
        status: 409
      });
    }
    const artifactRoot = resolveAcceptedChildLaneArtifactRoot(
      context.repoRoot,
      resolveWorkspaceScopedArtifactDir(context.repoRoot, params.env.CODEX_ORCHESTRATOR_RUNS_DIR, '.runs'),
      target
    );
    if (!artifactRoot) {
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: target,
        code: 'provider_worker_child_lane_patch_invalid',
        message: 'Child lane artifact root must stay anchored to the expected workspace-local child run directory before parent acceptance.',
        status: 409
      });
    }
    const patchArtifactPath = resolveAcceptedPatchArtifactPath(context.repoRoot, target, artifactRoot);
    if (!patchArtifactPath) {
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: target,
        code: 'provider_worker_child_lane_patch_invalid',
        message: 'Child lane patch artifact must stay within the child lane artifact root before parent acceptance.',
        status: 409
      });
    }
    let patchChangedPaths: string[];
    try {
      patchChangedPaths = await readPatchChangedPaths(patchArtifactPath);
    } catch (error) {
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: target,
        code: 'provider_worker_child_lane_patch_invalid',
        message: `Child lane patch artifact could not be inspected before parent acceptance: ${error instanceof Error ? error.message : String(error)}`,
        status: 409
      });
    }
    const patchScopeViolation = resolveAcceptedPatchScopeViolation(target.scope, patchChangedPaths);
    if (patchScopeViolation) {
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: target,
        code: 'provider_worker_child_lane_patch_scope_invalid',
        message: patchScopeViolation,
        status: 409
      });
    }
    let dirtyPatchConflict: string | null;
    try {
      dirtyPatchConflict = await resolveAcceptedPatchDirtyConflict(context.repoRoot, patchChangedPaths, deps);
    } catch (error) {
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: target,
        code: 'provider_worker_child_lane_parent_dirty_check_failed',
        message: `Failed to inspect parent workspace state before accepting child lane: ${error instanceof Error ? error.message : String(error)}`,
        status: 502
      });
    }
    if (dirtyPatchConflict) {
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: target,
        code: 'provider_worker_child_lane_parent_dirty',
        message: dirtyPatchConflict,
        status: 409
      });
    }
    try {
      await deps.applyPatchArtifact(context.repoRoot, patchArtifactPath);
    } catch (error) {
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: target,
        code: 'provider_worker_child_lane_apply_failed',
        message: error instanceof Error ? error.message : String(error),
        status: 409
      });
    }
  }

  const decision = mapActionToDecision(params.action);
  const decisionReason = normalizeOptionalString(params.reason) ?? defaultDecisionReason(params.action, target);
  const updated = await deps.updateChildLaneRecord(
    context.runDir,
    (entry) => entry.stream === target.stream && entry.run_id === target.run_id,
    (entry) => ({
      ...entry,
      decision,
      decision_at: deps.now(),
      decision_reason: decisionReason
    })
  );
  if (!updated) {
    return failureResult({
      action: params.action,
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: target,
      code: 'provider_worker_child_lane_update_failed',
      message: `Failed to update child lane ${stream}.`,
      status: 502
    });
  }
  await deps.refreshProofSnapshot(context.runDir, params.env[PROVIDER_LINEAR_AUDIT_ENV_VAR] ?? null);
  return {
    ok: true,
    operation: 'child-lane',
    action: decision === 'accepted' ? 'accepted' : decision === 'rejected' ? 'rejected' : 'invalidated',
    issue: {
      id: context.issueId,
      identifier: context.issueIdentifier
    },
    source_setup: sourceSetup,
    stream,
    child_run: null,
    child_lane: updated
  };
}

function normalizeAction(value: string): ProviderLinearChildLaneAction | null {
  return value === 'launch' || value === 'accept' || value === 'reject' || value === 'invalidate'
    ? value
    : null;
}

function mapActionToDecision(action: 'accept' | 'reject' | 'invalidate'): ProviderLinearWorkerChildLaneDecision {
  if (action === 'accept') {
    return 'accepted';
  }
  if (action === 'reject') {
    return 'rejected';
  }
  return 'invalidated';
}

function defaultDecisionReason(
  action: 'accept' | 'reject' | 'invalidate',
  childLane: ProviderLinearWorkerChildLaneRecord
): string {
  if (action === 'accept') {
    return `Parent accepted patch artifact ${childLane.patch_artifact_path ?? '(missing patch path)'}.`;
  }
  if (action === 'reject') {
    return 'Parent rejected child lane output.';
  }
  return 'Parent invalidated child lane output.';
}

function resolveChildLaneDecisionProvenanceViolation(
  context: Pick<Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>, 'issueId' | 'issueIdentifier' | 'taskId'>,
  stream: string,
  childLane: ProviderLinearWorkerChildLaneRecord
): string | null {
  const expectedTaskId = `${context.taskId}-${stream}`;
  if (childLane.pipeline_id !== PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID) {
    return `Pending child lane ${stream} must remain recorded as ${PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID}; recorded pipeline was ${childLane.pipeline_id}.`;
  }
  if (childLane.task_id !== expectedTaskId) {
    return `Pending child lane ${stream} must stay bound to task ${expectedTaskId}; recorded task was ${childLane.task_id}.`;
  }
  if (childLane.issue_id !== context.issueId || childLane.issue_identifier !== context.issueIdentifier) {
    return `Pending child lane ${stream} must stay bound to issue ${context.issueIdentifier}; recorded issue was ${childLane.issue_identifier} (${childLane.issue_id}).`;
  }
  return null;
}

function resolveAcceptedPatchArtifactPath(
  repoRoot: string,
  childLane: ProviderLinearWorkerChildLaneRecord,
  artifactRoot: string
): string | null {
  const patchArtifactPath = normalizeOptionalString(childLane.patch_artifact_path);
  if (!patchArtifactPath) {
    return null;
  }
  const resolvedPatchArtifactPath = resolveRunPath(repoRoot, patchArtifactPath);
  return isPathWithinRoot(artifactRoot, resolvedPatchArtifactPath) ? resolvedPatchArtifactPath : null;
}

function resolveAcceptedChildLaneArtifactRoot(
  repoRoot: string,
  childRunsRoot: string,
  childLane: ProviderLinearWorkerChildLaneRecord
): string | null {
  const taskId = normalizeOptionalString(childLane.task_id);
  const artifactRoot = normalizeOptionalString(childLane.artifact_root);
  const manifestPath = normalizeOptionalString(childLane.manifest_path);
  const runId = normalizeOptionalString(childLane.run_id);
  if (!taskId || !artifactRoot || !runId) {
    return null;
  }
  let safeRunId: string;
  try {
    safeRunId = sanitizeRunId(runId);
  } catch {
    return null;
  }
  const expectedArtifactRoot = resolve(childRunsRoot, taskId, 'cli', safeRunId);
  const resolvedArtifactRoot = resolveRunPath(repoRoot, artifactRoot);
  if (resolvedArtifactRoot !== expectedArtifactRoot) {
    return null;
  }
  if (manifestPath) {
    const resolvedManifestPath = resolveRunPath(repoRoot, manifestPath);
    if (resolvedManifestPath !== join(expectedArtifactRoot, 'manifest.json')) {
      return null;
    }
  }
  return expectedArtifactRoot;
}

async function readPatchChangedPaths(patchPath: string): Promise<string[]> {
  const rawPatch = await readFile(patchPath, 'utf8');
  const changedPaths = new Set<string>();
  for (const line of rawPatch.split(/\r?\n/u)) {
    const match = /^diff --git a\/(.+?) b\/(.+)$/u.exec(line);
    if (!match) {
      continue;
    }
    const candidate = match[2] === '/dev/null' ? match[1] : match[2];
    const normalized = normalizeScopeFileEntry(candidate);
    if (normalized) {
      changedPaths.add(normalized);
    }
  }
  return [...changedPaths];
}

function resolveAcceptedPatchScopeViolation(
  scope: ProviderLinearWorkerChildLaneScope,
  patchChangedPaths: string[]
): string | null {
  if (patchChangedPaths.length === 0) {
    return 'Child lane patch does not declare any repo-relative file targets, so parent acceptance cannot verify the bounded scope.';
  }
  if (scope.files.length === 0) {
    return `Child lane acceptance currently requires explicit file scope so patch paths can be machine-checked; this lane only declared phases (${scope.phases.join(', ')}). Relaunch with --files or reject/invalidate the lane output instead.`;
  }
  const declaredFiles = normalizeScopeEntries(scope.files, 'file');
  const outOfScopePaths = patchChangedPaths.filter((entry) => !declaredFiles.includes(entry));
  if (outOfScopePaths.length === 0) {
    return null;
  }
  return `Child lane patch touches files outside the declared file scope (${outOfScopePaths.join(', ')}). Declared scope: ${declaredFiles.join(', ')}.`;
}

async function resolveAcceptedPatchDirtyConflict(
  workspacePath: string,
  patchChangedPaths: string[],
  deps: ProviderLinearChildLaneShellDependencies
): Promise<string | null> {
  const dirtyPaths = (await deps.readParentDirtyPaths(workspacePath)).filter(
    (entry) => !isIgnoredParentArtifactPath(entry)
  );
  if (dirtyPaths.length === 0) {
    return null;
  }
  const overlapping = patchChangedPaths.filter((entry) => dirtyPaths.includes(entry));
  if (overlapping.length === 0) {
    return null;
  }
  return `Parent workspace already has pending edits to files this child-lane patch would update (${overlapping.join(', ')}); clean, commit, or incorporate those parent edits before accepting the child-lane patch.`;
}

async function resolveParentSnapshot(
  context: Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
  env: NodeJS.ProcessEnv,
  deps: ProviderLinearChildLaneShellDependencies
): Promise<ParentIssueSnapshot & { captured_at: string }> {
  const trackedIssue = await deps.readTrackedIssue({
    issueId: context.issueId,
    sourceSetup: context.sourceSetup,
    env
  });
  return {
    issue_updated_at: trackedIssue?.updated_at ?? context.issueUpdatedAt ?? null,
    issue_state: trackedIssue?.state ?? null,
    issue_state_type: trackedIssue?.state_type ?? null,
    captured_at: deps.now()
  };
}

function resolveChildLaneStaleReason(
  childLane: ProviderLinearWorkerChildLaneRecord,
  currentHeadSha: string | null,
  currentIssue: ParentIssueSnapshot
): string | null {
  if (childLane.parent_snapshot.base_sha && currentHeadSha && childLane.parent_snapshot.base_sha !== currentHeadSha) {
    return `Child lane ${childLane.stream} is stale because the parent workspace HEAD moved from ${childLane.parent_snapshot.base_sha} to ${currentHeadSha}.`;
  }
  if (
    childLane.parent_snapshot.issue_updated_at &&
    currentIssue.issue_updated_at &&
    childLane.parent_snapshot.issue_updated_at !== currentIssue.issue_updated_at
  ) {
    return `Child lane ${childLane.stream} is stale because the issue updated_at changed from ${childLane.parent_snapshot.issue_updated_at} to ${currentIssue.issue_updated_at}.`;
  }
  if (
    childLane.parent_snapshot.issue_state &&
    currentIssue.issue_state &&
    childLane.parent_snapshot.issue_state !== currentIssue.issue_state
  ) {
    return `Child lane ${childLane.stream} is stale because the issue state changed from ${childLane.parent_snapshot.issue_state} to ${currentIssue.issue_state}.`;
  }
  return null;
}

function normalizeChildLaneStreamName(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = slugify(value, '').toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeChildLaneScope(
  files: string[],
  phases: string[],
  repoRoot?: string
): ProviderLinearWorkerChildLaneScope | null {
  const normalizedFiles = normalizeScopeEntries(files, 'file', repoRoot);
  const normalizedPhases = normalizeScopeEntries(phases, 'phase');
  if (normalizedFiles.length === 0 && normalizedPhases.length === 0) {
    return null;
  }
  return {
    files: normalizedFiles,
    phases: normalizedPhases
  };
}

function normalizeScopeEntries(values: string[], kind: 'file' | 'phase' = 'file', repoRoot?: string): string[] {
  return [
    ...new Set(
      values
        .map((value) => normalizeOptionalString(value))
        .map((value) => {
          if (!value) {
            return null;
          }
          return kind === 'file' ? normalizeScopeFileEntry(value, repoRoot) : value;
        })
        .filter((value): value is string => value !== null)
    )
  ];
}

function normalizeScopeFileEntry(value: string, repoRoot?: string): string | null {
  const normalizedInput = normalizeOptionalString(value);
  if (!normalizedInput) {
    return null;
  }
  if (repoRoot && isAbsolute(normalizedInput)) {
    const absoluteCandidate = resolve(normalizedInput);
    if (!isPathWithinRoot(repoRoot, absoluteCandidate)) {
      return null;
    }
    const relativeToRoot = relative(repoRoot, absoluteCandidate);
    const relativePosix = posix.normalize(relativeToRoot.replaceAll('\\', '/'));
    return relativePosix === '' || relativePosix === '.'
      ? null
      : relativePosix;
  }
  const normalized = posix.normalize(normalizedInput.replaceAll('\\', '/'));
  const withoutCurrentDir = normalized.replace(/^(?:\.\/)+/u, '');
  const trimmed = withoutCurrentDir.replace(/\/+/gu, '/').replace(/\/$/u, '');
  if (trimmed === '' || trimmed === '.' || trimmed === '..' || trimmed.startsWith('../')) {
    return null;
  }
  return trimmed;
}

async function resolveParentDirtyScopeConflict(
  workspacePath: string,
  scope: ProviderLinearWorkerChildLaneScope,
  deps: ProviderLinearChildLaneShellDependencies
): Promise<string | null> {
  const dirtyPaths = (await deps.readParentDirtyPaths(workspacePath)).filter(
    (entry) => !isIgnoredParentArtifactPath(entry)
  );
  if (dirtyPaths.length === 0) {
    return null;
  }
  const sample = dirtyPaths.slice(0, 5).join(', ');
  if (scope.phases.length > 0) {
    return `Parent workspace has pending changes (${sample}); phase-scoped child lanes launch from HEAD and therefore require a clean parent workspace baseline.`;
  }
  const overlapping = scope.files.filter((entry) => dirtyPaths.includes(entry));
  if (overlapping.length === 0) {
    return null;
  }
  return `Parent workspace already has in-scope pending changes (${overlapping.join(', ')}); child lanes launch from HEAD and would miss those parent edits. Clean, commit, or narrow the lane scope before launching it.`;
}

function isIgnoredParentArtifactPath(path: string): boolean {
  return path === '.child-lanes' || path.startsWith('.child-lanes/');
}

function scopesOverlap(
  left: ProviderLinearWorkerChildLaneScope,
  right: ProviderLinearWorkerChildLaneScope
): boolean {
  return (
    left.files.some((entry) => right.files.includes(entry)) ||
    left.phases.some((entry) => right.phases.includes(entry))
  );
}

function normalizeRuntimeMode(value: string | undefined): 'cli' | 'appserver' | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'cli' || normalized === 'appserver' ? normalized : null;
}

function buildProviderLinearChildLaneStartEnv(
  env: NodeJS.ProcessEnv,
  input: {
    repoRoot: string;
    taskId: string;
    stream: string;
    purpose: string;
    instructions: string | null;
    scope: ProviderLinearWorkerChildLaneScope;
    parentWorkspacePath: string;
    parentSnapshot: ParentIssueSnapshot & { base_sha: string | null; captured_at: string };
    sourceSetup: DispatchPilotSourceSetup | null;
  }
): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = { ...process.env, ...env };
  for (const key of PROVIDER_LINEAR_CHILD_LANE_ENV_KEYS_TO_REMOVE) {
    delete sanitized[key];
  }
  for (const key of PROVIDER_LINEAR_CHILD_LANE_OPTIONAL_ENV_KEYS) {
    sanitized[key] = '';
  }
  delete sanitized.CO_LINEAR_WORKSPACE_ID;
  delete sanitized.CO_LINEAR_TEAM_ID;
  delete sanitized.CO_LINEAR_PROJECT_ID;
  sanitized.CODEX_ORCHESTRATOR_ROOT = input.repoRoot;
  sanitized.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH = join(input.repoRoot, 'codex.orchestrator.json');
  sanitized.CODEX_ORCHESTRATOR_RUNS_DIR = resolveWorkspaceScopedArtifactDir(
    input.repoRoot,
    sanitized.CODEX_ORCHESTRATOR_RUNS_DIR,
    '.runs'
  );
  sanitized.CODEX_ORCHESTRATOR_OUT_DIR = resolveWorkspaceScopedArtifactDir(
    input.repoRoot,
    sanitized.CODEX_ORCHESTRATOR_OUT_DIR,
    'out'
  );
  sanitized.MCP_RUNNER_TASK_ID = input.taskId;
  sanitized[PROVIDER_LINEAR_CHILD_LANE_STREAM_ENV] = input.stream;
  sanitized[PROVIDER_LINEAR_CHILD_LANE_PURPOSE_ENV] = input.purpose;
  sanitized[PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV] = input.instructions ?? '';
  sanitized[PROVIDER_LINEAR_CHILD_LANE_FILES_ENV] = JSON.stringify(input.scope.files);
  sanitized[PROVIDER_LINEAR_CHILD_LANE_PHASES_ENV] = JSON.stringify(input.scope.phases);
  sanitized[PROVIDER_LINEAR_CHILD_LANE_PARENT_WORKSPACE_PATH_ENV] = input.parentWorkspacePath;
  sanitized[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV] = input.parentSnapshot.base_sha ?? '';
  sanitized[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV] = input.parentSnapshot.issue_updated_at ?? '';
  sanitized[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV] = input.parentSnapshot.issue_state ?? '';
  sanitized[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV] = input.parentSnapshot.issue_state_type ?? '';
  if (input.sourceSetup?.provider === 'linear') {
    sanitized.CO_LINEAR_WORKSPACE_ID = input.sourceSetup.workspace_id ?? '';
    sanitized.CO_LINEAR_TEAM_ID = input.sourceSetup.team_id ?? '';
    sanitized.CO_LINEAR_PROJECT_ID = input.sourceSetup.project_id ?? '';
  }
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

function parseProviderChildLaneRunResult(
  raw: string,
  repoRoot: string,
  childRunsRoot: string,
  taskId: string
): ProviderLinearChildLaneRunResult | null {
  const parsed = parseTrailingJsonObject(raw);
  if (!parsed) {
    return null;
  }
  const runId = normalizeOptionalString(parsed.run_id);
  const status = normalizeOptionalString(parsed.status);
  const artifactRoot = normalizeOptionalString(parsed.artifact_root);
  const manifestPath = normalizeOptionalString(parsed.manifest) ?? (artifactRoot ? join(artifactRoot, 'manifest.json') : null);
  if (!runId || !status || !artifactRoot || !manifestPath) {
    return null;
  }
  const safeRunId = (() => {
    try {
      return sanitizeRunId(runId);
    } catch {
      return null;
    }
  })();
  if (!safeRunId) {
    return null;
  }
  const expectedRunRoot = resolve(childRunsRoot, taskId, 'cli', safeRunId);
  const resolvedArtifactRoot = resolveRunPath(repoRoot, artifactRoot);
  const resolvedManifestPath = resolveRunPath(repoRoot, manifestPath);
  const resolvedLogPath = normalizeOptionalString(parsed.log_path);
  const normalizedLogPath = resolvedLogPath ? resolveRunPath(repoRoot, resolvedLogPath) : null;
  if (
    !isPathWithinRoot(expectedRunRoot, resolvedArtifactRoot) ||
    !isPathWithinRoot(expectedRunRoot, resolvedManifestPath) ||
    (normalizedLogPath && !isPathWithinRoot(expectedRunRoot, normalizedLogPath))
  ) {
    return null;
  }
  return {
    run_id: safeRunId,
    task_id: taskId,
    pipeline_id: PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID,
    status,
    artifact_root: resolvedArtifactRoot,
    manifest_path: resolvedManifestPath,
    log_path: normalizedLogPath,
    summary: normalizeOptionalString(parsed.summary),
    runtime_mode_requested: normalizeOptionalString(parsed.runtime_mode_requested),
    runtime_mode: normalizeOptionalString(parsed.runtime_mode),
    runtime_provider: normalizeOptionalString(parsed.runtime_provider)
  };
}

function parseTrailingJsonObject(raw: string): Record<string, unknown> | null {
  const lines = raw.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index]?.trim().startsWith('{')) {
      continue;
    }
    try {
      const parsed = JSON.parse(lines.slice(index).join('\n')) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function resolveRunPath(repoRoot: string, value: string): string {
  return isAbsolute(value) ? resolve(value) : resolve(repoRoot, value);
}

function resolveWorkspaceScopedArtifactDir(repoRoot: string, value: string | undefined, fallbackDirname: string): string {
  const normalized = normalizeOptionalString(value);
  const fallback = join(repoRoot, fallbackDirname);
  if (!normalized) {
    return fallback;
  }
  const candidate = isAbsolute(normalized) ? resolve(normalized) : resolve(repoRoot, normalized);
  return isPathWithinRoot(repoRoot, candidate) ? candidate : fallback;
}

function isPathWithinRoot(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === '' || (!relativePath.startsWith('..') && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath));
}

function failureResult(input: {
  action: ProviderLinearChildLaneAction;
  issueId: string | null;
  issueIdentifier: string | null;
  sourceSetup: DispatchPilotSourceSetup | null;
  stream: string | null;
  childRun: ProviderLinearChildLaneRunResult | null;
  childLane: ProviderLinearWorkerChildLaneRecord | null;
  code: string;
  message: string;
  status: number;
}): ProviderLinearChildLaneFailureResult {
  return {
    ok: false,
    operation: 'child-lane',
    action: input.action,
    issue_id: input.issueId,
    issue_identifier: input.issueIdentifier,
    source_setup: input.sourceSetup,
    stream: input.stream,
    child_run: input.childRun,
    child_lane: input.childLane,
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
