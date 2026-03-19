import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { handleQuestionQueueRequest } from '../src/cli/control/questionQueueController.js';
import { QuestionQueue, type QuestionRecord } from '../src/cli/control/questions.js';

function createResponseRecorder() {
  const state: {
    statusCode: number | null;
    headers: Record<string, string> | null;
    body: unknown;
  } = {
    statusCode: null,
    headers: null,
    body: null
  };

  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = headers;
      return this;
    },
    end(payload?: string) {
      state.body = payload ? JSON.parse(payload) : null;
      return this;
    }
  } as unknown as http.ServerResponse;

  return { res, state };
}

function createRecord(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  return {
    question_id: overrides.question_id ?? 'q-0001',
    parent_run_id: overrides.parent_run_id ?? 'parent-run',
    from_run_id: overrides.from_run_id ?? 'child-run',
    from_manifest_path: overrides.from_manifest_path ?? null,
    prompt: overrides.prompt ?? 'Need approval',
    urgency: overrides.urgency ?? 'high',
    status: overrides.status ?? 'queued',
    queued_at: overrides.queued_at ?? '2026-03-07T09:00:00.000Z',
    expires_at: overrides.expires_at ?? null,
    expires_in_ms: overrides.expires_in_ms ?? null,
    auto_pause: overrides.auto_pause ?? true,
    expiry_fallback: overrides.expiry_fallback ?? null,
    answer: overrides.answer ?? null,
    answered_by: overrides.answered_by ?? null,
    answered_at: overrides.answered_at ?? null,
    dismissed_by: overrides.dismissed_by ?? null,
    closed_at: overrides.closed_at ?? null
  };
}

function createContext(
  input: Partial<Parameters<typeof handleQuestionQueueRequest>[0]> & {
    queue?: QuestionQueue;
  } = {}
) {
  const { res, state } = createResponseRecorder();
  const queue = input.queue ?? new QuestionQueue();
  const context = {
    req: input.req ?? ({ method: 'GET', url: '/questions', headers: {} } as http.IncomingMessage),
    res,
    questionQueue: queue,
    readRequestBody: input.readRequestBody ?? (vi.fn(async () => ({})) as () => Promise<Record<string, unknown>>),
    expireQuestions: input.expireQuestions ?? vi.fn(async () => undefined),
    queueQuestionResolutions: input.queueQuestionResolutions ?? vi.fn(),
    readDelegationHeaders:
      input.readDelegationHeaders ?? (vi.fn(() => null) as () => { token: string; childRunId: string } | null),
    validateDelegation: input.validateDelegation ?? vi.fn(() => true),
    resolveManifestPath: input.resolveManifestPath ?? vi.fn((value: string) => value),
    readManifest: input.readManifest ?? (vi.fn(async () => ({ run_id: 'child-run' })) as (path: string) => Promise<{ run_id: string } | null>),
    getParentRunId: input.getParentRunId ?? vi.fn(() => 'parent-run'),
    persistQuestions: input.persistQuestions ?? vi.fn(async () => undefined),
    resolveChildQuestion: input.resolveChildQuestion ?? vi.fn(async () => undefined),
    emitQuestionQueued: input.emitQuestionQueued ?? vi.fn(async () => undefined),
    emitQuestionAnswered: input.emitQuestionAnswered ?? vi.fn(async () => undefined),
    emitQuestionDismissed: input.emitQuestionDismissed ?? vi.fn(async () => undefined),
    publishRuntime: input.publishRuntime ?? vi.fn()
  };

  return { context, state, queue };
}

