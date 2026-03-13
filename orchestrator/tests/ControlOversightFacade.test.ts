import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createControlOversightFacade } from '../src/cli/control/controlOversightFacade.js';
import { createControlTelegramReadAdapter } from '../src/cli/control/controlTelegramReadAdapter.js';

vi.mock('../src/cli/control/controlTelegramReadAdapter.js', () => ({
  createControlTelegramReadAdapter: vi.fn()
}));

describe('ControlOversightFacade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('composes the telegram read seam with runtime subscription', async () => {
    const readAdapter = {
      readSelectedRun: vi
        .fn()
        .mockResolvedValueOnce({
          selected: null,
          dispatchPilot: null,
          tracked: null
        })
        .mockResolvedValueOnce({
          selected: { issueIdentifier: 'task-1147' },
          dispatchPilot: null,
          tracked: null
        }),
      readDispatch: vi.fn(async () => ({ dispatch_pilot: { status: 'ready' } })),
      readQuestions: vi.fn(async () => ({ questions: [{ question_id: 'q-1147' }] }))
    };
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    vi.mocked(createControlTelegramReadAdapter).mockReturnValue(readAdapter as never);

    const context = {
      runtime: {
        subscribe
      }
    };

    const facade = createControlOversightFacade(context as never);

    await expect(facade.readSelectedRun()).resolves.toEqual({
      selected: null,
      dispatchPilot: null,
      tracked: null
    });
    await expect(facade.readSelectedRun()).resolves.toEqual({
      selected: { issueIdentifier: 'task-1147' },
      dispatchPilot: null,
      tracked: null
    });
    await expect(facade.readDispatch()).resolves.toEqual({
      dispatch_pilot: { status: 'ready' }
    });
    await expect(facade.readQuestions()).resolves.toEqual({
      questions: [{ question_id: 'q-1147' }]
    });

    const listener = vi.fn();
    expect(facade.subscribe(listener)).toBe(unsubscribe);

    expect(createControlTelegramReadAdapter).toHaveBeenCalledWith(context);
    expect(readAdapter.readSelectedRun).toHaveBeenCalledTimes(2);
    expect(readAdapter.readDispatch).toHaveBeenCalledOnce();
    expect(readAdapter.readQuestions).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledWith(listener);
  });
});
