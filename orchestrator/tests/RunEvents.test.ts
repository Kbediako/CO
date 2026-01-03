import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

vi.mock('../src/cli/services/execRuntime.js', () => {
  const listeners = new Set<(event: import('../../packages/shared/events/types.js').ExecEvent) => void>();

  const runner = {
    on(listener: (event: import('../../packages/shared/events/types.js').ExecEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async run() {
      const begin: import('../../packages/shared/events/types.js').ExecEvent = {
        type: 'exec:begin',
        correlationId: 'corr-run-events',
        timestamp: '2025-01-01T00:00:00Z',
        attempt: 1,
        payload: {
          command: 'echo ok',
          args: [],
          cwd: '/tmp',
          sessionId: 'session-1',
          sandboxState: 'sandboxed',
          persisted: false
        }
      };
      const chunk: import('../../packages/shared/events/types.js').ExecEvent = {
        type: 'exec:chunk',
        correlationId: 'corr-run-events',
        timestamp: '2025-01-01T00:00:01Z',
        attempt: 1,
        payload: {
          stream: 'stdout',
          sequence: 1,
          bytes: 3,
          data: 'ok\n'
        }
      };
      const end: import('../../packages/shared/events/types.js').ExecEvent = {
        type: 'exec:end',
        correlationId: 'corr-run-events',
        timestamp: '2025-01-01T00:00:02Z',
        attempt: 1,
        payload: {
          exitCode: 0,
          signal: null,
          durationMs: 5,
          status: 'succeeded',
          sandboxState: 'sandboxed',
          sessionId: 'session-1',
          stdout: 'ok\n',
          stderr: ''
        }
      };

      for (const event of [begin, chunk, end]) {
        for (const listener of listeners) {
          listener(event);
        }
      }

      return {
        correlationId: 'corr-run-events',
        stdout: 'ok\n',
        stderr: '',
        exitCode: 0,
        signal: null,
        durationMs: 5,
        status: 'succeeded' as const,
        sandboxState: 'sandboxed' as const,
        record: {
          id: 'tool-run-events',
          tool: 'exec',
          approvalSource: 'not-required',
          retryCount: 0,
          sandboxState: 'sandboxed',
          status: 'succeeded',
          startedAt: '2025-01-01T00:00:00Z',
          completedAt: '2025-01-01T00:00:02Z',
          attemptCount: 1,
          metadata: {},
          events: []
        },
        events: [begin, chunk, end]
      } satisfies import('../../packages/orchestrator/src/exec/unified-exec.js').UnifiedExecRunResult;
    }
  };

  const privacyMetrics = {
    mode: 'shadow' as const,
    totalFrames: 0,
    redactedFrames: 0,
    blockedFrames: 0,
    allowedFrames: 0,
    decisions: []
  };

  return {
    getCliExecRunner: () => runner,
    getPrivacyGuard: () => ({
      getMetrics: () => privacyMetrics
    }),
    getExecHandleService: () => ({
      getDescriptor: () => ({
        id: 'handle-run-events',
        correlationId: 'corr-run-events',
        createdAt: '2025-01-01T00:00:00Z',
        frameCount: 0,
        status: 'closed' as const,
        latestSequence: 0
      })
    })
  };
});

import { RunEventEmitter, RunEventPublisher, type RunEvent } from '../src/cli/events/runEvents.js';
import { runCommandStage } from '../src/cli/services/commandRunner.js';
import { resolveEnvironmentPaths } from '../../scripts/lib/run-manifests.js';
import { normalizeEnvironmentPaths } from '../src/cli/run/environment.js';
import { bootstrapManifest } from '../src/cli/run/manifest.js';
import type { CommandStage, PipelineDefinition } from '../src/cli/types.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'run-events-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = '0407-orchestrator-interactive-hud';
});

afterEach(async () => {
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('RunEvents publisher', () => {
  it('emits stage lifecycle and log events from command stages after manifest writes', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'pipeline-run-events',
      title: 'Run Events',
      stages: [
        {
          kind: 'command',
          id: 'stage-one',
          title: 'Echo ok',
          command: 'echo ok'
        }
      ]
    };
    const runId = 'run-events';
    const { manifest, paths } = await bootstrapManifest(runId, {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const emitter = new RunEventEmitter();
    const publisher = new RunEventPublisher(emitter, {
      taskId: env.taskId,
      runId,
      pipelineId: pipeline.id,
      pipelineTitle: pipeline.title,
      manifestPath: paths.manifestPath,
      logPath: paths.logPath
    });

    const events: RunEvent[] = [];
    const unsubscribe = emitter.on('*', (event) => events.push(event));

    const stage = pipeline.stages[0] as CommandStage;
    const result = await runCommandStage({
      env,
      paths,
      manifest,
      stage,
      index: 1,
      events: publisher
    });

    unsubscribe();

    expect(result.summary).toContain('ok');
    const eventTypes = events.map((event) => event.type);
    expect(eventTypes).toContain('stage:started');
    expect(eventTypes).toContain('log');
    expect(eventTypes).toContain('stage:completed');

    const stageCompleted = events.find((event) => event.type === 'stage:completed') as Extract<RunEvent, { type: 'stage:completed' }> | undefined;
    expect(stageCompleted?.status).toBe('succeeded');
    expect(stageCompleted?.logPath).toBe(manifest.commands[0]?.log_path);

    const logEvent = events.find((event) => event.type === 'log') as Extract<RunEvent, { type: 'log' }> | undefined;
    expect(logEvent?.message).toContain('ok');
  });

  it('keeps manifests identical with and without RunEvents', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    try {
      const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
      const pipeline: PipelineDefinition = {
        id: 'pipeline-run-events',
        title: 'Run Events',
        stages: [
          {
            kind: 'command',
            id: 'stage-one',
            title: 'Echo ok',
            command: 'echo ok'
          }
        ]
      };
      const runId = 'run-parity';

      const executeOnce = async (withEvents: boolean) => {
        const { manifest, paths } = await bootstrapManifest(runId, {
          env,
          pipeline,
          parentRunId: null,
          taskSlug: env.taskId,
          approvalPolicy: null
        });
        const publisher = withEvents
          ? new RunEventPublisher(new RunEventEmitter(), {
              taskId: env.taskId,
              runId,
              pipelineId: pipeline.id,
              pipelineTitle: pipeline.title,
              manifestPath: paths.manifestPath,
              logPath: paths.logPath
            })
          : null;
        const stage = pipeline.stages[0] as CommandStage;
        await runCommandStage({
          env,
          paths,
          manifest,
          stage,
          index: 1,
          events: publisher ?? undefined
        });
        const snapshot = JSON.parse(await readFile(paths.manifestPath, 'utf8'));
        delete snapshot.resume_token;
        await rm(paths.runDir, { recursive: true, force: true });
        return snapshot;
      };

      const withEvents = await executeOnce(true);
      const withoutEvents = await executeOnce(false);

      expect(withEvents).toEqual(withoutEvents);
    } finally {
      vi.useRealTimers();
    }
  });
});
