import { describe, expect, it } from 'vitest';
import { QuestionQueue } from '../src/cli/control/questions.js';

const baseTime = new Date('2026-01-01T00:00:00Z');

function buildQueue() {
  let current = baseTime.getTime();
  return {
    queue: new QuestionQueue({ now: () => new Date(current).toISOString() }),
    advance(ms: number) {
      current += ms;
    }
  };
}

describe('QuestionQueue', () => {
  it('expires queued questions after TTL', () => {
    const { queue, advance } = buildQueue();
    const question = queue.enqueue({
      parentRunId: 'parent',
      fromRunId: 'child',
      prompt: 'Approve access? ',
      urgency: 'med',
      expiresInMs: 1000,
      fromManifestPath: '/tmp/child/manifest.json',
      autoPause: false,
      expiryFallback: 'resume'
    });

    expect(question.expires_in_ms).toBe(1000);
    expect(question.from_manifest_path).toBe('/tmp/child/manifest.json');
    expect(question.auto_pause).toBe(false);
    expect(question.expiry_fallback).toBe('resume');
    advance(1500);
    const expired = queue.expire();

    const updated = queue.get(question.question_id);
    expect(updated?.status).toBe('expired');
    expect(expired.map((entry) => entry.question_id)).toEqual([question.question_id]);
  });

  it('records answers and closes questions', () => {
    const { queue } = buildQueue();
    const question = queue.enqueue({
      parentRunId: 'parent',
      fromRunId: 'child',
      prompt: 'Need approval',
      urgency: 'low'
    });

    queue.answer(question.question_id, 'Approved', 'user');
    const updated = queue.get(question.question_id);
    expect(updated?.status).toBe('answered');
    expect(updated?.answer).toBe('Approved');
    expect(updated?.closed_at).toBeTruthy();
  });

  it('records dismissals with dismissed_by', () => {
    const { queue } = buildQueue();
    const question = queue.enqueue({
      parentRunId: 'parent',
      fromRunId: 'child',
      prompt: 'Need approval',
      urgency: 'low'
    });

    queue.dismiss(question.question_id, 'operator');
    const updated = queue.get(question.question_id);
    expect(updated?.status).toBe('dismissed');
    expect(updated?.dismissed_by).toBe('operator');
    expect(updated?.closed_at).toBeTruthy();
  });

  it('throws when answering a closed question', () => {
    const { queue, advance } = buildQueue();
    const question = queue.enqueue({
      parentRunId: 'parent',
      fromRunId: 'child',
      prompt: 'Need approval',
      urgency: 'low',
      expiresInMs: 500
    });

    advance(1000);
    queue.expire();

    expect(() => queue.answer(question.question_id, 'Approved', 'user')).toThrow('question_closed');
  });

  it('throws when dismissing a closed question', () => {
    const { queue } = buildQueue();
    const question = queue.enqueue({
      parentRunId: 'parent',
      fromRunId: 'child',
      prompt: 'Need approval',
      urgency: 'low'
    });

    queue.answer(question.question_id, 'Approved', 'user');

    expect(() => queue.dismiss(question.question_id, 'operator')).toThrow('question_closed');
  });
});
