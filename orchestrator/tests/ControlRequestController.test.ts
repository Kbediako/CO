import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildControlRequestRouteDispatchInput } from '../src/cli/control/controlRequestPredispatch.js';
import { handleControlRequestRouteDispatch } from '../src/cli/control/controlRequestRouteDispatch.js';
import { handleControlRequest } from '../src/cli/control/controlRequestController.js';

vi.mock('../src/cli/control/controlRequestPredispatch.js', () => ({
  buildControlRequestRouteDispatchInput: vi.fn()
}));

vi.mock('../src/cli/control/controlRequestRouteDispatch.js', () => ({
  handleControlRequestRouteDispatch: vi.fn(async () => undefined)
}));

describe('handleControlRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when the predispatch helper falls through', async () => {
    vi.mocked(buildControlRequestRouteDispatchInput).mockReturnValue(null);
    const context = { kind: 'control-context' } as never;

    await handleControlRequest(context);

    expect(buildControlRequestRouteDispatchInput).toHaveBeenCalledWith(context);
    expect(handleControlRequestRouteDispatch).not.toHaveBeenCalled();
  });

  it('forwards the populated dispatch input to the route dispatcher', async () => {
    const dispatchInput = { kind: 'dispatch-input' } as never;
    vi.mocked(buildControlRequestRouteDispatchInput).mockReturnValue(dispatchInput);
    const context = { kind: 'control-context' } as never;

    await handleControlRequest(context);

    expect(buildControlRequestRouteDispatchInput).toHaveBeenCalledWith(context);
    expect(handleControlRequestRouteDispatch).toHaveBeenCalledWith(dispatchInput);
  });
});
