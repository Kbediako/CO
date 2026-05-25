import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import type { RunPaths } from '../run/runPaths.js';
import { writeJsonAtomic } from '../utils/fs.js';
import {
  inspectSourceRootFreshness,
  normalizeSourceRootFreshnessInspection,
  refreshSourceRootFreshnessInspection,
  type SourceRootFreshnessInspection
} from '../utils/sourceRootFreshness.js';
import { isoTimestamp } from '../utils/time.js';
import {
  CONTROL_HOST_DUPLICATE_OWNER_FILE,
  CONTROL_HOST_OWNER_FILE,
  CONTROL_HOST_OWNER_LOCK_DIR,
  CONTROL_HOST_STALE_OWNER_FILE
} from './controlPersistenceFiles.js';

export type ControlHostOwnershipDiagnosticReason =
  | 'duplicate_control_host_owner'
  | 'ambiguous_control_host_owner'
  | 'stale_control_host_owner';

export interface ControlHostOwnerMetadata {
  schema_version: 1;
  status: 'owned' | 'released';
  owner_token: string;
  acquired_at: string;
  updated_at: string;
  released_at: string | null;
  repo_root: string | null;
  task_id: string | null;
  run_id: string;
  run_dir: string;
  pipeline_id: string | null;
  pid: number;
  ppid: number | null;
  hostname: string;
  cwd: string | null;
  argv: string[];
  source_root_freshness: SourceRootFreshnessInspection | null;
  lock_dir: string;
  lock_owner_path: string;
  owner_path: string;
}

export interface ControlHostOwnerSummary {
  owner_token: string;
  status: ControlHostOwnerMetadata['status'];
  pid: number;
  ppid: number | null;
  hostname: string;
  acquired_at: string;
  updated_at: string;
  released_at: string | null;
  repo_root: string | null;
  task_id: string | null;
  run_id: string;
  run_dir: string;
  pipeline_id: string | null;
  source_root_freshness: SourceRootFreshnessInspection | null;
  lock_dir: string;
  owner_path: string;
}

export interface ControlHostOwnershipDiagnostic {
  schema_version: 1;
  reason: ControlHostOwnershipDiagnosticReason;
  observed_at: string;
  run_dir: string;
  lock_dir: string;
  diagnostic_path: string;
  existing_owner: ControlHostOwnerMetadata | null;
  attempted_owner: ControlHostOwnerMetadata;
  action:
    | 'duplicate_rejected'
    | 'ambiguous_rejected'
    | 'stale_reclaimed';
}

export interface ControlHostOwnershipPollingPayload {
  status:
    | 'owned'
    | 'duplicate_rejected'
    | 'ambiguous_rejected'
    | 'stale_reclaimed';
  reason: ControlHostOwnershipDiagnosticReason | null;
  updated_at: string;
  owner: ControlHostOwnerSummary | null;
  attempted_owner?: ControlHostOwnerSummary | null;
  diagnostic_path: string | null;
  lock_dir: string | null;
  owner_path: string | null;
}

export type ControlHostSourceFreshnessAction = 'restart' | 'fail_closed';

export type ControlHostSourceFreshnessPolicyReason =
  | 'stale_supervised_source_root'
  | 'unsafe_stale_supervised_source_root'
  | 'stale_generated_runtime'
  | 'stale_source_root_freshness_snapshot';

export interface ControlHostSourceFreshnessPolicy {
  action: ControlHostSourceFreshnessAction;
  reason: ControlHostSourceFreshnessPolicyReason;
  updated_at: string | null;
  status: SourceRootFreshnessInspection['status'];
  source_checkout_status: string | null;
  intended_checkout_status: string | null;
  drift_classes: SourceRootFreshnessInspection['drift_classes'];
  detail: string;
}

export interface ControlHostOwnershipHandle {
  metadata: ControlHostOwnerMetadata;
  polling: ControlHostOwnershipPollingPayload;
  release(): Promise<void>;
}

export interface AcquireControlHostOwnershipOptions {
  paths: Pick<RunPaths, 'runDir'>;
  runId: string;
  repoRoot?: string | null;
  taskId?: string | null;
  pipelineId?: string | null;
  processId?: number;
  parentProcessId?: number | null;
  cwd?: string | null;
  argv?: string[];
  commandPath?: string | null;
  packageRoot?: string | null;
  host?: string;
  now?: () => string;
  isProcessAlive?: (pid: number) => boolean;
}

