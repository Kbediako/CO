import http from 'node:http';

import { describe, expect, it } from 'vitest';

import { handleUiDataRequest } from '../src/cli/control/uiDataController.js';
import type { ControlState } from '../src/cli/control/controlState.js';

const CONTROL_STATE: ControlState = {
  run_id: 'run-1',
  control_seq: 0,
  latest_action: null,
  history: [],
  pending_confirmation: null,
  queued_questions: null,
  question_events: [],
  sessions: null,
  transport_idempotency: null,
  provider_traces: null
};

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
        controlStore: {
          snapshot: () => CONTROL_STATE
        },
        paths: {
          manifestPath: '/repo/.runs/task-1039/cli/run-1/manifest.json',
          runDir: '/repo/.runs/task-1039/cli/run-1',
          logPath: '/repo/.runs/task-1039/cli/run-1/log.txt'
        },
        readSelectedRunSnapshot: async () => ({
          selected: null,
          compatibilitySelected: null
        })
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
        controlStore: {
          snapshot: () => CONTROL_STATE
        },
        paths: {
          manifestPath: '/repo/.runs/task-1039/cli/run-1/manifest.json',
          runDir: '/repo/.runs/task-1039/cli/run-1',
          logPath: '/repo/.runs/task-1039/cli/run-1/log.txt'
        },
        readSelectedRunSnapshot: async () => ({
          selected: null,
          compatibilitySelected: null
        })
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

  it('returns the selected-run ui dataset with no-store headers', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleUiDataRequest({
      req: {
        method: 'GET',
        url: '/ui/data.json'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        controlStore: {
          snapshot: () => CONTROL_STATE
        },
        paths: {
          manifestPath: '/repo/.runs/task-1039/cli/run-1/manifest.json',
          runDir: '/repo/.runs/task-1039/cli/run-1',
          logPath: '/repo/.runs/task-1039/cli/run-1/log.txt'
        },
        readSelectedRunSnapshot: async () => ({
          selected: null,
          compatibilitySelected: null
        })
      }
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(200);
    expect(state.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    expect(state.body).toMatchObject({
      tasks: [],
      runs: [],
      selected: null
    });
  });
});
