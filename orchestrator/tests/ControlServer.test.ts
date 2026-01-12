import { describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import * as fsUtils from '../src/cli/utils/fs.js';
import {
  ControlServer,
  formatHostForUrl,
  isLoopbackAddress,
  __test__ as controlServerTest
} from '../src/cli/control/controlServer.js';
import { computeEffectiveDelegationConfig } from '../src/cli/config/delegationConfig.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

const { readDelegationHeaders, callChildControlEndpoint } = controlServerTest;

async function createRunRoot(taskId: string) {
  const root = await mkdtemp(join(tmpdir(), 'control-server-'));
  const env = { repoRoot: root, runsRoot: join(root, '.runs'), outRoot: join(root, 'out'), taskId };
  const paths = resolveRunPaths(env, 'run-1');
  await mkdir(paths.runDir, { recursive: true });
  return { root, env, paths };
}

async function readToken(path: string): Promise<string> {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as { token?: string };
  return parsed.token ?? '';
}

describe('ControlServer', () => {
  it('formats IPv6 hosts for base URLs', () => {
    expect(formatHostForUrl('127.0.0.1')).toBe('127.0.0.1');
    expect(formatHostForUrl('::1')).toBe('[::1]');
    expect(formatHostForUrl('[::1]')).toBe('[::1]');
  });

  it('detects loopback addresses', () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('::1')).toBe(true);
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('192.168.0.1')).toBe(false);
  });

  it('parses delegation headers from string arrays', () => {
    const req = {
      headers: {
        'x-codex-delegation-token': [' token '],
        'x-codex-delegation-run-id': [' child-run ']
      }
    } as unknown as http.IncomingMessage;

    const parsed = readDelegationHeaders(req);
    expect(parsed).toEqual({ token: 'token', childRunId: 'child-run' });
  });

  it('parses delegation headers from comma-separated string arrays', () => {
    const req = {
      headers: {
        'x-codex-delegation-token': [' token , token '],
        'x-codex-delegation-run-id': [' child-run ']
      }
    } as unknown as http.IncomingMessage;

    const parsed = readDelegationHeaders(req);
    expect(parsed).toEqual({ token: 'token', childRunId: 'child-run' });
  });

  it('parses delegation headers from comma-separated strings', () => {
    const req = {
      headers: {
        'x-codex-delegation-token': ' token , token ',
        'x-codex-delegation-run-id': ' child-run '
      }
    } as unknown as http.IncomingMessage;

    const parsed = readDelegationHeaders(req);
    expect(parsed).toEqual({ token: 'token', childRunId: 'child-run' });
  });

  it('rejects ambiguous delegation headers', () => {
    const req = {
      headers: {
        'x-codex-delegation-token': ['token-a', 'token-b'],
        'x-codex-delegation-run-id': ['child-run']
      }
    } as unknown as http.IncomingMessage;

    const parsed = readDelegationHeaders(req);
    expect(parsed).toBeNull();
  });

  it('rejects comma-separated delegation headers in string arrays with different values', () => {
    const req = {
      headers: {
        'x-codex-delegation-token': ['token-a, token-b'],
        'x-codex-delegation-run-id': ['child-run']
      }
    } as unknown as http.IncomingMessage;

    const parsed = readDelegationHeaders(req);
    expect(parsed).toBeNull();
  });

  it('rejects comma-separated delegation headers with different values', () => {
    const req = {
      headers: {
        'x-codex-delegation-token': 'token-a, token-b',
        'x-codex-delegation-run-id': 'child-run'
      }
    } as unknown as http.IncomingMessage;

    const parsed = readDelegationHeaders(req);
    expect(parsed).toBeNull();
  });

  it('issues session tokens via POST with no-store', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const res = await fetch(new URL('/auth/session', baseUrl), {
        method: 'POST',
        headers: { Origin: baseUrl }
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('no-store');
      const payload = (await res.json()) as { token?: string; expires_at?: string };
      expect(payload.token).toBeTruthy();
      expect(payload.expires_at).toBeTruthy();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects session POST without Origin', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const res = await fetch(new URL('/auth/session', baseUrl), {
        method: 'POST'
      });
      expect(res.status).toBe(403);
      const payload = (await res.json()) as { error?: string };
      expect(payload.error).toBe('origin_required');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('allows session GET without Origin', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const res = await fetch(new URL('/auth/session', baseUrl));
      expect(res.status).toBe(200);
      const payload = (await res.json()) as { token?: string };
      expect(payload.token).toBeTruthy();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('responds even when event stream append fails', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const eventStream = {
      append: async () => {
        throw new Error('append failed');
      },
      close: async () => undefined
    } as unknown as import('../src/cli/events/runEventStream.js').RunEventStream;

    const server = await ControlServer.start({
      paths,
      config,
      eventStream,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const res = await fetch(new URL('/confirmations/create', server.getBaseUrl() ?? ''), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'ui.cancel', params: {} })
      });

      expect(res.status).toBe(200);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('blocks runner-only endpoints for session tokens', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const sessionRes = await fetch(new URL('/auth/session', baseUrl), {
        method: 'POST',
        headers: { Origin: baseUrl }
      });
      const sessionPayload = (await sessionRes.json()) as { token?: string };
      const sessionToken = sessionPayload.token ?? '';

      const runnerOnlyRequests = [
        { path: '/confirmations/issue', body: { request_id: 'req-1' } },
        { path: '/confirmations/consume', body: { request_id: 'req-1' } },
        { path: '/confirmations/validate', body: { confirm_nonce: 'nonce' } },
        { path: '/delegation/register', body: { token: 'tok', parent_run_id: 'p', child_run_id: 'c' } },
        { path: '/questions/enqueue', body: { prompt: 'Need approval' } },
        { path: '/security/violation', body: { kind: 'test' } }
      ];

      for (const request of runnerOnlyRequests) {
        const res = await fetch(new URL(request.path, baseUrl), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'x-csrf-token': sessionToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request.body)
        });

        expect(res.status).toBe(403);
        const payload = (await res.json()) as { error?: string };
        expect(payload.error).toBe('runner_only');
      }
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects session bootstrap with disallowed origin', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const res = await fetch(new URL('/auth/session', baseUrl), {
        method: 'POST',
        headers: { Origin: 'http://evil.example.com' }
      });

      expect(res.status).toBe(403);
      const payload = (await res.json()) as { error?: string };
      expect(payload.error).toBe('origin_not_allowed');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects session bootstrap with disallowed host header', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    config.ui.allowedBindHosts = ['localhost'];

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const res = await fetch(new URL('/auth/session', baseUrl), {
        method: 'POST',
        headers: { Origin: baseUrl }
      });

      expect(res.status).toBe(403);
      const payload = (await res.json()) as { error?: string };
      expect(payload.error).toBe('host_not_allowed');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('blocks session tokens from fail actions', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const sessionRes = await fetch(new URL('/auth/session', baseUrl), {
        method: 'POST',
        headers: { Origin: baseUrl }
      });
      const sessionPayload = (await sessionRes.json()) as { token?: string };
      const sessionToken = sessionPayload.token ?? '';

      const res = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'x-csrf-token': sessionToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'fail', reason: 'ui' })
      });

      expect(res.status).toBe(403);
      const payload = (await res.json()) as { error?: string };
      expect(payload.error).toBe('ui_action_disallowed');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('emits confirmation_required without raw params', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const events: import('../src/cli/events/runEventStream.js').RunEventStreamEntry[] = [];
    const eventStream = {
      append: async (entry: { event: string; actor: string; payload: Record<string, unknown> }) => {
        const record = {
          schema_version: 1,
          seq: events.length + 1,
          timestamp: new Date().toISOString(),
          task_id: 'task-0940',
          run_id: 'run-1',
          event: entry.event,
          actor: entry.actor,
          payload: entry.payload
        };
        events.push(record);
        return record;
      },
      close: async () => undefined
    } as unknown as import('../src/cli/events/runEventStream.js').RunEventStream;

    const server = await ControlServer.start({
      paths,
      config,
      eventStream,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params: { secret: 'do-not-leak' } })
      });

      const confirmationEvent = events.find((entry) => entry.event === 'confirmation_required');
      expect(confirmationEvent).toBeTruthy();
      const payload = confirmationEvent?.payload ?? {};
      expect('params' in payload).toBe(false);
      expect(JSON.stringify(payload)).not.toContain('do-not-leak');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not expose confirmation params via list', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params: { secret: 'do-not-leak' } })
      });

      const listRes = await fetch(new URL('/confirmations', baseUrl), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = (await listRes.json()) as { pending?: Array<Record<string, unknown>> };
      const pending = payload.pending ?? [];

      expect(pending).toHaveLength(1);
      expect('params' in (pending[0] ?? {})).toBe(false);
      expect(JSON.stringify(payload)).not.toContain('do-not-leak');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('restricts UI confirmations to ui.cancel and strips params', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const sessionRes = await fetch(new URL('/auth/session', baseUrl), {
        method: 'POST',
        headers: { Origin: baseUrl }
      });
      const sessionPayload = (await sessionRes.json()) as { token?: string };
      const sessionToken = sessionPayload.token ?? '';

      const denied = await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'x-csrf-token': sessionToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params: { manifest_path: paths.manifestPath } })
      });

      expect(denied.status).toBe(403);
      const deniedPayload = (await denied.json()) as { error?: string };
      expect(deniedPayload.error).toBe('ui_confirmation_disallowed');

      const allowed = await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'x-csrf-token': sessionToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'ui.cancel', params: { secret: 'nope' } })
      });

      expect(allowed.status).toBe(200);
      const raw = await readFile(paths.confirmationsPath, 'utf8');
      expect(raw).not.toContain('nope');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('closes the server if control metadata writes fail', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const originalCreateServer = http.createServer;
    let createdServer: http.Server | null = null;
    const createServerSpy = vi.spyOn(http, 'createServer').mockImplementation((...args) => {
      const server = originalCreateServer(...(args as Parameters<typeof originalCreateServer>));
      createdServer = server;
      return server;
    });
    const writeSpy = vi.spyOn(fsUtils, 'writeJsonAtomic').mockRejectedValueOnce(new Error('boom'));

    try {
      await expect(
        ControlServer.start({
          paths,
          config,
          runId: 'run-1'
        })
      ).rejects.toThrow('boom');
      expect(createdServer).toBeTruthy();
      expect((createdServer as http.Server | null)?.listening).toBe(false);
    } finally {
      createServerSpy.mockRestore();
      writeSpy.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails when server listen emits an error', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const originalCreateServer = http.createServer;
    let createdServer: http.Server | null = null;
    const createServerSpy = vi.spyOn(http, 'createServer').mockImplementation((...args) => {
      const server = originalCreateServer(...(args as Parameters<typeof originalCreateServer>));
      createdServer = server;
      vi.spyOn(server, 'listen').mockImplementation((...listenArgs: unknown[]) => {
        void listenArgs;
        process.nextTick(() => {
          server.emit('error', new Error('listen-failed'));
        });
        return server;
      });
      return server;
    });

    try {
      await expect(
        ControlServer.start({
          paths,
          config,
          runId: 'run-1'
        })
      ).rejects.toThrow('listen-failed');
      expect(createdServer).toBeTruthy();
      expect((createdServer as http.Server | null)?.listening).toBe(false);
    } finally {
      createServerSpy.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('sends child control actions to child endpoints', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const tokenPath = join(paths.runDir, 'control_auth.json');
    const endpointPath = join(paths.runDir, 'control_endpoint.json');
    await writeFile(paths.manifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');
    await writeFile(tokenPath, JSON.stringify({ token: 'child-token' }), 'utf8');

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
    const childAddress = childServer.address();
    const childPort = typeof childAddress === 'string' || !childAddress ? 0 : childAddress.port;
    const childBaseUrl = `http://127.0.0.1:${childPort}`;
    await writeFile(
      endpointPath,
      JSON.stringify({ base_url: childBaseUrl, token_path: tokenPath }),
      'utf8'
    );

    try {
      const context = { config } as Parameters<typeof callChildControlEndpoint>[0];
      await callChildControlEndpoint(context, paths.manifestPath, { action: 'resume' });
      expect((receivedAction as { action?: string } | null)?.action).toBe('resume');
    } finally {
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects child control error responses', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const tokenPath = join(paths.runDir, 'control_auth.json');
    const endpointPath = join(paths.runDir, 'control_endpoint.json');
    await writeFile(paths.manifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');
    await writeFile(tokenPath, JSON.stringify({ token: 'child-token' }), 'utf8');

    const childServer = http.createServer((req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('nope');
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => childServer.listen(0, '127.0.0.1', resolve));
    const childAddress = childServer.address();
    const childPort = typeof childAddress === 'string' || !childAddress ? 0 : childAddress.port;
    const childBaseUrl = `http://127.0.0.1:${childPort}`;
    await writeFile(
      endpointPath,
      JSON.stringify({ base_url: childBaseUrl, token_path: tokenPath }),
      'utf8'
    );

    try {
      const context = { config } as Parameters<typeof callChildControlEndpoint>[0];
      await expect(
        callChildControlEndpoint(context, paths.manifestPath, { action: 'resume' })
      ).rejects.toThrow('child control error: 500 nope');
    } finally {
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('times out child control requests', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const tokenPath = join(paths.runDir, 'control_auth.json');
    const endpointPath = join(paths.runDir, 'control_endpoint.json');
    await writeFile(paths.manifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');
    await writeFile(tokenPath, JSON.stringify({ token: 'child-token' }), 'utf8');
    await writeFile(
      endpointPath,
      JSON.stringify({ base_url: 'http://127.0.0.1:8123', token_path: tokenPath }),
      'utf8'
    );

    const originalFetch = global.fetch;
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
      ((handler: TimerHandler, _timeout?: number, ...args: unknown[]) => {
        queueMicrotask(() => {
          if (typeof handler === 'function') {
            handler(...args);
          }
        });
        return 0 as unknown as NodeJS.Timeout;
      }) as unknown as typeof setTimeout
    );
    global.fetch = vi.fn((_url, options) => {
      const signal = (options as { signal?: AbortSignal } | undefined)?.signal;
      return new Promise((_, reject) => {
        const abortHandler = () => {
          const error = new Error('aborted');
          (error as Error & { name?: string }).name = 'AbortError';
          reject(error);
        };
        if (signal?.aborted) {
          abortHandler();
          return;
        }
        signal?.addEventListener('abort', abortHandler);
      });
    }) as typeof fetch;

    try {
      const context = { config } as Parameters<typeof callChildControlEndpoint>[0];
      await expect(
        callChildControlEndpoint(context, paths.manifestPath, { action: 'resume' })
      ).rejects.toThrow('child control request timeout');
    } finally {
      setTimeoutSpy.mockRestore();
      global.fetch = originalFetch;
      await rm(root, { recursive: true, force: true });
    }
  });

  it('allows ui.cancel approvals to issue cancel actions without nonce leakage', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const sessionRes = await fetch(new URL('/auth/session', baseUrl), {
        method: 'POST',
        headers: { Origin: baseUrl }
      });
      expect(sessionRes.status).toBe(200);
      const sessionPayload = (await sessionRes.json()) as { token?: string };
      const sessionToken = sessionPayload.token ?? '';

      await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'x-csrf-token': sessionToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'ui.cancel', params: { secret: 'nope' } })
      });

      const listRes = await fetch(new URL('/confirmations', baseUrl), {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      const listPayload = (await listRes.json()) as { pending?: Array<Record<string, unknown>> };
      const pending = listPayload.pending ?? [];
      const requestId = (pending[0]?.request_id as string | undefined) ?? '';
      expect(requestId).toBeTruthy();
      expect('params' in (pending[0] ?? {})).toBe(false);

      await fetch(new URL('/confirmations/approve', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'x-csrf-token': sessionToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: requestId, actor: 'ui' })
      });

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      const control = JSON.parse(controlRaw) as { latest_action?: { action?: string } };
      expect(control.latest_action?.action).toBe('cancel');
      expect(controlRaw).not.toContain('confirm_nonce');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not persist confirm_nonce and rejects reuse', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const params = { manifest_path: paths.manifestPath };

      await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params })
      });

      const listRes = await fetch(new URL('/confirmations', baseUrl), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const listPayload = (await listRes.json()) as { pending?: Array<Record<string, unknown>> };
      const requestId = (listPayload.pending?.[0]?.request_id as string | undefined) ?? '';

      await fetch(new URL('/confirmations/approve', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: requestId, actor: 'ui' })
      });

      const issueRes = await fetch(new URL('/confirmations/issue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: requestId })
      });
      const issuePayload = (await issueRes.json()) as { confirm_nonce?: string };
      const confirmNonce = issuePayload.confirm_nonce ?? '';

      const confirmationsRaw = await readFile(paths.confirmationsPath, 'utf8');
      expect(confirmationsRaw).not.toContain(confirmNonce);
      expect(confirmationsRaw).not.toContain('confirm_nonce');

      const actionRes = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          confirm_nonce: confirmNonce,
          tool: 'delegate.cancel',
          params
        })
      });
      expect(actionRes.status).toBe(200);

      const reuseRes = await fetch(new URL('/confirmations/validate', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirm_nonce: confirmNonce, tool: 'delegate.cancel', params })
      });

      expect(reuseRes.status).toBe(409);
      const reusePayload = (await reuseRes.json()) as { error?: string };
      expect(reusePayload.error).toBe('nonce_already_consumed');

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      expect(controlRaw).not.toContain(confirmNonce);
      expect(controlRaw).not.toContain('confirm_nonce');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('resumes child runs when questions are answered', async () => {
    const { root, env, paths } = await createRunRoot('parent-task');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const childRoot = root;
    const childRunDir = join(childRoot, '.runs', 'child-task', 'cli', 'child-run');
    await mkdir(childRunDir, { recursive: true });
    const childManifestPath = join(childRunDir, 'manifest.json');
    await writeFile(childManifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');
    const childTokenPath = join(childRunDir, 'control_auth.json');
    await writeFile(childTokenPath, JSON.stringify({ token: 'child-token' }), 'utf8');
    await writeFile(
      join(childRunDir, 'control.json'),
      JSON.stringify({
        run_id: 'child-run',
        control_seq: 1,
        latest_action: {
          request_id: null,
          requested_by: 'delegate',
          requested_at: new Date().toISOString(),
          action: 'pause',
          reason: 'awaiting_question_answer'
        },
        feature_toggles: {}
      }),
      'utf8'
    );

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
    const childAddress = childServer.address();
    const childPort = typeof childAddress === 'string' || !childAddress ? 0 : childAddress.port;
    const childBaseUrl = `http://127.0.0.1:${childPort}`;
    await writeFile(
      join(childRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: childBaseUrl,
        token_path: childTokenPath
      }),
      'utf8'
    );

    const parentServer = await ControlServer.start({
      paths,
      config,
      runId: 'parent-run'
    });

    try {
      const parentToken = await readToken(paths.controlAuthPath);
      const baseUrl = parentServer.getBaseUrl() ?? '';

      await fetch(new URL('/delegation/register', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: 'delegation-token',
          parent_run_id: 'parent-run',
          child_run_id: 'child-run'
        })
      });

      const enqueueRes = await fetch(new URL('/questions/enqueue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json',
          'x-codex-delegation-token': 'delegation-token',
          'x-codex-delegation-run-id': 'child-run'
        },
        body: JSON.stringify({
          parent_run_id: 'parent-run',
          from_manifest_path: childManifestPath,
          prompt: 'Need approval',
          urgency: 'high',
          auto_pause: true,
          expiry_fallback: 'resume'
        })
      });
      const enqueuePayload = (await enqueueRes.json()) as { question_id?: string };
      const questionId = enqueuePayload.question_id ?? '';

      await fetch(new URL('/questions/answer', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question_id: questionId, answer: 'Approved', answered_by: 'ui' })
      });

      expect((receivedAction as { action?: string } | null)?.action).toBe('resume');
      expect((receivedAction as { requested_by?: string } | null)?.requested_by).toBe('parent');
    } finally {
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await parentServer.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('retries child resolution when answered questions are listed', async () => {
    const { root, env, paths } = await createRunRoot('parent-task');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const childRunDir = join(root, '.runs', 'child-task', 'cli', 'child-run');
    await mkdir(childRunDir, { recursive: true });
    const childManifestPath = join(childRunDir, 'manifest.json');
    await writeFile(childManifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');
    const childTokenPath = join(childRunDir, 'control_auth.json');
    await writeFile(childTokenPath, JSON.stringify({ token: 'child-token' }), 'utf8');
    await writeFile(
      join(childRunDir, 'control.json'),
      JSON.stringify({
        run_id: 'child-run',
        control_seq: 1,
        latest_action: {
          request_id: null,
          requested_by: 'delegate',
          requested_at: new Date().toISOString(),
          action: 'pause',
          reason: 'awaiting_question_answer'
        },
        feature_toggles: {}
      }),
      'utf8'
    );

    let resolveAction: ((value: Record<string, unknown>) => void) | null = null;
    const actionPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveAction = resolve;
    });
    const childServer = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        const payload = JSON.parse(body || '{}') as Record<string, unknown>;
        resolveAction?.(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => childServer.listen(0, '127.0.0.1', resolve));
    const childAddress = childServer.address();
    const childPort = typeof childAddress === 'string' || !childAddress ? 0 : childAddress.port;
    const childBaseUrl = `http://127.0.0.1:${childPort}`;
    await writeFile(
      join(childRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: childBaseUrl,
        token_path: childTokenPath
      }),
      'utf8'
    );

    const queuedAt = new Date(Date.now() - 120_000).toISOString();
    const answeredAt = new Date(Date.now() - 60_000).toISOString();
    await writeFile(
      paths.questionsPath,
      JSON.stringify({
        questions: [
          {
            question_id: 'q-0001',
            parent_run_id: 'parent-run',
            from_run_id: 'child-run',
            from_manifest_path: childManifestPath,
            prompt: 'Need approval',
            urgency: 'high',
            status: 'answered',
            queued_at: queuedAt,
            answer: 'Approved',
            answered_by: 'ui',
            answered_at: answeredAt,
            closed_at: answeredAt,
            auto_pause: true
          }
        ]
      }),
      'utf8'
    );

    const parentServer = await ControlServer.start({
      paths,
      config,
      runId: 'parent-run'
    });

    try {
      const parentToken = await readToken(paths.controlAuthPath);
      const baseUrl = parentServer.getBaseUrl() ?? '';

      await fetch(new URL('/questions', baseUrl), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${parentToken}`
        }
      });

      const action = await Promise.race([
        actionPromise,
        new Promise<Record<string, unknown>>((_, reject) =>
          setTimeout(() => reject(new Error('timed out waiting for child action')), 2000)
        )
      ]);
      expect(action.action).toBe('resume');
      expect(action.reason).toBe('question_answered');
    } finally {
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await parentServer.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not resume child runs when pause reason is unrelated', async () => {
    const { root, env, paths } = await createRunRoot('parent-task');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const childRunDir = join(root, '.runs', 'child-task', 'cli', 'child-run');
    await mkdir(childRunDir, { recursive: true });
    const childManifestPath = join(childRunDir, 'manifest.json');
    await writeFile(childManifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');
    const childTokenPath = join(childRunDir, 'control_auth.json');
    await writeFile(childTokenPath, JSON.stringify({ token: 'child-token' }), 'utf8');
    await writeFile(
      join(childRunDir, 'control.json'),
      JSON.stringify({
        run_id: 'child-run',
        control_seq: 1,
        latest_action: {
          request_id: null,
          requested_by: 'user',
          requested_at: new Date().toISOString(),
          action: 'pause',
          reason: 'manual_pause'
        },
        feature_toggles: {}
      }),
      'utf8'
    );

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
    const childAddress = childServer.address();
    const childPort = typeof childAddress === 'string' || !childAddress ? 0 : childAddress.port;
    const childBaseUrl = `http://127.0.0.1:${childPort}`;
    await writeFile(
      join(childRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: childBaseUrl,
        token_path: childTokenPath
      }),
      'utf8'
    );

    const parentServer = await ControlServer.start({
      paths,
      config,
      runId: 'parent-run'
    });

    try {
      const parentToken = await readToken(paths.controlAuthPath);
      const baseUrl = parentServer.getBaseUrl() ?? '';

      await fetch(new URL('/delegation/register', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: 'delegation-token',
          parent_run_id: 'parent-run',
          child_run_id: 'child-run'
        })
      });

      const enqueueRes = await fetch(new URL('/questions/enqueue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json',
          'x-codex-delegation-token': 'delegation-token',
          'x-codex-delegation-run-id': 'child-run'
        },
        body: JSON.stringify({
          parent_run_id: 'parent-run',
          from_manifest_path: childManifestPath,
          prompt: 'Need approval',
          urgency: 'high',
          auto_pause: true,
          expiry_fallback: 'resume'
        })
      });
      const enqueuePayload = (await enqueueRes.json()) as { question_id?: string };
      const questionId = enqueuePayload.question_id ?? '';

      await fetch(new URL('/questions/answer', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question_id: questionId, answer: 'Approved', answered_by: 'ui' })
      });

      expect(receivedAction).toBeNull();
    } finally {
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await parentServer.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('updates pause reason when questions expire with pause fallback', async () => {
    const { root, env, paths } = await createRunRoot('parent-task');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const childRoot = root;
    const childRunDir = join(childRoot, '.runs', 'child-task', 'cli', 'child-run');
    await mkdir(childRunDir, { recursive: true });
    const childManifestPath = join(childRunDir, 'manifest.json');
    await writeFile(childManifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');
    const childTokenPath = join(childRunDir, 'control_auth.json');
    await writeFile(childTokenPath, JSON.stringify({ token: 'child-token' }), 'utf8');
    await writeFile(
      join(childRunDir, 'control.json'),
      JSON.stringify({
        run_id: 'child-run',
        control_seq: 1,
        latest_action: {
          request_id: null,
          requested_by: 'delegate',
          requested_at: new Date().toISOString(),
          action: 'pause',
          reason: 'awaiting_question_answer'
        },
        feature_toggles: {}
      }),
      'utf8'
    );

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
    const childAddress = childServer.address();
    const childPort = typeof childAddress === 'string' || !childAddress ? 0 : childAddress.port;
    const childBaseUrl = `http://127.0.0.1:${childPort}`;
    await writeFile(
      join(childRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: childBaseUrl,
        token_path: childTokenPath
      }),
      'utf8'
    );

    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    const queuedAt = new Date(Date.now() - 120_000).toISOString();
    await writeFile(
      paths.questionsPath,
      JSON.stringify({
        questions: [
          {
            question_id: 'q-0001',
            parent_run_id: 'parent-run',
            from_run_id: 'child-run',
            from_manifest_path: childManifestPath,
            prompt: 'Approval needed',
            urgency: 'high',
            status: 'queued',
            queued_at: queuedAt,
            expires_at: expiredAt,
            expires_in_ms: 1000,
            auto_pause: true,
            expiry_fallback: 'pause'
          }
        ]
      }),
      'utf8'
    );

    const parentServer = await ControlServer.start({
      paths,
      config,
      runId: 'parent-run'
    });

    try {
      const parentToken = await readToken(paths.controlAuthPath);
      const baseUrl = parentServer.getBaseUrl() ?? '';

      await fetch(new URL('/questions', baseUrl), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${parentToken}`
        }
      });

      expect((receivedAction as { action?: string } | null)?.action).toBe('pause');
      expect((receivedAction as { reason?: string } | null)?.reason).toBe('question_expired');
    } finally {
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await parentServer.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects question enqueue when child manifest run_id mismatches', async () => {
    const { root, env, paths } = await createRunRoot('parent-task');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const childRunDir = join(root, '.runs', 'child-task', 'cli', 'child-run');
    await mkdir(childRunDir, { recursive: true });
    const childManifestPath = join(childRunDir, 'manifest.json');
    await writeFile(childManifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');

    const parentServer = await ControlServer.start({
      paths,
      config,
      runId: 'parent-run'
    });

    try {
      const parentToken = await readToken(paths.controlAuthPath);
      const baseUrl = parentServer.getBaseUrl() ?? '';

      await fetch(new URL('/delegation/register', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: 'delegation-token',
          parent_run_id: 'parent-run',
          child_run_id: 'child-run-2'
        })
      });

      const enqueueRes = await fetch(new URL('/questions/enqueue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json',
          'x-codex-delegation-token': 'delegation-token',
          'x-codex-delegation-run-id': 'child-run-2'
        },
        body: JSON.stringify({
          parent_run_id: 'parent-run',
          from_manifest_path: childManifestPath,
          prompt: 'Mismatch check',
          urgency: 'high',
          auto_pause: true
        })
      });

      expect(enqueueRes.status).toBe(403);
      const payload = (await enqueueRes.json()) as { error?: string };
      expect(payload.error).toBe('delegation_run_mismatch');
    } finally {
      await parentServer.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects question enqueue when manifest path is outside allowed run roots', async () => {
    const { root, env, paths } = await createRunRoot('parent-task');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    config.ui.allowedRunRoots = [paths.runDir];

    const outsideRoot = await mkdtemp(join(tmpdir(), 'control-server-outside-'));
    const childRunDir = join(outsideRoot, '.runs', 'child-task', 'cli', 'child-run');
    await mkdir(childRunDir, { recursive: true });
    const childManifestPath = join(childRunDir, 'manifest.json');
    await writeFile(childManifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');

    const parentServer = await ControlServer.start({
      paths,
      config,
      runId: 'parent-run'
    });

    try {
      const parentToken = await readToken(paths.controlAuthPath);
      const baseUrl = parentServer.getBaseUrl() ?? '';

      await fetch(new URL('/delegation/register', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: 'delegation-token',
          parent_run_id: 'parent-run',
          child_run_id: 'child-run'
        })
      });

      const enqueueRes = await fetch(new URL('/questions/enqueue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json',
          'x-codex-delegation-token': 'delegation-token',
          'x-codex-delegation-run-id': 'child-run'
        },
        body: JSON.stringify({
          parent_run_id: 'parent-run',
          from_manifest_path: childManifestPath,
          prompt: 'Outside root',
          urgency: 'med',
          auto_pause: true
        })
      });

      expect(enqueueRes.status).toBe(400);
      const payload = (await enqueueRes.json()) as { error?: string };
      expect(payload.error).toBe('invalid_manifest_path');
    } finally {
      await parentServer.close();
      await rm(outsideRoot, { recursive: true, force: true });
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns 409 when answering a closed question', async () => {
    const { root, env, paths } = await createRunRoot('parent-task');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const parentServer = await ControlServer.start({
      paths,
      config,
      runId: 'parent-run'
    });

    try {
      const parentToken = await readToken(paths.controlAuthPath);
      const baseUrl = parentServer.getBaseUrl() ?? '';

      await fetch(new URL('/delegation/register', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: 'delegation-token',
          parent_run_id: 'parent-run',
          child_run_id: 'child-run'
        })
      });

      const enqueueRes = await fetch(new URL('/questions/enqueue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json',
          'x-codex-delegation-token': 'delegation-token',
          'x-codex-delegation-run-id': 'child-run'
        },
        body: JSON.stringify({
          parent_run_id: 'parent-run',
          prompt: 'Approval needed',
          urgency: 'med',
          auto_pause: false
        })
      });
      const enqueuePayload = (await enqueueRes.json()) as { question_id?: string };
      const questionId = enqueuePayload.question_id ?? '';

      await fetch(new URL('/questions/answer', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question_id: questionId, answer: 'Approved', answered_by: 'ui' })
      });

      const secondAnswer = await fetch(new URL('/questions/answer', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-csrf-token': parentToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question_id: questionId, answer: 'Another', answered_by: 'ui' })
      });

      expect(secondAnswer.status).toBe(409);
      const payload = (await secondAnswer.json()) as { error?: string };
      expect(payload.error).toBe('question_closed');
    } finally {
      await parentServer.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
