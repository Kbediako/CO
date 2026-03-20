import { describe, expect, it } from 'vitest';

import {
  type ProviderIntakeState,
  upsertProviderIntakeClaim
} from '../src/cli/control/providerIntakeState.js';

function createProviderIntakeState(): ProviderIntakeState {
  return {
    schema_version: 1,
    updated_at: new Date(0).toISOString(),
    rehydrated_at: null,
    latest_provider_key: null,
    latest_reason: null,
    claims: []
  };
}

describe('upsertProviderIntakeClaim', () => {
  it('preserves launch provenance when the run identity is unchanged and no new launch fields are supplied', () => {
    const state = createProviderIntakeState();

    upsertProviderIntakeClaim(state, {
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json',
      launch_source: 'control-host',
      launch_token: 'launch-token-1'
    });

    const claim = upsertProviderIntakeClaim(state, {
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:01.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json'
    });

    expect(claim.launch_source).toBe('control-host');
    expect(claim.launch_token).toBe('launch-token-1');
  });

  it('clears inherited launch provenance when the run identity changes and no new launch fields are supplied', () => {
    const state = createProviderIntakeState();

    upsertProviderIntakeClaim(state, {
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json',
      launch_source: 'control-host',
      launch_token: 'launch-token-1'
    });

    const claim = upsertProviderIntakeClaim(state, {
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:02.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-2',
      run_manifest_path: '/tmp/run-2/manifest.json'
    });

    expect(claim.launch_source).toBeNull();
    expect(claim.launch_token).toBeNull();
  });
});
