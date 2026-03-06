import { describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
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

async function seedTransportMutatingControls(
  paths: ReturnType<typeof resolveRunPaths>,
  options: {
    enabled: boolean;
    idempotencyWindowMs?: number;
    nonceMaxTtlMs?: number;
    allowedTransports?: string[];
  }
): Promise<void> {
  await writeFile(
    paths.controlPath,
    JSON.stringify({
      run_id: 'run-1',
      control_seq: 0,
      feature_toggles: {
        transport_mutating_controls: {
          enabled: options.enabled,
          idempotency_window_ms: options.idempotencyWindowMs ?? 60_000,
          nonce_max_ttl_ms: options.nonceMaxTtlMs ?? 60_000,
          ...(options.allowedTransports ? { allowed_transports: options.allowedTransports } : {})
        }
      }
    }),
    'utf8'
  );
}

async function seedDispatchPilot(
  paths: ReturnType<typeof resolveRunPaths>,
  dispatchPilot: Record<string, unknown>
): Promise<void> {
  await writeFile(
    paths.controlPath,
    JSON.stringify({
      run_id: 'run-1',
      control_seq: 0,
      feature_toggles: {
        dispatch_pilot: dispatchPilot
      }
    }),
    'utf8'
  );
}

async function seedControlState(
  paths: ReturnType<typeof resolveRunPaths>,
  overrides: Record<string, unknown> = {}
): Promise<void> {
  await writeFile(
    paths.controlPath,
    JSON.stringify({
      run_id: 'run-1',
      control_seq: 0,
      ...overrides
    }),
    'utf8'
  );
}

async function seedQuestions(
  paths: ReturnType<typeof resolveRunPaths>,
  questions: Array<Record<string, unknown>>
): Promise<void> {
  await writeFile(paths.questionsPath, JSON.stringify({ questions }), 'utf8');
}

async function seedManifest(
  paths: ReturnType<typeof resolveRunPaths>,
  overrides: Record<string, unknown> = {}
): Promise<void> {
  const now = new Date().toISOString();
  await writeFile(
    paths.manifestPath,
    JSON.stringify({
      run_id: 'run-1',
      task_id: 'task-0940',
      status: 'in_progress',
      started_at: now,
      updated_at: now,
      completed_at: null,
      summary: 'task is running',
      commands: [],
      approvals: [],
      ...overrides
    }),
    'utf8'
  );
}

function signLinearWebhook(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

async function readTextOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
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

  it('projects read-only compatibility state and issue payloads', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedManifest(paths);
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);
      const stateRes = await fetch(new URL('/api/v1/state', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(stateRes.status).toBe(200);
      const statePayload = (await stateRes.json()) as {
        generated_at?: string;
        counts?: { running?: number; retrying?: number };
        running?: Array<{ issue_identifier?: string; session_id?: string; state?: string }>;
        selected?: {
          issue_identifier?: string;
          raw_status?: string;
          display_status?: string;
        } | null;
        retrying?: unknown[];
      };
      expect(statePayload.generated_at).toBeTruthy();
      expect(statePayload.counts).toEqual({ running: 1, retrying: 0 });
      expect(statePayload.running?.[0]).toMatchObject({
        issue_identifier: 'task-0940',
        session_id: 'run-1',
        state: 'in_progress'
      });
      expect(statePayload.selected).toMatchObject({
        issue_identifier: 'task-0940',
        raw_status: 'in_progress',
        display_status: 'in_progress'
      });
      expect(statePayload.retrying).toEqual([]);

      const issueRes = await fetch(new URL('/api/v1/task-0940', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(issueRes.status).toBe(200);
      const issuePayload = (await issueRes.json()) as {
        issue_identifier?: string;
        status?: string;
        raw_status?: string;
        display_status?: string;
        workspace?: { path?: string };
        running?: { state?: string };
      };
      expect(issuePayload.issue_identifier).toBe('task-0940');
      expect(issuePayload.status).toBe('in_progress');
      expect(issuePayload.raw_status).toBe('in_progress');
      expect(issuePayload.display_status).toBe('in_progress');
      expect(issuePayload.workspace?.path).toBe(env.repoRoot);
      expect(issuePayload.running?.state).toBe('in_progress');

      const missingIssueRes = await fetch(new URL('/api/v1/task-missing', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(missingIssueRes.status).toBe(404);
      const missingPayload = (await missingIssueRes.json()) as {
        error?: { code?: string; details?: { issue_identifier?: string } };
      };
      expect(missingPayload.error?.code).toBe('issue_not_found');
      expect(missingPayload.error?.details?.issue_identifier).toBe('task-missing');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects unsupported methods for ui data and compatibility state dispatch issue and refresh routes', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedManifest(paths);
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);

      const stateRes = await fetch(new URL('/api/v1/state', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token
        }
      });
      expect(stateRes.status).toBe(405);
      const statePayload = (await stateRes.json()) as {
        error?: { code?: string; details?: { allowed_method?: string } };
      };
      expect(statePayload.error?.code).toBe('method_not_allowed');
      expect(statePayload.error?.details?.allowed_method).toBe('GET');

      const dispatchRes = await fetch(new URL('/api/v1/dispatch', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token
        }
      });
      expect(dispatchRes.status).toBe(405);
      const dispatchPayload = (await dispatchRes.json()) as {
        error?: { code?: string; details?: { allowed_method?: string } };
      };
      expect(dispatchPayload.error?.code).toBe('method_not_allowed');
      expect(dispatchPayload.error?.details?.allowed_method).toBe('GET');

      const uiRes = await fetch(new URL('/ui/data.json', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token
        }
      });
      expect(uiRes.status).toBe(405);
      const uiPayload = (await uiRes.json()) as {
        error?: {
          code?: string;
          details?: { allowed_method?: string; route?: string; surface?: string };
        };
      };
      expect(uiPayload.error?.code).toBe('method_not_allowed');
      expect(uiPayload.error?.details?.allowed_method).toBe('GET');
      expect(uiPayload.error?.details?.route).toBe('/ui/data.json');
      expect(uiPayload.error?.details?.surface).toBe('ui');

      const refreshRes = await fetch(new URL('/api/v1/refresh', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(refreshRes.status).toBe(405);
      const refreshPayload = (await refreshRes.json()) as {
        error?: { code?: string; details?: { allowed_method?: string } };
      };
      expect(refreshPayload.error?.code).toBe('method_not_allowed');
      expect(refreshPayload.error?.details?.allowed_method).toBe('POST');

      const issueRes = await fetch(new URL('/api/v1/task-0940', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token
        }
      });
      expect(issueRes.status).toBe(405);
      const issuePayload = (await issueRes.json()) as {
        error?: {
          code?: string;
          details?: { allowed_method?: string; issue_identifier?: string };
        };
      };
      expect(issuePayload.error?.code).toBe('method_not_allowed');
      expect(issuePayload.error?.details?.allowed_method).toBe('GET');
      expect(issuePayload.error?.details?.issue_identifier).toBe('task-0940');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('keeps selected paused runs coherent across state issue and ui projections', async () => {
    const { root, env, paths } = await createRunRoot('task-1015-paused');
    const startedAt = '2026-03-06T03:00:00.000Z';
    const updatedAt = '2026-03-06T03:02:00.000Z';
    await seedManifest(paths, {
      status: 'in_progress',
      started_at: startedAt,
      updated_at: updatedAt,
      summary: 'Waiting for operator approval'
    });
    await seedControlState(paths, {
      control_seq: 1,
      latest_action: {
        action: 'pause',
        requested_at: '2026-03-06T03:01:00.000Z',
        requested_by: 'operator',
        reason: 'manual_pause'
      },
      feature_toggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            team_id: 'lin-team-ready',
            summary: 'route advisory to queue',
            reason: 'signal threshold met',
            confidence: 0.7
          }
        }
      }
    });
    await seedQuestions(paths, [
      {
        question_id: 'q-1015',
        prompt: 'Approve the advisory handoff?',
        urgency: 'high',
        status: 'queued',
        queued_at: updatedAt
      }
    ]);
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);

      const stateRes = await fetch(new URL('/api/v1/state', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(stateRes.status).toBe(200);
      const statePayload = (await stateRes.json()) as {
        running?: Array<{ display_state?: string; status_reason?: string; last_event?: string }>;
        selected?: {
          issue_identifier?: string;
          raw_status?: string;
          display_status?: string;
          status_reason?: string;
          latest_event?: { event?: string; message?: string | null };
          question_summary?: { queued_count?: number; latest_question?: { question_id?: string; prompt?: string } | null };
        } | null;
        dispatch_pilot?: { status?: string; source_status?: string };
      };
      expect(statePayload.running?.[0]).toMatchObject({
        display_state: 'paused',
        status_reason: 'queued_questions',
        last_event: 'pause'
      });
      expect(statePayload.selected).toMatchObject({
        issue_identifier: 'task-0940',
        raw_status: 'in_progress',
        display_status: 'paused',
        status_reason: 'queued_questions',
        latest_event: {
          event: 'pause',
          message: 'Waiting for operator approval'
        },
        question_summary: {
          queued_count: 1,
          latest_question: {
            question_id: 'q-1015',
            prompt: 'Approve the advisory handoff?'
          }
        }
      });
      expect(statePayload.dispatch_pilot).toMatchObject({
        status: 'ready',
        source_status: 'ready'
      });

      const issueRes = await fetch(new URL('/api/v1/task-0940', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(issueRes.status).toBe(200);
      const issuePayload = (await issueRes.json()) as {
        raw_status?: string;
        display_status?: string;
        status_reason?: string;
        latest_event?: { event?: string; message?: string | null } | null;
        question_summary?: { queued_count?: number; latest_question?: { question_id?: string } | null } | null;
      };
      expect(issuePayload).toMatchObject({
        raw_status: 'in_progress',
        display_status: 'paused',
        status_reason: 'queued_questions',
        latest_event: {
          event: 'pause',
          message: 'Waiting for operator approval'
        },
        question_summary: {
          queued_count: 1,
          latest_question: {
            question_id: 'q-1015'
          }
        }
      });

      const uiRes = await fetch(new URL('/ui/data.json', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(uiRes.status).toBe(200);
      const uiPayload = (await uiRes.json()) as {
        selected?: {
          display_status?: string;
          question_summary?: { queued_count?: number };
        } | null;
        tasks?: Array<{ display_status?: string; status_reason?: string }>;
        runs?: Array<{ display_status?: string; status_reason?: string }>;
      };
      expect(uiPayload.selected).toMatchObject({
        display_status: 'paused',
        question_summary: {
          queued_count: 1
        }
      });
      expect(uiPayload.tasks?.[0]).toMatchObject({
        display_status: 'paused',
        status_reason: 'queued_questions'
      });
      expect(uiPayload.runs?.[0]).toMatchObject({
        display_status: 'paused',
        status_reason: 'queued_questions'
      });
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('keeps awaiting-input runs coherent across state issue and ui projections', async () => {
    const { root, env, paths } = await createRunRoot('task-1015-awaiting-input');
    const updatedAt = '2026-03-06T03:12:00.000Z';
    await seedManifest(paths, {
      status: 'in_progress',
      updated_at: updatedAt,
      summary: 'Waiting for question response'
    });
    await seedQuestions(paths, [
      {
        question_id: 'q-1015-awaiting',
        prompt: 'Proceed with the next rollout?',
        urgency: 'medium',
        status: 'queued',
        queued_at: updatedAt
      }
    ]);
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);

      const stateRes = await fetch(new URL('/api/v1/state', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(stateRes.status).toBe(200);
      const statePayload = (await stateRes.json()) as {
        running?: Array<{ state?: string; display_state?: string; status_reason?: string }>;
        selected?: {
          display_status?: string;
          status_reason?: string;
          question_summary?: { queued_count?: number; latest_question?: { question_id?: string } | null };
        } | null;
      };
      expect(statePayload.running?.[0]).toMatchObject({
        state: 'in_progress',
        display_state: 'awaiting_input',
        status_reason: 'queued_questions'
      });
      expect(statePayload.selected).toMatchObject({
        display_status: 'awaiting_input',
        status_reason: 'queued_questions',
        question_summary: {
          queued_count: 1,
          latest_question: {
            question_id: 'q-1015-awaiting'
          }
        }
      });

      const issueRes = await fetch(new URL('/api/v1/task-0940', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(issueRes.status).toBe(200);
      const issuePayload = (await issueRes.json()) as {
        raw_status?: string;
        display_status?: string;
        status_reason?: string;
        question_summary?: { queued_count?: number; latest_question?: { question_id?: string } | null } | null;
      };
      expect(issuePayload).toMatchObject({
        raw_status: 'in_progress',
        display_status: 'awaiting_input',
        status_reason: 'queued_questions',
        question_summary: {
          queued_count: 1,
          latest_question: {
            question_id: 'q-1015-awaiting'
          }
        }
      });

      const uiRes = await fetch(new URL('/ui/data.json', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(uiRes.status).toBe(200);
      const uiPayload = (await uiRes.json()) as {
        selected?: { display_status?: string } | null;
        tasks?: Array<{ display_status?: string }>;
        runs?: Array<{ display_status?: string }>;
      };
      expect(uiPayload.selected?.display_status).toBe('awaiting_input');
      expect(uiPayload.tasks?.[0]?.display_status).toBe('awaiting_input');
      expect(uiPayload.runs?.[0]?.display_status).toBe('awaiting_input');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('keeps terminal selected runs visible across state issue and ui projections', async () => {
    const scenarios = [
      {
        status: 'succeeded',
        summary: 'Completed successfully',
        expectedLastError: null
      },
      {
        status: 'failed',
        summary: 'Dispatch failed closed',
        expectedLastError: 'Dispatch failed closed'
      }
    ] as const;

    for (const scenario of scenarios) {
      const { root, env, paths } = await createRunRoot(`task-1015-${scenario.status}`);
      await seedManifest(paths, {
        status: scenario.status,
        updated_at: '2026-03-06T03:20:00.000Z',
        completed_at: '2026-03-06T03:21:00.000Z',
        summary: scenario.summary
      });
      const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

      const server = await ControlServer.start({
        paths,
        config,
        runId: 'run-1'
      });

      try {
        const baseUrl = server.getBaseUrl() ?? '';
        const token = await readToken(paths.controlAuthPath);

        const stateRes = await fetch(new URL('/api/v1/state', baseUrl), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        expect(stateRes.status).toBe(200);
        const statePayload = (await stateRes.json()) as {
          counts?: { running?: number };
          running?: unknown[];
          selected?: { display_status?: string; last_error?: string | null } | null;
        };
        expect(statePayload.counts?.running).toBe(0);
        expect(statePayload.running).toEqual([]);
        expect(statePayload.selected).toMatchObject({
          display_status: scenario.status,
          last_error: scenario.expectedLastError
        });

        const issueRes = await fetch(new URL('/api/v1/task-0940', baseUrl), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        expect(issueRes.status).toBe(200);
        const issuePayload = (await issueRes.json()) as {
          display_status?: string;
          latest_event?: { event?: string };
          last_error?: string | null;
        };
        expect(issuePayload).toMatchObject({
          display_status: scenario.status,
          latest_event: {
            event: scenario.status
          },
          last_error: scenario.expectedLastError
        });

        const uiRes = await fetch(new URL('/ui/data.json', baseUrl), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        expect(uiRes.status).toBe(200);
        const uiPayload = (await uiRes.json()) as {
          selected?: { display_status?: string } | null;
          tasks?: Array<{ display_status?: string; bucket?: string; bucket_reason?: string }>;
          runs?: Array<{ display_status?: string }>;
        };
        expect(uiPayload.selected?.display_status).toBe(scenario.status);
        expect(uiPayload.tasks?.[0]).toMatchObject({
          display_status: scenario.status,
          bucket: 'complete',
          bucket_reason: 'terminal'
        });
        expect(uiPayload.runs?.[0]?.display_status).toBe(scenario.status);
      } finally {
        await server.close();
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  it('acknowledges read-only refresh requests without mutating control state', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedManifest(paths);
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);
      const beforeRaw = await readFile(paths.controlPath, 'utf8');
      const before = JSON.parse(beforeRaw) as {
        control_seq?: number;
        latest_action?: { action?: string | null } | null;
      };

      const refreshRes = await fetch(new URL('/api/v1/refresh', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'refresh' })
      });

      expect(refreshRes.status).toBe(202);
      const refreshPayload = (await refreshRes.json()) as {
        status?: string;
        mode?: string;
        action?: string;
        requested_at?: string;
        traceability?: { decision?: string; reason?: string; requested_action?: string | null };
      };
      expect(refreshPayload.status).toBe('accepted');
      expect(refreshPayload.mode).toBe('read_only');
      expect(refreshPayload.action).toBe('refresh');
      expect(refreshPayload.requested_at).toBeTruthy();
      expect(refreshPayload.traceability).toMatchObject({
        decision: 'acknowledged',
        reason: 'refresh_projection_acknowledged',
        requested_action: 'refresh'
      });

      const afterRaw = await readFile(paths.controlPath, 'utf8');
      const after = JSON.parse(afterRaw) as {
        control_seq?: number;
        latest_action?: { action?: string | null } | null;
      };
      expect(after.control_seq).toBe(before.control_seq);
      expect(after.latest_action ?? null).toEqual(before.latest_action ?? null);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed with deterministic read-only action envelopes on compatibility refresh', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedManifest(paths);
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);
      const beforeRaw = await readFile(paths.controlPath, 'utf8');
      const before = JSON.parse(beforeRaw) as {
        control_seq?: number;
        latest_action?: { action?: string | null } | null;
      };

      const cases: Array<{
        body: Record<string, unknown>;
        status: number;
        reason: string;
        requestedAction: string | null;
        requestedTool: string | null;
      }> = [
        {
          body: { action: 'pause' },
          status: 403,
          reason: 'forbidden_mutating_action',
          requestedAction: 'pause',
          requestedTool: null
        },
        {
          body: { action: 'custom-action' },
          status: 400,
          reason: 'unsupported_action',
          requestedAction: 'custom-action',
          requestedTool: null
        },
        {
          body: { action: 42 },
          status: 400,
          reason: 'malformed_action_request',
          requestedAction: null,
          requestedTool: null
        },
        {
          body: { action: 'refresh', tool: 'delegate.cancel' },
          status: 403,
          reason: 'unsupported_tool',
          requestedAction: 'refresh',
          requestedTool: 'delegate.cancel'
        }
      ];

      for (const testCase of cases) {
        const res = await fetch(new URL('/api/v1/refresh', baseUrl), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-csrf-token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testCase.body)
        });

        expect(res.status).toBe(testCase.status);
        const payload = (await res.json()) as {
          error?: {
            code?: string;
            message?: string;
            details?: {
              surface?: string;
              mode?: string;
              reason?: string;
              allowed_actions?: string[];
              allowed_tools?: unknown[];
              requested_action?: string | null;
              requested_tool?: string | null;
            };
          };
          traceability?: {
            surface?: string;
            decision?: string;
            reason?: string;
            requested_action?: string | null;
            requested_tool?: string | null;
          };
        };

        expect(payload.error?.code).toBe('read_only_action_rejected');
        expect(payload.error?.message).toBe(
          'Compatibility surface is read-only; only refresh acknowledgements are supported.'
        );
        expect(payload.error?.details).toEqual({
          surface: 'api_v1',
          mode: 'read_only',
          reason: testCase.reason,
          allowed_actions: ['refresh'],
          allowed_tools: [],
          requested_action: testCase.requestedAction,
          requested_tool: testCase.requestedTool
        });
        expect(payload.traceability).toMatchObject({
          surface: 'api_v1',
          decision: 'rejected',
          reason: testCase.reason,
          requested_action: testCase.requestedAction,
          requested_tool: testCase.requestedTool
        });
      }

      const afterRaw = await readFile(paths.controlPath, 'utf8');
      const after = JSON.parse(afterRaw) as {
        control_seq?: number;
        latest_action?: { action?: string | null } | null;
      };
      expect(after.control_seq).toBe(before.control_seq);
      expect(after.latest_action ?? null).toEqual(before.latest_action ?? null);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('serves dispatch compatibility endpoint as read-only and reserves dispatch from issue matching', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedManifest(paths);
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);

      const dispatchRes = await fetch(new URL('/api/v1/dispatch', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(dispatchRes.status).toBe(200);
      const dispatchPayload = (await dispatchRes.json()) as {
        advisory_only?: boolean;
        dispatch_pilot?: { status?: string; source_status?: string };
        recommendation?: unknown;
        traceability?: { decision?: string; reason?: string };
      };
      expect(dispatchPayload.advisory_only).toBe(true);
      expect(dispatchPayload.dispatch_pilot).toMatchObject({
        status: 'disabled',
        source_status: 'disabled'
      });
      expect(dispatchPayload.recommendation).toBeNull();
      expect(dispatchPayload.traceability?.decision).toBe('acknowledged');
      expect(dispatchPayload.traceability?.reason).toBe('pilot_disabled_default_off');

      const reservedEncodedRes = await fetch(new URL('/api/v1/%64ispatch', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(reservedEncodedRes.status).toBe(404);
      const reservedPayload = (await reservedEncodedRes.json()) as {
        error?: { code?: string };
      };
      expect(reservedPayload.error?.code).toBe('not_found');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('evaluates dispatch pilot scenarios with fail-closed safeguards and no control mutation', async () => {
    const scenarios: Array<{
      name: string;
      dispatchPilot: Record<string, unknown>;
      expectedStatus: number;
      expectedDispatchStatus: string;
      expectedSourceStatus: string;
      expectedFailureCode: string | null;
      expectRecommendation: boolean;
      expectedSourceSetup: { provider: 'linear'; workspace_id: string | null; team_id: string | null; project_id: string | null } | null;
    }> = [
      {
        name: 'disabled',
        dispatchPilot: { enabled: false },
        expectedStatus: 200,
        expectedDispatchStatus: 'disabled',
        expectedSourceStatus: 'disabled',
        expectedFailureCode: null,
        expectRecommendation: false,
        expectedSourceSetup: null
      },
      {
        name: 'enabled',
        dispatchPilot: {
          enabled: true,
          source: {
            provider: 'linear',
            team_id: 'lin-team-ready',
            summary: 'route advisory to queue',
            reason: 'signal threshold met',
            confidence: 0.7
          }
        },
        expectedStatus: 200,
        expectedDispatchStatus: 'ready',
        expectedSourceStatus: 'ready',
        expectedFailureCode: null,
        expectRecommendation: true,
        expectedSourceSetup: {
          provider: 'linear',
          workspace_id: null,
          team_id: 'lin-team-ready',
          project_id: null
        }
      },
      {
        name: 'kill-switch',
        dispatchPilot: {
          enabled: true,
          kill_switch: true,
          source: {
            provider: 'linear_advisory',
            project_id: 'lin-project-blocked',
            summary: 'blocked by kill-switch'
          }
        },
        expectedStatus: 200,
        expectedDispatchStatus: 'kill_switched',
        expectedSourceStatus: 'blocked',
        expectedFailureCode: null,
        expectRecommendation: false,
        expectedSourceSetup: {
          provider: 'linear',
          workspace_id: null,
          team_id: null,
          project_id: 'lin-project-blocked'
        }
      },
      {
        name: 'source-unavailable',
        dispatchPilot: {
          enabled: true
        },
        expectedStatus: 503,
        expectedDispatchStatus: 'source_unavailable',
        expectedSourceStatus: 'unavailable',
        expectedFailureCode: 'dispatch_source_unavailable',
        expectRecommendation: false,
        expectedSourceSetup: null
      },
      {
        name: 'source-malformed',
        dispatchPilot: {
          enabled: true,
          source: {
            provider: 'linear',
            project_id: 'lin-project-malformed',
            confidence: 3
          }
        },
        expectedStatus: 422,
        expectedDispatchStatus: 'source_malformed',
        expectedSourceStatus: 'malformed',
        expectedFailureCode: 'dispatch_source_malformed',
        expectRecommendation: false,
        expectedSourceSetup: null
      }
    ];

    for (const scenario of scenarios) {
      const { root, env, paths } = await createRunRoot(`task-0940-${scenario.name}`);
      await seedManifest(paths);
      await seedDispatchPilot(paths, scenario.dispatchPilot);
      const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
      const events: import('../src/cli/events/runEventStream.js').RunEventStreamEntry[] = [];
      const eventStream = {
        append: async (entry: { event: string; actor: string; payload: Record<string, unknown> }) => {
          const record = {
            seq: events.length + 1,
            event: entry.event,
            actor: entry.actor,
            payload: entry.payload,
            ts: new Date().toISOString()
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
        const baseUrl = server.getBaseUrl() ?? '';
        const token = await readToken(paths.controlAuthPath);
        const beforeRaw = await readFile(paths.controlPath, 'utf8');
        const before = JSON.parse(beforeRaw) as {
          control_seq?: number;
          latest_action?: { action?: string | null } | null;
        };

        const dispatchRes = await fetch(new URL('/api/v1/dispatch', baseUrl), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        expect(dispatchRes.status).toBe(scenario.expectedStatus);
        const dispatchPayload = (await dispatchRes.json()) as {
          recommendation?: {
            source_setup?: {
              provider?: string;
              workspace_id?: string | null;
              team_id?: string | null;
              project_id?: string | null;
            };
          } | null;
          dispatch_pilot?: {
            status?: string;
            source_status?: string;
            source_setup?: {
              provider?: string;
              workspace_id?: string | null;
              team_id?: string | null;
              project_id?: string | null;
            } | null;
          };
          error?: {
            code?: string;
            details?: {
              dispatch_pilot?: {
                status?: string;
                source_status?: string;
                source_setup?: {
                  provider?: string;
                  workspace_id?: string | null;
                  team_id?: string | null;
                  project_id?: string | null;
                } | null;
              };
            };
          };
          traceability?: {
            decision?: string;
            reason?: string;
            issue_identifier?: string | null;
          };
        };

        if (scenario.expectedFailureCode) {
          expect(dispatchPayload.error?.code).toBe(scenario.expectedFailureCode);
          expect(dispatchPayload.error?.details?.dispatch_pilot).toMatchObject({
            status: scenario.expectedDispatchStatus,
            source_status: scenario.expectedSourceStatus,
            source_setup: scenario.expectedSourceSetup
          });
        } else {
          expect(dispatchPayload.dispatch_pilot).toMatchObject({
            status: scenario.expectedDispatchStatus,
            source_status: scenario.expectedSourceStatus,
            source_setup: scenario.expectedSourceSetup
          });
          if (scenario.expectRecommendation) {
            expect(dispatchPayload.recommendation).toMatchObject({
              source_setup: scenario.expectedSourceSetup
            });
          } else {
            expect(dispatchPayload.recommendation).toBeNull();
          }
        }
        expect(dispatchPayload.traceability?.decision).toBe(
          scenario.expectedFailureCode ? 'rejected' : 'acknowledged'
        );
        expect(dispatchPayload.traceability?.issue_identifier).toBe('task-0940');
        expect(typeof dispatchPayload.traceability?.reason).toBe('string');

        const stateRes = await fetch(new URL('/api/v1/state', baseUrl), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        expect(stateRes.status).toBe(200);
        const statePayload = (await stateRes.json()) as {
          dispatch_pilot?: { status?: string; source_status?: string };
        };
        expect(statePayload.dispatch_pilot).toMatchObject({
          status: scenario.expectedDispatchStatus,
          source_status: scenario.expectedSourceStatus,
          source_setup: scenario.expectedSourceSetup
        });

        const issueRes = await fetch(new URL('/api/v1/task-0940', baseUrl), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        expect(issueRes.status).toBe(200);
        const issuePayload = (await issueRes.json()) as {
          dispatch_pilot?: { status?: string; source_status?: string };
        };
        expect(issuePayload.dispatch_pilot).toMatchObject({
          status: scenario.expectedDispatchStatus,
          source_status: scenario.expectedSourceStatus,
          source_setup: scenario.expectedSourceSetup
        });

        const afterRaw = await readFile(paths.controlPath, 'utf8');
        const after = JSON.parse(afterRaw) as {
          control_seq?: number;
          latest_action?: { action?: string | null } | null;
        };
        expect(after.control_seq).toBe(before.control_seq);
        expect(after.latest_action ?? null).toEqual(before.latest_action ?? null);
        const evaluatedEvent = events.find((entry) => entry.event === 'dispatch_pilot_evaluated');
        const viewedEvent = events.find((entry) => entry.event === 'dispatch_pilot_viewed');
        expect(evaluatedEvent).toBeDefined();
        expect(viewedEvent).toBeDefined();
        expect((evaluatedEvent?.payload ?? {}) as Record<string, unknown>).toMatchObject({
          decision: scenario.expectedFailureCode
            ? 'fail_closed'
            : scenario.expectedDispatchStatus === 'ready'
              ? 'ready'
              : 'blocked'
        });
        expect((viewedEvent?.payload ?? {}) as Record<string, unknown>).toMatchObject({
          http_status: scenario.expectedStatus,
          recommendation_available: scenario.expectRecommendation,
          decision: scenario.expectedFailureCode
            ? 'fail_closed'
            : scenario.expectedDispatchStatus === 'ready'
              ? 'ready'
              : 'blocked'
        });
        expect(
          events.some((entry) => entry.event === 'control_action_applied' || entry.event === 'control_action_replayed')
        ).toBe(false);
      } finally {
        await server.close();
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  it('projects tracked live Linear advisory metadata into compatibility state and issue payloads', async () => {
    const { root, env, paths } = await createRunRoot('task-1014-live-linear');
    await seedManifest(paths);
    await seedDispatchPilot(paths, {
      enabled: true,
      source: {
        provider: 'linear',
        live: true,
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-live',
        project_id: 'lin-project-1'
      }
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const realFetch = globalThis.fetch;
    let linearFetchCount = 0;

    vi.stubEnv('CO_LINEAR_API_TOKEN', 'lin-api-token');
    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        linearFetchCount += 1;
        return new Response(
          JSON.stringify({
            data: {
              viewer: {
                organization: {
                  id: 'lin-workspace-1'
                }
              },
              issues: {
                nodes: [
                  {
                    id: 'lin-issue-1',
                    identifier: 'PREPROD-101',
                    title: 'Investigate advisory routing',
                    url: 'https://linear.app/asabeko/issue/PREPROD-101',
                    updatedAt: '2026-03-06T02:00:00.000Z',
                    state: {
                      name: 'In Progress',
                      type: 'started'
                    },
                    team: {
                      id: 'lin-team-live',
                      key: 'PREPROD',
                      name: 'PRE-PRO/PRODUCTION'
                    },
                    project: {
                      id: 'lin-project-1',
                      name: 'Icon Agency (Bookings)'
                    },
                    history: {
                      nodes: [
                        {
                          id: 'history-1',
                          createdAt: '2026-03-06T01:00:00.000Z',
                          actor: {
                            displayName: 'Operator One'
                          },
                          fromState: {
                            name: 'Todo'
                          },
                          toState: {
                            name: 'In Progress'
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return realFetch(input, init);
    });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);

      const dispatchRes = await fetch(new URL('/api/v1/dispatch', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(dispatchRes.status).toBe(200);
      const dispatchPayload = (await dispatchRes.json()) as {
        recommendation?: {
          tracked_issue?: {
            identifier?: string;
            title?: string;
            team_key?: string;
          } | null;
        } | null;
      };
      expect(dispatchPayload.recommendation?.tracked_issue).toMatchObject({
        identifier: 'PREPROD-101',
        title: 'Investigate advisory routing',
        team_key: 'PREPROD'
      });
      expect(linearFetchCount).toBe(1);

      const stateRes = await fetch(new URL('/api/v1/state', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(stateRes.status).toBe(200);
      const statePayload = (await stateRes.json()) as {
        tracked?: {
          linear?: {
            identifier?: string;
            title?: string;
            state?: string;
          };
        };
      };
      expect(statePayload.tracked?.linear).toMatchObject({
        identifier: 'PREPROD-101',
        title: 'Investigate advisory routing',
        state: 'In Progress'
      });

      const issueRes = await fetch(new URL('/api/v1/task-0940', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(issueRes.status).toBe(200);
      const issuePayload = (await issueRes.json()) as {
        workspace?: {
          path?: string;
        };
        tracked?: {
          linear?: {
            identifier?: string;
            recent_activity?: Array<{ summary?: string }>;
          };
        };
      };
      expect(issuePayload.tracked?.linear).toMatchObject({
        identifier: 'PREPROD-101'
      });
      expect(issuePayload.tracked?.linear?.recent_activity?.[0]?.summary).toBe('State Todo -> In Progress');
      expect(issuePayload.workspace?.path).toBe(env.repoRoot);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });

  it('fails missing compatibility issues without triggering live Linear provider fetches', async () => {
    const { root, env, paths } = await createRunRoot('task-1015-live-linear-missing');
    await seedManifest(paths);
    await seedDispatchPilot(paths, {
      enabled: true,
      source: {
        provider: 'linear',
        live: true,
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-live',
        project_id: 'lin-project-1'
      }
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const realFetch = globalThis.fetch;
    let linearFetchCount = 0;

    vi.stubEnv('CO_LINEAR_API_TOKEN', 'lin-api-token');
    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        linearFetchCount += 1;
        return new Response(JSON.stringify({ data: { viewer: null, issues: { nodes: [] } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return realFetch(input, init);
    });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);
      const missingIssueRes = await fetch(new URL('/api/v1/task-missing', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(missingIssueRes.status).toBe(404);
      expect(linearFetchCount).toBe(0);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });

  it('accepts a valid signed Linear webhook without bearer auth and projects the tracked issue', async () => {
    const { root, env, paths } = await createRunRoot('task-1016-linear-webhook-accept');
    await seedManifest(paths);
    await seedDispatchPilot(paths, {
      enabled: true,
      source: {
        provider: 'linear',
        live: true,
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-live',
        project_id: 'lin-project-1'
      }
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const realFetch = globalThis.fetch;
    const webhookSecret = 'linear-webhook-secret';

    vi.stubEnv('CO_LINEAR_API_TOKEN', 'lin-api-token');
    vi.stubEnv('CO_LINEAR_WEBHOOK_SECRET', webhookSecret);
    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        return new Response(
          JSON.stringify({
            data: {
              viewer: {
                organization: {
                  id: 'lin-workspace-1'
                }
              },
              issue: {
                id: 'lin-issue-1',
                identifier: 'PREPROD-101',
                title: 'Investigate advisory routing',
                url: 'https://linear.app/asabeko/issue/PREPROD-101',
                updatedAt: '2026-03-06T05:00:00.000Z',
                state: {
                  name: 'In Progress',
                  type: 'started'
                },
                team: {
                  id: 'lin-team-live',
                  key: 'PREPROD',
                  name: 'PRE-PRO/PRODUCTION'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'Icon Agency (Bookings)'
                },
                history: {
                  nodes: [
                    {
                      id: 'history-1',
                      createdAt: '2026-03-06T04:55:00.000Z',
                      actor: {
                        displayName: 'Operator One'
                      },
                      fromState: {
                        name: 'Todo'
                      },
                      toState: {
                        name: 'In Progress'
                      }
                    }
                  ]
                }
              }
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return realFetch(input, init);
    });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);
      const controlBefore = JSON.parse(await readFile(paths.controlPath, 'utf8')) as { control_seq?: number };
      const body = JSON.stringify({
        action: 'update',
        type: 'Issue',
        webhookTimestamp: Date.now(),
        data: {
          id: 'lin-issue-1'
        }
      });

      const response = await fetch(new URL('/integrations/linear/webhook', baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Linear-Delivery': 'delivery-1',
          'Linear-Event': 'Issue',
          'Linear-Signature': signLinearWebhook(body, webhookSecret)
        },
        body
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: 'accepted',
        reason: 'linear_delivery_accepted'
      });

      const controlAfter = JSON.parse(await readFile(paths.controlPath, 'utf8')) as { control_seq?: number };
      expect(controlAfter.control_seq).toBe(controlBefore.control_seq);

      const advisoryStateRaw = await readFile(join(paths.runDir, 'linear-advisory-state.json'), 'utf8');
      const advisoryState = JSON.parse(advisoryStateRaw) as {
        latest_delivery_id?: string | null;
        latest_result?: string | null;
        tracked_issue?: { identifier?: string | null; team_key?: string | null } | null;
        seen_deliveries?: Array<{ delivery_id?: string; outcome?: string }>;
      };
      expect(advisoryState.latest_delivery_id).toBe('delivery-1');
      expect(advisoryState.latest_result).toBe('accepted');
      expect(advisoryState.tracked_issue).toMatchObject({
        identifier: 'PREPROD-101',
        team_key: 'PREPROD'
      });
      expect(advisoryState.seen_deliveries).toHaveLength(1);

      const stateRes = await fetch(new URL('/api/v1/state', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(stateRes.status).toBe(200);
      const statePayload = (await stateRes.json()) as {
        tracked?: {
          linear?: {
            identifier?: string;
            state?: string;
          };
        };
      };
      expect(statePayload.tracked?.linear).toMatchObject({
        identifier: 'PREPROD-101',
        state: 'In Progress'
      });

      const issueRes = await fetch(new URL('/api/v1/task-0940', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(issueRes.status).toBe(200);
      const issuePayload = (await issueRes.json()) as {
        tracked?: {
          linear?: {
            identifier?: string;
          };
        };
      };
      expect(issuePayload.tracked?.linear?.identifier).toBe('PREPROD-101');

      const duplicateResponse = await fetch(new URL('/integrations/linear/webhook', baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Linear-Delivery': 'delivery-1',
          'Linear-Event': 'Issue',
          'Linear-Signature': signLinearWebhook(body, webhookSecret)
        },
        body
      });
      expect(duplicateResponse.status).toBe(200);
      await expect(duplicateResponse.json()).resolves.toMatchObject({
        status: 'duplicate',
        reason: 'linear_delivery_duplicate'
      });

      const advisoryStateAfterDuplicate = JSON.parse(
        await readFile(join(paths.runDir, 'linear-advisory-state.json'), 'utf8')
      ) as {
        latest_delivery_id?: string | null;
        latest_result?: string | null;
        seen_deliveries?: Array<{ delivery_id?: string; outcome?: string }>;
      };
      expect(advisoryStateAfterDuplicate.latest_delivery_id).toBe('delivery-1');
      expect(advisoryStateAfterDuplicate.latest_result).toBe('duplicate');
      expect(advisoryStateAfterDuplicate.seen_deliveries).toHaveLength(1);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });

  it('rejects a Linear webhook with an invalid signature without mutating advisory state', async () => {
    const { root, env, paths } = await createRunRoot('task-1016-linear-webhook-signature');
    await seedManifest(paths);
    await seedDispatchPilot(paths, {
      enabled: true,
      source: {
        provider: 'linear',
        live: true,
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-live',
        project_id: 'lin-project-1'
      }
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    vi.stubEnv('CO_LINEAR_API_TOKEN', 'lin-api-token');
    vi.stubEnv('CO_LINEAR_WEBHOOK_SECRET', 'linear-webhook-secret');

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);
      const body = JSON.stringify({
        action: 'update',
        type: 'Issue',
        webhookTimestamp: Date.now(),
        data: {
          id: 'lin-issue-1'
        }
      });

      const response = await fetch(new URL('/integrations/linear/webhook', baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Linear-Delivery': 'delivery-invalid',
          'Linear-Event': 'Issue',
          'Linear-Signature': 'invalid-signature'
        },
        body
      });
      expect(response.status).toBe(401);

      const advisoryStateRaw = await readTextOrNull(join(paths.runDir, 'linear-advisory-state.json'));
      expect(advisoryStateRaw).toBeNull();

      const stateRes = await fetch(new URL('/api/v1/state', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(stateRes.status).toBe(200);
      const statePayload = (await stateRes.json()) as {
        tracked?: {
          linear?: unknown;
        };
      };
      expect(statePayload.tracked?.linear ?? null).toBeNull();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
      vi.unstubAllEnvs();
    }
  });

  it('ignores an out-of-scope signed Linear webhook without changing the projection', async () => {
    const { root, env, paths } = await createRunRoot('task-1016-linear-webhook-out-of-scope');
    await seedManifest(paths);
    await seedDispatchPilot(paths, {
      enabled: true,
      source: {
        provider: 'linear',
        live: true,
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-live',
        project_id: 'lin-project-1'
      }
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const realFetch = globalThis.fetch;
    const webhookSecret = 'linear-webhook-secret';

    vi.stubEnv('CO_LINEAR_API_TOKEN', 'lin-api-token');
    vi.stubEnv('CO_LINEAR_WEBHOOK_SECRET', webhookSecret);
    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        return new Response(
          JSON.stringify({
            data: {
              viewer: {
                organization: {
                  id: 'lin-workspace-1'
                }
              },
              issue: {
                id: 'lin-issue-2',
                identifier: 'PREPROD-102',
                title: 'Out of scope advisory',
                url: 'https://linear.app/asabeko/issue/PREPROD-102',
                updatedAt: '2026-03-06T05:10:00.000Z',
                state: {
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-other',
                  key: 'OTHER',
                  name: 'Other Team'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'Icon Agency (Bookings)'
                },
                history: {
                  nodes: []
                }
              }
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return realFetch(input, init);
    });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const token = await readToken(paths.controlAuthPath);
      const body = JSON.stringify({
        action: 'update',
        type: 'Issue',
        webhookTimestamp: Date.now(),
        data: {
          id: 'lin-issue-2'
        }
      });

      const response = await fetch(new URL('/integrations/linear/webhook', baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Linear-Delivery': 'delivery-out-of-scope',
          'Linear-Event': 'Issue',
          'Linear-Signature': signLinearWebhook(body, webhookSecret)
        },
        body
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: 'ignored',
        reason: 'dispatch_source_team_mismatch'
      });

      const advisoryStateRaw = await readFile(join(paths.runDir, 'linear-advisory-state.json'), 'utf8');
      const advisoryState = JSON.parse(advisoryStateRaw) as {
        latest_result?: string | null;
        tracked_issue?: unknown;
      };
      expect(advisoryState.latest_result).toBe('ignored');
      expect(advisoryState.tracked_issue ?? null).toBeNull();

      const stateRes = await fetch(new URL('/api/v1/state', baseUrl), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      expect(stateRes.status).toBe(200);
      const statePayload = (await stateRes.json()) as {
        tracked?: {
          linear?: unknown;
        };
      };
      expect(statePayload.tracked?.linear ?? null).toBeNull();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
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

  it('rejects coordinator metadata on session control actions', async () => {
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
        body: JSON.stringify({ action: 'pause', reason: 'ui', intent_id: 'intent-ui' })
      });

      expect(res.status).toBe(403);
      const payload = (await res.json()) as { error?: string };
      expect(payload.error).toBe('ui_control_metadata_disallowed');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('replays duplicate control actions by request_id/intent_id without bumping control_seq', async () => {
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

      const first = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-1',
          intent_id: 'intent-1',
          reason: 'manual'
        })
      });
      const firstPayload = (await first.json()) as { control_seq?: number; idempotent_replay?: boolean };
      expect(firstPayload.control_seq).toBe(1);
      expect(firstPayload.idempotent_replay).toBeUndefined();

      const replayByRequest = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-1',
          intent_id: 'intent-2',
          reason: 'manual'
        })
      });
      const replayByRequestPayload = (await replayByRequest.json()) as {
        control_seq?: number;
        idempotent_replay?: boolean;
      };
      expect(replayByRequestPayload.control_seq).toBe(1);
      expect(replayByRequestPayload.idempotent_replay).toBe(true);

      const replayByIntent = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-2',
          intent_id: 'intent-1',
          reason: 'manual'
        })
      });
      const replayByIntentPayload = (await replayByIntent.json()) as {
        control_seq?: number;
        idempotent_replay?: boolean;
      };
      expect(replayByIntentPayload.control_seq).toBe(1);
      expect(replayByIntentPayload.idempotent_replay).toBe(true);

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      const control = JSON.parse(controlRaw) as {
        control_seq?: number;
        latest_action?: { request_id?: string | null; intent_id?: string | null };
      };
      expect(control.control_seq).toBe(1);
      expect(control.latest_action?.request_id).toBe('req-1');
      expect(control.latest_action?.intent_id).toBe('intent-1');

      const appliedEvent = events.find((entry) => entry.event === 'control_action_applied');
      const replayEvents = events.filter((entry) => entry.event === 'control_action_replayed');
      expect(appliedEvent?.payload).toMatchObject({
        action: 'pause',
        request_id: 'req-1',
        intent_id: 'intent-1',
        task_id: 'task-0940',
        run_id: 'run-1',
        manifest_path: paths.manifestPath
      });
      expect(replayEvents).toHaveLength(2);
      expect(replayEvents[0]?.payload).toMatchObject({
        idempotent_replay: true,
        action: 'pause',
        control_seq: 1,
        request_id: 'req-1',
        intent_id: 'intent-1',
        task_id: 'task-0940',
        run_id: 'run-1'
      });
      expect(replayEvents[1]?.payload).toMatchObject({
        idempotent_replay: true,
        action: 'pause',
        control_seq: 1,
        request_id: 'req-1',
        intent_id: 'intent-1',
        task_id: 'task-0940',
        run_id: 'run-1'
      });
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('persists replayed control snapshots after an initial persist failure', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });
    const originalWriteJsonAtomic = fsUtils.writeJsonAtomic;
    let failOnce = true;
    const writeSpy = vi.spyOn(fsUtils, 'writeJsonAtomic').mockImplementation(async (...args) => {
      const [path] = args as Parameters<typeof fsUtils.writeJsonAtomic>;
      if (failOnce && path === paths.controlPath) {
        failOnce = false;
        throw new Error('persist_failed');
      }
      return originalWriteJsonAtomic(...args);
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const action = {
        action: 'pause',
        requested_by: 'delegate',
        request_id: 'req-persist',
        intent_id: 'intent-persist',
        reason: 'manual'
      };

      const first = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(action)
      });
      expect(first.status).toBe(500);
      const firstPayload = (await first.json()) as { error?: string };
      expect(firstPayload.error).toContain('persist_failed');

      const retry = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(action)
      });
      expect(retry.status).toBe(200);
      const retryPayload = (await retry.json()) as { control_seq?: number; idempotent_replay?: boolean };
      expect(retryPayload.control_seq).toBe(1);
      expect(retryPayload.idempotent_replay).toBe(true);

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      const control = JSON.parse(controlRaw) as { control_seq?: number; latest_action?: { request_id?: string | null } };
      expect(control.control_seq).toBe(1);
      expect(control.latest_action?.request_id).toBe('req-persist');
    } finally {
      writeSpy.mockRestore();
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('allows transport nonce retry after persist failure and consumes nonce after successful persist', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, {
      enabled: true,
      idempotencyWindowMs: 120_000,
      nonceMaxTtlMs: 120_000
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });
    const originalWriteJsonAtomic = fsUtils.writeJsonAtomic;
    let failOnce = true;
    const writeSpy = vi.spyOn(fsUtils, 'writeJsonAtomic').mockImplementation(async (...args) => {
      const [path] = args as Parameters<typeof fsUtils.writeJsonAtomic>;
      if (failOnce && path === paths.controlPath) {
        failOnce = false;
        throw new Error('persist_failed');
      }
      return originalWriteJsonAtomic(...args);
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const action = {
        action: 'pause',
        requested_by: 'delegate',
        request_id: 'req-transport-persist-fail',
        intent_id: 'intent-transport-persist-fail',
        reason: 'transport',
        transport: 'discord',
        actor_id: 'actor-transport',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:persist-fail',
        transport_nonce: 'nonce-transport-persist-fail',
        transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
      };

      const first = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(action)
      });
      expect(first.status).toBe(500);
      const firstPayload = (await first.json()) as { error?: string };
      expect(firstPayload.error).toContain('persist_failed');

      const retry = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(action)
      });
      expect(retry.status).toBe(200);
      const retryPayload = (await retry.json()) as { control_seq?: number; idempotent_replay?: boolean };
      expect(retryPayload.control_seq).toBe(1);
      expect(retryPayload.idempotent_replay).toBe(true);

      const replayedNonce = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...action,
          request_id: 'req-transport-persist-fail-reuse',
          intent_id: 'intent-transport-persist-fail-reuse'
        })
      });
      expect(replayedNonce.status).toBe(409);
      const replayedNoncePayload = (await replayedNonce.json()) as { error?: string };
      expect(replayedNoncePayload.error).toBe('transport_nonce_replayed');

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      const control = JSON.parse(controlRaw) as { control_seq?: number; latest_action?: { request_id?: string | null } };
      expect(control.control_seq).toBe(1);
      expect(control.latest_action?.request_id).toBe('req-transport-persist-fail');
    } finally {
      writeSpy.mockRestore();
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed when transport mutating controls are disabled by default', async () => {
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
      const res = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-transport-off',
          intent_id: 'intent-transport-off',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-1',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:1',
          transport_nonce: 'nonce-transport-off',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });

      expect(res.status).toBe(403);
      const payload = (await res.json()) as { error?: string; traceability?: Record<string, unknown> };
      expect(payload.error).toBe('transport_mutating_controls_disabled');
      expect(payload.traceability).toMatchObject({
        transport: 'discord',
        action: 'pause',
        decision: 'rejected',
        request_id: 'req-transport-off'
      });
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('enforces configured transport allowlists for mutating controls', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, { enabled: true, allowedTransports: ['telegram'] });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';

      const allowedRes = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-allow-telegram',
          intent_id: 'intent-allow-telegram',
          reason: 'transport',
          transport: 'telegram',
          actor_id: 'actor-telegram',
          actor_source: 'telegram.oauth',
          transport_principal: 'telegram:chat:allow',
          transport_nonce: 'nonce-allow-telegram',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });

      expect(allowedRes.status).toBe(200);
      const allowedPayload = (await allowedRes.json()) as {
        traceability?: Record<string, unknown>;
      };
      expect(allowedPayload.traceability).toMatchObject({
        transport: 'telegram',
        action: 'pause',
        decision: 'applied'
      });

      const blockedRes = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resume',
          requested_by: 'delegate',
          request_id: 'req-block-discord',
          intent_id: 'intent-block-discord',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-discord',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:block',
          transport_nonce: 'nonce-block-discord',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });

      expect(blockedRes.status).toBe(403);
      const blockedPayload = (await blockedRes.json()) as {
        error?: string;
        traceability?: Record<string, unknown>;
      };
      expect(blockedPayload.error).toBe('transport_mutating_transport_not_allowed');
      expect(blockedPayload.traceability).toMatchObject({
        transport: 'discord',
        action: 'resume',
        decision: 'rejected',
        request_id: 'req-block-discord'
      });

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      const control = JSON.parse(controlRaw) as {
        control_seq?: number;
        latest_action?: { transport?: string | null };
      };
      expect(control.control_seq).toBe(1);
      expect(control.latest_action?.transport).toBe('telegram');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects transport mutating requests missing required identity fields', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, { enabled: true });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const res = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-missing-identity',
          intent_id: 'intent-missing-identity',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-1',
          transport_principal: 'discord:channel:1',
          transport_nonce: 'nonce-missing-identity',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });

      expect(res.status).toBe(400);
      const payload = (await res.json()) as { error?: string };
      expect(payload.error).toBe('transport_actor_source_missing');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects transport metadata when transport discriminator is missing', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, { enabled: true });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const requests = [
        {
          request_id: 'req-missing-transport-discriminator-primary',
          intent_id: 'intent-missing-transport-discriminator-primary',
          actor_id: 'actor-1',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:1',
          transport_nonce: 'nonce-missing-transport-discriminator-primary',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        },
        {
          request_id: 'req-missing-transport-discriminator-alias',
          intent_id: 'intent-missing-transport-discriminator-alias',
          actor_id: 'actor-1',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:1',
          nonce: 'nonce-missing-transport-discriminator-alias',
          nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        }
      ];
      for (const request of requests) {
        const res = await fetch(new URL('/control/action', baseUrl), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-csrf-token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'pause',
            requested_by: 'delegate',
            reason: 'transport',
            ...request
          })
        });

        expect(res.status).toBe(400);
        const payload = (await res.json()) as { error?: string };
        expect(payload.error).toBe('transport_invalid');

        const controlRaw = await readFile(paths.controlPath, 'utf8');
        const control = JSON.parse(controlRaw) as {
          control_seq?: number;
          paused?: boolean;
          latest_action?: { request_id?: string | null };
        };
        expect(control.control_seq).toBe(0);
        expect(control.paused ?? false).toBe(false);
        expect(control.latest_action?.request_id ?? null).toBeNull();
      }
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed when /control/action receives malformed or unsupported transport and prevents fallback', async () => {
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
      const invalidCases: Array<{ transport: unknown; error: string; suffix: string }> = [
        { transport: 'slack', error: 'transport_unsupported', suffix: 'unsupported' },
        { transport: '   ', error: 'transport_invalid', suffix: 'blank' },
        { transport: 42, error: 'transport_invalid', suffix: 'non-string' }
      ];
      for (const invalidCase of invalidCases) {
        const requestId = `req-transport-${invalidCase.suffix}`;
        const res = await fetch(new URL('/control/action', baseUrl), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-csrf-token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'pause',
            requested_by: 'delegate',
            request_id: requestId,
            intent_id: `intent-transport-${invalidCase.suffix}`,
            transport: invalidCase.transport
          })
        });

        expect(res.status).toBe(400);
        const payload = (await res.json()) as { error?: string; traceability?: Record<string, unknown> };
        expect(payload.error).toBe(invalidCase.error);
        expect(payload.traceability).toMatchObject({
          transport: null,
          action: 'pause',
          decision: 'rejected',
          request_id: requestId
        });

        const controlRaw = await readFile(paths.controlPath, 'utf8');
        const control = JSON.parse(controlRaw) as {
          control_seq?: number;
          paused?: boolean;
          latest_action?: { request_id?: string | null };
        };
        expect(control.control_seq).toBe(0);
        expect(control.paused ?? false).toBe(false);
        expect(control.latest_action?.request_id ?? null).toBeNull();
      }
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('enforces transport nonce replay and expiry checks', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, { enabled: true });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const first = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-nonce-1',
          intent_id: 'intent-nonce-1',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-1',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:1',
          transport_nonce: 'nonce-replay-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(first.status).toBe(200);

      const replayedNonce = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-nonce-2',
          intent_id: 'intent-nonce-2',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-2',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:2',
          transport_nonce: 'nonce-replay-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(replayedNonce.status).toBe(409);
      const replayedPayload = (await replayedNonce.json()) as { error?: string };
      expect(replayedPayload.error).toBe('transport_nonce_replayed');

      const expiredNonce = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-nonce-3',
          intent_id: 'intent-nonce-3',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-3',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:3',
          transport_nonce: 'nonce-expired-1',
          transport_nonce_expires_at: new Date(Date.now() - 1_000).toISOString()
        })
      });
      expect(expiredNonce.status).toBe(409);
      const expiredPayload = (await expiredNonce.json()) as { error?: string };
      expect(expiredPayload.error).toBe('transport_nonce_expired');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('persists transport idempotency index across restart and returns canonical traceability', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, {
      enabled: true,
      idempotencyWindowMs: 120_000,
      nonceMaxTtlMs: 120_000
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    let server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const firstBaseUrl = server.getBaseUrl() ?? '';
      const first = await fetch(new URL('/control/action', firstBaseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-idem-transport',
          intent_id: 'intent-idem-transport',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-1',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:1',
          transport_nonce: 'nonce-idem-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(first.status).toBe(200);
      const firstPayload = (await first.json()) as { traceability?: Record<string, unknown> };
      expect(firstPayload.traceability).toMatchObject({
        actor_id: 'actor-1',
        actor_source: 'discord.oauth',
        transport: 'discord',
        transport_principal: 'discord:channel:1',
        action: 'pause',
        decision: 'applied',
        request_id: 'req-idem-transport',
        intent_id: 'intent-idem-transport',
        task_id: 'task-0940',
        run_id: 'run-1',
        manifest_path: paths.manifestPath
      });

      const replayBeforeRestart = await fetch(new URL('/control/action', firstBaseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-idem-transport',
          intent_id: 'intent-idem-transport',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-1',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:1',
          transport_nonce: 'nonce-idem-2',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(replayBeforeRestart.status).toBe(200);
      const replayBeforePayload = (await replayBeforeRestart.json()) as {
        control_seq?: number;
        idempotent_replay?: boolean;
        traceability?: Record<string, unknown>;
      };
      expect(replayBeforePayload.control_seq).toBe(1);
      expect(replayBeforePayload.idempotent_replay).toBe(true);
      expect(replayBeforePayload.traceability?.decision).toBe('replayed');

      await server.close();
      server = await ControlServer.start({
        paths,
        config,
        runId: 'run-1'
      });

      const secondBaseUrl = server.getBaseUrl() ?? '';
      const restartedToken = await readToken(paths.controlAuthPath);
      const replayAfterRestart = await fetch(new URL('/control/action', secondBaseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${restartedToken}`,
          'x-csrf-token': restartedToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-idem-transport',
          intent_id: 'intent-idem-transport',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-1',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:1',
          transport_nonce: 'nonce-idem-3',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(replayAfterRestart.status).toBe(200);
      const replayAfterPayload = (await replayAfterRestart.json()) as {
        control_seq?: number;
        idempotent_replay?: boolean;
      };
      expect(replayAfterPayload.control_seq).toBe(1);
      expect(replayAfterPayload.idempotent_replay).toBe(true);

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      const control = JSON.parse(controlRaw) as {
        transport_mutation?: {
          idempotency_index?: Array<{ key?: string; key_type?: string }>;
          consumed_nonces?: Array<{ nonce_sha256?: string }>;
        };
      };
      expect(control.transport_mutation?.idempotency_index?.some((entry) => entry.key === 'req-idem-transport')).toBe(true);
      expect(
        (control.transport_mutation?.consumed_nonces ?? []).every(
          (entry) => typeof entry.nonce_sha256 === 'string' && entry.nonce_sha256.length > 0
        )
      ).toBe(true);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('uses replay entry context for replay traceability after newer transport actions', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, { enabled: true, idempotencyWindowMs: 120_000, nonceMaxTtlMs: 120_000 });
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
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-csrf-token': token,
        'Content-Type': 'application/json'
      };

      const pauseFirst = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-trace-pause',
          intent_id: 'intent-trace-pause',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-a',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:a',
          transport_nonce: 'nonce-trace-pause-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(pauseFirst.status).toBe(200);

      const resumeSecond = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'resume',
          requested_by: 'delegate',
          request_id: 'req-trace-resume',
          intent_id: 'intent-trace-resume',
          reason: 'transport',
          transport: 'telegram',
          actor_id: 'actor-b',
          actor_source: 'telegram.bot',
          transport_principal: 'telegram:chat:b',
          transport_nonce: 'nonce-trace-resume-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(resumeSecond.status).toBe(200);

      const replayPause = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-trace-pause',
          intent_id: 'intent-trace-pause',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-c',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:c',
          transport_nonce: 'nonce-trace-pause-2',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(replayPause.status).toBe(200);
      const replayPayload = (await replayPause.json()) as {
        idempotent_replay?: boolean;
        control_seq?: number;
        traceability?: Record<string, unknown>;
      };
      expect(replayPayload.idempotent_replay).toBe(true);
      expect(replayPayload.control_seq).toBe(2);
      expect(replayPayload.traceability).toMatchObject({
        request_id: 'req-trace-pause',
        transport: 'discord',
        actor_id: 'actor-a',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:a'
      });

      const replayEvent = [...events].reverse().find((entry) => entry.event === 'control_action_replayed');
      expect(replayEvent?.payload).toMatchObject({
        idempotent_replay: true,
        action: 'pause',
        request_id: 'req-trace-pause',
        control_seq: 2,
        transport: 'discord',
        actor_id: 'actor-a',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:a'
      });
      expect((replayEvent?.payload as { traceability?: Record<string, unknown> } | undefined)?.traceability).toMatchObject({
        request_id: 'req-trace-pause',
        transport: 'discord',
        actor_id: 'actor-a',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:a'
      });
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves canonical null intent_id for request-only transport replay after newer actions', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, { enabled: true, idempotencyWindowMs: 120_000, nonceMaxTtlMs: 120_000 });
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
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-csrf-token': token,
        'Content-Type': 'application/json'
      };

      const first = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-request-only',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-request-only',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:request-only',
          transport_nonce: 'nonce-request-only-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(first.status).toBe(200);

      const newerAction = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'resume',
          requested_by: 'delegate',
          request_id: 'req-newer',
          intent_id: 'intent-newer',
          reason: 'transport',
          transport: 'telegram',
          actor_id: 'actor-newer',
          actor_source: 'telegram.bot',
          transport_principal: 'telegram:chat:newer',
          transport_nonce: 'nonce-request-only-2',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(newerAction.status).toBe(200);

      const replay = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-request-only',
          intent_id: 'intent-injected',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-override',
          actor_source: 'discord.bot',
          transport_principal: 'discord:channel:override',
          transport_nonce: 'nonce-request-only-3',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(replay.status).toBe(200);
      const replayPayload = (await replay.json()) as {
        idempotent_replay?: boolean;
        control_seq?: number;
        traceability?: Record<string, unknown>;
      };
      expect(replayPayload.idempotent_replay).toBe(true);
      expect(replayPayload.control_seq).toBe(2);
      expect(replayPayload.traceability).toMatchObject({
        action: 'pause',
        decision: 'replayed',
        request_id: 'req-request-only',
        intent_id: null,
        transport: 'discord',
        actor_id: 'actor-request-only',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:request-only'
      });
      expect(replayPayload.traceability?.intent_id).toBeNull();
      expect(replayPayload.traceability?.intent_id).not.toBe('intent-injected');

      const replayEvent = [...events]
        .reverse()
        .find(
          (entry) =>
            entry.event === 'control_action_replayed' &&
            (entry.payload as { action?: string; request_id?: string | null }).action === 'pause' &&
            (entry.payload as { request_id?: string | null }).request_id === 'req-request-only'
        );
      expect(replayEvent?.payload).toMatchObject({
        action: 'pause',
        request_id: 'req-request-only',
        intent_id: null
      });
      expect((replayEvent?.payload as { intent_id?: string | null } | undefined)?.intent_id).toBeNull();
      expect((replayEvent?.payload as { traceability?: Record<string, unknown> } | undefined)?.traceability?.intent_id).toBeNull();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves canonical null request_id for intent-only transport replay after newer actions', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, { enabled: true, idempotencyWindowMs: 120_000, nonceMaxTtlMs: 120_000 });
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
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-csrf-token': token,
        'Content-Type': 'application/json'
      };

      const first = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          intent_id: 'intent-only',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-intent-only',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:intent-only',
          transport_nonce: 'nonce-intent-only-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(first.status).toBe(200);

      const newerAction = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'resume',
          requested_by: 'delegate',
          request_id: 'req-newer-intent-only',
          intent_id: 'intent-newer-intent-only',
          reason: 'transport',
          transport: 'telegram',
          actor_id: 'actor-newer',
          actor_source: 'telegram.bot',
          transport_principal: 'telegram:chat:newer',
          transport_nonce: 'nonce-intent-only-2',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(newerAction.status).toBe(200);

      const replay = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-injected',
          intent_id: 'intent-only',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-override',
          actor_source: 'discord.bot',
          transport_principal: 'discord:channel:override',
          transport_nonce: 'nonce-intent-only-3',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(replay.status).toBe(200);
      const replayPayload = (await replay.json()) as {
        idempotent_replay?: boolean;
        control_seq?: number;
        traceability?: Record<string, unknown>;
      };
      expect(replayPayload.idempotent_replay).toBe(true);
      expect(replayPayload.control_seq).toBe(2);
      expect(replayPayload.traceability).toMatchObject({
        action: 'pause',
        decision: 'replayed',
        request_id: null,
        intent_id: 'intent-only',
        transport: 'discord',
        actor_id: 'actor-intent-only',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:intent-only'
      });
      expect(replayPayload.traceability?.request_id).toBeNull();
      expect(replayPayload.traceability?.request_id).not.toBe('req-injected');

      const replayEvent = [...events]
        .reverse()
        .find(
          (entry) =>
            entry.event === 'control_action_replayed' &&
            (entry.payload as { action?: string; intent_id?: string | null }).action === 'pause' &&
            (entry.payload as { intent_id?: string | null }).intent_id === 'intent-only'
        );
      expect(replayEvent?.payload).toMatchObject({
        action: 'pause',
        request_id: null,
        intent_id: 'intent-only'
      });
      expect((replayEvent?.payload as { request_id?: string | null } | undefined)?.request_id).toBeNull();
      expect((replayEvent?.payload as { traceability?: Record<string, unknown> } | undefined)?.traceability?.request_id).toBeNull();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('replays transport cancel requests before confirmation replay checks', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, {
      enabled: true,
      idempotencyWindowMs: 120_000,
      nonceMaxTtlMs: 120_000
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const params = {
        manifest_path: paths.manifestPath,
        transport: 'discord',
        actor_id: 'actor-transport',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:replay'
      };

      await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params })
      });
      const controlAfterConfirmationRaw = await readFile(paths.controlPath, 'utf8');
      const controlAfterConfirmation = JSON.parse(controlAfterConfirmationRaw) as {
        control_seq?: number;
        latest_action?: { action?: string | null; reason?: string | null };
      };
      expect(controlAfterConfirmation.control_seq).toBe(1);
      expect(controlAfterConfirmation.latest_action).toMatchObject({
        action: 'pause',
        reason: 'confirmation_required'
      });

      const listRes = await fetch(new URL('/confirmations', baseUrl), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const listPayload = (await listRes.json()) as { pending?: Array<Record<string, unknown>> };
      const requestId = (listPayload.pending?.[0]?.request_id as string | undefined) ?? '';
      expect(requestId).toBeTruthy();

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
      expect(confirmNonce).toBeTruthy();

      const firstCancel = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: 'req-transport-cancel',
          intent_id: 'intent-transport-cancel',
          reason: 'transport',
          confirm_nonce: confirmNonce,
          tool: 'delegate.cancel',
          params,
          transport: 'discord',
          actor_id: 'actor-transport',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:replay',
          transport_nonce: 'nonce-cancel-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(firstCancel.status).toBe(200);
      const firstPayload = (await firstCancel.json()) as {
        idempotent_replay?: boolean;
        control_seq?: number;
        traceability?: Record<string, unknown>;
      };
      expect(firstPayload.control_seq).toBe(2);
      expect(firstPayload.idempotent_replay).toBeUndefined();
      const canonicalRequestId = firstPayload.traceability?.request_id;
      expect(typeof canonicalRequestId).toBe('string');

      const replayCancel = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: 'req-transport-cancel',
          intent_id: 'intent-transport-cancel',
          reason: 'transport',
          confirm_nonce: confirmNonce,
          tool: 'delegate.cancel',
          params,
          transport: 'discord',
          actor_id: 'actor-override',
          actor_source: 'discord.bot',
          transport_principal: 'discord:channel:override',
          transport_nonce: 'nonce-cancel-2',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(replayCancel.status).toBe(200);
      const replayPayload = (await replayCancel.json()) as {
        idempotent_replay?: boolean;
        control_seq?: number;
        traceability?: Record<string, unknown>;
      };
      expect(replayPayload.control_seq).toBe(2);
      expect(replayPayload.idempotent_replay).toBe(true);
      expect(replayPayload.traceability).toMatchObject({
        action: 'cancel',
        decision: 'replayed',
        request_id: canonicalRequestId,
        intent_id: 'intent-transport-cancel',
        transport: 'discord',
        actor_id: 'actor-transport',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:replay'
      });
      expect(replayPayload.traceability?.actor_id).not.toBe('actor-override');
      expect(replayPayload.traceability?.actor_source).not.toBe('discord.bot');
      expect(replayPayload.traceability?.transport_principal).not.toBe('discord:channel:override');

      const reusedReplayNonce = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'pause',
          requested_by: 'delegate',
          request_id: 'req-reused-replay-nonce',
          intent_id: 'intent-reused-replay-nonce',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-transport',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:replay',
          transport_nonce: 'nonce-cancel-2',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(reusedReplayNonce.status).toBe(409);
      const reusedReplayNoncePayload = (await reusedReplayNonce.json()) as { error?: string };
      expect(reusedReplayNoncePayload.error).toBe('transport_nonce_replayed');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not replay transport cancel against non-transport latest_action replay matches', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const now = Date.now();
    await writeFile(
      paths.controlPath,
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 1,
        latest_action: {
          request_id: 'req-generic-cancel',
          intent_id: null,
          requested_by: 'delegate',
          requested_at: new Date(now).toISOString(),
          action: 'cancel',
          reason: 'manual'
        },
        feature_toggles: {
          transport_mutating_controls: {
            enabled: true,
            idempotency_window_ms: 120_000,
            nonce_max_ttl_ms: 120_000
          }
        }
      }),
      'utf8'
    );
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const res = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: 'req-generic-cancel',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-discord',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:replay-check',
          transport_nonce: 'nonce-generic-cancel-replay-check',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });

      expect(res.status).toBe(409);
      const payload = (await res.json()) as { error?: string; idempotent_replay?: boolean };
      expect(payload.error).toBe('confirmation_required');
      expect(payload.idempotent_replay).toBeUndefined();

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      const control = JSON.parse(controlRaw) as {
        control_seq?: number;
        latest_action?: { request_id?: string | null };
      };
      expect(control.control_seq).toBe(1);
      expect(control.latest_action?.request_id).toBe('req-generic-cancel');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not replay transport cancel when replay entry transport mismatches request transport', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const now = Date.now();
    await writeFile(
      paths.controlPath,
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 2,
        latest_action: {
          request_id: 'req-cross-transport-cancel',
          intent_id: null,
          requested_by: 'delegate',
          requested_at: new Date(now).toISOString(),
          action: 'cancel',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-discord',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:source'
        },
        feature_toggles: {
          transport_mutating_controls: {
            enabled: true,
            idempotency_window_ms: 120_000,
            nonce_max_ttl_ms: 120_000
          }
        },
        transport_mutation: {
          consumed_nonces: [],
          idempotency_index: [
            {
              key_type: 'request',
              key: 'req-cross-transport-cancel',
              action: 'cancel',
              transport: 'discord',
              request_id: 'req-cross-transport-cancel',
              intent_id: null,
              actor_id: 'actor-discord',
              actor_source: 'discord.oauth',
              transport_principal: 'discord:channel:source',
              control_seq: 2,
              recorded_at: new Date(now).toISOString(),
              expires_at: new Date(now + 60_000).toISOString()
            }
          ]
        }
      }),
      'utf8'
    );
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const res = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: 'req-cross-transport-cancel',
          reason: 'transport',
          transport: 'telegram',
          actor_id: 'actor-telegram',
          actor_source: 'telegram.oauth',
          transport_principal: 'telegram:chat:target',
          transport_nonce: 'nonce-cross-transport-cancel',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });

      expect(res.status).toBe(409);
      const payload = (await res.json()) as { error?: string; idempotent_replay?: boolean };
      expect(payload.error).toBe('confirmation_required');
      expect(payload.idempotent_replay).toBeUndefined();

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      const control = JSON.parse(controlRaw) as {
        control_seq?: number;
        latest_action?: { transport?: string | null };
      };
      expect(control.control_seq).toBe(2);
      expect(control.latest_action?.transport).toBe('discord');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not replay unqualified cancel requests against transport-scoped latest_action', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const now = Date.now();
    await writeFile(
      paths.controlPath,
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 2,
        latest_action: {
          request_id: 'req-transport-latest-cancel',
          intent_id: null,
          requested_by: 'delegate',
          requested_at: new Date(now).toISOString(),
          action: 'cancel',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-discord',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:source'
        },
        feature_toggles: {
          transport_mutating_controls: {
            enabled: true,
            idempotency_window_ms: 120_000,
            nonce_max_ttl_ms: 120_000
          }
        },
        transport_mutation: {
          consumed_nonces: [],
          idempotency_index: [
            {
              key_type: 'request',
              key: 'req-transport-latest-cancel',
              action: 'cancel',
              transport: 'discord',
              request_id: 'req-transport-latest-cancel',
              intent_id: null,
              actor_id: 'actor-discord',
              actor_source: 'discord.oauth',
              transport_principal: 'discord:channel:source',
              control_seq: 2,
              recorded_at: new Date(now).toISOString(),
              expires_at: new Date(now + 60_000).toISOString()
            }
          ]
        }
      }),
      'utf8'
    );
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const res = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: 'req-transport-latest-cancel',
          reason: 'manual'
        })
      });

      expect(res.status).toBe(409);
      const payload = (await res.json()) as { error?: string; idempotent_replay?: boolean };
      expect(payload.error).toBe('confirmation_required');
      expect(payload.idempotent_replay).toBeUndefined();

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      const control = JSON.parse(controlRaw) as {
        control_seq?: number;
        latest_action?: { transport?: string | null };
      };
      expect(control.control_seq).toBe(2);
      expect(control.latest_action?.transport).toBe('discord');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('ignores expired transport replay entries for cancel when nonce checks prune state', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    const now = Date.now();
    await writeFile(
      paths.controlPath,
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 2,
        latest_action: {
          request_id: 'req-latest',
          intent_id: 'intent-latest',
          requested_by: 'delegate',
          requested_at: new Date(now).toISOString(),
          action: 'pause',
          reason: 'manual',
          transport: 'discord',
          actor_id: 'actor-latest',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:latest'
        },
        feature_toggles: {
          transport_mutating_controls: {
            enabled: true,
            idempotency_window_ms: 120_000,
            nonce_max_ttl_ms: 120_000
          }
        },
        transport_mutation: {
          consumed_nonces: [],
          idempotency_index: [
            {
              key_type: 'request',
              key: 'req-expired-replay',
              action: 'cancel',
              transport: 'discord',
              request_id: 'req-expired-replay',
              intent_id: null,
              actor_id: 'actor-expired',
              actor_source: 'discord.oauth',
              transport_principal: 'discord:channel:expired',
              control_seq: 1,
              recorded_at: new Date(now - 60_000).toISOString(),
              expires_at: new Date(now - 1_000).toISOString()
            }
          ]
        }
      }),
      'utf8'
    );
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const replayAttempt = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: 'req-expired-replay',
          reason: 'manual',
          transport: 'discord',
          actor_id: 'actor-expired',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:expired',
          transport_nonce: 'nonce-expired-replay-check',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(replayAttempt.status).toBe(409);
      const replayPayload = (await replayAttempt.json()) as { error?: string; idempotent_replay?: boolean };
      expect(replayPayload.error).toBe('confirmation_required');
      expect(replayPayload.idempotent_replay).toBeUndefined();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('replays request-only transport cancel duplicates before confirmation challenge', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, {
      enabled: true,
      idempotencyWindowMs: 120_000,
      nonceMaxTtlMs: 120_000
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const externalRequestId = 'req-transport-request-only';
      const params = {
        manifest_path: paths.manifestPath,
        request_id: externalRequestId,
        transport: 'discord',
        actor_id: 'actor-request-only',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:request-only'
      };

      const createRes = await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params })
      });
      expect(createRes.status).toBe(200);
      const createPayload = (await createRes.json()) as { request_id?: string };
      const confirmRequestId = createPayload.request_id ?? '';
      expect(confirmRequestId).toBeTruthy();

      await fetch(new URL('/confirmations/approve', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: confirmRequestId, actor: 'ui' })
      });

      const issueRes = await fetch(new URL('/confirmations/issue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: confirmRequestId })
      });
      const issuePayload = (await issueRes.json()) as { confirm_nonce?: string };
      const confirmNonce = issuePayload.confirm_nonce ?? '';
      expect(confirmNonce).toBeTruthy();

      const firstCancel = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: externalRequestId,
          reason: 'transport',
          confirm_nonce: confirmNonce,
          tool: 'delegate.cancel',
          params,
          transport: 'discord',
          actor_id: 'actor-request-only',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:request-only',
          transport_nonce: 'nonce-cancel-request-only-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(firstCancel.status).toBe(200);
      const firstPayload = (await firstCancel.json()) as {
        idempotent_replay?: boolean;
        control_seq?: number;
        traceability?: Record<string, unknown>;
      };
      expect(firstPayload.control_seq).toBe(2);
      expect(firstPayload.idempotent_replay).toBeUndefined();
      expect(firstPayload.traceability?.request_id).toBe(externalRequestId);

      const replayCancel = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: externalRequestId,
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-override',
          actor_source: 'discord.bot',
          transport_principal: 'discord:channel:override',
          transport_nonce: 'nonce-cancel-request-only-2',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(replayCancel.status).toBe(200);
      const replayPayload = (await replayCancel.json()) as {
        idempotent_replay?: boolean;
        control_seq?: number;
        traceability?: Record<string, unknown>;
        error?: string;
      };
      expect(replayPayload.error).toBeUndefined();
      expect(replayPayload.idempotent_replay).toBe(true);
      expect(replayPayload.control_seq).toBe(2);
      expect(replayPayload.traceability).toMatchObject({
        action: 'cancel',
        decision: 'replayed',
        request_id: firstPayload.traceability?.request_id,
        actor_id: 'actor-request-only',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:request-only'
      });
      expect(replayPayload.traceability?.actor_id).not.toBe('actor-override');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects cancel confirmations when top-level transport metadata mismatches confirmed scope', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, {
      enabled: true,
      idempotencyWindowMs: 120_000,
      nonceMaxTtlMs: 120_000
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const externalRequestId = 'req-confirm-scope-mismatch';
      const params = {
        manifest_path: paths.manifestPath,
        request_id: externalRequestId,
        transport: 'discord',
        actor_id: 'actor-confirmed',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:confirmed'
      };

      const createRes = await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params })
      });
      expect(createRes.status).toBe(200);
      const createPayload = (await createRes.json()) as { request_id?: string };
      const confirmRequestId = createPayload.request_id ?? '';
      expect(confirmRequestId).toBeTruthy();

      await fetch(new URL('/confirmations/approve', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: confirmRequestId, actor: 'ui' })
      });

      const issueRes = await fetch(new URL('/confirmations/issue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: confirmRequestId })
      });
      const issuePayload = (await issueRes.json()) as { confirm_nonce?: string };
      const confirmNonce = issuePayload.confirm_nonce ?? '';
      expect(confirmNonce).toBeTruthy();

      const beforeCancelRaw = await readFile(paths.controlPath, 'utf8');
      const beforeCancel = JSON.parse(beforeCancelRaw) as {
        control_seq?: number;
        latest_action?: { action?: string | null };
      };

      const mismatchRes = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: externalRequestId,
          reason: 'transport',
          confirm_nonce: confirmNonce,
          tool: 'delegate.cancel',
          params,
          transport: 'telegram',
          actor_id: 'actor-untrusted',
          actor_source: 'telegram.bot',
          transport_principal: 'telegram:chat:untrusted',
          transport_nonce: 'nonce-confirm-scope-mismatch-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(mismatchRes.status).toBe(409);
      const mismatchPayload = (await mismatchRes.json()) as { error?: string; traceability?: Record<string, unknown> };
      expect(mismatchPayload.error).toBe('confirmation_scope_mismatch');
      expect(mismatchPayload.traceability?.transport).toBe('discord');

      const afterCancelRaw = await readFile(paths.controlPath, 'utf8');
      const afterCancel = JSON.parse(afterCancelRaw) as {
        control_seq?: number;
        latest_action?: { action?: string | null };
      };
      expect(afterCancel.control_seq).toBe(beforeCancel.control_seq);
      expect(afterCancel.latest_action?.action).toBe(beforeCancel.latest_action?.action);
      expect(afterCancel.latest_action?.action).not.toBe('cancel');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('binds confirmed transport scope when top-level transport fields are omitted', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, {
      enabled: true,
      idempotencyWindowMs: 120_000,
      nonceMaxTtlMs: 120_000
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const externalRequestId = 'req-confirm-scope-omitted-top-level';
      const params = {
        manifest_path: paths.manifestPath,
        request_id: externalRequestId,
        transport: 'discord',
        actor_id: 'actor-confirmed-omit',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:confirmed-omit'
      };

      const createRes = await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params })
      });
      expect(createRes.status).toBe(200);
      const createPayload = (await createRes.json()) as { request_id?: string };
      const confirmRequestId = createPayload.request_id ?? '';
      expect(confirmRequestId).toBeTruthy();

      await fetch(new URL('/confirmations/approve', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: confirmRequestId, actor: 'ui' })
      });

      const issueRes = await fetch(new URL('/confirmations/issue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: confirmRequestId })
      });
      const issuePayload = (await issueRes.json()) as { confirm_nonce?: string };
      const confirmNonce = issuePayload.confirm_nonce ?? '';
      expect(confirmNonce).toBeTruthy();

      const nonce = 'nonce-confirm-scope-omitted-top-level-1';
      const cancelRes = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: externalRequestId,
          reason: 'transport',
          confirm_nonce: confirmNonce,
          tool: 'delegate.cancel',
          params,
          transport_nonce: nonce,
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(cancelRes.status).toBe(200);
      const cancelPayload = (await cancelRes.json()) as { traceability?: Record<string, unknown> };
      expect(cancelPayload.traceability).toMatchObject({
        transport: 'discord',
        actor_id: 'actor-confirmed-omit',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:confirmed-omit'
      });

      const controlRaw = await readFile(paths.controlPath, 'utf8');
      const control = JSON.parse(controlRaw) as {
        latest_action?: {
          transport?: string | null;
          actor_id?: string | null;
          actor_source?: string | null;
          transport_principal?: string | null;
        };
        transport_mutation?: {
          consumed_nonces?: Array<{ action?: string; transport?: string; request_id?: string | null }>;
        };
      };
      expect(control.latest_action).toMatchObject({
        transport: 'discord',
        actor_id: 'actor-confirmed-omit',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:confirmed-omit'
      });
      const nonceConsumed =
        control.transport_mutation?.consumed_nonces?.some(
          (entry) => entry.action === 'cancel' && entry.transport === 'discord' && entry.request_id === externalRequestId
        ) ??
        false;
      expect(nonceConsumed).toBe(true);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not emit cancel apply/replay events when confirmation transport scope mismatches top-level metadata', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, {
      enabled: true,
      idempotencyWindowMs: 120_000,
      nonceMaxTtlMs: 120_000
    });
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
      const externalRequestId = 'req-confirm-scope-mismatch-events';
      const params = {
        manifest_path: paths.manifestPath,
        request_id: externalRequestId,
        transport: 'discord',
        actor_id: 'actor-confirmed-events',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:confirmed-events'
      };

      const createRes = await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params })
      });
      expect(createRes.status).toBe(200);
      const createPayload = (await createRes.json()) as { request_id?: string };
      const confirmRequestId = createPayload.request_id ?? '';
      expect(confirmRequestId).toBeTruthy();

      await fetch(new URL('/confirmations/approve', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: confirmRequestId, actor: 'ui' })
      });

      const issueRes = await fetch(new URL('/confirmations/issue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: confirmRequestId })
      });
      const issuePayload = (await issueRes.json()) as { confirm_nonce?: string };
      const confirmNonce = issuePayload.confirm_nonce ?? '';
      expect(confirmNonce).toBeTruthy();

      const mismatchRes = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: externalRequestId,
          reason: 'transport',
          confirm_nonce: confirmNonce,
          tool: 'delegate.cancel',
          params,
          transport: 'telegram',
          actor_id: 'actor-untrusted-events',
          actor_source: 'telegram.bot',
          transport_principal: 'telegram:chat:untrusted-events',
          transport_nonce: 'nonce-confirm-scope-mismatch-events-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(mismatchRes.status).toBe(409);
      const mismatchPayload = (await mismatchRes.json()) as { error?: string };
      expect(mismatchPayload.error).toBe('confirmation_scope_mismatch');

      const cancelActionEvent = events.find(
        (entry) =>
          (entry.event === 'control_action_applied' || entry.event === 'control_action_replayed') &&
          (entry.payload as { action?: string }).action === 'cancel'
      );
      expect(cancelActionEvent).toBeUndefined();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves canonical null intent_id for cancel replay responses when caller injects intent_id', async () => {
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
      const params = {
        manifest_path: paths.manifestPath,
        request_id: 'req-nontransport-cancel'
      };

      const createRes = await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params })
      });
      expect(createRes.status).toBe(200);
      const createPayload = (await createRes.json()) as { request_id?: string };
      const requestId = createPayload.request_id ?? '';
      expect(requestId).toBeTruthy();

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
      expect(confirmNonce).toBeTruthy();

      const firstCancel = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: 'req-nontransport-cancel',
          reason: 'manual',
          confirm_nonce: confirmNonce,
          tool: 'delegate.cancel',
          params
        })
      });
      expect(firstCancel.status).toBe(200);

      const replayCancel = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: 'req-nontransport-cancel',
          intent_id: 'intent-injected',
          reason: 'manual'
        })
      });
      expect(replayCancel.status).toBe(200);
      const replayPayload = (await replayCancel.json()) as {
        idempotent_replay?: boolean;
        traceability?: Record<string, unknown>;
      };
      expect(replayPayload.idempotent_replay).toBe(true);
      expect(replayPayload.traceability).toMatchObject({
        action: 'cancel',
        decision: 'replayed',
        request_id: 'req-nontransport-cancel',
        intent_id: null
      });
      expect(replayPayload.traceability?.intent_id).toBeNull();
      expect(replayPayload.traceability?.intent_id).not.toBe('intent-injected');

      const replayEvent = [...events]
        .reverse()
        .find(
          (entry) =>
            entry.event === 'control_action_replayed' &&
            (entry.payload as { action?: string; request_id?: string | null }).action === 'cancel' &&
            (entry.payload as { request_id?: string | null }).request_id === 'req-nontransport-cancel'
        );
      expect(replayEvent?.payload).toMatchObject({
        action: 'cancel',
        request_id: 'req-nontransport-cancel',
        intent_id: null
      });
      expect((replayEvent?.payload as { intent_id?: string | null } | undefined)?.intent_id).toBeNull();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('replays request-only transport cancel duplicates after newer actions and preserves canonical null intent', async () => {
    const { root, env, paths } = await createRunRoot('task-0940');
    await seedTransportMutatingControls(paths, {
      enabled: true,
      idempotencyWindowMs: 120_000,
      nonceMaxTtlMs: 120_000
    });
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
      const externalRequestId = 'req-transport-request-only-stale';
      const params = {
        manifest_path: paths.manifestPath,
        request_id: externalRequestId,
        transport: 'discord',
        actor_id: 'actor-request-only',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:request-only'
      };

      const createRes = await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel', tool: 'delegate.cancel', params })
      });
      expect(createRes.status).toBe(200);
      const createPayload = (await createRes.json()) as { request_id?: string };
      const confirmRequestId = createPayload.request_id ?? '';
      expect(confirmRequestId).toBeTruthy();

      await fetch(new URL('/confirmations/approve', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: confirmRequestId, actor: 'ui' })
      });

      const issueRes = await fetch(new URL('/confirmations/issue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: confirmRequestId })
      });
      const issuePayload = (await issueRes.json()) as { confirm_nonce?: string };
      const confirmNonce = issuePayload.confirm_nonce ?? '';
      expect(confirmNonce).toBeTruthy();

      const firstCancel = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: externalRequestId,
          reason: 'transport',
          confirm_nonce: confirmNonce,
          tool: 'delegate.cancel',
          params,
          transport: 'discord',
          actor_id: 'actor-request-only',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:request-only',
          transport_nonce: 'nonce-cancel-request-only-stale-1',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(firstCancel.status).toBe(200);

      const newerAction = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resume',
          requested_by: 'delegate',
          request_id: 'req-cancel-newer',
          intent_id: 'intent-cancel-newer',
          reason: 'transport',
          transport: 'telegram',
          actor_id: 'actor-newer',
          actor_source: 'telegram.bot',
          transport_principal: 'telegram:chat:newer',
          transport_nonce: 'nonce-cancel-request-only-stale-2',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(newerAction.status).toBe(200);

      const replayCancel = await fetch(new URL('/control/action', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          requested_by: 'delegate',
          request_id: externalRequestId,
          intent_id: 'intent-injected',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-override',
          actor_source: 'discord.bot',
          transport_principal: 'discord:channel:override',
          transport_nonce: 'nonce-cancel-request-only-stale-3',
          transport_nonce_expires_at: new Date(Date.now() + 60_000).toISOString()
        })
      });
      expect(replayCancel.status).toBe(200);
      const replayPayload = (await replayCancel.json()) as {
        idempotent_replay?: boolean;
        control_seq?: number;
        traceability?: Record<string, unknown>;
        error?: string;
      };
      expect(replayPayload.error).toBeUndefined();
      expect(replayPayload.idempotent_replay).toBe(true);
      expect(replayPayload.control_seq).toBe(3);
      expect(replayPayload.traceability).toMatchObject({
        action: 'cancel',
        decision: 'replayed',
        request_id: externalRequestId,
        intent_id: null,
        actor_id: 'actor-request-only',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:request-only'
      });
      expect(replayPayload.traceability?.intent_id).toBeNull();
      expect(replayPayload.traceability?.intent_id).not.toBe('intent-injected');
      expect(replayPayload.traceability?.actor_id).not.toBe('actor-override');

      const replayEvent = [...events]
        .reverse()
        .find(
          (entry) =>
            entry.event === 'control_action_replayed' &&
            (entry.payload as { action?: string; request_id?: string | null }).action === 'cancel' &&
            (entry.payload as { request_id?: string | null }).request_id === externalRequestId
        );
      expect(replayEvent?.payload).toMatchObject({
        action: 'cancel',
        request_id: externalRequestId,
        intent_id: null
      });
      expect((replayEvent?.payload as { intent_id?: string | null } | undefined)?.intent_id).toBeNull();
      expect((replayEvent?.payload as { traceability?: Record<string, unknown> } | undefined)?.traceability?.intent_id).toBeNull();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('increments control_seq once for confirmation auto-pause and keeps it stable for duplicate creates', async () => {
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
      const createBody = {
        action: 'cancel',
        tool: 'delegate.cancel',
        params: {
          manifest_path: paths.manifestPath
        }
      };

      const firstCreate = await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createBody)
      });
      expect(firstCreate.status).toBe(200);
      const firstCreatePayload = (await firstCreate.json()) as { request_id?: string };
      const firstRequestId = firstCreatePayload.request_id ?? '';
      expect(firstRequestId).toBeTruthy();

      const afterFirstRaw = await readFile(paths.controlPath, 'utf8');
      const afterFirst = JSON.parse(afterFirstRaw) as {
        control_seq?: number;
        latest_action?: { action?: string | null; reason?: string | null; request_id?: string | null };
      };
      expect(afterFirst.control_seq).toBe(1);
      expect(afterFirst.latest_action).toMatchObject({
        action: 'pause',
        reason: 'confirmation_required',
        request_id: firstRequestId
      });

      const duplicateCreate = await fetch(new URL('/confirmations/create', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createBody)
      });
      expect(duplicateCreate.status).toBe(200);
      const duplicatePayload = (await duplicateCreate.json()) as { request_id?: string };
      expect(duplicatePayload.request_id).toBe(firstRequestId);

      const afterDuplicateRaw = await readFile(paths.controlPath, 'utf8');
      const afterDuplicate = JSON.parse(afterDuplicateRaw) as {
        control_seq?: number;
        latest_action?: { request_id?: string | null };
      };
      expect(afterDuplicate.control_seq).toBe(1);
      expect(afterDuplicate.latest_action?.request_id).toBe(firstRequestId);
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

  it('resumes child runs when answered questions use a custom run root under an allowed root', async () => {
    const { root, env, paths } = await createRunRoot('parent-task');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    config.ui.allowedRunRoots = [root];

    const childRunDir = join(root, 'custom_runs', 'child-task', 'cli', 'child-run');
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

  it('accepts question enqueue when manifest path uses a custom run root under an allowed root', async () => {
    const { root, env, paths } = await createRunRoot('parent-task');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    config.ui.allowedRunRoots = [root];

    const childRunDir = join(root, 'custom_runs', 'child-task', 'cli', 'child-run');
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
          prompt: 'Outside canonical layout',
          urgency: 'med',
          auto_pause: true
        })
      });

      expect(enqueueRes.status).toBe(200);
      const payload = (await enqueueRes.json()) as { question_id?: string; from_manifest_path?: string | null };
      expect(payload.question_id).toMatch(/^q-/);
      expect(payload.from_manifest_path).toBeTruthy();
    } finally {
      await parentServer.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects question enqueue when child manifest symlink escapes allowed run roots', async () => {
    const { root, env, paths } = await createRunRoot('parent-task');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    config.ui.allowedRunRoots = [root];

    const localRunDir = join(root, '.runs', 'child-task', 'cli', 'child-run');
    await mkdir(localRunDir, { recursive: true });

    const outsideRoot = await mkdtemp(join(tmpdir(), 'control-server-child-outside-'));
    const outsideRunDir = join(outsideRoot, '.runs', 'child-task', 'cli', 'child-run');
    await mkdir(outsideRunDir, { recursive: true });
    const outsideManifestPath = join(outsideRunDir, 'manifest.json');
    await writeFile(outsideManifestPath, JSON.stringify({ run_id: 'child-run' }), 'utf8');

    const childManifestPath = join(localRunDir, 'manifest.json');
    await symlink(outsideManifestPath, childManifestPath);

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
          prompt: 'Symlink escape',
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
