import { spawnSync, type ChildProcess } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import type { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { PassThrough } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendProviderLinearWorkerChildLaneRecord,
  appendProviderLinearWorkerChildStreamRecord,
  buildProviderLinearWorkerAppServerCallbackResponse,
  buildProviderLinearWorkerProgressSemanticSignature,
  buildProviderWorkerPrompt,
  defaultAppServerTurnRunner,
  loadProviderLinearWorkerContext,
  parseProviderLinearWorkerJsonl,
  PROVIDER_LINEAR_RESIDENT_SESSION_SEED_ENV,
  ProviderLinearTrackedIssueReadError,
  readProviderLinearWorkerChildStreams,
  resolveProviderLinearHelperCommand,
  refreshProviderLinearWorkerProofSnapshot,
  runProviderLinearWorker,
  shouldEmitProviderLinearWorkerProgressSignatureTransition,
  transactProviderLinearWorkerChildLanes,
  PROVIDER_LINEAR_CHILD_LANE_DIAGNOSTICS_FILENAME,
  PROVIDER_LINEAR_WORKER_AUDIT_FILENAME,
  PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME,
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  type ProviderLinearWorkerDependencies,
  type ProviderLinearWorkerProof
} from '../src/cli/providerLinearWorkerRunner.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import {
  PROVIDER_LINEAR_AUDIT_ENV_VAR,
  appendProviderLinearAuditEntry,
  type ProviderLinearDecisionLineage,
  type ProviderLinearParallelizationDecision,
  type ProviderLinearParallelizationReason,
  type ProviderLinearAuditSummary
} from '../src/cli/control/providerLinearWorkflowAudit.js';
import { recordLinearBudgetHeadersObservation } from '../src/cli/control/linearBudgetState.js';
import {
  CONTROL_HOST_DUPLICATE_OWNER_FILE,
  CONTROL_HOST_OWNER_FILE,
  CONTROL_HOST_STALE_OWNER_FILE
} from '../src/cli/control/controlPersistenceFiles.js';
import { resolveProviderLinearChildLaneScopeContract } from '../src/cli/providerLinearChildLanePhaseContract.js';
import type { RuntimeCodexCommandContext } from '../src/cli/runtime/index.js';
import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
  PROVIDER_LAUNCH_SOURCE_ENV
} from '../../scripts/lib/provider-run-contract.js';
import { inspectSourceRootFreshness } from '../src/cli/utils/sourceRootFreshness.js';

let tempRoot: string | null = null;
let extraTempRoots: string[] = [];
const providerLinearWorkerRunnerTestTimeoutMs = 60_000;
const SOURCE_HELPER_COMMAND = 'node "/tmp/co/bin/codex-orchestrator.js" linear';
const TEST_AUTH_PROVENANCE_FINGERPRINT_KEY = 'provider-linear-worker-test-fingerprint-key';
const CHILD_LANE_PARENT_DIRTY_LAUNCH_MESSAGE =
  'Parent workspace has in-scope pending changes: .tmp/notes.md. Revert, commit, or move scratch workpad/temp artifacts outside the repo before launching a child lane.';
const PROVIDER_WORKER_TASK_COMPLETE_STDOUT = [
  '{"type":"thread.started","thread_id":"thread-1"}',
  '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
  '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
].join('\n');
let originalAuthProvenanceFingerprintKey: string | undefined;

function testFingerprint(value: string): string {
  return `hmac-sha256:${createHmac('sha256', TEST_AUTH_PROVENANCE_FINGERPRINT_KEY)
    .update(value)
    .digest('hex')
    .slice(0, 16)}`;
}

function buildChildLaneParentDirtyAuditEntry(overrides: Record<string, unknown> = {}) {
  return {
    recorded_at: '2026-03-21T09:00:00.000Z',
    operation: 'child-lane',
    ok: false,
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-2',
    source_setup: null,
    action: 'launch',
    via: null,
    state: null,
    follow_up_issue_id: null,
    follow_up_issue_identifier: null,
    failed_relation_type: null,
    comment_id: null,
    attachment_id: null,
    error_code: 'provider_worker_child_lane_parent_dirty',
    error_message: CHILD_LANE_PARENT_DIRTY_LAUNCH_MESSAGE,
    ...overrides
  };
}

function buildSingleEntryAuditSummary(
  entry: Record<string, unknown>,
  overrides: Partial<ProviderLinearAuditSummary> = {}
): ProviderLinearAuditSummary {
  return {
    path: '/tmp/provider-linear-worker-linear-audit.jsonl',
    attempted_count: 1,
    success_count: entry.ok === true ? 1 : 0,
    failure_count: entry.ok === false ? 1 : 0,
    latest_recorded_at: typeof entry.recorded_at === 'string' ? entry.recorded_at : null,
    parallelization_entries: [],
    latest_by_operation: {
      [String(entry.operation)]: entry
    },
    ...overrides
  } as ProviderLinearAuditSummary;
}

beforeEach(() => {
  originalAuthProvenanceFingerprintKey = process.env.CODEX_AUTH_PROVENANCE_FINGERPRINT_KEY;
  process.env.CODEX_AUTH_PROVENANCE_FINGERPRINT_KEY = TEST_AUTH_PROVENANCE_FINGERPRINT_KEY;
  extraTempRoots = [];
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (originalAuthProvenanceFingerprintKey === undefined) {
    delete process.env.CODEX_AUTH_PROVENANCE_FINGERPRINT_KEY;
  } else {
    process.env.CODEX_AUTH_PROVENANCE_FINGERPRINT_KEY = originalAuthProvenanceFingerprintKey;
  }
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
  for (const path of extraTempRoots) {
    await rm(path, { recursive: true, force: true });
  }
  extraTempRoots = [];
});

async function createManifestRoot(
  runsDirName = '.runs',
  manifestOverrides: Record<string, unknown> = {}
) {
  tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-'));
  const runDir = join(tempRoot, runsDirName, 'linear-lin-issue-1', 'cli', 'run-child');
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  await writeFile(
    manifestPath,
    JSON.stringify({
      run_id: 'run-child',
      task_id: 'linear-lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      ...manifestOverrides
    }),
    'utf8'
  );
  return { runDir, manifestPath };
}

function buildSourceRootFreshnessFixture(
  overrides: Partial<NonNullable<ProviderLinearWorkerProof['source_root_freshness']>> = {}
): NonNullable<ProviderLinearWorkerProof['source_root_freshness']> {
  return {
    schema_version: 1,
    status: 'warning',
    observed_at: '2026-05-01T00:00:00.000Z',
    intended_repo_root: '/repo',
    intended_repo_root_realpath: '/repo',
    command_path: '/stale/bin/codex-orchestrator.ts',
    command_path_realpath: '/stale/bin/codex-orchestrator.ts',
    package_root: '/stale',
    package_root_realpath: '/stale',
    source_root: '/stale',
    source_root_realpath: '/stale',
    entrypoint_kind: 'source',
    base_ref: 'origin/main',
    source_checkout: null,
    intended_checkout: null,
    drift_classes: ['supervised_source_root_drift'],
    provenance: {
      command_path_source: 'explicit',
      package_root_source: 'explicit',
      source_root_source: 'package_root',
      command_path_inside_package: true,
      package_root_matches_intended: false,
      source_root_matches_intended: false,
      source_entry_exists: true,
      dist_entry_exists: false
    },
    guidance: ['Restart or relaunch the supervised control-host from the intended current source root before trusting provider-worker posture.'],
    detail: 'Detected source/root drift: supervised_source_root_drift.',
    ...overrides
  };
}

async function writeControlHostOwnerForProof(
  runDir: string,
  sourceRootFreshness: NonNullable<ProviderLinearWorkerProof['source_root_freshness']>
): Promise<void> {
  await writeFile(
    join(runDir, CONTROL_HOST_OWNER_FILE),
    JSON.stringify({
      schema_version: 1,
      status: 'owned',
      owner_token: 'control-host-owner-token',
      acquired_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
      released_at: null,
      repo_root: tempRoot,
      task_id: 'local-mcp',
      run_id: 'control-host',
      run_dir: runDir,
      pipeline_id: 'provider-linear-worker',
      pid: 123,
      ppid: 1,
      hostname: 'host.local',
      cwd: tempRoot,
      argv: ['node', '/stale/bin/codex-orchestrator.ts', 'control-host'],
      source_root_freshness: sourceRootFreshness,
      lock_dir: join(runDir, 'control-host-owner.lock'),
      lock_owner_path: join(runDir, 'control-host-owner.lock', 'owner.json'),
      owner_path: join(runDir, CONTROL_HOST_OWNER_FILE)
    }),
    'utf8'
  );
}

async function createProviderWorkerSourceRootRepo(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  extraTempRoots.push(root);
  await mkdir(join(root, 'bin'), { recursive: true });
  await writeFile(
    join(root, 'package.json'),
    `${JSON.stringify({ name: '@kbediako/codex-orchestrator' }, null, 2)}\n`,
    'utf8'
  );
  await writeFile(join(root, 'bin', 'codex-orchestrator.ts'), 'console.log("source");\n', 'utf8');
  git(root, ['init', '-b', 'main']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'base']);
  git(root, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  return root;
}

function git(cwd: string, args: string[]): { stdout: string } {
  const result = spawnSync(
    'git',
    ['-c', 'user.name=Codex Test', '-c', 'user.email=codex@example.test', ...args],
    {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr || result.error?.message || 'unknown error'}`
    );
  }
  return { stdout: String(result.stdout ?? '') };
}

async function createControlEndpointServer(bindHost = '127.0.0.1'): Promise<{
  baseUrl: string;
  requests: Array<{
    url: string;
    headers: http.IncomingHttpHeaders;
    body: Record<string, unknown>;
  }>;
  close(): Promise<void>;
}> {
  const requests: Array<{
    url: string;
    headers: http.IncomingHttpHeaders;
    body: Record<string, unknown>;
  }> = [];
  const sockets = new Set<Socket>();
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      requests.push({
        url: req.url ?? '/',
        headers: req.headers,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
      });
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ queued: true, coalesced: false }));
    });
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, bindHost, () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind control endpoint test server.');
  }
  const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
  return {
    baseUrl: `http://${host}:${address.port}`,
    requests,
    close: async () => {
      if (!server.listening) {
        sockets.forEach((socket) => socket.destroy());
        return;
      }
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
        sockets.forEach((socket) => socket.destroy());
      });
    }
  };
}

async function writeCodexConfigContent(content: string): Promise<string> {
  if (!tempRoot) {
    throw new Error('temp root not initialized');
  }
  const codexHome = join(tempRoot, '.codex');
  await mkdir(codexHome, { recursive: true });
  await writeFile(join(codexHome, 'config.toml'), content, 'utf8');
  return codexHome;
}

async function writeCodexConfig(maxTurns: number): Promise<string> {
  return await writeCodexConfigContent(`[agent]\nmax_turns = ${maxTurns}\n`);
}

type ReadTrackedIssueInput = Parameters<ProviderLinearWorkerDependencies['readTrackedIssue']>[0];
type PersistedSessionLogHydrationState = {
  path: string;
  offset_bytes: number;
  trailing_text: string;
  bootstrap_pending: boolean;
  proof_signature: string;
  id_rewind_signature?: string | null;
};

function createTrackedIssue(overrides: Partial<LiveLinearTrackedIssue> = {}): LiveLinearTrackedIssue {
  return {
    provider: 'linear',
    id: 'lin-issue-1',
    identifier: 'CO-2',
    title: 'Same-session continuation',
    description: 'Finish the issue without restarting the thread.',
    url: 'https://linear.app/example/issue/CO-2',
    state: 'In Progress',
    state_type: 'started',
    archived_at: null,
    trashed: false,
    workspace_id: 'workspace-1',
    viewer_id: 'viewer-1',
    assignee_id: 'viewer-1',
    assignee_name: 'Codex',
    team_id: 'team-1',
    team_key: 'CO',
    team_name: 'CO',
    project_id: 'project-1',
    project_name: 'Coordinator',
    updated_at: '2026-03-21T09:00:00.000Z',
    blocked_by: [],
    recent_activity: [
      {
        id: 'activity-1',
        created_at: '2026-03-21T08:58:00.000Z',
        actor_name: 'Operator',
        summary: 'State Todo -> In Progress'
      }
    ],
    ...overrides
  };
}

function buildSource0Descriptor() {
  return {
    schema_version: 1,
    kind: 'context_object' as const,
    object_id: 'sha256:source0',
    pointer: 'ctx:sha256:source0#chunk:c000001',
    dir_path: '.runs/linear-lin-issue-1/cli/run-child/memory/source-0',
    index_path: '.runs/linear-lin-issue-1/cli/run-child/memory/source-0/index.json',
    source_path: '.runs/linear-lin-issue-1/cli/run-child/memory/source-0/source.txt',
    byte_length: 512,
    chunk_count: 1,
    created_at: '2026-03-21T09:00:00.000Z',
    origin: {
      run_id: 'run-child',
      task_id: 'linear-lin-issue-1',
      manifest_path: '.runs/linear-lin-issue-1/cli/run-child/manifest.json'
    },
    inherited_from: null
  };
}

function buildInProgressProof(
  overrides: Partial<ProviderLinearWorkerProof> = {}
): ProviderLinearWorkerProof {
  return {
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-2',
    attempt_started_at: '2026-03-21T09:00:00.000Z',
    thread_id: 'thread-1',
    latest_turn_id: null,
    latest_session_id: null,
    latest_session_id_source: null,
    turn_count: 1,
    last_event: 'item.completed',
    last_message: null,
    last_event_at: null,
    tokens: {
      input_tokens: null,
      output_tokens: null,
      total_tokens: null
    },
    rate_limits: null,
    owner_phase: 'turn_running',
    owner_status: 'in_progress',
    workspace_path: tempRoot ?? '/tmp/workspace',
    linear_audit: null,
    end_reason: null,
    updated_at: '2026-03-21T09:00:00.000Z',
    ...overrides
  };
}

function buildSessionLogHydrationPath(runDir: string): string {
  return join(runDir, 'provider-linear-worker-session-log-hydration.json');
}

async function readPersistedSessionLogHydrationState(
  hydrationPath: string
): Promise<PersistedSessionLogHydrationState> {
  return JSON.parse(await readFile(hydrationPath, 'utf8')) as PersistedSessionLogHydrationState;
}

function expectRefreshAuthHeaders(
  headers: http.IncomingHttpHeaders | HeadersInit | undefined,
  token = 'control-token'
): void {
  if (!headers) {
    throw new Error('expected refresh request headers');
  }
  if (headers instanceof Headers || Array.isArray(headers)) {
    const normalized = new Headers(headers);
    expect(normalized.get('authorization')).toBe(`Bearer ${token}`);
    expect(normalized.get('x-csrf-token')).toBe(token);
    return;
  }
  const normalized = new Headers(
    Object.entries(headers).flatMap(([key, value]) => {
      if (value == null) {
        return [];
      }
      return [[key, Array.isArray(value) ? value.join(', ') : String(value)]];
    })
  );
  expect(normalized.get('authorization')).toBe(`Bearer ${token}`);
  expect(normalized.get('x-csrf-token')).toBe(token);
}

function createRuntimeContext(
  runtimeOverrides: Partial<RuntimeCodexCommandContext['runtime']> = {},
  envOverrides: NodeJS.ProcessEnv = {}
): RuntimeCodexCommandContext {
  return {
    env: envOverrides,
    runtime: {
      requested_mode: 'cli',
      selected_mode: 'cli',
      source: 'default',
      provider: 'CliRuntimeProvider',
      runtime_session_id: null,
      fallback: {
        occurred: false,
        policy: 'auto',
        policy_source: 'default',
        code: null,
        reason: null,
        from_mode: null,
        to_mode: null,
        original_target: null,
        fallback_target: null,
        blocking_reason: null,
        checked_at: '2026-03-21T09:00:00.000Z'
      },
      env_overrides: {},
      ...runtimeOverrides
    } as never
  };
}

function createAppServerRuntimeContext(
  runtimeOverrides: Partial<RuntimeCodexCommandContext['runtime']> = {},
  envOverrides: NodeJS.ProcessEnv = {}
): RuntimeCodexCommandContext {
  return {
    env: envOverrides,
    runtime: {
      requested_mode: 'appserver',
      selected_mode: 'appserver',
      source: 'default',
      provider: 'AppServerRuntimeProvider',
      runtime_session_id: 'appserver-run-child',
      fallback: {
        occurred: false,
        policy: 'auto',
        policy_source: 'default',
        code: null,
        reason: null,
        from_mode: null,
        to_mode: null,
        original_target: null,
        fallback_target: null,
        blocking_reason: null,
        checked_at: '2026-03-21T09:00:00.000Z'
      },
      env_overrides: {},
      ...runtimeOverrides
    } as never
  };
}

async function appendParallelizationDecisionAudit(
  runDir: string,
  input: {
    turnIndex?: number;
    decision: ProviderLinearParallelizationDecision;
    reason: ProviderLinearParallelizationReason;
    summary?: string | null;
    recordedAt?: string;
    recordedAtBase?: string;
    issueId?: string;
    issueIdentifier?: string | null;
    decisionLineage?: ProviderLinearDecisionLineage | null;
  }
): Promise<void> {
  const turnIndex = input.turnIndex ?? 1;
  await appendProviderLinearAuditEntry(join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME), {
    recorded_at:
      input.recordedAt ??
      new Date(
        Date.parse(input.recordedAtBase ?? '2026-03-21T09:00:00.000Z') +
          Math.max(turnIndex, 1) * 1_000 +
          200
      ).toISOString(),
    operation: 'parallelization',
    ok: true,
    issue_id: input.issueId ?? 'lin-issue-1',
    issue_identifier: input.issueIdentifier ?? 'CO-2',
    source_setup: null,
    action: input.decision,
    via: input.summary ?? 'Single bounded change.',
    state: input.reason,
    follow_up_issue_id: null,
    follow_up_issue_identifier: null,
    failed_relation_type: null,
    comment_id: null,
    attachment_id: null,
    decision_lineage: input.decisionLineage ?? null,
    error_code: null,
    error_message: null
  });
}

function buildTestDecisionLineage(
  overrides: Partial<ProviderLinearDecisionLineage> = {}
): ProviderLinearDecisionLineage {
  return {
    schema_version: 1,
    parent_task_id: 'linear-lin-issue-1',
    parent_run_id: 'prior-run-1',
    parent_turn_started_at: '2026-03-21T08:59:45.000Z',
    parent_turn_id: 'prior-turn-1',
    parent_turn_count: 1,
    decision_id: 'provider-linear-parallelization:prior-run-1:prior-turn-1:2026-03-21T08_59_59.500Z',
    decision_recorded_at: '2026-03-21T08:59:59.500Z',
    decision: 'parallelize_now',
    reason: 'independent_scope_available',
    ...overrides
  };
}

async function appendParallelizationDecisionAuditForRequest(
  request: { env: NodeJS.ProcessEnv },
  input: {
    turnIndex?: number;
    decision: ProviderLinearParallelizationDecision;
    reason: ProviderLinearParallelizationReason;
    summary?: string | null;
    recordedAt?: string;
    recordedAtBase?: string;
    issueId?: string;
    issueIdentifier?: string | null;
    decisionLineage?: ProviderLinearDecisionLineage | null;
  }
): Promise<void> {
  const auditPath = request.env[PROVIDER_LINEAR_AUDIT_ENV_VAR];
  if (typeof auditPath !== 'string' || auditPath.length === 0) {
    throw new Error('expected provider linear audit path in exec request env');
  }
  const turnIndex = input.turnIndex ?? 1;
  await appendProviderLinearAuditEntry(auditPath, {
    recorded_at:
      input.recordedAt ??
      new Date(
        Date.parse(input.recordedAtBase ?? '2026-03-21T09:00:00.000Z') +
          Math.max(turnIndex, 1) * 1_000 +
          200
      ).toISOString(),
    operation: 'parallelization',
    ok: true,
    issue_id: input.issueId ?? 'lin-issue-1',
    issue_identifier: input.issueIdentifier ?? 'CO-2',
    source_setup: null,
    action: input.decision,
    via: input.summary ?? 'Single bounded change.',
    state: input.reason,
    follow_up_issue_id: null,
    follow_up_issue_identifier: null,
    failed_relation_type: null,
    comment_id: null,
    attachment_id: null,
    decision_lineage: input.decisionLineage ?? null,
    error_code: null,
    error_message: null
  });
}

async function appendStaySerialParallelizationDecisionAudit(
  runDir: string,
  input: Omit<
    Parameters<typeof appendParallelizationDecisionAudit>[1],
    'decision' | 'reason'
  > = {}
): Promise<void> {
  await appendParallelizationDecisionAudit(runDir, {
    ...input,
    decision: 'stay_serial',
    reason: 'single_bounded_change'
  });
}

async function appendStaySerialParallelizationDecisionAuditForRequest(
  request: { env: NodeJS.ProcessEnv },
  input: Omit<
    Parameters<typeof appendParallelizationDecisionAuditForRequest>[1],
    'decision' | 'reason'
  > = {}
): Promise<void> {
  await appendParallelizationDecisionAuditForRequest(request, {
    ...input,
    decision: 'stay_serial',
    reason: 'single_bounded_change'
  });
}

describe('provider linear worker runner', { timeout: providerLinearWorkerRunnerTestTimeoutMs }, () => {
  it('loads provider worker context from manifest-backed env', async () => {
    const { manifestPath } = await createManifestRoot();

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '7'
    });

    expect(context).toMatchObject({
      manifestPath,
      repoRoot: tempRoot,
      taskId: 'linear-lin-issue-1',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      maxTurns: 7
    });
    expect(context.sourceSetup).toBeNull();
  });

  it('prefers the issue workspace root when the manifest still points at the shared root', async () => {
    const { manifestPath } = await createManifestRoot();
    const issueWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    await mkdir(issueWorkspacePath, { recursive: true });

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: issueWorkspacePath,
      CODEX_ORCHESTRATOR_TASK_ID: 'linear-lin-issue-1'
    });

    expect(context.repoRoot).toBe(issueWorkspacePath);
    expect(context.workspacePath).toBe(issueWorkspacePath);
  });

  it('prefers the current issue workspace cwd over a stale shared-root env value', async () => {
    const { manifestPath } = await createManifestRoot();
    const issueWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    await mkdir(issueWorkspacePath, { recursive: true });

    const context = await loadProviderLinearWorkerContext(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: relative(tempRoot ?? '', manifestPath),
        CODEX_ORCHESTRATOR_ROOT: relative(issueWorkspacePath, tempRoot ?? ''),
        CODEX_ORCHESTRATOR_TASK_ID: 'linear-lin-issue-1'
      },
      undefined,
      issueWorkspacePath
    );

    expect(context.repoRoot).toBe(issueWorkspacePath);
    expect(context.workspacePath).toBe(issueWorkspacePath);
  });

  it('rebases the provider manifest and run directory to the authoritative issue workspace', async () => {
    const { manifestPath } = await createManifestRoot();
    const issueWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    const workspaceRunDir = join(
      issueWorkspacePath,
      '.runs',
      'linear-lin-issue-1',
      'cli',
      'run-child'
    );
    const workspaceManifestPath = join(workspaceRunDir, 'manifest.json');
    await mkdir(workspaceRunDir, { recursive: true });
    await writeFile(
      workspaceManifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: issueWorkspacePath
      }),
      'utf8'
    );

    const context = await loadProviderLinearWorkerContext(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_TASK_ID: 'linear-lin-issue-1'
      },
      undefined,
      issueWorkspacePath
    );

    expect(context.repoRoot).toBe(issueWorkspacePath);
    expect(context.workspacePath).toBe(issueWorkspacePath);
    expect(context.manifestPath).toBe(workspaceManifestPath);
    expect(context.controlHostManifestPath).toBe(manifestPath);
    expect(context.runDir).toBe(workspaceRunDir);
  });

  it('rebases provider manifests from configured runs layout roots to the issue workspace counterpart', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-runs-layout-'));
    const taskId = 'linear-lin-issue-1';
    const issueWorkspacePath = join(tempRoot, '.workspaces', taskId);
    const sharedRunDir = join(tempRoot, 'runs', taskId, 'cli', 'run-child');
    const workspaceRunDir = join(issueWorkspacePath, 'runs', taskId, 'cli', 'run-child');
    const sharedManifestPath = join(sharedRunDir, 'manifest.json');
    const workspaceManifestPath = join(workspaceRunDir, 'manifest.json');
    await mkdir(sharedRunDir, { recursive: true });
    await mkdir(workspaceRunDir, { recursive: true });
    await writeFile(
      sharedManifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: taskId,
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      workspaceManifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: taskId,
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: issueWorkspacePath
      }),
      'utf8'
    );

    const context = await loadProviderLinearWorkerContext(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: sharedManifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot,
        CODEX_ORCHESTRATOR_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_RUNS_DIR: join(tempRoot, 'runs')
      },
      undefined,
      issueWorkspacePath
    );

    expect(context.repoRoot).toBe(issueWorkspacePath);
    expect(context.workspacePath).toBe(issueWorkspacePath);
    expect(context.manifestPath).toBe(workspaceManifestPath);
    expect(context.controlHostManifestPath).toBe(sharedManifestPath);
    expect(context.runDir).toBe(workspaceRunDir);
  });

  it('keeps the original manifest when the authoritative issue workspace has no mirror', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const issueWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    await mkdir(issueWorkspacePath, { recursive: true });
    const readManifest = vi.fn(async (inputPath: string) =>
      JSON.parse(await readFile(inputPath, 'utf8')) as Record<string, unknown>
    );

    const context = await loadProviderLinearWorkerContext(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_TASK_ID: 'linear-lin-issue-1'
      },
      readManifest,
      issueWorkspacePath
    );

    expect(context.repoRoot).toBe(issueWorkspacePath);
    expect(context.workspacePath).toBe(issueWorkspacePath);
    expect(context).toMatchObject({ manifestPath, controlHostManifestPath: manifestPath, runDir });
    expect(readManifest).toHaveBeenCalledTimes(1);
    expect(readManifest).toHaveBeenCalledWith(manifestPath);
  });

  it('rejects an issue-workspace manifest mirror with a mismatched task id', async () => {
    const { manifestPath } = await createManifestRoot();
    const issueWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    const workspaceRunDir = join(issueWorkspacePath, '.runs', 'linear-lin-issue-1', 'cli', 'run-child');
    await mkdir(workspaceRunDir, { recursive: true });
    await writeFile(
      join(workspaceRunDir, 'manifest.json'),
      JSON.stringify({ run_id: 'run-child', task_id: 'linear-lin-issue-2', workspace_path: issueWorkspacePath }),
      'utf8'
    );

    await expect(
      loadProviderLinearWorkerContext(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_TASK_ID: 'linear-lin-issue-1'
        },
        undefined,
        issueWorkspacePath
      )
    ).rejects.toThrow('Provider worker task id mismatch');
  });

  it('loads env-backed Linear scope binding into provider worker context', async () => {
    const { manifestPath } = await createManifestRoot();

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CO_LINEAR_WORKSPACE_ID: 'workspace-1',
      CO_LINEAR_TEAM_ID: 'team-1',
      CO_LINEAR_PROJECT_ID: 'project-1'
    });

    expect(context.sourceSetup).toEqual({
      provider: 'linear',
      workspace_id: 'workspace-1',
      team_id: 'team-1',
      project_id: 'project-1'
    });
  });

  it('loads and normalizes the selected worker_host from provider worker env', async () => {
    const { manifestPath } = await createManifestRoot();

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_ORCHESTRATOR_PROVIDER_WORKER_HOST: '  worker-host-01  '
    });

    expect(context.workerHost).toBe('worker-host-01');
  });

  it('treats an empty worker_host env value as an explicit local clear', async () => {
    const { manifestPath } = await createManifestRoot();
    await writeFile(manifestPath, JSON.stringify({
      run_id: 'run-child',
      task_id: 'linear-lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      worker_host: 'worker-host-manifest'
    }), 'utf8');

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_ORCHESTRATOR_PROVIDER_WORKER_HOST: '   '
    });

    expect(context.workerHost).toBeNull();
  });

  it('falls back to the manifest host when no worker_host env override is present', async () => {
    const { manifestPath } = await createManifestRoot();
    await writeFile(manifestPath, JSON.stringify({
      run_id: 'run-child',
      task_id: 'linear-lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      worker_host: 'worker-host-manifest'
    }), 'utf8');

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined
    });

    expect(context.workerHost).toBe('worker-host-manifest');
  });

  it('loads provider worker max turns from CODEX_HOME config when env overrides are absent', async () => {
    const { manifestPath } = await createManifestRoot();
    const codexHome = await writeCodexConfig(9);

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_HOME: codexHome
    });

    expect(context.maxTurns).toBe(9);
  });

  it('does not let nested table dotted keys override root agent max_turns', async () => {
    const { manifestPath } = await createManifestRoot();
    const codexHome = await writeCodexConfigContent(
      [
        '[profile.worker]',
        'agent.max_turns = 2',
        '',
        '[agent]',
        'max_turns = 9',
        ''
      ].join('\n')
    );

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_HOME: codexHome
    });

    expect(context.maxTurns).toBe(9);
  });

  it.each([
    ['leading plus', '+12', 12],
    ['underscore separator', '1_000', 1000],
    ['hexadecimal', '0x14', 20],
    ['octal', '0o24', 20],
    ['binary', '0b10100', 20]
  ])('accepts valid TOML integer spelling with %s for root agent max_turns', async (_label, value, expected) => {
    const { manifestPath } = await createManifestRoot();
    const codexHome = await writeCodexConfigContent(`[agent]\nmax_turns = ${value}\n`);

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_HOME: codexHome
    });

    expect(context.maxTurns).toBe(expected);
  });

  it('does not parse max_turns assignments embedded in multiline basic strings', async () => {
    const { manifestPath } = await createManifestRoot();
    const codexHome = await writeCodexConfigContent(
      [
        'status_message = """',
        'agent.max_turns = 2',
        '[agent]',
        'max_turns = 3',
        '"""',
        '',
        '[agent]',
        'max_turns = 9',
        ''
      ].join('\n')
    );

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_HOME: codexHome
    });

    expect(context.maxTurns).toBe(9);
  });

  it('does not parse max_turns assignments embedded in multiline literal strings', async () => {
    const { manifestPath } = await createManifestRoot();
    const codexHome = await writeCodexConfigContent(
      [
        "status_message = '''",
        'agent.max_turns = 2',
        '[agent]',
        'max_turns = 3',
        "'''",
        '',
        '[agent]',
        'max_turns = 9',
        ''
      ].join('\n')
    );

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_HOME: codexHome
    });

    expect(context.maxTurns).toBe(9);
  });

  it('falls back to the Symphony default max turns when env and CODEX_HOME are unset', async () => {
    const { manifestPath } = await createManifestRoot();

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined
    });

    expect(context.maxTurns).toBe(20);
  });

  it('uses manifest.taskId when the snake_case task id is absent', async () => {
    const { manifestPath } = await createManifestRoot();
    await writeFile(manifestPath, JSON.stringify({
      run_id: 'run-child',
      taskId: 'linear-camel-task',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot
    }), 'utf8');

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined
    });

    expect(context.taskId).toBe('linear-camel-task');
  });

  it('rejects manifest task ids that are unsafe for child-stream path confinement', async () => {
    const { manifestPath } = await createManifestRoot();
    await writeFile(manifestPath, JSON.stringify({
      run_id: 'run-child',
      task_id: 'linear/bad-task',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot
    }), 'utf8');

    await expect(
      loadProviderLinearWorkerContext({
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined
      })
    ).rejects.toThrow('slashes are not allowed');
  });

  it('uses manifest-path task fallback inside the runs layout', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-runs-fallback-'));
    const manifestDir = join(tempRoot, 'runs', 'linear-lin-issue-1', 'cli', 'run-child');
    await mkdir(manifestDir, { recursive: true });
    const manifestPath = join(manifestDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify({
      run_id: 'run-child',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot
    }), 'utf8');

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot
    });

    expect(context.taskId).toBe('linear-lin-issue-1');
  });

  it('rejects manifest-path task fallback outside the canonical artifact layout', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-noncanonical-'));
    const manifestDir = join(tempRoot, 'not-runs', 'run-child');
    await mkdir(manifestDir, { recursive: true });
    const manifestPath = join(manifestDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify({
      run_id: 'run-child',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot
    }), 'utf8');

    await expect(
      loadProviderLinearWorkerContext({
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined
      })
    ).rejects.toThrow('Provider worker task id unavailable');
  });
  it('rejects env task ids that do not match the manifest-backed worker task', async () => {
    const { manifestPath } = await createManifestRoot();
    await expect(loadProviderLinearWorkerContext({ CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath, CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined, CODEX_ORCHESTRATOR_TASK_ID: 'linear-lin-issue-2' })).rejects.toThrow('Provider worker task id mismatch');
  });
  it('rejects env repo roots that do not match the manifest-backed workspace', async () => {
    const { manifestPath } = await createManifestRoot();
    await expect(loadProviderLinearWorkerContext({ CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath, CODEX_ORCHESTRATOR_ROOT: join(tempRoot ?? '', 'elsewhere') })).rejects.toThrow('Provider worker root mismatch');
  });
  it('rejects env issue ids that do not match the manifest-backed issue', async () => {
    const { manifestPath } = await createManifestRoot();
    await expect(
      loadProviderLinearWorkerContext({
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_ISSUE_ID: 'lin-issue-2'
      })
    ).rejects.toThrow('Provider worker issue id mismatch');
  });
  it('rejects env issue identifiers that do not match the manifest-backed issue identifier', async () => {
    const { manifestPath } = await createManifestRoot();
    await expect(
      loadProviderLinearWorkerContext({
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_ISSUE_IDENTIFIER: 'CO-99'
      })
    ).rejects.toThrow('Provider worker issue identifier mismatch');
  });
  it('requires matching live control-host env values and accepts manifest.pipelineId', async () => {
    const { manifestPath } = await createManifestRoot();
    await writeFile(manifestPath, JSON.stringify({ run_id: 'run-child', task_id: 'linear-lin-issue-1', issue_id: 'lin-issue-1', issue_identifier: 'CO-2', pipelineId: 'provider-linear-worker', provider_launch_source: 'control-host', provider_control_host_task_id: 'local-mcp', provider_control_host_run_id: 'control-host', workspace_path: tempRoot }), 'utf8');
    expect(await loadProviderLinearWorkerContext({ CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath, CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined })).toMatchObject({
      pipelineId: 'provider-linear-worker',
      providerControlHostTaskId: null,
      providerControlHostRunId: null,
      providerControlHostMatchesManifest: false
    });
    expect((await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host'
    }))).toMatchObject({
      providerControlHostTaskId: 'local-mcp',
      providerControlHostRunId: 'control-host',
      providerControlHostMatchesManifest: true
    });
  });

  it('fails closed on mismatched live control-host env values', async () => {
    const { manifestPath } = await createManifestRoot();
    await writeFile(manifestPath, JSON.stringify({
      run_id: 'run-child',
      task_id: 'linear-lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      pipelineId: 'provider-linear-worker',
      provider_launch_source: 'control-host',
      provider_control_host_task_id: 'local-mcp',
      provider_control_host_run_id: 'control-host',
      workspace_path: tempRoot
    }), 'utf8');

    await expect(loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'other-task',
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'other-run'
    })).resolves.toMatchObject({
      providerControlHostTaskId: null,
      providerControlHostRunId: null,
      providerControlHostMatchesManifest: false
    });
  });

  it('persists missing control-host provenance onto the provider-worker manifest when the live env matches', async () => {
    const { manifestPath } = await createManifestRoot();

    const context = await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host'
    });

    expect(context).toMatchObject({
      providerControlHostTaskId: 'local-mcp',
      providerControlHostRunId: 'control-host',
      providerControlHostRecordedInManifest: true,
      providerControlHostMatchesManifest: true
    });

    const persistedManifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    expect(persistedManifest).toMatchObject({
      provider_launch_source: 'control-host',
      provider_control_host_task_id: 'local-mcp',
      provider_control_host_run_id: 'control-host'
    });
  });

  it('does not persist backfilled provenance when context validation fails', async () => {
    const { manifestPath } = await createManifestRoot();
    const issueWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    const workspaceRunDir = join(issueWorkspacePath, '.runs', 'linear-lin-issue-1', 'cli', 'run-child');
    const workspaceManifestPath = join(workspaceRunDir, 'manifest.json');
    await mkdir(workspaceRunDir, { recursive: true });
    await writeFile(
      workspaceManifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: issueWorkspacePath
      }),
      'utf8'
    );

    await expect(
      loadProviderLinearWorkerContext(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_TASK_ID: 'linear-lin-issue-1',
          CODEX_ORCHESTRATOR_ISSUE_ID: 'lin-issue-2',
          CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
          CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
          CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host'
        },
        undefined,
        issueWorkspacePath
      )
    ).rejects.toThrow('Provider worker issue id mismatch');

    const sharedManifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    const workspaceManifest = JSON.parse(
      await readFile(workspaceManifestPath, 'utf8')
    ) as Record<string, unknown>;
    for (const persistedManifest of [sharedManifest, workspaceManifest]) {
      expect(persistedManifest.provider_launch_source).toBeUndefined();
      expect(persistedManifest.provider_control_host_task_id).toBeUndefined();
      expect(persistedManifest.provider_control_host_run_id).toBeUndefined();
    }
  });

  it('builds a full first-turn prompt and a continuation prompt', () => {
    const issue = createTrackedIssue();

    const helperCommand = SOURCE_HELPER_COMMAND;
    const sharedRepoCheckoutPath = '/tmp/co';
    const manifest = {
      memory: {
        source_0: buildSource0Descriptor()
      },
      prompt_packs: [
        {
          id: 'pp-implementation',
          domain: 'implementation',
          stamp: 'impl',
          experience_slots: 3,
          sources: ['docs/PRD-linear-lin-issue-1.md'],
          experiences: ['[exp impl-1] Keep provider-worker changes narrowly scoped.']
        }
      ]
    };
    const firstPrompt = buildProviderWorkerPrompt(issue, 1, 5, helperCommand, sharedRepoCheckoutPath, {
      manifest
    });
    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, sharedRepoCheckoutPath, {
      manifest
    });

    expect(firstPrompt).toContain('You are the provider worker for Linear issue CO-2');
    expect(firstPrompt).toContain('Issue description:');
    expect(firstPrompt).toContain('Recent activity:');
    expect(firstPrompt).toContain(helperCommand);
    expect(firstPrompt).toContain('Linear issue id `lin-issue-1`');
    expect(firstPrompt).toContain('not the human identifier `CO-2`');
    expect(firstPrompt).toContain('`skills/linear/SKILL.md`');
    expect(firstPrompt).toContain('`skills/land/SKILL.md`');
    expect(firstPrompt).toContain('exactly one active `## Codex Workpad` comment');
    expect(firstPrompt).toContain('exact top-level order');
    expect(firstPrompt).toContain('`### Environment / Workspace Stamp`');
    expect(firstPrompt).toContain('`### Plan`');
    expect(firstPrompt).toContain('`### Acceptance Criteria`');
    expect(firstPrompt).toContain('`### Validation`');
    expect(firstPrompt).toContain('`### Notes`');
    expect(firstPrompt).toContain('`Acceptance Criteria` and `Validation` must contain non-empty checkbox list items (`- [ ] task` / `- [x] task`)');
    expect(firstPrompt).toContain('`Environment / Workspace Stamp`, `Plan`, and `Notes` can stay free-form');
    expect(firstPrompt).toContain('If the ticket includes `Validation`, `Test Plan`, or `Testing` requirements');
    expect(firstPrompt).toContain('Refresh the same workpad after each meaningful milestone and immediately before any review or merge handoff');
    expect(firstPrompt).toContain('Keep final closeout in that same workpad comment');
    expect(firstPrompt).toContain(`Use \`${helperCommand} issue-context --issue-id lin-issue-1\` to inspect the team workflow states before any transition.`);
    expect(firstPrompt).toContain('`Todo` or the live team\'s equivalent queued state (for example `Ready`)');
    expect(firstPrompt).toContain(`use \`${helperCommand} create-follow-up --issue-id lin-issue-1 ...\` to file or reuse a same-project follow-up issue in \`Backlog\``);
    expect(firstPrompt).toContain('For recurring baseline debt, pass the exact `--canonical-owner-key` from machine output');
    expect(firstPrompt).toContain('intent checksum, non-goals, `Not Done If`, acceptance criteria');
    expect(firstPrompt).toContain('required parity matrix for parity/alignment follow-ups');
    expect(firstPrompt).toContain('Review handoff states are `Human Review` and `In Review`');
    expect(firstPrompt).toContain('Standalone-review policy for this provider-worker lane');
    expect(firstPrompt).toContain('`codex-orchestrator review` / `npm run review`');
    expect(firstPrompt).toContain('`FORCE_CODEX_REVIEW=1`');
    expect(firstPrompt).toContain('If a PR is already attached, run a full PR feedback sweep before any new implementation work');
    expect(firstPrompt).toContain(`\`${helperCommand} runtime-proof --issue-id lin-issue-1 --origin <app-url> --format json\``);
    expect(firstPrompt).toContain(`\`${helperCommand} screenshot-proof --issue-id lin-issue-1 --output <path>.png --format json\``);
    expect(firstPrompt).toContain('paste `capture.embed_markdown` into the workpad');
    expect(firstPrompt).toContain('Use direct local-file workpad embedding only when the screenshot already exists and no new capture is needed.');
    expect(firstPrompt).toContain(
      'add `--reachability-mode dns-public` only when you need explicit worker-local DNS public-resolution evidence. The default path stays deterministic and the helper fails closed when the permit disallows the origin or proof kind, when the proof URL is loopback/local-only, or when dns-public lookup yields non-public or unresolved answers.'
    );
    expect(firstPrompt).toContain(`launch an audited child stream with \`${helperCommand} child-stream --pipeline <docs-review|implementation-gate|docs-relevance-advisory>\``);
    expect(firstPrompt).toContain('workspace-scoped artifact root');
    expect(firstPrompt).toContain('do not use blanket `DELEGATION_GUARD_OVERRIDE_REASON` text when they exist');
    expect(firstPrompt).not.toContain('subagent spawning unavailable in-session for this provider worker');
    expect(firstPrompt).toContain('`codex-orchestrator pr ready-review --pr <number> --quiet-minutes <window>`');
    expect(firstPrompt).toContain('Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff');
    expect(firstPrompt).toContain('about 2+ changed files or about 40+ changed lines');
    expect(firstPrompt).toContain('use the wrapper-led review path by default');
    expect(firstPrompt).toContain('do not hand off to review state unless a break-glass waiver is recorded with owner, expiry, reason, and evidence');
    expect(firstPrompt).toContain('manual correctness/regressions/missing-tests review');
    expect(firstPrompt).toContain('manual elegance checklist');
    expect(firstPrompt).toContain('Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.');
    expect(firstPrompt).toContain('`review_outcome: bounded-success`');
    expect(firstPrompt).toContain('successful bounded review completion, not as a blocker or generic quiet-tail failure');
    expect(firstPrompt).toContain('Treat `review_outcome: failed-boundary`');
    expect(firstPrompt).toContain('Treat `failed-other` as a failed review command without a classified boundary');
    expect(firstPrompt).toContain('not as proof of wrapper breakage');
    expect(firstPrompt).toContain('Attach the PR to the Linear issue before handing off to the team\'s review state (`Human Review` or `In Review`)');
    expect(firstPrompt).toContain('Before handing off to the team\'s review state (`Human Review` or `In Review`), ensure required validation is green');
    expect(firstPrompt).toContain('the latest `origin/main` is merged into the branch, PR checks are green, the `pr ready-review` drain is clean, and the workpad is refreshed to match completed work');
    expect(firstPrompt).toContain('If the issue is in either review state, do not code; refresh the workpad if needed, record the handoff clearly, and end the turn.');
    expect(firstPrompt).toContain('If the issue is in `Merging`, keep ownership and shepherd the PR through conflicts, checks, and final review until it merges.');
    expect(firstPrompt).toContain('After the PR actually merges and before moving the issue to `Done`, inspect the shared local repo checkout at `/tmp/co` rather than the per-issue workspace');
    expect(firstPrompt).toContain('`git -C "/tmp/co" status --short --branch`');
    expect(firstPrompt).toContain('`git -C "/tmp/co" fetch origin refs/heads/main:refs/remotes/origin/main`');
    expect(firstPrompt).toContain('`git -C "/tmp/co" merge --ff-only origin/main`');
    expect(firstPrompt).toContain('leave it untouched and record the explicit skip reason before `Done`');
    expect(firstPrompt).toContain('If the issue is in `Rework`, treat it as a full approach reset');
    expect(firstPrompt).toContain('close the previous PR, remove the previous workpad, create a fresh branch from `origin/main`');
    expect(firstPrompt).toContain('Shared source 0 anchor:');
    expect(firstPrompt).toContain('- Pointer: `ctx:sha256:source0#chunk:c000001`');
    expect(firstPrompt).toContain('Relevant prior experiences (hints, not strict instructions):');
    expect(firstPrompt).toContain('- Retrieval profile: executor');
    expect(firstPrompt).toContain('- Pack id: pp-implementation');
    expect(firstPrompt).toContain('[exp impl-1] Keep provider-worker changes narrowly scoped.');
    expect(continuationPrompt).toContain('Continuation guidance:');
    expect(continuationPrompt).toContain('do not restate them before acting');
    expect(continuationPrompt).not.toContain('Resume from the current workspace and workpad state instead of restarting from scratch.');
    expect(continuationPrompt).toContain(helperCommand);
    expect(continuationPrompt).toContain('Linear issue id `lin-issue-1`');
    expect(continuationPrompt).toContain('`skills/linear/SKILL.md`');
    expect(continuationPrompt).toContain('`skills/land/SKILL.md`');
    expect(continuationPrompt).toContain('Keep exactly one active `## Codex Workpad` comment current');
    expect(continuationPrompt).toContain('after each meaningful milestone and immediately before any review or merge handoff');
    expect(continuationPrompt).toContain('exact top-level structure');
    expect(continuationPrompt).toContain('`### Environment / Workspace Stamp`');
    expect(continuationPrompt).toContain('`### Plan`');
    expect(continuationPrompt).toContain('`### Acceptance Criteria`');
    expect(continuationPrompt).toContain('`### Validation`');
    expect(continuationPrompt).toContain('`### Notes`');
    expect(continuationPrompt).toContain('`Acceptance Criteria` and `Validation` must contain non-empty checkbox list items (`- [ ] task` / `- [x] task`)');
    expect(continuationPrompt).toContain('`Environment / Workspace Stamp`, `Plan`, and `Notes` can stay free-form');
    expect(continuationPrompt).toContain('If the ticket includes `Validation`, `Test Plan`, or `Testing` requirements');
    expect(continuationPrompt).toContain('Keep final closeout in that same workpad comment');
    expect(continuationPrompt).toContain(`${helperCommand} issue-context --issue-id lin-issue-1`);
    expect(continuationPrompt).toContain('`Todo` or the live team\'s equivalent queued state (for example `Ready`)');
    expect(continuationPrompt).toContain(`use \`${helperCommand} create-follow-up --issue-id lin-issue-1 ...\` to file or reuse a same-project follow-up issue in \`Backlog\``);
    expect(continuationPrompt).toContain('For recurring baseline debt, pass the exact `--canonical-owner-key` from machine output');
    expect(continuationPrompt).toContain('intent checksum, non-goals, `Not Done If`, acceptance criteria');
    expect(continuationPrompt).toContain('required parity matrix for parity/alignment follow-ups');
    expect(continuationPrompt).toContain('If a PR is already attached, run a full PR feedback sweep before any new implementation work');
    expect(continuationPrompt).toContain(`\`${helperCommand} runtime-proof --issue-id lin-issue-1 --origin <app-url> --format json\``);
    expect(continuationPrompt).toContain(`\`${helperCommand} screenshot-proof --issue-id lin-issue-1 --output <path>.png --format json\``);
    expect(continuationPrompt).toContain('paste `capture.embed_markdown` into the workpad');
    expect(continuationPrompt).toContain('Use direct local-file workpad embedding only when the screenshot already exists and no new capture is needed.');
    expect(continuationPrompt).toContain(
      'add `--reachability-mode dns-public` only when you need explicit worker-local DNS public-resolution evidence. The default path stays deterministic and the helper fails closed when the permit disallows the origin or proof kind, when the proof URL is loopback/local-only, or when dns-public lookup yields non-public or unresolved answers.'
    );
    expect(continuationPrompt).toContain(`launch an audited child stream with \`${helperCommand} child-stream --pipeline <docs-review|implementation-gate|docs-relevance-advisory>\``);
    expect(continuationPrompt).toContain('workspace-scoped artifact root');
    expect(continuationPrompt).toContain('do not use blanket `DELEGATION_GUARD_OVERRIDE_REASON` text when they exist');
    expect(continuationPrompt).not.toContain('subagent spawning unavailable in-session for this provider worker');
    expect(continuationPrompt).toContain('Review handoff states are `Human Review` and `In Review`');
    expect(continuationPrompt).toContain('Standalone-review policy for this provider-worker lane');
    expect(continuationPrompt).toContain('`codex-orchestrator review` / `npm run review`');
    expect(continuationPrompt).toContain('`FORCE_CODEX_REVIEW=1`');
    expect(continuationPrompt).toContain('`codex-orchestrator pr ready-review --pr <number> --quiet-minutes <window>`');
    expect(continuationPrompt).toContain('Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff');
    expect(continuationPrompt).toContain('about 2+ changed files or about 40+ changed lines');
    expect(continuationPrompt).toContain('use the wrapper-led review path by default');
    expect(continuationPrompt).toContain('do not hand off to review state unless a break-glass waiver is recorded with owner, expiry, reason, and evidence');
    expect(continuationPrompt).toContain('manual correctness/regressions/missing-tests review');
    expect(continuationPrompt).toContain('manual elegance checklist');
    expect(continuationPrompt).toContain('Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.');
    expect(continuationPrompt).toContain('`review_outcome: bounded-success`');
    expect(continuationPrompt).toContain('successful bounded review completion, not as a blocker or generic quiet-tail failure');
    expect(continuationPrompt).toContain('Treat `review_outcome: failed-boundary`');
    expect(continuationPrompt).toContain('Treat `failed-other` as a failed review command without a classified boundary');
    expect(continuationPrompt).toContain('not as proof of wrapper breakage');
    expect(continuationPrompt).toContain('Before handing off to the team\'s review state (`Human Review` or `In Review`), ensure required validation is green');
    expect(continuationPrompt).toContain('the latest `origin/main` is merged into the branch, PR checks are green, the `pr ready-review` drain is clean, and the workpad is refreshed to match completed work');
    expect(continuationPrompt).toContain('If the issue is in either review state, do not code; refresh the workpad if needed, record the handoff clearly, and end the turn.');
    expect(continuationPrompt).toContain('`Merging` and `Rework` are optional active workflow states only when the team exposes them.');
    expect(continuationPrompt).toContain('If the issue is in `Merging`, keep ownership and shepherd the PR through conflicts, checks, and final review until it merges.');
    expect(continuationPrompt).toContain('After the PR actually merges and before moving the issue to `Done`, inspect the shared local repo checkout at `/tmp/co` rather than the per-issue workspace');
    expect(continuationPrompt).toContain('`git -C "/tmp/co" status --short --branch`');
    expect(continuationPrompt).toContain('`git -C "/tmp/co" fetch origin refs/heads/main:refs/remotes/origin/main`');
    expect(continuationPrompt).toContain('`git -C "/tmp/co" merge --ff-only origin/main`');
    expect(continuationPrompt).toContain('leave it untouched and record the explicit skip reason before `Done`');
    expect(continuationPrompt).toContain('If the issue is in `Rework`, treat it as a full approach reset');
    expect(continuationPrompt).toContain('Stop coding once the issue reaches the team\'s review handoff state (`Human Review` or `In Review`) and end the turn after the handoff is complete.');
    expect(continuationPrompt).toContain('Shared source 0 anchor:');
    expect(continuationPrompt).toContain('- Source payload: `.runs/linear-lin-issue-1/cli/run-child/memory/source-0/source.txt`');
    expect(continuationPrompt).toContain('Relevant prior experiences (hints, not strict instructions):');
    expect(continuationPrompt).toContain('- Retrieval profile: executor');
    expect(continuationPrompt).toContain('- Pack id: pp-implementation');
    expect(continuationPrompt).toContain('[exp impl-1] Keep provider-worker changes narrowly scoped.');
  });

  it('builds continuation guidance for first-turn guarded resident restarts', () => {
    const issue = createTrackedIssue({
      state: 'Rework',
      description: 'Restart after review feedback without losing the active thread.',
      recent_activity: [
        {
          id: 'activity-2',
          created_at: '2026-03-21T09:01:00.000Z',
          actor_name: 'Reviewer',
          summary: 'Requested changes on the resident continuity seam'
        }
      ]
    });
    const helperCommand = SOURCE_HELPER_COMMAND;

    const prompt = buildProviderWorkerPrompt(issue, 1, 5, helperCommand, '/tmp/co', {
      residentSession: {
        logical_session_id: 'linear:lin-issue-1:resident-session',
        logical_turn_count: 20,
        restart_count: 1,
        continuity_state: 'guarded_resume_pending',
        source_run_id: 'run-prev',
        source_updated_at: '2026-03-21T09:00:00.000Z',
        source_end_reason: 'max_turns_reached_issue_still_active',
        source_thread_id: 'thread-1'
      },
      continueResidentSessionOnBoot: true
    });

    expect(prompt).toContain('Continuation guidance:');
    expect(prompt).toContain('guarded restart boundary');
    expect(prompt).toContain('logical resident turn #21');
    expect(prompt).toContain('Fresh Linear context for this guarded restart:');
    expect(prompt).toContain('- Current state: Rework');
    expect(prompt).toContain('Issue description:');
    expect(prompt).toContain('Restart after review feedback without losing the active thread.');
    expect(prompt).toContain('Recent activity:');
    expect(prompt).toContain('Requested changes on the resident continuity seam');
    expect(prompt).not.toContain('Treat this as the full first-turn task prompt for the current worker run.');
  });

  it('builds a source-aware provider helper command without reverting to the dist bin path', () => {
    const helperCommand = resolveProviderLinearHelperCommand({
      CODEX_ORCHESTRATOR_NODE_BIN: '/usr/bin/node'
    });

    expect(helperCommand).toContain('"/usr/bin/node"');
    expect(helperCommand).toContain('bin/codex-orchestrator.js');
    expect(helperCommand).not.toContain('dist/bin/codex-orchestrator.js');
    expect(helperCommand).toMatch(/ linear$/u);
  });

  it('includes deterministic mutation suppressions in continuation prompts when the same attempt already failed validation', () => {
    const issue = createTrackedIssue();
    const helperCommand = SOURCE_HELPER_COMMAND;
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
      parallelization_entries: [],
      latest_by_operation: {
        'create-follow-up': {
          recorded_at: '2026-03-21T09:00:00.000Z',
          operation: 'create-follow-up',
          ok: false,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          source_setup: null,
          action: null,
          via: null,
          state: null,
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: 'linear_follow_up_parity_matrix_missing',
          error_message: 'Parity/alignment follow-up issues require a parity matrix.'
        }
      }
    };

    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, '/tmp/co', {
      linearAudit: audit,
      attemptStartedAt: '2026-03-21T08:59:59.000Z'
    });

    expect(continuationPrompt).toContain(
      'Same-attempt deterministic provider mutation suppressions are in effect'
    );
    expect(continuationPrompt).toContain(
      'Do not retry `create-follow-up` in this attempt unless you first add the required parity matrix or explicitly reclassify the follow-up as non-parity/alignment and omit `--parity-lane`.'
    );
  });

  it('includes child-lane parent-dirty suppression guidance in continuation prompts for the same attempt', () => {
    const issue = createTrackedIssue();
    const helperCommand = SOURCE_HELPER_COMMAND;
    const audit = buildSingleEntryAuditSummary(buildChildLaneParentDirtyAuditEntry());

    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, '/tmp/co', {
      linearAudit: audit,
      attemptStartedAt: '2026-03-21T08:59:59.000Z'
    });

    expect(continuationPrompt).toContain(
      'Same-attempt deterministic provider mutation suppressions are in effect'
    );
    expect(continuationPrompt).toContain(
      'Do not retry `child-lane --action launch` in this attempt while the parent workspace still has in-scope dirty files.'
    );
  });

  it('preserves launch suppression guidance when later same-attempt child-lane audit entries target accept', () => {
    const issue = createTrackedIssue();
    const helperCommand = SOURCE_HELPER_COMMAND;
    const launchEntry = buildChildLaneParentDirtyAuditEntry();
    const acceptEntry = {
      ...launchEntry,
      recorded_at: '2026-03-21T09:01:00.000Z',
      action: 'accept:docs-a',
      error_message:
        'Parent workspace has in-scope pending changes: .tmp/notes.md. Revert, commit, or move scratch workpad/temp artifacts outside the repo before accepting the child lane.'
    };
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 2,
      success_count: 0,
      failure_count: 2,
      latest_recorded_at: '2026-03-21T09:01:00.000Z',
      latest_by_operation: {
        'child-lane': acceptEntry
      },
      parallelization_entries: [],
      entries: [launchEntry, acceptEntry]
    };

    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, '/tmp/co', {
      linearAudit: audit,
      attemptStartedAt: '2026-03-21T08:59:59.000Z'
    });

    expect(continuationPrompt).toContain(
      'Do not retry `child-lane --action launch` in this attempt while the parent workspace still has in-scope dirty files.'
    );
    expect(continuationPrompt).toContain(
      'Do not retry `child-lane --action accept` in this attempt while the parent workspace still has in-scope dirty files.'
    );
  });

  it('ignores deterministic suppressions logged for a different issue id', () => {
    const issue = createTrackedIssue();
    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, SOURCE_HELPER_COMMAND, '/tmp/co', {
      linearAudit: {
        path: '/tmp/provider-linear-worker-linear-audit.jsonl',
        attempted_count: 1,
        success_count: 0,
        failure_count: 1,
        latest_recorded_at: '2026-03-21T09:00:00.000Z',
        parallelization_entries: [],
        latest_by_operation: {},
        entries: [{
          recorded_at: '2026-03-21T09:00:00.000Z',
          operation: 'create-follow-up',
          ok: false,
          issue_id: 'lin-other-issue',
          issue_identifier: 'CO-999',
          source_setup: null,
          action: null,
          via: null,
          state: null,
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: 'linear_follow_up_parity_matrix_missing',
          error_message: 'Parity/alignment follow-up issues require a parity matrix.'
        }]
      },
      attemptStartedAt: '2026-03-21T08:59:59.000Z'
    });

    expect(continuationPrompt).not.toContain(
      'Same-attempt deterministic provider mutation suppressions are in effect'
    );
  });

  it('preserves deterministic launch suppression after a later successful sibling launch', () => {
    const issue = createTrackedIssue();
    const launchFailure = buildChildLaneParentDirtyAuditEntry({
      issue_id: issue.id,
      issue_identifier: issue.identifier
    });
    const laterSuccess = {
      ...launchFailure,
      recorded_at: '2026-03-21T09:01:00.000Z',
      ok: true,
      error_code: null,
      error_message: null
    };
    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, SOURCE_HELPER_COMMAND, '/tmp/co', {
      linearAudit: {
        attempted_count: 2,
        success_count: 1,
        failure_count: 1,
        latest_recorded_at: '2026-03-21T09:01:00.000Z',
        parallelization_entries: [],
        latest_by_operation: {
          'child-lane': laterSuccess
        },
        entries: [launchFailure, laterSuccess]
      } as ProviderLinearAuditSummary,
      attemptStartedAt: '2026-03-21T08:59:59.000Z'
    });

    expect(continuationPrompt).toContain(
      'Same-attempt deterministic provider mutation suppressions are in effect'
    );
    expect(continuationPrompt).toContain(
      'Do not retry `child-lane --action launch` in this attempt while the parent workspace still has in-scope dirty files.'
    );
  });

  it('ignores deterministic mutation suppressions that predate the current attempt', () => {
    const issue = createTrackedIssue();
    const helperCommand = SOURCE_HELPER_COMMAND;
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
      parallelization_entries: [],
      latest_by_operation: {
        'create-follow-up': {
          recorded_at: '2026-03-21T09:00:00.000Z',
          operation: 'create-follow-up',
          ok: false,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          source_setup: null,
          action: null,
          via: null,
          state: null,
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: 'linear_follow_up_parity_matrix_missing',
          error_message: 'Parity/alignment follow-up issues require a parity matrix.'
        }
      }
    };

    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, '/tmp/co', {
      linearAudit: audit,
      attemptStartedAt: '2026-03-21T09:00:01.000Z'
    });

    expect(continuationPrompt).not.toContain(
      'Same-attempt deterministic provider mutation suppressions are in effect'
    );
    expect(continuationPrompt).not.toContain(
      'Do not retry `create-follow-up` in this attempt unless you first add the required parity matrix or explicitly reclassify the follow-up as non-parity/alignment and omit `--parity-lane`.'
    );
  });

  it('ignores deterministic mutation suppressions when the current attempt start is missing', () => {
    const issue = createTrackedIssue();
    const helperCommand = SOURCE_HELPER_COMMAND;
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
      parallelization_entries: [],
      latest_by_operation: {
        'create-follow-up': {
          recorded_at: '2026-03-21T09:00:00.000Z',
          operation: 'create-follow-up',
          ok: false,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          source_setup: null,
          action: null,
          via: null,
          state: null,
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: 'linear_follow_up_parity_matrix_missing',
          error_message: 'Parity/alignment follow-up issues require a parity matrix.'
        }
      }
    };

    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, '/tmp/co', {
      linearAudit: audit
    });

    expect(continuationPrompt).not.toContain(
      'Same-attempt deterministic provider mutation suppressions are in effect'
    );
    expect(continuationPrompt).not.toContain(
      'Do not retry `create-follow-up` in this attempt unless you first add the required parity matrix or explicitly reclassify the follow-up as non-parity/alignment and omit `--parity-lane`.'
    );
  });

  it('suppresses deterministic workpad validation retries within the same attempt', () => {
    const issue = createTrackedIssue();
    const helperCommand = SOURCE_HELPER_COMMAND;
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
      parallelization_entries: [],
      latest_by_operation: {
        'upsert-workpad': {
          recorded_at: '2026-03-21T09:00:00.000Z',
          operation: 'upsert-workpad',
          ok: false,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          source_setup: null,
          action: null,
          via: null,
          state: null,
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: 'workpad_marker_missing',
          error_message: 'Workpad body must contain "## Codex Workpad".'
        }
      }
    };

    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, '/tmp/co', {
      linearAudit: audit,
      attemptStartedAt: '2026-03-21T08:59:59.000Z'
    });

    expect(continuationPrompt).toContain(
      'Same-attempt deterministic provider mutation suppressions are in effect'
    );
    expect(continuationPrompt).toContain(
      'Do not retry `upsert-workpad` in this attempt until you first fix the deterministic validation error (workpad_marker_missing: Workpad body must contain "## Codex Workpad".).'
    );
  });

  it('suppresses archived issue mutations within the same attempt', () => {
    const issue = createTrackedIssue();
    const helperCommand = SOURCE_HELPER_COMMAND;
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
      parallelization_entries: [],
      latest_by_operation: {
        'upsert-workpad': {
          recorded_at: '2026-03-21T09:00:00.000Z',
          operation: 'upsert-workpad',
          ok: false,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          source_setup: null,
          action: null,
          via: null,
          state: null,
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: 'linear_issue_not_mutable',
          error_message: 'Linear issue CO-2 is archived and trashed and cannot accept provider mutations.'
        }
      }
    };

    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, '/tmp/co', {
      linearAudit: audit,
      attemptStartedAt: '2026-03-21T08:59:59.000Z'
    });

    expect(continuationPrompt).toContain(
      'Same-attempt deterministic provider mutation suppressions are in effect'
    );
    expect(continuationPrompt).toContain(
      'Do not retry `upsert-workpad` in this attempt until the Linear issue is restored to a mutable active state.'
    );
  });

  it('suppresses provenance-invalid child-lane launches within the same attempt', () => {
    const issue = createTrackedIssue();
    const helperCommand = SOURCE_HELPER_COMMAND;
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
      parallelization_entries: [],
      latest_by_operation: {
        'child-lane': {
          recorded_at: '2026-03-21T09:00:00.000Z',
          operation: 'child-lane',
          ok: false,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          source_setup: null,
          action: null,
          via: null,
          state: null,
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: 'provider_worker_child_lane_provenance_invalid',
          error_message: 'linear child-lane requires provider control-host provenance recorded on the parent provider-worker manifest and matching active environment.'
        }
      }
    };

    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, '/tmp/co', {
      linearAudit: audit,
      attemptStartedAt: '2026-03-21T08:59:59.000Z'
    });

    expect(continuationPrompt).toContain('Same-attempt deterministic provider mutation suppressions are in effect');
    expect(continuationPrompt).toContain('Do not retry `child-lane` until you first confirm the parent provider-worker run now has matching control-host provenance recorded in the manifest and active environment; if that provenance has already been repaired since the failed audit entry, you may retry once without restarting the attempt. Preserve the fail-closed provenance contract instead of forcing the launch.');
  });

  it('keeps non-launch child-lane provenance suppressions generic within the same attempt', () => {
    const issue = createTrackedIssue();
    const helperCommand = SOURCE_HELPER_COMMAND;
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
      parallelization_entries: [],
      latest_by_operation: {
        'child-lane': {
          recorded_at: '2026-03-21T09:00:00.000Z',
          operation: 'child-lane',
          ok: false,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          source_setup: null,
          action: 'accept',
          via: null,
          state: null,
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: 'provider_worker_child_lane_provenance_invalid',
          error_message: 'Pending child lane docs-packet must stay bound to task linear-issue-1-docs-packet; recorded task was linear-issue-1-other-stream.'
        }
      }
    };

    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, '/tmp/co', {
      linearAudit: audit,
      attemptStartedAt: '2026-03-21T08:59:59.000Z'
    });

    expect(continuationPrompt).toContain('Same-attempt deterministic provider mutation suppressions are in effect');
    expect(continuationPrompt).toContain('Do not retry `child-lane` until you first confirm the pending child-lane record now matches the expected parent-owned pipeline, task, and issue binding; if that binding has already been repaired since the failed audit entry, you may retry once without restarting the attempt. Preserve the fail-closed provenance contract instead of forcing the decision.');
    expect(continuationPrompt).not.toContain('matching control-host provenance recorded in the manifest and active environment');
  });

  it('ignores malformed audit summaries when deriving continuation suppressions', () => {
    const issue = createTrackedIssue();
    const helperCommand = SOURCE_HELPER_COMMAND;

    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, '/tmp/co', {
      linearAudit: {
        path: '/tmp/provider-linear-worker-linear-audit.jsonl',
        attempted_count: 1,
        success_count: 0,
        failure_count: 1,
        latest_recorded_at: '2026-03-21T09:00:00.000Z',
        latest_by_operation: null
      } as unknown as ProviderLinearAuditSummary,
      attemptStartedAt: '2026-03-21T08:59:59.000Z'
    });

    expect(continuationPrompt).not.toContain(
      'Same-attempt deterministic provider mutation suppressions are in effect'
    );
  });

  it('parses thread and turn lineage from codex jsonl output', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"agent_message","message":"done"}}',
        '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
      ].join('\n')
    );

    expect(parsed).toEqual({
      threadId: 'thread-1',
      turnId: 'turn-1',
      finalMessage: 'done',
      lastEvent: 'task_complete',
      lastEventAt: null,
      currentTurnActivity: {
        event: 'agent_message',
        message_or_payload: 'done',
        recorded_at: null,
        source: 'stdout_jsonl',
        turn_id: 'turn-1',
        session_id: 'thread-1-turn-1'
      },
      tokens: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null
      },
      rateLimits: null,
      authProvenance: null,
      failureDiagnosis: null
    });
  });

  it('parses token totals and rate limits from codex jsonl output', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"params":{"tokenUsage":{"total":{"input_tokens":12,"output_tokens":8,"total_tokens":20}}}}',
        '{"rate_limits":{"limit_id":"coding","primary":{"remaining":42}}}',
        '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:00.500Z"}}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 12,
      output_tokens: 8,
      total_tokens: 20
    });
    expect(parsed.rateLimits).toEqual({
      limit_id: 'coding',
      primary: {
        remaining: 42
      }
    });
    expect(parsed.lastEventAt).toBe('2026-03-21T09:00:00.500Z');
  });

  it('parses appserver session-log session_meta and token_count telemetry', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"timestamp":"2026-03-21T09:00:00.000Z","type":"session_meta","payload":{"id":"thread-1","cwd":"/tmp/provider-worker","source":"exec"}}',
        '{"timestamp":"2026-03-21T09:00:00.050Z","type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"timestamp":"2026-03-21T09:00:00.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":12,"output_tokens":8,"total_tokens":20}},"rate_limits":{"primary":{"used_percent":12.5,"window_minutes":300},"secondary":{"used_percent":48,"window_minutes":10080}}}}'
      ].join('\n')
    );

    expect(parsed).toMatchObject({
      threadId: 'thread-1',
      turnId: 'turn-1',
      lastEvent: 'token_count',
      lastEventAt: '2026-03-21T09:00:00.100Z',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rateLimits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      }
    });
  });

  it('clears stale current-turn activity when bookkeeping switches to a new thread before new turn activity arrives', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"agent_message","message":"Investigating provider-worker EVENT provenance."}}',
        '{"timestamp":"2026-03-21T09:00:01.000Z","type":"session_meta","payload":{"id":"thread-2","cwd":"/tmp/provider-worker","source":"exec"}}'
      ].join('\n')
    );

    expect(parsed).toEqual({
      threadId: 'thread-2',
      turnId: null,
      finalMessage: null,
      lastEvent: null,
      lastEventAt: null,
      currentTurnActivity: null,
      tokens: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null
      },
      rateLimits: null,
      authProvenance: null,
      failureDiagnosis: null
    });
  });

  it('does not reuse a stale turn id after a bookkeeping-only thread swap', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"agent_message","message":"Investigating provider-worker EVENT provenance."}}',
        '{"timestamp":"2026-03-21T09:00:01.000Z","type":"session_meta","payload":{"id":"thread-2","cwd":"/tmp/provider-worker","source":"exec"}}',
        '{"type":"notification","method":"item/completed","params":{"item":{"type":"fileChange","status":"completed"}},"timestamp":"2026-03-21T09:00:02.000Z"}'
      ].join('\n')
    );

    expect(parsed).toMatchObject({
      threadId: 'thread-2',
      turnId: null,
      lastEvent: 'item/completed',
      lastEventAt: '2026-03-21T09:00:02.000Z',
      currentTurnActivity: {
        event: 'item/completed',
        message_or_payload: 'item completed: file change',
        recorded_at: '2026-03-21T09:00:02.000Z',
        source: 'stdout_jsonl',
        turn_id: null,
        session_id: null
      }
    });
  });

  it('parses live turn.completed usage and derives total tokens when the Codex stream omits total_tokens', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn.completed","usage":{"input_tokens":32795,"cached_input_tokens":3456,"output_tokens":52}}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 32795,
      output_tokens: 52,
      total_tokens: 32847
    });
    expect(parsed.lastEvent).toBe('turn.completed');
  });

  it('parses Codex 0.125 reasoning output tokens from turn.completed usage', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn.completed","usage":{"input_tokens":32795,"cached_input_tokens":3456,"output_tokens":52,"reasoning_output_tokens":17}}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 32795,
      output_tokens: 52,
      total_tokens: 32847,
      reasoning_output_tokens: 17
    });
    expect(parsed.lastEvent).toBe('turn.completed');
  });

  it('preserves reasoning output tokens when later legacy token samples omit them', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn.completed","usage":{"input_tokens":32795,"cached_input_tokens":3456,"output_tokens":52,"reasoning_output_tokens":17}}',
        '{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":32800,"output_tokens":60,"total_tokens":32860}}}}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 32800,
      output_tokens: 60,
      total_tokens: 32860,
      reasoning_output_tokens: 17
    });
  });

  it('preserves core token counts on reasoning-only updates', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":100,"output_tokens":20,"total_tokens":120}}}}',
        '{"type":"turn.completed","usage":{"reasoning_output_tokens":9}}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 100,
      output_tokens: 20,
      total_tokens: 120,
      reasoning_output_tokens: 9
    });
  });

  it('uses a fresh observed reasoning output token value when the sample includes one', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn.completed","usage":{"input_tokens":100,"output_tokens":20,"reasoning_output_tokens":9}}',
        '{"type":"notification","payload":{"method":"thread/tokenUsage/updated","params":{"tokenUsage":{"inputTokens":10,"outputTokens":5,"totalTokens":15,"reasoningOutputTokens":3}}},"timestamp":"2026-03-21T09:00:00.100Z"}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 10,
      output_tokens: 5,
      total_tokens: 15,
      reasoning_output_tokens: 3
    });
  });

  it('parses appserver method telemetry into proof event/message semantics', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"notification","method":"thread/tokenUsage/updated","params":{"tokenUsage":{"total":{"inputTokens":12,"outputTokens":4,"totalTokens":16}}},"timestamp":"2026-03-21T09:00:00.100Z"}',
        '{"type":"notification","method":"item/completed","params":{"item":{"type":"fileChange","status":"completed"}},"timestamp":"2026-03-21T09:00:00.200Z"}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 12,
      output_tokens: 4,
      total_tokens: 16
    });
    expect(parsed.lastEvent).toBe('item/completed');
    expect(parsed.finalMessage).toBe('item completed: file change');
    expect(parsed.lastEventAt).toBe('2026-03-21T09:00:00.200Z');
  });

  it('parses payload-wrapped notification token usage into live proof totals', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"notification","payload":{"method":"thread/tokenUsage/updated","params":{"tokenUsage":{"total":{"inputTokens":18,"outputTokens":6,"totalTokens":24}}}},"timestamp":"2026-03-21T09:00:00.100Z"}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 18,
      output_tokens: 6,
      total_tokens: 24
    });
    expect(parsed.lastEvent).toBe('thread/tokenUsage/updated');
    expect(parsed.finalMessage).toBe('thread token usage updated (in 18 / out 6 / total 24)');
    expect(parsed.lastEventAt).toBe('2026-03-21T09:00:00.100Z');
  });

  it('preserves streamed appserver assistant text across later telemetry notifications', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"notification","method":"item/agentMessage/delta","params":{"threadId":"thread-1","turnId":"turn-1","itemId":"msg-1","delta":"app-server "}}',
        '{"type":"notification","method":"item/agentMessage/delta","params":{"threadId":"thread-1","turnId":"turn-1","itemId":"msg-1","delta":"final answer"}}',
        '{"type":"notification","method":"thread/tokenUsage/updated","params":{"tokenUsage":{"total":{"inputTokens":18,"outputTokens":6,"totalTokens":24}}},"timestamp":"2026-03-21T09:00:00.100Z"}',
        '{"type":"notification","method":"account/rateLimits/updated","params":{"rateLimits":{}},"timestamp":"2026-03-21T09:00:00.200Z"}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 18,
      output_tokens: 6,
      total_tokens: 24
    });
    expect(parsed.lastEvent).toBe('account/rateLimits/updated');
    expect(parsed.finalMessage).toBe('app-server final answer');
    expect(parsed.lastEventAt).toBe('2026-03-21T09:00:00.200Z');
  });

  it('keeps token-update humanization aligned with parser-supported tokenUsage shapes', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"notification","payload":{"method":"thread/tokenUsage/updated","params":{"tokenUsage":{"inputTokens":7,"outputTokens":5,"totalTokens":12,"reasoningOutputTokens":3}}},"timestamp":"2026-03-21T09:00:00.100Z"}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 7,
      output_tokens: 5,
      total_tokens: 12,
      reasoning_output_tokens: 3
    });
    expect(parsed.finalMessage).toBe('thread token usage updated (in 7 / out 5 / total 12 / reasoning 3)');
  });

  it('parses Codex usage-window rate limits without a legacy limit id', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"notification","method":"account/rateLimits/updated","params":{"rateLimits":{"primary":{"usedPercent":12.5,"windowDurationMins":300},"secondary":{"usedPercent":48,"windowDurationMins":10080}}},"timestamp":"2026-03-21T09:00:00.500Z"}'
      ].join('\n')
    );

    expect(parsed.rateLimits).toEqual({
      primary: {
        usedPercent: 12.5,
        windowDurationMins: 300
      },
      secondary: {
        usedPercent: 48,
        windowDurationMins: 10080
      }
    });
    expect(parsed.lastEvent).toBe('account/rateLimits/updated');
    expect(parsed.finalMessage).toBe('rate limits updated: 5-hour 12.5% / 300m; weekly 48% / 10080m');
    expect(parsed.lastEventAt).toBe('2026-03-21T09:00:00.500Z');
  });

  it('parses legacy nested rate-limit envelopes from appserver payloads', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"notification","method":"account/rateLimits/updated","params":{"msg":{"payload":{"info":{"rate_limits":{"limit_id":"coding","primary":{"remaining":42}}}}}},"timestamp":"2026-03-21T09:00:00.500Z"}'
      ].join('\n')
    );

    expect(parsed.rateLimits).toEqual({
      limit_id: 'coding',
      primary: {
        remaining: 42
      }
    });
    expect(parsed.lastEvent).toBe('account/rateLimits/updated');
    expect(parsed.finalMessage).toBe('rate limits updated: primary remaining 42');
    expect(parsed.lastEventAt).toBe('2026-03-21T09:00:00.500Z');
  });

  it('parses payload-wrapped legacy rate-limit envelopes from appserver notifications', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"notification","payload":{"method":"account/rateLimits/updated","params":{"msg":{"payload":{"info":{"rate_limits":{"limit_id":"coding","primary":{"remaining":42}}}}}}},"timestamp":"2026-03-21T09:00:00.500Z"}'
      ].join('\n')
    );

    expect(parsed.rateLimits).toEqual({
      limit_id: 'coding',
      primary: {
        remaining: 42
      }
    });
    expect(parsed.lastEvent).toBe('account/rateLimits/updated');
    expect(parsed.finalMessage).toBe('rate limits updated: primary remaining 42');
    expect(parsed.lastEventAt).toBe('2026-03-21T09:00:00.500Z');
  });

  it('parses non-payload snake-case rate-limit envelopes from appserver notifications', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"notification","method":"account/rateLimits/updated","params":{"rate_limits":{"primary":{"usedPercent":12.5,"windowDurationMins":300},"secondary":{"usedPercent":48,"windowDurationMins":10080}}},"timestamp":"2026-03-21T09:00:00.500Z"}'
      ].join('\n')
    );

    expect(parsed.rateLimits).toEqual({
      primary: {
        usedPercent: 12.5,
        windowDurationMins: 300
      },
      secondary: {
        usedPercent: 48,
        windowDurationMins: 10080
      }
    });
    expect(parsed.lastEvent).toBe('account/rateLimits/updated');
    expect(parsed.finalMessage).toBe('rate limits updated: 5-hour 12.5% / 300m; weekly 48% / 10080m');
    expect(parsed.lastEventAt).toBe('2026-03-21T09:00:00.500Z');
  });

  it('preserves reset-only rate-limit snapshots even when the latest line is a raw proof fragment', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"notification","method":"account/rateLimits/updated","params":{"rateLimits":{"primary":{"usedPercent":12.5,"windowDurationMins":300},"secondary":{"usedPercent":48,"windowDurationMins":10080}}},"timestamp":"2026-03-21T09:00:00.500Z"}',
        '{"rate_limits":{"limit_id":"coding","primary":{"reset_at":"2026-03-21T10:00:00.000Z"}}}'
      ].join('\n')
    );

    expect(parsed.rateLimits).toEqual({
      limit_id: 'coding',
      primary: {
        reset_at: '2026-03-21T10:00:00.000Z'
      }
    });
    expect(parsed.finalMessage).toBe('rate limits updated: 5-hour 12.5% / 300m; weekly 48% / 10080m');
  });

  it('humanizes reset-only rate-limit notifications from appserver envelopes', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"notification","method":"account/rateLimits/updated","params":{"rate_limits":{"limit_id":"coding","primary":{"reset_at":"2026-03-21T10:00:00.000Z"}}},"timestamp":"2026-03-21T09:00:00.500Z"}'
      ].join('\n')
    );

    expect(parsed.rateLimits).toEqual({
      limit_id: 'coding',
      primary: {
        reset_at: '2026-03-21T10:00:00.000Z'
      }
    });
    expect(parsed.lastEvent).toBe('account/rateLimits/updated');
    expect(parsed.finalMessage).toBe(
      'rate limits updated: primary resets at 2026-03-21T10:00:00.000Z'
    );
    expect(parsed.lastEventAt).toBe('2026-03-21T09:00:00.500Z');
  });

  it('ignores truly unrenderable rate-limit snapshots that would overwrite useful telemetry', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"notification","method":"account/rateLimits/updated","params":{"rateLimits":{"primary":{"usedPercent":12.5,"windowDurationMins":300},"secondary":{"usedPercent":48,"windowDurationMins":10080}}},"timestamp":"2026-03-21T09:00:00.500Z"}',
        '{"rate_limits":{"limit_id":"coding","primary":{"bucket":"unknown"}}}'
      ].join('\n')
    );

    expect(parsed.rateLimits).toEqual({
      primary: {
        usedPercent: 12.5,
        windowDurationMins: 300
      },
      secondary: {
        usedPercent: 48,
        windowDurationMins: 10080
      }
    });
    expect(parsed.finalMessage).toBe('rate limits updated: 5-hour 12.5% / 300m; weekly 48% / 10080m');
  });

  it('ignores credits-only rate-limit snapshots that would overwrite useful windows', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"notification","method":"account/rateLimits/updated","params":{"rateLimits":{"primary":{"usedPercent":12.5,"windowDurationMins":300},"secondary":{"usedPercent":48,"windowDurationMins":10080}}},"timestamp":"2026-03-21T09:00:00.500Z"}',
        '{"rate_limits":{"credits":{"balance":123}}}'
      ].join('\n')
    );

    expect(parsed.rateLimits).toEqual({
      primary: {
        usedPercent: 12.5,
        windowDurationMins: 300
      },
      secondary: {
        usedPercent: 48,
        windowDurationMins: 10080
      }
    });
    expect(parsed.finalMessage).toBe('rate limits updated: 5-hour 12.5% / 300m; weekly 48% / 10080m');
  });

  it('preserves Codex 0.121 account/auth-profile provenance while redacting raw values', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        JSON.stringify({
          type: 'notification',
          method: 'account/authProfile/updated',
          params: {
            authProfile: 'personal-profile',
            account: {
              id: 'acct_raw_123',
              email: 'operator@example.com'
            },
            credentialSource: 'codex_login',
            authFreshness: 'fresh'
          },
          timestamp: '2026-04-15T20:45:18.000Z'
        }),
        JSON.stringify({
          type: 'notification',
          method: 'account/rateLimits/updated',
          params: {
            rateLimits: {
              primary: {
                usedPercent: 42,
                windowDurationMins: 300
              }
            },
            accountPlan: 'prolite',
            whamPlan: 'unknown_wham_plan'
          },
          timestamp: '2026-04-15T20:45:19.000Z'
        })
      ].join('\n')
    );

    expect(parsed.authProvenance).toMatchObject({
      provider_kind: 'codex',
      active_profile_fingerprint: testFingerprint('personal-profile'),
      active_account_fingerprint: testFingerprint('acct_raw_123'),
      credential_source: 'codex_login',
      auth_freshness: 'fresh',
      observed_at: '2026-04-15T20:45:18.000Z',
      source: 'stdout_jsonl'
    });
    expect(JSON.stringify(parsed.authProvenance)).not.toContain('personal-profile');
    expect(JSON.stringify(parsed.authProvenance)).not.toContain('acct_raw_123');
    expect(JSON.stringify(parsed.authProvenance)).not.toContain('operator@example.com');
    expect(parsed.failureDiagnosis).toBeNull();
    expect(parsed.rateLimits).toEqual({
      primary: {
        usedPercent: 42,
        windowDurationMins: 300
      }
    });
  });

  it('uses the worker env fingerprint key when parsing auth provenance from JSONL', () => {
    delete process.env.CODEX_AUTH_PROVENANCE_FINGERPRINT_KEY;

    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'notification',
        method: 'account/authProfile/updated',
        params: {
          authProfile: 'worker-env-profile',
          account: {
            id: 'worker-env-account'
          },
          credentialSource: 'codex_login',
          authFreshness: 'fresh'
        },
        timestamp: '2026-04-15T20:45:18.000Z'
      }),
      {
        CODEX_AUTH_PROVENANCE_FINGERPRINT_KEY: TEST_AUTH_PROVENANCE_FINGERPRINT_KEY
      }
    );

    expect(parsed.authProvenance).toMatchObject({
      active_profile_fingerprint: testFingerprint('worker-env-profile'),
      active_account_fingerprint: testFingerprint('worker-env-account'),
      credential_source: 'codex_login',
      auth_freshness: 'fresh',
      source: 'stdout_jsonl'
    });
  });

  it('extracts auth provenance from every supported auth container', () => {
    const cases: Array<[Record<string, unknown>, string, string]> = [
      [{
        type: 'notification',
        method: 'account/authProfile/updated',
        auth: {
          profileId: 'top-profile',
          account: { id: 'top-acct-raw', email: 'top@example.com' },
          credentialSource: 'codex_login',
          authFreshness: 'fresh'
        }
      }, 'top-profile', 'top-acct-raw'],
      [{
        type: 'event_msg',
        payload: {
          type: 'account/authProfile/updated',
          auth: {
            profile_id: 'payload-profile',
            account_id: 'payload-acct-raw',
            credential_source: 'device_auth',
            auth_freshness: 'recent'
          }
        }
      }, 'payload-profile', 'payload-acct-raw']
    ];

    for (const [event, profile, account] of cases) {
      const parsed = parseProviderLinearWorkerJsonl(JSON.stringify(event));
      expect(parsed.authProvenance).toMatchObject({
        provider_kind: 'codex',
        active_profile_fingerprint: testFingerprint(profile),
        active_account_fingerprint: testFingerprint(account),
        source: 'stdout_jsonl'
      });
      expect(JSON.stringify(parsed.authProvenance)).not.toContain(profile);
      expect(JSON.stringify(parsed.authProvenance)).not.toContain(account);
    }
  });

  it('extracts redacted auth provenance from Agent Identity containers', () => {
    const cases: Array<{
      event: Record<string, unknown>;
      profile: string;
      account: string;
      email?: string;
      credentialSource: string;
      authFreshness: string;
      observedAt: string;
    }> = [
      {
        event: {
          type: 'notification',
          method: 'agentIdentity/auth/updated',
          params: {
            agentIdentity: {
              profileId: 'agent-profile-raw-1',
              account: {
                id: 'agent-account-raw-1',
                email: 'agent-operator@example.com'
              },
              credentialSource: 'agent_identity',
              authFreshness: 'fresh'
            }
          },
          timestamp: '2026-05-01T00:45:00.000Z'
        },
        profile: 'agent-profile-raw-1',
        account: 'agent-account-raw-1',
        email: 'agent-operator@example.com',
        credentialSource: 'agent_identity',
        authFreshness: 'fresh',
        observedAt: '2026-05-01T00:45:00.000Z'
      },
      {
        event: {
          type: 'event_msg',
          payload: {
            type: 'agent_identity.auth.updated',
            params: {
              agent_identity: {
                profile_id: 'agent-profile-raw-2',
                account_id: 'agent-account-raw-2',
                credential_source: 'Agent Identity',
                auth_freshness: 'valid'
              }
            },
            timestamp: '2026-05-01T00:45:01.000Z'
          }
        },
        profile: 'agent-profile-raw-2',
        account: 'agent-account-raw-2',
        credentialSource: 'agent_identity',
        authFreshness: 'valid',
        observedAt: '2026-05-01T00:45:01.000Z'
      }
    ];

    for (const {
      event,
      profile,
      account,
      email,
      credentialSource,
      authFreshness,
      observedAt
    } of cases) {
      const parsed = parseProviderLinearWorkerJsonl(JSON.stringify(event));
      expect(parsed.authProvenance).toMatchObject({
        provider_kind: 'codex',
        active_profile_fingerprint: testFingerprint(profile),
        active_account_fingerprint: testFingerprint(account),
        credential_source: credentialSource,
        auth_freshness: authFreshness,
        observed_at: observedAt,
        source: 'stdout_jsonl'
      });
      const serialized = JSON.stringify(parsed.authProvenance);
      expect(serialized).not.toContain(profile);
      expect(serialized).not.toContain(account);
      if (email) {
        expect(serialized).not.toContain(email);
      }
    }
  });

  it('does not let older auth provenance events overwrite newer fingerprints', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        JSON.stringify({
          type: 'notification',
          method: 'account/authProfile/updated',
          params: {
            auth: {
              profile_id: 'new-profile',
              account_id: 'new-account',
              credential_source: 'codex_login',
              auth_freshness: 'fresh'
            }
          },
          timestamp: '2026-04-15T20:46:00.000Z'
        }),
        JSON.stringify({
          type: 'notification',
          method: 'account/authProfile/updated',
          params: {
            auth: {
              profile_id: 'old-profile',
              account_id: 'old-account',
              credential_source: 'device_auth',
              auth_freshness: 'stale'
            }
          },
          timestamp: '2026-04-15T20:45:00.000Z'
        })
      ].join('\n')
    );

    expect(parsed.authProvenance).toMatchObject({
      active_profile_fingerprint: testFingerprint('new-profile'),
      active_account_fingerprint: testFingerprint('new-account'),
      credential_source: 'codex_login',
      auth_freshness: 'fresh',
      observed_at: '2026-04-15T20:46:00.000Z'
    });
    expect(JSON.stringify(parsed.authProvenance)).not.toContain('old-profile');
    expect(JSON.stringify(parsed.authProvenance)).not.toContain('old-account');
  });

  it('classifies Codex 0.121 quota variants and preserves safe plan context', () => {
    const cases: Array<[Record<string, unknown>, string[]]> = [
      [
        {
          method: 'account/rateLimits/exhausted',
          params: {
            message: 'Rate limit exhausted for prolite account; unknown WHAM plan value was decoded.',
            accountPlan: 'prolite',
            whamPlan: 'unknown_wham_plan'
          }
        },
        ['account_plan=prolite', 'wham_plan=unknown_wham_plan']
      ],
      [
        {
          method: 'account/rateLimits/exhausted',
          params: {
            message: `Rate limit exhausted. ${'x'.repeat(600)}`,
            accountPlan: 'prolite',
            whamPlan: 'unknown_wham_plan'
          }
        },
        ['account_plan=prolite', 'wham_plan=unknown_wham_plan']
      ],
      [{ method: 'account/rateLimits/exhausted' }, []],
      [
        {
          method: 'account/rateLimits/exhausted',
          params: { msg: { payload: { info: { accountPlan: 'prolite', whamPlan: 'unknown_wham_plan' } } } }
        },
        ['account_plan=prolite', 'wham_plan=unknown_wham_plan']
      ],
      [
        {
          method: 'account/rateLimits/exhausted',
          params: {
            message: 'Rate limit exhausted.',
            accountPlan: 'customer_internal_gold_123',
            whamPlan: 'acct_raw_123'
          }
        },
        ['account_plan=redacted', 'wham_plan=redacted']
      ],
      [
        {
          type: 'error',
          message: 'Rate limits exhausted for prolite account.'
        },
        []
      ],
      [
        {
          type: 'error',
          message: 'Token quota exceeded for this account.'
        },
        ['Token quota exceeded']
      ],
      [
        {
          type: 'error',
          message: 'Token limit exceeded for this account.'
        },
        ['Token limit exceeded']
      ],
      [
        {
          type: 'error',
          message: 'Rate limit for tokens reached.'
        },
        ['Rate limit for tokens reached']
      ]
    ];

    for (const [event, expectedSignalParts] of cases) {
      const parsed = parseProviderLinearWorkerJsonl(
        JSON.stringify({ type: 'notification', timestamp: '2026-04-15T20:45:19.000Z', ...event })
      );
      expect(parsed.failureDiagnosis).toMatchObject({
        diagnostic_category: 'quota_rate_limit',
        source: 'stdout_jsonl'
      });
      expect(parsed.failureDiagnosis?.signal.length).toBeLessThanOrEqual(500);
      for (const part of expectedSignalParts) {
        expect(parsed.failureDiagnosis?.signal).toContain(part);
      }
    }
  });

  it('classifies provider diagnostics before truncating the persisted signal', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'error',
        message: `${'provider stack frame '.repeat(60)}Rate limit exhausted for prolite account.`,
        timestamp: '2026-04-15T20:45:20.000Z'
      })
    );

    expect(parsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'quota_rate_limit',
      source: 'stdout_jsonl',
      observed_at: '2026-04-15T20:45:20.000Z'
    });
    expect(parsed.failureDiagnosis?.signal.length).toBeLessThanOrEqual(500);
  });

  it('redacts unsafe credential-source labels and auth identifiers from provider diagnostics', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'notification',
        method: 'account/authProfile/mismatch',
        params: {
          credentialSource: 'operator@example.com',
          authFreshness: 'profile=personal-profile',
          message:
            'profile mismatch for operator@example.com OPENAI_API_KEY=secret-openai-key "OPENAI_API_KEY":"secret-openai-json" CODEX_AGENT_IDENTITY=agent-identity-secret oauth_refresh=secret-oauth-refresh oauth_access=secret-oauth-access {"profile_id":"personal-profile","account_id":"acct_raw_123","org_id":"org_raw_456","refresh_token":"secret-refresh-token"} profile id personal-profile account id acct-raw-123 organization id org-raw-456 user id user-raw-789 session id sess-secret-123 refresh token secret-refresh-token standalone acct-standalone-123 org-standalone-456 user-standalone-789 account id abc123 profile identifier xyz789 account id: acctcolon123 profile id: profilecolon123 organization id: orgcolon123 user id: usercolon123 session id: sesscolon123'
        },
        timestamp: '2026-04-15T20:45:21.000Z'
      })
    );

    expect(parsed.authProvenance).toMatchObject({
      provider_kind: 'codex',
      credential_source: 'redacted',
      auth_freshness: 'redacted'
    });
    expect(JSON.stringify(parsed.authProvenance)).not.toContain('operator@example.com');
    expect(JSON.stringify(parsed.authProvenance)).not.toContain('personal-profile');
    expect(parsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'auth_mismatch',
      source: 'stdout_jsonl'
    });
    const signal = parsed.failureDiagnosis?.signal ?? '';
    for (const fragment of [
      'personal-profile', 'acct_raw_123', 'acct-raw-123', 'acct-standalone-123',
      'org_raw_456', 'org-raw-456', 'org-standalone-456',
      'user-raw-789', 'user-standalone-789', 'abc123', 'xyz789',
      'acctcolon123', 'profilecolon123', 'orgcolon123', 'usercolon123', 'sesscolon123',
      'operator@example.com', 'example.com', 'secret-refresh-token',
      'secret-oauth-refresh', 'secret-oauth-access', 'secret-openai-key',
      'secret-openai-json', 'agent-identity-secret', 'sess-secret-123'
    ]) {
      expect(signal).not.toContain(fragment);
    }
    for (const fragment of [
      '<email-redacted>', 'OPENAI_API_KEY=<redacted>', '"OPENAI_API_KEY":"<redacted>"',
      'CODEX_AGENT_IDENTITY=<redacted>',
      'oauth_refresh=<redacted>', 'oauth_access=<redacted>', '"refresh_token":"<redacted>"',
      'session id <redacted>', 'profile id <redacted>',
      'account id <redacted>', 'organization id <redacted>', 'user id <redacted>'
    ]) {
      expect(signal).toContain(fragment);
    }
  });

  it('redacts structured Agent Identity values from provider diagnostics', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'notification',
        method: 'account/authProfile/mismatch',
        params: {
          message:
            'agent identity probe CODEX_AGENT_IDENTITY={"id":"agent-identity-deep-id","account":{"owner":{"id":"agent-identity-deep-owner"}}} agent_identity: { "id": "agent-identity-pretty-id", "account": { "owner": { "id": "agent-identity-pretty-owner" } } } CODEX_AGENT_IDENTITY="agent identity spaced secret" CODEX_AGENT_IDENTITY="{\\"id\\":\\"agent-identity-escaped-env-id\\",\\"subject\\":\\"agent-identity-escaped-env-subject\\"}" CODEX_AGENT_IDENTITY={"id":"agent-identity-object-id","subject":"agent-identity-object-subject"} {"CODEX_AGENT_IDENTITY":"agent-identity-json-secret"} {"CODEX_AGENT_IDENTITY":"{\\"id\\":\\"agent-identity-escaped-json-id\\",\\"subject\\":\\"agent-identity-escaped-json-subject\\"}"} {"CODEX_AGENT_IDENTITY":{"id":"agent-identity-json-object-id","subject":"agent-identity-json-object-subject"}} agent_identity: agent-identity-colon-secret agent_identity: \'agent identity colon spaced secret\' agent_identity: {"id":"agent-identity-colon-object-id","subject":"agent-identity-colon-object-subject"}'
        },
        timestamp: '2026-05-01T00:46:00.000Z'
      })
    );

    expect(parsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'auth_mismatch',
      source: 'stdout_jsonl'
    });
    const signal = parsed.failureDiagnosis?.signal ?? '';
    expect(signal).toContain('"CODEX_AGENT_IDENTITY":"<redacted>"');
    expect(signal).toContain('agent_identity=<redacted>');
    expect(signal).not.toContain('agent-identity-deep-id');
    expect(signal).not.toContain('agent-identity-deep-owner');
    expect(signal).not.toContain('agent-identity-pretty-id');
    expect(signal).not.toContain('agent-identity-pretty-owner');
    expect(signal).not.toContain('agent identity spaced secret');
    expect(signal).not.toContain('agent-identity-escaped-env-id');
    expect(signal).not.toContain('agent-identity-escaped-env-subject');
    expect(signal).not.toContain('agent-identity-object-id');
    expect(signal).not.toContain('agent-identity-object-subject');
    expect(signal).not.toContain('agent-identity-json-secret');
    expect(signal).not.toContain('agent-identity-escaped-json-id');
    expect(signal).not.toContain('agent-identity-escaped-json-subject');
    expect(signal).not.toContain('agent-identity-json-object-id');
    expect(signal).not.toContain('agent-identity-json-object-subject');
    expect(signal).not.toContain('agent-identity-colon-secret');
    expect(signal).not.toContain('agent identity colon spaced secret');
    expect(signal).not.toContain('agent-identity-colon-object-id');
    expect(signal).not.toContain('agent-identity-colon-object-subject');
  });

  it('redacts app-server terminal turn error details before diagnostics are persisted', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-provider-appserver-terminal-redaction-'));
    extraTempRoots.push(root);
    const scriptPath = join(root, 'fake-app-server-terminal-redaction.mjs');
    await writeFile(
      scriptPath,
      `
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin });
const send = (payload) => process.stdout.write(JSON.stringify(payload) + '\\n');

for await (const line of rl) {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    send({ id: message.id, result: {} });
    continue;
  }
  if (message.method === 'thread/start') {
    send({ id: message.id, result: { thread: { id: 'thread-secret' } } });
    continue;
  }
  if (message.method === 'turn/start') {
    send({ id: message.id, result: { turn: { id: 'turn-secret', status: 'inProgress' } } });
    send({
      method: 'turn/completed',
      params: {
        threadId: 'thread-secret',
        turn: {
          id: 'turn-secret',
          status: 'failed',
          error: {
            message:
              'model stream failed OPENAI_API_KEY=secret-openai-key refresh_token secret-refresh-token operator@example.com'
          }
        }
      }
    });
    setTimeout(() => process.exit(0), 50);
    continue;
  }
}
`
    );

    const result = await defaultAppServerTurnRunner({
      command: process.execPath,
      args: [scriptPath],
      cwd: root,
      env: process.env,
      prompt: 'exercise terminal redaction',
      resumeThreadId: null
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('app-server turn turn-secret failed');
    expect(result.stderr).toContain('OPENAI_API_KEY=<redacted>');
    expect(result.stderr).toContain('refresh_token <redacted>');
    expect(result.stderr).toContain('<email-redacted>');
    expect(result.stderr).not.toContain('secret-openai-key');
    expect(result.stderr).not.toContain('secret-refresh-token');
    expect(result.stderr).not.toContain('operator@example.com');

    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'notification',
        method: 'turn/completed',
        params: {
          turn: {
            id: 'turn-secret',
            status: 'failed',
            error: {
              message:
                'model stream failed OPENAI_API_KEY=secret-openai-key refresh_token secret-refresh-token operator@example.com'
            }
          }
        }
      })
    );
    expect(parsed.finalMessage).toContain('app-server turn turn-secret failed');
    expect(parsed.finalMessage).toContain('OPENAI_API_KEY=<redacted>');
    expect(parsed.finalMessage).toContain('refresh_token <redacted>');
    expect(parsed.finalMessage).toContain('<email-redacted>');
    expect(parsed.finalMessage).not.toContain('secret-openai-key');
    expect(parsed.finalMessage).not.toContain('secret-refresh-token');
    expect(parsed.finalMessage).not.toContain('operator@example.com');
  });

  it('redacts whitespace-separated credential labels from provider diagnostics', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'error',
        message:
          'auth mismatch OPENAI_API_KEY secret-openai-space "OPENAI_API_KEY" = "secret-openai-spaced-json" refreshToken secret-refresh-camel sessionId sess-secret-camel authorization Bearer secret-bearer refresh token abc123 api key key123 session token def456 credential plaincred api key: colonkey123 API key = eqkey123 "api key":"quotedkey123" "api key" = "spacedquotedkey123" bearer token: bearerplain123',
        timestamp: '2026-04-15T20:45:21.250Z'
      })
    );

    expect(parsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'auth_mismatch',
      source: 'stdout_jsonl'
    });
    const signal = parsed.failureDiagnosis?.signal ?? '';
    for (const fragment of [
      'secret-openai-space',
      'secret-openai-spaced-json',
      'secret-refresh-camel',
      'sess-secret-camel',
      'secret-bearer',
      'abc123',
      'key123',
      'def456',
      'plaincred',
      'colonkey123',
      'eqkey123',
      'quotedkey123',
      'spacedquotedkey123',
      'bearerplain123'
    ]) {
      expect(signal).not.toContain(fragment);
    }
    for (const fragment of [
      'OPENAI_API_KEY <redacted>',
      '"OPENAI_API_KEY":"<redacted>"',
      'refreshToken <redacted>',
      'sessionId <redacted>',
      'authorization <redacted>',
      'refresh token <redacted>',
      'api key <redacted>',
      'session token <redacted>',
      'credential <redacted>',
      'api key=<redacted>',
      '"api key":"<redacted>"',
      'bearer token=<redacted>'
    ]) {
      expect(signal).toContain(fragment);
    }
  });

  it('redacts unsafe free-form plan and WHAM details from quota diagnostics', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'notification',
        method: 'account/rateLimits/exhausted',
        params: {
          message:
            'Rate limit exhausted for internal plan customer_internal_gold_123 and WHAM plan enterprise_secret_wham_456. Retry account plan customgold123 and wham plan secretwham456. {"accountPlan":"customer_internal_gold_123","whamPlan":"enterprise_secret_wham_456"}',
          accountPlan: 'customer_internal_gold_123',
          whamPlan: 'enterprise_secret_wham_456'
        }
      })
    );

    expect(parsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'quota_rate_limit',
      source: 'stdout_jsonl'
    });
    const signal = parsed.failureDiagnosis?.signal ?? '';
    expect(signal).toContain('account_plan=redacted');
    expect(signal).toContain('wham_plan=redacted');
    expect(signal).not.toContain('customer_internal_gold_123');
    expect(signal).not.toContain('enterprise_secret_wham_456');
    expect(signal).not.toContain('customgold123');
    expect(signal).not.toContain('secretwham456');
  });

  it('classifies auth-profile mismatch events before plan/quota context', () => {
    for (const event of [
      { type: 'notification', method: 'account/authProfile/mismatch' },
      { type: 'error', message: 'Active auth profile forbidden for this prolite account.' },
      { type: 'error', message: 'Account mismatch while rate limit exhausted for this profile.' }
    ]) {
      const parsed = parseProviderLinearWorkerJsonl(
        JSON.stringify({ timestamp: '2026-04-15T20:45:21.500Z', ...event })
      );
      expect(parsed.failureDiagnosis).toMatchObject({
        diagnostic_category: 'auth_mismatch',
        source: 'stdout_jsonl'
      });
    }
  });

  it('classifies cloud-denied forbidden errors before auth mismatch', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'error',
        message: 'Cloud execution denied (403 forbidden) for this branch.',
        timestamp: '2026-04-15T20:45:22.000Z'
      })
    );

    expect(parsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'cloud_denial',
      source: 'stdout_jsonl',
      observed_at: '2026-04-15T20:45:22.000Z'
    });
  });

  it('classifies Codex Cloud GitHub connector admission drift in provider proof diagnostics', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'error',
        message:
          'HTTP 400 missing_github_connector_link: GitHub connection not found for user while CODEX_CLOUD_ENV_ID was configured.',
        timestamp: '2026-04-15T20:45:22.125Z'
      })
    );

    expect(parsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'cloud_connector_auth_drift',
      source: 'stdout_jsonl',
      observed_at: '2026-04-15T20:45:22.125Z',
      guidance: expect.stringContaining('Repair or relink the GitHub connector')
    });
    expect(parsed.failureDiagnosis?.diagnostic_category).not.toBe('provider_runtime');
  });

  it('classifies provider stdin bootstrap exits separately from generic runtime failures', () => {
    const cases: Record<string, unknown>[] = [
      {
        type: 'error',
        message: 'stderr | Reading additional input from stdin...',
        timestamp: '2026-04-23T07:46:11.000Z'
      },
      {
        type: 'event_msg',
        payload: {
          type: 'diagnostic',
          diagnostic_category: 'provider_runtime',
          message: 'stderr | Reading    additional\ninput from stdin...'
        },
        timestamp: '2026-04-23T07:46:12.000Z'
      },
      {
        type: 'diagnostic',
        diagnostic_category: 'reading_additional_input_from_stdin',
        status: 'failed',
        timestamp: '2026-04-23T07:46:13.000Z'
      }
    ];

    for (const event of cases) {
      const parsed = parseProviderLinearWorkerJsonl(JSON.stringify(event));
      expect(parsed.failureDiagnosis).toMatchObject({
        diagnostic_category: 'provider_stdin_bootstrap',
        source: 'stdout_jsonl',
        guidance: expect.stringContaining('stdin bootstrap')
      });
      expect(parsed.failureDiagnosis?.signal.toLowerCase()).toContain('stdin');
      expect(parsed.failureDiagnosis?.diagnostic_category).not.toBe('provider_runtime');
    }
  });

  it('preserves stronger root-cause diagnostics over stdin bootstrap preamble text', () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [
        {
          type: 'error',
          message: 'Unauthorized active account mismatch after Reading additional input from stdin...'
        },
        'auth_mismatch'
      ],
      [
        {
          type: 'error',
          message: 'HTTP 429 too many requests after Reading additional input from stdin...'
        },
        'quota_rate_limit'
      ],
      [
        {
          type: 'error',
          message: 'Cloud execution denied after Reading additional input from stdin...'
        },
        'cloud_denial'
      ],
      [
        {
          type: 'diagnostic',
          diagnostic_category: 'env_config',
          message: 'Reading additional input from stdin...'
        },
        'env_config'
      ]
    ];

    for (const [event, expected] of cases) {
      const parsed = parseProviderLinearWorkerJsonl(
        JSON.stringify({ timestamp: '2026-04-23T07:46:14.000Z', ...event })
      );
      expect(parsed.failureDiagnosis?.diagnostic_category).toBe(expected);
    }
  });

  it('classifies machine-readable provider diagnostic events before prose', () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ type: 'auth_mismatch', status: 'failed' }, 'auth_mismatch'],
      [{ type: 'cloud_connector_auth_drift', status: 'failed' }, 'cloud_connector_auth_drift'],
      [{ type: 'missing_github_connector_link', status: 'failed' }, 'cloud_connector_auth_drift'],
      [{ type: 'cloud_denial', status: 'failed' }, 'cloud_denial'],
      [{ type: 'env_config', status: 'failed' }, 'env_config'],
      [
        {
          type: 'provider_runtime',
          status: 'failed',
          status_detail: 'runtime_parity_command_unavailable'
        },
        'provider_runtime'
      ],
      [
        {
          type: 'provider_runtime',
          status: 'failed',
          message: 'stderr | Reading additional input from stdin...'
        },
        'provider_stdin_bootstrap'
      ],
      [
        {
          type: 'diagnostic',
          diagnostic_category: 'provider_stdin_bootstrap'
        },
        'provider_stdin_bootstrap'
      ],
      [
        {
          type: 'auth_mismatch',
          status: 'failed',
          message: 'quota exhausted context from a nearby account state'
        },
        'auth_mismatch'
      ],
      [
        {
          type: 'cloud_denial',
          status: 'failed',
          message: 'rate limit exhausted in the wrapped cloud prose'
        },
        'cloud_denial'
      ],
      [
        {
          type: 'env_config',
          status: 'failed',
          message: 'quota exhausted before cloud env was configured'
        },
        'env_config'
      ],
      [{ type: 'quota_rate_limit', status: 'failed' }, 'quota_rate_limit'],
      [{ type: 'account_status', status: 'rate_limited' }, 'quota_rate_limit'],
      [{ type: 'rate_limit', status: 'failed' }, 'quota_rate_limit'],
      [{ type: 'diagnostic', diagnostic_category: 'auth_mismatch' }, 'auth_mismatch'],
      [
        {
          type: 'diagnostic',
          params: { status_detail: 'guardian_timeout', message: 'Guardian review timeout' }
        },
        'guardian_timeout'
      ],
      [
        {
          type: 'diagnostic',
          diagnostic_category: 'guardian_timeout'
        },
        'guardian_timeout'
      ],
      [
        {
          type: 'diagnostic',
          failure_diagnosis: { diagnostic_category: 'guardian_policy_denial' }
        },
        'guardian_policy_denial'
      ],
      [
        {
          type: 'diagnostic',
          params: { failure_diagnosis: { diagnostic_category: 'quota_rate_limit' } }
        },
        'quota_rate_limit'
      ]
    ];

    for (const [payload, expected] of cases) {
      const parsed = parseProviderLinearWorkerJsonl(
        JSON.stringify({ type: 'event_msg', payload, timestamp: '2026-04-15T20:45:21.800Z' })
      );
      expect(parsed.failureDiagnosis?.diagnostic_category).toBe(expected);
    }
  });

  it('classifies stdin bootstrap provider exits separately from generic runtime failures', () => {
    const messages = [
      'stderr | Reading additional input from stdin...',
      'stderr | Reading    additional\ninput from stdin...'
    ];

    for (const message of messages) {
      const parsed = parseProviderLinearWorkerJsonl(
        JSON.stringify({
          type: 'error',
          message,
          timestamp: '2026-04-21T04:00:00.000Z'
        })
      );

      expect(parsed.failureDiagnosis).toMatchObject({
        diagnostic_category: 'provider_stdin_bootstrap',
        signal: expect.stringContaining('stdin'),
        source: 'stdout_jsonl',
        observed_at: '2026-04-21T04:00:00.000Z',
        guidance: expect.stringContaining('stdin bootstrap')
      });
      expect(parsed.failureDiagnosis?.diagnostic_category).not.toBe('provider_runtime');
    }
  });

  it('preserves stronger root-cause diagnostics when the stdin bootstrap preamble is mixed in', () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [
        {
          type: 'error',
          message: 'stderr | Reading additional input from stdin... unauthorized login required'
        },
        'auth_mismatch'
      ],
      [
        {
          type: 'error',
          message: 'stderr | Reading additional input from stdin... HTTP 429 too many requests'
        },
        'quota_rate_limit'
      ],
      [
        {
          type: 'error',
          message: 'stderr | Reading additional input from stdin... cloud execution denied'
        },
        'cloud_denial'
      ],
      [
        {
          type: 'event_msg',
          payload: {
            type: 'provider_runtime',
            status: 'failed',
            message: 'stderr | Reading additional input from stdin... auth profile mismatch'
          }
        },
        'auth_mismatch'
      ],
      [
        {
          type: 'event_msg',
          payload: {
            type: 'diagnostic',
            diagnostic_category: 'provider_stdin_bootstrap',
            message: 'stderr | Reading additional input from stdin... auth profile mismatch'
          }
        },
        'provider_stdin_bootstrap'
      ]
    ];

    for (const [payload, expected] of cases) {
      const parsed = parseProviderLinearWorkerJsonl(
        JSON.stringify({ ...payload, timestamp: '2026-04-21T04:00:00.000Z' })
      );
      expect(parsed.failureDiagnosis?.diagnostic_category).toBe(expected);
    }
  });

  it('classifies prose rate-limited provider failures', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'error',
        message: 'Codex provider was rate limited by provider quota.',
        timestamp: '2026-04-15T20:45:22.250Z'
      })
    );

    expect(parsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'quota_rate_limit',
      source: 'stdout_jsonl',
      observed_at: '2026-04-15T20:45:22.250Z'
    });
  });

  it('does not infer auth provenance from generic non-auth payload fields', () => {
    const events = [
      {
        type: 'event_msg',
        payload: {
          status: 'failed',
          message: 'ordinary provider status update',
          account: 'customer account',
          profile: 'performance'
        },
        timestamp: '2026-04-15T20:45:20.000Z'
      },
      {
        type: 'event_msg',
        payload: {
          type: 'tool_result',
          account: { id: 'acct_raw_123' },
          profile: 'performance',
          message: 'ordinary tool result payload'
        },
        timestamp: '2026-04-15T20:45:20.125Z'
      }
    ];

    for (const event of events) {
      expect(parseProviderLinearWorkerJsonl(JSON.stringify(event)).authProvenance).toBeNull();
    }
  });

  it('classifies Guardian timeouts separately from Guardian policy denials', () => {
    const timeoutParsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'notification',
        method: 'guardian/review/timeout',
        params: {
          message:
            'Guardian review timed out; retry with timeout-specific guidance and do not treat this timeout as a policy denial.'
        },
        timestamp: '2026-04-15T20:46:00.000Z'
      })
    );
    const denialParsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'notification',
        method: 'guardian/review/denied',
        params: {
          message: 'Guardian policy denial blocked this request; do not retry as a timeout.'
        },
        timestamp: '2026-04-15T20:46:01.000Z'
      })
    );
    const enumTimeoutParsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({ type: 'event_msg', payload: { type: 'guardian_timeout' } })
    );
    const enumDenialParsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({ type: 'event_msg', payload: { type: 'guardian_policy_denial' } })
    );

    expect(timeoutParsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'guardian_timeout',
      guidance: expect.stringContaining('timed out')
    });
    expect(denialParsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'guardian_policy_denial',
      guidance: expect.stringContaining('policy')
    });
    expect(enumTimeoutParsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'guardian_timeout',
      source: 'stdout_jsonl'
    });
    expect(enumDenialParsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'guardian_policy_denial',
      source: 'stdout_jsonl'
    });
  });

  it('preserves Guardian timeout visibility from TUI-history style events', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'tui_history',
          message:
            'TUI history: Guardian review timed out while waiting for guardian decision; do not treat this timeout as a policy denial.'
        },
        timestamp: '2026-04-15T20:46:02.000Z'
      })
    );
    const denialParsed = parseProviderLinearWorkerJsonl(
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'tui_history',
          message: 'TUI history: Guardian policy denial blocked this request; do not retry as a timeout.'
        },
        timestamp: '2026-04-15T20:46:02.250Z'
      })
    );

    expect(parsed.finalMessage).toBe(
      'TUI history: Guardian review timed out while waiting for guardian decision; do not treat this timeout as a policy denial.'
    );
    expect(parsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'guardian_timeout',
      signal: expect.stringContaining('Guardian review timed out'),
      guidance: expect.stringContaining('timed out'),
      source: 'stdout_jsonl',
      observed_at: '2026-04-15T20:46:02.000Z'
    });
    expect(denialParsed.failureDiagnosis).toMatchObject({
      diagnostic_category: 'guardian_policy_denial',
      guidance: expect.stringContaining('policy'),
      source: 'stdout_jsonl',
      observed_at: '2026-04-15T20:46:02.250Z'
    });
  });

  it('does not classify ordinary assistant text as provider failures', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        JSON.stringify({
          type: 'response_item',
          payload: {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: 'I checked the rate limit, Guardian timeout, and policy denial diagnostics.'
              }
            ]
          },
          timestamp: '2026-04-15T20:47:00.000Z'
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: {
            type: 'agent_message',
            message: 'The next step is to preserve quota and Guardian failure distinctions.'
          },
          timestamp: '2026-04-15T20:47:01.000Z'
        })
      ].join('\n')
    );

    expect(parsed.finalMessage).toBe('The next step is to preserve quota and Guardian failure distinctions.');
    expect(parsed.failureDiagnosis).toBeNull();
  });

  it('waits for child close before resolving piped stdio capture', async () => {
    vi.resetModules();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const fakeChild = Object.assign(new EventEmitter(), { stdout, stderr }) as unknown as ChildProcess;
    const actualChildProcess = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    const spawnMock = vi.fn(() => fakeChild);
    vi.doMock('node:child_process', () => ({
      ...actualChildProcess,
      spawn: spawnMock
    }));

    try {
      const { defaultExecRunner } = await import('../src/cli/providerLinearWorkerRunner.js');
      let settled = false;
      const resultPromise = defaultExecRunner({
        command: 'codex',
        args: ['exec'],
        cwd: tempRoot ?? process.cwd(),
        env: {},
        mirrorOutput: false
      });
      void resultPromise.then(() => {
        settled = true;
      });

      stdout.write('stdout-before-close');
      stderr.write('stderr-before-close');
      fakeChild.emit('exit', 0);
      stdout.end('stdout-after-exit');
      stderr.end('stderr-after-exit');

      await new Promise((resolve) => setImmediate(resolve));
      expect(settled).toBe(false);

      fakeChild.emit('close', 0);
      await expect(resultPromise).resolves.toEqual({
        exitCode: 0,
        stdout: 'stdout-before-closestdout-after-exit',
        stderr: 'stderr-before-closestderr-after-exit'
      });
      expect(spawnMock).toHaveBeenCalledWith('codex', ['exec'], {
        cwd: tempRoot ?? process.cwd(),
        env: {},
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } finally {
      vi.doUnmock('node:child_process');
      vi.resetModules();
    }
  });

  it('kills the child when the live stdout hook throws', async () => {
    vi.resetModules();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const kill = vi.fn();
    const fakeChild = Object.assign(new EventEmitter(), {
      stdout,
      stderr,
      kill
    }) as unknown as ChildProcess;
    const actualChildProcess = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    vi.doMock('node:child_process', () => ({
      ...actualChildProcess,
      spawn: vi.fn(() => fakeChild)
    }));

    try {
      const { defaultExecRunner } = await import('../src/cli/providerLinearWorkerRunner.js');
      const resultPromise = defaultExecRunner({
        command: 'codex',
        args: ['exec'],
        cwd: tempRoot ?? process.cwd(),
        env: {},
        mirrorOutput: false,
        onStdoutChunk: () => {
          throw new Error('stdout hook failed');
        }
      });

      stdout.write('stdout-before-failure');

      await expect(resultPromise).rejects.toThrow('stdout hook failed');
      expect(kill).toHaveBeenCalledTimes(1);
    } finally {
      vi.doUnmock('node:child_process');
      vi.resetModules();
    }
  });

  it('rejects already-aborted requests before spawning the child process', async () => {
    vi.resetModules();
    const spawn = vi.fn();
    const actualChildProcess = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    vi.doMock('node:child_process', () => ({
      ...actualChildProcess,
      spawn
    }));

    try {
      const { defaultExecRunner } = await import('../src/cli/providerLinearWorkerRunner.js');
      const controller = new AbortController();
      controller.abort(new Error('startup timeout'));

      await expect(
        defaultExecRunner({
          command: 'codex',
          args: ['exec'],
          cwd: tempRoot ?? process.cwd(),
          env: {},
          mirrorOutput: false,
          abortSignal: controller.signal
        })
      ).rejects.toThrow('startup timeout');
      expect(spawn).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock('node:child_process');
      vi.resetModules();
    }
  });

  it('waits for close instead of timing out when abort fires after child exit', async () => {
    vi.resetModules();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const kill = vi.fn(() => true);
    const fakeChild = Object.assign(new EventEmitter(), {
      stdout,
      stderr,
      kill,
      killed: false,
      exitCode: null,
      signalCode: null
    }) as unknown as ChildProcess;
    const actualChildProcess = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    vi.doMock('node:child_process', () => ({
      ...actualChildProcess,
      spawn: vi.fn(() => fakeChild)
    }));

    try {
      const { defaultExecRunner } = await import('../src/cli/providerLinearWorkerRunner.js');
      const controller = new AbortController();
      const resultPromise = defaultExecRunner({
        command: 'codex',
        args: ['exec'],
        cwd: tempRoot ?? process.cwd(),
        env: {},
        mirrorOutput: false,
        abortSignal: controller.signal
      });

      stdout.end('stdout-before-close');
      stderr.end('stderr-before-close');
      fakeChild.exitCode = 0;
      fakeChild.emit('exit', 0);
      controller.abort(new Error('startup timeout'));

      await new Promise((resolve) => setImmediate(resolve));
      expect(kill).not.toHaveBeenCalled();

      fakeChild.emit('close', 0);
      await expect(resultPromise).resolves.toEqual({
        exitCode: 0,
        stdout: 'stdout-before-close',
        stderr: 'stderr-before-close'
      });
    } finally {
      vi.doUnmock('node:child_process');
      vi.resetModules();
    }
  });

  it('waits for close before rejecting when abort kills a still-running child', async () => {
    vi.resetModules();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const kill = vi.fn(() => true);
    const fakeChild = Object.assign(new EventEmitter(), {
      stdout,
      stderr,
      kill,
      killed: false,
      exitCode: null,
      signalCode: null
    }) as unknown as ChildProcess;
    const actualChildProcess = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    vi.doMock('node:child_process', () => ({
      ...actualChildProcess,
      spawn: vi.fn(() => fakeChild)
    }));

    try {
      const { defaultExecRunner } = await import('../src/cli/providerLinearWorkerRunner.js');
      const controller = new AbortController();
      let settled = false;
      const resultPromise = defaultExecRunner({
        command: 'codex',
        args: ['exec'],
        cwd: tempRoot ?? process.cwd(),
        env: {},
        mirrorOutput: false,
        abortSignal: controller.signal
      });
      void resultPromise.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        }
      );

      controller.abort(new Error('startup timeout'));

      await new Promise((resolve) => setImmediate(resolve));
      expect(kill).toHaveBeenCalledTimes(1);
      expect(settled).toBe(false);

      fakeChild.signalCode = 'SIGTERM';
      fakeChild.emit('close', null);
      await expect(resultPromise).rejects.toThrow('startup timeout');
    } finally {
      vi.doUnmock('node:child_process');
      vi.resetModules();
    }
  });

  it('continues on the same thread across turns and writes a proof sidecar', async () => {
    const { manifestPath, runDir } = await createManifestRoot('co-runs', {
      provider_launch_source: PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
      provider_control_host_task_id: 'local-mcp',
      provider_control_host_run_id: 'control-host'
    });
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(createTrackedIssue())
      .mockResolvedValueOnce(createTrackedIssue())
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Done',
          state_type: 'completed'
        })
      );
    const childStreamRecord = {
      stream: 'docs-review',
      pipeline_id: 'docs-review',
      task_id: 'linear-lin-issue-1-docs-review',
      run_id: 'docs-run-1',
      status: 'succeeded',
      manifest_path: join(tempRoot ?? '', '.runs', 'linear-lin-issue-1-docs-review', 'cli', 'docs-run-1', 'manifest.json'),
      artifact_root: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1',
      log_path: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/run.log',
      summary: 'docs-review passed',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-03-21T09:00:00.050Z'
    };
    const secondChildStreamRecord = { ...childStreamRecord, task_id: 'linear-lin-issue-1-docs-review-alt', manifest_path: join(tempRoot ?? '', '.runs', 'linear-lin-issue-1-docs-review-alt', 'cli', 'docs-run-1', 'manifest.json'), artifact_root: '.runs/linear-lin-issue-1-docs-review-alt/cli/docs-run-1' };
    const childLaneScope = resolveProviderLinearChildLaneScopeContract({
      files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
      phases: []
    });
    const childLaneRecord = {
      stream: 'impl-a',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-impl-a',
      run_id: 'child-run-1',
      status: 'succeeded',
      manifest_path: join(tempRoot ?? '', '.runs', 'linear-lin-issue-1-impl-a', 'cli', 'child-run-1', 'manifest.json'),
      artifact_root: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1',
      log_path: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1/run.log',
      summary: 'child lane finished',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-03-21T08:59:59.900Z',
      purpose: 'Implement bounded same-issue child lanes',
      instructions: null,
      scope: childLaneScope,
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-21T09:00:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-21T08:59:59.900Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      patch_artifact_path: join(tempRoot ?? '', '.runs', 'linear-lin-issue-1-impl-a', 'cli', 'child-run-1', 'provider-linear-child-lane.patch'),
      patch_bytes: 256,
      decision: 'pending',
      decision_at: null,
      decision_reason: null
    };
    let currentNow = '2026-03-21T09:00:00.000Z';
    const execRunner = vi
      .fn<
        (request: {
          command: string;
          args: string[];
          cwd: string;
          env: NodeJS.ProcessEnv;
          mirrorOutput: boolean;
        }) => Promise<{ exitCode: number; stdout: string; stderr: string }>
      >()
      .mockImplementationOnce(async (request) => {
        const auditPath = request.env[PROVIDER_LINEAR_AUDIT_ENV_VAR];
        expect(auditPath).toBe(join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME));
        await appendProviderLinearWorkerChildStreamRecord(runDir, childStreamRecord);
        await appendProviderLinearWorkerChildStreamRecord(runDir, secondChildStreamRecord);
        await appendProviderLinearWorkerChildLaneRecord(runDir, childLaneRecord);
        await appendProviderLinearAuditEntry(String(auditPath), {
          recorded_at: '2026-03-21T09:00:00.100Z',
          operation: 'issue-context',
          ok: true,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          source_setup: null,
          action: null,
          via: null,
          state: 'In Progress',
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: null,
          error_message: null
        });
        await appendProviderLinearAuditEntry(String(auditPath), {
          recorded_at: '2026-03-21T09:00:00.200Z',
          operation: 'upsert-workpad',
          ok: true,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          source_setup: null,
          action: 'created',
          via: null,
          state: null,
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: 'comment-1',
          attachment_id: null,
          error_code: null,
          error_message: null
        });
        await appendStaySerialParallelizationDecisionAuditForRequest(request, {
          turnIndex: 1,
          recordedAt: '2026-03-21T09:00:00.250Z'
        });
        currentNow = '2026-03-21T09:00:01.000Z';
        return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"params":{"tokenUsage":{"total":{"input_tokens":12,"output_tokens":8,"total_tokens":20}}}}',
            '{"rate_limits":{"limit_id":"coding","primary":{"remaining":42}}}',
            '{"type":"event_msg","payload":{"type":"agent_message","message":"turn 1 complete"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:00.500Z"}}'
          ].join('\n'),
          stderr: ''
        };
      })
      .mockImplementationOnce(async (request) => {
        const auditPath = request.env[PROVIDER_LINEAR_AUDIT_ENV_VAR];
        await appendProviderLinearAuditEntry(String(auditPath), {
          recorded_at: '2026-03-21T09:00:01.100Z',
          operation: 'attach-pr',
          ok: false,
          issue_id: 'lin-issue-1',
          issue_identifier: null,
          source_setup: null,
          action: null,
          via: null,
          state: null,
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: 'linear_graphql_error',
          error_message: 'Linear GraphQL returned operation errors.'
        });
        await appendProviderLinearAuditEntry(String(auditPath), {
          recorded_at: '2026-03-21T09:00:01.200Z',
          operation: 'transition',
          ok: true,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          source_setup: null,
          action: 'updated',
          via: null,
          state: 'In Review',
          follow_up_issue_id: null,
          follow_up_issue_identifier: null,
          failed_relation_type: null,
          comment_id: null,
          attachment_id: null,
          error_code: null,
          error_message: null
        });
        await appendStaySerialParallelizationDecisionAuditForRequest(request, {
          turnIndex: 2,
          recordedAt: '2026-03-21T09:00:01.250Z'
        });
        return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-2"}}',
            '{"params":{"msg":{"payload":{"info":{"total_token_usage":{"input_tokens":21,"output_tokens":13,"total_tokens":34}}}}}}',
            '{"type":"event_msg","payload":{"type":"agent_message","message":"turn 2 complete"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-2","timestamp":"2026-03-21T09:00:01.500Z"}}'
          ].join('\n'),
          stderr: ''
        };
      });
    const log = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    const sourceRoot = await createProviderWorkerSourceRootRepo('provider-worker-control-host-source-');
    const sourceRootRealpath = await realpath(sourceRoot);
    const sourceEntrypoint = join(sourceRoot, 'bin', 'codex-orchestrator.ts');
    const sourceRootFreshness = buildSourceRootFreshnessFixture({
      status: 'current',
      intended_repo_root: sourceRoot,
      intended_repo_root_realpath: sourceRootRealpath,
      command_path: sourceEntrypoint,
      command_path_realpath: await realpath(sourceEntrypoint),
      package_root: sourceRoot,
      package_root_realpath: sourceRootRealpath,
      source_root: sourceRoot,
      source_root_realpath: sourceRootRealpath,
      drift_classes: []
    });
    const controlHostRunDir = join(tempRoot ?? '', 'co-runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    await writeControlHostOwnerForProof(controlHostRunDir, sourceRootFreshness);
    const sourceBaseHash = git(sourceRoot, ['rev-parse', 'HEAD']).stdout.trim();
    await writeFile(join(sourceRoot, 'README.md'), 'origin advanced\n', 'utf8');
    git(sourceRoot, ['add', '.']);
    git(sourceRoot, ['commit', '-m', 'origin advanced']);
    git(sourceRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(sourceRoot, ['reset', '--hard', sourceBaseHash]);

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3',
        CODEX_CLI_BIN: 'codex',
        CODEX_HOME: tempRoot ?? undefined,
        [PROVIDER_LAUNCH_SOURCE_ENV]: PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
        [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: 'local-mcp',
        [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: 'control-host'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () =>
          createRuntimeContext({
            requested_mode: 'cli',
            selected_mode: 'cli',
            provider: 'CliRuntimeProvider'
          })
        ),
        execRunner,
        now: vi.fn(() => currentNow),
        log
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(2);
    expect(execRunner.mock.calls[0]?.[0].args).toEqual([
      'exec',
      '--json',
      expect.stringContaining('full first-turn task prompt')
    ]);
    expect(execRunner.mock.calls[1]?.[0].args).toEqual([
      'exec',
      'resume',
      '--json',
      'thread-1',
      expect.stringContaining('Continuation guidance')
    ]);
    const firstTurnPrompt = String(execRunner.mock.calls[0]?.[0].args[2] ?? '');
    const continuationPrompt = String(execRunner.mock.calls[1]?.[0].args[4] ?? '');
    const expectedSharedRepoCheckoutPath = await realpath(tempRoot ?? '');
    expect(firstTurnPrompt).toContain('Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff');
    expect(firstTurnPrompt).toContain('about 2+ changed files or about 40+ changed lines');
    expect(firstTurnPrompt).toContain('do not hand off to review state unless a break-glass waiver is recorded with owner, expiry, reason, and evidence');
    expect(firstTurnPrompt).toContain('manual elegance checklist');
    expect(firstTurnPrompt).toContain('Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.');
    expect(firstTurnPrompt).toContain('Ordinary eligible same-issue child-lane parallelisation is a runtime contract');
    expect(firstTurnPrompt).toContain('Supported child-lane phases are `docs`, `implementation`, `tests`');
    expect(firstTurnPrompt).toContain('Do not request unsupported `classification` or `analysis` phases');
    expect(firstTurnPrompt).toContain('pre-turn decomposition matrix before choosing that decision');
    expect(firstTurnPrompt).toContain('candidate child lanes, file/phase scope, dependencies, overlap risk, expected validation artifact, child-lane owner, and cap-slot use');
    expect(firstTurnPrompt).toContain('Default to `parallelize_now` when the matrix contains at least one safe independent child-lane candidate');
    expect(firstTurnPrompt).toContain('`stay_serial` is rejected while any safe independent candidate remains');
    expect(firstTurnPrompt).toContain('`single_bounded_change` must explain why no docs, test, research, or review slice can be separated safely');
    expect(firstTurnPrompt).toContain('at most 2 active, pending, or unaccepted same-issue child lanes may exist at once');
    expect(firstTurnPrompt).toContain('record the serial/no-go evidence with `stay_serial` / `existing_child_lane_active` and labeled `cap_exhausted:` evidence in the summary');
    expect(firstTurnPrompt).toContain('legacy in-flight claims without timestamps, are recoverable and do not consume cap slots');
    expect(firstTurnPrompt).toContain('while a child lane is active, avoid editing its delegated files or phases');
    expect(firstTurnPrompt).toContain('invalidate/reject the child lane or record explicit rebase/collision reasoning before accepting any child patch');
    expect(firstTurnPrompt).toContain('linear parallelization --issue-id lin-issue-1 --decision <parallelize_now|stay_serial|forbid_parallel> --reason <reason-code> --summary <why>');
    expect(firstTurnPrompt).toContain('Allowed decision and reason-code pairs');
    expect(firstTurnPrompt).toContain('clean-main-baseline-failures');
    expect(firstTurnPrompt).toContain('cli-orchestrator-cleanup-fallout');
    expect(firstTurnPrompt).toContain('use `parent_only_mutation` and close the issue directly when no live dependent work remains');
    expect(firstTurnPrompt).toContain('use `blocked_by_dependency` only when a real remaining dependency still exists');
    expect(firstTurnPrompt).toContain('close the issue directly when no live dependent work remains');
    expect(firstTurnPrompt).toContain(`inspect the shared local repo checkout at \`${expectedSharedRepoCheckoutPath}\` rather than the per-issue workspace`);
    expect(firstTurnPrompt).toContain(`\`git -C "${expectedSharedRepoCheckoutPath}" status --short --branch\``);
    expect(firstTurnPrompt).toContain(`\`git -C "${expectedSharedRepoCheckoutPath}" fetch origin refs/heads/main:refs/remotes/origin/main\``);
    expect(firstTurnPrompt).toContain(`\`git -C "${expectedSharedRepoCheckoutPath}" merge --ff-only origin/main\``);
    expect(continuationPrompt).toContain('Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff');
    expect(continuationPrompt).toContain('about 2+ changed files or about 40+ changed lines');
    expect(continuationPrompt).toContain('do not hand off to review state unless a break-glass waiver is recorded with owner, expiry, reason, and evidence');
    expect(continuationPrompt).toContain('manual elegance checklist');
    expect(continuationPrompt).toContain('Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.');
    expect(continuationPrompt).toContain('Ordinary eligible same-issue child-lane parallelisation is a runtime contract');
    expect(continuationPrompt).toContain('Supported child-lane phases are `docs`, `implementation`, `tests`');
    expect(continuationPrompt).toContain('Do not request unsupported `classification` or `analysis` phases');
    expect(continuationPrompt).toContain('pre-turn decomposition matrix before choosing that decision');
    expect(continuationPrompt).toContain('candidate child lanes, file/phase scope, dependencies, overlap risk, expected validation artifact, child-lane owner, and cap-slot use');
    expect(continuationPrompt).toContain('Default to `parallelize_now` when the matrix contains at least one safe independent child-lane candidate');
    expect(continuationPrompt).toContain('`stay_serial` is rejected while any safe independent candidate remains');
    expect(continuationPrompt).toContain('`single_bounded_change` must explain why no docs, test, research, or review slice can be separated safely');
    expect(continuationPrompt).toContain('at most 2 active, pending, or unaccepted same-issue child lanes may exist at once');
    expect(continuationPrompt).toContain('record the serial/no-go evidence with `stay_serial` / `existing_child_lane_active` and labeled `cap_exhausted:` evidence in the summary');
    expect(continuationPrompt).toContain('legacy in-flight claims without timestamps, are recoverable and do not consume cap slots');
    expect(continuationPrompt).toContain('while a child lane is active, avoid editing its delegated files or phases');
    expect(continuationPrompt).toContain('invalidate/reject the child lane or record explicit rebase/collision reasoning before accepting any child patch');
    expect(continuationPrompt).toContain('linear parallelization --issue-id lin-issue-1 --decision <parallelize_now|stay_serial|forbid_parallel> --reason <reason-code> --summary <why>');
    expect(continuationPrompt).toContain('Allowed decision and reason-code pairs');
    expect(continuationPrompt).toContain('clean-main-baseline-failures');
    expect(continuationPrompt).toContain('cli-orchestrator-cleanup-fallout');
    expect(continuationPrompt).toContain('use `parent_only_mutation` and close the issue directly when no live dependent work remains');
    expect(continuationPrompt).toContain('use `blocked_by_dependency` only when a real remaining dependency still exists');
    expect(continuationPrompt).toContain('close the issue directly when no live dependent work remains');
    expect(continuationPrompt).toContain(`inspect the shared local repo checkout at \`${expectedSharedRepoCheckoutPath}\` rather than the per-issue workspace`);
    expect(continuationPrompt).toContain(`\`git -C "${expectedSharedRepoCheckoutPath}" status --short --branch\``);
    expect(continuationPrompt).toContain(`\`git -C "${expectedSharedRepoCheckoutPath}" fetch origin refs/heads/main:refs/remotes/origin/main\``);
    expect(continuationPrompt).toContain(`\`git -C "${expectedSharedRepoCheckoutPath}" merge --ff-only origin/main\``);
    expect(proof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      latest_session_id_source: 'derived_from_thread_and_turn',
      turn_count: 2,
      last_event: 'task_complete',
      last_message: 'turn 2 complete',
      last_event_at: '2026-03-21T09:00:01.500Z',
      tokens: {
        input_tokens: 21,
        output_tokens: 13,
        total_tokens: 34
      },
      rate_limits: null,
      source_root_freshness: {
        status: 'warning',
        command_path: sourceEntrypoint,
        source_checkout: {
          status: 'stale',
          behind: 1
        },
        drift_classes: expect.arrayContaining([
          'shared_checkout_drift',
          'supervised_source_root_drift'
        ])
      },
      auth_provenance: expect.objectContaining({
        provider_kind: 'codex',
        runtime_mode: 'cli',
        runtime_provider: 'CliRuntimeProvider',
        credential_source: null,
        auth_freshness: 'credential_source_unknown'
      }),
      linear_audit: {
        path: join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME),
        attempted_count: 6,
        success_count: 5,
        failure_count: 1,
        latest_recorded_at: '2026-03-21T09:00:01.250Z'
      },
      child_streams: expect.arrayContaining([expect.objectContaining({ stream: 'docs-review', task_id: 'linear-lin-issue-1-docs-review', run_id: 'docs-run-1', status: 'succeeded' }), expect.objectContaining({ stream: 'docs-review', task_id: 'linear-lin-issue-1-docs-review-alt', run_id: 'docs-run-1', status: 'succeeded' })]),
      child_lanes: expect.arrayContaining([expect.objectContaining({
        stream: 'impl-a',
        task_id: 'linear-lin-issue-1-impl-a',
        run_id: 'child-run-1',
        decision: 'pending',
        patch_artifact_path: join(tempRoot ?? '', '.runs', 'linear-lin-issue-1-impl-a', 'cli', 'child-run-1', 'provider-linear-child-lane.patch'),
        scope: expect.objectContaining({
          files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
          phases: [],
          phase_contract_version: 'phase-path-selectors-v1',
          allowed_path_selectors: [
            expect.objectContaining({
              kind: 'exact',
              value: 'orchestrator/src/cli/providerLinearChildLaneShell.ts',
              source: 'file',
              phase: null
            })
          ]
        })
      })]),
      progress: {
        phase: 'completed',
        kind: 'worker',
        status: 'completed',
        stall_classification: 'completed',
        recovery_recommendation: 'no_action'
      },
      owner_status: 'succeeded',
      end_reason: 'issue_inactive'
    });

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      turn_count: 2,
      last_event: 'task_complete',
      last_message: 'turn 2 complete',
      last_event_at: '2026-03-21T09:00:01.500Z',
      tokens: {
        input_tokens: 21,
        output_tokens: 13,
        total_tokens: 34
      },
      source_root_freshness: {
        status: 'warning',
        command_path: sourceEntrypoint,
        source_checkout: {
          status: 'stale',
          behind: 1
        },
        drift_classes: expect.arrayContaining([
          'shared_checkout_drift',
          'supervised_source_root_drift'
        ])
      },
      auth_provenance: expect.objectContaining({
        provider_kind: 'codex',
        runtime_mode: 'cli',
        runtime_provider: 'CliRuntimeProvider',
        credential_source: null,
        auth_freshness: 'credential_source_unknown'
      }),
      linear_audit: {
        path: join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME),
        attempted_count: 6,
        success_count: 5,
        failure_count: 1,
        latest_recorded_at: '2026-03-21T09:00:01.250Z',
        latest_by_operation: {
          'issue-context': {
            operation: 'issue-context',
            ok: true,
            state: 'In Progress'
          },
          'upsert-workpad': {
            operation: 'upsert-workpad',
            ok: true,
            action: 'created',
            comment_id: 'comment-1'
          },
          'attach-pr': {
            operation: 'attach-pr',
            ok: false,
            error_code: 'linear_graphql_error'
          },
          transition: {
            operation: 'transition',
            ok: true,
            state: 'In Review'
          },
          parallelization: {
            operation: 'parallelization',
            ok: true,
            action: 'stay_serial',
            state: 'single_bounded_change'
          }
        }
      },
      child_streams: expect.arrayContaining([expect.objectContaining({ stream: 'docs-review', task_id: 'linear-lin-issue-1-docs-review', run_id: 'docs-run-1', status: 'succeeded', artifact_root: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1' }), expect.objectContaining({ stream: 'docs-review', task_id: 'linear-lin-issue-1-docs-review-alt', run_id: 'docs-run-1', status: 'succeeded', artifact_root: '.runs/linear-lin-issue-1-docs-review-alt/cli/docs-run-1' })]),
      child_lanes: expect.arrayContaining([expect.objectContaining({
        stream: 'impl-a',
        task_id: 'linear-lin-issue-1-impl-a',
        run_id: 'child-run-1',
        decision: 'pending',
        patch_artifact_path: join(tempRoot ?? '', '.runs', 'linear-lin-issue-1-impl-a', 'cli', 'child-run-1', 'provider-linear-child-lane.patch'),
        scope: expect.objectContaining({
          files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
          phases: [],
          phase_contract_version: 'phase-path-selectors-v1',
          allowed_path_selectors: [
            expect.objectContaining({
              kind: 'exact',
              value: 'orchestrator/src/cli/providerLinearChildLaneShell.ts',
              source: 'file',
              phase: null
            })
          ]
        })
      })]),
      progress: {
        phase: 'completed',
        kind: 'worker',
        status: 'completed'
      },
      end_reason: 'issue_inactive'
    });
    expect(
      log.info.mock.calls.some(([message]) =>
        typeof message === 'string' && message.includes('[provider-linear-worker-progress]')
      )
    ).toBe(true);
  }, providerLinearWorkerRunnerTestTimeoutMs);

  it('records appserver supervision proof with sticky environment and retained JSONL truth', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          assignee_id: null,
          assignee_name: null
        })
      )
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Done',
          state_type: 'completed',
          assignee_id: null,
          assignee_name: null
        })
      );

    const execRunner = vi.fn();
    const appServerTurnRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        turnIndex: 1
      });
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-app"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-app-1"}}',
          '{"type":"event_msg","payload":{"type":"agent_message","message":"appserver canary complete"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-app-1","timestamp":"2026-03-21T09:00:01.500Z"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_CLOUD_ENV_ID: 'env-appserver-proof',
        CODEX_AGENT_IDENTITY: 'agent-identity-runtime-raw'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () =>
          createAppServerRuntimeContext({
            runtime_session_id: 'appserver-run-child'
          })
        ),
        execRunner,
        appServerTurnRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      thread_id: 'thread-app',
      latest_turn_id: 'turn-app-1',
      latest_session_id: 'thread-app-turn-app-1',
      runtime: {
        requested_mode: 'appserver',
        selected_mode: 'appserver',
        provider: 'AppServerRuntimeProvider',
        runtime_session_id: 'appserver-run-child',
        fallback: {
          occurred: false
        }
      },
      auth_provenance: expect.objectContaining({
        credential_source: 'env:CODEX_AGENT_IDENTITY',
        auth_freshness: 'env_credential_present'
      }),
      appserver_supervision: {
        selected_runtime: {
          requested_mode: 'appserver',
          selected_mode: 'appserver',
          provider: 'AppServerRuntimeProvider',
          runtime_session_id: 'appserver-run-child'
        },
        supervision_command: 'appserver_thread_start',
        appserver_session_id: 'appserver-run-child',
        thread_id: 'thread-app',
        latest_turn_id: 'turn-app-1',
        latest_session_id: 'thread-app-turn-app-1',
        sticky_environment_id: 'env-appserver-proof',
        sticky_environment_status: 'proven',
        sticky_environment_blocker: null,
        turn_persistence_status: 'blocked',
        turn_persistence_blocker: 'session_log_hydration_missing',
        resume_status: 'not_requested',
        fork_status: 'blocked',
        fork_blocker: 'appserver_fork_probe_not_implemented',
        jsonl_truth_retained: true,
        session_log_truth_retained: true
      }
    });

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      auth_provenance: expect.objectContaining({
        credential_source: 'env:CODEX_AGENT_IDENTITY',
        auth_freshness: 'env_credential_present'
      }),
      appserver_supervision: {
        sticky_environment_status: 'proven',
        turn_persistence_status: 'blocked',
        turn_persistence_blocker: 'session_log_hydration_missing',
        fork_blocker: 'appserver_fork_probe_not_implemented'
      }
    });
    expect(JSON.stringify(written)).not.toContain('agent-identity-runtime-raw');
  });

  it('preserves live session-log ids when final stdout parse supplies the turn', async () => {
    const { manifestPath } = await createManifestRoot();
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-app.jsonl');
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          assignee_id: null,
          assignee_name: null
        })
      )
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Done',
          state_type: 'completed',
          assignee_id: null,
          assignee_name: null
        })
      );

    const execRunner = vi.fn();
    const appServerTurnRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        turnIndex: 1
      });
      await mkdir(sessionDir, { recursive: true });
      await writeFile(
        sessionLogPath,
        [
          JSON.stringify({
            timestamp: '2026-03-21T09:00:00.000Z',
            type: 'session_meta',
            payload: {
              id: 'thread-app',
              cwd: tempRoot,
              initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
            }
          }),
          JSON.stringify({
            timestamp: '2026-03-21T09:00:00.050Z',
            type: 'turn_context',
            payload: { turn_id: 'turn-app-1' }
          }),
          JSON.stringify({
            timestamp: '2026-03-21T09:00:01.000Z',
            type: 'event_msg',
            payload: { type: 'task_complete', turn_id: 'turn-app-1' }
          })
        ].join('\n'),
        'utf8'
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-app"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-app-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-app-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_CLOUD_ENV_ID: 'env-appserver-proof',
        CODEX_HOME: tempRoot ?? undefined
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () =>
          createAppServerRuntimeContext({
            runtime_session_id: 'appserver-run-child'
          })
        ),
        execRunner,
        appServerTurnRunner,
        sleep: async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
        },
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      thread_id: 'thread-app',
      latest_turn_id: 'turn-app-1',
      session_log_thread_id: 'thread-app',
      session_log_turn_id: 'turn-app-1',
      session_log_session_id: 'thread-app-turn-app-1',
      appserver_supervision: {
        turn_persistence_status: 'proven',
        turn_persistence_source: 'session_log_hydration',
        turn_persistence_blocker: null
      }
    });
  });

  it('does not observe a discarded bootstrap tail line as live session-log proof', async () => {
    const { manifestPath } = await createManifestRoot();
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-app.jsonl');
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          assignee_id: null,
          assignee_name: null
        })
      )
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Done',
          state_type: 'completed',
          assignee_id: null,
          assignee_name: null
        })
      );

    const execRunner = vi.fn();
    const appServerTurnRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        turnIndex: 1
      });
      await mkdir(sessionDir, { recursive: true });
      await writeFile(
        sessionLogPath,
        [
          JSON.stringify({
            timestamp: '2026-03-21T09:00:00.000Z',
            type: 'session_meta',
            payload: {
              id: 'thread-app',
              cwd: tempRoot,
              initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
            }
          }),
          JSON.stringify({
            timestamp: '2026-03-21T09:00:01.000Z',
            type: 'event_msg',
            payload: { type: 'task_complete', turn_id: 'turn-app-stale' }
          })
        ].join('\n'),
        'utf8'
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        exitCode: 0,
        stdout: '{"type":"thread.started","thread_id":"thread-app"}',
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_CLOUD_ENV_ID: 'env-appserver-proof',
        CODEX_HOME: tempRoot ?? undefined
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () =>
          createAppServerRuntimeContext({
            runtime_session_id: 'appserver-run-child'
          })
        ),
        execRunner,
        appServerTurnRunner,
        sleep: async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
        },
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      thread_id: 'thread-app',
      latest_turn_id: null,
      session_log_thread_id: 'thread-app',
      session_log_turn_id: null,
      session_log_session_id: null,
      appserver_supervision: {
        turn_persistence_status: 'blocked',
        turn_persistence_blocker: 'session_log_hydration_missing'
      }
    });
  });

  it('preserves prior-turn session-log proof when an appserver resume launch fails before new turn data', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-app.jsonl');
    const execRunner = vi.fn();
    let appServerCallCount = 0;
    const appServerTurnRunner = vi.fn(async (request) => {
      appServerCallCount += 1;
      if (appServerCallCount === 1) {
        await appendStaySerialParallelizationDecisionAuditForRequest(request, {
          turnIndex: 1
        });
        await mkdir(sessionDir, { recursive: true });
        await writeFile(
          sessionLogPath,
          [
            JSON.stringify({
              timestamp: '2026-03-21T09:00:00.000Z',
              type: 'session_meta',
              payload: {
                id: 'thread-app',
                cwd: tempRoot,
                initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
              }
            }),
            JSON.stringify({
              timestamp: '2026-03-21T09:00:00.050Z',
              type: 'turn_context',
              payload: { turn_id: 'turn-app-1' }
            }),
            JSON.stringify({
              timestamp: '2026-03-21T09:00:01.000Z',
              type: 'event_msg',
              payload: { type: 'task_complete', turn_id: 'turn-app-1' }
            })
          ].join('\n'),
          'utf8'
        );
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-app"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-app-1"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-app-1"}}'
          ].join('\n'),
          stderr: ''
        };
      }
      throw new Error('spawn failed');
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '2',
          CODEX_CLOUD_ENV_ID: 'env-appserver-proof',
          CODEX_HOME: tempRoot ?? undefined
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () =>
            createAppServerRuntimeContext({
              runtime_session_id: 'appserver-run-child'
            })
          ),
          execRunner,
          appServerTurnRunner,
          sleep: async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
          },
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('spawn failed');

    expect(execRunner).not.toHaveBeenCalled();
    expect(appServerTurnRunner).toHaveBeenCalledTimes(2);
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-app',
      latest_turn_id: 'turn-app-1',
      latest_session_id: 'thread-app-turn-app-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      session_log_thread_id: 'thread-app',
      session_log_turn_id: 'turn-app-1',
      session_log_session_id: 'thread-app-turn-app-1',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'appserver_runtime_error',
      appserver_supervision: {
        turn_persistence_status: 'proven',
        turn_persistence_source: 'session_log_hydration',
        turn_persistence_blocker: null
      },
      failure_diagnosis: {
        source: 'appserver_runner'
      }
    });
  }, 20_000);

  it('blocks appserver resident resume proof until a persisted turn is observed', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          assignee_id: null,
          assignee_name: null
        })
      )
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Done',
          state_type: 'completed',
          assignee_id: null,
          assignee_name: null
        })
      );

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_CLOUD_ENV_ID: 'env-appserver-resume',
        CODEX_HOME: tempRoot ?? undefined,
        [PROVIDER_LINEAR_RESIDENT_SESSION_SEED_ENV]: JSON.stringify({
          source_run_id: 'run-prev',
          source_updated_at: '2026-03-21T08:59:59.000Z',
          source_end_reason: 'max_turns_reached_issue_still_active',
          source_thread_id: 'thread-1',
          logical_turn_count: 20,
          restart_count: 1
        })
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () =>
          createAppServerRuntimeContext({
            runtime_session_id: 'appserver-run-child'
          })
        ),
        execRunner: vi.fn(),
        appServerTurnRunner: vi.fn(async (request) => {
          await appendStaySerialParallelizationDecisionAuditForRequest(request, {
            turnIndex: 1
          });
          await mkdir(sessionDir, { recursive: true });
          await writeFile(
            sessionLogPath,
            [
              JSON.stringify({
                timestamp: '2026-03-21T09:00:00.000Z',
                type: 'session_meta',
                payload: {
                  id: 'thread-1',
                  cwd: tempRoot,
                  initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
                }
              }),
              JSON.stringify({
                timestamp: '2026-03-21T09:00:00.050Z',
                type: 'turn_context',
                payload: { turn_id: 'turn-prior' }
              }),
              JSON.stringify({
                timestamp: '2026-03-21T09:00:00.100Z',
                type: 'event_msg',
                payload: { type: 'task_complete', turn_id: 'turn-prior' }
              })
            ].join('\n'),
            'utf8'
          );
          await new Promise((resolve) => setTimeout(resolve, 20));
          return {
            exitCode: 0,
            stdout: '{"type":"thread.started","thread_id":"thread-1"}',
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: null,
      latest_session_id: null,
      appserver_supervision: {
        supervision_command: 'appserver_thread_resume',
        sticky_environment_status: 'proven',
        turn_persistence_status: 'blocked',
        turn_persistence_blocker: 'session_log_hydration_missing',
        resume_status: 'blocked',
        resume_source_thread_id: 'thread-1',
        resume_observed_thread_id: 'thread-1',
        resume_blocker: 'resume_session_log_hydration_missing'
      }
    });

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:02.000Z',
      undefined,
      { CODEX_HOME: tempRoot! }
    );

    expect(refreshed).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: null,
      latest_session_id: null,
      session_log_thread_id: 'thread-1',
      session_log_turn_id: null,
      session_log_session_id: null,
      appserver_supervision: {
        supervision_command: 'appserver_thread_resume',
        turn_persistence_status: 'blocked',
        turn_persistence_blocker: 'session_log_hydration_missing',
        resume_status: 'blocked',
        resume_source_thread_id: 'thread-1',
        resume_observed_thread_id: 'thread-1',
        resume_blocker: 'resume_session_log_hydration_missing'
      }
    });
  });

  it('proves appserver persistence when session-log records match existing stdout proof', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-app.jsonl');
    const appserverRuntime = {
      requested_mode: 'appserver',
      selected_mode: 'appserver',
      provider: 'AppServerRuntimeProvider',
      runtime_session_id: 'appserver-run-child',
      fallback: {
        occurred: false,
        code: null,
        reason: null,
        from_mode: null,
        to_mode: null,
        checked_at: '2026-03-21T09:00:00.000Z'
      }
    } as const;
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.000Z',
          type: 'session_meta',
          payload: {
            id: 'thread-app',
            cwd: tempRoot,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.050Z',
          type: 'turn_context',
          payload: { turn_id: 'turn-app-1' }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:01.000Z',
          type: 'event_msg',
          payload: { type: 'task_complete', turn_id: 'turn-app-1' }
        })
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          thread_id: 'thread-app',
          latest_turn_id: 'turn-app-1',
          latest_session_id: 'thread-app-turn-app-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 1,
          last_event: 'task_complete',
          last_event_at: '2026-03-21T09:00:01.000Z',
          current_turn_activity: {
            event: 'task_complete',
            message_or_payload: null,
            recorded_at: '2026-03-21T09:00:01.000Z',
            source: 'stdout_jsonl',
            turn_id: 'turn-app-1',
            session_id: 'thread-app-turn-app-1'
          },
          runtime: appserverRuntime,
          auth_provenance: {
            provider_kind: 'codex',
            runtime_mode: 'appserver',
            runtime_provider: 'AppServerRuntimeProvider',
            active_profile_fingerprint: null,
            active_account_fingerprint: null,
            cloud_env_id: 'env-appserver-proof',
            cloud_branch: null,
            credential_source: null,
            auth_freshness: 'credential_source_unknown',
            observed_at: '2026-03-21T09:00:00.000Z',
            source: 'runtime_env:linear'
          },
          workspace_path: tempRoot
        })
      ),
      'utf8'
    );

    const hydrated = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:03.000Z',
      undefined,
      { CODEX_HOME: tempRoot! }
    );

    expect(hydrated).toMatchObject({
      session_log_thread_id: 'thread-app',
      session_log_turn_id: 'turn-app-1',
      session_log_session_id: 'thread-app-turn-app-1',
      appserver_supervision: {
        supervision_command: 'appserver_thread_start',
        turn_persistence_status: 'proven',
        turn_persistence_source: 'session_log_hydration',
        turn_persistence_blocker: null,
        resume_status: 'not_requested'
      }
    });
  });

  it('ignores discarded bootstrap turn ids when session-log proof lags the stdout turn', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-app.jsonl');
    const appserverRuntime = {
      requested_mode: 'appserver',
      selected_mode: 'appserver',
      provider: 'AppServerRuntimeProvider',
      runtime_session_id: 'appserver-run-child',
      fallback: {
        occurred: false,
        code: null,
        reason: null,
        from_mode: null,
        to_mode: null,
        checked_at: '2026-03-21T09:00:00.000Z'
      }
    } as const;
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.000Z',
          type: 'session_meta',
          payload: {
            id: 'thread-app',
            cwd: tempRoot,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.050Z',
          type: 'turn_context',
          payload: { turn_id: 'turn-app-1' }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:01.000Z',
          type: 'event_msg',
          payload: { type: 'task_complete', turn_id: 'turn-app-1' }
        })
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          thread_id: 'thread-app',
          latest_turn_id: 'turn-app-2',
          latest_session_id: 'thread-app-turn-app-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'turn_started',
          last_event_at: '2026-03-21T09:00:02.000Z',
          current_turn_activity: {
            event: 'turn_started',
            message_or_payload: null,
            recorded_at: '2026-03-21T09:00:02.000Z',
            source: 'stdout_jsonl',
            turn_id: 'turn-app-2',
            session_id: 'thread-app-turn-app-2'
          },
          runtime: appserverRuntime,
          auth_provenance: {
            provider_kind: 'codex',
            runtime_mode: 'appserver',
            runtime_provider: 'AppServerRuntimeProvider',
            active_profile_fingerprint: null,
            active_account_fingerprint: null,
            cloud_env_id: 'env-appserver-proof',
            cloud_branch: null,
            credential_source: null,
            auth_freshness: 'credential_source_unknown',
            observed_at: '2026-03-21T09:00:00.000Z',
            source: 'runtime_env:linear'
          },
          workspace_path: tempRoot
        })
      ),
      'utf8'
    );

    const hydrated = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:03.000Z',
      undefined,
      { CODEX_HOME: tempRoot! }
    );

    expect(hydrated).toMatchObject({
      latest_turn_id: 'turn-app-2',
      session_log_thread_id: 'thread-app',
      session_log_turn_id: null,
      session_log_session_id: null,
      appserver_supervision: {
        turn_persistence_status: 'blocked',
        turn_persistence_blocker: 'session_log_hydration_missing'
      }
    });
  });

  it('rewinds consumed appserver session logs to backfill missing session-log proof ids', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-app.jsonl');
    const sessionLog = [
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.000Z',
        type: 'session_meta',
        payload: {
          id: 'thread-app',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.050Z',
        type: 'turn_context',
        payload: { turn_id: 'turn-app-1' }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:01.000Z',
        type: 'event_msg',
        payload: { type: 'task_complete', turn_id: 'turn-app-1' }
      })
    ].join('\n');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(sessionLogPath, sessionLog, 'utf8');
    await writeFile(
      hydrationPath,
      JSON.stringify({
        path: sessionLogPath,
        offset_bytes: Buffer.byteLength(sessionLog, 'utf8'),
        trailing_text: '',
        bootstrap_pending: false,
        proof_signature: 'already-consumed-before-session-log-proof-fields'
      }),
      'utf8'
    );
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          thread_id: 'thread-app',
          latest_turn_id: 'turn-app-1',
          latest_session_id: 'thread-app-turn-app-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          session_log_thread_id: null,
          session_log_turn_id: null,
          session_log_session_id: null,
          turn_count: 1,
          last_event: 'task_complete',
          last_event_at: '2026-03-21T09:00:01.000Z',
          current_turn_activity: {
            event: 'task_complete',
            message_or_payload: null,
            recorded_at: '2026-03-21T09:00:01.000Z',
            source: 'stdout_jsonl',
            turn_id: 'turn-app-1',
            session_id: 'thread-app-turn-app-1'
          },
          runtime: {
            requested_mode: 'appserver',
            selected_mode: 'appserver',
            provider: 'AppServerRuntimeProvider',
            runtime_session_id: 'appserver-run-child',
            fallback: {
              occurred: false,
              code: null,
              reason: null,
              from_mode: null,
              to_mode: null,
              checked_at: '2026-03-21T09:00:00.000Z'
            }
          },
          auth_provenance: {
            provider_kind: 'codex',
            runtime_mode: 'appserver',
            runtime_provider: 'AppServerRuntimeProvider',
            active_profile_fingerprint: null,
            active_account_fingerprint: null,
            cloud_env_id: 'env-appserver-proof',
            cloud_branch: null,
            credential_source: null,
            auth_freshness: 'credential_source_unknown',
            observed_at: '2026-03-21T09:00:00.000Z',
            source: 'runtime_env:linear'
          },
          workspace_path: tempRoot
        })
      ),
      'utf8'
    );

    const hydrated = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:03.000Z',
      undefined,
      { CODEX_HOME: tempRoot! }
    );

    expect(hydrated).toMatchObject({
      session_log_thread_id: 'thread-app',
      session_log_turn_id: 'turn-app-1',
      session_log_session_id: 'thread-app-turn-app-1',
      appserver_supervision: {
        turn_persistence_status: 'proven',
        turn_persistence_source: 'session_log_hydration',
        turn_persistence_blocker: null
      }
    });
  });

  it('does not rewind consumed appserver session logs repeatedly for the same unmatched turn', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-app.jsonl');
    const sessionLog = [
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.000Z',
        type: 'session_meta',
        payload: {
          id: 'thread-app',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.050Z',
        type: 'turn_context',
        payload: { turn_id: 'turn-app-1' }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:01.000Z',
        type: 'event_msg',
        payload: { type: 'task_complete', turn_id: 'turn-app-1' }
      })
    ].join('\n');
    const idRewindSignature = JSON.stringify({
      thread_id: 'thread-app',
      latest_turn_id: 'turn-app-2',
      latest_session_id: 'thread-app-turn-app-2',
      session_log_thread_id: 'thread-app',
      session_log_turn_id: null,
      session_log_session_id: null
    });
    await mkdir(sessionDir, { recursive: true });
    await writeFile(sessionLogPath, sessionLog, 'utf8');
    await writeFile(
      hydrationPath,
      JSON.stringify({
        path: sessionLogPath,
        offset_bytes: Buffer.byteLength(sessionLog, 'utf8'),
        trailing_text: 'pending-fragment',
        bootstrap_pending: false,
        proof_signature: 'stale-after-first-unmatched-turn-rewind',
        id_rewind_signature: idRewindSignature
      }),
      'utf8'
    );
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          thread_id: 'thread-app',
          latest_turn_id: 'turn-app-2',
          latest_session_id: 'thread-app-turn-app-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          session_log_thread_id: 'thread-app',
          session_log_turn_id: null,
          session_log_session_id: null,
          turn_count: 2,
          last_event: 'agent_message',
          last_message: 'turn 2 active',
          last_event_at: '2026-03-21T09:00:02.000Z',
          current_turn_activity: {
            event: 'agent_message',
            message_or_payload: 'turn 2 active',
            recorded_at: '2026-03-21T09:00:02.000Z',
            source: 'stdout_jsonl',
            turn_id: 'turn-app-2',
            session_id: 'thread-app-turn-app-2'
          },
          runtime: {
            requested_mode: 'appserver',
            selected_mode: 'appserver',
            provider: 'AppServerRuntimeProvider',
            runtime_session_id: 'appserver-run-child',
            fallback: {
              occurred: false,
              code: null,
              reason: null,
              from_mode: null,
              to_mode: null,
              checked_at: '2026-03-21T09:00:00.000Z'
            }
          },
          auth_provenance: {
            provider_kind: 'codex',
            runtime_mode: 'appserver',
            runtime_provider: 'AppServerRuntimeProvider',
            active_profile_fingerprint: null,
            active_account_fingerprint: null,
            cloud_env_id: 'env-appserver-proof',
            cloud_branch: null,
            credential_source: null,
            auth_freshness: 'credential_source_unknown',
            observed_at: '2026-03-21T09:00:00.000Z',
            source: 'runtime_env:linear'
          },
          workspace_path: tempRoot
        })
      ),
      'utf8'
    );

    const hydrated = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:03.000Z',
      undefined,
      { CODEX_HOME: tempRoot! }
    );
    const hydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(hydrated).toMatchObject({
      latest_turn_id: 'turn-app-2',
      session_log_thread_id: 'thread-app',
      session_log_turn_id: null,
      session_log_session_id: null,
      appserver_supervision: {
        turn_persistence_status: 'blocked',
        turn_persistence_blocker: 'session_log_hydration_missing'
      }
    });
    expect(hydration).toMatchObject({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(sessionLog, 'utf8'),
      trailing_text: 'pending-fragment',
      bootstrap_pending: true,
      id_rewind_signature: idRewindSignature,
      proof_signature: expect.any(String)
    });
  });

  it('proves appserver in-run resume only from session-log hydrated turns', async () => {
    const { runDir } = await createManifestRoot();
    const proof: ProviderLinearWorkerProof = {
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      attempt_started_at: '2026-03-21T09:00:00.000Z',
      current_turn_started_at: '2026-03-21T09:00:01.000Z',
      pid: '123',
      thread_id: 'thread-app',
      latest_turn_id: 'turn-app-2',
      latest_session_id: 'thread-app-turn-app-2',
      latest_session_id_source: 'derived_from_thread_and_turn',
      session_log_thread_id: 'thread-app',
      session_log_turn_id: 'turn-app-2',
      session_log_session_id: 'thread-app-turn-app-2',
      resume_source_thread_id: 'thread-app',
      turn_count: 2,
      last_event: 'task_complete',
      last_message: null,
      last_event_at: '2026-03-21T09:00:02.000Z',
      current_turn_activity: {
        event: 'task_complete',
        message_or_payload: null,
        recorded_at: '2026-03-21T09:00:02.000Z',
        source: 'session_log_hydration',
        turn_id: 'turn-app-2',
        session_id: 'thread-app-turn-app-2'
      },
      tokens: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null
      },
      rate_limits: null,
      runtime: {
        requested_mode: 'appserver',
        selected_mode: 'appserver',
        provider: 'AppServerRuntimeProvider',
        runtime_session_id: 'appserver-run-child',
        fallback: {
          occurred: false,
          code: null,
          reason: null,
          from_mode: null,
          to_mode: null,
          checked_at: '2026-03-21T09:00:00.000Z'
        }
      },
      auth_provenance: {
        provider_kind: 'codex',
        runtime_mode: 'appserver',
        runtime_provider: 'AppServerRuntimeProvider',
        active_profile_fingerprint: null,
        active_account_fingerprint: null,
        cloud_env_id: 'env-appserver-proof',
        cloud_branch: null,
        credential_source: null,
        auth_freshness: 'credential_source_unknown',
        observed_at: '2026-03-21T09:00:00.000Z',
        source: 'runtime_env:linear'
      },
      failure_diagnosis: null,
      owner_phase: 'turn_running',
      owner_status: 'in_progress',
      workspace_path: tempRoot,
      worker_host: null,
      source_setup: null,
      linear_audit: null,
      child_streams: [],
      child_lanes: [],
      parallelization: null,
      progress: null,
      linear_budget: null,
      tracked_issue_error: null,
      resident_session: null,
      end_reason: null,
      updated_at: '2026-03-21T09:00:02.000Z'
    };
    await writeFile(
      join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(proof),
      'utf8'
    );

    const hydrated = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:03.000Z',
      undefined,
      process.env,
      { skipSessionLogHydration: true }
    );

    expect(hydrated).toMatchObject({
      appserver_supervision: {
        turn_persistence_status: 'proven',
        turn_persistence_source: 'session_log_hydration',
        turn_persistence_blocker: null,
        pagination_status: 'blocked',
        pagination_blocker: 'appserver_pagination_probe_not_implemented',
        resume_status: 'proven',
        resume_source_thread_id: 'thread-app',
        resume_observed_thread_id: 'thread-app',
        resume_blocker: null
      }
    });
  });

  it('preserves machine-readable appserver fallback reasons when provider supervision falls back to exec', async () => {
    const { manifestPath } = await createManifestRoot();
    const fallback = {
      occurred: true,
      code: 'appserver-command-unavailable',
      reason: 'Appserver preflight failed (appserver-command-unavailable). Failed probing `codex app-server --help`.',
      from_mode: 'appserver',
      to_mode: 'cli',
      checked_at: '2026-03-21T09:00:00.000Z'
    } as const;

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_CLOUD_ENV_ID: 'env-appserver-fallback'
      },
      {
        readTrackedIssue: vi
          .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
          .mockResolvedValueOnce(
            createTrackedIssue({
              state: 'Merging',
              state_type: 'started',
              assignee_id: null,
              assignee_name: null
            })
          )
          .mockResolvedValueOnce(
            createTrackedIssue({
              state: 'Done',
              state_type: 'completed',
              assignee_id: null,
              assignee_name: null
            })
          ),
        resolveRuntimeContext: vi.fn(async () =>
          createRuntimeContext({
            requested_mode: 'appserver',
            selected_mode: 'cli',
            provider: 'CliRuntimeProvider',
            runtime_session_id: null,
            fallback
          })
        ),
        execRunner: vi.fn(async (request) => {
          await appendStaySerialParallelizationDecisionAuditForRequest(request, {
            turnIndex: 1
          });
          return {
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      runtime: {
        requested_mode: 'appserver',
        selected_mode: 'cli',
        provider: 'CliRuntimeProvider',
        fallback
      },
      appserver_supervision: {
        selected_runtime: {
          requested_mode: 'appserver',
          selected_mode: 'cli',
          provider: 'CliRuntimeProvider',
          fallback
        },
        sticky_environment_id: 'env-appserver-fallback',
        sticky_environment_status: 'proven',
        sticky_environment_blocker: null,
        turn_persistence_status: 'blocked',
        turn_persistence_blocker: 'session_log_hydration_missing',
        pagination_status: 'blocked',
        pagination_blocker: 'appserver_pagination_probe_not_implemented',
        resume_status: 'not_requested',
        fork_status: 'blocked',
        fork_blocker: 'appserver_fork_probe_not_implemented',
        jsonl_truth_retained: true,
        session_log_truth_retained: false
      }
    });
  });

  it('uses guarded resident-session seeds to resume the prior thread on worker turn one', async () => {
    const { manifestPath } = await createManifestRoot();
    const execRunner = vi.fn();
    const appServerTurnRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        turnIndex: 1
      });
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-21"}}',
          '{"type":"event_msg","payload":{"type":"agent_message","message":"guarded resume complete"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-21","timestamp":"2026-03-21T09:00:01.500Z"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_CLOUD_ENV_ID: 'env-appserver-resume',
        [PROVIDER_LINEAR_RESIDENT_SESSION_SEED_ENV]: JSON.stringify({
          source_run_id: 'run-prev',
          source_updated_at: '2026-03-21T08:59:59.000Z',
          source_end_reason: 'max_turns_reached_issue_still_active',
          source_thread_id: 'thread-1',
          logical_turn_count: 20,
          restart_count: 1
        })
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          assignee_id: null,
          assignee_name: null
        })),
        resolveRuntimeContext: vi.fn(async () =>
          createAppServerRuntimeContext({
            runtime_session_id: 'appserver-run-child'
          })
        ),
        execRunner,
        appServerTurnRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).not.toHaveBeenCalled();
    expect(appServerTurnRunner).toHaveBeenCalledTimes(1);
    expect(appServerTurnRunner.mock.calls[0]?.[0]).toMatchObject({
      args: ['app-server'],
      resumeThreadId: 'thread-1'
    });
    expect(String(appServerTurnRunner.mock.calls[0]?.[0].prompt ?? '')).toContain(
      'Continuation guidance'
    );
    expect(String(appServerTurnRunner.mock.calls[0]?.[0].prompt ?? '')).toContain(
      'logical resident turn #21'
    );
    expect(proof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-21',
      latest_session_id: 'thread-1-turn-21',
      turn_count: 1,
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active',
      resident_session: {
        logical_session_id: 'linear:lin-issue-1:resident-session',
        logical_turn_count: 21,
        restart_count: 1,
        continuity_state: 'guarded_resume_active',
        source_run_id: 'run-prev',
        source_end_reason: 'max_turns_reached_issue_still_active',
        source_thread_id: 'thread-1'
      },
      appserver_supervision: {
        sticky_environment_id: 'env-appserver-resume',
        sticky_environment_status: 'proven',
        turn_persistence_status: 'blocked',
        turn_persistence_blocker: 'session_log_hydration_missing',
        resume_status: 'blocked',
        resume_source_thread_id: 'thread-1',
        resume_observed_thread_id: 'thread-1',
        resume_blocker: 'resume_session_log_hydration_missing'
      }
    });
  });

  it('fails closed when a guarded resident resume changes thread identity', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        turnIndex: 1
      });
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-2"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-21"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-21","timestamp":"2026-03-21T09:00:01.500Z"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
          [PROVIDER_LINEAR_RESIDENT_SESSION_SEED_ENV]: JSON.stringify({
            source_run_id: 'run-prev',
            source_updated_at: '2026-03-21T08:59:59.000Z',
            source_end_reason: 'max_turns_reached_issue_still_active',
            source_thread_id: 'thread-1',
            logical_turn_count: 20,
            restart_count: 1
          })
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            assignee_id: null,
            assignee_name: null
          })),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('guarded resident resume changed thread identity');

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-2',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'guarded_resume_thread_mismatch',
      resident_session: {
        logical_turn_count: 20,
        restart_count: 1,
        continuity_state: 'guarded_resume_pending',
        source_thread_id: 'thread-1'
      }
    });
  });

  it('passes env-backed Linear scope bindings into tracked issue refreshes', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(createTrackedIssue())
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Done',
          state_type: 'completed'
        })
      );
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CO_LINEAR_WORKSPACE_ID: 'workspace-1',
        CO_LINEAR_TEAM_ID: 'team-1',
        CO_LINEAR_PROJECT_ID: 'project-1'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(readTrackedIssue).toHaveBeenCalledTimes(2);
    for (const [input] of readTrackedIssue.mock.calls) {
      expect(input).toMatchObject({
        issueId: 'lin-issue-1',
        sourceSetup: {
          provider: 'linear',
          workspace_id: 'workspace-1',
          team_id: 'team-1',
          project_id: 'project-1'
        }
      });
    }

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      source_setup: {
        provider: 'linear',
        workspace_id: 'workspace-1',
        team_id: 'team-1',
        project_id: 'project-1'
      }
    });
  }, providerLinearWorkerRunnerTestTimeoutMs);

  it('treats a corrupt child-stream ledger as fatal during proof hydration', async () => {
    const { runDir } = await createManifestRoot();
    await writeFile(
      join(runDir, 'provider-linear-worker-child-streams.json'),
      '{"corrupt":true}',
      'utf8'
    );

    await expect(readProviderLinearWorkerChildStreams(runDir)).rejects.toThrow(
      'provider-linear-worker child-stream ledger is not an array'
    );
  });

  it('serializes overlapping child-stream ledger appends so sibling runs are not lost', async () => {
    const { runDir } = await createManifestRoot();
    const firstRecord = {
      stream: 'docs-review',
      pipeline_id: 'docs-review',
      task_id: 'linear-lin-issue-1-docs-review',
      run_id: 'docs-run-1',
      status: 'succeeded',
      manifest_path: join(runDir, 'child-1-manifest.json'),
      artifact_root: join(runDir, 'child-1'),
      log_path: join(runDir, 'child-1.log'),
      summary: 'child 1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-03-27T01:00:00.000Z'
    };
    const secondRecord = {
      ...firstRecord,
      task_id: 'linear-lin-issue-1-implementation-gate',
      run_id: 'impl-run-1',
      stream: 'implementation-gate',
      pipeline_id: 'implementation-gate',
      manifest_path: join(runDir, 'child-2-manifest.json'),
      artifact_root: join(runDir, 'child-2'),
      log_path: join(runDir, 'child-2.log'),
      summary: 'child 2',
      launched_at: '2026-03-27T01:00:01.000Z'
    };

    let markFirstWriteStarted: (() => void) | null = null;
    const firstWriteStarted = new Promise<void>((resolve) => {
      markFirstWriteStarted = resolve;
    });
    let releaseFirstWrite: (() => void) | null = null;
    const holdFirstWrite = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    let secondSettled = false;
    const firstPromise = appendProviderLinearWorkerChildStreamRecord(
      runDir,
      firstRecord,
      async (path, value) => {
        markFirstWriteStarted?.();
        await holdFirstWrite;
        await writeFile(path, JSON.stringify(value), 'utf8');
      }
    );

    await firstWriteStarted;
    const secondPromise = appendProviderLinearWorkerChildStreamRecord(runDir, secondRecord).then((value) => {
      secondSettled = true;
      return value;
    });
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(secondSettled).toBe(false);

    releaseFirstWrite?.();
    const [firstResult, secondResult] = await Promise.all([
      firstPromise,
      secondPromise
    ]);
    const recorded = await readProviderLinearWorkerChildStreams(runDir);

    expect(firstResult).toHaveLength(1);
    expect(secondResult).toHaveLength(2);
    expect(recorded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ task_id: 'linear-lin-issue-1-docs-review', run_id: 'docs-run-1' }),
        expect.objectContaining({ task_id: 'linear-lin-issue-1-implementation-gate', run_id: 'impl-run-1' })
      ])
    );
  });

  it('does not reap a stale-looking child-stream ledger lock while an append is still active', async () => {
    const { runDir } = await createManifestRoot();
    const lockPath = join(runDir, 'provider-linear-worker-child-streams.json.lock');
    const firstRecord = {
      stream: 'docs-review',
      pipeline_id: 'docs-review',
      task_id: 'linear-lin-issue-1-docs-review',
      run_id: 'docs-run-1',
      status: 'succeeded',
      manifest_path: join(runDir, 'child-1-manifest.json'),
      artifact_root: join(runDir, 'child-1'),
      log_path: join(runDir, 'child-1.log'),
      summary: 'child 1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-03-27T01:00:00.000Z'
    };
    const secondRecord = {
      ...firstRecord,
      task_id: 'linear-lin-issue-1-implementation-gate',
      run_id: 'impl-run-1',
      stream: 'implementation-gate',
      pipeline_id: 'implementation-gate',
      manifest_path: join(runDir, 'child-2-manifest.json'),
      artifact_root: join(runDir, 'child-2'),
      log_path: join(runDir, 'child-2.log'),
      summary: 'child 2',
      launched_at: '2026-03-27T01:00:01.000Z'
    };

    let markFirstWriteStarted: (() => void) | null = null;
    const firstWriteStarted = new Promise<void>((resolve) => {
      markFirstWriteStarted = resolve;
    });
    let releaseFirstWrite: (() => void) | null = null;
    const holdFirstWrite = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    let secondSettled = false;
    const firstPromise = appendProviderLinearWorkerChildStreamRecord(
      runDir,
      firstRecord,
      async (path, value) => {
        markFirstWriteStarted?.();
        await holdFirstWrite;
        await writeFile(path, JSON.stringify(value), 'utf8');
      }
    );

    await firstWriteStarted;
    const stalePast = new Date(Date.now() - 60_000);
    await utimes(lockPath, stalePast, stalePast);
    const secondPromise = appendProviderLinearWorkerChildStreamRecord(runDir, secondRecord).then((value) => {
      secondSettled = true;
      return value;
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(secondSettled).toBe(false);

    releaseFirstWrite?.();
    const recorded = await Promise.all([firstPromise, secondPromise]).then(async () =>
      await readProviderLinearWorkerChildStreams(runDir)
    );

    expect(recorded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ task_id: 'linear-lin-issue-1-docs-review', run_id: 'docs-run-1' }),
        expect.objectContaining({ task_id: 'linear-lin-issue-1-implementation-gate', run_id: 'impl-run-1' })
      ])
    );
  });

  it('waits for the shared proof lock before refreshing the provider proof snapshot', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const proofLockPath = `${proofPath}.lock`;
    await writeFile(
      proofPath,
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 1,
        last_event: 'task_complete',
        last_message: 'done',
        last_event_at: '2026-03-21T09:00:00.000Z',
        tokens: {
          input_tokens: 1,
          output_tokens: 2,
          total_tokens: 3
        },
        rate_limits: null,
        owner_phase: 'implementation',
        owner_status: 'in_progress',
        workspace_path: tempRoot,
        linear_audit: null,
        end_reason: null,
        updated_at: '2026-03-21T09:00:00.000Z'
      }),
      'utf8'
    );
    await writeFile(proofLockPath, 'locked', 'utf8');
    const writeProof = vi.fn(async () => undefined);

    const refreshPromise = refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      writeProof
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(writeProof).not.toHaveBeenCalled();
    await rm(proofLockPath, { force: true });

    const refreshed = await refreshPromise;
    expect(writeProof).toHaveBeenCalledTimes(1);
    expect(refreshed).toMatchObject({
      issue_identifier: 'CO-2',
      updated_at: '2026-03-21T09:00:10.000Z'
    });
  });

  it('refreshes persisted source-root freshness while refreshing a provider proof snapshot', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const sourceRoot = await createProviderWorkerSourceRootRepo('provider-worker-refresh-source-');
    const sourceEntrypoint = join(sourceRoot, 'bin', 'codex-orchestrator.ts');
    const sourceBaseHash = git(sourceRoot, ['rev-parse', 'HEAD']).stdout.trim();
    const sourceRootFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: sourceRoot,
      argv: ['node', sourceEntrypoint],
      cwd: sourceRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          workspace_path: sourceRoot,
          source_root_freshness: sourceRootFreshness
        })
      ),
      'utf8'
    );
    await writeFile(join(sourceRoot, 'README.md'), 'origin advanced\n', 'utf8');
    git(sourceRoot, ['add', '.']);
    git(sourceRoot, ['commit', '-m', 'origin advanced']);
    git(sourceRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(sourceRoot, ['reset', '--hard', sourceBaseHash]);

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z'
    );
    const persisted = JSON.parse(await readFile(proofPath, 'utf8')) as ProviderLinearWorkerProof;

    expect(refreshed?.updated_at).toBe('2026-03-21T09:00:10.000Z');
    expect(refreshed?.source_root_freshness).toMatchObject({
      status: 'warning',
      observed_at: expect.not.stringMatching('2026-05-01T00:00:00.000Z'),
      source_checkout: {
        status: 'stale',
        behind: 1
      },
      provenance: {
        command_path_source: 'argv',
        package_root_source: 'command_path',
        source_root_source: 'package_root'
      }
    });
    expect(persisted.source_root_freshness).toEqual(refreshed?.source_root_freshness);
  });

  it('does not advance proof updated_at when only source-root observed_at changes', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const sourceRoot = await createProviderWorkerSourceRootRepo('provider-worker-refresh-observed-at-');
    const sourceEntrypoint = join(sourceRoot, 'bin', 'codex-orchestrator.ts');
    const sourceRootFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: sourceRoot,
      argv: ['node', sourceEntrypoint],
      cwd: sourceRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          current_turn_started_at: null,
          session_log_thread_id: null,
          session_log_turn_id: null,
          session_log_session_id: null,
          resume_source_thread_id: null,
          last_message_source: null,
          last_message_delta_key: null,
          current_turn_activity: null,
          runtime: null,
          appserver_supervision: null,
          auth_provenance: null,
          worker_control: null,
          source_root_freshness: sourceRootFreshness,
          failure_diagnosis: null,
          workspace_path: sourceRoot,
          worker_host: null,
          source_setup: null,
          child_streams: [],
          child_lanes: [],
          parallelization: null,
          progress: null,
          linear_budget: null,
          tracked_issue_error: null,
          resident_session: null
        })
      ),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z'
    );
    const persisted = JSON.parse(await readFile(proofPath, 'utf8')) as ProviderLinearWorkerProof;

    expect(refreshed?.updated_at).toBe('2026-03-21T09:00:00.000Z');
    expect(refreshed?.source_root_freshness?.observed_at).not.toBe(sourceRootFreshness.observed_at);
    expect(refreshed?.source_root_freshness).toMatchObject({
      status: 'current',
      source_checkout: {
        status: 'current',
        behind: 0
      }
    });
    expect(persisted.updated_at).toBe('2026-03-21T09:00:00.000Z');
    expect(persisted.source_root_freshness).toEqual(refreshed?.source_root_freshness);
  });

  it('keeps session-log hydration signatures aligned after refreshing source-root freshness', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sourceRoot = await createProviderWorkerSourceRootRepo('provider-worker-refresh-source-hydration-');
    const sourceEntrypoint = join(sourceRoot, 'bin', 'codex-orchestrator.ts');
    const sourceBaseHash = git(sourceRoot, ['rev-parse', 'HEAD']).stdout.trim();
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const sessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: sourceRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-1' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 4,
              output_tokens: 5,
              total_tokens: 9
            }
          }
        }
      })
    ].join('\n');
    const sourceRootFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: sourceRoot,
      argv: ['node', sourceEntrypoint],
      cwd: sourceRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });
    await mkdir(sessionDir, { recursive: true });
    await writeFile(sessionLogPath, sessionLog, 'utf8');
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          workspace_path: sourceRoot,
          source_root_freshness: sourceRootFreshness
        })
      ),
      'utf8'
    );
    await writeFile(join(sourceRoot, 'README.md'), 'origin advanced\n', 'utf8');
    git(sourceRoot, ['add', '.']);
    git(sourceRoot, ['commit', '-m', 'origin advanced']);
    git(sourceRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(sourceRoot, ['reset', '--hard', sourceBaseHash]);

    const firstRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      undefined,
      {
        CODEX_HOME: tempRoot!
      }
    );
    const firstHydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(firstRefresh?.source_root_freshness?.source_checkout).toMatchObject({
      status: 'stale',
      behind: 1
    });
    expect(firstHydration).toMatchObject({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(sessionLog, 'utf8'),
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });

    const secondRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:20.000Z',
      undefined,
      {
        CODEX_HOME: tempRoot!
      }
    );
    const secondHydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(secondRefresh?.source_root_freshness?.source_checkout).toMatchObject({
      status: 'stale',
      behind: 1
    });
    expect(secondHydration).toMatchObject({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(sessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
    expect(secondHydration.proof_signature).toBe(firstHydration.proof_signature);
  });

  it('recovers a stale proof lock before classifying active appserver proof telemetry', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const proofLockPath = `${proofPath}.lock`;
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-app.jsonl');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.000Z',
          type: 'session_meta',
          payload: {
            id: 'thread-app',
            cwd: tempRoot,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.050Z',
          type: 'turn_context',
          payload: { turn_id: 'turn-app-1' }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:01.000Z',
          type: 'event_msg',
          payload: {
            type: 'agent_message',
            message: 'active appserver proof update'
          }
        })
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          thread_id: 'thread-app',
          runtime: {
            requested_mode: 'appserver',
            selected_mode: 'appserver',
            provider: 'AppServerRuntimeProvider',
            runtime_session_id: 'appserver-run-child',
            fallback: {
              occurred: false,
              code: null,
              reason: null,
              from_mode: null,
              to_mode: null,
              checked_at: '2026-03-21T09:00:00.000Z'
            }
          } as never,
          workspace_path: tempRoot
        })
      ),
      'utf8'
    );
    await writeFile(proofLockPath, 'orphaned-proof-lock', 'utf8');
    const stalePast = new Date('2020-01-01T00:00:00.000Z');
    await utimes(proofLockPath, stalePast, stalePast);

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      undefined,
      { CODEX_HOME: tempRoot! }
    );

    await expect(readFile(proofLockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    expect(refreshed).toMatchObject({
      thread_id: 'thread-app',
      latest_turn_id: 'turn-app-1',
      latest_session_id: 'thread-app-turn-app-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'agent_message',
      last_message: 'active appserver proof update',
      session_log_thread_id: 'thread-app',
      session_log_turn_id: 'turn-app-1',
      session_log_session_id: 'thread-app-turn-app-1',
      appserver_supervision: {
        supervision_command: 'appserver_thread_start',
        turn_persistence_status: 'proven',
        turn_persistence_source: 'session_log_hydration',
        turn_persistence_blocker: null
      },
      progress: {
        phase: 'turn_running',
        kind: 'worker',
        status: 'progressing',
        summary: 'active appserver proof update',
        stall_classification: 'progressing',
        recovery_recommendation: 'continue_waiting'
      }
    });
  });

  it('hydrates shared Linear budget metadata into refreshed provider proofs', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 1,
        last_event: 'task_complete',
        last_message: 'done',
        last_event_at: '2026-03-21T09:00:00.000Z',
        tokens: {
          input_tokens: 1,
          output_tokens: 2,
          total_tokens: 3
        },
        rate_limits: null,
        owner_phase: 'implementation',
        owner_status: 'in_progress',
        workspace_path: tempRoot,
        linear_audit: null,
        end_reason: null,
        updated_at: '2026-03-21T09:00:00.000Z'
      }),
      'utf8'
    );

    const env = {
      CODEX_HOME: tempRoot!,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      env
    );

    expect(refreshed).toMatchObject({
      linear_budget: {
        suppression: 'low',
        requests: {
          remaining: 1
        }
      },
      progress: {
        phase: 'unknown',
        kind: 'worker',
        status: 'progressing'
      }
    });
  });

  it('keeps reservation placeholders in scan mode while repairing the ledger', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        attempt_started_at: '2026-04-17T00:30:00.000Z',
        current_turn_started_at: '2026-04-17T00:30:01.000Z',
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 1,
        last_event: 'item.completed',
        last_message: null,
        last_event_at: '2026-04-17T00:33:00.000Z',
        tokens: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        },
        rate_limits: null,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        workspace_path: tempRoot,
        linear_audit: null,
        end_reason: null,
        updated_at: '2026-04-17T00:33:00.000Z',
        child_lanes: [
          {
            stream: 'docs-packet',
            pipeline_id: 'provider-linear-child-lane',
            task_id: 'linear-lin-issue-1-docs-packet',
            run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
            status: 'in_progress',
            manifest_path: join(
              tempRoot!,
              '.runs',
              'linear-lin-issue-1-docs-packet',
              'cli',
              '2026-04-17T00-34-04-191Z-44a13a0d',
              'manifest.json'
            ),
            artifact_root: join(
              tempRoot!,
              '.runs',
              'linear-lin-issue-1-docs-packet',
              'cli',
              '2026-04-17T00-34-04-191Z-44a13a0d'
            ),
            log_path: join(
              tempRoot!,
              '.runs',
              'linear-lin-issue-1-docs-packet',
              'cli',
              '2026-04-17T00-34-04-191Z-44a13a0d',
              'runner.ndjson'
            ),
            summary: 'Child lane docs-packet is running.',
            summary_recorded_at: '2026-04-17T00:34:04.192Z',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-2',
            workspace_path: tempRoot,
            source_setup: null,
            launched_at: '2026-04-17T00:34:02.078Z',
            purpose: 'Build docs packet.',
            instructions: null,
            scope: resolveProviderLinearChildLaneScopeContract({
              files: ['docs/PRD-linear-lin-issue-1.md'],
              phases: ['docs']
            }),
            parent_snapshot: {
              base_sha: null,
              issue_updated_at: null,
              issue_state: null,
              issue_state_type: null,
              captured_at: '2026-04-17T00:34:02.078Z'
            },
            lane_workspace_path: null,
            patch_artifact_path: null,
            patch_bytes: null,
            decision: 'pending',
            in_flight_action: null,
            in_flight_started_at: null,
            decision_at: null,
            decision_reason: null
          }
        ]
      }),
      'utf8'
    );

    const childTaskId = 'linear-lin-issue-1-docs-packet';
    const childCliDir = join(tempRoot!, '.runs', childTaskId, 'cli');
    const staleChildRunDir = join(childCliDir, '2026-04-17T00-34-04-191Z-44a13a0d');
    const replacementChildRunDir = join(childCliDir, '2026-04-17T00-36-04-191Z-bbbbbbbb');
    await mkdir(replacementChildRunDir, { recursive: true });
    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      stream: 'docs-packet',
      pipeline_id: 'provider-linear-child-lane',
      task_id: childTaskId,
      run_id: 'launching-docs-packet',
      status: 'launching',
      manifest_path: join(childCliDir, 'launching-docs-packet', 'manifest.json'),
      artifact_root: join(childCliDir, 'launching-docs-packet'),
      log_path: null,
      summary: 'Child lane reserved before child run startup.',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-04-17T00:34:02.078Z',
      purpose: 'Build docs packet.',
      instructions: null,
      scope: resolveProviderLinearChildLaneScopeContract({
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      }),
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: null,
        issue_state: null,
        issue_state_type: null,
        captured_at: '2026-04-17T00:34:02.078Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'pending',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: null,
      decision_reason: null
    });
    await rm(staleChildRunDir, { recursive: true, force: true });
    await writeFile(
      join(replacementChildRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: '2026-04-17T00-36-04-191Z-bbbbbbbb',
        task_id: childTaskId,
        parent_run_id: 'run-child',
        pipeline_id: 'provider-linear-child-lane',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        status: 'in_progress',
        summary: 'Installing dependencies',
        started_at: '2026-04-17T00:36:04.192Z',
        updated_at: '2026-04-17T00:36:30.000Z',
        artifact_root: replacementChildRunDir,
        log_path: join(replacementChildRunDir, 'runner.ndjson'),
        workspace_path: tempRoot
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-04-17T00:37:00.000Z',
      async (path, proof) => await writeFile(path, JSON.stringify(proof, null, 2), 'utf8'),
      { CODEX_HOME: tempRoot! }
    );

    expect(refreshed?.child_lanes?.[0]).toMatchObject({
      run_id: '2026-04-17T00-36-04-191Z-bbbbbbbb',
      status: 'in_progress',
      manifest_path: join(replacementChildRunDir, 'manifest.json'),
      artifact_root: replacementChildRunDir,
      log_path: join(replacementChildRunDir, 'runner.ndjson'),
      summary: 'Child lane docs-packet is running. Installing dependencies',
      summary_recorded_at: '2026-04-17T00:36:30.000Z'
    });
    const ledger = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME), 'utf8')
    ) as Array<Record<string, unknown>>;
    expect(ledger[0]).toMatchObject({
      run_id: 'launching-docs-packet',
      status: 'launching',
      summary: 'Child lane reserved before child run startup.'
    });
  });

  it('can skip session-log hydration while refreshing child-lane state for projection reads', async () => {
    const { runDir } = await createManifestRoot();
    const issue = createTrackedIssue();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const codexHome = join(tempRoot ?? '', '.codex');
    const sessionDir = join(codexHome, 'sessions', '2030', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2030-03-21T09-00-06-000Z-thread-2.jsonl');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      sessionLogPath,
      [
        `{"timestamp":"2030-03-21T09:00:06.000Z","type":"session_meta","payload":{"id":"thread-2","cwd":"${tempRoot}","source":"exec"}}`,
        `{"timestamp":"2030-03-21T09:00:06.050Z","type":"turn_context","payload":{"turn_id":"turn-3","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
        '{"timestamp":"2030-03-21T09:00:06.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":99,"output_tokens":55,"total_tokens":154}},"rate_limits":{"primary":{"used_percent":90,"window_minutes":300},"secondary":{"used_percent":75,"window_minutes":10080}}}}'
      ].join('\n'),
      'utf8'
    );
    const sessionLogMtime = new Date('2030-03-21T09:00:06.000Z');
    await utimes(sessionLogPath, sessionLogMtime, sessionLogMtime);
    await writeFile(
      proofPath,
      JSON.stringify(
        {
          issue_id: 'lin-issue-1',
          issue_identifier: issue.identifier,
          attempt_started_at: '2030-03-21T09:00:05.000Z',
          current_turn_started_at: '2030-03-21T09:00:05.500Z',
          pid: '12345',
          thread_id: 'thread-2',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-2-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 1,
          last_event: 'item.completed',
          last_message: null,
          last_event_at: '2030-03-21T09:00:05.900Z',
          tokens: {
            input_tokens: 12,
            output_tokens: 8,
            total_tokens: 20
          },
          rate_limits: {
            primary: {
              used_percent: 12.5,
              window_minutes: 300
            },
            secondary: {
              used_percent: 48,
              window_minutes: 10080
            }
          },
          owner_phase: 'turn_completed',
          owner_status: 'in_progress',
          workspace_path: tempRoot,
          source_setup: null,
          linear_audit: null,
          child_streams: [],
          child_lanes: [],
          progress: null,
          tracked_issue_error: null,
          linear_budget: null,
          end_reason: null,
          updated_at: '2030-03-21T09:00:05.000Z'
        } satisfies ProviderLinearWorkerProof,
        null,
        2
      ),
      'utf8'
    );

    const childTaskId = 'linear-lin-issue-1-docs-packet';
    const childCliDir = join(tempRoot!, '.runs', childTaskId, 'cli');
    const matchingChildRunDir = join(childCliDir, '2030-03-21T09-00-07-000Z-childlane');
    await mkdir(matchingChildRunDir, { recursive: true });
    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      stream: 'docs-packet',
      pipeline_id: 'provider-linear-child-lane',
      task_id: childTaskId,
      run_id: 'launching-docs-packet',
      status: 'launching',
      manifest_path: join(childCliDir, 'launching-docs-packet', 'manifest.json'),
      artifact_root: join(childCliDir, 'launching-docs-packet'),
      log_path: null,
      summary: 'Child lane reserved before child run startup.',
      issue_id: 'lin-issue-1',
      issue_identifier: issue.identifier,
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2030-03-21T09:00:06.500Z',
      purpose: 'Build docs packet.',
      instructions: null,
      scope: resolveProviderLinearChildLaneScopeContract({
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      }),
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: null,
        issue_state: null,
        issue_state_type: null,
        captured_at: '2030-03-21T09:00:06.500Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'pending',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: null,
      decision_reason: null
    });
    await writeFile(
      join(matchingChildRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: '2030-03-21T09-00-07-000Z-childlane',
        task_id: childTaskId,
        parent_run_id: 'run-child',
        pipeline_id: 'provider-linear-child-lane',
        issue_id: 'lin-issue-1',
        issue_identifier: issue.identifier,
        status: 'in_progress',
        summary: 'Installing dependencies',
        started_at: '2030-03-21T09:00:07.000Z',
        updated_at: '2030-03-21T09:00:08.000Z',
        artifact_root: matchingChildRunDir,
        log_path: join(matchingChildRunDir, 'runner.ndjson'),
        workspace_path: tempRoot
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2030-03-21T09:00:09.000Z',
      async (path, proof) => await writeFile(path, JSON.stringify(proof, null, 2), 'utf8'),
      { ...process.env, CODEX_HOME: codexHome },
      {
        updatedAtComparisonScope: 'full',
        skipSessionLogHydration: true
      }
    );
    const onDisk = JSON.parse(await readFile(proofPath, 'utf8')) as ProviderLinearWorkerProof;

    expect(refreshed).toMatchObject({
      thread_id: 'thread-2',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-2-turn-2',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      },
      updated_at: '2030-03-21T09:00:09.000Z'
    });
    expect(refreshed?.child_lanes?.[0]).toMatchObject({
      run_id: '2030-03-21T09-00-07-000Z-childlane',
      status: 'in_progress',
      summary: 'Child lane docs-packet is running. Installing dependencies',
      manifest_path: join(matchingChildRunDir, 'manifest.json'),
      artifact_root: matchingChildRunDir
    });
    expect(onDisk).toMatchObject({
      thread_id: 'thread-2',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-2-turn-2',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      },
      updated_at: '2030-03-21T09:00:09.000Z'
    });
  });

  it('advances summary_recorded_at for status-only child-lane manifest progress', async () => {
    const { runDir } = await createManifestRoot();
    await writeFile(
      join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        attempt_started_at: '2026-04-17T00:30:00.000Z',
        current_turn_started_at: '2026-04-17T00:30:01.000Z',
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 1,
        last_event: 'item.completed',
        last_message: null,
        last_event_at: '2026-04-17T00:33:00.000Z',
        tokens: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        },
        rate_limits: null,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        workspace_path: tempRoot,
        linear_audit: null,
        end_reason: null,
        updated_at: '2026-04-17T00:33:00.000Z'
      }),
      'utf8'
    );

    const childTaskId = 'linear-lin-issue-1-docs-packet';
    const childCliDir = join(tempRoot!, '.runs', childTaskId, 'cli');
    const matchingChildRunDir = join(childCliDir, '2026-04-17T00-34-04-191Z-44a13a0d');
    await mkdir(matchingChildRunDir, { recursive: true });
    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      stream: 'docs-packet',
      pipeline_id: 'provider-linear-child-lane',
      task_id: childTaskId,
      run_id: 'launching-docs-packet',
      status: 'launching',
      manifest_path: join(childCliDir, 'launching-docs-packet', 'manifest.json'),
      artifact_root: join(childCliDir, 'launching-docs-packet'),
      log_path: null,
      summary: 'Child lane reserved before child run startup.',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-04-17T00:34:02.078Z',
      purpose: 'Build docs packet.',
      instructions: null,
      scope: resolveProviderLinearChildLaneScopeContract({
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      }),
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: null,
        issue_state: null,
        issue_state_type: null,
        captured_at: '2026-04-17T00:34:02.078Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'pending',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: null,
      decision_reason: null
    });
    await writeFile(
      join(matchingChildRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
        task_id: childTaskId,
        parent_run_id: 'run-child',
        pipeline_id: 'provider-linear-child-lane',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        status: 'queued',
        started_at: '2026-04-17T00:34:04.192Z',
        updated_at: '2026-04-17T00:34:30.000Z',
        heartbeat_at: '2026-04-17T00:34:29.000Z',
        artifact_root: matchingChildRunDir,
        log_path: join(matchingChildRunDir, 'runner.ndjson'),
        workspace_path: tempRoot
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-04-17T00:35:00.000Z',
      async (path, proof) => await writeFile(path, JSON.stringify(proof, null, 2), 'utf8'),
      { CODEX_HOME: tempRoot! }
    );

    expect(refreshed?.child_lanes?.[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'queued',
      summary: 'Child lane docs-packet is queued.',
      summary_recorded_at: '2026-04-17T00:34:30.000Z'
    });
    expect(refreshed?.progress?.summary_recorded_at).toBe('2026-04-17T00:34:30.000Z');
  });

  it('advances summary_recorded_at from heartbeat_at when it is fresher than updated_at for status-only child-lane manifest progress', async () => {
    const { runDir } = await createManifestRoot();
    await writeFile(
      join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        attempt_started_at: '2026-04-17T00:30:00.000Z',
        current_turn_started_at: '2026-04-17T00:30:01.000Z',
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 1,
        last_event: 'item.completed',
        last_message: null,
        last_event_at: '2026-04-17T00:33:00.000Z',
        tokens: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        },
        rate_limits: null,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        workspace_path: tempRoot,
        linear_audit: null,
        end_reason: null,
        updated_at: '2026-04-17T00:33:00.000Z'
      }),
      'utf8'
    );

    const childTaskId = 'linear-lin-issue-1-docs-packet';
    const childCliDir = join(tempRoot!, '.runs', childTaskId, 'cli');
    const matchingChildRunDir = join(childCliDir, '2026-04-17T00-34-04-191Z-44a13a0d');
    await mkdir(matchingChildRunDir, { recursive: true });
    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      stream: 'docs-packet',
      pipeline_id: 'provider-linear-child-lane',
      task_id: childTaskId,
      run_id: 'launching-docs-packet',
      status: 'launching',
      manifest_path: join(childCliDir, 'launching-docs-packet', 'manifest.json'),
      artifact_root: join(childCliDir, 'launching-docs-packet'),
      log_path: null,
      summary: 'Child lane reserved before child run startup.',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-04-17T00:34:02.078Z',
      purpose: 'Build docs packet.',
      instructions: null,
      scope: resolveProviderLinearChildLaneScopeContract({
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      }),
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: null,
        issue_state: null,
        issue_state_type: null,
        captured_at: '2026-04-17T00:34:02.078Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'pending',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: null,
      decision_reason: null
    });
    await writeFile(
      join(matchingChildRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
        task_id: childTaskId,
        parent_run_id: 'run-child',
        pipeline_id: 'provider-linear-child-lane',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        status: 'queued',
        started_at: '2026-04-17T00:34:04.192Z',
        updated_at: '2026-04-17T00:34:28.000Z',
        heartbeat_at: '2026-04-17T00:34:30.000Z',
        artifact_root: matchingChildRunDir,
        log_path: join(matchingChildRunDir, 'runner.ndjson'),
        workspace_path: tempRoot
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-04-17T00:35:00.000Z',
      async (path, proof) => await writeFile(path, JSON.stringify(proof, null, 2), 'utf8'),
      { CODEX_HOME: tempRoot! }
    );

    expect(refreshed?.child_lanes?.[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'queued',
      summary: 'Child lane docs-packet is queued.',
      summary_recorded_at: '2026-04-17T00:34:30.000Z'
    });
    expect(refreshed?.progress?.summary_recorded_at).toBe('2026-04-17T00:34:30.000Z');
  });

  it('classifies post-startup appserver child lanes with stale heartbeat and dead runner as invalidation candidates', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        attempt_started_at: '2026-04-17T00:30:00.000Z',
        current_turn_started_at: '2026-04-17T00:30:01.000Z',
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 1,
        last_event: 'item.completed',
        last_message: null,
        last_event_at: '2026-04-17T00:33:00.000Z',
        tokens: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        },
        rate_limits: null,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        workspace_path: tempRoot,
        linear_audit: null,
        end_reason: null,
        updated_at: '2026-04-17T00:33:00.000Z'
      }),
      'utf8'
    );

    const childTaskId = 'linear-lin-issue-1-docs-packet';
    const childCliDir = join(tempRoot!, '.runs', childTaskId, 'cli');
    const matchingChildRunDir = join(childCliDir, '2026-04-17T00-34-04-191Z-44a13a0d');
    await mkdir(matchingChildRunDir, { recursive: true });
    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      stream: 'docs-packet',
      pipeline_id: 'provider-linear-child-lane',
      task_id: childTaskId,
      run_id: 'launching-docs-packet',
      status: 'launching',
      manifest_path: join(childCliDir, 'launching-docs-packet', 'manifest.json'),
      artifact_root: join(childCliDir, 'launching-docs-packet'),
      log_path: null,
      summary: 'Child lane reserved before child run startup.',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-04-17T00:34:02.078Z',
      purpose: 'Build docs packet.',
      instructions: null,
      scope: resolveProviderLinearChildLaneScopeContract({
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      }),
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: null,
        issue_state: null,
        issue_state_type: null,
        captured_at: '2026-04-17T00:34:02.078Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'pending',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: null,
      decision_reason: null
    });
    await writeFile(
      join(matchingChildRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
        task_id: childTaskId,
        parent_run_id: 'run-child',
        pipeline_id: 'provider-linear-child-lane',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        status: 'completed',
        started_at: '2026-04-17T00:34:04.192Z',
        updated_at: '2026-04-17T00:34:30.000Z',
        completed_at: '2026-04-17T00:34:41.000Z',
        heartbeat_at: '2026-04-17T00:34:39.000Z',
        heartbeat_stale_after_seconds: 30,
        artifact_root: matchingChildRunDir,
        log_path: join(matchingChildRunDir, 'runner.ndjson'),
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      join(matchingChildRunDir, PROVIDER_LINEAR_CHILD_LANE_DIAGNOSTICS_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        task_id: childTaskId,
        run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
        parent_run_id: 'run-child',
        stream: 'docs-packet',
        provider_linear_child_lane_runner_pid: 4242,
        provider_linear_child_lane_runner_started_at: '2026-04-17T00:34:05.000Z',
        provider_linear_child_lane_runtime_selected_mode: 'appserver',
        provider_linear_child_lane_runtime_provider: 'AppServerRuntimeProvider',
        provider_linear_child_lane_runtime_event: 'codex_exec_completed',
        provider_linear_child_lane_runtime_event_at: '2026-04-17T00:34:40.000Z',
        provider_linear_child_lane_appserver_startup_observed: true,
        provider_linear_child_lane_appserver_startup_observed_at: '2026-04-17T00:34:12.000Z'
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-04-17T00:36:00.000Z',
      async (path, proof) => await writeFile(path, JSON.stringify(proof, null, 2), 'utf8'),
      { CODEX_HOME: tempRoot! },
      {
        skipSessionLogHydration: true,
        inspectProcess: (pid) => ({
          alive: pid !== 4242,
          startedAt: null,
          commandLine: null,
          error: null
        })
      }
    );

    expect(refreshed?.child_lanes?.[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'stale_invalidation_candidate',
      summary_recorded_at: '2026-04-17T00:36:00.000Z',
      runtime_mode: 'appserver',
      runtime_provider: 'AppServerRuntimeProvider',
      heartbeat_at: '2026-04-17T00:34:39.000Z',
      runner_pid: 4242,
      runner_started_at: '2026-04-17T00:34:05.000Z',
      runner_alive: false,
      runner_identity_status: 'not_live',
      runner_identity_reason: 'runner_pid_not_live',
      runtime_event: 'codex_exec_completed',
      appserver_startup_observed: true,
      appserver_startup_observed_at: '2026-04-17T00:34:12.000Z',
      stale_invalidation_candidate: true,
      stale_invalidation_reason: 'post_startup_no_output_heartbeat_stale_runner_dead'
    });
    expect(refreshed?.child_lanes?.[0]?.summary).toContain('stale invalidation candidate');
    expect(refreshed?.child_lanes?.[0]?.summary).toContain('providerLinearChildLaneRunner pid 4242 is not live');
    expect(refreshed?.child_lanes?.[0]?.summary).toContain('no proof/patch output is present');
    expect(refreshed?.child_lanes?.[0]?.summary).not.toContain('status is stale_invalidation_candidate');
    const ledgerAfterHydration = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME), 'utf8')
    ) as Array<Record<string, unknown>>;
    expect(ledgerAfterHydration[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'stale_invalidation_candidate',
      manifest_path: join(matchingChildRunDir, 'manifest.json'),
      artifact_root: matchingChildRunDir,
      runtime_mode: 'appserver',
      runtime_provider: 'AppServerRuntimeProvider',
      runner_pid: 4242,
      runner_started_at: '2026-04-17T00:34:05.000Z',
      runner_identity_status: 'not_live',
      appserver_startup_observed: true,
      stale_invalidation_candidate: true,
      stale_invalidation_reason: 'post_startup_no_output_heartbeat_stale_runner_dead'
    });
    expect(refreshed?.progress).toMatchObject({
      phase: 'child_lane',
      status: 'waiting',
      stall_classification: 'waiting_on_child_lane',
      recovery_recommendation: 'inspect_child_lane'
    });
    expect(refreshed?.progress?.summary).toContain('stale invalidation candidate');
    const rehydrated = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-04-17T00:36:05.000Z',
      async (path, proof) => await writeFile(path, JSON.stringify(proof, null, 2), 'utf8'),
      { CODEX_HOME: tempRoot! },
      {
        skipSessionLogHydration: true,
        inspectProcess: (pid) => ({
          alive: pid !== 4242,
          startedAt: null,
          commandLine: null,
          error: null
        })
      }
    );
    expect(rehydrated?.child_lanes?.[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'stale_invalidation_candidate',
      artifact_root: matchingChildRunDir,
      summary_recorded_at: '2026-04-17T00:36:00.000Z',
      stale_invalidation_reason: 'post_startup_no_output_heartbeat_stale_runner_dead'
    });

    await transactProviderLinearWorkerChildLanes(runDir, async (records) => ({
      records: records.map((record) =>
        record.stream === 'docs-packet'
          ? {
              ...record,
              decision: 'invalidated',
              decision_at: '2026-04-17T00:36:10.000Z',
              decision_reason: 'Parent invalidated child lane output.'
            }
          : record
      ),
      result: undefined
    }));
    const invalidated = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-04-17T00:36:30.000Z',
      async (path, proof) => await writeFile(path, JSON.stringify(proof, null, 2), 'utf8'),
      { CODEX_HOME: tempRoot! },
      {
        skipSessionLogHydration: true,
        inspectProcess: (pid) => ({
          alive: pid !== 4242,
          startedAt: null,
          commandLine: null,
          error: null
        })
      }
    );
    expect(invalidated?.child_lanes?.[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'invalidated',
      decision: 'invalidated',
      runtime_mode: 'appserver',
      runtime_provider: 'AppServerRuntimeProvider',
      runner_pid: 4242,
      runner_started_at: '2026-04-17T00:34:05.000Z',
      runner_identity_status: 'not_live',
      appserver_startup_observed: true,
      stale_invalidation_candidate: true,
      stale_invalidation_reason: 'post_startup_no_output_heartbeat_stale_runner_dead'
    });
    expect(invalidated?.child_lanes?.[0]?.summary).toContain('stale invalidation candidate');
    expect(invalidated?.child_lanes?.[0]?.summary).toContain('providerLinearChildLaneRunner pid 4242 is not live');
  });

  it('keeps zero-byte proof lanes, unknown runners, and ambiguous runner identity out of stale invalidation', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          current_turn_started_at: '2026-04-17T00:30:01.000Z',
          updated_at: '2026-04-17T00:33:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const childScope = resolveProviderLinearChildLaneScopeContract({
      files: ['orchestrator/tests/ProviderLinearWorkerRunner.test.ts'],
      phases: ['tests']
    });
    const writeCompletedAppserverLane = async (input: {
      stream: string;
      taskId: string;
      runId: string;
      runnerPid?: number;
      runnerStartedAt?: string;
      patchBytes?: number;
    }) => {
      const childCliDir = join(tempRoot!, '.runs', input.taskId, 'cli');
      const childRunDir = join(childCliDir, input.runId);
      await mkdir(childRunDir, { recursive: true });
      await appendProviderLinearWorkerChildLaneRecord(runDir, {
        stream: input.stream,
        pipeline_id: 'provider-linear-child-lane',
        task_id: input.taskId,
        run_id: `launching-${input.stream}`,
        status: 'launching',
        manifest_path: join(childCliDir, `launching-${input.stream}`, 'manifest.json'),
        artifact_root: join(childCliDir, `launching-${input.stream}`),
        log_path: null,
        summary: 'Child lane reserved before child run startup.',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        source_setup: null,
        launched_at: '2026-04-17T00:34:02.078Z',
        purpose: 'Validate stale child-lane classification.',
        instructions: null,
        scope: childScope,
        parent_snapshot: {
          base_sha: null,
          issue_updated_at: null,
          issue_state: null,
          issue_state_type: null,
          captured_at: '2026-04-17T00:34:02.078Z'
        },
        lane_workspace_path: null,
        patch_artifact_path: null,
        patch_bytes: null,
        decision: 'pending',
        in_flight_action: null,
        in_flight_started_at: null,
        decision_at: null,
        decision_reason: null
      });
      await writeFile(
        join(childRunDir, 'manifest.json'),
        JSON.stringify({
          run_id: input.runId,
          task_id: input.taskId,
          parent_run_id: 'run-child',
          pipeline_id: 'provider-linear-child-lane',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          status: 'completed',
          started_at: '2026-04-17T00:34:04.192Z',
          updated_at: '2026-04-17T00:34:30.000Z',
          completed_at: '2026-04-17T00:34:41.000Z',
          heartbeat_at: '2026-04-17T00:34:39.000Z',
          heartbeat_stale_after_seconds: 30,
          artifact_root: childRunDir,
          log_path: join(childRunDir, 'runner.ndjson'),
          workspace_path: tempRoot
        }),
        'utf8'
      );
      const diagnostics: Record<string, unknown> = {
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        task_id: input.taskId,
        run_id: input.runId,
        parent_run_id: 'run-child',
        stream: input.stream,
        provider_linear_child_lane_runtime_selected_mode: 'appserver',
        provider_linear_child_lane_runtime_provider: 'AppServerRuntimeProvider',
        provider_linear_child_lane_runtime_event: 'codex_exec_completed',
        provider_linear_child_lane_runtime_event_at: '2026-04-17T00:34:40.000Z',
        provider_linear_child_lane_appserver_startup_observed: true,
        provider_linear_child_lane_appserver_startup_observed_at: '2026-04-17T00:34:12.000Z'
      };
      if (input.runnerPid !== undefined) {
        diagnostics.provider_linear_child_lane_runner_pid = input.runnerPid;
      }
      if (input.runnerStartedAt !== undefined) {
        diagnostics.provider_linear_child_lane_runner_started_at = input.runnerStartedAt;
      }
      await writeFile(
        join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_DIAGNOSTICS_FILENAME),
        JSON.stringify(diagnostics),
        'utf8'
      );
      if (input.patchBytes !== undefined) {
        await writeFile(
          join(childRunDir, 'provider-linear-child-lane-proof.json'),
          JSON.stringify({
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-2',
            task_id: input.taskId,
            run_id: input.runId,
            parent_run_id: 'run-child',
            lane_workspace_path: tempRoot,
            patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
            patch_bytes: input.patchBytes,
            updated_at: '2026-04-17T00:34:41.000Z'
          }),
          'utf8'
        );
      }
    };

    await writeCompletedAppserverLane({
      stream: 'noop-proof',
      taskId: 'linear-lin-issue-1-noop-proof',
      runId: '2026-04-17T00-34-04-191Z-noop',
      runnerPid: 4242,
      runnerStartedAt: '2026-04-17T00:34:05.000Z',
      patchBytes: 0
    });
    await writeCompletedAppserverLane({
      stream: 'unknown-runner',
      taskId: 'linear-lin-issue-1-unknown-runner',
      runId: '2026-04-17T00-34-04-191Z-unknown',
      patchBytes: undefined
    });
    await writeCompletedAppserverLane({
      stream: 'reused-runner-pid',
      taskId: 'linear-lin-issue-1-reused-runner-pid',
      runId: '2026-04-17T00-34-04-191Z-reused',
      runnerPid: 4243,
      runnerStartedAt: '2026-04-17T00:34:05.000Z',
      patchBytes: undefined
    });
    await writeCompletedAppserverLane({
      stream: 'same-command-reused-runner-pid',
      taskId: 'linear-lin-issue-1-same-command-reused-runner-pid',
      runId: '2026-04-17T00-34-04-191Z-same-command-reused',
      runnerPid: 4246,
      runnerStartedAt: '2026-04-17T00:34:05.000Z',
      patchBytes: undefined
    });
    await writeCompletedAppserverLane({
      stream: 'missing-runner-start',
      taskId: 'linear-lin-issue-1-missing-runner-start',
      runId: '2026-04-17T00-34-04-191Z-missing-start',
      runnerPid: 4244,
      patchBytes: undefined
    });
    await writeCompletedAppserverLane({
      stream: 'dead-missing-runner-start',
      taskId: 'linear-lin-issue-1-dead-missing-runner-start',
      runId: '2026-04-17T00-34-04-191Z-dead-missing-start',
      runnerPid: 4245,
      patchBytes: undefined
    });

    const inspectProcess = (pid: number) => {
      if (pid === 4242) {
        return {
          alive: false,
          startedAt: null,
          commandLine: null,
          error: null
        };
      }
      if (pid === 4243) {
        return {
          alive: true,
          startedAt: '2026-04-17T00:34:06.000Z',
          commandLine: 'node /tmp/unrelated-runner.js',
          error: null
        };
      }
      if (pid === 4244) {
        return {
          alive: true,
          startedAt: '2026-04-17T00:34:04.000Z',
          commandLine: 'node /repo/dist/orchestrator/src/cli/providerLinearChildLaneRunner.js',
          error: null
        };
      }
      if (pid === 4246) {
        return {
          alive: true,
          startedAt: '2026-04-17T00:34:06.000Z',
          commandLine: 'node /repo/dist/orchestrator/src/cli/providerLinearChildLaneRunner.js',
          error: null
        };
      }
      if (pid === 4245) {
        return {
          alive: false,
          startedAt: null,
          commandLine: null,
          error: null
        };
      }
      return {
        alive: null,
        startedAt: null,
        commandLine: null,
        error: 'unexpected_pid'
      };
    };

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-04-17T00:36:00.000Z',
      async (path, proof) => await writeFile(path, JSON.stringify(proof, null, 2), 'utf8'),
      { CODEX_HOME: tempRoot! },
      {
        skipSessionLogHydration: true,
        inspectProcess
      }
    );

    const lanesByStream = new Map((refreshed?.child_lanes ?? []).map((lane) => [lane.stream, lane]));
    expect(lanesByStream.get('noop-proof')).toMatchObject({
      status: 'completed',
      patch_bytes: 0,
      runner_pid: 4242,
      runner_started_at: '2026-04-17T00:34:05.000Z',
      runner_alive: false,
      runner_identity_status: 'not_live',
      stale_invalidation_candidate: null,
      stale_invalidation_reason: null
    });
    expect(lanesByStream.get('noop-proof')?.summary).toBe(
      'Child lane completed without patch output; waiting for parent ledger decision.'
    );
    expect(lanesByStream.get('unknown-runner')).toMatchObject({
      status: 'in_progress',
      runner_pid: null,
      runner_alive: null,
      stale_invalidation_candidate: null,
      stale_invalidation_reason: null
    });
    expect(lanesByStream.get('unknown-runner')?.summary).toBe(
      'Child lane completed; waiting for patch proof metadata.'
    );
    expect(lanesByStream.get('reused-runner-pid')).toMatchObject({
      status: 'in_progress',
      runner_pid: 4243,
      runner_started_at: '2026-04-17T00:34:05.000Z',
      runner_alive: null,
      runner_identity_status: 'pid_reuse_suspected',
      runner_identity_reason: 'process_command_line_mismatch',
      runner_observed_started_at: '2026-04-17T00:34:06.000Z',
      runner_command_line_matches: false,
      stale_invalidation_candidate: null,
      stale_invalidation_reason: null
    });
    expect(lanesByStream.get('reused-runner-pid')?.summary).toBe(
      'Child lane completed; waiting for patch proof metadata.'
    );
    expect(lanesByStream.get('same-command-reused-runner-pid')).toMatchObject({
      status: 'in_progress',
      runner_pid: 4246,
      runner_started_at: '2026-04-17T00:34:05.000Z',
      runner_alive: null,
      runner_identity_status: 'pid_reuse_suspected',
      runner_identity_reason: 'process_started_after_recorded_runner_start',
      runner_observed_started_at: '2026-04-17T00:34:06.000Z',
      runner_command_line_matches: true,
      stale_invalidation_candidate: null,
      stale_invalidation_reason: null
    });
    expect(lanesByStream.get('same-command-reused-runner-pid')?.summary).toBe(
      'Child lane completed; waiting for patch proof metadata.'
    );
    expect(lanesByStream.get('missing-runner-start')).toMatchObject({
      status: 'in_progress',
      runner_pid: 4244,
      runner_started_at: null,
      runner_alive: null,
      runner_identity_status: 'ambiguous',
      runner_identity_reason: 'runner_started_at_missing',
      runner_observed_started_at: '2026-04-17T00:34:04.000Z',
      runner_command_line_matches: true,
      stale_invalidation_candidate: null,
      stale_invalidation_reason: null
    });
    expect(lanesByStream.get('missing-runner-start')?.summary).toBe(
      'Child lane completed; waiting for patch proof metadata.'
    );
    expect(lanesByStream.get('dead-missing-runner-start')).toMatchObject({
      status: 'in_progress',
      runner_pid: 4245,
      runner_started_at: null,
      runner_alive: null,
      runner_identity_status: 'ambiguous',
      runner_identity_reason: 'runner_started_at_missing',
      stale_invalidation_candidate: null,
      stale_invalidation_reason: null
    });
    expect(lanesByStream.get('dead-missing-runner-start')?.summary).toBe(
      'Child lane completed; waiting for patch proof metadata.'
    );
    const rehydrated = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-04-17T00:36:05.000Z',
      async (path, proof) => await writeFile(path, JSON.stringify(proof, null, 2), 'utf8'),
      { CODEX_HOME: tempRoot! },
      {
        skipSessionLogHydration: true,
        inspectProcess
      }
    );
    const rehydratedLanesByStream = new Map((rehydrated?.child_lanes ?? []).map((lane) => [lane.stream, lane]));
    expect(rehydratedLanesByStream.get('reused-runner-pid')).toMatchObject({
      runner_identity_status: 'pid_reuse_suspected',
      runner_identity_reason: 'process_command_line_mismatch',
      runner_observed_started_at: '2026-04-17T00:34:06.000Z',
      runner_command_line_matches: false
    });
    expect(rehydratedLanesByStream.get('same-command-reused-runner-pid')).toMatchObject({
      runner_identity_status: 'pid_reuse_suspected',
      runner_identity_reason: 'process_started_after_recorded_runner_start',
      runner_observed_started_at: '2026-04-17T00:34:06.000Z',
      runner_command_line_matches: true
    });
    expect(rehydratedLanesByStream.get('missing-runner-start')).toMatchObject({
      runner_identity_status: 'ambiguous',
      runner_identity_reason: 'runner_started_at_missing',
      runner_observed_started_at: '2026-04-17T00:34:04.000Z',
      runner_command_line_matches: true
    });
    expect(rehydratedLanesByStream.get('dead-missing-runner-start')).toMatchObject({
      runner_alive: null,
      runner_identity_status: 'ambiguous',
      runner_identity_reason: 'runner_started_at_missing',
      stale_invalidation_candidate: null,
      stale_invalidation_reason: null
    });
  });

  it('backfills appserver session telemetry into refreshed provider proofs', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        attempt_started_at: '2026-03-21T09:00:00.000Z',
        current_turn_started_at: '2026-03-21T09:00:00.000Z',
        thread_id: 'thread-1',
        latest_turn_id: null,
        latest_session_id: null,
        latest_session_id_source: null,
        turn_count: 1,
        last_event: 'item.completed',
        last_message: null,
        last_event_at: null,
        tokens: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        },
        rate_limits: null,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        workspace_path: tempRoot,
        linear_audit: null,
        end_reason: null,
        updated_at: '2026-03-21T09:00:00.000Z'
      }),
      'utf8'
    );

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.000Z',
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: tempRoot,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.050Z',
          type: 'turn_context',
          payload: {
            turn_id: 'turn-1'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.100Z',
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 12,
                output_tokens: 8,
                total_tokens: 20
              }
            },
            rate_limits: {
              primary: {
                used_percent: 12.5,
                window_minutes: 300
              },
              secondary: {
                used_percent: 48,
                window_minutes: 10080
              }
            }
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.150Z',
          type: 'event_msg',
          payload: {
            type: 'task_complete',
            turn_id: 'turn-1'
          }
        })
      ].join('\n'),
      'utf8'
    );
    const sessionTimestamp = new Date('2026-03-21T09:00:05.000Z');
    await utimes(sessionLogPath, sessionTimestamp, sessionTimestamp);

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(refreshed).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_event_at: '2026-03-21T09:00:00.150Z',
      current_turn_activity: {
        event: 'task_complete',
        recorded_at: '2026-03-21T09:00:00.150Z',
        source: 'session_log_hydration',
        turn_id: 'turn-1',
        session_id: 'thread-1-turn-1'
      },
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      }
    });
  });

  it('backfills completed current-turn session telemetry when the proof already has the turn id', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          current_turn_started_at: '2026-03-21T09:00:00.000Z',
          latest_turn_id: 'turn-1',
          latest_session_id: 'thread-1-turn-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          updated_at: '2026-03-21T09:00:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.000Z',
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: tempRoot,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.050Z',
          type: 'turn_context',
          payload: {
            turn_id: 'turn-1'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.100Z',
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 12,
                output_tokens: 8,
                total_tokens: 20
              }
            },
            rate_limits: {
              primary: {
                used_percent: 12.5,
                window_minutes: 300
              }
            }
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.150Z',
          type: 'event_msg',
          payload: {
            type: 'task_complete',
            turn_id: 'turn-1'
          }
        })
      ].join('\n'),
      'utf8'
    );
    const sessionTimestamp = new Date('2026-03-21T09:00:05.000Z');
    await utimes(sessionLogPath, sessionTimestamp, sessionTimestamp);

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(refreshed).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_event_at: '2026-03-21T09:00:00.150Z',
      current_turn_activity: {
        event: 'task_complete',
        recorded_at: '2026-03-21T09:00:00.150Z',
        source: 'session_log_hydration',
        turn_id: 'turn-1',
        session_id: 'thread-1-turn-1'
      },
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        }
      }
    });
  });

  it('backfills completed session telemetry when the task-complete floor timestamp is in payload', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          current_turn_started_at: '2026-03-21T09:00:00.000Z',
          updated_at: '2026-03-21T09:00:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.000Z',
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: tempRoot,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.050Z',
          type: 'turn_context',
          payload: {
            turn_id: 'turn-1'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.100Z',
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 12,
                output_tokens: 8,
                total_tokens: 20
              }
            },
            rate_limits: {
              primary: {
                used_percent: 12.5,
                window_minutes: 300
              }
            }
          }
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: {
            timestamp: '2026-03-21T09:00:00.150Z',
            type: 'task_complete',
            turn_id: 'turn-1'
          }
        })
      ].join('\n'),
      'utf8'
    );
    const sessionTimestamp = new Date('2026-03-21T09:00:05.000Z');
    await utimes(sessionLogPath, sessionTimestamp, sessionTimestamp);

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(refreshed).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_event_at: '2026-03-21T09:00:00.150Z',
      current_turn_activity: {
        event: 'task_complete',
        recorded_at: '2026-03-21T09:00:00.150Z',
        source: 'session_log_hydration',
        turn_id: 'turn-1',
        session_id: 'thread-1-turn-1'
      },
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        }
      }
    });
  });

  it('uses the turn context timestamp when a completed floor line has no timestamp', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          current_turn_started_at: '2026-03-21T09:00:00.100Z',
          updated_at: '2026-03-21T09:00:00.100Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.000Z',
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: tempRoot,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.100Z',
          type: 'turn_context',
          payload: {
            turn_id: 'turn-1'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.150Z',
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 12,
                output_tokens: 8,
                total_tokens: 20
              }
            }
          }
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: {
            type: 'task_complete',
            turn_id: 'turn-1'
          }
        })
      ].join('\n'),
      'utf8'
    );
    const sessionTimestamp = new Date('2026-03-21T09:00:05.000Z');
    await utimes(sessionLogPath, sessionTimestamp, sessionTimestamp);

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(refreshed).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_event_at: '2026-03-21T09:00:00.150Z',
      current_turn_activity: {
        event: 'token_count',
        recorded_at: '2026-03-21T09:00:00.150Z',
        source: 'session_log_hydration',
        turn_id: 'turn-1',
        session_id: 'thread-1-turn-1'
      },
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      }
    });
  });

  it('uses the line timestamp before payload fallback for completed-turn bootstrap floors', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          current_turn_started_at: '2026-03-21T09:00:00.100Z',
          updated_at: '2026-03-21T09:00:00.100Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.000Z',
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: tempRoot,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.050Z',
          type: 'turn_context',
          payload: {
            turn_id: 'turn-1'
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.120Z',
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 12,
                output_tokens: 8,
                total_tokens: 20
              }
            }
          }
        }),
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.150Z',
          type: 'event_msg',
          payload: {
            timestamp: '2026-03-21T09:00:00.050Z',
            type: 'task_complete',
            turn_id: 'turn-1'
          }
        })
      ].join('\n'),
      'utf8'
    );
    const sessionTimestamp = new Date('2026-03-21T09:00:05.000Z');
    await utimes(sessionLogPath, sessionTimestamp, sessionTimestamp);

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(refreshed).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_event_at: '2026-03-21T09:00:00.150Z',
      current_turn_activity: {
        event: 'task_complete',
        recorded_at: '2026-03-21T09:00:00.150Z',
        source: 'session_log_hydration',
        turn_id: 'turn-1',
        session_id: 'thread-1-turn-1'
      },
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      }
    });
  });

  it('does not replay completed session telemetry without a current-turn floor', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          updated_at: '2026-03-21T09:00:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const sessionLog = [
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.000Z',
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.050Z',
        type: 'turn_context',
        payload: {
          turn_id: 'turn-stale'
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.100Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 12,
              output_tokens: 8,
              total_tokens: 20
            }
          },
          rate_limits: {
            primary: {
              used_percent: 12.5,
              window_minutes: 300
            }
          }
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.150Z',
        type: 'event_msg',
        payload: {
          type: 'task_complete',
          turn_id: 'turn-stale'
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, sessionLog, 'utf8');
    const sessionTimestamp = new Date('2026-03-21T09:00:05.000Z');
    await utimes(sessionLogPath, sessionTimestamp, sessionTimestamp);

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const hydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(refreshed).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: null,
      latest_session_id: null,
      latest_session_id_source: null,
      last_event: 'item.completed',
      tokens: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null
      },
      rate_limits: null
    });
    expect(hydration).toMatchObject({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(sessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: true
    });
  });

  it('persists session-log hydration progress across repeated proof refreshes', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    await writeFile(proofPath, JSON.stringify(buildInProgressProof()), 'utf8');

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        type: 'turn_context',
        payload: {
          turn_id: 'turn-1'
        }
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 12,
              output_tokens: 8,
              total_tokens: 20
            }
          },
          rate_limits: {
            primary: {
              used_percent: 12.5,
              window_minutes: 300
            },
            secondary: {
              used_percent: 48,
              window_minutes: 10080
            }
          }
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, firstSessionLog, 'utf8');

    const firstRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const firstHydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(firstRefresh).toMatchObject({
      latest_turn_id: 'turn-1',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      }
    });
    expect(firstHydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(firstSessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });

    const secondSessionLog = [
      firstSessionLog,
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 18,
              output_tokens: 12,
              total_tokens: 30
            }
          },
          rate_limits: {
            primary: {
              used_percent: 18,
              window_minutes: 300
            },
            secondary: {
              used_percent: 50,
              window_minutes: 10080
            }
          }
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, secondSessionLog, 'utf8');

    const secondRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:20.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const secondHydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(secondRefresh).toMatchObject({
      latest_turn_id: 'turn-1',
      tokens: {
        input_tokens: 18,
        output_tokens: 12,
        total_tokens: 30
      },
      rate_limits: {
        primary: {
          used_percent: 18,
          window_minutes: 300
        },
        secondary: {
          used_percent: 50,
          window_minutes: 10080
        }
      }
    });
    expect(secondHydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(secondSessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
    expect(secondHydration.offset_bytes).toBeGreaterThan(firstHydration.offset_bytes);
  });

  it('seeds app-server delta buffers from proof when hydration resumes mid-message', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    await writeFile(proofPath, JSON.stringify(buildInProgressProof({ last_event: null })), 'utf8');

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.000Z',
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.050Z',
        type: 'turn_context',
        payload: { turn_id: 'turn-1' }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.100Z',
        type: 'notification',
        method: 'item/agentMessage/delta',
        params: {
          threadId: 'thread-1',
          turnId: 'turn-1',
          itemId: 'msg-1',
          delta: 'app-server '
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, firstSessionLog, 'utf8');

    const firstRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const firstHydration = await readPersistedSessionLogHydrationState(hydrationPath);
    expect(firstRefresh).toMatchObject({
      latest_turn_id: 'turn-1',
      last_message: 'app-server ',
      last_message_source: 'agent_message_delta',
      last_message_delta_key: 'thread-1:turn-1:msg-1'
    });

    const secondSessionLog = [
      firstSessionLog,
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.200Z',
        type: 'notification',
        method: 'item/agentMessage/delta',
        params: {
          threadId: 'thread-1',
          turnId: 'turn-1',
          itemId: 'msg-1',
          delta: 'turn complete'
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, secondSessionLog, 'utf8');

    const secondRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:20.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const secondHydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(secondRefresh).toMatchObject({
      latest_turn_id: 'turn-1',
      last_message: 'app-server turn complete',
      last_message_source: 'agent_message_delta',
      last_message_delta_key: 'thread-1:turn-1:msg-1'
    });
    expect(secondHydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(secondSessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
    expect(secondHydration.offset_bytes).toBeGreaterThan(firstHydration.offset_bytes);
  });

  it('does not seed app-server delta hydration across assistant message items', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(proofPath, JSON.stringify(buildInProgressProof({ last_event: null })), 'utf8');

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.000Z',
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.050Z',
        type: 'turn_context',
        payload: { turn_id: 'turn-1' }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.100Z',
        type: 'notification',
        method: 'item/agentMessage/delta',
        params: {
          threadId: 'thread-1',
          turnId: 'turn-1',
          itemId: 'msg-1',
          delta: 'first message'
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, firstSessionLog, 'utf8');

    await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    const secondSessionLog = [
      firstSessionLog,
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.200Z',
        type: 'notification',
        method: 'item/agentMessage/delta',
        params: {
          threadId: 'thread-1',
          turnId: 'turn-1',
          itemId: 'msg-2',
          delta: 'second message'
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, secondSessionLog, 'utf8');

    const secondRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:20.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(secondRefresh).toMatchObject({
      latest_turn_id: 'turn-1',
      last_message: 'second message',
      last_message_source: 'agent_message_delta',
      last_message_delta_key: 'thread-1:turn-1:msg-2'
    });
  });

  it('persists canonical current-turn activity from session-log hydration across refreshes', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(proofPath, JSON.stringify(buildInProgressProof()), 'utf8');

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.000Z',
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.050Z',
        type: 'turn_context',
        payload: {
          turn_id: 'turn-1'
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.200Z',
        type: 'event_msg',
        payload: {
          type: 'agent_message',
          message: 'Investigating provider-worker EVENT provenance.'
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, firstSessionLog, 'utf8');

    const firstRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(firstRefresh).toMatchObject({
      latest_turn_id: 'turn-1',
      current_turn_activity: {
        event: 'agent_message',
        message_or_payload: 'Investigating provider-worker EVENT provenance.',
        recorded_at: '2026-03-21T09:00:00.200Z',
        source: 'session_log_hydration',
        turn_id: 'turn-1',
        session_id: 'thread-1-turn-1'
      }
    });

    const secondSessionLog = [
      firstSessionLog,
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.500Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 12,
              output_tokens: 8,
              total_tokens: 20
            }
          }
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, secondSessionLog, 'utf8');

    const secondRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:20.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(secondRefresh).toMatchObject({
      current_turn_activity: {
        event: 'agent_message',
        message_or_payload: 'Investigating provider-worker EVENT provenance.',
        recorded_at: '2026-03-21T09:00:00.200Z',
        source: 'session_log_hydration',
        turn_id: 'turn-1',
        session_id: 'thread-1-turn-1'
      },
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      }
    });
  });

  it('does not emit refresh progress events when only hydration metadata changes', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          last_message: 'Investigating provider-worker EVENT provenance.',
          last_event_at: '2026-03-21T09:00:00.100Z',
          progress: {
            phase: 'turn_running',
            kind: 'worker',
            status: 'progressing',
            summary: 'Investigating provider-worker EVENT provenance.',
            summary_recorded_at: null,
            message_recorded_at: null,
            source_updated_at: '2026-03-21T09:00:00.100Z',
            selected_event: 'item.completed',
            event_source: 'legacy_proof_last_message',
            event_candidates: [{
              source: 'legacy_proof_last_message',
              event: 'item.completed',
              summary: 'Investigating provider-worker EVENT provenance.',
              message_recorded_at: null,
              source_updated_at: '2026-03-21T09:00:00.100Z',
              derived: false,
              accepted: true,
              rejection_reason: null
            }],
            last_semantic_progress_at: '2026-03-21T09:00:00.100Z',
            stall_classification: 'progressing',
            stall_reason: null,
            recovery_recommendation: 'continue_waiting'
          }
        }),
        null,
        2
      ),
      'utf8'
    );

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({ timestamp: '2026-03-21T09:00:00.000Z', type: 'session_meta', payload: { id: 'thread-1', cwd: tempRoot, initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title' } }),
        JSON.stringify({ timestamp: '2026-03-21T09:00:00.050Z', type: 'turn_context', payload: { turn_id: 'turn-1' } }),
        JSON.stringify({ timestamp: '2026-03-21T09:00:00.200Z', type: 'event_msg', payload: { type: 'agent_message', message: 'Investigating provider-worker EVENT provenance.' } })
      ].join('\n'),
      'utf8'
    );

    const emitProgressEvent = vi.fn();
    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      undefined,
      {
        CODEX_HOME: tempRoot!
      },
      {
        emitProgressEvent
      }
    );

    expect(refreshed?.progress).toMatchObject({
      summary: 'Investigating provider-worker EVENT provenance.',
      selected_event: 'agent_message',
      event_source: 'canonical_session_log_hydration'
    });
    expect(emitProgressEvent).not.toHaveBeenCalled();
  });

  it('treats a semantic transition back to null progress as operator-visible after prior progress', () => {
    const progressingSignature = buildProviderLinearWorkerProgressSemanticSignature({
      phase: 'turn_running',
      kind: 'worker',
      status: 'progressing',
      summary: 'Investigating provider-worker EVENT provenance.',
      stall_classification: 'progressing',
      stall_reason: null,
      recovery_recommendation: 'continue_waiting'
    });

    expect(progressingSignature).not.toBeNull();
    expect(shouldEmitProviderLinearWorkerProgressSignatureTransition(undefined, null)).toBe(false);
    expect(
      shouldEmitProviderLinearWorkerProgressSignatureTransition(undefined, progressingSignature)
    ).toBe(true);
    expect(
      shouldEmitProviderLinearWorkerProgressSignatureTransition(progressingSignature, null)
    ).toBe(true);
    expect(shouldEmitProviderLinearWorkerProgressSignatureTransition(null, null)).toBe(false);
  });

  it('clears stale proof current-turn activity when hydration only swaps to a new thread', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          thread_id: 'thread-1',
          latest_turn_id: 'turn-1',
          latest_session_id: 'thread-1-turn-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          tokens: {
            input_tokens: 12,
            output_tokens: 8,
            total_tokens: 20
          },
          rate_limits: {
            primary: {
              used_percent: 12.5,
              window_minutes: 300
            }
          },
          last_event: 'agent_message',
          last_message: 'Investigating provider-worker EVENT provenance.',
          last_event_at: '2026-03-21T09:00:00.200Z',
          current_turn_activity: {
            event: 'agent_message',
            message_or_payload: 'Investigating provider-worker EVENT provenance.',
            recorded_at: '2026-03-21T09:00:00.200Z',
            source: 'session_log_hydration',
            turn_id: 'turn-1',
            session_id: 'thread-1-turn-1'
          }
        })
      ),
      'utf8'
    );

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({
          timestamp: '2026-03-21T09:00:01.000Z',
          type: 'session_meta',
          payload: {
            id: 'thread-2',
            cwd: tempRoot,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title',
            source: 'exec'
          }
        })
      ].join('\n'),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(refreshed).toMatchObject({
      thread_id: 'thread-2',
      latest_turn_id: null,
      latest_session_id: null,
      last_event: null,
      last_message: null,
      last_event_at: null,
      current_turn_activity: null,
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        }
      }
    });
  });

  it('preserves unfinished session-log tails across refreshes until the line completes', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          tokens: {
            input_tokens: 12,
            output_tokens: 8,
            total_tokens: 20
          },
          rate_limits: {
            primary: {
              used_percent: 12.5,
              window_minutes: 300
            },
            secondary: {
              used_percent: 48,
              window_minutes: 10080
            }
          }
        })
      ),
      'utf8'
    );

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        type: 'turn_context',
        payload: {
          turn_id: 'turn-1'
        }
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 12,
              output_tokens: 8,
              total_tokens: 20
            }
          },
          rate_limits: {
            primary: {
              used_percent: 12.5,
              window_minutes: 300
            },
            secondary: {
              used_percent: 48,
              window_minutes: 10080
            }
          }
        }
      }),
      '{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":18,"output_tokens":12,"total_tokens":30}},"rate_limits":{"primary":{"used_percent":18,"window_minutes":300},"secondary":{"used_percent":50'
    ].join('\n');
    await writeFile(sessionLogPath, firstSessionLog, 'utf8');

    const firstRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const firstHydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(firstRefresh).toMatchObject({
      latest_turn_id: 'turn-1',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      }
    });
    expect(firstHydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(firstSessionLog, 'utf8'),
      trailing_text:
        '{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":18,"output_tokens":12,"total_tokens":30}},"rate_limits":{"primary":{"used_percent":18,"window_minutes":300},"secondary":{"used_percent":50',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });

    const secondSessionLog = `${firstSessionLog},"window_minutes":10080}}}}\n`;
    await writeFile(sessionLogPath, secondSessionLog, 'utf8');

    const secondRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:20.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const secondHydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(secondRefresh).toMatchObject({
      latest_turn_id: 'turn-1',
      tokens: {
        input_tokens: 18,
        output_tokens: 12,
        total_tokens: 30
      },
      rate_limits: {
        primary: {
          used_percent: 18,
          window_minutes: 300
        },
        secondary: {
          used_percent: 50,
          window_minutes: 10080
        }
      }
    });
    expect(secondHydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(secondSessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
  });

  it('does not replay stale hydration cursors onto newer proofs', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-1' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 } } }
      })
    ].join('\n');
    const sessionLog = [
      firstSessionLog,
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-2' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: { total_token_usage: { input_tokens: 18, output_tokens: 12, total_tokens: 30 } },
          rate_limits: {
            primary: { used_percent: 18, window_minutes: 300 },
            secondary: { used_percent: 50, window_minutes: 10080 }
          }
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, sessionLog, 'utf8');
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
          rate_limits: null,
          updated_at: '2026-03-21T09:00:30.000Z'
        })
      ),
      'utf8'
    );
    await writeFile(
      hydrationPath,
      JSON.stringify({
        path: sessionLogPath,
        offset_bytes: Buffer.byteLength(firstSessionLog, 'utf8'),
        trailing_text: '',
        bootstrap_pending: false,
        proof_signature: 'stale-proof-signature'
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(runDir, null, () => '2026-03-21T09:00:40.000Z', undefined, {
      CODEX_HOME: tempRoot!
    });
    const hydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(refreshed).toMatchObject({
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
      rate_limits: {
        primary: { used_percent: 18, window_minutes: 300 },
        secondary: { used_percent: 50, window_minutes: 10080 }
      }
    });
    expect(hydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(sessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
    expect(typeof hydration?.proof_signature).toBe('string');
    expect(hydration?.proof_signature).not.toBe('');
    expect(hydration?.proof_signature).not.toBe('stale-proof-signature');
  });

  it('does not retain discarded newer session-log ids after proof-floor restoration', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-2.jsonl');
    const sessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-2',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-2' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 4,
              output_tokens: 3,
              total_tokens: 7
            }
          }
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, sessionLog, 'utf8');
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          thread_id: 'thread-1',
          latest_turn_id: 'turn-1',
          latest_session_id: 'thread-1-turn-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          session_log_thread_id: 'thread-1',
          session_log_turn_id: 'turn-1',
          session_log_session_id: 'thread-1-turn-1',
          tokens: {
            input_tokens: 12,
            output_tokens: 8,
            total_tokens: 20
          },
          current_turn_activity: {
            event: 'task_complete',
            message_or_payload: null,
            recorded_at: '2026-03-21T09:00:01.000Z',
            source: 'session_log_hydration',
            turn_id: 'turn-1',
            session_id: 'thread-1-turn-1'
          },
          runtime: {
            requested_mode: 'appserver',
            selected_mode: 'appserver',
            provider: 'AppServerRuntimeProvider',
            runtime_session_id: 'appserver-run-child',
            fallback: {
              occurred: false,
              code: null,
              reason: null,
              from_mode: null,
              to_mode: null,
              checked_at: '2026-03-21T09:00:00.000Z'
            }
          },
          workspace_path: tempRoot
        })
      ),
      'utf8'
    );
    await writeFile(
      hydrationPath,
      JSON.stringify({
        path: sessionLogPath,
        offset_bytes: 0,
        trailing_text: '',
        bootstrap_pending: false,
        proof_signature: 'stale-proof-signature'
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:40.000Z',
      undefined,
      { CODEX_HOME: tempRoot! }
    );

    expect(refreshed).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      session_log_thread_id: 'thread-1',
      session_log_turn_id: 'turn-1',
      session_log_session_id: 'thread-1-turn-1',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      }
    });
    expect(refreshed?.session_log_thread_id).not.toBe('thread-2');
    expect(refreshed?.session_log_turn_id).not.toBe('turn-2');
  });

  it('rebootstraps stale cursor parsing at the next turn boundary for bootstrap proofs', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const sessionPrefix = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-1' } })
    ].join('\n');
    const stalePreviousTurnTelemetry = JSON.stringify({
      type: 'event_msg',
      payload: {
        type: 'token_count',
        info: { total_token_usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 } },
        rate_limits: {
          primary: { used_percent: 12.5, window_minutes: 300 },
          secondary: { used_percent: 48, window_minutes: 10080 }
        }
      }
    });
    const nextTurnContext = JSON.stringify({
      type: 'turn_context',
      payload: { turn_id: 'turn-2' }
    });
    const sessionLog = `${sessionPrefix}\n${stalePreviousTurnTelemetry}\n${nextTurnContext}`;
    await writeFile(sessionLogPath, sessionLog, 'utf8');
    await writeFile(proofPath, JSON.stringify(buildInProgressProof()), 'utf8');
    await writeFile(
      hydrationPath,
      JSON.stringify({
        path: sessionLogPath,
        offset_bytes: Buffer.byteLength(`${sessionPrefix}\n`, 'utf8'),
        trailing_text: '',
        bootstrap_pending: false,
        proof_signature: 'stale-proof-signature'
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(runDir, null, () => '2026-03-21T09:00:40.000Z', undefined, {
      CODEX_HOME: tempRoot!
    });
    const hydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(refreshed).toMatchObject({
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      last_event: null,
      last_message: null,
      last_event_at: null,
      current_turn_activity: null,
      tokens: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null
      },
      rate_limits: null
    });
    expect(hydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(sessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
    expect(typeof hydration?.proof_signature).toBe('string');
    expect(hydration?.proof_signature).not.toBe('');
    expect(hydration?.proof_signature).not.toBe('stale-proof-signature');
  });

  it('replaces previous-turn activity when hydration advances into a newer turn with fresh telemetry', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-1' } })
    ].join('\n');
    const secondSessionLog = [
      firstSessionLog,
      JSON.stringify({
        timestamp: '2026-03-21T09:01:00.000Z',
        type: 'turn_context',
        payload: { turn_id: 'turn-2' }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:01:00.200Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: { total_token_usage: { input_tokens: 19, output_tokens: 13, total_tokens: 32 } }
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, secondSessionLog, 'utf8');
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          latest_turn_id: 'turn-1',
          latest_session_id: 'thread-1-turn-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          last_event: 'agent_message',
          last_message: 'Turn 1 still running',
          last_event_at: '2026-03-21T09:00:00.200Z',
          current_turn_activity: {
            event: 'agent_message',
            message_or_payload: 'Turn 1 still running',
            recorded_at: '2026-03-21T09:00:00.200Z',
            source: 'session_log_hydration',
            turn_id: 'turn-1',
            session_id: 'thread-1-turn-1'
          },
          tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
          updated_at: '2026-03-21T09:00:30.000Z'
        })
      ),
      'utf8'
    );
    await writeFile(
      hydrationPath,
      JSON.stringify({
        path: sessionLogPath,
        offset_bytes: Buffer.byteLength(firstSessionLog, 'utf8') + 1,
        trailing_text: '',
        bootstrap_pending: false,
        proof_signature: 'stale-proof-signature'
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:02:00.000Z',
      undefined,
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(refreshed).toMatchObject({
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      last_event: 'token_count',
      last_message: null,
      last_event_at: '2026-03-21T09:01:00.200Z',
      tokens: { input_tokens: 19, output_tokens: 13, total_tokens: 32 },
      current_turn_activity: {
        event: 'token_count',
        message_or_payload: null,
        recorded_at: '2026-03-21T09:01:00.200Z',
        source: 'session_log_hydration',
        turn_id: 'turn-2',
        session_id: 'thread-1-turn-2'
      }
    });
  });

  it('accepts newer rate-limit updates when a stale cursor does not advance token totals', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-2' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: { total_token_usage: { input_tokens: 18, output_tokens: 12, total_tokens: 30 } },
          rate_limits: {
            primary: { used_percent: 18, window_minutes: 300 },
            secondary: { used_percent: 50, window_minutes: 10080 }
          }
        }
      })
    ].join('\n');
    const refreshedRateLimitOnlyEvent = JSON.stringify({
      type: 'notification',
      method: 'account/rateLimits/updated',
      params: {
        msg: {
          payload: {
            info: {
              rate_limits: {
                primary: { used_percent: 22, window_minutes: 300 },
                secondary: { used_percent: 54, window_minutes: 10080 }
              }
            }
          }
        }
      },
      timestamp: '2026-03-21T09:00:05.000Z'
    });
    const sessionLog = `${firstSessionLog}\n${refreshedRateLimitOnlyEvent}`;
    await writeFile(sessionLogPath, sessionLog, 'utf8');
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
          rate_limits: {
            primary: { used_percent: 18, window_minutes: 300 },
            secondary: { used_percent: 50, window_minutes: 10080 }
          },
          updated_at: '2026-03-21T09:00:30.000Z'
        })
      ),
      'utf8'
    );
    await writeFile(
      hydrationPath,
      JSON.stringify({
        path: sessionLogPath,
        offset_bytes: Buffer.byteLength(firstSessionLog, 'utf8'),
        trailing_text: '',
        bootstrap_pending: false,
        proof_signature: 'stale-proof-signature'
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(runDir, null, () => '2026-03-21T09:00:40.000Z', undefined, {
      CODEX_HOME: tempRoot!
    });
    const hydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(refreshed).toMatchObject({
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
      rate_limits: {
        primary: { used_percent: 22, window_minutes: 300 },
        secondary: { used_percent: 54, window_minutes: 10080 }
      }
    });
    expect(hydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(sessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
    expect(typeof hydration?.proof_signature).toBe('string');
    expect(hydration?.proof_signature).not.toBe('');
    expect(hydration?.proof_signature).not.toBe('stale-proof-signature');
  });

  it('preserves buffered partial tails when proof signatures diverge at EOF', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-1' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: { total_token_usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 } }
        }
      }),
      '{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":18,"output_tokens":12,"total_tokens":30}},"rate_limits":{"primary":{"used_percent":18,"window_minutes":300},"secondary":{"used_percent":50'
    ].join('\n');
    await writeFile(sessionLogPath, firstSessionLog, 'utf8');
    await writeFile(proofPath, JSON.stringify(buildInProgressProof()), 'utf8');

    await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    const firstHydration = await readPersistedSessionLogHydrationState(hydrationPath);
    expect(firstHydration?.trailing_text).toContain('"window_minutes":300');
    const staleProofSignature = firstHydration?.proof_signature;
    expect(typeof staleProofSignature).toBe('string');
    expect(staleProofSignature).not.toBe('');

    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          latest_turn_id: 'turn-1',
          latest_session_id: 'thread-1-turn-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
          rate_limits: null,
          updated_at: '2026-03-21T09:00:30.000Z'
        })
      ),
      'utf8'
    );

    const secondRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:40.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const secondHydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(secondRefresh.tokens).toEqual({
      input_tokens: 18,
      output_tokens: 12,
      total_tokens: 30
    });
    expect(secondHydration).toMatchObject({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(firstSessionLog, 'utf8'),
      trailing_text: firstHydration?.trailing_text,
      bootstrap_pending: true,
      proof_signature: expect.any(String)
    });
    expect(typeof secondHydration?.proof_signature).toBe('string');
    expect(secondHydration?.proof_signature).not.toBe('');
    expect(secondHydration?.proof_signature).not.toBe(staleProofSignature);

    const secondSessionLog = `${firstSessionLog},"window_minutes":10080}}}}\n`;
    await writeFile(sessionLogPath, secondSessionLog, 'utf8');

    const thirdRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:50.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const thirdHydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(thirdRefresh).toMatchObject({
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
      rate_limits: {
        primary: { used_percent: 18, window_minutes: 300 },
        secondary: { used_percent: 50, window_minutes: 10080 }
      }
    });
    expect(thirdHydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(secondSessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
    expect(typeof thirdHydration?.proof_signature).toBe('string');
    expect(thirdHydration?.proof_signature).not.toBe('');
    expect(thirdHydration?.proof_signature).not.toBe(staleProofSignature);
  });

  it('does not rewind turn identity when stale cursor bytes only match the proof token floor', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-1' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 18, output_tokens: 12, total_tokens: 30 } } }
      })
    ].join('\n');
    await writeFile(sessionLogPath, firstSessionLog, 'utf8');
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
          rate_limits: null,
          updated_at: '2026-03-21T09:00:30.000Z'
        })
      ),
      'utf8'
    );
    await writeFile(
      hydrationPath,
      JSON.stringify({
        path: sessionLogPath,
        offset_bytes: Buffer.byteLength(firstSessionLog.split('\n')[0] ?? '', 'utf8') + 1,
        trailing_text: '',
        bootstrap_pending: false,
        proof_signature: 'stale-proof-signature'
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(runDir, null, () => '2026-03-21T09:00:40.000Z', undefined, {
      CODEX_HOME: tempRoot!
    });
    const hydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(refreshed).toMatchObject({
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 }
    });
    expect(hydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(firstSessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
    expect(typeof hydration?.proof_signature).toBe('string');
    expect(hydration?.proof_signature).not.toBe('');
    expect(hydration?.proof_signature).not.toBe('stale-proof-signature');
  });

  it('keeps current-turn activity on the preserved proof floor when stale cursor refresh sees a newer turn without token advancement', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-1' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: { total_token_usage: { input_tokens: 18, output_tokens: 12, total_tokens: 30 } }
        }
      })
    ].join('\n');
    const secondSessionLog = [
      firstSessionLog,
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-2' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'agent_message',
          message: 'Turn 2 started'
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, secondSessionLog, 'utf8');
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          latest_turn_id: 'turn-1',
          latest_session_id: 'thread-1-turn-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          last_event: 'agent_message',
          last_message: 'Turn 1 still running',
          last_event_at: '2026-03-21T09:00:00.200Z',
          current_turn_activity: {
            event: 'agent_message',
            message_or_payload: 'Turn 1 still running',
            recorded_at: '2026-03-21T09:00:00.200Z',
            source: 'session_log_hydration',
            turn_id: 'turn-1',
            session_id: 'thread-1-turn-1'
          },
          tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
          updated_at: '2026-03-21T09:00:30.000Z'
        })
      ),
      'utf8'
    );
    await writeFile(
      hydrationPath,
      JSON.stringify({
        path: sessionLogPath,
        offset_bytes: Buffer.byteLength(firstSessionLog, 'utf8') + 1,
        trailing_text: '',
        bootstrap_pending: false,
        proof_signature: 'stale-proof-signature'
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:02:00.000Z',
      undefined,
      {
        CODEX_HOME: tempRoot!
      }
    );

    expect(refreshed).toMatchObject({
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      last_event: 'agent_message',
      last_message: 'Turn 1 still running',
      last_event_at: '2026-03-21T09:00:00.200Z',
      tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
      current_turn_activity: {
        event: 'agent_message',
        message_or_payload: 'Turn 1 still running',
        recorded_at: '2026-03-21T09:00:00.200Z',
        source: 'session_log_hydration',
        turn_id: 'turn-1',
        session_id: 'thread-1-turn-1'
      }
    });
  });

  it('does not preserve stale proof floors when a mismatched session log truncates', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const staleSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-1' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: { total_token_usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 } }
        }
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: { total_token_usage: { input_tokens: 18, output_tokens: 12, total_tokens: 30 } },
          rate_limits: {
            primary: { used_percent: 18, window_minutes: 300 },
            secondary: { used_percent: 50, window_minutes: 10080 }
          }
        }
      })
    ].join('\n');
    const truncatedSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({ type: 'turn_context', payload: { turn_id: 'turn-3' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: { total_token_usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 } },
          rate_limits: {
            primary: { used_percent: 5, window_minutes: 300 },
            secondary: { used_percent: 10, window_minutes: 10080 }
          }
        }
      })
    ].join('\n');
    expect(Buffer.byteLength(truncatedSessionLog, 'utf8')).toBeLessThan(Buffer.byteLength(staleSessionLog, 'utf8'));
    await writeFile(sessionLogPath, truncatedSessionLog, 'utf8');
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          tokens: { input_tokens: 18, output_tokens: 12, total_tokens: 30 },
          rate_limits: {
            primary: { used_percent: 18, window_minutes: 300 },
            secondary: { used_percent: 50, window_minutes: 10080 }
          },
          updated_at: '2026-03-21T09:00:30.000Z'
        })
      ),
      'utf8'
    );
    await writeFile(
      hydrationPath,
      JSON.stringify({
        path: sessionLogPath,
        offset_bytes: Buffer.byteLength(staleSessionLog, 'utf8'),
        trailing_text: '',
        bootstrap_pending: false,
        proof_signature: 'stale-proof-signature'
      }),
      'utf8'
    );

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(runDir, null, () => '2026-03-21T09:00:40.000Z', undefined, {
      CODEX_HOME: tempRoot!
    });
    const hydration = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(refreshed).toMatchObject({
      latest_turn_id: 'turn-3',
      latest_session_id: 'thread-1-turn-3',
      tokens: { input_tokens: 3, output_tokens: 2, total_tokens: 5 },
      rate_limits: {
        primary: { used_percent: 5, window_minutes: 300 },
        secondary: { used_percent: 10, window_minutes: 10080 }
      }
    });
    expect(hydration).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(truncatedSessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
    expect(typeof hydration?.proof_signature).toBe('string');
    expect(hydration?.proof_signature).not.toBe('');
    expect(hydration?.proof_signature).not.toBe('stale-proof-signature');
  });

  it('falls back to a full reread when a persisted session log truncates', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    await writeFile(proofPath, JSON.stringify(buildInProgressProof()), 'utf8');

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        type: 'turn_context',
        payload: {
          turn_id: 'turn-1'
        }
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 12,
              output_tokens: 8,
              total_tokens: 20
            }
          }
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, firstSessionLog, 'utf8');

    await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    const truncatedSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        type: 'turn_context',
        payload: {
          turn_id: 'turn-2'
        }
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 3,
              output_tokens: 2,
              total_tokens: 5
            }
          }
        }
      })
    ].join('\n');
    await writeFile(sessionLogPath, truncatedSessionLog, 'utf8');

    const refreshedAfterTruncation = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:20.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const hydrationAfterTruncation = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(refreshedAfterTruncation).toMatchObject({
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      tokens: {
        input_tokens: 3,
        output_tokens: 2,
        total_tokens: 5
      }
    });
    expect(hydrationAfterTruncation).toEqual({
      path: sessionLogPath,
      offset_bytes: Buffer.byteLength(truncatedSessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
  });

  it('falls back to a fresh reread when session log discovery rotates to a newer file', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const hydrationPath = buildSessionLogHydrationPath(runDir);
    await writeFile(proofPath, JSON.stringify(buildInProgressProof()), 'utf8');

    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    await mkdir(sessionDir, { recursive: true });
    const firstSessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-1.jsonl');
    const rotatedSessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-05-00-thread-1.jsonl');
    const firstSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        type: 'turn_context',
        payload: {
          turn_id: 'turn-1'
        }
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 12,
              output_tokens: 8,
              total_tokens: 20
            }
          }
        }
      })
    ].join('\n');
    await writeFile(firstSessionLogPath, firstSessionLog, 'utf8');
    const firstSessionMtime = new Date('2026-03-21T09:00:05.000Z');
    await utimes(firstSessionLogPath, firstSessionMtime, firstSessionMtime);

    await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:00:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );

    const rotatedSessionLog = [
      JSON.stringify({
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        type: 'turn_context',
        payload: {
          turn_id: 'turn-2'
        }
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 4,
              output_tokens: 3,
              total_tokens: 7
            }
          }
        }
      })
    ].join('\n');
    await writeFile(rotatedSessionLogPath, rotatedSessionLog, 'utf8');
    const rotatedSessionMtime = new Date('2026-03-21T09:05:05.000Z');
    await utimes(rotatedSessionLogPath, rotatedSessionMtime, rotatedSessionMtime);

    const refreshedAfterRotation = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2026-03-21T09:05:10.000Z',
      async (path, proof) => await writeFile(path, `${JSON.stringify(proof, null, 2)}\n`, 'utf8'),
      {
        CODEX_HOME: tempRoot!
      }
    );
    const hydrationAfterRotation = await readPersistedSessionLogHydrationState(hydrationPath);

    expect(refreshedAfterRotation).toMatchObject({
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      tokens: {
        input_tokens: 4,
        output_tokens: 3,
        total_tokens: 7
      }
    });
    expect(hydrationAfterRotation).toEqual({
      path: rotatedSessionLogPath,
      offset_bytes: Buffer.byteLength(rotatedSessionLog, 'utf8'),
      trailing_text: '',
      bootstrap_pending: false,
      proof_signature: expect.any(String)
    });
  });

  it('recovers a stale provider proof lock before refreshing the proof snapshot', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const lockPath = join(runDir, `${PROVIDER_LINEAR_WORKER_PROOF_FILENAME}.lock`);
    await writeFile(proofPath, JSON.stringify(buildInProgressProof()), 'utf8');
    await writeFile(lockPath, 'orphan-owner', 'utf8');
    const refreshNow = new Date('2026-03-21T09:10:00.000Z');
    const staleMtime = new Date(refreshNow.getTime() - 10 * 60 * 1000);
    await utimes(lockPath, staleMtime, staleMtime);

    const refreshed = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => refreshNow.toISOString(),
      undefined,
      {},
      { skipSessionLogHydration: true }
    );

    expect(refreshed).toMatchObject({
      issue_id: 'lin-issue-1',
      owner_status: 'in_progress'
    });
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('forces standalone review execution env and seeds authoritative notes inside non-interactive provider worker turns', async () => {
    const { manifestPath } = await createManifestRoot();
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(createTrackedIssue())
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Done',
          state_type: 'completed'
        })
      );
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        FORCE_CODEX_REVIEW: '',
        NOTES: '',
        CODEX_INTERACTIVE: '1'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    expect(execRunner.mock.calls[0]?.[0].env.CODEX_REVIEW_NON_INTERACTIVE).toBe('1');
    expect(execRunner.mock.calls[0]?.[0].env.FORCE_CODEX_REVIEW).toBe('1');
    expect(execRunner.mock.calls[0]?.[0].env.CODEX_REVIEW_AUTHORITATIVE_GATE).toBe('1');
    expect(execRunner.mock.calls[0]?.[0].env.NOTES).toContain(
      'provider-linear-worker handoff review for CO-2'
    );
    expect(execRunner.mock.calls[0]?.[0].env.NOTES).not.toContain('auto-generated NOTES fallback');
    expect(execRunner.mock.calls[0]?.[0].env.CODEX_NON_INTERACTIVE).toBe('1');
    expect(execRunner.mock.calls[0]?.[0].env.CODEX_NO_INTERACTIVE).toBe('1');
    expect(execRunner.mock.calls[0]?.[0].env.CODEX_INTERACTIVE).toBe('0');
  });

  it('uses app-server JSONL as the authoritative provider-worker control plane when appserver runtime is selected', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-app.jsonl');
    const authoritativeSessionLogLines = [
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.000Z',
        type: 'session_meta',
        payload: {
          id: 'thread-app',
          cwd: tempRoot,
          initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.050Z',
        type: 'turn_context',
        payload: { turn_id: 'turn-app-1' }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.060Z',
        type: 'notification',
        method: 'item/agentMessage/delta',
        params: {
          threadId: 'thread-app',
          turnId: 'turn-app-1',
          itemId: 'msg-authoritative',
          delta: 'app-server '
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.070Z',
        type: 'notification',
        method: 'item/agentMessage/delta',
        params: {
          threadId: 'thread-app',
          turnId: 'turn-app-1',
          itemId: 'msg-authoritative',
          delta: 'turn complete'
        }
      }),
      JSON.stringify({
        timestamp: '2026-03-21T09:00:00.080Z',
        type: 'notification',
        method: 'turn/completed',
        params: {
          threadId: 'thread-app',
          turn: { id: 'turn-app-1', status: 'completed' }
        }
      })
    ];
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(createTrackedIssue())
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Done',
          state_type: 'completed'
        })
      );
    const execRunner = vi.fn();
    const appServerTurnRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      await mkdir(sessionDir, { recursive: true });
      await writeFile(sessionLogPath, authoritativeSessionLogLines.join('\n'), 'utf8');
      request.onStdoutChunk?.(
        [
          '{"type":"thread.started","thread_id":"thread-app"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-app-1"}}',
          ''
        ].join('\n')
      );
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-app"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-app-1"}}',
          '{"type":"notification","method":"item/agentMessage/delta","params":{"threadId":"thread-app","turnId":"turn-app-1","itemId":"msg-stdout","delta":"stdout "}}',
          '{"type":"notification","method":"item/agentMessage/delta","params":{"threadId":"thread-app","turnId":"turn-app-1","itemId":"msg-stdout","delta":"must not win"}}',
          '{"type":"notification","method":"item/completed","params":{"threadId":"thread-app","turnId":"turn-app-1","item":{"type":"message"}}}',
          '{"type":"notification","method":"turn/completed","params":{"threadId":"thread-app","turn":{"id":"turn-app-1","status":"completed"}}}'
        ].join('\n'),
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_HOME: tempRoot ?? undefined
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createAppServerRuntimeContext()),
        execRunner,
        appServerTurnRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).not.toHaveBeenCalled();
    expect(appServerTurnRunner).toHaveBeenCalledTimes(1);
    expect(appServerTurnRunner.mock.calls[0]?.[0]).toMatchObject({
      args: ['app-server'],
      cwd: tempRoot,
      resumeThreadId: null
    });
    expect(String(appServerTurnRunner.mock.calls[0]?.[0].prompt)).toContain(
      'full first-turn task prompt'
    );
    expect(proof).toMatchObject({
      thread_id: 'thread-app',
      latest_turn_id: 'turn-app-1',
      last_message: 'app-server turn complete',
      last_message_source: 'agent_message_delta',
      owner_status: 'succeeded',
      end_reason: 'issue_inactive',
      worker_control: {
        authority: 'appserver',
        transport: 'app-server-jsonl',
        normal_start_method: 'thread/start + turn/start',
        resume_method: 'thread/resume + turn/start',
        drain_method: 'turn/completed notification',
        restart_method: 'thread/resume from recorded thread_id',
        state_read_model: 'provider-linear-worker-proof',
        break_glass: false
      },
      appserver_supervision: {
        supervision_command: 'appserver_thread_start'
      }
    });
    await writeFile(
      sessionLogPath,
      [
        ...authoritativeSessionLogLines,
        JSON.stringify({
          timestamp: '2026-03-21T09:00:00.100Z',
          type: 'notification',
          method: 'thread/tokenUsage/updated',
          params: {
            tokenUsage: {
              total: { inputTokens: 18, outputTokens: 6, totalTokens: 24 }
            }
          }
        })
      ].join('\n'),
      'utf8'
    );
    const refreshedProof = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME),
      () => '2026-03-21T09:00:02.000Z',
      undefined,
      {
        CODEX_HOME: tempRoot ?? undefined
      }
    );
    expect(refreshedProof).toMatchObject({
      last_event: 'thread/tokenUsage/updated',
      last_message: 'app-server turn complete',
      last_message_source: 'agent_message_delta'
    });
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    expect(manifest).toMatchObject({
      runtime_mode_requested: 'appserver',
      runtime_mode: 'appserver',
      runtime_provider: 'AppServerRuntimeProvider',
      provider_worker_control: {
        authority: 'appserver',
        transport: 'app-server-jsonl',
        state_read_model: 'provider-linear-worker-proof'
      }
    });
  });

  it('deduplicates app-server streamed deltas seen from stdout and session-log hydration', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const sessionDir = join(tempRoot!, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(sessionDir, 'rollout-2026-03-21T09-00-00-thread-app.jsonl');
    const execRunner = vi.fn();
    const appServerTurnRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      const liveLines = [
        '{"type":"thread.started","thread_id":"thread-app"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-app-1"}}',
        '{"type":"notification","method":"item/agentMessage/delta","params":{"threadId":"thread-app","turnId":"turn-app-1","itemId":"msg-1","delta":"app-server "}}',
        '{"type":"notification","method":"item/agentMessage/delta","params":{"threadId":"thread-app","turnId":"turn-app-1","itemId":"msg-1","delta":"turn complete"}}'
      ];
      for (const line of liveLines) {
        request.onStdoutChunk?.(`${line}\n`);
      }
      await mkdir(sessionDir, { recursive: true });
      await writeFile(
        sessionLogPath,
        [
          JSON.stringify({
            timestamp: '2026-03-21T09:00:00.000Z',
            type: 'session_meta',
            payload: {
              id: 'thread-app',
              cwd: tempRoot,
              initial_prompt: 'You are the provider worker for Linear issue CO-2: Example title'
            }
          }),
          JSON.stringify({
            timestamp: '2026-03-21T09:00:00.050Z',
            type: 'turn_context',
            payload: { turn_id: 'turn-app-1' }
          }),
          JSON.stringify({
            timestamp: '2026-03-21T09:00:00.100Z',
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
              threadId: 'thread-app',
              turnId: 'turn-app-1',
              itemId: 'msg-1',
              delta: 'app-server '
            }
          }),
          JSON.stringify({
            timestamp: '2026-03-21T09:00:00.200Z',
            type: 'notification',
            method: 'item/agentMessage/delta',
            params: {
              threadId: 'thread-app',
              turnId: 'turn-app-1',
              itemId: 'msg-1',
              delta: 'turn complete'
            }
          })
        ].join('\n'),
        'utf8'
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      throw new Error('app-server failed after duplicate stream');
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
          CODEX_HOME: tempRoot ?? undefined
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createAppServerRuntimeContext()),
          execRunner,
          appServerTurnRunner,
          sleep: async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
          },
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('app-server failed after duplicate stream');

    expect(execRunner).not.toHaveBeenCalled();
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-app',
      latest_turn_id: 'turn-app-1',
      last_message: 'app-server turn complete',
      last_message_source: 'agent_message_delta',
      last_message_delta_key: 'thread-app:turn-app-1:msg-1',
      owner_status: 'failed',
      end_reason: 'appserver_runtime_error'
    });
  }, 20_000);

  it('answers app-server callback requests with provider-worker control decisions', () => {
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/commandExecution/requestApproval', {
        availableDecisions: ['decline', 'accept']
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'accept' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/commandExecution/requestApproval', {
        availableDecisions: ['decline']
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'decline' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/commandExecution/requestApproval', {
        availableDecisions: ['cancel']
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'cancel' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/commandExecution/requestApproval', {
        availableDecisions: ['acceptForSession', 'decline']
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'decline' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/commandExecution/requestApproval', {
        availableDecisions: ['acceptForSession']
      })
    ).toEqual({
      kind: 'error',
      error: {
        code: -32000,
        message:
          'Provider worker app-server control has no safe offered decision for item/commandExecution/requestApproval.'
      }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/commandExecution/requestApproval', {
        availableDecisions: ['decline', 'accept'],
        additionalPermissions: {
          network: { enabled: true }
        }
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'decline' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/commandExecution/requestApproval', {
        availableDecisions: ['decline', 'accept'],
        additionalPermissions: {
          network: {}
        }
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'decline' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/commandExecution/requestApproval', {
        availableDecisions: ['decline', 'accept'],
        networkApprovalContext: {}
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'decline' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/commandExecution/requestApproval', {
        availableDecisions: ['decline', 'accept'],
        additionalPermissions: {
          network: false,
          fileSystem: false
        }
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'accept' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/fileChange/requestApproval')
    ).toEqual({
      kind: 'result',
      result: { decision: 'accept' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/fileChange/requestApproval', {
        availableDecisions: ['acceptForSession', 'decline']
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'decline' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/fileChange/requestApproval', {
        availableDecisions: ['acceptForSession']
      })
    ).toEqual({
      kind: 'error',
      error: {
        code: -32000,
        message:
          'Provider worker app-server control has no safe offered decision for item/fileChange/requestApproval.'
      }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/fileChange/requestApproval', {
        availableDecisions: ['cancel']
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'cancel' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/fileChange/requestApproval', {
        grantRoot: '/tmp/workspace'
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'decline' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/fileChange/requestApproval', {
        grantRoot: '/tmp/workspace',
        availableDecisions: ['cancel']
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'cancel' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/fileChange/requestApproval', {
        grantRoot: false
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'accept' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/permissions/requestApproval', {
        permissions: {
          network: { enabled: true },
          fileSystem: {
            read: ['/tmp/read'],
            write: ['/tmp/write'],
            globScanMaxDepth: 3
          }
        }
      })
    ).toEqual({
      kind: 'result',
      result: {
        permissions: {},
        scope: 'turn',
        strictAutoReview: false
      }
    });
    expect(buildProviderLinearWorkerAppServerCallbackResponse('applyPatchApproval')).toEqual({
      kind: 'result',
      result: { decision: 'approved' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('applyPatchApproval', {
        grantRoot: '/tmp/workspace'
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'denied' }
    });
    expect(buildProviderLinearWorkerAppServerCallbackResponse('execCommandApproval')).toEqual({
      kind: 'result',
      result: { decision: 'approved' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('execCommandApproval', {
        additionalPermissions: {
          network: true
        }
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'denied' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('execCommandApproval', {
        additionalPermissions: {
          network: {}
        }
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'denied' }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('execCommandApproval', {
        additionalPermissions: {
          network: false,
          fileSystem: false
        }
      })
    ).toEqual({
      kind: 'result',
      result: { decision: 'approved' }
    });
    expect(buildProviderLinearWorkerAppServerCallbackResponse('mcpServer/elicitation/request')).toEqual({
      kind: 'result',
      result: {
        action: 'decline',
        content: null,
        _meta: null
      }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/tool/requestUserInput', {
        questions: [{ id: 'q-1' }]
      })
    ).toEqual({
      kind: 'result',
      result: { answers: { 'q-1': { answers: [] } } }
    });
    expect(
      buildProviderLinearWorkerAppServerCallbackResponse('item/tool/call', {
        tool: 'unknownTool'
      })
    ).toEqual({
      kind: 'result',
      result: {
        contentItems: [
          {
            type: 'inputText',
            text: 'Provider worker app-server control has no client implementation for dynamic tool unknownTool.'
          }
        ],
        success: false
      }
    });
    expect(buildProviderLinearWorkerAppServerCallbackResponse('account/chatgptAuthTokens/refresh')).toEqual({
      kind: 'error',
      error: {
        code: -32001,
        message: 'Provider worker app-server control cannot refresh ChatGPT auth tokens.'
      }
    });
  });

  it('routes app-server server requests by method before pending client response ids', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-provider-appserver-callback-'));
    extraTempRoots.push(root);
    const scriptPath = join(root, 'fake-app-server.mjs');
    await writeFile(
      scriptPath,
      `
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin });
let initializeRequestId = null;
let callbackAnswered = false;
let initialized = false;
const failTimer = setTimeout(() => {
  console.error('callback response missing');
  process.exit(2);
}, 2_000);

for await (const line of rl) {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    initializeRequestId = message.id;
    process.stdout.write(JSON.stringify({
      id: message.id,
      method: 'item/commandExecution/requestApproval',
      params: { availableDecisions: ['decline'] }
    }) + '\\n');
    continue;
  }
  if (!message.method && message.id === initializeRequestId) {
    if (message.result?.decision !== 'decline') {
      console.error('unexpected callback decision: ' + JSON.stringify(message.result));
      process.exit(3);
    }
    callbackAnswered = true;
    process.stdout.write(JSON.stringify({ id: initializeRequestId, result: {} }) + '\\n');
    continue;
  }
  if (message.method === 'initialized') {
    initialized = true;
    continue;
  }
  if (message.method === 'thread/start') {
    if (!callbackAnswered || !initialized) {
      console.error('thread start before callback completion');
      process.exit(4);
    }
    process.stdout.write(JSON.stringify({
      id: message.id,
      result: { thread: { id: 'thread-callback' } }
    }) + '\\n');
    continue;
  }
  if (message.method === 'turn/start') {
    process.stdout.write(JSON.stringify({
      id: message.id,
      result: { turn: { id: 'turn-callback', status: 'inProgress' } }
    }) + '\\n');
    process.stdout.write(JSON.stringify({
      method: 'turn/completed',
      params: {
        threadId: 'thread-callback',
        turn: { id: 'turn-callback', status: 'completed' }
      }
    }) + '\\n');
    clearTimeout(failTimer);
    continue;
  }
}
`
    );

    const result = await defaultAppServerTurnRunner({
      command: process.execPath,
      args: [scriptPath],
      cwd: root,
      env: process.env,
      prompt: 'complete callback-routing canary',
      resumeThreadId: null
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('"thread_id":"thread-callback"');
    expect(result.stdout).toContain('"turn_id":"turn-callback"');
    expect(result.stdout).toContain('"method":"item/commandExecution/requestApproval"');
  });

  it('treats app-server process close after a completed turn notification as success', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-provider-appserver-close-after-complete-'));
    extraTempRoots.push(root);
    const scriptPath = join(root, 'fake-app-server-close-after-complete.mjs');
    await writeFile(
      scriptPath,
      `
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin });
const send = (payload) => process.stdout.write(JSON.stringify(payload) + '\\n');

for await (const line of rl) {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    send({ id: message.id, result: {} });
    continue;
  }
  if (message.method === 'initialized') {
    continue;
  }
  if (message.method === 'thread/start') {
    send({ id: message.id, result: { thread: { id: 'thread-close' } } });
    continue;
  }
  if (message.method === 'turn/start') {
    send({ id: message.id, result: { turn: { id: 'turn-close', status: 'inProgress' } } });
    send({
      method: 'turn/completed',
      params: {
        threadId: 'thread-close',
        turn: { id: 'turn-close', status: 'completed' }
      }
    });
    process.stdout.end(() => process.exit(0));
    continue;
  }
}
`
    );

    const result = await defaultAppServerTurnRunner({
      command: process.execPath,
      args: [scriptPath],
      cwd: root,
      env: process.env,
      prompt: 'complete close-after-turn canary',
      resumeThreadId: null
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('"turn_id":"turn-close"');
  });

  it('preserves app-server terminal turn failure details in runner stderr and diagnostics', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-provider-appserver-failed-turn-'));
    extraTempRoots.push(root);
    const scriptPath = join(root, 'fake-app-server-failed-turn.mjs');
    await writeFile(
      scriptPath,
      `
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin });

for await (const line of rl) {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    process.stdout.write(JSON.stringify({ id: message.id, result: {} }) + '\\n');
    continue;
  }
  if (message.method === 'initialized') {
    continue;
  }
  if (message.method === 'thread/start') {
    process.stdout.write(JSON.stringify({
      id: message.id,
      result: { thread: { id: 'thread-failed' } }
    }) + '\\n');
    continue;
  }
  if (message.method === 'turn/start') {
    process.stdout.write(JSON.stringify({
      id: message.id,
      result: { turn: { id: 'turn-failed', status: 'inProgress' } }
    }) + '\\n');
    process.stdout.write(JSON.stringify({
      method: 'turn/completed',
      params: {
        threadId: 'thread-failed',
        turn: {
          id: 'turn-failed',
          status: 'failed',
          error: {
            message: 'turn failed',
            additionalDetails: 'model stream closed before final response'
          }
        }
      }
    }) + '\\n');
    continue;
  }
}
`
    );

    const result = await defaultAppServerTurnRunner({
      command: process.execPath,
      args: [scriptPath],
      cwd: root,
      env: process.env,
      prompt: 'complete failed-turn canary',
      resumeThreadId: null
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      'app-server turn turn-failed failed: turn failed; model stream closed before final response'
    );
    expect(result.stdout).toContain('"status":"appserver_runtime_error"');
    expect(result.stdout).toContain('model stream closed before final response');
  });

  it('preserves app-server stderr when the process exits before turn completion', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-provider-appserver-early-exit-'));
    extraTempRoots.push(root);
    const scriptPath = join(root, 'fake-app-server-early-exit.mjs');
    await writeFile(
      scriptPath,
      `
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin });

for await (const line of rl) {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    process.stdout.write(JSON.stringify({ id: message.id, result: {} }) + '\\n');
    process.stderr.write('protocol pipe closed after initialize\\n');
    process.exit(7);
  }
}
`
    );

    await expect(
      defaultAppServerTurnRunner({
        command: process.execPath,
        args: [scriptPath],
        cwd: root,
        env: process.env,
        prompt: 'early exit canary',
        resumeThreadId: null
      })
    ).rejects.toThrow(/protocol pipe closed after initialize/u);
  });

  it('keeps codex exec as labeled break-glass control when appserver falls back to cli', async () => {
    const { manifestPath } = await createManifestRoot();
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(createTrackedIssue())
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Done',
          state_type: 'completed'
        })
      );
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-cli"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-cli-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-cli-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });
    const appServerTurnRunner = vi.fn();

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_CLOUD_ENV_ID: 'env-appserver-fallback'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () =>
          createRuntimeContext({
            requested_mode: 'appserver',
            selected_mode: 'cli',
            provider: 'CliRuntimeProvider',
            fallback: {
              occurred: true,
              code: 'appserver_unavailable',
              reason: 'codex app-server unavailable',
              from_mode: 'appserver',
              to_mode: 'cli',
              checked_at: '2026-03-21T09:00:00.000Z'
            }
          })
        ),
        execRunner,
        appServerTurnRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(appServerTurnRunner).not.toHaveBeenCalled();
    expect(execRunner).toHaveBeenCalledTimes(1);
    expect(execRunner.mock.calls[0]?.[0].args).toEqual([
      'exec',
      '--json',
      expect.stringContaining('full first-turn task prompt')
    ]);
    expect(proof.worker_control).toMatchObject({
      authority: 'legacy_cli_break_glass',
      transport: 'codex-exec-jsonl',
      fallback_occurred: true,
      fallback_code: 'appserver_unavailable',
      normal_start_method: 'codex exec',
      resume_method: 'codex exec resume',
      drain_method: 'process exit',
      break_glass: true,
      break_glass_reason: 'runtime_fallback:appserver_unavailable'
    });
    expect(proof.appserver_supervision).toMatchObject({
      selected_runtime: {
        requested_mode: 'appserver',
        selected_mode: 'cli',
        provider: 'CliRuntimeProvider',
        fallback: {
          occurred: true,
          code: 'appserver_unavailable',
          from_mode: 'appserver',
          to_mode: 'cli'
        }
      },
      supervision_command: 'codex_exec',
      sticky_environment_id: 'env-appserver-fallback',
      sticky_environment_status: 'proven',
      sticky_environment_blocker: null,
      turn_persistence_status: 'blocked',
      turn_persistence_blocker: 'session_log_hydration_missing',
      resume_status: 'not_requested',
      resume_blocker: null,
      pagination_status: 'blocked',
      fork_status: 'blocked',
      jsonl_truth_retained: true,
      session_log_truth_retained: false
    });
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    expect(manifest).toMatchObject({
      runtime_mode_requested: 'appserver',
      runtime_mode: 'cli',
      runtime_provider: 'CliRuntimeProvider',
      provider_worker_control: {
        authority: 'legacy_cli_break_glass',
        transport: 'codex-exec-jsonl',
        fallback_code: 'appserver_unavailable',
        break_glass: true
      }
    });
  });

  it('resumes resident provider-worker continuity through app-server thread/resume', async () => {
    const { manifestPath } = await createManifestRoot();
    const issue = createTrackedIssue();
    const completedIssue = createTrackedIssue({
      state: 'Done',
      state_type: 'completed'
    });
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(issue)
      .mockResolvedValueOnce(issue)
      .mockResolvedValueOnce(completedIssue);
    let callCount = 0;
    const appServerTurnRunner = vi.fn(async (request) => {
      callCount += 1;
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        turnIndex: callCount,
        recordedAtBase: callCount === 1 ? '2026-03-21T09:00:00.000Z' : '2026-03-21T09:01:00.000Z'
      });
      return {
        exitCode: 0,
        stdout:
          callCount === 1
            ? [
                '{"type":"thread.started","thread_id":"thread-app"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-app-1"}}',
                '{"type":"notification","method":"turn/completed","params":{"threadId":"thread-app","turn":{"id":"turn-app-1","status":"completed"}}}'
              ].join('\n')
            : [
                '{"type":"thread.started","thread_id":"thread-app"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-app-2"}}',
                '{"type":"notification","method":"turn/completed","params":{"threadId":"thread-app","turn":{"id":"turn-app-2","status":"completed"}}}'
              ].join('\n'),
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '2'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createAppServerRuntimeContext()),
        execRunner: vi.fn(),
        appServerTurnRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:01:00.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(appServerTurnRunner).toHaveBeenCalledTimes(2);
    expect(appServerTurnRunner.mock.calls[0]?.[0].resumeThreadId).toBeNull();
    expect(appServerTurnRunner.mock.calls[1]?.[0].resumeThreadId).toBe('thread-app');
    expect(proof).toMatchObject({
      thread_id: 'thread-app',
      latest_turn_id: 'turn-app-2',
      latest_session_id: 'thread-app-turn-app-2',
      owner_status: 'succeeded',
      end_reason: 'issue_inactive',
      worker_control: {
        authority: 'appserver',
        resume_method: 'thread/resume + turn/start'
      }
    });
  });

  it('restarts resident provider-worker continuity through app-server thread/resume on a seeded first turn', async () => {
    const { manifestPath } = await createManifestRoot();
    const appServerTurnRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        turnIndex: 1
      });
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-21"}}',
          '{"type":"notification","method":"turn/completed","params":{"threadId":"thread-1","turn":{"id":"turn-21","status":"completed"}}}'
        ].join('\n'),
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        [PROVIDER_LINEAR_RESIDENT_SESSION_SEED_ENV]: JSON.stringify({
          source_run_id: 'run-prev',
          source_updated_at: '2026-03-21T08:59:59.000Z',
          source_end_reason: 'max_turns_reached_issue_still_active',
          source_thread_id: 'thread-1',
          logical_turn_count: 20,
          restart_count: 1
        })
      },
      {
        readTrackedIssue: vi.fn(async () =>
          createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            assignee_id: null,
            assignee_name: null
          })
        ),
        resolveRuntimeContext: vi.fn(async () => createAppServerRuntimeContext()),
        execRunner: vi.fn(),
        appServerTurnRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(appServerTurnRunner).toHaveBeenCalledTimes(1);
    expect(appServerTurnRunner.mock.calls[0]?.[0].resumeThreadId).toBe('thread-1');
    expect(String(appServerTurnRunner.mock.calls[0]?.[0].prompt)).toContain(
      'logical resident turn #21'
    );
    expect(proof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-21',
      latest_session_id: 'thread-1-turn-21',
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active',
      worker_control: {
        authority: 'appserver',
        restart_method: 'thread/resume from recorded thread_id'
      },
      resident_session: {
        logical_turn_count: 21,
        restart_count: 1,
        continuity_state: 'guarded_resume_active',
        source_run_id: 'run-prev',
        source_thread_id: 'thread-1'
      }
    });
  });

  it('fails closed on app-server control errors without silently falling back to codex exec', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const execRunner = vi.fn();
    const appServerTurnRunner = vi.fn(async () => {
      throw new Error('app-server turn failed: transport closed');
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createAppServerRuntimeContext()),
          execRunner,
          appServerTurnRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('app-server turn failed');

    expect(execRunner).not.toHaveBeenCalled();
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'appserver_runtime_error',
      worker_control: {
        authority: 'appserver',
        transport: 'app-server-jsonl',
        break_glass: false
      },
      failure_diagnosis: {
        diagnostic_category: 'provider_runtime'
      }
    });
  });

  it('classifies app-server terminal failed exits as appserver runtime failures with protocol details', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const execRunner = vi.fn();
    const appServerTurnRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 1,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-app"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-app-1"}}',
          '{"type":"notification","method":"turn/completed","params":{"threadId":"thread-app","turn":{"id":"turn-app-1","status":"failed","error":{"message":"model stream closed before final response"}}}}'
        ].join('\n'),
        stderr: 'app-server turn turn-app-1 failed: model stream closed before final response'
      };
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createAppServerRuntimeContext()),
          execRunner,
          appServerTurnRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('exit code 1');

    expect(execRunner).not.toHaveBeenCalled();
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'appserver_runtime_error',
      failure_diagnosis: {
        diagnostic_category: 'provider_runtime',
        source: 'appserver_runner',
        signal: expect.stringContaining('model stream closed before final response')
      }
    });
  });

  it('pins the live worker lineage into turn env and clears stale control-host locator env', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-lineage-env-'));
    const manualTaskId = 'test-manual-dispatch';
    const manualRunId = 'manual-run-1';
    const manualRunDir = join(tempRoot, '.runs', manualTaskId, 'cli', manualRunId);
    const manualManifestPath = join(manualRunDir, 'manifest.json');
    const olderIssueWorkspacePath = join(tempRoot, '.workspaces', 'linear-lin-issue-1');
    const olderRunDir = join(
      olderIssueWorkspacePath,
      '.runs',
      'linear-lin-issue-1',
      'cli',
      'older-parent-run'
    );
    const olderManifestPath = join(olderRunDir, 'manifest.json');
    await mkdir(manualRunDir, { recursive: true });
    await mkdir(olderRunDir, { recursive: true });
    await writeFile(
      manualManifestPath,
      JSON.stringify({
        run_id: manualRunId,
        task_id: manualTaskId,
        pipeline_id: 'provider-linear-worker',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      olderManifestPath,
      JSON.stringify({
        run_id: 'older-parent-run',
        task_id: 'linear-lin-issue-1',
        pipeline_id: 'provider-linear-worker',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: olderIssueWorkspacePath,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );
    vi.stubEnv('CODEX_ORCHESTRATOR_MANIFEST_PATH', olderManifestPath);
    vi.stubEnv('CODEX_ORCHESTRATOR_ROOT', olderIssueWorkspacePath);
    vi.stubEnv('CODEX_ORCHESTRATOR_TASK_ID', 'linear-lin-issue-1');
    vi.stubEnv('MCP_RUNNER_TASK_ID', 'linear-lin-issue-1');
    vi.stubEnv('TASK', 'linear-lin-issue-1');
    vi.stubEnv('CODEX_ORCHESTRATOR_RUN_ID', 'older-parent-run');
    vi.stubEnv('CODEX_ORCHESTRATOR_RUNS_DIR', join(olderIssueWorkspacePath, '.runs'));
    vi.stubEnv('CODEX_ORCHESTRATOR_OUT_DIR', join(olderIssueWorkspacePath, 'out'));
    vi.stubEnv('CODEX_ORCHESTRATOR_PIPELINE_ID', 'provider-linear-worker');
    vi.stubEnv('CODEX_ORCHESTRATOR_ISSUE_ID', 'lin-issue-1');
    vi.stubEnv('CODEX_ORCHESTRATOR_ISSUE_IDENTIFIER', 'CO-2');
    vi.stubEnv('CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID', 'local-mcp');
    vi.stubEnv('CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID', 'control-host');
    vi.stubEnv(
      'CODEX_ORCHESTRATOR_REPO_CONFIG_PATH',
      join(olderRunDir, 'provider-workflow.last-known-good.json')
    );
    vi.stubEnv(
      'CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH',
      join(olderRunDir, 'provider-workflow.last-known-good.json')
    );
    vi.stubEnv('CODEX_ORCHESTRATOR_CONFIG_MODE', 'repo-authoritative');
    vi.stubEnv('CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED', '1');
    vi.stubEnv('CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT', olderIssueWorkspacePath);
    vi.stubEnv('CODEX_ORCHESTRATOR_PACKAGE_ROOT', olderIssueWorkspacePath);
    vi.stubEnv('CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE', 'control-host');
    vi.stubEnv('CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN', 'stale-launch-token');

    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manualManifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot,
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    const turnEnv = execRunner.mock.calls[0]?.[0].env;
    expect(turnEnv.CODEX_ORCHESTRATOR_MANIFEST_PATH).toBe(manualManifestPath);
    expect(turnEnv.CODEX_ORCHESTRATOR_RUN_DIR).toBe(manualRunDir);
    expect(turnEnv.CODEX_ORCHESTRATOR_ROOT).toBe(tempRoot);
    expect(turnEnv.CODEX_ORCHESTRATOR_RUNS_DIR).toBe(join(tempRoot, '.runs'));
    expect(turnEnv.CODEX_ORCHESTRATOR_OUT_DIR).toBe(join(tempRoot, 'out'));
    expect(turnEnv.CODEX_ORCHESTRATOR_RUN_ID).toBe(manualRunId);
    expect(turnEnv.CODEX_ORCHESTRATOR_TASK_ID).toBe(manualTaskId);
    expect(turnEnv.MCP_RUNNER_TASK_ID).toBe(manualTaskId);
    expect(turnEnv.TASK).toBe(manualTaskId);
    expect(turnEnv.CODEX_ORCHESTRATOR_ISSUE_ID).toBe('lin-issue-1');
    expect(turnEnv.CODEX_ORCHESTRATOR_ISSUE_IDENTIFIER).toBe('CO-2');
    expect(turnEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID).toBeUndefined();
    expect(turnEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID).toBeUndefined();
    expect(turnEnv.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE).toBeUndefined();
    expect(turnEnv.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN).toBeUndefined();
    expect(turnEnv.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH).toBeUndefined();
    expect(turnEnv.CODEX_ORCHESTRATOR_CONFIG_MODE).toBe('downstream-compatibility');
    expect(turnEnv.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED).toBeUndefined();
    expect(turnEnv.CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH).toBeUndefined();
    expect(turnEnv.CODEX_ORCHESTRATOR_PACKAGE_ROOT).toBeUndefined();
    expect(turnEnv.CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT).toBeUndefined();
  });

  it('preserves manual custom repo-config and artifact-root overrides when they are not provider-owned', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-custom-env-'));
    const manualTaskId = 'test-manual-dispatch';
    const manualRunId = 'manual-run-1';
    const manualRunDir = join(tempRoot, '.runs', manualTaskId, 'cli', manualRunId);
    const manualManifestPath = join(manualRunDir, 'manifest.json');
    const customRunsDir = join(tempRoot, 'artifacts', 'runs');
    const customOutDir = join(tempRoot, 'artifacts', 'out');
    const customRepoConfigPath = join(tempRoot, 'custom', 'codex.orchestrator.json');
    await mkdir(manualRunDir, { recursive: true });
    await writeFile(
      manualManifestPath,
      JSON.stringify({
        run_id: manualRunId,
        task_id: manualTaskId,
        pipeline_id: 'provider-linear-worker',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot
      }),
      'utf8'
    );

    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manualManifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot,
        CODEX_ORCHESTRATOR_RUNS_DIR: customRunsDir,
        CODEX_ORCHESTRATOR_OUT_DIR: customOutDir,
        CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: customRepoConfigPath,
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    const turnEnv = execRunner.mock.calls[0]?.[0].env;
    expect(turnEnv.CODEX_ORCHESTRATOR_RUNS_DIR).toBe(customRunsDir);
    expect(turnEnv.CODEX_ORCHESTRATOR_OUT_DIR).toBe(customOutDir);
    expect(turnEnv.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH).toBe(customRepoConfigPath);
  });

  it('preserves strict repo-config mode when helper turns fall back to the workspace default config path', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-required-repo-config-env-'));
    const workspaceRoot = join(tempRoot, '.workspaces', 'linear-lin-issue-1');
    const manualTaskId = 'test-manual-dispatch';
    const manualRunId = 'manual-run-1';
    const manualRunDir = join(workspaceRoot, '.runs', manualTaskId, 'cli', manualRunId);
    const manualManifestPath = join(manualRunDir, 'manifest.json');
    const inheritedProviderRepoConfigPath = join(
      tempRoot,
      '.runs',
      'local-mcp',
      'cli',
      'control-host',
      'provider-workflow.last-known-good.json'
    );
    await mkdir(manualRunDir, { recursive: true });
    await writeFile(join(workspaceRoot, 'codex.orchestrator.json'), '{}\n', 'utf8');
    vi.stubEnv('CODEX_ORCHESTRATOR_REPO_CONFIG_PATH', inheritedProviderRepoConfigPath);
    vi.stubEnv('CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH', inheritedProviderRepoConfigPath);
    await writeFile(
      manualManifestPath,
      JSON.stringify({
        run_id: manualRunId,
        task_id: manualTaskId,
        pipeline_id: 'provider-linear-worker',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: workspaceRoot
      }),
      'utf8'
    );

    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manualManifestPath,
        CODEX_ORCHESTRATOR_ROOT: workspaceRoot,
        CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: '',
        CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH: '',
        CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    const turnEnv = execRunner.mock.calls[0]?.[0].env;
    expect(turnEnv.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH).toBeUndefined();
    expect(turnEnv.CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH).toBeUndefined();
    expect(turnEnv.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED).toBe('1');
  });

  it('absolutizes preserved relative repo-config overrides before rebinding the helper root', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-relative-repo-config-env-'));
    const workspaceRoot = join(tempRoot, '.workspaces', 'linear-lin-issue-1');
    const manualTaskId = 'test-manual-dispatch';
    const manualRunId = 'manual-run-1';
    const manualRunDir = join(workspaceRoot, '.runs', manualTaskId, 'cli', manualRunId);
    const manualManifestPath = join(manualRunDir, 'manifest.json');
    const relativeRepoConfigPath = join('custom', 'codex.orchestrator.json');
    await mkdir(manualRunDir, { recursive: true });
    await writeFile(
      manualManifestPath,
      JSON.stringify({
        run_id: manualRunId,
        task_id: manualTaskId,
        pipeline_id: 'provider-linear-worker',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: workspaceRoot
      }),
      'utf8'
    );

    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manualManifestPath,
        CODEX_ORCHESTRATOR_ROOT: workspaceRoot,
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () =>
          createRuntimeContext({}, {
            CODEX_ORCHESTRATOR_ROOT: tempRoot,
            CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: relativeRepoConfigPath
          })
        ),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    const turnEnv = execRunner.mock.calls[0]?.[0].env;
    expect(turnEnv.CODEX_ORCHESTRATOR_ROOT).toBe(workspaceRoot);
    expect(turnEnv.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH).toBe(
      join(tempRoot, relativeRepoConfigPath)
    );
  });

  it('preserves explicit external absolute artifact-root overrides for provider workspaces', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-external-artifact-env-'));
    const workspaceRoot = join(tempRoot, '.workspaces', 'linear-lin-issue-1');
    const manualTaskId = 'test-manual-dispatch';
    const manualRunId = 'manual-run-1';
    const manualRunDir = join(workspaceRoot, '.runs', manualTaskId, 'cli', manualRunId);
    const manualManifestPath = join(manualRunDir, 'manifest.json');
    const externalRunsDir = await mkdtemp(
      join(tmpdir(), 'provider-linear-worker-shared-runs-')
    );
    const externalOutDir = await mkdtemp(join(tmpdir(), 'provider-linear-worker-shared-out-'));
    extraTempRoots.push(externalRunsDir, externalOutDir);
    await mkdir(manualRunDir, { recursive: true });
    await writeFile(
      manualManifestPath,
      JSON.stringify({
        run_id: manualRunId,
        task_id: manualTaskId,
        pipeline_id: 'provider-linear-worker',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: workspaceRoot
      }),
      'utf8'
    );

    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manualManifestPath,
        CODEX_ORCHESTRATOR_ROOT: workspaceRoot,
        CODEX_ORCHESTRATOR_RUNS_DIR: externalRunsDir,
        CODEX_ORCHESTRATOR_OUT_DIR: externalOutDir,
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    const turnEnv = execRunner.mock.calls[0]?.[0].env;
    expect(turnEnv.CODEX_ORCHESTRATOR_RUNS_DIR).toBe(externalRunsDir);
    expect(turnEnv.CODEX_ORCHESTRATOR_OUT_DIR).toBe(externalOutDir);
  });

  it('drops stale inherited provider-workspace absolute artifact roots when pinning the live run', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-shared-artifact-env-'));
    const workspaceRoot = join(tempRoot, '.workspaces', 'linear-lin-issue-1');
    const staleWorkspaceRoot = join(tempRoot, '.workspaces', 'linear-lin-issue-stale');
    const manualTaskId = 'test-manual-dispatch';
    const manualRunId = 'manual-run-1';
    const manualRunDir = join(workspaceRoot, '.runs', manualTaskId, 'cli', manualRunId);
    const manualManifestPath = join(manualRunDir, 'manifest.json');
    await mkdir(manualRunDir, { recursive: true });
    await writeFile(
      manualManifestPath,
      JSON.stringify({
        run_id: manualRunId,
        task_id: manualTaskId,
        pipeline_id: 'provider-linear-worker',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: workspaceRoot
      }),
      'utf8'
    );
    vi.stubEnv('CODEX_ORCHESTRATOR_RUNS_DIR', join(staleWorkspaceRoot, '.runs'));
    vi.stubEnv('CODEX_ORCHESTRATOR_OUT_DIR', join(staleWorkspaceRoot, 'out'));

    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manualManifestPath,
        CODEX_ORCHESTRATOR_ROOT: workspaceRoot,
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    const turnEnv = execRunner.mock.calls[0]?.[0].env;
    expect(turnEnv.CODEX_ORCHESTRATOR_RUNS_DIR).toBe(join(workspaceRoot, '.runs'));
    expect(turnEnv.CODEX_ORCHESTRATOR_OUT_DIR).toBe(join(workspaceRoot, 'out'));
  });

  it('preserves shared default artifact roots when no workspace counterpart exists yet', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-preserve-shared-artifact-env-'));
    const workspaceRoot = join(tempRoot, '.workspaces', 'linear-lin-issue-1');
    const manualTaskId = 'test-manual-dispatch';
    const manualRunId = 'manual-run-1';
    const sharedRunDir = join(tempRoot, '.runs', manualTaskId, 'cli', manualRunId);
    const sharedManifestPath = join(sharedRunDir, 'manifest.json');
    await mkdir(sharedRunDir, { recursive: true });
    await mkdir(workspaceRoot, { recursive: true });
    await writeFile(
      sharedManifestPath,
      JSON.stringify({
        run_id: manualRunId,
        task_id: manualTaskId,
        pipeline_id: 'provider-linear-worker',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: workspaceRoot
      }),
      'utf8'
    );

    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: sharedManifestPath,
        CODEX_ORCHESTRATOR_ROOT: workspaceRoot,
        CODEX_ORCHESTRATOR_RUNS_DIR: '.runs',
        CODEX_ORCHESTRATOR_OUT_DIR: 'out',
        CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS: '1',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    const turnEnv = execRunner.mock.calls[0]?.[0].env;
    expect(turnEnv.CODEX_ORCHESTRATOR_ROOT).toBe(workspaceRoot);
    expect(turnEnv.CODEX_ORCHESTRATOR_RUNS_DIR).toBe(join(tempRoot, '.runs'));
    expect(turnEnv.CODEX_ORCHESTRATOR_OUT_DIR).toBe(join(tempRoot, 'out'));
  });

  it('rebases shared absolute artifact-root overrides to the workspace counterpart when one exists', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-rebased-shared-artifact-env-'));
    const workspaceRoot = join(tempRoot, '.workspaces', 'linear-lin-issue-1');
    const manualTaskId = 'test-manual-dispatch';
    const manualRunId = 'manual-run-1';
    const manualRunDir = join(workspaceRoot, '.runs', manualTaskId, 'cli', manualRunId);
    const manualManifestPath = join(manualRunDir, 'manifest.json');
    const sharedRunsDir = join(tempRoot, 'artifacts', 'runs');
    const sharedOutDir = join(tempRoot, 'artifacts', 'out');
    await mkdir(manualRunDir, { recursive: true });
    await writeFile(
      manualManifestPath,
      JSON.stringify({
        run_id: manualRunId,
        task_id: manualTaskId,
        pipeline_id: 'provider-linear-worker',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: workspaceRoot
      }),
      'utf8'
    );

    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manualManifestPath,
        CODEX_ORCHESTRATOR_ROOT: workspaceRoot,
        CODEX_ORCHESTRATOR_RUNS_DIR: sharedRunsDir,
        CODEX_ORCHESTRATOR_OUT_DIR: sharedOutDir,
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    const turnEnv = execRunner.mock.calls[0]?.[0].env;
    expect(turnEnv.CODEX_ORCHESTRATOR_RUNS_DIR).toBe(join(workspaceRoot, 'artifacts', 'runs'));
    expect(turnEnv.CODEX_ORCHESTRATOR_OUT_DIR).toBe(join(workspaceRoot, 'artifacts', 'out'));
  });

  it('keeps verified control-host launch source pinned in helper turn env', async () => {
    const { manifestPath } = await createManifestRoot();
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        pipeline_id: 'provider-linear-worker',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_launch_source: 'control-host',
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
        CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    const turnEnv = execRunner.mock.calls[0]?.[0].env;
    expect(turnEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID).toBe('local-mcp');
    expect(turnEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID).toBe('control-host');
    expect(turnEnv.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE).toBe('control-host');
  });

  it('fails closed when a codex turn exits non-zero and writes a failed proof sidecar', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const controlServer = await createControlEndpointServer();
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    try {
      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
                exitCode: 2,
                stdout: [
                  '{"type":"thread.started","thread_id":"thread-1"}',
                  '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
                ].join('\n'),
                stderr: 'Rate limit exhausted for prolite account before JSONL failure details emitted.'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        owner_status: 'failed',
        end_reason: 'codex_exit_2',
        failure_diagnosis: {
          diagnostic_category: 'quota_rate_limit',
          signal: expect.stringContaining('Rate limit exhausted'),
          source: 'stderr',
          observed_at: '2026-03-21T09:00:01.000Z'
        }
      });
      expect(controlServer.requests).toHaveLength(1);
      expect(controlServer.requests[0]).toMatchObject({
        url: '/api/v1/refresh',
        body: {
          action: 'refresh',
          source: 'provider-linear-worker',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          owner_status: 'failed',
          end_reason: 'codex_exit_2'
        }
      });
      expectRefreshAuthHeaders(controlServer.requests[0]?.headers);
    } finally {
      await controlServer.close();
    }
  });

  it('classifies stdin bootstrap stderr exits in failed proof sidecars', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot
      }),
      'utf8'
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
              exitCode: 1,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'stderr | Reading additional input from stdin...'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-04-23T07:46:11.000Z')
            .mockReturnValue('2026-04-23T07:46:12.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 1');

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      owner_status: 'failed',
      end_reason: 'codex_exit_1',
      failure_diagnosis: {
        diagnostic_category: 'provider_stdin_bootstrap',
        signal: expect.stringContaining('Reading additional input from stdin'),
        guidance: expect.stringContaining('stdin bootstrap'),
        source: 'stderr',
        observed_at: '2026-04-23T07:46:12.000Z'
      }
    });
  });

  it('persists the first proof snapshot and runtime diagnosis when the manifest cannot be reread later', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const readManifest = vi
      .fn<ProviderLinearWorkerDependencies['readManifest']>()
      .mockResolvedValueOnce({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot
      })
      .mockRejectedValue(new Error('manifest reread should not happen'));

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readManifest,
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    expect(readManifest).toHaveBeenCalledTimes(1);
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      owner_status: 'failed',
      end_reason: 'codex_exit_2',
      failure_diagnosis: {
        diagnostic_category: 'provider_runtime',
        signal: expect.stringContaining('boom'),
        source: 'stderr',
        observed_at: '2026-03-21T09:00:01.000Z'
      }
    });
  });

  it('classifies a stdin bootstrap exit in the failed proof sidecar before issue execution', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async () => {
            return {
              exitCode: 1,
              stdout: '',
              stderr: 'Reading additional input from stdin...'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-04-21T04:00:00.000Z')
            .mockReturnValue('2026-04-21T04:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 1');

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      owner_status: 'failed',
      end_reason: 'codex_exit_1',
      failure_diagnosis: {
        diagnostic_category: 'provider_stdin_bootstrap',
        signal: 'stderr | Reading additional input from stdin...',
        source: 'stderr',
        observed_at: '2026-04-21T04:00:01.000Z',
        guidance: expect.stringContaining('stdin bootstrap')
      },
      linear_audit: {
        attempted_count: 0,
        success_count: 0,
        failure_count: 0,
        parallelization_entries: []
      }
    });
  });

  it('falls back to the provider control-host env locator when older manifests omit the host fields', async () => {
    const { manifestPath } = await createManifestRoot();
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    const controlServer = await createControlEndpointServer();
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );

    try {
      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3',
            CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
            CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
            CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      expect(controlServer.requests).toHaveLength(1);
      expect(controlServer.requests[0]).toMatchObject({
        url: '/api/v1/refresh',
        body: {
          action: 'refresh',
          source: 'provider-linear-worker',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          owner_status: 'failed',
          end_reason: 'codex_exit_2'
        }
      });
      expectRefreshAuthHeaders(controlServer.requests[0]?.headers);
    } finally {
      await controlServer.close();
    }
  });

  it('allows configured control-host bind hosts for terminal failure refresh requests', async () => {
    const { manifestPath } = await createManifestRoot();
    const codexConfigDir = join(tempRoot ?? '', '.codex');
    await mkdir(codexConfigDir, { recursive: true });
    await writeFile(
      join(codexConfigDir, 'orchestrator.toml'),
      '[ui]\nallowed_bind_hosts = ["control.example"]\n',
      'utf8'
    );
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ queued: true, coalesced: false }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchSpy);
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://control.example:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe('http://control.example:43123/api/v1/refresh');
    expect(fetchSpy.mock.calls[0]?.[1]?.redirect).toBe('error');
    expectRefreshAuthHeaders(fetchSpy.mock.calls[0]?.[1]?.headers as Headers | undefined);
  });

  it('uses the owning control-host repo bind-host policy instead of the worker workspace config', async () => {
    const { manifestPath } = await createManifestRoot();
    const workerWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    await mkdir(workerWorkspacePath, { recursive: true });
    const workerCodexConfigDir = join(workerWorkspacePath, '.codex');
    await mkdir(workerCodexConfigDir, { recursive: true });
    await writeFile(
      join(workerCodexConfigDir, 'orchestrator.toml'),
      '[ui]\nallowed_bind_hosts = ["localhost"]\n',
      'utf8'
    );
    const repoCodexConfigDir = join(tempRoot ?? '', '.codex');
    await mkdir(repoCodexConfigDir, { recursive: true });
    await writeFile(
      join(repoCodexConfigDir, 'orchestrator.toml'),
      '[ui]\nallowed_bind_hosts = ["control.example"]\n',
      'utf8'
    );
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ queued: true, coalesced: false }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchSpy);
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://control.example:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: join(tempRoot ?? '', 'stale-manifest-workspace')
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: workerWorkspacePath,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: workerWorkspacePath,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe('http://control.example:43123/api/v1/refresh');
    expectRefreshAuthHeaders(fetchSpy.mock.calls[0]?.[1]?.headers as Headers | undefined);
  });

  it('allows IPv6 loopback control-host refresh endpoints', async () => {
    const { manifestPath } = await createManifestRoot();
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ queued: true, coalesced: false }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchSpy);
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://[::1]:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe('http://[::1]:43123/api/v1/refresh');
  });

  it('does not parse delegation config on healthy runs that never need terminal failure refresh', async () => {
    const { manifestPath } = await createManifestRoot();
    const codexConfigDir = join(tempRoot ?? '', '.codex');
    await mkdir(codexConfigDir, { recursive: true });
    await writeFile(join(codexConfigDir, 'orchestrator.toml'), 'not = [valid', 'utf8');

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
      },
      {
        readTrackedIssue: vi
          .fn()
          .mockResolvedValueOnce(createTrackedIssue())
          .mockResolvedValueOnce(
            createTrackedIssue({
              state: 'Done',
              state_type: 'completed'
            })
          ),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner: vi.fn(async (request) => {
          await appendStaySerialParallelizationDecisionAuditForRequest(request);
          return {
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      owner_status: 'succeeded',
      end_reason: 'issue_inactive'
    });
  });

  it('fails closed without crashing when the persisted control-host locator is malformed', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: '../outside-task',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      owner_status: 'failed',
      end_reason: 'codex_exit_2'
    });
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('provider-linear-worker could not request control-host refresh for CO-2')
    );
  });

  it('fails closed when the owning control-host has a disallowed base_url', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    await writeFile(join(controlHostRunDir, 'manifest.json'), '{not-json', 'utf8');
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://control.example:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    const owner = {
      schema_version: 1,
      status: 'owned',
      owner_token: 'owner-token',
      acquired_at: '2026-04-11T00:00:00.000Z',
      updated_at: '2026-04-11T00:00:00.000Z',
      released_at: null,
      repo_root: tempRoot,
      task_id: 'local-mcp',
      run_id: 'control-host',
      run_dir: controlHostRunDir,
      pipeline_id: 'provider-linear-worker',
      pid: 123,
      ppid: 1,
      hostname: 'host.local',
      cwd: tempRoot,
      argv: ['codex-orchestrator', 'control-host'],
      lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
      lock_owner_path: join(controlHostRunDir, 'control-host-owner.lock', 'owner.json'),
      owner_path: join(controlHostRunDir, 'control-host-owner.json')
    };
    await writeFile(
      join(controlHostRunDir, CONTROL_HOST_DUPLICATE_OWNER_FILE),
      JSON.stringify({
        schema_version: 1,
        reason: 'duplicate_control_host_owner',
        observed_at: '2026-04-11T00:00:05.000Z',
        run_dir: controlHostRunDir,
        lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
        diagnostic_path: join(controlHostRunDir, CONTROL_HOST_DUPLICATE_OWNER_FILE),
        existing_owner: owner,
        attempted_owner: {
          ...owner,
          owner_token: 'attempted-owner-token',
          pid: 456
        },
        action: 'duplicate_rejected'
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      owner_status: 'failed',
      end_reason: 'codex_exit_2'
    });
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('control base_url not permitted')
    );
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('duplicate_control_host_owner')
    );
  });

  it('retries control-host refresh once after stale-owner reclaim fetch failure', async () => {
    const { manifestPath } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://127.0.0.1:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(
      join(controlHostRunDir, 'control_auth.json'),
      JSON.stringify({ token: 'control-token' }),
      'utf8'
    );
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    const owner = {
      schema_version: 1,
      status: 'owned',
      owner_token: 'stale-owner-token',
      acquired_at: '2026-04-23T06:38:00.000Z',
      updated_at: '2026-04-23T06:38:00.000Z',
      released_at: null,
      repo_root: tempRoot,
      task_id: 'local-mcp',
      run_id: 'control-host',
      run_dir: controlHostRunDir,
      pipeline_id: 'provider-linear-worker',
      pid: 26182,
      ppid: 1,
      hostname: 'host.local',
      cwd: tempRoot,
      argv: ['codex-orchestrator', 'control-host'],
      lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
      lock_owner_path: join(controlHostRunDir, 'control-host-owner.lock', 'owner.json'),
      owner_path: join(controlHostRunDir, 'control-host-owner.json')
    };
    await writeFile(
      join(controlHostRunDir, CONTROL_HOST_STALE_OWNER_FILE),
      JSON.stringify({
        schema_version: 1,
        reason: 'stale_control_host_owner',
        observed_at: '2026-04-23T06:38:56.819Z',
        run_dir: controlHostRunDir,
        lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
        diagnostic_path: join(controlHostRunDir, CONTROL_HOST_STALE_OWNER_FILE),
        existing_owner: owner,
        attempted_owner: {
          ...owner,
          owner_token: 'attempted-owner-token',
          pid: 57172
        },
        action: 'stale_reclaimed'
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );
    await writeFile(
      join(controlHostRunDir, 'provider-control-host-refresh-failure.json'),
      JSON.stringify({ stale: true }),
      'utf8'
    );
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValue(new Response(JSON.stringify({ queued: true }), { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-04-23T06:39:00.000Z')
            .mockReturnValue('2026-04-23T06:39:01.000Z'),
          log
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(log.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('provider-linear-worker could not request control-host refresh')
    );
    await expect(
      readFile(join(controlHostRunDir, 'provider-control-host-refresh-failure.json'), 'utf8')
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('retries control-host refresh once after stale-owner reclaim timeout', async () => {
    const { manifestPath } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://127.0.0.1:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(
      join(controlHostRunDir, 'control_auth.json'),
      JSON.stringify({ token: 'control-token' }),
      'utf8'
    );
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    const owner = {
      schema_version: 1,
      status: 'owned',
      owner_token: 'stale-owner-token',
      acquired_at: '2026-04-23T06:38:00.000Z',
      updated_at: '2026-04-23T06:38:00.000Z',
      released_at: null,
      repo_root: tempRoot,
      task_id: 'local-mcp',
      run_id: 'control-host',
      run_dir: controlHostRunDir,
      pipeline_id: 'provider-linear-worker',
      pid: 26182,
      ppid: 1,
      hostname: 'host.local',
      cwd: tempRoot,
      argv: ['codex-orchestrator', 'control-host'],
      lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
      lock_owner_path: join(controlHostRunDir, 'control-host-owner.lock', 'owner.json'),
      owner_path: join(controlHostRunDir, 'control-host-owner.json')
    };
    await writeFile(
      join(controlHostRunDir, CONTROL_HOST_STALE_OWNER_FILE),
      JSON.stringify({
        schema_version: 1,
        reason: 'stale_control_host_owner',
        observed_at: '2026-04-23T06:38:56.819Z',
        run_dir: controlHostRunDir,
        lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
        diagnostic_path: join(controlHostRunDir, CONTROL_HOST_STALE_OWNER_FILE),
        existing_owner: owner,
        attempted_owner: {
          ...owner,
          owner_token: 'attempted-owner-token',
          pid: 57172
        },
        action: 'stale_reclaimed'
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );
    const timeoutError = new Error('request aborted');
    timeoutError.name = 'AbortError';
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValue(new Response(JSON.stringify({ queued: true }), { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-04-23T06:39:00.000Z')
            .mockReturnValue('2026-04-23T06:39:01.000Z'),
          log
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(log.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('provider-linear-worker could not request control-host refresh')
    );
    await expect(
      readFile(join(controlHostRunDir, 'provider-control-host-refresh-failure.json'), 'utf8')
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('persists stale-owner refresh failure diagnostics when retry cannot recover', async () => {
    const { manifestPath } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://127.0.0.1:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(
      join(controlHostRunDir, 'control_auth.json'),
      JSON.stringify({ token: 'control-token' }),
      'utf8'
    );
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    const owner = {
      schema_version: 1,
      status: 'owned',
      owner_token: 'stale-owner-token',
      acquired_at: '2026-04-23T06:38:00.000Z',
      updated_at: '2026-04-23T06:38:00.000Z',
      released_at: null,
      repo_root: tempRoot,
      task_id: 'local-mcp',
      run_id: 'control-host',
      run_dir: controlHostRunDir,
      pipeline_id: 'provider-linear-worker',
      pid: 26182,
      ppid: 1,
      hostname: 'host.local',
      cwd: tempRoot,
      argv: ['codex-orchestrator', 'control-host'],
      lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
      lock_owner_path: join(controlHostRunDir, 'control-host-owner.lock', 'owner.json'),
      owner_path: join(controlHostRunDir, 'control-host-owner.json')
    };
    await writeFile(
      join(controlHostRunDir, CONTROL_HOST_STALE_OWNER_FILE),
      JSON.stringify({
        schema_version: 1,
        reason: 'stale_control_host_owner',
        observed_at: '2026-04-23T06:38:56.819Z',
        run_dir: controlHostRunDir,
        lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
        diagnostic_path: join(controlHostRunDir, CONTROL_HOST_STALE_OWNER_FILE),
        existing_owner: owner,
        attempted_owner: {
          ...owner,
          owner_token: 'attempted-owner-token',
          pid: 57172
        },
        action: 'stale_reclaimed'
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new Error('fetch failed'))
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-04-23T06:39:00.000Z')
            .mockReturnValue('2026-04-23T06:39:01.000Z'),
          log
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('stale_control_host_owner'));
    const diagnostic = JSON.parse(
      await readFile(join(controlHostRunDir, 'provider-control-host-refresh-failure.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(diagnostic).toMatchObject({
      reason: 'provider_control_host_refresh_failed',
      failure_kind: 'fetch_failed',
      message: 'fetch failed',
      issue_identifier: 'CO-2',
      control_host_ownership: {
        reason: 'stale_control_host_owner',
        status: 'stale_reclaimed',
        lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
        diagnostic_path: join(controlHostRunDir, CONTROL_HOST_STALE_OWNER_FILE),
        owner: {
          owner_token: 'stale-owner-token',
          status: 'owned',
          pid: 26182,
          ppid: 1,
          hostname: 'host.local',
          acquired_at: '2026-04-23T06:38:00.000Z',
          updated_at: '2026-04-23T06:38:00.000Z',
          released_at: null,
          repo_root: tempRoot,
          task_id: 'local-mcp',
          run_id: 'control-host',
          run_dir: controlHostRunDir,
          pipeline_id: 'provider-linear-worker',
          lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
          owner_path: join(controlHostRunDir, 'control-host-owner.json')
        },
        attempted_owner: {
          owner_token: 'attempted-owner-token',
          status: 'owned',
          pid: 57172,
          ppid: 1,
          hostname: 'host.local',
          acquired_at: '2026-04-23T06:38:00.000Z',
          updated_at: '2026-04-23T06:38:00.000Z',
          released_at: null,
          repo_root: tempRoot,
          task_id: 'local-mcp',
          run_id: 'control-host',
          run_dir: controlHostRunDir,
          pipeline_id: 'provider-linear-worker',
          lock_dir: join(controlHostRunDir, 'control-host-owner.lock'),
          owner_path: join(controlHostRunDir, 'control-host-owner.json')
        }
      },
      retry: {
        attempts: 2,
        retried_after_stale_owner_reclaim: true,
        recovered: false
      }
    });
  });

  it('treats localhost and 127.0.0.1 as equivalent loopback control-host bind hosts', async () => {
    const { manifestPath } = await createManifestRoot();
    const workerWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    const repoCodexConfigDir = join(tempRoot ?? '', '.codex');
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(workerWorkspacePath, { recursive: true });
    await mkdir(repoCodexConfigDir, { recursive: true });
    await mkdir(controlHostRunDir, { recursive: true });
    await writeFile(
      join(repoCodexConfigDir, 'orchestrator.toml'),
      '[ui]\nallowed_bind_hosts = ["localhost"]\n',
      'utf8'
    );
    const controlServer = await createControlEndpointServer('127.0.0.1');
    try {
      await writeFile(
        join(controlHostRunDir, 'control_endpoint.json'),
        JSON.stringify({
          base_url: controlServer.baseUrl,
          token_path: 'control_auth.json'
        }),
        'utf8'
      );
      await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
      await writeFile(
        join(controlHostRunDir, 'manifest.json'),
        JSON.stringify({
          run_id: 'control-host',
          task_id: 'local-mcp',
          workspace_path: tempRoot
        }),
        'utf8'
      );
      await writeFile(
        manifestPath,
        JSON.stringify({
          run_id: 'run-child',
          task_id: 'linear-lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          workspace_path: workerWorkspacePath,
          provider_control_host_task_id: 'local-mcp',
          provider_control_host_run_id: 'control-host'
        }),
        'utf8'
      );

      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: workerWorkspacePath,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      expect(controlServer.requests).toHaveLength(1);
      expect(controlServer.requests[0]?.url).toBe('/api/v1/refresh');
    } finally {
      await controlServer.close();
    }
  });

  it('treats an explicit empty allowed_bind_hosts list as deny-all for control-host refreshes', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const workerWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    const repoCodexConfigDir = join(tempRoot ?? '', '.codex');
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(workerWorkspacePath, { recursive: true });
    await mkdir(repoCodexConfigDir, { recursive: true });
    await mkdir(controlHostRunDir, { recursive: true });
    await writeFile(join(repoCodexConfigDir, 'orchestrator.toml'), '[ui]\nallowed_bind_hosts = []\n', 'utf8');
    const controlServer = await createControlEndpointServer();
    try {
      await writeFile(
        join(controlHostRunDir, 'control_endpoint.json'),
        JSON.stringify({
          base_url: controlServer.baseUrl,
          token_path: 'control_auth.json'
        }),
        'utf8'
      );
      await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
      await writeFile(
        join(controlHostRunDir, 'manifest.json'),
        JSON.stringify({
          run_id: 'control-host',
          task_id: 'local-mcp',
          workspace_path: tempRoot
        }),
        'utf8'
      );
      await writeFile(
        manifestPath,
        JSON.stringify({
          run_id: 'run-child',
          task_id: 'linear-lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          workspace_path: workerWorkspacePath,
          provider_control_host_task_id: 'local-mcp',
          provider_control_host_run_id: 'control-host'
        }),
        'utf8'
      );

      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: workerWorkspacePath,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        owner_status: 'failed',
        end_reason: 'codex_exit_2'
      });
      expect(controlServer.requests).toHaveLength(0);
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('control base_url not permitted')
      );
    } finally {
      await controlServer.close();
    }
  });

  it('rejects backslash-based control auth path escapes outside the control-host run root', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const controlServer = await createControlEndpointServer();
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: '../stolen\\token'
      }),
      'utf8'
    );
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    try {
      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        owner_status: 'failed',
        end_reason: 'codex_exit_2'
      });
      expect(controlServer.requests).toHaveLength(0);
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('control auth path invalid')
      );
    } finally {
      await controlServer.close();
    }
  });

  it('rejects empty control auth token sidecars instead of treating them as bearer tokens', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const controlServer = await createControlEndpointServer();
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: '' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    try {
      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        owner_status: 'failed',
        end_reason: 'codex_exit_2'
      });
      expect(controlServer.requests).toHaveLength(0);
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('control auth token invalid')
      );
    } finally {
      await controlServer.close();
    }
  });

  it('rejects malformed JSON-like control auth sidecars instead of treating them as bearer tokens', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const controlServer = await createControlEndpointServer();
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), '{not-json', 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    try {
      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        owner_status: 'failed',
        end_reason: 'codex_exit_2'
      });
      expect(controlServer.requests).toHaveLength(0);
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('control auth token invalid')
      );
    } finally {
      await controlServer.close();
    }
  });

  it('rejects symlinked control auth sidecars that resolve outside the control-host run root', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const controlServer = await createControlEndpointServer();
    const externalTokenPath = join(tempRoot ?? '', 'external-control-auth.json');
    await writeFile(externalTokenPath, JSON.stringify({ token: 'stolen-token' }), 'utf8');
    await symlink(externalTokenPath, join(controlHostRunDir, 'control_auth.json'));
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    try {
      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        owner_status: 'failed',
        end_reason: 'codex_exit_2'
      });
      expect(controlServer.requests).toHaveLength(0);
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('control auth path invalid')
      );
    } finally {
      await controlServer.close();
    }
  });

  it('rejects symlinked control endpoint sidecars that resolve outside the control-host run root', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const controlServer = await createControlEndpointServer();
    const externalEndpointPath = join(tempRoot ?? '', 'external-control-endpoint.json');
    await writeFile(
      externalEndpointPath,
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await symlink(externalEndpointPath, join(controlHostRunDir, 'control_endpoint.json'));
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    try {
      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        owner_status: 'failed',
        end_reason: 'codex_exit_2'
      });
      expect(controlServer.requests).toHaveLength(0);
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('control endpoint path invalid')
      );
    } finally {
      await controlServer.close();
    }
  });

  it('rejects symlinked control-host run directories that escape the runs root', async () => {
    const { manifestPath } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const runsRoot = join(tempRoot ?? '', '.runs');
    const externalRoot = join(tempRoot ?? '', 'external-control-host');
    const controlHostRealRunDir = join(externalRoot, 'cli', 'control-host');
    const controlHostLinkedTaskDir = join(runsRoot, 'local-mcp');
    await mkdir(controlHostRealRunDir, { recursive: true });
    await mkdir(runsRoot, { recursive: true });
    await symlink(externalRoot, controlHostLinkedTaskDir, 'dir');
    const controlServer = await createControlEndpointServer();
    try {
      await writeFile(
        join(controlHostRealRunDir, 'control_endpoint.json'),
        JSON.stringify({
          base_url: controlServer.baseUrl,
          token_path: 'control_auth.json'
        }),
        'utf8'
      );
      await writeFile(join(controlHostRealRunDir, 'control_auth.json'), 'worker-token', 'utf8');
      await writeFile(
        join(controlHostRealRunDir, 'manifest.json'),
        JSON.stringify({
          run_id: 'control-host',
          task_id: 'local-mcp',
          workspace_path: tempRoot
        }),
        'utf8'
      );
      await writeFile(
        manifestPath,
        JSON.stringify({
          run_id: 'run-child',
          task_id: 'linear-lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          workspace_path: tempRoot,
          provider_control_host_task_id: 'local-mcp',
          provider_control_host_run_id: 'control-host'
        }),
        'utf8'
      );

      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      expect(controlServer.requests).toHaveLength(0);
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('control-host manifest path invalid')
      );
    } finally {
      await controlServer.close();
    }
  });

  it('derives control-host bind-host policy from the canonical run repo root instead of manifest workspace_path', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const actualRepoConfigDir = join(tempRoot ?? '', '.codex');
    const permissiveRepoRoot = join(tempRoot ?? '', 'permissive-workspace');
    const permissiveRepoConfigDir = join(permissiveRepoRoot, '.codex');
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    const workerWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    await mkdir(actualRepoConfigDir, { recursive: true });
    await mkdir(permissiveRepoConfigDir, { recursive: true });
    await mkdir(controlHostRunDir, { recursive: true });
    await mkdir(workerWorkspacePath, { recursive: true });
    await writeFile(
      join(actualRepoConfigDir, 'orchestrator.toml'),
      ['[ui]', 'allowed_bind_hosts = ["example.invalid"]', ''].join('\n'),
      'utf8'
    );
    await writeFile(
      join(permissiveRepoConfigDir, 'orchestrator.toml'),
      ['[ui]', 'allowed_bind_hosts = ["127.0.0.1", "localhost"]', ''].join('\n'),
      'utf8'
    );
    const controlServer = await createControlEndpointServer();
    try {
      await writeFile(
        join(controlHostRunDir, 'control_endpoint.json'),
        JSON.stringify({
          base_url: controlServer.baseUrl,
          token_path: 'control_auth.json'
        }),
        'utf8'
      );
      await writeFile(join(controlHostRunDir, 'control_auth.json'), 'worker-token', 'utf8');
      await writeFile(
        join(controlHostRunDir, 'manifest.json'),
        JSON.stringify({
          run_id: 'control-host',
          task_id: 'local-mcp',
          workspace_path: permissiveRepoRoot
        }),
        'utf8'
      );
      await writeFile(
        manifestPath,
        JSON.stringify({
          run_id: 'run-child',
          task_id: 'linear-lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          workspace_path: workerWorkspacePath,
          provider_control_host_task_id: 'local-mcp',
          provider_control_host_run_id: 'control-host'
        }),
        'utf8'
      );

      await expect(
        runProviderLinearWorker(
          {
            CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
            CODEX_ORCHESTRATOR_ROOT: workerWorkspacePath,
            CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
            CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
          },
          {
            readTrackedIssue: vi.fn(async () => createTrackedIssue()),
            resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
            execRunner: vi.fn(async (request) => {
              await appendStaySerialParallelizationDecisionAuditForRequest(request);
              return {
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
              };
            }),
            now: vi
              .fn()
              .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
              .mockReturnValue('2026-03-21T09:00:01.000Z'),
            log
          }
        )
      ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        owner_status: 'failed',
        end_reason: 'codex_exit_2'
      });
      expect(controlServer.requests).toHaveLength(0);
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('control base_url not permitted')
      );
    } finally {
      await controlServer.close();
    }
  });

  it('uses a validated control-host manifest workspace_path when runs are stored outside the repo root', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-'));
    const repoRoot = join(tempRoot, 'repo-root');
    const workerWorkspacePath = join(repoRoot, '.workspaces', 'linear-lin-issue-1');
    const externalRunsRoot = join(tempRoot, 'external-runs');
    const runDir = join(externalRunsRoot, 'linear-lin-issue-1', 'cli', 'run-child');
    const manifestPath = join(runDir, 'manifest.json');
    const controlHostRunDir = join(externalRunsRoot, 'local-mcp', 'cli', 'control-host');
    await mkdir(join(repoRoot, '.codex'), { recursive: true });
    await mkdir(workerWorkspacePath, { recursive: true });
    await mkdir(controlHostRunDir, { recursive: true });
    await mkdir(runDir, { recursive: true });
    await writeFile(
      join(repoRoot, '.codex', 'orchestrator.toml'),
      '[ui]\nallowed_bind_hosts = ["control.example"]\n',
      'utf8'
    );
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ queued: true, coalesced: false }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchSpy);
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://control.example:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: repoRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: workerWorkspacePath,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: workerWorkspacePath,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe('http://control.example:43123/api/v1/refresh');
    expectRefreshAuthHeaders(fetchSpy.mock.calls[0]?.[1]?.headers as Headers | undefined);
  });

  it('rejects a control-host manifest workspace_path that points at the worker workspace instead of the repo root', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-'));
    const repoRoot = join(tempRoot, 'repo-root');
    const workerWorkspacePath = join(repoRoot, '.workspaces', 'linear-lin-issue-1');
    const externalRunsRoot = join(tempRoot, 'external-runs');
    const runDir = join(externalRunsRoot, 'linear-lin-issue-1', 'cli', 'run-child');
    const manifestPath = join(runDir, 'manifest.json');
    const controlHostRunDir = join(externalRunsRoot, 'local-mcp', 'cli', 'control-host');
    await mkdir(join(repoRoot, '.codex'), { recursive: true });
    await mkdir(join(workerWorkspacePath, '.codex'), { recursive: true });
    await mkdir(controlHostRunDir, { recursive: true });
    await mkdir(runDir, { recursive: true });
    await writeFile(
      join(repoRoot, '.codex', 'orchestrator.toml'),
      '[ui]\nallowed_bind_hosts = ["example.invalid"]\n',
      'utf8'
    );
    await writeFile(
      join(workerWorkspacePath, '.codex', 'orchestrator.toml'),
      '[ui]\nallowed_bind_hosts = ["127.0.0.1", "localhost"]\n',
      'utf8'
    );
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ queued: true, coalesced: false }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://127.0.0.1:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: workerWorkspacePath
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: workerWorkspacePath,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: workerWorkspacePath,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('control-host repo root unavailable'));
  });

  it('skips control-host refresh when the current manifest path is outside the canonical task/cli/run layout', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-'));
    const malformedRunDir = join(tempRoot, 'outside-runs', 'a', 'b');
    const manifestPath = join(malformedRunDir, 'manifest.json');
    const controlHostRunDir = join(tempRoot, 'outside-runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(malformedRunDir, { recursive: true });
    await mkdir(controlHostRunDir, { recursive: true });
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ queued: true, coalesced: false }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://127.0.0.1:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed when the control-host refresh endpoint returns 200 instead of 202 accepted', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const fetchSpy = vi.fn(async () => new Response('already queued elsewhere', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    }));
    vi.stubGlobal('fetch', fetchSpy);
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://127.0.0.1:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log
        }
      )
    ).rejects.toThrow('provider-linear-worker turn 1 failed with exit code 2');

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      owner_status: 'failed',
      end_reason: 'codex_exit_2'
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('refresh request failed with status 200: already queued elsewhere')
    );
  });

  it('fails closed when execRunner rejects and writes a failed proof sidecar', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const execRunner = vi.fn(async () => {
      throw new Error('spawn failed');
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () =>
            createRuntimeContext({
              requested_mode: 'cli',
              selected_mode: 'cli',
              provider: 'CliRuntimeProvider'
            })
          ),
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('spawn failed');

    expect(execRunner).toHaveBeenCalledTimes(1);
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: null,
      latest_turn_id: null,
      latest_session_id: null,
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'exec_runner_failed',
      failure_diagnosis: {
        diagnostic_category: 'provider_runtime',
        source: 'exec_runner',
        observed_at: '2026-03-21T09:00:01.000Z'
      }
    });
    expect(JSON.stringify(written.failure_diagnosis)).toContain('spawn failed');
  });

  it('classifies ENOENT launches with a valid runtime workspace as explicit runtime parity failures', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const execRunner = vi.fn(async () => {
      const error = new Error('spawn failed') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () =>
            createRuntimeContext({
              selected_mode: 'cli',
              provider: 'CliRuntimeProvider'
            })
          ),
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('spawn failed');

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'runtime_parity_command_unavailable',
      failure_diagnosis: {
        diagnostic_category: 'provider_runtime',
        source: 'exec_runner',
        observed_at: '2026-03-21T09:00:01.000Z'
      }
    });
    expect(JSON.stringify(written.failure_diagnosis)).toContain('ENOENT');
  });

  it('does not relabel unrelated ENOENT exec failures as runtime parity failures', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const missingRepoRoot = join(tempRoot ?? '', 'missing-repo-root');
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: missingRepoRoot
      }),
      'utf8'
    );
    const execRunner = vi.fn(async () => {
      const error = new Error('spawn failed') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: missingRepoRoot,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () =>
            createRuntimeContext({
              requested_mode: 'cli',
              selected_mode: 'cli',
              provider: 'CliRuntimeProvider'
            })
          ),
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('spawn failed');

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'exec_runner_failed'
    });
  });

  it('preserves prior-turn telemetry when a resumed execRunner rejects before new turn data arrives', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    let execCallCount = 0;
    const execRunner = vi.fn(async (request) => {
      execCallCount += 1;
      if (execCallCount === 1) {
        await appendStaySerialParallelizationDecisionAuditForRequest(request, {
          turnIndex: 1
        });
        return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":12,"output_tokens":8,"total_tokens":20}},"rate_limits":{"primary":{"used_percent":12.5,"window_minutes":300},"secondary":{"used_percent":48,"window_minutes":10080}}}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
        };
      }
      throw new Error('spawn failed');
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '2'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('spawn failed');

    expect(execRunner).toHaveBeenCalledTimes(2);
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      },
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'exec_runner_failed'
    });
  }, 20_000);

  it('preserves a freshly discovered thread id while clearing stale telemetry when a resumed execRunner rejects before new turn context arrives', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    let execCallCount = 0;
    const writeProof = vi.fn(async (path: string, proof: ProviderLinearWorkerProof) => {
      await writeFile(path, JSON.stringify(proof), 'utf8');
    });
    const execRunner = vi.fn(
      async (request: Parameters<ProviderLinearWorkerDependencies['execRunner']>[0]) => {
        execCallCount += 1;
        if (execCallCount === 1) {
          await appendStaySerialParallelizationDecisionAuditForRequest(request, {
            turnIndex: 1
          });
          return {
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":12,"output_tokens":8,"total_tokens":20}},"rate_limits":{"primary":{"used_percent":12.5,"window_minutes":300},"secondary":{"used_percent":48,"window_minutes":10080}}}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: ''
          };
        }
        request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-2"}\n');
        throw new Error('spawn failed');
      }
    );

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '2'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner,
          writeProof,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('spawn failed');

    expect(execRunner).toHaveBeenCalledTimes(2);
    const liveTurnRunningProof = [...writeProof.mock.calls]
      .map(([, proof]) => proof)
      .reverse()
      .find(
        (proof) =>
          proof.owner_phase === 'turn_running' &&
          proof.thread_id === 'thread-2'
      );
    expect(liveTurnRunningProof).toMatchObject({
      thread_id: 'thread-2',
      latest_turn_id: null,
      latest_session_id: null,
      last_event: null,
      last_message: null,
      last_event_at: null,
      current_turn_activity: null,
      owner_phase: 'turn_running',
      owner_status: 'in_progress'
    });
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-2',
      latest_turn_id: null,
      latest_session_id: null,
      last_event: null,
      last_message: null,
      last_event_at: null,
      current_turn_activity: null,
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      },
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'exec_runner_failed'
    });
  }, 20_000);

  it('waits for queued live proof writes before persisting an execRunner failure', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    let releaseLiveProofWrite: (() => void) | null = null;
    const liveProofWriteBlocked = new Promise<void>((resolve) => {
      releaseLiveProofWrite = resolve;
    });
    const writeProof = vi.fn(async (path: string, proof: ProviderLinearWorkerProof) => {
      if (proof.owner_phase === 'turn_running' && proof.latest_turn_id === 'turn-1') {
        await liveProofWriteBlocked;
      }
      await writeFile(path, JSON.stringify(proof), 'utf8');
    });
    const execRunner = vi.fn(async (request: Parameters<ProviderLinearWorkerDependencies['execRunner']>[0]) => {
      request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
      request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-1"}}\n');
      request.onStdoutChunk?.(
        '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active","timestamp":"2026-03-21T09:00:00.500Z"}}\n'
      );
      throw new Error('spawn failed');
    });

    const workerPromise = runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        writeProof,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    await vi.waitFor(() => {
      expect(writeProof).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          owner_phase: 'turn_running',
          latest_turn_id: 'turn-1'
        })
      );
    });
    releaseLiveProofWrite?.();

    await expect(workerPromise).rejects.toThrow('spawn failed');

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      last_message: 'Worker turn active',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'exec_runner_failed'
    });
    expect(writeProof.mock.calls.at(-1)?.[1]).toMatchObject({
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'exec_runner_failed'
    });
  });

  it('fails closed when a codex turn does not emit thread_id', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 0,
            stdout: '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('provider-linear-worker could not determine thread_id from Codex JSONL output.');

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      latest_turn_id: 'turn-1',
      latest_session_id: null,
      owner_status: 'failed',
      end_reason: 'thread_id_missing'
    });
  });

  it('fails closed when a turn records multiple same-issue parallelization decisions', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'parallelize_now',
              reason: 'independent_scope_available',
              summary: 'Launch a bounded implementation child lane.',
              recordedAt: '2026-03-21T09:00:03.100Z'
            });
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'stay_serial',
              reason: 'single_bounded_change',
              summary: 'Actually keep it serial.',
              recordedAt: '2026-03-21T09:00:03.200Z'
            });
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:02.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker requires exactly one current-turn same-issue parallelization decision'
    );

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'parallelization_decision_multiple',
      parallelization: {
        decision: 'stay_serial',
        reason: 'single_bounded_change'
      },
      linear_audit: {
        parallelization_entries: expect.arrayContaining([
          expect.objectContaining({
            action: 'parallelize_now',
            state: 'independent_scope_available'
          }),
          expect.objectContaining({
            action: 'stay_serial',
            state: 'single_bounded_change'
          })
        ])
      }
    });
  });

  it('ignores earlier-turn parallelization decisions when enforcing the current turn', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    await appendStaySerialParallelizationDecisionAudit(runDir, {
      turnIndex: 1,
      recordedAt: '2026-03-21T08:58:00.000Z'
    });
    await appendStaySerialParallelizationDecisionAudit(runDir, {
      turnIndex: 2,
      recordedAt: '2026-03-21T08:59:00.000Z'
    });

    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(createTrackedIssue())
      .mockResolvedValueOnce(createTrackedIssue({
        state: 'Done',
        state_type: 'completed'
      }));
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        turnIndex: 3,
        recordedAt: '2026-03-21T09:00:03.100Z'
      });
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:03.500Z"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi.fn(() => '2026-03-21T09:00:00.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      owner_phase: 'ended',
      owner_status: 'succeeded',
      end_reason: 'issue_inactive',
      parallelization: {
        decision: 'stay_serial',
        reason: 'single_bounded_change',
        recorded_at: '2026-03-21T09:00:03.100Z'
      },
      linear_audit: {
        parallelization_entries: [
          expect.objectContaining({ recorded_at: '2026-03-21T08:58:00.000Z' }),
          expect.objectContaining({ recorded_at: '2026-03-21T08:59:00.000Z' }),
          expect.objectContaining({ recorded_at: '2026-03-21T09:00:03.100Z' })
        ]
      }
    });
  });

  it('fails closed when parallelize_now only records a failed child lane run', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'parallelize_now',
              reason: 'independent_scope_available',
              summary: 'Launch a bounded implementation child lane.',
              recordedAt: '2026-03-21T09:00:03.100Z'
            });
            await appendProviderLinearWorkerChildLaneRecord(runDir, {
              stream: 'impl-a',
              pipeline_id: 'provider-linear-child-lane',
              task_id: 'linear-lin-issue-1-impl-a',
              run_id: 'child-run-1',
              status: 'failed',
              manifest_path: join(
                tempRoot ?? '',
                '.runs',
                'linear-lin-issue-1-impl-a',
                'cli',
                'child-run-1',
                'manifest.json'
              ),
              artifact_root: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1',
              log_path: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1/run.log',
              summary: 'child lane failed',
              issue_id: 'lin-issue-1',
              issue_identifier: 'CO-2',
              workspace_path: tempRoot,
              source_setup: null,
              launched_at: '2026-03-21T09:00:03.150Z',
              purpose: 'Implement bounded same-issue child lanes',
              instructions: null,
              scope: {
                files: ['orchestrator/src/cli/providerLinearWorkerRunner.ts'],
                phases: []
              },
              parent_snapshot: {
                base_sha: 'parent-base-sha',
                issue_updated_at: '2026-03-21T09:00:00.000Z',
                issue_state: 'In Progress',
                issue_state_type: 'started',
                captured_at: '2026-03-21T09:00:03.150Z'
              },
              lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
              patch_artifact_path: null,
              patch_bytes: null,
              decision: 'pending',
              decision_at: null,
              decision_reason: null
            });
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker recorded `parallelize_now` for the current turn, but no same-issue child lane launched during that turn completed successfully.'
    );

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'parallelization_launch_missing',
      parallelization: {
        decision: 'parallelize_now',
        reason: 'independent_scope_available'
      },
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a',
          status: 'failed'
        })
      ])
    });
  });

  it('accepts parallelize_now when a same-turn child lane succeeds', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner: vi.fn(async (request) => {
          await appendParallelizationDecisionAuditForRequest(request, {
            decision: 'parallelize_now',
            reason: 'independent_scope_available',
            summary: 'Launch a bounded implementation child lane.',
            recordedAt: '2026-03-21T09:00:03.050Z'
          });
          await appendProviderLinearWorkerChildLaneRecord(runDir, {
            stream: 'impl-a',
            pipeline_id: 'provider-linear-child-lane',
            task_id: 'linear-lin-issue-1-impl-a',
            run_id: 'child-run-1',
            status: 'succeeded',
            manifest_path: join(
              tempRoot ?? '',
              '.runs',
              'linear-lin-issue-1-impl-a',
              'cli',
              'child-run-1',
              'manifest.json'
            ),
            artifact_root: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1',
            log_path: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1/run.log',
            summary: 'child lane completed successfully',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-2',
            workspace_path: tempRoot,
            source_setup: null,
            launched_at: '2026-03-21T09:00:03.150Z',
            purpose: 'Implement bounded same-issue child lanes',
            instructions: null,
            scope: {
              files: ['orchestrator/src/cli/providerLinearWorkerRunner.ts'],
              phases: []
            },
            parent_snapshot: {
              base_sha: 'parent-base-sha',
              issue_updated_at: '2026-03-21T09:00:00.000Z',
              issue_state: 'In Progress',
              issue_state_type: 'started',
              captured_at: '2026-03-21T09:00:03.150Z'
            },
            lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
            patch_artifact_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1.patch'),
            patch_bytes: 42,
            decision: 'accepted',
            decision_at: '2026-03-21T09:00:03.200Z',
            decision_reason: 'Applied bounded implementation patch.'
          });
          return {
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
            ].join('\n'),
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:03.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active',
      parallelization: {
        decision: 'parallelize_now',
        reason: 'independent_scope_available',
        child_lane_count: 1
      },
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a',
          status: 'succeeded',
          launched_at: '2026-03-21T09:00:03.150Z'
        })
      ])
    });

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active',
      parallelization: {
        decision: 'parallelize_now',
        reason: 'independent_scope_available',
        child_lane_count: 1
      },
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a',
          status: 'succeeded',
          launched_at: '2026-03-21T09:00:03.150Z'
        })
      ])
    });
  });

  it('fails closed when only a previously launched child lane turns succeeded during the current turn', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      stream: 'impl-a',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-impl-a',
      run_id: 'child-run-1',
      status: 'pending',
      manifest_path: join(
        tempRoot ?? '',
        '.runs',
        'linear-lin-issue-1-impl-a',
        'cli',
        'child-run-1',
        'manifest.json'
      ),
      artifact_root: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1',
      log_path: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1/run.log',
      summary: 'child lane still running',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-03-21T08:59:59.000Z',
      purpose: 'Implement bounded same-issue child lanes',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearWorkerRunner.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-21T08:59:59.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-21T08:59:59.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'pending',
      decision_at: null,
      decision_reason: null
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'parallelize_now',
              reason: 'independent_scope_available',
              summary: 'Assume the prior child lane is enough.',
              recordedAt: '2026-03-21T09:00:03.100Z'
            });
            await transactProviderLinearWorkerChildLanes(runDir, async (records) => ({
              records: records.map((record) =>
                record.stream === 'impl-a'
                  ? {
                      ...record,
                      status: 'succeeded',
                      summary: 'previous-turn child lane finished'
                    }
                  : record
              ),
              result: null
            }));
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker recorded `parallelize_now` for the current turn, but no same-issue child lane launched during that turn completed successfully.'
    );

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'parallelization_launch_missing',
      parallelization: {
        decision: 'parallelize_now',
        reason: 'independent_scope_available'
      },
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a',
          status: 'succeeded',
          launched_at: '2026-03-21T08:59:59.000Z'
        })
      ])
    });
  });

  const buildRetryRecoveryChildLane = (
    overrides: Partial<Parameters<typeof appendProviderLinearWorkerChildLaneRecord>[1]> = {}
  ): Parameters<typeof appendProviderLinearWorkerChildLaneRecord>[1] => {
    const stream = overrides.stream ?? 'impl-a';
    const runId = overrides.run_id ?? 'child-run-1';
    const taskId = overrides.task_id ?? `linear-lin-issue-1-${stream}`;
    return {
      stream,
      pipeline_id: 'provider-linear-child-lane',
      task_id: taskId,
      run_id: runId,
      status: 'succeeded',
      manifest_path: join(tempRoot ?? '', '.runs', taskId, 'cli', runId, 'manifest.json'),
      artifact_root: `.runs/${taskId}/cli/${runId}`,
      log_path: `.runs/${taskId}/cli/${runId}/run.log`,
      summary: 'prior-attempt child lane completed successfully',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-03-21T08:59:59.000Z',
      purpose: 'Implement bounded same-issue child lanes',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearWorkerRunner.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-21T08:59:59.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-21T08:59:59.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', `${stream}-${runId}`),
      patch_artifact_path: join(tempRoot ?? '', '.child-lanes', `${stream}-${runId}.patch`),
      patch_bytes: 42,
      decision: 'pending',
      decision_at: null,
      decision_reason: null,
      ...overrides
    };
  };

  it('recovers a prior-attempt child lane launched just before its ordinary decision lineage', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const targetLineage = buildTestDecisionLineage();

    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch an unrelated docs child lane.',
      recordedAt: '2026-03-21T08:50:00.000Z',
      decisionLineage: buildTestDecisionLineage({
        parent_run_id: 'stale-run-1',
        parent_turn_started_at: '2026-03-21T08:49:50.000Z',
        parent_turn_id: 'stale-turn-1',
        decision_id: 'provider-linear-parallelization:stale-run-1:stale-turn-1:2026-03-21T08_50_00.000Z',
        decision_recorded_at: '2026-03-21T08:50:00.000Z'
      })
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, buildRetryRecoveryChildLane({
      stream: 'docs-old',
      run_id: 'child-run-old',
      launched_at: '2026-03-21T08:50:00.500Z',
      summary: 'older unrelated child lane completed successfully',
      decision_lineage: buildTestDecisionLineage({
        parent_run_id: 'stale-run-1',
        parent_turn_started_at: '2026-03-21T08:49:50.000Z',
        parent_turn_id: 'stale-turn-1',
        decision_id: 'provider-linear-parallelization:stale-run-1:stale-turn-1:2026-03-21T08_50_00.000Z',
        decision_recorded_at: '2026-03-21T08:50:00.000Z'
      })
    }));
    await appendProviderLinearWorkerChildLaneRecord(runDir, buildRetryRecoveryChildLane({
      launched_at: '2026-03-21T08:59:45.000Z',
      summary: 'target child lane completed before decision audit but shares durable lineage',
      decision_lineage: targetLineage
    }));
    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch impl-a.',
      recordedAt: '2026-03-21T08:59:59.500Z',
      decisionLineage: targetLineage
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner: vi.fn(async (request) => {
          await appendParallelizationDecisionAuditForRequest(request, {
            decision: 'parallelize_now',
            reason: 'independent_scope_available',
            summary:
              'Recover the prior completed lane. recover_child_lane:impl-a recover_run:child-run-1',
            recordedAt: '2026-03-21T09:00:03.100Z'
          });
          return {
            exitCode: 0,
            stdout: PROVIDER_WORKER_TASK_COMPLETE_STDOUT,
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:03.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active',
      parallelization: {
        decision: 'parallelize_now',
        reason: 'independent_scope_available',
        child_lane_count: 1
      },
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a',
          run_id: 'child-run-1',
          status: 'succeeded',
          decision: 'pending',
          launched_at: '2026-03-21T08:59:45.000Z',
          decision_lineage: expect.objectContaining({
            parent_run_id: 'prior-run-1',
            parent_turn_started_at: '2026-03-21T08:59:45.000Z',
            decision_id: expect.any(String)
          })
        })
      ])
    });
    expect(proof.parallelization?.recovered_child_lanes).toEqual([
      expect.objectContaining({
        stream: 'impl-a',
        run_id: 'child-run-1',
        recovery_source: 'decision_lineage',
        child_decision_lineage: expect.objectContaining({
          parent_run_id: 'prior-run-1',
          parent_turn_started_at: '2026-03-21T08:59:45.000Z'
        }),
        parallelization_decision_lineage: expect.objectContaining({
          parent_run_id: 'prior-run-1',
          parent_turn_started_at: '2026-03-21T08:59:45.000Z'
        })
      })
    ]);
  });

  it('fails closed when a prior successful pending child lane is not named by the retry decision', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch a bounded implementation child lane.',
      recordedAt: '2026-03-21T08:59:58.500Z'
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, buildRetryRecoveryChildLane());

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'parallelize_now',
              reason: 'independent_scope_available',
              summary: 'Launch a different tests child lane.',
              recordedAt: '2026-03-21T09:00:03.100Z'
            });
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker recorded `parallelize_now` for the current turn, but no same-issue child lane launched during that turn completed successfully.'
    );
  });

  it('fails closed when retry recovery markers only extend or swap prior child lanes', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch a bounded implementation child lane.',
      recordedAt: '2026-03-21T08:59:58.500Z'
    });
    const priorChildLane = buildRetryRecoveryChildLane({
      stream: 'impl',
      task_id: 'linear-lin-issue-1-impl'
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, priorChildLane);
    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      ...priorChildLane,
      stream: 'impl-b',
      task_id: 'linear-lin-issue-1-impl-b',
      run_id: 'child-run-2'
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'parallelize_now',
              reason: 'independent_scope_available',
              summary:
                'Recover prior pending child lanes. recover_child_lane:impl recover_run:child-run-2 recover_child_lane:impl-b recover_run:child-run-1:retry',
              recordedAt: '2026-03-21T09:00:03.100Z'
            });
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker recorded `parallelize_now` for the current turn, but no same-issue child lane launched during that turn completed successfully.'
    );
  });

  it('fails closed when retry recovery markers name a same-attempt earlier-turn child lane', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch a bounded implementation child lane in this attempt.',
      recordedAt: '2026-03-21T09:00:00.500Z'
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, buildRetryRecoveryChildLane({
      launched_at: '2026-03-21T09:00:01.000Z',
      summary: 'same-attempt earlier-turn child lane completed successfully',
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-21T09:00:01.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-21T09:00:01.000Z'
      }
    }));

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'parallelize_now',
              reason: 'independent_scope_available',
              summary:
                'Recover markers are present, but this lane belongs to the same attempt. recover_child_lane:impl-a recover_run:child-run-1',
              recordedAt: '2026-03-21T09:00:03.100Z'
            });
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker recorded `parallelize_now` for the current turn, but no same-issue child lane launched during that turn completed successfully.'
    );
  });

  async function expectPriorRecoveryFailsClosed(options: {
    historicalRecordedAt?: string;
    latestSummary?: string;
    latestDecisionLineage?: ProviderLinearDecisionLineage | null;
    childLane?: Partial<Parameters<typeof appendProviderLinearWorkerChildLaneRecord>[1]>;
  } = {}) {
    const { manifestPath, runDir } = await createManifestRoot();
    if (options.historicalRecordedAt) {
      await appendParallelizationDecisionAudit(runDir, {
        decision: 'parallelize_now',
        reason: 'independent_scope_available',
        summary: 'Launch impl-a.',
        recordedAt: options.historicalRecordedAt
      });
    }
    await appendProviderLinearWorkerChildLaneRecord(runDir, buildRetryRecoveryChildLane(options.childLane));
    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary:
        options.latestSummary ??
        'Recover a different lane. recover_child_lane:impl-b recover_run:child-run-2',
      recordedAt: '2026-03-21T08:59:59.500Z',
      decisionLineage: options.latestDecisionLineage
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'parallelize_now',
              reason: 'independent_scope_available',
              summary:
                'Do not recover stale older output. recover_child_lane:impl-a recover_run:child-run-1',
              recordedAt: '2026-03-21T09:00:03.100Z'
            });
            return {
              exitCode: 0,
              stdout: PROVIDER_WORKER_TASK_COMPLETE_STDOUT,
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker recorded `parallelize_now` for the current turn, but no same-issue child lane launched during that turn completed successfully.'
    );
  }

  it('fails closed when latest prior recovery names a different child lane', async () => {
    await expectPriorRecoveryFailsClosed();
  });

  it('fails closed when latest prior recovery repeats a stale child lane without launch lineage', async () => {
    await expectPriorRecoveryFailsClosed({
      historicalRecordedAt: '2026-03-21T08:59:59.500Z', childLane: { launched_at: '2026-03-21T08:50:01.000Z' },
      latestSummary: 'Do not recover stale older output. recover_child_lane:impl-a recover_run:child-run-1'
    });
  });

  it('fails closed when a stale child lane predates the latest ordinary launch decision', async () => {
    await expectPriorRecoveryFailsClosed({
      childLane: { launched_at: '2026-03-21T08:59:56.000Z' },
      latestSummary: 'Launch a later unrelated tests child lane.'
    });
  });

  it('fails closed when recovery markers target an older child lane with mismatched decision lineage', async () => {
    await expectPriorRecoveryFailsClosed({
      historicalRecordedAt: '2026-03-21T08:50:00.000Z',
      latestDecisionLineage: buildTestDecisionLineage({
        parent_run_id: 'newer-prior-run',
        parent_turn_started_at: '2026-03-21T08:59:55.000Z',
        parent_turn_id: 'newer-prior-turn',
        decision_id: 'provider-linear-parallelization:newer-prior-run:newer-prior-turn:2026-03-21T08_59_59.500Z'
      }),
      childLane: {
        launched_at: '2026-03-21T08:59:59.000Z',
        summary: 'stale older implementation child lane completed successfully',
        decision_lineage: buildTestDecisionLineage({
          parent_run_id: 'stale-prior-run',
          parent_turn_started_at: '2026-03-21T08:59:55.000Z',
          parent_turn_id: 'stale-prior-turn',
          decision_id: 'provider-linear-parallelization:stale-prior-run:stale-prior-turn:2026-03-21T08_59_59.500Z'
        })
      },
      latestSummary: 'Launch a later unrelated tests child lane.'
    });
  });

  it.each(['accepted', 'rejected', 'invalidated'] as const)(
    'fails closed when recovery markers target a prior child lane already %s',
    async (decision) => {
      await expectPriorRecoveryFailsClosed({
        childLane: {
          decision,
          decision_at: '2026-03-21T08:59:59.250Z',
          decision_reason: `Parent already ${decision} this child lane.`
        },
        latestSummary: 'Launch impl-a.'
      });
    }
  );

  it('recovers a prior-attempt completed pending child lane after an intervening serial decision', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch an earlier unrelated implementation child lane.',
      recordedAt: '2026-03-21T08:50:00.000Z'
    });
    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch a bounded implementation child lane.',
      recordedAt: '2026-03-21T08:59:59.500Z'
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, buildRetryRecoveryChildLane({
      status: 'pending',
      summary: 'child lane still running'
    }));
    await appendParallelizationDecisionAudit(runDir, {
      decision: 'stay_serial',
      reason: 'existing_child_lane_active',
      summary: 'cap_exhausted: 1/2 active child lanes; impl-a still running.',
      recordedAt: '2026-03-21T08:59:59.750Z'
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner: vi.fn(async (request) => {
          await appendParallelizationDecisionAuditForRequest(request, {
            decision: 'parallelize_now',
            reason: 'independent_scope_available',
            summary:
              'Recover the prior pending child lane instead of launching a duplicate. `recover_child_lane:impl-a`, `recover_run:child-run-1`.',
            recordedAt: '2026-03-21T09:00:03.100Z'
          });
          await transactProviderLinearWorkerChildLanes(runDir, async (records) => ({
            records: records.map((record) =>
              record.stream === 'impl-a'
                ? {
                    ...record,
                    status: 'completed',
                    summary: 'prior-attempt child lane reported completed'
                  }
                : record
            ),
            result: null
          }));
          return {
            exitCode: 0,
            stdout: PROVIDER_WORKER_TASK_COMPLETE_STDOUT,
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:03.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active',
      parallelization: {
        decision: 'parallelize_now',
        reason: 'independent_scope_available',
        child_lane_count: 1
      },
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a',
          status: 'completed',
          launched_at: '2026-03-21T08:59:59.000Z',
          decision: 'pending'
        })
      ])
    });
  });

  it('uses a latest recovery snapshot naming the child lane as the lineage boundary', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const targetLineage = buildTestDecisionLineage({
      parent_run_id: 'prior-recovery-run',
      parent_turn_started_at: '2026-03-21T09:00:03.000Z',
      parent_turn_id: 'prior-recovery-turn',
      decision_id: 'provider-linear-parallelization:prior-recovery-run:prior-recovery-turn:2026-03-21T09_00_03.100Z',
      decision_recorded_at: '2026-03-21T09:00:03.100Z'
    });

    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch a stale unrelated implementation child lane.',
      recordedAt: '2026-03-21T08:59:59.500Z',
      decisionLineage: buildTestDecisionLineage({
        parent_run_id: 'stale-prior-run',
        parent_turn_started_at: '2026-03-21T08:59:55.000Z',
        parent_turn_id: 'stale-prior-turn',
        decision_id: 'provider-linear-parallelization:stale-prior-run:stale-prior-turn:2026-03-21T08_59_59.500Z'
      })
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, buildRetryRecoveryChildLane({
      launched_at: '2026-03-21T08:59:59.000Z',
      decision_lineage: targetLineage
    }));
    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary:
        'Recover impl-a after a prior retry. recover_child_lane:impl-a recover_run:child-run-1',
      recordedAt: '2026-03-21T09:00:03.100Z',
      decisionLineage: targetLineage
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner: vi.fn(async (request) => {
          await appendParallelizationDecisionAuditForRequest(request, {
            decision: 'parallelize_now',
            reason: 'independent_scope_available',
            summary:
              'Recover the same prior pending child lane again. recover_child_lane:impl-a recover_run:child-run-1',
            recordedAt: '2026-03-21T09:00:12.100Z'
          });
          return {
            exitCode: 0,
            stdout: PROVIDER_WORKER_TASK_COMPLETE_STDOUT,
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:10.000Z')
          .mockReturnValue('2026-03-21T09:00:12.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof.parallelization?.recovered_child_lanes).toEqual([
      expect.objectContaining({
        stream: 'impl-a',
        run_id: 'child-run-1',
        recovery_source: 'decision_lineage',
        parallelization_decision_lineage: expect.objectContaining({
          parent_run_id: 'prior-recovery-run',
          parent_turn_id: 'prior-recovery-turn'
        })
      })
    ]);
  });

  it('recovers a prior-attempt successful pending child lane across repeated retries before acceptance', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch a bounded implementation child lane.',
      recordedAt: '2026-03-21T08:59:58.500Z'
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, buildRetryRecoveryChildLane());
    await appendParallelizationDecisionAudit(runDir, {
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary:
        'Recover a different pending child lane first. recover_child_lane:impl-b recover_run:child-run-2',
      recordedAt: '2026-03-21T09:00:03.100Z'
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner: vi.fn(async (request) => {
          await appendParallelizationDecisionAuditForRequest(request, {
            decision: 'parallelize_now',
            reason: 'independent_scope_available',
            summary:
              'Recover the same prior pending child lane again. recover_child_lane:impl-a recover_run:child-run-1',
            recordedAt: '2026-03-21T09:00:12.100Z'
          });
          return {
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:13.000Z"}}'
            ].join('\n'),
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:10.000Z')
          .mockReturnValue('2026-03-21T09:00:12.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active',
      parallelization: {
        decision: 'parallelize_now',
        reason: 'independent_scope_available',
        child_lane_count: 1
      },
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a',
          status: 'succeeded',
          launched_at: '2026-03-21T08:59:59.000Z',
          decision: 'pending'
        })
      ])
    });
  });

  it('treats an unfractional same-second child-lane timestamp as earlier than the current turn start', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      stream: 'impl-a',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-impl-a',
      run_id: 'child-run-1',
      status: 'pending',
      manifest_path: join(
        tempRoot ?? '',
        '.runs',
        'linear-lin-issue-1-impl-a',
        'cli',
        'child-run-1',
        'manifest.json'
      ),
      artifact_root: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1',
      log_path: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1/run.log',
      summary: 'child lane still running',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-03-21T09:00:03Z',
      purpose: 'Implement bounded same-issue child lanes',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearWorkerRunner.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-21T09:00:03Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-21T09:00:03Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'pending',
      decision_at: null,
      decision_reason: null
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'parallelize_now',
              reason: 'independent_scope_available',
              summary: 'Assume the prior child lane is enough.',
              recordedAt: '2026-03-21T09:00:03.100Z'
            });
            await transactProviderLinearWorkerChildLanes(runDir, async (records) => ({
              records: records.map((record) =>
                record.stream === 'impl-a'
                  ? {
                      ...record,
                      status: 'succeeded',
                      summary: 'previous-turn child lane finished'
                    }
                  : record
              ),
              result: null
            }));
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.050Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker recorded `parallelize_now` for the current turn, but no same-issue child lane launched during that turn completed successfully.'
    );

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'parallelization_launch_missing',
      parallelization: {
        decision: 'parallelize_now',
        reason: 'independent_scope_available'
      },
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a',
          status: 'succeeded',
          launched_at: '2026-03-21T09:00:03Z'
        })
      ])
    });
  });

  it('fails closed when the current-turn parallelization audit row belongs to another issue', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              issueId: 'lin-issue-2',
              issueIdentifier: 'CO-999',
              decision: 'stay_serial',
              reason: 'single_bounded_change',
              summary: 'Wrong issue id.',
              recordedAt: '2026-03-21T09:00:00.900Z'
            });
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:02.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker requires an explicit current-turn parallelization decision'
    );

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'parallelization_decision_missing',
      parallelization: null,
      linear_audit: {
        parallelization_entries: expect.arrayContaining([
          expect.objectContaining({
            issue_id: 'lin-issue-2',
            action: 'stay_serial',
            state: 'single_bounded_change'
          })
        ])
      }
    });
  });

  it('fails closed when stay_serial still launches a same-turn child lane', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'stay_serial',
              reason: 'single_bounded_change',
              summary: 'Stay serial this turn.',
              recordedAt: '2026-03-21T09:00:03.050Z'
            });
            await appendProviderLinearWorkerChildLaneRecord(runDir, {
              stream: 'impl-a',
              pipeline_id: 'provider-linear-child-lane',
              task_id: 'linear-lin-issue-1-impl-a',
              run_id: 'child-run-2',
              status: 'succeeded',
              manifest_path: join(
                tempRoot ?? '',
                '.runs',
                'linear-lin-issue-1-impl-a',
                'cli',
                'child-run-2',
                'manifest.json'
              ),
              artifact_root: '.runs/linear-lin-issue-1-impl-a/cli/child-run-2',
              log_path: '.runs/linear-lin-issue-1-impl-a/cli/child-run-2/run.log',
              summary: 'child lane unexpectedly launched',
              issue_id: 'lin-issue-1',
              issue_identifier: 'CO-2',
              workspace_path: tempRoot,
              source_setup: null,
              launched_at: '2026-03-21T09:00:03.150Z',
              purpose: 'Implement bounded same-issue child lanes',
              instructions: null,
              scope: {
                files: ['orchestrator/src/cli/providerLinearWorkerRunner.ts'],
                phases: []
              },
              parent_snapshot: {
                base_sha: 'parent-base-sha',
                issue_updated_at: '2026-03-21T09:00:00.000Z',
                issue_state: 'In Progress',
                issue_state_type: 'started',
                captured_at: '2026-03-21T09:00:03.150Z'
              },
              lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-2'),
              patch_artifact_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-2.patch'),
              patch_bytes: 42,
              decision: 'pending',
              decision_at: null,
              decision_reason: null
            });
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker recorded `stay_serial` for the current turn, but same-issue child lanes were still launched during that turn.'
    );

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'parallelization_serial_conflict',
      parallelization: {
        decision: 'stay_serial',
        reason: 'single_bounded_change'
      },
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a',
          status: 'succeeded',
          launched_at: '2026-03-21T09:00:03.150Z'
        })
      ])
    });
  });

  it('fails closed when forbid_parallel still launches a same-turn child lane', async () => {
    const { manifestPath, runDir } = await createManifestRoot();

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue()),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendParallelizationDecisionAuditForRequest(request, {
              decision: 'forbid_parallel',
              reason: 'blocked_by_dependency',
              summary: 'Dependent work blocks safe parallel execution.',
              recordedAt: '2026-03-21T09:00:03.050Z'
            });
            await appendProviderLinearWorkerChildLaneRecord(runDir, {
              stream: 'impl-a',
              pipeline_id: 'provider-linear-child-lane',
              task_id: 'linear-lin-issue-1-impl-a',
              run_id: 'child-run-2',
              status: 'succeeded',
              manifest_path: join(
                tempRoot ?? '',
                '.runs',
                'linear-lin-issue-1-impl-a',
                'cli',
                'child-run-2',
                'manifest.json'
              ),
              artifact_root: '.runs/linear-lin-issue-1-impl-a/cli/child-run-2',
              log_path: '.runs/linear-lin-issue-1-impl-a/cli/child-run-2/run.log',
              summary: 'child lane unexpectedly launched',
              issue_id: 'lin-issue-1',
              issue_identifier: 'CO-2',
              workspace_path: tempRoot,
              source_setup: null,
              launched_at: '2026-03-21T09:00:03.150Z',
              purpose: 'Implement bounded same-issue child lanes',
              instructions: null,
              scope: {
                files: ['orchestrator/src/cli/providerLinearWorkerRunner.ts'],
                phases: []
              },
              parent_snapshot: {
                base_sha: 'parent-base-sha',
                issue_updated_at: '2026-03-21T09:00:00.000Z',
                issue_state: 'In Progress',
                issue_state_type: 'started',
                captured_at: '2026-03-21T09:00:03.150Z'
              },
              lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-2'),
              patch_artifact_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-2.patch'),
              patch_bytes: 42,
              decision: 'pending',
              decision_at: null,
              decision_reason: null
            });
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:03.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow(
      'provider-linear-worker recorded `forbid_parallel` for the current turn, but same-issue child lanes were still launched during that turn.'
    );

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'parallelization_serial_conflict',
      parallelization: {
        decision: 'forbid_parallel',
        reason: 'blocked_by_dependency'
      },
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a',
          status: 'succeeded',
          launched_at: '2026-03-21T09:00:03.150Z'
        })
      ])
    });
  });

  it('accepts forbid_parallel when the current turn launches no child lanes', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner: vi.fn(async (request) => {
          await appendParallelizationDecisionAuditForRequest(request, {
            decision: 'forbid_parallel',
            reason: 'blocked_by_dependency',
            summary: 'Dependent work blocks safe parallel execution.',
            recordedAt: '2026-03-21T09:00:03.050Z'
          });
          return {
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:00:04.000Z"}}'
            ].join('\n'),
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:03.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active',
      parallelization: {
        decision: 'forbid_parallel',
        reason: 'blocked_by_dependency',
        child_lane_count: 0
      },
      child_lanes: []
    });

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      latest_turn_id: 'turn-1',
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active',
      parallelization: {
        decision: 'forbid_parallel',
        reason: 'blocked_by_dependency',
        child_lane_count: 0
      },
      child_lanes: []
    });
  });

  it('fails closed when the initial tracked issue lookup fails before turn 1', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const execRunner = vi.fn();

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child'
        },
        {
          readTrackedIssue: vi.fn(async () => {
            throw new Error('tracked issue lookup failed');
          }),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('tracked issue lookup failed');

    expect(execRunner).not.toHaveBeenCalled();
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: null,
      latest_turn_id: null,
      latest_session_id: null,
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'tracked_issue_read_failed'
    });
  });

  it('fails closed when the tracked issue refresh fails after a completed turn', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(createTrackedIssue())
      .mockRejectedValueOnce(new Error('tracked issue lookup failed'));
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        recordedAt: '2026-03-21T09:00:03.100Z'
      });
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child'
        },
        {
          readTrackedIssue,
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('tracked issue lookup failed');

    expect(execRunner).toHaveBeenCalledTimes(1);
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'tracked_issue_read_failed'
    });
  });

  it('waits through a bounded tracked-issue rate-limit window and retries the reread once', async () => {
    const { manifestPath } = await createManifestRoot();
    const shortWaitRateLimit = new ProviderLinearTrackedIssueReadError('lin-issue-1', {
      kind: 'unavailable',
      status: 429,
      code: 'dispatch_source_unavailable',
      reason: 'dispatch_source_provider_rate_limited',
      message: 'Linear API rate limit exceeded.',
      retryable: true,
      details: {
        error_code: 'linear_rate_limited',
        retry_after_seconds: 2,
        requests_remaining: 0,
        request_id: 'req-worker-short'
      }
    });
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(createTrackedIssue())
      .mockRejectedValueOnce(shortWaitRateLimit)
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Done',
          state_type: 'completed',
          updated_at: '2026-03-21T09:00:02.000Z'
        })
      );
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });
    const waitForRateLimitReset = vi.fn(async () => undefined);

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        sleep: waitForRateLimitReset,
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:03.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    expect(readTrackedIssue).toHaveBeenCalledTimes(3);
    expect(waitForRateLimitReset.mock.calls.filter(([ms]) => ms === 2000)).toHaveLength(1);
    expect(proof).toMatchObject({
      owner_status: 'succeeded',
      end_reason: 'issue_inactive'
    });
    expect(proof.tracked_issue_error ?? null).toBeNull();
  });

  it('uses the exhausted reset bucket when retry-after is absent', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T10:00:00.000Z'));

    try {
      const { manifestPath } = await createManifestRoot();
      const shortEndpointWaitRateLimit = new ProviderLinearTrackedIssueReadError('lin-issue-1', {
        kind: 'unavailable',
        status: 429,
        code: 'dispatch_source_unavailable',
        reason: 'dispatch_source_provider_rate_limited',
        message: 'Linear API rate limit exceeded.',
        retryable: true,
        details: {
          error_code: 'linear_rate_limited',
          requests_remaining: 12,
          requests_reset_at: '2026-03-21T10:00:30.000Z',
          endpoint_requests_remaining: 0,
          endpoint_requests_reset_at: '2026-03-21T10:00:02.000Z',
          request_id: 'req-worker-endpoint-short'
        }
      });
      const readTrackedIssue = vi
        .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
        .mockResolvedValueOnce(createTrackedIssue())
        .mockRejectedValueOnce(shortEndpointWaitRateLimit)
        .mockResolvedValueOnce(
          createTrackedIssue({
            state: 'Done',
            state_type: 'completed'
          })
        );
      const execRunner = vi.fn(async (request) => {
        await appendStaySerialParallelizationDecisionAuditForRequest(request);
        return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
        };
      });
      const waitForRateLimitReset = vi.fn(async () => undefined);

      const proof = await runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child'
        },
        {
          readTrackedIssue,
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          sleep: waitForRateLimitReset,
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      );

      expect(execRunner).toHaveBeenCalledTimes(1);
      expect(readTrackedIssue).toHaveBeenCalledTimes(3);
      expect(waitForRateLimitReset.mock.calls.filter(([ms]) => ms === 2000)).toHaveLength(1);
      expect(proof).toMatchObject({
        owner_status: 'succeeded',
        end_reason: 'issue_inactive'
      });
      expect(proof.tracked_issue_error ?? null).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('waits for the latest unknown reset window when remaining headers are missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T10:00:00.000Z'));

    try {
      const { manifestPath } = await createManifestRoot();
      const mixedBucketRateLimit = new ProviderLinearTrackedIssueReadError('lin-issue-1', {
        kind: 'unavailable',
        status: 429,
        code: 'dispatch_source_unavailable',
        reason: 'dispatch_source_provider_rate_limited',
        message: 'Linear API rate limit exceeded.',
        retryable: true,
        details: {
          error_code: 'linear_rate_limited',
          requests_remaining: 0,
          requests_reset_at: '2026-03-21T10:00:02.000Z',
          endpoint_requests_reset_at: '2026-03-21T10:00:12.000Z',
          request_id: 'req-worker-mixed-buckets'
        }
      });
      const lateResetIssue = createTrackedIssue({
        state: 'Done',
        state_type: 'completed'
      });
      const waitForRateLimitReset = vi.fn(async () => undefined);
      const readTrackedIssue = vi
        .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
        .mockResolvedValueOnce(createTrackedIssue())
        .mockRejectedValueOnce(mixedBucketRateLimit)
        .mockImplementation(async () => {
          if (waitForRateLimitReset.mock.calls.some(([ms]) => ms === 12_000)) {
            return lateResetIssue;
          }
          throw mixedBucketRateLimit;
        });
      const execRunner = vi.fn(async (request) => {
        await appendStaySerialParallelizationDecisionAuditForRequest(request);
        return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
        };
      });

      const proof = await runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child'
        },
        {
          readTrackedIssue,
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          sleep: waitForRateLimitReset,
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      );

      expect(execRunner).toHaveBeenCalledTimes(1);
      expect(readTrackedIssue).toHaveBeenCalledTimes(3);
      expect(waitForRateLimitReset.mock.calls.filter(([ms]) => ms === 12_000)).toHaveLength(1);
      expect(proof).toMatchObject({
        owner_status: 'succeeded',
        end_reason: 'issue_inactive'
      });
      expect(proof.tracked_issue_error ?? null).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails explicitly as rate limited when the tracked issue refresh reset window is too long', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const longWaitRateLimit = new ProviderLinearTrackedIssueReadError('lin-issue-1', {
      kind: 'unavailable',
      status: 429,
      code: 'dispatch_source_unavailable',
      reason: 'dispatch_source_provider_rate_limited',
      message: 'Linear API rate limit exceeded.',
      retryable: true,
      details: {
        error_code: 'linear_rate_limited',
        retry_after_seconds: 3600,
        requests_remaining: 0,
        requests_reset_at: '2026-03-21T10:00:00.000Z',
        request_id: 'req-worker-long'
      }
    });
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(createTrackedIssue())
      .mockRejectedValueOnce(longWaitRateLimit);
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });
    const waitForRateLimitReset = vi.fn(async () => undefined);

    await expect(
      runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child'
        },
        {
          readTrackedIssue,
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          sleep: waitForRateLimitReset,
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      )
    ).rejects.toThrow('dispatch_source_provider_rate_limited');

    expect(execRunner).toHaveBeenCalledTimes(1);
    expect(waitForRateLimitReset.mock.calls.some(([ms]) => ms === 3_600_000)).toBe(false);
    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'tracked_issue_rate_limited',
      tracked_issue_error: {
        code: 'linear_rate_limited',
        reason: 'dispatch_source_provider_rate_limited',
        message: 'Linear API rate limit exceeded.',
        status: 429,
        retryable: true,
        details: {
          error_code: 'linear_rate_limited',
          retry_after_seconds: 3600,
          requests_remaining: 0,
          requests_reset_at: '2026-03-21T10:00:00.000Z',
          request_id: 'req-worker-long'
        }
      }
    });
  });

  it('does not launch a codex turn when the tracked issue is already inactive before turn 1', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const execRunner = vi.fn();

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child'
      },
      {
        readTrackedIssue: vi.fn(async () =>
          createTrackedIssue({
            state: 'Done',
            state_type: 'completed'
          })
        ),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).not.toHaveBeenCalled();
    expect(proof).toMatchObject({
      thread_id: null,
      latest_turn_id: null,
      latest_session_id: null,
      turn_count: 0,
      owner_status: 'succeeded',
      end_reason: 'issue_inactive'
    });

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: null,
      latest_turn_id: null,
      latest_session_id: null,
      turn_count: 0,
      end_reason: 'issue_inactive'
    });
  });

  it.each(['Human Review', 'In Review'])(
    'does not launch a codex turn when the tracked issue is already in %s before turn 1',
    async (reviewState) => {
      const { manifestPath, runDir } = await createManifestRoot();
      const execRunner = vi.fn();

      const proof = await runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child'
        },
        {
          readTrackedIssue: vi.fn(async () =>
            createTrackedIssue({
              state: reviewState,
              state_type: 'started'
            })
          ),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      );

      expect(execRunner).not.toHaveBeenCalled();
      expect(proof).toMatchObject({
        thread_id: null,
        latest_turn_id: null,
        latest_session_id: null,
        turn_count: 0,
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });

      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        thread_id: null,
        latest_turn_id: null,
        latest_session_id: null,
        turn_count: 0,
        end_reason: 'issue_review_handoff'
      });
    }
  );

  it.each(['Human Review', 'In Review'])(
    'stops after a completed turn when the tracked issue moves to %s',
    async (reviewState) => {
      const { manifestPath, runDir } = await createManifestRoot();
      const readTrackedIssue = vi
        .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
        .mockResolvedValueOnce(createTrackedIssue())
        .mockResolvedValueOnce(
          createTrackedIssue({
            state: reviewState,
            state_type: 'started'
          })
        );
      const execRunner = vi.fn(async (request) => {
        await appendStaySerialParallelizationDecisionAuditForRequest(request);
        return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
        };
      });

      const proof = await runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
        },
        {
          readTrackedIssue,
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner,
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      );

      expect(execRunner).toHaveBeenCalledTimes(1);
      expect(proof).toMatchObject({
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        turn_count: 1,
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });

      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        turn_count: 1,
        end_reason: 'issue_review_handoff'
      });
    }
  );

  it('stops after a completed turn when the tracked issue moves to Todo with a non-terminal blocker', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValueOnce(createTrackedIssue())
      .mockResolvedValueOnce(
        createTrackedIssue({
          state: 'Todo',
          state_type: 'unstarted',
          blocked_by: [
            {
              id: 'lin-issue-2',
              identifier: 'CO-3',
              state: 'In Progress',
              state_type: 'started'
            }
          ]
        })
      );
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    expect(proof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      turn_count: 1,
      owner_status: 'succeeded',
      end_reason: 'issue_inactive'
    });

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      turn_count: 1,
      end_reason: 'issue_inactive'
    });
  });

  it('records max_turns_reached_issue_still_active when the worker exhausts its budget', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValue(createTrackedIssue());

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner: vi.fn(async (request) => {
          await appendStaySerialParallelizationDecisionAuditForRequest(request);
          return {
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      turn_count: 1,
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active'
    });

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      end_reason: 'max_turns_reached_issue_still_active'
    });
  });

  it('persists the current turn count in live proof updates before the turn completes', async () => {
    const { manifestPath } = await createManifestRoot();
    const writeProof = vi.fn(async () => undefined);
    const execRunner = vi.fn(async (request: Parameters<ProviderLinearWorkerDependencies['execRunner']>[0]) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
      request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-1"}}\n');
      request.onStdoutChunk?.(
        '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}\n'
      );
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        writeProof,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    const liveTurnRunningProof = [...writeProof.mock.calls]
      .map(([, proof]) => proof)
      .reverse()
      .find((proof) => proof.owner_phase === 'turn_running' && proof.latest_turn_id === 'turn-1');

    expect(liveTurnRunningProof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      turn_count: 1,
      last_message: 'Worker turn active',
      owner_phase: 'turn_running',
      owner_status: 'in_progress'
    });
  });

  it('prefers the current session-thread hint when multiple appserver session logs match the same workspace', async () => {
    const { manifestPath } = await createManifestRoot();
    const issue = createTrackedIssue();
    const codexHome = join(tempRoot ?? '', '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(
      sessionDir,
      'rollout-2026-03-21T09-00-00-000Z-thread-1.jsonl'
    );
    const staleSessionLogPath = join(
      sessionDir,
      'rollout-2026-03-21T09-00-01-000Z-thread-10.jsonl'
    );
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      sessionLogPath,
      [
        `{"timestamp":"2026-03-21T09:00:00.000Z","type":"session_meta","payload":{"id":"thread-1","cwd":"${tempRoot}","source":"exec"}}`,
        `{"timestamp":"2026-03-21T09:00:00.050Z","type":"turn_context","payload":{"turn_id":"turn-1","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
        '{"timestamp":"2026-03-21T09:00:00.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":12,"output_tokens":8,"total_tokens":20}},"rate_limits":{"primary":{"used_percent":12.5,"window_minutes":300},"secondary":{"used_percent":48,"window_minutes":10080}}}}'
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      staleSessionLogPath,
      [
        `{"timestamp":"2026-03-21T09:00:01.000Z","type":"session_meta","payload":{"id":"thread-10","cwd":"${tempRoot}","source":"exec"}}`,
        `{"timestamp":"2026-03-21T09:00:01.050Z","type":"turn_context","payload":{"turn_id":"turn-10","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
        '{"timestamp":"2026-03-21T09:00:01.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":999,"output_tokens":1,"total_tokens":1000}},"rate_limits":{"primary":{"used_percent":99,"window_minutes":300},"secondary":{"used_percent":88,"window_minutes":10080}}}}'
      ].join('\n'),
      'utf8'
    );
    const hintedMtime = new Date('2026-03-21T09:00:01.000Z');
    const staleMtime = new Date('2026-03-21T09:00:02.000Z');
    await utimes(sessionLogPath, hintedMtime, hintedMtime);
    await utimes(staleSessionLogPath, staleMtime, staleMtime);

    const writeProof = vi.fn(async () => undefined);
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        exitCode: 0,
        stdout: '',
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_HOME: codexHome,
        CODEX_THREAD_ID: 'thread-1'
      },
      {
        readTrackedIssue: vi.fn(async () => issue),
        resolveRuntimeContext: vi.fn(async () => createAppServerRuntimeContext()),
        appServerTurnRunner: execRunner,
        writeProof,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    const liveTurnRunningProof = [...writeProof.mock.calls]
      .map(([, writtenProof]) => writtenProof)
      .reverse()
      .find((writtenProof) => writtenProof.owner_phase === 'turn_running' && writtenProof.latest_turn_id === 'turn-1');

    expect(liveTurnRunningProof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      },
      owner_status: 'in_progress'
    });

    expect(proof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      },
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active'
    });
  });

  it('ignores pre-attempt appserver session logs when no thread hint is available', async () => {
    const { runDir } = await createManifestRoot();
    const issue = createTrackedIssue();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const codexHome = join(tempRoot ?? '', '.codex');
    const sessionDir = join(codexHome, 'sessions', '2030', '03', '21');
    const staleSessionLogPath = join(
      sessionDir,
      'rollout-2030-03-21T09-00-04-000Z-thread-10.jsonl'
    );
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      staleSessionLogPath,
      [
        `{"timestamp":"2030-03-21T09:00:04.000Z","type":"session_meta","payload":{"id":"thread-10","cwd":"${tempRoot}","source":"exec"}}`,
        `{"timestamp":"2030-03-21T09:00:04.050Z","type":"turn_context","payload":{"turn_id":"turn-10","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
        '{"timestamp":"2030-03-21T09:00:04.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":999,"output_tokens":1,"total_tokens":1000}},"rate_limits":{"primary":{"used_percent":99,"window_minutes":300},"secondary":{"used_percent":88,"window_minutes":10080}}}}'
      ].join('\n'),
      'utf8'
    );
    const staleMtime = new Date('2030-03-21T09:00:04.000Z');
    await utimes(staleSessionLogPath, staleMtime, staleMtime);
    await writeFile(
      proofPath,
      JSON.stringify(
        {
          issue_id: 'lin-issue-1',
          issue_identifier: issue.identifier,
          attempt_started_at: '2030-03-21T09:00:05.000Z',
          pid: '12345',
          thread_id: null,
          latest_turn_id: null,
          latest_session_id: null,
          latest_session_id_source: null,
          turn_count: 1,
          last_event: null,
          last_message: null,
          last_event_at: null,
          tokens: {
            input_tokens: null,
            output_tokens: null,
            total_tokens: null
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: tempRoot,
          source_setup: null,
          linear_audit: null,
          child_streams: [],
          child_lanes: [],
          progress: null,
          tracked_issue_error: null,
          linear_budget: null,
          end_reason: null,
          updated_at: '2030-03-21T09:00:05.000Z'
        } satisfies ProviderLinearWorkerProof,
        null,
        2
      ),
      'utf8'
    );

    const proof = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2030-03-21T09:00:06.000Z',
      undefined,
      { ...process.env, CODEX_HOME: codexHome }
    );
    const onDisk = JSON.parse(await readFile(proofPath, 'utf8')) as ProviderLinearWorkerProof;

    expect(proof).toMatchObject({
      thread_id: null,
      latest_turn_id: null,
      latest_session_id: null,
      tokens: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null
      },
      rate_limits: null,
      updated_at: '2030-03-21T09:00:05.000Z'
    });
    expect(onDisk).toMatchObject({
      thread_id: null,
      latest_turn_id: null,
      latest_session_id: null,
      tokens: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null
      },
      rate_limits: null,
      updated_at: '2030-03-21T09:00:05.000Z'
    });
  });

  it('matches appserver session logs by exact issue identifier when no thread hint is available', async () => {
    const { runDir } = await createManifestRoot();
    const issue = createTrackedIssue();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const codexHome = join(tempRoot ?? '', '.codex');
    const sessionDir = join(codexHome, 'sessions', '2030', '03', '21');
    const matchingSessionLogPath = join(
      sessionDir,
      'rollout-2030-03-21T09-00-06-000Z-thread-2.jsonl'
    );
    const prefixCollisionSessionLogPath = join(
      sessionDir,
      'rollout-2030-03-21T09-00-07-000Z-thread-20.jsonl'
    );
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      matchingSessionLogPath,
      [
        `{"timestamp":"2030-03-21T09:00:06.000Z","type":"session_meta","payload":{"id":"thread-2","cwd":"${tempRoot}","source":"exec"}}`,
        `{"timestamp":"2030-03-21T09:00:06.050Z","type":"turn_context","payload":{"turn_id":"turn-2","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
        '{"timestamp":"2030-03-21T09:00:06.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":12,"output_tokens":8,"total_tokens":20}},"rate_limits":{"primary":{"used_percent":12.5,"window_minutes":300},"secondary":{"used_percent":48,"window_minutes":10080}}}}'
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      prefixCollisionSessionLogPath,
      [
        `{"timestamp":"2030-03-21T09:00:07.000Z","type":"session_meta","payload":{"id":"thread-20","cwd":"${tempRoot}","source":"exec"}}`,
        `{"timestamp":"2030-03-21T09:00:07.050Z","type":"turn_context","payload":{"turn_id":"turn-20","user_instructions":"You are the provider worker for Linear issue CO-20: ${issue.title}"}}`,
        '{"timestamp":"2030-03-21T09:00:07.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":999,"output_tokens":1,"total_tokens":1000}},"rate_limits":{"primary":{"used_percent":99,"window_minutes":300},"secondary":{"used_percent":88,"window_minutes":10080}}}}'
      ].join('\n'),
      'utf8'
    );
    const matchingMtime = new Date('2030-03-21T09:00:06.000Z');
    const prefixCollisionMtime = new Date('2030-03-21T09:00:07.000Z');
    await utimes(matchingSessionLogPath, matchingMtime, matchingMtime);
    await utimes(prefixCollisionSessionLogPath, prefixCollisionMtime, prefixCollisionMtime);
    await writeFile(
      proofPath,
      JSON.stringify(
        {
          issue_id: 'lin-issue-1',
          issue_identifier: issue.identifier,
          attempt_started_at: '2030-03-21T09:00:05.000Z',
          pid: '12345',
          thread_id: null,
          latest_turn_id: null,
          latest_session_id: null,
          latest_session_id_source: null,
          turn_count: 1,
          last_event: null,
          last_message: null,
          last_event_at: null,
          tokens: {
            input_tokens: null,
            output_tokens: null,
            total_tokens: null
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: tempRoot,
          source_setup: null,
          linear_audit: null,
          child_streams: [],
          child_lanes: [],
          progress: null,
          tracked_issue_error: null,
          linear_budget: null,
          end_reason: null,
          updated_at: '2030-03-21T09:00:05.000Z'
        } satisfies ProviderLinearWorkerProof,
        null,
        2
      ),
      'utf8'
    );

    const proof = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2030-03-21T09:00:08.000Z',
      undefined,
      { ...process.env, CODEX_HOME: codexHome }
    );
    const onDisk = JSON.parse(await readFile(proofPath, 'utf8')) as ProviderLinearWorkerProof;

    expect(proof).toMatchObject({
      thread_id: 'thread-2',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-2-turn-2',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      },
      updated_at: '2030-03-21T09:00:08.000Z'
    });
    expect(onDisk).toMatchObject({
      thread_id: 'thread-2',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-2-turn-2',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      },
      updated_at: '2030-03-21T09:00:08.000Z'
    });
  });

  it('requires an exact workspace-path match when no thread hint is available', async () => {
    const { runDir } = await createManifestRoot();
    const issue = createTrackedIssue();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const codexHome = join(tempRoot ?? '', '.codex');
    const sessionDir = join(codexHome, 'sessions', '2030', '03', '21');
    const workspacePath = join(tempRoot ?? '', 'CO');
    const workspacePrefixCollisionPath = join(tempRoot ?? '', 'CO-ci');
    const matchingSessionLogPath = join(
      sessionDir,
      'rollout-2030-03-21T09-00-08-000Z-thread-2.jsonl'
    );
    const prefixCollisionSessionLogPath = join(
      sessionDir,
      'rollout-2030-03-21T09-00-09-000Z-thread-20.jsonl'
    );
    await mkdir(sessionDir, { recursive: true });
    await mkdir(workspacePath, { recursive: true });
    await mkdir(workspacePrefixCollisionPath, { recursive: true });
    await writeFile(
      matchingSessionLogPath,
      [
        `{"timestamp":"2030-03-21T09:00:08.000Z","type":"session_meta","payload":{"id":"thread-2","cwd":"${workspacePath}","source":"exec"}}`,
        `{"timestamp":"2030-03-21T09:00:08.050Z","type":"turn_context","payload":{"turn_id":"turn-2","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
        '{"timestamp":"2030-03-21T09:00:08.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":12,"output_tokens":8,"total_tokens":20}},"rate_limits":{"primary":{"used_percent":12.5,"window_minutes":300},"secondary":{"used_percent":48,"window_minutes":10080}}}}'
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      prefixCollisionSessionLogPath,
      [
        `{"timestamp":"2030-03-21T09:00:09.000Z","type":"session_meta","payload":{"id":"thread-20","cwd":"${workspacePrefixCollisionPath}","source":"exec"}}`,
        `{"timestamp":"2030-03-21T09:00:09.050Z","type":"turn_context","payload":{"turn_id":"turn-20","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
        '{"timestamp":"2030-03-21T09:00:09.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":999,"output_tokens":1,"total_tokens":1000}},"rate_limits":{"primary":{"used_percent":99,"window_minutes":300},"secondary":{"used_percent":88,"window_minutes":10080}}}}'
      ].join('\n'),
      'utf8'
    );
    const matchingMtime = new Date('2030-03-21T09:00:08.000Z');
    const prefixCollisionMtime = new Date('2030-03-21T09:00:09.000Z');
    await utimes(matchingSessionLogPath, matchingMtime, matchingMtime);
    await utimes(prefixCollisionSessionLogPath, prefixCollisionMtime, prefixCollisionMtime);
    await writeFile(
      proofPath,
      JSON.stringify(
        {
          issue_id: 'lin-issue-1',
          issue_identifier: issue.identifier,
          attempt_started_at: '2030-03-21T09:00:07.000Z',
          pid: '12345',
          thread_id: null,
          latest_turn_id: null,
          latest_session_id: null,
          latest_session_id_source: null,
          turn_count: 1,
          last_event: null,
          last_message: null,
          last_event_at: null,
          tokens: {
            input_tokens: null,
            output_tokens: null,
            total_tokens: null
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: workspacePath,
          source_setup: null,
          linear_audit: null,
          child_streams: [],
          child_lanes: [],
          progress: null,
          tracked_issue_error: null,
          linear_budget: null,
          end_reason: null,
          updated_at: '2030-03-21T09:00:07.000Z'
        } satisfies ProviderLinearWorkerProof,
        null,
        2
      ),
      'utf8'
    );

    const proof = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      null,
      () => '2030-03-21T09:00:10.000Z',
      undefined,
      { ...process.env, CODEX_HOME: codexHome }
    );

    expect(proof).toMatchObject({
      thread_id: 'thread-2',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-2-turn-2',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 12.5,
          window_minutes: 300
        },
        secondary: {
          used_percent: 48,
          window_minutes: 10080
        }
      },
      updated_at: '2030-03-21T09:00:10.000Z'
    });
  });

  it('includes the current day when scanning session-log directories after midnight', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-03-22T00:02:00.000Z'));

    try {
      const { runDir } = await createManifestRoot();
      const issue = createTrackedIssue();
      const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
      const codexHome = join(tempRoot ?? '', '.codex');
      const sessionDir = join(codexHome, 'sessions', '2030', '03', '22');
      const sessionLogPath = join(
        sessionDir,
        'rollout-2030-03-22T00-01-00-000Z-thread-22.jsonl'
      );
      await mkdir(sessionDir, { recursive: true });
      await writeFile(
        sessionLogPath,
        [
          `{"timestamp":"2030-03-22T00:01:00.000Z","type":"session_meta","payload":{"id":"thread-22","cwd":"${tempRoot}","source":"exec"}}`,
          `{"timestamp":"2030-03-22T00:01:00.050Z","type":"turn_context","payload":{"turn_id":"turn-22","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
          '{"timestamp":"2030-03-22T00:01:00.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":44,"output_tokens":11,"total_tokens":55}},"rate_limits":{"primary":{"used_percent":22,"window_minutes":300},"secondary":{"used_percent":66,"window_minutes":10080}}}}'
        ].join('\n'),
        'utf8'
      );
      const sessionMtime = new Date('2030-03-22T00:01:00.000Z');
      await utimes(sessionLogPath, sessionMtime, sessionMtime);
      await writeFile(
        proofPath,
        JSON.stringify(
          {
            issue_id: 'lin-issue-1',
            issue_identifier: issue.identifier,
            attempt_started_at: '2030-03-21T23:59:50.000Z',
            pid: '12345',
            thread_id: null,
            latest_turn_id: null,
            latest_session_id: null,
            latest_session_id_source: null,
            turn_count: 1,
            last_event: null,
            last_message: null,
            last_event_at: null,
            tokens: {
              input_tokens: null,
              output_tokens: null,
              total_tokens: null
            },
            rate_limits: null,
            owner_phase: 'turn_running',
            owner_status: 'in_progress',
            workspace_path: tempRoot,
            source_setup: null,
            linear_audit: null,
            child_streams: [],
            child_lanes: [],
            progress: null,
            tracked_issue_error: null,
            linear_budget: null,
            end_reason: null,
            updated_at: '2030-03-21T23:59:50.000Z'
          } satisfies ProviderLinearWorkerProof,
          null,
          2
        ),
        'utf8'
      );

      const proof = await refreshProviderLinearWorkerProofSnapshot(
        runDir,
        null,
        () => '2030-03-22T00:02:01.000Z',
        undefined,
        { ...process.env, CODEX_HOME: codexHome }
      );
      const onDisk = JSON.parse(await readFile(proofPath, 'utf8')) as ProviderLinearWorkerProof;

      expect(proof).toMatchObject({
        thread_id: 'thread-22',
        latest_turn_id: 'turn-22',
        latest_session_id: 'thread-22-turn-22',
        tokens: {
          input_tokens: 44,
          output_tokens: 11,
          total_tokens: 55
        },
        rate_limits: {
          primary: {
            used_percent: 22,
            window_minutes: 300
          },
          secondary: {
            used_percent: 66,
            window_minutes: 10080
          }
        },
        updated_at: '2030-03-22T00:02:01.000Z'
      });
      expect(onDisk).toMatchObject({
        thread_id: 'thread-22',
        latest_turn_id: 'turn-22',
        latest_session_id: 'thread-22-turn-22',
        tokens: {
          input_tokens: 44,
          output_tokens: 11,
          total_tokens: 55
        },
        rate_limits: {
          primary: {
            used_percent: 22,
            window_minutes: 300
          },
          secondary: {
            used_percent: 66,
            window_minutes: 10080
          }
        },
        updated_at: '2030-03-22T00:02:01.000Z'
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('bootstraps resumed session logs from the latest turn context instead of replaying prior-turn tokens', async () => {
    const { manifestPath } = await createManifestRoot();
    const issue = createTrackedIssue();
    const completedIssue = createTrackedIssue({
      state: 'Done',
      state_type: 'completed'
    });
    const codexHome = join(tempRoot ?? '', '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(
      sessionDir,
      'rollout-2026-03-21T09-00-00-000Z-thread-1.jsonl'
    );
    const staleSessionLogPath = join(
      sessionDir,
      'rollout-2026-03-21T09-00-01-000Z-thread-stale.jsonl'
    );
    await mkdir(sessionDir, { recursive: true });

    let trackedIssueReadCount = 0;
    const readTrackedIssue = vi.fn(async () => {
      trackedIssueReadCount += 1;
      if (trackedIssueReadCount === 2) {
        await writeFile(
          sessionLogPath,
          [
            `{"timestamp":"2026-03-21T09:00:00.000Z","type":"session_meta","payload":{"id":"thread-1","cwd":"${tempRoot}","source":"exec"}}`,
            `{"timestamp":"2026-03-21T09:00:00.050Z","type":"turn_context","payload":{"turn_id":"turn-1","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
            '{"timestamp":"2026-03-21T09:00:00.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":12,"output_tokens":8,"total_tokens":20}},"rate_limits":{"primary":{"used_percent":12.5,"window_minutes":300},"secondary":{"used_percent":48,"window_minutes":10080}}}}',
            '{"timestamp":"2026-03-21T09:01:00.000Z","type":"turn_context","payload":{"turn_id":"turn-2","user_instructions":"Continuation guidance"}}'
          ].join('\n'),
          'utf8'
        );
        await writeFile(
          staleSessionLogPath,
          [
            `{"timestamp":"2026-03-21T09:00:01.000Z","type":"session_meta","payload":{"id":"thread-stale","cwd":"${tempRoot}","source":"exec"}}`,
            `{"timestamp":"2026-03-21T09:00:01.050Z","type":"turn_context","payload":{"turn_id":"turn-stale","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
            '{"timestamp":"2026-03-21T09:00:01.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":999,"output_tokens":1,"total_tokens":1000}},"rate_limits":{"primary":{"used_percent":99,"window_minutes":300},"secondary":{"used_percent":88,"window_minutes":10080}}}}'
          ].join('\n'),
          'utf8'
        );
        const staleMtime = new Date('2026-03-21T09:00:02.000Z');
        const resumedMtime = new Date('2026-03-21T09:00:03.000Z');
        await utimes(sessionLogPath, resumedMtime, resumedMtime);
        await utimes(staleSessionLogPath, staleMtime, staleMtime);
      }
      return trackedIssueReadCount >= 3 ? completedIssue : issue;
    });

    let execCallCount = 0;
    const writeProof = vi.fn(async () => undefined);
    const execRunner = vi.fn(async (request) => {
      execCallCount += 1;
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        turnIndex: execCallCount,
        recordedAtBase: execCallCount === 1 ? '2026-03-21T09:00:00.000Z' : '2026-03-21T09:01:00.000Z'
      });
      if (execCallCount === 1) {
        return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"type":"event_msg","payload":{"type":"agent_message","message":"turn 1 complete"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        exitCode: 0,
        stdout: [
          '{"type":"turn_context","payload":{"turn_id":"turn-2"}}',
          '{"type":"event_msg","payload":{"type":"agent_message","message":"turn 2 complete"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-2"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '2',
        CODEX_HOME: codexHome
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createAppServerRuntimeContext()),
        appServerTurnRunner: execRunner,
        writeProof,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:01:00.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    const resumedTurnRunningProof = [...writeProof.mock.calls]
      .map(([, writtenProof]) => writtenProof)
      .reverse()
      .find((writtenProof) => writtenProof.owner_phase === 'turn_running' && writtenProof.latest_turn_id === 'turn-2');

    expect(resumedTurnRunningProof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      tokens: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null
      },
      rate_limits: null,
      owner_status: 'in_progress'
    });

    expect(proof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      owner_status: 'succeeded',
      end_reason: 'issue_inactive'
    });
  });

  it('clears completed-turn telemetry before a resumed turn emits new turn context data', async () => {
    const { manifestPath } = await createManifestRoot();
    const issue = createTrackedIssue();
    const completedIssue = createTrackedIssue({
      state: 'Done',
      state_type: 'completed'
    });
    const codexHome = join(tempRoot ?? '', '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '03', '21');
    const sessionLogPath = join(
      sessionDir,
      'rollout-2026-03-21T09-00-00-000Z-thread-1.jsonl'
    );
    await mkdir(sessionDir, { recursive: true });

    let trackedIssueReadCount = 0;
    const readTrackedIssue = vi.fn(async () => {
      trackedIssueReadCount += 1;
      if (trackedIssueReadCount === 2) {
        await writeFile(
          sessionLogPath,
          [
            `{"timestamp":"2026-03-21T09:00:00.000Z","type":"session_meta","payload":{"id":"thread-1","cwd":"${tempRoot}","source":"exec"}}`,
            `{"timestamp":"2026-03-21T09:00:00.050Z","type":"turn_context","payload":{"turn_id":"turn-1","user_instructions":"You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}"}}`,
            '{"timestamp":"2026-03-21T09:00:00.100Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":12,"output_tokens":8,"total_tokens":20}},"rate_limits":{"primary":{"used_percent":12.5,"window_minutes":300},"secondary":{"used_percent":48,"window_minutes":10080}}}}',
            '{"timestamp":"2026-03-21T09:00:00.150Z","type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          'utf8'
        );
      }
      return trackedIssueReadCount >= 3 ? completedIssue : issue;
    });

    let execCallCount = 0;
    const writeProof = vi.fn(async () => undefined);
    const execRunner = vi.fn(async (request) => {
      execCallCount += 1;
      await appendStaySerialParallelizationDecisionAuditForRequest(request, {
        turnIndex: execCallCount,
        recordedAtBase: execCallCount === 1 ? '2026-03-21T09:00:00.000Z' : '2026-03-21T09:01:00.000Z'
      });
      if (execCallCount === 1) {
        return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"type":"event_msg","payload":{"type":"agent_message","message":"turn 1 complete"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        exitCode: 0,
        stdout: [
          '{"type":"turn_context","payload":{"turn_id":"turn-2"}}',
          '{"type":"event_msg","payload":{"type":"agent_message","message":"turn 2 complete"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-2"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '2',
        CODEX_HOME: codexHome
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createAppServerRuntimeContext()),
        appServerTurnRunner: execRunner,
        writeProof,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:01:00.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    const secondTurnBootstrapProofs = [...writeProof.mock.calls]
      .map(([, writtenProof]) => writtenProof)
      .filter(
        (writtenProof) =>
          writtenProof.owner_phase === 'turn_running' &&
          writtenProof.turn_count === 2 &&
          writtenProof.latest_turn_id !== 'turn-2'
      );

    expect(secondTurnBootstrapProofs.length).toBeGreaterThan(0);
    expect(secondTurnBootstrapProofs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          thread_id: 'thread-1',
          latest_turn_id: null,
          latest_session_id: null,
          tokens: {
            input_tokens: null,
            output_tokens: null,
            total_tokens: null
          },
          rate_limits: null,
          owner_status: 'in_progress'
        })
      ])
    );
    expect(
      secondTurnBootstrapProofs.some(
        (writtenProof) =>
          writtenProof.tokens.total_tokens === 20 ||
          writtenProof.rate_limits?.primary?.used_percent === 12.5 ||
          writtenProof.latest_session_id === 'thread-1-turn-1'
      )
    ).toBe(false);

    expect(proof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      owner_status: 'succeeded',
      end_reason: 'issue_inactive'
    });
  });

  it('hydrates shared sidecar metadata into live proof updates before the turn completes', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const writeProof = vi.fn(async () => undefined);
    const childStreamRecord = {
      stream: 'docs-review',
      pipeline_id: 'docs-review',
      task_id: 'linear-lin-issue-1-docs-review',
      run_id: 'docs-run-1',
      status: 'succeeded',
      manifest_path: join(tempRoot ?? '', '.runs', 'linear-lin-issue-1-docs-review', 'cli', 'docs-run-1', 'manifest.json'),
      artifact_root: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1',
      log_path: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/run.log',
      summary: 'docs-review passed',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-03-21T09:00:00.050Z'
    };
    const childLaneScope = resolveProviderLinearChildLaneScopeContract({
      files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
      phases: []
    });
    const childLaneRecord = {
      stream: 'impl-a',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-impl-a',
      run_id: 'child-run-1',
      status: 'succeeded',
      manifest_path: join(tempRoot ?? '', '.runs', 'linear-lin-issue-1-impl-a', 'cli', 'child-run-1', 'manifest.json'),
      artifact_root: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1',
      log_path: '.runs/linear-lin-issue-1-impl-a/cli/child-run-1/run.log',
      summary: 'child lane finished',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: tempRoot,
      source_setup: null,
      launched_at: '2026-03-21T09:00:00.075Z',
      purpose: 'Implement bounded same-issue child lanes',
      instructions: null,
      scope: childLaneScope,
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-21T09:00:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-21T09:00:00.075Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      patch_artifact_path: join(tempRoot ?? '', '.runs', 'linear-lin-issue-1-impl-a', 'cli', 'child-run-1', 'provider-linear-child-lane.patch'),
      patch_bytes: 256,
      decision: 'pending',
      decision_at: null,
      decision_reason: null
    };
    await appendProviderLinearWorkerChildStreamRecord(runDir, childStreamRecord);
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLaneRecord);
    const workerEnv = {
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
      CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
      CODEX_HOME: tempRoot!,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    await recordLinearBudgetHeadersObservation({
      env: workerEnv,
      source: 'dispatch_source_issue_by_id',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });
    const execRunner = vi.fn(async (request: Parameters<ProviderLinearWorkerDependencies['execRunner']>[0]) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
      request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-1"}}\n');
      request.onStdoutChunk?.(
        '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}\n'
      );
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(workerEnv, {
      readTrackedIssue: vi.fn(async () => createTrackedIssue()),
      resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
      execRunner,
      writeProof,
      now: vi
        .fn()
        .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
        .mockReturnValue('2026-03-21T09:00:01.000Z'),
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    });

    const liveTurnRunningProof = [...writeProof.mock.calls]
      .map(([, proof]) => proof)
      .reverse()
      .find((proof) => proof.owner_phase === 'turn_running' && proof.latest_turn_id === 'turn-1');

    expect(liveTurnRunningProof).toMatchObject({
      owner_phase: 'turn_running',
      child_streams: expect.arrayContaining([
        expect.objectContaining({
          stream: 'docs-review'
        })
      ]),
      child_lanes: expect.arrayContaining([
        expect.objectContaining({
          stream: 'impl-a'
        })
      ]),
      linear_budget: expect.objectContaining({
        suppression: 'low',
        requests: expect.objectContaining({
          remaining: 1
        })
      })
    });
  });

  it('flushes a trailing JSONL fragment into live proof updates before the turn completes', async () => {
    const { manifestPath } = await createManifestRoot();
    const writeProof = vi.fn(async () => undefined);
    const execRunner = vi.fn(async (request: Parameters<ProviderLinearWorkerDependencies['execRunner']>[0]) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
      request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-1"}}\n');
      request.onStdoutChunk?.(
        '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}'
      );
      return {
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      };
    });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        writeProof,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    const liveTurnRunningProof = [...writeProof.mock.calls]
      .map(([, proof]) => proof)
      .reverse()
      .find((proof) => proof.owner_phase === 'turn_running' && proof.latest_turn_id === 'turn-1');

    expect(liveTurnRunningProof).toMatchObject({
      latest_turn_id: 'turn-1',
      last_message: 'Worker turn active',
      owner_phase: 'turn_running',
      owner_status: 'in_progress'
    });
  });

  it('does not reuse the previous turn session before a later turn emits turn_context', async () => {
    const { manifestPath } = await createManifestRoot();
    const writeProof = vi.fn(async () => undefined);
    const execRunner = vi
      .fn<
        (request: Parameters<ProviderLinearWorkerDependencies['execRunner']>[0]) => Promise<{
          exitCode: number;
          stdout: string;
          stderr: string;
        }>
      >()
      .mockImplementationOnce(async (request) => {
        await appendStaySerialParallelizationDecisionAuditForRequest(request, {
          turnIndex: 1
        });
        request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
        request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-1"}}\n');
        request.onStdoutChunk?.('{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}\n');
        return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
        };
      })
      .mockImplementationOnce(async (request) => {
        await appendStaySerialParallelizationDecisionAuditForRequest(request, {
          turnIndex: 2
        });
        request.onStdoutChunk?.(
          '{"type":"event_msg","payload":{"type":"agent_message","message":"Second turn reasoning"}}\n'
        );
        request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-2"}}\n');
        request.onStdoutChunk?.('{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-2"}}\n');
        return {
          exitCode: 0,
          stdout: [
            '{"type":"event_msg","payload":{"type":"agent_message","message":"Second turn reasoning"}}',
            '{"type":"turn_context","payload":{"turn_id":"turn-2"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-2"}}'
          ].join('\n'),
          stderr: ''
        };
      });

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '2'
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue()),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        writeProof,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    const secondTurnPreContextProof = writeProof.mock.calls
      .map(([, proof]) => proof)
      .find(
        (proof) =>
          proof.owner_phase === 'turn_running' &&
          proof.turn_count === 2 &&
          proof.last_message === 'Second turn reasoning' &&
          proof.latest_turn_id === null
      );

    expect(secondTurnPreContextProof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: null,
      latest_session_id: null,
      turn_count: 2,
      last_message: 'Second turn reasoning',
      owner_phase: 'turn_running',
      owner_status: 'in_progress'
    });
  });

  it('requests a control-host refresh when a successful worker exit leaves the issue active', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const controlServer = await createControlEndpointServer();
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    try {
      const proof = await runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            assignee_id: null,
            assignee_name: null
          })),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      );

      expect(proof).toMatchObject({
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active'
      });
      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active'
      });
      expect(controlServer.requests).toHaveLength(1);
      expect(controlServer.requests[0]).toMatchObject({
        url: '/api/v1/refresh',
        body: {
          action: 'refresh',
          source: 'provider-linear-worker',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          owner_status: 'succeeded',
          end_reason: 'max_turns_reached_issue_still_active'
        }
      });
      expectRefreshAuthHeaders(controlServer.requests[0]?.headers);
    } finally {
      await controlServer.close();
    }
  });

  it('keeps control-host refresh anchored to the shared provider manifest after issue-workspace manifest rebasing', async () => {
    const { manifestPath } = await createManifestRoot();
    const issueWorkspacePath = join(tempRoot ?? '', '.workspaces', 'linear-lin-issue-1');
    const workspaceRunDir = join(
      issueWorkspacePath,
      '.runs',
      'linear-lin-issue-1',
      'cli',
      'run-child'
    );
    const workspaceManifestPath = join(workspaceRunDir, 'manifest.json');
    await mkdir(workspaceRunDir, { recursive: true });

    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const controlServer = await createControlEndpointServer();
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );
    await writeFile(
      workspaceManifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: issueWorkspacePath
      }),
      'utf8'
    );

    try {
      const proof = await runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: issueWorkspacePath,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            assignee_id: null,
            assignee_name: null
          })),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      );

      expect(proof).toMatchObject({
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active',
        workspace_path: issueWorkspacePath
      });
      const written = JSON.parse(
        await readFile(join(workspaceRunDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active',
        workspace_path: issueWorkspacePath
      });
      expect(controlServer.requests).toHaveLength(1);
      expect(controlServer.requests[0]).toMatchObject({
        url: '/api/v1/refresh',
        body: {
          action: 'refresh',
          source: 'provider-linear-worker',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          owner_status: 'succeeded',
          end_reason: 'max_turns_reached_issue_still_active'
        }
      });
      expectRefreshAuthHeaders(controlServer.requests[0]?.headers);
    } finally {
      await controlServer.close();
    }
  });

  it('requests a control-host refresh when the expected control-host manifest is missing but endpoint artifacts remain', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const controlServer = await createControlEndpointServer();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    try {
      const proof = await runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            assignee_id: null,
            assignee_name: null
          })),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            return {
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log
        }
      );

      expect(proof).toMatchObject({
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active'
      });
      const written = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(written).toMatchObject({
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active'
      });
      expect(controlServer.requests).toHaveLength(1);
      expect(controlServer.requests[0]).toMatchObject({
        url: '/api/v1/refresh',
        body: {
          action: 'refresh',
          source: 'provider-linear-worker',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          owner_status: 'succeeded',
          end_reason: 'max_turns_reached_issue_still_active'
        }
      });
      expectRefreshAuthHeaders(controlServer.requests[0]?.headers);
      expect(log.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('provider-linear-worker could not request control-host refresh')
      );
    } finally {
      await controlServer.close();
    }
  });

  it('requests a control-host refresh for live turn-running proof updates', async () => {
    const { manifestPath } = await createManifestRoot();
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    const controlServer = await createControlEndpointServer();
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: controlServer.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    try {
      await runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            assignee_id: null,
            assignee_name: null
          })),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
            request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-1"}}\n');
            request.onStdoutChunk?.(
              '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}\n'
            );
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      );

      expect(controlServer.requests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            url: '/api/v1/refresh',
            body: expect.objectContaining({
              action: 'refresh',
              source: 'provider-linear-worker',
              issue_id: 'lin-issue-1',
              issue_identifier: 'CO-2',
              owner_status: 'in_progress',
              end_reason: null
            })
          }),
          expect.objectContaining({
            url: '/api/v1/refresh',
            body: expect.objectContaining({
              action: 'refresh',
              source: 'provider-linear-worker',
              issue_id: 'lin-issue-1',
              issue_identifier: 'CO-2',
              owner_status: 'succeeded',
              end_reason: 'max_turns_reached_issue_still_active'
            })
          })
        ])
      );
      for (const request of controlServer.requests) {
        expectRefreshAuthHeaders(request.headers);
      }
    } finally {
      await controlServer.close();
    }
  });

  it('does not block worker completion on an in-flight live control-host refresh', async () => {
    const { manifestPath } = await createManifestRoot();
    const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostRunDir, { recursive: true });
    await writeFile(
      join(controlHostRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://127.0.0.1:43123',
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
    await writeFile(
      join(controlHostRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        workspace_path: tempRoot
      }),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: tempRoot,
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'control-host'
      }),
      'utf8'
    );

    const refreshBodies: Array<Record<string, unknown>> = [];
    let liveRefreshStartedResolve: (() => void) | null = null;
    const liveRefreshStarted = new Promise<void>((resolve) => {
      liveRefreshStartedResolve = resolve;
    });
    let liveRefreshAborted = false;
    let refreshCallCount = 0;
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        refreshCallCount += 1;
        refreshBodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
        if (refreshCallCount === 1) {
          liveRefreshStartedResolve?.();
          return await new Promise<Response>((_resolve, reject) => {
            const abortError = Object.assign(new Error('This operation was aborted'), {
              name: 'AbortError'
            });
            const rejectOnAbort = () => {
              liveRefreshAborted = true;
              reject(abortError);
            };
            if (init?.signal?.aborted) {
              rejectOnAbort();
              return;
            }
            init?.signal?.addEventListener('abort', rejectOnAbort, { once: true });
          });
        }
        return new Response(JSON.stringify({ queued: true, coalesced: false }), {
          status: 202,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      })
    );

    const workerPromise = runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1',
        CODEX_HOME: join(tempRoot ?? '', '.codex')
      },
      {
        readTrackedIssue: vi.fn(async () => createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          assignee_id: null,
          assignee_name: null
        })),
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner: vi.fn(async (request) => {
          await appendStaySerialParallelizationDecisionAuditForRequest(request);
          request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
          request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-1"}}\n');
          request.onStdoutChunk?.(
            '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}\n'
          );
          return {
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log
      }
    );

    await liveRefreshStarted;
    const outcome = await Promise.race([
      workerPromise.then(() => 'resolved'),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 250))
    ]);
    expect(outcome).toBe('resolved');
    await workerPromise;
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    expect(liveRefreshAborted).toBe(true);
    expect(log.warn).not.toHaveBeenCalled();
    expect(refreshBodies).toHaveLength(2);
    expect(refreshBodies.filter((body) => body.owner_status === 'in_progress')).toHaveLength(1);

    expect(refreshBodies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          owner_status: 'in_progress',
          end_reason: null
        }),
        expect.objectContaining({
          owner_status: 'succeeded',
          end_reason: 'max_turns_reached_issue_still_active'
        })
      ])
    );
  });

  it('queues a trailing live refresh after suppressing an in-flight refresh', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-21T09:00:00.000Z'));
      const { runDir, manifestPath } = await createManifestRoot();
      const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
      await mkdir(controlHostRunDir, { recursive: true });
      await writeFile(
        join(controlHostRunDir, 'control_endpoint.json'),
        JSON.stringify({
          base_url: 'http://127.0.0.1:43123',
          token_path: 'control_auth.json'
        }),
        'utf8'
      );
      await writeFile(
        join(controlHostRunDir, 'control_auth.json'),
        JSON.stringify({ token: 'control-token' }),
        'utf8'
      );
      await writeFile(
        join(controlHostRunDir, 'manifest.json'),
        JSON.stringify({
          run_id: 'control-host',
          task_id: 'local-mcp',
          workspace_path: tempRoot
        }),
        'utf8'
      );
      await writeFile(
        manifestPath,
        JSON.stringify({
          run_id: 'run-child',
          task_id: 'linear-lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          workspace_path: tempRoot,
          provider_control_host_task_id: 'local-mcp',
          provider_control_host_run_id: 'control-host'
        }),
        'utf8'
      );

      const refreshBodies: Array<Record<string, unknown>> = [];
      let resolveFirstLiveRefresh: ((response: Response) => void) | null = null;
      let firstLiveRefreshStartedResolve: (() => void) | null = null;
      const firstLiveRefreshStarted = new Promise<void>((resolve) => {
        firstLiveRefreshStartedResolve = resolve;
      });
      let allowRunnerToFinishResolve: (() => void) | null = null;
      const allowRunnerToFinish = new Promise<void>((resolve) => {
        allowRunnerToFinishResolve = resolve;
      });
      let refreshCallCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_input: unknown, init?: RequestInit) => {
          refreshCallCount += 1;
          const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
          refreshBodies.push(body);
          if (refreshCallCount === 1) {
            firstLiveRefreshStartedResolve?.();
            return await new Promise<Response>((resolve) => {
              resolveFirstLiveRefresh = resolve;
            });
          }
          return new Response(JSON.stringify({ queued: true, coalesced: false }), {
            status: 202,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        })
      );

      const workerPromise = runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            assignee_id: null,
            assignee_name: null
          })),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            await appendStaySerialParallelizationDecisionAuditForRequest(request);
            request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
            request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-1"}}\n');
            request.onStdoutChunk?.(
              '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}\n'
            );
            request.onStdoutChunk?.(
              '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn updated"}}\n'
            );
            await allowRunnerToFinish;
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active"}}',
                '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn updated"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      );

      await firstLiveRefreshStarted;
      resolveFirstLiveRefresh?.(
        new Response(JSON.stringify({ queued: true, coalesced: false }), {
          status: 202,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      await vi.advanceTimersByTimeAsync(1_000);
      await vi.waitFor(() => {
        expect(refreshBodies.filter((body) => body.owner_status === 'in_progress')).toHaveLength(2);
      });
      await vi.waitFor(async () => {
        const queuedRefreshProof = JSON.parse(
          await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
        ) as Record<string, unknown>;
        expect(queuedRefreshProof).toMatchObject({
          latest_turn_id: 'turn-1',
          latest_session_id: 'thread-1-turn-1',
          turn_count: 1,
          last_message: 'Worker turn updated',
          owner_status: 'in_progress'
        });
      });

      allowRunnerToFinishResolve?.();
      await workerPromise;
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps trailing live refresh state across turn boundaries', async () => {
    vi.useFakeTimers();
    try {
      const { runDir, manifestPath } = await createManifestRoot();
      const controlHostRunDir = join(tempRoot ?? '', '.runs', 'local-mcp', 'cli', 'control-host');
      await mkdir(controlHostRunDir, { recursive: true });
      await writeFile(
        join(controlHostRunDir, 'control_endpoint.json'),
        JSON.stringify({
          base_url: 'http://127.0.0.1:43123',
          token_path: 'control_auth.json'
        }),
        'utf8'
      );
      await writeFile(join(controlHostRunDir, 'control_auth.json'), JSON.stringify({ token: 'control-token' }), 'utf8');
      await writeFile(
        join(controlHostRunDir, 'manifest.json'),
        JSON.stringify({
          run_id: 'control-host',
          task_id: 'local-mcp',
          workspace_path: tempRoot
        }),
        'utf8'
      );
      await writeFile(
        manifestPath,
        JSON.stringify({
          run_id: 'run-child',
          task_id: 'linear-lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          workspace_path: tempRoot,
          provider_control_host_task_id: 'local-mcp',
          provider_control_host_run_id: 'control-host'
        }),
        'utf8'
      );

      const refreshBodies: Array<Record<string, unknown>> = [];
      let resolveFirstLiveRefresh: ((response: Response) => void) | null = null;
      let firstLiveRefreshStartedResolve: (() => void) | null = null;
      const firstLiveRefreshStarted = new Promise<void>((resolve) => {
        firstLiveRefreshStartedResolve = resolve;
      });
      let secondTurnStartedResolve: (() => void) | null = null;
      const secondTurnStarted = new Promise<void>((resolve) => {
        secondTurnStartedResolve = resolve;
      });
      let allowSecondTurnToFinishResolve: (() => void) | null = null;
      const allowSecondTurnToFinish = new Promise<void>((resolve) => {
        allowSecondTurnToFinishResolve = resolve;
      });
      let liveRefreshCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_input: unknown, init?: RequestInit) => {
          const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
          refreshBodies.push(body);
          if (body.owner_status === 'in_progress') {
            liveRefreshCount += 1;
            if (liveRefreshCount === 1) {
              firstLiveRefreshStartedResolve?.();
              return await new Promise<Response>((resolve) => {
                resolveFirstLiveRefresh = resolve;
              });
            }
          }
          return new Response(JSON.stringify({ queued: true, coalesced: false }), {
            status: 202,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        })
      );

      let runnerCallCount = 0;
      const workerPromise = runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '2'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            assignee_id: null,
            assignee_name: null
          })),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            runnerCallCount += 1;
            await appendStaySerialParallelizationDecisionAuditForRequest(request, {
              turnIndex: runnerCallCount
            });
            const currentTurnId = `turn-${runnerCallCount}`;
            if (runnerCallCount === 1) {
              request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
            }
            if (runnerCallCount === 2) {
              secondTurnStartedResolve?.();
            }
            request.onStdoutChunk?.(`{"type":"turn_context","payload":{"turn_id":"${currentTurnId}"}}\n`);
            request.onStdoutChunk?.(
              `{"type":"event_msg","payload":{"type":"agent_message","message":"${currentTurnId} active"}}\n`
            );
            if (runnerCallCount === 2) {
              await allowSecondTurnToFinish;
            }
            return {
              exitCode: 0,
              stdout: [
                ...(runnerCallCount === 1 ? ['{"type":"thread.started","thread_id":"thread-1"}'] : []),
                `{"type":"turn_context","payload":{"turn_id":"${currentTurnId}"}}`,
                `{"type":"event_msg","payload":{"type":"agent_message","message":"${currentTurnId} active"}}`,
                `{"type":"event_msg","payload":{"type":"task_complete","turn_id":"${currentTurnId}"}}`
              ].join('\n'),
              stderr: ''
            };
          }),
          now: vi
            .fn()
            .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
            .mockReturnValue('2026-03-21T09:00:01.000Z'),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      );

      await firstLiveRefreshStarted;
      await secondTurnStarted;

      resolveFirstLiveRefresh?.(
        new Response(JSON.stringify({ queued: true, coalesced: false }), {
          status: 202,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      await vi.advanceTimersByTimeAsync(1_100);
      await vi.waitFor(async () => {
        expect(refreshBodies.filter((body) => body.owner_status === 'in_progress')).toHaveLength(2);
        expect(
          JSON.parse(
            await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
          ) as Record<string, unknown>
        ).toMatchObject({
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          turn_count: 2,
          last_message: 'turn-2 active',
          owner_status: 'in_progress'
        });
      });

      allowSecondTurnToFinishResolve?.();
      const proof = await workerPromise;
      expect(proof).toMatchObject({
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active'
      });
    } finally {
      vi.useRealTimers();
    }
  }, 20_000);

  it('emits stalled semantic progress for quiet live turns before the runner exits', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-21T09:00:00.000Z'));
      const { manifestPath, runDir } = await createManifestRoot();
      const writtenProofs: ProviderLinearWorkerProof[] = [];
      const log = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      };
      let allowRunnerToFinishResolve: (() => void) | null = null;
      const allowRunnerToFinish = new Promise<void>((resolve) => {
        allowRunnerToFinishResolve = resolve;
      });

      const workerPromise = runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            assignee_id: null,
            assignee_name: null
          })),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
            request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-1"}}\n');
            request.onStdoutChunk?.(
              '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active","timestamp":"2026-03-21T09:00:00.000Z"}}\n'
            );
            await allowRunnerToFinish;
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active","timestamp":"2026-03-21T09:00:00.000Z"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:16:05.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: () => new Date().toISOString(),
          writeProof: vi.fn(async (_path, proof) => {
            writtenProofs.push(JSON.parse(JSON.stringify(proof)) as ProviderLinearWorkerProof);
          }),
          log
        }
      );

      await vi.waitFor(() => {
        expect(
          writtenProofs.some(
            (proof) => proof.owner_phase === 'turn_running' && proof.progress?.status === 'progressing'
          )
        ).toBe(true);
      });
      await appendStaySerialParallelizationDecisionAudit(runDir, {
        recordedAt: '2026-03-21T09:00:00.500Z'
      });
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 1_000);
      await vi.waitFor(() => {
        expect(
          writtenProofs.some(
            (proof) => proof.owner_phase === 'turn_running' && proof.progress?.status === 'stalled'
          )
        ).toBe(true);
      });
      expect(
        log.info.mock.calls.some(([message]) =>
          typeof message === 'string' &&
          message.includes('[provider-linear-worker-progress]') &&
          message.includes('"status":"stalled"')
        )
      ).toBe(true);

      allowRunnerToFinishResolve?.();
      await workerPromise;
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps polling audit sidecars after the first stalled refresh', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-21T09:00:00.000Z'));
      const { manifestPath, runDir } = await createManifestRoot();
      const auditPath = join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME);
      const writtenProofs: ProviderLinearWorkerProof[] = [];
      let allowRunnerToFinishResolve: (() => void) | null = null;
      const allowRunnerToFinish = new Promise<void>((resolve) => {
        allowRunnerToFinishResolve = resolve;
      });

      const workerPromise = runProviderLinearWorker(
        {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
        },
        {
          readTrackedIssue: vi.fn(async () => createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            assignee_id: null,
            assignee_name: null
          })),
          resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
          execRunner: vi.fn(async (request) => {
            request.onStdoutChunk?.('{"type":"thread.started","thread_id":"thread-1"}\n');
            request.onStdoutChunk?.('{"type":"turn_context","payload":{"turn_id":"turn-1"}}\n');
            request.onStdoutChunk?.(
              '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active","timestamp":"2026-03-21T09:00:00.000Z"}}\n'
            );
            await allowRunnerToFinish;
            return {
              exitCode: 0,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
                '{"type":"event_msg","payload":{"type":"agent_message","message":"Worker turn active","timestamp":"2026-03-21T09:00:00.000Z"}}',
                '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1","timestamp":"2026-03-21T09:30:05.000Z"}}'
              ].join('\n'),
              stderr: ''
            };
          }),
          now: () => new Date().toISOString(),
          writeProof: vi.fn(async (_path, proof) => {
            writtenProofs.push(JSON.parse(JSON.stringify(proof)) as ProviderLinearWorkerProof);
          }),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
        }
      );

      await vi.waitFor(() => {
        expect(
          writtenProofs.some(
            (proof) => proof.owner_phase === 'turn_running' && proof.progress?.status === 'progressing'
          )
        ).toBe(true);
      });

      await appendStaySerialParallelizationDecisionAudit(runDir, {
        recordedAt: '2026-03-21T09:00:00.500Z'
      });

      await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 1_000);
      await vi.waitFor(() => {
        expect(
          writtenProofs.some(
            (proof) => proof.owner_phase === 'turn_running' && proof.progress?.status === 'stalled'
          )
        ).toBe(true);
      });

      await appendProviderLinearAuditEntry(auditPath, {
        recorded_at: '2026-03-21T09:20:00.000Z',
        operation: 'transition',
        ok: true,
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        source_setup: null,
        action: 'updated',
        via: null,
        state: 'Merging',
        follow_up_issue_id: null,
        follow_up_issue_identifier: null,
        failed_relation_type: null,
        comment_id: null,
        attachment_id: null,
        error_code: null,
        error_message: null
      });

      await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 1_000);
      await vi.waitFor(() => {
        expect(
          writtenProofs.some(
            (proof) =>
              proof.owner_phase === 'turn_running' &&
              proof.linear_audit?.attempted_count === 2 &&
              proof.progress?.status === 'progressing'
          )
        ).toBe(true);
      });

      allowRunnerToFinishResolve?.();
      await workerPromise;
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not hydrate a previous-turn parallelization decision into a new running turn', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const auditPath = join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME);

    await appendParallelizationDecisionAudit(runDir, {
      recordedAt: '2026-03-21T08:59:30.000Z',
      decision: 'stay_serial',
      reason: 'single_bounded_change',
      summary: 'Previous turn stayed serial.'
    });
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          current_turn_started_at: '2026-03-21T09:00:00.000Z',
          linear_audit: null,
          child_streams: [],
          child_lanes: [],
          parallelization: null,
          updated_at: '2026-03-21T09:00:05.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const firstRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      auditPath,
      () => '2026-03-21T09:00:05.000Z',
      undefined,
      { CODEX_HOME: tempRoot! }
    );

    expect(firstRefresh?.parallelization).toBeNull();
    expect(
      (JSON.parse(await readFile(proofPath, 'utf8')) as ProviderLinearWorkerProof).parallelization
    ).toBeNull();

    await appendParallelizationDecisionAudit(runDir, {
      recordedAt: '2026-03-21T09:00:30.000Z',
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch a bounded child lane now.'
    });

    const secondRefresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      auditPath,
      () => '2026-03-21T09:00:35.000Z',
      undefined,
      { CODEX_HOME: tempRoot! }
    );

    expect(secondRefresh).toMatchObject({
      current_turn_started_at: '2026-03-21T09:00:00.000Z',
      parallelization: {
        decision: 'parallelize_now',
        reason: 'independent_scope_available',
        summary: 'Launch a bounded child lane now.',
        recorded_at: '2026-03-21T09:00:30.000Z'
      }
    });
  }, 20_000);

  it('does not hydrate a previous-attempt parallelization decision before turn 1 starts', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    const auditPath = join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME);

    await appendParallelizationDecisionAudit(runDir, {
      recordedAt: '2026-03-21T08:59:30.000Z',
      decision: 'stay_serial',
      reason: 'single_bounded_change',
      summary: 'Previous attempt stayed serial.'
    });
    await writeFile(
      proofPath,
      JSON.stringify(
        buildInProgressProof({
          attempt_started_at: '2026-03-21T09:00:00.000Z',
          current_turn_started_at: null,
          owner_phase: 'bootstrapping',
          linear_audit: null,
          child_streams: [],
          child_lanes: [],
          parallelization: null,
          updated_at: '2026-03-21T09:00:05.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const refresh = await refreshProviderLinearWorkerProofSnapshot(
      runDir,
      auditPath,
      () => '2026-03-21T09:00:05.000Z',
      undefined,
      { CODEX_HOME: tempRoot! }
    );

    expect(refresh?.parallelization).toBeNull();
    expect(
      (JSON.parse(await readFile(proofPath, 'utf8')) as ProviderLinearWorkerProof).parallelization
    ).toBeNull();
  }, 20_000);

  it('treats Ready as the live Todo-equivalent queue state even though Linear marks it unstarted', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValue(
        createTrackedIssue({
          state: 'Ready',
          state_type: 'unstarted'
        })
      );

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner: vi.fn(async (request) => {
          await appendStaySerialParallelizationDecisionAuditForRequest(request);
          return {
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
          };
        }),
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      turn_count: 1,
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active'
    });

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      end_reason: 'max_turns_reached_issue_still_active'
    });
  });

  it('treats custom started states outside the explicit active-state set as inactive', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    const readTrackedIssue = vi
      .fn<(input: ReadTrackedIssueInput) => Promise<LiveLinearTrackedIssue>>()
      .mockResolvedValue(
        createTrackedIssue({
          state: 'QA Ready',
          state_type: 'started'
        })
      );
    const execRunner = vi.fn(async (request) => {
      await appendStaySerialParallelizationDecisionAuditForRequest(request);
      return {
      exitCode: 0,
      stdout: [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
      ].join('\n'),
      stderr: ''
      };
    });

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '1'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
      }
    );

    expect(proof).toMatchObject({
      thread_id: null,
      latest_turn_id: null,
      latest_session_id: null,
      turn_count: 0,
      owner_status: 'succeeded',
      end_reason: 'issue_inactive'
    });
    expect(execRunner).not.toHaveBeenCalled();

    const written = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    expect(written).toMatchObject({
      thread_id: null,
      latest_turn_id: null,
      end_reason: 'issue_inactive'
    });
  });
});
