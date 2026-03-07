import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import {
  handleConfirmationValidateRequest,
  type ConfirmationValidateControllerContext
} from '../src/cli/control/confirmationValidateController.js';
import type { ConfirmationValidationResult } from '../src/cli/control/confirmations.js';

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

function createValidation(requestId = 'req-1'): ConfirmationValidationResult {
  return {
    request: {
      request_id: requestId,
      action: 'cancel',
      tool: 'delegate.cancel',
      params: { manifest_path: '/tmp/run' },
      action_params_digest: 'digest-1',
      digest_alg: 'sha256',
      requested_at: '2026-03-07T10:00:00.000Z',
      expires_at: '2026-03-07T10:05:00.000Z',
      approved_by: 'ui',
      approved_at: '2026-03-07T10:01:00.000Z'
    },
    nonce_id: 'nonce-1'
  };
}

function createContext(
  input: Partial<ConfirmationValidateControllerContext> = {}
) {
  const { res, state } = createResponseRecorder();
  const steps: string[] = [];
  const context: ConfirmationValidateControllerContext = {
    req: input.req ?? ({ method: 'POST', url: '/confirmations/validate' } as http.IncomingMessage),
    res,
    readRequestBody:
      input.readRequestBody ??
      (vi.fn(async () => {
        steps.push('read');
        return { confirm_nonce: 'signed-nonce', tool: 'delegate.cancel', params: { manifest_path: '/tmp/run' } };
      }) as () => Promise<Record<string, unknown>>),
    expireConfirmations:
      input.expireConfirmations ??
      (vi.fn(async () => {
        steps.push('expire');
      }) as () => Promise<void>),
    validateConfirmation:
      input.validateConfirmation ??
      (vi.fn(() => {
        steps.push('validate');
        return createValidation();
      }) as ConfirmationValidateControllerContext['validateConfirmation']),
    persistConfirmations:
      input.persistConfirmations ??
      (vi.fn(async () => {
        steps.push('persist');
      }) as () => Promise<void>),
    emitConfirmationResolved:
      input.emitConfirmationResolved ??
      (vi.fn(async () => {
        steps.push('emit');
      }) as ConfirmationValidateControllerContext['emitConfirmationResolved'])
  };

  return { context, state, steps };
}

describe('ConfirmationValidateController', () => {
  it('returns false for non-validate routes', async () => {
    const { context, state } = createContext({
      req: { method: 'POST', url: '/confirmations/issue' } as http.IncomingMessage
    });

    await expect(handleConfirmationValidateRequest(context)).resolves.toBe(false);
    expect(state.statusCode).toBeNull();
  });

  it('rejects missing confirmation nonces after expiring confirmations', async () => {
    const { context, state, steps } = createContext({
      readRequestBody: vi.fn(async () => {
        steps.push('read');
        return {};
      })
    });

    await expect(handleConfirmationValidateRequest(context)).resolves.toBe(true);

    expect(steps).toEqual(['expire', 'read']);
    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'missing_confirm_nonce' });
    expect(context.persistConfirmations).not.toHaveBeenCalled();
    expect(context.emitConfirmationResolved).not.toHaveBeenCalled();
  });

  it('validates confirmation nonces and emits the resolved event', async () => {
    const { context, state, steps } = createContext({
      readRequestBody: vi.fn(async () => {
        steps.push('read');
        return { confirmNonce: 'signed-nonce', tool: 'delegate.cancel', params: { manifest_path: '/tmp/run' } };
      })
    });

    await expect(handleConfirmationValidateRequest(context)).resolves.toBe(true);

    expect(steps).toEqual(['expire', 'read', 'validate', 'persist', 'emit']);
    expect(context.validateConfirmation).toHaveBeenCalledWith({
      confirmNonce: 'signed-nonce',
      tool: 'delegate.cancel',
      params: { manifest_path: '/tmp/run' }
    });
    expect(context.emitConfirmationResolved).toHaveBeenCalledWith({
      request_id: 'req-1',
      nonce_id: 'nonce-1',
      outcome: 'approved'
    });
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({
      status: 'valid',
      request_id: 'req-1',
      nonce_id: 'nonce-1'
    });
  });

  it('maps confirmation-store validation failures to the existing 409 contract', async () => {
    const { context, state } = createContext({
      validateConfirmation: vi.fn(() => {
        throw new Error('nonce_already_consumed');
      })
    });

    await expect(handleConfirmationValidateRequest(context)).resolves.toBe(true);

    expect(state.statusCode).toBe(409);
    expect(state.body).toEqual({ error: 'nonce_already_consumed' });
    expect(context.persistConfirmations).not.toHaveBeenCalled();
    expect(context.emitConfirmationResolved).not.toHaveBeenCalled();
  });
});
