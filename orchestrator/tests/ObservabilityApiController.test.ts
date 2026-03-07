import http from 'node:http';

import { describe, expect, it } from 'vitest';

import {
  handleObservabilityApiRequest,
  resolveObservabilityApiRoute
} from '../src/cli/control/observabilityApiController.js';
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

describe('ObservabilityApiController', () => {
  it('resolves api routes and reserves dispatch from issue matching', () => {
    expect(resolveObservabilityApiRoute('/ui/data.json')).toEqual({ kind: 'none' });
    expect(resolveObservabilityApiRoute('/api/v1/state')).toEqual({ kind: 'state' });
    expect(resolveObservabilityApiRoute('/api/v1/refresh')).toEqual({ kind: 'refresh' });
    expect(resolveObservabilityApiRoute('/api/v1/dispatch')).toEqual({ kind: 'dispatch' });
    expect(resolveObservabilityApiRoute('/api/v1/%64ispatch')).toEqual({ kind: 'not_found' });
    expect(resolveObservabilityApiRoute('/api/v1/task-1038')).toEqual({
      kind: 'issue',
      issueIdentifier: 'task-1038'
    });
  });

  it('returns method-not-allowed envelopes for state POST requests', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleObservabilityApiRequest({
      req: {
        method: 'POST',
        url: '/api/v1/state'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        controlStore: {
          snapshot: () => CONTROL_STATE
        },
        paths: {
          manifestPath: '/repo/.runs/task-1038/cli/run-1/manifest.json',
          runDir: '/repo/.runs/task-1038/cli/run-1',
          logPath: '/repo/.runs/task-1038/cli/run-1/log.txt'
        },
        readCompatibilityProjection: async () => ({
          running: [],
          retrying: [],
          selected: null,
          dispatchPilot: null,
          tracked: null
        })
      },
      readRequestBody: async () => ({}),
      requestRefresh: async () => {},
      readDispatchEvaluation: async () => ({
        issueIdentifier: null,
        evaluation: {
          summary: {
            status: 'disabled',
            reason: 'pilot_disabled_default_off',
            source_status: 'disabled',
            advisory_only: true,
            source_setup: null
          },
          recommendation: null,
          failure: null
        }
      })
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(405);
    expect(state.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(state.body).toMatchObject({
      error: {
        code: 'method_not_allowed',
        details: {
          surface: 'api_v1',
          allowed_method: 'GET'
        }
      },
      traceability: {
        surface: 'api_v1',
        decision: 'rejected',
        reason: 'method_not_allowed'
      }
    });
  });
});
