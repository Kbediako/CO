import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';
import { stripNonApplicableGuardrailSummaryLines } from '../run/manifest.js';
import type { ControlAction, ControlState } from './controlState.js';
import { LINEAR_ADVISORY_STATE_FILE } from './controlPersistenceFiles.js';
import {
  resolveLegacyWorkspacePathFromRunDir,
  resolveManifestWorkspacePath,
  resolveProviderWorkspacePath
} from '../run/workspacePath.js';
import {
  PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID,
  PROVIDER_LINEAR_CHILD_LANE_RESERVED_SUMMARY,
  PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME,
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  refreshProviderLinearWorkerProofSnapshot,
  type ProviderLinearWorkerProof
} from '../providerLinearWorkerRunner.js';
import {
  buildTrackedLinearPayload,
  type ControlCompatibilitySourceContext,
  type SelectedRunContext,
  type SelectedRunLatestEvent,
  type SelectedRunQuestionSummary
} from './observabilityReadModel.js';
import type { QuestionRecord } from './questions.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type { ProviderIntakeClaimRecord, ProviderIntakeState } from './providerIntakeState.js';
import {
  buildProviderFallbackTaskId,
  buildProviderIssueKey,
  hasQueuedProviderIntakeRetry,
  isActiveProviderIntakeClaim,
  readProviderIntakeClaim,
  selectProviderIntakeClaim
} from './providerIntakeState.js';
import { classifyProviderLinearWorkflowState } from './providerLinearWorkflowStates.js';
import {
  buildProviderIssueDebugSnapshot,
  type ControlProviderDebugSnapshot,
  type ProviderLinearWorkerProgressSnapshot
} from './providerIssueObservability.js';
import { writeJsonAtomic } from '../utils/fs.js';
import {
  buildProviderLinearWorkerTerminalSummary,
  deriveDeterministicProviderMutationSuppressions,
  formatDeterministicProviderMutationDegradationSummary,
  isAuxiliaryProviderProofHarnessManifest,
  isProviderLinearWorkerProofFreshForStage,
  resolveProviderLinearWorkerAttemptStartedAt,
  resolveProviderLinearWorkerTerminalReason,
  resolveProviderLinearWorkerTerminalStatus,
  shouldUseProviderLinearWorkerTerminalProofForSelectedRun
} from './providerLinearWorkerTruth.js';

