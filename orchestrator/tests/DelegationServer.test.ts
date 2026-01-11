import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { PassThrough } from 'node:stream';
import type { Socket } from 'node:net';
import {
  applyQuestionFallback,
  callControlEndpointWithRetry,
  loadControlEndpoint,
  resolveDelegationToken,
  resolveRunManifestPath
} from '../src/cli/delegationServer.js';
import { __test__ as delegationServerTest } from '../src/cli/delegationServer.js';

const {
  runJsonRpcServer,
  parseSpawnOutput,
  handleDelegateSpawn,
  handleToolCall,
  MAX_MCP_MESSAGE_BYTES,
  MAX_MCP_HEADER_BYTES
} = delegationServerTest;
const ORIGINAL_EXIT_CODE = process.exitCode;

let spawnMock: ReturnType<typeof vi.fn>;

vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args)
}));

beforeEach(() => {
  spawnMock = vi.fn();
});

afterEach(() => {
  process.exitCode = ORIGINAL_EXIT_CODE;
});

async function setupRun(options: { baseUrl?: string; tokenPath?: string } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'delegation-server-'));
  const runDir = join(root, '.runs', 'task-0940', 'cli', 'run-1');
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({}), 'utf8');
  const tokenPath = options.tokenPath ?? join(runDir, 'control_auth.json');
  await writeFile(tokenPath, JSON.stringify({ token: 'secret-token' }), 'utf8');
  await writeFile(
    join(runDir, 'control_endpoint.json'),
    JSON.stringify({
      base_url: options.baseUrl ?? 'http://127.0.0.1:1234',
      token_path: tokenPath
    }),
    'utf8'
  );
  return { root, runDir, manifestPath, tokenPath };
}

