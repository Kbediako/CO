import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import {
  readProviderLinearParallelizationSnapshots,
  summarizeProviderLinearAuditPath,
  type ProviderLinearAuditSummary
} from './providerLinearWorkflowAudit.js';
import { resolveControlHostSourceFreshnessPolicyFromPolling } from './controlHostOwnership.js';
import { isTerminalProviderIntakeIssueState } from './providerIntakeState.js';

export type ProviderControlHostFreshnessVerdict =
  | 'healthy'
  | 'degraded'
  | 'stale'
  | 'contradictory'
  | 'unknown';

export interface ProviderControlHostFreshnessGaugeThresholds {
  staleRefreshAfterMs: number;
  staleHeartbeatAfterMs: number;
  staleRetryAfterMs: number;
  staleClaimQueueAfterMs: number;
  claimToStartDegradedAfterMs: number;
  startToHeartbeatDegradedAfterMs: number;
  linearHeadroomLowRatio: number;
  childLaneCap: number;
}

export interface ProviderControlHostFreshnessGaugeMetric<T = number | string | boolean> {
  value: T | null;
  unit: string | null;
  verdict: ProviderControlHostFreshnessVerdict;
  source_path: string | null;
  source_field: string | null;
  reason: string | null;
}

export interface ProviderControlHostFreshnessGaugeFinding {
  code: string;
  verdict: Exclude<ProviderControlHostFreshnessVerdict, 'healthy'>;
  message: string;
  source_path: string | null;
  source_field: string | null;
}

export interface ProviderControlHostFreshnessGaugeSources {
  artifact_root: string | null;
  provider_intake_state: string[];
  provider_manifests: string[];
  provider_proofs: string[];
  worker_audit_jsonl: string[];
  control_endpoint_metadata: string[];
  status_datasets: string[];
  polling_health: string[];
  linear_budget_state: string[];
}

export interface ProviderControlHostFreshnessGaugeReport {
  schema_version: 1;
  generated_at: string;
  read_only: true;
  verdict: ProviderControlHostFreshnessVerdict;
  strict_failed: boolean;
  thresholds: ProviderControlHostFreshnessGaugeThresholds;
  sources: ProviderControlHostFreshnessGaugeSources;
  metrics: {
    claim_queue_age_ms: ProviderControlHostFreshnessGaugeMetric<number>;
    last_successful_refresh_age_ms: ProviderControlHostFreshnessGaugeMetric<number>;
    polling_health: ProviderControlHostFreshnessGaugeMetric<string>;
    claim_to_start_latency_ms: ProviderControlHostFreshnessGaugeMetric<number>;
    start_to_first_heartbeat_latency_ms: ProviderControlHostFreshnessGaugeMetric<number>;
    active_heartbeat_age_ms: ProviderControlHostFreshnessGaugeMetric<number>;
    terminal_reconciliation_lag_ms: ProviderControlHostFreshnessGaugeMetric<number>;
    retry_backoff_age_ms: ProviderControlHostFreshnessGaugeMetric<number>;
    child_lane_cap_pressure: ProviderControlHostFreshnessGaugeMetric<number>;
    stale_source_verdict: ProviderControlHostFreshnessGaugeMetric<ProviderControlHostFreshnessVerdict>;
  };
  findings: ProviderControlHostFreshnessGaugeFinding[];
}

export interface ProviderControlHostFreshnessGaugeOptions {
  artifactRoot?: string | null;
  now?: string | number | Date | null;
  strict?: boolean;
  maxDepth?: number | null;
  thresholds?: Partial<ProviderControlHostFreshnessGaugeThresholds>;
  paths?: Partial<Omit<ProviderControlHostFreshnessGaugeSources, 'artifact_root'>>;
}

interface JsonArtifact {
  path: string;
  value: unknown;
}

interface ManifestArtifact {
  path: string;
  runDir: string;
  value: Record<string, unknown>;
}

interface ProofArtifact {
  path: string;
  runDir: string;
  value: Record<string, unknown>;
  manifest: ManifestArtifact | null;
}

interface WorkerAuditArtifact {
  path: string;
  summary: ProviderLinearAuditSummary;
  lineCount: number;
  malformedLineCount: number;
}

const DEFAULT_THRESHOLDS: ProviderControlHostFreshnessGaugeThresholds = {
  staleRefreshAfterMs: 5 * 60 * 1000,
  staleHeartbeatAfterMs: 10 * 60 * 1000,
  staleRetryAfterMs: 10 * 60 * 1000,
  staleClaimQueueAfterMs: 30 * 60 * 1000,
  claimToStartDegradedAfterMs: 5 * 60 * 1000,
  startToHeartbeatDegradedAfterMs: 2 * 60 * 1000,
  linearHeadroomLowRatio: 0.05,
  childLaneCap: 2
};

const PROVIDER_LINEAR_CHILD_LANE_IN_FLIGHT_STALE_MS = 30 * 60 * 1000;

const STATUS_DATASET_NAMES = new Set([
  'co-status-dataset.json',
  'operator-dashboard-dataset.json',
  'operator-dashboard.json',
  'status-dataset.json',
  'ui-data.json'
]);

const POLLING_HEALTH_NAMES = new Set([
  'provider-polling-health.json',
  'control-polling-health.json',
  'polling-health.json'
]);

const LINEAR_BUDGET_NAMES = new Set([
  'linear-budget-state.json',
  'linear-budget-status.json',
  'linear-budget.json'
]);

const SKIPPED_SCAN_DIRS = new Set([
  '.git',
  '.next',
  '.turbo',
  'dist',
  'node_modules'
]);

const QUEUED_CLAIM_STATES = new Set([
  'accepted',
  'starting',
  'resuming'
]);

const ACTIVE_CLAIM_STATES = new Set([
  ...QUEUED_CLAIM_STATES,
  'running'
]);

const TERMINAL_MANIFEST_STATUSES = new Set([
  'cancelled',
  'canceled',
  'completed',
  'failed',
  'succeeded'
]);

