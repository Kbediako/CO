import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import {
  loadDelegationConfigFiles,
  computeEffectiveDelegationConfig,
  type DelegationConfigLayer
} from './config/delegationConfig.js';
import { logger } from '../logger.js';
import { buildActionParamsDigest } from './control/confirmations.js';

interface McpRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
  codex_private?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface DelegationServerOptions {
  repoRoot: string;
  mode: 'full' | 'question_only';
}

const PROTOCOL_VERSION = '2024-11-05';

export async function startDelegationServer(options: DelegationServerOptions): Promise<void> {
  const repoRoot = resolve(options.repoRoot);
  const configFiles = await loadDelegationConfigFiles({ repoRoot });
  const layers = [configFiles.global, configFiles.repo].filter(Boolean) as DelegationConfigLayer[];
  const effectiveConfig = computeEffectiveDelegationConfig({ repoRoot, layers });
  const mode = options.mode ?? effectiveConfig.delegate.mode ?? 'full';
  const allowNested = effectiveConfig.delegate.allowNested ?? false;
  const githubEnabled = effectiveConfig.github.enabled;
  const allowedGithubOps = new Set(effectiveConfig.github.operations);

  const tools = buildToolList({ mode, githubEnabled, allowedGithubOps });

  const handler = async (request: McpRequest): Promise<unknown> => {
    switch (request.method) {
      case 'initialize':
        return {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: { name: 'codex-delegation', version: '0.1.0' },
          capabilities: { tools: {} }
        };
      case 'tools/list':
        return { tools };
      case 'tools/call':
        return await handleToolCall(request, {
          repoRoot,
          mode,
          allowNested,
          githubEnabled,
          allowedGithubOps
        });
      default:
        throw new Error(`Unsupported method: ${request.method}`);
    }
  };

  await runJsonRpcServer(handler);
}

function buildToolList(options: {
  mode: 'full' | 'question_only';
  githubEnabled: boolean;
  allowedGithubOps: Set<string>;
}): Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> {
  const tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> = [];
  const includeFull = options.mode !== 'question_only';

  if (includeFull) {
    tools.push(toolDefinition('delegate.spawn', 'Spawn a delegated run', {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        pipeline: { type: 'string' },
        repo: { type: 'string' },
        parent_run_id: { type: 'string' },
        env: { type: 'object', additionalProperties: { type: 'string' } },
        delegate_mode: { type: 'string', enum: ['full', 'question_only'] }
      },
      required: ['pipeline', 'repo']
    }));
    tools.push(toolDefinition('delegate.pause', 'Pause or resume a run', {
      type: 'object',
      properties: {
        manifest_path: { type: 'string' },
        paused: { type: 'boolean' }
      },
      required: ['manifest_path', 'paused']
    }));
    tools.push(toolDefinition('delegate.cancel', 'Cancel a run (confirmation required)', {
      type: 'object',
      properties: {
        manifest_path: { type: 'string' }
      },
      required: ['manifest_path']
    }));
  }

  tools.push(toolDefinition('delegate.status', 'Fetch run status', {
    type: 'object',
    properties: {
      manifest_path: { type: 'string' }
    },
    required: ['manifest_path']
  }));

  tools.push(toolDefinition('delegate.question.enqueue', 'Enqueue a question to the parent run', {
    type: 'object',
    properties: {
      parent_manifest_path: { type: 'string' },
      parent_run_id: { type: 'string' },
      parent_task_id: { type: 'string' },
      from_manifest_path: { type: 'string' },
      prompt: { type: 'string' },
      urgency: { type: 'string', enum: ['low', 'med', 'high'] },
      expires_in_ms: { type: 'number' },
      auto_pause: { type: 'boolean' }
    },
    required: ['parent_manifest_path', 'prompt']
  }));
  tools.push(toolDefinition('delegate.question.poll', 'Poll for a question answer', {
    type: 'object',
    properties: {
      parent_manifest_path: { type: 'string' },
      question_id: { type: 'string' },
      wait_ms: { type: 'number' }
    },
    required: ['parent_manifest_path', 'question_id']
  }));

  if (options.githubEnabled) {
    if (options.allowedGithubOps.has('open_pr')) {
      tools.push(toolDefinition('github.open_pr', 'Open a pull request', {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          base: { type: 'string' },
          head: { type: 'string' },
          draft: { type: 'boolean' }
        },
        required: ['title']
      }));
    }
    if (options.allowedGithubOps.has('comment')) {
      tools.push(toolDefinition('github.comment', 'Create a PR/issue comment', {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          issue_number: { type: 'number' },
          body: { type: 'string' }
        },
        required: ['issue_number', 'body']
      }));
    }
    if (options.allowedGithubOps.has('review')) {
      tools.push(toolDefinition('github.review', 'Submit a PR review', {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          pull_number: { type: 'number' },
          event: { type: 'string', enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT'] },
          body: { type: 'string' }
        },
        required: ['pull_number', 'event']
      }));
    }
    if (options.allowedGithubOps.has('get_checks')) {
      tools.push(toolDefinition('github.get_checks', 'Fetch PR checks', {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          pull_number: { type: 'number' }
        },
        required: ['pull_number']
      }));
    }
    if (options.allowedGithubOps.has('merge')) {
      tools.push(toolDefinition('github.merge', 'Merge a PR', {
        type: 'object',
        properties: {
          manifest_path: { type: 'string' },
          repo: { type: 'string' },
          pull_number: { type: 'number' },
          method: { type: 'string', enum: ['merge', 'squash', 'rebase'] },
          delete_branch: { type: 'boolean' }
        },
        required: ['pull_number']
      }));
    }
  }

  return tools;
}

