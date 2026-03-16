import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import process from 'node:process';

import type { McpRequest } from './delegationServerTransport.js';

export const QUESTION_POLL_INTERVAL_MS = 500;
export const MAX_QUESTION_POLL_WAIT_MS = 10_000;

type ExpiryFallback = 'pause' | 'resume' | 'fail';

interface ControlEndpointOptions {
  allowedHosts?: string[];
  allowedRoots?: string[];
  timeoutMs?: number;
}

interface ControlEndpointRetryOptions extends ControlEndpointOptions {
  retryMs?: number;
  retryIntervalMs?: number;
}

export interface DelegationServerQuestionFlowDeps {
  resolveParentManifestPath: (input: Record<string, unknown>, allowedRoots: string[]) => string | null;
  readStringValue: (record: Record<string, unknown>, ...keys: string[]) => string | undefined;
  readNumberValue: (record: Record<string, unknown>, ...keys: string[]) => number | undefined;
  readBooleanValue: (record: Record<string, unknown>, ...keys: string[]) => boolean | undefined;
  requireString: (value: string | undefined, field: string) => string;
  callControlEndpoint: (
    manifestPath: string,
    route: string,
    body: Record<string, unknown> | null,
    headers?: Record<string, string>,
    options?: ControlEndpointOptions
  ) => Promise<Record<string, unknown>>;
  callControlEndpointWithRetry: (
    manifestPath: string,
    route: string,
    body: Record<string, unknown> | null,
    headers?: Record<string, string>,
    options?: ControlEndpointRetryOptions
  ) => Promise<Record<string, unknown>>;
  resolveRunManifestPath: (rawPath: string, allowedRoots?: string[], label?: string) => string;
  isPathWithinRoots: (pathname: string, roots: string[]) => boolean;
  safeJsonParse: (text: string) => unknown | null;
  delay: (ms: number) => Promise<void>;
  defaultDelegationTokenRetryMs: number;
  defaultDelegationTokenRetryIntervalMs: number;
  defaultControlEndpointTimeoutMs: number;
  delegationTokenHeader: string;
  delegationRunHeader: string;
  delegationTokenFile: string;
}

export async function handleDelegationServerQuestionEnqueue(
  input: Record<string, unknown>,
  request: McpRequest,
  allowedRoots: string[],
  allowedHosts: string[],
  expiryFallback: ExpiryFallback,
  deps: DelegationServerQuestionFlowDeps
): Promise<unknown> {
  const parentManifestPath = deps.resolveParentManifestPath(input, allowedRoots);
  if (!parentManifestPath) {
    throw new Error('parent_manifest_path is required');
  }

  const delegationToken = await resolveDelegationTokenValue(
    request,
    allowedRoots,
    {
      retryMs: deps.defaultDelegationTokenRetryMs,
      intervalMs: deps.defaultDelegationTokenRetryIntervalMs
    },
    deps
  );
  const childRunId = process.env.CODEX_ORCHESTRATOR_RUN_ID ?? deps.readStringValue(input, 'from_run_id', 'fromRunId') ?? '';

  if (!delegationToken) {
    throw new Error('delegation_token missing');
  }

  const autoPause = deps.readBooleanValue(input, 'auto_pause', 'autoPause') ?? true;
  const manifestFromEnv = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
  const manifestFromInput = deps.readStringValue(input, 'from_manifest_path', 'fromManifestPath');
  const childManifestPath = manifestFromEnv ?? manifestFromInput;
  const result = await deps.callControlEndpointWithRetry(
    parentManifestPath,
    '/questions/enqueue',
    {
      parent_run_id: deps.readStringValue(input, 'parent_run_id', 'parentRunId') ?? '',
      parent_task_id: deps.readStringValue(input, 'parent_task_id', 'parentTaskId') ?? null,
      from_run_id: childRunId,
      from_manifest_path: childManifestPath ?? null,
      prompt: deps.requireString(deps.readStringValue(input, 'prompt'), 'prompt'),
      urgency: deps.readStringValue(input, 'urgency') ?? 'med',
      expires_in_ms: deps.readNumberValue(input, 'expires_in_ms', 'expiresInMs'),
      auto_pause: autoPause,
      expiry_fallback: expiryFallback
    },
    {
      [deps.delegationTokenHeader]: delegationToken,
      [deps.delegationRunHeader]: childRunId
    },
    {
      allowedHosts,
      allowedRoots,
      retryMs: deps.defaultDelegationTokenRetryMs,
      retryIntervalMs: deps.defaultDelegationTokenRetryIntervalMs
    }
  );

  if (autoPause && manifestFromEnv) {
    const resolvedManifest = deps.resolveRunManifestPath(manifestFromEnv, allowedRoots, 'manifest_path');
    await deps.callControlEndpoint(
      resolvedManifest,
      '/control/action',
      {
        action: 'pause',
        requested_by: 'delegate',
        reason: 'awaiting_question_answer'
      },
      undefined,
      { allowedHosts, allowedRoots }
    );
  }

  return {
    ...result,
    fallback_action: expiryFallback
  };
}

