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
