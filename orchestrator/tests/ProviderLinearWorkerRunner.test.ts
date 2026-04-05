import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import type { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  appendProviderLinearWorkerChildLaneRecord,
  appendProviderLinearWorkerChildStreamRecord,
  buildProviderWorkerPrompt,
  loadProviderLinearWorkerContext,
  parseProviderLinearWorkerJsonl,
  ProviderLinearTrackedIssueReadError,
  readProviderLinearWorkerChildStreams,
  refreshProviderLinearWorkerProofSnapshot,
  runProviderLinearWorker,
  PROVIDER_LINEAR_WORKER_AUDIT_FILENAME,
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  type ProviderLinearWorkerDependencies,
  type ProviderLinearWorkerProof
} from '../src/cli/providerLinearWorkerRunner.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import {
  PROVIDER_LINEAR_AUDIT_ENV_VAR,
  appendProviderLinearAuditEntry,
  type ProviderLinearAuditSummary
} from '../src/cli/control/providerLinearWorkflowAudit.js';
import { recordLinearBudgetHeadersObservation } from '../src/cli/control/linearBudgetState.js';
import { resolveProviderLinearChildLaneScopeContract } from '../src/cli/providerLinearChildLanePhaseContract.js';
import type { RuntimeCodexCommandContext } from '../src/cli/runtime/index.js';

let tempRoot: string | null = null;

