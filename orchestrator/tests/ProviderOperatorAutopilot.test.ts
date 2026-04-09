import { describe, expect, it, vi } from 'vitest';

import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import {
  runProviderOperatorAutopilot,
  resolveProviderOperatorAutopilotConfig,
  type ProviderOperatorAutopilotConfig
} from '../src/cli/control/providerOperatorAutopilot.js';
import type { ProviderIntakeClaimRecord } from '../src/cli/control/providerIntakeState.js';

describe('providerOperatorAutopilot', () => {
  it('promotes the first safe backlog head to Ready', async () => {
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-118',
        state: { id: 'ready', name: 'Ready', type: 'unstarted' },
        updated_at: '2026-04-09T10:00:00.000Z'
      },
      previous_state: { id: 'backlog', name: 'Backlog', type: 'backlog' },
      target_state: { id: 'ready', name: 'Ready', type: 'unstarted' },
      source_setup: null
    }));

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Backlog',
            state_type: 'backlog'
          }),
          createTrackedIssue({
            id: 'lin-issue-2',
            identifier: 'CO-119',
            state: 'Backlog',
            state_type: 'backlog',
            priority: 2
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      stateName: 'Ready',
      sourceSetup: null,
      env: expect.any(Object)
    });
    expect(result).toMatchObject({
      status: 'acted',
      actions: [
        {
          kind: 'backlog_promotion',
          issue_identifier: 'CO-118',
          reason: 'backlog_head_promoted',
          transition: {
            status: 'transitioned',
            target_state: 'Ready'
          }
        }
      ]
    });
  });

  it('holds backlog promotion when the head issue is blocked by non-terminal work', async () => {
    const transitionIssueState = vi.fn(async () => {
      throw new Error('transition should not run for blocked backlog heads');
    });

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Backlog',
            state_type: 'backlog',
            blocked_by: [
              {
                id: 'lin-issue-0',
                identifier: 'CO-117',
                state: 'In Progress',
                state_type: 'started'
              }
            ]
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: null
      },
      {
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'noop',
      holds: [
        {
          kind: 'backlog_promotion',
          issue_identifier: 'CO-118',
          reason: 'backlog_head_blocked_by_non_terminal'
        }
      ]
    });
  });

  it('holds backlog promotion when the head issue is owned by another operator', async () => {
    const transitionIssueState = vi.fn(async () => {
      throw new Error('transition should not run for foreign-owned backlog heads');
    });

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Backlog',
            state_type: 'backlog',
            viewer_id: 'viewer-1',
            assignee_id: 'viewer-2',
            assignee_name: 'Other Operator'
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: null
      },
      {
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'noop',
      holds: [
        {
          kind: 'backlog_promotion',
          issue_identifier: 'CO-118',
          reason: 'backlog_head_owned_by_other_operator'
        }
      ]
    });
  });

  it('ignores historical completed claims when promoting the backlog head', async () => {
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-118',
        state: { id: 'ready', name: 'Ready', type: 'unstarted' },
        updated_at: '2026-04-09T10:02:00.000Z'
      },
      previous_state: { id: 'backlog', name: 'Backlog', type: 'backlog' },
      target_state: { id: 'ready', name: 'Ready', type: 'unstarted' },
      source_setup: null
    }));

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Backlog',
            state_type: 'backlog'
          })
        ],
        claims: [
          createClaim({
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            issue_state: 'Backlog',
            issue_state_type: 'backlog',
            state: 'completed',
            reason: 'provider_issue_rehydrated_completed_run'
          })
        ],
        config: buildConfig(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:02:00.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      stateName: 'Ready',
      sourceSetup: null,
      env: expect.any(Object)
    });
    expect(result).toMatchObject({
      status: 'acted',
      actions: [
        {
          kind: 'backlog_promotion',
          issue_identifier: 'CO-118',
          reason: 'backlog_head_promoted'
        }
      ]
    });
  });

  it('moves author-action-required review handoffs into Rework', async () => {
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-118',
        state: { id: 'rework', name: 'Rework', type: 'started' },
        updated_at: '2026-04-09T10:05:00.000Z'
      },
      previous_state: { id: 'review', name: 'In Review', type: 'started' },
      target_state: { id: 'rework', name: 'Rework', type: 'started' },
      source_setup: null
    }));

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'In Review',
            state_type: 'started'
          })
        ],
        claims: [
          createClaim({
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            issue_state: 'In Review',
            review_promotion: createReviewPromotion({
              status: 'action_required',
              action_required_reasons: ['review=CHANGES_REQUESTED', 'unresolved_threads=2']
            })
          })
        ],
        config: buildConfig(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:05:00.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      stateName: 'Rework',
      sourceSetup: null,
      env: expect.any(Object)
    });
    expect(result).toMatchObject({
      status: 'acted',
      actions: [
        {
          kind: 'review_handoff_rework',
          issue_identifier: 'CO-118',
          reason: 'author_action_required_rework',
          action_required_reasons: ['review=CHANGES_REQUESTED', 'unresolved_threads=2']
        }
      ]
    });
  });

  it('keeps non-author-action review blockers parked in review', async () => {
    const transitionIssueState = vi.fn(async () => {
      throw new Error('transition should not run for excluded review blockers');
    });

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'In Review',
            state_type: 'started'
          })
        ],
        claims: [
          createClaim({
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            issue_state: 'In Review',
            review_promotion: createReviewPromotion({
              status: 'action_required',
              action_required_reasons: [
                'review=REVIEW_REQUIRED',
                'label:do-not-merge',
                'required_checks_query_failed'
              ]
            })
          })
        ],
        config: buildConfig(),
        previous_result: null
      },
      {
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'noop',
      holds: [
        {
          kind: 'review_handoff_rework',
          issue_identifier: 'CO-118',
          reason: 'review_handoff_non_author_action_required',
          action_required_reasons: [
            'review=REVIEW_REQUIRED',
            'label:do-not-merge',
            'required_checks_query_failed'
          ]
        }
      ]
    });
  });

  it('surfaces pending local rollout follow-up after merged closeout truth lands', async () => {
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [
        createClaim({
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          merge_closeout: createMergeCloseout({
            status: 'merged',
            reason: 'merged_and_transitioned_done'
          })
        })
      ],
      config: buildConfig(),
      previous_result: null
    });

    expect(result).toMatchObject({
      status: 'acted',
      pending_actions: [
        {
          kind: 'local_rollout',
          issue_identifier: 'CO-118',
          merge_closeout_reason: 'merged_and_transitioned_done'
        }
      ]
    });
  });
});

