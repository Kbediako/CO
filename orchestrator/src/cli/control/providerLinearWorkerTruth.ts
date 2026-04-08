import type {
  ProviderLinearAuditEntry,
  ProviderLinearAuditSummary
} from './providerLinearWorkflowAudit.js';

type TerminalStatus = 'failed' | 'succeeded';

const AUXILIARY_PROOF_HARNESS_SUMMARY = 'manual live proof harness';
const AUXILIARY_PROOF_HARNESS_RUN_ID_SUFFIX = '-manual-live-proof';

export interface ProviderLinearMutationSuppression {
  operation: ProviderLinearAuditEntry['operation'];
  error_code: string | null;
  error_message: string | null;
  instruction: string;
  summary: string;
}

export function isAuxiliaryProviderProofHarnessManifest(manifest: Record<string, unknown>): boolean {
  const runId = readStringValue(manifest, 'run_id', 'runId');
  const summary = readStringValue(manifest, 'summary');
  return (
    summary === AUXILIARY_PROOF_HARNESS_SUMMARY ||
    (typeof runId === 'string' && runId.endsWith(AUXILIARY_PROOF_HARNESS_RUN_ID_SUFFIX))
  );
}

export function resolveProviderLinearWorkerTerminalStatus(
  proof: Record<string, unknown> | null | undefined
): TerminalStatus | null {
  if (!proof) {
    return null;
  }
  if (readStringValue(proof, 'owner_phase') !== 'ended') {
    return null;
  }
  const ownerStatus = readStringValue(proof, 'owner_status');
  return ownerStatus === 'failed' || ownerStatus === 'succeeded' ? ownerStatus : null;
}

export function resolveProviderLinearWorkerTerminalReason(
  proof: Record<string, unknown> | null | undefined
): string | null {
  if (!resolveProviderLinearWorkerTerminalStatus(proof)) {
    return null;
  }
  return readStringValue(proof ?? {}, 'end_reason');
}

export function resolveProviderLinearWorkerAttemptStartedAt(
  proof: Record<string, unknown> | null | undefined
): string | null {
  return readStringValue(proof ?? {}, 'attempt_started_at');
}

export function isProviderLinearWorkerProofFreshForStage(
  proof: Record<string, unknown> | null | undefined,
  stageStartedAt: string | null | undefined
): boolean {
  if (!proof) {
    return false;
  }
  const stageStartedAtMs = readTimestampMs(
    {
      started_at: stageStartedAt ?? null
    },
    'started_at'
  );
  if (!Number.isFinite(stageStartedAtMs)) {
    return true;
  }
  const proofAttemptStartedAtMs = readTimestampMs(proof ?? {}, 'attempt_started_at');
  if (Number.isFinite(proofAttemptStartedAtMs)) {
    return proofAttemptStartedAtMs >= stageStartedAtMs;
  }
  const proofUpdatedAtMs = readTimestampMs(proof ?? {}, 'updated_at');
  return Number.isFinite(proofUpdatedAtMs) && proofUpdatedAtMs >= stageStartedAtMs;
}

export function shouldUseProviderLinearWorkerTerminalProofForSelectedRun(
  manifest: Record<string, unknown>,
  proof: Record<string, unknown> | null | undefined
): boolean {
  const proofStatus = resolveProviderLinearWorkerTerminalStatus(proof);
  if (!proofStatus) {
    return false;
  }
  const proofUpdatedAtMs = readTimestampMs(proof ?? {}, 'updated_at');
  if (!Number.isFinite(proofUpdatedAtMs)) {
    return false;
  }
  const manifestStatus = readStringValue(manifest, 'status');
  const manifestUpdatedAtMs = readTimestampMs(
    manifest,
    'updated_at',
    'updatedAt',
    'started_at',
    'startedAt'
  );
  if (!manifestStatus || manifestStatus === 'in_progress') {
    return !Number.isFinite(manifestUpdatedAtMs) || proofUpdatedAtMs >= manifestUpdatedAtMs;
  }
  if (manifestStatus === proofStatus) {
    return !Number.isFinite(manifestUpdatedAtMs) || proofUpdatedAtMs >= manifestUpdatedAtMs;
  }
  return proofStatus === 'failed' && (!Number.isFinite(manifestUpdatedAtMs) || proofUpdatedAtMs > manifestUpdatedAtMs);
}

