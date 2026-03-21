import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import {
  cleanupProviderWorkspace,
  resolveExplicitProviderWorkspacePathWithinRoot,
  resolveProviderWorkspacePath
} from '../run/workspacePath.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import { callChildControlEndpoint } from './questionChildResolutionAdapter.js';
import {
  buildProviderFallbackTaskId,
  buildProviderIssueKey,
  markProviderIntakeRehydrated,
  readProviderIntakeClaim,
  type ProviderLaunchSource,
  type ProviderIntakeClaimRecord,
  type ProviderIntakeState,
  type ProviderTaskMappingSource,
  upsertProviderIntakeClaim
} from './providerIntakeState.js';

export interface ProviderIssueLauncher {
  start(input: {
    taskId: string;
    pipelineId: string;
    provider: 'linear';
    issueId: string;
    issueIdentifier: string;
    issueUpdatedAt: string | null;
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

interface ProviderIssueRunRecord {
  provider: 'linear';
  issueId: string;
  taskId: string;
  runId: string;
  manifestPath: string;
  status: string | null;
  issueUpdatedAt: string | null;
  startedAt: string | null;
  updatedAt: string | null;
}

export interface ProviderIssueHandoffService {
  handleAcceptedTrackedIssue(input: {
    trackedIssue: LiveLinearTrackedIssue;
    deliveryId: string;
    event: string | null;
    action: string | null;
    webhookTimestamp: number | null;
  }): Promise<ProviderIssueHandoffResult>;
  rehydrate(): Promise<void>;
  refresh(): Promise<void>;
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
  resolveTrackedIssue?: ((
    input: {
      provider: 'linear';
      issueId: string;
    }
  ) => Promise<ProviderTrackedIssueRefreshResolution>) | null;
}

const RESUME_ELIGIBLE_STATUSES = new Set(['failed', 'cancelled']);
const ACTIVE_PROVIDER_ISSUE_STATES = new Set(['todo', 'in progress']);
const TERMINAL_PROVIDER_ISSUE_STATES = new Set(['closed', 'cancelled', 'canceled', 'duplicate', 'done']);
const TERMINAL_PROVIDER_ISSUE_STATE_TYPES = new Set(['completed', 'cancelled', 'canceled']);
const BEST_EFFORT_REHYDRATE_DELAY_MS = 1_000;
const BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS = 5;
const BEST_EFFORT_REHYDRATE_TIMEOUT_MS =
  BEST_EFFORT_REHYDRATE_DELAY_MS * BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS;
const PROVIDER_LAUNCH_SOURCE: ProviderLaunchSource = 'control-host';
const PROVIDER_RELEASED_PENDING_REOPEN_PREFIX = 'provider_issue_released_pending_reopen:';

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
  const releaseCancelInFlight = new Map<
    string,
    {
      attempt: Promise<boolean>;
      retryRequested: boolean;
      retryConsumed: boolean;
    }
  >();

  const launchResumeForRun = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    run: ProviderIssueRunRecord;
    reason: string;
  }): Promise<void> => {
    const launchToken = createProviderLaunchToken();
    upsertProviderIntakeClaim(options.state, {
      ...input.claim,
      issue_identifier: input.trackedIssue.identifier,
      issue_title: input.trackedIssue.title,
      issue_state: input.trackedIssue.state,
      issue_state_type: input.trackedIssue.state_type,
      issue_updated_at: input.trackedIssue.updated_at,
      task_id: input.run.taskId,
      state: 'resuming',
      reason: input.reason,
      run_id: input.run.runId,
      run_manifest_path: input.run.manifestPath,
      launch_source: PROVIDER_LAUNCH_SOURCE,
      launch_token: launchToken
    });
    await options.persist();
    try {
      await options.launcher.resume({
        runId: input.run.runId,
        actor: 'control-host',
        reason: 'provider-refresh',
        launchToken
      });
    } catch (error) {
      upsertProviderIntakeClaim(options.state, {
        ...input.claim,
        issue_identifier: input.trackedIssue.identifier,
        issue_title: input.trackedIssue.title,
        issue_state: input.trackedIssue.state,
        issue_state_type: input.trackedIssue.state_type,
        issue_updated_at: input.trackedIssue.updated_at,
        task_id: input.run.taskId,
        state: 'handoff_failed',
        reason: `provider_issue_refresh_resume_failed:${(error as Error)?.message ?? String(error)}`,
        run_id: input.run.runId,
        run_manifest_path: input.run.manifestPath,
        launch_source: PROVIDER_LAUNCH_SOURCE,
        launch_token: launchToken
      });
      await options.persist();
      throw error;
    }
    scheduleBestEffortRehydrate(rehydrateNow);
  };

