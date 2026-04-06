import { describe, expect, it } from 'vitest';

import { buildCompatibilityProjectionSnapshot } from '../src/cli/control/compatibilityIssuePresenter.js';
import type {
  ControlCompatibilityRuntimeSnapshot,
  ControlCompatibilitySourceContext
} from '../src/cli/control/observabilityReadModel.js';

function buildCompatibilitySource(
  overrides: Partial<ControlCompatibilitySourceContext> = {}
): ControlCompatibilitySourceContext {
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

function buildCompatibilityRuntime(
  selected: ControlCompatibilitySourceContext
): ControlCompatibilityRuntimeSnapshot {
  return {
    selected,
    running: [],
    retrying: [],
    codexTotals: {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      seconds_running: 0
    },
    rateLimits: null,
    dispatchPilot: null,
    tracked: null,
    providerIntake: null,
    providerWorkflow: null,
    polling: null
  };
}

describe('CompatibilityIssuePresenter', () => {
  it.each([
    {
      displayStatus: 'pending_shared_root_reconciliation',
      statusReason: 'shared_root_dirty'
    },
    {
      displayStatus: 'failed',
      statusReason: 'shared_root_fast_forward_failed'
    }
  ])(
    'promotes terminal merge-closeout display status %s to the issue status field',
    ({ displayStatus, statusReason }) => {
      const projection = buildCompatibilityProjectionSnapshot(
        buildCompatibilityRuntime(
          buildCompatibilitySource({
            displayStatus,
            statusReason
          })
        )
      );

      expect(projection.selected).toMatchObject({
        raw_status: 'succeeded',
        display_status: displayStatus,
        status_reason: statusReason
      });
      expect(projection.issues).toHaveLength(1);
      expect(projection.issues[0]?.payload).toMatchObject({
        status: displayStatus,
        raw_status: 'succeeded',
        display_status: displayStatus,
        status_reason: statusReason
      });
    }
  );
});
