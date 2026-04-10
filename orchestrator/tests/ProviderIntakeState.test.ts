import { describe, expect, it } from 'vitest';

import {
  buildProviderIntakeSummary,
  normalizeProviderIntakeState,
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
  it('preserves persisted viewer identity when a later update omits it', () => {
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
      issue_viewer_id: 'viewer-1',
      issue_viewer_auth_fingerprint: 'viewer-auth-1',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json'
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
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json'
    });

    expect(claim.issue_viewer_id).toBe('viewer-1');
    expect(claim.issue_viewer_auth_fingerprint).toBe('viewer-auth-1');
  });

  it('clears persisted viewer identity when a later update explicitly nulls it', () => {
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
      issue_viewer_id: 'viewer-1',
      issue_viewer_auth_fingerprint: 'viewer-auth-1',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json'
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
      issue_viewer_id: null,
      issue_viewer_auth_fingerprint: null,
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json'
    });

    expect(claim.issue_viewer_id).toBeNull();
    expect(claim.issue_viewer_auth_fingerprint).toBeNull();
  });

  it('preserves blocker metadata when a later update omits it', () => {
    const state = createProviderIntakeState();

    upsertProviderIntakeClaim(state, {
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      issue_blocked_by: [
        {
          id: 'lin-blocker-1',
          identifier: 'CO-9',
          state: 'In Progress',
          state_type: 'started'
        }
      ],
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json'
    });

    const claim = upsertProviderIntakeClaim(state, {
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:00:01.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:todo_blocked_by_non_terminal',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json'
    });

    expect(claim.issue_blocked_by).toEqual([
      {
        id: 'lin-blocker-1',
        identifier: 'CO-9',
        state: 'In Progress',
        state_type: 'started'
      }
    ]);
  });

  it('preserves launch provenance when the run identity is unchanged and no new launch fields are supplied', () => {
    const state = createProviderIntakeState();

    const initialClaim = upsertProviderIntakeClaim(state, {
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

    expect(initialClaim.launch_started_at).toBeTruthy();

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
    expect(claim.launch_started_at).toBe(initialClaim.launch_started_at);
  });

  it('preserves launch provenance when the task and run id stay fixed but the manifest path is populated later', () => {
    const state = createProviderIntakeState();

    const initialClaim = upsertProviderIntakeClaim(state, {
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
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-1'
    });

    expect(initialClaim.launch_started_at).toBeTruthy();

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
      state: 'starting',
      reason: 'provider_issue_start_launched',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json'
    });

    expect(claim.launch_source).toBe('control-host');
    expect(claim.launch_token).toBe('launch-token-1');
    expect(claim.launch_started_at).toBe(initialClaim.launch_started_at);
  });

  it('clears stale queued retry state while preserving retry attempt on a running rehydrate override', () => {
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
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json',
      retry_queued: true,
      retry_attempt: 2,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: 'stale continuation queue'
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
      run_manifest_path: '/tmp/run-1/manifest.json',
      retry_queued: false,
      retry_attempt: 2,
      retry_due_at: null,
      retry_error: null
    });

    expect(claim).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      retry_queued: false,
      retry_attempt: 2,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('preserves launch provenance when the run id is first discovered during rehydrate', () => {
    const state = createProviderIntakeState();

    const initialClaim = upsertProviderIntakeClaim(state, {
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
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-1'
    });

    expect(initialClaim.launch_started_at).toBeTruthy();

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
    expect(claim.launch_started_at).toBe(initialClaim.launch_started_at);
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
    expect(claim.launch_started_at).toBeNull();
  });

  it('preserves worker_host when the run identity changes and no new worker_host is supplied', () => {
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
      worker_host: 'worker-host-02',
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
      state: 'starting',
      reason: 'provider_issue_rehydrated_queued_run',
      run_id: 'run-2',
      run_manifest_path: '/tmp/run-2/manifest.json'
    });

    expect(claim.worker_host).toBe('worker-host-02');
    expect(claim.launch_source).toBeNull();
    expect(claim.launch_token).toBeNull();
    expect(claim.launch_started_at).toBeNull();
  });

  it('preserves the launch timestamp anchor across a detached release rewrite', () => {
    const state = createProviderIntakeState();

    const inflightClaim = upsertProviderIntakeClaim(state, {
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
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-1',
      updated_at: '2026-03-19T04:00:10.000Z'
    });

    const claim = upsertProviderIntakeClaim(state, {
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:01:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: null,
      run_manifest_path: null,
      updated_at: '2026-03-19T04:02:00.000Z'
    });

    expect(inflightClaim.launch_started_at).toBe('2026-03-19T04:00:10.000Z');
    expect(claim.updated_at).toBe('2026-03-19T04:02:00.000Z');
    expect(claim.launch_started_at).toBe('2026-03-19T04:00:10.000Z');
  });

  it('does not invent a launch timestamp anchor for a legacy control-host handoff_failed claim', () => {
    const state = createProviderIntakeState();
    state.claims.push({
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
      state: 'handoff_failed',
      reason: 'provider_issue_rehydration_timeout',
      accepted_at: '2026-03-19T04:00:05.000Z',
      updated_at: '2026-03-19T04:00:10.000Z',
      last_delivery_id: 'delivery-handoff-failed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'legacy-launch-token'
    });

    const claim = upsertProviderIntakeClaim(state, {
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:01:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: null,
      run_manifest_path: null,
      updated_at: '2026-03-19T04:02:00.000Z'
    });

    expect(claim.updated_at).toBe('2026-03-19T04:02:00.000Z');
    expect(claim.launch_started_at).toBeNull();
  });
});

