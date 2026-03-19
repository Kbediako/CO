import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import {
  handleSecurityViolationRequest,
  type SecurityViolationEventPayload
} from '../src/cli/control/securityViolationController.js';

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

function createContext(
  input: Partial<Parameters<typeof handleSecurityViolationRequest>[0]> & {
    emitted?: SecurityViolationEventPayload[];
  } = {}
) {
  const { res, state } = createResponseRecorder();
  const emitted = input.emitted ?? [];
  const context = {
    req: input.req ?? ({ method: 'POST', url: '/security/violation' } as http.IncomingMessage),
    res,
    readRequestBody:
      input.readRequestBody ?? (vi.fn(async () => ({})) as () => Promise<Record<string, unknown>>),
    emitSecurityViolation:
      input.emitSecurityViolation ??
      (vi.fn(async (payload: SecurityViolationEventPayload) => {
        emitted.push(payload);
      }) as (payload: SecurityViolationEventPayload) => Promise<void>)
  };

  return { context, state, emitted };
}

describe('SecurityViolationController', () => {
  it('returns false for non-security-violation routes', async () => {
    const { context, state } = createContext({
      req: { method: 'GET', url: '/health' } as http.IncomingMessage
    });

    await expect(handleSecurityViolationRequest(context)).resolves.toBe(false);
    expect(state.statusCode).toBeNull();
  });

  it('records redacted default payloads and returns the recorded response', async () => {
    const { context, state, emitted } = createContext({
      readRequestBody: vi.fn(async () => ({}))
    });

    await expect(handleSecurityViolationRequest(context)).resolves.toBe(true);

    expect(emitted).toEqual([
      {
        kind: 'unknown',
        summary: 'security_violation',
        severity: 'high',
        related_request_id: null,
        details_redacted: true
      }
    ]);
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({ status: 'recorded' });
  });

  it('preserves explicit route payload values, including camel-case request ids', async () => {
    const { context, emitted } = createContext({
      readRequestBody: vi.fn(async () => ({
        kind: 'sandbox_escape',
        summary: 'blocked tool misuse',
        severity: 'critical',
        relatedRequestId: 'req-7'
      }))
    });

    await expect(handleSecurityViolationRequest(context)).resolves.toBe(true);

    expect(emitted).toEqual([
      {
        kind: 'sandbox_escape',
        summary: 'blocked tool misuse',
        severity: 'critical',
        related_request_id: 'req-7',
        details_redacted: true
      }
    ]);
  });
});
