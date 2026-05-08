import type {
  ProviderLinearAuditEntry,
  ProviderLinearAuditSummary
} from './providerLinearWorkflowAudit.js';

type TerminalStatus = 'failed' | 'succeeded';

const AUXILIARY_PROOF_HARNESS_SUMMARY = 'manual live proof harness';
const AUXILIARY_PROOF_HARNESS_RUN_ID_SUFFIX = '-manual-live-proof';
const FOLLOW_UP_PARITY_MATRIX_SUPPRESSION_CODES = new Set([
  'linear_follow_up_parity_matrix_missing',
  'linear_follow_up_parity_matrix_retry_suppressed'
]);
const FOLLOW_UP_PACKET_TRACEABILITY_SUPPRESSION_CODES = new Set([
  'linear_follow_up_packet_traceability_pending',
  'linear_follow_up_packet_traceability_retry_suppressed'
]);
const CHILD_LANE_PARENT_DIRTY_SUPPRESSION_CODES = new Set([
  'provider_worker_child_lane_parent_dirty',
  'provider_worker_child_lane_parent_dirty_retry_suppressed'
]);

export interface ProviderLinearMutationSuppression {
  operation: ProviderLinearAuditEntry['operation'];
  action: string | null;
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
  reviewOutputLogNoiseSummary?: string | null;
  degradationSummary?: string | null;
}): string {
  const baseSummary = formatProviderLinearWorkerTerminalBaseSummary(input.status, input.endReason);
  const annotations = [
    input.reviewOutcomeSummary ?? null,
    input.reviewOutputLogNoiseSummary ?? null,
    input.degradationSummary ?? null
  ].filter((value): value is string => Boolean(value));
  if (annotations.length === 0) {
    return baseSummary;
  }
  return `${baseSummary} (${annotations.join('; ')})`;
}

export const REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY = [
  'review log note: Codex rollout-item thread-not-found session cleanup noise observed;',
  'successful review telemetry remains authoritative'
].join(' ');

