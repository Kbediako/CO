import { spawn, type StdioOptions } from 'node:child_process';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, open, readFile, readdir, realpath, stat } from 'node:fs/promises';

import { logger } from '../logger.js';
import {
  computeEffectiveDelegationConfig,
  loadDelegationConfigFiles,
  parseDelegationConfigOverride,
  splitDelegationConfigOverrides,
  type DelegationConfigLayer
} from './config/delegationConfig.js';
import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  readProviderControlHostLocatorFromEnv,
  readProviderControlHostLocatorFromManifest
} from '../../../scripts/lib/provider-run-contract.js';
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
  PROVIDER_LINEAR_AUDIT_ENV_VAR,
  PROVIDER_LINEAR_PARALLELIZATION_REASONS,
  readProviderLinearParallelizationSnapshot,
  readProviderLinearParallelizationSnapshots,
  summarizeProviderLinearAuditPath,
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
import { buildRunSource0PromptLines, readRunSource0Descriptor } from './run/source0.js';
import { writeJsonAtomic } from './utils/fs.js';
import {
  createRuntimeCodexCommandContext,
  formatRuntimeSelectionSummary,
  parseRuntimeMode,
  resolveRuntimeCodexCommand,
  type RuntimeCodexCommandContext
} from './runtime/index.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';
import { sanitizeTaskId } from '../persistence/sanitizeTaskId.js';
import { acquireLockWithRetry, type LockRetryOptions } from '../persistence/lockFile.js';
import { resolveCodexHome } from './utils/codexPaths.js';
import {
  normalizeProviderLinearChildLanePathSelectors,
  type ProviderLinearChildLanePathSelector
} from './providerLinearChildLanePhaseContract.js';
import { resolveCodexOrchestratorBootstrapInvocation } from './utils/packageProgramResolver.js';

export const PROVIDER_LINEAR_WORKER_PROOF_FILENAME = 'provider-linear-worker-proof.json';
export const PROVIDER_LINEAR_WORKER_AUDIT_FILENAME = 'provider-linear-worker-linear-audit.jsonl';
export const PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME = 'provider-linear-worker-child-streams.json';
export const PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME = 'provider-linear-worker-child-lanes.json';
const PROVIDER_LINEAR_WORKER_SESSION_LOG_HYDRATION_FILENAME =
  'provider-linear-worker-session-log-hydration.json';
const PROVIDER_LINEAR_WORKER_PROOF_LOCK_FILENAME = `${PROVIDER_LINEAR_WORKER_PROOF_FILENAME}.lock`;
const PROVIDER_LINEAR_WORKER_CHILD_STREAMS_LOCK_FILENAME = `${PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME}.lock`;
const PROVIDER_LINEAR_WORKER_CHILD_LANES_LOCK_FILENAME = `${PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME}.lock`;
const PROVIDER_WORKER_DEFAULT_MAX_TURNS = 20;
const PROVIDER_CONTROL_HOST_REFRESH_PATH = '/api/v1/refresh';
const PROVIDER_CONTROL_HOST_REFRESH_TIMEOUT_MS = 15_000;
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
  maxDelayMs: 250
};
const PROVIDER_CONTROL_HOST_REFRESH_SUCCESS_END_REASONS = new Set<string>([
  'max_turns_reached_issue_still_active'
]);
const PROVIDER_SEMANTIC_STALL_RECHECK_DELAY_MS = 15 * 60 * 1000 + 1_000;
const PROVIDER_WORKER_SESSION_LOG_POLL_INTERVAL_MS = 250;
const PROVIDER_WORKER_SESSION_LOG_DISCOVERY_WINDOW_MS = 15 * 60 * 1000;
const PROVIDER_WORKER_SESSION_LOG_HEADER_BYTES = 256 * 1024;
const require = createRequire(import.meta.url);
const toml = require('@iarna/toml') as {
  parse: (source: string) => unknown;
};

export interface ProviderLinearWorkerContext {
  manifest: Record<string, unknown>;
  manifestPath: string;
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
  sourceSetup: DispatchPilotSourceSetup | null;
  issueId: string;
  issueIdentifier: string;
  issueUpdatedAt: string | null;
  maxTurns: number;
}

export interface ProviderLinearWorkerTokenUsage {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
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
  issue_id: string;
  issue_identifier: string;
  workspace_path: string | null;
  source_setup: DispatchPilotSourceSetup | null;
  launched_at: string;
  purpose: string;
  instructions: string | null;
  scope: ProviderLinearWorkerChildLaneScope;
  parent_snapshot: ProviderLinearWorkerChildLaneParentSnapshot;
  lane_workspace_path: string | null;
  patch_artifact_path: string | null;
  patch_bytes: number | null;
  decision: ProviderLinearWorkerChildLaneDecision;
  in_flight_action?: ProviderLinearWorkerChildLaneInFlightAction | null;
  decision_at: string | null;
  decision_reason: string | null;
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
  turn_count: number;
  last_event: string | null;
  last_message: string | null;
  last_event_at: string | null;
  current_turn_activity?: ProviderLinearWorkerCurrentTurnActivity | null;
  tokens: ProviderLinearWorkerTokenUsage;
  rate_limits: Record<string, unknown> | null;
  owner_phase: string;
  owner_status: 'in_progress' | 'succeeded' | 'failed';
  workspace_path: string | null;
  source_setup?: DispatchPilotSourceSetup | null;
  linear_audit: ProviderLinearAuditSummary | null;
  child_streams?: ProviderLinearWorkerChildStreamRecord[];
  child_lanes?: ProviderLinearWorkerChildLaneRecord[];
  parallelization?: ProviderLinearWorkerParallelizationRecord | null;
  progress?: ProviderLinearWorkerProgressSnapshot | null;
  linear_budget?: LinearBudgetStatus | null;
  tracked_issue_error?: ProviderLinearTrackedIssueError | null;
  end_reason: string | null;
  updated_at: string;
}

