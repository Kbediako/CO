import { spawn } from 'node:child_process';
import process from 'node:process';

import { resolveCodexCliBin } from './utils/codexCli.js';

export interface McpEnableOptions {
  apply?: boolean;
  serverNames?: string[];
  env?: NodeJS.ProcessEnv;
  commandRunner?: McpCommandRunner;
}

export interface McpEnableAction {
  name: string;
  status:
    | 'planned'
    | 'enabled'
    | 'already_enabled'
    | 'missing'
    | 'unsupported'
    | 'failed';
  reason?: string;
  command_line?: string;
}

export interface McpEnableResult {
  status: 'planned' | 'applied';
  codex_bin: string;
  targets: string[];
  actions: McpEnableAction[];
}

interface McpCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

type McpCommandRunner = (request: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
}) => Promise<McpCommandResult>;

const DEFAULT_MCP_COMMAND_TIMEOUT_MS = 30_000;

interface McpServerRecord {
  name?: string;
  enabled?: boolean;
  startup_timeout_sec?: number | null;
  tool_timeout_sec?: number | null;
  transport?: {
    type?: string;
    command?: string | null;
    args?: unknown;
    env?: unknown;
    env_vars?: unknown;
    cwd?: string | null;
    url?: string | null;
    bearer_token_env_var?: string | null;
    http_headers?: unknown;
    env_http_headers?: unknown;
  };
}

type ParsedMcpServer = {
  name: string;
  enabled: boolean;
  startupTimeoutSec: number | null;
  toolTimeoutSec: number | null;
  transport: McpServerRecord['transport'];
};

export async function runMcpEnable(options: McpEnableOptions = {}): Promise<McpEnableResult> {
  const env = options.env ?? process.env;
  const codexBin = resolveCodexCliBin(env);
  const commandRunner = options.commandRunner ?? defaultMcpCommandRunner;

  const listResult = await commandRunner({
    command: codexBin,
    args: ['mcp', 'list', '--json'],
    env
  });
  if (listResult.exitCode !== 0) {
    throw new Error(`codex mcp list failed: ${compactError(listResult.stderr, listResult.stdout)}`);
  }

  let servers: ParsedMcpServer[];
  try {
    servers = parseMcpServerList(listResult.stdout);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`codex mcp list --json returned invalid output: ${reason}`);
  }
  const requestedNames = dedupeNames(options.serverNames ?? []);
  const targetNames =
    requestedNames.length > 0
      ? requestedNames
      : servers
          .filter((server) => !server.enabled)
          .map((server) => server.name);

  const actions: McpEnableAction[] = [];
  for (const targetName of targetNames) {
    const server = servers.find((item) => item.name === targetName);
    if (!server) {
      actions.push({
        name: targetName,
        status: 'missing',
        reason: 'MCP server not found in codex mcp list output.'
      });
      continue;
    }
    if (server.enabled) {
      actions.push({ name: targetName, status: 'already_enabled' });
      continue;
    }

    const enablePlan = buildEnablePlan(server);
    if (!enablePlan.ok) {
      actions.push({
        name: targetName,
        status: 'unsupported',
        reason: enablePlan.reason
      });
      continue;
    }

    if (!options.apply) {
      const displayArgs = redactArgsForDisplay(enablePlan.args);
      actions.push({
        name: targetName,
        status: 'planned',
        command_line: `${shellEscape(codexBin)} ${displayArgs.map(shellEscape).join(' ')}`
      });
      continue;
    }

    const applyResult = await commandRunner({
      command: codexBin,
      args: enablePlan.args,
      env
    });
    if (applyResult.exitCode !== 0) {
      actions.push({
        name: targetName,
        status: 'failed',
        reason: compactError(applyResult.stderr, applyResult.stdout)
      });
      continue;
    }
    actions.push({ name: targetName, status: 'enabled' });
  }

  return {
    status: options.apply ? 'applied' : 'planned',
    codex_bin: codexBin,
    targets: targetNames,
    actions
  };
}

