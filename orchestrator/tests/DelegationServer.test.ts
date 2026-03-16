import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { access, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
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
  buildToolList,
  createDelegationServerRpcHandler,
  resolveChildDelegateMode,
  MAX_MCP_MESSAGE_BYTES,
  MAX_MCP_HEADER_BYTES,
  MAX_QUESTION_POLL_WAIT_MS,
  QUESTION_POLL_INTERVAL_MS,
  clampQuestionPollWaitMs
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
  return {
    root: await realpath(root),
    runDir: await realpath(runDir),
    manifestPath: await realpath(manifestPath),
    tokenPath: await realpath(tokenPath)
  };
}

const DYNAMIC_TOOL_BRIDGE_TOKEN = 'bridge-secret';
const DYNAMIC_TOOL_BRIDGE_SOURCE_ID = 'appserver_dynamic_tool';
const DYNAMIC_TOOL_BRIDGE_PRINCIPAL = 'coordinator.appserver';
const DYNAMIC_TOOL_BRIDGE_ATTESTATION_KEY = 'dynamic_tool_bridge_attestation';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function buildDynamicToolBridgeContext(root: string) {
  return {
    repoRoot: process.cwd(),
    mode: 'full' as const,
    allowNested: false,
    githubEnabled: false,
    allowedGithubOps: new Set<string>(),
    allowedRoots: [root],
    allowedHosts: ['127.0.0.1'],
    toolProfile: [],
    expiryFallback: 'pause' as const
  };
}

function buildDynamicToolBridgeAttestation(
  overrides: Partial<{ token: string; source_id: string; principal: string }> = {}
): Record<string, unknown> {
  return {
    token: overrides.token ?? DYNAMIC_TOOL_BRIDGE_TOKEN,
    source_id: overrides.source_id ?? DYNAMIC_TOOL_BRIDGE_SOURCE_ID,
    principal: overrides.principal ?? DYNAMIC_TOOL_BRIDGE_PRINCIPAL
  };
}

function buildDynamicToolBridgeCodexPrivate(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    [DYNAMIC_TOOL_BRIDGE_ATTESTATION_KEY]: buildDynamicToolBridgeAttestation(),
    ...overrides
  };
}

function buildDynamicToolBridgeControlJson(
  overrides: {
    enabled?: boolean;
    kill_switch?: boolean;
    control_seq?: number;
    nest_under_coordinator?: boolean;
    token?: string;
    source_id?: string;
    principal?: string;
    expires_at?: string;
    revoked?: boolean;
    attestation?: Record<string, unknown> | null;
  } = {}
): Record<string, unknown> {
  const attestation =
    overrides.attestation === undefined
      ? {
          token_sha256: sha256Hex(overrides.token ?? DYNAMIC_TOOL_BRIDGE_TOKEN),
          source_id: overrides.source_id ?? DYNAMIC_TOOL_BRIDGE_SOURCE_ID,
          principal: overrides.principal ?? DYNAMIC_TOOL_BRIDGE_PRINCIPAL,
          ...(overrides.expires_at ? { expires_at: overrides.expires_at } : {}),
          ...(overrides.revoked !== undefined ? { revoked: overrides.revoked } : {})
        }
      : overrides.attestation;

  const bridgePolicy = {
    enabled: overrides.enabled ?? true,
    ...(overrides.kill_switch ? { kill_switch: true } : {}),
    ...(attestation ? { attestation } : {})
  };

  return {
    run_id: 'run-1',
    ...(overrides.control_seq !== undefined ? { control_seq: overrides.control_seq } : {}),
    feature_toggles: {
      ...(overrides.nest_under_coordinator
        ? {
            coordinator: {
              dynamic_tool_bridge: bridgePolicy
            }
          }
        : {
            dynamic_tool_bridge: bridgePolicy
          })
    }
  };
}

function buildCoordinatorDynamicToolRequest(options: {
  toolName: 'coordinator.status' | 'coordinator.pause' | 'coordinator.resume' | 'coordinator.cancel';
  manifestPath: string;
  arguments?: Record<string, unknown>;
  codexPrivate?: Record<string, unknown>;
  includeDefaultSource?: boolean;
}) {
  return {
    jsonrpc: '2.0' as const,
    method: 'tools/call' as const,
    params: {
      name: options.toolName,
      arguments: {
        manifest_path: options.manifestPath,
        ...(options.includeDefaultSource === false ? {} : { source_id: DYNAMIC_TOOL_BRIDGE_SOURCE_ID }),
        ...(options.arguments ?? {})
      }
    },
    ...(options.codexPrivate ? { codex_private: options.codexPrivate } : {})
  };
}

function collectMcpResponses(
  stream: PassThrough,
  expectedCount: number,
  options: { timeoutMs?: number } = {}
): Promise<Record<string, unknown>[]> {
  const timeoutMs = options.timeoutMs ?? 2000;
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const responses: Record<string, unknown>[] = [];
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('error', onError);
      if (timer) {
        clearTimeout(timer);
      }
    };
    const finalize = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (error) {
        reject(error);
      } else {
        resolve(responses);
      }
    };

    const onEnd = () => {
      finalize(new Error('MCP response stream ended before expected responses'));
    };
    const onError = (error: unknown) => {
      finalize(error instanceof Error ? error : new Error(String(error)));
    };
    const onData = (chunk: Buffer | string) => {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      while (buffer.length > 0) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) {
          break;
        }
        const header = buffer.slice(0, headerEnd).toString('utf8');
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          finalize(new Error('Missing Content-Length header in MCP response'));
          return;
        }
        const length = Number(match[1]);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + length) {
          break;
        }
        const body = buffer.slice(bodyStart, bodyStart + length).toString('utf8');
        try {
          responses.push(JSON.parse(body) as Record<string, unknown>);
        } catch (error) {
          finalize(error instanceof Error ? error : new Error('Failed to parse MCP response'));
          return;
        }
        buffer = buffer.slice(bodyStart + length);
        if (responses.length >= expectedCount) {
          finalize();
          return;
        }
      }
    };

    timer = timeoutMs > 0 ? setTimeout(() => finalize(new Error('MCP response collection timed out')), timeoutMs) : null;
    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
  });
}

