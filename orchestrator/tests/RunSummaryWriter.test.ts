import { describe, expect, it } from 'vitest';

import {
  applyCloudExecutionToRunSummary,
  applyCloudFallbackToRunSummary,
  applyUsageKpiToRunSummary
} from '../src/cli/services/runSummaryWriter.js';
import type { CliManifest } from '../src/cli/types.js';
import type { RunSummary } from '../src/types.js';

describe('runSummaryWriter cloud execution projection', () => {
  it('maps manifest.cloud_execution into runSummary.cloudExecution', () => {
    const runSummary = {} as RunSummary;
    const manifest = {
      cloud_execution: {
        task_id: 'task_e_1234567890abcdef1234567890abcdef',
        environment_id: 'env_123',
        status: 'ready',
        status_url: 'https://chatgpt.com/codex/tasks/task_e_1234567890abcdef1234567890abcdef',
        submitted_at: '2026-02-13T00:00:00.000Z',
        completed_at: '2026-02-13T00:01:00.000Z',
        last_polled_at: '2026-02-13T00:00:55.000Z',
        poll_count: 6,
        poll_interval_seconds: 10,
        timeout_seconds: 900,
        attempts: 1,
        diff_path: '.runs/task/cli/run-1/cloud/task.diff.patch',
        diff_url: 'https://chatgpt.com/codex/tasks/task_e_1234567890abcdef1234567890abcdef',
        diff_status: 'available',
        apply_status: 'not_requested',
        log_path: '.runs/task/cli/run-1/cloud/commands.ndjson',
        error: null
      }
    } as CliManifest;

    applyCloudExecutionToRunSummary(runSummary, manifest);

    expect(runSummary.cloudExecution).toEqual({
      taskId: manifest.cloud_execution?.task_id ?? null,
      environmentId: manifest.cloud_execution?.environment_id ?? null,
      status: manifest.cloud_execution?.status ?? null,
      statusUrl: manifest.cloud_execution?.status_url ?? null,
      submittedAt: manifest.cloud_execution?.submitted_at ?? null,
      completedAt: manifest.cloud_execution?.completed_at ?? null,
      lastPolledAt: manifest.cloud_execution?.last_polled_at ?? null,
      pollCount: manifest.cloud_execution?.poll_count ?? null,
      pollIntervalSeconds: manifest.cloud_execution?.poll_interval_seconds ?? null,
      timeoutSeconds: manifest.cloud_execution?.timeout_seconds ?? null,
      attempts: manifest.cloud_execution?.attempts ?? null,
      diffPath: manifest.cloud_execution?.diff_path ?? null,
      diffUrl: manifest.cloud_execution?.diff_url ?? null,
      diffStatus: manifest.cloud_execution?.diff_status ?? null,
      applyStatus: manifest.cloud_execution?.apply_status ?? null,
      logPath: manifest.cloud_execution?.log_path ?? null,
      error: manifest.cloud_execution?.error ?? null
    });
  });

  it('maps manifest.cloud_fallback into runSummary.cloudFallback', () => {
    const runSummary = {} as RunSummary;
    const manifest = {
      cloud_fallback: {
        mode_requested: 'cloud',
        mode_used: 'mcp',
        reason: 'Cloud preflight failed; falling back to mcp.',
        issues: [{ code: 'missing_environment', message: 'Missing CODEX_CLOUD_ENV_ID.' }],
        checked_at: '2026-02-17T00:00:00.000Z'
      }
    } as CliManifest;

    applyCloudFallbackToRunSummary(runSummary, manifest);

    expect(runSummary.cloudFallback).toEqual({
      modeRequested: 'cloud',
      modeUsed: 'mcp',
      reason: 'Cloud preflight failed; falling back to mcp.',
      issues: [{ code: 'missing_environment', message: 'Missing CODEX_CLOUD_ENV_ID.' }],
      checkedAt: '2026-02-17T00:00:00.000Z'
    });
  });

  it('maps per-run usage KPI signals into run summary', () => {
    const runSummary = {} as RunSummary;
    const manifest = {
      pipeline_id: 'docs-review',
      cloud_execution: null,
      cloud_fallback: {
        mode_requested: 'cloud',
        mode_used: 'mcp',
        reason: 'fallback',
        issues: [],
        checked_at: '2026-02-17T00:00:00.000Z'
      },
      collab_tool_calls: [{ tool: 'spawn_agent' }, { tool: 'exec_command' }],
      child_runs: [{ run_id: 'child-1' }]
    } as unknown as CliManifest;

    applyUsageKpiToRunSummary(runSummary, manifest);

    expect(runSummary.usageKpi).toEqual({
      advancedSignalsUsed: 3,
      advancedSignals: {
        cloudExecution: false,
        cloudFallback: true,
        collabToolCalls: 2,
        childRuns: 1,
        rlmPipeline: false
      }
    });
  });

  it('leaves runSummary.cloudExecution unset when manifest has no cloud execution block', () => {
    const runSummary = {} as RunSummary;
    const manifest = { cloud_execution: null } as CliManifest;

    applyCloudExecutionToRunSummary(runSummary, manifest);

    expect(runSummary.cloudExecution).toBeUndefined();
  });
});
