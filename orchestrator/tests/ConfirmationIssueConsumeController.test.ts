import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import {
  handleConfirmationIssueConsumeRequest,
  type ConfirmationIssueConsumeControllerContext
} from '../src/cli/control/confirmationIssueConsumeController.js';
import type { ConfirmationNonce } from '../src/cli/control/confirmations.js';

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

function createNonce(requestId = 'req-1'): ConfirmationNonce {
  return {
    request_id: requestId,
    nonce_id: 'nonce-1',
    confirm_nonce: 'signed-nonce',
    action_params_digest: 'digest-1',
    digest_alg: 'sha256',
    issued_at: '2026-03-07T10:00:00.000Z',
    expires_at: '2026-03-07T10:05:00.000Z'
  };
}

function createContext(
  input: Partial<ConfirmationIssueConsumeControllerContext> = {}
) {
  const { res, state } = createResponseRecorder();
  const steps: string[] = [];
  const context: ConfirmationIssueConsumeControllerContext = {
    req: input.req ?? ({ method: 'POST', url: '/confirmations/issue' } as http.IncomingMessage),
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
    issueConfirmation:
      input.issueConfirmation ??
      (vi.fn((requestId: string) => {
        steps.push(`issue:${requestId}`);
        return createNonce(requestId);
      }) as (requestId: string) => ConfirmationNonce),
    persistConfirmations:
      input.persistConfirmations ??
      (vi.fn(async () => {
        steps.push('persist');
      }) as () => Promise<void>)
  };

  return { context, state, steps };
}

describe('ConfirmationIssueConsumeController', () => {
  it('returns false for non-confirmation issue or consume routes', async () => {
    const { context, state } = createContext({
      req: { method: 'GET', url: '/confirmations/validate' } as http.IncomingMessage
    });

    await expect(handleConfirmationIssueConsumeRequest(context)).resolves.toBe(false);
    expect(state.statusCode).toBeNull();
  });

  it('rejects missing request ids after expiring confirmations', async () => {
    const { context, state, steps } = createContext({
      readRequestBody: vi.fn(async () => {
        steps.push('read');
        return {};
      })
    });

    await expect(handleConfirmationIssueConsumeRequest(context)).resolves.toBe(true);

    expect(steps).toEqual(['expire', 'read']);
    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'missing_request_id' });
    expect(context.persistConfirmations).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'issue', url: '/confirmations/issue', requestId: 'req-issue' },
    { label: 'consume', url: '/confirmations/consume', requestId: 'req-consume' }
  ])('issues a confirmation nonce for $label routes', async ({ url, requestId }) => {
    const { context, state, steps } = createContext({
      req: { method: 'POST', url } as http.IncomingMessage,
      readRequestBody: vi.fn(async () => {
        steps.push('read');
        return { requestId };
      })
    });

    await expect(handleConfirmationIssueConsumeRequest(context)).resolves.toBe(true);

    expect(steps).toEqual(['expire', 'read', `issue:${requestId}`, 'persist']);
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual(createNonce(requestId));
  });

  it('maps confirmation-store issuance failures to the existing 409 contract', async () => {
    const { context, state } = createContext({
      issueConfirmation: vi.fn(() => {
        throw new Error('confirmation_not_approved');
      })
    });

    await expect(handleConfirmationIssueConsumeRequest(context)).resolves.toBe(true);

    expect(state.statusCode).toBe(409);
    expect(state.body).toEqual({ error: 'confirmation_not_approved' });
    expect(context.persistConfirmations).not.toHaveBeenCalled();
  });
});