const PROVIDER_LINEAR_WORKER_PIPELINE_TITLE = 'Provider Linear Worker';
const PROVIDER_LINEAR_WORKER_PIPELINE_ID = 'provider-linear-worker';
const PROVIDER_LINEAR_WORKER_RECONCILIATION_FILENAME = 'provider-linear-worker-reconciliation.json';
const SYNTHETIC_LINEAR_TASK_ID_PATTERN =
  /^linear-[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const PROVIDER_LINEAR_CHILD_PIPELINE_IDS = new Set([
  'docs-review',
  'implementation-gate',
  'docs-relevance-advisory',
  'provider-linear-child-lane'
]);
const PROVIDER_COMPATIBILITY_FULL_RECONCILIATION_CLAIM_LIMIT = 16;
const PROVIDER_COMPATIBILITY_SYNTHETIC_LOCAL_SCAN_MANIFEST_LIMIT = 64;
const PROVIDER_COMPATIBILITY_SYNTHETIC_LOCAL_SCAN_TASK_LIMIT = 64;
const PROVIDER_COMPATIBILITY_SYNTHETIC_LOCAL_SCAN_TASK_RECENCY_SAMPLE_LIMIT = 128;
const PROVIDER_COMPATIBILITY_SYNTHETIC_LOCAL_SCAN_RUNS_PER_TASK = 2;

interface SyntheticTaskLocalManifestCandidate {
  taskEntry: string;
  runEntry: string;
  manifestPath: string;
  recencyAt: string | null;
}

export interface SelectedRunManifestSnapshot {
  manifestRecord: Record<string, unknown>;
  manifestPath: string;
  runDir: string;
  issueProvider: string | null;
  issueIdentifier: string;
  issueId: string | null;
  taskId: string | null;
  runId: string | null;
  lookupAliases: string[];
}

export interface SelectedRunProjectionContext {
  controlStore: {
    snapshot(): ControlState;
  };
  questionQueue: {
    list(): QuestionRecord[];
  };
  paths: Pick<RunPaths, 'manifestPath' | 'runDir'>;
  linearAdvisoryState: {
    tracked_issue: LiveLinearTrackedIssue | null;
    stale_source?: unknown;
  };
  providerIntakeState?: ProviderIntakeState;
}

export interface SelectedRunProjectionReader {
  readSelectedRunManifestSnapshot(): Promise<SelectedRunManifestSnapshot | null>;
  buildSelectedRunContext(snapshot?: SelectedRunManifestSnapshot | null): Promise<SelectedRunContext | null>;
  buildCompatibilitySourceContext(
    snapshot?: SelectedRunManifestSnapshot | null
  ): Promise<ControlCompatibilitySourceContext | null>;
}

export interface CompatibilityCollectionDiscovery {
  running: ControlCompatibilitySourceContext[];
  retrying: ControlCompatibilitySourceContext[];
  all: ControlCompatibilitySourceContext[];
}

interface DiscoveredTaskCompatibilityContext {
  context: ControlCompatibilitySourceContext;
  retryFallbackEligible: boolean;
}

interface ProviderLinearWorkerRunArtifactReconciliationRecord {
  schema_version: 1;
  kind: 'provider-linear-worker-run-artifact-reconciliation';
  status: 'reconciled';
  reconciled_status: string;
  reason: string;
  summary: string;
  recorded_at: string;
  manifest: {
    path: string | null;
    run_id: string | null;
    task_id: string | null;
    status: string;
    updated_at: string | null;
  };
  provider_claim: {
    state: string;
    reason: string | null;
    issue_state: string | null;
    issue_state_type: string | null;
    updated_at: string | null;
    run_id: string | null;
    run_manifest_path: string | null;
  } | null;
  replacement_run: {
    run_id: string | null;
    status: string;
    manifest_path: string | null;
    updated_at: string | null;
  } | null;
}

interface ProjectionContextParts {
  control: ControlState;
  questions: QuestionRecord[];
  runDir: string;
  trackedIssue: LiveLinearTrackedIssue | null;
  providerLinearWorkerProof: ProviderLinearWorkerProof | null;
}

interface SelectedRunProviderClaimMatchSource
  extends Pick<
    SelectedRunManifestSnapshot,
    'issueId' | 'issueIdentifier' | 'issueProvider' | 'manifestPath' | 'manifestRecord' | 'runId' | 'taskId'
  > {
  providerLinearWorkerProof: ProviderLinearWorkerProof | null;
}

interface ResolvedCompatibilityState {
  state: string | null;
  stateType: string | null;
}

interface LinearAdvisoryStateSnapshot {
  tracked_issue?: LiveLinearTrackedIssue | null;
  stale_source?: unknown;
}

function selectFreshLinearAdvisoryTrackedIssue(
  advisoryState:
    | { tracked_issue?: LiveLinearTrackedIssue | null; stale_source?: unknown }
    | null
    | undefined
): LiveLinearTrackedIssue | null {
  if (!advisoryState || advisoryState.stale_source) {
    return null;
  }
  return advisoryState.tracked_issue ?? null;
}

export function createSelectedRunProjectionReader(
  context: SelectedRunProjectionContext
): SelectedRunProjectionReader {
  let selectedSnapshotPromise: Promise<SelectedRunManifestSnapshot | null> | null = null;
  let selectedContextPromise: Promise<SelectedRunContext | null> | null = null;
  let compatibilityContextPromise: Promise<ControlCompatibilitySourceContext | null> | null = null;

  const readSelectedRunManifestSnapshot = async (): Promise<SelectedRunManifestSnapshot | null> => {
    selectedSnapshotPromise ??= readSelectedRunManifestSnapshotInternal(context);
    return selectedSnapshotPromise;
  };

  const buildSelectedRunContext = async (
    snapshot: SelectedRunManifestSnapshot | null = null
  ): Promise<SelectedRunContext | null> => {
    if (snapshot) {
      return buildSelectedRunContextFromSnapshot(context, snapshot);
    }
    selectedContextPromise ??= (async () => {
      const selectedSnapshot = await readSelectedRunManifestSnapshot();
      return buildSelectedRunContextFromSnapshot(context, selectedSnapshot);
    })();
    return selectedContextPromise;
  };

  const buildCompatibilitySourceContext = async (
    snapshot: SelectedRunManifestSnapshot | null = null
  ): Promise<ControlCompatibilitySourceContext | null> => {
    if (snapshot) {
      return buildCompatibilitySourceContextFromSnapshot(context, snapshot);
    }
    compatibilityContextPromise ??= (async () => {
      const selectedSnapshot = await readSelectedRunManifestSnapshot();
      return buildCompatibilitySourceContextFromSnapshot(context, selectedSnapshot);
    })();
    return compatibilityContextPromise;
  };

  return {
    readSelectedRunManifestSnapshot,
    buildSelectedRunContext,
    buildCompatibilitySourceContext
  };
}

export async function discoverCompatibilityCollectionContexts(
  context: SelectedRunProjectionContext
): Promise<CompatibilityCollectionDiscovery> {
  const runsRoot = resolveRunsRootFromRunDir(context.paths.runDir);
  const currentTaskId = resolveTaskIdFromManifestPath(context.paths.manifestPath);
  const currentRunId = resolveRunIdFromManifestPath(context.paths.manifestPath);
  if (!runsRoot) {
    return { running: [], retrying: [], all: [] };
  }
  const controlWorkspacePath = await resolveControlWorkspacePath(context);
  const selectedSnapshot = await readSelectedRunManifestSnapshotInternal(context);
  const selectedContext = await buildUnreconciledCompatibilitySourceContextFromSnapshot(
    context,
    selectedSnapshot
  );
  const discovered = await readDiscoveredTaskCompatibilityContexts(
    context,
    runsRoot,
    currentTaskId,
    currentRunId,
    controlWorkspacePath
  );

  const reconciled = await reconcileProviderLinearWorkerDiscoveredContexts(
    discovered,
    context.providerIntakeState ?? null,
    selectedContext ? [selectedContext] : []
  );
  const running: ControlCompatibilitySourceContext[] = [];
  const retrying: ControlCompatibilitySourceContext[] = [];
  const all: ControlCompatibilitySourceContext[] = [];
  for (const entry of reconciled) {
    const discoveredContext = entry.context;
    all.push(discoveredContext);
    if (discoveredContext.rawStatus === 'in_progress') {
      running.push(discoveredContext);
      continue;
    }
    if ((context.providerIntakeState?.claims.length ?? 0) === 0 && entry.retryFallbackEligible) {
      retrying.push(discoveredContext);
    }
  }

  return { running, retrying, all };
}

async function readDiscoveredTaskCompatibilityContexts(
  context: SelectedRunProjectionContext,
  runsRoot: string,
  currentTaskId: string | null,
  currentRunId: string | null,
  controlWorkspacePath: string | null
): Promise<DiscoveredTaskCompatibilityContext[]> {
  const discovered: DiscoveredTaskCompatibilityContext[] = [];
  const taskEntries = await resolveCompatibilityDiscoveryTaskEntries(
    runsRoot,
    context.providerIntakeState
  );

  for (const taskEntry of taskEntries.sort((left, right) => left.localeCompare(right)).reverse()) {
    if (taskEntry === 'local-mcp') {
      continue;
    }

    const discoveredContexts = await readTaskCompatibilityContexts(join(runsRoot, taskEntry, 'cli'), {
      excludeRunId: taskEntry === currentTaskId ? currentRunId : null,
      providerIntakeState: context.providerIntakeState,
      controlWorkspacePath
    });
    discovered.push(...discoveredContexts);
  }

  discovered.push(
    ...(await readSyntheticTaskLocalCompatibilityContexts(runsRoot, new Set(taskEntries), {
      currentTaskId,
      currentRunId,
      providerIntakeState: context.providerIntakeState,
      controlWorkspacePath
    }))
  );

  return discovered;
}

async function resolveCompatibilityDiscoveryTaskEntries(
  runsRoot: string,
  providerIntakeState: ProviderIntakeState | undefined
): Promise<string[]> {
  const directoryEntries = await readDirectoryNames(runsRoot);
  if (!providerIntakeState || providerIntakeState.claims.length === 0) {
    return directoryEntries;
  }
  if (shouldUseFullCompatibilityDiscovery(providerIntakeState)) {
    return directoryEntries;
  }

  const taskEntries = new Set<string>();
  for (const taskEntry of directoryEntries) {
    if (!isProviderIntakeScopedTaskEntry(taskEntry)) {
      taskEntries.add(taskEntry);
    }
  }
  for (const claim of selectCompatibilityDiscoveryClaims(providerIntakeState)) {
    if (claim.task_id && claim.task_id !== 'local-mcp') {
      taskEntries.add(claim.task_id);
    }
    if (
      claim.run_manifest_path &&
      isCliRunManifestPathWithinRunsRoot(claim.run_manifest_path, runsRoot)
    ) {
      const taskId = resolveTaskIdFromManifestPath(claim.run_manifest_path);
      if (taskId && taskId !== 'local-mcp') {
        taskEntries.add(taskId);
      }
    }
  }

  return [...taskEntries];
}

function isProviderIntakeScopedTaskEntry(taskEntry: string): boolean {
  return SYNTHETIC_LINEAR_TASK_ID_PATTERN.test(taskEntry);
}

function shouldUseFullCompatibilityDiscovery(providerIntakeState: ProviderIntakeState): boolean {
  return (
    providerIntakeState.claims.length <=
    PROVIDER_COMPATIBILITY_FULL_RECONCILIATION_CLAIM_LIMIT
  );
}

function selectCompatibilityDiscoveryClaims(
  providerIntakeState: ProviderIntakeState
): ProviderIntakeClaimRecord[] {
  return providerIntakeState.claims.filter((claim) =>
    isActiveProviderIntakeClaim(claim) ||
    hasQueuedProviderIntakeRetry(claim) ||
    isLiveRehydrateProviderLinearWorkerReleasedClaim(claim)
  );
}

async function readSyntheticTaskLocalCompatibilityContexts(
  runsRoot: string,
  includedTaskEntries: Set<string>,
  options: {
    currentTaskId?: string | null;
    currentRunId?: string | null;
    providerIntakeState?: ProviderIntakeState;
    controlWorkspacePath?: string | null;
  }
): Promise<DiscoveredTaskCompatibilityContext[]> {
  if (!options.providerIntakeState || shouldUseFullCompatibilityDiscovery(options.providerIntakeState)) {
    return [];
  }
  const discovered: DiscoveredTaskCompatibilityContext[] = [];
  let manifestReads = 0;
  const activeProviderIntakeTaskEntries = collectProviderIntakeTaskEntries(
    selectCompatibilityDiscoveryClaims(options.providerIntakeState),
    runsRoot
  );
  const providerIntakeRunEntries = collectProviderIntakeClaimRunEntries(
    options.providerIntakeState,
    runsRoot
  );
  const syntheticTaskEntries = await selectRecentSyntheticTaskEntries(
    runsRoot,
    (await readDirectoryNames(runsRoot)).filter(
      (taskEntry) =>
        isProviderIntakeScopedTaskEntry(taskEntry) &&
        !includedTaskEntries.has(taskEntry) &&
        !activeProviderIntakeTaskEntries.has(taskEntry)
    ),
    providerIntakeRunEntries
  );
  const manifestCandidates = await readSyntheticTaskLocalManifestCandidates(
    runsRoot,
    syntheticTaskEntries,
    providerIntakeRunEntries
  );

  for (const candidate of manifestCandidates) {
    if (manifestReads >= PROVIDER_COMPATIBILITY_SYNTHETIC_LOCAL_SCAN_MANIFEST_LIMIT) {
      break;
    }
    if (options.currentTaskId === candidate.taskEntry && options.currentRunId === candidate.runEntry) {
      continue;
    }
    manifestReads += 1;
    const manifest = await readJsonFile<CliManifest>(candidate.manifestPath);
    if (!manifest || !isSyntheticTaskLocalCompatibilityManifest(manifest)) {
      continue;
    }
    const context = await readTaskCompatibilityContextFromManifest(
      candidate.manifestPath,
      candidate.runEntry,
      manifest,
      options
    );
    if (context) {
      discovered.push(context);
    }
  }

  return discovered;
}

async function selectRecentSyntheticTaskEntries(
  runsRoot: string,
  taskEntries: string[],
  providerIntakeRunEntries: Map<string, Set<string>>
): Promise<string[]> {
  const withCheapRecency = await Promise.all(
    taskEntries.map(async (taskEntry) => ({
      taskEntry,
      recencyAt: await readSyntheticTaskEntryLatestCheapRecencyIso(
        runsRoot,
        taskEntry,
        providerIntakeRunEntries.get(taskEntry)
      )
    }))
  );
  const manifestRankCandidates = withCheapRecency
    .sort(compareSyntheticTaskEntryRecencyDesc)
    .slice(0, PROVIDER_COMPATIBILITY_SYNTHETIC_LOCAL_SCAN_TASK_RECENCY_SAMPLE_LIMIT);
  const withManifestRecency = await Promise.all(
    manifestRankCandidates.map(async (entry) => ({
      taskEntry: entry.taskEntry,
      recencyAt: selectLatestIsoTimestamp(
        entry.recencyAt,
        await readSyntheticTaskEntryLatestManifestRecencyIso(
          runsRoot,
          entry.taskEntry,
          providerIntakeRunEntries.get(entry.taskEntry)
        )
      )
    }))
  );
  return withManifestRecency
    .sort(compareSyntheticTaskEntryRecencyDesc)
    .slice(0, PROVIDER_COMPATIBILITY_SYNTHETIC_LOCAL_SCAN_TASK_LIMIT)
    .map((entry) => entry.taskEntry);
}

async function readSyntheticTaskEntryLatestManifestRecencyIso(
  runsRoot: string,
  taskEntry: string,
  skippedRunEntries?: Set<string>
): Promise<string | null> {
  const cliRoot = join(runsRoot, taskEntry, 'cli');
  const runEntries = (await readSyntheticTaskRunEntryCheapRecencies(cliRoot))
    .filter(({ runEntry }) => !skippedRunEntries?.has(runEntry))
    .sort(compareSyntheticRunEntryRecencyDesc)
    .slice(0, PROVIDER_COMPATIBILITY_SYNTHETIC_LOCAL_SCAN_RUNS_PER_TASK);
  const manifestRecencies = await Promise.all(
    runEntries.map(({ runEntry }) =>
      readManifestRecencyIso(join(cliRoot, runEntry, 'manifest.json'))
    )
  );
  return manifestRecencies.reduce<string | null>(
    (latest, recencyAt) => selectLatestIsoTimestamp(latest, recencyAt),
    null
  );
}

async function readSyntheticTaskLocalManifestCandidates(
  runsRoot: string,
  syntheticTaskEntries: string[],
  providerIntakeRunEntries: Map<string, Set<string>>
): Promise<SyntheticTaskLocalManifestCandidate[]> {
  const candidates: SyntheticTaskLocalManifestCandidate[] = [];
  for (const taskEntry of syntheticTaskEntries) {
    const cliRoot = join(runsRoot, taskEntry, 'cli');
    const runEntries = (await readSyntheticTaskRunEntryCheapRecencies(cliRoot))
      .filter(({ runEntry }) => !providerIntakeRunEntries.get(taskEntry)?.has(runEntry))
      .sort(compareSyntheticRunEntryRecencyDesc)
      .slice(0, PROVIDER_COMPATIBILITY_SYNTHETIC_LOCAL_SCAN_RUNS_PER_TASK);
    for (const { runEntry, recencyAt: cheapRecencyAt } of runEntries) {
      const runDir = join(cliRoot, runEntry);
      candidates.push({
        taskEntry,
        runEntry,
        manifestPath: join(runDir, 'manifest.json'),
        recencyAt:
          await readManifestRecencyIso(join(runDir, 'manifest.json')) ??
          cheapRecencyAt
      });
    }
  }
  return candidates.sort(compareSyntheticTaskLocalManifestCandidateRecencyDesc);
}

async function readSyntheticTaskEntryLatestCheapRecencyIso(
  runsRoot: string,
  taskEntry: string,
  skippedRunEntries?: Set<string>
): Promise<string | null> {
  const cliRoot = join(runsRoot, taskEntry, 'cli');
  const allRunEntries = await readSyntheticTaskRunEntryCheapRecencies(cliRoot);
  if (allRunEntries.length === 0) {
    return await readDirectoryMtimeIso(cliRoot);
  }
  const runEntries = skippedRunEntries?.size
    ? allRunEntries.filter(({ runEntry }) => !skippedRunEntries.has(runEntry))
    : allRunEntries;
  if (runEntries.length === 0) {
    return null;
  }
  return runEntries.reduce<string | null>(
    (latest, entry) => selectLatestIsoTimestamp(latest, entry.recencyAt),
    null
  );
}

async function readSyntheticTaskRunEntryCheapRecencies(
  cliRoot: string
): Promise<Array<{ runEntry: string; recencyAt: string | null }>> {
  return await Promise.all(
    (await readDirectoryNames(cliRoot)).map(async (runEntry) => {
      const runDir = join(cliRoot, runEntry);
      return {
        runEntry,
        recencyAt: selectLatestIsoTimestamp(
          parseProviderLinearWorkerRunIdTimestamp(runEntry),
          await readDirectoryMtimeIso(runDir)
        )
      };
    })
  );
}

async function readManifestRecencyIso(manifestPath: string): Promise<string | null> {
  const manifest = await readJsonFile<Record<string, unknown>>(manifestPath);
  if (!manifest) {
    return null;
  }
  return selectLatestIsoTimestamp(
    readStringValue(manifest, 'updated_at', 'updatedAt') ?? null,
    readStringValue(manifest, 'completed_at', 'completedAt') ?? null,
    readStringValue(manifest, 'started_at', 'startedAt') ?? null
  );
}

function compareSyntheticRunEntryRecencyDesc(
  left: { runEntry: string; recencyAt: string | null },
  right: { runEntry: string; recencyAt: string | null }
): number {
  const recencyComparison = compareIsoTimestamp(right.recencyAt, left.recencyAt);
  return recencyComparison !== 0 ? recencyComparison : right.runEntry.localeCompare(left.runEntry);
}

function compareSyntheticTaskEntryRecencyDesc(
  left: { taskEntry: string; recencyAt: string | null },
  right: { taskEntry: string; recencyAt: string | null }
): number {
  const recencyComparison = compareIsoTimestamp(right.recencyAt, left.recencyAt);
  return recencyComparison !== 0 ? recencyComparison : right.taskEntry.localeCompare(left.taskEntry);
}

function compareSyntheticTaskLocalManifestCandidateRecencyDesc(
  left: SyntheticTaskLocalManifestCandidate,
  right: SyntheticTaskLocalManifestCandidate
): number {
  const recencyComparison = compareIsoTimestamp(right.recencyAt, left.recencyAt);
  if (recencyComparison !== 0) {
    return recencyComparison;
  }
  const taskComparison = right.taskEntry.localeCompare(left.taskEntry);
  return taskComparison !== 0 ? taskComparison : right.runEntry.localeCompare(left.runEntry);
}

async function readDirectoryMtimeIso(path: string): Promise<string | null> {
  try {
    return (await stat(path)).mtime.toISOString();
  } catch {
    return null;
  }
}

function isSyntheticTaskLocalCompatibilityManifest(manifest: CliManifest): boolean {
  const manifestRecord = manifest as unknown as Record<string, unknown>;
  const status = readStringValue(manifestRecord, 'status');
  if (status !== 'in_progress') {
    return false;
  }
  if (isProviderLinearWorkerCompatibilityManifest(manifestRecord)) {
    return false;
  }
  return true;
}

function isProviderLinearWorkerCompatibilityManifest(manifestRecord: Record<string, unknown>): boolean {
  const pipelineId = readStringValue(manifestRecord, 'pipeline_id', 'pipelineId');
  if (pipelineId === PROVIDER_LINEAR_WORKER_PIPELINE_ID) {
    return true;
  }
  return (
    isRecord(manifestRecord.provider_linear_worker_proof) ||
    isRecord(manifestRecord.providerLinearWorkerProof)
  );
}

function collectProviderIntakeTaskEntries(
  claims: ProviderIntakeClaimRecord[],
  runsRoot: string
): Set<string> {
  const taskEntries = new Set<string>();
  for (const claim of claims) {
    if (claim.task_id && claim.task_id !== 'local-mcp') {
      taskEntries.add(claim.task_id);
    }
    if (
      claim.run_manifest_path &&
      isCliRunManifestPathWithinRunsRoot(claim.run_manifest_path, runsRoot)
    ) {
      const taskId = resolveTaskIdFromManifestPath(claim.run_manifest_path);
      if (taskId && taskId !== 'local-mcp') {
        taskEntries.add(taskId);
      }
    }
  }
  return taskEntries;
}

function collectProviderIntakeClaimRunEntries(
  providerIntakeState: ProviderIntakeState,
  runsRoot: string
): Map<string, Set<string>> {
  const runEntries = new Map<string, Set<string>>();
  for (const claim of providerIntakeState.claims) {
    const taskIds = new Set<string>();
    if (claim.task_id && claim.task_id !== 'local-mcp') {
      taskIds.add(claim.task_id);
    }
    if (
      claim.run_manifest_path &&
      isCliRunManifestPathWithinRunsRoot(claim.run_manifest_path, runsRoot)
    ) {
      const taskId = resolveTaskIdFromManifestPath(claim.run_manifest_path);
      if (taskId && taskId !== 'local-mcp') {
        taskIds.add(taskId);
      }
    }

    const claimRunEntries = new Set<string>();
    if (claim.run_id) {
      claimRunEntries.add(claim.run_id);
    }
    if (
      claim.run_manifest_path &&
      isCliRunManifestPathWithinRunsRoot(claim.run_manifest_path, runsRoot)
    ) {
      const runId = resolveRunIdFromManifestPath(claim.run_manifest_path);
      if (runId) {
        claimRunEntries.add(runId);
      }
    }

    if (taskIds.size === 0 || claimRunEntries.size === 0) {
      continue;
    }
    for (const taskId of taskIds) {
      const taskRunEntries = runEntries.get(taskId) ?? new Set<string>();
      for (const runId of claimRunEntries) {
        taskRunEntries.add(runId);
      }
      runEntries.set(taskId, taskRunEntries);
    }
  }
  return runEntries;
}

export async function discoverAuthoritativeRetryCollectionContexts(
  context: SelectedRunProjectionContext
): Promise<ControlCompatibilitySourceContext[]> {
  if (!context.providerIntakeState) {
    return [];
  }

  const retrying: ControlCompatibilitySourceContext[] = [];
  for (const claim of context.providerIntakeState.claims) {
    if (!hasQueuedProviderIntakeRetry(claim)) {
      continue;
    }
    retrying.push(await buildProviderRetryContextFromClaim(context, claim));
  }

  return retrying.sort((left, right) => Date.parse(right.updatedAt ?? '') - Date.parse(left.updatedAt ?? ''));
}

async function buildSelectedRunContextFromSnapshot(
  context: SelectedRunProjectionContext,
  snapshot: SelectedRunManifestSnapshot | null
): Promise<SelectedRunContext | null> {
  return await reconcileSelectedProviderLinearWorkerContext(
    context,
    await buildUnreconciledCompatibilitySourceContextFromSnapshot(context, snapshot)
  );
}

async function buildCompatibilitySourceContextFromSnapshot(
  context: SelectedRunProjectionContext,
  snapshot: SelectedRunManifestSnapshot | null
): Promise<ControlCompatibilitySourceContext | null> {
  return await reconcileSelectedProviderLinearWorkerContext(
    context,
    await buildUnreconciledCompatibilitySourceContextFromSnapshot(context, snapshot)
  );
}

async function buildUnreconciledCompatibilitySourceContextFromSnapshot(
  context: SelectedRunProjectionContext,
  snapshot: SelectedRunManifestSnapshot | null
): Promise<ControlCompatibilitySourceContext | null> {
  const [parts, controlWorkspacePath] = await Promise.all([
    resolveProjectionContextParts(context, snapshot),
    resolveControlWorkspacePath(context)
  ]);
  const providerClaim = findMatchingProviderIntakeClaim(
    context.providerIntakeState,
    snapshot,
    parts.providerLinearWorkerProof
  );
  return buildProjectionContextFromParts(
    snapshot,
    parts,
    resolveRunsRootFromRunDir(context.paths.runDir),
    controlWorkspacePath,
    providerClaim,
    context.providerIntakeState ?? null
  );
}

async function reconcileSelectedProviderLinearWorkerContext<T extends ControlCompatibilitySourceContext>(
  context: SelectedRunProjectionContext,
  selected: T | null
): Promise<T | null> {
  if (!selected || !context.providerIntakeState) {
    return selected;
  }
  if (
    !isProviderLinearWorkerReconciliationSource(selected) ||
    !isActiveLookingProviderLinearWorkerManifestStatus(selected.rawStatus)
  ) {
    return selected;
  }
  const selectedRunDir =
    selected.runDir ?? (selected.manifestPath ? dirname(selected.manifestPath) : context.paths.runDir);
  const selectedManifestPath = selected.manifestPath ?? context.paths.manifestPath;
  const runsRoot = resolveRunsRootFromRunDir(selectedRunDir);
  const currentTaskId = resolveTaskIdFromManifestPath(selectedManifestPath) ?? selected.taskId;
  const currentRunId = resolveRunIdFromManifestPath(selectedManifestPath) ?? selected.runId;
  if (!runsRoot) {
    return selected;
  }
  const controlWorkspacePath = await resolveControlWorkspacePath(context);
  const discovered = await readDiscoveredTaskCompatibilityContexts(
    context,
    runsRoot,
    currentTaskId,
    currentRunId,
    controlWorkspacePath
  );
  const [reconciled] = await reconcileProviderLinearWorkerDiscoveredContexts(
    [{ context: selected, retryFallbackEligible: false }],
    context.providerIntakeState,
    discovered.map((entry) => entry.context)
  );
  return (reconciled?.context ?? selected) as T;
}

function buildProjectionContextFromParts(
  snapshot: SelectedRunManifestSnapshot | null,
  parts: ProjectionContextParts,
  controlRunsRoot: string | null,
  controlWorkspacePath: string | null,
  providerClaim: ProviderIntakeClaimRecord | null = null,
  providerIntakeState: ProviderIntakeState | null = null
): SelectedRunContext | null {
  if (!snapshot) {
    return null;
  }
  const { manifestRecord, taskId, runId } = snapshot;
  const issueProvider = snapshot.issueProvider ?? providerClaim?.provider ?? null;
  const allowTrackedIssueFallbackIdentityRebinding = hasProviderLinearClaimBindingProvenance(
    snapshot,
    parts.providerLinearWorkerProof
  );
  const { issueIdentifier, issueId, lookupAliases } = resolveProjectionIssueIdentity(
    snapshot,
    parts.trackedIssue,
    providerClaim,
    allowTrackedIssueFallbackIdentityRebinding
  );
  const matchedTrackedIssue = resolveProjectionTrackedIssue(parts.trackedIssue, {
    issueIdentifier,
    issueId,
    taskId,
    runId
  });
  const control = parts.control;
  const manifestRawStatus = readStringValue(manifestRecord, 'status') ?? 'unknown';
  const startedAt = readStringValue(manifestRecord, 'started_at', 'startedAt') ?? null;
  const providerProofRecord = (parts.providerLinearWorkerProof ?? null) as Record<string, unknown> | null;
  const proofIsFreshForStage = isProviderLinearWorkerProofFreshForStage(providerProofRecord, startedAt);
  const useTerminalProof = shouldUseProviderLinearWorkerTerminalProofForSelectedRun(manifestRecord, providerProofRecord);
  const useScopedTerminalProof = useTerminalProof && proofIsFreshForStage;
  const proofTerminalStatus = useScopedTerminalProof
    ? resolveProviderLinearWorkerTerminalStatus(providerProofRecord)
    : null;
  const rawStatus = proofTerminalStatus ?? manifestRawStatus;
  const manifestUpdatedAt = readStringValue(manifestRecord, 'updated_at', 'updatedAt') ?? null;
  const proofUpdatedAt = useScopedTerminalProof
    ? readStringValue(providerProofRecord ?? {}, 'updated_at')
    : null;
  const updatedAt =
    proofUpdatedAt && (!manifestUpdatedAt || compareIsoTimestamp(proofUpdatedAt, manifestUpdatedAt) >= 0)
      ? proofUpdatedAt
      : manifestUpdatedAt;
  const manifestCompletedAt = readStringValue(manifestRecord, 'completed_at', 'completedAt');
  const completedAt = manifestCompletedAt ?? (isTerminalRunStatus(rawStatus) ? proofUpdatedAt ?? updatedAt : null);
  const manifestSummary = stripNonApplicableGuardrailSummaryLines(
    manifestRecord,
    readStringValue(manifestRecord, 'summary')
  );
  const proofAttemptStartedAt = useScopedTerminalProof
    ? resolveProviderLinearWorkerAttemptStartedAt(providerProofRecord)
    : null;
  const proofSummary =
    useScopedTerminalProof && proofTerminalStatus
      ? buildProviderLinearWorkerTerminalSummary({
          status: proofTerminalStatus,
          endReason: resolveProviderLinearWorkerTerminalReason(providerProofRecord),
          degradationSummary:
            proofAttemptStartedAt === null
              ? null
              : formatDeterministicProviderMutationDegradationSummary(
                  deriveDeterministicProviderMutationSuppressions(
                    parts.providerLinearWorkerProof?.linear_audit ?? null,
                    {
                      recordedAtNotBefore: proofAttemptStartedAt,
                      issueId: parts.providerLinearWorkerProof?.issue_id ?? null
                    }
                  )
                )
        })
      : null;
  const providerDebugSnapshot = buildProviderIssueDebugSnapshot({
    issue_id: issueId,
    issue_identifier: issueIdentifier,
    tracked_issue: matchedTrackedIssue,
    claim: providerClaim,
    proof: proofIsFreshForStage ? parts.providerLinearWorkerProof : null,
    rehydrated_at: providerIntakeState?.rehydrated_at ?? null
  });
  const terminalMergeCloseoutProgress = resolveTerminalMergeCloseoutProgress({
    rawStatus,
    providerDebugSnapshot,
    trackedIssue: matchedTrackedIssue
  });
  const summary = resolveSelectedRunDisplaySummary({
    manifestRecord,
    rawStatus,
    summary: proofSummary ?? manifestSummary,
    terminalMergeCloseoutProgress
  });
  const workspacePath = resolveSelectedRunWorkspacePath({
    manifestRecord,
    manifestPath: snapshot.manifestPath,
    controlRunsRoot,
    controlWorkspacePath
  });
  const questionSummary = buildSelectedRunQuestionSummary(parts.questions);
  const latestAction = control.latest_action?.action ?? null;
  const compatibilityState = resolveCompatibilityState(
    shouldPreferTrackedIssueCompatibilityState(matchedTrackedIssue, providerClaim)
      ? matchedTrackedIssue
      : null,
    providerClaim
  );
  const { displayStatus, statusReason } = resolveSelectedRunDisplayStatus({
    rawStatus,
    latestAction,
    questionSummary,
    compatibilityState,
    terminalMergeCloseoutProgress
  });
  const tracked = buildTrackedLinearPayload(matchedTrackedIssue);
  const latestEvent = buildSelectedRunLatestEvent({
    controlAction: control.latest_action ?? null,
    updatedAt,
    summary,
    fallbackEvent: rawStatus,
    providerDebugSnapshot,
    terminalMergeCloseoutProgress
  });
  const lastError =
    terminalMergeCloseoutProgress?.status === 'failed'
      ? terminalMergeCloseoutProgress.stall_reason ??
        summary ??
        'merge_closeout_failed'
      : rawStatus === 'failed'
      ? summary ?? control.latest_action?.reason ?? 'run_failed'
      : latestAction === 'fail'
        ? control.latest_action?.reason ?? manifestSummary ?? 'run_failed'
        : null;

  return {
    issueProvider,
    issueIdentifier,
    issueId,
    taskId,
    runId,
    lookupAliases,
    rawStatus,
    displayStatus,
    statusReason,
    startedAt,
    updatedAt,
    completedAt,
    summary,
    lastError,
    latestAction,
    latestEvent,
    workspacePath,
    pipelineId: readStringValue(manifestRecord, 'pipeline_id', 'pipelineId') ?? null,
    pipelineTitle: readStringValue(manifestRecord, 'pipeline_title', 'pipelineTitle') ?? null,
    stages: readManifestStageSummaries(manifestRecord),
    approvalsTotal: readManifestApprovalsTotal(manifestRecord),
    manifestPath: snapshot.manifestPath,
    runDir: snapshot.runDir,
    questionSummary,
    tracked,
    compatibilityState: compatibilityState?.state ?? null,
    providerLinearWorkerProof: parts.providerLinearWorkerProof,
    providerDebugSnapshot,
    providerRetryState: buildProviderRetryState(providerClaim)
  };
}

function resolveProjectionIssueIdentity(
  snapshot: Pick<SelectedRunManifestSnapshot, 'issueIdentifier' | 'issueId' | 'taskId' | 'runId' | 'lookupAliases'>,
  trackedIssue: LiveLinearTrackedIssue | null,
  providerClaim: ProviderIntakeClaimRecord | null,
  allowTrackedIssueFallbackIdentityRebinding: boolean
): {
  issueIdentifier: string;
  issueId: string | null;
  lookupAliases: string[];
} {
  const manifestIssueIdentifier = isProjectionFallbackIdentityValue(snapshot.issueIdentifier, snapshot)
    ? null
    : snapshot.issueIdentifier;
  const manifestIssueId = isProjectionFallbackIdentityValue(snapshot.issueId, snapshot)
    ? null
    : snapshot.issueId;
  const issueIdentifier =
    manifestIssueIdentifier ??
    providerClaim?.issue_identifier ??
    (allowTrackedIssueFallbackIdentityRebinding ? trackedIssue?.identifier : null) ??
    snapshot.issueIdentifier;
  const trackedIssueId =
    allowTrackedIssueFallbackIdentityRebinding &&
    trackedIssue?.identifier === issueIdentifier
      ? trackedIssue.id
      : null;
  const issueId =
    manifestIssueId ??
    providerClaim?.issue_id ??
    trackedIssueId ??
    snapshot.issueId;

  return {
    issueIdentifier,
    issueId,
    lookupAliases: Array.from(
      new Set(
        snapshot.lookupAliases.concat(
          buildProjectionLookupAliases({
            issueIdentifier,
            issueId,
            taskId: snapshot.taskId,
            runId: snapshot.runId
          })
        )
      )
    )
  };
}

function resolveProjectionTrackedIssue(
  trackedIssue: LiveLinearTrackedIssue | null,
  identity: {
    issueIdentifier: string;
    issueId: string | null;
    taskId: string | null;
    runId: string | null;
  }
): LiveLinearTrackedIssue | null {
  if (!trackedIssue) {
    return null;
  }
  if (!hasAuthoritativeProjectionIssueIdentity(identity)) {
    return trackedIssue;
  }
  if (identity.issueId && trackedIssue.id === identity.issueId) {
    return trackedIssue;
  }
  if (trackedIssue.identifier === identity.issueIdentifier) {
    return trackedIssue;
  }
  return null;
}

function isProjectionFallbackIdentityValue(
  value: string | null,
  input: Pick<SelectedRunManifestSnapshot, 'taskId' | 'runId'>
): boolean {
  if (!value) {
    return false;
  }
  return (
    isProjectionFallbackIdentityAlias(value, input.taskId) ||
    isProjectionFallbackIdentityAlias(value, input.runId)
  );
}

function isProjectionFallbackIdentityAlias(
  value: string,
  candidate: string | null
): boolean {
  if (!candidate) {
    return false;
  }
  if (value === candidate) {
    return true;
  }
  return SYNTHETIC_LINEAR_TASK_ID_PATTERN.test(value) && candidate.startsWith(`${value}-`);
}

function resolveSelectedRunWorkspacePath(input: {
  manifestRecord: Record<string, unknown>;
  manifestPath: string;
  controlRunsRoot: string | null;
  controlWorkspacePath: string | null;
}): string | null {
  const explicitWorkspacePath = resolveManifestWorkspacePath(input.manifestRecord);
  if (explicitWorkspacePath) {
    return explicitWorkspacePath;
  }
  if (
    !input.controlRunsRoot ||
    !isCliRunManifestPathWithinRunsRoot(input.manifestPath, input.controlRunsRoot)
  ) {
    return null;
  }
  return input.controlWorkspacePath;
}

function resolveCompatibilityState(
  trackedIssue: LiveLinearTrackedIssue | null,
  providerClaim: ProviderIntakeClaimRecord | null
): ResolvedCompatibilityState | null {
  const state = trackedIssue?.state ?? providerClaim?.issue_state ?? null;
  const stateType = trackedIssue?.state_type ?? providerClaim?.issue_state_type ?? null;
  if (!state && !stateType) {
    return null;
  }
  return {
    state,
    stateType
  };
}

function shouldPreferTrackedIssueCompatibilityState(
  trackedIssue: LiveLinearTrackedIssue | null,
  providerClaim: ProviderIntakeClaimRecord | null
): boolean {
  if (!trackedIssue) {
    return false;
  }
  if (providerClaim?.reason !== 'provider_issue_rehydrated_active_run') {
    return true;
  }
  const trackedUpdatedAt = trackedIssue.updated_at ?? null;
  const claimUpdatedAt = providerClaim.issue_updated_at ?? null;
  if (!claimUpdatedAt) {
    return true;
  }
  if (!trackedUpdatedAt) {
    return false;
  }
  return compareIsoTimestamp(trackedUpdatedAt, claimUpdatedAt) > 0;
}

function isCliRunManifestPathWithinRunsRoot(manifestPath: string, runsRoot: string): boolean {
  const relativePath = relative(runsRoot, manifestPath);
  if (relativePath === '' || isAbsolute(relativePath)) {
    return false;
  }
  const normalizedRelativePath = relativePath.replace(/\\/g, '/');
  if (normalizedRelativePath.startsWith('../')) {
    return false;
  }
  const segments = normalizedRelativePath.split('/');
  return (
    segments.length === 4 &&
    segments[0].length > 0 &&
    segments[1] === 'cli' &&
    segments[2].length > 0 &&
    segments[3] === 'manifest.json'
  );
}

async function readSelectedRunManifestSnapshotInternal(
  context: SelectedRunProjectionContext
): Promise<SelectedRunManifestSnapshot | null> {
  const preferredSnapshot = await resolveProviderSelectedManifestSnapshot(context);
  if (preferredSnapshot) {
    return preferredSnapshot;
  }

  const manifest = await readJsonFile<CliManifest>(context.paths.manifestPath);
  if (!manifest) {
    return null;
  }
  const control = context.controlStore.snapshot();
  return buildSelectedRunManifestSnapshot(
    manifest as unknown as Record<string, unknown>,
    context.paths.manifestPath,
    control.run_id ?? null
  );
}

async function readManifestSnapshotForPath(
  manifestPath: string,
  fallbackRunId: string | null = null
): Promise<SelectedRunManifestSnapshot | null> {
  const manifest = await readJsonFile<CliManifest>(manifestPath);
  if (!manifest) {
    return null;
  }
  return buildSelectedRunManifestSnapshot(
    manifest as unknown as Record<string, unknown>,
    manifestPath,
    readStringValue(manifest as unknown as Record<string, unknown>, 'run_id') ?? fallbackRunId
  );
}

function buildSelectedRunQuestionSummary(records: QuestionRecord[]): SelectedRunQuestionSummary {
  const queued = records.filter((record) => record.status === 'queued');
  let latestQuestion: QuestionRecord | null = null;
  for (const record of queued) {
    if (!latestQuestion) {
      latestQuestion = record;
      continue;
    }
    if (Date.parse(record.queued_at) >= Date.parse(latestQuestion.queued_at)) {
      latestQuestion = record;
    }
  }
  return {
    queuedCount: queued.length,
    latestQuestion: latestQuestion
      ? {
          questionId: latestQuestion.question_id,
          prompt: latestQuestion.prompt,
          urgency: latestQuestion.urgency,
          queuedAt: latestQuestion.queued_at
        }
      : null
  };
}

function resolveSelectedRunDisplayStatus(input: {
  rawStatus: string;
  latestAction: ControlAction['action'] | null;
  questionSummary: SelectedRunQuestionSummary;
  compatibilityState: ResolvedCompatibilityState | null;
  terminalMergeCloseoutProgress: ProviderLinearWorkerProgressSnapshot | null;
}): { displayStatus: string; statusReason: string | null } {
  if (input.terminalMergeCloseoutProgress) {
    return {
      displayStatus:
        input.terminalMergeCloseoutProgress.phase === 'pending_shared_root_reconciliation'
          ? 'pending_shared_root_reconciliation'
          : 'failed',
      statusReason: input.terminalMergeCloseoutProgress.stall_reason ?? null
    };
  }
  if (input.rawStatus === 'in_progress' && input.latestAction === 'pause') {
    return {
      displayStatus: 'paused',
      statusReason: input.questionSummary.queuedCount > 0 ? 'queued_questions' : 'control_pause'
    };
  }
  if (input.rawStatus === 'in_progress' && input.questionSummary.queuedCount > 0) {
    return { displayStatus: 'awaiting_input', statusReason: 'queued_questions' };
  }
  if (input.rawStatus === 'in_progress') {
    const operatorVisibleState = resolveOperatorVisibleRunningState(input.compatibilityState);
    if (operatorVisibleState) {
      return { displayStatus: operatorVisibleState, statusReason: null };
    }
  }
  return { displayStatus: input.rawStatus, statusReason: null };
}

function resolveOperatorVisibleRunningState(
  compatibilityState: ResolvedCompatibilityState | null
): string | null {
  const normalizedState = compatibilityState?.state?.trim() ?? null;
  const normalizedStateType = compatibilityState?.stateType?.trim().toLowerCase() ?? null;
  if (!normalizedState) {
    return null;
  }
  const workflowState = classifyProviderLinearWorkflowState({
    state: normalizedState,
    state_type: normalizedStateType
  });
  if (
    workflowState.isTodo ||
    workflowState.isTerminal ||
    normalizedStateType === 'triage' ||
    normalizedStateType === 'backlog' ||
    normalizedStateType === 'unstarted'
  ) {
    return null;
  }
  const stateKey = normalizedState.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (stateKey === 'running' || stateKey === 'started') {
    return normalizedState;
  }
  return normalizedState;
}

function buildSelectedRunLatestEvent(input: {
  controlAction: ControlAction | null;
  updatedAt: string | null;
  summary: string | null;
  fallbackEvent: string;
  providerDebugSnapshot: ControlProviderDebugSnapshot | null;
  terminalMergeCloseoutProgress: ProviderLinearWorkerProgressSnapshot | null;
}): SelectedRunLatestEvent | null {
  if (
    !input.controlAction &&
    input.terminalMergeCloseoutProgress &&
    input.providerDebugSnapshot?.progress
  ) {
    return {
      at:
        input.providerDebugSnapshot.progress.summary_recorded_at ??
        input.providerDebugSnapshot.progress.last_semantic_progress_at ??
        input.providerDebugSnapshot.last_semantic_progress_at ??
        input.updatedAt,
      event: input.terminalMergeCloseoutProgress.phase,
      message: input.terminalMergeCloseoutProgress.summary ?? input.summary,
      source: input.terminalMergeCloseoutProgress.event_source ?? 'merge_closeout',
      messageRecordedAt:
        input.terminalMergeCloseoutProgress.message_recorded_at ??
        input.terminalMergeCloseoutProgress.summary_recorded_at ??
        null,
      sourceUpdatedAt:
        input.terminalMergeCloseoutProgress.source_updated_at ??
        input.terminalMergeCloseoutProgress.last_semantic_progress_at ??
        input.providerDebugSnapshot.last_semantic_progress_at ??
        input.updatedAt,
      candidates: input.terminalMergeCloseoutProgress.event_candidates ?? [],
      requestedBy: null,
      reason: input.terminalMergeCloseoutProgress.stall_reason ?? null
    };
  }
  if (
    !input.controlAction &&
    input.providerDebugSnapshot?.progress &&
    hasAuthoritativeProviderDebugEvidence(input.providerDebugSnapshot) &&
    shouldPreferProviderDebugProgressEvent(input.fallbackEvent)
  ) {
    return {
      at:
        input.providerDebugSnapshot.progress.summary_recorded_at ??
        input.providerDebugSnapshot.progress.message_recorded_at ??
        input.providerDebugSnapshot.progress.source_updated_at ??
        input.providerDebugSnapshot.progress.last_semantic_progress_at ??
        input.providerDebugSnapshot.last_semantic_progress_at ??
        input.updatedAt,
      event:
        input.providerDebugSnapshot.progress.selected_event ??
        input.providerDebugSnapshot.progress.phase,
      message: input.providerDebugSnapshot.progress.summary ?? input.summary,
      source: input.providerDebugSnapshot.progress.event_source ?? 'provider_debug_progress',
      messageRecordedAt:
        input.providerDebugSnapshot.progress.message_recorded_at ??
        input.providerDebugSnapshot.progress.summary_recorded_at ??
        null,
      sourceUpdatedAt:
        input.providerDebugSnapshot.progress.source_updated_at ??
        input.providerDebugSnapshot.progress.last_semantic_progress_at ??
        input.providerDebugSnapshot.last_semantic_progress_at ??
        input.updatedAt,
      candidates: input.providerDebugSnapshot.progress.event_candidates ?? [],
      requestedBy: null,
      reason: input.providerDebugSnapshot.progress.stall_reason ?? null
    };
  }
  if (!input.controlAction && !input.updatedAt && !input.summary) {
    return null;
  }
  return {
    at: input.controlAction?.requested_at ?? input.updatedAt,
    event: input.controlAction?.action ?? input.fallbackEvent,
    message: input.summary,
    source: input.controlAction ? 'control_action' : 'run_summary',
    messageRecordedAt: null,
    sourceUpdatedAt: input.controlAction?.requested_at ?? input.updatedAt,
    candidates: [],
    requestedBy: input.controlAction?.requested_by ?? null,
    reason: input.controlAction?.reason ?? null
  };
}

function hasAuthoritativeProviderDebugEvidence(
  providerDebugSnapshot: ControlProviderDebugSnapshot
): boolean {
  const claimIsStale = providerDebugSnapshot.claim?.freshness === 'stale';
  if (claimIsStale && providerDebugSnapshot.progress?.kind === 'merge_closeout') {
    return false;
  }
  const hasFreshClaim = providerDebugSnapshot.claim !== null && !claimIsStale;
  const hasFreshPullRequest = providerDebugSnapshot.pull_request !== null && !claimIsStale;
  return Boolean(
    hasFreshClaim ||
      providerDebugSnapshot.worker ||
      hasFreshPullRequest ||
      providerDebugSnapshot.last_audit_operation
  );
}

function shouldPreferProviderDebugProgressEvent(fallbackEvent: string): boolean {
  return (
    fallbackEvent === 'in_progress' ||
    fallbackEvent === 'running' ||
    fallbackEvent === 'started' ||
    fallbackEvent === 'resuming'
  );
}

function resolveSelectedRunDisplaySummary(input: {
  manifestRecord: Record<string, unknown>;
  rawStatus: string;
  summary: string | null;
  terminalMergeCloseoutProgress: ProviderLinearWorkerProgressSnapshot | null;
}): string | null {
  if (input.terminalMergeCloseoutProgress?.summary) {
    return input.terminalMergeCloseoutProgress.summary;
  }
  const acceptedProviderRetryResumeAt = readLatestAcceptedProviderRetryResumeAt(input.manifestRecord);
  const hasFailedCommandsForAuthoritativeAttempt =
    acceptedProviderRetryResumeAt === null
      ? manifestHasFailedCommands(input.manifestRecord)
      : manifestHasFailedCommandsSince(input.manifestRecord, acceptedProviderRetryResumeAt);
  if (
    input.rawStatus === 'succeeded' &&
    input.summary &&
    hasStaleFailureSummary(input.summary, input.manifestRecord) &&
    !hasFailedCommandsForAuthoritativeAttempt
  ) {
    const filteredSummary = filterStaleFailureSummary(
      input.summary,
      input.manifestRecord
    );
    return filteredSummary ?? 'Completed successfully';
  }
  if (
    input.rawStatus === 'in_progress' &&
    input.summary &&
    hasStaleFailureSummary(input.summary, input.manifestRecord) &&
    acceptedProviderRetryResumeAt !== null &&
    !manifestHasFailedCommandsSince(input.manifestRecord, acceptedProviderRetryResumeAt)
  ) {
    const filteredSummary = filterStaleFailureSummary(
      input.summary,
      input.manifestRecord
    );
    return filteredSummary ?? 'Retry accepted; run resumed after a failed attempt.';
  }
  return input.summary;
}

function resolveTerminalMergeCloseoutProgress(input: {
  rawStatus: string;
  providerDebugSnapshot: ControlProviderDebugSnapshot | null;
  trackedIssue: LiveLinearTrackedIssue | null;
}): ProviderLinearWorkerProgressSnapshot | null {
  const progress = input.providerDebugSnapshot?.progress ?? null;
  if (
    input.rawStatus !== 'succeeded' ||
    !progress ||
    progress.kind !== 'merge_closeout' ||
    !input.providerDebugSnapshot
  ) {
    return null;
  }
  const isTerminalMergeCloseoutProgress =
    progress.phase === 'pending_shared_root_reconciliation' ||
    progress.status === 'failed';
  if (!isTerminalMergeCloseoutProgress) {
    return null;
  }
  if (hasAuthoritativeProviderDebugEvidence(input.providerDebugSnapshot)) {
    return progress;
  }
  if (input.providerDebugSnapshot.claim?.freshness !== 'stale') {
    return null;
  }
  if (input.trackedIssue && classifyProviderLinearWorkflowState(input.trackedIssue).isTerminal) {
    return null;
  }
  return progress;
}

function isTerminalRunStatus(status: string): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled' || status === 'canceled';
}