interface ControlHostOwnershipPaths {
  runDir: string;
  lockDir: string;
  reclaimLockDir: string;
  lockOwnerPath: string;
  ownerPath: string;
  duplicateDiagnosticPath: string;
  staleDiagnosticPath: string;
}

type ExistingOwnerState =
  | { kind: 'active'; owner: ControlHostOwnerMetadata }
  | { kind: 'stale'; owner: ControlHostOwnerMetadata }
  | { kind: 'ambiguous'; owner: ControlHostOwnerMetadata | null };

export class DuplicateControlHostOwnerError extends Error {
  readonly code = 'duplicate_control_host_owner';
  readonly reason: ControlHostOwnershipDiagnosticReason;
  readonly existingOwner: ControlHostOwnerMetadata | null;
  readonly attemptedOwner: ControlHostOwnerMetadata;
  readonly diagnosticPath: string;

  constructor(input: {
    reason: ControlHostOwnershipDiagnosticReason;
    existingOwner: ControlHostOwnerMetadata | null;
    attemptedOwner: ControlHostOwnerMetadata;
    diagnosticPath: string;
  }) {
    super(
      formatDuplicateControlHostOwnerMessage(
        input.reason,
        input.existingOwner,
        input.attemptedOwner,
        input.diagnosticPath
      )
    );
    this.name = 'DuplicateControlHostOwnerError';
    this.reason = input.reason;
    this.existingOwner = input.existingOwner;
    this.attemptedOwner = input.attemptedOwner;
    this.diagnosticPath = input.diagnosticPath;
  }
}

export async function acquireControlHostOwnership(
  options: AcquireControlHostOwnershipOptions
): Promise<ControlHostOwnershipHandle> {
  const paths = resolveControlHostOwnershipPaths(options.paths.runDir);
  const now = options.now ?? isoTimestamp;
  const isProcessAlive = options.isProcessAlive ?? isLocalProcessAlive;
  const attemptedOwner = buildControlHostOwnerMetadata(options, paths, now());

  await mkdir(paths.runDir, { recursive: true });
  await removePriorOwnershipDiagnostics(paths).catch(() => undefined);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await mkdir(paths.lockDir);
      try {
        await writeJsonAtomic(paths.lockOwnerPath, attemptedOwner);
        await writeJsonAtomic(paths.ownerPath, attemptedOwner);
      } catch (error) {
        await rm(paths.lockDir, { recursive: true, force: true }).catch(() => undefined);
        throw error;
      }
      return createControlHostOwnershipHandle(attemptedOwner, paths, now);
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
      const existingOwner = await readControlHostOwnerMetadataFromPath(paths.lockOwnerPath);
      const existingState = classifyExistingOwner(existingOwner, {
        host: attemptedOwner.hostname,
        isProcessAlive
      });
      if (existingState.kind === 'stale') {
        await reclaimStaleControlHostOwner({
          paths,
          attemptedOwner,
          staleOwner: existingState.owner,
          observedAt: now,
          isProcessAlive
        });
        continue;
      }
      const reason: ControlHostOwnershipDiagnosticReason =
        existingState.kind === 'active'
          ? 'duplicate_control_host_owner'
          : 'ambiguous_control_host_owner';
      await writeControlHostOwnershipDiagnostic({
        paths,
        reason,
        action:
          reason === 'duplicate_control_host_owner'
            ? 'duplicate_rejected'
            : 'ambiguous_rejected',
        existingOwner: existingState.owner,
        attemptedOwner,
        observedAt: now(),
        diagnosticPath: paths.duplicateDiagnosticPath
      });
      throw new DuplicateControlHostOwnerError({
        reason,
        existingOwner: existingState.owner,
        attemptedOwner,
        diagnosticPath: paths.duplicateDiagnosticPath
      });
    }
  }

  throw new DuplicateControlHostOwnerError({
    reason: 'ambiguous_control_host_owner',
    existingOwner: await readControlHostOwnerMetadataFromPath(paths.lockOwnerPath),
    attemptedOwner,
    diagnosticPath: paths.duplicateDiagnosticPath
  });
}

export async function readControlHostOwnerMetadata(
  runDir: string
): Promise<ControlHostOwnerMetadata | null> {
  return await readControlHostOwnerMetadataFromPath(
    join(runDir, CONTROL_HOST_OWNER_FILE)
  );
}

