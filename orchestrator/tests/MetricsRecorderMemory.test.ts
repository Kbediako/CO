import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import { appendMetricsEntry } from '../src/cli/metrics/metricsRecorder.js';
import { bootstrapManifest, recordResumeEvent } from '../src/cli/run/manifest.js';

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'metrics-memory-'));
});

afterEach(async () => {
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('metricsRecorder memory observability', () => {
  it('emits selected-memory provenance and bounded counters into metrics.json', async () => {
    const repoRoot = workspaceRoot;
    const pipeline: PipelineDefinition = {
      id: 'pipeline',
      title: 'Pipeline',
      stages: []
    };
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };

    const parent = await bootstrapManifest('run-parent', {
      env: parentEnv,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });
    const parentSource0 = parent.manifest.memory?.source_0;
    expect(parentSource0).toBeTruthy();

    if (parentSource0) {
      await rm(join(repoRoot, parentSource0.dir_path), { recursive: true, force: true });
    }

    const child = await bootstrapManifest('run-child', {
      env: childEnv,
      pipeline,
      parentRunId: 'run-parent',
      taskSlug: null,
      approvalPolicy: null
    });
    recordResumeEvent(child.manifest, {
      actor: 'operator',
      reason: 'manual-resume',
      outcome: 'accepted',
      detail: 'memory-repair: repaired source_0 lineage'
    });

    const now = new Date().toISOString();
    child.manifest.status = 'succeeded';
    child.manifest.completed_at = now;

    await appendMetricsEntry(childEnv, child.paths, child.manifest);

    const metricsPath = join(childEnv.runsRoot, childEnv.taskId, 'metrics.json');
    const raw = await readFile(metricsPath, 'utf8');
    const entry = JSON.parse(raw.trim().split('\n')[0] ?? '{}') as Record<string, unknown>;
    const memory = entry.memory as Record<string, unknown>;
    const counters = memory.counters as Record<string, unknown>;
    const selected = memory.selected_memory as Record<string, unknown>;

    expect(memory.recorded_at).toBeTypeOf('string');
    expect(selected.selection).toBe('fresh_rebuild');
    expect(selected.pointer).toBe(child.manifest.memory?.source_0?.pointer);
    expect(counters.contradiction_count).toBe(0);
    expect(counters.rediscovery_count).toBe(1);
    expect(counters.manual_repair_count).toBe(1);
    expect(counters.resume_latency_ms).toEqual(expect.any(Number));
    expect(counters.repeated_failure_streak).toBe(1);
    expect(counters.retrieval_hits).toBe(0);
    expect(counters.retrieval_misses).toBe(1);
  });

  it('omits memory metrics when the manifest has no memory contract', async () => {
    const env: EnvironmentPaths = {
      repoRoot: workspaceRoot,
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'task-none'
    };
    const pipeline: PipelineDefinition = {
      id: 'pipeline',
      title: 'Pipeline',
      stages: []
    };

    const { manifest, paths } = await bootstrapManifest('run-none', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    manifest.memory = null;
    const now = new Date().toISOString();
    manifest.status = 'succeeded';
    manifest.completed_at = now;

    await appendMetricsEntry(env, paths, manifest);

    const metricsPath = join(env.runsRoot, env.taskId, 'metrics.json');
    const raw = await readFile(metricsPath, 'utf8');
    const entry = JSON.parse(raw.trim().split('\n')[0] ?? '{}') as Record<string, unknown>;

    expect(entry.memory).toBeUndefined();
  });

  it('refreshes resume latency before persisting memory metrics', async () => {
    vi.useFakeTimers();
    try {
      const repoRoot = workspaceRoot;
      const env: EnvironmentPaths = {
        repoRoot,
        runsRoot: join(repoRoot, '.runs'),
        outRoot: join(repoRoot, 'out'),
        taskId: 'task-refresh'
      };
      const pipeline: PipelineDefinition = {
        id: 'pipeline',
        title: 'Pipeline',
        stages: []
      };

      vi.setSystemTime(new Date('2026-04-09T09:00:00.000Z'));
      const { manifest, paths } = await bootstrapManifest('run-refresh', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });
      recordResumeEvent(manifest, {
        actor: 'operator',
        reason: 'manual-resume',
        outcome: 'accepted',
        detail: 'memory-repair: repaired source_0 lineage'
      });

      vi.setSystemTime(new Date('2026-04-09T09:00:05.000Z'));
      manifest.status = 'succeeded';
      manifest.completed_at = new Date().toISOString();

      await appendMetricsEntry(env, paths, manifest);

      const metricsPath = join(env.runsRoot, env.taskId, 'metrics.json');
      const raw = await readFile(metricsPath, 'utf8');
      const entry = JSON.parse(raw.trim().split('\n')[0] ?? '{}') as Record<string, unknown>;
      const memory = entry.memory as Record<string, unknown>;
      const counters = memory.counters as Record<string, unknown>;

      expect(memory.recorded_at).toBe('2026-04-09T09:00:05.000Z');
      expect(counters.resume_latency_ms).toBe(5_000);
    } finally {
      vi.useRealTimers();
    }
  });
});
