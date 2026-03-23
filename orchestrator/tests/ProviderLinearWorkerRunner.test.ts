import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildProviderWorkerPrompt,
  loadProviderLinearWorkerContext,
  parseProviderLinearWorkerJsonl,
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
    expect(firstPrompt).toContain(`Use \`${helperCommand} issue-context --issue-id lin-issue-1\` to inspect the team workflow states before any transition.`);
    expect(firstPrompt).toContain('`Todo` or the live team\'s equivalent queued state (for example `Ready`)');
    expect(firstPrompt).toContain('Review handoff states are `Human Review` and `In Review`');
    expect(firstPrompt).toContain('If a PR is already attached, run a full PR feedback sweep before any new implementation work');
    expect(firstPrompt).toContain('Attach the PR to the Linear issue before handing off to the team\'s review state (`Human Review` or `In Review`)');
    expect(firstPrompt).toContain('Before handing off to the team\'s review state (`Human Review` or `In Review`), ensure required validation is green');
    expect(firstPrompt).toContain('the latest `origin/main` is merged into the branch, PR checks are green, and the workpad is refreshed to match completed work');
    expect(firstPrompt).toContain('If the issue is in either review state, do not code; wait and poll for review or status updates.');
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
    expect(continuationPrompt).toContain(`use \`${helperCommand} issue-context --issue-id lin-issue-1\` to inspect the team workflow states before any transition.`);
    expect(continuationPrompt).toContain('`Todo` or the live team\'s equivalent queued state (for example `Ready`)');
    expect(continuationPrompt).toContain('If a PR is already attached, run a full PR feedback sweep before any new implementation work');
    expect(continuationPrompt).toContain('Review handoff states are `Human Review` and `In Review`');
    expect(continuationPrompt).toContain('Before handing off to the team\'s review state (`Human Review` or `In Review`), ensure required validation is green');
    expect(continuationPrompt).toContain('the latest `origin/main` is merged into the branch, PR checks are green, and the workpad is refreshed to match completed work');
    expect(continuationPrompt).toContain('If the issue is in either review state, do not code; wait and poll for review or status updates.');
    expect(continuationPrompt).toContain('`Merging` and `Rework` are optional active workflow states only when the team exposes them.');
    expect(continuationPrompt).toContain('If the issue is in `Merging`, keep ownership and shepherd the PR through conflicts, checks, and final review until it merges, then move the issue to `Done`.');
    expect(continuationPrompt).toContain('If the issue is in `Rework`, treat it as a full approach reset');
    expect(continuationPrompt).toContain('Stop coding once the issue reaches the team\'s review handoff state (`Human Review` or `In Review`)');
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

  it('fails closed when a codex turn exits non-zero and writes a failed proof sidecar', async () => {
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
