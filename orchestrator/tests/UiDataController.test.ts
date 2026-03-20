import http from 'node:http';

import { describe, expect, it } from 'vitest';

import { buildUiDataset } from '../src/cli/control/selectedRunPresenter.js';
import { handleUiDataRequest } from '../src/cli/control/uiDataController.js';
import type { ControlState } from '../src/cli/control/controlState.js';
import type {
  ControlSelectedRunRuntimeSnapshot,
  SelectedRunContext
} from '../src/cli/control/observabilityReadModel.js';
import type { CliManifest } from '../src/cli/types.js';

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

function buildSelectedRun(overrides: Partial<SelectedRunContext> = {}): SelectedRunContext {
  return {
    issueIdentifier: 'ISSUE-1311',
    issueId: 'issue-1311',
    taskId: 'task-1311',
    runId: 'run-1',
    lookupAliases: ['ISSUE-1311', 'task-1311', 'run-1'],
    rawStatus: 'in_progress',
    displayStatus: 'paused',
    statusReason: 'control_pause',
    startedAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:02:00.000Z',
    completedAt: null,
    summary: 'Waiting on operator',
    lastError: null,
    latestAction: 'pause',
    latestEvent: {
      at: '2026-03-20T00:02:00.000Z',
      event: 'pause',
      message: 'Waiting on operator',
      requestedBy: 'operator',
      reason: 'control_pause'
    },
    workspacePath: '/repo/.workspaces/task-1311',
    questionSummary: {
      queuedCount: 0,
      latestQuestion: null
    },
    tracked: null,
    ...overrides
  };
}

function buildSnapshot(selected: SelectedRunContext | null): ControlSelectedRunRuntimeSnapshot {
  return {
    selected,
    dispatchPilot: null,
    tracked: selected?.tracked ?? null,
    providerIntake: null
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

  it('prefers selected-run status truth over raw manifest status in the ui dataset', () => {
    const dataset = buildUiDataset({
      manifest: {
        run_id: 'run-1',
        task_id: 'task-1311',
        status: 'succeeded',
        started_at: '2026-03-20T00:00:00.000Z',
        updated_at: '2026-03-20T00:05:00.000Z',
        completed_at: '2026-03-20T00:05:00.000Z',
        summary: 'stale manifest summary',
        commands: [],
        approvals: [],
        pipeline_title: 'Task 1311'
      } as CliManifest,
      snapshot: buildSnapshot(buildSelectedRun()),
      control: {
        ...CONTROL_STATE,
        latest_action: {
          action: 'pause',
          requested_by: 'operator',
          requested_at: '2026-03-20T00:02:00.000Z',
          reason: 'control_pause'
        }
      },
      paths: {
        manifestPath: '/repo/.runs/task-1311/cli/run-1/manifest.json',
        runDir: '/repo/.runs/task-1311/cli/run-1',
        logPath: '/repo/.runs/task-1311/cli/run-1/log.txt'
      },
      generatedAt: '2026-03-20T00:06:00.000Z'
    }) as {
      tasks: Array<{
        status?: string;
        raw_status?: string;
        display_status?: string;
        bucket?: string;
        bucket_reason?: string;
      }>;
      runs: Array<{
        status?: string;
        raw_status?: string;
        display_status?: string;
      }>;
      selected: { display_status?: string } | null;
    };

    expect(dataset.selected?.display_status).toBe('paused');
    expect(dataset.tasks[0]).toMatchObject({
      status: 'in_progress',
      raw_status: 'in_progress',
      display_status: 'paused',
      bucket: 'ongoing',
      bucket_reason: 'paused'
    });
    expect(dataset.runs[0]).toMatchObject({
      status: 'in_progress',
      raw_status: 'in_progress',
      display_status: 'paused'
    });
  });
});
