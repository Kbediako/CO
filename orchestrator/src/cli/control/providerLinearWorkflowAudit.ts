import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';

export const PROVIDER_LINEAR_AUDIT_ENV_VAR = 'CODEX_PROVIDER_LINEAR_AUDIT_PATH';

export type ProviderLinearAuditOperation =
  | 'issue-context'
  | 'upsert-workpad'
  | 'delete-workpad'
  | 'transition'
  | 'attach-pr'
  | 'parallelization'
  | 'screenshot-proof'
  | 'runtime-proof'
  | 'create-follow-up'
  | 'child-stream'
  | 'child-lane';

export type ProviderLinearParallelizationDecision =
  | 'parallelize_now'
  | 'stay_serial'
  | 'forbid_parallel';

export type ProviderLinearParallelizationReason =
  | 'independent_scope_available'
  | 'single_bounded_change'
  | 'overlapping_scope'
  | 'existing_child_lane_active'
  | 'review_or_validation_only'
  | 'parent_only_mutation'
  | 'merge_or_handoff_state'
  | 'blocked_by_dependency';

export interface ProviderLinearParallelizationSnapshot {
  decision: ProviderLinearParallelizationDecision;
  reason: ProviderLinearParallelizationReason;
  summary: string | null;
  recorded_at: string;
  decision_lineage?: ProviderLinearDecisionLineage | null;
}

export interface ProviderLinearDecisionLineage {
  schema_version: 1;
  parent_task_id: string | null;
  parent_run_id: string | null;
  parent_turn_started_at: string | null;
  parent_turn_id: string | null;
  parent_turn_count: number | null;
  decision_id: string | null;
  decision_recorded_at: string | null;
  decision: ProviderLinearParallelizationDecision | null;
  reason: ProviderLinearParallelizationReason | null;
}

export const PROVIDER_LINEAR_PARALLELIZATION_REASONS = {
  parallelize_now: ['independent_scope_available'],
  stay_serial: [
    'single_bounded_change',
    'overlapping_scope',
    'existing_child_lane_active',
    'review_or_validation_only'
  ],
  forbid_parallel: ['parent_only_mutation', 'merge_or_handoff_state', 'blocked_by_dependency']
} as const satisfies Record<
  ProviderLinearParallelizationDecision,
  readonly ProviderLinearParallelizationReason[]
>;

export interface ProviderLinearAuditEntry {
  recorded_at: string;
  operation: ProviderLinearAuditOperation;
  ok: boolean;
  issue_id: string | null;
  issue_identifier: string | null;
  source_setup: DispatchPilotSourceSetup | null;
  action: string | null;
  via: string | null;
  state: string | null;
  follow_up_issue_id: string | null;
  follow_up_issue_identifier: string | null;
  follow_up_intent_key?: string | null;
  failed_relation_type: string | null;
  comment_id: string | null;
  attachment_id: string | null;
  asset_urls?: string[] | null;
  previous_state?: string | null;
  previous_state_type?: string | null;
  target_state?: string | null;
  target_state_type?: string | null;
  issue_updated_at?: string | null;
  expected_state?: string | null;
  expected_state_type?: string | null;
  expected_updated_at?: string | null;
  force?: boolean | null;
  force_reason?: string | null;
  decision_lineage?: ProviderLinearDecisionLineage | null;
  error_code: string | null;
  error_message: string | null;
}

export interface ProviderLinearAuditSummary {
  path: string;
  attempted_count: number;
  success_count: number;
  failure_count: number;
  latest_recorded_at: string | null;
  latest_by_operation: Partial<Record<ProviderLinearAuditOperation, ProviderLinearAuditEntry>>;
  parallelization_entries: ProviderLinearAuditEntry[];
  entries?: ProviderLinearAuditEntry[];
}

export function isProviderLinearParallelizationDecision(
  value: string | null | undefined
): value is ProviderLinearParallelizationDecision {
  return value === 'parallelize_now' || value === 'stay_serial' || value === 'forbid_parallel';
}

export function isProviderLinearParallelizationReason(
  value: string | null | undefined
): value is ProviderLinearParallelizationReason {
  return (
    value === 'independent_scope_available' ||
    value === 'single_bounded_change' ||
    value === 'overlapping_scope' ||
    value === 'existing_child_lane_active' ||
    value === 'review_or_validation_only' ||
    value === 'parent_only_mutation' ||
    value === 'merge_or_handoff_state' ||
    value === 'blocked_by_dependency'
  );
}

export function isProviderLinearParallelizationReasonAllowed(
  decision: ProviderLinearParallelizationDecision,
  reason: ProviderLinearParallelizationReason
): boolean {
  return (
    PROVIDER_LINEAR_PARALLELIZATION_REASONS[decision] as readonly ProviderLinearParallelizationReason[]
  ).includes(reason);
}