export async function handleDelegationServerQuestionPoll(
  input: Record<string, unknown>,
  request: McpRequest,
  allowedRoots: string[],
  allowedHosts: string[],
  expiryFallback: ExpiryFallback,
  deps: DelegationServerQuestionFlowDeps
): Promise<unknown> {
  const parentManifestPath = deps.resolveParentManifestPath(input, allowedRoots);
  if (!parentManifestPath) {
    throw new Error('parent_manifest_path is required');
  }

  const delegationToken = await resolveDelegationTokenValue(
    request,
    allowedRoots,
    {
      retryMs: deps.defaultDelegationTokenRetryMs,
      intervalMs: deps.defaultDelegationTokenRetryIntervalMs
    },
    deps
  );
  const childRunId = process.env.CODEX_ORCHESTRATOR_RUN_ID ?? deps.readStringValue(input, 'from_run_id', 'fromRunId') ?? '';

  if (!delegationToken) {
    throw new Error('delegation_token missing');
  }

  const questionId = deps.requireString(deps.readStringValue(input, 'question_id', 'questionId'), 'question_id');
  const requestedWaitMs = deps.readNumberValue(input, 'wait_ms', 'waitMs') ?? 0;
  const waitMs = clampQuestionPollWaitMs(requestedWaitMs);
  const deadline = Date.now() + waitMs;
  const maxIterations = waitMs > 0 ? Math.max(1, Math.ceil(waitMs / QUESTION_POLL_INTERVAL_MS)) : 1;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const remainingMs = waitMs > 0 ? Math.max(0, deadline - Date.now()) : null;
    const timeoutMs =
      remainingMs === null ? undefined : Math.max(1, Math.min(deps.defaultControlEndpointTimeoutMs, remainingMs));
    const retryMs =
      remainingMs === null
        ? deps.defaultDelegationTokenRetryMs
        : Math.min(deps.defaultDelegationTokenRetryMs, remainingMs);
    const record = await deps.callControlEndpointWithRetry(
      parentManifestPath,
      `/questions/${questionId}`,
      null,
      {
        [deps.delegationTokenHeader]: delegationToken,
        [deps.delegationRunHeader]: childRunId
      },
      {
        allowedHosts,
        allowedRoots,
        retryMs,
        retryIntervalMs: deps.defaultDelegationTokenRetryIntervalMs,
        ...(timeoutMs !== undefined ? { timeoutMs } : {})
      }
    );
    const status = deps.readStringValue(record, 'status');
    if (status !== 'queued' || waitMs <= 0 || Date.now() >= deadline) {
      const expiresAt = deps.readStringValue(record, 'expires_at', 'expiresAt');
      if (status === 'expired') {
        await applyDelegationQuestionFallback(expiryFallback, allowedHosts, allowedRoots, deps);
      }
      return {
        ...record,
        expired_at: status === 'expired' ? expiresAt ?? null : null,
        fallback_action: status === 'expired' ? expiryFallback : null
      };
    }
    await deps.delay(QUESTION_POLL_INTERVAL_MS);
  }

  const remainingMs = waitMs > 0 ? Math.max(0, deadline - Date.now()) : null;
  const timeoutMs =
    remainingMs === null ? undefined : Math.max(1, Math.min(deps.defaultControlEndpointTimeoutMs, remainingMs));
  const record = await deps.callControlEndpoint(
    parentManifestPath,
    `/questions/${questionId}`,
    null,
    {
      [deps.delegationTokenHeader]: delegationToken,
      [deps.delegationRunHeader]: childRunId
    },
    {
      allowedHosts,
      ...(timeoutMs !== undefined ? { timeoutMs } : {})
    }
  );
  return {
    ...record,
    expired_at: null,
    fallback_action: null
  };
}

