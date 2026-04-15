import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { logger } from '../logger.js';
import {
  buildEmptyProviderLinearWorkerTokenUsage,
  defaultExecRunner,
  parseProviderLinearWorkerJsonl,
  type ProviderLinearWorkerChildLaneParentSnapshot,
  type ProviderLinearWorkerChildLaneScope,
  type ProviderLinearWorkerTokenUsage
} from './providerLinearWorkerRunner.js';
import {
  createRuntimeCodexCommandContext,
  formatRuntimeSelectionSummary,
  parseRuntimeMode,
  resolveRuntimeCodexCommand,
  type RuntimeCodexCommandContext
} from './runtime/index.js';
import {
  buildRunMemoryPromptLines,
  selectRunMemoryForRole
} from './run/runMemoryController.js';
import { resolveProviderLinearChildLaneScopeContract } from './providerLinearChildLanePhaseContract.js';

const execFileAsync = promisify(execFile);

export const PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME = 'provider-linear-child-lane-proof.json';
export const PROVIDER_LINEAR_CHILD_LANE_STREAM_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_STREAM';
export const PROVIDER_LINEAR_CHILD_LANE_PURPOSE_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PURPOSE';
export const PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS';
export const PROVIDER_LINEAR_CHILD_LANE_FILES_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_FILES';
export const PROVIDER_LINEAR_CHILD_LANE_PHASES_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PHASES';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_WORKSPACE_PATH_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_WORKSPACE_PATH';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE';

export interface ProviderLinearChildLaneProof {
  issue_id: string;
  issue_identifier: string;
  task_id: string;
  run_id: string;
  parent_run_id: string;
  stream: string;
  purpose: string;
  instructions: string | null;
  scope: ProviderLinearWorkerChildLaneScope;
  parent_snapshot: ProviderLinearWorkerChildLaneParentSnapshot;
  lane_workspace_path: string;
  lane_branch: string;
  patch_artifact_path: string;
  patch_bytes: number;
  thread_id: string | null;
  latest_turn_id: string | null;
  latest_session_id: string | null;
  latest_session_id_source: 'derived_from_thread_and_turn' | null;
  last_event: string | null;
  last_message: string | null;
  last_event_at: string | null;
  tokens: ProviderLinearWorkerTokenUsage;
  rate_limits: Record<string, unknown> | null;
  status: 'succeeded' | 'failed';
  updated_at: string;
}

interface ProviderLinearChildLaneContext {
  manifestPath: string;
  runDir: string;
  repoRoot: string;
  runId: string;
  taskId: string;
  parentRunId: string;
  issueId: string;
  issueIdentifier: string;
  stream: string;
  purpose: string;
  instructions: string | null;
  scope: ProviderLinearWorkerChildLaneScope;
  runMemoryPromptLines: string[];
  parentWorkspacePath: string;
  parentSnapshot: ProviderLinearWorkerChildLaneParentSnapshot;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArrayFromEnv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => normalizeOptionalString(entry))
      .filter((entry): entry is string => entry !== null);
  } catch {
    return [];
  }
}