export function readProviderLinearParallelizationSnapshots(
  audit: ProviderLinearAuditSummary | null | undefined,
  options: {
    issueId?: string | null;
    recordedAtNotBefore?: string | null;
  } = {}
): ProviderLinearParallelizationSnapshot[] {
  const issueId = normalizeOptionalString(options.issueId);
  const recordedAtNotBefore = normalizeOptionalString(options.recordedAtNotBefore);
  return selectProviderLinearParallelizationEntries(audit)
    .filter((entry) => entry.ok)
    .filter((entry) => !issueId || entry.issue_id === issueId)
    .filter(
      (entry) =>
        !recordedAtNotBefore || compareIsoTimestamp(entry.recorded_at, recordedAtNotBefore) >= 0
    )
    .flatMap((entry) => {
      const decision = normalizeOptionalString(entry.action);
      const reason = normalizeOptionalString(entry.state);
      if (
        !isProviderLinearParallelizationDecision(decision) ||
        !isProviderLinearParallelizationReason(reason) ||
        !isProviderLinearParallelizationReasonAllowed(decision, reason)
      ) {
        return [];
      }
      return [{
        decision,
        reason,
        summary: normalizeOptionalString(entry.via),
        recorded_at: entry.recorded_at,
        decision_lineage: entry.decision_lineage ?? null
      }];
    })
    .sort((left, right) => compareIsoTimestamp(left.recorded_at, right.recorded_at));
}

export function readProviderLinearParallelizationSnapshot(
  audit: ProviderLinearAuditSummary | null | undefined,
  options: {
    issueId?: string | null;
    recordedAtNotBefore?: string | null;
  } = {}
): ProviderLinearParallelizationSnapshot | null {
  return readProviderLinearParallelizationSnapshots(audit, options).at(-1) ?? null;
}

export function resolveProviderLinearAuditPath(env: NodeJS.ProcessEnv): string | null {
  const value = env[PROVIDER_LINEAR_AUDIT_ENV_VAR];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function appendProviderLinearAuditEntry(
  auditPath: string,
  entry: ProviderLinearAuditEntry
): Promise<void> {
  await mkdir(dirname(auditPath), { recursive: true });
  await appendFile(auditPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

export async function summarizeProviderLinearAuditPath(
  auditPath: string
): Promise<ProviderLinearAuditSummary> {
  const summary = buildEmptyProviderLinearAuditSummary(auditPath);
  let raw: string;
  try {
    raw = await readFile(auditPath, 'utf8');
  } catch {
    return summary;
  }

  for (const line of raw.split(/\r?\n/u)) {
    if (line.trim().length === 0) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const entry = normalizeProviderLinearAuditEntry(parsed);
    if (!entry) {
      continue;
    }
    summary.attempted_count += 1;
    if (entry.ok) {
      summary.success_count += 1;
    } else {
      summary.failure_count += 1;
    }
    summary.entries?.push(entry);
    summary.latest_by_operation[entry.operation] = entry;
    if (entry.operation === 'parallelization') {
      summary.parallelization_entries.push(entry);
    }
    summary.latest_recorded_at = entry.recorded_at;
  }

  return summary;
}

function buildEmptyProviderLinearAuditSummary(auditPath: string): ProviderLinearAuditSummary {
  return {
    path: auditPath,
    attempted_count: 0,
    success_count: 0,
    failure_count: 0,
    latest_recorded_at: null,
    latest_by_operation: {},
    parallelization_entries: [],
    entries: []
  };
}

function selectProviderLinearParallelizationEntries(
  audit: ProviderLinearAuditSummary | null | undefined
): ProviderLinearAuditEntry[] {
  if (Array.isArray(audit?.parallelization_entries) && audit.parallelization_entries.length > 0) {
    return audit.parallelization_entries.filter((entry): entry is ProviderLinearAuditEntry => Boolean(entry));
  }
  const latestEntry = audit?.latest_by_operation?.parallelization ?? null;
  return latestEntry ? [latestEntry] : [];
}

function normalizeProviderLinearAuditEntry(value: unknown): ProviderLinearAuditEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const entry = value as Record<string, unknown>;
  const operation = entry.operation;
  if (
    operation !== 'issue-context'
    && operation !== 'upsert-workpad'
    && operation !== 'delete-workpad'
    && operation !== 'transition'
    && operation !== 'attach-pr'
    && operation !== 'parallelization'
    && operation !== 'screenshot-proof'
    && operation !== 'runtime-proof'
    && operation !== 'create-follow-up'
    && operation !== 'child-stream'
    && operation !== 'child-lane'
  ) {
    return null;
  }
  const recordedAt = normalizeOptionalString(entry.recorded_at);
  if (!recordedAt) {
    return null;
  }
  return {
    recorded_at: recordedAt,
    operation,
    ok: entry.ok === true,
    issue_id: normalizeOptionalString(entry.issue_id),
    issue_identifier: normalizeOptionalString(entry.issue_identifier),
    source_setup: normalizeSourceSetup(entry.source_setup),
    action: normalizeOptionalString(entry.action),
    via: normalizeOptionalString(entry.via),
    state: normalizeOptionalString(entry.state),
    follow_up_issue_id: normalizeOptionalString(entry.follow_up_issue_id),
    follow_up_issue_identifier: normalizeOptionalString(entry.follow_up_issue_identifier),
    ...(Object.prototype.hasOwnProperty.call(entry, 'follow_up_intent_key')
      ? { follow_up_intent_key: normalizeOptionalString(entry.follow_up_intent_key) }
      : {}),
    failed_relation_type: normalizeOptionalString(entry.failed_relation_type),
    comment_id: normalizeOptionalString(entry.comment_id),
    attachment_id: normalizeOptionalString(entry.attachment_id),
    ...(Array.isArray(entry.asset_urls)
      ? {
          asset_urls: entry.asset_urls
            .map((value) => normalizeOptionalString(value))
            .filter((value): value is string => value !== null)
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'previous_state')
      ? { previous_state: normalizeOptionalString(entry.previous_state) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'previous_state_type')
      ? { previous_state_type: normalizeOptionalString(entry.previous_state_type) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'target_state')
      ? { target_state: normalizeOptionalString(entry.target_state) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'target_state_type')
      ? { target_state_type: normalizeOptionalString(entry.target_state_type) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'issue_updated_at')
      ? { issue_updated_at: normalizeOptionalString(entry.issue_updated_at) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'expected_state')
      ? { expected_state: normalizeOptionalString(entry.expected_state) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'expected_state_type')
      ? { expected_state_type: normalizeOptionalString(entry.expected_state_type) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'expected_updated_at')
      ? { expected_updated_at: normalizeOptionalString(entry.expected_updated_at) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'force')
      && typeof entry.force === 'boolean'
      ? { force: entry.force }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'force_reason')
      ? { force_reason: normalizeOptionalString(entry.force_reason) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(entry, 'decision_lineage')
      ? { decision_lineage: normalizeProviderLinearDecisionLineage(entry.decision_lineage) }
      : {}),
    error_code: normalizeOptionalString(entry.error_code),
    error_message: normalizeOptionalString(entry.error_message)
  };
}

function normalizeSourceSetup(value: unknown): DispatchPilotSourceSetup | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.provider !== 'linear') {
    return null;
  }
  return {
    provider: 'linear',
    workspace_id: normalizeOptionalString(record.workspace_id),
    team_id: normalizeOptionalString(record.team_id),
    project_id: normalizeOptionalString(record.project_id)
  };
}

