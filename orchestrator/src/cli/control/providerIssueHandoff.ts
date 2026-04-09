import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

import { logger } from '../../logger.js';
import {
  PROVIDER_LINEAR_WORKER_AUDIT_FILENAME,
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME
} from '../providerLinearWorkerRunner.js';
import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import {
  cleanupProviderWorkspace,
  resolveExplicitProviderWorkspacePathWithinRoot,
  resolveProviderWorkspacePath
} from '../run/workspacePath.js';
import {
  isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned,
  sortLiveLinearTrackedIssuesForDispatch,
  type LiveLinearTrackedIssue
} from './linearDispatchSource.js';
import { resolveLinearWebhookSourceSetup } from './linearWebhookController.js';
import { resolveLinearApiTokenFingerprint } from './linearGraphqlClient.js';
import {
  classifyProviderLinearWorkflowState,
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
import type { ProviderWorkflowConfigStore } from './providerWorkflowConfigStore.js';
import {
  appendProviderOperatorAutopilotAuditResult,
  areProviderOperatorAutopilotResultsMeaningfullyEqual,
  runProviderOperatorAutopilot,
  type ProviderOperatorAutopilotConfig,
  type ProviderOperatorAutopilotResult
} from './providerOperatorAutopilot.js';
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

export interface ProviderIssueLauncher {
  start(input: {
    taskId: string;
    pipelineId: string;
    provider: 'linear';
    issueId: string;
    issueIdentifier: string;
    issueUpdatedAt: string | null;
    workspaceId?: string | null;
    teamId?: string | null;
    projectId?: string | null;
    launchToken: string;
  }): Promise<{ runId: string; manifestPath: string } | null>;
  resume(input: {
    runId: string;
    actor: string;
    reason: string;
    launchToken: string;
  }): Promise<void>;
}

export interface ProviderIssueHandoffResult {
  kind: 'ignored' | 'start' | 'resume';
  reason: string;
  claim: ProviderIntakeClaimRecord;
}

export type ProviderTrackedIssuePollResolution =
  | { kind: 'ready'; trackedIssues: LiveLinearTrackedIssue[] }
  | { kind: 'skip'; reason: string };

type ProviderTrackedIssueRefetch = () => Promise<ProviderTrackedIssuePollResolution>;

export interface ProviderIssueHandoffPollInput {
  trackedIssues: LiveLinearTrackedIssue[];
  refetchTrackedIssues?: (() => Promise<ProviderTrackedIssuePollResolution>) | null;
}

interface ProviderIssueRunRecord {
  provider: 'linear';
  issueId: string;
  taskId: string;
  runId: string;
  manifestPath: string;
  pipelineId: string | null;
  status: string | null;
  proofTerminalStatus: 'failed' | 'succeeded' | null;
  summary: string | null;
  issueUpdatedAt: string | null;
  startedAt: string | null;
  updatedAt: string | null;
}

interface ProviderLinearWorkerProofRecord {
  attempt_started_at?: unknown;
  owner_phase?: unknown;
  owner_status?: unknown;
  end_reason?: unknown;
  updated_at?: unknown;
}

export interface ProviderIssueHandoffService {
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
}

export type ProviderTrackedIssueRefreshResolution =
  | { kind: 'ready'; trackedIssue: LiveLinearTrackedIssue }
  | { kind: 'release'; reason: string }
  | { kind: 'skip'; reason: string };

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
  resolveTrackedIssues?: (() => Promise<ProviderTrackedIssuePollResolution>) | null;
  providerWorkflowConfigStore?: ProviderWorkflowConfigStore | null;
  runTerminalCleanup?: typeof runProviderTerminalCleanup;
  runReviewHandoffPromotion?: ((input: {
    issueId: string;
    issueIdentifier?: string | null;
    issueState?: string | null;
    issueStateType?: string | null;
    issueUpdatedAt?: string | null;
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
    sourceSetup?: DispatchPilotSourceSetup | null;
    repoRoot: string;
    env?: NodeJS.ProcessEnv;
  }) => Promise<ProviderMergeCloseoutRecord>) | null;
  runOperatorAutopilot?: ((input: {
    tracked_issues: LiveLinearTrackedIssue[];
    claims: ProviderIntakeClaimRecord[];
    config: ProviderOperatorAutopilotConfig;
    source_setup?: DispatchPilotSourceSetup | null;
    env?: NodeJS.ProcessEnv;
    previous_result?: ProviderOperatorAutopilotResult | null;
  }) => Promise<ProviderOperatorAutopilotResult>) | null;
  appendOperatorAutopilotAuditResult?: typeof appendProviderOperatorAutopilotAuditResult;
}

const RESUME_ELIGIBLE_STATUSES = new Set(['failed', 'cancelled']);
const BEST_EFFORT_REHYDRATE_DELAY_MS = 1_000;
const BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS = 5;
const BEST_EFFORT_REHYDRATE_TIMEOUT_MS =
  BEST_EFFORT_REHYDRATE_DELAY_MS * BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS;
const PROVIDER_LAUNCH_SOURCE: ProviderLaunchSource = 'control-host';
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
        | 'provider_issue_assignee_changed';
      releaseReason:
        | 'provider_issue_released:not_active'
        | 'provider_issue_released:todo_blocked_by_non_terminal'
        | 'provider_issue_released:assignee_changed';
      cleanupWorkspace: boolean;
    };

