import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmationStore } from '../src/cli/control/confirmations.js';
import { createControlExpiryLifecycle } from '../src/cli/control/controlExpiryLifecycle.js';
import { QuestionQueue, type QuestionRecord } from '../src/cli/control/questions.js';

function createQuestionRecord(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  return {
    question_id: 'q-0001',
    parent_run_id: 'parent-run',
    from_run_id: 'child-run',
    from_manifest_path: '/tmp/child/manifest.json',
    prompt: 'Need approval',
    urgency: 'high',
    status: 'queued',
    queued_at: '2026-03-08T00:00:00.000Z',
    expires_at: '2026-03-08T00:00:01.000Z',
    expires_in_ms: 1000,
    auto_pause: true,
    expiry_fallback: 'pause',
    ...overrides
  };
}

describe('ControlExpiryLifecycle', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('expires confirmations and questions through the extracted lifecycle surface', async () => {
    const now = new Date('2026-03-08T00:00:05.000Z');
    const confirmationStore = new ConfirmationStore({
      runId: 'run-1',
      expiresInMs: 60_000,
      maxPending: 5,
      now: () => now,
      seed: {
        pending: [
          {
            request_id: 'req-1',
            action: 'cancel',
            tool: 'delegate.cancel',
            params: { reason: 'stale' },
            action_params_digest: 'digest-1',
            digest_alg: 'sha256',
            requested_at: '2026-03-08T00:00:00.000Z',
            expires_at: '2026-03-08T00:00:01.000Z',
            approved_by: null,
            approved_at: null
          }
        ],
        issued: [
          {
            request_id: 'req-1',
            nonce_id: 'nonce-1',
            issued_at: '2026-03-08T00:00:00.500Z',
            expires_at: '2026-03-08T00:00:01.000Z'
          }
        ],
        consumed_nonce_ids: []
      }
    });
    const questionQueue = new QuestionQueue({
      now: () => now.toISOString(),
      seed: [createQuestionRecord()]
    });
    const persist = {
      confirmations: vi.fn(async () => undefined),
      questions: vi.fn(async () => undefined)
    };
    const runtime = { publish: vi.fn() };
    const emitControlEvent = vi.fn(async () => undefined);
    const resolveChildQuestion = vi.fn(async () => undefined);
    const lifecycle = createControlExpiryLifecycle({
      intervalMs: 15_000,
      confirmationStore,
      questionQueue,
      persist,
      runtime,
      emitControlEvent,
      createQuestionChildResolutionAdapter: () => ({
        resolveChildQuestion
      })
    });

    await lifecycle.expireConfirmations();
    await lifecycle.expireQuestions();

    expect(persist.confirmations).toHaveBeenCalledTimes(1);
    expect(persist.questions).toHaveBeenCalledTimes(1);
    expect(emitControlEvent).toHaveBeenCalledWith({
      event: 'confirmation_resolved',
      actor: 'runner',
      payload: {
        request_id: 'req-1',
        nonce_id: 'nonce-1',
        outcome: 'expired'
      }
    });
    expect(emitControlEvent).toHaveBeenCalledWith({
      event: 'question_closed',
      actor: 'runner',
      payload: {
        question_id: 'q-0001',
        parent_run_id: 'parent-run',
        outcome: 'expired',
        closed_at: now.toISOString(),
        expires_at: '2026-03-08T00:00:01.000Z'
      }
    });
    expect(resolveChildQuestion).toHaveBeenCalledTimes(1);
    expect(resolveChildQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        question_id: 'q-0001',
        status: 'expired',
        closed_at: now.toISOString()
      }),
      'expired'
    );
    expect(runtime.publish).toHaveBeenCalledWith({ source: 'questions.expire' });
  });

  it('serializes scheduled expiry sweeps by rearming only after the active cycle completes', async () => {
    vi.useFakeTimers();

    const questionQueue = new QuestionQueue({
      now: () => '2026-03-08T00:00:05.000Z',
      seed: [createQuestionRecord()]
    });
    let releaseResolution!: () => void;
    const resolutionPromise = new Promise<void>((resolve) => {
      releaseResolution = resolve;
    });
    const lifecycle = createControlExpiryLifecycle({
      intervalMs: 10,
      confirmationStore: new ConfirmationStore({
        runId: 'run-1',
        expiresInMs: 60_000,
        maxPending: 5
      }),
      questionQueue,
      persist: {
        confirmations: async () => undefined,
        questions: async () => undefined
      },
      runtime: { publish: vi.fn() },
      emitControlEvent: async () => undefined,
      createQuestionChildResolutionAdapter: () => ({
        resolveChildQuestion: async () => {
          await resolutionPromise;
        }
      })
    });

    lifecycle.start();
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(10);
    await Promise.resolve();

    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(100);
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);

    releaseResolution();
    for (let index = 0; index < 5; index += 1) {
      await Promise.resolve();
    }

    expect(vi.getTimerCount()).toBe(1);

    lifecycle.close();
    expect(vi.getTimerCount()).toBe(0);
  });
});
