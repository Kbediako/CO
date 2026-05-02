import process from 'node:process';
import { spawn } from 'node:child_process';

import { fingerprintAuthProvenanceValue } from './authProvenanceFingerprint.js';
import { resolveCodexCliBin } from './codexCli.js';

export interface CloudPreflightIssue {
  code:
    | 'missing_environment'
    | 'environment_not_found'
    | 'environment_unavailable'
    | 'codex_unavailable'
    | 'branch_missing'
    | 'git_unavailable'
    | 'pipeline_resolution_failed';
  message: string;
}

export interface CloudPreflightResult {
  ok: boolean;
  issues: CloudPreflightIssue[];
  details: {
    codexBin: string;
    environmentId: string | null;
    branch: string | null;
    authProvenance?: CloudPreflightAuthProvenance;
  };
}

export interface CloudPreflightAuthProvenance {
  providerKind: 'codex_cloud';
  activeProfileFingerprint: string | null;
  activeAccountFingerprint: string | null;
  cloudEnvId: string | null;
  cloudBranch: string | null;
  credentialSource: string | null;
  authFreshness: 'env_credential_present' | 'credential_source_unknown';
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function formatCommandSpawnError(error: unknown): string {
  if (error instanceof Error) {
    const errno = error as NodeJS.ErrnoException;
    const code = typeof errno.code === 'string' ? errno.code : null;
    if (code && !error.message.includes(code)) {
      return `${code}: ${error.message}`;
    }
    return error.message;
  }
  return String(error);
}

export interface CloudPreflightRequest {
  repoRoot: string;
  codexBin: string;
  environmentId: string | null;
  branch: string | null;
  env?: NodeJS.ProcessEnv;
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      resolve({ exitCode: 1, stdout: '', stderr: formatCommandSpawnError(error) });
      return;
    }
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 4000).unref();
      resolve({
        exitCode: 124,
        stdout,
        stderr: `${stderr}\nTimed out after ${Math.round(timeoutMs / 1000)}s.`.trim()
      });
    }, timeoutMs);
    timer.unref();

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode: 1, stdout, stderr: `${stderr}\n${formatCommandSpawnError(error)}`.trim() });
    });
    child.once('close', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode: typeof code === 'number' ? code : 1, stdout, stderr });
    });
  });
}

function normalizeBranch(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/^refs\/heads\//u, '');
}

