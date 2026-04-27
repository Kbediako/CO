/* eslint-disable patterns/prefer-logger-over-console */

import { join, resolve, sep } from 'node:path';

import {
  readUiDatasetWithEndpointRecovery,
  resolveAttachTarget,
  type CoStatusAttachTarget,
  runCoStatusAttachCliShell
} from './coStatusAttachCliShell.js';
import { readControlServerSeeds } from './control/controlServerSeedLoading.js';
import { ControlStateStore } from './control/controlState.js';
import { createControlRuntime } from './control/controlRuntime.js';
import { normalizeLinearAdvisoryState } from './control/linearWebhookController.js';
import {
  readUiDataset,
  type OperatorDashboardDataset,
  type OperatorDashboardIssuePayload,
  type OperatorDashboardSessionPayload
} from './control/operatorDashboardPresenter.js';
import {
  evaluateProviderControlHostFreshnessGauge,
  type ProviderControlHostFreshnessGaugeReport,
  type ProviderControlHostFreshnessVerdict
} from './control/providerControlHostFreshnessGauge.js';
import {
  normalizeProviderIntakeState,
  type ProviderIntakeClaimRecord,
  type ProviderIntakeState
} from './control/providerIntakeState.js';
import type {
  ControlLatestEventPayload,
  ControlRunningPayload,
  ControlSelectedRunPayload,
  ControlStatusFallbackExpiryMetadata
} from './control/observabilityReadModel.js';
import type { RunPaths } from './run/runPaths.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';
const CO_STATUS_ATTACH_UNSUPPORTED_FLAGS = ['pipeline'] as const;
const LOCAL_DEGRADED_FALLBACK_ALLOWED_VERDICTS = new Set<ProviderControlHostFreshnessVerdict>([
  'healthy',
  'degraded'
]);
const LOCAL_DEGRADED_FALLBACK_ALLOWED_FINDING_CODES = new Set(['active_worker_proof_missing']);
const CURRENT_HOST_UNHEALTHY_MARKER = 'current-host-unhealthy';
const CURRENT_HOST_UNHEALTHY_STALE_ENDPOINT_FALLBACK =
  'control-host unavailable; stale endpoint after control-host restart';
const LEGACY_CURRENT_HOST_UNHEALTHY_STALE_ENDPOINT_FALLBACK =
  'control-host unavailable; control_endpoint.json has not rotated to a reachable host';
const CURRENT_HOST_UNHEALTHY_ROTATED_ENDPOINT_FALLBACK =
  'refreshed control-host endpoint is still unreachable';
const SELECTED_RUN_PROJECTION_FALLBACK = 'selected-run projection fallback';
const COMPATIBILITY_ISSUE_PROJECTION_FALLBACK = 'compatibility issue projection fallback';
const SOURCE_AUTHORITY_LABELS_FALLBACK =
  'CLI/API/UI /ui/data.json source labels and authority/proof split';

type CoStatusDegradedReadReason = 'ui_request_timeout' | 'current_host_unhealthy';

type DegradedMetadataPayloadIdentity = {
  issue_identifier: string;
  issue_id: string | null;
  task_id: string | null;
  run_id: string | null;
};

export interface CoStatusDegradedReadPayload {
  reason: CoStatusDegradedReadReason;
  source: 'local_seeded_runtime';
  freshness_verdict: ProviderControlHostFreshnessVerdict;
  artifact_root: string;
  finding_codes: string[];
}

export type CoStatusJsonDataset = OperatorDashboardDataset & {
  degraded_read?: CoStatusDegradedReadPayload;
};

export interface RunCoStatusCliShellParams {
  flags: ArgMap;
  printHelp: () => void;
}