export async function evaluateProviderControlHostFreshnessGauge(
  options: ProviderControlHostFreshnessGaugeOptions = {}
): Promise<ProviderControlHostFreshnessGaugeReport> {
  const thresholds = normalizeThresholds(options.thresholds);
  const nowMs = normalizeNowMs(options.now);
  const generatedAt = new Date(nowMs).toISOString();
  const sources = await discoverProviderControlHostFreshnessGaugeSources(options);
  const findings: ProviderControlHostFreshnessGaugeFinding[] = [];
  const artifacts = await readGaugeArtifacts(sources, findings);
  const statusDataset = selectLatestJsonArtifact(artifacts.statusDatasets);
  const intakeState = selectLatestJsonArtifact(artifacts.providerIntakeStates);
  const manifests = artifacts.providerManifests;
  const proofs = artifacts.providerProofs.map((proof) => ({
    ...proof,
    manifest: findManifestForProof(proof, manifests)
  }));
  const pollingHealth = selectPollingHealthArtifact({
    explicit: artifacts.pollingHealth,
    intakeState,
    statusDataset
  });
  const linearBudget = selectLinearBudgetArtifact({
    explicit: artifacts.linearBudgetState,
    pollingHealth,
    statusDataset,
    proofs
  });
  const metrics = {
    claim_queue_age_ms: evaluateClaimQueueAge(intakeState, nowMs, thresholds, findings),
    last_successful_refresh_age_ms: evaluateRefreshAge(
      { intakeState, pollingHealth, statusDataset },
      nowMs,
      thresholds,
      findings
    ),
    polling_health: evaluatePollingHealth(pollingHealth, thresholds, findings),
    claim_to_start_latency_ms: evaluateClaimToStartLatency(
      intakeState,
      manifests,
      nowMs,
      thresholds,
      findings
    ),
    start_to_first_heartbeat_latency_ms: evaluateStartToHeartbeatLatency(
      proofs,
      nowMs,
      thresholds,
      findings
    ),
    active_heartbeat_age_ms: evaluateActiveHeartbeatAge(intakeState, proofs, nowMs, thresholds, findings),
    terminal_reconciliation_lag_ms: evaluateTerminalReconciliationLag(
      intakeState,
      proofs,
      nowMs,
      findings
    ),
    retry_backoff_age_ms: evaluateRetryBackoffAge(
      { intakeState, statusDataset },
      nowMs,
      thresholds,
      findings
    ),
    child_lane_cap_pressure: evaluateChildLaneCapPressure(proofs, nowMs, thresholds, findings),
    stale_source_verdict: buildUnknownVerdictMetric()
  };
  evaluateStaleSupervisedSourceActiveClaims(intakeState, findings);
  evaluateLinearBudget(linearBudget, thresholds, findings);
  evaluateWorkerAuditHealth(artifacts.workerAudits, findings);
  if (!hasCoreFreshnessSources(sources)) {
    const auxiliarySourcePath = firstAuxiliarySourcePath(sources);
    findings.push({
      code: auxiliarySourcePath ? 'missing_core_freshness_artifacts' : 'no_provider_control_host_artifacts',
      verdict: 'unknown',
      message: auxiliarySourcePath
        ? 'Auxiliary provider/control-host artifacts were discovered, but no core freshness source was available.'
        : 'No provider/control-host freshness artifacts were discovered.',
      source_path: auxiliarySourcePath ?? sources.artifact_root,
      source_field: null
    });
  }

  const verdict = resolveOverallVerdict(findings);
  metrics.stale_source_verdict = {
    value: verdict,
    unit: null,
    verdict,
    source_path: firstStaleSourcePath(findings),
    source_field: null,
    reason: findings.length === 0 ? 'no stale or contradictory sources detected' : 'see findings'
  };
  const strictFailed = options.strict === true && (verdict === 'stale' || verdict === 'contradictory');
  return {
    schema_version: 1,
    generated_at: generatedAt,
    read_only: true,
    verdict,
    strict_failed: strictFailed,
    thresholds,
    sources,
    metrics,
    findings
  };
}

async function discoverProviderControlHostFreshnessGaugeSources(
  options: ProviderControlHostFreshnessGaugeOptions
): Promise<ProviderControlHostFreshnessGaugeSources> {
  const artifactRoot = options.artifactRoot ? resolve(options.artifactRoot) : null;
  const sources: ProviderControlHostFreshnessGaugeSources = {
    artifact_root: artifactRoot,
    provider_intake_state: normalizePathList(options.paths?.provider_intake_state),
    provider_manifests: normalizePathList(options.paths?.provider_manifests),
    provider_proofs: normalizePathList(options.paths?.provider_proofs),
    worker_audit_jsonl: normalizePathList(options.paths?.worker_audit_jsonl),
    control_endpoint_metadata: normalizePathList(options.paths?.control_endpoint_metadata),
    status_datasets: normalizePathList(options.paths?.status_datasets),
    polling_health: normalizePathList(options.paths?.polling_health),
    linear_budget_state: normalizePathList(options.paths?.linear_budget_state)
  };
  if (!artifactRoot) {
    return sources;
  }
  const discovered = await scanArtifactRoot(artifactRoot, options.maxDepth ?? 8);
  appendUnique(sources.provider_intake_state, discovered.provider_intake_state);
  appendUnique(sources.provider_manifests, discovered.provider_manifests);
  appendUnique(sources.provider_proofs, discovered.provider_proofs);
  appendUnique(sources.worker_audit_jsonl, discovered.worker_audit_jsonl);
  appendUnique(sources.control_endpoint_metadata, discovered.control_endpoint_metadata);
  appendUnique(sources.status_datasets, discovered.status_datasets);
  appendUnique(sources.polling_health, discovered.polling_health);
  appendUnique(sources.linear_budget_state, discovered.linear_budget_state);
  return sources;
}

async function scanArtifactRoot(
  artifactRoot: string,
  maxDepth: number
): Promise<Omit<ProviderControlHostFreshnessGaugeSources, 'artifact_root'>> {
  const sources: Omit<ProviderControlHostFreshnessGaugeSources, 'artifact_root'> = {
    provider_intake_state: [],
    provider_manifests: [],
    provider_proofs: [],
    worker_audit_jsonl: [],
    control_endpoint_metadata: [],
    status_datasets: [],
    polling_health: [],
    linear_budget_state: []
  };
  await scanDirectory(artifactRoot, 0, Math.max(0, maxDepth), sources);
  return sources;
}

async function scanDirectory(
  directory: string,
  depth: number,
  maxDepth: number,
  sources: Omit<ProviderControlHostFreshnessGaugeSources, 'artifact_root'>
): Promise<void> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (depth >= maxDepth || SKIPPED_SCAN_DIRS.has(entry.name)) {
        continue;
      }
      await scanDirectory(resolve(directory, entry.name), depth + 1, maxDepth, sources);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const path = resolve(directory, entry.name);
    switch (entry.name) {
      case 'provider-intake-state.json':
        sources.provider_intake_state.push(path);
        break;
      case 'manifest.json':
        sources.provider_manifests.push(path);
        break;
      case 'provider-linear-worker-proof.json':
        sources.provider_proofs.push(path);
        break;
      case 'provider-linear-worker-linear-audit.jsonl':
        sources.worker_audit_jsonl.push(path);
        break;
      case 'control_endpoint.json':
        sources.control_endpoint_metadata.push(path);
        break;
      default:
        if (STATUS_DATASET_NAMES.has(entry.name)) {
          sources.status_datasets.push(path);
        } else if (POLLING_HEALTH_NAMES.has(entry.name)) {
          sources.polling_health.push(path);
        } else if (LINEAR_BUDGET_NAMES.has(entry.name)) {
          sources.linear_budget_state.push(path);
        }
    }
  }
}

