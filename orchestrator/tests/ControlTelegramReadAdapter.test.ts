import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readControlTelegramDispatch } from '../src/cli/control/controlTelegramDispatchRead.js';
import { readControlTelegramQuestions } from '../src/cli/control/controlTelegramQuestionRead.js';
import { createControlTelegramReadAdapter } from '../src/cli/control/controlTelegramReadAdapter.js';

vi.mock('../src/cli/control/controlTelegramDispatchRead.js', () => ({
  readControlTelegramDispatch: vi.fn()
}));

vi.mock('../src/cli/control/controlTelegramQuestionRead.js', () => ({
  readControlTelegramQuestions: vi.fn()
}));

describe('ControlTelegramReadAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the Telegram read adapter from runtime selected-run reads plus the extracted helper seams', async () => {
    const selectedRun = {
      selected: { issueId: 'task-1078' },
      dispatchPilot: null,
      tracked: null
    };
    const runtimeSnapshot = {
      readSelectedRunSnapshot: vi.fn(async () => selectedRun)
    };
    const runtime = {
      snapshot: vi.fn(() => runtimeSnapshot)
    };
    const emitDispatchPilotAuditEvents = vi.fn(async () => undefined);

    vi.mocked(readControlTelegramDispatch).mockResolvedValue({
      dispatch_pilot: {
        status: 'ready',
        source_status: 'ready',
        reason: 'signal_threshold_met'
      }
    } as never);
    vi.mocked(readControlTelegramQuestions).mockResolvedValue({
      questions: [{ question_id: 'q-1078', prompt: 'Continue?' }]
    } as never);

    const context = {
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
      runtime,
      expiryLifecycle: null,
      emitDispatchPilotAuditEvents
    };

    const adapter = createControlTelegramReadAdapter(context as never);

    await expect(adapter.readSelectedRun()).resolves.toEqual(selectedRun);
    await expect(adapter.readDispatch()).resolves.toEqual({
      dispatch_pilot: {
        status: 'ready',
        source_status: 'ready',
        reason: 'signal_threshold_met'
      }
    });
    await expect(adapter.readQuestions()).resolves.toEqual({
      questions: [{ question_id: 'q-1078', prompt: 'Continue?' }]
    });

    expect(runtime.snapshot).toHaveBeenCalledTimes(1);
    expect(runtimeSnapshot.readSelectedRunSnapshot).toHaveBeenCalledTimes(1);
    expect(readControlTelegramDispatch).toHaveBeenCalledWith(context);
    expect(readControlTelegramQuestions).toHaveBeenCalledWith(context);
    expect(emitDispatchPilotAuditEvents).not.toHaveBeenCalled();
  });
});
