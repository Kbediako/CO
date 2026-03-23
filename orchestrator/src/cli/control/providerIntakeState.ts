import { slugify } from '../utils/strings.js';
import { isoTimestamp } from '../utils/time.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';

const PROVIDER_INTAKE_CLAIM_LIMIT = 128;

export type ProviderTaskMappingSource = 'provider_id_fallback';
export type ProviderLaunchSource = 'control-host';

export type ProviderIntakeClaimState =
  | 'ignored'
  | 'accepted'
  | 'starting'
  | 'running'
  | 'resuming'
  | 'resumable'
  | 'released'
  | 'completed'
  | 'stale'
  | 'duplicate'
  | 'handoff_failed';

export type ProviderIntakeSummaryState =
  | ProviderIntakeClaimState
  | 'handoff_owned';

export interface ProviderIntakeClaimRecord {
  provider: 'linear';
  provider_key: string;
  issue_id: string;
  issue_identifier: string;
  issue_title: string;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
  issue_assignee_id?: string | null;
  issue_assignee_name?: string | null;
  issue_blocked_by?: LiveLinearTrackedIssue['blocked_by'] | null;
  task_id: string;
  mapping_source: ProviderTaskMappingSource;
  state: ProviderIntakeClaimState;
  reason: string | null;
  accepted_at: string;
  updated_at: string;
  last_delivery_id: string | null;
  last_event: string | null;
  last_action: string | null;
  last_webhook_timestamp: number | null;
  run_id: string | null;
  run_manifest_path: string | null;
  launch_source: ProviderLaunchSource | null;
  launch_token: string | null;
  launch_started_at?: string | null;
  retry_queued?: boolean | null;
  retry_attempt?: number | null;
  retry_due_at?: string | null;
  retry_error?: string | null;
}

export interface ProviderIntakeState {
  schema_version: number;
  updated_at: string;
  rehydrated_at: string | null;
  latest_provider_key: string | null;
  latest_reason: string | null;
  claims: ProviderIntakeClaimRecord[];
}

export interface ProviderIntakeSummaryPayload {
  provider: 'linear';
  issue_id: string;
  issue_identifier: string;
  issue_title: string;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
  issue_assignee_id?: string | null;
  issue_assignee_name?: string | null;
  task_id: string;
  mapping_source: ProviderTaskMappingSource;
  state: ProviderIntakeSummaryState;
  reason: string | null;
  run_id: string | null;
  updated_at: string;
}

export function normalizeProviderIntakeState(
  input: ProviderIntakeState | null | undefined
): ProviderIntakeState {
  const state = input ?? {
    schema_version: 1,
    updated_at: new Date(0).toISOString(),
    rehydrated_at: null,
    latest_provider_key: null,
    latest_reason: null,
    claims: []
  };
  return {
    schema_version: 1,
    updated_at:
      typeof state.updated_at === 'string' && state.updated_at.trim().length > 0
        ? state.updated_at
        : new Date(0).toISOString(),
    rehydrated_at: typeof state.rehydrated_at === 'string' ? state.rehydrated_at : null,
    latest_provider_key:
      typeof state.latest_provider_key === 'string' ? state.latest_provider_key : null,
    latest_reason: typeof state.latest_reason === 'string' ? state.latest_reason : null,
    claims: Array.isArray(state.claims)
      ? state.claims
          .map(normalizeProviderIntakeClaim)
          .filter((claim): claim is ProviderIntakeClaimRecord => claim !== null)
          .slice(-PROVIDER_INTAKE_CLAIM_LIMIT)
      : []
  };
}

export function buildProviderIssueKey(provider: 'linear', issueId: string): string {
  return `${provider}:${issueId}`;
}

export function buildProviderFallbackTaskId(trackedIssue: Pick<LiveLinearTrackedIssue, 'id'>): string {
  const slug = slugify(trackedIssue.id, 'issue').toLowerCase();
  return `linear-${slug}`;
}

export function readProviderIntakeClaim(
  state: ProviderIntakeState,
  providerKey: string
): ProviderIntakeClaimRecord | null {
  return state.claims.find((claim) => claim.provider_key === providerKey) ?? null;
}

