import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
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
}

export interface CreateProviderIssueHandoffServiceOptions {
  paths: Pick<RunPaths, 'runDir'>;
  state: ProviderIntakeState;
  persist: () => Promise<void>;
  launcher: ProviderIssueLauncher;
  startPipelineId?: string;
  publishRuntime?: ((source: string) => void) | null;
}

const RESUME_ELIGIBLE_STATUSES = new Set(['failed', 'cancelled']);
const BEST_EFFORT_REHYDRATE_DELAY_MS = 1_000;
const BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS = 5;
const BEST_EFFORT_REHYDRATE_TIMEOUT_MS =
  BEST_EFFORT_REHYDRATE_DELAY_MS * BEST_EFFORT_REHYDRATE_MAX_ATTEMPTS;
const PROVIDER_LAUNCH_SOURCE: ProviderLaunchSource = 'control-host';

export function createProviderIssueHandoffService(
  options: CreateProviderIssueHandoffServiceOptions
): ProviderIssueHandoffService {
  const startPipelineId = options.startPipelineId ?? 'diagnostics';
  const rehydrateNow = async (): Promise<{ hasPendingClaims: boolean }> => {
    const now = isoTimestamp();
    const discoveredRuns = await discoverProviderIssueRuns(options.paths.runDir);
    const runsByProviderIssue = groupProviderIssueRuns(discoveredRuns);
    let hasPendingClaims = false;
    let publishRuntime = false;

    for (const claim of [...options.state.claims]) {
      const claimRuns = runsByProviderIssue.get(buildProviderIssueKey(claim.provider, claim.issue_id)) ?? [];
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
          task_id: resumableRun.taskId,
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          run_id: resumableRun.runId,
          run_manifest_path: resumableRun.manifestPath,
          updated_at: now
        });
        continue;
      }

      const completedRun = claimRuns.find((run) => run.status === 'succeeded');
      if (completedRun) {
        publishRuntime ||= hasProviderClaimTransitioned(claim, {
          state: 'completed',
          reason: 'provider_issue_rehydrated_completed_run',
          task_id: completedRun.taskId,
          run_id: completedRun.runId,
          run_manifest_path: completedRun.manifestPath
        });
        upsertProviderIntakeClaim(options.state, {
          ...claim,
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

      if (input.trackedIssue.state_type !== 'started') {
        const claim = upsertProviderIntakeClaim(options.state, {
          ...claimBase,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'ignored',
          reason: 'provider_issue_state_not_started',
          run_id: existing?.run_id ?? null,
          run_manifest_path: existing?.run_manifest_path ?? null,
        });
        await options.persist();
        return { kind: 'ignored', reason: 'provider_issue_state_not_started', claim };
      }

      const discoveredRuns = await discoverProviderIssueRuns(options.paths.runDir, {
        provider: 'linear',
        issueId: input.trackedIssue.id
      });
      const latestExisting = readProviderIntakeClaim(options.state, providerKey);
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

      if (latestRun?.status === 'succeeded') {
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
      if (startedRun) {
        await options.persist();
        options.publishRuntime?.('provider-intake.start');
      }
      scheduleBestEffortRehydrate(rehydrateNow);
      return { kind: 'start', reason: 'provider_issue_start_launched', claim };
    },

    async rehydrate(): Promise<void> {
      const result = await rehydrateNow();
      if (result.hasPendingClaims) {
        scheduleBestEffortRehydrate(rehydrateNow);
      }
    }
  };
}

function isTrackedIssueStale(input: {
  existingIssueUpdatedAt: string | null;
  nextIssueUpdatedAt: string | null;
}): boolean {
  if (!input.existingIssueUpdatedAt || !input.nextIssueUpdatedAt) {
    return false;
  }
  const existingTime = Date.parse(input.existingIssueUpdatedAt);
  const nextTime = Date.parse(input.nextIssueUpdatedAt);
  if (!Number.isFinite(existingTime) || !Number.isFinite(nextTime)) {
    return false;
  }
  return nextTime < existingTime;
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