export async function resolveDelegationTokenValue(
  request: McpRequest,
  allowedRoots: string[] | undefined,
  options: { retryMs?: number; intervalMs?: number },
  deps: Pick<
    DelegationServerQuestionFlowDeps,
    | 'resolveRunManifestPath'
    | 'isPathWithinRoots'
    | 'safeJsonParse'
    | 'delay'
    | 'defaultDelegationTokenRetryIntervalMs'
    | 'delegationTokenFile'
  >
): Promise<string | null> {
  const privateToken = request.codex_private?.delegation_token;
  if (privateToken) {
    return String(privateToken);
  }
  const tokenPath = resolveDelegationTokenPath(allowedRoots, deps);
  if (!tokenPath) {
    return null;
  }
  const retryMs = options.retryMs ?? 0;
  const intervalMs = options.intervalMs ?? deps.defaultDelegationTokenRetryIntervalMs;
  const deadline = Date.now() + retryMs;
  let token = await readDelegationTokenFile(tokenPath, deps.safeJsonParse);
  while (!token && Date.now() < deadline) {
    await deps.delay(intervalMs);
    token = await readDelegationTokenFile(tokenPath, deps.safeJsonParse);
  }
  return token;
}

export function clampQuestionPollWaitMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(value, MAX_QUESTION_POLL_WAIT_MS);
}

export async function applyDelegationQuestionFallback(
  fallback: ExpiryFallback,
  allowedHosts: string[] | undefined,
  allowedRoots: string[] | undefined,
  deps: Pick<
    DelegationServerQuestionFlowDeps,
    'resolveRunManifestPath' | 'callControlEndpoint' | 'safeJsonParse'
  >
): Promise<void> {
  const manifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
  if (!manifestPath) {
    return;
  }
  const shouldResolve = await isDelegationRunAwaitingQuestion(manifestPath, allowedRoots, deps);
  if (!shouldResolve) {
    return;
  }
  const action = fallback === 'pause' ? 'pause' : fallback === 'resume' ? 'resume' : 'fail';
  try {
    await deps.callControlEndpoint(
      deps.resolveRunManifestPath(manifestPath, allowedRoots, 'manifest_path'),
      '/control/action',
      {
        action,
        requested_by: 'delegate',
        reason: 'question_expired'
      },
      undefined,
      { allowedHosts, allowedRoots }
    );
  } catch {
    // ignore
  }
}

async function isDelegationRunAwaitingQuestion(
  manifestPath: string,
  allowedRoots: string[] | undefined,
  deps: Pick<DelegationServerQuestionFlowDeps, 'resolveRunManifestPath' | 'safeJsonParse'>
): Promise<boolean> {
  try {
    const resolvedManifest = deps.resolveRunManifestPath(manifestPath, allowedRoots, 'manifest_path');
    const controlPath = resolve(dirname(resolvedManifest), 'control.json');
    const raw = await readFile(controlPath, 'utf8');
    const snapshot = deps.safeJsonParse(raw) as Record<string, unknown> | null;
    const latest =
      snapshot && snapshot.latest_action && typeof snapshot.latest_action === 'object'
        ? (snapshot.latest_action as Record<string, unknown>)
        : null;
    if (!latest) {
      return false;
    }
    return latest.action === 'pause' && latest.reason === 'awaiting_question_answer';
  } catch {
    return false;
  }
}

function resolveDelegationTokenPath(
  allowedRoots: string[] | undefined,
  deps: Pick<DelegationServerQuestionFlowDeps, 'resolveRunManifestPath' | 'isPathWithinRoots' | 'delegationTokenFile'>
): string | null {
  const explicit = process.env.CODEX_DELEGATION_TOKEN_PATH?.trim();
  const manifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH?.trim();
  let runDir: string | null = null;

  if (manifestPath) {
    try {
      const resolvedManifest = deps.resolveRunManifestPath(manifestPath, allowedRoots, 'manifest_path');
      runDir = dirname(resolvedManifest);
    } catch {
      return null;
    }
  }

  if (explicit) {
    if (!runDir && !isAbsolute(explicit)) {
      return null;
    }
    const resolvedToken =
      runDir && !isAbsolute(explicit) ? resolve(runDir, explicit) : resolve(explicit);
    if (runDir) {
      if (!deps.isPathWithinRoots(resolvedToken, [runDir])) {
        return null;
      }
    } else if (allowedRoots && allowedRoots.length > 0 && !deps.isPathWithinRoots(resolvedToken, allowedRoots)) {
      return null;
    }
    return resolvedToken;
  }

  if (runDir) {
    return resolve(runDir, deps.delegationTokenFile);
  }

  return null;
}

async function readDelegationTokenFile(
  tokenPath: string,
  safeJsonParse: (text: string) => unknown | null
): Promise<string | null> {
  try {
    const raw = await readFile(tokenPath, 'utf8');
    const parsed = safeJsonParse(raw);
    const tokenValue =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>).token
        : null;
    const token =
      typeof tokenValue === 'string' && tokenValue.trim().length > 0 ? tokenValue.trim() : raw.trim();
    return token || null;
  } catch {
    return null;
  }
}
