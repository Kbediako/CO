import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
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
        correlationId: 'corr-collab-cap',
        timestamp: '2026-02-18T00:00:00.000Z',
        attempt: 1,
        payload: {
          command: 'echo collab',
          args: [],
          cwd: '/tmp',
          sessionId: 'session-collab-cap',
          sandboxState: 'sandboxed',
          persisted: false
        }
      };
      const chunk: import('../../packages/shared/events/types.js').ExecEvent = {
        type: 'exec:chunk',
        correlationId: 'corr-collab-cap',
        timestamp: '2026-02-18T00:00:00.100Z',
        attempt: 1,
        payload: {
          stream: 'stdout',
          sequence: 1,
          bytes: 1,
          data:
            '{"type":"item.completed","item":{"type":"collab_tool_call","id":"item_1","tool":"spawn_agent","status":"completed","sender_thread_id":"parent","receiver_thread_ids":["agent-1"]}}\n' +
            '{"type":"item.completed","item":{"type":"collab_tool_call","id":"item_2","tool":"close_agent","status":"completed","sender_thread_id":"parent","receiver_thread_ids":["agent-1"]}}\n'
        }
      };
      const end: import('../../packages/shared/events/types.js').ExecEvent = {
        type: 'exec:end',
        correlationId: 'corr-collab-cap',
        timestamp: '2026-02-18T00:00:00.200Z',
        attempt: 1,
        payload: {
          exitCode: 0,
          signal: null,
          durationMs: 5,
          status: 'succeeded',
          sandboxState: 'sandboxed',
          sessionId: 'session-collab-cap',
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
        correlationId: 'corr-collab-cap',
        stdout: 'ok\n',
        stderr: '',
        exitCode: 0,
        signal: null,
        durationMs: 5,
        status: 'succeeded' as const,
        sandboxState: 'sandboxed' as const,
        record: {
          id: 'tool-run-collab-cap',
          tool: 'exec',
          approvalSource: 'not-required',
          retryCount: 0,
          sandboxState: 'sandboxed',
          status: 'succeeded',
          startedAt: '2026-02-18T00:00:00.000Z',
          completedAt: '2026-02-18T00:00:00.200Z',
          attemptCount: 1,
          metadata: {},
          events: []
        },
        events: [begin, chunk, end]
      } satisfies import('../../packages/orchestrator/src/exec/unified-exec.js').UnifiedExecRunResult;
    }
  };

  return {
    getCliExecRunner: () => runner,
    getPrivacyGuard: () => ({
      getMetrics: () => ({
        mode: 'shadow' as const,
        totalFrames: 0,
        redactedFrames: 0,
        blockedFrames: 0,
        allowedFrames: 0,
        decisions: []
      })
    }),
    getExecHandleService: () => ({
      getDescriptor: () => ({
        id: 'handle-collab-cap',
        correlationId: 'corr-collab-cap',
        createdAt: '2026-02-18T00:00:00.000Z',
        frameCount: 0,
        status: 'closed' as const,
        latestSequence: 0
      })
    })
  };
});

import { resolveEnvironmentPaths } from '../../scripts/lib/run-manifests.js';
import { normalizeEnvironmentPaths } from '../src/cli/run/environment.js';
import { bootstrapManifest } from '../src/cli/run/manifest.js';
import { runCommandStage } from '../src/cli/services/commandRunner.js';
import type { CommandStage, PipelineDefinition } from '../src/cli/types.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'cmd-collab-cap-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'task-collab-cap';
});

afterEach(async () => {
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('runCommandStage collab capture limit persistence', () => {
  it('uses the manifest capture limit as the source of truth for collab event capture', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'pipeline-collab-cap',
      title: 'Collab Cap',
      stages: [
        {
          kind: 'command',
          id: 'stage-collab-cap',
          title: 'Emit collab lines',
          command: 'echo collab'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-collab-cap', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });
    manifest.collab_tool_calls_max_events = 1;

    const stage = pipeline.stages[0] as CommandStage;
    await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(manifest.collab_tool_calls_max_events).toBe(1);
    expect(manifest.collab_tool_calls).toHaveLength(1);
    expect(manifest.collab_tool_calls?.[0]?.tool).toBe('spawn_agent');
  });
  it('keeps legacy unknown capture limits unset when resuming runs with existing collab history', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'pipeline-collab-cap-legacy',
      title: 'Collab Cap Legacy',
      stages: [
        {
          kind: 'command',
          id: 'stage-collab-cap-legacy',
          title: 'Emit collab lines',
          command: 'echo collab'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-collab-cap-legacy', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });
    manifest.collab_tool_calls = [
      {
        observed_at: '2026-02-18T00:00:00.000Z',
        stage_id: 'legacy-stage',
        command_index: 0,
        event_type: 'item.completed',
        item_id: 'legacy-spawn',
        tool: 'spawn_agent',
        status: 'completed',
        sender_thread_id: 'parent',
        receiver_thread_ids: ['legacy-agent']
      }
    ];
    delete manifest.collab_tool_calls_max_events;

    const stage = pipeline.stages[0] as CommandStage;
    await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(manifest.collab_tool_calls_max_events).toBeUndefined();
    expect(manifest.collab_tool_calls).toHaveLength(3);
  });
});
