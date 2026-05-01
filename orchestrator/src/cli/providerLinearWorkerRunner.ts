import { spawn, type StdioOptions } from 'node:child_process';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { mkdir, open, readFile, readdir, realpath, rm, stat } from 'node:fs/promises';

import { logger } from '../logger.js';
import {
  computeEffectiveDelegationConfig,
  loadDelegationConfigFiles,
  parseDelegationConfigOverride,
  splitDelegationConfigOverrides,
  type DelegationConfigLayer
} from './config/delegationConfig.js';
import {
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV,
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
  readProviderControlHostLocatorFromEnv,
  readProviderControlHostLocatorFromManifest
} from '../../../scripts/lib/provider-run-contract.js';
import { resolveEnvironmentPathsForProcess } from '../../../scripts/lib/run-manifests.js';
import {
  hasLinearSourceBinding,
  resolveLinearSourceSetup,
  resolveLiveLinearTrackedIssueById,
  type LiveLinearTrackedIssue,
  type LiveLinearTrackedIssueResolution
} from './control/linearDispatchSource.js';
import { readSharedLinearBudgetStatus, type LinearBudgetStatus } from './control/linearBudgetState.js';
import {
  classifyProviderLinearWorkerLifecycle,
} from './control/providerLinearWorkflowStates.js';
import {
  readControlHostOwnerMetadata,
  readControlHostOwnershipDiagnosticSummary,
  readControlHostOwnershipOperatorHint,
  type ControlHostOwnershipPollingPayload
} from './control/controlHostOwnership.js';
import {
  PROVIDER_LINEAR_AUDIT_ENV_VAR,
  PROVIDER_LINEAR_PARALLELIZATION_REASONS,
  isProviderLinearParallelizationDecision,
  isProviderLinearParallelizationReason,
  isProviderLinearParallelizationReasonAllowed,
  readProviderLinearParallelizationSnapshot,
  readProviderLinearParallelizationSnapshots,
  summarizeProviderLinearAuditPath,
  type ProviderLinearDecisionLineage,
  type ProviderLinearParallelizationSnapshot,
  type ProviderLinearAuditSummary
} from './control/providerLinearWorkflowAudit.js';
import { deriveDeterministicProviderMutationSuppressions } from './control/providerLinearWorkerTruth.js';
import {
  deriveProviderLinearWorkerProgressSnapshot,
  isHighSignalProviderProgressSummary,
  type ProviderLinearWorkerProgressSnapshot
} from './control/providerIssueObservability.js';
import type { DispatchPilotSourceSetup } from './control/trackerDispatchPilot.js';
import {
  PROVIDER_WORKSPACE_ROOT_DIRNAME,
  resolveProviderWorkspacePath
} from './run/workspacePath.js';
import {
  countGuardrailCommands,
  resolveGuardrailsRequiredForManifest,
  resolveGuardrailsRequiredSourceForManifest,
  stripNonApplicableGuardrailSummaryLines
} from './run/manifest.js';
import {
  buildRunMemoryPromptLines,
  selectRunMemoryForRole
} from './run/runMemoryController.js';
import { writeJsonAtomic } from './utils/fs.js';
import { fingerprintAuthProvenanceValue } from './utils/authProvenanceFingerprint.js';
import {
  refreshSourceRootFreshnessInspection,
  type SourceRootFreshnessInspection
} from './utils/sourceRootFreshness.js';
import {
  createRuntimeCodexCommandContext,
  formatRuntimeSelectionSummary,
  parseRuntimeMode,
  resolveRuntimeCodexCommand,
  type RuntimeCodexCommandContext,
  type RuntimeSelection
} from './runtime/index.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';
import { sanitizeTaskId } from '../persistence/sanitizeTaskId.js';
import { acquireLockWithRetry, type LockRetryOptions } from '../persistence/lockFile.js';
import { resolveCodexHome } from './utils/codexPaths.js';
import {
  CONFIG_AUTHORITY_MODE_ENV_KEY,
  REPO_CONFIG_REQUIRED_ENV_KEY
} from './config/repoConfigPolicy.js';
import { REPO_CONFIG_PATH_ENV_KEY } from './config/userConfig.js';
import {
  normalizeProviderLinearChildLanePathSelectors,
  resolveProviderLinearChildLaneSupportedPhases,
  type ProviderLinearChildLanePathSelector
} from './providerLinearChildLanePhaseContract.js';
import {
  PROVIDER_PACKAGE_ROOT_ENV_KEY,
  PROVIDER_REPO_CONFIG_PATH_ENV_KEY
} from './utils/providerOverrideEnv.js';
import {
  PROVIDER_WORKER_HOST_ENV_KEY,
  normalizeProviderWorkerHostName
} from './control/providerWorkerHosts.js';
import { resolveCodexOrchestratorBootstrapInvocation } from './utils/packageProgramResolver.js';

export const PROVIDER_LINEAR_WORKER_PROOF_FILENAME = 'provider-linear-worker-proof.json';
export const PROVIDER_LINEAR_WORKER_AUDIT_FILENAME = 'provider-linear-worker-linear-audit.jsonl';
export const PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME = 'provider-linear-worker-child-streams.json';
export const PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME = 'provider-linear-worker-child-lanes.json';
export const PROVIDER_LINEAR_RESIDENT_SESSION_SEED_ENV =
  'CODEX_ORCHESTRATOR_PROVIDER_RESIDENT_SESSION_SEED';
export const PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID = 'provider-linear-child-lane';
export const PROVIDER_LINEAR_CHILD_LANE_RESERVED_SUMMARY = 'Child lane reserved before child run startup.';
export const PROVIDER_LINEAR_CHILD_LANE_DIAGNOSTICS_FILENAME = 'provider-linear-child-lane-diagnostics.json';
const PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME = 'provider-linear-child-lane-proof.json';
const PROVIDER_LINEAR_WORKER_SESSION_LOG_HYDRATION_FILENAME =
  'provider-linear-worker-session-log-hydration.json';
const PROVIDER_LINEAR_WORKER_PROOF_LOCK_FILENAME = `${PROVIDER_LINEAR_WORKER_PROOF_FILENAME}.lock`;
const PROVIDER_LINEAR_WORKER_CHILD_STREAMS_LOCK_FILENAME = `${PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME}.lock`;
const PROVIDER_LINEAR_WORKER_CHILD_LANES_LOCK_FILENAME = `${PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME}.lock`;
const PROVIDER_WORKER_DEFAULT_MAX_TURNS = 20;
const PROVIDER_CONTROL_HOST_REFRESH_PATH = '/api/v1/refresh';
const PROVIDER_CONTROL_HOST_REFRESH_TIMEOUT_MS = 15_000;
const PROVIDER_CONTROL_HOST_REFRESH_RETRY_DELAY_MS = 250;
const PROVIDER_CONTROL_HOST_REFRESH_FAILURE_FILENAME =
  'provider-control-host-refresh-failure.json';
const PROVIDER_LINEAR_TRACKED_ISSUE_RATE_LIMIT_MAX_WAIT_MS = 15_000;
const PROVIDER_LINEAR_TRACKED_ISSUE_RATE_LIMIT_BUCKETS = [
  {
    remaining: 'requests_remaining',
    resetAt: 'requests_reset_at'
  },
  {
    remaining: 'endpoint_requests_remaining',
    resetAt: 'endpoint_requests_reset_at'
  },
  {
    remaining: 'complexity_remaining',
    resetAt: 'complexity_reset_at'
  },
  {
    remaining: 'endpoint_complexity_remaining',
    resetAt: 'endpoint_complexity_reset_at'
  }
] as const;
const CSRF_HEADER = 'x-csrf-token';
const CONFIG_OVERRIDE_ENV_KEYS = ['CODEX_CONFIG_OVERRIDES', 'CODEX_MCP_CONFIG_OVERRIDES'];
const PROVIDER_LINEAR_WORKER_CHILD_STREAMS_LOCK_RETRY: LockRetryOptions = {
  maxAttempts: 50,
  initialDelayMs: 10,
  backoffFactor: 1.5,
  // Fail closed for child-stream lineage writes: a stale lock is preferable to
  // lossy concurrent ledger rewrites.
  maxDelayMs: 250
};
const PROVIDER_LINEAR_WORKER_PROOF_LOCK_RETRY: LockRetryOptions = {
  maxAttempts: 50,
  initialDelayMs: 10,
  backoffFactor: 1.5,
  // The proof sidecar is shared by the parent worker and child refresh paths;
  // prefer a short wait over allowing stale snapshots to overwrite newer state.
  maxDelayMs: 250,
  staleMs: 5 * 60 * 1000
};
export const PROVIDER_LINEAR_RESIDENT_SESSION_CONTINUITY_END_REASONS = new Set<string>([
  'max_turns_reached_issue_still_active'
]);
const PROVIDER_CONTROL_HOST_REFRESH_SUCCESS_END_REASONS =
  PROVIDER_LINEAR_RESIDENT_SESSION_CONTINUITY_END_REASONS;
export const PROVIDER_SEMANTIC_STALL_RECHECK_DELAY_MS = 15 * 60 * 1000 + 1_000;
const PROVIDER_WORKER_SESSION_LOG_POLL_INTERVAL_MS = 250;
const PROVIDER_WORKER_SESSION_LOG_DISCOVERY_WINDOW_MS = 15 * 60 * 1000;
const PROVIDER_WORKER_SESSION_LOG_HEADER_BYTES = 256 * 1024;
const PROVIDER_LINEAR_CHILD_LANE_POST_STARTUP_NO_OUTPUT_MIN_STALE_MS = 60 * 1000;
const PROVIDER_LINEAR_CHILD_LANE_RUNNER_IDENTITY_START_BEFORE_TOLERANCE_MS = 5 * 60 * 1000;
const PROVIDER_LINEAR_CHILD_LANE_RUNNER_PROCESS_LOOKUP_TIMEOUT_MS = 2000;

export interface ProviderLinearWorkerContext {
  manifest: Record<string, unknown>;
  manifestPath: string;
  controlHostManifest: Record<string, unknown>;
  controlHostManifestPath: string;
  runDir: string;
  repoRoot: string;
  runId: string;
  taskId: string;
  pipelineId: string | null;
  providerControlHostTaskId: string | null;
  providerControlHostRunId: string | null;
  providerControlHostRecordedInManifest: boolean;
  providerControlHostMatchesManifest: boolean;
  workspacePath: string | null;
  workerHost: string | null;
  sourceSetup: DispatchPilotSourceSetup | null;
  issueId: string;
  issueIdentifier: string;
  issueUpdatedAt: string | null;
  maxTurns: number;
  residentSessionSeed: ProviderLinearResidentSessionSeed | null;
}

export interface ProviderLinearWorkerTokenUsage {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  reasoning_output_tokens?: number | null;
}

export interface ProviderLinearResidentSessionSeed {
  source_run_id: string;
  source_updated_at: string;
  source_end_reason: string;
  source_thread_id: string;
  logical_turn_count: number;
  restart_count: number;
}

export interface ProviderLinearResidentSessionState {
  logical_session_id: string;
  logical_turn_count: number;
  restart_count: number;
  continuity_state: 'fresh' | 'guarded_resume_pending' | 'guarded_resume_active';
  source_run_id: string | null;
  source_updated_at: string | null;
  source_end_reason: string | null;
  source_thread_id: string | null;
}

export interface ProviderLinearWorkerChildStreamRecord {
  stream: string;
  pipeline_id: string;
  task_id: string;
  run_id: string;
  status: string;
  manifest_path: string;
  artifact_root: string;
  log_path: string | null;
  summary: string | null;
  issue_id: string;
  issue_identifier: string;
  workspace_path: string | null;
  source_setup: DispatchPilotSourceSetup | null;
  launched_at: string;
  recorded_at?: string | null;
}

export interface ProviderLinearWorkerChildLaneScope {
  files: string[];
  phases: string[];
  phase_contract_version?: string | null;
  allowed_path_selectors?: ProviderLinearChildLanePathSelector[] | null;
}

export interface ProviderLinearWorkerChildLaneParentSnapshot {
  base_sha: string | null;
  issue_updated_at: string | null;
  issue_state: string | null;
  issue_state_type: string | null;
  captured_at: string;
}

export type ProviderLinearWorkerChildLaneDecision =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'invalidated';

export type ProviderLinearWorkerChildLaneInFlightAction =
  | 'accept'
  | 'reject'
  | 'invalidate';

export type ProviderLinearWorkerChildLaneRunnerIdentityStatus =
  | 'not_recorded'
  | 'not_live'
  | 'matched'
  | 'ambiguous'
  | 'pid_reuse_suspected';

export interface ProviderLinearWorkerChildLaneRecord {
  stream: string;
  pipeline_id: string;
  task_id: string;
  run_id: string;
  status: string;
  manifest_path: string;
  artifact_root: string;
  log_path: string | null;
  summary: string | null;
  guardrails_required?: boolean | null;
  guardrails_required_source?: string | null;
  guardrail_command_count?: number | null;
  runtime_mode?: string | null;
  runtime_provider?: string | null;
  heartbeat_at?: string | null;
  heartbeat_stale_after_seconds?: number | null;
  runner_pid?: number | null;
  runner_started_at?: string | null;
  runner_alive?: boolean | null;
  runner_identity_status?: ProviderLinearWorkerChildLaneRunnerIdentityStatus | null;
  runner_identity_reason?: string | null;
  runner_observed_started_at?: string | null;
  runner_command_line_matches?: boolean | null;
  runtime_event?: string | null;
  runtime_event_at?: string | null;
  appserver_startup_observed?: boolean | null;
  appserver_startup_observed_at?: string | null;
  stale_invalidation_candidate?: boolean | null;
  stale_invalidation_reason?: string | null;
  issue_id: string;
  issue_identifier: string;
  workspace_path: string | null;
  source_setup: DispatchPilotSourceSetup | null;
  launched_at: string;
  summary_recorded_at?: string | null;
  purpose: string;
  instructions: string | null;
  scope: ProviderLinearWorkerChildLaneScope;
  parent_snapshot: ProviderLinearWorkerChildLaneParentSnapshot;
  decision_lineage?: ProviderLinearDecisionLineage | null;
  lane_workspace_path: string | null;
  patch_artifact_path: string | null;
  patch_bytes: number | null;
  decision: ProviderLinearWorkerChildLaneDecision;
  in_flight_action?: ProviderLinearWorkerChildLaneInFlightAction | null;
  in_flight_started_at?: string | null;
  decision_at: string | null;
  decision_reason: string | null;
}

export type ProviderLinearWorkerDiagnosticCategory =
  | 'env_config'
  | 'auth_mismatch'
  | 'cloud_connector_auth_drift'
  | 'quota_rate_limit'
  | 'cloud_denial'
  | 'guardian_timeout'
  | 'guardian_policy_denial'
  | 'provider_stdin_bootstrap'
  | 'provider_runtime'
  | 'unknown';

export interface ProviderLinearWorkerAuthProvenance {
  provider_kind: string | null;
  runtime_mode: string | null;
  runtime_provider: string | null;
  active_profile_fingerprint: string | null;
  active_account_fingerprint: string | null;
  cloud_env_id: string | null;
  cloud_branch: string | null;
  credential_source: string | null;
  auth_freshness: string | null;
  observed_at: string | null;
  source: string | null;
}

export type ProviderLinearWorkerControlAuthority =
  | 'appserver'
  | 'legacy_cli_break_glass';

export interface ProviderLinearWorkerControlPlane {
  authority: ProviderLinearWorkerControlAuthority;
  transport: 'app-server-jsonl' | 'codex-exec-jsonl';
  requested_runtime_mode: string | null;
  selected_runtime_mode: string | null;
  runtime_provider: string | null;
  runtime_session_id: string | null;
  fallback_occurred: boolean;
  fallback_code: string | null;
  fallback_reason: string | null;
  normal_start_method: 'thread/start + turn/start' | 'codex exec';
  resume_method: 'thread/resume + turn/start' | 'codex exec resume';
  drain_method: 'turn/completed notification' | 'process exit';
  restart_method: 'thread/resume from recorded thread_id' | 'codex exec resume from recorded thread_id';
  state_read_model: 'provider-linear-worker-proof';
  break_glass: boolean;
  break_glass_reason: string | null;
  observed_at: string | null;
}

export interface ProviderLinearWorkerFailureDiagnosis {
  diagnostic_category: ProviderLinearWorkerDiagnosticCategory;
  signal: string;
  guidance: string;
  source: string;
  observed_at: string | null;
}

export interface ProviderLinearWorkerRuntimeProof {
  requested_mode: string | null;
  selected_mode: string | null;
  provider: string | null;
  runtime_session_id: string | null;
  fallback: RuntimeSelection['fallback'] | null;
}

export interface ProviderLinearWorkerAppServerSupervisionProof {
  selected_runtime: ProviderLinearWorkerRuntimeProof;
  supervision_command:
    | 'appserver_thread_start'
    | 'appserver_thread_resume'
    | 'codex_exec'
    | 'codex_exec_resume';
  appserver_session_id: string | null;
  thread_id: string | null;
  latest_turn_id: string | null;
  latest_session_id: string | null;
  session_log_thread_id: string | null;
  session_log_turn_id: string | null;
  session_log_session_id: string | null;
  sticky_environment_id: string | null;
  sticky_environment_status: 'proven' | 'blocked' | 'not_applicable';
  sticky_environment_blocker: string | null;
  turn_persistence_status: 'proven' | 'blocked' | 'not_applicable';
  turn_persistence_source: 'session_log_hydration' | null;
  turn_persistence_blocker: string | null;
  pagination_status: 'blocked' | 'not_applicable';
  pagination_blocker: string | null;
  resume_status: 'proven' | 'blocked' | 'not_requested' | 'not_applicable';
  resume_source_thread_id: string | null;
  resume_observed_thread_id: string | null;
  resume_blocker: string | null;
  fork_status: 'blocked' | 'not_requested' | 'not_applicable';
  fork_blocker: string | null;
  jsonl_truth_retained: boolean;
  session_log_truth_retained: boolean;
  updated_at: string | null;
}

export interface ProviderLinearWorkerProof {
  issue_id: string;
  issue_identifier: string;
  attempt_started_at?: string | null;
  current_turn_started_at?: string | null;
  pid: string | null;
  thread_id: string | null;
  latest_turn_id: string | null;
  latest_session_id: string | null;
  latest_session_id_source: 'derived_from_thread_and_turn' | null;
  session_log_thread_id?: string | null;
  session_log_turn_id?: string | null;
  session_log_session_id?: string | null;
  resume_source_thread_id?: string | null;
  turn_count: number;
  last_event: string | null;
  last_message: string | null;
  last_message_source?: ProviderLinearWorkerJsonlParseResult['finalMessageSource'];
  last_message_delta_key?: string | null;
  last_event_at: string | null;
  current_turn_activity?: ProviderLinearWorkerCurrentTurnActivity | null;
  tokens: ProviderLinearWorkerTokenUsage;
  rate_limits: Record<string, unknown> | null;
  runtime?: ProviderLinearWorkerRuntimeProof | null;
  appserver_supervision?: ProviderLinearWorkerAppServerSupervisionProof | null;
  auth_provenance?: ProviderLinearWorkerAuthProvenance | null;
  worker_control?: ProviderLinearWorkerControlPlane | null;
  source_root_freshness?: SourceRootFreshnessInspection | null;
  failure_diagnosis?: ProviderLinearWorkerFailureDiagnosis | null;
  owner_phase: string;
  owner_status: 'in_progress' | 'succeeded' | 'failed';
  workspace_path: string | null;
  worker_host?: string | null;
  source_setup?: DispatchPilotSourceSetup | null;
  linear_audit: ProviderLinearAuditSummary | null;
  child_streams?: ProviderLinearWorkerChildStreamRecord[];
  child_lanes?: ProviderLinearWorkerChildLaneRecord[];
  parallelization?: ProviderLinearWorkerParallelizationRecord | null;
  progress?: ProviderLinearWorkerProgressSnapshot | null;
  linear_budget?: LinearBudgetStatus | null;
  tracked_issue_error?: ProviderLinearTrackedIssueError | null;
  resident_session?: ProviderLinearResidentSessionState | null;
  end_reason: string | null;
  updated_at: string;
}

export type ProviderLinearWorkerCurrentTurnActivitySource =
  | 'stdout_jsonl'
  | 'session_log_hydration'
  | 'stderr'
  | 'appserver_runner'
  | 'exec_runner';

export interface ProviderLinearWorkerCurrentTurnActivity {
  event: string | null;
  message_or_payload: string | null;
  recorded_at: string | null;
  source: ProviderLinearWorkerCurrentTurnActivitySource;
  turn_id: string | null;
  session_id: string | null;
}

export interface ProviderLinearWorkerParallelizationRecord
  extends ProviderLinearParallelizationSnapshot {
  child_lane_count: number;
  recovered_child_lanes?: ProviderLinearWorkerRecoveredChildLaneRecord[];
}

export interface ProviderLinearWorkerRecoveredChildLaneRecord {
  stream: string;
  task_id: string;
  run_id: string;
  recovery_source: 'decision_lineage' | 'legacy_timestamp_fallback';
  child_decision_lineage: ProviderLinearDecisionLineage | null;
  parallelization_decision_lineage: ProviderLinearDecisionLineage | null;
}

export interface ProviderLinearTrackedIssueError {
  code: string;
  reason: string;
  message: string;
  status: number;
  retryable: boolean;
  details?: Record<string, unknown>;
}

interface ProviderControlHostRefreshFailureDiagnostic {
  schema_version: 1;
  reason: 'provider_control_host_refresh_failed';
  failure_kind: 'refresh_request_timeout' | 'fetch_failed' | 'request_failed';
  message: string;
  issue_id: string;
  issue_identifier: string;
  owner_status: ProviderLinearWorkerProof['owner_status'];
  end_reason: string | null;
  observed_at: string;
  control_host_run_dir: string;
  control_host_ownership: ControlHostOwnershipPollingPayload | null;
  retry: {
    attempts: number;
    retried_after_stale_owner_reclaim: boolean;
    recovered: false;
  };
}

export interface ProviderLinearWorkerJsonlParseResult {
  threadId: string | null;
  turnId: string | null;
  finalMessage: string | null;
  finalMessageSource?: 'agent_message_delta' | 'other' | null;
  finalMessageDeltaKey?: string | null;
  agentMessageDeltaBuffers?: Record<string, string>;
  agentMessageDeltaSourceBuffers?: Record<
    string,
    Partial<Record<ProviderLinearWorkerCurrentTurnActivitySource, string>>
  >;
  agentMessageDeltaHydrationSeed?: ProviderWorkerAgentMessageDeltaHydrationSeed | null;
  lastEvent: string | null;
  lastEventAt: string | null;
  currentTurnActivity: ProviderLinearWorkerCurrentTurnActivity | null;
  tokens: ProviderLinearWorkerTokenUsage;
  rateLimits: Record<string, unknown> | null;
  authProvenance: ProviderLinearWorkerAuthProvenance | null;
  failureDiagnosis: ProviderLinearWorkerFailureDiagnosis | null;
}

interface ProviderWorkerAgentMessageDeltaHydrationSeed {
  message: string;
  deltaKey: string;
  threadId: string | null;
  turnId: string | null;
}

export interface ProviderLinearWorkerExecRequest {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  mirrorOutput: boolean;
  onStdoutChunk?: ((chunk: string) => void) | null;
  abortSignal?: AbortSignal | null;
}

export interface ProviderLinearWorkerExecResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface ProviderLinearWorkerAppServerTurnRequest {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  prompt: string;
  resumeThreadId: string | null;
  onStdoutChunk?: ((chunk: string) => void) | null;
  abortSignal?: AbortSignal | null;
}

export type ProviderLinearWorkerAppServerCallbackResponse =
  | {
      kind: 'result';
      result: Record<string, unknown>;
    }
  | {
      kind: 'error';
      error: {
        code: number;
        message: string;
      };
    };

interface ProviderWorkerRunLocation {
  canonicalRunsRoot: string;
  taskId: string;
  runId: string;
}

interface ProviderWorkerSessionLogTailState {
  path: string | null;
  offsetBytes: number;
  trailingText: string;
  bootstrapPending: boolean;
  currentTurnStartedAt: string | null;
  idRewindSignature: string | null;
}

interface ProviderWorkerSessionLogHydrationState {
  path: string;
  offset_bytes: number;
  trailing_text: string;
  bootstrap_pending: boolean;
  proof_signature: string;
  id_rewind_signature?: string | null;
}

interface ProviderControlHostManifestTarget {
  currentRun: ProviderWorkerRunLocation;
  manifestPath: string;
}

interface ProviderLinearWorkerSessionLogHydrationResult {
  proof: ProviderLinearWorkerProof;
  hydrationState: ProviderWorkerSessionLogHydrationState | null;
}

export interface ProviderLinearWorkerDependencies {
  now: () => string;
  readManifest: (path: string) => Promise<Record<string, unknown>>;
  readTrackedIssue: (input: {
    issueId: string;
    env: NodeJS.ProcessEnv;
    sourceSetup?: DispatchPilotSourceSetup | null;
  }) => Promise<LiveLinearTrackedIssue>;
  resolveRuntimeContext: (
    env: NodeJS.ProcessEnv,
    repoRoot: string,
    runId: string
  ) => Promise<RuntimeCodexCommandContext>;
  sleep: (ms: number) => Promise<void>;
  execRunner: (request: ProviderLinearWorkerExecRequest) => Promise<ProviderLinearWorkerExecResult>;
  appServerTurnRunner: (
    request: ProviderLinearWorkerAppServerTurnRequest
  ) => Promise<ProviderLinearWorkerExecResult>;
  writeProof: (path: string, proof: ProviderLinearWorkerProof) => Promise<void>;
  log: Pick<typeof logger, 'info' | 'warn' | 'error'>;
}

export function buildEmptyProviderLinearWorkerTokenUsage(): ProviderLinearWorkerTokenUsage {
  return {
    input_tokens: null,
    output_tokens: null,
    total_tokens: null
  };
}

export function defaultExecRunner(
  request: ProviderLinearWorkerExecRequest
): Promise<ProviderLinearWorkerExecResult> {
  return new Promise((resolvePromise, reject) => {
    const abortSignal = request.abortSignal ?? null;
    const buildAbortError = (): Error => {
      const reason = abortSignal?.reason;
      if (reason instanceof Error) {
        return reason;
      }
      if (typeof reason === 'string' && reason.trim().length > 0) {
        return new Error(reason);
      }
      return new Error('Command aborted.');
    };
    if (abortSignal?.aborted) {
      reject(buildAbortError());
      return;
    }
    const stdio: StdioOptions = request.mirrorOutput ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe'];
    const child = spawn(request.command, request.args, {
      cwd: request.cwd,
      env: request.env,
      stdio
    });
    let stdout = '';
    let stderr = '';

    if (!request.mirrorOutput) {
      child.stdout?.on('data', (chunk) => {
        const renderedChunk = chunk.toString();
        stdout += renderedChunk;
        try {
          request.onStdoutChunk?.(renderedChunk);
        } catch (error) {
          if (typeof child.kill === 'function') {
            child.kill();
          }
          finalizeError(error instanceof Error ? error : new Error(String(error)));
        }
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    let settled = false;
    let abortError: Error | null = null;
    let abortEscalationTimer: ReturnType<typeof setTimeout> | null = null;
    const clearAbortEscalationTimer = () => {
      if (abortEscalationTimer !== null) {
        clearTimeout(abortEscalationTimer);
        abortEscalationTimer = null;
      }
    };
    const cleanupAbort = () => {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', handleAbort);
      }
      clearAbortEscalationTimer();
    };
    const finalizeError = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanupAbort();
      reject(error);
    };
    const finalizeSuccess = (result: ProviderLinearWorkerExecResult) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanupAbort();
      resolvePromise(result);
    };
    const handleAbort = () => {
      if (settled) {
        return;
      }
      if (child.exitCode !== null || child.signalCode !== null) {
        return;
      }
      abortError ??= buildAbortError();
      if (!child.killed) {
        child.kill();
      }
      if (abortEscalationTimer === null) {
        abortEscalationTimer = setTimeout(() => {
          if (settled || child.exitCode !== null || child.signalCode !== null) {
            return;
          }
          child.kill('SIGKILL');
        }, 5_000);
        abortEscalationTimer.unref?.();
      }
    };
    child.once('error', (error) => {
      finalizeError(abortError ?? (error instanceof Error ? error : new Error(String(error))));
    });
    child.once('close', (exitCode) => {
      if (abortError) {
        finalizeError(abortError);
        return;
      }
      finalizeSuccess({ exitCode, stdout, stderr });
    });
    abortSignal?.addEventListener('abort', handleAbort, { once: true });
    if (abortSignal?.aborted) {
      handleAbort();
    }
  });
}

function pickProviderLinearWorkerOfferedDenialDecision(decisions: unknown[]): string | null {
  if (decisions.length === 0) {
    return 'decline';
  }
  if (decisions.includes('decline')) {
    return 'decline';
  }
  return decisions.includes('cancel') ? 'cancel' : null;
}

function buildProviderLinearWorkerUnavailableDecisionError(
  method: string
): ProviderLinearWorkerAppServerCallbackResponse {
  return {
    kind: 'error',
    error: {
      code: -32000,
      message: `Provider worker app-server control has no safe offered decision for ${method}.`
    }
  };
}

function pickProviderLinearWorkerCommandApprovalDecision(
  params: Record<string, unknown> | null
): string | null {
  const decisions = Array.isArray(params?.availableDecisions) ? params.availableDecisions : [];
  const fallbackDenialDecision = pickProviderLinearWorkerOfferedDenialDecision(decisions);
  if (hasProviderLinearWorkerCommandApprovalEscalation(params)) {
    return fallbackDenialDecision;
  }
  if (decisions.length === 0 || decisions.includes('accept')) {
    return 'accept';
  }
  return fallbackDenialDecision;
}

function hasProviderLinearWorkerGrantRoot(params: Record<string, unknown> | null): boolean {
  return (
    isProviderLinearWorkerEscalationRequest(params?.grantRoot) ||
    isProviderLinearWorkerEscalationRequest(params?.grant_root)
  );
}

function pickProviderLinearWorkerFileChangeApprovalDecision(params: Record<string, unknown> | null): string | null {
  const decisions = Array.isArray(params?.availableDecisions) ? params.availableDecisions : [];
  if (hasProviderLinearWorkerGrantRoot(params)) {
    return pickProviderLinearWorkerOfferedDenialDecision(decisions);
  }
  if (decisions.length === 0 || decisions.includes('accept')) {
    return 'accept';
  }
  return pickProviderLinearWorkerOfferedDenialDecision(decisions);
}

function pickProviderLinearWorkerLegacyPatchApprovalDecision(
  params: Record<string, unknown> | null
): string {
  return hasProviderLinearWorkerGrantRoot(params) ? 'denied' : 'approved';
}

function hasProviderLinearWorkerCommandApprovalEscalation(
  params: Record<string, unknown> | null
): boolean {
  const additionalPermissions = isRecord(params?.additionalPermissions)
    ? params.additionalPermissions
    : null;
  const requestsNetworkPermission = isProviderLinearWorkerEscalationRequest(
    additionalPermissions?.network
  );
  const requestsFileSystemPermission = isProviderLinearWorkerEscalationRequest(
    additionalPermissions?.fileSystem
  );
  if (requestsNetworkPermission || requestsFileSystemPermission) {
    return true;
  }
  if (isProviderLinearWorkerEscalationRequest(params?.networkApprovalContext)) {
    return true;
  }
  if (
    Array.isArray(params?.proposedExecpolicyAmendment) &&
    params.proposedExecpolicyAmendment.length > 0
  ) {
    return true;
  }
  return (
    Array.isArray(params?.proposedNetworkPolicyAmendments) &&
    params.proposedNetworkPolicyAmendments.length > 0
  );
}

function isProviderLinearWorkerEscalationRequest(value: unknown): boolean {
  if (value === null || value === undefined || value === false) {
    return false;
  }
  return true;
}

function buildProviderLinearWorkerPermissionsGrant(): Record<string, unknown> {
  // Permission callbacks are escalation requests; provider workers grant no extra surface here.
  return {};
}

export function buildProviderLinearWorkerAppServerCallbackResponse(
  method: string,
  params: Record<string, unknown> | null = null
): ProviderLinearWorkerAppServerCallbackResponse {
  switch (method) {
    case 'item/commandExecution/requestApproval': {
      const decision = pickProviderLinearWorkerCommandApprovalDecision(params);
      if (!decision) {
        return buildProviderLinearWorkerUnavailableDecisionError(method);
      }
      return {
        kind: 'result',
        result: {
          decision
        }
      };
    }
    case 'item/fileChange/requestApproval': {
      const decision = pickProviderLinearWorkerFileChangeApprovalDecision(params);
      if (!decision) {
        return buildProviderLinearWorkerUnavailableDecisionError(method);
      }
      return {
        kind: 'result',
        result: {
          decision
        }
      };
    }
    case 'item/permissions/requestApproval':
      return {
        kind: 'result',
        result: {
          permissions: buildProviderLinearWorkerPermissionsGrant(),
          scope: 'turn',
          strictAutoReview: false
        }
      };
    case 'applyPatchApproval':
      return {
        kind: 'result',
        result: {
          decision: pickProviderLinearWorkerLegacyPatchApprovalDecision(params)
        }
      };
    case 'execCommandApproval':
      return {
        kind: 'result',
        result: {
          decision: hasProviderLinearWorkerCommandApprovalEscalation(params) ? 'denied' : 'approved'
        }
      };
    case 'mcpServer/elicitation/request':
      return {
        kind: 'result',
        result: {
          action: 'decline',
          content: null,
          _meta: null
        }
      };
    case 'item/tool/requestUserInput': {
      const questions = Array.isArray(params?.questions) ? params.questions : [];
      const answers: Record<string, { answers: string[] }> = {};
      for (const question of questions) {
        if (!isRecord(question)) {
          continue;
        }
        const id = normalizeOptionalString(question.id);
        if (id) {
          answers[id] = { answers: [] };
        }
      }
      return {
        kind: 'result',
        result: { answers }
      };
    }
    case 'item/tool/call': {
      const tool = normalizeOptionalString(params?.tool) ?? 'unknown';
      return {
        kind: 'result',
        result: {
          contentItems: [
            {
              type: 'inputText',
              text: `Provider worker app-server control has no client implementation for dynamic tool ${tool}.`
            }
          ],
          success: false
        }
      };
    }
    case 'account/chatgptAuthTokens/refresh':
      return {
        kind: 'error',
        error: {
          code: -32001,
          message: 'Provider worker app-server control cannot refresh ChatGPT auth tokens.'
        }
      };
    default:
      return {
        kind: 'error',
        error: {
          code: -32000,
          message: `Provider worker app-server control does not service ${method} client callbacks.`
        }
      };
  }
}

export async function defaultAppServerTurnRunner(
  request: ProviderLinearWorkerAppServerTurnRequest
): Promise<ProviderLinearWorkerExecResult> {
  return await new Promise((resolvePromise, reject) => {
    const abortSignal = request.abortSignal ?? null;
    const buildAbortError = (): Error => {
      const reason = abortSignal?.reason;
      if (reason instanceof Error) {
        return reason;
      }
      if (typeof reason === 'string' && reason.trim().length > 0) {
        return new Error(reason);
      }
      return new Error('App-server turn aborted.');
    };
    if (abortSignal?.aborted) {
      reject(buildAbortError());
      return;
    }

    const child = spawn(request.command, request.args, {
      cwd: request.cwd,
      env: request.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');

    let nextId = 1;
    let stdout = '';
    let stderr = '';
    let stdoutBuffer = '';
    let settled = false;
    let terminalTurnStatus: string | null = null;
    let terminalTurnFailureDetail: string | null = null;
    let abortError: Error | null = null;
    let abortEscalationTimer: ReturnType<typeof setTimeout> | null = null;
    const pending = new Map<
      string,
      {
        method: string;
        resolve: (value: unknown) => void;
        reject: (error: Error) => void;
      }
    >();
    let completeTurn: (() => void) | null = null;
    const turnCompletion = new Promise<void>((resolve) => {
      completeTurn = resolve;
    });

    const cleanupAbort = () => {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', handleAbort);
      }
      if (abortEscalationTimer !== null) {
        clearTimeout(abortEscalationTimer);
        abortEscalationTimer = null;
      }
    };
    const finalizeError = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanupAbort();
      for (const entry of pending.values()) {
        entry.reject(error);
      }
      pending.clear();
      if (child.exitCode === null && child.signalCode === null && !child.killed) {
        child.kill();
      }
      reject(error);
    };
    const finalizeSuccess = (result: ProviderLinearWorkerExecResult) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanupAbort();
      pending.clear();
      if (child.exitCode === null && child.signalCode === null && !child.killed) {
        child.kill();
      }
      resolvePromise(result);
    };
    const buildAppServerRuntimeError = (message: string, cause?: Error): Error => {
      const stderrDetail = normalizeOptionalString(stderr);
      const errorMessage = stderrDetail ? `${message}: ${stderrDetail}` : message;
      const error = new Error(errorMessage);
      if (cause) {
        error.cause = cause;
      }
      return error;
    };
    function handleAbort(): void {
      if (settled) {
        return;
      }
      if (child.exitCode !== null || child.signalCode !== null) {
        return;
      }
      abortError ??= buildAbortError();
      if (child.exitCode === null && child.signalCode === null && !child.killed) {
        child.kill();
      }
      if (abortEscalationTimer === null) {
        abortEscalationTimer = setTimeout(() => {
          if (settled || child.exitCode !== null || child.signalCode !== null) {
            return;
          }
          child.kill('SIGKILL');
        }, 5_000);
        abortEscalationTimer.unref?.();
      }
    }

    const emitProviderJsonl = (record: Record<string, unknown>) => {
      const line = `${JSON.stringify(record)}\n`;
      stdout += line;
      try {
        request.onStdoutChunk?.(line);
      } catch (error) {
        finalizeError(error instanceof Error ? error : new Error(String(error)));
      }
    };
    const writeAppServerPayload = (payload: Record<string, unknown>): void => {
      if (!child.stdin || child.stdin.destroyed || !child.stdin.writable) {
        throw buildAppServerRuntimeError('app-server stdin is unavailable');
      }
      child.stdin.write(`${JSON.stringify(payload)}\n`);
    };
    const emitThreadStarted = (threadId: string | null): void => {
      if (!threadId) {
        return;
      }
      emitProviderJsonl({
        type: 'thread.started',
        thread_id: threadId
      });
      emitProviderJsonl({
        type: 'session_meta',
        payload: {
          id: threadId,
          cwd: request.cwd,
          source: 'appserver'
        }
      });
    };
    const emitTurnContext = (turnId: string | null): void => {
      if (!turnId) {
        return;
      }
      emitProviderJsonl({
        type: 'turn_context',
        payload: {
          turn_id: turnId
        }
      });
    };
    const observeTurnStatus = (turn: Record<string, unknown> | null): void => {
      const status = normalizeOptionalString(turn?.status);
      if (!status || status === 'inProgress') {
        return;
      }
      terminalTurnStatus = status;
      terminalTurnFailureDetail =
        status === 'completed'
          ? null
          : buildProviderLinearWorkerAppServerTerminalFailureMessage(turn, status);
      completeTurn?.();
    };
    const emitNotification = (payload: Record<string, unknown>): void => {
      const method = normalizeOptionalString(payload.method);
      const params = isRecord(payload.params) ? payload.params : null;
      if (!method) {
        return;
      }
      if (method === 'thread/started') {
        emitThreadStarted(normalizeOptionalString(findRecordAtPaths(payload, [['params', 'thread']])?.id));
      }
      if (method === 'turn/started') {
        emitTurnContext(normalizeOptionalString(findRecordAtPaths(payload, [['params', 'turn']])?.id));
      }
      if (method === 'turn/completed') {
        observeTurnStatus(findRecordAtPaths(payload, [['params', 'turn']]));
      }
      emitProviderJsonl({
        type: 'notification',
        method,
        params: params ?? {},
        payload
      });
      if (method === 'turn/completed' && terminalTurnFailureDetail) {
        emitProviderJsonl({
          type: 'event_msg',
          payload: {
            type: 'diagnostic',
            status: 'appserver_runtime_error',
            message: terminalTurnFailureDetail
          }
        });
      }
    };
    const handleServerRequest = (payload: Record<string, unknown>): void => {
      const id = payload.id;
      if (id === null || id === undefined) {
        return;
      }
      const method = normalizeOptionalString(payload.method) ?? 'unknown';
      const params = isRecord(payload.params) ? payload.params : {};
      emitNotification({ method, params });
      const callbackResponse = buildProviderLinearWorkerAppServerCallbackResponse(method, params);
      const response =
        callbackResponse.kind === 'result'
          ? { id, result: callbackResponse.result }
          : { id, error: callbackResponse.error };
      writeAppServerPayload(response);
    };
    const handleJsonlPayload = (payload: unknown): void => {
      if (!isRecord(payload)) {
        return;
      }
      const id = payload.id;
      if (id !== null && id !== undefined && normalizeOptionalString(payload.method)) {
        handleServerRequest(payload);
        return;
      }
      const pendingEntry = id === null || id === undefined ? null : pending.get(String(id));
      if (pendingEntry) {
        pending.delete(String(id));
        if (payload.error) {
          pendingEntry.reject(
            new Error(`app-server ${pendingEntry.method} failed: ${JSON.stringify(payload.error)}`)
          );
          return;
        }
        pendingEntry.resolve(payload.result);
        return;
      }
      emitNotification(payload);
    };
    const requestAppServer = async (method: string, params: Record<string, unknown> | undefined): Promise<unknown> => {
      const id = nextId;
      nextId += 1;
      return await new Promise((resolve, rejectRequest) => {
        pending.set(String(id), {
          method,
          resolve,
          reject: rejectRequest
        });
        try {
          writeAppServerPayload({ id, method, params });
        } catch (error) {
          pending.delete(String(id));
          rejectRequest(error instanceof Error ? error : new Error(String(error)));
        }
      });
    };
    const notifyAppServer = (method: string, params?: Record<string, unknown>): void => {
      writeAppServerPayload(params ? { method, params } : { method });
    };

    child.stdout?.on('data', (chunk) => {
      stdoutBuffer += String(chunk);
      while (stdoutBuffer.includes('\n')) {
        const newlineIndex = stdoutBuffer.indexOf('\n');
        const line = stdoutBuffer.slice(0, newlineIndex).trim();
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        if (!line) {
          continue;
        }
        try {
          handleJsonlPayload(JSON.parse(line) as unknown);
        } catch (error) {
          finalizeError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.once('error', (error) => {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      finalizeError(abortError ?? buildAppServerRuntimeError('app-server process error', normalizedError));
    });
    child.stdin?.once('error', (error) => {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      finalizeError(abortError ?? buildAppServerRuntimeError('app-server stdin write failed', normalizedError));
    });
    child.once('close', (exitCode, signal) => {
      if (settled) {
        return;
      }
      if (!abortError && terminalTurnStatus === 'completed') {
        finalizeSuccess({
          exitCode: 0,
          stdout,
          stderr
        });
        return;
      }
      const reason = signal ? `signal ${signal}` : `code ${exitCode ?? 'unknown'}`;
      finalizeError(
        abortError ?? buildAppServerRuntimeError(`app-server exited before turn completion with ${reason}`)
      );
    });
    abortSignal?.addEventListener('abort', handleAbort, { once: true });
    if (abortSignal?.aborted) {
      handleAbort();
    }

    (async () => {
      await requestAppServer('initialize', {
        clientInfo: {
          name: 'co_provider_linear_worker',
          title: 'CO Provider Linear Worker',
          version: '0.0.0'
        },
        capabilities: {
          experimentalApi: true
        }
      });
      notifyAppServer('initialized');

      const threadResult = request.resumeThreadId
        ? await requestAppServer('thread/resume', {
            threadId: request.resumeThreadId,
            cwd: request.cwd,
            excludeTurns: true,
            persistExtendedHistory: true
          })
        : await requestAppServer('thread/start', {
            cwd: request.cwd,
            experimentalRawEvents: false,
            persistExtendedHistory: true
          });
      const threadResultRecord = isRecord(threadResult) ? threadResult : {};
      const threadId =
        normalizeOptionalString(findRecordAtPaths(threadResultRecord, [['thread']])?.id) ??
        request.resumeThreadId;
      emitThreadStarted(threadId);
      if (!threadId) {
        throw new Error('app-server thread start did not return a thread id.');
      }

      const turnResult = await requestAppServer('turn/start', {
        threadId,
        cwd: request.cwd,
        input: [
          {
            type: 'text',
            text: request.prompt,
            text_elements: []
          }
        ]
      });
      const turnResultRecord = isRecord(turnResult) ? turnResult : {};
      const turn = findRecordAtPaths(turnResultRecord, [['turn']]);
      emitTurnContext(normalizeOptionalString(turn?.id));
      observeTurnStatus(turn);
      await turnCompletion;
      const exitCode = terminalTurnStatus === 'completed' ? 0 : 1;
      const finalStderr =
        exitCode === 0 || !terminalTurnFailureDetail
          ? stderr
          : stderr
            ? `${stderr.trimEnd()}\n${terminalTurnFailureDetail}`
            : terminalTurnFailureDetail;
      finalizeSuccess({
        exitCode,
        stdout,
        stderr: finalStderr
      });
    })().catch((error) => {
      finalizeError(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function shouldForceNonInteractive(env: NodeJS.ProcessEnv): boolean {
  const stdinIsTTY = process.stdin?.isTTY === true;
  return (
    !stdinIsTTY ||
    envFlagEnabled(env.CI) ||
    envFlagEnabled(env.CODEX_REVIEW_NON_INTERACTIVE) ||
    envFlagEnabled(env.CODEX_NON_INTERACTIVE) ||
    envFlagEnabled(env.CODEX_NONINTERACTIVE) ||
    envFlagEnabled(env.CODEX_NO_INTERACTIVE)
  );
}

function ensureProviderLinearWorkerAuthoritativeReviewNotes(
  env: NodeJS.ProcessEnv,
  context: Pick<ProviderLinearWorkerContext, 'issueIdentifier' | 'taskId'>
): void {
  if (!envFlagEnabled(env.CODEX_REVIEW_AUTHORITATIVE_GATE) || normalizeOptionalString(env.NOTES)) {
    return;
  }
  env.NOTES = [
    `Goal: provider-linear-worker handoff review for ${context.issueIdentifier}`,
    `Summary: provider-authored default NOTES for the authoritative pre-handoff review gate in task ${context.taskId}; worker commands may override with issue-specific context`,
    'Risks: generic provider-worker notes are lower-signal than worker-authored closeout notes'
  ].join(' | ');
}

function classifyExecRunnerFailure(
  error: unknown,
  spawnContext: {
    cwd: string;
    useAppServerControl?: boolean;
  }
): ProviderLinearWorkerProof['end_reason'] {
  if (spawnContext.useAppServerControl) {
    return 'appserver_runtime_error';
  }
  if ((error as NodeJS.ErrnoException)?.code === 'ENOENT' && existsSync(spawnContext.cwd)) {
    return 'runtime_parity_command_unavailable';
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/\bapp-server\b/u.test(message)) {
    return 'appserver_runtime_error';
  }
  return 'exec_runner_failed';
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringifyProviderLinearWorkerAppServerTurnError(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const direct = normalizeOptionalString(value);
  if (direct) {
    return direct;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => stringifyProviderLinearWorkerAppServerTurnError(item))
      .filter((item): item is string => Boolean(item));
    return normalizeOptionalString(parts.join('; '));
  }
  if (!isRecord(value)) {
    return normalizeOptionalString(String(value));
  }
  const preferred = [
    normalizeOptionalString(value.message),
    normalizeOptionalString(value.error),
    normalizeOptionalString(value.reason),
    normalizeOptionalString(value.detail),
    normalizeOptionalString(value.details),
    stringifyProviderLinearWorkerAppServerTurnError(value.additionalDetails),
    stringifyProviderLinearWorkerAppServerTurnError(value.additional_details),
    normalizeOptionalString(value.code)
  ].filter((item): item is string => Boolean(item));
  if (preferred.length > 0) {
    return preferred.join('; ');
  }
  try {
    return normalizeOptionalString(JSON.stringify(value));
  } catch {
    return null;
  }
}

function buildProviderLinearWorkerAppServerTerminalFailureMessage(
  turn: Record<string, unknown> | null,
  status: string
): string {
  const normalizedStatus = normalizeOptionalString(status) ?? 'failed';
  const turnId = normalizeOptionalString(turn?.id);
  const base = turnId
    ? `app-server turn ${turnId} ${normalizedStatus}`
    : `app-server turn ${normalizedStatus}`;
  const errorDetail = stringifyProviderLinearWorkerAppServerTurnError(
    turn?.error ?? turn?.failure ?? turn?.status_detail ?? turn?.statusDetail
  );
  return errorDetail ? `${base}: ${redactProviderWorkerDiagnosticText(errorDetail)}` : base;
}

function normalizeGuardrailsRequiredSource(value: unknown): string | null {
  return value === 'explicit' || value === 'stage_detection' ? value : null;
}

function backfillProviderWorkerManifestControlHostProvenance(
  manifest: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const locator = readProviderControlHostLocatorFromEnv({
    [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: env[PROVIDER_CONTROL_HOST_TASK_ID_ENV],
    [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: env[PROVIDER_CONTROL_HOST_RUN_ID_ENV],
    [PROVIDER_LAUNCH_SOURCE_ENV]: env[PROVIDER_LAUNCH_SOURCE_ENV]
  });
  if (!locator) {
    return false;
  }

  const manifestLaunchSource =
    normalizeOptionalString(manifest.provider_launch_source) ??
    normalizeOptionalString(manifest.providerLaunchSource);
  const manifestTaskId =
    normalizeOptionalString(manifest.provider_control_host_task_id) ??
    normalizeOptionalString(manifest.providerControlHostTaskId);
  const manifestRunId =
    normalizeOptionalString(manifest.provider_control_host_run_id) ??
    normalizeOptionalString(manifest.providerControlHostRunId);

  if (
    (manifestLaunchSource && manifestLaunchSource !== PROVIDER_LAUNCH_SOURCE_CONTROL_HOST) ||
    (manifestTaskId && manifestTaskId !== locator.taskId) ||
    (manifestRunId && manifestRunId !== locator.runId)
  ) {
    return false;
  }

  if (
    manifestLaunchSource === PROVIDER_LAUNCH_SOURCE_CONTROL_HOST &&
    manifestTaskId === locator.taskId &&
    manifestRunId === locator.runId
  ) {
    return false;
  }

  manifest.provider_launch_source = PROVIDER_LAUNCH_SOURCE_CONTROL_HOST;
  manifest.provider_control_host_task_id = locator.taskId;
  manifest.provider_control_host_run_id = locator.runId;
  return true;
}

function normalizeOptionalInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

function normalizeNonNegativeInteger(value: unknown): number | null {
  const normalized = normalizeOptionalInteger(value);
  return normalized !== null && normalized >= 0 ? normalized : null;
}

function normalizePositiveInteger(value: unknown): number | null {
  const normalized = normalizeOptionalInteger(value);
  return normalized !== null && normalized > 0 ? normalized : null;
}

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const normalized = value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => entry !== null);
  return normalized.length === value.length ? normalized : null;
}

function parsePositiveInteger(value: unknown, source: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
    throw new Error(`${source} must be a positive integer.`);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (!/^\d+$/u.test(trimmed)) {
      throw new Error(`${source} must be a positive integer.`);
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  throw new Error(`${source} must be a positive integer.`);
}

async function resolveProviderWorkerMaxTurns(
  env: NodeJS.ProcessEnv,
  readText: (path: string) => Promise<string> = async (path) => await readFile(path, 'utf8')
): Promise<number> {
  const explicitTurns = parsePositiveInteger(
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS) ??
      normalizeOptionalString(env.CO_PROVIDER_WORKER_MAX_TURNS),
    'CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS/CO_PROVIDER_WORKER_MAX_TURNS'
  );
  if (explicitTurns !== null) {
    return explicitTurns;
  }

  const configPath = join(resolveCodexHome(env), 'config.toml');
  let rawConfig: string | null = null;
  try {
    rawConfig = await readText(configPath);
  } catch {
    rawConfig = null;
  }

  if (rawConfig) {
    const configuredTurns = readAgentMaxTurnsFromToml(rawConfig, configPath);
    if (configuredTurns !== null) {
      return configuredTurns;
    }
  }

  return PROVIDER_WORKER_DEFAULT_MAX_TURNS;
}

function readAgentMaxTurnsFromToml(rawConfig: string, configPath: string): number | null {
  let currentTablePath: string[] = [];
  let currentTableKind: 'table' | 'array' | null = null;
  const scanState: TomlMultilineStringScanState = { delimiter: null };
  for (const line of rawConfig.split(/\r?\n/u)) {
    const trimmed = stripTomlComment(line, scanState).trim();
    if (!trimmed) {
      continue;
    }
    const tableHeader = parseTomlTableHeader(trimmed);
    if (tableHeader) {
      currentTablePath = tableHeader.path;
      currentTableKind = tableHeader.kind;
      continue;
    }
    if (currentTableKind === 'table' && currentTablePath.length === 1 && currentTablePath[0] === 'agent') {
      const sectionValue = readTomlPositiveIntegerAssignment(trimmed, 'max_turns', `${configPath} [agent].max_turns`);
      if (sectionValue !== null) {
        return sectionValue;
      }
    }
    if (currentTablePath.length === 0) {
      const dottedValue = readTomlPositiveIntegerAssignment(
        trimmed,
        'agent.max_turns',
        `${configPath} agent.max_turns`
      );
      if (dottedValue !== null) {
        return dottedValue;
      }
    }
  }
  return null;
}

function readTomlPositiveIntegerAssignment(
  trimmedLine: string,
  key: string,
  sourceLabel: string
): number | null {
  const separatorIndex = findTomlAssignmentSeparator(trimmedLine);
  if (separatorIndex === -1) {
    return null;
  }
  const rawKey = normalizeTomlKey(trimmedLine.slice(0, separatorIndex));
  if (rawKey !== key) {
    return null;
  }
  return parseTomlPositiveInteger(trimmedLine.slice(separatorIndex + 1).trim(), sourceLabel);
}

function normalizeTomlKey(raw: string): string | null {
  const segments = parseTomlDottedPath(raw);
  if (segments.length === 0) {
    return null;
  }
  return segments.join('.');
}

function parseTomlDottedPath(raw: string): string[] {
  const segments: string[] = [];
  let current = '';
  let quote: '"' | '\'' | null = null;
  let escaping = false;
  const flush = () => {
    const normalized = normalizeTomlKeySegment(current);
    if (normalized) {
      segments.push(normalized);
    }
    current = '';
  };
  for (const character of raw.trim()) {
    if (escaping) {
      current += character;
      escaping = false;
      continue;
    }
    if (quote === '"' && character === '\\') {
      current += character;
      escaping = true;
      continue;
    }
    if (character === '"' || character === '\'') {
      if (quote === character) {
        quote = null;
      } else if (!quote) {
        quote = character;
      }
      current += character;
      continue;
    }
    if (!quote && character === '.') {
      flush();
      continue;
    }
    current += character;
  }
  flush();
  return segments;
}

function normalizeTomlKeySegment(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return decodeTomlString(trimmed);
  }
  return trimmed;
}

function parseTomlTableHeader(
  line: string
): { kind: 'table' | 'array'; path: string[] } | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
    return {
      kind: 'array',
      path: parseTomlDottedPath(trimmed.slice(2, -2))
    };
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return {
      kind: 'table',
      path: parseTomlDottedPath(trimmed.slice(1, -1))
    };
  }
  return null;
}

function parseTomlPositiveInteger(raw: string, source: string): number | null {
  const parsed = parseTomlInteger(raw);
  if (parsed === null) {
    throw new Error(`${source} must be a positive integer.`);
  }
  if (parsed > 0) {
    return parsed;
  }
  throw new Error(`${source} must be a positive integer.`);
}

function parseTomlInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (/^[+-]?(?:0|[1-9](?:_?\d)*)$/u.test(trimmed)) {
    return Number.parseInt(trimmed.replace(/_/gu, ''), 10);
  }
  if (/^[+-]?0x[0-9a-f](?:_?[0-9a-f])*$/iu.test(trimmed)) {
    return parseTomlBasedInteger(trimmed, /^([+-]?)0x/iu, 16);
  }
  if (/^[+-]?0o[0-7](?:_?[0-7])*$/iu.test(trimmed)) {
    return parseTomlBasedInteger(trimmed, /^([+-]?)0o/iu, 8);
  }
  if (/^[+-]?0b[01](?:_?[01])*$/iu.test(trimmed)) {
    return parseTomlBasedInteger(trimmed, /^([+-]?)0b/iu, 2);
  }
  return null;
}

function parseTomlBasedInteger(raw: string, prefixPattern: RegExp, radix: number): number | null {
  const normalized = raw.replace(/_/gu, '');
  const prefixMatch = normalized.match(prefixPattern);
  if (!prefixMatch) {
    return null;
  }
  const sign = prefixMatch[1] === '-' ? -1 : 1;
  const digits = normalized.slice(prefixMatch[0].length);
  return sign * Number.parseInt(digits, radix);
}

function findTomlAssignmentSeparator(raw: string): number {
  let quote: '"' | '\'' | null = null;
  let escaping = false;
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (escaping) {
      escaping = false;
      continue;
    }
    if (quote && character === '\\') {
      escaping = true;
      continue;
    }
    if (character === '"' || character === '\'') {
      if (quote === character) {
        quote = null;
      } else if (!quote) {
        quote = character;
      }
      continue;
    }
    if (!quote && character === '=') {
      return index;
    }
  }
  return -1;
}

function decodeTomlString(raw: string): string {
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw.slice(1, -1).replace(/\\\\/gu, '\\').replace(/\\"/gu, '"').replace(/\\'/gu, '\'');
    }
  }
  return raw.slice(1, -1).replace(/\\'/gu, '\'');
}

interface TomlMultilineStringScanState {
  delimiter: '"""' | '\'\'\'' | null;
}

function stripTomlComment(line: string, state: TomlMultilineStringScanState): string {
  let output = '';
  let quote: '"' | '\'' | null = null;
  let escaping = false;
  for (let index = 0; index < line.length; index += 1) {
    if (state.delimiter) {
      const delimiter = state.delimiter;
      if (
        line.startsWith(delimiter, index) &&
        (delimiter === '\'\'\'' || !isTomlBasicStringEscape(line, index))
      ) {
        state.delimiter = null;
        index += delimiter.length - 1;
      }
      continue;
    }
    const character = line[index];
    if (escaping) {
      output += character;
      escaping = false;
      continue;
    }
    if (quote === '"' && character === '\\') {
      output += character;
      escaping = true;
      continue;
    }
    if (line.startsWith('"""', index) || line.startsWith('\'\'\'', index)) {
      state.delimiter = line.startsWith('"""', index) ? '"""' : '\'\'\'';
      index += 2;
      continue;
    }
    if (character === '"' || character === '\'') {
      if (quote === character) {
        quote = null;
      } else if (!quote) {
        quote = character;
      }
      output += character;
      continue;
    }
    if (!quote && character === '#') {
      return output;
    }
    output += character;
  }
  return output;
}

function isTomlBasicStringEscape(line: string, index: number): boolean {
  let backslashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && line[cursor] === '\\'; cursor -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function resolveProviderLinearWorkerSourceSetup(
  env: NodeJS.ProcessEnv
): DispatchPilotSourceSetup | null {
  const sourceSetup = resolveLinearSourceSetup(
    {
      provider: 'linear',
      workspace_id: null,
      team_id: null,
      project_id: null
    },
    env
  );
  return hasLinearSourceBinding(sourceSetup) ? sourceSetup : null;
}

interface ProviderLinearWorkerRootAuthority {
  repoRoot: string;
  workspacePath: string | null;
}

function isProviderIssueWorkspaceRootForTask(
  candidate: string | null,
  taskId: string
): candidate is string {
  return Boolean(
    candidate &&
      basename(candidate) === taskId &&
      basename(dirname(candidate)) === PROVIDER_WORKSPACE_ROOT_DIRNAME
  );
}

function resolveProviderLinearWorkerConfiguredPath(input: {
  rawPath: string;
  cwd: string;
  taskId: string | null;
  envRepoRoot?: string | null;
}): string {
  const normalizedCwd = resolve(input.cwd);
  if (isAbsolute(input.rawPath) || !input.taskId || !isProviderIssueWorkspaceRootForTask(normalizedCwd, input.taskId)) {
    return resolve(normalizedCwd, input.rawPath);
  }
  const sharedRoot = dirname(dirname(normalizedCwd));
  const envRepoRoot = input.envRepoRoot ? resolve(isAbsolute(input.envRepoRoot) ? input.envRepoRoot : resolve(normalizedCwd, input.envRepoRoot)) : null;
  return envRepoRoot === sharedRoot ? resolve(sharedRoot, input.rawPath) : resolve(normalizedCwd, input.rawPath);
}

function resolveProviderLinearWorkerRootAuthority(input: {
  manifestWorkspacePath: string | null;
  envRepoRoot: string | null;
  taskId: string | null;
  cwd: string;
}): ProviderLinearWorkerRootAuthority {
  const normalizedManifestWorkspacePath = input.manifestWorkspacePath
    ? resolveProviderLinearWorkerConfiguredPath({ rawPath: input.manifestWorkspacePath, cwd: input.cwd, taskId: input.taskId, envRepoRoot: input.envRepoRoot })
    : null;
  const normalizedEnvRepoRoot = input.envRepoRoot
    ? resolveProviderLinearWorkerConfiguredPath({ rawPath: input.envRepoRoot, cwd: input.cwd, taskId: input.taskId })
    : null;
  const normalizedCwd = resolve(input.cwd);
  const activeIssueWorkspacePath = input.taskId
    ? [normalizedEnvRepoRoot, normalizedCwd, normalizedManifestWorkspacePath].find((candidate) =>
        isProviderIssueWorkspaceRootForTask(candidate, input.taskId ?? '')
      ) ?? null
    : null;

  if (activeIssueWorkspacePath) {
    const activeSharedRoot = dirname(dirname(activeIssueWorkspacePath));
    const explicitRootsAreCompatible = [normalizedManifestWorkspacePath, normalizedEnvRepoRoot].every(
      (candidate) =>
        !candidate ||
        candidate === activeIssueWorkspacePath ||
        candidate === activeSharedRoot
    );
    if (explicitRootsAreCompatible) {
      return {
        repoRoot: activeIssueWorkspacePath,
        workspacePath: activeIssueWorkspacePath
      };
    }
  }

  if (
    normalizedManifestWorkspacePath &&
    normalizedEnvRepoRoot &&
    normalizedEnvRepoRoot !== normalizedManifestWorkspacePath
  ) {
    throw new Error(
      `Provider worker root mismatch between env (${normalizedEnvRepoRoot}) and manifest (${normalizedManifestWorkspacePath}).`
    );
  }

  const repoRoot = normalizedManifestWorkspacePath ?? normalizedEnvRepoRoot ?? normalizedCwd;
  return {
    repoRoot,
    workspacePath: normalizedManifestWorkspacePath ?? repoRoot
  };
}

function resolveProviderLinearWorkerManifestPathForRoot(input: {
  manifestPath: string;
  repoRoot: string;
  taskId: string;
  configuredRunsDir?: string | null;
}): string {
  const normalizedManifestPath = resolve(input.manifestPath);
  if (!isProviderIssueWorkspaceRootForTask(input.repoRoot, input.taskId)) {
    return normalizedManifestPath;
  }
  if (isPathWithinRoot(normalizedManifestPath, input.repoRoot)) {
    return normalizedManifestPath;
  }

  const sharedRoot = dirname(dirname(input.repoRoot));
  const sharedRunsRoot = resolveProviderLinearWorkerSharedRunsRoot({
    sharedRoot,
    configuredRunsDir: input.configuredRunsDir,
    manifestPath: normalizedManifestPath
  });
  if (!isPathWithinRoot(normalizedManifestPath, sharedRunsRoot)) {
    return normalizedManifestPath;
  }

  const workspaceRunsRoot = resolveProviderLinearWorkerWorkspaceRunsRoot(
    input.repoRoot,
    sharedRoot,
    sharedRunsRoot
  );
  if (!workspaceRunsRoot) {
    return normalizedManifestPath;
  }
  const workspaceManifestPath = resolve(workspaceRunsRoot, relative(sharedRunsRoot, normalizedManifestPath));
  return existsSync(workspaceManifestPath) ? workspaceManifestPath : normalizedManifestPath;
}

function resolveProviderLinearWorkerSharedRunsRoot(input: {
  sharedRoot: string;
  configuredRunsDir?: string | null;
  manifestPath: string;
}): string {
  const normalizedConfiguredRunsDir = normalizeOptionalString(input.configuredRunsDir);
  if (normalizedConfiguredRunsDir) {
    return isAbsolute(normalizedConfiguredRunsDir)
      ? resolve(normalizedConfiguredRunsDir)
      : resolve(input.sharedRoot, normalizedConfiguredRunsDir);
  }
  const runDir = dirname(input.manifestPath);
  const layoutDir = dirname(runDir);
  const taskDir = dirname(layoutDir);
  const runsRoot = dirname(taskDir);
  return ['.runs', 'runs'].includes(basename(runsRoot)) ? runsRoot : join(input.sharedRoot, '.runs');
}

function resolveProviderLinearWorkerWorkspaceRunsRoot(
  repoRoot: string,
  sharedRoot: string,
  sharedRunsRoot: string
): string | null {
  if (!isPathWithinRoot(sharedRunsRoot, sharedRoot)) {
    return null;
  }
  const relativeRunsRoot = relative(sharedRoot, sharedRunsRoot);
  return resolve(repoRoot, relativeRunsRoot);
}

export async function loadProviderLinearWorkerContext(
  env: NodeJS.ProcessEnv = process.env,
  readManifest: (path: string) => Promise<Record<string, unknown>> = async (path) =>
    JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>,
  cwd: string = process.cwd()
): Promise<ProviderLinearWorkerContext> {
  let manifestPath = normalizeOptionalString(env.CODEX_ORCHESTRATOR_MANIFEST_PATH);
  if (!manifestPath) {
    throw new Error('CODEX_ORCHESTRATOR_MANIFEST_PATH is required for provider-linear-worker.');
  }
  const initialEnvTaskId =
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_TASK_ID) ??
    normalizeOptionalString(env.MCP_RUNNER_TASK_ID) ??
    normalizeOptionalString(env.TASK);
  const envRepoRoot = normalizeOptionalString(env.CODEX_ORCHESTRATOR_ROOT);
  manifestPath = resolveProviderLinearWorkerConfiguredPath({
    rawPath: manifestPath,
    cwd,
    taskId: initialEnvTaskId ?? contextTaskIdFromManifestPath(manifestPath),
    envRepoRoot
  });
  let manifest = await readManifest(manifestPath);
  const controlHostManifestPath = manifestPath;
  const controlHostManifest = manifest;
  const residentSessionSeed = parseProviderLinearResidentSessionSeed(
    env[PROVIDER_LINEAR_RESIDENT_SESSION_SEED_ENV]
  );
  const initialManifestTaskId =
    normalizeOptionalString(manifest.task_id) ??
    normalizeOptionalString(manifest.taskId);
  const initialTaskId = initialManifestTaskId
    ? sanitizeTaskId(initialManifestTaskId)
    : contextTaskIdFromManifestPath(manifestPath);
  const envTaskId = initialEnvTaskId;
  if (!initialTaskId || (envTaskId && envTaskId !== initialTaskId)) {
    throw new Error(initialTaskId ? `Provider worker task id mismatch between env (${envTaskId}) and manifest (${initialTaskId}).` : 'Provider worker task id unavailable.');
  }
  const manifestWorkspacePath =
    normalizeOptionalString(manifest.workspace_path) ??
    normalizeOptionalString(manifest.workspacePath);
  const rootAuthority = resolveProviderLinearWorkerRootAuthority({
    manifestWorkspacePath,
    envRepoRoot,
    taskId: initialTaskId,
    cwd
  });
  const repoRoot = rootAuthority.repoRoot;
  const selectedManifestPath = resolveProviderLinearWorkerManifestPathForRoot({
    manifestPath,
    repoRoot,
    taskId: initialTaskId,
    configuredRunsDir: env.CODEX_ORCHESTRATOR_RUNS_DIR
  });
  if (selectedManifestPath !== manifestPath) {
    manifestPath = selectedManifestPath;
    manifest = await readManifest(manifestPath);
  }
  const controlHostManifestBackfilled = backfillProviderWorkerManifestControlHostProvenance(
    controlHostManifest,
    env
  );
  const selectedManifestBackfilled =
    manifestPath !== controlHostManifestPath &&
    backfillProviderWorkerManifestControlHostProvenance(manifest, env);
  const manifestTaskId =
    normalizeOptionalString(manifest.task_id) ??
    normalizeOptionalString(manifest.taskId);
  const taskId = manifestTaskId
    ? sanitizeTaskId(manifestTaskId)
    : contextTaskIdFromManifestPath(manifestPath);
  if (!taskId || taskId !== initialTaskId || (envTaskId && envTaskId !== taskId)) {
    throw new Error(taskId ? `Provider worker task id mismatch between env (${envTaskId ?? initialTaskId}) and manifest (${taskId}).` : 'Provider worker task id unavailable.');
  }
  const manifestIssueId =
    normalizeOptionalString(manifest.issue_id) ??
    normalizeOptionalString(manifest.issueId);
  const envIssueId = normalizeOptionalString(env.CODEX_ORCHESTRATOR_ISSUE_ID);
  if (manifestIssueId && envIssueId && envIssueId !== manifestIssueId) {
    throw new Error(`Provider worker issue id mismatch between env (${envIssueId}) and manifest (${manifestIssueId}).`);
  }
  const issueId = manifestIssueId ?? envIssueId;
  const manifestIssueIdentifier =
    normalizeOptionalString(manifest.issue_identifier) ??
    normalizeOptionalString(manifest.issueIdentifier);
  const envIssueIdentifier = normalizeOptionalString(env.CODEX_ORCHESTRATOR_ISSUE_IDENTIFIER);
  if (manifestIssueIdentifier && envIssueIdentifier && envIssueIdentifier !== manifestIssueIdentifier) {
    throw new Error(
      `Provider worker issue identifier mismatch between env (${envIssueIdentifier}) and manifest (${manifestIssueIdentifier}).`
    );
  }
  const issueIdentifier =
    manifestIssueIdentifier ??
    envIssueIdentifier ??
    issueId;
  if (!issueId || !issueIdentifier) {
    throw new Error('Provider worker requires issue_id and issue_identifier in env or manifest.');
  }
  const manifestRunId = normalizeOptionalString(manifest.run_id), envRunId = normalizeOptionalString(env.CODEX_ORCHESTRATOR_RUN_ID);
  if (manifestRunId && envRunId && envRunId !== manifestRunId) throw new Error(`Provider worker run id mismatch between env (${envRunId}) and manifest (${manifestRunId}).`);
  const runId = manifestRunId ?? envRunId ?? `provider-linear-worker-${Date.now()}`;
  const manifestPipelineId = normalizeOptionalString(manifest.pipeline_id) ?? normalizeOptionalString(manifest.pipelineId), envPipelineId = normalizeOptionalString(env.CODEX_ORCHESTRATOR_PIPELINE_ID);
  if (manifestPipelineId && envPipelineId && envPipelineId !== manifestPipelineId) throw new Error(`Provider worker pipeline id mismatch between env (${envPipelineId}) and manifest (${manifestPipelineId}).`);
  const manifestProviderLaunchSource =
    normalizeOptionalString(manifest.provider_launch_source) ??
    normalizeOptionalString(manifest.providerLaunchSource) ??
    normalizeOptionalString(controlHostManifest.provider_launch_source) ??
    normalizeOptionalString(controlHostManifest.providerLaunchSource);
  const manifestProviderControlHostTaskId =
    normalizeOptionalString(manifest.provider_control_host_task_id) ??
    normalizeOptionalString(manifest.providerControlHostTaskId) ??
    normalizeOptionalString(controlHostManifest.provider_control_host_task_id) ??
    normalizeOptionalString(controlHostManifest.providerControlHostTaskId);
  const manifestProviderControlHostRunId =
    normalizeOptionalString(manifest.provider_control_host_run_id) ??
    normalizeOptionalString(manifest.providerControlHostRunId) ??
    normalizeOptionalString(controlHostManifest.provider_control_host_run_id) ??
    normalizeOptionalString(controlHostManifest.providerControlHostRunId);
  const envProviderControlHostLocator = readProviderControlHostLocatorFromEnv({
    [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: env[PROVIDER_CONTROL_HOST_TASK_ID_ENV],
    [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: env[PROVIDER_CONTROL_HOST_RUN_ID_ENV],
    [PROVIDER_LAUNCH_SOURCE_ENV]: env[PROVIDER_LAUNCH_SOURCE_ENV]
  });
  const envProviderControlHostTaskId = envProviderControlHostLocator?.taskId ?? null;
  const envProviderControlHostRunId = envProviderControlHostLocator?.runId ?? null;
  const providerControlHostMatchesManifest = Boolean(
    manifestProviderLaunchSource === PROVIDER_LAUNCH_SOURCE_CONTROL_HOST &&
    envProviderControlHostTaskId &&
      envProviderControlHostRunId &&
      manifestProviderControlHostTaskId &&
      manifestProviderControlHostRunId &&
      envProviderControlHostTaskId === manifestProviderControlHostTaskId &&
      envProviderControlHostRunId === manifestProviderControlHostRunId
  );
  const hasExplicitWorkerHostOverride = Object.prototype.hasOwnProperty.call(
    env,
    PROVIDER_WORKER_HOST_ENV_KEY
  );
  const envWorkerHost = hasExplicitWorkerHostOverride
    ? normalizeProviderWorkerHostName(env[PROVIDER_WORKER_HOST_ENV_KEY])
    : undefined;
  const maxTurns = await resolveProviderWorkerMaxTurns(env);
  if (controlHostManifestBackfilled) {
    await writeJsonAtomic(controlHostManifestPath, controlHostManifest);
  }
  if (selectedManifestBackfilled) {
    await writeJsonAtomic(manifestPath, manifest);
  }
  return {
    manifest,
    manifestPath,
    controlHostManifest,
    controlHostManifestPath,
    runDir: dirname(manifestPath),
    repoRoot,
    runId,
    taskId,
    pipelineId: envPipelineId ?? manifestPipelineId,
    providerControlHostTaskId:
      providerControlHostMatchesManifest
        ? (envProviderControlHostTaskId ?? manifestProviderControlHostTaskId)
        : null,
    providerControlHostRunId:
      providerControlHostMatchesManifest
        ? (envProviderControlHostRunId ?? manifestProviderControlHostRunId)
        : null,
    providerControlHostRecordedInManifest:
      Boolean(
        manifestProviderLaunchSource === PROVIDER_LAUNCH_SOURCE_CONTROL_HOST &&
          manifestProviderControlHostTaskId &&
          manifestProviderControlHostRunId
      ),
    providerControlHostMatchesManifest,
    workspacePath: rootAuthority.workspacePath,
    workerHost:
      envWorkerHost !== undefined
        ? envWorkerHost
        : normalizeProviderWorkerHostName(manifest.worker_host ?? manifest.workerHost),
    sourceSetup: resolveProviderLinearWorkerSourceSetup(env),
    issueId,
    issueIdentifier,
    issueUpdatedAt:
      normalizeOptionalString(env.CODEX_ORCHESTRATOR_ISSUE_UPDATED_AT) ??
      normalizeOptionalString(manifest.issue_updated_at) ??
      normalizeOptionalString(manifest.issueUpdatedAt),
    maxTurns,
    residentSessionSeed
  };
}

function applyProviderLinearWorkerContextEnv(
  env: NodeJS.ProcessEnv,
  context: Pick<
    ProviderLinearWorkerContext,
    | 'manifestPath'
    | 'runDir'
    | 'repoRoot'
    | 'runId'
    | 'taskId'
    | 'pipelineId'
    | 'issueId'
    | 'issueIdentifier'
    | 'issueUpdatedAt'
    | 'providerControlHostTaskId'
    | 'providerControlHostRunId'
  >
): void {
  const artifactPathResolutionTaskId =
    resolveProviderLinearWorkerWorkspaceScopeTaskId(context.repoRoot) ?? context.taskId;
  const artifactPathResolutionRoot = resolveProviderLinearWorkerArtifactPathResolutionRoot(context);
  const inheritedEnvPaths = resolveEnvironmentPathsForProcess(env, process.cwd());
  const artifactPathResolutionEnv: NodeJS.ProcessEnv = {
    ...env,
    CODEX_ORCHESTRATOR_MANIFEST_PATH: context.manifestPath,
    CODEX_ORCHESTRATOR_ROOT: artifactPathResolutionRoot,
    CODEX_ORCHESTRATOR_TASK_ID: artifactPathResolutionTaskId,
    MCP_RUNNER_TASK_ID: artifactPathResolutionTaskId,
    TASK: artifactPathResolutionTaskId,
    CODEX_ORCHESTRATOR_PIPELINE_ID: context.pipelineId ?? 'provider-linear-worker'
  };
  const runsDirHint = sanitizeProviderLinearWorkerArtifactDirHint(
    context,
    artifactPathResolutionEnv.CODEX_ORCHESTRATOR_RUNS_DIR
  );
  const outDirHint = sanitizeProviderLinearWorkerArtifactDirHint(
    context,
    artifactPathResolutionEnv.CODEX_ORCHESTRATOR_OUT_DIR
  );
  if (runsDirHint) {
    artifactPathResolutionEnv.CODEX_ORCHESTRATOR_RUNS_DIR = runsDirHint;
  } else {
    delete artifactPathResolutionEnv.CODEX_ORCHESTRATOR_RUNS_DIR;
  }
  if (outDirHint) {
    artifactPathResolutionEnv.CODEX_ORCHESTRATOR_OUT_DIR = outDirHint;
  } else {
    delete artifactPathResolutionEnv.CODEX_ORCHESTRATOR_OUT_DIR;
  }
  const resolvedPaths = resolveEnvironmentPathsForProcess(
    artifactPathResolutionEnv,
    context.repoRoot
  );
  env.CODEX_ORCHESTRATOR_MANIFEST_PATH = context.manifestPath;
  env.CODEX_ORCHESTRATOR_RUN_DIR = context.runDir;
  env.CODEX_ORCHESTRATOR_ROOT = context.repoRoot;
  env.CODEX_ORCHESTRATOR_RUNS_DIR = resolvedPaths.runsRoot;
  env.CODEX_ORCHESTRATOR_OUT_DIR = resolvedPaths.outRoot;
  env.CODEX_ORCHESTRATOR_RUN_ID = context.runId;
  env.CODEX_ORCHESTRATOR_TASK_ID = context.taskId;
  env.MCP_RUNNER_TASK_ID = context.taskId;
  env.TASK = context.taskId;
  env.CODEX_ORCHESTRATOR_PIPELINE_ID = context.pipelineId ?? 'provider-linear-worker';
  env.CODEX_ORCHESTRATOR_ISSUE_ID = context.issueId;
  env.CODEX_ORCHESTRATOR_ISSUE_IDENTIFIER = context.issueIdentifier;
  if (context.issueUpdatedAt) {
    env.CODEX_ORCHESTRATOR_ISSUE_UPDATED_AT = context.issueUpdatedAt;
  } else {
    delete env.CODEX_ORCHESTRATOR_ISSUE_UPDATED_AT;
  }
  if (context.providerControlHostTaskId && context.providerControlHostRunId) {
    env[PROVIDER_CONTROL_HOST_TASK_ID_ENV] = context.providerControlHostTaskId;
    env[PROVIDER_CONTROL_HOST_RUN_ID_ENV] = context.providerControlHostRunId;
    env[PROVIDER_LAUNCH_SOURCE_ENV] = PROVIDER_LAUNCH_SOURCE_CONTROL_HOST;
  } else {
    const inheritedRepoConfigPath = normalizeOptionalString(env[REPO_CONFIG_PATH_ENV_KEY]);
    const preservedRepoConfigPath = resolveProviderLinearWorkerRepoConfigPath(
      inheritedEnvPaths.repoRoot,
      env
    );
    const currentPackageRoot = resolveProviderLinearWorkerEnvPath(
      context.repoRoot,
      env.CODEX_ORCHESTRATOR_PACKAGE_ROOT
    );
    const providerPackageRoot = resolveProviderLinearWorkerEnvPath(
      context.repoRoot,
      env[PROVIDER_PACKAGE_ROOT_ENV_KEY]
    );
    delete env[PROVIDER_CONTROL_HOST_TASK_ID_ENV];
    delete env[PROVIDER_CONTROL_HOST_RUN_ID_ENV];
    delete env[PROVIDER_LAUNCH_SOURCE_ENV];
    delete env[PROVIDER_LAUNCH_TOKEN_ENV];
    if (preservedRepoConfigPath) {
      env[REPO_CONFIG_PATH_ENV_KEY] = preservedRepoConfigPath;
    } else {
      delete env[REPO_CONFIG_PATH_ENV_KEY];
      if (
        inheritedRepoConfigPath &&
        (!isProviderLinearWorkerWorkspaceRoot(context.repoRoot) ||
          !existsSync(join(context.repoRoot, 'codex.orchestrator.json')))
      ) {
        env[CONFIG_AUTHORITY_MODE_ENV_KEY] = 'downstream-compatibility';
        delete env[REPO_CONFIG_REQUIRED_ENV_KEY];
      }
    }
    delete env[PROVIDER_REPO_CONFIG_PATH_ENV_KEY];
    if (currentPackageRoot && providerPackageRoot && currentPackageRoot === providerPackageRoot) {
      delete env.CODEX_ORCHESTRATOR_PACKAGE_ROOT;
    }
    delete env[PROVIDER_PACKAGE_ROOT_ENV_KEY];
  }
}

function resolveProviderLinearWorkerArtifactPathResolutionRoot(
  context: Pick<ProviderLinearWorkerContext, 'repoRoot' | 'taskId'>
): string {
  const sharedRoot = resolveProviderLinearWorkerSharedRoot(context.repoRoot);
  return sharedRoot ?? context.repoRoot;
}

function sanitizeProviderLinearWorkerArtifactDirHint(
  context: Pick<ProviderLinearWorkerContext, 'repoRoot' | 'taskId'>,
  value: string | undefined
): string | undefined {
  const normalized = normalizeOptionalString(value);
  if (!normalized || !isAbsolute(normalized)) {
    return normalized ?? undefined;
  }
  const candidate = resolve(normalized);
  const sharedRoot = resolveProviderLinearWorkerSharedRoot(context.repoRoot);
  const providerWorkspaceRoot = join(sharedRoot ?? context.repoRoot, PROVIDER_WORKSPACE_ROOT_DIRNAME);
  const currentWorkspaceRoot = isProviderLinearWorkerWorkspaceRoot(context.repoRoot)
    ? context.repoRoot
    : null;
  if (
    isPathWithinRoot(candidate, providerWorkspaceRoot) &&
    (!currentWorkspaceRoot || !isPathWithinRoot(candidate, currentWorkspaceRoot))
  ) {
    return undefined;
  }
  return candidate;
}

function resolveProviderLinearWorkerWorkspaceScopeTaskId(repoRoot: string): string | null {
  if (!isProviderLinearWorkerWorkspaceRoot(repoRoot)) {
    return null;
  }
  return basename(repoRoot);
}

function resolveProviderLinearWorkerSharedRoot(repoRoot: string): string | null {
  if (!isProviderLinearWorkerWorkspaceRoot(repoRoot)) {
    return null;
  }
  return dirname(dirname(repoRoot));
}

function isProviderLinearWorkerWorkspaceRoot(candidate: string | null): candidate is string {
  return Boolean(candidate && basename(dirname(candidate)) === PROVIDER_WORKSPACE_ROOT_DIRNAME);
}

function resolveProviderLinearWorkerRepoConfigPath(
  repoRoot: string,
  env: NodeJS.ProcessEnv
): string | null {
  const repoConfigPath = normalizeOptionalString(env[REPO_CONFIG_PATH_ENV_KEY]);
  if (!repoConfigPath) {
    return null;
  }
  const providerRepoConfigPath = normalizeOptionalString(env[PROVIDER_REPO_CONFIG_PATH_ENV_KEY]);
  const resolvedRepoConfigPath = isAbsolute(repoConfigPath)
    ? resolve(repoConfigPath)
    : resolve(repoRoot, repoConfigPath);
  const resolvedProviderRepoConfigPath = providerRepoConfigPath
    ? isAbsolute(providerRepoConfigPath)
      ? resolve(providerRepoConfigPath)
      : resolve(repoRoot, providerRepoConfigPath)
    : null;
  if (
    (resolvedProviderRepoConfigPath && resolvedRepoConfigPath === resolvedProviderRepoConfigPath) ||
    isProviderWorkflowSnapshotPath(resolvedRepoConfigPath)
  ) {
    return null;
  }
  return resolvedRepoConfigPath;
}

function resolveProviderLinearWorkerEnvPath(
  repoRoot: string,
  value: string | undefined
): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  return isAbsolute(normalized) ? resolve(normalized) : resolve(repoRoot, normalized);
}

function isProviderWorkflowSnapshotPath(candidate: string): boolean {
  if (basename(candidate) !== 'provider-workflow.last-known-good.json') {
    return false;
  }
  const runDir = dirname(candidate);
  const layoutDir = dirname(runDir);
  const taskDir = dirname(layoutDir);
  const runsRoot = dirname(taskDir);
  return basename(layoutDir) === 'cli' && ['.runs', 'runs'].includes(basename(runsRoot));
}

function contextTaskIdFromManifestPath(manifestPath: string): string | null {
  const resolvedManifestPath = resolve(manifestPath);
  const runDir = dirname(resolvedManifestPath);
  const cliDir = dirname(runDir);
  const taskDir = dirname(cliDir);
  const runsDir = dirname(taskDir);
  if (
    basename(resolvedManifestPath) !== 'manifest.json' ||
    basename(cliDir) !== 'cli' ||
    !['.runs', 'runs'].includes(basename(runsDir))
  ) {
    return null;
  }
  const taskId = sanitizeTaskId(basename(resolve(dirname(manifestPath), '..', '..')));
  return taskId.length > 0 ? taskId : null;
}

function parseProviderLinearResidentSessionSeed(
  raw: string | null | undefined
): ProviderLinearResidentSessionSeed | null {
  const normalizedRaw = normalizeOptionalString(raw);
  if (!normalizedRaw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizedRaw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const sourceRunId = normalizeOptionalString(parsed.source_run_id);
  const sourceUpdatedAt = normalizeOptionalString(parsed.source_updated_at);
  const sourceEndReason = normalizeOptionalString(parsed.source_end_reason);
  const sourceThreadId = normalizeOptionalString(parsed.source_thread_id);
  const logicalTurnCount = normalizeNonNegativeInteger(parsed.logical_turn_count);
  const restartCount = normalizePositiveInteger(parsed.restart_count);
  if (
    !sourceRunId ||
    !sourceUpdatedAt ||
    !sourceEndReason ||
    !sourceThreadId ||
    logicalTurnCount === null ||
    restartCount === null
  ) {
    return null;
  }
  return {
    source_run_id: sourceRunId,
    source_updated_at: sourceUpdatedAt,
    source_end_reason: sourceEndReason,
    source_thread_id: sourceThreadId,
    logical_turn_count: logicalTurnCount,
    restart_count: restartCount
  };
}

function buildProviderLinearResidentLogicalSessionId(issueId: string): string {
  return `linear:${issueId}:resident-session`;
}

function buildInitialProviderLinearResidentSessionState(input: {
  issueId: string;
  seed: ProviderLinearResidentSessionSeed | null;
}): ProviderLinearResidentSessionState {
  return {
    logical_session_id: buildProviderLinearResidentLogicalSessionId(input.issueId),
    logical_turn_count: input.seed?.logical_turn_count ?? 0,
    restart_count: input.seed?.restart_count ?? 0,
    continuity_state: input.seed ? 'guarded_resume_pending' : 'fresh',
    source_run_id: input.seed?.source_run_id ?? null,
    source_updated_at: input.seed?.source_updated_at ?? null,
    source_end_reason: input.seed?.source_end_reason ?? null,
    source_thread_id: input.seed?.source_thread_id ?? null
  };
}

function buildActiveProviderLinearResidentSessionState(input: {
  issueId: string;
  logicalTurnCount: number;
  seed: ProviderLinearResidentSessionSeed | null;
}): ProviderLinearResidentSessionState {
  return {
    logical_session_id: buildProviderLinearResidentLogicalSessionId(input.issueId),
    logical_turn_count: input.logicalTurnCount,
    restart_count: input.seed?.restart_count ?? 0,
    continuity_state: input.seed ? 'guarded_resume_active' : 'fresh',
    source_run_id: input.seed?.source_run_id ?? null,
    source_updated_at: input.seed?.source_updated_at ?? null,
    source_end_reason: input.seed?.source_end_reason ?? null,
    source_thread_id: input.seed?.source_thread_id ?? null
  };
}

function buildIssueDescriptionSection(issue: LiveLinearTrackedIssue): string[] {
  const description = normalizeOptionalString((issue as LiveLinearTrackedIssue & { description?: string | null }).description);
  if (!description) {
    return [];
  }
  return ['', 'Issue description:', description];
}

function buildRecentActivitySection(issue: LiveLinearTrackedIssue): string[] {
  if (!issue.recent_activity.length) {
    return [];
  }
  return [
    '',
    'Recent activity:',
    ...issue.recent_activity.map((entry) => `- ${entry.summary}${entry.created_at ? ` at ${entry.created_at}` : ''}`)
  ];
}

function buildBlockersSection(issue: LiveLinearTrackedIssue): string[] {
  if (!issue.blocked_by?.length) {
    return [];
  }
  return [
    '',
    'Known blockers:',
    ...issue.blocked_by.map((entry) => `- ${entry.identifier ?? entry.id ?? 'unknown'} (${entry.state ?? 'unknown'})`)
  ];
}

function buildCurrentIssueContextSection(issue: LiveLinearTrackedIssue): string[] {
  return [
    issue.url ? `- Linear URL: ${issue.url}` : null,
    issue.state ? `- Current state: ${issue.state}` : null,
    ...buildIssueDescriptionSection(issue),
    ...buildRecentActivitySection(issue),
    ...buildBlockersSection(issue)
  ].filter((line): line is string => Boolean(line));
}

function buildPreReviewHandoffGateSection(): string[] {
  return [
    '- Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff before opening a new PR for review handoff, before updating an already-attached PR for handoff, and before transitioning the issue to `Human Review` or `In Review`.',
    '- Use the repo heuristic for non-trivial work: about 2+ changed files or about 40+ changed lines, unless you record an explicit skip justification in the workpad.',
    '- Run the standalone review first. When manifest-backed evidence matters, use the wrapper-led review path by default; if review tooling is unavailable or stalls without a concrete verdict, do not hand off to review state unless a break-glass waiver is recorded with owner, expiry, reason, and evidence. Only after that waiver may you do a manual correctness/regressions/missing-tests review plus a manual elegance checklist as the fallback evidence.',
    '- After addressing standalone-review findings, run an explicit elegance/minimality pass before PR create/update intended for handoff and before the review-state transition.',
    '- After opening or updating a PR, run the shipped `codex-orchestrator pr ready-review --pr <number> --quiet-minutes <window>` monitor (or the equivalent repo-local wrapper) and keep the issue out of review until that bounded automated-feedback drain exits cleanly or exposes a blocker that you resolve or explicitly push back on.',
    '- Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.'
  ];
}

function buildReviewOutcomeGuidanceSection(): string[] {
  return [
    '- When `review/telemetry.json` reports `status: succeeded` with `review_outcome: bounded-success` (or a legacy succeeded payload with a preserved `termination_boundary`), record that in the workpad and validation notes as successful bounded review completion, not as a blocker or generic quiet-tail failure.',
    '- Treat `review_outcome: failed-boundary` (or legacy failed telemetry with a non-null `termination_boundary`) as an explicit review-wrapper boundary failure. Treat `failed-other` as a failed review command without a classified boundary, not as proof of wrapper breakage; keep unrelated validation, CI, or merge blockers labeled separately instead of blaming review closeout.'
  ];
}

function deriveSharedRepoCheckoutPathFallback(workerRepoRoot: string, taskId: string): string {
  const canonicalWorkerRepoRoot = resolve(workerRepoRoot);
  if (
    basename(canonicalWorkerRepoRoot) === taskId &&
    basename(dirname(canonicalWorkerRepoRoot)) === PROVIDER_WORKSPACE_ROOT_DIRNAME
  ) {
    return resolve(canonicalWorkerRepoRoot, '..', '..');
  }
  return canonicalWorkerRepoRoot;
}

function buildMergedCloseoutGuidance(sharedRepoCheckoutPath: string): string[] {
  const statusCommand = `git -C "${sharedRepoCheckoutPath}" status --short --branch`;
  const fetchCommand = `git -C "${sharedRepoCheckoutPath}" fetch origin refs/heads/main:refs/remotes/origin/main`;
  const mergeCommand = `git -C "${sharedRepoCheckoutPath}" merge --ff-only origin/main`;
  return [
    '- If the issue is in `Merging`, keep ownership and shepherd the PR through conflicts, checks, and final review until it merges.',
    `- After the PR actually merges and before moving the issue to \`Done\`, inspect the shared local repo checkout at \`${sharedRepoCheckoutPath}\` rather than the per-issue workspace, and record before/after \`${statusCommand}\` in the same workpad closeout.`,
    `- Only reconcile that shared checkout when it is on clean \`main\`: refresh the local \`origin/main\` tracking ref with \`${fetchCommand}\` and then run \`${mergeCommand}\`; if it is dirty, detached, on another branch, or otherwise unsafe to mutate, leave it untouched and record the explicit skip reason before \`Done\`.`
  ];
}

function buildRuntimeProofGuidance(helperCommand: string, issueId: string): string {
  return `- For app-touching lanes, inspect permit posture with \`${helperCommand} runtime-proof --issue-id ${issueId} --origin <app-url> --format json\`, then generate reviewer-usable handoff content with \`${helperCommand} runtime-proof --issue-id ${issueId} --origin <app-url> --kind <screenshot|external-link|video> --proof-url <reviewer-url> --title <label> --summary <what changed> --format json\`; add \`--reachability-mode dns-public\` only when you need explicit worker-local DNS public-resolution evidence. The default path stays deterministic and the helper fails closed when the permit disallows the origin or proof kind, when the proof URL is loopback/local-only, or when dns-public lookup yields non-public or unresolved answers. When the issue explicitly requires screenshot proof embedded directly in Linear, first capture it with \`${helperCommand} screenshot-proof --issue-id ${issueId} --output <path>.png --format json\` (optionally add \`--open-preview\` when you need the bounded Preview-open/cleanup path), then paste \`capture.embed_markdown\` into the workpad and refresh it with \`${helperCommand} upsert-workpad --issue-id ${issueId} --body-file <workpad.md>\`. Use direct local-file workpad embedding only when the screenshot already exists and no new capture is needed.`;
}

function buildParallelizationReasonCodesSummary(): string {
  return Object.entries(PROVIDER_LINEAR_PARALLELIZATION_REASONS)
    .map(
      ([decision, reasons]) =>
        `\`${decision}\`: ${reasons.map((reason) => `\`${reason}\``).join(', ')}`
    )
    .join('; ');
}

function buildParallelizationGuidance(helperCommand: string, issueId: string): string[] {
  const supportedPhases = resolveProviderLinearChildLaneSupportedPhases();
  const supportedPhaseList = supportedPhases.map((phase) => `\`${phase}\``).join(', ');
  return [
    `- Ordinary eligible same-issue child-lane parallelisation is a runtime contract in this lane, not optional prompt advice. During every active turn, record exactly one explicit decision with \`${helperCommand} parallelization --issue-id ${issueId} --decision <parallelize_now|stay_serial|forbid_parallel> --reason <reason-code> --summary <why>\`.`,
    `- Supported child-lane phases are ${supportedPhaseList}. Do not request unsupported \`classification\` or \`analysis\` phases; handle classification/analysis needs with parent-owned source inspection, a supported file-scoped \`docs\`/\`tests\` lane when it owns concrete files, or an explicit serial/no-go decision when no supported bounded slice exists.`,
    '- Start each ordinary active turn with a pre-turn decomposition matrix before choosing that decision. The matrix must list candidate child lanes, file/phase scope, dependencies, overlap risk, expected validation artifact, child-lane owner, and cap-slot use.',
    '- Default to `parallelize_now` when the matrix contains at least one safe independent child-lane candidate, unless the same-issue cap is already exhausted. Outside that cap-exhausted case, `stay_serial` is rejected while any safe independent candidate remains; `single_bounded_change` must explain why no docs, test, research, or review slice can be separated safely.',
    '- Safe child-lane cap: at most 2 active, pending, or unaccepted same-issue child lanes may exist at once, and that cap never bypasses CO-125 provider admission constraints. If the cap is exhausted, do not launch another lane; record the serial/no-go evidence with `stay_serial` / `existing_child_lane_active` and labeled `cap_exhausted:` evidence in the summary. Stale in-flight accept claims older than 30 minutes, and legacy in-flight claims without timestamps, are recoverable and do not consume cap slots.',
    '- Parent ownership discipline: while a child lane is active, avoid editing its delegated files or phases. If parent edits collide with delegated scope, invalidate/reject the child lane or record explicit rebase/collision reasoning before accepting any child patch.',
    `- Allowed decision and reason-code pairs: ${buildParallelizationReasonCodesSummary()}.`,
    `- If you record \`parallelize_now\`, you must actually launch at least one same-issue child lane in that turn with \`${helperCommand} child-lane --action launch ...\`, and at least one of those lanes must complete successfully before the turn ends; otherwise the provider worker fails closed.`,
    '- Retry recovery exception: when a prior-attempt same-issue child lane already completed successfully and is still pending parent acceptance, the current `parallelize_now` summary must explicitly name the recovered lane with `recover_child_lane:<stream>` and `recover_run:<run_id>` before that prior lane can satisfy the launch proof.',
    '- If you record `stay_serial` or `forbid_parallel`, choose the bounded reason code that truthfully explains why `child_lanes: []` is acceptable for this turn so the proof and debug surfaces are explicit rather than silent.',
    '- For forced child-lane validation follow-ups, if fresh current-main evidence shows the originally named `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout` clusters are both clean non-repros and no independent live cluster remains, do not invent child lanes or finish as `stay_serial`; record `forbid_parallel` with the bounded reason that matches the remaining work: use `parent_only_mutation` and close the issue directly when no live dependent work remains, and use `blocked_by_dependency` only when a real remaining dependency still exists and the issue should move to `Blocked`.'
  ];
}

function buildDeterministicMutationSuppressionSection(
  audit: ProviderLinearAuditSummary | null,
  attemptStartedAt: string | null,
  issueId: string
): string[] {
  const suppressions = deriveDeterministicProviderMutationSuppressions(audit, {
    recordedAtNotBefore: attemptStartedAt,
    issueId
  });
  if (suppressions.length === 0) {
    return [];
  }
  return [
    '- Same-attempt deterministic provider mutation suppressions are in effect for any mutation that already failed validation in this run.',
    ...suppressions.map((suppression) => `- ${suppression.instruction}`)
  ];
}

export function buildProviderWorkerPrompt(
  issue: LiveLinearTrackedIssue,
  turnNumber: number,
  maxTurns: number,
  helperCommand: string,
  sharedRepoCheckoutPath: string,
  attemptContext: {
    linearAudit?: ProviderLinearAuditSummary | null;
    attemptStartedAt?: string | null;
    manifest?: Record<string, unknown> | null;
    residentSession?: ProviderLinearResidentSessionState | null;
    continueResidentSessionOnBoot?: boolean;
  } = {}
): string {
  const deterministicMutationSuppressions = buildDeterministicMutationSuppressionSection(
    attemptContext.linearAudit ?? null,
    attemptContext.attemptStartedAt ?? null,
    issue.id
  );
  const runMemoryPromptLines = buildRunMemoryPromptLines(
    selectRunMemoryForRole({
      role: 'executor',
      manifest: attemptContext.manifest ?? null,
      hints: [issue.identifier, issue.title, issue.description ?? '']
    })
  );
  const continueResidentSessionOnBoot = attemptContext.continueResidentSessionOnBoot === true;
  const logicalTurnCount = attemptContext.residentSession?.logical_turn_count ?? 0;
  if (turnNumber > 1 || continueResidentSessionOnBoot) {
    return [
      'Continuation guidance:',
      '',
      continueResidentSessionOnBoot
        ? '- The previous provider worker drained at a guarded restart boundary; resume the same resident session instead of starting a fresh thread.'
        : '- The previous Codex turn completed normally, but the Linear issue is still in an active state.',
      continueResidentSessionOnBoot
        ? `- This is worker turn #1 of ${maxTurns} for the restarted provider worker process, continuing logical resident turn #${logicalTurnCount + 1}.`
        : `- This is continuation turn #${turnNumber} of ${maxTurns} for the current provider worker run.`,
      '- The original task instructions and prior turn context are already present in this thread, so do not restate them before acting.',
      `- Keep the same workflow contract and continue using \`${helperCommand}\` for ticket updates with Linear issue id \`${issue.id}\` (not the human identifier \`${issue.identifier}\`).`,
      '- Follow the repo-local workflow skills: `skills/linear/SKILL.md` for workpad, review, and rework behavior, and `skills/land/SKILL.md` for the merge shepherding loop once the issue reaches `Merging`.',
      `- Keep exactly one active \`## Codex Workpad\` comment current, use \`${helperCommand} issue-context --issue-id ${issue.id}\` to inspect the team workflow states before any transition, and refresh that same comment after each meaningful milestone and immediately before any review or merge handoff.`,
      '- The workpad body must keep this exact top-level structure, in order, with every section non-empty: `## Codex Workpad`, `### Environment / Workspace Stamp`, `### Plan`, `### Acceptance Criteria`, `### Validation`, `### Notes`.',
      '- `Acceptance Criteria` and `Validation` must contain non-empty checkbox list items (`- [ ] task` / `- [x] task`). `Environment / Workspace Stamp`, `Plan`, and `Notes` can stay free-form.',
      '- If the ticket includes `Validation`, `Test Plan`, or `Testing` requirements, mirror them in the workpad `Acceptance Criteria` and `Validation` sections.',
      '- If the issue is `Todo` or the live team\'s equivalent queued state (for example `Ready`) and not blocked by a non-terminal dependency, move it into the team\'s actual started state before active coding instead of assuming a fixed state name.',
      `- When you discover a meaningful out-of-scope improvement, use \`${helperCommand} create-follow-up --issue-id ${issue.id} ...\` to file or reuse a same-project follow-up issue in \`Backlog\` with a clear title, description, intent checksum, non-goals, \`Not Done If\`, acceptance criteria, a \`related\` link, the required parity matrix for parity/alignment follow-ups, and optional blocker linkage instead of expanding scope. For recurring baseline debt, pass the exact \`--canonical-owner-key\` from machine output such as \`docs:freshness:maintain\` so the helper reuses an open stamped owner before creating a new one.`,
      ...deterministicMutationSuppressions,
      '- If a PR is already attached, run a full PR feedback sweep before any new implementation work: review top-level comments, inline review comments, and review summaries; resolve each actionable item or post explicit, justified pushback.',
      buildRuntimeProofGuidance(helperCommand, issue.id),
      `- When you need bounded docs/review/planning help inside the same issue workspace, launch an audited child stream with \`${helperCommand} child-stream --pipeline <docs-review|implementation-gate|docs-relevance-advisory>\` instead of using blanket delegation-guard override text.`,
      `- When the issue benefits from bounded same-issue implementation help, use parent-owned child lanes via \`${helperCommand} child-lane --action launch --stream <name> --purpose <goal> --files <csv> --phases <csv>\`, then accept, reject, or invalidate the resulting patch artifact from the parent lane.`,
      ...buildParallelizationGuidance(helperCommand, issue.id),
      '- In provider-worker issue workspaces, valid audited child-stream and child-lane runs record manifests under the workspace-scoped artifact root; treat those manifests as the intended delegation evidence path and do not use blanket `DELEGATION_GUARD_OVERRIDE_REASON` text when they exist.',
      ...buildPreReviewHandoffGateSection(),
      ...buildReviewOutcomeGuidanceSection(),
      '- Review handoff states are `Human Review` and `In Review`; treat `In Review` as the review alias when the team exposes it.',
      '- Standalone-review policy for this provider-worker lane: before handing off to `Human Review` or `In Review`, run manifest-backed `codex-orchestrator review` / `npm run review` in this non-interactive worker session and let it execute under `FORCE_CODEX_REVIEW=1`; do not treat a printed handoff prompt as sufficient evidence.',
      '- Before handing off to the team\'s review state (`Human Review` or `In Review`), ensure required validation is green, actionable PR feedback is handled or explicitly pushed back, the latest `origin/main` is merged into the branch, PR checks are green, the `pr ready-review` drain is clean, and the workpad is refreshed to match completed work.',
      '- `Human Review` and `In Review` are review handoff states for the worker. If the issue is in either review state, do not code; refresh the workpad if needed, record the handoff clearly, and end the turn.',
      '- `Merging` and `Rework` are optional active workflow states only when the team exposes them.',
      ...buildMergedCloseoutGuidance(sharedRepoCheckoutPath),
      '- If the issue is in `Rework`, treat it as a full approach reset: close the previous PR, remove the previous workpad, create a fresh branch from `origin/main`, then restart execution under a new workpad before handing back to review.',
      ...(runMemoryPromptLines.length > 0 ? ['', ...runMemoryPromptLines] : []),
      ...(continueResidentSessionOnBoot
        ? ['', 'Fresh Linear context for this guarded restart:', ...buildCurrentIssueContextSection(issue)]
        : []),
      '- Keep final closeout in that same workpad comment instead of creating a separate terminal summary comment.',
      '- Stop coding once the issue reaches the team\'s review handoff state (`Human Review` or `In Review`) and end the turn after the handoff is complete.',
      '- Focus on the remaining ticket work and do not end the turn while the issue stays active unless you are truly blocked.'
    ].join('\n');
  }

  return [
    `You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}.`,
    '',
    'Treat this as the full first-turn task prompt for the current worker run.',
    '- Work in the current repository and workspace state.',
    '- Focus on completing the Linear issue in the current workspace.',
    '- Be concrete and action-oriented. Use tools where needed.',
    `- Use \`${helperCommand}\` for Linear reads and writes in this run with Linear issue id \`${issue.id}\` (not the human identifier \`${issue.identifier}\`).`,
    '- Follow the repo-local workflow skills: `skills/linear/SKILL.md` for workpad, review, and rework behavior, and `skills/land/SKILL.md` for the merge shepherding loop once the issue reaches `Merging`.',
    `- Use \`${helperCommand} issue-context --issue-id ${issue.id}\` to inspect the team workflow states before any transition.`,
    '- If the issue is `Todo` or the live team\'s equivalent queued state (for example `Ready`) and not blocked by a non-terminal dependency, move it into the team\'s actual started state before active coding instead of assuming a fixed state name.',
    `- When you discover a meaningful out-of-scope improvement, use \`${helperCommand} create-follow-up --issue-id ${issue.id} ...\` to file or reuse a same-project follow-up issue in \`Backlog\` with a clear title, description, intent checksum, non-goals, \`Not Done If\`, acceptance criteria, a \`related\` link, the required parity matrix for parity/alignment follow-ups, and optional blocker linkage instead of expanding scope. For recurring baseline debt, pass the exact \`--canonical-owner-key\` from machine output such as \`docs:freshness:maintain\` so the helper reuses an open stamped owner before creating a new one.`,
    '- Maintain exactly one active `## Codex Workpad` comment on the issue. Reuse and update it in place during a single attempt; on `Rework`, remove the old workpad before creating the fresh reset workpad. Do not create extra progress or summary comments.',
    '- Keep the workpad body in this exact top-level order, with every section non-empty: `## Codex Workpad`, `### Environment / Workspace Stamp`, `### Plan`, `### Acceptance Criteria`, `### Validation`, `### Notes`.',
    '- `Acceptance Criteria` and `Validation` must contain non-empty checkbox list items (`- [ ] task` / `- [x] task`). `Environment / Workspace Stamp`, `Plan`, and `Notes` can stay free-form.',
    '- If the ticket includes `Validation`, `Test Plan`, or `Testing` requirements, mirror them in the workpad `Acceptance Criteria` and `Validation` sections.',
    '- Refresh the same workpad after each meaningful milestone and immediately before any review or merge handoff. Keep final closeout in that same workpad comment.',
    '- If a PR is already attached, run a full PR feedback sweep before any new implementation work: review top-level comments, inline review comments, and review summaries; resolve each actionable item or post explicit, justified pushback.',
    ...deterministicMutationSuppressions,
    buildRuntimeProofGuidance(helperCommand, issue.id),
    `- When you need bounded docs/review/planning help inside the same issue workspace, launch an audited child stream with \`${helperCommand} child-stream --pipeline <docs-review|implementation-gate|docs-relevance-advisory>\` instead of using blanket delegation-guard override text.`,
    `- When the issue benefits from bounded same-issue implementation help, use parent-owned child lanes via \`${helperCommand} child-lane --action launch --stream <name> --purpose <goal> --files <csv> --phases <csv>\`, then accept, reject, or invalidate the resulting patch artifact from the parent lane.`,
    ...buildParallelizationGuidance(helperCommand, issue.id),
    '- In provider-worker issue workspaces, valid audited child-stream and child-lane runs record manifests under the workspace-scoped artifact root; treat those manifests as the intended delegation evidence path and do not use blanket `DELEGATION_GUARD_OVERRIDE_REASON` text when they exist.',
    ...buildPreReviewHandoffGateSection(),
    ...buildReviewOutcomeGuidanceSection(),
    '- Review handoff states are `Human Review` and `In Review`; treat `In Review` as the review alias when the team exposes it.',
    '- Standalone-review policy for this provider-worker lane: before handing off to `Human Review` or `In Review`, run manifest-backed `codex-orchestrator review` / `npm run review` in this non-interactive worker session and let it execute under `FORCE_CODEX_REVIEW=1`; do not treat a printed handoff prompt as sufficient evidence.',
    '- Attach the PR to the Linear issue before handing off to the team\'s review state (`Human Review` or `In Review`).',
    '- Before handing off to the team\'s review state (`Human Review` or `In Review`), ensure required validation is green, actionable PR feedback is handled or explicitly pushed back, the latest `origin/main` is merged into the branch, PR checks are green, the `pr ready-review` drain is clean, and the workpad is refreshed to match completed work.',
    '- `Human Review` and `In Review` are stop-coding handoff states. If the issue is in either review state, do not code; refresh the workpad if needed, record the handoff clearly, and end the turn.',
    '- Treat `Merging` and `Rework` as active workflow states only when the team exposes them.',
    ...buildMergedCloseoutGuidance(sharedRepoCheckoutPath),
    '- If the issue is in `Rework`, treat it as a full approach reset: close the previous PR, remove the previous workpad, create a fresh branch from `origin/main`, then restart execution under a new workpad before handing back to review.',
    ...(runMemoryPromptLines.length > 0 ? ['', ...runMemoryPromptLines] : []),
    `- This is turn #1 of ${maxTurns} for the current worker run.`,
    ...buildCurrentIssueContextSection(issue)
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

export function parseProviderLinearWorkerJsonl(
  raw: string,
  env: NodeJS.ProcessEnv = process.env
): ProviderLinearWorkerJsonlParseResult {
  const state = buildEmptyProviderLinearWorkerJsonlParseResult();

  for (const line of raw.split(/\r?\n/u)) {
    applyProviderLinearWorkerJsonlLine(state, line, 'stdout_jsonl', env);
  }

  return snapshotProviderLinearWorkerPublicJsonlParseResult(state);
}

function snapshotProviderLinearWorkerPublicJsonlParseResult(
  state: ProviderLinearWorkerJsonlParseResult
): ProviderLinearWorkerJsonlParseResult {
  return initializeProviderLinearWorkerJsonlInternalState({
    threadId: state.threadId,
    turnId: state.turnId,
    finalMessage: state.finalMessage,
    lastEvent: state.lastEvent,
    lastEventAt: state.lastEventAt,
    currentTurnActivity: state.currentTurnActivity,
    tokens: state.tokens,
    rateLimits: state.rateLimits,
    authProvenance: state.authProvenance,
    failureDiagnosis: state.failureDiagnosis
  }, state.finalMessageSource, state.finalMessageDeltaKey);
}

function buildEmptyProviderLinearWorkerJsonlParseResult(): ProviderLinearWorkerJsonlParseResult {
  return initializeProviderLinearWorkerJsonlInternalState({
    threadId: null,
    turnId: null,
    finalMessage: null,
    lastEvent: null,
    lastEventAt: null,
    currentTurnActivity: null,
    tokens: buildEmptyProviderLinearWorkerTokenUsage(),
    rateLimits: null,
    authProvenance: null,
    failureDiagnosis: null
  });
}

function initializeProviderLinearWorkerJsonlInternalState(
  state: ProviderLinearWorkerJsonlParseResult,
  finalMessageSource: ProviderLinearWorkerJsonlParseResult['finalMessageSource'] = null,
  finalMessageDeltaKey: string | null = null
): ProviderLinearWorkerJsonlParseResult {
  Object.defineProperty(state, 'finalMessageSource', {
    value: finalMessageSource,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(state, 'finalMessageDeltaKey', {
    value: finalMessageSource === 'agent_message_delta' ? finalMessageDeltaKey : null,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(state, 'agentMessageDeltaBuffers', {
    value: {},
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(state, 'agentMessageDeltaSourceBuffers', {
    value: {},
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(state, 'agentMessageDeltaHydrationSeed', {
    value: null,
    writable: true,
    enumerable: false,
    configurable: true
  });
  return state;
}

function normalizeProviderLinearWorkerFinalMessageSource(
  value: unknown
): ProviderLinearWorkerJsonlParseResult['finalMessageSource'] {
  return value === 'agent_message_delta' || value === 'other' ? value : null;
}

function selectProviderLinearWorkerProofFinalMessageSource(
  proof: ProviderLinearWorkerProof
): ProviderLinearWorkerJsonlParseResult['finalMessageSource'] {
  if (!proof.last_message) {
    return null;
  }
  return normalizeProviderLinearWorkerFinalMessageSource(proof.last_message_source) ?? 'other';
}

function selectProviderLinearWorkerProofFinalMessageDeltaKey(
  proof: ProviderLinearWorkerProof
): string | null {
  if (selectProviderLinearWorkerProofFinalMessageSource(proof) !== 'agent_message_delta') {
    return null;
  }
  return normalizeOptionalString(proof.last_message_delta_key);
}

function applyProviderLinearWorkerJsonlLine(
  state: ProviderLinearWorkerJsonlParseResult,
  line: string,
  activitySource: ProviderLinearWorkerCurrentTurnActivitySource = 'stdout_jsonl',
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) {
    return false;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return applyProviderLinearWorkerJsonlRecord(state, parsed, activitySource, env);
  } catch {
    return false;
  }
}

function applyProviderLinearWorkerJsonlRecord(
  state: ProviderLinearWorkerJsonlParseResult,
  parsed: Record<string, unknown>,
  activitySource: ProviderLinearWorkerCurrentTurnActivitySource,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  let changed = false;
  let threadChanged = false;
  const payload = isRecord(parsed.payload) ? parsed.payload : null;
  if (parsed.type === 'session_meta' && payload) {
    const nextThreadId = normalizeOptionalString(payload.id);
    if (nextThreadId && nextThreadId !== state.threadId) {
      threadChanged = state.threadId !== null;
      state.threadId = nextThreadId;
      changed = true;
    }
  }
  if (parsed.type === 'thread.started' && typeof parsed.thread_id === 'string') {
    if (parsed.thread_id !== state.threadId) {
      threadChanged = state.threadId !== null;
      state.threadId = parsed.thread_id;
      changed = true;
    }
  }
  if (threadChanged) {
    // A bookkeeping-only thread swap should not relabel stale turn-scoped activity onto the new session.
    resetProviderLinearWorkerTurnScopedTelemetry(state);
    state.turnId = null;
  }
  if (parsed.type === 'turn_context' && payload) {
    const nextTurnId = normalizeOptionalString(payload.turn_id);
    if (nextTurnId && nextTurnId !== state.turnId) {
      resetProviderLinearWorkerTurnScopedTelemetry(state);
      state.turnId = nextTurnId;
      changed = true;
    }
  }
  if (parsed.type === 'event_msg' && payload && payload.type === 'task_complete') {
    const nextTurnId = normalizeOptionalString(payload.turn_id);
    if (nextTurnId && nextTurnId !== state.turnId) {
      resetProviderLinearWorkerTurnScopedTelemetry(state);
      state.turnId = nextTurnId;
      changed = true;
    }
  }
  if (isProviderLinearWorkerBookkeepingRecord(parsed)) {
    const synchronizedCurrentTurnActivity = synchronizeProviderLinearWorkerCurrentTurnActivity(
      state.currentTurnActivity,
      state.threadId,
      state.turnId
    );
    if (
      JSON.stringify(synchronizedCurrentTurnActivity) !== JSON.stringify(state.currentTurnActivity)
    ) {
      state.currentTurnActivity = synchronizedCurrentTurnActivity;
      changed = true;
    }
    return changed;
  }
  let eventSummary = extractProviderWorkerEventSummary(parsed);
  const accumulatedAgentMessage = accumulateProviderWorkerAgentMessageDelta(
    state,
    parsed,
    activitySource
  );
  const finalMessageSource = accumulatedAgentMessage ? 'agent_message_delta' : 'other';
  if (accumulatedAgentMessage) {
    eventSummary = {
      ...eventSummary,
      event: eventSummary.event ?? 'item/agentMessage/delta',
      message: accumulatedAgentMessage
    };
  }
  if (eventSummary.event && eventSummary.event !== state.lastEvent) {
    state.lastEvent = eventSummary.event;
    changed = true;
  }
  if (eventSummary.at && eventSummary.at !== state.lastEventAt) {
    state.lastEventAt = eventSummary.at;
    changed = true;
  }
  if (
    eventSummary.message &&
    eventSummary.message !== state.finalMessage &&
    shouldReplaceProviderLinearWorkerFinalMessage(
      state.finalMessage,
      state.finalMessageSource,
      eventSummary.message,
      finalMessageSource,
      parsed
    )
  ) {
    state.finalMessage = eventSummary.message;
    state.finalMessageSource = finalMessageSource;
    state.finalMessageDeltaKey =
      finalMessageSource === 'agent_message_delta' ? state.finalMessageDeltaKey ?? null : null;
    changed = true;
  }
  const nextCurrentTurnActivity = selectPreferredProviderLinearWorkerCurrentTurnActivity(
    state.currentTurnActivity,
    buildProviderLinearWorkerCurrentTurnActivityCandidate({
      parsed,
      eventSummary,
      threadId: state.threadId,
      defaultTurnId: state.turnId,
      source: activitySource
    })
  );
  if (
    JSON.stringify(nextCurrentTurnActivity) !== JSON.stringify(state.currentTurnActivity)
  ) {
    state.currentTurnActivity = nextCurrentTurnActivity;
    changed = true;
  }
  const observedTokens = extractProviderWorkerTokenUsage(parsed);
  if (observedTokens && hasProviderWorkerTokenUsage(observedTokens)) {
    state.tokens = mergeProviderWorkerObservedTokenUsage(state.tokens, observedTokens);
    changed = true;
  }
  const observedRateLimits = extractProviderWorkerRateLimits(parsed);
  if (observedRateLimits) {
    state.rateLimits = observedRateLimits;
    changed = true;
  }
  const observedAuthProvenance = extractProviderWorkerAuthProvenance(parsed, activitySource, env);
  if (observedAuthProvenance) {
    state.authProvenance = mergeProviderWorkerAuthProvenance(
      state.authProvenance,
      observedAuthProvenance
    );
    changed = true;
  }
  const observedFailureDiagnosis = classifyProviderWorkerFailureDiagnosis(parsed, activitySource);
  if (observedFailureDiagnosis) {
    state.failureDiagnosis = observedFailureDiagnosis;
    changed = true;
  }
  const synchronizedCurrentTurnActivity = synchronizeProviderLinearWorkerCurrentTurnActivity(
    state.currentTurnActivity,
    state.threadId,
    state.turnId
  );
  if (
    JSON.stringify(synchronizedCurrentTurnActivity) !== JSON.stringify(state.currentTurnActivity)
  ) {
    state.currentTurnActivity = synchronizedCurrentTurnActivity;
    changed = true;
  }
  return changed;
}

function applyProviderLinearWorkerSessionJsonlRecord(
  state: ProviderLinearWorkerJsonlParseResult,
  parsed: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return applyProviderLinearWorkerJsonlRecord(state, parsed, 'session_log_hydration', env);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resetProviderLinearWorkerTurnScopedTelemetry(
  state: ProviderLinearWorkerJsonlParseResult
): void {
  state.lastEvent = null;
  state.finalMessage = null;
  state.finalMessageSource = null;
  state.finalMessageDeltaKey = null;
  state.agentMessageDeltaBuffers = {};
  state.agentMessageDeltaSourceBuffers = {};
  state.agentMessageDeltaHydrationSeed = null;
  state.lastEventAt = null;
  state.currentTurnActivity = null;
  state.failureDiagnosis = null;
}

function isProviderLinearWorkerBookkeepingRecord(parsed: Record<string, unknown>): boolean {
  return parsed.type === 'session_meta' || parsed.type === 'turn_context' || parsed.type === 'thread.started';
}

function readProviderWorkerMethod(input: Record<string, unknown>): string | null {
  const payload = isRecord(input.payload) ? input.payload : null;
  return normalizeOptionalString(input.method) ?? normalizeOptionalString(payload?.method);
}

function readProviderWorkerParams(input: Record<string, unknown>): Record<string, unknown> | null {
  const payload = isRecord(input.payload) ? input.payload : null;
  return isRecord(input.params) ? input.params : isRecord(payload?.params) ? payload.params : null;
}

function readFirstProviderWorkerRawStringAtPaths(
  input: Record<string, unknown>,
  paths: string[][]
): string | null {
  for (const path of paths) {
    let current: unknown = input;
    for (const segment of path) {
      if (!isRecord(current)) {
        current = undefined;
        break;
      }
      current = current[segment];
    }
    if (typeof current === 'string') {
      return current;
    }
  }
  return null;
}

function accumulateProviderWorkerAgentMessageDelta(
  state: ProviderLinearWorkerJsonlParseResult,
  parsed: Record<string, unknown>,
  activitySource: ProviderLinearWorkerCurrentTurnActivitySource
): string | null {
  if (readProviderWorkerMethod(parsed)?.toLowerCase() !== 'item/agentmessage/delta') {
    return null;
  }
  const delta = readFirstProviderWorkerRawStringAtPaths(parsed, [
    ['params', 'delta'],
    ['payload', 'params', 'delta'],
    ['delta'],
    ['payload', 'delta']
  ]);
  if (delta === null) {
    return null;
  }
  const params = readProviderWorkerParams(parsed);
  const threadId =
    normalizeOptionalString(params?.threadId) ??
    normalizeOptionalString(params?.thread_id) ??
    state.threadId ??
    'unknown-thread';
  const turnId = extractProviderWorkerActivityTurnId(parsed) ?? state.turnId ?? 'unknown-turn';
  const itemId =
    normalizeOptionalString(params?.itemId) ??
    normalizeOptionalString(params?.item_id) ??
    'unknown-item';
  const key = `${threadId}:${turnId}:${itemId}`;
  state.agentMessageDeltaBuffers ??= {};
  state.agentMessageDeltaSourceBuffers ??= {};
  const sourceBuffers = state.agentMessageDeltaSourceBuffers[key] ?? {};
  state.agentMessageDeltaSourceBuffers[key] = sourceBuffers;
  let existingMessage = state.agentMessageDeltaBuffers[key];
  let existingSourceMessage = sourceBuffers[activitySource];
  const hydrationSeed = state.agentMessageDeltaHydrationSeed ?? null;
  if (
    existingMessage === undefined &&
    hydrationSeed &&
    providerWorkerAgentMessageDeltaHydrationSeedMatches(hydrationSeed, key, threadId, turnId)
  ) {
    existingMessage = hydrationSeed.message;
    existingSourceMessage = hydrationSeed.message;
    state.agentMessageDeltaHydrationSeed = null;
  }
  const accumulatedSourceMessage = `${existingSourceMessage ?? ''}${delta}`;
  sourceBuffers[activitySource] = accumulatedSourceMessage;
  const accumulated = mergeProviderWorkerAgentMessageDeltaAggregate(
    existingMessage,
    accumulatedSourceMessage,
    delta
  );
  state.agentMessageDeltaBuffers[key] = accumulated;
  state.finalMessageDeltaKey = key;
  return accumulated;
}

function mergeProviderWorkerAgentMessageDeltaAggregate(
  existingMessage: string | undefined,
  accumulatedSourceMessage: string,
  delta: string
): string {
  if (existingMessage === undefined) {
    return accumulatedSourceMessage;
  }
  if (accumulatedSourceMessage === existingMessage) {
    return existingMessage;
  }
  if (accumulatedSourceMessage.startsWith(existingMessage)) {
    return accumulatedSourceMessage;
  }
  if (existingMessage.startsWith(accumulatedSourceMessage)) {
    return existingMessage;
  }
  return `${existingMessage}${delta}`;
}

function providerWorkerAgentMessageDeltaHydrationSeedMatches(
  seed: ProviderWorkerAgentMessageDeltaHydrationSeed,
  key: string,
  threadId: string,
  turnId: string
): boolean {
  return (
    seed.deltaKey === key &&
    (seed.threadId === null || seed.threadId === threadId) &&
    (seed.turnId === null || seed.turnId === turnId)
  );
}

function shouldReplaceProviderLinearWorkerFinalMessage(
  currentMessage: string | null,
  currentSource: ProviderLinearWorkerJsonlParseResult['finalMessageSource'],
  candidateMessage: string,
  candidateSource: ProviderLinearWorkerJsonlParseResult['finalMessageSource'],
  parsed: Record<string, unknown>
): boolean {
  if (!currentMessage) {
    return true;
  }
  if (candidateSource === 'agent_message_delta') {
    return true;
  }
  const method = readProviderWorkerMethod(parsed)?.toLowerCase();
  if (currentSource === 'agent_message_delta' && method) {
    return false;
  }
  return Boolean(candidateMessage);
}

function hasProviderWorkerTokenUsage(value: ProviderLinearWorkerTokenUsage): boolean {
  return (
    value.input_tokens !== null ||
    value.output_tokens !== null ||
    value.total_tokens !== null ||
    value.reasoning_output_tokens != null
  );
}

function maxProviderWorkerNullableNumber(left: number | null, right: number | null): number | null {
  if (left === null) {
    return right;
  }
  if (right === null) {
    return left;
  }
  return Math.max(left, right);
}

function mergeProviderWorkerTokenUsageFloor(
  current: ProviderLinearWorkerTokenUsage,
  observed: ProviderLinearWorkerTokenUsage
): ProviderLinearWorkerTokenUsage {
  const merged: ProviderLinearWorkerTokenUsage = {
    input_tokens: maxProviderWorkerNullableNumber(current.input_tokens, observed.input_tokens),
    output_tokens: maxProviderWorkerNullableNumber(current.output_tokens, observed.output_tokens),
    total_tokens: maxProviderWorkerNullableNumber(current.total_tokens, observed.total_tokens)
  };
  const reasoningOutputTokens = maxProviderWorkerNullableNumber(
    current.reasoning_output_tokens ?? null,
    observed.reasoning_output_tokens ?? null
  );
  if (reasoningOutputTokens !== null) {
    merged.reasoning_output_tokens = reasoningOutputTokens;
  }
  return merged;
}

function mergeProviderWorkerObservedTokenUsage(
  current: ProviderLinearWorkerTokenUsage,
  observed: ProviderLinearWorkerTokenUsage
): ProviderLinearWorkerTokenUsage {
  const merged: ProviderLinearWorkerTokenUsage = {
    input_tokens: observed.input_tokens ?? current.input_tokens,
    output_tokens: observed.output_tokens ?? current.output_tokens,
    total_tokens: observed.total_tokens ?? current.total_tokens
  };
  const reasoningOutputTokens =
    observed.reasoning_output_tokens ?? current.reasoning_output_tokens ?? null;
  if (reasoningOutputTokens !== null) {
    merged.reasoning_output_tokens = reasoningOutputTokens;
  }
  return merged;
}

function providerWorkerTokenUsageFallsBehindFloor(
  current: ProviderLinearWorkerTokenUsage,
  observed: ProviderLinearWorkerTokenUsage | null
): boolean {
  return (
    observed !== null &&
    current.total_tokens !== null &&
    observed.total_tokens !== null &&
    observed.total_tokens < current.total_tokens
  );
}

function providerWorkerTokenUsageAdvancesFloor(
  current: ProviderLinearWorkerTokenUsage,
  observed: ProviderLinearWorkerTokenUsage | null
): boolean {
  return (
    observed !== null &&
    observed.total_tokens !== null &&
    (current.total_tokens === null || observed.total_tokens > current.total_tokens)
  );
}

function extractProviderWorkerEventSummary(input: Record<string, unknown>): {
  event: string | null;
  message: string | null;
  at: string | null;
} {
  const payload = isRecord(input.payload) ? input.payload : null;
  const timestamp =
    normalizeOptionalString(input.timestamp) ??
    (payload
      ? normalizeOptionalString(payload.timestamp) ??
        normalizeOptionalString(payload.created_at) ??
        normalizeOptionalString(payload.at)
      : null);
  if (input.type === 'event_msg' && payload) {
    return {
      event: normalizeOptionalString(payload.type),
      message: normalizeOptionalString(payload.message),
      at: timestamp
    };
  }
  if (
    input.type === 'response_item' &&
    payload &&
    payload.type === 'message' &&
    Array.isArray(payload.content)
  ) {
    let outputText: string | null = null;
    for (const item of payload.content) {
      if (isRecord(item) && item.type === 'output_text') {
        outputText = normalizeOptionalString(item.text) ?? outputText;
      }
    }
    return {
      event: outputText ? 'message' : null,
      message: outputText,
      at: timestamp
    };
  }
  const method =
    normalizeOptionalString(input.method) ??
    normalizeOptionalString(payload?.method);
  if (method) {
    return {
      event: method,
      message: humanizeProviderWorkerMethod(method, input),
      at: timestamp
    };
  }
  return {
    event: normalizeOptionalString(input.type),
    message: null,
    at: timestamp
  };
}

function buildProviderLinearWorkerCurrentTurnActivityCandidate(input: {
  parsed: Record<string, unknown>;
  eventSummary: { event: string | null; message: string | null; at: string | null };
  threadId: string | null;
  defaultTurnId: string | null;
  source: ProviderLinearWorkerCurrentTurnActivitySource;
}): ProviderLinearWorkerCurrentTurnActivity | null {
  const event = normalizeOptionalString(input.eventSummary.event);
  const message = normalizeOptionalString(input.eventSummary.message);
  const recordedAt = normalizeOptionalString(input.eventSummary.at);
  if (!event && !message) {
    return null;
  }
  const turnId = extractProviderWorkerActivityTurnId(input.parsed) ?? input.defaultTurnId;
  const session = deriveLatestTurnSessionId({
    threadId: input.threadId,
    turnId
  });
  return {
    event,
    message_or_payload: message,
    recorded_at: recordedAt,
    source: input.source,
    turn_id: turnId,
    session_id: session.sessionId
  };
}

function extractProviderWorkerActivityTurnId(parsed: Record<string, unknown>): string | null {
  if (typeof parsed.turn_id === 'string') {
    return normalizeOptionalString(parsed.turn_id);
  }
  const payload = isRecord(parsed.payload) ? parsed.payload : null;
  const params = isRecord(parsed.params) ? parsed.params : null;
  const payloadParams = isRecord(payload?.params) ? payload.params : null;
  return (
    normalizeOptionalString(payload?.turn_id) ??
    normalizeOptionalString(params?.turnId) ??
    normalizeOptionalString(params?.turn_id) ??
    normalizeOptionalString(payloadParams?.turnId) ??
    normalizeOptionalString(payloadParams?.turn_id)
  );
}

function synchronizeProviderLinearWorkerCurrentTurnActivity(
  activity: ProviderLinearWorkerCurrentTurnActivity | null,
  threadId: string | null,
  defaultTurnId: string | null
): ProviderLinearWorkerCurrentTurnActivity | null {
  if (!activity) {
    return null;
  }
  const turnId = activity.turn_id ?? defaultTurnId;
  const session = deriveLatestTurnSessionId({
    threadId,
    turnId
  });
  return {
    ...activity,
    turn_id: turnId,
    session_id: session.sessionId
  };
}

function selectPreferredProviderLinearWorkerCurrentTurnActivity(
  current: ProviderLinearWorkerCurrentTurnActivity | null,
  candidate: ProviderLinearWorkerCurrentTurnActivity | null
): ProviderLinearWorkerCurrentTurnActivity | null {
  if (!candidate) {
    return current;
  }
  if (!current) {
    return candidate;
  }
  const currentSignalRank = scoreProviderLinearWorkerCurrentTurnActivity(current);
  const candidateSignalRank = scoreProviderLinearWorkerCurrentTurnActivity(candidate);
  if (candidateSignalRank !== currentSignalRank) {
    return candidateSignalRank > currentSignalRank ? candidate : current;
  }
  const recordedAtComparison = compareIsoTimestamp(candidate.recorded_at, current.recorded_at);
  if (recordedAtComparison !== 0) {
    return recordedAtComparison > 0 ? candidate : current;
  }
  const sourcePriorityComparison =
    providerLinearWorkerCurrentTurnActivitySourcePriority(candidate.source) -
    providerLinearWorkerCurrentTurnActivitySourcePriority(current.source);
  if (sourcePriorityComparison !== 0) {
    return sourcePriorityComparison > 0 ? candidate : current;
  }
  return current;
}

function scoreProviderLinearWorkerCurrentTurnActivity(
  activity: ProviderLinearWorkerCurrentTurnActivity
): number {
  const message = normalizeOptionalString(activity.message_or_payload);
  if (message && isHighSignalProviderProgressSummary(message)) {
    return 3;
  }
  if (message) {
    return 2;
  }
  if (normalizeOptionalString(activity.event)) {
    return 1;
  }
  return 0;
}

function providerLinearWorkerCurrentTurnActivitySourcePriority(
  source: ProviderLinearWorkerCurrentTurnActivitySource
): number {
  switch (source) {
    case 'stdout_jsonl':
      return 2;
    case 'session_log_hydration':
      return 1;
    default:
      return 0;
  }
}

function extractProviderWorkerTokenUsage(input: unknown): ProviderLinearWorkerTokenUsage | null {
  if (!isRecord(input)) {
    return null;
  }

  const directTotalUsage = findRecordAtPaths(input, [
    ['payload', 'info', 'total_token_usage'],
    ['payload', 'info', 'last_token_usage'],
    ['params', 'msg', 'payload', 'info', 'total_token_usage'],
    ['params', 'msg', 'info', 'total_token_usage'],
    ['payload', 'params', 'tokenUsage', 'total'],
    ['params', 'tokenUsage', 'total'],
    ['tokenUsage', 'total'],
    ['payload', 'params', 'usage'],
    ['params', 'usage'],
    ['usage'],
    ['payload', 'params', 'tokenUsage'],
    ['params', 'tokenUsage'],
    ['tokenUsage']
  ]);
  const normalizedDirectUsage = normalizeProviderWorkerTokenUsage(directTotalUsage);
  if (normalizedDirectUsage) {
    return normalizedDirectUsage;
  }

  const eventType = normalizeOptionalString(input.type);
  const method =
    normalizeOptionalString(input.method) ??
    normalizeOptionalString((input.payload as Record<string, unknown> | undefined)?.method);
  if (eventType === 'turn.completed' || method === 'turn/completed' || method === 'turn_completed') {
    const turnUsage = normalizeProviderWorkerTokenUsage(
      findRecordAtPaths(input, [
        ['usage'],
        ['payload', 'usage'],
        ['payload', 'params', 'usage'],
        ['params', 'usage']
      ])
    );
    if (turnUsage) {
      return turnUsage;
    }
  }

  return null;
}

function normalizeProviderWorkerTokenUsage(
  input: Record<string, unknown> | null
): ProviderLinearWorkerTokenUsage | null {
  if (!input) {
    return null;
  }
  const inputTokens = readTokenCount(input, [
    'input_tokens',
    'inputTokens',
    'total_input_tokens',
    'totalInputTokens',
    'input'
  ]);
  const outputTokens = readTokenCount(input, [
    'output_tokens',
    'outputTokens',
    'total_output_tokens',
    'totalOutputTokens',
    'output'
  ]);
  const totalTokens = readTokenCount(input, [
    'total_tokens',
    'totalTokens',
    'total'
  ]);
  const reasoningOutputTokens = readTokenCount(input, [
    'reasoning_output_tokens',
    'reasoningOutputTokens',
    'total_reasoning_output_tokens',
    'totalReasoningOutputTokens',
    'reasoning_tokens',
    'reasoningTokens'
  ]);
  const normalizedTotalTokens =
    totalTokens ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
  if (
    inputTokens === null &&
    outputTokens === null &&
    normalizedTotalTokens === null &&
    reasoningOutputTokens === null
  ) {
    return null;
  }
  const usage: ProviderLinearWorkerTokenUsage = {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: normalizedTotalTokens
  };
  if (reasoningOutputTokens !== null) {
    usage.reasoning_output_tokens = reasoningOutputTokens;
  }
  return usage;
}

function readTokenCount(input: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }
  }
  return null;
}

function extractProviderWorkerRateLimits(input: unknown): Record<string, unknown> | null {
  if (!isRecord(input)) {
    return null;
  }
  if (isProviderWorkerRateLimitsRecord(input)) {
    return input;
  }
  const candidatePaths = [
    ['rate_limits'],
    ['payload', 'rate_limits'],
    ['params', 'rateLimits'],
    ['params', 'rate_limits'],
    ['payload', 'params', 'rateLimits'],
    ['payload', 'params', 'rate_limits'],
    ['params', 'msg', 'payload', 'info', 'rate_limits'],
    ['params', 'msg', 'info', 'rate_limits'],
    ['params', 'msg', 'payload', 'info', 'rateLimits'],
    ['params', 'msg', 'info', 'rateLimits'],
    ['payload', 'params', 'msg', 'payload', 'info', 'rate_limits'],
    ['payload', 'params', 'msg', 'info', 'rate_limits'],
    ['payload', 'params', 'msg', 'payload', 'info', 'rateLimits'],
    ['payload', 'params', 'msg', 'info', 'rateLimits'],
    ['rateLimits'],
    ['payload', 'rateLimits']
  ];
  for (const candidatePath of candidatePaths) {
    const candidate = findRecordAtPath(input, candidatePath);
    if (candidate && isProviderWorkerRateLimitsRecord(candidate)) {
      return candidate;
    }
  }
  return null;
}

function isProviderWorkerRateLimitsRecord(input: Record<string, unknown>): boolean {
  const primary = isRecord(input.primary) ? input.primary : null;
  const secondary = isRecord(input.secondary) ? input.secondary : null;
  return hasProviderWorkerRateLimitBucketSummary(primary) || hasProviderWorkerRateLimitBucketSummary(secondary);
}

function findValueAtPath(input: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = input;
  for (const segment of path) {
    if (!isRecord(current)) {
      return null;
    }
    current = current[segment];
  }
  return current;
}

const PROVIDER_WORKER_CREDENTIAL_SOURCE_LABELS = new Set([
  'api_key',
  'browser_login',
  'chatgpt_login',
  'cloud_env',
  'codex_login',
  'config',
  'credential_store',
  'device_auth',
  'env',
  'keychain',
  'oauth',
  'runtime_env',
  'unknown'
]);

const PROVIDER_WORKER_CREDENTIAL_SOURCE_ENV_KEYS = new Set([
  'CHATGPT_AUTH_TOKEN',
  'CODEX_API_KEY',
  'CODEX_AUTH_TOKEN',
  'OPENAI_API_KEY',
  'OPENAI_AUTH_TOKEN'
]);

const PROVIDER_WORKER_AUTH_FRESHNESS_LABELS = new Set([
  'credential_event_present',
  'credential_source_unknown',
  'event_observed',
  'env_credential_present',
  'expired',
  'fresh',
  'missing',
  'observed',
  'recent',
  'stale',
  'unknown',
  'valid'
]);

const PROVIDER_WORKER_ACCOUNT_PLAN_LABELS = new Set([
  'enterprise',
  'free',
  'plus',
  'pro',
  'prolite',
  'team',
  'unknown',
  'unknown_plan'
]);

const PROVIDER_WORKER_WHAM_PLAN_LABELS = new Set([
  'none',
  'unknown',
  'unknown_plan',
  'unknown_wham_plan'
]);

function normalizeProviderWorkerSafeLabel(
  value: unknown,
  allowedLabels: Set<string>,
  fallbackLabel = 'redacted'
): string | null {
  const raw = normalizeOptionalString(value);
  if (!raw) {
    return null;
  }
  if (
    /(?:bearer\s+|sk-[a-z0-9]|token\s*[:=]|api[_-]?key\s*[:=]|authorization\s*[:=]|cookie\s*[:=])/iu.test(raw)
    || raw.length > 96
  ) {
    return null;
  }
  const envMatch = /^env:([A-Za-z0-9_]+)$/u.exec(raw.trim());
  if (envMatch) {
    const envKey = envMatch[1].toUpperCase();
    return PROVIDER_WORKER_CREDENTIAL_SOURCE_ENV_KEYS.has(envKey) ? `env:${envKey}` : fallbackLabel;
  }
  const normalized = raw.replace(/[-\s]+/gu, '_').toLowerCase();
  return allowedLabels.has(normalized) ? normalized : fallbackLabel;
}

function normalizeProviderWorkerCredentialSource(value: unknown): string | null {
  return normalizeProviderWorkerSafeLabel(value, PROVIDER_WORKER_CREDENTIAL_SOURCE_LABELS);
}

function normalizeProviderWorkerAuthFreshness(value: unknown): string | null {
  return normalizeProviderWorkerSafeLabel(value, PROVIDER_WORKER_AUTH_FRESHNESS_LABELS);
}

function normalizeProviderWorkerPlanLabel(
  value: unknown,
  allowedLabels: Set<string>
): string | null {
  return normalizeProviderWorkerSafeLabel(value, allowedLabels);
}

function fingerprintProviderWorkerAuthValue(
  value: unknown,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return null;
  }
  return fingerprintAuthProvenanceValue(value, env);
}

function fingerprintProviderWorkerEnvAuthValue(
  value: unknown,
  env: NodeJS.ProcessEnv
): string | null {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return null;
  }
  return fingerprintAuthProvenanceValue(value, env);
}

function readFirstProviderWorkerStringAtPaths(
  input: Record<string, unknown>,
  paths: string[][]
): string | null {
  for (const path of paths) {
    const value = normalizeOptionalString(findValueAtPath(input, path));
    if (value) {
      return value;
    }
  }
  return null;
}

function readFirstProviderWorkerFingerprintAtPaths(
  input: Record<string, unknown>,
  paths: string[][],
  env: NodeJS.ProcessEnv = process.env
): string | null {
  for (const path of paths) {
    const fingerprint = fingerprintProviderWorkerAuthValue(findValueAtPath(input, path), env);
    if (fingerprint) {
      return fingerprint;
    }
  }
  return null;
}

function readProviderWorkerStructuredDiagnosticCategoryValues(input: Record<string, unknown>): string[] {
  const payload = isRecord(input.payload) ? input.payload : null;
  const params = isRecord(input.params) ? input.params : null;
  const payloadParams = isRecord(payload?.params) ? payload.params : null;
  const failureDiagnosis = isRecord(input.failure_diagnosis) ? input.failure_diagnosis : null;
  const payloadFailureDiagnosis = isRecord(payload?.failure_diagnosis) ? payload.failure_diagnosis : null;
  const paramsFailureDiagnosis = isRecord(params?.failure_diagnosis) ? params.failure_diagnosis : null;
  const payloadParamsFailureDiagnosis =
    isRecord(payloadParams?.failure_diagnosis) ? payloadParams.failure_diagnosis : null;
  return [
    normalizeOptionalString(input.diagnostic_category),
    normalizeOptionalString(input.diagnosticCategory),
    normalizeOptionalString(failureDiagnosis?.diagnostic_category),
    normalizeOptionalString(failureDiagnosis?.diagnosticCategory),
    normalizeOptionalString(payload?.diagnostic_category),
    normalizeOptionalString(payload?.diagnosticCategory),
    normalizeOptionalString(payloadFailureDiagnosis?.diagnostic_category),
    normalizeOptionalString(payloadFailureDiagnosis?.diagnosticCategory),
    normalizeOptionalString(params?.diagnostic_category),
    normalizeOptionalString(params?.diagnosticCategory),
    normalizeOptionalString(paramsFailureDiagnosis?.diagnostic_category),
    normalizeOptionalString(paramsFailureDiagnosis?.diagnosticCategory),
    normalizeOptionalString(payloadParams?.diagnostic_category),
    normalizeOptionalString(payloadParams?.diagnosticCategory),
    normalizeOptionalString(payloadParamsFailureDiagnosis?.diagnostic_category),
    normalizeOptionalString(payloadParamsFailureDiagnosis?.diagnosticCategory)
  ].filter((value): value is string => Boolean(value));
}

function readProviderWorkerStructuredDiagnosticValues(input: Record<string, unknown>): string[] {
  const payload = isRecord(input.payload) ? input.payload : null;
  const params = isRecord(input.params) ? input.params : null;
  const payloadParams = isRecord(payload?.params) ? payload.params : null;
  return [
    ...readProviderWorkerStructuredDiagnosticCategoryValues(input),
    normalizeOptionalString(input.method),
    normalizeOptionalString(input.type),
    normalizeOptionalString(input.status_detail),
    normalizeOptionalString(input.statusDetail),
    normalizeOptionalString(input.status),
    normalizeOptionalString(payload?.method),
    normalizeOptionalString(payload?.type),
    normalizeOptionalString(payload?.status_detail),
    normalizeOptionalString(payload?.statusDetail),
    normalizeOptionalString(payload?.status),
    normalizeOptionalString(params?.method),
    normalizeOptionalString(params?.type),
    normalizeOptionalString(params?.status_detail),
    normalizeOptionalString(params?.statusDetail),
    normalizeOptionalString(params?.status),
    normalizeOptionalString(payloadParams?.method),
    normalizeOptionalString(payloadParams?.type),
    normalizeOptionalString(payloadParams?.status_detail),
    normalizeOptionalString(payloadParams?.statusDetail),
    normalizeOptionalString(payloadParams?.status)
  ].filter((value): value is string => Boolean(value));
}

function normalizeProviderWorkerStructuredDiagnosticValue(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
    .replace(/[^A-Za-z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '')
    .replace(/_+/gu, '_')
    .toLowerCase();
}

function isProviderWorkerAuthProvenanceCarrier(input: Record<string, unknown>): boolean {
  if (
    readFirstProviderWorkerStringAtPaths(input, [
      ['credential_source'],
      ['credentialSource'],
      ['auth_source'],
      ['authSource'],
      ['auth_freshness'],
      ['authFreshness'],
      ['payload', 'credential_source'],
      ['payload', 'credentialSource'],
      ['payload', 'auth_source'],
      ['payload', 'authSource'],
      ['payload', 'auth_freshness'],
      ['payload', 'authFreshness'],
      ['params', 'credential_source'],
      ['params', 'credentialSource'],
      ['params', 'auth_source'],
      ['params', 'authSource'],
      ['params', 'auth_freshness'],
      ['params', 'authFreshness']
    ])
  ) {
    return true;
  }
  if (
    findRecordAtPaths(input, [
      ['auth'],
      ['params', 'auth'],
      ['payload', 'auth'],
      ['payload', 'params', 'auth']
    ])
  ) {
    return true;
  }
  return readProviderWorkerStructuredDiagnosticValues(input)
    .map(normalizeProviderWorkerStructuredDiagnosticValue)
    .some((value) =>
      /\bauth\b/u.test(value.replace(/_/gu, ' ')) ||
      value.includes('auth_profile') ||
      value.includes('authprofile') ||
      value.includes('credential') ||
      value.includes('login') ||
      value.includes('oauth') ||
      value.includes('device_auth')
    );
}

function extractProviderWorkerAuthProvenance(
  input: Record<string, unknown>,
  source: ProviderLinearWorkerCurrentTurnActivitySource,
  env: NodeJS.ProcessEnv = process.env
): ProviderLinearWorkerAuthProvenance | null {
  if (!isProviderWorkerAuthProvenanceCarrier(input)) {
    return null;
  }
  const profileFingerprint = readFirstProviderWorkerFingerprintAtPaths(
    input,
    [
      ['auth_profile'],
      ['authProfile'],
      ['profile'],
      ['profile_id'],
      ['profileId'],
      ['auth', 'auth_profile'],
      ['auth', 'authProfile'],
      ['auth', 'profile'],
      ['auth', 'profile_id'],
      ['auth', 'profileId'],
      ['params', 'auth_profile'],
      ['params', 'authProfile'],
      ['params', 'profile'],
      ['params', 'profile_id'],
      ['params', 'profileId'],
      ['params', 'auth', 'auth_profile'],
      ['params', 'auth', 'authProfile'],
      ['params', 'auth', 'profile'],
      ['params', 'auth', 'profile_id'],
      ['params', 'auth', 'profileId'],
      ['payload', 'auth_profile'],
      ['payload', 'authProfile'],
      ['payload', 'profile'],
      ['payload', 'profile_id'],
      ['payload', 'profileId'],
      ['payload', 'auth', 'auth_profile'],
      ['payload', 'auth', 'authProfile'],
      ['payload', 'auth', 'profile'],
      ['payload', 'auth', 'profile_id'],
      ['payload', 'auth', 'profileId'],
      ['payload', 'params', 'auth_profile'],
      ['payload', 'params', 'authProfile'],
      ['payload', 'params', 'profile'],
      ['payload', 'params', 'profile_id'],
      ['payload', 'params', 'profileId'],
      ['payload', 'params', 'auth', 'auth_profile'],
      ['payload', 'params', 'auth', 'authProfile'],
      ['payload', 'params', 'auth', 'profile'],
      ['payload', 'params', 'auth', 'profile_id'],
      ['payload', 'params', 'auth', 'profileId']
    ],
    env
  );
  const accountFingerprint = readFirstProviderWorkerFingerprintAtPaths(
    input,
    [
      ['account_id'],
      ['accountId'],
      ['account'],
      ['organization_id'],
      ['organizationId'],
      ['org_id'],
      ['orgId'],
      ['email'],
      ['auth', 'account_id'],
      ['auth', 'accountId'],
      ['auth', 'account'],
      ['auth', 'account', 'id'],
      ['auth', 'account', 'email'],
      ['auth', 'organization_id'],
      ['auth', 'organizationId'],
      ['auth', 'org_id'],
      ['auth', 'orgId'],
      ['params', 'account_id'],
      ['params', 'accountId'],
      ['params', 'account'],
      ['params', 'account', 'id'],
      ['params', 'account', 'email'],
      ['params', 'organization_id'],
      ['params', 'organizationId'],
      ['params', 'org_id'],
      ['params', 'orgId'],
      ['params', 'auth', 'account'],
      ['params', 'auth', 'account', 'id'],
      ['params', 'auth', 'account', 'email'],
      ['params', 'auth', 'account_id'],
      ['params', 'auth', 'accountId'],
      ['params', 'auth', 'organization_id'],
      ['params', 'auth', 'organizationId'],
      ['params', 'auth', 'org_id'],
      ['params', 'auth', 'orgId'],
      ['payload', 'account_id'],
      ['payload', 'accountId'],
      ['payload', 'account'],
      ['payload', 'account', 'id'],
      ['payload', 'account', 'email'],
      ['payload', 'organization_id'],
      ['payload', 'organizationId'],
      ['payload', 'org_id'],
      ['payload', 'orgId'],
      ['payload', 'auth', 'account_id'],
      ['payload', 'auth', 'accountId'],
      ['payload', 'auth', 'account'],
      ['payload', 'auth', 'account', 'id'],
      ['payload', 'auth', 'account', 'email'],
      ['payload', 'auth', 'organization_id'],
      ['payload', 'auth', 'organizationId'],
      ['payload', 'auth', 'org_id'],
      ['payload', 'auth', 'orgId'],
      ['payload', 'params', 'account_id'],
      ['payload', 'params', 'accountId'],
      ['payload', 'params', 'account'],
      ['payload', 'params', 'account', 'id'],
      ['payload', 'params', 'account', 'email'],
      ['payload', 'params', 'organization_id'],
      ['payload', 'params', 'organizationId'],
      ['payload', 'params', 'org_id'],
      ['payload', 'params', 'orgId'],
      ['payload', 'params', 'auth', 'account'],
      ['payload', 'params', 'auth', 'account', 'id'],
      ['payload', 'params', 'auth', 'account', 'email'],
      ['payload', 'params', 'auth', 'account_id'],
      ['payload', 'params', 'auth', 'accountId'],
      ['payload', 'params', 'auth', 'organization_id'],
      ['payload', 'params', 'auth', 'organizationId'],
      ['payload', 'params', 'auth', 'org_id'],
      ['payload', 'params', 'auth', 'orgId']
    ],
    env
  );
  const credentialSource =
    normalizeProviderWorkerCredentialSource(
      readFirstProviderWorkerStringAtPaths(input, [
        ['credential_source'],
        ['credentialSource'],
        ['auth_source'],
        ['authSource'],
        ['auth', 'credential_source'],
        ['auth', 'credentialSource'],
        ['auth', 'auth_source'],
        ['auth', 'authSource'],
        ['params', 'credential_source'],
        ['params', 'credentialSource'],
        ['params', 'auth_source'],
        ['params', 'authSource'],
        ['params', 'auth', 'credential_source'],
        ['params', 'auth', 'credentialSource'],
        ['params', 'auth', 'auth_source'],
        ['params', 'auth', 'authSource'],
        ['payload', 'credential_source'],
        ['payload', 'credentialSource'],
        ['payload', 'auth_source'],
        ['payload', 'authSource'],
        ['payload', 'auth', 'credential_source'],
        ['payload', 'auth', 'credentialSource'],
        ['payload', 'auth', 'auth_source'],
        ['payload', 'auth', 'authSource'],
        ['payload', 'params', 'credential_source'],
        ['payload', 'params', 'credentialSource'],
        ['payload', 'params', 'auth_source'],
        ['payload', 'params', 'authSource'],
        ['payload', 'params', 'auth', 'credential_source'],
        ['payload', 'params', 'auth', 'credentialSource'],
        ['payload', 'params', 'auth', 'auth_source'],
        ['payload', 'params', 'auth', 'authSource']
      ])
    ) ?? null;
  const authFreshness = normalizeProviderWorkerAuthFreshness(
    readFirstProviderWorkerStringAtPaths(input, [
      ['auth_freshness'],
      ['authFreshness'],
      ['freshness'],
      ['auth', 'auth_freshness'],
      ['auth', 'authFreshness'],
      ['auth', 'freshness'],
      ['params', 'auth_freshness'],
      ['params', 'authFreshness'],
      ['params', 'freshness'],
      ['params', 'auth', 'auth_freshness'],
      ['params', 'auth', 'authFreshness'],
      ['params', 'auth', 'freshness'],
      ['payload', 'auth_freshness'],
      ['payload', 'authFreshness'],
      ['payload', 'freshness'],
      ['payload', 'auth', 'auth_freshness'],
      ['payload', 'auth', 'authFreshness'],
      ['payload', 'auth', 'freshness'],
      ['payload', 'params', 'auth_freshness'],
      ['payload', 'params', 'authFreshness'],
      ['payload', 'params', 'freshness'],
      ['payload', 'params', 'auth', 'auth_freshness'],
      ['payload', 'params', 'auth', 'authFreshness'],
      ['payload', 'params', 'auth', 'freshness']
    ])
  );
  if (
    !profileFingerprint &&
    !accountFingerprint &&
    !credentialSource &&
    !authFreshness
  ) {
    return null;
  }
  const timestamp =
    normalizeOptionalString(input.timestamp) ??
    normalizeOptionalString((input.payload as Record<string, unknown> | undefined)?.timestamp);
  return {
    provider_kind: 'codex',
    runtime_mode: null,
    runtime_provider: null,
    active_profile_fingerprint: profileFingerprint,
    active_account_fingerprint: accountFingerprint,
    cloud_env_id: null,
    cloud_branch: null,
    credential_source: credentialSource,
    auth_freshness: authFreshness ?? (credentialSource ? 'credential_event_present' : 'event_observed'),
    observed_at: timestamp,
    source
  };
}

function mergeProviderWorkerAuthProvenance(
  current: ProviderLinearWorkerAuthProvenance | null | undefined,
  observed: ProviderLinearWorkerAuthProvenance | null | undefined
): ProviderLinearWorkerAuthProvenance | null {
  if (!current) {
    return observed ?? null;
  }
  if (!observed) {
    return current;
  }
  const currentObservedAt = Date.parse(current.observed_at ?? '');
  const observedObservedAt = Date.parse(observed.observed_at ?? '');
  const observedIsNewer =
    Number.isFinite(currentObservedAt) && Number.isFinite(observedObservedAt)
      ? observedObservedAt >= currentObservedAt
      : true;
  const preferObserved = <T>(currentValue: T | null, observedValue: T | null): T | null =>
    observedIsNewer ? (observedValue ?? currentValue) : currentValue;
  return {
    provider_kind: preferObserved(current.provider_kind, observed.provider_kind),
    runtime_mode: preferObserved(current.runtime_mode, observed.runtime_mode),
    runtime_provider: preferObserved(current.runtime_provider, observed.runtime_provider),
    active_profile_fingerprint: preferObserved(
      current.active_profile_fingerprint,
      observed.active_profile_fingerprint
    ),
    active_account_fingerprint: preferObserved(
      current.active_account_fingerprint,
      observed.active_account_fingerprint
    ),
    cloud_env_id: preferObserved(current.cloud_env_id, observed.cloud_env_id),
    cloud_branch: preferObserved(current.cloud_branch, observed.cloud_branch),
    credential_source: preferObserved(current.credential_source, observed.credential_source),
    auth_freshness: preferObserved(current.auth_freshness, observed.auth_freshness),
    observed_at: preferObserved(current.observed_at, observed.observed_at),
    source: preferObserved(current.source, observed.source)
  };
}

function formatProviderWorkerRedactedPlanValue(label: string, value: string): string {
  const allowedLabels = /wham/iu.test(label)
    ? PROVIDER_WORKER_WHAM_PLAN_LABELS
    : PROVIDER_WORKER_ACCOUNT_PLAN_LABELS;
  return normalizeProviderWorkerPlanLabel(value, allowedLabels) ?? 'redacted';
}

function redactProviderWorkerFreeFormPlanDetails(raw: string): string {
  return raw
    .replace(
      /(["'])(accountPlan|account_plan|whamPlan|wham_plan)\1\s*[=:]\s*(?:"([^"]*)"|'([^']*)'|([A-Za-z0-9][A-Za-z0-9_-]*))/giu,
      (
        _match,
        quote: string,
        label: string,
        doubleQuotedValue: string | undefined,
        singleQuotedValue: string | undefined,
        bareValue: string | undefined
      ) => {
        const value = doubleQuotedValue ?? singleQuotedValue ?? bareValue ?? '';
        return `${quote}${label}${quote}:"${formatProviderWorkerRedactedPlanValue(label, value)}"`;
      }
    )
    .replace(
      /\b(accountPlan|account_plan|whamPlan|wham_plan)\s*[=:]\s*["']?([A-Za-z0-9][A-Za-z0-9_-]*)["']?/giu,
      (_match, label: string, value: string) =>
        `${label}=${formatProviderWorkerRedactedPlanValue(label, value)}`
    )
    .replace(
      /\b((?:account\s+)?plan|wham\s+plan)\s+(?:is\s+|was\s+)?["']?([A-Za-z0-9][A-Za-z0-9_-]*)["']?/giu,
      (_match, label: string, value: string) =>
        `${label} ${formatProviderWorkerRedactedPlanValue(label, value)}`
    );
}

function redactProviderWorkerDiagnosticText(raw: string): string {
  return redactProviderWorkerFreeFormPlanDetails(raw)
    .replace(/\bBearer\s+(?!token\b)[A-Za-z0-9._~+/=-]+/giu, 'Bearer <redacted>')
    .replace(/sk-[A-Za-z0-9_-]+/gu, 'sk-<redacted>')
    .replace(
      /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/gu,
      '<email-redacted>'
    )
    .replace(
      /(["'])([A-Za-z0-9_-]*(?:token|secret|credential|api[_-]?key)[A-Za-z0-9_-]*|oauth[_-]?(?:refresh|access)|authorization|cookie|session(?:[_-]?id)?)\1\s*[=:]\s*(?:"[^"]*"|'[^']*'|[^\s,}]+)/giu,
      '$1$2$1:"<redacted>"'
    )
    .replace(
      /(["'])((?:(?:refresh|access|auth|session|bearer)\s+token|oauth\s+(?:refresh|access)|api\s+key|authorization|cookie|secret|credential|session\s+(?:id|identifier)))\1\s*[=:]\s*(?:"[^"]*"|'[^']*'|[^\s,}]+)/giu,
      '$1$2$1:"<redacted>"'
    )
    .replace(
      /(["'])((?:auth[_-]?)?profile(?:[_-]?id)?|account(?:[_-]?id)?|org(?:anization)?(?:[_-]?id)?|user(?:[_-]?id)?)\1\s*:\s*(?:"[^"]*"|'[^']*'|[^\s,}]+)/giu,
      '$1$2$1:"<redacted>"'
    )
    .replace(
      /(["'])((?:auth[\s_-]?)?profile\s+(?:id|identifier)|account\s+(?:id|identifier)|org(?:anization)?\s+(?:id|identifier)|user\s+(?:id|identifier))\1\s*[=:]\s*(?:"[^"]*"|'[^']*'|[^\s,}]+)/giu,
      '$1$2$1:"<redacted>"'
    )
    .replace(
      /\b([A-Za-z0-9_-]*(?:token|secret|credential|api[_-]?key)[A-Za-z0-9_-]*|oauth[_-]?(?:refresh|access)|authorization|cookie|session(?:[_-]?id)?)\s*[=:]\s*\S+/giu,
      '$1=<redacted>'
    )
    .replace(
      /\b((?:refresh|access|auth|session|bearer)\s+token|oauth\s+(?:refresh|access)|api\s+key|authorization|cookie|secret|credential|session\s+(?:id|identifier))\s*[=:]\s*(?:"[^"]*"|'[^']*'|\S+)/giu,
      '$1=<redacted>'
    )
    .replace(
      /\b([A-Za-z0-9_-]*(?:(?:refresh|access|auth)[A-Za-z0-9_-]*token|api[_-]?key|secret|credential)[A-Za-z0-9_-]*|oauth[_-]?(?:refresh|access)|authorization|cookie|session[_-]?id)\s+["']?[A-Za-z0-9][A-Za-z0-9._~+/=@:-]*["']?/giu,
      '$1 <redacted>'
    )
    .replace(
      /\b(session\s+(?:id|identifier))\s+["']?[A-Za-z0-9][A-Za-z0-9._~+/=@:-]*["']?/giu,
      '$1 <redacted>'
    )
    .replace(
      /\b((?:refresh|access|auth|session)\s+token|api\s+key|token(?!\s+(?:quota|limit|rate(?:\s+limit)?|usage\s+limit)\b)|secret|credential)\s+["']?[A-Za-z0-9][A-Za-z0-9._~+/=@:-]*["']?/giu,
      '$1 <redacted>'
    )
    .replace(
      /\b((?:auth[_-]?)?profile(?:[_-]?id)?|account(?:[_-]?id)?|org(?:anization)?(?:[_-]?id)?|user(?:[_-]?id)?)\s*[=:]\s*(?:"[^"]+"|'[^']+'|\S+)/giu,
      '$1=<redacted>'
    )
    .replace(/\b(acct|org|user)([_-])[A-Za-z0-9_-]+\b/giu, '$1$2<redacted>')
    .replace(
      /\b((?:auth[\s_-]?)?profile|account|org(?:anization)?|user)\s+(id|identifier)\s*[=:]\s*(?:"[^"]+"|'[^']+'|\S+)/giu,
      '$1 $2 <redacted>'
    )
    .replace(
      /\b((?:auth[\s_-]?)?profile|account|org(?:anization)?|user)\s+(?:id|identifier)\s+["']?[A-Za-z0-9][A-Za-z0-9._@-]*["']?/giu,
      '$1 id <redacted>'
    )
    .replace(
      /\b((?:auth[\s_-]?)?profile|account|org(?:anization)?|user)\s+["']?[A-Za-z0-9][A-Za-z0-9._@-]*(?:[_@.-][A-Za-z0-9._@-]+)["']?/giu,
      '$1 <redacted>'
    );
}

const PROVIDER_WORKER_DIAGNOSTIC_SIGNAL_MAX_LENGTH = 500;

interface ProviderWorkerDiagnosticSignal {
  classificationSignal: string;
  signal: string;
}

function truncateProviderWorkerDiagnosticSignal(signal: string, preservedFields: string[]): string {
  if (signal.length <= PROVIDER_WORKER_DIAGNOSTIC_SIGNAL_MAX_LENGTH) {
    return signal;
  }
  const preservedSuffix = Array.from(new Set(preservedFields))
    .filter((field) => field.length > 0 && signal.includes(field))
    .join(' | ');
  if (!preservedSuffix) {
    return signal.slice(0, PROVIDER_WORKER_DIAGNOSTIC_SIGNAL_MAX_LENGTH);
  }
  if (preservedSuffix.length >= PROVIDER_WORKER_DIAGNOSTIC_SIGNAL_MAX_LENGTH) {
    return preservedSuffix.slice(0, PROVIDER_WORKER_DIAGNOSTIC_SIGNAL_MAX_LENGTH);
  }
  const separator = ' | ';
  const prefixBudget =
    PROVIDER_WORKER_DIAGNOSTIC_SIGNAL_MAX_LENGTH - preservedSuffix.length - separator.length;
  const prefix = signal
    .slice(0, Math.max(0, prefixBudget))
    .replace(/\s*\|\s*$/u, '')
    .trimEnd();
  return (prefix ? `${prefix}${separator}${preservedSuffix}` : preservedSuffix).slice(
    0,
    PROVIDER_WORKER_DIAGNOSTIC_SIGNAL_MAX_LENGTH
  );
}

function formatProviderWorkerDiagnosticSignalField(
  label: string,
  value: unknown,
  options: { allowedLabels?: Set<string> } = {}
): string | null {
  const raw = normalizeOptionalString(value);
  if (!raw) {
    return null;
  }
  const redacted = (
    options.allowedLabels
      ? normalizeProviderWorkerPlanLabel(raw, options.allowedLabels)
      : redactProviderWorkerDiagnosticText(raw).replace(/\s+/gu, '_').slice(0, 96)
  );
  if (!redacted) {
    return null;
  }
  return `${label}=${redacted}`;
}

function normalizeProviderWorkerDiagnosticClassificationText(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .replace(/[_\-/]+/gu, ' ')
    .toLowerCase();
}

function isProviderWorkerTrustedDiagnosticMessageCarrier(
  input: Record<string, unknown>,
  source: ProviderLinearWorkerCurrentTurnActivitySource
): boolean {
  if (source === 'stderr' || source === 'exec_runner' || source === 'appserver_runner') {
    return true;
  }
  const payload = isRecord(input.payload) ? input.payload : null;
  const method =
    normalizeOptionalString(input.method) ??
    normalizeOptionalString(payload?.method);
  if (method) {
    return true;
  }
  const eventType = normalizeOptionalString(input.type)?.toLowerCase() ?? '';
  const payloadType = normalizeOptionalString(payload?.type)?.toLowerCase() ?? '';
  const payloadStatus = normalizeOptionalString(payload?.status)?.toLowerCase() ?? '';
  if (['error', 'warning', 'diagnostic', 'notification', 'turn.failed', 'run.failed'].includes(eventType)) {
    return true;
  }
  if (eventType !== 'event_msg') {
    return false;
  }
  return (
    ['diagnostic', 'error', 'guardian_policy_denial', 'guardian_timeout', 'tui_history', 'warning'].includes(
      payloadType
    ) ||
    ['error', 'failed', 'failure'].includes(payloadStatus)
  );
}

function buildProviderWorkerDiagnosticSignalParts(
  input: Record<string, unknown>,
  source: ProviderLinearWorkerCurrentTurnActivitySource
): ProviderWorkerDiagnosticSignal {
  const includeDiagnosticMessage = isProviderWorkerTrustedDiagnosticMessageCarrier(input, source);
  const payload = isRecord(input.payload) ? input.payload : null;
  const params = isRecord(input.params) ? input.params : null;
  const payloadParams = isRecord(payload?.params) ? payload.params : null;
  const accountPlanField = formatProviderWorkerDiagnosticSignalField(
    'account_plan',
    readFirstProviderWorkerStringAtPaths(input, [
      ['account_plan'],
      ['accountPlan'],
      ['plan'],
      ['params', 'account_plan'],
      ['params', 'accountPlan'],
      ['params', 'plan'],
      ['payload', 'account_plan'],
      ['payload', 'accountPlan'],
      ['payload', 'plan'],
      ['payload', 'params', 'account_plan'],
      ['payload', 'params', 'accountPlan'],
      ['payload', 'params', 'plan'],
      ['params', 'msg', 'payload', 'info', 'account_plan'],
      ['params', 'msg', 'payload', 'info', 'accountPlan'],
      ['params', 'msg', 'payload', 'info', 'plan'],
      ['params', 'msg', 'info', 'account_plan'],
      ['params', 'msg', 'info', 'accountPlan'],
      ['params', 'msg', 'info', 'plan'],
      ['payload', 'params', 'msg', 'payload', 'info', 'account_plan'],
      ['payload', 'params', 'msg', 'payload', 'info', 'accountPlan'],
      ['payload', 'params', 'msg', 'payload', 'info', 'plan'],
      ['payload', 'params', 'msg', 'info', 'account_plan'],
      ['payload', 'params', 'msg', 'info', 'accountPlan'],
      ['payload', 'params', 'msg', 'info', 'plan']
    ]),
    { allowedLabels: PROVIDER_WORKER_ACCOUNT_PLAN_LABELS }
  );
  const whamPlanField = formatProviderWorkerDiagnosticSignalField(
    'wham_plan',
    readFirstProviderWorkerStringAtPaths(input, [
      ['wham_plan'],
      ['whamPlan'],
      ['params', 'wham_plan'],
      ['params', 'whamPlan'],
      ['payload', 'wham_plan'],
      ['payload', 'whamPlan'],
      ['payload', 'params', 'wham_plan'],
      ['payload', 'params', 'whamPlan'],
      ['params', 'msg', 'payload', 'info', 'wham_plan'],
      ['params', 'msg', 'payload', 'info', 'whamPlan'],
      ['params', 'msg', 'info', 'wham_plan'],
      ['params', 'msg', 'info', 'whamPlan'],
      ['payload', 'params', 'msg', 'payload', 'info', 'wham_plan'],
      ['payload', 'params', 'msg', 'payload', 'info', 'whamPlan'],
      ['payload', 'params', 'msg', 'info', 'wham_plan'],
      ['payload', 'params', 'msg', 'info', 'whamPlan']
    ]),
    { allowedLabels: PROVIDER_WORKER_WHAM_PLAN_LABELS }
  );
  const preservedFields = [accountPlanField, whamPlanField].filter(
    (value): value is string => Boolean(value)
  );
  const candidates = [
    ...readProviderWorkerStructuredDiagnosticCategoryValues(input),
    normalizeOptionalString(input.method),
    normalizeOptionalString(input.type),
    normalizeOptionalString(input.error),
    includeDiagnosticMessage ? normalizeOptionalString(input.message) : null,
    normalizeOptionalString(input.status),
    normalizeOptionalString(input.status_detail),
    normalizeOptionalString(input.statusDetail),
    normalizeOptionalString(payload?.method),
    normalizeOptionalString(payload?.type),
    normalizeOptionalString(payload?.error),
    includeDiagnosticMessage ? normalizeOptionalString(payload?.message) : null,
    normalizeOptionalString(payload?.status),
    normalizeOptionalString(payload?.status_detail),
    normalizeOptionalString(payload?.statusDetail),
    normalizeOptionalString(params?.error),
    includeDiagnosticMessage ? normalizeOptionalString(params?.message) : null,
    normalizeOptionalString(params?.status),
    normalizeOptionalString(params?.status_detail),
    normalizeOptionalString(params?.statusDetail),
    normalizeOptionalString(payloadParams?.error),
    includeDiagnosticMessage ? normalizeOptionalString(payloadParams?.message) : null,
    normalizeOptionalString(payloadParams?.status),
    normalizeOptionalString(payloadParams?.status_detail),
    normalizeOptionalString(payloadParams?.statusDetail),
    ...preservedFields
  ].filter((value): value is string => Boolean(value));
  const classificationSignal = redactProviderWorkerDiagnosticText(candidates.join(' | '));
  return {
    classificationSignal,
    signal: truncateProviderWorkerDiagnosticSignal(classificationSignal, preservedFields)
  };
}

function buildProviderWorkerDiagnosticSignal(
  input: Record<string, unknown>,
  source: ProviderLinearWorkerCurrentTurnActivitySource
): string {
  return buildProviderWorkerDiagnosticSignalParts(input, source).signal;
}

function hasProviderWorkerQuotaFailureSignal(
  input: Record<string, unknown>,
  normalizedSignal: string
): boolean {
  const explicitQuotaFailurePatterns = [
    /\b429\b/u,
    /\btoo many requests\b/u,
    /\btokens?\s+(?:quota|limit)\s+(?:exceeded|exhausted|reached)\b/u,
    /\btoken rate[-\s]?limits? (?:exceeded|exhausted|reached)\b/u,
    /\bquota (?:exceeded|exhausted|reached)\b/u,
    /\brate[-\s]?limited\b/u,
    /\brate[-\s]?limits? (?:exceeded|exhausted|reached)\b/u,
    /\brate[-\s]?limits?\s+for\s+tokens?\s+(?:exceeded|exhausted|reached)\b/u,
    /\busage limit (?:exceeded|exhausted|reached)\b/u,
    /\bout of quota\b/u
  ];
  if (explicitQuotaFailurePatterns.some((pattern) => pattern.test(normalizedSignal))) {
    return true;
  }
  const payload = isRecord(input.payload) ? input.payload : null;
  const params = isRecord(input.params) ? input.params : null;
  const method =
    normalizeOptionalString(input.method) ??
    normalizeOptionalString(payload?.method);
  const normalizedMethod = method ? normalizeProviderWorkerDiagnosticClassificationText(method) : '';
  if (
    /\b(rate limits?|quota|usage limit)\b/u.test(normalizedMethod) &&
    /\b(exceeded|exhausted|failed|failure|limited|blocked|denied)\b/u.test(normalizedMethod)
  ) {
    return true;
  }
  const statusValues = [
    normalizeOptionalString(input.type),
    normalizeOptionalString(input.status),
    normalizeOptionalString(input.status_detail),
    normalizeOptionalString(input.statusDetail),
    normalizeOptionalString(payload?.type),
    normalizeOptionalString(payload?.status),
    normalizeOptionalString(payload?.status_detail),
    normalizeOptionalString(payload?.statusDetail),
    normalizeOptionalString(params?.status),
    normalizeOptionalString(params?.status_detail),
    normalizeOptionalString(params?.statusDetail)
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/[_\-\s]+/gu, '_').toLowerCase());
  const quotaFailureStatuses = new Set([
    'quota_rate_limit',
    'quota_exhausted',
    'quota_exceeded',
    'rate_limit',
    'rate_limited',
    'rate_limit_exceeded',
    'usage_limit_reached'
  ]);
  return statusValues.some((value) => quotaFailureStatuses.has(value));
}

function hasProviderWorkerStdinBootstrapSignal(normalizedSignal: string): boolean {
  return /\breading\s+additional\s+input\s+from\s+stdin\b/u.test(normalizedSignal);
}

const PROVIDER_WORKER_STDIN_BOOTSTRAP_DIAGNOSTIC_VALUES = new Set([
  'provider_stdin_bootstrap',
  'provider_worker_stdin_bootstrap',
  'codex_stdin_bootstrap',
  'stdin_bootstrap',
  'stdin_bootstrap_failure',
  'reading_additional_input_from_stdin',
  'reading_additional_input_stdin',
  'additional_input_from_stdin'
]);

const PROVIDER_WORKER_RUNTIME_DIAGNOSTIC_VALUES = new Set([
  ...PROVIDER_WORKER_STDIN_BOOTSTRAP_DIAGNOSTIC_VALUES,
  'provider_runtime',
  'runtime_parity_command_unavailable',
  'appserver_runtime_error',
  'codex_exec_error'
]);

function classifyProviderWorkerFailureDiagnosis(
  input: Record<string, unknown>,
  source: ProviderLinearWorkerCurrentTurnActivitySource
): ProviderLinearWorkerFailureDiagnosis | null {
  const signalParts = buildProviderWorkerDiagnosticSignalParts(input, source);
  const signal = signalParts.signal;
  const normalizedClassification = normalizeProviderWorkerDiagnosticClassificationText(
    signalParts.classificationSignal
  );
  const timestamp =
    normalizeOptionalString(input.timestamp) ??
    normalizeOptionalString((input.payload as Record<string, unknown> | undefined)?.timestamp);
  const build = (
    diagnosticCategory: ProviderLinearWorkerDiagnosticCategory,
    guidance: string
  ): ProviderLinearWorkerFailureDiagnosis => ({
    diagnostic_category: diagnosticCategory,
    signal,
    guidance,
    source,
    observed_at: timestamp
  });
  const structuredCategory = classifyProviderWorkerStructuredDiagnosticCategory(input);
  const hasStdinBootstrapSignal = hasProviderWorkerStdinBootstrapSignal(normalizedClassification);
  if (structuredCategory && structuredCategory !== 'provider_runtime') {
    return build(structuredCategory, providerWorkerDiagnosticGuidance(structuredCategory));
  }
  const guardianTimeoutSignal =
    normalizedClassification.includes('guardian') &&
    /\b(time(?:d)?\s*out|timeout)\b/u.test(normalizedClassification);
  const guardianPolicyDenialSignal =
    normalizedClassification.includes('guardian') &&
    /\b(policy|deni(?:al|ed)|blocked|refused)\b/u.test(normalizedClassification);
  const guardianPolicyDenialContrast =
    guardianTimeoutSignal &&
    /\b(?:do not|don't|not|rather than|instead of)\b.{0,96}\bpolicy denial\b/u.test(
      normalizedClassification
    );
  if (guardianPolicyDenialSignal && !guardianPolicyDenialContrast) {
    return build(
      'guardian_policy_denial',
      'Guardian policy denied the request; inspect policy-denial guidance rather than timeout remediation.'
    );
  }
  if (guardianTimeoutSignal) {
    return build(
      'guardian_timeout',
      'Guardian review timed out; retry with timeout-specific guidance and do not treat this as policy denial.'
    );
  }
  if (
    /\b(cloud connector auth drift|missing github connector link|github connection not found(?: for user)?|github connector not found|github connector link missing|missing github connection|missing github connector)\b/u
      .test(normalizedClassification)
  ) {
    return build(
      'cloud_connector_auth_drift',
      'Repair or relink the GitHub connector for the current ChatGPT/Codex cloud account/environment, or record an explicit waiver before re-running cloud-canary gates.'
    );
  }
  if (
    /\b(cloud denial|cloud denied|cloud access denied|cloud execution denied|not allowed in cloud)\b/u
      .test(normalizedClassification)
  ) {
    return build(
      'cloud_denial',
      'Codex Cloud denied the run; verify cloud environment, branch, and account permission.'
    );
  }
  if (
    /\b(auth mismatch|auth profile mismatch|profile mismatch|account mismatch|active account mismatch|active profile mismatch|not logged in|login required|unauthorized|forbidden)\b/u
      .test(normalizedClassification) ||
    (
      /\b(auth profile|active account|active profile)\b/u.test(normalizedClassification) &&
      /\b(mismatch(?:ed)?|unavailable|denied|forbidden|unauthorized|required)\b/u.test(normalizedClassification)
    )
  ) {
    return build(
      'auth_mismatch',
      'The active Codex account/auth profile appears mismatched or unavailable; verify the selected profile/account.'
    );
  }
  if (
    /\b(rate[-\s]?limits?|rate limited|quota|too many requests|prolite|wham|usage limit|token limit|tokens limit)\b/u.test(
      normalizedClassification
    ) &&
    hasProviderWorkerQuotaFailureSignal(input, normalizedClassification)
  ) {
    return build(
      'quota_rate_limit',
      'Codex account quota/rate-limit or plan decoding is implicated; inspect rate-limit and account-plan evidence.'
    );
  }
  if (
    /\b(env config|cloud env missing|codex cloud env id|missing environment|no environment id)\b/u
      .test(normalizedClassification)
  ) {
    return build(
      'env_config',
      'Codex Cloud environment configuration is missing or invalid; set CODEX_CLOUD_ENV_ID or task metadata.'
    );
  }
  if (hasStdinBootstrapSignal) {
    return build(
      'provider_stdin_bootstrap',
      providerWorkerDiagnosticGuidance('provider_stdin_bootstrap')
    );
  }
  if (structuredCategory) {
    return build(structuredCategory, providerWorkerDiagnosticGuidance(structuredCategory));
  }
  if (
    /\b(appserver|provider runtime|runtime parity|codex exec|enoent|websocket|rpc)\b/u.test(
      normalizedClassification
    )
  ) {
    return build(
      'provider_runtime',
      'Provider/runtime execution is implicated; inspect runtime selection and provider command logs.'
    );
  }
  return null;
}

function providerWorkerDiagnosticGuidance(
  diagnosticCategory: ProviderLinearWorkerDiagnosticCategory
): string {
  switch (diagnosticCategory) {
    case 'guardian_timeout':
      return 'Guardian review timed out; retry with timeout-specific guidance and do not treat this as policy denial.';
    case 'guardian_policy_denial':
      return 'Guardian policy denied the request; inspect policy-denial guidance rather than timeout remediation.';
    case 'quota_rate_limit':
      return 'Codex account quota/rate-limit or plan decoding is implicated; inspect rate-limit and account-plan evidence.';
    case 'cloud_connector_auth_drift':
      return 'Repair or relink the GitHub connector for the current ChatGPT/Codex cloud account/environment, or record an explicit waiver before re-running cloud-canary gates.';
    case 'cloud_denial':
      return 'Codex Cloud denied the run; verify cloud environment, branch, and account permission.';
    case 'env_config':
      return 'Codex Cloud environment configuration is missing or invalid; set CODEX_CLOUD_ENV_ID or task metadata.';
    case 'auth_mismatch':
      return 'The active Codex account/auth profile appears mismatched or unavailable; verify the selected profile/account.';
    case 'provider_stdin_bootstrap':
      return 'Codex exited during stdin bootstrap before issue execution; inspect the control-host to provider-linear-worker Codex exec stdin/prompt handoff, not issue-specific content.';
    case 'provider_runtime':
      return 'Provider/runtime execution is implicated; inspect runtime selection and provider command logs.';
    default:
      return 'Inspect provider runtime logs to classify this failure.';
  }
}

function classifyProviderWorkerStructuredDiagnosticValue(
  value: string
): ProviderLinearWorkerDiagnosticCategory | null {
  const normalized = normalizeProviderWorkerStructuredDiagnosticValue(value);
  if (!normalized || normalized === 'failed' || normalized === 'failure' || normalized === 'error') {
    return null;
  }
  if (normalized.includes('guardian') && /\btimeout\b/u.test(normalized.replace(/_/gu, ' '))) {
    return 'guardian_timeout';
  }
  if (
    normalized.includes('guardian') &&
    /\b(policy|denial|denied|blocked|refused)\b/u.test(normalized.replace(/_/gu, ' '))
  ) {
    return 'guardian_policy_denial';
  }
  if (
    [
      'quota_rate_limit',
      'quota_exhausted',
      'quota_exceeded',
      'rate_limit',
      'rate_limited',
      'rate_limit_exceeded',
      'usage_limit_reached',
      'account_rate_limits_exhausted',
      'account_rate_limit_exhausted'
    ].includes(normalized)
  ) {
    return 'quota_rate_limit';
  }
  if (
    [
      'cloud_connector_auth_drift',
      'missing_github_connector_link',
      'github_connection_not_found',
      'github_connector_not_found'
    ].includes(normalized)
  ) {
    return 'cloud_connector_auth_drift';
  }
  if (
    [
      'auth_mismatch',
      'auth_profile_mismatch',
      'profile_mismatch',
      'account_mismatch',
      'active_account_mismatch',
      'active_profile_mismatch',
      'account_auth_profile_mismatch',
      'account_authprofile_mismatch'
    ].includes(normalized)
  ) {
    return 'auth_mismatch';
  }
  if (
    [
      'cloud_denial',
      'cloud_denied',
      'cloud_access_denied',
      'cloud_execution_denied',
      'not_allowed_in_cloud'
    ].includes(normalized)
  ) {
    return 'cloud_denial';
  }
  if (
    [
      'env_config',
      'env_config_missing',
      'cloud_env_missing',
      'codex_cloud_env_id_missing',
      'no_environment_id'
    ].includes(normalized)
  ) {
    return 'env_config';
  }
  if (PROVIDER_WORKER_RUNTIME_DIAGNOSTIC_VALUES.has(normalized)) {
    if (PROVIDER_WORKER_STDIN_BOOTSTRAP_DIAGNOSTIC_VALUES.has(normalized)) {
      return 'provider_stdin_bootstrap';
    }
    return 'provider_runtime';
  }
  return null;
}

function classifyProviderWorkerStructuredDiagnosticCategory(
  input: Record<string, unknown>
): ProviderLinearWorkerDiagnosticCategory | null {
  for (const value of readProviderWorkerStructuredDiagnosticValues(input)) {
    const category = classifyProviderWorkerStructuredDiagnosticValue(value);
    if (category) {
      return category;
    }
  }
  return null;
}

function classifyProviderWorkerStderrFailureDiagnosis(
  stderr: string,
  observedAt: string,
  source: Extract<ProviderLinearWorkerCurrentTurnActivitySource, 'appserver_runner' | 'stderr'> = 'stderr'
): ProviderLinearWorkerFailureDiagnosis | null {
  const message = normalizeOptionalString(stderr);
  if (!message) {
    return null;
  }
  const diagnosticInput = {
    type: 'stderr',
    message,
    timestamp: observedAt
  };
  const classifiedDiagnosis = classifyProviderWorkerFailureDiagnosis(diagnosticInput, source);
  if (classifiedDiagnosis) {
    return classifiedDiagnosis;
  }
  return {
    diagnostic_category: 'provider_runtime',
    signal: buildProviderWorkerDiagnosticSignal(diagnosticInput, source),
    guidance: providerWorkerDiagnosticGuidance('provider_runtime'),
    source,
    observed_at: observedAt
  };
}

function classifyProviderWorkerTurnRunnerFailureDiagnosis(
  error: unknown,
  observedAt: string,
  endReason: ProviderLinearWorkerProof['end_reason'],
  source: Extract<ProviderLinearWorkerCurrentTurnActivitySource, 'appserver_runner' | 'exec_runner'>
): ProviderLinearWorkerFailureDiagnosis {
  const errorMessage = normalizeOptionalString((error as Error)?.message) ?? String(error);
  const errorCode = normalizeOptionalString((error as NodeJS.ErrnoException)?.code);
  const diagnosticInput = {
    type: source === 'appserver_runner' ? 'appserver_runner_error' : 'exec_runner_error',
    status_detail: endReason,
    error: errorCode ? `${errorCode}: ${errorMessage}` : errorMessage,
    message: errorMessage,
    timestamp: observedAt
  };
  const classifiedDiagnosis = classifyProviderWorkerFailureDiagnosis(diagnosticInput, source);
  if (classifiedDiagnosis) {
    return classifiedDiagnosis;
  }
  return {
    diagnostic_category: 'provider_runtime',
    signal: buildProviderWorkerDiagnosticSignal(diagnosticInput, source),
    guidance: providerWorkerDiagnosticGuidance('provider_runtime'),
    source,
    observed_at: observedAt
  };
}

function humanizeProviderWorkerMethod(method: string, input: Record<string, unknown>): string | null {
  switch (method.toLowerCase()) {
    case 'thread/tokenusage/updated': {
      const usage = extractProviderWorkerTokenUsage(input);
      const usageSummary = formatProviderWorkerTokenUsageSummary(usage);
      return usageSummary ? `thread token usage updated (${usageSummary})` : 'thread token usage updated';
    }
    case 'account/ratelimits/updated': {
      const rateLimits = extractProviderWorkerRateLimits(input);
      const rateLimitSummary = formatProviderWorkerRateLimitSummary(rateLimits);
      return rateLimitSummary ? `rate limits updated: ${rateLimitSummary}` : 'rate limits updated';
    }
    case 'item/started':
    case 'item/completed':
    case 'item/updated': {
      const item = findRecordAtPaths(input, [
        ['params', 'item'],
        ['payload', 'params', 'item'],
        ['item'],
        ['payload', 'item']
      ]);
      const itemType =
        normalizeOptionalString(item?.type) ??
        normalizeOptionalString(item?.kind) ??
        normalizeOptionalString(item?.status);
      const action = method.slice(method.lastIndexOf('/') + 1).toLowerCase();
      const itemLabel = humanizeProviderWorkerItemType(itemType);
      return itemLabel ? `item ${action}: ${itemLabel}` : `item ${action}`;
    }
    case 'item/agentmessage/delta': {
      const delta =
        readFirstProviderWorkerStringAtPaths(input, [
          ['params', 'delta'],
          ['payload', 'params', 'delta'],
          ['delta'],
          ['payload', 'delta']
        ]) ?? null;
      return delta ? `agent message delta: ${delta}` : 'agent message delta';
    }
    case 'turn/started':
      return 'turn started';
    case 'turn/completed': {
      const turn = findRecordAtPaths(input, [
        ['params', 'turn'],
        ['payload', 'params', 'turn'],
        ['turn'],
        ['payload', 'turn']
      ]);
      const status = normalizeOptionalString(turn?.status);
      if (!status || status === 'completed') {
        return null;
      }
      return buildProviderLinearWorkerAppServerTerminalFailureMessage(turn, status);
    }
    default:
      return null;
  }
}

function formatProviderWorkerTokenUsageSummary(
  usage: ProviderLinearWorkerTokenUsage | null
): string | null {
  if (!usage) {
    return null;
  }
  const parts: string[] = [];
  if (typeof usage.input_tokens === 'number' && Number.isFinite(usage.input_tokens)) {
    parts.push(`in ${Math.max(0, Math.trunc(usage.input_tokens))}`);
  }
  if (typeof usage.output_tokens === 'number' && Number.isFinite(usage.output_tokens)) {
    parts.push(`out ${Math.max(0, Math.trunc(usage.output_tokens))}`);
  }
  if (typeof usage.total_tokens === 'number' && Number.isFinite(usage.total_tokens)) {
    parts.push(`total ${Math.max(0, Math.trunc(usage.total_tokens))}`);
  }
  if (typeof usage.reasoning_output_tokens === 'number' && Number.isFinite(usage.reasoning_output_tokens)) {
    parts.push(`reasoning ${Math.max(0, Math.trunc(usage.reasoning_output_tokens))}`);
  }
  return parts.length > 0 ? parts.join(' / ') : null;
}

function formatProviderWorkerRateLimitSummary(
  rateLimits: Record<string, unknown> | null
): string | null {
  if (!rateLimits) {
    return null;
  }
  const segments: string[] = [];
  const primary = isRecord(rateLimits.primary) ? rateLimits.primary : null;
  if (primary) {
    const summary = formatProviderWorkerRateLimitBucketSummary(primary);
    if (summary) {
      segments.push(`${resolveProviderWorkerRateLimitWindowLabel(primary, 'primary')} ${summary}`);
    }
  }
  const secondary = isRecord(rateLimits.secondary) ? rateLimits.secondary : null;
  if (secondary) {
    const summary = formatProviderWorkerRateLimitBucketSummary(secondary);
    if (summary) {
      segments.push(`${resolveProviderWorkerRateLimitWindowLabel(secondary, 'secondary')} ${summary}`);
    }
  }
  return segments.length > 0 ? segments.join('; ') : null;
}

function formatProviderWorkerRateLimitBucketSummary(bucket: Record<string, unknown>): string | null {
  const usedPercent = readProviderWorkerNumericField(bucket, ['usedPercent', 'used_percent']);
  const windowDurationMins = readProviderWorkerNumericField(bucket, [
    'windowDurationMins',
    'window_duration_mins',
    'window_minutes'
  ]);
  if (usedPercent !== null && windowDurationMins !== null) {
    return `${formatProviderWorkerPercent(usedPercent)} / ${Math.max(0, Math.trunc(windowDurationMins))}m`;
  }
  if (usedPercent !== null) {
    return `${formatProviderWorkerPercent(usedPercent)} used`;
  }
  const remaining = readProviderWorkerNumericField(bucket, ['remaining']);
  const limit = readProviderWorkerNumericField(bucket, ['limit']);
  if (remaining !== null && limit !== null) {
    return `${Math.max(0, Math.trunc(remaining))}/${Math.max(0, Math.trunc(limit))}`;
  }
  if (remaining !== null) {
    return `remaining ${Math.max(0, Math.trunc(remaining))}`;
  }
  if (limit !== null) {
    return `limit ${Math.max(0, Math.trunc(limit))}`;
  }
  const resetInSeconds = readProviderWorkerNumericField(bucket, ['reset_in_seconds', 'resetInSeconds']);
  if (resetInSeconds !== null) {
    return `reset in ${Math.max(0, Math.trunc(resetInSeconds))}s`;
  }
  const resetAt = normalizeOptionalString(
    bucket.reset_at ?? bucket.resetAt ?? bucket.resets_at ?? bucket.resetsAt
  );
  if (resetAt) {
    return `resets at ${resetAt}`;
  }
  return null;
}

function resolveProviderWorkerRateLimitWindowLabel(
  bucket: Record<string, unknown>,
  fallback: 'primary' | 'secondary'
): string {
  const windowDurationMins = readProviderWorkerNumericField(bucket, [
    'windowDurationMins',
    'window_duration_mins',
    'window_minutes'
  ]);
  const normalizedWindowMinutes =
    windowDurationMins !== null && Number.isFinite(windowDurationMins)
      ? Math.max(0, Math.trunc(windowDurationMins))
      : null;
  if (normalizedWindowMinutes === 300) {
    return '5-hour';
  }
  if (normalizedWindowMinutes === 10_080) {
    return 'weekly';
  }
  return fallback;
}

function humanizeProviderWorkerItemType(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._/]+/g, ' ')
    .trim()
    .toLowerCase();
}

function formatProviderWorkerPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1)}%`;
}

function hasProviderWorkerRateLimitBucketSummary(bucket: Record<string, unknown> | null): boolean {
  if (!bucket) {
    return false;
  }
  return (
    readProviderWorkerNumericField(bucket, ['remaining']) !== null ||
    readProviderWorkerNumericField(bucket, ['limit']) !== null ||
    readProviderWorkerNumericField(bucket, ['usedPercent', 'used_percent']) !== null ||
    readProviderWorkerNumericField(bucket, ['reset_in_seconds', 'resetInSeconds']) !== null ||
    normalizeOptionalString(bucket.reset_at ?? bucket.resetAt ?? bucket.resets_at ?? bucket.resetsAt) !==
      null
  );
}

function readProviderWorkerNumericField(input: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function buildProviderWorkerSessionPromptNeedles(issue: {
  identifier: string;
  title?: string | null;
}): string[] {
  const title = normalizeOptionalString(issue.title);
  const baseNeedle = `You are the provider worker for Linear issue ${issue.identifier}`;
  const needles = [`${baseNeedle}:`];
  if (title) {
    needles.unshift(`${baseNeedle}: ${title}`);
  }
  return needles;
}

function buildProviderWorkerRecentSessionDayDirs(sessionRoot: string, referenceDates: readonly Date[]): string[] {
  const results: string[] = [];
  const seen = new Set<string>();
  for (const referenceDate of referenceDates) {
    for (const dayOffset of [0, -1]) {
      const current = new Date(referenceDate.getTime());
      current.setDate(current.getDate() + dayOffset);
      const dir = join(
        sessionRoot,
        String(current.getFullYear()),
        String(current.getMonth() + 1).padStart(2, '0'),
        String(current.getDate()).padStart(2, '0')
      );
      if (!seen.has(dir)) {
        seen.add(dir);
        results.push(dir);
      }
    }
  }
  return results;
}

function providerWorkerSessionLogPathMatchesThreadId(path: string, threadId: string): boolean {
  return basename(path, '.jsonl').endsWith(`-${threadId}`);
}

async function readProviderWorkerFilePrefix(path: string, maxBytes: number): Promise<string> {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.toString('utf8', 0, bytesRead);
  } finally {
    await handle.close();
  }
}

function valueContainsProviderWorkerSessionNeedle(value: unknown, needle: string): boolean {
  if (typeof value === 'string') {
    return value.includes(needle);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueContainsProviderWorkerSessionNeedle(item, needle));
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).some((item) => valueContainsProviderWorkerSessionNeedle(item, needle));
}

function valueEqualsProviderWorkerSessionNeedle(value: unknown, needle: string): boolean {
  if (typeof value === 'string') {
    return value === needle;
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueEqualsProviderWorkerSessionNeedle(item, needle));
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).some((item) => valueEqualsProviderWorkerSessionNeedle(item, needle));
}

function prefixContainsProviderWorkerSessionHeader(
  prefix: string,
  workspacePath: string,
  promptNeedles: readonly string[]
): boolean {
  let hasExactWorkspacePath = false;
  let hasPromptNeedle = promptNeedles.some((needle) => prefix.includes(needle));
  for (const line of prefix.split(/\r?\n/u)) {
    const parsed = parseProviderWorkerSessionJsonlLine(line);
    if (!parsed || parsed.type !== 'session_meta' || !isRecord(parsed.payload)) {
      if (
        !hasPromptNeedle &&
        parsed &&
        isRecord(parsed.payload) &&
        promptNeedles.some((needle) => valueContainsProviderWorkerSessionNeedle(parsed.payload, needle))
      ) {
        hasPromptNeedle = true;
      }
      continue;
    }
    hasExactWorkspacePath =
      hasExactWorkspacePath || valueEqualsProviderWorkerSessionNeedle(parsed.payload, workspacePath);
    if (!hasPromptNeedle) {
      hasPromptNeedle = promptNeedles.some((needle) =>
        valueContainsProviderWorkerSessionNeedle(parsed.payload, needle)
      );
    }
    if (hasExactWorkspacePath && hasPromptNeedle) {
      return true;
    }
  }
  return false;
}

async function discoverProviderWorkerSessionLogPath(input: {
  env: NodeJS.ProcessEnv;
  workspacePath: string;
  issue: {
    identifier: string;
    title?: string | null;
  };
  startedAt: string | null;
}): Promise<string | null> {
  const sessionRoot = join(resolveCodexHome(input.env), 'sessions');
  const startedAtMs = Date.parse(input.startedAt ?? '');
  const referenceDate = Number.isFinite(startedAtMs) ? new Date(startedAtMs) : new Date();
  const currentDate = new Date();
  const cutoffMs = Number.isFinite(startedAtMs)
    ? startedAtMs - PROVIDER_WORKER_SESSION_LOG_DISCOVERY_WINDOW_MS
    : Date.now() - PROVIDER_WORKER_SESSION_LOG_DISCOVERY_WINDOW_MS;
  const promptNeedles = buildProviderWorkerSessionPromptNeedles(input.issue);
  const threadIdHint = normalizeOptionalString(input.env.CODEX_THREAD_ID);
  const sessionMetaNeedle = threadIdHint ? `"id":"${threadIdHint}"` : null;
  const candidates: Array<{ path: string; mtimeMs: number }> = [];

  for (const dayDir of buildProviderWorkerRecentSessionDayDirs(sessionRoot, [currentDate, referenceDate])) {
    let entries: string[];
    try {
      entries = await readdir(dayDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.startsWith('rollout-') || !entry.endsWith('.jsonl')) {
        continue;
      }
      const candidatePath = join(dayDir, entry);
      let fileStat;
      try {
        fileStat = await stat(candidatePath);
      } catch {
        continue;
      }
      if (!fileStat.isFile() || fileStat.mtimeMs < cutoffMs) {
        continue;
      }
      candidates.push({ path: candidatePath, mtimeMs: fileStat.mtimeMs });
    }
  }

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const requireThreadHint of threadIdHint ? [true, false] : [false]) {
    for (const candidate of candidates) {
      if (!requireThreadHint && Number.isFinite(startedAtMs) && candidate.mtimeMs < startedAtMs) {
        continue;
      }
      let prefix: string;
      try {
        prefix = await readProviderWorkerFilePrefix(candidate.path, PROVIDER_WORKER_SESSION_LOG_HEADER_BYTES);
      } catch {
        continue;
      }
      const matchesThreadHint =
        !threadIdHint ||
        providerWorkerSessionLogPathMatchesThreadId(candidate.path, threadIdHint) ||
        (sessionMetaNeedle !== null && prefix.includes(sessionMetaNeedle));
      if (requireThreadHint && !matchesThreadHint) {
        continue;
      }
      if (!prefixContainsProviderWorkerSessionHeader(prefix, input.workspacePath, promptNeedles)) {
        continue;
      }
      return candidate.path;
    }
  }
  return null;
}

function resetProviderWorkerSessionLogTailState(state: ProviderWorkerSessionLogTailState): void {
  state.path = null;
  state.offsetBytes = 0;
  state.trailingText = '';
  state.bootstrapPending = true;
  state.idRewindSignature = null;
}

function normalizeProviderWorkerSessionLogHydrationState(
  value: unknown
): ProviderWorkerSessionLogHydrationState | null {
  if (!isRecord(value)) {
    return null;
  }
  const path = normalizeOptionalString(value.path);
  const offsetBytes =
    typeof value.offset_bytes === 'number' && Number.isFinite(value.offset_bytes) && value.offset_bytes >= 0
      ? value.offset_bytes
      : null;
  if (!path || offsetBytes === null) {
    return null;
  }
  return {
    path,
    offset_bytes: offsetBytes,
    trailing_text: typeof value.trailing_text === 'string' ? value.trailing_text : '',
    bootstrap_pending: typeof value.bootstrap_pending === 'boolean' ? value.bootstrap_pending : true,
    proof_signature: typeof value.proof_signature === 'string' ? value.proof_signature : '',
    id_rewind_signature: typeof value.id_rewind_signature === 'string' ? value.id_rewind_signature : null
  };
}

function buildProviderWorkerSessionLogTailState(
  path: string,
  hydrationState: ProviderWorkerSessionLogHydrationState | null,
  currentTurnStartedAt: string | null = null
): ProviderWorkerSessionLogTailState {
  const normalizedCurrentTurnStartedAt = normalizeOptionalString(currentTurnStartedAt);
  if (!hydrationState || hydrationState.path !== path) {
    return {
      path,
      offsetBytes: 0,
      trailingText: '',
      bootstrapPending: true,
      currentTurnStartedAt: normalizedCurrentTurnStartedAt,
      idRewindSignature: null
    };
  }
  return {
    path,
    offsetBytes: hydrationState.offset_bytes,
    trailingText: hydrationState.trailing_text,
    bootstrapPending: hydrationState.bootstrap_pending,
    currentTurnStartedAt: normalizedCurrentTurnStartedAt,
    idRewindSignature: hydrationState.id_rewind_signature ?? null
  };
}

function snapshotProviderWorkerSessionLogTailState(
  state: ProviderWorkerSessionLogTailState
): ProviderWorkerSessionLogHydrationState | null {
  if (!state.path) {
    return null;
  }
  const snapshot: ProviderWorkerSessionLogHydrationState = {
    path: state.path,
    offset_bytes: state.offsetBytes,
    trailing_text: state.trailingText,
    bootstrap_pending: state.bootstrapPending,
    proof_signature: ''
  };
  if (state.idRewindSignature) {
    snapshot.id_rewind_signature = state.idRewindSignature;
  }
  return snapshot;
}

function selectProviderLinearWorkerCurrentTurnActivity(
  proof: ProviderLinearWorkerProof
): ProviderLinearWorkerCurrentTurnActivity | null {
  const hydrated = proof.current_turn_activity ?? null;
  if (hydrated) {
    return synchronizeProviderLinearWorkerCurrentTurnActivity(
      hydrated,
      proof.thread_id ?? null,
      proof.latest_turn_id ?? null
    );
  }
  const legacyEvent = normalizeOptionalString(proof.last_event);
  const legacyMessage = normalizeOptionalString(proof.last_message);
  const legacyRecordedAt = normalizeOptionalString(proof.last_event_at);
  if (!legacyEvent && !legacyMessage) {
    return null;
  }
  return synchronizeProviderLinearWorkerCurrentTurnActivity(
    {
      event: legacyEvent,
      message_or_payload: legacyMessage,
      recorded_at: legacyRecordedAt,
      source: 'stdout_jsonl',
      turn_id: proof.latest_turn_id ?? null,
      session_id: proof.latest_session_id ?? null
    },
    proof.thread_id ?? null,
    proof.latest_turn_id ?? null
  );
}

function buildProviderWorkerSessionLogHydrationProofSignature(
  proof: ProviderLinearWorkerProof
): string {
  return JSON.stringify({
    thread_id: proof.thread_id ?? null,
    latest_turn_id: proof.latest_turn_id ?? null,
    latest_session_id: proof.latest_session_id ?? null,
    latest_session_id_source: proof.latest_session_id_source ?? null,
    last_event: proof.last_event ?? null,
    last_message: proof.last_message ?? null,
    last_message_source: normalizeProviderLinearWorkerFinalMessageSource(proof.last_message_source),
    last_message_delta_key: selectProviderLinearWorkerProofFinalMessageDeltaKey(proof),
    last_event_at: proof.last_event_at ?? null,
    current_turn_activity:
      synchronizeProviderLinearWorkerCurrentTurnActivity(
        selectPreferredProviderLinearWorkerCurrentTurnActivity(
          null,
          selectProviderLinearWorkerCurrentTurnActivity(proof)
        ),
        proof.thread_id ?? null,
        proof.latest_turn_id ?? null
      ) ?? null,
    tokens: proof.tokens ?? null,
    rate_limits: proof.rate_limits ?? null,
    auth_provenance: proof.auth_provenance ?? null,
    worker_control: proof.worker_control ?? null,
    source_root_freshness: proof.source_root_freshness ?? null,
    failure_diagnosis: proof.failure_diagnosis ?? null
  });
}

function providerLinearWorkerProofNeedsSessionLogIdHydration(
  proof: ProviderLinearWorkerProof
): boolean {
  const selectedMode =
    proof.runtime?.selected_mode ?? proof.auth_provenance?.runtime_mode ?? null;
  if (selectedMode !== 'appserver') {
    return false;
  }
  if (!proof.thread_id || !proof.latest_turn_id || !proof.latest_session_id) {
    return false;
  }
  return (
    proof.session_log_thread_id !== proof.thread_id ||
    proof.session_log_turn_id !== proof.latest_turn_id ||
    proof.session_log_session_id !== proof.latest_session_id
  );
}

function buildProviderWorkerSessionLogIdHydrationRewindSignature(
  proof: ProviderLinearWorkerProof
): string | null {
  if (!providerLinearWorkerProofNeedsSessionLogIdHydration(proof)) {
    return null;
  }
  return JSON.stringify({
    thread_id: proof.thread_id ?? null,
    latest_turn_id: proof.latest_turn_id ?? null,
    latest_session_id: proof.latest_session_id ?? null,
    session_log_thread_id: proof.session_log_thread_id ?? null,
    session_log_turn_id: proof.session_log_turn_id ?? null,
    session_log_session_id: proof.session_log_session_id ?? null
  });
}

async function readProviderWorkerSessionLogDelta(
  state: ProviderWorkerSessionLogTailState
): Promise<string> {
  if (!state.path) {
    return '';
  }
  const fileStat = await stat(state.path).catch(() => null);
  if (!fileStat || !fileStat.isFile()) {
    return '';
  }
  if (fileStat.size < state.offsetBytes) {
    state.offsetBytes = 0;
    state.trailingText = '';
    state.bootstrapPending = true;
    state.idRewindSignature = null;
  }
  const bytesToRead = fileStat.size - state.offsetBytes;
  if (bytesToRead <= 0) {
    return '';
  }
  const handle = await open(state.path, 'r');
  try {
    const buffer = Buffer.alloc(bytesToRead);
    const { bytesRead } = await handle.read(buffer, 0, bytesToRead, state.offsetBytes);
    state.offsetBytes += bytesRead;
    return buffer.toString('utf8', 0, bytesRead);
  } finally {
    await handle.close();
  }
}

function parseProviderWorkerSessionJsonlLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

interface ProviderWorkerSessionLogApplyResult {
  changed: boolean;
  observed: boolean;
  observedThreadId: string | null;
  observedTurnId: string | null;
}

function extractProviderWorkerSessionLogObservedThreadId(
  parsed: Record<string, unknown>
): string | null {
  const payload = isRecord(parsed.payload) ? parsed.payload : null;
  if (parsed.type === 'session_meta' && payload) {
    return normalizeOptionalString(payload.id);
  }
  if (parsed.type === 'thread.started') {
    return normalizeOptionalString(parsed.thread_id);
  }
  return null;
}

function extractProviderWorkerSessionLogObservedTurnId(
  parsed: Record<string, unknown>
): string | null {
  const payload = isRecord(parsed.payload) ? parsed.payload : null;
  if (parsed.type === 'turn_context' && payload) {
    return normalizeOptionalString(payload.turn_id);
  }
  return extractProviderWorkerActivityTurnId(parsed);
}

function observeProviderWorkerSessionLogLines(
  lines: readonly string[]
): Pick<ProviderWorkerSessionLogApplyResult, 'observed' | 'observedThreadId' | 'observedTurnId'> {
  let observed = false;
  let observedThreadId: string | null = null;
  let observedTurnId: string | null = null;
  for (const line of lines) {
    const parsed = parseProviderWorkerSessionJsonlLine(line);
    if (!parsed) {
      continue;
    }
    observed = true;
    observedThreadId = extractProviderWorkerSessionLogObservedThreadId(parsed) ?? observedThreadId;
    observedTurnId = extractProviderWorkerSessionLogObservedTurnId(parsed) ?? observedTurnId;
  }
  return {
    observed,
    observedThreadId,
    observedTurnId
  };
}

function observeProviderWorkerSessionLogAppliedLines(input: {
  lines: readonly string[];
  linesToApply: readonly string[];
  bootstrapPending: boolean;
}): Pick<ProviderWorkerSessionLogApplyResult, 'observed' | 'observedThreadId' | 'observedTurnId'> {
  const observationLines =
    !input.bootstrapPending || input.linesToApply.length === input.lines.length
      ? input.lines
      : input.linesToApply;
  return observeProviderWorkerSessionLogLines(observationLines);
}

function selectProviderWorkerSessionBootstrapLines(
  lines: string[],
  options: {
    requireTurnContext: boolean;
    currentTurnStartedAt?: string | null;
    currentTurnId?: string | null;
    allowCompletedBootstrapTurn?: boolean;
  } = { requireTurnContext: false }
): string[] {
  let latestSessionMetaIndex = -1;
  let latestTurnContextIndex = -1;
  let latestTurnId: string | null = null;
  let latestTurnCompleted = false;
  let latestTurnCompletedIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const parsed = parseProviderWorkerSessionJsonlLine(lines[index] ?? '');
    if (!parsed) {
      continue;
    }
    if (parsed.type === 'session_meta' && isRecord(parsed.payload)) {
      latestSessionMetaIndex = index;
    }
    if (parsed.type === 'turn_context' && isRecord(parsed.payload)) {
      latestTurnContextIndex = index;
      latestTurnId = normalizeOptionalString(parsed.payload.turn_id);
      latestTurnCompleted = false;
      latestTurnCompletedIndex = -1;
    }
    if (parsed.type === 'event_msg' && isRecord(parsed.payload) && parsed.payload.type === 'task_complete') {
      const completedTurnId = normalizeOptionalString(parsed.payload.turn_id);
      if (
        latestTurnContextIndex >= 0 &&
        (!latestTurnId || !completedTurnId || completedTurnId === latestTurnId)
      ) {
        latestTurnCompleted = true;
        latestTurnCompletedIndex = index;
      }
    }
  }
  if (latestTurnContextIndex < 0) {
    if (options.requireTurnContext) {
      return latestSessionMetaIndex >= 0 ? [lines[latestSessionMetaIndex] ?? ''] : [];
    }
    return lines;
  }
  if (latestTurnCompleted) {
    const currentTurnId = normalizeOptionalString(options.currentTurnId);
    const allowCompletedBootstrapTurn = options.allowCompletedBootstrapTurn ?? true;
    if (!allowCompletedBootstrapTurn && currentTurnId === null) {
      return latestSessionMetaIndex >= 0 ? [lines[latestSessionMetaIndex] ?? ''] : [];
    }
    if (currentTurnId !== null && latestTurnId !== null && latestTurnId !== currentTurnId) {
      return latestSessionMetaIndex >= 0 ? [lines[latestSessionMetaIndex] ?? ''] : [];
    }
    const currentTurnMatchesCompletedLog = currentTurnId !== null && latestTurnId === currentTurnId;
    const completedLine =
      latestTurnCompletedIndex >= 0 ? lines[latestTurnCompletedIndex] ?? '' : '';
    const completedLineHasTimestamp = providerWorkerSessionJsonlLineTimestamp(completedLine) !== null;
    const completedFloorLine =
      completedLine && completedLineHasTimestamp
        ? completedLine
        : lines[latestTurnContextIndex] ?? '';
    if (
      !currentTurnMatchesCompletedLog &&
      !isProviderWorkerSessionBootstrapLineAtOrAfter(
        completedFloorLine,
        options.currentTurnStartedAt ?? null
      )
    ) {
      return latestSessionMetaIndex >= 0 ? [lines[latestSessionMetaIndex] ?? ''] : [];
    }
    const bootstrapLines =
      latestSessionMetaIndex >= 0 && latestSessionMetaIndex < latestTurnContextIndex
        ? [lines[latestSessionMetaIndex] ?? '']
        : [];
    return [...bootstrapLines, ...lines.slice(latestTurnContextIndex)];
  }
  const bootstrapLines =
    latestSessionMetaIndex >= 0 && latestSessionMetaIndex < latestTurnContextIndex
      ? [lines[latestSessionMetaIndex] ?? '']
      : [];
  return [...bootstrapLines, ...lines.slice(latestTurnContextIndex)];
}

function seedProviderWorkerAgentMessageDeltaHydration(
  state: ProviderLinearWorkerJsonlParseResult,
  proof: ProviderLinearWorkerProof,
  tailState: ProviderWorkerSessionLogTailState
): void {
  if (tailState.offsetBytes <= 0) {
    return;
  }
  if (selectProviderLinearWorkerProofFinalMessageSource(proof) !== 'agent_message_delta') {
    return;
  }
  const message =
    typeof proof.last_message === 'string' && proof.last_message.length > 0
      ? proof.last_message
      : null;
  if (message === null) {
    return;
  }
  const deltaKey = selectProviderLinearWorkerProofFinalMessageDeltaKey(proof);
  if (!deltaKey) {
    return;
  }
  state.agentMessageDeltaHydrationSeed = {
    message,
    deltaKey,
    threadId: proof.thread_id ?? proof.session_log_thread_id ?? null,
    turnId: proof.latest_turn_id ?? proof.session_log_turn_id ?? null
  };
}

function providerWorkerSessionJsonlLineTimestamp(line: string): string | null {
  const parsed = parseProviderWorkerSessionJsonlLine(line);
  if (!parsed) {
    return null;
  }
  const lineTimestamp = normalizeOptionalString(parsed.timestamp);
  if (lineTimestamp) {
    return lineTimestamp;
  }
  const payload = isRecord(parsed.payload) ? parsed.payload : null;
  return payload
    ? normalizeOptionalString(payload.timestamp) ??
      normalizeOptionalString(payload.created_at) ??
      normalizeOptionalString(payload.at)
    : null;
}

function isProviderWorkerSessionBootstrapLineAtOrAfter(
  line: string,
  floorTimestamp: string | null
): boolean {
  const normalizedFloor = normalizeOptionalString(floorTimestamp);
  if (!normalizedFloor) {
    return false;
  }
  const lineTimestamp = providerWorkerSessionJsonlLineTimestamp(line);
  return lineTimestamp !== null && compareIsoTimestamp(lineTimestamp, normalizedFloor) >= 0;
}

function shouldAllowCompletedProviderWorkerSessionBootstrapTurn(
  proof: ProviderLinearWorkerProof
): boolean {
  if (proof.latest_turn_id !== null) {
    return true;
  }
  const continuityState = proof.resident_session?.continuity_state ?? null;
  return continuityState !== 'guarded_resume_pending' && continuityState !== 'guarded_resume_active';
}

function applyProviderWorkerSessionLogDelta(
  parseState: ProviderLinearWorkerJsonlParseResult,
  tailState: ProviderWorkerSessionLogTailState,
  chunk: string,
  env: NodeJS.ProcessEnv = process.env,
  options: {
    allowCompletedBootstrapTurn?: boolean;
  } = {}
): ProviderWorkerSessionLogApplyResult {
  const combined = `${tailState.trailingText}${chunk}`;
  const lines = combined.split(/\r?\n/u);
  tailState.trailingText = lines.pop() ?? '';
  if (tailState.bootstrapPending && parseProviderWorkerSessionJsonlLine(tailState.trailingText)) {
    lines.push(tailState.trailingText);
    tailState.trailingText = '';
  }
  const requireTurnContext = tailState.bootstrapPending && parseState.turnId === null;
  const linesToApply =
    tailState.bootstrapPending && lines.length > 0
      ? selectProviderWorkerSessionBootstrapLines(lines, {
          requireTurnContext,
          currentTurnStartedAt: tailState.currentTurnStartedAt,
          currentTurnId: parseState.turnId,
          allowCompletedBootstrapTurn: options.allowCompletedBootstrapTurn
        })
      : lines;
  const observation = observeProviderWorkerSessionLogAppliedLines({
    lines,
    linesToApply,
    bootstrapPending: tailState.bootstrapPending
  });
  let changed = false;
  for (const line of linesToApply) {
    const parsed = parseProviderWorkerSessionJsonlLine(line);
    if (!parsed) {
      continue;
    }
    changed = applyProviderLinearWorkerSessionJsonlRecord(parseState, parsed, env) || changed;
  }
  if (tailState.bootstrapPending && lines.length > 0) {
    tailState.bootstrapPending = requireTurnContext && parseState.turnId === null;
  }
  return { changed, ...observation };
}

function flushProviderWorkerSessionLogTail(
  parseState: ProviderLinearWorkerJsonlParseResult,
  tailState: ProviderWorkerSessionLogTailState,
  env: NodeJS.ProcessEnv = process.env,
  options: {
    allowCompletedBootstrapTurn?: boolean;
  } = {}
): ProviderWorkerSessionLogApplyResult {
  const trailingLine = tailState.trailingText.trim();
  if (!trailingLine) {
    tailState.trailingText = '';
    return { changed: false, observed: false, observedThreadId: null, observedTurnId: null };
  }
  if (!parseProviderWorkerSessionJsonlLine(trailingLine)) {
    return { changed: false, observed: false, observedThreadId: null, observedTurnId: null };
  }
  tailState.trailingText = '';
  const shouldBootstrap = tailState.bootstrapPending;
  const requireTurnContext = shouldBootstrap && parseState.turnId === null;
  const trailingLines = shouldBootstrap
    ? selectProviderWorkerSessionBootstrapLines([trailingLine], {
        requireTurnContext,
        currentTurnStartedAt: tailState.currentTurnStartedAt,
        currentTurnId: parseState.turnId,
        allowCompletedBootstrapTurn: options.allowCompletedBootstrapTurn
      })
    : [trailingLine];
  const observation = observeProviderWorkerSessionLogAppliedLines({
    lines: [trailingLine],
    linesToApply: trailingLines,
    bootstrapPending: shouldBootstrap
  });
  let changed = false;
  for (const line of trailingLines) {
    const parsed = parseProviderWorkerSessionJsonlLine(line);
    if (!parsed) {
      continue;
    }
    changed = applyProviderLinearWorkerSessionJsonlRecord(parseState, parsed, env) || changed;
  }
  if (shouldBootstrap) {
    tailState.bootstrapPending = requireTurnContext && parseState.turnId === null;
  }
  return { changed, ...observation };
}

function normalizeProviderLinearWorkerProofForUpdatedAtComparison(
  proof: ProviderLinearWorkerProof
): Record<string, unknown> {
  return {
    ...proof,
    current_turn_started_at: proof.current_turn_started_at ?? null,
    session_log_thread_id: proof.session_log_thread_id ?? null,
    session_log_turn_id: proof.session_log_turn_id ?? null,
    session_log_session_id: proof.session_log_session_id ?? null,
    resume_source_thread_id: proof.resume_source_thread_id ?? null,
    current_turn_activity: proof.current_turn_activity ?? null,
    runtime: proof.runtime ?? null,
    appserver_supervision: proof.appserver_supervision
      ? {
          ...proof.appserver_supervision,
          updated_at: null
        }
      : proof.appserver_supervision ?? null,
    auth_provenance: proof.auth_provenance ?? null,
    failure_diagnosis: proof.failure_diagnosis ?? null,
    worker_host: proof.worker_host ?? null,
    source_root_freshness: proof.source_root_freshness ?? null,
    source_setup: proof.source_setup ?? null,
    linear_budget: proof.linear_budget ?? null,
    tracked_issue_error: proof.tracked_issue_error ?? null,
    resident_session: proof.resident_session ?? null,
    parallelization: proof.parallelization ?? null,
    progress: null,
    updated_at: null
  };
}

function stableProviderLinearWorkerProofComparisonString(value: unknown): string {
  return JSON.stringify(sortProviderLinearWorkerProofComparisonValue(value));
}

function sortProviderLinearWorkerProofComparisonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortProviderLinearWorkerProofComparisonValue(entry));
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortProviderLinearWorkerProofComparisonValue(value[key])])
  );
}

function selectProviderLinearWorkerProofTelemetryFields(
  proof: ProviderLinearWorkerProof
): Record<string, unknown> {
  return {
    attempt_started_at: proof.attempt_started_at ?? null,
    thread_id: proof.thread_id ?? null,
    latest_turn_id: proof.latest_turn_id ?? null,
    latest_session_id: proof.latest_session_id ?? null,
    latest_session_id_source: proof.latest_session_id_source ?? null,
    session_log_thread_id: proof.session_log_thread_id ?? null,
    session_log_turn_id: proof.session_log_turn_id ?? null,
    session_log_session_id: proof.session_log_session_id ?? null,
    resume_source_thread_id: proof.resume_source_thread_id ?? null,
    turn_count: proof.turn_count,
    last_event: proof.last_event ?? null,
    last_message: proof.last_message ?? null,
    last_message_source: normalizeProviderLinearWorkerFinalMessageSource(proof.last_message_source),
    last_message_delta_key: selectProviderLinearWorkerProofFinalMessageDeltaKey(proof),
    last_event_at: proof.last_event_at ?? null,
    current_turn_activity: selectProviderLinearWorkerCurrentTurnActivity(proof) ?? null,
    tokens: proof.tokens,
    rate_limits: proof.rate_limits ?? null,
    auth_provenance: proof.auth_provenance ?? null,
    worker_control: proof.worker_control ?? null,
    source_root_freshness: proof.source_root_freshness ?? null,
    failure_diagnosis: proof.failure_diagnosis ?? null,
    owner_phase: proof.owner_phase,
    owner_status: proof.owner_status,
    tracked_issue_error: proof.tracked_issue_error ?? null,
    resident_session: proof.resident_session ?? null,
    end_reason: proof.end_reason ?? null
  };
}

function deriveProviderLinearWorkerParallelizationRecord(input: {
  linearAudit: ProviderLinearAuditSummary | null | undefined;
  issueId: string | null | undefined;
  attemptStartedAt?: string | null | undefined;
  currentTurnStartedAt?: string | null | undefined;
  childLanes: ProviderLinearWorkerChildLaneRecord[] | null | undefined;
}): ProviderLinearWorkerParallelizationRecord | null {
  const boundary =
    normalizeOptionalString(input.currentTurnStartedAt) ??
    normalizeOptionalString(input.attemptStartedAt);
  const snapshot = readProviderLinearParallelizationSnapshot(input.linearAudit, {
    issueId: input.issueId,
    recordedAtNotBefore: boundary
  });
  if (!snapshot) {
    return null;
  }
  const priorParallelizations = readProviderLinearParallelizationSnapshotsBefore(
    input.linearAudit,
    {
      issueId: input.issueId,
      recordedBefore: boundary
    }
  );
  const effectiveChildLanes = selectEffectiveParallelizationChildLanes({
    childLanes: input.childLanes,
    attemptStartedAt: input.attemptStartedAt,
    currentTurnStartedAt: boundary,
    issueId: input.issueId,
    currentParallelization: snapshot,
    priorParallelizations
  });
  return {
    ...snapshot,
    child_lane_count: effectiveChildLanes.length,
    recovered_child_lanes: selectRecoverablePriorAttemptSuccessfulChildLanes({
      childLanes: input.childLanes,
      attemptStartedAt: input.attemptStartedAt,
      currentTurnStartedAt: boundary,
      issueId: input.issueId,
      currentParallelization: snapshot,
      priorParallelizations
    }).map((childLane) =>
      buildRecoveredChildLaneRecord(childLane, priorParallelizations)
    )
  };
}

function buildProviderLinearWorkerTurnBootstrapProof(
  proof: ProviderLinearWorkerProof,
  turnCount: number,
  updatedAt: string,
  resumeSourceThreadId: string | null = null
): ProviderLinearWorkerProof {
  return {
    ...proof,
    current_turn_started_at: updatedAt,
    latest_turn_id: null,
    latest_session_id: null,
    latest_session_id_source: null,
    session_log_thread_id: null,
    session_log_turn_id: null,
    session_log_session_id: null,
    resume_source_thread_id: resumeSourceThreadId,
    last_event: null,
    last_message: null,
    last_message_source: null,
    last_message_delta_key: null,
    last_event_at: null,
    current_turn_activity: null,
    tokens: buildEmptyProviderLinearWorkerTokenUsage(),
    rate_limits: null,
    failure_diagnosis: null,
    owner_phase: 'turn_running',
    owner_status: 'in_progress',
    turn_count: turnCount,
    parallelization: null,
    updated_at: updatedAt
  };
}

function selectCurrentTurnChildLanes(
  childLanes: ProviderLinearWorkerChildLaneRecord[] | null | undefined,
  currentTurnStartedAt: string | null | undefined
): ProviderLinearWorkerChildLaneRecord[] {
  const normalizedCurrentTurnStartedAt = normalizeOptionalString(currentTurnStartedAt);
  if (!Array.isArray(childLanes)) {
    return [];
  }
  if (!normalizedCurrentTurnStartedAt) {
    return childLanes;
  }
  return childLanes.filter(
    (childLane) => compareIsoTimestamp(childLane.launched_at, normalizedCurrentTurnStartedAt) >= 0
  );
}

function hasCurrentTurnChildLaneLaunch(
  childLanes: ProviderLinearWorkerChildLaneRecord[] | null | undefined,
  currentTurnStartedAt: string | null | undefined
): boolean {
  return selectCurrentTurnChildLanes(childLanes, currentTurnStartedAt).length > 0;
}

function hasCurrentTurnSuccessfulChildLaneLaunch(
  childLanes: ProviderLinearWorkerChildLaneRecord[] | null | undefined,
  currentTurnStartedAt: string | null | undefined
): boolean {
  return selectCurrentTurnChildLanes(childLanes, currentTurnStartedAt).some(
    (childLane) => isSuccessfulProviderLinearWorkerChildLaneStatus(childLane.status)
  );
}

function readProviderLinearParallelizationSnapshotsBefore(
  linearAudit: ProviderLinearAuditSummary | null | undefined,
  options: {
    issueId?: string | null;
    recordedBefore?: string | null;
  }
): ProviderLinearParallelizationSnapshot[] {
  const recordedBefore = normalizeOptionalString(options.recordedBefore);
  if (!recordedBefore) {
    return [];
  }
  return readProviderLinearParallelizationSnapshots(linearAudit, {
    issueId: options.issueId
  }).filter((snapshot) => compareIsoTimestamp(snapshot.recorded_at, recordedBefore) < 0);
}

function selectRecoverablePriorAttemptSuccessfulChildLanes(input: {
  childLanes: ProviderLinearWorkerChildLaneRecord[] | null | undefined;
  attemptStartedAt: string | null | undefined;
  currentTurnStartedAt: string | null | undefined;
  issueId: string | null | undefined;
  currentParallelization: ProviderLinearParallelizationSnapshot | null | undefined;
  priorParallelizations: ProviderLinearParallelizationSnapshot[] | null | undefined;
}): ProviderLinearWorkerChildLaneRecord[] {
  const attemptStartedAt = normalizeOptionalString(input.attemptStartedAt);
  const currentTurnStartedAt = normalizeOptionalString(input.currentTurnStartedAt);
  const issueId = normalizeOptionalString(input.issueId);
  const currentParallelization = input.currentParallelization ?? null;
  const priorParallelizations = Array.isArray(input.priorParallelizations)
    ? input.priorParallelizations
    : [];
  if (
    !Array.isArray(input.childLanes) ||
    !attemptStartedAt ||
    !currentTurnStartedAt ||
    !issueId ||
    priorParallelizations.length === 0 ||
    currentParallelization?.decision !== 'parallelize_now' ||
    !priorParallelizations.some((snapshot) => snapshot.decision === 'parallelize_now')
  ) {
    return [];
  }
  return input.childLanes.filter((childLane) => {
    if (
      childLane.pipeline_id !== PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID ||
      childLane.issue_id !== issueId ||
      !isSuccessfulProviderLinearWorkerChildLaneStatus(childLane.status) ||
      childLane.decision !== 'pending' ||
      normalizeOptionalString(childLane.decision_at) ||
      !parallelizationSummaryNamesRecoveredChildLane(currentParallelization.summary, childLane)
    ) {
      return false;
    }
    return (
      latestPriorParallelizationSupportsRecoveredChildLane(priorParallelizations, childLane) &&
      compareIsoTimestamp(childLane.launched_at, attemptStartedAt) < 0 &&
      compareIsoTimestamp(childLane.launched_at, currentTurnStartedAt) < 0
    );
  });
}

function latestPriorParallelizationSupportsRecoveredChildLane(
  priorParallelizations: ProviderLinearParallelizationSnapshot[],
  childLane: ProviderLinearWorkerChildLaneRecord
): boolean {
  return resolveLatestPriorParallelizationChildLaneSupport(priorParallelizations, childLane) !== null;
}

function resolveLatestPriorParallelizationChildLaneSupport(
  priorParallelizations: ProviderLinearParallelizationSnapshot[],
  childLane: ProviderLinearWorkerChildLaneRecord
): {
  recoverySource: ProviderLinearWorkerRecoveredChildLaneRecord['recovery_source'];
  parallelization: ProviderLinearParallelizationSnapshot;
} | null {
  const priorParallelizeNowSnapshots = priorParallelizations.filter((snapshot) => snapshot.decision === 'parallelize_now');
  const latestPriorParallelization = priorParallelizeNowSnapshots.at(-1);
  if (!latestPriorParallelization) return null;
  const latestSummary = normalizeOptionalString(latestPriorParallelization.summary)?.toLowerCase() ?? '';
  if (
    /(?:^|[^a-z0-9_:-])(?:recover_child_lane|recover_run):[a-z0-9_:-]+(?=$|[^a-z0-9_:-])/u.test(latestSummary) &&
    !parallelizationSummaryNamesRecoveredChildLane(latestPriorParallelization.summary, childLane)
  ) {
    return resolveLatestPriorParallelizationChildLaneSupport(priorParallelizeNowSnapshots.slice(0, -1), childLane);
  }
  const lineageSupport = resolveChildLaneDecisionLineageSupport(
    childLane.decision_lineage ?? null,
    latestPriorParallelization.decision_lineage ?? null
  );
  if (lineageSupport === 'matched') {
    return {
      recoverySource: 'decision_lineage',
      parallelization: latestPriorParallelization
    };
  }
  if (lineageSupport === 'mismatched') {
    return null;
  }
  const childLaunchedAfterLatest = compareIsoTimestamp(childLane.launched_at, latestPriorParallelization.recorded_at) >= 0;
  const launchedAtMs = Date.parse(childLane.launched_at);
  const latestRecordedAtMs = Date.parse(latestPriorParallelization.recorded_at);
  const latestSupportsChildLane =
    childLaunchedAfterLatest ||
    (Number.isFinite(launchedAtMs) && Number.isFinite(latestRecordedAtMs) && latestRecordedAtMs - launchedAtMs <= 1_000);
  const previousPriorRecordedAt = priorParallelizeNowSnapshots.at(-2)?.recorded_at ?? null;
  const timestampSupportsChildLane = !previousPriorRecordedAt ? latestSupportsChildLane : (
    latestSupportsChildLane &&
    (childLaunchedAfterLatest || compareIsoTimestamp(childLane.launched_at, previousPriorRecordedAt) > 0)
  );
  return timestampSupportsChildLane
    ? {
        recoverySource: 'legacy_timestamp_fallback',
        parallelization: latestPriorParallelization
      }
    : null;
}

function resolveChildLaneDecisionLineageSupport(
  childLineage: ProviderLinearDecisionLineage | null,
  parallelizationLineage: ProviderLinearDecisionLineage | null
): 'matched' | 'mismatched' | 'unknown' {
  if (!childLineage || !parallelizationLineage) {
    return 'unknown';
  }
  if (
    childLineage.parent_task_id &&
    parallelizationLineage.parent_task_id &&
    childLineage.parent_task_id !== parallelizationLineage.parent_task_id
  ) {
    return 'mismatched';
  }
  if (
    childLineage.parent_run_id &&
    parallelizationLineage.parent_run_id &&
    childLineage.parent_run_id !== parallelizationLineage.parent_run_id
  ) {
    return 'mismatched';
  }
  const hasSharedRun =
    childLineage.parent_run_id !== null &&
    parallelizationLineage.parent_run_id !== null &&
    childLineage.parent_run_id === parallelizationLineage.parent_run_id;
  if (!hasSharedRun) {
    return 'unknown';
  }
  const turnStartedAtComparable =
    childLineage.parent_turn_started_at !== null &&
    parallelizationLineage.parent_turn_started_at !== null;
  if (turnStartedAtComparable) {
    return childLineage.parent_turn_started_at === parallelizationLineage.parent_turn_started_at
      ? 'matched'
      : 'mismatched';
  }
  const turnIdComparable =
    childLineage.parent_turn_id !== null &&
    parallelizationLineage.parent_turn_id !== null;
  if (turnIdComparable) {
    return childLineage.parent_turn_id === parallelizationLineage.parent_turn_id
      ? 'matched'
      : 'mismatched';
  }
  const turnCountComparable =
    childLineage.parent_turn_count !== null &&
    parallelizationLineage.parent_turn_count !== null;
  if (turnCountComparable) {
    return childLineage.parent_turn_count === parallelizationLineage.parent_turn_count
      ? 'matched'
      : 'mismatched';
  }
  return 'unknown';
}

function buildRecoveredChildLaneRecord(
  childLane: ProviderLinearWorkerChildLaneRecord,
  priorParallelizations: ProviderLinearParallelizationSnapshot[]
): ProviderLinearWorkerRecoveredChildLaneRecord {
  const support = resolveLatestPriorParallelizationChildLaneSupport(priorParallelizations, childLane);
  return {
    stream: childLane.stream,
    task_id: childLane.task_id,
    run_id: childLane.run_id,
    recovery_source: support?.recoverySource ?? 'legacy_timestamp_fallback',
    child_decision_lineage: childLane.decision_lineage ?? null,
    parallelization_decision_lineage: support?.parallelization.decision_lineage ?? null
  };
}

function parallelizationSummaryNamesRecoveredChildLane(
  summary: string | null | undefined,
  childLane: ProviderLinearWorkerChildLaneRecord
): boolean {
  const normalizedSummary = normalizeOptionalString(summary)?.toLowerCase() ?? '';
  const stream = normalizeOptionalString(childLane.stream)?.toLowerCase() ?? '';
  const runId = normalizeOptionalString(childLane.run_id)?.toLowerCase() ?? '';
  if (!stream || !runId) {
    return false;
  }
  return parallelizationSummaryContainsRecoveryMarkerPair(normalizedSummary, stream, runId);
}

function parallelizationSummaryContainsRecoveryMarkerPair(normalizedSummary: string, stream: string, runId: string): boolean {
  const recoveryMarker = '(?:recover_child_lane|recover_run):[a-z0-9_:-]+';
  return new RegExp(
    `(?:^|[^a-z0-9_:-])recover_child_lane:${escapeRegExp(stream)}(?=$|[^a-z0-9_:-])` +
      `(?:(?!(?:^|[^a-z0-9_:-])${recoveryMarker}(?=$|[^a-z0-9_:-]))[\\s\\S])*?` +
      `(?:^|[^a-z0-9_:-])recover_run:${escapeRegExp(runId)}(?=$|[^a-z0-9_:-])`,
    'u'
  ).test(normalizedSummary);
}

function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'); }

function selectEffectiveParallelizationChildLanes(input: {
  childLanes: ProviderLinearWorkerChildLaneRecord[] | null | undefined;
  attemptStartedAt: string | null | undefined;
  currentTurnStartedAt: string | null | undefined;
  issueId: string | null | undefined;
  currentParallelization: ProviderLinearParallelizationSnapshot | null | undefined;
  priorParallelizations: ProviderLinearParallelizationSnapshot[] | null | undefined;
}): ProviderLinearWorkerChildLaneRecord[] {
  const currentTurnChildLanes = selectCurrentTurnChildLanes(
    input.childLanes,
    input.currentTurnStartedAt
  );
  const recoveredChildLanes = selectRecoverablePriorAttemptSuccessfulChildLanes(input);
  if (currentTurnChildLanes.length === 0) {
    return recoveredChildLanes;
  }
  const currentKeys = new Set(
    currentTurnChildLanes.map(
      (childLane) => `${childLane.task_id}\0${childLane.run_id}\0${childLane.stream}`
    )
  );
  return [
    ...currentTurnChildLanes,
    ...recoveredChildLanes.filter(
      (childLane) => !currentKeys.has(`${childLane.task_id}\0${childLane.run_id}\0${childLane.stream}`)
    )
  ];
}

function hasRecoverablePriorAttemptSuccessfulChildLaneLaunch(input: {
  childLanes: ProviderLinearWorkerChildLaneRecord[] | null | undefined;
  attemptStartedAt: string | null | undefined;
  currentTurnStartedAt: string | null | undefined;
  issueId: string | null | undefined;
  currentParallelization: ProviderLinearParallelizationSnapshot | null | undefined;
  priorParallelizations: ProviderLinearParallelizationSnapshot[] | null | undefined;
}): boolean {
  return selectRecoverablePriorAttemptSuccessfulChildLanes(input).length > 0;
}

function compareIsoTimestamp(left: string | null | undefined, right: string | null | undefined): number {
  const leftValue = normalizeOptionalString(left);
  const rightValue = normalizeOptionalString(right);
  if (leftValue === rightValue) {
    return 0;
  }
  if (!leftValue) {
    return -1;
  }
  if (!rightValue) {
    return 1;
  }
  const leftMs = Date.parse(leftValue);
  const rightMs = Date.parse(rightValue);
  if (Number.isFinite(leftMs) && Number.isFinite(rightMs)) {
    return leftMs - rightMs;
  }
  if (Number.isFinite(leftMs)) {
    return 1;
  }
  if (Number.isFinite(rightMs)) {
    return -1;
  }
  return leftValue.localeCompare(rightValue);
}

function resolveProviderLinearWorkerParallelizationFailure(input: {
  proof: ProviderLinearWorkerProof;
  parallelizationDecisionCountBeforeTurn: number;
}): {
  endReason:
    | 'parallelization_decision_missing'
    | 'parallelization_decision_multiple'
    | 'parallelization_launch_missing'
    | 'parallelization_serial_conflict';
  message: string;
} | null {
  const parallelizationSnapshots = readProviderLinearParallelizationSnapshots(
    input.proof.linear_audit,
    {
      issueId: input.proof.issue_id
    }
  );
  const currentTurnParallelizationDecisions = parallelizationSnapshots.slice(
    input.parallelizationDecisionCountBeforeTurn
  );
  const priorParallelizations = parallelizationSnapshots.slice(
    0,
    input.parallelizationDecisionCountBeforeTurn
  );
  const currentTurnBoundary =
    normalizeOptionalString(input.proof.current_turn_started_at) ??
    normalizeOptionalString(input.proof.attempt_started_at);
  if (currentTurnParallelizationDecisions.length === 0) {
    return {
      endReason: 'parallelization_decision_missing',
      message:
        'provider-linear-worker requires an explicit current-turn parallelization decision via `linear parallelization` before an active turn can complete.'
    };
  }
  if (currentTurnParallelizationDecisions.length > 1) {
    return {
      endReason: 'parallelization_decision_multiple',
      message:
        'provider-linear-worker requires exactly one current-turn same-issue parallelization decision; multiple `linear parallelization` entries were recorded.'
    };
  }
  const parallelization = currentTurnParallelizationDecisions[0] ?? null;
  if (parallelization.decision !== 'parallelize_now') {
    if (!hasCurrentTurnChildLaneLaunch(
      input.proof.child_lanes,
      currentTurnBoundary
    )) {
      return null;
    }
    return {
      endReason: 'parallelization_serial_conflict',
      message:
        `provider-linear-worker recorded \`${parallelization.decision}\` for the current turn, but same-issue child lanes were still launched during that turn.`
    };
  }
  if (
    hasCurrentTurnSuccessfulChildLaneLaunch(input.proof.child_lanes, currentTurnBoundary) ||
    hasRecoverablePriorAttemptSuccessfulChildLaneLaunch({
      childLanes: input.proof.child_lanes,
      attemptStartedAt: input.proof.attempt_started_at,
      currentTurnStartedAt: currentTurnBoundary,
      issueId: input.proof.issue_id,
      currentParallelization: parallelization,
      priorParallelizations
    })
  ) {
    return null;
  }
  return {
    endReason: 'parallelization_launch_missing',
    message:
      'provider-linear-worker recorded `parallelize_now` for the current turn, but no same-issue child lane launched during that turn completed successfully.'
  };
}

function shouldPreservePreviousTurnTelemetryOnLaunchFailure(
  parseState: ProviderLinearWorkerJsonlParseResult,
  previousThreadId: string | null
): boolean {
  const lastEvent = normalizeOptionalString(parseState.lastEvent);
  const nextThreadId = normalizeOptionalString(parseState.threadId);
  return (
    (nextThreadId === null || nextThreadId === previousThreadId) &&
    parseState.turnId === null &&
    (lastEvent === null || lastEvent === 'thread.started') &&
    parseState.finalMessage === null &&
    (parseState.lastEventAt === null || lastEvent === 'thread.started') &&
    !hasProviderWorkerTokenUsage(parseState.tokens) &&
    parseState.rateLimits === null
  );
}

function shouldAdvanceProviderLinearWorkerProofUpdatedAt(
  currentProof: ProviderLinearWorkerProof,
  nextProof: ProviderLinearWorkerProof,
  scope: 'full' | 'telemetry' = 'full'
): boolean {
  if (scope === 'telemetry') {
    return (
      JSON.stringify(selectProviderLinearWorkerProofTelemetryFields(currentProof)) !==
      JSON.stringify(selectProviderLinearWorkerProofTelemetryFields(nextProof))
    );
  }
  return (
    stableProviderLinearWorkerProofComparisonString(
      normalizeProviderLinearWorkerProofForUpdatedAtComparison(currentProof)
    ) !==
    stableProviderLinearWorkerProofComparisonString(
      normalizeProviderLinearWorkerProofForUpdatedAtComparison(nextProof)
    )
  );
}

function selectProviderWorkerScopedSessionLogIds(input: {
  sessionLogObserved: boolean;
  observedThreadId: string | null;
  observedTurnId: string | null;
  proof: ProviderLinearWorkerProof;
  liveThreadId: string | null;
  liveTurnId: string | null;
}): {
  sessionLogThreadId: string | null;
  sessionLogTurnId: string | null;
  sessionLogSessionId: string | null;
} {
  const proofThreadId = input.proof.session_log_thread_id ?? null;
  const proofTurnId = input.proof.session_log_turn_id ?? null;
  const proofThreadMatchesLive =
    proofThreadId !== null &&
    input.liveThreadId !== null &&
    proofThreadId === input.liveThreadId;
  const proofTurnMatchesLive =
    proofTurnId !== null && input.liveTurnId !== null && proofTurnId === input.liveTurnId;
  const observedThreadMatchesLive =
    input.observedThreadId !== null &&
    input.liveThreadId !== null &&
    input.observedThreadId === input.liveThreadId;
  const observedTurnMatchesLive =
    input.observedTurnId !== null &&
    input.liveTurnId !== null &&
    input.observedTurnId === input.liveTurnId;

  let sessionLogThreadId: string | null;
  let sessionLogTurnId: string | null;
  if (input.sessionLogObserved) {
    if (observedThreadMatchesLive) {
      sessionLogThreadId = input.observedThreadId;
      sessionLogTurnId = observedTurnMatchesLive ? input.observedTurnId : null;
    } else if (
      input.observedThreadId === null &&
      observedTurnMatchesLive &&
      input.liveThreadId !== null
    ) {
      sessionLogThreadId = input.liveThreadId;
      sessionLogTurnId = input.observedTurnId;
    } else if (proofThreadMatchesLive) {
      sessionLogThreadId = proofThreadId;
      sessionLogTurnId = proofTurnMatchesLive ? proofTurnId : null;
    } else {
      sessionLogThreadId = null;
      sessionLogTurnId = null;
    }
  } else if (proofThreadMatchesLive) {
    sessionLogThreadId = proofThreadId;
    sessionLogTurnId = proofTurnMatchesLive ? proofTurnId : null;
  } else {
    sessionLogThreadId = input.proof.session_log_thread_id ?? null;
    sessionLogTurnId = input.proof.session_log_turn_id ?? null;
  }

  return {
    sessionLogThreadId,
    sessionLogTurnId,
    sessionLogSessionId: deriveLatestTurnSessionId({
      threadId: sessionLogThreadId,
      turnId: sessionLogTurnId
    }).sessionId
  };
}

async function hydrateProviderLinearWorkerProofFromSessionLog(
  proof: ProviderLinearWorkerProof,
  env: NodeJS.ProcessEnv,
  hydrationState: ProviderWorkerSessionLogHydrationState | null = null
): Promise<ProviderLinearWorkerSessionLogHydrationResult> {
  const workspacePath = normalizeOptionalString(proof.workspace_path);
  const issueIdentifier = normalizeOptionalString(proof.issue_identifier);
  if (!workspacePath || !issueIdentifier) {
    return {
      proof,
      hydrationState: null
    };
  }
  const discoveryEnv =
    typeof proof.thread_id === 'string' && proof.thread_id.trim().length > 0
      ? { ...env, CODEX_THREAD_ID: proof.thread_id }
      : env;
  let sessionLogPath: string | null;
  try {
    sessionLogPath = await discoverProviderWorkerSessionLogPath({
      env: discoveryEnv,
      workspacePath,
      issue: {
        identifier: issueIdentifier,
        title: null
      },
      startedAt: proof.attempt_started_at ?? null
    });
  } catch {
    return {
      proof,
      hydrationState: null
    };
  }
  if (!sessionLogPath) {
    return {
      proof,
      hydrationState: null
    };
  }

  const proofCurrentTurnActivity = selectProviderLinearWorkerCurrentTurnActivity(proof);
  const parseState = initializeProviderLinearWorkerJsonlInternalState(
    {
      threadId: proof.thread_id,
      turnId: proof.latest_turn_id,
      lastEvent: proof.last_event,
      finalMessage: proof.last_message,
      lastEventAt: proof.last_event_at,
      currentTurnActivity: proofCurrentTurnActivity,
      tokens: proof.tokens ?? buildEmptyProviderLinearWorkerTokenUsage(),
      rateLimits: proof.rate_limits,
      authProvenance: proof.auth_provenance ?? null,
      failureDiagnosis: proof.failure_diagnosis ?? null
    },
    selectProviderLinearWorkerProofFinalMessageSource(proof),
    selectProviderLinearWorkerProofFinalMessageDeltaKey(proof)
  );
  const restoreProofTelemetryFloor = () => {
    parseState.threadId = proof.thread_id;
    parseState.turnId = proof.latest_turn_id;
    parseState.lastEvent = proof.last_event;
    parseState.finalMessage = proof.last_message;
    parseState.finalMessageSource = selectProviderLinearWorkerProofFinalMessageSource(proof);
    parseState.finalMessageDeltaKey = selectProviderLinearWorkerProofFinalMessageDeltaKey(proof);
    parseState.agentMessageDeltaBuffers = {};
    parseState.agentMessageDeltaSourceBuffers = {};
    parseState.agentMessageDeltaHydrationSeed = null;
    parseState.lastEventAt = proof.last_event_at;
    parseState.currentTurnActivity = proofCurrentTurnActivity;
    parseState.failureDiagnosis = proof.failure_diagnosis ?? null;
  };
  let tailState = buildProviderWorkerSessionLogTailState(
    sessionLogPath,
    hydrationState,
    proof.current_turn_started_at ?? null
  );
  let preserveProofTelemetryFloor = false;
  if (hydrationState && hydrationState.path === sessionLogPath) {
    const proofSignature = buildProviderWorkerSessionLogHydrationProofSignature(proof);
    if (hydrationState.proof_signature !== proofSignature) {
      const fileStat = await stat(sessionLogPath).catch(() => null);
      if (!fileStat?.isFile()) {
        preserveProofTelemetryFloor = true;
      } else if (fileStat.size === tailState.offsetBytes) {
        tailState = {
          path: sessionLogPath,
          offsetBytes: fileStat.size,
          trailingText: tailState.trailingText,
          bootstrapPending: true,
          currentTurnStartedAt: tailState.currentTurnStartedAt,
          idRewindSignature: tailState.idRewindSignature
        };
      } else if (fileStat.size < tailState.offsetBytes) {
        tailState = {
          path: sessionLogPath,
          offsetBytes: 0,
          trailingText: '',
          bootstrapPending: true,
          currentTurnStartedAt: tailState.currentTurnStartedAt,
          idRewindSignature: null
        };
      } else {
        preserveProofTelemetryFloor = true;
        tailState = {
          ...tailState,
          bootstrapPending: true
        };
      }
    }
  }
  const idHydrationRewindSignature =
    buildProviderWorkerSessionLogIdHydrationRewindSignature(proof);
  if (idHydrationRewindSignature === null) {
    tailState = {
      ...tailState,
      idRewindSignature: null
    };
  } else if (
    tailState.offsetBytes > 0 &&
    tailState.idRewindSignature !== idHydrationRewindSignature
  ) {
    tailState = {
      path: sessionLogPath,
      offsetBytes: 0,
      trailingText: '',
      bootstrapPending: true,
      currentTurnStartedAt: tailState.currentTurnStartedAt,
      idRewindSignature: idHydrationRewindSignature
    };
  }
  seedProviderWorkerAgentMessageDeltaHydration(parseState, proof, tailState);
  let sessionLogObserved = false;
  let observedSessionLogThreadId = proof.session_log_thread_id ?? null;
  let observedSessionLogTurnId = proof.session_log_turn_id ?? null;
  const allowCompletedBootstrapTurn =
    shouldAllowCompletedProviderWorkerSessionBootstrapTurn(proof);
  try {
    const delta = await readProviderWorkerSessionLogDelta(tailState);
    if (delta) {
      const deltaApply = applyProviderWorkerSessionLogDelta(parseState, tailState, delta, env, {
        allowCompletedBootstrapTurn
      });
      sessionLogObserved = deltaApply.observed || sessionLogObserved;
      observedSessionLogThreadId = deltaApply.observedThreadId ?? observedSessionLogThreadId;
      observedSessionLogTurnId = deltaApply.observedTurnId ?? observedSessionLogTurnId;
    }
    const tailApply = flushProviderWorkerSessionLogTail(parseState, tailState, env, {
      allowCompletedBootstrapTurn
    });
    sessionLogObserved = tailApply.observed || sessionLogObserved;
    observedSessionLogThreadId = tailApply.observedThreadId ?? observedSessionLogThreadId;
    observedSessionLogTurnId = tailApply.observedTurnId ?? observedSessionLogTurnId;
  } catch {
    return {
      proof,
      hydrationState: null
    };
  }
  const proofTokenFloor = proof.tokens ?? buildEmptyProviderLinearWorkerTokenUsage();
  if (
    preserveProofTelemetryFloor &&
    proof.latest_turn_id !== null &&
    parseState.turnId !== null &&
    parseState.turnId !== proof.latest_turn_id &&
    !providerWorkerTokenUsageAdvancesFloor(proofTokenFloor, parseState.tokens)
  ) {
    restoreProofTelemetryFloor();
  }
  if (
    preserveProofTelemetryFloor &&
    providerWorkerTokenUsageFallsBehindFloor(proofTokenFloor, parseState.tokens)
  ) {
    restoreProofTelemetryFloor();
    parseState.tokens = mergeProviderWorkerTokenUsageFloor(proofTokenFloor, parseState.tokens);
    parseState.rateLimits = proof.rate_limits;
    parseState.failureDiagnosis = proof.failure_diagnosis ?? null;
  }

  const liveThreadId = parseState.threadId ?? proof.thread_id;
  const liveThreadChanged = Boolean(liveThreadId && liveThreadId !== proof.thread_id);
  const liveTurnId = parseState.turnId ?? (liveThreadChanged ? null : proof.latest_turn_id);
  const liveTurnChanged = Boolean(liveTurnId && liveTurnId !== proof.latest_turn_id);
  const liveScopeChanged = liveThreadChanged || liveTurnChanged;
  const session = deriveLatestTurnSessionId({
    threadId: liveThreadId,
    turnId: liveTurnId
  });
  const preferProofRateLimits =
    preserveProofTelemetryFloor &&
    proof.rate_limits !== null &&
    parseState.rateLimits !== null &&
    providerWorkerTokenUsageFallsBehindFloor(proofTokenFloor, parseState.tokens);
  const persistedTailState = snapshotProviderWorkerSessionLogTailState(tailState);
  const scopedSessionLogIds = selectProviderWorkerScopedSessionLogIds({
    sessionLogObserved,
    observedThreadId: observedSessionLogThreadId,
    observedTurnId: observedSessionLogTurnId,
    proof,
    liveThreadId,
    liveTurnId
  });
  const hydratedProof: ProviderLinearWorkerProof = {
    ...proof,
    thread_id: liveThreadId,
    latest_turn_id: liveTurnId,
    latest_session_id: session.sessionId,
    latest_session_id_source: session.source,
    session_log_thread_id: scopedSessionLogIds.sessionLogThreadId,
    session_log_turn_id: scopedSessionLogIds.sessionLogTurnId,
    session_log_session_id: scopedSessionLogIds.sessionLogSessionId,
    last_event: parseState.lastEvent ?? null,
    last_message: parseState.finalMessage ?? null,
    last_message_source: parseState.finalMessage ? parseState.finalMessageSource ?? null : null,
    last_message_delta_key:
      parseState.finalMessage && parseState.finalMessageSource === 'agent_message_delta'
        ? parseState.finalMessageDeltaKey ?? null
        : null,
    last_event_at: parseState.lastEventAt ?? null,
    current_turn_activity:
      synchronizeProviderLinearWorkerCurrentTurnActivity(
        parseState.currentTurnActivity,
        liveThreadId,
        liveTurnId
      ) ?? (liveScopeChanged ? null : proofCurrentTurnActivity),
    tokens: hasProviderWorkerTokenUsage(parseState.tokens)
      ? parseState.tokens
      : liveTurnChanged
        ? buildEmptyProviderLinearWorkerTokenUsage()
        : proof.tokens,
    rate_limits: preferProofRateLimits
      ? proof.rate_limits
      : parseState.rateLimits ?? (liveTurnChanged ? null : proof.rate_limits),
    auth_provenance: mergeProviderWorkerAuthProvenance(
      proof.auth_provenance ?? null,
      parseState.authProvenance
    ),
    failure_diagnosis: parseState.failureDiagnosis ?? (liveTurnChanged ? null : proof.failure_diagnosis ?? null)
  };
  return {
    proof: hydratedProof,
    hydrationState:
      persistedTailState === null
        ? null
        : {
            ...persistedTailState,
            proof_signature: buildProviderWorkerSessionLogHydrationProofSignature(hydratedProof)
          }
  };
}

function findRecordAtPaths(
  input: Record<string, unknown>,
  paths: string[][]
): Record<string, unknown> | null {
  for (const path of paths) {
    const record = findRecordAtPath(input, path);
    if (record) {
      return record;
    }
  }
  return null;
}

function findRecordAtPath(
  input: Record<string, unknown>,
  path: string[]
): Record<string, unknown> | null {
  let current: unknown = input;
  for (const segment of path) {
    if (!isRecord(current)) {
      return null;
    }
    current = current[segment];
  }
  return isRecord(current) ? current : null;
}

export function deriveLatestTurnSessionId(input: {
  threadId: string | null;
  turnId: string | null;
}): {
  sessionId: string | null;
  source: ProviderLinearWorkerProof['latest_session_id_source'];
} {
  if (!input.threadId || !input.turnId) {
    return {
      sessionId: null,
      source: null
    };
  }
  return {
    sessionId: `${input.threadId}-${input.turnId}`,
    source: 'derived_from_thread_and_turn'
  };
}

function selectProviderLinearWorkerSessionLogProofForScope(input: {
  proof: ProviderLinearWorkerProof;
  threadId: string | null;
  turnId: string | null;
  sessionId: string | null;
  scopeChanged: boolean;
}): {
  sessionLogThreadId: string | null;
  sessionLogTurnId: string | null;
  sessionLogSessionId: string | null;
} {
  const sessionLogThreadId = input.proof.session_log_thread_id ?? null;
  const sessionLogTurnId = input.proof.session_log_turn_id ?? null;
  const sessionLogSessionId = input.proof.session_log_session_id ?? null;
  if (!input.scopeChanged) {
    return { sessionLogThreadId, sessionLogTurnId, sessionLogSessionId };
  }
  if (
    sessionLogThreadId &&
    sessionLogTurnId &&
    sessionLogSessionId &&
    sessionLogThreadId === input.threadId &&
    sessionLogTurnId === input.turnId &&
    sessionLogSessionId === input.sessionId
  ) {
    return { sessionLogThreadId, sessionLogTurnId, sessionLogSessionId };
  }
  return { sessionLogThreadId: null, sessionLogTurnId: null, sessionLogSessionId: null };
}

function buildProviderLinearWorkerRuntimeProof(
  selection: RuntimeSelection
): ProviderLinearWorkerRuntimeProof {
  return {
    requested_mode: selection.requested_mode,
    selected_mode: selection.selected_mode,
    provider: selection.provider,
    runtime_session_id: selection.runtime_session_id,
    fallback: selection.fallback
  };
}

function normalizeProviderLinearWorkerRuntimeProof(
  proof: ProviderLinearWorkerProof
): ProviderLinearWorkerRuntimeProof {
  const existing = proof.runtime ?? null;
  const authProvenance = proof.auth_provenance ?? null;
  return {
    requested_mode: existing?.requested_mode ?? authProvenance?.runtime_mode ?? null,
    selected_mode: existing?.selected_mode ?? authProvenance?.runtime_mode ?? null,
    provider: existing?.provider ?? authProvenance?.runtime_provider ?? null,
    runtime_session_id: existing?.runtime_session_id ?? null,
    fallback: existing?.fallback ?? null
  };
}

function normalizeProviderLinearWorkerRuntimeProofIfRelevant(
  proof: ProviderLinearWorkerProof
): ProviderLinearWorkerRuntimeProof | null {
  const runtime = normalizeProviderLinearWorkerRuntimeProof(proof);
  if (
    runtime.requested_mode ||
    runtime.selected_mode ||
    runtime.provider ||
    runtime.runtime_session_id ||
    runtime.fallback ||
    proof.auth_provenance?.runtime_mode ||
    proof.auth_provenance?.runtime_provider
  ) {
    return runtime;
  }
  return null;
}

function shouldEmitProviderLinearWorkerAppServerSupervisionProof(
  proof: ProviderLinearWorkerProof
): boolean {
  const runtime = normalizeProviderLinearWorkerRuntimeProofIfRelevant(proof);
  return (
    runtime?.requested_mode === 'appserver' ||
    runtime?.selected_mode === 'appserver' ||
    runtime?.fallback?.from_mode === 'appserver' ||
    runtime?.fallback?.to_mode === 'appserver' ||
    proof.auth_provenance?.runtime_mode === 'appserver'
  );
}

function buildProviderLinearWorkerAppServerSupervisionProofIfRelevant(
  proof: ProviderLinearWorkerProof
): ProviderLinearWorkerAppServerSupervisionProof | null {
  return shouldEmitProviderLinearWorkerAppServerSupervisionProof(proof)
    ? buildProviderLinearWorkerAppServerSupervisionProof(proof)
    : null;
}

function buildProviderLinearWorkerAppServerSupervisionProof(
  proof: ProviderLinearWorkerProof
): ProviderLinearWorkerAppServerSupervisionProof {
  const selectedRuntime = normalizeProviderLinearWorkerRuntimeProof(proof);
  const selectedMode = selectedRuntime.selected_mode ?? proof.auth_provenance?.runtime_mode ?? null;
  const appserverSelected = selectedMode === 'appserver';
  const appserverIntended =
    appserverSelected ||
    selectedRuntime.requested_mode === 'appserver' ||
    selectedRuntime.fallback?.from_mode === 'appserver' ||
    proof.auth_provenance?.runtime_mode === 'appserver';
  const stickyEnvironmentId =
    normalizeOptionalString(proof.auth_provenance?.cloud_env_id) ?? null;
  const sessionLogThreadId = normalizeOptionalString(proof.session_log_thread_id) ?? null;
  const sessionLogTurnId = normalizeOptionalString(proof.session_log_turn_id) ?? null;
  const sessionLogSessionId = normalizeOptionalString(proof.session_log_session_id) ?? null;
  const hasTurnPersistence = Boolean(
    proof.thread_id &&
      proof.latest_turn_id &&
      proof.latest_session_id &&
      sessionLogThreadId === proof.thread_id &&
      sessionLogTurnId === proof.latest_turn_id &&
      sessionLogSessionId === proof.latest_session_id
  );
  const residentResumeSourceThreadId =
    normalizeOptionalString(proof.resident_session?.source_thread_id) ?? null;
  const recordedResumeSourceThreadId =
    normalizeOptionalString(proof.resume_source_thread_id) ?? null;
  const inRunResumeRequested = appserverIntended && proof.turn_count > 1;
  const supervisionCommand =
    appserverSelected
      ? residentResumeSourceThreadId || recordedResumeSourceThreadId || proof.turn_count > 1
        ? 'appserver_thread_resume'
        : 'appserver_thread_start'
      : residentResumeSourceThreadId || recordedResumeSourceThreadId || proof.turn_count > 1
        ? 'codex_exec_resume'
        : 'codex_exec';
  const resumeSourceThreadId =
    residentResumeSourceThreadId ?? recordedResumeSourceThreadId;
  const resumeRequested = Boolean(residentResumeSourceThreadId) || inRunResumeRequested;
  const resumeThreadMatches =
    resumeRequested &&
    proof.thread_id !== null &&
    resumeSourceThreadId !== null &&
    proof.thread_id === resumeSourceThreadId;
  const resumeThreadMismatch =
    Boolean(resumeSourceThreadId) &&
    proof.thread_id !== null &&
    proof.thread_id !== resumeSourceThreadId;
  const resumePersistedTurnObserved = resumeThreadMatches && hasTurnPersistence;
  return {
    selected_runtime: selectedRuntime,
    supervision_command: supervisionCommand,
    appserver_session_id: appserverSelected ? selectedRuntime.runtime_session_id : null,
    thread_id: proof.thread_id,
    latest_turn_id: proof.latest_turn_id,
    latest_session_id: proof.latest_session_id,
    session_log_thread_id: sessionLogThreadId,
    session_log_turn_id: sessionLogTurnId,
    session_log_session_id: sessionLogSessionId,
    sticky_environment_id: stickyEnvironmentId,
    sticky_environment_status: appserverIntended
      ? stickyEnvironmentId
        ? 'proven'
        : 'blocked'
      : 'not_applicable',
    sticky_environment_blocker:
      appserverIntended && !stickyEnvironmentId
        ? 'configured_environment_id_missing'
        : null,
    turn_persistence_status: appserverIntended
      ? hasTurnPersistence
        ? 'proven'
        : 'blocked'
      : 'not_applicable',
    turn_persistence_source: appserverIntended && hasTurnPersistence ? 'session_log_hydration' : null,
    turn_persistence_blocker:
      appserverIntended && !hasTurnPersistence
        ? 'session_log_hydration_missing'
        : null,
    pagination_status: appserverIntended ? 'blocked' : 'not_applicable',
    pagination_blocker: appserverIntended ? 'appserver_pagination_probe_not_implemented' : null,
    resume_status: appserverIntended
      ? resumeRequested
        ? resumePersistedTurnObserved
          ? 'proven'
          : 'blocked'
        : 'not_requested'
      : 'not_applicable',
    resume_source_thread_id: resumeSourceThreadId,
    resume_observed_thread_id: resumeRequested ? proof.thread_id : null,
    resume_blocker:
      appserverIntended && resumeRequested && resumeThreadMismatch
        ? 'guarded_resume_thread_mismatch'
        : appserverIntended && resumeRequested && !resumeSourceThreadId
          ? 'resume_source_thread_id_missing'
        : appserverIntended && resumeRequested && !proof.thread_id
          ? 'resume_thread_id_missing'
          : appserverIntended && resumeRequested && !resumePersistedTurnObserved
            ? 'resume_session_log_hydration_missing'
          : null,
    fork_status: appserverIntended ? 'blocked' : 'not_applicable',
    fork_blocker: appserverIntended ? 'appserver_fork_probe_not_implemented' : null,
    jsonl_truth_retained: true,
    session_log_truth_retained: appserverSelected,
    updated_at: proof.updated_at ?? null
  };
}

async function resolveProviderLinearWorkerRuntimeContext(
  env: NodeJS.ProcessEnv,
  repoRoot: string,
  runId: string
): Promise<RuntimeCodexCommandContext> {
  const requestedMode = parseRuntimeMode(
    env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE ?? env.CODEX_ORCHESTRATOR_RUNTIME_MODE ?? null
  );
  return await createRuntimeCodexCommandContext({
    requestedMode,
    executionMode: 'mcp',
    repoRoot,
    env: { ...process.env, ...env },
    runId
  });
}

function readFirstProviderWorkerEnvValue(env: NodeJS.ProcessEnv, keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeOptionalString(env[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function readProviderWorkerCredentialSourceFromEnv(env: NodeJS.ProcessEnv): string | null {
  for (const key of [
    'CODEX_API_KEY',
    'OPENAI_API_KEY',
    'CODEX_AUTH_TOKEN',
    'OPENAI_AUTH_TOKEN',
    'CHATGPT_AUTH_TOKEN'
  ]) {
    if (normalizeOptionalString(env[key])) {
      return `env:${key}`;
    }
  }
  return null;
}

function buildProviderWorkerRuntimeAuthProvenance(params: {
  env: NodeJS.ProcessEnv;
  runtime: RuntimeSelection;
  sourceSetup: DispatchPilotSourceSetup | null;
  observedAt: string;
}): ProviderLinearWorkerAuthProvenance {
  const profile = readFirstProviderWorkerEnvValue(params.env, [
    'CODEX_AUTH_PROFILE',
    'CODEX_PROFILE',
    'OPENAI_PROFILE',
    'CHATGPT_AUTH_PROFILE',
    'CHATGPT_PROFILE'
  ]);
  const account = readFirstProviderWorkerEnvValue(params.env, [
    'CODEX_ACCOUNT_ID',
    'CODEX_ACCOUNT',
    'CODEX_ACCOUNT_EMAIL',
    'OPENAI_ACCOUNT_ID',
    'OPENAI_ORG_ID',
    'CHATGPT_ACCOUNT_ID',
    'CHATGPT_ACCOUNT',
    'CHATGPT_ACCOUNT_EMAIL'
  ]);
  const cloudBranchRaw = normalizeOptionalString(params.env.CODEX_CLOUD_BRANCH);
  const cloudBranch = cloudBranchRaw ? cloudBranchRaw.replace(/^refs\/heads\//u, '') : null;
  const credentialSource = readProviderWorkerCredentialSourceFromEnv(params.env);
  return {
    provider_kind: 'codex',
    runtime_mode: params.runtime.selected_mode,
    runtime_provider: params.runtime.provider,
    active_profile_fingerprint: fingerprintProviderWorkerEnvAuthValue(profile, params.env),
    active_account_fingerprint: fingerprintProviderWorkerEnvAuthValue(account, params.env),
    cloud_env_id: normalizeOptionalString(params.env.CODEX_CLOUD_ENV_ID),
    cloud_branch: cloudBranch,
    credential_source: credentialSource,
    auth_freshness: credentialSource ? 'env_credential_present' : 'credential_source_unknown',
    observed_at: params.observedAt,
    source: params.sourceSetup?.provider ? `runtime_env:${params.sourceSetup.provider}` : 'runtime_env'
  };
}

function buildProviderWorkerControlPlane(params: {
  runtime: RuntimeSelection;
  observedAt: string;
}): ProviderLinearWorkerControlPlane {
  const isAppServerAuthority = params.runtime.selected_mode === 'appserver';
  const fallback = params.runtime.fallback;
  const breakGlassReason =
    isAppServerAuthority
      ? null
      : fallback.occurred
        ? `runtime_fallback:${fallback.code ?? 'unknown'}`
        : 'runtime_mode_cli';
  return isAppServerAuthority
    ? {
        authority: 'appserver',
        transport: 'app-server-jsonl',
        requested_runtime_mode: params.runtime.requested_mode,
        selected_runtime_mode: params.runtime.selected_mode,
        runtime_provider: params.runtime.provider,
        runtime_session_id: params.runtime.runtime_session_id,
        fallback_occurred: fallback.occurred,
        fallback_code: fallback.code,
        fallback_reason: fallback.reason,
        normal_start_method: 'thread/start + turn/start',
        resume_method: 'thread/resume + turn/start',
        drain_method: 'turn/completed notification',
        restart_method: 'thread/resume from recorded thread_id',
        state_read_model: 'provider-linear-worker-proof',
        break_glass: false,
        break_glass_reason: null,
        observed_at: params.observedAt
      }
    : {
        authority: 'legacy_cli_break_glass',
        transport: 'codex-exec-jsonl',
        requested_runtime_mode: params.runtime.requested_mode,
        selected_runtime_mode: params.runtime.selected_mode,
        runtime_provider: params.runtime.provider,
        runtime_session_id: params.runtime.runtime_session_id,
        fallback_occurred: fallback.occurred,
        fallback_code: fallback.code,
        fallback_reason: fallback.reason,
        normal_start_method: 'codex exec',
        resume_method: 'codex exec resume',
        drain_method: 'process exit',
        restart_method: 'codex exec resume from recorded thread_id',
        state_read_model: 'provider-linear-worker-proof',
        break_glass: true,
        break_glass_reason: breakGlassReason,
        observed_at: params.observedAt
      };
}

function applyProviderWorkerRuntimeSelectionToManifest(input: {
  manifest: Record<string, unknown>;
  runtime: RuntimeSelection;
  workerControl: ProviderLinearWorkerControlPlane;
}): boolean {
  const before = JSON.stringify({
    runtime_mode_requested: input.manifest.runtime_mode_requested ?? null,
    runtime_mode: input.manifest.runtime_mode ?? null,
    runtime_provider: input.manifest.runtime_provider ?? null,
    runtime_fallback: input.manifest.runtime_fallback ?? null,
    provider_worker_control: input.manifest.provider_worker_control ?? null
  });
  input.manifest.runtime_mode_requested = input.runtime.requested_mode;
  input.manifest.runtime_mode = input.runtime.selected_mode;
  input.manifest.runtime_provider = input.runtime.provider;
  input.manifest.runtime_fallback = input.runtime.fallback;
  input.manifest.provider_worker_control = input.workerControl;
  const after = JSON.stringify({
    runtime_mode_requested: input.manifest.runtime_mode_requested ?? null,
    runtime_mode: input.manifest.runtime_mode ?? null,
    runtime_provider: input.manifest.runtime_provider ?? null,
    runtime_fallback: input.manifest.runtime_fallback ?? null,
    provider_worker_control: input.manifest.provider_worker_control ?? null
  });
  return before !== after;
}

async function readProviderWorkerControlHostSourceRootFreshness(
  context: Pick<
    ProviderLinearWorkerContext,
    | 'controlHostManifestPath'
    | 'manifestPath'
    | 'providerControlHostRunId'
    | 'providerControlHostTaskId'
    | 'runDir'
  >
): Promise<SourceRootFreshnessInspection | null> {
  const controlHostRunDir = resolveProviderWorkerControlHostRunDir(context);
  const runDirs = [
    ...new Set(
      [
        controlHostRunDir,
        dirname(context.controlHostManifestPath),
        context.runDir
      ].filter((entry): entry is string => Boolean(entry))
    )
  ];
  for (const runDir of runDirs) {
    const owner = await readControlHostOwnerMetadata(runDir).catch(() => null);
    if (owner?.source_root_freshness) {
      return refreshSourceRootFreshnessInspection(owner.source_root_freshness, owner.repo_root);
    }
  }
  return null;
}

function resolveProviderWorkerControlHostRunDir(
  context: Pick<
    ProviderLinearWorkerContext,
    'manifestPath' | 'providerControlHostRunId' | 'providerControlHostTaskId'
  >
): string | null {
  if (!context.providerControlHostTaskId || !context.providerControlHostRunId) {
    return null;
  }
  const runsRoot = resolveRunsRootFromProviderWorkerManifestPath(context.manifestPath);
  if (!runsRoot) {
    return null;
  }
  try {
    return join(
      runsRoot,
      sanitizeTaskId(context.providerControlHostTaskId),
      'cli',
      sanitizeRunId(context.providerControlHostRunId)
    );
  } catch {
    return null;
  }
}

function resolveRunsRootFromProviderWorkerManifestPath(manifestPath: string): string | null {
  const resolvedManifestPath = resolve(manifestPath);
  const runDir = dirname(resolvedManifestPath);
  const cliDir = dirname(runDir);
  const taskDir = dirname(cliDir);
  const runsRoot = dirname(taskDir);
  if (
    basename(resolvedManifestPath) !== 'manifest.json' ||
    basename(cliDir) !== 'cli'
  ) {
    return null;
  }
  return runsRoot;
}

async function refreshProviderWorkerProofSourceRootFreshness(
  context: Pick<
    ProviderLinearWorkerContext,
    | 'controlHostManifestPath'
    | 'manifestPath'
    | 'providerControlHostRunId'
    | 'providerControlHostTaskId'
    | 'repoRoot'
    | 'runDir'
  >,
  proof: ProviderLinearWorkerProof
): Promise<ProviderLinearWorkerProof> {
  const sourceRootFreshness = proof.source_root_freshness
    ? refreshSourceRootFreshnessInspection(proof.source_root_freshness, context.repoRoot)
    : await readProviderWorkerControlHostSourceRootFreshness(context);
  return {
    ...proof,
    source_root_freshness: sourceRootFreshness
  };
}

async function persistProviderWorkerRuntimeSelectionToManifests(input: {
  context: ProviderLinearWorkerContext;
  runtime: RuntimeSelection;
  workerControl: ProviderLinearWorkerControlPlane;
}): Promise<void> {
  const controlHostChanged = applyProviderWorkerRuntimeSelectionToManifest({
    manifest: input.context.controlHostManifest,
    runtime: input.runtime,
    workerControl: input.workerControl
  });
  if (input.context.manifestPath === input.context.controlHostManifestPath) {
    if (controlHostChanged) {
      await writeJsonAtomic(input.context.controlHostManifestPath, input.context.controlHostManifest);
    }
    return;
  }

  const selectedChanged = applyProviderWorkerRuntimeSelectionToManifest({
    manifest: input.context.manifest,
    runtime: input.runtime,
    workerControl: input.workerControl
  });
  if (controlHostChanged) {
    await writeJsonAtomic(input.context.controlHostManifestPath, input.context.controlHostManifest);
  }
  if (selectedChanged) {
    await writeJsonAtomic(input.context.manifestPath, input.context.manifest);
  }
}

async function readTrackedIssueOrThrow(input: {
  issueId: string;
  env: NodeJS.ProcessEnv;
  sourceSetup?: DispatchPilotSourceSetup | null;
}): Promise<LiveLinearTrackedIssue> {
  const resolution = await resolveLiveLinearTrackedIssueById({
    issueId: input.issueId,
    env: input.env,
    sourceSetup: input.sourceSetup
  });
  if (resolution.kind !== 'ready') {
    throw new ProviderLinearTrackedIssueReadError(input.issueId, resolution);
  }
  return resolution.tracked_issue;
}

export class ProviderLinearTrackedIssueReadError extends Error {
  readonly issueId: string;
  readonly resolution: Exclude<LiveLinearTrackedIssueResolution, { kind: 'ready' }>;

  constructor(issueId: string, resolution: Exclude<LiveLinearTrackedIssueResolution, { kind: 'ready' }>) {
    super(
      resolution.message
        ? `Unable to resolve provider issue ${issueId}: ${resolution.reason} (${resolution.message})`
        : `Unable to resolve provider issue ${issueId}: ${resolution.reason}`
    );
    this.name = 'ProviderLinearTrackedIssueReadError';
    this.issueId = issueId;
    this.resolution = resolution;
  }
}

function buildProviderLinearTrackedIssueError(error: unknown): ProviderLinearTrackedIssueError | null {
  if (error instanceof ProviderLinearTrackedIssueReadError) {
    const details = isRecord(error.resolution.details) ? { ...error.resolution.details } : undefined;
    const code = normalizeOptionalString(details?.error_code) ?? error.resolution.code;
    return {
      code,
      reason: error.resolution.reason,
      message: error.resolution.message ?? error.message,
      status: error.resolution.status,
      retryable: error.resolution.retryable === true,
      ...(details ? { details } : {})
    };
  }

  if (error instanceof Error) {
    return {
      code: 'tracked_issue_read_failed',
      reason: 'tracked_issue_read_failed',
      message: error.message,
      status: 503,
      retryable: false
    };
  }

  return {
    code: 'tracked_issue_read_failed',
    reason: 'tracked_issue_read_failed',
    message: String(error),
    status: 503,
    retryable: false
  };
}

function resolveTrackedIssueRateLimitWaitMs(error: ProviderLinearTrackedIssueError | null): number | null {
  if (!error || error.code !== 'linear_rate_limited' || !isRecord(error.details)) {
    return null;
  }

  const retryAfterSeconds =
    typeof error.details.retry_after_seconds === 'number' && Number.isFinite(error.details.retry_after_seconds)
      ? error.details.retry_after_seconds
      : null;
  if (retryAfterSeconds !== null && retryAfterSeconds >= 0) {
    return Math.round(retryAfterSeconds * 1000);
  }

  const exhaustedBucketWaits: number[] = [];
  const unknownBucketWaits: number[] = [];
  for (const bucket of PROVIDER_LINEAR_TRACKED_ISSUE_RATE_LIMIT_BUCKETS) {
    const value = normalizeOptionalString(error.details[bucket.resetAt]);
    if (!value) {
      continue;
    }
    const resetAt = Date.parse(value);
    if (!Number.isFinite(resetAt)) {
      continue;
    }
    const waitMs = Math.max(0, resetAt - Date.now());
    const remaining = parseTrackedIssueRateLimitRemaining(error.details[bucket.remaining]);
    if (remaining !== null) {
      if (remaining <= 0) {
        exhaustedBucketWaits.push(waitMs);
      }
      continue;
    }
    unknownBucketWaits.push(waitMs);
  }

  const candidateWaits = [...exhaustedBucketWaits, ...unknownBucketWaits];
  if (candidateWaits.length > 0) {
    // A single retry should wait until every exhausted or still-unknown bucket has reset.
    return Math.max(...candidateWaits);
  }

  return null;
}

function parseTrackedIssueRateLimitRemaining(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function buildProofPath(runDir: string): string {
  return resolve(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
}

function buildProofSessionLogHydrationPath(runDir: string): string {
  return resolve(runDir, PROVIDER_LINEAR_WORKER_SESSION_LOG_HYDRATION_FILENAME);
}

function buildProofLockPath(runDir: string): string {
  return resolve(runDir, PROVIDER_LINEAR_WORKER_PROOF_LOCK_FILENAME);
}

function buildChildStreamsPath(runDir: string): string {
  return resolve(runDir, PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME);
}

function buildChildStreamsLockPath(runDir: string): string {
  return resolve(runDir, PROVIDER_LINEAR_WORKER_CHILD_STREAMS_LOCK_FILENAME);
}

function buildChildLanesPath(runDir: string): string {
  return resolve(runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME);
}

function buildChildLanesLockPath(runDir: string): string {
  return resolve(runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_LOCK_FILENAME);
}

async function readProviderWorkerSessionLogHydrationState(
  runDir: string
): Promise<ProviderWorkerSessionLogHydrationState | null> {
  try {
    const raw = await readFile(buildProofSessionLogHydrationPath(runDir), 'utf8');
    return normalizeProviderWorkerSessionLogHydrationState(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeProviderWorkerSessionLogHydrationState(
  runDir: string,
  hydrationState: ProviderWorkerSessionLogHydrationState | null
): Promise<void> {
  await writeJsonAtomic(buildProofSessionLogHydrationPath(runDir), hydrationState);
}

export async function readProviderLinearWorkerChildStreams(
  runDir: string
): Promise<ProviderLinearWorkerChildStreamRecord[]> {
  let raw: string;
  try {
    raw = await readFile(buildChildStreamsPath(runDir), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('provider-linear-worker child-stream ledger is not an array.');
  }
  const normalized = parsed.map((entry) => normalizeProviderLinearWorkerChildStreamRecord(entry));
  if (normalized.some((entry) => entry === null)) {
    throw new Error('provider-linear-worker child-stream ledger contains invalid records.');
  }
  return normalized as ProviderLinearWorkerChildStreamRecord[];
}

export async function appendProviderLinearWorkerChildStreamRecord(
  runDir: string,
  record: ProviderLinearWorkerChildStreamRecord,
  writeJson: (path: string, value: unknown) => Promise<void> = async (path, value) => await writeJsonAtomic(path, value)
): Promise<ProviderLinearWorkerChildStreamRecord[]> {
  return await withProviderLinearWorkerChildStreamsLock(runDir, async () => {
    const existing = await readProviderLinearWorkerChildStreams(runDir);
    const next = existing.filter(
      (entry) => !(entry.task_id === record.task_id && entry.run_id === record.run_id)
    );
    next.push(record);
    await writeJson(buildChildStreamsPath(runDir), next);
    return next;
  });
}

export async function readProviderLinearWorkerChildLanes(
  runDir: string
): Promise<ProviderLinearWorkerChildLaneRecord[]> {
  return (await readProviderLinearWorkerChildLanesWithPresence(runDir)).records;
}

async function readProviderLinearWorkerChildLanesWithPresence(
  runDir: string
): Promise<{ records: ProviderLinearWorkerChildLaneRecord[]; ledgerExists: boolean }> {
  let raw: string;
  try {
    raw = await readFile(buildChildLanesPath(runDir), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return { records: [], ledgerExists: false };
    }
    throw error;
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('provider-linear-worker child-lane ledger is not an array.');
  }
  const normalized = parsed.map((entry) => normalizeProviderLinearWorkerChildLaneRecord(entry));
  if (normalized.some((entry) => entry === null)) {
    throw new Error('provider-linear-worker child-lane ledger contains invalid records.');
  }
  return {
    records: normalized as ProviderLinearWorkerChildLaneRecord[],
    ledgerExists: true
  };
}

interface ProviderLinearWorkerParentManifestHydrationMetadata {
  runId: string;
  issueId: string | null;
  issueIdentifier: string | null;
  workspacePath: string | null;
}

interface ProviderLinearWorkerChildLaneManifestHydrationCandidate {
  runId: string;
  status: string;
  manifestPath: string;
  artifactRoot: string;
  logPath: string | null;
  summary: string | null;
  startedAt: string;
  updatedAt: string | null;
  laneWorkspacePath: string | null;
  patchArtifactPath: string | null;
  patchBytes: number | null;
  guardrailsRequired: boolean | null;
  guardrailsRequiredSource: string | null;
  guardrailCommandCount: number | null;
  summaryRecordedAt: string | null;
  runtimeMode: string | null;
  runtimeProvider: string | null;
  heartbeatAt: string | null;
  heartbeatStaleAfterSeconds: number | null;
  runnerPid: number | null;
  runnerStartedAt: string | null;
  runnerAlive: boolean | null;
  runnerIdentityStatus: ProviderLinearWorkerChildLaneRunnerIdentityStatus | null;
  runnerIdentityReason: string | null;
  runnerObservedStartedAt: string | null;
  runnerCommandLineMatches: boolean | null;
  runtimeEvent: string | null;
  runtimeEventAt: string | null;
  appserverStartupObserved: boolean | null;
  appserverStartupObservedAt: string | null;
  staleInvalidationCandidate: boolean | null;
  staleInvalidationReason: string | null;
}

interface ProviderLinearWorkerProcessInspection {
  alive: boolean | null;
  startedAt: string | null;
  commandLine: string | null;
  error: string | null;
}

interface ProviderLinearWorkerChildLaneRunnerIdentity {
  alive: boolean | null;
  status: ProviderLinearWorkerChildLaneRunnerIdentityStatus | null;
  reason: string | null;
  observedStartedAt: string | null;
  commandLineMatches: boolean | null;
}

interface ProviderLinearWorkerChildLaneHydrationOptions {
  now: () => string;
  isProcessAlive?: (pid: number) => boolean;
  inspectProcess?: (
    pid: number
  ) => ProviderLinearWorkerProcessInspection | Promise<ProviderLinearWorkerProcessInspection>;
}

async function hydrateProviderLinearWorkerChildLanesFromActiveManifests(
  runDir: string,
  childLanes: ProviderLinearWorkerChildLaneRecord[],
  priorProofChildLanes: ProviderLinearWorkerChildLaneRecord[] | null | undefined = null,
  options: ProviderLinearWorkerChildLaneHydrationOptions = {
    now: () => new Date().toISOString(),
    inspectProcess: inspectLocalProviderLinearChildLaneRunnerProcess
  }
): Promise<ProviderLinearWorkerChildLaneRecord[]> {
  if (childLanes.length === 0) {
    return childLanes;
  }
  const parent = await readProviderLinearWorkerParentManifestHydrationMetadata(runDir);
  if (!parent) {
    return childLanes;
  }
  return await Promise.all(
    childLanes.map(async (childLane) =>
      await hydrateProviderLinearWorkerChildLaneFromActiveManifest(
        parent,
        childLane,
        findMatchingPriorHydratedProviderLinearWorkerChildLane(childLane, priorProofChildLanes),
        options
      )
    )
  );
}

async function readHydratedProviderLinearWorkerChildLanesAndRepairLedger(
  runDir: string,
  priorProofChildLanes: ProviderLinearWorkerChildLaneRecord[] | null | undefined = null,
  options: ProviderLinearWorkerChildLaneHydrationOptions = {
    now: () => new Date().toISOString(),
    inspectProcess: inspectLocalProviderLinearChildLaneRunnerProcess
  }
): Promise<ProviderLinearWorkerChildLaneRecord[]> {
  return await withProviderLinearWorkerChildLanesLock(runDir, async () => {
    const { records: existing, ledgerExists } = await readProviderLinearWorkerChildLanesWithPresence(runDir);
    if (!ledgerExists && existing.length === 0 && Array.isArray(priorProofChildLanes)) {
      const recovered = priorProofChildLanes
        .filter(isProviderLinearWorkerRetiredChildLaneRecord)
        .map((childLane) => normalizeProviderLinearWorkerRetiredChildLane(childLane));
      if (recovered.length > 0) {
        await writeJsonAtomic(buildChildLanesPath(runDir), recovered);
      }
      return recovered;
    }
    const hydrated = await hydrateProviderLinearWorkerChildLanesFromActiveManifests(
      runDir,
      existing,
      priorProofChildLanes,
      options
    );
    const ledgerRecords = hydrated.map((childLane, index) =>
      preserveProviderLinearWorkerLaunchReservationLedgerIdentity(existing[index] ?? null, childLane)
    );
    if (JSON.stringify(existing) !== JSON.stringify(ledgerRecords)) {
      await writeJsonAtomic(buildChildLanesPath(runDir), ledgerRecords);
    }
    return hydrated;
  });
}

function findMatchingPriorHydratedProviderLinearWorkerChildLane(
  existing: ProviderLinearWorkerChildLaneRecord,
  priorProofChildLanes: ProviderLinearWorkerChildLaneRecord[] | null | undefined
): ProviderLinearWorkerChildLaneRecord | null {
  const existingRunId = normalizeOptionalString(existing.run_id);
  if (!existingRunId?.startsWith('launching-') || !Array.isArray(priorProofChildLanes)) {
    return null;
  }
  return (
    priorProofChildLanes.find(
      (prior): prior is ProviderLinearWorkerChildLaneRecord =>
        isRecord(prior) &&
        prior.pipeline_id === existing.pipeline_id &&
        prior.decision === existing.decision &&
        prior.stream === existing.stream &&
        prior.task_id === existing.task_id &&
        prior.issue_id === existing.issue_id &&
        prior.issue_identifier === existing.issue_identifier &&
        prior.launched_at === existing.launched_at &&
        normalizeOptionalString(prior.run_id)?.startsWith('launching-') !== true
    ) ?? null
  );
}

function preserveProviderLinearWorkerLaunchReservationLedgerIdentity(
  existing: ProviderLinearWorkerChildLaneRecord | null,
  hydrated: ProviderLinearWorkerChildLaneRecord
): ProviderLinearWorkerChildLaneRecord {
  if (!existing) {
    return hydrated;
  }
  const existingRunId = normalizeOptionalString(existing.run_id);
  if (
    existing.pipeline_id !== PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID ||
    existing.decision !== 'pending' ||
    !existingRunId?.startsWith('launching-') ||
    existingRunId === hydrated.run_id ||
    existing.stream !== hydrated.stream ||
    existing.task_id !== hydrated.task_id
  ) {
    return hydrated;
  }
  if (hydrated.stale_invalidation_candidate) {
    return hydrated;
  }
  return existing;
}

async function readProviderLinearWorkerParentManifestHydrationMetadata(
  runDir: string
): Promise<ProviderLinearWorkerParentManifestHydrationMetadata | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(join(runDir, 'manifest.json'), 'utf8')) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const runId = normalizeOptionalString(parsed.run_id) ?? normalizeOptionalString(parsed.runId);
  if (!runId) {
    return null;
  }
  return {
    runId,
    issueId: normalizeOptionalString(parsed.issue_id) ?? normalizeOptionalString(parsed.issueId),
    issueIdentifier:
      normalizeOptionalString(parsed.issue_identifier) ?? normalizeOptionalString(parsed.issueIdentifier),
    workspacePath:
      normalizeOptionalString(parsed.workspace_path) ?? normalizeOptionalString(parsed.workspacePath)
  };
}

async function hydrateProviderLinearWorkerChildLaneFromActiveManifest(
  parent: ProviderLinearWorkerParentManifestHydrationMetadata,
  childLane: ProviderLinearWorkerChildLaneRecord,
  priorHydratedChildLane: ProviderLinearWorkerChildLaneRecord | null = null,
  options: ProviderLinearWorkerChildLaneHydrationOptions = {
    now: () => new Date().toISOString(),
    inspectProcess: inspectLocalProviderLinearChildLaneRunnerProcess
  }
): Promise<ProviderLinearWorkerChildLaneRecord> {
  if (isProviderLinearWorkerRetiredChildLanePlaceholder(childLane)) {
    return retireProviderLinearWorkerChildLanePlaceholder(childLane);
  }
  if (!isProviderLinearWorkerPendingChildLaneRecord(childLane)) {
    return childLane;
  }
  const childCliDir = resolveProviderLinearWorkerChildLaneCliDir(parent, childLane);
  if (!childCliDir) {
    return childLane;
  }
  const reservationPlaceholder = isProviderLinearWorkerChildLaneReservationPlaceholder(childLane);
  const candidate = reservationPlaceholder
    ? await findMatchingProviderLinearWorkerChildLaneManifest(
      parent,
      childLane,
      childCliDir,
      options,
      priorHydratedChildLane
    )
    : await readProviderLinearWorkerChildLaneManifestCandidate(
      parent,
      childLane,
      childCliDir,
      resolveProviderLinearWorkerChildLanePath(
        childLane.manifest_path,
        childLane.workspace_path ?? parent.workspacePath
      ) ?? join(childCliDir, childLane.run_id, 'manifest.json'),
      options,
      priorHydratedChildLane
    );
  if (!candidate) {
    return childLane;
  }
  if (!reservationPlaceholder && candidate.runId !== childLane.run_id) {
    return childLane;
  }
  const summary = buildProviderLinearWorkerHydratedChildLaneSummary(childLane, candidate);
  const priorSummaryRecordedAt =
    priorHydratedChildLane && priorHydratedChildLane.summary === summary
      ? priorHydratedChildLane.summary_recorded_at
      : null;
  const summaryRecordedAt =
    summary === childLane.summary
      ? childLane.summary_recorded_at ??
        priorSummaryRecordedAt ??
        candidate.summaryRecordedAt ??
        childLane.launched_at
      : priorSummaryRecordedAt ??
        candidate.summaryRecordedAt ??
        childLane.summary_recorded_at ??
        childLane.launched_at;
  return {
    ...childLane,
    run_id: candidate.runId,
    status: candidate.status,
    manifest_path: candidate.manifestPath,
    artifact_root: candidate.artifactRoot,
    log_path: candidate.logPath,
    summary,
    summary_recorded_at: summaryRecordedAt,
    guardrails_required: candidate.guardrailsRequired,
    guardrails_required_source: candidate.guardrailsRequiredSource,
    guardrail_command_count: candidate.guardrailCommandCount,
    lane_workspace_path: candidate.laneWorkspacePath ?? childLane.lane_workspace_path,
    patch_artifact_path: candidate.patchArtifactPath ?? childLane.patch_artifact_path,
    patch_bytes: candidate.patchBytes ?? childLane.patch_bytes,
    runtime_mode: candidate.runtimeMode,
    runtime_provider: candidate.runtimeProvider,
    heartbeat_at: candidate.heartbeatAt,
    heartbeat_stale_after_seconds: candidate.heartbeatStaleAfterSeconds,
    runner_pid: candidate.runnerPid,
    runner_started_at: candidate.runnerStartedAt,
    runner_alive: candidate.runnerAlive,
    runner_identity_status: candidate.runnerIdentityStatus,
    runner_identity_reason: candidate.runnerIdentityReason,
    runner_observed_started_at: candidate.runnerObservedStartedAt,
    runner_command_line_matches: candidate.runnerCommandLineMatches,
    runtime_event: candidate.runtimeEvent,
    runtime_event_at: candidate.runtimeEventAt,
    appserver_startup_observed: candidate.appserverStartupObserved,
    appserver_startup_observed_at: candidate.appserverStartupObservedAt,
    stale_invalidation_candidate: candidate.staleInvalidationCandidate,
    stale_invalidation_reason: candidate.staleInvalidationReason
  };
}

function isProviderLinearWorkerPendingChildLaneRecord(
  childLane: ProviderLinearWorkerChildLaneRecord
): boolean {
  return (
    childLane.pipeline_id === PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID &&
    childLane.decision === 'pending'
  );
}

function isProviderLinearWorkerRetiredChildLanePlaceholder(
  childLane: ProviderLinearWorkerChildLaneRecord
): boolean {
  if (!isProviderLinearWorkerRetiredChildLaneRecord(childLane)) {
    return false;
  }
  const runId = normalizeOptionalString(childLane.run_id);
  const summary = normalizeOptionalString(childLane.summary);
  return (
    childLane.status === 'launching' ||
    isActiveLookingProviderLinearWorkerChildLaneStatus(childLane.status) ||
    childLane.status === 'stale_invalidation_candidate' ||
    childLane.stale_invalidation_candidate === true ||
    Boolean(normalizeOptionalString(childLane.in_flight_action)) ||
    Boolean(runId?.startsWith('launching-')) ||
    isActiveLookingProviderLinearWorkerChildLaneSummary(summary)
  );
}

function isProviderLinearWorkerRetiredChildLaneRecord(
  childLane: ProviderLinearWorkerChildLaneRecord
): boolean {
  return (
    childLane.pipeline_id === PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID &&
    (childLane.decision === 'invalidated' || childLane.decision === 'rejected')
  );
}

function normalizeProviderLinearWorkerRetiredChildLane(
  childLane: ProviderLinearWorkerChildLaneRecord
): ProviderLinearWorkerChildLaneRecord {
  return isProviderLinearWorkerRetiredChildLanePlaceholder(childLane) ||
    Boolean(normalizeOptionalString(childLane.in_flight_action))
    ? retireProviderLinearWorkerChildLanePlaceholder(childLane)
    : childLane;
}

function retireProviderLinearWorkerChildLanePlaceholder(
  childLane: ProviderLinearWorkerChildLaneRecord
): ProviderLinearWorkerChildLaneRecord {
  const decision = childLane.decision === 'rejected' ? 'rejected' : 'invalidated';
  const existingSummary = normalizeOptionalString(childLane.summary);
  const reason = normalizeOptionalString(childLane.decision_reason);
  const retirementSummary = reason
    ? `Child lane ${childLane.stream} was ${decision}: ${reason}`
    : `Child lane ${childLane.stream} was ${decision}.`;
  const summary =
    existingSummary &&
    !isActiveLookingProviderLinearWorkerChildLaneStatus(childLane.status) &&
    !isActiveLookingProviderLinearWorkerChildLaneSummary(existingSummary)
      ? existingSummary
      : retirementSummary;
  const summaryChanged = summary !== existingSummary;
  return {
    ...childLane,
    status: decision,
    summary,
    in_flight_action: null,
    in_flight_started_at: null,
    summary_recorded_at:
      summaryChanged
        ? childLane.decision_at ??
          childLane.in_flight_started_at ??
          childLane.summary_recorded_at ??
          childLane.launched_at
        : childLane.summary_recorded_at ??
          childLane.decision_at ??
          childLane.in_flight_started_at ??
          childLane.launched_at
  };
}

function isActiveLookingProviderLinearWorkerChildLaneStatus(status: string): boolean {
  return status === 'launching' || status === 'in_progress' || status === 'running' || status === 'queued';
}

function isActiveLookingProviderLinearWorkerChildLaneSummary(summary: string | null): boolean {
  if (!summary) {
    return false;
  }
  const normalized = summary.toLowerCase();
  return (
    summary === PROVIDER_LINEAR_CHILD_LANE_RESERVED_SUMMARY ||
    normalized.includes(' is running') ||
    normalized.includes(' is queued') ||
    normalized.includes(' status is in_progress') ||
    normalized.includes(' status is running') ||
    normalized.includes(' status is queued') ||
    normalized.includes(' status is launching') ||
    normalized.includes('reserved before child run startup')
  );
}

function isProviderLinearWorkerChildLaneReservationPlaceholder(
  childLane: ProviderLinearWorkerChildLaneRecord
): boolean {
  const runId = normalizeOptionalString(childLane.run_id);
  const summary = normalizeOptionalString(childLane.summary);
  return (
    childLane.pipeline_id === PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID &&
    childLane.decision === 'pending' &&
    (
      childLane.status === 'launching' ||
      Boolean(runId?.startsWith('launching-')) ||
      summary === PROVIDER_LINEAR_CHILD_LANE_RESERVED_SUMMARY
    )
  );
}

function resolveProviderLinearWorkerChildLaneCliDir(
  parent: ProviderLinearWorkerParentManifestHydrationMetadata,
  childLane: ProviderLinearWorkerChildLaneRecord
): string | null {
  const workspacePath = childLane.workspace_path ?? parent.workspacePath;
  const fallbackCliDir = workspacePath
    ? resolve(workspacePath, '.runs', childLane.task_id, 'cli')
    : null;
  const artifactRoot = resolveProviderLinearWorkerChildLanePath(
    childLane.artifact_root,
    workspacePath
  );
  const manifestPath = resolveProviderLinearWorkerChildLanePath(
    childLane.manifest_path,
    workspacePath
  );
  const placeholderRunDir = artifactRoot ?? (manifestPath ? dirname(manifestPath) : null);
  if (!placeholderRunDir) {
    return fallbackCliDir;
  }
  const candidateCliDir = dirname(placeholderRunDir);
  const runDirName = basename(placeholderRunDir);
  const recordedRunIdMatchesRunDir = (() => {
    const runId = normalizeOptionalString(childLane.run_id);
    if (!runId || runId.startsWith('launching-')) {
      return false;
    }
    try {
      return sanitizeRunId(runId) === runId && runDirName === runId;
    } catch {
      return false;
    }
  })();
  if (
    (!runDirName.startsWith('launching-') && !recordedRunIdMatchesRunDir) ||
    basename(candidateCliDir) !== 'cli' ||
    basename(dirname(candidateCliDir)) !== childLane.task_id
  ) {
    return null;
  }
  return candidateCliDir;
}

function resolveProviderLinearWorkerChildLanePath(
  value: string | null | undefined,
  workspacePath: string | null | undefined
): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  if (isAbsolute(normalized)) {
    return resolve(normalized);
  }
  const normalizedWorkspacePath = normalizeOptionalString(workspacePath);
  return normalizedWorkspacePath ? resolve(normalizedWorkspacePath, normalized) : resolve(normalized);
}

async function findMatchingProviderLinearWorkerChildLaneManifest(
  parent: ProviderLinearWorkerParentManifestHydrationMetadata,
  childLane: ProviderLinearWorkerChildLaneRecord,
  childCliDir: string,
  options: ProviderLinearWorkerChildLaneHydrationOptions,
  priorHydratedChildLane: ProviderLinearWorkerChildLaneRecord | null = null
): Promise<ProviderLinearWorkerChildLaneManifestHydrationCandidate | null> {
  let entries: Array<{ isDirectory(): boolean; name: string }>;
  try {
    entries = await readdir(childCliDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) =>
        await readProviderLinearWorkerChildLaneManifestCandidate(
          parent,
          childLane,
          childCliDir,
          join(childCliDir, entry.name, 'manifest.json'),
          options,
          priorHydratedChildLane
        )
      )
  );
  return candidates
    .filter((candidate): candidate is ProviderLinearWorkerChildLaneManifestHydrationCandidate => candidate !== null)
    .sort((left, right) => {
      const timestampComparison = compareIsoTimestamp(right.updatedAt, left.updatedAt);
      return timestampComparison !== 0 ? timestampComparison : right.runId.localeCompare(left.runId);
    })[0] ?? null;
}

async function readProviderLinearWorkerChildLaneManifestCandidate(
  parent: ProviderLinearWorkerParentManifestHydrationMetadata,
  childLane: ProviderLinearWorkerChildLaneRecord,
  childCliDir: string,
  manifestPath: string,
  options: ProviderLinearWorkerChildLaneHydrationOptions,
  priorHydratedChildLane: ProviderLinearWorkerChildLaneRecord | null = null
): Promise<ProviderLinearWorkerChildLaneManifestHydrationCandidate | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const pipelineId = normalizeOptionalString(parsed.pipeline_id);
  const parentRunId = normalizeOptionalString(parsed.parent_run_id);
  const issueId = normalizeOptionalString(parsed.issue_id);
  const issueIdentifier = normalizeOptionalString(parsed.issue_identifier);
  const taskId = normalizeOptionalString(parsed.task_id);
  const runId = normalizeOptionalString(parsed.run_id);
  const status = normalizeOptionalString(parsed.status);
  const startedAt = normalizeOptionalString(parsed.started_at);
  if (
    pipelineId !== PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID ||
    parentRunId !== parent.runId ||
    issueId !== childLane.issue_id ||
    issueIdentifier !== childLane.issue_identifier ||
    taskId !== childLane.task_id ||
    !runId ||
    runId.startsWith('launching-') ||
    !status ||
    !startedAt ||
    compareIsoTimestamp(startedAt, childLane.launched_at) < 0
  ) {
    return null;
  }
  if (parent.issueId && issueId !== parent.issueId) {
    return null;
  }
  if (parent.issueIdentifier && issueIdentifier !== parent.issueIdentifier) {
    return null;
  }
  let sanitizedRunId: string;
  try {
    sanitizedRunId = sanitizeRunId(runId);
  } catch {
    return null;
  }
  if (!sanitizedRunId || sanitizedRunId !== runId) {
    return null;
  }
  const workspacePath =
    normalizeOptionalString(parsed.workspace_path) ??
    childLane.workspace_path ??
    parent.workspacePath;
  const manifestArtifactRoot = resolveProviderLinearWorkerChildLanePath(
    normalizeOptionalString(parsed.artifact_root),
    workspacePath
  ) ?? dirname(manifestPath);
  const expectedArtifactRoot = join(childCliDir, sanitizedRunId);
  if (
    manifestArtifactRoot !== expectedArtifactRoot ||
    manifestPath !== join(expectedArtifactRoot, 'manifest.json')
  ) {
    return null;
  }
  if (!isPathWithinRoot(manifestArtifactRoot, childCliDir)) {
    return null;
  }
  if (!isPathWithinRoot(manifestPath, manifestArtifactRoot)) {
    return null;
  }
  const logPath = resolveProviderLinearWorkerChildLanePath(
    normalizeOptionalString(parsed.log_path),
    workspacePath
  );
  if (logPath && !isPathWithinRoot(logPath, manifestArtifactRoot)) {
    return null;
  }
  const proofMetadata = await readProviderLinearWorkerChildLaneProofHydrationMetadata(
    parent,
    childLane,
    runId,
    manifestArtifactRoot,
    workspacePath
  );
  const runtimeDiagnostics = await readProviderLinearWorkerChildLaneRuntimeDiagnostics(
    parent,
    childLane,
    runId,
    manifestArtifactRoot
  );
  const runtimeMode =
    normalizeOptionalString(runtimeDiagnostics?.provider_linear_child_lane_runtime_selected_mode) ??
    normalizeOptionalString(runtimeDiagnostics?.runtime_mode) ??
    normalizeOptionalString(parsed.runtime_mode);
  const runtimeProvider =
    normalizeOptionalString(runtimeDiagnostics?.provider_linear_child_lane_runtime_provider) ??
    normalizeOptionalString(runtimeDiagnostics?.runtime_provider) ??
    normalizeOptionalString(parsed.runtime_provider);
  const heartbeatAt = normalizeOptionalString(parsed.heartbeat_at);
  const heartbeatStaleAfterSeconds = normalizeOptionalInteger(parsed.heartbeat_stale_after_seconds);
  const rawRunnerPid = normalizeOptionalInteger(
    runtimeDiagnostics?.provider_linear_child_lane_runner_pid ?? parsed.provider_linear_child_lane_runner_pid
  );
  const runnerPid = rawRunnerPid !== null && rawRunnerPid > 0 ? rawRunnerPid : null;
  const runnerStartedAt = normalizeOptionalString(
    runtimeDiagnostics?.provider_linear_child_lane_runner_started_at ??
      parsed.provider_linear_child_lane_runner_started_at
  );
  const runnerIdentity = await inspectProviderLinearWorkerChildLaneRunnerIdentity({
    runnerPid,
    runnerStartedAt,
    options
  });
  const runnerAlive = runnerIdentity.alive;
  const runtimeEvent = normalizeOptionalString(
    runtimeDiagnostics?.provider_linear_child_lane_runtime_event ?? parsed.provider_linear_child_lane_runtime_event
  );
  const runtimeEventAt = normalizeOptionalString(
    runtimeDiagnostics?.provider_linear_child_lane_runtime_event_at ?? parsed.provider_linear_child_lane_runtime_event_at
  );
  const appserverStartupObserved =
    runtimeEvent === 'appserver_startup_observed' ||
    runtimeDiagnostics?.provider_linear_child_lane_appserver_startup_observed === true ||
    parsed.provider_linear_child_lane_appserver_startup_observed === true;
  const appserverStartupObservedAt = normalizeOptionalString(
    runtimeDiagnostics?.provider_linear_child_lane_appserver_startup_observed_at ??
      parsed.provider_linear_child_lane_appserver_startup_observed_at ??
      (runtimeEvent === 'appserver_startup_observed' ? runtimeEventAt : null)
  );
  const successfulStatus = isSuccessfulProviderLinearWorkerChildLaneStatus(status);
  const patchArtifactPath = proofMetadata?.patchArtifactPath ?? null;
  const patchBytes = proofMetadata?.patchBytes ?? null;
  const proofOutputReady = Boolean(patchArtifactPath);
  const patchReady = Boolean(patchArtifactPath && patchBytes !== null && patchBytes > 0);
  const diagnosticStatus = successfulStatus && !proofOutputReady ? 'in_progress' : status;
  const staleDiagnostic = resolveProviderLinearWorkerChildLanePostStartupNoOutputDiagnostic({
    childLane,
    status: diagnosticStatus,
    runtimeMode,
    heartbeatAt,
    heartbeatStaleAfterSeconds,
    runnerPid,
    runnerStartedAt,
    runnerAlive,
    runnerIdentityStatus: runnerIdentity.status,
    runnerIdentityReason: runnerIdentity.reason,
    runtimeEvent,
    runtimeEventAt,
    appserverStartupObserved,
    appserverStartupObservedAt,
    proofOutputReady,
    now: options.now
  });
  const hydratedStatus = staleDiagnostic
    ? 'stale_invalidation_candidate'
    : diagnosticStatus;
  const manifestTimestamp = latestProviderLinearWorkerChildLaneManifestTimestamp(parsed);
  const summaryRecordedAt = providerLinearWorkerChildLaneSummaryRecordedAt(
    parsed,
    proofMetadata?.updatedAt ?? null,
    startedAt
  );
  const summary = staleDiagnostic?.summary ??
    (
      successfulStatus && !patchReady
        ? patchBytes === 0
          ? 'Child lane completed without patch output; waiting for parent ledger decision.'
          : 'Child lane completed; waiting for patch proof metadata.'
        : stripNonApplicableGuardrailSummaryLines(parsed, normalizeOptionalString(parsed.summary)) ??
          normalizeOptionalString(parsed.status_detail)
    );
  const priorStaleSummaryRecordedAt =
    staleDiagnostic &&
    priorHydratedChildLane?.stale_invalidation_candidate === true &&
    priorHydratedChildLane.stale_invalidation_reason === staleDiagnostic.reason
      ? priorHydratedChildLane.summary_recorded_at
      : null;
  const currentStaleSummaryRecordedAt =
    staleDiagnostic &&
    childLane.stale_invalidation_candidate === true &&
    childLane.stale_invalidation_reason === staleDiagnostic.reason
      ? childLane.summary_recorded_at
      : null;
  const staleSummaryRecordedAt =
    staleDiagnostic
      ? currentStaleSummaryRecordedAt ?? priorStaleSummaryRecordedAt ?? staleDiagnostic.observedAt
      : null;
  return {
    runId,
    status: hydratedStatus,
    manifestPath,
    artifactRoot: manifestArtifactRoot,
    logPath,
    summary,
    startedAt,
    updatedAt: manifestTimestamp,
    laneWorkspacePath: proofMetadata?.laneWorkspacePath ?? null,
    patchArtifactPath,
    patchBytes: proofMetadata?.patchBytes ?? null,
    guardrailsRequired: resolveGuardrailsRequiredForManifest(parsed),
    guardrailsRequiredSource: resolveGuardrailsRequiredSourceForManifest(parsed),
    guardrailCommandCount: countGuardrailCommands(parsed),
    summaryRecordedAt: staleSummaryRecordedAt ?? summaryRecordedAt,
    runtimeMode,
    runtimeProvider,
    heartbeatAt,
    heartbeatStaleAfterSeconds,
    runnerPid,
    runnerStartedAt,
    runnerAlive,
    runnerIdentityStatus: runnerIdentity.status,
    runnerIdentityReason: runnerIdentity.reason,
    runnerObservedStartedAt: runnerIdentity.observedStartedAt,
    runnerCommandLineMatches: runnerIdentity.commandLineMatches,
    runtimeEvent,
    runtimeEventAt,
    appserverStartupObserved,
    appserverStartupObservedAt,
    staleInvalidationCandidate: staleDiagnostic ? true : null,
    staleInvalidationReason: staleDiagnostic?.reason ?? null
  };
}

interface ProviderLinearWorkerChildLaneProofHydrationMetadata {
  laneWorkspacePath: string | null;
  patchArtifactPath: string | null;
  patchBytes: number | null;
  updatedAt: string | null;
}

async function readProviderLinearWorkerChildLaneRuntimeDiagnostics(
  parent: ProviderLinearWorkerParentManifestHydrationMetadata,
  childLane: ProviderLinearWorkerChildLaneRecord,
  runId: string,
  artifactRoot: string
): Promise<Record<string, unknown> | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      await readFile(join(artifactRoot, PROVIDER_LINEAR_CHILD_LANE_DIAGNOSTICS_FILENAME), 'utf8')
    ) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  if (
    normalizeOptionalString(parsed.parent_run_id) !== parent.runId ||
    normalizeOptionalString(parsed.issue_id) !== childLane.issue_id ||
    normalizeOptionalString(parsed.issue_identifier) !== childLane.issue_identifier ||
    normalizeOptionalString(parsed.task_id) !== childLane.task_id ||
    normalizeOptionalString(parsed.run_id) !== runId
  ) {
    return null;
  }
  if (parent.issueId && normalizeOptionalString(parsed.issue_id) !== parent.issueId) {
    return null;
  }
  if (parent.issueIdentifier && normalizeOptionalString(parsed.issue_identifier) !== parent.issueIdentifier) {
    return null;
  }
  const stream = normalizeOptionalString(parsed.stream);
  if (stream && stream !== childLane.stream) {
    return null;
  }
  return parsed;
}

async function inspectProviderLinearWorkerChildLaneRunnerIdentity(input: {
  runnerPid: number | null;
  runnerStartedAt: string | null;
  options: ProviderLinearWorkerChildLaneHydrationOptions;
}): Promise<ProviderLinearWorkerChildLaneRunnerIdentity> {
  if (input.runnerPid === null) {
    return {
      alive: null,
      status: 'not_recorded',
      reason: 'runner_pid_not_recorded',
      observedStartedAt: null,
      commandLineMatches: null
    };
  }
  const inspection = await readProviderLinearWorkerChildLaneRunnerProcessInspection(
    input.runnerPid,
    input.options
  );
  return resolveProviderLinearWorkerChildLaneRunnerIdentity({
    runnerStartedAt: input.runnerStartedAt,
    inspection
  });
}

async function readProviderLinearWorkerChildLaneRunnerProcessInspection(
  pid: number,
  options: ProviderLinearWorkerChildLaneHydrationOptions
): Promise<ProviderLinearWorkerProcessInspection> {
  if (options.inspectProcess) {
    try {
      return normalizeProviderLinearWorkerProcessInspection(await options.inspectProcess(pid));
    } catch (error) {
      return {
        alive: null,
        startedAt: null,
        commandLine: null,
        error: providerLinearWorkerErrorMessage(error)
      };
    }
  }
  if (options.isProcessAlive) {
    return {
      alive: options.isProcessAlive(pid),
      startedAt: null,
      commandLine: null,
      error: null
    };
  }
  return await inspectLocalProviderLinearChildLaneRunnerProcess(pid);
}

function normalizeProviderLinearWorkerProcessInspection(
  value: ProviderLinearWorkerProcessInspection | unknown
): ProviderLinearWorkerProcessInspection {
  if (!isRecord(value)) {
    return {
      alive: null,
      startedAt: null,
      commandLine: null,
      error: 'process_identity_inspection_invalid'
    };
  }
  return {
    alive: typeof value.alive === 'boolean' ? value.alive : null,
    startedAt: normalizeOptionalString(value.startedAt),
    commandLine: normalizeOptionalString(value.commandLine),
    error: normalizeOptionalString(value.error)
  };
}

function resolveProviderLinearWorkerChildLaneRunnerIdentity(input: {
  runnerStartedAt: string | null;
  inspection: ProviderLinearWorkerProcessInspection;
}): ProviderLinearWorkerChildLaneRunnerIdentity {
  const commandLineMatches = resolveProviderLinearChildLaneRunnerCommandLineMatch(input.inspection.commandLine);
  const recordedStartedMs = input.runnerStartedAt ? Date.parse(input.runnerStartedAt) : Number.NaN;
  const recordedStartIdentityError =
    !input.runnerStartedAt
      ? 'runner_started_at_missing'
      : Number.isFinite(recordedStartedMs)
        ? null
        : 'runner_started_at_unparseable';
  if (input.inspection.alive === false) {
    if (recordedStartIdentityError) {
      return {
        alive: null,
        status: 'ambiguous',
        reason: recordedStartIdentityError,
        observedStartedAt: input.inspection.startedAt,
        commandLineMatches
      };
    }
    return {
      alive: false,
      status: 'not_live',
      reason: 'runner_pid_not_live',
      observedStartedAt: input.inspection.startedAt,
      commandLineMatches
    };
  }
  if (input.inspection.alive !== true) {
    const lookupFailureReason = input.inspection.error
      ? `process_identity_lookup_failed:${truncateProviderLinearWorkerDiagnosticReason(input.inspection.error)}`
      : 'process_identity_lookup_unknown';
    return {
      alive: null,
      status: 'ambiguous',
      reason: recordedStartIdentityError ?? lookupFailureReason,
      observedStartedAt: input.inspection.startedAt,
      commandLineMatches
    };
  }
  if (commandLineMatches !== true) {
    const reason =
      commandLineMatches === false
        ? 'process_command_line_mismatch'
        : input.inspection.error
          ? `process_identity_lookup_failed:${truncateProviderLinearWorkerDiagnosticReason(input.inspection.error)}`
          : 'process_command_line_unavailable';
    return {
      alive: null,
      status: commandLineMatches === false ? 'pid_reuse_suspected' : 'ambiguous',
      reason,
      observedStartedAt: input.inspection.startedAt,
      commandLineMatches
    };
  }
  if (recordedStartIdentityError) {
    return {
      alive: null,
      status: 'ambiguous',
      reason: recordedStartIdentityError,
      observedStartedAt: input.inspection.startedAt,
      commandLineMatches
    };
  }
  if (!input.inspection.startedAt) {
    return {
      alive: null,
      status: 'ambiguous',
      reason: input.inspection.error
        ? `process_start_time_unavailable:${truncateProviderLinearWorkerDiagnosticReason(input.inspection.error)}`
        : 'process_start_time_unavailable',
      observedStartedAt: null,
      commandLineMatches
    };
  }
  const observedStartedMs = Date.parse(input.inspection.startedAt);
  if (!Number.isFinite(observedStartedMs)) {
    return {
      alive: null,
      status: 'ambiguous',
      reason: 'process_start_time_unparseable',
      observedStartedAt: input.inspection.startedAt,
      commandLineMatches
    };
  }
  if (observedStartedMs > recordedStartedMs) {
    return {
      alive: null,
      status: 'pid_reuse_suspected',
      reason: 'process_started_after_recorded_runner_start',
      observedStartedAt: input.inspection.startedAt,
      commandLineMatches
    };
  }
  if (observedStartedMs < recordedStartedMs - PROVIDER_LINEAR_CHILD_LANE_RUNNER_IDENTITY_START_BEFORE_TOLERANCE_MS) {
    return {
      alive: null,
      status: 'pid_reuse_suspected',
      reason: 'process_start_time_mismatch',
      observedStartedAt: input.inspection.startedAt,
      commandLineMatches
    };
  }
  return {
    alive: true,
    status: 'matched',
    reason: 'process_identity_matched',
    observedStartedAt: input.inspection.startedAt,
    commandLineMatches
  };
}

async function inspectLocalProviderLinearChildLaneRunnerProcess(
  pid: number
): Promise<ProviderLinearWorkerProcessInspection> {
  if (!isLocalProcessAlive(pid)) {
    return {
      alive: false,
      startedAt: null,
      commandLine: null,
      error: null
    };
  }
  const [startedAtResult, commandLineResult] = await Promise.all([
    readLocalProcessPsOutput(pid, 'lstart='),
    readLocalProcessCommandLine(pid)
  ]);
  if (startedAtResult.output === null && commandLineResult.output === null && !isLocalProcessAlive(pid)) {
    return {
      alive: false,
      startedAt: null,
      commandLine: null,
      error: 'process_exited_before_identity_lookup'
    };
  }
  const startedAt = startedAtResult.output ? parseLocalProcessStartedAt(startedAtResult.output) : null;
  const startError = startedAtResult.output && !startedAt
    ? `process_start_time_unparseable:${startedAtResult.output}`
    : startedAtResult.error;
  const error = [startError, commandLineResult.error]
    .map((value) => normalizeOptionalString(value))
    .filter((value): value is string => Boolean(value))
    .join('; ');
  return {
    alive: true,
    startedAt,
    commandLine: commandLineResult.output,
    error: error || null
  };
}

async function readLocalProcessCommandLine(
  pid: number
): Promise<{ output: string | null; error: string | null }> {
  const commandResult = await readLocalProcessPsOutput(pid, 'command=');
  if (commandResult.output !== null) {
    return commandResult;
  }
  const argsResult = await readLocalProcessPsOutput(pid, 'args=');
  if (argsResult.output !== null) {
    return argsResult;
  }
  return {
    output: null,
    error: [commandResult.error, argsResult.error]
      .map((value) => normalizeOptionalString(value))
      .filter((value): value is string => Boolean(value))
      .join('; ') || null
  };
}

async function readLocalProcessPsOutput(
  pid: number,
  outputColumn: string
): Promise<{ output: string | null; error: string | null }> {
  return await new Promise((resolvePromise) => {
    let stdout = '';
    let stderr = '';
    let completed = false;
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const child = spawn('ps', ['-ww', '-p', String(pid), '-o', outputColumn], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const finish = (result: { output: string | null; error: string | null }) => {
      if (completed) {
        return;
      }
      completed = true;
      if (timer) {
        clearTimeout(timer);
      }
      resolvePromise(result);
    };
    timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, PROVIDER_LINEAR_CHILD_LANE_RUNNER_PROCESS_LOOKUP_TIMEOUT_MS);
    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      finish({
        output: null,
        error: providerLinearWorkerErrorMessage(error)
      });
    });
    child.on('close', (code) => {
      if (timedOut) {
        finish({
          output: null,
          error: 'process_identity_lookup_timeout'
        });
        return;
      }
      const output = normalizeOptionalString(stdout);
      if (code === 0 && output) {
        finish({
          output,
          error: null
        });
        return;
      }
      finish({
        output: null,
        error: normalizeOptionalString(stderr) ?? `ps exited with code ${code ?? 'unknown'}`
      });
    });
  });
}

function parseLocalProcessStartedAt(value: string): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function resolveProviderLinearChildLaneRunnerCommandLineMatch(commandLine: string | null): boolean | null {
  const normalized = normalizeOptionalString(commandLine);
  if (!normalized) {
    return null;
  }
  return normalized.includes('providerLinearChildLaneRunner');
}

function truncateProviderLinearWorkerDiagnosticReason(value: string): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return 'unknown';
  }
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function providerLinearWorkerErrorMessage(error: unknown): string {
  return normalizeOptionalString((error as Error)?.message) ?? String(error);
}

function resolveProviderLinearWorkerChildLanePostStartupNoOutputDiagnostic(input: {
  childLane: ProviderLinearWorkerChildLaneRecord;
  status: string;
  runtimeMode: string | null;
  heartbeatAt: string | null;
  heartbeatStaleAfterSeconds: number | null;
  runnerPid: number | null;
  runnerStartedAt: string | null;
  runnerAlive: boolean | null;
  runnerIdentityStatus: ProviderLinearWorkerChildLaneRunnerIdentityStatus | null;
  runnerIdentityReason: string | null;
  runtimeEvent: string | null;
  runtimeEventAt: string | null;
  appserverStartupObserved: boolean | null;
  appserverStartupObservedAt: string | null;
  proofOutputReady: boolean;
  now: () => string;
}): { observedAt: string; reason: string; summary: string } | null {
  if (
    !isActiveLookingProviderLinearWorkerChildLaneStatus(input.status) ||
    input.runtimeMode !== 'appserver' ||
    input.appserverStartupObserved !== true ||
    input.proofOutputReady
  ) {
    return null;
  }
  const heartbeatMs = input.heartbeatAt ? Date.parse(input.heartbeatAt) : Number.NaN;
  const now = input.now();
  const nowMs = Date.parse(now);
  if (!Number.isFinite(heartbeatMs) || !Number.isFinite(nowMs)) {
    return null;
  }
  const staleAfterMs = Math.max(
    PROVIDER_LINEAR_CHILD_LANE_POST_STARTUP_NO_OUTPUT_MIN_STALE_MS,
    (input.heartbeatStaleAfterSeconds ?? 0) * 1000
  );
  if (nowMs - heartbeatMs <= staleAfterMs) {
    return null;
  }
  if (input.runnerAlive !== false || input.runnerIdentityStatus !== 'not_live') {
    return null;
  }
  const stream = input.childLane.stream || input.childLane.task_id || input.childLane.run_id;
  const runnerState =
    input.runnerPid !== null
      ? `providerLinearChildLaneRunner pid ${input.runnerPid} is not live` +
        (input.runnerStartedAt ? ` for recorded start ${input.runnerStartedAt}` : '')
      : 'providerLinearChildLaneRunner pid was not recorded';
  const identityState = input.runnerIdentityReason
    ? ` Runner identity proof: ${input.runnerIdentityReason}.`
    : '';
  const startupAt = input.appserverStartupObservedAt ?? input.runtimeEventAt ?? 'unknown time';
  const reason = 'post_startup_no_output_heartbeat_stale_runner_dead';
  return {
    observedAt: now,
    reason,
    summary:
      `Child lane ${stream} is a stale invalidation candidate: appserver startup was observed at ${startupAt}, ` +
      `manifest heartbeat stopped at ${input.heartbeatAt}, ${runnerState}, and no proof/patch output is present. ` +
      identityState +
      'Invalidate the lane and rerun parent-owned validation, or relaunch under CLI for scoped diagnosis.'
  };
}

async function readProviderLinearWorkerChildLaneProofHydrationMetadata(
  parent: ProviderLinearWorkerParentManifestHydrationMetadata,
  childLane: ProviderLinearWorkerChildLaneRecord,
  runId: string,
  artifactRoot: string,
  workspacePath: string | null | undefined
): Promise<ProviderLinearWorkerChildLaneProofHydrationMetadata | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      await readFile(join(artifactRoot, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME), 'utf8')
    ) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  if (
    normalizeOptionalString(parsed.parent_run_id) !== parent.runId ||
    normalizeOptionalString(parsed.issue_id) !== childLane.issue_id ||
    normalizeOptionalString(parsed.issue_identifier) !== childLane.issue_identifier ||
    normalizeOptionalString(parsed.task_id) !== childLane.task_id ||
    normalizeOptionalString(parsed.run_id) !== runId
  ) {
    return null;
  }
  if (parent.issueId && normalizeOptionalString(parsed.issue_id) !== parent.issueId) {
    return null;
  }
  if (parent.issueIdentifier && normalizeOptionalString(parsed.issue_identifier) !== parent.issueIdentifier) {
    return null;
  }
  const proofWorkspacePath =
    normalizeOptionalString(parsed.lane_workspace_path) ??
    normalizeOptionalString(parsed.workspace_path) ??
    workspacePath;
  const laneWorkspacePath = resolveProviderLinearWorkerChildLanePath(
    normalizeOptionalString(parsed.lane_workspace_path),
    workspacePath
  );
  const patchArtifactPath = resolveProviderLinearWorkerChildLanePath(
    normalizeOptionalString(parsed.patch_artifact_path),
    proofWorkspacePath
  );
  if (patchArtifactPath && !isPathWithinRoot(patchArtifactPath, artifactRoot)) {
    return null;
  }
  return {
    laneWorkspacePath,
    patchArtifactPath,
    patchBytes: normalizeNonNegativeInteger(parsed.patch_bytes),
    updatedAt: normalizeOptionalString(parsed.updated_at)
  };
}

function isSuccessfulProviderLinearWorkerChildLaneStatus(status: string): boolean {
  return status === 'succeeded' || status === 'completed';
}

function latestProviderLinearWorkerChildLaneManifestTimestamp(
  manifest: Record<string, unknown>
): string | null {
  return latestProviderLinearWorkerIsoTimestamp(
    normalizeOptionalString(manifest.updated_at),
    normalizeOptionalString(manifest.heartbeat_at),
    normalizeOptionalString(manifest.completed_at),
    normalizeOptionalString(manifest.started_at)
  );
}

function providerLinearWorkerChildLaneSummaryRecordedAt(
  manifest: Record<string, unknown>,
  proofUpdatedAt: string | null,
  startedAt: string
): string | null {
  const manifestSummaryUpdatedAt =
    normalizeOptionalString(manifest.status) ||
    normalizeOptionalString(manifest.summary) ||
    normalizeOptionalString(manifest.status_detail)
      ? latestProviderLinearWorkerIsoTimestamp(
          normalizeOptionalString(manifest.updated_at),
          normalizeOptionalString(manifest.heartbeat_at)
        )
      : null;
  return latestProviderLinearWorkerIsoTimestamp(
    proofUpdatedAt,
    normalizeOptionalString(manifest.completed_at),
    manifestSummaryUpdatedAt,
    startedAt
  );
}

function latestProviderLinearWorkerIsoTimestamp(...values: Array<string | null | undefined>): string | null {
  const normalized = values
    .map((value) => normalizeOptionalString(value))
    .filter((value): value is string => value !== null)
    .sort(compareIsoTimestamp);
  return normalized[normalized.length - 1] ?? null;
}

function buildProviderLinearWorkerHydratedChildLaneSummary(
  childLane: ProviderLinearWorkerChildLaneRecord,
  candidate: ProviderLinearWorkerChildLaneManifestHydrationCandidate
): string {
  if (
    candidate.summary &&
    (candidate.status === 'stale_invalidation_candidate' || candidate.summary.startsWith('Child lane completed'))
  ) {
    return candidate.summary;
  }
  const label = childLane.stream || childLane.task_id || candidate.runId;
  const status = candidate.status.toLowerCase();
  const statusSummary =
    status === 'succeeded' || status === 'completed'
      ? `Child lane ${label} succeeded.`
      : status === 'failed'
        ? `Child lane ${label} failed.`
        : status === 'canceled' || status === 'cancelled'
          ? `Child lane ${label} was canceled.`
          : status === 'running' || status === 'in_progress'
            ? `Child lane ${label} is running.`
            : status === 'queued'
              ? `Child lane ${label} is queued.`
              : `Child lane ${label} status is ${candidate.status}.`;
  return candidate.summary && candidate.summary !== statusSummary
    ? `${statusSummary} ${candidate.summary}`
    : statusSummary;
}

export async function appendProviderLinearWorkerChildLaneRecord(
  runDir: string,
  record: ProviderLinearWorkerChildLaneRecord,
  writeJson: (path: string, value: unknown) => Promise<void> = async (path, value) => await writeJsonAtomic(path, value)
): Promise<ProviderLinearWorkerChildLaneRecord[]> {
  return await withProviderLinearWorkerChildLanesLock(runDir, async () => {
    const existing = await readProviderLinearWorkerChildLanes(runDir);
    const next = existing.filter(
      (entry) => !(entry.task_id === record.task_id && entry.run_id === record.run_id)
    );
    next.push(record);
    await writeJson(buildChildLanesPath(runDir), next);
    return next;
  });
}

export async function updateProviderLinearWorkerChildLaneRecord(
  runDir: string,
  matcher: (record: ProviderLinearWorkerChildLaneRecord) => boolean,
  updater: (record: ProviderLinearWorkerChildLaneRecord) => ProviderLinearWorkerChildLaneRecord,
  writeJson: (path: string, value: unknown) => Promise<void> = async (path, value) => await writeJsonAtomic(path, value)
): Promise<ProviderLinearWorkerChildLaneRecord | null> {
  return await withProviderLinearWorkerChildLanesLock(runDir, async () => {
    const existing = await readProviderLinearWorkerChildLanes(runDir);
    let updatedRecord: ProviderLinearWorkerChildLaneRecord | null = null;
    const next = existing.map((entry) => {
      if (updatedRecord || !matcher(entry)) {
        return entry;
      }
      updatedRecord = updater(entry);
      return updatedRecord;
    });
    if (!updatedRecord) {
      return null;
    }
    await writeJson(buildChildLanesPath(runDir), next);
    return updatedRecord;
  });
}

export async function transactProviderLinearWorkerChildLanes<T>(
  runDir: string,
  action: (
    records: ProviderLinearWorkerChildLaneRecord[]
  ) => Promise<{ records: ProviderLinearWorkerChildLaneRecord[]; result: T }> | { records: ProviderLinearWorkerChildLaneRecord[]; result: T },
  writeJson: (path: string, value: unknown) => Promise<void> = async (path, value) => await writeJsonAtomic(path, value)
): Promise<T> {
  return await withProviderLinearWorkerChildLanesLock(runDir, async () => {
    const existing = await readProviderLinearWorkerChildLanes(runDir);
    const next = await action(existing);
    await writeJson(buildChildLanesPath(runDir), next.records);
    return next.result;
  });
}

async function withProviderLinearWorkerChildStreamsLock<T>(
  runDir: string,
  action: () => Promise<T>
): Promise<T> {
  const lockPath = buildChildStreamsLockPath(runDir);
  const lock = await acquireLockWithRetry({
    taskId: runDir,
    lockPath,
    retry: PROVIDER_LINEAR_WORKER_CHILD_STREAMS_LOCK_RETRY,
    ensureDirectory: async () => {
      await mkdir(dirname(lockPath), { recursive: true });
    },
    createError: (_taskId, attempts) =>
      new Error(`Failed to acquire provider-linear-worker child-stream ledger lock after ${attempts} attempts.`)
  });
  try {
    return await action();
  } finally {
    await lock.release();
  }
}

async function withProviderLinearWorkerProofLock<T>(
  runDir: string,
  action: () => Promise<T>
): Promise<T> {
  const lockPath = buildProofLockPath(runDir);
  const lock = await acquireLockWithRetry({
    taskId: runDir,
    lockPath,
    retry: PROVIDER_LINEAR_WORKER_PROOF_LOCK_RETRY,
    ensureDirectory: async () => {
      await mkdir(dirname(lockPath), { recursive: true });
    },
    createError: (_taskId, attempts) =>
      new Error(`Failed to acquire provider-linear-worker proof lock after ${attempts} attempts.`)
  });
  try {
    return await action();
  } finally {
    await lock.release();
  }
}

async function withProviderLinearWorkerChildLanesLock<T>(
  runDir: string,
  action: () => Promise<T>
): Promise<T> {
  const lockPath = buildChildLanesLockPath(runDir);
  const lock = await acquireLockWithRetry({
    taskId: runDir,
    lockPath,
    retry: PROVIDER_LINEAR_WORKER_CHILD_STREAMS_LOCK_RETRY,
    ensureDirectory: async () => {
      await mkdir(dirname(lockPath), { recursive: true });
    },
    createError: (_taskId, attempts) =>
      new Error(`Failed to acquire provider-linear-worker child-lane ledger lock after ${attempts} attempts.`)
  });
  try {
    return await action();
  } finally {
    await lock.release();
  }
}

function normalizeProviderLinearWorkerChildStreamRecord(
  value: unknown
): ProviderLinearWorkerChildStreamRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const stream = normalizeOptionalString(value.stream);
  const pipelineId = normalizeOptionalString(value.pipeline_id);
  const taskId = normalizeOptionalString(value.task_id);
  const runId = normalizeOptionalString(value.run_id);
  const status = normalizeOptionalString(value.status);
  const manifestPath = normalizeOptionalString(value.manifest_path);
  const artifactRoot = normalizeOptionalString(value.artifact_root);
  const issueId = normalizeOptionalString(value.issue_id);
  const issueIdentifier = normalizeOptionalString(value.issue_identifier);
  const launchedAt = normalizeOptionalString(value.launched_at);
  if (
    !stream ||
    !pipelineId ||
    !taskId ||
    !runId ||
    !status ||
    !manifestPath ||
    !artifactRoot ||
    !issueId ||
    !issueIdentifier ||
    !launchedAt
  ) {
    return null;
  }
  return {
    stream,
    pipeline_id: pipelineId,
    task_id: taskId,
    run_id: runId,
    status,
    manifest_path: manifestPath,
    artifact_root: artifactRoot,
    log_path: normalizeOptionalString(value.log_path),
    summary: normalizeOptionalString(value.summary),
    issue_id: issueId,
    issue_identifier: issueIdentifier,
    workspace_path: normalizeOptionalString(value.workspace_path),
    source_setup: isRecord(value.source_setup) && value.source_setup.provider === 'linear'
      ? {
          provider: 'linear',
          workspace_id: normalizeOptionalString(value.source_setup.workspace_id),
          team_id: normalizeOptionalString(value.source_setup.team_id),
          project_id: normalizeOptionalString(value.source_setup.project_id)
        }
      : null,
    launched_at: launchedAt,
    recorded_at: normalizeOptionalString(value.recorded_at)
  };
}

function normalizeProviderLinearWorkerChildLaneRecord(
  value: unknown
): ProviderLinearWorkerChildLaneRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const stream = normalizeOptionalString(value.stream);
  const pipelineId = normalizeOptionalString(value.pipeline_id);
  const taskId = normalizeOptionalString(value.task_id);
  const runId = normalizeOptionalString(value.run_id);
  const status = normalizeOptionalString(value.status);
  const manifestPath = normalizeOptionalString(value.manifest_path);
  const artifactRoot = normalizeOptionalString(value.artifact_root);
  const issueId = normalizeOptionalString(value.issue_id);
  const issueIdentifier = normalizeOptionalString(value.issue_identifier);
  const launchedAt = normalizeOptionalString(value.launched_at);
  const purpose = normalizeOptionalString(value.purpose);
  const decision = normalizeChildLaneDecision(value.decision);
  const inFlightAction = normalizeChildLaneInFlightAction(value.in_flight_action);
  const scope = normalizeProviderLinearWorkerChildLaneScope(value.scope);
  const parentSnapshot = normalizeProviderLinearWorkerChildLaneParentSnapshot(value.parent_snapshot);
  if (
    !stream ||
    !pipelineId ||
    !taskId ||
    !runId ||
    !status ||
    !manifestPath ||
    !artifactRoot ||
    !issueId ||
    !issueIdentifier ||
    !launchedAt ||
    !purpose ||
    !decision ||
    !scope ||
    !parentSnapshot
  ) {
    return null;
  }
  return {
    stream,
    pipeline_id: pipelineId,
    task_id: taskId,
    run_id: runId,
    status,
    manifest_path: manifestPath,
    artifact_root: artifactRoot,
    log_path: normalizeOptionalString(value.log_path),
    summary: normalizeOptionalString(value.summary),
    guardrails_required: typeof value.guardrails_required === 'boolean' ? value.guardrails_required : null,
    guardrails_required_source: normalizeGuardrailsRequiredSource(value.guardrails_required_source),
    guardrail_command_count: normalizeOptionalInteger(value.guardrail_command_count),
    issue_id: issueId,
    issue_identifier: issueIdentifier,
    workspace_path: normalizeOptionalString(value.workspace_path),
    source_setup: isRecord(value.source_setup) && value.source_setup.provider === 'linear'
      ? {
          provider: 'linear',
          workspace_id: normalizeOptionalString(value.source_setup.workspace_id),
          team_id: normalizeOptionalString(value.source_setup.team_id),
          project_id: normalizeOptionalString(value.source_setup.project_id)
        }
      : null,
    launched_at: launchedAt,
    summary_recorded_at: normalizeOptionalString(value.summary_recorded_at),
    purpose,
    instructions: normalizeOptionalString(value.instructions),
    scope,
    parent_snapshot: parentSnapshot,
    decision_lineage: normalizeProviderLinearDecisionLineage(value.decision_lineage),
    lane_workspace_path: normalizeOptionalString(value.lane_workspace_path),
    patch_artifact_path: normalizeOptionalString(value.patch_artifact_path),
    patch_bytes: normalizeOptionalInteger(value.patch_bytes),
    runtime_mode: normalizeOptionalString(value.runtime_mode),
    runtime_provider: normalizeOptionalString(value.runtime_provider),
    heartbeat_at: normalizeOptionalString(value.heartbeat_at),
    heartbeat_stale_after_seconds: normalizeOptionalInteger(value.heartbeat_stale_after_seconds),
    runner_pid: normalizeOptionalInteger(value.runner_pid),
    runner_started_at: normalizeOptionalString(value.runner_started_at),
    runner_alive: typeof value.runner_alive === 'boolean' ? value.runner_alive : null,
    runner_identity_status: normalizeProviderLinearWorkerChildLaneRunnerIdentityStatus(
      value.runner_identity_status
    ),
    runner_identity_reason: normalizeOptionalString(value.runner_identity_reason),
    runner_observed_started_at: normalizeOptionalString(value.runner_observed_started_at),
    runner_command_line_matches:
      typeof value.runner_command_line_matches === 'boolean' ? value.runner_command_line_matches : null,
    runtime_event: normalizeOptionalString(value.runtime_event),
    runtime_event_at: normalizeOptionalString(value.runtime_event_at),
    appserver_startup_observed:
      typeof value.appserver_startup_observed === 'boolean' ? value.appserver_startup_observed : null,
    appserver_startup_observed_at: normalizeOptionalString(value.appserver_startup_observed_at),
    stale_invalidation_candidate:
      typeof value.stale_invalidation_candidate === 'boolean'
        ? value.stale_invalidation_candidate
        : null,
    stale_invalidation_reason: normalizeOptionalString(value.stale_invalidation_reason),
    decision,
    in_flight_action: inFlightAction,
    in_flight_started_at: normalizeOptionalString(value.in_flight_started_at),
    decision_at: normalizeOptionalString(value.decision_at),
    decision_reason: normalizeOptionalString(value.decision_reason)
  };
}

function normalizeProviderLinearWorkerChildLaneScope(
  value: unknown
): ProviderLinearWorkerChildLaneScope | null {
  if (!isRecord(value)) {
    return null;
  }
  const files = normalizeStringArray(value.files);
  const phases = normalizeStringArray(value.phases);
  if (!files || !phases || (files.length === 0 && phases.length === 0)) {
    return null;
  }
  return {
    files,
    phases,
    phase_contract_version: normalizeOptionalString(value.phase_contract_version),
    allowed_path_selectors: normalizeProviderLinearChildLanePathSelectors(value.allowed_path_selectors)
  };
}

function normalizeProviderLinearWorkerChildLaneParentSnapshot(
  value: unknown
): ProviderLinearWorkerChildLaneParentSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }
  const capturedAt = normalizeOptionalString(value.captured_at);
  if (!capturedAt) {
    return null;
  }
  return {
    base_sha: normalizeOptionalString(value.base_sha),
    issue_updated_at: normalizeOptionalString(value.issue_updated_at),
    issue_state: normalizeOptionalString(value.issue_state),
    issue_state_type: normalizeOptionalString(value.issue_state_type),
    captured_at: capturedAt
  };
}

function normalizeProviderLinearDecisionLineage(value: unknown): ProviderLinearDecisionLineage | null {
  if (!isRecord(value) || value.schema_version !== 1) {
    return null;
  }
  const decision = normalizeOptionalString(value.decision);
  const reason = normalizeOptionalString(value.reason);
  if (
    !isProviderLinearParallelizationDecision(decision) ||
    !isProviderLinearParallelizationReason(reason) ||
    !isProviderLinearParallelizationReasonAllowed(decision, reason)
  ) {
    return null;
  }
  const normalized: ProviderLinearDecisionLineage = {
    schema_version: 1,
    parent_task_id: normalizeOptionalString(value.parent_task_id),
    parent_run_id: normalizeOptionalString(value.parent_run_id),
    parent_turn_started_at: normalizeOptionalString(value.parent_turn_started_at),
    parent_turn_id: normalizeOptionalString(value.parent_turn_id),
    parent_turn_count: normalizeNonNegativeInteger(value.parent_turn_count),
    decision_id: normalizeOptionalString(value.decision_id),
    decision_recorded_at: normalizeOptionalString(value.decision_recorded_at),
    decision,
    reason
  };
  return hasProviderLinearDecisionLineageIdentity(normalized) ? normalized : null;
}

function hasProviderLinearDecisionLineageIdentity(lineage: ProviderLinearDecisionLineage): boolean {
  return Boolean(
    lineage.parent_run_id &&
    (lineage.parent_turn_started_at || lineage.parent_turn_id || lineage.parent_turn_count !== null)
  );
}

function normalizeChildLaneDecision(
  value: unknown
): ProviderLinearWorkerChildLaneDecision | null {
  return value === 'pending' || value === 'accepted' || value === 'rejected' || value === 'invalidated'
    ? value
    : null;
}

function normalizeChildLaneInFlightAction(
  value: unknown
): ProviderLinearWorkerChildLaneInFlightAction | null {
  return value === 'accept' || value === 'reject' || value === 'invalidate'
    ? value
    : null;
}

function normalizeProviderLinearWorkerChildLaneRunnerIdentityStatus(
  value: unknown
): ProviderLinearWorkerChildLaneRunnerIdentityStatus | null {
  return value === 'not_recorded' ||
    value === 'not_live' ||
    value === 'matched' ||
    value === 'ambiguous' ||
    value === 'pid_reuse_suspected'
    ? value
    : null;
}

function isLocalProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === 'EPERM';
  }
}

async function resolveProviderWorkerRunLocation(
  currentManifestPath: string,
): Promise<ProviderWorkerRunLocation | null> {
  try {
    const canonicalManifestPath = await realpath(currentManifestPath);
    if (basename(canonicalManifestPath) !== 'manifest.json') {
      return null;
    }
    const canonicalRunDir = dirname(canonicalManifestPath);
    const cliDir = dirname(canonicalRunDir);
    if (basename(cliDir) !== 'cli') {
      return null;
    }
    const taskDir = dirname(cliDir);
    const canonicalRunsRoot = dirname(taskDir);
    if (dirname(canonicalRunsRoot) === canonicalRunsRoot) {
      return null;
    }
    return {
      canonicalRunsRoot,
      taskId: sanitizeTaskId(basename(taskDir)),
      runId: sanitizeRunId(basename(canonicalRunDir))
    };
  } catch {
    return null;
  }
}

async function resolveProviderControlHostManifestPath(
  currentManifestPath: string,
  env: NodeJS.ProcessEnv,
  manifest: Record<string, unknown>
): Promise<ProviderControlHostManifestTarget | null> {
  const locator =
    readProviderControlHostLocatorFromManifest(manifest) ??
    readProviderControlHostLocatorFromEnv({
      [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: env[PROVIDER_CONTROL_HOST_TASK_ID_ENV],
      [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: env[PROVIDER_CONTROL_HOST_RUN_ID_ENV],
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE
    });
  if (!locator) {
    return null;
  }
  const currentRun = await resolveProviderWorkerRunLocation(currentManifestPath);
  if (!currentRun) {
    return null;
  }
  return {
    currentRun,
    manifestPath: resolve(
      currentRun.canonicalRunsRoot,
      sanitizeTaskId(locator.taskId),
      'cli',
      sanitizeRunId(locator.runId),
      'manifest.json'
    )
  };
}

async function realpathOrResolveIfMissing(pathname: string): Promise<string> {
  try {
    return await realpath(pathname);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return resolve(pathname);
    }
    throw error;
  }
}

function isPathWithinRoot(targetPath: string, rootPath: string): boolean {
  const relativePath = relative(rootPath, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

function resolveProviderWorkerTaskId(
  currentRun: ProviderWorkerRunLocation,
  manifest: Record<string, unknown>
): string | null {
  const manifestTaskId =
    normalizeOptionalString(manifest.task_id) ??
    normalizeOptionalString(manifest.taskId);
  if (manifestTaskId) {
    const sanitizedTaskId = sanitizeTaskId(manifestTaskId);
    return sanitizedTaskId.length > 0 ? sanitizedTaskId : null;
  }
  return currentRun.taskId.length > 0 ? currentRun.taskId : null;
}

async function readControlEndpointToken(tokenPath: string): Promise<string> {
  const raw = await readFile(tokenPath, 'utf8');
  const trimmed = raw.trim();
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  try {
    const parsed = JSON.parse(raw);
    if (isRecord(parsed) && typeof parsed.token === 'string' && parsed.token.trim().length > 0) {
      return parsed.token.trim();
    }
    throw new Error('control auth token invalid');
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    if (looksLikeJson) {
      throw new Error('control auth token invalid');
    }
    // Fall back to plain-text token contents.
  }
  const token = trimmed;
  if (!token) {
    throw new Error('control auth token missing');
  }
  return token;
}

function collectDelegationEnvOverrides(env: NodeJS.ProcessEnv): DelegationConfigLayer[] {
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

async function resolveAllowedControlHostBindHosts(
  repoRoot: string,
  env: NodeJS.ProcessEnv
): Promise<string[] | null> {
  const configFiles = await loadDelegationConfigFiles({ repoRoot, env });
  const layers = [configFiles.global, configFiles.repo, ...collectDelegationEnvOverrides(env)]
    .filter(Boolean) as DelegationConfigLayer[];
  const effective = computeEffectiveDelegationConfig({
    repoRoot,
    layers
  }).ui.allowedBindHosts;
  const hasExplicitAllowedBindHosts = Array.isArray(configFiles.repo?.ui?.allowedBindHosts);
  return hasExplicitAllowedBindHosts ? effective : null;
}

function normalizeControlHostName(host: string): string {
  const trimmed = host.trim().toLowerCase();
  const normalized =
    trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed;
  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') {
    return 'loopback';
  }
  return normalized;
}

function validateControlHostBaseUrl(raw: unknown, allowedHosts: string[] | null): URL {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('control base_url missing');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('control base_url invalid');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('control base_url invalid');
  }
  if (parsed.username || parsed.password) {
    throw new Error('control base_url not permitted');
  }
  const normalizedAllowedHosts = new Set(
    (allowedHosts ?? ['127.0.0.1', 'localhost', '::1']).map((entry) =>
      normalizeControlHostName(entry)
    )
  );
  if (!normalizedAllowedHosts.has(normalizeControlHostName(parsed.hostname))) {
    throw new Error('control base_url not permitted');
  }
  return parsed;
}

function isCompatibleControlHostRepoRoot(
  candidateRepoRoot: string,
  workerWorkspacePath: string,
  taskId: string
): boolean {
  const canonicalCandidateRepoRoot = resolve(candidateRepoRoot);
  const canonicalWorkerWorkspacePath = resolve(workerWorkspacePath);
  if (
    canonicalWorkerWorkspacePath === canonicalCandidateRepoRoot &&
    !(
      basename(canonicalWorkerWorkspacePath) === taskId &&
      basename(dirname(canonicalWorkerWorkspacePath)) === PROVIDER_WORKSPACE_ROOT_DIRNAME
    )
  ) {
    return true;
  }
  try {
    return canonicalWorkerWorkspacePath === resolveProviderWorkspacePath(canonicalCandidateRepoRoot, taskId);
  } catch {
    return false;
  }
}

async function resolveProviderControlHostRepoRoot(input: {
  manifestPath: string;
  workerWorkspacePath: string;
  taskId: string;
}): Promise<string | null> {
  const canonicalWorkerWorkspacePath = await realpath(input.workerWorkspacePath).catch(() =>
    resolve(input.workerWorkspacePath)
  );
  const runDerivedRepoRoot = await realpath(
    resolve(dirname(input.manifestPath), '..', '..', '..', '..')
  ).catch(() => null);
  if (
    runDerivedRepoRoot &&
    isCompatibleControlHostRepoRoot(runDerivedRepoRoot, canonicalWorkerWorkspacePath, input.taskId)
  ) {
    return runDerivedRepoRoot;
  }
  try {
    const raw = JSON.parse(await readFile(input.manifestPath, 'utf8')) as Record<string, unknown>;
    const manifestWorkspacePath =
      normalizeOptionalString(raw.workspace_path) ??
      normalizeOptionalString(raw.workspacePath);
    if (!manifestWorkspacePath) {
      return null;
    }
    const canonicalManifestWorkspacePath = await realpath(manifestWorkspacePath);
    return isCompatibleControlHostRepoRoot(
      canonicalManifestWorkspacePath,
      canonicalWorkerWorkspacePath,
      input.taskId
    )
      ? canonicalManifestWorkspacePath
      : null;
  } catch {
    return null;
  }
}

async function requestProviderControlHostRefresh(input: {
  currentManifestPath: string;
  env: NodeJS.ProcessEnv;
  manifest: Record<string, unknown>;
  proof: ProviderLinearWorkerProof;
  repoRoot: string;
  log: Pick<typeof logger, 'warn'>;
  allowInProgress?: boolean;
  abortSignal?: AbortSignal;
}): Promise<void> {
  const shouldRefresh =
    (
      input.allowInProgress === true &&
      input.proof.owner_status === 'in_progress'
    ) ||
    (
      input.proof.owner_phase === 'ended' &&
      (
        input.proof.owner_status === 'failed' ||
        (
          input.proof.owner_status === 'succeeded' &&
          typeof input.proof.end_reason === 'string' &&
          PROVIDER_CONTROL_HOST_REFRESH_SUCCESS_END_REASONS.has(input.proof.end_reason)
        )
      )
    );
  if (!shouldRefresh) {
    return;
  }
  let controlHostRunDir: string | null = null;
  let attempts = 0;
  let retriedAfterStaleOwnerReclaim = false;
  while (attempts < 2) {
    attempts += 1;
    try {
      controlHostRunDir = await requestProviderControlHostRefreshOnce({
        currentManifestPath: input.currentManifestPath,
        env: input.env,
        manifest: input.manifest,
        proof: input.proof,
        repoRoot: input.repoRoot,
        abortSignal: input.abortSignal
      });
      if (controlHostRunDir) {
        try {
          await rm(join(controlHostRunDir, PROVIDER_CONTROL_HOST_REFRESH_FAILURE_FILENAME), {
            force: true
          });
        } catch (cleanupError) {
          input.log.warn(
            `provider-linear-worker could not clear stale ${PROVIDER_CONTROL_HOST_REFRESH_FAILURE_FILENAME} for ${input.proof.issue_identifier}: ${
              (cleanupError as Error)?.message ?? String(cleanupError)
            }`
          );
        }
      }
      return;
    } catch (error) {
      if (input.abortSignal?.aborted === true) {
        return;
      }
      const message = getProviderControlHostRefreshFailureMessage(error);
      controlHostRunDir ??= await resolveProviderControlHostRunDirForDiagnostic({
        currentManifestPath: input.currentManifestPath,
        env: input.env,
        manifest: input.manifest
      }).catch(() => null);
      const ownershipDiagnostic = controlHostRunDir
        ? await readControlHostOwnershipDiagnosticSummary(controlHostRunDir).catch(() => null)
        : null;
      if (
        attempts === 1 &&
        shouldRetryProviderControlHostRefreshAfterStaleOwnerReclaim(message, ownershipDiagnostic)
      ) {
        retriedAfterStaleOwnerReclaim = true;
        await sleep(PROVIDER_CONTROL_HOST_REFRESH_RETRY_DELAY_MS, undefined, {
          signal: input.abortSignal
        }).catch(() => undefined);
        if (input.abortSignal?.aborted) {
          return;
        }
        continue;
      }
      if (controlHostRunDir) {
        try {
          await writeProviderControlHostRefreshFailureDiagnostic({
            runDir: controlHostRunDir,
            message,
            issueId: input.proof.issue_id,
            issueIdentifier: input.proof.issue_identifier,
            ownerStatus: input.proof.owner_status,
            endReason: input.proof.end_reason,
            ownershipDiagnostic,
            attempts,
            retriedAfterStaleOwnerReclaim
          });
        } catch (persistError) {
          input.log.warn(
            `provider-linear-worker could not persist ${PROVIDER_CONTROL_HOST_REFRESH_FAILURE_FILENAME} for ${input.proof.issue_identifier}: ${
              (persistError as Error)?.message ?? String(persistError)
            }`
          );
        }
      }
      const ownershipHint = controlHostRunDir
        ? await readControlHostOwnershipOperatorHint(controlHostRunDir).catch(() => null)
        : null;
      input.log.warn(
        `provider-linear-worker could not request control-host refresh for ${input.proof.issue_identifier}: ${message}${
          ownershipHint ? `; ${ownershipHint}` : ''
        }`
      );
      return;
    }
  }
}

async function resolveProviderControlHostRunDirForDiagnostic(input: {
  currentManifestPath: string;
  env: NodeJS.ProcessEnv;
  manifest: Record<string, unknown>;
}): Promise<string | null> {
  const manifestTarget = await resolveProviderControlHostManifestPath(
    input.currentManifestPath,
    input.env,
    input.manifest
  );
  if (!manifestTarget) {
    return null;
  }
  const canonicalRunDir = await realpathOrResolveIfMissing(dirname(manifestTarget.manifestPath));
  return isPathWithinRoot(canonicalRunDir, manifestTarget.currentRun.canonicalRunsRoot)
    ? canonicalRunDir
    : null;
}

async function requestProviderControlHostRefreshOnce(input: {
  currentManifestPath: string;
  env: NodeJS.ProcessEnv;
  manifest: Record<string, unknown>;
  proof: ProviderLinearWorkerProof;
  repoRoot: string;
  abortSignal?: AbortSignal;
}): Promise<string | null> {
  const manifestTarget = await resolveProviderControlHostManifestPath(
    input.currentManifestPath,
    input.env,
    input.manifest
  );
  if (!manifestTarget) {
    return null;
  }
  const canonicalRunsRoot = manifestTarget.currentRun.canonicalRunsRoot;
  const canonicalRunDir = await realpathOrResolveIfMissing(dirname(manifestTarget.manifestPath));
  const canonicalManifestPath = await realpathOrResolveIfMissing(
    resolve(canonicalRunDir, basename(manifestTarget.manifestPath))
  );
  if (
    !isPathWithinRoot(canonicalRunDir, canonicalRunsRoot) ||
    !isPathWithinRoot(canonicalManifestPath, canonicalRunsRoot)
  ) {
    throw new Error('control-host manifest path invalid');
  }
  const workerTaskId = resolveProviderWorkerTaskId(manifestTarget.currentRun, input.manifest);
  if (!workerTaskId) {
    throw new Error('provider task id unavailable');
  }
  const controlHostRepoRoot = await resolveProviderControlHostRepoRoot({
    manifestPath: canonicalManifestPath,
    workerWorkspacePath: input.repoRoot,
    taskId: workerTaskId
  });
  if (!controlHostRepoRoot) {
    throw new Error('control-host repo root unavailable');
  }
  const allowedBindHosts = await resolveAllowedControlHostBindHosts(controlHostRepoRoot, input.env);
  const endpointPath = resolve(canonicalRunDir, 'control_endpoint.json');
  const canonicalEndpointPath = await realpath(endpointPath);
  if (!isPathWithinRoot(canonicalEndpointPath, canonicalRunDir)) {
    throw new Error('control endpoint path invalid');
  }
  const endpointRaw = await readFile(canonicalEndpointPath, 'utf8');
  const endpoint = JSON.parse(endpointRaw) as { base_url?: unknown; token_path?: unknown };
  const baseUrl = validateControlHostBaseUrl(endpoint.base_url, allowedBindHosts);
  const resolvedTokenPath =
    typeof endpoint.token_path === 'string' && endpoint.token_path.trim().length > 0
      ? resolve(canonicalRunDir, endpoint.token_path)
      : resolve(canonicalRunDir, 'control_auth.json');
  if (!isPathWithinRoot(resolvedTokenPath, canonicalRunDir)) {
    throw new Error('control auth path invalid');
  }
  const canonicalTokenPath = await realpath(resolvedTokenPath);
  if (!isPathWithinRoot(canonicalTokenPath, canonicalRunDir)) {
    throw new Error('control auth path invalid');
  }
  const token = await readControlEndpointToken(canonicalTokenPath);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_CONTROL_HOST_REFRESH_TIMEOUT_MS);
  const requestSignal = input.abortSignal
    ? AbortSignal.any([controller.signal, input.abortSignal])
    : controller.signal;
  try {
    const response = await fetch(new URL(PROVIDER_CONTROL_HOST_REFRESH_PATH, baseUrl), {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        [CSRF_HEADER]: token
      },
      body: JSON.stringify({
        action: 'refresh',
        source: 'provider-linear-worker',
        issue_id: input.proof.issue_id,
        issue_identifier: input.proof.issue_identifier,
        owner_status: input.proof.owner_status,
        end_reason: input.proof.end_reason
      }),
      signal: requestSignal
    });
    if (response.status !== 202) {
      const responseBody = await response.text().catch(() => '');
      const responseDetail = responseBody.trim();
      throw new Error(
        responseDetail
          ? `refresh request failed with status ${response.status}: ${responseDetail}`
          : `refresh request failed with status ${response.status}`
      );
    }
    return canonicalRunDir;
  } finally {
    clearTimeout(timer);
  }
}

function getProviderControlHostRefreshFailureMessage(error: unknown): string {
  return (error as Error)?.name === 'AbortError'
    ? 'refresh request timeout'
    : (error as Error)?.message ?? String(error);
}

function shouldRetryProviderControlHostRefreshAfterStaleOwnerReclaim(
  message: string,
  ownershipDiagnostic: ControlHostOwnershipPollingPayload | null
): boolean {
  return (
    ownershipDiagnostic?.reason === 'stale_control_host_owner' &&
    ownershipDiagnostic.status === 'stale_reclaimed' &&
    (message === 'refresh request timeout' || message.includes('fetch failed'))
  );
}

function classifyProviderControlHostRefreshFailure(
  message: string
): ProviderControlHostRefreshFailureDiagnostic['failure_kind'] {
  if (message === 'refresh request timeout') {
    return 'refresh_request_timeout';
  }
  if (message.includes('fetch failed')) {
    return 'fetch_failed';
  }
  return 'request_failed';
}

async function writeProviderControlHostRefreshFailureDiagnostic(input: {
  runDir: string;
  message: string;
  issueId: string;
  issueIdentifier: string;
  ownerStatus: ProviderLinearWorkerProof['owner_status'];
  endReason: string | null;
  ownershipDiagnostic: ControlHostOwnershipPollingPayload | null;
  attempts: number;
  retriedAfterStaleOwnerReclaim: boolean;
}): Promise<void> {
  const diagnostic: ProviderControlHostRefreshFailureDiagnostic = {
    schema_version: 1,
    reason: 'provider_control_host_refresh_failed',
    failure_kind: classifyProviderControlHostRefreshFailure(input.message),
    message: input.message,
    issue_id: input.issueId,
    issue_identifier: input.issueIdentifier,
    owner_status: input.ownerStatus,
    end_reason: input.endReason,
    observed_at: new Date().toISOString(),
    control_host_run_dir: input.runDir,
    control_host_ownership: input.ownershipDiagnostic,
    retry: {
      attempts: input.attempts,
      retried_after_stale_owner_reclaim: input.retriedAfterStaleOwnerReclaim,
      recovered: false
    }
  };
  await writeJsonAtomic(
    join(input.runDir, PROVIDER_CONTROL_HOST_REFRESH_FAILURE_FILENAME),
    diagnostic
  );
}
async function writeProofSnapshot(
  deps: ProviderLinearWorkerDependencies,
  runDir: string,
  auditPath: string,
  proof: ProviderLinearWorkerProof,
  env: NodeJS.ProcessEnv = process.env
): Promise<ProviderLinearWorkerProof> {
  return await withProviderLinearWorkerProofLock(runDir, async () => {
    const linearBudget = await readSharedLinearBudgetStatus(env).catch(() => null);
    const linearAudit = await summarizeProviderLinearAuditPath(auditPath);
    const childStreams = await readProviderLinearWorkerChildStreams(runDir);
    const childLanes = await readHydratedProviderLinearWorkerChildLanesAndRepairLedger(
      runDir,
      proof.child_lanes
    );
    const proofWithHydratedSources = {
      ...proof,
      runtime: normalizeProviderLinearWorkerRuntimeProofIfRelevant(proof),
      linear_audit: linearAudit,
      child_streams: childStreams,
      child_lanes: childLanes,
      parallelization: deriveProviderLinearWorkerParallelizationRecord({
        linearAudit,
        issueId: proof.issue_id,
        attemptStartedAt: proof.attempt_started_at,
        currentTurnStartedAt: proof.current_turn_started_at,
        childLanes
      }),
      linear_budget: linearBudget
    };
    const hydratedProof = {
      ...proofWithHydratedSources,
      appserver_supervision:
        buildProviderLinearWorkerAppServerSupervisionProofIfRelevant(proofWithHydratedSources),
      progress: deriveProviderLinearWorkerProgressSnapshot({
        proof: proofWithHydratedSources,
        now: deps.now
      })
    };
    await deps.writeProof(buildProofPath(runDir), hydratedProof);
    return hydratedProof;
  });
}

export async function refreshProviderLinearWorkerProofSnapshot(
  runDir: string,
  auditPath: string | null,
  now: () => string = () => new Date().toISOString(),
  writeProof: (path: string, proof: ProviderLinearWorkerProof) => Promise<void> = async (path, proof) =>
    await writeJsonAtomic(path, proof),
  env: NodeJS.ProcessEnv = process.env,
  options: {
    updatedAtComparisonScope?: 'full' | 'telemetry';
    skipSessionLogHydration?: boolean;
    emitProgressEvent?: (message: string) => void;
    isProcessAlive?: (pid: number) => boolean;
    inspectProcess?: (
      pid: number
    ) => ProviderLinearWorkerProcessInspection | Promise<ProviderLinearWorkerProcessInspection>;
  } = {}
): Promise<ProviderLinearWorkerProof | null> {
  return await withProviderLinearWorkerProofLock(runDir, async () => {
    const proofPath = buildProofPath(runDir);
    const priorHydrationState = await readProviderWorkerSessionLogHydrationState(runDir);
    let raw: string;
    try {
      raw = await readFile(proofPath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
    const parsed = JSON.parse(raw) as ProviderLinearWorkerProof;
    const linearBudget = await readSharedLinearBudgetStatus(env).catch(() => null);
    const linearAudit = auditPath ? await summarizeProviderLinearAuditPath(auditPath) : parsed.linear_audit ?? null;
    const childStreams = await readProviderLinearWorkerChildStreams(runDir);
    const childLanes = await readHydratedProviderLinearWorkerChildLanesAndRepairLedger(
      runDir,
      parsed.child_lanes,
      {
        now,
        isProcessAlive: options.isProcessAlive,
        inspectProcess: options.inspectProcess
      }
    );
    const proofWithHydratedSources: ProviderLinearWorkerProof = {
      ...parsed,
      runtime: normalizeProviderLinearWorkerRuntimeProofIfRelevant(parsed),
      linear_audit: linearAudit,
      child_streams: childStreams,
      child_lanes: childLanes,
      parallelization: deriveProviderLinearWorkerParallelizationRecord({
        linearAudit,
        issueId: parsed.issue_id,
        attemptStartedAt: parsed.attempt_started_at,
        currentTurnStartedAt: parsed.current_turn_started_at,
        childLanes
      }),
      linear_budget: linearBudget,
      updated_at: parsed.updated_at ?? null
    };
    const proofWithSessionTelemetryResult = options.skipSessionLogHydration
      ? {
          proof: proofWithHydratedSources,
          hydrationState: priorHydrationState
        }
      : await hydrateProviderLinearWorkerProofFromSessionLog(
          proofWithHydratedSources,
          env,
          priorHydrationState
        );
    const proofWithSessionTelemetry = proofWithSessionTelemetryResult.proof;
    const hydratedWithoutUpdatedAt: ProviderLinearWorkerProof = {
      ...proofWithSessionTelemetry,
      appserver_supervision:
        buildProviderLinearWorkerAppServerSupervisionProofIfRelevant(proofWithSessionTelemetry),
      progress: deriveProviderLinearWorkerProgressSnapshot({
        proof: proofWithSessionTelemetry,
        now
      })
    };
    const nextUpdatedAt = shouldAdvanceProviderLinearWorkerProofUpdatedAt(
      parsed,
      hydratedWithoutUpdatedAt,
      options.updatedAtComparisonScope ?? 'full'
    )
      ? now()
      : parsed.updated_at ?? null;
    const hydratedBase: ProviderLinearWorkerProof = {
      ...hydratedWithoutUpdatedAt,
      updated_at: nextUpdatedAt
    };
    const hydrated: ProviderLinearWorkerProof = {
      ...hydratedBase,
      appserver_supervision: buildProviderLinearWorkerAppServerSupervisionProofIfRelevant(hydratedBase)
    };
    await writeProof(proofPath, hydrated);
    await writeProviderWorkerSessionLogHydrationState(runDir, proofWithSessionTelemetryResult.hydrationState);
    if (
      options.emitProgressEvent &&
      buildProviderLinearWorkerProgressSemanticSignature(parsed.progress ?? null)
        !== buildProviderLinearWorkerProgressSemanticSignature(hydrated.progress ?? null)
    ) {
      options.emitProgressEvent(formatProviderLinearWorkerProgressEvent(hydrated));
    }
    return hydrated;
  });
}

export function buildProviderLinearWorkerProgressSemanticSignature(
  progress: ProviderLinearWorkerProgressSnapshot | null | undefined
): string | null {
  if (!progress) {
    return null;
  }
  // Hydration metadata changes often outnumber operator-visible state changes.
  return JSON.stringify({
    phase: progress.phase ?? null,
    kind: progress.kind ?? null,
    status: progress.status ?? null,
    summary: progress.summary ?? null,
    stall_classification: progress.stall_classification ?? null,
    stall_reason: progress.stall_reason ?? null,
    recovery_recommendation: progress.recovery_recommendation ?? null
  });
}

export function shouldEmitProviderLinearWorkerProgressSignatureTransition(
  previousSignature: string | null | undefined,
  nextSignature: string | null
): boolean {
  if (previousSignature === undefined && nextSignature === null) {
    return false;
  }
  return previousSignature !== nextSignature;
}

function formatProviderLinearWorkerProgressEvent(proof: ProviderLinearWorkerProof): string {
  return `[provider-linear-worker-progress] ${JSON.stringify({
    issue_id: proof.issue_id,
    issue_identifier: proof.issue_identifier,
    progress: proof.progress ?? null
  })}`;
}

export async function runProviderLinearWorker(
  env: NodeJS.ProcessEnv = process.env,
  dependencyOverrides: Partial<ProviderLinearWorkerDependencies> = {}
): Promise<ProviderLinearWorkerProof> {
  const deps: ProviderLinearWorkerDependencies = {
    now: () => new Date().toISOString(),
    readManifest: async (path) => JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>,
    readTrackedIssue: readTrackedIssueOrThrow,
    resolveRuntimeContext: resolveProviderLinearWorkerRuntimeContext,
    sleep: async (ms) => {
      await sleep(ms);
    },
    execRunner: defaultExecRunner,
    appServerTurnRunner: defaultAppServerTurnRunner,
    writeProof: async (path, proof) => writeJsonAtomic(path, proof),
    log: logger,
    ...dependencyOverrides
  };

  const context = await loadProviderLinearWorkerContext(env, deps.readManifest);
  const runtimeContext = await deps.resolveRuntimeContext(env, context.repoRoot, context.runId);
  deps.log.info(`[provider-linear-worker-runtime] ${formatRuntimeSelectionSummary(runtimeContext.runtime)}`);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...env,
    ...runtimeContext.env
  };
  const explicitRepoConfigRequired =
    Object.prototype.hasOwnProperty.call(env, REPO_CONFIG_REQUIRED_ENV_KEY)
      ? env[REPO_CONFIG_REQUIRED_ENV_KEY]
      : undefined;
  applyProviderLinearWorkerContextEnv(childEnv, context);
  if (explicitRepoConfigRequired !== undefined) {
    childEnv[REPO_CONFIG_REQUIRED_ENV_KEY] = explicitRepoConfigRequired;
  }
  const auditPath = resolve(context.runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME);
  const workerPid = String(process.pid);
  childEnv[PROVIDER_LINEAR_AUDIT_ENV_VAR] = auditPath;
  const helperCommand = resolveProviderLinearHelperCommand(childEnv);
  const residentSessionSeed = context.residentSessionSeed;
  const residentLogicalTurnBase = residentSessionSeed?.logical_turn_count ?? 0;
  if (shouldForceNonInteractive(childEnv)) {
    childEnv.CODEX_REVIEW_NON_INTERACTIVE = '1';
    childEnv.FORCE_CODEX_REVIEW = '1';
    childEnv.CODEX_NON_INTERACTIVE = '1';
    childEnv.CODEX_NO_INTERACTIVE = '1';
    childEnv.CODEX_INTERACTIVE = '0';
  }
  ensureProviderLinearWorkerAuthoritativeReviewNotes(childEnv, context);

  const attemptStartedAt = deps.now();
  const workerControl = buildProviderWorkerControlPlane({
    runtime: runtimeContext.runtime,
    observedAt: attemptStartedAt
  });
  await persistProviderWorkerRuntimeSelectionToManifests({
    context,
    runtime: runtimeContext.runtime,
    workerControl
  });
  const sourceRootFreshness = await readProviderWorkerControlHostSourceRootFreshness(context);
  let finalProof: ProviderLinearWorkerProof = {
    issue_id: context.issueId,
    issue_identifier: context.issueIdentifier,
    attempt_started_at: attemptStartedAt,
    current_turn_started_at: null,
    pid: workerPid,
    thread_id: residentSessionSeed?.source_thread_id ?? null,
    latest_turn_id: null,
    latest_session_id: null,
    latest_session_id_source: null,
    session_log_thread_id: null,
    session_log_turn_id: null,
    session_log_session_id: null,
    resume_source_thread_id: residentSessionSeed?.source_thread_id ?? null,
    turn_count: 0,
    last_event: null,
    last_message: null,
    last_message_source: null,
    last_message_delta_key: null,
    last_event_at: null,
    current_turn_activity: null,
    tokens: buildEmptyProviderLinearWorkerTokenUsage(),
    rate_limits: null,
    runtime: buildProviderLinearWorkerRuntimeProof(runtimeContext.runtime),
    appserver_supervision: null,
    auth_provenance: buildProviderWorkerRuntimeAuthProvenance({
      env: childEnv,
      runtime: runtimeContext.runtime,
      sourceSetup: context.sourceSetup,
      observedAt: attemptStartedAt
    }),
    worker_control: workerControl,
    source_root_freshness: sourceRootFreshness,
    failure_diagnosis: null,
    owner_phase: 'bootstrapping',
    owner_status: 'in_progress',
    workspace_path: context.workspacePath,
    worker_host: context.workerHost,
    source_setup: context.sourceSetup,
    linear_audit: null,
    child_streams: [],
    child_lanes: [],
    parallelization: null,
    progress: null,
    tracked_issue_error: null,
    linear_budget: null,
    resident_session: buildInitialProviderLinearResidentSessionState({
      issueId: context.issueId,
      seed: residentSessionSeed
    }),
    end_reason: null,
    updated_at: attemptStartedAt
  };
  let lastProgressSignature: string | null | undefined = undefined;

  const emitSemanticProgressIfChanged = (proof: ProviderLinearWorkerProof): void => {
    const progress = proof.progress ?? null;
    const signature = buildProviderLinearWorkerProgressSemanticSignature(progress);
    if (!shouldEmitProviderLinearWorkerProgressSignatureTransition(lastProgressSignature, signature)) {
      return;
    }
    lastProgressSignature = signature;
    deps.log.info(
      formatProviderLinearWorkerProgressEvent(proof)
    );
  };

  const writeFreshProofSnapshot = async (
    nextProof: ProviderLinearWorkerProof
  ): Promise<ProviderLinearWorkerProof> => {
    const proofWithFreshSourceRoot = await refreshProviderWorkerProofSourceRootFreshness(context, nextProof);
    return await writeProofSnapshot(deps, context.runDir, auditPath, proofWithFreshSourceRoot, childEnv);
  };

  const persistProof = async (nextProof: ProviderLinearWorkerProof): Promise<ProviderLinearWorkerProof> => {
    const hydratedProof = await writeFreshProofSnapshot(nextProof);
    emitSemanticProgressIfChanged(hydratedProof);
    await requestProviderControlHostRefresh({
      currentManifestPath: context.controlHostManifestPath,
      env,
      manifest: context.controlHostManifest,
      proof: hydratedProof,
      repoRoot: context.repoRoot,
      log: deps.log
    });
    return hydratedProof;
  };

  finalProof = await persistProof(finalProof);
  const readTrackedIssueWithFailClosedProof = async (): Promise<LiveLinearTrackedIssue> => {
    let rateLimitRetryConsumed = false;
    let shouldReadTrackedIssue = true;
    while (shouldReadTrackedIssue) {
      try {
        const trackedIssue = await deps.readTrackedIssue({
          issueId: context.issueId,
          env: childEnv,
          sourceSetup: context.sourceSetup
        });
        shouldReadTrackedIssue = false;
        return trackedIssue;
      } catch (error) {
        const trackedIssueError = buildProviderLinearTrackedIssueError(error);
        const rateLimitWaitMs = resolveTrackedIssueRateLimitWaitMs(trackedIssueError);
        if (
          !rateLimitRetryConsumed &&
          trackedIssueError?.retryable === true &&
          rateLimitWaitMs !== null &&
          rateLimitWaitMs <= PROVIDER_LINEAR_TRACKED_ISSUE_RATE_LIMIT_MAX_WAIT_MS
        ) {
          rateLimitRetryConsumed = true;
          deps.log.warn(
            `[provider-linear-worker] tracked issue reread rate limited; waiting ${rateLimitWaitMs}ms before one retry`
          );
          await deps.sleep(rateLimitWaitMs);
          continue;
        }

        finalProof = {
          ...finalProof,
          owner_phase: 'ended',
          owner_status: 'failed',
          tracked_issue_error: trackedIssueError,
          end_reason:
            trackedIssueError?.code === 'linear_rate_limited'
              ? 'tracked_issue_rate_limited'
              : 'tracked_issue_read_failed',
          updated_at: deps.now()
        };
        finalProof = await persistProof(finalProof);
        throw error instanceof Error ? error : new Error(String(error));
      }
    }
    throw new Error('provider-linear-worker tracked issue read loop exited unexpectedly.');
  };

  let issue = await readTrackedIssueWithFailClosedProof();
  let threadId: string | null = residentSessionSeed?.source_thread_id ?? null;
  let turnId: string | null = null;
  let lifecycle = classifyProviderLinearWorkerLifecycle(issue);
  let liveRefreshRequestedAtMs = 0;
  let liveRefreshRequest: Promise<void> | null = null;
  let liveRefreshAbortController: AbortController | null = null;
  let liveRefreshPending = false;
  let liveRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  let liveSemanticStallTimer: ReturnType<typeof setTimeout> | null = null;
  let liveRefreshClosed = false;
  let liveProofWrite: Promise<void> = Promise.resolve();

  const clearLiveSemanticStallTimer = (): void => {
    if (liveSemanticStallTimer !== null) {
      clearTimeout(liveSemanticStallTimer);
      liveSemanticStallTimer = null;
    }
  };

  const cancelLiveRefreshState = async (): Promise<void> => {
    liveRefreshClosed = true;
    liveRefreshPending = false;
    if (liveRefreshTimer !== null) {
      clearTimeout(liveRefreshTimer);
      liveRefreshTimer = null;
    }
    clearLiveSemanticStallTimer();
    await liveProofWrite;
    if (liveRefreshRequest !== null) {
      liveRefreshAbortController?.abort();
      await liveRefreshRequest;
    }
    liveRefreshAbortController = null;
    liveRefreshRequest = null;
  };

  try {
    if (!lifecycle.isExecutionEligible) {
      finalProof = {
        ...finalProof,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: lifecycle.terminalReason,
        updated_at: deps.now()
      };
      finalProof = await persistProof(finalProof);
      return finalProof;
    }

    for (let turnNumber = 1; turnNumber <= context.maxTurns; turnNumber += 1) {
      let liveStdoutBuffer = '';
      let liveProofSignature: string | null = null;
      const liveParseState = buildEmptyProviderLinearWorkerJsonlParseResult();
      let liveSessionLogThreadId: string | null = null;
      let liveSessionLogTurnId: string | null = null;
      let liveSessionLogSessionId: string | null = null;
      const scheduleTrailingLiveRefresh = (): void => {
        if (liveRefreshClosed || !liveRefreshPending || liveRefreshRequest !== null || liveRefreshTimer !== null) {
          return;
        }
        const waitMs = Math.max(0, 1_000 - (Date.now() - liveRefreshRequestedAtMs));
        liveRefreshTimer = setTimeout(() => {
          liveRefreshTimer = null;
          if (liveRefreshClosed || !liveRefreshPending || liveRefreshRequest !== null) {
            return;
          }
          liveRefreshPending = false;
          liveRefreshRequestedAtMs = Date.now();
          const abortController = new AbortController();
          liveRefreshAbortController = abortController;
          liveRefreshRequest = requestProviderControlHostRefresh({
            currentManifestPath: context.controlHostManifestPath,
            env,
            manifest: context.controlHostManifest,
            proof: finalProof,
            repoRoot: context.repoRoot,
            log: deps.log,
            allowInProgress: true,
            abortSignal: abortController.signal
          }).finally(() => {
            if (liveRefreshAbortController === abortController) {
              liveRefreshAbortController = null;
            }
            liveRefreshRequest = null;
            scheduleTrailingLiveRefresh();
            });
        }, waitMs);
      };
      const queueLiveRefresh = (proof: ProviderLinearWorkerProof): void => {
        if (liveRefreshClosed) {
          return;
        }
        const nowMs = Date.now();
        if (nowMs - liveRefreshRequestedAtMs < 1_000 || liveRefreshRequest !== null) {
          liveRefreshPending = true;
          scheduleTrailingLiveRefresh();
          return;
        }
        liveRefreshPending = false;
        liveRefreshRequestedAtMs = nowMs;
        const abortController = new AbortController();
        liveRefreshAbortController = abortController;
        liveRefreshRequest = requestProviderControlHostRefresh({
          currentManifestPath: context.controlHostManifestPath,
          env,
          manifest: context.controlHostManifest,
          proof,
          repoRoot: context.repoRoot,
          log: deps.log,
          allowInProgress: true,
          abortSignal: abortController.signal
        }).finally(() => {
          if (liveRefreshAbortController === abortController) {
            liveRefreshAbortController = null;
          }
          liveRefreshRequest = null;
          scheduleTrailingLiveRefresh();
        });
      };
      const shouldKeepPollingLiveSemanticState = (proof: ProviderLinearWorkerProof): boolean => {
        const progress = proof.progress ?? null;
        return (
          proof.owner_phase === 'turn_running'
          && progress !== null
          && progress.status !== 'completed'
          && progress.status !== 'failed'
        );
      };
      const scheduleLiveSemanticStallRefresh = (proof: ProviderLinearWorkerProof): void => {
        clearLiveSemanticStallTimer();
        if (liveRefreshClosed || !shouldKeepPollingLiveSemanticState(proof)) {
          return;
        }
        liveSemanticStallTimer = setTimeout(() => {
          liveSemanticStallTimer = null;
          liveProofWrite = liveProofWrite
            .then(async () => {
              if (liveRefreshClosed || !shouldKeepPollingLiveSemanticState(finalProof)) {
                return;
              }
              const hydratedProof = await writeFreshProofSnapshot({
                ...finalProof,
                updated_at: deps.now()
              });
              finalProof = hydratedProof;
              emitSemanticProgressIfChanged(hydratedProof);
              queueLiveRefresh(hydratedProof);
              scheduleLiveSemanticStallRefresh(hydratedProof);
            })
            .catch((error) => {
              deps.log.warn(
                `provider-linear-worker could not persist semantic stall refresh for ${context.issueIdentifier}: ${
                  (error as Error)?.message ?? String(error)
                }`
              );
            });
        }, PROVIDER_SEMANTIC_STALL_RECHECK_DELAY_MS);
      };
      const queueLiveProofWrite = (): void => {
        const liveThreadId = liveParseState.threadId ?? threadId;
        const liveTurnId = liveParseState.turnId;
        const liveThreadChanged = Boolean(liveThreadId && liveThreadId !== finalProof.thread_id);
        const liveTurnChanged = Boolean(liveTurnId && liveTurnId !== finalProof.latest_turn_id);
        const liveScopeChanged = liveThreadChanged || liveTurnChanged;
        const session = deriveLatestTurnSessionId({
          threadId: liveThreadId,
          turnId: liveTurnId
        });
        const nextProof: ProviderLinearWorkerProof = {
          ...finalProof,
          pid: workerPid,
          thread_id: liveThreadId,
          latest_turn_id: liveTurnId,
          latest_session_id: session.sessionId,
          latest_session_id_source: session.source,
          session_log_thread_id:
            liveSessionLogThreadId ?? (liveScopeChanged ? null : finalProof.session_log_thread_id ?? null),
          session_log_turn_id:
            liveSessionLogTurnId ?? (liveScopeChanged ? null : finalProof.session_log_turn_id ?? null),
          session_log_session_id:
            liveSessionLogSessionId ?? (liveScopeChanged ? null : finalProof.session_log_session_id ?? null),
          resume_source_thread_id: finalProof.resume_source_thread_id ?? null,
          turn_count: turnNumber,
          last_event: liveParseState.lastEvent ?? (liveScopeChanged ? null : finalProof.last_event),
          last_message:
            liveParseState.finalMessage ?? (liveScopeChanged ? null : finalProof.last_message),
          last_message_source: liveParseState.finalMessage
            ? liveParseState.finalMessageSource ?? null
            : liveScopeChanged
              ? null
              : normalizeProviderLinearWorkerFinalMessageSource(finalProof.last_message_source),
          last_message_delta_key: liveParseState.finalMessage
            ? liveParseState.finalMessageSource === 'agent_message_delta'
              ? liveParseState.finalMessageDeltaKey ?? null
              : null
            : liveScopeChanged
              ? null
              : selectProviderLinearWorkerProofFinalMessageDeltaKey(finalProof),
          last_event_at:
            liveParseState.lastEventAt ?? (liveScopeChanged ? null : finalProof.last_event_at),
          current_turn_activity:
            synchronizeProviderLinearWorkerCurrentTurnActivity(
              liveParseState.currentTurnActivity,
              liveThreadId,
              liveTurnId
            ) ??
            (liveScopeChanged ? null : selectProviderLinearWorkerCurrentTurnActivity(finalProof)),
          tokens: hasProviderWorkerTokenUsage(liveParseState.tokens)
            ? liveParseState.tokens
            : liveTurnChanged
              ? buildEmptyProviderLinearWorkerTokenUsage()
              : finalProof.tokens,
          rate_limits: liveParseState.rateLimits ?? (liveTurnChanged ? null : finalProof.rate_limits),
          auth_provenance: mergeProviderWorkerAuthProvenance(
            finalProof.auth_provenance ?? null,
            liveParseState.authProvenance
          ),
          failure_diagnosis:
            liveParseState.failureDiagnosis ?? (liveTurnChanged ? null : finalProof.failure_diagnosis ?? null),
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          progress: finalProof.progress ?? null,
          updated_at: deps.now()
        };
        const signature = JSON.stringify({
          thread_id: nextProof.thread_id,
          latest_turn_id: nextProof.latest_turn_id,
          latest_session_id: nextProof.latest_session_id,
          latest_session_id_source: nextProof.latest_session_id_source,
          session_log_thread_id: nextProof.session_log_thread_id ?? null,
          session_log_turn_id: nextProof.session_log_turn_id ?? null,
          session_log_session_id: nextProof.session_log_session_id ?? null,
          resume_source_thread_id: nextProof.resume_source_thread_id ?? null,
          turn_count: nextProof.turn_count,
          last_event: nextProof.last_event,
          last_message: nextProof.last_message,
          last_message_source: nextProof.last_message_source ?? null,
          last_message_delta_key: nextProof.last_message_delta_key ?? null,
          last_event_at: nextProof.last_event_at,
          current_turn_activity: nextProof.current_turn_activity ?? null,
          tokens: nextProof.tokens,
          rate_limits: nextProof.rate_limits,
          auth_provenance: nextProof.auth_provenance ?? null,
          failure_diagnosis: nextProof.failure_diagnosis ?? null,
          owner_phase: nextProof.owner_phase
        });
        if (signature === liveProofSignature) {
          return;
        }
        liveProofSignature = signature;
        clearLiveSemanticStallTimer();
        finalProof = nextProof;
        liveProofWrite = liveProofWrite
          .then(async () => {
            const hydratedProof = await writeFreshProofSnapshot(nextProof);
            finalProof = hydratedProof;
            emitSemanticProgressIfChanged(hydratedProof);
            scheduleLiveSemanticStallRefresh(hydratedProof);
            if (liveRefreshClosed) {
              return;
            }
            queueLiveRefresh(hydratedProof);
          })
          .catch((error) => {
            deps.log.warn(
              `provider-linear-worker could not persist live proof update for ${context.issueIdentifier}: ${
                (error as Error)?.message ?? String(error)
              }`
            );
          });
      };
      const handleLiveStdoutChunk = (chunk: string): void => {
        liveStdoutBuffer += chunk;
        const lines = liveStdoutBuffer.split(/\r?\n/u);
        liveStdoutBuffer = lines.pop() ?? '';
        let changed = false;
        for (const line of lines) {
          changed = applyProviderLinearWorkerJsonlLine(liveParseState, line, 'stdout_jsonl', childEnv) || changed;
        }
        if (changed) {
          queueLiveProofWrite();
        }
      };
      const flushLiveStdoutTail = (): void => {
        const trailingLine = liveStdoutBuffer.trim();
        liveStdoutBuffer = '';
        if (!trailingLine) {
          return;
        }
        if (applyProviderLinearWorkerJsonlLine(liveParseState, trailingLine, 'stdout_jsonl', childEnv)) {
          queueLiveProofWrite();
        }
      };
      const sharedRepoCheckoutPath =
        (await resolveProviderControlHostRepoRoot({
          manifestPath: context.manifestPath,
          workerWorkspacePath: context.repoRoot,
          taskId: context.taskId
        })) ??
        deriveSharedRepoCheckoutPathFallback(context.repoRoot, context.taskId);
      const continueResidentSessionOnBoot = turnNumber === 1 && residentSessionSeed !== null;
      const resumeSourceThreadIdForTurn =
        continueResidentSessionOnBoot
          ? residentSessionSeed?.source_thread_id ?? null
          : turnNumber > 1
            ? threadId ?? finalProof.thread_id ?? null
            : null;
      const prompt = buildProviderWorkerPrompt(
        issue,
        turnNumber,
        context.maxTurns,
        helperCommand,
        sharedRepoCheckoutPath,
        {
          linearAudit: finalProof.linear_audit,
          attemptStartedAt: finalProof.attempt_started_at ?? null,
          manifest: context.manifest,
          residentSession: finalProof.resident_session ?? null,
          continueResidentSessionOnBoot
        }
      );
      const args =
        continueResidentSessionOnBoot
          ? ['exec', 'resume', '--json', resumeSourceThreadIdForTurn ?? '', prompt]
          : turnNumber === 1
          ? ['exec', '--json', prompt]
          : ['exec', 'resume', '--json', resumeSourceThreadIdForTurn ?? '', prompt];
      const useAppServerControl = runtimeContext.runtime.selected_mode === 'appserver';
      const resumeThreadId = resumeSourceThreadIdForTurn;
      const resolved = resolveRuntimeCodexCommand(
        useAppServerControl ? ['app-server'] : args,
        runtimeContext
      );
      let stopLiveSessionTailResolve: (() => void) | null = null;
      let liveSessionTailStopped = false;
      const stopLiveSessionTailPromise = new Promise<void>((resolve) => {
        stopLiveSessionTailResolve = resolve;
      });
      const stopLiveSessionTail = (): void => {
        if (liveSessionTailStopped) {
          return;
        }
        liveSessionTailStopped = true;
        stopLiveSessionTailResolve?.();
      };
      const previousTurnProof = finalProof;
      const turnStartedAt = deps.now();
      finalProof = await writeFreshProofSnapshot(
        buildProviderLinearWorkerTurnBootstrapProof(
          finalProof,
          turnNumber,
          turnStartedAt,
          resumeSourceThreadIdForTurn
        )
      );
      const parallelizationDecisionCountBeforeTurn = readProviderLinearParallelizationSnapshots(
        finalProof.linear_audit,
        {
          issueId: finalProof.issue_id
        }
      ).length;
      emitSemanticProgressIfChanged(finalProof);
      const liveSessionTailState: ProviderWorkerSessionLogTailState | null =
        runtimeContext.runtime.selected_mode === 'appserver'
          ? {
              path: null,
              offsetBytes: 0,
              trailingText: '',
              bootstrapPending: true,
              currentTurnStartedAt: turnStartedAt,
              idRewindSignature: null
            }
          : null;
      const allowCompletedSessionBootstrapTurn =
        turnNumber === 1 &&
        previousTurnProof.latest_turn_id === null &&
        !continueResidentSessionOnBoot;
      const liveSessionTailPromise =
        liveSessionTailState === null
          ? Promise.resolve()
          : (async () => {
              while (!liveSessionTailStopped) {
                const liveSessionThreadHint =
                  threadId ?? liveParseState.threadId ?? finalProof.thread_id ?? null;
                if (
                  liveSessionTailState.path !== null &&
                  liveSessionThreadHint &&
                  !providerWorkerSessionLogPathMatchesThreadId(
                    liveSessionTailState.path,
                    liveSessionThreadHint
                  )
                ) {
                  resetProviderWorkerSessionLogTailState(liveSessionTailState);
                }
                if (liveSessionTailState.path === null) {
                  liveSessionTailState.path = await discoverProviderWorkerSessionLogPath({
                    env:
                      liveSessionThreadHint
                        ? { ...childEnv, CODEX_THREAD_ID: liveSessionThreadHint }
                        : childEnv,
                    workspacePath: context.workspacePath ?? context.repoRoot,
                    issue: {
                      identifier: issue.identifier,
                      title: issue.title
                    },
                    startedAt: finalProof.attempt_started_at ?? null
                  });
                }
                if (liveSessionTailState.path !== null) {
                  const delta = await readProviderWorkerSessionLogDelta(liveSessionTailState);
                  const deltaApply =
                    delta
                      ? applyProviderWorkerSessionLogDelta(
                          liveParseState,
                          liveSessionTailState,
                          delta,
                          childEnv,
                          { allowCompletedBootstrapTurn: allowCompletedSessionBootstrapTurn }
                        )
                      : {
                          changed: false,
                          observed: false,
                          observedThreadId: null,
                          observedTurnId: null
                        };
                  if (deltaApply.observed) {
                    liveSessionLogThreadId =
                      deltaApply.observedThreadId ?? liveSessionLogThreadId;
                    liveSessionLogTurnId = deltaApply.observedTurnId ?? liveSessionLogTurnId;
                    liveSessionLogSessionId = deriveLatestTurnSessionId({
                      threadId: liveSessionLogThreadId,
                      turnId: liveSessionLogTurnId
                    }).sessionId;
                    queueLiveProofWrite();
                  }
                }
                if (liveSessionTailStopped) {
                  break;
                }
                await Promise.race([
                  deps.sleep(PROVIDER_WORKER_SESSION_LOG_POLL_INTERVAL_MS),
                  stopLiveSessionTailPromise
                ]);
              }
              if (liveSessionTailState.path === null) {
                const liveSessionThreadHint =
                  threadId ?? liveParseState.threadId ?? finalProof.thread_id ?? null;
                liveSessionTailState.path = await discoverProviderWorkerSessionLogPath({
                  env:
                    liveSessionThreadHint
                      ? { ...childEnv, CODEX_THREAD_ID: liveSessionThreadHint }
                      : childEnv,
                  workspacePath: context.workspacePath ?? context.repoRoot,
                  issue: {
                    identifier: issue.identifier,
                    title: issue.title
                  },
                  startedAt: finalProof.attempt_started_at ?? null
                });
              }
              const emptyTailApply = {
                changed: false,
                observed: false,
                observedThreadId: null as string | null,
                observedTurnId: null as string | null
              };
              let tailApply = emptyTailApply;
              if (liveSessionTailState.path !== null) {
                const delta = await readProviderWorkerSessionLogDelta(liveSessionTailState);
                const deltaApply = delta
                  ? applyProviderWorkerSessionLogDelta(
                      liveParseState,
                      liveSessionTailState,
                      delta,
                      childEnv,
                      { allowCompletedBootstrapTurn: allowCompletedSessionBootstrapTurn }
                    )
                  : emptyTailApply;
                const flushApply = flushProviderWorkerSessionLogTail(
                  liveParseState,
                  liveSessionTailState,
                  childEnv,
                  { allowCompletedBootstrapTurn: allowCompletedSessionBootstrapTurn }
                );
                tailApply = {
                  changed: deltaApply.changed || flushApply.changed,
                  observed: deltaApply.observed || flushApply.observed,
                  observedThreadId: flushApply.observedThreadId ?? deltaApply.observedThreadId,
                  observedTurnId: flushApply.observedTurnId ?? deltaApply.observedTurnId
                };
              }
              if (tailApply.observed) {
                liveSessionLogThreadId = tailApply.observedThreadId ?? liveSessionLogThreadId;
                liveSessionLogTurnId = tailApply.observedTurnId ?? liveSessionLogTurnId;
                liveSessionLogSessionId = deriveLatestTurnSessionId({
                  threadId: liveSessionLogThreadId,
                  turnId: liveSessionLogTurnId
                }).sessionId;
                queueLiveProofWrite();
              }
            })().catch((error) => {
              deps.log.warn(
                `provider-linear-worker could not tail appserver session log for ${context.issueIdentifier}: ${
                  (error as Error)?.message ?? String(error)
                }`
              );
            });
      let execResult: ProviderLinearWorkerExecResult;
      try {
        execResult = useAppServerControl
          ? await deps.appServerTurnRunner({
              command: resolved.command,
              args: resolved.args,
              cwd: context.repoRoot,
              env: childEnv,
              prompt,
              resumeThreadId,
              onStdoutChunk: handleLiveStdoutChunk
            })
          : await deps.execRunner({
              command: resolved.command,
              args: resolved.args,
              cwd: context.repoRoot,
              env: childEnv,
              mirrorOutput: false,
              onStdoutChunk: handleLiveStdoutChunk
            });
      } catch (error) {
        stopLiveSessionTail();
        await liveSessionTailPromise;
        clearLiveSemanticStallTimer();
        flushLiveStdoutTail();
        await liveProofWrite;
        const failedProofBase = shouldPreservePreviousTurnTelemetryOnLaunchFailure(
          liveParseState,
          previousTurnProof.thread_id ?? null
        )
          ? {
              ...finalProof,
              thread_id: finalProof.thread_id ?? previousTurnProof.thread_id,
              latest_turn_id: previousTurnProof.latest_turn_id,
              latest_session_id: previousTurnProof.latest_session_id,
              latest_session_id_source: previousTurnProof.latest_session_id_source,
              session_log_thread_id: previousTurnProof.session_log_thread_id,
              session_log_turn_id: previousTurnProof.session_log_turn_id,
              session_log_session_id: previousTurnProof.session_log_session_id,
              last_event: previousTurnProof.last_event,
              last_message: previousTurnProof.last_message,
              last_message_source: normalizeProviderLinearWorkerFinalMessageSource(
                previousTurnProof.last_message_source
              ),
              last_message_delta_key: selectProviderLinearWorkerProofFinalMessageDeltaKey(previousTurnProof),
              last_event_at: previousTurnProof.last_event_at,
              current_turn_activity: selectProviderLinearWorkerCurrentTurnActivity(previousTurnProof),
              tokens: previousTurnProof.tokens,
              rate_limits: previousTurnProof.rate_limits
            }
          : {
              ...finalProof,
              tokens: hasProviderWorkerTokenUsage(finalProof.tokens)
                ? finalProof.tokens
                : previousTurnProof.tokens,
              rate_limits: finalProof.rate_limits ?? previousTurnProof.rate_limits
            };
        const endReason = classifyExecRunnerFailure(error, {
          cwd: context.repoRoot,
          useAppServerControl
        });
        finalProof = {
          ...failedProofBase,
          failure_diagnosis:
            liveParseState.failureDiagnosis ??
            classifyProviderWorkerTurnRunnerFailureDiagnosis(
              error,
              turnStartedAt,
              endReason,
              useAppServerControl ? 'appserver_runner' : 'exec_runner'
            ),
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: endReason,
          updated_at: deps.now()
        };
        finalProof = await persistProof(finalProof);
        throw error instanceof Error ? error : new Error(String(error));
      }
      stopLiveSessionTail();
      await liveSessionTailPromise;
      clearLiveSemanticStallTimer();
      flushLiveStdoutTail();
      await liveProofWrite;
      const parsed = parseProviderLinearWorkerJsonl(execResult.stdout, childEnv);
      const stderrFailureDiagnosis =
        execResult.exitCode === 0
          ? null
          : classifyProviderWorkerStderrFailureDiagnosis(
              execResult.stderr,
              turnStartedAt,
              useAppServerControl ? 'appserver_runner' : 'stderr'
            );
      threadId = parsed.threadId ?? finalProof.thread_id ?? threadId;
      const parsedThreadChanged = Boolean(threadId && threadId !== finalProof.thread_id);
      if (
        continueResidentSessionOnBoot &&
        residentSessionSeed &&
        threadId &&
        threadId !== residentSessionSeed.source_thread_id
      ) {
        finalProof = {
          ...finalProof,
          thread_id: threadId,
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: 'guarded_resume_thread_mismatch',
          updated_at: deps.now()
        };
        finalProof = await persistProof(finalProof);
        throw new Error(
          `provider-linear-worker guarded resident resume changed thread identity from ${residentSessionSeed.source_thread_id} to ${threadId}`
        );
      }
      turnId = parsed.turnId ?? (parsedThreadChanged ? null : finalProof.latest_turn_id ?? turnId);
      const parsedTurnChanged = Boolean(turnId && turnId !== finalProof.latest_turn_id);
      const parsedScopeChanged = parsedThreadChanged || parsedTurnChanged;
      const preferAppServerSessionLogFinalMessage = Boolean(
        useAppServerControl &&
        finalProof.last_message &&
        finalProof.session_log_turn_id &&
        !parsedScopeChanged
      );
      const session = deriveLatestTurnSessionId({ threadId, turnId });
      const sessionLogProof = selectProviderLinearWorkerSessionLogProofForScope({
        proof: finalProof,
        threadId,
        turnId,
        sessionId: session.sessionId,
        scopeChanged: parsedScopeChanged
      });
      const nextLastMessage = preferAppServerSessionLogFinalMessage
        ? finalProof.last_message
        : parsed.finalMessage ?? (parsedScopeChanged ? null : finalProof.last_message);
      const nextLastMessageSource = preferAppServerSessionLogFinalMessage
        ? normalizeProviderLinearWorkerFinalMessageSource(finalProof.last_message_source)
        : parsed.finalMessage
          ? parsed.finalMessageSource ?? null
          : parsedScopeChanged
            ? null
            : normalizeProviderLinearWorkerFinalMessageSource(finalProof.last_message_source);
      const nextLastMessageDeltaKey = preferAppServerSessionLogFinalMessage
        ? selectProviderLinearWorkerProofFinalMessageDeltaKey(finalProof)
        : parsed.finalMessage
          ? parsed.finalMessageSource === 'agent_message_delta'
            ? parsed.finalMessageDeltaKey ?? null
            : null
          : parsedScopeChanged
            ? null
            : selectProviderLinearWorkerProofFinalMessageDeltaKey(finalProof);

      finalProof = {
        issue_id: context.issueId,
        issue_identifier: context.issueIdentifier,
        attempt_started_at: finalProof.attempt_started_at,
        current_turn_started_at: finalProof.current_turn_started_at ?? turnStartedAt,
        pid: workerPid,
        thread_id: threadId,
        latest_turn_id: turnId,
        latest_session_id: session.sessionId,
        latest_session_id_source: session.source,
        session_log_thread_id: sessionLogProof.sessionLogThreadId,
        session_log_turn_id: sessionLogProof.sessionLogTurnId,
        session_log_session_id: sessionLogProof.sessionLogSessionId,
        resume_source_thread_id: finalProof.resume_source_thread_id ?? null,
        turn_count: turnNumber,
        last_event: parsed.lastEvent ?? (parsedScopeChanged ? null : finalProof.last_event),
        last_message: nextLastMessage,
        last_message_source: nextLastMessageSource,
        last_message_delta_key: nextLastMessageDeltaKey,
        last_event_at:
          parsed.lastEventAt ?? (parsedScopeChanged ? null : finalProof.last_event_at),
        current_turn_activity:
          synchronizeProviderLinearWorkerCurrentTurnActivity(
            parsed.currentTurnActivity,
            threadId,
            turnId
          ) ?? (parsedScopeChanged ? null : selectProviderLinearWorkerCurrentTurnActivity(finalProof)),
        tokens: hasProviderWorkerTokenUsage(parsed.tokens) ? parsed.tokens : finalProof.tokens,
        rate_limits: parsed.rateLimits ?? finalProof.rate_limits,
        runtime: finalProof.runtime ?? buildProviderLinearWorkerRuntimeProof(runtimeContext.runtime),
        appserver_supervision: finalProof.appserver_supervision ?? null,
        auth_provenance: mergeProviderWorkerAuthProvenance(
          finalProof.auth_provenance ?? null,
          parsed.authProvenance
        ),
        worker_control: finalProof.worker_control ?? workerControl,
        source_root_freshness: finalProof.source_root_freshness ?? sourceRootFreshness,
        failure_diagnosis:
          (useAppServerControl ? stderrFailureDiagnosis : parsed.failureDiagnosis) ??
          (useAppServerControl ? parsed.failureDiagnosis : stderrFailureDiagnosis) ??
          (parsedScopeChanged ? null : finalProof.failure_diagnosis ?? null),
        owner_phase: execResult.exitCode === 0 ? 'turn_completed' : 'turn_failed',
        owner_status: execResult.exitCode === 0 ? 'in_progress' : 'failed',
        workspace_path: context.workspacePath,
        worker_host: context.workerHost,
        source_setup: context.sourceSetup,
        linear_audit: finalProof.linear_audit,
        child_streams: finalProof.child_streams,
        child_lanes: finalProof.child_lanes,
        parallelization: finalProof.parallelization ?? null,
        progress: finalProof.progress ?? null,
        tracked_issue_error: null,
        resident_session: buildActiveProviderLinearResidentSessionState({
          issueId: context.issueId,
          logicalTurnCount: residentLogicalTurnBase + turnNumber,
          seed: residentSessionSeed
        }),
        end_reason: null,
        updated_at: deps.now()
      };
      finalProof = await persistProof(finalProof);

      if (execResult.exitCode !== 0) {
        const endReason = useAppServerControl
          ? 'appserver_runtime_error'
          : `codex_exit_${execResult.exitCode ?? 'unknown'}`;
        finalProof = {
          ...finalProof,
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: endReason,
          updated_at: deps.now()
        };
        finalProof = await persistProof(finalProof);
        throw new Error(
          `provider-linear-worker turn ${turnNumber} failed with exit code ${execResult.exitCode ?? 'unknown'}`
        );
      }

      if (!threadId) {
        finalProof = {
          ...finalProof,
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: 'thread_id_missing',
          updated_at: deps.now()
        };
        finalProof = await persistProof(finalProof);
        throw new Error('provider-linear-worker could not determine thread_id from Codex JSONL output.');
      }

      const parallelizationFailure = resolveProviderLinearWorkerParallelizationFailure({
        proof: finalProof,
        parallelizationDecisionCountBeforeTurn
      });
      if (parallelizationFailure) {
        finalProof = {
          ...finalProof,
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: parallelizationFailure.endReason,
          updated_at: deps.now()
        };
        finalProof = await persistProof(finalProof);
        throw new Error(parallelizationFailure.message);
      }

      issue = await readTrackedIssueWithFailClosedProof();
      lifecycle = classifyProviderLinearWorkerLifecycle(issue);
      if (!lifecycle.isExecutionEligible) {
        finalProof = {
          ...finalProof,
          owner_phase: 'ended',
          owner_status: 'succeeded',
          end_reason: lifecycle.terminalReason,
          updated_at: deps.now()
        };
        finalProof = await persistProof(finalProof);
        return finalProof;
      }

      if (turnNumber === context.maxTurns) {
        finalProof = {
          ...finalProof,
          owner_phase: 'ended',
          owner_status: 'succeeded',
          end_reason: 'max_turns_reached_issue_still_active',
          updated_at: deps.now()
        };
        finalProof = await persistProof(finalProof);
        return finalProof;
      }
    }

    finalProof = {
      ...finalProof,
      owner_phase: 'ended',
      owner_status: 'succeeded',
      end_reason: 'worker_completed',
      updated_at: deps.now()
    };
    finalProof = await persistProof(finalProof);
    return finalProof;
  } finally {
    await cancelLiveRefreshState();
  }
}

export function resolveProviderLinearHelperCommand(env: NodeJS.ProcessEnv): string {
  const nodeBin = normalizeOptionalString(env.CODEX_ORCHESTRATOR_NODE_BIN) ?? 'node';
  const invocation = resolveCodexOrchestratorBootstrapInvocation({ env, execPath: nodeBin });
  return [...[invocation.command, ...invocation.args].map(quoteShellArg), 'linear'].join(' ');
}

function quoteShellArg(value: string): string {
  return `"${value.replace(/(["\\$`])/gu, '\\$1')}"`;
}

async function main(): Promise<void> {
  await runProviderLinearWorker();
}

const entry = process.argv[1] ? resolve(process.argv[1]) : null;
const self = resolve(fileURLToPath(import.meta.url));
if (entry && entry === self) {
  main().catch((error) => {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