async function readGaugeArtifacts(
  sources: ProviderControlHostFreshnessGaugeSources,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): Promise<{
  providerIntakeStates: JsonArtifact[];
  providerManifests: ManifestArtifact[];
  providerProofs: ProofArtifact[];
  workerAudits: WorkerAuditArtifact[];
  controlEndpointMetadata: JsonArtifact[];
  pollingHealth: JsonArtifact[];
  statusDatasets: JsonArtifact[];
  linearBudgetState: JsonArtifact[];
}> {
  const providerIntakeStates = await readJsonArtifacts(sources.provider_intake_state, findings);
  const latestProviderIntakeState = selectLatestJsonArtifact(providerIntakeStates);
  const claimLinkedSources = await discoverClaimLinkedRunArtifactSources(
    latestProviderIntakeState ? [latestProviderIntakeState] : [],
    sources.artifact_root
  );
  appendUnique(sources.provider_manifests, claimLinkedSources.provider_manifests);
  appendUnique(sources.provider_proofs, claimLinkedSources.provider_proofs);
  const [
    rawManifests,
    rawProofs,
    workerAudits,
    controlEndpointMetadata,
    pollingHealth,
    statusDatasets,
    linearBudgetState
  ] = await Promise.all([
    readJsonArtifacts(sources.provider_manifests, findings),
    readJsonArtifacts(sources.provider_proofs, findings),
    readWorkerAuditArtifacts(sources.worker_audit_jsonl, findings),
    readJsonArtifacts(sources.control_endpoint_metadata, findings),
    readJsonArtifacts(sources.polling_health, findings),
    readJsonArtifacts(sources.status_datasets, findings),
    readJsonArtifacts(sources.linear_budget_state, findings)
  ]);
  const providerManifests = rawManifests.flatMap((artifact) => {
    const value = asRecord(artifact.value);
    return value ? [{ path: artifact.path, runDir: dirname(artifact.path), value }] : [];
  });
  const providerProofs = rawProofs.flatMap((artifact) => {
    const value = asRecord(artifact.value);
    return value ? [{ path: artifact.path, runDir: dirname(artifact.path), value, manifest: null }] : [];
  });
  return {
    providerIntakeStates,
    providerManifests,
    providerProofs,
    workerAudits,
    controlEndpointMetadata,
    pollingHealth,
    statusDatasets,
    linearBudgetState
  };
}

async function discoverClaimLinkedRunArtifactSources(
  providerIntakeStates: JsonArtifact[],
  artifactRoot: string | null
): Promise<{
  provider_manifests: string[];
  provider_proofs: string[];
}> {
  const provider_manifests: string[] = [];
  const provider_proofs: string[] = [];
  for (const artifact of providerIntakeStates) {
    const claims = asRecord(artifact.value)?.claims;
    if (!Array.isArray(claims)) {
      continue;
    }
    for (const rawClaim of claims) {
      const claim = asRecord(rawClaim);
      if (!claim || !isActiveClaim(claim)) {
        continue;
      }
      const manifestPath = normalizeOptionalString(claim?.run_manifest_path);
      if (!manifestPath) {
        continue;
      }
      const resolvedManifestPath = await firstReadablePath(
        resolveClaimLinkedRunManifestPathCandidates({
          artifact,
          artifactRoot,
          manifestPath
        })
      );
      if (!resolvedManifestPath) {
        continue;
      }
      provider_manifests.push(resolvedManifestPath);
      const proofPath = resolve(dirname(resolvedManifestPath), 'provider-linear-worker-proof.json');
      if (await isReadableFile(proofPath)) {
        provider_proofs.push(proofPath);
      }
    }
  }
  return {
    provider_manifests,
    provider_proofs
  };
}

function resolveClaimLinkedRunManifestPathCandidates(input: {
  artifact: JsonArtifact;
  artifactRoot: string | null;
  manifestPath: string;
}): string[] {
  if (isAbsolute(input.manifestPath)) {
    return [input.manifestPath];
  }
  const bases = [
    dirname(input.artifact.path),
    input.artifactRoot,
    findRepoRootFromRunsPath(input.artifact.path),
    input.artifactRoot ? findRepoRootFromRunsPath(input.artifactRoot) : null
  ];
  return Array.from(new Set(
    bases.flatMap((base) => (base ? [resolve(base, input.manifestPath)] : []))
  ));
}

function findRepoRootFromRunsPath(path: string): string | null {
  const parts = resolve(path).split(sep);
  const runsIndex = parts.lastIndexOf('.runs');
  if (runsIndex <= 0) {
    return null;
  }
  return parts.slice(0, runsIndex).join(sep) || sep;
}

