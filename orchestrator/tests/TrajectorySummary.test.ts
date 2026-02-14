import { describe, expect, it } from 'vitest';

import { summarizeTrajectory, type TrajectoryFrame } from '../src/cli/exec/experience.js';
import type { ExecEndEvent } from '../../packages/shared/events/types.js';

function createEndEvent(stdout: string): ExecEndEvent {
  return {
    type: 'exec:end',
    correlationId: 'corr-1',
    timestamp: '2026-02-13T00:00:00.000Z',
    attempt: 1,
    payload: {
      exitCode: 0,
      signal: null,
      durationMs: 1000,
      stdout,
      stderr: '',
      sandboxState: 'sandboxed',
      sessionId: 'session-1',
      status: 'succeeded'
    }
  };
}

function createFrame(stdout: string): TrajectoryFrame {
  return {
    event: createEndEvent(stdout),
    tool: 'cli:command',
    tokens: 20,
    costUsd: 0.001,
    latencyMs: 1000
  };
}

describe('summarizeTrajectory', () => {
  it('falls back to base summary when stdout is low-signal JSON', () => {
    const result = summarizeTrajectory({
      runId: 'run-1',
      taskId: 'task-1',
      epoch: null,
      groupId: null,
      domain: 'diagnostics',
      stampSignature: 'a'.repeat(64),
      frames: [createFrame('{"type":"thread.started","thread_id":"abc"}')],
      baseSummary: 'Diagnostics command completed successfully.'
    });

    expect(result.summary).toBe('Diagnostics command completed successfully.');
  });

  it('uses command stdout when it contains meaningful prose', () => {
    const result = summarizeTrajectory({
      runId: 'run-2',
      taskId: 'task-2',
      epoch: null,
      groupId: null,
      domain: 'implementation',
      stampSignature: 'b'.repeat(64),
      frames: [createFrame('Applied patch successfully\nRan tests and lint')],
      baseSummary: 'Fallback summary'
    });

    expect(result.summary).toContain('Applied patch successfully');
    expect(result.summary).toContain('Ran tests and lint');
  });
});
