import http from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleControlUiSessionAdmission } from '../src/cli/control/uiSessionController.js';
import { handleLinearWebhookRequest } from '../src/cli/control/linearWebhookController.js';
import { handleControlAuthenticatedRouteBranch } from '../src/cli/control/controlServerAuthenticatedRouteBranch.js';
import { emitLinearWebhookAuditEvent } from '../src/cli/control/controlServerAuditAndErrorHelpers.js';
import { handlePublicControlRoute } from '../src/cli/control/controlServerPublicRouteHelpers.js';
import { readRawBody } from '../src/cli/control/controlServerRequestBodyHelpers.js';
import { handleControlRequestRouteDispatch } from '../src/cli/control/controlRequestRouteDispatch.js';

vi.mock('../src/cli/control/uiSessionController.js', () => ({
  handleControlUiSessionAdmission: vi.fn()
}));

vi.mock('../src/cli/control/linearWebhookController.js', () => ({
  handleLinearWebhookRequest: vi.fn()
}));

vi.mock('../src/cli/control/controlServerAuthenticatedRouteBranch.js', () => ({
  handleControlAuthenticatedRouteBranch: vi.fn()
}));

vi.mock('../src/cli/control/controlServerAuditAndErrorHelpers.js', () => ({
  emitLinearWebhookAuditEvent: vi.fn(async () => undefined)
}));

vi.mock('../src/cli/control/controlServerPublicRouteHelpers.js', () => ({
  handlePublicControlRoute: vi.fn()
}));

vi.mock('../src/cli/control/controlServerRequestBodyHelpers.js', () => ({
  readRawBody: vi.fn(async () => Buffer.from('body'))
}));

function createResponseRecorder() {
  const res = {
    writeHead: vi.fn(),
    end: vi.fn()
  } as unknown as http.ServerResponse;
  return { res };
}

function createInput() {
  const { res } = createResponseRecorder();
  const req = {
    method: 'GET',
    url: '/api/v1/state?view=compact',
    headers: {}
  } as unknown as http.IncomingMessage;
  const context = {
    config: { ui: { allowedBindHosts: ['localhost'] } },
    sessionTokens: {
      issue: vi.fn(() => ({ token: 'session-token', expiresAt: '2026-03-10T03:00:00.000Z' }))
    },
    linearAdvisoryState: { kind: 'linear-state' },
    persist: {
      linearAdvisory: vi.fn(async () => undefined)
    },
    controlStore: {
      snapshot: vi.fn(() => ({ feature_toggles: { dispatch_pilot: { enabled: true } } }))
    },
    runtime: {
      publish: vi.fn()
    }
  } as never;

  return {
    pathname: '/api/v1/state',
    search: '?view=compact',
    req,
    res,
    context,
    runtimeSnapshot: { kind: 'runtime-snapshot' } as never,
    presenterContext: { kind: 'presenter-context' } as never
  };
}

describe('handleControlRequestRouteDispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(handlePublicControlRoute).mockResolvedValue(false);
    vi.mocked(handleControlUiSessionAdmission).mockReturnValue(false);
    vi.mocked(handleLinearWebhookRequest).mockResolvedValue(false);
    vi.mocked(handleControlAuthenticatedRouteBranch).mockResolvedValue(undefined);
  });

  it('short-circuits after the public route branch', async () => {
    vi.mocked(handlePublicControlRoute).mockResolvedValue(true);
    const input = createInput();

    await handleControlRequestRouteDispatch(input);

    expect(handlePublicControlRoute).toHaveBeenCalledWith({
      pathname: '/api/v1/state',
      search: '?view=compact',
      res: input.res
    });
    expect(handleControlUiSessionAdmission).not.toHaveBeenCalled();
    expect(handleLinearWebhookRequest).not.toHaveBeenCalled();
    expect(handleControlAuthenticatedRouteBranch).not.toHaveBeenCalled();
  });

  it('short-circuits after UI session admission', async () => {
    const order: string[] = [];
    vi.mocked(handlePublicControlRoute).mockImplementation(async () => {
      order.push('public');
      return false;
    });
    vi.mocked(handleControlUiSessionAdmission).mockImplementation(() => {
      order.push('ui');
      return true;
    });
    const input = createInput();

    await handleControlRequestRouteDispatch(input);

    expect(order).toEqual(['public', 'ui']);
    expect(handleControlUiSessionAdmission).toHaveBeenCalledWith({
      req: input.req,
      res: input.res,
      allowedBindHosts: ['localhost'],
      issueSession: expect.any(Function)
    });
    expect(handleLinearWebhookRequest).not.toHaveBeenCalled();
    expect(handleControlAuthenticatedRouteBranch).not.toHaveBeenCalled();
  });

  it('wires the linear webhook branch helpers and short-circuits when handled', async () => {
    const order: string[] = [];
    vi.mocked(handlePublicControlRoute).mockImplementation(async () => {
      order.push('public');
      return false;
    });
    vi.mocked(handleControlUiSessionAdmission).mockImplementation(() => {
      order.push('ui');
      return false;
    });
    vi.mocked(handleLinearWebhookRequest).mockImplementation(async (linearInput) => {
      order.push('linear');
      await linearInput.readRawBody(linearInput.req as http.IncomingMessage);
      await linearInput.emitAuditEvent({
        deliveryId: 'delivery-1',
        event: 'Issue',
        action: 'update',
        issueId: 'lin-issue-1',
        outcome: 'accepted',
        reason: 'linear_delivery_accepted'
      });
      linearInput.publishRuntime();
      return true;
    });
    const input = createInput();

    await handleControlRequestRouteDispatch(input);

    expect(order).toEqual(['public', 'ui', 'linear']);
    expect(readRawBody).toHaveBeenCalledWith(input.req);
    expect(emitLinearWebhookAuditEvent).toHaveBeenCalledWith(input.context, {
      deliveryId: 'delivery-1',
      event: 'Issue',
      action: 'update',
      issueId: 'lin-issue-1',
      outcome: 'accepted',
      reason: 'linear_delivery_accepted'
    });
    expect(input.context.runtime.publish).toHaveBeenCalledWith({ source: 'linear.webhook' });
    expect(handleControlAuthenticatedRouteBranch).not.toHaveBeenCalled();
  });

  it('falls through to the authenticated route branch when earlier branches do not handle', async () => {
    const order: string[] = [];
    vi.mocked(handlePublicControlRoute).mockImplementation(async () => {
      order.push('public');
      return false;
    });
    vi.mocked(handleControlUiSessionAdmission).mockImplementation(() => {
      order.push('ui');
      return false;
    });
    vi.mocked(handleLinearWebhookRequest).mockImplementation(async () => {
      order.push('linear');
      return false;
    });
    vi.mocked(handleControlAuthenticatedRouteBranch).mockImplementation(async () => {
      order.push('auth');
    });
    const input = createInput();

    await handleControlRequestRouteDispatch(input);

    expect(order).toEqual(['public', 'ui', 'linear', 'auth']);
    expect(handleControlAuthenticatedRouteBranch).toHaveBeenCalledWith({
      pathname: '/api/v1/state',
      req: input.req,
      res: input.res,
      context: input.context,
      runtimeSnapshot: input.runtimeSnapshot,
      presenterContext: input.presenterContext
    });
  });
});
