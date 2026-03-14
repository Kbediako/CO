import { beforeEach, describe, expect, it, vi } from 'vitest';

import { executeOrchestratorCloudRouteShell } from '../src/cli/services/orchestratorCloudRouteShell.js';
import type { OrchestratorExecutionRouteState } from '../src/cli/services/orchestratorExecutionRouteState.js';
import type { RuntimeSelection } from '../src/cli/runtime/types.js';
import * as cloudPreflight from '../src/cli/utils/cloudPreflight.js';

function createManifest() {
  return {
    task_id: 'task-1',
    run_id: 'run-1',
    status: 'pending',
    status_detail: null,
    summary: null,
    commands: [],
    child_runs: [],
    prompt_packs: [],
    cloud_fallback: null,
    heartbeat_interval_seconds: 60,
    heartbeat_at: null,
    guardrail_status: undefined
  } as never;
}

function createRuntimeSelection(overrides: Partial<RuntimeSelection> = {}): RuntimeSelection {
  return {
    requested_mode: 'appserver',
    selected_mode: 'appserver',
    source: 'default',
    provider: 'AppServerRuntimeProvider',
    runtime_session_id: null,
    fallback: {
      occurred: false,
      code: null,
      reason: null,
      from_mode: null,
      to_mode: null,
      checked_at: '2026-03-14T00:00:00.000Z'
    },
    env_overrides: {},
    ...overrides
  };
}

function createRouteState(
  overrides: Partial<OrchestratorExecutionRouteState> = {}
): OrchestratorExecutionRouteState {
  return {
    runtimeSelection: createRuntimeSelection(),
    effectiveEnvOverrides: {},
    effectiveMergedEnv: {},
    ...overrides
  };
}

