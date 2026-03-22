import { describe, expect, it, vi } from 'vitest';

import {
  executeLinearGraphql,
  resolveLinearApiToken,
  resolveLinearRequestTimeoutMs
} from '../src/cli/control/linearGraphqlClient.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('linearGraphqlClient', () => {
  it('posts a GraphQL request with the configured auth header', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      expect(input.toString()).toBe('https://api.linear.app/graphql');
      expect(init?.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'lin-api-token'
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        query: 'query Viewer { viewer { id } }',
        variables: { issueId: 'lin-1' }
      });
      return jsonResponse({
        data: {
          viewer: {
            id: 'viewer-1'
          }
        }
      });
    });

    const result = await executeLinearGraphql<{ viewer: { id: string } }>({
      token: 'lin-api-token',
      timeoutMs: 30_000,
      fetchImpl,
      query: 'query Viewer { viewer { id } }',
      variables: { issueId: 'lin-1' }
    });

    expect(result).toEqual({
      ok: true,
      payload: {
        data: {
          viewer: {
            id: 'viewer-1'
          }
        }
      }
    });
  });

  it('classifies top-level GraphQL errors separately from transport failures', async () => {
    const result = await executeLinearGraphql({
      token: 'lin-api-token',
      timeoutMs: 30_000,
      fetchImpl: vi.fn(async () =>
        jsonResponse({
          errors: [{ message: 'Mutation is unavailable.' }]
        })
      ),
      query: 'mutation Unsupported { unsupportedMutation }'
    });

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: 'graphql_error',
        status: 200,
        errors: [{ message: 'Mutation is unavailable.' }]
      }
    });
  });

  it('resolves auth and timeout from the existing Linear env keys', () => {
    expect(
      resolveLinearApiToken({
        CO_LINEAR_API_KEY: 'legacy-token'
      })
    ).toBe('legacy-token');
    expect(
      resolveLinearRequestTimeoutMs({
        CO_LINEAR_REQUEST_TIMEOUT_MS: '45000'
      })
    ).toBe(45_000);
    expect(
      resolveLinearRequestTimeoutMs({
        CO_LINEAR_REQUEST_TIMEOUT_MS: 'not-a-number'
      })
    ).toBe(30_000);
  });
});
