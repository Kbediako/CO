import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import {
  handleConfirmationListRequest,
  type ConfirmationListControllerContext
} from '../src/cli/control/confirmationListController.js';
import type { ConfirmationRequest } from '../src/cli/control/confirmations.js';

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
    params: { secret: 'do-not-leak' },
    action_params_digest: 'digest-1',
    digest_alg: 'sha256',
    requested_at: '2026-03-07T10:00:00.000Z',
    expires_at: '2026-03-07T10:05:00.000Z',
    approved_by: null,
    approved_at: null,
    ...input
  };
}

function createContext(
  input: Partial<ConfirmationListControllerContext> = {}
) {
  const { res, state } = createResponseRecorder();
  const steps: string[] = [];
  const context: ConfirmationListControllerContext = {
    req: input.req ?? ({ method: 'GET', url: '/confirmations' } as http.IncomingMessage),
    res,
    expireConfirmations:
      input.expireConfirmations ??
      (vi.fn(async () => {
        steps.push('expire');
      }) as () => Promise<void>),
    listPendingConfirmations:
      input.listPendingConfirmations ??
      (vi.fn(() => {
        steps.push('list');
        return [createConfirmationRequest()];
      }) as () => ConfirmationRequest[])
  };

  return { context, state, steps };
}

describe('ConfirmationListController', () => {
  it('returns false for non-list routes', async () => {
    const { context, state } = createContext({
      req: { method: 'POST', url: '/confirmations' } as http.IncomingMessage
    });

    await expect(handleConfirmationListRequest(context)).resolves.toBe(false);
    expect(state.statusCode).toBeNull();
  });

  it('expires confirmations before returning the sanitized pending list', async () => {
    const { context, state, steps } = createContext({
      listPendingConfirmations: vi.fn(() => {
        steps.push('list');
        return [
          createConfirmationRequest('req-visible', {
            params: { secret: 'do-not-leak' }
          })
        ];
      })
    });

    await expect(handleConfirmationListRequest(context)).resolves.toBe(true);

    expect(steps).toEqual(['expire', 'list']);
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({
      pending: [
        {
          request_id: 'req-visible',
          action: 'cancel',
          tool: 'delegate.cancel',
          action_params_digest: 'digest-1',
          digest_alg: 'sha256',
          requested_at: '2026-03-07T10:00:00.000Z',
          expires_at: '2026-03-07T10:05:00.000Z',
          approved_by: null,
          approved_at: null
        }
      ]
    });
    expect(JSON.stringify(state.body)).not.toContain('do-not-leak');
  });
});
