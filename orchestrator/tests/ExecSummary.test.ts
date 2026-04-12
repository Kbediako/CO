import { describe, expect, it, vi } from 'vitest';

import { createRunSummaryPayload } from '../src/cli/exec/summary.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { RunPaths } from '../src/cli/run/runPaths.js';
import type { CliManifest } from '../src/cli/types.js';

function buildMemoryObservability(): NonNullable<NonNullable<CliManifest['memory']>['observability']> {
  return {
    schema_version: 1,
    recorded_at: '2026-04-09T09:00:00.000Z',
    selected_memory: {
      selection: 'fresh_rebuild',
      pointer: 'ctx:sha256:selected#chunk:c000001',
      object_id: 'sha256:selected',
      dir_path: '.runs/task-summary/cli/run-summary/memory/source-0',
      index_path: '.runs/task-summary/cli/run-summary/memory/source-0/index.json',
      source_path: '.runs/task-summary/cli/run-summary/memory/source-0/source.txt',
      created_at: '2026-04-09T08:59:59.000Z',
      origin: {
        run_id: 'run-summary',
        task_id: 'task-summary',
        manifest_path: '.runs/task-summary/cli/run-summary/manifest.json'
      },
      inherited_from: {
        run_id: 'run-parent',
        task_id: 'task-summary',
        manifest_path: '.runs/task-summary/cli/run-parent/manifest.json'
      }
    },
    rejected_candidates: [
      {
        pointer: 'ctx:sha256:parent#chunk:c000001',
        object_id: 'sha256:parent',
        dir_path: '.runs/task-summary/cli/run-parent/memory/source-0',
        index_path: '.runs/task-summary/cli/run-parent/memory/source-0/index.json',
        source_path: '.runs/task-summary/cli/run-parent/memory/source-0/source.txt',
        created_at: '2026-04-09T08:58:00.000Z',
        origin: {
          run_id: 'run-parent',
          task_id: 'task-summary',
          manifest_path: '.runs/task-summary/cli/run-parent/manifest.json'
        },
        inherited_from: null,
        reason: 'missing_artifacts',
        detail: 'inherited source_0 artifacts are missing'
      }
    ],
    rediscovered_memory: {
      from_pointer: 'ctx:sha256:parent#chunk:c000001',
      from_object_id: 'sha256:parent',
      to_pointer: 'ctx:sha256:selected#chunk:c000001',
      to_object_id: 'sha256:selected',
      reason: 'missing_artifacts'
    },
    manual_repairs: [
      {
        timestamp: '2026-04-09T08:59:00.000Z',
        actor: 'operator',
        reason: 'manual-resume',
        outcome: 'accepted',
        detail: 'memory-repair: repaired source_0 lineage'
      }
    ],
    counters: {
      contradiction_count: 0,
      rediscovery_count: 1,
      resume_latency_ms: 60_000,
      manual_repair_count: 1,
      repeated_failure_streak: 1,
      retrieval_hits: 0,
      retrieval_misses: 1
    }
  };
}

function buildManifest(
  memory: CliManifest['memory']
): CliManifest {
  return {
    version: 1,
    task_id: 'task-summary',
    task_slug: 'task-summary',
    run_id: 'run-summary',
    parent_run_id: null,
    pipeline_id: 'pipeline',
    pipeline_title: 'Pipeline',
    runner: 'codex-cli',
    approval_policy: null,
    status: 'succeeded',
    status_detail: null,
    started_at: '2026-04-09T08:59:00.000Z',
    completed_at: '2026-04-09T09:00:00.000Z',
    updated_at: '2026-04-09T09:00:00.000Z',
    heartbeat_at: '2026-04-09T09:00:00.000Z',
    heartbeat_interval_seconds: 5,
    heartbeat_stale_after_seconds: 30,
    artifact_root: '.runs/task-summary/cli/run-summary',
    compat_path: '.runs/task-summary/mcp/run-summary',
    log_path: '.runs/task-summary/cli/run-summary/runner.ndjson',
    issue_provider: null,
    issue_id: null,
    issue_identifier: null,
    issue_updated_at: null,
    workspace_path: '/tmp/repo',
    provider_control_host_task_id: null,
    provider_control_host_run_id: null,
    summary: 'completed',
    metrics_recorded: false,
    resume_token: 'token',
    resume_events: [],
    approvals: [],
    commands: [],
    collab_tool_calls: [],
    child_runs: [],
    run_summary_path: null,
    plan_target_id: null,
    instructions_hash: null,
    instructions_sources: [],
    prompt_packs: [],
    guardrails_required: true,
    runtime_mode_requested: 'appserver',
    runtime_mode: 'appserver',
    runtime_provider: 'AppServerRuntimeProvider',
    runtime_fallback: {
      occurred: false,
      code: null,
      reason: null,
      from_mode: null,
      to_mode: null,
      checked_at: '2026-04-09T09:00:00.000Z'
    },
    cloud_execution: null,
    cloud_fallback: null,
    learning: {
      validation: {
        mode: 'per-task',
        grouping: null,
        status: 'pending'
      },
      alerts: [],
      approvals: []
    },
    tfgrpo: null,
    memory
  };
}

