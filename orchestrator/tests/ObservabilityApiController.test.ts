import http from 'node:http';

import { describe, expect, it } from 'vitest';

import { buildCompatibilityProjectionSnapshot } from '../src/cli/control/compatibilityIssuePresenter.js';
import {
  handleObservabilityApiRequest,
  resolveObservabilityApiRoute
} from '../src/cli/control/observabilityApiController.js';
import type { ControlState } from '../src/cli/control/controlState.js';
import type { ControlCompatibilitySourceContext } from '../src/cli/control/observabilityReadModel.js';

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

function buildCompatibilitySource(
  issueIdentifier: string,
  overrides: Partial<ControlCompatibilitySourceContext> = {}
): ControlCompatibilitySourceContext {
  return {
    issueIdentifier,
    issueId: `${issueIdentifier}-id`,
    taskId: issueIdentifier,
    runId: `${issueIdentifier}-run`,
    lookupAliases: [issueIdentifier, `${issueIdentifier}-run`],
    rawStatus: 'in_progress',
    displayStatus: 'in_progress',
    statusReason: null,
    startedAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:01:00.000Z',
    completedAt: null,
    summary: `${issueIdentifier} summary`,
    lastError: null,
    latestAction: null,
    latestEvent: {
      at: '2026-03-20T00:01:00.000Z',
      event: 'in_progress',
      message: `${issueIdentifier} summary`,
      requestedBy: null,
      reason: null
    },
    workspacePath: `/tmp/${issueIdentifier}`,
    questionSummary: {
      queuedCount: 0,
      latestQuestion: null
    },
    tracked: null,
    ...overrides
  };
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

  it('does not fabricate turn or retry counters in compatibility projections', () => {
    const runningSource = buildCompatibilitySource('task-1311-running', {
      displayStatus: 'awaiting_input',
      statusReason: 'queued_questions',
      questionSummary: {
        queuedCount: 1,
        latestQuestion: {
          questionId: 'q-1',
          prompt: 'Proceed?',
          urgency: 'high',
          queuedAt: '2026-03-20T00:01:30.000Z'
        }
      }
    });
    const retryingSource = buildCompatibilitySource('task-1311-retrying', {
      rawStatus: 'failed',
      displayStatus: 'failed',
      updatedAt: '2026-03-20T00:02:00.000Z',
      summary: 'retry pending'
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: runningSource,
      running: [runningSource],
      retrying: [retryingSource],
      dispatchPilot: null,
      tracked: null,
      providerIntake: null
    });

    expect(projection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'task-1311-running',
        display_state: 'awaiting_input',
        status_reason: 'queued_questions',
        turn_count: null,
        tokens: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        }
      })
    ]);
    expect(projection.retrying).toEqual([
      expect.objectContaining({
        issue_identifier: 'task-1311-retrying',
        state: 'failed',
        attempt: null
      })
    ]);
    const retryIssue = projection.issues.find((issue) => issue.issueIdentifier === 'task-1311-retrying');
    expect(retryIssue?.payload.attempts).toEqual({
      restart_count: null,
      current_retry_attempt: null
    });
  });
});