describe('buildProviderIntakeSummary', () => {
  it('surfaces same-assignee review handoff retries as handoff_owned instead of handoff_failed', () => {
    const state = createProviderIntakeState();

    upsertProviderIntakeClaim(state, {
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      issue_viewer_id: 'viewer-1',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_handoff_owned',
      run_id: 'run-1',
      run_manifest_path: '/tmp/run-1/manifest.json'
    });

    expect(buildProviderIntakeSummary(state)).toMatchObject({
      issue_identifier: 'CO-2',
      issue_viewer_id: 'viewer-1',
      state: 'handoff_owned',
      reason: 'provider_issue_handoff_owned',
      run_id: 'run-1',
      freshness: 'fresh',
      rehydrated_at: null,
      is_rehydrated: false
    });
  });

  it('marks summary claims as rehydrated when the latest intake state was restored', () => {
    const summary = buildProviderIntakeSummary({
      schema_version: 1,
      updated_at: '2026-03-19T04:50:00.000Z',
      rehydrated_at: '2026-03-19T04:45:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:40:00.000Z',
          task_id: 'linear-lin-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-19T04:40:05.000Z',
          updated_at: '2026-03-19T04:44:59.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_050_000,
          run_id: 'run-1',
          run_manifest_path: '/tmp/run-1/manifest.json',
          launch_source: null,
          launch_token: null
        }
      ]
    });

    expect(summary).toMatchObject({
      freshness: 'rehydrated',
      rehydrated_at: '2026-03-19T04:45:00.000Z',
      is_rehydrated: true
    });
  });
});

describe('normalizeProviderIntakeState', () => {
  it('normalizes persisted blocker metadata for rehydrated claims', () => {
    const normalized = normalizeProviderIntakeState({
      schema_version: 1,
      updated_at: '2026-03-19T04:50:00.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_completed_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'Todo',
          issue_state_type: 'unstarted',
          issue_updated_at: '2026-03-19T04:40:00.000Z',
          issue_viewer_id: 'viewer-1',
          issue_viewer_auth_fingerprint: 'viewer-auth-1',
          issue_blocked_by: [
            {
              id: 'lin-blocker-1',
              identifier: 'CO-9',
              state: 'In Progress',
              state_type: 'started'
            },
            {
              id: 123,
              identifier: null,
              state: 'Done',
              state_type: {}
            }
          ],
          task_id: 'linear-lin-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'completed',
          reason: 'provider_issue_rehydrated_completed_run',
          accepted_at: '2026-03-19T04:40:05.000Z',
          updated_at: '2026-03-19T04:40:10.000Z',
          last_delivery_id: 'delivery-completed',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_050_000,
          run_id: 'run-1',
          run_manifest_path: '/tmp/run-1/manifest.json',
          launch_source: null,
          launch_token: null
        }
      ]
    });

    expect(normalized.claims[0]?.issue_blocked_by).toEqual([
      {
        id: 'lin-blocker-1',
        identifier: 'CO-9',
        state: 'In Progress',
        state_type: 'started'
      },
      {
        id: null,
        identifier: null,
        state: 'Done',
        state_type: null
      }
    ]);
    expect(normalized.claims[0]?.issue_viewer_id).toBe('viewer-1');
    expect(normalized.claims[0]?.issue_viewer_auth_fingerprint).toBe('viewer-auth-1');
  });

  it('leaves launch_started_at unset for legacy control-host handoff_failed claims', () => {
    const normalized = normalizeProviderIntakeState({
      schema_version: 1,
      updated_at: '2026-03-19T04:50:00.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_failed:transient launch failure',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:40:00.000Z',
          task_id: 'linear-lin-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'handoff_failed',
          reason: 'provider_issue_start_failed:transient launch failure',
          accepted_at: '2026-03-19T04:40:05.000Z',
          updated_at: '2026-03-19T04:40:10.000Z',
          last_delivery_id: 'delivery-failed-start',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_050_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-token-failed'
        }
      ]
    });

    expect(normalized.claims[0]?.launch_started_at).toBeNull();
  });
});
