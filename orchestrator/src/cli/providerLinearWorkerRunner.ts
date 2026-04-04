import { spawn, type StdioOptions } from 'node:child_process';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { mkdir, readFile, realpath } from 'node:fs/promises';

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
  summarizeProviderLinearAuditPath,
  type ProviderLinearAuditSummary
} from './control/providerLinearWorkflowAudit.js';
import { deriveDeterministicProviderMutationSuppressions } from './control/providerLinearWorkerTruth.js';
import type { DispatchPilotSourceSetup } from './control/trackerDispatchPilot.js';
import {
  PROVIDER_WORKSPACE_ROOT_DIRNAME,
  resolveProviderWorkspacePath
} from './run/workspacePath.js';
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

export const PROVIDER_LINEAR_WORKER_PROOF_FILENAME = 'provider-linear-worker-proof.json';
export const PROVIDER_LINEAR_WORKER_AUDIT_FILENAME = 'provider-linear-worker-linear-audit.jsonl';
export const PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME = 'provider-linear-worker-child-streams.json';
export const PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME = 'provider-linear-worker-child-lanes.json';
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
  pid: string | null;
  thread_id: string | null;
  latest_turn_id: string | null;
  latest_session_id: string | null;
  latest_session_id_source: 'derived_from_thread_and_turn' | null;
  turn_count: number;
  last_event: string | null;
  last_message: string | null;
  last_event_at: string | null;
  tokens: ProviderLinearWorkerTokenUsage;
  rate_limits: Record<string, unknown> | null;
  owner_phase: string;
  owner_status: 'in_progress' | 'succeeded' | 'failed';
  workspace_path: string | null;
  source_setup?: DispatchPilotSourceSetup | null;
  linear_audit: ProviderLinearAuditSummary | null;
  child_streams?: ProviderLinearWorkerChildStreamRecord[];
  child_lanes?: ProviderLinearWorkerChildLaneRecord[];
  linear_budget?: LinearBudgetStatus | null;
  tracked_issue_error?: ProviderLinearTrackedIssueError | null;
  end_reason: string | null;
  updated_at: string;
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

interface ProviderControlHostManifestTarget {
  currentRun: ProviderWorkerRunLocation;
  manifestPath: string;
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
  return `- For app-touching lanes, inspect permit posture with \`${helperCommand} runtime-proof --issue-id ${issueId} --origin <app-url> --format json\`, then generate reviewer-usable handoff content with \`${helperCommand} runtime-proof --issue-id ${issueId} --origin <app-url> --kind <screenshot|external-link|video> --proof-url <reviewer-url> --title <label> --summary <what changed> --format json\`; add \`--reachability-mode dns-public\` only when you need explicit worker-local DNS public-resolution evidence. The default path stays deterministic and the helper fails closed when the permit disallows the origin or proof kind, when the proof URL is loopback/local-only, or when dns-public lookup yields non-public or unresolved answers. When the issue explicitly requires screenshot proof embedded directly in Linear instead of an external reviewer URL, place the screenshot in the workpad body as markdown image syntax pointing at a local file (for example \`![Proof screenshot](file:///absolute/path/to/proof.png)\`; use \`![Proof screenshot](<file:///absolute/path/to/proof (1).png>)\` when the path contains spaces or parentheses) and refresh the workpad with \`${helperCommand} upsert-workpad --issue-id ${issueId} --body-file <workpad.md>\`; the helper uploads supported local image refs to Linear and rewrites them to Linear-hosted asset URLs before the comment mutation lands.`;
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
  } = {}
): string {
  const deterministicMutationSuppressions = buildDeterministicMutationSuppressionSection(
    attemptContext.linearAudit ?? null,
    attemptContext.attemptStartedAt ?? null
  );
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
    tokens: buildEmptyProviderLinearWorkerTokenUsage(),
    rateLimits: null
  };
}

function applyProviderLinearWorkerJsonlLine(
  state: ProviderLinearWorkerJsonlParseResult,
  line: string
): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) {
    return false;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return applyProviderLinearWorkerJsonlRecord(state, parsed);
  } catch {
    return false;
  }
}

