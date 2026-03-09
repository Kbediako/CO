import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createControlQuestionChildResolutionAdapter } from '../src/cli/control/controlQuestionChildResolution.js';
import { buildControlInternalContext } from '../src/cli/control/controlRequestContext.js';
import { readControlTelegramQuestions } from '../src/cli/control/controlTelegramQuestionRead.js';
import { runQuestionReadSequence } from '../src/cli/control/questionReadSequence.js';
import type { QuestionRecord } from '../src/cli/control/questions.js';

vi.mock('../src/cli/control/controlQuestionChildResolution.js', () => ({
  createControlQuestionChildResolutionAdapter: vi.fn()
}));

vi.mock('../src/cli/control/controlRequestContext.js', () => ({
  buildControlInternalContext: vi.fn()
}));

vi.mock('../src/cli/control/questionReadSequence.js', () => ({
  runQuestionReadSequence: vi.fn()
}));

function createQuestionRecord(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  return {
    question_id: overrides.question_id ?? 'q-0001',
    parent_run_id: overrides.parent_run_id ?? 'parent-run',
    from_run_id: overrides.from_run_id ?? 'child-run',
    from_manifest_path: overrides.from_manifest_path ?? null,
    prompt: overrides.prompt ?? 'Need approval',
    urgency: overrides.urgency ?? 'high',
    status: overrides.status ?? 'queued',
    queued_at: overrides.queued_at ?? '2026-03-09T02:00:00.000Z',
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

describe('ControlTelegramQuestionRead', () => {
  const mockAdapter = {
    readDelegationHeaders: vi.fn(),
    validateDelegation: vi.fn(),
    resolveManifestPath: vi.fn(),
    readManifest: vi.fn(),
    resolveChildQuestion: vi.fn(),
    queueQuestionResolutions: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createControlQuestionChildResolutionAdapter).mockReturnValue(mockAdapter);
  });

  it('assembles Telegram question reads from shared control context and queues retry candidates', async () => {
    const questions = [createQuestionRecord({ question_id: 'q-0001' })];
    const retryCandidates = [createQuestionRecord({ question_id: 'q-0002', status: 'answered' })];
    const listQuestions = vi.fn(() => questions);
    const expireQuestions = vi.fn(async () => undefined);
    const internalContext = {
      questionQueue: { list: listQuestions },
      expiryLifecycle: { expireQuestions }
    };
    vi.mocked(buildControlInternalContext).mockReturnValue(internalContext as never);
    vi.mocked(runQuestionReadSequence).mockImplementation(async (input) => {
      await input.expireQuestions();
      expect(input.listQuestions()).toEqual(questions);
      return {
        questions,
        retryCandidates
      };
    });

    const sharedContext = {
      token: 'token',
      controlStore: {} as never,
      confirmationStore: {} as never,
      questionQueue: {} as never,
      delegationTokens: {} as never,
      sessionTokens: {} as never,
      config: {} as never,
      persist: {} as never,
      clients: new Set(),
      eventTransport: {} as never,
      paths: {} as never,
      linearAdvisoryState: {} as never,
      runtime: {} as never,
      expiryLifecycle: {} as never
    };

    await expect(readControlTelegramQuestions(sharedContext as never)).resolves.toEqual({ questions });

    expect(buildControlInternalContext).toHaveBeenCalledWith(sharedContext);
    expect(createControlQuestionChildResolutionAdapter).toHaveBeenCalledWith(internalContext);
    expect(expireQuestions).toHaveBeenCalledWith(mockAdapter);
    expect(mockAdapter.queueQuestionResolutions).toHaveBeenCalledWith(retryCandidates);
  });
});