export function buildControlHostOwnershipPollingPayload(
  metadata: ControlHostOwnerMetadata
): ControlHostOwnershipPollingPayload {
  return {
    status: 'owned',
    reason: null,
    updated_at: metadata.updated_at,
    owner: summarizeControlHostOwner(metadata),
    diagnostic_path: null,
    lock_dir: metadata.lock_dir,
    owner_path: metadata.owner_path
  };
}

export function refreshControlHostOwnershipPollingPayload(
  payload: ControlHostOwnershipPollingPayload | null
): ControlHostOwnershipPollingPayload | null {
  if (!payload) {
    return null;
  }
  const attemptedOwner =
    payload.attempted_owner === undefined
      ? undefined
      : refreshControlHostOwnerSummary(payload.attempted_owner);
  return {
    ...payload,
    owner: refreshControlHostOwnerSummary(payload.owner),
    ...(attemptedOwner !== undefined ? { attempted_owner: attemptedOwner } : {})
  };
}

export function resolveControlHostSourceFreshnessPolicyFromPolling(
  value: unknown,
  options: { refresh?: boolean } = {}
): ControlHostSourceFreshnessPolicy | null {
  const normalized = normalizeControlHostOwnershipPollingPayload(value);
  if (options.refresh !== true) {
    return resolveControlHostSourceFreshnessPolicy(normalized);
  }
  const refreshed = refreshControlHostOwnershipPollingPayload(normalized);
  const refreshedPolicy = resolveControlHostSourceFreshnessPolicy(refreshed);
  if (refreshedPolicy || isAuthoritativeControlHostSourceFreshness(refreshed)) {
    return refreshedPolicy;
  }
  return resolveControlHostSourceFreshnessPolicy(
    normalized
  );
}

export function resolveControlHostSourceFreshnessPolicy(
  payload: ControlHostOwnershipPollingPayload | null
): ControlHostSourceFreshnessPolicy | null {
  const freshness = resolveControlHostAuthoritativeSourceFreshness(payload);
  if (
    !payload ||
    !freshness ||
    freshness.status === 'current'
  ) {
    return null;
  }
  const updatedAt =
    payload.status === 'owned'
      ? payload.updated_at || freshness.observed_at || null
      : freshness.observed_at || payload.updated_at || null;
  if (freshness.drift_classes.includes('source_vs_dist_drift')) {
    return {
      action: 'fail_closed',
      reason: 'stale_generated_runtime',
      updated_at: updatedAt,
      status: freshness.status,
      source_checkout_status: freshness.source_checkout?.status ?? null,
      intended_checkout_status: freshness.intended_checkout?.status ?? null,
      drift_classes: freshness.drift_classes,
      detail:
        `Supervised control-host runtime is using generated dist while a source entrypoint exists (${freshness.detail || freshness.entrypoint_kind}); provider-intake must fail closed until supervision uses the source-first bootstrap entrypoint.`
    };
  }
  if (!freshness.drift_classes.includes('supervised_source_root_drift')) {
    return null;
  }
  const restartSafe = isRestartSafeStaleSupervisedSourceRoot(freshness);
  const sourceStatus = freshness.source_checkout?.status ?? null;
  const intendedStatus = freshness.intended_checkout?.status ?? null;
  const action: ControlHostSourceFreshnessAction = restartSafe ? 'restart' : 'fail_closed';
  return {
    action,
    reason: restartSafe
      ? 'stale_supervised_source_root'
      : 'unsafe_stale_supervised_source_root',
    updated_at: updatedAt,
    status: freshness.status,
    source_checkout_status: sourceStatus,
    intended_checkout_status: intendedStatus,
    drift_classes: freshness.drift_classes,
    detail:
      action === 'restart'
        ? `Supervised control-host source root is stale relative to origin/main (${freshness.detail || sourceStatus || freshness.status}); restart is bounded because the intended checkout is current and clean.`
        : `Supervised control-host source freshness is ${freshness.status} (${freshness.detail || sourceStatus || 'unknown'}); provider-intake must fail closed until the checkout is safe to restart or the source signal returns current.`
  };
}