async function firstReadablePath(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (await isReadableFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function isReadableFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function readJsonArtifacts(
  paths: string[],
  findings: ProviderControlHostFreshnessGaugeFinding[]
): Promise<JsonArtifact[]> {
  const artifacts: JsonArtifact[] = [];
  for (const path of paths) {
    try {
      const raw = await readFile(path, 'utf8');
      artifacts.push({ path, value: JSON.parse(raw) as unknown });
    } catch (error) {
      findings.push({
        code: 'artifact_unreadable',
        verdict: 'unknown',
        message: `Artifact could not be read or parsed: ${describeError(error)}`,
        source_path: path,
        source_field: null
      });
    }
  }
  return artifacts;
}

async function readWorkerAuditArtifacts(
  paths: string[],
  findings: ProviderControlHostFreshnessGaugeFinding[]
): Promise<WorkerAuditArtifact[]> {
  const artifacts: WorkerAuditArtifact[] = [];
  for (const path of paths) {
    let raw: string;
    try {
      raw = await readFile(path, 'utf8');
    } catch (error) {
      findings.push({
        code: 'worker_audit_unreadable',
        verdict: 'unknown',
        message: `Worker audit JSONL could not be read: ${describeError(error)}`,
        source_path: path,
        source_field: null
      });
      continue;
    }
    const lines = raw.split(/\r?\n/u).filter((line) => line.trim().length > 0);
    const malformedLineCount = lines.filter((line) => {
      try {
        JSON.parse(line);
        return false;
      } catch {
        return true;
      }
    }).length;
    if (malformedLineCount > 0) {
      findings.push({
        code: 'worker_audit_jsonl_malformed',
        verdict: 'unknown',
        message: `Worker audit JSONL has ${malformedLineCount} malformed line(s).`,
        source_path: path,
        source_field: null
      });
    }
    artifacts.push({
      path,
      summary: await summarizeProviderLinearAuditPath(path),
      lineCount: lines.length,
      malformedLineCount
    });
  }
  return artifacts;
}

function evaluateClaimQueueAge(
  intakeState: JsonArtifact | null,
  nowMs: number,
  thresholds: ProviderControlHostFreshnessGaugeThresholds,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): ProviderControlHostFreshnessGaugeMetric<number> {
  const claims = collectClaims(intakeState);
  const queuedClaims = claims.filter(isQueuedClaim);
  const candidates = queuedClaims.flatMap((claim) => {
    const acceptedAt = timestampMs(claim.accepted_at ?? claim.updated_at);
    return acceptedAt === null ? [] : [{ claim, acceptedAt, ageMs: Math.max(0, nowMs - acceptedAt) }];
  });
  if (candidates.length === 0) {
    return metric<number>(null, 'ms', 'unknown', intakeState?.path ?? null, 'claims[].accepted_at', 'no queued claims observed');
  }
  const oldest = candidates.reduce((winner, candidate) =>
    candidate.ageMs > winner.ageMs ? candidate : winner
  );
  if (oldest.ageMs > thresholds.staleClaimQueueAfterMs) {
    findings.push({
      code: 'claim_queue_stale',
      verdict: 'stale',
      message: `Oldest queued provider claim is ${oldest.ageMs}ms old.`,
      source_path: intakeState?.path ?? null,
      source_field: 'claims[].accepted_at'
    });
  }
  return metric(
    oldest.ageMs,
    'ms',
    oldest.ageMs > thresholds.staleClaimQueueAfterMs ? 'stale' : 'healthy',
    intakeState?.path ?? null,
    'claims[].accepted_at',
    null
  );
}

function evaluateRefreshAge(
  input: {
    intakeState: JsonArtifact | null;
    pollingHealth: JsonArtifact | null;
    statusDataset: JsonArtifact | null;
  },
  nowMs: number,
  thresholds: ProviderControlHostFreshnessGaugeThresholds,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): ProviderControlHostFreshnessGaugeMetric<number> {
  const observedRefreshCandidates = [
    timestampCandidate(input.pollingHealth, 'last_success_at'),
    timestampCandidate(input.intakeState, 'polling.last_success_at'),
    timestampCandidate(input.statusDataset, 'polling.last_success_at')
  ].filter((candidate): candidate is TimestampCandidate => candidate !== null);
  const candidates = observedRefreshCandidates.length > 0
    ? observedRefreshCandidates
    : [timestampCandidate(input.statusDataset, 'generated_at')].filter(
        (candidate): candidate is TimestampCandidate => candidate !== null
      );
  const latest = selectLatestTimestampCandidate(candidates);
  if (!latest) {
    const missingRefreshSource = firstRefreshTimestampSource(input);
    if (missingRefreshSource) {
      findings.push({
        code: 'refresh_timestamp_missing',
        verdict: 'unknown',
        message: 'No successful provider/control-host refresh timestamp was observed.',
        source_path: missingRefreshSource.path,
        source_field: missingRefreshSource.field
      });
    }
    return metric<number>(
      null,
      'ms',
      'unknown',
      missingRefreshSource?.path ?? null,
      missingRefreshSource?.field ?? null,
      'no refresh timestamp observed'
    );
  }
  const age = Math.max(0, nowMs - latest.timestampMs);
  if (age > thresholds.staleRefreshAfterMs) {
    findings.push({
      code: 'stale_refresh',
      verdict: 'stale',
      message: `Last successful provider/control-host refresh is ${age}ms old.`,
      source_path: latest.path,
      source_field: latest.field
    });
  }
  return metric(
    age,
    'ms',
    age > thresholds.staleRefreshAfterMs ? 'stale' : 'healthy',
    latest.path,
    latest.field,
    null
  );
}

function evaluatePollingHealth(
  pollingHealth: JsonArtifact | null,
  _thresholds: ProviderControlHostFreshnessGaugeThresholds,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): ProviderControlHostFreshnessGaugeMetric<string> {
  const polling = asRecord(pollingHealth?.value);
  if (!polling) {
    return metric<string>(null, null, 'unknown', null, null, 'no polling health artifact observed');
  }
  if (polling.stuck === true || polling.restart_required === true) {
    findings.push({
      code: 'polling_stuck',
      verdict: 'stale',
      message: 'Provider polling health reports a stuck/restart-required state.',
      source_path: pollingHealth?.path ?? null,
      source_field: polling.stuck === true ? 'stuck' : 'restart_required'
    });
    return metric('stuck', null, 'stale', pollingHealth?.path ?? null, null, normalizeOptionalString(polling.reason));
  }
  if (polling.last_error && !polling.last_success_at) {
    findings.push({
      code: 'polling_error_without_success',
      verdict: 'degraded',
      message: 'Provider polling reports an error and no successful refresh.',
      source_path: pollingHealth?.path ?? null,
      source_field: 'last_error'
    });
    return metric('error', null, 'degraded', pollingHealth?.path ?? null, 'last_error', normalizeOptionalString(polling.last_error));
  }
  return metric('ok', null, 'healthy', pollingHealth?.path ?? null, null, null);
}

function evaluateClaimToStartLatency(
  intakeState: JsonArtifact | null,
  manifests: ManifestArtifact[],
  _nowMs: number,
  thresholds: ProviderControlHostFreshnessGaugeThresholds,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): ProviderControlHostFreshnessGaugeMetric<number> {
  const claims = collectClaims(intakeState).filter(isActiveClaim);
  const candidates = claims.flatMap((claim) => {
    const acceptedAt = timestampMs(claim.accepted_at);
    const runId = normalizeOptionalString(claim.run_id);
    const manifest = runId ? findLatestManifestForRunId(manifests, runId) : null;
    const startedAt =
      timestampMs(claim.launch_started_at) ??
      timestampMs(manifest?.value.started_at) ??
      timestampMs(manifest?.value.startedAt);
    return acceptedAt !== null && startedAt !== null
      ? [{ latencyMs: Math.max(0, startedAt - acceptedAt), manifest }]
      : [];
  });
  if (candidates.length === 0) {
    return metric<number>(null, 'ms', 'unknown', intakeState?.path ?? null, 'claims[].launch_started_at', 'no claim-to-start pair observed');
  }
  const slowest = candidates.reduce((winner, candidate) =>
    candidate.latencyMs > winner.latencyMs ? candidate : winner
  );
  if (slowest.latencyMs > thresholds.claimToStartDegradedAfterMs) {
    findings.push({
      code: 'claim_to_start_latency_degraded',
      verdict: 'degraded',
      message: `Provider claim-to-start latency is ${slowest.latencyMs}ms.`,
      source_path: slowest.manifest?.path ?? intakeState?.path ?? null,
      source_field: 'claims[].accepted_at'
    });
  }
  return metric(
    slowest.latencyMs,
    'ms',
    slowest.latencyMs > thresholds.claimToStartDegradedAfterMs ? 'degraded' : 'healthy',
    slowest.manifest?.path ?? intakeState?.path ?? null,
    'claims[].accepted_at',
    null
  );
}

function evaluateStartToHeartbeatLatency(
  proofs: ProofArtifact[],
  _nowMs: number,
  thresholds: ProviderControlHostFreshnessGaugeThresholds,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): ProviderControlHostFreshnessGaugeMetric<number> {
  const candidates = proofs.flatMap((proof) => {
    if (!isActiveProof(proof)) {
      return [];
    }
    const startedAt =
      timestampMs(proof.value.attempt_started_at) ??
      timestampMs(proof.value.current_turn_started_at) ??
      timestampMs(proof.manifest?.value.started_at) ??
      timestampMs(proof.manifest?.value.startedAt);
    const heartbeatAt = firstHeartbeatTimestampMs(proof);
    return startedAt !== null && heartbeatAt !== null
      ? [{ latencyMs: Math.max(0, heartbeatAt - startedAt), proof }]
      : [];
  });
  if (candidates.length === 0) {
    return metric<number>(null, 'ms', 'unknown', null, null, 'no start-to-heartbeat pair observed');
  }
  const slowest = candidates.reduce((winner, candidate) =>
    candidate.latencyMs > winner.latencyMs ? candidate : winner
  );
  if (slowest.latencyMs > thresholds.startToHeartbeatDegradedAfterMs) {
    findings.push({
      code: 'start_to_first_heartbeat_latency_degraded',
      verdict: 'degraded',
      message: `Provider start-to-first-heartbeat latency is ${slowest.latencyMs}ms.`,
      source_path: slowest.proof.path,
      source_field: 'first_heartbeat_at'
    });
  }
  return metric(
    slowest.latencyMs,
    'ms',
    slowest.latencyMs > thresholds.startToHeartbeatDegradedAfterMs ? 'degraded' : 'healthy',
    slowest.proof.path,
    'first_heartbeat_at',
    null
  );
}

function evaluateActiveHeartbeatAge(
  intakeState: JsonArtifact | null,
  proofs: ProofArtifact[],
  nowMs: number,
  thresholds: ProviderControlHostFreshnessGaugeThresholds,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): ProviderControlHostFreshnessGaugeMetric<number> {
  const activeProofs = proofs.filter(isActiveProof);
  const missingProofClaims = collectClaims(intakeState)
    .filter((claim) => readState(claim) === 'running')
    .filter((claim) => !isTerminalProviderIntakeGaugeClaim(claim))
    .filter((claim) => {
      const runId = normalizeOptionalString(claim.run_id);
      return !runId || !activeProofs.some((proof) => resolveProofRunId(proof) === runId);
    });
  if (missingProofClaims.length > 0) {
    findings.push({
      code: 'active_worker_proof_missing',
      verdict: 'unknown',
      message: 'Provider intake has a running claim without matching active provider-worker proof evidence.',
      source_path: intakeState?.path ?? null,
      source_field: 'claims[].run_id'
    });
  }
  const candidates = activeProofs.flatMap((proof) => {
    if (!isActiveProof(proof)) {
      return [];
    }
    const heartbeatAt = latestTimestampMs(
      timestampMs(proof.value.updated_at),
      timestampMs(proof.value.last_event_at),
      firstTimestampMs(proof.value.current_turn_activity, 'recorded_at'),
      timestampMs(proof.manifest?.value.heartbeat_at),
      timestampMs(proof.manifest?.value.updated_at)
    );
    return heartbeatAt === null ? [] : [{ ageMs: Math.max(0, nowMs - heartbeatAt), proof }];
  });
  if (candidates.length === 0) {
    return metric<number>(
      null,
      'ms',
      'unknown',
      missingProofClaims.length > 0 ? intakeState?.path ?? null : null,
      missingProofClaims.length > 0 ? 'claims[].run_id' : null,
      missingProofClaims.length > 0
        ? 'running claim has no matching active provider proof'
        : 'no active provider proof observed'
    );
  }
  const stalest = candidates.reduce((winner, candidate) =>
    candidate.ageMs > winner.ageMs ? candidate : winner
  );
  if (stalest.ageMs > thresholds.staleHeartbeatAfterMs) {
    findings.push({
      code: 'active_heartbeat_stale',
      verdict: 'stale',
      message: `Active provider worker heartbeat is ${stalest.ageMs}ms old.`,
      source_path: stalest.proof.path,
      source_field: 'updated_at'
    });
  }
  return metric(
    stalest.ageMs,
    'ms',
    stalest.ageMs > thresholds.staleHeartbeatAfterMs ? 'stale' : 'healthy',
    stalest.proof.path,
    'updated_at',
    null
  );
}

function evaluateTerminalReconciliationLag(
  intakeState: JsonArtifact | null,
  proofs: ProofArtifact[],
  nowMs: number,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): ProviderControlHostFreshnessGaugeMetric<number> {
  const claims = collectClaims(intakeState);
  const activeClaims = claims.filter(isActiveClaim);
  const unreconcilableTerminalProofs: ProofArtifact[] = [];
  const candidates = proofs.flatMap((proof) => {
    if (!isTerminalProof(proof)) {
      return [];
    }
    const runId = normalizeOptionalString(proof.manifest?.value.run_id) ?? normalizeOptionalString(proof.value.run_id);
    if (!runId) {
      if (activeClaims.length > 0) {
        unreconcilableTerminalProofs.push(proof);
        findings.push({
          code: 'terminal_proof_missing_run_id',
          verdict: 'unknown',
          message: 'Terminal provider proof/manifest cannot be reconciled against active claims because run_id is missing.',
          source_path: proof.path,
          source_field: 'run_id'
        });
      }
      return [];
    }
    const matchingClaim = activeClaims.find((claim) => {
      const claimRunId = normalizeOptionalString(claim.run_id);
      return claimRunId === runId;
    });
    if (!matchingClaim) {
      return [];
    }
    const terminalAt = latestTimestampMs(
      timestampMs(proof.manifest?.value.completed_at),
      timestampMs(proof.manifest?.value.updated_at),
      timestampMs(proof.value.updated_at),
      timestampMs(proof.value.last_event_at)
    );
    return [{ lagMs: terminalAt === null ? null : Math.max(0, nowMs - terminalAt), proof }];
  });
  if (candidates.length === 0) {
    const unreconcilableTerminalProof = unreconcilableTerminalProofs[0];
    if (unreconcilableTerminalProof) {
      return metric<number>(
        null,
        'ms',
        'unknown',
        unreconcilableTerminalProof.path,
        'run_id',
        'terminal proof/manifest missing run_id while active claims exist'
      );
    }
    return metric(0, 'ms', 'healthy', intakeState?.path ?? null, null, null);
  }
  const worst = candidates.reduce((winner, candidate) =>
    (candidate.lagMs ?? 0) > (winner.lagMs ?? 0) ? candidate : winner
  );
  findings.push({
    code: 'terminal_proof_with_active_claim',
    verdict: 'contradictory',
    message: worst.lagMs === null
      ? 'Terminal provider proof/manifest still has an active intake claim; terminal timestamp is unavailable.'
      : `Terminal provider proof/manifest still has an active intake claim after ${worst.lagMs}ms.`,
    source_path: worst.proof.path,
    source_field: 'owner_status'
  });
  return metric(
    worst.lagMs,
    'ms',
    'contradictory',
    worst.proof.path,
    'owner_status',
    'terminal proof/manifest with active claim'
  );
}

function evaluateRetryBackoffAge(
  input: { intakeState: JsonArtifact | null; statusDataset: JsonArtifact | null },
  nowMs: number,
  thresholds: ProviderControlHostFreshnessGaugeThresholds,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): ProviderControlHostFreshnessGaugeMetric<number> {
  const retryCandidates = [
    ...collectClaims(input.intakeState)
      .filter((claim) => !isTerminalProviderIntakeGaugeClaim(claim))
      .filter((claim) => claim.retry_queued === true || timestampMs(claim.retry_due_at) !== null)
      .flatMap((claim) => {
        const dueAt = timestampMs(claim.retry_due_at);
        return dueAt === null ? [] : [{ dueAt, sourcePath: input.intakeState?.path ?? null, field: 'claims[].retry_due_at' }];
      }),
    ...collectStatusRetrying(input.statusDataset).flatMap((retry) => {
      const dueAt = timestampMs(retry.due_at);
      return dueAt === null ? [] : [{ dueAt, sourcePath: input.statusDataset?.path ?? null, field: 'retrying[].due_at' }];
    })
  ];
  if (retryCandidates.length === 0) {
    return metric<number>(null, 'ms', 'unknown', null, null, 'no retry/backoff evidence observed');
  }
  const oldest = retryCandidates.reduce((winner, candidate) =>
    candidate.dueAt < winner.dueAt ? candidate : winner
  );
  const overdueAge = Math.max(0, nowMs - oldest.dueAt);
  if (overdueAge > thresholds.staleRetryAfterMs) {
    findings.push({
      code: 'retry_queue_stale',
      verdict: 'stale',
      message: `Retry/backoff queue is overdue by ${overdueAge}ms.`,
      source_path: oldest.sourcePath,
      source_field: oldest.field
    });
  }
  return metric(
    overdueAge,
    'ms',
    overdueAge > thresholds.staleRetryAfterMs ? 'stale' : 'healthy',
    oldest.sourcePath,
    oldest.field,
    null
  );
}

function evaluateStaleSupervisedSourceActiveClaims(
  intakeState: JsonArtifact | null,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): void {
  const value = asRecord(intakeState?.value);
  const policy = resolveControlHostSourceFreshnessPolicyFromPolling(
    asRecord(value?.polling)?.control_host_owner
  );
  if (!policy) {
    return;
  }
  const activeClaims = collectClaims(intakeState).filter(isActiveOrRetryQueuedClaim);
  if (activeClaims.length === 0) {
    return;
  }
  findings.push({
    code: 'stale_supervised_source_active_claims',
    verdict: 'stale',
    message: `Supervised control-host source freshness is not current while ${activeClaims.length} provider-intake claim(s) are active; policy action=${policy.action}.`,
    source_path: intakeState?.path ?? null,
    source_field: 'polling.control_host_owner.owner.source_root_freshness'
  });
}

function evaluateChildLaneCapPressure(
  proofs: ProofArtifact[],
  nowMs: number,
  thresholds: ProviderControlHostFreshnessGaugeThresholds,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): ProviderControlHostFreshnessGaugeMetric<number> {
  const activeProofs = proofs.filter(isActiveProof);
  const lanes = activeProofs.flatMap((proof) =>
    collectArrayRecords(proof.value.child_lanes).map((lane) => ({ lane, proof }))
  );
  const activeByParent = new Map<string, { count: number; proof: ProofArtifact }>();
  for (const { lane, proof } of lanes) {
    if (!isActiveChildLane(lane, nowMs)) {
      continue;
    }
    const parentKey = childLaneParentKey(proof);
    const bucket = activeByParent.get(parentKey);
    activeByParent.set(parentKey, {
      count: (bucket?.count ?? 0) + 1,
      proof: bucket?.proof ?? proof
    });
  }
  const buckets = [...activeByParent.values()];
  if (buckets.length === 0) {
    return metric(0, 'ratio', 'healthy', activeProofs[0]?.path ?? proofs[0]?.path ?? null, 'child_lanes', null);
  }
  const busiest = buckets.reduce((winner, bucket) => bucket.count > winner.count ? bucket : winner);
  const pressure = thresholds.childLaneCap > 0 ? busiest.count / thresholds.childLaneCap : busiest.count;
  if (pressure >= 1) {
    findings.push({
      code: 'child_lane_cap_pressure',
      verdict: 'degraded',
      message: `Child-lane cap pressure is ${busiest.count}/${thresholds.childLaneCap} for one parent run.`,
      source_path: busiest.proof.path,
      source_field: 'child_lanes'
    });
  }
  return metric(
    pressure,
    'ratio',
    pressure >= 1 ? 'degraded' : 'healthy',
    busiest.proof.path,
    'child_lanes',
    `${busiest.count}/${thresholds.childLaneCap} active, pending, or unaccepted child lanes for one parent run`
  );
}

function evaluateLinearBudget(
  linearBudget: JsonArtifact | null,
  thresholds: ProviderControlHostFreshnessGaugeThresholds,
  findings: ProviderControlHostFreshnessGaugeFinding[]
): void {
  const budget = asRecord(linearBudget?.value);
  if (!budget) {
    return;
  }
  const suppression = normalizeOptionalString(budget.suppression);
  if (budget.cooldown_active === true || (suppression !== null && suppression !== 'none')) {
    findings.push({
      code: 'linear_budget_suppressed',
      verdict: 'degraded',
      message: 'Linear shared-budget state reports active cooldown or suppression.',
      source_path: linearBudget?.path ?? null,
      source_field: budget.cooldown_active === true ? 'cooldown_active' : 'suppression'
    });
    return;
  }
  const lowBucket = ['requests', 'endpoint_requests', 'complexity', 'endpoint_complexity']
    .map((field) => ({ field, bucket: asRecord(budget[field]) }))
    .find(({ bucket }) => {
      const limit = finiteNumber(bucket?.limit);
      const remaining = finiteNumber(bucket?.remaining);
      if (limit === null || limit <= 0 || remaining === null) {
        return false;
      }
      return remaining / limit <= thresholds.linearHeadroomLowRatio;
    });
  if (lowBucket) {
    findings.push({
      code: 'linear_headroom_low',
      verdict: 'degraded',
      message: 'Linear shared-budget headroom is low.',
      source_path: linearBudget?.path ?? null,
      source_field: `${lowBucket.field}.remaining`
    });
  }
}

function firstRefreshTimestampSource(input: {
  intakeState: JsonArtifact | null;
  pollingHealth: JsonArtifact | null;
  statusDataset: JsonArtifact | null;
}): { path: string; field: string } | null {
  if (input.pollingHealth) {
    return { path: input.pollingHealth.path, field: 'last_success_at' };
  }
  if (input.intakeState) {
    return { path: input.intakeState.path, field: 'polling.last_success_at' };
  }
  if (input.statusDataset) {
    return { path: input.statusDataset.path, field: 'polling.last_success_at' };
  }
  return null;
}

function looksLikeLinearBudget(value: unknown): boolean {
  const budget = asRecord(value);
  if (!budget) {
    return false;
  }
  if (
    budget.cooldown_active !== undefined ||
    budget.suppression !== undefined ||
    budget.retry_after_seconds !== undefined ||
    budget.retryAfterSeconds !== undefined
  ) {
    return true;
  }
  return ['requests', 'endpoint_requests', 'complexity', 'endpoint_complexity']
    .some((field) => asRecord(budget[field]) !== null);
}

function evaluateWorkerAuditHealth(
  workerAudits: WorkerAuditArtifact[],
  findings: ProviderControlHostFreshnessGaugeFinding[]
): void {
  for (const audit of workerAudits) {
    if (audit.lineCount > 0 && audit.summary.attempted_count === 0 && audit.malformedLineCount === 0) {
      findings.push({
        code: 'worker_audit_jsonl_unrecognized',
        verdict: 'unknown',
        message: 'Worker audit JSONL has entries, but none match the provider Linear audit contract.',
        source_path: audit.path,
        source_field: null
      });
    }
    if (audit.summary.failure_count > 0 && audit.summary.success_count === 0) {
      findings.push({
        code: 'worker_audit_all_failed',
        verdict: 'degraded',
        message: 'Worker audit JSONL records only failed Linear helper operations.',
        source_path: audit.path,
        source_field: 'ok'
      });
    }
    if (
      audit.summary.parallelization_entries.some((entry) => entry.ok) &&
      readProviderLinearParallelizationSnapshots(audit.summary).length === 0
    ) {
      findings.push({
        code: 'worker_audit_parallelization_unusable',
        verdict: 'degraded',
        message: 'Worker audit JSONL has successful parallelization entries that cannot be normalized.',
        source_path: audit.path,
        source_field: 'parallelization'
      });
    }
  }
}

function selectPollingHealthArtifact(input: {
  explicit: JsonArtifact[];
  intakeState: JsonArtifact | null;
  statusDataset: JsonArtifact | null;
}): JsonArtifact | null {
  return (
    selectLatestJsonArtifact(input.explicit) ??
    nestedJsonArtifact(input.intakeState, 'polling') ??
    nestedJsonArtifact(input.statusDataset, 'polling')
  );
}

function selectLinearBudgetArtifact(input: {
  explicit: JsonArtifact[];
  pollingHealth: JsonArtifact | null;
  statusDataset: JsonArtifact | null;
  proofs: ProofArtifact[];
}): JsonArtifact | null {
  const proofBudgets = input.proofs.flatMap((proof) => {
    const artifact = nestedJsonArtifact({ path: proof.path, value: proof.value }, 'linear_budget');
    return artifact ? [artifact] : [];
  });
  return (
    selectLatestJsonArtifact(input.explicit) ??
    nestedJsonArtifact(input.pollingHealth, 'linear_budget') ??
    selectStatusDatasetLinearBudgetArtifact(input.statusDataset) ??
    selectLatestJsonArtifact(proofBudgets)
  );
}

function selectStatusDatasetLinearBudgetArtifact(statusDataset: JsonArtifact | null): JsonArtifact | null {
  const combinedLinearBudget = nestedJsonArtifact(statusDataset, 'rate_limits.linear_budget');
  if (combinedLinearBudget) {
    return combinedLinearBudget;
  }
  const pollingLinearBudget = nestedJsonArtifact(statusDataset, 'polling.linear_budget');
  if (pollingLinearBudget) {
    return pollingLinearBudget;
  }
  const rateLimits = nestedJsonArtifact(statusDataset, 'rate_limits');
  if (looksLikeLinearBudget(rateLimits?.value)) {
    return rateLimits;
  }
  return null;
}

function findManifestForProof(proof: ProofArtifact, manifests: ManifestArtifact[]): ManifestArtifact | null {
  const proofRunId = normalizeOptionalString(proof.value.run_id);
  if (proofRunId) {
    const runMatches = manifests.filter((manifest) => normalizeOptionalString(manifest.value.run_id) === proofRunId);
    const directoryMatches = runMatches.filter((manifest) => manifest.runDir === proof.runDir);
    return selectLatestManifestArtifact(directoryMatches) ?? selectLatestManifestArtifact(runMatches);
  }
  return selectLatestManifestArtifact(manifests.filter((manifest) => manifest.runDir === proof.runDir));
}

function findLatestManifestForRunId(manifests: ManifestArtifact[], runId: string): ManifestArtifact | null {
  return selectLatestManifestArtifact(
    manifests.filter((manifest) => normalizeOptionalString(manifest.value.run_id) === runId)
  );
}

function resolveProofRunId(proof: ProofArtifact): string | null {
  return normalizeOptionalString(proof.manifest?.value.run_id) ?? normalizeOptionalString(proof.value.run_id);
}

function collectClaims(intakeState: JsonArtifact | null): Record<string, unknown>[] {
  const value = asRecord(intakeState?.value);
  return collectArrayRecords(value?.claims);
}

function isActiveClaim(claim: Record<string, unknown>): boolean {
  return ACTIVE_CLAIM_STATES.has(readState(claim)) && !isTerminalProviderIntakeGaugeClaim(claim);
}

function isActiveOrRetryQueuedClaim(claim: Record<string, unknown>): boolean {
  return (
    (isActiveClaim(claim) || claim.retry_queued === true) &&
    !isTerminalProviderIntakeGaugeClaim(claim)
  );
}

function isQueuedClaim(claim: Record<string, unknown>): boolean {
  return QUEUED_CLAIM_STATES.has(readState(claim)) && !isTerminalProviderIntakeGaugeClaim(claim);
}

function isTerminalProviderIntakeGaugeClaim(claim: Record<string, unknown>): boolean {
  return isTerminalProviderIntakeIssueState({
    issue_state: normalizeOptionalString(claim.issue_state),
    issue_state_type: normalizeOptionalString(claim.issue_state_type),
    issue_archived_at: normalizeOptionalString(claim.issue_archived_at),
    issue_trashed: claim.issue_trashed === true
  });
}

function collectStatusRetrying(statusDataset: JsonArtifact | null): Record<string, unknown>[] {
  const value = asRecord(statusDataset?.value);
  return collectArrayRecords(value?.retrying);
}

function isActiveProof(proof: ProofArtifact): boolean {
  if (isTerminalProof(proof)) {
    return false;
  }
  const manifestStatus = normalizeOptionalString(proof.manifest?.value.status)?.toLowerCase() ?? null;
  if (manifestStatus && TERMINAL_MANIFEST_STATUSES.has(manifestStatus)) {
    return false;
  }
  return true;
}

function isTerminalProof(proof: ProofArtifact): boolean {
  const manifestStatus = normalizeOptionalString(proof.manifest?.value.status)?.toLowerCase() ?? null;
  if (manifestStatus && TERMINAL_MANIFEST_STATUSES.has(manifestStatus)) {
    return true;
  }
  const ownerPhase = normalizeOptionalString(proof.value.owner_phase);
  const ownerStatus = normalizeOptionalString(proof.value.owner_status);
  return ownerPhase === 'ended' && (ownerStatus === 'succeeded' || ownerStatus === 'failed');
}

function firstHeartbeatTimestampMs(proof: ProofArtifact): number | null {
  return earliestTimestampMs(
    timestampMs(proof.value.first_heartbeat_at),
    timestampMs(proof.value.firstHeartbeatAt),
    timestampMs(proof.value.first_activity_at),
    timestampMs(proof.value.firstActivityAt),
    timestampMs(proof.value.first_event_at),
    timestampMs(proof.value.firstEventAt),
    timestampMs(proof.manifest?.value.first_heartbeat_at),
    timestampMs(proof.manifest?.value.firstHeartbeatAt),
    timestampMs(proof.manifest?.value.first_activity_at),
    timestampMs(proof.manifest?.value.firstActivityAt)
  );
}

function isActiveChildLane(lane: Record<string, unknown>, nowMs: number): boolean {
  if (lane.in_flight_action) {
    const startedAt = timestampMs(lane.in_flight_started_at);
    return startedAt !== null && nowMs - startedAt < PROVIDER_LINEAR_CHILD_LANE_IN_FLIGHT_STALE_MS;
  }
  const decision = normalizeOptionalString(lane.decision);
  return decision === 'pending';
}

function childLaneParentKey(proof: ProofArtifact): string {
  return (
    normalizeOptionalString(proof.value.parent_run_id) ??
    normalizeOptionalString(proof.value.parentRunId) ??
    normalizeOptionalString(proof.value.run_id) ??
    normalizeOptionalString(proof.manifest?.value.parent_run_id) ??
    normalizeOptionalString(proof.manifest?.value.run_id) ??
    proof.runDir
  );
}

function readState(record: Record<string, unknown>): string {
  return normalizeOptionalString(record.state)?.toLowerCase() ?? 'unknown';
}

function selectLatestJsonArtifact(artifacts: JsonArtifact[]): JsonArtifact | null {
  if (artifacts.length === 0) {
    return null;
  }
  return [...artifacts].sort(compareJsonArtifactsByFreshness).at(-1) ?? null;
}

function selectLatestManifestArtifact(manifests: ManifestArtifact[]): ManifestArtifact | null {
  return [...manifests].sort(compareJsonArtifactsByFreshness).at(-1) ?? null;
}

function compareJsonArtifactsByFreshness(left: JsonArtifact, right: JsonArtifact): number {
  const leftTs = artifactTimestampMs(left) ?? Number.NEGATIVE_INFINITY;
  const rightTs = artifactTimestampMs(right) ?? Number.NEGATIVE_INFINITY;
  if (leftTs !== rightTs) {
    return leftTs - rightTs;
  }
  return left.path.localeCompare(right.path);
}

function artifactTimestampMs(artifact: JsonArtifact): number | null {
  const value = asRecord(artifact.value);
  return latestTimestampMs(
    timestampMs(value?.updated_at),
    timestampMs(value?.generated_at),
    timestampMs(value?.observed_at),
    timestampMs(value?.recorded_at),
    timestampMs(value?.last_success_at),
    timestampMs(value?.lastSuccessAt),
    timestampMs(value?.last_completed_at),
    timestampMs(value?.lastCompletedAt)
  );
}

function nestedJsonArtifact(artifact: JsonArtifact | null, fieldPath: string): JsonArtifact | null {
  if (!artifact) {
    return null;
  }
  const value = readPath(artifact.value, fieldPath);
  return value && typeof value === 'object' ? { path: artifact.path, value } : null;
}

interface TimestampCandidate {
  timestampMs: number;
  path: string | null;
  field: string | null;
}

function timestampCandidate(artifact: JsonArtifact | null, fieldPath: string): TimestampCandidate | null {
  const timestamp = timestampMs(readPath(artifact?.value, fieldPath));
  return timestamp === null ? null : { timestampMs: timestamp, path: artifact?.path ?? null, field: fieldPath };
}

function selectLatestTimestampCandidate(candidates: TimestampCandidate[]): TimestampCandidate | null {
  return candidates.length === 0
    ? null
    : candidates.reduce((winner, candidate) =>
        candidate.timestampMs > winner.timestampMs ? candidate : winner
      );
}

function metric<T>(
  value: T | null,
  unit: string | null,
  verdict: ProviderControlHostFreshnessVerdict,
  sourcePath: string | null,
  sourceField: string | null,
  reason: string | null
): ProviderControlHostFreshnessGaugeMetric<T> {
  return {
    value,
    unit,
    verdict,
    source_path: sourcePath,
    source_field: sourceField,
    reason
  };
}

function buildUnknownVerdictMetric(): ProviderControlHostFreshnessGaugeMetric<ProviderControlHostFreshnessVerdict> {
  return metric<ProviderControlHostFreshnessVerdict>(null, null, 'unknown', null, null, 'verdict not evaluated yet');
}

function resolveOverallVerdict(findings: ProviderControlHostFreshnessGaugeFinding[]): ProviderControlHostFreshnessVerdict {
  if (findings.some((finding) => finding.verdict === 'contradictory')) {
    return 'contradictory';
  }
  if (findings.some((finding) => finding.verdict === 'stale')) {
    return 'stale';
  }
  if (findings.some((finding) => finding.verdict === 'degraded')) {
    return 'degraded';
  }
  if (findings.some((finding) => finding.verdict === 'unknown')) {
    return 'unknown';
  }
  return 'healthy';
}

function firstStaleSourcePath(findings: ProviderControlHostFreshnessGaugeFinding[]): string | null {
  return findings.find((finding) => finding.verdict === 'contradictory' || finding.verdict === 'stale')?.source_path ?? null;
}

function normalizeThresholds(
  input: Partial<ProviderControlHostFreshnessGaugeThresholds> | undefined
): ProviderControlHostFreshnessGaugeThresholds {
  return {
    ...DEFAULT_THRESHOLDS,
    ...Object.fromEntries(
      Object.entries(input ?? {}).flatMap(([key, value]) =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0 ? [[key, value]] : []
      )
    )
  };
}

function normalizePathList(paths: string[] | undefined): string[] {
  return Array.isArray(paths) ? paths.map((path) => resolve(path)) : [];
}

function appendUnique(target: string[], values: string[]): void {
  const seen = new Set(target);
  for (const value of values) {
    if (!seen.has(value)) {
      target.push(value);
      seen.add(value);
    }
  }
}

function normalizeNowMs(value: string | number | Date | null | undefined): number {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    if (!Number.isFinite(timestamp)) {
      throw new Error(`Invalid now value: ${String(value)}.`);
    }
    return timestamp;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid now value: ${String(value)}.`);
    }
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid now value: ${value}.`);
    }
    return parsed;
  }
  return Date.now();
}