export async function runCoStatusCliShell(params: RunCoStatusCliShellParams): Promise<void> {
  if (params.flags.help !== undefined) {
    params.printHelp();
    return;
  }

  assertAttachCompatibleFlags(params.flags);
  const format: OutputFormat = readStringFlag(params.flags, 'format') === 'json' ? 'json' : 'text';
  if (format !== 'json') {
    await runCoStatusAttachCliShell(params);
    return;
  }

  const dataset = await readCoStatusJsonDataset({ flags: params.flags });
  console.log(JSON.stringify(dataset, null, 2));
}

export async function readCoStatusJsonDataset(input: {
  flags: ArgMap;
  requestTimeoutMs?: number;
}): Promise<CoStatusJsonDataset> {
  let target = await resolveAttachTarget(input.flags);
  try {
    return await readUiDatasetWithEndpointRecovery({
      flags: input.flags,
      getTarget: () => target,
      setTarget: (nextTarget) => {
        target = nextTarget;
      },
      requestTimeoutMs: input.requestTimeoutMs,
      recoverSameEndpointTimeout: true
    });
  } catch (error) {
    const degradedDataset = await tryReadLocalDegradedUiDataset({
      error,
      target
    });
    if (degradedDataset) {
      return degradedDataset;
    }
    throw error;
  }
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function assertAttachCompatibleFlags(flags: ArgMap): void {
  const unsupported = CO_STATUS_ATTACH_UNSUPPORTED_FLAGS.filter((flag) => flags[flag] !== undefined);
  if (unsupported.length === 0) {
    return;
  }
  const renderedFlags = unsupported.map((flag) => `--${flag}`).join(', ');
  throw new Error(
    `co-status attaches to an existing control host and does not accept launch-only flags: ${renderedFlags}. Use \`control-host\` to start a control host with launch settings.`
  );
}

async function tryReadLocalDegradedUiDataset(input: {
  error: unknown;
  target: CoStatusAttachTarget;
}): Promise<CoStatusJsonDataset | null> {
  const degradedReason = resolveLocalDegradedReadReason(input.error);
  if (!degradedReason) {
    return null;
  }

  const freshnessReport = await evaluateProviderControlHostFreshnessGauge({
    artifactRoot: input.target.runDir
  });
  const refreshAgeVerdict = freshnessReport.metrics.last_successful_refresh_age_ms.verdict;
  if (
    !isEligibleLocalDegradedFallbackFreshnessReport(freshnessReport) ||
    !LOCAL_DEGRADED_FALLBACK_ALLOWED_VERDICTS.has(refreshAgeVerdict)
  ) {
    return null;
  }

  const localDataset = await readLocalUiDataset(input.target);
  const dataset = applyProviderIntakeTruthOverlay(
    localDataset.dataset,
    input.target,
    localDataset.providerIntakeState
  );
  const providerIntake = dataset.provider_intake ?? null;
  if (!providerIntake || providerIntake.active_claim_count < 1) {
    return null;
  }

  return {
    ...dataset,
    degraded_read: buildDegradedReadPayload(input.target, freshnessReport, degradedReason)
  };
}

function resolveLocalDegradedReadReason(error: unknown): CoStatusDegradedReadReason | null {
  const message = (error as Error)?.message ?? String(error);
  if (message.includes('Re-resolving control_endpoint.json failed')) {
    return null;
  }
  if (isCurrentHostUnhealthyErrorMessage(message)) {
    return 'current_host_unhealthy';
  }
  if (message.includes('control-host ui request timeout after')) {
    return 'ui_request_timeout';
  }
  return null;
}

function isCurrentHostUnhealthyErrorMessage(message: string): boolean {
  return [
    CURRENT_HOST_UNHEALTHY_MARKER,
    CURRENT_HOST_UNHEALTHY_STALE_ENDPOINT_FALLBACK,
    LEGACY_CURRENT_HOST_UNHEALTHY_STALE_ENDPOINT_FALLBACK,
    CURRENT_HOST_UNHEALTHY_ROTATED_ENDPOINT_FALLBACK
  ].some((fragment) => message.includes(fragment));
}

function isEligibleLocalDegradedFallbackFreshnessReport(
  report: ProviderControlHostFreshnessGaugeReport
): boolean {
  if (LOCAL_DEGRADED_FALLBACK_ALLOWED_VERDICTS.has(report.verdict)) {
    return true;
  }
  if (report.verdict !== 'unknown') {
    return false;
  }
  return (
    report.findings.length > 0 &&
    report.findings.every((finding) => LOCAL_DEGRADED_FALLBACK_ALLOWED_FINDING_CODES.has(finding.code))
  );
}

function buildDegradedReadPayload(
  target: CoStatusAttachTarget,
  report: ProviderControlHostFreshnessGaugeReport,
  reason: CoStatusDegradedReadReason
): CoStatusDegradedReadPayload {
  return {
    reason,
    source: 'local_seeded_runtime',
    freshness_verdict: report.verdict,
    artifact_root: target.runDir,
    finding_codes: report.findings.map((finding) => finding.code)
  };
}

function applyProviderIntakeTruthOverlay(
  dataset: OperatorDashboardDataset,
  target: CoStatusAttachTarget,
  providerIntakeState: ProviderIntakeState
): OperatorDashboardDataset {
  const providerIntake = dataset.provider_intake ?? null;
  const selectedClaim = selectDegradedOverlayClaim(providerIntakeState, providerIntake?.selected_claim.issue_identifier);
  if (!selectedClaim) {
    return dataset;
  }

  const activeClaims = [...providerIntakeState.claims]
    .sort(compareDegradedClaims)
    .filter(isDegradedActiveClaim);
  const runningClaims = activeClaims.filter((claim) => resolveDegradedClaimState(claim) === 'running');
  const status = resolveDegradedClaimStatus(resolveDegradedClaimState(selectedClaim));
  const selectedFallbackExpiry = selectControlHostFallbackExpiry(dataset.fallback_expiry, [
    SELECTED_RUN_PROJECTION_FALLBACK,
    SOURCE_AUTHORITY_LABELS_FALLBACK
  ]);
  const runningFallbackExpiry = selectControlHostFallbackExpiry(dataset.fallback_expiry, [
    SELECTED_RUN_PROJECTION_FALLBACK,
    SOURCE_AUTHORITY_LABELS_FALLBACK
  ]);
  const issueFallbackExpiry = selectControlHostFallbackExpiry(dataset.fallback_expiry, [
    COMPATIBILITY_ISSUE_PROJECTION_FALLBACK,
    SOURCE_AUTHORITY_LABELS_FALLBACK
  ]);
  const selectedExisting = selectMatchingDegradedMetadataPayload(
    dataset.selected,
    selectedClaim
  );
  const selected = buildDegradedSelectedPayload(
    selectedExisting,
    selectedExisting,
    selectedClaim,
    target,
    status,
    selectedFallbackExpiry
  );
  const runningEntries = runningClaims.map((claim) => {
    const existingRunning =
      dataset.running.find((entry) => isDegradedMetadataPayloadMatchingClaim(entry, claim)) ?? null;
    const selectedClaimFallbackExpiry =
      isDegradedMetadataPayloadMatchingClaim(selected, claim) ? selected.fallback_expiry : undefined;
    const fallbackExpiry = mergeDegradedFallbackExpiry(
      existingRunning?.fallback_expiry,
      selectedClaimFallbackExpiry,
      runningFallbackExpiry
    );
    return buildDegradedRunningSessionPayload(
      claim,
      selected,
      dataset.host,
      fallbackExpiry
    );
  });
  const synthesizedIssues = activeClaims.length > 0 ? activeClaims : [selectedClaim];
  const issues = [
    ...synthesizedIssues.map((claim) => {
      const existingIssue =
        dataset.issues.find((entry) => isDegradedMetadataPayloadMatchingClaim(entry, claim)) ?? null;
      const existingIssueMetadata = selectMatchingDegradedMetadataPayload(existingIssue, claim);
      return buildDegradedIssuePayload(
        existingIssue,
        existingIssueMetadata,
        claim,
        selected,
        dataset.host,
        resolveDegradedClaimStatus(resolveDegradedClaimState(claim)),
        issueFallbackExpiry,
        runningFallbackExpiry
      );
    }),
    ...dataset.issues.filter(
      (entry) =>
        entry.issue_identifier !== selected.issue_identifier &&
        !synthesizedIssues.some((claim) => claim.issue_identifier === entry.issue_identifier) &&
        !isDegradedPlaceholderIssue(entry, target)
    )
  ].map((entry) => ({
    ...entry,
    is_selected: entry.issue_identifier === selected.issue_identifier
  }));

  return {
    ...dataset,
    counts: {
      ...dataset.counts,
      running: runningEntries.length > 0 ? runningEntries.length : dataset.counts.running,
      issues: issues.length
    },
    selected_issue_identifier: selected.issue_identifier,
    selected,
    running: runningEntries.length > 0 ? runningEntries : dataset.running,
    issues
  };
}

function selectDegradedOverlayClaim(
  state: ProviderIntakeState,
  selectedIssueIdentifier: string | undefined
): ProviderIntakeClaimRecord | null {
  const activeClaims = [...state.claims].sort(compareDegradedClaims).filter(isDegradedActiveClaim);
  const preferred = typeof selectedIssueIdentifier === 'string'
    ? activeClaims.find((claim) => claim.issue_identifier === selectedIssueIdentifier) ??
      state.claims.find((claim) => claim.issue_identifier === selectedIssueIdentifier) ??
      null
    : null;
  return preferred ?? activeClaims[0] ?? state.claims[0] ?? null;
}

function isDegradedActiveClaim(claim: ProviderIntakeClaimRecord): boolean {
  switch (claim.state) {
    case 'accepted':
    case 'starting':
    case 'running':
    case 'resuming':
    case 'resumable':
    case 'handoff_failed':
      return true;
    default:
      return false;
  }
}

function compareDegradedClaims(
  left: ProviderIntakeClaimRecord,
  right: ProviderIntakeClaimRecord
): number {
  return rankDegradedClaimState(right.state) - rankDegradedClaimState(left.state)
    || Date.parse(right.updated_at) - Date.parse(left.updated_at);
}

function rankDegradedClaimState(state: ProviderIntakeClaimRecord['state']): number {
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

function isDegradedPlaceholderIssue(
  issue: OperatorDashboardIssuePayload,
  target: CoStatusAttachTarget
): boolean {
  return (
    issue.task_id === (target.taskId ?? issue.task_id) &&
    issue.run_id === (target.runId ?? issue.run_id) &&
    (
      issue.issue_identifier === (target.taskId ?? null) ||
      issue.issue_identifier === (target.runId ?? null)
    )
  );
}

function buildDegradedSelectedPayload(
  existing: ControlSelectedRunPayload | null,
  existingMetadata: ControlSelectedRunPayload | null,
  claim: ProviderIntakeClaimRecord,
  target: CoStatusAttachTarget,
  status: { raw_status: string; display_status: string; issue_status: string },
  datasetFallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined
): ControlSelectedRunPayload {
  const latestEvent = buildDegradedLatestEvent(claim);
  return {
    issue_id: claim.issue_id,
    issue_identifier: claim.issue_identifier,
    task_id: claim.task_id,
    run_id: claim.run_id,
    raw_status: status.raw_status,
    display_status: status.display_status,
    status_reason: claim.reason,
    started_at: existing?.started_at ?? null,
    updated_at: claim.updated_at,
    completed_at: null,
    summary: claim.issue_title,
    last_error: existing?.last_error ?? null,
    latest_action: existing?.latest_action ?? null,
    latest_event: latestEvent,
    workspace: {
      path: existing?.workspace.path ?? target.workspaceRoot
    },
    ...(claim.worker_host !== undefined ? { worker_host: claim.worker_host ?? null } : {}),
    question_summary: existing?.question_summary ?? {
      queued_count: 0,
      latest_question: null
    },
    tracked: existing?.tracked ?? { linear: null },
    ...resolveDegradedFallbackExpiry(existingMetadata?.fallback_expiry, datasetFallbackExpiry)
  };
}

function selectMatchingDegradedMetadataPayload<TPayload extends DegradedMetadataPayloadIdentity>(
  existing: TPayload | null | undefined,
  claim: ProviderIntakeClaimRecord
): TPayload | null {
  return isDegradedMetadataPayloadMatchingClaim(existing, claim) ? existing ?? null : null;
}

function isDegradedMetadataPayloadMatchingClaim(
  existing: DegradedMetadataPayloadIdentity | null | undefined,
  claim: ProviderIntakeClaimRecord
): boolean {
  if (!existing || existing.issue_identifier !== claim.issue_identifier) {
    return false;
  }
  if (!requiredMetadataIdentifierMatchesClaim(existing.issue_id, claim.issue_id)) {
    return false;
  }
  if (!requiredMetadataIdentifierMatchesClaim(existing.task_id, claim.task_id)) {
    return false;
  }
  if (!optionalMetadataIdentifierMatchesClaim(existing.run_id, claim.run_id)) {
    return false;
  }
  return true;
}

function requiredMetadataIdentifierMatchesClaim(
  existingValue: string | null,
  claimValue: string | null
): boolean {
  return existingValue !== null && claimValue !== null && existingValue === claimValue;
}

function optionalMetadataIdentifierMatchesClaim(
  existingValue: string | null,
  claimValue: string | null
): boolean {
  return existingValue === claimValue;
}

function buildDegradedIssuePayload(
  existing: OperatorDashboardIssuePayload | null,
  existingMetadata: OperatorDashboardIssuePayload | null,
  claim: ProviderIntakeClaimRecord,
  selected: ControlSelectedRunPayload,
  host: string,
  status: { raw_status: string; display_status: string; issue_status: string },
  issueFallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined,
  runningFallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined
): OperatorDashboardIssuePayload {
  const selectedClaimFallbackExpiry =
    isDegradedMetadataPayloadMatchingClaim(selected, claim) ? selected.fallback_expiry : undefined;
  const running = resolveDegradedClaimState(claim) === 'running'
    ? buildDegradedRunningPayload(
        claim,
        mergeDegradedFallbackExpiry(
          existingMetadata?.running?.fallback_expiry,
          selectedClaimFallbackExpiry,
          runningFallbackExpiry
        )
      )
    : null;
  return {
    issue_identifier: claim.issue_identifier,
    issue_id: claim.issue_id,
    task_id: claim.task_id,
    run_id: claim.run_id,
    status: status.issue_status,
    raw_status: status.raw_status,
    display_status: status.display_status,
    status_reason: claim.reason,
    title: claim.issue_title,
    url: existing?.url ?? null,
    workspace: {
      path: selected.workspace.path,
      host
    },
    ...(claim.worker_host !== undefined ? { worker_host: claim.worker_host ?? null } : {}),
    session: {
      session_id: existing?.session.session_id ?? null,
      thread_id: existing?.session.thread_id ?? null,
      turn_count: existing?.session.turn_count ?? null
    },
    owner: existing?.owner ?? {
      phase: null,
      status: null
    },
    tokens: existing?.tokens ?? null,
    rate_limits: existing?.rate_limits ?? null,
    summary: claim.issue_title,
    last_error: existing?.last_error ?? null,
    latest_event: buildDegradedLatestEvent(claim),
    recent_agent_activity: existing?.recent_agent_activity ?? [],
    linear_activity: existing?.linear_activity ?? [],
    running,
    retry: existing?.retry ?? null,
    attempts: existing?.attempts ?? {
      restart_count: null,
      current_retry_attempt: claim.retry_attempt ?? null
    },
    tracked: existing?.tracked ?? selected.tracked,
    provider_linear_worker_proof: existing?.provider_linear_worker_proof ?? null,
    provider_debug_snapshot: existing?.provider_debug_snapshot ?? null,
    ...resolveDegradedFallbackExpiry(
      existingMetadata?.fallback_expiry,
      issueFallbackExpiry
    ),
    is_selected: true
  };
}

function buildDegradedRunningPayload(
  claim: ProviderIntakeClaimRecord,
  fallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined
): ControlRunningPayload {
  return {
    issue_id: claim.issue_id,
    issue_identifier: claim.issue_identifier,
    state: 'running',
    display_state: 'running',
    status_reason: claim.reason,
    pid: null,
    ...(claim.worker_host !== undefined ? { worker_host: claim.worker_host ?? null } : {}),
    session_id: null,
    turn_count: null,
    last_event: 'provider_intake_refresh',
    last_message: claim.reason,
    display_event: 'provider_intake_refresh',
    event_source: 'provider_intake_state',
    message_recorded_at: claim.updated_at,
    source_updated_at: claim.updated_at,
    started_at: null,
    last_event_at: claim.updated_at,
    tokens: {
      input_tokens: null,
      output_tokens: null,
      total_tokens: null
    },
    ...resolveDegradedFallbackExpiry(fallbackExpiry)
  };
}

function buildDegradedRunningSessionPayload(
  claim: ProviderIntakeClaimRecord,
  selected: ControlSelectedRunPayload,
  host: string,
  fallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined
): OperatorDashboardSessionPayload {
  return {
    issue_identifier: claim.issue_identifier,
    issue_id: claim.issue_id,
    id: claim.issue_identifier,
    bucket: 'running',
    state: 'running',
    reason: claim.reason,
    aliases: [claim.task_id, claim.run_id].filter((value): value is string => Boolean(value)),
    task_id: claim.task_id,
    run_id: claim.run_id,
    summary: claim.issue_title,
    display_state: 'running',
    status_reason: claim.reason,
    pid: null,
    session_id: null,
    thread_id: null,
    turn_count: null,
    workspace_path: selected.workspace.path,
    host,
    ...(claim.worker_host !== undefined ? { worker_host: claim.worker_host ?? null } : {}),
    last_event: 'provider_intake_refresh',
    last_message: claim.reason,
    display_event: 'provider_intake_refresh',
    started_at: null,
    last_event_at: claim.updated_at,
    tokens: {
      input_tokens: null,
      output_tokens: null,
      total_tokens: null
    },
    ...resolveDegradedFallbackExpiry(fallbackExpiry)
  };
}

function resolveDegradedFallbackExpiry(
  ...sources: Array<ControlStatusFallbackExpiryMetadata[] | undefined>
): { fallback_expiry: ControlStatusFallbackExpiryMetadata[] } | Record<string, never> {
  const fallbackExpiry = mergeDegradedFallbackExpiry(...sources);
  return fallbackExpiry
    ? {
        fallback_expiry: fallbackExpiry
      }
    : {};
}

function mergeDegradedFallbackExpiry(
  ...sources: Array<ControlStatusFallbackExpiryMetadata[] | undefined>
): ControlStatusFallbackExpiryMetadata[] | undefined {
  const merged: ControlStatusFallbackExpiryMetadata[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    for (const entry of source ?? []) {
      const key = `${entry.fallback}\u0000${entry.decision}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push({ ...entry });
    }
  }
  return merged.length > 0 ? merged : undefined;
}

function selectControlHostFallbackExpiry(
  fallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined,
  fallbacks: string[]
): ControlStatusFallbackExpiryMetadata[] | undefined {
  if (!fallbackExpiry) {
    return undefined;
  }
  const fallbackSet = new Set(fallbacks);
  const selected = fallbackExpiry.filter((entry) => fallbackSet.has(entry.fallback));
  return selected.length > 0 ? selected : undefined;
}

function buildDegradedLatestEvent(
  claim: ProviderIntakeClaimRecord
): ControlLatestEventPayload | null {
  return {
    event: 'provider_intake_refresh',
    message: claim.reason,
    at: claim.updated_at
  };
}

function resolveDegradedClaimStatus(state: string): {
  raw_status: string;
  display_status: string;
  issue_status: string;
} {
  if (state === 'running') {
    return {
      raw_status: 'in_progress',
      display_status: 'running',
      issue_status: 'running'
    };
  }
  return {
    raw_status: state,
    display_status: state,
    issue_status: state
  };
}

function resolveDegradedClaimState(claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason'>): string {
  return claim.state === 'handoff_failed' && claim.reason === 'provider_issue_handoff_owned'
    ? 'handoff_owned'
    : claim.state;
}

async function readLocalUiDataset(target: CoStatusAttachTarget): Promise<{
  dataset: OperatorDashboardDataset;
  providerIntakeState: ProviderIntakeState;
}> {
  const paths = buildRunPathsFromTarget(target);
  const { controlSeed, linearAdvisorySeed, providerIntakeSeed } = await readControlServerSeeds(paths);
  const providerIntakeState = normalizeProviderIntakeState(providerIntakeSeed);
  const controlStore = new ControlStateStore({
    runId: target.runId ?? 'control-host',
    controlSeq: controlSeed?.control_seq ?? 0,
    latestAction: controlSeed?.latest_action ?? null,
    featureToggles: controlSeed?.feature_toggles ?? null,
    transportMutation: controlSeed?.transport_mutation ?? null
  });
  const runtime = createControlRuntime({
    controlStore,
    questionQueue: { list: () => [] },
    paths,
    linearAdvisoryState: normalizeLinearAdvisoryState(linearAdvisorySeed),
    providerIntakeState
  });
  return {
    dataset: await readUiDataset({
      readCompatibilityProjection: () => runtime.snapshot().readCompatibilityProjection()
    }),
    providerIntakeState
  };
}

function buildRunPathsFromTarget(target: CoStatusAttachTarget): RunPaths {
  const runDir = resolve(target.runDir);
  const manifestPath = resolve(target.manifestPath);
  return {
    runDir,
    manifestPath,
    heartbeatPath: join(runDir, '.heartbeat'),
    resumeTokenPath: join(runDir, '.resume-token'),
    logPath: join(runDir, 'runner.ndjson'),
    eventsPath: join(runDir, 'events.jsonl'),
    controlPath: join(runDir, 'control.json'),
    controlAuthPath: join(runDir, 'control_auth.json'),
    controlEndpointPath: join(runDir, 'control_endpoint.json'),
    confirmationsPath: join(runDir, 'confirmations.json'),
    questionsPath: join(runDir, 'questions.json'),
    delegationTokensPath: join(runDir, 'delegation_tokens.json'),
    commandsDir: join(runDir, 'commands'),
    errorsDir: join(runDir, 'errors'),
    compatDir: join(findTaskCliDir(runDir), 'mcp', target.runId ?? 'control-host'),
    compatManifestPath: join(findTaskCliDir(runDir), 'mcp', target.runId ?? 'control-host', 'manifest.json'),
    localCompatDir: join(findRunsRoot(runDir), 'local-mcp', target.runId ?? 'control-host')
  };
}

function findTaskCliDir(runDir: string): string {
  return resolve(runDir, '..', '..');
}

function findRunsRoot(runDir: string): string {
  const parts = resolve(runDir).split(sep);
  const runsIndex = parts.lastIndexOf('.runs');
  if (runsIndex <= 0) {
    return resolve(runDir, '..', '..', '..');
  }
  return parts.slice(0, runsIndex + 1).join(sep) || sep;
}

export const __test__ = {
  isDegradedMetadataPayloadMatchingClaim
};
