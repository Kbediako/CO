import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';
import type { ControlAction, ControlState } from './controlState.js';
import { LINEAR_ADVISORY_STATE_FILE } from './controlPersistenceFiles.js';
import { resolveManifestWorkspacePath } from '../run/workspacePath.js';
import {
  buildTrackedLinearPayload,
  type ControlCompatibilitySourceContext,
  type SelectedRunContext,
  type SelectedRunLatestEvent,
  type SelectedRunQuestionSummary
} from './observabilityReadModel.js';
import type { QuestionRecord } from './questions.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type { ProviderIntakeState } from './providerIntakeState.js';
import { selectProviderIntakeClaim } from './providerIntakeState.js';

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
}

interface ProjectionContextParts {
  control: ControlState;
  questions: QuestionRecord[];
  runDir: string;
  trackedIssue: LiveLinearTrackedIssue | null;
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
    return { running: [], retrying: [] };
  }

  const running: ControlCompatibilitySourceContext[] = [];
  const retrying: ControlCompatibilitySourceContext[] = [];
  const taskEntries = await readDirectoryNames(runsRoot);

  for (const taskEntry of taskEntries.sort((left, right) => left.localeCompare(right)).reverse()) {
    if (taskEntry === 'local-mcp') {
      continue;
    }

    const discoveredContexts = await readTaskCompatibilityContexts(join(runsRoot, taskEntry, 'cli'), {
      excludeRunId: taskEntry === currentTaskId ? currentRunId : null
    });
    for (const discovered of discoveredContexts) {
      if (discovered.rawStatus === 'in_progress') {
        running.push(discovered);
        continue;
      }

      if (discovered.rawStatus === 'failed' && !discovered.completedAt) {
        retrying.push(discovered);
      }
    }
  }

  return { running, retrying };
}

async function buildSelectedRunContextFromSnapshot(
  context: SelectedRunProjectionContext,
  snapshot: SelectedRunManifestSnapshot | null
): Promise<SelectedRunContext | null> {
  return buildProjectionContextFromParts(snapshot, await resolveProjectionContextParts(context, snapshot));
}

async function buildCompatibilitySourceContextFromSnapshot(
  context: SelectedRunProjectionContext,
  snapshot: SelectedRunManifestSnapshot | null
): Promise<ControlCompatibilitySourceContext | null> {
  return buildProjectionContextFromParts(snapshot, await resolveProjectionContextParts(context, snapshot));
}

function buildProjectionContextFromParts(
  snapshot: SelectedRunManifestSnapshot | null,
  parts: ProjectionContextParts
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
  const workspacePath = resolveManifestWorkspacePath(manifestRecord, parts.runDir) ?? parts.runDir;
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
    questionSummary,
    tracked
  };
}

async function readSelectedRunManifestSnapshotInternal(
  context: SelectedRunProjectionContext
): Promise<SelectedRunManifestSnapshot | null> {
  const preferredManifestPath = resolveProviderSelectedManifestPath(context);
  if (preferredManifestPath) {
    const preferredManifest = await readJsonFile<CliManifest>(preferredManifestPath);
    if (preferredManifest) {
      return buildSelectedRunManifestSnapshot(
        preferredManifest as unknown as Record<string, unknown>,
        preferredManifestPath,
        readStringValue(preferredManifest as unknown as Record<string, unknown>, 'run_id') ?? null
      );
    }
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

function resolveRunsRootFromRunDir(runDir: string): string | null {
  const candidate = resolve(runDir, '..', '..', '..');
  return candidate || null;
}

function resolveTaskIdFromManifestPath(manifestPath: string): string | null {
  const normalizedPath = manifestPath.replace(/\\/g, '/');
  const match = normalizedPath.match(/\.runs\/([^/]+)\/cli\//);
  return match?.[1] ?? null;
}

function resolveRunIdFromManifestPath(manifestPath: string): string | null {
  const normalizedPath = manifestPath.replace(/\\/g, '/');
  const match = normalizedPath.match(/\/cli\/([^/]+)\/manifest\.json$/);
  return match?.[1] ?? null;
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
      trackedIssue: context.linearAdvisoryState.tracked_issue
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
    trackedIssue: advisoryState?.tracked_issue ?? null
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
  } = {}
): Promise<ControlCompatibilitySourceContext[]> {
  const discovered: ControlCompatibilitySourceContext[] = [];
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

    const context = buildProjectionContextFromParts(snapshot, {
      control,
      questions: Array.isArray(questionSnapshot?.questions) ? questionSnapshot.questions : [],
      runDir,
      trackedIssue: advisoryState?.tracked_issue ?? null
    });
    if (context) {
      discovered.push(context);
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

function resolveProviderSelectedManifestPath(
  context: SelectedRunProjectionContext
): string | null {
  const claim = selectProviderIntakeClaim(context.providerIntakeState);
  if (!claim?.run_manifest_path) {
    return null;
  }
  return claim.run_manifest_path;
}
