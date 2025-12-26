import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

import { resolveEnvironment } from '../src/cli/run/environment.js';
import { bootstrapManifest } from '../src/cli/run/manifest.js';
import { ManifestPersister } from '../src/cli/run/manifestPersister.js';
import type { PipelineDefinition } from '../src/cli/types.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'manifest-persister-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'task-persister';
});

afterEach(async () => {
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('ManifestPersister', () => {
  it('serializes manifest writes', async () => {
    const env = resolveEnvironment();
    const pipeline: PipelineDefinition = {
      id: 'persister',
      title: 'Persister Pipeline',
      stages: [
        {
          kind: 'command',
          id: 'stage',
          title: 'Stage',
          command: 'echo ok'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-persister', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    let inFlight = 0;
    let maxInFlight = 0;
    let callCount = 0;

    let persister: ManifestPersister | null = null;
    let scheduled = false;
    const persisterInstance = new ManifestPersister({
      manifest,
      paths,
      persistIntervalMs: 0,
      writeManifest: async () => {
        callCount += 1;
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        if (!scheduled && persister) {
          scheduled = true;
          void persister.schedule({ manifest: true, force: true });
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
      },
      writeHeartbeat: async () => {}
    });
    persister = persisterInstance;

    await persisterInstance.schedule({ manifest: true, force: true });
    await persisterInstance.flush();

    expect(callCount).toBe(2);
    expect(maxInFlight).toBe(1);
  });

  it('coalesces pending manifest writes', async () => {
    const env = resolveEnvironment();
    const pipeline: PipelineDefinition = {
      id: 'persister-coalesce',
      title: 'Persister Coalesce Pipeline',
      stages: [
        {
          kind: 'command',
          id: 'stage',
          title: 'Stage',
          command: 'echo ok'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-persister-coalesce', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    let callCount = 0;
    const persister = new ManifestPersister({
      manifest,
      paths,
      persistIntervalMs: 10,
      writeManifest: async () => {
        callCount += 1;
      },
      writeHeartbeat: async () => {}
    });

    const first = persister.schedule({ manifest: true });
    const second = persister.schedule({ manifest: true });
    await persister.flush();
    await Promise.all([first, second]);

    expect(callCount).toBe(1);
  });
});
