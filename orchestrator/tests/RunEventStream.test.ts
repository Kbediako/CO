import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

import { bootstrapManifest } from '../src/cli/run/manifest.js';
import { normalizeEnvironmentPaths } from '../src/cli/run/environment.js';
import { resolveEnvironmentPaths } from '../../scripts/lib/run-manifests.js';
import { RunEventEmitter, RunEventPublisher } from '../src/cli/events/runEvents.js';
import { attachRunEventAdapter, RunEventStream } from '../src/cli/events/runEventStream.js';
import type { PipelineDefinition } from '../src/cli/types.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'run-event-stream-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = '0940-delegation-autonomy-platform';
});

afterEach(async () => {
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('RunEventStream', () => {
  it('maps run events into events.jsonl with monotonic seq', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'pipeline-run-event-stream',
      title: 'Run Event Stream',
      stages: [
        {
          kind: 'command',
          id: 'stage-one',
          title: 'Echo ok',
          command: 'echo ok'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-event-stream', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const emitter = new RunEventEmitter();
    const stream = await RunEventStream.create({
      paths,
      taskId: manifest.task_id,
      runId: manifest.run_id,
      pipelineId: pipeline.id,
      pipelineTitle: pipeline.title,
      now: () => '2026-01-01T00:00:00Z'
    });
    const unsubscribe = attachRunEventAdapter(emitter, stream);

    const publisher = new RunEventPublisher(emitter, {
      taskId: manifest.task_id,
      runId: manifest.run_id,
      pipelineId: pipeline.id,
      pipelineTitle: pipeline.title,
      manifestPath: paths.manifestPath,
      logPath: paths.logPath
    });

    publisher.runStarted([], 'in_progress');
    publisher.stageStarted({
      stageId: 'stage-one',
      stageIndex: 1,
      title: 'Echo ok',
      kind: 'command',
      logPath: null,
      status: 'running'
    });
    publisher.stageCompleted({
      stageId: 'stage-one',
      stageIndex: 1,
      title: 'Echo ok',
      kind: 'command',
      status: 'succeeded',
      exitCode: 0,
      summary: 'ok',
      logPath: null
    });
    publisher.runCompleted({
      pipelineId: pipeline.id,
      status: 'succeeded',
      manifestPath: paths.manifestPath,
      runSummaryPath: null,
      metricsPath: null,
      summary: 'ok'
    });

    unsubscribe();
    await stream.close();

    const raw = await readFile(paths.eventsPath, 'utf8');
    const lines = raw.trim().split('\n').map((line) => JSON.parse(line));

    expect(lines.map((entry) => entry.event)).toEqual([
      'run_started',
      'step_started',
      'step_completed',
      'run_completed'
    ]);
    expect(lines[0].seq).toBe(1);
    expect(lines[lines.length - 1].seq).toBe(lines.length);
  });
});