export function isControlHostOwnershipFreshnessAtLeastAsRecent(
  candidate: ControlHostOwnershipPollingPayload | null,
  baseline: ControlHostOwnershipPollingPayload | null,
  options: {
    candidateSnapshotUpdatedAt?: string | null;
    baselineSnapshotUpdatedAt?: string | null;
  } = {}
): boolean {
  const baselineTimestamp = resolveControlHostOwnershipFreshnessTimestamp(
    baseline,
    options.baselineSnapshotUpdatedAt
  );
  if (baselineTimestamp === null) {
    return true;
  }
  const candidateTimestamp = resolveControlHostOwnershipFreshnessTimestamp(
    candidate,
    options.candidateSnapshotUpdatedAt
  );
  return candidateTimestamp !== null && candidateTimestamp >= baselineTimestamp;
}

function resolveControlHostOwnershipFreshnessTimestamp(
  payload: ControlHostOwnershipPollingPayload | null,
  snapshotUpdatedAt?: string | null
): number | null {
  return maxTimestamp(
    snapshotUpdatedAt,
    payload?.updated_at,
    payload?.owner?.updated_at,
    payload?.attempted_owner?.updated_at,
    payload?.owner?.source_root_freshness?.observed_at,
    payload?.attempted_owner?.source_root_freshness?.observed_at
  );
}

export function resolveControlHostSourceFreshnessSnapshotStalenessPolicy(
  payload: ControlHostOwnershipPollingPayload | null,
  sourceEvidenceUpdatedAt: string | null | undefined
): ControlHostSourceFreshnessPolicy | null {
  const freshness = resolveControlHostAuthoritativeSourceFreshness(payload);
  if (!freshness || freshness.status !== 'current') {
    return null;
  }
  if (
    isControlHostOwnershipFreshnessAtLeastAsRecent(payload, null, {
      baselineSnapshotUpdatedAt: sourceEvidenceUpdatedAt ?? null
    })
  ) {
    return null;
  }
  return {
    action: 'fail_closed',
    reason: 'stale_source_root_freshness_snapshot',
    updated_at: sourceEvidenceUpdatedAt ?? null,
    status: freshness.status,
    source_checkout_status: freshness.source_checkout?.status ?? null,
    intended_checkout_status: freshness.intended_checkout?.status ?? null,
    drift_classes: freshness.drift_classes,
    detail:
      `Control-host source-root freshness was observed before the latest provider source evidence (${sourceEvidenceUpdatedAt ?? 'unknown'}); provider-intake must fail closed until the source-root freshness collector records a current snapshot.`
  };
}

export function resolveControlHostAuthoritativeSourceFreshness(
  payload: ControlHostOwnershipPollingPayload | null
): SourceRootFreshnessInspection | null {
  if (!payload) {
    return null;
  }
  if (payload.status === 'stale_reclaimed') {
    return (
      payload.attempted_owner?.source_root_freshness ??
      payload.owner?.source_root_freshness ??
      null
    );
  }
  return payload.owner?.source_root_freshness ?? null;
}

function isAuthoritativeControlHostSourceFreshness(
  payload: ControlHostOwnershipPollingPayload | null
): boolean {
  const freshness = resolveControlHostAuthoritativeSourceFreshness(payload);
  return freshness?.status === 'current' || freshness?.status === 'warning';
}

function maxTimestamp(...values: Array<string | null | undefined>): number | null {
  let latest: number | null = null;
  for (const value of values) {
    const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
    if (!Number.isFinite(parsed)) {
      continue;
    }
    latest = latest === null ? parsed : Math.max(latest, parsed);
  }
  return latest;
}

function isRestartSafeStaleSupervisedSourceRoot(
  freshness: SourceRootFreshnessInspection
): boolean {
  const sourceCheckout = freshness.source_checkout;
  const intendedCheckout = freshness.intended_checkout;
  return (
    freshness.status === 'warning' &&
    freshness.drift_classes.includes('supervised_source_root_drift') &&
    sourceCheckout?.status === 'stale' &&
    sourceCheckout.dirty.status === 'clean' &&
    intendedCheckout?.status === 'current' &&
    intendedCheckout.dirty.status === 'clean'
  );
}

export async function readControlHostOwnershipDiagnosticSummary(
  runDir: string
): Promise<ControlHostOwnershipPollingPayload | null> {
  const duplicate = await readControlHostOwnershipDiagnosticFromPath(
    join(runDir, CONTROL_HOST_DUPLICATE_OWNER_FILE)
  );
  if (duplicate) {
    return buildControlHostOwnershipPollingPayloadFromDiagnostic(duplicate);
  }
  const stale = await readControlHostOwnershipDiagnosticFromPath(
    join(runDir, CONTROL_HOST_STALE_OWNER_FILE)
  );
  if (stale) {
    return buildControlHostOwnershipPollingPayloadFromDiagnostic(stale);
  }
  return null;
}

