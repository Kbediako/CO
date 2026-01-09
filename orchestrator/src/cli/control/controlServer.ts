import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { chmod, readFile } from 'node:fs/promises';

import { writeJsonAtomic } from '../utils/fs.js';
import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import { ControlStateStore, type ControlState } from './controlState.js';
import { ConfirmationStore, type ConfirmationRequest } from './confirmations.js';
import { QuestionQueue, type QuestionRecord, type QuestionUrgency } from './questions.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';

interface ControlServerOptions {
  paths: RunPaths;
  config: EffectiveDelegationConfig;
  eventStream?: RunEventStream;
  runId: string;
}

export class ControlServer {
  private readonly server: http.Server;
  private readonly controlStore: ControlStateStore;
  private readonly confirmationStore: ConfirmationStore;
  private readonly questionQueue: QuestionQueue;
  private readonly eventStream?: RunEventStream;
  private readonly clients: Set<http.ServerResponse>;
  private baseUrl: string | null = null;

  private constructor(options: {
    server: http.Server;
    controlStore: ControlStateStore;
    confirmationStore: ConfirmationStore;
    questionQueue: QuestionQueue;
    eventStream?: RunEventStream;
    clients: Set<http.ServerResponse>;
  }) {
    this.server = options.server;
    this.controlStore = options.controlStore;
    this.confirmationStore = options.confirmationStore;
    this.questionQueue = options.questionQueue;
    this.eventStream = options.eventStream;
    this.clients = options.clients;
  }

  static async start(options: ControlServerOptions): Promise<ControlServer> {
    const token = randomBytes(24).toString('hex');
    const controlSeed = await readJsonFile<ControlState>(options.paths.controlPath);
    const confirmationsSeed = await readJsonFile<{ pending?: ConfirmationRequest[] }>(
      options.paths.confirmationsPath
    );
    const questionsSeed = await readJsonFile<{ questions?: QuestionRecord[] }>(
      options.paths.questionsPath
    );

    const controlStore = new ControlStateStore({
      runId: options.runId,
      controlSeq: controlSeed?.control_seq ?? 0,
      latestAction: controlSeed?.latest_action ?? null,
      featureToggles: controlSeed?.feature_toggles ?? null
    });
    const defaultToggles = controlSeed?.feature_toggles ?? {};
    if (!('rlm' in defaultToggles)) {
      controlStore.updateFeatureToggles({ rlm: { policy: options.config.rlm.policy } });
    }
    const confirmationStore = new ConfirmationStore({
      expiresInMs: options.config.confirm.expiresInMs,
      maxPending: options.config.confirm.maxPending,
      seed: confirmationsSeed?.pending ?? []
    });
    const questionQueue = new QuestionQueue({ seed: questionsSeed?.questions ?? [] });

    const clients = new Set<http.ServerResponse>();
    const server = http.createServer((req, res) => {
        handleRequest({
          req,
          res,
          token,
          controlStore,
          confirmationStore,
          questionQueue,
          eventStream: options.eventStream,
          config: options.config,
          persist: {
            control: async () => writeJsonAtomic(options.paths.controlPath, controlStore.snapshot()),
            confirmations: async () =>
              writeJsonAtomic(options.paths.confirmationsPath, {
                pending: confirmationStore.listPending()
              }),
            questions: async () =>
              writeJsonAtomic(options.paths.questionsPath, { questions: questionQueue.list() })
          },
          clients
        }).catch((error) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error)?.message ?? String(error) }));
      });
    });

    const instance = new ControlServer({
      server,
      controlStore,
      confirmationStore,
      questionQueue,
      eventStream: options.eventStream,
      clients
    });

    const host = options.config.ui.bindHost;
    await new Promise<void>((resolve) => {
      server.listen(0, host, () => resolve());
    });
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    instance.baseUrl = `http://${host}:${port}`;

    await writeJsonAtomic(options.paths.controlAuthPath, {
      token,
      created_at: isoTimestamp()
    });
    await chmod(options.paths.controlAuthPath, 0o600).catch(() => undefined);
    await writeJsonAtomic(options.paths.controlEndpointPath, {
      base_url: instance.baseUrl,
      token_path: options.paths.controlAuthPath
    });
    await writeJsonAtomic(options.paths.controlPath, controlStore.snapshot());

    return instance;
  }

  getBaseUrl(): string | null {
    return this.baseUrl;
  }

  broadcast(entry: RunEventStreamEntry): void {
    const payload = `data: ${JSON.stringify(entry)}\n\n`;
    for (const client of this.clients) {
      client.write(payload);
    }
  }

  async close(): Promise<void> {
    for (const client of this.clients) {
      client.end();
    }
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
  }
}

