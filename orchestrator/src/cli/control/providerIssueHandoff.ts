import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';

import { logger } from '../../logger.js';
import {
  PROVIDER_LINEAR_RESIDENT_SESSION_CONTINUITY_END_REASONS,
  PROVIDER_SEMANTIC_STALL_RECHECK_DELAY_MS,
  PROVIDER_LINEAR_WORKER_AUDIT_FILENAME,
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  type ProviderLinearResidentSessionSeed
} from '../providerLinearWorkerRunner.js';
import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import { stripNonApplicableGuardrailSummaryLines } from '../run/manifest.js';
import {
  cleanupProviderWorkspace,
  resolveExplicitProviderWorkspacePathWithinRoot,
  resolveProviderWorkspacePath
} from '../run/workspacePath.js';
import {
  isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned,
  sortLiveLinearTrackedIssuesForDispatch,
  type LiveLinearTrackedBlocker,
  type LiveLinearTrackedIssue,
  type LiveLinearTrackedIssuesQueryMode
} from './linearDispatchSource.js';
import { resolveLinearWebhookSourceSetup } from './linearWebhookController.js';
import { resolveLinearApiTokenFingerprint } from './linearGraphqlClient.js';
import {
  classifyProviderLinearWorkflowState,
  isProviderLinearTrackedIssueMutable,
  isProviderLinearTrackedIssueEligibleForExecution,
  normalizeProviderLinearWorkflowState,
  providerLinearTodoBlockedByNonTerminal
} from './providerLinearWorkflowStates.js';
import { resolveProviderPollDispatchLimits } from './providerAgentCapacity.js';
import { callChildControlEndpoint } from './questionChildResolutionAdapter.js';
import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';
import {
  buildProviderFallbackTaskId,
  buildProviderIssueKey,
  hasQueuedProviderIntakeRetry,
  isTerminalProviderIntakeIssueState,
  markProviderIntakeRehydrated,
  readProviderIntakeClaim,
  type ProviderLaunchSource,
  type ProviderIntakeClaimRecord,
  type ProviderIntakeClaimState,
  type ProviderIntakeState,
  type ProviderTaskMappingSource,
  upsertProviderIntakeClaim
} from './providerIntakeState.js';
import { createProviderIssueRetryQueue } from './providerIssueRetryQueue.js';
import {
  isProviderPollingStuck,
  markProviderPollingCompleted,
  markProviderPollingStarted,
  readProviderPollingHealth,
  recordProviderPollingProgress
} from './providerPollingHealth.js';
import {
  normalizeControlHostOwnershipPollingPayload,
  refreshControlHostOwnershipPollingPayload,
  resolveControlHostAuthoritativeSourceFreshness,
  resolveControlHostSourceFreshnessPolicyFromPolling
} from './controlHostOwnership.js';
import type { ProviderWorkflowConfigStore } from './providerWorkflowConfigStore.js';
import {
  cloneProviderWorkerHostConfigs,
  findProviderWorkerHost,
  normalizeProviderWorkerHostName,
  selectProviderWorkerHost
} from './providerWorkerHosts.js';
import {
  appendProviderOperatorAutopilotAuditResult,
  areProviderOperatorAutopilotResultsMeaningfullyEqual,
  resolveEffectiveLocalRolloutActions,
  resolveProviderOperatorAutopilotConfig,
  runProviderOperatorAutopilot,
  type ProviderOperatorAutopilotConfig,
  type ProviderOperatorAutopilotResult
} from './providerOperatorAutopilot.js';
import {
  appendProviderOperatorAutopilotLifecycleRecord,
  readProviderOperatorAutopilotLifecycleRecords,
  resolveProviderOperatorAutopilotLifecyclePath,
  type ProviderOperatorAutopilotLifecycleRecord
} from './providerOperatorAutopilotLifecycle.js';
import {
  appendProviderOperatorAutopilotLocalRolloutExecutionRecord,
  cloneLocalRolloutExecutionAttempt,
  readProviderOperatorAutopilotLocalRolloutExecutionRecords,
  resolveProviderOperatorAutopilotLocalRolloutExecutionPath,
  type ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
} from './providerOperatorAutopilotLocalRolloutExecution.js';
import {
  runProviderTerminalCleanup,
  type ProviderTerminalCleanupConfig
} from './providerTerminalCleanup.js';
import { PROVIDER_LINEAR_AUDIT_ENV_VAR } from './providerLinearWorkflowAudit.js';
import { isProviderLinearWorkerProofFreshForStage } from './providerLinearWorkerTruth.js';
import type {
  ProviderMergeCloseoutRecord,
  ProviderReviewHandoffPromotionRecord
} from './providerMergeCloseout.js';

export type ProviderWorkflowFallbackDecision =
  | 'remove fallback'
  | 'expire fallback'
  | 'justify retaining fallback';

export interface ProviderWorkflowFallbackExpiryRecord {
  id:
    | 'provider-id-mapping-fallback'
    | 'retained-claim-autopilot-fallback'
    | 'stale-manifestless-recovery-seam';
  surface: 'provider workflow';
  fallback:
    | 'provider-id mapping fallback'
    | 'retained-claim/autopilot fallback'
    | 'stale manifestless recovery seam';
  decision: ProviderWorkflowFallbackDecision;
  owner: string;
  trigger: string;
  introduced_date: string;
  review_date: string;
  maximum_lifetime: string;
  removal_condition: string;
  validation: string[];
  large_refactor: 'required' | 'not_required';
}

const PROVIDER_WORKFLOW_FALLBACK_EXPIRY_RECORDS: readonly ProviderWorkflowFallbackExpiryRecord[] = [
  {
    id: 'provider-id-mapping-fallback',
    surface: 'provider workflow',
    fallback: 'provider-id mapping fallback',
    decision: 'expire fallback',
    owner: 'CO-400',
    trigger:
      'Provider issue handoff derives task identity with buildProviderFallbackTaskId and persists mapping_source=provider_id_fallback when no canonical provider task mapping exists.',
    introduced_date: '2026-03-19',
    review_date: '2026-05-10',
    maximum_lifetime: '2026-05-26',
    removal_condition:
      'Remove after provider issue current-state authority owns canonical task identity for fresh starts, retries, and rehydrated claims without relying on provider-id fallback mapping.',
    validation: [
      'ProviderIssueHandoff.test.ts records bounded expiry metadata for provider workflow fallback paths',
      'Existing ProviderIssueHandoff.test.ts provider_issue_start_launched coverage keeps provider-id fallback activation observable'
    ],
    large_refactor: 'required'
  },
  {
    id: 'retained-claim-autopilot-fallback',
    surface: 'provider workflow',
    fallback: 'retained-claim/autopilot fallback',
    decision: 'expire fallback',
    owner: 'CO-400',
    trigger:
      'Active claim refresh, retained released claims, and autopilot recovery fall back to cached claim issue state or retained run proof when fresh Linear state is unavailable or inconclusive.',
    introduced_date: '2026-03-20',
    review_date: '2026-05-10',
    maximum_lifetime: '2026-05-26',
    removal_condition:
      'Remove after provider issue current-state authority resolves retained claim, autopilot, fresh Linear, and run-manifest state through one authoritative decision path.',
    validation: [
      'ProviderIssueHandoff.test.ts records bounded expiry metadata for provider workflow fallback paths',
      'Existing ProviderIssueHandoff.test.ts retained released claim coverage validates activation and non-activation paths'
    ],
    large_refactor: 'required'
  },
  {
    id: 'stale-manifestless-recovery-seam',
    surface: 'provider workflow',
    fallback: 'stale manifestless recovery seam',
    decision: 'justify retaining fallback',
    owner: 'CO-474',
    trigger:
      'Explicit control-host recovery sees a starting/resuming claim, or an accepted provider_issue_rehydration_pending_revalidation claim, older than PROVIDER_MANIFESTLESS_HANDOFF_RECOVERY_STALE_MS with null run_id and null run_manifest_path.',
    introduced_date: '2026-05-02',
    review_date: '2026-05-16',
    maximum_lifetime: '14 days (until 2026-05-16)',
    removal_condition:
      'Remove after provider launch persistence can no longer leave starting/resuming or accepted pending-revalidation claims without run identity or a durable retry/failure record.',
    validation: [
      'ProviderIssueHandoff.test.ts reclaims Ready accepted/no-run pending-revalidation through explicit recovery',
      'ProviderIssueHandoff.test.ts keeps fresh manifestless starts inflight and relaunches only stale manifestless starts',
      'ProviderIssueHandoff.test.ts binds stale manifestless recovery to an existing queued same-issue run without carrying launch tokens'
    ],
    large_refactor: 'not_required'
  }
];

export function readProviderWorkflowFallbackExpiryRecords(): ProviderWorkflowFallbackExpiryRecord[] {
  return PROVIDER_WORKFLOW_FALLBACK_EXPIRY_RECORDS.map((record) => ({
    ...record,
    validation: [...record.validation]
  }));
}

export interface ProviderIssueLauncher {
  start(input: {
    taskId: string;
    pipelineId: string;
    provider: 'linear';
    issueId: string;
    issueIdentifier: string;
    issueUpdatedAt: string | null;
    workerHost?: string | null;
    workspaceId?: string | null;
    teamId?: string | null;
    projectId?: string | null;
    residentSessionSeed?: ProviderLinearResidentSessionSeed | null;
    launchToken: string;
  }): Promise<{ runId: string; manifestPath: string } | null>;
  resume(input: {
    runId: string;
    actor: string;
    reason: string;
    workerHost?: string | null;
    launchToken: string;
  }): Promise<void>;
}

export interface ProviderIssueHandoffResult {
  kind: 'ignored' | 'start' | 'resume';
  reason: string;
  claim: ProviderIntakeClaimRecord;
}

export type ProviderIssueRecoveryAction = 'recover' | 'relaunch' | 'nudge';

export interface ProviderIssueHandoffRecoveryClaim {
  provider: 'linear';
  issue_id: string;
  issue_identifier: string | null;
  issue_state: string | null;
  issue_state_type: string | null;
  state: ProviderIntakeClaimRecord['state'];
  reason: string | null;
  task_id: string | null;
  run_id: string | null;
  run_manifest_path: string | null;
  worker_host: string | null;
  launch_source: ProviderIntakeClaimRecord['launch_source'];
  launch_token_present: boolean;
  updated_at: string | null;
}

export interface ProviderIssueHandoffRecoveryResult {
  provider: 'linear';
  issue_id: string;
  action: ProviderIssueRecoveryAction;
  kind: ProviderIssueHandoffResult['kind'] | 'released' | 'skipped';
  reason: string;
  details?: Record<string, unknown>;
  claim: ProviderIssueHandoffRecoveryClaim | null;
}

export type ProviderTrackedIssuePollResolution =
  | { kind: 'ready'; trackedIssues: LiveLinearTrackedIssue[] }
  | { kind: 'skip'; reason: string };

export interface ProviderTrackedIssueRefetchInput {
  mode?: LiveLinearTrackedIssuesQueryMode;
  eligibleTargetCount?: number;
  eligibleStateSlotCounts?: Record<string, number>;
  excludedIssueIds?: string[];
}

type ProviderTrackedIssueRefetch = (
  input?: ProviderTrackedIssueRefetchInput
) => Promise<ProviderTrackedIssuePollResolution>;

export interface ProviderIssueHandoffPollInput {
  trackedIssues: LiveLinearTrackedIssue[];
  refetchTrackedIssues?: ProviderTrackedIssueRefetch | null;
  deferFreshDiscovery?: boolean;
  allowPollFailClosed?: boolean;
}

interface ProviderIssueRunRecord {
  provider: 'linear';
  issueId: string;
  taskId: string;
  runId: string;
  manifestPath: string;
  manifest: Record<string, unknown>;
  pipelineId: string | null;
  status: string | null;
  hasDeadLocalInProgressProof: boolean;
  proofTerminalStatus: 'failed' | 'succeeded' | null;
  hasStaleInProgressProof: boolean;
  summary: string | null;
  failureDiagnosis: ProviderIssueRunFailureDiagnosisRecord | null;
  issueUpdatedAt: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  hasFreshWorkerHostContext: boolean;
  workerHostProofAttemptStartedAt: string | null;
  workerHostProofUpdatedAt: string | null;
  workerHost: string | null;
  residentSessionSeed: ProviderLinearResidentSessionSeed | null;
}

interface ProviderIssueRunFailureDiagnosisRecord {
  diagnosticCategory: string | null;
  signal: string | null;
  guidance: string | null;
}

interface ProviderUnreadableManifestAdmissionOccupancyRecord {
  provider: 'linear';
  issueId: string;
  manifestPath: string;
  workerHost: string | null;
}

interface ProviderIssueRunDiscoverySnapshot {
  discoveredRuns: ProviderIssueRunRecord[];
  unreadableAdmissionOccupancy: ProviderUnreadableManifestAdmissionOccupancyRecord[];
}

interface ProviderLinearWorkerProofRecord {
  issue_id?: unknown;
  issue_identifier?: unknown;
  attempt_started_at?: unknown;
  pid?: unknown;
  thread_id?: unknown;
  turn_count?: unknown;
  owner_phase?: unknown;
  owner_status?: unknown;
  end_reason?: unknown;
  failure_diagnosis?: unknown;
  updated_at?: unknown;
  worker_host?: unknown;
  resident_session?: unknown;
}

const PROVIDER_UNREADABLE_MANIFEST_LIVE_PROOF_TTL_MS =
  2 * PROVIDER_SEMANTIC_STALL_RECHECK_DELAY_MS;
const PROVIDER_BACKLOG_RELEASE_DIRECT_PROOF_READS_PER_REFRESH = 3;
const PROVIDER_BACKLOG_RELEASE_PASSIVE_PROOF_REVALIDATION_MS =
  PROVIDER_SEMANTIC_STALL_RECHECK_DELAY_MS;

function resolveRehydratedActiveRunWorkerHost(
  run: ProviderIssueRunRecord,
  claim:
    | Pick<
        ProviderIntakeClaimRecord,
        'launch_started_at' | 'run_id' | 'run_manifest_path' | 'worker_host'
      >
    | null
    | undefined
): string | null {
  const hasFreshWorkerHostContext =
    run.hasFreshWorkerHostContext
    && (
      !claim?.launch_started_at
      || isProviderLinearWorkerProofFreshForStage(
        {
          attempt_started_at: run.workerHostProofAttemptStartedAt,
          updated_at: run.workerHostProofUpdatedAt
        },
        claim.launch_started_at
      )
    );
  if (run.workerHost && hasFreshWorkerHostContext) {
    return run.workerHost;
  }
  if (hasFreshWorkerHostContext) {
    return null;
  }
  const claimWorkerHost = normalizeProviderWorkerHostName(claim?.worker_host);
  if (!claimWorkerHost) {
    return null;
  }
  return claim?.run_id === run.runId || claim?.run_manifest_path === run.manifestPath
    ? claimWorkerHost
    : null;
}

export interface ProviderIssueHandoffService {
  recoverIssue(input: {
    provider: 'linear';
    issueId: string;
    action: ProviderIssueRecoveryAction;
  }): Promise<ProviderIssueHandoffRecoveryResult>;
  handleAcceptedTrackedIssue(input: {
    trackedIssue: LiveLinearTrackedIssue;
    deliveryId: string | null;
    event: string | null;
    action: string | null;
    webhookTimestamp: number | null;
  }): Promise<ProviderIssueHandoffResult>;
  rehydrate(): Promise<void>;
  refresh(): Promise<void>;
  poll?(input: ProviderIssueHandoffPollInput): Promise<void>;
  resetStuckRefreshLifecycle?(): void;
}

export type ProviderTrackedIssueRefreshResolution =
  | { kind: 'ready'; trackedIssue: LiveLinearTrackedIssue }
  | { kind: 'release'; reason: string }
  | { kind: 'skip'; reason: string; details?: Record<string, unknown> };

export interface CreateProviderIssueHandoffServiceOptions {
  paths: Pick<RunPaths, 'runDir'> & { repoRoot: string };
  state: ProviderIntakeState;
  persist: () => Promise<void>;
  launcher: ProviderIssueLauncher;
  startPipelineId?: string;
  publishRuntime?: ((source: string) => void) | null;
  readFeatureToggles?: (() => Record<string, unknown> | null | undefined) | null;
  resolveTrackedIssue?: ((
    input: {
      provider: 'linear';
      issueId: string;
    }
  ) => Promise<ProviderTrackedIssueRefreshResolution>) | null;
  resolveRevalidationTrackedIssue?: ((
    input: {
      provider: 'linear';
      issueId: string;
    }
  ) => Promise<ProviderTrackedIssueRefreshResolution>) | null;
  resolveRecoveryTrackedIssue?: ((
    input: {
      provider: 'linear';
      issueId: string;
    }
  ) => Promise<ProviderTrackedIssueRefreshResolution>) | null;
  resolveTrackedIssues?: ProviderTrackedIssueRefetch | null;
  providerWorkflowConfigStore?: ProviderWorkflowConfigStore | null;
  runTerminalCleanup?: typeof runProviderTerminalCleanup;
  runReviewHandoffPromotion?: ((input: {
    issueId: string;
    issueIdentifier?: string | null;
    issueState?: string | null;
    issueStateType?: string | null;
    issueUpdatedAt?: string | null;
    blockedBy?: readonly LiveLinearTrackedBlocker[] | null;
    previousBranchRecovery?: ProviderReviewHandoffPromotionRecord['branch_recovery'] | null;
    sourceSetup?: DispatchPilotSourceSetup | null;
    repoRoot: string;
    env?: NodeJS.ProcessEnv;
  }) => Promise<ProviderReviewHandoffPromotionRecord>) | null;
  runMergeCloseout?: ((input: {
    issueId: string;
    issueIdentifier?: string | null;
    issueState?: string | null;
    issueStateType?: string | null;
    issueUpdatedAt?: string | null;
    mode?: 'full' | 'probe-merged-recovery';
    previousBranchRecovery?: ProviderMergeCloseoutRecord['branch_recovery'] | null;
    sourceSetup?: DispatchPilotSourceSetup | null;
    repoRoot: string;
    env?: NodeJS.ProcessEnv;
  }) => Promise<ProviderMergeCloseoutRecord>) | null;
  isProcessAlive?: ((pid: number) => boolean) | null;
  runOperatorAutopilot?: typeof runProviderOperatorAutopilot | null;
  appendOperatorAutopilotAuditResult?: typeof appendProviderOperatorAutopilotAuditResult;
}

const RESUME_ELIGIBLE_STATUSES = new Set(['failed', 'cancelled']);
const BEST_EFFORT_REHYDRATE_DELAY_MS = 1_000;
const BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS = 5;
const BEST_EFFORT_REHYDRATE_TIMEOUT_MS =
  BEST_EFFORT_REHYDRATE_DELAY_MS * BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS;
const PROVIDER_LAUNCH_SOURCE: ProviderLaunchSource = 'control-host';
const PROVIDER_STALE_SUPERVISED_SOURCE_REASON = 'stale_supervised_control_host_source';
const PROVIDER_RELEASED_PENDING_REOPEN_PREFIX = 'provider_issue_released_pending_reopen:';
const PROVIDER_POST_WORKER_EXIT_REFRESH_PENDING_REASON =
  'provider_issue_post_worker_exit_refresh_pending';
const PROVIDER_POST_WORKER_EXIT_START_LAUNCHED_REASON =
  'provider_issue_post_worker_exit_start_launched';
const PROVIDER_POST_WORKER_EXIT_START_FAILED_REASON =
  'provider_issue_post_worker_exit_start_failed';
const PROVIDER_RETRY_RESUME_LAUNCHED_REASON = 'provider_issue_retry_resume_launched';
const PROVIDER_RETRY_RESUME_FAILED_REASON = 'provider_issue_retry_resume_failed';
const PROVIDER_RETRY_START_LAUNCHED_REASON = 'provider_issue_retry_start_launched';
const PROVIDER_RETRY_START_FAILED_REASON = 'provider_issue_retry_start_failed';
const PROVIDER_CONTINUATION_RETRY_DELAY_MS = 1_000;
const PROVIDER_FAILURE_RETRY_BASE_MS = 10_000;
const PROVIDER_FAILURE_RETRY_MAX_BACKOFF_MS = 300_000;
const PROVIDER_MANIFESTLESS_HANDOFF_RECOVERY_STALE_MS = 45_000;
type ProviderControlHostRunLocator = { taskId: string; runId: string };
type ProviderRehydratedLaunchProvenanceFields = {
  launch_source?: ProviderLaunchSource | null;
  launch_token?: string | null;
};
type ProviderTrackedIssueEligibility =
  | {
      eligible: true;
      claimReason: 'provider_issue_handoff_owned' | null;
    }
  | {
      eligible: false;
      claimReason:
        | 'provider_issue_state_not_active'
        | 'provider_issue_todo_blocked_by_non_terminal'
        | 'provider_issue_not_mutable'
        | 'provider_issue_assignee_changed';
      releaseReason:
        | 'provider_issue_released:not_active'
        | 'provider_issue_released:todo_blocked_by_non_terminal'
        | 'provider_issue_released:not_mutable'
        | 'provider_issue_released:assignee_changed';
      cleanupWorkspace: boolean;
    };

type ProviderTrackedIssueRefreshDisposition =
  | { kind: 'ready'; trackedIssue: LiveLinearTrackedIssue }
  | { kind: 'owned'; trackedIssue: LiveLinearTrackedIssue }
  | {
      kind: 'release';
      reason: string;
      source?: 'direct_issue_by_id';
      trackedIssue: Pick<
        LiveLinearTrackedIssue,
        | 'identifier'
        | 'title'
        | 'state'
        | 'state_type'
        | 'updated_at'
        | 'archived_at'
        | 'trashed'
        | 'viewer_id'
        | 'assignee_id'
        | 'assignee_name'
        | 'blocked_by'
      > | null;
      cleanupWorkspace: boolean;
    }
  | { kind: 'skip'; reason: string };

export function createProviderIssueHandoffService(
  options: CreateProviderIssueHandoffServiceOptions
): ProviderIssueHandoffService {
  const startPipelineId = options.startPipelineId ?? 'diagnostics';
  const allowedRunRoots = [resolve(options.paths.runDir, '..', '..', '..')];
  const repoRoot = resolve(options.paths.repoRoot);
  const runTerminalCleanup = options.runTerminalCleanup ?? runProviderTerminalCleanup;
  const runReviewHandoffPromotion = options.runReviewHandoffPromotion ?? null;
  const runMergeCloseout = options.runMergeCloseout ?? null;
  const isProcessAlive = options.isProcessAlive ?? isLocalProcessAlive;
  const runOperatorAutopilot = options.runOperatorAutopilot ?? runProviderOperatorAutopilot;
  const appendOperatorAutopilotAuditResult =
    options.appendOperatorAutopilotAuditResult ?? appendProviderOperatorAutopilotAuditResult;
  const controlHostRunLocator = resolveControlHostRunLocatorFromRunDir(options.paths.runDir);
  const retryQueue = createProviderIssueRetryQueue();
  const releaseCancelInFlight = new Map<
    string,
    {
      attempt: Promise<boolean>;
      retryRequested: boolean;
      retryConsumed: boolean;
    }
  >();
  let refreshLifecycleChain: Promise<void> = Promise.resolve();
  let refreshLifecycleEpoch = 0;
  let bestEffortRehydrateTimer: NodeJS.Timeout | null = null;
  const queuedRetryTrackedIssueRefetches = new Map<string, ProviderTrackedIssueRefetch>();
  const refreshLifecycleScope = new AsyncLocalStorage<{ epoch: number } | null>();
  const providerStatePersistedSnapshotObserverScope =
    new AsyncLocalStorage<((snapshot: ProviderStateSnapshot) => void) | null>();
  const providerIssueRunDiscoveryScope = new AsyncLocalStorage<{
    snapshot: Promise<ProviderIssueRunDiscoverySnapshot> | null;
  }>();
  const configuredWorkerHostsScope = new AsyncLocalStorage<{
    workerHosts: ReturnType<typeof cloneProviderWorkerHostConfigs> | null;
  } | null>();
  const serviceCreatedAtMs = Date.now();
  let providerIssueHandoffService: ProviderIssueHandoffService | null = null;
  let concurrentRestartRequiredSnapshotCutoff:
    | {
        pollingUpdatedAtMs: number;
        effectiveUpdatedAtMs: number;
      }
    | null = null;

  const isStaleRefreshLifecycleOperation = (): boolean => {
    const lifecycleScope = refreshLifecycleScope.getStore();
    return Boolean(lifecycleScope && lifecycleScope.epoch !== refreshLifecycleEpoch);
  };
  const resolveProviderHandoffSourceFreshnessPolicy = () => {
    const liveControlHostOwner =
      readProviderPollingHealth(providerIssueHandoffService)?.control_host_owner ??
      null;
    if (liveControlHostOwner) {
      const refreshedLiveOwner = refreshControlHostOwnershipPollingPayload(
        normalizeControlHostOwnershipPollingPayload(liveControlHostOwner)
      );
      const livePolicy = resolveControlHostSourceFreshnessPolicyFromPolling(
        refreshedLiveOwner,
        { refresh: false }
      );
      const liveFreshness = resolveControlHostAuthoritativeSourceFreshness(refreshedLiveOwner);
      if (livePolicy || isAuthoritativeProviderHandoffLiveControlHostFreshness(liveFreshness)) {
        return livePolicy;
      }
    }
    return resolveControlHostSourceFreshnessPolicyFromPolling(
      options.state.polling?.control_host_owner
    );
  };
  const isAuthoritativeProviderHandoffLiveControlHostFreshness = (
    freshness: ReturnType<typeof resolveControlHostAuthoritativeSourceFreshness>
  ): boolean =>
    freshness?.status === 'current' ||
    (freshness?.status === 'warning' && freshness.drift_classes.length > 0);
  const resolveProviderHandoffSourceFreshnessAbortReason = (): string | null =>
    resolveProviderHandoffSourceFreshnessPolicy()
      ? PROVIDER_STALE_SUPERVISED_SOURCE_REASON
      : null;
  const resolveRefreshCycleAbortReason = (): string | null => {
    if (isStaleRefreshLifecycleOperation()) {
      return 'provider_refresh_lifecycle_stuck';
    }
    const sourceFreshnessAbortReason = resolveProviderHandoffSourceFreshnessAbortReason();
    if (sourceFreshnessAbortReason) {
      return sourceFreshnessAbortReason;
    }
    if (
      hasConcurrentRestartRequiredPollingSnapshot() ||
      (providerIssueHandoffService !== null && isProviderPollingStuck(providerIssueHandoffService))
    ) {
      return 'provider_refresh_lifecycle_stuck';
    }
    return null;
  };
  const shouldAbortRefreshCycle = (): boolean => resolveRefreshCycleAbortReason() !== null;
  const buildRefreshLifecycleStuckError = (
    message = 'provider_refresh_lifecycle_stuck'
  ): Error => {
    const error = new Error(message);
    error.name = 'ProviderRefreshLifecycleStuckError';
    return error;
  };
  const throwRefreshLifecycleStuckError = (
    message = 'provider_refresh_lifecycle_stuck'
  ): never => {
    const error = buildRefreshLifecycleStuckError(message);
    throw error;
  };
  const assertRefreshLifecycleCurrent = (): void => {
    if (isStaleRefreshLifecycleOperation()) {
      throwRefreshLifecycleStuckError();
    }
  };
  const isRefreshLifecycleStuckError = (error: unknown): boolean =>
    error instanceof Error &&
    (
      error.name === 'ProviderRefreshLifecycleStuckError' ||
      error.message === 'provider_refresh_lifecycle_stuck'
    );
  const rethrowRefreshLifecycleStuckError = (error: unknown): void => {
    if (isRefreshLifecycleStuckError(error)) {
      throw error;
    }
  };
  const assertRefreshCycleNotStuck = (): void => {
    const abortReason = resolveRefreshCycleAbortReason();
    if (abortReason) {
      throwRefreshLifecycleStuckError(abortReason);
    }
  };
  const assertProviderHandoffSourceFreshnessTrusted = (): void => {
    const abortReason = resolveProviderHandoffSourceFreshnessAbortReason();
    if (abortReason) {
      throwRefreshLifecycleStuckError(abortReason);
    }
  };
  const buildRefreshCycleStuckSkipResolution = (): { kind: 'skip'; reason: string } => ({
    kind: 'skip',
    reason: resolveRefreshCycleAbortReason() ?? 'provider_refresh_lifecycle_stuck'
  });
  const resolveTrackedIssue = options.resolveTrackedIssue;
  const resolveRevalidationTrackedIssue = options.resolveRevalidationTrackedIssue ?? resolveTrackedIssue;
  const resolveRecoveryTrackedIssue = options.resolveRecoveryTrackedIssue ?? resolveTrackedIssue;
  const resolveTrackedIssueWhenNotStuck =
    !resolveTrackedIssue
      ? null
      : async (
          input: Parameters<NonNullable<CreateProviderIssueHandoffServiceOptions['resolveTrackedIssue']>>[0]
        ): Promise<ProviderTrackedIssueRefreshResolution> => {
          if (shouldAbortRefreshCycle()) {
            return buildRefreshCycleStuckSkipResolution();
          }
          const resolution = await resolveTrackedIssue(input);
          assertRefreshLifecycleCurrent();
          return resolution;
        };
  const resolveRecoveryTrackedIssueWhenNotStuck =
    !resolveRecoveryTrackedIssue
      ? null
      : async (
          input: Parameters<NonNullable<CreateProviderIssueHandoffServiceOptions['resolveTrackedIssue']>>[0]
        ): Promise<ProviderTrackedIssueRefreshResolution> => {
          if (shouldAbortRefreshCycle()) {
            return buildRefreshCycleStuckSkipResolution();
          }
          const resolution = await resolveRecoveryTrackedIssue(input);
          assertRefreshLifecycleCurrent();
          return resolution;
        };
  const resolveRevalidationTrackedIssueWhenNotStuck =
    !resolveRevalidationTrackedIssue
      ? null
      : async (
          input: Parameters<NonNullable<CreateProviderIssueHandoffServiceOptions['resolveTrackedIssue']>>[0]
        ): Promise<ProviderTrackedIssueRefreshResolution> => {
          if (shouldAbortRefreshCycle()) {
            return buildRefreshCycleStuckSkipResolution();
          }
          const resolution = await resolveRevalidationTrackedIssue(input);
          assertRefreshLifecycleCurrent();
          return resolution;
        };
  const wrapTrackedIssueRefetch = (
    trackedIssueRefetch: ProviderTrackedIssueRefetch | null | undefined
  ): ProviderTrackedIssueRefetch | null =>
    !trackedIssueRefetch
      ? null
      : async (input) => {
          if (shouldAbortRefreshCycle()) {
            return buildRefreshCycleStuckSkipResolution();
          }
          const resolution = await trackedIssueRefetch(input);
          assertRefreshLifecycleCurrent();
          return resolution;
        };

  const runWithRefreshLifecycleLock = async <T>(operation: () => Promise<T>): Promise<T> => {
    const lifecycleScope = refreshLifecycleScope.getStore();
    if (lifecycleScope) {
      assertRefreshLifecycleCurrent();
      const nestedResult = await operation();
      assertRefreshLifecycleCurrent();
      return nestedResult;
    }
    const operationEpoch = refreshLifecycleEpoch;
    const runOperation = (): Promise<T> =>
      refreshLifecycleScope.run({ epoch: operationEpoch }, async () => {
        if (operationEpoch !== refreshLifecycleEpoch) {
          throwRefreshLifecycleStuckError();
        }
        const result = await operation();
        if (operationEpoch !== refreshLifecycleEpoch) {
          throwRefreshLifecycleStuckError();
        }
        return result;
      });
    const nextOperation = refreshLifecycleChain.then(
      () => runOperation(),
      () => runOperation()
    );
    refreshLifecycleChain = nextOperation.then(
      () => undefined,
      () => undefined
    );
    return nextOperation;
  };

  const resetStuckRefreshLifecycle = (): void => {
    refreshLifecycleEpoch += 1;
    refreshLifecycleChain = Promise.resolve();
    resetProviderIssueRunDiscoveryCache();
  };

  const resetProviderIssueRunDiscoveryCache = (): void => {
    const scope = providerIssueRunDiscoveryScope.getStore();
    if (scope) {
      scope.snapshot = null;
    }
  };

  const discoverProviderIssueRunsForCurrentOperation = async (input?: {
    provider: 'linear';
    issueId: string;
  }): Promise<ProviderIssueRunRecord[]> => {
    const scope = providerIssueRunDiscoveryScope.getStore();
    if (!scope) {
      return await discoverProviderIssueRuns(
        options.paths.runDir,
        input
          ? {
              ...input,
              isProcessAlive
            }
          : {
              isProcessAlive
            }
      );
    }
    scope.snapshot ??= discoverProviderIssueRunSnapshot(options.paths.runDir, {
      isProcessAlive
    });
    const discoveredRuns = (await scope.snapshot).discoveredRuns;
    if (!input) {
      return discoveredRuns;
    }
    return discoveredRuns.filter(
      (run) => run.provider === input.provider && run.issueId === input.issueId
    );
  };

  const discoverUnreadableProviderAdmissionOccupancyForCurrentOperation = async (): Promise<
    ProviderUnreadableManifestAdmissionOccupancyRecord[]
  > => {
    const scope = providerIssueRunDiscoveryScope.getStore();
    if (!scope) {
      return (
        await discoverProviderIssueRunSnapshot(options.paths.runDir, {
          isProcessAlive
        })
      ).unreadableAdmissionOccupancy;
    }
    scope.snapshot ??= discoverProviderIssueRunSnapshot(options.paths.runDir, {
      isProcessAlive
    });
    return (await scope.snapshot).unreadableAdmissionOccupancy;
  };

  const runWithProviderIssueRunDiscoveryCache = async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    if (providerIssueRunDiscoveryScope.getStore()) {
      return await operation();
    }
    return await providerIssueRunDiscoveryScope.run({ snapshot: null }, operation);
  };

  const runWithFreshProviderIssueRunDiscoveryCache = async <T>(
    operation: () => Promise<T>
  ): Promise<T> =>
    await providerIssueRunDiscoveryScope.run({ snapshot: null }, operation);

  const runOutsideRefreshLifecycleScope = async <T>(
    operation: () => Promise<T>
  ): Promise<T> => await refreshLifecycleScope.run(null, operation);

  const startProviderWorkerWhenCurrent = async (
    input: Parameters<ProviderIssueLauncher['start']>[0]
  ): Promise<Awaited<ReturnType<ProviderIssueLauncher['start']>>> => {
    assertRefreshLifecycleCurrent();
    assertProviderHandoffSourceFreshnessTrusted();
    const result = await options.launcher.start(input);
    assertRefreshLifecycleCurrent();
    assertProviderHandoffSourceFreshnessTrusted();
    return result;
  };

  const resumeProviderWorkerWhenCurrent = async (
    input: Parameters<ProviderIssueLauncher['resume']>[0]
  ): Promise<void> => {
    assertRefreshLifecycleCurrent();
    assertProviderHandoffSourceFreshnessTrusted();
    await options.launcher.resume(input);
    assertRefreshLifecycleCurrent();
    assertProviderHandoffSourceFreshnessTrusted();
  };

  type ProviderStateSnapshot = {
    schema_version: number;
    updated_at: string;
    rehydrated_at: string | null;
    latest_provider_key: string | null;
    latest_reason: string | null;
    polling: Record<string, unknown> | null | undefined;
    claims: ProviderIntakeClaimRecord[];
  };

  type ProviderStatePersistOptions = {
    rollbackOnPersistFailure?: boolean;
  };

  const cloneProviderPollingSnapshot = (
    polling: ProviderStateSnapshot['polling']
  ): ProviderStateSnapshot['polling'] => (polling ? { ...polling } : polling);

  const readProviderPollingSnapshotUpdatedAtMs = (
    polling: ProviderStateSnapshot['polling']
  ): number | null => {
    const updatedAt =
      polling && typeof polling.updated_at === 'string' ? Date.parse(polling.updated_at) : Number.NaN;
    return Number.isFinite(updatedAt) ? updatedAt : null;
  };

  const pickRestoredProviderPollingSnapshot = (
    snapshotPolling: ProviderStateSnapshot['polling'],
    currentPolling: ProviderStateSnapshot['polling']
  ): ProviderStateSnapshot['polling'] => {
    const snapshotUpdatedAtMs = readProviderPollingSnapshotUpdatedAtMs(snapshotPolling);
    const currentUpdatedAtMs = readProviderPollingSnapshotUpdatedAtMs(currentPolling);
    if (
      currentUpdatedAtMs !== null &&
      (snapshotUpdatedAtMs === null || currentUpdatedAtMs >= snapshotUpdatedAtMs)
    ) {
      return cloneProviderPollingSnapshot(currentPolling);
    }
    return cloneProviderPollingSnapshot(snapshotPolling);
  };

  const isRestartRequiredPollingSnapshot = (
    polling: ProviderStateSnapshot['polling']
  ): boolean =>
    Boolean(
      polling &&
        (
          polling.restart_required === true ||
          polling.stuck === true
        )
    );

  const readConcurrentRestartRequiredSnapshotCutoffMs = (liveNowMs: number): number | null => {
    const pollingUpdatedAtMs = readProviderPollingSnapshotUpdatedAtMs(options.state.polling);
    if (pollingUpdatedAtMs === null) {
      concurrentRestartRequiredSnapshotCutoff = null;
      return null;
    }
    if (
      concurrentRestartRequiredSnapshotCutoff &&
      concurrentRestartRequiredSnapshotCutoff.pollingUpdatedAtMs === pollingUpdatedAtMs
    ) {
      return concurrentRestartRequiredSnapshotCutoff.effectiveUpdatedAtMs;
    }
    if (pollingUpdatedAtMs <= liveNowMs) {
      concurrentRestartRequiredSnapshotCutoff = {
        pollingUpdatedAtMs,
        effectiveUpdatedAtMs: pollingUpdatedAtMs
      };
      return pollingUpdatedAtMs;
    }
    const effectiveUpdatedAtMs = liveNowMs;
    concurrentRestartRequiredSnapshotCutoff = {
      pollingUpdatedAtMs,
      effectiveUpdatedAtMs
    };
    return effectiveUpdatedAtMs;
  };

  const hasConcurrentRestartRequiredPollingSnapshot = (): boolean => {
    if (!isRestartRequiredPollingSnapshot(options.state.polling)) {
      concurrentRestartRequiredSnapshotCutoff = null;
      return false;
    }
    const pollingUpdatedAtMs = readProviderPollingSnapshotUpdatedAtMs(options.state.polling);
    if (pollingUpdatedAtMs === null || pollingUpdatedAtMs < serviceCreatedAtMs) {
      concurrentRestartRequiredSnapshotCutoff = null;
      return false;
    }
    const liveNowMs = Date.now();
    const effectivePollingUpdatedAtMs = readConcurrentRestartRequiredSnapshotCutoffMs(liveNowMs);
    if (effectivePollingUpdatedAtMs === null) {
      return false;
    }
    const liveHealth = providerIssueHandoffService
      ? readProviderPollingHealth(providerIssueHandoffService, liveNowMs)
      : null;
    const liveOperationStartedAtMs =
      liveHealth?.checking && typeof liveHealth.operation_started_at === 'string'
        ? Date.parse(liveHealth.operation_started_at)
        : Number.NaN;
    // A fresh retry may start before the persisted polling snapshot catches up.
    // Clamp future-skewed persisted timestamps to the first live-time observation and once a
    // newer (or same-tick) operation is active, do not let the older restart_required snapshot
    // fail-close it again while the stale persisted snapshot is still in flight.
    if (
      Number.isFinite(liveOperationStartedAtMs) &&
      liveOperationStartedAtMs >= effectivePollingUpdatedAtMs
    ) {
      return false;
    }
    return true;
  };

  const pickRestoredProviderStateUpdatedAt = (
    snapshotUpdatedAt: string,
    polling: ProviderStateSnapshot['polling']
  ): string => {
    const snapshotUpdatedAtMs = Date.parse(snapshotUpdatedAt);
    const pollingUpdatedAtMs = readProviderPollingSnapshotUpdatedAtMs(polling);
    if (
      pollingUpdatedAtMs !== null &&
      (!Number.isFinite(snapshotUpdatedAtMs) || pollingUpdatedAtMs > snapshotUpdatedAtMs) &&
      polling &&
      typeof polling.updated_at === 'string'
    ) {
      return polling.updated_at;
    }
    return snapshotUpdatedAt;
  };

  const captureProviderStateSnapshot = (): ProviderStateSnapshot => ({
    schema_version: options.state.schema_version,
    updated_at: options.state.updated_at,
    rehydrated_at: options.state.rehydrated_at,
    latest_provider_key: options.state.latest_provider_key,
    latest_reason: options.state.latest_reason,
    polling: cloneProviderPollingSnapshot(options.state.polling),
    claims: options.state.claims.map((claim) => ({ ...claim }))
  });

  const areProviderMutationSnapshotsEqual = (
    left: ProviderStateSnapshot,
    right: ProviderStateSnapshot
  ): boolean =>
    left.schema_version === right.schema_version &&
    left.rehydrated_at === right.rehydrated_at &&
    left.latest_provider_key === right.latest_provider_key &&
    left.latest_reason === right.latest_reason &&
    JSON.stringify(left.claims) === JSON.stringify(right.claims);

  const restoreProviderStateSnapshot = (snapshot: ProviderStateSnapshot): void => {
    const restoredPolling = pickRestoredProviderPollingSnapshot(snapshot.polling, options.state.polling);
    options.state.schema_version = snapshot.schema_version;
    options.state.updated_at = pickRestoredProviderStateUpdatedAt(snapshot.updated_at, restoredPolling);
    options.state.rehydrated_at = snapshot.rehydrated_at;
    options.state.latest_provider_key = snapshot.latest_provider_key;
    options.state.latest_reason = snapshot.latest_reason;
    options.state.polling = restoredPolling;
    options.state.claims = snapshot.claims.map((claim) => ({ ...claim }));
    rebuildRetryQueue();
  };

  const recordProviderStatePersistedSnapshot = (): void => {
    providerStatePersistedSnapshotObserverScope.getStore()?.(captureProviderStateSnapshot());
  };

  const persistStateOrRollback = async (
    snapshot: ProviderStateSnapshot,
    persistOptions: ProviderStatePersistOptions = {}
  ): Promise<void> => {
    const inFlightMutationSnapshot = captureProviderStateSnapshot();
    let persistCompleted = false;
    try {
      assertRefreshLifecycleCurrent();
      await options.persist();
      persistCompleted = true;
      recordProviderStatePersistedSnapshot();
      assertRefreshLifecycleCurrent();
      rebuildRetryQueue();
    } catch (error) {
      const isLifecycleStuckError = isRefreshLifecycleStuckError(error);
      const stillOwnsInFlightMutation = areProviderMutationSnapshotsEqual(
        captureProviderStateSnapshot(),
        inFlightMutationSnapshot
      );
      const shouldRollback =
        persistOptions.rollbackOnPersistFailure !== false ||
        isLifecycleStuckError;
      if (shouldRollback && stillOwnsInFlightMutation) {
        restoreProviderStateSnapshot(snapshot);
        if (isLifecycleStuckError && persistCompleted) {
          // Keep rehydrate's fallback snapshot aligned even if rollback persist fails.
          recordProviderStatePersistedSnapshot();
          const rollbackMutationSnapshot = captureProviderStateSnapshot();
          try {
            await options.persist();
            if (areProviderMutationSnapshotsEqual(captureProviderStateSnapshot(), rollbackMutationSnapshot)) {
              recordProviderStatePersistedSnapshot();
            } else {
              // A replacement lifecycle advanced while the stale rollback write was in flight.
              // Persist the current replacement state so durable state does not stay clobbered.
              recordProviderStatePersistedSnapshot();
              try {
                await options.persist();
                recordProviderStatePersistedSnapshot();
              } catch (repairError) {
                logger.warn(
                  `[provider-intake] Failed to repair stale lifecycle rollback persist: ${
                    (repairError as Error)?.message ?? String(repairError)
                  }`
                );
              }
            }
          } catch (rollbackError) {
            logger.warn(
              `[provider-intake] Failed to persist stale lifecycle rollback: ${
                (rollbackError as Error)?.message ?? String(rollbackError)
              }`
            );
          }
          rebuildRetryQueue();
        }
      }
      throw error;
    }
  };

  const upsertProviderClaimAndPersist = async (
    input: Parameters<typeof upsertProviderIntakeClaim>[1],
    persistOptions: ProviderStatePersistOptions = {}
  ): Promise<ProviderIntakeClaimRecord> => {
    assertRefreshLifecycleCurrent();
    const snapshot = captureProviderStateSnapshot();
    const claim = upsertProviderIntakeClaim(options.state, input);
    await persistStateOrRollback(snapshot, persistOptions);
    return claim;
  };

  const resolveMergeCloseoutSourceSetup = (): DispatchPilotSourceSetup | null => {
    const readFeatureToggles = options.readFeatureToggles ?? null;
    if (!readFeatureToggles) {
      return null;
    }
    const resolution = resolveLinearWebhookSourceSetup(readFeatureToggles(), process.env);
    return 'sourceSetup' in resolution ? resolution.sourceSetup : null;
  };

  const maybeHandleDeterministicMergingCloseout = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    latestRun: ProviderIssueRunRecord | null;
  }): Promise<ProviderIntakeClaimRecord | null> => {
    if (!runMergeCloseout || normalizeProviderLinearWorkflowState(input.trackedIssue.state) !== 'merging') {
      return null;
    }
    const mergeCloseout = await runMergeCloseout({
      issueId: input.trackedIssue.id,
      issueIdentifier: input.trackedIssue.identifier,
      issueState: input.trackedIssue.state,
      issueStateType: input.trackedIssue.state_type,
      issueUpdatedAt: input.trackedIssue.updated_at,
      previousBranchRecovery: input.claim.merge_closeout?.branch_recovery ?? null,
      sourceSetup: resolveMergeCloseoutSourceSetup(),
      env: buildMergeCloseoutEnv(input.latestRun?.manifestPath ?? input.claim.run_manifest_path),
      repoRoot
    });
    if (mergeCloseout.reason === 'issue_no_longer_merging') {
      return null;
    }
    const claimState = resolveProviderMergeCloseoutClaimState(mergeCloseout);
    const workerHost = input.latestRun
      ? resolveRehydratedActiveRunWorkerHost(input.latestRun, input.claim)
      : input.claim.worker_host;
    return await upsertProviderClaimAndPersist({
      ...input.claim,
      issue_state: mergeCloseout.issue_state,
      issue_state_type: mergeCloseout.issue_state_type,
      issue_updated_at: mergeCloseout.issue_updated_at,
      state: claimState,
      reason: resolveProviderMergeCloseoutClaimReason(mergeCloseout),
      task_id: input.latestRun?.taskId ?? input.claim.task_id,
      run_id: input.latestRun?.runId ?? input.claim.run_id,
      run_manifest_path: input.latestRun?.manifestPath ?? input.claim.run_manifest_path,
      worker_host: workerHost,
      ...clearProviderRetryFields(),
      merge_closeout: mergeCloseout
    });
  };

  const maybeHandleReviewHandoffPromotion = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    latestRun: ProviderIssueRunRecord | null;
  }): Promise<ProviderIntakeClaimRecord | null> => {
    if (
      !runReviewHandoffPromotion ||
      !classifyProviderLinearWorkflowState(input.trackedIssue).isHandoff
    ) {
      return null;
    }
    const reviewPromotion = await runReviewHandoffPromotion({
      issueId: input.trackedIssue.id,
      issueIdentifier: input.trackedIssue.identifier,
      issueState: input.trackedIssue.state,
      issueStateType: input.trackedIssue.state_type,
      issueUpdatedAt: input.trackedIssue.updated_at,
      blockedBy: input.trackedIssue.blocked_by ?? null,
      previousBranchRecovery: input.claim.review_promotion?.branch_recovery ?? null,
      sourceSetup: resolveMergeCloseoutSourceSetup(),
      env: buildMergeCloseoutEnv(input.latestRun?.manifestPath ?? input.claim.run_manifest_path),
      repoRoot
    });
    if (reviewPromotion.reason === 'issue_no_longer_review_handoff') {
      const refreshedClaimIssueFields = {
        issue_identifier: reviewPromotion.issue_identifier ?? input.claim.issue_identifier,
        issue_state: reviewPromotion.issue_state ?? input.claim.issue_state,
        issue_state_type: reviewPromotion.issue_state_type ?? input.claim.issue_state_type,
        issue_updated_at: reviewPromotion.issue_updated_at ?? input.claim.issue_updated_at
      };
      const refreshedClaim = {
        ...input.claim,
        ...refreshedClaimIssueFields,
        review_promotion: null
      };
      const refreshedTrackedIssue = buildTrackedIssueSnapshotFromClaim(
        refreshedClaim,
        resolveProviderViewerAuthFingerprint()
      );
      const mergeCloseoutClaim =
        normalizeProviderLinearWorkflowState(refreshedTrackedIssue.state) === 'merging'
          ? await maybeHandleDeterministicMergingCloseout({
              claim: refreshedClaim,
              trackedIssue: refreshedTrackedIssue,
              latestRun: input.latestRun
            })
          : null;
      if (mergeCloseoutClaim) {
        return mergeCloseoutClaim;
      }
      const refreshedWorkflowState = classifyProviderLinearWorkflowState(refreshedTrackedIssue);
      const refreshedLifecycle = refreshedWorkflowState.isTerminal
        ? {
            state: 'ignored' as const,
            reason: 'provider_issue_state_not_active' as const,
            ...clearProviderRetryFields()
          }
        : {
            state: 'accepted' as const,
            reason: 'provider_issue_rehydration_pending_revalidation' as const,
            ...clearProviderRetryFields()
          };
      return await upsertProviderClaimAndPersist({
        ...refreshedClaim,
        task_id: input.latestRun?.taskId ?? input.claim.task_id,
        run_id: input.latestRun?.runId ?? input.claim.run_id,
        run_manifest_path: input.latestRun?.manifestPath ?? input.claim.run_manifest_path,
        merge_closeout: null,
        ...refreshedLifecycle
      });
    }
    const workerHost = input.latestRun
      ? resolveRehydratedActiveRunWorkerHost(input.latestRun, input.claim)
      : input.claim.worker_host;
    return await upsertProviderClaimAndPersist({
      ...input.claim,
      issue_state: reviewPromotion.issue_state,
      issue_state_type: reviewPromotion.issue_state_type,
      issue_updated_at: reviewPromotion.issue_updated_at,
      state: resolveProviderReviewPromotionClaimState(reviewPromotion),
      reason: resolveProviderReviewPromotionClaimReason(reviewPromotion),
      task_id: input.latestRun?.taskId ?? input.claim.task_id,
      run_id: input.latestRun?.runId ?? input.claim.run_id,
      run_manifest_path: input.latestRun?.manifestPath ?? input.claim.run_manifest_path,
      worker_host: workerHost,
      ...clearProviderRetryFields(),
      review_promotion: reviewPromotion,
      merge_closeout: null
    });
  };

  const buildMergeCloseoutEnv = (
    runManifestPath: string | null | undefined
  ): NodeJS.ProcessEnv => {
    if (typeof runManifestPath !== 'string' || runManifestPath.trim().length === 0) {
      return process.env;
    }
    return {
      ...process.env,
      [PROVIDER_LINEAR_AUDIT_ENV_VAR]: join(
        dirname(runManifestPath),
        PROVIDER_LINEAR_WORKER_AUDIT_FILENAME
      )
    };
  };

  const cacheConfiguredWorkerHosts = (
    workerHosts: ReturnType<typeof cloneProviderWorkerHostConfigs>
  ) => {
    const clonedWorkerHosts = cloneProviderWorkerHostConfigs(workerHosts);
    const scope = configuredWorkerHostsScope.getStore();
    if (scope) {
      scope.workerHosts = clonedWorkerHosts;
      return cloneProviderWorkerHostConfigs(scope.workerHosts);
    }
    return clonedWorkerHosts;
  };

  const resolveConfiguredWorkerHosts = async () => {
    const scope = configuredWorkerHostsScope.getStore();
    if (scope?.workerHosts) {
      return cloneProviderWorkerHostConfigs(scope.workerHosts);
    }
    if (options.providerWorkflowConfigStore) {
      try {
        await options.providerWorkflowConfigStore.refresh();
      } catch {
        return cacheConfiguredWorkerHosts(
          options.providerWorkflowConfigStore.snapshot().worker_hosts ?? []
        );
      }
    }
    return cacheConfiguredWorkerHosts(
      options.providerWorkflowConfigStore?.snapshot().worker_hosts ?? []
    );
  };

  const runWithConfiguredWorkerHostsCache = async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    if (configuredWorkerHostsScope.getStore()) {
      return await operation();
    }
    return await configuredWorkerHostsScope.run({ workerHosts: null }, operation);
  };
  const runOutsideConfiguredWorkerHostsScope = async <T>(
    operation: () => Promise<T>
  ): Promise<T> => await configuredWorkerHostsScope.run(null, operation);

  const resolveLocalWorkerOnlyForCurrentOperation = async (input: {
    preferredWorkerHost?: string | null;
  } = {}): Promise<boolean> => {
    if (normalizeProviderWorkerHostName(input.preferredWorkerHost ?? null)) {
      return false;
    }
    if (!options.providerWorkflowConfigStore) {
      return true;
    }
    try {
      return (await resolveConfiguredWorkerHosts()).length === 0;
    } catch {
      return cloneProviderWorkerHostConfigs(
        options.providerWorkflowConfigStore.snapshot().worker_hosts ?? []
      ).length === 0;
    }
  };

  const resolveResumeWorkerHost = async (preferredWorkerHost: string | null): Promise<string | null> => {
    const normalizedWorkerHost = normalizeProviderWorkerHostName(preferredWorkerHost);
    if (!normalizedWorkerHost) {
      return null;
    }
    if (!options.providerWorkflowConfigStore) {
      return normalizedWorkerHost;
    }
    return findProviderWorkerHost(
      await resolveConfiguredWorkerHosts(),
      normalizedWorkerHost
    )?.name ?? null;
  };

  const resolvePreferredStartWorkerHost = (input: {
    claimWorkerHost?: string | null;
    previousRun?: Pick<ProviderIssueRunRecord, 'hasFreshWorkerHostContext' | 'workerHost'> | null;
  }): string | null => {
    if (input.previousRun?.hasFreshWorkerHostContext === true) {
      return normalizeProviderWorkerHostName(input.previousRun.workerHost ?? null);
    }
    return (
      normalizeProviderWorkerHostName(input.previousRun?.workerHost ?? null) ??
      normalizeProviderWorkerHostName(input.claimWorkerHost ?? null)
    );
  };

  const buildWorkerHostSelectionClaims = async (): Promise<Array<{
    provider_key?: string | null;
    state?: string | null;
    worker_host?: string | null;
  }>> => {
    const occupancyClaims: Array<{
      provider_key?: string | null;
      state?: string | null;
      worker_host?: string | null;
    }> = [];
    const seededOccupancyKeys = new Set<string>();
    const activeDiscoveredRuns =
      (await discoverProviderIssueRunsForCurrentOperation()).filter((run) => run.status === 'in_progress');
    const activeRunsByProviderIssue = groupProviderIssueRuns(activeDiscoveredRuns);

    for (const claim of options.state.claims) {
      if (!shouldProviderClaimOccupyPollDispatchSlot(claim)) {
        continue;
      }
      const activeClaimRun =
        resolveProviderClaimRunIdentity(
          claim,
          activeRunsByProviderIssue.get(claim.provider_key) ?? []
        ) ??
        activeRunsByProviderIssue.get(claim.provider_key)?.[0] ??
        null;
      const occupancyKey = resolveProviderClaimAdmissionOccupancyKey(claim, activeClaimRun);
      if (!occupancyKey) {
        continue;
      }
      if (seededOccupancyKeys.has(occupancyKey)) {
        continue;
      }
      seededOccupancyKeys.add(occupancyKey);
      occupancyClaims.push({
        provider_key: claim.provider_key,
        state: claim.state,
        worker_host: activeClaimRun
          ? resolveRehydratedActiveRunWorkerHost(activeClaimRun, claim)
          : claim.worker_host
      });
    }

    for (const run of activeDiscoveredRuns) {
      const occupancyKey = run.manifestPath || run.runId;
      if (!occupancyKey || seededOccupancyKeys.has(occupancyKey)) {
        continue;
      }
      seededOccupancyKeys.add(occupancyKey);
      occupancyClaims.push({
        provider_key: buildProviderIssueKey(run.provider, run.issueId),
        state: 'running',
        worker_host: run.workerHost
      });
    }

    const unreadableAdmissionOccupancy =
      await discoverUnreadableProviderAdmissionOccupancyForCurrentOperation();
    for (const record of unreadableAdmissionOccupancy) {
      if (seededOccupancyKeys.has(record.manifestPath)) {
        continue;
      }
      seededOccupancyKeys.add(record.manifestPath);
      occupancyClaims.push({
        provider_key: buildProviderIssueKey(record.provider, record.issueId),
        state: 'running',
        worker_host: record.workerHost
      });
    }

    return occupancyClaims;
  };

  const selectLaunchWorkerHost = async (input: {
    claim: Pick<ProviderIntakeClaimRecord, 'provider_key'> & {
      worker_host?: string | null;
    };
    previousRun?: ProviderIssueRunRecord | null;
  }): Promise<string | null> => {
    const preferredHost = resolvePreferredStartWorkerHost({
      claimWorkerHost: input.claim.worker_host ?? null,
      previousRun: input.previousRun ?? null
    });
    const selection = selectProviderWorkerHost({
      hosts: await resolveConfiguredWorkerHosts(),
      claims: await buildWorkerHostSelectionClaims(),
      currentProviderKey: input.claim.provider_key,
      preferredHost
    });
    if (selection.kind === 'local') {
      return null;
    }
    if (selection.kind === 'exhausted') {
      throw new Error(
        'Configured provider worker hosts are at capacity; retry later or raise per-host max_concurrent_agents.'
      );
    }
    return selection.host.name;
  };

  const persistRecoveredActiveRunMergeCloseout = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    latestRun: ProviderIssueRunRecord;
    mergeCloseout: ProviderMergeCloseoutRecord;
  }): Promise<ProviderIntakeClaimRecord> => {
    const trackedIssueClaimFields = buildTrackedIssueClaimFields(input.trackedIssue);
    const workerHost = resolveRehydratedActiveRunWorkerHost(input.latestRun, input.claim);
    return await upsertProviderClaimAndPersist({
      ...input.claim,
      ...trackedIssueClaimFields,
      issue_state: input.mergeCloseout.issue_state ?? trackedIssueClaimFields.issue_state,
      issue_state_type:
        input.mergeCloseout.issue_state_type ?? trackedIssueClaimFields.issue_state_type,
      issue_updated_at:
        input.mergeCloseout.issue_updated_at ?? trackedIssueClaimFields.issue_updated_at,
      state: resolveProviderMergeCloseoutClaimState(input.mergeCloseout),
      reason: resolveProviderMergeCloseoutClaimReason(input.mergeCloseout),
      task_id: input.latestRun.taskId,
      run_id: input.latestRun.runId,
      run_manifest_path: input.latestRun.manifestPath,
      worker_host: workerHost,
      ...clearProviderRetryFields(),
      merge_closeout: input.mergeCloseout
    });
  };

  const canRetireRecoveredActiveRunWithoutTerminalProof = (input: {
    latestRun: ProviderIssueRunRecord;
    mergeCloseout: ProviderMergeCloseoutRecord;
  }): boolean => {
    if (input.latestRun.proofTerminalStatus === 'succeeded') {
      return true;
    }
    return input.mergeCloseout.status === 'merged';
  };

  const maybeHandleRecoveredActiveRunMergedCloseout = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    latestRun: ProviderIssueRunRecord;
  }): Promise<ProviderIntakeClaimRecord | null> => {
    const trackedIssueWorkflowState = normalizeProviderLinearWorkflowState(input.trackedIssue.state);
    const existingMergeCloseout = input.claim.merge_closeout ?? null;
    const canReuseExistingMergeCloseout =
      existingMergeCloseout &&
      existingMergeCloseout.status !== 'watching' &&
      (
        input.trackedIssue.state_type === 'completed' ||
        (
          trackedIssueWorkflowState === 'merging' &&
          isTrackedIssueFreshEnoughForMergeCloseout(existingMergeCloseout, input.trackedIssue)
        )
      );
    if (
      canReuseExistingMergeCloseout
    ) {
      return await persistRecoveredActiveRunMergeCloseout({
        claim: input.claim,
        trackedIssue: input.trackedIssue,
        latestRun: input.latestRun,
        mergeCloseout: existingMergeCloseout
      });
    }
    const shouldReprobeRecoveredMergeCloseout =
      trackedIssueWorkflowState === 'merging' &&
      (
        input.claim.reason === 'provider_issue_rehydrated_active_run' ||
        (
          existingMergeCloseout !== null &&
          existingMergeCloseout.status !== 'watching' &&
          !isTrackedIssueFreshEnoughForMergeCloseout(existingMergeCloseout, input.trackedIssue)
        )
      );
    if (
      !runMergeCloseout ||
      !shouldReprobeRecoveredMergeCloseout
    ) {
      return null;
    }
    const mergeCloseout = await runMergeCloseout({
      issueId: input.trackedIssue.id,
      issueIdentifier: input.trackedIssue.identifier,
      issueState: input.trackedIssue.state,
      issueStateType: input.trackedIssue.state_type,
      issueUpdatedAt: input.trackedIssue.updated_at,
      previousBranchRecovery: input.claim.merge_closeout?.branch_recovery ?? null,
      sourceSetup: resolveMergeCloseoutSourceSetup(),
      env: buildMergeCloseoutEnv(input.latestRun.manifestPath),
      mode: 'probe-merged-recovery',
      repoRoot
    });
    if (mergeCloseout.status === 'watching') {
      return null;
    }
    if (
      !canRetireRecoveredActiveRunWithoutTerminalProof({
        latestRun: input.latestRun,
        mergeCloseout
      })
    ) {
      return null;
    }
    return await persistRecoveredActiveRunMergeCloseout({
      claim: input.claim,
      trackedIssue: input.trackedIssue,
      latestRun: input.latestRun,
      mergeCloseout
    });
  };

  const shouldAttemptDeterministicMergeCloseoutForRecoveredRun = (input: {
    claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason' | 'merge_closeout'>;
    trackedIssue: Pick<LiveLinearTrackedIssue, 'state'> | null;
    run: ProviderIssueRunRecord | null;
  }): boolean =>
    Boolean(
      input.run &&
      input.trackedIssue &&
      input.run.proofTerminalStatus === 'succeeded' &&
      (
        input.claim.state === 'starting' ||
        input.claim.state === 'resuming' ||
        input.claim.reason === 'provider_issue_rehydrated_active_run' ||
        input.claim.reason === 'provider_issue_review_promotion_promoted' ||
        isProviderMergeCloseoutWatchingClaim(input.claim)
      ) &&
      normalizeProviderLinearWorkflowState(input.trackedIssue.state) === 'merging'
    );

  const scheduleBestEffortRehydrateWithRefreshLock = (
    attempt = 1
  ): void => {
    if (bestEffortRehydrateTimer) {
      return;
    }
    bestEffortRehydrateTimer = globalThis.setTimeout(() => {
      bestEffortRehydrateTimer = null;
      // Detached rehydrate work must not inherit the worker-host cache from the
      // start/resume operation that scheduled this timer.
      void runOutsideConfiguredWorkerHostsScope(() =>
        runOutsideRefreshLifecycleScope(() =>
          runWithFreshProviderIssueRunDiscoveryCache(() =>
            runWithRefreshLifecycleLock(() => rehydrateNow({ refreshTrackedIssueMetadata: true }))
          )
        )
      )
        .then((result) => {
          if (result.hasPendingClaims && attempt < BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS) {
            scheduleBestEffortRehydrateWithRefreshLock(attempt + 1);
          }
        })
        .catch(() => {
          if (attempt < BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS) {
            scheduleBestEffortRehydrateWithRefreshLock(attempt + 1);
          }
        });
    }, BEST_EFFORT_REHYDRATE_DELAY_MS);
    bestEffortRehydrateTimer.unref?.();
  };

  function rebuildRetryQueue(): void {
    const queuedProviderKeys = new Set<string>();
    retryQueue.sync(
      options.state.claims.flatMap((claim) => {
        if (claim.retry_queued !== true || !isValidProviderRetryTimestamp(claim.retry_due_at)) {
          return [];
        }
        queuedProviderKeys.add(claim.provider_key);
        const dueAt = claim.retry_due_at;
        return [
          {
            key: claim.provider_key,
            dueAt,
            fire: () => dispatchQueuedProviderRetry(claim.provider_key, dueAt)
          }
        ];
      })
    );
    for (const providerKey of queuedRetryTrackedIssueRefetches.keys()) {
      if (!queuedProviderKeys.has(providerKey)) {
        queuedRetryTrackedIssueRefetches.delete(providerKey);
      }
    }
  }

  rebuildRetryQueue();

  const buildTrackedIssueClaimFields = (
    trackedIssue: Pick<
      LiveLinearTrackedIssue,
      | 'identifier'
      | 'title'
      | 'state'
      | 'state_type'
      | 'updated_at'
      | 'archived_at'
      | 'trashed'
      | 'viewer_id'
      | 'assignee_id'
      | 'assignee_name'
      | 'blocked_by'
    >
  ): Pick<
    ProviderIntakeClaimRecord,
    | 'issue_identifier'
    | 'issue_title'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_updated_at'
    | 'issue_archived_at'
    | 'issue_trashed'
    | 'issue_viewer_id'
    | 'issue_viewer_auth_fingerprint'
    | 'issue_assignee_id'
    | 'issue_assignee_name'
    | 'issue_blocked_by'
  > => ({
    issue_identifier: trackedIssue.identifier,
    issue_title: trackedIssue.title,
    issue_state: trackedIssue.state,
    issue_state_type: trackedIssue.state_type,
    issue_updated_at: trackedIssue.updated_at,
    issue_archived_at: trackedIssue.archived_at,
    issue_trashed: trackedIssue.trashed,
    issue_viewer_id: trackedIssue.viewer_id,
    issue_viewer_auth_fingerprint:
      typeof trackedIssue.viewer_id === 'string' && trackedIssue.viewer_id.length > 0
        ? resolveProviderViewerAuthFingerprint()
        : null,
    issue_assignee_id: trackedIssue.assignee_id,
    issue_assignee_name: trackedIssue.assignee_name,
    ...(trackedIssue.blocked_by === undefined ? {} : { issue_blocked_by: trackedIssue.blocked_by })
  });

  const markReleasedBacklogNotActiveClaimPassiveVerified = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: Parameters<typeof buildTrackedIssueClaimFields>[0];
  }): Promise<ProviderIntakeClaimRecord> => {
    const trackedIssueFields = buildTrackedIssueClaimFields(input.trackedIssue);
    return await upsertProviderClaimAndPersist({
      ...input.claim,
      ...trackedIssueFields,
      state: 'released',
      reason: 'provider_issue_released:not_active',
      passive_release: {
        reason: 'backlog_not_active_direct_issue_by_id',
        source: 'direct_issue_by_id',
        verified_at: isoTimestamp(),
        issue_state: trackedIssueFields.issue_state,
        issue_state_type: trackedIssueFields.issue_state_type,
        issue_updated_at: trackedIssueFields.issue_updated_at
      }
    });
  };

  const isTrackedIssueFreshEnoughForClaim = (
    claim: Pick<ProviderIntakeClaimRecord, 'issue_updated_at'>,
    trackedIssue: Pick<LiveLinearTrackedIssue, 'updated_at'>
  ): boolean => {
    const freshness = compareTrackedIssueUpdatedAt({
      existingIssueUpdatedAt: claim.issue_updated_at ?? null,
      nextIssueUpdatedAt: trackedIssue.updated_at
    });
    if (freshness === 'older') {
      return false;
    }
    if (freshness === 'unknown' && claim.issue_updated_at) {
      return false;
    }
    return true;
  };

  const buildFreshTrackedIssueClaimFields = (
    claim: Pick<ProviderIntakeClaimRecord, 'issue_updated_at'>,
    trackedIssue: Pick<
      LiveLinearTrackedIssue,
      | 'identifier'
      | 'title'
      | 'state'
      | 'state_type'
      | 'updated_at'
      | 'archived_at'
      | 'trashed'
      | 'viewer_id'
      | 'assignee_id'
      | 'assignee_name'
      | 'blocked_by'
    >
  ): Partial<
    Pick<
      ProviderIntakeClaimRecord,
      | 'issue_identifier'
      | 'issue_title'
      | 'issue_state'
      | 'issue_state_type'
      | 'issue_updated_at'
      | 'issue_archived_at'
      | 'issue_trashed'
      | 'issue_viewer_id'
      | 'issue_viewer_auth_fingerprint'
      | 'issue_assignee_id'
      | 'issue_assignee_name'
      | 'issue_blocked_by'
    >
  > => {
    if (!isTrackedIssueFreshEnoughForClaim(claim, trackedIssue)) {
      return {};
    }
    return buildTrackedIssueClaimFields(trackedIssue);
  };

  const resolveProviderClaimAdmissionOccupancyKey = (
    claim: ProviderIntakeClaimRecord,
    run: ProviderIssueRunRecord | null = null
  ): string | null =>
    run?.manifestPath ??
    run?.runId ??
    (
      claim.state === 'running'
        ? null
        : claim.run_manifest_path ??
          claim.run_id ??
          `claim:${claim.provider_key}:${claim.state}`
    );

  const createProviderAdmissionGate = async (input: {
    excludeClaimProviderKey?: string | null;
    excludeOccupancyKey?: string | null;
    forceLocalWorkerOnly?: boolean;
    preferredWorkerHost?: string | null;
  } = {}): Promise<
    ReturnType<typeof createProviderPollDispatchBudget>
  > => {
    const gate = createProviderPollDispatchBudget(options.readFeatureToggles?.() ?? null, {
      localWorkerOnly:
        input.forceLocalWorkerOnly === true ||
        await resolveLocalWorkerOnlyForCurrentOperation({
          preferredWorkerHost: input.preferredWorkerHost ?? null
        })
    });
    const seededOccupancyKeys = new Set<string>();
    const discoveredRuns = await discoverProviderIssueRunsForCurrentOperation();
    // Host-global admission must count every live or queued provider worker, even when
    // claim attachment and issue ownership stay scoped to the current start pipeline.
    const activeDiscoveredRuns = discoveredRuns.filter((run) => run.status === 'in_progress');
    const queuedDiscoveredRuns = discoveredRuns.filter((run) => run.status === 'queued');
    const occupyingDiscoveredRuns = [...activeDiscoveredRuns, ...queuedDiscoveredRuns];
    const occupyingRunsByProviderIssue = groupProviderIssueRuns(occupyingDiscoveredRuns);
    const claimByProviderKey = new Map<string, ProviderIntakeClaimRecord>();
    const claimStateByProviderKey = new Map<string, string | null>();

    for (const claim of options.state.claims) {
      claimByProviderKey.set(claim.provider_key, claim);
      if (claim.provider_key === input.excludeClaimProviderKey) {
        continue;
      }
      if (!shouldProviderClaimOccupyAdmissionSlot(claim)) {
        continue;
      }
      const occupyingClaimRun =
        resolveProviderClaimRunIdentity(
          claim,
          occupyingRunsByProviderIssue.get(claim.provider_key) ?? []
        ) ??
        occupyingRunsByProviderIssue.get(claim.provider_key)?.[0] ??
        null;
      const occupancyKey = resolveProviderClaimAdmissionOccupancyKey(claim, occupyingClaimRun);
      if (!occupancyKey) {
        continue;
      }
      if (occupancyKey === input.excludeOccupancyKey) {
        continue;
      }
      if (seededOccupancyKeys.has(occupancyKey)) {
        continue;
      }
      seededOccupancyKeys.add(occupancyKey);
      const claimAdmissionState = resolveProviderClaimIssueStateForAdmission(
        claim,
        occupyingClaimRun
      );
      claimStateByProviderKey.set(claim.provider_key, claimAdmissionState);
      gate.noteOccupied({ state: claimAdmissionState });
    }

    for (const run of activeDiscoveredRuns) {
      const occupancyKey = run.manifestPath || run.runId;
      if (occupancyKey === input.excludeOccupancyKey) {
        continue;
      }
      if (seededOccupancyKeys.has(occupancyKey)) {
        continue;
      }
      seededOccupancyKeys.add(occupancyKey);
      const providerKey = buildProviderIssueKey(run.provider, run.issueId);
      gate.noteOccupied({ state: claimStateByProviderKey.get(providerKey) ?? null });
    }
    for (const run of queuedDiscoveredRuns) {
      const providerKey = buildProviderIssueKey(run.provider, run.issueId);
      const claim = claimByProviderKey.get(providerKey) ?? null;
      const occupancyKey = run.manifestPath || run.runId;
      if (occupancyKey === input.excludeOccupancyKey) {
        continue;
      }
      if (
        isReleasedProviderClaimRunIdentityMatch(claim, run) ||
        !shouldCountQueuedAdmissionOccupancyForClaim(claim, run)
      ) {
        continue;
      }
      if (seededOccupancyKeys.has(occupancyKey)) {
        continue;
      }
      seededOccupancyKeys.add(occupancyKey);
      gate.noteOccupied({
        state: resolveProviderClaimIssueStateForAdmission(claim, run)
      });
    }
    const unreadableAdmissionOccupancy =
      await discoverUnreadableProviderAdmissionOccupancyForCurrentOperation();
    for (const record of unreadableAdmissionOccupancy) {
      if (record.manifestPath === input.excludeOccupancyKey) {
        continue;
      }
      if (seededOccupancyKeys.has(record.manifestPath)) {
        continue;
      }
      const providerKey = buildProviderIssueKey(record.provider, record.issueId);
      seededOccupancyKeys.add(record.manifestPath);
      gate.noteOccupied({ state: claimStateByProviderKey.get(providerKey) ?? null });
    }

    return gate;
  };

  const shouldCountProviderAdmissionResultForPollBudget = (
    result: ProviderIssueHandoffResult
  ): boolean => result.kind !== 'ignored' || result.claim.retry_queued === true;

  const buildTrackedIssueMergeCloseoutResetFields = (
    claim: Pick<
      ProviderIntakeClaimRecord,
      'merge_closeout' | 'review_promotion' | 'issue_state' | 'issue_state_type' | 'issue_updated_at'
    >,
    trackedIssue: Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'updated_at'>
  ): Partial<Pick<ProviderIntakeClaimRecord, 'merge_closeout' | 'review_promotion'>> => {
    if (!isTrackedIssueFreshEnoughForClaim(claim, trackedIssue)) {
      return {};
    }
    if (isSupersededDoneTransitionFailedMergeCloseoutClaim({ claim, trackedIssue })) {
      return shouldClearStaleReviewPromotionForTrackedIssue({
        claim,
        trackedIssue
      })
        ? { merge_closeout: null, review_promotion: null }
        : { merge_closeout: null };
    }
    if (isSupersededTerminalMergeCloseoutClaim({ claim, trackedIssue })) {
      return shouldClearStaleReviewPromotionForTrackedIssue({
        claim,
        trackedIssue
      })
        ? { review_promotion: null }
        : {};
    }
    const clearMergeCloseout = shouldClearStaleMergeCloseoutForTrackedIssue({
      claim,
      trackedIssue
    });
    if (!clearMergeCloseout) {
      return {};
    }
    return shouldClearStaleReviewPromotionForTrackedIssue({
      claim,
      trackedIssue
    })
      ? { merge_closeout: null, review_promotion: null }
      : { merge_closeout: null };
  };

  const buildFreshTrackedIssueActiveRunFields = (
    claim: Pick<
      ProviderIntakeClaimRecord,
      | 'merge_closeout'
      | 'review_promotion'
      | 'issue_identifier'
      | 'issue_title'
      | 'issue_state'
      | 'issue_state_type'
      | 'issue_updated_at'
      | 'issue_viewer_id'
      | 'issue_viewer_auth_fingerprint'
      | 'issue_assignee_id'
      | 'issue_assignee_name'
      | 'issue_blocked_by'
    >,
    trackedIssue: LiveLinearTrackedIssue
  ): Partial<
    Pick<
      ProviderIntakeClaimRecord,
      | 'issue_identifier'
      | 'issue_title'
      | 'issue_state'
      | 'issue_state_type'
      | 'issue_updated_at'
      | 'issue_viewer_id'
      | 'issue_viewer_auth_fingerprint'
      | 'issue_assignee_id'
      | 'issue_assignee_name'
      | 'issue_blocked_by'
      | 'merge_closeout'
      | 'review_promotion'
    >
  > => ({
    ...buildFreshTrackedIssueClaimFields(claim, trackedIssue),
    ...buildTrackedIssueMergeCloseoutResetFields(claim, trackedIssue)
  });

  type ActiveClaimFreshTrackedIssueFields = Partial<
    Pick<
      ProviderIntakeClaimRecord,
      | 'issue_identifier'
      | 'issue_title'
      | 'issue_state'
      | 'issue_state_type'
      | 'issue_updated_at'
      | 'issue_viewer_id'
      | 'issue_viewer_auth_fingerprint'
      | 'issue_assignee_id'
      | 'issue_assignee_name'
      | 'issue_blocked_by'
      | 'merge_closeout'
      | 'review_promotion'
    >
  >;
  type ActiveClaimFreshTrackedIssueResolution = {
    trackedIssue: LiveLinearTrackedIssue | null;
    claimFields: ActiveClaimFreshTrackedIssueFields;
    releaseClaimFields: ActiveClaimFreshTrackedIssueFields;
    releaseReason: string | null;
    useCachedClaimIssueState: boolean;
  };
  const buildActiveClaimFreshTrackedIssueFallback = (
    useCachedClaimIssueState: boolean
  ): ActiveClaimFreshTrackedIssueResolution => ({
    trackedIssue: null,
    claimFields: {},
    releaseClaimFields: {},
    releaseReason: null,
    useCachedClaimIssueState
  });

  const resolveFreshTrackedIssueForActiveClaim = async (
    claim: Pick<
      ProviderIntakeClaimRecord,
      | 'provider'
      | 'issue_id'
      | 'issue_state'
      | 'issue_state_type'
      | 'issue_updated_at'
      | 'merge_closeout'
      | 'review_promotion'
    >
  ): Promise<ActiveClaimFreshTrackedIssueResolution> => {
    if (!resolveRevalidationTrackedIssueWhenNotStuck) {
      return buildActiveClaimFreshTrackedIssueFallback(true);
    }

    let resolution: Awaited<ReturnType<NonNullable<typeof resolveRevalidationTrackedIssueWhenNotStuck>>>;
    try {
      resolution = await resolveRevalidationTrackedIssueWhenNotStuck({
        provider: claim.provider,
        issueId: claim.issue_id
      });
    } catch (error) {
      rethrowRefreshLifecycleStuckError(error);
      logger.warn(
        `Provider issue active-run metadata refresh failed for ${buildProviderIssueKey(
          claim.provider,
          claim.issue_id
        )}: ${(error as Error)?.message ?? String(error)}`
      );
      return buildActiveClaimFreshTrackedIssueFallback(true);
    }
    if (resolution.kind === 'skip') {
      return buildActiveClaimFreshTrackedIssueFallback(true);
    }
    if (resolution.kind === 'release') {
      return {
        trackedIssue: null,
        claimFields: {},
        releaseClaimFields: {},
        releaseReason: `provider_issue_released:${stripProviderIssueReleasedPrefix(resolution.reason)}`,
        useCachedClaimIssueState: false
      };
    }

    if (!isTrackedIssueFreshEnoughForClaim(claim, resolution.trackedIssue)) {
      return buildActiveClaimFreshTrackedIssueFallback(true);
    }

    const eligibility = assessProviderTrackedIssueEligibility(resolution.trackedIssue, {
      hasExistingClaim: true
    });
    if (!eligibility.eligible) {
      return {
        trackedIssue: null,
        claimFields: {},
        releaseClaimFields: {
          ...buildFreshTrackedIssueClaimFields(claim, resolution.trackedIssue),
          ...buildTrackedIssueMergeCloseoutResetFields(claim, resolution.trackedIssue)
        },
        releaseReason: eligibility.releaseReason,
        useCachedClaimIssueState: false
      };
    }

    const freshClaimFields = {
      ...buildFreshTrackedIssueClaimFields(claim, resolution.trackedIssue),
      ...buildTrackedIssueMergeCloseoutResetFields(claim, resolution.trackedIssue)
    };
    return {
      trackedIssue: resolution.trackedIssue,
      claimFields: freshClaimFields,
      releaseClaimFields: freshClaimFields,
      releaseReason: null,
      useCachedClaimIssueState: false
    };
  };

  const launchResumeForRun = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    run: ProviderIssueRunRecord;
    reason: string;
    failureReason?: string;
    launcherReason?: string;
    seedRetryAttemptFromPreviousRun?: boolean;
  }): Promise<void> => {
    await runWithConfiguredWorkerHostsCache(async () => {
      assertProviderHandoffSourceFreshnessTrusted();
      const workerHost = resolveRehydratedActiveRunWorkerHost(input.run, input.claim);
      const resumeWorkerHost = await resolveResumeWorkerHost(workerHost);
      const admissionGate = await createProviderAdmissionGate({
        excludeClaimProviderKey:
          input.claim.retry_queued === true || input.claim.state === 'resumable'
            ? input.claim.provider_key
            : null,
        forceLocalWorkerOnly: resumeWorkerHost === null,
        preferredWorkerHost: resumeWorkerHost
      });
      if (!admissionGate.canDispatch(input.trackedIssue)) {
        await upsertProviderClaimAndPersist({
          ...input.claim,
          ...buildTrackedIssueClaimFields(input.trackedIssue),
          task_id: input.run.taskId,
          state: 'resumable',
          reason: deriveProviderCapacityBlockedReason(input.reason),
          run_id: input.run.runId,
          run_manifest_path: input.run.manifestPath,
          worker_host: resumeWorkerHost,
          launch_source: null,
          launch_token: null,
          review_promotion: null,
          merge_closeout: null,
          ...buildQueuedProviderRetryFields({
            claim: input.claim,
            previousRun: input.run,
            error: input.claim.retry_error ?? resolveProviderRetryErrorFromRun(input.run),
            preserveCurrentAttempt: true,
            delayType: resolveProviderRetryDelayType({
              claim: input.claim,
              previousRun: input.run
            })
          })
        });
        return;
      }
      assertProviderHandoffSourceFreshnessTrusted();
      const launchToken = createProviderLaunchToken();
      await upsertProviderClaimAndPersist({
        ...input.claim,
        ...buildTrackedIssueClaimFields(input.trackedIssue),
        task_id: input.run.taskId,
        state: 'resuming',
        reason: input.reason,
        run_id: input.run.runId,
        run_manifest_path: input.run.manifestPath,
        worker_host: resumeWorkerHost,
        launch_source: PROVIDER_LAUNCH_SOURCE,
        launch_token: launchToken,
        review_promotion: null,
        merge_closeout: null,
        ...buildProviderRetryLaunchFields({
          claim: input.claim,
          previousRun: input.run,
          preserveCurrentAttempt: input.claim.retry_queued === true,
          seedFromPreviousRun: input.seedRetryAttemptFromPreviousRun === true
        })
      });
      try {
        await resumeProviderWorkerWhenCurrent({
          runId: input.run.runId,
          actor: 'control-host',
          reason: input.launcherReason ?? 'provider-refresh',
          workerHost: resumeWorkerHost,
          launchToken
        });
        resetProviderIssueRunDiscoveryCache();
      } catch (error) {
        if (isRefreshLifecycleStuckError(error) || isStaleRefreshLifecycleOperation()) {
          scheduleBestEffortRehydrateWithRefreshLock();
          throwRefreshLifecycleStuckError();
        }
        const failureReason = input.failureReason ?? 'provider_issue_refresh_resume_failed';
        await upsertProviderClaimAndPersist({
          ...input.claim,
          ...buildTrackedIssueClaimFields(input.trackedIssue),
          task_id: input.run.taskId,
          state: 'handoff_failed',
          reason: `${failureReason}:${(error as Error)?.message ?? String(error)}`,
          run_id: input.run.runId,
          run_manifest_path: input.run.manifestPath,
          worker_host: resumeWorkerHost,
          launch_source: PROVIDER_LAUNCH_SOURCE,
          launch_token: launchToken,
          review_promotion: null,
          merge_closeout: null,
          ...buildQueuedProviderRetryFields({
            claim: input.claim,
            previousRun: input.run,
            error: (error as Error)?.message ?? String(error),
            preserveCurrentAttempt: true,
            delayType: 'failure'
          })
        }, { rollbackOnPersistFailure: false });
        throw error;
      }
      scheduleBestEffortRehydrateWithRefreshLock();
    });
  };

  const launchStartForTrackedIssue = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    reason: string;
    failureReason?: string;
    previousRun?: ProviderIssueRunRecord | null;
    preserveRetryAttempt?: boolean;
    seedRetryAttemptFromPreviousRun?: boolean;
  }): Promise<ProviderIssueHandoffResult> => {
    return await runWithConfiguredWorkerHostsCache(async () => {
      assertProviderHandoffSourceFreshnessTrusted();
      const taskId = buildProviderFallbackTaskId(input.trackedIssue);
      const preferredWorkerHost = resolvePreferredStartWorkerHost({
        claimWorkerHost: input.claim.worker_host ?? null,
        previousRun: input.previousRun ?? null
      });
      const admissionGate = await createProviderAdmissionGate({
        excludeClaimProviderKey:
          input.claim.retry_queued === true ? input.claim.provider_key : null
      });
      if (!admissionGate.canDispatch(input.trackedIssue)) {
        const claim = await upsertProviderClaimAndPersist({
          ...input.claim,
          ...buildTrackedIssueClaimFields(input.trackedIssue),
          task_id: taskId,
          mapping_source: input.claim.mapping_source,
          state: 'accepted',
          reason: deriveProviderCapacityBlockedReason(input.reason),
          run_id: input.previousRun?.runId ?? input.claim.run_id,
          run_manifest_path: input.previousRun?.manifestPath ?? input.claim.run_manifest_path,
          worker_host: preferredWorkerHost,
          launch_source: null,
          launch_token: null,
          review_promotion: null,
          merge_closeout: null,
          passive_release: null,
          ...(
            input.preserveRetryAttempt === true || input.claim.retry_queued === true
              ? buildQueuedProviderRetryFields({
                  claim: input.claim,
                  previousRun: input.previousRun ?? null,
                  error: input.claim.retry_error ?? resolveProviderRetryErrorFromRun(input.previousRun ?? null),
                  preserveCurrentAttempt: true,
                  delayType: resolveProviderRetryDelayType({
                    claim: input.claim,
                    previousRun: input.previousRun ?? null
                  })
                })
              : clearProviderRetryFields()
          )
        });
        return {
          kind: 'ignored',
          reason: claim.reason ?? deriveProviderCapacityBlockedReason(input.reason),
          claim
        };
      }
      let workerHost: string | null = preferredWorkerHost;
      try {
        workerHost = await selectLaunchWorkerHost({
          claim: input.claim,
          previousRun: input.previousRun ?? null
        });
      } catch (error) {
        const failureReason = input.failureReason ?? 'provider_issue_refresh_start_failed';
        await upsertProviderClaimAndPersist({
          ...input.claim,
          ...buildTrackedIssueClaimFields(input.trackedIssue),
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'handoff_failed',
          reason: `${failureReason}:${(error as Error)?.message ?? String(error)}`,
          run_id: null,
          run_manifest_path: null,
          worker_host: workerHost,
          launch_source: PROVIDER_LAUNCH_SOURCE,
          launch_token: null,
          review_promotion: null,
          merge_closeout: null,
          passive_release: null,
          ...buildQueuedProviderRetryFields({
            claim: input.claim,
            previousRun: input.previousRun ?? null,
            error: (error as Error)?.message ?? String(error),
            preserveCurrentAttempt:
              input.preserveRetryAttempt === true || input.claim.retry_queued === true,
            seedInitialAttemptWithoutPreviousRun: true,
            delayType: 'failure'
          })
        }, { rollbackOnPersistFailure: false });
        throw error;
      }
      assertProviderHandoffSourceFreshnessTrusted();
      const launchToken = createProviderLaunchToken();
      await upsertProviderClaimAndPersist({
        ...input.claim,
        ...buildTrackedIssueClaimFields(input.trackedIssue),
        task_id: taskId,
        mapping_source: 'provider_id_fallback',
        state: 'starting',
        reason: input.reason,
        run_id: null,
        run_manifest_path: null,
        worker_host: workerHost,
        launch_source: PROVIDER_LAUNCH_SOURCE,
        launch_token: launchToken,
        review_promotion: null,
        merge_closeout: null,
        passive_release: null,
        ...buildProviderRetryLaunchFields({
          claim: input.claim,
          previousRun: input.previousRun ?? null,
          preserveCurrentAttempt: input.preserveRetryAttempt === true || input.claim.retry_queued === true,
          seedFromPreviousRun: input.seedRetryAttemptFromPreviousRun === true
        })
      });
      let startedRun: { runId: string; manifestPath: string } | null = null;
      try {
        startedRun = await startProviderWorkerWhenCurrent({
          taskId,
          pipelineId: startPipelineId,
          provider: 'linear',
          issueId: input.trackedIssue.id,
          issueIdentifier: input.trackedIssue.identifier,
          issueUpdatedAt: input.trackedIssue.updated_at,
          workerHost,
          workspaceId: input.trackedIssue.workspace_id,
          teamId: input.trackedIssue.team_id,
          projectId: input.trackedIssue.project_id,
          residentSessionSeed: input.previousRun?.residentSessionSeed ?? null,
          launchToken
        });
      } catch (error) {
        if (isRefreshLifecycleStuckError(error) || isStaleRefreshLifecycleOperation()) {
          scheduleBestEffortRehydrateWithRefreshLock();
          throwRefreshLifecycleStuckError();
        }
        const failureReason = input.failureReason ?? 'provider_issue_refresh_start_failed';
        await upsertProviderClaimAndPersist({
          ...input.claim,
          ...buildTrackedIssueClaimFields(input.trackedIssue),
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'handoff_failed',
          reason: `${failureReason}:${(error as Error)?.message ?? String(error)}`,
          run_id: null,
          run_manifest_path: null,
          worker_host: workerHost,
          launch_source: PROVIDER_LAUNCH_SOURCE,
          launch_token: launchToken,
          review_promotion: null,
          merge_closeout: null,
          passive_release: null,
          ...buildQueuedProviderRetryFields({
            claim: input.claim,
            previousRun: input.previousRun ?? null,
            error: (error as Error)?.message ?? String(error),
            preserveCurrentAttempt:
              input.preserveRetryAttempt === true || input.claim.retry_queued === true,
            delayType: 'failure'
          })
        }, { rollbackOnPersistFailure: false });
        throw error;
      }
      if (startedRun) {
        resetProviderIssueRunDiscoveryCache();
      }
      try {
        const startClaimSnapshot = startedRun ? captureProviderStateSnapshot() : null;
        if (startedRun) {
          assertRefreshLifecycleCurrent();
        }
        const claim = startedRun
          ? upsertProviderIntakeClaim(options.state, {
              ...input.claim,
              ...buildTrackedIssueClaimFields(input.trackedIssue),
              task_id: taskId,
              mapping_source: 'provider_id_fallback',
              state: 'starting',
              reason: input.reason,
              run_id: startedRun.runId,
              run_manifest_path: startedRun.manifestPath,
              worker_host: workerHost,
              launch_source: PROVIDER_LAUNCH_SOURCE,
              launch_token: launchToken,
              review_promotion: null,
              merge_closeout: null,
              passive_release: null,
              ...buildProviderRetryLaunchFields({
                claim: input.claim,
                previousRun: input.previousRun ?? null,
                preserveCurrentAttempt:
                  input.preserveRetryAttempt === true || input.claim.retry_queued === true,
                seedFromPreviousRun: input.seedRetryAttemptFromPreviousRun === true
              })
            })
          : input.claim;
        if (startedRun) {
          await persistStateOrRollback(
            startClaimSnapshot ?? captureProviderStateSnapshot(),
            { rollbackOnPersistFailure: false }
          );
          options.publishRuntime?.('provider-intake.refresh');
        }
        return { kind: 'start', reason: input.reason, claim };
      } finally {
        scheduleBestEffortRehydrateWithRefreshLock();
      }
    });
  };

  const releaseClaim = async (input: {
    claim: ProviderIntakeClaimRecord;
    nextReason: string;
    releaseRun: ProviderIssueRunRecord | null;
    allowClearingRunIdentity?: boolean;
    trackedIssue?: Pick<
      LiveLinearTrackedIssue,
      | 'identifier'
      | 'title'
      | 'state'
      | 'state_type'
      | 'updated_at'
      | 'archived_at'
      | 'trashed'
      | 'viewer_id'
      | 'assignee_id'
      | 'assignee_name'
      | 'blocked_by'
    > | null;
    cleanupWorkspace?: boolean;
  }): Promise<void> => {
    const now = isoTimestamp();
    const trackedIssueFields = input.trackedIssue
      ? buildTrackedIssueClaimFields(input.trackedIssue)
      : null;
    const mergeCloseoutResetFields = input.trackedIssue
      ? buildTrackedIssueMergeCloseoutResetFields(input.claim, input.trackedIssue)
      : {};
    const retainedRunIdentity = resolveReleasedClaimRetainedRunIdentity({
      claim: input.claim,
      run: input.releaseRun,
      allowClearing: input.allowClearingRunIdentity,
      trackedIssue: input.trackedIssue ?? null
    });
    const transitioned = hasProviderClaimTransitioned(input.claim, {
      ...(trackedIssueFields ?? {}),
      ...mergeCloseoutResetFields,
      state: 'released',
      reason: input.nextReason,
      ...retainedRunIdentity,
      ...clearProviderRetryFields()
    });
    await upsertProviderClaimAndPersist({
      ...input.claim,
      issue_identifier: input.trackedIssue?.identifier ?? input.claim.issue_identifier,
      issue_title: input.trackedIssue?.title ?? input.claim.issue_title,
      issue_state: input.trackedIssue?.state ?? input.claim.issue_state,
      issue_state_type: input.trackedIssue?.state_type ?? input.claim.issue_state_type,
      issue_updated_at: input.trackedIssue?.updated_at ?? input.claim.issue_updated_at,
      issue_archived_at:
        input.trackedIssue != null
          ? trackedIssueFields?.issue_archived_at ?? null
          : (input.claim.issue_archived_at ?? null),
      issue_trashed:
        input.trackedIssue != null ? trackedIssueFields?.issue_trashed ?? null : (input.claim.issue_trashed ?? null),
      issue_viewer_id:
        input.trackedIssue != null
          ? trackedIssueFields?.issue_viewer_id ?? null
          : (input.claim.issue_viewer_id ?? null),
      issue_viewer_auth_fingerprint:
        input.trackedIssue != null
          ? trackedIssueFields?.issue_viewer_auth_fingerprint ?? null
          : (input.claim.issue_viewer_auth_fingerprint ?? null),
      issue_assignee_id:
        input.trackedIssue != null ? input.trackedIssue.assignee_id : (input.claim.issue_assignee_id ?? null),
      issue_assignee_name:
        input.trackedIssue != null
          ? input.trackedIssue.assignee_name
          : (input.claim.issue_assignee_name ?? null),
      issue_blocked_by: input.trackedIssue?.blocked_by ?? input.claim.issue_blocked_by ?? null,
      ...mergeCloseoutResetFields,
      ...retainedRunIdentity,
      state: 'released',
      reason: input.nextReason,
      ...clearProviderRetryFields(),
      updated_at: now
    });
    assertRefreshLifecycleCurrent();
    if (input.cleanupWorkspace && canCleanupReleasedProviderWorkspace(input.releaseRun)) {
      await cleanupReleasedProviderWorkspace({
        repoRoot,
        taskId: input.releaseRun?.taskId ?? input.claim.task_id,
        manifestPath: input.releaseRun?.manifestPath ?? input.claim.run_manifest_path,
        issueId: input.claim.issue_id,
        issueIdentifier: input.claim.issue_identifier,
        providerWorkflowConfigStore: options.providerWorkflowConfigStore ?? null,
        runTerminalCleanup,
        assertCurrent: assertRefreshLifecycleCurrent
      });
      assertRefreshLifecycleCurrent();
    }
    assertRefreshLifecycleCurrent();
    if (transitioned) {
      options.publishRuntime?.('provider-intake.refresh');
    }
    assertRefreshLifecycleCurrent();
    await retryReleaseCancel({
      releaseRun: input.releaseRun,
      reason: input.nextReason,
      assertCurrent: assertRefreshLifecycleCurrent
    });
    assertRefreshLifecycleCurrent();
  };

  const hasPendingReleaseCancel = (manifestPath: string | null | undefined): boolean =>
    Boolean(manifestPath && releaseCancelInFlight.has(manifestPath));

  const retryReleaseCancel = async (input: {
    releaseRun: ProviderIssueRunRecord | null;
    reason: string;
    assertCurrent?: () => void;
  }): Promise<void> => {
    const manifestPath = input.releaseRun?.manifestPath ?? null;
    if (!shouldAttemptReleaseCancel(input.releaseRun) || !manifestPath) {
      return;
    }
    const isCurrent = (): boolean => {
      try {
        input.assertCurrent?.();
        return true;
      } catch (error) {
        if (isRefreshLifecycleStuckError(error)) {
          return false;
        }
        throw error;
      }
    };
    if (!isCurrent()) {
      return;
    }
    const existingAttempt = releaseCancelInFlight.get(manifestPath);
    if (existingAttempt) {
      if (!existingAttempt.retryConsumed) {
        existingAttempt.retryRequested = true;
      }
      const delivered = await existingAttempt.attempt;
      if (!isCurrent()) {
        return;
      }
      if (!delivered) {
        if (releaseCancelInFlight.get(manifestPath) === existingAttempt) {
          releaseCancelInFlight.delete(manifestPath);
        }
        await retryReleaseCancel(input);
        return;
      }
      return;
    }
    const performCancelAttempt = async (): Promise<boolean> => {
      if (!isCurrent()) {
        return false;
      }
      try {
        await callChildControlEndpoint({
          manifestPath,
          payload: {
            action: 'cancel',
            requested_by: 'control-host',
            reason: input.reason
          },
          allowedRunRoots,
          assertCurrent: input.assertCurrent
        });
        if (!isCurrent()) {
          return true;
        }
        return true;
      } catch (error) {
        if (isRefreshLifecycleStuckError(error)) {
          return false;
        }
        // Keep the claim released and let the next rehydrate/refresh retry cancellation
        // while the child run drains.
        return false;
      }
    };
    const cancelState = {
      retryRequested: false,
      retryConsumed: false,
      attempt: Promise.resolve(false)
    };
    cancelState.attempt = (async (): Promise<boolean> => {
      let delivered = await performCancelAttempt();
      while (!delivered && cancelState.retryRequested && !cancelState.retryConsumed) {
        cancelState.retryRequested = false;
        cancelState.retryConsumed = true;
        delivered = await performCancelAttempt();
      }
      return delivered;
    })().finally(() => {
      if (releaseCancelInFlight.get(manifestPath) === cancelState) {
        releaseCancelInFlight.delete(manifestPath);
      }
    });
    releaseCancelInFlight.set(manifestPath, cancelState);
    await cancelState.attempt;
  };

  const buildClearedRehydratedLaunchProvenance = (): ProviderRehydratedLaunchProvenanceFields => ({
    launch_source: null,
    launch_token: null
  });

  const claimIdentifiesActiveRun = (
    claim: ProviderIntakeClaimRecord,
    activeRun: ProviderIssueRunRecord
  ): boolean => {
    const claimRunId = normalizeOptionalString(claim.run_id);
    const claimManifestPath = normalizeOptionalString(claim.run_manifest_path);
    const runIdMatches = claimRunId !== null && claimRunId === activeRun.runId;
    const manifestMatches =
      claimManifestPath !== null &&
      (
        claimManifestPath === activeRun.manifestPath ||
        resolve(claimManifestPath) === resolve(activeRun.manifestPath)
      );

    if (claimRunId && claimManifestPath) {
      return runIdMatches && manifestMatches;
    }
    return runIdMatches || manifestMatches;
  };

  const resolveRehydratedActiveRunLaunchProvenance = (input: {
    claim: ProviderIntakeClaimRecord;
    activeRun: ProviderIssueRunRecord;
  }): ProviderRehydratedLaunchProvenanceFields => {
    const launchToken = normalizeOptionalString(input.claim.launch_token);
    if (
      input.claim.launch_source !== PROVIDER_LAUNCH_SOURCE ||
      !launchToken ||
      input.claim.state === 'resumable' ||
      !claimIdentifiesActiveRun(input.claim, input.activeRun)
    ) {
      return buildClearedRehydratedLaunchProvenance();
    }

    const manifest = input.activeRun.manifest;

    const manifestLaunchSource =
      normalizeOptionalString(manifest.provider_launch_source) ??
      normalizeOptionalString(manifest.providerLaunchSource);
    const manifestTaskId =
      normalizeOptionalString(manifest.provider_control_host_task_id) ??
      normalizeOptionalString(manifest.providerControlHostTaskId);
    const manifestRunId =
      normalizeOptionalString(manifest.provider_control_host_run_id) ??
      normalizeOptionalString(manifest.providerControlHostRunId);
    const manifestMatchesControlHostLocator =
      controlHostRunLocator !== null &&
      manifestLaunchSource === PROVIDER_LAUNCH_SOURCE &&
      manifestTaskId === controlHostRunLocator.taskId &&
      manifestRunId === controlHostRunLocator.runId;
    if (manifestMatchesControlHostLocator) {
      return {
        launch_source: PROVIDER_LAUNCH_SOURCE,
        launch_token: launchToken
      };
    }

    logger.warn(
      `[provider-issue-handoff] cannot preserve rehydrated control-host launch provenance for ${input.claim.issue_identifier}: active run manifest provenance is incomplete or mismatched`
    );
    return buildClearedRehydratedLaunchProvenance();
  };

  const rehydrateNow = async (input?: {
    refreshTrackedIssueMetadata?: boolean;
  }): Promise<{ hasPendingClaims: boolean }> => {
    const now = isoTimestamp();
    const discoveredRuns = await discoverProviderIssueRunsForCurrentOperation();
    const runsByProviderIssue = groupProviderIssueRuns(discoveredRuns);
    let rehydrateRollbackSnapshot = captureProviderStateSnapshot();
    let hasPendingClaims = false;
    let publishRuntime = false;
    const rehydratePersistedSnapshotObserver = (snapshot: ProviderStateSnapshot): void => {
      rehydrateRollbackSnapshot = snapshot;
    };
    const restoreRehydrateRollbackSnapshot = (): void => {
      restoreProviderStateSnapshot(rehydrateRollbackSnapshot);
    };
    const assertRehydrateLifecycleCurrent = (): void => {
      try {
        assertRefreshLifecycleCurrent();
      } catch (error) {
        restoreRehydrateRollbackSnapshot();
        throw error;
      }
    };
    const upsertRehydratedProviderIntakeClaim = (
      input: Parameters<typeof upsertProviderIntakeClaim>[1]
    ): ProviderIntakeClaimRecord => {
      assertRehydrateLifecycleCurrent();
      return upsertProviderIntakeClaim(options.state, input);
    };
    const cleanupReleasedProviderWorkspaceWhenCurrent = async (
      input: Parameters<typeof cleanupReleasedProviderWorkspace>[0]
    ): Promise<void> => {
      assertRehydrateLifecycleCurrent();
      await cleanupReleasedProviderWorkspace({
        ...input,
        assertCurrent: assertRehydrateLifecycleCurrent
      });
      assertRehydrateLifecycleCurrent();
    };
    const buildAcceptedPendingRevalidationClaim = async (
      claim: ProviderIntakeClaimRecord,
      input?: {
        reason?: string;
        extraFields?: Partial<ProviderIntakeClaimRecord>;
        refreshTrackedIssueMetadata?: boolean;
      }
    ): Promise<Parameters<typeof upsertProviderIntakeClaim>[1]> => {
      const nextReason = input?.reason ?? 'provider_issue_rehydration_pending_revalidation';
      const baseClaim = {
        ...claim,
        ...input?.extraFields,
        launch_source: undefined,
        launch_token: undefined,
        state: 'accepted' as const,
        reason: nextReason,
        updated_at: now
      };
      const shouldRefreshPendingMetadata =
        input?.refreshTrackedIssueMetadata === true &&
        nextReason === 'provider_issue_rehydration_pending_revalidation';
      if (!shouldRefreshPendingMetadata) {
        return baseClaim;
      }

      const freshTrackedIssue = await resolveFreshTrackedIssueForActiveClaim(claim);
      const handoffReleaseEligibility =
        freshTrackedIssue.trackedIssue === null
          ? null
          : assessProviderTrackedIssueEligibility(freshTrackedIssue.trackedIssue, {
              hasExistingClaim: true
            });
      const shouldReleaseHandoffPendingClaim =
        handoffReleaseEligibility !== null &&
        shouldReleaseCachedPendingRevalidationHandoffClaim(
          { state: 'accepted', reason: nextReason },
          handoffReleaseEligibility
        );
      const releaseReason =
        freshTrackedIssue.releaseReason ??
        (shouldReleaseHandoffPendingClaim ? 'provider_issue_released:not_active' : null);
      if (releaseReason) {
        const releaseClaimFields = shouldReleaseHandoffPendingClaim
          ? freshTrackedIssue.claimFields
          : freshTrackedIssue.releaseClaimFields;
        const retainedRunIdentity = resolveReleasedClaimRetainedRunIdentity({
          claim,
          run: null,
          trackedIssue: freshTrackedIssue.trackedIssue,
          issueState: releaseClaimFields.issue_state ?? null,
          issueStateType: releaseClaimFields.issue_state_type ?? null
        });
        const releasedClaim = {
          ...claim,
          ...releaseClaimFields,
          launch_source: undefined,
          launch_token: undefined,
          ...retainedRunIdentity,
          state: 'released' as const,
          reason: releaseReason,
          retry_queued: null,
          retry_attempt: null,
          retry_due_at: null,
          retry_error: null,
          updated_at: now
        };
        publishRuntime ||= hasProviderClaimTransitioned(claim, releasedClaim);
        return releasedClaim;
      }

      return {
        ...baseClaim,
        ...freshTrackedIssue.claimFields
      };
    };

    const buildReleasedRehydratedTerminalClaim = (input: {
      claim: ProviderIntakeClaimRecord;
      run: ProviderIssueRunRecord | null;
      releaseReason?: string | null;
      releaseClaimFields?: ActiveClaimFreshTrackedIssueFields;
      trackedIssue?: ActiveClaimFreshTrackedIssueResolution['trackedIssue'];
    }): Parameters<typeof upsertProviderIntakeClaim>[1] => {
      const releaseClaimFields = input.releaseClaimFields ?? {};
      const retainedRunIdentity = resolveReleasedClaimRetainedRunIdentity({
        claim: input.claim,
        run: input.run,
        trackedIssue: input.trackedIssue ?? null,
        issueState: releaseClaimFields.issue_state ?? input.claim.issue_state,
        issueStateType: releaseClaimFields.issue_state_type ?? input.claim.issue_state_type
      });
      return {
        ...input.claim,
        ...releaseClaimFields,
        launch_source: undefined,
        launch_token: undefined,
        ...retainedRunIdentity,
        state: 'released' as const,
        reason: input.releaseReason ?? 'provider_issue_released:not_active',
        ...clearProviderRetryFields(),
        updated_at: now
      };
    };

    const resolveRehydratedTerminalIssueRelease = (input: {
      claim: ProviderIntakeClaimRecord;
      run: ProviderIssueRunRecord | null;
      freshTrackedIssue: ActiveClaimFreshTrackedIssueResolution;
    }): Parameters<typeof upsertProviderIntakeClaim>[1] | null => {
      if (input.freshTrackedIssue.releaseReason) {
        return buildReleasedRehydratedTerminalClaim({
          claim: input.claim,
          run: input.run,
          releaseReason: input.freshTrackedIssue.releaseReason,
          releaseClaimFields: input.freshTrackedIssue.releaseClaimFields,
          trackedIssue: input.freshTrackedIssue.trackedIssue
        });
      }
      if (input.freshTrackedIssue.useCachedClaimIssueState) {
        return null;
      }
      const refreshedClaim = {
        ...input.claim,
        ...input.freshTrackedIssue.claimFields
      };
      if (!isTerminalProviderIntakeIssueState(refreshedClaim)) {
        return null;
      }
      return buildReleasedRehydratedTerminalClaim({
        claim: input.claim,
        run: input.run,
        releaseClaimFields: input.freshTrackedIssue.claimFields,
        trackedIssue: input.freshTrackedIssue.trackedIssue
      });
    };

    const runRehydratedTerminalReleaseSideEffects = async (input: {
      claim: ProviderIntakeClaimRecord;
      releaseClaim: Parameters<typeof upsertProviderIntakeClaim>[1];
      run: ProviderIssueRunRecord | null;
    }): Promise<boolean> => {
      let hasPendingReleaseCancel = false;
      if (shouldAttemptReleaseCancel(input.run)) {
        await retryReleaseCancel({
          releaseRun: input.run,
          reason: input.releaseClaim.reason ?? 'provider_issue_released:not_active',
          assertCurrent: assertRehydrateLifecycleCurrent
        });
        hasPendingReleaseCancel = true;
      }
      if (canCleanupReleasedProviderWorkspace(input.run)) {
        await cleanupReleasedProviderWorkspaceWhenCurrent({
          repoRoot,
          taskId: input.run?.taskId ?? input.claim.task_id,
          manifestPath: input.run?.manifestPath ?? input.claim.run_manifest_path,
          issueId: input.claim.issue_id,
          issueIdentifier: input.claim.issue_identifier,
          providerWorkflowConfigStore: options.providerWorkflowConfigStore ?? null,
          runTerminalCleanup
        });
      }
      return hasPendingReleaseCancel;
    };

    const shouldReleasePlainCompletedRetryClaim = (
      candidate: ProviderIntakeClaimRecord
    ): boolean =>
      candidate.state === 'completed' &&
      candidate.reason === 'provider_issue_rehydrated_completed_run' &&
      candidate.retry_queued === true &&
      !candidate.review_promotion &&
      !candidate.merge_closeout;

    const runRehydrate = async (): Promise<{ hasPendingClaims: boolean }> => {
      for (const claim of [...options.state.claims]) {
        assertRehydrateLifecycleCurrent();
        const claimRuns = runsByProviderIssue.get(buildProviderIssueKey(claim.provider, claim.issue_id)) ?? [];
        const attachableClaimRuns = filterProviderIssueRunsForStartPipeline(claimRuns, startPipelineId);
        const releasedRun =
          claim.state === 'released' ? resolveProviderReleaseRun(claim, attachableClaimRuns) : null;
        // Manifest-less inflight claims belong to a fresh launch attempt, so they
        // must not collapse onto older terminal-completed runs from prior sessions.
        const manifestlessDetachedClaim =
          (
            claim.state === 'starting' ||
            claim.state === 'resuming' ||
            claim.state === 'handoff_failed'
          ) &&
          !claim.run_manifest_path &&
          !claim.run_id;
        if (claim.state === 'released') {
          const activeRun = attachableClaimRuns.find((run) => run.status === 'in_progress');
          const releasedPendingReopen = isProviderIssueReleasedPendingReopen(claim.reason);
          const releasedLiveWorkerRehydrateCandidate =
            isProviderIssueReleasedLiveWorkerRehydrateCandidate(claim);
          const activeRunReleaseCancelPending = hasPendingReleaseCancel(
            activeRun?.manifestPath ?? releasedRun?.manifestPath
          );
          const shouldRefreshReleasedActiveRunIssue =
            activeRun !== undefined &&
            releasedLiveWorkerRehydrateCandidate &&
            (
              releasedPendingReopen
                ? input?.refreshTrackedIssueMetadata === true || resolveTrackedIssueWhenNotStuck !== null
                : input?.refreshTrackedIssueMetadata === true
            );
          const freshTrackedIssue =
            shouldRefreshReleasedActiveRunIssue
              ? await resolveFreshTrackedIssueForActiveClaim(claim)
              : buildActiveClaimFreshTrackedIssueFallback(releasedPendingReopen);
          const allowCachedStartedWorkerIssue =
            releasedPendingReopen && freshTrackedIssue.useCachedClaimIssueState;
          const startedWorkerIssue =
            freshTrackedIssue.trackedIssue !== null
              ? isProviderStartedWorkerTrackedIssue(freshTrackedIssue.trackedIssue)
              : allowCachedStartedWorkerIssue && isProviderStartedWorkerClaim(claim);
          if (
            activeRun &&
            !activeRunReleaseCancelPending &&
            releasedLiveWorkerRehydrateCandidate &&
            startedWorkerIssue
          ) {
            const workerHost = resolveRehydratedActiveRunWorkerHost(activeRun, claim);
            const launchProvenance = await resolveRehydratedActiveRunLaunchProvenance({
              claim,
              activeRun
            });
            const trackedIssueFields = freshTrackedIssue.claimFields;
            const reactivatedMergeCloseoutReset =
              claim.reason === 'provider_issue_rehydrated_active_run'
                ? {}
                : { review_promotion: null, merge_closeout: null };
            publishRuntime ||= hasProviderClaimTransitioned(claim, {
              ...trackedIssueFields,
              state: 'running',
              reason: 'provider_issue_rehydrated_active_run',
              task_id: activeRun.taskId,
              run_id: activeRun.runId,
              run_manifest_path: activeRun.manifestPath,
              worker_host: workerHost,
              ...launchProvenance,
              ...buildActiveRunRetryFields(claim),
              ...reactivatedMergeCloseoutReset
            });
            upsertRehydratedProviderIntakeClaim({
              ...claim,
              ...trackedIssueFields,
              ...launchProvenance,
              task_id: activeRun.taskId,
              state: 'running',
              reason: 'provider_issue_rehydrated_active_run',
              run_id: activeRun.runId,
              run_manifest_path: activeRun.manifestPath,
              worker_host: workerHost,
              ...buildActiveRunRetryFields(claim),
              ...reactivatedMergeCloseoutReset,
              updated_at: now
            });
            hasPendingClaims = true;
            continue;
          }
          if (activeRunReleaseCancelPending) {
            hasPendingClaims = true;
          }
          const releaseClaimFields = freshTrackedIssue.releaseClaimFields;
          const releaseReason =
            freshTrackedIssue.releaseReason ?? claim.reason ?? 'provider_issue_released';
          const releasedRunForActiveClaim = releasedRun ?? activeRun ?? null;
          const retainedRunIdentity = resolveReleasedClaimRetainedRunIdentity({
            claim,
            run: releasedRunForActiveClaim,
            trackedIssue: freshTrackedIssue.trackedIssue,
            issueState: releaseClaimFields.issue_state ?? null,
            issueStateType: releaseClaimFields.issue_state_type ?? null
          });
          const releasedClaimTransitioned = hasProviderClaimTransitioned(claim, {
            ...releaseClaimFields,
            state: 'released',
            reason: releaseReason,
            ...retainedRunIdentity
          });
          publishRuntime ||= releasedClaimTransitioned;
          upsertRehydratedProviderIntakeClaim({
            ...claim,
            ...releaseClaimFields,
            launch_source: undefined,
            launch_token: undefined,
            ...retainedRunIdentity,
            state: 'released',
            reason: releaseReason,
            updated_at: releasedClaimTransitioned ? now : claim.updated_at
          });
          if (shouldAttemptReleaseCancel(releasedRun)) {
            hasPendingClaims = true;
          }
          if (
            shouldCleanupReleasedProviderWorkspace(claim) &&
            canCleanupReleasedProviderWorkspace(releasedRun)
          ) {
            await cleanupReleasedProviderWorkspaceWhenCurrent({
              repoRoot,
              taskId: releasedRun?.taskId ?? claim.task_id,
              manifestPath: releasedRun?.manifestPath ?? claim.run_manifest_path,
              issueId: claim.issue_id,
              issueIdentifier: claim.issue_identifier,
              providerWorkflowConfigStore: options.providerWorkflowConfigStore ?? null,
              runTerminalCleanup
            });
          }
          continue;
        }

        const activeRun = attachableClaimRuns.find((run) => run.status === 'in_progress');
        if (activeRun) {
          const workerHost = resolveRehydratedActiveRunWorkerHost(activeRun, claim);
          const launchProvenance = await resolveRehydratedActiveRunLaunchProvenance({
            claim,
            activeRun
          });
          const preserveMergeCloseoutClaim =
            isProviderMergeCloseoutWatchingClaim(claim) || isTerminalProviderMergeCloseoutClaim(claim);
          const freshTrackedIssue = input?.refreshTrackedIssueMetadata
            ? await resolveFreshTrackedIssueForActiveClaim(claim)
            : buildActiveClaimFreshTrackedIssueFallback(true);
          const terminalReleaseClaim = resolveRehydratedTerminalIssueRelease({
            claim,
            run: activeRun,
            freshTrackedIssue
          });
          if (terminalReleaseClaim) {
            publishRuntime ||= hasProviderClaimTransitioned(claim, terminalReleaseClaim);
            upsertRehydratedProviderIntakeClaim(terminalReleaseClaim);
            const hasPendingReleaseCancel = await runRehydratedTerminalReleaseSideEffects({
              claim,
              releaseClaim: terminalReleaseClaim,
              run: activeRun
            });
            hasPendingClaims ||= hasPendingReleaseCancel;
            continue;
          }
          const mergeTrackedIssue = freshTrackedIssue.trackedIssue;
          if (preserveMergeCloseoutClaim && !mergeTrackedIssue) {
            hasPendingClaims = true;
            continue;
          }
          if (mergeTrackedIssue && Object.keys(freshTrackedIssue.claimFields).length > 0) {
            const mergeCloseoutClaim = await maybeHandleRecoveredActiveRunMergedCloseout({
              claim,
              trackedIssue: mergeTrackedIssue,
              latestRun: activeRun
            });
            if (mergeCloseoutClaim) {
              hasPendingClaims = true;
              continue;
            }
          }
          const trackedIssueFields = freshTrackedIssue.claimFields;
          const reactivatedMergeCloseoutReset =
            claim.reason === 'provider_issue_rehydrated_active_run'
              ? {}
              : { review_promotion: null, merge_closeout: null };
          publishRuntime ||= hasProviderClaimTransitioned(claim, {
            ...trackedIssueFields,
            state: 'running',
            reason: 'provider_issue_rehydrated_active_run',
            task_id: activeRun.taskId,
            run_id: activeRun.runId,
            run_manifest_path: activeRun.manifestPath,
            worker_host: workerHost,
            ...launchProvenance,
            ...buildActiveRunRetryFields(claim),
            ...reactivatedMergeCloseoutReset
          });
          upsertRehydratedProviderIntakeClaim({
            ...claim,
            ...trackedIssueFields,
            ...launchProvenance,
            task_id: activeRun.taskId,
            state: 'running',
            reason: 'provider_issue_rehydrated_active_run',
            run_id: activeRun.runId,
            run_manifest_path: activeRun.manifestPath,
            worker_host: workerHost,
            ...buildActiveRunRetryFields(claim),
            ...reactivatedMergeCloseoutReset,
            updated_at: now
          });
          hasPendingClaims = true;
          continue;
        }

        const resumableRun = attachableClaimRuns.find(
          (run) => run.status !== null && RESUME_ELIGIBLE_STATUSES.has(run.status)
        );
        if (resumableRun) {
          const freshTrackedIssue = input?.refreshTrackedIssueMetadata
            ? await resolveFreshTrackedIssueForActiveClaim(claim)
            : buildActiveClaimFreshTrackedIssueFallback(true);
          const terminalReleaseClaim = resolveRehydratedTerminalIssueRelease({
            claim,
            run: resumableRun,
            freshTrackedIssue
          });
          if (terminalReleaseClaim) {
            publishRuntime ||= hasProviderClaimTransitioned(claim, terminalReleaseClaim);
            upsertRehydratedProviderIntakeClaim(terminalReleaseClaim);
            const hasPendingReleaseCancel = await runRehydratedTerminalReleaseSideEffects({
              claim,
              releaseClaim: terminalReleaseClaim,
              run: resumableRun
            });
            hasPendingClaims ||= hasPendingReleaseCancel;
            continue;
          }
          const queuedRetryFields = buildQueuedProviderRetryFields({
            claim,
            previousRun: resumableRun,
            error: resolveProviderRetryErrorFromRun(resumableRun),
            preserveCurrentAttempt: claim.retry_queued === true,
            preserveExistingDueAt: claim.retry_queued === true,
            delayType: 'failure'
          });
          const workerHost = resolveRehydratedActiveRunWorkerHost(resumableRun, claim);
          const trackedIssueFields = freshTrackedIssue.claimFields;
          publishRuntime ||= hasProviderClaimTransitioned(claim, {
            ...trackedIssueFields,
            state: 'resumable',
            reason: 'provider_issue_rehydrated_resumable_run',
            task_id: resumableRun.taskId,
            run_id: resumableRun.runId,
            run_manifest_path: resumableRun.manifestPath,
            worker_host: workerHost,
            ...queuedRetryFields
          });
          upsertRehydratedProviderIntakeClaim({
            ...claim,
            ...trackedIssueFields,
            launch_source: undefined,
            launch_token: undefined,
            task_id: resumableRun.taskId,
            state: 'resumable',
            reason: 'provider_issue_rehydrated_resumable_run',
            run_id: resumableRun.runId,
            run_manifest_path: resumableRun.manifestPath,
            worker_host: workerHost,
            ...queuedRetryFields,
            updated_at: now
          });
          continue;
        }

        const matchedCompletedRun = resolveProviderClaimRunIdentity(claim, attachableClaimRuns);
        const completedRun =
          matchedCompletedRun?.status === 'succeeded'
            ? matchedCompletedRun
            : claim.run_id || claim.run_manifest_path
              ? null
              : attachableClaimRuns.find((run) => run.status === 'succeeded');
        if (
          completedRun &&
          (
            !manifestlessDetachedClaim ||
            didRunMatchClaimAttempt(claim, completedRun)
          )
        ) {
          let completedClaim = claim;
          if (
            input?.refreshTrackedIssueMetadata ||
            shouldForceTrackedIssueMetadataRefreshForCompletedClaim(claim)
          ) {
            const freshTrackedIssue = await resolveFreshTrackedIssueForActiveClaim(claim);
            if (freshTrackedIssue.trackedIssue) {
              completedClaim = {
                ...completedClaim,
                ...freshTrackedIssue.claimFields
              };
              const reviewPromotionClaim = await maybeHandleReviewHandoffPromotion({
                claim: completedClaim,
                trackedIssue: freshTrackedIssue.trackedIssue,
                latestRun: completedRun
              });
              if (reviewPromotionClaim) {
                hasPendingClaims = true;
                continue;
              }
              if (
                shouldAttemptDeterministicMergeCloseoutForRecoveredRun({
                  claim: completedClaim,
                  trackedIssue: freshTrackedIssue.trackedIssue,
                  run: completedRun
                })
              ) {
                const mergeCloseoutClaim = await maybeHandleDeterministicMergingCloseout({
                  claim: completedClaim,
                  trackedIssue: freshTrackedIssue.trackedIssue,
                  latestRun: completedRun
                });
                if (mergeCloseoutClaim) {
                  hasPendingClaims = true;
                  continue;
                }
              }
            } else {
              if (shouldReleasePlainCompletedRetryClaim(completedClaim)) {
                const terminalReleaseClaim = resolveRehydratedTerminalIssueRelease({
                  claim: completedClaim,
                  run: completedRun,
                  freshTrackedIssue
                });
                if (terminalReleaseClaim) {
                  publishRuntime ||= hasProviderClaimTransitioned(claim, terminalReleaseClaim);
                  upsertRehydratedProviderIntakeClaim(terminalReleaseClaim);
                  const hasPendingReleaseCancel = await runRehydratedTerminalReleaseSideEffects({
                    claim,
                    releaseClaim: terminalReleaseClaim,
                    run: completedRun
                  });
                  hasPendingClaims ||= hasPendingReleaseCancel;
                  continue;
                }
              }
              const hasFreshReleaseIssueMetadata =
                freshTrackedIssue.releaseClaimFields.issue_state !== undefined ||
                freshTrackedIssue.releaseClaimFields.issue_state_type !== undefined ||
                freshTrackedIssue.releaseClaimFields.issue_updated_at !== undefined;
              if (
                hasFreshReleaseIssueMetadata &&
                (
                  shouldApplySupersededTerminalMergeCloseoutReleaseClaim({
                    releaseReason: freshTrackedIssue.releaseReason,
                    claim: {
                      ...completedClaim,
                      ...freshTrackedIssue.releaseClaimFields
                    }
                  }) ||
                  shouldApplySupersededTransitionFailedMergeCloseoutReleaseClaim({
                    releaseReason: freshTrackedIssue.releaseReason,
                    claim: completedClaim,
                    nextIssueState:
                      freshTrackedIssue.releaseClaimFields.issue_state ?? completedClaim.issue_state,
                    nextIssueStateType:
                      freshTrackedIssue.releaseClaimFields.issue_state_type ??
                      completedClaim.issue_state_type,
                    nextIssueUpdatedAt:
                      freshTrackedIssue.releaseClaimFields.issue_updated_at ??
                      completedClaim.issue_updated_at
                  })
                )
              ) {
                completedClaim = {
                  ...completedClaim,
                  ...freshTrackedIssue.releaseClaimFields
                };
              }
            }
          }
          const completedState = buildProviderCompletedRunRehydrateState({
            claim: completedClaim,
            run: completedRun,
            preserveCurrentAttempt: completedClaim.retry_queued === true,
            preserveExistingDueAt: completedClaim.retry_queued === true,
            queueContinuationRetry: shouldQueuePostWorkerRetryClaim(completedClaim)
          });
          const nextCompletedClaim = {
            ...completedClaim,
            launch_source: undefined,
            launch_token: undefined,
            ...completedState,
            updated_at: now
          };
          publishRuntime ||= hasProviderClaimTransitioned(claim, nextCompletedClaim);
          upsertRehydratedProviderIntakeClaim({
            ...nextCompletedClaim
          });
          continue;
        }

        if (
          shouldReleasePlainCompletedRetryClaim(claim) &&
          hasConcreteRetainedRunIdentity(claim) &&
          input?.refreshTrackedIssueMetadata === true
        ) {
          const freshTrackedIssue = await resolveFreshTrackedIssueForActiveClaim(claim);
          const terminalReleaseClaim = resolveRehydratedTerminalIssueRelease({
            claim,
            run: null,
            freshTrackedIssue
          });
          if (terminalReleaseClaim) {
            publishRuntime ||= hasProviderClaimTransitioned(claim, terminalReleaseClaim);
            upsertRehydratedProviderIntakeClaim(terminalReleaseClaim);
            continue;
          }
        }

        if (claim.state === 'starting' || claim.state === 'resuming') {
          const queuedRun = attachableClaimRuns.find((run) => run.status === 'queued');
          if (queuedRun) {
            if (isProviderClaimRehydrationTimedOut(claim, now)) {
              const queuedRetryFields = buildQueuedProviderRetryFields({
                claim,
                previousRun: null,
                error: 'provider_issue_rehydration_timeout',
                preserveCurrentAttempt: true,
                delayType: 'failure'
              });
              publishRuntime ||= hasProviderClaimTransitioned(claim, {
                state: 'handoff_failed',
                reason: 'provider_issue_rehydration_timeout',
                task_id: queuedRun.taskId,
                run_id: queuedRun.runId,
                run_manifest_path: queuedRun.manifestPath,
                ...queuedRetryFields
              });
              upsertRehydratedProviderIntakeClaim({
                ...claim,
                launch_source: undefined,
                launch_token: undefined,
                task_id: queuedRun.taskId,
                state: 'handoff_failed',
                reason: 'provider_issue_rehydration_timeout',
                run_id: queuedRun.runId,
                run_manifest_path: queuedRun.manifestPath,
                ...queuedRetryFields,
                updated_at: now
              });
              continue;
            }

            publishRuntime ||= hasProviderClaimTransitioned(claim, {
              state: claim.state,
              reason: 'provider_issue_rehydrated_queued_run',
              task_id: queuedRun.taskId,
              run_id: queuedRun.runId,
              run_manifest_path: queuedRun.manifestPath
            });
            upsertRehydratedProviderIntakeClaim({
              ...claim,
              launch_source: undefined,
              launch_token: undefined,
              task_id: queuedRun.taskId,
              state: claim.state,
              reason: 'provider_issue_rehydrated_queued_run',
              run_id: queuedRun.runId,
              run_manifest_path: queuedRun.manifestPath,
              updated_at: claim.updated_at
            });
            hasPendingClaims = true;
            continue;
          }

          if (isProviderClaimRehydrationTimedOut(claim, now)) {
            const queuedRetryFields = buildQueuedProviderRetryFields({
              claim,
              previousRun: null,
              error: 'provider_issue_rehydration_timeout',
              preserveCurrentAttempt: true,
              delayType: 'failure'
            });
            publishRuntime ||= hasProviderClaimTransitioned(claim, {
              state: 'handoff_failed',
              reason: 'provider_issue_rehydration_timeout',
              task_id: claim.task_id,
              run_id: claim.run_id,
              run_manifest_path: claim.run_manifest_path,
              ...queuedRetryFields
            });
            upsertRehydratedProviderIntakeClaim({
              ...claim,
              launch_source: undefined,
              launch_token: undefined,
              state: 'handoff_failed',
              reason: 'provider_issue_rehydration_timeout',
              ...queuedRetryFields,
              updated_at: now
            });
            continue;
          }

          hasPendingClaims = true;
          continue;
        }

        if (claim.state === 'accepted') {
          if (hasQueuedProviderIntakeRetry(claim)) {
            if (!isValidProviderRetryTimestamp(claim.retry_due_at)) {
              const queuedRetryFields = buildQueuedProviderRetryFields({
                claim,
                previousRun: null,
                error: claim.retry_error ?? null,
                preserveCurrentAttempt: true,
                preserveExistingDueAt: true,
                delayType: resolveProviderRetryDelayType({
                  claim,
                  previousRun: null
                })
              });
              const nextReason = claim.reason ?? 'provider_issue_rehydration_pending_revalidation';
              const nextClaim = await buildAcceptedPendingRevalidationClaim(claim, {
                reason: nextReason,
                extraFields: queuedRetryFields,
                refreshTrackedIssueMetadata: input?.refreshTrackedIssueMetadata === true
              });
              publishRuntime ||= hasProviderClaimTransitioned(claim, nextClaim);
              upsertRehydratedProviderIntakeClaim(nextClaim);
            } else if (input?.refreshTrackedIssueMetadata === true) {
              const nextReason = claim.reason ?? 'provider_issue_rehydration_pending_revalidation';
              const nextClaim = await buildAcceptedPendingRevalidationClaim(claim, {
                reason: nextReason,
                refreshTrackedIssueMetadata: true
              });
              publishRuntime ||= hasProviderClaimTransitioned(claim, nextClaim);
              upsertRehydratedProviderIntakeClaim(nextClaim);
            }
            continue;
          }
          const nextClaim = await buildAcceptedPendingRevalidationClaim(claim, {
            reason: 'provider_issue_rehydration_pending_revalidation',
            refreshTrackedIssueMetadata: input?.refreshTrackedIssueMetadata === true
          });
          publishRuntime ||= hasProviderClaimTransitioned(claim, nextClaim);
          upsertRehydratedProviderIntakeClaim(nextClaim);
        }

        if (claim.state === 'running' || claim.state === 'resumable') {
          const nextClaim = await buildAcceptedPendingRevalidationClaim(claim, {
            reason: 'provider_issue_rehydration_pending_revalidation',
            refreshTrackedIssueMetadata: input?.refreshTrackedIssueMetadata === true
          });
          publishRuntime ||= hasProviderClaimTransitioned(claim, nextClaim);
          upsertRehydratedProviderIntakeClaim(nextClaim);
          continue;
        }
      }

      assertRehydrateLifecycleCurrent();
      markProviderIntakeRehydrated(options.state, now);
      await persistStateOrRollback(rehydrateRollbackSnapshot, { rollbackOnPersistFailure: false });
      if (publishRuntime) {
        assertRefreshLifecycleCurrent();
        options.publishRuntime?.('provider-intake.rehydrate');
      }
      return { hasPendingClaims };
    };

    return await providerStatePersistedSnapshotObserverScope.run(
      rehydratePersistedSnapshotObserver,
      async () => {
        try {
          return await runRehydrate();
        } catch (error) {
          if (isRefreshLifecycleStuckError(error)) {
            restoreRehydrateRollbackSnapshot();
          }
          throw error;
        }
      }
    );
  };

  const ensureQueuedProviderRetryDeadline = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    previousRun: ProviderIssueRunRecord | null;
    trackedIssueRefetch: ProviderTrackedIssueRefetch | null;
  }): Promise<ProviderIntakeClaimRecord> => {
    if (!hasQueuedProviderIntakeRetry(input.claim)) {
      return input.claim;
    }
    if (isValidProviderRetryTimestamp(input.claim.retry_due_at)) {
      if (input.trackedIssueRefetch) {
        queuedRetryTrackedIssueRefetches.set(input.claim.provider_key, input.trackedIssueRefetch);
      }
      const trackedIssueFields = buildTrackedIssueClaimFields(input.trackedIssue);
      const transitioned = hasProviderClaimTransitioned(input.claim, {
        ...trackedIssueFields,
        state: input.claim.state,
        reason: input.claim.reason,
        task_id: input.claim.task_id,
        run_id: input.claim.run_id,
        run_manifest_path: input.claim.run_manifest_path,
        retry_queued: input.claim.retry_queued,
        retry_attempt: input.claim.retry_attempt,
        retry_due_at: input.claim.retry_due_at,
        retry_error: input.claim.retry_error
      });
      if (!transitioned) {
        return input.claim;
      }
      const queuedRetrySnapshot = captureProviderStateSnapshot();
      const nextClaim = upsertProviderIntakeClaim(options.state, {
        ...input.claim,
        ...trackedIssueFields
      });
      await persistStateOrRollback(queuedRetrySnapshot);
      options.publishRuntime?.('provider-intake.refresh');
      return nextClaim;
    }

    const queuedRetryFields = buildQueuedProviderRetryFields({
      claim: input.claim,
      previousRun: input.previousRun,
      error: input.claim.retry_error ?? resolveProviderRetryErrorFromRun(input.previousRun),
      preserveCurrentAttempt: true,
      preserveExistingDueAt: true,
      delayType: resolveProviderRetryDelayType({
        claim: input.claim,
        previousRun: input.previousRun
      })
    });
    const queuedRetrySnapshot = captureProviderStateSnapshot();
    const nextClaim = upsertProviderIntakeClaim(options.state, {
      ...input.claim,
      ...buildTrackedIssueClaimFields(input.trackedIssue),
      task_id: input.previousRun?.taskId ?? input.claim.task_id,
      run_id: input.previousRun?.runId ?? input.claim.run_id,
      run_manifest_path: input.previousRun?.manifestPath ?? input.claim.run_manifest_path,
      ...queuedRetryFields
    });
    if (input.trackedIssueRefetch) {
      queuedRetryTrackedIssueRefetches.set(nextClaim.provider_key, input.trackedIssueRefetch);
    }
    await persistStateOrRollback(queuedRetrySnapshot);
    options.publishRuntime?.('provider-intake.refresh');
    return nextClaim;
  };

  const resolveRefreshTrackedIssueResolution = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssuesByKey?: Map<string, LiveLinearTrackedIssue> | null;
    consumedTrackedIssueKeys?: Set<string>;
    allowPollFailClosed?: boolean;
    allowReleasedPollFailClosed?: boolean;
    allowDirectIssueById?: boolean;
    releaseOnlyCachedPendingRevalidation?: boolean;
    onDirectIssueById?: () => void;
    onDirectIssueByIdResult?: (result: {
      consumesPreDiscoveryNonActiveBudget: boolean;
    }) => void;
  }): Promise<ProviderTrackedIssueRefreshDisposition> => {
    if (shouldAbortRefreshCycle()) {
      return buildRefreshCycleStuckSkipResolution();
    }
    if (input.trackedIssuesByKey) {
      const providerKey = buildProviderIssueKey(input.claim.provider, input.claim.issue_id);
      if (input.trackedIssuesByKey.has(providerKey)) {
        input.consumedTrackedIssueKeys?.add(providerKey);
      }
      return await resolveTrackedIssuePollResolutionWithFallback(
        input.claim,
        input.trackedIssuesByKey,
        resolveTrackedIssueWhenNotStuck,
        {
          allowPollFailClosed: input.allowPollFailClosed === true,
          allowReleasedPollFailClosed: input.allowReleasedPollFailClosed === true,
          allowDirectIssueById: input.allowDirectIssueById !== false,
          releaseOnlyCachedPendingRevalidation:
            input.releaseOnlyCachedPendingRevalidation === true,
          onDirectIssueById: input.onDirectIssueById,
          onDirectIssueByIdResult: input.onDirectIssueByIdResult
        }
      );
    }

    const failClosedReason =
      (input.allowPollFailClosed === true
        ? resolveProviderIssuePollFailClosedReason(input.claim)
        : null) ??
      (input.allowReleasedPollFailClosed === true
        ? resolveReleasedProviderIssuePollFailClosedReason(input.claim)
        : null);
    const shouldRevalidateCachedPendingClaim =
      failClosedReason === 'provider_issue_poll_cached_revalidation_pending' &&
      input.allowDirectIssueById !== false;
    if (failClosedReason && !shouldRevalidateCachedPendingClaim) {
      return {
        kind: 'skip',
        reason: failClosedReason
      };
    }
    if (input.allowDirectIssueById === false) {
      return {
        kind: 'skip',
        reason: 'provider_issue_poll_deferred_for_fresh_discovery'
      };
    }

    if (!resolveTrackedIssueWhenNotStuck) {
      return { kind: 'skip', reason: 'provider_issue_refresh_resolution_unavailable' };
    }

    input.onDirectIssueById?.();
    const resolution = await resolveTrackedIssueWhenNotStuck({
      provider: input.claim.provider,
      issueId: input.claim.issue_id
    });
    if (resolution.kind === 'ready') {
      const authority = assessProviderTrackedIssueEligibility(resolution.trackedIssue, {
        hasExistingClaim: true
      });
      if (authority.eligible) {
        return authority.claimReason === 'provider_issue_handoff_owned'
          ? { kind: 'owned', trackedIssue: resolution.trackedIssue }
          : resolution;
      }
      return {
        kind: 'release',
        reason: stripProviderIssueReleasedPrefix(authority.releaseReason),
        source: 'direct_issue_by_id',
        trackedIssue: resolution.trackedIssue,
        cleanupWorkspace: authority.cleanupWorkspace
      };
    }
    if (resolution.kind === 'release') {
      return {
        kind: 'release',
        reason: resolution.reason,
        source: 'direct_issue_by_id',
        trackedIssue: null,
        cleanupWorkspace: false
      };
    }
    return resolution;
  };

  const canRefreshRetainedReleasedNotActiveClaimMetadataOnly = (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'updated_at' | 'blocked_by'>;
  }): boolean => {
    const claimReason = input.claim.reason ?? null;
    if (
      input.claim.state !== 'released' ||
      (
        claimReason !== 'provider_issue_released:not_active' &&
        !isProviderIssueReleasedPendingReopen(claimReason)
      )
    ) {
      return false;
    }
    const trackedIssueWorkflowState = classifyProviderLinearWorkflowState({
      state: input.trackedIssue.state,
      state_type: input.trackedIssue.state_type
    });
    return (
      (
        trackedIssueWorkflowState.normalizedStateType === 'started' ||
        isProviderLinearTrackedIssueEligibleForExecution(input.trackedIssue)
      ) &&
      isTrackedIssueFreshEnoughForClaim(input.claim, input.trackedIssue)
    );
  };

  const shouldPromoteRetainedReleasedNotActiveClaimPendingReopen = (input: {
    claim: Pick<
      ProviderIntakeClaimRecord,
      | 'state'
      | 'reason'
      | 'issue_state'
      | 'issue_state_type'
      | 'issue_updated_at'
      | 'issue_blocked_by'
      | 'merge_closeout'
    >;
    releaseRun: ProviderIssueRunRecord | null;
    trackedIssue: Pick<
      LiveLinearTrackedIssue,
      | 'updated_at'
      | 'state'
      | 'state_type'
      | 'archived_at'
      | 'trashed'
      | 'viewer_id'
      | 'assignee_id'
      | 'blocked_by'
    >;
  }): boolean => {
    if (!isProviderLinearTrackedIssueEligibleForExecution(input.trackedIssue)) {
      return false;
    }
    const latestReleasedIssueUpdatedAt = selectMostRecentTrackedIssueUpdatedAt(
      input.claim.issue_updated_at ?? null,
      resolveReleasedRunIssueUpdatedAtForReclaim(input.claim, input.releaseRun)
    );
    const updatedAtComparison = compareTrackedIssueUpdatedAt({
      existingIssueUpdatedAt: latestReleasedIssueUpdatedAt,
      nextIssueUpdatedAt: input.trackedIssue.updated_at
    });
    return (
      updatedAtComparison === 'newer' ||
      (
        updatedAtComparison === 'equal' &&
        shouldReopenReleasedClaimAtCurrentTimestamp({
          claim: input.claim,
          trackedIssue: input.trackedIssue
        })
      )
    );
  };

  const refreshRetainedReleasedNotActiveClaimMetadata = async (input: {
    claim: ProviderIntakeClaimRecord;
    releaseRun: ProviderIssueRunRecord | null;
    trackedIssue: Pick<
      LiveLinearTrackedIssue,
      | 'updated_at'
      | 'state'
      | 'state_type'
      | 'blocked_by'
      | 'archived_at'
      | 'trashed'
      | 'viewer_id'
      | 'assignee_id'
    >;
  }): Promise<ProviderIntakeClaimRecord> => {
    if (!canRefreshRetainedReleasedNotActiveClaimMetadataOnly(input)) {
      return input.claim;
    }
    const nextReason =
      shouldPromoteRetainedReleasedNotActiveClaimPendingReopen({
        claim: input.claim,
        releaseRun: input.releaseRun,
        trackedIssue: input.trackedIssue
      })
        ? markProviderIssueReleasedPendingReopen(input.claim.reason ?? null)
        : input.claim.reason;
    const trackedIssueFields: Partial<
      Pick<
        ProviderIntakeClaimRecord,
        'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'issue_blocked_by'
      >
    > = {
      issue_state: input.trackedIssue.state,
      issue_state_type: input.trackedIssue.state_type,
      issue_updated_at: input.trackedIssue.updated_at
    };
    if (
      isPlainReleasedBlockedByCompletedOnlyClaim(input.claim) &&
      input.trackedIssue.blocked_by !== undefined
    ) {
      const nonTerminalBlockers = filterNonTerminalProviderIssueBlockers(
        input.trackedIssue.blocked_by
      );
      trackedIssueFields.issue_blocked_by = nonTerminalBlockers;
    }
    const transitioned = hasProviderClaimTransitioned(input.claim, {
      ...trackedIssueFields,
      state: 'released',
      reason: nextReason,
      task_id: input.claim.task_id,
      run_id: input.claim.run_id,
      run_manifest_path: input.claim.run_manifest_path
    });
    if (!transitioned) {
      return input.claim;
    }
    const refreshedClaim = await upsertProviderClaimAndPersist({
      ...input.claim,
      ...trackedIssueFields,
      launch_source: undefined,
      launch_token: undefined,
      task_id: input.claim.task_id,
      state: 'released',
      reason: nextReason,
      run_id: input.claim.run_id,
      run_manifest_path: input.claim.run_manifest_path
    });
    options.publishRuntime?.('provider-intake.refresh');
    return refreshedClaim;
  };

  const resolveRetryDispatchResolutionFromPoll = async (
    claim: ProviderIntakeClaimRecord
  ):
    Promise<
      | ProviderTrackedIssueRefreshDisposition
      | { kind: 'skip'; reason: string }
      | null
    > => {
    const trackedIssueRefetch = wrapTrackedIssueRefetch(
      options.resolveTrackedIssues ??
        queuedRetryTrackedIssueRefetches.get(claim.provider_key) ??
        null
    );
    if (!trackedIssueRefetch) {
      return null;
    }

    const resolution = await trackedIssueRefetch();
    if (resolution.kind === 'skip') {
      return resolution;
    }
    return await resolveTrackedIssuePollResolutionWithFallback(
      claim,
      buildTrackedIssuePollMap(resolution.trackedIssues),
      resolveTrackedIssueWhenNotStuck
    );
  };

  const resolveRefreshPollInput = async (): Promise<ProviderIssueHandoffPollInput | undefined> => {
    const resolveTrackedIssuesWhenNotStuck = wrapTrackedIssueRefetch(options.resolveTrackedIssues);
    if (!resolveTrackedIssuesWhenNotStuck || shouldAbortRefreshCycle()) {
      return undefined;
    }
    const resolution = await resolveTrackedIssuesWhenNotStuck();
    if (resolution.kind === 'skip') {
      return undefined;
    }
    return {
      trackedIssues: resolution.trackedIssues,
      refetchTrackedIssues: resolveTrackedIssuesWhenNotStuck
    };
  };

  const retainOwnedHandoffClaim = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    run?: ProviderIssueRunRecord | null;
    state?: ProviderIntakeClaimRecord['state'];
    reason?: string;
    claimMetadata?: Partial<
      Pick<
        ProviderIntakeClaimRecord,
        'accepted_at' | 'last_delivery_id' | 'last_event' | 'last_action' | 'last_webhook_timestamp'
      >
    >;
  }): Promise<ProviderIntakeClaimRecord> =>
    await upsertProviderClaimAndPersist({
      ...input.claim,
      ...buildTrackedIssueClaimFields(input.trackedIssue),
      ...(input.claimMetadata ?? {}),
      task_id: input.run?.taskId ?? input.claim.task_id,
      state: input.state ?? input.claim.state,
      reason: input.reason ?? 'provider_issue_handoff_owned',
      run_id: input.run?.runId ?? input.claim.run_id,
      run_manifest_path: input.run?.manifestPath ?? input.claim.run_manifest_path,
      worker_host: input.run
        ? resolveRehydratedActiveRunWorkerHost(input.run, input.claim)
        : input.claim.worker_host,
    });

  const resolveRetryDispatchResolution = async (
    claim: ProviderIntakeClaimRecord
  ): Promise<ProviderTrackedIssueRefreshDisposition> => {
    const pollResolution = await resolveRetryDispatchResolutionFromPoll(claim);
    if (pollResolution) {
      return pollResolution;
    }

    if (!options.resolveTrackedIssue) {
      const trackedIssue = buildTrackedIssueSnapshotFromClaim(
        claim,
        resolveProviderViewerAuthFingerprint()
      );
      const authority = assessProviderTrackedIssueEligibility(trackedIssue, {
        hasExistingClaim: true
      });
      if (authority.eligible) {
        return authority.claimReason === 'provider_issue_handoff_owned'
          ? { kind: 'owned', trackedIssue }
          : { kind: 'ready', trackedIssue };
      }
      return {
        kind: 'release',
        reason: stripProviderIssueReleasedPrefix(authority.releaseReason),
        trackedIssue,
        cleanupWorkspace: authority.cleanupWorkspace
      };
    }

    return await resolveRefreshTrackedIssueResolution({ claim });
  };

  async function dispatchQueuedProviderRetry(providerKey: string, expectedDueAt: string): Promise<void> {
    await runOutsideConfiguredWorkerHostsScope(async () => {
      await runOutsideRefreshLifecycleScope(() => runWithFreshProviderIssueRunDiscoveryCache(async () => {
        await runWithRefreshLifecycleLock(async () => {
          const claim = readProviderIntakeClaim(options.state, providerKey);
          if (
            !claim ||
            claim.retry_queued !== true ||
            claim.retry_due_at !== expectedDueAt
          ) {
            return;
          }
          if (resolveProviderIssuePollFailClosedReason(claim)) {
            return;
          }

          const claimRuns = await discoverProviderIssueRunsForCurrentOperation({
            provider: claim.provider,
            issueId: claim.issue_id
          });
          const attachableClaimRuns = filterProviderIssueRunsForStartPipeline(claimRuns, startPipelineId);
          const activeRun = attachableClaimRuns.find((run) => run.status === 'in_progress') ?? null;
          if (claim.state === 'starting' || claim.state === 'resuming' || activeRun) {
            scheduleBestEffortRehydrateWithRefreshLock();
            return;
          }

          const latestRun = resolveLatestKnownProviderRun(attachableClaimRuns);
          const releaseRun = resolveProviderReleaseRun(claim, attachableClaimRuns);
          const resolution = await resolveRetryDispatchResolution(claim);

          if (resolution.kind === 'skip') {
            if (isProviderIssuePollFailClosedReason(resolution.reason)) {
              return;
            }
            if (isProviderStaleSupervisedSourceReason(resolution.reason)) {
              const staleSourceSnapshot = captureProviderStateSnapshot();
              upsertProviderIntakeClaim(options.state, {
                ...claim,
                state: 'ignored',
                reason: PROVIDER_STALE_SUPERVISED_SOURCE_REASON,
                launch_source: null,
                launch_token: null,
                review_promotion: null,
                merge_closeout: null,
                ...clearProviderRetryFields()
              });
              await persistStateOrRollback(staleSourceSnapshot, { rollbackOnPersistFailure: false });
              options.publishRuntime?.('provider-intake.refresh');
              return;
            }
            const retrySkipSnapshot = captureProviderStateSnapshot();
            upsertProviderIntakeClaim(options.state, {
              ...claim,
              ...buildQueuedProviderRetryFields({
                claim,
                previousRun: latestRun,
                error: `retry poll failed: ${resolution.reason}`,
                preserveCurrentAttempt: true,
                delayType: 'failure'
              })
            });
            await persistStateOrRollback(retrySkipSnapshot, { rollbackOnPersistFailure: false });
            options.publishRuntime?.('provider-intake.refresh');
            return;
          }

          if (resolution.kind === 'release') {
            await releaseClaim({
              claim,
              nextReason: `provider_issue_released:${resolution.reason}`,
              releaseRun,
              trackedIssue: resolution.trackedIssue,
              cleanupWorkspace: resolution.cleanupWorkspace
            });
            return;
          }

          if (resolution.kind === 'owned') {
            const reviewPromotionClaim = await maybeHandleReviewHandoffPromotion({
              claim,
              trackedIssue: resolution.trackedIssue,
              latestRun
            });
            if (reviewPromotionClaim) {
              options.publishRuntime?.('provider-intake.refresh');
              return;
            }
            const queuedRetryFields = buildQueuedProviderRetryFields({
              claim,
              previousRun: latestRun,
              error: claim.retry_error ?? resolveProviderRetryErrorFromRun(latestRun),
              preserveCurrentAttempt: true,
              delayType: resolveProviderRetryDelayType({
                claim,
                previousRun: latestRun
              })
            });
            const transitioned = hasProviderClaimTransitioned(claim, {
              ...buildTrackedIssueClaimFields(resolution.trackedIssue),
              state: claim.state,
              reason: 'provider_issue_handoff_owned',
              task_id: latestRun?.taskId ?? claim.task_id,
              run_id: latestRun?.runId ?? claim.run_id,
              run_manifest_path: latestRun?.manifestPath ?? claim.run_manifest_path,
              ...queuedRetryFields
            });
            const ownedRetrySnapshot = captureProviderStateSnapshot();
            upsertProviderIntakeClaim(options.state, {
              ...claim,
              ...buildTrackedIssueClaimFields(resolution.trackedIssue),
              task_id: latestRun?.taskId ?? claim.task_id,
              state: claim.state,
              reason: 'provider_issue_handoff_owned',
              run_id: latestRun?.runId ?? claim.run_id,
              run_manifest_path: latestRun?.manifestPath ?? claim.run_manifest_path,
              ...queuedRetryFields
            });
            await persistStateOrRollback(ownedRetrySnapshot);
            if (transitioned) {
              options.publishRuntime?.('provider-intake.refresh');
            }
            return;
          }

          if (latestRun && latestRun.status && RESUME_ELIGIBLE_STATUSES.has(latestRun.status)) {
            if (hasPendingReleaseCancel(releaseRun?.manifestPath ?? latestRun.manifestPath)) {
              scheduleBestEffortRehydrateWithRefreshLock();
              return;
            }
            await launchResumeForRun({
              claim,
              trackedIssue: resolution.trackedIssue,
              run: latestRun,
              reason: PROVIDER_RETRY_RESUME_LAUNCHED_REASON,
              failureReason: PROVIDER_RETRY_RESUME_FAILED_REASON,
              launcherReason: 'provider-retry'
            });
            return;
          }

          if (latestRun && latestRun.status !== 'succeeded' && latestRun.status !== null) {
            scheduleBestEffortRehydrateWithRefreshLock();
            return;
          }

          const startReason =
            latestRun?.status === 'succeeded'
              ? PROVIDER_POST_WORKER_EXIT_START_LAUNCHED_REASON
              : PROVIDER_RETRY_START_LAUNCHED_REASON;
          const startFailureReason =
            latestRun?.status === 'succeeded'
              ? PROVIDER_POST_WORKER_EXIT_START_FAILED_REASON
              : PROVIDER_RETRY_START_FAILED_REASON;
          await launchStartForTrackedIssue({
            claim,
            trackedIssue: resolution.trackedIssue,
            reason: startReason,
            failureReason: startFailureReason,
            previousRun: latestRun,
            preserveRetryAttempt: true
          });
        });
      }));
    });
  }

  const processTrackedIssueCandidate = async (input: {
    trackedIssue: LiveLinearTrackedIssue;
    deliveryId: string | null;
    event: string | null;
    action: string | null;
    webhookTimestamp: number | null;
  }): Promise<ProviderIssueHandoffResult> => {
      const providerKey = buildProviderIssueKey('linear', input.trackedIssue.id);
      const taskId = buildProviderFallbackTaskId(input.trackedIssue);
      const mappingSource: ProviderTaskMappingSource = 'provider_id_fallback';
      const existing = readProviderIntakeClaim(options.state, providerKey);
      const explicitProviderWorkerRecovery = isExplicitProviderWorkerRecovery({
        event: input.event,
        action: input.action
      });
      const claimBase = {
        provider: 'linear' as const,
        provider_key: providerKey,
        issue_id: input.trackedIssue.id,
        ...buildTrackedIssueClaimFields(input.trackedIssue),
        last_delivery_id: input.deliveryId,
        last_event: input.event,
        last_action: input.action,
        last_webhook_timestamp: input.webhookTimestamp,
        accepted_at: existing?.accepted_at ?? null
      };

      if (existing?.state === 'released') {
        const discoveredReleasedRuns = await discoverProviderIssueRunsForCurrentOperation({
          provider: 'linear',
          issueId: input.trackedIssue.id
        });
        const attachableReleasedRuns = filterProviderIssueRunsForStartPipeline(
          discoveredReleasedRuns,
          startPipelineId
        );
        const releasedRun = resolveProviderReleaseRun(existing, attachableReleasedRuns);
        const releasedClaimIssueUpdatedAt = selectMostRecentTrackedIssueUpdatedAt(
          existing.issue_updated_at ?? null,
          resolveReleasedRunIssueUpdatedAtForReclaim(existing, releasedRun)
        );
        const releasedWebhookTiming = compareTrackedIssueUpdatedAt({
          existingIssueUpdatedAt: releasedClaimIssueUpdatedAt,
          nextIssueUpdatedAt: input.trackedIssue.updated_at
        });
        const releaseCancelPending =
          (
            shouldAttemptReleaseCancel(releasedRun) &&
            !isInactiveReleasedReclaimRun(existing, releasedRun)
          ) ||
          hasPendingReleaseCancel(releasedRun?.manifestPath ?? existing.run_manifest_path);
        const canFreshDiscoverReleasedMissingRetainedRun =
          input.deliveryId === null &&
          input.event === 'poll_tick' &&
          input.action === 'reconcile' &&
          canFreshDiscoverPlainReleasedMissingRetainedRunClaim({
            claim: existing,
            releaseRun: releasedRun,
            sameIssueRuns: discoveredReleasedRuns,
            unreadableAdmissionOccupancy:
              await discoverUnreadableProviderAdmissionOccupancyForCurrentOperation(),
            hasPendingReleaseCancel
          });
        const existingReleasedPendingReopen =
          isProviderIssueReleasedPendingReopen(existing.reason ?? null);
        const existingReleasedReclaimCandidate =
          existingReleasedPendingReopen ||
          canRecheckPlainReleasedNotActiveClaim(existing) ||
          canProbeFreshDiscoveryForReleasedNotActiveTerminalMergeCloseoutClaim(existing);
        const pendingReleasedReopen = shouldReopenReleasedClaimAtCurrentTimestamp({
          claim: existing,
          trackedIssue: input.trackedIssue
        });
        const currentReleasedReopenLaunchable =
          isProviderLinearTrackedIssueEligibleForExecution(input.trackedIssue) &&
          isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(input.trackedIssue);
        const reopenBlockedByUnresolvedReleasedRunIdentity =
          existingReleasedReclaimCandidate &&
          pendingReleasedReopen &&
          currentReleasedReopenLaunchable &&
          !(
            canFreshDiscoverReleasedReclaimClaim(
              existing,
              releasedRun,
              hasPendingReleaseCancel
            ) ||
            canFreshDiscoverReleasedMissingRetainedRun
          );
        const preservePlainReclaimMetadataDuringDrain =
          releaseCancelPending &&
          releasedWebhookTiming === 'equal' &&
          pendingReleasedReopen &&
          !existingReleasedPendingReopen;
        const replayBlockedByReleasedMetadata =
          reopenBlockedByUnresolvedReleasedRunIdentity ||
          releasedWebhookTiming === 'older' ||
          (
            releasedWebhookTiming === 'equal' &&
            (
              !pendingReleasedReopen ||
              preservePlainReclaimMetadataDuringDrain
            )
          );
        const preserveReleasedIssueMetadata = replayBlockedByReleasedMetadata;
        const refreshTerminalBlockerStaleReleasedMetadata =
          replayBlockedByReleasedMetadata &&
          shouldRefreshTerminalBlockerStaleReleasedMetadata({
            claim: existing,
            trackedIssue: input.trackedIssue,
            releasedWebhookTiming
          });
        const reopenBlockedByReleaseDrain =
          releaseCancelPending &&
          (
            releasedWebhookTiming === 'newer' ||
            releasedWebhookTiming === 'unknown' ||
            (
              releasedWebhookTiming === 'equal' &&
              existingReleasedPendingReopen
            )
          );
        const releasedMutabilityTruth =
          reopenBlockedByReleaseDrain
            ? {
                issue_archived_at: claimBase.issue_archived_at,
                issue_trashed: claimBase.issue_trashed
              }
            : preserveReleasedIssueMetadata
              ? (
                  releasedWebhookTiming === 'equal'
                    ? mergeReleasedTrackedIssueMutability(existing, claimBase)
                    : resolveProviderClaimMutabilityTruth(existing)
                )
            : {
                issue_archived_at: claimBase.issue_archived_at,
                issue_trashed: claimBase.issue_trashed
              };
        const releasedIssueMetadata =
          reopenBlockedByReleaseDrain
            ? claimBase
            : refreshTerminalBlockerStaleReleasedMetadata
              ? {
                  ...existing,
                  issue_state: claimBase.issue_state,
                  issue_state_type: claimBase.issue_state_type,
                  issue_updated_at: claimBase.issue_updated_at
                }
              : preserveReleasedIssueMetadata
                ? existing
                : claimBase;
        if (
          releaseCancelPending ||
          replayBlockedByReleasedMetadata
        ) {
          const nextReleasedIssueState = releasedIssueMetadata.issue_state;
          const nextReleasedIssueStateType = releasedIssueMetadata.issue_state_type;
          const canUseWebhookTruthForRetainedIdentity =
            releasedWebhookTiming === 'newer' ||
            releasedWebhookTiming === 'equal';
          const retainedRunIdentity = resolveReleasedClaimRetainedRunIdentity({
            claim: existing,
            run: releasedRun,
            allowClearing: canUseWebhookTruthForRetainedIdentity,
            trackedIssue: canUseWebhookTruthForRetainedIdentity ? input.trackedIssue : null,
            issueState:
              canUseWebhookTruthForRetainedIdentity
                ? nextReleasedIssueState
                : existing.issue_state,
            issueStateType:
              canUseWebhookTruthForRetainedIdentity
                ? nextReleasedIssueStateType
                : existing.issue_state_type
          });
          const claim = await upsertProviderClaimAndPersist({
            ...claimBase,
            issue_identifier: releasedIssueMetadata.issue_identifier,
            issue_title: releasedIssueMetadata.issue_title,
            issue_state: releasedIssueMetadata.issue_state,
            issue_state_type: releasedIssueMetadata.issue_state_type,
            issue_updated_at: releasedIssueMetadata.issue_updated_at,
            issue_archived_at: releasedMutabilityTruth.issue_archived_at,
            issue_trashed: releasedMutabilityTruth.issue_trashed,
            issue_viewer_id:
              releasedIssueMetadata.issue_viewer_id ?? null,
            issue_viewer_auth_fingerprint:
              releasedIssueMetadata.issue_viewer_auth_fingerprint ?? null,
            issue_assignee_id:
              releasedIssueMetadata.issue_assignee_id ?? null,
            issue_assignee_name:
              releasedIssueMetadata.issue_assignee_name ?? null,
            issue_blocked_by:
              refreshTerminalBlockerStaleReleasedMetadata
                ? filterNonTerminalProviderIssueBlockers(claimBase.issue_blocked_by)
                : releasedIssueMetadata.issue_blocked_by,
            ...retainedRunIdentity,
            mapping_source: existing.mapping_source,
            state: 'released',
            reason:
              reopenBlockedByReleaseDrain
                ? markProviderIssueReleasedPendingReopen(existing.reason ?? null)
                : refreshTerminalBlockerStaleReleasedMetadata && pendingReleasedReopen
                  ? markProviderIssueReleasedPendingReopen(existing.reason ?? null)
                : existing.reason ?? 'provider_issue_released',
          });
          return { kind: 'ignored', reason: claim.reason ?? 'provider_issue_released', claim };
        }
      }

      if (
        isTrackedIssueStale({
          existingIssueUpdatedAt: existing?.issue_updated_at ?? null,
          nextIssueUpdatedAt: input.trackedIssue.updated_at
        })
      ) {
        const claim = await upsertProviderClaimAndPersist({
          ...claimBase,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'stale',
          reason: 'provider_issue_stale',
          run_id: existing?.run_id ?? null,
          run_manifest_path: existing?.run_manifest_path ?? null,
        });
        return { kind: 'ignored', reason: 'provider_issue_stale', claim };
      }

      const eligibility = assessProviderTrackedIssueEligibility(input.trackedIssue, {
        hasExistingClaim: existing !== null
      });
      if (!eligibility.eligible) {
        if (existing) {
          const existingRuns = await discoverProviderIssueRunsForCurrentOperation({
            provider: 'linear',
            issueId: input.trackedIssue.id
          });
          const attachableExistingRuns = filterProviderIssueRunsForStartPipeline(
            existingRuns,
            startPipelineId
          );
          const releaseRun = resolveProviderReleaseRun(existing, attachableExistingRuns);
          const hasForeignActiveExistingRun =
            !releaseRun &&
            existingRuns.some(
              (run) =>
                (run.status === 'in_progress' || run.status === 'queued') &&
                !doesProviderIssueRunMatchStartPipeline(run, startPipelineId)
            );
          if (
            hasForeignActiveExistingRun &&
            (
              existing.state === 'starting' ||
              existing.state === 'resuming' ||
              existing.state === 'running'
            )
          ) {
            return { kind: 'ignored', reason: eligibility.claimReason, claim: existing };
          }
          const shouldReleaseExistingRun =
            existing.state === 'starting' ||
            existing.state === 'resuming' ||
            existing.state === 'running' ||
            releaseRun?.status === 'in_progress';
          if (shouldReleaseExistingRun) {
            await releaseClaim({
              claim: existing,
              nextReason: eligibility.releaseReason,
              releaseRun,
              allowClearingRunIdentity: input.webhookTimestamp !== null,
              trackedIssue: input.trackedIssue,
              cleanupWorkspace: eligibility.cleanupWorkspace
            });
            const claim = readProviderIntakeClaim(options.state, providerKey) ?? existing;
            return { kind: 'ignored', reason: eligibility.releaseReason, claim };
          }
        }
        const claim = await upsertProviderClaimAndPersist({
          ...claimBase,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'ignored',
          reason: eligibility.claimReason,
          run_id: existing?.run_id ?? null,
          run_manifest_path: existing?.run_manifest_path ?? null,
        });
        return { kind: 'ignored', reason: eligibility.claimReason, claim };
      }

      const sourceFreshnessPolicy = resolveProviderHandoffSourceFreshnessPolicy();
      if (sourceFreshnessPolicy) {
        const claim = await upsertProviderClaimAndPersist({
          ...claimBase,
          task_id: existing?.task_id ?? taskId,
          mapping_source: existing?.mapping_source ?? mappingSource,
          state: 'ignored',
          reason: PROVIDER_STALE_SUPERVISED_SOURCE_REASON,
          run_id: existing?.run_id ?? null,
          run_manifest_path: existing?.run_manifest_path ?? null,
          worker_host: existing?.worker_host ?? null,
          launch_source: null,
          launch_token: null,
          review_promotion: null,
          merge_closeout: null,
          ...clearProviderRetryFields()
        });
        return { kind: 'ignored', reason: PROVIDER_STALE_SUPERVISED_SOURCE_REASON, claim };
      }

      if (existing && eligibility.claimReason === 'provider_issue_handoff_owned') {
        const discoveredRuns = await discoverProviderIssueRunsForCurrentOperation({
          provider: 'linear',
          issueId: input.trackedIssue.id
        });
        const attachableDiscoveredRuns = filterProviderIssueRunsForStartPipeline(
          discoveredRuns,
          startPipelineId
        );
        const activeRun =
          attachableDiscoveredRuns.find((run) => run.status === 'in_progress') ?? null;
        const latestRun = resolveProviderClaimRunIdentity(existing, attachableDiscoveredRuns)
          ?? resolveLatestKnownProviderRun(attachableDiscoveredRuns);
        if (
          existing.state !== 'starting' &&
          existing.state !== 'resuming' &&
          existing.state !== 'running' &&
          !activeRun &&
          latestRun?.status !== 'queued'
        ) {
          const reviewPromotionClaim = await maybeHandleReviewHandoffPromotion({
            claim: existing,
            trackedIssue: input.trackedIssue,
            latestRun
          });
          if (reviewPromotionClaim) {
            return {
              kind: 'ignored',
              reason: reviewPromotionClaim.reason ?? 'provider_issue_review_promotion_completed',
              claim: reviewPromotionClaim
            };
          }
        }
        if (activeRun) {
          const trackedIssueFreshEnoughForClaim = isTrackedIssueFreshEnoughForClaim(
            existing,
            input.trackedIssue
          );
          const preserveRecoveredMergeCloseoutClaim =
            !trackedIssueFreshEnoughForClaim &&
            (
              isProviderMergeCloseoutWatchingClaim(existing) ||
              isTerminalProviderMergeCloseoutClaim(existing)
            );
          if (preserveRecoveredMergeCloseoutClaim) {
            return {
              kind: 'ignored',
              reason: existing.reason ?? 'provider_issue_handoff_owned',
              claim: existing
            };
          }
          if (trackedIssueFreshEnoughForClaim) {
            const mergeCloseoutClaim = await maybeHandleRecoveredActiveRunMergedCloseout({
              claim: existing,
              trackedIssue: input.trackedIssue,
              latestRun: activeRun
            });
            if (mergeCloseoutClaim) {
              return {
                kind: 'ignored',
                reason: mergeCloseoutClaim.reason ?? 'provider_issue_rehydrated_active_run',
                claim: mergeCloseoutClaim
              };
            }
          }
          const trackedIssueFields = buildFreshTrackedIssueActiveRunFields(
            existing,
            input.trackedIssue
          );
          const reactivatedMergeCloseoutReset =
            !trackedIssueFreshEnoughForClaim ||
            existing.reason === 'provider_issue_rehydrated_active_run'
              ? {}
              : { review_promotion: null, merge_closeout: null };
          const workerHost = resolveRehydratedActiveRunWorkerHost(activeRun, existing);
          const launchProvenance = await resolveRehydratedActiveRunLaunchProvenance({
            claim: existing,
            activeRun
          });
          const claim = await upsertProviderClaimAndPersist({
            ...existing,
            ...trackedIssueFields,
            ...launchProvenance,
            task_id: activeRun.taskId,
            state: 'running',
            reason: 'provider_issue_rehydrated_active_run',
            run_id: activeRun.runId,
            run_manifest_path: activeRun.manifestPath,
            worker_host: workerHost,
            accepted_at: existing.accepted_at,
            last_delivery_id: input.deliveryId,
            last_event: input.event,
            last_action: input.action,
            last_webhook_timestamp: input.webhookTimestamp,
            ...buildActiveRunRetryFields(existing),
            ...reactivatedMergeCloseoutReset
          });
          return { kind: 'ignored', reason: 'provider_issue_rehydrated_active_run', claim };
        }
        const claim = await retainOwnedHandoffClaim({
          claim: existing,
          trackedIssue: input.trackedIssue,
          run: latestRun,
          state: existing.state,
          claimMetadata: {
            accepted_at: existing.accepted_at,
            last_delivery_id: input.deliveryId,
            last_event: input.event,
            last_action: input.action,
            last_webhook_timestamp: input.webhookTimestamp
          }
        });
        return { kind: 'ignored', reason: claim.reason ?? 'provider_issue_handoff_owned', claim };
      }

      const discoveredRuns = await discoverProviderIssueRunsForCurrentOperation({
        provider: 'linear',
        issueId: input.trackedIssue.id
      });
      const attachableDiscoveredRuns = filterProviderIssueRunsForStartPipeline(
        discoveredRuns,
        startPipelineId
      );
      const latestExisting = readProviderIntakeClaim(options.state, providerKey);
      const releasedRun =
        latestExisting?.state === 'released'
          ? resolveProviderReleaseRun(latestExisting, attachableDiscoveredRuns)
          : null;
      const latestClaimBase = {
        ...claimBase,
        accepted_at: latestExisting?.accepted_at ?? claimBase.accepted_at
      };
      const latestRetryStateBase: Pick<
        ProviderIntakeClaimRecord,
        'retry_queued' | 'retry_attempt' | 'retry_due_at'
      > = latestExisting ?? clearProviderRetryFields();
      const activeRun = attachableDiscoveredRuns.find((run) => run.status === 'in_progress');
      if (activeRun) {
        const workerHost = resolveRehydratedActiveRunWorkerHost(activeRun, latestExisting);
        const trackedIssueFreshEnoughForLatestClaim =
          latestExisting ? isTrackedIssueFreshEnoughForClaim(latestExisting, input.trackedIssue) : true;
        const preserveRecoveredMergeCloseoutClaim =
          latestExisting &&
          !trackedIssueFreshEnoughForLatestClaim &&
          (
            isProviderMergeCloseoutWatchingClaim(latestExisting) ||
            isTerminalProviderMergeCloseoutClaim(latestExisting)
          );
        if (preserveRecoveredMergeCloseoutClaim) {
          return {
            kind: 'ignored',
            reason: latestExisting.reason ?? 'provider_issue_run_already_active',
            claim: latestExisting
          };
        }
        if (trackedIssueFreshEnoughForLatestClaim && latestExisting) {
          const mergeCloseoutClaim = await maybeHandleRecoveredActiveRunMergedCloseout({
            claim: latestExisting,
            trackedIssue: input.trackedIssue,
            latestRun: activeRun
          });
          if (mergeCloseoutClaim) {
            return {
              kind: 'ignored',
              reason: mergeCloseoutClaim.reason ?? 'provider_issue_rehydrated_active_run',
              claim: mergeCloseoutClaim
            };
          }
        }
        const trackedIssueFields = latestExisting
          ? buildFreshTrackedIssueActiveRunFields(latestExisting, input.trackedIssue)
          : buildTrackedIssueClaimFields(input.trackedIssue);
        const reactivatedMergeCloseoutReset =
          !trackedIssueFreshEnoughForLatestClaim ||
          latestExisting?.reason === 'provider_issue_rehydrated_active_run'
            ? {}
            : { review_promotion: null, merge_closeout: null };
        const claim = await upsertProviderClaimAndPersist({
          ...latestClaimBase,
          ...trackedIssueFields,
          task_id: activeRun.taskId,
          mapping_source: mappingSource,
          state: 'running',
          reason: 'provider_issue_run_already_active',
          run_id: activeRun.runId,
          run_manifest_path: activeRun.manifestPath,
          worker_host: workerHost,
          ...buildActiveRunRetryFields(latestRetryStateBase),
          ...reactivatedMergeCloseoutReset
        });
        return { kind: 'ignored', reason: 'provider_issue_run_already_active', claim };
      }

      const latestExistingManifestlessHandoff =
        latestExisting ? isProviderStaleManifestlessHandoffClaim(latestExisting) : false;
      if (
        latestExisting &&
        (latestExisting.state === 'starting' || latestExisting.state === 'resuming') &&
        !(explicitProviderWorkerRecovery && latestExistingManifestlessHandoff)
      ) {
        const claim = await upsertProviderClaimAndPersist({
          ...latestClaimBase,
          task_id: latestExisting.task_id,
          mapping_source: latestExisting.mapping_source,
          state: latestExisting.state,
          reason: 'provider_issue_handoff_inflight',
          run_id: latestExisting.run_id,
          run_manifest_path: latestExisting.run_manifest_path,
          accepted_at: latestExisting.accepted_at,
          updated_at: latestExisting.updated_at
        });
        return { kind: 'ignored', reason: 'provider_issue_handoff_inflight', claim };
      }

      const latestRun = resolveLatestKnownProviderRun(attachableDiscoveredRuns);
      const latestRunWorkerHost = latestRun
        ? resolvePreferredStartWorkerHost({
            claimWorkerHost: latestExisting?.worker_host ?? null,
            previousRun: latestRun
          })
        : null;
      const shouldRelaunchExplicitRecoveryFromResumableRun =
        explicitProviderWorkerRecovery &&
        latestExisting?.state === 'resumable';
      if (latestRun && latestRun.status && RESUME_ELIGIBLE_STATUSES.has(latestRun.status)) {
        if (
          !shouldRelaunchExplicitRecoveryFromResumableRun &&
          hasPendingReleaseCancel(releasedRun?.manifestPath ?? latestRun.manifestPath)
        ) {
          const claim = await upsertProviderClaimAndPersist({
            ...latestClaimBase,
            task_id: latestRun.taskId,
            mapping_source: latestExisting?.mapping_source ?? mappingSource,
            state: latestExisting?.state ?? 'ignored',
            reason: latestExisting?.reason ?? 'provider_issue_release_cancel_inflight',
            run_id: latestRun.runId,
            run_manifest_path: latestRun.manifestPath,
            worker_host: latestRunWorkerHost,
          });
          return { kind: 'ignored', reason: 'provider_issue_release_cancel_inflight', claim };
        }
        if (!shouldRelaunchExplicitRecoveryFromResumableRun) {
          const workerHost = resolveRehydratedActiveRunWorkerHost(latestRun, latestExisting);
          const claim = await upsertProviderClaimAndPersist({
            ...latestClaimBase,
            task_id: latestRun.taskId,
            mapping_source: latestExisting?.mapping_source ?? mappingSource,
            state: 'resumable',
            reason: 'provider_issue_rehydrated_resumable_run',
            run_id: latestRun.runId,
            run_manifest_path: latestRun.manifestPath,
            worker_host: workerHost,
            ...buildQueuedProviderRetryFields({
              claim: latestRetryStateBase,
              previousRun: latestRun,
              preserveCurrentAttempt: latestExisting?.retry_queued === true,
              preserveExistingDueAt: latestExisting?.retry_queued === true,
              error: resolveProviderRetryErrorFromRun(latestRun),
              delayType: 'failure'
            })
          });
          return { kind: 'ignored', reason: claim.reason ?? 'provider_issue_rehydrated_resumable_run', claim };
        }
      }

      // Older manifests may predate explicit issue_updated_at recording. Fall back to the
      // run's started_at so restart-time duplicate deliveries remain older than the
      // completed child run. Direct webhook intake is not the scheduler-owned relaunch
      // path after a successful worker exit, so newer issue updates stay pending until
      // refresh can relaunch unless we are retrying an explicit failed relaunch attempt.
      const latestCompletedClaimIssueUpdatedAt =
        latestExisting?.state === 'completed' ? latestExisting.issue_updated_at ?? null : null;
      const latestCompletedRunIssueUpdatedAt =
        latestRun?.issueUpdatedAt ?? latestRun?.startedAt ?? null;
      const latestCompletedRecoveryRunIssueUpdatedAt = latestRun?.issueUpdatedAt ?? null;
      const latestCompletedIssueUpdatedAt = selectMostRecentTrackedIssueUpdatedAt(
        latestCompletedClaimIssueUpdatedAt,
        latestCompletedRunIssueUpdatedAt
      );
      const retryingFailedRelaunch =
        latestRun?.status === 'succeeded' &&
        latestExisting?.state === 'handoff_failed' &&
        latestExisting.launch_source === PROVIDER_LAUNCH_SOURCE &&
        hasFailedProviderStartReason(latestExisting.reason) &&
        !isTrackedIssueStale({
          existingIssueUpdatedAt: latestExisting.issue_updated_at ?? latestCompletedIssueUpdatedAt,
          nextIssueUpdatedAt: input.trackedIssue.updated_at
        });
      const explicitCompletedDuplicateRecoveryFreshness =
        resolveExplicitCompletedDuplicateRecoveryFreshness({
          claim: latestExisting,
          event: input.event,
          action: input.action,
          trackedIssue: input.trackedIssue,
          latestCompletedRunIssueUpdatedAt: latestCompletedRecoveryRunIssueUpdatedAt
        });
      const explicitCompletedDuplicateRecovery =
        explicitCompletedDuplicateRecoveryFreshness === 'newer';
      if (latestRun?.status === 'succeeded' && latestExisting?.state !== 'released') {
        const reviewPromotionClaim = latestExisting
          ? await maybeHandleReviewHandoffPromotion({
              claim: latestExisting,
              trackedIssue: input.trackedIssue,
              latestRun
            })
          : null;
        if (reviewPromotionClaim) {
          return {
            kind: 'ignored',
            reason: reviewPromotionClaim.reason ?? 'provider_issue_review_promotion_completed',
            claim: reviewPromotionClaim
          };
        }
        const mergeCloseoutClaim = latestExisting
          ? await maybeHandleDeterministicMergingCloseout({
              claim: latestExisting,
              trackedIssue: input.trackedIssue,
              latestRun
            })
          : null;
        if (mergeCloseoutClaim) {
          return {
            kind: 'ignored',
            reason: mergeCloseoutClaim.reason ?? 'provider_issue_merge_closeout_completed',
            claim: mergeCloseoutClaim
          };
        }
        if (!retryingFailedRelaunch && !explicitCompletedDuplicateRecovery) {
          if (
            input.trackedIssue.updated_at === null ||
            explicitCompletedDuplicateRecoveryFreshness === 'unknown' ||
            isTrackedIssueNonIncreasing({
              existingIssueUpdatedAt: latestCompletedIssueUpdatedAt,
              nextIssueUpdatedAt: input.trackedIssue.updated_at
            })
          ) {
            const completedDuplicateRetryFields =
              latestExisting?.retry_queued === true
                ? buildQueuedProviderRetryFields({
                    claim: latestExisting,
                    previousRun: latestRun,
                    error: null,
                    preserveCurrentAttempt: true,
                    preserveExistingDueAt: true,
                    delayType: 'continuation'
                  })
                : clearProviderRetryFields();
            const claim = await upsertProviderClaimAndPersist({
              ...latestClaimBase,
              task_id: latestRun.taskId,
              mapping_source: mappingSource,
              state: 'completed',
              reason: 'provider_issue_run_already_completed',
              run_id: latestRun.runId,
              run_manifest_path: latestRun.manifestPath,
              worker_host: latestRunWorkerHost,
              ...completedDuplicateRetryFields
            });
            return { kind: 'ignored', reason: 'provider_issue_run_already_completed', claim };
          }

          const claim = await upsertProviderClaimAndPersist({
            ...latestClaimBase,
            task_id: latestRun.taskId,
            mapping_source: latestExisting?.mapping_source ?? mappingSource,
            state: 'accepted',
            reason: PROVIDER_POST_WORKER_EXIT_REFRESH_PENDING_REASON,
            run_id: latestRun.runId,
            run_manifest_path: latestRun.manifestPath,
            worker_host: latestRunWorkerHost,
            ...buildQueuedProviderRetryFields({
              claim: latestExisting ?? clearProviderRetryFields(),
              previousRun: latestRun,
              error: null,
              preserveCurrentAttempt: latestExisting?.retry_queued === true,
              preserveExistingDueAt: latestExisting?.retry_queued === true,
              delayType: 'continuation'
            })
          });
          return { kind: 'ignored', reason: PROVIDER_POST_WORKER_EXIT_REFRESH_PENDING_REASON, claim };
        }
      }

      const latestHadResumableRun = Boolean(
        latestRun && latestRun.status && RESUME_ELIGIBLE_STATUSES.has(latestRun.status)
      );
      const admissionReservation = await runWithRefreshLifecycleLock(
        async (): Promise<
          | { kind: 'retry' }
          | { kind: 'settled'; result: ProviderIssueHandoffResult }
          | {
              kind: 'launch';
              latestExisting: ProviderIntakeClaimRecord | null;
              latestRun: ProviderIssueRunRecord | null;
              latestClaimBase: typeof latestClaimBase;
              latestRetryStateBase: typeof latestRetryStateBase;
              retryingFailedRelaunch: boolean;
              inflightClaim: ProviderIntakeClaimRecord;
              workerHost: string | null;
              launchToken: string;
            }
        > =>
          await runWithFreshProviderIssueRunDiscoveryCache(async (): Promise<
            | { kind: 'retry' }
            | { kind: 'settled'; result: ProviderIssueHandoffResult }
            | {
                kind: 'launch';
                latestExisting: ProviderIntakeClaimRecord | null;
                latestRun: ProviderIssueRunRecord | null;
                latestClaimBase: typeof latestClaimBase;
                latestRetryStateBase: typeof latestRetryStateBase;
                retryingFailedRelaunch: boolean;
                inflightClaim: ProviderIntakeClaimRecord;
                workerHost: string | null;
                launchToken: string;
              }
          > => {
          const lockedDiscoveredRuns = await discoverProviderIssueRunsForCurrentOperation({
            provider: 'linear',
            issueId: input.trackedIssue.id
          });
          const lockedAttachableDiscoveredRuns = filterProviderIssueRunsForStartPipeline(
            lockedDiscoveredRuns,
            startPipelineId
          );
          const lockedExisting = readProviderIntakeClaim(options.state, providerKey);
          const lockedExistingManifestlessHandoff =
            lockedExisting ? isProviderStaleManifestlessHandoffClaim(lockedExisting) : false;
          const lockedLatestClaimBase = {
            ...claimBase,
            accepted_at: lockedExisting?.accepted_at ?? claimBase.accepted_at
          };
          const lockedLatestRetryStateBase: Pick<
            ProviderIntakeClaimRecord,
            'retry_queued' | 'retry_attempt' | 'retry_due_at'
          > = lockedExisting ?? clearProviderRetryFields();
          const lockedActiveRun =
            lockedAttachableDiscoveredRuns.find((run) => run.status === 'in_progress') ?? null;
          const lockedQueuedRun =
            lockedAttachableDiscoveredRuns.find((run) => run.status === 'queued') ?? null;
          const lockedLatestRun = resolveLatestKnownProviderRun(lockedAttachableDiscoveredRuns);
          const lockedPreferredWorkerHost = resolvePreferredStartWorkerHost({
            claimWorkerHost: lockedExisting?.worker_host ?? null,
            previousRun: lockedLatestRun ?? null
          });
          const lockedSourceFreshnessPolicy = resolveProviderHandoffSourceFreshnessPolicy();
          if (lockedSourceFreshnessPolicy) {
            const claim = await upsertProviderClaimAndPersist({
              ...lockedLatestClaimBase,
              task_id: lockedExisting?.task_id ?? taskId,
              mapping_source: lockedExisting?.mapping_source ?? mappingSource,
              state: 'ignored',
              reason: PROVIDER_STALE_SUPERVISED_SOURCE_REASON,
              run_id: lockedLatestRun?.runId ?? lockedExisting?.run_id ?? null,
              run_manifest_path:
                lockedLatestRun?.manifestPath ?? lockedExisting?.run_manifest_path ?? null,
              worker_host: lockedPreferredWorkerHost,
              launch_source: null,
              launch_token: null,
              review_promotion: null,
              merge_closeout: null,
              ...clearProviderRetryFields()
            });
            return {
              kind: 'settled',
              result: { kind: 'ignored', reason: PROVIDER_STALE_SUPERVISED_SOURCE_REASON, claim }
            };
          }
          const lockedLatestCompletedClaimIssueUpdatedAt =
            lockedExisting?.state === 'completed' ? lockedExisting.issue_updated_at ?? null : null;
          const lockedLatestCompletedRunIssueUpdatedAt =
            lockedLatestRun?.issueUpdatedAt ?? lockedLatestRun?.startedAt ?? null;
          const lockedLatestCompletedRecoveryRunIssueUpdatedAt =
            lockedLatestRun?.issueUpdatedAt ?? null;
          const lockedLatestCompletedIssueUpdatedAt = selectMostRecentTrackedIssueUpdatedAt(
            lockedLatestCompletedClaimIssueUpdatedAt,
            lockedLatestCompletedRunIssueUpdatedAt
          );
          const lockedRetryingFailedRelaunch =
            lockedLatestRun?.status === 'succeeded' &&
            lockedExisting?.state === 'handoff_failed' &&
            lockedExisting.launch_source === PROVIDER_LAUNCH_SOURCE &&
            hasFailedProviderStartReason(lockedExisting.reason) &&
            !isTrackedIssueStale({
              existingIssueUpdatedAt:
                lockedExisting.issue_updated_at ?? lockedLatestCompletedIssueUpdatedAt,
              nextIssueUpdatedAt: input.trackedIssue.updated_at
            });
          const lockedExplicitCompletedDuplicateRecoveryFreshness =
            resolveExplicitCompletedDuplicateRecoveryFreshness({
              claim: lockedExisting,
              event: input.event,
              action: input.action,
              trackedIssue: input.trackedIssue,
              latestCompletedRunIssueUpdatedAt: lockedLatestCompletedRecoveryRunIssueUpdatedAt
            });
          const lockedExplicitCompletedDuplicateRecovery =
            lockedExplicitCompletedDuplicateRecoveryFreshness === 'newer';
          const lockedHasResumableRun = Boolean(
            lockedLatestRun && lockedLatestRun.status && RESUME_ELIGIBLE_STATUSES.has(lockedLatestRun.status)
          );

          if (
            (lockedExisting?.state === 'released' && latestExisting?.state !== 'released') ||
            (lockedHasResumableRun && !latestHadResumableRun) ||
            (
              lockedLatestRun?.status === 'succeeded' &&
              !lockedRetryingFailedRelaunch &&
              (
                latestRun?.status !== 'succeeded' ||
                retryingFailedRelaunch ||
                (explicitCompletedDuplicateRecovery && !lockedExplicitCompletedDuplicateRecovery)
              )
            )
          ) {
            return { kind: 'retry' };
          }

          if (lockedActiveRun) {
            const lockedWorkerHost = resolveRehydratedActiveRunWorkerHost(lockedActiveRun, lockedExisting);
            const claim = await upsertProviderClaimAndPersist({
              ...lockedLatestClaimBase,
              task_id: lockedActiveRun.taskId,
              mapping_source: mappingSource,
              state: 'running',
              reason: 'provider_issue_run_already_active',
              run_id: lockedActiveRun.runId,
              run_manifest_path: lockedActiveRun.manifestPath,
              worker_host: lockedWorkerHost,
            });
            return {
              kind: 'settled',
              result: { kind: 'ignored', reason: 'provider_issue_run_already_active', claim }
            };
          }

          if (
            explicitProviderWorkerRecovery &&
            lockedExisting &&
            lockedExistingManifestlessHandoff &&
            lockedQueuedRun
          ) {
            const lockedWorkerHost = resolveRehydratedActiveRunWorkerHost(lockedQueuedRun, lockedExisting);
            const reboundAt = isoTimestamp(new Date(Date.now()));
            const claim = await upsertProviderClaimAndPersist({
              ...lockedLatestClaimBase,
              task_id: lockedQueuedRun.taskId,
              mapping_source: mappingSource,
              state: lockedExisting.state,
              reason: 'provider_issue_rehydrated_queued_run',
              run_id: lockedQueuedRun.runId,
              run_manifest_path: lockedQueuedRun.manifestPath,
              worker_host: lockedWorkerHost,
              launch_source: null,
              launch_token: null,
              launch_started_at: null,
              accepted_at: lockedExisting.accepted_at,
              updated_at: reboundAt
            });
            return {
              kind: 'settled',
              result: { kind: 'ignored', reason: 'provider_issue_rehydrated_queued_run', claim }
            };
          }

          if (
            lockedExisting &&
            (lockedExisting.state === 'starting' || lockedExisting.state === 'resuming') &&
            !(explicitProviderWorkerRecovery && lockedExistingManifestlessHandoff)
          ) {
            const claim = await upsertProviderClaimAndPersist({
              ...lockedLatestClaimBase,
              task_id: lockedExisting.task_id,
              mapping_source: lockedExisting.mapping_source,
              state: lockedExisting.state,
              reason: 'provider_issue_handoff_inflight',
              run_id: lockedExisting.run_id,
              run_manifest_path: lockedExisting.run_manifest_path,
              accepted_at: lockedExisting.accepted_at,
              updated_at: lockedExisting.updated_at
            });
            return {
              kind: 'settled',
              result: { kind: 'ignored', reason: 'provider_issue_handoff_inflight', claim }
            };
          }

          const admissionGate = await createProviderAdmissionGate({
            excludeClaimProviderKey:
              lockedExisting &&
              (
                lockedExisting.retry_queued === true ||
                lockedExisting.state === 'resumable' ||
                (explicitProviderWorkerRecovery && lockedExistingManifestlessHandoff)
              )
                ? lockedExisting.provider_key
                : null
          });
          if (!admissionGate.canDispatch(input.trackedIssue)) {
            const blockedReason = deriveProviderCapacityBlockedReason('provider_issue_start_launched');
            const claim = await upsertProviderClaimAndPersist({
              ...lockedLatestClaimBase,
              task_id: taskId,
              mapping_source: lockedExisting?.mapping_source ?? mappingSource,
              state: 'accepted',
              reason: blockedReason,
              run_id: lockedLatestRun?.runId ?? lockedExisting?.run_id ?? null,
              run_manifest_path:
                lockedLatestRun?.manifestPath ?? lockedExisting?.run_manifest_path ?? null,
              worker_host: lockedPreferredWorkerHost,
              launch_source: null,
              launch_token: null,
              review_promotion: null,
              merge_closeout: null,
              ...(
                lockedExisting?.retry_queued === true
                  ? buildQueuedProviderRetryFields({
                      claim: lockedLatestRetryStateBase,
                      previousRun: lockedLatestRun,
                      error: lockedExisting.retry_error ?? resolveProviderRetryErrorFromRun(lockedLatestRun),
                      preserveCurrentAttempt: true,
                      delayType: resolveProviderRetryDelayType({
                        claim: lockedExisting,
                        previousRun: lockedLatestRun
                      })
                    })
                  : clearProviderRetryFields()
              )
            });
            return {
              kind: 'settled',
              result: { kind: 'ignored', reason: claim.reason ?? blockedReason, claim }
            };
          }

          let lockedWorkerHost: string | null = lockedPreferredWorkerHost;
          try {
            lockedWorkerHost = await selectLaunchWorkerHost({
              claim: {
                provider_key: providerKey,
                worker_host: lockedPreferredWorkerHost
              },
              previousRun: lockedLatestRun
            });
          } catch (error) {
            const claim = await upsertProviderClaimAndPersist({
              ...lockedLatestClaimBase,
              task_id: taskId,
              mapping_source: mappingSource,
              state: 'handoff_failed',
              reason: `provider_issue_start_failed:${(error as Error)?.message ?? String(error)}`,
              run_id: null,
              run_manifest_path: null,
              worker_host: lockedWorkerHost,
              launch_source: PROVIDER_LAUNCH_SOURCE,
              launch_token: null,
              review_promotion: null,
              merge_closeout: null,
              ...buildQueuedProviderRetryFields({
                claim: lockedLatestRetryStateBase,
                previousRun: lockedLatestRun,
                error: (error as Error)?.message ?? String(error),
                preserveCurrentAttempt: lockedExisting?.retry_queued === true,
                seedInitialAttemptWithoutPreviousRun: true,
                delayType: 'failure'
              })
            }, { rollbackOnPersistFailure: false });
            throw new Error(`Failed to start provider issue ${input.trackedIssue.identifier}: ${claim.reason}`);
          }

          assertProviderHandoffSourceFreshnessTrusted();
          const launchToken = createProviderLaunchToken();
          const inflightClaimSnapshot = captureProviderStateSnapshot();
          const inflightClaim = upsertProviderIntakeClaim(options.state, {
            ...lockedLatestClaimBase,
            task_id: taskId,
            mapping_source: mappingSource,
            state: 'starting',
            reason: 'provider_issue_start_launched',
            run_id: null,
            run_manifest_path: null,
            worker_host: lockedWorkerHost,
            launch_source: PROVIDER_LAUNCH_SOURCE,
            launch_token: launchToken,
            review_promotion: null,
            merge_closeout: null,
            ...buildProviderRetryLaunchFields({
              claim: lockedLatestRetryStateBase,
              previousRun: lockedLatestRun,
              preserveCurrentAttempt: lockedExisting?.retry_queued === true,
              seedFromPreviousRun: lockedRetryingFailedRelaunch
            })
          });
          await persistStateOrRollback(inflightClaimSnapshot);
          return {
            kind: 'launch',
            latestExisting: lockedExisting,
            latestRun: lockedLatestRun,
            latestClaimBase: lockedLatestClaimBase,
            latestRetryStateBase: lockedLatestRetryStateBase,
            retryingFailedRelaunch: lockedRetryingFailedRelaunch,
            inflightClaim,
            workerHost: lockedWorkerHost,
            launchToken
          };
          })
      );
      if (admissionReservation.kind === 'retry') {
        resetProviderIssueRunDiscoveryCache();
        return await processTrackedIssueCandidate(input);
      }
      if (admissionReservation.kind === 'settled') {
        return admissionReservation.result;
      }
      const {
        latestExisting: reservedLatestExisting,
        latestRun: reservedLatestRun,
        latestClaimBase: reservedLatestClaimBase,
        latestRetryStateBase: reservedLatestRetryStateBase,
        retryingFailedRelaunch: reservedRetryingFailedRelaunch,
        inflightClaim,
        workerHost,
        launchToken
      } = admissionReservation;
      let startedRun: { runId: string; manifestPath: string } | null = null;
      try {
        startedRun = await startProviderWorkerWhenCurrent({
          taskId,
          pipelineId: startPipelineId,
          provider: 'linear',
          issueId: input.trackedIssue.id,
          issueIdentifier: input.trackedIssue.identifier,
          issueUpdatedAt: input.trackedIssue.updated_at,
          workerHost,
          workspaceId: input.trackedIssue.workspace_id,
          teamId: input.trackedIssue.team_id,
          projectId: input.trackedIssue.project_id,
          residentSessionSeed: reservedLatestRun?.residentSessionSeed ?? null,
          launchToken
        });
        if (startedRun) {
          resetProviderIssueRunDiscoveryCache();
        }
      } catch (error) {
        if (isRefreshLifecycleStuckError(error) || isStaleRefreshLifecycleOperation()) {
          scheduleBestEffortRehydrateWithRefreshLock();
          throwRefreshLifecycleStuckError();
        }
        const claim = await upsertProviderClaimAndPersist({
          ...reservedLatestClaimBase,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'handoff_failed',
          reason: `provider_issue_start_failed:${(error as Error)?.message ?? String(error)}`,
          run_id: null,
          run_manifest_path: null,
          worker_host: workerHost,
          launch_source: PROVIDER_LAUNCH_SOURCE,
          launch_token: launchToken,
          review_promotion: null,
          merge_closeout: null,
          ...buildQueuedProviderRetryFields({
            claim: reservedLatestRetryStateBase,
            previousRun: reservedLatestRun,
            error: (error as Error)?.message ?? String(error),
            preserveCurrentAttempt: reservedLatestExisting?.retry_queued === true,
            delayType: 'failure'
          })
        }, { rollbackOnPersistFailure: false });
        throw new Error(`Failed to start provider issue ${input.trackedIssue.identifier}: ${claim.reason}`);
      }
      try {
        const startClaimSnapshot = startedRun ? captureProviderStateSnapshot() : null;
        if (startedRun) {
          assertRefreshLifecycleCurrent();
        }
        const claim = startedRun
          ? upsertProviderIntakeClaim(options.state, {
              ...reservedLatestClaimBase,
              task_id: taskId,
              mapping_source: mappingSource,
              state: 'starting',
              reason: 'provider_issue_start_launched',
              run_id: startedRun.runId,
              run_manifest_path: startedRun.manifestPath,
              worker_host: workerHost,
              launch_source: PROVIDER_LAUNCH_SOURCE,
              launch_token: launchToken,
              review_promotion: null,
              merge_closeout: null,
              ...buildProviderRetryLaunchFields({
                claim: reservedLatestRetryStateBase,
                previousRun: reservedLatestRun,
                preserveCurrentAttempt: reservedLatestExisting?.retry_queued === true,
                seedFromPreviousRun: reservedRetryingFailedRelaunch
              })
            })
          : inflightClaim;
        if (startedRun) {
          await persistStateOrRollback(
            startClaimSnapshot ?? captureProviderStateSnapshot(),
            { rollbackOnPersistFailure: false }
          );
          options.publishRuntime?.('provider-intake.start');
        }
        return { kind: 'start', reason: 'provider_issue_start_launched', claim };
      } finally {
        scheduleBestEffortRehydrateWithRefreshLock();
      }
  };

  const runRefreshCycle = async (pollInput?: ProviderIssueHandoffPollInput): Promise<void> => {
    const trackedIssueRefetch = wrapTrackedIssueRefetch(pollInput?.refetchTrackedIssues ?? null);
    const refreshCounts: Record<string, number> = {
      claims_total: 0,
      claims_scanned: 0,
      issue_by_id_reads: 0,
      issue_by_id_deferred: 0,
      occupied_slots: 0,
      fresh_discovery_runs: 0,
      fresh_discovery_candidates: 0,
      fresh_discovery_started: 0
    };
    const recordRefreshProgress = (
      phase: string,
      input: {
        requestClass?: string | null;
        providerKeys?: string[] | null;
      } = {}
    ): void => {
      if (!providerIssueHandoffService) {
        return;
      }
      const progress: {
        phase: string;
        requestClass?: string | null;
        providerKeys?: string[] | null;
        counts: Record<string, number>;
      } = {
        phase,
        counts: refreshCounts
      };
      if (input.requestClass !== undefined) {
        progress.requestClass = input.requestClass;
      }
      if (input.providerKeys !== undefined) {
        progress.providerKeys = input.providerKeys;
      }
      recordProviderPollingProgress(providerIssueHandoffService, progress);
    };
      await runWithProviderIssueRunDiscoveryCache(async () => {
        await runWithRefreshLifecycleLock(async () => {
          recordRefreshProgress('refresh:rehydrate', {
            requestClass: 'rehydrate'
          });
          assertRefreshCycleNotStuck();
          const result = await rehydrateNow();
          refreshCounts.claims_total = options.state.claims.length;
          recordRefreshProgress('refresh:rehydrated', {
            requestClass: 'rehydrate'
          });
          assertRefreshCycleNotStuck();
          if (result.hasPendingClaims) {
            scheduleBestEffortRehydrateWithRefreshLock();
          }

          const trackedIssuesByKey = pollInput
            ? buildTrackedIssuePollMap(pollInput.trackedIssues)
            : null;
          let trackedIssueBlockersByKey = pollInput
            ? buildTrackedIssuePollBlockerMap(pollInput.trackedIssues)
            : null;
          const retainedClaimBlockersByKey = buildProviderIntakeClaimBlockerMap(
            options.state.claims
          );
          if (retainedClaimBlockersByKey.size > 0) {
            if (trackedIssueBlockersByKey) {
              for (const [providerKey, blocker] of retainedClaimBlockersByKey.entries()) {
                if (trackedIssueBlockersByKey.has(providerKey)) {
                  continue;
                }
                trackedIssueBlockersByKey.set(providerKey, blocker);
              }
            } else {
              trackedIssueBlockersByKey = retainedClaimBlockersByKey;
            }
          }
          const deferredRetainedReleasedBlockerRefreshProviderKeys = new Set<string>();
          const consumedTrackedIssueKeys = new Set<string>();
          if (!options.resolveTrackedIssue && !trackedIssuesByKey) {
            return;
          }

        const discoveredRuns = await discoverProviderIssueRunsForCurrentOperation();
        const runsByProviderIssue = groupProviderIssueRuns(discoveredRuns);
        const pollDispatchBudget = createProviderPollDispatchBudget(options.readFeatureToggles?.() ?? null, {
          localWorkerOnly: await resolveLocalWorkerOnlyForCurrentOperation()
        });
        const occupiedPollDispatchKeys = new Set<string>();
        const occupiedPollDispatchProviderKeys = new Set<string>();
        const occupiedPollDispatchStateByKey = new Map<
          string,
          Pick<LiveLinearTrackedIssue, 'state'>
        >();
        const occupiedPollDispatchProviderKeyByKey = new Map<string, string>();
        const releasedFreshDiscoveryReplayBlockedProviderKeys = new Set<string>();
        const deferredClaimFreshDiscoveryBlockedProviderKeys = new Set<string>();
        let releasedFailClosedSkipCount = 0;
        let releasedFailClosedEligibleCount = 0;
        let releasedFailClosedDisqualifyingRetainedCount = 0;
        let suppressFreshDiscovery = false;
        const resolveClaimPollDispatchSlotKey = (
          providerKey: string,
          claim: Pick<ProviderIntakeClaimRecord, 'state' | 'run_id' | 'run_manifest_path'>,
          run: Pick<ProviderIssueRunRecord, 'provider' | 'issueId' | 'runId' | 'manifestPath'> | null = null
        ): string | null => {
          if (run) {
            return resolveProviderPollRunOccupancyKey(run);
          }
          if (claim.state === 'running') {
            return null;
          }
          return claim.run_manifest_path ?? claim.run_id ?? `claim:${providerKey}:${claim.state}`;
        };
        const noteOccupiedPollDispatchSlot = (
          occupancyKey: string | null,
          providerKey: string,
          trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>
        ): void => {
          if (!occupancyKey) {
            return;
          }
          occupiedPollDispatchProviderKeys.add(providerKey);
          const occupiedTrackedIssue = occupiedPollDispatchStateByKey.get(occupancyKey);
          if (occupiedPollDispatchKeys.has(occupancyKey)) {
            if (occupiedTrackedIssue && occupiedTrackedIssue.state !== trackedIssue.state) {
              pollDispatchBudget.releaseOccupied(occupiedTrackedIssue);
              occupiedPollDispatchStateByKey.set(occupancyKey, { state: trackedIssue.state });
              pollDispatchBudget.noteOccupied(trackedIssue);
            }
            return;
          }
          occupiedPollDispatchKeys.add(occupancyKey);
          occupiedPollDispatchStateByKey.set(occupancyKey, { state: trackedIssue.state });
          occupiedPollDispatchProviderKeyByKey.set(occupancyKey, providerKey);
          refreshCounts.occupied_slots += 1;
          pollDispatchBudget.noteOccupied(trackedIssue);
        };
        const noteOccupiedPollDispatchSlotForRetainedClaim = (
          claim: Pick<
            ProviderIntakeClaimRecord,
            'state' | 'retry_queued' | 'run_id' | 'run_manifest_path' | 'issue_state' | 'issue_state_type'
          >,
          run: ProviderIssueRunRecord | null,
          providerKey: string,
          trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>
        ): void => {
          if (!shouldRetainedProviderClaimOccupyPollDispatchSlot(claim, run)) {
            occupiedPollDispatchProviderKeys.add(providerKey);
            return;
          }
          noteOccupiedPollDispatchSlot(
            resolveClaimPollDispatchSlotKey(providerKey, claim, run),
            providerKey,
            trackedIssue
          );
        };
        const releaseOccupiedPollDispatchSlot = (occupancyKey: string | null): void => {
          if (!occupancyKey) {
            return;
          }
          const trackedIssue = occupiedPollDispatchStateByKey.get(occupancyKey);
          if (!trackedIssue) {
            return;
          }
          const providerKey = occupiedPollDispatchProviderKeyByKey.get(occupancyKey) ?? null;
          occupiedPollDispatchKeys.delete(occupancyKey);
          occupiedPollDispatchStateByKey.delete(occupancyKey);
          occupiedPollDispatchProviderKeyByKey.delete(occupancyKey);
          if (providerKey) {
            let providerStillOccupied = false;
            for (const existingProviderKey of occupiedPollDispatchProviderKeyByKey.values()) {
              if (existingProviderKey === providerKey) {
                providerStillOccupied = true;
                break;
              }
            }
            if (!providerStillOccupied) {
              occupiedPollDispatchProviderKeys.delete(providerKey);
            }
          }
          refreshCounts.occupied_slots = Math.max(0, refreshCounts.occupied_slots - 1);
          pollDispatchBudget.releaseOccupied(trackedIssue);
        };

        // Host-global capacity must count every live or queued provider worker
        // before a refresh cycle spends retained-claim reads or starts fresh work.
        const activeDiscoveredRuns = discoveredRuns.filter((run) => run.status === 'in_progress');
        const queuedDiscoveredRuns = discoveredRuns.filter((run) => run.status === 'queued');
        const occupyingRunsByProviderIssue = groupProviderIssueRuns([
          ...activeDiscoveredRuns,
          ...queuedDiscoveredRuns
        ]);
        const claimByProviderKey = new Map<string, ProviderIntakeClaimRecord>();
        const claimStateByProviderKey = new Map<string, string | null>();
        for (const claim of options.state.claims) {
          claimByProviderKey.set(claim.provider_key, claim);
          claimStateByProviderKey.set(
            claim.provider_key,
            resolveProviderClaimIssueStateForAdmission(claim)
          );
        }
        const seededPollOccupancyKeys = new Set<string>();
        for (const claim of options.state.claims) {
          if (!shouldProviderClaimOccupyPollDispatchSlot(claim)) {
            continue;
          }
          const claimProviderKey = buildProviderIssueKey(claim.provider, claim.issue_id);
          const claimRuns = occupyingRunsByProviderIssue.get(claimProviderKey) ?? [];
          const occupyingRun = resolveProviderClaimRunIdentity(claim, claimRuns) ?? claimRuns[0] ?? null;
          const occupancyKey = resolveClaimPollDispatchSlotKey(claimProviderKey, claim, occupyingRun);
          if (!occupancyKey) {
            continue;
          }
          if (seededPollOccupancyKeys.has(occupancyKey)) {
            continue;
          }
          seededPollOccupancyKeys.add(occupancyKey);
          const claimAdmissionState = resolveProviderClaimIssueStateForAdmission(
            claim,
            occupyingRun
          );
          claimStateByProviderKey.set(claimProviderKey, claimAdmissionState);
          noteOccupiedPollDispatchSlot(
            occupancyKey,
            claimProviderKey,
            trackedIssuesByKey?.get(claimProviderKey) ?? { state: claimAdmissionState }
          );
        }

        for (const run of activeDiscoveredRuns) {
          const occupancyKey = resolveProviderPollRunOccupancyKey(run);
          if (seededPollOccupancyKeys.has(occupancyKey)) {
            continue;
          }
          seededPollOccupancyKeys.add(occupancyKey);
          const providerKey = buildProviderIssueKey(run.provider, run.issueId);
          noteOccupiedPollDispatchSlot(
            occupancyKey,
            providerKey,
            trackedIssuesByKey?.get(providerKey) ?? {
              state: resolveProviderClaimIssueStateForAdmission(
                claimByProviderKey.get(providerKey) ?? null,
                run
              )
            }
          );
        }
        for (const run of queuedDiscoveredRuns) {
          const providerKey = buildProviderIssueKey(run.provider, run.issueId);
          const claim = claimByProviderKey.get(providerKey) ?? null;
          const occupancyKey = resolveProviderPollRunOccupancyKey(run);
          if (
            isReleasedProviderClaimRunIdentityMatch(claim, run) ||
            !shouldCountQueuedAdmissionOccupancyForClaim(claim, run)
          ) {
            continue;
          }
          if (seededPollOccupancyKeys.has(occupancyKey)) {
            continue;
          }
          seededPollOccupancyKeys.add(occupancyKey);
          noteOccupiedPollDispatchSlot(
            occupancyKey,
            providerKey,
            trackedIssuesByKey?.get(providerKey) ?? {
              state: resolveProviderClaimIssueStateForAdmission(claim, run)
            }
          );
        }
        const unreadableAdmissionOccupancy =
          await discoverUnreadableProviderAdmissionOccupancyForCurrentOperation();
        for (const record of unreadableAdmissionOccupancy) {
          if (seededPollOccupancyKeys.has(record.manifestPath)) {
            continue;
          }
          const providerKey = buildProviderIssueKey(record.provider, record.issueId);
          seededPollOccupancyKeys.add(record.manifestPath);
          noteOccupiedPollDispatchSlot(
            record.manifestPath,
            providerKey,
            trackedIssuesByKey?.get(providerKey) ?? { state: claimStateByProviderKey.get(providerKey) ?? null }
          );
        }
        recordRefreshProgress('refresh:claim_reconcile', {
          requestClass: 'claim_reconcile'
        });
        const hasFreshDiscoveryCandidates =
          pollInput !== undefined &&
          (trackedIssueRefetch !== null || pollInput.trackedIssues.length > 0);
        const boundPreDiscoveryIssueByIdReads =
          pollInput !== undefined &&
          (
            hasFreshDiscoveryCandidates ||
            pollInput.deferFreshDiscovery === true ||
            pollInput.allowPollFailClosed === true
          );
        const shouldReserveFreshDiscoverySlot =
          boundPreDiscoveryIssueByIdReads && hasFreshDiscoveryCandidates;
        const preDiscoveryIssueByIdReadLimit = boundPreDiscoveryIssueByIdReads
          ? shouldReserveFreshDiscoverySlot
            ? Math.max(0, pollDispatchBudget.remainingGlobalSlots() - 1)
            : Math.max(1, refreshCounts.occupied_slots)
          : Number.POSITIVE_INFINITY;
        let preDiscoveryNonActiveIssueByIdReads = 0;
        let backlogReleaseDirectProofReads = 0;
        let noRunPendingReopenLiveStartedProbeReads = 0;
        const hasUnverifiedBacklogReleaseDirectProofCandidates =
          trackedIssuesByKey === null &&
          [...options.state.claims].some((candidateClaim) => {
            const candidateProviderKey = buildProviderIssueKey(
              candidateClaim.provider,
              candidateClaim.issue_id
            );
            const candidateRuns =
              runsByProviderIssue.get(candidateProviderKey) ?? [];
            const candidateAttachableRuns = filterProviderIssueRunsForStartPipeline(
              candidateRuns,
              startPipelineId
            );
            const candidateActiveRun =
              candidateAttachableRuns.find((run) => run.status === 'in_progress') ?? null;
            const candidateReleaseRun = resolveProviderReleaseRun(
              candidateClaim,
              candidateAttachableRuns
            );
            const candidateLatestRun = resolveLatestKnownProviderRun(candidateAttachableRuns);
            return (
              shouldUseCachedReleasedBacklogNotActiveClaimResolution({
                claim: candidateClaim,
                activeRun: candidateActiveRun,
                releaseRun: candidateReleaseRun,
                latestRun: candidateLatestRun
              }) &&
              !hasBacklogNotActiveDirectIssueByIdPassiveVerificationForCurrentSnapshot(
                candidateClaim
              ) &&
              !canFreshDiscoverReleasedLiveWorkerClaim(
                candidateClaim,
                candidateReleaseRun,
                candidateActiveRun,
                hasPendingReleaseCancel
              )
            );
          });

        for (const claim of [...options.state.claims]) {
          assertRefreshCycleNotStuck();
          const claimProviderKey = buildProviderIssueKey(claim.provider, claim.issue_id);
          if (resolveReleasedProviderIssuePollFailClosedReason(claim)) {
            if (shouldExcludeReleasedTerminalMergeCloseoutFreshDiscoveryProbe(claim)) {
              releasedFailClosedEligibleCount += 1;
            } else {
              releasedFailClosedDisqualifyingRetainedCount += 1;
            }
          } else if (shouldProviderClaimDisqualifyAllReleasedSuppressor(claim)) {
            releasedFailClosedDisqualifyingRetainedCount += 1;
          }
          refreshCounts.claims_scanned += 1;
          try {
          const claimRuns =
            runsByProviderIssue.get(claimProviderKey) ?? [];
          const attachableClaimRuns = filterProviderIssueRunsForStartPipeline(
            claimRuns,
            startPipelineId
          );
          const activeRun = attachableClaimRuns.find((run) => run.status === 'in_progress') ?? null;
          const releaseRun = resolveProviderReleaseRun(claim, attachableClaimRuns);
          const latestRun = resolveLatestKnownProviderRun(attachableClaimRuns);
          const canFreshDiscoverReleasedMissingRetainedRun =
            claim.state === 'released' &&
            canFreshDiscoverPlainReleasedMissingRetainedRunClaim({
              claim,
              releaseRun,
              sameIssueRuns: claimRuns,
              unreadableAdmissionOccupancy,
              hasPendingReleaseCancel
            });
          const canFreshDiscoverReleasedLiveWorker =
            claim.state === 'released' &&
            canFreshDiscoverReleasedLiveWorkerClaim(
              claim,
              releaseRun,
              activeRun,
              hasPendingReleaseCancel
            );
          const shouldBlockPlainReleasedWithoutConcreteRetainedRunFreshDiscovery =
            pollInput?.deferFreshDiscovery === true &&
            shouldBlockPlainReleasedWithoutConcreteRetainedRunClaim(claim);
          const shouldBlockPendingReopenFreshDiscovery =
            claim.state === 'released' &&
            pollInput?.deferFreshDiscovery === true &&
            isProviderIssueReleasedPendingReopen(claim.reason ?? null) &&
            !canFreshDiscoverReleasedReclaimClaim(
              claim,
              releaseRun,
              hasPendingReleaseCancel
            ) &&
            !canFreshDiscoverReleasedMissingRetainedRun &&
            !canFreshDiscoverReleasedLiveWorker;
          const shouldProbeNoRunPendingReopenLiveStartedTruth =
            pollInput?.deferFreshDiscovery === true &&
            shouldProbeNoRunReleasedPendingReopenClaimForLiveStartedTruth({
              claim,
              releaseRun,
              activeRun,
              latestRun,
              hasPendingReleaseCancel
            });
          const hasOccupiedPollDispatchProviderKey =
            occupiedPollDispatchProviderKeys.has(claimProviderKey);
          const canUseNoRunPendingReopenLiveStartedProbe =
            shouldProbeNoRunPendingReopenLiveStartedTruth &&
            !hasOccupiedPollDispatchProviderKey &&
            noRunPendingReopenLiveStartedProbeReads < 1;
          const retainedReleasedBlockerSnapshot =
            trackedIssueBlockersByKey?.get(claimProviderKey) ?? null;
          const shouldRefreshReleasedNotActiveMetadataFromBlockerSnapshot =
            shouldUseTrackedIssueBlockerSnapshotForRetainedReleasedNotActiveMetadataRefresh({
              claim,
              blocker: retainedReleasedBlockerSnapshot
            });
          const shouldUseCachedReleasedTerminalHistoricalClaim =
            shouldUseCachedReleasedTerminalHistoricalClaimResolution({
              claim,
              activeRun,
              releaseRun,
              latestRun,
              refreshFromBlockerSnapshot:
                shouldRefreshReleasedNotActiveMetadataFromBlockerSnapshot
            });
          const shouldUseCachedReleasedBacklogNotActiveClaim =
            shouldUseCachedReleasedBacklogNotActiveClaimResolution({
              claim,
              activeRun,
              releaseRun,
              latestRun
            });
          const shouldUseCachedReleasedMergedCloseoutNotActiveClaim =
            shouldUseCachedReleasedMergedCloseoutNotActiveClaimResolution({
              claim,
              activeRun,
              releaseRun,
              latestRun,
              refreshFromBlockerSnapshot:
                shouldRefreshReleasedNotActiveMetadataFromBlockerSnapshot
            });
          const canUseCachedReleasedTerminalHistoricalClaim =
            shouldUseCachedReleasedTerminalHistoricalClaim;
          const shouldRevalidateCurrentReleasedReviewPromotion =
            claim.state === 'released' &&
            claim.reason === 'provider_issue_released:not_active' &&
            isTerminalProviderIntakeIssueState(claim) &&
            !canTreatReviewPromotionAsStaleForReleasedTerminalHistoricalClaim(claim);
          const currentPollTrackedIssue = trackedIssuesByKey?.get(claimProviderKey) ?? null;
          const hasBacklogNotActivePassiveVerificationForCurrentSnapshot =
            hasBacklogNotActiveDirectIssueByIdPassiveVerificationForCurrentSnapshot(claim);
          const shouldRevalidateBacklogNotActivePassiveVerification =
            trackedIssuesByKey === null &&
            hasBacklogNotActivePassiveVerificationForCurrentSnapshot &&
            isBacklogNotActiveDirectIssueByIdPassiveVerificationRevalidationDueForCurrentSnapshot(
              claim
            );
          const canUseBacklogNotActivePassiveVerificationForThisRefresh =
            hasBacklogNotActivePassiveVerificationForCurrentSnapshot &&
            (
              !shouldRevalidateBacklogNotActivePassiveVerification ||
              hasUnverifiedBacklogReleaseDirectProofCandidates
            );
          const shouldUseBacklogReleaseDirectProofBudget =
            shouldUseCachedReleasedBacklogNotActiveClaim &&
            currentPollTrackedIssue === null &&
            (
              !hasBacklogNotActivePassiveVerificationForCurrentSnapshot ||
              (
                shouldRevalidateBacklogNotActivePassiveVerification &&
                !hasUnverifiedBacklogReleaseDirectProofCandidates
              )
            ) &&
            !canFreshDiscoverReleasedLiveWorker;
          if (
            shouldKeepCurrentPollReleasedTerminalHistoricalClaimPassive({
              claim,
              trackedIssue: currentPollTrackedIssue,
              canUseCachedReleasedTerminalHistoricalClaim
            })
          ) {
            consumedTrackedIssueKeys.add(claimProviderKey);
            releasedFailClosedSkipCount += 1;
            releasedFreshDiscoveryReplayBlockedProviderKeys.add(claimProviderKey);
            deferredClaimFreshDiscoveryBlockedProviderKeys.add(claimProviderKey);
            continue;
          }
          const shouldKeepCachedReleasedBacklogNotActiveClaimPassiveBeforeReconcile =
            shouldUseCachedReleasedBacklogNotActiveClaim &&
            (
              trackedIssuesByKey !== null ||
              canUseBacklogNotActivePassiveVerificationForThisRefresh
            ) &&
            currentPollTrackedIssue === null &&
            !canFreshDiscoverReleasedLiveWorker &&
            (
              canUseBacklogNotActivePassiveVerificationForThisRefresh ||
              !shouldRefreshReleasedNotActiveMetadataFromBlockerSnapshot
            );
          if (shouldKeepCachedReleasedBacklogNotActiveClaimPassiveBeforeReconcile) {
            continue;
          }
          if (
            shouldUseBacklogReleaseDirectProofBudget &&
            backlogReleaseDirectProofReads >=
              PROVIDER_BACKLOG_RELEASE_DIRECT_PROOF_READS_PER_REFRESH
          ) {
            refreshCounts.issue_by_id_deferred += 1;
            deferredClaimFreshDiscoveryBlockedProviderKeys.add(claimProviderKey);
            recordRefreshProgress('refresh:claim_issue_by_id_reconcile', {
              requestClass: 'claim_issue_by_id:released_deferred',
              providerKeys: [claimProviderKey]
            });
            continue;
          }
          const shouldKeepCachedReleasedMergedCloseoutNotActiveClaimPassiveBeforeReconcile =
            shouldUseCachedReleasedMergedCloseoutNotActiveClaim &&
            trackedIssuesByKey !== null &&
            currentPollTrackedIssue === null &&
            !canFreshDiscoverReleasedLiveWorker &&
            !shouldRefreshReleasedNotActiveMetadataFromBlockerSnapshot;
          if (shouldKeepCachedReleasedMergedCloseoutNotActiveClaimPassiveBeforeReconcile) {
            continue;
          }
          const shouldKeepCachedReleasedTerminalHistoricalClaimPassiveBeforeReconcile =
            canUseCachedReleasedTerminalHistoricalClaim &&
            currentPollTrackedIssue === null &&
            !shouldRevalidateCurrentReleasedReviewPromotion &&
            !canFreshDiscoverReleasedLiveWorker &&
            !shouldRefreshReleasedNotActiveMetadataFromBlockerSnapshot;
          if (shouldKeepCachedReleasedTerminalHistoricalClaimPassiveBeforeReconcile) {
            consumedTrackedIssueKeys.add(claimProviderKey);
            releasedFailClosedSkipCount += 1;
            releasedFreshDiscoveryReplayBlockedProviderKeys.add(claimProviderKey);
            deferredClaimFreshDiscoveryBlockedProviderKeys.add(claimProviderKey);
            continue;
          }
          if (
            pollInput?.deferFreshDiscovery === true &&
            trackedIssueRefetch &&
            retainedReleasedBlockerSnapshot === null &&
            shouldBlockPlainReleasedWithoutConcreteRetainedRunFreshDiscovery
          ) {
            deferredRetainedReleasedBlockerRefreshProviderKeys.add(claimProviderKey);
          }
          const normallyAllowDirectIssueById =
            (
              !boundPreDiscoveryIssueByIdReads ||
              activeRun !== null ||
              preDiscoveryNonActiveIssueByIdReads < preDiscoveryIssueByIdReadLimit
            ) &&
            (
              !shouldBlockPlainReleasedWithoutConcreteRetainedRunFreshDiscovery ||
              shouldRefreshReleasedNotActiveMetadataFromBlockerSnapshot
            ) &&
            !shouldBlockPendingReopenFreshDiscovery;
          const allowDirectIssueById =
            canUseCachedReleasedTerminalHistoricalClaim
              ? false
              : normallyAllowDirectIssueById || canUseNoRunPendingReopenLiveStartedProbe;
          const shouldCountNoRunPendingReopenLiveStartedProbe =
            !normallyAllowDirectIssueById && canUseNoRunPendingReopenLiveStartedProbe;
          let usedNoRunPendingReopenLiveStartedProbe = false;
          recordRefreshProgress('refresh:claim_reconcile', {
            requestClass: `claim_reconcile:${claim.state ?? 'unknown'}`,
            providerKeys: [claimProviderKey]
          });
          const resolution = await resolveRefreshTrackedIssueResolution({
            claim,
            trackedIssuesByKey,
            consumedTrackedIssueKeys,
            allowPollFailClosed: pollInput?.deferFreshDiscovery === true,
            allowReleasedPollFailClosed:
              (
                pollInput?.allowPollFailClosed === true ||
                pollInput?.deferFreshDiscovery === true ||
                canUseCachedReleasedTerminalHistoricalClaim
              ) &&
              !shouldRevalidateCurrentReleasedReviewPromotion &&
              !canFreshDiscoverReleasedLiveWorker &&
              !shouldRefreshReleasedNotActiveMetadataFromBlockerSnapshot,
            allowDirectIssueById,
            releaseOnlyCachedPendingRevalidation: pollInput?.deferFreshDiscovery === true,
            onDirectIssueById: () => {
              refreshCounts.issue_by_id_reads += 1;
              if (shouldUseBacklogReleaseDirectProofBudget) {
                backlogReleaseDirectProofReads += 1;
              }
              if (boundPreDiscoveryIssueByIdReads && activeRun === null) {
                preDiscoveryNonActiveIssueByIdReads += 1;
              }
              if (shouldCountNoRunPendingReopenLiveStartedProbe) {
                usedNoRunPendingReopenLiveStartedProbe = true;
                noRunPendingReopenLiveStartedProbeReads += 1;
              }
              recordRefreshProgress('refresh:claim_issue_by_id_reconcile', {
                requestClass: `claim_issue_by_id:${claim.state ?? 'unknown'}`,
                providerKeys: [claimProviderKey]
              });
            },
            onDirectIssueByIdResult: ({ consumesPreDiscoveryNonActiveBudget }) => {
              if (
                !consumesPreDiscoveryNonActiveBudget &&
                boundPreDiscoveryIssueByIdReads &&
                activeRun === null
              ) {
                preDiscoveryNonActiveIssueByIdReads = Math.max(0, preDiscoveryNonActiveIssueByIdReads - 1);
              }
              if (
                !consumesPreDiscoveryNonActiveBudget &&
                shouldCountNoRunPendingReopenLiveStartedProbe
              ) {
                noRunPendingReopenLiveStartedProbeReads = Math.max(
                  0,
                  noRunPendingReopenLiveStartedProbeReads - 1
                );
                usedNoRunPendingReopenLiveStartedProbe = false;
              }
            }
          });
          assertRefreshCycleNotStuck();

          if (resolution.kind === 'skip') {
            if (isReleasedProviderIssuePollFailClosedReason(resolution.reason)) {
              if (shouldExcludeReleasedTerminalMergeCloseoutFreshDiscoveryProbe(claim)) {
                releasedFailClosedSkipCount += 1;
                releasedFreshDiscoveryReplayBlockedProviderKeys.add(claimProviderKey);
              }
            }
            if (resolution.reason === 'provider_issue_poll_deferred_for_fresh_discovery') {
              refreshCounts.issue_by_id_deferred += 1;
              if (
                claim.state !== 'released' ||
                (
                  !canFreshDiscoverReleasedReclaimClaim(
                    claim,
                    releaseRun,
                    hasPendingReleaseCancel
                  ) &&
                  !canFreshDiscoverReleasedMissingRetainedRun &&
                  !canFreshDiscoverReleasedLiveWorker &&
                  shouldExcludeReleasedTerminalMergeCloseoutFreshDiscoveryProbe(claim)
                )
              ) {
                deferredClaimFreshDiscoveryBlockedProviderKeys.add(claimProviderKey);
              }
              recordRefreshProgress('refresh:claim_issue_by_id_reconcile', {
                requestClass: `claim_issue_by_id:${claim.state ?? 'unknown'}`,
                providerKeys: [claimProviderKey]
              });
            }
            if (shouldSuppressFreshDiscoveryForPollFailClosedReason(resolution.reason)) {
              suppressFreshDiscovery = true;
            }
            if (claim.state === 'released') {
              if (
                !isInactiveReleasedReclaimRun(claim, releaseRun) &&
                !(
                  activeRun &&
                  shouldDeferReleasedLiveWorkerCancelForFreshTruth(claim, {
                    freshDiscoveryDeferred:
                      resolution.reason === 'provider_issue_poll_deferred_for_fresh_discovery',
                    canFreshDiscoverReleasedLiveWorker
                  })
                )
              ) {
                void retryReleaseCancel({
                  releaseRun,
                  reason: claim.reason ?? 'provider_issue_released',
                  assertCurrent: assertRefreshLifecycleCurrent
                });
              }
            }
            continue;
          }
          if (resolution.kind === 'release') {
            if (
              resolution.reason === 'not_active' &&
              resolution.source === 'direct_issue_by_id' &&
              resolution.trackedIssue &&
              shouldUseCachedReleasedBacklogNotActiveClaim &&
              isReleasedBacklogNotActiveClaim({
                ...claim,
                issue_state: resolution.trackedIssue.state,
                issue_state_type: resolution.trackedIssue.state_type
              }) &&
              !canFreshDiscoverReleasedLiveWorker
            ) {
              await markReleasedBacklogNotActiveClaimPassiveVerified({
                claim,
                trackedIssue: resolution.trackedIssue
              });
              if (!activeRun) {
                releaseOccupiedPollDispatchSlot(
                  resolveClaimPollDispatchSlotKey(claimProviderKey, claim, activeRun)
                );
              }
              continue;
            }
            if (
              resolution.reason === 'not_found' &&
              resolution.source !== 'direct_issue_by_id' &&
              claim.state === 'released' &&
              pollInput?.deferFreshDiscovery === true &&
              canRecheckPlainReleasedNotActiveClaim(claim) &&
              (
                canFreshDiscoverReleasedReclaimClaim(
                  claim,
                  releaseRun,
                  hasPendingReleaseCancel
                ) ||
                canFreshDiscoverReleasedMissingRetainedRun
              )
            ) {
              continue;
            }
            if (
              resolution.reason === 'not_active' &&
              resolution.trackedIssue &&
              shouldRefreshReleasedNotActiveMetadataFromBlockerSnapshot &&
              canRefreshRetainedReleasedNotActiveClaimMetadataOnly({
                claim,
                trackedIssue: resolution.trackedIssue
              })
            ) {
              await refreshRetainedReleasedNotActiveClaimMetadata({
                claim,
                releaseRun,
                trackedIssue: resolution.trackedIssue
              });
              const releaseRunForCancel = releaseRun ?? activeRun;
              if (
                shouldAttemptReleaseCancel(releaseRunForCancel) &&
                !isInactiveReleasedReclaimRun(claim, releaseRunForCancel)
              ) {
                void retryReleaseCancel({
                  releaseRun: releaseRunForCancel,
                  reason: claim.reason ?? 'provider_issue_released',
                  assertCurrent: assertRefreshLifecycleCurrent
                });
              }
              if (!activeRun) {
                releaseOccupiedPollDispatchSlot(
                  resolveClaimPollDispatchSlotKey(claimProviderKey, claim, activeRun)
                );
              }
              continue;
            }
            await releaseClaim({
              claim,
              nextReason: `provider_issue_released:${resolution.reason}`,
              releaseRun,
              trackedIssue: resolution.trackedIssue,
              cleanupWorkspace: resolution.cleanupWorkspace
            });
            if (!activeRun) {
              releaseOccupiedPollDispatchSlot(
                resolveClaimPollDispatchSlotKey(claimProviderKey, claim, activeRun)
              );
            }
            continue;
          }

          if (claim.state === 'released') {
            if (
              activeRun &&
              !hasPendingReleaseCancel(activeRun.manifestPath) &&
              isProviderIssueReleasedLiveWorkerRehydrateCandidate(claim) &&
              isTrackedIssueFreshEnoughForClaim(claim, resolution.trackedIssue) &&
              isProviderStartedWorkerTrackedIssue(resolution.trackedIssue)
            ) {
              const workerHost = resolveRehydratedActiveRunWorkerHost(activeRun, claim);
              const trackedIssueFields = buildFreshTrackedIssueActiveRunFields(
                claim,
                resolution.trackedIssue
              );
              const reactivatedMergeCloseoutReset =
                claim.reason === 'provider_issue_rehydrated_active_run'
                  ? {}
                  : { review_promotion: null, merge_closeout: null };
              const launchProvenance = await resolveRehydratedActiveRunLaunchProvenance({
                claim,
                activeRun
              });
              const transitioned = hasProviderClaimTransitioned(claim, {
                ...trackedIssueFields,
                state: 'running',
                reason: 'provider_issue_rehydrated_active_run',
                task_id: activeRun.taskId,
                run_id: activeRun.runId,
                run_manifest_path: activeRun.manifestPath,
                worker_host: workerHost,
                ...launchProvenance,
                ...buildActiveRunRetryFields(claim),
                ...reactivatedMergeCloseoutReset
              });
              const refreshReleasedActiveRunSnapshot = captureProviderStateSnapshot();
              upsertProviderIntakeClaim(options.state, {
                ...claim,
                ...trackedIssueFields,
                ...launchProvenance,
                task_id: activeRun.taskId,
                state: 'running',
                reason: 'provider_issue_rehydrated_active_run',
                run_id: activeRun.runId,
                run_manifest_path: activeRun.manifestPath,
                worker_host: workerHost,
                ...buildActiveRunRetryFields(claim),
                ...reactivatedMergeCloseoutReset
              });
              if (transitioned) {
                await persistStateOrRollback(refreshReleasedActiveRunSnapshot);
                options.publishRuntime?.('provider-intake.refresh');
              }
              noteOccupiedPollDispatchSlot(
                resolveProviderPollRunOccupancyKey(activeRun),
                claimProviderKey,
                resolution.trackedIssue
              );
              continue;
            }
            let refreshedReleasedNonStartedActiveRun = false;
            if (
              activeRun &&
              isProviderIssueReleasedLiveWorkerRehydrateCandidate(claim) &&
              !isProviderStartedWorkerTrackedIssue(resolution.trackedIssue) &&
              isTrackedIssueFreshEnoughForClaim(claim, resolution.trackedIssue)
            ) {
              const trackedIssueFields = buildFreshTrackedIssueActiveRunFields(
                claim,
                resolution.trackedIssue
              );
              const retainedRunIdentity = resolveReleasedClaimRetainedRunIdentity({
                claim,
                run: releaseRun ?? activeRun,
                trackedIssue: resolution.trackedIssue
              });
              const transitioned = hasProviderClaimTransitioned(claim, {
                ...trackedIssueFields,
                state: 'released',
                reason: claim.reason ?? 'provider_issue_released',
                ...retainedRunIdentity
              });
              await upsertProviderClaimAndPersist({
                ...claim,
                ...trackedIssueFields,
                launch_source: undefined,
                launch_token: undefined,
                ...retainedRunIdentity,
                state: 'released',
                reason: claim.reason ?? 'provider_issue_released'
              });
              if (transitioned) {
                options.publishRuntime?.('provider-intake.refresh');
              }
              refreshedReleasedNonStartedActiveRun = true;
            }
            const releaseRunForCancel = releaseRun ?? activeRun;
            if (
              shouldAttemptReleaseCancel(releaseRunForCancel) &&
              !isInactiveReleasedReclaimRun(claim, releaseRunForCancel)
            ) {
              void retryReleaseCancel({
                releaseRun: releaseRunForCancel,
                reason: claim.reason ?? 'provider_issue_released',
                assertCurrent: assertRefreshLifecycleCurrent
              });
              continue;
            }
            if (refreshedReleasedNonStartedActiveRun) {
              continue;
            }
            if (resolution.kind === 'owned') {
              const currentClaim =
                claim.retry_queued === true
                  ? await ensureQueuedProviderRetryDeadline({
                      claim,
                      trackedIssue: resolution.trackedIssue,
                      previousRun: latestRun,
                      trackedIssueRefetch
                    })
                  : claim;
              const reviewPromotionRun =
                resolveProviderClaimRunIdentity(currentClaim, attachableClaimRuns) ?? latestRun;
              const reviewPromotionClaim = await maybeHandleReviewHandoffPromotion({
                claim: currentClaim,
                trackedIssue: resolution.trackedIssue,
                latestRun: reviewPromotionRun
              });
              if (reviewPromotionClaim) {
                noteOccupiedPollDispatchSlotForRetainedClaim(
                  reviewPromotionClaim,
                  reviewPromotionRun,
                  claimProviderKey,
                  resolution.trackedIssue
                );
                continue;
              }
              await retainOwnedHandoffClaim({
                claim: currentClaim,
                trackedIssue: resolution.trackedIssue,
                run: resolveProviderClaimRunIdentity(currentClaim, attachableClaimRuns) ?? latestRun,
                state: currentClaim.state,
                reason: 'provider_issue_handoff_owned'
              });
              continue;
            }
            if (!shouldReopenReleasedClaimOnRefresh({
              claim,
              releaseRun,
              trackedIssue: resolution.trackedIssue
            })) {
              await refreshRetainedReleasedNotActiveClaimMetadata({
                claim,
                releaseRun,
                trackedIssue: resolution.trackedIssue
              });
              continue;
            }
            if (
              shouldProbeNoRunPendingReopenLiveStartedTruth &&
              hasOccupiedPollDispatchProviderKey
            ) {
              deferredClaimFreshDiscoveryBlockedProviderKeys.add(claimProviderKey);
              continue;
            }
            if (
              usedNoRunPendingReopenLiveStartedProbe &&
              !isProviderStartedWorkerTrackedIssue(resolution.trackedIssue)
            ) {
              continue;
            }
            if (
              shouldBlockPlainReleasedWithoutConcreteRetainedRunFreshDiscovery ||
              (
                (
                  canRecheckPlainReleasedNotActiveClaim(claim) ||
                  canProbeFreshDiscoveryForReleasedNotActiveTerminalMergeCloseoutClaim(claim)
                ) &&
                !canFreshDiscoverReleasedReclaimClaim(
                  claim,
                  releaseRunForCancel,
                  hasPendingReleaseCancel
                )
              )
            ) {
              await refreshRetainedReleasedNotActiveClaimMetadata({
                claim,
                releaseRun,
                trackedIssue: resolution.trackedIssue
              });
              if (!canFreshDiscoverReleasedMissingRetainedRun) {
                deferredClaimFreshDiscoveryBlockedProviderKeys.add(claimProviderKey);
              }
              continue;
            }
            if (shouldBlockPendingReopenFreshDiscovery) {
              await refreshRetainedReleasedNotActiveClaimMetadata({
                claim,
                releaseRun,
                trackedIssue: resolution.trackedIssue
              });
              deferredClaimFreshDiscoveryBlockedProviderKeys.add(claimProviderKey);
              continue;
            }
            const shouldPreserveFreshDiscoverySlotForReleasedStart =
              shouldReserveFreshDiscoverySlot && !usedNoRunPendingReopenLiveStartedProbe;
            const canDispatchReleasedStart = pollDispatchBudget.canDispatch(resolution.trackedIssue);
            const canDispatchReleasedStartWhilePreservingFreshDiscoverySlot =
              !shouldPreserveFreshDiscoverySlotForReleasedStart ||
              pollDispatchBudget.canDispatchWhilePreservingFreshDiscoverySlot(
                resolution.trackedIssue
              );
            if (
              !canDispatchReleasedStart ||
              !canDispatchReleasedStartWhilePreservingFreshDiscoverySlot
            ) {
              if (
                shouldProbeNoRunPendingReopenLiveStartedTruth &&
                !hasOccupiedPollDispatchProviderKey &&
                isProviderStartedWorkerTrackedIssue(resolution.trackedIssue) &&
                (
                  !canDispatchReleasedStart ||
                  usedNoRunPendingReopenLiveStartedProbe
                )
              ) {
                const handoffResult = await launchStartForTrackedIssue({
                  claim,
                  trackedIssue: resolution.trackedIssue,
                  reason: 'provider_issue_refresh_start_launched',
                  previousRun: latestRun
                });
                if (shouldCountProviderAdmissionResultForPollBudget(handoffResult)) {
                  noteOccupiedPollDispatchSlot(
                    resolveClaimPollDispatchSlotKey(claimProviderKey, handoffResult.claim),
                    claimProviderKey,
                    resolution.trackedIssue
                  );
                }
                continue;
              }
              await refreshRetainedReleasedNotActiveClaimMetadata({
                claim,
                releaseRun,
                trackedIssue: resolution.trackedIssue
              });
              if (
                !canFreshDiscoverReleasedReclaimClaim(
                  claim,
                  releaseRunForCancel,
                  hasPendingReleaseCancel
                ) &&
                !canFreshDiscoverReleasedMissingRetainedRun
              ) {
                deferredClaimFreshDiscoveryBlockedProviderKeys.add(claimProviderKey);
              }
              continue;
            }
            const handoffResult = await launchStartForTrackedIssue({
              claim,
              trackedIssue: resolution.trackedIssue,
              reason: 'provider_issue_refresh_start_launched',
              previousRun: latestRun
            });
            if (shouldCountProviderAdmissionResultForPollBudget(handoffResult)) {
              noteOccupiedPollDispatchSlot(
                resolveClaimPollDispatchSlotKey(claimProviderKey, handoffResult.claim),
                claimProviderKey,
                resolution.trackedIssue
              );
            }
            continue;
          }

          if (resolution.kind === 'owned') {
            if (activeRun) {
              const workerHost = resolveRehydratedActiveRunWorkerHost(activeRun, claim);
              const trackedIssueFreshEnoughForClaim = isTrackedIssueFreshEnoughForClaim(
                claim,
                resolution.trackedIssue
              );
              const preserveRecoveredMergeCloseoutClaim =
                !trackedIssueFreshEnoughForClaim &&
                (
                  isProviderMergeCloseoutWatchingClaim(claim) ||
                  isTerminalProviderMergeCloseoutClaim(claim)
              );
              if (preserveRecoveredMergeCloseoutClaim) {
                noteOccupiedPollDispatchSlot(
                  resolveProviderPollRunOccupancyKey(activeRun),
                  claimProviderKey,
                  resolution.trackedIssue
                );
                continue;
              }
              if (trackedIssueFreshEnoughForClaim) {
                const mergeCloseoutClaim = await maybeHandleRecoveredActiveRunMergedCloseout({
                  claim,
                  trackedIssue: resolution.trackedIssue,
                  latestRun: activeRun
                });
                if (mergeCloseoutClaim) {
                  noteOccupiedPollDispatchSlot(
                    resolveProviderPollRunOccupancyKey(activeRun),
                    claimProviderKey,
                    resolution.trackedIssue
                  );
                  continue;
                }
              }
              const trackedIssueFields = buildFreshTrackedIssueActiveRunFields(
                claim,
                resolution.trackedIssue
              );
              const reactivatedMergeCloseoutReset =
                claim.reason === 'provider_issue_rehydrated_active_run'
                  ? {}
                  : { review_promotion: null, merge_closeout: null };
              const launchProvenance = await resolveRehydratedActiveRunLaunchProvenance({
                claim,
                activeRun
              });
              const transitioned = hasProviderClaimTransitioned(claim, {
                ...trackedIssueFields,
                state: 'running',
                reason: 'provider_issue_rehydrated_active_run',
                task_id: activeRun.taskId,
                run_id: activeRun.runId,
                run_manifest_path: activeRun.manifestPath,
                worker_host: workerHost,
                ...launchProvenance,
                ...buildActiveRunRetryFields(claim),
                ...reactivatedMergeCloseoutReset
              });
              const refreshActiveRunSnapshot = captureProviderStateSnapshot();
              upsertProviderIntakeClaim(options.state, {
                ...claim,
                ...trackedIssueFields,
                ...launchProvenance,
                task_id: activeRun.taskId,
                state: 'running',
                reason: 'provider_issue_rehydrated_active_run',
                run_id: activeRun.runId,
                run_manifest_path: activeRun.manifestPath,
                worker_host: workerHost,
                ...buildActiveRunRetryFields(claim),
                ...reactivatedMergeCloseoutReset
              });
              if (transitioned) {
                await persistStateOrRollback(refreshActiveRunSnapshot);
                options.publishRuntime?.('provider-intake.refresh');
              }
              noteOccupiedPollDispatchSlot(
                resolveProviderPollRunOccupancyKey(activeRun),
                claimProviderKey,
                resolution.trackedIssue
              );
              continue;
            }

            const currentClaim =
              claim.retry_queued === true
                ? await ensureQueuedProviderRetryDeadline({
                    claim,
                    trackedIssue: resolution.trackedIssue,
                    previousRun: latestRun,
                    trackedIssueRefetch
                  })
                : claim;
            if (
              currentClaim.state !== 'starting' &&
              currentClaim.state !== 'resuming' &&
              latestRun?.status !== 'queued'
            ) {
              const reviewPromotionClaim = await maybeHandleReviewHandoffPromotion({
                claim: currentClaim,
                trackedIssue: resolution.trackedIssue,
                latestRun
              });
              if (reviewPromotionClaim) {
                noteOccupiedPollDispatchSlotForRetainedClaim(
                  reviewPromotionClaim,
                  latestRun,
                  claimProviderKey,
                  resolution.trackedIssue
                );
                continue;
              }
              const mergeCloseoutClaim = await maybeHandleDeterministicMergingCloseout({
                claim: currentClaim,
                trackedIssue: resolution.trackedIssue,
                latestRun
              });
              if (mergeCloseoutClaim) {
                noteOccupiedPollDispatchSlotForRetainedClaim(
                  mergeCloseoutClaim,
                  latestRun,
                  claimProviderKey,
                  resolution.trackedIssue
                );
                continue;
              }
            }
            const ownedRun = resolveProviderClaimRunIdentity(currentClaim, attachableClaimRuns) ?? latestRun;
            await retainOwnedHandoffClaim({
              claim: currentClaim,
              trackedIssue: resolution.trackedIssue,
              run: ownedRun,
              state: currentClaim.state,
              reason: 'provider_issue_handoff_owned'
            });
            noteOccupiedPollDispatchSlotForRetainedClaim(
              currentClaim,
              ownedRun,
              claimProviderKey,
              resolution.trackedIssue
            );
            continue;
          }

          if (claim.state === 'starting' || claim.state === 'resuming') {
            noteOccupiedPollDispatchSlot(
              resolveClaimPollDispatchSlotKey(claimProviderKey, claim, latestRun),
              claimProviderKey,
              resolution.trackedIssue
            );
            continue;
          }

          if (activeRun) {
            const workerHost = resolveRehydratedActiveRunWorkerHost(activeRun, claim);
            const trackedIssueFreshEnoughForClaim = isTrackedIssueFreshEnoughForClaim(
              claim,
              resolution.trackedIssue
            );
            const preserveRecoveredMergeCloseoutClaim =
              !trackedIssueFreshEnoughForClaim &&
              (
                isProviderMergeCloseoutWatchingClaim(claim) ||
                isTerminalProviderMergeCloseoutClaim(claim)
            );
            if (preserveRecoveredMergeCloseoutClaim) {
              noteOccupiedPollDispatchSlot(
                resolveProviderPollRunOccupancyKey(activeRun),
                claimProviderKey,
                resolution.trackedIssue
              );
              continue;
            }
            if (trackedIssueFreshEnoughForClaim) {
              const mergeCloseoutClaim = await maybeHandleRecoveredActiveRunMergedCloseout({
                claim,
                trackedIssue: resolution.trackedIssue,
                latestRun: activeRun
              });
              if (mergeCloseoutClaim) {
                noteOccupiedPollDispatchSlot(
                  resolveProviderPollRunOccupancyKey(activeRun),
                  claimProviderKey,
                  resolution.trackedIssue
                );
                continue;
              }
            }
            const trackedIssueFields = buildFreshTrackedIssueActiveRunFields(
              claim,
              resolution.trackedIssue
            );
            const reactivatedMergeCloseoutReset =
              claim.reason === 'provider_issue_rehydrated_active_run'
                ? {}
                : { review_promotion: null, merge_closeout: null };
            const launchProvenance = await resolveRehydratedActiveRunLaunchProvenance({
              claim,
              activeRun
            });
            const transitioned = hasProviderClaimTransitioned(claim, {
              ...trackedIssueFields,
              state: 'running',
              reason: 'provider_issue_rehydrated_active_run',
              task_id: activeRun.taskId,
              run_id: activeRun.runId,
              run_manifest_path: activeRun.manifestPath,
              worker_host: workerHost,
              ...launchProvenance,
              ...buildActiveRunRetryFields(claim),
              ...reactivatedMergeCloseoutReset
            });
            const refreshActiveRunSnapshot = captureProviderStateSnapshot();
            upsertProviderIntakeClaim(options.state, {
              ...claim,
              ...trackedIssueFields,
              ...launchProvenance,
              task_id: activeRun.taskId,
              state: 'running',
              reason: 'provider_issue_rehydrated_active_run',
              run_id: activeRun.runId,
              run_manifest_path: activeRun.manifestPath,
              worker_host: workerHost,
              ...buildActiveRunRetryFields(claim),
              ...reactivatedMergeCloseoutReset
            });
            if (transitioned) {
              await persistStateOrRollback(refreshActiveRunSnapshot);
              options.publishRuntime?.('provider-intake.refresh');
            }
            noteOccupiedPollDispatchSlot(
              resolveProviderPollRunOccupancyKey(activeRun),
              claimProviderKey,
              resolution.trackedIssue
            );
            continue;
          }

          const currentClaim =
            claim.retry_queued === true
              ? await ensureQueuedProviderRetryDeadline({
                  claim,
                  trackedIssue: resolution.trackedIssue,
                  previousRun: latestRun,
                  trackedIssueRefetch
                })
              : claim;
          if (latestRun?.status === 'succeeded') {
            const mergeCloseoutClaim = await maybeHandleDeterministicMergingCloseout({
              claim: currentClaim,
              trackedIssue: resolution.trackedIssue,
              latestRun
            });
            if (mergeCloseoutClaim) {
              noteOccupiedPollDispatchSlotForRetainedClaim(
                mergeCloseoutClaim,
                latestRun,
                claimProviderKey,
                resolution.trackedIssue
              );
              continue;
            }
          }
          if (currentClaim.retry_queued === true) {
            noteOccupiedPollDispatchSlot(
              resolveClaimPollDispatchSlotKey(claimProviderKey, currentClaim, latestRun),
              claimProviderKey,
              resolution.trackedIssue
            );
            continue;
          }
          if (latestRun?.status === 'queued') {
            noteOccupiedPollDispatchSlotForRetainedClaim(
              currentClaim,
              latestRun,
              claimProviderKey,
              resolution.trackedIssue
            );
            continue;
          }

          if (latestRun && latestRun.status && RESUME_ELIGIBLE_STATUSES.has(latestRun.status)) {
            const queuedRetryFields = buildQueuedProviderRetryFields({
              claim: currentClaim,
              previousRun: latestRun,
              error: resolveProviderRetryErrorFromRun(latestRun),
              delayType: 'failure'
            });
            const workerHost = resolveRehydratedActiveRunWorkerHost(latestRun, currentClaim);
            const transitioned = hasProviderClaimTransitioned(currentClaim, {
              ...buildTrackedIssueClaimFields(resolution.trackedIssue),
              state: 'resumable',
              reason: 'provider_issue_rehydrated_resumable_run',
              task_id: latestRun.taskId,
              run_id: latestRun.runId,
              run_manifest_path: latestRun.manifestPath,
              worker_host: workerHost,
              ...queuedRetryFields
            });
            const refreshResumableSnapshot = captureProviderStateSnapshot();
            upsertProviderIntakeClaim(options.state, {
              ...currentClaim,
              ...buildTrackedIssueClaimFields(resolution.trackedIssue),
              task_id: latestRun.taskId,
              state: 'resumable',
              reason: 'provider_issue_rehydrated_resumable_run',
              run_id: latestRun.runId,
              run_manifest_path: latestRun.manifestPath,
              worker_host: workerHost,
              ...queuedRetryFields
            });
            if (transitioned) {
              await persistStateOrRollback(refreshResumableSnapshot);
              options.publishRuntime?.('provider-intake.refresh');
            }
            if (queuedRetryFields.retry_queued === true) {
              noteOccupiedPollDispatchSlot(
                resolveProviderPollRunOccupancyKey(latestRun),
                claimProviderKey,
                resolution.trackedIssue
              );
            }
            continue;
          }

          if (latestRun?.status === 'succeeded') {
            const trackedIssueClaimFields = {
              ...buildFreshTrackedIssueClaimFields(currentClaim, resolution.trackedIssue),
              ...buildTrackedIssueMergeCloseoutResetFields(currentClaim, resolution.trackedIssue)
            };
            const completedState = buildProviderCompletedRunRehydrateState({
              claim: {
                ...currentClaim,
                ...trackedIssueClaimFields
              },
              run: latestRun
            });
            const nextCompletedClaim = {
              ...currentClaim,
              ...trackedIssueClaimFields,
              ...completedState
            };
            const transitioned = hasProviderClaimTransitioned(currentClaim, {
              ...nextCompletedClaim
            });
            const refreshCompletedSnapshot = captureProviderStateSnapshot();
            upsertProviderIntakeClaim(options.state, {
              ...nextCompletedClaim
            });
            if (transitioned) {
              await persistStateOrRollback(refreshCompletedSnapshot);
              options.publishRuntime?.('provider-intake.refresh');
            }
            if (completedState.retry_queued === true) {
              noteOccupiedPollDispatchSlot(
                resolveProviderPollRunOccupancyKey(latestRun),
                claimProviderKey,
                resolution.trackedIssue
              );
            }
            continue;
          }

          if (!latestRun) {
            if (
              !pollDispatchBudget.canDispatch(resolution.trackedIssue) ||
              (
                shouldReserveFreshDiscoverySlot &&
                !pollDispatchBudget.canDispatchWhilePreservingFreshDiscoverySlot(
                  resolution.trackedIssue
                )
              )
            ) {
              deferredClaimFreshDiscoveryBlockedProviderKeys.add(claimProviderKey);
              continue;
            }
            const handoffResult = await launchStartForTrackedIssue({
              claim: currentClaim,
              trackedIssue: resolution.trackedIssue,
              reason: 'provider_issue_refresh_start_launched'
            });
            if (shouldCountProviderAdmissionResultForPollBudget(handoffResult)) {
              noteOccupiedPollDispatchSlot(
                resolveClaimPollDispatchSlotKey(claimProviderKey, handoffResult.claim),
                claimProviderKey,
                resolution.trackedIssue
              );
            }
          }
          } catch (error) {
            if (isRefreshLifecycleStuckError(error)) {
              throw error;
            }
            logger.warn(
              `Provider issue refresh reconcile failed for ${claimProviderKey}: ${
                (error as Error)?.message ?? String(error)
              }`
            );
            continue;
          }
        }

        if (
          releasedFailClosedEligibleCount > 0 &&
          releasedFailClosedDisqualifyingRetainedCount === 0 &&
          releasedFailClosedSkipCount === releasedFailClosedEligibleCount
        ) {
          suppressFreshDiscovery = true;
        }

        if (!pollInput) {
          return;
        }

        const autopilotDispatch = await maybeRunProviderOperatorAutopilotCycle({
          pollInput,
          sourceSetup: resolveMergeCloseoutSourceSetup()
        });

        assertRefreshCycleNotStuck();
        const freshDiscoveryBlockedProviderKeys = buildFreshDiscoveryBlockedProviderKeys(
          options.state.claims
        );
        let dispatchSkippedConsumedTrackedIssueKeys = autopilotDispatch.allowConsumedRedispatch
          ? buildFreshDiscoveryConsumedProviderKeys(consumedTrackedIssueKeys, options.state.claims)
          : consumedTrackedIssueKeys;
        const dispatchFreshDiscoveryCandidates = async (
          trackedIssues: LiveLinearTrackedIssue[],
          priorityIssueIds: readonly string[] = []
        ): Promise<void> => {
          refreshCounts.fresh_discovery_candidates += trackedIssues.length;
          recordRefreshProgress('refresh:fresh_dispatch', {
            requestClass: 'fresh_dispatch'
          });
          for (const trackedIssue of sortProviderDispatchTrackedIssuesWithPriority(
            trackedIssues,
            priorityIssueIds
          )) {
            assertRefreshCycleNotStuck();
            const providerKey = buildProviderIssueKey(trackedIssue.provider, trackedIssue.id);
            if (
              freshDiscoveryBlockedProviderKeys.has(providerKey) ||
              releasedFreshDiscoveryReplayBlockedProviderKeys.has(providerKey) ||
              deferredClaimFreshDiscoveryBlockedProviderKeys.has(providerKey) ||
              dispatchSkippedConsumedTrackedIssueKeys.has(providerKey)
            ) {
              continue;
            }
            if (!pollDispatchBudget.canDispatch(trackedIssue)) {
              const attachableActiveRuns = filterProviderIssueRunsForStartPipeline(
                runsByProviderIssue.get(providerKey) ?? [],
                startPipelineId
              ).filter((run) => run.status === 'in_progress');
              if (attachableActiveRuns.length === 0) {
                continue;
              }
            }
            recordRefreshProgress('refresh:fresh_dispatch', {
              requestClass: `fresh_dispatch:${trackedIssue.state ?? 'unknown'}`,
              providerKeys: [providerKey]
            });
            consumedTrackedIssueKeys.add(providerKey);
            try {
              const handoffResult = await processTrackedIssueCandidate({
                trackedIssue,
                deliveryId: null,
                event: 'poll_tick',
                action: 'reconcile',
                webhookTimestamp: null
              });
              if (shouldCountProviderAdmissionResultForPollBudget(handoffResult)) {
                refreshCounts.fresh_discovery_started += 1;
                noteOccupiedPollDispatchSlot(
                  resolveClaimPollDispatchSlotKey(providerKey, handoffResult.claim),
                  providerKey,
                  trackedIssue
                );
                recordRefreshProgress('refresh:fresh_dispatch', {
                  requestClass: `fresh_dispatch:${trackedIssue.state ?? 'unknown'}`,
                  providerKeys: [providerKey]
                });
              }
            } catch (error) {
              if (isRefreshLifecycleStuckError(error)) {
                throw error;
              }
              logger.warn(
                `Provider issue poll dispatch failed for ${providerKey}: ${
                  (error as Error)?.message ?? String(error)
                }`
              );
              continue;
            }
          }
        };
        const reconcileDeferredRetainedReleasedBlockerRefreshes = async (
          trackedIssues: LiveLinearTrackedIssue[]
        ): Promise<void> => {
          if (
            deferredRetainedReleasedBlockerRefreshProviderKeys.size === 0 ||
            trackedIssues.length === 0 ||
            !resolveTrackedIssueWhenNotStuck
          ) {
            return;
          }
          const refetchedBlockersByKey = buildTrackedIssuePollBlockerMap(trackedIssues);
          if (trackedIssueBlockersByKey) {
            for (const [refetchedProviderKey, blocker] of refetchedBlockersByKey.entries()) {
              if (trackedIssueBlockersByKey.has(refetchedProviderKey)) {
                continue;
              }
              trackedIssueBlockersByKey.set(refetchedProviderKey, blocker);
            }
          } else {
            trackedIssueBlockersByKey = refetchedBlockersByKey;
          }
          for (const providerKey of Array.from(
            deferredRetainedReleasedBlockerRefreshProviderKeys
          )) {
            try {
              const blocker = trackedIssueBlockersByKey?.get(providerKey) ?? null;
              if (!blocker) {
                continue;
              }
              const claim = readProviderIntakeClaim(options.state, providerKey);
              if (
                !claim ||
                !shouldUseTrackedIssueBlockerSnapshotForRetainedReleasedNotActiveMetadataRefresh({
                  claim,
                  blocker
                })
              ) {
                continue;
              }
              const claimRuns = runsByProviderIssue.get(providerKey) ?? [];
              const attachableClaimRuns = filterProviderIssueRunsForStartPipeline(
                claimRuns,
                startPipelineId
              );
              const activeRun =
                attachableClaimRuns.find((run) => run.status === 'in_progress') ?? null;
              const releaseRun = resolveProviderReleaseRun(claim, attachableClaimRuns);
              refreshCounts.issue_by_id_reads += 1;
              if (boundPreDiscoveryIssueByIdReads && activeRun === null) {
                preDiscoveryNonActiveIssueByIdReads += 1;
              }
              recordRefreshProgress('refresh:claim_issue_by_id_reconcile', {
                requestClass: `claim_issue_by_id:${claim.state ?? 'unknown'}`,
                providerKeys: [providerKey]
              });
              const directResolution = await resolveTrackedIssueWhenNotStuck({
                provider: claim.provider,
                issueId: claim.issue_id
              });
              assertRefreshCycleNotStuck();
              if (directResolution.kind === 'ready') {
                const eligibility = assessProviderTrackedIssueEligibility(
                  directResolution.trackedIssue,
                  {
                    hasExistingClaim: true
                  }
                );
                if (
                  canRefreshRetainedReleasedNotActiveClaimMetadataOnly({
                    claim,
                    trackedIssue: directResolution.trackedIssue
                  }) &&
                  (eligibility.eligible ||
                    eligibility.releaseReason === 'provider_issue_released:not_active')
                ) {
                  const refreshedClaim = await refreshRetainedReleasedNotActiveClaimMetadata({
                    claim,
                    releaseRun,
                    trackedIssue: directResolution.trackedIssue
                  });
                  claimByProviderKey.set(refreshedClaim.provider_key, refreshedClaim);
                  claimStateByProviderKey.set(
                    refreshedClaim.provider_key,
                    resolveProviderClaimIssueStateForAdmission(refreshedClaim)
                  );
                  const releaseRunForCancel = releaseRun ?? activeRun;
                  if (
                    shouldAttemptReleaseCancel(releaseRunForCancel) &&
                    !isInactiveReleasedReclaimRun(claim, releaseRunForCancel)
                  ) {
                    void retryReleaseCancel({
                      releaseRun: releaseRunForCancel,
                      reason: claim.reason ?? 'provider_issue_released',
                      assertCurrent: assertRefreshLifecycleCurrent
                    });
                  }
                  if (!activeRun) {
                    releaseOccupiedPollDispatchSlot(
                      resolveClaimPollDispatchSlotKey(providerKey, refreshedClaim)
                    );
                  }
                  continue;
                }
                if (eligibility.eligible) {
                  continue;
                }
                await releaseClaim({
                  claim,
                  nextReason: eligibility.releaseReason,
                  releaseRun,
                  trackedIssue: directResolution.trackedIssue,
                  cleanupWorkspace: eligibility.cleanupWorkspace
                });
                if (!activeRun) {
                  releaseOccupiedPollDispatchSlot(
                    resolveClaimPollDispatchSlotKey(providerKey, claim, activeRun)
                  );
                }
                continue;
              }
              if (directResolution.kind === 'release') {
                await releaseClaim({
                  claim,
                  nextReason: `provider_issue_released:${directResolution.reason}`,
                  releaseRun
                });
                if (!activeRun) {
                  releaseOccupiedPollDispatchSlot(
                    resolveClaimPollDispatchSlotKey(providerKey, claim, activeRun)
                  );
                }
              }
            } catch (error) {
              if (isRefreshLifecycleStuckError(error)) {
                throw error;
              }
              logger.warn(
                `Provider issue deferred retained metadata refresh failed for ${providerKey}: ${
                  (error as Error)?.message ?? String(error)
                }`
              );
              continue;
            }
          }
        };

        await dispatchFreshDiscoveryCandidates(
          autopilotDispatch.trackedIssues,
          autopilotDispatch.priorityIssueIds
        );

        if (
          (pollInput.deferFreshDiscovery === true || pollInput.allowPollFailClosed === true) &&
          trackedIssueRefetch &&
          !suppressFreshDiscovery &&
          pollDispatchBudget.remainingGlobalSlots() > 0
        ) {
          dispatchSkippedConsumedTrackedIssueKeys = buildFreshDiscoveryConsumedProviderKeys(
            consumedTrackedIssueKeys,
            options.state.claims
          );
          refreshCounts.fresh_discovery_runs += 1;
          recordRefreshProgress('refresh:fresh_discovery', {
            requestClass: 'fresh_discovery_query'
          });
          const freshDiscoveryResolution = await trackedIssueRefetch({
            mode: 'fresh_discovery',
            eligibleTargetCount: pollDispatchBudget.remainingGlobalSlots(),
            eligibleStateSlotCounts: pollDispatchBudget.remainingStateSlots(),
            excludedIssueIds: Array.from(
              new Set([
                ...freshDiscoveryBlockedProviderKeys,
                ...releasedFreshDiscoveryReplayBlockedProviderKeys,
                ...deferredClaimFreshDiscoveryBlockedProviderKeys,
                ...occupiedPollDispatchProviderKeys,
                ...dispatchSkippedConsumedTrackedIssueKeys
              ])
            ).map((providerKey) => providerKey.slice(providerKey.indexOf(':') + 1))
          });
          if (freshDiscoveryResolution.kind === 'ready') {
            await reconcileDeferredRetainedReleasedBlockerRefreshes(
              freshDiscoveryResolution.trackedIssues
            );
            await dispatchFreshDiscoveryCandidates(freshDiscoveryResolution.trackedIssues);
          }
        }
      });
    });
  };

  const maybeRunProviderOperatorAutopilotCycle = async (input: {
    pollInput: ProviderIssueHandoffPollInput;
    sourceSetup: DispatchPilotSourceSetup | null;
  }): Promise<{
    trackedIssues: LiveLinearTrackedIssue[];
    allowConsumedRedispatch: boolean;
    priorityIssueIds: string[];
  }> => {
    const fallbackTrackedIssues = input.pollInput.trackedIssues;
    const trackedIssueRefetch = wrapTrackedIssueRefetch(input.pollInput.refetchTrackedIssues);
    if (!options.providerWorkflowConfigStore || !runOperatorAutopilot) {
      return {
        trackedIssues: fallbackTrackedIssues,
        allowConsumedRedispatch: false,
        priorityIssueIds: []
      };
    }
    let providerWorkflow: Awaited<ReturnType<ProviderWorkflowConfigStore['refresh']>>;
    try {
      providerWorkflow = await options.providerWorkflowConfigStore.refresh();
      assertRefreshLifecycleCurrent();
    } catch (error) {
      rethrowRefreshLifecycleStuckError(error);
      assertRefreshLifecycleCurrent();
      logger.warn(
        `[provider-operator-autopilot] Failed to refresh provider workflow config: ${
          (error as Error)?.message ?? String(error)
        }`
      );
      return {
        trackedIssues: fallbackTrackedIssues,
        allowConsumedRedispatch: false,
        priorityIssueIds: []
      };
    }
    const autopilotConfig = resolveProviderOperatorAutopilotConfigFromPayload(providerWorkflow);
    if (!autopilotConfig) {
      return {
        trackedIssues: fallbackTrackedIssues,
        allowConsumedRedispatch: false,
        priorityIssueIds: []
      };
    }
    const autopilotAuditPath = resolveProviderOperatorAutopilotAuditPathFromPayload(providerWorkflow);
    const autopilotLifecyclePath = resolveProviderOperatorAutopilotLifecyclePathFromPayload(
      providerWorkflow
    );
    const autopilotExecutionPath = resolveProviderOperatorAutopilotExecutionPathFromPayload(
      providerWorkflow
    );
    const previousResult = resolveProviderOperatorAutopilotPreviousResultFromPayload(
      providerWorkflow
    );
    const lifecycleRecordsForCycle = await readProviderOperatorAutopilotLifecycleRecordsForCycle(
      autopilotLifecyclePath
    );
    assertRefreshLifecycleCurrent();
    const lifecycleRecords =
      lifecycleRecordsForCycle ??
      (Array.isArray(previousResult?.lifecycle_records)
        ? previousResult.lifecycle_records.map((record) => ({ ...record }))
        : []);
    const executionRecordsForCycle =
      await readProviderOperatorAutopilotExecutionRecordsForCycle(autopilotExecutionPath);
    const localRolloutExecutionAttempts = resolveLocalRolloutExecutionAttemptsForCycle(
      executionRecordsForCycle,
      previousResult?.local_rollout_execution_attempts
    );
    const localRolloutPersistenceUnavailable =
      !autopilotLifecyclePath ||
      !autopilotExecutionPath ||
      lifecycleRecordsForCycle === undefined ||
      executionRecordsForCycle === undefined;
    const effectiveAutopilotConfig =
      localRolloutPersistenceUnavailable
        ? disableProviderOperatorAutopilotLocalRolloutExecution(autopilotConfig)
        : autopilotConfig;
    let nextResult: ProviderOperatorAutopilotResult;
    let loggedAutopilotFailure = false;
    try {
      nextResult = await runOperatorAutopilot(
        {
          tracked_issues: input.pollInput.trackedIssues,
          claims: options.state.claims,
          config: effectiveAutopilotConfig,
          source_setup: input.sourceSetup,
          env: process.env,
          previous_result: previousResult,
          lifecycle_records: lifecycleRecords,
          local_rollout_execution_attempts: localRolloutExecutionAttempts,
          repo_root: resolve(options.paths.repoRoot)
        },
        {
          append_local_rollout_execution_attempt:
            !localRolloutPersistenceUnavailable && autopilotExecutionPath
              ? (record) =>
                  appendProviderOperatorAutopilotLocalRolloutExecutionRecord(
                    autopilotExecutionPath,
                    record
                  ).then(() => undefined)
              : undefined,
          append_local_rollout_lifecycle_record:
            !localRolloutPersistenceUnavailable && autopilotLifecyclePath
              ? (record) =>
                  appendProviderOperatorAutopilotLifecycleRecord(
                    autopilotLifecyclePath,
                    record
                  ).then(() => undefined)
              : undefined
        }
      );
      assertRefreshLifecycleCurrent();
    } catch (error) {
      rethrowRefreshLifecycleStuckError(error);
      assertRefreshLifecycleCurrent();
      const message = (error as Error)?.message ?? String(error);
      const fallbackPendingActions =
        autopilotConfig.post_merge_rollout.enabled &&
        Array.isArray(previousResult?.pending_actions)
          ? previousResult.pending_actions.map((pendingAction) => ({ ...pendingAction }))
          : [];
      const fallbackResolvedActions =
        autopilotConfig.post_merge_rollout.enabled &&
        Array.isArray(previousResult?.resolved_actions)
          ? previousResult.resolved_actions.map((resolvedAction) => ({ ...resolvedAction }))
          : [];
      const effectiveFallbackLocalRolloutActions = resolveEffectiveLocalRolloutActions({
        pendingActions: fallbackPendingActions,
        postMergeRolloutEnabled: autopilotConfig.post_merge_rollout.enabled,
        lifecycleRecords
      });
      const fallbackResolvedActionIds = new Set(
        effectiveFallbackLocalRolloutActions.resolved_actions.map(
          (action) => action.action_instance_id
        )
      );
      nextResult = {
        recorded_at: isoTimestamp(),
        status: 'failed',
        summary: 'Operator autopilot evaluation failed.',
        error: message,
        actions: [],
        holds: [],
        pending_actions: effectiveFallbackLocalRolloutActions.pending_actions,
        terminal_blocker_advisories: [],
        resolved_actions: [
          ...fallbackResolvedActions.filter(
            (resolvedAction) => !fallbackResolvedActionIds.has(resolvedAction.action_instance_id)
          ),
          ...effectiveFallbackLocalRolloutActions.resolved_actions
        ],
        lifecycle_records:
          autopilotConfig.post_merge_rollout.enabled
            ? lifecycleRecords.map((record) => ({ ...record }))
            : [],
        local_rollout_execution_attempts: autopilotConfig.post_merge_rollout.enabled
          ? localRolloutExecutionAttempts.map((record) => ({ ...record }))
          : []
      };
      loggedAutopilotFailure = true;
      logger.warn(`[provider-operator-autopilot] ${nextResult.summary} error=${message}`);
    }
    const resultChanged = !areProviderOperatorAutopilotResultsMeaningfullyEqual(
      previousResult,
      nextResult
    );
    if (autopilotAuditPath && resultChanged) {
      assertRefreshLifecycleCurrent();
      try {
        await appendOperatorAutopilotAuditResult(
          autopilotAuditPath,
          nextResult
        );
        assertRefreshLifecycleCurrent();
      } catch (error) {
        rethrowRefreshLifecycleStuckError(error);
        assertRefreshLifecycleCurrent();
        logger.warn(
          `[provider-operator-autopilot] Failed to append audit result path=${
            autopilotAuditPath
          }: ${(error as Error)?.message ?? String(error)}`
        );
      }
    }
    if (resultChanged) {
      assertRefreshLifecycleCurrent();
      options.providerWorkflowConfigStore.recordOperatorAutopilotResult(nextResult);
    }
    if (resultChanged && nextResult.status === 'failed' && !loggedAutopilotFailure) {
      logger.warn(
        `[provider-operator-autopilot] ${nextResult.summary} error=${nextResult.error ?? 'unknown'}`
      );
    }
    if (
      !nextResult.actions.some(
        (action) =>
          action.transition.status === 'transitioned' || action.transition.status === 'noop'
      ) ||
      !trackedIssueRefetch
    ) {
      return {
        trackedIssues: fallbackTrackedIssues,
        allowConsumedRedispatch: false,
        priorityIssueIds: []
      };
    }
    const priorityIssueIds = resolveProviderOperatorAutopilotTransitionIssueIds(nextResult);
    try {
      const resolution = await trackedIssueRefetch();
      if (resolution.kind === 'ready') {
        return {
          trackedIssues: resolution.trackedIssues,
          allowConsumedRedispatch: true,
          priorityIssueIds
        };
      }
      logger.warn(
        '[provider-operator-autopilot] Tracked-issue refetch skipped after autopilot action; dispatch continues with the pre-transition poll snapshot.'
      );
    } catch (error) {
      rethrowRefreshLifecycleStuckError(error);
      logger.warn(
        `[provider-operator-autopilot] Failed to refetch tracked issues after autopilot action: ${
          (error as Error)?.message ?? String(error)
        }`
      );
    }
    return {
      trackedIssues: fallbackTrackedIssues,
      allowConsumedRedispatch: false,
      priorityIssueIds: []
    };
  };

  providerIssueHandoffService = {
    async recoverIssue(input): Promise<ProviderIssueHandoffRecoveryResult> {
      const readRecoveryClaim = (): ProviderIntakeClaimRecord | null =>
        readProviderIntakeClaimByIssueRef(options.state, input.provider, input.issueId);
      const runRecoveryOperation = async (): Promise<ProviderIssueHandoffRecoveryResult> =>
        await runWithConfiguredWorkerHostsCache(async () =>
          await runWithProviderIssueRunDiscoveryCache(async () =>
            await runWithRefreshLifecycleLock(async () => {
              if (!resolveRecoveryTrackedIssueWhenNotStuck) {
                return buildProviderIssueRecoveryResult({
                  provider: input.provider,
                  issueId: input.issueId,
                  action: input.action,
                  kind: 'skipped',
                  reason: 'provider_issue_recover_resolution_unavailable',
                  claim: readRecoveryClaim()
                });
              }

              const resolution = await resolveRecoveryTrackedIssueWhenNotStuck({
                provider: input.provider,
                issueId: input.issueId
              });
              if (resolution.kind === 'release') {
                const existingClaim = readRecoveryClaim();
                if (existingClaim) {
                  const claimRuns = await discoverProviderIssueRunsForCurrentOperation({
                    provider: input.provider,
                    issueId: existingClaim.issue_id
                  });
                  const attachableClaimRuns = filterProviderIssueRunsForStartPipeline(
                    claimRuns,
                    startPipelineId
                  );
                  await releaseClaim({
                    claim: existingClaim,
                    nextReason: `provider_issue_released:${stripProviderIssueReleasedPrefix(resolution.reason)}`,
                    releaseRun: resolveProviderReleaseRun(existingClaim, attachableClaimRuns)
                  });
                }
                return buildProviderIssueRecoveryResult({
                  provider: input.provider,
                  issueId: existingClaim?.issue_id ?? input.issueId,
                  action: input.action,
                  kind: 'released',
                  reason: resolution.reason,
                  claim: readRecoveryClaim()
                });
              }
              if (resolution.kind === 'skip') {
                const existingClaim = readRecoveryClaim();
                return buildProviderIssueRecoveryResult({
                  provider: input.provider,
                  issueId: existingClaim?.issue_id ?? input.issueId,
                  action: input.action,
                  kind: 'skipped',
                  reason: resolution.reason,
                  details: resolution.details,
                  claim: existingClaim
                });
              }

              const result = await processTrackedIssueCandidate({
                trackedIssue: resolution.trackedIssue,
                deliveryId: null,
                event: 'control_host_provider_worker_recover',
                action: input.action,
                webhookTimestamp: null
              });
              return buildProviderIssueRecoveryResult({
                provider: input.provider,
                issueId: input.issueId,
                action: input.action,
                kind: result.kind,
                reason: result.reason,
                claim: result.claim
              });
            })
          )
        );
      const recoveryService = providerIssueHandoffService;
      if (!recoveryService || !isProviderPollingStuck(recoveryService)) {
        return await runRecoveryOperation();
      }

      const stuckPollingHealth = readProviderPollingHealth(recoveryService);
      resetStuckRefreshLifecycle();
      markProviderPollingStarted(recoveryService, { mode: 'refresh' });
      recordProviderPollingProgress(recoveryService, {
        phase: 'refresh:provider_worker_recover',
        requestClass: `recovery:${input.action}`,
        providerKeys: [buildProviderIssueKey(input.provider, input.issueId)]
      });
      try {
        const result = await runRecoveryOperation();
        if (result.kind === 'skipped') {
          markProviderPollingCompleted(recoveryService, {
            error: buildRefreshLifecycleStuckError(
              stuckPollingHealth?.last_error ??
                result.reason ??
                'provider_refresh_lifecycle_stuck'
            )
          });
          return result;
        }
        markProviderPollingCompleted(recoveryService);
        return result;
      } catch (error) {
        markProviderPollingCompleted(recoveryService, { error });
        throw error;
      }
    },

    async handleAcceptedTrackedIssue(input): Promise<ProviderIssueHandoffResult> {
      return await runWithConfiguredWorkerHostsCache(async () =>
        await runWithProviderIssueRunDiscoveryCache(async () =>
          await processTrackedIssueCandidate(input)
        )
      );
    },

    async rehydrate(): Promise<void> {
      await runWithConfiguredWorkerHostsCache(async () => {
        await runWithProviderIssueRunDiscoveryCache(async () => {
          await runWithRefreshLifecycleLock(async () => {
            const result = await rehydrateNow({ refreshTrackedIssueMetadata: true });
            if (result.hasPendingClaims) {
              scheduleBestEffortRehydrateWithRefreshLock();
            }
          });
        });
      });
    },

    async refresh(): Promise<void> {
      await runWithConfiguredWorkerHostsCache(async () => {
        await runWithProviderIssueRunDiscoveryCache(async () => {
          await runWithRefreshLifecycleLock(async () => {
            await runRefreshCycle(await resolveRefreshPollInput());
          });
        });
      });
    },

    async poll(input: ProviderIssueHandoffPollInput): Promise<void> {
      await runWithConfiguredWorkerHostsCache(async () => {
        await runRefreshCycle(input);
      });
    },

    resetStuckRefreshLifecycle(): void {
      resetStuckRefreshLifecycle();
    }
  };

  return providerIssueHandoffService;
}

function isTrackedIssueStale(input: {
  existingIssueUpdatedAt: string | null;
  nextIssueUpdatedAt: string | null;
}): boolean {
  return compareTrackedIssueUpdatedAt(input) === 'older';
}

function hasFailedProviderStartReason(reason: string | null | undefined): boolean {
  return Boolean(
    reason &&
      (
        reason.startsWith('provider_issue_start_failed:') ||
        reason.startsWith(`${PROVIDER_RETRY_START_FAILED_REASON}:`) ||
        reason.startsWith('provider_issue_refresh_start_failed:') ||
        reason.startsWith(`${PROVIDER_POST_WORKER_EXIT_START_FAILED_REASON}:`)
      )
  );
}

function deriveProviderCapacityBlockedReason(launchReason: string): string {
  if (launchReason.endsWith('_launched')) {
    return `${launchReason.slice(0, -'_launched'.length)}_blocked:max_concurrency`;
  }
  return `${launchReason}:blocked:max_concurrency`;
}

function isTrackedIssueNonIncreasing(input: {
  existingIssueUpdatedAt: string | null;
  nextIssueUpdatedAt: string | null;
}): boolean {
  const comparison = compareTrackedIssueUpdatedAt(input);
  return comparison === 'older' || comparison === 'equal';
}

function resolveExplicitCompletedDuplicateRecoveryFreshness(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason'
  > | null;
  event: string | null;
  action: string | null;
  trackedIssue: Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'updated_at'>;
  latestCompletedRunIssueUpdatedAt: string | null;
}): ReturnType<typeof compareTrackedIssueUpdatedAt> | null {
  if (
    input.event !== 'control_host_provider_worker_recover' ||
    !isProviderIssueRecoveryAction(input.action)
  ) {
    return null;
  }
  if (
    input.claim?.state !== 'completed' ||
    input.claim.reason !== 'provider_issue_run_already_completed'
  ) {
    return null;
  }
  if (!classifyProviderLinearWorkflowState(input.trackedIssue).isActive) {
    return null;
  }
  // Use explicit completed-run issue freshness, not completed-claim freshness. A healthy
  // poll can already have copied the reopened issue timestamp into the completed duplicate
  // claim, while legacy run started_at is not enough proof for this recovery bypass.
  return compareTrackedIssueUpdatedAt({
    existingIssueUpdatedAt: input.latestCompletedRunIssueUpdatedAt,
    nextIssueUpdatedAt: input.trackedIssue.updated_at
  });
}

function isExplicitProviderWorkerRecovery(input: {
  event: string | null;
  action: string | null;
}): boolean {
  return input.event === 'control_host_provider_worker_recover' &&
    isProviderIssueRecoveryAction(input.action);
}

function isProviderIssueRecoveryAction(value: string | null): value is ProviderIssueRecoveryAction {
  return value === 'recover' || value === 'relaunch' || value === 'nudge';
}

function isProviderStaleManifestlessHandoffClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'run_id' | 'run_manifest_path' | 'launch_started_at' | 'updated_at'
  >
): boolean {
  const manifestlessCandidateState =
    claim.state === 'starting' ||
    claim.state === 'resuming' ||
    (
      claim.state === 'accepted' &&
      claim.reason === 'provider_issue_rehydration_pending_revalidation'
    );
  if (
    !manifestlessCandidateState ||
    normalizeOptionalString(claim.run_id) !== null ||
    normalizeOptionalString(claim.run_manifest_path) !== null
  ) {
    return false;
  }
  const startedAtMs = Date.parse(
    normalizeOptionalString(claim.launch_started_at) ??
      normalizeOptionalString(claim.updated_at) ??
      ''
  );
  return Number.isFinite(startedAtMs) &&
    Date.now() - startedAtMs >= PROVIDER_MANIFESTLESS_HANDOFF_RECOVERY_STALE_MS;
}

function selectMostRecentTrackedIssueUpdatedAt(
  primaryIssueUpdatedAt: string | null,
  secondaryIssueUpdatedAt: string | null
): string | null {
  const comparison = compareTrackedIssueUpdatedAt({
    existingIssueUpdatedAt: primaryIssueUpdatedAt,
    nextIssueUpdatedAt: secondaryIssueUpdatedAt
  });
  if (comparison === 'older' || comparison === 'equal') {
    return primaryIssueUpdatedAt;
  }
  if (comparison === 'newer') {
    return secondaryIssueUpdatedAt;
  }
  return primaryIssueUpdatedAt ?? secondaryIssueUpdatedAt ?? null;
}

function isProviderIssueReleasedPendingReopen(reason: string | null): boolean {
  return typeof reason === 'string' && reason.startsWith(PROVIDER_RELEASED_PENDING_REOPEN_PREFIX);
}

function isProviderIssueReleasedLiveWorkerRehydrateCandidate(
  claim: Pick<ProviderIntakeClaimRecord, 'reason'>
): boolean {
  if (isProviderIssueReleasedPendingReopen(claim.reason ?? null)) {
    return true;
  }
  return claim.reason === 'provider_issue_released:not_active';
}

function shouldDeferReleasedLiveWorkerCancelForFreshTruth(
  claim: Pick<ProviderIntakeClaimRecord, 'reason' | 'issue_state' | 'issue_state_type'>,
  options: {
    freshDiscoveryDeferred: boolean;
    canFreshDiscoverReleasedLiveWorker: boolean;
  }
): boolean {
  if (isProviderIssueReleasedPendingReopen(claim.reason ?? null)) {
    return isProviderStartedWorkerClaim(claim);
  }
  if (claim.reason !== 'provider_issue_released:not_active') {
    return false;
  }
  if (isProviderStartedWorkerClaim(claim)) {
    return true;
  }
  return options.freshDiscoveryDeferred && options.canFreshDiscoverReleasedLiveWorker;
}

function markProviderIssueReleasedPendingReopen(reason: string | null): string {
  if (isProviderIssueReleasedPendingReopen(reason)) {
    return reason as string;
  }
  return `${PROVIDER_RELEASED_PENDING_REOPEN_PREFIX}${reason ?? 'provider_issue_released'}`;
}

function shouldReopenReleasedClaimAtCurrentTimestamp(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'merge_closeout'
  >;
  trackedIssue: Pick<
    LiveLinearTrackedIssue,
    'state' | 'state_type' | 'archived_at' | 'trashed' | 'viewer_id' | 'assignee_id' | 'blocked_by'
  >;
}): boolean {
  if (isProviderIssueReleasedPendingReopen(input.claim.reason ?? null)) {
    return true;
  }
  if (
    canRecheckPlainReleasedNotActiveClaim(input.claim) ||
    canProbeFreshDiscoveryForReleasedNotActiveTerminalMergeCloseoutClaim(input.claim)
  ) {
    return isProviderLinearTrackedIssueEligibleForExecution(input.trackedIssue);
  }
  if (input.claim.reason === 'provider_issue_released:not_mutable') {
    return isProviderLinearTrackedIssueMutable(input.trackedIssue);
  }
  if (input.claim.reason !== 'provider_issue_released:assignee_changed') {
    return false;
  }
  return isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(input.trackedIssue);
}

function shouldReopenReleasedClaimOnRefresh(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'state'
    | 'reason'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_updated_at'
    | 'issue_blocked_by'
    | 'merge_closeout'
  >;
  releaseRun: ProviderIssueRunRecord | null;
  trackedIssue: Pick<
    LiveLinearTrackedIssue,
    'updated_at' | 'state' | 'state_type' | 'archived_at' | 'trashed' | 'viewer_id' | 'assignee_id' | 'blocked_by'
  >;
}): boolean {
  const latestReleasedIssueUpdatedAt = selectMostRecentTrackedIssueUpdatedAt(
    input.claim.issue_updated_at ?? null,
    resolveReleasedRunIssueUpdatedAtForReclaim(input.claim, input.releaseRun)
  );
  const updatedAtComparison = compareTrackedIssueUpdatedAt({
    existingIssueUpdatedAt: latestReleasedIssueUpdatedAt,
    nextIssueUpdatedAt: input.trackedIssue.updated_at
  });
  if (updatedAtComparison === 'older') {
    return false;
  }
  if (isProviderIssueReleasedPendingReopen(input.claim.reason ?? null)) {
    return true;
  }
  return (
    updatedAtComparison === 'newer' ||
    (
      updatedAtComparison === 'equal' &&
      shouldReopenReleasedClaimAtCurrentTimestamp({
        claim: input.claim,
        trackedIssue: input.trackedIssue
      })
    )
  );
}

function resolveReleasedRunIssueUpdatedAtForReclaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'issue_blocked_by'
  >,
  run: ProviderIssueRunRecord | null
): string | null {
  if (!run) {
    return null;
  }
  if (run.issueUpdatedAt) {
    return run.issueUpdatedAt;
  }
  if (
    isPlainReleasedBlockedByCompletedOnlyClaim(claim) &&
    !shouldAttemptReleaseCancel(run)
  ) {
    return null;
  }
  return run.startedAt;
}

function isPlainReleasedBlockedByCompletedOnlyClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'issue_blocked_by'
  >
): boolean {
  if (!canRecheckPlainReleasedNotActiveClaim(claim)) {
    return false;
  }
  const workflowState = classifyProviderLinearWorkflowState({
    state: claim.issue_state,
    state_type: claim.issue_state_type
  });
  return (
    workflowState.normalizedState === 'blocked' &&
    Array.isArray(claim.issue_blocked_by) &&
    claim.issue_blocked_by.length > 0 &&
    !providerLinearTodoBlockedByNonTerminal(claim.issue_blocked_by)
  );
}

function shouldRefreshTerminalBlockerStaleReleasedMetadata(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'issue_blocked_by'
  >;
  trackedIssue: Pick<
    LiveLinearTrackedIssue,
    'state' | 'state_type' | 'archived_at' | 'trashed' | 'viewer_id' | 'assignee_id' | 'blocked_by'
  >;
  releasedWebhookTiming: 'older' | 'equal' | 'newer' | 'unknown';
}): boolean {
  if (input.releasedWebhookTiming === 'older') {
    return false;
  }
  return (
    isPlainReleasedBlockedByCompletedOnlyClaim(input.claim) &&
    isProviderLinearTrackedIssueEligibleForExecution(input.trackedIssue)
  );
}

function filterNonTerminalProviderIssueBlockers(
  blockers: LiveLinearTrackedIssue['blocked_by'] | null | undefined
): LiveLinearTrackedBlocker[] {
  return (blockers ?? []).filter((blocker) =>
    providerLinearTodoBlockedByNonTerminal([blocker])
  );
}

function mergeReleasedTrackedIssueMutability(
  existing: Pick<ProviderIntakeClaimRecord, 'issue_archived_at' | 'issue_trashed'>,
  next: Pick<ProviderIntakeClaimRecord, 'issue_archived_at' | 'issue_trashed'>
): Pick<ProviderIntakeClaimRecord, 'issue_archived_at' | 'issue_trashed'> {
  const {
    issue_archived_at: existingArchivedAt,
    issue_trashed: existingTrashed
  } = resolveProviderClaimMutabilityTruth(existing);
  const {
    issue_archived_at: nextArchivedAt,
    issue_trashed: nextTrashed
  } = resolveProviderClaimMutabilityTruth(next);
  return {
    issue_archived_at: existingArchivedAt ?? nextArchivedAt,
    issue_trashed:
      existingTrashed === true || nextTrashed === true
        ? true
        : existingTrashed === false || nextTrashed === false
          ? false
          : null
  };
}

function resolveProviderClaimMutabilityTruth(
  claim: Pick<ProviderIntakeClaimRecord, 'issue_archived_at' | 'issue_trashed'>
): Pick<ProviderIntakeClaimRecord, 'issue_archived_at' | 'issue_trashed'> {
  return {
    issue_archived_at:
      typeof claim.issue_archived_at === 'string' ? claim.issue_archived_at : null,
    issue_trashed:
      claim.issue_trashed === true ? true : (claim.issue_trashed === false ? false : null)
  };
}

function didRunFinishAfterClaimLaunch(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'updated_at' | 'launch_started_at'>,
  run: Pick<ProviderIssueRunRecord, 'startedAt' | 'updatedAt'>
): boolean {
  const claimLaunchAt = resolveProviderClaimLaunchAt(claim);
  const claimUpdatedAt = Date.parse(claimLaunchAt ?? '');
  if (!Number.isFinite(claimUpdatedAt)) {
    return false;
  }
  const runStartedAt = Date.parse(run.startedAt ?? '');
  if (Number.isFinite(runStartedAt)) {
    // Prefer the child start timestamp when present so an older run that only
    // completed later cannot be rebound onto a newer launch attempt.
    return runStartedAt >= claimUpdatedAt;
  }
  const runUpdatedAt = Date.parse(run.updatedAt ?? '');
  if (!Number.isFinite(runUpdatedAt)) {
    return false;
  }
  return runUpdatedAt > claimUpdatedAt;
}

function didRunMatchClaimAttempt(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'updated_at' | 'launch_started_at' | 'issue_updated_at' | 'run_id' | 'run_manifest_path'
  >,
  run: Pick<ProviderIssueRunRecord, 'runId' | 'manifestPath' | 'startedAt' | 'updatedAt' | 'issueUpdatedAt'>
): boolean {
  if (
    (claim.run_manifest_path && claim.run_manifest_path === run.manifestPath) ||
    (claim.run_id && claim.run_id === run.runId)
  ) {
    return true;
  }
  if (resolveProviderClaimLaunchAt(claim)) {
    return didRunFinishAfterClaimLaunch(claim, run);
  }
  if (claim.state !== 'handoff_failed' && claim.state !== 'released') {
    return false;
  }
  const claimIssueUpdatedAt = Date.parse(claim.issue_updated_at ?? '');
  if (!Number.isFinite(claimIssueUpdatedAt)) {
    return false;
  }
  const runIssueUpdatedAt = Date.parse(run.issueUpdatedAt ?? '');
  if (Number.isFinite(runIssueUpdatedAt)) {
    return runIssueUpdatedAt >= claimIssueUpdatedAt;
  }
  if (claim.state === 'handoff_failed') {
    const runStartedAt = Date.parse(run.startedAt ?? '');
    if (Number.isFinite(runStartedAt)) {
      return runStartedAt >= claimIssueUpdatedAt;
    }
  }
  const runUpdatedAt = Date.parse(run.updatedAt ?? '');
  return Number.isFinite(runUpdatedAt) && runUpdatedAt >= claimIssueUpdatedAt;
}

function resolveProviderClaimLaunchAt(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'updated_at' | 'launch_started_at'>
): string | null {
  if (typeof claim.launch_started_at === 'string' && claim.launch_started_at.trim().length > 0) {
    return claim.launch_started_at;
  }
  return claim.state === 'starting' || claim.state === 'resuming' ? claim.updated_at : null;
}

function compareTrackedIssueUpdatedAt(input: {
  existingIssueUpdatedAt: string | null;
  nextIssueUpdatedAt: string | null;
}): 'older' | 'equal' | 'newer' | 'unknown' {
  if (!input.existingIssueUpdatedAt || !input.nextIssueUpdatedAt) {
    return 'unknown';
  }
  const existingTime = Date.parse(input.existingIssueUpdatedAt);
  const nextTime = Date.parse(input.nextIssueUpdatedAt);
  if (!Number.isFinite(existingTime) || !Number.isFinite(nextTime)) {
    return 'unknown';
  }
  if (nextTime < existingTime) {
    return 'older';
  }
  if (nextTime === existingTime) {
    return 'equal';
  }
  return 'newer';
}

function isTrackedIssueFreshEnoughForMergeCloseout(
  mergeCloseout: Pick<ProviderMergeCloseoutRecord, 'issue_updated_at'>,
  trackedIssue: Pick<LiveLinearTrackedIssue, 'updated_at'>
): boolean {
  const freshness = compareTrackedIssueUpdatedAt({
    existingIssueUpdatedAt: mergeCloseout.issue_updated_at ?? null,
    nextIssueUpdatedAt: trackedIssue.updated_at
  });
  if (freshness === 'newer') {
    return false;
  }
  if (freshness === 'unknown' && mergeCloseout.issue_updated_at) {
    return false;
  }
  return true;
}

function shouldClearStaleMergeCloseoutForTrackedIssue(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'merge_closeout'>;
  trackedIssue: Pick<LiveLinearTrackedIssue, 'state' | 'updated_at'>;
}): boolean {
  const mergeCloseout = input.claim.merge_closeout ?? null;
  if (!mergeCloseout || mergeCloseout.status === 'watching') {
    return false;
  }
  if (normalizeProviderLinearWorkflowState(input.trackedIssue.state) === 'merging') {
    return false;
  }
  if (normalizeProviderLinearWorkflowState(mergeCloseout.issue_state) !== 'merging') {
    return false;
  }
  return (
    compareTrackedIssueUpdatedAt({
      existingIssueUpdatedAt: mergeCloseout.issue_updated_at ?? null,
      nextIssueUpdatedAt: input.trackedIssue.updated_at
    }) === 'newer'
  );
}

function isProviderLinearDoneWorkflowState(input: {
  state: string | null | undefined;
  state_type: string | null | undefined;
}): boolean {
  const normalizedState = normalizeProviderLinearWorkflowState(input.state);
  return normalizedState === 'done';
}

function shouldForceTrackedIssueMetadataRefreshForCompletedTransitionFailedClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'merge_closeout'
  >
): boolean {
  if (
    claim.state !== 'handoff_failed' ||
    claim.reason !== 'provider_issue_merge_closeout_transition_failed'
  ) {
    return false;
  }
  const mergeCloseout = claim.merge_closeout ?? null;
  if (
    !mergeCloseout ||
    mergeCloseout.status !== 'transition_failed' ||
    normalizeOptionalString(mergeCloseout.reason) !== 'linear_done_transition_failed'
  ) {
    return false;
  }
  if (normalizeProviderLinearWorkflowState(claim.issue_state) !== 'merging') {
    return false;
  }
  if (normalizeProviderLinearWorkflowState(mergeCloseout.issue_state) !== 'merging') {
    return false;
  }
  if (!mergeCloseoutSnapshotShowsMerged(mergeCloseout)) {
    return false;
  }
  return normalizeOptionalString(mergeCloseout.shared_root?.status) === 'reconciled';
}

function shouldForceTrackedIssueMetadataRefreshForCompletedClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'merge_closeout'
  >
): boolean {
  if (shouldForceTrackedIssueMetadataRefreshForCompletedTransitionFailedClaim(claim)) {
    return true;
  }
  if (
    claim.state !== 'handoff_failed' ||
    claim.reason !== 'provider_issue_merge_closeout_action_required'
  ) {
    return false;
  }
  const mergeCloseout = claim.merge_closeout ?? null;
  if (
    !mergeCloseout ||
    mergeCloseout.status !== 'action_required' ||
    normalizeOptionalString(mergeCloseout.reason) !== 'pending_shared_root_reconciliation'
  ) {
    return false;
  }
  if (normalizeProviderLinearWorkflowState(claim.issue_state) !== 'merging') {
    return false;
  }
  return mergeCloseoutSnapshotShowsMerged(mergeCloseout);
}

function shouldApplySupersededTerminalMergeCloseoutReleaseClaim(input: {
  releaseReason: string | null;
  claim: Pick<
    ProviderIntakeClaimRecord,
    'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'merge_closeout'
  >;
}): boolean {
  if (
    input.releaseReason !== 'provider_issue_released:not_active' &&
    input.releaseReason !== 'provider_issue_released:not_mutable'
  ) {
    return false;
  }
  return isSupersededTerminalMergeCloseoutClaim({
    claim: input.claim
  });
}

function shouldApplySupersededTransitionFailedMergeCloseoutReleaseClaim(input: {
  releaseReason: string | null;
  claim: Pick<
    ProviderIntakeClaimRecord,
    'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'merge_closeout'
  >;
  nextIssueState: string | null;
  nextIssueStateType: string | null;
  nextIssueUpdatedAt: string | null;
}): boolean {
  if (
    input.releaseReason !== 'provider_issue_released:not_active' &&
    input.releaseReason !== 'provider_issue_released:not_mutable'
  ) {
    return false;
  }
  return isSupersededDoneTransitionFailedMergeCloseoutClaim({
    claim: input.claim,
    trackedIssue: {
      state: input.nextIssueState,
      state_type: input.nextIssueStateType,
      updated_at: input.nextIssueUpdatedAt
    }
  });
}

function isSupersededTerminalMergeCloseoutClaim(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'merge_closeout'
  >;
  trackedIssue?: Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'updated_at'> | null;
}): boolean {
  const mergeCloseout = input.claim.merge_closeout ?? null;
  if (!mergeCloseout) {
    return false;
  }
  if (!mergeCloseoutSnapshotShowsMerged(mergeCloseout)) {
    return false;
  }
  if (normalizeProviderLinearWorkflowState(mergeCloseout.issue_state) !== 'merging') {
    return false;
  }
  const isPendingSharedRootReconciliation =
    mergeCloseout.status === 'action_required' &&
    normalizeOptionalString(mergeCloseout.reason) === 'pending_shared_root_reconciliation' &&
    normalizeOptionalString(mergeCloseout.shared_root?.status) === 'skipped';
  const hasFailedDoneTransition =
    mergeCloseout.linear_transition?.status === 'failed' &&
    normalizeProviderLinearWorkflowState(mergeCloseout.linear_transition.target_state) === 'done';
  const isMergedTransitionDeferred =
    mergeCloseout.status === 'merged' &&
    normalizeOptionalString(mergeCloseout.shared_root?.status) === 'reconciled' &&
    (
      normalizeOptionalString(mergeCloseout.reason) ===
        'merged_and_shared_root_reconciled_transition_deferred' ||
      hasFailedDoneTransition
    );
  if (!isPendingSharedRootReconciliation && !isMergedTransitionDeferred) {
    return false;
  }
  const liveWorkflowState = classifyProviderLinearWorkflowState(
    input.trackedIssue
      ? {
          state: input.trackedIssue.state,
          state_type: input.trackedIssue.state_type
        }
      : {
          state: input.claim.issue_state,
          state_type: input.claim.issue_state_type
        }
  );
  if (!liveWorkflowState.isTerminal) {
    return false;
  }
  const freshness = compareTrackedIssueUpdatedAt({
    existingIssueUpdatedAt: mergeCloseout.issue_updated_at ?? null,
    nextIssueUpdatedAt:
      input.trackedIssue !== undefined
        ? input.trackedIssue?.updated_at ?? null
        : input.claim.issue_updated_at ?? null
  });
  return freshness === 'equal' || freshness === 'newer';
}

function isSupersededDoneTransitionFailedMergeCloseoutClaim(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'merge_closeout'
  >;
  trackedIssue?: Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'updated_at'> | null;
}): boolean {
  const mergeCloseout = input.claim.merge_closeout ?? null;
  if (
    !mergeCloseout ||
    mergeCloseout.status !== 'transition_failed' ||
    normalizeOptionalString(mergeCloseout.reason) !== 'linear_done_transition_failed'
  ) {
    return false;
  }
  if (!mergeCloseoutSnapshotShowsMerged(mergeCloseout)) {
    return false;
  }
  if (normalizeOptionalString(mergeCloseout.shared_root?.status) !== 'reconciled') {
    return false;
  }
  if (normalizeProviderLinearWorkflowState(mergeCloseout.issue_state) !== 'merging') {
    return false;
  }
  const nextIssue = input.trackedIssue
    ? {
        state: input.trackedIssue.state,
        state_type: input.trackedIssue.state_type
      }
    : {
        state: input.claim.issue_state,
        state_type: input.claim.issue_state_type
      };
  if (!isProviderLinearDoneWorkflowState(nextIssue)) {
    return false;
  }
  const freshness = compareTrackedIssueUpdatedAt({
    existingIssueUpdatedAt: mergeCloseout.issue_updated_at ?? null,
    nextIssueUpdatedAt:
      input.trackedIssue !== undefined
        ? input.trackedIssue?.updated_at ?? null
        : input.claim.issue_updated_at ?? null
  });
  return freshness === 'equal' || freshness === 'newer';
}

function mergeCloseoutSnapshotShowsMerged(
  mergeCloseout: Pick<ProviderMergeCloseoutRecord, 'status' | 'snapshot'>
): boolean {
  if (mergeCloseout.status === 'merged') {
    return true;
  }
  const snapshot = mergeCloseout.snapshot ?? null;
  return Boolean(
    normalizeOptionalString(snapshot?.merged_at) ||
      normalizeOptionalString(snapshot?.state) === 'MERGED'
  );
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function buildProviderIssueRecoveryResult(input: {
  provider: 'linear';
  issueId: string;
  action: ProviderIssueRecoveryAction;
  kind: ProviderIssueHandoffRecoveryResult['kind'];
  reason: string;
  details?: Record<string, unknown>;
  claim: ProviderIntakeClaimRecord | null | undefined;
}): ProviderIssueHandoffRecoveryResult {
  return {
    provider: input.provider,
    issue_id: input.issueId,
    action: input.action,
    kind: input.kind,
    reason: input.reason,
    ...(input.details ? { details: input.details } : {}),
    claim: input.claim ? summarizeProviderIssueRecoveryClaim(input.claim) : null
  };
}

function readProviderIntakeClaimByIssueRef(
  state: ProviderIntakeState,
  provider: 'linear',
  issueRef: string
): ProviderIntakeClaimRecord | null {
  return readProviderIntakeClaim(state, buildProviderIssueKey(provider, issueRef)) ??
    state.claims.find((claim) =>
      claim.provider === provider &&
      (claim.issue_id === issueRef || claim.issue_identifier === issueRef)
    ) ?? null;
}

function summarizeProviderIssueRecoveryClaim(
  claim: ProviderIntakeClaimRecord
): ProviderIssueHandoffRecoveryClaim {
  return {
    provider: claim.provider,
    issue_id: claim.issue_id,
    issue_identifier: normalizeOptionalString(claim.issue_identifier),
    issue_state: normalizeOptionalString(claim.issue_state),
    issue_state_type: normalizeOptionalString(claim.issue_state_type),
    state: claim.state,
    reason: normalizeOptionalString(claim.reason),
    task_id: normalizeOptionalString(claim.task_id),
    run_id: normalizeOptionalString(claim.run_id),
    run_manifest_path: normalizeOptionalString(claim.run_manifest_path),
    worker_host: normalizeOptionalString(claim.worker_host),
    launch_source: claim.launch_source ?? null,
    launch_token_present: normalizeOptionalString(claim.launch_token) !== null,
    updated_at: normalizeOptionalString(claim.updated_at)
  };
}

function shouldClearStaleReviewPromotionForTrackedIssue(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'review_promotion'>;
  trackedIssue: Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'updated_at'>;
}): boolean {
  const reviewPromotion = input.claim.review_promotion ?? null;
  if (!reviewPromotion) {
    return false;
  }
  if (!classifyProviderLinearWorkflowState(input.trackedIssue).isActive) {
    return false;
  }
  const reviewPromotionWorkflowState = classifyProviderLinearWorkflowState({
    state: reviewPromotion.issue_state,
    state_type: reviewPromotion.issue_state_type
  });
  if (
    !reviewPromotionWorkflowState.isHandoff &&
    reviewPromotionWorkflowState.normalizedState !== 'merging'
  ) {
    return false;
  }
  return (
    compareTrackedIssueUpdatedAt({
      existingIssueUpdatedAt: reviewPromotion.issue_updated_at ?? null,
      nextIssueUpdatedAt: input.trackedIssue.updated_at
    }) === 'newer'
  );
}

function assessProviderTrackedIssueEligibility(
  trackedIssue: Pick<
    LiveLinearTrackedIssue,
    | 'state'
    | 'state_type'
    | 'archived_at'
    | 'trashed'
    | 'viewer_id'
    | 'assignee_id'
    | 'blocked_by'
  >,
  options: {
    hasExistingClaim?: boolean;
  } = {}
): ProviderTrackedIssueEligibility {
  const workflowState = classifyProviderLinearWorkflowState(trackedIssue);
  if (!isProviderLinearTrackedIssueMutable(trackedIssue)) {
    return {
      eligible: false,
      claimReason: 'provider_issue_not_mutable',
      releaseReason: 'provider_issue_released:not_mutable',
      cleanupWorkspace: false
    };
  }
  const assigneeChanged =
    options.hasExistingClaim === true &&
    trackedIssue.assignee_id !== null &&
    !isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(trackedIssue);
  if (assigneeChanged && workflowState.isTerminal !== true) {
    return {
      eligible: false,
      claimReason: 'provider_issue_assignee_changed',
      releaseReason: 'provider_issue_released:assignee_changed',
      cleanupWorkspace: false
    };
  }

  if (options.hasExistingClaim === true && workflowState.isHandoff) {
    return {
      eligible: true,
      claimReason: 'provider_issue_handoff_owned'
    };
  }

  if (!isProviderLinearTrackedIssueEligibleForExecution(trackedIssue)) {
    return {
      eligible: false,
      claimReason:
        workflowState.isTodo &&
        providerLinearTodoBlockedByNonTerminal(trackedIssue.blocked_by)
          ? 'provider_issue_todo_blocked_by_non_terminal'
          : 'provider_issue_state_not_active',
      releaseReason:
        workflowState.isTodo &&
        providerLinearTodoBlockedByNonTerminal(trackedIssue.blocked_by)
          ? 'provider_issue_released:todo_blocked_by_non_terminal'
          : 'provider_issue_released:not_active',
      cleanupWorkspace: workflowState.isTerminal
    };
  }

  if (
    options.hasExistingClaim !== true &&
    !isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(trackedIssue)
  ) {
    return {
      eligible: false,
      claimReason: 'provider_issue_assignee_changed',
      releaseReason: 'provider_issue_released:assignee_changed',
      cleanupWorkspace: false
    };
  }

  return {
    eligible: true,
    claimReason: null
  };
}

function isTerminalTrackedIssueState(
  normalizedState: string | null,
  normalizedStateType: string | null
): boolean {
  return classifyProviderLinearWorkflowState({
    state: normalizedState,
    state_type: normalizedStateType
  }).isTerminal;
}

function shouldCleanupReleasedProviderWorkspace(claim: ProviderIntakeClaimRecord): boolean {
  return isTerminalTrackedIssueState(
    normalizeProviderLinearWorkflowState(claim.issue_state),
    normalizeProviderLinearWorkflowState(claim.issue_state_type)
  );
}

function resolveReleasedClaimRetainedRunIdentity(input: {
  claim: ProviderIntakeClaimRecord;
  run: ProviderIssueRunRecord | null;
  allowClearing?: boolean;
  trackedIssue?: Pick<LiveLinearTrackedIssue, 'state' | 'state_type'> | null;
  issueState?: string | null;
  issueStateType?: string | null;
}): Partial<
  Pick<
    ProviderIntakeClaimRecord,
    'worker_host' | 'launch_source' | 'launch_token' | 'launch_started_at'
  >
> &
  Pick<ProviderIntakeClaimRecord, 'task_id' | 'run_id' | 'run_manifest_path'> {
  const taskId = input.run?.taskId ?? input.claim.task_id;
  if (input.allowClearing !== false && shouldClearReleasedClaimRunIdentity(input)) {
    return {
      task_id: taskId,
      run_id: null,
      run_manifest_path: null,
      worker_host: null,
      launch_source: null,
      launch_token: null,
      launch_started_at: null
    };
  }
  return {
    task_id: taskId,
    run_id: input.run?.runId ?? input.claim.run_id,
    run_manifest_path: input.run?.manifestPath ?? input.claim.run_manifest_path
  };
}

function shouldClearReleasedClaimRunIdentity(input: {
  claim: ProviderIntakeClaimRecord;
  run: ProviderIssueRunRecord | null;
  trackedIssue?: Pick<LiveLinearTrackedIssue, 'state' | 'state_type'> | null;
  issueState?: string | null;
  issueStateType?: string | null;
}): boolean {
  const issueState = input.issueState ?? input.trackedIssue?.state ?? input.claim.issue_state;
  const issueStateType =
    input.issueStateType ?? input.trackedIssue?.state_type ?? input.claim.issue_state_type;
  if (
    !isTerminalTrackedIssueState(
      normalizeProviderLinearWorkflowState(issueState),
      normalizeProviderLinearWorkflowState(issueStateType)
    )
  ) {
    return false;
  }
  if (isTerminalProviderIssueRunOutcome(input.run)) {
    return false;
  }
  if (!input.run) {
    return false;
  }
  if (input.run.status === 'queued') {
    return false;
  }
  return true;
}

function isTerminalProviderIssueRunOutcome(run: ProviderIssueRunRecord | null): boolean {
  const status = run?.proofTerminalStatus ?? run?.status ?? null;
  return (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'completed'
  );
}

function createProviderPollDispatchBudget(
  featureToggles: Record<string, unknown> | null | undefined,
  options: {
    localWorkerOnly?: boolean;
  } = {}
): {
  canDispatch(trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>): boolean;
  canDispatchWhilePreservingFreshDiscoverySlot(
    trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>
  ): boolean;
  noteOccupied(trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>): void;
  releaseOccupied(trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>): void;
  hasGlobalSlots(): boolean;
  remainingGlobalSlots(): number;
  remainingStateSlots(): Record<string, number>;
} {
  const limits = resolveProviderPollDispatchLimits(featureToggles, {
    localWorkerOnly: options.localWorkerOnly === true
  });
  let occupiedGlobalSlots = 0;
  const occupiedStateSlots = new Map<string, number>();
  let occupiedUnknownStateSlots = 0;
  let hasPartialStateSnapshot = false;

  const hasGlobalSlots = (): boolean => occupiedGlobalSlots < limits.maxConcurrentAgents;
  const remainingGlobalSlots = (): number =>
    Math.max(0, limits.maxConcurrentAgents - occupiedGlobalSlots);
  const remainingStateSlots = (): Record<string, number> => {
    if (hasPartialStateSnapshot) {
      return {};
    }
    const remaining: Record<string, number> = {};
    for (const [state, stateLimit] of limits.maxConcurrentAgentsByState.entries()) {
      remaining[state] = Math.max(0, stateLimit - (occupiedStateSlots.get(state) ?? 0));
    }
    return remaining;
  };

  const canDispatch = (trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>): boolean => {
    if (!hasGlobalSlots()) {
      return false;
    }
    const normalizedState = normalizeProviderLinearWorkflowState(trackedIssue.state);
    if (!normalizedState) {
      return true;
    }
    const usedSlots =
      (occupiedStateSlots.get(normalizedState) ?? 0) + occupiedUnknownStateSlots;
    const stateLimit = limits.maxConcurrentAgentsByState.get(normalizedState) ?? limits.maxConcurrentAgents;
    return usedSlots < stateLimit;
  };
  const canDispatchWhilePreservingFreshDiscoverySlot = (
    trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>
  ): boolean => {
    if (remainingGlobalSlots() <= 1) {
      return false;
    }
    if (limits.maxConcurrentAgentsByState.size === 0) {
      return true;
    }
    const normalizedState = normalizeProviderLinearWorkflowState(trackedIssue.state);
    if (!normalizedState) {
      return false;
    }
    const stateLimit = limits.maxConcurrentAgentsByState.get(normalizedState);
    if (stateLimit === undefined) {
      return true;
    }
    const usedSlots =
      (occupiedStateSlots.get(normalizedState) ?? 0) + occupiedUnknownStateSlots;
    return stateLimit - usedSlots > 1;
  };

  const noteOccupied = (trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>): void => {
    occupiedGlobalSlots += 1;
    const normalizedState = normalizeProviderLinearWorkflowState(trackedIssue.state);
    if (!normalizedState) {
      occupiedUnknownStateSlots += 1;
      hasPartialStateSnapshot = true;
      return;
    }
    occupiedStateSlots.set(normalizedState, (occupiedStateSlots.get(normalizedState) ?? 0) + 1);
  };
  const releaseOccupied = (trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>): void => {
    occupiedGlobalSlots = Math.max(0, occupiedGlobalSlots - 1);
    const normalizedState = normalizeProviderLinearWorkflowState(trackedIssue.state);
    if (!normalizedState) {
      occupiedUnknownStateSlots = Math.max(0, occupiedUnknownStateSlots - 1);
      hasPartialStateSnapshot = occupiedUnknownStateSlots > 0;
      return;
    }
    const nextCount = Math.max(0, (occupiedStateSlots.get(normalizedState) ?? 0) - 1);
    if (nextCount === 0) {
      occupiedStateSlots.delete(normalizedState);
      return;
    }
    occupiedStateSlots.set(normalizedState, nextCount);
  };

  return {
    canDispatch,
    canDispatchWhilePreservingFreshDiscoverySlot,
    noteOccupied,
    releaseOccupied,
    hasGlobalSlots,
    remainingGlobalSlots,
    remainingStateSlots
  };
}

function shouldProviderClaimOccupyPollDispatchSlot(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'issue_state' | 'issue_state_type' | 'issue_archived_at' | 'issue_trashed'
  >
): boolean {
  if (isTerminalProviderIntakeIssueState(claim)) {
    return false;
  }
  return claim.state === 'starting' || claim.state === 'resuming' || claim.state === 'running';
}

function shouldCountQueuedAdmissionOccupancyForClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'state'
    | 'retry_queued'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_archived_at'
    | 'issue_trashed'
    | 'run_id'
    | 'run_manifest_path'
  > | null,
  run: Pick<ProviderIssueRunRecord, 'runId' | 'manifestPath'>
): boolean {
  if (!claim) {
    return true;
  }
  if (!hasProviderClaimRunIdentityMatch(claim, run)) {
    return true;
  }
  if (isTerminalProviderIntakeIssueState(claim)) {
    return false;
  }
  if (claim.state !== 'completed') {
    return true;
  }
  if (claim.retry_queued === true) {
    return true;
  }
  return resolveProviderClaimIssueStateForAdmission(claim, { status: 'queued' }) !== null;
}

function shouldProviderClaimOccupyAdmissionSlot(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'retry_queued' | 'issue_state' | 'issue_state_type' | 'issue_archived_at' | 'issue_trashed'
  >
): boolean {
  if (isTerminalProviderIntakeIssueState(claim)) {
    return false;
  }
  return (
    claim.retry_queued === true ||
    claim.state === 'starting' ||
    claim.state === 'resuming' ||
    claim.state === 'running' ||
    claim.state === 'resumable'
  );
}

function shouldRetainedProviderClaimOccupyPollDispatchSlot(
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'state'
    | 'retry_queued'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_archived_at'
    | 'issue_trashed'
    | 'issue_blocked_by'
    | 'run_id'
    | 'run_manifest_path'
  >,
  run: Pick<ProviderIssueRunRecord, 'status' | 'runId' | 'manifestPath'> | null
): boolean {
  if (isTerminalProviderIntakeIssueState(claim)) {
    return false;
  }
  if (run?.status === 'in_progress') {
    return true;
  }
  if (run?.status === 'queued') {
    return shouldCountQueuedAdmissionOccupancyForClaim(claim, run);
  }
  if (claim.retry_queued === true) {
    return true;
  }
  return shouldProviderClaimOccupyPollDispatchSlot(claim);
}

function resolveProviderClaimIssueStateForAdmission(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'issue_state' | 'issue_state_type'> | null,
  run: Pick<ProviderIssueRunRecord, 'status'> | null = null
): string | null {
  if (!claim) {
    return null;
  }
  if (run?.status === 'queued' && !shouldUseQueuedClaimIssueStateForAdmission(claim)) {
    return null;
  }
  if (
    isTerminalTrackedIssueState(
      normalizeProviderLinearWorkflowState(claim.issue_state),
      normalizeProviderLinearWorkflowState(claim.issue_state_type)
    )
  ) {
    return null;
  }
  return claim.issue_state ?? null;
}

function isReleasedProviderClaimRunIdentityMatch(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'run_id' | 'run_manifest_path'> | null,
  run: Pick<ProviderIssueRunRecord, 'runId' | 'manifestPath'>
): boolean {
  if (claim?.state !== 'released') {
    return false;
  }
  return hasProviderClaimRunIdentityMatch(claim, run);
}

function hasProviderClaimRunIdentityMatch(
  claim: Pick<ProviderIntakeClaimRecord, 'run_id' | 'run_manifest_path'> | null,
  run: Pick<ProviderIssueRunRecord, 'runId' | 'manifestPath'>
): boolean {
  if (!claim) {
    return false;
  }
  return (
    (claim.run_manifest_path !== null && claim.run_manifest_path === run.manifestPath) ||
    (claim.run_id !== null && claim.run_id === run.runId)
  );
}

function shouldUseQueuedClaimIssueStateForAdmission(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'issue_state' | 'issue_state_type'>
): boolean {
  const canReuseRetainedQueuedState =
    claim.state === 'accepted' ||
    claim.state === 'starting' ||
    claim.state === 'running' ||
    claim.state === 'resuming' ||
    claim.state === 'resumable' ||
    claim.state === 'handoff_failed';
  if (!canReuseRetainedQueuedState) {
    return false;
  }
  return !isTerminalTrackedIssueState(
    normalizeProviderLinearWorkflowState(claim.issue_state),
    normalizeProviderLinearWorkflowState(claim.issue_state_type)
  );
}

function resolveProviderPollRunOccupancyKey(
  run: Pick<ProviderIssueRunRecord, 'provider' | 'issueId' | 'runId' | 'manifestPath'>
): string {
  return run.manifestPath || run.runId || `run:${buildProviderIssueKey(run.provider, run.issueId)}`;
}

async function cleanupReleasedProviderWorkspace(input: {
  repoRoot: string;
  taskId: string;
  manifestPath: string | null;
  issueId: string;
  issueIdentifier: string | null;
  providerWorkflowConfigStore: ProviderWorkflowConfigStore | null;
  runTerminalCleanup: typeof runProviderTerminalCleanup;
  assertCurrent?: () => void;
}): Promise<void> {
  const workspacePath = await resolveProviderCleanupWorkspacePath(
    input.repoRoot,
    input.taskId,
    input.manifestPath
  );
  input.assertCurrent?.();
  await maybeRunReleasedProviderTerminalCleanup({
    issueId: input.issueId,
    issueIdentifier: input.issueIdentifier,
    workspacePath,
    providerWorkflowConfigStore: input.providerWorkflowConfigStore,
    runTerminalCleanup: input.runTerminalCleanup,
    assertCurrent: input.assertCurrent
  });
  input.assertCurrent?.();
  await cleanupProviderWorkspace(input.repoRoot, workspacePath, {
    beforeRemove: input.assertCurrent
  });
}

async function maybeRunReleasedProviderTerminalCleanup(input: {
  issueId: string;
  issueIdentifier: string | null;
  workspacePath: string;
  providerWorkflowConfigStore: ProviderWorkflowConfigStore | null;
  runTerminalCleanup: typeof runProviderTerminalCleanup;
  assertCurrent?: () => void;
}): Promise<void> {
  try {
    const providerWorkflow = input.providerWorkflowConfigStore
      ? await input.providerWorkflowConfigStore.refresh()
      : null;
    input.assertCurrent?.();
    const cleanupConfig = resolveProviderTerminalCleanupConfigFromPayload(providerWorkflow);
    if (!cleanupConfig) {
      return;
    }
    input.assertCurrent?.();
    const cleanupResult = await input.runTerminalCleanup({
      issueId: input.issueId,
      issueIdentifier: input.issueIdentifier,
      workspacePath: input.workspacePath,
      config: cleanupConfig,
      env: process.env
    });
    input.assertCurrent?.();
    input.providerWorkflowConfigStore?.recordTerminalCleanupResult(cleanupResult);
    if (cleanupResult.status === 'failed') {
      logger.error(
        `[provider-terminal-cleanup] issue=${input.issueIdentifier ?? input.issueId} summary=${cleanupResult.summary} error=${cleanupResult.error ?? 'unknown'}`
      );
      return;
    }
    if (cleanupResult.status === 'succeeded') {
      logger.info(
        `[provider-terminal-cleanup] issue=${input.issueIdentifier ?? input.issueId} summary=${cleanupResult.summary}`
      );
    }
  } catch (error) {
    logger.error(
      `[provider-terminal-cleanup] issue=${input.issueIdentifier ?? input.issueId} failed before workspace removal: ${(error as Error).message}`
    );
  }
}

function resolveProviderTerminalCleanupConfigFromPayload(
  providerWorkflow: {
    terminal_cleanup?: {
      enabled: boolean;
      close_attached_pr: {
        enabled: boolean;
        comment_template: string;
      };
    } | null;
  } | null
): ProviderTerminalCleanupConfig | null {
  const terminalCleanup = providerWorkflow?.terminal_cleanup ?? null;
  if (!terminalCleanup) {
    return null;
  }
  return {
    enabled: terminalCleanup.enabled,
    closeAttachedPr: {
      enabled: terminalCleanup.close_attached_pr.enabled,
      commentTemplate: terminalCleanup.close_attached_pr.comment_template
    }
  };
}

function resolveProviderOperatorAutopilotConfigFromPayload(
  providerWorkflow: {
    operator_autopilot?: unknown;
  } | null
): ProviderOperatorAutopilotConfig | null {
  const operatorAutopilot = resolveProviderOperatorAutopilotPayload(providerWorkflow);
  if (!operatorAutopilot) {
    return null;
  }
  return resolveProviderOperatorAutopilotConfig({
    operator_autopilot: operatorAutopilot
  });
}

function resolveProviderOperatorAutopilotPreviousResultFromPayload(
  providerWorkflow: {
    operator_autopilot?: unknown;
  } | null
): ProviderOperatorAutopilotResult | null {
  const candidate = resolveProviderOperatorAutopilotPayload(providerWorkflow)?.last_result;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  const record = candidate as Record<string, unknown>;
  const error = record.error;
  const status = record.status;
  if (
    !Array.isArray(record.pending_actions) ||
    !Array.isArray(record.actions) ||
    !Array.isArray(record.holds) ||
    typeof record.recorded_at !== 'string' ||
    typeof status !== 'string' ||
    typeof record.summary !== 'string' ||
    (error !== null && typeof error !== 'string')
  ) {
    return null;
  }
  if (!new Set<ProviderOperatorAutopilotResult['status']>(['disabled', 'noop', 'acted', 'failed']).has(status as ProviderOperatorAutopilotResult['status'])) {
    return null;
  }
  const backlogPromotionSnapshotRetentionRecords =
    sanitizeProviderOperatorAutopilotRetentionRecords(
      record.backlog_promotion_snapshot_retention_records
    );
  return {
    recorded_at: record.recorded_at,
    status: status as ProviderOperatorAutopilotResult['status'],
    summary: record.summary,
    error,
    actions: record.actions as ProviderOperatorAutopilotResult['actions'],
    holds: record.holds as ProviderOperatorAutopilotResult['holds'],
    pending_actions: record.pending_actions as ProviderOperatorAutopilotResult['pending_actions'],
    terminal_blocker_advisories: Array.isArray(record.terminal_blocker_advisories)
      ? (record.terminal_blocker_advisories as ProviderOperatorAutopilotResult['terminal_blocker_advisories'])
      : [],
    resolved_actions: Array.isArray(record.resolved_actions)
      ? (record.resolved_actions as ProviderOperatorAutopilotResult['resolved_actions'])
      : [],
    lifecycle_records: Array.isArray(record.lifecycle_records)
      ? (record.lifecycle_records as ProviderOperatorAutopilotResult['lifecycle_records'])
      : [],
    local_rollout_execution_attempts: Array.isArray(record.local_rollout_execution_attempts)
      ? (record.local_rollout_execution_attempts as ProviderOperatorAutopilotResult['local_rollout_execution_attempts'])
      : [],
    backlog_promotion_snapshots: Array.isArray(record.backlog_promotion_snapshots)
      ? (record.backlog_promotion_snapshots as ProviderOperatorAutopilotResult['backlog_promotion_snapshots'])
      : [],
    backlog_promotion_snapshot_retention_records: backlogPromotionSnapshotRetentionRecords
  };
}

function sanitizeProviderOperatorAutopilotRetentionRecords(
  value: unknown
): ProviderOperatorAutopilotResult['backlog_promotion_snapshot_retention_records'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry) =>
    isRecord(entry) && typeof entry.issue_id === 'string' && entry.issue_id.trim().length > 0
  ) as ProviderOperatorAutopilotResult['backlog_promotion_snapshot_retention_records'];
}

function resolveLocalRolloutExecutionAttemptsForCycle(
  executionRecordsForCycle:
    | ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[]
    | undefined,
  previousAttempts:
    | ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[]
    | undefined
): ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[] {
  const previous = Array.isArray(previousAttempts)
    ? previousAttempts.map(cloneLocalRolloutExecutionAttempt)
    : [];
  if (executionRecordsForCycle === undefined) {
    return previous;
  }
  const current = executionRecordsForCycle.map(cloneLocalRolloutExecutionAttempt);
  const terminalKeys = new Set(
    current
      .filter((attempt) => attempt.record_kind === 'terminal')
      .map((attempt) => localRolloutExecutionAttemptKey(attempt))
  );
  const preservedAttemptKeys = new Set(
    current
      .map((attempt) => localRolloutExecutionAttemptReasonKey(attempt))
  );
  for (const attempt of previous) {
    if (!shouldPreservePreviousLocalRolloutExecutionAttempt(attempt, terminalKeys)) {
      continue;
    }
    const attemptKey = localRolloutExecutionAttemptReasonKey(attempt);
    if (!preservedAttemptKeys.has(attemptKey)) {
      current.push(cloneLocalRolloutExecutionAttempt(attempt));
      preservedAttemptKeys.add(attemptKey);
    }
  }
  return current;
}

function shouldPreservePreviousLocalRolloutExecutionAttempt(
  attempt: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord,
  currentTerminalKeys: ReadonlySet<string>
): boolean {
  if (attempt.record_kind === 'started') {
    return !currentTerminalKeys.has(localRolloutExecutionAttemptKey(attempt));
  }
  return (
    attempt.reason === 'lifecycle_record_failed' ||
    !currentTerminalKeys.has(localRolloutExecutionAttemptKey(attempt))
  );
}

function localRolloutExecutionAttemptKey(
  attempt: Pick<
    ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord,
    'action_instance_id' | 'action_id'
  >
): string {
  return `${attempt.action_instance_id}\u0000${attempt.action_id}`;
}

function localRolloutExecutionAttemptReasonKey(
  attempt: Pick<
    ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord,
    'action_instance_id' | 'action_id' | 'reason'
  >
): string {
  return `${localRolloutExecutionAttemptKey(attempt)}\u0000${attempt.reason ?? ''}`;
}

function resolveProviderOperatorAutopilotAuditPathFromPayload(
  providerWorkflow: {
    operator_autopilot?: unknown;
  } | null
): string | null {
  const auditPath = resolveProviderOperatorAutopilotPayload(providerWorkflow)?.audit_path;
  return typeof auditPath === 'string' && auditPath.trim().length > 0 ? auditPath : null;
}

function resolveProviderOperatorAutopilotLifecyclePathFromPayload(
  providerWorkflow: {
    operator_autopilot?: unknown;
  } | null
): string | null {
  const operatorAutopilot = resolveProviderOperatorAutopilotPayload(providerWorkflow);
  const lifecyclePath = operatorAutopilot?.lifecycle_path;
  if (typeof lifecyclePath === 'string' && lifecyclePath.trim().length > 0) {
    return lifecyclePath;
  }
  const auditPath = resolveProviderOperatorAutopilotAuditPathFromPayload(providerWorkflow);
  return auditPath ? resolveProviderOperatorAutopilotLifecyclePath(dirname(auditPath)) : null;
}

function resolveProviderOperatorAutopilotExecutionPathFromPayload(
  providerWorkflow: {
    operator_autopilot?: unknown;
  } | null
): string | null {
  const operatorAutopilot = resolveProviderOperatorAutopilotPayload(providerWorkflow);
  const executionPath = operatorAutopilot?.execution_path;
  if (typeof executionPath === 'string' && executionPath.trim().length > 0) {
    return executionPath;
  }
  const auditPath = resolveProviderOperatorAutopilotAuditPathFromPayload(providerWorkflow);
  return auditPath
    ? resolveProviderOperatorAutopilotLocalRolloutExecutionPath(dirname(auditPath))
    : null;
}

async function readProviderOperatorAutopilotLifecycleRecordsForCycle(
  lifecyclePath: string | null
): Promise<ProviderOperatorAutopilotLifecycleRecord[] | undefined> {
  if (!lifecyclePath) {
    return [];
  }
  try {
    return await readProviderOperatorAutopilotLifecycleRecords(lifecyclePath);
  } catch (error) {
    logger.warn(
      `[provider-operator-autopilot] Failed to read lifecycle records path=${lifecyclePath}: ${
        (error as Error)?.message ?? String(error)
      }`
    );
    return undefined;
  }
}

async function readProviderOperatorAutopilotExecutionRecordsForCycle(
  executionPath: string | null
): Promise<ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[] | undefined> {
  if (!executionPath) {
    return [];
  }
  try {
    return await readProviderOperatorAutopilotLocalRolloutExecutionRecords(executionPath);
  } catch (error) {
    logger.warn(
      `[provider-operator-autopilot] Failed to read local rollout execution records path=${executionPath}: ${
        (error as Error)?.message ?? String(error)
      }`
    );
    return undefined;
  }
}

function disableProviderOperatorAutopilotLocalRolloutExecution(
  config: ProviderOperatorAutopilotConfig
): ProviderOperatorAutopilotConfig {
  return {
    ...config,
    post_merge_rollout: {
      ...config.post_merge_rollout,
      execution: {
        ...config.post_merge_rollout.execution,
        enabled: false
      }
    }
  };
}

function resolveProviderOperatorAutopilotPayload(
  providerWorkflow: {
    operator_autopilot?: unknown;
  } | null
): {
  audit_path?: unknown;
  lifecycle_path?: unknown;
  execution_path?: unknown;
  last_result?: unknown;
} | null {
  const operatorAutopilot = providerWorkflow?.operator_autopilot;
  if (!operatorAutopilot || typeof operatorAutopilot !== 'object') {
    return null;
  }
  return operatorAutopilot as {
    audit_path?: unknown;
    lifecycle_path?: unknown;
    execution_path?: unknown;
    last_result?: unknown;
  };
}

function buildFreshDiscoveryBlockedProviderKeys(
  claims: ProviderIntakeClaimRecord[]
): Set<string> {
  return new Set(
    claims
      .filter(
        (claim) =>
          claim.state !== 'ignored' &&
          (
            claim.state !== 'released' ||
            shouldBlockPlainReleasedWithoutConcreteRetainedRunClaim(claim)
          ) &&
          claim.state !== 'completed' &&
          claim.state !== 'handoff_failed'
      )
      .map((claim) => claim.provider_key)
  );
}

function buildFreshDiscoveryConsumedProviderKeys(
  consumedTrackedIssueKeys: Set<string>,
  claims: ProviderIntakeClaimRecord[]
): Set<string> {
  const nonBlockingClaimKeys = new Set(
    claims
      .filter(
        (claim) =>
          claim.state === 'ignored' ||
          claim.state === 'released' ||
          claim.state === 'completed' ||
          claim.state === 'handoff_failed'
      )
      .map((claim) => claim.provider_key)
  );
  return new Set(
    Array.from(consumedTrackedIssueKeys).filter((providerKey) => !nonBlockingClaimKeys.has(providerKey))
  );
}

function resolveProviderOperatorAutopilotTransitionIssueIds(
  result: ProviderOperatorAutopilotResult
): string[] {
  const issueIds: string[] = [];
  const seenIssueIds = new Set<string>();
  for (const action of result.actions) {
    if (action.transition.status !== 'transitioned' && action.transition.status !== 'noop') {
      continue;
    }
    if (seenIssueIds.has(action.issue_id)) {
      continue;
    }
    seenIssueIds.add(action.issue_id);
    issueIds.push(action.issue_id);
  }
  return issueIds;
}

function sortProviderDispatchTrackedIssuesWithPriority(
  trackedIssues: readonly LiveLinearTrackedIssue[],
  priorityIssueIds: readonly string[]
): LiveLinearTrackedIssue[] {
  const sortedIssues = sortLiveLinearTrackedIssuesForDispatch(trackedIssues);
  if (priorityIssueIds.length === 0 || sortedIssues.length <= 1) {
    return sortedIssues;
  }

  const sortedByIssueId = new Map(sortedIssues.map((trackedIssue) => [trackedIssue.id, trackedIssue]));
  const prioritizedIssues: LiveLinearTrackedIssue[] = [];
  for (const issueId of priorityIssueIds) {
    const trackedIssue = sortedByIssueId.get(issueId);
    if (!trackedIssue) {
      continue;
    }
    sortedByIssueId.delete(issueId);
    prioritizedIssues.push(trackedIssue);
  }
  return [
    ...prioritizedIssues,
    ...sortedIssues.filter((trackedIssue) => sortedByIssueId.has(trackedIssue.id))
  ];
}

async function resolveProviderCleanupWorkspacePath(
  repoRoot: string,
  taskId: string,
  manifestPath: string | null
): Promise<string> {
  const manifestRecord = await readManifestRecord(manifestPath);
  const explicitWorkspacePath = manifestRecord
    ? resolveExplicitProviderWorkspacePathWithinRoot(repoRoot, taskId, manifestRecord)
    : null;
  return explicitWorkspacePath ?? resolveProviderWorkspacePath(repoRoot, taskId);
}

function resolveControlHostRunLocatorFromRunDir(runDir: string): ProviderControlHostRunLocator | null {
  const resolvedRunDir = resolve(runDir);
  const runId = basename(resolvedRunDir);
  const cliDir = dirname(resolvedRunDir);
  if (basename(cliDir) !== 'cli') {
    return null;
  }
  const taskId = basename(dirname(cliDir));
  if (!taskId || !runId) {
    return null;
  }
  return { taskId, runId };
}

async function readManifestRecord(manifestPath: string | null): Promise<Record<string, unknown> | null> {
  if (!manifestPath) {
    return null;
  }
  try {
    const raw = await readFile(manifestPath, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function createProviderLaunchToken(): string {
  return randomBytes(16).toString('hex');
}

const PROVIDER_CHILD_STREAM_PIPELINE_IDS = new Set([
  'docs-review',
  'implementation-gate',
  'docs-relevance-advisory',
  'provider-linear-child-lane'
]);

export async function discoverProviderIssueRuns(
  currentRunDir: string,
  input?: {
    provider?: 'linear';
    issueId?: string;
    isProcessAlive?: ((pid: number) => boolean) | null;
  }
): Promise<ProviderIssueRunRecord[]> {
  const snapshot = await discoverProviderIssueRunSnapshot(currentRunDir, {
    isProcessAlive: input?.isProcessAlive ?? null
  });
  if (!input?.provider || !input.issueId) {
    return snapshot.discoveredRuns;
  }
  return snapshot.discoveredRuns.filter(
    (run) => run.provider === input.provider && run.issueId === input.issueId
  );
}

async function discoverProviderIssueRunSnapshot(
  currentRunDir: string,
  options?: {
    isProcessAlive?: ((pid: number) => boolean) | null;
  }
): Promise<ProviderIssueRunDiscoverySnapshot> {
  const runsRoot = resolve(currentRunDir, '..', '..', '..');
  const isProcessAlive = options?.isProcessAlive ?? isLocalProcessAlive;
  const taskEntries = await readDirectoryNames(runsRoot);
  const discovered: ProviderIssueRunRecord[] = [];
  const unreadableAdmissionOccupancy: ProviderUnreadableManifestAdmissionOccupancyRecord[] = [];

  for (const taskEntry of taskEntries) {
    if (taskEntry === 'local-mcp') {
      continue;
    }
    const cliRoot = join(runsRoot, taskEntry, 'cli');
    const runEntries = await readDirectoryNames(cliRoot);
    for (const runEntry of runEntries) {
      const manifestPath = join(cliRoot, runEntry, 'manifest.json');
      let manifest: Record<string, unknown> | null = null;
      try {
        manifest = await readJsonFile<Record<string, unknown>>(manifestPath);
      } catch (error) {
        const occupancyRecord = await readUnreadableProviderAdmissionOccupancyRecord({
          manifestPath,
          isProcessAlive
        });
        if (occupancyRecord) {
          unreadableAdmissionOccupancy.push(occupancyRecord);
        }
        logger.warn(
          `[provider-issue-run-discovery] skipping unreadable manifest ${manifestPath}: ${
            (error as Error)?.message ?? String(error)
          }`
        );
        continue;
      }
      if (!manifest) {
        const occupancyRecord = await readUnreadableProviderAdmissionOccupancyRecord({
          manifestPath,
          isProcessAlive
        });
        if (occupancyRecord) {
          unreadableAdmissionOccupancy.push(occupancyRecord);
        }
        continue;
      }
      const parentRunId = readStringValue(manifest, 'parent_run_id');
      const pipelineId = readStringValue(manifest, 'pipeline_id');
      if (parentRunId && pipelineId && PROVIDER_CHILD_STREAM_PIPELINE_IDS.has(pipelineId)) {
        continue;
      }
      const issueProvider = readStringValue(manifest, 'issue_provider');
      const issueId = readStringValue(manifest, 'issue_id');
      if (issueProvider !== 'linear' || !issueId) {
        continue;
      }
      const proof = await readBestEffortJsonFile<ProviderLinearWorkerProofRecord>(
        join(cliRoot, runEntry, PROVIDER_LINEAR_WORKER_PROOF_FILENAME)
      );
      const proofRecord = (proof ?? null) as (ProviderLinearWorkerProofRecord & Record<string, unknown>) | null;
      const manifestStartedAt = readStringValue(manifest, 'started_at');
      const workerHostProofAttemptStartedAt = readStringValue(proofRecord ?? {}, 'attempt_started_at');
      const workerHostProofUpdatedAt = readStringValue(proofRecord ?? {}, 'updated_at');
      const hasStaleInProgressProof = hasStaleProviderLinearWorkerInProgressProof(
        manifest,
        proof,
        isProcessAlive
      );
      const hasFreshWorkerHostContext = Boolean(
        proofRecord
        && isProviderLinearWorkerProofFreshForStage(
          proofRecord,
          manifestStartedAt
        )
      );
      const hasDeadLocalInProgressProof =
        hasFreshWorkerHostContext &&
        hasDeadLocalProviderLinearWorkerInProgressProof(
          proof,
          isProcessAlive
        );
      discovered.push({
        provider: issueProvider,
        issueId,
        taskId: readStringValue(manifest, 'task_id') ?? taskEntry,
        runId: readStringValue(manifest, 'run_id') ?? runEntry,
        manifestPath,
        manifest,
        pipelineId,
        status: resolveProviderIssueRunStatus(manifest, proof, isProcessAlive),
        hasDeadLocalInProgressProof,
        proofTerminalStatus: resolveAuthoritativeProviderLinearWorkerTerminalStatus(
          manifest,
          proof
        ),
        hasStaleInProgressProof,
        summary: resolveProviderIssueRunSummary(manifest, proof),
        failureDiagnosis: resolveProviderIssueRunFailureDiagnosis(manifest, proof),
        issueUpdatedAt: readStringValue(manifest, 'issue_updated_at'),
        startedAt: manifestStartedAt,
        updatedAt: resolveProviderIssueRunUpdatedAt(manifest, proof),
        hasFreshWorkerHostContext,
        workerHostProofAttemptStartedAt,
        workerHostProofUpdatedAt,
        workerHost: hasFreshWorkerHostContext
          ? normalizeProviderWorkerHostName(proof?.worker_host)
          : null,
        residentSessionSeed: resolveProviderResidentSessionSeed(
          manifest,
          proof,
          readStringValue(manifest, 'run_id') ?? runEntry
        )
      });
    }
  }

  return {
    discoveredRuns: discovered.sort((left, right) => {
      return Date.parse(right.updatedAt ?? '') - Date.parse(left.updatedAt ?? '');
    }),
    unreadableAdmissionOccupancy
  };
}

async function readUnreadableProviderAdmissionOccupancyRecord(input: {
  manifestPath: string;
  isProcessAlive: (pid: number) => boolean;
}): Promise<ProviderUnreadableManifestAdmissionOccupancyRecord | null> {
  const proof = await readBestEffortJsonFile<ProviderLinearWorkerProofRecord>(
    join(dirname(input.manifestPath), PROVIDER_LINEAR_WORKER_PROOF_FILENAME)
  );
  return resolveUnreadableProviderAdmissionOccupancyRecord({
    manifestPath: input.manifestPath,
    proof,
    isProcessAlive: input.isProcessAlive
  });
}

function resolveUnreadableProviderAdmissionOccupancyRecord(input: {
  manifestPath: string;
  proof: ProviderLinearWorkerProofRecord | null;
  isProcessAlive: (pid: number) => boolean;
}): ProviderUnreadableManifestAdmissionOccupancyRecord | null {
  const proofRecord = (input.proof ?? null) as (ProviderLinearWorkerProofRecord & Record<string, unknown>) | null;
  if (!proofRecord) {
    return null;
  }
  const issueId = readStringValue(proofRecord, 'issue_id');
  const workerHost = normalizeProviderWorkerHostName(proofRecord.worker_host);
  if (!issueId) {
    return null;
  }
  if (!isProviderLinearWorkerInProgressProofLive(proofRecord, null, input.isProcessAlive)) {
    return null;
  }
  const proofHeartbeatTimestamp = resolveUnreadableProviderAdmissionOccupancyProofTimestampMs(proofRecord);
  if (!Number.isFinite(proofHeartbeatTimestamp)) {
    return null;
  }
  if (Date.now() - proofHeartbeatTimestamp > PROVIDER_UNREADABLE_MANIFEST_LIVE_PROOF_TTL_MS) {
    return null;
  }
  return {
    provider: 'linear',
    issueId,
    manifestPath: input.manifestPath,
    workerHost
  };
}

function resolveUnreadableProviderAdmissionOccupancyProofTimestampMs(
  proof: Record<string, unknown>
): number {
  const proofUpdatedAtMs = readTimestampMs(proof, 'updated_at');
  if (Number.isFinite(proofUpdatedAtMs)) {
    return proofUpdatedAtMs;
  }
  return readTimestampMs(proof, 'attempt_started_at');
}

function isProviderLinearWorkerInProgressProofLive(
  proof: Record<string, unknown>,
  runStartedAt: string | null,
  isProcessAlive: (pid: number) => boolean
): boolean {
  const ownerStatus = readStringValue(proof, 'owner_status');
  if (ownerStatus && ownerStatus !== 'in_progress') {
    return false;
  }
  const ownerPhase = readStringValue(proof, 'owner_phase');
  if (ownerPhase === 'ended') {
    return false;
  }
  if (hasDeadLocalProviderLinearWorkerInProgressProof(proof, isProcessAlive)) {
    return false;
  }
  if (!runStartedAt) {
    return true;
  }
  return isProviderLinearWorkerProofFreshForStage(proof, runStartedAt);
}

function hasDeadLocalProviderLinearWorkerInProgressProof(
  proof: ProviderLinearWorkerProofRecord | Record<string, unknown> | null,
  isProcessAlive: (pid: number) => boolean
): boolean {
  if (!proof) {
    return false;
  }
  const proofRecord = proof as Record<string, unknown>;
  const ownerStatus = readStringValue(proofRecord, 'owner_status');
  if (ownerStatus && ownerStatus !== 'in_progress') {
    return false;
  }
  const ownerPhase = readStringValue(proofRecord, 'owner_phase');
  if (ownerPhase === 'ended') {
    return false;
  }
  const workerHost = normalizeProviderWorkerHostName(proofRecord.worker_host);
  const pid = readIntegerValue(proofRecord, 'pid');
  return !workerHost && pid !== null && pid > 0 && !isProcessAlive(pid);
}

function resolveProviderIssueRunStatus(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null,
  isProcessAlive: (pid: number) => boolean
): string | null {
  const manifestStatus = readStringValue(manifest, 'status');
  if (
    manifestStatus === 'in_progress' &&
    hasStaleProviderLinearWorkerInProgressProof(manifest, proof, isProcessAlive)
  ) {
    return null;
  }
  const proofTerminalStatus = resolveAuthoritativeProviderLinearWorkerTerminalStatus(
    manifest,
    proof
  );
  return proofTerminalStatus ?? manifestStatus;
}

function hasStaleProviderLinearWorkerInProgressProof(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null,
  isProcessAlive: (pid: number) => boolean
): boolean {
  if (!proof) {
    return false;
  }
  const proofRecord = proof as Record<string, unknown>;
  const ownerStatus = readStringValue(proofRecord, 'owner_status');
  if (ownerStatus && ownerStatus !== 'in_progress') {
    return false;
  }
  const ownerPhase = readStringValue(proofRecord, 'owner_phase');
  if (ownerPhase === 'ended') {
    return false;
  }
  const runStartedAt = readStringValue(manifest, 'started_at');
  return !isProviderLinearWorkerInProgressProofLive(
    proofRecord,
    runStartedAt,
    isProcessAlive
  );
}

function resolveAuthoritativeProviderLinearWorkerTerminalStatus(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null
): 'failed' | 'succeeded' | null {
  return shouldUseProviderLinearWorkerTerminalProofForStatusOverride(manifest, proof)
    ? resolveProviderLinearWorkerTerminalStatus(proof)
    : null;
}

function resolveProviderIssueRunSummary(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null
): string | null {
  const manifestSummary = stripNonApplicableGuardrailSummaryLines(
    manifest,
    readStringValue(manifest, 'summary')
  );
  const manifestStatus = readStringValue(manifest, 'status');
  const proofIsAuthoritative = shouldUseProviderLinearWorkerTerminalProofForSummary(manifest, proof);
  const proofTerminalStatus = proofIsAuthoritative
    ? resolveProviderLinearWorkerTerminalStatus(proof)
    : null;
  const proofTerminalReason = proofIsAuthoritative
    ? resolveProviderLinearWorkerTerminalReason(proof)
    : null;
  if (
    proofTerminalReason &&
    proofTerminalStatus &&
    manifestStatus !== proofTerminalStatus
  ) {
    return proofTerminalReason;
  }
  return manifestSummary ?? proofTerminalReason;
}

function resolveProviderIssueRunFailureDiagnosis(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null
): ProviderIssueRunFailureDiagnosisRecord | null {
  if (!shouldUseProviderLinearWorkerTerminalProofForSummary(manifest, proof)) {
    return null;
  }
  const proofRecord = (proof ?? {}) as Record<string, unknown>;
  const failureDiagnosisRecord = readRecordValue(proofRecord, 'failure_diagnosis');
  if (!failureDiagnosisRecord) {
    return null;
  }
  return {
    diagnosticCategory: readStringValue(
      failureDiagnosisRecord,
      'diagnostic_category',
      'diagnosticCategory'
    ),
    signal: readStringValue(failureDiagnosisRecord, 'signal'),
    guidance: readStringValue(failureDiagnosisRecord, 'guidance')
  };
}

function resolveProviderIssueRunUpdatedAt(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null
): string | null {
  const manifestUpdatedAt = readStringValue(manifest, 'updated_at', 'started_at');
  const proofIsAuthoritative = shouldUseProviderLinearWorkerTerminalProofForSummary(manifest, proof);
  const proofUpdatedAt = proofIsAuthoritative
    ? readStringValue((proof ?? {}) as Record<string, unknown>, 'updated_at')
    : null;
  if (!proofUpdatedAt) {
    return manifestUpdatedAt;
  }
  const proofTimestamp = Date.parse(proofUpdatedAt);
  if (!Number.isFinite(proofTimestamp)) {
    return manifestUpdatedAt;
  }
  if (!manifestUpdatedAt) {
    return proofUpdatedAt;
  }
  const manifestTimestamp = Date.parse(manifestUpdatedAt);
  if (!Number.isFinite(manifestTimestamp)) {
    return proofUpdatedAt;
  }
  return proofTimestamp > manifestTimestamp ? proofUpdatedAt : manifestUpdatedAt;
}

function resolveProviderLinearWorkerTerminalStatus(
  proof: ProviderLinearWorkerProofRecord | null
): 'failed' | 'succeeded' | null {
  if (!proof) {
    return null;
  }
  const proofRecord = proof as Record<string, unknown>;
  if (readStringValue(proofRecord, 'owner_phase') !== 'ended') {
    return null;
  }
  const ownerStatus = readStringValue(proofRecord, 'owner_status');
  return ownerStatus === 'failed' || ownerStatus === 'succeeded' ? ownerStatus : null;
}

function shouldUseProviderLinearWorkerTerminalProof(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null
): boolean {
  if (!resolveProviderLinearWorkerTerminalStatus(proof)) {
    return false;
  }
  const proofRecord = (proof ?? {}) as Record<string, unknown>;
  const runStartedAt = readStringValue(manifest, 'started_at');
  if (runStartedAt && !isProviderLinearWorkerProofFreshForStage(proofRecord, runStartedAt)) {
    return false;
  }
  const proofUpdatedAt = readStringValue(proofRecord, 'updated_at');
  if (!proofUpdatedAt) {
    return false;
  }
  const manifestUpdatedAt = readStringValue(manifest, 'updated_at', 'started_at');
  if (!manifestUpdatedAt) {
    return true;
  }
  const proofTimestamp = Date.parse(proofUpdatedAt);
  const manifestTimestamp = Date.parse(manifestUpdatedAt);
  if (Number.isNaN(proofTimestamp)) {
    return false;
  }
  if (Number.isNaN(manifestTimestamp)) {
    return true;
  }
  return proofTimestamp >= manifestTimestamp;
}

function shouldUseProviderLinearWorkerTerminalProofForResidentSeed(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null
): boolean {
  const proofTerminalStatus = resolveProviderLinearWorkerTerminalStatus(proof);
  if (proofTerminalStatus !== 'succeeded') {
    return false;
  }
  const proofRecord = (proof ?? {}) as Record<string, unknown>;
  const runStartedAt = readStringValue(manifest, 'started_at');
  if (runStartedAt && !isProviderLinearWorkerProofFreshForStage(proofRecord, runStartedAt)) {
    return false;
  }
  const proofUpdatedAt = readStringValue(proofRecord, 'updated_at');
  if (!proofUpdatedAt || Number.isNaN(Date.parse(proofUpdatedAt))) {
    return false;
  }
  const manifestStatus = readStringValue(manifest, 'status');
  return !manifestStatus || manifestStatus === 'in_progress' || manifestStatus === 'succeeded';
}

function shouldUseProviderLinearWorkerTerminalProofForStatusOverride(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null
): boolean {
  const manifestStatus = readStringValue(manifest, 'status');
  const proofTerminalStatus = resolveProviderLinearWorkerTerminalStatus(proof);
  if (!proofTerminalStatus) {
    return false;
  }
  if (!manifestStatus || manifestStatus === 'in_progress' || manifestStatus === proofTerminalStatus) {
    return shouldUseProviderLinearWorkerTerminalProof(manifest, proof);
  }
  return false;
}

function shouldUseProviderLinearWorkerTerminalProofForSummary(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null
): boolean {
  const proofTerminalStatus = resolveProviderLinearWorkerTerminalStatus(proof);
  if (!proofTerminalStatus) {
    return false;
  }
  const manifestStatus = readStringValue(manifest, 'status');
  if (
    manifestStatus &&
    manifestStatus !== 'in_progress' &&
    manifestStatus !== proofTerminalStatus
  ) {
    return false;
  }
  return shouldUseProviderLinearWorkerTerminalProof(manifest, proof);
}

function resolveProviderLinearWorkerTerminalReason(
  proof: ProviderLinearWorkerProofRecord | null
): string | null {
  if (!resolveProviderLinearWorkerTerminalStatus(proof)) {
    return null;
  }
  return readStringValue(proof as Record<string, unknown>, 'end_reason');
}

function resolveProviderResidentSessionSeed(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null,
  runId: string
): ProviderLinearResidentSessionSeed | null {
  const proofRecord = (proof ?? {}) as Record<string, unknown>;
  if (!shouldUseProviderLinearWorkerTerminalProofForResidentSeed(manifest, proof)) {
    return null;
  }
  const endReason = readStringValue(proofRecord, 'end_reason');
  const threadId = readStringValue(proofRecord, 'thread_id');
  const updatedAt = readStringValue(proofRecord, 'updated_at');
  if (
    !endReason ||
    !PROVIDER_LINEAR_RESIDENT_SESSION_CONTINUITY_END_REASONS.has(endReason) ||
    !threadId ||
    !updatedAt
  ) {
    return null;
  }
  const residentSessionRecord = readRecordValue(proofRecord, 'resident_session');
  const logicalTurnCount =
    readIntegerValue(residentSessionRecord, 'logical_turn_count') ??
    readIntegerValue(proofRecord, 'turn_count');
  if (logicalTurnCount === null) {
    return null;
  }
  const priorRestartCount = readIntegerValue(residentSessionRecord, 'restart_count') ?? 0;
  return {
    source_run_id: runId,
    source_updated_at: updatedAt,
    source_end_reason: endReason,
    source_thread_id: threadId,
    logical_turn_count: logicalTurnCount,
    restart_count: priorRestartCount + 1
  };
}

function filterProviderIssueRunsForStartPipeline(
  runs: ProviderIssueRunRecord[],
  startPipelineId: string
): ProviderIssueRunRecord[] {
  return runs.filter((run) => doesProviderIssueRunMatchStartPipeline(run, startPipelineId));
}

function doesProviderIssueRunMatchStartPipeline(
  run: ProviderIssueRunRecord,
  startPipelineId: string
): boolean {
  if (run.pipelineId) {
    return run.pipelineId === startPipelineId;
  }
  // Legacy/manual manifests may not record pipeline_id. Keep them attachable so
  // pipeline-aware rehydration does not regress older provider runs.
  return true;
}

async function readDirectoryNames(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (isMissingPathError(error)) {
      return [];
    }
    throw error;
  }
}

function groupProviderIssueRuns(records: ProviderIssueRunRecord[]): Map<string, ProviderIssueRunRecord[]> {
  const grouped = new Map<string, ProviderIssueRunRecord[]>();
  for (const record of records) {
    const key = buildProviderIssueKey(record.provider, record.issueId);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(record);
      continue;
    }
    grouped.set(key, [record]);
  }
  return grouped;
}

function buildActiveRunRetryFields(
  input: Pick<ProviderIntakeClaimRecord, 'retry_attempt' | 'retry_error'>
): Pick<
  ProviderIntakeClaimRecord,
  'retry_queued' | 'retry_attempt' | 'retry_due_at' | 'retry_error'
> {
  const retryAttempt =
    typeof input.retry_attempt === 'number' && input.retry_attempt > 0
      ? input.retry_attempt
      : null;
  if (retryAttempt === null) {
    return clearProviderRetryFields();
  }
  return {
    retry_queued: false,
    retry_attempt: retryAttempt,
    retry_due_at: null,
    retry_error: input.retry_error ?? null
  };
}

function buildProviderRetryLaunchFields(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'retry_queued' | 'retry_attempt' | 'retry_error'>;
  previousRun: ProviderIssueRunRecord | null;
  preserveCurrentAttempt?: boolean;
  seedFromPreviousRun?: boolean;
}): Pick<
  ProviderIntakeClaimRecord,
  'retry_queued' | 'retry_attempt' | 'retry_due_at' | 'retry_error'
> {
  // A launched run only carries retry metadata when it is consuming an existing
  // queued retry. Historical successful runs alone must not fabricate retry attempts.
  const retryAttempt = input.preserveCurrentAttempt
    ? resolveCurrentProviderRetryAttempt(input.claim, input.previousRun)
    : input.seedFromPreviousRun === true
      ? resolveNextProviderRetryAttempt(input.claim, input.previousRun)
      : null;
  if (retryAttempt === null) {
    return clearProviderRetryFields();
  }
  return {
    retry_queued: false,
    retry_attempt: retryAttempt,
    retry_due_at: null,
    retry_error: input.claim.retry_error ?? null
  };
}

function buildQueuedProviderRetryFields(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'retry_queued' | 'retry_attempt' | 'retry_due_at'>;
  previousRun: ProviderIssueRunRecord | null;
  error: string | null;
  preserveCurrentAttempt?: boolean;
  preserveExistingDueAt?: boolean;
  seedInitialAttemptWithoutPreviousRun?: boolean;
  delayType: ProviderRetryDelayType;
}): Pick<
  ProviderIntakeClaimRecord,
  'retry_queued' | 'retry_attempt' | 'retry_due_at' | 'retry_error'
> {
  const retryAttempt = input.preserveCurrentAttempt
    ? resolveCurrentProviderRetryAttempt(input.claim, input.previousRun)
    : resolveNextProviderRetryAttempt(input.claim, input.previousRun);
  if (retryAttempt === null) {
    if (input.seedInitialAttemptWithoutPreviousRun === true) {
      return {
        retry_queued: true,
        retry_attempt: 1,
        retry_due_at:
          input.preserveExistingDueAt && isValidProviderRetryTimestamp(input.claim.retry_due_at)
            ? input.claim.retry_due_at
            : buildProviderRetryDueAt(input.delayType, 1),
        retry_error: input.error
      };
    }
    return preserveQueuedProviderRetryWithoutAttempt(input);
  }
  return {
    retry_queued: true,
    retry_attempt: retryAttempt,
    retry_due_at:
      input.preserveExistingDueAt && isValidProviderRetryTimestamp(input.claim.retry_due_at)
        ? input.claim.retry_due_at
        : buildProviderRetryDueAt(input.delayType, retryAttempt),
    retry_error: input.error
  };
}

function preserveQueuedProviderRetryWithoutAttempt(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'retry_queued' | 'retry_attempt' | 'retry_due_at'>;
  previousRun: ProviderIssueRunRecord | null;
  error: string | null;
  preserveCurrentAttempt?: boolean;
  preserveExistingDueAt?: boolean;
  delayType: ProviderRetryDelayType;
}): Pick<
  ProviderIntakeClaimRecord,
  'retry_queued' | 'retry_attempt' | 'retry_due_at' | 'retry_error'
> {
  // Explicit queued claims can exist before any retry run materializes. Keep the
  // queued state and schedule alive, but only when we are preserving an existing
  // queued retry rather than inventing retry metadata for unrelated history.
  if (input.preserveCurrentAttempt !== true || input.claim.retry_queued !== true || input.previousRun) {
    return clearProviderRetryFields();
  }
  return {
    retry_queued: true,
    retry_attempt: null,
    retry_due_at:
      input.preserveExistingDueAt && isValidProviderRetryTimestamp(input.claim.retry_due_at)
        ? input.claim.retry_due_at
        : buildProviderRetryDueAt(input.delayType, 1),
    retry_error: input.error
  };
}

function clearProviderRetryFields(): Pick<
  ProviderIntakeClaimRecord,
  'retry_queued' | 'retry_attempt' | 'retry_due_at' | 'retry_error'
> {
  return {
    retry_queued: null,
    retry_attempt: null,
    retry_due_at: null,
    retry_error: null
  };
}

function resolveCurrentProviderRetryAttempt(
  claim: Pick<ProviderIntakeClaimRecord, 'retry_queued' | 'retry_attempt'>,
  previousRun: ProviderIssueRunRecord | null
): number | null {
  if (typeof claim.retry_attempt === 'number' && claim.retry_attempt > 0) {
    return claim.retry_attempt;
  }
  return previousRun ? 1 : null;
}

function resolveNextProviderRetryAttempt(
  claim: Pick<ProviderIntakeClaimRecord, 'retry_queued' | 'retry_attempt'>,
  previousRun: ProviderIssueRunRecord | null
): number | null {
  if (typeof claim.retry_attempt === 'number' && claim.retry_attempt > 0) {
    return claim.retry_attempt + 1;
  }
  return previousRun ? 1 : null;
}

function resolveProviderRetryErrorFromRun(run: ProviderIssueRunRecord | null): string | null {
  if (run?.status !== 'failed') {
    return null;
  }
  return summarizeProviderRetryFailureDiagnosis(run.failureDiagnosis) ?? run.summary ?? null;
}

function summarizeProviderRetryFailureDiagnosis(
  failureDiagnosis: ProviderIssueRunFailureDiagnosisRecord | null
): string | null {
  if (failureDiagnosis?.diagnosticCategory !== 'provider_stdin_bootstrap') {
    return null;
  }
  const signal = failureDiagnosis.signal?.trim();
  return signal ? `provider_stdin_bootstrap: ${signal}` : 'provider_stdin_bootstrap';
}

function resolveProviderReviewPromotionClaimReason(
  reviewPromotion: ProviderReviewHandoffPromotionRecord
): string {
  switch (reviewPromotion.status) {
    case 'promoted':
      return 'provider_issue_review_promotion_promoted';
    case 'action_required':
      return 'provider_issue_review_promotion_action_required';
    case 'transition_failed':
      return 'provider_issue_review_promotion_transition_failed';
    case 'promotion_failed':
      return 'provider_issue_review_promotion_failed';
    case 'watching':
    default:
      return 'provider_issue_review_promotion_watching';
  }
}

function resolveProviderReviewPromotionClaimState(
  reviewPromotion: ProviderReviewHandoffPromotionRecord
): ProviderIntakeClaimState {
  switch (reviewPromotion.status) {
    case 'action_required':
    case 'transition_failed':
    case 'promotion_failed':
      return 'handoff_failed';
    case 'watching':
    case 'promoted':
    default:
      return 'completed';
  }
}

function isProviderReviewPromotionWatchingClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'reason' | 'review_promotion'>
): boolean {
  return (
    claim.reason === 'provider_issue_review_promotion_watching' &&
    claim.review_promotion?.status === 'watching'
  );
}

function resolveProviderMergeCloseoutClaimReason(
  mergeCloseout: ProviderMergeCloseoutRecord
): string {
  switch (mergeCloseout.status) {
    case 'merged':
      return 'provider_issue_merge_closeout_merged';
    case 'action_required':
      return 'provider_issue_merge_closeout_action_required';
    case 'transition_failed':
      return 'provider_issue_merge_closeout_transition_failed';
    case 'merge_failed':
      return 'provider_issue_merge_closeout_failed';
    case 'watching':
    default:
      return 'provider_issue_merge_closeout_watching';
  }
}

function isProviderMergeCloseoutWatchingClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'reason' | 'merge_closeout'>
): boolean {
  return claim.reason === 'provider_issue_merge_closeout_watching' && claim.merge_closeout?.status === 'watching';
}

function resolveProviderIssuePollFailClosedReason(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'review_promotion' | 'merge_closeout'
  >
): string | null {
  const workflowState = classifyProviderLinearWorkflowState({
    state: claim.issue_state,
    state_type: claim.issue_state_type
  });
  if (isCachedPendingRevalidationClaim(claim)) {
    return 'provider_issue_poll_cached_revalidation_pending';
  }
  if (claim.state === 'accepted' && !workflowState.isActive) {
    return 'provider_issue_poll_cached_non_runnable';
  }
  if (
    (claim.state === 'completed' || claim.state === 'handoff_failed') &&
    isProviderReviewPromotionWatchingClaim(claim)
  ) {
    return 'provider_issue_poll_cached_review_wait';
  }
  if (
    (claim.state === 'completed' || claim.state === 'handoff_failed') &&
    isProviderMergeCloseoutWatchingClaim(claim)
  ) {
    return 'provider_issue_poll_cached_merge_wait';
  }
  return null;
}

function resolveReleasedProviderIssuePollFailClosedReason(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'merge_closeout'
  >
): string | null {
  if (claim.state !== 'released' || isProviderIssueReleasedPendingReopen(claim.reason ?? null)) {
    return null;
  }
  if (claim.reason === 'provider_issue_released:not_active') {
    if (canRecheckPlainReleasedNotActiveClaim(claim)) {
      return null;
    }
    return 'provider_issue_poll_cached_released_not_active';
  }
  if (claim.reason === 'provider_issue_released:not_mutable') {
    return 'provider_issue_poll_cached_released_not_mutable';
  }
  return null;
}

function shouldUseCachedReleasedTerminalHistoricalClaimResolution(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'state'
    | 'reason'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_updated_at'
    | 'issue_archived_at'
    | 'issue_trashed'
    | 'issue_blocked_by'
    | 'run_id'
    | 'run_manifest_path'
    | 'retry_queued'
    | 'retry_attempt'
    | 'retry_due_at'
    | 'retry_error'
    | 'merge_closeout'
    | 'review_promotion'
  >;
  activeRun: ProviderIssueRunRecord | null;
  releaseRun: ProviderIssueRunRecord | null;
  latestRun: ProviderIssueRunRecord | null;
  refreshFromBlockerSnapshot: boolean;
}): boolean {
  if (
    input.claim.state !== 'released' ||
    input.claim.reason !== 'provider_issue_released:not_active'
  ) {
    return false;
  }
  if (!isTerminalProviderIntakeIssueState(input.claim)) {
    return false;
  }
  if (input.activeRun) {
    return false;
  }
  if (
    typeof input.claim.issue_updated_at !== 'string' ||
    input.claim.issue_updated_at.trim().length === 0 ||
    !Number.isFinite(Date.parse(input.claim.issue_updated_at))
  ) {
    return false;
  }
  const retainedRuns = [input.releaseRun, input.latestRun].filter(
    (run): run is ProviderIssueRunRecord => run !== null
  );
  if (retainedRuns.some((run) => shouldAttemptReleaseCancel(run))) {
    return false;
  }
  if (input.claim.merge_closeout || input.refreshFromBlockerSnapshot) {
    return false;
  }
  if (!canTreatReviewPromotionAsStaleForReleasedTerminalHistoricalClaim(input.claim)) {
    return false;
  }
  if (!Array.isArray(input.claim.issue_blocked_by)) {
    return false;
  }
  return (
    input.claim.retry_queued !== true &&
    (input.claim.retry_attempt ?? null) === null &&
    (input.claim.retry_due_at ?? null) === null &&
    (input.claim.retry_error ?? null) === null
  );
}

function shouldUseCachedReleasedBacklogNotActiveClaimResolution(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'state'
    | 'reason'
    | 'issue_state'
    | 'issue_state_type'
    | 'retry_queued'
    | 'retry_attempt'
    | 'retry_due_at'
    | 'retry_error'
    | 'merge_closeout'
    | 'review_promotion'
  >;
  activeRun: ProviderIssueRunRecord | null;
  releaseRun: ProviderIssueRunRecord | null;
  latestRun: ProviderIssueRunRecord | null;
}): boolean {
  if (!isReleasedBacklogNotActiveClaim(input.claim)) {
    return false;
  }
  if (input.activeRun) {
    return false;
  }
  const retainedRuns = [input.releaseRun, input.latestRun].filter(
    (run): run is ProviderIssueRunRecord => run !== null
  );
  if (retainedRuns.some((run) => shouldAttemptReleaseCancel(run))) {
    return false;
  }
  if (input.claim.merge_closeout || input.claim.review_promotion) {
    return false;
  }
  return (
    input.claim.retry_queued !== true &&
    (input.claim.retry_attempt ?? null) === null &&
    (input.claim.retry_due_at ?? null) === null &&
    (input.claim.retry_error ?? null) === null
  );
}

function shouldUseCachedReleasedMergedCloseoutNotActiveClaimResolution(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'state'
    | 'reason'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_updated_at'
    | 'retry_queued'
    | 'retry_attempt'
    | 'retry_due_at'
    | 'retry_error'
    | 'merge_closeout'
    | 'review_promotion'
  >;
  activeRun: ProviderIssueRunRecord | null;
  releaseRun: ProviderIssueRunRecord | null;
  latestRun: ProviderIssueRunRecord | null;
  refreshFromBlockerSnapshot: boolean;
}): boolean {
  if (
    input.claim.state !== 'released' ||
    input.claim.reason !== 'provider_issue_released:not_active'
  ) {
    return false;
  }
  if (input.activeRun || input.refreshFromBlockerSnapshot) {
    return false;
  }
  const workflowState = classifyProviderLinearWorkflowState({
    state: input.claim.issue_state,
    state_type: input.claim.issue_state_type
  });
  if (workflowState.isActive || workflowState.isHandoff) {
    return false;
  }
  const mergeCloseout = input.claim.merge_closeout ?? null;
  if (
    !mergeCloseout ||
    mergeCloseout.status === 'watching' ||
    normalizeProviderLinearWorkflowState(mergeCloseout.issue_state) !== 'merging' ||
    !mergeCloseoutSnapshotShowsMerged(mergeCloseout)
  ) {
    return false;
  }
  const retainedRuns = [input.releaseRun, input.latestRun].filter(
    (run): run is ProviderIssueRunRecord => run !== null
  );
  if (retainedRuns.some((run) => shouldAttemptReleaseCancel(run))) {
    return false;
  }
  if (!canTreatReviewPromotionAsStaleForReleasedTerminalHistoricalClaim(input.claim)) {
    return false;
  }
  return (
    input.claim.retry_queued !== true &&
    (input.claim.retry_attempt ?? null) === null &&
    (input.claim.retry_due_at ?? null) === null &&
    (input.claim.retry_error ?? null) === null
  );
}

function isReleasedBacklogNotActiveClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type'
  >
): boolean {
  if (claim.state !== 'released' || claim.reason !== 'provider_issue_released:not_active') {
    return false;
  }
  const workflowState = classifyProviderLinearWorkflowState({
    state: claim.issue_state,
    state_type: claim.issue_state_type
  });
  return (
    workflowState.normalizedState === 'backlog' ||
    workflowState.normalizedStateType === 'backlog'
  );
}

function resolveBacklogNotActiveDirectIssueByIdPassiveVerificationVerifiedAtMsForCurrentSnapshot(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'passive_release' | 'issue_state' | 'issue_state_type' | 'issue_updated_at'
  >
): number | null {
  const verification = claim.passive_release ?? null;
  if (
    !verification ||
    verification.reason !== 'backlog_not_active_direct_issue_by_id' ||
    verification.source !== 'direct_issue_by_id' ||
    typeof verification.verified_at !== 'string' ||
    verification.verified_at.trim().length === 0 ||
    verification.issue_state !== claim.issue_state ||
    verification.issue_state_type !== claim.issue_state_type ||
    verification.issue_updated_at !== claim.issue_updated_at
  ) {
    return null;
  }
  const verifiedAtMs = Date.parse(verification.verified_at);
  return Number.isFinite(verifiedAtMs) ? verifiedAtMs : null;
}

function hasBacklogNotActiveDirectIssueByIdPassiveVerificationForCurrentSnapshot(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'passive_release' | 'issue_state' | 'issue_state_type' | 'issue_updated_at'
  >
): boolean {
  return (
    resolveBacklogNotActiveDirectIssueByIdPassiveVerificationVerifiedAtMsForCurrentSnapshot(
      claim
    ) !== null
  );
}

function isBacklogNotActiveDirectIssueByIdPassiveVerificationRevalidationDueForCurrentSnapshot(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'passive_release' | 'issue_state' | 'issue_state_type' | 'issue_updated_at'
  >,
  observedAtMs = Date.now()
): boolean {
  const verifiedAtMs =
    resolveBacklogNotActiveDirectIssueByIdPassiveVerificationVerifiedAtMsForCurrentSnapshot(
      claim
    );
  return (
    verifiedAtMs !== null &&
    observedAtMs >= verifiedAtMs &&
    observedAtMs - verifiedAtMs >= PROVIDER_BACKLOG_RELEASE_PASSIVE_PROOF_REVALIDATION_MS
  );
}

function shouldKeepCurrentPollReleasedTerminalHistoricalClaimPassive(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'issue_updated_at'>;
  trackedIssue: Pick<
    LiveLinearTrackedIssue,
    | 'state'
    | 'state_type'
    | 'updated_at'
    | 'archived_at'
    | 'trashed'
    | 'viewer_id'
    | 'assignee_id'
    | 'blocked_by'
  > | null;
  canUseCachedReleasedTerminalHistoricalClaim: boolean;
}): boolean {
  if (!input.canUseCachedReleasedTerminalHistoricalClaim || !input.trackedIssue) {
    return false;
  }
  const workflowState = classifyProviderLinearWorkflowState(input.trackedIssue);
  if (!workflowState.isTerminal) {
    return false;
  }
  const eligibility = assessProviderTrackedIssueEligibility(input.trackedIssue, {
    hasExistingClaim: true
  });
  if (
    eligibility.eligible ||
    eligibility.releaseReason !== 'provider_issue_released:not_active'
  ) {
    return false;
  }
  const freshness = compareTrackedIssueUpdatedAt({
    existingIssueUpdatedAt: input.claim.issue_updated_at,
    nextIssueUpdatedAt: input.trackedIssue.updated_at
  });
  return freshness === 'equal' || freshness === 'newer';
}

function canTreatReviewPromotionAsStaleForReleasedTerminalHistoricalClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'issue_updated_at' | 'review_promotion'>
): boolean {
  const reviewPromotion = claim.review_promotion ?? null;
  if (!reviewPromotion) {
    return true;
  }
  if (reviewPromotion.status !== 'promoted') {
    return false;
  }
  return compareTrackedIssueUpdatedAt({
    existingIssueUpdatedAt: reviewPromotion.issue_updated_at ?? null,
    nextIssueUpdatedAt: claim.issue_updated_at
  }) === 'newer';
}

function shouldProviderClaimDisqualifyAllReleasedSuppressor(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'review_promotion' | 'merge_closeout'
  >
): boolean {
  if (claim.state === 'ignored') {
    return false;
  }
  if (
    claim.state === 'completed' &&
    !isProviderReviewPromotionWatchingClaim(claim) &&
    !isProviderMergeCloseoutWatchingClaim(claim)
  ) {
    return false;
  }
  const workflowState = classifyProviderLinearWorkflowState({
    state: claim.issue_state,
    state_type: claim.issue_state_type
  });
  if (
    claim.state === 'handoff_failed' &&
    !workflowState.isActive &&
    !isProviderReviewPromotionWatchingClaim(claim) &&
    !isProviderMergeCloseoutWatchingClaim(claim)
  ) {
    return false;
  }
  return true;
}

function isCachedPendingRevalidationClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason'>
): boolean {
  return (
    claim.state === 'accepted' &&
    claim.reason === 'provider_issue_rehydration_pending_revalidation'
  );
}

function shouldReleaseCachedPendingRevalidationHandoffClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason'>,
  eligibility: ProviderTrackedIssueEligibility
): boolean {
  return (
    isCachedPendingRevalidationClaim(claim) &&
    eligibility.eligible &&
    eligibility.claimReason === 'provider_issue_handoff_owned'
  );
}

function isProviderIssuePollFailClosedReason(reason: string | null | undefined): boolean {
  return typeof reason === 'string' && reason.startsWith('provider_issue_poll_cached_');
}

function isProviderStaleSupervisedSourceReason(reason: string | null | undefined): boolean {
  return reason === PROVIDER_STALE_SUPERVISED_SOURCE_REASON;
}

function shouldSuppressFreshDiscoveryForPollFailClosedReason(
  reason: string | null | undefined
): boolean {
  return (
    isProviderIssuePollFailClosedReason(reason) &&
    !isReleasedProviderIssuePollFailClosedReason(reason)
  );
}

function isReleasedProviderIssuePollFailClosedReason(
  reason: string | null | undefined
): boolean {
  return typeof reason === 'string' && reason.startsWith('provider_issue_poll_cached_released_');
}

function canRecheckPlainReleasedNotActiveClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'merge_closeout'
  >
): boolean {
  if (claim.state !== 'released' || claim.reason !== 'provider_issue_released:not_active') {
    return false;
  }
  const workflowState = classifyProviderLinearWorkflowState({
    state: claim.issue_state,
    state_type: claim.issue_state_type
  });
  const hasCachedWorkflowState =
    workflowState.normalizedState !== null || workflowState.normalizedStateType !== null;
  // Terminal, review-handoff, and already-active cached rows stay cached; cached
  // non-active rows such as Blocked can be stale after the issue returns to Ready.
  return (
    hasCachedWorkflowState &&
    !workflowState.isTerminal &&
    !workflowState.isHandoff &&
    !workflowState.isActive
  );
}

function canProbeFreshDiscoveryForReleasedNotActiveTerminalMergeCloseoutClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'merge_closeout'
  >
): boolean {
  if (claim.state !== 'released' || claim.reason !== 'provider_issue_released:not_active') {
    return false;
  }
  if (isSupersededDoneTransitionFailedMergeCloseoutClaim({ claim })) {
    return true;
  }
  if (isSupersededTerminalMergeCloseoutClaim({ claim })) {
    return true;
  }
  const mergeCloseout = claim.merge_closeout ?? null;
  if (!mergeCloseout || !mergeCloseoutSnapshotShowsMerged(mergeCloseout)) {
    return false;
  }
  return (
    classifyProviderLinearWorkflowState({
      state: claim.issue_state,
      state_type: claim.issue_state_type
    }).isTerminal &&
    classifyProviderLinearWorkflowState({
      state: mergeCloseout.issue_state,
      state_type: mergeCloseout.issue_state_type
    }).isTerminal
  );
}

function shouldExcludeReleasedTerminalMergeCloseoutFreshDiscoveryProbe(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'merge_closeout'
  >
): boolean {
  return !canProbeFreshDiscoveryForReleasedNotActiveTerminalMergeCloseoutClaim(claim);
}

function resolveProviderMergeCloseoutClaimState(
  mergeCloseout: ProviderMergeCloseoutRecord
): ProviderIntakeClaimState {
  switch (mergeCloseout.status) {
    case 'action_required':
    case 'merge_failed':
    case 'transition_failed':
      return 'handoff_failed';
    case 'watching':
    case 'merged':
    default:
      return 'completed';
  }
}

function isTerminalProviderMergeCloseoutClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason' | 'merge_closeout'>
): boolean {
  const mergeCloseout = claim.merge_closeout;
  if (!mergeCloseout || mergeCloseout.status === 'watching') {
    return false;
  }
  return (
    claim.state === resolveProviderMergeCloseoutClaimState(mergeCloseout) &&
    claim.reason === resolveProviderMergeCloseoutClaimReason(mergeCloseout)
  );
}

function buildProviderCompletedRunRehydrateState(input: {
  claim: ProviderIntakeClaimRecord;
  run: ProviderIssueRunRecord;
  preserveCurrentAttempt?: boolean;
  preserveExistingDueAt?: boolean;
  queueContinuationRetry?: boolean;
}): Pick<
  ProviderIntakeClaimRecord,
  | 'task_id'
  | 'state'
  | 'reason'
  | 'run_id'
  | 'run_manifest_path'
  | 'retry_queued'
  | 'retry_attempt'
  | 'retry_due_at'
  | 'retry_error'
> {
  if (
    !input.claim.merge_closeout &&
    input.claim.review_promotion &&
    resolveProviderReviewPromotionClaimState(input.claim.review_promotion) === 'handoff_failed' &&
    !shouldSuppressActionRequiredReviewPromotionForActiveIssue(input.claim)
  ) {
    return {
      task_id: input.run.taskId,
      state: 'handoff_failed',
      reason: resolveProviderReviewPromotionClaimReason(input.claim.review_promotion),
      run_id: input.run.runId,
      run_manifest_path: input.run.manifestPath,
      ...clearProviderRetryFields()
    };
  }
  if (
    !input.claim.merge_closeout &&
    input.claim.review_promotion &&
    resolveProviderReviewPromotionClaimState(input.claim.review_promotion) === 'completed' &&
    normalizeProviderLinearWorkflowState(
      input.claim.review_promotion.issue_state ?? input.claim.issue_state
    ) === 'merging'
  ) {
    return {
      task_id: input.run.taskId,
      state: 'completed',
      reason: resolveProviderReviewPromotionClaimReason(input.claim.review_promotion),
      run_id: input.run.runId,
      run_manifest_path: input.run.manifestPath,
      ...clearProviderRetryFields()
    };
  }
  if (
    input.claim.merge_closeout &&
    resolveProviderMergeCloseoutClaimState(input.claim.merge_closeout) === 'handoff_failed' &&
    !isSupersededTerminalMergeCloseoutClaim({ claim: input.claim })
  ) {
    return {
      task_id: input.run.taskId,
      state: 'handoff_failed',
      reason: resolveProviderMergeCloseoutClaimReason(input.claim.merge_closeout),
      run_id: input.run.runId,
      run_manifest_path: input.run.manifestPath,
      ...clearProviderRetryFields()
    };
  }
  if (
    input.claim.merge_closeout &&
    resolveProviderMergeCloseoutClaimState(input.claim.merge_closeout) === 'completed' &&
    isSupersededTerminalMergeCloseoutClaim({ claim: input.claim })
  ) {
    return {
      task_id: input.run.taskId,
      state: 'completed',
      reason: resolveProviderMergeCloseoutClaimReason(input.claim.merge_closeout),
      run_id: input.run.runId,
      run_manifest_path: input.run.manifestPath,
      ...clearProviderRetryFields()
    };
  }

  const queuedRetryFields = input.queueContinuationRetry !== false
    ? buildQueuedProviderRetryFields({
        claim: input.claim,
        previousRun: input.run,
        error: null,
        preserveCurrentAttempt: input.preserveCurrentAttempt,
        preserveExistingDueAt: input.preserveExistingDueAt,
        delayType: 'continuation'
      })
    : clearProviderRetryFields();

  return {
    task_id: input.run.taskId,
    state: 'completed',
    reason: 'provider_issue_rehydrated_completed_run',
    run_id: input.run.runId,
    run_manifest_path: input.run.manifestPath,
    ...queuedRetryFields
  };
}

function shouldSuppressActionRequiredReviewPromotionForActiveIssue(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'review_promotion'
  >
): boolean {
  const reviewPromotion = claim.review_promotion ?? null;
  if (!reviewPromotion || reviewPromotion.status !== 'action_required') {
    return false;
  }
  if (
    !classifyProviderLinearWorkflowState({
      state: claim.issue_state,
      state_type: claim.issue_state_type
    }).isActive
  ) {
    return false;
  }
  const freshness = compareTrackedIssueUpdatedAt({
    existingIssueUpdatedAt: reviewPromotion.issue_updated_at ?? null,
    nextIssueUpdatedAt: claim.issue_updated_at ?? null
  });
  return freshness === 'equal' || freshness === 'newer';
}

type ProviderRetryDelayType = 'continuation' | 'failure';

function buildProviderRetryDueAt(delayType: ProviderRetryDelayType, attempt: number): string {
  return new Date(Date.now() + computeProviderRetryDelayMs(delayType, attempt)).toISOString();
}

function computeProviderRetryDelayMs(delayType: ProviderRetryDelayType, attempt: number): number {
  if (delayType === 'continuation') {
    return PROVIDER_CONTINUATION_RETRY_DELAY_MS;
  }
  const retryOrdinal = Math.max(attempt, 1);
  const maxDelayPower = Math.min(retryOrdinal - 1, 10);
  return Math.min(
    PROVIDER_FAILURE_RETRY_BASE_MS * (1 << maxDelayPower),
    PROVIDER_FAILURE_RETRY_MAX_BACKOFF_MS
  );
}

function isValidProviderRetryTimestamp(value: string | null | undefined): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  return Number.isFinite(Date.parse(value));
}

function hasProviderClaimTransitioned(
  claim: ProviderIntakeClaimRecord,
  next: (
    Pick<
      ProviderIntakeClaimRecord,
      | 'issue_identifier'
      | 'issue_title'
      | 'issue_state'
      | 'issue_state_type'
      | 'issue_updated_at'
      | 'issue_archived_at'
      | 'issue_trashed'
      | 'issue_viewer_id'
      | 'issue_viewer_auth_fingerprint'
      | 'issue_assignee_id'
      | 'issue_assignee_name'
      | 'issue_blocked_by'
      | 'state'
      | 'reason'
      | 'task_id'
      | 'run_id'
      | 'run_manifest_path'
      | 'worker_host'
      | 'retry_queued'
      | 'retry_attempt'
      | 'retry_due_at'
      | 'retry_error'
    > | (
      Pick<
        ProviderIntakeClaimRecord,
        | 'state'
        | 'reason'
        | 'task_id'
        | 'run_id'
        | 'run_manifest_path'
        | 'worker_host'
        | 'retry_queued'
        | 'retry_attempt'
        | 'retry_due_at'
        | 'retry_error'
      > &
        Partial<
          Pick<
            ProviderIntakeClaimRecord,
            | 'issue_identifier'
            | 'issue_title'
            | 'issue_state'
            | 'issue_state_type'
            | 'issue_updated_at'
            | 'issue_archived_at'
            | 'issue_trashed'
            | 'issue_viewer_id'
            | 'issue_viewer_auth_fingerprint'
            | 'issue_assignee_id'
            | 'issue_assignee_name'
            | 'issue_blocked_by'
            | 'worker_host'
          >
        >
    )
  ) & Partial<
    Pick<ProviderIntakeClaimRecord, 'launch_source' | 'launch_token' | 'review_promotion' | 'merge_closeout'>
  >
): boolean {
  return (
    (
      next.issue_identifier !== undefined &&
      claim.issue_identifier !== next.issue_identifier
    ) ||
    (
      next.issue_title !== undefined &&
      claim.issue_title !== next.issue_title
    ) ||
    (
      next.issue_state !== undefined &&
      claim.issue_state !== next.issue_state
    ) ||
    (
      next.issue_state_type !== undefined &&
      claim.issue_state_type !== next.issue_state_type
    ) ||
    (
      next.issue_updated_at !== undefined &&
      claim.issue_updated_at !== next.issue_updated_at
    ) ||
    (
      next.issue_archived_at !== undefined &&
      (claim.issue_archived_at ?? null) !== (next.issue_archived_at ?? null)
    ) ||
    (
      next.issue_trashed !== undefined &&
      (claim.issue_trashed ?? null) !== (next.issue_trashed ?? null)
    ) ||
    (
      next.issue_viewer_id !== undefined &&
      (claim.issue_viewer_id ?? null) !== (next.issue_viewer_id ?? null)
    ) ||
    (
      next.issue_viewer_auth_fingerprint !== undefined &&
      (claim.issue_viewer_auth_fingerprint ?? null) !== (next.issue_viewer_auth_fingerprint ?? null)
    ) ||
    (
      next.issue_assignee_id !== undefined &&
      (claim.issue_assignee_id ?? null) !== (next.issue_assignee_id ?? null)
    ) ||
    (
      next.issue_assignee_name !== undefined &&
      (claim.issue_assignee_name ?? null) !== (next.issue_assignee_name ?? null)
    ) ||
    (
      next.issue_blocked_by !== undefined &&
      !areProviderIssueBlockersEqual(claim.issue_blocked_by ?? null, next.issue_blocked_by ?? null)
    ) ||
    claim.state !== next.state ||
    claim.reason !== next.reason ||
    claim.task_id !== next.task_id ||
    claim.run_id !== next.run_id ||
    claim.run_manifest_path !== next.run_manifest_path ||
    (
      next.worker_host !== undefined &&
      (claim.worker_host ?? null) !== (next.worker_host ?? null)
    ) ||
    (
      next.launch_source !== undefined &&
      (claim.launch_source ?? null) !== (next.launch_source ?? null)
    ) ||
    (
      next.launch_token !== undefined &&
      (claim.launch_token ?? null) !== (next.launch_token ?? null)
    ) ||
    (claim.retry_queued ?? null) !== (next.retry_queued ?? null) ||
    (claim.retry_attempt ?? null) !== (next.retry_attempt ?? null) ||
    (claim.retry_due_at ?? null) !== (next.retry_due_at ?? null) ||
    (claim.retry_error ?? null) !== (next.retry_error ?? null) ||
    (
      next.review_promotion !== undefined &&
      !areProviderReviewPromotionRecordsEqual(claim.review_promotion, next.review_promotion)
    ) ||
    (
      next.merge_closeout !== undefined &&
      !areProviderMergeCloseoutRecordsEqual(claim.merge_closeout, next.merge_closeout)
    )
  );
}

function areProviderIssueBlockersEqual(
  left: ProviderIntakeClaimRecord['issue_blocked_by'],
  right: ProviderIntakeClaimRecord['issue_blocked_by']
): boolean {
  const leftBlockers = left ?? null;
  const rightBlockers = right ?? null;
  if (leftBlockers === rightBlockers) {
    return true;
  }
  if (!leftBlockers || !rightBlockers || leftBlockers.length !== rightBlockers.length) {
    return false;
  }
  return leftBlockers.every((blocker, index) => {
    const other = rightBlockers[index];
    return (
      blocker?.id === other?.id &&
      blocker?.identifier === other?.identifier &&
      blocker?.state === other?.state &&
      blocker?.state_type === other?.state_type
    );
  });
}

function areProviderReviewPromotionRecordsEqual(
  left: ProviderIntakeClaimRecord['review_promotion'],
  right: ProviderIntakeClaimRecord['review_promotion']
): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function areProviderMergeCloseoutRecordsEqual(
  left: ProviderIntakeClaimRecord['merge_closeout'],
  right: ProviderIntakeClaimRecord['merge_closeout']
): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function isProviderClaimRehydrationTimedOut(
  claim: ProviderIntakeClaimRecord,
  now: string
): boolean {
  const launchedAt = Date.parse(claim.updated_at);
  const observedAt = Date.parse(now);
  if (!Number.isFinite(launchedAt) || !Number.isFinite(observedAt)) {
    return false;
  }
  return observedAt - launchedAt >= BEST_EFFORT_REHYDRATE_TIMEOUT_MS;
}

function resolveProviderRetryDelayType(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason'>;
  previousRun: ProviderIssueRunRecord | null;
}): ProviderRetryDelayType {
  if (
    input.claim.reason === PROVIDER_POST_WORKER_EXIT_REFRESH_PENDING_REASON ||
    input.previousRun?.status === 'succeeded' ||
    input.claim.state === 'accepted'
  ) {
    return 'continuation';
  }
  return 'failure';
}

function resolveProviderReleaseRun(
  claim: ProviderIntakeClaimRecord,
  claimRuns: ProviderIssueRunRecord[]
): ProviderIssueRunRecord | null {
  const activeRun = claimRuns.find((run) => run.status === 'in_progress') ?? null;
  if (activeRun) {
    return activeRun;
  }
  const queuedRun = claimRuns.find((run) => run.status === 'queued') ?? null;
  if (queuedRun) {
    return queuedRun;
  }
  const matchedIdentityRun = resolveProviderClaimRunIdentity(claim, claimRuns);
  if (matchedIdentityRun) {
    return matchedIdentityRun;
  }
  const syntheticDetachedReleaseRunId =
    !claim.run_manifest_path &&
    claim.run_id === claim.task_id &&
    (
      claim.state === 'handoff_failed' ||
      claim.state === 'released'
    );
  if (
    !syntheticDetachedReleaseRunId &&
    (claim.run_id || claim.run_manifest_path) &&
    (
      claim.state === 'handoff_failed' ||
      claim.state === 'released'
    )
  ) {
    return null;
  }
  if (
    !claim.run_manifest_path &&
    (
      claim.state === 'handoff_failed' ||
      claim.state === 'released'
    )
  ) {
    const matchedRun = claimRuns.find((run) => didRunMatchClaimAttempt(claim, run)) ?? null;
    if (matchedRun) {
      return matchedRun;
    }
    if (claim.state !== 'released' || claim.issue_updated_at) {
      return null;
    }
  }
  if (
    claim.state === 'starting' || claim.state === 'resuming'
  ) {
    if (!claim.run_manifest_path) {
      return null;
    }
    return {
      provider: claim.provider,
      issueId: claim.issue_id,
      taskId: claim.task_id,
      runId: claim.run_id ?? claim.task_id,
      manifestPath: claim.run_manifest_path,
      manifest: {},
      pipelineId: null,
      status: null,
      hasDeadLocalInProgressProof: false,
      proofTerminalStatus: null,
      hasStaleInProgressProof: false,
      summary: null,
      failureDiagnosis: null,
      issueUpdatedAt: claim.issue_updated_at,
      startedAt: null,
      updatedAt: claim.updated_at,
      hasFreshWorkerHostContext: false,
      workerHostProofAttemptStartedAt: null,
      workerHostProofUpdatedAt: null,
      workerHost: claim.worker_host ?? null,
      residentSessionSeed: null
    };
  }
  return claimRuns[0] ?? null;
}

function resolveProviderClaimRunIdentity(
  claim: Pick<ProviderIntakeClaimRecord, 'run_id' | 'run_manifest_path'>,
  claimRuns: ProviderIssueRunRecord[]
): ProviderIssueRunRecord | null {
  if (claim.run_manifest_path) {
    const manifestMatch = claimRuns.find((run) => run.manifestPath === claim.run_manifest_path) ?? null;
    if (manifestMatch) {
      return manifestMatch;
    }
  }
  if (claim.run_id) {
    return claimRuns.find((run) => run.runId === claim.run_id) ?? null;
  }
  return null;
}

function resolveLatestKnownProviderRun(
  claimRuns: ProviderIssueRunRecord[]
): ProviderIssueRunRecord | null {
  return claimRuns.find((run) => run.status !== null) ?? null;
}

function shouldQueuePostWorkerRetryClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'retry_queued' | 'issue_state' | 'issue_state_type' | 'issue_archived_at' | 'issue_trashed'
  >
): boolean {
  if (isTerminalProviderIntakeIssueState(claim)) {
    return false;
  }
  if (claim.retry_queued === true) {
    return true;
  }
  return classifyProviderLinearWorkflowState({
    state: claim.issue_state,
    state_type: claim.issue_state_type
  }).isActive;
}

function isProviderStartedWorkerClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'issue_state' | 'issue_state_type'>
): boolean {
  return isProviderStartedWorkerIssueState({
    state: claim.issue_state,
    state_type: claim.issue_state_type
  });
}

function isProviderStartedWorkerTrackedIssue(
  issue: Pick<LiveLinearTrackedIssue, 'state' | 'state_type'>
): boolean {
  return isProviderStartedWorkerIssueState(issue);
}

function isProviderStartedWorkerIssueState(input: {
  state: string | null | undefined;
  state_type: string | null | undefined;
}): boolean {
  const workflowState = classifyProviderLinearWorkflowState(input);
  return workflowState.isActive && !workflowState.isTodo;
}

function buildTrackedIssuePollMap(
  trackedIssues: LiveLinearTrackedIssue[]
): Map<string, LiveLinearTrackedIssue> {
  const trackedIssuesByKey = new Map<string, LiveLinearTrackedIssue>();
  for (const trackedIssue of trackedIssues) {
    const providerKey = buildProviderIssueKey(trackedIssue.provider, trackedIssue.id);
    if (trackedIssuesByKey.has(providerKey)) {
      continue;
    }
    trackedIssuesByKey.set(providerKey, trackedIssue);
  }
  return trackedIssuesByKey;
}

function buildTrackedIssuePollBlockerMap(
  trackedIssues: LiveLinearTrackedIssue[]
): Map<string, LiveLinearTrackedBlocker> {
  const blockersByKey = new Map<string, LiveLinearTrackedBlocker>();
  for (const trackedIssue of trackedIssues) {
    for (const blocker of trackedIssue.blocked_by ?? []) {
      if (typeof blocker.id !== 'string' || blocker.id.length === 0) {
        continue;
      }
      const providerKey = buildProviderIssueKey('linear', blocker.id);
      if (blockersByKey.has(providerKey)) {
        continue;
      }
      blockersByKey.set(providerKey, blocker);
    }
  }
  return blockersByKey;
}

function buildProviderIntakeClaimBlockerMap(
  claims: ProviderIntakeClaimRecord[]
): Map<string, LiveLinearTrackedBlocker> {
  const blockersByKey = new Map<string, LiveLinearTrackedBlocker>();
  const claimsByProviderKey = new Map<string, ProviderIntakeClaimRecord>();
  for (const claim of claims) {
    claimsByProviderKey.set(buildProviderIssueKey(claim.provider, claim.issue_id), claim);
  }
  for (const claim of claims) {
    for (const blocker of claim.issue_blocked_by ?? []) {
      if (typeof blocker.id !== 'string' || blocker.id.length === 0) {
        continue;
      }
      const providerKey = buildProviderIssueKey(claim.provider, blocker.id);
      const blockedClaim = claimsByProviderKey.get(providerKey) ?? null;
      if (
        !blockedClaim ||
        !shouldUseTrackedIssueBlockerSnapshotForRetainedReleasedNotActiveMetadataRefresh({
          claim: blockedClaim,
          blocker
        })
      ) {
        continue;
      }
      if (blockersByKey.has(providerKey)) {
        continue;
      }
      blockersByKey.set(providerKey, blocker);
    }
  }
  return blockersByKey;
}

function shouldUseTrackedIssueBlockerSnapshotForRetainedReleasedNotActiveMetadataRefresh(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type'
  >;
  blocker: LiveLinearTrackedBlocker | null;
}): boolean {
  if (
    input.claim.state !== 'released' ||
    input.claim.reason !== 'provider_issue_released:not_active' ||
    !input.blocker
  ) {
    return false;
  }
  const blockerState = normalizeProviderLinearWorkflowState(input.blocker.state);
  const blockerStateType = normalizeProviderLinearWorkflowState(input.blocker.state_type);
  if (blockerState === null && blockerStateType === null) {
    return false;
  }
  return (
    blockerState !== normalizeProviderLinearWorkflowState(input.claim.issue_state) ||
    blockerStateType !== normalizeProviderLinearWorkflowState(input.claim.issue_state_type)
  );
}

function resolveTrackedIssuePollResolution(
  claim: Pick<ProviderIntakeClaimRecord, 'provider' | 'issue_id' | 'state' | 'reason'>,
  trackedIssuesByKey: Map<string, LiveLinearTrackedIssue>,
  options?: {
    releaseOnlyCachedPendingRevalidation?: boolean;
  }
):
  | ProviderTrackedIssueRefreshDisposition
  | { kind: 'skip'; reason: string } {
  const trackedIssue = trackedIssuesByKey.get(buildProviderIssueKey(claim.provider, claim.issue_id)) ?? null;
  if (!trackedIssue) {
    return {
      kind: 'release',
      reason: 'not_found',
      trackedIssue: null,
      cleanupWorkspace: false
    };
  }

  const eligibility = assessProviderTrackedIssueEligibility(trackedIssue, {
    hasExistingClaim: true
  });
  if (shouldReleaseCachedPendingRevalidationHandoffClaim(claim, eligibility)) {
    return {
      kind: 'release',
      reason: 'not_active',
      trackedIssue,
      cleanupWorkspace: false
    };
  }
  if (
    isCachedPendingRevalidationClaim(claim) &&
    options?.releaseOnlyCachedPendingRevalidation === true &&
    eligibility.eligible
  ) {
    return {
      kind: 'skip',
      reason: 'provider_issue_poll_cached_revalidation_pending'
    };
  }
  if (eligibility.eligible) {
    if (eligibility.claimReason === 'provider_issue_handoff_owned') {
      return {
        kind: 'owned',
        trackedIssue
      };
    }
    return {
      kind: 'ready',
      trackedIssue
    };
  }

  return {
    kind: 'release',
    reason: stripProviderIssueReleasedPrefix(eligibility.releaseReason),
    trackedIssue,
    cleanupWorkspace: eligibility.cleanupWorkspace
  };
}

async function resolveTrackedIssuePollResolutionWithFallback(
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'provider'
    | 'issue_id'
    | 'state'
    | 'reason'
    | 'issue_state'
    | 'issue_state_type'
    | 'review_promotion'
    | 'merge_closeout'
  >,
  trackedIssuesByKey: Map<string, LiveLinearTrackedIssue>,
  resolveTrackedIssue?: CreateProviderIssueHandoffServiceOptions['resolveTrackedIssue'],
  options?: {
    allowPollFailClosed?: boolean;
    allowReleasedPollFailClosed?: boolean;
    allowDirectIssueById?: boolean;
    releaseOnlyCachedPendingRevalidation?: boolean;
    onDirectIssueById?: () => void;
    onDirectIssueByIdResult?: (result: {
      consumesPreDiscoveryNonActiveBudget: boolean;
    }) => void;
  }
):
  Promise<ProviderTrackedIssueRefreshDisposition | { kind: 'skip'; reason: string }> {
  const pollResolution = resolveTrackedIssuePollResolution(claim, trackedIssuesByKey, {
    releaseOnlyCachedPendingRevalidation:
      options?.releaseOnlyCachedPendingRevalidation === true
  });
  if (
    pollResolution.kind !== 'release' ||
    pollResolution.reason !== 'not_found' ||
    pollResolution.trackedIssue !== null ||
    !resolveTrackedIssue
  ) {
    return pollResolution;
  }

  const failClosedReason =
    (options?.allowPollFailClosed === true
      ? resolveProviderIssuePollFailClosedReason(claim)
      : null) ??
    (options?.allowReleasedPollFailClosed === true
      ? resolveReleasedProviderIssuePollFailClosedReason(claim)
      : null);
  const shouldRevalidateCachedPendingClaim =
    failClosedReason === 'provider_issue_poll_cached_revalidation_pending' &&
    options?.allowDirectIssueById !== false;
  if (failClosedReason && !shouldRevalidateCachedPendingClaim) {
    return {
      kind: 'skip',
      reason: failClosedReason
    };
  }
  if (options?.allowDirectIssueById === false) {
    return {
      kind: 'skip',
      reason: 'provider_issue_poll_deferred_for_fresh_discovery'
    };
  }

  options?.onDirectIssueById?.();
  const recordDirectIssueByIdResult = (consumesPreDiscoveryNonActiveBudget: boolean) => {
    options?.onDirectIssueByIdResult?.({ consumesPreDiscoveryNonActiveBudget });
  };
  let directResolution: Awaited<ReturnType<NonNullable<CreateProviderIssueHandoffServiceOptions['resolveTrackedIssue']>>>;
  try {
    directResolution = await resolveTrackedIssue({
      provider: claim.provider,
      issueId: claim.issue_id
    });
  } catch (error) {
    recordDirectIssueByIdResult(true);
    throw error;
  }
  if (directResolution.kind === 'ready') {
    const eligibility = assessProviderTrackedIssueEligibility(directResolution.trackedIssue, {
      hasExistingClaim: true
    });
    if (shouldReleaseCachedPendingRevalidationHandoffClaim(claim, eligibility)) {
      recordDirectIssueByIdResult(true);
      return {
        kind: 'release',
        reason: 'not_active',
        source: 'direct_issue_by_id',
        trackedIssue: directResolution.trackedIssue,
        cleanupWorkspace: false
      };
    }
    if (
      shouldRevalidateCachedPendingClaim &&
      options?.releaseOnlyCachedPendingRevalidation === true &&
      eligibility.eligible
    ) {
      recordDirectIssueByIdResult(false);
      return {
        kind: 'skip',
        reason: 'provider_issue_poll_cached_revalidation_pending'
      };
    }
    recordDirectIssueByIdResult(true);
    if (eligibility.eligible) {
      if (eligibility.claimReason === 'provider_issue_handoff_owned') {
        return {
          kind: 'owned',
          trackedIssue: directResolution.trackedIssue
        };
      }
      return directResolution;
    }
    return {
      kind: 'release',
      reason: stripProviderIssueReleasedPrefix(eligibility.releaseReason),
      source: 'direct_issue_by_id',
      trackedIssue: directResolution.trackedIssue,
      cleanupWorkspace: eligibility.cleanupWorkspace
    };
  }

  recordDirectIssueByIdResult(true);
  if (directResolution.kind === 'release') {
    return {
      kind: 'release',
      reason: directResolution.reason,
      source: 'direct_issue_by_id',
      trackedIssue: null,
      cleanupWorkspace: false
    };
  }

  if (directResolution.kind === 'skip' && shouldRevalidateCachedPendingClaim) {
    return {
      kind: 'skip',
      reason: 'provider_issue_poll_cached_revalidation_pending'
    };
  }

  return directResolution;
}

function buildTrackedIssueSnapshotFromClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'issue_id'
    | 'issue_identifier'
    | 'issue_title'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_updated_at'
    | 'issue_archived_at'
    | 'issue_trashed'
    | 'issue_viewer_id'
    | 'issue_viewer_auth_fingerprint'
    | 'issue_assignee_id'
    | 'issue_assignee_name'
    | 'issue_blocked_by'
  >,
  currentViewerAuthFingerprint: string | null
): LiveLinearTrackedIssue {
  const canTrustPersistedViewerIdentity =
    typeof claim.issue_viewer_id === 'string' &&
    claim.issue_viewer_id.length > 0 &&
    typeof claim.issue_viewer_auth_fingerprint === 'string' &&
    claim.issue_viewer_auth_fingerprint.length > 0 &&
    currentViewerAuthFingerprint === claim.issue_viewer_auth_fingerprint;
  return {
    provider: 'linear',
    id: claim.issue_id,
    identifier: claim.issue_identifier,
    title: claim.issue_title,
    url: null,
    state: claim.issue_state,
    state_type: claim.issue_state_type,
    viewer_id: canTrustPersistedViewerIdentity ? claim.issue_viewer_id ?? null : null,
    assignee_id: claim.issue_assignee_id ?? null,
    assignee_name: claim.issue_assignee_name ?? null,
    workspace_id: null,
    team_id: null,
    team_key: null,
    team_name: null,
    project_id: null,
    project_name: null,
    updated_at: claim.issue_updated_at,
    archived_at:
      typeof claim.issue_archived_at === 'string' ? claim.issue_archived_at : null,
    trashed:
      claim.issue_trashed === true ? true : (claim.issue_trashed === false ? false : null),
    blocked_by: claim.issue_blocked_by ?? [],
    recent_activity: []
  };
}

function resolveProviderViewerAuthFingerprint(): string | null {
  return resolveLinearApiTokenFingerprint(process.env);
}

function stripProviderIssueReleasedPrefix(reason: string): string {
  return reason.startsWith('provider_issue_released:')
    ? reason.slice('provider_issue_released:'.length)
    : reason;
}

function shouldAttemptReleaseCancel(run: ProviderIssueRunRecord | null): boolean {
  if (!run) {
    return false;
  }
  if (run.status === 'in_progress' || run.status === 'queued') {
    return true;
  }
  if (run.status === null) {
    return !run.hasDeadLocalInProgressProof;
  }
  return false;
}

function canFreshDiscoverReleasedPendingReopenClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'reason' | 'run_id' | 'run_manifest_path'>,
  run: ProviderIssueRunRecord | null,
  hasPendingReleaseCancel: (manifestPath: string | null | undefined) => boolean
): boolean {
  if (!isProviderIssueReleasedPendingReopen(claim.reason ?? null)) {
    return false;
  }
  if (hasPendingReleaseCancel(run?.manifestPath ?? claim.run_manifest_path)) {
    return false;
  }
  if (run === null) {
    return !claim.run_id && !claim.run_manifest_path;
  }
  return !shouldAttemptReleaseCancel(run) || isInactiveReleasedPendingReopenRun(claim, run);
}

function shouldProbeNoRunReleasedPendingReopenClaimForLiveStartedTruth(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'run_id' | 'run_manifest_path' | 'issue_state' | 'issue_state_type'
  >;
  releaseRun: ProviderIssueRunRecord | null;
  activeRun: ProviderIssueRunRecord | null;
  latestRun: ProviderIssueRunRecord | null;
  hasPendingReleaseCancel: (manifestPath: string | null | undefined) => boolean;
}): boolean {
  if (
    input.claim.state !== 'released' ||
    !isProviderIssueReleasedPendingReopen(input.claim.reason ?? null)
  ) {
    return false;
  }
  if (input.claim.run_id || input.claim.run_manifest_path) {
    return false;
  }
  if (input.releaseRun || input.activeRun || input.latestRun) {
    return false;
  }
  if (input.hasPendingReleaseCancel(input.claim.run_manifest_path)) {
    return false;
  }
  return !isProviderStartedWorkerClaim(input.claim);
}

function canFreshDiscoverPlainReleasedMissingRetainedRunClaim(input: {
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'provider'
    | 'issue_id'
    | 'state'
    | 'reason'
    | 'task_id'
    | 'run_id'
    | 'run_manifest_path'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_updated_at'
    | 'merge_closeout'
  >;
  releaseRun: ProviderIssueRunRecord | null;
  sameIssueRuns: ProviderIssueRunRecord[];
  unreadableAdmissionOccupancy: ProviderUnreadableManifestAdmissionOccupancyRecord[];
  hasPendingReleaseCancel: (manifestPath: string | null | undefined) => boolean;
}): boolean {
  if (!canRecheckPlainReleasedNotActiveClaim(input.claim)) {
    return false;
  }
  if (
    input.releaseRun !== null ||
    !hasConcreteRetainedRunIdentity(input.claim)
  ) {
    return false;
  }
  if (input.hasPendingReleaseCancel(input.claim.run_manifest_path)) {
    return false;
  }
  const hasBlockingSameIssueRun = input.sameIssueRuns.some(
    (run) => shouldAttemptReleaseCancel(run) && !isInactiveReleasedReclaimRun(input.claim, run)
  );
  if (hasBlockingSameIssueRun) {
    return false;
  }
  return !input.unreadableAdmissionOccupancy.some(
    (record) => record.provider === input.claim.provider && record.issueId === input.claim.issue_id
  );
}

function hasConcreteRetainedRunIdentity(
  claim: Pick<ProviderIntakeClaimRecord, 'task_id' | 'run_id' | 'run_manifest_path'>
): boolean {
  return Boolean(claim.run_manifest_path) ||
    (Boolean(claim.run_id) && claim.run_id !== claim.task_id);
}

function shouldBlockPlainReleasedWithoutConcreteRetainedRunClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'state'
    | 'reason'
    | 'task_id'
    | 'run_id'
    | 'run_manifest_path'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_blocked_by'
    | 'merge_closeout'
  >
): boolean {
  const workflowState = classifyProviderLinearWorkflowState({
    state: claim.issue_state,
    state_type: claim.issue_state_type
  });
  const hasNoRetainedRunIdentity = !claim.run_id && !claim.run_manifest_path;
  const cachedBlockedByCompletedOnly =
    workflowState.normalizedState === 'blocked' &&
    hasNoRetainedRunIdentity &&
    Array.isArray(claim.issue_blocked_by) &&
    claim.issue_blocked_by.length > 0 &&
    !providerLinearTodoBlockedByNonTerminal(claim.issue_blocked_by);
  return (
    canRecheckPlainReleasedNotActiveClaim(claim) &&
    workflowState.normalizedStateType === 'started' &&
    !hasConcreteRetainedRunIdentity(claim) &&
    !cachedBlockedByCompletedOnly
  );
}

function canFreshDiscoverReleasedReclaimClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'state'
    | 'reason'
    | 'task_id'
    | 'run_id'
    | 'run_manifest_path'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_updated_at'
    | 'issue_blocked_by'
    | 'merge_closeout'
  >,
  run: ProviderIssueRunRecord | null,
  hasPendingReleaseCancel: (manifestPath: string | null | undefined) => boolean
): boolean {
  if (
    !isProviderIssueReleasedPendingReopen(claim.reason ?? null) &&
    !canRecheckPlainReleasedNotActiveClaim(claim) &&
    !canProbeFreshDiscoveryForReleasedNotActiveTerminalMergeCloseoutClaim(claim)
  ) {
    return false;
  }
  if (hasPendingReleaseCancel(run?.manifestPath ?? claim.run_manifest_path)) {
    return false;
  }
  if (run === null) {
    if (shouldBlockPlainReleasedWithoutConcreteRetainedRunClaim(claim)) {
      return false;
    }
    return !claim.run_id && !claim.run_manifest_path;
  }
  return !shouldAttemptReleaseCancel(run) || isInactiveReleasedReclaimRun(claim, run);
}

function canFreshDiscoverReleasedLiveWorkerClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'reason' | 'run_id' | 'run_manifest_path' | 'task_id'>,
  releaseRun: ProviderIssueRunRecord | null,
  activeRun: ProviderIssueRunRecord | null,
  hasPendingReleaseCancel: (manifestPath: string | null | undefined) => boolean
): boolean {
  if (!isProviderIssueReleasedLiveWorkerRehydrateCandidate(claim)) {
    return false;
  }
  const runForCancel = activeRun ?? releaseRun;
  if (hasPendingReleaseCancel(runForCancel?.manifestPath ?? claim.run_manifest_path)) {
    return false;
  }
  if (claim.reason === 'provider_issue_released:not_active') {
    return activeRun !== null;
  }
  return canFreshDiscoverReleasedPendingReopenClaim(claim, releaseRun, hasPendingReleaseCancel);
}

function isInactiveReleasedPendingReopenRun(
  claim: Pick<ProviderIntakeClaimRecord, 'reason'>,
  run: ProviderIssueRunRecord | null
): boolean {
  return (
    isProviderIssueReleasedPendingReopen(claim.reason ?? null) &&
    run?.status === null &&
    run.proofTerminalStatus === null &&
    run.hasStaleInProgressProof === true
  );
}

function isInactiveReleasedReclaimRun(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'merge_closeout'
  >,
  run: ProviderIssueRunRecord | null
): boolean {
  return (
    (
      isProviderIssueReleasedPendingReopen(claim.reason ?? null) ||
      canRecheckPlainReleasedNotActiveClaim(claim) ||
      canProbeFreshDiscoveryForReleasedNotActiveTerminalMergeCloseoutClaim(claim)
    ) &&
    run?.status === null &&
    run.proofTerminalStatus === null &&
    run.hasStaleInProgressProof === true
  );
}

function canCleanupReleasedProviderWorkspace(run: ProviderIssueRunRecord | null): boolean {
  return run !== null && !shouldAttemptReleaseCancel(run);
}

function isMissingPathError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if (isMissingPathError(error)) {
      return null;
    }
    throw error;
  }
}

async function readBestEffortJsonFile<T>(path: string): Promise<T | null> {
  try {
    return await readJsonFile<T>(path);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readRecordValue(record: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) {
      return value;
    }
  }
  return null;
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function readTimestampMs(record: Record<string, unknown>, ...keys: string[]): number {
  const value = readStringValue(record, ...keys);
  if (!value) {
    return Number.NaN;
  }
  return Date.parse(value);
}

function isLocalProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code !== 'ESRCH';
  }
}

function readIntegerValue(record: Record<string, unknown> | null, ...keys: string[]): number | null {
  if (!record) {
    return null;
  }
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
      return value;
    }
    if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
      return Number.parseInt(value.trim(), 10);
    }
  }
  return null;
}