export function buildProviderLinearWorkerTerminalSummary(input: {
  status: TerminalStatus;
  endReason: string | null;
  reviewOutcomeSummary?: string | null;
  degradationSummary?: string | null;
}): string {
  const baseSummary = formatProviderLinearWorkerTerminalBaseSummary(input.status, input.endReason);
  const annotations = [input.reviewOutcomeSummary ?? null, input.degradationSummary ?? null].filter(
    (value): value is string => Boolean(value)
  );
  if (annotations.length === 0) {
    return baseSummary;
  }
  return `${baseSummary} (${annotations.join('; ')})`;
}

export function deriveDeterministicProviderMutationSuppressions(
  audit: ProviderLinearAuditSummary | null | undefined,
  options: {
    recordedAtNotBefore?: string | null;
  } = {}
): ProviderLinearMutationSuppression[] {
  if (!audit) {
    return [];
  }
  const latestByOperation = audit.latest_by_operation;
  if (!latestByOperation || typeof latestByOperation !== 'object') {
    return [];
  }
  const recordedAtNotBeforeMs = readTimestampMs(
    {
      recorded_at: options.recordedAtNotBefore ?? null
    },
    'recorded_at'
  );
  if (!Number.isFinite(recordedAtNotBeforeMs)) {
    return [];
  }
  const entries = Object.values(latestByOperation)
    .filter((entry): entry is ProviderLinearAuditEntry => Boolean(entry))
    .filter((entry) =>
      readTimestampMs(entry as unknown as Record<string, unknown>, 'recorded_at') >= recordedAtNotBeforeMs
    )
    .filter((entry) => entry.ok === false && isDeterministicProviderMutationFailure(entry))
    .sort((left, right) => left.operation.localeCompare(right.operation));
  return entries.map((entry) => buildDeterministicProviderMutationSuppression(entry));
}

export function formatDeterministicProviderMutationDegradationSummary(
  suppressions: readonly ProviderLinearMutationSuppression[]
): string | null {
  if (suppressions.length === 0) {
    return null;
  }
  if (suppressions.length === 1) {
    return suppressions[0]?.summary ?? null;
  }
  const labels = suppressions.map((suppression) =>
    suppression.error_code ? `${suppression.operation}:${suppression.error_code}` : suppression.operation
  );
  return `${suppressions.length} deterministic provider mutations were suppressed for this attempt: ${labels.join(', ')}`;
}

function buildDeterministicProviderMutationSuppression(
  entry: ProviderLinearAuditEntry
): ProviderLinearMutationSuppression {
  const errorCode = normalizeOptionalString(entry.error_code);
  const errorMessage = normalizeOptionalString(entry.error_message);
  switch (entry.operation) {
    case 'create-follow-up':
      return {
        operation: entry.operation,
        error_code: errorCode,
        error_message: errorMessage,
        instruction:
          errorCode === 'linear_follow_up_parity_matrix_missing'
            ? 'Do not retry `create-follow-up` in this attempt unless you first add the required parity matrix.'
            : buildGenericSuppressionInstruction(entry.operation, errorCode, errorMessage),
        summary:
          errorCode === 'linear_follow_up_parity_matrix_missing'
            ? 'deterministic provider mutation suppressed: create-follow-up requires the parity matrix before retry'
            : buildGenericSuppressionSummary(entry.operation, errorCode, errorMessage)
      };
    default:
      return {
        operation: entry.operation,
        error_code: errorCode,
        error_message: errorMessage,
        instruction: buildGenericSuppressionInstruction(entry.operation, errorCode, errorMessage),
        summary: buildGenericSuppressionSummary(entry.operation, errorCode, errorMessage)
      };
  }
}

