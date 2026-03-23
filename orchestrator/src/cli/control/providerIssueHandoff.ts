import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { logger } from '../../logger.js';
import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import {
  cleanupProviderWorkspace,
  resolveExplicitProviderWorkspacePathWithinRoot,
  resolveProviderWorkspacePath
} from '../run/workspacePath.js';
import {
  sortLiveLinearTrackedIssuesForDispatch,
  type LiveLinearTrackedIssue
} from './linearDispatchSource.js';
import {
  classifyProviderLinearWorkflowState,
  isProviderLinearTrackedIssueEligibleForExecution,
  normalizeProviderLinearWorkflowState,
  providerLinearTodoBlockedByNonTerminal
} from './providerLinearWorkflowStates.js';
import { callChildControlEndpoint } from './questionChildResolutionAdapter.js';
import {
  buildProviderFallbackTaskId,
  buildProviderIssueKey,
  hasQueuedProviderIntakeRetry,
  markProviderIntakeRehydrated,
  readProviderIntakeClaim,
  type ProviderLaunchSource,
  type ProviderIntakeClaimRecord,
  type ProviderIntakeState,
  type ProviderTaskMappingSource,
  upsertProviderIntakeClaim
} from './providerIntakeState.js';
import { createProviderIssueRetryQueue } from './providerIssueRetryQueue.js';

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
  summary: string | null;
  issueUpdatedAt: string | null;
  startedAt: string | null;
  updatedAt: string | null;
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
const DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS = 10;

type ProviderTrackedIssueEligibility =
  | { eligible: true }
  | {
      eligible: false;
      claimReason: 'provider_issue_state_not_active' | 'provider_issue_todo_blocked_by_non_terminal';
      releaseReason:
        | 'provider_issue_released:not_active'
        | 'provider_issue_released:todo_blocked_by_non_terminal';
      cleanupWorkspace: boolean;
    };

