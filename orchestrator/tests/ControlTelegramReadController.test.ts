import { describe, expect, it } from 'vitest';

import { createControlTelegramReadController } from '../src/cli/control/controlTelegramReadController.js';
import type { ControlSelectedRunRuntimeSnapshot } from '../src/cli/control/observabilityReadModel.js';
import type { ProviderLinearWorkerProof } from '../src/cli/providerLinearWorkerRunner.js';

function buildSnapshot(input: {
  prompt: string;
  urgency: 'low' | 'medium' | 'high';
  proof?: Partial<ProviderLinearWorkerProof>;
}): ControlSelectedRunRuntimeSnapshot {
  return {
    selected: {
      issueId: 'task-1124',
      issueIdentifier: 'task-1124',
      taskId: 'task-1124',
      runId: 'run-1',
      rawStatus: 'in_progress',
      displayStatus: 'awaiting_input',
      statusReason: 'queued_questions',
      startedAt: '2026-03-12T00:00:00.000Z',
      updatedAt: '2026-03-12T00:01:00.000Z',
      completedAt: null,
      summary: 'Awaiting operator input',
      lastError: null,
      latestAction: null,
      latestEvent: null,
      workspacePath: '/tmp/co',
      questionSummary: {
        queuedCount: 1,
        latestQuestion: {
          questionId: 'q-1124',
          prompt: input.prompt,
          urgency: input.urgency,
          queuedAt: '2026-03-12T00:01:00.000Z'
        }
      },
      tracked: {
        linear: {
          provider: 'linear',
          id: 'lin-1124',
          identifier: 'TEAM-1124',
          title: 'Telegram presenter split',
          url: 'https://linear.app/team/issue/TEAM-1124',
          state: 'Todo',
          state_type: 'unstarted',
          workspace_id: 'lin-workspace',
          team_id: 'lin-team',
          team_key: 'TEAM',
          team_name: 'Team',
          project_id: 'lin-project',
          project_name: 'Coordinator',
          updated_at: '2026-03-12T00:01:00.000Z',
          recent_activity: []
        }
      },
      providerLinearWorkerProof: input.proof
        ? {
            issue_id: 'task-1124',
            issue_identifier: 'task-1124',
            thread_id: 'thread-1',
            latest_turn_id: 'turn-1',
            latest_session_id: 'thread-1-turn-1',
            latest_session_id_source: 'derived_from_thread_and_turn',
            turn_count: 1,
            last_event: 'task_complete',
            last_message: 'done',
            last_event_at: '2026-03-12T00:01:00.000Z',
            tokens: {
              input_tokens: 12,
              output_tokens: 8,
              total_tokens: 20
            },
            rate_limits: null,
            owner_phase: 'turn_completed',
            owner_status: 'in_progress',
            workspace_path: '/tmp/co',
            end_reason: null,
            updated_at: '2026-03-12T00:01:00.000Z',
            ...input.proof
          }
        : null
    },
    dispatchPilot: {
      advisory_only: true,
      configured: true,
      enabled: true,
      kill_switch: false,
      status: 'ready',
      source_status: 'ready',
      reason: 'signal_threshold_met',
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace',
        team_id: 'lin-team',
        project_id: 'lin-project'
      }
    },
    tracked: null
  };
}

