import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { sanitizeTaskId } from '../../persistence/sanitizeTaskId.js';

const DEFAULT_REPORT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const REPORT_FILENAME = 'docs-freshness-maintenance.json';
const SCHEDULED_REPORT_DIR = 'docs-truthfulness-maintenance';
const LOCAL_REPORT_DIR = 'local';

export type DocsFreshnessMaintainRepoGateEvidenceStatus =
  | 'fresh'
  | 'missing'
  | 'invalid'
  | 'stale';

export interface DocsFreshnessMaintainRepoGateCandidate {
  path: string;
  status: 'valid' | 'missing' | 'invalid' | 'stale';
  reason: string | null;
  generated_at: string | null;
  age_ms: number | null;
}

export interface DocsFreshnessMaintainRepoGatePayload {
  id: 'docs_freshness_maintain';
  severity: string;
  freshness_decision: string;
  owner: {
    issue: string | null;
    action: string | null;
    state: string | null;
    state_type: string | null;
    verified: boolean;
  };
  spec_guard: {
    status: string;
    action_required_count: number;
  };
  capacity: Record<string, unknown> | null;
  next_expiry: string | null;
  action_required_count: number;
  blocks_unrelated_lanes: boolean;
  blocks_handoff: boolean;
  provider_wip_impact: 'excluded_repo_gate';
  sample_paths?: Record<string, unknown>;
  source_path?: string;
  generated_at?: string | null;
  evidence_status?: DocsFreshnessMaintainRepoGateEvidenceStatus;
  evidence_reason?: string | null;
  report_candidates?: DocsFreshnessMaintainRepoGateCandidate[];
}

export interface ControlRepoGatesPayload {
  docs_freshness_maintain: DocsFreshnessMaintainRepoGatePayload | null;
}

function readString(value: unknown, fallback = 'unknown'): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function readNonNegativeInteger(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) >= 0;
}

function readPositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasRequiredString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function readTimestampMs(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function normalizeDocsFreshnessMaintainRepoGate(
  value: unknown
): DocsFreshnessMaintainRepoGatePayload | null {
  const record = readRecord(value);
  if (!record || !isValidDocsFreshnessMaintainRepoGateRecord(record)) {
    return null;
  }
  const owner = readRecord(record.owner) ?? {};
  const specGuard = readRecord(record.spec_guard) ?? {};
  return {
    id: 'docs_freshness_maintain',
    severity: readString(record.severity),
    freshness_decision: readString(record.freshness_decision),
    owner: {
      issue: readNullableString(owner.issue),
      action: readNullableString(owner.action),
      state: readNullableString(owner.state),
      state_type: readNullableString(owner.state_type),
      verified: readBoolean(owner.verified)
    },
    spec_guard: {
      status: readString(specGuard.status),
      action_required_count: readNonNegativeInteger(specGuard.action_required_count)
    },
    capacity: readRecord(record.capacity),
    next_expiry: readNullableString(record.next_expiry),
    action_required_count: readNonNegativeInteger(record.action_required_count),
    blocks_unrelated_lanes: readBoolean(record.blocks_unrelated_lanes),
    blocks_handoff: readBoolean(record.blocks_handoff),
    provider_wip_impact: 'excluded_repo_gate',
    ...(readRecord(record.sample_paths) ? { sample_paths: readRecord(record.sample_paths) ?? undefined } : {}),
    ...(readNullableString(record.source_path) ? { source_path: readNullableString(record.source_path) ?? undefined } : {})
  };
}

function isValidDocsFreshnessMaintainRepoGateRecord(record: Record<string, unknown>): boolean {
  const owner = readRecord(record.owner);
  const specGuard = readRecord(record.spec_guard);
  if (record.id !== undefined && record.id !== 'docs_freshness_maintain') {
    return false;
  }
  return (
    hasRequiredString(record.severity) &&
    hasRequiredString(record.freshness_decision) &&
    owner !== null &&
    Object.hasOwn(owner, 'issue') &&
    (owner.issue === null || hasRequiredString(owner.issue)) &&
    hasRequiredString(owner.action) &&
    typeof owner.verified === 'boolean' &&
    specGuard !== null &&
    hasRequiredString(specGuard.status) &&
    isNonNegativeInteger(specGuard.action_required_count) &&
    isNonNegativeInteger(record.action_required_count) &&
    typeof record.blocks_unrelated_lanes === 'boolean' &&
    typeof record.blocks_handoff === 'boolean' &&
    record.provider_wip_impact === 'excluded_repo_gate'
  );
}

export function readDocsFreshnessMaintainRepoGate(options: {
  repoRoot?: string;
  reportPath?: string;
  outRoot?: string;
  env?: NodeJS.ProcessEnv;
  taskIds?: string[];
  now?: Date | string | number;
  maxAgeMs?: number;
} = {}): DocsFreshnessMaintainRepoGatePayload | null {
  const env = options.env ?? process.env;
  const repoRoot = resolve(options.repoRoot ?? env.CODEX_ORCHESTRATOR_ROOT ?? process.cwd());
  const outRoot = options.outRoot
    ? resolve(repoRoot, options.outRoot)
    : resolve(repoRoot, env.CODEX_ORCHESTRATOR_OUT_DIR ?? 'out');
  const nowMs = resolveNowMs(options.now);
  const maxAgeMs =
    options.maxAgeMs ??
    readPositiveInteger(env.CODEX_DOCS_FRESHNESS_REPO_GATE_MAX_AGE_MS) ??
    DEFAULT_REPORT_MAX_AGE_MS;
  const candidates = resolveCandidateReportPaths({ ...options, repoRoot, outRoot, env }).map((reportPath) =>
    readDocsFreshnessMaintainRepoGateCandidate(reportPath, nowMs, maxAgeMs)
  );
  const valid = candidates
    .filter((candidate): candidate is DocsFreshnessMaintainRepoGateCandidateReadResult & { gate: DocsFreshnessMaintainRepoGatePayload } =>
      candidate.status === 'valid' && candidate.gate !== null
    )
    .sort((left, right) => (right.generated_at_ms ?? 0) - (left.generated_at_ms ?? 0));
  const candidatePayloads = candidates.map(toCandidatePayload);
  const selected = valid[0];
  if (selected) {
    return {
      ...selected.gate,
      source_path: selected.path,
      generated_at: selected.generated_at,
      evidence_status: 'fresh',
      evidence_reason: null,
      report_candidates: candidatePayloads
    };
  }
  return buildDegradedDocsFreshnessRepoGate(candidates, candidatePayloads);
}

interface DocsFreshnessMaintainRepoGateCandidateReadResult extends DocsFreshnessMaintainRepoGateCandidate {
  gate: DocsFreshnessMaintainRepoGatePayload | null;
  generated_at_ms: number | null;
}

function resolveNowMs(value: Date | string | number | undefined): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Date.now();
}

