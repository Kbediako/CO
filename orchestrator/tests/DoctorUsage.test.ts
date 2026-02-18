import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  formatDoctorUsageSummary,
  runDoctorUsage,
  type DoctorUsageResult
} from '../src/cli/doctorUsage.js';

describe('formatDoctorUsageSummary', () => {
  it('includes capability breakdowns when present', () => {
    const sample: DoctorUsageResult = {
      window_days: 7,
      cutoff_iso: '2026-02-01T00:00:00.000Z',
      runs: { total: 10, succeeded: 8, failed: 1, cancelled: 1, other: 0 },
      cloud: {
        runs: 3,
        unique_tasks: 2,
        by_status: { ready: 2, error: 1 },
        by_diff_status: { available: 2, pending: 1 },
        by_apply_status: { succeeded: 2, failed: 1 },
        top_environment_ids: [{ id: 'env_123', runs: 3 }]
      },
      rlm: {
        runs: 1,
        unique_tasks: 1
      },
      collab: {
        runs_with_tool_calls: 2,
        total_tool_calls: 10,
        unique_tasks: 1,
        by_status: { completed: 9, failed: 1 },
        by_event_type: { 'item.completed': 10 },
        top_tools: [
          { tool: 'spawn_agent', calls: 6 },
          { tool: 'exec_command', calls: 4 }
        ],
        capture_disabled: false,
        runs_with_unclosed_spawn_agents: 1,
        unclosed_spawn_agents: 2,
        runs_with_spawn_thread_limit_failures: 1,
        spawn_thread_limit_failures: 1,
        runs_with_potentially_truncated_tool_calls: 1,
        runs_with_unknown_capture_limit: 0
      },
      delegation: {
        active_top_level_tasks: 2,
        active_with_subagents: 1,
        total_subagent_manifests: 3,
        tasks_with_child_runs: 1,
        total_child_runs: 2,
        errors: []
      },
      pipelines: {
        total: 2,
        top: [
          { id: 'docs-review', runs: 5 },
          { id: 'rlm', runs: 1 }
        ]
      },
      adoption: {
        exec_runs: 6,
        exec_share_pct: 60,
        gate_runs: 5,
        gate_share_pct: 50,
        recommendations: ['Most runs are plain exec; prefer gate pipelines.']
      },
      kpis: {
        advanced_runs: 4,
        advanced_share_pct: 40,
        cloud_share_pct: 30,
        rlm_share_pct: 10,
        collab_share_pct: 20,
        delegation_task_coverage_pct: 50
      }
    };

    const summary = formatDoctorUsageSummary(sample).join('\n');
    expect(summary).toContain('Usage (last 7d');
    expect(summary).toContain('- cloud: 3 over 2 tasks');
    expect(summary).toContain('diff[');
    expect(summary).toContain('apply[');
    expect(summary).toContain('env[');
    expect(summary).toContain('- rlm: 1 over 1 task');
    expect(summary).toContain('- collab: 2');
    expect(summary).toContain('events=10');
    expect(summary).toContain('ok=9, failed=1');
    expect(summary).toContain('leaks=2 over 1 run(s)');
    expect(summary).toContain('likely_thread_limit_spawns=1 over 1 run(s)');
    expect(summary).toContain('lifecycle_unknown_runs=1');
    expect(summary).toContain('tools[');
    expect(summary).toContain('delegation: 1/2');
    expect(summary).toContain('child_runs=2');
    expect(summary).toContain('Pipeline adoption: exec=6');
    expect(summary).toContain('KPIs: advanced=4 (40%)');
    expect(summary).toContain('Adoption hints:');
  });
});

