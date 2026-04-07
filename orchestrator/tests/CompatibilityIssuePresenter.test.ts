import { describe, expect, it } from 'vitest';

import {
  buildCompatibilityProjectionSnapshot,
  buildCompatibilityRunningEntry
} from '../src/cli/control/compatibilityIssuePresenter.js';
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
  selected: ControlCompatibilitySourceContext | null
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

function buildExhaustedLinearPolling() {
  return {
    next_poll_in_ms: 43_000,
    linear_budget: {
      observed_at: '2026-04-06T02:35:00.000Z',
      source: 'control-host-polling',
      suppression: 'cooldown',
      suppression_reason: 'linear_budget_shared_cooldown',
      retry_after_seconds: 43,
      cooldown_until: '2026-04-06T02:35:43.000Z',
      cooldown_active: true,
      request_id: 'polling-budget-owner',
      requests: {
        remaining: 0,
        limit: 30,
        reset_at: '2026-04-06T02:35:43.000Z'
      },
      endpoint_requests: null,
      complexity: null,
      endpoint_complexity: null
    }
  } as ControlCompatibilityRuntimeSnapshot['polling'];
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

  it('prefers scoped debug progress summaries over stale proof progress summaries for display_event', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        providerLinearWorkerProof: {
          progress: {
            kind: 'worker',
            phase: 'worker_turn',
            summary: 'stale proof progress summary',
            status: 'active',
            source: 'provider_linear_worker_proof',
            last_semantic_progress_at: '2026-04-06T02:34:00.000Z',
            stall_reason: null,
            recorded_at: '2026-04-06T02:34:00.000Z'
          }
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>,
        providerDebugSnapshot: {
          progress: {
            kind: 'worker',
            phase: 'worker_turn',
            summary: 'updated TECH_SPEC + validating status parity',
            status: 'active',
            source: 'provider_debug_snapshot',
            last_semantic_progress_at: '2026-04-06T02:35:00.000Z',
            stall_reason: null,
            recorded_at: '2026-04-06T02:35:00.000Z'
          }
        } as NonNullable<ControlCompatibilitySourceContext['providerDebugSnapshot']>
      })
    );

    expect(runningEntry.display_event).toBe('updated TECH_SPEC + validating status parity');
  });

  it('does not assign shared Linear polling ownership when no tracked Linear issue exists', () => {
    const source = buildCompatibilitySource({
      issueProvider: 'local',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      summary: 'Provider worker turn is active.'
    });
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(source),
      running: [source],
      polling: buildExhaustedLinearPolling()
    });

    expect(projection.running[0]?.display_event).not.toBe(
      'linear requests exhausted; next tracked-issue refresh at 43s'
    );
  });

  it('does not fall back to issueIdentifier when the tracked Linear owner issueId mismatches the running row', () => {
    const selected = buildCompatibilitySource({
      issueProvider: 'linear',
      issueId: 'issue-owner',
      issueIdentifier: 'CO-100',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      tracked: {
        linear: {
          id: 'issue-owner',
          identifier: 'CO-100'
        } as NonNullable<ControlCompatibilitySourceContext['tracked']>['linear']
      }
    });
    const runningSource = buildCompatibilitySource({
      issueProvider: 'linear',
      issueId: 'issue-sibling',
      issueIdentifier: 'CO-100',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      summary: 'Provider worker turn is active.'
    });
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(selected),
      running: [runningSource],
      polling: buildExhaustedLinearPolling()
    });

    expect(projection.running[0]?.issue_id).toBe('issue-sibling');
    expect(projection.running[0]?.display_event).not.toBe(
      'linear requests exhausted; next tracked-issue refresh at 43s'
    );
  });

  it('falls back to issueIdentifier when the tracked Linear owner has an issueId but the running row is legacy id-less', () => {
    const selected = buildCompatibilitySource({
      issueProvider: 'linear',
      issueId: 'issue-owner',
      issueIdentifier: 'CO-100',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      tracked: {
        linear: {
          id: 'issue-owner',
          identifier: 'CO-100'
        } as NonNullable<ControlCompatibilitySourceContext['tracked']>['linear']
      }
    });
    const runningSource = buildCompatibilitySource({
      issueProvider: 'linear',
      issueId: null,
      issueIdentifier: 'CO-100',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      summary: 'Provider worker turn is active.'
    });
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(selected),
      running: [runningSource],
      polling: buildExhaustedLinearPolling()
    });

    expect(projection.running[0]?.issue_id).toBeNull();
    expect(projection.running[0]?.display_event).toBe(
      'linear requests exhausted; next tracked-issue refresh at 43s'
    );
  });

  it('propagates maxConcurrentAgents from the runtime snapshot into the projection', () => {
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(null),
      maxConcurrentAgents: 7
    });

    expect(projection.maxConcurrentAgents).toBe(7);
  });

  it('propagates null maxConcurrentAgents when the snapshot field is absent', () => {
    const snapshot = buildCompatibilityRuntime(null);
    // omit the optional field entirely
    const projection = buildCompatibilityProjectionSnapshot(snapshot);

    expect(projection.maxConcurrentAgents).toBeNull();
  });

  it('propagates null maxConcurrentAgents when the snapshot field is explicitly null', () => {
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(null),
      maxConcurrentAgents: null
    });

    expect(projection.maxConcurrentAgents).toBeNull();
  });
});