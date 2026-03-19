import { describe, expect, it } from 'vitest';

import { buildUiDataset } from '../src/cli/control/selectedRunPresenter.js';
import type {
  ControlSelectedRunRuntimeSnapshot,
  SelectedRunContext
} from '../src/cli/control/observabilityReadModel.js';
import type { ControlState } from '../src/cli/control/controlState.js';
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

function buildSelectedRun(overrides: Partial<SelectedRunContext> = {}): SelectedRunContext {
  return {
    issueIdentifier: 'ISSUE-1037',
    issueId: 'issue-1037',
    taskId: 'task-1037',
    runId: 'run-1',
    lookupAliases: ['ISSUE-1037', 'task-1037', 'run-1'],
    rawStatus: 'in_progress',
    displayStatus: 'paused',
    statusReason: 'queued_questions',
    startedAt: '2026-03-07T04:20:00.000Z',
    updatedAt: '2026-03-07T04:21:00.000Z',
    completedAt: null,
    summary: 'Awaiting operator input',
    lastError: null,
    latestAction: 'pause',
    latestEvent: {
      at: '2026-03-07T04:21:00.000Z',
      event: 'pause',
      message: 'Awaiting operator input',
      requestedBy: 'telegram',
      reason: 'operator question'
    },
    workspacePath: '/repo',
    questionSummary: {
      queuedCount: 1,
      latestQuestion: {
        questionId: 'question-1',
        prompt: 'Approve deploy?',
        urgency: 'high',
        queuedAt: '2026-03-07T04:21:10.000Z'
      }
    },
    tracked: {
      linear: {
        provider: 'linear',
        id: 'lin-1',
        identifier: 'PREPROD-1037',
        title: 'Selected-run presenter split',
        url: 'https://linear.app/asabeko/issue/PREPROD-1037',
        state: 'In Progress',
        state_type: 'started',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        team_key: 'PREPROD',
        team_name: 'PRE-PRO/PRODUCTION',
        project_id: 'lin-project-1',
        project_name: 'CO',
        updated_at: '2026-03-07T04:22:00.000Z',
        recent_activity: []
      }
    },
    ...overrides
  };
}

function buildSnapshot(selected: SelectedRunContext | null): ControlSelectedRunRuntimeSnapshot {
  return {
    selected,
    dispatchPilot: null,
    tracked: selected?.tracked ?? null
  };
}

function buildManifest(overrides: Partial<CliManifest> = {}): CliManifest {
  return {
    run_id: 'run-1',
    task_id: 'task-1037',
    status: 'in_progress',
    started_at: '2026-03-07T04:20:00.000Z',
    updated_at: '2026-03-07T04:21:00.000Z',
    completed_at: null,
    summary: 'Awaiting operator input',
    commands: [
      {
        id: 'plan',
        title: 'Plan',
        status: 'completed'
      }
    ],
    approvals: [],
    pipeline_title: 'Selected Run Presenter',
    ...overrides
  } as CliManifest;
}

describe('SelectedRunPresenter', () => {
  it('builds selected-run ui dataset entries with relative links and selected payload', () => {
    const dataset = buildUiDataset({
      manifest: buildManifest(),
      snapshot: buildSnapshot(buildSelectedRun()),
      control: CONTROL_STATE,
      paths: {
        manifestPath: '/repo/.runs/task-1037/cli/run-1/manifest.json',
        runDir: '/repo/.runs/task-1037/cli/run-1',
        logPath: '/repo/.runs/task-1037/cli/run-1/log.txt'
      },
      generatedAt: '2026-03-07T04:30:00.000Z'
    }) as {
      generated_at: string;
      selected: { issue_identifier?: string; display_status?: string } | null;
      runs: Array<{ links?: { manifest?: string; log?: string } }>;
      tasks: Array<{ bucket?: string; question_summary?: { queued_count?: number } | null }>;
    };

    expect(dataset.generated_at).toBe('2026-03-07T04:30:00.000Z');
    expect(dataset.selected).toMatchObject({
      issue_identifier: 'ISSUE-1037',
      display_status: 'paused'
    });
    expect(dataset.runs).toHaveLength(1);
    expect(dataset.runs[0]).toMatchObject({
      links: {
        manifest: '.runs/task-1037/cli/run-1/manifest.json',
        log: '.runs/task-1037/cli/run-1/log.txt'
      }
    });
    expect(dataset.tasks).toHaveLength(1);
    expect(dataset.tasks[0]).toMatchObject({
      bucket: 'active',
      question_summary: {
        queued_count: 1
      }
    });
  });

  it('returns the null-manifest fallback dataset', () => {
    const dataset = buildUiDataset({
      manifest: null,
      snapshot: buildSnapshot(null),
      control: CONTROL_STATE,
      paths: {
        manifestPath: '/repo/.runs/task-1037/cli/run-1/manifest.json',
        runDir: '/repo/.runs/task-1037/cli/run-1',
        logPath: '/repo/.runs/task-1037/cli/run-1/log.txt'
      },
      generatedAt: '2026-03-07T04:31:00.000Z'
    });

    expect(dataset).toEqual({
      generated_at: '2026-03-07T04:31:00.000Z',
      tasks: [],
      runs: [],
      codebase: null,
      activity: [],
      selected: null
    });
  });
});
