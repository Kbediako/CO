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

  it('sets display_event to Codex 5-hour exhaustion message when the primary codex bucket is exhausted', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        providerLinearWorkerProof: {
          rate_limits: {
            codex: {
              primary: {
                windowDurationMins: 300,
                remaining: 0,
                limit: 30
              }
            }
          }
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>
      })
    );

    expect(runningEntry.display_event).toBe('codex 5-hour bucket exhausted; worker paused until reset');
  });

  it('sets display_event to Codex weekly exhaustion when the secondary codex bucket is exhausted', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        providerLinearWorkerProof: {
          rate_limits: {
            codex: {
              secondary: {
                windowDurationMins: 10080,
                remaining: 0,
                limit: 5
              }
            }
          }
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>
      })
    );

    expect(runningEntry.display_event).toBe('codex weekly bucket exhausted; worker paused until reset');
  });

  it('does not produce a budget exhaustion display_event when Codex and Linear budgets are healthy', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Implementing schema validation patch',
        providerLinearWorkerProof: {
          rate_limits: {
            codex: {
              primary: {
                windowDurationMins: 300,
                remaining: 10,
                limit: 30
              }
            }
          }
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>
      })
    );

    expect(runningEntry.display_event).not.toMatch(/exhausted/);
    expect(runningEntry.display_event).not.toMatch(/paused until reset/);
  });

  it('falls through to high-signal summary text when no budget exhaustion is present', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        providerDebugSnapshot: {
          progress: {
            kind: 'worker',
            phase: 'worker_turn',
            summary: 'running semantic validation tests',
            status: 'active',
            source: 'provider_debug_snapshot',
            last_semantic_progress_at: '2026-04-07T00:05:00.000Z',
            stall_reason: null,
            recorded_at: '2026-04-07T00:05:00.000Z'
          }
        } as NonNullable<ControlCompatibilitySourceContext['providerDebugSnapshot']>
      })
    );

    expect(runningEntry.display_event).toBe('running semantic validation tests');
  });

  it('humanizes task_started event key to session started for display_event', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        latestEvent: {
          at: '2026-04-07T00:01:00.000Z',
          event: 'task_started',
          message: 'Provider worker turn is active.',
          requestedBy: null,
          reason: null
        }
      })
    );

    // task_started maps to 'session started'; generic message is rejected as low-signal
    expect(runningEntry.display_event).toBe('session started');
  });

  it('humanizes review_handoff event key to review handoff ready for display_event', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: null,
        latestEvent: {
          at: '2026-04-07T00:02:00.000Z',
          event: 'review_handoff',
          message: null,
          requestedBy: null,
          reason: null
        }
      })
    );

    expect(runningEntry.display_event).toBe('review handoff ready');
  });

  it('linear complexity exhaustion produces deferred polling display_event', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.'
      }),
      {
        next_poll_in_ms: null,
        linear_budget: {
          observed_at: '2026-04-07T00:10:00.000Z',
          source: 'control-host-polling',
          suppression: 'cooldown',
          suppression_reason: 'linear_budget_complexity_exhausted',
          retry_after_seconds: null,
          cooldown_until: null,
          cooldown_active: false,
          request_id: 'polling-budget-cx',
          requests: {
            remaining: 10,
            limit: 30,
            reset_at: '2026-04-07T00:11:00.000Z'
          },
          endpoint_requests: null,
          complexity: {
            remaining: 0,
            limit: 200,
            reset_at: '2026-04-07T00:11:00.000Z'
          },
          endpoint_complexity: null
        }
      } as ControlCompatibilityRuntimeSnapshot['polling']
    );

    expect(runningEntry.display_event).toBe('linear complexity budget exhausted; polling deferred until reset');
  });
});