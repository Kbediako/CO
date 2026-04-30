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
          ignored_closed_unmerged_pr_urls: ['https://github.com/asabeko/CO/pull/81'],
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
        ignored_closed_unmerged_pr_urls: ['https://github.com/asabeko/CO/pull/81'],
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

  it('surfaces review-handoff promotion blocker truth before an issue reaches Merging', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'In Review',
        state_type: 'started',
        updated_at: '2026-04-09T03:15:00.000Z'
      },
      claim: {
        state: 'handoff_failed',
        reason: 'provider_issue_review_promotion_action_required',
        updated_at: '2026-04-09T03:15:00.000Z',
        run_id: 'run-116',
        review_promotion: {
          recorded_at: '2026-04-09T03:15:00.000Z',
          status: 'action_required',
          reason: 'review=REVIEW_REQUIRED',
          summary: 'Review-handoff promotion is blocked by: review=REVIEW_REQUIRED.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
          ignored_historical_pr_urls: [],
          conflicting_attached_pr_urls: [],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/416',
            owner: 'asabeko',
            repo: 'CO',
            number: 416
          },
          snapshot: {
            review_decision: 'REVIEW_REQUIRED',
            merge_state_status: 'CLEAN',
            ready_to_merge: false,
            gate_reasons: ['review=REVIEW_REQUIRED'],
            action_required_reasons: ['review=REVIEW_REQUIRED'],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-09T03:14:30.000Z',
            merged_at: null
          },
          linear_transition: null
        }
      },
      proof: {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        last_event: 'task_complete',
        last_message: 'Provider worker completed successfully.',
        last_event_at: '2026-04-09T03:14:00.000Z',
        updated_at: '2026-04-09T03:15:00.000Z',
        linear_audit: null
      }
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        review_promotion_status: 'action_required',
        merge_closeout_status: null,
        number: 416,
        review_decision: 'REVIEW_REQUIRED',
        action_required_reasons: ['review=REVIEW_REQUIRED']
      },
      progress: {
        phase: 'waiting_on_review',
        kind: 'workflow',
        status: 'waiting',
        stall_classification: 'waiting_on_review',
        recovery_recommendation: 'address_review_feedback'
      },
      stall_classification: 'waiting_on_review',
      recovery_recommendation: 'address_review_feedback'
    });
    expect(snapshot?.progress?.summary).toBe(
      'Review-handoff promotion is blocked by: review=REVIEW_REQUIRED.'
    );
  });

  it('prefers merge closeout pull-request truth once the issue leaves review handoff', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-09T03:31:00.000Z'
      },
      claim: {
        state: 'completed',
        reason: 'provider_issue_merge_closeout_watching',
        updated_at: '2026-04-09T03:31:00.000Z',
        run_id: 'run-116',
        review_promotion: {
          recorded_at: '2026-04-09T03:15:00.000Z',
          status: 'action_required',
          reason: 'review=REVIEW_REQUIRED',
          summary: 'Review-handoff promotion is blocked by: review=REVIEW_REQUIRED.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
          ignored_historical_pr_urls: [],
          conflicting_attached_pr_urls: [],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/416',
            owner: 'asabeko',
            repo: 'CO',
            number: 416
          },
          snapshot: {
            state: 'OPEN',
            review_decision: 'REVIEW_REQUIRED',
            merge_state_status: 'CLEAN',
            ready_to_merge: false,
            gate_reasons: ['review=REVIEW_REQUIRED'],
            action_required_reasons: ['review=REVIEW_REQUIRED'],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-09T03:14:30.000Z',
            merged_at: null
          },
          linear_transition: null
        },
        merge_closeout: {
          recorded_at: '2026-04-09T03:31:00.000Z',
          status: 'watching',
          reason: 'required_checks_pending',
          summary: 'Waiting for required checks before merge.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
          ignored_historical_pr_urls: [],
          conflicting_attached_pr_urls: [],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/416',
            owner: 'asabeko',
            repo: 'CO',
            number: 416
          },
          snapshot: {
            state: 'OPEN',
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
            updated_at: '2026-04-09T03:31:00.000Z',
            merged_at: null
          },
          merge_attempt: null,
          shared_root: null,
          linear_transition: null
        }
      },
      proof: {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        last_event: 'task_complete',
        last_message: 'Worker exited after handing merge closeout to the watcher.',
        last_event_at: '2026-04-09T03:30:45.000Z',
        updated_at: '2026-04-09T03:31:00.000Z',
        linear_audit: null
      }
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        review_promotion_status: 'action_required',
        merge_closeout_status: 'watching',
        number: 416,
        reason: 'required_checks_pending',
        review_decision: 'APPROVED',
        required_checks_pending: 1,
        gate_reasons: ['required_checks_pending'],
        action_required_reasons: []
      },
      progress: {
        phase: 'waiting_on_checks',
        kind: 'merge_closeout',
        status: 'waiting',
        stall_classification: 'waiting_on_checks',
        recovery_recommendation: 'wait_for_checks'
      }
    });
    expect(snapshot?.pull_request?.summary).toBe('Waiting for required checks before merge.');
  });

  it('falls back to claim handoff state when live tracked issue data is unavailable', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      claim: {
        state: 'handoff_failed',
        reason: 'provider_issue_review_promotion_action_required',
        updated_at: '2026-04-09T03:15:00.000Z',
        run_id: 'run-116',
        issue_state: 'In Review',
        issue_state_type: 'started',
        review_promotion: {
          recorded_at: '2026-04-09T03:15:00.000Z',
          status: 'action_required',
          reason: 'review=REVIEW_REQUIRED',
          summary: 'Review-handoff promotion is blocked by: review=REVIEW_REQUIRED.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
          ignored_historical_pr_urls: [],
          conflicting_attached_pr_urls: [],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/416',
            owner: 'asabeko',
            repo: 'CO',
            number: 416
          },
          snapshot: {
            state: 'OPEN',
            review_decision: 'REVIEW_REQUIRED',
            merge_state_status: 'CLEAN',
            ready_to_merge: false,
            gate_reasons: ['review=REVIEW_REQUIRED'],
            action_required_reasons: ['review=REVIEW_REQUIRED'],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-09T03:14:30.000Z',
            merged_at: null
          },
          linear_transition: null
        },
        merge_closeout: {
          recorded_at: '2026-04-09T03:31:00.000Z',
          status: 'watching',
          reason: 'required_checks_pending',
          summary: 'Waiting for required checks before merge.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
          ignored_historical_pr_urls: [],
          conflicting_attached_pr_urls: [],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/416',
            owner: 'asabeko',
            repo: 'CO',
            number: 416
          },
          snapshot: {
            state: 'OPEN',
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
            updated_at: '2026-04-09T03:31:00.000Z',
            merged_at: null
          },
          merge_attempt: null,
          shared_root: null,
          linear_transition: null
        }
      },
      proof: {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        last_event: 'task_complete',
        last_message: 'Provider worker completed successfully.',
        last_event_at: '2026-04-09T03:14:00.000Z',
        updated_at: '2026-04-09T03:15:00.000Z',
        linear_audit: null
      }
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        review_promotion_status: 'action_required',
        merge_closeout_status: 'watching',
        number: 416,
        reason: 'review=REVIEW_REQUIRED',
        review_decision: 'REVIEW_REQUIRED',
        action_required_reasons: ['review=REVIEW_REQUIRED']
      },
      progress: {
        phase: 'waiting_on_review',
        kind: 'workflow',
        status: 'waiting',
        stall_classification: 'waiting_on_review',
        recovery_recommendation: 'address_review_feedback'
      }
    });
    expect(snapshot?.pull_request?.summary).toBe(
      'Review-handoff promotion is blocked by: review=REVIEW_REQUIRED.'
    );
  });

  it('keeps merge closeout pending visible after review promotion reaches Merging', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      claim: {
        state: 'completed',
        reason: 'provider_issue_review_promotion_promoted',
        updated_at: '2026-04-09T03:32:00.000Z',
        run_id: 'run-116',
        issue_state: 'Merging',
        issue_state_type: 'started',
        review_promotion: {
          recorded_at: '2026-04-09T03:32:00.000Z',
          status: 'promoted',
          reason: 'promoted_to_merging',
          summary: 'Promoted the issue from In Review to Merging after confirming the attached PR is merge-ready.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
          ignored_historical_pr_urls: [],
          conflicting_attached_pr_urls: [],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/416',
            owner: 'asabeko',
            repo: 'CO',
            number: 416
          },
          snapshot: {
            state: 'OPEN',
            review_decision: 'APPROVED',
            merge_state_status: 'CLEAN',
            ready_to_merge: true,
            gate_reasons: [],
            action_required_reasons: [],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-09T03:31:45.000Z',
            merged_at: null
          },
          linear_transition: {
            status: 'transitioned',
            attempted_at: '2026-04-09T03:32:00.000Z',
            previous_state: 'In Review',
            target_state: 'Merging',
            issue_state: 'Merging',
            issue_state_type: 'started',
            issue_updated_at: '2026-04-09T03:32:00.000Z',
            error: null
          }
        }
      },
      proof: {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        last_event: 'task_complete',
        last_message: 'Provider worker completed successfully.',
        last_event_at: '2026-04-09T03:31:30.000Z',
        updated_at: '2026-04-09T03:32:00.000Z',
        linear_audit: null
      }
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        review_promotion_status: 'promoted',
        merge_closeout_status: null,
        number: 416,
        review_decision: 'APPROVED',
        ready_to_merge: true
      },
      progress: {
        phase: 'watching_merge',
        kind: 'workflow',
        status: 'progressing',
        stall_classification: 'progressing',
        recovery_recommendation: 'continue_waiting'
      },
      stall_classification: 'progressing',
      recovery_recommendation: 'continue_waiting'
    });
    expect(snapshot?.progress?.summary).toBe(
      'Promoted the issue from In Review to Merging after confirming the attached PR is merge-ready. Waiting for merge closeout to start.'
    );
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

  it('keeps message freshness null when canonical current-turn activity has no message payload', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-05T05:40:00.000Z',
        current_turn_activity: {
          event: 'token_count',
          message_or_payload: null,
          recorded_at: '2026-04-05T05:44:10.000Z',
          source: 'stdout_jsonl',
          turn_id: 'turn-2',
          session_id: 'thread-1-turn-2'
        },
        last_event: 'token_count',
        last_message: null,
        last_event_at: '2026-04-05T05:44:10.000Z',
        updated_at: '2026-04-05T05:44:10.000Z',
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'Provider worker turn is active.',
      summary_recorded_at: null,
      message_recorded_at: null,
      source_updated_at: '2026-04-05T05:44:10.000Z',
      event_source: 'canonical_stdout_jsonl'
    });
    expect(progress?.event_candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'canonical_stdout_jsonl',
          event: 'token_count',
          summary: null,
          message_recorded_at: null,
          source_updated_at: '2026-04-05T05:44:10.000Z',
          accepted: true,
          rejection_reason: null
        }),
        expect.objectContaining({
          source: 'generic_phase_fallback',
          summary: 'Provider worker turn is active.',
          message_recorded_at: null,
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

  it('labels an older derived child summary as older_than_winner when a fresher canonical message wins', () => {
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
        last_event: 'agent_message',
        last_message: 'Investigating provider-worker EVENT provenance.',
        last_event_at: '2026-04-05T05:44:10.000Z',
        child_streams: [
          {
            stream: 'co-112-docs-review',
            task_id: 'linear-co-112-docs-review',
            run_id: 'run-child-112',
            status: 'failed',
            launched_at: '2026-04-05T05:41:30.000Z',
            recorded_at: '2026-04-05T05:43:10.000Z',
            summary: 'docs-review failed at docs:freshness after spec-guard passed'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-05T05:45:00.000Z'
    });

    expect(progress).toMatchObject({
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
          source: 'child_stream_summary',
          message_recorded_at: '2026-04-05T05:43:10.000Z',
          accepted: false,
          rejection_reason: 'older_than_winner'
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

  it('does not project stale guardrail text from non-guardrail child lanes', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-18T02:00:00.000Z',
        updated_at: '2026-04-18T02:01:00.000Z',
        child_lanes: [
          {
            stream: 'truth-surface-regression',
            pipeline_id: 'provider-linear-child-lane',
            task_id: 'linear-co-225-truth-surface-regression',
            run_id: 'run-lane-225',
            status: 'failed',
            launched_at: '2026-04-18T02:00:10.000Z',
            decision: 'pending',
            summary_recorded_at: '2026-04-18T02:00:40.000Z',
            guardrails_required: false,
            guardrails_required_source: 'stage_detection',
            guardrail_command_count: 0,
            summary:
              "Child lane truth-surface-regression failed.\n" +
              'Guardrails: spec-guard command not found.\n' +
              'Guardrails: spec-guard failed (1/1 failed).\n' +
              'Guardrail command missing; run "codex-orchestrator start diagnostics --approval-policy never --format json --no-interactive" to capture reviewer diagnostics.\n' +
              'Guardrail command failed; re-run "codex-orchestrator start diagnostics --approval-policy never --format json --no-interactive" to gather failure artifacts.'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-18T02:01:00.000Z'
    });

    expect(progress?.summary).toBe('Child lane truth-surface-regression failed.');
    expect(progress?.summary).not.toContain('Guardrails: spec-guard command not found.');
    expect(progress?.summary).not.toContain('Guardrails: spec-guard failed');
    expect(progress?.summary).not.toContain('Guardrail command missing;');
    expect(progress?.summary).not.toContain('Guardrail command failed;');
  });

  it('preserves child-lane guardrail stdout when guardrail metadata is unknown', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-18T02:00:00.000Z',
        updated_at: '2026-04-18T02:01:00.000Z',
        child_lanes: [
          {
            stream: 'manifest-parse-fallback',
            pipeline_id: 'provider-linear-child-lane',
            task_id: 'linear-co-225-manifest-parse-fallback',
            run_id: 'run-lane-manifest-parse-fallback-225',
            status: 'failed',
            launched_at: '2026-04-18T02:00:10.000Z',
            decision: 'pending',
            summary_recorded_at: '2026-04-18T02:00:40.000Z',
            summary:
              'Child lane manifest-parse-fallback failed.\n' +
              'Guardrails: spec-guard failed (1/1 failed).'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-18T02:01:00.000Z'
    });

    expect(progress?.summary).toBe(
      'Child lane manifest-parse-fallback failed.\nGuardrails: spec-guard failed (1/1 failed).'
    );
  });

  it('preserves child-lane guardrail text when manifest metadata proves a real guardrail command existed', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-18T02:00:00.000Z',
        updated_at: '2026-04-18T02:01:00.000Z',
        child_lanes: [
          {
            stream: 'optional-guardrail-regression',
            pipeline_id: 'provider-linear-child-lane',
            task_id: 'linear-co-225-optional-guardrail',
            run_id: 'run-lane-guardrail-225',
            status: 'failed',
            launched_at: '2026-04-18T02:00:10.000Z',
            decision: 'pending',
            summary_recorded_at: '2026-04-18T02:00:40.000Z',
            guardrails_required: false,
            guardrail_command_count: 1,
            summary: 'Child lane optional-guardrail-regression failed.\nGuardrails: spec-guard failed (1/1 failed).'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-18T02:01:00.000Z'
    });

    expect(progress?.summary).toBe(
      'Child lane optional-guardrail-regression failed.\nGuardrails: spec-guard failed (1/1 failed).'
    );
  });

  it('preserves child-lane required-missing guardrail text when manifest metadata proves explicit opt-in', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-18T02:00:00.000Z',
        updated_at: '2026-04-18T02:01:00.000Z',
        child_lanes: [
          {
            stream: 'explicit-required-guardrail',
            pipeline_id: 'provider-linear-child-lane',
            task_id: 'linear-co-225-explicit-required',
            run_id: 'run-lane-explicit-required-225',
            status: 'failed',
            launched_at: '2026-04-18T02:00:10.000Z',
            decision: 'pending',
            summary_recorded_at: '2026-04-18T02:00:40.000Z',
            guardrails_required: true,
            guardrails_required_source: 'explicit',
            guardrail_command_count: 0,
            summary:
              'Child lane explicit-required-guardrail failed.\n' +
              'Guardrails: spec-guard command not found.'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-18T02:01:00.000Z'
    });

    expect(progress?.summary).toBe(
      'Child lane explicit-required-guardrail failed.\nGuardrails: spec-guard command not found.'
    );
  });

  it('does not rank invalidated rejected or accepted child-lane summaries over current replacement progress', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-16T07:46:00.000Z',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-16T07:46:00.000Z',
        updated_at: '2026-04-16T07:50:00.000Z',
        child_lanes: [
          {
            stream: 'failed-regression-tests',
            task_id: 'linear-co-204-regression-tests-failed',
            run_id: 'run-lane-failed',
            status: 'failed',
            launched_at: '2026-04-16T07:46:30.000Z',
            decision: 'invalidated',
            decision_at: '2026-04-16T07:49:50.000Z',
            decision_reason: 'parent_relaunched_after_failed_lane',
            summary: 'failed child lane still reports stale failing regression output'
          },
          {
            stream: 'rejected-regression-tests',
            task_id: 'linear-co-204-regression-tests-rejected',
            run_id: 'run-lane-rejected',
            status: 'completed',
            launched_at: '2026-04-16T07:46:40.000Z',
            decision: 'rejected',
            decision_at: '2026-04-16T07:49:40.000Z',
            decision_reason: 'parent_rejected_stale_patch',
            summary: 'rejected child lane should not project as current progress'
          },
          {
            stream: 'accepted-regression-tests',
            task_id: 'linear-co-204-regression-tests-accepted',
            run_id: 'run-lane-accepted',
            status: 'completed',
            launched_at: '2026-04-16T07:46:50.000Z',
            decision: 'accepted',
            decision_at: '2026-04-16T07:49:30.000Z',
            decision_reason: 'parent_already_imported_patch',
            summary: 'accepted child lane should not remain selected as current progress'
          }
        ],
        child_streams: [
          {
            stream: 'replacement-regression-tests',
            task_id: 'linear-co-204-regression-tests-replacement',
            run_id: 'run-child-replacement',
            status: 'completed',
            launched_at: '2026-04-16T07:48:30.000Z',
            recorded_at: '2026-04-16T07:49:00.000Z',
            summary: 'replacement regression lane reported current focused-test progress'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-16T07:50:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      status: 'progressing',
      summary: 'replacement regression lane reported current focused-test progress',
      summary_recorded_at: '2026-04-16T07:49:00.000Z',
      event_source: 'child_stream_summary'
    });
    expect(progress?.event_candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'child_stream_summary',
          summary: 'replacement regression lane reported current focused-test progress',
          accepted: true,
          rejection_reason: null
        })
      ])
    );
  });

  it('keeps active pending child-lane summaries as current child-lane progress', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-16T07:46:00.000Z',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-16T07:46:00.000Z',
        updated_at: '2026-04-16T07:50:00.000Z',
        child_lanes: [
          {
            stream: 'failed-regression-tests',
            task_id: 'linear-co-204-regression-tests-failed',
            run_id: 'run-lane-failed',
            status: 'failed',
            launched_at: '2026-04-16T07:46:30.000Z',
            decision: 'invalidated',
            decision_at: '2026-04-16T07:49:50.000Z',
            decision_reason: 'parent_relaunched_after_failed_lane',
            summary: 'failed child lane still reports stale failing regression output'
          },
          {
            stream: 'replacement-regression-tests',
            task_id: 'linear-co-204-regression-tests-replacement',
            run_id: 'run-lane-replacement',
            status: 'running',
            launched_at: '2026-04-16T07:48:30.000Z',
            decision: 'pending',
            in_flight_action: 'reserved_child_lane_running',
            summary: 'replacement child lane is running focused regression tests'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-16T07:50:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'child_lane',
      kind: 'child_lane',
      status: 'waiting',
      summary: 'replacement child lane is running focused regression tests',
      stall_classification: 'waiting_on_child_lane',
      stall_reason: 'child_lane:replacement-regression-tests',
      recovery_recommendation: 'inspect_child_lane'
    });
    expect(progress?.last_semantic_progress_at).toBe('2026-04-16T07:48:30.000Z');
  });

  it('prefers the active child lane with the freshest summary timestamp over later launch order', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-16T07:46:00.000Z',
        last_event: 'turn_started',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-16T07:46:00.000Z',
        updated_at: '2026-04-16T07:55:00.000Z',
        child_lanes: [
          {
            stream: 'docs-packet',
            task_id: 'linear-co-210-docs-packet',
            run_id: 'run-lane-docs',
            status: 'running',
            launched_at: '2026-04-16T07:47:00.000Z',
            summary_recorded_at: '2026-04-16T07:54:00.000Z',
            decision: 'pending',
            summary: 'docs-packet child lane is running focused docs validation'
          },
          {
            stream: 'tests-packet',
            task_id: 'linear-co-210-tests-packet',
            run_id: 'run-lane-tests',
            status: 'launching',
            launched_at: '2026-04-16T07:53:00.000Z',
            decision: 'pending',
            summary: 'Child lane reserved before child run startup.'
          }
        ],
        linear_audit: null
      },
      now: () => '2026-04-16T07:55:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'child_lane',
      kind: 'child_lane',
      status: 'waiting',
      summary: 'docs-packet child lane is running focused docs validation',
      summary_recorded_at: '2026-04-16T07:54:00.000Z',
      last_semantic_progress_at: '2026-04-16T07:54:00.000Z',
      stall_classification: 'waiting_on_child_lane',
      stall_reason: 'child_lane:docs-packet'
    });
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

  it('preserves hydrated recovered child-lane counts in the status projection', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      proof: {
        issue_id: 'lin-issue-101',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-08T07:00:00.000Z',
        updated_at: '2026-04-08T07:00:05.000Z',
        parallelization: {
          decision: 'parallelize_now',
          reason: 'independent_scope_available',
          summary: 'Recover prior-attempt child lane.',
          recorded_at: '2026-04-08T07:00:02.000Z',
          child_lane_count: 1
        },
        child_lanes: [
          {
            stream: 'impl-a',
            task_id: 'linear-lin-issue-101-impl-a',
            run_id: 'child-run-1',
            status: 'succeeded',
            launched_at: '2026-04-08T06:59:58.000Z',
            summary: 'prior-attempt child lane completed'
          }
        ],
        linear_audit: null
      }
    });

    expect(snapshot?.parallelization).toMatchObject({
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      summary: 'Recover prior-attempt child lane.',
      recorded_at: '2026-04-08T07:00:02.000Z',
      child_lane_count: 1
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

  it('projects automatic branch refresh attempts while merge closeout keeps watching', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-10T05:15:00.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_merge_closeout_watching',
        updated_at: '2026-04-10T05:15:00.000Z',
        run_id: 'run-140-behind',
        merge_closeout: {
          recorded_at: '2026-04-10T05:15:05.000Z',
          status: 'watching',
          reason: 'branch_refresh_requested',
          summary:
            'Requested automatic branch refresh for attached PR #440; waiting for GitHub to recompute merge readiness.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/440'],
          ignored_historical_pr_urls: [],
          conflicting_attached_pr_urls: [],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/440',
            owner: 'asabeko',
            repo: 'CO',
            number: 440
          },
          snapshot: {
            state: 'OPEN',
            review_decision: 'APPROVED',
            merge_state_status: 'BEHIND',
            ready_to_merge: false,
            gate_reasons: ['merge_state=BEHIND'],
            action_required_reasons: ['merge_state=BEHIND'],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-10T05:15:05.000Z',
            merged_at: null
          },
          branch_recovery: {
            attempted_at: '2026-04-10T05:15:04.000Z',
            recovery_reason: 'merge_state=BEHIND',
            command: 'gh',
            args: ['pr', 'update-branch', '440', '--repo', 'asabeko/CO'],
            exit_code: 0,
            ok: true,
            stdout: 'Updated branch',
            stderr: null,
            failure_kind: null
          }
        }
      }
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        number: 440,
        merge_closeout_status: 'watching',
        reason: 'branch_refresh_requested',
        branch_recovery: {
          attempted_at: '2026-04-10T05:15:04.000Z',
          recovery_reason: 'merge_state=BEHIND',
          command: 'gh',
          args: ['pr', 'update-branch', '440', '--repo', 'asabeko/CO'],
          exit_code: 0,
          ok: true,
          stdout: 'Updated branch',
          failure_kind: null
        }
      },
      progress: {
        phase: 'watching_merge',
        kind: 'merge_closeout',
        status: 'progressing',
        stall_classification: 'progressing',
        recovery_recommendation: 'continue_waiting'
      },
      stall_classification: 'progressing',
      recovery_recommendation: 'continue_waiting'
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

  it('keeps real stage failure text in retry truth and projected progress', () => {
    const failureSummary = "Stage 'fail once' failed with exit code 1.";
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-04-18T02:00:00.000Z'
      },
      claim: {
        state: 'resumable',
        reason: 'provider_issue_rehydrated_resumable_run',
        updated_at: '2026-04-18T02:00:10.000Z',
        issue_updated_at: '2026-04-18T02:00:00.000Z',
        run_id: 'run-225',
        retry_queued: true,
        retry_attempt: 1,
        retry_due_at: '2026-04-18T02:05:00.000Z',
        retry_error: failureSummary
      },
      proof: {
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'stage:fail-once:failed',
        last_event: 'turn_failed',
        last_message: failureSummary,
        last_event_at: '2026-04-18T02:00:08.000Z',
        updated_at: '2026-04-18T02:00:09.000Z',
        linear_audit: null
      }
    });

    expect(snapshot?.claim?.retry?.error).toBe(failureSummary);
    expect(snapshot?.progress?.summary).toBe(failureSummary);
    expect(snapshot?.progress?.summary).not.toContain('Guardrails: spec-guard command not found.');
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

  it('does not let fallback-only claim rewrites suppress live merge closeout truth after Rework', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      claim: {
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        updated_at: '2026-04-05T07:05:00.000Z',
        issue_state: 'Rework',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-05T07:00:00.000Z',
        run_id: 'run-82-fallback-rework',
        merge_closeout: {
          recorded_at: '2026-04-05T07:02:00.000Z',
          issue_updated_at: '2026-04-05T07:02:00.000Z',
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
            updated_at: '2026-04-05T07:02:00.000Z',
            merged_at: null
          }
        }
      },
      proof: null
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        number: 82,
        required_checks_pending: 2
      },
      progress: {
        kind: 'merge_closeout',
        status: 'waiting',
        stall_classification: 'waiting_on_checks',
        recovery_recommendation: 'wait_for_checks'
      }
    });
  });

  it('does not let polling freshness alone suppress live merge closeout truth after Rework', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      claim: {
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        updated_at: '2026-04-05T07:05:00.000Z',
        issue_state: 'Rework',
        issue_state_type: 'started',
        issue_updated_at: null,
        run_id: 'run-82-polling-rework',
        merge_closeout: {
          recorded_at: '2026-04-05T07:02:00.000Z',
          issue_updated_at: '2026-04-05T07:02:00.000Z',
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
            updated_at: '2026-04-05T07:02:00.000Z',
            merged_at: null
          }
        }
      },
      proof: null
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        number: 82,
        required_checks_pending: 2
      },
      progress: {
        kind: 'merge_closeout',
        status: 'waiting',
        stall_classification: 'waiting_on_checks',
        recovery_recommendation: 'wait_for_checks'
      }
    });
  });

  it('does not let stale claim-side Rework truth suppress live tracked Merging PR lifecycle truth', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-05T07:06:00.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        updated_at: '2026-04-05T07:06:30.000Z',
        issue_state: 'Rework',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-05T07:05:00.000Z',
        run_id: 'run-82-stale-claim-rework',
        merge_closeout: {
          recorded_at: '2026-04-05T07:04:00.000Z',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-05T07:04:00.000Z',
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
            updated_at: '2026-04-05T07:04:00.000Z',
            merged_at: null
          }
        }
      },
      proof: null
    });

    expect(snapshot).toMatchObject({
      live_linear_state: {
        state: 'Merging'
      },
      pull_request: {
        number: 82,
        required_checks_pending: 2
      },
      progress: {
        kind: 'merge_closeout',
        status: 'waiting',
        stall_classification: 'waiting_on_checks',
        recovery_recommendation: 'wait_for_checks'
      }
    });
  });

  it('suppresses stale review-promotion truth when Rework is newer than the semantic transition timestamp', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Rework',
        state_type: 'started',
        updated_at: '2026-04-05T07:04:00.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        updated_at: '2026-04-05T07:05:00.000Z',
        issue_state: 'Rework',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-05T07:04:00.000Z',
        run_id: 'run-416-stale-review-promotion',
        review_promotion: {
          recorded_at: '2026-04-05T07:05:00.000Z',
          status: 'promoted',
          reason: 'promoted_to_merging',
          summary: 'Promoted the issue from In Review to Merging after confirming the attached PR is merge-ready.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
          ignored_historical_pr_urls: [],
          conflicting_attached_pr_urls: [],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/416',
            owner: 'asabeko',
            repo: 'CO',
            number: 416
          },
          snapshot: {
            state: 'OPEN',
            review_decision: 'APPROVED',
            merge_state_status: 'CLEAN',
            ready_to_merge: true,
            gate_reasons: [],
            action_required_reasons: [],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-05T07:05:00.000Z',
            merged_at: null
          },
          linear_transition: {
            status: 'transitioned',
            attempted_at: '2026-04-05T07:03:00.000Z',
            previous_state: 'In Review',
            target_state: 'Merging',
            issue_state: 'Merging',
            issue_state_type: 'started',
            issue_updated_at: '2026-04-05T07:03:00.000Z',
            error: null
          }
        }
      },
      proof: null
    });

    expect(snapshot?.pull_request).toBeNull();
    expect(snapshot?.progress).toBeTruthy();
    expect(snapshot?.progress?.kind).not.toBe('review_promotion');
  });

  it('suppresses stale review-promotion truth when Rework is newer than the top-level issue timestamp', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Rework',
        state_type: 'started',
        updated_at: '2026-04-09T03:14:45.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        updated_at: '2026-04-09T03:15:00.000Z',
        issue_state: 'Rework',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:14:45.000Z',
        run_id: 'run-416-review-promotion-action-required',
        review_promotion: {
          recorded_at: '2026-04-09T03:15:00.000Z',
          issue_updated_at: '2026-04-09T03:14:00.000Z',
          status: 'action_required',
          reason: 'review=REVIEW_REQUIRED',
          summary: 'Review-handoff promotion is blocked by: review=REVIEW_REQUIRED.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
          ignored_historical_pr_urls: [],
          conflicting_attached_pr_urls: [],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/416',
            owner: 'asabeko',
            repo: 'CO',
            number: 416
          },
          snapshot: {
            state: 'OPEN',
            review_decision: 'REVIEW_REQUIRED',
            merge_state_status: 'CLEAN',
            ready_to_merge: false,
            gate_reasons: ['review=REVIEW_REQUIRED'],
            action_required_reasons: ['review=REVIEW_REQUIRED'],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-09T03:14:30.000Z',
            merged_at: null
          },
          linear_transition: null
        }
      },
      proof: null
    });

    expect(snapshot?.pull_request).toBeNull();
    expect(snapshot?.progress).toBeTruthy();
    expect(snapshot?.progress?.kind).not.toBe('review_promotion');
  });

  it('uses the newest Rework timestamp across tracked issue and claim truth', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Rework',
        state_type: 'started',
        updated_at: '2026-04-05T07:02:00.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        updated_at: '2026-04-05T07:05:00.000Z',
        issue_state: 'Rework',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-05T07:04:00.000Z',
        run_id: 'run-416-stale-review-promotion',
        review_promotion: {
          recorded_at: '2026-04-05T07:05:00.000Z',
          status: 'promoted',
          reason: 'promoted_to_merging',
          summary: 'Promoted the issue from In Review to Merging after confirming the attached PR is merge-ready.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
          ignored_historical_pr_urls: [],
          conflicting_attached_pr_urls: [],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/416',
            owner: 'asabeko',
            repo: 'CO',
            number: 416
          },
          snapshot: {
            state: 'OPEN',
            review_decision: 'APPROVED',
            merge_state_status: 'CLEAN',
            ready_to_merge: true,
            gate_reasons: [],
            action_required_reasons: [],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-05T07:03:30.000Z',
            merged_at: null
          },
          linear_transition: {
            status: 'transitioned',
            attempted_at: '2026-04-05T07:03:00.000Z',
            previous_state: 'In Review',
            target_state: 'Merging',
            issue_state: 'Merging',
            issue_state_type: 'started',
            issue_updated_at: '2026-04-05T07:03:00.000Z',
            error: null
          }
        }
      },
      proof: null
    });

    expect(snapshot?.pull_request).toBeNull();
    expect(snapshot?.progress).toBeTruthy();
    expect(snapshot?.progress?.kind).not.toBe('review_promotion');
  });

  it('keeps PR lifecycle truth when the lifecycle record is the current Rework transition', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Rework',
        state_type: 'started',
        updated_at: '2026-04-10T05:16:00.000Z'
      },
      claim: {
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        updated_at: '2026-04-10T05:16:30.000Z',
        issue_state: 'Rework',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-10T05:16:00.000Z',
        run_id: 'run-440-branch-conflict',
        merge_closeout: {
          recorded_at: '2026-04-10T05:16:00.000Z',
          issue_state: 'Rework',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-10T05:16:00.000Z',
          status: 'action_required',
          reason: 'branch_recovery_conflict',
          summary:
            'Automatic branch refresh hit a merge conflict for attached PR #440; moved the issue to Rework with exact recovery metadata recorded.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/440'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/440',
            owner: 'asabeko',
            repo: 'CO',
            number: 440
          },
          snapshot: {
            state: 'OPEN',
            review_decision: 'APPROVED',
            merge_state_status: 'DIRTY',
            ready_to_merge: false,
            gate_reasons: ['merge_state=DIRTY'],
            action_required_reasons: ['merge_state=DIRTY'],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-04-10T05:15:55.000Z',
            merged_at: null
          },
          branch_recovery: {
            attempted_at: '2026-04-10T05:15:59.000Z',
            recovery_reason: 'merge_state=DIRTY',
            command: 'gh',
            args: ['pr', 'update-branch', '440', '--repo', 'asabeko/CO'],
            exit_code: 1,
            ok: false,
            stdout: null,
            stderr: 'merge conflict',
            failure_kind: 'conflict'
          },
          linear_transition: {
            status: 'transitioned',
            attempted_at: '2026-04-10T05:16:00.000Z',
            previous_state: 'Merging',
            target_state: 'Rework',
            issue_state: 'Rework',
            issue_state_type: 'started',
            issue_updated_at: '2026-04-10T05:16:00.000Z',
            error: null
          }
        }
      },
      proof: null
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        number: 440,
        merge_closeout_status: 'action_required',
        reason: 'branch_recovery_conflict',
        branch_recovery: {
          recovery_reason: 'merge_state=DIRTY',
          failure_kind: 'conflict'
        }
      },
      progress: {
        kind: 'merge_closeout',
        status: 'stalled',
        stall_reason: 'merge_state=DIRTY',
        recovery_recommendation: 'inspect_merge_closeout'
      }
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

  it('keeps merged live-owner closeout action-required instead of projecting completed', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Blocked',
        state_type: 'started',
        updated_at: '2026-04-30T08:46:00.000Z'
      },
      claim: {
        state: 'handoff_failed',
        reason: 'provider_issue_merge_closeout_action_required',
        updated_at: '2026-04-30T08:46:00.000Z',
        run_id: 'run-co444-live-owner',
        merge_closeout: {
          recorded_at: '2026-04-30T08:46:00.000Z',
          status: 'action_required',
          reason: 'docs_freshness_live_owner_blocks_done_transition',
          summary:
            'Attached PR #730 merged and the shared root is reconciled, but CO-444 is still the live docs:freshness:maintain owner; moved the issue to Blocked instead of transitioning it to Done.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/730'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/730',
            owner: 'asabeko',
            repo: 'CO',
            number: 730
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
            updated_at: '2026-04-30T08:45:30.000Z',
            merged_at: '2026-04-30T08:45:00.000Z'
          },
          shared_root: {
            status: 'reconciled',
            reason: 'shared_root_reconciled',
            before_status: '## main...origin/main',
            after_status: '## main...origin/main'
          },
          docs_freshness_owner: {
            terminal_transition_blocked: true,
            freshness_decision: 'pass_with_owned_rolling_debt',
            owner_issue: 'CO-444',
            blocking_changed_paths: []
          }
        }
      },
      proof: null
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        number: 730,
        merge_closeout_status: 'action_required',
        reason: 'docs_freshness_live_owner_blocks_done_transition'
      },
      progress: {
        phase: 'watching_merge',
        kind: 'merge_closeout',
        status: 'stalled',
        stall_classification: 'stalled',
        stall_reason: 'docs_freshness_live_owner_blocks_done_transition',
        recovery_recommendation: 'inspect_merge_closeout'
      }
    });
  });

  it('keeps merged live-owner Blocked transition failures visible as failed', () => {
    const snapshot = buildProviderIssueDebugSnapshot({
      tracked_issue: {
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-30T08:46:00.000Z'
      },
      claim: {
        state: 'handoff_failed',
        reason: 'provider_issue_merge_closeout_transition_failed',
        updated_at: '2026-04-30T08:46:00.000Z',
        run_id: 'run-co444-live-owner',
        merge_closeout: {
          recorded_at: '2026-04-30T08:46:00.000Z',
          status: 'transition_failed',
          reason: 'linear_blocked_transition_failed_for_docs_freshness_owner',
          summary:
            'Attached PR #730 merged and the shared root is reconciled, but docs:freshness:maintain still identifies CO-444 as the live owner and the Linear issue could not transition to Blocked instead of Done.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/730'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/730',
            owner: 'asabeko',
            repo: 'CO',
            number: 730
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
            updated_at: '2026-04-30T08:45:30.000Z',
            merged_at: '2026-04-30T08:45:00.000Z'
          },
          shared_root: {
            status: 'reconciled',
            reason: 'shared_root_reconciled',
            before_status: '## main...origin/main',
            after_status: '## main...origin/main'
          },
          linear_transition: {
            status: 'failed',
            target_state: 'Blocked',
            error: 'linear_state_changed: issue updated while transitioning'
          },
          docs_freshness_owner: {
            terminal_transition_blocked: true,
            freshness_decision: 'pass_with_owned_rolling_debt',
            owner_issue: 'CO-444',
            blocking_changed_paths: []
          }
        }
      },
      proof: null
    });

    expect(snapshot).toMatchObject({
      pull_request: {
        number: 730,
        merge_closeout_status: 'transition_failed',
        reason: 'linear_blocked_transition_failed_for_docs_freshness_owner'
      },
      progress: {
        phase: 'failed',
        kind: 'merge_closeout',
        status: 'failed',
        stall_classification: 'failed',
        stall_reason: 'linear_blocked_transition_failed_for_docs_freshness_owner',
        recovery_recommendation: 'inspect_merge_closeout'
      }
    });
  });

  it('prefers newer terminal tracked issue state over stale merge-closeout blockers', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      tracked_issue: {
        state: 'Done',
        state_type: 'completed',
        updated_at: '2026-04-05T06:51:00.000Z'
      },
      claim: {
        state: 'completed',
        updated_at: '2026-04-05T06:50:30.000Z',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T06:51:00.000Z',
        merge_closeout: {
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-05T06:50:30.000Z',
          recorded_at: '2026-04-05T06:50:30.000Z',
          status: 'merged',
          reason: 'pending_shared_root_reconciliation',
          summary: 'Merged attached PR #82; shared-root reconciliation is pending.',
          snapshot: {
            updated_at: '2026-04-05T06:50:30.000Z',
            merged_at: '2026-04-05T06:50:00.000Z'
          },
          shared_root: {
            status: 'skipped',
            reason: 'shared_root_dirty'
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

    expect(progress).toMatchObject({
      phase: 'completed',
      kind: 'workflow',
      status: 'completed',
      last_semantic_progress_at: '2026-04-05T06:51:00.000Z',
      stall_classification: 'completed',
      recovery_recommendation: 'no_action'
    });
  });

  it('falls back to terminal claim issue state when live tracked issue data is unavailable', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      claim: {
        state: 'completed',
        updated_at: '2026-04-05T06:50:30.000Z',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T06:51:00.000Z',
        merge_closeout: {
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-05T06:50:30.000Z',
          recorded_at: '2026-04-05T06:50:30.000Z',
          status: 'merged',
          reason: 'pending_shared_root_reconciliation',
          summary: 'Merged attached PR #82; shared-root reconciliation is pending.',
          snapshot: {
            updated_at: '2026-04-05T06:50:30.000Z',
            merged_at: '2026-04-05T06:50:00.000Z'
          },
          shared_root: {
            status: 'skipped',
            reason: 'shared_root_dirty'
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

    expect(progress).toMatchObject({
      phase: 'completed',
      kind: 'workflow',
      status: 'completed',
      last_semantic_progress_at: '2026-04-05T06:51:00.000Z',
      stall_classification: 'completed',
      recovery_recommendation: 'no_action'
    });
  });

  it('does not let claim-only terminal cache override live worker progress when tracked issue data is unavailable', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      claim: {
        state: 'completed',
        updated_at: '2026-04-05T06:55:00.000Z',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T06:52:00.000Z'
      },
      proof: {
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_started',
        last_message: 'Turn is still running.',
        last_event_at: '2026-04-05T06:54:30.000Z',
        updated_at: '2026-04-05T06:54:45.000Z',
        linear_audit: null
      },
      now: () => '2026-04-05T06:55:00.000Z'
    });

    expect(progress).toMatchObject({
      phase: 'turn_running',
      kind: 'worker',
      status: 'progressing',
      summary: 'Turn is still running.',
      last_semantic_progress_at: '2026-04-05T06:54:30.000Z',
      stall_classification: 'progressing',
      recovery_recommendation: 'continue_waiting'
    });
  });

  it('treats equal terminal and merge-closeout timestamps as terminal-winning', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      tracked_issue: {
        state: 'Done',
        state_type: 'completed',
        updated_at: '2026-04-05T06:50:30.000Z'
      },
      claim: {
        state: 'completed',
        updated_at: '2026-04-05T06:50:30.000Z',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T06:50:30.000Z',
        merge_closeout: {
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-05T06:50:30.000Z',
          recorded_at: '2026-04-05T06:50:30.000Z',
          status: 'merged',
          reason: 'pending_shared_root_reconciliation',
          summary: 'Merged attached PR #82; shared-root reconciliation is pending.',
          snapshot: {
            updated_at: '2026-04-05T06:50:30.000Z',
            merged_at: '2026-04-05T06:50:00.000Z'
          },
          shared_root: {
            status: 'skipped',
            reason: 'shared_root_dirty'
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

    expect(progress).toMatchObject({
      phase: 'completed',
      kind: 'workflow',
      status: 'completed',
      last_semantic_progress_at: '2026-04-05T06:50:30.000Z',
      stall_classification: 'completed',
      recovery_recommendation: 'no_action'
    });
  });

  it('ignores later merge-closeout polling timestamps when issue freshness is terminal', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      tracked_issue: {
        state: 'Done',
        state_type: 'completed',
        updated_at: '2026-04-05T06:51:00.000Z'
      },
      claim: {
        state: 'completed',
        updated_at: '2026-04-05T06:52:30.000Z',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T06:51:00.000Z',
        merge_closeout: {
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-05T06:50:30.000Z',
          recorded_at: '2026-04-05T06:52:30.000Z',
          status: 'merged',
          reason: 'pending_shared_root_reconciliation',
          summary: 'Merge closeout polling refreshed after the issue was already terminal.',
          snapshot: {
            updated_at: '2026-04-05T06:52:30.000Z',
            merged_at: '2026-04-05T06:50:00.000Z'
          },
          shared_root: {
            status: 'skipped',
            reason: 'shared_root_dirty'
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

    expect(progress).toMatchObject({
      phase: 'completed',
      kind: 'workflow',
      status: 'completed',
      last_semantic_progress_at: '2026-04-05T06:51:00.000Z',
      stall_classification: 'completed',
      recovery_recommendation: 'no_action'
    });
  });

  it('prefers terminal tracked issue state when merge-closeout issue freshness is missing', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      tracked_issue: {
        state: 'Done',
        state_type: 'completed',
        updated_at: '2026-04-05T06:51:00.000Z'
      },
      claim: {
        state: 'completed',
        updated_at: '2026-04-05T06:52:30.000Z',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T06:51:00.000Z',
        merge_closeout: {
          issue_state: 'Merging',
          issue_state_type: 'started',
          recorded_at: '2026-04-05T06:52:30.000Z',
          status: 'merged',
          reason: 'pending_shared_root_reconciliation',
          summary: 'Merge closeout polling refreshed after the issue was already terminal.',
          snapshot: {
            updated_at: '2026-04-05T06:52:30.000Z',
            merged_at: '2026-04-05T06:50:00.000Z'
          },
          shared_root: {
            status: 'skipped',
            reason: 'shared_root_dirty'
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

    expect(progress).toMatchObject({
      phase: 'completed',
      kind: 'workflow',
      status: 'completed',
      last_semantic_progress_at: '2026-04-05T06:51:00.000Z',
      stall_classification: 'completed',
      recovery_recommendation: 'no_action'
    });
  });

  it('preserves merge-closeout progress when claim-only freshness is unknown', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      claim: {
        state: 'completed',
        updated_at: '2026-04-05T06:52:30.000Z',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T06:51:00.000Z',
        merge_closeout: {
          issue_state: 'Merging',
          issue_state_type: 'started',
          recorded_at: '2026-04-05T06:52:30.000Z',
          status: 'merged',
          reason: 'pending_shared_root_reconciliation',
          summary: 'Claim polling refreshed after the issue was already terminal.',
          snapshot: {
            updated_at: '2026-04-05T06:52:30.000Z',
            merged_at: '2026-04-05T06:50:00.000Z'
          },
          shared_root: {
            status: 'skipped',
            reason: 'shared_root_dirty'
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

    expect(progress).toMatchObject({
      phase: 'pending_shared_root_reconciliation',
      kind: 'merge_closeout',
      status: 'stalled',
      last_semantic_progress_at: '2026-04-05T06:52:30.000Z',
      stall_classification: 'stalled',
      stall_reason: 'shared_root_dirty',
      recovery_recommendation: 'inspect_merge_closeout'
    });
  });

  it('falls back to terminal claim issue state when claim freshness outruns unknown merge-closeout progress', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      claim: {
        state: 'completed',
        updated_at: '2026-04-05T06:55:00.000Z',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T06:53:00.000Z',
        merge_closeout: {
          issue_state: 'Merging',
          issue_state_type: 'started',
          recorded_at: '2026-04-05T06:52:30.000Z',
          status: 'merged',
          reason: 'pending_shared_root_reconciliation',
          summary: 'Claim issue freshness advanced beyond the retained merge closeout record.',
          snapshot: {
            updated_at: '2026-04-05T06:52:30.000Z',
            merged_at: '2026-04-05T06:50:00.000Z'
          },
          shared_root: {
            status: 'skipped',
            reason: 'shared_root_dirty'
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

    expect(progress).toMatchObject({
      phase: 'completed',
      kind: 'workflow',
      status: 'completed',
      last_semantic_progress_at: '2026-04-05T06:55:00.000Z',
      stall_classification: 'completed',
      recovery_recommendation: 'no_action'
    });
  });

  it('does not let claim polling outrank merge-closeout issue freshness when issue freshness is absent', () => {
    const progress = deriveProviderLinearWorkerProgressSnapshot({
      claim: {
        state: 'completed',
        updated_at: '2026-04-05T06:55:00.000Z',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: null,
        merge_closeout: {
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-05T06:54:00.000Z',
          recorded_at: '2026-04-05T06:55:00.000Z',
          status: 'merged',
          reason: 'pending_shared_root_reconciliation',
          summary: 'Claim polling refreshed after merge-closeout issue freshness was recorded.',
          snapshot: {
            updated_at: '2026-04-05T06:55:00.000Z',
            merged_at: '2026-04-05T06:50:00.000Z'
          },
          shared_root: {
            status: 'skipped',
            reason: 'shared_root_dirty'
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

    expect(progress).toMatchObject({
      phase: 'pending_shared_root_reconciliation',
      kind: 'merge_closeout',
      status: 'stalled',
      last_semantic_progress_at: '2026-04-05T06:55:00.000Z',
      stall_classification: 'stalled',
      stall_reason: 'shared_root_dirty',
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
