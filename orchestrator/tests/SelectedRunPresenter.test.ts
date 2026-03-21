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
    pipelineTitle: 'Selected Run Presenter',
    stages: [
      {
        id: 'plan',
        title: 'Plan',
        status: 'completed'
      }
    ],
    approvalsTotal: 0,
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
      bucket: 'ongoing',
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

  it('keeps ui task and run rows on the selected child manifest when one is preferred', () => {
    const dataset = buildUiDataset({
      manifest: buildManifest({
        run_id: 'host-run',
        task_id: 'host-task',
        status: 'succeeded',
        started_at: '2026-03-07T04:10:00.000Z',
        updated_at: '2026-03-07T04:15:00.000Z',
        completed_at: '2026-03-07T04:15:00.000Z',
        summary: 'Control host ready',
        pipeline_title: 'Control Host'
      }),
      snapshot: buildSnapshot(
        buildSelectedRun({
          taskId: 'linear-lin-issue-1',
          runId: 'child-run',
          startedAt: '2026-03-07T04:20:00.000Z',
          updatedAt: '2026-03-07T04:21:00.000Z',
          summary: 'Child run awaiting operator input',
          pipelineTitle: 'Child Pipeline',
          stages: [
            {
              id: 'build',
              title: 'Build',
              status: 'completed'
            },
            {
              id: 'review',
              title: 'Review',
              status: 'in_progress'
            }
          ],
          approvalsTotal: 2,
          manifestPath: '/repo/.runs/linear-lin-issue-1/cli/child-run/manifest.json',
          runDir: '/repo/.runs/linear-lin-issue-1/cli/child-run'
        })
      ),
      control: CONTROL_STATE,
      paths: {
        manifestPath: '/repo/.runs/host-task/cli/host-run/manifest.json',
        runDir: '/repo/.runs/host-task/cli/host-run',
        logPath: '/repo/.runs/host-task/cli/host-run/log.txt'
      },
      generatedAt: '2026-03-07T04:30:00.000Z'
    }) as {
      runs: Array<{
        run_id?: string;
        task_id?: string;
        started_at?: string | null;
        updated_at?: string | null;
        completed_at?: string | null;
        links?: { manifest?: string; log?: string };
        stages?: unknown[];
        approvals_total?: number;
      }>;
      tasks: Array<{
        task_id?: string;
        title?: string;
        bucket?: string;
        bucket_reason?: string;
        last_update?: string | null;
        latest_run_id?: string | null;
        summary?: string;
        approvals_total?: number;
      }>;
    };

    expect(dataset.runs[0]).toMatchObject({
      run_id: 'child-run',
      task_id: 'linear-lin-issue-1',
      started_at: '2026-03-07T04:20:00.000Z',
      updated_at: '2026-03-07T04:21:00.000Z',
      completed_at: null,
      approvals_total: 2,
      stages: [
        {
          id: 'build',
          title: 'Build',
          status: 'completed'
        },
        {
          id: 'review',
          title: 'Review',
          status: 'in_progress'
        }
      ],
      links: {
        manifest: '.runs/linear-lin-issue-1/cli/child-run/manifest.json',
        log: '.runs/linear-lin-issue-1/cli/child-run/runner.ndjson'
      }
    });
    expect(dataset.tasks[0]).toMatchObject({
      task_id: 'linear-lin-issue-1',
      title: 'Child Pipeline',
      bucket: 'ongoing',
      bucket_reason: 'paused',
      last_update: '2026-03-07T04:21:00.000Z',
      latest_run_id: 'child-run',
      summary: 'Child run awaiting operator input',
      approvals_total: 2
    });
  });

  it('does not leak host summary or timestamps when a selected child manifest has null fields', () => {
    const dataset = buildUiDataset({
      manifest: buildManifest({
        run_id: 'host-run',
        task_id: 'host-task',
        status: 'succeeded',
        started_at: '2026-03-07T04:10:00.000Z',
        updated_at: '2026-03-07T04:15:00.000Z',
        completed_at: '2026-03-07T04:15:00.000Z',
        summary: 'Control host ready',
        pipeline_title: 'Control Host'
      }),
      snapshot: buildSnapshot(
        buildSelectedRun({
          taskId: 'linear-lin-issue-2',
          runId: 'child-run-2',
          startedAt: null,
          updatedAt: null,
          completedAt: null,
          summary: null,
          pipelineTitle: 'Child Pipeline',
          manifestPath: '/repo/.runs/linear-lin-issue-2/cli/child-run-2/manifest.json',
          runDir: '/repo/.runs/linear-lin-issue-2/cli/child-run-2'
        })
      ),
      control: CONTROL_STATE,
      paths: {
        manifestPath: '/repo/.runs/host-task/cli/host-run/manifest.json',
        runDir: '/repo/.runs/host-task/cli/host-run',
        logPath: '/repo/.runs/host-task/cli/host-run/log.txt'
      },
      generatedAt: '2026-03-07T04:31:00.000Z'
    }) as {
      runs: Array<{
        run_id?: string;
        task_id?: string;
        started_at?: string | null;
        updated_at?: string | null;
        completed_at?: string | null;
      }>;
      tasks: Array<{
        task_id?: string;
        bucket?: string;
        bucket_reason?: string;
        last_update?: string | null;
        latest_run_id?: string | null;
        summary?: string;
      }>;
    };

    expect(dataset.runs[0]).toMatchObject({
      run_id: 'child-run-2',
      task_id: 'linear-lin-issue-2',
      started_at: null,
      updated_at: null,
      completed_at: null
    });
    expect(dataset.tasks[0]).toMatchObject({
      task_id: 'linear-lin-issue-2',
      bucket: 'ongoing',
      bucket_reason: 'paused',
      last_update: null,
      latest_run_id: 'child-run-2',
      summary: ''
    });
  });

  it('does not leak a host pause action into a selected child manifest with no latest action', () => {
    const dataset = buildUiDataset({
      manifest: buildManifest({
        run_id: 'host-run',
        task_id: 'host-task',
        status: 'in_progress'
      }),
      snapshot: buildSnapshot(
        buildSelectedRun({
          taskId: 'linear-lin-issue-3',
          runId: 'child-run-3',
          displayStatus: 'in_progress',
          statusReason: null,
          latestAction: null,
          manifestPath: '/repo/.runs/linear-lin-issue-3/cli/child-run-3/manifest.json',
          runDir: '/repo/.runs/linear-lin-issue-3/cli/child-run-3'
        })
      ),
      control: {
        ...CONTROL_STATE,
        latest_action: {
          action: 'pause',
          requested_by: 'operator',
          reason: 'host only'
        }
      },
      paths: {
        manifestPath: '/repo/.runs/host-task/cli/host-run/manifest.json',
        runDir: '/repo/.runs/host-task/cli/host-run',
        logPath: '/repo/.runs/host-task/cli/host-run/log.txt'
      },
      generatedAt: '2026-03-07T04:32:00.000Z'
    }) as {
      tasks: Array<{ bucket?: string; bucket_reason?: string; display_status?: string }>;
    };

    expect(dataset.tasks[0]).toMatchObject({
      bucket: 'active',
      bucket_reason: 'running',
      display_status: 'in_progress'
    });
  });
});