function hasStaleFailureSummary(
  summary: string,
  manifestRecord: Record<string, unknown>
): boolean {
  return summary.split('\n').some((line) => isStaleFailureSummaryLine(line, manifestRecord));
}

function filterStaleFailureSummary(
  summary: string,
  manifestRecord: Record<string, unknown>
): string | null {
  const retainedLines = summary
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isStaleFailureSummaryLine(line, manifestRecord));
  if (retainedLines.length === 0) {
    return null;
  }
  return retainedLines.join('\n');
}

function isStaleFailureSummaryLine(
  line: string,
  manifestRecord: Record<string, unknown>
): boolean {
  const trimmed = line.trim();
  if (
    /^Stage '.*' failed with exit code \d+\.$/u.test(trimmed) ||
    /^Sub-pipeline '.*' failed\.$/u.test(trimmed) ||
    /^Execution error: .+/u.test(trimmed)
  ) {
    return true;
  }
  if (!/^Sub-pipeline error: .+/u.test(trimmed)) {
    return false;
  }
  return !hasMatchingSkippedSubpipelineErrorSummary(manifestRecord, trimmed);
}

function manifestHasFailedCommands(manifestRecord: Record<string, unknown>): boolean {
  const commands = manifestRecord.commands;
  if (!Array.isArray(commands)) {
    return false;
  }
  return commands.some((command) => {
    if (!command || typeof command !== 'object') {
      return false;
    }
    return readStringValue(command as Record<string, unknown>, 'status') === 'failed';
  });
}

