import http from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCoStatusCliShell } from '../src/cli/coStatusCliShell.js';

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
});

async function startUiServer(): Promise<{
  instance: http.Server;
  baseUrl: string;
  requests: Array<{ authorization: string | null; csrfToken: string | null }>;
}> {
  const requests: Array<{ authorization: string | null; csrfToken: string | null }> = [];
  const payload = buildUiPayload();
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

function buildUiPayload(): Record<string, unknown> {
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
    issues: []
  };
}
