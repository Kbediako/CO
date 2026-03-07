import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { handleDelegationRegisterRequest } from '../src/cli/control/delegationRegisterController.js';

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
  input: Partial<Parameters<typeof handleDelegationRegisterRequest>[0]> & {
    issuedTokenId?: string;
  } = {}
) {
  const { res, state } = createResponseRecorder();
  const issuedTokenId = input.issuedTokenId ?? 'dlt-123';
  const context = {
    req:
      input.req ?? ({ method: 'POST', url: '/delegation/register' } as http.IncomingMessage),
    res,
    delegationTokens:
      input.delegationTokens ??
      ({
        register: vi.fn(() => ({ token_id: issuedTokenId }))
      } as { register: (token: string, parentRunId: string, childRunId: string) => { token_id: string } }),
    readRequestBody:
      input.readRequestBody ?? (vi.fn(async () => ({})) as () => Promise<Record<string, unknown>>),
    persistDelegationTokens:
      input.persistDelegationTokens ?? (vi.fn(async () => undefined) as () => Promise<void>)
  };

  return { context, state };
}

describe('DelegationRegisterController', () => {
  it('returns false for non-delegation-register routes', async () => {
    const { context, state } = createContext({
      req: { method: 'GET', url: '/health' } as http.IncomingMessage
    });

    await expect(handleDelegationRegisterRequest(context)).resolves.toBe(false);
    expect(state.statusCode).toBeNull();
  });

  it('rejects requests with missing required delegation fields', async () => {
    const { context, state } = createContext({
      readRequestBody: vi.fn(async () => ({
        token: 'delegation-token',
        parent_run_id: 'parent-run'
      }))
    });

    await expect(handleDelegationRegisterRequest(context)).resolves.toBe(true);

    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'missing_delegation_fields' });
    expect(context.delegationTokens.register).not.toHaveBeenCalled();
    expect(context.persistDelegationTokens).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'snake-case aliases',
      body: {
        token: 'delegation-token-a',
        parent_run_id: 'parent-run-a',
        child_run_id: 'child-run-a'
      },
      expected: ['delegation-token-a', 'parent-run-a', 'child-run-a']
    },
    {
      label: 'camel-case aliases',
      body: {
        token: 'delegation-token-b',
        parentRunId: 'parent-run-b',
        childRunId: 'child-run-b'
      },
      expected: ['delegation-token-b', 'parent-run-b', 'child-run-b']
    },
    {
      label: 'mixed aliases',
      body: {
        token: 'delegation-token-c',
        parentRunId: 'parent-run-c',
        child_run_id: 'child-run-c'
      },
      expected: ['delegation-token-c', 'parent-run-c', 'child-run-c']
    }
  ])('registers delegation tokens with $label', async ({ body, expected }) => {
    const { context, state } = createContext({
      readRequestBody: vi.fn(async () => body)
    });

    await expect(handleDelegationRegisterRequest(context)).resolves.toBe(true);

    expect(context.delegationTokens.register).toHaveBeenCalledWith(...expected);
    expect(context.persistDelegationTokens).toHaveBeenCalledTimes(1);
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({ status: 'registered', token_id: 'dlt-123' });
  });
});