function normalizeProviderLinearDecisionLineage(value: unknown): ProviderLinearDecisionLineage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.schema_version !== 1) {
    return null;
  }
  const decision = normalizeOptionalString(record.decision);
  const reason = normalizeOptionalString(record.reason);
  if (
    !isProviderLinearParallelizationDecision(decision) ||
    !isProviderLinearParallelizationReason(reason) ||
    !isProviderLinearParallelizationReasonAllowed(decision, reason)
  ) {
    return null;
  }
  const normalized: ProviderLinearDecisionLineage = {
    schema_version: 1,
    parent_task_id: normalizeOptionalString(record.parent_task_id),
    parent_run_id: normalizeOptionalString(record.parent_run_id),
    parent_turn_started_at: normalizeOptionalString(record.parent_turn_started_at),
    parent_turn_id: normalizeOptionalString(record.parent_turn_id),
    parent_turn_count: normalizeOptionalNonNegativeInteger(record.parent_turn_count),
    decision_id: normalizeOptionalString(record.decision_id),
    decision_recorded_at: normalizeOptionalString(record.decision_recorded_at),
    decision,
    reason
  };
  return hasProviderLinearDecisionLineageIdentity(normalized) ? normalized : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function normalizeOptionalNonNegativeInteger(value: unknown): number | null {
  const normalized = normalizeOptionalInteger(value);
  return normalized !== null && normalized >= 0 ? normalized : null;
}

function hasProviderLinearDecisionLineageIdentity(lineage: ProviderLinearDecisionLineage): boolean {
  return Boolean(
    lineage.parent_run_id &&
    (lineage.parent_turn_started_at || lineage.parent_turn_id || lineage.parent_turn_count !== null)
  );
}

function compareIsoTimestamp(left: string | null | undefined, right: string | null | undefined): number {
  const leftValue = normalizeOptionalString(left);
  const rightValue = normalizeOptionalString(right);
  if (leftValue === rightValue) {
    return 0;
  }
  if (!leftValue) {
    return -1;
  }
  if (!rightValue) {
    return 1;
  }
  const leftMs = Date.parse(leftValue);
  const rightMs = Date.parse(rightValue);
  if (Number.isFinite(leftMs) && Number.isFinite(rightMs)) {
    return leftMs - rightMs;
  }
  if (Number.isFinite(leftMs)) {
    return 1;
  }
  if (Number.isFinite(rightMs)) {
    return -1;
  }
  return leftValue.localeCompare(rightValue);
}
