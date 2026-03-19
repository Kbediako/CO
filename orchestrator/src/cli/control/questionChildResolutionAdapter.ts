import http from 'node:http';
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import { logger } from '../../logger.js';
import type { CliManifest } from '../types.js';
import type { ControlState } from './controlState.js';
import type { QuestionRecord } from './questions.js';

const CHILD_CONTROL_TIMEOUT_MS = 15_000;
const CSRF_HEADER = 'x-csrf-token';
const DELEGATION_TOKEN_HEADER = 'x-codex-delegation-token';
const DELEGATION_RUN_HEADER = 'x-codex-delegation-run-id';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export interface DelegationAuth {
  token: string;
  childRunId: string;
}

export type QuestionChildResolutionOutcome = QuestionRecord['status'] | 'expired';

export interface QuestionChildResolutionFallbackEvent {
  question_id: string;
  outcome: QuestionChildResolutionOutcome;
  action: 'resume' | 'fail' | 'pause' | 'unknown';
  reason: string;
  non_fatal: true;
  error: string;
}

export interface QuestionChildResolutionAdapter {
  readDelegationHeaders(req: Pick<http.IncomingMessage, 'headers'>): DelegationAuth | null;
  validateDelegation(auth: DelegationAuth): boolean;
  resolveManifestPath(rawPath: string): string;
  readManifest(path: string): Promise<Pick<CliManifest, 'run_id'> | null>;
  resolveChildQuestion(
    record: QuestionRecord,
    outcome: QuestionChildResolutionOutcome
  ): Promise<void>;
  queueQuestionResolutions(records: QuestionRecord[]): void;
}

export function createQuestionChildResolutionAdapter(input: {
  allowedRunRoots: string[];
  allowedBindHosts?: string[];
  expiryFallback?: 'pause' | 'resume' | 'fail';
  readParentRunId(): string;
  validateDelegationToken(token: string, parentRunId: string, childRunId: string): boolean;
  emitResolutionFallback(payload: QuestionChildResolutionFallbackEvent): Promise<void>;
}): QuestionChildResolutionAdapter {
  const adapter: QuestionChildResolutionAdapter = {
    readDelegationHeaders: (req) => readDelegationHeaders(req),
    validateDelegation: (auth) =>
      input.validateDelegationToken(auth.token, input.readParentRunId(), auth.childRunId),
    resolveManifestPath: (rawPath) =>
      resolveRunManifestPath(rawPath, input.allowedRunRoots, 'from_manifest_path'),
    readManifest: (path) => readJsonFile<Pick<CliManifest, 'run_id'>>(path),
    resolveChildQuestion: async (record, outcome) => {
      const resolution = resolveChildQuestionAction(record, outcome, input.expiryFallback);
      if (!resolution) {
        return;
      }

      const manifestPath = record.from_manifest_path ?? null;
      if (!manifestPath) {
        return;
      }
      const shouldResolve = await isChildAwaitingQuestion(manifestPath, input.allowedRunRoots);
      if (!shouldResolve) {
        return;
      }

      try {
        await callChildControlEndpoint({
          manifestPath,
          payload: {
            action: resolution.action,
            requested_by: 'parent',
            reason: resolution.reason
          },
          allowedRunRoots: input.allowedRunRoots,
          allowedBindHosts: input.allowedBindHosts
        });
      } catch (error) {
        const message = (error as Error)?.message ?? String(error);
        logger.warn(`Failed to resolve child question: ${message}`);
        await input.emitResolutionFallback({
          question_id: record.question_id,
          outcome,
          action: resolution.action,
          reason: resolution.reason,
          non_fatal: true,
          error: message
        });
      }
    },
    queueQuestionResolutions: (records) => {
      for (const record of records) {
        if (record.status === 'queued') {
          continue;
        }
        void adapter.resolveChildQuestion(record, record.status).catch((error) => {
          const message = (error as Error)?.message ?? String(error);
          logger.warn(`Failed to resolve child question: ${message}`);
          void input.emitResolutionFallback({
            question_id: record.question_id,
            outcome: record.status,
            action: 'unknown',
            reason: 'resolution_enqueue_failed',
            non_fatal: true,
            error: message
          });
        });
      }
    }
  };

  return adapter;
}

