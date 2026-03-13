import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readControlTelegramDispatch } from '../src/cli/control/controlTelegramDispatchRead.js';
import { readControlTelegramQuestions } from '../src/cli/control/controlTelegramQuestionRead.js';
import { createControlOversightReadService } from '../src/cli/control/controlOversightReadService.js';

vi.mock('../src/cli/control/controlTelegramDispatchRead.js', () => ({
  readControlTelegramDispatch: vi.fn()
}));

vi.mock('../src/cli/control/controlTelegramQuestionRead.js', () => ({
  readControlTelegramQuestions: vi.fn()
}));

describe('ControlOversightReadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the coordinator-owned oversight read service from runtime selected-run reads plus the existing helper seams', async () => {
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

    const service = createControlOversightReadService(context as never);

    await expect(service.readSelectedRun()).resolves.toEqual(selectedRun);
    await expect(service.readDispatch()).resolves.toEqual({
      dispatch_pilot: {
        status: 'ready',
        source_status: 'ready',
        reason: 'signal_threshold_met'
      }
    });
    await expect(service.readQuestions()).resolves.toEqual({
      questions: [{ question_id: 'q-1078', prompt: 'Continue?' }]
    });

    expect(runtime.snapshot).toHaveBeenCalledTimes(1);
    expect(runtimeSnapshot.readSelectedRunSnapshot).toHaveBeenCalledTimes(1);
    expect(readControlTelegramDispatch).toHaveBeenCalledWith(context);
    expect(readControlTelegramQuestions).toHaveBeenCalledWith(context);
    expect(emitDispatchPilotAuditEvents).not.toHaveBeenCalled();
  });
});
