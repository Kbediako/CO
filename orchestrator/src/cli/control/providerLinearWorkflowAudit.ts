import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';

export const PROVIDER_LINEAR_AUDIT_ENV_VAR = 'CODEX_PROVIDER_LINEAR_AUDIT_PATH';

export type ProviderLinearAuditOperation =
  | 'issue-context'
  | 'upsert-workpad'
  | 'delete-workpad'
  | 'transition'
  | 'attach-pr';

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
  comment_id: string | null;
  attachment_id: string | null;
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
    summary.latest_by_operation[entry.operation] = entry;
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
    latest_by_operation: {}
  };
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
    comment_id: normalizeOptionalString(entry.comment_id),
    attachment_id: normalizeOptionalString(entry.attachment_id),
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

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
