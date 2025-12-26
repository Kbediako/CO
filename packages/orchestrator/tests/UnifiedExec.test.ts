import { describe, expect, it, vi } from 'vitest';
import { UnifiedExecRunner } from '../src/exec/unified-exec.js';
import { ExecSessionManager, type ExecSessionHandle } from '../src/exec/session-manager.js';
import { RemoteExecHandleService } from '../src/exec/handle-service.js';
import { ToolOrchestrator, SandboxRetryableError, ToolInvocationFailedError } from '../src/tool-orchestrator.js';

class TestHandle implements ExecSessionHandle {
  disposed = false;
  constructor(public readonly id: string) {}
  async dispose(): Promise<void> {
    this.disposed = true;
  }
}

function createSessionManager() {
  return new ExecSessionManager<TestHandle>({
    factory: async ({ id }) => new TestHandle(id),
    now: () => new Date('2025-11-04T00:00:00.000Z')
  });
}

function createClock(start = Date.parse('2025-11-04T00:00:00.000Z')) {
  let ticks = 0;
  return () => new Date(start + ticks++ * 1000);
}

describe('UnifiedExecRunner', () => {
  it('emits ordered exec events with aggregated output', async () => {
    const sessionManager = createSessionManager();
    const orchestrator = new ToolOrchestrator({
      now: () => new Date('2025-11-04T00:00:00.000Z')
    });
    const now = createClock();
    const runner = new UnifiedExecRunner<TestHandle>({
      orchestrator,
      sessionManager,
      now,
      executor: async (request) => {
        request.onStdout('hello ');
        request.onStderr('warn');
        request.onStdout('world');
        return { exitCode: 0, signal: null };
      }
    });

    const observed: string[] = [];
    runner.on((event) => {
      observed.push(event.type);
    });

    const result = await runner.run({
      command: 'echo',
      args: ['hello'],
      sessionId: 'shell'
    });

    expect(result.stdout).toBe('hello world');
    expect(result.stderr).toBe('warn');
    expect(result.status).toBe('succeeded');
    expect(result.record.status).toBe('succeeded');
    expect(observed).toEqual(['exec:begin', 'exec:chunk', 'exec:chunk', 'exec:chunk', 'exec:end']);
    expect(result.events.length).toBe(5);
    const chunkEvents = result.events.filter((event) => event.type === 'exec:chunk');
    expect(chunkEvents.map((event) => event.payload.sequence)).toEqual([1, 2, 3]);
    const execMetadata = result.record.metadata?.exec as Record<string, unknown> | undefined;
    expect(execMetadata).toBeDefined();
    expect(execMetadata?.sessionId).toBe('shell');
    expect(execMetadata).not.toHaveProperty('envSnapshot');
  });

  it('caps captured chunk events when event capture is configured', async () => {
    const sessionManager = createSessionManager();
    const orchestrator = new ToolOrchestrator({
      now: () => new Date('2025-11-04T00:00:00.000Z')
    });
    const runner = new UnifiedExecRunner<TestHandle>({
      orchestrator,
      sessionManager,
      now: createClock(),
      executor: async (request) => {
        request.onStdout('one');
        request.onStdout('two');
        request.onStdout('three');
        return { exitCode: 0, signal: null };
      }
    });

    const observed: string[] = [];
    runner.on((event) => {
      observed.push(event.type);
    });

    const result = await runner.run({
      command: 'echo',
      sessionId: 'shell',
      eventCapture: {
        maxChunkEvents: 1
      }
    });

    const capturedChunks = result.events.filter((event) => event.type === 'exec:chunk');
    expect(capturedChunks).toHaveLength(1);
    expect(result.events[0]?.type).toBe('exec:begin');
    expect(result.events[result.events.length - 1]?.type).toBe('exec:end');
    expect(observed.filter((type) => type === 'exec:chunk')).toHaveLength(3);
  });

  it('invokes sandbox retry callbacks and records multiple attempts', async () => {
    const sessionManager = createSessionManager();
    const orchestrator = new ToolOrchestrator({
      now: () => new Date('2025-11-04T00:00:00.000Z'),
      wait: async () => {}
    });
    const runner = new UnifiedExecRunner<TestHandle>({
      orchestrator,
      sessionManager,
      now: createClock()
    });

    let attempts = 0;
    const onRetry = vi.fn(async () => {});

    const result = await runner.run({
      command: 'echo',
      args: ['retry'],
      sessionId: 'shell',
      sandbox: {
        onRetry
      },
      invocationId: 'exec-retry',
      toolId: 'exec'
    });

    expect(result.record.retryCount).toBe(0); // since executor never threw
    expect(onRetry).not.toHaveBeenCalled();

    const retryingExecutorRunner = new UnifiedExecRunner<TestHandle>({
      orchestrator,
      sessionManager,
      now: createClock(),
      executor: async (request) => {
        attempts += 1;
        if (attempts === 1) {
          throw new SandboxRetryableError('retry me', 'escalated');
        }
        request.onStdout('done');
        return { exitCode: 0, signal: null };
      }
    });

    const retryResult = await retryingExecutorRunner.run({
      command: 'echo',
      sessionId: 'shell',
      sandbox: {
        onRetry
      }
    });

    expect(attempts).toBe(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(retryResult.record.retryCount).toBe(1);
    expect(retryResult.record.status).toBe('succeeded');
    const beginEvents = retryResult.events.filter((event) => event.type === 'exec:begin');
    expect(beginEvents).toHaveLength(2);
    const retryEvents = retryResult.events.filter((event) => event.type === 'exec:retry');
    expect(retryEvents).toHaveLength(1);
    expect(retryEvents[0].attempt).toBe(1);
  });

  it('enforces stdout buffer limits', async () => {
    const sessionManager = createSessionManager();
    const orchestrator = new ToolOrchestrator();
    const runner = new UnifiedExecRunner<TestHandle>({
      orchestrator,
      sessionManager,
      now: createClock(),
      maxBufferBytes: 16,
      executor: async (request) => {
        request.onStdout('abcdefgh');
        request.onStdout('ijklmnop');
        request.onStdout('qrstuvwx');
        return { exitCode: 0, signal: null };
      }
    });

    const result = await runner.run({
      command: 'echo',
      sessionId: 'shell'
    });

    expect(result.stdout).toBe('ijklmnopqrstuvwx');
    expect(result.stdout.length).toBe(16);
    expect(result.record.status).toBe('succeeded');
    expect(result.record.metadata?.exec).not.toHaveProperty('envSnapshot');
  });

  it('propagates spawn errors through orchestrator failure path', async () => {
    const sessionManager = createSessionManager();
    const orchestrator = new ToolOrchestrator({
      wait: async () => {},
      now: () => new Date('2025-11-04T00:00:00.000Z')
    });
    const runner = new UnifiedExecRunner<TestHandle>({
      orchestrator,
      sessionManager,
      now: createClock()
    });

    await expect(
      runner.run({
        command: '__definitely_not_real_command__',
        sessionId: 'shell'
      })
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof ToolInvocationFailedError)) {
        return false;
      }
      expect(error.record.status).toBe('failed');
      expect(error.record.tool).toBe('exec');
      expect(error.cause).toBeInstanceOf(Error);
      expect((error.cause as Error).message).toMatch(/__definitely_not_real_command__/);
      expect(error.record.metadata?.exec).not.toHaveProperty('envSnapshot');
      const events = error.record.events;
      expect(events).toBeDefined();
      if (events) {
        expect(events[0].type).toBe('exec:begin');
        expect(events[events.length - 1].type).toBe('exec:end');
      }
      return true;
    });
  });

  it('issues streaming handles and records frames', async () => {
    const sessionManager = createSessionManager();
    const orchestrator = new ToolOrchestrator({
      now: () => new Date('2025-11-04T00:00:00.000Z')
    });
    const handleService = new RemoteExecHandleService({ now: () => new Date('2025-11-04T00:00:00.000Z') });
    const runner = new UnifiedExecRunner<TestHandle>({
      orchestrator,
      sessionManager,
      now: createClock(),
      handleService,
      executor: async (request) => {
        request.onStdout('frame-1');
        request.onStdout('frame-2');
        return { exitCode: 0, signal: null };
      }
    });

    const result = await runner.run({ command: 'echo', sessionId: 'shell' });
    expect(result.handle).toBeDefined();
    const descriptor = result.handle!;
    expect(descriptor.status).toBe('closed');
    expect(descriptor.frameCount).toBeGreaterThanOrEqual(4); // begin, two chunks, end
  });

  it('retains handle metadata when executor fails', async () => {
    // This test enforces the contract that UnifiedExecRunner always embeds the
    // issued streaming handle id into ToolInvocationFailedError metadata. If
    // future changes stop populating exec.handleId, both this test and the CLI
    // failure regression (orchestrator/tests/CommandRunnerFailure.test.ts) will
    // fail, signalling that downstream manifests/metrics can no longer rely on
    // handle persistence.
    const sessionManager = createSessionManager();
    const orchestrator = new ToolOrchestrator({
      wait: async () => {},
      now: () => new Date('2025-11-04T00:00:00.000Z')
    });
    const handleService = new RemoteExecHandleService({ now: () => new Date('2025-11-04T00:00:00.000Z') });
    const runner = new UnifiedExecRunner<TestHandle>({
      orchestrator,
      sessionManager,
      now: createClock(),
      handleService,
      executor: async () => {
        throw new Error('simulated failure');
      }
    });

    await expect(
      runner.run({
        command: 'echo',
        sessionId: 'shell',
        invocationId: 'failure-case'
      })
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof ToolInvocationFailedError)) {
        return false;
      }
      const execMetadata = error.record.metadata?.exec as Record<string, unknown> | undefined;
      expect(execMetadata?.handleId).toBeDefined();
      expect(typeof execMetadata?.handleId).toBe('string');
      return true;
    });
  });
});
