/* eslint-disable patterns/prefer-logger-over-console */

import { resolveAttachTarget } from './coStatusAttachCliShell.js';
import type { ProviderIssueRecoveryAction } from './control/providerIssueHandoff.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';
const CSRF_HEADER = 'x-csrf-token';
export const DEFAULT_PROVIDER_WORKER_RECOVER_REQUEST_TIMEOUT_MS = 120_000;

export interface RunControlHostProviderWorkerRecoverCliShellParams {
  action: ProviderIssueRecoveryAction;
  flags: ArgMap;
  printHelp: () => void;
}

export async function runControlHostProviderWorkerRecoverCliShell(
  params: RunControlHostProviderWorkerRecoverCliShellParams
): Promise<void> {
  if (params.flags.help !== undefined) {
    params.printHelp();
    return;
  }

  const issueId = readStringFlag(params.flags, 'issue-id');
  if (!issueId) {
    throw new Error('control-host provider-worker recovery requires --issue-id <linear-issue-id>.');
  }

  const format: OutputFormat = readStringFlag(params.flags, 'format') === 'json' ? 'json' : 'text';
  const requestTimeoutMs = readRequestTimeoutMs(params.flags);
  const target = await resolveAttachTarget(params.flags);
  const response = await requestProviderWorkerRecover({
    baseUrl: target.baseUrl,
    token: target.token,
    issueId,
    action: params.action,
    requestTimeoutMs
  });
  const payload = {
    ...response,
    control_host: { base_url: target.baseUrl.toString(), task_id: target.taskId, run_id: target.runId, run_dir: target.runDir, manifest_path: target.manifestPath }
  };
  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  const claim = isRecord(response) && isRecord(response.claim) ? response.claim : null;
  console.log(`Provider worker ${params.action} requested for ${issueId}.`);
  console.log(`Result: ${String(response.kind ?? 'unknown')} (${String(response.reason ?? 'no_reason')})`);
  if (claim) {
    console.log(`Claim state: ${String(claim.state ?? 'unknown')}`);
    console.log(`Launch source: ${String(claim.launch_source ?? 'none')}`);
    console.log(`Launch token present: ${String(claim.launch_token_present ?? false)}`);
    console.log(`Run: ${String(claim.run_id ?? 'none')}`);
  }
}

async function requestProviderWorkerRecover(input: { baseUrl: URL; token: string; issueId: string; action: ProviderIssueRecoveryAction; requestTimeoutMs: number }): Promise<Record<string, unknown>> {
  const url = new URL('/api/v1/provider-worker/recover', input.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.requestTimeoutMs);
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.token}`,
        [CSRF_HEADER]: input.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider: 'linear', issue_id: input.issueId, action: input.action }),
      signal: controller.signal
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new Error(
        `control-host provider-worker ${input.action} request timed out after ${input.requestTimeoutMs}ms`
      );
    }
    throw new Error(
      `control-host provider-worker ${input.action} request failed at ${url.toString()}: ${
        (error as Error)?.message ?? String(error)
      }`
    );
  } finally {
    clearTimeout(timer);
  }

  const body = await readResponseBody(response);
  if (!response.ok) {
    throw new Error(
      `control-host provider-worker ${input.action} request failed: ${response.status} ${
        response.statusText || 'HTTP error'
      }; ${formatResponseBody(body)}`
    );
  }
  if (!isRecord(body)) {
    throw new Error(`control-host provider-worker ${input.action} response was not a JSON object.`);
  }
  return body;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function formatResponseBody(body: unknown): string {
  if (typeof body === 'string') return body;
  return body === null ? 'empty response body' : JSON.stringify(body);
}

function readRequestTimeoutMs(flags: ArgMap): number {
  const raw = readStringFlag(flags, 'request-timeout-ms');
  if (!raw) {
    return DEFAULT_PROVIDER_WORKER_RECOVER_REQUEST_TIMEOUT_MS;
  }
  if (!/^\d+$/u.test(raw)) {
    throw new Error('Invalid --request-timeout-ms: expected integer milliseconds >= 250');
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 250) {
    throw new Error('Invalid --request-timeout-ms: expected integer milliseconds >= 250');
  }
  return parsed;
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