export async function readControlHostOwnershipOperatorHint(
  runDir: string
): Promise<string | null> {
  const diagnostic = await readControlHostOwnershipDiagnosticSummary(runDir);
  if (!diagnostic || diagnostic.status === 'owned') {
    return null;
  }
  const owner = diagnostic.owner;
  const attempted = diagnostic.attempted_owner ?? null;
  const ownerText = owner
    ? `owner pid=${owner.pid} host=${owner.hostname} task=${owner.task_id ?? 'unknown'} run=${owner.run_id} pipeline=${owner.pipeline_id ?? 'unknown'}`
    : 'owner metadata unavailable';
  const attemptedText = attempted
    ? `attempted pid=${attempted.pid} host=${attempted.hostname}`
    : 'attempted owner unavailable';
  return `control-host ownership diagnostic: ${diagnostic.reason ?? diagnostic.status}; ${ownerText}; ${attemptedText}; artifact=${diagnostic.diagnostic_path ?? 'unknown'}`;
}

export function normalizeControlHostOwnershipPollingPayload(
  value: unknown
): ControlHostOwnershipPollingPayload | null {
  if (!isRecordLike(value)) {
    return null;
  }
  const status = normalizePollingStatus(value.status);
  if (!status) {
    return null;
  }
  return {
    status,
    reason: normalizeDiagnosticReason(value.reason),
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : '',
    owner: normalizeControlHostOwnerSummary(value.owner),
    attempted_owner: normalizeControlHostOwnerSummary(value.attempted_owner),
    diagnostic_path: typeof value.diagnostic_path === 'string' ? value.diagnostic_path : null,
    lock_dir: typeof value.lock_dir === 'string' ? value.lock_dir : null,
    owner_path: typeof value.owner_path === 'string' ? value.owner_path : null
  };
}

function createControlHostOwnershipHandle(
  metadata: ControlHostOwnerMetadata,
  paths: ControlHostOwnershipPaths,
  now: () => string
): ControlHostOwnershipHandle {
  return {
    metadata,
    polling: buildControlHostOwnershipPollingPayload(metadata),
    async release(): Promise<void> {
      const currentOwner = await readControlHostOwnerMetadataFromPath(paths.lockOwnerPath);
      if (!currentOwner || currentOwner.owner_token !== metadata.owner_token) {
        return;
      }
      const releasedAt = now();
      const releasedOwner: ControlHostOwnerMetadata = {
        ...metadata,
        status: 'released',
        updated_at: releasedAt,
        released_at: releasedAt
      };
      await writeJsonAtomic(paths.ownerPath, releasedOwner);
      await rm(paths.lockDir, { recursive: true, force: true });
    }
  };
}

function buildControlHostOwnerMetadata(
  options: AcquireControlHostOwnershipOptions,
  paths: ControlHostOwnershipPaths,
  timestamp: string
): ControlHostOwnerMetadata {
  const repoRoot = normalizeNullableString(options.repoRoot);
  const cwd = options.cwd === undefined ? process.cwd() : options.cwd;
  const argv = options.argv ?? process.argv.slice();
  return {
    schema_version: 1,
    status: 'owned',
    owner_token: randomUUID(),
    acquired_at: timestamp,
    updated_at: timestamp,
    released_at: null,
    repo_root: repoRoot,
    task_id: normalizeNullableString(options.taskId),
    run_id: options.runId,
    run_dir: paths.runDir,
    pipeline_id: normalizeNullableString(options.pipelineId),
    pid: options.processId ?? process.pid,
    ppid: options.parentProcessId === undefined ? process.ppid : options.parentProcessId,
    hostname: options.host ?? hostname(),
    cwd,
    argv,
    source_root_freshness: inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      argv,
      commandPath: normalizeNullableString(options.commandPath),
      cwd,
      packageRoot: normalizeNullableString(options.packageRoot),
      now: () => timestamp
    }),
    lock_dir: paths.lockDir,
    lock_owner_path: paths.lockOwnerPath,
    owner_path: paths.ownerPath
  };
}