function normalizeCloudPreflightRequestValue(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readCloudPreflightCommandOutput(result: CommandResult): string {
  const output = [result.stderr, result.stdout]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return output || 'no output';
}

function readCloudPreflightErrorOutput(result: CommandResult): string {
  const output = result.stderr.trim().replace(/\s+/gu, ' ');
  return output || 'no output';
}

function compactCloudPreflightOutput(output: string): string {
  return output.length > 500 ? `${output.slice(0, 497)}...` : output;
}

function readCloudPreflightQuotedValueEnd(input: string, start: number, quote: string): number {
  let escaped = false;
  for (let index = start + 1; index < input.length; index += 1) {
    const char = input[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === quote) {
      return index + 1;
    }
  }
  return input.length;
}

function isCloudPreflightEscapedQuoteBoundary(
  input: string,
  slashIndex: number,
  quote: string
): boolean {
  if (input[slashIndex] !== '\\' || input[slashIndex + 1] !== quote) {
    return false;
  }
  let backslashCount = 0;
  for (let index = slashIndex; index >= 0 && input[index] === '\\'; index -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function readCloudPreflightEscapedQuotedBalancedValueEnd(
  input: string,
  start: number,
  open: string,
  close: string,
  quote: string
): number {
  let depth = 0;
  let quoted = false;
  for (let index = start; index < input.length; index += 1) {
    if (isCloudPreflightEscapedQuoteBoundary(input, index, quote)) {
      quoted = !quoted;
      index += 1;
      continue;
    }
    if (quoted) {
      continue;
    }
    if (input[index] === open) {
      depth += 1;
      continue;
    }
    if (input[index] === close) {
      depth -= 1;
      if (depth <= 0) {
        return isCloudPreflightEscapedQuoteBoundary(input, index + 1, quote)
          ? index + 3
          : index + 1;
      }
    }
  }
  return input.length;
}

function readCloudPreflightEscapedQuotedValueEnd(input: string, start: number, quote: string): number {
  let valueStart = start + 2;
  while (/\s/u.test(input[valueStart] ?? '')) {
    valueStart += 1;
  }
  const firstValue = input[valueStart];
  if (firstValue === '{') {
    return readCloudPreflightEscapedQuotedBalancedValueEnd(input, valueStart, '{', '}', quote);
  }
  if (firstValue === '[') {
    return readCloudPreflightEscapedQuotedBalancedValueEnd(input, valueStart, '[', ']', quote);
  }
  for (let index = start + 2; index < input.length - 1; index += 1) {
    if (!isCloudPreflightEscapedQuoteBoundary(input, index, quote)) {
      continue;
    }
    return index + 2;
  }
  return input.length;
}

function readCloudPreflightBalancedValueEnd(
  input: string,
  start: number,
  open: string,
  close: string
): number {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (let index = start; index < input.length; index += 1) {
    const char = input[index];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === open) {
      depth += 1;
      continue;
    }
    if (char === close) {
      depth -= 1;
      if (depth <= 0) {
        return index + 1;
      }
    }
  }
  return input.length;
}

function readCloudPreflightAgentIdentityValueEnd(input: string, start: number): number {
  const first = input[start];
  const escapedQuote = input[start + 1];
  if (first === '\\' && (escapedQuote === '"' || escapedQuote === "'")) {
    return readCloudPreflightEscapedQuotedValueEnd(input, start, escapedQuote);
  }
  if (first === '"' || first === "'") {
    return readCloudPreflightQuotedValueEnd(input, start, first);
  }
  if (first === '{') {
    return readCloudPreflightBalancedValueEnd(input, start, '{', '}');
  }
  if (first === '[') {
    return readCloudPreflightBalancedValueEnd(input, start, '[', ']');
  }
  let index = start;
  while (index < input.length && !/[\s,;}]/u.test(input[index] ?? '')) {
    index += 1;
  }
  return index;
}

function redactCloudPreflightAgentIdentityAssignments(output: string): string {
  const assignmentPattern =
    /(["']?(?:CODEX_AGENT_IDENTITY|agent[_-]?identity|agent\s+identity)["']?)\s*[:=]\s*/giu;
  let result = '';
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = assignmentPattern.exec(output)) !== null) {
    const label = match[1] ?? '';
    const valueStart = assignmentPattern.lastIndex;
    const valueEnd = readCloudPreflightAgentIdentityValueEnd(output, valueStart);
    result += output.slice(cursor, match.index);
    const quotedLabel = label.startsWith('"') || label.startsWith("'");
    result += quotedLabel ? `${label}:"<redacted>"` : `${label}=<redacted>`;
    cursor = valueEnd;
    assignmentPattern.lastIndex = valueEnd;
  }
  return result + output.slice(cursor);
}

function isCloudPreflightAlreadyRedactedAssignment(match: string): boolean {
  return /[:=]\s*(?:"<redacted>"|'<redacted>'|<redacted>)(?:[:}\]])?$/u.test(match);
}

function redactCloudPreflightOutput(output: string): string {
  return redactCloudPreflightAgentIdentityAssignments(output)
    .replace(/\b(?:authorization|bearer)\s*[:=]\s*bearer\s+[^\s,;]+/giu, 'authorization: Bearer <redacted>')
    .replace(/\bbearer\s+[A-Za-z0-9._~+/-]{10,}/giu, 'Bearer <redacted>')
    .replace(/\b(?:sk|sess|eyJ)[A-Za-z0-9._~+/-]{12,}/gu, '<redacted-token>')
    .replace(
      /\b(?:CODEX|OPENAI|CHATGPT|GITHUB|GH)_[A-Z0-9_]*(?:API_KEY|AUTH_TOKEN|ACCESS_TOKEN|REFRESH_TOKEN|TOKEN|SECRET|PASSWORD|AGENT_IDENTITY)\s*[:=]\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s,;]+)/gu,
      (match) =>
        isCloudPreflightAlreadyRedactedAssignment(match)
          ? match
          : `${match.split(/[:=]/u)[0] ?? 'secret'}=<redacted>`
    )
    .replace(
      /\b(?:api[_ -]?key|auth[_ -]?token|access[_ -]?token|refresh[_ -]?token|bearer[_ -]?token|password|secret|credential)\s*[:=]\s*[^\s,;]+/giu,
      (match) => `${match.split(/[:=]/u)[0]?.trim() ?? 'secret'}=<redacted>`
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '<redacted-email>');
}

