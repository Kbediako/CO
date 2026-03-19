import { describe, expect, it } from 'vitest';

import { createQuestionReadRetrySelector } from '../src/cli/control/questionReadRetryDeduplication.js';
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

describe('QuestionReadRetryDeduplication', () => {
  it('excludes records that were queued before the read and expired during expiry handling', () => {
    const beforeExpiry = [
      createRecord({ question_id: 'q-0001', status: 'queued' }),
      createRecord({ question_id: 'q-0002', status: 'answered', closed_at: '2026-03-07T09:01:00.000Z' })
    ];
    const afterExpiry = [
      createRecord({ question_id: 'q-0001', status: 'expired', closed_at: '2026-03-07T09:02:00.000Z' }),
      createRecord({ question_id: 'q-0002', status: 'answered', closed_at: '2026-03-07T09:01:00.000Z' })
    ];

    expect(createQuestionReadRetrySelector(beforeExpiry)(afterExpiry)).toEqual([afterExpiry[1]]);
  });

  it('keeps records that were queued before the read but became answered or dismissed during the await gap', () => {
    const beforeExpiry = [
      createRecord({ question_id: 'q-0001', status: 'queued' }),
      createRecord({ question_id: 'q-0002', status: 'queued' })
    ];
    const afterExpiry = [
      createRecord({
        question_id: 'q-0001',
        status: 'answered',
        answer: 'Approved',
        answered_by: 'ui',
        answered_at: '2026-03-07T09:01:00.000Z',
        closed_at: '2026-03-07T09:01:00.000Z'
      }),
      createRecord({
        question_id: 'q-0002',
        status: 'dismissed',
        dismissed_by: 'ui',
        closed_at: '2026-03-07T09:02:00.000Z'
      })
    ];

    expect(createQuestionReadRetrySelector(beforeExpiry)(afterExpiry)).toEqual(afterExpiry);
  });
});
