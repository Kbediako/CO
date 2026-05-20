import { slugify } from '../utils/strings.js';
import { isoTimestamp } from '../utils/time.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type {
  ProviderMergeCloseoutRecord,
  ProviderReviewHandoffPromotionRecord
} from './providerMergeCloseout.js';
import {
  deriveProviderIntakeClaimFreshness,
  type ProviderIntakeClaimFreshness
} from './providerIssueObservability.js';
import { normalizeProviderWorkerHostName } from './providerWorkerHosts.js';

const PROVIDER_INTAKE_CLAIM_LIMIT = 128;
const TERMINAL_PROVIDER_INTAKE_ISSUE_STATES = new Set([
  'closed',
  'cancelled',
  'canceled',
  'duplicate',
  'done'
]);
const TERMINAL_PROVIDER_INTAKE_ISSUE_STATE_TYPES = new Set([
  'completed',
  'cancelled',
  'canceled'
]);

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
  issue_archived_at?: string | null;
  issue_trashed?: boolean | null;
  issue_viewer_id?: string | null;
  issue_viewer_auth_fingerprint?: string | null;
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
  worker_host?: string | null;
  launch_source: ProviderLaunchSource | null;
  launch_token: string | null;
  launch_started_at?: string | null;
  retry_queued?: boolean | null;
  retry_attempt?: number | null;
  retry_due_at?: string | null;
  retry_error?: string | null;
  review_promotion?: ProviderReviewHandoffPromotionRecord | null;
  merge_closeout?: ProviderMergeCloseoutRecord | null;
}

export interface ProviderIntakeState {
  schema_version: number;
  updated_at: string;
  rehydrated_at: string | null;
  latest_provider_key: string | null;
  latest_reason: string | null;
  authority?: ProviderIntakeAuthorityMetadata | null;
  polling?: Record<string, unknown> | null;
  claims: ProviderIntakeClaimRecord[];
}

export type ProviderIntakeAuthorityUnavailableReason =
  | 'raw_provider_intake_unavailable'
  | 'raw_provider_intake_read_failed'
  | 'stale_supervised_control_host_source';

export interface ProviderIntakeAuthorityMetadata {
  status: 'unavailable';
  reason: ProviderIntakeAuthorityUnavailableReason;
  updated_at: string | null;
}

export interface ProviderIntakeRetrySummaryPayload {
  active: boolean;
  attempt: number | null;
  due_at: string | null;
  error: string | null;
}

export type ProviderIntakeSummaryScope = 'single_claim' | 'selected_claim';
export type ProviderIntakeSummarySelectionStrategy = 'state_rank_updated_at';

export interface ProviderIntakeClaimSummaryPayload {
  provider: 'linear';
  issue_id: string;
  issue_identifier: string;
  issue_title: string;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
  issue_archived_at?: string | null;
  issue_trashed?: boolean | null;
  issue_viewer_id?: string | null;
  issue_assignee_id?: string | null;
  issue_assignee_name?: string | null;
  task_id: string;
  mapping_source: ProviderTaskMappingSource;
  state: ProviderIntakeSummaryState;
  reason: string | null;
  run_id: string | null;
  worker_host?: string | null;
  freshness: ProviderIntakeClaimFreshness | null;
  retry: ProviderIntakeRetrySummaryPayload | null;
  updated_at: string;
}

export interface ProviderIntakeSummaryPayload {
  provider: 'linear';
  summary_scope: ProviderIntakeSummaryScope;
  selection_strategy: ProviderIntakeSummarySelectionStrategy | null;
  claim_count: number;
  active_claim_count: number;
  running_claim_count: number;
  active_issue_identifiers: string[];
  running_issue_identifiers: string[];
  selected_claim: ProviderIntakeClaimSummaryPayload;
  rehydrated_at: string | null;
  is_rehydrated: boolean;
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
    polling: null,
    claims: []
  };
  const authority = normalizeProviderIntakeAuthority(
    isRecordLike(state) ? state.authority : null
  );
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
    ...(authority ? { authority } : {}),
    polling: isRecordLike(state.polling) ? { ...state.polling } : null,
    claims: Array.isArray(state.claims)
      ? state.claims
          .map(normalizeProviderIntakeClaim)
          .filter((claim): claim is ProviderIntakeClaimRecord => claim !== null)
          .slice(-PROVIDER_INTAKE_CLAIM_LIMIT)
      : []
  };
}