function compactCloudPreflightCommandOutput(result: CommandResult): string {
  return compactCloudPreflightOutput(redactCloudPreflightOutput(readCloudPreflightCommandOutput(result)));
}

function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function isEnvironmentNotFoundSignal(signal: string, environmentId: string): boolean {
  const normalized = signal.toLowerCase();
  const normalizedEnvironmentId = environmentId.toLowerCase();
  if (normalized.includes('environment_not_found')) {
    return true;
  }
  const escapedEnvironmentId = escapeRegExpLiteral(normalizedEnvironmentId);
  return new RegExp(
    `\\benvironment\\s+(?:(["'])${escapedEnvironmentId}\\1|${escapedEnvironmentId})\\s+not\\s+found\\b`,
    'u'
  ).test(normalized);
}

function maskCloudPreflightEnvironmentIdentifierValues(signal: string): string {
  return signal
    .toLowerCase()
    .replace(/\benvironment\s+(?:['"][^'"]+['"]|[^\s'"]+)\s+not\s+found\b/gu, 'environment <env-id> not found')
    .replace(/\bcodex_cloud_env_id\s+(?:['"][^'"]+['"]|[^\s'"]+)/gu, 'codex_cloud_env_id <env-id>')
    .replace(/\bcodex cloud env id\s+(?:['"][^'"]+['"]|[^\s'"]+)/gu, 'codex cloud env id <env-id>');
}

function hasWrappedEnvironmentProbeUnavailableSignal(signal: string): boolean {
  const normalized = maskCloudPreflightEnvironmentIdentifierValues(signal);
  return (
    /\b(?:missing[_ -]github[_ -]connector[_ -]link|github connection not found|github connector not found)\b/u.test(normalized) ||
    /\b(?:cloud denial|cloud-denial|cloud_denial|cloud denied|not allowed in cloud|cloud access denied|cloud execution denied)\b/u.test(normalized) ||
    /\b(?:forbidden|unauthorized|not logged in|login required|active account|active profile|account mismatch|profile mismatch|invalid token|expired token|token expired|missing token|token missing|api key|auth token|access token|refresh token|bearer token)\b/u.test(normalized) ||
    /\b(?:rate limit|rate-limit|rate_limited|rate_limit_exceeded|quota|too many requests|usage limit|usage_limit_reached)\b/u.test(normalized) ||
    /\b(?:enotfound|econn|network|timed out|timeout|502|503|504|bad gateway|service unavailable|gateway timeout)\b/u.test(normalized)
  );
}

function buildEnvironmentProbeIssue(environmentId: string, result: CommandResult): CloudPreflightIssue {
  const fullDetail = readCloudPreflightCommandOutput(result);
  const detail = compactCloudPreflightCommandOutput(result);
  if (
    isEnvironmentNotFoundSignal(fullDetail, environmentId) &&
    !hasWrappedEnvironmentProbeUnavailableSignal(fullDetail)
  ) {
    return {
      code: 'environment_not_found',
      message:
        `Configured CODEX_CLOUD_ENV_ID '${environmentId}' is not visible to codex cloud before codex cloud exec: ${detail}`
    };
  }
  return {
    code: 'environment_unavailable',
    message:
      `Configured CODEX_CLOUD_ENV_ID '${environmentId}' could not be verified by codex cloud before codex cloud exec: ${detail}`
  };
}

function tryParseCloudListJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function readCloudListTasks(payload: unknown): unknown[] | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  return Array.isArray(record.tasks) ? record.tasks : null;
}

function readCloudListTaskEnvironmentIdentities(task: unknown): string[] {
  if (!task || typeof task !== 'object') {
    return [];
  }
  const record = task as Record<string, unknown>;
  const identities: string[] = [];
  for (const key of ['environment_id', 'environmentId', 'cloud_environment_id', 'cloudEnvId']) {
    const value = normalizeCloudPreflightRequestValue(record[key] as string | null | undefined);
    if (value) {
      identities.push(value);
    }
  }
  for (const key of ['environment_label', 'environmentLabel']) {
    const value = normalizeCloudPreflightRequestValue(record[key] as string | null | undefined);
    if (value) {
      identities.push(value);
    }
  }
  const environment = record.environment;
  if (environment && typeof environment === 'object') {
    const environmentRecord = environment as Record<string, unknown>;
    for (const key of ['id', 'environment_id', 'environmentId', 'cloud_environment_id', 'cloudEnvId']) {
      const value = normalizeCloudPreflightRequestValue(environmentRecord[key] as string | null | undefined);
      if (value) {
        identities.push(value);
      }
    }
    for (const key of ['label', 'environment_label', 'environmentLabel']) {
      const value = normalizeCloudPreflightRequestValue(environmentRecord[key] as string | null | undefined);
      if (value) {
        identities.push(value);
      }
    }
  }
  return [...new Set(identities)];
}

function normalizeCloudEnvironmentIdentity(value: string): string {
  return value.trim().toLowerCase();
}

function buildEnvironmentProbePayloadIssue(
  environmentId: string,
  detail: string
): CloudPreflightIssue {
  const safeDetail = compactCloudPreflightOutput(redactCloudPreflightOutput(detail));
  return {
    code: 'environment_unavailable',
    message:
      `Configured CODEX_CLOUD_ENV_ID '${environmentId}' could not be verified by codex cloud before codex cloud exec: ${safeDetail}`
  };
}

function inspectSuccessfulEnvironmentProbe(
  environmentId: string,
  result: CommandResult
): CloudPreflightIssue | null {
  const stderrDetail = readCloudPreflightErrorOutput(result);
  if (isEnvironmentNotFoundSignal(stderrDetail, environmentId)) {
    return buildEnvironmentProbeIssue(environmentId, {
      ...result,
      stdout: ''
    });
  }

  const payload = tryParseCloudListJson(result.stdout);
  const tasks = readCloudListTasks(payload);
  if (!tasks) {
    return buildEnvironmentProbePayloadIssue(
      environmentId,
      `unexpected codex cloud list JSON payload: ${compactCloudPreflightOutput(result.stdout.trim() || 'no output')}`
    );
  }

  const taskEnvironmentIdentities = tasks.map((task) => readCloudListTaskEnvironmentIdentities(task));
  const normalizedEnvironmentId = normalizeCloudEnvironmentIdentity(environmentId);
  if (taskEnvironmentIdentities.some((identities) => identities.length === 0)) {
    return buildEnvironmentProbePayloadIssue(
      environmentId,
      'codex cloud list returned task rows without an environment identity'
    );
  }

  const mismatchedEnvironmentIds = taskEnvironmentIdentities
    .filter((identities) =>
      !identities.some((identity) => normalizeCloudEnvironmentIdentity(identity) === normalizedEnvironmentId)
    )
    .flat();
  if (mismatchedEnvironmentIds.length > 0) {
    return buildEnvironmentProbePayloadIssue(
      environmentId,
      `codex cloud list returned task rows for a different environment identity: ${[
        ...new Set(mismatchedEnvironmentIds)
      ].join(', ')}`
    );
  }

  return null;
}

function readFirstCloudPreflightEnvValue(
  env: NodeJS.ProcessEnv | undefined,
  keys: string[]
): string | null {
  if (!env) {
    return null;
  }
  for (const key of keys) {
    const value = normalizeCloudPreflightRequestValue(env[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function readFirstCloudPreflightCredentialSource(env: NodeJS.ProcessEnv | undefined): string | null {
  if (!env) {
    return null;
  }
  for (const key of [
    'CODEX_API_KEY',
    'OPENAI_API_KEY',
    'CODEX_AGENT_IDENTITY',
    'CODEX_AUTH_TOKEN',
    'OPENAI_AUTH_TOKEN',
    'CHATGPT_AUTH_TOKEN'
  ]) {
    if (normalizeCloudPreflightRequestValue(env[key])) {
      return `env:${key}`;
    }
  }
  return null;
}

export function buildCloudPreflightAuthProvenance(params: {
  env?: NodeJS.ProcessEnv;
  environmentId: string | null;
  branch: string | null;
}): CloudPreflightAuthProvenance {
  const credentialSource = readFirstCloudPreflightCredentialSource(params.env);
  const profile = readFirstCloudPreflightEnvValue(params.env, [
    'CODEX_AUTH_PROFILE',
    'CODEX_PROFILE',
    'OPENAI_PROFILE',
    'CHATGPT_AUTH_PROFILE',
    'CHATGPT_PROFILE'
  ]);
  const account = readFirstCloudPreflightEnvValue(params.env, [
    'CODEX_ACCOUNT_ID',
    'CODEX_ACCOUNT',
    'CODEX_ACCOUNT_EMAIL',
    'OPENAI_ACCOUNT_ID',
    'OPENAI_ORG_ID',
    'CHATGPT_ACCOUNT_ID',
    'CHATGPT_ACCOUNT',
    'CHATGPT_ACCOUNT_EMAIL'
  ]);
  return {
    providerKind: 'codex_cloud',
    activeProfileFingerprint: fingerprintAuthProvenanceValue(profile, params.env),
    activeAccountFingerprint: fingerprintAuthProvenanceValue(account, params.env),
    cloudEnvId: params.environmentId,
    cloudBranch: params.branch,
    credentialSource,
    authFreshness: credentialSource ? 'env_credential_present' : 'credential_source_unknown'
  };
}

export function buildCloudPreflightRequest(params: {
  repoRoot: string;
  environmentId: string | null;
  env?: NodeJS.ProcessEnv;
  branch?: string | null;
}): CloudPreflightRequest {
  const env = params.env ?? process.env;
  const branch =
    normalizeCloudPreflightRequestValue(params.branch)
    ?? normalizeCloudPreflightRequestValue(env.CODEX_CLOUD_BRANCH);

  return {
    repoRoot: params.repoRoot,
    codexBin: resolveCodexCliBin(env),
    environmentId: params.environmentId,
    branch,
    env
  };
}

export async function runCloudPreflight(params: CloudPreflightRequest): Promise<CloudPreflightResult> {
  const issues: CloudPreflightIssue[] = [];
  const branch = normalizeBranch(params.branch);

  if (!params.environmentId) {
    issues.push({
      code: 'missing_environment',
      message: 'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId).'
    });
  }

  const codexCheck = await runCommand(params.codexBin, ['--version'], {
    cwd: params.repoRoot,
    env: params.env
  });
  if (codexCheck.exitCode !== 0) {
    issues.push({
      code: 'codex_unavailable',
      message: `Codex CLI is unavailable (${params.codexBin} --version failed).`
    });
  }

  if (params.environmentId && codexCheck.exitCode === 0) {
    const environmentCheck = await runCommand(
      params.codexBin,
      ['cloud', 'list', '--env', params.environmentId, '--limit', '1', '--json'],
      {
        cwd: params.repoRoot,
        env: params.env
      }
    );
    if (environmentCheck.exitCode !== 0) {
      issues.push(buildEnvironmentProbeIssue(params.environmentId, environmentCheck));
    } else {
      const environmentProbeIssue = inspectSuccessfulEnvironmentProbe(params.environmentId, environmentCheck);
      if (environmentProbeIssue) {
        issues.push(environmentProbeIssue);
      }
    }
  }

  if (branch) {
    const gitCheck = await runCommand('git', ['--version'], { cwd: params.repoRoot, env: params.env });
    if (gitCheck.exitCode !== 0) {
      issues.push({ code: 'git_unavailable', message: 'git is unavailable (required for cloud preflight).' });
    } else {
      const branchCheck = await runCommand(
        'git',
        ['ls-remote', '--exit-code', '--heads', 'origin', branch],
        { cwd: params.repoRoot, env: params.env }
      );
      if (branchCheck.exitCode !== 0) {
        issues.push({
          code: 'branch_missing',
          message: `Cloud branch '${branch}' was not found on origin. Push it first or set CODEX_CLOUD_BRANCH to an existing remote branch.`
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    details: {
      codexBin: params.codexBin,
      environmentId: params.environmentId,
      branch,
      authProvenance: buildCloudPreflightAuthProvenance({
        env: params.env,
        environmentId: params.environmentId,
        branch
      })
    }
  };
}
