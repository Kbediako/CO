import { readdir, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';
import type { ControlAction, ControlState } from './controlState.js';
import { LINEAR_ADVISORY_STATE_FILE } from './controlPersistenceFiles.js';
import {
  resolveLegacyWorkspacePathFromRunDir,
  resolveManifestWorkspacePath,
  resolveProviderWorkspacePath
} from '../run/workspacePath.js';
import {
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
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
  buildProviderIssueKey,
  hasQueuedProviderIntakeRetry,
  readProviderIntakeClaim,
  selectProviderIntakeClaim
} from './providerIntakeState.js';

export interface SelectedRunManifestSnapshot {
  manifestRecord: Record<string, unknown>;
  manifestPath: string;
  runDir: string;
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

interface ProjectionContextParts {
  control: ControlState;
  questions: QuestionRecord[];
  runDir: string;
  trackedIssue: LiveLinearTrackedIssue | null;
  providerLinearWorkerProof: ProviderLinearWorkerProof | null;
}

interface LinearAdvisoryStateSnapshot {
  tracked_issue?: LiveLinearTrackedIssue | null;
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

  const running: ControlCompatibilitySourceContext[] = [];
  const retrying: ControlCompatibilitySourceContext[] = [];
  const all: ControlCompatibilitySourceContext[] = [];
  const taskEntries = await readDirectoryNames(runsRoot);

  for (const taskEntry of taskEntries.sort((left, right) => left.localeCompare(right)).reverse()) {
    if (taskEntry === 'local-mcp') {
      continue;
    }

    const discoveredContexts = await readTaskCompatibilityContexts(join(runsRoot, taskEntry, 'cli'), {
      excludeRunId: taskEntry === currentTaskId ? currentRunId : null,
      providerIntakeState: context.providerIntakeState,
      controlWorkspacePath
    });
    all.push(...discoveredContexts.map((entry) => entry.context));
    for (const entry of discoveredContexts) {
      const discovered = entry.context;
      if (discovered.rawStatus === 'in_progress') {
        running.push(discovered);
        continue;
      }
      if (!context.providerIntakeState && entry.retryFallbackEligible) {
        retrying.push(discovered);
      }
    }
  }

  return { running, retrying, all };
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
  const [parts, controlWorkspacePath] = await Promise.all([
    resolveProjectionContextParts(context, snapshot),
    resolveControlWorkspacePath(context)
  ]);
  const providerClaim = findMatchingProviderIntakeClaim(context.providerIntakeState, snapshot);
  return buildProjectionContextFromParts(
    snapshot,
    parts,
    resolveRunsRootFromRunDir(context.paths.runDir),
    controlWorkspacePath,
    providerClaim
  );
}

async function buildCompatibilitySourceContextFromSnapshot(
  context: SelectedRunProjectionContext,
  snapshot: SelectedRunManifestSnapshot | null
): Promise<ControlCompatibilitySourceContext | null> {
  const [parts, controlWorkspacePath] = await Promise.all([
    resolveProjectionContextParts(context, snapshot),
    resolveControlWorkspacePath(context)
  ]);
  const providerClaim = findMatchingProviderIntakeClaim(context.providerIntakeState, snapshot);
  return buildProjectionContextFromParts(
    snapshot,
    parts,
    resolveRunsRootFromRunDir(context.paths.runDir),
    controlWorkspacePath,
    providerClaim
  );
}

function buildProjectionContextFromParts(
  snapshot: SelectedRunManifestSnapshot | null,
  parts: ProjectionContextParts,
  controlRunsRoot: string | null,
  controlWorkspacePath: string | null,
  providerClaim: ProviderIntakeClaimRecord | null = null
): SelectedRunContext | null {
  if (!snapshot) {
    return null;
  }
  const { manifestRecord, issueIdentifier, issueId, taskId, runId } = snapshot;
  const control = parts.control;
  const rawStatus = readStringValue(manifestRecord, 'status') ?? 'unknown';
  const startedAt = readStringValue(manifestRecord, 'started_at', 'startedAt') ?? null;
  const updatedAt = readStringValue(manifestRecord, 'updated_at', 'updatedAt') ?? null;
  const completedAt = readStringValue(manifestRecord, 'completed_at', 'completedAt') ?? null;
  const manifestSummary = readStringValue(manifestRecord, 'summary') ?? null;
  const summary = resolveSelectedRunDisplaySummary({
    manifestRecord,
    rawStatus,
    summary: manifestSummary
  });
  const workspacePath = resolveSelectedRunWorkspacePath({
    manifestRecord,
    manifestPath: snapshot.manifestPath,
    controlRunsRoot,
    controlWorkspacePath
  });
  const questionSummary = buildSelectedRunQuestionSummary(parts.questions);
  const latestAction = control.latest_action?.action ?? null;
  const { displayStatus, statusReason } = resolveSelectedRunDisplayStatus({
    rawStatus,
    latestAction,
    questionSummary
  });
  const tracked = buildTrackedLinearPayload(parts.trackedIssue);
  const latestEvent = buildSelectedRunLatestEvent({
    controlAction: control.latest_action ?? null,
    updatedAt,
    summary,
    fallbackEvent: rawStatus
  });
  const lastError =
    rawStatus === 'failed'
      ? summary ?? control.latest_action?.reason ?? 'run_failed'
      : latestAction === 'fail'
        ? control.latest_action?.reason ?? manifestSummary ?? 'run_failed'
        : null;

  return {
    issueIdentifier,
    issueId,
    taskId,
    runId,
    lookupAliases: snapshot.lookupAliases,
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
    pipelineTitle: readStringValue(manifestRecord, 'pipeline_title', 'pipelineTitle') ?? null,
    stages: readManifestStageSummaries(manifestRecord),
    approvalsTotal: readManifestApprovalsTotal(manifestRecord),
    manifestPath: snapshot.manifestPath,
    runDir: snapshot.runDir,
    questionSummary,
    tracked,
    compatibilityState: resolveCompatibilityState(parts.trackedIssue, providerClaim),
    providerLinearWorkerProof: parts.providerLinearWorkerProof,
    providerRetryState: buildProviderRetryState(providerClaim)
  };
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
): string | null {
  return trackedIssue?.state ?? providerClaim?.issue_state ?? null;
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
}): { displayStatus: string; statusReason: string | null } {
  if (input.rawStatus === 'in_progress' && input.latestAction === 'pause') {
    return {
      displayStatus: 'paused',
      statusReason: input.questionSummary.queuedCount > 0 ? 'queued_questions' : 'control_pause'
    };
  }
  if (input.rawStatus === 'in_progress' && input.questionSummary.queuedCount > 0) {
    return { displayStatus: 'awaiting_input', statusReason: 'queued_questions' };
  }
  return { displayStatus: input.rawStatus, statusReason: null };
}

function buildSelectedRunLatestEvent(input: {
  controlAction: ControlAction | null;
  updatedAt: string | null;
  summary: string | null;
  fallbackEvent: string;
}): SelectedRunLatestEvent | null {
  if (!input.controlAction && !input.updatedAt && !input.summary) {
    return null;
  }
  return {
    at: input.controlAction?.requested_at ?? input.updatedAt,
    event: input.controlAction?.action ?? input.fallbackEvent,
    message: input.summary,
    requestedBy: input.controlAction?.requested_by ?? null,
    reason: input.controlAction?.reason ?? null
  };
}

function resolveSelectedRunDisplaySummary(input: {
  manifestRecord: Record<string, unknown>;
  rawStatus: string;
  summary: string | null;
}): string | null {
  if (
    input.rawStatus === 'succeeded' &&
    input.summary &&
    hasStaleSucceededFailureSummary(input.summary) &&
    !manifestHasFailedCommands(input.manifestRecord)
  ) {
    const filteredSummary = filterStaleSucceededFailureSummary(input.summary);
    return filteredSummary ?? 'Completed successfully';
  }
  return input.summary;
}

function hasStaleSucceededFailureSummary(summary: string): boolean {
  return summary.split('\n').some((line) => isStaleSucceededFailureSummaryLine(line));
}

function filterStaleSucceededFailureSummary(summary: string): string | null {
  const retainedLines = summary
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isStaleSucceededFailureSummaryLine(line));
  if (retainedLines.length === 0) {
    return null;
  }
  return retainedLines.join('\n');
}

