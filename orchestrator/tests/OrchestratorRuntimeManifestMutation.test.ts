import { describe, expect, it } from 'vitest';

import {
  applyRequestedRuntimeModeToManifest,
  applyRuntimeSelectionToManifest
} from '../src/cli/services/orchestratorRuntimeManifestMutation.js';
import type { RuntimeSelection } from '../src/cli/runtime/types.js';

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

describe('orchestrator runtime manifest mutation', () => {
  it('applies the requested runtime mode with the expected manifest defaults', () => {
    const manifest = createManifest();

    applyRequestedRuntimeModeToManifest(manifest, 'appserver', () => '2026-03-15T00:00:00.000Z');

    expect(manifest.runtime_mode_requested).toBe('appserver');
    expect(manifest.runtime_mode).toBe('appserver');
    expect(manifest.runtime_provider).toBe('AppServerRuntimeProvider');
    expect(manifest.runtime_fallback).toEqual({
      occurred: false,
      code: null,
      reason: null,
      from_mode: null,
      to_mode: null,
      checked_at: '2026-03-15T00:00:00.000Z'
    });
  });

  it('copies the resolved runtime selection onto the manifest verbatim', () => {
    const manifest = createManifest();
    const selection: RuntimeSelection = {
      requested_mode: 'appserver',
      selected_mode: 'cli',
      source: 'override',
      provider: 'CliRuntimeProvider',
      runtime_session_id: null,
      fallback: {
        occurred: true,
        code: 'appserver-unavailable',
        reason: 'Appserver preflight failed',
        from_mode: 'appserver',
        to_mode: 'cli',
        checked_at: '2026-03-15T00:01:00.000Z'
      },
      env_overrides: {
        SOME_FLAG: '1'
      }
    };

    applyRuntimeSelectionToManifest(manifest, selection);

    expect(manifest.runtime_mode_requested).toBe('appserver');
    expect(manifest.runtime_mode).toBe('cli');
    expect(manifest.runtime_provider).toBe('CliRuntimeProvider');
    expect(manifest.runtime_fallback).toBe(selection.fallback);
  });
});