function manifestHasFailedCommandsSince(
  manifestRecord: Record<string, unknown>,
  sinceAtMs: number
): boolean {
  const commands = manifestRecord.commands;
  if (!Array.isArray(commands)) {
    return false;
  }
  return commands.some((command) => {
    if (!isRecord(command) || readStringValue(command, 'status') !== 'failed') {
      return false;
    }
    const commandFailureAtMs = readLatestCommandFailureTimestampMs(command);
    if (commandFailureAtMs === null) {
      return true;
    }
    return commandFailureAtMs >= sinceAtMs;
  });
}

function readLatestAcceptedProviderRetryResumeAt(manifestRecord: Record<string, unknown>): number | null {
  const resumeEvents = manifestRecord.resume_events;
  if (!Array.isArray(resumeEvents)) {
    return null;
  }
  let latestAcceptedAt: number | null = null;
  for (const event of resumeEvents) {
    if (
      !isRecord(event) ||
      readStringValue(event, 'reason') !== 'provider-retry' ||
      readStringValue(event, 'outcome') !== 'accepted'
    ) {
      continue;
    }
    const acceptedAt = Date.parse(readStringValue(event, 'timestamp') ?? '');
    if (!Number.isFinite(acceptedAt)) {
      continue;
    }
    latestAcceptedAt = latestAcceptedAt === null ? acceptedAt : Math.max(latestAcceptedAt, acceptedAt);
  }
  return latestAcceptedAt;
}

function readLatestCommandFailureTimestampMs(command: Record<string, unknown>): number | null {
  return readLatestCommandTimestampMs(command);
}

function hasMatchingSkippedSubpipelineErrorSummary(
  manifestRecord: Record<string, unknown>,
  summaryLine: string
): boolean {
  const commands = manifestRecord.commands;
  if (!Array.isArray(commands)) {
    return false;
  }
  return commands.some((command) => {
    if (!isRecord(command) || readStringValue(command, 'status') !== 'skipped') {
      return false;
    }
    if ((readStringValue(command, 'summary') ?? '').trim() !== summaryLine) {
      return false;
    }
    return true;
  });
}