function resolveControlHostOwnershipPaths(runDir: string): ControlHostOwnershipPaths {
  return {
    runDir,
    lockDir: join(runDir, CONTROL_HOST_OWNER_LOCK_DIR),
    reclaimLockDir: join(runDir, `${CONTROL_HOST_OWNER_LOCK_DIR}.reclaim`),
    lockOwnerPath: join(runDir, CONTROL_HOST_OWNER_LOCK_DIR, 'owner.json'),
    ownerPath: join(runDir, CONTROL_HOST_OWNER_FILE),
    duplicateDiagnosticPath: join(runDir, CONTROL_HOST_DUPLICATE_OWNER_FILE),
    staleDiagnosticPath: join(runDir, CONTROL_HOST_STALE_OWNER_FILE)
  };
}

async function reclaimStaleControlHostOwner(input: {
  paths: ControlHostOwnershipPaths;
  staleOwner: ControlHostOwnerMetadata;
  attemptedOwner: ControlHostOwnerMetadata;
  observedAt: () => string;
  isProcessAlive: (pid: number) => boolean;
}): Promise<boolean> {
  try {
    await mkdir(input.paths.reclaimLockDir);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      return false;
    }
    throw error;
  }

  try {
    const currentOwner = await readControlHostOwnerMetadataFromPath(input.paths.lockOwnerPath);
    if (!currentOwner || currentOwner.owner_token !== input.staleOwner.owner_token) {
      return false;
    }
    const currentState = classifyExistingOwner(currentOwner, {
      host: input.attemptedOwner.hostname,
      isProcessAlive: input.isProcessAlive
    });
    if (currentState.kind !== 'stale') {
      return false;
    }
    await writeControlHostOwnershipDiagnostic({
      paths: input.paths,
      reason: 'stale_control_host_owner',
      action: 'stale_reclaimed',
      existingOwner: currentOwner,
      attemptedOwner: input.attemptedOwner,
      observedAt: input.observedAt(),
      diagnosticPath: input.paths.staleDiagnosticPath
    });
    await rm(input.paths.lockDir, { recursive: true, force: true });
    return true;
  } finally {
    await rm(input.paths.reclaimLockDir, { recursive: true, force: true }).catch(
      () => undefined
    );
  }
}

async function writeControlHostOwnershipDiagnostic(input: {
  paths: ControlHostOwnershipPaths;
  reason: ControlHostOwnershipDiagnosticReason;
  action: ControlHostOwnershipDiagnostic['action'];
  existingOwner: ControlHostOwnerMetadata | null;
  attemptedOwner: ControlHostOwnerMetadata;
  observedAt: string;
  diagnosticPath: string;
}): Promise<ControlHostOwnershipDiagnostic> {
  const diagnostic: ControlHostOwnershipDiagnostic = {
    schema_version: 1,
    reason: input.reason,
    observed_at: input.observedAt,
    run_dir: input.paths.runDir,
    lock_dir: input.paths.lockDir,
    diagnostic_path: input.diagnosticPath,
    existing_owner: input.existingOwner,
    attempted_owner: input.attemptedOwner,
    action: input.action
  };
  await writeJsonAtomic(input.diagnosticPath, diagnostic);
  return diagnostic;
}

async function removePriorOwnershipDiagnostics(paths: ControlHostOwnershipPaths): Promise<void> {
  await Promise.all([
    rm(paths.duplicateDiagnosticPath, { force: true }),
    rm(paths.staleDiagnosticPath, { force: true })
  ]);
}

function classifyExistingOwner(
  owner: ControlHostOwnerMetadata | null,
  input: {
    host: string;
    isProcessAlive: (pid: number) => boolean;
  }
): ExistingOwnerState {
  if (!owner) {
    return { kind: 'ambiguous', owner: null };
  }
  if (!Number.isInteger(owner.pid) || owner.pid <= 0) {
    return { kind: 'ambiguous', owner };
  }
  if (owner.hostname && owner.hostname !== input.host) {
    return { kind: 'active', owner };
  }
  return input.isProcessAlive(owner.pid)
    ? { kind: 'active', owner }
    : { kind: 'stale', owner };
}

function isLocalProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code !== 'ESRCH';
  }
}

async function readControlHostOwnerMetadataFromPath(
  path: string
): Promise<ControlHostOwnerMetadata | null> {
  try {
    return normalizeControlHostOwnerMetadata(JSON.parse(await readFile(path, 'utf8')));
  } catch {
    return null;
  }
}