type ProviderTrackedIssueRefreshDisposition =
  | { kind: 'ready'; trackedIssue: LiveLinearTrackedIssue }
  | { kind: 'owned'; trackedIssue: LiveLinearTrackedIssue }
  | {
      kind: 'release';
      reason: string;
      trackedIssue: Pick<
        LiveLinearTrackedIssue,
        | 'identifier'
        | 'title'
        | 'state'
        | 'state_type'
        | 'updated_at'
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
  const runOperatorAutopilot = options.runOperatorAutopilot ?? runProviderOperatorAutopilot;
  const appendOperatorAutopilotAuditResult =
    options.appendOperatorAutopilotAuditResult ?? appendProviderOperatorAutopilotAuditResult;
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
  let bestEffortRehydrateTimer: NodeJS.Timeout | null = null;
  const queuedRetryTrackedIssueRefetches = new Map<string, ProviderTrackedIssueRefetch>();

  const runWithRefreshLifecycleLock = async <T>(operation: () => Promise<T>): Promise<T> => {
    const nextOperation = refreshLifecycleChain.then(operation, operation);
    refreshLifecycleChain = nextOperation.then(
      () => undefined,
      () => undefined
    );
    return nextOperation;
  };

  const persistState = async (): Promise<void> => {
    await options.persist();
    rebuildRetryQueue();
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

  const persistStateOrRollback = async (snapshot: ProviderStateSnapshot): Promise<void> => {
    try {
      await persistState();
    } catch (error) {
      restoreProviderStateSnapshot(snapshot);
      throw error;
    }
  };

  const upsertProviderClaimAndPersist = async (
    input: Parameters<typeof upsertProviderIntakeClaim>[1],
    persistOptions: { rollbackOnPersistFailure?: boolean } = {}
  ): Promise<ProviderIntakeClaimRecord> => {
    const snapshot =
      persistOptions.rollbackOnPersistFailure === false ? null : captureProviderStateSnapshot();
    const claim = upsertProviderIntakeClaim(options.state, input);
    if (snapshot) {
      await persistStateOrRollback(snapshot);
    } else {
      await persistState();
    }
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
      sourceSetup: resolveMergeCloseoutSourceSetup(),
      env: buildMergeCloseoutEnv(input.latestRun?.manifestPath ?? input.claim.run_manifest_path),
      repoRoot
    });
    if (mergeCloseout.reason === 'issue_no_longer_merging') {
      return null;
    }
    const claimState = resolveProviderMergeCloseoutClaimState(mergeCloseout);
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

  const persistRecoveredActiveRunMergeCloseout = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    latestRun: ProviderIssueRunRecord;
    mergeCloseout: ProviderMergeCloseoutRecord;
  }): Promise<ProviderIntakeClaimRecord> => {
    const trackedIssueClaimFields = buildTrackedIssueClaimFields(input.trackedIssue);
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
      void runWithRefreshLifecycleLock(() => rehydrateNow({ refreshTrackedIssueMetadata: true }))
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
    issue_viewer_id: trackedIssue.viewer_id,
    issue_viewer_auth_fingerprint:
      typeof trackedIssue.viewer_id === 'string' && trackedIssue.viewer_id.length > 0
        ? resolveProviderViewerAuthFingerprint()
        : null,
    issue_assignee_id: trackedIssue.assignee_id,
    issue_assignee_name: trackedIssue.assignee_name,
    ...(trackedIssue.blocked_by === undefined ? {} : { issue_blocked_by: trackedIssue.blocked_by })
  });

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

  const resolveFreshTrackedIssueForActiveClaim = async (
    claim: Pick<ProviderIntakeClaimRecord, 'provider' | 'issue_id' | 'issue_updated_at'>
  ): Promise<{
    trackedIssue: LiveLinearTrackedIssue | null;
    claimFields: Partial<
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
      >
    >;
  }> => {
    if (!options.resolveTrackedIssue) {
      return { trackedIssue: null, claimFields: {} };
    }

    let resolution: Awaited<ReturnType<NonNullable<typeof options.resolveTrackedIssue>>>;
    try {
      resolution = await options.resolveTrackedIssue({
        provider: claim.provider,
        issueId: claim.issue_id
      });
    } catch (error) {
      logger.warn(
        `Provider issue active-run metadata refresh failed for ${buildProviderIssueKey(
          claim.provider,
          claim.issue_id
        )}: ${(error as Error)?.message ?? String(error)}`
      );
      return { trackedIssue: null, claimFields: {} };
    }
    if (resolution.kind !== 'ready') {
      return { trackedIssue: null, claimFields: {} };
    }

    const eligibility = assessProviderTrackedIssueEligibility(resolution.trackedIssue, {
      hasExistingClaim: true
    });
    if (!eligibility.eligible) {
      return { trackedIssue: null, claimFields: {} };
    }

    if (!isTrackedIssueFreshEnoughForClaim(claim, resolution.trackedIssue)) {
      return { trackedIssue: null, claimFields: {} };
    }

    return {
      trackedIssue: resolution.trackedIssue,
      claimFields: buildFreshTrackedIssueClaimFields(claim, resolution.trackedIssue)
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
    const launchToken = createProviderLaunchToken();
    await upsertProviderClaimAndPersist({
      ...input.claim,
      ...buildTrackedIssueClaimFields(input.trackedIssue),
      task_id: input.run.taskId,
      state: 'resuming',
      reason: input.reason,
      run_id: input.run.runId,
      run_manifest_path: input.run.manifestPath,
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
      await options.launcher.resume({
        runId: input.run.runId,
        actor: 'control-host',
        reason: input.launcherReason ?? 'provider-refresh',
        launchToken
      });
    } catch (error) {
      const failureReason = input.failureReason ?? 'provider_issue_refresh_resume_failed';
      await upsertProviderClaimAndPersist({
        ...input.claim,
        ...buildTrackedIssueClaimFields(input.trackedIssue),
        task_id: input.run.taskId,
        state: 'handoff_failed',
        reason: `${failureReason}:${(error as Error)?.message ?? String(error)}`,
        run_id: input.run.runId,
        run_manifest_path: input.run.manifestPath,
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
    const taskId = buildProviderFallbackTaskId(input.trackedIssue);
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
      launch_source: PROVIDER_LAUNCH_SOURCE,
      launch_token: launchToken,
      review_promotion: null,
      merge_closeout: null,
      ...buildProviderRetryLaunchFields({
        claim: input.claim,
        previousRun: input.previousRun ?? null,
        preserveCurrentAttempt: input.preserveRetryAttempt === true || input.claim.retry_queued === true,
        seedFromPreviousRun: input.seedRetryAttemptFromPreviousRun === true
      })
    });
    let startedRun: { runId: string; manifestPath: string } | null = null;
    try {
      startedRun = await options.launcher.start({
        taskId,
        pipelineId: startPipelineId,
        provider: 'linear',
        issueId: input.trackedIssue.id,
        issueIdentifier: input.trackedIssue.identifier,
        issueUpdatedAt: input.trackedIssue.updated_at,
        workspaceId: input.trackedIssue.workspace_id,
        teamId: input.trackedIssue.team_id,
        projectId: input.trackedIssue.project_id,
        launchToken
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
        launch_source: PROVIDER_LAUNCH_SOURCE,
        launch_token: launchToken,
        review_promotion: null,
        merge_closeout: null,
        ...buildQueuedProviderRetryFields({
          claim: input.claim,
          previousRun: input.previousRun ?? null,
          error: (error as Error)?.message ?? String(error),
          preserveCurrentAttempt: input.preserveRetryAttempt === true || input.claim.retry_queued === true,
          delayType: 'failure'
        })
      }, { rollbackOnPersistFailure: false });
      throw error;
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
          launch_source: PROVIDER_LAUNCH_SOURCE,
          launch_token: launchToken,
          review_promotion: null,
          merge_closeout: null,
          ...buildProviderRetryLaunchFields({
            claim: input.claim,
            previousRun: input.previousRun ?? null,
            preserveCurrentAttempt: input.preserveRetryAttempt === true || input.claim.retry_queued === true,
            seedFromPreviousRun: input.seedRetryAttemptFromPreviousRun === true
          })
        })
      : input.claim;
    try {
      if (startedRun) {
        await persistState();
        options.publishRuntime?.('provider-intake.refresh');
      }
      return { kind: 'start', reason: input.reason, claim };
    } finally {
      scheduleBestEffortRehydrateWithRefreshLock();
    }
  };

  const releaseClaim = async (input: {
    claim: ProviderIntakeClaimRecord;
    nextReason: string;
    releaseRun: ProviderIssueRunRecord | null;
    trackedIssue?: Pick<
      LiveLinearTrackedIssue,
      | 'identifier'
      | 'title'
      | 'state'
      | 'state_type'
      | 'updated_at'
      | 'viewer_id'
      | 'assignee_id'
      | 'assignee_name'
      | 'blocked_by'
    > | null;
    cleanupWorkspace?: boolean;
  }): Promise<void> => {
    const now = isoTimestamp();
    const nextTaskId = input.releaseRun?.taskId ?? input.claim.task_id;
    const nextRunId = input.releaseRun?.runId ?? input.claim.run_id;
    const nextManifestPath = input.releaseRun?.manifestPath ?? input.claim.run_manifest_path;
    const trackedIssueFields = input.trackedIssue
      ? buildTrackedIssueClaimFields(input.trackedIssue)
      : null;
    const transitioned = hasProviderClaimTransitioned(input.claim, {
      ...(trackedIssueFields ?? {}),
      state: 'released',
      reason: input.nextReason,
      task_id: nextTaskId,
      run_id: nextRunId,
      run_manifest_path: nextManifestPath,
      ...clearProviderRetryFields()
    });
    await upsertProviderClaimAndPersist({
      ...input.claim,
      issue_identifier: input.trackedIssue?.identifier ?? input.claim.issue_identifier,
      issue_title: input.trackedIssue?.title ?? input.claim.issue_title,
      issue_state: input.trackedIssue?.state ?? input.claim.issue_state,
      issue_state_type: input.trackedIssue?.state_type ?? input.claim.issue_state_type,
      issue_updated_at: input.trackedIssue?.updated_at ?? input.claim.issue_updated_at,
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
      task_id: nextTaskId,
      state: 'released',
      reason: input.nextReason,
      run_id: nextRunId,
      run_manifest_path: nextManifestPath,
      ...clearProviderRetryFields(),
      updated_at: now
    });
    if (input.cleanupWorkspace && canCleanupReleasedProviderWorkspace(input.releaseRun)) {
      await cleanupReleasedProviderWorkspace({
        repoRoot,
        taskId: nextTaskId,
        manifestPath: nextManifestPath,
        issueId: input.claim.issue_id,
        issueIdentifier: input.claim.issue_identifier,
        providerWorkflowConfigStore: options.providerWorkflowConfigStore ?? null,
        runTerminalCleanup
      });
    }
    if (transitioned) {
      options.publishRuntime?.('provider-intake.refresh');
    }
    await retryReleaseCancel({
      releaseRun: input.releaseRun,
      reason: input.nextReason
    });
  };

  const hasPendingReleaseCancel = (manifestPath: string | null | undefined): boolean =>
    Boolean(manifestPath && releaseCancelInFlight.has(manifestPath));

  const retryReleaseCancel = async (input: {
    releaseRun: ProviderIssueRunRecord | null;
    reason: string;
  }): Promise<void> => {
    const manifestPath = input.releaseRun?.manifestPath ?? null;
    if (!shouldAttemptReleaseCancel(input.releaseRun) || !manifestPath) {
      return;
    }
    const existingAttempt = releaseCancelInFlight.get(manifestPath);
    if (existingAttempt) {
      if (!existingAttempt.retryConsumed) {
        existingAttempt.retryRequested = true;
      }
      await existingAttempt.attempt;
      return;
    }
    const performCancelAttempt = async (): Promise<boolean> => {
      try {
        await callChildControlEndpoint({
          manifestPath,
          payload: {
            action: 'cancel',
            requested_by: 'control-host',
            reason: input.reason
          },
          allowedRunRoots
        });
        return true;
      } catch {
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

  const rehydrateNow = async (input?: {
    refreshTrackedIssueMetadata?: boolean;
  }): Promise<{ hasPendingClaims: boolean }> => {
    const now = isoTimestamp();
    const discoveredRuns = await discoverProviderIssueRuns(options.paths.runDir);
    const runsByProviderIssue = groupProviderIssueRuns(discoveredRuns);
    let hasPendingClaims = false;
    let publishRuntime = false;

    for (const claim of [...options.state.claims]) {
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
        publishRuntime ||= hasProviderClaimTransitioned(claim, {
          state: 'released',
          reason: claim.reason ?? 'provider_issue_released',
          task_id: releasedRun?.taskId ?? claim.task_id,
          run_id: releasedRun?.runId ?? claim.run_id,
          run_manifest_path: releasedRun?.manifestPath ?? claim.run_manifest_path
        });
        upsertProviderIntakeClaim(options.state, {
          ...claim,
          launch_source: undefined,
          launch_token: undefined,
          task_id: releasedRun?.taskId ?? claim.task_id,
          state: 'released',
          reason: claim.reason ?? 'provider_issue_released',
          run_id: releasedRun?.runId ?? claim.run_id,
          run_manifest_path: releasedRun?.manifestPath ?? claim.run_manifest_path,
          updated_at: now
        });
        if (shouldAttemptReleaseCancel(releasedRun)) {
          hasPendingClaims = true;
        }
        if (
          shouldCleanupReleasedProviderWorkspace(claim) &&
          canCleanupReleasedProviderWorkspace(releasedRun)
        ) {
          await cleanupReleasedProviderWorkspace({
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
        const preserveMergeCloseoutClaim =
          isProviderMergeCloseoutWatchingClaim(claim) || isTerminalProviderMergeCloseoutClaim(claim);
        const freshTrackedIssue = input?.refreshTrackedIssueMetadata
          ? await resolveFreshTrackedIssueForActiveClaim(claim)
          : { trackedIssue: null, claimFields: {} };
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
          ...reactivatedMergeCloseoutReset
        });
        upsertProviderIntakeClaim(options.state, {
          ...claim,
          ...trackedIssueFields,
          launch_source: undefined,
          launch_token: undefined,
          task_id: activeRun.taskId,
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          run_id: activeRun.runId,
          run_manifest_path: activeRun.manifestPath,
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
        const queuedRetryFields = buildQueuedProviderRetryFields({
          claim,
          previousRun: resumableRun,
          error: resolveProviderRetryErrorFromRun(resumableRun),
          preserveCurrentAttempt: claim.retry_queued === true,
          preserveExistingDueAt: claim.retry_queued === true,
          delayType: 'failure'
        });
        publishRuntime ||= hasProviderClaimTransitioned(claim, {
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          task_id: resumableRun.taskId,
          run_id: resumableRun.runId,
          run_manifest_path: resumableRun.manifestPath,
          ...queuedRetryFields
        });
        upsertProviderIntakeClaim(options.state, {
          ...claim,
          launch_source: undefined,
          launch_token: undefined,
          task_id: resumableRun.taskId,
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          run_id: resumableRun.runId,
          run_manifest_path: resumableRun.manifestPath,
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
        if (input?.refreshTrackedIssueMetadata) {
          const freshTrackedIssue = await resolveFreshTrackedIssueForActiveClaim(claim);
          if (freshTrackedIssue.trackedIssue) {
            const refreshedClaim = {
              ...claim,
              ...freshTrackedIssue.claimFields
            };
            const reviewPromotionClaim = await maybeHandleReviewHandoffPromotion({
              claim: refreshedClaim,
              trackedIssue: freshTrackedIssue.trackedIssue,
              latestRun: completedRun
            });
            if (reviewPromotionClaim) {
              hasPendingClaims = true;
              continue;
            }
            if (
              shouldAttemptDeterministicMergeCloseoutForRecoveredRun({
                claim: refreshedClaim,
                trackedIssue: freshTrackedIssue.trackedIssue,
                run: completedRun
              })
            ) {
              const mergeCloseoutClaim = await maybeHandleDeterministicMergingCloseout({
                claim: refreshedClaim,
                trackedIssue: freshTrackedIssue.trackedIssue,
                latestRun: completedRun
              });
              if (mergeCloseoutClaim) {
                hasPendingClaims = true;
                continue;
              }
            }
          }
        }
        const completedState = buildProviderCompletedRunRehydrateState({
          claim,
          run: completedRun,
          preserveCurrentAttempt: claim.retry_queued === true,
          preserveExistingDueAt: claim.retry_queued === true,
          queueContinuationRetry: shouldQueuePostWorkerRetryClaim(claim)
        });
        publishRuntime ||= hasProviderClaimTransitioned(claim, {
          ...completedState
        });
        upsertProviderIntakeClaim(options.state, {
          ...claim,
          launch_source: undefined,
          launch_token: undefined,
          ...completedState,
          updated_at: now
        });
        continue;
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
            upsertProviderIntakeClaim(options.state, {
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
          upsertProviderIntakeClaim(options.state, {
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
          upsertProviderIntakeClaim(options.state, {
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
            publishRuntime ||= hasProviderClaimTransitioned(claim, {
              state: 'accepted',
              reason: nextReason,
              task_id: claim.task_id,
              run_id: claim.run_id,
              run_manifest_path: claim.run_manifest_path,
              ...queuedRetryFields
            });
            upsertProviderIntakeClaim(options.state, {
              ...claim,
              launch_source: undefined,
              launch_token: undefined,
              state: 'accepted',
              reason: nextReason,
              ...queuedRetryFields,
              updated_at: now
            });
          }
          continue;
        }
        upsertProviderIntakeClaim(options.state, {
          ...claim,
          launch_source: undefined,
          launch_token: undefined,
          state: 'accepted',
          reason: 'provider_issue_rehydration_pending_revalidation',
          updated_at: now
        });
      }

      if (claim.state === 'running' || claim.state === 'resumable') {
        publishRuntime ||= hasProviderClaimTransitioned(claim, {
          state: 'accepted',
          reason: 'provider_issue_rehydration_pending_revalidation',
          task_id: claim.task_id,
          run_id: claim.run_id,
          run_manifest_path: claim.run_manifest_path,
          retry_queued: claim.retry_queued ?? null,
          retry_attempt: claim.retry_attempt ?? null,
          retry_due_at: claim.retry_due_at ?? null,
          retry_error: claim.retry_error ?? null
        });
        upsertProviderIntakeClaim(options.state, {
          ...claim,
          launch_source: undefined,
          launch_token: undefined,
          state: 'accepted',
          reason: 'provider_issue_rehydration_pending_revalidation',
          updated_at: now
        });
        continue;
      }
    }

    markProviderIntakeRehydrated(options.state, now);
    await persistState();
    if (publishRuntime) {
      options.publishRuntime?.('provider-intake.rehydrate');
    }
    return { hasPendingClaims };
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
  }): Promise<ProviderTrackedIssueRefreshDisposition> => {
    if (input.trackedIssuesByKey) {
      const providerKey = buildProviderIssueKey(input.claim.provider, input.claim.issue_id);
      if (input.trackedIssuesByKey.has(providerKey)) {
        input.consumedTrackedIssueKeys?.add(providerKey);
      }
      return await resolveTrackedIssuePollResolutionWithFallback(
        input.claim,
        input.trackedIssuesByKey,
        options.resolveTrackedIssue
      );
    }

    if (!options.resolveTrackedIssue) {
      return { kind: 'skip', reason: 'provider_issue_refresh_resolution_unavailable' };
    }

    const resolution = await options.resolveTrackedIssue({
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
        trackedIssue: resolution.trackedIssue,
        cleanupWorkspace: authority.cleanupWorkspace
      };
    }
    if (resolution.kind === 'release') {
      return {
        kind: 'release',
        reason: resolution.reason,
        trackedIssue: null,
        cleanupWorkspace: false
      };
    }
    return resolution;
  };

  const resolveRetryDispatchResolutionFromPoll = async (
    claim: ProviderIntakeClaimRecord
  ):
    Promise<
      | ProviderTrackedIssueRefreshDisposition
      | { kind: 'skip'; reason: string }
      | null
    > => {
    const trackedIssueRefetch =
      options.resolveTrackedIssues ??
      queuedRetryTrackedIssueRefetches.get(claim.provider_key) ??
      null;
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
      options.resolveTrackedIssue
    );
  };

  const resolveRefreshPollInput = async (): Promise<ProviderIssueHandoffPollInput | undefined> => {
    if (!options.resolveTrackedIssues) {
      return undefined;
    }
    const resolution = await options.resolveTrackedIssues();
    if (resolution.kind === 'skip') {
      return undefined;
    }
    return {
      trackedIssues: resolution.trackedIssues,
      refetchTrackedIssues: options.resolveTrackedIssues
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
    await runWithRefreshLifecycleLock(async () => {
      const claim = readProviderIntakeClaim(options.state, providerKey);
      if (
        !claim ||
        claim.retry_queued !== true ||
        claim.retry_due_at !== expectedDueAt
      ) {
        return;
      }

      const claimRuns = await discoverProviderIssueRuns(options.paths.runDir, {
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
        await persistState();
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
        const discoveredReleasedRuns = await discoverProviderIssueRuns(options.paths.runDir, {
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
          releasedRun?.issueUpdatedAt ?? releasedRun?.startedAt ?? null
        );
        const releasedWebhookTiming = compareTrackedIssueUpdatedAt({
          existingIssueUpdatedAt: releasedClaimIssueUpdatedAt,
          nextIssueUpdatedAt: input.trackedIssue.updated_at
        });
        const releaseCancelPending =
          shouldAttemptReleaseCancel(releasedRun) ||
          hasPendingReleaseCancel(releasedRun?.manifestPath ?? existing.run_manifest_path);
        const pendingReleasedReopen = shouldReopenReleasedClaimAtCurrentTimestamp({
          claim: existing,
          trackedIssue: input.trackedIssue
        });
        const replayBlockedByReleasedMetadata =
          releasedWebhookTiming === 'older' ||
          (
            releasedWebhookTiming === 'equal' &&
            !pendingReleasedReopen
          );
        const preserveReleasedIssueMetadata = replayBlockedByReleasedMetadata;
        const newerWebhookBlockedByDrain =
          releaseCancelPending &&
          (
            releasedWebhookTiming === 'newer' ||
            releasedWebhookTiming === 'unknown'
          );
        if (
          releaseCancelPending ||
          replayBlockedByReleasedMetadata
        ) {
          const claim = await upsertProviderClaimAndPersist({
            ...claimBase,
            issue_identifier:
              newerWebhookBlockedByDrain
                ? claimBase.issue_identifier
                : preserveReleasedIssueMetadata
                  ? existing.issue_identifier
                  : claimBase.issue_identifier,
            issue_title:
              newerWebhookBlockedByDrain
                ? claimBase.issue_title
                : preserveReleasedIssueMetadata
                  ? existing.issue_title
                  : claimBase.issue_title,
            issue_state:
              newerWebhookBlockedByDrain
                ? claimBase.issue_state
                : preserveReleasedIssueMetadata
                  ? existing.issue_state
                  : claimBase.issue_state,
            issue_state_type:
              newerWebhookBlockedByDrain
                ? claimBase.issue_state_type
                : preserveReleasedIssueMetadata
                  ? existing.issue_state_type
                  : claimBase.issue_state_type,
            issue_updated_at:
              newerWebhookBlockedByDrain
                ? claimBase.issue_updated_at
                : preserveReleasedIssueMetadata
                  ? existing.issue_updated_at
                  : claimBase.issue_updated_at,
            issue_viewer_id:
              newerWebhookBlockedByDrain
                ? claimBase.issue_viewer_id
                : preserveReleasedIssueMetadata
                  ? existing.issue_viewer_id ?? null
                  : claimBase.issue_viewer_id,
            issue_viewer_auth_fingerprint:
              newerWebhookBlockedByDrain
                ? claimBase.issue_viewer_auth_fingerprint
                : preserveReleasedIssueMetadata
                  ? existing.issue_viewer_auth_fingerprint ?? null
                  : claimBase.issue_viewer_auth_fingerprint,
            issue_assignee_id:
              newerWebhookBlockedByDrain
                ? claimBase.issue_assignee_id
                : preserveReleasedIssueMetadata
                  ? existing.issue_assignee_id ?? null
                  : claimBase.issue_assignee_id,
            issue_assignee_name:
              newerWebhookBlockedByDrain
                ? claimBase.issue_assignee_name
                : preserveReleasedIssueMetadata
                  ? existing.issue_assignee_name ?? null
                  : claimBase.issue_assignee_name,
            issue_blocked_by:
              newerWebhookBlockedByDrain
                ? claimBase.issue_blocked_by
                : preserveReleasedIssueMetadata
                  ? existing.issue_blocked_by
                  : claimBase.issue_blocked_by,
            task_id: releasedRun?.taskId ?? existing.task_id,
            mapping_source: existing.mapping_source,
            state: 'released',
            reason:
              newerWebhookBlockedByDrain
                ? markProviderIssueReleasedPendingReopen(existing.reason ?? null)
                : existing.reason ?? 'provider_issue_released',
            run_id: releasedRun?.runId ?? existing.run_id,
            run_manifest_path: releasedRun?.manifestPath ?? existing.run_manifest_path,
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
          const existingRuns = await discoverProviderIssueRuns(options.paths.runDir, {
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

      if (existing && eligibility.claimReason === 'provider_issue_handoff_owned') {
        const discoveredRuns = await discoverProviderIssueRuns(options.paths.runDir, {
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
          const trackedIssueFields = buildFreshTrackedIssueClaimFields(existing, input.trackedIssue);
          const reactivatedMergeCloseoutReset =
            existing.reason === 'provider_issue_rehydrated_active_run'
              ? {}
              : { review_promotion: null, merge_closeout: null };
          const claim = await upsertProviderClaimAndPersist({
            ...existing,
            ...trackedIssueFields,
            launch_source: undefined,
            launch_token: undefined,
            task_id: activeRun.taskId,
            state: 'running',
            reason: 'provider_issue_rehydrated_active_run',
            run_id: activeRun.runId,
            run_manifest_path: activeRun.manifestPath,
            accepted_at: existing.accepted_at,
            last_delivery_id: input.deliveryId,
            last_event: input.event,
            last_action: input.action,
            last_webhook_timestamp: input.webhookTimestamp,
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

      const discoveredRuns = await discoverProviderIssueRuns(options.paths.runDir, {
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
        const claim = await upsertProviderClaimAndPersist({
          ...latestClaimBase,
          task_id: activeRun.taskId,
          mapping_source: mappingSource,
          state: 'running',
          reason: 'provider_issue_run_already_active',
          run_id: activeRun.runId,
          run_manifest_path: activeRun.manifestPath,
        });
        return { kind: 'ignored', reason: 'provider_issue_run_already_active', claim };
      }

      if (latestExisting && (latestExisting.state === 'starting' || latestExisting.state === 'resuming')) {
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
      if (latestRun && latestRun.status && RESUME_ELIGIBLE_STATUSES.has(latestRun.status)) {
        if (hasPendingReleaseCancel(releasedRun?.manifestPath ?? latestRun.manifestPath)) {
          const claim = await upsertProviderClaimAndPersist({
            ...latestClaimBase,
            task_id: latestRun.taskId,
            mapping_source: latestExisting?.mapping_source ?? mappingSource,
            state: latestExisting?.state ?? 'ignored',
            reason: latestExisting?.reason ?? 'provider_issue_release_cancel_inflight',
            run_id: latestRun.runId,
            run_manifest_path: latestRun.manifestPath,
          });
          return { kind: 'ignored', reason: 'provider_issue_release_cancel_inflight', claim };
        }
        const claim = await upsertProviderClaimAndPersist({
          ...latestClaimBase,
          task_id: latestRun.taskId,
          mapping_source: latestExisting?.mapping_source ?? mappingSource,
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          run_id: latestRun.runId,
          run_manifest_path: latestRun.manifestPath,
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

      // Older manifests may predate explicit issue_updated_at recording. Fall back to the
      // run's started_at so restart-time duplicate deliveries remain older than the
      // completed child run. Direct webhook intake is not the scheduler-owned relaunch
      // path after a successful worker exit, so newer issue updates stay pending until
      // refresh can relaunch unless we are retrying an explicit failed relaunch attempt.
      const latestCompletedClaimIssueUpdatedAt =
        latestExisting?.state === 'completed' ? latestExisting.issue_updated_at ?? null : null;
      const latestCompletedIssueUpdatedAt = selectMostRecentTrackedIssueUpdatedAt(
        latestCompletedClaimIssueUpdatedAt,
        latestRun?.issueUpdatedAt ?? latestRun?.startedAt ?? null
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
        if (!retryingFailedRelaunch) {
          if (
            input.trackedIssue.updated_at === null ||
            isTrackedIssueNonIncreasing({
              existingIssueUpdatedAt: latestCompletedIssueUpdatedAt,
              nextIssueUpdatedAt: input.trackedIssue.updated_at
            })
          ) {
            const claim = await upsertProviderClaimAndPersist({
              ...latestClaimBase,
              task_id: latestRun.taskId,
              mapping_source: mappingSource,
              state: 'completed',
              reason: 'provider_issue_run_already_completed',
              run_id: latestRun.runId,
              run_manifest_path: latestRun.manifestPath,
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

      const launchToken = createProviderLaunchToken();
      const inflightClaimSnapshot = captureProviderStateSnapshot();
      const inflightClaim = upsertProviderIntakeClaim(options.state, {
        ...latestClaimBase,
        task_id: taskId,
        mapping_source: mappingSource,
        state: 'starting',
        reason: 'provider_issue_start_launched',
        run_id: null,
        run_manifest_path: null,
        launch_source: PROVIDER_LAUNCH_SOURCE,
        launch_token: launchToken,
        review_promotion: null,
        merge_closeout: null,
        ...buildProviderRetryLaunchFields({
          claim: latestRetryStateBase,
          previousRun: latestRun,
          preserveCurrentAttempt: latestExisting?.retry_queued === true,
          seedFromPreviousRun: retryingFailedRelaunch
        })
      });
      await persistStateOrRollback(inflightClaimSnapshot);
      let startedRun: { runId: string; manifestPath: string } | null = null;
      try {
        startedRun = await options.launcher.start({
          taskId,
          pipelineId: startPipelineId,
          provider: 'linear',
          issueId: input.trackedIssue.id,
          issueIdentifier: input.trackedIssue.identifier,
          issueUpdatedAt: input.trackedIssue.updated_at,
          workspaceId: input.trackedIssue.workspace_id,
          teamId: input.trackedIssue.team_id,
          projectId: input.trackedIssue.project_id,
          launchToken
        });
      } catch (error) {
        const claim = await upsertProviderClaimAndPersist({
          ...latestClaimBase,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'handoff_failed',
          reason: `provider_issue_start_failed:${(error as Error)?.message ?? String(error)}`,
          run_id: null,
          run_manifest_path: null,
          launch_source: PROVIDER_LAUNCH_SOURCE,
          launch_token: launchToken,
          review_promotion: null,
          merge_closeout: null,
          ...buildQueuedProviderRetryFields({
            claim: latestRetryStateBase,
            previousRun: latestRun,
            error: (error as Error)?.message ?? String(error),
            preserveCurrentAttempt: latestExisting?.retry_queued === true,
            delayType: 'failure'
          })
        }, { rollbackOnPersistFailure: false });
        throw new Error(`Failed to start provider issue ${input.trackedIssue.identifier}: ${claim.reason}`);
      }
      const claim = startedRun
        ? upsertProviderIntakeClaim(options.state, {
            ...latestClaimBase,
            task_id: taskId,
            mapping_source: mappingSource,
            state: 'starting',
            reason: 'provider_issue_start_launched',
            run_id: startedRun.runId,
            run_manifest_path: startedRun.manifestPath,
            launch_source: PROVIDER_LAUNCH_SOURCE,
            launch_token: launchToken,
            review_promotion: null,
            merge_closeout: null,
            ...buildProviderRetryLaunchFields({
              claim: latestRetryStateBase,
              previousRun: latestRun,
              preserveCurrentAttempt: latestExisting?.retry_queued === true,
              seedFromPreviousRun: retryingFailedRelaunch
            })
          })
        : inflightClaim;
      try {
        if (startedRun) {
          await persistState();
          options.publishRuntime?.('provider-intake.start');
        }
        return { kind: 'start', reason: 'provider_issue_start_launched', claim };
      } finally {
        scheduleBestEffortRehydrateWithRefreshLock();
      }
    };

  const runRefreshCycle = async (pollInput?: ProviderIssueHandoffPollInput): Promise<void> => {
    const trackedIssueRefetch = pollInput?.refetchTrackedIssues ?? null;
    await runWithRefreshLifecycleLock(async () => {
      const result = await rehydrateNow();
      if (result.hasPendingClaims) {
        scheduleBestEffortRehydrateWithRefreshLock();
      }

      const trackedIssuesByKey = pollInput ? buildTrackedIssuePollMap(pollInput.trackedIssues) : null;
      const consumedTrackedIssueKeys = new Set<string>();
      if (!options.resolveTrackedIssue && !trackedIssuesByKey) {
        return;
      }

      const discoveredRuns = await discoverProviderIssueRuns(options.paths.runDir);
      const runsByProviderIssue = groupProviderIssueRuns(discoveredRuns);
      const existingProviderKeys = new Set(options.state.claims.map((claim) => claim.provider_key));
      const pollDispatchBudget = createProviderPollDispatchBudget(options.readFeatureToggles?.() ?? null);
      const occupiedPollDispatchKeys = new Set<string>();
      const noteOccupiedPollDispatchSlot = (
        providerKey: string,
        trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>
      ): void => {
        if (occupiedPollDispatchKeys.has(providerKey)) {
          return;
        }
        occupiedPollDispatchKeys.add(providerKey);
        pollDispatchBudget.noteOccupied(trackedIssue);
      };

      for (const run of filterProviderIssueRunsForStartPipeline(discoveredRuns, startPipelineId)) {
        if (run.status !== 'in_progress') {
          continue;
        }
        const providerKey = buildProviderIssueKey(run.provider, run.issueId);
        if (existingProviderKeys.has(providerKey)) {
          continue;
        }
        noteOccupiedPollDispatchSlot(
          providerKey,
          trackedIssuesByKey?.get(providerKey) ?? { state: null }
        );
      }

      for (const claim of [...options.state.claims]) {
        const claimProviderKey = buildProviderIssueKey(claim.provider, claim.issue_id);
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
          const resolution = await resolveRefreshTrackedIssueResolution({
            claim,
            trackedIssuesByKey,
            consumedTrackedIssueKeys
          });

          if (resolution.kind === 'skip') {
            if (claim.state === 'released') {
              void retryReleaseCancel({
                releaseRun,
                reason: claim.reason ?? 'provider_issue_released'
              });
            }
            continue;
          }
          if (resolution.kind === 'release') {
            await releaseClaim({
              claim,
              nextReason: `provider_issue_released:${resolution.reason}`,
              releaseRun,
              trackedIssue: resolution.trackedIssue,
              cleanupWorkspace: resolution.cleanupWorkspace
            });
            continue;
          }

          if (
            claim.state === 'released' &&
            shouldAttemptReleaseCancel(releaseRun) &&
            releaseRun?.status !== null
          ) {
            void retryReleaseCancel({
              releaseRun,
              reason: claim.reason ?? 'provider_issue_released'
            });
            continue;
          }

          if (claim.state === 'released') {
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
              const reviewPromotionClaim = await maybeHandleReviewHandoffPromotion({
                claim: currentClaim,
                trackedIssue: resolution.trackedIssue,
                latestRun: resolveProviderClaimRunIdentity(currentClaim, attachableClaimRuns) ?? latestRun
              });
              if (reviewPromotionClaim) {
                noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
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
              continue;
            }
            if (!pollDispatchBudget.canDispatch(resolution.trackedIssue)) {
              continue;
            }
            await launchStartForTrackedIssue({
              claim,
              trackedIssue: resolution.trackedIssue,
              reason: 'provider_issue_refresh_start_launched',
              previousRun: latestRun
            });
            noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
            continue;
          }

          if (resolution.kind === 'owned') {
            if (activeRun) {
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
                noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
                continue;
              }
              if (trackedIssueFreshEnoughForClaim) {
                const mergeCloseoutClaim = await maybeHandleRecoveredActiveRunMergedCloseout({
                  claim,
                  trackedIssue: resolution.trackedIssue,
                  latestRun: activeRun
                });
                if (mergeCloseoutClaim) {
                  noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
                  continue;
                }
              }
              const trackedIssueFields = buildFreshTrackedIssueClaimFields(
                claim,
                resolution.trackedIssue
              );
              const reactivatedMergeCloseoutReset =
                claim.reason === 'provider_issue_rehydrated_active_run'
                  ? {}
                  : { review_promotion: null, merge_closeout: null };
              const transitioned = hasProviderClaimTransitioned(claim, {
                ...trackedIssueFields,
                state: 'running',
                reason: 'provider_issue_rehydrated_active_run',
                task_id: activeRun.taskId,
                run_id: activeRun.runId,
                run_manifest_path: activeRun.manifestPath,
                ...reactivatedMergeCloseoutReset
              });
              const refreshActiveRunSnapshot = captureProviderStateSnapshot();
              upsertProviderIntakeClaim(options.state, {
                ...claim,
                ...trackedIssueFields,
                launch_source: undefined,
                launch_token: undefined,
                task_id: activeRun.taskId,
                state: 'running',
                reason: 'provider_issue_rehydrated_active_run',
                run_id: activeRun.runId,
                run_manifest_path: activeRun.manifestPath,
                ...reactivatedMergeCloseoutReset
              });
              if (transitioned) {
                await persistStateOrRollback(refreshActiveRunSnapshot);
                options.publishRuntime?.('provider-intake.refresh');
              }
              noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
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
                noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
                continue;
              }
              const mergeCloseoutClaim = await maybeHandleDeterministicMergingCloseout({
                claim: currentClaim,
                trackedIssue: resolution.trackedIssue,
                latestRun
              });
              if (mergeCloseoutClaim) {
                noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
                continue;
              }
            }
            await retainOwnedHandoffClaim({
              claim: currentClaim,
              trackedIssue: resolution.trackedIssue,
              run: resolveProviderClaimRunIdentity(currentClaim, attachableClaimRuns) ?? latestRun,
              state: currentClaim.state,
              reason: 'provider_issue_handoff_owned'
            });
            noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
            continue;
          }

          if (claim.state === 'starting' || claim.state === 'resuming') {
            noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
            continue;
          }

          if (activeRun) {
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
              noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
              continue;
            }
            if (trackedIssueFreshEnoughForClaim) {
              const mergeCloseoutClaim = await maybeHandleRecoveredActiveRunMergedCloseout({
                claim,
                trackedIssue: resolution.trackedIssue,
                latestRun: activeRun
              });
              if (mergeCloseoutClaim) {
                noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
                continue;
              }
            }
            const trackedIssueFields = buildFreshTrackedIssueClaimFields(
              claim,
              resolution.trackedIssue
            );
            const reactivatedMergeCloseoutReset =
              claim.reason === 'provider_issue_rehydrated_active_run'
                ? {}
                : { review_promotion: null, merge_closeout: null };
            const transitioned = hasProviderClaimTransitioned(claim, {
              ...trackedIssueFields,
              state: 'running',
              reason: 'provider_issue_rehydrated_active_run',
              task_id: activeRun.taskId,
              run_id: activeRun.runId,
              run_manifest_path: activeRun.manifestPath,
              ...reactivatedMergeCloseoutReset
            });
            const refreshActiveRunSnapshot = captureProviderStateSnapshot();
            upsertProviderIntakeClaim(options.state, {
              ...claim,
              ...trackedIssueFields,
              launch_source: undefined,
              launch_token: undefined,
              task_id: activeRun.taskId,
              state: 'running',
              reason: 'provider_issue_rehydrated_active_run',
              run_id: activeRun.runId,
              run_manifest_path: activeRun.manifestPath,
              ...reactivatedMergeCloseoutReset
            });
            if (transitioned) {
              await persistStateOrRollback(refreshActiveRunSnapshot);
              options.publishRuntime?.('provider-intake.refresh');
            }
            noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
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
              noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
              continue;
            }
          }
          if (currentClaim.retry_queued === true) {
            noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
            continue;
          }

          if (latestRun && latestRun.status && RESUME_ELIGIBLE_STATUSES.has(latestRun.status)) {
            const queuedRetryFields = buildQueuedProviderRetryFields({
              claim: currentClaim,
              previousRun: latestRun,
              error: resolveProviderRetryErrorFromRun(latestRun),
              delayType: 'failure'
            });
            const transitioned = hasProviderClaimTransitioned(currentClaim, {
              ...buildTrackedIssueClaimFields(resolution.trackedIssue),
              state: 'resumable',
              reason: 'provider_issue_rehydrated_resumable_run',
              task_id: latestRun.taskId,
              run_id: latestRun.runId,
              run_manifest_path: latestRun.manifestPath,
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
              ...queuedRetryFields
            });
            if (transitioned) {
              await persistStateOrRollback(refreshResumableSnapshot);
              options.publishRuntime?.('provider-intake.refresh');
            }
            if (queuedRetryFields.retry_queued === true) {
              noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
            }
            continue;
          }

          if (latestRun?.status === 'succeeded') {
            const completedState = buildProviderCompletedRunRehydrateState({
              claim: currentClaim,
              run: latestRun
            });
            const transitioned = hasProviderClaimTransitioned(currentClaim, {
              ...buildTrackedIssueClaimFields(resolution.trackedIssue),
              ...completedState
            });
            const refreshCompletedSnapshot = captureProviderStateSnapshot();
            upsertProviderIntakeClaim(options.state, {
              ...currentClaim,
              ...buildTrackedIssueClaimFields(resolution.trackedIssue),
              ...completedState
            });
            if (transitioned) {
              await persistStateOrRollback(refreshCompletedSnapshot);
              options.publishRuntime?.('provider-intake.refresh');
            }
            if (completedState.retry_queued === true) {
              noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
            }
            continue;
          }

          if (!latestRun) {
            if (!pollDispatchBudget.canDispatch(resolution.trackedIssue)) {
              continue;
            }
            await launchStartForTrackedIssue({
              claim: currentClaim,
              trackedIssue: resolution.trackedIssue,
              reason: 'provider_issue_refresh_start_launched'
            });
            noteOccupiedPollDispatchSlot(claimProviderKey, resolution.trackedIssue);
          }
        } catch (error) {
          logger.warn(
            `Provider issue refresh reconcile failed for ${claimProviderKey}: ${
              (error as Error)?.message ?? String(error)
            }`
          );
          continue;
        }
      }

      if (!pollInput) {
        return;
      }

      await maybeRunProviderOperatorAutopilotCycle({
        pollInput,
        sourceSetup: resolveMergeCloseoutSourceSetup()
      });

      for (const trackedIssue of sortLiveLinearTrackedIssuesForDispatch(pollInput.trackedIssues)) {
        const providerKey = buildProviderIssueKey(trackedIssue.provider, trackedIssue.id);
        if (existingProviderKeys.has(providerKey) || consumedTrackedIssueKeys.has(providerKey)) {
          continue;
        }
        if (!pollDispatchBudget.canDispatch(trackedIssue)) {
          if (!pollDispatchBudget.hasGlobalSlots()) {
            break;
          }
          continue;
        }
        consumedTrackedIssueKeys.add(providerKey);
        try {
          const handoffResult = await processTrackedIssueCandidate({
            trackedIssue,
            deliveryId: null,
            event: 'poll_tick',
            action: 'reconcile',
            webhookTimestamp: null
          });
          if (handoffResult.kind !== 'ignored' || handoffResult.claim.retry_queued === true) {
            noteOccupiedPollDispatchSlot(providerKey, trackedIssue);
          }
        } catch (error) {
          logger.warn(
            `Provider issue poll dispatch failed for ${providerKey}: ${
              (error as Error)?.message ?? String(error)
            }`
          );
          continue;
        }
      }
    });
  };

  const maybeRunProviderOperatorAutopilotCycle = async (input: {
    pollInput: ProviderIssueHandoffPollInput;
    sourceSetup: DispatchPilotSourceSetup | null;
  }): Promise<void> => {
    if (!options.providerWorkflowConfigStore || !runOperatorAutopilot) {
      return;
    }
    let providerWorkflow: Awaited<ReturnType<ProviderWorkflowConfigStore['refresh']>>;
    try {
      providerWorkflow = await options.providerWorkflowConfigStore.refresh();
    } catch (error) {
      logger.warn(
        `[provider-operator-autopilot] Failed to refresh provider workflow config: ${
          (error as Error)?.message ?? String(error)
        }`
      );
      return;
    }
    const autopilotConfig = resolveProviderOperatorAutopilotConfigFromPayload(providerWorkflow);
    if (!autopilotConfig) {
      return;
    }
    const previousResult = providerWorkflow.operator_autopilot?.last_result ?? null;
    let nextResult: ProviderOperatorAutopilotResult;
    let loggedAutopilotFailure = false;
    try {
      nextResult = await runOperatorAutopilot({
        tracked_issues: input.pollInput.trackedIssues,
        claims: options.state.claims,
        config: autopilotConfig,
        source_setup: input.sourceSetup,
        env: process.env,
        previous_result: previousResult
      });
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      nextResult = {
        recorded_at: isoTimestamp(),
        status: 'failed',
        summary: 'Operator autopilot evaluation failed.',
        error: message,
        actions: [],
        holds: [],
        pending_actions:
          previousResult?.pending_actions.map((pendingAction) => ({ ...pendingAction })) ?? []
      };
      loggedAutopilotFailure = true;
      logger.warn(`[provider-operator-autopilot] ${nextResult.summary} error=${message}`);
    }
    const resultChanged = !areProviderOperatorAutopilotResultsMeaningfullyEqual(
      previousResult,
      nextResult
    );
    if (
      providerWorkflow.operator_autopilot?.audit_path &&
      resultChanged
    ) {
      try {
        await appendOperatorAutopilotAuditResult(
          providerWorkflow.operator_autopilot.audit_path,
          nextResult
        );
      } catch (error) {
        logger.warn(
          `[provider-operator-autopilot] Failed to append audit result path=${
            providerWorkflow.operator_autopilot.audit_path
          }: ${(error as Error)?.message ?? String(error)}`
        );
      }
    }
    if (resultChanged) {
      options.providerWorkflowConfigStore.recordOperatorAutopilotResult(nextResult);
    }
    if (resultChanged && nextResult.status === 'failed' && !loggedAutopilotFailure) {
      logger.warn(
        `[provider-operator-autopilot] ${nextResult.summary} error=${nextResult.error ?? 'unknown'}`
      );
    }
  };

  return {
    async handleAcceptedTrackedIssue(input): Promise<ProviderIssueHandoffResult> {
      return await processTrackedIssueCandidate(input);
    },

    async rehydrate(): Promise<void> {
      await runWithRefreshLifecycleLock(async () => {
        const result = await rehydrateNow({ refreshTrackedIssueMetadata: true });
        if (result.hasPendingClaims) {
          scheduleBestEffortRehydrateWithRefreshLock();
        }
      });
    },

    async refresh(): Promise<void> {
      await runRefreshCycle(await resolveRefreshPollInput());
    },

    async poll(input: ProviderIssueHandoffPollInput): Promise<void> {
      await runRefreshCycle(input);
    }
  };
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

function isTrackedIssueNonIncreasing(input: {
  existingIssueUpdatedAt: string | null;
  nextIssueUpdatedAt: string | null;
}): boolean {
  const comparison = compareTrackedIssueUpdatedAt(input);
  return comparison === 'older' || comparison === 'equal';
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

function markProviderIssueReleasedPendingReopen(reason: string | null): string {
  if (isProviderIssueReleasedPendingReopen(reason)) {
    return reason as string;
  }
  return `${PROVIDER_RELEASED_PENDING_REOPEN_PREFIX}${reason ?? 'provider_issue_released'}`;
}

function shouldReopenReleasedClaimAtCurrentTimestamp(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'reason'>;
  trackedIssue: Pick<
    LiveLinearTrackedIssue,
    'state' | 'state_type' | 'viewer_id' | 'assignee_id' | 'blocked_by'
  >;
}): boolean {
  if (isProviderIssueReleasedPendingReopen(input.claim.reason ?? null)) {
    return true;
  }
  if (input.claim.reason !== 'provider_issue_released:assignee_changed') {
    return false;
  }
  return isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(input.trackedIssue);
}

function shouldReopenReleasedClaimOnRefresh(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'reason' | 'issue_updated_at'>;
  releaseRun: ProviderIssueRunRecord | null;
  trackedIssue: Pick<
    LiveLinearTrackedIssue,
    'updated_at' | 'state' | 'state_type' | 'viewer_id' | 'assignee_id' | 'blocked_by'
  >;
}): boolean {
  if (isProviderIssueReleasedPendingReopen(input.claim.reason ?? null)) {
    return true;
  }
  const latestReleasedIssueUpdatedAt = selectMostRecentTrackedIssueUpdatedAt(
    input.claim.issue_updated_at ?? null,
    input.releaseRun?.issueUpdatedAt ?? input.releaseRun?.startedAt ?? null
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

function assessProviderTrackedIssueEligibility(
  trackedIssue: Pick<
    LiveLinearTrackedIssue,
    'state' | 'state_type' | 'viewer_id' | 'assignee_id' | 'blocked_by'
  >,
  options: {
    hasExistingClaim?: boolean;
  } = {}
): ProviderTrackedIssueEligibility {
  const workflowState = classifyProviderLinearWorkflowState(trackedIssue);
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

function createProviderPollDispatchBudget(featureToggles: Record<string, unknown> | null | undefined): {
  canDispatch(trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>): boolean;
  noteOccupied(trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>): void;
  hasGlobalSlots(): boolean;
} {
  const limits = resolveProviderPollDispatchLimits(featureToggles);
  let occupiedGlobalSlots = 0;
  const occupiedStateSlots = new Map<string, number>();

  const hasGlobalSlots = (): boolean => occupiedGlobalSlots < limits.maxConcurrentAgents;

  const canDispatch = (trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>): boolean => {
    if (!hasGlobalSlots()) {
      return false;
    }
    const normalizedState = normalizeProviderLinearWorkflowState(trackedIssue.state);
    if (!normalizedState) {
      return true;
    }
    const usedSlots = occupiedStateSlots.get(normalizedState) ?? 0;
    const stateLimit = limits.maxConcurrentAgentsByState.get(normalizedState) ?? limits.maxConcurrentAgents;
    return usedSlots < stateLimit;
  };

  const noteOccupied = (trackedIssue: Pick<LiveLinearTrackedIssue, 'state'>): void => {
    occupiedGlobalSlots += 1;
    const normalizedState = normalizeProviderLinearWorkflowState(trackedIssue.state);
    if (!normalizedState) {
      return;
    }
    occupiedStateSlots.set(normalizedState, (occupiedStateSlots.get(normalizedState) ?? 0) + 1);
  };

  return {
    canDispatch,
    noteOccupied,
    hasGlobalSlots
  };
}

async function cleanupReleasedProviderWorkspace(input: {
  repoRoot: string;
  taskId: string;
  manifestPath: string | null;
  issueId: string;
  issueIdentifier: string | null;
  providerWorkflowConfigStore: ProviderWorkflowConfigStore | null;
  runTerminalCleanup: typeof runProviderTerminalCleanup;
}): Promise<void> {
  const workspacePath = await resolveProviderCleanupWorkspacePath(
    input.repoRoot,
    input.taskId,
    input.manifestPath
  );
  await maybeRunReleasedProviderTerminalCleanup({
    issueId: input.issueId,
    issueIdentifier: input.issueIdentifier,
    workspacePath,
    providerWorkflowConfigStore: input.providerWorkflowConfigStore,
    runTerminalCleanup: input.runTerminalCleanup
  });
  await cleanupProviderWorkspace(input.repoRoot, workspacePath);
}

async function maybeRunReleasedProviderTerminalCleanup(input: {
  issueId: string;
  issueIdentifier: string | null;
  workspacePath: string;
  providerWorkflowConfigStore: ProviderWorkflowConfigStore | null;
  runTerminalCleanup: typeof runProviderTerminalCleanup;
}): Promise<void> {
  try {
    const providerWorkflow = input.providerWorkflowConfigStore
      ? await input.providerWorkflowConfigStore.refresh()
      : null;
    const cleanupConfig = resolveProviderTerminalCleanupConfigFromPayload(providerWorkflow);
    if (!cleanupConfig) {
      return;
    }
    const cleanupResult = await input.runTerminalCleanup({
      issueId: input.issueId,
      issueIdentifier: input.issueIdentifier,
      workspacePath: input.workspacePath,
      config: cleanupConfig,
      env: process.env
    });
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
    operator_autopilot?: {
      enabled: boolean;
      backlog_promotion: {
        enabled: boolean;
        state_name: string;
        target_state_name: string;
      };
      review_handoff_rework: {
        enabled: boolean;
        target_state_name: string;
        excluded_action_required_reasons: string[];
      };
      post_merge_rollout: {
        enabled: boolean;
        summary: string;
      };
    } | null;
  } | null
): ProviderOperatorAutopilotConfig | null {
  const operatorAutopilot = providerWorkflow?.operator_autopilot ?? null;
  if (!operatorAutopilot) {
    return null;
  }
  return {
    enabled: operatorAutopilot.enabled,
    backlog_promotion: {
      enabled: operatorAutopilot.backlog_promotion.enabled,
      state_name: operatorAutopilot.backlog_promotion.state_name,
      target_state_name: operatorAutopilot.backlog_promotion.target_state_name
    },
    review_handoff_rework: {
      enabled: operatorAutopilot.review_handoff_rework.enabled,
      target_state_name: operatorAutopilot.review_handoff_rework.target_state_name,
      excluded_action_required_reasons: [
        ...operatorAutopilot.review_handoff_rework.excluded_action_required_reasons
      ]
    },
    post_merge_rollout: {
      enabled: operatorAutopilot.post_merge_rollout.enabled,
      summary: operatorAutopilot.post_merge_rollout.summary
    }
  };
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
    provider: 'linear';
    issueId: string;
  }
): Promise<ProviderIssueRunRecord[]> {
  const runsRoot = resolve(currentRunDir, '..', '..', '..');
  const taskEntries = await readDirectoryNames(runsRoot);
  const discovered: ProviderIssueRunRecord[] = [];

  for (const taskEntry of taskEntries) {
    if (taskEntry === 'local-mcp') {
      continue;
    }
    const cliRoot = join(runsRoot, taskEntry, 'cli');
    const runEntries = await readDirectoryNames(cliRoot);
    for (const runEntry of runEntries) {
      const manifestPath = join(cliRoot, runEntry, 'manifest.json');
      const manifest = await readJsonFile<Record<string, unknown>>(manifestPath);
      if (!manifest) {
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
      if (input && (issueProvider !== input.provider || issueId !== input.issueId)) {
        continue;
      }
      const proof = await readBestEffortJsonFile<ProviderLinearWorkerProofRecord>(
        join(cliRoot, runEntry, PROVIDER_LINEAR_WORKER_PROOF_FILENAME)
      );
      discovered.push({
        provider: issueProvider,
        issueId,
        taskId: readStringValue(manifest, 'task_id') ?? taskEntry,
        runId: readStringValue(manifest, 'run_id') ?? runEntry,
        manifestPath,
        pipelineId,
        status: resolveProviderIssueRunStatus(manifest, proof),
        proofTerminalStatus: resolveAuthoritativeProviderLinearWorkerTerminalStatus(
          manifest,
          proof
        ),
        summary: resolveProviderIssueRunSummary(manifest, proof),
        issueUpdatedAt: readStringValue(manifest, 'issue_updated_at'),
        startedAt: readStringValue(manifest, 'started_at'),
        updatedAt: resolveProviderIssueRunUpdatedAt(manifest, proof)
      });
    }
  }

  return discovered.sort((left, right) => {
    return Date.parse(right.updatedAt ?? '') - Date.parse(left.updatedAt ?? '');
  });
}

function resolveProviderIssueRunStatus(
  manifest: Record<string, unknown>,
  proof: ProviderLinearWorkerProofRecord | null
): string | null {
  const manifestStatus = readStringValue(manifest, 'status');
  if (
    manifestStatus === 'in_progress' &&
    hasStaleProviderLinearWorkerInProgressProof(manifest, proof)
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
  proof: ProviderLinearWorkerProofRecord | null
): boolean {
  if (!proof) {
    return false;
  }
  const proofRecord = proof as Record<string, unknown>;
  if (readStringValue(proofRecord, 'owner_status') !== 'in_progress') {
    return false;
  }
  const ownerPhase = readStringValue(proofRecord, 'owner_phase');
  if (!ownerPhase || ownerPhase === 'ended') {
    return false;
  }
  const runStartedAt = readStringValue(manifest, 'started_at');
  if (!runStartedAt) {
    return false;
  }
  return !isProviderLinearWorkerProofFreshForStage(proofRecord, runStartedAt);
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
  const manifestSummary = readStringValue(manifest, 'summary');
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

function buildProviderRetryLaunchFields(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'retry_queued' | 'retry_attempt'>;
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
    retry_error: null
  };
}

function buildQueuedProviderRetryFields(input: {
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
  const retryAttempt = input.preserveCurrentAttempt
    ? resolveCurrentProviderRetryAttempt(input.claim, input.previousRun)
    : resolveNextProviderRetryAttempt(input.claim, input.previousRun);
  if (retryAttempt === null) {
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
  return run.summary ?? null;
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
    resolveProviderReviewPromotionClaimState(input.claim.review_promotion) === 'handoff_failed'
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
    resolveProviderMergeCloseoutClaimState(input.claim.merge_closeout) === 'handoff_failed'
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
            | 'issue_viewer_id'
            | 'issue_viewer_auth_fingerprint'
            | 'issue_assignee_id'
            | 'issue_assignee_name'
            | 'issue_blocked_by'
          >
        >
    )
  ) & Partial<Pick<ProviderIntakeClaimRecord, 'review_promotion' | 'merge_closeout'>>
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
      pipelineId: null,
      status: null,
      proofTerminalStatus: null,
      summary: null,
      issueUpdatedAt: claim.issue_updated_at,
      startedAt: null,
      updatedAt: claim.updated_at
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
    'retry_queued' | 'issue_state' | 'issue_state_type'
  >
): boolean {
  if (claim.retry_queued === true) {
    return true;
  }
  return classifyProviderLinearWorkflowState({
    state: claim.issue_state,
    state_type: claim.issue_state_type
  }).isActive;
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

function resolveTrackedIssuePollResolution(
  claim: Pick<ProviderIntakeClaimRecord, 'provider' | 'issue_id'>,
  trackedIssuesByKey: Map<string, LiveLinearTrackedIssue>
):
  | ProviderTrackedIssueRefreshDisposition {
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
  claim: Pick<ProviderIntakeClaimRecord, 'provider' | 'issue_id'>,
  trackedIssuesByKey: Map<string, LiveLinearTrackedIssue>,
  resolveTrackedIssue?: CreateProviderIssueHandoffServiceOptions['resolveTrackedIssue']
):
  Promise<ProviderTrackedIssueRefreshDisposition | { kind: 'skip'; reason: string }> {
  const pollResolution = resolveTrackedIssuePollResolution(claim, trackedIssuesByKey);
  if (
    pollResolution.kind !== 'release' ||
    pollResolution.reason !== 'not_found' ||
    pollResolution.trackedIssue !== null ||
    !resolveTrackedIssue
  ) {
    return pollResolution;
  }

  const directResolution = await resolveTrackedIssue({
    provider: claim.provider,
    issueId: claim.issue_id
  });
  if (directResolution.kind === 'ready') {
    const eligibility = assessProviderTrackedIssueEligibility(directResolution.trackedIssue, {
      hasExistingClaim: true
    });
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
      trackedIssue: directResolution.trackedIssue,
      cleanupWorkspace: eligibility.cleanupWorkspace
    };
  }

  if (directResolution.kind === 'release') {
    return {
      kind: 'release',
      reason: directResolution.reason,
      trackedIssue: null,
      cleanupWorkspace: false
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
  return run?.status === 'in_progress' || run?.status === 'queued' || run?.status === null;
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

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}