function buildConfig(): ProviderOperatorAutopilotConfig {
  return resolveProviderOperatorAutopilotConfig({
    operator_autopilot: {
      enabled: true,
      backlog_promotion: {
        enabled: true,
        state_name: 'Backlog',
        target_state_name: 'Ready'
      },
      review_handoff_rework: {
        enabled: true,
        target_state_name: 'Rework',
        excluded_action_required_reasons: [
          'draft',
          'label:do-not-merge',
          'review=REVIEW_REQUIRED',
          'required_checks_query_failed'
        ]
      },
      post_merge_rollout: {
        enabled: true,
        summary: 'Merge closeout completed; local rollout follow-up may still be required.'
      }
    }
  });
}

function createTrackedIssue(
  overrides: Partial<LiveLinearTrackedIssue> & Pick<LiveLinearTrackedIssue, 'id' | 'identifier'>
): LiveLinearTrackedIssue {
  return {
    provider: 'linear',
    id: overrides.id,
    identifier: overrides.identifier,
    title: overrides.title ?? 'Operator autopilot test issue',
    description: overrides.description ?? null,
    url: overrides.url ?? `https://linear.app/asabeko/issue/${overrides.identifier}`,
    state: overrides.state ?? 'Backlog',
    state_type: overrides.state_type ?? 'backlog',
    viewer_id: overrides.viewer_id ?? 'viewer-1',
    assignee_id: overrides.assignee_id ?? 'viewer-1',
    assignee_name: overrides.assignee_name ?? 'Codex Operator',
    workspace_id: overrides.workspace_id ?? 'workspace-1',
    team_id: overrides.team_id ?? 'team-1',
    team_key: overrides.team_key ?? 'CO',
    team_name: overrides.team_name ?? 'CO',
    project_id: overrides.project_id ?? 'project-1',
    project_name: overrides.project_name ?? 'CO',
    priority: overrides.priority ?? 1,
    created_at: overrides.created_at ?? '2026-04-09T09:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-04-09T09:00:00.000Z',
    blocked_by: overrides.blocked_by ?? [],
    recent_activity: overrides.recent_activity ?? []
  };
}

