import { describe, expect, it } from 'vitest';
import http from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import {
  applyQuestionFallback,
  callControlEndpointWithRetry,
  loadControlEndpoint,
  resolveDelegationToken,
  resolveRunManifestPath
} from '../src/cli/delegationServer.js';

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
