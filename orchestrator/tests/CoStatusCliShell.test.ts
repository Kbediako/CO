import http from 'node:http';
import { mkdtemp, mkdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCoStatusCliShell } from '../src/cli/coStatusCliShell.js';
import { runCoStatusOperatorAutopilotCliShell } from '../src/cli/coStatusOperatorAutopilotCliShell.js';
import { appendProviderOperatorAutopilotLifecycleRecord } from '../src/cli/control/providerOperatorAutopilotLifecycle.js';

const tempDirs: string[] = [];
const servers = new Set<http.Server>();

afterEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  delete process.env.CODEX_ORCHESTRATOR_ROOT;
  delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
  delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
  await Promise.all(
    Array.from(servers, (server) =>
      new Promise<void>((resolve) => {
        try {
          server.close(() => resolve());
        } catch {
          resolve();
        }
      })
    )
  );
  servers.clear();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe('runCoStatusCliShell', () => {
  it('emits the authenticated operator-dashboard snapshot for --format json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = join(root, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(runDir, { recursive: true });

    const server = await startUiServer();
    servers.add(server.instance);

    await writeFile(
      join(runDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        status: 'in_progress'
      }),
      'utf8'
    );
    await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token: 'snapshot-token' }), 'utf8');
    await writeFile(
      join(runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: server.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(server.requests).toEqual([
      {
        authorization: 'Bearer snapshot-token',
        csrfToken: 'snapshot-token'
      }
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toEqual(buildUiPayload());
  });

  it('uses the attach path for default text-mode status instead of starting a control host', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = join(root, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(runDir, { recursive: true });

    const server = await startUiServer();
    servers.add(server.instance);

    await writeFile(
      join(runDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        status: 'in_progress'
      }),
      'utf8'
    );
    await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token: 'snapshot-token' }), 'utf8');
    await writeFile(
      join(runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: server.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(server.requests).toEqual([]);
    const loggedLines = log.mock.calls.map((call) => String(call[0]));
    expect(loggedLines).toHaveLength(5);
    expect(loggedLines[0]).toBe(`CO STATUS attach target: ${new URL(server.baseUrl).toString()}`);
    expect(loggedLines[1]).toBe('Task: local-mcp');
    expect(loggedLines[2]).toBe('Run: control-host');
    expect(loggedLines[3]).toContain('/.runs/local-mcp/cli/control-host');
    expect(loggedLines[4]).toContain('/.runs/local-mcp/cli/control-host/manifest.json');
  });

  it('rejects launch-only flags now that co-status is attach-only', async () => {
    await expect(
      runCoStatusCliShell({
        flags: {
          pipeline: 'docs-review'
        },
        printHelp: vi.fn()
      })
    ).rejects.toThrow(
      'co-status attaches to an existing control host and does not accept launch-only flags: --pipeline. Use `control-host` to start a control host with launch settings.'
    );
  });

  it('records local rollout lifecycle metadata through the co-status operator-autopilot surface', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = join(root, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(runDir, { recursive: true });
    const lifecyclePath = join(runDir, 'provider-operator-autopilot-lifecycle.json');

    const server = await startUiServer(buildUiPayload({
      provider_workflow: {
        status: 'ready',
        pipeline_id: 'provider-linear-worker',
        source_path: join(root, 'codex.orchestrator.json'),
        snapshot_path: null,
        last_reload_attempt_at: '2026-04-03T08:29:00.000Z',
        last_success_at: '2026-04-03T08:29:00.000Z',
        last_error_at: null,
        last_error: null,
        terminal_cleanup: null,
        worker_hosts: [],
        operator_autopilot: {
          enabled: true,
          backlog_promotion: {
            enabled: true,
            state_name: 'Backlog',
            target_state_name: 'Ready'
          },
          review_handoff_rework: {
            enabled: true,
            target_state_name: 'Rework',
            excluded_action_required_reasons: []
          },
          post_merge_rollout: {
            enabled: true,
            summary: 'Merge closeout completed; local rollout follow-up may still be required.'
          },
          audit_path: join(runDir, 'provider-operator-autopilot.jsonl'),
          lifecycle_path: lifecyclePath,
          last_result: {
            recorded_at: '2026-04-03T08:30:00.000Z',
            status: 'acted',
            summary: 'Surfaced 1 pending local rollout action (CO-118).',
            error: null,
            actions: [],
            holds: [],
            pending_actions: [
              {
                kind: 'local_rollout',
                action_instance_id: 'local_rollout:test-action',
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-118',
                summary: 'rollout pending',
                merge_closeout_recorded_at: '2026-04-03T08:20:00.000Z',
                merge_closeout_reason: 'merged_and_transitioned_done',
                shared_root_status: 'reconciled',
                linear_transition_status: 'transitioned',
                lifecycle_state: 'pending',
                lifecycle_actor: null,
                lifecycle_reason: null,
                lifecycle_recorded_at: null
              }
            ],
            resolved_actions: [],
            lifecycle_records: []
          }
        }
      }
    }));
    servers.add(server.instance);

    await writeFile(
      join(runDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        status: 'in_progress'
      }),
      'utf8'
    );
    await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token: 'snapshot-token' }), 'utf8');
    await writeFile(
      join(runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: server.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const originalUser = process.env.USER;
    process.env.USER = '   ';
    try {
      await runCoStatusOperatorAutopilotCliShell({
        positionals: ['local-rollout', 'dismiss'],
        flags: {
          'action-id': '   ',
          issue: 'CO-118',
          reason: 'rollout reminder is not actionable',
          'run-dir': runDir,
          format: 'json'
        },
        printHelp: vi.fn()
      });
    } finally {
      if (originalUser === undefined) {
        delete process.env.USER;
      } else {
        process.env.USER = originalUser;
      }
    }

    expect(server.requests).toEqual([
      {
        authorization: 'Bearer snapshot-token',
        csrfToken: 'snapshot-token'
      }
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      status: 'recorded',
      state: 'dismissed',
      action: 'dismiss',
      lifecycle_path: lifecyclePath
    });
    const store = JSON.parse(await readFile(lifecyclePath, 'utf8')) as Record<string, unknown>;
    expect(store).toMatchObject({
      version: 1,
      records: [
        {
          action_instance_id: 'local_rollout:test-action',
          state: 'dismissed',
          actor: 'operator',
          reason: 'rollout reminder is not actionable',
          source: 'co-status'
        }
      ]
    });
  });

  it('serializes concurrent local rollout lifecycle sidecar appends', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    const lifecyclePath = join(
      root,
      '.runs',
      'local-mcp',
      'cli',
      'control-host',
      'provider-operator-autopilot-lifecycle.json'
    );

    await Promise.all(
      ['acknowledged', 'cleared'].map((state, index) =>
        appendProviderOperatorAutopilotLifecycleRecord(lifecyclePath, {
          action_instance_id: 'local_rollout:test-action',
          kind: 'local_rollout',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          state: state as 'acknowledged' | 'cleared',
          actor: `operator-${index}`,
          reason: `operator decision ${index}`,
          recorded_at: `2026-04-09T10:2${index}:00.000Z`,
          source: 'co-status'
        })
      )
    );

    const store = JSON.parse(await readFile(lifecyclePath, 'utf8')) as {
      records?: Array<Record<string, unknown>>;
    };
    expect(store.records).toHaveLength(2);
    expect(store.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          state: 'acknowledged',
          actor: 'operator-0'
        }),
        expect.objectContaining({
          state: 'cleared',
          actor: 'operator-1'
        })
      ])
    );
  });

  it('recovers stale local rollout lifecycle sidecar locks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    const lifecyclePath = join(
      root,
      '.runs',
      'local-mcp',
      'cli',
      'control-host',
      'provider-operator-autopilot-lifecycle.json'
    );
    const lockPath = `${lifecyclePath}.lock`;
    await mkdir(dirname(lockPath), { recursive: true });
    await writeFile(lockPath, 'interrupted-owner', 'utf8');
    const staleAt = new Date(Date.now() - 60_000);
    await utimes(lockPath, staleAt, staleAt);

    await appendProviderOperatorAutopilotLifecycleRecord(lifecyclePath, {
      action_instance_id: 'local_rollout:test-action',
      kind: 'local_rollout',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      state: 'cleared',
      actor: 'operator',
      reason: 'local rollout completed',
      recorded_at: '2026-04-09T10:25:00.000Z',
      source: 'co-status'
    });

    const store = JSON.parse(await readFile(lifecyclePath, 'utf8')) as {
      records?: Array<Record<string, unknown>>;
    };
    expect(store.records).toEqual([
      expect.objectContaining({
        state: 'cleared',
        actor: 'operator'
      })
    ]);
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