afterEach(async () => {
  vi.unstubAllGlobals();
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

async function createManifestRoot() {
  tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-worker-'));
  const runDir = join(tempRoot, '.runs', 'linear-lin-issue-1', 'cli', 'run-child');
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
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
  return { runDir, manifestPath };
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

async function writeCodexConfig(maxTurns: number): Promise<string> {
  if (!tempRoot) {
    throw new Error('temp root not initialized');
  }
  const codexHome = join(tempRoot, '.codex');
  await mkdir(codexHome, { recursive: true });
  await writeFile(join(codexHome, 'config.toml'), `[agent]\nmax_turns = ${maxTurns}\n`, 'utf8');
  return codexHome;
}

type ReadTrackedIssueInput = Parameters<ProviderLinearWorkerDependencies['readTrackedIssue']>[0];

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

function createRuntimeContext(): RuntimeCodexCommandContext {
  return {
    env: {},
    runtime: {
      requested_mode: 'appserver',
      selected_mode: 'appserver',
      source: 'default',
      provider: 'AppServerRuntimeProvider',
      runtime_session_id: 'appserver-run-child',
      fallback: {
        occurred: false,
        code: null,
        reason: null,
        from_mode: null,
        to_mode: null,
        checked_at: '2026-03-21T09:00:00.000Z'
      },
      env_overrides: {}
    } as never
  };
}

describe('provider linear worker runner', () => {
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

  it('rejects manifest-path task fallback outside the canonical .runs layout', async () => {
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
    await writeFile(manifestPath, JSON.stringify({ run_id: 'run-child', task_id: 'linear-lin-issue-1', issue_id: 'lin-issue-1', issue_identifier: 'CO-2', pipelineId: 'provider-linear-worker', provider_control_host_task_id: 'local-mcp', provider_control_host_run_id: 'control-host', workspace_path: tempRoot }), 'utf8');
    expect(await loadProviderLinearWorkerContext({ CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath, CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined })).toMatchObject({
      pipelineId: 'provider-linear-worker',
      providerControlHostTaskId: null,
      providerControlHostRunId: null,
      providerControlHostMatchesManifest: false
    });
    expect((await loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
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
      provider_control_host_task_id: 'local-mcp',
      provider_control_host_run_id: 'control-host',
      workspace_path: tempRoot
    }), 'utf8');

    await expect(loadProviderLinearWorkerContext({
      CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
      CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'other-task',
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'other-run'
    })).resolves.toMatchObject({
      providerControlHostTaskId: null,
      providerControlHostRunId: null,
      providerControlHostMatchesManifest: false
    });
  });

  it('builds a full first-turn prompt and a continuation prompt', () => {
    const issue = createTrackedIssue();

    const helperCommand = 'node "/tmp/co/dist/bin/codex-orchestrator.js" linear';
    const sharedRepoCheckoutPath = '/tmp/co';
    const firstPrompt = buildProviderWorkerPrompt(issue, 1, 5, helperCommand, sharedRepoCheckoutPath);
    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand, sharedRepoCheckoutPath);

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
    expect(firstPrompt).toContain(`use \`${helperCommand} create-follow-up --issue-id lin-issue-1 ...\` to file a same-project follow-up issue in \`Backlog\``);
    expect(firstPrompt).toContain('intent checksum, non-goals, `Not Done If`, acceptance criteria');
    expect(firstPrompt).toContain('required parity matrix for parity/alignment follow-ups');
    expect(firstPrompt).toContain('Review handoff states are `Human Review` and `In Review`');
    expect(firstPrompt).toContain('Standalone-review policy for this provider-worker lane');
    expect(firstPrompt).toContain('`codex-orchestrator review` / `npm run review`');
    expect(firstPrompt).toContain('`FORCE_CODEX_REVIEW=1`');
    expect(firstPrompt).toContain('If a PR is already attached, run a full PR feedback sweep before any new implementation work');
    expect(firstPrompt).toContain(`\`${helperCommand} runtime-proof --issue-id lin-issue-1 --origin <app-url> --format json\``);
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
    expect(continuationPrompt).toContain(`use \`${helperCommand} create-follow-up --issue-id lin-issue-1 ...\` to file a same-project follow-up issue in \`Backlog\``);
    expect(continuationPrompt).toContain('intent checksum, non-goals, `Not Done If`, acceptance criteria');
    expect(continuationPrompt).toContain('required parity matrix for parity/alignment follow-ups');
    expect(continuationPrompt).toContain('If a PR is already attached, run a full PR feedback sweep before any new implementation work');
    expect(continuationPrompt).toContain(`\`${helperCommand} runtime-proof --issue-id lin-issue-1 --origin <app-url> --format json\``);
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
  });

  it('includes deterministic mutation suppressions in continuation prompts when the same attempt already failed validation', () => {
    const issue = createTrackedIssue();
    const helperCommand = 'node "/tmp/co/dist/bin/codex-orchestrator.js" linear';
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
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
      'Do not retry `create-follow-up` in this attempt unless you first add the required parity matrix.'
    );
  });

  it('ignores deterministic mutation suppressions that predate the current attempt', () => {
    const issue = createTrackedIssue();
    const helperCommand = 'node "/tmp/co/dist/bin/codex-orchestrator.js" linear';
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
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
      'Do not retry `create-follow-up` in this attempt unless you first add the required parity matrix.'
    );
  });

  it('ignores deterministic mutation suppressions when the current attempt start is missing', () => {
    const issue = createTrackedIssue();
    const helperCommand = 'node "/tmp/co/dist/bin/codex-orchestrator.js" linear';
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
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
      'Do not retry `create-follow-up` in this attempt unless you first add the required parity matrix.'
    );
  });

  it('suppresses deterministic workpad validation retries within the same attempt', () => {
    const issue = createTrackedIssue();
    const helperCommand = 'node "/tmp/co/dist/bin/codex-orchestrator.js" linear';
    const audit: ProviderLinearAuditSummary = {
      path: '/tmp/provider-linear-worker-linear-audit.jsonl',
      attempted_count: 1,
      success_count: 0,
      failure_count: 1,
      latest_recorded_at: '2026-03-21T09:00:00.000Z',
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

  it('ignores malformed audit summaries when deriving continuation suppressions', () => {
    const issue = createTrackedIssue();
    const helperCommand = 'node "/tmp/co/dist/bin/codex-orchestrator.js" linear';

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
      tokens: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null
      },
      rateLimits: null
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

  it('keeps token-update humanization aligned with parser-supported tokenUsage shapes', () => {
    const parsed = parseProviderLinearWorkerJsonl(
      [
        '{"type":"notification","payload":{"method":"thread/tokenUsage/updated","params":{"tokenUsage":{"inputTokens":7,"outputTokens":5,"totalTokens":12}}},"timestamp":"2026-03-21T09:00:00.100Z"}'
      ].join('\n')
    );

    expect(parsed.tokens).toEqual({
      input_tokens: 7,
      output_tokens: 5,
      total_tokens: 12
    });
    expect(parsed.finalMessage).toBe('thread token usage updated (in 7 / out 5 / total 12)');
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

  it('continues on the same thread across turns and writes a proof sidecar', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
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

    const proof = await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS: '3',
        CODEX_CLI_BIN: 'codex'
      },
      {
        readTrackedIssue,
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
        now: vi
          .fn()
          .mockReturnValueOnce('2026-03-21T09:00:00.000Z')
          .mockReturnValue('2026-03-21T09:00:01.000Z'),
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
    expect(firstTurnPrompt).toContain('manual elegance checklist');
    expect(firstTurnPrompt).toContain('Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.');
    expect(firstTurnPrompt).toContain(`inspect the shared local repo checkout at \`${expectedSharedRepoCheckoutPath}\` rather than the per-issue workspace`);
    expect(firstTurnPrompt).toContain(`\`git -C "${expectedSharedRepoCheckoutPath}" status --short --branch\``);
    expect(firstTurnPrompt).toContain(`\`git -C "${expectedSharedRepoCheckoutPath}" fetch origin refs/heads/main:refs/remotes/origin/main\``);
    expect(firstTurnPrompt).toContain(`\`git -C "${expectedSharedRepoCheckoutPath}" merge --ff-only origin/main\``);
    expect(continuationPrompt).toContain('Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff');
    expect(continuationPrompt).toContain('about 2+ changed files or about 40+ changed lines');
    expect(continuationPrompt).toContain('manual elegance checklist');
    expect(continuationPrompt).toContain('Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.');
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
      linear_audit: {
        path: join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME),
        attempted_count: 4,
        success_count: 3,
        failure_count: 1,
        latest_recorded_at: '2026-03-21T09:00:01.200Z'
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
      linear_audit: {
        path: join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME),
        attempted_count: 4,
        success_count: 3,
        failure_count: 1,
        latest_recorded_at: '2026-03-21T09:00:01.200Z',
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
    const execRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
      ].join('\n'),
      stderr: ''
    }));

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
  });

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

  it('backfills appserver session telemetry into refreshed provider proofs', async () => {
    const { runDir } = await createManifestRoot();
    const proofPath = join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify({
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

  it('forces standalone review execution env inside non-interactive provider worker turns', async () => {
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
    const execRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
      ].join('\n'),
      stderr: ''
    }));

    await runProviderLinearWorker(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
        CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        FORCE_CODEX_REVIEW: '',
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
    expect(execRunner.mock.calls[0]?.[0].env.CODEX_NON_INTERACTIVE).toBe('1');
    expect(execRunner.mock.calls[0]?.[0].env.CODEX_NO_INTERACTIVE).toBe('1');
    expect(execRunner.mock.calls[0]?.[0].env.CODEX_INTERACTIVE).toBe('0');
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
        end_reason: 'codex_exit_2'
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

  it('persists the first proof snapshot even when the manifest cannot be reread later', async () => {
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
          execRunner: vi.fn(async () => ({
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
          })),
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
      end_reason: 'codex_exit_2'
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
          execRunner: vi.fn(async () => ({
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
          })),
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
          execRunner: vi.fn(async () => ({
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
          })),
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
          execRunner: vi.fn(async () => ({
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
          })),
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
        execRunner: vi.fn(async () => ({
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
        })),
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
          execRunner: vi.fn(async () => ({
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
          })),
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
          execRunner: vi.fn(async () => ({
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
          })),
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
            execRunner: vi.fn(async () => ({
              exitCode: 2,
              stdout: [
                '{"type":"thread.started","thread_id":"thread-1"}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: 'boom'
            })),
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
          execRunner: vi.fn(async () => ({
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
          })),
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
          execRunner: vi.fn(async () => ({
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
          })),
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
          execRunner: vi.fn(async () => ({
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
          })),
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
          execRunner: vi.fn(async () => ({
            exitCode: 2,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: 'boom'
          })),
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
      end_reason: 'exec_runner_failed'
    });
  });

  it('preserves prior-turn telemetry when a resumed execRunner rejects before new turn data arrives', async () => {
    const { manifestPath, runDir } = await createManifestRoot();
    let execCallCount = 0;
    const execRunner = vi.fn(async () => {
      execCallCount += 1;
      if (execCallCount === 1) {
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
          execRunner: vi.fn(async () => ({
            exitCode: 0,
            stdout: '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            stderr: ''
          })),
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
    const execRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
      ].join('\n'),
      stderr: ''
    }));

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
    const execRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
      ].join('\n'),
      stderr: ''
    }));
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
    expect(waitForRateLimitReset).toHaveBeenCalledTimes(1);
    expect(waitForRateLimitReset).toHaveBeenCalledWith(2000);
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
      const execRunner = vi.fn(async () => ({
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      }));
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
      expect(waitForRateLimitReset).toHaveBeenCalledTimes(1);
      expect(waitForRateLimitReset).toHaveBeenCalledWith(2000);
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
          if (waitForRateLimitReset.mock.calls[0]?.[0] === 12_000) {
            return lateResetIssue;
          }
          throw mixedBucketRateLimit;
        });
      const execRunner = vi.fn(async () => ({
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      }));

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
      expect(waitForRateLimitReset).toHaveBeenCalledTimes(1);
      expect(waitForRateLimitReset).toHaveBeenCalledWith(12_000);
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
    const execRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
      ].join('\n'),
      stderr: ''
    }));
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
    expect(waitForRateLimitReset).not.toHaveBeenCalled();
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
      const execRunner = vi.fn(async () => ({
        exitCode: 0,
        stdout: [
          '{"type":"thread.started","thread_id":"thread-1"}',
          '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
          '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
        ].join('\n'),
        stderr: ''
      }));

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
    const execRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
      ].join('\n'),
      stderr: ''
    }));

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
        execRunner: vi.fn(async () => ({
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
        })),
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
    const execRunner = vi.fn(async () => {
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
        '{"timestamp":"2030-03-21T09:00:07.050Z","type":"turn_context","payload":{"turn_id":"turn-20","user_instructions":"You are the provider worker for Linear issue CO-20: Different issue title"}}',
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
        await utimes(staleSessionLogPath, staleMtime, staleMtime);
      }
      return trackedIssueReadCount >= 3 ? completedIssue : issue;
    });

    let execCallCount = 0;
    const writeProof = vi.fn(async () => undefined);
    const execRunner = vi.fn(async () => {
      execCallCount += 1;
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
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
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
    const execRunner = vi.fn(async () => {
      execCallCount += 1;
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
        resolveRuntimeContext: vi.fn(async () => createRuntimeContext()),
        execRunner,
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
          execRunner: vi.fn(async () => ({
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: ''
          })),
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
          execRunner: vi.fn(async () => ({
            exitCode: 0,
            stdout: [
              '{"type":"thread.started","thread_id":"thread-1"}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
              '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: ''
          })),
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
      await vi.waitFor(() => {
        expect(refreshBodies.filter((body) => body.owner_status === 'in_progress')).toHaveLength(2);
      });
      const secondTurnProof = JSON.parse(
        await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as Record<string, unknown>;
      expect(secondTurnProof).toMatchObject({
        latest_turn_id: 'turn-2',
        latest_session_id: 'thread-1-turn-2',
        turn_count: 2,
        last_message: 'turn-2 active',
        owner_status: 'in_progress'
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
  });

  it('emits stalled semantic progress for quiet live turns before the runner exits', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-21T09:00:00.000Z'));
      const { manifestPath } = await createManifestRoot();
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
              proof.linear_audit?.attempted_count === 1 &&
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
        execRunner: vi.fn(async () => ({
          exitCode: 0,
          stdout: [
            '{"type":"thread.started","thread_id":"thread-1"}',
            '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
            '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
          ].join('\n'),
          stderr: ''
        })),
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
    const execRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: [
        '{"type":"thread.started","thread_id":"thread-1"}',
        '{"type":"turn_context","payload":{"turn_id":"turn-1"}}',
        '{"type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-1"}}'
      ].join('\n'),
      stderr: ''
    }));

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
