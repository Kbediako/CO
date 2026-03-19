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
  }): Promise<void>;
  resume(input: {
    runId: string;
    actor: string;
    reason: string;
  }): Promise<void>;
}

export interface ProviderIssueHandoffResult {
  kind: 'ignored' | 'start' | 'resume';
  reason: string;
  claim: ProviderIntakeClaimRecord;
}

interface ProviderIssueRunRecord {
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
}

const RESUME_ELIGIBLE_STATUSES = new Set(['failed', 'cancelled']);

export function createProviderIssueHandoffService(
  options: CreateProviderIssueHandoffServiceOptions
): ProviderIssueHandoffService {
  const startPipelineId = options.startPipelineId ?? 'diagnostics';
  const rehydrateNow = async (): Promise<void> => {
    const now = isoTimestamp();
    for (const claim of [...options.state.claims]) {
      const discoveredRuns = await discoverProviderIssueRuns(options.paths.runDir, {
        provider: claim.provider,
        issueId: claim.issue_id
      });
      const activeRun = discoveredRuns.find((run) => run.status === 'in_progress');
      if (activeRun) {
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

      const resumableRun = discoveredRuns.find(
        (run) => run.status !== null && RESUME_ELIGIBLE_STATUSES.has(run.status)
      );
      if (resumableRun) {
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

      const completedRun = discoveredRuns.find((run) => run.status === 'succeeded');
      if (completedRun) {
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

      if (claim.state === 'starting' || claim.state === 'resuming' || claim.state === 'accepted') {
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
  };

  return {
    async handleAcceptedTrackedIssue(input): Promise<ProviderIssueHandoffResult> {
      const providerKey = buildProviderIssueKey('linear', input.trackedIssue.id);
      const taskId = buildProviderFallbackTaskId(input.trackedIssue);
      const mappingSource: ProviderTaskMappingSource = 'provider_id_fallback';
      const existing = readProviderIntakeClaim(options.state, providerKey);

      if (
        isTrackedIssueStale({
          existingIssueUpdatedAt: existing?.issue_updated_at ?? null,
          nextIssueUpdatedAt: input.trackedIssue.updated_at
        })
      ) {
        const claim = upsertProviderIntakeClaim(options.state, {
          provider: 'linear',
          provider_key: providerKey,
          issue_id: input.trackedIssue.id,
          issue_identifier: input.trackedIssue.identifier,
          issue_title: input.trackedIssue.title,
          issue_state: input.trackedIssue.state,
          issue_state_type: input.trackedIssue.state_type,
          issue_updated_at: input.trackedIssue.updated_at,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'stale',
          reason: 'provider_issue_stale',
          last_delivery_id: input.deliveryId,
          last_event: input.event,
          last_action: input.action,
          last_webhook_timestamp: input.webhookTimestamp,
          run_id: existing?.run_id ?? null,
          run_manifest_path: existing?.run_manifest_path ?? null,
          accepted_at: existing?.accepted_at ?? null
        });
        await options.persist();
        return { kind: 'ignored', reason: 'provider_issue_stale', claim };
      }

      if (input.trackedIssue.state_type !== 'started') {
        const claim = upsertProviderIntakeClaim(options.state, {
          provider: 'linear',
          provider_key: providerKey,
          issue_id: input.trackedIssue.id,
          issue_identifier: input.trackedIssue.identifier,
          issue_title: input.trackedIssue.title,
          issue_state: input.trackedIssue.state,
          issue_state_type: input.trackedIssue.state_type,
          issue_updated_at: input.trackedIssue.updated_at,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'ignored',
          reason: 'provider_issue_state_not_started',
          last_delivery_id: input.deliveryId,
          last_event: input.event,
          last_action: input.action,
          last_webhook_timestamp: input.webhookTimestamp,
          run_id: existing?.run_id ?? null,
          run_manifest_path: existing?.run_manifest_path ?? null,
          accepted_at: existing?.accepted_at ?? null
        });
        await options.persist();
        return { kind: 'ignored', reason: 'provider_issue_state_not_started', claim };
      }

      const discoveredRuns = await discoverProviderIssueRuns(options.paths.runDir, {
        provider: 'linear',
        issueId: input.trackedIssue.id
      });
      const activeRun = discoveredRuns.find((run) => run.status === 'in_progress');
      if (activeRun) {
        const claim = upsertProviderIntakeClaim(options.state, {
          provider: 'linear',
          provider_key: providerKey,
          issue_id: input.trackedIssue.id,
          issue_identifier: input.trackedIssue.identifier,
          issue_title: input.trackedIssue.title,
          issue_state: input.trackedIssue.state,
          issue_state_type: input.trackedIssue.state_type,
          issue_updated_at: input.trackedIssue.updated_at,
          task_id: activeRun.taskId,
          mapping_source: mappingSource,
          state: 'running',
          reason: 'provider_issue_run_already_active',
          last_delivery_id: input.deliveryId,
          last_event: input.event,
          last_action: input.action,
          last_webhook_timestamp: input.webhookTimestamp,
          run_id: activeRun.runId,
          run_manifest_path: activeRun.manifestPath,
          accepted_at: existing?.accepted_at ?? null
        });
        await options.persist();
        return { kind: 'ignored', reason: 'provider_issue_run_already_active', claim };
      }

      if (existing && (existing.state === 'starting' || existing.state === 'resuming')) {
        const claim = upsertProviderIntakeClaim(options.state, {
          provider: 'linear',
          provider_key: providerKey,
          issue_id: input.trackedIssue.id,
          issue_identifier: input.trackedIssue.identifier,
          issue_title: input.trackedIssue.title,
          issue_state: input.trackedIssue.state,
          issue_state_type: input.trackedIssue.state_type,
          issue_updated_at: input.trackedIssue.updated_at,
          task_id: existing.task_id,
          mapping_source: existing.mapping_source,
          state: existing.state,
          reason: 'provider_issue_handoff_inflight',
          last_delivery_id: input.deliveryId,
          last_event: input.event,
          last_action: input.action,
          last_webhook_timestamp: input.webhookTimestamp,
          run_id: existing.run_id,
          run_manifest_path: existing.run_manifest_path,
          accepted_at: existing.accepted_at
        });
        await options.persist();
        return { kind: 'ignored', reason: 'provider_issue_handoff_inflight', claim };
      }

      const latestRun = discoveredRuns[0] ?? null;
      if (latestRun && latestRun.status && RESUME_ELIGIBLE_STATUSES.has(latestRun.status)) {
        try {
          await options.launcher.resume({
            runId: latestRun.runId,
            actor: 'control-host',
            reason: 'provider-accepted-issue'
          });
        } catch (error) {
          const claim = upsertProviderIntakeClaim(options.state, {
            provider: 'linear',
            provider_key: providerKey,
            issue_id: input.trackedIssue.id,
            issue_identifier: input.trackedIssue.identifier,
            issue_title: input.trackedIssue.title,
            issue_state: input.trackedIssue.state,
            issue_state_type: input.trackedIssue.state_type,
            issue_updated_at: input.trackedIssue.updated_at,
            task_id: latestRun.taskId,
            mapping_source: mappingSource,
            state: 'handoff_failed',
            reason: `provider_issue_resume_failed:${(error as Error)?.message ?? String(error)}`,
            last_delivery_id: input.deliveryId,
            last_event: input.event,
            last_action: input.action,
            last_webhook_timestamp: input.webhookTimestamp,
            run_id: latestRun.runId,
            run_manifest_path: latestRun.manifestPath,
            accepted_at: existing?.accepted_at ?? null
          });
          await options.persist();
          throw new Error(`Failed to resume provider issue ${input.trackedIssue.identifier}: ${claim.reason}`);
        }
        const claim = upsertProviderIntakeClaim(options.state, {
          provider: 'linear',
          provider_key: providerKey,
          issue_id: input.trackedIssue.id,
          issue_identifier: input.trackedIssue.identifier,
          issue_title: input.trackedIssue.title,
          issue_state: input.trackedIssue.state,
          issue_state_type: input.trackedIssue.state_type,
          issue_updated_at: input.trackedIssue.updated_at,
          task_id: latestRun.taskId,
          mapping_source: mappingSource,
          state: 'resuming',
          reason: 'provider_issue_resume_launched',
          last_delivery_id: input.deliveryId,
          last_event: input.event,
          last_action: input.action,
          last_webhook_timestamp: input.webhookTimestamp,
          run_id: latestRun.runId,
          run_manifest_path: latestRun.manifestPath,
          accepted_at: existing?.accepted_at ?? null
        });
        await options.persist();
        scheduleBestEffortRehydrate(rehydrateNow);
        return { kind: 'resume', reason: 'provider_issue_resume_launched', claim };
      }

      if (latestRun?.status === 'succeeded') {
        const claim = upsertProviderIntakeClaim(options.state, {
          provider: 'linear',
          provider_key: providerKey,
          issue_id: input.trackedIssue.id,
          issue_identifier: input.trackedIssue.identifier,
          issue_title: input.trackedIssue.title,
          issue_state: input.trackedIssue.state,
          issue_state_type: input.trackedIssue.state_type,
          issue_updated_at: input.trackedIssue.updated_at,
          task_id: latestRun.taskId,
          mapping_source: mappingSource,
          state: 'completed',
          reason: 'provider_issue_run_already_completed',
          last_delivery_id: input.deliveryId,
          last_event: input.event,
          last_action: input.action,
          last_webhook_timestamp: input.webhookTimestamp,
          run_id: latestRun.runId,
          run_manifest_path: latestRun.manifestPath,
          accepted_at: existing?.accepted_at ?? null
        });
        await options.persist();
        return { kind: 'ignored', reason: 'provider_issue_run_already_completed', claim };
      }

      try {
        await options.launcher.start({
          taskId,
          pipelineId: startPipelineId,
          provider: 'linear',
          issueId: input.trackedIssue.id,
          issueIdentifier: input.trackedIssue.identifier,
          issueUpdatedAt: input.trackedIssue.updated_at
        });
      } catch (error) {
        const claim = upsertProviderIntakeClaim(options.state, {
          provider: 'linear',
          provider_key: providerKey,
          issue_id: input.trackedIssue.id,
          issue_identifier: input.trackedIssue.identifier,
          issue_title: input.trackedIssue.title,
          issue_state: input.trackedIssue.state,
          issue_state_type: input.trackedIssue.state_type,
          issue_updated_at: input.trackedIssue.updated_at,
          task_id: taskId,
          mapping_source: mappingSource,
          state: 'handoff_failed',
          reason: `provider_issue_start_failed:${(error as Error)?.message ?? String(error)}`,
          last_delivery_id: input.deliveryId,
          last_event: input.event,
          last_action: input.action,
          last_webhook_timestamp: input.webhookTimestamp,
          run_id: null,
          run_manifest_path: null,
          accepted_at: existing?.accepted_at ?? null
        });
        await options.persist();
        throw new Error(`Failed to start provider issue ${input.trackedIssue.identifier}: ${claim.reason}`);
      }
      const claim = upsertProviderIntakeClaim(options.state, {
        provider: 'linear',
        provider_key: providerKey,
        issue_id: input.trackedIssue.id,
        issue_identifier: input.trackedIssue.identifier,
        issue_title: input.trackedIssue.title,
        issue_state: input.trackedIssue.state,
        issue_state_type: input.trackedIssue.state_type,
        issue_updated_at: input.trackedIssue.updated_at,
        task_id: taskId,
        mapping_source: mappingSource,
        state: 'starting',
        reason: 'provider_issue_start_launched',
        last_delivery_id: input.deliveryId,
        last_event: input.event,
        last_action: input.action,
        last_webhook_timestamp: input.webhookTimestamp,
        run_id: null,
        run_manifest_path: null,
        accepted_at: existing?.accepted_at ?? null
      });
      await options.persist();
      scheduleBestEffortRehydrate(rehydrateNow);
      return { kind: 'start', reason: 'provider_issue_start_launched', claim };
    },

    async rehydrate(): Promise<void> {
      await rehydrateNow();
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

async function discoverProviderIssueRuns(
  currentRunDir: string,
  input: {
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
      if (issueProvider !== input.provider || issueId !== input.issueId) {
        continue;
      }
      discovered.push({
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
  } catch {
    return [];
  }
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
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

function scheduleBestEffortRehydrate(perform: () => Promise<void>): void {
  const timer = setTimeout(() => {
    void perform().catch(() => undefined);
  }, 1_000);
  timer.unref?.();
}
