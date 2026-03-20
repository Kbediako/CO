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
  | 'completed'
  | 'stale'
  | 'duplicate'
  | 'handoff_failed';

export interface ProviderIntakeClaimRecord {
  provider: 'linear';
  provider_key: string;
  issue_id: string;
  issue_identifier: string;
  issue_title: string;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
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
  task_id: string;
  mapping_source: ProviderTaskMappingSource;
  state: ProviderIntakeClaimState;
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
    'accepted_at' | 'updated_at' | 'launch_source' | 'launch_token'
  > & {
    accepted_at?: string | null;
    updated_at?: string | null;
    launch_source?: ProviderLaunchSource | null;
    launch_token?: string | null;
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
  const next: ProviderIntakeClaimRecord = {
    provider: 'linear',
    provider_key: input.provider_key,
    issue_id: input.issue_id,
    issue_identifier: input.issue_identifier,
    issue_title: input.issue_title,
    issue_state: input.issue_state ?? null,
    issue_state_type: input.issue_state_type ?? null,
    issue_updated_at: input.issue_updated_at ?? null,
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
        : input.launch_token
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
    task_id: claim.task_id,
    mapping_source: claim.mapping_source,
    state: claim.state,
    reason: claim.reason,
    run_id: claim.run_id,
    updated_at: claim.updated_at
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
  return {
    provider: 'linear',
    provider_key: input.provider_key,
    issue_id: input.issue_id,
    issue_identifier: input.issue_identifier,
    issue_title: input.issue_title,
    issue_state: typeof input.issue_state === 'string' ? input.issue_state : null,
    issue_state_type: typeof input.issue_state_type === 'string' ? input.issue_state_type : null,
    issue_updated_at: typeof input.issue_updated_at === 'string' ? input.issue_updated_at : null,
    task_id: input.task_id,
    mapping_source: 'provider_id_fallback',
    state: normalizeClaimState(input.state),
    reason: typeof input.reason === 'string' ? input.reason : null,
    accepted_at:
      typeof input.accepted_at === 'string' && input.accepted_at.trim().length > 0
        ? input.accepted_at
        : new Date(0).toISOString(),
    updated_at:
      typeof input.updated_at === 'string' && input.updated_at.trim().length > 0
        ? input.updated_at
        : new Date(0).toISOString(),
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
    launch_source: input.launch_source === 'control-host' ? 'control-host' : null,
    launch_token: typeof input.launch_token === 'string' ? input.launch_token : null
  };
}

function normalizeClaimState(value: string): ProviderIntakeClaimState {
  switch (value) {
    case 'ignored':
    case 'accepted':
    case 'starting':
    case 'running':
    case 'resuming':
    case 'resumable':
    case 'completed':
    case 'stale':
    case 'duplicate':
    case 'handoff_failed':
      return value;
    default:
      return 'ignored';
  }
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
    case 'handoff_failed':
      return 4;
    case 'completed':
      return 3;
    case 'duplicate':
      return 2;
    case 'stale':
      return 1;
    case 'ignored':
    default:
      return 0;
  }
}
