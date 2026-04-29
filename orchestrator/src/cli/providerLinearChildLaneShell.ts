import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV
} from '../../../scripts/lib/provider-run-contract.js';
import {
  PROVIDER_LINEAR_AUDIT_ENV_VAR,
  readProviderLinearParallelizationSnapshot,
  resolveProviderLinearAuditPath,
  summarizeProviderLinearAuditPath,
  type ProviderLinearDecisionLineage
} from './control/providerLinearWorkflowAudit.js';
import type { DispatchPilotSourceSetup } from './control/trackerDispatchPilot.js';
import {
  resolveLiveLinearTrackedIssueById,
  type LiveLinearTrackedIssue
} from './control/linearDispatchSource.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';
import { logger } from '../logger.js';
import {
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  defaultExecRunner,
  loadProviderLinearWorkerContext,
  readProviderLinearWorkerChildLanes,
  refreshProviderLinearWorkerProofSnapshot,
  transactProviderLinearWorkerChildLanes,
  type ProviderLinearWorkerChildLaneDecision,
  type ProviderLinearWorkerChildLaneInFlightAction,
  type ProviderLinearWorkerChildLaneRecord,
  type ProviderLinearWorkerChildLaneScope,
  type ProviderLinearWorkerExecRequest,
  type ProviderLinearWorkerExecResult
} from './providerLinearWorkerRunner.js';
import {
  isChildLaneParentDirtySuppressionCode,
  findDeterministicProviderMutationSuppression,
  resolveProviderLinearWorkerAttemptStartedAt
} from './control/providerLinearWorkerTruth.js';
import {
  PROVIDER_LINEAR_CHILD_LANE_FILES_ENV,
  PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT_ENV,
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
import {
  formatProviderLinearChildLanePathSelectors,
  providerLinearChildLanePathMatchesSelectors,
  providerLinearChildLanePathSelectorsEqual,
  providerLinearChildLanePathSelectorsOverlap,
  resolveProviderLinearChildLaneScopeContract,
  resolveProviderLinearChildLaneSupportedPhases
} from './providerLinearChildLanePhaseContract.js';
import {
  applyResolvedProgramInvocationEnvOverrides,
  resolveCodexOrchestratorBootstrapInvocation
} from './utils/packageProgramResolver.js';
import { slugify } from './utils/strings.js';
import { parseTrailingJsonObject } from './utils/trailingJsonObject.js';
import {
  countGuardrailCommands,
  resolveGuardrailsRequiredForManifest,
  resolveGuardrailsRequiredSourceForManifest,
  stripNonApplicableGuardrailSummaryLines
} from './run/manifest.js';

const execFileAsync = promisify(execFile);

const PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID = 'provider-linear-child-lane';
const PROVIDER_LINEAR_CHILD_LANE_MUTATION_REASON =
  'Only the parent provider-linear-worker may mutate the issue lifecycle. Same-issue child lanes are bounded helpers that must return patch artifacts for parent review.';
export const PROVIDER_LINEAR_CHILD_LANE_PARALLEL_FIRST_CAP = 2;
const PROVIDER_LINEAR_CHILD_LANE_IN_FLIGHT_STALE_MS = 30 * 60 * 1000;
const PROVIDER_LINEAR_CHILD_LANE_LAUNCH_RECOVERY_POLL_INTERVAL_MS = 250;
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
  'CODEX_THREAD_ID',
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV,
  PROVIDER_LINEAR_AUDIT_ENV_VAR
] as const;
const PROVIDER_LINEAR_CHILD_LANE_OPTIONAL_ENV_KEYS = [
  PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT_ENV,
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
  guardrails_required: boolean | null;
  guardrails_required_source: string | null;
  guardrail_command_count: number | null;
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

interface ProviderLinearChildLaneDirectoryEntry {
  name: string;
  isDirectory: () => boolean;
}

interface ProviderLinearChildLaneShellDependencies {
  execRunner: (request: ProviderLinearWorkerExecRequest) => Promise<ProviderLinearWorkerExecResult>;
  readParentDirtyPaths: (workspacePath: string) => Promise<string[]>;
  readDir: (path: string) => Promise<ProviderLinearChildLaneDirectoryEntry[]>;
  transactChildLanes: <T>(
    runDir: string,
    action: (
      records: ProviderLinearWorkerChildLaneRecord[]
    ) => Promise<{ records: ProviderLinearWorkerChildLaneRecord[]; result: T }> | { records: ProviderLinearWorkerChildLaneRecord[]; result: T }
  ) => Promise<T>;
  refreshProofSnapshot: (runDir: string, auditPath: string | null, env?: NodeJS.ProcessEnv) => Promise<void>;
  readTrackedIssue: (input: {
    issueId: string;
    sourceSetup?: DispatchPilotSourceSetup | null;
    env?: NodeJS.ProcessEnv;
  }) => Promise<LiveLinearTrackedIssue | null>;
  readParentHeadSha: (workspacePath: string) => Promise<string | null>;
  applyPatchArtifact: (workspacePath: string, patchPath: string) => Promise<void>;
  readChildLaneProof: (proofPath: string) => Promise<ProviderLinearChildLaneProof>;
  now: () => string;
  sleep: (ms: number) => Promise<void>;
  warn: (message: string) => void;
}

const DEFAULT_DEPENDENCIES: ProviderLinearChildLaneShellDependencies = {
  execRunner: defaultExecRunner,
  readDir: async (path) => await readdir(path, { withFileTypes: true }),
  transactChildLanes: async (runDir, action) => await transactProviderLinearWorkerChildLanes(runDir, action),
  readParentDirtyPaths: async (workspacePath) => {
    const modified = await execFileAsync('git', ['-C', workspacePath, 'diff', '--name-only', '--relative', 'HEAD', '--'], {
      maxBuffer: 10 * 1024 * 1024
    });
    const untracked = await execFileAsync('git', ['-C', workspacePath, 'ls-files', '--others', '--exclude-standard'], {
      maxBuffer: 10 * 1024 * 1024
    });
    return normalizeScopeEntries([...modified.stdout.split(/\r?\n/u), ...untracked.stdout.split(/\r?\n/u)]);
  },
  refreshProofSnapshot: async (runDir, auditPath, env) => {
    await refreshProviderLinearWorkerProofSnapshot(runDir, auditPath, undefined, undefined, env, {
      emitProgressEvent: (message) => logger.warn(message)
    });
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
  now: () => new Date().toISOString(),
  sleep: async (ms) => {
    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, ms);
    });
  },
  warn: (message) => {
    logger.warn(message);
  }
};

