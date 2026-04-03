import http from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCoStatusAttachCliShell } from '../src/cli/coStatusAttachCliShell.js';

const tempDirs: string[] = [];
const servers = new Set<http.Server>();

afterEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
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

describe('runCoStatusAttachCliShell', () => {
  it('emits json attach metadata resolved from an existing run directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-attach-shell-'));
    tempDirs.push(root);
    const runDir = join(root, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(runDir, { recursive: true });

    const server = await startUiServer();
    servers.add(server.instance);

    const manifestPath = join(runDir, 'manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        status: 'in_progress'
      }),
      'utf8'
    );
    await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token: 'attach-token' }), 'utf8');
    await writeFile(
      join(runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: server.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusAttachCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      status: 'ready',
      mode: 'attach',
      read_only: true,
      task_id: 'local-mcp',
      run_id: 'control-host',
      refresh_interval_ms: 1000
    });
    expect(String(payload.base_url)).toBe(new URL(server.baseUrl).toString());
    expect(String(payload.run_dir)).toContain('/.runs/local-mcp/cli/control-host');
    expect(String(payload.manifest_path)).toContain('/.runs/local-mcp/cli/control-host/manifest.json');
  });

  it('falls back to derived task/run metadata when the live host run dir lacks manifest.json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-attach-shell-'));
    tempDirs.push(root);
    const runDir = join(root, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(runDir, { recursive: true });

    const server = await startUiServer();
    servers.add(server.instance);

    await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token: 'attach-token' }), 'utf8');
    await writeFile(
      join(runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: server.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusAttachCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      task_id: 'local-mcp',
      run_id: 'control-host'
    });
  });
});

async function startUiServer(): Promise<{ instance: http.Server; baseUrl: string }> {
  const server = http.createServer((req, res) => {
    if (req.url === '/ui/data.json') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
      res.end(
        JSON.stringify({
          generated_at: '2026-04-03T08:30:00.000Z',
          mode: 'operator_dashboard',
          read_only: true,
          host: 'test-host',
          counts: { running: 0, retrying: 0, issues: 0 },
          totals: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            seconds_running: 0
          },
          rate_limits: null,
          polling: null,
          selected_issue_identifier: null,
          selected: null,
          running: [],
          retrying: [],
          issues: []
        })
      );
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
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}