function readLatestCommandTimestampMs(command: Record<string, unknown>): number | null {
  for (const key of ['completed_at', 'completedAt', 'updated_at', 'updatedAt', 'started_at', 'startedAt']) {
    const value = readStringValue(command, key);
    const parsed = Date.parse(value ?? '');
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function readManifestStageSummaries(manifestRecord: Record<string, unknown>): Array<{
  id: string;
  title: string;
  status: string | null;
}> {
  const commands = manifestRecord.commands;
  if (!Array.isArray(commands)) {
    return [];
  }
  return commands.flatMap((command) => {
    if (!isRecord(command)) {
      return [];
    }
    const id = readStringValue(command, 'id');
    if (!id) {
      return [];
    }
    return [
      {
        id,
        title: readStringValue(command, 'title') ?? id,
        status: readStringValue(command, 'status') ?? null
      }
    ];
  });
}

function readManifestApprovalsTotal(manifestRecord: Record<string, unknown>): number {
  return Array.isArray(manifestRecord.approvals) ? manifestRecord.approvals.length : 0;
}

async function resolveControlWorkspacePath(
  context: SelectedRunProjectionContext
): Promise<string | null> {
  const controlManifest = await readJsonFile<Record<string, unknown>>(context.paths.manifestPath);
  const explicitWorkspacePath = controlManifest ? resolveManifestWorkspacePath(controlManifest) : null;
  if (explicitWorkspacePath) {
    return explicitWorkspacePath;
  }
  return resolveSafeLegacyWorkspacePathFromRunDir(context.paths.runDir);
}

function resolveSafeLegacyWorkspacePathFromRunDir(runDir: string): string | null {
  const legacyWorkspacePath = resolveLegacyWorkspacePathFromRunDir(runDir);
  const runsRoot = resolveRunsRootFromRunDir(runDir);
  if (!runsRoot) {
    return null;
  }
  return normalizePathForComparison(runsRoot) === normalizePathForComparison(join(legacyWorkspacePath, '.runs'))
    ? legacyWorkspacePath
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolveRunsRootFromRunDir(runDir: string): string | null {
  const candidate = resolve(runDir, '..', '..', '..');
  return candidate || null;
}

function resolveTaskIdFromManifestPath(manifestPath: string): string | null {
  const segments = normalizePathForComparison(manifestPath).split('/').filter((segment) => segment.length > 0);
  const manifestIndex = segments[segments.length - 1] === 'manifest.json' ? segments.length - 1 : segments.length;
  if (manifestIndex < 3) {
    return null;
  }
  if (segments[manifestIndex - 2] !== 'cli') {
    return null;
  }
  return segments[manifestIndex - 3] ?? null;
}

function resolveRunIdFromManifestPath(manifestPath: string): string | null {
  const normalizedPath = manifestPath.replace(/\\/g, '/');
  const match = normalizedPath.match(/\/cli\/([^/]+)\/manifest\.json$/);
  return match?.[1] ?? null;
}

function normalizePathForComparison(pathname: string): string {
  return resolve(pathname).replace(/\\/g, '/');
}

async function resolveProjectionContextParts(
  context: SelectedRunProjectionContext,
  snapshot: SelectedRunManifestSnapshot | null
): Promise<ProjectionContextParts> {
  if (!snapshot || snapshot.runDir === context.paths.runDir) {
    return {
      control: context.controlStore.snapshot(),
      questions: context.questionQueue.list(),
      runDir: context.paths.runDir,
      trackedIssue: selectFreshLinearAdvisoryTrackedIssue(context.linearAdvisoryState),
      providerLinearWorkerProof: await readProviderLinearWorkerProofForProjection(context.paths.runDir)
    };
  }

  const control = normalizeControlState(
    await readJsonFile<ControlState>(join(snapshot.runDir, 'control.json')),
    snapshot.runId
  );
  const questionSnapshot = await readJsonFile<{ questions?: QuestionRecord[] }>(
    join(snapshot.runDir, 'questions.json')
  );
  const advisoryState = await readJsonFile<LinearAdvisoryStateSnapshot>(
    join(snapshot.runDir, LINEAR_ADVISORY_STATE_FILE)
  );
  return {
    control,
    questions: Array.isArray(questionSnapshot?.questions) ? questionSnapshot.questions : [],
    runDir: snapshot.runDir,
    trackedIssue: selectFreshLinearAdvisoryTrackedIssue(advisoryState),
    providerLinearWorkerProof: await readProviderLinearWorkerProofForProjection(snapshot.runDir)
  };
}

function buildSelectedRunManifestSnapshot(
  manifestRecord: Record<string, unknown>,
  manifestPath: string,
  fallbackRunId: string | null
): SelectedRunManifestSnapshot | null {
  const issueProvider =
    readStringValue(manifestRecord, 'issue_provider', 'issueProvider') ?? null;
  const taskId = readStringValue(manifestRecord, 'task_id', 'taskId') ?? resolveTaskIdFromManifestPath(manifestPath);
  const runId =
    readStringValue(manifestRecord, 'run_id', 'runId') ??
    fallbackRunId ??
    resolveRunIdFromManifestPath(manifestPath);
  const issueIdentifier =
    readStringValue(manifestRecord, 'issue_identifier', 'issueIdentifier') ?? taskId ?? runId;
  const issueId = readStringValue(manifestRecord, 'issue_id', 'issueId') ?? taskId ?? runId;
  if (!issueIdentifier) {
    return null;
  }
  return {
    manifestRecord,
    manifestPath,
    runDir: dirname(manifestPath),
    issueProvider,
    issueIdentifier,
    issueId,
    taskId,
    runId,
    lookupAliases: buildProjectionLookupAliases({
      issueIdentifier,
      issueId,
      taskId,
      runId
    })
  };
}

function normalizeControlState(snapshot: ControlState | null, runId: string | null): ControlState {
  return {
    run_id: snapshot?.run_id ?? runId ?? 'unknown-run',
    control_seq: typeof snapshot?.control_seq === 'number' ? snapshot.control_seq : 0,
    latest_action: snapshot?.latest_action ?? null,
    feature_toggles: snapshot?.feature_toggles ?? null,
    transport_mutation: snapshot?.transport_mutation ?? null
  };
}

async function readTaskCompatibilityContexts(
  cliRoot: string,
  options: {
    excludeRunId?: string | null;
    providerIntakeState?: ProviderIntakeState;
    controlWorkspacePath?: string | null;
  } = {}
): Promise<DiscoveredTaskCompatibilityContext[]> {
  const discovered: DiscoveredTaskCompatibilityContext[] = [];
  const runEntries = await readDirectoryNames(cliRoot);
  for (const runEntry of runEntries.sort((left, right) => left.localeCompare(right)).reverse()) {
    if (options.excludeRunId && runEntry === options.excludeRunId) {
      continue;
    }
    const runDir = join(cliRoot, runEntry);
    const manifestPath = join(runDir, 'manifest.json');
    const manifest = await readJsonFile<CliManifest>(manifestPath);
    if (!manifest) {
      continue;
    }

    const context = await readTaskCompatibilityContextFromManifest(
      manifestPath,
      runEntry,
      manifest,
      options
    );
    if (context) {
      discovered.push(context);
    }
  }

  return discovered;
}

async function readTaskCompatibilityContextFromManifest(
  manifestPath: string,
  fallbackRunId: string,
  manifest: CliManifest,
  options: {
    providerIntakeState?: ProviderIntakeState;
    controlWorkspacePath?: string | null;
  } = {}
): Promise<DiscoveredTaskCompatibilityContext | null> {
  const manifestRecord = manifest as unknown as Record<string, unknown>;
  const snapshot = buildSelectedRunManifestSnapshot(manifestRecord, manifestPath, fallbackRunId);
  if (!snapshot || isAuxiliaryProviderProofHarnessManifest(manifestRecord)) {
    return null;
  }

  const runDir = dirname(manifestPath);
  const control = normalizeControlState(
    await readJsonFile<ControlState>(join(runDir, 'control.json')),
    snapshot.runId
  );
  const questionSnapshot = await readJsonFile<{ questions?: QuestionRecord[] }>(join(runDir, 'questions.json'));
  const advisoryState = await readJsonFile<LinearAdvisoryStateSnapshot>(
    join(runDir, LINEAR_ADVISORY_STATE_FILE)
  );
  const providerLinearWorkerProof = await readProviderLinearWorkerProofForProjection(runDir);

  const context = buildProjectionContextFromParts(
    snapshot,
    {
      control,
      questions: Array.isArray(questionSnapshot?.questions) ? questionSnapshot.questions : [],
      runDir,
      trackedIssue: selectFreshLinearAdvisoryTrackedIssue(advisoryState),
      providerLinearWorkerProof
    },
    resolveRunsRootFromRunDir(runDir),
    options.controlWorkspacePath ?? resolveSafeLegacyWorkspacePathFromRunDir(runDir),
    findMatchingProviderIntakeClaim(options.providerIntakeState, snapshot, providerLinearWorkerProof),
    options.providerIntakeState ?? null
  );
  return context
    ? {
        context,
        retryFallbackEligible: isManifestRetryFallbackCandidate(manifestRecord)
      }
    : null;
}

async function reconcileProviderLinearWorkerDiscoveredContexts(
  discovered: DiscoveredTaskCompatibilityContext[],
  providerIntakeState: ProviderIntakeState | null,
  additionalContexts: ControlCompatibilitySourceContext[] = []
): Promise<DiscoveredTaskCompatibilityContext[]> {
  if (!providerIntakeState) {
    return discovered;
  }
  const discoveredContexts = discovered.map((candidate) => candidate.context);
  const allContexts = additionalContexts.concat(discoveredContexts);
  return await Promise.all(
    discovered.map(async (entry) => {
      const reconciliation = resolveProviderLinearWorkerRunArtifactReconciliation(
        entry.context,
        allContexts,
        providerIntakeState
      );
      if (!reconciliation) {
        return entry;
      }
      await writeProviderLinearWorkerRunArtifactReconciliation(
        entry.context.runDir,
        reconciliation
      ).catch(() => undefined);
      return {
        ...entry,
        context: applyProviderLinearWorkerRunArtifactReconciliation(
          entry.context,
          reconciliation
        )
      };
    })
  );
}

function resolveProviderLinearWorkerRunArtifactReconciliation(
  context: ControlCompatibilitySourceContext,
  allContexts: ControlCompatibilitySourceContext[],
  providerIntakeState: ProviderIntakeState
): ProviderLinearWorkerRunArtifactReconciliationRecord | null {
  if (
    !isProviderLinearWorkerReconciliationSource(context) ||
    !isActiveLookingProviderLinearWorkerManifestStatus(context.rawStatus)
  ) {
    return null;
  }
  const claim = findProviderLinearWorkerClaimForContext(providerIntakeState, context);
  if (claim && isActiveProviderLinearWorkerReconciliationClaim(claim)) {
    return null;
  }
  const replacementRun = findNewerTerminalProviderLinearWorkerContext(allContexts, context);
  const supersedingRunBoundClaim = !claim
    ? findNewerRunBoundProviderLinearWorkerClaimForContext(providerIntakeState, context)
    : null;
  const claimReconciliationReason = claim
    ? resolveProviderLinearWorkerClaimReconciliationReason(claim)
    : null;
  const absentClaimReconciliationReason = !claim
    ? resolveAbsentProviderLinearWorkerClaimReconciliationReason(
        providerIntakeState,
        context,
        replacementRun,
        supersedingRunBoundClaim
      )
    : null;
  const reason = claimReconciliationReason ?? absentClaimReconciliationReason;
  if (!reason) {
    return null;
  }
  const claimForRecord = claim ?? supersedingRunBoundClaim;
  const evidenceUpdatedAt = selectProviderLinearWorkerReconciliationEvidenceUpdatedAt(
    reason,
    claimForRecord,
    replacementRun,
    providerIntakeState
  );
  if (
    !isProviderLinearWorkerReconciliationEvidenceNewerThanContext(
      evidenceUpdatedAt,
      context,
      Boolean(replacementRun) || reason === 'provider_claim_active_newer_run'
    )
  ) {
    return null;
  }
  const reconciledStatus =
    replacementRun?.rawStatus ??
    (claim?.state === 'completed' ? 'succeeded' : 'cancelled');
  const recordedAt = evidenceUpdatedAt ?? context.updatedAt ?? context.startedAt ?? new Date(0).toISOString();
  const supersedingRunBoundClaimSummaryPrefix =
    supersedingRunBoundClaim && isActiveProviderIntakeClaim(supersedingRunBoundClaim)
      ? 'newer active claim run'
      : 'newer run-bound claim run';
  const summary =
    replacementRun
      ? `Provider worker artifact reconciled as ${reconciledStatus}: newer terminal run ${replacementRun.runId ?? 'unknown'} supersedes retained ${context.rawStatus} manifest.`
      : supersedingRunBoundClaim
        ? `Provider worker artifact reconciled as ${reconciledStatus}: ${supersedingRunBoundClaimSummaryPrefix} ${supersedingRunBoundClaim.run_id ?? 'unknown'} supersedes retained ${context.rawStatus} manifest.`
        : reason === 'provider_issue_removed'
          ? `Provider worker artifact reconciled as ${reconciledStatus}: provider intake removed this issue with no active claim.`
          : `Provider worker artifact reconciled as ${reconciledStatus}: provider claim is ${claimForRecord?.state ?? 'absent'} (${claimForRecord?.reason ?? reason}).`;
  return {
    schema_version: 1,
    kind: 'provider-linear-worker-run-artifact-reconciliation',
    status: 'reconciled',
    reconciled_status: reconciledStatus,
    reason,
    summary,
    recorded_at: recordedAt,
    manifest: {
      path: context.manifestPath ?? null,
      run_id: context.runId,
      task_id: context.taskId,
      status: context.rawStatus,
      updated_at: context.updatedAt
    },
    provider_claim: claimForRecord
      ? {
          state: claimForRecord.state,
          reason: claimForRecord.reason,
          issue_state: claimForRecord.issue_state,
          issue_state_type: claimForRecord.issue_state_type,
          updated_at: claimForRecord.updated_at,
          run_id: claimForRecord.run_id,
          run_manifest_path: claimForRecord.run_manifest_path
        }
      : null,
    replacement_run: replacementRun
      ? {
          run_id: replacementRun.runId,
          status: replacementRun.rawStatus,
          manifest_path: replacementRun.manifestPath ?? null,
          updated_at: replacementRun.updatedAt
        }
      : null
  };
}

function isActiveProviderLinearWorkerReconciliationClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason' | 'issue_state' | 'issue_state_type'>
): boolean {
  switch (claim.state) {
    case 'accepted':
    case 'starting':
    case 'running':
    case 'resuming':
    case 'resumable':
      return true;
    case 'handoff_failed':
      if (claim.reason === 'provider_issue_merge_closeout_action_required') {
        return false;
      }
      return !isTerminalProviderLinearIssueState(claim.issue_state, claim.issue_state_type);
    case 'released':
    case 'completed':
    case 'stale':
    case 'duplicate':
    case 'ignored':
    default:
      return false;
  }
}

function applyProviderLinearWorkerRunArtifactReconciliation(
  context: ControlCompatibilitySourceContext,
  reconciliation: ProviderLinearWorkerRunArtifactReconciliationRecord
): ControlCompatibilitySourceContext {
  return {
    ...context,
    rawStatus: reconciliation.reconciled_status,
    displayStatus: reconciliation.reconciled_status,
    statusReason: reconciliation.reason,
    completedAt: context.completedAt ?? reconciliation.recorded_at,
    summary: reconciliation.summary,
    lastError:
      reconciliation.reconciled_status === 'failed'
        ? context.lastError ?? reconciliation.summary
        : context.lastError,
    latestEvent: {
      ...(context.latestEvent ?? {
        requestedBy: null,
        reason: null
      }),
      at: reconciliation.recorded_at,
      event: reconciliation.reconciled_status,
      message: reconciliation.summary,
      reason: reconciliation.reason
    }
  };
}

async function writeProviderLinearWorkerRunArtifactReconciliation(
  runDir: string | null | undefined,
  reconciliation: ProviderLinearWorkerRunArtifactReconciliationRecord
): Promise<void> {
  if (!runDir) {
    return;
  }
  const targetPath = join(runDir, PROVIDER_LINEAR_WORKER_RECONCILIATION_FILENAME);
  const existing = await readJsonFile<ProviderLinearWorkerRunArtifactReconciliationRecord>(targetPath);
  if (JSON.stringify(existing) === JSON.stringify(reconciliation)) {
    return;
  }
  await writeJsonAtomic(targetPath, reconciliation);
}

function isActiveLookingProviderLinearWorkerManifestStatus(status: string): boolean {
  return status === 'in_progress' || status === 'launching';
}

function isProviderLinearWorkerReconciliationSource(
  context: Pick<
    ControlCompatibilitySourceContext,
    'issueProvider' | 'pipelineId' | 'pipelineTitle' | 'providerLinearWorkerProof'
  >
): boolean {
  if (context.issueProvider !== null && context.issueProvider !== 'linear') {
    return false;
  }
  return (
    context.pipelineId === PROVIDER_LINEAR_WORKER_PIPELINE_ID ||
    context.pipelineTitle === PROVIDER_LINEAR_WORKER_PIPELINE_TITLE ||
    context.providerLinearWorkerProof != null
  );
}

function findProviderLinearWorkerClaimForContext(
  providerIntakeState: ProviderIntakeState,
  context: ControlCompatibilitySourceContext
): ProviderIntakeClaimRecord | null {
  const candidates = providerIntakeState.claims.filter((claim) =>
    providerLinearWorkerClaimMatchesContext(claim, context)
  );
  return candidates.sort((left, right) => compareProviderLinearWorkerClaimForContext(left, right, context))[0] ?? null;
}

function compareProviderLinearWorkerClaimForContext(
  left: ProviderIntakeClaimRecord,
  right: ProviderIntakeClaimRecord,
  context: ControlCompatibilitySourceContext
): number {
  const leftRunIdentityMatch = providerLinearWorkerClaimRunIdentityMatchesContext(left, context);
  const rightRunIdentityMatch = providerLinearWorkerClaimRunIdentityMatchesContext(right, context);
  if (leftRunIdentityMatch !== rightRunIdentityMatch) {
    return leftRunIdentityMatch ? -1 : 1;
  }
  return compareIsoTimestamp(right.updated_at, left.updated_at);
}

function providerLinearWorkerClaimMatchesContext(
  claim: ProviderIntakeClaimRecord,
  context: ControlCompatibilitySourceContext
): boolean {
  if (claim.provider !== 'linear') {
    return false;
  }
  if (providerLinearWorkerClaimRunIdentityMatchesContext(claim, context)) {
    return true;
  }
  if (
    isProviderLinearWorkerRunBoundClaimAuthoritative(claim) &&
    providerLinearWorkerClaimHasRunIdentity(claim)
  ) {
    return false;
  }
  return providerLinearWorkerClaimIssueIdentityMatchesContext(claim, context);
}

function resolveProviderLinearWorkerClaimReconciliationReason(
  claim: ProviderIntakeClaimRecord
): string | null {
  if (claim.state === 'completed') {
    return 'provider_claim_completed';
  }
  if (
    claim.state === 'handoff_failed' &&
    (claim.reason === 'provider_issue_merge_closeout_action_required' ||
      isTerminalProviderLinearIssueState(claim.issue_state, claim.issue_state_type))
  ) {
    return 'provider_claim_handoff_failed';
  }
  if (claim.state === 'released') {
    const reason = claim.reason ?? '';
    if (isLiveRehydrateProviderLinearWorkerReleasedClaim(claim)) {
      return null;
    }
    if (
      reason.includes('not_active') ||
      reason.includes('not_mutable') ||
      reason.includes('assignee_changed') ||
      reason.includes('todo_blocked_by_non_terminal') ||
      isTerminalProviderLinearIssueState(claim.issue_state, claim.issue_state_type)
    ) {
      return 'provider_claim_released';
    }
  }
  if (claim.state === 'stale' || claim.state === 'duplicate' || claim.state === 'ignored') {
    return `provider_claim_${claim.state}`;
  }
  return null;
}

function isLiveRehydrateProviderLinearWorkerReleasedClaim(
  claim: Pick<ProviderIntakeClaimRecord, 'reason' | 'issue_state' | 'issue_state_type'>
): boolean {
  if (!isProviderLinearWorkerReleasedLiveRehydrateReason(claim.reason)) {
    return false;
  }
  const workflowState = classifyProviderLinearWorkflowState({
    state: claim.issue_state,
    state_type: claim.issue_state_type
  });
  return workflowState.isActive && !workflowState.isTodo;
}

function isProviderLinearWorkerReleasedLiveRehydrateReason(
  reason: string | null | undefined
): boolean {
  return (
    reason === 'provider_issue_released:not_active' ||
    isProviderLinearWorkerReleasedPendingReopenReason(reason)
  );
}

function isProviderLinearWorkerReleasedPendingReopenReason(
  reason: string | null | undefined
): boolean {
  return (
    typeof reason === 'string' &&
    reason.startsWith('provider_issue_released_pending_reopen:')
  );
}

function resolveAbsentProviderLinearWorkerClaimReconciliationReason(
  providerIntakeState: ProviderIntakeState,
  context: ControlCompatibilitySourceContext,
  replacementRun: ControlCompatibilitySourceContext | null,
  supersedingActiveClaim: ProviderIntakeClaimRecord | null
): string | null {
  if (replacementRun) {
    return 'provider_claim_absent_newer_terminal_run';
  }
  if (supersedingActiveClaim) {
    return 'provider_claim_active_newer_run';
  }
  if (providerLinearWorkerRemovedIntakeReasonMatchesContext(providerIntakeState, context)) {
    return 'provider_issue_removed';
  }
  return null;
}

function providerLinearWorkerRemovedIntakeReasonMatchesContext(
  providerIntakeState: ProviderIntakeState,
  context: ControlCompatibilitySourceContext
): boolean {
  if (providerIntakeState.latest_reason !== 'provider_issue_removed') {
    return false;
  }
  const providerIssueKeys = buildProviderLinearWorkerContextProviderIssueKeys(context);
  return Boolean(
    providerIntakeState.latest_provider_key &&
    providerIssueKeys.includes(providerIntakeState.latest_provider_key)
  );
}

function buildProviderLinearWorkerContextProviderIssueKeys(
  context: ControlCompatibilitySourceContext
): string[] {
  const identities = [context.issueId, context.issueIdentifier].filter((value): value is string =>
    Boolean(value && !isProjectionFallbackIdentityValue(value, context))
  );
  return Array.from(
    new Set(identities.map((identity) => buildProviderIssueKey('linear', identity)))
  );
}

function selectProviderLinearWorkerReconciliationEvidenceUpdatedAt(
  reason: string,
  claim: ProviderIntakeClaimRecord | null,
  replacementRun: ControlCompatibilitySourceContext | null,
  providerIntakeState: ProviderIntakeState
): string | null {
  const replacementRunEvidenceAt = replacementRun
    ? selectProviderLinearWorkerReconciliationRunEvidenceTimestamp(replacementRun)
    : null;
  const claimRunEvidenceAt = claim
    ? selectProviderLinearWorkerClaimRunEvidenceTimestamp(claim)
    : null;
  if (reason === 'provider_claim_absent_newer_terminal_run') {
    return replacementRunEvidenceAt;
  }
  if (reason === 'provider_issue_removed') {
    return providerIntakeState.updated_at;
  }
  return selectLatestIsoTimestamp(claim?.updated_at ?? null, claimRunEvidenceAt, replacementRunEvidenceAt);
}

function selectProviderLinearWorkerReconciliationRunEvidenceTimestamp(
  context: ControlCompatibilitySourceContext
): string | null {
  return selectLatestIsoTimestamp(
    context.updatedAt,
    selectProviderLinearWorkerContextChronologyTimestamp(context)
  );
}

function isProviderLinearWorkerReconciliationEvidenceNewerThanContext(
  evidenceUpdatedAt: string | null,
  context: ControlCompatibilitySourceContext,
  useRunChronologyBoundary = false
): boolean {
  if (!evidenceUpdatedAt) {
    return false;
  }
  const contextEvidenceBoundary = useRunChronologyBoundary
    ? selectProviderLinearWorkerContextChronologyTimestamp(context) ?? context.updatedAt
    : selectLatestIsoTimestamp(context.updatedAt, context.startedAt);
  return !contextEvidenceBoundary || compareIsoTimestamp(evidenceUpdatedAt, contextEvidenceBoundary) > 0;
}

function isTerminalProviderLinearIssueState(
  issueState: string | null | undefined,
  issueStateType: string | null | undefined
): boolean {
  return classifyProviderLinearWorkflowState({
    state: issueState,
    state_type: issueStateType
  }).isTerminal;
}

function findNewerTerminalProviderLinearWorkerContext(
  contexts: ControlCompatibilitySourceContext[],
  context: ControlCompatibilitySourceContext
): ControlCompatibilitySourceContext | null {
  return contexts
    .filter((candidate) =>
      candidate !== context &&
      isProviderLinearWorkerReconciliationSource(candidate) &&
      isTerminalRunStatus(candidate.rawStatus) &&
      providerLinearWorkerContextsShareIssueIdentity(candidate, context) &&
      isProviderLinearWorkerContextChronologicallyNewer(candidate, context)
    )
    .sort(compareProviderLinearWorkerContextChronologyDesc)[0] ?? null;
}

function compareProviderLinearWorkerContextChronologyDesc(
  left: ControlCompatibilitySourceContext,
  right: ControlCompatibilitySourceContext
): number {
  const chronologyComparison = compareIsoTimestamp(
    selectProviderLinearWorkerContextChronologyTimestamp(right),
    selectProviderLinearWorkerContextChronologyTimestamp(left)
  );
  return chronologyComparison !== 0
    ? chronologyComparison
    : compareIsoTimestamp(right.updatedAt, left.updatedAt);
}

function isProviderLinearWorkerContextChronologicallyNewer(
  candidate: ControlCompatibilitySourceContext,
  context: ControlCompatibilitySourceContext
): boolean {
  const candidateStartedAt = selectProviderLinearWorkerContextChronologyTimestamp(candidate);
  const contextStartedAt = selectProviderLinearWorkerContextChronologyTimestamp(context);
  if (!candidateStartedAt) {
    return false;
  }
  if (!contextStartedAt) {
    const contextUpdatedAt = selectLatestIsoTimestamp(context.updatedAt, context.startedAt);
    return !contextUpdatedAt || compareIsoTimestamp(candidateStartedAt, contextUpdatedAt) > 0;
  }
  return compareIsoTimestamp(candidateStartedAt, contextStartedAt) > 0;
}

function selectProviderLinearWorkerContextChronologyTimestamp(
  context: ControlCompatibilitySourceContext
): string | null {
  return selectLatestIsoTimestamp(
    context.startedAt,
    parseProviderLinearWorkerRunIdTimestamp(context.runId),
    parseProviderLinearWorkerRunPathTimestamp(context.manifestPath ?? context.runDir ?? null)
  );
}

function parseProviderLinearWorkerRunPathTimestamp(pathValue: string | null | undefined): string | null {
  if (!pathValue) {
    return null;
  }
  const normalized = pathValue.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  const manifestIndex = segments.lastIndexOf('manifest.json');
  if (manifestIndex > 0) {
    return parseProviderLinearWorkerRunIdTimestamp(segments[manifestIndex - 1]);
  }
  return parseProviderLinearWorkerRunIdTimestamp(segments[segments.length - 1]);
}

function parseProviderLinearWorkerRunIdTimestamp(runId: string | null | undefined): string | null {
  if (!runId) {
    return null;
  }
  const match = runId.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/);
  if (!match) {
    return null;
  }
  const iso = match[0].replace(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/,
    '$1T$2:$3:$4.$5Z'
  );
  return Number.isFinite(Date.parse(iso)) ? iso : null;
}

function findNewerRunBoundProviderLinearWorkerClaimForContext(
  providerIntakeState: ProviderIntakeState,
  context: ControlCompatibilitySourceContext
): ProviderIntakeClaimRecord | null {
  return providerIntakeState.claims
    .filter((claim) =>
      claim.provider === 'linear' &&
      isProviderLinearWorkerRunBoundClaimAuthoritative(claim) &&
      providerLinearWorkerClaimHasRunIdentity(claim) &&
      !providerLinearWorkerClaimRunIdentityMatchesContext(claim, context) &&
      providerLinearWorkerClaimIssueIdentityMatchesContext(claim, context) &&
      isProviderLinearWorkerRunBoundClaimNewerThanContext(claim, context)
    )
    .sort(compareProviderLinearWorkerRunBoundClaimDesc)[0] ?? null;
}

function isProviderLinearWorkerRunBoundClaimNewerThanContext(
  claim: ProviderIntakeClaimRecord,
  context: ControlCompatibilitySourceContext
): boolean {
  const claimRunEvidenceAt = selectProviderLinearWorkerClaimRunEvidenceTimestamp(claim);
  const contextRunEvidenceAt = selectProviderLinearWorkerContextChronologyTimestamp(context);
  if (claimRunEvidenceAt && contextRunEvidenceAt) {
    return compareIsoTimestamp(claimRunEvidenceAt, contextRunEvidenceAt) > 0;
  }
  if (claimRunEvidenceAt && !contextRunEvidenceAt) {
    return true;
  }
  return compareIsoTimestamp(claim.updated_at, context.updatedAt) > 0;
}

function compareProviderLinearWorkerRunBoundClaimDesc(
  left: ProviderIntakeClaimRecord,
  right: ProviderIntakeClaimRecord
): number {
  const chronologyComparison = compareIsoTimestamp(
    selectProviderLinearWorkerClaimRunEvidenceTimestamp(right),
    selectProviderLinearWorkerClaimRunEvidenceTimestamp(left)
  );
  return chronologyComparison !== 0
    ? chronologyComparison
    : compareIsoTimestamp(right.updated_at, left.updated_at);
}

function selectProviderLinearWorkerClaimRunEvidenceTimestamp(
  claim: Pick<ProviderIntakeClaimRecord, 'run_id' | 'run_manifest_path'>
): string | null {
  return selectLatestIsoTimestamp(
    parseProviderLinearWorkerRunIdTimestamp(claim.run_id),
    parseProviderLinearWorkerRunPathTimestamp(claim.run_manifest_path)
  );
}

function isProviderLinearWorkerRunBoundClaimAuthoritative(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'retry_queued' | 'issue_state' | 'issue_state_type'
  >
): boolean {
  return (
    isActiveProviderIntakeClaim(claim) ||
    (claim.state === 'released' && isLiveRehydrateProviderLinearWorkerReleasedClaim(claim))
  );
}

function providerLinearWorkerClaimHasRunIdentity(claim: ProviderIntakeClaimRecord): boolean {
  return Boolean(claim.run_id || claim.run_manifest_path);
}

function providerLinearWorkerClaimRunIdentityMatchesContext(
  claim: ProviderIntakeClaimRecord,
  context: ControlCompatibilitySourceContext
): boolean {
  const manifestPath = context.manifestPath ?? null;
  return Boolean(
    (claim.run_id && claim.run_id === context.runId) ||
    (claim.run_manifest_path && manifestPath && claim.run_manifest_path === manifestPath)
  );
}

function providerLinearWorkerClaimIssueIdentityMatchesContext(
  claim: ProviderIntakeClaimRecord,
  context: ControlCompatibilitySourceContext
): boolean {
  return Boolean(
    (claim.issue_id && claim.issue_id === context.issueId) ||
    (claim.issue_identifier && claim.issue_identifier === context.issueIdentifier) ||
    (claim.task_id && claim.task_id === context.taskId)
  );
}

function providerLinearWorkerContextsShareIssueIdentity(
  left: ControlCompatibilitySourceContext,
  right: ControlCompatibilitySourceContext
): boolean {
  return Boolean(
    (left.issueId && right.issueId && left.issueId === right.issueId) ||
    (left.issueIdentifier && right.issueIdentifier && left.issueIdentifier === right.issueIdentifier) ||
    (left.taskId && right.taskId && left.taskId === right.taskId)
  );
}

function selectLatestIsoTimestamp(...values: Array<string | null | undefined>): string | null {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => compareIsoTimestamp(right, left))[0] ?? null;
}