function collectJsonlResponses(
  stream: PassThrough,
  expectedCount: number,
  options: { timeoutMs?: number } = {}
): Promise<Record<string, unknown>[]> {
  const timeoutMs = options.timeoutMs ?? 2000;
  return new Promise((resolve, reject) => {
    let buffer = '';
    const responses: Record<string, unknown>[] = [];
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('error', onError);
      if (timer) {
        clearTimeout(timer);
      }
    };
    const finalize = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (error) {
        reject(error);
      } else {
        resolve(responses);
      }
    };

    const onEnd = () => {
      const leftover = buffer.trim();
      if (leftover.length > 0) {
        finalize(new Error('MCP response stream ended with partial JSONL payload'));
        return;
      }
      finalize(new Error('MCP response stream ended before expected responses'));
    };
    const onError = (error: unknown) => {
      finalize(error instanceof Error ? error : new Error(String(error)));
    };
    const onData = (chunk: Buffer | string) => {
      buffer += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        try {
          responses.push(JSON.parse(trimmed) as Record<string, unknown>);
        } catch (error) {
          finalize(error instanceof Error ? error : new Error('Failed to parse MCP JSONL response'));
          return;
        }
        if (responses.length >= expectedCount) {
          finalize();
          return;
        }
      }
    };

    timer = timeoutMs > 0 ? setTimeout(() => finalize(new Error('MCP response collection timed out')), timeoutMs) : null;
    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
  });
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

  it('accepts manifest paths under custom runs roots', async () => {
    const root = await mkdtemp(join(tmpdir(), 'delegation-server-'));
    try {
      const manifestPath = join(root, 'custom_runs', 'task-0940', 'cli', 'run-1', 'manifest.json');
      await mkdir(dirname(manifestPath), { recursive: true });
      await writeFile(manifestPath, JSON.stringify({ run_id: 'run-1' }), 'utf8');

      const resolved = resolveRunManifestPath(manifestPath, [root], 'manifest_path');
      const canonicalManifestPath = await realpath(manifestPath);
      expect(resolved).toBe(canonicalManifestPath);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects manifest symlinks that resolve outside allowed run roots', async () => {
    const root = await mkdtemp(join(tmpdir(), 'delegation-server-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'delegation-server-outside-'));
    try {
      const localRunDir = join(root, '.runs', 'task-0940', 'cli', 'run-1');
      const outsideRunDir = join(outsideRoot, '.runs', 'task-0940', 'cli', 'run-1');
      await mkdir(localRunDir, { recursive: true });
      await mkdir(outsideRunDir, { recursive: true });
      const outsideManifestPath = join(outsideRunDir, 'manifest.json');
      await writeFile(outsideManifestPath, JSON.stringify({ run_id: 'run-1' }), 'utf8');
      const symlinkPath = join(localRunDir, 'manifest.json');
      await symlink(outsideManifestPath, symlinkPath);

      expect(() => resolveRunManifestPath(symlinkPath, [root], 'manifest_path')).toThrow('not permitted');
    } finally {
      await rm(outsideRoot, { recursive: true, force: true });
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

describe('delegation server status behavior', () => {
  it('returns terminal status without requiring control endpoint files', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    try {
      await rm(join(runDir, 'control_endpoint.json'), { force: true });
      await writeFile(
        manifestPath,
        JSON.stringify({
          run_id: 'run-1',
          task_id: 'task-0940',
          status: 'canceled',
          status_detail: 'stage:delegation-guard:failed',
          log_path: '.runs/task-0940/cli/run-1/runner.ndjson'
        }),
        'utf8'
      );

      const response = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.status',
            arguments: { manifest_path: manifestPath }
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      const payload = JSON.parse(response.content[0].text) as Record<string, unknown>;
      expect(payload.status).toBe('canceled');
      expect(payload.run_id).toBe('run-1');
      expect(payload.task_id).toBe('task-0940');
      expect(payload.events_path).toBe(join(runDir, 'events.jsonl'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('still requires control endpoint files while runs are active', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    try {
      await rm(join(runDir, 'control_endpoint.json'), { force: true });
      await writeFile(
        manifestPath,
        JSON.stringify({
          run_id: 'run-1',
          task_id: 'task-0940',
          status: 'running'
        }),
        'utf8'
      );

      await expect(
        handleToolCall(
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'delegate.status',
              arguments: { manifest_path: manifestPath }
            }
          },
          {
            repoRoot: process.cwd(),
            mode: 'full',
            allowNested: false,
            githubEnabled: false,
            allowedGithubOps: new Set<string>(),
            allowedRoots: [root],
            allowedHosts: ['127.0.0.1'],
            toolProfile: [],
            expiryFallback: 'pause'
          }
        )
      ).rejects.toThrow('control_endpoint.json');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('includes control snapshot and traceability in status payloads', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    try {
      await writeFile(
        manifestPath,
        JSON.stringify({
          run_id: 'run-1',
          task_id: 'task-0940',
          status: 'in_progress',
          status_detail: 'running'
        }),
        'utf8'
      );
      await writeFile(
        join(runDir, 'control.json'),
        JSON.stringify({
          run_id: 'run-1',
          control_seq: 7,
          latest_action: {
            request_id: 'req-7',
            intent_id: 'intent-7',
            requested_by: 'delegate',
            requested_at: '2026-01-01T00:00:00Z',
            action: 'pause',
            reason: 'manual'
          }
        }),
        'utf8'
      );

      const response = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.status',
            arguments: { manifest_path: manifestPath, intent_id: 'intent-status', request_id: 'req-status' }
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      const payload = JSON.parse(response.content[0].text) as Record<string, unknown>;
      expect(payload.control).toMatchObject({
        run_id: 'run-1',
        control_seq: 7
      });
      expect(payload.traceability).toEqual({
        intent_id: 'intent-status',
        task_id: 'task-0940',
        run_id: 'run-1',
        manifest_path: manifestPath,
        request_id: 'req-status'
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('delegation server mode contracts', () => {
  it('routes initialize, tools/list, and tools/call through the rpc handler shell', async () => {
    const tools = buildToolList({
      mode: 'full',
      githubEnabled: false,
      allowedGithubOps: new Set<string>()
    });
    const toolCallHandler = vi.fn().mockResolvedValue({ ok: true });
    const handler = createDelegationServerRpcHandler({
      protocolVersion: '2024-11-05',
      tools,
      handleToolCall: toolCallHandler
    });

    await expect(
      handler({
        jsonrpc: '2.0',
        method: 'initialize'
      })
    ).resolves.toEqual({
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'codex-delegation', version: '0.1.0' },
      capabilities: { tools: {} }
    });

    await expect(
      handler({
        jsonrpc: '2.0',
        method: 'tools/list'
      })
    ).resolves.toEqual({ tools });

    const request = {
      jsonrpc: '2.0' as const,
      method: 'tools/call' as const,
      params: {
        name: 'delegate.status',
        arguments: { manifest_path: '/tmp/run/manifest.json' }
      }
    };
    await expect(handler(request)).resolves.toEqual({ ok: true });
    expect(toolCallHandler).toHaveBeenCalledWith(request);
  });

  it('rejects unsupported rpc methods in the extracted handler shell', async () => {
    const handler = createDelegationServerRpcHandler({
      protocolVersion: '2024-11-05',
      tools: [],
      handleToolCall: vi.fn()
    });

    await expect(
      handler({
        jsonrpc: '2.0',
        method: 'ping'
      })
    ).rejects.toThrow('Unsupported method: ping');
  });

  it('exposes coordinator dynamic-tool bridge tools only in full mode', () => {
    const tools = buildToolList({
      mode: 'full',
      githubEnabled: false,
      allowedGithubOps: new Set<string>()
    });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain('coordinator.status');
    expect(names).toContain('coordinator.pause');
    expect(names).toContain('coordinator.resume');
    expect(names).toContain('coordinator.cancel');
  });

  it('exposes only delegate.status in status_only mode', () => {
    const tools = buildToolList({
      mode: 'status_only',
      githubEnabled: true,
      allowedGithubOps: new Set(['merge', 'comment'])
    });
    expect(tools.map((tool) => tool.name)).toEqual(['delegate.status']);
  });

  it('keeps question_only tool surface unchanged', () => {
    const tools = buildToolList({
      mode: 'question_only',
      githubEnabled: true,
      allowedGithubOps: new Set(['merge'])
    });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain('delegate.status');
    expect(names).toContain('delegate.question.enqueue');
    expect(names).toContain('delegate.question.poll');
    expect(names).toContain('github.merge');
    expect(names).not.toContain('delegate.spawn');
    expect(names).not.toContain('delegate.pause');
    expect(names).not.toContain('delegate.cancel');
    expect(names).not.toContain('coordinator.status');
    expect(names).not.toContain('coordinator.pause');
    expect(names).not.toContain('coordinator.resume');
    expect(names).not.toContain('coordinator.cancel');
  });

  it('rejects blocked tools in status_only mode with a clear error', async () => {
    await expect(
      handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.question.poll',
            arguments: {}
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'status_only',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [process.cwd()],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )
    ).rejects.toThrow('only delegate.status is allowed');

    await expect(
      handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'coordinator.status',
            arguments: {}
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'status_only',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [process.cwd()],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )
    ).rejects.toThrow('only delegate.status is allowed');
  });

  it('preserves question_only blocked-tool behavior', async () => {
    await expect(
      handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.pause',
            arguments: {}
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'question_only',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [process.cwd()],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )
    ).rejects.toThrow('delegate_mode_forbidden');
  });

  it('includes status_only in nested spawn mode enum and preserves full-mode restriction', () => {
    const tools = buildToolList({
      mode: 'full',
      githubEnabled: false,
      allowedGithubOps: new Set<string>()
    });
    const spawnTool = tools.find((tool) => tool.name === 'delegate.spawn');
    const schema = spawnTool?.inputSchema as
      | { properties?: { delegate_mode?: { enum?: string[] } } }
      | undefined;
    expect(schema?.properties?.delegate_mode?.enum).toEqual(['full', 'question_only', 'status_only']);

    expect(resolveChildDelegateMode('status_only', false)).toBe('status_only');
    expect(resolveChildDelegateMode('full', false)).toBe('question_only');
    expect(resolveChildDelegateMode('full', true)).toBe('full');
  });
});

describe('delegation server coordinator dynamic-tool bridge', () => {
  it('fails closed when dynamic tool bridge policy is disabled', async () => {
    const { root, manifestPath } = await setupRun();
    try {
      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            codexPrivate: buildDynamicToolBridgeCodexPrivate()
          }),
          buildDynamicToolBridgeContext(root)
        )
      ).rejects.toThrow('dynamic_tool_bridge_disabled');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed when dynamic tool bridge kill switch is enabled', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    await writeFile(
      join(runDir, 'control.json'),
      JSON.stringify(buildDynamicToolBridgeControlJson({ kill_switch: true })),
      'utf8'
    );
    try {
      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            codexPrivate: buildDynamicToolBridgeCodexPrivate()
          }),
          buildDynamicToolBridgeContext(root)
        )
      ).rejects.toThrow('dynamic_tool_bridge_kill_switched');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects missing and malformed source contexts', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    await writeFile(
      join(runDir, 'control.json'),
      JSON.stringify(buildDynamicToolBridgeControlJson()),
      'utf8'
    );
    const context = buildDynamicToolBridgeContext(root);
    try {
      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            codexPrivate: buildDynamicToolBridgeCodexPrivate(),
            includeDefaultSource: false
          }),
          context
        )
      ).rejects.toThrow('dynamic_tool_bridge_source_missing');

      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            arguments: {
              source: {
                source_id: ''
              }
            },
            codexPrivate: buildDynamicToolBridgeCodexPrivate(),
            includeDefaultSource: false
          }),
          context
        )
      ).rejects.toThrow('dynamic_tool_bridge_source_invalid');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects missing or malformed attestation config and hidden attestation payloads', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    const context = buildDynamicToolBridgeContext(root);
    try {
      await writeFile(
        join(runDir, 'control.json'),
        JSON.stringify(buildDynamicToolBridgeControlJson({ attestation: null })),
        'utf8'
      );
      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            codexPrivate: buildDynamicToolBridgeCodexPrivate()
          }),
          context
        )
      ).rejects.toThrow(/dynamic_tool_bridge_(attestation_(missing|invalid)|disabled)/);

      await writeFile(
        join(runDir, 'control.json'),
        JSON.stringify(
          buildDynamicToolBridgeControlJson({
            attestation: {
              token_sha256: sha256Hex(DYNAMIC_TOOL_BRIDGE_TOKEN),
              source_id: DYNAMIC_TOOL_BRIDGE_SOURCE_ID
            }
          })
        ),
        'utf8'
      );
      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            codexPrivate: buildDynamicToolBridgeCodexPrivate()
          }),
          context
        )
      ).rejects.toThrow('dynamic_tool_bridge_attestation_malformed');

      await writeFile(join(runDir, 'control.json'), JSON.stringify(buildDynamicToolBridgeControlJson()), 'utf8');
      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath
          }),
          context
        )
      ).rejects.toThrow('dynamic_tool_bridge_attestation_missing');

      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            codexPrivate: {
              dynamic_tool_bridge_token: DYNAMIC_TOOL_BRIDGE_TOKEN
            }
          }),
          context
        )
      ).rejects.toThrow('dynamic_tool_bridge_attestation_missing');

      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            codexPrivate: {
              [DYNAMIC_TOOL_BRIDGE_ATTESTATION_KEY]: DYNAMIC_TOOL_BRIDGE_TOKEN
            }
          }),
          context
        )
      ).rejects.toThrow('dynamic_tool_bridge_attestation_malformed');

      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            codexPrivate: {
              [DYNAMIC_TOOL_BRIDGE_ATTESTATION_KEY]: {
                token: DYNAMIC_TOOL_BRIDGE_TOKEN,
                source_id: DYNAMIC_TOOL_BRIDGE_SOURCE_ID
              }
            }
          }),
          context
        )
      ).rejects.toThrow('dynamic_tool_bridge_attestation_malformed');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed on expired, revoked, source-mismatched, principal-mismatched, and invalid attestations', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    const context = buildDynamicToolBridgeContext(root);
    const failureCases = [
      {
        control: buildDynamicToolBridgeControlJson({
          expires_at: new Date(Date.now() - 1_000).toISOString()
        }),
        codexPrivate: buildDynamicToolBridgeCodexPrivate(),
        error: 'dynamic_tool_bridge_attestation_expired'
      },
      {
        control: buildDynamicToolBridgeControlJson({
          revoked: true
        }),
        codexPrivate: buildDynamicToolBridgeCodexPrivate(),
        error: 'dynamic_tool_bridge_attestation_revoked'
      },
      {
        control: buildDynamicToolBridgeControlJson(),
        codexPrivate: buildDynamicToolBridgeCodexPrivate({
          [DYNAMIC_TOOL_BRIDGE_ATTESTATION_KEY]: buildDynamicToolBridgeAttestation({
            source_id: 'other_dynamic_tool'
          })
        }),
        error: 'dynamic_tool_bridge_attestation_source_mismatch'
      },
      {
        control: buildDynamicToolBridgeControlJson(),
        codexPrivate: buildDynamicToolBridgeCodexPrivate({
          [DYNAMIC_TOOL_BRIDGE_ATTESTATION_KEY]: buildDynamicToolBridgeAttestation({
            principal: 'coordinator.other'
          })
        }),
        error: 'dynamic_tool_bridge_attestation_principal_mismatch'
      },
      {
        control: buildDynamicToolBridgeControlJson({
          token: 'other-bridge-secret'
        }),
        codexPrivate: buildDynamicToolBridgeCodexPrivate(),
        error: 'dynamic_tool_bridge_attestation_invalid'
      }
    ] as const;

    try {
      for (const failureCase of failureCases) {
        await writeFile(join(runDir, 'control.json'), JSON.stringify(failureCase.control), 'utf8');
        await expect(
          handleToolCall(
            buildCoordinatorDynamicToolRequest({
              toolName: 'coordinator.status',
              manifestPath,
              codexPrivate: failureCase.codexPrivate
            }),
            context
          )
        ).rejects.toThrow(failureCase.error);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('accepts nested attestation metadata and normalizes mixed-case source ids', async () => {
    const mixedCaseSourceId = 'AppServer_Dynamic_Tool';

    const { root, runDir, manifestPath } = await setupRun();
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );
    await writeFile(
      join(runDir, 'control.json'),
      JSON.stringify(
        buildDynamicToolBridgeControlJson({
          control_seq: 3,
          nest_under_coordinator: true,
          source_id: mixedCaseSourceId
        })
      ),
      'utf8'
    );
    const context = buildDynamicToolBridgeContext(root);

    try {
      const statusResponse = (await handleToolCall(
        buildCoordinatorDynamicToolRequest({
          toolName: 'coordinator.status',
          manifestPath,
          arguments: {
            request_id: 'req-status',
            source_id: mixedCaseSourceId
          },
          codexPrivate: buildDynamicToolBridgeCodexPrivate({
            [DYNAMIC_TOOL_BRIDGE_ATTESTATION_KEY]: buildDynamicToolBridgeAttestation({
              source_id: mixedCaseSourceId
            })
          })
        }),
        context
      )) as { content: Array<{ text: string }> };

      const statusPayload = JSON.parse(statusResponse.content[0].text) as Record<string, unknown>;
      expect((statusPayload.traceability as Record<string, unknown>).request_id).toBe('req-status');
      expect((statusPayload.traceability as Record<string, unknown>).bridge_source_id).toBe(
        DYNAMIC_TOOL_BRIDGE_SOURCE_ID
      );
      expect((statusPayload.traceability as Record<string, unknown>).bridge_token_validated).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects model-supplied token and attestation fields in params', async () => {
    const { root, runDir, manifestPath } = await setupRun();
    await writeFile(join(runDir, 'control.json'), JSON.stringify(buildDynamicToolBridgeControlJson()), 'utf8');
    const context = buildDynamicToolBridgeContext(root);
    try {
      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            arguments: {
              dynamic_tool_bridge_token: 'model-value'
            },
            codexPrivate: buildDynamicToolBridgeCodexPrivate()
          }),
          context
        )
      ).rejects.toThrow(/dynamic_tool_bridge_(token_missing|attestation_(missing|invalid))/);

      await expect(
        handleToolCall(
          buildCoordinatorDynamicToolRequest({
            toolName: 'coordinator.status',
            manifestPath,
            arguments: {
              dynamic_tool_bridge_attestation: buildDynamicToolBridgeAttestation({
                token: 'model-value'
              })
            },
            codexPrivate: buildDynamicToolBridgeCodexPrivate()
          }),
          context
        )
      ).rejects.toThrow(/dynamic_tool_bridge_(token_missing|attestation_(missing|invalid))/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('passes coordinator tools through existing control handlers and marks bridge_token_validated only after attestation validation', async () => {
    const requests: Array<Record<string, unknown>> = [];
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        const parsed = JSON.parse(body || '{}') as Record<string, unknown>;
        requests.push(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            latest_action: {
              request_id: typeof parsed.request_id === 'string' ? parsed.request_id : null,
              intent_id: typeof parsed.intent_id === 'string' ? parsed.intent_id : null
            }
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, runDir, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );
    await writeFile(
      join(runDir, 'control.json'),
      JSON.stringify(buildDynamicToolBridgeControlJson({ control_seq: 3 })),
      'utf8'
    );

    const context = buildDynamicToolBridgeContext(root);

    try {
      const pauseResponse = (await handleToolCall(
        buildCoordinatorDynamicToolRequest({
          toolName: 'coordinator.pause',
          manifestPath,
          arguments: {
            intent_id: 'intent-pause',
            request_id: 'req-pause'
          },
          codexPrivate: buildDynamicToolBridgeCodexPrivate()
        }),
        context
      )) as { content: Array<{ text: string }> };

      const resumeFirstResponse = (await handleToolCall(
        buildCoordinatorDynamicToolRequest({
          toolName: 'coordinator.resume',
          manifestPath,
          arguments: {
            intent_id: 'intent-resume'
          },
          codexPrivate: buildDynamicToolBridgeCodexPrivate()
        }),
        context
      )) as { content: Array<{ text: string }> };

      const resumeReplayResponse = (await handleToolCall(
        buildCoordinatorDynamicToolRequest({
          toolName: 'coordinator.resume',
          manifestPath,
          arguments: {
            intent_id: 'intent-resume'
          },
          codexPrivate: buildDynamicToolBridgeCodexPrivate()
        }),
        context
      )) as { content: Array<{ text: string }> };

      const cancelResponse = (await handleToolCall(
        buildCoordinatorDynamicToolRequest({
          toolName: 'coordinator.cancel',
          manifestPath,
          arguments: {
            intent_id: 'intent-cancel'
          },
          codexPrivate: buildDynamicToolBridgeCodexPrivate({
            confirm_nonce: 'nonce-confirm'
          })
        }),
        context
      )) as { content: Array<{ text: string }> };

      const statusResponse = (await handleToolCall(
        buildCoordinatorDynamicToolRequest({
          toolName: 'coordinator.status',
          manifestPath,
          arguments: {
            request_id: 'req-status'
          },
          codexPrivate: buildDynamicToolBridgeCodexPrivate()
        }),
        context
      )) as { content: Array<{ text: string }> };

      expect(requests[0]).toMatchObject({ action: 'pause', request_id: 'req-pause' });
      expect(requests[1]).toMatchObject({ action: 'resume', intent_id: 'intent-resume' });
      expect(requests[2]).toMatchObject({ action: 'resume', intent_id: 'intent-resume' });
      expect(requests[1]?.request_id).toBe(requests[2]?.request_id);
      expect(requests[3]).toMatchObject({
        action: 'cancel',
        intent_id: 'intent-cancel',
        confirm_nonce: 'nonce-confirm'
      });

      const pausePayload = JSON.parse(pauseResponse.content[0].text) as Record<string, unknown>;
      const resumePayload = JSON.parse(resumeFirstResponse.content[0].text) as Record<string, unknown>;
      const resumeReplayPayload = JSON.parse(resumeReplayResponse.content[0].text) as Record<string, unknown>;
      const cancelPayload = JSON.parse(cancelResponse.content[0].text) as Record<string, unknown>;
      const statusPayload = JSON.parse(statusResponse.content[0].text) as Record<string, unknown>;

      expect((pausePayload.traceability as Record<string, unknown>).bridge_action).toBe('pause');
      expect((pausePayload.traceability as Record<string, unknown>).bridge_source_id).toBe(DYNAMIC_TOOL_BRIDGE_SOURCE_ID);
      expect((pausePayload.traceability as Record<string, unknown>).bridge_token_validated).toBe(true);
      expect((resumePayload.traceability as Record<string, unknown>).bridge_action).toBe('resume');
      expect((resumePayload.traceability as Record<string, unknown>).bridge_token_validated).toBe(true);
      expect((resumeReplayPayload.traceability as Record<string, unknown>).request_id).toBe(requests[2]?.request_id);
      expect((resumeReplayPayload.traceability as Record<string, unknown>).bridge_token_validated).toBe(true);
      expect((cancelPayload.traceability as Record<string, unknown>).bridge_action).toBe('cancel');
      expect((cancelPayload.traceability as Record<string, unknown>).bridge_token_validated).toBe(true);
      expect((statusPayload.traceability as Record<string, unknown>).bridge_action).toBe('status');
      expect((statusPayload.traceability as Record<string, unknown>).request_id).toBe('req-status');
      expect((statusPayload.traceability as Record<string, unknown>).bridge_token_validated).toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('delegation server control bridge traceability', () => {
  it('passes pause/resume trace ids and returns traceability mappings', async () => {
    const requests: Array<Record<string, unknown>> = [];
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        requests.push(JSON.parse(body || '{}') as Record<string, unknown>);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    try {
      const pauseResponse = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.pause',
            arguments: {
              manifest_path: manifestPath,
              paused: true,
              intent_id: 'intent-pause',
              request_id: 'req-pause'
            }
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      const resumeResponse = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.pause',
            arguments: {
              manifest_path: manifestPath,
              paused: false,
              intent_id: 'intent-resume'
            }
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      const resumeReplayResponse = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.pause',
            arguments: {
              manifest_path: manifestPath,
              paused: false,
              intent_id: 'intent-resume'
            }
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      expect(requests[0]).toMatchObject({
        action: 'pause',
        intent_id: 'intent-pause',
        request_id: 'req-pause'
      });
      expect(requests[1]).toMatchObject({
        action: 'resume',
        intent_id: 'intent-resume'
      });
      expect(typeof requests[1]?.request_id).toBe('string');
      expect(requests[1]?.request_id).toBe(requests[2]?.request_id);

      const pausePayload = JSON.parse(pauseResponse.content[0].text) as Record<string, unknown>;
      const resumePayload = JSON.parse(resumeResponse.content[0].text) as Record<string, unknown>;
      const resumeReplayPayload = JSON.parse(resumeReplayResponse.content[0].text) as Record<string, unknown>;

      expect(pausePayload.traceability).toEqual({
        intent_id: 'intent-pause',
        task_id: 'task-0940',
        run_id: 'run-1',
        manifest_path: manifestPath,
        request_id: 'req-pause'
      });
      expect((resumePayload.traceability as Record<string, unknown>).intent_id).toBe('intent-resume');
      expect((resumePayload.traceability as Record<string, unknown>).request_id).toBe(requests[1]?.request_id);
      expect((resumeReplayPayload.traceability as Record<string, unknown>).request_id).toBe(requests[2]?.request_id);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('uses control latest_action request id for replay traceability when caller request ids differ', async () => {
    const requests: Array<Record<string, unknown>> = [];
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        requests.push(JSON.parse(body || '{}') as Record<string, unknown>);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            idempotent_replay: requests.length > 1,
            latest_action: {
              request_id: 'req-control-1',
              intent_id: 'intent-resume'
            }
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    try {
      const firstResponse = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.pause',
            arguments: {
              manifest_path: manifestPath,
              paused: false,
              intent_id: 'intent-resume',
              request_id: 'req-local-1'
            }
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      const replayResponse = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.pause',
            arguments: {
              manifest_path: manifestPath,
              paused: false,
              intent_id: 'intent-resume',
              request_id: 'req-local-2'
            }
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      expect(requests[0]?.request_id).toBe('req-local-1');
      expect(requests[1]?.request_id).toBe('req-local-2');

      const firstPayload = JSON.parse(firstResponse.content[0].text) as Record<string, unknown>;
      const replayPayload = JSON.parse(replayResponse.content[0].text) as Record<string, unknown>;

      expect((firstPayload.traceability as Record<string, unknown>).request_id).toBe('req-control-1');
      expect((replayPayload.traceability as Record<string, unknown>).request_id).toBe('req-control-1');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('uses cancel response request id for traceability when provided', async () => {
    const requests: Array<Record<string, unknown>> = [];
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        requests.push(JSON.parse(body || '{}') as Record<string, unknown>);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, requestId: 'req-control' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    try {
      const cancelResponse = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.cancel',
            arguments: {
              manifest_path: manifestPath,
              intent_id: 'intent-cancel',
              request_id: 'req-local'
            }
          },
          codex_private: { confirm_nonce: 'nonce' }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      expect(requests[0]).toMatchObject({
        action: 'cancel',
        intent_id: 'intent-cancel',
        request_id: 'req-local'
      });

      const cancelPayload = JSON.parse(cancelResponse.content[0].text) as Record<string, unknown>;
      expect(cancelPayload.requestId).toBe('req-control');
      expect((cancelPayload.traceability as Record<string, unknown>).request_id).toBe('req-control');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('falls back to latest_action.request_id for cancel traceability when top-level request id is missing', async () => {
    const requests: Array<Record<string, unknown>> = [];
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        requests.push(JSON.parse(body || '{}') as Record<string, unknown>);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            latest_action: {
              request_id: 'req-control-latest'
            }
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    try {
      const cancelResponse = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.cancel',
            arguments: {
              manifest_path: manifestPath,
              intent_id: 'intent-cancel',
              request_id: 'req-local'
            }
          },
          codex_private: { confirm_nonce: 'nonce' }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      expect(requests[0]).toMatchObject({
        action: 'cancel',
        intent_id: 'intent-cancel',
        request_id: 'req-local'
      });

      const cancelPayload = JSON.parse(cancelResponse.content[0].text) as Record<string, unknown>;
      expect((cancelPayload.traceability as Record<string, unknown>).request_id).toBe('req-control-latest');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('prefers canonical cancel traceability from control responses over caller and latest_action fallbacks', async () => {
    const requests: Array<Record<string, unknown>> = [];
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        requests.push(JSON.parse(body || '{}') as Record<string, unknown>);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            idempotent_replay: true,
            latest_action: {
              request_id: 'req-stale',
              intent_id: 'intent-stale'
            },
            traceability: {
              action: 'cancel',
              decision: 'replayed',
              request_id: 'req-canonical',
              intent_id: null,
              transport: 'discord',
              actor_id: 'actor-canonical',
              actor_source: 'discord.oauth',
              transport_principal: 'discord:channel:canonical'
            }
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    try {
      const cancelResponse = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.cancel',
            arguments: {
              manifest_path: manifestPath,
              intent_id: 'intent-local',
              request_id: 'req-local',
              transport: 'discord',
              actor_id: 'actor-local',
              actor_source: 'discord.bot',
              transport_principal: 'discord:channel:local'
            }
          },
          codex_private: { confirm_nonce: 'nonce' }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      expect(requests[0]).toMatchObject({
        action: 'cancel',
        intent_id: 'intent-local',
        request_id: 'req-local'
      });

      const cancelPayload = JSON.parse(cancelResponse.content[0].text) as Record<string, unknown>;
      expect(cancelPayload.traceability).toMatchObject({
        request_id: 'req-canonical',
        intent_id: null,
        actor_id: 'actor-canonical',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:canonical'
      });
      expect((cancelPayload.traceability as Record<string, unknown>).request_id).not.toBe('req-local');
      expect((cancelPayload.traceability as Record<string, unknown>).request_id).not.toBe('req-stale');
      expect((cancelPayload.traceability as Record<string, unknown>).intent_id).toBeNull();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('forwards transport metadata for pause and preserves canonical traceability', async () => {
    const requests: Array<Record<string, unknown>> = [];
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        requests.push(JSON.parse(body || '{}') as Record<string, unknown>);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            traceability: {
              actor_id: 'actor-123',
              actor_source: 'discord.oauth',
              transport: 'discord',
              transport_principal: 'discord:channel:1',
              action: 'pause',
              decision: 'applied',
              request_id: 'req-control-transport'
            }
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    try {
      const pauseResponse = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.pause',
            arguments: {
              manifest_path: manifestPath,
              paused: true,
              intent_id: 'intent-transport',
              request_id: 'req-transport',
              transport: 'discord',
              actor_id: 'actor-123',
              actor_source: 'discord.oauth',
              transport_principal: 'discord:channel:1',
              transport_nonce: 'nonce-transport-pause',
              transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
            }
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      expect(requests[0]).toMatchObject({
        transport: 'discord',
        actor_id: 'actor-123',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:1',
        transport_nonce: 'nonce-transport-pause'
      });

      const pausePayload = JSON.parse(pauseResponse.content[0].text) as Record<string, unknown>;
      expect(pausePayload.traceability).toEqual({
        actor_id: 'actor-123',
        actor_source: 'discord.oauth',
        transport: 'discord',
        transport_principal: 'discord:channel:1',
        action: 'pause',
        decision: 'applied',
        request_id: 'req-control-transport'
      });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('forwards transport metadata in cancel confirmation creation', async () => {
    const requests: Array<Record<string, unknown>> = [];
    const server = http.createServer(async (req, res) => {
      if (req.url === '/confirmations/create' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        requests.push(JSON.parse(body || '{}') as Record<string, unknown>);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            request_id: 'req-confirm-transport',
            traceability: {
              actor_id: 'actor-321',
              actor_source: 'telegram.bot',
              transport: 'telegram',
              transport_principal: 'telegram:chat:7',
              action: 'cancel',
              decision: 'rejected',
              request_id: 'req-confirm-transport'
            }
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    try {
      const cancelResponse = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.cancel',
            arguments: {
              manifest_path: manifestPath,
              intent_id: 'intent-transport-cancel',
              request_id: 'req-transport-cancel',
              transport: 'telegram',
              actor_id: 'actor-321',
              actor_source: 'telegram.bot',
              transport_principal: 'telegram:chat:7',
              transport_nonce: 'nonce-transport-cancel',
              transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
            }
          }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      const firstRequest = requests[0] ?? {};
      expect((firstRequest.params as Record<string, unknown>) ?? {}).toMatchObject({
        intent_id: 'intent-transport-cancel',
        request_id: 'req-transport-cancel',
        transport: 'telegram',
        actor_id: 'actor-321',
        actor_source: 'telegram.bot',
        transport_principal: 'telegram:chat:7'
      });

      const cancelPayload = JSON.parse(cancelResponse.content[0].text) as Record<string, unknown>;
      expect(cancelPayload.traceability).toEqual({
        actor_id: 'actor-321',
        actor_source: 'telegram.bot',
        transport: 'telegram',
        transport_principal: 'telegram:chat:7',
        action: 'cancel',
        decision: 'rejected',
        request_id: 'req-confirm-transport'
      });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves transport context in cancel confirmation params when confirm nonce is replayed', async () => {
    const requests: Array<Record<string, unknown>> = [];
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        requests.push(JSON.parse(body || '{}') as Record<string, unknown>);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, request_id: 'req-confirm-replay' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    try {
      await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.cancel',
            arguments: {
              manifest_path: manifestPath,
              intent_id: 'intent-replay',
              request_id: 'req-replay',
              transport: 'discord',
              actor_id: 'actor-777',
              actor_source: 'discord.oauth',
              transport_principal: 'discord:channel:777',
              transport_nonce: 'nonce-replay',
              transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
            }
          },
          codex_private: { confirm_nonce: 'nonce' }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      );

      expect((requests[0]?.params as Record<string, unknown>) ?? {}).toMatchObject({
        manifest_path: manifestPath,
        intent_id: 'intent-replay',
        request_id: 'req-replay',
        transport: 'discord',
        actor_id: 'actor-777',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:777'
      });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed on malformed or unsupported transport values without calling control endpoint', async () => {
    let controlActionCalls = 0;
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        controlActionCalls += 1;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    const toolContext = {
      repoRoot: process.cwd(),
      mode: 'full' as const,
      allowNested: false,
      githubEnabled: false,
      allowedGithubOps: new Set<string>(),
      allowedRoots: [root],
      allowedHosts: ['127.0.0.1'],
      toolProfile: [],
      expiryFallback: 'pause' as const
    };

    try {
      const invalidCases: Array<{ transport: unknown; error: string }> = [
        { transport: 'slack', error: 'transport_unsupported' },
        { transport: '   ', error: 'transport_invalid' },
        { transport: 42, error: 'transport_invalid' }
      ];
      for (const invalidCase of invalidCases) {
        await expect(
          handleToolCall(
            {
              jsonrpc: '2.0',
              method: 'tools/call',
              params: {
                name: 'delegate.pause',
                arguments: {
                  manifest_path: manifestPath,
                  paused: true,
                  transport: invalidCase.transport
                }
              }
            },
            toolContext
          )
        ).rejects.toThrow(invalidCase.error);
      }
      expect(controlActionCalls).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed on pause transport metadata without transport and does not forward control actions', async () => {
    let controlActionCalls = 0;
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        controlActionCalls += 1;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    const toolContext = {
      repoRoot: process.cwd(),
      mode: 'full' as const,
      allowNested: false,
      githubEnabled: false,
      allowedGithubOps: new Set<string>(),
      allowedRoots: [root],
      allowedHosts: ['127.0.0.1'],
      toolProfile: [],
      expiryFallback: 'pause' as const
    };

    try {
      await expect(
        handleToolCall(
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'delegate.pause',
              arguments: {
                manifest_path: manifestPath,
                paused: true,
                actor_id: 'actor-transport-only',
                transport_nonce: 'nonce-transport-only'
              }
            }
          },
          toolContext
        )
      ).rejects.toThrow('transport_required');
      expect(controlActionCalls).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed on cancel transport metadata without transport and does not forward control or confirmation calls', async () => {
    let controlActionCalls = 0;
    let confirmationCreateCalls = 0;
    const server = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        controlActionCalls += 1;
      }
      if (req.url === '/confirmations/create' && req.method === 'POST') {
        confirmationCreateCalls += 1;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-0940',
        status: 'in_progress'
      }),
      'utf8'
    );

    const toolContext = {
      repoRoot: process.cwd(),
      mode: 'full' as const,
      allowNested: false,
      githubEnabled: false,
      allowedGithubOps: new Set<string>(),
      allowedRoots: [root],
      allowedHosts: ['127.0.0.1'],
      toolProfile: [],
      expiryFallback: 'pause' as const
    };

    try {
      await expect(
        handleToolCall(
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'delegate.cancel',
              arguments: {
                manifest_path: manifestPath,
                actor_id: 'actor-transport-only',
                transport_principal: 'discord:channel:123',
                transport_nonce: 'nonce-transport-only'
              }
            }
          },
          toolContext
        )
      ).rejects.toThrow('transport_required');
      expect(controlActionCalls).toBe(0);
      expect(confirmationCreateCalls).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
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

  it('clamps question poll wait_ms to a safe maximum', () => {
    expect(clampQuestionPollWaitMs(MAX_QUESTION_POLL_WAIT_MS * 5)).toBe(MAX_QUESTION_POLL_WAIT_MS);
    expect(clampQuestionPollWaitMs(MAX_QUESTION_POLL_WAIT_MS)).toBe(MAX_QUESTION_POLL_WAIT_MS);
    expect(clampQuestionPollWaitMs(0)).toBe(0);
    expect(clampQuestionPollWaitMs(-25)).toBe(0);
    expect(clampQuestionPollWaitMs(QUESTION_POLL_INTERVAL_MS)).toBe(QUESTION_POLL_INTERVAL_MS);
  });

  it('bounds question poll request time by wait_ms', async () => {
    const sockets = new Set<Socket>();
    const stalledServer = http.createServer(() => {
      // Intentionally never respond to trigger timeout.
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
    const start = Date.now();

    try {
      await expect(
        handleToolCall(
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'delegate.question.poll',
              arguments: {
                parent_manifest_path: manifestPath,
                question_id: 'q-1',
                wait_ms: 200
              }
            },
            codex_private: { delegation_token: 'secret-token' }
          },
          {
            repoRoot: process.cwd(),
            mode: 'full',
            allowNested: false,
            githubEnabled: false,
            allowedGithubOps: new Set<string>(),
            allowedRoots: [root],
            allowedHosts: ['127.0.0.1'],
            toolProfile: [],
            expiryFallback: 'pause'
          }
        )
      ).rejects.toThrow('control endpoint request timeout');
      expect(Date.now() - start).toBeLessThan(2000);
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
      expect((receivedAction as { action?: string } | null)?.action).toBe('resume');
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
      expect((receivedAction as { action?: string } | null)?.action).toBe('pause');
      expect((receivedAction as { reason?: string } | null)?.reason).toBe('question_expired');
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
      expect((receivedAction as { action?: string } | null)?.action).toBe('fail');
      expect((receivedAction as { reason?: string } | null)?.reason).toBe('question_expired');
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
        { pipeline: 'diagnostics', repo: repoArg, start_only: false },
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
      const resolvedManifestPath = await realpath(manifestPath);
      const resolvedRunDir = dirname(resolvedManifestPath);
      expect(result).toMatchObject({
        run_id: 'run-1',
        manifest_path: resolvedManifestPath,
        events_path: join(resolvedRunDir, 'events.jsonl')
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
        { pipeline: 'diagnostics', repo: repoRoot, start_only: false },
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

  it('filters unsafe tool profile entries when building MCP overrides', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'delegation-spawn-repo-'));
    try {
      const runDir = join(repoRoot, '.runs', 'task-0940', 'cli', 'run-1');
      await mkdir(runDir, { recursive: true });
      const manifestPath = join(runDir, 'manifest.json');
      await writeFile(manifestPath, JSON.stringify({}), 'utf8');

      const child = new MockChildProcess();
      spawnMock.mockReturnValue(child as unknown);

      const spawnPromise = handleDelegateSpawn(
        { pipeline: 'diagnostics', repo: repoRoot, start_only: false },
        repoRoot,
        false,
        [repoRoot],
        ['127.0.0.1'],
        ['shell', 'good_tool', 'bad;tool', 'bad\nline', 'bad=tool', 'bad/tool']
      );

      await new Promise((resolve) => setImmediate(resolve));
      const spawnArgs = spawnMock.mock.calls[0]?.[2] as { env?: NodeJS.ProcessEnv } | undefined;
      const overrides = spawnArgs?.env?.CODEX_MCP_CONFIG_OVERRIDES?.split(';') ?? [];
      expect(overrides).toContain('mcp_servers.delegation.enabled=true');
      expect(overrides).toContain('mcp_servers.shell.enabled=true');
      expect(overrides).toContain('mcp_servers.good_tool.enabled=true');
      expect(overrides.join(';')).not.toContain('bad;tool');
      expect(overrides.join(';')).not.toContain('bad\nline');
      expect(overrides.join(';')).not.toContain('bad=tool');
      expect(overrides.join(';')).not.toContain('bad/tool');

      const stdout = JSON.stringify({
        run_id: 'run-1',
        status: 'completed',
        manifest: relative(repoRoot, manifestPath)
      });
      child.stdout.write(stdout);
      child.emit('exit', 0);

      await spawnPromise;
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('delegation server spawn start_only', () => {
  it('requires task_id when start_only is true', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'delegation-spawn-repo-'));
    try {
      await expect(
        handleDelegateSpawn(
          { pipeline: 'diagnostics', repo: repoRoot },
          repoRoot,
          false,
          [repoRoot],
          ['127.0.0.1'],
          []
        )
      ).rejects.toThrow('task_id');
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('returns manifest info after polling when start_only is true', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'delegation-spawn-repo-'));
    const taskId = 'task-0940';
    const runId = 'run-1';
    try {
      const runDir = join(repoRoot, '.runs', taskId, 'cli', runId);
      const manifestPath = join(runDir, 'manifest.json');

      const child = new MockChildProcess();
      const unrefSpy = vi.spyOn(child, 'unref');
      spawnMock.mockReturnValue(child as unknown);

      const spawnPromise = handleDelegateSpawn(
        {
          pipeline: 'diagnostics',
          repo: repoRoot,
          task_id: taskId,
          start_only: true,
          env: { CODEX_ORCHESTRATOR_RUNS_DIR: '.runs' }
        },
        repoRoot,
        false,
        [repoRoot],
        ['127.0.0.1'],
        []
      );

      await new Promise((resolve) => setTimeout(resolve, 10));
      await mkdir(runDir, { recursive: true });
      await writeFile(
        manifestPath,
        JSON.stringify({ run_id: runId, task_id: taskId, log_path: 'logs/child.log' }),
        'utf8'
      );

      const result = await spawnPromise;
      const resolvedManifestPath = await realpath(manifestPath);
      const resolvedRunDir = dirname(resolvedManifestPath);
      const spawnArgs = spawnMock.mock.calls[0]?.[2] as { detached?: boolean; stdio?: unknown } | undefined;
      expect(spawnArgs?.detached).toBe(true);
      expect(spawnArgs?.stdio).toEqual(['ignore', 'ignore', 'ignore']);
      expect(unrefSpy).toHaveBeenCalled();
      expect(result).toMatchObject({
        run_id: runId,
        manifest_path: resolvedManifestPath,
        events_path: join(resolvedRunDir, 'events.jsonl'),
        log_path: 'logs/child.log'
      });
      const tokenRaw = await readFile(join(runDir, 'delegation_token.json'), 'utf8');
      expect(tokenRaw).toContain('token');
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('ignores baseline manifests updated after spawn start', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'delegation-spawn-repo-'));
    const taskId = 'task-0940';
    const baselineRunId = 'baseline-run';
    const newRunId = 'run-2';
    try {
      const baselineDir = join(repoRoot, '.runs', taskId, 'cli', baselineRunId);
      const baselineManifest = join(baselineDir, 'manifest.json');
      await mkdir(baselineDir, { recursive: true });
      await writeFile(
        baselineManifest,
        JSON.stringify({ run_id: baselineRunId, task_id: taskId, log_path: 'logs/baseline.log' }),
        'utf8'
      );

      const child = new MockChildProcess();
      spawnMock.mockReturnValue(child as unknown);

      const spawnPromise = handleDelegateSpawn(
        {
          pipeline: 'diagnostics',
          repo: repoRoot,
          task_id: taskId,
          start_only: true,
          env: { CODEX_ORCHESTRATOR_RUNS_DIR: '.runs' }
        },
        repoRoot,
        false,
        [repoRoot],
        ['127.0.0.1'],
        []
      );

      await new Promise((resolve) => setTimeout(resolve, 10));
      const newRunDir = join(repoRoot, '.runs', taskId, 'cli', newRunId);
      const newManifest = join(newRunDir, 'manifest.json');
      await mkdir(newRunDir, { recursive: true });
      await writeFile(
        newManifest,
        JSON.stringify({ run_id: newRunId, task_id: taskId, log_path: 'logs/new.log' }),
        'utf8'
      );
      await new Promise((resolve) => setTimeout(resolve, 5));
      await writeFile(
        baselineManifest,
        JSON.stringify({ run_id: baselineRunId, task_id: taskId, log_path: 'logs/baseline.log' }),
        'utf8'
      );

      const result = await spawnPromise;
      const resolvedManifestPath = await realpath(newManifest);
      expect(result).toMatchObject({
        run_id: newRunId,
        manifest_path: resolvedManifestPath
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('accepts custom runs roots when start_only is true', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'delegation-spawn-repo-'));
    const taskId = 'task-0940';
    const runId = 'run-1';
    const runsDir = 'custom_runs';
    try {
      const runDir = join(repoRoot, runsDir, taskId, 'cli', runId);
      const manifestPath = join(runDir, 'manifest.json');

      const child = new MockChildProcess();
      spawnMock.mockReturnValue(child as unknown);

      const spawnPromise = handleDelegateSpawn(
        {
          pipeline: 'diagnostics',
          repo: repoRoot,
          task_id: taskId,
          start_only: true,
          env: { CODEX_ORCHESTRATOR_RUNS_DIR: runsDir }
        },
        repoRoot,
        false,
        [repoRoot],
        ['127.0.0.1'],
        []
      );

      await new Promise((resolve) => setTimeout(resolve, 10));
      await mkdir(runDir, { recursive: true });
      await writeFile(
        manifestPath,
        JSON.stringify({ run_id: runId, task_id: taskId, log_path: 'logs/child.log' }),
        'utf8'
      );

      const result = await spawnPromise;
      const resolvedManifestPath = await realpath(manifestPath);
      const resolvedRunDir = dirname(resolvedManifestPath);
      expect(result).toMatchObject({
        run_id: runId,
        manifest_path: resolvedManifestPath,
        events_path: join(resolvedRunDir, 'events.jsonl'),
        log_path: 'logs/child.log'
      });
      const tokenRaw = await readFile(join(runDir, 'delegation_token.json'), 'utf8');
      expect(tokenRaw).toContain('token');
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('delegation server confirmation fallback', () => {
  it('creates confirmations only for confirmation-specific cancel errors', async () => {
    let actionCalls = 0;
    let createCalls = 0;
    const server = http.createServer((req, res) => {
      if (req.url === '/control/action') {
        actionCalls += 1;
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'confirmation_invalid' }));
        return;
      }
      if (req.url === '/confirmations/create') {
        createCalls += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ request_id: 'req-1' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });

    try {
      const response = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.cancel',
            arguments: { manifest_path: manifestPath }
          },
          codex_private: { confirm_nonce: 'nonce' }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };
      const payload = JSON.parse(response.content[0].text) as Record<string, unknown>;
      expect(payload.request_id).toBe('req-1');
      expect(actionCalls).toBe(1);
      expect(createCalls).toBe(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not allow cancel nonce replay across intent/request scope', async () => {
    const actionRequests: Array<Record<string, unknown>> = [];
    const createRequests: Array<Record<string, unknown>> = [];
    const server = http.createServer(async (req, res) => {
      let body = '';
      for await (const chunk of req) {
        body += chunk.toString();
      }
      const payload = JSON.parse(body || '{}') as Record<string, unknown>;
      if (req.url === '/control/action') {
        actionRequests.push(payload);
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'confirmation_scope_mismatch' }));
        return;
      }
      if (req.url === '/confirmations/create') {
        createRequests.push(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ request_id: 'req-reconfirm' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });

    try {
      const response = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'delegate.cancel',
            arguments: {
              manifest_path: manifestPath,
              intent_id: 'intent-replay-target',
              request_id: 'req-replay-target',
              transport: 'discord',
              actor_id: 'actor-999',
              actor_source: 'discord.oauth',
              transport_principal: 'discord:channel:999'
            }
          },
          codex_private: { confirm_nonce: 'nonce-from-other-scope' }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: false,
          allowedGithubOps: new Set<string>(),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };

      expect(actionRequests).toHaveLength(1);
      expect(actionRequests[0]).toMatchObject({
        action: 'cancel',
        intent_id: 'intent-replay-target',
        request_id: 'req-replay-target'
      });
      expect((actionRequests[0]?.params as Record<string, unknown>) ?? {}).toMatchObject({
        manifest_path: manifestPath,
        intent_id: 'intent-replay-target',
        request_id: 'req-replay-target',
        transport: 'discord',
        actor_id: 'actor-999',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:999'
      });

      expect(createRequests).toHaveLength(1);
      expect((createRequests[0]?.params as Record<string, unknown>) ?? {}).toMatchObject({
        manifest_path: manifestPath,
        intent_id: 'intent-replay-target',
        request_id: 'req-replay-target',
        transport: 'discord',
        actor_id: 'actor-999',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:999'
      });

      const payload = JSON.parse(response.content[0].text) as Record<string, unknown>;
      expect(payload.request_id).toBe('req-reconfirm');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not create confirmations on generic cancel errors', async () => {
    let createCalls = 0;
    const server = http.createServer((req, res) => {
      if (req.url === '/control/action') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unexpected_failure' }));
        return;
      }
      if (req.url === '/confirmations/create') {
        createCalls += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ request_id: 'req-2' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });

    try {
      await expect(
        handleToolCall(
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'delegate.cancel',
              arguments: { manifest_path: manifestPath }
            },
            codex_private: { confirm_nonce: 'nonce' }
          },
          {
            repoRoot: process.cwd(),
            mode: 'full',
            allowNested: false,
            githubEnabled: false,
            allowedGithubOps: new Set<string>(),
            allowedRoots: [root],
            allowedHosts: ['127.0.0.1'],
            toolProfile: [],
            expiryFallback: 'pause'
          }
        )
      ).rejects.toThrow('control endpoint error');
      expect(createCalls).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('creates confirmations for confirmation-specific github merge errors', async () => {
    let createCalls = 0;
    const server = http.createServer((req, res) => {
      if (req.url === '/confirmations/validate') {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'confirmation_invalid' }));
        return;
      }
      if (req.url === '/confirmations/create') {
        createCalls += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ request_id: 'req-3' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });

    try {
      const response = (await handleToolCall(
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'github.merge',
            arguments: { manifest_path: manifestPath, pull_number: 321 }
          },
          codex_private: { confirm_nonce: 'nonce' }
        },
        {
          repoRoot: process.cwd(),
          mode: 'full',
          allowNested: false,
          githubEnabled: true,
          allowedGithubOps: new Set(['merge']),
          allowedRoots: [root],
          allowedHosts: ['127.0.0.1'],
          toolProfile: [],
          expiryFallback: 'pause'
        }
      )) as { content: Array<{ text: string }> };
      const payload = JSON.parse(response.content[0].text) as Record<string, unknown>;
      expect(payload.request_id).toBe('req-3');
      expect(createCalls).toBe(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('avoids confirmation fallback on generic github merge errors', async () => {
    let createCalls = 0;
    const server = http.createServer((req, res) => {
      if (req.url === '/confirmations/validate') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unexpected_failure' }));
        return;
      }
      if (req.url === '/confirmations/create') {
        createCalls += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ request_id: 'req-3' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const { root, manifestPath } = await setupRun({ baseUrl });

    try {
      await expect(
        handleToolCall(
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'github.merge',
              arguments: { manifest_path: manifestPath, pull_number: 123 }
            },
            codex_private: { confirm_nonce: 'nonce' }
          },
          {
            repoRoot: process.cwd(),
            mode: 'full',
            allowNested: false,
            githubEnabled: true,
            allowedGithubOps: new Set(['merge']),
            allowedRoots: [root],
            allowedHosts: ['127.0.0.1'],
            toolProfile: [],
            expiryFallback: 'pause'
          }
        )
      ).rejects.toThrow('control endpoint error');
      expect(createCalls).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
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
  it('parses JSONL requests and writes JSONL responses', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    let receivedMethod: string | null = null;
    await runJsonRpcServer(async (request) => {
      receivedMethod = request.method;
      return { ok: true };
    }, { stdin: input, stdout: output });

    const payload = JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'delegate.status', params: {} });
    const responsePromise = collectJsonlResponses(output, 1);

    input.write(`${payload}\n`);
    const [response] = await responsePromise;
    expect(receivedMethod).toBe('delegate.status');
    expect(response).toEqual({ jsonrpc: '2.0', id: 0, result: { ok: true } });

    input.end();
  });

  it('writes JSONL error responses for JSONL requests', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    await runJsonRpcServer(async () => {
      throw new Error('boom');
    }, { stdin: input, stdout: output });

    const payload = JSON.stringify({ jsonrpc: '2.0', id: 21, method: 'delegate.status', params: {} });
    const responsePromise = collectJsonlResponses(output, 1);

    input.write(`${payload}\n`);
    const [response] = await responsePromise;
    expect(response).toEqual({ jsonrpc: '2.0', id: 21, error: { code: -32603, message: 'boom' } });

    input.end();
  });

  it('writes framed error responses for framed requests', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    await runJsonRpcServer(async () => {
      throw new Error('boom');
    }, { stdin: input, stdout: output });

    const payload = JSON.stringify({ jsonrpc: '2.0', id: 22, method: 'delegate.status', params: {} });
    const responsePromise = collectMcpResponses(output, 1);

    input.write(`Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`);
    const [response] = await responsePromise;
    expect(response).toEqual({ jsonrpc: '2.0', id: 22, error: { code: -32603, message: 'boom' } });

    input.end();
  });

  it('handles JSONL messages split across chunks', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    let receivedMethod: string | null = null;
    await runJsonRpcServer(async (request) => {
      receivedMethod = request.method;
      return { ok: true };
    }, { stdin: input, stdout: output });

    const payload = JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'delegate.status', params: {} });
    const splitIndex = Math.floor(payload.length / 2);
    const responsePromise = collectJsonlResponses(output, 1);

    input.write(payload.slice(0, splitIndex));
    await new Promise((resolve) => setImmediate(resolve));
    expect(process.exitCode).toBeUndefined();

    input.write(`${payload.slice(splitIndex)}\n`);
    const [response] = await responsePromise;
    expect(receivedMethod).toBe('delegate.status');
    expect(response).toEqual({ jsonrpc: '2.0', id: 10, result: { ok: true } });

    input.end();
  });

  it('parses multiple JSONL messages coalesced in one chunk', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    const receivedMethods: string[] = [];
    await runJsonRpcServer(async (request) => {
      receivedMethods.push(request.method);
      return { ok: true };
    }, { stdin: input, stdout: output });

    const payloadA = JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'delegate.status', params: {} });
    const payloadB = JSON.stringify({ jsonrpc: '2.0', id: 12, method: 'delegate.status', params: {} });
    const responsePromise = collectJsonlResponses(output, 2);

    input.write(`${payloadA}\n${payloadB}\n`);
    const responses = await responsePromise;
    expect(receivedMethods).toEqual(['delegate.status', 'delegate.status']);
    expect(responses[0]).toEqual({ jsonrpc: '2.0', id: 11, result: { ok: true } });
    expect(responses[1]).toEqual({ jsonrpc: '2.0', id: 12, result: { ok: true } });

    input.end();
  });

  it('ignores blank JSONL lines with CRLF delimiters', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    const receivedMethods: string[] = [];
    await runJsonRpcServer(async (request) => {
      receivedMethods.push(request.method);
      return { ok: true };
    }, { stdin: input, stdout: output });

    const payloadA = JSON.stringify({ jsonrpc: '2.0', id: 14, method: 'delegate.status', params: {} });
    const payloadB = JSON.stringify({ jsonrpc: '2.0', id: 15, method: 'delegate.status', params: {} });
    const responsePromise = collectJsonlResponses(output, 2);

    input.write(`${payloadA}\r\n\r\n${payloadB}\r\n`);
    const responses = await responsePromise;
    expect(receivedMethods).toEqual(['delegate.status', 'delegate.status']);
    expect(responses[0]).toEqual({ jsonrpc: '2.0', id: 14, result: { ok: true } });
    expect(responses[1]).toEqual({ jsonrpc: '2.0', id: 15, result: { ok: true } });

    input.end();
  });

  it('recovers after invalid JSONL and continues processing', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    const receivedMethods: string[] = [];
    await runJsonRpcServer(async (request) => {
      receivedMethods.push(request.method);
      return { ok: true };
    }, { stdin: input, stdout: output });

    const badPayload = '{not-json';
    const goodPayload = JSON.stringify({ jsonrpc: '2.0', id: 13, method: 'delegate.status', params: {} });
    const responsePromise = collectJsonlResponses(output, 1);

    input.write(`${badPayload}\n${goodPayload}\n`);
    const [response] = await responsePromise;
    expect(receivedMethods).toEqual(['delegate.status']);
    expect(response).toEqual({ jsonrpc: '2.0', id: 13, result: { ok: true } });

    input.end();
  });

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

  it('does not treat header lines as JSONL when Content-Type precedes Content-Length', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    let receivedMethod: string | null = null;
    await runJsonRpcServer(async (request) => {
      receivedMethod = request.method;
      return { ok: true };
    }, { stdin: input, stdout: output });

    const payload = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'delegate.status', params: {} });
    const responsePromise = collectMcpResponses(output, 1);

    input.write('Content-Type: application/vscode-jsonrpc; charset=utf-8\r\n');
    await new Promise((resolve) => setImmediate(resolve));
    expect(process.exitCode).toBeUndefined();
    expect(receivedMethod).toBeNull();

    input.write(`Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`);
    const [response] = await responsePromise;
    expect(receivedMethod).toBe('delegate.status');
    expect(response).toEqual({ jsonrpc: '2.0', id: 2, result: { ok: true } });

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

  it('handles payload bodies split across chunks', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    let receivedMethod: string | null = null;
    await runJsonRpcServer(async (request) => {
      receivedMethod = request.method;
      return { ok: true };
    }, { stdin: input, stdout: output });

    const payload = JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'delegate.status', params: {} });
    const header = `Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n`;
    const responsePromise = collectMcpResponses(output, 1);
    const splitIndex = Math.floor(payload.length / 2);

    input.write(`${header}${payload.slice(0, splitIndex)}`);
    await new Promise((resolve) => setImmediate(resolve));
    expect(process.exitCode).toBeUndefined();

    input.write(payload.slice(splitIndex));
    const [response] = await responsePromise;
    expect(receivedMethod).toBe('delegate.status');
    expect(response).toEqual({ jsonrpc: '2.0', id: 3, result: { ok: true } });

    input.end();
  });

  it('parses multiple MCP messages coalesced in one chunk', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    const receivedMethods: string[] = [];
    await runJsonRpcServer(async (request) => {
      receivedMethods.push(request.method);
      return { ok: true };
    }, { stdin: input, stdout: output });

    const payloadA = JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'delegate.status', params: {} });
    const payloadB = JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'delegate.status', params: {} });
    const frameA = `Content-Length: ${Buffer.byteLength(payloadA)}\r\n\r\n${payloadA}`;
    const frameB = `Content-Length: ${Buffer.byteLength(payloadB)}\r\n\r\n${payloadB}`;

    const responsePromise = collectMcpResponses(output, 2);
    input.write(`${frameA}${frameB}`);
    const responses = await responsePromise;

    expect(receivedMethods).toEqual(['delegate.status', 'delegate.status']);
    expect(responses[0]).toEqual({ jsonrpc: '2.0', id: 4, result: { ok: true } });
    expect(responses[1]).toEqual({ jsonrpc: '2.0', id: 5, result: { ok: true } });

    input.end();
  });

  it('recovers after invalid JSON and continues processing', async () => {
    process.exitCode = undefined;
    const input = new PassThrough();
    const output = new PassThrough();
    const receivedMethods: string[] = [];
    await runJsonRpcServer(async (request) => {
      receivedMethods.push(request.method);
      return { ok: true };
    }, { stdin: input, stdout: output });

    const badPayload = '{not-json';
    const badFrame = `Content-Length: ${Buffer.byteLength(badPayload)}\r\n\r\n${badPayload}`;
    const goodPayload = JSON.stringify({ jsonrpc: '2.0', id: 6, method: 'delegate.status', params: {} });
    const goodFrame = `Content-Length: ${Buffer.byteLength(goodPayload)}\r\n\r\n${goodPayload}`;

    const responsePromise = collectMcpResponses(output, 1);
    input.write(`${badFrame}${goodFrame}`);
    await new Promise((resolve) => setImmediate(resolve));
    expect(process.exitCode).toBeUndefined();

    const [response] = await responsePromise;
    expect(receivedMethods).toEqual(['delegate.status']);
    expect(response).toEqual({ jsonrpc: '2.0', id: 6, result: { ok: true } });

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
  unref(): void {
    // noop for test
  }
  kill(): boolean {
    return true;
  }
}