describe('executeOrchestratorCloudRouteShell', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reroutes to mcp with effective env overrides when cloud preflight fails and fallback is allowed', async () => {
    vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: false,
      issues: [
        { code: 'missing_environment', message: 'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId).' },
        {
          code: 'branch_missing',
          message:
            "Cloud branch 'router-preflight' was not found on origin. Push it first or set CODEX_CLOUD_BRANCH to an existing remote branch."
        }
      ],
      details: {
        codexBin: 'codex',
        environmentId: null,
        branch: null
      }
    });

    const manifest = createManifest();
    const reroute = vi.fn(async () => ({
      success: true,
      notes: ['local'],
      manifest,
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    }));
    const executeCloudPipeline = vi.fn();

    const result = await executeOrchestratorCloudRouteShell({
      repoRoot: '/tmp/repo',
      task: { id: 'task-1', title: 'Task', metadata: {} } as never,
      target: { id: 'target-1', description: 'Target', metadata: {} } as never,
      manifest,
      state: createRouteState({
        runtimeSelection: createRuntimeSelection({
          requested_mode: 'appserver',
          selected_mode: 'cli',
          source: 'default'
        }),
        effectiveEnvOverrides: {
          OUTER_FLAG: '1',
          CODEX_FAKE_ROUTER_FLAG: '1',
          CODEX_CLOUD_BRANCH: 'router-preflight'
        },
        effectiveMergedEnv: {
          OUTER_FLAG: '1',
          CODEX_FAKE_ROUTER_FLAG: '1',
          CODEX_CLOUD_BRANCH: 'router-preflight'
        }
      }),
      executeCloudPipeline,
      reroute,
      failExecutionRoute: vi.fn()
    });

    const expectedDetail =
      'Cloud preflight failed; falling back to mcp. ' +
      'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId). ' +
      "Cloud branch 'router-preflight' was not found on origin. Push it first or set CODEX_CLOUD_BRANCH to an existing remote branch.";

    expect(result.success).toBe(true);
    expect(result.notes[0]).toBe(expectedDetail);
    expect(manifest.summary).toContain(expectedDetail);
    expect(manifest.cloud_fallback).toMatchObject({
      mode_requested: 'cloud',
      mode_used: 'mcp',
      reason: expectedDetail
    });
    expect(reroute).toHaveBeenCalledOnce();
    expect(reroute).toHaveBeenCalledWith({
      mode: 'mcp',
      executionModeOverride: 'mcp',
      runtimeModeRequested: 'cli',
      runtimeModeSource: 'default',
      envOverrides: {
        OUTER_FLAG: '1',
        CODEX_FAKE_ROUTER_FLAG: '1',
        CODEX_CLOUD_BRANCH: 'router-preflight'
      }
    });
    expect(executeCloudPipeline).not.toHaveBeenCalled();
  });

  it('fails fast when cloud preflight fails and fallback is disabled', async () => {
    vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: false,
      issues: [
        { code: 'missing_environment', message: 'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId).' },
        {
          code: 'branch_missing',
          message:
            "Cloud branch 'router-preflight' was not found on origin. Push it first or set CODEX_CLOUD_BRANCH to an existing remote branch."
        }
      ],
      details: {
        codexBin: 'codex',
        environmentId: null,
        branch: null
      }
    });

    const failExecutionRoute = vi.fn((statusDetail: string, detail: string) => ({
      success: false,
      notes: [detail],
      manifest: createManifest(),
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    }));

    const result = await executeOrchestratorCloudRouteShell({
      repoRoot: '/tmp/repo',
      task: { id: 'task-1', title: 'Task', metadata: {} } as never,
      target: { id: 'target-1', description: 'Target', metadata: {} } as never,
      manifest: createManifest(),
      state: createRouteState({
        effectiveEnvOverrides: {
          CODEX_ORCHESTRATOR_CLOUD_FALLBACK: 'deny',
          CODEX_CLOUD_BRANCH: 'router-preflight'
        },
        effectiveMergedEnv: {
          CODEX_ORCHESTRATOR_CLOUD_FALLBACK: 'deny',
          CODEX_CLOUD_BRANCH: 'router-preflight'
        }
      }),
      executeCloudPipeline: vi.fn(),
      reroute: vi.fn(),
      failExecutionRoute
    });

    expect(result.success).toBe(false);
    expect(failExecutionRoute).toHaveBeenCalledWith(
      'cloud-preflight-failed',
      'Cloud preflight failed and cloud fallback is disabled. ' +
        'Missing CODEX_CLOUD_ENV_ID (or target metadata.cloudEnvId). ' +
        "Cloud branch 'router-preflight' was not found on origin. Push it first or set CODEX_CLOUD_BRANCH to an existing remote branch."
    );
  });

  it('executes the cloud pipeline with effective env overrides after successful preflight', async () => {
    const runCloudPreflightSpy = vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: true,
      issues: [],
      details: {
        codexBin: '/tmp/fake-codex',
        environmentId: 'env-123',
        branch: 'refs/heads/runtime/router-preflight'
      }
    });

    const executeCloudPipeline = vi.fn(async (envOverrides: NodeJS.ProcessEnv) => ({
      success: true,
      notes: ['cloud'],
      manifest: createManifest(),
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson',
      observedEnvOverrides: envOverrides
    }));

    const state = createRouteState({
      effectiveEnvOverrides: {
        CODEX_FAKE_ROUTER_FLAG: '1',
        CODEX_CLI_BIN: '/tmp/fake-codex',
        CODEX_CLOUD_BRANCH: 'refs/heads/runtime/router-preflight',
        CODEX_CLOUD_ENV_ID: 'env-123'
      },
      effectiveMergedEnv: {
        CODEX_FAKE_ROUTER_FLAG: '1',
        CODEX_CLI_BIN: '/tmp/fake-codex',
        CODEX_CLOUD_BRANCH: 'refs/heads/runtime/router-preflight',
        CODEX_CLOUD_ENV_ID: 'env-123'
      }
    });

    const result = await executeOrchestratorCloudRouteShell({
      repoRoot: '/tmp/repo',
      task: { id: 'task-1', title: 'Task', metadata: {} } as never,
      target: { id: 'target-1', description: 'Target', metadata: {} } as never,
      manifest: createManifest(),
      state,
      executeCloudPipeline,
      reroute: vi.fn(),
      failExecutionRoute: vi.fn()
    });

    expect(result.success).toBe(true);
    expect(runCloudPreflightSpy).toHaveBeenCalledOnce();
    expect(runCloudPreflightSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        repoRoot: '/tmp/repo',
        codexBin: '/tmp/fake-codex',
        environmentId: 'env-123',
        branch: 'refs/heads/runtime/router-preflight',
        env: expect.objectContaining({
          CODEX_FAKE_ROUTER_FLAG: '1',
          CODEX_CLI_BIN: '/tmp/fake-codex',
          CODEX_CLOUD_BRANCH: 'refs/heads/runtime/router-preflight',
          CODEX_CLOUD_ENV_ID: 'env-123'
        })
      })
    );
    expect(executeCloudPipeline).toHaveBeenCalledWith(state.effectiveEnvOverrides);
  });
});