describe('QuestionQueueController', () => {
  it('returns false for non-question routes', async () => {
    const { context, state } = createContext({
      req: { method: 'GET', url: '/ui/data.json', headers: {} } as http.IncomingMessage
    });

    await expect(handleQuestionQueueRequest(context)).resolves.toBe(false);
    expect(state.statusCode).toBeNull();
  });

  it('lists questions after expiring and queueing follow-up resolutions', async () => {
    const queue = new QuestionQueue({
      seed: [
        createRecord({ question_id: 'q-0001', status: 'queued' }),
        createRecord({
          question_id: 'q-0002',
          status: 'answered',
          answer: 'Approved',
          answered_by: 'ui',
          answered_at: '2026-03-07T09:01:00.000Z',
          closed_at: '2026-03-07T09:01:00.000Z'
        }),
        createRecord({
          question_id: 'q-0003',
          status: 'expired',
          closed_at: '2026-03-07T09:02:00.000Z'
        })
      ]
    });
    const { context, state } = createContext({
      queue,
      expireQuestions: vi.fn(async () => {
        const record = queue.get('q-0001');
        if (record) {
          record.status = 'expired';
          record.closed_at = '2026-03-07T09:03:00.000Z';
        }
      })
    });

    await expect(handleQuestionQueueRequest(context)).resolves.toBe(true);

    expect(context.expireQuestions).toHaveBeenCalledTimes(1);
    expect(context.queueQuestionResolutions).toHaveBeenCalledWith([
      queue.get('q-0002'),
      queue.get('q-0003')
    ]);
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({ questions: queue.list() });
    expect(queue.get('q-0001')?.status).toBe('expired');
  });

  it('rejects enqueue without a prompt after delegation validation', async () => {
    const { context, state } = createContext({
      req: { method: 'POST', url: '/questions/enqueue', headers: {} } as http.IncomingMessage,
      readDelegationHeaders: vi.fn(() => ({ token: 'delegation-token', childRunId: 'child-run' })),
      readRequestBody: vi.fn(async () => ({
        urgency: 'high'
      }))
    });

    await expect(handleQuestionQueueRequest(context)).resolves.toBe(true);

    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'missing_prompt' });
    expect(context.persistQuestions).not.toHaveBeenCalled();
  });

  it('rejects enqueue when delegation headers are missing or invalid', async () => {
    const { context, state } = createContext({
      req: { method: 'POST', url: '/questions/enqueue', headers: {} } as http.IncomingMessage,
      readDelegationHeaders: vi.fn(() => ({ token: 'delegation-token', childRunId: 'child-run' })),
      validateDelegation: vi.fn(() => false)
    });

    await expect(handleQuestionQueueRequest(context)).resolves.toBe(true);

    expect(state.statusCode).toBe(403);
    expect(state.body).toEqual({ error: 'delegation_token_invalid' });
    expect(context.readRequestBody).not.toHaveBeenCalled();
  });

  it('rejects answer requests missing the answer payload', async () => {
    const { context, state } = createContext({
      req: { method: 'POST', url: '/questions/answer', headers: {} } as http.IncomingMessage,
      readRequestBody: vi.fn(async () => ({
        question_id: 'q-0001'
      }))
    });

    await expect(handleQuestionQueueRequest(context)).resolves.toBe(true);

    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'missing_question_or_answer' });
    expect(context.persistQuestions).not.toHaveBeenCalled();
  });

  it('answers a queued question and publishes the existing side-effect hooks', async () => {
    const queue = new QuestionQueue({
      seed: [createRecord({ question_id: 'q-0001', status: 'queued' })]
    });
    const { context, state } = createContext({
      queue,
      req: { method: 'POST', url: '/questions/answer', headers: {} } as http.IncomingMessage,
      readRequestBody: vi.fn(async () => ({
        question_id: 'q-0001',
        answer: 'Approved',
        answered_by: 'ui'
      }))
    });

    await expect(handleQuestionQueueRequest(context)).resolves.toBe(true);

    const record = queue.get('q-0001');
    expect(record?.status).toBe('answered');
    expect(context.persistQuestions).toHaveBeenCalledTimes(1);
    expect(context.emitQuestionAnswered).toHaveBeenCalledWith(record);
    expect(context.resolveChildQuestion).toHaveBeenCalledWith(record, 'answered');
    expect(context.publishRuntime).toHaveBeenCalledWith('questions.answer');
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({ status: 'answered' });
  });

  it('rejects dismiss requests missing the question id', async () => {
    const { context, state } = createContext({
      req: { method: 'POST', url: '/questions/dismiss', headers: {} } as http.IncomingMessage,
      readRequestBody: vi.fn(async () => ({}))
    });

    await expect(handleQuestionQueueRequest(context)).resolves.toBe(true);

    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'missing_question_id' });
    expect(context.persistQuestions).not.toHaveBeenCalled();
  });

  it('dismisses a queued question and resolves the child run with dismissed status', async () => {
    const queue = new QuestionQueue({
      seed: [createRecord({ question_id: 'q-0001', status: 'queued' })]
    });
    const { context, state } = createContext({
      queue,
      req: { method: 'POST', url: '/questions/dismiss', headers: {} } as http.IncomingMessage,
      readRequestBody: vi.fn(async () => ({
        question_id: 'q-0001',
        dismissed_by: 'ui'
      }))
    });

    await expect(handleQuestionQueueRequest(context)).resolves.toBe(true);

    const record = queue.get('q-0001');
    expect(record?.status).toBe('dismissed');
    expect(context.persistQuestions).toHaveBeenCalledTimes(1);
    expect(context.emitQuestionDismissed).toHaveBeenCalledWith(record);
    expect(context.resolveChildQuestion).toHaveBeenCalledWith(record, 'dismissed');
    expect(context.publishRuntime).toHaveBeenCalledWith('questions.dismiss');
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({ status: 'dismissed' });
  });

  it('rejects item reads outside the delegated child-run scope', async () => {
    const queue = new QuestionQueue({
      seed: [createRecord({ question_id: 'q-0001', from_run_id: 'child-run-a' })]
    });
    const { context, state } = createContext({
      queue,
      req: { method: 'GET', url: '/questions/q-0001', headers: {} } as http.IncomingMessage,
      readDelegationHeaders: vi.fn(() => ({ token: 'delegation-token', childRunId: 'child-run-b' }))
    });

    await expect(handleQuestionQueueRequest(context)).resolves.toBe(true);

    expect(state.statusCode).toBe(403);
    expect(state.body).toEqual({ error: 'delegation_scope_mismatch' });
  });
});
