import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import {
  runProviderOperatorAutopilot,
  resolveProviderOperatorAutopilotConfig,
  type ProviderOperatorAutopilotConfig
} from '../src/cli/control/providerOperatorAutopilot.js';
import type { ProviderOperatorAutopilotLifecycleRecord } from '../src/cli/control/providerOperatorAutopilotLifecycle.js';
import {
  executeProviderOperatorAutopilotLocalRolloutActions,
  readProviderOperatorAutopilotLocalRolloutExecutionRecords,
  shouldUseShellForLocalRolloutCommand,
  type ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
} from '../src/cli/control/providerOperatorAutopilotLocalRolloutExecution.js';
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
      ],
      backlog_promotion_snapshots: [
        {
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          force_path_used: false,
          untracked_cycles: 0
        }
      ],
      backlog_promotion_snapshot_retention_records: []
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

  it('surfaces Blocked issues with only terminal blockers as duplicate-cleanup candidates when duplicate or canonical-owner evidence exists', async () => {
    const transitionIssueState = vi.fn(async () => {
      throw new Error('read-only terminal-blocker advisories must not transition issues');
    });

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-253',
            identifier: 'CO-253',
            state: 'Blocked',
            state_type: 'started',
            description:
              'codex-orchestrator:canonical-owner-key=blocked-terminal-blocker-cleanup-advisory',
            blocked_by: [
              {
                id: 'lin-issue-254',
                identifier: 'CO-254',
                state: 'Done',
                state_type: 'completed'
              }
            ],
            relations: [
              {
                direction: 'outbound',
                type: 'duplicate',
                issue: {
                  id: 'lin-issue-254',
                  identifier: 'CO-254',
                  state: 'Done',
                  state_type: 'completed'
                }
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
    expect(result.status).toBe('acted');
    expect(result.terminal_blocker_advisories).toMatchObject([
      {
        kind: 'terminal_blocker_cleanup',
        issue_id: 'lin-issue-253',
        issue_identifier: 'CO-253',
        issue_state: 'Blocked',
        issue_state_type: 'started',
        blockers: [
          {
            id: 'lin-issue-254',
            identifier: 'CO-254',
            state: 'Done',
            state_type: 'completed'
          }
        ],
        recommended_action: 'duplicate_cleanup',
        canonical_owner_hints: [
          'codex-orchestrator:canonical-owner-key=blocked-terminal-blocker-cleanup-advisory'
        ],
        duplicate_hints: ['outbound:duplicate:CO-254:Done']
      }
    ]);
    expect(result.summary).toContain('1 duplicate-cleanup, 0 ready-to-unblock');
  });

  it('surfaces Blocked issues with only terminal blockers as ready-to-unblock candidates when no duplicate evidence exists', async () => {
    const transitionIssueState = vi.fn(async () => {
      throw new Error('read-only terminal-blocker advisories must not transition issues');
    });

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-266',
            identifier: 'CO-266',
            state: 'Blocked',
            state_type: 'started',
            blocked_by: [
              {
                id: 'lin-issue-254',
                identifier: 'CO-254',
                state: 'Done',
                state_type: 'completed'
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
    expect(result.status).toBe('acted');
    expect(result.terminal_blocker_advisories).toMatchObject([
      {
        issue_id: 'lin-issue-266',
        issue_identifier: 'CO-266',
        recommended_action: 'ready_to_unblock',
        canonical_owner_hints: [],
        duplicate_hints: []
      }
    ]);
    expect(result.summary).toContain('0 duplicate-cleanup, 1 ready-to-unblock');
  });

  it('ignores unrelated canonical-owner markers as duplicate-cleanup evidence', async () => {
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [
        createTrackedIssue({
          id: 'lin-issue-266',
          identifier: 'CO-266',
          state: 'Blocked',
          state_type: 'started',
          description: 'codex-orchestrator:canonical-owner-key=unrelated-cleanup-owner',
          blocked_by: [
            {
              id: 'lin-issue-254',
              identifier: 'CO-254',
              state: 'Done',
              state_type: 'completed'
            }
          ]
        })
      ],
      claims: [],
      config: buildConfig(),
      previous_result: null
    });

    expect(result.terminal_blocker_advisories).toMatchObject([
      {
        issue_id: 'lin-issue-266',
        issue_identifier: 'CO-266',
        recommended_action: 'ready_to_unblock',
        canonical_owner_hints: [],
        duplicate_hints: []
      }
    ]);
    expect(result.summary).toContain('0 duplicate-cleanup, 1 ready-to-unblock');
  });

  it('does not treat non-duplicate relations to Duplicate-state blockers as duplicate-cleanup evidence', async () => {
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [
        createTrackedIssue({
          id: 'lin-issue-266',
          identifier: 'CO-266',
          state: 'Blocked',
          state_type: 'started',
          blocked_by: [
            {
              id: 'lin-issue-254',
              identifier: 'CO-254',
              state: 'Duplicate',
              state_type: 'canceled'
            }
          ],
          relations: [
            {
              direction: 'inbound',
              type: 'blocks',
              issue: {
                id: 'lin-issue-254',
                identifier: 'CO-254',
                state: 'Duplicate',
                state_type: 'canceled'
              }
            }
          ]
        })
      ],
      claims: [],
      config: buildConfig(),
      previous_result: null
    });

    expect(result.terminal_blocker_advisories).toMatchObject([
      {
        issue_id: 'lin-issue-266',
        issue_identifier: 'CO-266',
        recommended_action: 'ready_to_unblock',
        duplicate_hints: []
      }
    ]);
    expect(result.summary).toContain('0 duplicate-cleanup, 1 ready-to-unblock');
  });

  it('does not surface Blocked terminal-blocker advisories while any blocker remains non-terminal', async () => {
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [
        createTrackedIssue({
          id: 'lin-issue-267',
          identifier: 'CO-267',
          state: 'Blocked',
          state_type: 'started',
          blocked_by: [
            {
              id: 'lin-issue-254',
              identifier: 'CO-254',
              state: 'Done',
              state_type: 'completed'
            },
            {
              id: 'lin-issue-255',
              identifier: 'CO-255',
              state: 'In Progress',
              state_type: 'started'
            }
          ]
        })
      ],
      claims: [],
      config: buildConfig(),
      previous_result: null
    });

    expect(result.status).toBe('noop');
    expect(result.terminal_blocker_advisories).toEqual([]);
  });

  it('does not let terminal-looking state names override non-terminal blocker state types', async () => {
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [
        createTrackedIssue({
          id: 'lin-issue-267',
          identifier: 'CO-267',
          state: 'Blocked',
          state_type: 'started',
          blocked_by: [
            {
              id: 'lin-issue-254',
              identifier: 'CO-254',
              state: 'Done',
              state_type: 'started'
            }
          ]
        })
      ],
      claims: [],
      config: buildConfig(),
      previous_result: null
    });

    expect(result.status).toBe('noop');
    expect(result.terminal_blocker_advisories).toEqual([]);
  });

  it('does not surface Blocked terminal-blocker advisories when blocker relations are truncated', async () => {
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [
        createTrackedIssue({
          id: 'lin-issue-267',
          identifier: 'CO-267',
          state: 'Blocked',
          state_type: 'started',
          blocked_by_truncated: true,
          blocked_by: [
            {
              id: 'lin-issue-254',
              identifier: 'CO-254',
              state: 'Done',
              state_type: 'completed'
            }
          ]
        })
      ],
      claims: [],
      config: buildConfig(),
      previous_result: null
    });

    expect(result.status).toBe('noop');
    expect(result.terminal_blocker_advisories).toEqual([]);
  });

  it('surfaces ready-to-unblock terminal-blocker advisories when generic relations are truncated', async () => {
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [
        createTrackedIssue({
          id: 'lin-issue-267',
          identifier: 'CO-267',
          state: 'Blocked',
          state_type: 'started',
          relations_truncated: true,
          blocked_by: [
            {
              id: 'lin-issue-254',
              identifier: 'CO-254',
              state: 'Done',
              state_type: 'completed'
            }
          ]
        })
      ],
      claims: [],
      config: buildConfig(),
      previous_result: null
    });

    expect(result.status).toBe('acted');
    expect(result.terminal_blocker_advisories).toMatchObject([
      {
        issue_id: 'lin-issue-267',
        issue_identifier: 'CO-267',
        duplicate_hints: [],
        canonical_owner_hints: [],
        recommended_action: 'ready_to_unblock',
        summary: expect.stringContaining(
          'relation evidence may be truncated before duplicate hints are exhausted'
        )
      }
    ]);
  });

  it.each([
    {
      label: 'archived-only',
      archived_at: '2026-04-09T10:07:00.000Z',
      trashed: false
    },
    {
      label: 'trashed-only',
      archived_at: null,
      trashed: true
    },
    {
      label: 'archived-and-trashed',
      archived_at: '2026-04-09T10:07:00.000Z',
      trashed: true
    }
  ])('does not surface $label terminal-blocker advisories', async ({ archived_at, trashed }) => {
    const result = await runProviderOperatorAutopilot({
      tracked_issues: [
        createTrackedIssue({
          id: 'lin-issue-266',
          identifier: 'CO-266',
          state: 'Blocked',
          state_type: 'started',
          archived_at,
          trashed,
          blocked_by: [
            {
              id: 'lin-issue-254',
              identifier: 'CO-254',
              state: 'Done',
              state_type: 'completed'
            }
          ]
        })
      ],
      claims: [],
      config: buildConfig(),
      previous_result: null
    });

    expect(result.status).toBe('noop');
    expect(result.terminal_blocker_advisories).toEqual([]);
  });

  it('holds backlog promotion after an explicit Ready to Backlog demotion of the previously autopilot-promoted issue until a newer acknowledgement update appears', async () => {
    const baselineTransition = vi.fn(async () => ({
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
    const baseline = await runProviderOperatorAutopilot(
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
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: baselineTransition
      }
    );

    const transitionIssueState = vi.fn(async () => {
      throw new Error('transition should not run while an explicit manual demotion remains unacknowledged');
    });

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Backlog',
            state_type: 'backlog',
            updated_at: '2026-04-09T10:10:00.000Z',
            recent_activity: [
              {
                id: 'hist-1',
                created_at: '2026-04-09T10:10:00.000Z',
                actor_name: 'Operator Example',
                summary: 'State Ready -> Backlog'
              }
            ]
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: baseline
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
          issue_state: 'Backlog',
          issue_state_type: 'backlog',
          issue_updated_at: '2026-04-09T10:10:00.000Z',
          promotion_attempted_at: '2026-04-09T10:00:00.000Z',
          promotion_issue_updated_at: '2026-04-09T10:00:00.000Z',
          force_path_used: false,
          reason: 'backlog_head_manual_demotion_unacknowledged'
        }
      ]
    });
    expect(result.holds[0]?.summary).toContain('Ready -> Backlog');
    expect(result.holds[0]?.summary).toContain('autopilot last promoted it at 2026-04-09T10:00:00.000Z');
  });

  it('keeps the same manual-demotion hold active across consecutive autopilot cycles until a newer acknowledgement update appears', async () => {
    const baselineTransition = vi.fn(async () => ({
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
    const baseline = await runProviderOperatorAutopilot(
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
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: baselineTransition
      }
    );

    const holdTransition = vi.fn(async () => {
      throw new Error('transition should not run while the same manual demotion remains unacknowledged');
    });
    const manualDemotionSnapshot = [
      createTrackedIssue({
        id: 'lin-issue-1',
        identifier: 'CO-118',
        state: 'Backlog',
        state_type: 'backlog',
        updated_at: '2026-04-09T10:10:00.000Z',
        recent_activity: [
          {
            id: 'hist-1',
            created_at: '2026-04-09T10:10:00.000Z',
            actor_name: 'Operator Example',
            summary: 'State Ready -> Backlog'
          }
        ]
      })
    ];
    const firstHold = await runProviderOperatorAutopilot(
      {
        tracked_issues: manualDemotionSnapshot,
        claims: [],
        config: buildConfig(),
        previous_result: baseline
      },
      {
        transition_issue_state: holdTransition
      }
    );
    const secondHold = await runProviderOperatorAutopilot(
      {
        tracked_issues: manualDemotionSnapshot,
        claims: [],
        config: buildConfig(),
        previous_result: firstHold
      },
      {
        now: () => '2026-04-09T10:11:00.000Z',
        transition_issue_state: holdTransition
      }
    );

    expect(holdTransition).not.toHaveBeenCalled();
    expect(firstHold.holds[0]).toMatchObject({
      promotion_attempted_at: '2026-04-09T10:00:00.000Z',
      promotion_issue_updated_at: '2026-04-09T10:00:00.000Z',
      reason: 'backlog_head_manual_demotion_unacknowledged'
    });
    expect(secondHold).toMatchObject({
      status: 'noop',
      actions: [],
      holds: [
        {
          kind: 'backlog_promotion',
          issue_identifier: 'CO-118',
          promotion_attempted_at: '2026-04-09T10:00:00.000Z',
          promotion_issue_updated_at: '2026-04-09T10:00:00.000Z',
          reason: 'backlog_head_manual_demotion_unacknowledged'
        }
      ]
    });
  });

  it('holds manual demotion even after an intervening no-op cycle overwrites the latest action list', async () => {
    const baselineTransition = vi.fn(async () => ({
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
    const baseline = await runProviderOperatorAutopilot(
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
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: baselineTransition
      }
    );

    const noOpCycle = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Ready',
            state_type: 'unstarted',
            updated_at: '2026-04-09T10:00:00.000Z'
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: baseline
      },
      {
        now: () => '2026-04-09T10:05:00.000Z'
      }
    );

    expect(noOpCycle).toMatchObject({
      status: 'noop',
      actions: [],
      holds: [],
      backlog_promotion_snapshots: [
        {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T10:00:00.000Z',
          issue_updated_at: '2026-04-09T10:00:00.000Z',
          force_path_used: false,
          untracked_cycles: 0
        }
      ],
      backlog_promotion_snapshot_retention_records: []
    });

    const transitionIssueState = vi.fn(async () => {
      throw new Error('transition should not run after a remembered promotion is manually demoted');
    });
    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Backlog',
            state_type: 'backlog',
            updated_at: '2026-04-09T10:10:00.000Z',
            recent_activity: [
              {
                id: 'hist-1',
                created_at: '2026-04-09T10:10:00.000Z',
                actor_name: 'Operator Example',
                summary: 'State Ready -> Backlog'
              }
            ]
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: noOpCycle
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
          reason: 'backlog_head_manual_demotion_unacknowledged',
          promotion_attempted_at: '2026-04-09T10:00:00.000Z',
          promotion_issue_updated_at: '2026-04-09T10:00:00.000Z'
        }
      ],
      backlog_promotion_snapshots: [
        {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T10:00:00.000Z',
          issue_updated_at: '2026-04-09T10:00:00.000Z',
          force_path_used: false,
          untracked_cycles: 0
        }
      ],
      backlog_promotion_snapshot_retention_records: []
    });
  });

  it('holds manual demotion after an intervening cycle temporarily omits the promoted issue from tracked results', async () => {
    const baselineTransition = vi.fn(async () => ({
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
    const baseline = await runProviderOperatorAutopilot(
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
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: baselineTransition
      }
    );

    const untrackedCycle = await runProviderOperatorAutopilot(
      {
        tracked_issues: [],
        claims: [],
        config: buildConfig(),
        previous_result: baseline
      },
      {
        now: () => '2026-04-09T10:05:00.000Z'
      }
    );

    expect(untrackedCycle).toMatchObject({
      status: 'noop',
      actions: [],
      holds: [],
      backlog_promotion_snapshots: [
        {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T10:00:00.000Z',
          issue_updated_at: '2026-04-09T10:00:00.000Z',
          force_path_used: false,
          untracked_cycles: 1
        }
      ],
      backlog_promotion_snapshot_retention_records: [
        {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T10:00:00.000Z',
          issue_updated_at: '2026-04-09T10:00:00.000Z',
          evaluated_at: '2026-04-09T10:05:00.000Z',
          decision: 'retained',
          reason: 'temporarily_untracked',
          age_ms: 300000,
          untracked_cycles: 1,
          max_untracked_cycles: 3,
          issue_state: null,
          issue_state_type: null,
          issue_observed_updated_at: null,
          terminal_state_evidence: false,
          force_path_used: false
        }
      ]
    });

    const transitionIssueState = vi.fn(async () => {
      throw new Error('transition should not run after a temporarily untracked promotion is demoted');
    });
    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Backlog',
            state_type: 'backlog',
            updated_at: '2026-04-09T10:10:00.000Z',
            recent_activity: [
              {
                id: 'hist-1',
                created_at: '2026-04-09T10:10:00.000Z',
                actor_name: 'Operator Example',
                summary: 'State Ready -> Backlog'
              }
            ]
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: untrackedCycle
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
          reason: 'backlog_head_manual_demotion_unacknowledged',
          promotion_attempted_at: '2026-04-09T10:00:00.000Z',
          promotion_issue_updated_at: '2026-04-09T10:00:00.000Z'
        }
      ]
    });
  });

  it('preserves the original promotion timestamp when another hold masks a manual demotion for one cycle', async () => {
    const baselineTransition = vi.fn(async () => ({
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
    const baseline = await runProviderOperatorAutopilot(
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
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: baselineTransition
      }
    );
    const demotedBlockedIssue = createTrackedIssue({
      id: 'lin-issue-1',
      identifier: 'CO-118',
      state: 'Backlog',
      state_type: 'backlog',
      updated_at: '2026-04-09T10:10:00.000Z',
      blocked_by: [
        {
          id: 'lin-issue-0',
          identifier: 'CO-117',
          state: 'In Progress',
          state_type: 'started'
        }
      ],
      recent_activity: [
        {
          id: 'hist-1',
          created_at: '2026-04-09T10:10:00.000Z',
          actor_name: 'Operator Example',
          summary: 'State Ready -> Backlog'
        }
      ]
    });
    const blockedTransition = vi.fn(async () => {
      throw new Error('transition should not run while the demoted issue is blocked');
    });
    const blockedCycle = await runProviderOperatorAutopilot(
      {
        tracked_issues: [demotedBlockedIssue],
        claims: [],
        config: buildConfig(),
        previous_result: baseline
      },
      {
        now: () => '2026-04-09T10:10:30.000Z',
        transition_issue_state: blockedTransition
      }
    );

    expect(blockedTransition).not.toHaveBeenCalled();
    expect(blockedCycle).toMatchObject({
      holds: [{ reason: 'backlog_head_blocked_by_non_terminal' }],
      backlog_promotion_snapshots: [
        {
          issue_identifier: 'CO-118',
          issue_updated_at: '2026-04-09T10:00:00.000Z',
          untracked_cycles: 0
        }
      ]
    });

    const clearedDemotionIssue = {
      ...demotedBlockedIssue,
      blocked_by: []
    };
    const clearedTransition = vi.fn(async () => {
      throw new Error('transition should not run after the blocker clears');
    });
    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [clearedDemotionIssue],
        claims: [],
        config: buildConfig(),
        previous_result: blockedCycle
      },
      {
        now: () => '2026-04-09T10:11:00.000Z',
        transition_issue_state: clearedTransition
      }
    );

    expect(clearedTransition).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      holds: [
        {
          reason: 'backlog_head_manual_demotion_unacknowledged',
          promotion_issue_updated_at: '2026-04-09T10:00:00.000Z'
        }
      ]
    });
  });

  it('prunes permanently untracked backlog promotion snapshots after the bounded retention cycle limit', async () => {
    const baselineTransition = vi.fn(async () => ({
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
    const baseline = await runProviderOperatorAutopilot(
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
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: baselineTransition
      }
    );

    const firstMissingCycle = await runProviderOperatorAutopilot(
      {
        tracked_issues: [],
        claims: [],
        config: buildConfig(),
        previous_result: baseline
      },
      {
        now: () => '2026-04-09T10:05:00.000Z'
      }
    );
    const secondMissingCycle = await runProviderOperatorAutopilot(
      {
        tracked_issues: [],
        claims: [],
        config: buildConfig(),
        previous_result: firstMissingCycle
      },
      {
        now: () => '2026-04-09T10:10:00.000Z'
      }
    );
    const prunedCycle = await runProviderOperatorAutopilot(
      {
        tracked_issues: [],
        claims: [],
        config: buildConfig(),
        previous_result: secondMissingCycle
      },
      {
        now: () => '2026-04-09T10:15:00.000Z'
      }
    );

    expect(firstMissingCycle.backlog_promotion_snapshots).toMatchObject([
      {
        issue_identifier: 'CO-118',
        untracked_cycles: 1
      }
    ]);
    expect(secondMissingCycle.backlog_promotion_snapshots).toMatchObject([
      {
        issue_identifier: 'CO-118',
        untracked_cycles: 2
      }
    ]);
    expect(prunedCycle).toMatchObject({
      status: 'noop',
      actions: [],
      holds: [],
      backlog_promotion_snapshots: [],
      backlog_promotion_snapshot_retention_records: [
        {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T10:00:00.000Z',
          issue_updated_at: '2026-04-09T10:00:00.000Z',
          evaluated_at: '2026-04-09T10:15:00.000Z',
          decision: 'pruned',
          reason: 'stale_untracked_cycle_limit',
          age_ms: 900000,
          untracked_cycles: 3,
          max_untracked_cycles: 3,
          issue_state: null,
          issue_state_type: null,
          issue_observed_updated_at: null,
          terminal_state_evidence: false,
          force_path_used: false
        }
      ]
    });
  });

  it('prunes backlog promotion snapshots when tracked terminal state evidence is present', async () => {
    const baselineTransition = vi.fn(async () => ({
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
    const baseline = await runProviderOperatorAutopilot(
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
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: baselineTransition
      }
    );

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Done',
            state_type: 'started',
            updated_at: '2026-04-09T10:08:00.000Z'
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: baseline
      },
      {
        now: () => '2026-04-09T10:08:30.000Z'
      }
    );

    expect(result).toMatchObject({
      status: 'noop',
      actions: [],
      holds: [],
      backlog_promotion_snapshots: [],
      backlog_promotion_snapshot_retention_records: [
        {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T10:00:00.000Z',
          issue_updated_at: '2026-04-09T10:00:00.000Z',
          evaluated_at: '2026-04-09T10:08:30.000Z',
          decision: 'pruned',
          reason: 'terminal_state',
          age_ms: 510000,
          untracked_cycles: 0,
          max_untracked_cycles: 3,
          issue_state: 'Done',
          issue_state_type: 'started',
          issue_observed_updated_at: '2026-04-09T10:08:00.000Z',
          terminal_state_evidence: true,
          force_path_used: false
        }
      ]
    });
  });

  it.each([
    {
      label: 'archived-only',
      archivedAt: '2026-04-09T10:07:00.000Z',
      trashed: false
    },
    {
      label: 'trashed-only',
      archivedAt: null,
      trashed: true
    },
    {
      label: 'archived-and-trashed',
      archivedAt: '2026-04-09T10:07:00.000Z',
      trashed: true
    }
  ])(
    'prunes tracked $label backlog promotion snapshots before resetting missing cycles',
    async ({ archivedAt, trashed }) => {
    const baselineTransition = vi.fn(async () => ({
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
    const baseline = await runProviderOperatorAutopilot(
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
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: baselineTransition
      }
    );

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Ready',
            state_type: 'unstarted',
            archived_at: archivedAt,
            trashed,
            updated_at: '2026-04-09T10:08:00.000Z'
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: {
          ...baseline,
          backlog_promotion_snapshots: baseline.backlog_promotion_snapshots?.map((snapshot) => ({
            ...snapshot,
            untracked_cycles: 2
          }))
        }
      },
      {
        now: () => '2026-04-09T10:08:30.000Z'
      }
    );

    expect(result).toMatchObject({
      status: 'noop',
      actions: [],
      holds: [],
      backlog_promotion_snapshots: [],
      backlog_promotion_snapshot_retention_records: [
        {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T10:00:00.000Z',
          issue_updated_at: '2026-04-09T10:00:00.000Z',
          evaluated_at: '2026-04-09T10:08:30.000Z',
          decision: 'pruned',
          reason: 'tracked_archived_or_trashed',
          age_ms: 510000,
          untracked_cycles: 0,
          max_untracked_cycles: 3,
          issue_state: 'Ready',
          issue_state_type: 'unstarted',
          issue_archived_at: archivedAt,
          issue_trashed: trashed,
          issue_observed_updated_at: '2026-04-09T10:08:00.000Z',
          terminal_state_evidence: false,
          force_path_used: false
        }
      ]
    });
  });

  it('prunes archived snapshots and ignores legacy pruned demotion holds as future snapshot sources', async () => {
    const baselineTransition = vi.fn(async () => ({
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
    const baseline = await runProviderOperatorAutopilot(
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
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: baselineTransition
      }
    );
    const transitionIssueState = vi.fn(async () => {
      throw new Error('transition should not run for archived backlog issues');
    });

    const result = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Backlog',
            state_type: 'backlog',
            archived_at: '2026-04-09T10:07:00.000Z',
            trashed: true,
            updated_at: '2026-04-09T10:08:00.000Z',
            recent_activity: [
              {
                id: 'hist-1',
                created_at: '2026-04-09T10:08:00.000Z',
                actor_name: 'Operator Example',
                summary: 'State Ready -> Backlog'
              }
            ]
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: baseline
      },
      {
        now: () => '2026-04-09T10:08:30.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'noop',
      holds: [],
      backlog_promotion_snapshots: [],
      backlog_promotion_snapshot_retention_records: [
        {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          target_state: 'Ready',
          attempted_at: '2026-04-09T10:00:00.000Z',
          issue_updated_at: '2026-04-09T10:00:00.000Z',
          evaluated_at: '2026-04-09T10:08:30.000Z',
          decision: 'pruned',
          reason: 'tracked_archived_or_trashed',
          age_ms: 510000,
          untracked_cycles: 0,
          max_untracked_cycles: 3,
          issue_state: 'Backlog',
          issue_state_type: 'backlog',
          issue_archived_at: '2026-04-09T10:07:00.000Z',
          issue_trashed: true,
          issue_observed_updated_at: '2026-04-09T10:08:00.000Z',
          terminal_state_evidence: false,
          force_path_used: false
        }
      ]
    });

    const legacyResultWithPrunedHold = {
      ...result,
      holds: [
        {
          kind: 'backlog_promotion' as const,
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          issue_state: 'Backlog',
          issue_state_type: 'backlog',
          issue_updated_at: '2026-04-09T10:08:00.000Z',
          promotion_attempted_at: '2026-04-09T10:00:00.000Z',
          promotion_issue_updated_at: '2026-04-09T10:00:00.000Z',
          force_path_used: false,
          reason: 'backlog_head_manual_demotion_unacknowledged',
          summary: 'Legacy pruned archived demotion hold.',
          action_required_reasons: []
        }
      ]
    };
    const nextCycle = await runProviderOperatorAutopilot(
      {
        tracked_issues: [
          createTrackedIssue({
            id: 'lin-issue-1',
            identifier: 'CO-118',
            state: 'Backlog',
            state_type: 'backlog',
            archived_at: '2026-04-09T10:07:00.000Z',
            trashed: true,
            updated_at: '2026-04-09T10:09:00.000Z'
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: legacyResultWithPrunedHold
      },
      {
        now: () => '2026-04-09T10:09:30.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).not.toHaveBeenCalled();
    expect(nextCycle).toMatchObject({
      status: 'noop',
      actions: [],
      holds: [],
      backlog_promotion_snapshots: [],
      backlog_promotion_snapshot_retention_records: []
    });
  });

  it('still promotes backlog heads when a Ready to Backlog history entry has no matching previous autopilot promotion snapshot', async () => {
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-118',
        state: { id: 'ready', name: 'Ready', type: 'unstarted' },
        updated_at: '2026-04-09T10:10:30.000Z'
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
            state_type: 'backlog',
            updated_at: '2026-04-09T10:10:00.000Z',
            recent_activity: [
              {
                id: 'hist-1',
                created_at: '2026-04-09T10:10:00.000Z',
                actor_name: 'Operator Example',
                summary: 'State Ready -> Backlog'
              }
            ]
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:10:30.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      stateName: 'Ready',
      expectedStateName: 'Backlog',
      expectedStateType: 'backlog',
      expectedUpdatedAt: '2026-04-09T10:10:00.000Z',
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
      ],
      holds: []
    });
  });

  it('re-promotes the backlog head after a newer acknowledgement update follows an explicit Ready to Backlog demotion of the previously autopilot-promoted issue', async () => {
    const baselineTransition = vi.fn(async () => ({
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
    const baseline = await runProviderOperatorAutopilot(
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
        now: () => '2026-04-09T10:00:00.000Z',
        transition_issue_state: baselineTransition
      }
    );

    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-118',
        state: { id: 'ready', name: 'Ready', type: 'unstarted' },
        updated_at: '2026-04-09T10:12:30.000Z'
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
            state_type: 'backlog',
            updated_at: '2026-04-09T10:12:00.000Z',
            recent_activity: [
              {
                id: 'hist-ack',
                created_at: '2026-04-09T10:12:00.000Z',
                actor_name: 'Operator Example',
                summary: 'Title updated'
              },
              {
                id: 'hist-demote',
                created_at: '2026-04-09T10:10:00.000Z',
                actor_name: 'Operator Example',
                summary: 'State Ready -> Backlog'
              }
            ]
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: baseline
      },
      {
        now: () => '2026-04-09T10:12:30.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      stateName: 'Ready',
      expectedStateName: 'Backlog',
      expectedStateType: 'backlog',
      expectedUpdatedAt: '2026-04-09T10:12:00.000Z',
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
            force_path_used: false
          }
        }
      ],
      holds: []
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

  it.each([
    {
      label: 'archived-only',
      archivedAt: '2026-04-09T10:07:00.000Z',
      trashed: false
    },
    {
      label: 'trashed-only',
      archivedAt: null,
      trashed: true
    },
    {
      label: 'archived-and-trashed',
      archivedAt: '2026-04-09T10:07:00.000Z',
      trashed: true
    }
  ])(
    'ignores immutable $label higher-ranked blocked lanes before promoting a mutable backlog issue',
    async ({ archivedAt, trashed }) => {
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-issue-2',
        identifier: 'CO-118',
        state: { id: 'ready', name: 'Ready', type: 'unstarted' },
        updated_at: '2026-04-09T10:12:30.000Z'
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
            identifier: 'CO-117',
            state: 'Ready',
            state_type: 'unstarted',
            priority: 1,
            archived_at: archivedAt,
            trashed,
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
            priority: 2,
            updated_at: '2026-04-09T10:12:00.000Z'
          })
        ],
        claims: [],
        config: buildConfig(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:12:30.000Z',
        transition_issue_state: transitionIssueState
      }
    );

    expect(transitionIssueState).toHaveBeenCalledWith({
      issueId: 'lin-issue-2',
      stateName: 'Ready',
      expectedStateName: 'Backlog',
      expectedStateType: 'backlog',
      expectedUpdatedAt: '2026-04-09T10:12:00.000Z',
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
      ],
      holds: []
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

  it('executes enabled local rollout actions and clears the pending action through lifecycle metadata', async () => {
    const lifecycleRecords: ProviderOperatorAutopilotLifecycleRecord[] = [];
    const executionRecords: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[] = [];
    const runCommand = vi.fn(async () => ({
      ok: true,
      exitCode: 0,
      stdout: 'rebuilt\n',
      stderr: ''
    }));

    const result = await runProviderOperatorAutopilot(
      {
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
        config: buildConfigWithLocalRolloutExecution(),
        previous_result: null,
        repo_root: process.cwd()
      },
      {
        now: makeNowSequence([
          '2026-04-09T10:00:00.000Z',
          '2026-04-09T10:00:01.000Z',
          '2026-04-09T10:00:02.000Z',
          '2026-04-09T10:00:03.000Z'
        ]),
        run_local_rollout_command: runCommand,
        append_local_rollout_execution_attempt: async (record) => {
          executionRecords.push(record);
        },
        append_local_rollout_lifecycle_record: async (record) => {
          lifecycleRecords.push(record);
        }
      }
    );

    expect(runCommand).toHaveBeenCalledWith({
      command: 'npm',
      args: ['run', 'rollout:local'],
      cwd: process.cwd(),
      timeoutMs: 15000
    });
    expect(executionRecords).toMatchObject([
      {
        record_kind: 'started',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_interrupted'
      },
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'succeeded',
        reason: null
      }
    ]);
    expect(lifecycleRecords).toMatchObject([
      {
        state: 'cleared',
        actor: 'operator-autopilot',
        source: 'operator-autopilot',
        reason: 'unattended local rollout actions succeeded: local-rebuild'
      }
    ]);
    expect(result).toMatchObject({
      status: 'acted',
      pending_actions: [],
      resolved_actions: [
        {
          issue_identifier: 'CO-118',
          lifecycle_state: 'cleared',
          lifecycle_actor: 'operator-autopilot'
        }
      ],
      local_rollout_execution_attempts: [
        {
          record_kind: 'started',
          action_id: 'local-rebuild',
          terminal_state: 'failed',
          preflight: { status: 'passed', reason: null },
          reason: 'execution_interrupted'
        },
        {
          record_kind: 'terminal',
          action_id: 'local-rebuild',
          terminal_state: 'succeeded',
          preflight: { status: 'passed', reason: null }
        }
      ]
    });
  });

  it('fails closed without launching local rollout execution when repo_root is missing', async () => {
    const runCommand = vi.fn(async () => ({
      ok: true,
      exitCode: 0,
      stdout: 'rebuilt\n',
      stderr: ''
    }));

    const result = await runProviderOperatorAutopilot(
      {
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
        config: buildConfigWithLocalRolloutExecution(),
        previous_result: null
      },
      {
        now: () => '2026-04-09T10:00:00.000Z',
        run_local_rollout_command: runCommand,
        append_local_rollout_execution_attempt: appendExecutionAttemptNoop,
        append_local_rollout_lifecycle_record: appendLifecycleRecordNoop
      }
    );

    expect(runCommand).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'failed',
      summary: 'Local rollout execution is enabled but repo_root was not provided.',
      error: 'missing_repo_root',
      local_rollout_execution_attempts: []
    });
    expect(result.pending_actions).toHaveLength(1);
  });

  it('passes npm_script rollout args after npm separator', async () => {
    const runCommand = vi.fn(async () => ({
      ok: true,
      exitCode: 0,
      stdout: 'ok',
      stderr: ''
    }));

    await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [
          {
            kind: 'local_rollout',
            action_instance_id: 'local_rollout:npm-args',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            summary: 'pending rollout',
            merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
            merge_closeout_reason: 'merged_and_transitioned_done',
            shared_root_status: 'reconciled',
            linear_transition_status: 'transitioned',
            executable_action_ids: ['local-rebuild'],
            lifecycle_state: 'pending',
            lifecycle_actor: null,
            lifecycle_reason: null,
            lifecycle_recorded_at: null
          }
        ],
        config: buildConfigWithLocalRolloutExecution({
          args: ['--target', 'control-host']
        }).post_merge_rollout.execution,
        repoRoot: process.cwd()
      },
      {
        runCommand,
        appendExecutionAttempt: appendExecutionAttemptNoop,
        appendLifecycleRecord: appendLifecycleRecordNoop
      }
    );

    expect(runCommand).toHaveBeenCalledWith({
      command: 'npm',
      args: ['run', 'rollout:local', '--', '--target', 'control-host'],
      cwd: process.cwd(),
      timeoutMs: 15000
    });
  });

  it('deduplicates duplicate local rollout action ids before launching commands and clearing lifecycle', async () => {
    const runCommand = vi.fn(async () => ({
      ok: true,
      exitCode: 0,
      stdout: 'rebuilt\n',
      stderr: ''
    }));

    const outcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [
          {
            kind: 'local_rollout',
            action_instance_id: 'local_rollout:duplicate-actions',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            summary: 'pending rollout',
            merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
            merge_closeout_reason: 'merged_and_transitioned_done',
            shared_root_status: 'reconciled',
            linear_transition_status: 'transitioned',
            executable_action_ids: ['local-rebuild', 'local-rebuild'],
            lifecycle_state: 'pending',
            lifecycle_actor: null,
            lifecycle_reason: null,
            lifecycle_recorded_at: null
          }
        ],
        config: buildConfigWithLocalRolloutExecution().post_merge_rollout.execution,
        repoRoot: process.cwd()
      },
      {
        runCommand,
        appendExecutionAttempt: appendExecutionAttemptNoop,
        appendLifecycleRecord: appendLifecycleRecordNoop
      }
    );

    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(outcome.attempts.filter((attempt) => attempt.record_kind === 'terminal')).toMatchObject([
      {
        action_id: 'local-rebuild',
        terminal_state: 'succeeded'
      }
    ]);
    expect(outcome.lifecycle_records).toMatchObject([
      {
        action_instance_id: 'local_rollout:duplicate-actions',
        state: 'cleared',
        reason: 'unattended local rollout actions succeeded: local-rebuild'
      }
    ]);
  });

  it('fails closed when local rollout supported_platforms contains invalid platform names', async () => {
    const runCommand = vi.fn(async () => {
      throw new Error('invalid platform config should skip before command execution');
    });

    const config = resolveProviderOperatorAutopilotConfig({
      operator_autopilot: {
        enabled: true,
        post_merge_rollout: {
          enabled: true,
          summary: 'Merge closeout completed; local rollout follow-up may still be required.',
          execution: {
            enabled: true,
            actions: [
              {
                id: 'local-rebuild',
                enabled: true,
                order: 10,
                runner: 'npm_script',
                args: [],
                script: 'rollout:local',
                timeout_ms: 15000,
                require_clean_repo: false,
                supported_platforms: ['macos']
              }
            ]
          }
        }
      }
    });

    const result = await runProviderOperatorAutopilot(
      {
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
        config,
        previous_result: null,
        repo_root: process.cwd()
      },
      {
        run_local_rollout_command: runCommand,
        append_local_rollout_execution_attempt: appendExecutionAttemptNoop
      }
    );

    expect(runCommand).not.toHaveBeenCalled();
    expect(result.resolved_actions).toEqual([]);
    expect(result.pending_actions).toHaveLength(1);
    expect(result.local_rollout_execution_attempts).toMatchObject([
      {
        action_id: 'local-rebuild',
        terminal_state: 'skipped',
        reason: 'unsupported_host',
        preflight: {
          status: 'skipped',
          reason: 'unsupported_host',
          summary:
            'Local rollout action local-rebuild has unsupported platform entries: macos.'
        }
      }
    ]);
  });

  it('fails closed when local rollout supported_platforms contains malformed entries', async () => {
    const runCommand = vi.fn(async () => {
      throw new Error('malformed platform config should skip before command execution');
    });

    const config = resolveProviderOperatorAutopilotConfig({
      operator_autopilot: {
        enabled: true,
        post_merge_rollout: {
          enabled: true,
          summary: 'Merge closeout completed; local rollout follow-up may still be required.',
          execution: {
            enabled: true,
            actions: [
              {
                id: 'local-rebuild',
                enabled: true,
                order: 10,
                runner: 'npm_script',
                args: [],
                script: 'rollout:local',
                timeout_ms: 15000,
                require_clean_repo: false,
                supported_platforms: [null, '']
              }
            ]
          }
        }
      }
    });

    const result = await runProviderOperatorAutopilot(
      {
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
        config,
        previous_result: null,
        repo_root: process.cwd()
      },
      {
        run_local_rollout_command: runCommand,
        append_local_rollout_execution_attempt: appendExecutionAttemptNoop
      }
    );

    expect(runCommand).not.toHaveBeenCalled();
    expect(result.resolved_actions).toEqual([]);
    expect(result.pending_actions).toHaveLength(1);
    expect(result.local_rollout_execution_attempts).toMatchObject([
      {
        action_id: 'local-rebuild',
        terminal_state: 'skipped',
        reason: 'unsupported_host',
        preflight: {
          status: 'skipped',
          reason: 'unsupported_host',
          summary:
            'Local rollout action local-rebuild has unsupported platform entries: null, <blank>.'
        }
      }
    ]);
  });

  it('keeps a skipped local rollout action pending with durable preflight reason text', async () => {
    const runCommand = vi.fn(async (request: { command: string; args: string[] }) => {
      if (request.command === 'git' && request.args.includes('status')) {
        return {
          ok: true,
          exitCode: 0,
          stdout: ' M package.json\n',
          stderr: ''
        };
      }
      throw new Error('rollout command should not run after dirty repo preflight');
    });

    const result = await runProviderOperatorAutopilot(
      {
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
        config: buildConfigWithLocalRolloutExecution({ require_clean_repo: true }),
        previous_result: null,
        repo_root: process.cwd()
      },
      {
        run_local_rollout_command: runCommand,
        append_local_rollout_execution_attempt: appendExecutionAttemptNoop
      }
    );

    expect(result.pending_actions).toHaveLength(1);
    expect(result.resolved_actions).toEqual([]);
    expect(result.local_rollout_execution_attempts).toMatchObject([
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'skipped',
        reason: 'dirty_repo',
        preflight: {
          status: 'skipped',
          reason: 'dirty_repo',
          summary: 'Local rollout action local-rebuild requires a clean repository.'
        }
      }
    ]);
  });

  it('records git cleanliness probe failures as command_failed preflight failures', async () => {
    const runCommand = vi.fn(async (request: { command: string; args: string[] }) => {
      if (request.command === 'git' && request.args.includes('status')) {
        return {
          ok: false,
          exitCode: 128,
          stdout: ' M package.json\n',
          stderr: 'fatal: not a git repository\n'
        };
      }
      throw new Error('rollout command should not run after git status probe failure');
    });

    const result = await runProviderOperatorAutopilot(
      {
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
        config: buildConfigWithLocalRolloutExecution({ require_clean_repo: true }),
        previous_result: null,
        repo_root: process.cwd()
      },
      {
        run_local_rollout_command: runCommand,
        append_local_rollout_execution_attempt: appendExecutionAttemptNoop
      }
    );

    expect(result.pending_actions).toHaveLength(1);
    expect(result.local_rollout_execution_attempts).toMatchObject([
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'command_failed',
        preflight: {
          status: 'failed',
          reason: 'command_failed',
          summary: 'fatal: not a git repository'
        }
      }
    ]);
  });

  it('records git branch probe failures as command_failed preflight failures', async () => {
    const pendingAction = {
      kind: 'local_rollout' as const,
      action_instance_id: 'local_rollout:branch-probe-failed',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      summary: 'pending rollout',
      merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
      merge_closeout_reason: 'merged_and_transitioned_done',
      shared_root_status: 'reconciled',
      linear_transition_status: 'transitioned',
      executable_action_ids: ['local-rebuild'],
      lifecycle_state: 'pending' as const,
      lifecycle_actor: null,
      lifecycle_reason: null,
      lifecycle_recorded_at: null
    };
    const runCommand = vi.fn(async (request: { command: string; args: string[] }) => {
      if (request.command === 'git' && request.args.includes('branch')) {
        return {
          ok: false,
          exitCode: 128,
          stdout: 'feature/stale\n',
          stderr: 'fatal: not a git repository\n'
        };
      }
      throw new Error('rollout command should not run after git branch probe failure');
    });

    const outcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [pendingAction],
        config: buildConfigWithLocalRolloutExecution({
          required_branch: 'main'
        }).post_merge_rollout.execution,
        repoRoot: process.cwd(),
        priorAttempts: []
      },
      {
        runCommand,
        fileExists: async () => true,
        appendExecutionAttempt: appendExecutionAttemptNoop
      }
    );

    expect(outcome.attempts).toMatchObject([
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'command_failed',
        preflight: {
          status: 'failed',
          reason: 'command_failed',
          summary: 'fatal: not a git repository'
        }
      }
    ]);
  });

  it('retries skipped local rollout preflight attempts after unsafe conditions clear', async () => {
    const pendingAction = {
      kind: 'local_rollout' as const,
      action_instance_id: 'local_rollout:retry-skipped-preflight',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      summary: 'pending rollout',
      merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
      merge_closeout_reason: 'merged_and_transitioned_done',
      shared_root_status: 'reconciled',
      linear_transition_status: 'transitioned',
      executable_action_ids: ['local-rebuild'],
      lifecycle_state: 'pending' as const,
      lifecycle_actor: null,
      lifecycle_reason: null,
      lifecycle_recorded_at: null
    };
    const priorSkippedAttempt: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord = {
      record_kind: 'terminal',
      action_instance_id: pendingAction.action_instance_id,
      action_id: 'local-rebuild',
      issue_id: pendingAction.issue_id,
      issue_identifier: pendingAction.issue_identifier,
      preflight: {
        status: 'skipped',
        reason: 'dirty_repo',
        checked_at: '2026-04-09T10:00:00.000Z',
        summary: 'Local rollout action local-rebuild requires a clean repository.'
      },
      started_at: null,
      ended_at: '2026-04-09T10:00:00.000Z',
      terminal_state: 'skipped',
      reason: 'dirty_repo',
      summary: 'Local rollout action local-rebuild requires a clean repository.',
      command: {
        runner: null,
        command: null,
        args: [],
        cwd: null,
        timeout_ms: null
      },
      exit_code: null,
      stdout: null,
      stderr: null
    };
    const runCommand = vi.fn(async (request: { command: string; args: string[] }) => {
      if (request.command === 'git' && request.args.includes('status')) {
        return {
          ok: true,
          exitCode: 0,
          stdout: '',
          stderr: ''
        };
      }
      return {
        ok: true,
        exitCode: 0,
        stdout: 'ok',
        stderr: ''
      };
    });
    const lifecycleRecords: ProviderOperatorAutopilotLifecycleRecord[] = [];

    const outcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [pendingAction],
        config: buildConfigWithLocalRolloutExecution({ require_clean_repo: true })
          .post_merge_rollout.execution,
        repoRoot: process.cwd(),
        priorAttempts: [priorSkippedAttempt]
      },
      {
        now: makeNowSequence([
          '2026-04-09T10:05:00.000Z',
          '2026-04-09T10:05:01.000Z',
          '2026-04-09T10:05:02.000Z',
          '2026-04-09T10:05:03.000Z'
        ]),
        runCommand,
        fileExists: async () => true,
        appendExecutionAttempt: appendExecutionAttemptNoop,
        appendLifecycleRecord: async (record) => {
          lifecycleRecords.push(record);
        }
      }
    );

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'git',
        args: ['-C', process.cwd(), 'status', '--porcelain']
      })
    );
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'npm',
        args: ['run', 'rollout:local']
      })
    );
    expect(outcome.lifecycle_records).toMatchObject([
      {
        action_instance_id: pendingAction.action_instance_id,
        state: 'cleared',
        source: 'operator-autopilot'
      }
    ]);
    expect(lifecycleRecords).toHaveLength(1);
    expect(outcome.attempts).toMatchObject([
      {
        record_kind: 'started',
        action_id: 'local-rebuild',
        reason: 'execution_interrupted'
      },
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'succeeded',
        reason: null
      }
    ]);
  });

  it('uses the Windows npm shim for npm_script local rollout actions', async () => {
    const pendingAction = {
      kind: 'local_rollout' as const,
      action_instance_id: 'local_rollout:windows-npm',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      summary: 'pending rollout',
      merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
      merge_closeout_reason: 'merged_and_transitioned_done',
      shared_root_status: 'reconciled',
      linear_transition_status: 'transitioned',
      executable_action_ids: ['local-rebuild'],
      lifecycle_state: 'pending' as const,
      lifecycle_actor: null,
      lifecycle_reason: null,
      lifecycle_recorded_at: null
    };
    const runCommand = vi.fn(async () => ({
      ok: true,
      exitCode: 0,
      stdout: 'ok',
      stderr: ''
    }));

    await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [pendingAction],
        config: buildConfigWithLocalRolloutExecution().post_merge_rollout.execution,
        repoRoot: process.cwd()
      },
      {
        platform: 'win32',
        runCommand,
        fileExists: async () => true,
        appendExecutionAttempt: appendExecutionAttemptNoop,
        appendLifecycleRecord: appendLifecycleRecordNoop
      }
    );

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'npm.cmd',
        args: ['run', 'rollout:local']
      })
    );
  });

  it('uses shell execution for Windows command shims', () => {
    expect(shouldUseShellForLocalRolloutCommand('npm.cmd', 'win32')).toBe(true);
    expect(shouldUseShellForLocalRolloutCommand('rollout.bat', 'win32')).toBe(true);
    expect(shouldUseShellForLocalRolloutCommand('npm', 'win32')).toBe(false);
    expect(shouldUseShellForLocalRolloutCommand('npm.cmd', 'darwin')).toBe(false);
  });

  it('keeps a failed local rollout command pending with command failure audit output', async () => {
    const runCommand = vi.fn(async () => ({
      ok: false,
      exitCode: 2,
      stdout: '',
      stderr: 'boom'
    }));

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
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: runCommand,
      append_local_rollout_execution_attempt: appendExecutionAttemptNoop
    });

    expect(result.pending_actions).toHaveLength(1);
    expect(result.local_rollout_execution_attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          record_kind: 'started',
          action_id: 'local-rebuild',
          terminal_state: 'failed',
          reason: 'execution_interrupted'
        }),
        expect.objectContaining({
          record_kind: 'terminal',
          action_id: 'local-rebuild',
          terminal_state: 'failed',
          reason: 'command_failed',
          exit_code: 2,
          stderr: 'boom'
        })
      ])
    );
  });

  it('preserves prior local rollout failure evidence when the action is disabled later', async () => {
    const claim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      })
    });
    const firstRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: async () => ({
        ok: false,
        exitCode: 42,
        stdout: '',
        stderr: 'rollout failed'
      }),
      append_local_rollout_execution_attempt: appendExecutionAttemptNoop
    });
    const rerunCommand = vi.fn(async () => {
      throw new Error('disabled rollout action should not rerun');
    });

    const secondRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution({ enabled: false }),
      previous_result: null,
      lifecycle_records: [],
      local_rollout_execution_attempts: firstRun.local_rollout_execution_attempts,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: rerunCommand,
      append_local_rollout_execution_attempt: appendExecutionAttemptNoop
    });

    expect(rerunCommand).not.toHaveBeenCalled();
    expect(secondRun.pending_actions).toMatchObject([
      {
        issue_identifier: 'CO-118',
        executable_action_ids: []
      }
    ]);
    expect(secondRun.local_rollout_execution_attempts).toMatchObject([
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'command_failed',
        stderr: 'rollout failed'
      }
    ]);
  });

  it('preserves audit failure start markers when executable action ids are empty', async () => {
    const claim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      })
    });
    const firstRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: async () => ({
        ok: true,
        exitCode: 0,
        stdout: 'ok',
        stderr: ''
      }),
      append_local_rollout_execution_attempt: async (record) => {
        if (record.record_kind === 'terminal') {
          throw new Error('terminal audit write failed');
        }
      }
    });
    const disabledCommand = vi.fn(async () => {
      throw new Error('disabled rollout action should not rerun');
    });

    const disabledRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution({ enabled: false }),
      previous_result: null,
      lifecycle_records: [],
      local_rollout_execution_attempts: firstRun.local_rollout_execution_attempts,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: disabledCommand,
      append_local_rollout_execution_attempt: appendExecutionAttemptNoop
    });

    expect(disabledCommand).not.toHaveBeenCalled();
    expect(disabledRun.pending_actions).toMatchObject([
      {
        issue_identifier: 'CO-118',
        executable_action_ids: []
      }
    ]);
    expect(disabledRun.local_rollout_execution_attempts).toMatchObject([
      {
        record_kind: 'started',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_interrupted'
      },
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_audit_failed'
      }
    ]);

    const reenabledCommand = vi.fn(async () => {
      throw new Error('reenabled rollout action should reuse prior audit-failed attempt');
    });
    const reenabledRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      lifecycle_records: [],
      local_rollout_execution_attempts: disabledRun.local_rollout_execution_attempts,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: reenabledCommand,
      append_local_rollout_execution_attempt: appendExecutionAttemptNoop
    });

    expect(reenabledCommand).not.toHaveBeenCalled();
    expect(reenabledRun.local_rollout_execution_attempts).toMatchObject([
      {
        record_kind: 'started',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_interrupted'
      },
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_audit_failed'
      }
    ]);
  });

  it('preserves lifecycle clear failure evidence when the action is disabled later', async () => {
    const claim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      })
    });
    const firstRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: async () => ({
        ok: true,
        exitCode: 0,
        stdout: 'ok',
        stderr: ''
      }),
      append_local_rollout_execution_attempt: appendExecutionAttemptNoop,
      append_local_rollout_lifecycle_record: async () => {
        throw new Error('temporary lifecycle write failure');
      }
    });
    const rerunCommand = vi.fn(async () => {
      throw new Error('disabled rollout action should not rerun');
    });

    const secondRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution({ enabled: false }),
      previous_result: null,
      lifecycle_records: [],
      local_rollout_execution_attempts: firstRun.local_rollout_execution_attempts,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: rerunCommand,
      append_local_rollout_execution_attempt: appendExecutionAttemptNoop
    });

    expect(rerunCommand).not.toHaveBeenCalled();
    expect(secondRun.pending_actions).toMatchObject([
      {
        issue_identifier: 'CO-118',
        executable_action_ids: []
      }
    ]);
    expect(secondRun.local_rollout_execution_attempts).toMatchObject([
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'lifecycle_record_failed'
      }
    ]);
  });

  it('stops ordered local rollout execution after the first command failure', async () => {
    const runCommand = vi.fn(async () => ({
      ok: false,
      exitCode: 2,
      stdout: '',
      stderr: 'boom'
    }));

    const outcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [
          {
            kind: 'local_rollout',
            action_instance_id: 'local_rollout:ordered',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            summary: 'pending rollout',
            merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
            merge_closeout_reason: 'merged_and_transitioned_done',
            shared_root_status: 'reconciled',
            linear_transition_status: 'transitioned',
            executable_action_ids: ['local-rebuild', 'local-restart'],
            lifecycle_state: 'pending',
            lifecycle_actor: null,
            lifecycle_reason: null,
            lifecycle_recorded_at: null
          }
        ],
        config: buildConfigWithLocalRolloutExecutionActions([
          {},
          {
            id: 'local-restart',
            order: 20,
            script: 'rollout:restart'
          }
        ]).post_merge_rollout.execution,
        repoRoot: process.cwd()
      },
      {
        runCommand,
        appendExecutionAttempt: appendExecutionAttemptNoop
      }
    );

    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(outcome.lifecycle_records).toEqual([]);
    expect(outcome.attempts.map((attempt) => attempt.action_id)).toEqual([
      'local-rebuild',
      'local-rebuild'
    ]);
    expect(outcome.attempts.at(-1)).toMatchObject({
      record_kind: 'terminal',
      action_id: 'local-rebuild',
      terminal_state: 'failed',
      reason: 'command_failed'
    });
  });

  it('keeps lifecycle pending when terminal execution audit persistence fails', async () => {
    const appendExecutionAttempt = vi.fn(
      async (record: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord) => {
        if (record.record_kind === 'terminal') {
          throw new Error('terminal audit write failed');
        }
      }
    );
    const appendLifecycleRecord = vi.fn(async () => {
      throw new Error('lifecycle should not clear without terminal audit proof');
    });

    const outcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [
          {
            kind: 'local_rollout',
            action_instance_id: 'local_rollout:audit-failed',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            summary: 'pending rollout',
            merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
            merge_closeout_reason: 'merged_and_transitioned_done',
            shared_root_status: 'reconciled',
            linear_transition_status: 'transitioned',
            executable_action_ids: ['local-rebuild'],
            lifecycle_state: 'pending',
            lifecycle_actor: null,
            lifecycle_reason: null,
            lifecycle_recorded_at: null
          }
        ],
        config: buildConfigWithLocalRolloutExecution().post_merge_rollout.execution,
        repoRoot: process.cwd()
      },
      {
        runCommand: async () => ({
          ok: true,
          exitCode: 0,
          stdout: 'ok',
          stderr: ''
        }),
        appendExecutionAttempt,
        appendLifecycleRecord
      }
    );

    expect(appendExecutionAttempt).toHaveBeenCalledTimes(2);
    expect(appendLifecycleRecord).not.toHaveBeenCalled();
    expect(outcome.lifecycle_records).toEqual([]);
    expect(outcome.attempts).toMatchObject([
      {
        record_kind: 'started',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_interrupted'
      },
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_audit_failed'
      }
    ]);
    expect(outcome.attempts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          record_kind: 'terminal',
          action_id: 'local-rebuild',
          terminal_state: 'succeeded'
        })
      ])
    );

    const rerunCommand = vi.fn(async () => {
      throw new Error('prior execution audit failure should not rerun automatically');
    });
    const rerunOutcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [
          {
            kind: 'local_rollout',
            action_instance_id: 'local_rollout:audit-failed',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            summary: 'pending rollout',
            merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
            merge_closeout_reason: 'merged_and_transitioned_done',
            shared_root_status: 'reconciled',
            linear_transition_status: 'transitioned',
            executable_action_ids: ['local-rebuild'],
            lifecycle_state: 'pending',
            lifecycle_actor: null,
            lifecycle_reason: null,
            lifecycle_recorded_at: null
          }
        ],
        config: buildConfigWithLocalRolloutExecution().post_merge_rollout.execution,
        repoRoot: process.cwd(),
        priorAttempts: outcome.attempts
      },
      {
        runCommand: rerunCommand,
        appendExecutionAttempt: appendExecutionAttemptNoop
      }
    );

    expect(rerunCommand).not.toHaveBeenCalled();
    expect(rerunOutcome.attempts).toMatchObject([
      {
        record_kind: 'started',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_interrupted'
      },
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_audit_failed'
      }
    ]);
  });

  it('does not launch a local rollout command when started audit persistence fails', async () => {
    const runCommand = vi.fn(async () => {
      throw new Error('local rollout command must not run without a started audit marker');
    });
    const pendingAction = {
      kind: 'local_rollout' as const,
      action_instance_id: 'local_rollout:start-audit-failed',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      summary: 'pending rollout',
      merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
      merge_closeout_reason: 'merged_and_transitioned_done',
      shared_root_status: 'reconciled' as const,
      linear_transition_status: 'transitioned' as const,
      executable_action_ids: ['local-rebuild'],
      lifecycle_state: 'pending' as const,
      lifecycle_actor: null,
      lifecycle_reason: null,
      lifecycle_recorded_at: null
    };

    const outcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [pendingAction],
        config: buildConfigWithLocalRolloutExecution().post_merge_rollout.execution,
        repoRoot: process.cwd()
      },
      {
        runCommand,
        appendExecutionAttempt: async () => {
          throw new Error('started audit write failed');
        }
      }
    );

    expect(runCommand).not.toHaveBeenCalled();
    expect(outcome.lifecycle_records).toEqual([]);
    expect(outcome.attempts).toMatchObject([
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_audit_failed',
        preflight: {
          status: 'failed',
          reason: 'execution_audit_failed'
        }
      }
    ]);

    const retryCommand = vi.fn(async () => ({
      ok: true,
      exitCode: 0,
      stdout: 'ok',
      stderr: ''
    }));
    const retryOutcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [pendingAction],
        config: buildConfigWithLocalRolloutExecution().post_merge_rollout.execution,
        repoRoot: process.cwd(),
        priorAttempts: outcome.attempts
      },
      {
        runCommand: retryCommand,
        appendExecutionAttempt: appendExecutionAttemptNoop,
        appendLifecycleRecord: appendLifecycleRecordNoop
      }
    );

    expect(retryCommand).toHaveBeenCalledTimes(1);
    expect(retryOutcome.lifecycle_records).toMatchObject([
      {
        action_instance_id: 'local_rollout:start-audit-failed',
        state: 'cleared',
        source: 'operator-autopilot'
      }
    ]);
    expect(retryOutcome.attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          record_kind: 'terminal',
          action_id: 'local-rebuild',
          terminal_state: 'succeeded',
          reason: null,
          stdout: 'ok'
        })
      ])
    );
  });

  it('does not launch local rollout preflight or commands without an execution audit writer', async () => {
    const runCommand = vi.fn(async () => {
      throw new Error('local rollout preflight or command must not run without audit persistence');
    });

    const outcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [
          {
            kind: 'local_rollout',
            action_instance_id: 'local_rollout:missing-audit-writer',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            summary: 'pending rollout',
            merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
            merge_closeout_reason: 'merged_and_transitioned_done',
            shared_root_status: 'reconciled',
            linear_transition_status: 'transitioned',
            executable_action_ids: ['local-rebuild'],
            lifecycle_state: 'pending',
            lifecycle_actor: null,
            lifecycle_reason: null,
            lifecycle_recorded_at: null
          }
        ],
        config: buildConfigWithLocalRolloutExecution({ require_clean_repo: true })
          .post_merge_rollout.execution,
        repoRoot: process.cwd()
      },
      {
        runCommand
      }
    );

    expect(runCommand).not.toHaveBeenCalled();
    expect(outcome.lifecycle_records).toEqual([]);
    expect(outcome.attempts).toMatchObject([
      {
        record_kind: 'terminal',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_audit_failed',
        preflight: {
          status: 'failed',
          reason: 'execution_audit_failed',
          summary:
            'Local rollout action was not launched because execution audit persistence is unavailable.'
        }
      }
    ]);
  });

  it('retries lifecycle clear after transient lifecycle persistence failure', async () => {
    const pendingAction = {
      kind: 'local_rollout' as const,
      action_instance_id: 'local_rollout:lifecycle-retry',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      summary: 'pending rollout',
      merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
      merge_closeout_reason: 'merged_and_transitioned_done',
      shared_root_status: 'reconciled',
      linear_transition_status: 'transitioned',
      executable_action_ids: ['local-rebuild'],
      lifecycle_state: 'pending' as const,
      lifecycle_actor: null,
      lifecycle_reason: null,
      lifecycle_recorded_at: null
    };
    const firstOutcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [pendingAction],
        config: buildConfigWithLocalRolloutExecution().post_merge_rollout.execution,
        repoRoot: process.cwd()
      },
      {
        runCommand: async () => ({
          ok: true,
          exitCode: 0,
          stdout: 'ok',
          stderr: ''
        }),
        appendExecutionAttempt: async () => undefined,
        appendLifecycleRecord: async () => {
          throw new Error('temporary lifecycle write failure');
        }
      }
    );
    const runCommand = vi.fn(async () => {
      throw new Error('successful rollout command should not rerun for lifecycle retry');
    });
    const lifecycleRecords: ProviderOperatorAutopilotLifecycleRecord[] = [];

    const secondOutcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [pendingAction],
        config: buildConfigWithLocalRolloutExecution().post_merge_rollout.execution,
        repoRoot: process.cwd(),
        priorAttempts: firstOutcome.attempts
      },
      {
        runCommand,
        appendLifecycleRecord: async (record) => {
          lifecycleRecords.push(record);
        }
      }
    );

    expect(firstOutcome.lifecycle_records).toEqual([]);
    expect(firstOutcome.attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          record_kind: 'terminal',
          terminal_state: 'succeeded',
          reason: null
        }),
        expect.objectContaining({
          record_kind: 'terminal',
          terminal_state: 'failed',
          reason: 'lifecycle_record_failed'
        })
      ])
    );
    expect(runCommand).not.toHaveBeenCalled();
    expect(lifecycleRecords).toMatchObject([
      {
        action_instance_id: 'local_rollout:lifecycle-retry',
        state: 'cleared',
        source: 'operator-autopilot'
      }
    ]);
    expect(secondOutcome.lifecycle_records).toMatchObject([
      {
        action_instance_id: 'local_rollout:lifecycle-retry',
        state: 'cleared',
        source: 'operator-autopilot'
      }
    ]);
  });

  it('rehydrates prior successful local rollout execution without rerunning the command', async () => {
    const claim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      })
    });
    const firstRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: async () => ({
        ok: true,
        exitCode: 0,
        stdout: 'ok',
        stderr: ''
      }),
      append_local_rollout_execution_attempt: appendExecutionAttemptNoop,
      append_local_rollout_lifecycle_record: appendLifecycleRecordNoop
    });
    const rerunCommand = vi.fn(async () => {
      throw new Error('rehydrated local rollout execution should not rerun');
    });

    const secondRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      lifecycle_records: firstRun.lifecycle_records,
      local_rollout_execution_attempts: firstRun.local_rollout_execution_attempts,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: rerunCommand
    });

    expect(rerunCommand).not.toHaveBeenCalled();
    expect(secondRun.pending_actions).toEqual([]);
    expect(secondRun.resolved_actions).toMatchObject([
      {
        issue_identifier: 'CO-118',
        lifecycle_state: 'cleared',
        lifecycle_actor: 'operator-autopilot'
      }
    ]);
  });

  it('rehydrates a started local rollout marker without rerunning the command', async () => {
    const claim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      })
    });
    const firstRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: async () => ({
        ok: true,
        exitCode: 0,
        stdout: 'ok',
        stderr: ''
      }),
      append_local_rollout_execution_attempt: appendExecutionAttemptNoop,
      append_local_rollout_lifecycle_record: appendLifecycleRecordNoop
    });
    const startedOnly = (firstRun.local_rollout_execution_attempts ?? []).filter(
      (attempt) => attempt.record_kind === 'started'
    );
    const rerunCommand = vi.fn(async () => {
      throw new Error('started local rollout marker should not rerun blindly');
    });

    const secondRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      lifecycle_records: [],
      local_rollout_execution_attempts: startedOnly,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: rerunCommand
    });

    expect(startedOnly).toHaveLength(1);
    expect(rerunCommand).not.toHaveBeenCalled();
    expect(secondRun.pending_actions).toHaveLength(1);
    expect(secondRun.resolved_actions).toEqual([]);
    expect(secondRun.local_rollout_execution_attempts).toMatchObject([
      {
        record_kind: 'started',
        action_id: 'local-rebuild',
        terminal_state: 'failed',
        reason: 'execution_interrupted'
      }
    ]);
  });

  it('prefers a newer started local rollout marker over stale terminal execution', async () => {
    const claim = createClaim({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      merge_closeout: createMergeCloseout({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      })
    });
    const firstRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: async () => ({
        ok: true,
        exitCode: 0,
        stdout: 'ok',
        stderr: ''
      }),
      append_local_rollout_execution_attempt: appendExecutionAttemptNoop,
      append_local_rollout_lifecycle_record: appendLifecycleRecordNoop
    });
    const terminalSuccess = firstRun.local_rollout_execution_attempts?.find(
      (attempt) => attempt.record_kind === 'terminal' && attempt.terminal_state === 'succeeded'
    );
    const startedMarker = firstRun.local_rollout_execution_attempts?.find(
      (attempt) => attempt.record_kind === 'started'
    );
    expect(terminalSuccess).toBeDefined();
    expect(startedMarker).toBeDefined();
    if (!terminalSuccess || !startedMarker) {
      throw new Error('expected both started and terminal local rollout records');
    }
    const staleTerminal: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord = {
      ...terminalSuccess,
      preflight: {
        ...terminalSuccess.preflight,
        checked_at: '2026-04-09T10:00:00.000Z'
      },
      started_at: '2026-04-09T10:00:00.000Z',
      ended_at: '2026-04-09T10:01:00.000Z'
    };
    const newerStarted: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord = {
      ...startedMarker,
      preflight: {
        ...startedMarker.preflight,
        checked_at: '2026-04-09T10:05:00.000Z'
      },
      started_at: '2026-04-09T10:05:00.000Z',
      ended_at: '2026-04-09T10:05:00.000Z'
    };
    const rerunCommand = vi.fn(async () => {
      throw new Error('newer started local rollout marker should not rerun blindly');
    });

    const secondRun = await runProviderOperatorAutopilot({
      tracked_issues: [],
      claims: [claim],
      config: buildConfigWithLocalRolloutExecution(),
      previous_result: null,
      lifecycle_records: [],
      local_rollout_execution_attempts: [staleTerminal, newerStarted],
      repo_root: process.cwd()
    }, {
      run_local_rollout_command: rerunCommand,
      append_local_rollout_lifecycle_record: appendLifecycleRecordNoop
    });

    expect(rerunCommand).not.toHaveBeenCalled();
    expect(secondRun.pending_actions).toHaveLength(1);
    expect(secondRun.resolved_actions).toEqual([]);
    expect(secondRun.local_rollout_execution_attempts).toMatchObject([
      {
        record_kind: 'started',
        action_id: 'local-rebuild',
        started_at: '2026-04-09T10:05:00.000Z',
        terminal_state: 'failed',
        reason: 'execution_interrupted'
      }
    ]);
  });

  it('preserves raw stdout and stderr when reading local rollout execution records', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'local-rollout-output-'));
    try {
      const executionPath = join(
        dir,
        'provider-operator-autopilot-local-rollout-executions.json'
      );
      const record: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord = {
        record_kind: 'terminal',
        action_instance_id: 'local_rollout:raw-output',
        action_id: 'local-rebuild',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-118',
        preflight: {
          status: 'passed',
          reason: null,
          checked_at: '2026-04-09T10:00:00.000Z',
          summary: 'Local rollout action preflight passed.'
        },
        started_at: '2026-04-09T10:00:01.000Z',
        ended_at: '2026-04-09T10:00:02.000Z',
        terminal_state: 'failed',
        reason: 'command_failed',
        summary: 'Local rollout action local-rebuild failed.',
        command: {
          runner: 'npm_script',
          command: 'npm',
          args: ['run', 'rollout:local'],
          cwd: process.cwd(),
          timeout_ms: 15000
        },
        exit_code: 1,
        stdout: '',
        stderr: '  spaced stderr\n'
      };
      await writeFile(
        executionPath,
        JSON.stringify({ version: 1, records: [record] }, null, 2),
        'utf8'
      );

      const records =
        await readProviderOperatorAutopilotLocalRolloutExecutionRecords(executionPath);

      expect(records[0]?.stdout).toBe('');
      expect(records[0]?.stderr).toBe('  spaced stderr\n');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('stores raw stdout and stderr when recording local rollout command output', async () => {
    const outcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [
          {
            kind: 'local_rollout',
            action_instance_id: 'local_rollout:raw-command-output',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            summary: 'pending rollout',
            merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
            merge_closeout_reason: 'merged_and_transitioned_done',
            shared_root_status: 'reconciled',
            linear_transition_status: 'transitioned',
            executable_action_ids: ['local-rebuild'],
            lifecycle_state: 'pending',
            lifecycle_actor: null,
            lifecycle_reason: null,
            lifecycle_recorded_at: null
          }
        ],
        config: buildConfigWithLocalRolloutExecution().post_merge_rollout.execution,
        repoRoot: process.cwd()
      },
      {
        runCommand: async () => ({
          ok: false,
          exitCode: 1,
          stdout: '  raw stdout\n',
          stderr: '\n  raw stderr\n'
        }),
        appendExecutionAttempt: appendExecutionAttemptNoop
      }
    );

    expect(outcome.attempts.at(-1)).toMatchObject({
      record_kind: 'terminal',
      action_id: 'local-rebuild',
      terminal_state: 'failed',
      reason: 'command_failed',
      stdout: '  raw stdout\n',
      stderr: '\n  raw stderr\n'
    });
  });

  it('refuses undeclared local rollout action ids without running a command', async () => {
    const runCommand = vi.fn(async () => {
      throw new Error('undeclared action should not run');
    });

    const outcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: [
          {
            kind: 'local_rollout',
            action_instance_id: 'local_rollout:undeclared',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-118',
            summary: 'pending rollout',
            merge_closeout_recorded_at: '2026-04-09T09:15:00.000Z',
            merge_closeout_reason: 'merged_and_transitioned_done',
            shared_root_status: 'reconciled',
            linear_transition_status: 'transitioned',
            executable_action_ids: ['missing-action'],
            lifecycle_state: 'pending',
            lifecycle_actor: null,
            lifecycle_reason: null,
            lifecycle_recorded_at: null
          }
        ],
        config: {
          enabled: true,
          actions: []
        },
        repoRoot: process.cwd()
      },
      {
        runCommand,
        appendExecutionAttempt: appendExecutionAttemptNoop
      }
    );

    expect(runCommand).not.toHaveBeenCalled();
    expect(outcome.lifecycle_records).toEqual([]);
    expect(outcome.attempts).toMatchObject([
      {
        action_id: 'missing-action',
        terminal_state: 'skipped',
        reason: 'undeclared_action'
      }
    ]);
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