export function upsertProviderIntakeClaim(
  state: ProviderIntakeState,
  input: Omit<
    ProviderIntakeClaimRecord,
    'accepted_at' | 'updated_at' | 'launch_source' | 'launch_token' | 'launch_started_at'
  > & {
    accepted_at?: string | null;
    updated_at?: string | null;
    launch_source?: ProviderLaunchSource | null;
    launch_token?: string | null;
    launch_started_at?: string | null;
  }
): ProviderIntakeClaimRecord {
  const now = input.updated_at ?? isoTimestamp();
  const existingIndex = state.claims.findIndex((claim) => claim.provider_key === input.provider_key);
  const existing = existingIndex >= 0 ? state.claims[existingIndex] : null;
  const nextRunId = input.run_id ?? null;
  const nextRunManifestPath = input.run_manifest_path ?? null;
  const runIdentityChanged = hasProviderRunIdentityChanged(existing, {
    task_id: input.task_id,
    run_id: nextRunId,
    run_manifest_path: nextRunManifestPath
  });
  const existingLaunchStartedAt =
    existing?.launch_started_at ??
    (
      existing?.launch_source === 'control-host' &&
      (
        existing.state === 'starting' ||
        existing.state === 'resuming'
      )
        ? existing.updated_at
        : null
    );
  const nextLaunchStartedAt =
    input.launch_started_at === undefined
      ? runIdentityChanged
        ? null
        : existingLaunchStartedAt ??
          (
            input.launch_source === 'control-host' &&
            (
              input.state === 'starting' ||
              input.state === 'resuming' ||
              input.state === 'handoff_failed'
            )
              ? now
              : null
          )
      : input.launch_started_at;
  const retryStateDefaults =
    existing?.retry_attempt !== null && existing?.retry_attempt !== undefined
      ? input.state === 'resumable' || input.state === 'handoff_failed'
        ? {
            retryQueued: existing?.retry_queued ?? null,
            retryDueAt: existing?.retry_due_at ?? null,
            retryError: existing?.retry_error ?? null
          }
        : {
            retryQueued: false,
            retryDueAt: null,
            retryError: null
          }
      : {
          retryQueued: existing?.retry_queued ?? null,
          retryDueAt: existing?.retry_due_at ?? null,
          retryError: existing?.retry_error ?? null
        };
  const next: ProviderIntakeClaimRecord = {
    provider: 'linear',
    provider_key: input.provider_key,
    issue_id: input.issue_id,
    issue_identifier: input.issue_identifier,
    issue_title: input.issue_title,
    issue_state: input.issue_state ?? null,
    issue_state_type: input.issue_state_type ?? null,
    issue_updated_at: input.issue_updated_at ?? null,
    issue_assignee_id: input.issue_assignee_id ?? null,
    issue_assignee_name: input.issue_assignee_name ?? null,
    issue_blocked_by:
      input.issue_blocked_by === undefined
        ? normalizeProviderIssueBlockedBy(existing?.issue_blocked_by)
        : normalizeProviderIssueBlockedBy(input.issue_blocked_by),
    task_id: input.task_id,
    mapping_source: input.mapping_source,
    state: input.state,
    reason: input.reason ?? null,
    accepted_at: input.accepted_at ?? existing?.accepted_at ?? now,
    updated_at: now,
    last_delivery_id: input.last_delivery_id ?? null,
    last_event: input.last_event ?? null,
    last_action: input.last_action ?? null,
    last_webhook_timestamp: input.last_webhook_timestamp ?? null,
    run_id: nextRunId,
    run_manifest_path: nextRunManifestPath,
    launch_source:
      input.launch_source === undefined
        ? runIdentityChanged
          ? null
          : existing?.launch_source ?? null
        : input.launch_source,
    launch_token:
      input.launch_token === undefined
        ? runIdentityChanged
          ? null
          : existing?.launch_token ?? null
        : input.launch_token,
    launch_started_at: nextLaunchStartedAt,
    retry_queued:
      input.retry_queued === undefined
        ? retryStateDefaults.retryQueued
        : normalizeRetryQueued(input.retry_queued),
    retry_attempt:
      input.retry_attempt === undefined
        ? existing?.retry_attempt ?? null
        : normalizeRetryAttempt(input.retry_attempt),
    retry_due_at:
      input.retry_due_at === undefined
        ? retryStateDefaults.retryDueAt
        : normalizeRetryTimestamp(input.retry_due_at),
    retry_error:
      input.retry_error === undefined
        ? retryStateDefaults.retryError
        : normalizeRetryError(input.retry_error)
  };

  if (existingIndex >= 0) {
    state.claims.splice(existingIndex, 1, next);
  } else {
    state.claims.push(next);
  }

  state.updated_at = now;
  state.latest_provider_key = next.provider_key;
  state.latest_reason = next.reason;
  state.claims = state.claims.slice(-PROVIDER_INTAKE_CLAIM_LIMIT);

  return next;
}

