import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ControlServer } from '../src/cli/control/controlServer.js';
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
    if (url.origin !== 'https://api.telegram.org') {
      return realFetch(input, init);
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
          text: '/questions',
          chat: { id: 1234, type: 'private' },
          from: { id: 77, is_bot: false, first_name: 'Operator' }
        }
      });

      await waitForCondition(async () =>
        JSON.parse(await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8')).next_update_id === 103
      );

      const questionsMessage = telegram.sentMessages.find((message) =>
        message.text.includes('q-0001 [high]: Should we keep polling enabled?')
      );
      expect(questionsMessage?.text).toContain('q-0001 [high]');
      expect(questionsMessage?.text).toContain('Should we keep polling enabled?');

      const stateRaw = await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8');
      const bridgeState = JSON.parse(stateRaw) as { next_update_id?: number };
      expect(bridgeState.next_update_id).toBe(103);
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

      await waitForCondition(async () =>
        telegram.sentMessages.some((message) => message.text.includes('CO status'))
      );

      const stateRaw = await readFile(join(paths.runDir, 'telegram-oversight-state.json'), 'utf8');
      const state = JSON.parse(stateRaw) as { next_update_id?: number };
      expect(state.next_update_id).toBe(202);
      expect(telegram.sentMessages.some((message) => message.text.includes('CO status'))).toBe(true);
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
