import { describe, expect, it } from 'vitest';

import {
  buildProviderIssueDebugSnapshot,
  deriveProviderLinearWorkerProgressSnapshot
} from '../src/cli/control/providerIssueObservability.js';

describe('provider issue observability', () => {
  it('classifies merge closeout lanes from one authoritative snapshot', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-05T06:00:00.000Z'
      },
      rehydrated_at: '2026-04-05T05:50:00.000Z',
      claim: {
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        updated_at: '2026-04-05T05:50:00.000Z',
        run_id: 'run-82',
        merge_closeout: {
          recorded_at: '2026-04-05T06:02:00.000Z',
          status: 'watching',
          reason: 'checks_pending',
          summary: 'Waiting for required checks before merge.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
          ignored_historical_pr_urls: ['https://github.com/asabeko/CO/pull/80'],
          conflicting_attached_pr_urls: ['https://github.com/asabeko/CO/pull/83'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/82',
            owner: 'asabeko',
            repo: 'CO',
            number: 82
          },
          snapshot: {
            review_decision: 'APPROVED',
            merge_state_status: 'BLOCKED',
            ready_to_merge: false,
            gate_reasons: ['required_checks_pending'],
            action_required_reasons: [],
            unresolved_thread_count: 0,
            checks_pending: 2,
            checks_failed: 0,
            required_checks_pending: 2,
            required_checks_failed: 0,
            updated_at: '2026-04-05T06:02:00.000Z',
            merged_at: null
          }
        }
      },
      proof: {
        owner_phase: 'turn_completed',
        owner_status: 'in_progress',
        last_event: 'task_complete',
        last_message: 'Waiting for checks.',
        last_event_at: '2026-04-05T06:01:00.000Z',
        updated_at: '2026-04-05T06:02:05.000Z',
        linear_audit: {
          path: '/tmp/provider-linear-worker-linear-audit.jsonl',
          attempted_count: 2,
          success_count: 2,
          failure_count: 0,
          latest_recorded_at: '2026-04-05T06:01:30.000Z',
          parallelization_entries: [],
          latest_by_operation: {
            'attach-pr': {
              recorded_at: '2026-04-05T06:01:30.000Z',
              operation: 'attach-pr',
              ok: true,
              issue_id: 'lin-issue-82',
              issue_identifier: 'CO-82',
              source_setup: null,
              action: 'attached',
              via: null,
              state: 'Merging',
              follow_up_issue_id: null,
              follow_up_issue_identifier: null,
              failed_relation_type: null,
              comment_id: null,
              attachment_id: 'attachment-82',
              error_code: null,
              error_message: null
            }
          }
        }
      }
    });

    expect(snapshot).toMatchObject({
      claim: {
        freshness: 'rehydrated',
        is_rehydrated: true
      },
      pull_request: {
        ignored_historical_pr_urls: ['https://github.com/asabeko/CO/pull/80'],
        conflicting_attached_pr_urls: ['https://github.com/asabeko/CO/pull/83'],
        number: 82,
        merge_closeout_status: 'watching',
        required_checks_pending: 2
      },
      progress: {
        phase: 'waiting_on_checks',
        kind: 'merge_closeout',
        status: 'waiting',
        stall_classification: 'waiting_on_checks',
        recovery_recommendation: 'wait_for_checks'
      },
      last_audit_operation: {
        operation: 'attach-pr'
      },
      stall_classification: 'waiting_on_checks',
      recovery_recommendation: 'wait_for_checks'
    });
    expect(snapshot?.last_semantic_progress_at).toBe('2026-04-05T06:02:00.000Z');
  });

  it('classifies active worker lanes as stalled when semantic progress stops moving', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_started',
        last_message: 'Turn active.',
        last_event_at: '2026-04-05T05:40:00.000Z',
        updated_at: '2026-04-05T06:00:00.000Z',
        linear_audit: null
      },
      now: () => '2026-04-05T06:00:30.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'stalled',
      stall_classification: 'stalled',
      recovery_recommendation: 'inspect_worker_logs'
    });
    expect(progress?.stall_reason).toBe('no_semantic_progress_since:2026-04-05T05:40:00.000Z');
  });

  it('prefers the latest child-stream summary over generic turn-running filler', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-05T05:40:00.000Z',
        updated_at: '2026-04-05T05:45:00.000Z',
        child_streams: [
          {
            stream: 'co-109-docs-review',
            task_id: 'linear-co-109-docs-review',
            run_id: 'run-child-109',
            status: 'failed',
            launched_at: '2026-04-05T05:44:00.000Z',
            summary: 'docs-review failed at docs:freshness after spec-guard passed'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'docs-review failed at docs:freshness after spec-guard passed'
    });
    expect(progress?.last_semantic_progress_at).toBe('2026-04-05T05:44:00.000Z');
  });

  it('treats no-period generic worker filler as replaceable by richer child progress', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active',
        last_event_at: '2026-04-05T05:40:00.000Z',
        updated_at: '2026-04-05T05:45:00.000Z',
        child_streams: [
          {
            stream: 'co-109-docs-review',
            task_id: 'linear-co-109-docs-review',
            run_id: 'run-child-109',
            status: 'failed',
            launched_at: '2026-04-05T05:44:00.000Z',
            summary: 'docs-review failed at docs:freshness after spec-guard passed'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'docs-review failed at docs:freshness after spec-guard passed',
      summary_recorded_at: '2026-04-05T05:44:00.000Z'
    });
    expect(progress?.last_semantic_progress_at).toBe('2026-04-05T05:44:00.000Z');
  });

  it('records child-summary provenance when last_message is null and the richer child summary wins', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-05T05:40:00.000Z',
        last_event: 'turn_started',
        last_message: null,
        last_event_at: '2026-04-05T05:40:00.000Z',
        updated_at: '2026-04-05T05:45:00.000Z',
        child_streams: [
          {
            stream: 'co-112-docs-review',
            task_id: 'linear-co-112-docs-review',
            run_id: 'run-child-112',
            status: 'failed',
            launched_at: '2026-04-05T05:43:30.000Z',
            recorded_at: '2026-04-05T05:44:10.000Z',
            summary: 'docs-review failed at docs:freshness after spec-guard passed'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'docs-review failed at docs:freshness after spec-guard passed',
      summary_recorded_at: '2026-04-05T05:44:10.000Z',
      message_recorded_at: '2026-04-05T05:44:10.000Z',
      source_updated_at: '2026-04-05T05:44:10.000Z',
      event_source: 'child_stream_summary'
    });
    expect(progress?.event_candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'child_stream_summary',
          accepted: true,
          rejection_reason: null
        }),
        expect.objectContaining({
          source: 'generic_phase_fallback',
          accepted: false,
          rejection_reason: 'lower_signal_than_winner'
        })
      ])
    );
  });

  it('prefers fresher child-summary progress over older canonical activity with the same signal strength', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-05T05:40:00.000Z',
        current_turn_activity: {
          event: 'agent_message',
          message_or_payload: 'Investigating provider-worker EVENT provenance.',
          recorded_at: '2026-04-05T05:41:00.000Z',
          source: 'stdout_jsonl',
          turn_id: 'turn-2',
          session_id: 'thread-1-turn-2'
        },
        last_event: 'agent_message',
        last_message: 'Investigating provider-worker EVENT provenance.',
        last_event_at: '2026-04-05T05:41:00.000Z',
        child_streams: [
          {
            stream: 'co-112-docs-review',
            task_id: 'linear-co-112-docs-review',
            run_id: 'run-child-112',
            status: 'failed',
            launched_at: '2026-04-05T05:43:30.000Z',
            recorded_at: '2026-04-05T05:44:10.000Z',
            summary: 'docs-review failed at docs:freshness after spec-guard passed'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'docs-review failed at docs:freshness after spec-guard passed',
      summary_recorded_at: '2026-04-05T05:44:10.000Z',
      message_recorded_at: '2026-04-05T05:44:10.000Z',
      source_updated_at: '2026-04-05T05:44:10.000Z',
      event_source: 'child_stream_summary'
    });
    expect(progress?.event_candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'child_stream_summary',
          accepted: true,
          rejection_reason: null
        }),
        expect.objectContaining({
          source: 'canonical_stdout_jsonl',
          accepted: false,
          rejection_reason: 'older_than_winner'
        })
      ])
    );
  });

  it('does not let non-message legacy proof events overstate last-message freshness', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-05T05:40:00.000Z',
        current_turn_activity: {
          event: 'agent_message',
          message_or_payload: 'Investigating provider-worker EVENT provenance.',
          recorded_at: '2026-04-05T05:44:10.000Z',
          source: 'stdout_jsonl',
          turn_id: 'turn-2',
          session_id: 'thread-1-turn-2'
        },
        last_event: 'token_count',
        last_message: 'Investigating provider-worker EVENT provenance.',
        last_event_at: '2026-04-05T05:44:30.000Z',
        updated_at: '2026-04-05T05:44:30.000Z',
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'Investigating provider-worker EVENT provenance.',
      summary_recorded_at: '2026-04-05T05:44:10.000Z',
      message_recorded_at: '2026-04-05T05:44:10.000Z',
      source_updated_at: '2026-04-05T05:44:10.000Z',
      event_source: 'canonical_stdout_jsonl'
    });
    expect(progress?.event_candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'canonical_stdout_jsonl',
          accepted: true,
          rejection_reason: null
        }),
        expect.objectContaining({
          source: 'legacy_proof_last_message',
          summary: 'Investigating provider-worker EVENT provenance.',
          message_recorded_at: null,
          source_updated_at: '2026-04-05T05:44:30.000Z',
          accepted: false,
          rejection_reason: 'less_authoritative_than_winner'
        })
      ])
    );
  });

  it('keeps an authoritative legacy proof message ahead of older derived child summaries when message freshness is unknown', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'token_count',
        last_message: 'Investigating provider-worker EVENT provenance.',
        last_event_at: '2026-04-05T05:44:30.000Z',
        updated_at: '2026-04-05T05:44:30.000Z',
        child_streams: [
          {
            stream: 'co-112-docs-review',
            task_id: 'linear-co-112-docs-review',
            run_id: 'run-child-112',
            status: 'failed',
            launched_at: '2026-04-05T05:41:30.000Z',
            recorded_at: '2026-04-05T05:42:10.000Z',
            summary: 'docs-review failed at docs:freshness after spec-guard passed'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'Investigating provider-worker EVENT provenance.',
      summary_recorded_at: null,
      message_recorded_at: null,
      source_updated_at: '2026-04-05T05:44:30.000Z',
      event_source: 'legacy_proof_last_message'
    });
    expect(progress?.event_candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'legacy_proof_last_message',
          message_recorded_at: null,
          accepted: true,
          rejection_reason: null
        }),
        expect.objectContaining({
          source: 'child_stream_summary',
          message_recorded_at: '2026-04-05T05:42:10.000Z',
          accepted: false,
          rejection_reason: 'less_authoritative_than_winner'
        })
      ])
    );
  });

  it('uses a neutral legacy proof source label when only last_event survives', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'token_count',
        last_message: null,
        last_event_at: '2026-04-05T05:44:30.000Z',
        updated_at: '2026-04-05T05:44:30.000Z',
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'Provider worker turn is active.',
      message_recorded_at: null,
      source_updated_at: '2026-04-05T05:44:30.000Z',
      event_source: 'legacy_proof_fields'
    });
    expect(progress?.event_candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'legacy_proof_fields',
          event: 'token_count',
          summary: null,
          accepted: true,
          rejection_reason: null
        })
      ])
    );
  });

  it('prefers the latest child-lane summary over generic turn-running filler', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-05T05:40:00.000Z',
        updated_at: '2026-04-05T05:45:00.000Z',
        child_lanes: [
          {
            stream: 'event-truth',
            task_id: 'linear-co-109-event-truth',
            run_id: 'run-lane-109',
            status: 'completed',
            launched_at: '2026-04-05T05:43:30.000Z',
            decision: 'completed',
            decision_at: '2026-04-05T05:44:30.000Z',
            summary: 'event-truth lane accepted the authoritative child-summary patch'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'event-truth lane accepted the authoritative child-summary patch'
    });
    expect(progress?.last_semantic_progress_at).toBe('2026-04-05T05:44:30.000Z');
  });

  it('uses the chosen non-empty child summary timestamp when newer child records have blank summaries', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-05T05:40:00.000Z',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-05T05:40:00.000Z',
        updated_at: '2026-04-05T05:45:00.000Z',
        child_streams: [
          {
            stream: 'co-109-docs-review',
            task_id: 'linear-co-109-docs-review',
            run_id: 'run-child-109',
            status: 'failed',
            launched_at: '2026-04-05T05:44:00.000Z',
            recorded_at: '2026-04-05T05:44:10.000Z',
            summary: 'docs-review failed at docs:freshness after spec-guard passed'
          }
        ],
        child_lanes: [
          {
            stream: 'event-truth',
            task_id: 'linear-co-109-event-truth',
            run_id: 'run-lane-109',
            status: 'completed',
            launched_at: '2026-04-05T05:44:20.000Z',
            decision: 'completed',
            decision_at: '2026-04-05T05:44:30.000Z',
            summary: '   '
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'docs-review failed at docs:freshness after spec-guard passed',
      summary_recorded_at: '2026-04-05T05:44:10.000Z'
    });
    expect(progress?.last_semantic_progress_at).toBe('2026-04-05T05:44:30.000Z');
  });

  it('ignores previous-turn child-stream summaries when the current turn has not emitted richer child progress', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-05T06:10:00.000Z',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-05T06:10:00.000Z',
        updated_at: '2026-04-05T06:10:01.000Z',
        child_streams: [
          {
            stream: 'old-child',
            task_id: 'old-child',
            run_id: 'old-run',
            status: 'failed',
            launched_at: '2026-04-05T05:44:00.000Z',
            summary: 'old child failed at docs:freshness'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-05T06:10:05.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'Provider worker turn is active.'
    });
    expect(progress?.last_semantic_progress_at).toBe('2026-04-05T06:10:00.000Z');
  });

  it('suppresses stale previous-turn parallelization snapshots while the current turn has not recorded one yet', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      proof: {
        issue_id: 'lin-issue-101',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-08T07:00:00.000Z',
        updated_at: '2026-04-08T07:00:05.000Z',
        parallelization: {
          decision: 'stay_serial',
          reason: 'single_bounded_change',
          summary: 'Prior turn stayed serial.',
          recorded_at: '2026-04-08T06:59:30.000Z',
          child_lane_count: 0
        },
        linear_audit: {
          path: '/tmp/provider-linear-worker-linear-audit.jsonl',
          attempted_count: 1,
          success_count: 1,
          failure_count: 0,
          latest_recorded_at: '2026-04-08T06:59:30.000Z',
          parallelization_entries: [
            {
              recorded_at: '2026-04-08T06:59:30.000Z',
              operation: 'parallelization',
              ok: true,
              issue_id: 'lin-issue-101',
              issue_identifier: 'CO-101',
              source_setup: null,
              action: 'stay_serial',
              via: 'Prior turn stayed serial.',
              state: 'single_bounded_change',
              follow_up_issue_id: null,
              follow_up_issue_identifier: null,
              failed_relation_type: null,
              comment_id: null,
              attachment_id: null,
              error_code: null,
              error_message: null
            }
          ],
          latest_by_operation: {}
        }
      }
    });

    expect(snapshot?.parallelization).toBeNull();
  });

  it('falls back to the current-turn audit row when hydrated parallelization is stale', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      proof: {
        issue_id: 'lin-issue-101',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-08T07:00:00.000Z',
        updated_at: '2026-04-08T07:00:05.000Z',
        parallelization: {
          decision: 'stay_serial',
          reason: 'single_bounded_change',
          summary: 'Prior turn stayed serial.',
          recorded_at: '2026-04-08T06:59:30.000Z',
          child_lane_count: 0
        },
        child_lanes: [],
        linear_audit: {
          path: '/tmp/provider-linear-worker-linear-audit.jsonl',
          attempted_count: 2,
          success_count: 2,
          failure_count: 0,
          latest_recorded_at: '2026-04-08T07:00:02.000Z',
          parallelization_entries: [
            {
              recorded_at: '2026-04-08T06:59:30.000Z',
              operation: 'parallelization',
              ok: true,
              issue_id: 'lin-issue-101',
              issue_identifier: 'CO-101',
              source_setup: null,
              action: 'stay_serial',
              via: 'Prior turn stayed serial.',
              state: 'single_bounded_change',
              follow_up_issue_id: null,
              follow_up_issue_identifier: null,
              failed_relation_type: null,
              comment_id: null,
              attachment_id: null,
              error_code: null,
              error_message: null
            },
            {
              recorded_at: '2026-04-08T07:00:02.000Z',
              operation: 'parallelization',
              ok: true,
              issue_id: 'lin-issue-101',
              issue_identifier: 'CO-101',
              source_setup: null,
              action: 'parallelize_now',
              via: 'Launch a bounded child lane now.',
              state: 'independent_scope_available',
              follow_up_issue_id: null,
              follow_up_issue_identifier: null,
              failed_relation_type: null,
              comment_id: null,
              attachment_id: null,
              error_code: null,
              error_message: null
            }
          ],
          latest_by_operation: {}
        }
      }
    });

    expect(snapshot?.parallelization).toMatchObject({
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch a bounded child lane now.',
      recorded_at: '2026-04-08T07:00:02.000Z',
      child_lane_count: 0
    });
  });

  it('leaves child_lane_count unknown when audit fallback lacks current-turn child lane data', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      proof: {
        issue_id: 'lin-issue-101',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-08T07:00:00.000Z',
        updated_at: '2026-04-08T07:00:05.000Z',
        linear_audit: {
          path: '/tmp/provider-linear-worker-linear-audit.jsonl',
          attempted_count: 1,
          success_count: 1,
          failure_count: 0,
          latest_recorded_at: '2026-04-08T07:00:02.000Z',
          parallelization_entries: [
            {
              recorded_at: '2026-04-08T07:00:02.000Z',
              operation: 'parallelization',
              ok: true,
              issue_id: 'lin-issue-101',
              issue_identifier: 'CO-101',
              source_setup: null,
              action: 'parallelize_now',
              via: 'Launch a bounded child lane now.',
              state: 'independent_scope_available',
              follow_up_issue_id: null,
              follow_up_issue_identifier: null,
              failed_relation_type: null,
              comment_id: null,
              attachment_id: null,
              error_code: null,
              error_message: null
            }
          ],
          latest_by_operation: {}
        }
      }
    });

    expect(snapshot?.parallelization).toMatchObject({
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Launch a bounded child lane now.',
      recorded_at: '2026-04-08T07:00:02.000Z',
      child_lane_count: null
    });
  });

  it('prioritizes action-required merge blockers over pending checks', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-05T06:10:00.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_active_run',
        updated_at: '2026-04-05T06:09:00.000Z',
        run_id: 'run-82-review',
        merge_closeout: {
          recorded_at: '2026-04-05T06:11:00.000Z',
          status: 'watching',
          reason: 'checks_pending',
          summary: 'Required checks are still running, but review threads also need action.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/82',
            owner: 'asabeko',
            repo: 'CO',
            number: 82
          },
          snapshot: {
            review_decision: 'CHANGES_REQUESTED',
            merge_state_status: 'BLOCKED',
            ready_to_merge: false,
            gate_reasons: ['required_checks_pending'],
            action_required_reasons: ['changes_requested'],
            unresolved_thread_count: 2,
            checks_pending: 1,
            checks_failed: 0,
            required_checks_pending: 1,
            required_checks_failed: 0,
            updated_at: '2026-04-05T06:11:00.000Z',
            merged_at: null
          }
        }
      }
    });

    expect(snapshot).toMatchObject({
      progress: {
        phase: 'waiting_on_review',
        kind: 'merge_closeout',
        status: 'waiting',
        stall_classification: 'waiting_on_review',
        stall_reason: 'changes_requested',
        recovery_recommendation: 'address_review_feedback'
      },
      stall_classification: 'waiting_on_review',
      recovery_recommendation: 'address_review_feedback'
    });
  });

  it('classifies failed required checks as a stalled merge-closeout blocker', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-05T06:15:00.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_active_run',
        updated_at: '2026-04-05T06:14:00.000Z',
        run_id: 'run-82-checks-failed',
        merge_closeout: {
          recorded_at: '2026-04-05T06:16:00.000Z',
          status: 'action_required',
          reason: 'required_checks_failed=1',
          summary: 'Required checks failed during merge closeout.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/82',
            owner: 'asabeko',
            repo: 'CO',
            number: 82
          },
          snapshot: {
            review_decision: 'APPROVED',
            merge_state_status: 'BLOCKED',
            ready_to_merge: false,
            gate_reasons: ['required_checks_failed=1'],
            action_required_reasons: ['required_checks_failed=1'],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 1,
            required_checks_pending: 0,
            required_checks_failed: 1,
            updated_at: '2026-04-05T06:16:00.000Z',
            merged_at: null
          }
        }
      }
    });

    expect(snapshot).toMatchObject({
      progress: {
        phase: 'waiting_on_checks',
        kind: 'merge_closeout',
        status: 'stalled',
        stall_classification: 'stalled',
        stall_reason: 'required_checks_failed=1',
        recovery_recommendation: 'inspect_merge_closeout'
      },
      stall_classification: 'stalled',
      recovery_recommendation: 'inspect_merge_closeout'
    });
  });

  it('classifies non-check action-required merge blockers ahead of pending checks', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-05T06:17:00.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_active_run',
        updated_at: '2026-04-05T06:16:00.000Z',
        run_id: 'run-82-behind',
        merge_closeout: {
          recorded_at: '2026-04-05T06:18:00.000Z',
          status: 'watching',
          reason: 'required_checks_pending',
          summary: 'Checks are still running, but the branch is behind main.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/82',
            owner: 'asabeko',
            repo: 'CO',
            number: 82
          },
          snapshot: {
            review_decision: 'APPROVED',
            merge_state_status: 'BLOCKED',
            ready_to_merge: false,
            gate_reasons: ['required_checks_pending'],
            action_required_reasons: ['merge_state=BEHIND'],
            unresolved_thread_count: 0,
            checks_pending: 1,
            checks_failed: 0,
            required_checks_pending: 1,
            required_checks_failed: 0,
            updated_at: '2026-04-05T06:18:00.000Z',
            merged_at: null
          }
        }
      }
    });

    expect(snapshot).toMatchObject({
      progress: {
        phase: 'watching_merge',
        kind: 'merge_closeout',
        status: 'stalled',
        stall_classification: 'stalled',
        stall_reason: 'merge_state=BEHIND',
        recovery_recommendation: 'inspect_merge_closeout'
      },
      stall_classification: 'stalled',
      recovery_recommendation: 'inspect_merge_closeout'
    });
  });

  it('does not let merge closeout state mask a failed worker proof', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-05T06:20:00.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_active_run',
        updated_at: '2026-04-05T06:19:00.000Z',
        run_id: 'run-82-failed',
        merge_closeout: {
          recorded_at: '2026-04-05T06:21:00.000Z',
          status: 'watching',
          reason: 'checks_pending',
          summary: 'Watching merge closeout.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/82',
            owner: 'asabeko',
            repo: 'CO',
            number: 82
          },
          snapshot: {
            review_decision: 'APPROVED',
            merge_state_status: 'BLOCKED',
            ready_to_merge: false,
            gate_reasons: ['required_checks_pending'],
            action_required_reasons: [],
            unresolved_thread_count: 0,
            checks_pending: 1,
            checks_failed: 0,
            required_checks_pending: 1,
            required_checks_failed: 0,
            updated_at: '2026-04-05T06:21:00.000Z',
            merged_at: null
          }
        }
      },
      proof: {
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'codex_exit_1',
        last_event: 'turn_failed',
        last_message: 'Provider worker failed while merge closeout was active.',
        last_event_at: '2026-04-05T06:20:30.000Z',
        updated_at: '2026-04-05T06:20:45.000Z',
        linear_audit: null
      }
    });

    expect(snapshot).toMatchObject({
      progress: {
        phase: 'failed',
        kind: 'worker',
        status: 'failed',
        stall_classification: 'failed',
        recovery_recommendation: 'inspect_worker_logs'
      },
      stall_classification: 'failed',
      recovery_recommendation: 'inspect_worker_logs'
    });
  });

  it('does not let stale merge closeout state mask live worker progress', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      tracked_issue: {
        state: 'In Progress',
        state_type: 'started'
      },
      claim: {
        state: 'stale',
        reason: 'provider_issue_stale',
        updated_at: '2026-04-05T06:19:00.000Z',
        run_id: 'run-82-live',
        merge_closeout: {
          recorded_at: '2026-04-05T06:21:00.000Z',
          status: 'watching',
          reason: 'checks_pending',
          summary: 'Waiting for required checks before merge.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/82',
            owner: 'asabeko',
            repo: 'CO',
            number: 82
          },
          snapshot: {
            review_decision: 'APPROVED',
            merge_state_status: 'BLOCKED',
            ready_to_merge: false,
            gate_reasons: ['required_checks_pending'],
            action_required_reasons: [],
            unresolved_thread_count: 0,
            checks_pending: 1,
            checks_failed: 0,
            required_checks_pending: 1,
            required_checks_failed: 0,
            updated_at: '2026-04-05T06:21:00.000Z',
            merged_at: null
          }
        }
      },
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_started',
        last_message: 'Turn is still running.',
        last_event_at: '2026-04-05T06:20:30.000Z',
        updated_at: '2026-04-05T06:20:45.000Z',
        linear_audit: null
      },
      now: () => '2026-04-05T06:21:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      kind: 'worker',
      status: 'progressing',
      stall_classification: 'progressing',
      recovery_recommendation: 'continue_waiting'
    });
  });

  it('preserves merge closeout progress after a successful worker exit', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-05T06:40:00.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        updated_at: '2026-04-05T06:39:00.000Z',
        run_id: 'run-82-merge-closeout',
        merge_closeout: {
          recorded_at: '2026-04-05T06:41:00.000Z',
          status: 'watching',
          reason: 'checks_pending',
          summary: 'Waiting for required checks before merge.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/82',
            owner: 'asabeko',
            repo: 'CO',
            number: 82
          },
          snapshot: {
            review_decision: 'APPROVED',
            merge_state_status: 'BLOCKED',
            ready_to_merge: false,
            gate_reasons: ['required_checks_pending'],
            action_required_reasons: [],
            unresolved_thread_count: 0,
            checks_pending: 2,
            checks_failed: 0,
            required_checks_pending: 2,
            required_checks_failed: 0,
            updated_at: '2026-04-05T06:41:00.000Z',
            merged_at: null
          }
        }
      },
      proof: {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        last_event: 'task_complete',
        last_message: 'Worker exited after handing merge closeout to the watcher.',
        last_event_at: '2026-04-05T06:40:30.000Z',
        updated_at: '2026-04-05T06:40:45.000Z',
        linear_audit: null
      }
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        number: 82,
        required_checks_pending: 2
      },
      progress: {
        phase: 'waiting_on_checks',
        kind: 'merge_closeout',
        status: 'waiting',
        stall_classification: 'waiting_on_checks',
        recovery_recommendation: 'wait_for_checks'
      },
      stall_classification: 'waiting_on_checks',
      recovery_recommendation: 'wait_for_checks'
    });
  });

  it('surfaces skipped shared-root reconciliation as pending after merge closeout', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-05T06:50:00.000Z'
      },
      claim: {
        state: 'handoff_failed',
        reason: 'provider_issue_merge_closeout_action_required',
        updated_at: '2026-04-05T06:49:00.000Z',
        run_id: 'run-82-shared-root-pending',
        merge_closeout: {
          recorded_at: '2026-04-05T06:50:30.000Z',
          status: 'action_required',
          reason: 'pending_shared_root_reconciliation',
          summary: 'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/82',
            owner: 'asabeko',
            repo: 'CO',
            number: 82
          },
          snapshot: {
            review_decision: 'APPROVED',
            merge_state_status: 'UNKNOWN',
            ready_to_merge: false,
            gate_reasons: ['state=MERGED'],
            action_required_reasons: [],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-05T06:50:30.000Z',
            merged_at: '2026-04-05T06:50:00.000Z'
          },
          shared_root: {
            status: 'skipped',
            reason: 'shared_root_dirty',
            before_status: '## main...origin/main\\n M tasks/index.json',
            after_status: '## main...origin/main\\n M tasks/index.json'
          }
        }
      },
      proof: {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        last_event: 'task_complete',
        last_message: 'Worker exited after merge closeout.',
        last_event_at: '2026-04-05T06:50:10.000Z',
        updated_at: '2026-04-05T06:50:15.000Z',
        linear_audit: null
      }
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        number: 82,
        shared_root_status: 'skipped',
        shared_root_reason: 'shared_root_dirty'
      },
      progress: {
        phase: 'pending_shared_root_reconciliation',
        kind: 'merge_closeout',
        status: 'stalled',
        stall_classification: 'stalled',
        stall_reason: 'shared_root_dirty',
        recovery_recommendation: 'inspect_merge_closeout'
      },
      stall_classification: 'stalled',
      recovery_recommendation: 'inspect_merge_closeout'
    });
  });

  it('surfaces failed shared-root reconciliation as failed after merge closeout', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Done',
        state_type: 'completed',
        updated_at: '2026-04-05T06:50:00.000Z'
      },
      claim: {
        state: 'completed',
        reason: 'provider_issue_merge_closeout_merged',
        updated_at: '2026-04-05T06:49:00.000Z',
        run_id: 'run-82-shared-root-failed',
        merge_closeout: {
          recorded_at: '2026-04-05T06:50:30.000Z',
          status: 'merged',
          reason: 'shared_root_reconciliation_failed',
          summary: 'Merged attached PR #82; shared-root reconciliation failed (shared_root_fast_forward_failed) after the Linear issue transitioned to Done.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/82',
            owner: 'asabeko',
            repo: 'CO',
            number: 82
          },
          snapshot: {
            review_decision: 'APPROVED',
            merge_state_status: 'UNKNOWN',
            ready_to_merge: false,
            gate_reasons: ['state=MERGED'],
            action_required_reasons: [],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-05T06:50:30.000Z',
            merged_at: '2026-04-05T06:50:00.000Z'
          },
          shared_root: {
            status: 'failed',
            reason: 'shared_root_fast_forward_failed',
            before_status: '## main...origin/main [behind 1]',
            after_status: null
          }
        }
      },
      proof: {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        last_event: 'task_complete',
        last_message: 'Worker exited after merge closeout.',
        last_event_at: '2026-04-05T06:50:10.000Z',
        updated_at: '2026-04-05T06:50:15.000Z',
        linear_audit: null
      }
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        number: 82,
        shared_root_status: 'failed',
        shared_root_reason: 'shared_root_fast_forward_failed'
      },
      progress: {
        phase: 'failed',
        kind: 'merge_closeout',
        status: 'failed',
        stall_classification: 'failed',
        stall_reason: 'shared_root_fast_forward_failed',
        recovery_recommendation: 'inspect_merge_closeout'
      },
      stall_classification: 'failed',
      recovery_recommendation: 'inspect_merge_closeout'
    });
  });

  it('classifies max-turn exhaustion as stalled instead of completed', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      tracked_issue: {
        state: 'In Progress',
        state_type: 'started'
      },
      proof: {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active',
        last_message: 'Turn budget exhausted.',
        last_event_at: '2026-04-05T06:30:00.000Z',
        updated_at: '2026-04-05T06:30:01.000Z',
        linear_audit: null
      }
    });

    expect(progress).toMatchObject({
      phase: 'inactive',
      kind: 'worker',
      status: 'stalled',
      stall_classification: 'stalled',
      stall_reason: 'max_turns_reached_issue_still_active',
      recovery_recommendation: 'inspect_worker_logs'
    });
  });
});