function hasProviderRunIdentityChanged(
  existing: ProviderIntakeClaimRecord | null,
  next: Pick<ProviderIntakeClaimRecord, 'task_id' | 'run_id' | 'run_manifest_path'>
): boolean {
  if (!existing) {
    return false;
  }

  if (existing.task_id !== next.task_id) {
    return true;
  }

  const existingRunId = existing.run_id ?? null;
  const nextRunId = next.run_id ?? null;
  if (existingRunId || nextRunId) {
    if (!existingRunId && nextRunId) {
      return false;
    }
    return existingRunId !== nextRunId;
  }

  return (existing.run_manifest_path ?? null) !== (next.run_manifest_path ?? null);
}

export function markProviderIntakeRehydrated(
  state: ProviderIntakeState,
  at: string = isoTimestamp()
): void {
  state.rehydrated_at = at;
  state.updated_at = at;
}

export function selectProviderIntakeClaim(
  state: ProviderIntakeState | null | undefined
): ProviderIntakeClaimRecord | null {
  if (!state || state.claims.length === 0) {
    return null;
  }
  return [...state.claims].sort(compareProviderClaims)[0] ?? null;
}

export function buildProviderIntakeSummary(
  state: ProviderIntakeState | null | undefined
): ProviderIntakeSummaryPayload | null {
  const claim = selectProviderIntakeClaim(state);
  if (!claim) {
    return null;
  }
  return {
    provider: claim.provider,
    issue_id: claim.issue_id,
    issue_identifier: claim.issue_identifier,
    issue_title: claim.issue_title,
    issue_state: claim.issue_state,
    issue_state_type: claim.issue_state_type,
    issue_updated_at: claim.issue_updated_at,
    issue_assignee_id: claim.issue_assignee_id ?? null,
    issue_assignee_name: claim.issue_assignee_name ?? null,
    task_id: claim.task_id,
    mapping_source: claim.mapping_source,
    state: deriveProviderIntakeSummaryState(claim),
    reason: claim.reason,
    run_id: claim.run_id,
    updated_at: claim.updated_at
  };
}

export function hasQueuedProviderIntakeRetry(
  claim: Pick<ProviderIntakeClaimRecord, 'retry_queued' | 'retry_attempt'> | null | undefined
): boolean {
  return claim?.retry_queued === true;
}