async function readControlHostOwnershipDiagnosticFromPath(
  path: string
): Promise<ControlHostOwnershipDiagnostic | null> {
  try {
    return normalizeControlHostOwnershipDiagnostic(JSON.parse(await readFile(path, 'utf8')));
  } catch {
    return null;
  }
}

function normalizeControlHostOwnerMetadata(value: unknown): ControlHostOwnerMetadata | null {
  if (!isRecordLike(value)) {
    return null;
  }
  if (value.schema_version !== 1 || (value.status !== 'owned' && value.status !== 'released')) {
    return null;
  }
  if (
    typeof value.owner_token !== 'string' ||
    typeof value.acquired_at !== 'string' ||
    typeof value.updated_at !== 'string' ||
    typeof value.run_id !== 'string' ||
    typeof value.run_dir !== 'string' ||
    typeof value.pid !== 'number' ||
    typeof value.hostname !== 'string' ||
    typeof value.lock_dir !== 'string' ||
    typeof value.lock_owner_path !== 'string' ||
    typeof value.owner_path !== 'string'
  ) {
    return null;
  }
  return {
    schema_version: 1,
    status: value.status,
    owner_token: value.owner_token,
    acquired_at: value.acquired_at,
    updated_at: value.updated_at,
    released_at: typeof value.released_at === 'string' ? value.released_at : null,
    repo_root: typeof value.repo_root === 'string' ? value.repo_root : null,
    task_id: typeof value.task_id === 'string' ? value.task_id : null,
    run_id: value.run_id,
    run_dir: value.run_dir,
    pipeline_id: typeof value.pipeline_id === 'string' ? value.pipeline_id : null,
    pid: value.pid,
    ppid: typeof value.ppid === 'number' ? value.ppid : null,
    hostname: value.hostname,
    cwd: typeof value.cwd === 'string' ? value.cwd : null,
    argv: Array.isArray(value.argv)
      ? value.argv.filter((entry): entry is string => typeof entry === 'string')
      : [],
    source_root_freshness: normalizeSourceRootFreshnessInspection(value.source_root_freshness),
    lock_dir: value.lock_dir,
    lock_owner_path: value.lock_owner_path,
    owner_path: value.owner_path
  };
}

function normalizeControlHostOwnershipDiagnostic(
  value: unknown
): ControlHostOwnershipDiagnostic | null {
  if (!isRecordLike(value) || value.schema_version !== 1) {
    return null;
  }
  const reason = normalizeDiagnosticReason(value.reason);
  if (!reason) {
    return null;
  }
  const attemptedOwner = normalizeControlHostOwnerMetadata(value.attempted_owner);
  if (!attemptedOwner) {
    return null;
  }
  const action =
    value.action === 'duplicate_rejected' ||
    value.action === 'ambiguous_rejected' ||
    value.action === 'stale_reclaimed'
      ? value.action
      : reason === 'stale_control_host_owner'
        ? 'stale_reclaimed'
        : reason === 'duplicate_control_host_owner'
          ? 'duplicate_rejected'
          : 'ambiguous_rejected';
  return {
    schema_version: 1,
    reason,
    observed_at: typeof value.observed_at === 'string' ? value.observed_at : '',
    run_dir: typeof value.run_dir === 'string' ? value.run_dir : attemptedOwner.run_dir,
    lock_dir: typeof value.lock_dir === 'string' ? value.lock_dir : attemptedOwner.lock_dir,
    diagnostic_path:
      typeof value.diagnostic_path === 'string' ? value.diagnostic_path : '',
    existing_owner: normalizeControlHostOwnerMetadata(value.existing_owner),
    attempted_owner: attemptedOwner,
    action
  };
}

function buildControlHostOwnershipPollingPayloadFromDiagnostic(
  diagnostic: ControlHostOwnershipDiagnostic
): ControlHostOwnershipPollingPayload {
  const status =
    diagnostic.action === 'stale_reclaimed'
      ? 'stale_reclaimed'
      : diagnostic.action === 'ambiguous_rejected'
        ? 'ambiguous_rejected'
        : 'duplicate_rejected';
  return {
    status,
    reason: diagnostic.reason,
    updated_at: diagnostic.observed_at,
    owner: diagnostic.existing_owner ? summarizeControlHostOwner(diagnostic.existing_owner) : null,
    attempted_owner: summarizeControlHostOwner(diagnostic.attempted_owner),
    diagnostic_path: diagnostic.diagnostic_path,
    lock_dir: diagnostic.lock_dir,
    owner_path: diagnostic.existing_owner?.owner_path ?? diagnostic.attempted_owner.owner_path
  };
}

