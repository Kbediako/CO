import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildControlInternalContext } from '../src/cli/control/controlRequestContext.js';
import { readControlTelegramDispatch } from '../src/cli/control/controlTelegramDispatchRead.js';
import { readDispatchExtension } from '../src/cli/control/observabilitySurface.js';

vi.mock('../src/cli/control/controlRequestContext.js', () => ({
  buildControlInternalContext: vi.fn()
}));

vi.mock('../src/cli/control/observabilitySurface.js', () => ({
  readDispatchExtension: vi.fn()
}));

describe('ControlTelegramDispatchRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assembles Telegram dispatch reads from shared control context and emits Telegram dispatch audit events', async () => {
    const evaluation = {
      summary: {
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
      recommendation: null,
      failure: null
    } as never;
    const runtimeSnapshot = {
      readDispatchEvaluation: vi.fn(async () => ({
        issueIdentifier: 'task-1077',
        evaluation
      }))
    };
    const internalContext = {
      runtime: {
        snapshot: vi.fn(() => runtimeSnapshot)
      }
    };
    const emitDispatchPilotAuditEvents = vi.fn(async () => undefined);
    vi.mocked(buildControlInternalContext).mockReturnValue(internalContext as never);
    vi.mocked(readDispatchExtension).mockImplementation(async (input) => {
      await expect(input.readDispatchEvaluation()).resolves.toEqual({
        issueIdentifier: 'task-1077',
        evaluation
      });
      return {
        kind: 'ok',
        issueIdentifier: 'task-1077',
        evaluation,
        payload: {
          dispatch_pilot: evaluation.summary
        }
      } as never;
    });

    const sharedContext = {
      token: 'token',
      controlStore: {} as never,
      confirmationStore: {} as never,
      questionQueue: {} as never,
      delegationTokens: {} as never,
      sessionTokens: {} as never,
      config: {} as never,
      persist: {} as never,
      clients: new Set(),
      eventTransport: {} as never,
      paths: {} as never,
      linearAdvisoryState: {} as never,
      runtime: {} as never,
      expiryLifecycle: null,
      emitDispatchPilotAuditEvents
    };

    await expect(readControlTelegramDispatch(sharedContext as never)).resolves.toEqual({
      dispatch_pilot: evaluation.summary
    });

    expect(buildControlInternalContext).toHaveBeenCalledWith(sharedContext);
    expect(internalContext.runtime.snapshot).toHaveBeenCalledTimes(1);
    expect(runtimeSnapshot.readDispatchEvaluation).toHaveBeenCalledTimes(1);
    expect(emitDispatchPilotAuditEvents).toHaveBeenCalledWith(internalContext, {
      surface: 'telegram_dispatch',
      evaluation,
      issueIdentifier: 'task-1077'
    });
  });

  it('maps fail-closed dispatch reads to the Telegram dispatch payload shape', async () => {
    const evaluation = {
      summary: {
        advisory_only: true,
        configured: true,
        enabled: true,
        kill_switch: false,
        status: 'source_unavailable',
        source_status: 'unavailable',
        reason: 'dispatch_source_live_requires_async_evaluation',
        source_setup: {
          provider: 'linear',
          workspace_id: 'lin-workspace',
          team_id: 'lin-team',
          project_id: 'lin-project'
        }
      },
      recommendation: null,
      failure: {
        status: 503,
        code: 'dispatch_source_unavailable',
        reason: 'dispatch_source_live_requires_async_evaluation'
      }
    } as never;
    const internalContext = {
      runtime: {
        snapshot: vi.fn(() => ({
          readDispatchEvaluation: vi.fn()
        }))
      }
    };
    const emitDispatchPilotAuditEvents = vi.fn(async () => undefined);
    vi.mocked(buildControlInternalContext).mockReturnValue(internalContext as never);
    vi.mocked(readDispatchExtension).mockResolvedValue({
      kind: 'fail_closed',
      issueIdentifier: 'task-1077',
      evaluation,
      failure: evaluation.failure,
      details: {
        dispatch_pilot: evaluation.summary
      }
    } as never);

    await expect(
      readControlTelegramDispatch({
        token: 'token',
        controlStore: {} as never,
        confirmationStore: {} as never,
        questionQueue: {} as never,
        delegationTokens: {} as never,
        sessionTokens: {} as never,
        config: {} as never,
        persist: {} as never,
        clients: new Set(),
        eventTransport: {} as never,
        paths: {} as never,
        linearAdvisoryState: {} as never,
        runtime: {} as never,
        expiryLifecycle: null,
        emitDispatchPilotAuditEvents
      } as never)
    ).resolves.toEqual({
      dispatch_pilot: evaluation.summary,
      error: {
        code: 'dispatch_source_unavailable',
        details: {
          dispatch_pilot: evaluation.summary
        }
      }
    });

    expect(emitDispatchPilotAuditEvents).toHaveBeenCalledWith(internalContext, {
      surface: 'telegram_dispatch',
      evaluation,
      issueIdentifier: 'task-1077'
    });
  });
});