export function markProviderIntakeAuthorityUnavailable(
  state: ProviderIntakeState,
  reason: ProviderIntakeAuthorityUnavailableReason = 'raw_provider_intake_unavailable'
): void {
  state.authority = {
    status: 'unavailable',
    reason,
    updated_at: null
  };
}

export function clearProviderIntakeAuthority(state: ProviderIntakeState): void {
  delete state.authority;
}

function normalizeProviderIntakeAuthority(value: unknown): ProviderIntakeAuthorityMetadata | null {
  if (!isRecordLike(value) || value.status !== 'unavailable') {
    return null;
  }
  return {
    status: 'unavailable',
    reason:
      value.reason === 'raw_provider_intake_unavailable' ||
      value.reason === 'raw_provider_intake_read_failed' ||
      value.reason === 'stale_supervised_control_host_source'
        ? value.reason
        : 'raw_provider_intake_unavailable',
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : null
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
    input.state === 'starting' || input.state === 'resuming' || input.state === 'running'
      ? {
          retryQueued: false,
          retryDueAt: null,
          retryError: existing?.retry_error ?? null
        }
      : existing?.retry_attempt !== null && existing?.retry_attempt !== undefined
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
    issue_archived_at:
      input.issue_archived_at === undefined
        ? existing?.issue_archived_at ?? null
        : input.issue_archived_at ?? null,
    issue_trashed:
      input.issue_trashed === undefined
        ? existing?.issue_trashed ?? null
        : normalizeOptionalBoolean(input.issue_trashed),
    issue_viewer_id:
      input.issue_viewer_id === undefined
        ? existing?.issue_viewer_id ?? null
        : input.issue_viewer_id ?? null,
    issue_viewer_auth_fingerprint:
      input.issue_viewer_auth_fingerprint === undefined
        ? existing?.issue_viewer_auth_fingerprint ?? null
        : input.issue_viewer_auth_fingerprint ?? null,
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
    worker_host:
      input.worker_host === undefined
        ? runIdentityChanged
          ? null
          : existing?.worker_host ?? null
        : normalizeProviderWorkerHostName(input.worker_host),
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
        : normalizeRetryError(input.retry_error),
    review_promotion:
      input.review_promotion === undefined
        ? cloneProviderReviewHandoffPromotionRecord(existing?.review_promotion)
        : cloneProviderReviewHandoffPromotionRecord(input.review_promotion),
    merge_closeout:
      input.merge_closeout === undefined
        ? cloneProviderMergeCloseoutRecord(existing?.merge_closeout)
        : cloneProviderMergeCloseoutRecord(input.merge_closeout)
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
  const claims = [...state.claims].sort(compareProviderClaims);
  const activeClaims = claims.filter(isActiveProviderIntakeClaim);
  return activeClaims[0] ?? claims[0] ?? null;
}

export function buildProviderIntakeSummary(
  state: ProviderIntakeState | null | undefined
): ProviderIntakeSummaryPayload | null {
  const normalizedState = normalizeProviderIntakeState(state);
  const claims = [...normalizedState.claims].sort(compareProviderClaims);
  const activeClaims = claims.filter(isActiveProviderIntakeClaim);
  const runningClaims = claims.filter(
    (candidate) => candidate.state === 'running' && isActiveProviderIntakeClaim(candidate)
  );
  const claim = selectProviderIntakeClaim(normalizedState);
  if (!claim) {
    return null;
  }
  const selectedClaim = buildProviderIntakeClaimSummary({
    claim,
    rehydratedAt: normalizedState.rehydrated_at
  });
  return {
    provider: claim.provider,
    summary_scope: activeClaims.length > 1 ? 'selected_claim' : 'single_claim',
    selection_strategy: activeClaims.length > 1 ? 'state_rank_updated_at' : null,
    claim_count: claims.length,
    active_claim_count: activeClaims.length,
    running_claim_count: runningClaims.length,
    active_issue_identifiers: activeClaims.map((candidate) => candidate.issue_identifier),
    running_issue_identifiers: runningClaims.map((candidate) => candidate.issue_identifier),
    selected_claim: selectedClaim,
    rehydrated_at: normalizedState.rehydrated_at,
    is_rehydrated: selectedClaim.freshness === 'rehydrated',
    updated_at: normalizedState.updated_at
  };
}

function buildProviderIntakeClaimSummary(input: {
  claim: ProviderIntakeClaimRecord;
  rehydratedAt: string | null;
}): ProviderIntakeClaimSummaryPayload {
  const freshness = deriveProviderIntakeClaimFreshness({
    claim: input.claim,
    rehydrated_at: input.rehydratedAt
  });
  return {
    provider: input.claim.provider,
    issue_id: input.claim.issue_id,
    issue_identifier: input.claim.issue_identifier,
    issue_title: input.claim.issue_title,
    issue_state: input.claim.issue_state,
    issue_state_type: input.claim.issue_state_type,
    issue_updated_at: input.claim.issue_updated_at,
    issue_archived_at: input.claim.issue_archived_at ?? null,
    issue_trashed: input.claim.issue_trashed ?? null,
    issue_viewer_id: input.claim.issue_viewer_id ?? null,
    issue_assignee_id: input.claim.issue_assignee_id ?? null,
    issue_assignee_name: input.claim.issue_assignee_name ?? null,
    task_id: input.claim.task_id,
    mapping_source: input.claim.mapping_source,
    state: deriveProviderIntakeSummaryState(input.claim),
    reason: input.claim.reason,
    run_id: input.claim.run_id,
    worker_host: input.claim.worker_host ?? null,
    freshness,
    retry: buildProviderIntakeRetrySummary(input.claim),
    updated_at: input.claim.updated_at
  };
}

export function hasQueuedProviderIntakeRetry(
  claim:
    | (Pick<ProviderIntakeClaimRecord, 'retry_queued' | 'retry_attempt'> &
        Partial<
          Pick<
            ProviderIntakeClaimRecord,
            'issue_state' | 'issue_state_type' | 'issue_archived_at' | 'issue_trashed'
          >
        >)
    | null
    | undefined
): boolean {
  return claim?.retry_queued === true && !isTerminalProviderIntakeIssueState(claim);
}

function buildProviderIntakeRetrySummary(
  claim: Pick<
    ProviderIntakeClaimRecord,
    | 'retry_queued'
    | 'retry_attempt'
    | 'retry_due_at'
    | 'retry_error'
    | 'issue_state'
    | 'issue_state_type'
    | 'issue_archived_at'
    | 'issue_trashed'
  > | null
): ProviderIntakeRetrySummaryPayload | null {
  if (!claim) {
    return null;
  }
  const active = hasQueuedProviderIntakeRetry(claim);
  const attempt = claim.retry_attempt ?? null;
  const dueAt = claim.retry_due_at ?? null;
  const error = claim.retry_error ?? null;
  if (!active && attempt === null && dueAt === null && error === null) {
    return null;
  }
  return {
    active,
    attempt,
    due_at: dueAt,
    error
  };
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
  const normalized: ProviderIntakeClaimRecord = {
    provider: 'linear',
    provider_key: input.provider_key,
    issue_id: input.issue_id,
    issue_identifier: input.issue_identifier,
    issue_title: input.issue_title,
    issue_state: typeof input.issue_state === 'string' ? input.issue_state : null,
    issue_state_type: typeof input.issue_state_type === 'string' ? input.issue_state_type : null,
    issue_updated_at: typeof input.issue_updated_at === 'string' ? input.issue_updated_at : null,
    issue_archived_at:
      typeof input.issue_archived_at === 'string' ? input.issue_archived_at : null,
    issue_trashed: normalizeOptionalBoolean(input.issue_trashed),
    issue_viewer_id:
      typeof input.issue_viewer_id === 'string' ? input.issue_viewer_id : null,
    issue_viewer_auth_fingerprint:
      typeof input.issue_viewer_auth_fingerprint === 'string'
        ? input.issue_viewer_auth_fingerprint
        : null,
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
    worker_host: normalizeProviderWorkerHostName(input.worker_host),
    launch_source: launchSource,
    launch_token: typeof input.launch_token === 'string' ? input.launch_token : null,
    launch_started_at: launchStartedAt,
    review_promotion: cloneProviderReviewHandoffPromotionRecord(input.review_promotion),
    merge_closeout: cloneProviderMergeCloseoutRecord(input.merge_closeout)
  };
  if (hasOwnField(input, 'retry_queued')) {
    normalized.retry_queued = normalizeRetryQueued(input.retry_queued);
  }
  if (hasOwnField(input, 'retry_attempt')) {
    normalized.retry_attempt = normalizeRetryAttempt(input.retry_attempt);
  }
  if (hasOwnField(input, 'retry_due_at')) {
    normalized.retry_due_at = normalizeRetryTimestamp(input.retry_due_at);
  }
  if (hasOwnField(input, 'retry_error')) {
    normalized.retry_error = normalizeRetryError(input.retry_error);
  }
  return normalized;
}

export function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwnField(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeRetryQueued(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function normalizeOptionalBoolean(value: unknown): boolean | null {
  return normalizeRetryQueued(value);
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

function cloneProviderMergeCloseoutRecord(
  value: ProviderMergeCloseoutRecord | null | undefined
): ProviderMergeCloseoutRecord | null {
  return isRecordLike(value)
    ? (JSON.parse(JSON.stringify(value)) as ProviderMergeCloseoutRecord)
    : null;
}

function cloneProviderReviewHandoffPromotionRecord(
  value: ProviderReviewHandoffPromotionRecord | null | undefined
): ProviderReviewHandoffPromotionRecord | null {
  return isRecordLike(value)
    ? (JSON.parse(JSON.stringify(value)) as ProviderReviewHandoffPromotionRecord)
    : null;
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

export function isActiveProviderIntakeClaim(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'retry_queued' | 'issue_state' | 'issue_state_type'
  > &
    Partial<
      Pick<ProviderIntakeClaimRecord, 'issue_archived_at' | 'issue_trashed'>
  >
): boolean {
  if (isTerminalProviderIntakeIssueState(claim)) {
    return false;
  }
  if (claim.retry_queued === true) {
    return true;
  }
  switch (claim.state) {
    case 'accepted':
    case 'starting':
    case 'running':
    case 'resuming':
    case 'resumable':
      return true;
    case 'handoff_failed':
      if (claim.reason === 'provider_issue_merge_closeout_action_required') {
        return false;
      }
      return true;
    case 'released':
    case 'completed':
    case 'stale':
    case 'duplicate':
    case 'ignored':
    default:
      return false;
  }
}

export function isTerminalProviderIntakeIssueState(
  claim: Partial<
    Pick<
      ProviderIntakeClaimRecord,
      'issue_state' | 'issue_state_type' | 'issue_archived_at' | 'issue_trashed'
    >
  >
): boolean {
  if (claim.issue_trashed === true) {
    return true;
  }
  if (normalizeProviderIntakeIssueStateValue(claim.issue_archived_at) !== null) {
    return true;
  }
  const normalizedState = normalizeProviderIntakeIssueStateValue(claim.issue_state);
  const normalizedStateType = normalizeProviderIntakeIssueStateValue(claim.issue_state_type);
  return (
    (normalizedStateType !== null &&
      TERMINAL_PROVIDER_INTAKE_ISSUE_STATE_TYPES.has(normalizedStateType)) ||
    (normalizedState !== null &&
      TERMINAL_PROVIDER_INTAKE_ISSUE_STATES.has(normalizedState))
  );
}

function normalizeProviderIntakeIssueStateValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
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
