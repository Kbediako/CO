import { describe, expect, it, vi } from 'vitest';

import { handleAuthenticatedRouteDispatcher } from '../src/cli/control/authenticatedRouteDispatcher.js';

function createContext(
  overrides: Partial<Parameters<typeof handleAuthenticatedRouteDispatcher>[0]> = {}
) {
  const order: string[] = [];

  const context: Parameters<typeof handleAuthenticatedRouteDispatcher>[0] = {
    pathname: overrides.pathname ?? '/missing',
    method: overrides.method ?? 'GET',
    authKind: overrides.authKind ?? 'control',
    handleEventsSse: overrides.handleEventsSse ?? vi.fn(() => order.push('events')),
    handleUiData:
      overrides.handleUiData ??
      vi.fn(async () => {
        order.push('uiData');
        return false;
      }),
    handleObservabilityApi:
      overrides.handleObservabilityApi ??
      vi.fn(async () => {
        order.push('observability');
        return false;
      }),
    handleControlAction:
      overrides.handleControlAction ??
      vi.fn(async (authKind) => {
        order.push(`controlAction:${authKind}`);
      }),
    handleConfirmationCreate:
      overrides.handleConfirmationCreate ??
      vi.fn(async () => {
        order.push('confirmationCreate');
        return false;
      }),
    handleConfirmationList:
      overrides.handleConfirmationList ??
      vi.fn(async () => {
        order.push('confirmationList');
        return false;
      }),
    handleConfirmationApprove:
      overrides.handleConfirmationApprove ??
      vi.fn(async () => {
        order.push('confirmationApprove');
        return false;
      }),
    handleConfirmationIssueConsume:
      overrides.handleConfirmationIssueConsume ??
      vi.fn(async () => {
        order.push('confirmationIssueConsume');
        return false;
      }),
    handleConfirmationValidate:
      overrides.handleConfirmationValidate ??
      vi.fn(async () => {
        order.push('confirmationValidate');
        return false;
      }),
    handleSecurityViolation:
      overrides.handleSecurityViolation ??
      vi.fn(async () => {
        order.push('securityViolation');
        return false;
      }),
    handleDelegationRegister:
      overrides.handleDelegationRegister ??
      vi.fn(async () => {
        order.push('delegationRegister');
        return false;
      }),
    handleQuestionQueue:
      overrides.handleQuestionQueue ??
      vi.fn(async () => {
        order.push('questionQueue');
        return false;
      })
  };

  return { context, order };
}

describe('AuthenticatedRouteDispatcher', () => {
  it('returns false when no authenticated route handles the request', async () => {
    const { context, order } = createContext();

    await expect(handleAuthenticatedRouteDispatcher(context)).resolves.toBe(false);
    expect(order).toEqual([
      'uiData',
      'observability',
      'confirmationCreate',
      'confirmationList',
      'confirmationApprove',
      'confirmationIssueConsume',
      'confirmationValidate',
      'securityViolation',
      'delegationRegister',
      'questionQueue'
    ]);
  });

  it('short-circuits /events before other handlers', async () => {
    const { context } = createContext({
      pathname: '/events',
      method: 'GET'
    });

    await expect(handleAuthenticatedRouteDispatcher(context)).resolves.toBe(true);
    expect(context.handleEventsSse).toHaveBeenCalledTimes(1);
    expect(context.handleUiData).not.toHaveBeenCalled();
    expect(context.handleObservabilityApi).not.toHaveBeenCalled();
  });

  it('forwards authKind to /control/action and stops before later handlers', async () => {
    const { context, order } = createContext({
      pathname: '/control/action',
      method: 'POST',
      authKind: 'session'
    });

    await expect(handleAuthenticatedRouteDispatcher(context)).resolves.toBe(true);
    expect(context.handleControlAction).toHaveBeenCalledWith('session');
    expect(order).toEqual(['uiData', 'observability', 'controlAction:session']);
    expect(context.handleConfirmationCreate).not.toHaveBeenCalled();
  });

  it('delegates encoded reserved compatibility paths to observability before fallback', async () => {
    const { context, order } = createContext({
      pathname: '/api/v1/%64ispatch',
      handleObservabilityApi: vi.fn(async () => {
        order.push('observability');
        return true;
      })
    });

    await expect(handleAuthenticatedRouteDispatcher(context)).resolves.toBe(true);
    expect(order).toEqual(['uiData', 'observability']);
    expect(context.handleControlAction).not.toHaveBeenCalled();
    expect(context.handleConfirmationCreate).not.toHaveBeenCalled();
  });

  it('delegates question routes after earlier handlers fall through unchanged', async () => {
    const { context, order } = createContext({
      pathname: '/questions/enqueue',
      method: 'POST',
      handleQuestionQueue: vi.fn(async () => {
        order.push('questionQueue');
        return true;
      })
    });

    await expect(handleAuthenticatedRouteDispatcher(context)).resolves.toBe(true);
    expect(order).toEqual([
      'uiData',
      'observability',
      'confirmationCreate',
      'confirmationList',
      'confirmationApprove',
      'confirmationIssueConsume',
      'confirmationValidate',
      'securityViolation',
      'delegationRegister',
      'questionQueue'
    ]);
  });
});