export type ProviderLinearWorkerCurrentTurnActivitySource =
  | 'stdout_jsonl'
  | 'session_log_hydration';

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
}

export interface ProviderLinearTrackedIssueError {
  code: string;
  reason: string;
  message: string;
  status: number;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface ProviderLinearWorkerJsonlParseResult {
  threadId: string | null;
  turnId: string | null;
  finalMessage: string | null;
  lastEvent: string | null;
  lastEventAt: string | null;
  currentTurnActivity: ProviderLinearWorkerCurrentTurnActivity | null;
  tokens: ProviderLinearWorkerTokenUsage;
  rateLimits: Record<string, unknown> | null;
}

export interface ProviderLinearWorkerExecRequest {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  mirrorOutput: boolean;
  onStdoutChunk?: ((chunk: string) => void) | null;
}

export interface ProviderLinearWorkerExecResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

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
}

interface ProviderWorkerSessionLogHydrationState {
  path: string;
  offset_bytes: number;
  trailing_text: string;
  bootstrap_pending: boolean;
  proof_signature: string;
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
    const finalizeError = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };
    const finalizeSuccess = (result: ProviderLinearWorkerExecResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolvePromise(result);
    };

    child.once('error', (error) => {
      finalizeError(error instanceof Error ? error : new Error(String(error)));
    });
    child.once('close', (exitCode) => {
      finalizeSuccess({ exitCode, stdout, stderr });
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

function classifyExecRunnerFailure(
  error: unknown,
  spawnContext: {
    cwd: string;
  }
): ProviderLinearWorkerProof['end_reason'] {
  if ((error as NodeJS.ErrnoException)?.code === 'ENOENT' && existsSync(spawnContext.cwd)) {
    return 'runtime_parity_command_unavailable';
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

function normalizeOptionalInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
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
    let parsedConfig: unknown;
    try {
      parsedConfig = toml.parse(rawConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse Codex config TOML at ${configPath}: ${message}`);
    }
    if (isRecord(parsedConfig)) {
      const agentConfig = isRecord(parsedConfig.agent)
        ? parsedConfig.agent
        : parsedConfig['agent.max_turns'];
      const configuredTurns = isRecord(agentConfig)
        ? parsePositiveInteger(agentConfig.max_turns, `${configPath} [agent].max_turns`)
        : parsePositiveInteger(agentConfig, `${configPath} agent.max_turns`);
      if (configuredTurns !== null) {
        return configuredTurns;
      }
    }
  }

  return PROVIDER_WORKER_DEFAULT_MAX_TURNS;
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

export async function loadProviderLinearWorkerContext(
  env: NodeJS.ProcessEnv = process.env,
  readManifest: (path: string) => Promise<Record<string, unknown>> = async (path) =>
    JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>
): Promise<ProviderLinearWorkerContext> {
  const manifestPath = normalizeOptionalString(env.CODEX_ORCHESTRATOR_MANIFEST_PATH);
  if (!manifestPath) {
    throw new Error('CODEX_ORCHESTRATOR_MANIFEST_PATH is required for provider-linear-worker.');
  }
  const manifest = await readManifest(manifestPath);
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
  const manifestWorkspacePath =
    normalizeOptionalString(manifest.workspace_path) ??
    normalizeOptionalString(manifest.workspacePath);
  const envRepoRoot = normalizeOptionalString(env.CODEX_ORCHESTRATOR_ROOT);
  const normalizedManifestWorkspacePath = manifestWorkspacePath ? resolve(manifestWorkspacePath) : null;
  const normalizedEnvRepoRoot = envRepoRoot ? resolve(envRepoRoot) : null;
  if (normalizedManifestWorkspacePath && normalizedEnvRepoRoot && normalizedEnvRepoRoot !== normalizedManifestWorkspacePath) {
    throw new Error(`Provider worker root mismatch between env (${normalizedEnvRepoRoot}) and manifest (${normalizedManifestWorkspacePath}).`);
  }
  const repoRoot = normalizedManifestWorkspacePath ?? normalizedEnvRepoRoot ?? resolve(process.cwd());
  const manifestRunId = normalizeOptionalString(manifest.run_id), envRunId = normalizeOptionalString(env.CODEX_ORCHESTRATOR_RUN_ID);
  if (manifestRunId && envRunId && envRunId !== manifestRunId) throw new Error(`Provider worker run id mismatch between env (${envRunId}) and manifest (${manifestRunId}).`);
  const runId = manifestRunId ?? envRunId ?? `provider-linear-worker-${Date.now()}`;
  const manifestTaskId =
    normalizeOptionalString(manifest.task_id) ??
    normalizeOptionalString(manifest.taskId);
  const taskId = manifestTaskId
    ? sanitizeTaskId(manifestTaskId)
    : contextTaskIdFromManifestPath(manifestPath);
  const envTaskId = normalizeOptionalString(env.CODEX_ORCHESTRATOR_TASK_ID);
  if (!taskId || (envTaskId && envTaskId !== taskId)) {
    throw new Error(taskId ? `Provider worker task id mismatch between env (${envTaskId}) and manifest (${taskId}).` : 'Provider worker task id unavailable.');
  }
  const manifestPipelineId = normalizeOptionalString(manifest.pipeline_id) ?? normalizeOptionalString(manifest.pipelineId), envPipelineId = normalizeOptionalString(env.CODEX_ORCHESTRATOR_PIPELINE_ID);
  if (manifestPipelineId && envPipelineId && envPipelineId !== manifestPipelineId) throw new Error(`Provider worker pipeline id mismatch between env (${envPipelineId}) and manifest (${manifestPipelineId}).`);
  const manifestProviderControlHostTaskId =
    normalizeOptionalString(manifest.provider_control_host_task_id) ??
    normalizeOptionalString(manifest.providerControlHostTaskId);
  const manifestProviderControlHostRunId =
    normalizeOptionalString(manifest.provider_control_host_run_id) ??
    normalizeOptionalString(manifest.providerControlHostRunId);
  const envProviderControlHostTaskId =
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID);
  const envProviderControlHostRunId =
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID);
  const providerControlHostMatchesManifest = Boolean(
    envProviderControlHostTaskId &&
      envProviderControlHostRunId &&
      manifestProviderControlHostTaskId &&
      manifestProviderControlHostRunId &&
      envProviderControlHostTaskId === manifestProviderControlHostTaskId &&
      envProviderControlHostRunId === manifestProviderControlHostRunId
  );
  return {
    manifest,
    manifestPath,
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
      Boolean(manifestProviderControlHostTaskId && manifestProviderControlHostRunId),
    providerControlHostMatchesManifest,
    workspacePath: normalizedManifestWorkspacePath ?? repoRoot,
    sourceSetup: resolveProviderLinearWorkerSourceSetup(env),
    issueId,
    issueIdentifier,
    issueUpdatedAt:
      normalizeOptionalString(env.CODEX_ORCHESTRATOR_ISSUE_UPDATED_AT) ??
      normalizeOptionalString(manifest.issue_updated_at) ??
      normalizeOptionalString(manifest.issueUpdatedAt),
    maxTurns: await resolveProviderWorkerMaxTurns(env)
  };
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
    basename(runsDir) !== '.runs'
  ) {
    return null;
  }
  const taskId = sanitizeTaskId(basename(resolve(dirname(manifestPath), '..', '..')));
  return taskId.length > 0 ? taskId : null;
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

function buildPreReviewHandoffGateSection(): string[] {
  return [
    '- Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff before opening a new PR for review handoff, before updating an already-attached PR for handoff, and before transitioning the issue to `Human Review` or `In Review`.',
    '- Use the repo heuristic for non-trivial work: about 2+ changed files or about 40+ changed lines, unless you record an explicit skip justification in the workpad.',
    '- Run the standalone review first. When manifest-backed evidence matters, use the wrapper-led review path by default; if review tooling is unavailable or stalls without a concrete verdict, do a manual correctness/regressions/missing-tests review plus a manual elegance checklist and record that fallback instead of stalling.',
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
  return [
    `- Ordinary eligible same-issue child-lane parallelisation is a runtime contract in this lane, not optional prompt advice. During every active turn, record exactly one explicit decision with \`${helperCommand} parallelization --issue-id ${issueId} --decision <parallelize_now|stay_serial|forbid_parallel> --reason <reason-code> --summary <why>\`.`,
    `- Allowed decision and reason-code pairs: ${buildParallelizationReasonCodesSummary()}.`,
    `- If you record \`parallelize_now\`, you must actually launch at least one same-issue child lane in that turn with \`${helperCommand} child-lane --action launch ...\`, and at least one of those lanes must complete successfully before the turn ends; otherwise the provider worker fails closed.`,
    '- If you record `stay_serial` or `forbid_parallel`, choose the bounded reason code that truthfully explains why `child_lanes: []` is acceptable for this turn so the proof and debug surfaces are explicit rather than silent.'
  ];
}

function buildDeterministicMutationSuppressionSection(
  audit: ProviderLinearAuditSummary | null,
  attemptStartedAt: string | null
): string[] {
  const suppressions = deriveDeterministicProviderMutationSuppressions(audit, {
    recordedAtNotBefore: attemptStartedAt
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
  } = {}
): string {
  const deterministicMutationSuppressions = buildDeterministicMutationSuppressionSection(
    attemptContext.linearAudit ?? null,
    attemptContext.attemptStartedAt ?? null
  );
  const source0PromptLines = buildRunSource0PromptLines(readRunSource0Descriptor(attemptContext.manifest ?? null));
  if (turnNumber > 1) {
    return [
      'Continuation guidance:',
      '',
      '- The previous Codex turn completed normally, but the Linear issue is still in an active state.',
      `- This is continuation turn #${turnNumber} of ${maxTurns} for the current provider worker run.`,
      '- The original task instructions and prior turn context are already present in this thread, so do not restate them before acting.',
      `- Keep the same workflow contract and continue using \`${helperCommand}\` for ticket updates with Linear issue id \`${issue.id}\` (not the human identifier \`${issue.identifier}\`).`,
      '- Follow the repo-local workflow skills: `skills/linear/SKILL.md` for workpad, review, and rework behavior, and `skills/land/SKILL.md` for the merge shepherding loop once the issue reaches `Merging`.',
      `- Keep exactly one active \`## Codex Workpad\` comment current, use \`${helperCommand} issue-context --issue-id ${issue.id}\` to inspect the team workflow states before any transition, and refresh that same comment after each meaningful milestone and immediately before any review or merge handoff.`,
      '- The workpad body must keep this exact top-level structure, in order, with every section non-empty: `## Codex Workpad`, `### Environment / Workspace Stamp`, `### Plan`, `### Acceptance Criteria`, `### Validation`, `### Notes`.',
      '- `Acceptance Criteria` and `Validation` must contain non-empty checkbox list items (`- [ ] task` / `- [x] task`). `Environment / Workspace Stamp`, `Plan`, and `Notes` can stay free-form.',
      '- If the ticket includes `Validation`, `Test Plan`, or `Testing` requirements, mirror them in the workpad `Acceptance Criteria` and `Validation` sections.',
      '- If the issue is `Todo` or the live team\'s equivalent queued state (for example `Ready`) and not blocked by a non-terminal dependency, move it into the team\'s actual started state before active coding instead of assuming a fixed state name.',
      `- When you discover a meaningful out-of-scope improvement, use \`${helperCommand} create-follow-up --issue-id ${issue.id} ...\` to file a same-project follow-up issue in \`Backlog\` with a clear title, description, intent checksum, non-goals, \`Not Done If\`, acceptance criteria, a \`related\` link, the required parity matrix for parity/alignment follow-ups, and optional blocker linkage instead of expanding scope.`,
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
      ...(source0PromptLines.length > 0 ? ['', ...source0PromptLines] : []),
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
    `- When you discover a meaningful out-of-scope improvement, use \`${helperCommand} create-follow-up --issue-id ${issue.id} ...\` to file a same-project follow-up issue in \`Backlog\` with a clear title, description, intent checksum, non-goals, \`Not Done If\`, acceptance criteria, a \`related\` link, the required parity matrix for parity/alignment follow-ups, and optional blocker linkage instead of expanding scope.`,
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
    ...(source0PromptLines.length > 0 ? ['', ...source0PromptLines] : []),
    issue.url ? `- Linear URL: ${issue.url}` : null,
    issue.state ? `- Current state: ${issue.state}` : null,
    `- This is turn #1 of ${maxTurns} for the current worker run.`,
    ...buildIssueDescriptionSection(issue),
    ...buildRecentActivitySection(issue),
    ...buildBlockersSection(issue)
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

export function parseProviderLinearWorkerJsonl(raw: string): ProviderLinearWorkerJsonlParseResult {
  const state = buildEmptyProviderLinearWorkerJsonlParseResult();

  for (const line of raw.split(/\r?\n/u)) {
    applyProviderLinearWorkerJsonlLine(state, line);
  }

  return state;
}

function buildEmptyProviderLinearWorkerJsonlParseResult(): ProviderLinearWorkerJsonlParseResult {
  return {
    threadId: null,
    turnId: null,
    finalMessage: null,
    lastEvent: null,
    lastEventAt: null,
    currentTurnActivity: null,
    tokens: buildEmptyProviderLinearWorkerTokenUsage(),
    rateLimits: null
  };
}

function applyProviderLinearWorkerJsonlLine(
  state: ProviderLinearWorkerJsonlParseResult,
  line: string,
  activitySource: ProviderLinearWorkerCurrentTurnActivitySource = 'stdout_jsonl'
): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) {
    return false;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return applyProviderLinearWorkerJsonlRecord(state, parsed, activitySource);
  } catch {
    return false;
  }
}

function applyProviderLinearWorkerJsonlRecord(
  state: ProviderLinearWorkerJsonlParseResult,
  parsed: Record<string, unknown>,
  activitySource: ProviderLinearWorkerCurrentTurnActivitySource
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
  const eventSummary = extractProviderWorkerEventSummary(parsed);
  if (eventSummary.event && eventSummary.event !== state.lastEvent) {
    state.lastEvent = eventSummary.event;
    changed = true;
  }
  if (eventSummary.at && eventSummary.at !== state.lastEventAt) {
    state.lastEventAt = eventSummary.at;
    changed = true;
  }
  if (eventSummary.message && eventSummary.message !== state.finalMessage) {
    state.finalMessage = eventSummary.message;
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
    state.tokens = observedTokens;
    changed = true;
  }
  const observedRateLimits = extractProviderWorkerRateLimits(parsed);
  if (observedRateLimits) {
    state.rateLimits = observedRateLimits;
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

function applyProviderLinearWorkerSessionJsonlLine(
  state: ProviderLinearWorkerJsonlParseResult,
  line: string
): boolean {
  const parsed = parseProviderWorkerSessionJsonlLine(line);
  if (!parsed) {
    return false;
  }
  return applyProviderLinearWorkerSessionJsonlRecord(state, parsed);
}

function applyProviderLinearWorkerSessionJsonlRecord(
  state: ProviderLinearWorkerJsonlParseResult,
  parsed: Record<string, unknown>
): boolean {
  return applyProviderLinearWorkerJsonlRecord(state, parsed, 'session_log_hydration');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resetProviderLinearWorkerTurnScopedTelemetry(
  state: ProviderLinearWorkerJsonlParseResult
): void {
  state.lastEvent = null;
  state.finalMessage = null;
  state.lastEventAt = null;
  state.currentTurnActivity = null;
}

function isProviderLinearWorkerBookkeepingRecord(parsed: Record<string, unknown>): boolean {
  return parsed.type === 'session_meta' || parsed.type === 'turn_context' || parsed.type === 'thread.started';
}

function hasProviderWorkerTokenUsage(value: ProviderLinearWorkerTokenUsage): boolean {
  return value.input_tokens !== null || value.output_tokens !== null || value.total_tokens !== null;
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
  return {
    input_tokens: maxProviderWorkerNullableNumber(current.input_tokens, observed.input_tokens),
    output_tokens: maxProviderWorkerNullableNumber(current.output_tokens, observed.output_tokens),
    total_tokens: maxProviderWorkerNullableNumber(current.total_tokens, observed.total_tokens)
  };
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
  return normalizeOptionalString(payload?.turn_id);
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
  const normalizedTotalTokens =
    totalTokens ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
  if (inputTokens === null && outputTokens === null && normalizedTotalTokens === null) {
    return null;
  }
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: normalizedTotalTokens
  };
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
      return status ? `turn completed (${status})` : 'turn completed';
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
    proof_signature: typeof value.proof_signature === 'string' ? value.proof_signature : ''
  };
}

function buildProviderWorkerSessionLogTailState(
  path: string,
  hydrationState: ProviderWorkerSessionLogHydrationState | null
): ProviderWorkerSessionLogTailState {
  if (!hydrationState || hydrationState.path !== path) {
    return {
      path,
      offsetBytes: 0,
      trailingText: '',
      bootstrapPending: true
    };
  }
  return {
    path,
    offsetBytes: hydrationState.offset_bytes,
    trailingText: hydrationState.trailing_text,
    bootstrapPending: hydrationState.bootstrap_pending
  };
}

function snapshotProviderWorkerSessionLogTailState(
  state: ProviderWorkerSessionLogTailState
): ProviderWorkerSessionLogHydrationState | null {
  if (!state.path) {
    return null;
  }
  return {
    path: state.path,
    offset_bytes: state.offsetBytes,
    trailing_text: state.trailingText,
    bootstrap_pending: state.bootstrapPending,
    proof_signature: ''
  };
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
    rate_limits: proof.rate_limits ?? null
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

function selectProviderWorkerSessionBootstrapLines(
  lines: string[],
  options: {
    requireTurnContext: boolean;
  } = { requireTurnContext: false }
): string[] {
  let latestSessionMetaIndex = -1;
  let latestTurnContextIndex = -1;
  let latestTurnId: string | null = null;
  let latestTurnCompleted = false;
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
    }
    if (parsed.type === 'event_msg' && isRecord(parsed.payload) && parsed.payload.type === 'task_complete') {
      const completedTurnId = normalizeOptionalString(parsed.payload.turn_id);
      if (
        latestTurnContextIndex >= 0 &&
        (!latestTurnId || !completedTurnId || completedTurnId === latestTurnId)
      ) {
        latestTurnCompleted = true;
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
    return latestSessionMetaIndex >= 0 ? [lines[latestSessionMetaIndex] ?? ''] : [];
  }
  const bootstrapLines =
    latestSessionMetaIndex >= 0 && latestSessionMetaIndex < latestTurnContextIndex
      ? [lines[latestSessionMetaIndex] ?? '']
      : [];
  return [...bootstrapLines, ...lines.slice(latestTurnContextIndex)];
}

function applyProviderWorkerSessionLogDelta(
  parseState: ProviderLinearWorkerJsonlParseResult,
  tailState: ProviderWorkerSessionLogTailState,
  chunk: string
): boolean {
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
      ? selectProviderWorkerSessionBootstrapLines(lines, { requireTurnContext })
      : lines;
  let changed = false;
  for (const line of linesToApply) {
    changed = applyProviderLinearWorkerSessionJsonlLine(parseState, line) || changed;
  }
  if (tailState.bootstrapPending && lines.length > 0) {
    tailState.bootstrapPending = requireTurnContext && parseState.turnId === null;
  }
  return changed;
}

function flushProviderWorkerSessionLogTail(
  parseState: ProviderLinearWorkerJsonlParseResult,
  tailState: ProviderWorkerSessionLogTailState
): boolean {
  const trailingLine = tailState.trailingText.trim();
  if (!trailingLine) {
    tailState.trailingText = '';
    return false;
  }
  if (!parseProviderWorkerSessionJsonlLine(trailingLine)) {
    return false;
  }
  tailState.trailingText = '';
  const shouldBootstrap = tailState.bootstrapPending;
  const requireTurnContext = shouldBootstrap && parseState.turnId === null;
  const trailingLines = shouldBootstrap
    ? selectProviderWorkerSessionBootstrapLines([trailingLine], { requireTurnContext })
    : [trailingLine];
  let changed = false;
  for (const line of trailingLines) {
    changed = applyProviderLinearWorkerSessionJsonlLine(parseState, line) || changed;
  }
  if (shouldBootstrap) {
    tailState.bootstrapPending = requireTurnContext && parseState.turnId === null;
  }
  return changed;
}

function normalizeProviderLinearWorkerProofForUpdatedAtComparison(
  proof: ProviderLinearWorkerProof
): Record<string, unknown> {
  return {
    ...proof,
    parallelization: proof.parallelization ?? null,
    progress: null,
    updated_at: null
  };
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
    turn_count: proof.turn_count,
    last_event: proof.last_event ?? null,
    last_message: proof.last_message ?? null,
    last_event_at: proof.last_event_at ?? null,
    current_turn_activity: selectProviderLinearWorkerCurrentTurnActivity(proof) ?? null,
    tokens: proof.tokens,
    rate_limits: proof.rate_limits ?? null,
    owner_phase: proof.owner_phase,
    owner_status: proof.owner_status,
    tracked_issue_error: proof.tracked_issue_error ?? null,
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
  return {
    ...snapshot,
    child_lane_count: selectCurrentTurnChildLanes(input.childLanes, boundary).length
  };
}

function buildProviderLinearWorkerTurnBootstrapProof(
  proof: ProviderLinearWorkerProof,
  turnCount: number,
  updatedAt: string
): ProviderLinearWorkerProof {
  return {
    ...proof,
    current_turn_started_at: updatedAt,
    latest_turn_id: null,
    latest_session_id: null,
    latest_session_id_source: null,
    last_event: null,
    last_message: null,
    last_event_at: null,
    current_turn_activity: null,
    tokens: buildEmptyProviderLinearWorkerTokenUsage(),
    rate_limits: null,
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
    (childLane) => childLane.status === 'succeeded'
  );
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
  const currentTurnParallelizationDecisions = readProviderLinearParallelizationSnapshots(
    input.proof.linear_audit,
    {
      issueId: input.proof.issue_id
    }
  ).slice(input.parallelizationDecisionCountBeforeTurn);
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
      input.proof.current_turn_started_at
    )) {
      return null;
    }
    return {
      endReason: 'parallelization_serial_conflict',
      message:
        `provider-linear-worker recorded \`${parallelization.decision}\` for the current turn, but same-issue child lanes were still launched during that turn.`
    };
  }
  if (hasCurrentTurnSuccessfulChildLaneLaunch(
    input.proof.child_lanes,
    input.proof.current_turn_started_at
  )) {
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
    JSON.stringify(normalizeProviderLinearWorkerProofForUpdatedAtComparison(currentProof)) !==
    JSON.stringify(normalizeProviderLinearWorkerProofForUpdatedAtComparison(nextProof))
  );
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
  const parseState: ProviderLinearWorkerJsonlParseResult = {
    threadId: proof.thread_id,
    turnId: proof.latest_turn_id,
    lastEvent: proof.last_event,
    finalMessage: proof.last_message,
    lastEventAt: proof.last_event_at,
    currentTurnActivity: proofCurrentTurnActivity,
    tokens: proof.tokens ?? buildEmptyProviderLinearWorkerTokenUsage(),
    rateLimits: proof.rate_limits
  };
  const restoreProofTelemetryFloor = () => {
    parseState.threadId = proof.thread_id;
    parseState.turnId = proof.latest_turn_id;
    parseState.lastEvent = proof.last_event;
    parseState.finalMessage = proof.last_message;
    parseState.lastEventAt = proof.last_event_at;
    parseState.currentTurnActivity = proofCurrentTurnActivity;
  };
  let tailState = buildProviderWorkerSessionLogTailState(sessionLogPath, hydrationState);
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
          bootstrapPending: true
        };
      } else if (fileStat.size < tailState.offsetBytes) {
        tailState = {
          path: sessionLogPath,
          offsetBytes: 0,
          trailingText: '',
          bootstrapPending: true
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
  try {
    const delta = await readProviderWorkerSessionLogDelta(tailState);
    if (delta) {
      applyProviderWorkerSessionLogDelta(parseState, tailState, delta);
    }
    flushProviderWorkerSessionLogTail(parseState, tailState);
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
  const hydratedProof: ProviderLinearWorkerProof = {
    ...proof,
    thread_id: liveThreadId,
    latest_turn_id: liveTurnId,
    latest_session_id: session.sessionId,
    latest_session_id_source: session.source,
    last_event: parseState.lastEvent ?? null,
    last_message: parseState.finalMessage ?? null,
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
      : parseState.rateLimits ?? (liveTurnChanged ? null : proof.rate_limits)
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
  let raw: string;
  try {
    raw = await readFile(buildChildLanesPath(runDir), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return [];
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
  return normalized as ProviderLinearWorkerChildLaneRecord[];
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
    purpose,
    instructions: normalizeOptionalString(value.instructions),
    scope,
    parent_snapshot: parentSnapshot,
    lane_workspace_path: normalizeOptionalString(value.lane_workspace_path),
    patch_artifact_path: normalizeOptionalString(value.patch_artifact_path),
    patch_bytes: normalizeOptionalInteger(value.patch_bytes),
    decision,
    in_flight_action: inFlightAction,
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
  try {
    const manifestTarget = await resolveProviderControlHostManifestPath(
      input.currentManifestPath,
      input.env,
      input.manifest
    );
    if (!manifestTarget) {
      return;
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
      const responseBody = await response.text();
      if (response.status !== 202) {
        const responseDetail = responseBody.trim();
        throw new Error(
          responseDetail
            ? `refresh request failed with status ${response.status}: ${responseDetail}`
            : `refresh request failed with status ${response.status}`
        );
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    if (input.abortSignal?.aborted === true) {
      return;
    }
    const message = (error as Error)?.name === 'AbortError'
      ? 'refresh request timeout'
      : (error as Error)?.message ?? String(error);
    input.log.warn(
      `provider-linear-worker could not request control-host refresh for ${input.proof.issue_identifier}: ${message}`
    );
  }
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
    const childLanes = await readProviderLinearWorkerChildLanes(runDir);
    const proofWithHydratedSources = {
      ...proof,
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
    const childLanes = await readProviderLinearWorkerChildLanes(runDir);
    const proofWithHydratedSources: ProviderLinearWorkerProof = {
      ...parsed,
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
    const proofWithSessionTelemetryResult = await hydrateProviderLinearWorkerProofFromSessionLog(
      proofWithHydratedSources,
      env,
      priorHydrationState
    );
    const proofWithSessionTelemetry = proofWithSessionTelemetryResult.proof;
    const hydratedWithoutUpdatedAt: ProviderLinearWorkerProof = {
      ...proofWithSessionTelemetry,
      progress: deriveProviderLinearWorkerProgressSnapshot({
        proof: proofWithSessionTelemetry,
        now
      })
    };
    const hydrated: ProviderLinearWorkerProof = {
      ...hydratedWithoutUpdatedAt,
      updated_at: shouldAdvanceProviderLinearWorkerProofUpdatedAt(
        parsed,
        hydratedWithoutUpdatedAt,
        options.updatedAtComparisonScope ?? 'full'
      )
        ? now()
        : parsed.updated_at ?? null
    };
    await writeProof(proofPath, hydrated);
    await writeProviderWorkerSessionLogHydrationState(runDir, proofWithSessionTelemetryResult.hydrationState);
    return hydrated;
  });
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
  const auditPath = resolve(context.runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME);
  const workerPid = String(process.pid);
  childEnv[PROVIDER_LINEAR_AUDIT_ENV_VAR] = auditPath;
  const helperCommand = resolveProviderLinearHelperCommand(childEnv);
  if (shouldForceNonInteractive(childEnv)) {
    childEnv.CODEX_REVIEW_NON_INTERACTIVE = '1';
    childEnv.FORCE_CODEX_REVIEW = '1';
    childEnv.CODEX_NON_INTERACTIVE = '1';
    childEnv.CODEX_NO_INTERACTIVE = '1';
    childEnv.CODEX_INTERACTIVE = '0';
  }

  const attemptStartedAt = deps.now();
  let finalProof: ProviderLinearWorkerProof = {
    issue_id: context.issueId,
    issue_identifier: context.issueIdentifier,
    attempt_started_at: attemptStartedAt,
    current_turn_started_at: null,
    pid: workerPid,
    thread_id: null,
    latest_turn_id: null,
    latest_session_id: null,
    latest_session_id_source: null,
    turn_count: 0,
    last_event: null,
    last_message: null,
    last_event_at: null,
    current_turn_activity: null,
    tokens: buildEmptyProviderLinearWorkerTokenUsage(),
    rate_limits: null,
    owner_phase: 'bootstrapping',
    owner_status: 'in_progress',
    workspace_path: context.workspacePath,
    source_setup: context.sourceSetup,
    linear_audit: null,
    child_streams: [],
    child_lanes: [],
    parallelization: null,
    progress: null,
    tracked_issue_error: null,
    linear_budget: null,
    end_reason: null,
    updated_at: attemptStartedAt
  };
  let lastProgressSignature: string | null = null;

  const emitSemanticProgressIfChanged = (proof: ProviderLinearWorkerProof): void => {
    const progress = proof.progress ?? null;
    const signature = progress ? JSON.stringify(progress) : null;
    if (!signature || signature === lastProgressSignature) {
      return;
    }
    lastProgressSignature = signature;
    deps.log.info(
      `[provider-linear-worker-progress] ${JSON.stringify({
        issue_id: proof.issue_id,
        issue_identifier: proof.issue_identifier,
        progress
      })}`
    );
  };

  const persistProof = async (nextProof: ProviderLinearWorkerProof): Promise<ProviderLinearWorkerProof> => {
    const hydratedProof = await writeProofSnapshot(deps, context.runDir, auditPath, nextProof, childEnv);
    emitSemanticProgressIfChanged(hydratedProof);
    await requestProviderControlHostRefresh({
      currentManifestPath: context.manifestPath,
      env,
      manifest: context.manifest,
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
  let threadId: string | null = null;
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
            currentManifestPath: context.manifestPath,
            env,
            manifest: context.manifest,
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
          currentManifestPath: context.manifestPath,
          env,
          manifest: context.manifest,
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
              const hydratedProof = await writeProofSnapshot(
                deps,
                context.runDir,
                auditPath,
                {
                  ...finalProof,
                  updated_at: deps.now()
                },
                childEnv
              );
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
          turn_count: turnNumber,
          last_event: liveParseState.lastEvent ?? (liveScopeChanged ? null : finalProof.last_event),
          last_message:
            liveParseState.finalMessage ?? (liveScopeChanged ? null : finalProof.last_message),
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
          turn_count: nextProof.turn_count,
          last_event: nextProof.last_event,
          last_message: nextProof.last_message,
          last_event_at: nextProof.last_event_at,
          current_turn_activity: nextProof.current_turn_activity ?? null,
          tokens: nextProof.tokens,
          rate_limits: nextProof.rate_limits,
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
            const hydratedProof = await writeProofSnapshot(deps, context.runDir, auditPath, nextProof, childEnv);
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
          changed = applyProviderLinearWorkerJsonlLine(liveParseState, line) || changed;
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
        if (applyProviderLinearWorkerJsonlLine(liveParseState, trailingLine)) {
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
      const prompt = buildProviderWorkerPrompt(
        issue,
        turnNumber,
        context.maxTurns,
        helperCommand,
        sharedRepoCheckoutPath,
        {
          linearAudit: finalProof.linear_audit,
          attemptStartedAt: finalProof.attempt_started_at ?? null,
          manifest: context.manifest
        }
      );
      const args =
        turnNumber === 1
          ? ['exec', '--json', prompt]
          : ['exec', 'resume', '--json', threadId ?? '', prompt];
      const resolved = resolveRuntimeCodexCommand(args, runtimeContext);
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
      const parallelizationDecisionCountBeforeTurn = readProviderLinearParallelizationSnapshots(
        finalProof.linear_audit,
        {
          issueId: finalProof.issue_id
        }
      ).length;
      finalProof = await writeProofSnapshot(
        deps,
        context.runDir,
        auditPath,
        buildProviderLinearWorkerTurnBootstrapProof(finalProof, turnNumber, turnStartedAt),
        childEnv
      );
      emitSemanticProgressIfChanged(finalProof);
      const liveSessionTailState: ProviderWorkerSessionLogTailState | null =
        runtimeContext.runtime.selected_mode === 'appserver'
          ? {
              path: null,
              offsetBytes: 0,
              trailingText: '',
              bootstrapPending: true
            }
          : null;
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
                  if (delta && applyProviderWorkerSessionLogDelta(liveParseState, liveSessionTailState, delta)) {
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
              if (liveSessionTailState.path !== null && flushProviderWorkerSessionLogTail(liveParseState, liveSessionTailState)) {
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
        execResult = await deps.execRunner({
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
              last_event: previousTurnProof.last_event,
              last_message: previousTurnProof.last_message,
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
        finalProof = {
          ...failedProofBase,
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: classifyExecRunnerFailure(error, {
            cwd: context.repoRoot
          }),
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
      const parsed = parseProviderLinearWorkerJsonl(execResult.stdout);
      threadId = parsed.threadId ?? finalProof.thread_id ?? threadId;
      const parsedThreadChanged = Boolean(threadId && threadId !== finalProof.thread_id);
      turnId = parsed.turnId ?? (parsedThreadChanged ? null : finalProof.latest_turn_id ?? turnId);
      const parsedTurnChanged = Boolean(turnId && turnId !== finalProof.latest_turn_id);
      const parsedScopeChanged = parsedThreadChanged || parsedTurnChanged;
      const session = deriveLatestTurnSessionId({ threadId, turnId });

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
        turn_count: turnNumber,
        last_event: parsed.lastEvent ?? (parsedScopeChanged ? null : finalProof.last_event),
        last_message: parsed.finalMessage ?? (parsedScopeChanged ? null : finalProof.last_message),
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
        owner_phase: execResult.exitCode === 0 ? 'turn_completed' : 'turn_failed',
        owner_status: execResult.exitCode === 0 ? 'in_progress' : 'failed',
        workspace_path: context.workspacePath,
        source_setup: context.sourceSetup,
        linear_audit: finalProof.linear_audit,
        child_streams: finalProof.child_streams,
        child_lanes: finalProof.child_lanes,
        parallelization: finalProof.parallelization ?? null,
        progress: finalProof.progress ?? null,
        tracked_issue_error: null,
        end_reason: null,
        updated_at: deps.now()
      };
      finalProof = await persistProof(finalProof);

      if (execResult.exitCode !== 0) {
        finalProof = {
          ...finalProof,
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: `codex_exit_${execResult.exitCode ?? 'unknown'}`,
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