export function deriveDeterministicProviderMutationSuppressions(
  audit: ProviderLinearAuditSummary | null | undefined,
  options: {
    recordedAtNotBefore?: string | null;
    issueId?: string | null;
    followUpIntentKey?: string | null;
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
  const issueId = normalizeOptionalString(options.issueId);
  const followUpIntentKey = normalizeOptionalString(options.followUpIntentKey);
  const scopedEntries = selectProviderLinearMutationEntries(audit, latestByOperation)
    .filter((entry): entry is ProviderLinearAuditEntry => Boolean(entry))
    .filter((entry) => !issueId || entry.issue_id === issueId)
    .filter((entry) => (
      entry.operation !== 'create-follow-up'
      || !followUpIntentKey
      || entry.follow_up_intent_key === followUpIntentKey
    ))
    .filter((entry) =>
      readTimestampMs(entry as unknown as Record<string, unknown>, 'recorded_at') >= recordedAtNotBeforeMs
    );
  const latestCreateFollowUpEntriesByIntent = scopedEntries
    .filter((entry) => entry.operation === 'create-follow-up')
    .reduce<Map<string, ProviderLinearAuditEntry>>((latestByIntent, entry) => {
      const key = buildProviderLinearMutationEntryKey(entry);
      const current = latestByIntent.get(key);
      const entryMs = readTimestampMs(entry as unknown as Record<string, unknown>, 'recorded_at');
      const currentMs = current
        ? readTimestampMs(current as unknown as Record<string, unknown>, 'recorded_at')
        : Number.NEGATIVE_INFINITY;
      if (!current || entryMs >= currentMs) {
        latestByIntent.set(key, entry);
      }
      return latestByIntent;
    }, new Map<string, ProviderLinearAuditEntry>());
  const entries = scopedEntries
    .filter((entry) => entry.ok === false && isDeterministicProviderMutationFailure(entry))
    .filter((entry) => {
      if (entry.operation !== 'create-follow-up') {
        return true;
      }
      const latestForIntent = latestCreateFollowUpEntriesByIntent.get(buildProviderLinearMutationEntryKey(entry));
      return latestForIntent?.ok !== true;
    })
    .reduce<Map<string, ProviderLinearAuditEntry>>((latestByOperationAndAction, entry) => {
      latestByOperationAndAction.set(buildProviderLinearMutationEntryKey(entry), entry);
      return latestByOperationAndAction;
    }, new Map<string, ProviderLinearAuditEntry>());
  return Array.from(entries.values())
    .sort((left, right) => {
      const operationOrder = left.operation.localeCompare(right.operation);
      if (operationOrder !== 0) {
        return operationOrder;
      }
      const leftAction = normalizeAuditAction(left.action) ?? '';
      const rightAction = normalizeAuditAction(right.action) ?? '';
      return leftAction.localeCompare(rightAction);
    })
    .map((entry) => buildDeterministicProviderMutationSuppression(entry));
}

export function findDeterministicProviderMutationSuppression(
  audit: ProviderLinearAuditSummary | null | undefined,
  operation: ProviderLinearAuditEntry['operation'],
  options: {
    recordedAtNotBefore?: string | null;
    action?: string | null;
    issueId?: string | null;
    followUpIntentKey?: string | null;
  } = {}
): ProviderLinearMutationSuppression | null {
  const requestedAction = normalizeAuditAction(options.action);
  return (
    deriveDeterministicProviderMutationSuppressions(audit, options).find(
      (suppression) =>
        suppression.operation === operation &&
        (!requestedAction || suppression.action === requestedAction)
    ) ?? null
  );
}

export function isFollowUpParityMatrixSuppressionCode(
  errorCode: string | null | undefined
): boolean {
  const normalized = normalizeOptionalString(errorCode);
  return normalized ? FOLLOW_UP_PARITY_MATRIX_SUPPRESSION_CODES.has(normalized) : false;
}

export function isFollowUpPacketTraceabilitySuppressionCode(
  errorCode: string | null | undefined
): boolean {
  const normalized = normalizeOptionalString(errorCode);
  return normalized ? FOLLOW_UP_PACKET_TRACEABILITY_SUPPRESSION_CODES.has(normalized) : false;
}

export function isChildLaneParentDirtySuppressionCode(
  errorCode: string | null | undefined
): boolean {
  const normalized = normalizeOptionalString(errorCode);
  return normalized ? CHILD_LANE_PARENT_DIRTY_SUPPRESSION_CODES.has(normalized) : false;
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
  const action = normalizeAuditAction(entry.action);
  const errorCode = normalizeOptionalString(entry.error_code);
  const errorMessage = normalizeOptionalString(entry.error_message);
  switch (entry.operation) {
    case 'create-follow-up':
      return {
        operation: entry.operation,
        action,
        error_code: errorCode,
        error_message: errorMessage,
        instruction:
          isFollowUpPacketTraceabilitySuppressionCode(errorCode)
            ? 'Do not retry `create-follow-up` in this attempt until you reconcile the existing follow-up issue from the error details and prove its packet prefix, packet files, docs/TASKS.md mirror, tasks/index.json entry, and docs-freshness registry entries are ready.'
            : isFollowUpParityMatrixSuppressionCode(errorCode)
            ? 'Do not retry `create-follow-up` in this attempt unless you first add the required parity matrix or explicitly reclassify the follow-up as non-parity/alignment and omit `--parity-lane`.'
            : buildGenericSuppressionInstruction(entry.operation, errorCode, errorMessage),
        summary:
          isFollowUpPacketTraceabilitySuppressionCode(errorCode)
            ? 'deterministic provider mutation suppressed: create-follow-up retry is blocked until the existing follow-up packet and registry mirrors are ready'
            : isFollowUpParityMatrixSuppressionCode(errorCode)
            ? 'deterministic provider mutation suppressed: create-follow-up retry is blocked until a parity matrix is added or the follow-up is reclassified as non-parity/alignment with --parity-lane omitted'
            : buildGenericSuppressionSummary(entry.operation, errorCode, errorMessage)
      };
    case 'child-lane':
      if (errorCode === 'provider_worker_child_lane_provenance_invalid') {
        const launchTimeControlHostProvenanceFailure =
          action === 'launch' || errorMessage?.includes('control-host provenance') === true;
        return {
          operation: entry.operation,
          action,
          error_code: errorCode,
          error_message: errorMessage,
          instruction:
            launchTimeControlHostProvenanceFailure
              ? `Do not retry \`${entry.operation}\` until you first confirm the parent provider-worker run now has matching control-host provenance recorded in the manifest and active environment; if that provenance has already been repaired since the failed audit entry, you may retry once without restarting the attempt. Preserve the fail-closed provenance contract instead of forcing the launch.`
              : 'Do not retry `child-lane` until you first confirm the pending child-lane record now matches the expected parent-owned pipeline, task, and issue binding; if that binding has already been repaired since the failed audit entry, you may retry once without restarting the attempt. Preserve the fail-closed provenance contract instead of forcing the decision.',
          summary:
            launchTimeControlHostProvenanceFailure
              ? `deterministic provider mutation suppressed: ${entry.operation} fail-closed provenance mismatch must be repaired before retry`
              : 'deterministic provider mutation suppressed: child-lane fail-closed provenance mismatch must be reconciled before retry'
        };
      }
      return {
        operation: entry.operation,
        action,
        error_code: errorCode,
        error_message: errorMessage,
        instruction: isChildLaneParentDirtySuppressionCode(errorCode)
          ? buildChildLaneParentDirtySuppressionInstruction(action)
          : buildGenericSuppressionInstruction(entry.operation, errorCode, errorMessage),
        summary: isChildLaneParentDirtySuppressionCode(errorCode)
          ? buildChildLaneParentDirtySuppressionSummary(action)
          : buildGenericSuppressionSummary(entry.operation, errorCode, errorMessage)
      };
    case 'transition':
    case 'upsert-workpad':
      if (errorCode === 'linear_issue_not_mutable') {
        return {
          operation: entry.operation,
          action,
          error_code: errorCode,
          error_message: errorMessage,
          instruction: `Do not retry \`${entry.operation}\` in this attempt until the Linear issue is restored to a mutable active state.`,
          summary: `deterministic provider mutation suppressed: ${entry.operation} cannot run while the Linear issue is archived or trashed`
        };
      }
      return {
        operation: entry.operation,
        action,
        error_code: errorCode,
        error_message: errorMessage,
        instruction: buildGenericSuppressionInstruction(entry.operation, errorCode, errorMessage),
        summary: buildGenericSuppressionSummary(entry.operation, errorCode, errorMessage)
      };
    case 'child-stream':
      if (errorCode === 'provider_worker_child_stream_provenance_invalid') {
        return {
          operation: entry.operation,
          action,
          error_code: errorCode,
          error_message: errorMessage,
          instruction: `Do not retry \`${entry.operation}\` until you first confirm the parent provider-worker run now has matching control-host provenance recorded in the manifest and active environment; if that provenance has already been repaired since the failed audit entry, you may retry once without restarting the attempt. Preserve the fail-closed provenance contract instead of forcing the launch.`,
          summary: `deterministic provider mutation suppressed: ${entry.operation} fail-closed provenance mismatch must be repaired before retry`
        };
      }
      return {
        operation: entry.operation,
        action,
        error_code: errorCode,
        error_message: errorMessage,
        instruction: buildGenericSuppressionInstruction(entry.operation, errorCode, errorMessage),
        summary: buildGenericSuppressionSummary(entry.operation, errorCode, errorMessage)
      };
    default:
      return {
        operation: entry.operation,
        action,
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

function buildChildLaneParentDirtySuppressionInstruction(action: string | null): string {
  if (action === 'accept') {
    return 'Do not retry `child-lane --action accept` in this attempt while the parent workspace still has in-scope dirty files. Reconcile those parent changes or move scratch artifacts outside the repo, then accept only after the requested patch scope is clean.';
  }
  return 'Do not retry `child-lane --action launch` in this attempt while the parent workspace still has in-scope dirty files. Reconcile those parent changes or move scratch artifacts outside the repo, then relaunch only after the requested scope is clean.';
}

function buildChildLaneParentDirtySuppressionSummary(action: string | null): string {
  if (action === 'accept') {
    return 'deterministic provider mutation suppressed: child-lane accept retry is blocked until the parent workspace is clean for the requested patch scope';
  }
  return 'deterministic provider mutation suppressed: child-lane launch retry is blocked until the parent workspace is clean for the requested scope';
}

function isDeterministicProviderMutationFailure(entry: ProviderLinearAuditEntry): boolean {
  const errorCode = normalizeOptionalString(entry.error_code);
  if (!errorCode) {
    return false;
  }
  if (isFollowUpParityMatrixSuppressionCode(errorCode)) {
    return true;
  }
  if (isFollowUpPacketTraceabilitySuppressionCode(errorCode)) {
    return true;
  }
  if (isChildLaneParentDirtySuppressionCode(errorCode)) {
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
  if (errorCode === 'linear_issue_not_mutable') {
    return true;
  }
  if (errorCode === 'provider_worker_child_lane_provenance_invalid') {
    return true;
  }
  if (errorCode === 'provider_worker_child_stream_provenance_invalid') {
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
        case 'review_findings_detected':
          return 'Provider linear worker failed because standalone review reported findings.';
        case 'review_verdict_unknown':
          return 'Provider linear worker failed because standalone review did not produce a concrete verdict.';
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

function selectProviderLinearMutationEntries(
  audit: ProviderLinearAuditSummary,
  latestByOperation: NonNullable<ProviderLinearAuditSummary['latest_by_operation']>
): ProviderLinearAuditEntry[] {
  if (Array.isArray(audit.entries) && audit.entries.length > 0) {
    return audit.entries.filter((entry): entry is ProviderLinearAuditEntry => Boolean(entry));
  }
  return Object.values(latestByOperation).filter((entry): entry is ProviderLinearAuditEntry => Boolean(entry));
}

function buildProviderLinearMutationEntryKey(entry: ProviderLinearAuditEntry): string {
  return [
    entry.operation,
    normalizeAuditAction(entry.action) ?? '',
    entry.operation === 'create-follow-up' ? normalizeOptionalString(entry.follow_up_intent_key) ?? '' : ''
  ].join(':');
}

function normalizeAuditAction(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  const separatorIndex = normalized.indexOf(':');
  return separatorIndex >= 0 ? normalized.slice(0, separatorIndex) : normalized;
}
