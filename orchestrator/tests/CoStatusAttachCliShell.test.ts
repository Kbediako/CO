import http from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCoStatusAttachCliShell } from '../src/cli/coStatusAttachCliShell.js';

const tempDirs: string[] = [];
const servers = new Set<http.Server>();
const ANSI_PATTERN = new RegExp(`${String.fromCharCode(0x1b)}(?:\\[[0-?]*[ -/]*[@-~]|[@-Z\\\\-_])`, 'g');

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

  it('rejects malformed refresh interval flags before resolving the attach target', async () => {
    await expect(
      runCoStatusAttachCliShell({
        flags: {
          'refresh-interval-ms': true
        },
        printHelp: vi.fn()
      })
    ).rejects.toThrow('Invalid --refresh-interval-ms: expected integer milliseconds >= 250');

    await expect(
      runCoStatusAttachCliShell({
        flags: {
          'refresh-interval-ms': ''
        },
        printHelp: vi.fn()
      })
    ).rejects.toThrow('Invalid --refresh-interval-ms: expected integer milliseconds >= 250');

    await expect(
      runCoStatusAttachCliShell({
        flags: {
          'refresh-interval-ms': '500ms'
        },
        printHelp: vi.fn()
      })
    ).rejects.toThrow('Invalid --refresh-interval-ms: expected integer milliseconds >= 250');

    await expect(
      runCoStatusAttachCliShell({
        flags: {
          'refresh-interval-ms': '1e3'
        },
        printHelp: vi.fn()
      })
    ).rejects.toThrow('Invalid --refresh-interval-ms: expected integer milliseconds >= 250');
  });

  it('renders the interactive attach viewer using authenticated ui requests', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-attach-shell-'));
    tempDirs.push(root);
    const runDir = await writeAttachRunDir(root);

    const server = await startUiServer();
    servers.add(server.instance);
    await writeEndpointArtifacts(runDir, server.baseUrl);

    const writes = await runInteractiveAttachAndStop(runDir);

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0]).toEqual({
      authorization: 'Bearer attach-token',
      csrfToken: 'attach-token'
    });
    const output = stripAnsi(writes.join(''));
    expect(output).toContain('CO STATUS');
    expect(output).toContain('primary scrollback');
  });

  it('fails closed with a dashboard error when the attached ui payload is malformed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-attach-shell-'));
    tempDirs.push(root);
    const runDir = await writeAttachRunDir(root);

    const server = await startUiServer({
      payload: {
        generated_at: '2026-04-03T08:30:00.000Z',
        mode: 'operator_dashboard',
        read_only: true
      }
    });
    servers.add(server.instance);
    await writeEndpointArtifacts(runDir, server.baseUrl);

    const writes = await runInteractiveAttachAndStop(runDir);

    expect(server.requests).toHaveLength(1);
    const output = stripAnsi(writes.join(''));
    expect(output).toContain('Dashboard error');
    expect(output).toContain('control-host ui dataset invalid');
  });
});

async function writeAttachRunDir(root: string): Promise<string> {
  const runDir = join(root, '.runs', 'local-mcp', 'cli', 'control-host');
  await mkdir(runDir, { recursive: true });
  await writeFile(
    join(runDir, 'manifest.json'),
    JSON.stringify({
      run_id: 'control-host',
      task_id: 'local-mcp',
      status: 'in_progress'
    }),
    'utf8'
  );
  return runDir;
}

async function writeEndpointArtifacts(runDir: string, baseUrl: string): Promise<void> {
  await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token: 'attach-token' }), 'utf8');
  await writeFile(
    join(runDir, 'control_endpoint.json'),
    JSON.stringify({
      base_url: baseUrl,
      token_path: 'control_auth.json'
    }),
    'utf8'
  );
}

async function runInteractiveAttachAndStop(runDir: string): Promise<string[]> {
  const writes: string[] = [];
  let resolveFirstWrite: (() => void) | null = null;
  const firstWrite = new Promise<void>((resolve) => {
    resolveFirstWrite = resolve;
  });
  const stdoutIsTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const stdoutColumns = Object.getOwnPropertyDescriptor(process.stdout, 'columns');
  const stderrIsTTY = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY');
  const originalTerm = process.env.TERM;
  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: true
  });
  Object.defineProperty(process.stdout, 'columns', {
    configurable: true,
    value: 120
  });
  Object.defineProperty(process.stderr, 'isTTY', {
    configurable: true,
    value: true
  });
  process.env.TERM = 'xterm-256color';
  const writeSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation(((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      resolveFirstWrite?.();
      resolveFirstWrite = null;
      return true;
    }) as typeof process.stdout.write);

  try {
    const attachPromise = runCoStatusAttachCliShell({
      flags: {
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });
    await Promise.race([firstWrite, attachPromise.then(() => undefined, () => undefined)]);
    process.emit('SIGINT');
    await attachPromise;
    return writes;
  } finally {
    writeSpy.mockRestore();
    if (stdoutIsTTY) {
      Object.defineProperty(process.stdout, 'isTTY', stdoutIsTTY);
    }
    if (stdoutColumns) {
      Object.defineProperty(process.stdout, 'columns', stdoutColumns);
    }
    if (stderrIsTTY) {
      Object.defineProperty(process.stderr, 'isTTY', stderrIsTTY);
    }
    if (originalTerm === undefined) {
      delete process.env.TERM;
    } else {
      process.env.TERM = originalTerm;
    }
  }
}

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

async function startUiServer(options: {
  payload?: unknown;
} = {}): Promise<{
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
      if (req.headers.authorization !== 'Bearer attach-token') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorised' }));
        return;
      }
      if (req.headers['x-csrf-token'] !== 'attach-token') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'csrf required' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify(options.payload ?? buildUiPayload()));
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
  };
}
