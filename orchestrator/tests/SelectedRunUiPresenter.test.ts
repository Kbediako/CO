import { describe, expect, it } from 'vitest';

import { buildUiDataset } from '../src/cli/control/selectedRunPresenter.js';
import type {
  ControlSelectedRunRuntimeSnapshot,
  SelectedRunContext
} from '../src/cli/control/observabilityReadModel.js';
import type { CliManifest } from '../src/cli/types.js';

function buildSelectedRunContext(overrides: Partial<SelectedRunContext> = {}): SelectedRunContext {
  return {
    issueProvider: 'linear',
    issueIdentifier: 'CO-100',
    issueId: 'issue-100',
    taskId: 'linear-co-100',
    runId: 'run-co-100',
    lookupAliases: ['CO-100', 'issue-100'],
    rawStatus: 'succeeded',
    displayStatus: 'succeeded',
    statusReason: null,
    startedAt: '2026-04-06T02:30:00.000Z',
    updatedAt: '2026-04-06T02:35:00.000Z',
    completedAt: '2026-04-06T02:35:00.000Z',
    summary: 'Completed successfully',
    lastError: null,
    latestAction: null,
    latestEvent: null,
    workspacePath: '/repo/.workspaces/co-100',
    pipelineTitle: 'Implementation gate',
    stages: [],
    approvalsTotal: 0,
    manifestPath: '/repo/.runs/linear-co-100/cli/run-co-100/manifest.json',
    runDir: '/repo/.runs/linear-co-100/cli/run-co-100',
    questionSummary: {
      queuedCount: 0,
      latestQuestion: null
    },
    tracked: { linear: null },
    compatibilityState: null,
    providerLinearWorkerProof: null,
    providerDebugSnapshot: null,
    providerRetryState: null,
    ...overrides
  };
}

function buildSnapshot(selected: SelectedRunContext): ControlSelectedRunRuntimeSnapshot {
  return {
    selected,
    dispatchPilot: null,
    tracked: null,
    providerIntake: null,
    providerWorkflow: null,
    polling: null
  };
}

const manifest = {
  run_id: 'run-co-100',
  task_id: 'linear-co-100',
  status: 'succeeded',
  started_at: '2026-04-06T02:30:00.000Z',
  updated_at: '2026-04-06T02:35:00.000Z',
  completed_at: '2026-04-06T02:35:00.000Z',
  pipeline_title: 'Implementation gate',
  summary: 'Completed successfully',
  approvals: []
} as CliManifest;

describe('SelectedRunPresenter UI dataset', () => {
  it.each([
    {
      displayStatus: 'pending_shared_root_reconciliation',
      statusReason: 'shared_root_dirty',
      expectedStatus: 'pending_shared_root_reconciliation',
      expectedBucket: 'pending',
      expectedBucketReason: 'pending_shared_root_reconciliation'
    },
    {
      displayStatus: 'failed',
      statusReason: 'shared_root_fast_forward_failed',
      expectedStatus: 'failed',
      expectedBucket: 'complete',
      expectedBucketReason: 'terminal'
    }
  ])(
    'promotes terminal merge-closeout display status %s into task/run status fields',
    ({ displayStatus, statusReason, expectedStatus, expectedBucket, expectedBucketReason }) => {
      const dataset = buildUiDataset({
        manifest,
        snapshot: buildSnapshot(
          buildSelectedRunContext({
            displayStatus,
            statusReason
          })
        ),
        control: { latest_action: null } as never,
        paths: {
          manifestPath: '/repo/.runs/linear-co-100/cli/run-co-100/manifest.json',
          runDir: '/repo/.runs/linear-co-100/cli/run-co-100',
          logPath: '/repo/.runs/linear-co-100/cli/run-co-100/runner.ndjson'
        }
      });

      const task = (dataset.tasks as Array<Record<string, unknown>>)[0];
      const run = (dataset.runs as Array<Record<string, unknown>>)[0];
      const selected = dataset.selected as Record<string, unknown>;

      expect(task).toMatchObject({
        status: expectedStatus,
        raw_status: 'succeeded',
        display_status: displayStatus,
        status_reason: statusReason,
        bucket: expectedBucket,
        bucket_reason: expectedBucketReason
      });
      expect(run).toMatchObject({
        status: expectedStatus,
        raw_status: 'succeeded',
        display_status: displayStatus,
        status_reason: statusReason
      });
      expect(selected).toMatchObject({
        raw_status: 'succeeded',
        display_status: displayStatus,
        status_reason: statusReason
      });
    }
  );
});