async function refreshProviderLinearChildLaneProofSnapshotBestEffort(input: {
  deps: Pick<ProviderLinearChildLaneShellDependencies, 'refreshProofSnapshot' | 'warn'>;
  runDir: string;
  auditPath: string | null;
  env: NodeJS.ProcessEnv;
  warningContext: string;
}): Promise<void> {
  try {
    await input.deps.refreshProofSnapshot(input.runDir, input.auditPath, input.env);
  } catch (error) {
    input.deps.warn(
      `provider-linear-child-lane warning: failed to refresh proof snapshot ${input.warningContext}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

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
    const message = formatProviderWorkerChildLaneProvenanceInvalidMessage(context, env);
    return failureResult({
      action: normalizeAction(params.action) ?? 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream: params.streamName ?? null,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_provenance_invalid',
      message,
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
  let scope: ProviderLinearWorkerChildLaneScope | null;
  try {
    scope = normalizeChildLaneScope(params.files ?? [], params.phases ?? [], context.repoRoot);
  } catch (error) {
    const message = formatChildLaneScopeLaunchFailureMessage(error instanceof Error ? error.message : String(error));
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_scope_missing',
      message,
      status: 422
    });
  }
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
      message: formatChildLaneScopeLaunchFailureMessage(
        'Provider worker child lanes require --purpose and at least one declared file or supported phase scope.'
      ),
      status: 422
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
    const retrySuppression = await resolveSameAttemptParentDirtyRetrySuppression(
      context.runDir,
      context.issueId,
      params.env
    );
    if (retrySuppression) {
      return failureResult({
        action: 'launch',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: null,
        code: 'provider_worker_child_lane_parent_dirty_retry_suppressed',
        message: `${dirtyScopeConflict} Same-attempt retry suppression is in effect: ${retrySuppression.instruction}`,
        status: 409
      });
    }
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
  const decisionLineage = await resolveChildLaneParentDecisionLineage(context, params.env);
  const childTaskId = `${context.taskId}-${stream}`;
  const childRunsRoot = resolveWorkspaceScopedArtifactDir(
    context.repoRoot,
    params.env.CODEX_ORCHESTRATOR_RUNS_DIR,
    '.runs'
  );
  const now = deps.now();
  const launchReservation = buildReservedChildLaneRecord({
    stream,
    childRunsRoot,
    childTaskId,
    context,
    purpose,
    instructions: params.instructions ?? null,
    scope,
    sourceSetup,
    parentSnapshot: {
      ...parentSnapshot,
      base_sha: baseSha
    },
    decisionLineage,
    now
  });
  const reservation = await deps.transactChildLanes<{
    conflicting: ProviderLinearWorkerChildLaneRecord | null;
    capExhausted: ProviderLinearWorkerChildLaneRecord[];
    reserved: ProviderLinearWorkerChildLaneRecord | null;
  }>(context.runDir, async (records) => {
    const conflicting = findPendingChildLaneConflict(records, stream, scope);
    if (conflicting) {
      return {
        records,
        result: { conflicting, capExhausted: [], reserved: null }
      };
    }
    const countedLanes = selectChildLanesCountingTowardParallelFirstCap(records, now);
    if (countedLanes.length >= PROVIDER_LINEAR_CHILD_LANE_PARALLEL_FIRST_CAP) {
      return {
        records,
        result: { conflicting: null, capExhausted: countedLanes, reserved: null }
      };
    }
    return {
      records: [...records, launchReservation],
      result: { conflicting: null, capExhausted: [], reserved: launchReservation }
    };
  });
  if (reservation.conflicting) {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: reservation.conflicting,
      code: 'provider_worker_child_lane_scope_conflict',
      message: describePendingChildLaneConflict(stream, reservation.conflicting),
      status: 409
    });
  }
  if (reservation.capExhausted.length > 0) {
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_cap_exhausted',
      message: describeChildLaneCapExhaustion(reservation.capExhausted),
      status: 409
    });
  }

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
  applyResolvedProgramInvocationEnvOverrides(childStartEnv, invocation.envOverrides);

  const execAbortController = new AbortController();
  let execSettled = false;
  const execPromise = deps.execRunner({
    command: invocation.command,
    args,
    cwd: context.repoRoot,
    env: childStartEnv,
    mirrorOutput: false,
    abortSignal: execAbortController.signal
  });
  void execPromise.then(
    () => {
      execSettled = true;
    },
    () => {
      execSettled = true;
    }
  );

  let execResult: ProviderLinearWorkerExecResult | null = null;
  let recoveredLaunch: ProviderLinearChildLaneLaunchRecoveryCandidate | null = null;
  let launchError: unknown = null;
  const recoveredLaunchPromise = waitForRecoveredChildLaneLaunchCandidate({
    reservation: launchReservation,
    context,
    childRunsRoot,
    deps,
    isExecSettled: () => execSettled,
    now
  });
  const advisoryRecoveredLaunchPromise = recoveredLaunchPromise.catch((error) => {
    deps.warn(
      `provider-linear-child-lane warning: ignored launch-recovery scan failure while awaiting exec result: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  });
  try {
    const launchOutcome = await Promise.race([
      execPromise.then((result) => ({ kind: 'exec' as const, result })),
      advisoryRecoveredLaunchPromise.then((recovered) => ({ kind: 'recovered' as const, recovered }))
    ]);
    if (launchOutcome.kind === 'recovered') {
      if (launchOutcome.recovered) {
        recoveredLaunch = launchOutcome.recovered;
        if (!execSettled) {
          execAbortController.abort(
            new Error(
              `Recovered child lane ${recoveredLaunch.childRun.run_id} from manifest/proof while the launcher reservation still reported ${launchReservation.run_id}.`
            )
          );
        }
      }
    } else {
      execResult = launchOutcome.result;
    }
    if (!execResult) {
      try {
        execResult = await execPromise;
      } catch (error) {
        launchError = error;
      }
    }
  } catch (error) {
    launchError = error;
  }
  if (!recoveredLaunch) {
    recoveredLaunch = await advisoryRecoveredLaunchPromise;
  }
  if (launchError && !recoveredLaunch) {
    await removeReservedChildLane(context.runDir, launchReservation, deps);
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_launch_failed',
      message: launchError instanceof Error ? launchError.message : String(launchError),
      status: 502
    });
  }
  const childRun =
    recoveredLaunch?.childRun ??
    (execResult
      ? await parseProviderChildLaneRunResult(
          execResult.stdout,
          context.repoRoot,
          childStartEnv.CODEX_ORCHESTRATOR_RUNS_DIR ?? join(context.repoRoot, '.runs'),
          childTaskId
        )
      : null);
  if (!childRun) {
    await removeReservedChildLane(context.runDir, launchReservation, deps);
    const detail = execResult
      ? [execResult.stderr.trim(), execResult.stdout.trim()].filter(Boolean)[0] ?? 'unknown child-lane output'
      : 'unknown child-lane output';
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
  const childProof = recoveredLaunch?.proof ?? (await deps.readChildLaneProof(proofPath).catch(() => null));
  if (childRun.status === 'succeeded' && (!childProof || !childProof.patch_artifact_path)) {
    await removeReservedChildLane(context.runDir, launchReservation, deps);
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
  let recordedScope = recoveredLaunch?.childLane.scope ?? scope;
  if (!recoveredLaunch && childProof?.scope) {
    try {
      const proofScope = resolveProviderLinearChildLaneScopeContract(childProof.scope);
      if (!areChildLaneScopesEquivalent(scope, proofScope)) {
        await removeReservedChildLane(context.runDir, launchReservation, deps);
        return failureResult({
          action: 'launch',
          issueId: context.issueId,
          issueIdentifier: context.issueIdentifier,
          sourceSetup,
          stream,
          childRun,
          childLane: null,
          code: 'provider_worker_child_lane_proof_invalid',
          message: 'Child lane proof scope does not match the parent-launched scope contract.',
          status: 409
        });
      }
      recordedScope = proofScope;
    } catch (error) {
      await removeReservedChildLane(context.runDir, launchReservation, deps);
      return failureResult({
        action: 'launch',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun,
        childLane: null,
        code: 'provider_worker_child_lane_proof_invalid',
        message: `Child lane ${stream} wrote an invalid proof scope contract: ${error instanceof Error ? error.message : String(error)}`,
        status: 409
      });
    }
  }

  const childLane: ProviderLinearWorkerChildLaneRecord =
    recoveredLaunch?.childLane ?? (() => {
      const zeroBytePatch =
        execResult?.exitCode === 0 && childRun.status === 'succeeded' && childProof?.patch_bytes === 0;
      return {
        stream,
        pipeline_id: PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID,
        task_id: childTaskId,
        run_id: childRun.run_id,
        status: childRun.status,
        manifest_path: childRun.manifest_path,
        artifact_root: childRun.artifact_root,
        log_path: childRun.log_path,
        summary: childRun.summary ?? normalizeOptionalString(childProof?.last_message),
        guardrails_required: childRun.guardrails_required,
        guardrails_required_source: childRun.guardrails_required_source,
        guardrail_command_count: childRun.guardrail_command_count,
        issue_id: context.issueId,
        issue_identifier: context.issueIdentifier,
        workspace_path: context.repoRoot,
        source_setup: sourceSetup,
        launched_at: launchReservation.launched_at,
        purpose,
        instructions: normalizeOptionalString(params.instructions),
        scope: recordedScope,
        parent_snapshot: childProof?.parent_snapshot ?? {
          ...parentSnapshot,
          base_sha: baseSha,
          captured_at: deps.now()
        },
        decision_lineage: decisionLineage,
        lane_workspace_path: childProof?.lane_workspace_path ?? null,
        patch_artifact_path: childProof?.patch_artifact_path ?? null,
        patch_bytes: childProof?.patch_bytes ?? null,
        decision: zeroBytePatch ? 'rejected' : 'pending',
        in_flight_action: null,
        in_flight_started_at: null,
        decision_at: zeroBytePatch ? deps.now() : null,
        decision_reason: zeroBytePatch ? buildNoOutputAdvisoryChildLaneDecisionReason(childRun) : null
      };
    })();

  let recordedChildLaneForResult = childLane;
  try {
    const recorded = await deps.transactChildLanes(context.runDir, async (records) => {
      const current = findChildLaneByIdentity(records, launchReservation);
      if (!current) {
        return {
          records,
          result: null as ProviderLinearWorkerChildLaneRecord | null
        };
      }
      const recordedChildLane = mergeCompletedChildLaneWithParentDecision(current, childLane);
      const next = replaceChildLaneRecord(records, current, recordedChildLane);
      if (!next) {
        return {
          records,
          result: null as ProviderLinearWorkerChildLaneRecord | null
        };
      }
      return {
        records: next,
        result: recordedChildLane
      };
    });
    if (!recorded) {
      await removeReservedChildLane(context.runDir, launchReservation, deps);
      return failureResult({
        action: 'launch',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun,
        childLane,
        code: 'provider_worker_child_lane_record_failed',
        message: 'Failed to replace the reserved child lane entry with the completed child run record.',
        status: 502
      });
    }
    recordedChildLaneForResult = recorded;
  } catch (error) {
    await removeReservedChildLane(context.runDir, launchReservation, deps).catch(() => undefined);
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
  await refreshProviderLinearChildLaneProofSnapshotBestEffort({
    deps,
    runDir: context.runDir,
    auditPath: params.env[PROVIDER_LINEAR_AUDIT_ENV_VAR] ?? null,
    env: params.env,
    warningContext: `after recording child lane ${stream}`
  });
  const launchExitedNonZero = recoveredLaunch ? false : execResult ? execResult.exitCode !== 0 : false;
  if (launchExitedNonZero || childRun.status !== 'succeeded') {
    const childFailureDetail =
      normalizeOptionalString(childProof?.last_message) ??
      normalizeOptionalString(recordedChildLaneForResult.summary) ??
      normalizeOptionalString(childRun.summary);
    return failureResult({
      action: 'launch',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun,
      childLane: recordedChildLaneForResult,
      code: 'provider_worker_child_lane_run_failed',
      message: `Child lane ${stream} completed with status ${childRun.status}.${childFailureDetail ? ` ${childFailureDetail}` : ''} ${PROVIDER_LINEAR_CHILD_LANE_MUTATION_REASON}`,
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
    child_lane: recordedChildLaneForResult
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
  const childRunsRoot = resolveWorkspaceScopedArtifactDir(
    context.repoRoot,
    params.env.CODEX_ORCHESTRATOR_RUNS_DIR,
    '.runs'
  );
  if (params.action !== 'accept') {
    const finalized = await finalizePendingChildLaneDecision({
      action: params.action,
      context,
      childRunsRoot,
      stream,
      deps,
      reason: normalizeOptionalString(params.reason),
      now: deps.now()
    });
    if (finalized.kind !== 'updated') {
      return childLaneDecisionFailureResult({
        action: params.action,
        context,
        sourceSetup,
        stream,
        outcome: finalized
      });
    }
    await refreshProviderLinearChildLaneProofSnapshotBestEffort({
      deps,
      runDir: context.runDir,
      auditPath: params.env[PROVIDER_LINEAR_AUDIT_ENV_VAR] ?? null,
      env: params.env,
      warningContext: `after finalizing ${finalized.decision} child lane ${stream}`
    });
    return {
      ok: true,
      operation: 'child-lane',
      action: finalized.decision === 'rejected' ? 'rejected' : 'invalidated',
      issue: {
        id: context.issueId,
        identifier: context.issueIdentifier
      },
      source_setup: sourceSetup,
      stream,
      child_run: null,
      child_lane: finalized.childLane
    };
  }

  const claimed = await claimPendingChildLaneAcceptance({
    context,
    childRunsRoot,
    stream,
    deps,
    now: deps.now()
  });
  if (claimed.kind !== 'claimed') {
    return childLaneDecisionFailureResult({
      action: 'accept',
      context,
      sourceSetup,
      stream,
      outcome: claimed
    });
  }

  const target = claimed.childLane;
  let currentHeadSha: string | null;
  let currentIssue: ParentIssueSnapshot & { captured_at: string };
  try {
    currentHeadSha = await deps.readParentHeadSha(context.repoRoot);
    currentIssue = await resolveParentSnapshot(context, params.env, deps);
  } catch (error) {
    try {
      await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
    } catch (releaseError) {
      deps.warn(
        `provider-linear-child-lane warning: failed to release accept claim after snapshot read failure for ${stream}: ${releaseError instanceof Error ? releaseError.message : String(releaseError)}`
      );
    }
    throw error;
  }
  const staleReason = resolveChildLaneStaleReason(target, currentHeadSha, currentIssue);
  if (staleReason) {
    const invalidated = await finalizeClaimedChildLaneDecision({
      context,
      target,
      decision: 'invalidated',
      decisionReason: staleReason,
      deps,
      now: deps.now()
    });
    await refreshProviderLinearChildLaneProofSnapshotBestEffort({
      deps,
      runDir: context.runDir,
      auditPath: params.env[PROVIDER_LINEAR_AUDIT_ENV_VAR] ?? null,
      env: params.env,
      warningContext: `after invalidating stale child lane ${stream}`
    });
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
    await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
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
    childRunsRoot,
    target
  );
  if (!artifactRoot) {
    await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
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
    await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
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
  const proofPath = join(artifactRoot, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME);
  const acceptedProof = await deps.readChildLaneProof(proofPath).catch(() => null);
  let acceptedProofScope: ProviderLinearWorkerChildLaneScope | null = null;
  if (!acceptedProof) {
    await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
    return failureResult({
      action: 'accept',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: target,
      code: 'provider_worker_child_lane_proof_missing',
      message: 'Child lane acceptance requires a readable proof bundle before parent apply.',
      status: 409
    });
  }
  if (acceptedProof) {
    if (!acceptedProof.scope) {
      await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: target,
        code: 'provider_worker_child_lane_proof_invalid',
        message: 'Child lane proof is missing scope contract metadata.',
        status: 409
      });
    }
    const proofViolation = resolveAcceptedChildLaneProofViolation(
      resolveExpectedChildLaneProofParentRunId(context.runId, target),
      target,
      acceptedProof,
      context.repoRoot,
      artifactRoot,
      patchArtifactPath
    );
    if (proofViolation) {
      await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
      return failureResult({
        action: 'accept',
        issueId: context.issueId,
        issueIdentifier: context.issueIdentifier,
        sourceSetup,
        stream,
        childRun: null,
        childLane: target,
        code: 'provider_worker_child_lane_proof_invalid',
        message: proofViolation,
        status: 409
      });
    }
    acceptedProofScope = acceptedProof.scope;
  }
  let patchChangedPaths: string[];
  try {
    patchChangedPaths = await readPatchChangedPaths(patchArtifactPath);
  } catch (error) {
    await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
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
  const patchScopeViolation = resolveAcceptedPatchScopeViolation(
    target.scope,
    patchChangedPaths,
    acceptedProofScope
  );
  if (patchScopeViolation) {
    await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
    return failureResult({
      action: 'accept',
      issueId: context.issueId,
      issueIdentifier: context.issueIdentifier,
      sourceSetup,
      stream,
      childRun: null,
      childLane: target,
      code: isProofScopeViolation(patchScopeViolation)
        ? 'provider_worker_child_lane_proof_invalid'
        : 'provider_worker_child_lane_patch_scope_invalid',
      message: patchScopeViolation,
      status: 409
    });
  }
  let dirtyPatchConflict: string | null;
  try {
    dirtyPatchConflict = await resolveAcceptedPatchDirtyConflict(context.repoRoot, patchChangedPaths, deps);
  } catch (error) {
    await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
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
    await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
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
    await releaseClaimedChildLaneAcceptance(context.runDir, target, deps);
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

  const accepted = await finalizeClaimedChildLaneDecision({
    context,
    target,
    decision: 'accepted',
    decisionReason: normalizeOptionalString(params.reason) ?? defaultDecisionReason('accept', target),
    deps,
    now: deps.now()
  });
  if (!accepted) {
    return failureResult({
      action: 'accept',
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
  await refreshProviderLinearChildLaneProofSnapshotBestEffort({
    deps,
    runDir: context.runDir,
    auditPath: params.env[PROVIDER_LINEAR_AUDIT_ENV_VAR] ?? null,
    env: params.env,
    warningContext: `after accepting child lane ${stream}`
  });
  return {
    ok: true,
    operation: 'child-lane',
    action: 'accepted',
    issue: {
      id: context.issueId,
      identifier: context.issueIdentifier
    },
    source_setup: sourceSetup,
    stream,
    child_run: null,
    child_lane: accepted
  };
}

type ChildLaneDecisionBlockedOutcome =
  | { kind: 'not_ready'; childLane: ProviderLinearWorkerChildLaneRecord }
  | { kind: 'in_flight'; childLane: ProviderLinearWorkerChildLaneRecord; inFlightAction: ProviderLinearWorkerChildLaneInFlightAction }
  | { kind: 'provenance_invalid'; childLane: ProviderLinearWorkerChildLaneRecord; message: string };

type ChildLaneDecisionFailureOutcome =
  | { kind: 'not_found' }
  | ChildLaneDecisionBlockedOutcome;

type ResolvedPendingChildLaneDecisionTarget =
  | { kind: 'blocked'; outcome: ChildLaneDecisionFailureOutcome; records: ProviderLinearWorkerChildLaneRecord[] }
  | { kind: 'ready'; records: ProviderLinearWorkerChildLaneRecord[]; target: ProviderLinearWorkerChildLaneRecord };

function childLaneDecisionFailureResult(input: {
  action: 'accept' | 'reject' | 'invalidate';
  context: Pick<Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>, 'issueId' | 'issueIdentifier'>;
  sourceSetup: DispatchPilotSourceSetup | null;
  stream: string;
  outcome: ChildLaneDecisionFailureOutcome;
}): ProviderLinearChildLaneFailureResult {
  if (input.outcome.kind === 'not_found') {
    return failureResult({
      action: input.action,
      issueId: input.context.issueId,
      issueIdentifier: input.context.issueIdentifier,
      sourceSetup: input.sourceSetup,
      stream: input.stream,
      childRun: null,
      childLane: null,
      code: 'provider_worker_child_lane_not_found',
      message: `No pending child lane found for stream ${input.stream}.`,
      status: 404
    });
  }
  if (input.outcome.kind === 'provenance_invalid') {
    return failureResult({
      action: input.action,
      issueId: input.context.issueId,
      issueIdentifier: input.context.issueIdentifier,
      sourceSetup: input.sourceSetup,
      stream: input.stream,
      childRun: null,
      childLane: input.outcome.childLane,
      code: 'provider_worker_child_lane_provenance_invalid',
      message: input.outcome.message,
      status: 409
    });
  }
  if (input.outcome.kind === 'in_flight') {
    return failureResult({
      action: input.action,
      issueId: input.context.issueId,
      issueIdentifier: input.context.issueIdentifier,
      sourceSetup: input.sourceSetup,
      stream: input.stream,
      childRun: null,
      childLane: input.outcome.childLane,
      code: 'provider_worker_child_lane_decision_in_flight',
      message: `Pending child lane ${input.stream} already has an in-flight ${input.outcome.inFlightAction} decision; wait for that parent-owned decision to finish before retrying ${input.action}.`,
      status: 409
    });
  }
  return failureResult({
    action: input.action,
    issueId: input.context.issueId,
    issueIdentifier: input.context.issueIdentifier,
    sourceSetup: input.sourceSetup,
    stream: input.stream,
    childRun: null,
    childLane: input.outcome.childLane,
    code: 'provider_worker_child_lane_not_ready',
    message: `Pending child lane ${input.stream} is still launching and cannot be ${input.action === 'accept' ? 'accepted' : input.action === 'reject' ? 'rejected' : 'invalidated'} yet.`,
    status: 409
  });
}

async function resolveSameAttemptParentDirtyRetrySuppression(
  runDir: string,
  issueId: string,
  env: NodeJS.ProcessEnv
): Promise<ReturnType<typeof findDeterministicProviderMutationSuppression>> {
  const auditPath = resolveProviderLinearAuditPath(env);
  if (!auditPath) {
    return null;
  }
  let rawProof: string;
  try {
    rawProof = await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8');
  } catch {
    return null;
  }
  let parsedProof: Record<string, unknown>;
  try {
    parsedProof = JSON.parse(rawProof) as Record<string, unknown>;
  } catch {
    return null;
  }
  const attemptStartedAt = resolveProviderLinearWorkerAttemptStartedAt(parsedProof);
  if (!attemptStartedAt) {
    return null;
  }
  let audit = null;
  try {
    audit = await summarizeProviderLinearAuditPath(auditPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `provider linear child-lane warning: failed to summarize provider-linear audit at ${auditPath}; proceeding without same-attempt retry suppression. error=${message}`
    );
    return null;
  }
  const suppression = findDeterministicProviderMutationSuppression(
    audit,
    'child-lane',
    {
      recordedAtNotBefore: attemptStartedAt,
      action: 'launch',
      issueId
    }
  );
  return suppression && isChildLaneParentDirtySuppressionCode(suppression.error_code)
    ? suppression
    : null;
}

async function finalizePendingChildLaneDecision(input: {
  action: 'reject' | 'invalidate';
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'runDir' | 'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'repoRoot'
  >;
  childRunsRoot: string;
  stream: string;
  deps: ProviderLinearChildLaneShellDependencies;
  reason: string | null;
  now: string;
}): Promise<ChildLaneDecisionFailureOutcome | { kind: 'updated'; childLane: ProviderLinearWorkerChildLaneRecord; decision: ProviderLinearWorkerChildLaneDecision }> {
  const decision = mapActionToDecision(input.action);
  return await input.deps.transactChildLanes<
    ChildLaneDecisionFailureOutcome | { kind: 'updated'; childLane: ProviderLinearWorkerChildLaneRecord; decision: ProviderLinearWorkerChildLaneDecision }
  >(input.context.runDir, async (records) => {
    const resolved = await resolvePendingChildLaneDecisionTarget({
      records,
      context: input.context,
      childRunsRoot: input.childRunsRoot,
      stream: input.stream,
      action: input.action,
      deps: input.deps,
      now: input.now
    });
    if (resolved.kind !== 'ready') {
      return { records: resolved.records, result: resolved.outcome };
    }
    const target = resolved.target;
    const updated: ProviderLinearWorkerChildLaneRecord = {
      ...target,
      decision,
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: input.now,
      decision_reason: input.reason ?? defaultDecisionReason(input.action, target)
    };
    const next = replaceChildLaneRecord(resolved.records, target, updated);
    if (!next) {
      return { records: resolved.records, result: { kind: 'not_found' } };
    }
    return {
      records: next,
      result: { kind: 'updated', childLane: updated, decision }
    };
  });
}

async function claimPendingChildLaneAcceptance(input: {
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'runDir' | 'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'repoRoot'
  >;
  childRunsRoot: string;
  stream: string;
  deps: ProviderLinearChildLaneShellDependencies;
  now: string;
}): Promise<ChildLaneDecisionFailureOutcome | { kind: 'claimed'; childLane: ProviderLinearWorkerChildLaneRecord }> {
  return await input.deps.transactChildLanes<
    ChildLaneDecisionFailureOutcome | { kind: 'claimed'; childLane: ProviderLinearWorkerChildLaneRecord }
  >(input.context.runDir, async (records) => {
    const resolved = await resolvePendingChildLaneDecisionTarget({
      records,
      context: input.context,
      childRunsRoot: input.childRunsRoot,
      stream: input.stream,
      action: 'accept',
      deps: input.deps,
      now: input.now
    });
    if (resolved.kind !== 'ready') {
      return { records: resolved.records, result: resolved.outcome };
    }
    const target = resolved.target;
    const claimed: ProviderLinearWorkerChildLaneRecord = {
      ...target,
      in_flight_action: 'accept',
      in_flight_started_at: input.now
    };
    const next = replaceChildLaneRecord(resolved.records, target, claimed);
    if (!next) {
      return { records: resolved.records, result: { kind: 'not_found' } };
    }
    return {
      records: next,
      result: { kind: 'claimed', childLane: claimed }
    };
  });
}

async function resolvePendingChildLaneDecisionTarget(input: {
  records: ProviderLinearWorkerChildLaneRecord[];
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'runDir' | 'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'repoRoot'
  >;
  childRunsRoot: string;
  stream: string;
  action: 'accept' | 'reject' | 'invalidate';
  deps: Pick<ProviderLinearChildLaneShellDependencies, 'readChildLaneProof' | 'readDir'>;
  now: string;
}): Promise<ResolvedPendingChildLaneDecisionTarget> {
  let records = input.records;
  let target = findLatestPendingChildLane(records, input.stream);
  if (!target) {
    target = await findRecoverablePendingChildLaneDecisionTarget({
      context: input.context,
      records,
      stream: input.stream,
      action: input.action,
      deps: input.deps
    });
  }
  if (!target) {
    return { kind: 'blocked', outcome: { kind: 'not_found' }, records: input.records };
  }
  if (!records.some((entry) => matchesChildLaneRecordIdentity(entry, target))) {
    records = [...records, target];
  }
  const preRepairBlocked = resolveChildLaneDecisionPreRepairBlockedOutcome(
    input.context,
    input.stream,
    target,
    input.now
  );
  if (preRepairBlocked) {
    return { kind: 'blocked', outcome: preRepairBlocked, records: input.records };
  }
  let resolvedTarget = target;
  const repaired = await repairPendingLaunchingChildLaneDecisionTarget({
    records,
    target,
    context: input.context,
    childRunsRoot: input.childRunsRoot,
    action: input.action,
    deps: input.deps,
    now: input.now
  });
  if (repaired) {
    records = repaired.records;
    if (!repaired.target) {
      return { kind: 'blocked', outcome: { kind: 'not_found' }, records };
    }
    resolvedTarget = repaired.target;
  }
  const postRepairBlocked = resolveChildLaneDecisionPreRepairBlockedOutcome(
    input.context,
    input.stream,
    resolvedTarget,
    input.now
  );
  if (postRepairBlocked) {
    return { kind: 'blocked', outcome: postRepairBlocked, records };
  }
  const blocked = resolveChildLaneDecisionReadinessBlockedOutcome(resolvedTarget, input.action);
  if (blocked) {
    return { kind: 'blocked', outcome: blocked, records };
  }
  return { kind: 'ready', records, target: resolvedTarget };
}

async function findRecoverablePendingChildLaneDecisionTarget(input: {
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'runDir' | 'issueId' | 'issueIdentifier' | 'taskId'
  >;
  records: ProviderLinearWorkerChildLaneRecord[];
  stream: string;
  action: 'accept' | 'reject' | 'invalidate';
  deps: Pick<ProviderLinearChildLaneShellDependencies, 'readDir'>;
}): Promise<ProviderLinearWorkerChildLaneRecord | null> {
  const cliRoot = dirname(input.context.runDir);
  let entries: ProviderLinearChildLaneDirectoryEntry[];
  try {
    entries = await input.deps.readDir(cliRoot);
  } catch {
    return null;
  }
  const currentIdentities = new Set(
    input.records.map((record) => `${record.stream}\0${record.task_id}\0${record.run_id}`)
  );
  const candidates: ProviderLinearWorkerChildLaneRecord[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const candidateRunDir = join(cliRoot, entry.name);
    if (candidateRunDir === input.context.runDir) {
      continue;
    }
    let siblingRecords: ProviderLinearWorkerChildLaneRecord[];
    try {
      siblingRecords = await readProviderLinearWorkerChildLanes(candidateRunDir);
    } catch {
      continue;
    }
    for (const childLane of siblingRecords) {
      if (
        childLane.stream !== input.stream ||
        childLane.decision !== 'pending' ||
        currentIdentities.has(`${childLane.stream}\0${childLane.task_id}\0${childLane.run_id}`) ||
        resolveChildLaneDecisionProvenanceViolation(input.context, input.stream, childLane) !== null ||
        resolveChildLaneDecisionReadinessBlockedOutcome(childLane, input.action) !== null
      ) {
        continue;
      }
      candidates.push(childLane);
    }
  }
  return candidates.sort((left, right) => compareChildLaneLaunchOrder(left, right)).at(-1) ?? null;
}

function compareChildLaneLaunchOrder(
  left: ProviderLinearWorkerChildLaneRecord,
  right: ProviderLinearWorkerChildLaneRecord
): number {
  const leftMs = Date.parse(left.launched_at);
  const rightMs = Date.parse(right.launched_at);
  if (Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs !== rightMs) {
    return leftMs - rightMs;
  }
  return `${left.task_id}\0${left.run_id}`.localeCompare(`${right.task_id}\0${right.run_id}`);
}

function resolveChildLaneDecisionPreRepairBlockedOutcome(
  context: Pick<Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>, 'issueId' | 'issueIdentifier' | 'taskId'>,
  stream: string,
  target: ProviderLinearWorkerChildLaneRecord,
  now: string
): Exclude<ChildLaneDecisionBlockedOutcome, { kind: 'not_ready'; childLane: ProviderLinearWorkerChildLaneRecord }> | null {
  const provenanceViolation = resolveChildLaneDecisionProvenanceViolation(context, stream, target);
  if (provenanceViolation) {
    return {
      kind: 'provenance_invalid',
      childLane: target,
      message: provenanceViolation
    };
  }
  if (target.in_flight_action && !isStaleInFlightChildLane(target, now)) {
    return {
      kind: 'in_flight',
      childLane: target,
      inFlightAction: target.in_flight_action
    };
  }
  return null;
}

function resolveChildLaneDecisionReadinessBlockedOutcome(
  target: ProviderLinearWorkerChildLaneRecord,
  action: 'accept' | 'reject' | 'invalidate'
): ChildLaneDecisionBlockedOutcome | null {
  if (action === 'accept' && target.status === 'launching') {
    return {
      kind: 'not_ready',
      childLane: target
    };
  }
  return null;
}

async function repairPendingLaunchingChildLaneDecisionTarget(input: {
  records: ProviderLinearWorkerChildLaneRecord[];
  target: ProviderLinearWorkerChildLaneRecord;
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'repoRoot'
  >;
  childRunsRoot: string;
  action: 'accept' | 'reject' | 'invalidate';
  deps: Pick<ProviderLinearChildLaneShellDependencies, 'readChildLaneProof' | 'readDir'>;
  now: string;
}): Promise<{ records: ProviderLinearWorkerChildLaneRecord[]; target: ProviderLinearWorkerChildLaneRecord | null } | null> {
  if (input.target.status !== 'launching' || !input.target.run_id.startsWith('launching-')) {
    return null;
  }
  const candidate = await findChildLaneReservationRepairCandidate({
    reservation: input.target,
    context: input.context,
    childRunsRoot: input.childRunsRoot,
    action: input.action,
    deps: input.deps,
    now: input.now
  });
  if (!candidate) {
    return null;
  }
  const repairedReservation: ProviderLinearWorkerChildLaneRecord = {
    ...input.target,
    decision: 'invalidated',
    in_flight_action: null,
    in_flight_started_at: null,
    decision_at: input.now,
    decision_reason: buildChildLaneReservationRepairDecisionReason(input.target, candidate)
  };
  const withRetiredReservation = replaceChildLaneRecord(input.records, input.target, repairedReservation);
  if (!withRetiredReservation) {
    return null;
  }
  const existingCandidate = withRetiredReservation.find((entry) => matchesChildLaneRecordIdentity(entry, candidate)) ?? null;
  if (existingCandidate && existingCandidate.decision !== 'pending') {
    return null;
  }
  const repairedTarget = existingCandidate
    ? mergeCompletedChildLaneWithParentDecision(existingCandidate, candidate)
    : candidate;
  const nextRecords = existingCandidate
    ? (replaceChildLaneRecord(withRetiredReservation, existingCandidate, repairedTarget) ?? withRetiredReservation)
    : [...withRetiredReservation.filter((entry) => !matchesChildLaneRecordIdentity(entry, repairedTarget)), repairedTarget];
  return {
    records: nextRecords,
    target: repairedTarget.decision === 'pending' ? repairedTarget : null
  };
}

async function releaseClaimedChildLaneAcceptance(
  runDir: string,
  target: ProviderLinearWorkerChildLaneRecord,
  deps: ProviderLinearChildLaneShellDependencies
): Promise<void> {
  await deps.transactChildLanes(runDir, async (records) => {
    const next = replaceChildLaneRecord(records, target, {
      ...target,
      in_flight_action: null,
      in_flight_started_at: null
    });
    return {
      records: next ?? records,
      result: undefined
    };
  });
}

async function finalizeClaimedChildLaneDecision(input: {
  context: Pick<Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>, 'runDir'>;
  target: ProviderLinearWorkerChildLaneRecord;
  decision: 'accepted' | 'invalidated';
  decisionReason: string;
  deps: ProviderLinearChildLaneShellDependencies;
  now: string;
}): Promise<ProviderLinearWorkerChildLaneRecord | null> {
  return await input.deps.transactChildLanes(input.context.runDir, async (records) => {
    const next = replaceChildLaneRecord(records, input.target, {
      ...input.target,
      decision: input.decision,
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: input.now,
      decision_reason: input.decisionReason
    });
    if (!next) {
      return {
        records,
        result: null
      };
    }
    const updated = findChildLaneByIdentity(next, input.target);
    return {
      records: next,
      result: updated
    };
  });
}

function findLatestPendingChildLane(
  records: ProviderLinearWorkerChildLaneRecord[],
  stream: string
): ProviderLinearWorkerChildLaneRecord | null {
  return [...records]
    .reverse()
    .find((entry) => entry.stream === stream && entry.decision === 'pending') ?? null;
}

function findChildLaneByIdentity(
  records: ProviderLinearWorkerChildLaneRecord[],
  target: ProviderLinearWorkerChildLaneRecord
): ProviderLinearWorkerChildLaneRecord | null {
  return records.find((entry) => matchesChildLaneRecordIdentity(entry, target)) ?? null;
}

interface ProviderLinearChildLaneLaunchRecoveryCandidate {
  childRun: ProviderLinearChildLaneRunResult;
  childLane: ProviderLinearWorkerChildLaneRecord;
  proof: ProviderLinearChildLaneProof;
}

async function waitForRecoveredChildLaneLaunchCandidate(input: {
  reservation: ProviderLinearWorkerChildLaneRecord;
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'repoRoot'
  >;
  childRunsRoot: string;
  deps: Pick<ProviderLinearChildLaneShellDependencies, 'readChildLaneProof' | 'readDir' | 'sleep' | 'warn'>;
  isExecSettled: () => boolean;
  now: string;
}): Promise<ProviderLinearChildLaneLaunchRecoveryCandidate | null> {
  const readRecoveredCandidate = async (): Promise<ProviderLinearChildLaneLaunchRecoveryCandidate | null> => {
    try {
      return await findRecoveredChildLaneLaunchCandidate({
        reservation: input.reservation,
        context: input.context,
        childRunsRoot: input.childRunsRoot,
        deps: input.deps,
        now: input.now
      });
    } catch (error) {
      input.deps.warn(
        `provider-linear-child-lane warning: failed to scan for recovered child-lane launch candidate: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  };
  while (!input.isExecSettled()) {
    const candidate = await readRecoveredCandidate();
    if (candidate) {
      return candidate;
    }
    await input.deps.sleep(PROVIDER_LINEAR_CHILD_LANE_LAUNCH_RECOVERY_POLL_INTERVAL_MS);
  }
  return await readRecoveredCandidate();
}

async function findRecoveredChildLaneLaunchCandidate(input: {
  reservation: ProviderLinearWorkerChildLaneRecord;
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'repoRoot'
  >;
  childRunsRoot: string;
  deps: Pick<ProviderLinearChildLaneShellDependencies, 'readChildLaneProof' | 'readDir'>;
  now: string;
}): Promise<ProviderLinearChildLaneLaunchRecoveryCandidate | null> {
  const childTaskCliRoot = join(input.childRunsRoot, input.reservation.task_id, 'cli');
  let entries;
  try {
    entries = await input.deps.readDir(childTaskCliRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
  const candidates: ProviderLinearChildLaneLaunchRecoveryCandidate[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === input.reservation.run_id) {
      continue;
    }
    const runId = (() => {
      try {
        return sanitizeRunId(entry.name);
      } catch {
        return null;
      }
    })();
    if (!runId) {
      continue;
    }
    const candidate = await readRecoveredChildLaneLaunchCandidate({
      reservation: input.reservation,
      context: input.context,
      childRunsRoot: input.childRunsRoot,
      deps: input.deps,
      now: input.now,
      runId
    }).catch(() => null);
    if (candidate) {
      candidates.push(candidate);
    }
  }
  // Fail closed when recovery is ambiguous; parent repair needs one exact child run candidate.
  return candidates.length === 1 ? candidates[0]! : null;
}

async function readRecoveredChildLaneLaunchCandidate(input: {
  reservation: ProviderLinearWorkerChildLaneRecord;
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'repoRoot'
  >;
  childRunsRoot: string;
  deps: Pick<ProviderLinearChildLaneShellDependencies, 'readChildLaneProof'>;
  now: string;
  runId: string;
}): Promise<ProviderLinearChildLaneLaunchRecoveryCandidate | null> {
  const artifactRoot = resolve(input.childRunsRoot, input.reservation.task_id, 'cli', input.runId);
  const manifestPath = join(artifactRoot, 'manifest.json');
  let rawManifest: Record<string, unknown>;
  try {
    rawManifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
  const childRun = parseProviderLinearChildLaneRunManifest({
    manifest: rawManifest,
    repoRoot: input.context.repoRoot,
    artifactRoot,
    manifestPath,
    taskId: input.reservation.task_id,
    runId: input.runId,
    parentRunId: input.context.runId,
    issueId: input.context.issueId,
    issueIdentifier: input.context.issueIdentifier
  });
  if (!childRun) {
    return null;
  }
  const proof = await input.deps.readChildLaneProof(join(artifactRoot, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME)).catch(
    () => null
  );
  if (!proof || !proof.scope || !proof.parent_snapshot) {
    return null;
  }
  const childLane = buildRepairedChildLaneRecord({
    reservation: input.reservation,
    childRun,
    proof,
    now: input.now
  });
  const proofViolation = resolveChildLaneReservationRepairProofViolation({
    reservation: input.reservation,
    childRun,
    candidate: childLane,
    proof,
    context: input.context,
    repoRoot: input.context.repoRoot,
    childRunsRoot: input.childRunsRoot,
    action: childRun.status === 'succeeded' ? 'accept' : 'reject'
  });
  if (proofViolation) {
    return null;
  }
  return {
    childRun,
    childLane,
    proof
  };
}

async function findChildLaneReservationRepairCandidate(input: {
  reservation: ProviderLinearWorkerChildLaneRecord;
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'repoRoot'
  >;
  childRunsRoot: string;
  action: 'accept' | 'reject' | 'invalidate';
  deps: Pick<ProviderLinearChildLaneShellDependencies, 'readChildLaneProof' | 'readDir'>;
  now: string;
}): Promise<ProviderLinearWorkerChildLaneRecord | null> {
  const childTaskCliRoot = join(input.childRunsRoot, input.reservation.task_id, 'cli');
  let entries;
  try {
    entries = await input.deps.readDir(childTaskCliRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
  const candidates: ProviderLinearWorkerChildLaneRecord[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === input.reservation.run_id) {
      continue;
    }
    const runId = (() => {
      try {
        return sanitizeRunId(entry.name);
      } catch {
        return null;
      }
    })();
    if (!runId) {
      continue;
    }
    const candidate = await readChildLaneReservationRepairCandidate({
      reservation: input.reservation,
      context: input.context,
      childRunsRoot: input.childRunsRoot,
      action: input.action,
      deps: input.deps,
      now: input.now,
      runId
    });
    if (candidate) {
      candidates.push(candidate);
    }
  }
  return candidates.length === 1 ? candidates[0]! : null;
}

async function readChildLaneReservationRepairCandidate(input: {
  reservation: ProviderLinearWorkerChildLaneRecord;
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'repoRoot'
  >;
  childRunsRoot: string;
  action: 'accept' | 'reject' | 'invalidate';
  deps: Pick<ProviderLinearChildLaneShellDependencies, 'readChildLaneProof'>;
  now: string;
  runId: string;
}): Promise<ProviderLinearWorkerChildLaneRecord | null> {
  const artifactRoot = resolve(input.childRunsRoot, input.reservation.task_id, 'cli', input.runId);
  const manifestPath = join(artifactRoot, 'manifest.json');
  let rawManifest: Record<string, unknown>;
  try {
    rawManifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
  const childRun = parseProviderLinearChildLaneRunManifest({
    manifest: rawManifest,
    repoRoot: input.context.repoRoot,
    artifactRoot,
    manifestPath,
    taskId: input.reservation.task_id,
    runId: input.runId,
    parentRunId: input.context.runId,
    issueId: input.context.issueId,
    issueIdentifier: input.context.issueIdentifier
  });
  if (!childRun) {
    return null;
  }
  const proof = await input.deps.readChildLaneProof(join(artifactRoot, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME)).catch(() => null);
  if (!proof || !proof.scope || !proof.parent_snapshot) {
    return null;
  }
  const candidate = buildRepairedChildLaneRecord({
    reservation: input.reservation,
    childRun,
    proof,
    now: input.now
  });
  const proofViolation = resolveChildLaneReservationRepairProofViolation({
    reservation: input.reservation,
    childRun,
    candidate,
    proof,
    context: input.context,
    repoRoot: input.context.repoRoot,
    childRunsRoot: input.childRunsRoot,
    action: input.action
  });
  return proofViolation ? null : candidate;
}

function parseProviderLinearChildLaneRunManifest(input: {
  manifest: Record<string, unknown>;
  repoRoot: string;
  artifactRoot: string;
  manifestPath: string;
  taskId: string;
  runId: string;
  parentRunId: string;
  issueId: string;
  issueIdentifier: string;
}): ProviderLinearChildLaneRunResult | null {
  const manifestRunId = normalizeOptionalString(input.manifest.run_id);
  const manifestTaskId = normalizeOptionalString(input.manifest.task_id);
  const manifestPipelineId = normalizeOptionalString(input.manifest.pipeline_id);
  const manifestParentRunId = normalizeOptionalString(input.manifest.parent_run_id);
  const manifestIssueId = normalizeOptionalString(input.manifest.issue_id);
  const manifestIssueIdentifier = normalizeOptionalString(input.manifest.issue_identifier);
  const status = normalizeOptionalString(input.manifest.status);
  if (
    manifestRunId !== input.runId ||
    manifestTaskId !== input.taskId ||
    manifestPipelineId !== PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID ||
    manifestParentRunId !== input.parentRunId ||
    manifestIssueId !== input.issueId ||
    manifestIssueIdentifier !== input.issueIdentifier ||
    !status
  ) {
    return null;
  }
  const recordedArtifactRoot = normalizeOptionalString(input.manifest.artifact_root);
  if (recordedArtifactRoot && resolveRunPath(input.repoRoot, recordedArtifactRoot) !== input.artifactRoot) {
    return null;
  }
  const recordedManifestPath =
    normalizeOptionalString(input.manifest.manifest_path) ?? normalizeOptionalString(input.manifest.manifest);
  if (recordedManifestPath && resolveRunPath(input.repoRoot, recordedManifestPath) !== input.manifestPath) {
    return null;
  }
  const recordedLogPath = normalizeOptionalString(input.manifest.log_path);
  const logPath = recordedLogPath ? resolveRunPath(input.repoRoot, recordedLogPath) : join(input.artifactRoot, 'run.log');
  if (recordedLogPath && !isPathWithinRoot(input.artifactRoot, logPath)) {
    return null;
  }
  return {
    run_id: input.runId,
    task_id: input.taskId,
    pipeline_id: PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID,
    status,
    artifact_root: input.artifactRoot,
    manifest_path: input.manifestPath,
    log_path: logPath,
    summary: stripNonApplicableGuardrailSummaryLines(
      input.manifest,
      normalizeOptionalString(input.manifest.summary)
    ),
    guardrails_required: resolveGuardrailsRequiredForManifest(input.manifest),
    guardrails_required_source: resolveGuardrailsRequiredSourceForManifest(input.manifest),
    guardrail_command_count: countGuardrailCommands(input.manifest),
    runtime_mode_requested: normalizeOptionalString(input.manifest.runtime_mode_requested),
    runtime_mode: normalizeOptionalString(input.manifest.runtime_mode),
    runtime_provider: normalizeOptionalString(input.manifest.runtime_provider)
  };
}

function buildRepairedChildLaneRecord(input: {
  reservation: ProviderLinearWorkerChildLaneRecord;
  childRun: ProviderLinearChildLaneRunResult;
  proof: ProviderLinearChildLaneProof;
  now: string;
}): ProviderLinearWorkerChildLaneRecord {
  const zeroBytePatch = input.childRun.status === 'succeeded' && input.proof.patch_bytes === 0;
  return {
    stream: input.reservation.stream,
    pipeline_id: PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID,
    task_id: input.reservation.task_id,
    run_id: input.childRun.run_id,
    status: input.childRun.status,
    manifest_path: input.childRun.manifest_path,
    artifact_root: input.childRun.artifact_root,
    log_path: input.childRun.log_path,
    summary: input.childRun.summary,
    guardrails_required: input.childRun.guardrails_required,
    guardrails_required_source: input.childRun.guardrails_required_source,
    guardrail_command_count: input.childRun.guardrail_command_count,
    issue_id: input.reservation.issue_id,
    issue_identifier: input.reservation.issue_identifier,
    workspace_path: input.reservation.workspace_path,
    source_setup: input.reservation.source_setup,
    launched_at: input.reservation.launched_at,
    purpose: input.reservation.purpose,
    instructions: input.reservation.instructions,
    scope: input.reservation.scope,
    parent_snapshot: input.reservation.parent_snapshot,
    decision_lineage: input.reservation.decision_lineage ?? null,
    lane_workspace_path: normalizeOptionalString(input.proof.lane_workspace_path),
    patch_artifact_path: normalizeOptionalString(input.proof.patch_artifact_path),
    patch_bytes: Number.isFinite(input.proof.patch_bytes) ? input.proof.patch_bytes : null,
    decision: zeroBytePatch ? 'rejected' : 'pending',
    in_flight_action: null,
    in_flight_started_at: null,
    decision_at: zeroBytePatch ? input.now : null,
    decision_reason: zeroBytePatch ? buildNoOutputAdvisoryChildLaneDecisionReason(input.childRun) : null
  };
}

function resolveChildLaneReservationRecoveryTimingViolation(input: {
  reservation: ProviderLinearWorkerChildLaneRecord;
  proof: ProviderLinearChildLaneProof;
}): string | null {
  const reservationLaunchedAt = normalizeOptionalString(input.reservation.launched_at);
  const proofCompletedAt =
    normalizeOptionalString(input.proof.updated_at) ?? normalizeOptionalString(input.proof.last_event_at);
  if (!reservationLaunchedAt || !proofCompletedAt) {
    return 'Child lane proof timing is missing; cannot repair or recover a launching reservation safely.';
  }
  const reservationLaunchedMs = Date.parse(reservationLaunchedAt);
  const proofCompletedMs = Date.parse(proofCompletedAt);
  if (!Number.isFinite(reservationLaunchedMs) || !Number.isFinite(proofCompletedMs)) {
    return 'Child lane proof timing is invalid; cannot repair or recover a launching reservation safely.';
  }
  if (proofCompletedMs < reservationLaunchedMs) {
    return 'Child lane proof completion predates the pending launching reservation.';
  }
  return null;
}

function resolveChildLaneReservationRepairProofViolation(input: {
  reservation: ProviderLinearWorkerChildLaneRecord;
  childRun: ProviderLinearChildLaneRunResult;
  candidate: ProviderLinearWorkerChildLaneRecord;
  proof: ProviderLinearChildLaneProof;
  context: Pick<Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>, 'runId' | 'repoRoot'>;
  repoRoot: string;
  childRunsRoot: string;
  action: 'accept' | 'reject' | 'invalidate';
}): string | null {
  if (normalizeOptionalString(input.proof.purpose) !== normalizeOptionalString(input.reservation.purpose)) {
    return 'Child lane proof purpose does not match the pending launching reservation.';
  }
  if (normalizeOptionalString(input.proof.instructions) !== normalizeOptionalString(input.reservation.instructions)) {
    return 'Child lane proof instructions do not match the pending launching reservation.';
  }
  if (!areChildLaneScopesEquivalent(input.proof.scope, input.reservation.scope)) {
    return 'Child lane proof scope does not match the pending launching reservation.';
  }
  if (!areChildLaneParentSnapshotsEquivalent(input.proof.parent_snapshot, input.reservation.parent_snapshot)) {
    return 'Child lane proof parent snapshot does not match the pending launching reservation.';
  }
  if (normalizeOptionalString(input.proof.status) !== input.childRun.status) {
    return 'Child lane proof status does not match the child manifest status.';
  }
  const recoveryTimingViolation = resolveChildLaneReservationRecoveryTimingViolation({
    reservation: input.reservation,
    proof: input.proof
  });
  if (recoveryTimingViolation) {
    return recoveryTimingViolation;
  }
  const artifactRoot = resolveAcceptedChildLaneArtifactRoot(
    input.repoRoot,
    input.childRunsRoot,
    input.candidate
  );
  if (!artifactRoot) {
    return 'Child lane artifact root must stay anchored to the expected workspace-local child run directory before reservation repair.';
  }
  const proofParentRunId = resolveExpectedChildLaneProofParentRunId(
    input.context.runId,
    input.candidate
  );
  const proofLineageViolation = resolveChildLaneProofLineageViolation(proofParentRunId, input.candidate, input.proof);
  if (proofLineageViolation) {
    return proofLineageViolation;
  }
  if (input.action !== 'accept') {
    return null;
  }
  const patchArtifactPath = resolveAcceptedPatchArtifactPath(input.repoRoot, input.candidate, artifactRoot);
  if (!patchArtifactPath) {
    return 'Child lane proof patch artifact path must stay within the child lane artifact root before reservation repair.';
  }
  return resolveAcceptedChildLaneProofViolation(
    proofParentRunId,
    input.candidate,
    input.proof,
    input.repoRoot,
    artifactRoot,
    patchArtifactPath
  );
}

function mergeCompletedChildLaneWithParentDecision(
  current: ProviderLinearWorkerChildLaneRecord,
  completed: ProviderLinearWorkerChildLaneRecord
): ProviderLinearWorkerChildLaneRecord {
  if (current.decision === 'pending') {
    return {
      ...completed,
      in_flight_action: current.in_flight_action,
      in_flight_started_at: current.in_flight_started_at
    };
  }
  return {
    ...completed,
    decision: current.decision,
    in_flight_action: null,
    in_flight_started_at: null,
    decision_at: current.decision_at,
    decision_reason: current.decision_reason
  };
}

function replaceChildLaneRecord(
  records: ProviderLinearWorkerChildLaneRecord[],
  target: ProviderLinearWorkerChildLaneRecord,
  replacement: ProviderLinearWorkerChildLaneRecord
): ProviderLinearWorkerChildLaneRecord[] | null {
  let replaced = false;
  const next = records.map((entry) => {
    if (replaced || !matchesChildLaneRecordIdentity(entry, target)) {
      return entry;
    }
    replaced = true;
    return replacement;
  });
  return replaced ? next : null;
}

function matchesChildLaneRecordIdentity(
  left: Pick<ProviderLinearWorkerChildLaneRecord, 'stream' | 'task_id' | 'run_id'>,
  right: Pick<ProviderLinearWorkerChildLaneRecord, 'stream' | 'task_id' | 'run_id'>
): boolean {
  return left.stream === right.stream && left.task_id === right.task_id && left.run_id === right.run_id;
}

function buildChildLaneReservationRepairDecisionReason(
  reservation: ProviderLinearWorkerChildLaneRecord,
  repaired: ProviderLinearWorkerChildLaneRecord
): string {
  return `Reconciled stale launching reservation ${reservation.run_id} to recovered child run ${repaired.run_id} after matching manifest/proof recovery.`;
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

function buildReservedChildLaneRecord(input: {
  stream: string;
  childRunsRoot: string;
  childTaskId: string;
  context: Pick<Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>, 'issueId' | 'issueIdentifier' | 'repoRoot'>;
  purpose: string;
  instructions: string | null;
  scope: ProviderLinearWorkerChildLaneScope;
  sourceSetup: DispatchPilotSourceSetup | null;
  parentSnapshot: ParentIssueSnapshot & { base_sha: string | null; captured_at: string };
  decisionLineage: ProviderLinearDecisionLineage | null;
  now: string;
}): ProviderLinearWorkerChildLaneRecord {
  const reservationRunId = buildChildLaneReservationRunId();
  const artifactRoot = join(input.childRunsRoot, input.childTaskId, 'cli', reservationRunId);
  return {
    stream: input.stream,
    pipeline_id: PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID,
    task_id: input.childTaskId,
    run_id: reservationRunId,
    status: 'launching',
    manifest_path: join(artifactRoot, 'manifest.json'),
    artifact_root: artifactRoot,
    log_path: join(artifactRoot, 'run.log'),
    summary: 'Child lane reserved before child run startup.',
    issue_id: input.context.issueId,
    issue_identifier: input.context.issueIdentifier,
    workspace_path: input.context.repoRoot,
    source_setup: input.sourceSetup,
    launched_at: input.now,
    purpose: input.purpose,
    instructions: normalizeOptionalString(input.instructions),
    scope: input.scope,
    parent_snapshot: input.parentSnapshot,
    decision_lineage: input.decisionLineage,
    lane_workspace_path: null,
    patch_artifact_path: null,
    patch_bytes: null,
    decision: 'pending',
    in_flight_action: null,
    in_flight_started_at: null,
    decision_at: null,
    decision_reason: null
  };
}

function buildChildLaneReservationRunId(): string {
  return `launching-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function findPendingChildLaneConflict(
  records: ProviderLinearWorkerChildLaneRecord[],
  stream: string,
  scope: ProviderLinearWorkerChildLaneScope
): ProviderLinearWorkerChildLaneRecord | null {
  return records.find(
    (entry) =>
      entry.decision === 'pending' &&
      (entry.stream === stream || scopesOverlap(entry.scope, scope))
  ) ?? null;
}

function selectChildLanesCountingTowardParallelFirstCap(
  records: ProviderLinearWorkerChildLaneRecord[],
  now: string
): ProviderLinearWorkerChildLaneRecord[] {
  return records.filter(
    (entry) =>
      !isStaleInFlightChildLane(entry, now) &&
      (entry.decision === 'pending' || entry.in_flight_action !== null)
  );
}

function isStaleInFlightChildLane(
  entry: ProviderLinearWorkerChildLaneRecord,
  now: string
): boolean {
  if (!entry.in_flight_action) {
    return false;
  }
  const startedAt = normalizeOptionalString(entry.in_flight_started_at);
  if (!startedAt) {
    return true;
  }
  const startedMs = Date.parse(startedAt);
  const nowMs = Date.parse(now);
  if (!Number.isFinite(startedMs) || !Number.isFinite(nowMs)) {
    return true;
  }
  return nowMs - startedMs >= PROVIDER_LINEAR_CHILD_LANE_IN_FLIGHT_STALE_MS;
}

function describeChildLaneCapExhaustion(records: ProviderLinearWorkerChildLaneRecord[]): string {
  const sample = records
    .slice(0, PROVIDER_LINEAR_CHILD_LANE_PARALLEL_FIRST_CAP)
    .map((entry) => `${entry.stream}:${entry.run_id}`)
    .join(', ');
  return `Same-issue child-lane cap exhausted: ${records.length}/${PROVIDER_LINEAR_CHILD_LANE_PARALLEL_FIRST_CAP} active, pending, or unaccepted lane(s) already count toward the parallel-first cap (${sample}). Do not launch another lane; record \`stay_serial\` with reason \`existing_child_lane_active\` and include \`cap_exhausted\` in the summary. This cap preserves provider admission constraints instead of bypassing them.`;
}

function describePendingChildLaneConflict(
  stream: string,
  conflict: ProviderLinearWorkerChildLaneRecord
): string {
  return conflict.stream === stream
    ? `Child lane stream ${stream} already has unresolved lane ${conflict.run_id}; accept, reject, or invalidate that lane before relaunching the same stream.`
    : `Child lane scope overlaps unresolved lane ${conflict.stream} (${conflict.run_id}); reject, accept, or invalidate that lane before launching another overlapping lane.`;
}

async function removeReservedChildLane(
  runDir: string,
  reserved: ProviderLinearWorkerChildLaneRecord,
  deps: ProviderLinearChildLaneShellDependencies
): Promise<void> {
  await deps.transactChildLanes(runDir, async (records) => ({
    records: removePendingChildLaneRecord(records, reserved),
    result: undefined
  }));
}

function removePendingChildLaneRecord(
  records: ProviderLinearWorkerChildLaneRecord[],
  target: ProviderLinearWorkerChildLaneRecord
): ProviderLinearWorkerChildLaneRecord[] {
  return records.filter(
    (entry) => !matchesChildLaneRecordIdentity(entry, target) || entry.decision !== 'pending'
  );
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
    const parsed = parseGitDiffHeaderPaths(line);
    if (!parsed) {
      continue;
    }
    for (const candidate of parsed) {
      if (candidate === 'dev/null') {
        continue;
      }
      const normalized = normalizeScopeFileEntry(candidate);
      if (normalized) {
        changedPaths.add(normalized);
      }
    }
  }
  return [...changedPaths];
}

function parseGitDiffHeaderPaths(line: string): string[] | null {
  if (!line.startsWith('diff --git ')) {
    return null;
  }
  const tokens: string[] = [];
  let index = 'diff --git '.length;
  while (index < line.length && tokens.length < 2) {
    while (line[index] === ' ') {
      index += 1;
    }
    if (index >= line.length) {
      break;
    }
    if (line[index] === '"') {
      let end = index + 1;
      let escaped = false;
      while (end < line.length) {
        const current = line[end];
        if (escaped) {
          escaped = false;
        } else if (current === '\\') {
          escaped = true;
        } else if (current === '"') {
          end += 1;
          break;
        }
        end += 1;
      }
      tokens.push(line.slice(index, end));
      index = end;
      continue;
    }
    let end = index;
    while (end < line.length && line[end] !== ' ') {
      end += 1;
    }
    tokens.push(line.slice(index, end));
    index = end;
  }
  if (tokens.length !== 2) {
    return null;
  }
  return tokens
    .map((token) => decodeGitDiffPathToken(token))
    .map((token) => (token.startsWith('a/') || token.startsWith('b/') ? token.slice(2) : token));
}

function decodeGitDiffPathToken(token: string): string {
  if (!(token.startsWith('"') && token.endsWith('"'))) {
    return token;
  }
  const bytes: number[] = [];
  const raw = token.slice(1, -1);
  for (let index = 0; index < raw.length; index += 1) {
    const current = raw[index];
    if (current !== '\\') {
      bytes.push(...Buffer.from(current, 'utf8'));
      continue;
    }
    const next = raw[index + 1];
    if (next === undefined) {
      bytes.push('\\'.charCodeAt(0));
      continue;
    }
    if (/[0-7]{3}/u.test(raw.slice(index + 1, index + 4))) {
      bytes.push(parseInt(raw.slice(index + 1, index + 4), 8));
      index += 3;
      continue;
    }
    switch (next) {
      case '\\':
      case '"':
        bytes.push(next.charCodeAt(0));
        break;
      case 'n':
        bytes.push('\n'.charCodeAt(0));
        break;
      case 'r':
        bytes.push('\r'.charCodeAt(0));
        break;
      case 't':
        bytes.push('\t'.charCodeAt(0));
        break;
      default:
        bytes.push(next.charCodeAt(0));
        break;
    }
    index += 1;
  }
  return Buffer.from(bytes).toString('utf8');
}

function resolveAcceptedPatchScopeViolation(
  scope: ProviderLinearWorkerChildLaneScope,
  patchChangedPaths: string[],
  proofScope: ProviderLinearWorkerChildLaneScope | null = null
): string | null {
  let expectedScope: ProviderLinearWorkerChildLaneScope;
  try {
    expectedScope = resolveProviderLinearChildLaneScopeContract(scope);
  } catch (error) {
    return `Child lane parent ledger recorded an invalid scope contract: ${error instanceof Error ? error.message : String(error)}`;
  }
  const persistedScopeViolation = resolvePersistedScopeContractViolation(
    'Child lane parent ledger',
    scope,
    expectedScope
  );
  if (persistedScopeViolation) {
    return persistedScopeViolation;
  }
  if (proofScope) {
    let expectedProofScope: ProviderLinearWorkerChildLaneScope;
    try {
      expectedProofScope = resolveProviderLinearChildLaneScopeContract(proofScope);
    } catch (error) {
      return `Child lane proof bundle recorded an invalid scope contract: ${error instanceof Error ? error.message : String(error)}`;
    }
    const persistedProofViolation = resolvePersistedScopeContractViolation(
      'Child lane proof bundle',
      proofScope,
      expectedProofScope
    );
    if (persistedProofViolation) {
      return persistedProofViolation;
    }
    if (!areChildLaneScopesEquivalent(expectedScope, expectedProofScope)) {
      return 'Child lane proof scope contract does not match the parent ledger scope contract.';
    }
  }
  if (patchChangedPaths.length === 0) {
    return 'Child lane patch does not declare any repo-relative file targets, so parent acceptance cannot verify the bounded scope.';
  }
  const outOfScopePaths = patchChangedPaths.filter(
    (entry) => !providerLinearChildLanePathMatchesSelectors(entry, expectedScope.allowed_path_selectors ?? [])
  );
  if (outOfScopePaths.length === 0) {
    return null;
  }
  return `Child lane patch touches files outside the declared scope contract (${outOfScopePaths.join(', ')}). Allowed selectors: ${formatProviderLinearChildLanePathSelectors(expectedScope.allowed_path_selectors ?? [])}.`;
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

async function resolveChildLaneParentDecisionLineage(
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    'issueId' | 'runDir'
  >,
  env: NodeJS.ProcessEnv
): Promise<ProviderLinearDecisionLineage | null> {
  const auditPath = resolveProviderLinearAuditPath(env);
  if (!auditPath) {
    return null;
  }
  const recordedAtNotBefore = await resolveCurrentChildLaneDecisionLineageBoundary(context.runDir);
  if (!recordedAtNotBefore) {
    return null;
  }
  try {
    const audit = await summarizeProviderLinearAuditPath(auditPath);
    const snapshot = readProviderLinearParallelizationSnapshot(audit, {
      issueId: context.issueId,
      recordedAtNotBefore
    });
    if (snapshot?.decision !== 'parallelize_now') {
      return null;
    }
    return snapshot.decision_lineage ?? null;
  } catch (error) {
    logger.warn(
      `provider linear child-lane warning: failed to summarize provider-linear audit at ${auditPath}; proceeding without decision lineage. error=${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

async function resolveCurrentChildLaneDecisionLineageBoundary(runDir: string): Promise<string | null> {
  try {
    const proof = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    return (
      normalizeOptionalString(proof.current_turn_started_at) ??
      normalizeOptionalString(proof.attempt_started_at)
    );
  } catch {
    return null;
  }
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
  return resolveProviderLinearChildLaneScopeContract({
    files: normalizedFiles,
    phases: normalizedPhases
  });
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
          return kind === 'file' ? normalizeScopeFileEntry(value, repoRoot) : normalizeScopePhaseEntry(value);
        })
        .filter((value): value is string => value !== null)
    )
  ];
}

function normalizeScopePhaseEntry(value: string): string | null {
  const normalizedInput = normalizeOptionalString(value);
  if (!normalizedInput) {
    return null;
  }
  const normalized = normalizedInput.toLowerCase();
  return normalized.length > 0 ? normalized : null;
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
    return `Parent workspace has pending changes (${sample}); phase-scoped child lanes launch from HEAD and therefore require a clean parent workspace baseline. Move workpad/temp scratch files such as .tmp/workpad.md outside the repo (for example /tmp), remove stale scratch artifacts, or narrow to a file-scoped lane after the parent-owned edits are clean.`;
  }
  const overlapping = scope.files.filter((entry) => dirtyPaths.includes(entry));
  if (overlapping.length === 0) {
    return null;
  }
  return `Parent workspace already has in-scope pending changes (${overlapping.join(', ')}); child lanes launch from HEAD and would miss those parent edits. Clean, commit, move scratch workpad/temp artifacts outside the repo (for example /tmp), or narrow the lane scope before launching it.`;
}

function isIgnoredParentArtifactPath(path: string): boolean {
  return path === '.child-lanes' || path.startsWith('.child-lanes/') || path === '.tmp/workpad.md';
}

function formatChildLaneScopeLaunchFailureMessage(message: string): string {
  const supportedPhases = resolveProviderLinearChildLaneSupportedPhases().join(', ');
  return `${message} Supported child-lane phases are: ${supportedPhases}. Do not use unsupported classification or analysis phases; use parent-owned source inspection, a supported file-scoped docs/tests lane, or a serial/no-go parallelization decision when no supported bounded slice exists.`;
}

function buildNoOutputAdvisoryChildLaneDecisionReason(childRun: ProviderLinearChildLaneRunResult): string {
  const summary = normalizeOptionalString(childRun.summary);
  return summary
    ? `No-output advisory: child lane produced a zero-byte patch. Use the child manifest/proof and summary "${summary}" as advisory evidence only; parent owns any implementation patch and final evidence path.`
    : 'No-output advisory: child lane produced a zero-byte patch. Use the child manifest/proof as advisory evidence only; parent owns any implementation patch and final evidence path.';
}

function scopesOverlap(
  left: ProviderLinearWorkerChildLaneScope,
  right: ProviderLinearWorkerChildLaneScope
): boolean {
  try {
    const resolvedLeft = resolveProviderLinearChildLaneScopeContract(left);
    const resolvedRight = resolveProviderLinearChildLaneScopeContract(right);
    return providerLinearChildLanePathSelectorsOverlap(
      resolvedLeft.allowed_path_selectors ?? [],
      resolvedRight.allowed_path_selectors ?? []
    );
  } catch {
    return (
      left.files.some((entry) => right.files.includes(entry)) ||
      left.phases.length > 0 ||
      right.phases.length > 0
    );
  }
}

function compareStringSets(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function areChildLaneScopesEquivalent(
  left: ProviderLinearWorkerChildLaneScope,
  right: ProviderLinearWorkerChildLaneScope
): boolean {
  return (
    compareStringSets(left.files, right.files) &&
    compareStringSets(left.phases, right.phases) &&
    normalizeOptionalString(left.phase_contract_version) === normalizeOptionalString(right.phase_contract_version) &&
    providerLinearChildLanePathSelectorsEqual(
      left.allowed_path_selectors ?? [],
      right.allowed_path_selectors ?? []
    )
  );
}

function areChildLaneParentSnapshotsEquivalent(
  left: ProviderLinearWorkerChildLaneRecord['parent_snapshot'],
  right: ProviderLinearWorkerChildLaneRecord['parent_snapshot']
): boolean {
  return (
    normalizeOptionalString(left.base_sha) === normalizeOptionalString(right.base_sha) &&
    normalizeOptionalString(left.issue_updated_at) === normalizeOptionalString(right.issue_updated_at) &&
    normalizeOptionalString(left.issue_state) === normalizeOptionalString(right.issue_state) &&
    normalizeOptionalString(left.issue_state_type) === normalizeOptionalString(right.issue_state_type)
  );
}

function resolvePersistedScopeContractViolation(
  sourceLabel: string,
  persistedScope: ProviderLinearWorkerChildLaneScope,
  expectedScope: ProviderLinearWorkerChildLaneScope
): string | null {
  const persistedVersion = normalizeOptionalString(persistedScope.phase_contract_version);
  const persistedSelectors = persistedScope.allowed_path_selectors ?? null;
  if (persistedScope.phases.length > 0 && (!persistedVersion || !persistedSelectors || persistedSelectors.length === 0)) {
    return `${sourceLabel} is missing persisted phase-scope contract metadata for phases (${expectedScope.phases.join(', ')}).`;
  }
  if (persistedVersion && persistedVersion !== expectedScope.phase_contract_version) {
    return `${sourceLabel} recorded scope contract version ${persistedVersion} but expected ${expectedScope.phase_contract_version}.`;
  }
  if (
    persistedSelectors &&
    !providerLinearChildLanePathSelectorsEqual(
      persistedSelectors,
      expectedScope.allowed_path_selectors ?? []
    )
  ) {
    return `${sourceLabel} recorded path selectors (${formatProviderLinearChildLanePathSelectors(persistedSelectors)}) that do not match the expected selectors (${formatProviderLinearChildLanePathSelectors(expectedScope.allowed_path_selectors ?? [])}).`;
  }
  return null;
}

function resolveChildLaneProofLineageViolation(
  parentRunId: string,
  childLane: ProviderLinearWorkerChildLaneRecord,
  proof: ProviderLinearChildLaneProof
): string | null {
  if (
    proof.task_id !== childLane.task_id ||
    proof.run_id !== childLane.run_id ||
    proof.parent_run_id !== parentRunId ||
    proof.stream !== childLane.stream ||
    proof.issue_id !== childLane.issue_id ||
    proof.issue_identifier !== childLane.issue_identifier
  ) {
    return 'Child lane proof lineage does not match the parent ledger record.';
  }
  return null;
}

function resolveExpectedChildLaneProofParentRunId(
  currentParentRunId: string,
  childLane: ProviderLinearWorkerChildLaneRecord
): string {
  return normalizeOptionalString(childLane.decision_lineage?.parent_run_id) ?? currentParentRunId;
}

function resolveAcceptedChildLaneProofViolation(
  parentRunId: string,
  childLane: ProviderLinearWorkerChildLaneRecord,
  proof: ProviderLinearChildLaneProof,
  repoRoot: string,
  artifactRoot: string,
  patchArtifactPath: string
): string | null {
  const lineageViolation = resolveChildLaneProofLineageViolation(parentRunId, childLane, proof);
  if (lineageViolation) {
    return lineageViolation;
  }
  const proofPatchArtifactPath = resolveAcceptedPatchArtifactPath(
    repoRoot,
    {
      ...childLane,
      patch_artifact_path: proof.patch_artifact_path
    },
    artifactRoot
  );
  if (!proofPatchArtifactPath || proofPatchArtifactPath !== patchArtifactPath) {
    return 'Child lane proof patch artifact path does not match the parent-anchored patch artifact path.';
  }
  return null;
}

function isProofScopeViolation(message: string): boolean {
  return (
    message.startsWith('Child lane proof bundle') ||
    message.startsWith('Child lane proof scope contract')
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
  sanitized.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH =
    normalizeOptionalString(sanitized.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH) ?? join(input.repoRoot, 'codex.orchestrator.json');
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
  sanitized[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT_ENV] = input.parentSnapshot.captured_at ?? '';
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
  envOverrides?: NodeJS.ProcessEnv;
} {
  const invocation = resolveCodexOrchestratorBootstrapInvocation({ env, execPath: process.execPath });
  return { command: invocation.command, argsPrefix: invocation.args, envOverrides: invocation.envOverrides };
}

async function parseProviderChildLaneRunResult(
  raw: string,
  repoRoot: string,
  childRunsRoot: string,
  taskId: string
): Promise<ProviderLinearChildLaneRunResult | null> {
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
  let manifestRecord: Record<string, unknown> | null = null;
  try {
    const candidate = JSON.parse(await readFile(resolvedManifestPath, 'utf8')) as unknown;
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      manifestRecord = candidate as Record<string, unknown>;
    }
  } catch {
    manifestRecord = null;
  }
  const rawSummary = normalizeOptionalString(parsed.summary);
  const summary = manifestRecord
    ? stripNonApplicableGuardrailSummaryLines(manifestRecord, rawSummary)
    : rawSummary;
  return {
    run_id: safeRunId,
    task_id: taskId,
    pipeline_id: PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID,
    status,
    artifact_root: resolvedArtifactRoot,
    manifest_path: resolvedManifestPath,
    log_path: normalizedLogPath,
    summary,
    guardrails_required: manifestRecord ? resolveGuardrailsRequiredForManifest(manifestRecord) : null,
    guardrails_required_source: manifestRecord ? resolveGuardrailsRequiredSourceForManifest(manifestRecord) : null,
    guardrail_command_count: manifestRecord ? countGuardrailCommands(manifestRecord) : null,
    runtime_mode_requested: normalizeOptionalString(parsed.runtime_mode_requested),
    runtime_mode: normalizeOptionalString(parsed.runtime_mode),
    runtime_provider: normalizeOptionalString(parsed.runtime_provider)
  };
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
  if (isPathWithinRoot(repoRoot, candidate)) {
    return candidate;
  }
  if (basename(dirname(repoRoot)) !== '.workspaces') {
    return fallback;
  }
  const sharedRoot = dirname(dirname(repoRoot));
  if (isPathWithinRoot(sharedRoot, candidate)) {
    return resolve(repoRoot, relative(sharedRoot, candidate));
  }
  return fallback;
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

function formatProviderWorkerChildLaneProvenanceInvalidMessage(
  context: Pick<
    Awaited<ReturnType<typeof loadProviderLinearWorkerContext>>,
    | 'manifest'
    | 'manifestPath'
    | 'providerControlHostRecordedInManifest'
    | 'providerControlHostMatchesManifest'
  >,
  env: NodeJS.ProcessEnv
): string {
  const manifestLaunchSource =
    normalizeOptionalString(context.manifest.provider_launch_source) ??
    normalizeOptionalString(context.manifest.providerLaunchSource);
  const manifestTaskId =
    normalizeOptionalString(context.manifest.provider_control_host_task_id) ??
    normalizeOptionalString(context.manifest.providerControlHostTaskId);
  const manifestRunId =
    normalizeOptionalString(context.manifest.provider_control_host_run_id) ??
    normalizeOptionalString(context.manifest.providerControlHostRunId);
  const envLaunchSource = normalizeOptionalString(env[PROVIDER_LAUNCH_SOURCE_ENV]);
  const envTaskId = normalizeOptionalString(env[PROVIDER_CONTROL_HOST_TASK_ID_ENV]);
  const envRunId = normalizeOptionalString(env[PROVIDER_CONTROL_HOST_RUN_ID_ENV]);
  return [
    'linear child-lane requires provider control-host provenance recorded on the parent provider-worker manifest and matching active environment.',
    'Required manifest fields: provider_launch_source=control-host, provider_control_host_task_id, provider_control_host_run_id.',
    `Parent manifest: ${context.manifestPath}.`,
    `Manifest values: provider_launch_source=${manifestLaunchSource ?? 'missing'}, provider_control_host_task_id=${manifestTaskId ?? 'missing'}, provider_control_host_run_id=${manifestRunId ?? 'missing'}.`,
    `Active env values: ${PROVIDER_LAUNCH_SOURCE_ENV}=${envLaunchSource ?? 'missing'}, ${PROVIDER_CONTROL_HOST_TASK_ID_ENV}=${envTaskId ?? 'missing'}, ${PROVIDER_CONTROL_HOST_RUN_ID_ENV}=${envRunId ?? 'missing'}.`,
    `recorded=${String(context.providerControlHostRecordedInManifest)} matches=${String(context.providerControlHostMatchesManifest)}.`
  ].join(' ');
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
