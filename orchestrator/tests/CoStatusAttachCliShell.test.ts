import http from 'node:http';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchUiDataset,
  resolveAttachTarget,
  runCoStatusAttachCliShell
} from '../src/cli/coStatusAttachCliShell.js';

const tempDirs: string[] = [];
const servers = new Set<http.Server>();
const ANSI_PATTERN = new RegExp(`${String.fromCharCode(0x1b)}(?:\\[[0-?]*[ -/]*[@-~]|[@-Z\\\\-_])`, 'g');

afterEach(() => {
  delete process.env.CODEX_ORCHESTRATOR_ROOT;
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

  it('derives workspace root from the attached run directory instead of caller cwd', async () => {
    const callerRoot = await mkdtemp(join(tmpdir(), 'co-status-attach-caller-'));
    const attachedRoot = await mkdtemp(join(tmpdir(), 'co-status-attach-target-'));
    tempDirs.push(callerRoot, attachedRoot);
    process.env.CODEX_ORCHESTRATOR_ROOT = callerRoot;

    const runDir = join(attachedRoot, '.runs', 'local-mcp', 'cli', 'control-host');
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
    await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token: 'attach-token' }), 'utf8');
    await writeFile(
      join(runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: server.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );

    const target = await resolveAttachTarget({ 'run-dir': runDir });

    expect(target.workspaceRoot).toBe(await realpath(attachedRoot));
  });

  it('prefers manifest workspace_path when the run directory is outside the workspace', async () => {
    const callerRoot = await mkdtemp(join(tmpdir(), 'co-status-attach-caller-'));
    const attachedRoot = await mkdtemp(join(tmpdir(), 'co-status-attach-target-'));
    const externalRunsRoot = await mkdtemp(join(tmpdir(), 'co-status-attach-runs-'));
    tempDirs.push(callerRoot, attachedRoot, externalRunsRoot);
    process.env.CODEX_ORCHESTRATOR_ROOT = callerRoot;

    const runDir = join(externalRunsRoot, 'deep', 'local-mcp', 'cli', 'control-host');
    await mkdir(runDir, { recursive: true });

    const server = await startUiServer();
    servers.add(server.instance);

    await writeFile(
      join(runDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        status: 'in_progress',
        workspace_path: attachedRoot
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

    const target = await resolveAttachTarget({ 'run-dir': runDir });

    expect(target.workspaceRoot).toBe(await realpath(attachedRoot));
  });

  it('prefers manifest workspacePath when the run directory is outside the workspace', async () => {
    const callerRoot = await mkdtemp(join(tmpdir(), 'co-status-attach-caller-'));
    const attachedRoot = await mkdtemp(join(tmpdir(), 'co-status-attach-target-'));
    const externalRunsRoot = await mkdtemp(join(tmpdir(), 'co-status-attach-runs-'));
    tempDirs.push(callerRoot, attachedRoot, externalRunsRoot);
    process.env.CODEX_ORCHESTRATOR_ROOT = callerRoot;

    const runDir = join(externalRunsRoot, 'deep', 'local-mcp', 'cli', 'control-host');
    await mkdir(runDir, { recursive: true });

    const server = await startUiServer();
    servers.add(server.instance);

    await writeFile(
      join(runDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        status: 'in_progress',
        workspacePath: attachedRoot
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

    const target = await resolveAttachTarget({ 'run-dir': runDir });

    expect(target.workspaceRoot).toBe(await realpath(attachedRoot));
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

  it('re-resolves endpoint artifacts and recovers when the attached endpoint rotates', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-attach-shell-'));
    tempDirs.push(root);
    const runDir = await writeAttachRunDir(root);

    const currentServer = await startUiServer();
    servers.add(currentServer.instance);
    const staleServer = await startUiServer({
      failNetwork: true,
      beforeNetworkFailure: async () => {
        await writeEndpointArtifacts(runDir, currentServer.baseUrl);
      }
    });
    servers.add(staleServer.instance);
    await writeEndpointArtifacts(runDir, staleServer.baseUrl);

    const writes = await runInteractiveAttachAndStop(runDir);

    expect(staleServer.requests).toHaveLength(1);
    expect(currentServer.requests).toHaveLength(1);
    const output = stripAnsi(writes.join(''));
    expect(output).toContain('CO STATUS');
    expect(output).not.toContain('Dashboard error');
  });

  it('renders stale endpoint guidance when the attached endpoint is dead and does not rotate', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-attach-shell-'));
    tempDirs.push(root);
    const runDir = await writeAttachRunDir(root);

    const staleServer = await startUiServer();
    await closeServer(staleServer.instance);
    await writeEndpointArtifacts(runDir, staleServer.baseUrl);

    const writes = await runInteractiveAttachAndStop(runDir);

    const output = stripAnsi(writes.join(''));
    expect(output).toContain('Dashboard error');
    expect(output).toContain('current-host-unhealthy');
    expect(output).toContain('control-host unavailable');
    expect(output).toContain('stale endpoint');
    expect(output).toContain('control_endpoint.json');
  });

  it('renders refreshed endpoint guidance when a rotated endpoint is still unreachable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-attach-shell-'));
    tempDirs.push(root);
    const runDir = await writeAttachRunDir(root);

    const refreshedServer = await startUiServer();
    await closeServer(refreshedServer.instance);
    const staleServer = await startUiServer({
      failNetwork: true,
      beforeNetworkFailure: async () => {
        await writeEndpointArtifacts(runDir, refreshedServer.baseUrl);
      }
    });
    servers.add(staleServer.instance);
    await writeEndpointArtifacts(runDir, staleServer.baseUrl);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const writes = await runInteractiveAttachAndStop(runDir);

    const output = stripAnsi(writes.join(''));
    const warningOutput = warn.mock.calls.map((call) => String(call[0])).join('\n');
    expect(output).toContain('Dashboard error');
    expect(output).toContain('control-host endpoint rotated');
    expect(warningOutput).toContain('refreshed control-host endpoint is still unreachable');
    expect(warningOutput).not.toContain('control_endpoint.json has not rotated to a reachable host');
  });

  it('renders auth guidance when the current endpoint rejects attach credentials', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-attach-shell-'));
    tempDirs.push(root);
    const runDir = await writeAttachRunDir(root);

    const server = await startUiServer();
    servers.add(server.instance);
    await writeEndpointArtifacts(runDir, server.baseUrl, 'stale-token');

    const writes = await runInteractiveAttachAndStop(runDir);

    const output = stripAnsi(writes.join(''));
    expect(output).toContain('Dashboard error');
    expect(output).toContain('control-host ui auth failed: 401');
    expect(output).toContain('control_auth.json');
  });

  it('re-resolves auth artifacts and recovers when the attach token rotates', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-attach-shell-'));
    tempDirs.push(root);
    const runDir = await writeAttachRunDir(root);

    const serverRef: { current?: Awaited<ReturnType<typeof startUiServer>> } = {};
    const server = await startUiServer({
      beforeUnauthorized: async () => {
        const currentServer = serverRef.current;
        if (!currentServer) {
          throw new Error('expected test server reference before unauthorized retry');
        }
        await writeEndpointArtifacts(runDir, currentServer.baseUrl, 'attach-token');
      }
    });
    serverRef.current = server;
    servers.add(server.instance);
    await writeEndpointArtifacts(runDir, server.baseUrl, 'stale-token');

    const writes = await runInteractiveAttachAndStop(runDir);

    expect(server.requests).toHaveLength(2);
    expect(server.requests[0]).toMatchObject({
      authorization: 'Bearer stale-token',
      csrfToken: 'stale-token'
    });
    expect(server.requests[1]).toMatchObject({
      authorization: 'Bearer attach-token',
      csrfToken: 'attach-token'
    });
    const output = stripAnsi(writes.join(''));
    expect(output).toContain('CO STATUS');
    expect(output).not.toContain('Dashboard error');
  });

  it('classifies attach ui request timeouts', async () => {
    let resolveRequestObserved: (() => void) | null = null;
    const requestObserved = new Promise<void>((resolve) => {
      resolveRequestObserved = resolve;
    });
    const server = await startUiServer({
      holdOpen: true,
      onRequest: () => {
        resolveRequestObserved?.();
        resolveRequestObserved = null;
      }
    });
    servers.add(server.instance);

    const timeoutPromise = fetchUiDataset(new URL(server.baseUrl), 'attach-token', {
      requestTimeoutMs: 500
    });
    await Promise.race([
      requestObserved,
      timeoutPromise.then(
        () => {
          throw new Error('expected held-open request to time out');
        },
        (error: unknown) => {
          throw new Error(
            `fetch timed out before the server observed the request: ${
              (error as Error)?.message ?? String(error)
            }`
          );
        }
      )
    ]);

    await expect(timeoutPromise).rejects.toThrow('control-host ui request timeout after 500ms');
    expect(server.requests).toHaveLength(1);
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

async function writeEndpointArtifacts(
  runDir: string,
  baseUrl: string,
  token = 'attach-token'
): Promise<void> {
  await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token }), 'utf8');
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

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    try {
      server.close(() => resolve());
    } catch {
      resolve();
    }
  });
  servers.delete(server);
}

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

async function startUiServer(options: {
  payload?: unknown;
  failNetwork?: boolean;
  beforeNetworkFailure?: () => Promise<void> | void;
  beforeUnauthorized?: () => Promise<void> | void;
  holdOpen?: boolean;
  onRequest?: () => Promise<void> | void;
} = {}): Promise<{
  instance: http.Server;
  baseUrl: string;
  requests: Array<{ authorization: string | null; csrfToken: string | null }>;
}> {
  const requests: Array<{ authorization: string | null; csrfToken: string | null }> = [];
  const server = http.createServer(async (req, res) => {
    if (req.url === '/ui/data.json') {
      requests.push({
        authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : null,
        csrfToken: typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : null
      });
      await options.onRequest?.();
      if (options.failNetwork) {
        await options.beforeNetworkFailure?.();
        req.socket.destroy();
        return;
      }
      if (options.holdOpen) {
        return;
      }
      if (req.headers.authorization !== 'Bearer attach-token') {
        await options.beforeUnauthorized?.();
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
