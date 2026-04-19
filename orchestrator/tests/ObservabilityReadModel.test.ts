import { describe, expect, it } from 'vitest';

import { buildSelectedRunRuntimeFingerprintInput } from '../src/cli/control/observabilityReadModel.js';

describe('observabilityReadModel', () => {
  it('projects operator autopilot transition and hold decision inputs into the runtime fingerprint', () => {
    const fingerprint = buildSelectedRunRuntimeFingerprintInput({
      selected: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null,
      polling: null,
      providerWorkflow: {
        status: 'ready',
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/tmp/provider-workflow.json',
        last_reload_attempt_at: '2026-04-09T09:29:00.000Z',
        last_success_at: '2026-04-09T09:29:00.000Z',
        last_error_at: null,
        last_error: null,
        terminal_cleanup: null,
        worker_hosts: [],
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
            excluded_action_required_reasons: []
          },
          post_merge_rollout: {
            enabled: true,
            summary: 'Merge closeout completed.'
          },
          audit_path: '/tmp/provider-operator-autopilot.jsonl',
          lifecycle_path: '/tmp/provider-operator-autopilot-lifecycle.json',
          last_result: {
            recorded_at: '2026-04-09T09:40:30.000Z',
            status: 'noop',
            summary: 'Backlog head CO-118 remains parked after manual demotion.',
            error: null,
            actions: [
              {
                kind: 'backlog_promotion',
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-118',
                reason: 'backlog_head_promoted',
                summary: 'Promoted backlog head CO-118 to Ready.',
                transition: {
                  status: 'transitioned',
                  attempted_at: '2026-04-09T09:30:00.000Z',
                  previous_state: 'Backlog',
                  target_state: 'Ready',
                  issue_state: 'Ready',
                  issue_state_type: 'unstarted',
                  issue_updated_at: '2026-04-09T09:30:00.000Z',
                  force_path_used: true,
                  error: null
                },
                action_required_reasons: []
              }
            ],
            holds: [
              {
                kind: 'backlog_promotion',
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-118',
                issue_state: 'Backlog',
                issue_state_type: 'backlog',
                issue_updated_at: '2026-04-09T09:40:00.000Z',
                promotion_attempted_at: '2026-04-09T09:30:00.000Z',
                promotion_issue_updated_at: '2026-04-09T09:30:00.000Z',
                force_path_used: true,
                reason: 'backlog_head_manual_demotion_unacknowledged',
                summary: 'Backlog head CO-118 remains parked after manual demotion.',
                action_required_reasons: []
              }
            ],
            pending_actions: [],
            resolved_actions: [],
            lifecycle_records: [],
            backlog_promotion_snapshots: [
              {
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-118',
                target_state: 'Ready',
                attempted_at: '2026-04-09T09:30:00.000Z',
                issue_updated_at: '2026-04-09T09:30:00.000Z',
                force_path_used: true
              }
            ]
          }
        }
      }
    });

    expect(fingerprint).toMatchObject({
      provider_workflow: {
        operator_autopilot: {
          last_result: {
            actions: [
              {
                transition: {
                  issue_updated_at: '2026-04-09T09:30:00.000Z',
                  force_path_used: true
                }
              }
            ],
            holds: [
              {
                issue_state: 'Backlog',
                issue_state_type: 'backlog',
                issue_updated_at: '2026-04-09T09:40:00.000Z',
                promotion_attempted_at: '2026-04-09T09:30:00.000Z',
                promotion_issue_updated_at: '2026-04-09T09:30:00.000Z',
                force_path_used: true,
                reason: 'backlog_head_manual_demotion_unacknowledged'
              }
            ],
            backlog_promotion_snapshots: [
              {
                issue_identifier: 'CO-118',
                target_state: 'Ready',
                attempted_at: '2026-04-09T09:30:00.000Z',
                issue_updated_at: '2026-04-09T09:30:00.000Z',
                force_path_used: true
              }
            ]
          }
        }
      }
    });
  });
});