function buildConfigWithLocalRolloutExecution(
  actionOverrides: Partial<
    ProviderOperatorAutopilotConfig['post_merge_rollout']['execution']['actions'][number]
  > = {}
): ProviderOperatorAutopilotConfig {
  return buildConfigWithLocalRolloutExecutionActions([actionOverrides]);
}

function buildConfigWithLocalRolloutExecutionActions(
  actionOverrides: Partial<
    ProviderOperatorAutopilotConfig['post_merge_rollout']['execution']['actions'][number]
  >[]
): ProviderOperatorAutopilotConfig {
  const config = buildConfig();
  return {
    ...config,
    post_merge_rollout: {
      ...config.post_merge_rollout,
      execution: {
        enabled: true,
        actions: actionOverrides.map((overrides, index) => ({
          id: 'local-rebuild',
          enabled: true,
          order: 10 + index * 10,
          runner: 'npm_script',
          args: [],
          script: 'rollout:local',
          timeout_ms: 15000,
          require_clean_repo: false,
          required_branch: null,
          supported_platforms: [],
          invalid_supported_platforms: [],
          deploy_class: false,
          deploy_opt_in: false,
          requires_issue_identifier: false,
          ...overrides
        }))
      }
    }
  };
}

async function appendExecutionAttemptNoop(): Promise<void> {}

async function appendLifecycleRecordNoop(): Promise<void> {}

function makeNowSequence(values: string[]): () => string {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)]!;
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
    archived_at: overrides.archived_at ?? null,
    trashed: overrides.trashed ?? null,
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
    blocked_by_truncated: overrides.blocked_by_truncated ?? false,
    relations: overrides.relations ?? [],
    relations_truncated: overrides.relations_truncated ?? false,
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