export function readDelegationHeaders(
  req: Pick<http.IncomingMessage, 'headers'>
): DelegationAuth | null {
  const token = readHeaderValue(req.headers[DELEGATION_TOKEN_HEADER]);
  const childRunId = readHeaderValue(req.headers[DELEGATION_RUN_HEADER]);
  if (!token || !childRunId) {
    return null;
  }
  return { token, childRunId };
}

export async function callChildControlEndpoint(input: {
  manifestPath: string;
  payload: Record<string, unknown>;
  allowedRunRoots: string[];
  allowedBindHosts?: string[];
}): Promise<void> {
  const { baseUrl, token } = await loadControlEndpoint({
    manifestPath: input.manifestPath,
    allowedRunRoots: input.allowedRunRoots,
    allowedBindHosts: input.allowedBindHosts
  });
  const url = new URL('/control/action', baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHILD_CONTROL_TIMEOUT_MS);
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        [CSRF_HEADER]: token
      },
      body: JSON.stringify(input.payload),
      signal: controller.signal
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new Error('child control request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`child control error: ${res.status} ${message}`);
  }
}

function resolveChildQuestionAction(
  record: QuestionRecord,
  outcome: QuestionChildResolutionOutcome,
  defaultExpiryFallback?: 'pause' | 'resume' | 'fail'
): { action: 'resume' | 'fail' | 'pause'; reason: string } | null {
  const autoPause = record.auto_pause ?? true;
  if (!autoPause || !record.from_manifest_path) {
    return null;
  }

  if (outcome === 'expired') {
    const fallback = record.expiry_fallback ?? defaultExpiryFallback ?? 'pause';
    if (fallback === 'pause') {
      return { action: 'pause', reason: 'question_expired' };
    }
    return {
      action: fallback === 'resume' ? 'resume' : 'fail',
      reason: 'question_expired'
    };
  }

  if (outcome === 'answered') {
    return { action: 'resume', reason: 'question_answered' };
  }

  if (outcome === 'dismissed') {
    return { action: 'resume', reason: 'question_dismissed' };
  }

  return null;
}

async function isChildAwaitingQuestion(
  manifestPath: string | null,
  allowedRunRoots: string[]
): Promise<boolean> {
  if (!manifestPath) {
    return false;
  }
  try {
    const resolvedManifest = resolveRunManifestPath(manifestPath, allowedRunRoots, 'from_manifest_path');
    const controlPath = resolve(dirname(resolvedManifest), 'control.json');
    const snapshot = await readJsonFile<ControlState>(controlPath);
    const latest = snapshot?.latest_action;
    if (!latest || latest.action !== 'pause') {
      return false;
    }
    return latest.reason === 'awaiting_question_answer';
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      logger.warn(`Failed to inspect child question state: ${(error as Error)?.message ?? error}`);
    }
    return false;
  }
}

async function loadControlEndpoint(input: {
  manifestPath: string;
  allowedRunRoots: string[];
  allowedBindHosts?: string[];
}): Promise<{ baseUrl: URL; token: string }> {
  const resolvedManifest = resolveRunManifestPath(
    input.manifestPath,
    input.allowedRunRoots,
    'from_manifest_path'
  );
  const runDir = dirname(resolvedManifest);
  const endpointPath = resolve(runDir, 'control_endpoint.json');
  const raw = await readFile(endpointPath, 'utf8');
  const endpointInfo = JSON.parse(raw) as { base_url?: string; token_path?: string };
  const baseUrl = validateControlBaseUrl(endpointInfo.base_url, input.allowedBindHosts);
  const tokenPath = resolveControlTokenPath(endpointInfo.token_path, runDir);
  const token = await readControlToken(tokenPath);
  return { baseUrl, token };
}

