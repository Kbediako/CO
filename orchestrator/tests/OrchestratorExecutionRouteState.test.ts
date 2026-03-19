import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveOrchestratorExecutionRouteState } from '../src/cli/services/orchestratorExecutionRouteState.js';
import type { RuntimeSelection } from '../src/cli/runtime/types.js';
import * as runtimeIndex from '../src/cli/runtime/index.js';

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

describe('resolveOrchestratorExecutionRouteState', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards requested runtime inputs and merged env to runtime selection', async () => {
    const selection = createRuntimeSelection({
      requested_mode: 'cli',
      selected_mode: 'cli',
      source: 'override'
    });
    const resolveRuntimeSelectionSpy = vi
      .spyOn(runtimeIndex, 'resolveRuntimeSelection')
      .mockResolvedValue(selection);
    const manifest = createManifest();
    const applyRuntimeSelection = vi.fn();

    await resolveOrchestratorExecutionRouteState({
      repoRoot: '/tmp/repo',
      manifest,
      mode: 'mcp',
      runtimeModeRequested: 'cli',
      runtimeModeSource: 'override',
      envOverrides: { OUTER_FLAG: '1' },
      applyRuntimeSelection
    });

    expect(resolveRuntimeSelectionSpy).toHaveBeenCalledOnce();
    expect(resolveRuntimeSelectionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedMode: 'cli',
        source: 'override',
        executionMode: 'mcp',
        repoRoot: '/tmp/repo',
        runId: 'run-1',
        env: expect.objectContaining({
          OUTER_FLAG: '1'
        })
      })
    );
  });

  it('applies the resolved runtime selection to the manifest', async () => {
    const selection = createRuntimeSelection({
      selected_mode: 'cli',
      provider: 'CliRuntimeProvider'
    });
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(selection);
    const manifest = createManifest();
    const applyRuntimeSelection = vi.fn((currentManifest, currentSelection) => {
      currentManifest.runtime_mode_requested = currentSelection.requested_mode;
      currentManifest.runtime_mode = currentSelection.selected_mode;
      currentManifest.runtime_provider = currentSelection.provider;
    });

    const state = await resolveOrchestratorExecutionRouteState({
      repoRoot: '/tmp/repo',
      manifest,
      mode: 'mcp',
      runtimeModeRequested: 'appserver',
      runtimeModeSource: 'default',
      applyRuntimeSelection
    });

    expect(applyRuntimeSelection).toHaveBeenCalledWith(manifest, selection);
    expect(state.runtimeSelection).toBe(selection);
    expect(manifest.runtime_mode_requested).toBe('appserver');
    expect(manifest.runtime_mode).toBe('cli');
    expect(manifest.runtime_provider).toBe('CliRuntimeProvider');
  });

  it('gives runtime env overrides precedence in the returned effective env objects', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(
      createRuntimeSelection({
        env_overrides: {
          OUTER_FLAG: 'runtime',
          RUNTIME_ONLY_FLAG: '1'
        }
      })
    );
    const manifest = createManifest();

    const state = await resolveOrchestratorExecutionRouteState({
      repoRoot: '/tmp/repo',
      manifest,
      mode: 'mcp',
      runtimeModeRequested: 'appserver',
      runtimeModeSource: 'default',
      envOverrides: {
        OUTER_FLAG: 'outer',
        OUTER_ONLY_FLAG: '1'
      },
      applyRuntimeSelection: vi.fn()
    });

    expect(state.effectiveEnvOverrides).toMatchObject({
      OUTER_FLAG: 'runtime',
      OUTER_ONLY_FLAG: '1',
      RUNTIME_ONLY_FLAG: '1'
    });
    expect(state.effectiveMergedEnv).toMatchObject({
      OUTER_FLAG: 'runtime',
      OUTER_ONLY_FLAG: '1',
      RUNTIME_ONLY_FLAG: '1'
    });
  });
});