export function formatMcpEnableSummary(result: McpEnableResult): string[] {
  const lines: string[] = [];
  lines.push(`MCP enable: ${result.status}`);
  lines.push(`- Codex bin: ${result.codex_bin}`);
  lines.push(`- Targets: ${result.targets.length > 0 ? result.targets.join(', ') : '<none>'}`);

  const byStatus = summarizeByStatus(result.actions);
  lines.push(
    `- Results: enabled=${byStatus.enabled}, planned=${byStatus.planned}, already_enabled=${byStatus.already_enabled}, missing=${byStatus.missing}, unsupported=${byStatus.unsupported}, failed=${byStatus.failed}`
  );

  for (const action of result.actions) {
    if (action.status === 'planned' && action.command_line) {
      lines.push(`  - ${action.name}: planned -> ${action.command_line}`);
      continue;
    }
    if (action.reason) {
      lines.push(`  - ${action.name}: ${action.status} (${action.reason})`);
      continue;
    }
    lines.push(`  - ${action.name}: ${action.status}`);
  }

  if (result.status === 'planned' && byStatus.planned > 0) {
    lines.push('Run with --yes to apply.');
  }

  return lines;
}

function parseMcpServerList(raw: string): ParsedMcpServer[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('invalid JSON payload.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('expected top-level JSON array.');
  }
  const servers: ParsedMcpServer[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as McpServerRecord;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    if (!name) {
      continue;
    }
    servers.push({
      name,
      enabled: Boolean(record.enabled),
      startupTimeoutSec:
        typeof record.startup_timeout_sec === 'number' && Number.isFinite(record.startup_timeout_sec)
          ? record.startup_timeout_sec
          : null,
      toolTimeoutSec:
        typeof record.tool_timeout_sec === 'number' && Number.isFinite(record.tool_timeout_sec)
          ? record.tool_timeout_sec
          : null,
      transport: record.transport ?? undefined
    });
  }
  return servers;
}

function buildEnablePlan(server: {
  name: string;
  startupTimeoutSec: number | null;
  toolTimeoutSec: number | null;
  transport: McpServerRecord['transport'];
}): { ok: true; args: string[] } | { ok: false; reason: string } {
  if (server.startupTimeoutSec !== null || server.toolTimeoutSec !== null) {
    return {
      ok: false,
      reason:
        'Server defines startup/tool timeout settings; codex mcp add cannot preserve those fields. Enable this server manually.'
    };
  }
  const transport = server.transport;
  if (!transport || typeof transport !== 'object') {
    return { ok: false, reason: 'Server transport details are missing.' };
  }
  const type = typeof transport.type === 'string' ? transport.type.trim() : '';
  if (type === 'stdio') {
    const command = typeof transport.command === 'string' ? transport.command.trim() : '';
    if (!command) {
      return { ok: false, reason: 'stdio transport is missing command.' };
    }
    const hasUnsupportedStdioFields =
      Array.isArray(transport.env_vars) && transport.env_vars.length > 0
      || hasRecordEntries(transport.env_vars)
      || (typeof transport.cwd === 'string' && transport.cwd.trim().length > 0);
    if (hasUnsupportedStdioFields) {
      return {
        ok: false,
        reason:
          'stdio env_vars/cwd settings are configured; codex mcp add cannot preserve these fields. Enable this server manually.'
      };
    }
    const args: string[] = ['mcp', 'add', server.name];
    const envObject = normalizeStringRecord(transport.env);
    for (const [key, value] of Object.entries(envObject)) {
      args.push('--env', `${key}=${value}`);
    }
    args.push('--', command, ...normalizeStringArray(transport.args));
    return { ok: true, args };
  }
  if (type === 'streamable_http') {
    const url = typeof transport.url === 'string' ? transport.url.trim() : '';
    if (!url) {
      return { ok: false, reason: 'streamable_http transport is missing url.' };
    }
    const args: string[] = ['mcp', 'add', server.name, '--url', url];
    const bearerTokenEnvVar =
      typeof transport.bearer_token_env_var === 'string' ? transport.bearer_token_env_var.trim() : '';
    if (bearerTokenEnvVar) {
      args.push('--bearer-token-env-var', bearerTokenEnvVar);
    }
    const hasUnsupportedHeaders =
      hasRecordEntries(transport.http_headers)
      || hasRecordEntries(transport.env_http_headers)
      || (Array.isArray(transport.http_headers) && transport.http_headers.length > 0)
      || (Array.isArray(transport.env_http_headers) && transport.env_http_headers.length > 0);
    if (hasUnsupportedHeaders) {
      return {
        ok: false,
        reason:
          'streamable_http headers/env_http_headers are configured; codex mcp add does not expose equivalent flags. Enable this server manually.'
      };
    }
    return { ok: true, args };
  }
  return { ok: false, reason: `Unsupported transport type "${type || 'unknown'}".` };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const record: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry !== 'string') {
      continue;
    }
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      continue;
    }
    record[normalizedKey] = entry;
  }
  return record;
}