function normalizeProviderIntakeClaim(
  input: ProviderIntakeClaimRecord | null | undefined
): ProviderIntakeClaimRecord | null {
  if (!input || input.provider !== 'linear') {
    return null;
  }
  if (
    !input.provider_key ||
    !input.issue_id ||
    !input.issue_identifier ||
    !input.issue_title ||
    !input.task_id
  ) {
    return null;
  }
  const state = normalizeClaimState(input.state);
  const updatedAt =
    typeof input.updated_at === 'string' && input.updated_at.trim().length > 0
      ? input.updated_at
      : new Date(0).toISOString();
  const launchSource = input.launch_source === 'control-host' ? 'control-host' : null;
  const launchStartedAt =
    typeof input.launch_started_at === 'string' && input.launch_started_at.trim().length > 0
      ? input.launch_started_at
      : launchSource === 'control-host' &&
          (state === 'starting' || state === 'resuming')
        ? updatedAt
        : null;
  return {
    provider: 'linear',
    provider_key: input.provider_key,
    issue_id: input.issue_id,
    issue_identifier: input.issue_identifier,
    issue_title: input.issue_title,
    issue_state: typeof input.issue_state === 'string' ? input.issue_state : null,
    issue_state_type: typeof input.issue_state_type === 'string' ? input.issue_state_type : null,
    issue_updated_at: typeof input.issue_updated_at === 'string' ? input.issue_updated_at : null,
    issue_assignee_id:
      typeof input.issue_assignee_id === 'string' ? input.issue_assignee_id : null,
    issue_assignee_name:
      typeof input.issue_assignee_name === 'string' ? input.issue_assignee_name : null,
    issue_blocked_by: normalizeProviderIssueBlockedBy(input.issue_blocked_by),
    task_id: input.task_id,
    mapping_source: 'provider_id_fallback',
    state,
    reason: typeof input.reason === 'string' ? input.reason : null,
    accepted_at:
      typeof input.accepted_at === 'string' && input.accepted_at.trim().length > 0
        ? input.accepted_at
        : new Date(0).toISOString(),
    updated_at: updatedAt,
    last_delivery_id: typeof input.last_delivery_id === 'string' ? input.last_delivery_id : null,
    last_event: typeof input.last_event === 'string' ? input.last_event : null,
    last_action: typeof input.last_action === 'string' ? input.last_action : null,
    last_webhook_timestamp:
      typeof input.last_webhook_timestamp === 'number' &&
      Number.isFinite(input.last_webhook_timestamp)
        ? input.last_webhook_timestamp
        : null,
    run_id: typeof input.run_id === 'string' ? input.run_id : null,
    run_manifest_path:
      typeof input.run_manifest_path === 'string' ? input.run_manifest_path : null,
    launch_source: launchSource,
    launch_token: typeof input.launch_token === 'string' ? input.launch_token : null,
    launch_started_at: launchStartedAt,
    retry_queued: normalizeRetryQueued(input.retry_queued),
    retry_attempt: normalizeRetryAttempt(input.retry_attempt),
    retry_due_at: normalizeRetryTimestamp(input.retry_due_at),
    retry_error: normalizeRetryError(input.retry_error)
  };
}

function normalizeRetryQueued(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function normalizeProviderIssueBlockedBy(
  value: LiveLinearTrackedIssue['blocked_by'] | null | undefined
): LiveLinearTrackedIssue['blocked_by'] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value.map((blocker) => ({
    id: typeof blocker?.id === 'string' ? blocker.id : null,
    identifier: typeof blocker?.identifier === 'string' ? blocker.identifier : null,
    state: typeof blocker?.state === 'string' ? blocker.state : null,
    state_type: typeof blocker?.state_type === 'string' ? blocker.state_type : null
  }));
}

function normalizeRetryAttempt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeRetryTimestamp(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeRetryError(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeClaimState(value: string): ProviderIntakeClaimState {
  switch (value) {
    case 'ignored':
    case 'accepted':
    case 'starting':
    case 'running':
    case 'resuming':
    case 'resumable':
    case 'released':
    case 'completed':
    case 'stale':
    case 'duplicate':
    case 'handoff_failed':
      return value;
    default:
      return 'ignored';
  }
}

function deriveProviderIntakeSummaryState(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason'>
): ProviderIntakeSummaryState {
  if (
    claim.state === 'handoff_failed' &&
    claim.reason === 'provider_issue_handoff_owned'
  ) {
    return 'handoff_owned';
  }
  return claim.state;
}

function compareProviderClaims(
  left: ProviderIntakeClaimRecord,
  right: ProviderIntakeClaimRecord
): number {
  const rankDelta = rankClaimState(right.state) - rankClaimState(left.state);
  if (rankDelta !== 0) {
    return rankDelta;
  }
  return Date.parse(right.updated_at) - Date.parse(left.updated_at);
}

function rankClaimState(state: ProviderIntakeClaimState): number {
  switch (state) {
    case 'running':
      return 9;
    case 'resuming':
      return 8;
    case 'starting':
      return 7;
    case 'resumable':
      return 6;
    case 'accepted':
      return 5;
    case 'released':
      return 4;
    case 'handoff_failed':
      return 3;
    case 'completed':
      return 2;
    case 'duplicate':
      return 1;
    case 'stale':
      return 0;
    case 'ignored':
    default:
      return -1;
  }
}