interface RequestContext {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  token: string;
  controlStore: ControlStateStore;
  confirmationStore: ConfirmationStore;
  questionQueue: QuestionQueue;
  eventStream?: RunEventStream;
  config: EffectiveDelegationConfig;
  persist: {
    control: () => Promise<void>;
    confirmations: () => Promise<void>;
    questions: () => Promise<void>;
  };
  clients: Set<http.ServerResponse>;
}

async function handleRequest(context: RequestContext): Promise<void> {
  const { req, res } = context;
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: isoTimestamp() }));
    return;
  }

  if (!isAuthorized(req, context.token, url)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  if (url.pathname === '/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write(`: ok\n\n`);
    context.clients.add(res);
    req.on('close', () => {
      context.clients.delete(res);
    });
    return;
  }

  if (url.pathname === '/control/action' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const action = readStringValue(body, 'action');
    if (!isControlAction(action)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_action' }));
      return;
    }
    context.controlStore.updateAction({
      action,
      requestedBy: readStringValue(body, 'requested_by', 'requestedBy') ?? 'ui',
      requestId: readStringValue(body, 'request_id', 'requestId')
    });
    await context.persist.control();
    const snapshot = context.controlStore.snapshot();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(snapshot));
    return;
  }

  if (url.pathname === '/confirmations/create' && req.method === 'POST') {
    await expireConfirmations(context);
    const body = await readJsonBody(req);
    const rawAction = readStringValue(body, 'action');
    const action =
      rawAction === 'cancel' || rawAction === 'merge' ? rawAction : 'other';
    const request = context.confirmationStore.create({
      action,
      tool: readStringValue(body, 'tool') ?? 'unknown',
      params: readRecordValue(body, 'params') ?? {}
    });
    await context.persist.confirmations();
    if (context.config.confirm.autoPause) {
      const latestAction = context.controlStore.snapshot().latest_action?.action ?? null;
      if (latestAction !== 'pause') {
        context.controlStore.updateAction({
          action: 'pause',
          requestedBy: 'runner',
          requestId: request.request_id
        });
        await context.persist.control();
      }
    }
    const runId = context.controlStore.snapshot().run_id;
    await emitControlEvent(context, {
      event: 'confirmation_required',
      actor: 'runner',
      payload: {
        request_id: request.request_id,
        confirm_scope: {
          run_id: runId,
          action: request.action,
          action_params_digest: request.action_params_digest
        },
        action_params_digest: request.action_params_digest,
        digest_alg: request.digest_alg,
        confirm_expires_in_ms: Date.parse(request.expires_at) - Date.parse(request.requested_at)
      }
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        request_id: request.request_id,
        confirm_scope: {
          run_id: runId,
          action: request.action,
          action_params_digest: request.action_params_digest
        },
        action_params_digest: request.action_params_digest,
        digest_alg: request.digest_alg,
        confirm_expires_in_ms: Date.parse(request.expires_at) - Date.parse(request.requested_at)
      })
    );
    return;
  }

  if (url.pathname === '/confirmations' && req.method === 'GET') {
    await expireConfirmations(context);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pending: context.confirmationStore.listPending() }));
    return;
  }

  if (url.pathname === '/confirmations/approve' && req.method === 'POST') {
    await expireConfirmations(context);
    const body = await readJsonBody(req);
    const requestId = readStringValue(body, 'request_id', 'requestId');
    if (!requestId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_request_id' }));
      return;
    }
    const actor = readStringValue(body, 'actor') ?? 'ui';
    context.confirmationStore.approve(requestId, actor);
    const entry = context.confirmationStore.get(requestId);
    if (entry?.action === 'cancel') {
      context.confirmationStore.consume(requestId);
      await context.persist.confirmations();
      context.controlStore.updateAction({
        action: 'cancel',
        requestedBy: actor,
        requestId
      });
      await context.persist.control();
    } else {
      await context.persist.confirmations();
    }
    await emitControlEvent(context, {
      event: 'confirmation_resolved',
      actor: 'runner',
      payload: {
        request_id: requestId,
        outcome: 'approved'
      }
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'approved' }));
    return;
  }

  if (url.pathname === '/confirmations/consume' && req.method === 'POST') {
    await expireConfirmations(context);
    const body = await readJsonBody(req);
    const requestId = readStringValue(body, 'request_id', 'requestId');
    if (!requestId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_request_id' }));
      return;
    }
    const nonce = context.confirmationStore.consume(requestId);
    await context.persist.confirmations();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(nonce));
    return;
  }

  if (url.pathname === '/questions' && req.method === 'GET') {
    await expireQuestions(context);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ questions: context.questionQueue.list() }));
    return;
  }

  if (url.pathname === '/questions/enqueue' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const prompt = readStringValue(body, 'prompt');
    if (!prompt) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_prompt' }));
      return;
    }
    const record = context.questionQueue.enqueue({
      parentRunId: readStringValue(body, 'parent_run_id', 'parentRunId') ?? '',
      fromRunId: readStringValue(body, 'from_run_id', 'fromRunId') ?? '',
      prompt,
      urgency: parseUrgency(readStringValue(body, 'urgency')),
      expiresInMs: readNumberValue(body, 'expires_in_ms', 'expiresInMs')
    });
    await context.persist.questions();
    await emitControlEvent(context, {
      event: 'question_queued',
      actor: 'delegate',
      payload: {
        question_id: record.question_id,
        parent_run_id: record.parent_run_id,
        from_run_id: record.from_run_id,
        prompt: record.prompt,
        urgency: record.urgency,
        queued_at: record.queued_at,
        expires_at: record.expires_at ?? null
      }
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(record));
    return;
  }

  if (url.pathname === '/questions/answer' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const questionId = readStringValue(body, 'question_id', 'questionId');
    const answer = readStringValue(body, 'answer');
    if (!questionId || !answer) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_question_or_answer' }));
      return;
    }
    context.questionQueue.answer(questionId, answer, readStringValue(body, 'answered_by', 'answeredBy') ?? 'user');
    await context.persist.questions();
    const record = context.questionQueue.get(questionId);
    if (record) {
      await emitControlEvent(context, {
        event: 'question_answered',
        actor: 'user',
        payload: {
          question_id: record.question_id,
          parent_run_id: record.parent_run_id,
          answer: record.answer,
          answered_by: record.answered_by,
          answered_at: record.answered_at
        }
      });
      await emitControlEvent(context, {
        event: 'question_closed',
        actor: 'runner',
        payload: {
          question_id: record.question_id,
          parent_run_id: record.parent_run_id,
          outcome: record.status,
          closed_at: record.closed_at
        }
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'answered' }));
    return;
  }

  if (url.pathname === '/questions/dismiss' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const questionId = readStringValue(body, 'question_id', 'questionId');
    if (!questionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_question_id' }));
      return;
    }
    context.questionQueue.dismiss(questionId, readStringValue(body, 'dismissed_by', 'dismissedBy') ?? 'user');
    await context.persist.questions();
    const record = context.questionQueue.get(questionId);
    if (record) {
      await emitControlEvent(context, {
        event: 'question_closed',
        actor: 'user',
        payload: {
          question_id: record.question_id,
          parent_run_id: record.parent_run_id,
          outcome: record.status,
          closed_at: record.closed_at
        }
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'dismissed' }));
    return;
  }

  if (url.pathname.startsWith('/questions/') && req.method === 'GET') {
    await expireQuestions(context);
    const questionId = url.pathname.split('/').pop();
    const record = questionId ? context.questionQueue.get(questionId) : null;
    if (!record) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(record));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
}