function summarizeControlHostOwner(
  metadata: ControlHostOwnerMetadata
): ControlHostOwnerSummary {
  return {
    owner_token: metadata.owner_token,
    status: metadata.status,
    pid: metadata.pid,
    ppid: metadata.ppid,
    hostname: metadata.hostname,
    acquired_at: metadata.acquired_at,
    updated_at: metadata.updated_at,
    released_at: metadata.released_at,
    repo_root: metadata.repo_root,
    task_id: metadata.task_id,
    run_id: metadata.run_id,
    run_dir: metadata.run_dir,
    pipeline_id: metadata.pipeline_id,
    source_root_freshness: metadata.source_root_freshness,
    lock_dir: metadata.lock_dir,
    owner_path: metadata.owner_path
  };
}

function refreshControlHostOwnerSummary(
  summary: ControlHostOwnerSummary | null
): ControlHostOwnerSummary | null {
  const prior = summary?.source_root_freshness;
  if (!summary || !prior) {
    return summary;
  }
  return {
    ...summary,
    source_root_freshness: refreshSourceRootFreshnessInspection(prior, summary.repo_root)
  };
}

function normalizeControlHostOwnerSummary(value: unknown): ControlHostOwnerSummary | null {
  if (!isRecordLike(value)) {
    return null;
  }
  if (
    typeof value.owner_token !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.pid !== 'number' ||
    typeof value.hostname !== 'string' ||
    typeof value.acquired_at !== 'string' ||
    typeof value.updated_at !== 'string' ||
    typeof value.run_id !== 'string' ||
    typeof value.run_dir !== 'string' ||
    typeof value.lock_dir !== 'string' ||
    typeof value.owner_path !== 'string'
  ) {
    return null;
  }
  const status = value.status === 'released' ? 'released' : 'owned';
  return {
    owner_token: value.owner_token,
    status,
    pid: value.pid,
    ppid: typeof value.ppid === 'number' ? value.ppid : null,
    hostname: value.hostname,
    acquired_at: value.acquired_at,
    updated_at: value.updated_at,
    released_at: typeof value.released_at === 'string' ? value.released_at : null,
    repo_root: typeof value.repo_root === 'string' ? value.repo_root : null,
    task_id: typeof value.task_id === 'string' ? value.task_id : null,
    run_id: value.run_id,
    run_dir: value.run_dir,
    pipeline_id: typeof value.pipeline_id === 'string' ? value.pipeline_id : null,
    source_root_freshness: normalizeSourceRootFreshnessInspection(value.source_root_freshness),
    lock_dir: value.lock_dir,
    owner_path: value.owner_path
  };
}

function normalizeDiagnosticReason(value: unknown): ControlHostOwnershipDiagnosticReason | null {
  return value === 'duplicate_control_host_owner' ||
    value === 'ambiguous_control_host_owner' ||
    value === 'stale_control_host_owner'
    ? value
    : null;
}

function normalizePollingStatus(
  value: unknown
): ControlHostOwnershipPollingPayload['status'] | null {
  return value === 'owned' ||
    value === 'duplicate_rejected' ||
    value === 'ambiguous_rejected' ||
    value === 'stale_reclaimed'
    ? value
    : null;
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAlreadyExistsError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'EEXIST';
}

function formatDuplicateControlHostOwnerMessage(
  reason: ControlHostOwnershipDiagnosticReason,
  existingOwner: ControlHostOwnerMetadata | null,
  attemptedOwner: ControlHostOwnerMetadata,
  diagnosticPath: string
): string {
  const ownerText = existingOwner
    ? `existing pid=${existingOwner.pid} host=${existingOwner.hostname} task=${existingOwner.task_id ?? 'unknown'} run=${existingOwner.run_id} pipeline=${existingOwner.pipeline_id ?? 'unknown'}`
    : 'existing owner metadata unavailable';
  return `control-host ownership rejected (${reason}): ${ownerText}; attempted pid=${attemptedOwner.pid} host=${attemptedOwner.hostname}; diagnostic=${diagnosticPath}`;
}