  const launchStartForTrackedIssue = async (input: {
    claim: ProviderIntakeClaimRecord;
    trackedIssue: LiveLinearTrackedIssue;
    reason: string;
  }): Promise<void> => {
    const taskId = buildProviderFallbackTaskId(input.trackedIssue);
    const launchToken = createProviderLaunchToken();
    upsertProviderIntakeClaim(options.state, {
      ...input.claim,
      issue_identifier: input.trackedIssue.identifier,
      issue_title: input.trackedIssue.title,
      issue_state: input.trackedIssue.state,
      issue_state_type: input.trackedIssue.state_type,
      issue_updated_at: input.trackedIssue.updated_at,
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: input.reason,
      run_id: null,
      run_manifest_path: null,
      launch_source: PROVIDER_LAUNCH_SOURCE,
      launch_token: launchToken
    });
    await options.persist();
    let startedRun: { runId: string; manifestPath: string } | null = null;
    try {
      startedRun = await options.launcher.start({
        taskId,
        pipelineId: startPipelineId,
        provider: 'linear',
        issueId: input.trackedIssue.id,
        issueIdentifier: input.trackedIssue.identifier,
        issueUpdatedAt: input.trackedIssue.updated_at,
        launchToken
      });
    } catch (error) {
      upsertProviderIntakeClaim(options.state, {
        ...input.claim,
        issue_identifier: input.trackedIssue.identifier,
        issue_title: input.trackedIssue.title,
        issue_state: input.trackedIssue.state,
        issue_state_type: input.trackedIssue.state_type,
        issue_updated_at: input.trackedIssue.updated_at,
        task_id: taskId,
        mapping_source: 'provider_id_fallback',
        state: 'handoff_failed',
        reason: `provider_issue_refresh_start_failed:${(error as Error)?.message ?? String(error)}`,
        run_id: null,
        run_manifest_path: null,
        launch_source: PROVIDER_LAUNCH_SOURCE,
        launch_token: launchToken
      });
      await options.persist();
      throw error;
    }
    try {
      if (startedRun) {
        upsertProviderIntakeClaim(options.state, {
          ...input.claim,
          issue_identifier: input.trackedIssue.identifier,
          issue_title: input.trackedIssue.title,
          issue_state: input.trackedIssue.state,
          issue_state_type: input.trackedIssue.state_type,
          issue_updated_at: input.trackedIssue.updated_at,
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: input.reason,
          run_id: startedRun.runId,
          run_manifest_path: startedRun.manifestPath,
          launch_source: PROVIDER_LAUNCH_SOURCE,
          launch_token: launchToken
        });
        await options.persist();
        options.publishRuntime?.('provider-intake.refresh');
      }
    } finally {
      scheduleBestEffortRehydrate(rehydrateNow);
    }
  };