async function readDirectoryNames(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readProviderLinearWorkerProofForProjection(
  runDir: string
): Promise<ProviderLinearWorkerProof | null> {
  const proof = await readJsonFile<ProviderLinearWorkerProof>(
    join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME)
  );
  const refreshPlan = await resolveProviderLinearWorkerProjectionProofRefreshPlan(runDir, proof);
  if (!refreshPlan) {
    return proof;
  }
  return (
    (await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      undefined,
      undefined,
      process.env,
      {
        updatedAtComparisonScope: refreshPlan.updatedAtComparisonScope,
        skipSessionLogHydration: refreshPlan.skipSessionLogHydration
      }
    ).catch(() => proof)) ?? proof
  );
}

async function resolveProviderLinearWorkerProjectionProofRefreshPlan(
  runDir: string,
  proof: ProviderLinearWorkerProof | null
): Promise<
  | {
      updatedAtComparisonScope: 'full' | 'telemetry';
      skipSessionLogHydration: boolean;
    }
  | null
> {
  if (!proof) {
    return null;
  }
  const hasRetiredResidue =
    hasProviderLinearWorkerProjectionRetiredChildLaneResidue(proof) ||
    (await hasProviderLinearWorkerProjectionRetiredChildLaneResidueInLedger(runDir));
  const telemetryGap = hasProviderLinearWorkerProjectionTelemetryGap(proof);
  const canSkipSessionLogHydration = canSkipProviderLinearWorkerProjectionSessionLogHydration(
    proof,
    telemetryGap
  );
  if (!isProviderLinearWorkerProjectionRefreshEligible(proof)) {
    return hasRetiredResidue
      ? {
          updatedAtComparisonScope: 'full',
          skipSessionLogHydration: canSkipSessionLogHydration
        }
      : null;
  }
  if (hasRetiredResidue) {
    return {
      updatedAtComparisonScope: 'full',
      skipSessionLogHydration: canSkipSessionLogHydration
    };
  }
  if (hasProviderLinearWorkerProjectionReservationPlaceholder(proof)) {
    return {
      updatedAtComparisonScope: 'full',
      skipSessionLogHydration: canSkipSessionLogHydration
    };
  }
  if (hasProviderLinearWorkerProjectionActivePendingChildLane(proof)) {
    return {
      updatedAtComparisonScope: 'full',
      skipSessionLogHydration: canSkipSessionLogHydration
    };
  }
  if (await hasProviderLinearWorkerProjectionActivePendingChildLaneInLedger(runDir)) {
    return {
      updatedAtComparisonScope: 'full',
      skipSessionLogHydration: canSkipSessionLogHydration
    };
  }
  return telemetryGap
    ? {
        updatedAtComparisonScope: 'telemetry',
        skipSessionLogHydration: false
      }
    : null;
}

