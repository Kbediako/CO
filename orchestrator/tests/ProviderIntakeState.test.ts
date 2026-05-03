import { describe, expect, it } from 'vitest';

import {
  buildProviderIntakeSummary,
  normalizeProviderIntakeState,
  selectProviderIntakeClaim,
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

function createClaim(
  overrides: Partial<ProviderIntakeState['claims'][number]> & {
    issue_identifier: string;
  }
): ProviderIntakeState['claims'][number] {
  const suffix = overrides.issue_identifier.replace(/^CO-/, '').toLowerCase();
  return {
    provider: 'linear',
    provider_key: `linear:lin-issue-${suffix}`,
    issue_id: `lin-issue-${suffix}`,
    issue_title: `Issue ${overrides.issue_identifier}`,
    issue_state: 'In Progress',
    issue_state_type: 'started',
    issue_updated_at: '2026-04-26T07:00:00.000Z',
    task_id: `linear-lin-issue-${suffix}`,
    mapping_source: 'provider_id_fallback',
    state: 'handoff_failed',
    reason: 'provider_issue_handoff_failed',
    accepted_at: '2026-04-26T07:00:00.000Z',
    updated_at: '2026-04-26T07:01:00.000Z',
    last_delivery_id: null,
    last_event: 'poll_tick',
    last_action: 'reconcile',
    last_webhook_timestamp: null,
    run_id: `run-${suffix}`,
    run_manifest_path: `/tmp/run-${suffix}/manifest.json`,
    retry_queued: null,
    retry_attempt: null,
    retry_due_at: null,
    retry_error: null,
    launch_source: 'control-host',
    launch_token: `launch-${suffix}`,
    ...overrides
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

  it.each([
    {
      nextState: 'starting' as const,
      nextReason: 'provider_issue_start_launched',
      nextRunId: null,
      nextRunManifestPath: null
    },
    {
      nextState: 'resuming' as const,
      nextReason: 'provider_issue_resume_launched',
      nextRunId: 'run-1',
      nextRunManifestPath: '/tmp/run-1/manifest.json'
    },
    {
      nextState: 'running' as const,
      nextReason: 'provider_issue_rehydrated_active_run',
      nextRunId: 'run-1',
      nextRunManifestPath: '/tmp/run-1/manifest.json'
    }
  ])(
    'clears stale queued first-retry state while preserving retry error on $nextState claims',
    ({ nextState, nextReason, nextRunId, nextRunManifestPath }) => {
      const state = createProviderIntakeState();

      upsertProviderIntakeClaim(state, {
        provider: 'linear',
        provider_key: 'linear:lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_title: 'Autonomous intake handoff',
        issue_state: 'Ready',
        issue_state_type: 'unstarted',
        issue_updated_at: '2026-03-19T04:00:00.000Z',
        task_id: 'linear-lin-issue-1',
        mapping_source: 'provider_id_fallback',
        state: 'accepted',
        reason: 'provider_issue_retry_queued',
        run_id: null,
        run_manifest_path: null,
        retry_queued: true,
        retry_attempt: null,
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
        state: nextState,
        reason: nextReason,
        run_id: nextRunId,
        run_manifest_path: nextRunManifestPath
      });

      expect(claim).toMatchObject({
        state: nextState,
        reason: nextReason,
        retry_queued: false,
        retry_attempt: null,
        retry_due_at: null,
        retry_error: 'stale continuation queue'
      });
    }
  );

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
      summary_scope: 'single_claim',
      active_claim_count: 1,
      running_claim_count: 0,
      rehydrated_at: null,
      is_rehydrated: false,
      selected_claim: {
        issue_identifier: 'CO-2',
        issue_viewer_id: 'viewer-1',
        state: 'handoff_owned',
        reason: 'provider_issue_handoff_owned',
        run_id: 'run-1',
        freshness: 'fresh'
      }
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
      summary_scope: 'single_claim',
      active_claim_count: 1,
      running_claim_count: 1,
      rehydrated_at: '2026-03-19T04:45:00.000Z',
      is_rehydrated: true,
      selected_claim: {
        issue_identifier: 'CO-2',
        freshness: 'rehydrated'
      }
    });
  });

  it('marks concurrent active claims as an explicitly scoped selected claim instead of provider-wide singular truth', () => {
    const summary = buildProviderIntakeSummary({
      schema_version: 1,
      updated_at: '2026-04-18T06:10:00.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-175',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-175',
          issue_id: 'lin-issue-175',
          issue_identifier: 'CO-175',
          issue_title: 'Provider intake claim one',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-18T06:09:00.000Z',
          task_id: 'linear-co-175',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-04-18T06:09:05.000Z',
          updated_at: '2026-04-18T06:09:30.000Z',
          last_delivery_id: 'delivery-175',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_960_570_000,
          run_id: 'run-175',
          run_manifest_path: '/tmp/run-175/manifest.json',
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-04-18T06:10:30.000Z',
          retry_error: 'selected-claim retry detail',
          launch_source: 'control-host',
          launch_token: 'launch-175'
        },
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-240',
          issue_id: 'lin-issue-240',
          issue_identifier: 'CO-240',
          issue_title: 'Provider intake claim two',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-18T06:08:00.000Z',
          task_id: 'linear-co-240',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-04-18T06:08:05.000Z',
          updated_at: '2026-04-18T06:08:30.000Z',
          last_delivery_id: 'delivery-240',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_960_510_000,
          run_id: 'run-240',
          run_manifest_path: '/tmp/run-240/manifest.json',
          launch_source: 'control-host',
          launch_token: 'launch-240'
        },
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-242',
          issue_id: 'lin-issue-242',
          issue_identifier: 'CO-242',
          issue_title: 'Provider intake claim three',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-18T06:07:00.000Z',
          task_id: 'linear-co-242',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-04-18T06:07:05.000Z',
          updated_at: '2026-04-18T06:07:30.000Z',
          last_delivery_id: 'delivery-242',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_960_450_000,
          run_id: 'run-242',
          run_manifest_path: '/tmp/run-242/manifest.json',
          launch_source: 'control-host',
          launch_token: 'launch-242'
        }
      ]
    });

    expect(summary).toMatchObject({
      summary_scope: 'selected_claim',
      selection_strategy: 'state_rank_updated_at',
      claim_count: 3,
      active_claim_count: 3,
      running_claim_count: 3,
      active_issue_identifiers: ['CO-175', 'CO-240', 'CO-242'],
      running_issue_identifiers: ['CO-175', 'CO-240', 'CO-242'],
      selected_claim: {
        issue_identifier: 'CO-175',
        task_id: 'linear-co-175',
        state: 'running',
        retry: {
          active: true,
          attempt: 2,
          due_at: '2026-04-18T06:10:30.000Z',
          error: 'selected-claim retry detail'
        }
      }
    });
  });

  it('counts queued retry claims as active issue identifiers even after terminal run state', () => {
    const summary = buildProviderIntakeSummary({
      schema_version: 1,
      updated_at: '2026-04-23T08:09:33.742Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-329',
      latest_reason: 'provider_issue_retry_queued',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-329',
          issue_id: 'lin-issue-329',
          issue_identifier: 'CO-329',
          issue_title: 'Retry queued follow-up',
          issue_state: 'Ready',
          issue_state_type: 'unstarted',
          issue_updated_at: '2026-04-23T08:07:41.709Z',
          task_id: 'linear-lin-issue-329',
          mapping_source: 'provider_id_fallback',
          state: 'completed',
          reason: 'provider_issue_retry_queued',
          accepted_at: '2026-04-23T08:04:00.000Z',
          updated_at: '2026-04-23T08:04:25.936Z',
          last_delivery_id: null,
          last_event: null,
          last_action: null,
          last_webhook_timestamp: null,
          run_id: null,
          run_manifest_path: null,
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-04-23T08:14:25.936Z',
          retry_error: 'queued retry still occupies capacity',
          launch_source: null,
          launch_token: null
        }
      ]
    });

    expect(summary).toMatchObject({
      active_claim_count: 1,
      running_claim_count: 0,
      active_issue_identifiers: ['CO-329'],
      running_issue_identifiers: [],
      selected_claim: {
        issue_identifier: 'CO-329',
        state: 'completed',
        retry: {
          active: true,
          attempt: 2,
          due_at: '2026-04-23T08:14:25.936Z'
        }
      }
    });
  });

  it('excludes terminal handoff failures and merge-closeout non-retry failures from active issue identifiers', () => {
    const summary = buildProviderIntakeSummary({
      schema_version: 1,
      updated_at: '2026-04-26T07:34:09.880Z',
      rehydrated_at: '2026-04-26T07:34:09.880Z',
      latest_provider_key: 'linear:lin-issue-381',
      latest_reason: 'provider_issue_handoff_failed',
      claims: [
        createClaim({
          issue_identifier: 'CO-381',
          issue_title: 'Completed stale merge closeout',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-26T05:00:00.000Z',
          accepted_at: '2026-04-26T00:18:10.000Z',
          updated_at: '2026-04-26T07:34:09.880Z'
        }),
        createClaim({
          issue_identifier: 'CO-382',
          issue_title: 'Stale started merge closeout',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-26T05:30:00.000Z',
          reason: 'provider_issue_merge_closeout_action_required',
          accepted_at: '2026-04-26T00:18:10.000Z',
          updated_at: '2026-04-26T07:35:09.880Z'
        }),
        createClaim({
          issue_identifier: 'CO-392',
          issue_title: 'Active failed handoff'
        }),
        createClaim({
          issue_identifier: 'CO-393',
          issue_title: 'Terminal retry stays active',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-26T06:00:00.000Z',
          state: 'completed',
          reason: 'provider_issue_retry_queued',
          accepted_at: '2026-04-26T06:00:00.000Z',
          updated_at: '2026-04-26T06:01:00.000Z',
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-04-26T06:10:00.000Z',
          retry_error: 'queued retry still occupies capacity'
        })
      ]
    });

    expect(summary).toMatchObject({
      active_claim_count: 2,
      running_claim_count: 0,
      active_issue_identifiers: ['CO-392', 'CO-393'],
      running_issue_identifiers: [],
      selected_claim: {
        issue_identifier: 'CO-392',
        state: 'handoff_failed'
      }
    });
  });

  it('prefers an active claim over inactive released history when multiple active claims remain', () => {
    const state = {
      schema_version: 1,
      updated_at: '2026-04-18T06:10:00.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-300',
      latest_reason: 'provider_issue_handoff_failed',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-300',
          issue_id: 'lin-issue-300',
          issue_identifier: 'CO-300',
          issue_title: 'Released historical claim',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-18T06:10:00.000Z',
          task_id: 'linear-co-300',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released',
          accepted_at: '2026-04-18T06:09:00.000Z',
          updated_at: '2026-04-18T06:10:00.000Z',
          last_delivery_id: 'delivery-300',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_960_600_000,
          run_id: 'run-300',
          run_manifest_path: '/tmp/run-300/manifest.json',
          launch_source: 'control-host',
          launch_token: 'launch-300'
        },
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-301',
          issue_id: 'lin-issue-301',
          issue_identifier: 'CO-301',
          issue_title: 'Active failed handoff claim one',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-18T06:09:00.000Z',
          task_id: 'linear-co-301',
          mapping_source: 'provider_id_fallback',
          state: 'handoff_failed',
          reason: 'provider_issue_handoff_failed',
          accepted_at: '2026-04-18T06:09:30.000Z',
          updated_at: '2026-04-18T06:09:30.000Z',
          last_delivery_id: 'delivery-301',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_960_570_000,
          run_id: 'run-301',
          run_manifest_path: '/tmp/run-301/manifest.json',
          launch_source: 'control-host',
          launch_token: 'launch-301'
        },
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-302',
          issue_id: 'lin-issue-302',
          issue_identifier: 'CO-302',
          issue_title: 'Active failed handoff claim two',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-18T06:08:00.000Z',
          task_id: 'linear-co-302',
          mapping_source: 'provider_id_fallback',
          state: 'handoff_failed',
          reason: 'provider_issue_handoff_failed',
          accepted_at: '2026-04-18T06:08:30.000Z',
          updated_at: '2026-04-18T06:08:30.000Z',
          last_delivery_id: 'delivery-302',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_960_540_000,
          run_id: 'run-302',
          run_manifest_path: '/tmp/run-302/manifest.json',
          launch_source: 'control-host',
          launch_token: 'launch-302'
        }
      ]
    } satisfies ProviderIntakeState;
    const summary = buildProviderIntakeSummary(state);

    expect(summary).toMatchObject({
      summary_scope: 'selected_claim',
      selection_strategy: 'state_rank_updated_at',
      claim_count: 3,
      active_claim_count: 2,
      running_claim_count: 0,
      active_issue_identifiers: ['CO-301', 'CO-302'],
      updated_at: '2026-04-18T06:10:00.000Z',
      selected_claim: {
        issue_identifier: 'CO-301',
        state: 'handoff_failed'
      }
    });
    expect(selectProviderIntakeClaim(state)?.issue_identifier).toBe('CO-301');
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