function buildGenericSuppressionInstruction(
  operation: ProviderLinearAuditEntry['operation'],
  errorCode: string | null,
  errorMessage: string | null
): string {
  const detail = [errorCode, errorMessage].filter((value): value is string => Boolean(value)).join(': ');
  return detail.length > 0
    ? `Do not retry \`${operation}\` in this attempt until you first fix the deterministic validation error (${detail}).`
    : `Do not retry \`${operation}\` in this attempt until you first fix the deterministic validation error.`;
}

function buildGenericSuppressionSummary(
  operation: ProviderLinearAuditEntry['operation'],
  errorCode: string | null,
  errorMessage: string | null
): string {
  const detail = [errorCode, errorMessage].filter((value): value is string => Boolean(value)).join(': ');
  return detail.length > 0
    ? `deterministic provider mutation suppressed: ${operation} failed with ${detail}`
    : `deterministic provider mutation suppressed: ${operation} failed validation`;
}

function isDeterministicProviderMutationFailure(entry: ProviderLinearAuditEntry): boolean {
  const errorCode = normalizeOptionalString(entry.error_code);
  if (!errorCode) {
    return false;
  }
  if (errorCode === 'linear_follow_up_parity_matrix_missing') {
    return true;
  }
  if (errorCode === 'linear_workpad_comment_id_invalid') {
    return true;
  }
  if (errorCode === 'workpad_body_missing') {
    return true;
  }
  if (errorCode === 'workpad_marker_missing') {
    return true;
  }
  if (errorCode === 'workpad_structure_invalid') {
    return true;
  }
  if (errorCode === 'workpad_section_empty') {
    return true;
  }
  if (errorCode === 'workpad_checklist_required') {
    return true;
  }
  if (errorCode === 'workpad_validation_requirements_missing') {
    return true;
  }
  if (errorCode === 'linear_issue_id_missing') {
    return true;
  }
  return /^linear_follow_up_.*_missing$/u.test(errorCode);
}

function formatProviderLinearWorkerTerminalBaseSummary(
  status: TerminalStatus,
  endReason: string | null
): string {
  if (status === 'failed') {
    if (endReason) {
      const codexExitMatch = endReason.match(/^codex_exit_(.+)$/u);
      if (codexExitMatch) {
        return `Provider linear worker failed with Codex exit code ${codexExitMatch[1] ?? 'unknown'}.`;
      }
      switch (endReason) {
        case 'tracked_issue_rate_limited':
          return 'Provider linear worker failed because tracked issue rereads remained rate limited.';
        case 'tracked_issue_read_failed':
          return 'Provider linear worker failed because tracked issue rereads did not succeed.';
        case 'exec_runner_failed':
          return 'Provider linear worker failed because the Codex exec runner could not start or complete.';
        case 'runtime_parity_command_unavailable':
          return 'Provider linear worker failed because the requested runtime executable was unavailable under the current environment.';
        case 'thread_id_missing':
          return 'Provider linear worker failed because Codex did not emit a thread identifier.';
        case 'provider_linear_worker_proof_missing_or_unreadable':
          return 'Provider linear worker failed because authoritative proof was missing or unreadable.';
        default:
          return `Provider linear worker failed (${endReason}).`;
      }
    }
    return 'Provider linear worker failed.';
  }

  switch (endReason) {
    case 'issue_review_handoff':
      return 'Provider linear worker reached review handoff.';
    case 'issue_inactive':
      return 'Provider linear worker stopped because the issue was no longer active.';
    case 'max_turns_reached_issue_still_active':
      return 'Provider linear worker exhausted the max turn budget while the issue remained active.';
    case 'worker_completed':
      return 'Provider linear worker completed.';
    default:
      return endReason ? `Provider linear worker completed (${endReason}).` : 'Provider linear worker completed.';
  }
}

function readTimestampMs(record: Record<string, unknown>, ...keys: string[]): number {
  const value = readStringValue(record, ...keys);
  if (!value) {
    return Number.NaN;
  }
  return Date.parse(value);
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeOptionalString(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