function createClaim(
  overrides: Partial<ProviderIntakeClaimRecord> & Pick<ProviderIntakeClaimRecord, 'issue_id' | 'issue_identifier'>
): ProviderIntakeClaimRecord {
  return {
    provider: 'linear',
    provider_key: `linear:${overrides.issue_id}`,
    issue_id: overrides.issue_id,
    issue_identifier: overrides.issue_identifier,
    issue_title: overrides.issue_title ?? 'Operator autopilot test issue',
    issue_state: overrides.issue_state ?? 'In Review',
    issue_state_type: overrides.issue_state_type ?? 'started',
    issue_updated_at: overrides.issue_updated_at ?? '2026-04-09T09:00:00.000Z',
    issue_viewer_id: overrides.issue_viewer_id ?? 'viewer-1',
    issue_viewer_auth_fingerprint: overrides.issue_viewer_auth_fingerprint ?? null,
    issue_assignee_id: overrides.issue_assignee_id ?? 'viewer-1',
    issue_assignee_name: overrides.issue_assignee_name ?? 'Codex Operator',
    issue_blocked_by: overrides.issue_blocked_by ?? [],
    task_id: overrides.task_id ?? 'task-co-118',
    mapping_source: overrides.mapping_source ?? 'provider_id_fallback',
    state: overrides.state ?? 'handoff_failed',
    reason: overrides.reason ?? 'provider_issue_review_promotion_action_required',
    accepted_at: overrides.accepted_at ?? '2026-04-09T09:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-04-09T09:00:10.000Z',
    last_delivery_id: overrides.last_delivery_id ?? null,
    last_event: overrides.last_event ?? 'Issue',
    last_action: overrides.last_action ?? 'update',
    last_webhook_timestamp: overrides.last_webhook_timestamp ?? null,
    run_id: overrides.run_id ?? 'run-co-118',
    run_manifest_path: overrides.run_manifest_path ?? '/tmp/run-co-118/manifest.json',
    launch_source: overrides.launch_source ?? null,
    launch_token: overrides.launch_token ?? null,
    launch_started_at: overrides.launch_started_at ?? null,
    retry_queued: overrides.retry_queued ?? null,
    retry_attempt: overrides.retry_attempt ?? null,
    retry_due_at: overrides.retry_due_at ?? null,
    retry_error: overrides.retry_error ?? null,
    review_promotion: overrides.review_promotion ?? null,
    merge_closeout: overrides.merge_closeout ?? null
  };
}

function createReviewPromotion(input: {
  status: 'watching' | 'action_required' | 'promoted' | 'promotion_failed' | 'transition_failed';
  action_required_reasons: string[];
}) {
  return {
    recorded_at: '2026-04-09T09:05:00.000Z',
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-118',
    issue_state: 'In Review',
    issue_state_type: 'started',
    issue_updated_at: '2026-04-09T09:05:00.000Z',
    status: input.status,
    reason: input.status === 'action_required' ? 'review_handoff_promotion_blocked' : 'review_handoff_watching',
    summary: 'review-handoff promotion test fixture',
    attached_pr_urls: ['https://github.com/asabeko/CO/pull/118'],
    ignored_historical_pr_urls: [],
    conflicting_attached_pr_urls: [],
    pr: {
      url: 'https://github.com/asabeko/CO/pull/118',
      owner: 'asabeko',
      repo: 'CO',
      number: 118
    },
    snapshot: {
      state: 'OPEN',
      review_decision: input.action_required_reasons.find((reason) => reason.startsWith('review='))?.split('=')[1] ?? 'CHANGES_REQUESTED',
      merge_state_status: 'CLEAN',
      ready_to_merge: false,
      gate_reasons: [...input.action_required_reasons],
      action_required_reasons: [...input.action_required_reasons],
      unresolved_thread_count: 0,
      checks_pending: 0,
      checks_failed: 0,
      required_checks_pending: 0,
      required_checks_failed: 0,
      updated_at: '2026-04-09T09:05:00.000Z',
      merged_at: null,
      head_oid: 'abc123'
    },
    linear_transition: null
  };
}

function createMergeCloseout(input: {
  status: 'watching' | 'action_required' | 'merged' | 'merge_failed' | 'transition_failed';
  reason: string;
}) {
  return {
    recorded_at: '2026-04-09T09:15:00.000Z',
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-118',
    issue_state: 'Done',
    issue_state_type: 'completed',
    issue_updated_at: '2026-04-09T09:15:00.000Z',
    status: input.status,
    reason: input.reason,
    summary: 'merge closeout test fixture',
    attached_pr_urls: ['https://github.com/asabeko/CO/pull/118'],
    ignored_historical_pr_urls: [],
    conflicting_attached_pr_urls: [],
    pr: {
      url: 'https://github.com/asabeko/CO/pull/118',
      owner: 'asabeko',
      repo: 'CO',
      number: 118
    },
    snapshot: {
      state: 'MERGED',
      review_decision: 'APPROVED',
      merge_state_status: 'CLEAN',
      ready_to_merge: false,
      gate_reasons: ['state=MERGED'],
      action_required_reasons: [],
      unresolved_thread_count: 0,
      checks_pending: 0,
      checks_failed: 0,
      required_checks_pending: 0,
      required_checks_failed: 0,
      updated_at: '2026-04-09T09:15:00.000Z',
      merged_at: '2026-04-09T09:15:00.000Z',
      head_oid: 'abc123'
    },
    merge_attempt: null,
    shared_root: {
      status: 'reconciled' as const,
      attempted_at: '2026-04-09T09:14:00.000Z',
      before_status: '## main...origin/main',
      after_status: '## main...origin/main',
      reason: 'shared_root_reconciled'
    },
    linear_transition: {
      status: 'transitioned' as const,
      attempted_at: '2026-04-09T09:15:00.000Z',
      previous_state: 'Merging',
      target_state: 'Done',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-09T09:15:00.000Z',
      error: null
    }
  };
}
