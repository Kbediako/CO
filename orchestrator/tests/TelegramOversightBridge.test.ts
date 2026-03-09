import http from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ControlServer } from '../src/cli/control/controlServer.js';
import type { ControlSelectedRunRuntimeSnapshot } from '../src/cli/control/observabilityReadModel.js';
import { startTelegramOversightBridge } from '../src/cli/control/telegramOversightBridge.js';
import { computeEffectiveDelegationConfig } from '../src/cli/config/delegationConfig.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

async function createRunRoot(taskId: string) {
  const root = await mkdtemp(join(tmpdir(), 'telegram-oversight-'));
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

async function seedQuestions(
  paths: ReturnType<typeof resolveRunPaths>,
  questions: Array<Record<string, unknown>>
): Promise<void> {
  await writeFile(paths.questionsPath, JSON.stringify({ questions }), 'utf8');
}

async function waitForCondition(check: () => Promise<boolean>, timeoutMs = 5_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('condition_timeout');
}

interface TelegramHarness {
  sentMessages: Array<{ chat_id: string; text: string }>;
  updates: Array<Record<string, unknown>>;
  fetch: typeof fetch;
}

function createTelegramHarness(
  realFetch: typeof fetch,
  options: {
    failSendMessageCount?: number;
  } = {}
): TelegramHarness {
  const sentMessages: Array<{ chat_id: string; text: string }> = [];
  const updates: Array<Record<string, unknown>> = [];
  let remainingSendFailures = options.failSendMessageCount ?? 0;

  const fetchImpl: typeof fetch = async (input, init) => {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(rawUrl);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (url.origin !== 'https://api.telegram.org') {
      if (url.pathname === '/control/action' && method === 'POST') {
        return realFetch(input, init);
      }
      throw new Error(`unexpected_non_telegram_fetch:${method}:${url.pathname}`);
    }

    if (url.pathname.endsWith('/getMe')) {
      return jsonResponse({
        ok: true,
        result: {
          id: 8041324726,
          is_bot: true,
          first_name: 'CO Test Bot',
          username: 'co_test_advisory_bot'
        }
      });
    }

    if (url.pathname.endsWith('/getUpdates')) {
      const offset = Number.parseInt(url.searchParams.get('offset') ?? '0', 10);
      const result = updates.filter((update) => {
        const updateId = typeof update.update_id === 'number' ? update.update_id : -1;
        return updateId >= offset;
      });
      return jsonResponse({ ok: true, result });
    }

    if (url.pathname.endsWith('/sendMessage')) {
      if (remainingSendFailures > 0) {
        remainingSendFailures -= 1;
        return jsonResponse(
          {
            ok: false,
            description: 'simulated_send_failure'
          },
          500
        );
      }
      const body = JSON.parse(String(init?.body ?? '{}')) as { chat_id?: string | number; text?: string };
      sentMessages.push({
        chat_id: String(body.chat_id ?? ''),
        text: String(body.text ?? '')
      });
      return jsonResponse({ ok: true, result: { message_id: sentMessages.length } });
    }

    throw new Error(`unexpected_telegram_method:${url.pathname}`);
  };

  return {
    sentMessages,
    updates,
    fetch: fetchImpl
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function buildTelegramStatePayload(input: {
  prompt: string;
  urgency: 'low' | 'medium' | 'high';
}): ControlSelectedRunRuntimeSnapshot {
  return {
    selected: {
      issueId: 'task-1025',
      issueIdentifier: 'task-1025',
      taskId: 'task-1025',
      runId: 'run-1',
      rawStatus: 'in_progress',
      displayStatus: 'awaiting_input',
      statusReason: 'queued_questions',
      startedAt: '2026-03-06T07:00:00.000Z',
      updatedAt: '2026-03-06T07:01:00.000Z',
      completedAt: null,
      summary: 'Awaiting operator input',
      lastError: null,
      latestAction: null,
      latestEvent: null,
      workspacePath: '/tmp/co',
      questionSummary: {
        queuedCount: 1,
        latestQuestion: {
          questionId: 'q-1025',
          prompt: input.prompt,
          urgency: input.urgency,
          queuedAt: '2026-03-06T07:01:00.000Z'
        }
      },
      tracked: null
    },
    dispatchPilot: null,
    tracked: null
  };
}

function signLinearWebhook(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('TelegramOversightBridge', () => {
  it('renders selected-run status issue and queued questions through the integrated polling bridge', async () => {
    const { root, env, paths } = await createRunRoot('task-1014-telegram-status');
    await seedManifest(paths);
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
            reason: 'signal threshold met'
          }
        }
      }
    });
    await seedQuestions(paths, [
      {
        question_id: 'q-0001',
        parent_run_id: 'run-parent',
        from_run_id: 'run-child',
        prompt: 'Should we keep polling enabled?',
        urgency: 'high',
        status: 'queued',
        queued_at: new Date().toISOString(),
        expires_at: null,
        expires_in_ms: null,
        auto_pause: true,
        expiry_fallback: null
      }
    ]);
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
    const realFetch = globalThis.fetch;
    const telegram = createTelegramHarness(realFetch);

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');
    vi.stubGlobal('fetch', telegram.fetch);

    const server = await ControlServer.start({
      paths,
      config,
      eventStream,
      runId: 'run-1'
    });

    try {
      telegram.updates.push({
        update_id: 100,
        message: {
          message_id: 1,
          text: '/status',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () =>
        telegram.sentMessages.some((message) => message.text.includes('CO status'))
      );

      const statusMessage = telegram.sentMessages.find((message) => message.text.includes('CO status'));
      expect(statusMessage?.chat_id).toBe('1234');
      expect(statusMessage?.text).toContain('Issue: task-0940');
      expect(statusMessage?.text).toContain('State: paused (raw in_progress)');
      expect(statusMessage?.text).toContain('Reason: queued_questions');
      expect(statusMessage?.text).toContain('Queued questions: 1');
      expect(statusMessage?.text).toContain('Dispatch: ready/ready');

      telegram.updates.push({
        update_id: 101,
        message: {
          message_id: 2,
          text: '/issue',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () =>
        telegram.sentMessages.some((message) => message.text.includes('Issue task-0940'))
      );

      const issueMessage = telegram.sentMessages.find((message) => message.text.includes('Issue task-0940'));
      expect(issueMessage?.text).toContain('Status: paused (raw in_progress)');
      expect(issueMessage?.text).toContain('Reason: queued_questions');
      expect(issueMessage?.text).toContain('Latest event: pause');
      expect(issueMessage?.text).toContain('Queued questions: 1');

      telegram.updates.push({
        update_id: 102,
        message: {
          message_id: 3,
          text: '/dispatch',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () =>
        telegram.sentMessages.some((message) => message.text.includes('Dispatch advisory'))
      );

      const dispatchMessage = telegram.sentMessages.find((message) => message.text.includes('Dispatch advisory'));
      expect(dispatchMessage?.text).toContain('Dispatch: ready/ready');
      const dispatchEvaluatedEvent = events.find((entry) => entry.event === 'dispatch_pilot_evaluated');
      const dispatchViewedEvent = events.find((entry) => entry.event === 'dispatch_pilot_viewed');
      expect(dispatchEvaluatedEvent?.payload).toMatchObject({ surface: 'telegram_dispatch' });
      expect(dispatchViewedEvent?.payload).toMatchObject({ surface: 'telegram_dispatch' });

      telegram.updates.push({
        update_id: 103,
        message: {
          message_id: 4,
          text: '/questions',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () =>
        JSON.parse(await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8')).next_update_id === 104
      );

      const questionsMessage = telegram.sentMessages.find((message) =>
        message.text.includes('q-0001 [high]: Should we keep polling enabled?')
      );
      expect(questionsMessage?.text).toContain('q-0001 [high]');
      expect(questionsMessage?.text).toContain('Should we keep polling enabled?');

      const stateRaw = await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8');
      const bridgeState = JSON.parse(stateRaw) as { next_update_id?: number };
      expect(bridgeState.next_update_id).toBe(104);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('routes pause and resume through transport-mutating control policy', async () => {
    const { root, env, paths } = await createRunRoot('task-1014-telegram-mutations');
    await seedManifest(paths);
    await seedTransportMutatingControls(paths, {
      enabled: true,
      allowedTransports: ['telegram'],
      idempotencyWindowMs: 120_000,
      nonceMaxTtlMs: 120_000
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const realFetch = globalThis.fetch;
    const telegram = createTelegramHarness(realFetch);

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_ENABLE_MUTATIONS', '1');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');
    vi.stubGlobal('fetch', telegram.fetch);

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      expect(token).toBeTruthy();

      telegram.updates.push({
        update_id: 200,
        message: {
          message_id: 1,
          text: '/pause',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () => {
        const raw = await readFile(paths.controlPath, 'utf8');
        const control = JSON.parse(raw) as {
          latest_action?: {
            action?: string | null;
            transport?: string | null;
            actor_id?: string | null;
            actor_source?: string | null;
            transport_principal?: string | null;
          };
        };
        return control.latest_action?.action === 'pause';
      });

      const pausedRaw = await readFile(paths.controlPath, 'utf8');
      const pausedControl = JSON.parse(pausedRaw) as {
        latest_action?: {
          action?: string | null;
          transport?: string | null;
          actor_id?: string | null;
          actor_source?: string | null;
          transport_principal?: string | null;
        };
      };
      expect(pausedControl.latest_action).toMatchObject({
        action: 'pause',
        transport: 'telegram',
        actor_id: 'telegram.user.77',
        actor_source: 'telegram.bot.polling',
        transport_principal: 'telegram:chat:1234'
      });
      expect(
        telegram.sentMessages.some((message) => message.text.includes('Pause requested. Control decision: applied'))
      ).toBe(true);

      telegram.updates.push({
        update_id: 201,
        message: {
          message_id: 2,
          text: '/resume',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () => {
        const raw = await readFile(paths.controlPath, 'utf8');
        const control = JSON.parse(raw) as {
          latest_action?: {
            action?: string | null;
            transport?: string | null;
          };
        };
        return control.latest_action?.action === 'resume' && control.latest_action?.transport === 'telegram';
      });

      expect(
        telegram.sentMessages.some((message) => message.text.includes('Resume requested. Control decision: applied'))
      ).toBe(true);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not immediately retry freshly expired child questions during Telegram /questions reads', async () => {
    const { root, env, paths } = await createRunRoot('task-1074-telegram-question-read-dedupe');
    await seedManifest(paths, { task_id: 'task-1074' });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const events: import('../src/cli/events/runEventStream.js').RunEventStreamEntry[] = [];
    const eventStream = {
      append: async (entry: { event: string; actor: string; payload: Record<string, unknown> }) => {
        const record = {
          schema_version: 1,
          seq: events.length + 1,
          timestamp: new Date().toISOString(),
          task_id: 'task-1074',
          run_id: 'parent-run',
          event: entry.event,
          actor: entry.actor,
          payload: entry.payload
        };
        events.push(record);
        return record;
      },
      close: async () => undefined
    } as unknown as import('../src/cli/events/runEventStream.js').RunEventStream;

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

    let childControlAttempts = 0;
    const childServer = http.createServer((req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        childControlAttempts += 1;
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
    await writeFile(
      join(childRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: `http://127.0.0.1:${childPort}`,
        token_path: childTokenPath
      }),
      'utf8'
    );

    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    const queuedAt = new Date(Date.now() - 120_000).toISOString();
    await seedQuestions(paths, [
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
    ]);

    const realFetch = globalThis.fetch;
    const telegram = createTelegramHarness(realFetch);

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');
    vi.stubGlobal('fetch', telegram.fetch);

    const server = await ControlServer.start({
      paths,
      config,
      eventStream,
      runId: 'parent-run'
    });

    try {
      telegram.updates.push({
        update_id: 300,
        message: {
          message_id: 1,
          text: '/questions',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () => {
        if (!telegram.sentMessages.some((message) => message.text.includes('No queued questions.'))) {
          return false;
        }
        try {
          const stateRaw = await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8');
          const parsed = JSON.parse(stateRaw) as { next_update_id?: number };
          return parsed.next_update_id === 301;
        } catch {
          return false;
        }
      });

      const stateRaw = await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8');
      const bridgeState = JSON.parse(stateRaw) as { next_update_id?: number };
      expect(bridgeState.next_update_id).toBe(301);
      expect(childControlAttempts).toBe(1);
      expect(events.filter((entry) => entry.event === 'question.resolve_child_fallback')).toHaveLength(1);
      expect(telegram.sentMessages.some((message) => message.text.includes('No queued questions.'))).toBe(true);
    } finally {
      await server.close();
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('retries answered child questions during Telegram /questions reads', async () => {
    const { root, env, paths } = await createRunRoot('task-1075-telegram-question-read-sequence');
    await seedManifest(paths, { task_id: 'task-1075' });
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

    let childAction: Record<string, unknown> | null = null;
    let resolveChildAction: ((payload: Record<string, unknown>) => void) | null = null;
    const childActionPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveChildAction = resolve;
    });
    const childServer = http.createServer(async (req, res) => {
      if (req.url === '/control/action' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        childAction = JSON.parse(body || '{}') as Record<string, unknown>;
        resolveChildAction?.(childAction);
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
    await writeFile(
      join(childRunDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: `http://127.0.0.1:${childPort}`,
        token_path: childTokenPath
      }),
      'utf8'
    );

    const queuedAt = new Date(Date.now() - 120_000).toISOString();
    const answeredAt = new Date(Date.now() - 60_000).toISOString();
    await seedQuestions(paths, [
      {
        question_id: 'q-0001',
        parent_run_id: 'parent-run',
        from_run_id: 'child-run',
        from_manifest_path: childManifestPath,
        prompt: 'Approval needed',
        urgency: 'high',
        status: 'answered',
        queued_at: queuedAt,
        answer: 'Approved',
        answered_by: 'ui',
        answered_at: answeredAt,
        closed_at: answeredAt,
        auto_pause: true
      }
    ]);

    const realFetch = globalThis.fetch;
    const telegram = createTelegramHarness(realFetch);

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');
    vi.stubGlobal('fetch', telegram.fetch);

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'parent-run'
    });

    try {
      telegram.updates.push({
        update_id: 300,
        message: {
          message_id: 1,
          text: '/questions',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () =>
        telegram.sentMessages.some((message) => message.text.includes('No queued questions.'))
      );

      const action = await Promise.race([
        childActionPromise,
        new Promise<Record<string, unknown>>((_, reject) =>
          setTimeout(() => reject(new Error('timed out waiting for child action')), 2000)
        )
      ]);
      expect(action).toMatchObject({
        action: 'resume',
        reason: 'question_answered'
      });
      expect(childAction).toMatchObject({
        action: 'resume',
        reason: 'question_answered'
      });
      expect(telegram.sentMessages.some((message) => message.text.includes('No queued questions.'))).toBe(true);
    } finally {
      await server.close();
      await new Promise<void>((resolve) => childServer.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });

  it('continues polling after one update fails and advances the Telegram offset', async () => {
    const { root, env, paths } = await createRunRoot('task-1014-telegram-recovery');
    await seedManifest(paths);
    await seedDispatchPilot(paths, {
      enabled: true,
      source: {
        provider: 'linear',
        team_id: 'lin-team-ready',
        summary: 'route advisory to queue',
        reason: 'signal threshold met'
      }
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const realFetch = globalThis.fetch;
    const telegram = createTelegramHarness(realFetch, { failSendMessageCount: 1 });

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');
    vi.stubGlobal('fetch', telegram.fetch);

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      telegram.updates.push({
        update_id: 200,
        message: {
          message_id: 1,
          text: '/help',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });
      telegram.updates.push({
        update_id: 201,
        message: {
          message_id: 2,
          text: '/status',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () => {
        if (!telegram.sentMessages.some((message) => message.text.includes('CO status'))) {
          return false;
        }
        try {
          const stateRaw = await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8');
          const parsed = JSON.parse(stateRaw) as { next_update_id?: number };
          return parsed.next_update_id === 202;
        } catch {
          return false;
        }
      });
      const stateRaw = await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8');
      const state = JSON.parse(stateRaw) as { next_update_id?: number };
      expect(state.next_update_id).toBe(202);
      expect(telegram.sentMessages.some((message) => message.text.includes('CO status'))).toBe(true);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('sends deduped projection-driven push notifications when enabled', async () => {
    const { root, env, paths } = await createRunRoot('task-1016-telegram-push');
    await seedManifest(paths, {
      summary: 'task is running',
      updated_at: '2026-03-06T04:00:00.000Z'
    });
    await seedControlState(paths, {
      control_seq: 1,
      latest_action: {
        action: 'pause',
        requested_at: '2026-03-06T04:01:00.000Z',
        requested_by: 'operator',
        reason: 'manual_pause'
      }
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const realFetch = globalThis.fetch;
    const telegram = createTelegramHarness(realFetch);

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_PUSH_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_PUSH_INTERVAL_MS', '1');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');
    vi.stubGlobal('fetch', telegram.fetch);

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      server.broadcast({
        schema_version: 1,
        seq: 1,
        timestamp: '2026-03-06T04:02:00.000Z',
        task_id: 'task-0940',
        run_id: 'run-1',
        event: 'run_updated',
        actor: 'runner',
        payload: { summary: 'initial broadcast' }
      });

      await waitForCondition(async () => telegram.sentMessages.length === 1);
      expect(telegram.sentMessages[0]?.text).toContain('CO status');
      expect(telegram.sentMessages[0]?.text).toContain('Summary: task is running');

      server.broadcast({
        schema_version: 1,
        seq: 2,
        timestamp: '2026-03-06T04:03:00.000Z',
        task_id: 'task-0940',
        run_id: 'run-1',
        event: 'run_updated',
        actor: 'runner',
        payload: { summary: 'duplicate projection' }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(telegram.sentMessages).toHaveLength(1);

      await writeFile(
        paths.manifestPath,
        JSON.stringify({
          run_id: 'run-1',
          task_id: 'task-0940',
          status: 'in_progress',
          started_at: '2026-03-06T04:00:00.000Z',
          updated_at: '2026-03-06T04:04:00.000Z',
          completed_at: null,
          summary: 'task needs review',
          commands: [],
          approvals: []
        }),
        'utf8'
      );

      server.broadcast({
        schema_version: 1,
        seq: 3,
        timestamp: '2026-03-06T04:04:30.000Z',
        task_id: 'task-0940',
        run_id: 'run-1',
        event: 'run_updated',
        actor: 'runner',
        payload: { summary: 'projection changed' }
      });

      await waitForCondition(async () => telegram.sentMessages.length === 2);
      expect(telegram.sentMessages[1]?.text).toContain('Summary: task needs review');

      const stateRaw = await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8');
      const state = JSON.parse(stateRaw) as {
        push?: {
          last_sent_projection_hash?: string | null;
          last_sent_at?: string | null;
          last_event_seq?: number | null;
          pending_projection_hash?: string | null;
          pending_projection_observed_at?: string | null;
        };
      };
      expect(state.push?.last_sent_projection_hash).toBeTruthy();
      expect(state.push?.last_sent_at).toBeTruthy();
      expect(state.push?.last_event_seq).toBe(3);
      expect(state.push?.pending_projection_hash).toBeNull();
      expect(state.push?.pending_projection_observed_at).toBeNull();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('persists a pending projection during cooldown and flushes it on the next signal', async () => {
    const { root, env, paths } = await createRunRoot('task-1016-telegram-push-cooldown');
    await seedManifest(paths, {
      summary: 'task is running',
      updated_at: '2026-03-06T04:00:00.000Z'
    });
    await seedControlState(paths, {
      control_seq: 1,
      latest_action: {
        action: 'pause',
        requested_at: '2026-03-06T04:01:00.000Z',
        requested_by: 'operator',
        reason: 'manual_pause'
      }
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const realFetch = globalThis.fetch;
    const telegram = createTelegramHarness(realFetch);

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_PUSH_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_PUSH_INTERVAL_MS', '250');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');
    vi.stubGlobal('fetch', telegram.fetch);

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      server.broadcast({
        schema_version: 1,
        seq: 1,
        timestamp: '2026-03-06T04:02:00.000Z',
        task_id: 'task-0940',
        run_id: 'run-1',
        event: 'run_updated',
        actor: 'runner',
        payload: { summary: 'initial broadcast' }
      });

      await waitForCondition(async () => telegram.sentMessages.length === 1);

      await writeFile(
        paths.manifestPath,
        JSON.stringify({
          run_id: 'run-1',
          task_id: 'task-0940',
          status: 'in_progress',
          started_at: '2026-03-06T04:00:00.000Z',
          updated_at: '2026-03-06T04:04:00.000Z',
          completed_at: null,
          summary: 'task needs review',
          commands: [],
          approvals: []
        }),
        'utf8'
      );

      server.broadcast({
        schema_version: 1,
        seq: 2,
        timestamp: '2026-03-06T04:03:00.000Z',
        task_id: 'task-0940',
        run_id: 'run-1',
        event: 'run_updated',
        actor: 'runner',
        payload: { summary: 'projection changed during cooldown' }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(telegram.sentMessages).toHaveLength(1);

      const pendingStateRaw = await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8');
      const pendingState = JSON.parse(pendingStateRaw) as {
        push?: {
          last_sent_projection_hash?: string | null;
          last_event_seq?: number | null;
          pending_projection_hash?: string | null;
          pending_projection_observed_at?: string | null;
        };
      };
      expect(pendingState.push?.last_event_seq).toBe(2);
      expect(pendingState.push?.pending_projection_hash).toBeTruthy();
      expect(pendingState.push?.pending_projection_hash).not.toBe(pendingState.push?.last_sent_projection_hash);
      expect(pendingState.push?.pending_projection_observed_at).toBeTruthy();

      await new Promise((resolve) => setTimeout(resolve, 200));

      server.broadcast({
        schema_version: 1,
        seq: 3,
        timestamp: '2026-03-06T04:04:30.000Z',
        task_id: 'task-0940',
        run_id: 'run-1',
        event: 'run_updated',
        actor: 'runner',
        payload: { summary: 'flush pending projection' }
      });

      await waitForCondition(async () => telegram.sentMessages.length === 2);
      expect(telegram.sentMessages[1]?.text).toContain('Summary: task needs review');

      const flushedStateRaw = await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8');
      const flushedState = JSON.parse(flushedStateRaw) as {
        push?: {
          last_event_seq?: number | null;
          pending_projection_hash?: string | null;
          pending_projection_observed_at?: string | null;
        };
      };
      expect(flushedState.push?.last_event_seq).toBe(3);
      expect(flushedState.push?.pending_projection_hash).toBeNull();
      expect(flushedState.push?.pending_projection_observed_at).toBeNull();
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('sends projection-driven push notifications when queued questions are added and cleared', async () => {
    const { root, env, paths } = await createRunRoot('task-1016-telegram-question-push');
    await seedManifest(paths, {
      summary: 'task is running',
      updated_at: '2026-03-06T05:00:00.000Z'
    });
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const realFetch = globalThis.fetch;
    const telegram = createTelegramHarness(realFetch);

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_PUSH_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_PUSH_INTERVAL_MS', '1');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');
    vi.stubGlobal('fetch', telegram.fetch);

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const token = await readToken(paths.controlAuthPath);
      const baseUrl = server.getBaseUrl() ?? '';
      const serverFetch: typeof fetch = (input, init) => realFetch(input, init);

      await serverFetch(new URL('/delegation/register', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: 'delegation-token',
          parent_run_id: 'run-1',
          child_run_id: 'child-run'
        })
      });

      const enqueueRes = await serverFetch(new URL('/questions/enqueue', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json',
          'x-codex-delegation-token': 'delegation-token',
          'x-codex-delegation-run-id': 'child-run'
        },
        body: JSON.stringify({
          prompt: 'Need operator approval',
          urgency: 'high',
          auto_pause: true,
          expiry_fallback: 'resume'
        })
      });
      const enqueuePayload = (await enqueueRes.json()) as { question_id?: string };
      const questionId = enqueuePayload.question_id ?? '';
      expect(questionId).toMatch(/^q-/);

      await waitForCondition(async () => telegram.sentMessages.length === 1);
      expect(telegram.sentMessages[0]?.text).toContain('CO status');
      expect(telegram.sentMessages[0]?.text).toContain('Queued questions: 1');
      expect(telegram.sentMessages[0]?.text).toContain('latest ' + questionId);

      const answerRes = await serverFetch(new URL('/questions/answer', baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question_id: questionId,
          answer: 'Approved',
          answered_by: 'ui'
        })
      });
      expect(answerRes.status).toBe(200);

      await waitForCondition(async () => telegram.sentMessages.length === 2);
      expect(telegram.sentMessages[1]?.text).toContain('CO status');
      expect(telegram.sentMessages[1]?.text).not.toContain('Queued questions: 1');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('sends a new projection push when prompt or urgency changes under the same latest question id', async () => {
    const { root, paths } = await createRunRoot('task-1025-telegram-question-fingerprint');
    const telegram = createTelegramHarness(globalThis.fetch);
    let statePayload = buildTelegramStatePayload({
      prompt: 'Need operator approval',
      urgency: 'high'
    });

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_PUSH_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_PUSH_INTERVAL_MS', '1');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');

    const bridge = await startTelegramOversightBridge({
      runDir: paths.runDir,
      readAdapter: {
        readSelectedRun: async () => statePayload,
        readDispatch: async () => ({}),
        readQuestions: async () => ({ questions: [] }),
      },
      baseUrl: 'http://127.0.0.1:1',
      controlToken: 'control-token',
      env: process.env,
      fetchImpl: telegram.fetch
    });

    if (!bridge) {
      throw new Error('expected telegram bridge');
    }

    try {
      await bridge.notifyProjectionDelta({ eventSeq: 1 });
      await waitForCondition(async () => telegram.sentMessages.length === 1);
      expect(telegram.sentMessages[0]?.text).toContain('latest q-1025 [high]: Need operator approval');

      await new Promise((resolve) => setTimeout(resolve, 5));
      statePayload = buildTelegramStatePayload({
        prompt: 'Need operator approval before retry',
        urgency: 'high'
      });

      await bridge.notifyProjectionDelta({ eventSeq: 2 });
      await waitForCondition(async () => telegram.sentMessages.length === 2);
      expect(telegram.sentMessages[1]?.text).toContain(
        'latest q-1025 [high]: Need operator approval before retry'
      );

      await new Promise((resolve) => setTimeout(resolve, 5));
      statePayload = buildTelegramStatePayload({
        prompt: 'Need operator approval before retry',
        urgency: 'medium'
      });

      await bridge.notifyProjectionDelta({ eventSeq: 3 });
      await waitForCondition(async () => telegram.sentMessages.length === 3);
      expect(telegram.sentMessages[2]?.text).toContain(
        'latest q-1025 [medium]: Need operator approval before retry'
      );
    } finally {
      await bridge.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('renders no-selected status and issue fallbacks through the polling bridge', async () => {
    const { root, paths } = await createRunRoot('task-1026-telegram-no-selected');
    const telegram = createTelegramHarness(globalThis.fetch);
    const statePayload: ControlSelectedRunRuntimeSnapshot = {
      selected: null,
      tracked: {
        linear: {
          id: 'lin-issue-1',
          identifier: 'PREPROD-101',
          title: 'Investigate advisory routing',
          url: 'https://linear.app/asabeko/issue/PREPROD-101',
          state: 'In Progress',
          state_type: 'started',
          workspace_id: 'lin-workspace-1',
          team_id: 'lin-team-live',
          team_key: 'PREPROD',
          team_name: 'PRE-PRO/PRODUCTION',
          project_id: 'lin-project-1',
          project_name: 'Icon Agency (Bookings)',
          updated_at: '2026-03-06T07:01:00.000Z',
          recent_activity: []
        }
      },
      dispatchPilot: {
        advisory_only: true,
        configured: true,
        enabled: true,
        kill_switch: false,
        status: 'ready',
        source_status: 'ready',
        reason: 'dispatch_source_live_deferred',
        source_setup: {
          provider: 'linear',
          workspace_id: 'lin-workspace-1',
          team_id: 'lin-team-live',
          project_id: 'lin-project-1'
        }
      }
    };

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');

    const bridge = await startTelegramOversightBridge({
      runDir: paths.runDir,
      readAdapter: {
        readSelectedRun: async () => statePayload,
        readDispatch: async () => ({}),
        readQuestions: async () => ({ questions: [] }),
      },
      baseUrl: 'http://127.0.0.1:1',
      controlToken: 'control-token',
      env: process.env,
      fetchImpl: telegram.fetch
    });

    if (!bridge) {
      throw new Error('expected telegram bridge');
    }

    try {
      telegram.updates.push({
        update_id: 1,
        message: {
          message_id: 1,
          text: '/status',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });
      telegram.updates.push({
        update_id: 2,
        message: {
          message_id: 2,
          text: '/issue',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () => telegram.sentMessages.length === 2);
      expect(telegram.sentMessages[0]?.text).toContain('No active running projection.');
      expect(telegram.sentMessages[0]?.text).toContain('Linear: PREPROD-101');
      expect(telegram.sentMessages[1]?.text).toContain('No issue identifier is available for the current run.');
    } finally {
      await bridge.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('sends projection-driven push notifications when an accepted live Linear advisory update changes the projection', async () => {
    const { root, env, paths } = await createRunRoot('task-1022-telegram-linear-push');
    await seedManifest(paths, {
      summary: 'task is running',
      updated_at: '2026-03-06T06:00:00.000Z'
    });
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
    const telegram = createTelegramHarness(realFetch);
    const webhookSecret = 'linear-webhook-secret';

    vi.stubEnv('CO_TELEGRAM_POLLING_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('CO_TELEGRAM_ALLOWED_CHAT_IDS', '1234');
    vi.stubEnv('CO_TELEGRAM_PUSH_ENABLED', '1');
    vi.stubEnv('CO_TELEGRAM_PUSH_INTERVAL_MS', '1');
    vi.stubEnv('CO_TELEGRAM_POLL_INTERVAL_MS', '10');
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
                updatedAt: '2026-03-06T06:05:00.000Z',
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
      return telegram.fetch(input, init);
    });

    const server = await ControlServer.start({
      paths,
      config,
      runId: 'run-1'
    });

    try {
      const baseUrl = server.getBaseUrl() ?? '';
      const body = JSON.stringify({
        action: 'update',
        type: 'Issue',
        webhookTimestamp: Date.now(),
        data: {
          id: 'lin-issue-1'
        }
      });

      const response = await realFetch(new URL('/integrations/linear/webhook', baseUrl), {
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

      await waitForCondition(async () => telegram.sentMessages.length === 1);
      expect(telegram.sentMessages[0]?.text).toContain('CO status');
      expect(telegram.sentMessages[0]?.text).toContain('Linear: PREPROD-101');
      expect(telegram.sentMessages[0]?.text).toContain('Linear state: In Progress');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
