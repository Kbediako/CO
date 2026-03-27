import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  appendProviderLinearWorkerChildStreamRecord,
  buildProviderWorkerPrompt,
  loadProviderLinearWorkerContext,
  parseProviderLinearWorkerJsonl,
  readProviderLinearWorkerChildStreams,
  runProviderLinearWorker,
  PROVIDER_LINEAR_WORKER_AUDIT_FILENAME,
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  type ProviderLinearWorkerDependencies
} from '../src/cli/providerLinearWorkerRunner.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import {
  PROVIDER_LINEAR_AUDIT_ENV_VAR,
  appendProviderLinearAuditEntry
} from '../src/cli/control/providerLinearWorkflowAudit.js';
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
  await new Promise<void>((resolve) => server.listen(0, bindHost, () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind control endpoint test server.');
  }
  const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
  return {
    baseUrl: `http://${host}:${address.port}`,
    requests,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
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
    const firstPrompt = buildProviderWorkerPrompt(issue, 1, 5, helperCommand);
    const continuationPrompt = buildProviderWorkerPrompt(issue, 2, 5, helperCommand);

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
    expect(firstPrompt).toContain('`### Acceptance Criteria`');
    expect(firstPrompt).toContain('`### Validation`');
    expect(firstPrompt).toContain('`### Notes`');
    expect(firstPrompt).toContain('If the ticket includes `Validation`, `Test Plan`, or `Testing` requirements');
    expect(firstPrompt).toContain('Refresh the same workpad after each meaningful milestone and immediately before any review or merge handoff');
    expect(firstPrompt).toContain('Keep final closeout in that same workpad comment');
    expect(firstPrompt).toContain(`Use \`${helperCommand} issue-context --issue-id lin-issue-1\` to inspect the team workflow states before any transition.`);
    expect(firstPrompt).toContain('`Todo` or the live team\'s equivalent queued state (for example `Ready`)');
    expect(firstPrompt).toContain(`use \`${helperCommand} create-follow-up --issue-id lin-issue-1 ...\` to file a same-project follow-up issue in \`Backlog\``);
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
    expect(firstPrompt).not.toContain('subagent spawning unavailable in-session for this provider worker');
    expect(firstPrompt).toContain('`codex-orchestrator pr ready-review --pr <number> --quiet-minutes <window>`');
    expect(firstPrompt).toContain('Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff');
    expect(firstPrompt).toContain('about 2+ changed files or about 40+ changed lines');
    expect(firstPrompt).toContain('use the wrapper-led review path by default');
    expect(firstPrompt).toContain('manual correctness/regressions/missing-tests review');
    expect(firstPrompt).toContain('manual elegance checklist');
    expect(firstPrompt).toContain('Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.');
    expect(firstPrompt).toContain('Attach the PR to the Linear issue before handing off to the team\'s review state (`Human Review` or `In Review`)');
    expect(firstPrompt).toContain('Before handing off to the team\'s review state (`Human Review` or `In Review`), ensure required validation is green');
    expect(firstPrompt).toContain('the latest `origin/main` is merged into the branch, PR checks are green, the `pr ready-review` drain is clean, and the workpad is refreshed to match completed work');
    expect(firstPrompt).toContain('If the issue is in either review state, do not code; refresh the workpad if needed, record the handoff clearly, and end the turn.');
    expect(firstPrompt).toContain('If the issue is in `Merging`, keep ownership and shepherd the PR through conflicts, checks, and final review until it merges, then move the issue to `Done`.');
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
    expect(continuationPrompt).toContain('`### Acceptance Criteria`');
    expect(continuationPrompt).toContain('`### Validation`');
    expect(continuationPrompt).toContain('`### Notes`');
    expect(continuationPrompt).toContain('If the ticket includes `Validation`, `Test Plan`, or `Testing` requirements');
    expect(continuationPrompt).toContain('Keep final closeout in that same workpad comment');
    expect(continuationPrompt).toContain(`${helperCommand} issue-context --issue-id lin-issue-1`);
    expect(continuationPrompt).toContain('`Todo` or the live team\'s equivalent queued state (for example `Ready`)');
    expect(continuationPrompt).toContain(`use \`${helperCommand} create-follow-up --issue-id lin-issue-1 ...\` to file a same-project follow-up issue in \`Backlog\``);
    expect(continuationPrompt).toContain('If a PR is already attached, run a full PR feedback sweep before any new implementation work');
    expect(continuationPrompt).toContain(`\`${helperCommand} runtime-proof --issue-id lin-issue-1 --origin <app-url> --format json\``);
    expect(continuationPrompt).toContain(
      'add `--reachability-mode dns-public` only when you need explicit worker-local DNS public-resolution evidence. The default path stays deterministic and the helper fails closed when the permit disallows the origin or proof kind, when the proof URL is loopback/local-only, or when dns-public lookup yields non-public or unresolved answers.'
    );
    expect(continuationPrompt).toContain(`launch an audited child stream with \`${helperCommand} child-stream --pipeline <docs-review|implementation-gate|docs-relevance-advisory>\``);
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
    expect(continuationPrompt).toContain('Before handing off to the team\'s review state (`Human Review` or `In Review`), ensure required validation is green');
    expect(continuationPrompt).toContain('the latest `origin/main` is merged into the branch, PR checks are green, the `pr ready-review` drain is clean, and the workpad is refreshed to match completed work');
    expect(continuationPrompt).toContain('If the issue is in either review state, do not code; refresh the workpad if needed, record the handoff clearly, and end the turn.');
    expect(continuationPrompt).toContain('`Merging` and `Rework` are optional active workflow states only when the team exposes them.');
    expect(continuationPrompt).toContain('If the issue is in `Merging`, keep ownership and shepherd the PR through conflicts, checks, and final review until it merges, then move the issue to `Done`.');
    expect(continuationPrompt).toContain('If the issue is in `Rework`, treat it as a full approach reset');
    expect(continuationPrompt).toContain('Stop coding once the issue reaches the team\'s review handoff state (`Human Review` or `In Review`) and end the turn after the handoff is complete.');
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
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
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
    expect(firstTurnPrompt).toContain('Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff');
    expect(firstTurnPrompt).toContain('about 2+ changed files or about 40+ changed lines');
    expect(firstTurnPrompt).toContain('manual elegance checklist');
    expect(firstTurnPrompt).toContain('Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.');
    expect(continuationPrompt).toContain('Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff');
    expect(continuationPrompt).toContain('about 2+ changed files or about 40+ changed lines');
    expect(continuationPrompt).toContain('manual elegance checklist');
    expect(continuationPrompt).toContain('Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.');
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
      rate_limits: {
        limit_id: 'coding',
        primary: {
          remaining: 42
        }
      },
      linear_audit: {
        path: join(runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME),
        attempted_count: 4,
        success_count: 3,
        failure_count: 1,
        latest_recorded_at: '2026-03-21T09:00:01.200Z'
      },
      child_streams: expect.arrayContaining([expect.objectContaining({ stream: 'docs-review', task_id: 'linear-lin-issue-1-docs-review', run_id: 'docs-run-1', status: 'succeeded' }), expect.objectContaining({ stream: 'docs-review', task_id: 'linear-lin-issue-1-docs-review-alt', run_id: 'docs-run-1', status: 'succeeded' })]),
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
      end_reason: 'issue_inactive'
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
