import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { executeOrchestratorLocalPipeline } from '../src/cli/services/orchestratorLocalPipelineExecutor.js';
import { resolveEnvironmentPaths } from '../../scripts/lib/run-manifests.js';
import { normalizeEnvironmentPaths } from '../src/cli/run/environment.js';
import { bootstrapManifest, updateCommandStatus } from '../src/cli/run/manifest.js';
import { ManifestPersister } from '../src/cli/run/manifestPersister.js';
import type { PipelineDefinition, PipelineExecutionResult } from '../src/cli/types.js';
import type { RunEventPublisher } from '../src/cli/events/runEvents.js';
import * as CommandRunner from '../src/cli/services/commandRunner.js';
import { isoTimestamp } from '../src/cli/utils/time.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'orchestrator-local-executor-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'task-local-executor';
});

afterEach(async () => {
  vi.restoreAllMocks();
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('executeOrchestratorLocalPipeline', () => {
  it('does not rerun already-completed entries and still appends notes', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'local-parent',
      title: 'Local Parent',
      stages: [
        {
          kind: 'command',
          id: 'completed',
          title: 'Completed Stage',
          command: 'echo completed'
        },
        {
          kind: 'command',
          id: 'pending',
          title: 'Pending Stage',
          command: 'echo pending'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-local-parent', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });
    const persister = new ManifestPersister({ manifest, paths, persistIntervalMs: 1000 });

    updateCommandStatus(manifest, 0, {
      status: 'succeeded',
      started_at: isoTimestamp(),
      completed_at: isoTimestamp(),
      exit_code: 0,
      summary: 'already done'
    });

    const commandSpy = vi.spyOn(CommandRunner, 'runCommandStage').mockImplementation(async ({ manifest }) => {
      updateCommandStatus(manifest, 1, {
        status: 'succeeded',
        started_at: isoTimestamp(),
        completed_at: isoTimestamp(),
        exit_code: 0,
        summary: 'command ok'
      });
      return { exitCode: 0, summary: 'command ok' };
    });

    const result = await executeOrchestratorLocalPipeline({
      env,
      pipeline,
      manifest,
      paths,
      persister,
      runtimeMode: 'appserver',
      runtimeSessionId: null,
      controlWatcher: {
        sync: async () => {},
        waitForResume: async () => {},
        isCanceled: () => false
      },
      schedulePersist: async () => {},
      startSubpipeline: vi.fn(async () => {
        throw new Error('unexpected');
      })
    });

    expect(result.success).toBe(true);
    expect(commandSpy).toHaveBeenCalledTimes(1);
    expect(commandSpy.mock.calls[0]?.[0].stage.id).toBe('pending');
    expect(result.notes).toContain('Completed Stage: succeeded');
    expect(result.notes).toContain('Pending Stage: command ok');
  });

  it('fails non-optional subpipeline throws without recording a bogus child run', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'parent',
      title: 'Parent',
      stages: [
        {
          kind: 'subpipeline',
          id: 'child',
          title: 'Child Stage',
          pipeline: 'missing-child'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-parent', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });
    const persister = new ManifestPersister({ manifest, paths, persistIntervalMs: 1000 });
    const runEvents = {
      stageStarted: vi.fn(),
      stageCompleted: vi.fn()
    } as unknown as RunEventPublisher;

    const startSubpipeline = vi.fn<() => Promise<PipelineExecutionResult>>(async () => {
      throw new Error('boom');
    });

    const result = await executeOrchestratorLocalPipeline({
      env,
      pipeline,
      manifest,
      paths,
      persister,
      runtimeMode: 'appserver',
      runtimeSessionId: null,
      runEvents,
      controlWatcher: {
        sync: async () => {},
        waitForResume: async () => {},
        isCanceled: () => false
      },
      schedulePersist: async () => {},
      startSubpipeline
    });

    expect(result.success).toBe(false);
    expect(startSubpipeline).toHaveBeenCalledOnce();
    expect(manifest.commands[0]?.status).toBe('failed');
    expect(manifest.commands[0]?.command).toBeNull();
    expect(manifest.commands[0]?.completed_at).not.toBeNull();
    expect(manifest.commands[0]?.summary).toContain('Sub-pipeline error: boom');
    expect(manifest.status_detail).toBe('subpipeline:missing-child:error');
    expect(manifest.child_runs).toHaveLength(0);
    expect(runEvents.stageCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        stageId: 'child',
        status: 'failed',
        summary: expect.stringContaining('Sub-pipeline error: boom'),
        subRunId: null
      })
    );
    expect(result.notes).toContain('Child Stage: failed');
  });

  it('records successful child runs and emits completion payloads', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'parent',
      title: 'Parent',
      stages: [
        {
          kind: 'subpipeline',
          id: 'child',
          title: 'Child Stage',
          pipeline: 'child-pipeline'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-parent-success', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });
    const persister = new ManifestPersister({ manifest, paths, persistIntervalMs: 1000 });
    const runEvents = {
      stageStarted: vi.fn(),
      stageCompleted: vi.fn()
    } as unknown as RunEventPublisher;

    const childResult: PipelineExecutionResult = {
      manifest: {
        ...manifest,
        run_id: 'child-run-1',
        status: 'succeeded',
        artifact_root: '.runs/task-local-executor/cli/child-run-1'
      },
      runSummary: {
        review: { summary: 'child ok' }
      } as PipelineExecutionResult['runSummary']
    };

    const result = await executeOrchestratorLocalPipeline({
      env,
      pipeline,
      manifest,
      paths,
      persister,
      runtimeMode: 'appserver',
      runtimeSessionId: null,
      runEvents,
      controlWatcher: {
        sync: async () => {},
        waitForResume: async () => {},
        isCanceled: () => false
      },
      schedulePersist: async () => {},
      startSubpipeline: vi.fn(async () => childResult)
    });

    expect(result.success).toBe(true);
    expect(manifest.commands[0]).toMatchObject({
      status: 'succeeded',
      sub_run_id: 'child-run-1',
      summary: 'child ok',
      command: null
    });
    expect(manifest.child_runs).toEqual([
      expect.objectContaining({
        run_id: 'child-run-1',
        pipeline_id: 'child-pipeline',
        status: 'succeeded',
        manifest: expect.stringContaining('child-run-1/manifest.json')
      })
    ]);
    expect(runEvents.stageCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        stageId: 'child',
        status: 'succeeded',
        summary: 'child ok',
        subRunId: 'child-run-1'
      })
    );
    expect(result.notes).toContain('Child Stage: succeeded');
  });
});