describe('createRunSummaryPayload', () => {
  const env: EnvironmentPaths = {
    repoRoot: '/tmp/repo',
    runsRoot: '/tmp/repo/.runs',
    outRoot: '/tmp/repo/out',
    taskId: 'task-summary'
  };
  const paths = {
    runDir: '/tmp/repo/.runs/task-summary/cli/run-summary',
    manifestPath: '/tmp/repo/.runs/task-summary/cli/run-summary/manifest.json',
    heartbeatPath: '/tmp/repo/.runs/task-summary/cli/run-summary/.heartbeat',
    resumeTokenPath: '/tmp/repo/.runs/task-summary/cli/run-summary/.resume-token',
    logPath: '/tmp/repo/.runs/task-summary/cli/run-summary/runner.ndjson',
    eventsPath: '/tmp/repo/.runs/task-summary/cli/run-summary/events.jsonl',
    controlPath: '/tmp/repo/.runs/task-summary/cli/run-summary/control.json',
    controlAuthPath: '/tmp/repo/.runs/task-summary/cli/run-summary/control_auth.json',
    controlEndpointPath: '/tmp/repo/.runs/task-summary/cli/run-summary/control_endpoint.json',
    confirmationsPath: '/tmp/repo/.runs/task-summary/cli/run-summary/confirmations.json',
    questionsPath: '/tmp/repo/.runs/task-summary/cli/run-summary/questions.json',
    delegationTokensPath: '/tmp/repo/.runs/task-summary/cli/run-summary/delegation_tokens.json',
    commandsDir: '/tmp/repo/.runs/task-summary/cli/run-summary/commands',
    errorsDir: '/tmp/repo/.runs/task-summary/cli/run-summary/errors',
    compatDir: '/tmp/repo/.runs/task-summary/mcp/run-summary',
    compatManifestPath: '/tmp/repo/.runs/task-summary/mcp/run-summary/manifest.json',
    localCompatDir: '/tmp/repo/.runs/local-mcp/run-summary'
  } as RunPaths;

  it('emits the bounded memory observability payload when present on the manifest', () => {
    const memory = {
      source_0: null,
      observability: buildMemoryObservability()
    };

    const payload = createRunSummaryPayload({
      env,
      paths,
      manifest: buildManifest(memory),
      runStatus: 'succeeded',
      shellCommand: 'echo ok',
      argv: ['echo', 'ok'],
      resultSummary: null,
      toolRecord: null,
      execEvents: [],
      exitCode: 0,
      signal: null,
      notificationTargets: [],
      cwd: '/tmp/repo',
      metrics: null
    });

    expect(payload.memory).toEqual(memory.observability);
  });

  it('refreshes memory observability before emitting the run summary payload', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-04-09T09:00:00.000Z'));
      const manifest = buildManifest({
        source_0: null,
        observability: buildMemoryObservability()
      });
      manifest.resume_events = [
        {
          timestamp: '2026-04-09T09:00:00.000Z',
          actor: 'operator',
          reason: 'manual-resume',
          outcome: 'accepted',
          detail: 'memory-repair: repaired source_0 lineage'
        }
      ];
      if (manifest.memory?.observability) {
        manifest.memory.observability.recorded_at = '2026-04-09T09:00:00.000Z';
        manifest.memory.observability.counters.resume_latency_ms = 0;
      }

      vi.setSystemTime(new Date('2026-04-09T09:00:05.000Z'));
      const payload = createRunSummaryPayload({
        env,
        paths,
        manifest,
        runStatus: 'succeeded',
        shellCommand: 'echo ok',
        argv: ['echo', 'ok'],
        resultSummary: null,
        toolRecord: null,
        execEvents: [],
        exitCode: 0,
        signal: null,
        notificationTargets: [],
        cwd: '/tmp/repo',
        metrics: null
      });

      expect(payload.memory?.recorded_at).toBe('2026-04-09T09:00:05.000Z');
      expect(payload.memory?.counters.resume_latency_ms).toBe(5_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('omits the memory payload when the manifest has no memory observability block', () => {
    const payload = createRunSummaryPayload({
      env,
      paths,
      manifest: buildManifest(null),
      runStatus: 'succeeded',
      shellCommand: 'echo ok',
      argv: ['echo', 'ok'],
      resultSummary: null,
      toolRecord: null,
      execEvents: [],
      exitCode: 0,
      signal: null,
      notificationTargets: [],
      cwd: '/tmp/repo',
      metrics: null
    });

    expect(payload.memory).toBeUndefined();
  });
});
