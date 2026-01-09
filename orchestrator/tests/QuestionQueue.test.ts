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
      expiresInMs: 1000
    });

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
});