function hasRecordEntries(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.keys(value as Record<string, unknown>).length > 0;
}

function dedupeNames(items: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of items) {
    const value = item.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function summarizeByStatus(actions: McpEnableAction[]): Record<McpEnableAction['status'], number> {
  return actions.reduce<Record<McpEnableAction['status'], number>>(
    (acc, action) => {
      acc[action.status] += 1;
      return acc;
    },
    {
      planned: 0,
      enabled: 0,
      already_enabled: 0,
      missing: 0,
      unsupported: 0,
      failed: 0
    }
  );
}

async function defaultMcpCommandRunner(request: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
}): Promise<McpCommandResult> {
  return await new Promise<McpCommandResult>((resolve) => {
    const child = spawn(request.command, request.args, {
      env: request.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const timeoutMs = Math.max(1, request.timeoutMs ?? DEFAULT_MCP_COMMAND_TIMEOUT_MS);
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finalize = (result: McpCommandResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      resolve(result);
    };

    const timeoutHandle = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!settled) {
          child.kill('SIGKILL');
        }
      }, 2_000).unref();
      finalize({
        exitCode: 124,
        stdout,
        stderr: `${stderr}\ncommand timed out after ${timeoutMs}ms`.trim()
      });
    }, timeoutMs);
    timeoutHandle.unref();

    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.once('error', (error) => {
      finalize({
        exitCode: 1,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim()
      });
    });
    child.once('close', (code) => {
      finalize({
        exitCode: typeof code === 'number' ? code : 1,
        stdout,
        stderr
      });
    });
  });
}

function compactError(...values: string[]): string {
  const text = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(' | ');
  return text.length > 0 ? text : 'no stderr/stdout captured';
}

function shellEscape(value: string): string {
  if (/^[A-Za-z0-9_./:-]+$/u.test(value)) {
    return value;
  }
  return `'${value.replace(/'/gu, `'\\''`)}'`;
}

function redactArgsForDisplay(args: string[]): string[] {
  const redacted = [...args];
  for (let index = 0; index < redacted.length - 1; index += 1) {
    if (redacted[index] !== '--env') {
      continue;
    }
    const envPair = redacted[index + 1];
    if (!envPair) {
      continue;
    }
    const delimiter = envPair.indexOf('=');
    if (delimiter <= 0) {
      redacted[index + 1] = '<redacted>';
      continue;
    }
    const key = envPair.slice(0, delimiter);
    redacted[index + 1] = `${key}=<redacted>`;
  }

  for (let index = 0; index < redacted.length; index += 1) {
    const token = redacted[index] ?? '';
    const longWithEquals = token.match(/^--([^=\s]+)=(.+)$/u);
    if (
      longWithEquals
      && (looksSensitiveFlag(longWithEquals[1] ?? '') || looksSensitiveValue(longWithEquals[2] ?? ''))
    ) {
      redacted[index] = `--${longWithEquals[1]}=<redacted>`;
      continue;
    }

    const longFlag = token.match(/^--([A-Za-z0-9_.-]+)$/u);
    if (!longFlag) {
      continue;
    }
    const next = redacted[index + 1];
    if (!next || next.startsWith('-')) {
      continue;
    }
    if (!looksSensitiveFlag(longFlag[1] ?? '') && !looksSensitiveValue(next)) {
      continue;
    }
    redacted[index + 1] = '<redacted>';
  }

  // Command payload after "--" can contain arbitrary user args. Keep only the
  // command token + first argument for operator context, redact the rest.
  const separatorIndex = redacted.indexOf('--');
  if (separatorIndex >= 0) {
    const commandIndex = separatorIndex + 1;
    if (commandIndex < redacted.length && looksSensitiveValue(redacted[commandIndex] ?? '')) {
      redacted[commandIndex] = '<redacted>';
    }
    for (let index = separatorIndex + 2; index < redacted.length; index += 1) {
      redacted[index] = '<redacted>';
    }
  }

  return redacted;
}

function looksSensitiveFlag(flagName: string): boolean {
  const normalized = flagName.toLowerCase();
  return /(api[-_]?key|token|secret|password|passwd|bearer|auth|cookie|credential)/u.test(normalized);
}

function looksSensitiveValue(value: string): boolean {
  const normalized = value.toLowerCase();
  if (/(api[-_]?key|token|secret|password|passwd|bearer|auth|cookie|credential)/u.test(normalized)) {
    return true;
  }
  return /^[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^@\s]+@/iu.test(value);
}