function resolveCandidateReportPaths(options: {
  repoRoot: string;
  outRoot: string;
  reportPath?: string;
  env: NodeJS.ProcessEnv;
  taskIds?: string[];
}): string[] {
  if (options.reportPath) {
    return [resolve(options.repoRoot, options.reportPath)];
  }
  const env = options.env ?? {};
  const taskIds = [
    ...(options.taskIds ?? []),
    env.MCP_RUNNER_TASK_ID,
    env.CODEX_ORCHESTRATOR_TASK_ID,
    env.TASK
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .map((taskId) => safeSanitizeTaskId(taskId))
    .filter((taskId): taskId is string => taskId !== null);
  return uniqueStrings([
    join(options.outRoot, SCHEDULED_REPORT_DIR, REPORT_FILENAME),
    join(options.outRoot, LOCAL_REPORT_DIR, REPORT_FILENAME),
    ...taskIds.map((taskId) => join(options.outRoot, taskId, REPORT_FILENAME))
  ]);
}

function safeSanitizeTaskId(taskId: string): string | null {
  try {
    return sanitizeTaskId(taskId);
  } catch {
    return null;
  }
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

function readDocsFreshnessMaintainRepoGateCandidate(
  reportPath: string,
  nowMs: number,
  maxAgeMs: number
): DocsFreshnessMaintainRepoGateCandidateReadResult {
  if (!existsSync(reportPath)) {
    return {
      path: reportPath,
      status: 'missing',
      reason: 'report_missing',
      generated_at: null,
      generated_at_ms: null,
      age_ms: null,
      gate: null
    };
  }
  try {
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as Record<string, unknown>;
    const gate = normalizeDocsFreshnessMaintainRepoGate(report.repo_gate);
    if (!gate) {
      return {
        path: reportPath,
        status: 'invalid',
        reason: 'repo_gate_missing_or_invalid',
        generated_at: readNullableString(report.generated_at),
        generated_at_ms: readTimestampMs(report.generated_at),
        age_ms: null,
        gate: null
      };
    }
    const generatedAt = readNullableString(report.generated_at);
    const generatedAtMs = readTimestampMs(generatedAt);
    if (generatedAtMs === null) {
      return {
        path: reportPath,
        status: 'invalid',
        reason: 'generated_at_missing_or_invalid',
        generated_at: generatedAt,
        generated_at_ms: null,
        age_ms: null,
        gate
      };
    }
    const ageMs = Math.max(0, nowMs - generatedAtMs);
    if (ageMs > maxAgeMs) {
      return {
        path: reportPath,
        status: 'stale',
        reason: 'report_stale',
        generated_at: generatedAt,
        generated_at_ms: generatedAtMs,
        age_ms: ageMs,
        gate
      };
    }
    return {
      path: reportPath,
      status: 'valid',
      reason: null,
      generated_at: generatedAt,
      generated_at_ms: generatedAtMs,
      age_ms: ageMs,
      gate
    };
  } catch {
    return {
      path: reportPath,
      status: 'invalid',
      reason: 'json_parse_failed',
      generated_at: null,
      generated_at_ms: null,
      age_ms: null,
      gate: null
    };
  }
}

function toCandidatePayload(
  candidate: DocsFreshnessMaintainRepoGateCandidateReadResult
): DocsFreshnessMaintainRepoGateCandidate {
  return {
    path: candidate.path,
    status: candidate.status,
    reason: candidate.reason,
    generated_at: candidate.generated_at,
    age_ms: candidate.age_ms
  };
}

function buildDegradedDocsFreshnessRepoGate(
  candidates: DocsFreshnessMaintainRepoGateCandidateReadResult[],
  candidatePayloads: DocsFreshnessMaintainRepoGateCandidate[]
): DocsFreshnessMaintainRepoGatePayload {
  const invalid = candidates.find((candidate) => candidate.status === 'invalid');
  const stale = candidates
    .filter((candidate) => candidate.status === 'stale')
    .sort((left, right) => (right.generated_at_ms ?? 0) - (left.generated_at_ms ?? 0))[0] ?? null;
  const selectedEvidence = invalid ?? stale;
  const status: DocsFreshnessMaintainRepoGateEvidenceStatus = invalid ? 'invalid' : stale ? 'stale' : 'missing';
  const reason = selectedEvidence?.reason ?? 'report_missing';
  return {
    id: 'docs_freshness_maintain',
    severity: 'degraded',
    freshness_decision: `report_${status}`,
    owner: {
      issue: null,
      action: null,
      state: null,
      state_type: null,
      verified: false
    },
    spec_guard: {
      status: 'unknown',
      action_required_count: 0
    },
    capacity: null,
    next_expiry: null,
    action_required_count: 1,
    blocks_unrelated_lanes: false,
    blocks_handoff: true,
    provider_wip_impact: 'excluded_repo_gate',
    source_path: selectedEvidence?.path,
    generated_at: selectedEvidence?.generated_at ?? null,
    evidence_status: status,
    evidence_reason: reason,
    report_candidates: candidatePayloads
  };
}