function isStaleSucceededFailureSummaryLine(line: string): boolean {
  return /^Stage '.*' failed with exit code \d+\.$/u.test(line.trim());
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
  const cliIndex = segments.lastIndexOf('cli');
  if (cliIndex <= 0) {
    return null;
  }
  const trailingSegments = segments.length - cliIndex - 1;
  if (trailingSegments < 1 || trailingSegments > 2) {
    return null;
  }
  if (trailingSegments === 2 && segments[segments.length - 1] !== 'manifest.json') {
    return null;
  }
  return segments[cliIndex - 1] ?? null;
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
      trackedIssue: context.linearAdvisoryState.tracked_issue,
      providerLinearWorkerProof: await readJsonFile<ProviderLinearWorkerProof>(
        join(context.paths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME)
      )
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
    trackedIssue: advisoryState?.tracked_issue ?? null,
    providerLinearWorkerProof: await readJsonFile<ProviderLinearWorkerProof>(
      join(snapshot.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME)
    )
  };
}

function buildSelectedRunManifestSnapshot(
  manifestRecord: Record<string, unknown>,
  manifestPath: string,
  fallbackRunId: string | null
): SelectedRunManifestSnapshot | null {
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

    const snapshot = buildSelectedRunManifestSnapshot(
      manifest as unknown as Record<string, unknown>,
      manifestPath,
      runEntry
    );
    if (!snapshot) {
      continue;
    }

    const control = normalizeControlState(
      await readJsonFile<ControlState>(join(runDir, 'control.json')),
      snapshot.runId
    );
    const questionSnapshot = await readJsonFile<{ questions?: QuestionRecord[] }>(join(runDir, 'questions.json'));
    const advisoryState = await readJsonFile<LinearAdvisoryStateSnapshot>(
      join(runDir, LINEAR_ADVISORY_STATE_FILE)
    );

    const context = buildProjectionContextFromParts(
      snapshot,
      {
        control,
        questions: Array.isArray(questionSnapshot?.questions) ? questionSnapshot.questions : [],
        runDir,
        trackedIssue: advisoryState?.tracked_issue ?? null,
        providerLinearWorkerProof: await readJsonFile<ProviderLinearWorkerProof>(
          join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME)
        )
      },
      resolveRunsRootFromRunDir(runDir),
      options.controlWorkspacePath ?? resolveSafeLegacyWorkspacePathFromRunDir(runDir),
      findMatchingProviderIntakeClaim(options.providerIntakeState, snapshot)
    );
    if (context) {
      discovered.push({
        context,
        retryFallbackEligible: isManifestRetryFallbackCandidate(
          manifest as unknown as Record<string, unknown>
        )
      });
    }
  }

  return discovered;
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