function isControlAction(action: unknown): action is 'pause' | 'resume' | 'cancel' {
  return action === 'pause' || action === 'resume' || action === 'cancel';
}

async function expireConfirmations(context: RequestContext): Promise<void> {
  const expired = context.confirmationStore.expire();
  if (expired.length === 0) {
    return;
  }
  await context.persist.confirmations();
  for (const entry of expired) {
    await emitControlEvent(context, {
      event: 'confirmation_resolved',
      actor: 'runner',
      payload: {
        request_id: entry.request_id,
        outcome: 'expired'
      }
    });
  }
}

async function expireQuestions(context: RequestContext): Promise<void> {
  const expired = context.questionQueue.expire();
  if (expired.length === 0) {
    return;
  }
  await context.persist.questions();
  for (const record of expired) {
    await emitControlEvent(context, {
      event: 'question_closed',
      actor: 'runner',
      payload: {
        question_id: record.question_id,
        parent_run_id: record.parent_run_id,
        outcome: 'expired',
        closed_at: record.closed_at ?? null
      }
    });
  }
}

function isAuthorized(req: http.IncomingMessage, token: string, url: URL): boolean {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length) === token;
  }
  const param = url.searchParams.get('token');
  if (param) {
    return param === token;
  }
  return false;
}

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

async function emitControlEvent(
  context: RequestContext,
  input: { event: string; actor: string; payload: Record<string, unknown> }
): Promise<void> {
  if (!context.eventStream) {
    return;
  }
  const entry = await context.eventStream.append({
    event: input.event,
    actor: input.actor,
    payload: input.payload
  });
  const payload = `data: ${JSON.stringify(entry)}\n\n`;
  for (const client of context.clients) {
    client.write(payload);
  }
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

function readRecordValue(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function parseUrgency(value: string | undefined): QuestionUrgency {
  if (value === 'low' || value === 'med' || value === 'high') {
    return value;
  }
  return 'med';
}