export function createProviderIssueHandoffService(
  options: CreateProviderIssueHandoffServiceOptions
): ProviderIssueHandoffService {
  const startPipelineId = options.startPipelineId ?? 'diagnostics';
  const allowedRunRoots = [resolve(options.paths.runDir, '..', '..', '..')];
  const repoRoot = resolve(options.paths.repoRoot);
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
    claims: ProviderIntakeClaimRecord[];
  };

  const captureProviderStateSnapshot = (): ProviderStateSnapshot => ({
    schema_version: options.state.schema_version,
    updated_at: options.state.updated_at,
    rehydrated_at: options.state.rehydrated_at,
    latest_provider_key: options.state.latest_provider_key,
    latest_reason: options.state.latest_reason,
    claims: options.state.claims.map((claim) => ({ ...claim }))
  });

  const restoreProviderStateSnapshot = (snapshot: ProviderStateSnapshot): void => {
    options.state.schema_version = snapshot.schema_version;
    options.state.updated_at = snapshot.updated_at;
    options.state.rehydrated_at = snapshot.rehydrated_at;
    options.state.latest_provider_key = snapshot.latest_provider_key;
    options.state.latest_reason = snapshot.latest_reason;
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

  const scheduleBestEffortRehydrateWithRefreshLock = (
    attempt = 1
  ): void => {
    if (bestEffortRehydrateTimer) {
      return;
    }
    bestEffortRehydrateTimer = setTimeout(() => {
      bestEffortRehydrateTimer = null;
      void runWithRefreshLifecycleLock(rehydrateNow)
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
      'identifier' | 'title' | 'state' | 'state_type' | 'updated_at' | 'blocked_by'
    >
  ): Pick<
    ProviderIntakeClaimRecord,
    'issue_identifier' | 'issue_title' | 'issue_state' | 'issue_state_type' | 'issue_updated_at' | 'issue_blocked_by'
  > => ({
    issue_identifier: trackedIssue.identifier,
    issue_title: trackedIssue.title,
    issue_state: trackedIssue.state,
    issue_state_type: trackedIssue.state_type,
    issue_updated_at: trackedIssue.updated_at,
    ...(trackedIssue.blocked_by === undefined ? {} : { issue_blocked_by: trackedIssue.blocked_by })
  });

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
      'identifier' | 'title' | 'state' | 'state_type' | 'updated_at' | 'blocked_by'
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
      await cleanupReleasedProviderWorkspace(repoRoot, nextTaskId, nextManifestPath);
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

  const rehydrateNow = async (): Promise<{ hasPendingClaims: boolean }> => {
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
          await cleanupReleasedProviderWorkspace(
            repoRoot,
            releasedRun?.taskId ?? claim.task_id,
            releasedRun?.manifestPath ?? claim.run_manifest_path
          );
        }
        continue;
      }

      const activeRun = attachableClaimRuns.find((run) => run.status === 'in_progress');
      if (activeRun) {
        publishRuntime ||= hasProviderClaimTransitioned(claim, {
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          task_id: activeRun.taskId,
          run_id: activeRun.runId,
          run_manifest_path: activeRun.manifestPath
        });
        upsertProviderIntakeClaim(options.state, {
          ...claim,
          launch_source: undefined,
          launch_token: undefined,
          task_id: activeRun.taskId,
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          run_id: activeRun.runId,
          run_manifest_path: activeRun.manifestPath,
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
        const queuedRetryFields = shouldQueuePostWorkerRetryClaim(claim)
          ? buildQueuedProviderRetryFields({
              claim,
              previousRun: completedRun,
              error: null,
              preserveCurrentAttempt: claim.retry_queued === true,
              preserveExistingDueAt: claim.retry_queued === true,
              delayType: 'continuation'
            })
          : clearProviderRetryFields();
        publishRuntime ||= hasProviderClaimTransitioned(claim, {
          state: 'completed',
          reason: 'provider_issue_rehydrated_completed_run',
          task_id: completedRun.taskId,
          run_id: completedRun.runId,
          run_manifest_path: completedRun.manifestPath,
          ...queuedRetryFields
        });
        upsertProviderIntakeClaim(options.state, {
          ...claim,
          launch_source: undefined,
          launch_token: undefined,
          task_id: completedRun.taskId,
          state: 'completed',
          reason: 'provider_issue_rehydrated_completed_run',
          run_id: completedRun.runId,
          run_manifest_path: completedRun.manifestPath,
          ...queuedRetryFields,
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
  }):
    Promise<
      | { kind: 'ready'; trackedIssue: LiveLinearTrackedIssue }
      | {
          kind: 'release';
          reason: string;
          trackedIssue: Pick<
            LiveLinearTrackedIssue,
            'identifier' | 'title' | 'state' | 'state_type' | 'updated_at'
          > | null;
          cleanupWorkspace: boolean;
        }
      | { kind: 'skip'; reason: string }
    > => {
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
      const eligibility = assessProviderTrackedIssueEligibility(resolution.trackedIssue);
      if (eligibility.eligible) {
        return resolution;
      }
      return {
        kind: 'release',
        reason: stripProviderIssueReleasedPrefix(eligibility.releaseReason),
        trackedIssue: resolution.trackedIssue,
        cleanupWorkspace: eligibility.cleanupWorkspace
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
      | { kind: 'ready'; trackedIssue: LiveLinearTrackedIssue }
      | {
          kind: 'release';
          reason: string;
          trackedIssue: Pick<
            LiveLinearTrackedIssue,
            'identifier' | 'title' | 'state' | 'state_type' | 'updated_at'
          > | null;
          cleanupWorkspace: boolean;
        }
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

  const resolveRetryDispatchResolution = async (
    claim: ProviderIntakeClaimRecord
  ):
    Promise<
      | { kind: 'ready'; trackedIssue: LiveLinearTrackedIssue }
      | {
          kind: 'release';
          reason: string;
          trackedIssue: Pick<
            LiveLinearTrackedIssue,
            'identifier' | 'title' | 'state' | 'state_type' | 'updated_at'
          > | null;
          cleanupWorkspace: boolean;
        }
      | { kind: 'skip'; reason: string }
    > => {
    const pollResolution = await resolveRetryDispatchResolutionFromPoll(claim);
    if (pollResolution) {
      return pollResolution;
    }

    if (!options.resolveTrackedIssue) {
      const trackedIssue = buildTrackedIssueSnapshotFromClaim(claim);
      const eligibility = assessProviderTrackedIssueEligibility(trackedIssue);
      if (eligibility.eligible) {
        return { kind: 'ready', trackedIssue };
      }
      return {
        kind: 'release',
        reason: stripProviderIssueReleasedPrefix(eligibility.releaseReason),
        trackedIssue,
        cleanupWorkspace: eligibility.cleanupWorkspace
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

      const latestRun = attachableClaimRuns[0] ?? null;
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
        const pendingReleasedReopen = isProviderIssueReleasedPendingReopen(existing.reason ?? null);
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

      const eligibility = assessProviderTrackedIssueEligibility(input.trackedIssue);
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

      const latestRun = attachableDiscoveredRuns[0] ?? null;
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
          const latestRun = attachableClaimRuns[0] ?? null;
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

          if (claim.state === 'starting' || claim.state === 'resuming' || activeRun) {
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
            const queuedRetryFields = buildQueuedProviderRetryFields({
              claim: currentClaim,
              previousRun: latestRun,
              error: null,
              delayType: 'continuation'
            });
            const transitioned = hasProviderClaimTransitioned(currentClaim, {
              ...buildTrackedIssueClaimFields(resolution.trackedIssue),
              state: 'completed',
              reason: 'provider_issue_rehydrated_completed_run',
              task_id: latestRun.taskId,
              run_id: latestRun.runId,
              run_manifest_path: latestRun.manifestPath,
              ...queuedRetryFields
            });
            const refreshCompletedSnapshot = captureProviderStateSnapshot();
            upsertProviderIntakeClaim(options.state, {
              ...currentClaim,
              ...buildTrackedIssueClaimFields(resolution.trackedIssue),
              task_id: latestRun.taskId,
              state: 'completed',
              reason: 'provider_issue_rehydrated_completed_run',
              run_id: latestRun.runId,
              run_manifest_path: latestRun.manifestPath,
              ...queuedRetryFields
            });
            if (transitioned) {
              await persistStateOrRollback(refreshCompletedSnapshot);
              options.publishRuntime?.('provider-intake.refresh');
            }
            if (queuedRetryFields.retry_queued === true) {
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

  return {
    async handleAcceptedTrackedIssue(input): Promise<ProviderIssueHandoffResult> {
      return await processTrackedIssueCandidate(input);
    },

    async rehydrate(): Promise<void> {
      await runWithRefreshLifecycleLock(async () => {
        const result = await rehydrateNow();
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

function assessProviderTrackedIssueEligibility(
  trackedIssue: Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'blocked_by'>
): ProviderTrackedIssueEligibility {
  const workflowState = classifyProviderLinearWorkflowState(trackedIssue);
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

  return { eligible: true };
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

function resolveProviderPollDispatchLimits(
  featureToggles: Record<string, unknown> | null | undefined
): {
  maxConcurrentAgents: number;
  maxConcurrentAgentsByState: Map<string, number>;
} {
  const agentConfig = readProviderPollAgentConfig(featureToggles);
  return {
    maxConcurrentAgents:
      readPositiveIntegerValue(agentConfig, 'max_concurrent_agents', 'maxConcurrentAgents') ??
      DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS,
    maxConcurrentAgentsByState: readPositiveIntegerMap(
      agentConfig,
      'max_concurrent_agents_by_state',
      'maxConcurrentAgentsByState'
    )
  };
}

function readProviderPollAgentConfig(
  featureToggles: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  const direct = readRecordValue(featureToggles, 'agent');
  const nested = readRecordValue(readRecordValue(featureToggles, 'coordinator'), 'agent');
  if (!direct && !nested) {
    return null;
  }
  return {
    ...(nested ?? {}),
    ...(direct ?? {})
  };
}

function readPositiveIntegerMap(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): Map<string, number> {
  const value = readRecordValue(record, ...keys);
  if (!value) {
    return new Map<string, number>();
  }

  const entries = new Map<string, number>();
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const normalizedKey = normalizeProviderLinearWorkflowState(rawKey);
    const parsedValue = readPositiveIntegerValue({ value: rawValue }, 'value');
    if (!normalizedKey || parsedValue === null) {
      continue;
    }
    entries.set(normalizedKey, parsedValue);
  }
  return entries;
}

function readPositiveIntegerValue(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        continue;
      }
      const parsed = Number.parseInt(trimmed, 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return null;
}

function readRecordValue(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): Record<string, unknown> | null {
  for (const key of keys) {
    const value = record?.[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

async function cleanupReleasedProviderWorkspace(
  repoRoot: string,
  taskId: string,
  manifestPath: string | null
): Promise<void> {
  const workspacePath = await resolveProviderCleanupWorkspacePath(repoRoot, taskId, manifestPath);
  await cleanupProviderWorkspace(repoRoot, workspacePath);
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

async function discoverProviderIssueRuns(
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
      const issueProvider = readStringValue(manifest, 'issue_provider');
      const issueId = readStringValue(manifest, 'issue_id');
      if (issueProvider !== 'linear' || !issueId) {
        continue;
      }
      if (input && (issueProvider !== input.provider || issueId !== input.issueId)) {
        continue;
      }
      discovered.push({
        provider: issueProvider,
        issueId,
        taskId: readStringValue(manifest, 'task_id') ?? taskEntry,
        runId: readStringValue(manifest, 'run_id') ?? runEntry,
        manifestPath,
        pipelineId: readStringValue(manifest, 'pipeline_id'),
        status: readStringValue(manifest, 'status'),
        summary: readStringValue(manifest, 'summary'),
        issueUpdatedAt: readStringValue(manifest, 'issue_updated_at'),
        startedAt: readStringValue(manifest, 'started_at'),
        updatedAt: readStringValue(manifest, 'updated_at', 'started_at')
      });
    }
  }

  return discovered.sort((left, right) => {
    return Date.parse(right.updatedAt ?? '') - Date.parse(left.updatedAt ?? '');
  });
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
  next: Pick<
    ProviderIntakeClaimRecord,
    | 'issue_identifier'
    | 'issue_title'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_updated_at'
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
          | 'issue_blocked_by'
        >
      >
  )
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
    (claim.retry_error ?? null) !== (next.retry_error ?? null)
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
  | { kind: 'ready'; trackedIssue: LiveLinearTrackedIssue }
  | {
      kind: 'release';
      reason: string;
      trackedIssue: Pick<
        LiveLinearTrackedIssue,
        'identifier' | 'title' | 'state' | 'state_type' | 'updated_at'
      > | null;
      cleanupWorkspace: boolean;
    } {
  const trackedIssue = trackedIssuesByKey.get(buildProviderIssueKey(claim.provider, claim.issue_id)) ?? null;
  if (!trackedIssue) {
    return {
      kind: 'release',
      reason: 'not_found',
      trackedIssue: null,
      cleanupWorkspace: false
    };
  }

  const eligibility = assessProviderTrackedIssueEligibility(trackedIssue);
  if (eligibility.eligible) {
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
  Promise<
    | { kind: 'ready'; trackedIssue: LiveLinearTrackedIssue }
    | {
        kind: 'release';
        reason: string;
        trackedIssue: Pick<
          LiveLinearTrackedIssue,
          'identifier' | 'title' | 'state' | 'state_type' | 'updated_at'
        > | null;
        cleanupWorkspace: boolean;
      }
    | { kind: 'skip'; reason: string }
  > {
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
    const eligibility = assessProviderTrackedIssueEligibility(directResolution.trackedIssue);
    if (eligibility.eligible) {
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
    | 'issue_blocked_by'
  >
): LiveLinearTrackedIssue {
  return {
    provider: 'linear',
    id: claim.issue_id,
    identifier: claim.issue_identifier,
    title: claim.issue_title,
    url: null,
    state: claim.issue_state,
    state_type: claim.issue_state_type,
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

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}