function isManifestRetryFallbackCandidate(manifestRecord: Record<string, unknown>): boolean {
  if (readStringValue(manifestRecord, 'issue_provider', 'issueProvider') !== 'linear') {
    return false;
  }
  const status = readStringValue(manifestRecord, 'status');
  return status === 'failed' || status === 'cancelled';
}

function findMatchingProviderIntakeClaim(
  state: ProviderIntakeState | null | undefined,
  snapshot: SelectedRunManifestSnapshot | null
): ProviderIntakeClaimRecord | null {
  if (!state || !snapshot) {
    return null;
  }
  if (snapshot.issueId) {
    const byIssueId = readProviderIntakeClaim(state, buildProviderIssueKey('linear', snapshot.issueId));
    if (byIssueId) {
      return byIssueId;
    }
  }
  return (
    state.claims.find((claim) => {
      if (claim.run_manifest_path && claim.run_manifest_path === snapshot.manifestPath) {
        return true;
      }
      if (claim.run_id && snapshot.runId && claim.run_id === snapshot.runId) {
        return true;
      }
      if (claim.task_id && snapshot.taskId && claim.task_id === snapshot.taskId) {
        return claim.issue_identifier === snapshot.issueIdentifier;
      }
      return claim.issue_identifier === snapshot.issueIdentifier;
    }) ?? null
  );
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
  if (!active && attempt === null) {
    return null;
  }
  return {
    active,
    attempt,
    due_at: active ? claim.retry_due_at ?? null : null,
    error: active ? claim.retry_error ?? null : null
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
      claim
    ) ??
    null;
  if (!base) {
    return {
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