function ensurePathWithinRoot(root: string, candidate: string): string {
  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(candidate);
  const relativePath = relative(resolvedRoot, resolvedCandidate);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Path escapes parent workspace boundary: ${candidate}`);
  }
  return resolvedCandidate;
}

function deriveLatestTurnSessionId(input: {
  threadId: string | null;
  turnId: string | null;
}): {
  sessionId: string | null;
  source: 'derived_from_thread_and_turn' | null;
} {
  if (!input.threadId || !input.turnId) {
    return { sessionId: null, source: null };
  }
  return {
    sessionId: `${input.threadId}-${input.turnId}`,
    source: 'derived_from_thread_and_turn'
  };
}

function buildChildLanePrompt(context: ProviderLinearChildLaneContext): string {
  const scopeLines = [
    context.scope.files.length > 0
      ? `- File scope: ${context.scope.files.join(', ')}`
      : '- File scope: none declared',
    context.scope.phases.length > 0
      ? `- Phase scope: ${context.scope.phases.join(', ')}`
      : '- Phase scope: none declared'
  ];
  return [
    `You are a bounded same-issue child lane for Linear issue ${context.issueIdentifier}.`,
    '',
    'Constraints:',
    '- Work only inside this lane workspace. The parent lane owns the authoritative issue workspace, Linear state, workpad, and PR lifecycle.',
    '- Stay strictly inside the declared scope below. Do not edit files outside the declared file or phase scope.',
    '- If the change cannot be completed within that scope, stop and report back to the parent lane so it can relaunch with widened ownership.',
    '- Do not call Linear mutation helpers. Parent-owned integration happens by patch artifact only.',
    '- Do not run full repo validation suites. Keep checks tightly scoped to the touched area when needed.',
    '- If the lane is advisory/read-only and no file changes are needed, finish with a concise evidence summary. The parent will classify a zero-byte patch as no-output advisory evidence, not as an applicable patch.',
    '',
    `Purpose: ${context.purpose}`,
    ...scopeLines,
    ...(context.runMemoryPromptLines.length > 0 ? ['', ...context.runMemoryPromptLines] : []),
    '',
    context.instructions ? `Additional instructions:\n${context.instructions}` : 'Additional instructions: none.',
    '',
    'Finish by leaving the lane workspace changes in place for patch export. Do not commit.'
  ].join('\n');
}

async function resolveChildLaneRuntimeContext(
  env: NodeJS.ProcessEnv,
  repoRoot: string,
  runId: string
): Promise<RuntimeCodexCommandContext> {
  const requestedMode = parseRuntimeMode(
    env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE ?? env.CODEX_ORCHESTRATOR_RUNTIME_MODE ?? null
  );
  return await createRuntimeCodexCommandContext({
    requestedMode,
    executionMode: 'mcp',
    repoRoot,
    env: { ...process.env, ...env },
    runId
  });
}

async function loadProviderLinearChildLaneContext(
  env: NodeJS.ProcessEnv = process.env
): Promise<ProviderLinearChildLaneContext> {
  const manifestPath = normalizeOptionalString(env.CODEX_ORCHESTRATOR_MANIFEST_PATH);
  if (!manifestPath) {
    throw new Error('CODEX_ORCHESTRATOR_MANIFEST_PATH is required for provider-linear-child-lane.');
  }
  const rawManifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8')) as Record<string, unknown>;
  const runDir = dirname(resolve(manifestPath));
  const repoRoot = normalizeOptionalString(env.CODEX_ORCHESTRATOR_ROOT) ?? process.cwd();
  const runId = normalizeOptionalString(rawManifest.run_id) ?? normalizeOptionalString(env.CODEX_ORCHESTRATOR_RUN_ID);
  const taskId = normalizeOptionalString(rawManifest.task_id) ?? normalizeOptionalString(env.CODEX_ORCHESTRATOR_TASK_ID);
  const parentRunId = normalizeOptionalString(rawManifest.parent_run_id);
  const issueId = normalizeOptionalString(rawManifest.issue_id);
  const issueIdentifier = normalizeOptionalString(rawManifest.issue_identifier);
  const stream = normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_STREAM_ENV]);
  const purpose = normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PURPOSE_ENV]);
  const parentWorkspacePath = normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_WORKSPACE_PATH_ENV]);
  const rawScope: ProviderLinearWorkerChildLaneScope = {
    files: normalizeStringArrayFromEnv(env[PROVIDER_LINEAR_CHILD_LANE_FILES_ENV]),
    phases: normalizeStringArrayFromEnv(env[PROVIDER_LINEAR_CHILD_LANE_PHASES_ENV])
  };
  let scope: ProviderLinearWorkerChildLaneScope;
  try {
    scope = resolveProviderLinearChildLaneScopeContract(rawScope);
  } catch (error) {
    throw new Error(
      `provider-linear-child-lane scope is invalid: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (
    !runId ||
    !taskId ||
    !parentRunId ||
    !issueId ||
    !issueIdentifier ||
    !stream ||
    !purpose ||
    !parentWorkspacePath ||
    (rawScope.files.length === 0 && rawScope.phases.length === 0)
  ) {
    throw new Error('provider-linear-child-lane context is missing required manifest or env fields.');
  }
  const capturedAt = new Date().toISOString();
  return {
    manifestPath: resolve(manifestPath),
    runDir,
    repoRoot: resolve(repoRoot),
    runId,
    taskId,
    parentRunId,
    issueId,
    issueIdentifier,
    stream,
    purpose,
    instructions: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV]),
    scope,
    runMemoryPromptLines: buildRunMemoryPromptLines(
      selectRunMemoryForRole({
        role: 'delegate',
        manifest: rawManifest,
        hints: [purpose, ...scope.files, ...scope.phases]
      })
    ),
    parentWorkspacePath: resolve(parentWorkspacePath),
    parentSnapshot: {
      base_sha: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV]),
      issue_updated_at: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV]),
      issue_state: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV]),
      issue_state_type: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV]),
      captured_at: capturedAt
    }
  };
}