describe('ControlTelegramReadController', () => {
  it('renders help using the configured mutation posture', async () => {
    const controller = createControlTelegramReadController({
      readAdapter: {
        readSelectedRun: async () => buildSnapshot({ prompt: 'Approve?', urgency: 'high' }),
        readDispatch: async () => ({}),
        readQuestions: async () => ({ questions: [] })
      },
      mutationsEnabled: false
    });

    await expect(controller.dispatchReadCommand('/help')).resolves.toContain('/pause (disabled)');
    await expect(controller.dispatchReadCommand('/resume')).resolves.toBeNull();
  });

  it('renders no-selected fallback status and projection text consistently', async () => {
    const readAdapter = {
      readSelectedRun: async () => ({
        selected: null,
        dispatchPilot: null,
        tracked: {
          linear: {
            provider: 'linear',
            id: 'lin-none',
            identifier: 'TEAM-0',
            title: 'Fallback issue',
            url: null,
            state: 'Backlog',
            state_type: null,
            workspace_id: 'lin-workspace',
            team_id: 'lin-team',
            team_key: 'TEAM',
            team_name: 'Team',
            project_id: null,
            project_name: null,
            updated_at: null,
            recent_activity: []
          }
        }
      }),
      readDispatch: async () => ({}),
      readQuestions: async () => ({ questions: [] })
    };

    const controller = createControlTelegramReadController({
      readAdapter,
      mutationsEnabled: true
    });
    const identicalController = createControlTelegramReadController({
      readAdapter,
      mutationsEnabled: true
    });

    const status = await controller.dispatchReadCommand('/status');
    const projection = await controller.renderProjectionDeltaMessage();
    const identicalProjection = await identicalController.renderProjectionDeltaMessage();

    expect(status).toContain('No active running projection.');
    expect(status).toContain('Linear: TEAM-0 - Fallback issue');
    expect(projection.text).toBe(status);
    expect(projection.projectionHash).toBeTruthy();
    expect(identicalProjection.projectionHash).toBe(projection.projectionHash);
  });

  it('returns a null projection hash when there is no selected or tracked runtime context', async () => {
    const controller = createControlTelegramReadController({
      readAdapter: {
        readSelectedRun: async () => ({
          selected: null,
          dispatchPilot: null,
          tracked: null
        }),
        readDispatch: async () => ({}),
        readQuestions: async () => ({ questions: [] })
      },
      mutationsEnabled: true
    });

    const status = await controller.dispatchReadCommand('/status');
    const projection = await controller.renderProjectionDeltaMessage();

    expect(status).toContain('No active running projection.');
    expect(projection.text).toBe(status);
    expect(projection.projectionHash).toBeNull();
  });

  it('treats prompt and urgency changes as distinct projection hashes', async () => {
    const first = createControlTelegramReadController({
      readAdapter: {
        readSelectedRun: async () => buildSnapshot({ prompt: 'Approve the retry?', urgency: 'high' }),
        readDispatch: async () => ({}),
        readQuestions: async () => ({ questions: [] })
      },
      mutationsEnabled: true
    });
    const second = createControlTelegramReadController({
      readAdapter: {
        readSelectedRun: async () => buildSnapshot({ prompt: 'Approve the rerun?', urgency: 'high' }),
        readDispatch: async () => ({}),
        readQuestions: async () => ({ questions: [] })
      },
      mutationsEnabled: true
    });
    const third = createControlTelegramReadController({
      readAdapter: {
        readSelectedRun: async () => buildSnapshot({ prompt: 'Approve the retry?', urgency: 'low' }),
        readDispatch: async () => ({}),
        readQuestions: async () => ({ questions: [] })
      },
      mutationsEnabled: true
    });

    const firstProjection = await first.renderProjectionDeltaMessage();
    const secondProjection = await second.renderProjectionDeltaMessage();
    const thirdProjection = await third.renderProjectionDeltaMessage();

    expect(firstProjection.projectionHash).toBeTruthy();
    expect(secondProjection.projectionHash).toBeTruthy();
    expect(thirdProjection.projectionHash).toBeTruthy();
    expect(firstProjection.projectionHash).not.toBe(secondProjection.projectionHash);
    expect(firstProjection.projectionHash).not.toBe(thirdProjection.projectionHash);
  });

  it('treats provider worker proof changes as distinct projection hashes', async () => {
    const first = createControlTelegramReadController({
      readAdapter: {
        readSelectedRun: async () =>
          buildSnapshot({
            prompt: 'Approve the retry?',
            urgency: 'high',
            proof: { latest_turn_id: 'turn-1', turn_count: 1 }
          }),
        readDispatch: async () => ({}),
        readQuestions: async () => ({ questions: [] })
      },
      mutationsEnabled: true
    });
    const second = createControlTelegramReadController({
      readAdapter: {
        readSelectedRun: async () =>
          buildSnapshot({
            prompt: 'Approve the retry?',
            urgency: 'high',
            proof: { latest_turn_id: 'turn-2', latest_session_id: 'thread-1-turn-2', turn_count: 2 }
          }),
        readDispatch: async () => ({}),
        readQuestions: async () => ({ questions: [] })
      },
      mutationsEnabled: true
    });

    const firstProjection = await first.renderProjectionDeltaMessage();
    const secondProjection = await second.renderProjectionDeltaMessage();

    expect(firstProjection.projectionHash).toBeTruthy();
    expect(secondProjection.projectionHash).toBeTruthy();
    expect(firstProjection.projectionHash).not.toBe(secondProjection.projectionHash);
  });

  it('renders issue and dispatch read commands through the extracted controller', async () => {
    const controller = createControlTelegramReadController({
      readAdapter: {
        readSelectedRun: async () => buildSnapshot({ prompt: 'Approve?', urgency: 'high' }),
        readDispatch: async () => ({
          dispatch_pilot: {
            status: 'ready',
            source_status: 'ready',
            reason: 'signal_threshold_met'
          },
          recommendation: {
            summary: 'Promote the selected run to execution.',
            rationale: 'Latest advisory crossed the dispatch threshold.',
            confidence: 0.92,
            tracked_issue: {
              identifier: 'TEAM-1124',
              title: 'Telegram presenter split',
              url: 'https://linear.app/team/issue/TEAM-1124',
              state: 'Todo',
              team_key: 'TEAM'
            }
          }
        }),
        readQuestions: async () => ({ questions: [] })
      },
      mutationsEnabled: true
    });

    await expect(controller.dispatchReadCommand('/issue')).resolves.toContain('Issue task-1124');
    await expect(controller.dispatchReadCommand('/dispatch')).resolves.toContain(
      'Summary: Promote the selected run to execution.'
    );
  });

  it('renders queued questions through the extracted read controller', async () => {
    const controller = createControlTelegramReadController({
      readAdapter: {
        readSelectedRun: async () => buildSnapshot({ prompt: 'Approve?', urgency: 'high' }),
        readDispatch: async () => ({}),
        readQuestions: async () => ({
          questions: [
            { question_id: 'q-1', urgency: 'high', prompt: 'Approve the sync?', status: 'queued' },
            { question_id: 'q-2', urgency: 'low', prompt: 'Ignore this', status: 'answered' }
          ]
        })
      },
      mutationsEnabled: true
    });

    await expect(controller.dispatchReadCommand('/questions')).resolves.toContain('q-1 [high]: Approve the sync?');
  });
});
