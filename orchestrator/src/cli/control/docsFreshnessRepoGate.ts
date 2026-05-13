import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

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

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function normalizeDocsFreshnessMaintainRepoGate(
  value: unknown
): DocsFreshnessMaintainRepoGatePayload | null {
  const record = readRecord(value);
  if (!record) {
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

export function readDocsFreshnessMaintainRepoGate(options: {
  repoRoot?: string;
  reportPath?: string;
  outRoot?: string;
  env?: NodeJS.ProcessEnv;
} = {}): DocsFreshnessMaintainRepoGatePayload | null {
  const env = options.env ?? process.env;
  const repoRoot = resolve(options.repoRoot ?? env.CODEX_ORCHESTRATOR_ROOT ?? process.cwd());
  const outRoot = options.outRoot
    ? resolve(repoRoot, options.outRoot)
    : resolve(repoRoot, env.CODEX_ORCHESTRATOR_OUT_DIR ?? 'out');
  const reportPath = options.reportPath
    ? resolve(repoRoot, options.reportPath)
    : join(outRoot, 'docs-truthfulness-maintenance', 'docs-freshness-maintenance.json');
  if (!existsSync(reportPath)) {
    return null;
  }
  try {
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as Record<string, unknown>;
    const gate = normalizeDocsFreshnessMaintainRepoGate(report.repo_gate);
    return gate ? { ...gate, source_path: reportPath } : null;
  } catch {
    return null;
  }
}
