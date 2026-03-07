import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import {
  handleConfirmationApproveRequest,
  type ConfirmationApproveControllerContext
} from '../src/cli/control/confirmationApproveController.js';
import type {
  ConfirmationNonce,
  ConfirmationRequest,
  ConfirmationValidationResult
} from '../src/cli/control/confirmations.js';

function createResponseRecorder() {
  const state: {
    statusCode: number | null;
    headers: Record<string, string> | null;
    body: unknown;
  } = {
    statusCode: null,
    headers: null,
    body: null
  };

  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = headers;
      return this;
    },
    end(payload?: string) {
      state.body = payload ? JSON.parse(payload) : null;
      return this;
    }
  } as unknown as http.ServerResponse;

  return { res, state };
}

function createConfirmationRequest(
  requestId = 'req-1',
  input: Partial<ConfirmationRequest> = {}
): ConfirmationRequest {
  return {
    request_id: requestId,
    action: 'cancel',
    tool: 'delegate.cancel',
    params: { manifest_path: '/tmp/run' },
    action_params_digest: 'digest-1',
    digest_alg: 'sha256',
    requested_at: '2026-03-07T10:00:00.000Z',
    expires_at: '2026-03-07T10:05:00.000Z',
    approved_by: 'ui',
    approved_at: '2026-03-07T10:01:00.000Z',
    ...input
  };
}

function createNonce(requestId = 'req-1'): ConfirmationNonce {
  return {
    request_id: requestId,
    nonce_id: 'nonce-1',
    confirm_nonce: 'signed-nonce',
    action_params_digest: 'digest-1',
    digest_alg: 'sha256',
    issued_at: '2026-03-07T10:01:00.000Z',
    expires_at: '2026-03-07T10:05:00.000Z'
  };
}

function createValidation(requestId = 'req-1'): ConfirmationValidationResult {
  return {
    request: createConfirmationRequest(requestId, {
      tool: 'ui.cancel',
      params: {}
    }),
    nonce_id: 'nonce-1'
  };
}

function createContext(
  input: Partial<ConfirmationApproveControllerContext> = {}
) {
  const { res, state } = createResponseRecorder();
  const steps: string[] = [];
  const context: ConfirmationApproveControllerContext = {
    req: input.req ?? ({ method: 'POST', url: '/confirmations/approve' } as http.IncomingMessage),
    res,
    readRequestBody:
      input.readRequestBody ??
      (vi.fn(async () => {
        steps.push('read');
        return { request_id: 'req-1' };
      }) as () => Promise<Record<string, unknown>>),
    expireConfirmations:
      input.expireConfirmations ??
      (vi.fn(async () => {
        steps.push('expire');
      }) as () => Promise<void>),
    approveConfirmation:
      input.approveConfirmation ??
      (vi.fn((requestId: string, actor: string) => {
        steps.push(`approve:${requestId}:${actor}`);
      }) as ConfirmationApproveControllerContext['approveConfirmation']),
    readConfirmation:
      input.readConfirmation ??
      (vi.fn((requestId: string) => {
        steps.push(`get:${requestId}`);
        return createConfirmationRequest(requestId);
      }) as ConfirmationApproveControllerContext['readConfirmation']),
    persistConfirmations:
      input.persistConfirmations ??
      (vi.fn(async () => {
        steps.push('persist-confirmations');
      }) as () => Promise<void>),
    issueConfirmation:
      input.issueConfirmation ??
      (vi.fn((requestId: string) => {
        steps.push(`issue:${requestId}`);
        return createNonce(requestId);
      }) as ConfirmationApproveControllerContext['issueConfirmation']),
    validateConfirmation:
      input.validateConfirmation ??
      (vi.fn((validateInput) => {
        steps.push(`validate:${validateInput.confirmNonce}:${validateInput.tool}:${JSON.stringify(validateInput.params)}`);
        return createValidation();
      }) as ConfirmationApproveControllerContext['validateConfirmation']),
    emitConfirmationResolved:
      input.emitConfirmationResolved ??
      (vi.fn(async (payload) => {
        steps.push(`emit:${payload.request_id}:${payload.nonce_id}`);
      }) as ConfirmationApproveControllerContext['emitConfirmationResolved']),
    updateControlAction:
      input.updateControlAction ??
      (vi.fn((controlInput) => {
        steps.push(`update-control:${controlInput.requestId}:${controlInput.requestedBy}`);
      }) as ConfirmationApproveControllerContext['updateControlAction']),
    persistControl:
      input.persistControl ??
      (vi.fn(async () => {
        steps.push('persist-control');
      }) as ConfirmationApproveControllerContext['persistControl']),
    publishRuntime:
      input.publishRuntime ??
      (vi.fn(() => {
        steps.push('publish');
      }) as ConfirmationApproveControllerContext['publishRuntime'])
  };

  return { context, state, steps };
}