function isProviderLinearWorkerProjectionRefreshEligible(
  proof: ProviderLinearWorkerProof
): boolean {
  return (
    proof.owner_status === 'in_progress' &&
    (proof.owner_phase === 'turn_running' || proof.owner_phase === 'turn_completed')
  );
}

function hasProviderLinearWorkerProjectionReservationPlaceholder(
  proof: ProviderLinearWorkerProof
): boolean {
  return hasProviderLinearWorkerProjectionReservationPlaceholderInRecords(proof.child_lanes);
}

function hasProviderLinearWorkerProjectionActivePendingChildLane(
  proof: ProviderLinearWorkerProof
): boolean {
  return hasProviderLinearWorkerProjectionActivePendingChildLaneInRecords(proof.child_lanes);
}

function hasProviderLinearWorkerProjectionRetiredChildLaneResidue(
  proof: ProviderLinearWorkerProof
): boolean {
  return hasProviderLinearWorkerProjectionRetiredChildLaneResidueInRecords(proof.child_lanes);
}

function hasProviderLinearWorkerProjectionTelemetryGap(
  proof: ProviderLinearWorkerProof
): boolean {
  const tokens = proof.tokens ?? null;
  const hasTokens =
    tokens?.input_tokens != null ||
    tokens?.output_tokens != null ||
    tokens?.total_tokens != null ||
    tokens?.reasoning_output_tokens != null;
  return (
    !proof.latest_turn_id ||
    !proof.latest_session_id ||
    !hasTokens ||
    proof.rate_limits == null ||
    hasProviderLinearWorkerProjectionSessionLogHydrationGap(proof) ||
    hasProviderLinearWorkerProjectionAppServerSupervisionGap(proof)
  );
}

function hasProviderLinearWorkerProjectionAppServerSupervisionGap(
  proof: ProviderLinearWorkerProof
): boolean {
  const selectedRuntimeMode =
    proof.runtime?.selected_mode ?? proof.auth_provenance?.runtime_mode ?? null;
  const requestedRuntimeMode = proof.runtime?.requested_mode ?? null;
  const fallback = proof.runtime?.fallback ?? null;
  if (
    selectedRuntimeMode !== 'appserver' &&
    requestedRuntimeMode !== 'appserver' &&
    fallback?.from_mode !== 'appserver' &&
    fallback?.to_mode !== 'appserver'
  ) {
    return false;
  }
  const supervision = proof.appserver_supervision ?? null;
  if (!supervision) {
    return true;
  }
  const expectedSessionLogTruthRetained = selectedRuntimeMode === 'appserver';
  return (
    supervision.selected_runtime?.selected_mode !== selectedRuntimeMode ||
    supervision.selected_runtime?.requested_mode !== requestedRuntimeMode ||
    supervision.thread_id !== proof.thread_id ||
    supervision.latest_turn_id !== proof.latest_turn_id ||
    supervision.latest_session_id !== proof.latest_session_id ||
    supervision.session_log_thread_id !== (proof.session_log_thread_id ?? null) ||
    supervision.session_log_turn_id !== (proof.session_log_turn_id ?? null) ||
    supervision.session_log_session_id !== (proof.session_log_session_id ?? null) ||
    supervision.turn_persistence_status == null ||
    supervision.pagination_status == null ||
    supervision.resume_status == null ||
    supervision.fork_status == null ||
    supervision.jsonl_truth_retained !== true ||
    supervision.session_log_truth_retained !== expectedSessionLogTruthRetained
  );
}

function hasProviderLinearWorkerProjectionSessionLogHydrationGap(
  proof: ProviderLinearWorkerProof
): boolean {
  const runtimeMode =
    proof.runtime?.selected_mode ?? proof.auth_provenance?.runtime_mode ?? null;
  if (runtimeMode !== 'appserver') {
    return false;
  }
  if (!proof.thread_id || !proof.latest_turn_id || !proof.latest_session_id) {
    return false;
  }
  return (
    proof.session_log_thread_id !== proof.thread_id ||
    proof.session_log_turn_id !== proof.latest_turn_id ||
    proof.session_log_session_id !== proof.latest_session_id
  );
}

function canSkipProviderLinearWorkerProjectionSessionLogHydration(
  proof: ProviderLinearWorkerProof,
  telemetryGap: boolean
): boolean {
  if (proof.owner_phase !== 'turn_completed') {
    return false;
  }
  const currentTurnActivity = proof.current_turn_activity ?? null;
  return !(
    telemetryGap ||
    !proof.last_event_at ||
    (!proof.last_event && !proof.last_message) ||
    currentTurnActivity == null ||
    currentTurnActivity.recorded_at == null ||
    currentTurnActivity.turn_id !== proof.latest_turn_id ||
    currentTurnActivity.session_id !== proof.latest_session_id ||
    proof.auth_provenance == null
  );
}

async function hasProviderLinearWorkerProjectionActivePendingChildLaneInLedger(
  runDir: string
): Promise<boolean> {
  const records = await readJsonFile<unknown>(
    join(runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME)
  );
  return hasProviderLinearWorkerProjectionActivePendingChildLaneInRecords(records);
}

async function hasProviderLinearWorkerProjectionRetiredChildLaneResidueInLedger(
  runDir: string
): Promise<boolean> {
  const records = await readJsonFile<unknown>(
    join(runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME)
  );
  return hasProviderLinearWorkerProjectionRetiredChildLaneResidueInRecords(records);
}

function hasProviderLinearWorkerProjectionReservationPlaceholderInRecords(
  records: unknown
): boolean {
  if (!Array.isArray(records)) {
    return false;
  }
  return records.some((childLane) => {
    if (!isRecord(childLane)) {
      return false;
    }
    const runId = readStringValue(childLane, 'run_id');
    const summary = readStringValue(childLane, 'summary');
    const status = readStringValue(childLane, 'status');
    const pipelineId = readStringValue(childLane, 'pipeline_id');
    const decision = readStringValue(childLane, 'decision');
    return (
      pipelineId === PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID &&
      decision === 'pending' &&
      (
        status === 'launching' ||
        Boolean(runId?.startsWith('launching-')) ||
        summary === PROVIDER_LINEAR_CHILD_LANE_RESERVED_SUMMARY
      )
    );
  });
}

function hasProviderLinearWorkerProjectionActivePendingChildLaneInRecords(
  records: unknown
): boolean {
  if (!Array.isArray(records)) {
    return false;
  }
  return records.some((childLane) => {
    if (!isRecord(childLane)) {
      return false;
    }
    const status = readStringValue(childLane, 'status');
    return (
      readStringValue(childLane, 'pipeline_id') === PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID &&
      readStringValue(childLane, 'decision') === 'pending' &&
      !isProviderLinearWorkerProjectionTerminalChildLaneStatus(status ?? null)
    );
  });
}

function hasProviderLinearWorkerProjectionRetiredChildLaneResidueInRecords(
  records: unknown
): boolean {
  if (!Array.isArray(records)) {
    return false;
  }
  return records.some((childLane) => {
    if (!isRecord(childLane)) {
      return false;
    }
    const status = readStringValue(childLane, 'status');
    const summary = readStringValue(childLane, 'summary');
    const decision = readStringValue(childLane, 'decision');
    const inFlightAction = readStringValue(childLane, 'in_flight_action');
    const hasActiveLookingStatus =
      status === 'launching' ||
      status === 'in_progress' ||
      status === 'running' ||
      status === 'queued';
    return (
      readStringValue(childLane, 'pipeline_id') === PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID &&
      (decision === 'invalidated' || decision === 'rejected') &&
      (
        hasActiveLookingStatus ||
        Boolean(inFlightAction) ||
        isProviderLinearWorkerProjectionActiveLookingChildLaneSummary(summary)
      )
    );
  });
}

function isProviderLinearWorkerProjectionActiveLookingChildLaneSummary(
  summary: string | null | undefined
): boolean {
  if (!summary) {
    return false;
  }
  const normalized = summary.toLowerCase();
  return (
    summary === PROVIDER_LINEAR_CHILD_LANE_RESERVED_SUMMARY ||
    normalized.includes(' is running') ||
    normalized.includes(' is queued') ||
    normalized.includes(' status is in_progress') ||
    normalized.includes(' status is running') ||
    normalized.includes(' status is queued') ||
    normalized.includes(' status is launching') ||
    normalized.includes('reserved before child run startup')
  );
}

function isProviderLinearWorkerProjectionTerminalChildLaneStatus(status: string | null): boolean {
  return (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'completed' ||
    status === 'canceled' ||
    status === 'cancelled' ||
    status === 'invalidated' ||
    status === 'rejected'
  );
}

function isManifestRetryFallbackCandidate(manifestRecord: Record<string, unknown>): boolean {
  if (readStringValue(manifestRecord, 'issue_provider', 'issueProvider') !== 'linear') {
    return false;
  }
  const status = readStringValue(manifestRecord, 'status');
  return status === 'failed' || status === 'cancelled' || status === 'canceled';
}

function findMatchingProviderIntakeClaim(
  state: ProviderIntakeState | null | undefined,
  snapshot: SelectedRunManifestSnapshot | null,
  providerLinearWorkerProof: ProviderLinearWorkerProof | null = null
): ProviderIntakeClaimRecord | null {
  if (!state || !snapshot) {
    return null;
  }
  const claimMatchSource = buildSelectedRunProviderClaimMatchSource(snapshot, providerLinearWorkerProof);
  const issueScopedClaim = findIssueScopedProviderIntakeClaim(state, claimMatchSource);
  if (issueScopedClaim) {
    return providerIntakeClaimCanFallbackByIssue(issueScopedClaim, claimMatchSource) ? issueScopedClaim : null;
  }
  const matchedClaims = state.claims
    .filter((claim) => providerIntakeClaimMatchesSelectedRun(claim, claimMatchSource))
    .sort((left, right) => compareProviderIntakeClaimSpecificity(right, left, claimMatchSource));
  return matchedClaims[0] ?? null;
}

function findIssueScopedProviderIntakeClaim(
  state: ProviderIntakeState,
  snapshot: SelectedRunProviderClaimMatchSource
): ProviderIntakeClaimRecord | null {
  if (snapshot.issueId) {
    const byIssueId = readProviderIntakeClaim(state, buildProviderIssueKey('linear', snapshot.issueId));
    if (byIssueId) {
      return byIssueId;
    }
  }
  return state.claims.find((claim) => claim.issue_identifier === snapshot.issueIdentifier) ?? null;
}