  const releaseClaim = async (input: {
    claim: ProviderIntakeClaimRecord;
    nextReason: string;
    releaseRun: ProviderIssueRunRecord | null;
    trackedIssue?: Pick<
      LiveLinearTrackedIssue,
      'identifier' | 'title' | 'state' | 'state_type' | 'updated_at'
    > | null;
    cleanupWorkspace?: boolean;
  }): Promise<void> => {
    const now = isoTimestamp();
    const nextTaskId = input.releaseRun?.taskId ?? input.claim.task_id;
    const nextRunId = input.releaseRun?.runId ?? input.claim.run_id;
    const nextManifestPath = input.releaseRun?.manifestPath ?? input.claim.run_manifest_path;
    const transitioned = hasProviderClaimTransitioned(input.claim, {
      state: 'released',
      reason: input.nextReason,
      task_id: nextTaskId,
      run_id: nextRunId,
      run_manifest_path: nextManifestPath
    });
    upsertProviderIntakeClaim(options.state, {
      ...input.claim,
      issue_identifier: input.trackedIssue?.identifier ?? input.claim.issue_identifier,
      issue_title: input.trackedIssue?.title ?? input.claim.issue_title,
      issue_state: input.trackedIssue?.state ?? input.claim.issue_state,
      issue_state_type: input.trackedIssue?.state_type ?? input.claim.issue_state_type,
      issue_updated_at: input.trackedIssue?.updated_at ?? input.claim.issue_updated_at,
      task_id: nextTaskId,
      state: 'released',
      reason: input.nextReason,
      run_id: nextRunId,
      run_manifest_path: nextManifestPath,
      updated_at: now
    });
    await options.persist();
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
      const releasedRun = claim.state === 'released' ? resolveProviderReleaseRun(claim, claimRuns) : null;
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

      const activeRun = claimRuns.find((run) => run.status === 'in_progress');
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
        continue;
      }

      const resumableRun = claimRuns.find(
        (run) => run.status !== null && RESUME_ELIGIBLE_STATUSES.has(run.status)
      );
      if (resumableRun) {
        publishRuntime ||= hasProviderClaimTransitioned(claim, {
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          task_id: resumableRun.taskId,
          run_id: resumableRun.runId,
          run_manifest_path: resumableRun.manifestPath
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
          updated_at: now
        });
        continue;
      }

      const matchedCompletedRun = resolveProviderClaimRunIdentity(claim, claimRuns);
      const completedRun =
        matchedCompletedRun?.status === 'succeeded'
          ? matchedCompletedRun
          : claim.run_id || claim.run_manifest_path
            ? null
            : claimRuns.find((run) => run.status === 'succeeded');
      if (
        completedRun &&
        (
          !manifestlessDetachedClaim ||
          didRunMatchClaimAttempt(claim, completedRun)
        )
      ) {
        publishRuntime ||= hasProviderClaimTransitioned(claim, {
          state: 'completed',
          reason: 'provider_issue_rehydrated_completed_run',
          task_id: completedRun.taskId,
          run_id: completedRun.runId,
          run_manifest_path: completedRun.manifestPath
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
          updated_at: now
        });
        continue;
      }