describe('delegation server manifest validation', () => {
  it('resolves a run manifest path within allowed roots', async () => {
    const { root, manifestPath } = await setupRun();
    try {
      const resolved = resolveRunManifestPath(manifestPath, [root], 'manifest_path');
      expect(resolved).toBe(manifestPath);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects manifest paths outside the run layout', async () => {
    const root = await mkdtemp(join(tmpdir(), 'delegation-server-'));
    try {
      const badPath = join(root, 'manifest.json');
      expect(() => resolveRunManifestPath(badPath, [root], 'manifest_path')).toThrow('invalid');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects control endpoints with disallowed hosts', async () => {
    const { root, manifestPath } = await setupRun({ baseUrl: 'http://evil.example.com' });
    try {
      await expect(loadControlEndpoint(manifestPath, { allowedHosts: ['127.0.0.1'] })).rejects.toThrow(
        'not permitted'
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects control endpoints with token paths outside the run dir', async () => {
    const root = await mkdtemp(join(tmpdir(), 'delegation-server-'));
    const runDir = join(root, '.runs', 'task-0940', 'cli', 'run-1');
    await mkdir(runDir, { recursive: true });
    const manifestPath = join(runDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify({}), 'utf8');
    const externalToken = join(root, 'outside-token.json');
    await writeFile(externalToken, JSON.stringify({ token: 'secret-token' }), 'utf8');
    await writeFile(
      join(runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: 'http://127.0.0.1:1234',
        token_path: externalToken
      }),
      'utf8'
    );
    try {
      await expect(loadControlEndpoint(manifestPath, { allowedHosts: ['127.0.0.1'] })).rejects.toThrow(
        'control auth path invalid'
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('delegation server question helpers', () => {
  it('loads delegation token from run directory when codex_private is missing', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    const tokenPath = join(runDir, 'delegation_token.json');
    await writeFile(tokenPath, JSON.stringify({ token: 'delegation-secret' }), 'utf8');
    const previousManifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = manifestPath;

    try {
      const token = await resolveDelegationToken({ jsonrpc: '2.0', method: 'tools/call', params: {} }, [root]);
      expect(token).toBe('delegation-secret');
    } finally {
      if (previousManifestPath) {
        process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = previousManifestPath;
      } else {
        delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
      }
      await rm(root, { recursive: true, force: true });
    }
  });

  it('resolves relative delegation token path from the run directory', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    const tokenPath = join(runDir, 'delegation_token.json');
    await writeFile(tokenPath, JSON.stringify({ token: 'delegation-relative' }), 'utf8');
    const previousManifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    const previousTokenPath = process.env.CODEX_DELEGATION_TOKEN_PATH;
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = manifestPath;
    process.env.CODEX_DELEGATION_TOKEN_PATH = 'delegation_token.json';

    try {
      const token = await resolveDelegationToken({ jsonrpc: '2.0', method: 'tools/call', params: {} }, [root]);
      expect(token).toBe('delegation-relative');
    } finally {
      if (previousManifestPath) {
        process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = previousManifestPath;
      } else {
        delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
      }
      if (previousTokenPath) {
        process.env.CODEX_DELEGATION_TOKEN_PATH = previousTokenPath;
      } else {
        delete process.env.CODEX_DELEGATION_TOKEN_PATH;
      }
      await rm(root, { recursive: true, force: true });
    }
  });

  it('ignores relative delegation token paths when manifest is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'delegation-token-cwd-'));
    const tokenPath = join(root, 'delegation_token.json');
    await writeFile(tokenPath, JSON.stringify({ token: 'cwd-token' }), 'utf8');
    const relativeTokenPath = relative(process.cwd(), tokenPath);
    const previousManifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    const previousTokenPath = process.env.CODEX_DELEGATION_TOKEN_PATH;
    delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    process.env.CODEX_DELEGATION_TOKEN_PATH = relativeTokenPath;

    try {
      const token = await resolveDelegationToken({ jsonrpc: '2.0', method: 'tools/call', params: {} }, [root]);
      expect(token).toBeNull();
    } finally {
      if (previousManifestPath) {
        process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = previousManifestPath;
      }
      if (previousTokenPath) {
        process.env.CODEX_DELEGATION_TOKEN_PATH = previousTokenPath;
      } else {
        delete process.env.CODEX_DELEGATION_TOKEN_PATH;
      }
      await rm(root, { recursive: true, force: true });
    }
  });

  it('retries delegation token reads until the file is available', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    const tokenPath = join(runDir, 'delegation_token.json');
    const previousManifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = manifestPath;

    try {
      setTimeout(() => {
        void writeFile(tokenPath, JSON.stringify({ token: 'delegation-delayed' }), 'utf8').catch(() => undefined);
      }, 25);
      const token = await resolveDelegationToken(
        { jsonrpc: '2.0', method: 'tools/call', params: {} },
        [root],
        { retryMs: 400, intervalMs: 25 }
      );
      expect(token).toBe('delegation-delayed');
    } finally {
      if (previousManifestPath) {
        process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = previousManifestPath;
      } else {
        delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
      }
      await rm(root, { recursive: true, force: true });
    }
  });

  it('retries control calls when delegation token is not yet registered', async () => {
    let calls = 0;
    const parentServer = http.createServer((req, res) => {
      if (req.url === '/questions/enqueue') {
        calls += 1;
        if (calls === 1) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'delegation_token_invalid' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => parentServer.listen(0, '127.0.0.1', resolve));
    const address = parentServer.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });

    try {
      const result = await callControlEndpointWithRetry(
        manifestPath,
        '/questions/enqueue',
        { prompt: 'Need approval', urgency: 'high' },
        {
          'x-codex-delegation-token': 'token',
          'x-codex-delegation-run-id': 'run-1'
        },
        { allowedHosts: ['127.0.0.1'], retryMs: 200, retryIntervalMs: 25 }
      );
      expect(result).toMatchObject({ ok: true });
      expect(calls).toBeGreaterThan(1);
    } finally {
      await new Promise<void>((resolve) => parentServer.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('times out control endpoint requests', async () => {
    const sockets = new Set<Socket>();
    const stalledServer = http.createServer(() => {
      // Intentionally do not respond to trigger timeout.
    });
    stalledServer.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
    await new Promise<void>((resolve) => stalledServer.listen(0, '127.0.0.1', resolve));
    const address = stalledServer.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });

    try {
      await expect(
        callControlEndpointWithRetry(
          manifestPath,
          '/questions',
          null,
          {},
          { allowedHosts: ['127.0.0.1'], retryMs: 0, timeoutMs: 200 }
        )
      ).rejects.toThrow('control endpoint request timeout');
    } finally {
      sockets.forEach((socket) => socket.destroy());
      await new Promise<void>((resolve) => stalledServer.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('applies resume fallback only when awaiting question', async () => {
    let receivedAction: Record<string, unknown> | null = null;
    const childServer = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        receivedAction = JSON.parse(body || '{}') as Record<string, unknown>;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => childServer.listen(0, '127.0.0.1', resolve));
    const address = childServer.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, runDir, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      join(runDir, 'control.json'),
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 1,
        latest_action: {
          request_id: null,
          requested_by: 'delegate',
          requested_at: new Date().toISOString(),
          action: 'pause',
          reason: 'awaiting_question_answer'
        }
      }),
      'utf8'
    );
    const previousManifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = manifestPath;

    try {
      await applyQuestionFallback('resume', ['127.0.0.1']);
      expect(receivedAction?.action).toBe('resume');
    } finally {
      if (previousManifestPath) {
        process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = previousManifestPath;
      } else {
        delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
      }
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('skips question fallback when pause reason is unrelated', async () => {
    let receivedAction: Record<string, unknown> | null = null;
    const childServer = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        receivedAction = JSON.parse(body || '{}') as Record<string, unknown>;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => childServer.listen(0, '127.0.0.1', resolve));
    const address = childServer.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, runDir, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      join(runDir, 'control.json'),
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 1,
        latest_action: {
          request_id: null,
          requested_by: 'user',
          requested_at: new Date().toISOString(),
          action: 'pause',
          reason: 'manual_pause'
        }
      }),
      'utf8'
    );
    const previousManifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = manifestPath;

    try {
      await applyQuestionFallback('resume', ['127.0.0.1']);
      expect(receivedAction).toBeNull();
    } finally {
      if (previousManifestPath) {
        process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = previousManifestPath;
      } else {
        delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
      }
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('updates pause reason when question fallback is pause', async () => {
    let receivedAction: Record<string, unknown> | null = null;
    const childServer = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        receivedAction = JSON.parse(body || '{}') as Record<string, unknown>;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => childServer.listen(0, '127.0.0.1', resolve));
    const address = childServer.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, runDir, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      join(runDir, 'control.json'),
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 1,
        latest_action: {
          request_id: null,
          requested_by: 'delegate',
          requested_at: new Date().toISOString(),
          action: 'pause',
          reason: 'awaiting_question_answer'
        }
      }),
      'utf8'
    );
    const previousManifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = manifestPath;

    try {
      await applyQuestionFallback('pause', ['127.0.0.1'], [root]);
      expect(receivedAction?.action).toBe('pause');
      expect(receivedAction?.reason).toBe('question_expired');
    } finally {
      if (previousManifestPath) {
        process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = previousManifestPath;
      } else {
        delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
      }
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails the run when question fallback is fail', async () => {
    let receivedAction: Record<string, unknown> | null = null;
    const childServer = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        receivedAction = JSON.parse(body || '{}') as Record<string, unknown>;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => childServer.listen(0, '127.0.0.1', resolve));
    const address = childServer.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, runDir, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      join(runDir, 'control.json'),
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 1,
        latest_action: {
          request_id: null,
          requested_by: 'delegate',
          requested_at: new Date().toISOString(),
          action: 'pause',
          reason: 'awaiting_question_answer'
        }
      }),
      'utf8'
    );
    const previousManifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = manifestPath;

    try {
      await applyQuestionFallback('fail', ['127.0.0.1'], [root]);
      expect(receivedAction?.action).toBe('fail');
      expect(receivedAction?.reason).toBe('question_expired');
    } finally {
      if (previousManifestPath) {
        process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = previousManifestPath;
      } else {
        delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
      }
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('delegation server spawn output parsing', () => {
  it('extracts JSON payload after log lines', () => {
    const stdout = [
      '[Codex-Orchestrator] prepareRun start for pipeline diagnostics',
      '[Codex-Orchestrator] prepareRun complete for pipeline diagnostics',
      '{',
      '  "run_id": "run-123",',
      '  "status": "completed",',
      '  "manifest": ".runs/task/cli/run-123/manifest.json"',
      '}'
    ].join('\n');
    const parsed = parseSpawnOutput(stdout);
    expect(parsed).toMatchObject({
      run_id: 'run-123',
      status: 'completed',
      manifest: '.runs/task/cli/run-123/manifest.json'
    });
  });

  it('extracts JSON payload before trailing logs', () => {
    const stdout = [
      '[Codex-Orchestrator] prepareRun start for pipeline diagnostics',
      '{',
      '  "run_id": "run-456",',
      '  "status": "completed",',
      '  "manifest": ".runs/task/cli/run-456/manifest.json"',
      '}',
      '[Codex-Orchestrator] post-run cleanup complete'
    ].join('\n');
    const parsed = parseSpawnOutput(stdout);
    expect(parsed).toMatchObject({
      run_id: 'run-456',
      status: 'completed',
      manifest: '.runs/task/cli/run-456/manifest.json'
    });
  });
});

describe('delegation server spawn validation', () => {
  it('returns absolute manifest paths when spawn output is relative', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'delegation-spawn-repo-'));
    try {
      const runDir = join(repoRoot, '.runs', 'task-0940', 'cli', 'run-1');
      await mkdir(runDir, { recursive: true });
      const manifestPath = join(runDir, 'manifest.json');
      await writeFile(manifestPath, JSON.stringify({}), 'utf8');

      const child = new MockChildProcess();
      spawnMock.mockReturnValue(child as unknown);

      const repoArg = relative(process.cwd(), repoRoot);
      const spawnPromise = handleDelegateSpawn(
        { pipeline: 'diagnostics', repo: repoArg },
        repoRoot,
        false,
        [repoRoot],
        ['127.0.0.1'],
        []
      );

      await new Promise((resolve) => setImmediate(resolve));
      const stdout = JSON.stringify({
        run_id: 'run-1',
        status: 'completed',
        manifest: relative(repoRoot, manifestPath)
      });
      child.stdout.write(stdout);
      child.emit('exit', 0);

      const result = await spawnPromise;
      expect(spawnMock).toHaveBeenCalled();
      const spawnArgs = spawnMock.mock.calls[0]?.[2] as { cwd?: string } | undefined;
      expect(spawnArgs?.cwd).toBe(repoRoot);
      expect(result).toMatchObject({
        run_id: 'run-1',
        manifest_path: manifestPath,
        events_path: join(runDir, 'events.jsonl')
      });
      const tokenRaw = await readFile(join(runDir, 'delegation_token.json'), 'utf8');
      expect(tokenRaw).toContain('token');
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('returns spawn_failed when manifest path is outside allowed roots', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'delegation-spawn-repo-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'delegation-spawn-outside-'));
    try {
      const runDir = join(outsideRoot, '.runs', 'task-0940', 'cli', 'run-1');
      await mkdir(runDir, { recursive: true });
      const manifestPath = join(runDir, 'manifest.json');
      await writeFile(manifestPath, JSON.stringify({}), 'utf8');

      const child = new MockChildProcess();
      spawnMock.mockReturnValue(child as unknown);

      const spawnPromise = handleDelegateSpawn(
        { pipeline: 'diagnostics', repo: repoRoot },
        repoRoot,
        false,
        [repoRoot],
        ['127.0.0.1'],
        []
      );

      await new Promise((resolve) => setImmediate(resolve));
      const stdout = JSON.stringify({
        run_id: 'run-1',
        status: 'completed',
        manifest: manifestPath
      });
      child.stdout.write(stdout);
      child.emit('exit', 0);

      const result = await spawnPromise;
      expect(result).toEqual({ status: 'spawn_failed', stdout, stderr: '' });
      await expect(access(join(runDir, 'delegation_token.json'))).rejects.toThrow();
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });
});

describe('delegation server secret guards', () => {
  it('rejects camelCase confirmNonce in tool inputs', async () => {
    const previousManifest = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    try {
      await expect(
        handleToolCall(
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'delegate.status',
              arguments: { confirmNonce: 'bad' }
            }
          },
          {
            repoRoot: process.cwd(),
            mode: 'full',
            allowNested: false,
            githubEnabled: false,
            allowedGithubOps: new Set<string>(),
            allowedRoots: [process.cwd()],
            allowedHosts: ['127.0.0.1'],
            toolProfile: [],
            expiryFallback: 'pause'
          }
        )
      ).rejects.toThrow('confirm_nonce must be injected by the runner');
    } finally {
      if (previousManifest) {
        process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH = previousManifest;
      } else {
        delete process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
      }
    }
  });
});

describe('delegation server MCP framing', () => {
  it('parses framed requests and writes framed responses', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    let receivedMethod: string | null = null;
    await runJsonRpcServer(async (request) => {
      receivedMethod = request.method;
      return { ok: true };
    }, { stdin: input, stdout: output });

    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'delegate.status', params: {} });
    const responsePromise = new Promise<Record<string, unknown>>((resolve) => {
      let buffer = Buffer.alloc(0);
      output.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) {
          return;
        }
        const header = buffer.slice(0, headerEnd).toString('utf8');
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          return;
        }
        const length = Number(match[1]);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + length) {
          return;
        }
        const body = buffer.slice(bodyStart, bodyStart + length).toString('utf8');
        resolve(JSON.parse(body) as Record<string, unknown>);
      });
    });

    input.write(`Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`);
    const response = await responsePromise;
    expect(receivedMethod).toBe('delegate.status');
    expect(response).toEqual({ jsonrpc: '2.0', id: 1, result: { ok: true } });

    input.end();
  });

  it('allows delimiter split across chunks without rejecting', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    let receivedMethod: string | null = null;
    await runJsonRpcServer(async (request) => {
      receivedMethod = request.method;
      return { ok: true };
    }, { stdin: input, stdout: output });

    const payload = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'delegate.status', params: {} });
    const headerBase = `Content-Length: ${Buffer.byteLength(payload)}\r\n`;
    const fillerLength = Math.max(0, MAX_MCP_HEADER_BYTES - headerBase.length);
    const header = `${headerBase}${'a'.repeat(fillerLength)}`;
    expect(Buffer.byteLength(header)).toBe(MAX_MCP_HEADER_BYTES);

    const responsePromise = new Promise<Record<string, unknown>>((resolve) => {
      let buffer = Buffer.alloc(0);
      output.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) {
          return;
        }
        const headerValue = buffer.slice(0, headerEnd).toString('utf8');
        const match = headerValue.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          return;
        }
        const length = Number(match[1]);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + length) {
          return;
        }
        const body = buffer.slice(bodyStart, bodyStart + length).toString('utf8');
        resolve(JSON.parse(body) as Record<string, unknown>);
      });
    });

    input.write(header);
    input.write('\r\n');
    await new Promise((resolve) => setImmediate(resolve));
    expect(process.exitCode).toBeUndefined();

    input.write(`\r\n${payload}`);
    const response = await responsePromise;
    expect(receivedMethod).toBe('delegate.status');
    expect(response).toEqual({ jsonrpc: '2.0', id: 2, result: { ok: true } });

    input.end();
  });

  it('keeps non-zero exitCode after oversized payloads', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    await runJsonRpcServer(async () => ({}), { stdin: input, stdout: output });

    input.write(`Content-Length: ${MAX_MCP_MESSAGE_BYTES + 1}\r\n\r\n`);
    await new Promise((resolve) => setImmediate(resolve));
    expect(process.exitCode).toBe(1);

    input.end();
    await new Promise((resolve) => setImmediate(resolve));
    expect(process.exitCode).toBe(1);
  });

  it('rejects oversized headers without terminators', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    await runJsonRpcServer(async () => ({}), { stdin: input, stdout: new PassThrough() });

    input.write(Buffer.alloc(MAX_MCP_HEADER_BYTES + 1, 'a'));
    await new Promise((resolve) => setImmediate(resolve));
    expect(process.exitCode).toBe(1);

    input.end();
  });

  it('rejects multiple Content-Length headers', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    await runJsonRpcServer(async () => ({}), { stdin: input, stdout: new PassThrough() });

    input.write('Content-Length: 1\r\nContent-Length: 2\r\n\r\n');
    await new Promise((resolve) => setImmediate(resolve));
    expect(process.exitCode).toBe(1);

    input.end();
  });

  it('rejects missing Content-Length headers', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    await runJsonRpcServer(async () => ({}), { stdin: input, stdout: new PassThrough() });

    input.write('Content-Type: application/json\r\n\r\n{}');
    await new Promise((resolve) => setImmediate(resolve));
    expect(process.exitCode).toBe(1);

    input.end();
  });
});

class MockChildProcess extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  kill(): boolean {
    return true;
  }
}
