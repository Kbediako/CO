import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import {
  handleConfirmationCreateRequest,
  type ConfirmationCreateControllerContext
} from '../src/cli/control/confirmationCreateController.js';
import type { ConfirmationCreateResult } from '../src/cli/control/confirmations.js';

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

function createConfirmationResult(
  requestId = 'req-1',
  input: Partial<ConfirmationCreateResult> = {}
): ConfirmationCreateResult {
  return {
    confirmation: {
      request_id: requestId,
      action: 'cancel',
      tool: 'delegate.cancel',
      params: { manifest_path: '/tmp/run' },
      action_params_digest: 'digest-1',
      digest_alg: 'sha256',
      requested_at: '2026-03-07T10:00:00.000Z',
      expires_at: '2026-03-07T10:05:00.000Z',
      approved_by: null,
      approved_at: null,
      ...(input.confirmation ?? {})
    },
    wasCreated: input.wasCreated ?? true
  };
}

function createContext(
  input: Partial<ConfirmationCreateControllerContext> = {}
) {
  const { res, state } = createResponseRecorder();
  const steps: string[] = [];
  const context: ConfirmationCreateControllerContext = {
    req: input.req ?? ({ method: 'POST', url: '/confirmations/create' } as http.IncomingMessage),
    res,
    authKind: input.authKind ?? 'control',
    readRequestBody:
      input.readRequestBody ??
      (vi.fn(async () => {
        steps.push('read');
        return {
          action: 'cancel',
          tool: 'delegate.cancel',
          params: { manifest_path: '/tmp/run' }
        };
      }) as () => Promise<Record<string, unknown>>),
    expireConfirmations:
      input.expireConfirmations ??
      (vi.fn(async () => {
        steps.push('expire');
      }) as () => Promise<void>),
    createConfirmation:
      input.createConfirmation ??
      (vi.fn((createInput) => {
        steps.push(`create:${createInput.action}:${createInput.tool}:${JSON.stringify(createInput.params)}`);
        return createConfirmationResult();
      }) as ConfirmationCreateControllerContext['createConfirmation']),
    persistConfirmations:
      input.persistConfirmations ??
      (vi.fn(async () => {
        steps.push('persist');
      }) as () => Promise<void>),
    maybeAutoPause:
      input.maybeAutoPause ??
      (vi.fn(async (requestId: string) => {
        steps.push(`auto-pause:${requestId}`);
      }) as ConfirmationCreateControllerContext['maybeAutoPause']),
    readRunId:
      input.readRunId ??
      (vi.fn(() => 'run-1') as () => string),
    emitConfirmationRequired:
      input.emitConfirmationRequired ??
      (vi.fn(async (payload) => {
        steps.push(`emit:${payload.request_id}`);
      }) as ConfirmationCreateControllerContext['emitConfirmationRequired'])
  };

  return { context, state, steps };
}

describe('ConfirmationCreateController', () => {
  it('returns false for non-create routes', async () => {
    const { context, state } = createContext({
      req: { method: 'POST', url: '/confirmations/approve' } as http.IncomingMessage
    });

    await expect(handleConfirmationCreateRequest(context)).resolves.toBe(false);
    expect(state.statusCode).toBeNull();
  });

  it('creates confirmations, auto-pauses, and emits confirmation_required for new requests', async () => {
    const { context, state, steps } = createContext();

    await expect(handleConfirmationCreateRequest(context)).resolves.toBe(true);

    expect(steps).toEqual([
      'expire',
      'read',
      'create:cancel:delegate.cancel:{"manifest_path":"/tmp/run"}',
      'persist',
      'auto-pause:req-1',
      'emit:req-1'
    ]);
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({
      request_id: 'req-1',
      confirm_scope: {
        run_id: 'run-1',
        action: 'cancel',
        action_params_digest: 'digest-1'
      },
      action_params_digest: 'digest-1',
      digest_alg: 'sha256',
      confirm_expires_in_ms: 300000
    });
    expect(context.emitConfirmationRequired).toHaveBeenCalledWith(state.body);
  });

  it('reuses duplicate confirmations without re-pausing or re-emitting', async () => {
    const { context, state, steps } = createContext({
      createConfirmation: vi.fn((createInput) => {
        steps.push(`create:${createInput.action}:${createInput.tool}:${JSON.stringify(createInput.params)}`);
        return createConfirmationResult('req-existing', { wasCreated: false });
      })
    });

    await expect(handleConfirmationCreateRequest(context)).resolves.toBe(true);

    expect(steps).toEqual([
      'expire',
      'read',
      'create:cancel:delegate.cancel:{"manifest_path":"/tmp/run"}',
      'persist'
    ]);
    expect(context.maybeAutoPause).not.toHaveBeenCalled();
    expect(context.emitConfirmationRequired).not.toHaveBeenCalled();
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({
      request_id: 'req-existing',
      confirm_scope: {
        run_id: 'run-1',
        action: 'cancel',
        action_params_digest: 'digest-1'
      },
      action_params_digest: 'digest-1',
      digest_alg: 'sha256',
      confirm_expires_in_ms: 300000
    });
  });

  it('restricts session-auth create requests to ui.cancel and strips params', async () => {
    const { context, state, steps } = createContext({
      authKind: 'session',
      readRequestBody: vi
        .fn()
        .mockImplementationOnce(async () => {
          steps.push('read');
          return { action: 'cancel', tool: 'delegate.cancel', params: { manifest_path: '/tmp/run' } };
        })
        .mockImplementationOnce(async () => {
          steps.push('read');
          return { action: 'cancel', tool: 'ui.cancel', params: { secret: 'nope' } };
        })
    });

    await expect(handleConfirmationCreateRequest(context)).resolves.toBe(true);
    expect(state.statusCode).toBe(403);
    expect(state.body).toEqual({ error: 'ui_confirmation_disallowed' });
    expect(context.createConfirmation).not.toHaveBeenCalled();

    steps.length = 0;
    state.statusCode = null;
    state.headers = null;
    state.body = null;

    await expect(handleConfirmationCreateRequest(context)).resolves.toBe(true);
    expect(steps).toEqual([
      'expire',
      'read',
      'create:cancel:ui.cancel:{}',
      'persist',
      'auto-pause:req-1',
      'emit:req-1'
    ]);
    expect(state.statusCode).toBe(200);
    expect(context.createConfirmation).toHaveBeenLastCalledWith({
      action: 'cancel',
      tool: 'ui.cancel',
      params: {}
    });
  });

  it('rejects session-auth ui.cancel requests unless the raw action is cancel', async () => {
    const { context, state, steps } = createContext({
      authKind: 'session',
      readRequestBody: vi.fn(async () => {
        steps.push('read');
        return { action: 'merge', tool: 'ui.cancel', params: {} };
      })
    });

    await expect(handleConfirmationCreateRequest(context)).resolves.toBe(true);

    expect(steps).toEqual(['expire', 'read']);
    expect(state.statusCode).toBe(403);
    expect(state.body).toEqual({ error: 'ui_confirmation_disallowed' });
    expect(context.createConfirmation).not.toHaveBeenCalled();
  });
});