function toolDefinition(name: string, description: string, inputSchema: Record<string, unknown>) {
  return { name, description, inputSchema };
}

async function handleToolCall(
  request: McpRequest,
  context: {
    repoRoot: string;
    mode: 'full' | 'question_only';
    allowNested: boolean;
    githubEnabled: boolean;
    allowedGithubOps: Set<string>;
  }
): Promise<unknown> {
  const params = asRecord(request.params);
  const toolName = readStringValue(params, 'name');
  if (!toolName) {
    throw new Error('Invalid tool call: missing name');
  }
  const input = asRecord(params.arguments);

  switch (toolName) {
    case 'delegate.status':
      return wrapResult(await handleDelegateStatus(input));
    case 'delegate.pause':
      return wrapResult(await handleDelegatePause(input));
    case 'delegate.cancel':
      return wrapResult(await handleDelegateCancel(input, request));
    case 'delegate.spawn':
      return wrapResult(await handleDelegateSpawn(input, context.repoRoot, context.allowNested));
    case 'delegate.question.enqueue':
      return wrapResult(await handleQuestionEnqueue(input));
    case 'delegate.question.poll':
      return wrapResult(await handleQuestionPoll(input));
    case 'github.open_pr':
    case 'github.comment':
    case 'github.review':
    case 'github.get_checks':
    case 'github.merge':
      return wrapResult(await handleGithubCall(toolName, input, request, context));
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function wrapResult(payload: unknown): { content: Array<{ type: 'text'; text: string }>; isError: false } {
  return {
    content: [
      {
        type: 'text',
        text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
      }
    ],
    isError: false
  };
}

async function handleDelegateStatus(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const manifestPath = resolve(requireString(readStringValue(input, 'manifest_path', 'manifestPath'), 'manifest_path'));
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as {
    status: string;
    run_id: string;
    task_id: string;
    status_detail?: string;
    log_path?: string | null;
  };
  const eventsPath = resolve(dirname(manifestPath), 'events.jsonl');
  return {
    run_id: manifest.run_id,
    task_id: manifest.task_id,
    status: manifest.status,
    status_detail: manifest.status_detail ?? null,
    manifest_path: manifestPath,
    events_path: eventsPath,
    log_path: manifest.log_path ?? null
  };
}

async function handleDelegatePause(input: Record<string, unknown>): Promise<unknown> {
  const manifestPath = resolve(requireString(readStringValue(input, 'manifest_path', 'manifestPath'), 'manifest_path'));
  const paused = readBooleanValue(input, 'paused') ?? false;
  return await callControlEndpoint(manifestPath, '/control/action', {
    action: paused ? 'pause' : 'resume',
    requested_by: 'delegate'
  });
}

async function handleDelegateCancel(input: Record<string, unknown>, request: McpRequest): Promise<unknown> {
  const manifestPath = resolve(requireString(readStringValue(input, 'manifest_path', 'manifestPath'), 'manifest_path'));
  const privateNonce = request.codex_private?.confirm_nonce;
  if (Object.prototype.hasOwnProperty.call(input, 'confirm_nonce')) {
    throw new Error('confirm_nonce must be injected by the runner');
  }
  if (!privateNonce) {
    const digest = buildActionParamsDigest({
      tool: 'delegate.cancel',
      params: { manifest_path: manifestPath }
    });
    const confirmation = await callControlEndpoint(manifestPath, '/confirmations/create', {
      action: 'cancel',
      tool: 'delegate.cancel',
      params: { manifest_path: manifestPath }
    });
    return {
      ...confirmation,
      action_params_digest: digest
    };
  }
  return await callControlEndpoint(manifestPath, '/control/action', {
    action: 'cancel',
    requested_by: 'delegate'
  });
}

async function handleDelegateSpawn(
  input: Record<string, unknown>,
  repoRoot: string,
  allowNested: boolean
): Promise<Record<string, unknown>> {
  const pipeline = requireString(readStringValue(input, 'pipeline'), 'pipeline');
  const repo = readStringValue(input, 'repo') ?? repoRoot ?? process.cwd();
  const taskId = readStringValue(input, 'task_id', 'taskId');
  const args = ['start', pipeline, '--format', 'json', '--no-interactive'];
  if (taskId) {
    args.push('--task', taskId);
  }
  const parentRunId = readStringValue(input, 'parent_run_id', 'parentRunId');
  if (parentRunId) {
    args.push('--parent-run', parentRunId);
  }
  const requestedMode = readStringValue(input, 'delegate_mode', 'delegateMode') ?? 'question_only';
  const childMode = allowNested && requestedMode === 'full' ? 'full' : 'question_only';
  const envOverrides = readStringMap(input, 'env');
  const childEnv = {
    ...process.env,
    ...(envOverrides ?? {}),
    CODEX_DELEGATE_MODE: childMode
  };
  const child = spawn('codex-orchestrator', args, { cwd: repo, env: childEnv });
  const output = await collectOutput(child);
  const parsed = safeJsonParse(output.stdout);
  const parsedRecord = asRecord(parsed);
  const manifestPath = readStringValue(parsedRecord, 'manifest');
  if (!manifestPath) {
    return { status: 'spawned', stdout: output.stdout.trim(), stderr: output.stderr.trim() };
  }
  const runId = readStringValue(parsedRecord, 'run_id', 'runId');
  const logPath = readStringValue(parsedRecord, 'log_path', 'logPath');
  const eventsPath = `${dirname(manifestPath)}/events.jsonl`;
  return {
    run_id: runId,
    manifest_path: manifestPath,
    log_path: logPath,
    events_path: eventsPath
  };
}

async function handleQuestionEnqueue(input: Record<string, unknown>): Promise<unknown> {
  const manifestPath = resolve(
    requireString(readStringValue(input, 'parent_manifest_path', 'parentManifestPath'), 'parent_manifest_path')
  );
  const autoPause = readBooleanValue(input, 'auto_pause', 'autoPause') ?? true;
  const result = await callControlEndpoint(manifestPath, '/questions/enqueue', {
    parent_run_id: readStringValue(input, 'parent_run_id', 'parentRunId') ?? null,
    parent_task_id: readStringValue(input, 'parent_task_id', 'parentTaskId') ?? null,
    from_run_id: readStringValue(input, 'from_run_id', 'fromRunId') ?? null,
    prompt: requireString(readStringValue(input, 'prompt'), 'prompt'),
    urgency: readStringValue(input, 'urgency') ?? 'med',
    expires_in_ms: readNumberValue(input, 'expires_in_ms', 'expiresInMs')
  });
  const fromManifestPath = readStringValue(input, 'from_manifest_path', 'fromManifestPath');
  if (autoPause && fromManifestPath) {
    await callControlEndpoint(resolve(fromManifestPath), '/control/action', {
      action: 'pause',
      requested_by: 'delegate'
    });
  }
  return result;
}

async function handleQuestionPoll(input: Record<string, unknown>): Promise<unknown> {
  const manifestPath = resolve(
    requireString(readStringValue(input, 'parent_manifest_path', 'parentManifestPath'), 'parent_manifest_path')
  );
  const questionId = requireString(readStringValue(input, 'question_id', 'questionId'), 'question_id');
  const waitMs = readNumberValue(input, 'wait_ms', 'waitMs') ?? 0;
  const deadline = Date.now() + (Number.isFinite(waitMs) ? waitMs : 0);

  for (;;) {
    const record = await callControlEndpoint(manifestPath, `/questions/${questionId}`, null);
    const status = readStringValue(record, 'status');
    if (status !== 'queued' || waitMs <= 0 || Date.now() >= deadline) {
      return record;
    }
    await delay(500);
  }
}

async function handleGithubCall(
  toolName: string,
  input: Record<string, unknown>,
  request: McpRequest,
  context: { githubEnabled: boolean; allowedGithubOps: Set<string> }
): Promise<unknown> {
  const op = toolName.replace('github.', '');
  if (!context.githubEnabled || !context.allowedGithubOps.has(op)) {
    throw new Error('github_operation_disallowed');
  }
  if (toolName === 'github.merge') {
    const privateNonce = request.codex_private?.confirm_nonce;
    if (Object.prototype.hasOwnProperty.call(input, 'confirm_nonce')) {
      throw new Error('confirm_nonce must be injected by the runner');
    }
    if (!privateNonce) {
      const digest = buildActionParamsDigest({ tool: toolName, params: { ...input, confirm_nonce: undefined } });
      const manifestPathValue = readStringValue(input, 'manifest_path', 'manifestPath');
      const manifestPath = manifestPathValue ? resolve(manifestPathValue) : null;
      if (manifestPath) {
        const confirmation = await callControlEndpoint(manifestPath, '/confirmations/create', {
          action: 'merge',
          tool: toolName,
          params: { ...input, manifest_path: manifestPath }
        });
        return { ...confirmation, action_params_digest: digest, digest_alg: 'sha256' };
      }
      return {
        request_id: `pending-${Date.now()}`,
        confirm_scope: { action: 'merge', action_params_digest: digest },
        action_params_digest: digest,
        digest_alg: 'sha256',
        confirm_expires_in_ms: 15 * 60 * 1000
      };
    }
  }

  switch (toolName) {
    case 'github.open_pr':
      return await runGh([
        'pr',
        'create',
        ...(readStringValue(input, 'title') ? ['--title', readStringValue(input, 'title') as string] : []),
        ...(readStringValue(input, 'body') ? ['--body', readStringValue(input, 'body') as string] : ['--body', '']),
        ...(readStringValue(input, 'base') ? ['--base', readStringValue(input, 'base') as string] : []),
        ...(readStringValue(input, 'head') ? ['--head', readStringValue(input, 'head') as string] : []),
        ...(readBooleanValue(input, 'draft') ? ['--draft'] : []),
        ...(readStringValue(input, 'repo') ? ['--repo', readStringValue(input, 'repo') as string] : [])
      ]);
    case 'github.comment':
      return await runGh([
        'issue',
        'comment',
        String(requireNumber(readNumberValue(input, 'issue_number', 'issueNumber'), 'issue_number')),
        ...(readStringValue(input, 'body') ? ['--body', readStringValue(input, 'body') as string] : []),
        ...(readStringValue(input, 'repo') ? ['--repo', readStringValue(input, 'repo') as string] : [])
      ]);
    case 'github.review':
      return await runGh([
        'pr',
        'review',
        String(requireNumber(readNumberValue(input, 'pull_number', 'pullNumber'), 'pull_number')),
        ...(readStringValue(input, 'event') === 'APPROVE' ? ['--approve'] : []),
        ...(readStringValue(input, 'event') === 'REQUEST_CHANGES' ? ['--request-changes'] : []),
        ...(readStringValue(input, 'event') === 'COMMENT' ? ['--comment'] : []),
        ...(readStringValue(input, 'body') ? ['--body', readStringValue(input, 'body') as string] : []),
        ...(readStringValue(input, 'repo') ? ['--repo', readStringValue(input, 'repo') as string] : [])
      ]);
    case 'github.get_checks': {
      const pullNumber = requireNumber(readNumberValue(input, 'pull_number', 'pullNumber'), 'pull_number');
      const result = await runGh([
        'pr',
        'view',
        String(pullNumber),
        ...(readStringValue(input, 'repo') ? ['--repo', readStringValue(input, 'repo') as string] : []),
        '--json',
        'statusCheckRollup'
      ]);
      return safeJsonParse(result.stdout) ?? result;
    }
    case 'github.merge': {
      const mergeNumber = requireNumber(readNumberValue(input, 'pull_number', 'pullNumber'), 'pull_number');
      return await runGh([
        'pr',
        'merge',
        String(mergeNumber),
        ...(readStringValue(input, 'method') === 'squash'
          ? ['--squash']
          : readStringValue(input, 'method') === 'rebase'
            ? ['--rebase']
            : ['--merge']),
        ...(readBooleanValue(input, 'delete_branch', 'deleteBranch') ? ['--delete-branch'] : []),
        ...(readStringValue(input, 'repo') ? ['--repo', readStringValue(input, 'repo') as string] : [])
      ]);
    }
    default:
      throw new Error(`Unsupported GitHub tool: ${toolName}`);
  }
}

async function callControlEndpoint(
  manifestPath: string,
  endpoint: string,
  payload: Record<string, unknown> | null
): Promise<Record<string, unknown>> {
  const runDir = dirname(manifestPath);
  const endpointPath = resolve(runDir, 'control_endpoint.json');
  const raw = await readFile(endpointPath, 'utf8');
  const endpointInfo = JSON.parse(raw) as { base_url: string; token_path: string };
  const tokenRaw = await readFile(endpointInfo.token_path, 'utf8');
  const parsedToken = safeJsonParse(tokenRaw);
  const tokenValue =
    parsedToken && typeof parsedToken === 'object' && !Array.isArray(parsedToken)
      ? (parsedToken as Record<string, unknown>).token
      : null;
  const token =
    typeof tokenValue === 'string' && tokenValue.trim().length > 0
      ? tokenValue.trim()
      : tokenRaw.trim();
  if (!token) {
    throw new Error('control auth token missing');
  }
  const url = new URL(endpoint, endpointInfo.base_url);
  const res = await fetch(url.toString(), {
    method: payload ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`control endpoint error: ${res.status} ${message}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

async function runGh(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('gh', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => reject(error));
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
      } else {
        reject(new Error(stderr.trim() || `gh exited with code ${code}`));
      }
    });
  });
}

async function runJsonRpcServer(handler: (request: McpRequest) => Promise<unknown>): Promise<void> {
  let buffer = Buffer.alloc(0);
  let expectedLength: number | null = null;

  process.stdin.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
    processBuffer();
  });

  process.stdin.on('end', () => {
    process.exitCode = 0;
  });

  async function processBuffer() {
    while (buffer.length > 0) {
      if (expectedLength !== null) {
        if (buffer.length < expectedLength) {
          return;
        }
        const body = buffer.slice(0, expectedLength);
        buffer = buffer.slice(expectedLength);
        expectedLength = null;
        await handleMessage(body.toString('utf8'));
        continue;
      }

      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return;
      }
      const header = buffer.slice(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }
      expectedLength = Number(match[1]);
      buffer = buffer.slice(headerEnd + 4);
    }
  }

  async function handleMessage(raw: string) {
    let request: McpRequest;
    try {
      request = JSON.parse(raw) as McpRequest;
    } catch (error) {
      logger.error(`Failed to parse MCP message: ${(error as Error)?.message ?? error}`);
      return;
    }
    if (typeof request.method !== 'string') {
      return;
    }
    const id = request.id ?? null;
    try {
      const result = await handler(request);
      if (id !== null && typeof id !== 'undefined') {
        sendResponse({ jsonrpc: '2.0', id, result });
      }
    } catch (error) {
      if (id !== null && typeof id !== 'undefined') {
        sendResponse({
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: (error as Error)?.message ?? String(error) }
        });
      }
    }
  }
}

function sendResponse(response: McpResponse): void {
  const payload = Buffer.from(JSON.stringify(response), 'utf8');
  const header = Buffer.from(`Content-Length: ${payload.length}\r\n\r\n`, 'utf8');
  process.stdout.write(Buffer.concat([header, payload]));
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function collectOutput(child: ReturnType<typeof spawn>): Promise<{ stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  await new Promise<void>((resolvePromise, reject) => {
    child.once('error', (error) => reject(error));
    child.once('exit', () => resolvePromise());
  });
  return { stdout, stderr };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumberValue(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function readBooleanValue(record: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

function readStringMap(record: Record<string, unknown>, key: string): Record<string, string> | undefined {
  const raw = record[key];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const entries: Record<string, string> = {};
  for (const [entryKey, entryValue] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof entryValue === 'string') {
      entries[entryKey] = entryValue;
    }
  }
  return Object.keys(entries).length > 0 ? entries : undefined;
}

function requireString(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`${field} is required`);
  }
  return value;
}

function requireNumber(value: number | undefined, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} is required`);
  }
  return value;
}