function validateControlBaseUrl(raw: unknown, allowedHosts?: string[]): URL {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('control base_url missing');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('control base_url invalid');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('control base_url invalid');
  }
  if (parsed.username || parsed.password) {
    throw new Error('control base_url invalid');
  }
  const allowed = normalizeAllowedHosts(allowedHosts);
  if (allowed.size > 0 && !allowed.has(parsed.hostname.toLowerCase())) {
    throw new Error('control base_url not permitted');
  }
  return parsed;
}

function normalizeAllowedHosts(allowedHosts?: string[]): Set<string> {
  const values = allowedHosts && allowedHosts.length > 0 ? allowedHosts : Array.from(LOOPBACK_HOSTS);
  return new Set(values.map((entry) => entry.toLowerCase()));
}

function resolveControlTokenPath(tokenPath: unknown, runDir: string): string {
  const fallback = resolve(runDir, 'control_auth.json');
  const raw = typeof tokenPath === 'string' ? tokenPath.trim() : '';
  const resolved = raw ? resolve(runDir, raw) : fallback;
  if (!isPathWithinRoots(resolved, [runDir])) {
    throw new Error('control auth path invalid');
  }
  return resolved;
}

async function readControlToken(tokenPath: string): Promise<string> {
  const tokenRaw = await readFile(tokenPath, 'utf8');
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
  return token;
}

function resolveRunManifestPath(rawPath: string, allowedRoots: string[], label: string): string {
  const resolved = resolve(rawPath);
  const canonicalPath = realpathSafe(resolved);
  assertRunManifestPath(canonicalPath, label);
  if (!isPathWithinRoots(canonicalPath, allowedRoots)) {
    throw new Error(`${label} not permitted`);
  }
  return canonicalPath;
}

function assertRunManifestPath(pathname: string, label: string): void {
  const resolvedPath = resolve(pathname);
  if (basename(resolvedPath) !== 'manifest.json') {
    throw new Error(`${label} invalid`);
  }
  const runDir = dirname(resolvedPath);
  const cliDir = dirname(runDir);
  if (basename(cliDir) !== 'cli') {
    throw new Error(`${label} invalid`);
  }
  const taskDir = dirname(cliDir);
  if (!basename(runDir) || !basename(taskDir)) {
    throw new Error(`${label} invalid`);
  }
}

function isPathWithinRoots(pathname: string, roots: string[]): boolean {
  const resolved = normalizePath(realpathSafe(pathname));
  return roots.some((root) => {
    const resolvedRoot = normalizePath(realpathSafe(root));
    if (resolvedRoot === resolved) {
      return true;
    }
    const relativePath = relative(resolvedRoot, resolved);
    if (!relativePath) {
      return true;
    }
    if (isAbsolute(relativePath)) {
      return false;
    }
    return !relativePath.startsWith(`..${sep}`) && relativePath !== '..';
  });
}

function realpathSafe(pathname: string): string {
  try {
    return realpathSync(pathname);
  } catch {
    return resolve(pathname);
  }
}

function normalizePath(pathname: string): string {
  return process.platform === 'win32' ? pathname.toLowerCase() : pathname;
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    logger.warn(`Failed to read JSON file ${path}: ${(error as Error)?.message ?? error}`);
    return null;
  }
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    const values: string[] = [];
    for (const entry of value) {
      if (typeof entry !== 'string') {
        continue;
      }
      const parts = entry.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          values.push(trimmed);
        }
      }
    }
    return readUniqueHeaderValue(values);
  }
  if (typeof value === 'string') {
    const parts = value.split(',');
    const values: string[] = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) {
        values.push(trimmed);
      }
    }
    return readUniqueHeaderValue(values);
  }
  return null;
}

function readUniqueHeaderValue(values: string[]): string | null {
  if (values.length === 0) {
    return null;
  }
  const unique = new Set(values);
  if (unique.size > 1) {
    return null;
  }
  return values[0];
}