function sanitizeChildLaneStreamSegment(stream: string): string {
  const collapsed = stream.trim().replaceAll('\\', '/').split('/').map((segment) => segment.trim()).filter(Boolean).join('-');
  const sanitized = collapsed
    .replace(/[^A-Za-z0-9._-]+/gu, '-')
    .replace(/\.{2,}/gu, '-')
    .replace(/^-+/u, '')
    .replace(/-+$/u, '')
    .replace(/^\.+/u, '')
    .replace(/\.+$/u, '');
  return sanitized.length > 0 ? sanitized : 'lane';
}

async function prepareLaneWorkspace(
  context: ProviderLinearChildLaneContext
): Promise<{ laneWorkspacePath: string; laneBranch: string }> {
  const safeStream = sanitizeChildLaneStreamSegment(context.stream);
  const laneWorkspacePath = ensurePathWithinRoot(
    context.parentWorkspacePath,
    join(context.parentWorkspacePath, '.child-lanes', `${safeStream}-${context.runId}`)
  );
  const laneBranch = `child-lane/${safeStream}-${context.runId}`.slice(0, 120);
  await rm(laneWorkspacePath, { recursive: true, force: true });
  await mkdir(dirname(laneWorkspacePath), { recursive: true });
  await execFileAsync('git', ['clone', '--local', context.parentWorkspacePath, laneWorkspacePath]);
  const baseSha = context.parentSnapshot.base_sha ?? 'HEAD';
  await execFileAsync('git', ['-C', laneWorkspacePath, 'checkout', '--detach', baseSha]);
  await execFileAsync('git', ['-C', laneWorkspacePath, 'switch', '-c', laneBranch]);
  return { laneWorkspacePath, laneBranch };
}

async function createPatchArtifact(
  laneWorkspacePath: string,
  runDir: string
): Promise<{ patchArtifactPath: string; patchBytes: number }> {
  await execFileAsync('git', ['-C', laneWorkspacePath, 'add', '-N', '.']);
  const diff = await execFileAsync('git', ['-C', laneWorkspacePath, 'diff', '--binary', '--no-ext-diff', 'HEAD', '--', '.'], {
    maxBuffer: 20 * 1024 * 1024
  });
  const patchArtifactPath = join(runDir, 'provider-linear-child-lane.patch');
  await writeFile(patchArtifactPath, diff.stdout, 'utf8');
  return {
    patchArtifactPath,
    patchBytes: Buffer.byteLength(diff.stdout, 'utf8')
  };
}

async function writeChildLaneProof(
  runDir: string,
  proof: ProviderLinearChildLaneProof
): Promise<void> {
  await writeFile(join(runDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME), `${JSON.stringify(proof, null, 2)}\n`, 'utf8');
}

