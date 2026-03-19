import { describe, expect, it, vi } from 'vitest';

import { runQuestionReadSequence } from '../src/cli/control/questionReadSequence.js';
import type { QuestionRecord } from '../src/cli/control/questions.js';

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

describe('QuestionReadSequence', () => {
  it('lists before expiry, awaits expiry, then returns the post-expiry questions plus retry candidates', async () => {
    const records = [
      createRecord({ question_id: 'q-0001', status: 'queued' }),
      createRecord({ question_id: 'q-0002', status: 'answered', closed_at: '2026-03-07T09:01:00.000Z' })
    ];
    const order: string[] = [];
    const listQuestions = vi.fn(() => {
      order.push(`list:${records.map((record) => `${record.question_id}:${record.status}`).join(',')}`);
      return records;
    });
    const expireQuestions = vi.fn(async () => {
      order.push('expire');
      records[0] = createRecord({
        question_id: 'q-0001',
        status: 'expired',
        closed_at: '2026-03-07T09:02:00.000Z'
      });
    });

    const result = await runQuestionReadSequence({
      listQuestions,
      expireQuestions
    });

    expect(expireQuestions).toHaveBeenCalledTimes(1);
    expect(listQuestions).toHaveBeenCalledTimes(2);
    expect(order).toEqual([
      'list:q-0001:queued,q-0002:answered',
      'expire',
      'list:q-0001:expired,q-0002:answered'
    ]);
    expect(result.questions).toEqual(records);
    expect(result.retryCandidates).toEqual([records[1]]);
  });
});