function applyProviderLinearWorkerJsonlRecord(
  state: ProviderLinearWorkerJsonlParseResult,
  parsed: Record<string, unknown>
): boolean {
  let changed = false;
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
  if (parsed.type === 'thread.started' && typeof parsed.thread_id === 'string') {
    if (parsed.thread_id !== state.threadId) {
      state.threadId = parsed.thread_id;
      changed = true;
    }
    return changed;
  }
  if (parsed.type === 'turn_context' && isRecord(parsed.payload)) {
    const nextTurnId = normalizeOptionalString(parsed.payload.turn_id);
    if (nextTurnId && nextTurnId !== state.turnId) {
      state.turnId = nextTurnId;
      changed = true;
    }
    return changed;
  }
  if (parsed.type === 'event_msg' && isRecord(parsed.payload)) {
    if (parsed.payload.type === 'task_complete') {
      const nextTurnId = normalizeOptionalString(parsed.payload.turn_id);
      if (nextTurnId && nextTurnId !== state.turnId) {
        state.turnId = nextTurnId;
        changed = true;
      }
    }
    if (parsed.payload.type === 'agent_message') {
      const nextMessage = normalizeOptionalString(parsed.payload.message);
      if (nextMessage && nextMessage !== state.finalMessage) {
        state.finalMessage = nextMessage;
        changed = true;
      }
    }
    return changed;
  }
  if (
    parsed.type === 'response_item' &&
    isRecord(parsed.payload) &&
    parsed.payload.type === 'message' &&
    Array.isArray(parsed.payload.content)
  ) {
    for (const item of parsed.payload.content) {
      if (
        isRecord(item) &&
        item.type === 'output_text' &&
        typeof item.text === 'string' &&
        item.text !== state.finalMessage
      ) {
        state.finalMessage = item.text;
        changed = true;
      }
    }
  }
  return changed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasProviderWorkerTokenUsage(value: ProviderLinearWorkerTokenUsage): boolean {
  return value.input_tokens !== null || value.output_tokens !== null || value.total_tokens !== null;
}

function extractProviderWorkerEventSummary(input: Record<string, unknown>): {
  event: string | null;
  message: string | null;
  at: string | null;
} {
  const timestamp =
    normalizeOptionalString(input.timestamp) ??
    (isRecord(input.payload)
      ? normalizeOptionalString(input.payload.timestamp) ??
        normalizeOptionalString(input.payload.created_at) ??
        normalizeOptionalString(input.payload.at)
      : null);
  if (input.type === 'event_msg' && isRecord(input.payload)) {
    return {
      event: normalizeOptionalString(input.payload.type),
      message: normalizeOptionalString(input.payload.message),
      at: timestamp
    };
  }
  if (
    input.type === 'response_item' &&
    isRecord(input.payload) &&
    input.payload.type === 'message' &&
    Array.isArray(input.payload.content)
  ) {
    let outputText: string | null = null;
    for (const item of input.payload.content) {
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
  return {
    event: normalizeOptionalString(input.type),
    message: null,
    at: timestamp
  };
}

function extractProviderWorkerTokenUsage(input: unknown): ProviderLinearWorkerTokenUsage | null {
  if (!isRecord(input)) {
    return null;
  }

  const directTotalUsage = findRecordAtPaths(input, [
    ['params', 'msg', 'payload', 'info', 'total_token_usage'],
    ['params', 'msg', 'info', 'total_token_usage'],
    ['params', 'tokenUsage', 'total'],
    ['tokenUsage', 'total']
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
  return findRateLimitsRecord(input);
}

function findRateLimitsRecord(input: unknown): Record<string, unknown> | null {
  if (Array.isArray(input)) {
    for (const item of input) {
      const nested = findRateLimitsRecord(item);
      if (nested) {
        return nested;
      }
    }
    return null;
  }
  if (!isRecord(input)) {
    return null;
  }
  if (isProviderWorkerRateLimitsRecord(input)) {
    return input;
  }
  for (const value of Object.values(input)) {
    const nested = findRateLimitsRecord(value);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function isProviderWorkerRateLimitsRecord(input: Record<string, unknown>): boolean {
  const limitId =
    normalizeOptionalString(input.limit_id) ??
    normalizeOptionalString(input.limit_name);
  const hasBucket =
    Object.prototype.hasOwnProperty.call(input, 'primary') ||
    Object.prototype.hasOwnProperty.call(input, 'secondary') ||
    Object.prototype.hasOwnProperty.call(input, 'credits');
  return Boolean(limitId) && hasBucket;
}

function findRecordAtPaths(
  input: Record<string, unknown>,
  paths: string[][]
): Record<string, unknown> | null {
  for (const path of paths) {
    let current: unknown = input;
    let found = true;
    for (const segment of path) {
      if (!isRecord(current)) {
        found = false;
        break;
      }
      current = current[segment];
    }
    if (found && isRecord(current)) {
      return current;
    }
  }
  return null;
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
    launched_at: launchedAt
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
    const hydratedProof = {
      ...proof,
      linear_audit: await summarizeProviderLinearAuditPath(auditPath),
      child_streams: await readProviderLinearWorkerChildStreams(runDir),
      child_lanes: await readProviderLinearWorkerChildLanes(runDir),
      linear_budget: linearBudget
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
  env: NodeJS.ProcessEnv = process.env
): Promise<ProviderLinearWorkerProof | null> {
  return await withProviderLinearWorkerProofLock(runDir, async () => {
    const proofPath = buildProofPath(runDir);
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
    const hydrated: ProviderLinearWorkerProof = {
      ...parsed,
      linear_audit: auditPath ? await summarizeProviderLinearAuditPath(auditPath) : parsed.linear_audit ?? null,
      child_streams: await readProviderLinearWorkerChildStreams(runDir),
      child_lanes: await readProviderLinearWorkerChildLanes(runDir),
      linear_budget: linearBudget,
      updated_at: now()
    };
    await writeProof(proofPath, hydrated);
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
    pid: workerPid,
    thread_id: null,
    latest_turn_id: null,
    latest_session_id: null,
    latest_session_id_source: null,
    turn_count: 0,
    last_event: null,
    last_message: null,
    last_event_at: null,
    tokens: buildEmptyProviderLinearWorkerTokenUsage(),
    rate_limits: null,
    owner_phase: 'bootstrapping',
    owner_status: 'in_progress',
    workspace_path: context.workspacePath,
    source_setup: context.sourceSetup,
    linear_audit: null,
    child_streams: [],
    child_lanes: [],
    tracked_issue_error: null,
    linear_budget: null,
    end_reason: null,
    updated_at: attemptStartedAt
  };

  const persistProof = async (nextProof: ProviderLinearWorkerProof): Promise<ProviderLinearWorkerProof> => {
    const hydratedProof = await writeProofSnapshot(deps, context.runDir, auditPath, nextProof, childEnv);
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
  let liveRefreshClosed = false;
  let liveProofWrite: Promise<void> = Promise.resolve();

  const cancelLiveRefreshState = async (): Promise<void> => {
    liveRefreshClosed = true;
    liveRefreshPending = false;
    if (liveRefreshTimer !== null) {
      clearTimeout(liveRefreshTimer);
      liveRefreshTimer = null;
    }
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
      const queueLiveProofWrite = (): void => {
        const liveThreadId = liveParseState.threadId ?? threadId;
        const liveTurnId = liveParseState.turnId;
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
          last_event: liveParseState.lastEvent ?? finalProof.last_event,
          last_message: liveParseState.finalMessage ?? finalProof.last_message,
          last_event_at: liveParseState.lastEventAt ?? finalProof.last_event_at,
          tokens: hasProviderWorkerTokenUsage(liveParseState.tokens) ? liveParseState.tokens : finalProof.tokens,
          rate_limits: liveParseState.rateLimits ?? finalProof.rate_limits,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
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
          tokens: nextProof.tokens,
          rate_limits: nextProof.rate_limits,
          owner_phase: nextProof.owner_phase
        });
        if (signature === liveProofSignature) {
          return;
        }
        liveProofSignature = signature;
        finalProof = nextProof;
        liveProofWrite = liveProofWrite
          .then(async () => {
            const hydratedProof = await writeProofSnapshot(deps, context.runDir, auditPath, nextProof, childEnv);
            finalProof = hydratedProof;
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
              proof: hydratedProof,
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
          attemptStartedAt: finalProof.attempt_started_at ?? null
        }
      );
      const args =
        turnNumber === 1
          ? ['exec', '--json', prompt]
          : ['exec', 'resume', '--json', threadId ?? '', prompt];
      const resolved = resolveRuntimeCodexCommand(args, runtimeContext);
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
        finalProof = {
          ...finalProof,
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: 'exec_runner_failed',
          updated_at: deps.now()
        };
        finalProof = await persistProof(finalProof);
        throw error instanceof Error ? error : new Error(String(error));
      }
      flushLiveStdoutTail();
      await liveProofWrite;
      const parsed = parseProviderLinearWorkerJsonl(execResult.stdout);
      threadId = parsed.threadId ?? threadId;
      turnId = parsed.turnId ?? turnId;
      const session = deriveLatestTurnSessionId({ threadId, turnId });

      finalProof = {
        issue_id: context.issueId,
        issue_identifier: context.issueIdentifier,
        attempt_started_at: finalProof.attempt_started_at,
        pid: workerPid,
        thread_id: threadId,
        latest_turn_id: turnId,
        latest_session_id: session.sessionId,
        latest_session_id_source: session.source,
        turn_count: turnNumber,
        last_event: parsed.lastEvent ?? finalProof.last_event,
        last_message: parsed.finalMessage ?? finalProof.last_message,
        last_event_at: parsed.lastEventAt ?? finalProof.last_event_at,
        tokens: hasProviderWorkerTokenUsage(parsed.tokens) ? parsed.tokens : finalProof.tokens,
        rate_limits: parsed.rateLimits ?? finalProof.rate_limits,
        owner_phase: execResult.exitCode === 0 ? 'turn_completed' : 'turn_failed',
        owner_status: execResult.exitCode === 0 ? 'in_progress' : 'failed',
        workspace_path: context.workspacePath,
        source_setup: context.sourceSetup,
        linear_audit: finalProof.linear_audit,
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

function resolveProviderLinearHelperCommand(env: NodeJS.ProcessEnv): string {
  const packageRoot = normalizeOptionalString(env.CODEX_ORCHESTRATOR_PACKAGE_ROOT);
  if (!packageRoot) {
    return 'codex-orchestrator linear';
  }
  return `node "${join(packageRoot, 'dist', 'bin', 'codex-orchestrator.js')}" linear`;
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
