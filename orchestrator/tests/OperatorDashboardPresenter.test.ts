import { describe, expect, it } from 'vitest';

import { buildUiDataset } from '../src/cli/control/operatorDashboardPresenter.js';
import type {
  ControlCompatibilityProjectionSnapshot,
  ControlRunningPayload,
  ControlRetryPayload
} from '../src/cli/control/observabilityReadModel.js';

function buildMinimalProjection(
  overrides: Partial<ControlCompatibilityProjectionSnapshot> = {}
): ControlCompatibilityProjectionSnapshot {
  return {
    running: [],
    retrying: [],
    codexTotals: {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      seconds_running: 0
    },
    rateLimits: null,
    issues: [],
    selected: null,
    dispatchPilot: null,
    tracked: null,
    providerIntake: null,
    providerWorkflow: null,
    polling: null,
    ...overrides
  };
}

function buildRunningEntry(overrides: Partial<ControlRunningPayload> = {}): ControlRunningPayload {
  return {
    issue_identifier: 'CO-1',
    issue_id: 'issue-1',
    state: 'in_progress',
    display_state: 'running',
    status_reason: null,
    pid: null,
    session_id: null,
    turn_count: 1,
    last_event: null,
    last_message: null,
    started_at: null,
    last_event_at: null,
    tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    ...overrides
  };
}

function buildRetryEntry(overrides: Partial<ControlRetryPayload> = {}): ControlRetryPayload {
  return {
    issue_identifier: 'CO-2',
    issue_id: 'issue-2',
    state: 'retrying',
    display_state: 'retrying',
    status_reason: null,
    session_id: null,
    workspace_path: null,
    attempt: 1,
    due_at: null,
    error: null,
    last_event: null,
    last_message: null,
    started_at: null,
    last_event_at: null,
    ...overrides
  };
}

describe('OperatorDashboardPresenter', () => {
  describe('buildUiDataset', () => {
    it('sets max_allowed in counts from the projection maxConcurrentAgents field', () => {
      const dataset = buildUiDataset({
        projection: buildMinimalProjection({ maxConcurrentAgents: 7 })
      });

      expect(dataset.counts.max_allowed).toBe(7);
    });

    it('sets max_allowed to null when maxConcurrentAgents is null', () => {
      const dataset = buildUiDataset({
        projection: buildMinimalProjection({ maxConcurrentAgents: null })
      });

      expect(dataset.counts.max_allowed).toBeNull();
    });

    it('sets max_allowed to null when maxConcurrentAgents is absent from the projection', () => {
      const projection = buildMinimalProjection();
      delete projection.maxConcurrentAgents;
      const dataset = buildUiDataset({ projection });

      expect(dataset.counts.max_allowed).toBeNull();
    });

    it('counts running and retrying entries accurately alongside max_allowed', () => {
      const dataset = buildUiDataset({
        projection: buildMinimalProjection({
          running: [buildRunningEntry()],
          retrying: [buildRetryEntry()],
          maxConcurrentAgents: 10
        })
      });

      expect(dataset.counts.running).toBe(1);
      expect(dataset.counts.retrying).toBe(1);
      expect(dataset.counts.max_allowed).toBe(10);
    });

    it('counts zero running when the running list is empty', () => {
      const dataset = buildUiDataset({
        projection: buildMinimalProjection({ maxConcurrentAgents: 5 })
      });

      expect(dataset.counts.running).toBe(0);
      expect(dataset.counts.retrying).toBe(0);
      expect(dataset.counts.max_allowed).toBe(5);
    });

    it('uses the generated_at override when supplied', () => {
      const fixedTime = '2026-03-30T00:00:00.000Z';
      const dataset = buildUiDataset({
        projection: buildMinimalProjection(),
        generatedAt: fixedTime
      });

      expect(dataset.generated_at).toBe(fixedTime);
    });

    it('sets the mode to operator_dashboard', () => {
      const dataset = buildUiDataset({ projection: buildMinimalProjection() });

      expect(dataset.mode).toBe('operator_dashboard');
    });

    it('sets read_only to true', () => {
      const dataset = buildUiDataset({ projection: buildMinimalProjection() });

      expect(dataset.read_only).toBe(true);
    });

    it('does not include provider_workflow in the dataset when the projection field is absent', () => {
      const dataset = buildUiDataset({
        projection: buildMinimalProjection({ providerWorkflow: undefined })
      });

      expect('provider_workflow' in dataset).toBe(false);
    });

    it('does not include dispatch_pilot in the dataset when the projection field is absent', () => {
      const dataset = buildUiDataset({
        projection: buildMinimalProjection({ dispatchPilot: null })
      });

      expect('dispatch_pilot' in dataset).toBe(false);
    });

    it('exposes the polling field from the projection', () => {
      const polling = {
        enabled: true,
        interval_ms: 15000,
        checking: false,
        queued: false,
        last_mode: 'poll' as const,
        last_requested_at: '2026-03-30T01:14:50.000Z',
        last_completed_at: '2026-03-30T01:14:51.000Z',
        last_success_at: '2026-03-30T01:14:51.000Z',
        last_error_at: null,
        last_error: null,
        next_poll_at: null,
        next_poll_in_ms: 15000,
        updated_at: null,
        operation_started_at: null,
        operation_elapsed_ms: null,
        stalled_after_ms: null,
        stuck: false,
        stuck_since_at: null,
        restart_required: false,
        reason: null,
        linear_budget: null
      };

      const dataset = buildUiDataset({
        projection: buildMinimalProjection({ polling })
      });

      expect(dataset.polling).toBe(polling);
    });
  });
});