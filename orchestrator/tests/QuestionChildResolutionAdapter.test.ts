import http from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { computeEffectiveDelegationConfig } from '../src/cli/config/delegationConfig.js';
import {
  callChildControlEndpoint,
  readDelegationHeaders
} from '../src/cli/control/questionChildResolutionAdapter.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

async function createRunRoot(taskId: string) {
  const root = await mkdtemp(join(tmpdir(), 'question-child-resolution-'));
  const env = { repoRoot: root, runsRoot: join(root, '.runs'), outRoot: join(root, 'out'), taskId };
  const paths = resolveRunPaths(env, 'run-1');
  await mkdir(paths.runDir, { recursive: true });
  return { root, env, paths };
}

describe('QuestionChildResolutionAdapter', () => {
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
      await callChildControlEndpoint({
        manifestPath: paths.manifestPath,
        payload: { action: 'resume' },
        allowedRunRoots: config.ui.allowedRunRoots,
        allowedBindHosts: config.ui.allowedBindHosts
      });
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
      await expect(
        callChildControlEndpoint({
          manifestPath: paths.manifestPath,
          payload: { action: 'resume' },
          allowedRunRoots: config.ui.allowedRunRoots,
          allowedBindHosts: config.ui.allowedBindHosts
        })
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
      await expect(
        callChildControlEndpoint({
          manifestPath: paths.manifestPath,
          payload: { action: 'resume' },
          allowedRunRoots: config.ui.allowedRunRoots,
          allowedBindHosts: config.ui.allowedBindHosts
        })
      ).rejects.toThrow('child control request timeout');
    } finally {
      setTimeoutSpy.mockRestore();
      global.fetch = originalFetch;
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects child control endpoints on disallowed hosts', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const tokenPath = join(paths.runDir, 'control_auth.json');
    const endpointPath = join(paths.runDir, 'control_endpoint.json');
    await writeFile(paths.manifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');
    await writeFile(tokenPath, JSON.stringify({ token: 'child-token' }), 'utf8');
    await writeFile(
      endpointPath,
      JSON.stringify({ base_url: 'http://example.com:8123', token_path: tokenPath }),
      'utf8'
    );

    try {
      await expect(
        callChildControlEndpoint({
          manifestPath: paths.manifestPath,
          payload: { action: 'resume' },
          allowedRunRoots: config.ui.allowedRunRoots,
          allowedBindHosts: config.ui.allowedBindHosts
        })
      ).rejects.toThrow('control base_url not permitted');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects token paths that escape the child run directory', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const endpointPath = join(paths.runDir, 'control_endpoint.json');
    const outsideTokenPath = join(root, 'outside-token.json');
    await writeFile(paths.manifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');
    await writeFile(outsideTokenPath, JSON.stringify({ token: 'child-token' }), 'utf8');
    await writeFile(
      endpointPath,
      JSON.stringify({ base_url: 'http://127.0.0.1:8123', token_path: '../../../outside-token.json' }),
      'utf8'
    );

    try {
      await expect(
        callChildControlEndpoint({
          manifestPath: paths.manifestPath,
          payload: { action: 'resume' },
          allowedRunRoots: config.ui.allowedRunRoots,
          allowedBindHosts: config.ui.allowedBindHosts
        })
      ).rejects.toThrow('control auth path invalid');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
