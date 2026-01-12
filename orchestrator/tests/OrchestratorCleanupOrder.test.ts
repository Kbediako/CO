import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { CodexOrchestrator } from '../src/cli/orchestrator.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import type { RunPaths } from '../src/cli/run/runPaths.js';
import type { CliManifest } from '../src/cli/types.js';
import type { CommandPlanner } from '../src/cli/adapters/index.js';
import type { PipelineResolver } from '../src/cli/services/pipelineResolver.js';
import type { PlanResult } from '../src/types.js';
import { RunEventStream } from '../src/cli/events/runEventStream.js';
import { ControlServer } from '../src/cli/control/controlServer.js';
import * as runPreparation from '../src/cli/services/runPreparation.js';
import * as manifestModule from '../src/cli/run/manifest.js';

const ORIGINAL_ENV = {
  configOverrides: process.env.CODEX_CONFIG_OVERRIDES
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'orchestrator-cleanup-'));
  process.env.CODEX_CONFIG_OVERRIDES = 'ui.control_enabled=true';
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (ORIGINAL_ENV.configOverrides === undefined) {
    delete process.env.CODEX_CONFIG_OVERRIDES;
  } else {
    process.env.CODEX_CONFIG_OVERRIDES = ORIGINAL_ENV.configOverrides;
  }
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('CodexOrchestrator cleanup ordering', () => {
  it('closes the control server before the event stream on start failure', async () => {
    const order: string[] = [];
    const env: EnvironmentPaths = {
      repoRoot: workspaceRoot,
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'task-1'
    };
    const pipeline: PipelineDefinition = {
      id: 'pipeline-1',
      title: 'Pipeline',
      stages: []
    };
    const manifest: CliManifest = {
      task_id: env.taskId,
      pipeline_id: pipeline.id,
      pipeline_title: pipeline.title,
      heartbeat_interval_seconds: 1
    } as CliManifest;
    const paths: RunPaths = {
      runDir: workspaceRoot,
      manifestPath: join(workspaceRoot, 'manifest.json'),
      logPath: join(workspaceRoot, 'run.log')
    } as RunPaths;

    vi.spyOn(runPreparation, 'prepareRun').mockResolvedValue({
      env,
      pipeline,
      pipelineSource: null,
      envOverrides: {},
      planner: {} as CommandPlanner,
      plannerTargetId: null,
      taskContext: { id: env.taskId, title: 'Task', metadata: {} },
      metadata: { id: env.taskId, slug: env.taskId, title: 'Task' },
      resolver: {} as PipelineResolver,
      planPreview: { items: [] } as PlanResult
    });
    vi.spyOn(manifestModule, 'bootstrapManifest').mockResolvedValue({ manifest, paths });
    vi.spyOn(RunEventStream, 'create').mockResolvedValue({
      append: async () => ({}) as import('../src/cli/events/runEventStream.js').RunEventStreamEntry,
      close: async () => {
        order.push('eventStream.close');
      }
    } as unknown as RunEventStream);
    vi.spyOn(ControlServer, 'start').mockResolvedValue({
      broadcast: () => undefined,
      close: async () => {
        order.push('controlServer.close');
      }
    } as unknown as ControlServer);

    const orchestrator = new CodexOrchestrator(env);
    vi.spyOn(orchestrator as unknown as { performRunLifecycle: () => Promise<void> }, 'performRunLifecycle')
      .mockRejectedValue(new Error('boom'));

    await expect(orchestrator.start({})).rejects.toThrow('boom');
    expect(order).toEqual(['controlServer.close', 'eventStream.close']);
  });
});