describe('runDoctorUsage', () => {
  it('counts fallback-only runs as advanced usage', async () => {
    const previousEnv = {
      root: process.env.CODEX_ORCHESTRATOR_ROOT,
      runsDir: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
      outDir: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
      taskId: process.env.MCP_RUNNER_TASK_ID,
      collabMaxEvents: process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS
    };
    const repoRoot = await mkdtemp(join(tmpdir(), 'doctor-usage-'));
    const taskId = 'task-fallback';
    const runId = '2026-02-17T00-00-00-000Z-a1b2c3d4';
    try {
      await mkdir(join(repoRoot, 'tasks'), { recursive: true });
      await writeFile(
        join(repoRoot, 'tasks', 'index.json'),
        `${JSON.stringify({ items: [{ slug: taskId }] }, null, 2)}\n`,
        'utf8'
      );

      const runDir = join(repoRoot, '.runs', taskId, 'cli', runId);
      await mkdir(runDir, { recursive: true });
      await writeFile(
        join(runDir, 'manifest.json'),
        `${JSON.stringify(
          {
            run_id: runId,
            task_id: taskId,
            pipeline_id: 'docs-review',
            status: 'succeeded',
            started_at: '2026-02-17T00:00:00.000Z',
            cloud_fallback: {
              mode_requested: 'cloud',
              mode_used: 'mcp',
              reason: 'Cloud preflight failed.',
              issues: [{ code: 'missing_environment', message: 'CODEX_CLOUD_ENV_ID is not configured.' }],
              checked_at: '2026-02-17T00:00:01.000Z'
            }
          },
          null,
          2
        )}\n`,
        'utf8'
      );

      process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
      delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
      delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
      process.env.MCP_RUNNER_TASK_ID = taskId;
      delete process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS;

      const result = await runDoctorUsage({ windowDays: 3650, taskFilter: taskId });
      expect(result.runs.total).toBe(1);
      expect(result.kpis.advanced_runs).toBe(1);
      expect(result.kpis.advanced_share_pct).toBe(100);
      expect(result.cloud.runs).toBe(0);
      expect(result.kpis.cloud_share_pct).toBe(0);
    } finally {
      if (previousEnv.root === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_ROOT;
      } else {
        process.env.CODEX_ORCHESTRATOR_ROOT = previousEnv.root;
      }
      if (previousEnv.runsDir === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
      } else {
        process.env.CODEX_ORCHESTRATOR_RUNS_DIR = previousEnv.runsDir;
      }
      if (previousEnv.outDir === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
      } else {
        process.env.CODEX_ORCHESTRATOR_OUT_DIR = previousEnv.outDir;
      }
      if (previousEnv.taskId === undefined) {
        delete process.env.MCP_RUNNER_TASK_ID;
      } else {
        process.env.MCP_RUNNER_TASK_ID = previousEnv.taskId;
      }
      if (previousEnv.collabMaxEvents === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS;
      } else {
        process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS = previousEnv.collabMaxEvents;
      }
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('surfaces collab lifecycle leak and likely thread-limit diagnostics', async () => {
    const previousEnv = {
      root: process.env.CODEX_ORCHESTRATOR_ROOT,
      runsDir: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
      outDir: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
      taskId: process.env.MCP_RUNNER_TASK_ID,
      collabMaxEvents: process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS
    };
    const repoRoot = await mkdtemp(join(tmpdir(), 'doctor-collab-lifecycle-'));
    const taskId = 'task-collab-lifecycle';
    const runId = '2026-02-18T00-00-00-000Z-deadbeef';
    try {
      await mkdir(join(repoRoot, 'tasks'), { recursive: true });
      await writeFile(
        join(repoRoot, 'tasks', 'index.json'),
        `${JSON.stringify({ items: [{ slug: taskId }] }, null, 2)}\n`,
        'utf8'
      );

      const runDir = join(repoRoot, '.runs', taskId, 'cli', runId);
      await mkdir(runDir, { recursive: true });
      await writeFile(
        join(runDir, 'manifest.json'),
        `${JSON.stringify(
          {
            run_id: runId,
            task_id: taskId,
            pipeline_id: 'implementation-gate',
            status: 'succeeded',
            started_at: '2026-02-18T00:00:00.000Z',
            collab_tool_calls_max_events: 200,
            collab_tool_calls: [
              {
                observed_at: '2026-02-18T00:00:10.000Z',
                stage_id: 'stage-1',
                command_index: 0,
                event_type: 'item.completed',
                item_id: 'spawn-a',
                tool: 'spawn_agent',
                status: 'completed',
                sender_thread_id: 'parent',
                receiver_thread_ids: ['agent-a']
              },
              {
                observed_at: '2026-02-18T00:00:11.000Z',
                stage_id: 'stage-1',
                command_index: 0,
                event_type: 'item.completed',
                item_id: 'wait-a',
                tool: 'wait',
                status: 'completed',
                sender_thread_id: 'parent',
                receiver_thread_ids: ['agent-a']
              },
              {
                observed_at: '2026-02-18T00:00:12.000Z',
                stage_id: 'stage-1',
                command_index: 0,
                event_type: 'item.completed',
                item_id: 'close-a',
                tool: 'close_agent',
                sender_thread_id: 'parent',
                receiver_thread_ids: ['agent-a']
              },
              {
                observed_at: '2026-02-18T00:00:13.000Z',
                stage_id: 'stage-1',
                command_index: 0,
                event_type: 'item.completed',
                item_id: 'spawn-b',
                tool: 'spawn_agent',
                status: 'completed',
                sender_thread_id: 'parent',
                receiver_thread_ids: ['agent-b']
              },
              {
                observed_at: '2026-02-18T00:00:14.000Z',
                stage_id: 'stage-1',
                command_index: 0,
                event_type: 'item.updated',
                item_id: 'spawn-failed',
                tool: 'spawn_agent',
                status: 'failed',
                sender_thread_id: 'parent',
                receiver_thread_ids: []
              },
              {
                observed_at: '2026-02-18T00:00:14.500Z',
                stage_id: 'stage-1',
                command_index: 0,
                event_type: 'item.completed',
                item_id: 'spawn-failed',
                tool: 'spawn_agent',
                status: 'failed',
                sender_thread_id: 'parent',
                receiver_thread_ids: []
              }
            ]
          },
          null,
          2
        )}\n`,
        'utf8'
      );

      process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
      delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
      delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
      process.env.MCP_RUNNER_TASK_ID = taskId;
      delete process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS;

      const result = await runDoctorUsage({ windowDays: 3650, taskFilter: taskId });
      expect(result.runs.total).toBe(1);
      expect(result.collab.runs_with_tool_calls).toBe(1);
      expect(result.collab.runs_with_unclosed_spawn_agents).toBe(1);
      expect(result.collab.unclosed_spawn_agents).toBe(1);
      expect(result.collab.runs_with_spawn_thread_limit_failures).toBe(1);
      expect(result.collab.spawn_thread_limit_failures).toBe(1);
      expect(result.collab.runs_with_potentially_truncated_tool_calls).toBe(0);
      expect(result.collab.runs_with_unknown_capture_limit).toBe(0);
    } finally {
      if (previousEnv.root === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_ROOT;
      } else {
        process.env.CODEX_ORCHESTRATOR_ROOT = previousEnv.root;
      }
      if (previousEnv.runsDir === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
      } else {
        process.env.CODEX_ORCHESTRATOR_RUNS_DIR = previousEnv.runsDir;
      }
      if (previousEnv.outDir === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
      } else {
        process.env.CODEX_ORCHESTRATOR_OUT_DIR = previousEnv.outDir;
      }
      if (previousEnv.taskId === undefined) {
        delete process.env.MCP_RUNNER_TASK_ID;
      } else {
        process.env.MCP_RUNNER_TASK_ID = previousEnv.taskId;
      }
      if (previousEnv.collabMaxEvents === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS;
      } else {
        process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS = previousEnv.collabMaxEvents;
      }
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('suppresses lifecycle leak diagnostics when collab events may be truncated', async () => {
    const previousEnv = {
      root: process.env.CODEX_ORCHESTRATOR_ROOT,
      runsDir: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
      outDir: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
      taskId: process.env.MCP_RUNNER_TASK_ID,
      collabMaxEvents: process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS
    };
    const repoRoot = await mkdtemp(join(tmpdir(), 'doctor-collab-truncated-'));
    const taskId = 'task-collab-truncated';
    const runId = '2026-02-18T00-00-00-000Z-feedface';
    try {
      await mkdir(join(repoRoot, 'tasks'), { recursive: true });
      await writeFile(
        join(repoRoot, 'tasks', 'index.json'),
        `${JSON.stringify({ items: [{ slug: taskId }] }, null, 2)}\n`,
        'utf8'
      );

      const runDir = join(repoRoot, '.runs', taskId, 'cli', runId);
      await mkdir(runDir, { recursive: true });
      await writeFile(
        join(runDir, 'manifest.json'),
        `${JSON.stringify(
          {
            run_id: runId,
            task_id: taskId,
            pipeline_id: 'implementation-gate',
            status: 'succeeded',
            started_at: '2026-02-18T00:00:00.000Z',
            collab_tool_calls_max_events: 2,
            collab_tool_calls: [
              {
                observed_at: '2026-02-18T00:00:10.000Z',
                stage_id: 'stage-1',
                command_index: 0,
                event_type: 'item.completed',
                item_id: 'spawn-a',
                tool: 'spawn_agent',
                status: 'completed',
                sender_thread_id: 'parent',
                receiver_thread_ids: ['agent-a']
              },
              {
                observed_at: '2026-02-18T00:00:11.000Z',
                stage_id: 'stage-1',
                command_index: 0,
                event_type: 'item.completed',
                item_id: 'spawn-b',
                tool: 'spawn_agent',
                status: 'completed',
                sender_thread_id: 'parent',
                receiver_thread_ids: ['agent-b']
              }
            ]
          },
          null,
          2
        )}\n`,
        'utf8'
      );

      process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
      delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
      delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
      process.env.MCP_RUNNER_TASK_ID = taskId;
      process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS = '2';

      const result = await runDoctorUsage({ windowDays: 3650, taskFilter: taskId });
      expect(result.runs.total).toBe(1);
      expect(result.collab.runs_with_tool_calls).toBe(1);
      expect(result.collab.runs_with_potentially_truncated_tool_calls).toBe(1);
      expect(result.collab.runs_with_unknown_capture_limit).toBe(0);
      expect(result.collab.runs_with_unclosed_spawn_agents).toBe(0);
      expect(result.collab.unclosed_spawn_agents).toBe(0);
      expect(result.collab.runs_with_spawn_thread_limit_failures).toBe(0);
      expect(result.collab.spawn_thread_limit_failures).toBe(0);
    } finally {
      if (previousEnv.root === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_ROOT;
      } else {
        process.env.CODEX_ORCHESTRATOR_ROOT = previousEnv.root;
      }
      if (previousEnv.runsDir === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
      } else {
        process.env.CODEX_ORCHESTRATOR_RUNS_DIR = previousEnv.runsDir;
      }
      if (previousEnv.outDir === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
      } else {
        process.env.CODEX_ORCHESTRATOR_OUT_DIR = previousEnv.outDir;
      }
      if (previousEnv.taskId === undefined) {
        delete process.env.MCP_RUNNER_TASK_ID;
      } else {
        process.env.MCP_RUNNER_TASK_ID = previousEnv.taskId;
      }
      if (previousEnv.collabMaxEvents === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS;
      } else {
        process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS = previousEnv.collabMaxEvents;
      }
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('suppresses lifecycle leak diagnostics when collab capture limit is unknown', async () => {
    const previousEnv = {
      root: process.env.CODEX_ORCHESTRATOR_ROOT,
      runsDir: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
      outDir: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
      taskId: process.env.MCP_RUNNER_TASK_ID
    };
    const repoRoot = await mkdtemp(join(tmpdir(), 'doctor-collab-unknown-cap-'));
    const taskId = 'task-collab-unknown-cap';
    const runId = '2026-02-18T00-00-00-000Z-cafebabe';
    try {
      await mkdir(join(repoRoot, 'tasks'), { recursive: true });
      await writeFile(
        join(repoRoot, 'tasks', 'index.json'),
        `${JSON.stringify({ items: [{ slug: taskId }] }, null, 2)}\n`,
        'utf8'
      );

      const runDir = join(repoRoot, '.runs', taskId, 'cli', runId);
      await mkdir(runDir, { recursive: true });
      await writeFile(
        join(runDir, 'manifest.json'),
        `${JSON.stringify(
          {
            run_id: runId,
            task_id: taskId,
            pipeline_id: 'implementation-gate',
            status: 'succeeded',
            started_at: '2026-02-18T00:00:00.000Z',
            collab_tool_calls: [
              {
                observed_at: '2026-02-18T00:00:10.000Z',
                stage_id: 'stage-1',
                command_index: 0,
                event_type: 'item.completed',
                item_id: 'spawn-a',
                tool: 'spawn_agent',
                status: 'completed',
                sender_thread_id: 'parent',
                receiver_thread_ids: ['agent-a']
              }
            ]
          },
          null,
          2
        )}\n`,
        'utf8'
      );

      process.env.CODEX_ORCHESTRATOR_ROOT = repoRoot;
      delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
      delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
      process.env.MCP_RUNNER_TASK_ID = taskId;

      const result = await runDoctorUsage({ windowDays: 3650, taskFilter: taskId });
      expect(result.runs.total).toBe(1);
      expect(result.collab.runs_with_tool_calls).toBe(1);
      expect(result.collab.runs_with_unknown_capture_limit).toBe(1);
      expect(result.collab.runs_with_unclosed_spawn_agents).toBe(0);
      expect(result.collab.unclosed_spawn_agents).toBe(0);
      expect(result.collab.runs_with_spawn_thread_limit_failures).toBe(0);
      expect(result.collab.spawn_thread_limit_failures).toBe(0);
    } finally {
      if (previousEnv.root === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_ROOT;
      } else {
        process.env.CODEX_ORCHESTRATOR_ROOT = previousEnv.root;
      }
      if (previousEnv.runsDir === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
      } else {
        process.env.CODEX_ORCHESTRATOR_RUNS_DIR = previousEnv.runsDir;
      }
      if (previousEnv.outDir === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
      } else {
        process.env.CODEX_ORCHESTRATOR_OUT_DIR = previousEnv.outDir;
      }
      if (previousEnv.taskId === undefined) {
        delete process.env.MCP_RUNNER_TASK_ID;
      } else {
        process.env.MCP_RUNNER_TASK_ID = previousEnv.taskId;
      }
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});