async function startUiServer(payload: Record<string, unknown> = buildUiPayload()): Promise<{
  instance: http.Server;
  baseUrl: string;
  requests: Array<{ authorization: string | null; csrfToken: string | null }>;
}> {
  const requests: Array<{ authorization: string | null; csrfToken: string | null }> = [];
  const server = http.createServer((req, res) => {
    if (req.url === '/ui/data.json') {
      requests.push({
        authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : null,
        csrfToken: typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : null
      });
      if (req.headers.authorization !== 'Bearer snapshot-token') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorised' }));
        return;
      }
      if (req.headers['x-csrf-token'] !== 'snapshot-token') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'csrf required' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify(payload));
      return;
    }
    res.writeHead(404).end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('expected loopback http server address');
  }
  return {
    instance: server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests
  };
}

function buildUiPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    generated_at: '2026-04-03T08:30:00.000Z',
    mode: 'operator_dashboard',
    read_only: true,
    host: 'test-host',
    counts: { running: 1, retrying: 1, issues: 2 },
    totals: {
      input_tokens: 12,
      output_tokens: 8,
      total_tokens: 20,
      seconds_running: 61
    },
    rate_limits: {
      source: 'control-host-polling',
      requests: {
        remaining: 19,
        limit: 30,
        reset_in_seconds: 42
      }
    },
    polling: {
      enabled: true,
      interval_ms: 15000,
      checking: false,
      queued: false,
      last_mode: 'poll',
      last_requested_at: '2026-04-03T08:29:45.000Z',
      last_completed_at: '2026-04-03T08:29:46.000Z',
      last_success_at: '2026-04-03T08:29:46.000Z',
      last_error_at: null,
      last_error: null,
      next_poll_at: '2026-04-03T08:30:15.000Z',
      next_poll_in_ms: 15000
    },
    selected_issue_identifier: 'CO-76',
    selected: null,
    running: [],
    retrying: [],
    issues: [],
    ...overrides
  };
}
