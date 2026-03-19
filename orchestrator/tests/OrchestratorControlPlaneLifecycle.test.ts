import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startOrchestratorControlPlaneLifecycle } from '../src/cli/services/orchestratorControlPlaneLifecycle.js';

vi.mock('../src/cli/events/runEventStream.js', () => ({
  RunEventStream: {
    create: vi.fn()
  },
  attachRunEventAdapter: vi.fn()
}));

vi.mock('../src/cli/config/delegationConfig.js', () => ({
  loadDelegationConfigFiles: vi.fn(),
  computeEffectiveDelegationConfig: vi.fn(),
  parseDelegationConfigOverride: vi.fn(),
  splitDelegationConfigOverrides: vi.fn(() => [])
}));

vi.mock('../src/cli/control/controlServer.js', () => ({
  ControlServer: {
    start: vi.fn()
  }
}));

describe('startOrchestratorControlPlaneLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.CODEX_CONFIG_OVERRIDES;
    delete process.env.CODEX_MCP_CONFIG_OVERRIDES;
  });

  it('starts the event stream, conditionally starts the control server, and closes detach -> control server -> stream', async () => {
    const { RunEventStream, attachRunEventAdapter } = await import('../src/cli/events/runEventStream.js');
    const {
      loadDelegationConfigFiles,
      computeEffectiveDelegationConfig
    } = await import('../src/cli/config/delegationConfig.js');
    const { ControlServer } = await import('../src/cli/control/controlServer.js');

    const order: string[] = [];
    const eventStream = {
      close: vi.fn(async () => {
        order.push('stream');
      })
    };
    const controlServer = {
      broadcast: vi.fn(),
      close: vi.fn(async () => {
        order.push('server');
      })
    };
    vi.mocked(RunEventStream.create).mockResolvedValue(eventStream as never);
    vi.mocked(loadDelegationConfigFiles).mockResolvedValue({
      global: null,
      repo: null
    } as never);
    vi.mocked(computeEffectiveDelegationConfig).mockReturnValue({
      ui: { controlEnabled: true }
    } as never);
    vi.mocked(ControlServer.start).mockResolvedValue(controlServer as never);
    vi.mocked(attachRunEventAdapter).mockImplementation((_emitter, _stream, onEntry) => {
      onEntry?.({
        schema_version: 1,
        seq: 1,
        timestamp: '2026-03-13T10:30:00.000Z',
        task_id: 'task-1',
        run_id: 'run-1',
        event: 'run_started',
        actor: 'runner',
        payload: null
      });
      return () => {
        order.push('detach');
      };
    });

    const lifecycle = await startOrchestratorControlPlaneLifecycle({
      repoRoot: '/tmp/repo',
      paths: { runDir: '/tmp/run' } as never,
      taskId: 'task-1',
      runId: 'run-1',
      pipeline: { id: 'pipe', title: 'Pipeline' },
      emitter: { on: vi.fn() } as never
    });

    expect(RunEventStream.create).toHaveBeenCalledWith({
      paths: { runDir: '/tmp/run' },
      taskId: 'task-1',
      runId: 'run-1',
      pipelineId: 'pipe',
      pipelineTitle: 'Pipeline'
    });
    expect(ControlServer.start).toHaveBeenCalledWith({
      paths: { runDir: '/tmp/run' },
      config: { ui: { controlEnabled: true } },
      eventStream,
      runId: 'run-1'
    });
    expect(controlServer.broadcast).toHaveBeenCalledOnce();

    await lifecycle.close();

    expect(order).toEqual(['detach', 'server', 'stream']);
  });

  it('closes the event stream when startup fails after stream creation', async () => {
    const { RunEventStream } = await import('../src/cli/events/runEventStream.js');
    const {
      loadDelegationConfigFiles,
      computeEffectiveDelegationConfig
    } = await import('../src/cli/config/delegationConfig.js');
    const { ControlServer } = await import('../src/cli/control/controlServer.js');

    const eventStream = {
      close: vi.fn(async () => undefined)
    };
    vi.mocked(RunEventStream.create).mockResolvedValue(eventStream as never);
    vi.mocked(loadDelegationConfigFiles).mockResolvedValue({
      global: null,
      repo: null
    } as never);
    vi.mocked(computeEffectiveDelegationConfig).mockReturnValue({
      ui: { controlEnabled: true }
    } as never);
    vi.mocked(ControlServer.start).mockRejectedValue(new Error('boom'));

    await expect(
      startOrchestratorControlPlaneLifecycle({
        repoRoot: '/tmp/repo',
        paths: { runDir: '/tmp/run' } as never,
        taskId: 'task-1',
        runId: 'run-1',
        pipeline: { id: 'pipe', title: 'Pipeline' },
        emitter: { on: vi.fn() } as never
      })
    ).rejects.toThrow('boom');

    expect(eventStream.close).toHaveBeenCalledOnce();
  });

  it('closes the control server and event stream when adapter attachment fails', async () => {
    const { RunEventStream, attachRunEventAdapter } = await import('../src/cli/events/runEventStream.js');
    const {
      loadDelegationConfigFiles,
      computeEffectiveDelegationConfig
    } = await import('../src/cli/config/delegationConfig.js');
    const { ControlServer } = await import('../src/cli/control/controlServer.js');

    const order: string[] = [];
    const eventStream = {
      close: vi.fn(async () => {
        order.push('stream');
      })
    };
    const controlServer = {
      close: vi.fn(async () => {
        order.push('server');
      })
    };
    vi.mocked(RunEventStream.create).mockResolvedValue(eventStream as never);
    vi.mocked(loadDelegationConfigFiles).mockResolvedValue({
      global: null,
      repo: null
    } as never);
    vi.mocked(computeEffectiveDelegationConfig).mockReturnValue({
      ui: { controlEnabled: true }
    } as never);
    vi.mocked(ControlServer.start).mockResolvedValue(controlServer as never);
    vi.mocked(attachRunEventAdapter).mockImplementation(() => {
      throw new Error('attach failed');
    });

    await expect(
      startOrchestratorControlPlaneLifecycle({
        repoRoot: '/tmp/repo',
        paths: { runDir: '/tmp/run' } as never,
        taskId: 'task-1',
        runId: 'run-1',
        pipeline: { id: 'pipe', title: 'Pipeline' },
        emitter: { on: vi.fn() } as never
      })
    ).rejects.toThrow('attach failed');

    expect(order).toEqual(['server', 'stream']);
  });

  it('skips control server startup when control is disabled and still closes cleanly', async () => {
    const { RunEventStream, attachRunEventAdapter } = await import('../src/cli/events/runEventStream.js');
    const {
      loadDelegationConfigFiles,
      computeEffectiveDelegationConfig
    } = await import('../src/cli/config/delegationConfig.js');
    const { ControlServer } = await import('../src/cli/control/controlServer.js');

    const order: string[] = [];
    const eventStream = {
      close: vi.fn(async () => {
        order.push('stream');
      })
    };
    vi.mocked(RunEventStream.create).mockResolvedValue(eventStream as never);
    vi.mocked(loadDelegationConfigFiles).mockResolvedValue({
      global: null,
      repo: null
    } as never);
    vi.mocked(computeEffectiveDelegationConfig).mockReturnValue({
      ui: { controlEnabled: false }
    } as never);
    vi.mocked(attachRunEventAdapter).mockImplementation(() => () => {
      order.push('detach');
    });

    const lifecycle = await startOrchestratorControlPlaneLifecycle({
      repoRoot: '/tmp/repo',
      paths: { runDir: '/tmp/run' } as never,
      taskId: 'task-1',
      runId: 'run-1',
      pipeline: { id: 'pipe', title: 'Pipeline' },
      emitter: { on: vi.fn() } as never
    });

    lifecycle.onEventEntry({
      schema_version: 1,
      seq: 1,
      timestamp: '2026-03-13T10:30:00.000Z',
      task_id: 'task-1',
      run_id: 'run-1',
      event: 'run_started',
      actor: 'runner',
      payload: null
    });
    await lifecycle.close();

    expect(ControlServer.start).not.toHaveBeenCalled();
    expect(order).toEqual(['detach', 'stream']);
  });
});