export async function runProviderLinearChildLane(
  env: NodeJS.ProcessEnv = process.env
): Promise<ProviderLinearChildLaneProof> {
  const context = await loadProviderLinearChildLaneContext(env);
  const { laneWorkspacePath, laneBranch } = await prepareLaneWorkspace(context);
  const runtimeContext = await resolveChildLaneRuntimeContext(env, laneWorkspacePath, context.runId);
  logger.info(`[provider-linear-child-lane-runtime] ${formatRuntimeSelectionSummary(runtimeContext.runtime)}`);
  const childEnv: NodeJS.ProcessEnv = { ...process.env, ...env, ...runtimeContext.env };
  childEnv.CODEX_NON_INTERACTIVE = '1';
  childEnv.CODEX_NO_INTERACTIVE = '1';
  childEnv.CODEX_INTERACTIVE = '0';
  const prompt = buildChildLanePrompt(context);
  const { command, args } = resolveRuntimeCodexCommand(['exec', '--json', prompt], runtimeContext);

  let execResult;
  try {
    execResult = await defaultExecRunner({
      command,
      args,
      cwd: laneWorkspacePath,
      env: childEnv,
      mirrorOutput: false
    });
  } catch (error) {
    const failedProof: ProviderLinearChildLaneProof = {
      issue_id: context.issueId,
      issue_identifier: context.issueIdentifier,
      task_id: context.taskId,
      run_id: context.runId,
      parent_run_id: context.parentRunId,
      stream: context.stream,
      purpose: context.purpose,
      instructions: context.instructions,
      scope: context.scope,
      parent_snapshot: context.parentSnapshot,
      lane_workspace_path: laneWorkspacePath,
      lane_branch: laneBranch,
      patch_artifact_path: join(context.runDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 0,
      thread_id: null,
      latest_turn_id: null,
      latest_session_id: null,
      latest_session_id_source: null,
      last_event: null,
      last_message: error instanceof Error ? error.message : String(error),
      last_event_at: null,
      tokens: buildEmptyProviderLinearWorkerTokenUsage(),
      rate_limits: null,
      status: 'failed',
      updated_at: new Date().toISOString()
    };
    await writeChildLaneProof(context.runDir, failedProof);
    throw error;
  }

  const parsed = parseProviderLinearWorkerJsonl(execResult.stdout);
  const session = deriveLatestTurnSessionId({
    threadId: parsed.threadId,
    turnId: parsed.turnId
  });
  const { patchArtifactPath, patchBytes } = await createPatchArtifact(laneWorkspacePath, context.runDir);
  const proof: ProviderLinearChildLaneProof = {
    issue_id: context.issueId,
    issue_identifier: context.issueIdentifier,
    task_id: context.taskId,
    run_id: context.runId,
    parent_run_id: context.parentRunId,
    stream: context.stream,
    purpose: context.purpose,
    instructions: context.instructions,
    scope: context.scope,
    parent_snapshot: context.parentSnapshot,
    lane_workspace_path: laneWorkspacePath,
    lane_branch: laneBranch,
    patch_artifact_path: patchArtifactPath,
    patch_bytes: patchBytes,
    thread_id: parsed.threadId,
    latest_turn_id: parsed.turnId,
    latest_session_id: session.sessionId,
    latest_session_id_source: session.source,
    last_event: parsed.lastEvent,
    last_message: parsed.finalMessage,
    last_event_at: parsed.lastEventAt,
    tokens: parsed.tokens,
    rate_limits: parsed.rateLimits,
    status: execResult.exitCode === 0 ? 'succeeded' : 'failed',
    updated_at: new Date().toISOString()
  };
  await writeChildLaneProof(context.runDir, proof);
  if (execResult.exitCode !== 0) {
    throw new Error(`provider-linear-child-lane exited with code ${execResult.exitCode ?? 'unknown'}`);
  }
  return proof;
}

async function main(): Promise<void> {
  await runProviderLinearChildLane();
}

const entry = process.argv[1] ? resolve(process.argv[1]) : null;
const self = resolve(fileURLToPath(import.meta.url));
if (entry && entry === self) {
  main().catch((error) => {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export const __test__ = {
  buildChildLanePrompt
};