      if (claim.state === 'starting' || claim.state === 'resuming') {
        const queuedRun = claimRuns.find((run) => run.status === 'queued');
        if (queuedRun) {
          if (isProviderClaimRehydrationTimedOut(claim, now)) {
            publishRuntime ||= hasProviderClaimTransitioned(claim, {
              state: 'handoff_failed',
              reason: 'provider_issue_rehydration_timeout',
              task_id: queuedRun.taskId,
              run_id: queuedRun.runId,
              run_manifest_path: queuedRun.manifestPath
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
          publishRuntime ||= hasProviderClaimTransitioned(claim, {
            state: 'handoff_failed',
            reason: 'provider_issue_rehydration_timeout',
            task_id: claim.task_id,
            run_id: claim.run_id,
            run_manifest_path: claim.run_manifest_path
          });
          upsertProviderIntakeClaim(options.state, {
            ...claim,
            launch_source: undefined,
            launch_token: undefined,
            state: 'handoff_failed',
            reason: 'provider_issue_rehydration_timeout',
            updated_at: now
          });
          continue;
        }

        hasPendingClaims = true;
        continue;
      }

      if (claim.state === 'accepted') {
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
    await options.persist();
    if (publishRuntime) {
      options.publishRuntime?.('provider-intake.rehydrate');
    }
    return { hasPendingClaims };
  };

  return {
    async handleAcceptedTrackedIssue(input): Promise<ProviderIssueHandoffResult> {
      const providerKey = buildProviderIssueKey('linear', input.trackedIssue.id);
      const taskId = buildProviderFallbackTaskId(input.trackedIssue);
      const mappingSource: ProviderTaskMappingSource = 'provider_id_fallback';
      const existing = readProviderIntakeClaim(options.state, providerKey);
      const claimBase = {
        provider: 'linear' as const,
        provider_key: providerKey,
        issue_id: input.trackedIssue.id,
        issue_identifier: input.trackedIssue.identifier,
        issue_title: input.trackedIssue.title,
        issue_state: input.trackedIssue.state,
        issue_state_type: input.trackedIssue.state_type,
        issue_updated_at: input.trackedIssue.updated_at,
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
        const releasedRun = resolveProviderReleaseRun(existing, discoveredReleasedRuns);
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
          const claim = upsertProviderIntakeClaim(options.state, {
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
          await options.persist();
          return { kind: 'ignored', reason: claim.reason ?? 'provider_issue_released', claim };
        }
      }

      if (
        isTrackedIssueStale({
          existingIssueUpdatedAt: existing?.issue_updated_at ?? null,
          nextIssueUpdatedAt: input.trackedIssue.updated_at
        })
      ) {
        const claim = upsertProviderIntakeClaim(options.state, {
          ...claimBase,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'stale',
          reason: 'provider_issue_stale',
          run_id: existing?.run_id ?? null,
          run_manifest_path: existing?.run_manifest_path ?? null,
        });
        await options.persist();
        return { kind: 'ignored', reason: 'provider_issue_stale', claim };
      }

      const eligibility = assessProviderTrackedIssueEligibility(input.trackedIssue);
      if (!eligibility.eligible) {
        const claim = upsertProviderIntakeClaim(options.state, {
          ...claimBase,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'ignored',
          reason: eligibility.claimReason,
          run_id: existing?.run_id ?? null,
          run_manifest_path: existing?.run_manifest_path ?? null,
        });
        await options.persist();
        return { kind: 'ignored', reason: eligibility.claimReason, claim };
      }

      const discoveredRuns = await discoverProviderIssueRuns(options.paths.runDir, {
        provider: 'linear',
        issueId: input.trackedIssue.id
      });
      const latestExisting = readProviderIntakeClaim(options.state, providerKey);
      const releasedRun =
        latestExisting?.state === 'released' ? resolveProviderReleaseRun(latestExisting, discoveredRuns) : null;
      const latestClaimBase = {
        ...claimBase,
        accepted_at: latestExisting?.accepted_at ?? claimBase.accepted_at
      };
      const activeRun = discoveredRuns.find((run) => run.status === 'in_progress');
      if (activeRun) {
        const claim = upsertProviderIntakeClaim(options.state, {
          ...latestClaimBase,
          task_id: activeRun.taskId,
          mapping_source: mappingSource,
          state: 'running',
          reason: 'provider_issue_run_already_active',
          run_id: activeRun.runId,
          run_manifest_path: activeRun.manifestPath,
        });
        await options.persist();
        return { kind: 'ignored', reason: 'provider_issue_run_already_active', claim };
      }

      if (latestExisting && (latestExisting.state === 'starting' || latestExisting.state === 'resuming')) {
        const claim = upsertProviderIntakeClaim(options.state, {
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
        await options.persist();
        return { kind: 'ignored', reason: 'provider_issue_handoff_inflight', claim };
      }

      const latestRun = discoveredRuns[0] ?? null;
      if (latestRun && latestRun.status && RESUME_ELIGIBLE_STATUSES.has(latestRun.status)) {
        if (hasPendingReleaseCancel(releasedRun?.manifestPath ?? latestRun.manifestPath)) {
          const claim = upsertProviderIntakeClaim(options.state, {
            ...latestClaimBase,
            task_id: latestRun.taskId,
            mapping_source: latestExisting?.mapping_source ?? mappingSource,
            state: latestExisting?.state ?? 'ignored',
            reason: latestExisting?.reason ?? 'provider_issue_release_cancel_inflight',
            run_id: latestRun.runId,
            run_manifest_path: latestRun.manifestPath,
          });
          await options.persist();
          return { kind: 'ignored', reason: 'provider_issue_release_cancel_inflight', claim };
        }
        const launchToken = createProviderLaunchToken();
        const inflightClaim = upsertProviderIntakeClaim(options.state, {
          ...latestClaimBase,
          task_id: latestRun.taskId,
          mapping_source: mappingSource,
          state: 'resuming',
          reason: 'provider_issue_resume_launched',
          run_id: latestRun.runId,
          run_manifest_path: latestRun.manifestPath,
          launch_source: PROVIDER_LAUNCH_SOURCE,
          launch_token: launchToken
        });
        await options.persist();
        try {
          await options.launcher.resume({
            runId: latestRun.runId,
            actor: 'control-host',
            reason: 'provider-accepted-issue',
            launchToken
          });
        } catch (error) {
          const claim = upsertProviderIntakeClaim(options.state, {
            ...latestClaimBase,
            task_id: latestRun.taskId,
            mapping_source: mappingSource,
            state: 'handoff_failed',
            reason: `provider_issue_resume_failed:${(error as Error)?.message ?? String(error)}`,
            run_id: latestRun.runId,
            run_manifest_path: latestRun.manifestPath,
            launch_source: PROVIDER_LAUNCH_SOURCE,
            launch_token: launchToken
          });
          await options.persist();
          throw new Error(`Failed to resume provider issue ${input.trackedIssue.identifier}: ${claim.reason}`);
        }
        scheduleBestEffortRehydrate(rehydrateNow);
        return { kind: 'resume', reason: 'provider_issue_resume_launched', claim: inflightClaim };
      }

      // Older manifests may predate explicit issue_updated_at recording. Fall back to the
      // run's started_at so restart-time duplicate deliveries remain older than the
      // completed child run, while issue updates that happened after the old run started
      // can still relaunch.
      const latestCompletedClaimIssueUpdatedAt =
        latestExisting?.state === 'completed' ? latestExisting.issue_updated_at ?? null : null;
      const latestCompletedIssueUpdatedAt = selectMostRecentTrackedIssueUpdatedAt(
        latestCompletedClaimIssueUpdatedAt,
        latestRun?.issueUpdatedAt ?? latestRun?.startedAt ?? null
      );
      if (
        latestRun?.status === 'succeeded' &&
        (
          input.trackedIssue.updated_at === null ||
          isTrackedIssueNonIncreasing({
            existingIssueUpdatedAt: latestCompletedIssueUpdatedAt,
            nextIssueUpdatedAt: input.trackedIssue.updated_at
          })
        )
      ) {
        const claim = upsertProviderIntakeClaim(options.state, {
          ...latestClaimBase,
          task_id: latestRun.taskId,
          mapping_source: mappingSource,
          state: 'completed',
          reason: 'provider_issue_run_already_completed',
          run_id: latestRun.runId,
          run_manifest_path: latestRun.manifestPath,
        });
        await options.persist();
        return { kind: 'ignored', reason: 'provider_issue_run_already_completed', claim };
      }

      const launchToken = createProviderLaunchToken();
      const inflightClaim = upsertProviderIntakeClaim(options.state, {
        ...latestClaimBase,
        task_id: taskId,
        mapping_source: mappingSource,
        state: 'starting',
        reason: 'provider_issue_start_launched',
        run_id: null,
        run_manifest_path: null,
        launch_source: PROVIDER_LAUNCH_SOURCE,
        launch_token: launchToken
      });
      await options.persist();
      let startedRun: { runId: string; manifestPath: string } | null = null;
      try {
        startedRun = await options.launcher.start({
          taskId,
          pipelineId: startPipelineId,
          provider: 'linear',
          issueId: input.trackedIssue.id,
          issueIdentifier: input.trackedIssue.identifier,
          issueUpdatedAt: input.trackedIssue.updated_at,
          launchToken
        });
      } catch (error) {
        const claim = upsertProviderIntakeClaim(options.state, {
          ...latestClaimBase,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'handoff_failed',
          reason: `provider_issue_start_failed:${(error as Error)?.message ?? String(error)}`,
          run_id: null,
          run_manifest_path: null,
          launch_source: PROVIDER_LAUNCH_SOURCE,
          launch_token: launchToken
        });
        await options.persist();
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
            launch_token: launchToken
          })
        : inflightClaim;
      try {
        if (startedRun) {
          await options.persist();
          options.publishRuntime?.('provider-intake.start');
        }
        return { kind: 'start', reason: 'provider_issue_start_launched', claim };
      } finally {
        scheduleBestEffortRehydrate(rehydrateNow);
      }
    },

    async rehydrate(): Promise<void> {
      const result = await rehydrateNow();
      if (result.hasPendingClaims) {
        scheduleBestEffortRehydrate(rehydrateNow);
      }
    },

    async refresh(): Promise<void> {
      const result = await rehydrateNow();
      if (result.hasPendingClaims) {
        scheduleBestEffortRehydrate(rehydrateNow);
      }
      if (!options.resolveTrackedIssue) {
        return;
      }

      const discoveredRuns = await discoverProviderIssueRuns(options.paths.runDir);
      const runsByProviderIssue = groupProviderIssueRuns(discoveredRuns);
      for (const claim of [...options.state.claims]) {
        try {
          const claimRuns =
            runsByProviderIssue.get(buildProviderIssueKey(claim.provider, claim.issue_id)) ?? [];
          const activeRun = claimRuns.find((run) => run.status === 'in_progress') ?? null;
          const releaseRun = resolveProviderReleaseRun(claim, claimRuns);
          const latestRun = claimRuns[0] ?? null;
          const resolution = await options.resolveTrackedIssue({
            provider: claim.provider,
            issueId: claim.issue_id
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
              trackedIssue: null,
              cleanupWorkspace: false
            });
            continue;
          }

          const eligibility = assessProviderTrackedIssueEligibility(resolution.trackedIssue);
          if (!eligibility.eligible) {
            await releaseClaim({
              claim,
              nextReason: eligibility.releaseReason,
              releaseRun,
              trackedIssue: resolution.trackedIssue,
              cleanupWorkspace: eligibility.cleanupWorkspace
            });
            continue;
          }

          if (claim.state === 'starting' || claim.state === 'resuming' || activeRun) {
            continue;
          }

          // Refresh is the scheduler-owned continuation/retry path, not webhook dedupe.
          // Once a child run reaches a terminal state, an unchanged active issue remains
          // eligible for another session until provider state leaves the active set.
          if (latestRun && latestRun.status && RESUME_ELIGIBLE_STATUSES.has(latestRun.status)) {
            if (hasPendingReleaseCancel(releaseRun?.manifestPath ?? latestRun.manifestPath)) {
              continue;
            }
            await launchResumeForRun({
              claim,
              trackedIssue: resolution.trackedIssue,
              run: latestRun,
              reason: 'provider_issue_refresh_resume_launched'
            });
            continue;
          }

          if (latestRun?.status === 'succeeded') {
            await launchStartForTrackedIssue({
              claim,
              trackedIssue: resolution.trackedIssue,
              reason: 'provider_issue_continuation_launched'
            });
            continue;
          }

          if (!latestRun) {
            await launchStartForTrackedIssue({
              claim,
              trackedIssue: resolution.trackedIssue,
              reason: 'provider_issue_refresh_start_launched'
            });
          }
        } catch {
          continue;
        }
      }
    }
  };
}

function isTrackedIssueStale(input: {
  existingIssueUpdatedAt: string | null;
  nextIssueUpdatedAt: string | null;
}): boolean {
  return compareTrackedIssueUpdatedAt(input) === 'older';
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
  const normalizedState = normalizeTrackedIssueState(trackedIssue.state);
  const normalizedStateType = normalizeTrackedIssueState(trackedIssue.state_type);
  const isStartedState = normalizedStateType === 'started';
  const isTodoState = normalizedState === 'todo';
  const isActiveState = (normalizedState !== null && ACTIVE_PROVIDER_ISSUE_STATES.has(normalizedState)) || isStartedState;

  if (
    (normalizedState === null && !isStartedState) ||
    (normalizedState !== null && TERMINAL_PROVIDER_ISSUE_STATES.has(normalizedState)) ||
    (normalizedStateType !== null && TERMINAL_PROVIDER_ISSUE_STATE_TYPES.has(normalizedStateType)) ||
    !isActiveState
  ) {
    return {
      eligible: false,
      claimReason: 'provider_issue_state_not_active',
      releaseReason: 'provider_issue_released:not_active',
      cleanupWorkspace: isTerminalTrackedIssueState(normalizedState, normalizedStateType)
    };
  }

  if (isTodoState && todoIssueBlockedByNonTerminal(trackedIssue.blocked_by)) {
    return {
      eligible: false,
      claimReason: 'provider_issue_todo_blocked_by_non_terminal',
      releaseReason: 'provider_issue_released:todo_blocked_by_non_terminal',
      cleanupWorkspace: false
    };
  }

  return { eligible: true };
}

function isTerminalTrackedIssueState(
  normalizedState: string | null,
  normalizedStateType: string | null
): boolean {
  return (
    (normalizedState !== null && TERMINAL_PROVIDER_ISSUE_STATES.has(normalizedState)) ||
    (normalizedStateType !== null && TERMINAL_PROVIDER_ISSUE_STATE_TYPES.has(normalizedStateType))
  );
}

function shouldCleanupReleasedProviderWorkspace(claim: ProviderIntakeClaimRecord): boolean {
  return isTerminalTrackedIssueState(
    normalizeTrackedIssueState(claim.issue_state),
    normalizeTrackedIssueState(claim.issue_state_type)
  );
}

function todoIssueBlockedByNonTerminal(
  blockers: LiveLinearTrackedIssue['blocked_by'] | null | undefined
): boolean {
  return (blockers ?? []).some((blocker) => {
    const normalizedBlockerStateType = normalizeTrackedIssueState(blocker.state_type);
    if (normalizedBlockerStateType !== null) {
      return !TERMINAL_PROVIDER_ISSUE_STATE_TYPES.has(normalizedBlockerStateType);
    }
    const normalizedBlockerState = normalizeTrackedIssueState(blocker.state);
    return normalizedBlockerState === null || !TERMINAL_PROVIDER_ISSUE_STATES.has(normalizedBlockerState);
  });
}

function normalizeTrackedIssueState(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
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
        status: readStringValue(manifest, 'status'),
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

function hasProviderClaimTransitioned(
  claim: ProviderIntakeClaimRecord,
  next: Pick<ProviderIntakeClaimRecord, 'state' | 'reason' | 'task_id' | 'run_id' | 'run_manifest_path'>
): boolean {
  return (
    claim.state !== next.state ||
    claim.reason !== next.reason ||
    claim.task_id !== next.task_id ||
    claim.run_id !== next.run_id ||
    claim.run_manifest_path !== next.run_manifest_path
  );
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
      status: null,
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

function scheduleBestEffortRehydrate(
  perform: () => Promise<{ hasPendingClaims: boolean }>,
  attempt = 1
): void {
  const timer = setTimeout(() => {
    void perform()
      .then((result) => {
        if (result.hasPendingClaims && attempt < BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS) {
          scheduleBestEffortRehydrate(perform, attempt + 1);
        }
      })
      .catch(() => {
        if (attempt < BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS) {
          scheduleBestEffortRehydrate(perform, attempt + 1);
        }
      });
  }, BEST_EFFORT_REHYDRATE_DELAY_MS);
  timer.unref?.();
}