function timestampMs(value: unknown): number | null {
  const string = normalizeOptionalString(value);
  if (!string) {
    return null;
  }
  const parsed = Date.parse(string);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstTimestampMs(record: unknown, field: string): number | null {
  return timestampMs(asRecord(record)?.[field]);
}

function latestTimestampMs(...values: (number | null | undefined)[]): number | null {
  const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return finite.length === 0 ? null : Math.max(...finite);
}

function earliestTimestampMs(...values: (number | null | undefined)[]): number | null {
  const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return finite.length === 0 ? null : Math.min(...finite);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function collectArrayRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => asRecord(entry) !== null)
    : [];
}

function hasCoreFreshnessSources(sources: ProviderControlHostFreshnessGaugeSources): boolean {
  return [
    sources.provider_intake_state,
    sources.provider_proofs,
    sources.status_datasets,
    sources.polling_health
  ].some((entries) => entries.length > 0);
}

function firstAuxiliarySourcePath(sources: ProviderControlHostFreshnessGaugeSources): string | null {
  return sources.provider_manifests[0] ?? sources.worker_audit_jsonl[0] ?? sources.linear_budget_state[0] ?? null;
}

function readPath(value: unknown, fieldPath: string): unknown {
  return fieldPath.split('.').reduce<unknown>((current, key) => asRecord(current)?.[key], value);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function formatProviderControlHostFreshnessGaugeText(
  report: ProviderControlHostFreshnessGaugeReport
): string {
  const root = report.sources.artifact_root ?? 'explicit paths';
  const lines = [
    `Provider/control-host freshness gauge: ${report.verdict}`,
    `Generated: ${report.generated_at}`,
    `Artifact root: ${root}`
  ];
  for (const finding of report.findings) {
    const path = finding.source_path ? ` (${relativeOrOriginal(process.cwd(), finding.source_path)})` : '';
    lines.push(`- ${finding.verdict}: ${finding.code}${path} - ${finding.message}`);
  }
  return lines.join('\n');
}

function relativeOrOriginal(from: string, path: string): string {
  const relativePath = relative(from, path);
  return relativePath && !relativePath.startsWith('..') ? relativePath : path;
}

export async function assertProviderControlHostFreshnessArtifactRoot(path: string): Promise<void> {
  const resolvedPath = resolve(path);
  let stats;
  try {
    stats = await stat(resolvedPath);
  } catch {
    throw new Error(`Artifact root does not exist: ${path}`);
  }
  if (!stats.isDirectory()) {
    throw new Error(`Artifact root must be a directory: ${path}`);
  }
}
