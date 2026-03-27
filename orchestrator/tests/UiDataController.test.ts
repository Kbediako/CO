import http from 'node:http';

import { describe, expect, it } from 'vitest';

import { buildUiDataset } from '../src/cli/control/operatorDashboardPresenter.js';
import { handleUiDataRequest } from '../src/cli/control/uiDataController.js';
import type { ControlCompatibilityProjectionSnapshot } from '../src/cli/control/observabilityReadModel.js';

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

function buildProjection(
  overrides: Partial<ControlCompatibilityProjectionSnapshot> = {}
): ControlCompatibilityProjectionSnapshot {
  return {
    running: [],
    retrying: [],
    codexTotals: {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      seconds_running: 0
    },
    rateLimits: null,
    issues: [],
    selected: null,
    dispatchPilot: null,
    tracked: null,
    providerIntake: null,
    providerWorkflow: null,
    polling: null,
    ...overrides
  };
}

describe('UiDataController', () => {
  it('returns false and leaves the response untouched for non-ui routes', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleUiDataRequest({
      req: {
        method: 'GET',
        url: '/api/v1/state'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        readCompatibilityProjection: async () => buildProjection()
      }
    });

    expect(handled).toBe(false);
    expect(state.statusCode).toBeNull();
    expect(state.headers).toBeNull();
    expect(state.body).toBeNull();
  });

  it('returns the ui-specific method-not-allowed envelope for non-GET requests', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleUiDataRequest({
      req: {
        method: 'POST',
        url: '/ui/data.json'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        readCompatibilityProjection: async () => buildProjection()
      }
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(405);
    expect(state.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(state.body).toMatchObject({
      error: {
        code: 'method_not_allowed',
        details: {
          surface: 'ui',
          route: '/ui/data.json',
          allowed_method: 'GET'
        }
      }
    });
  });

  it('returns the operator-dashboard ui dataset with no-store headers', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleUiDataRequest({
      req: {
        method: 'GET',
        url: '/ui/data.json'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        readCompatibilityProjection: async () => buildProjection()
      }
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(200);
    expect(state.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    expect(state.body).toMatchObject({
      mode: 'operator_dashboard',
      read_only: true,
      counts: {
        running: 0,
        retrying: 0,
        issues: 0
      },
      running: [],
      retrying: [],
      issues: [],
      selected: null
    });
  });

  it('builds the operator-dashboard dataset directly from the compatibility projection', () => {
    const dataset = buildUiDataset({
      projection: buildProjection({
        polling: {
          enabled: true,
          interval_ms: 15000,
          checking: true,
          queued: false,
          last_mode: 'poll',
          last_requested_at: '2026-03-27T04:06:00.000Z',
          last_completed_at: null,
          last_success_at: null,
          last_error_at: null,
          last_error: null,
          next_poll_at: null,
          next_poll_in_ms: null
        }
      }),
      generatedAt: '2026-03-27T04:07:00.000Z'
    });

    expect(dataset).toMatchObject({
      generated_at: '2026-03-27T04:07:00.000Z',
      mode: 'operator_dashboard',
      polling: {
        enabled: true,
        checking: true,
        last_mode: 'poll'
      }
    });
  });
});