function providerIntakeClaimMatchesSelectedRun(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'issue_id' | 'issue_identifier' | 'run_manifest_path' | 'run_id' | 'task_id'
  >,
  snapshot: SelectedRunProviderClaimMatchSource
): boolean {
  if (claim.run_manifest_path && claim.run_manifest_path === snapshot.manifestPath) {
    return true;
  }
  if (!providerIntakeClaimMatchesIssueIdentity(claim, snapshot)) {
    return providerIntakeClaimMatchesSyntheticFallbackTaskBinding(claim, snapshot);
  }
  if (claim.run_id && snapshot.runId) {
    if (claim.task_id && snapshot.taskId && claim.task_id !== snapshot.taskId) {
      return false;
    }
    return claim.run_id === snapshot.runId;
  }
  if (claim.task_id && snapshot.taskId) {
    return claim.task_id === snapshot.taskId;
  }
  return false;
}

function compareProviderIntakeClaimSpecificity(
  left: Pick<
    ProviderIntakeClaimRecord,
    'issue_id' | 'issue_identifier' | 'run_manifest_path' | 'run_id' | 'task_id'
  >,
  right: Pick<
    ProviderIntakeClaimRecord,
    'issue_id' | 'issue_identifier' | 'run_manifest_path' | 'run_id' | 'task_id'
  >,
  snapshot: SelectedRunProviderClaimMatchSource
): number {
  const leftPriority = scoreProviderIntakeClaimSpecificity(left, snapshot);
  const rightPriority = scoreProviderIntakeClaimSpecificity(right, snapshot);
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  const leftTaskLength = left.task_id?.length ?? 0;
  const rightTaskLength = right.task_id?.length ?? 0;
  if (leftTaskLength !== rightTaskLength) {
    return leftTaskLength - rightTaskLength;
  }
  return (left.issue_identifier ?? '').localeCompare(right.issue_identifier ?? '');
}

function scoreProviderIntakeClaimSpecificity(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'issue_id' | 'issue_identifier' | 'run_manifest_path' | 'run_id' | 'task_id'
  >,
  snapshot: SelectedRunProviderClaimMatchSource
): number {
  if (claim.run_manifest_path && claim.run_manifest_path === snapshot.manifestPath) {
    return 4;
  }
  if (claim.run_id && snapshot.runId && claim.run_id === snapshot.runId) {
    return 3;
  }
  if (claim.task_id && snapshot.taskId && claim.task_id === snapshot.taskId) {
    return 2;
  }
  if (providerIntakeClaimMatchesSyntheticFallbackTaskBinding(claim, snapshot)) {
    return 1;
  }
  return 0;
}

function providerIntakeClaimCanFallbackByIssue(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'issue_id' | 'issue_identifier' | 'run_manifest_path' | 'run_id' | 'task_id'
  >,
  snapshot: SelectedRunProviderClaimMatchSource
): boolean {
  return (
    providerIntakeClaimMatchesSelectedRun(claim, snapshot) ||
    (!claim.run_manifest_path && !claim.run_id && !claim.task_id)
  );
}

function providerIntakeClaimMatchesIssueIdentity(
  claim: Pick<ProviderIntakeClaimRecord, 'issue_id' | 'issue_identifier'>,
  snapshot: Pick<SelectedRunManifestSnapshot, 'issueId' | 'issueIdentifier'>
): boolean {
  return (
    (claim.issue_id != null && snapshot.issueId != null && claim.issue_id === snapshot.issueId) ||
    claim.issue_identifier === snapshot.issueIdentifier
  );
}

function providerIntakeClaimMatchesSyntheticFallbackTaskBinding(
  claim: Pick<ProviderIntakeClaimRecord, 'issue_id' | 'task_id'>,
  snapshot: SelectedRunProviderClaimMatchSource
): boolean {
  if (!claim.task_id || !snapshot.taskId) {
    return false;
  }
  if (!hasProviderLinearClaimBindingProvenance(snapshot, snapshot.providerLinearWorkerProof)) {
    return false;
  }
  if (claim.task_id !== buildProviderFallbackTaskId({ id: claim.issue_id })) {
    return false;
  }
  if (snapshot.taskId === claim.task_id) {
    return !hasAuthoritativeProjectionIssueIdentity(snapshot);
  }
  const pipelineId = readStringValue(snapshot.manifestRecord, 'pipeline_id', 'pipelineId') ?? null;
  return (
    matchesSyntheticProviderChildTaskId(claim.task_id, snapshot.taskId, pipelineId) &&
    !hasAuthoritativeProjectionIssueIdentity(snapshot)
  );
}

function isProviderLinearChildPipelineId(pipelineId: string | null): boolean {
  return pipelineId !== null && PROVIDER_LINEAR_CHILD_PIPELINE_IDS.has(pipelineId);
}

function matchesSyntheticProviderChildTaskId(
  claimTaskId: string,
  snapshotTaskId: string,
  pipelineId: string | null
): boolean {
  if (!isProviderLinearChildPipelineId(pipelineId)) {
    return false;
  }
  if (pipelineId === 'provider-linear-child-lane') {
    return snapshotTaskId.startsWith(`${claimTaskId}-`);
  }
  return snapshotTaskId === `${claimTaskId}-${pipelineId}`;
}

function hasProviderLinearClaimBindingProvenance(
  snapshot: Pick<SelectedRunManifestSnapshot, 'issueProvider' | 'manifestRecord'>,
  providerLinearWorkerProof: ProviderLinearWorkerProof | null
): boolean {
  if (snapshot.issueProvider !== null && snapshot.issueProvider !== 'linear') {
    return false;
  }
  const pipelineId = readStringValue(snapshot.manifestRecord, 'pipeline_id', 'pipelineId') ?? null;
  const pipelineTitle =
    readStringValue(snapshot.manifestRecord, 'pipeline_title', 'pipelineTitle') ?? null;
  return (
    pipelineId === PROVIDER_LINEAR_WORKER_PIPELINE_ID ||
    pipelineTitle === PROVIDER_LINEAR_WORKER_PIPELINE_TITLE ||
    providerLinearWorkerProof != null ||
    (snapshot.issueProvider === 'linear' && isProviderLinearChildPipelineId(pipelineId))
  );
}

function buildSelectedRunProviderClaimMatchSource(
  snapshot: SelectedRunManifestSnapshot,
  providerLinearWorkerProof: ProviderLinearWorkerProof | null
): SelectedRunProviderClaimMatchSource {
  return {
    issueId: snapshot.issueId,
    issueIdentifier: snapshot.issueIdentifier,
    issueProvider: snapshot.issueProvider,
    manifestPath: snapshot.manifestPath,
    manifestRecord: snapshot.manifestRecord,
    runId: snapshot.runId,
    taskId: snapshot.taskId,
    providerLinearWorkerProof
  };
}

function hasAuthoritativeProjectionIssueIdentity(
  snapshot: Pick<SelectedRunManifestSnapshot, 'issueId' | 'issueIdentifier' | 'taskId' | 'runId'>
): boolean {
  if (snapshot.issueIdentifier && !isProjectionFallbackIdentityValue(snapshot.issueIdentifier, snapshot)) {
    return true;
  }
  if (snapshot.issueId && !isProjectionFallbackIdentityValue(snapshot.issueId, snapshot)) {
    return true;
  }
  return false;
}

function buildProviderRetryState(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'retry_queued' | 'retry_attempt' | 'retry_due_at' | 'retry_error'
  > | null
): ControlCompatibilitySourceContext['providerRetryState'] {
  if (!claim) {
    return null;
  }
  const active = claim.retry_queued === true;
  const attempt = claim.retry_attempt ?? null;
  const dueAt = claim.retry_due_at ?? null;
  const error = claim.retry_error ?? null;
  if (!active && attempt === null && dueAt === null && error === null) {
    return null;
  }
  return {
    active,
    attempt,
    due_at: dueAt,
    error
  };
}

async function buildProviderRetryContextFromClaim(
  context: SelectedRunProjectionContext,
  claim: ProviderIntakeClaimRecord
): Promise<ControlCompatibilitySourceContext> {
  const retryLatestEvent =
    claim.reason !== null
      ? {
          at: claim.updated_at,
          event: claim.state,
          message: claim.reason,
          requestedBy: null,
          reason: claim.reason
        }
      : null;
  const snapshot = claim.run_manifest_path
    ? await readManifestSnapshotForPath(claim.run_manifest_path, claim.run_id ?? null)
    : null;
  const controlWorkspacePath = await resolveControlWorkspacePath(context);
  if (!snapshot) {
    return {
      issueProvider: claim.provider,
      issueIdentifier: claim.issue_identifier,
      issueId: claim.issue_id,
      taskId: claim.task_id,
      runId: claim.run_id,
      lookupAliases: buildProjectionLookupAliases({
        issueIdentifier: claim.issue_identifier,
        issueId: claim.issue_id,
        taskId: claim.task_id,
        runId: claim.run_id
      }),
      rawStatus: claim.state,
      displayStatus: 'retrying',
      statusReason: claim.reason,
      startedAt: claim.accepted_at,
      updatedAt: claim.updated_at,
      completedAt: null,
      summary: claim.reason,
      lastError: claim.retry_error ?? null,
      latestAction: null,
      latestEvent: retryLatestEvent,
      workspacePath: resolveRetryWorkspacePath(claim, controlWorkspacePath),
      pipelineTitle: null,
      stages: [],
      approvalsTotal: 0,
      manifestPath: claim.run_manifest_path,
      runDir: claim.run_manifest_path ? dirname(claim.run_manifest_path) : null,
      questionSummary: {
        queuedCount: 0,
        latestQuestion: null
      },
      tracked: null,
      compatibilityState: claim.issue_state,
      providerLinearWorkerProof: null,
      providerDebugSnapshot: buildProviderIssueDebugSnapshot({
        claim,
        rehydrated_at: context.providerIntakeState?.rehydrated_at ?? null
      }),
      providerRetryState: buildProviderRetryState(claim)
    };
  }

  const parts = await resolveProjectionContextParts(context, snapshot);
  const base =
    buildProjectionContextFromParts(
      snapshot,
      parts,
      resolveRunsRootFromRunDir(context.paths.runDir),
      controlWorkspacePath,
      claim,
      context.providerIntakeState ?? null
    ) ??
    null;
  if (!base) {
    return {
      issueProvider: claim.provider,
      issueIdentifier: claim.issue_identifier,
      issueId: claim.issue_id,
      taskId: claim.task_id,
      runId: claim.run_id,
      lookupAliases: buildProjectionLookupAliases({
        issueIdentifier: claim.issue_identifier,
        issueId: claim.issue_id,
        taskId: claim.task_id,
        runId: claim.run_id
      }),
      rawStatus: claim.state,
      displayStatus: 'retrying',
      statusReason: claim.reason,
      startedAt: claim.accepted_at,
      updatedAt: claim.updated_at,
      completedAt: null,
      summary: claim.reason,
      lastError: claim.retry_error ?? null,
      latestAction: null,
      latestEvent: null,
      workspacePath: resolveRetryWorkspacePath(claim, controlWorkspacePath),
      pipelineTitle: null,
      stages: [],
      approvalsTotal: 0,
      manifestPath: claim.run_manifest_path,
      runDir: claim.run_manifest_path ? dirname(claim.run_manifest_path) : null,
      questionSummary: {
        queuedCount: 0,
        latestQuestion: null
      },
      tracked: null,
      compatibilityState: claim.issue_state,
      providerLinearWorkerProof: null,
      providerRetryState: buildProviderRetryState(claim)
    };
  }

  return {
    ...base,
    lookupAliases: Array.from(
      new Set(
        base.lookupAliases.concat(
          buildProjectionLookupAliases({
            issueIdentifier: claim.issue_identifier,
            issueId: claim.issue_id,
            taskId: claim.task_id,
            runId: claim.run_id
          })
        )
      )
    ),
    rawStatus: claim.state,
    displayStatus: 'retrying',
    statusReason: claim.reason,
    updatedAt: claim.updated_at,
    summary: claim.reason ?? base.summary,
    lastError: claim.retry_error ?? base.lastError,
    latestEvent: retryLatestEvent ?? base.latestEvent,
    workspacePath: resolveRetryWorkspacePath(claim, controlWorkspacePath, base),
    compatibilityState: claim.issue_state ?? base.compatibilityState ?? null,
    providerRetryState: buildProviderRetryState(claim)
  };
}

function resolveRetryWorkspacePath(
  claim: ProviderIntakeClaimRecord,
  controlWorkspacePath: string | null,
  source?: Pick<ControlCompatibilitySourceContext, 'workspacePath' | 'providerLinearWorkerProof'> | null
): string | null {
  const proofWorkspacePath = source?.providerLinearWorkerProof?.workspace_path ?? null;
  if (proofWorkspacePath) {
    return proofWorkspacePath;
  }
  if (
    source?.workspacePath &&
    (!controlWorkspacePath || source.workspacePath !== controlWorkspacePath)
  ) {
    return source.workspacePath;
  }
  if (!controlWorkspacePath || !claim.task_id) {
    return null;
  }
  try {
    return resolveProviderWorkspacePath(controlWorkspacePath, claim.task_id);
  } catch {
    return null;
  }
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
}

function compareIsoTimestamp(left: string | null | undefined, right: string | null | undefined): number {
  const leftValue = Date.parse(left ?? '');
  const rightValue = Date.parse(right ?? '');
  if (!Number.isFinite(leftValue) && !Number.isFinite(rightValue)) {
    return 0;
  }
  if (!Number.isFinite(leftValue)) {
    return -1;
  }
  if (!Number.isFinite(rightValue)) {
    return 1;
  }
  return leftValue - rightValue;
}

function buildProjectionLookupAliases(input: {
  issueIdentifier: string;
  issueId: string | null;
  taskId: string | null;
  runId: string | null;
}): string[] {
  const aliases = new Set<string>();
  for (const candidate of [input.issueIdentifier, input.issueId, input.taskId, input.runId]) {
    if (candidate) {
      aliases.add(candidate);
    }
  }
  return Array.from(aliases);
}

async function resolveProviderSelectedManifestSnapshot(
  context: SelectedRunProjectionContext
): Promise<SelectedRunManifestSnapshot | null> {
  const claim = selectProviderIntakeClaim(context.providerIntakeState);
  if (!claim?.run_manifest_path) {
    return null;
  }

  const preferredSnapshot = await readManifestSnapshotForPath(claim.run_manifest_path);
  if (!preferredSnapshot) {
    return null;
  }

  const currentTaskId = resolveTaskIdFromManifestPath(context.paths.manifestPath);
  const currentRunId = resolveRunIdFromManifestPath(context.paths.manifestPath);
  if (currentTaskId === 'local-mcp' && currentRunId === 'control-host') {
    return preferredSnapshot;
  }

  const providerControlHostTaskId = readStringValue(
    preferredSnapshot.manifestRecord,
    'provider_control_host_task_id'
  );
  const providerControlHostRunId = readStringValue(
    preferredSnapshot.manifestRecord,
    'provider_control_host_run_id'
  );
  if (
    providerControlHostTaskId !== currentTaskId ||
    providerControlHostRunId !== currentRunId
  ) {
    return null;
  }

  return preferredSnapshot;
}
