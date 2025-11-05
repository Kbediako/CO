import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildRunRequestV2 } from '../src/control-plane/request-builder.js';
import {
  buildSchedulerRunSummary,
  createSchedulerPlan,
  finalizeSchedulerPlan,
  serializeSchedulerPlan
} from '../src/scheduler/index.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { CliManifest, PipelineDefinition } from '../src/cli/types.js';
import type { TaskContext } from '../src/types.js';

function createManifest(runId: string, pipeline: PipelineDefinition): CliManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    task_id: 'autonomy-upgrade',
    task_slug: 'autonomy-upgrade',
    run_id: runId,
    parent_run_id: null,
    pipeline_id: pipeline.id,
    pipeline_title: pipeline.title,
    runner: 'codex-cli',
    approval_policy: null,
    status: 'queued',
    status_detail: null,
    started_at: now,
    completed_at: null,
    updated_at: now,
    heartbeat_at: now,
    heartbeat_interval_seconds: 5,
    heartbeat_stale_after_seconds: 30,
    artifact_root: `.runs/autonomy-upgrade/cli/${runId}`,
    compat_path: `.runs/autonomy-upgrade/cli/${runId}/compat`,
    log_path: `.runs/autonomy-upgrade/cli/${runId}/log.ndjson`,
    summary: null,
    metrics_recorded: false,
    resume_token: 'token',
    resume_events: [],
    approvals: [],
    commands: [],
    child_runs: [],
    run_summary_path: null,
    instructions_hash: null,
    instructions_sources: []
  };
}

function createRequest(env: EnvironmentPaths, pipeline: PipelineDefinition, runId: string): {
  task: TaskContext;
  manifest: CliManifest;
  request: ReturnType<typeof buildRunRequestV2>;
} {
  const task: TaskContext = {
    id: 'autonomy-upgrade',
    title: 'Autonomy Upgrade',
    description: 'Scheduler test',
    metadata: { slug: 'autonomy-upgrade' }
  };

  const manifest = createManifest(runId, pipeline);
  const request = buildRunRequestV2({
    runId,
    task,
    pipeline,
    manifest,
    env,
    requestedBy: { actorId: 'test', channel: 'cli' },
    now: () => new Date('2025-11-05T02:00:00Z')
  });

  return { task, manifest, request };
}

describe('createSchedulerPlan', () => {
  it('creates assignments for each capability slot respecting maxInstances', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'scheduler-plan-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'autonomy-upgrade'
    };

    const pipeline: PipelineDefinition = {
      id: 'pipeline-weighted',
      title: 'Weighted Pipeline',
      stages: [{ kind: 'command', id: 'build', title: 'Build', command: 'echo build' }],
      tags: ['general', 'sandbox']
    };

    const { request } = createRequest(env, pipeline, 'run-plan');

    const plan = createSchedulerPlan(request, {
      now: () => new Date('2025-11-05T02:01:00Z'),
      instancePrefix: 'autonomy-upgrade'
    });

    expect(plan.assignments).toHaveLength(request.schedule.maxInstances);
    expect(plan.assignments[0]?.capability).toBe('general');
    expect(plan.assignments[0]?.status).toBe('assigned');
  });

  it('serializes and finalizes plan outcomes', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'scheduler-finalize-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'autonomy-upgrade'
    };

    const pipeline: PipelineDefinition = {
      id: 'pipeline-finalize',
      title: 'Finalize Pipeline',
      stages: [{ kind: 'command', id: 'build', title: 'Build', command: 'echo build' }],
      tags: ['general']
    };

    const { request } = createRequest(env, pipeline, 'run-finalize');
    const plan = createSchedulerPlan(request, {
      now: () => new Date('2025-11-05T03:00:00Z'),
      instancePrefix: 'autonomy-upgrade'
    });

    finalizeSchedulerPlan(plan, 'succeeded', '2025-11-05T03:05:00Z');

    const manifest = serializeSchedulerPlan(plan);
    expect(manifest.assignments[0]?.status).toBe('succeeded');
    expect(manifest.assignments[0]?.attempts[0]?.status).toBe('completed');
    expect(manifest.assignments[0]?.attempts[0]?.recovery_checkpoints).toHaveLength(0);
  });

  it('builds run summary for downstream reporting', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'scheduler-summary-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'autonomy-upgrade'
    };

    const pipeline: PipelineDefinition = {
      id: 'pipeline-summary',
      title: 'Summary Pipeline',
      stages: [{ kind: 'command', id: 'build', title: 'Build', command: 'echo build' }],
      tags: ['general']
    };

    const { request } = createRequest(env, pipeline, 'run-summary');
    const plan = createSchedulerPlan(request, {
      now: () => new Date('2025-11-05T04:00:00Z'),
      instancePrefix: 'autonomy-upgrade'
    });

    finalizeSchedulerPlan(plan, 'failed', '2025-11-05T04:10:00Z');
    expect(plan.assignments[0]?.attempts[0]?.recoveryCheckpoints.length).toBeGreaterThanOrEqual(1);
    const summary = buildSchedulerRunSummary(plan);

    expect(summary.assignments).toHaveLength(1);
    expect(summary.assignments[0]?.status).toBe('failed');
  });
});
