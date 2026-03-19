import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createControlQuestionChildResolutionAdapter } from '../src/cli/control/controlQuestionChildResolution.js';
import { createQuestionChildResolutionAdapter } from '../src/cli/control/questionChildResolutionAdapter.js';

vi.mock('../src/cli/control/questionChildResolutionAdapter.js', () => ({
  createQuestionChildResolutionAdapter: vi.fn()
}));

describe('ControlQuestionChildResolution', () => {
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
    vi.mocked(createQuestionChildResolutionAdapter).mockReturnValue(mockAdapter);
  });

  it('composes the child-resolution adapter from control context and preserves fallback audit emission', async () => {
    const snapshot = vi.fn(() => ({ run_id: 'parent-run' }));
    const validate = vi.fn(() => ({ token: 'stored-record' }));
    const emitControlEvent = vi.fn(async () => undefined);

    const adapter = createControlQuestionChildResolutionAdapter({
      config: {
        ui: {
          allowedRunRoots: ['/tmp/runs'],
          allowedBindHosts: ['127.0.0.1']
        },
        delegate: {
          expiryFallback: 'fail'
        }
      } as never,
      controlStore: { snapshot } as never,
      delegationTokens: { validate } as never,
      eventTransport: { emitControlEvent } as never
    });

    expect(adapter).toBe(mockAdapter);
    expect(createQuestionChildResolutionAdapter).toHaveBeenCalledTimes(1);

    const input = vi.mocked(createQuestionChildResolutionAdapter).mock.calls[0]?.[0];
    expect(input).toBeDefined();
    expect(input?.allowedRunRoots).toEqual(['/tmp/runs']);
    expect(input?.allowedBindHosts).toEqual(['127.0.0.1']);
    expect(input?.expiryFallback).toBe('fail');
    expect(input?.readParentRunId()).toBe('parent-run');
    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(input?.validateDelegationToken('token-1', 'parent-run', 'child-run')).toBe(true);
    expect(validate).toHaveBeenCalledWith('token-1', 'parent-run', 'child-run');

    await input?.emitResolutionFallback({
      question_id: 'q-123',
      outcome: 'answered',
      action: 'resume',
      reason: 'question_answered',
      non_fatal: true,
      error: 'child control error: 500 nope'
    });

    expect(emitControlEvent).toHaveBeenCalledWith({
      event: 'question.resolve_child_fallback',
      actor: 'control',
      payload: {
        question_id: 'q-123',
        outcome: 'answered',
        action: 'resume',
        reason: 'question_answered',
        non_fatal: true,
        error: 'child control error: 500 nope'
      }
    });
  });
});