describe('ConfirmationApproveController', () => {
  it('returns false for non-approve routes', async () => {
    const { context, state } = createContext({
      req: { method: 'POST', url: '/confirmations/create' } as http.IncomingMessage
    });

    await expect(handleConfirmationApproveRequest(context)).resolves.toBe(false);
    expect(state.statusCode).toBeNull();
  });

  it('rejects missing request ids after expiring confirmations', async () => {
    const { context, state, steps } = createContext({
      readRequestBody: vi.fn(async () => {
        steps.push('read');
        return {};
      })
    });

    await expect(handleConfirmationApproveRequest(context)).resolves.toBe(true);

    expect(steps).toEqual(['expire', 'read']);
    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'missing_request_id' });
    expect(context.approveConfirmation).not.toHaveBeenCalled();
    expect(context.persistConfirmations).not.toHaveBeenCalled();
  });

  it('accepts camel-case requestId, defaults actor to ui, and preserves the plain approval response for non-ui fast-path approvals', async () => {
    const { context, state, steps } = createContext({
      readRequestBody: vi.fn(async () => {
        steps.push('read');
        return { requestId: 'req-camel' };
      }),
      readConfirmation: vi.fn((requestId: string) => {
        steps.push(`get:${requestId}`);
        return createConfirmationRequest(requestId, {
          tool: 'delegate.cancel',
          params: { manifest_path: '/tmp/run' }
        });
      })
    });

    await expect(handleConfirmationApproveRequest(context)).resolves.toBe(true);

    expect(steps).toEqual([
      'expire',
      'read',
      'approve:req-camel:ui',
      'get:req-camel',
      'persist-confirmations'
    ]);
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({ status: 'approved' });
    expect(context.issueConfirmation).not.toHaveBeenCalled();
    expect(context.validateConfirmation).not.toHaveBeenCalled();
    expect(context.emitConfirmationResolved).not.toHaveBeenCalled();
    expect(context.updateControlAction).not.toHaveBeenCalled();
    expect(context.persistControl).not.toHaveBeenCalled();
    expect(context.publishRuntime).not.toHaveBeenCalled();
  });

  it('runs the ui.cancel fast-path through nonce issue, validation, resolved emit, and cancel publication', async () => {
    const { context, state, steps } = createContext({
      readRequestBody: vi.fn(async () => {
        steps.push('read');
        return { request_id: 'req-ui-cancel', actor: 'telegram' };
      }),
      readConfirmation: vi.fn((requestId: string) => {
        steps.push(`get:${requestId}`);
        return createConfirmationRequest(requestId, {
          tool: 'ui.cancel',
          params: {}
        });
      }),
      validateConfirmation: vi.fn((validateInput) => {
        steps.push(`validate:${validateInput.confirmNonce}:${validateInput.tool}:${JSON.stringify(validateInput.params)}`);
        return createValidation('req-ui-cancel');
      })
    });

    await expect(handleConfirmationApproveRequest(context)).resolves.toBe(true);

    expect(steps).toEqual([
      'expire',
      'read',
      'approve:req-ui-cancel:telegram',
      'get:req-ui-cancel',
      'persist-confirmations',
      'issue:req-ui-cancel',
      'validate:signed-nonce:ui.cancel:{}',
      'persist-confirmations',
      'emit:req-ui-cancel:nonce-1',
      'update-control:req-ui-cancel:telegram',
      'persist-control',
      'publish'
    ]);
    expect(context.emitConfirmationResolved).toHaveBeenCalledWith({
      request_id: 'req-ui-cancel',
      nonce_id: 'nonce-1',
      outcome: 'approved'
    });
    expect(context.updateControlAction).toHaveBeenCalledWith({
      action: 'cancel',
      requestedBy: 'telegram',
      requestId: 'req-ui-cancel'
    });
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({ status: 'approved' });
  });

  it('maps ui.cancel fast-path failures to the existing 409 contract', async () => {
    const { context, state, steps } = createContext({
      readConfirmation: vi.fn((requestId: string) => {
        steps.push(`get:${requestId}`);
        return createConfirmationRequest(requestId, {
          tool: 'ui.cancel',
          params: {}
        });
      }),
      validateConfirmation: vi.fn((validateInput) => {
        steps.push(`validate:${validateInput.confirmNonce}:${validateInput.tool}:${JSON.stringify(validateInput.params)}`);
        throw new Error('confirmation_invalid');
      })
    });

    await expect(handleConfirmationApproveRequest(context)).resolves.toBe(true);

    expect(steps).toEqual([
      'expire',
      'read',
      'approve:req-1:ui',
      'get:req-1',
      'persist-confirmations',
      'issue:req-1',
      'validate:signed-nonce:ui.cancel:{}'
    ]);
    expect(state.statusCode).toBe(409);
    expect(state.body).toEqual({ error: 'confirmation_invalid' });
    expect(context.emitConfirmationResolved).not.toHaveBeenCalled();
    expect(context.updateControlAction).not.toHaveBeenCalled();
    expect(context.persistControl).not.toHaveBeenCalled();
    expect(context.publishRuntime).not.toHaveBeenCalled();
  });
});
