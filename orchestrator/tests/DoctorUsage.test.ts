import { describe, expect, it } from 'vitest';

import { formatDoctorUsageSummary, type DoctorUsageResult } from '../src/cli/doctorUsage.js';

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
        capture_disabled: false
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
    expect(summary).toContain('tools[');
    expect(summary).toContain('delegation: 1/2');
    expect(summary).toContain('child_runs=2');
  });
});

