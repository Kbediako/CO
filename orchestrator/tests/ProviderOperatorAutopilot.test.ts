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
      expectedStateName: 'Backlog',
      expectedStateType: 'backlog',
      expectedUpdatedAt: '2026-04-09T09:00:00.000Z',
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

  it('holds backlog promotion when a higher-ranked todo lane is still blocked ahead of the first backlog issue', async () => {
    const transitionIssueState = vi.fn(async () => {
      throw new Error('transition should not run while a higher-ranked queue lane is blocked');
    });

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-117',
            state: 'Ready',
            state_type: 'unstarted',
            priority: 1,
            blocked_by: [
              {
                id: 'lin-issue-0',
                identifier: 'CO-116',
                state: 'In Progress',
                state_type: 'started'
              }
            ]
          }),
          createTrackedIssue({
            id: 'lin-issue-2',
            identifier: 'CO-118',
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
          reason: 'backlog_head_blocked_by_higher_ranked_lane'
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
      expectedStateName: 'Backlog',
      expectedStateType: 'backlog',
      expectedUpdatedAt: '2026-04-09T09:00:00.000Z',
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

  it('records noop backlog promotions so same-cycle consumers can refetch tracked issue truth', async () => {
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'noop' as const,
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-118',
        state: { id: 'ready', name: 'Ready', type: 'unstarted' },
        updated_at: '2026-04-09T10:03:00.000Z'
      },
      previous_state: { id: 'ready', name: 'Ready', type: 'unstarted' },
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
        claims: [],
        config: buildConfig(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:03:00.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'noop',
      actions: [
        {
          kind: 'backlog_promotion',
          issue_identifier: 'CO-118',
          reason: 'backlog_head_already_promoted',
          transition: {
            status: 'noop',
            target_state: 'Ready'
          }
        }
      ],
      holds: [],
      pending_actions: []
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
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-09T09:00:00.000Z',
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

  it('ignores released review handoff claims even when review action is required', async () => {
    const transitionIssueState = vi.fn(async () => {
      throw new Error('transition should not run for released handoff claims');
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
            state: 'released',
            reason: 'provider_issue_released:assignee_changed',
            issue_state: 'In Review',
            review_promotion: createReviewPromotion({
              status: 'action_required',
              action_required_reasons: ['review=CHANGES_REQUESTED']
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
      actions: [],
      holds: []
    });
  });

  it('ignores foreign-owned review handoff claims even when review action is required', async () => {
    const transitionIssueState = vi.fn(async () => {
      throw new Error('transition should not run for foreign-owned handoff claims');
    });

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'In Review',
            state_type: 'started',
            assignee_id: 'viewer-2',
            assignee_name: 'Other Operator'
          })
        ],
        claims: [
          createClaim({
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            issue_state: 'In Review',
            issue_assignee_id: 'viewer-2',
            issue_assignee_name: 'Other Operator',
            review_promotion: createReviewPromotion({
              status: 'action_required',
              action_required_reasons: ['review=CHANGES_REQUESTED']
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
      actions: [],
      holds: []
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

  it('picks the first author-action-required handoff even when an earlier handoff is parked for review-only blockers', async () => {
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-issue-2',
        identifier: 'CO-119',
        state: { id: 'rework', name: 'Rework', type: 'started' },
        updated_at: '2026-04-09T10:06:00.000Z'
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
          }),
          createTrackedIssue({
            id: 'lin-issue-2',
            identifier: 'CO-119',
            state: 'In Review',
            state_type: 'started',
            created_at: '2026-04-09T09:05:00.000Z'
          })
        ],
        claims: [
          createClaim({
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            issue_state: 'In Review',
            review_promotion: createReviewPromotion({
              status: 'action_required',
              action_required_reasons: ['review=REVIEW_REQUIRED']
            })
          }),
          createClaim({
            issue_id: 'lin-issue-2',
            issue_identifier: 'CO-119',
            issue_state: 'In Review',
            issue_updated_at: '2026-04-09T09:05:00.000Z',
            review_promotion: createReviewPromotion({
              issue_id: 'lin-issue-2',
              issue_identifier: 'CO-119',
              issue_state: 'In Review',
              status: 'action_required',
              action_required_reasons: ['review=CHANGES_REQUESTED', 'unresolved_threads=1']
            })
          })
        ],
        config: buildConfig(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:06:00.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalledWith({
      issueId: 'lin-issue-2',
      stateName: 'Rework',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-09T09:00:00.000Z',
      sourceSetup: null,
      env: expect.any(Object)
    });
    expect(result).toMatchObject({
      status: 'acted',
      actions: [
        {
          kind: 'review_handoff_rework',
          issue_identifier: 'CO-119',
          action_required_reasons: ['review=CHANGES_REQUESTED', 'unresolved_threads=1']
        }
      ],
      holds: []
    });
  });

  it('falls back to tracked issue identifiers when review-handoff claim identifiers are missing', async () => {
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
            issue_identifier: null as unknown as string,
            issue_state: 'In Review',
            review_promotion: createReviewPromotion({
              status: 'action_required',
              action_required_reasons: ['review=CHANGES_REQUESTED']
            })
          }),
          createClaim({
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            issue_state: 'In Review',
            review_promotion: createReviewPromotion({
              status: 'action_required',
              action_required_reasons: ['review=CHANGES_REQUESTED']
            })
          })
        ],
        config: buildConfig(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:06:00.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      stateName: 'Rework',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-09T09:00:00.000Z',
      sourceSetup: null,
      env: expect.any(Object)
    });
    expect(result).toMatchObject({
      status: 'acted',
      actions: [
        {
          kind: 'review_handoff_rework',
          issue_identifier: 'CO-118'
        }
      ]
    });
  });

  it('moves closed unmerged review handoffs to Rework even when the snapshot reason list is empty', async () => {
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-118',
        state: { id: 'rework', name: 'Rework', type: 'started' },
        updated_at: '2026-04-09T10:07:00.000Z'
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
              reason: 'pr_closed_unmerged',
              action_required_reasons: [],
              snapshot_state: 'CLOSED'
            })
          })
        ],
        config: buildConfig(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:07:00.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      stateName: 'Rework',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-09T09:00:00.000Z',
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
          action_required_reasons: ['pr_closed_unmerged']
        }
      ]
    });
  });

  it('records noop review handoff rework transitions so same-cycle consumers can refetch tracked issue truth', async () => {
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'noop' as const,
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-118',
        state: { id: 'rework', name: 'Rework', type: 'started' },
        updated_at: '2026-04-09T10:08:00.000Z'
      },
      previous_state: { id: 'rework', name: 'Rework', type: 'started' },
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
              action_required_reasons: ['review=CHANGES_REQUESTED']
            })
          })
        ],
        config: buildConfig(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:08:00.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'noop',
      actions: [
        {
          kind: 'review_handoff_rework',
          issue_identifier: 'CO-118',
          reason: 'author_action_required_rework_already_applied',
          action_required_reasons: ['review=CHANGES_REQUESTED'],
          transition: {
            status: 'noop',
            target_state: 'Rework'
          }
        }
      ],
      holds: [],
      pending_actions: []
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
          action_instance_id: expect.stringMatching(/^local_rollout:/),
          issue_identifier: 'CO-118',
          merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
          merge_closeout_reason: 'merged_and_transitioned_done',
          lifecycle_state: 'pending'
        }
      ],
      resolved_actions: [],
      lifecycle_records: []
    });
  });

  it('keeps acknowledged local rollout actions visible with durable lifecycle metadata', async () => {
    const claim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      })
    });
    const baseline = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfig(),
      previous_result: null
    });

    const action = baseline.pending_actions[0]!;
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfig(),
      previous_result: baseline,
      lifecycle_records: [
        {
          action_instance_id: action.action_instance_id,
          kind: 'local_rollout',
          issue_id: action.issue_id,
          issue_identifier: action.issue_identifier,
          state: 'acknowledged',
          actor: 'operator@example.com',
          reason: 'rollout is scheduled with the local operator',
          recorded_at: '2026-04-09T10:20:00.000Z',
          source: 'co-status'
        }
      ]
    });

    expect(result).toMatchObject({
      status: 'acted',
      pending_actions: [
        {
          action_instance_id: action.action_instance_id,
          issue_identifier: 'CO-118',
          lifecycle_state: 'acknowledged',
          lifecycle_actor: 'operator@example.com',
          lifecycle_reason: 'rollout is scheduled with the local operator',
          lifecycle_recorded_at: '2026-04-09T10:20:00.000Z'
        }
      ],
      resolved_actions: [],
      lifecycle_records: [
        {
          action_instance_id: action.action_instance_id,
          state: 'acknowledged',
          actor: 'operator@example.com'
        }
      ]
    });
  });

  it('suppresses cleared local rollout actions while preserving resolved audit metadata', async () => {
    const claim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      })
    });
    const baseline = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfig(),
      previous_result: null
    });
    const action = baseline.pending_actions[0]!;

    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfig(),
      previous_result: baseline,
      lifecycle_records: [
        {
          action_instance_id: action.action_instance_id,
          kind: 'local_rollout',
          issue_id: action.issue_id,
          issue_identifier: action.issue_identifier,
          state: 'cleared',
          actor: 'operator@example.com',
          reason: 'local rollout completed out of band',
          recorded_at: '2026-04-09T10:25:00.000Z',
          source: 'co-status'
        }
      ]
    });

    expect(result).toMatchObject({
      status: 'acted',
      pending_actions: [],
      resolved_actions: [
        {
          action_instance_id: action.action_instance_id,
          issue_identifier: 'CO-118',
          lifecycle_state: 'cleared',
          lifecycle_actor: 'operator@example.com',
          lifecycle_reason: 'local rollout completed out of band',
          lifecycle_recorded_at: '2026-04-09T10:25:00.000Z'
        }
      ],
      lifecycle_records: [
        {
          action_instance_id: action.action_instance_id,
          state: 'cleared'
        }
      ]
    });
  });

  it('suppresses dismissed local rollout actions while preserving resolved audit metadata', async () => {
    const claim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      })
    });
    const baseline = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfig(),
      previous_result: null
    });
    const action = baseline.pending_actions[0]!;

    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfig(),
      previous_result: baseline,
      lifecycle_records: [
        {
          action_instance_id: action.action_instance_id,
          kind: 'local_rollout',
          issue_id: action.issue_id,
          issue_identifier: action.issue_identifier,
          state: 'dismissed',
          actor: 'operator@example.com',
          reason: 'rollout reminder is not actionable',
          recorded_at: '2026-04-09T10:26:00.000Z',
          source: 'co-status'
        }
      ]
    });

    expect(result).toMatchObject({
      status: 'acted',
      pending_actions: [],
      resolved_actions: [
        {
          action_instance_id: action.action_instance_id,
          issue_identifier: 'CO-118',
          lifecycle_state: 'dismissed',
          lifecycle_actor: 'operator@example.com',
          lifecycle_reason: 'rollout reminder is not actionable',
          lifecycle_recorded_at: '2026-04-09T10:26:00.000Z'
        }
      ],
      lifecycle_records: [
        {
          action_instance_id: action.action_instance_id,
          state: 'dismissed',
          actor: 'operator@example.com',
          reason: 'rollout reminder is not actionable'
        }
      ]
    });
  });

  it('keeps terminal local rollout lifecycle records terminal after a stale acknowledge', async () => {
    const claim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      })
    });
    const baseline = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfig(),
      previous_result: null
    });
    const action = baseline.pending_actions[0]!;

    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfig(),
      previous_result: baseline,
      lifecycle_records: [
        {
          action_instance_id: action.action_instance_id,
          kind: 'local_rollout',
          issue_id: action.issue_id,
          issue_identifier: action.issue_identifier,
          state: 'cleared',
          actor: 'operator@example.com',
          reason: 'local rollout completed out of band',
          recorded_at: '2026-04-09T10:25:00.000Z',
          source: 'co-status'
        },
        {
          action_instance_id: action.action_instance_id,
          kind: 'local_rollout',
          issue_id: action.issue_id,
          issue_identifier: action.issue_identifier,
          state: 'acknowledged',
          actor: 'operator@example.com',
          reason: 'stale dashboard command after clear',
          recorded_at: '2026-04-09T10:26:00.000Z',
          source: 'co-status'
        }
      ]
    });

    expect(result).toMatchObject({
      status: 'acted',
      pending_actions: [],
      resolved_actions: [
        {
          action_instance_id: action.action_instance_id,
          issue_identifier: 'CO-118',
          lifecycle_state: 'cleared',
          lifecycle_actor: 'operator@example.com',
          lifecycle_reason: 'local rollout completed out of band',
          lifecycle_recorded_at: '2026-04-09T10:25:00.000Z'
        }
      ],
      lifecycle_records: [
        {
          action_instance_id: action.action_instance_id,
          state: 'cleared'
        },
        {
          action_instance_id: action.action_instance_id,
          state: 'acknowledged'
        }
      ]
    });
  });

  it('preserves lifecycle record append order across local rollout action ids', async () => {
    const firstClaim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done',
        recorded_at: '2026-04-09T09:15:00.000Z',
        head_oid: 'abc123'
      })
    });
    const secondClaim = createClaim({
      issue_id: 'lin-issue-2',
      issue_identifier: 'CO-119',
      merge_closeout: createMergeCloseout({
        issue_id: 'lin-issue-2',
        issue_identifier: 'CO-119',
        pr_number: 119,
        status: 'merged',
        reason: 'merged_and_transitioned_done',
        recorded_at: '2026-04-09T09:16:00.000Z',
        head_oid: 'def456'
      })
    });
    const baseline = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [firstClaim, secondClaim],
      config: buildConfig(),
      previous_result: null
    });
    const firstAction = baseline.pending_actions.find(
      (action) => action.issue_identifier === 'CO-118'
    )!;
    const secondAction = baseline.pending_actions.find(
      (action) => action.issue_identifier === 'CO-119'
    )!;
    const lifecycleRecords = [
      {
        action_instance_id: secondAction.action_instance_id,
        kind: 'local_rollout' as const,
        issue_id: secondAction.issue_id,
        issue_identifier: secondAction.issue_identifier,
        state: 'acknowledged' as const,
        actor: 'operator-b',
        reason: 'second action acknowledged first',
        recorded_at: '2026-04-09T10:20:00.000Z',
        source: 'co-status' as const
      },
      {
        action_instance_id: firstAction.action_instance_id,
        kind: 'local_rollout' as const,
        issue_id: firstAction.issue_id,
        issue_identifier: firstAction.issue_identifier,
        state: 'cleared' as const,
        actor: 'operator-a',
        reason: 'first action cleared second',
        recorded_at: '2026-04-09T10:21:00.000Z',
        source: 'co-status' as const
      },
      {
        action_instance_id: secondAction.action_instance_id,
        kind: 'local_rollout' as const,
        issue_id: secondAction.issue_id,
        issue_identifier: secondAction.issue_identifier,
        state: 'cleared' as const,
        actor: 'operator-b',
        reason: 'second action cleared third',
        recorded_at: '2026-04-09T10:22:00.000Z',
        source: 'co-status' as const
      }
    ];

    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [firstClaim, secondClaim],
      config: buildConfig(),
      previous_result: baseline,
      lifecycle_records: lifecycleRecords
    });

    expect(result.lifecycle_records.map((record) => record.recorded_at)).toEqual([
      '2026-04-09T10:20:00.000Z',
      '2026-04-09T10:21:00.000Z',
      '2026-04-09T10:22:00.000Z'
    ]);
    expect(result.resolved_actions).toHaveLength(2);
  });

  it('keeps a cleared local rollout suppressed when the same merge closeout is re-probed', async () => {
    const mergedAt = '2026-04-09T09:14:30.000Z';
    const oldClaim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done',
        recorded_at: '2026-04-09T09:15:00.000Z',
        merged_at: mergedAt,
        head_oid: 'abc123'
      })
    });
    const baseline = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [oldClaim],
      config: buildConfig(),
      previous_result: null
    });
    const oldAction = baseline.pending_actions[0]!;
    const reprobedClaim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done_after_recovery',
        recorded_at: '2026-04-09T11:15:00.000Z',
        merged_at: mergedAt,
        head_oid: 'abc123'
      })
    });

    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [reprobedClaim],
      config: buildConfig(),
      previous_result: baseline,
      lifecycle_records: [
        {
          action_instance_id: oldAction.action_instance_id,
          kind: 'local_rollout',
          issue_id: oldAction.issue_id,
          issue_identifier: oldAction.issue_identifier,
          state: 'cleared',
          actor: 'operator@example.com',
          reason: 'rollout handled after merge',
          recorded_at: '2026-04-09T10:25:00.000Z',
          source: 'co-status'
        }
      ]
    });

    expect(result.pending_actions).toEqual([]);
    expect(result.resolved_actions).toMatchObject([
      {
        action_instance_id: oldAction.action_instance_id,
        issue_identifier: 'CO-118',
        lifecycle_state: 'cleared',
        lifecycle_reason: 'rollout handled after merge'
      }
    ]);
    expect(result.lifecycle_records).toMatchObject([
      {
        action_instance_id: oldAction.action_instance_id,
        state: 'cleared'
      }
    ]);
  });

  it('keeps local rollout action identity stable when display identifiers and attachment lists churn', async () => {
    const oldClaim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done',
        recorded_at: '2026-04-09T09:15:00.000Z',
        merged_at: '2026-04-09T09:15:00.000Z',
        head_oid: 'abc123'
      })
    });
    const baseline = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [oldClaim],
      config: buildConfig(),
      previous_result: null
    });
    const oldAction = baseline.pending_actions[0]!;
    const reprobedCloseout = createMergeCloseout({
      status: 'merged',
      reason: 'merged_and_transitioned_done_after_recovery',
      recorded_at: '2026-04-09T11:15:00.000Z',
      merged_at: '2026-04-09T09:15:00.000Z',
      head_oid: 'abc123'
    });
    reprobedCloseout.attached_pr_urls = [
      ...reprobedCloseout.attached_pr_urls,
      'https://github.com/asabeko/CO/pull/999'
    ];

    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [
        createClaim({
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-999',
          merge_closeout: reprobedCloseout
        })
      ],
      config: buildConfig(),
      previous_result: baseline,
      lifecycle_records: [
        {
          action_instance_id: oldAction.action_instance_id,
          kind: 'local_rollout',
          issue_id: oldAction.issue_id,
          issue_identifier: oldAction.issue_identifier,
          state: 'cleared',
          actor: 'operator@example.com',
          reason: 'rollout handled after merge',
          recorded_at: '2026-04-09T10:25:00.000Z',
          source: 'co-status'
        }
      ]
    });

    expect(result.pending_actions).toEqual([]);
    expect(result.resolved_actions).toMatchObject([
      {
        action_instance_id: oldAction.action_instance_id,
        issue_identifier: 'CO-999',
        lifecycle_state: 'cleared'
      }
    ]);
  });

  it('does not suppress a new local rollout action instance with newer merge-closeout evidence', async () => {
    const oldClaim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done',
        recorded_at: '2026-04-09T09:15:00.000Z',
        head_oid: 'abc123'
      })
    });
    const baseline = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [oldClaim],
      config: buildConfig(),
      previous_result: null
    });
    const oldAction = baseline.pending_actions[0]!;
    const newClaim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done',
        recorded_at: '2026-04-09T11:15:00.000Z',
        head_oid: 'def456'
      })
    });

    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [newClaim],
      config: buildConfig(),
      previous_result: baseline,
      lifecycle_records: [
        {
          action_instance_id: oldAction.action_instance_id,
          kind: 'local_rollout',
          issue_id: oldAction.issue_id,
          issue_identifier: oldAction.issue_identifier,
          state: 'cleared',
          actor: 'operator@example.com',
          reason: 'old rollout handled',
          recorded_at: '2026-04-09T10:25:00.000Z',
          source: 'co-status'
        }
      ]
    });

    expect(result.pending_actions).toHaveLength(1);
    expect(result.pending_actions[0]).toMatchObject({
      issue_identifier: 'CO-118',
      merge_closeout_recorded_at: '2026-04-09T11:15:00.000Z',
      lifecycle_state: 'pending'
    });
    expect(result.pending_actions[0]?.action_instance_id).not.toBe(
      oldAction.action_instance_id
    );
    expect(result.resolved_actions).toEqual([]);
    expect(result.lifecycle_records).toEqual([]);
  });

  it('clears stale pending rollout actions when post-merge rollout is disabled', async () => {
    const config = buildConfig();
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [],
      config: {
        ...config,
        post_merge_rollout: {
          ...config.post_merge_rollout,
          enabled: false
        }
      },
      previous_result: {
        recorded_at: '2026-04-09T10:10:00.000Z',
        status: 'acted',
        summary: 'Surfaced 1 pending local rollout action (CO-118).',
        error: null,
        actions: [],
        holds: [],
        pending_actions: [
          {
            kind: 'local_rollout',
            action_instance_id: 'local_rollout:stale',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            summary: 'stale rollout reminder',
            merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
            merge_closeout_reason: 'merged_and_transitioned_done',
            shared_root_status: 'clean_main_fast_forwarded',
            linear_transition_status: 'transitioned',
            lifecycle_state: 'pending',
            lifecycle_actor: null,
            lifecycle_reason: null,
            lifecycle_recorded_at: null
          }
        ],
        resolved_actions: [],
        lifecycle_records: []
      }
    });

    expect(result).toMatchObject({
      status: 'noop',
      pending_actions: []
    });
  });

  it('clears stale pending rollout actions when no live merged closeout remains', async () => {
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [],
      config: buildConfig(),
      previous_result: {
        recorded_at: '2026-04-09T10:11:00.000Z',
        status: 'acted',
        summary: 'Surfaced 1 pending local rollout action (CO-118).',
        error: null,
        actions: [],
        holds: [],
        pending_actions: [
          {
            kind: 'local_rollout',
            action_instance_id: 'local_rollout:stale',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            summary: 'stale rollout reminder',
            merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
            merge_closeout_reason: 'merged_and_transitioned_done',
            shared_root_status: 'clean_main_fast_forwarded',
            linear_transition_status: 'transitioned',
            lifecycle_state: 'pending',
            lifecycle_actor: null,
            lifecycle_reason: null,
            lifecycle_recorded_at: null
          }
        ],
        resolved_actions: [],
        lifecycle_records: []
      }
    });

    expect(result).toMatchObject({
      status: 'noop',
      pending_actions: []
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
  issue_id?: string;
  issue_identifier?: string;
  issue_state?: string;
  pr_owner?: string;
  pr_repo?: string;
  pr_number?: number;
  status: 'watching' | 'action_required' | 'promoted' | 'promotion_failed' | 'transition_failed';
  action_required_reasons: string[];
  reason?: string;
  snapshot_state?: 'OPEN' | 'CLOSED';
}) {
  const issueId = input.issue_id ?? 'lin-issue-1';
  const issueIdentifier = input.issue_identifier ?? 'CO-118';
  const issueState = input.issue_state ?? 'In Review';
  const prOwner = input.pr_owner ?? 'asabeko';
  const prRepo = input.pr_repo ?? 'CO';
  const prNumber = input.pr_number ?? 118;
  const prUrl = `https://github.com/${prOwner}/${prRepo}/pull/${prNumber}`;
  return {
    recorded_at: '2026-04-09T09:05:00.000Z',
    issue_id: issueId,
    issue_identifier: issueIdentifier,
    issue_state: issueState,
    issue_state_type: 'started',
    issue_updated_at: '2026-04-09T09:05:00.000Z',
    status: input.status,
    reason:
      input.reason ??
      (input.status === 'action_required'
        ? 'review_handoff_promotion_blocked'
        : 'review_handoff_watching'),
    summary: 'review-handoff promotion test fixture',
    attached_pr_urls: [prUrl],
    ignored_historical_pr_urls: [],
    conflicting_attached_pr_urls: [],
    pr: {
      url: prUrl,
      owner: prOwner,
      repo: prRepo,
      number: prNumber
    },
    snapshot: {
      state: input.snapshot_state ?? 'OPEN',
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
  issue_id?: string;
  issue_identifier?: string;
  issue_state?: string;
  pr_owner?: string;
  pr_repo?: string;
  pr_number?: number;
  recorded_at?: string;
  merged_at?: string | null;
  head_oid?: string;
  status: 'watching' | 'action_required' | 'merged' | 'merge_failed' | 'transition_failed';
  reason: string;
}) {
  const issueId = input.issue_id ?? 'lin-issue-1';
  const issueIdentifier = input.issue_identifier ?? 'CO-118';
  const issueState = input.issue_state ?? 'Done';
  const prOwner = input.pr_owner ?? 'asabeko';
  const prRepo = input.pr_repo ?? 'CO';
  const prNumber = input.pr_number ?? 118;
  const prUrl = `https://github.com/${prOwner}/${prRepo}/pull/${prNumber}`;
  const recordedAt = input.recorded_at ?? '2026-04-09T09:15:00.000Z';
  return {
    recorded_at: recordedAt,
    issue_id: issueId,
    issue_identifier: issueIdentifier,
    issue_state: issueState,
    issue_state_type: 'completed',
    issue_updated_at: recordedAt,
    status: input.status,
    reason: input.reason,
    summary: 'merge closeout test fixture',
    attached_pr_urls: [prUrl],
    ignored_historical_pr_urls: [],
    conflicting_attached_pr_urls: [],
    pr: {
      url: prUrl,
      owner: prOwner,
      repo: prRepo,
      number: prNumber
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
      updated_at: recordedAt,
      merged_at: input.merged_at === undefined ? recordedAt : input.merged_at,
      head_oid: input.head_oid ?? 'abc123'
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
      issue_updated_at: recordedAt,
      error: null
    }
  };
}
