import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';

import { computeEffectiveDelegationConfig } from '../src/cli/config/delegationConfig.js';
import { runCoStatusCliShell } from '../src/cli/coStatusCliShell.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';
import {
  LINEAR_ADVISORY_STATE_FILE,
  PROVIDER_INTAKE_STATE_FILE
} from '../src/cli/control/controlPersistenceFiles.js';
import { createControlServerSeededRuntimeAssembly } from '../src/cli/control/controlServerSeededRuntimeAssembly.js';
import { buildUiDataset } from '../src/cli/control/operatorDashboardPresenter.js';
import { readCompatibilityState } from '../src/cli/control/observabilitySurface.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import type { LinearAdvisoryState } from '../src/cli/control/linearWebhookController.js';
import type {
  ProviderIntakeClaimRecord,
  ProviderIntakeState
} from '../src/cli/control/providerIntakeState.js';
import { readUiDataset } from '../src/cli/control/operatorDashboardPresenter.js';
import { handleUiDataRequest } from '../src/cli/control/uiDataController.js';

async function createRunRoot(taskId: string) {
  const root = await mkdtemp(join(tmpdir(), 'control-server-seeded-runtime-'));
  const env = { repoRoot: root, runsRoot: join(root, '.runs'), outRoot: join(root, 'out'), taskId };
  const paths = resolveRunPaths(env, 'run-1');
  await mkdir(paths.runDir, { recursive: true });
  return { root, env, paths };
}

async function seedManifest(
  paths: { manifestPath: string },
  overrides: Record<string, unknown> = {}
): Promise<void> {
  await writeFile(
    paths.manifestPath,
    JSON.stringify({
      run_id: 'run-1',
      task_id: 'task-294',
      status: 'in_progress',
      started_at: '2026-04-21T16:00:00.000Z',
      updated_at: '2026-04-21T16:00:00.000Z',
      completed_at: null,
      summary: 'task is running',
      commands: [],
      approvals: [],
      ...overrides
    }),
    'utf8'
  );
}

function co272TrackedIssue(overrides: Partial<LiveLinearTrackedIssue> = {}): LiveLinearTrackedIssue {
  return {
    provider: 'linear',
    id: 'lin-issue-272',
    identifier: 'CO-272',
    title: 'Replace dead archive guidance',
    description: null,
    url: null,
    state: 'In Progress',
    state_type: 'started',
    archived_at: null,
    trashed: false,
    viewer_id: 'viewer-1',
    assignee_id: 'viewer-1',
    assignee_name: 'Codex',
    workspace_id: 'workspace-1',
    team_id: 'team-1',
    team_key: 'CO',
    team_name: 'CO',
    project_id: 'project-1',
    project_name: 'CO',
    updated_at: '2026-04-21T15:00:00.000Z',
    blocked_by: [],
    recent_activity: [],
    ...overrides
  };
}

function advisoryState(
  updatedAt: string,
  trackedIssue: LiveLinearTrackedIssue,
  deliveryId = 'delivery-current'
): LinearAdvisoryState {
  return {
    schema_version: 1,
    updated_at: updatedAt,
    latest_delivery_id: deliveryId,
    latest_result: 'accepted',
    latest_reason: 'linear_delivery_accepted',
    latest_event: null,
    latest_accepted_at: updatedAt,
    tracked_issue: trackedIssue,
    seen_deliveries: []
  };
}

function co272ProviderIntakeClaim(
  overrides: Partial<ProviderIntakeClaimRecord> = {}
): ProviderIntakeClaimRecord {
  return {
    provider: 'linear',
    provider_key: 'linear:lin-issue-272',
    issue_id: 'lin-issue-272',
    issue_identifier: 'CO-272',
    issue_title: 'Replace dead archive guidance',
    issue_state: 'In Progress',
    issue_state_type: 'started',
    issue_updated_at: '2026-04-21T14:59:00.000Z',
    issue_viewer_id: null,
    issue_viewer_auth_fingerprint: null,
    issue_assignee_id: null,
    issue_assignee_name: null,
    issue_blocked_by: null,
    task_id: 'linear-co-272-current-advisory',
    mapping_source: 'provider_id_fallback',
    state: 'starting',
    reason: 'provider_issue_start_launched',
    accepted_at: '2026-04-21T14:59:00.000Z',
    updated_at: '2026-04-21T14:59:00.000Z',
    last_delivery_id: 'delivery-prior',
    last_event: 'issue',
    last_action: 'update',
    last_webhook_timestamp: 1_777_000_000_000,
    run_id: null,
    run_manifest_path: null,
    launch_source: null,
    launch_token: null,
    launch_started_at: null,
    retry_queued: null,
    retry_attempt: null,
    retry_due_at: null,
    retry_error: null,
    merge_closeout: null,
    ...overrides
  };
}

describe('createControlServerSeededRuntimeAssembly', () => {
  it('injects the default rlm toggle while preserving other seeded toggles and shared identity wiring', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: {
          run_id: 'run-1',
          control_seq: 3,
          feature_toggles: {
            dispatch_pilot: { enabled: true }
          }
        },
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: null
      });
      const context = assembly.requestContextShared;

      expect(Object.keys(assembly).sort()).toEqual(['requestContextShared']);
      expect(context.controlStore.snapshot().feature_toggles).toEqual({
        dispatch_pilot: { enabled: true },
        rlm: { policy: config.rlm.policy }
      });
      expect(context.token).toBe('control-token');
      expect(context.config).toBe(config);
      expect(context.paths).toBe(paths);
      expect(context.clients).toBeInstanceOf(Set);
      expect(context.eventTransport).toBeDefined();
      expect(context.persist).toBeDefined();
      expect(context.linearAdvisoryState).toBeDefined();
      expect(context.runtime).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves an existing seeded rlm toggle without overriding it', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: {
          run_id: 'run-1',
          control_seq: 2,
          feature_toggles: {
            rlm: { policy: 'seeded-policy' },
            dispatch_pilot: { enabled: true }
          }
        },
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: null
      });

      expect(assembly.requestContextShared.controlStore.snapshot().feature_toggles).toEqual({
        rlm: { policy: 'seeded-policy' },
        dispatch_pilot: { enabled: true }
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('persists live store and advisory mutations instead of the original seeds', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const seededAdvisory: LinearAdvisoryState = {
      schema_version: 1,
      updated_at: '2026-03-09T00:00:00.000Z',
      latest_delivery_id: null,
      latest_result: null,
      latest_reason: null,
      latest_event: null,
      latest_accepted_at: null,
      tracked_issue: null,
      seen_deliveries: []
    };
    const seededProviderIntake: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-09T00:00:30.000Z',
      rehydrated_at: null,
      latest_provider_key: null,
      latest_reason: null,
      claims: []
    };

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: {
          run_id: 'run-1',
          control_seq: 1,
          feature_toggles: {
            transport_mutating_controls: { enabled: true }
          }
        },
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: seededAdvisory,
        providerIntakeSeed: seededProviderIntake
      });
      const context = assembly.requestContextShared;

      context.controlStore.updateAction({
        action: 'pause',
        requestedBy: 'tester',
        reason: 'manual_check'
      });
      context.controlStore.updateFeatureToggles({
        dispatch_pilot: { enabled: true }
      });
      const confirmation = context.confirmationStore.create({
        action: 'cancel',
        tool: 'ui.cancel',
        params: { run: 'run-1' }
      }).confirmation;
      context.confirmationStore.approve(confirmation.request_id, 'tester');
      context.questionQueue.enqueue({
        parentRunId: 'run-1',
        fromRunId: 'child-run',
        prompt: 'Need approval',
        urgency: 'high',
        autoPause: true
      });
      const delegation = context.delegationTokens.register('token-1', 'run-1', 'child-run');
      context.linearAdvisoryState.latest_delivery_id = 'delivery-1';
      context.linearAdvisoryState.latest_result = 'accepted';
      context.linearAdvisoryState.latest_reason = 'linear_delivery_accepted';
      context.linearAdvisoryState.latest_accepted_at = '2026-03-09T00:01:00.000Z';
      context.linearAdvisoryState.updated_at = '2026-03-09T00:01:00.000Z';
      context.linearAdvisoryState.seen_deliveries.push({
        delivery_id: 'delivery-1',
        event: 'issue',
        action: 'update',
        issue_id: 'ISSUE-1',
        webhook_timestamp: 1_700_000_000_000,
        processed_at: '2026-03-09T00:01:00.000Z',
        outcome: 'accepted',
        reason: 'linear_delivery_accepted'
      });
      const providerIntakeState = context.providerIntakeState;
      expect(providerIntakeState).toBeDefined();
      if (!providerIntakeState) {
        throw new Error('Expected seeded provider intake state to be available');
      }
      providerIntakeState.claims.push({
        provider: 'linear',
        provider_key: 'linear:ISSUE-1',
        issue_id: 'ISSUE-1',
        issue_identifier: 'PRE-1',
        issue_title: 'Seeded issue',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-09T00:01:00.000Z',
        task_id: 'linear-issue-1',
        mapping_source: 'provider_id_fallback',
        state: 'starting',
        reason: 'provider_issue_start_launched',
        accepted_at: '2026-03-09T00:01:00.000Z',
        updated_at: '2026-03-09T00:01:00.000Z',
        last_delivery_id: 'delivery-1',
        last_event: 'issue',
        last_action: 'update',
        last_webhook_timestamp: 1_700_000_000_000,
        run_id: null,
        run_manifest_path: null
      });

      await context.persist.control();
      await context.persist.confirmations();
      await context.persist.questions();
      await context.persist.delegationTokens();
      await context.persist.linearAdvisory();
      await context.persist.providerIntake?.();

      const controlSnapshot = JSON.parse(await readFile(paths.controlPath, 'utf8')) as {
        control_seq: number;
        latest_action?: { action?: string; requested_by?: string; reason?: string } | null;
        feature_toggles?: Record<string, unknown> | null;
      };
      expect(controlSnapshot.control_seq).toBe(2);
      expect(controlSnapshot.latest_action).toMatchObject({
        action: 'pause',
        requested_by: 'tester',
        reason: 'manual_check'
      });
      expect(controlSnapshot.feature_toggles).toMatchObject({
        transport_mutating_controls: { enabled: true },
        dispatch_pilot: { enabled: true },
        rlm: { policy: config.rlm.policy }
      });

      const confirmationsSnapshot = JSON.parse(await readFile(paths.confirmationsPath, 'utf8')) as {
        pending?: Array<{ request_id?: string; approved_by?: string | null }>;
      };
      expect(confirmationsSnapshot.pending).toHaveLength(1);
      expect(confirmationsSnapshot.pending?.[0]).toMatchObject({
        request_id: confirmation.request_id,
        approved_by: 'tester'
      });

      const questionsSnapshot = JSON.parse(await readFile(paths.questionsPath, 'utf8')) as {
        questions?: Array<{ prompt?: string; from_run_id?: string }>;
      };
      expect(questionsSnapshot.questions).toHaveLength(1);
      expect(questionsSnapshot.questions?.[0]).toMatchObject({
        prompt: 'Need approval',
        from_run_id: 'child-run'
      });

      const delegationSnapshot = JSON.parse(await readFile(paths.delegationTokensPath, 'utf8')) as {
        tokens?: Array<{ parent_run_id?: string; child_run_id?: string; token_id?: string }>;
      };
      expect(delegationSnapshot.tokens).toHaveLength(1);
      expect(delegationSnapshot.tokens?.[0]).toMatchObject({
        token_id: delegation.token_id,
        parent_run_id: 'run-1',
        child_run_id: 'child-run'
      });

      const advisorySnapshot = JSON.parse(
        await readFile(join(paths.runDir, LINEAR_ADVISORY_STATE_FILE), 'utf8')
      ) as LinearAdvisoryState;
      expect(advisorySnapshot.latest_delivery_id).toBe('delivery-1');
      expect(advisorySnapshot.latest_result).toBe('accepted');
      expect(advisorySnapshot.latest_reason).toBe('linear_delivery_accepted');
      expect(advisorySnapshot.seen_deliveries).toHaveLength(1);

      const providerIntakeSnapshot = JSON.parse(
        await readFile(join(paths.runDir, PROVIDER_INTAKE_STATE_FILE), 'utf8')
      ) as ProviderIntakeState;
      expect(providerIntakeSnapshot.claims).toHaveLength(1);
      expect(providerIntakeSnapshot.claims[0]).toMatchObject({
        provider_key: 'linear:ISSUE-1',
        state: 'starting',
        task_id: 'linear-issue-1'
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('marks advisory state stale when provider intake persists newer truth', async () => {
    const { root, env, paths } = await createRunRoot('task-294');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const seededAdvisory = advisoryState(
      '2026-03-22T04:01:03.255Z',
      co272TrackedIssue({
        state: 'Blocked',
        updated_at: '2026-03-22T04:01:03.255Z'
      }),
      'delivery-old'
    );
    const seededProviderIntake: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-21T16:00:00.000Z',
      rehydrated_at: '2026-04-21T16:00:00.000Z',
      latest_provider_key: null,
      latest_reason: null,
      claims: [
        co272ProviderIntakeClaim({
          issue_updated_at: '2026-04-21T16:00:00.000Z',
          updated_at: '2026-04-21T16:00:00.000Z'
        })
      ]
    };

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: seededAdvisory,
        providerIntakeSeed: seededProviderIntake
      });

      await seedManifest(paths, {
        task_id: 'linear-co-294-stale-advisory-state',
        issue_provider: 'linear',
        issue_id: 'lin-issue-272',
        issue_identifier: 'CO-272',
        summary: 'selected issue has no authoritative tracked payload',
        updated_at: '2026-04-21T16:00:00.000Z'
      });

      const selectedSnapshot =
        await assembly.requestContextShared.runtime.snapshot().readSelectedRunSnapshot();
      expect(assembly.requestContextShared.linearAdvisoryState.stale_source).toMatchObject({
        source: 'provider-intake',
        reason: 'provider_intake_newer_than_linear_advisory',
        provider_intake_updated_at: '2026-04-21T16:00:00.000Z',
        advisory_updated_at: '2026-03-22T04:01:03.255Z'
      });
      expect(selectedSnapshot.selected?.issueIdentifier).toBe('CO-272');
      expect(selectedSnapshot.selected?.tracked?.linear ?? null).toBeNull();
      expect(selectedSnapshot.tracked?.linear ?? null).toBeNull();

      await assembly.requestContextShared.persist.providerIntake?.();

      const advisorySnapshot = JSON.parse(
        await readFile(join(paths.runDir, LINEAR_ADVISORY_STATE_FILE), 'utf8')
      ) as LinearAdvisoryState;
      expect(advisorySnapshot.updated_at).toBe('2026-03-22T04:01:03.255Z');
      expect(advisorySnapshot.stale_source).toMatchObject({
        source: 'provider-intake',
        reason: 'provider_intake_newer_than_linear_advisory',
        provider_intake_updated_at: '2026-04-21T16:00:00.000Z',
        advisory_updated_at: '2026-03-22T04:01:03.255Z'
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed after restart when fresh provider-intake truth no longer validates retained tracked.linear', async () => {
    const { root, env, paths } = await createRunRoot('task-460');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const seededAdvisory = advisoryState(
      '2026-03-22T04:01:03.255Z',
      co272TrackedIssue({
        id: 'lin-issue-1',
        identifier: 'CO-1',
        title: 'Stale retained CO-1 advisory',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-22T04:01:03.255Z'
      }),
      'delivery-co-1-stale'
    );
    const seededProviderIntake: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-05-01T02:52:40.455Z',
      rehydrated_at: '2026-05-01T02:52:40.455Z',
      latest_provider_key: null,
      latest_reason: null,
      claims: [
        co272ProviderIntakeClaim({
          provider_key: 'linear:lin-issue-460',
          issue_id: 'lin-issue-460',
          issue_identifier: 'CO-460',
          issue_title: 'CO STATUS stale advisory fallback regression',
          task_id: 'linear-93785af4-9df9-4713-8a63-b0caddb5796f',
          issue_updated_at: '2026-05-01T02:52:40.455Z',
          updated_at: '2026-05-01T02:52:40.455Z'
        })
      ]
    };

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: seededAdvisory,
        providerIntakeSeed: seededProviderIntake
      });

      await seedManifest(paths, {
        task_id: 'local-mcp',
        issue_provider: null,
        issue_id: null,
        issue_identifier: null,
        summary: 'control host restarted with stale retained advisory',
        updated_at: '2026-05-01T02:52:52.000Z'
      });

      const context = assembly.requestContextShared;
      const selectedSnapshot = await context.runtime.snapshot().readSelectedRunSnapshot();
      const compatibilityProjection = await context.runtime.snapshot().readCompatibilityProjection();
      const apiState = await readCompatibilityState({
        controlStore: context.controlStore,
        paths: context.paths,
        readCompatibilityProjection: async () => compatibilityProjection
      });
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-05-01T02:52:52.000Z'
      });

      expect(context.linearAdvisoryState.stale_source).toMatchObject({
        source: 'provider-intake',
        reason: 'provider_intake_missing_tracked_issue_after_linear_advisory',
        provider_intake_updated_at: '2026-05-01T02:52:40.455Z',
        advisory_updated_at: '2026-03-22T04:01:03.255Z'
      });
      expect(selectedSnapshot.tracked?.linear ?? null).toBeNull();
      expect(compatibilityProjection.tracked?.linear ?? null).toBeNull();
      expect((apiState as { tracked?: { linear?: unknown } }).tracked?.linear ?? null).toBeNull();
      expect((uiDataset as { tracked?: { linear?: unknown } }).tracked?.linear ?? null).toBeNull();

      await context.persist.providerIntake?.();
      const advisorySnapshot = JSON.parse(
        await readFile(join(paths.runDir, LINEAR_ADVISORY_STATE_FILE), 'utf8')
      ) as LinearAdvisoryState;
      expect(advisorySnapshot.stale_source).toMatchObject({
        reason: 'provider_intake_missing_tracked_issue_after_linear_advisory',
        provider_intake_updated_at: '2026-05-01T02:52:40.455Z'
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed after restart when freshly rehydrated provider-intake truth has no active claims', async () => {
    const { root, env, paths } = await createRunRoot('task-460-empty-intake');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const seededAdvisory = advisoryState(
      '2026-03-22T04:01:03.255Z',
      co272TrackedIssue({
        id: 'lin-issue-1',
        identifier: 'CO-1',
        title: 'Stale retained CO-1 advisory',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-22T04:01:03.255Z'
      }),
      'delivery-co-1-stale'
    );
    const seededProviderIntake: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-05-01T02:52:40.455Z',
      rehydrated_at: '2026-05-01T02:52:40.455Z',
      latest_provider_key: null,
      latest_reason: null,
      claims: []
    };

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: seededAdvisory,
        providerIntakeSeed: seededProviderIntake
      });

      await seedManifest(paths, {
        task_id: 'local-mcp',
        issue_provider: null,
        issue_id: null,
        issue_identifier: null,
        summary: 'control host restarted with stale retained advisory and empty intake',
        updated_at: '2026-05-01T02:52:52.000Z'
      });

      const context = assembly.requestContextShared;
      const selectedSnapshot = await context.runtime.snapshot().readSelectedRunSnapshot();
      const compatibilityProjection = await context.runtime.snapshot().readCompatibilityProjection();
      const apiState = await readCompatibilityState({
        controlStore: context.controlStore,
        paths: context.paths,
        readCompatibilityProjection: async () => compatibilityProjection
      });
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-05-01T02:52:52.000Z'
      });

      expect(context.linearAdvisoryState.stale_source).toMatchObject({
        source: 'provider-intake',
        reason: 'provider_intake_missing_tracked_issue_after_linear_advisory',
        provider_intake_updated_at: '2026-05-01T02:52:40.455Z',
        advisory_updated_at: '2026-03-22T04:01:03.255Z'
      });
      expect(selectedSnapshot.tracked?.linear ?? null).toBeNull();
      expect(compatibilityProjection.tracked?.linear ?? null).toBeNull();
      expect((apiState as { tracked?: { linear?: unknown } }).tracked?.linear ?? null).toBeNull();
      expect((uiDataset as { tracked?: { linear?: unknown } }).tracked?.linear ?? null).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('keeps accepted advisory fallback live for polling-only provider intake heartbeats', async () => {
    const { root, env, paths } = await createRunRoot('task-294');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const seededAdvisory = advisoryState(
      '2026-04-21T15:00:00.000Z',
      co272TrackedIssue()
    );
    const seededProviderIntake: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-21T14:59:00.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-272',
      latest_reason: 'provider_issue_start_launched',
      claims: [co272ProviderIntakeClaim()]
    };

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: seededAdvisory,
        providerIntakeSeed: seededProviderIntake
      });

      await seedManifest(paths, {
        task_id: 'linear-co-272-current-advisory',
        issue_provider: 'linear',
        issue_id: 'lin-issue-272',
        issue_identifier: 'CO-272',
        summary: 'selected issue has no authoritative tracked payload',
        updated_at: '2026-04-21T16:00:00.000Z'
      });

      await assembly.requestContextShared.persist.providerIntakePolling?.(
        { updated_at: '2026-04-21T16:00:00.000Z', status: 'ok' },
        '2026-04-21T16:00:00.000Z'
      );

      const selectedSnapshot =
        await assembly.requestContextShared.runtime.snapshot().readSelectedRunSnapshot();
      expect(assembly.requestContextShared.linearAdvisoryState.stale_source ?? null).toBeNull();
      expect(selectedSnapshot.selected?.tracked?.linear?.identifier).toBe('CO-272');
      expect(selectedSnapshot.tracked?.linear?.identifier).toBe('CO-272');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('keeps accepted advisory fallback live when only provider intake rehydrated_at advances', async () => {
    const { root, env, paths } = await createRunRoot('task-294');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const seededAdvisory = advisoryState(
      '2026-04-21T15:00:00.000Z',
      co272TrackedIssue()
    );
    const seededProviderIntake: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-21T14:59:00.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-272',
      latest_reason: 'provider_issue_start_launched',
      claims: [co272ProviderIntakeClaim()]
    };

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: seededAdvisory,
        providerIntakeSeed: seededProviderIntake
      });

      await seedManifest(paths, {
        task_id: 'linear-co-272-current-advisory',
        issue_provider: 'linear',
        issue_id: 'lin-issue-272',
        issue_identifier: 'CO-272',
        summary: 'selected issue has no authoritative tracked payload',
        updated_at: '2026-04-21T16:00:00.000Z'
      });
      await assembly.requestContextShared.persist.linearAdvisory();

      const baselineSnapshot =
        await assembly.requestContextShared.runtime.snapshot().readSelectedRunSnapshot();
      expect(assembly.requestContextShared.linearAdvisoryState.stale_source ?? null).toBeNull();
      expect(baselineSnapshot.selected?.tracked?.linear?.identifier).toBe('CO-272');
      expect(baselineSnapshot.tracked?.linear?.identifier).toBe('CO-272');

      const providerIntakeState = assembly.requestContextShared.providerIntakeState!;
      providerIntakeState.rehydrated_at = '2026-04-21T16:30:00.000Z';

      const beforePersistSnapshot =
        await assembly.requestContextShared.runtime.snapshot().readSelectedRunSnapshot();
      expect(assembly.requestContextShared.linearAdvisoryState.stale_source ?? null).toBeNull();
      expect(beforePersistSnapshot.selected?.tracked?.linear?.identifier).toBe('CO-272');
      expect(beforePersistSnapshot.tracked?.linear?.identifier).toBe('CO-272');

      await assembly.requestContextShared.persist.providerIntake?.();

      const afterPersistSnapshot =
        await assembly.requestContextShared.runtime.snapshot().readSelectedRunSnapshot();
      expect(assembly.requestContextShared.linearAdvisoryState.stale_source ?? null).toBeNull();
      expect(afterPersistSnapshot.selected?.tracked?.linear?.identifier).toBe('CO-272');
      expect(afterPersistSnapshot.tracked?.linear?.identifier).toBe('CO-272');

      const advisorySnapshot = JSON.parse(
        await readFile(join(paths.runDir, LINEAR_ADVISORY_STATE_FILE), 'utf8')
      ) as LinearAdvisoryState;
      expect(advisorySnapshot.updated_at).toBe('2026-04-21T15:00:00.000Z');
      expect(advisorySnapshot.stale_source ?? null).toBeNull();

      const providerIntakeSnapshot = JSON.parse(
        await readFile(join(paths.runDir, PROVIDER_INTAKE_STATE_FILE), 'utf8')
      ) as ProviderIntakeState;
      expect(providerIntakeSnapshot.updated_at).toBe('2026-04-21T14:59:00.000Z');
      expect(providerIntakeSnapshot.rehydrated_at).toBe('2026-04-21T16:30:00.000Z');
      expect(providerIntakeSnapshot.claims[0]).toMatchObject({
        updated_at: '2026-04-21T14:59:00.000Z',
        issue_updated_at: '2026-04-21T14:59:00.000Z'
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('invalidates cached runtime snapshots when provider intake marks the advisory stale', async () => {
    const { root, env, paths } = await createRunRoot('task-294');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const seededAdvisory = advisoryState(
      '2026-04-21T15:00:00.000Z',
      co272TrackedIssue()
    );
    const seededProviderIntake: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-21T14:59:00.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-272',
      latest_reason: 'provider_issue_start_launched',
      claims: [co272ProviderIntakeClaim()]
    };

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: seededAdvisory,
        providerIntakeSeed: seededProviderIntake
      });

      await seedManifest(paths, {
        task_id: 'linear-co-272-current-advisory',
        issue_provider: 'linear',
        issue_id: 'lin-issue-272',
        issue_identifier: 'CO-272',
        summary: 'selected issue has no authoritative tracked payload',
        updated_at: '2026-04-21T16:00:00.000Z'
      });

      const cachedSnapshot =
        await assembly.requestContextShared.runtime.snapshot().readSelectedRunSnapshot();
      expect(cachedSnapshot.tracked?.linear?.identifier).toBe('CO-272');

      const providerIntakeState = assembly.requestContextShared.providerIntakeState!;
      providerIntakeState.updated_at = '2026-04-21T16:30:00.000Z';
      providerIntakeState.rehydrated_at = '2026-04-21T16:30:00.000Z';
      providerIntakeState.claims[0] = {
        ...providerIntakeState.claims[0]!,
        updated_at: '2026-04-21T16:30:00.000Z',
        issue_updated_at: '2026-04-21T16:30:00.000Z'
      };

      await assembly.requestContextShared.persist.providerIntake?.();

      const refreshedSnapshot =
        await assembly.requestContextShared.runtime.snapshot().readSelectedRunSnapshot();
      expect(assembly.requestContextShared.linearAdvisoryState.stale_source).toMatchObject({
        source: 'provider-intake',
        reason: 'provider_intake_newer_than_linear_advisory',
        provider_intake_updated_at: '2026-04-21T16:30:00.000Z',
        advisory_updated_at: '2026-04-21T15:00:00.000Z'
      });
      expect(refreshedSnapshot.tracked?.linear ?? null).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('sources top-level provider intake from fresh persisted raw state after projection cache is stale', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    let server: http.Server | null = null;

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'control-host',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: {
          schema_version: 1,
          updated_at: '2026-05-01T02:10:46.790Z',
          rehydrated_at: null,
          latest_provider_key: 'linear:lin-issue-424',
          latest_reason: 'stale cached provider-intake summary',
          polling: null,
          claims: [
            co272ProviderIntakeClaim({
              provider_key: 'linear:lin-issue-424',
              issue_id: 'lin-issue-424',
              issue_identifier: 'CO-424',
              issue_title: 'Stale selected claim',
              task_id: 'linear-co-424-stale',
              run_id: 'stale-provider-run',
              reason: 'stale cached provider-intake summary',
              updated_at: '2026-05-01T02:10:46.790Z',
              accepted_at: '2026-05-01T02:09:46.790Z',
              issue_updated_at: '2026-05-01T02:10:00.000Z'
            })
          ]
        }
      });

      await seedManifest(paths, {
        run_id: 'control-host',
        task_id: 'local-mcp',
        issue_provider: 'linear',
        issue_id: 'lin-issue-424',
        issue_identifier: 'CO-424',
        updated_at: '2026-05-01T02:10:46.790Z'
      });
      await writeFile(join(paths.runDir, 'control_auth.json'), JSON.stringify({ token: 'snapshot-token' }), 'utf8');

      const context = assembly.requestContextShared;
      const readCompatibilityProjection = () =>
        context.runtime.snapshot().readCompatibilityProjection();
      const presenterContext = {
        controlStore: context.controlStore,
        paths: context.paths,
        readCompatibilityProjection
      };

      const cachedProjection = await readCompatibilityProjection();
      expect(cachedProjection.providerIntake?.selected_claim.issue_identifier).toBe('CO-424');
      expect(cachedProjection.providerIntake?.updated_at).toBe('2026-05-01T02:10:46.790Z');

      const providerIntakeState = context.providerIntakeState;
      expect(providerIntakeState).toBeDefined();
      if (!providerIntakeState) {
        throw new Error('Expected provider intake state to be available');
      }
      providerIntakeState.updated_at = '2026-05-01T02:41:32.000Z';
      providerIntakeState.latest_provider_key = 'linear:lin-issue-459';
      providerIntakeState.latest_reason = 'fresh raw provider-intake snapshot';
      providerIntakeState.claims = [
        co272ProviderIntakeClaim({
          provider_key: 'linear:lin-issue-459',
          issue_id: 'lin-issue-459',
          issue_identifier: 'CO-459',
          issue_title: 'Fresh raw provider intake truth',
          task_id: 'linear-co-459-fresh',
          run_id: 'fresh-provider-run',
          state: 'running',
          reason: 'fresh raw provider-intake snapshot',
          accepted_at: '2026-05-01T02:40:32.000Z',
          updated_at: '2026-05-01T02:41:32.000Z',
          issue_updated_at: '2026-05-01T02:41:00.000Z'
        })
      ];
      await context.persist.providerIntake?.();
      await seedManifest(paths, {
        run_id: 'fresh-provider-run',
        task_id: 'linear-co-459-fresh',
        issue_provider: 'linear',
        issue_id: 'lin-issue-459',
        issue_identifier: 'CO-459',
        status: 'in_progress',
        summary: 'Fresh raw provider intake truth',
        updated_at: '2026-05-01T02:41:32.000Z'
      });

      const apiPayload = await readCompatibilityState(presenterContext);
      const uiPayload = await readUiDataset(presenterContext);

      expect(apiPayload.selected?.issue_identifier).toBe('CO-459');
      expect(apiPayload.running_ids).toContain('CO-459');
      expect(apiPayload.running_ids).not.toContain('CO-424');
      expect(apiPayload.provider_intake?.updated_at).toBe('2026-05-01T02:41:32.000Z');
      expect(apiPayload.provider_intake?.selected_claim).toMatchObject({
        issue_identifier: 'CO-459',
        run_id: 'fresh-provider-run',
        state: 'running'
      });
      expect(uiPayload.selected_issue_identifier).toBe('CO-459');
      expect(uiPayload.running.map((entry) => entry.issue_identifier)).toContain('CO-459');
      expect(uiPayload.running.map((entry) => entry.issue_identifier)).not.toContain('CO-424');
      expect(uiPayload.provider_intake?.updated_at).toBe('2026-05-01T02:41:32.000Z');
      expect(uiPayload.provider_intake?.selected_claim).toMatchObject({
        issue_identifier: 'CO-459',
        run_id: 'fresh-provider-run',
        state: 'running'
      });

      server = http.createServer(async (req, res) => {
        const handled = await handleUiDataRequest({
          req,
          res,
          presenterContext
        });
        if (!handled) {
          res.writeHead(404).end();
        }
      });
      await new Promise<void>((resolve) => {
        server!.listen(0, '127.0.0.1', () => resolve());
      });
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected loopback server address');
      }
      await writeFile(
        join(paths.runDir, 'control_endpoint.json'),
        JSON.stringify({
          base_url: `http://127.0.0.1:${address.port}`,
          token_path: 'control_auth.json'
        }),
        'utf8'
      );

      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      try {
        await runCoStatusCliShell({
          flags: {
            format: 'json',
            'operator-dashboard': true,
            'run-dir': paths.runDir
          },
          printHelp: vi.fn()
        });
        const coStatusPayload = JSON.parse(String(log.mock.calls.at(-1)?.[0])) as {
          provider_intake?: {
            updated_at?: unknown;
            selected_claim?: {
              issue_identifier?: unknown;
              run_id?: unknown;
              state?: unknown;
            };
          };
          selected_issue_identifier?: unknown;
          running?: Array<{ issue_identifier?: unknown }>;
        };
        expect(coStatusPayload.selected_issue_identifier).toBe('CO-459');
        expect(coStatusPayload.running?.map((entry) => entry.issue_identifier)).toContain('CO-459');
        expect(coStatusPayload.running?.map((entry) => entry.issue_identifier)).not.toContain('CO-424');
        expect(coStatusPayload.provider_intake?.updated_at).toBe('2026-05-01T02:41:32.000Z');
        expect(coStatusPayload.provider_intake?.selected_claim).toMatchObject({
          issue_identifier: 'CO-459',
          run_id: 'fresh-provider-run',
          state: 'running'
        });
      } finally {
        log.mockRestore();
      }
    } finally {
      if (server) {
        await new Promise<void>((resolve) => server!.close(() => resolve()));
      }
      await rm(root, { recursive: true, force: true });
    }
  });

  it('refreshes cached top-level provider intake when only the raw authority timestamp advances', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'control-host',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: {
          schema_version: 1,
          updated_at: '2026-05-01T02:10:46.790Z',
          rehydrated_at: null,
          latest_provider_key: 'linear:lin-issue-459',
          latest_reason: 'fresh raw provider-intake snapshot',
          polling: null,
          claims: [
            co272ProviderIntakeClaim({
              provider_key: 'linear:lin-issue-459',
              issue_id: 'lin-issue-459',
              issue_identifier: 'CO-459',
              issue_title: 'Fresh raw provider intake truth',
              task_id: 'linear-co-459-fresh',
              run_id: 'fresh-provider-run',
              state: 'running',
              reason: 'fresh raw provider-intake snapshot',
              accepted_at: '2026-05-01T02:09:46.790Z',
              updated_at: '2026-05-01T02:10:46.790Z',
              issue_updated_at: '2026-05-01T02:10:00.000Z'
            })
          ]
        }
      });

      const context = assembly.requestContextShared;
      const presenterContext = {
        controlStore: context.controlStore,
        paths: context.paths,
        readCompatibilityProjection: () => context.runtime.snapshot().readCompatibilityProjection()
      };

      const cachedProjection = await presenterContext.readCompatibilityProjection();
      expect(cachedProjection.providerIntake?.updated_at).toBe('2026-05-01T02:10:46.790Z');
      expect(cachedProjection.providerIntake?.selected_claim.updated_at).toBe('2026-05-01T02:10:46.790Z');

      const providerIntakeState = context.providerIntakeState;
      expect(providerIntakeState).toBeDefined();
      if (!providerIntakeState) {
        throw new Error('Expected provider intake state to be available');
      }
      providerIntakeState.updated_at = '2026-05-01T02:41:32.000Z';
      await context.persist.providerIntake?.();

      const apiPayload = await readCompatibilityState(presenterContext);
      const uiPayload = await readUiDataset(presenterContext);

      expect(apiPayload.provider_intake?.updated_at).toBe('2026-05-01T02:41:32.000Z');
      expect(apiPayload.provider_intake?.selected_claim.issue_identifier).toBe('CO-459');
      expect(uiPayload.provider_intake?.updated_at).toBe('2026-05-01T02:41:32.000Z');
      expect(uiPayload.provider_intake?.selected_claim.issue_identifier).toBe('CO-459');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('drops stale top-level provider intake when the fresh persisted raw state has no claims', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'control-host',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: {
          schema_version: 1,
          updated_at: '2026-05-01T02:10:46.790Z',
          rehydrated_at: null,
          latest_provider_key: 'linear:lin-issue-424',
          latest_reason: 'stale cached provider-intake summary',
          polling: null,
          claims: [
            co272ProviderIntakeClaim({
              provider_key: 'linear:lin-issue-424',
              issue_id: 'lin-issue-424',
              issue_identifier: 'CO-424',
              issue_title: 'Stale selected claim',
              task_id: 'linear-co-424-stale',
              run_id: 'stale-provider-run',
              reason: 'stale cached provider-intake summary',
              updated_at: '2026-05-01T02:10:46.790Z'
            })
          ]
        }
      });

      const context = assembly.requestContextShared;
      const presenterContext = {
        controlStore: context.controlStore,
        paths: context.paths,
        readCompatibilityProjection: () => context.runtime.snapshot().readCompatibilityProjection()
      };

      const cachedProjection = await presenterContext.readCompatibilityProjection();
      expect(cachedProjection.providerIntake?.selected_claim.issue_identifier).toBe('CO-424');

      const providerIntakeState = context.providerIntakeState;
      expect(providerIntakeState).toBeDefined();
      if (!providerIntakeState) {
        throw new Error('Expected provider intake state to be available');
      }
      providerIntakeState.updated_at = '2026-05-01T02:41:32.000Z';
      providerIntakeState.latest_provider_key = null;
      providerIntakeState.latest_reason = null;
      providerIntakeState.claims = [];
      await context.persist.providerIntake?.();

      const apiPayload = await readCompatibilityState(presenterContext);
      const uiPayload = await readUiDataset(presenterContext);

      expect(apiPayload).not.toHaveProperty('provider_intake');
      expect(uiPayload).not.toHaveProperty('provider_intake');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed instead of discovering stale runs when raw provider intake is missing at startup', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const staleRunDir = join(root, '.runs', 'linear-co-424-stale', 'cli', 'stale-provider-run');
      await mkdir(staleRunDir, { recursive: true });
      await writeFile(
        join(staleRunDir, 'manifest.json'),
        JSON.stringify({
          run_id: 'stale-provider-run',
          task_id: 'linear-co-424-stale',
          status: 'in_progress',
          started_at: '2026-05-01T02:09:46.790Z',
          updated_at: '2026-05-01T02:10:46.790Z',
          completed_at: null,
          summary: 'Stale selected claim',
          issue_provider: 'linear',
          issue_id: 'lin-issue-424',
          issue_identifier: 'CO-424'
        }),
        'utf8'
      );

      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'control-host',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: null
      });

      const context = assembly.requestContextShared;
      const presenterContext = {
        controlStore: context.controlStore,
        paths: context.paths,
        readCompatibilityProjection: () => context.runtime.snapshot().readCompatibilityProjection()
      };
      const apiPayload = await readCompatibilityState(presenterContext);
      const uiPayload = await readUiDataset(presenterContext);

      expect(apiPayload.provider_intake).toBeNull();
      expect(apiPayload.provider_intake_unavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(apiPayload.selected?.issue_identifier).not.toBe('CO-424');
      expect(apiPayload.running_ids).not.toContain('CO-424');
      expect(uiPayload.provider_intake).toBeNull();
      expect(uiPayload.provider_intake_unavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(uiPayload.selected_issue_identifier).not.toBe('CO-424');
      expect(uiPayload.running.map((entry) => entry.issue_identifier)).not.toContain('CO-424');

      await context.persist.providerIntake?.();
      const providerIntakeSnapshotAfterEmptyPersist = JSON.parse(
        await readFile(join(paths.runDir, PROVIDER_INTAKE_STATE_FILE), 'utf8')
      ) as ProviderIntakeState;
      expect(providerIntakeSnapshotAfterEmptyPersist.authority).toEqual({
        status: 'unavailable',
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(providerIntakeSnapshotAfterEmptyPersist.claims).toEqual([]);
      const apiPayloadAfterEmptyPersist = await readCompatibilityState(presenterContext);
      const uiPayloadAfterEmptyPersist = await readUiDataset(presenterContext);
      expect(apiPayloadAfterEmptyPersist.provider_intake).toBeNull();
      expect(apiPayloadAfterEmptyPersist.provider_intake_unavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(apiPayloadAfterEmptyPersist.selected?.issue_identifier).not.toBe('CO-424');
      expect(apiPayloadAfterEmptyPersist.running_ids).not.toContain('CO-424');
      expect(uiPayloadAfterEmptyPersist.provider_intake).toBeNull();
      expect(uiPayloadAfterEmptyPersist.provider_intake_unavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(uiPayloadAfterEmptyPersist.selected_issue_identifier).not.toBe('CO-424');
      expect(uiPayloadAfterEmptyPersist.running.map((entry) => entry.issue_identifier)).not.toContain('CO-424');

      await context.persist.providerIntakePolling?.({
        enabled: true,
        checking: true
      });
      const apiPayloadAfterPolling = await readCompatibilityState(presenterContext);
      const uiPayloadAfterPolling = await readUiDataset(presenterContext);

      expect(apiPayloadAfterPolling.provider_intake).toBeNull();
      expect(apiPayloadAfterPolling.provider_intake_unavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(apiPayloadAfterPolling.selected?.issue_identifier).not.toBe('CO-424');
      expect(apiPayloadAfterPolling.running_ids).not.toContain('CO-424');
      expect(uiPayloadAfterPolling.provider_intake).toBeNull();
      expect(uiPayloadAfterPolling.provider_intake_unavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(uiPayloadAfterPolling.selected_issue_identifier).not.toBe('CO-424');
      expect(uiPayloadAfterPolling.running.map((entry) => entry.issue_identifier)).not.toContain('CO-424');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves unreadable raw provider intake authority across empty startup persist', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const staleRunDir = join(root, '.runs', 'linear-co-424-stale', 'cli', 'stale-provider-run');
      await mkdir(staleRunDir, { recursive: true });
      await writeFile(
        join(staleRunDir, 'manifest.json'),
        JSON.stringify({
          run_id: 'stale-provider-run',
          task_id: 'linear-co-424-stale',
          status: 'in_progress',
          started_at: '2026-05-01T02:09:46.790Z',
          updated_at: '2026-05-01T02:10:46.790Z',
          completed_at: null,
          summary: 'Stale selected claim',
          issue_provider: 'linear',
          issue_id: 'lin-issue-424',
          issue_identifier: 'CO-424'
        }),
        'utf8'
      );

      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'control-host',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: {
          schema_version: 1,
          updated_at: '2026-05-01T02:10:46.790Z',
          rehydrated_at: null,
          latest_provider_key: null,
          latest_reason: null,
          authority: {
            status: 'unavailable',
            reason: 'raw_provider_intake_read_failed',
            updated_at: null
          },
          polling: null,
          claims: []
        }
      });

      const context = assembly.requestContextShared;
      const presenterContext = {
        controlStore: context.controlStore,
        paths: context.paths,
        readCompatibilityProjection: () => context.runtime.snapshot().readCompatibilityProjection()
      };

      await context.persist.providerIntake?.();
      const providerIntakeSnapshotAfterEmptyPersist = JSON.parse(
        await readFile(join(paths.runDir, PROVIDER_INTAKE_STATE_FILE), 'utf8')
      ) as ProviderIntakeState;
      expect(providerIntakeSnapshotAfterEmptyPersist.authority).toEqual({
        status: 'unavailable',
        reason: 'raw_provider_intake_read_failed',
        updated_at: null
      });
      expect(providerIntakeSnapshotAfterEmptyPersist.claims).toEqual([]);

      const apiPayload = await readCompatibilityState(presenterContext);
      const uiPayload = await readUiDataset(presenterContext);
      expect(apiPayload.provider_intake).toBeNull();
      expect(apiPayload.provider_intake_unavailable).toEqual({
        reason: 'raw_provider_intake_read_failed',
        updated_at: null
      });
      expect(apiPayload.selected?.issue_identifier).not.toBe('CO-424');
      expect(apiPayload.running_ids).not.toContain('CO-424');
      expect(uiPayload.provider_intake).toBeNull();
      expect(uiPayload.provider_intake_unavailable).toEqual({
        reason: 'raw_provider_intake_read_failed',
        updated_at: null
      });
      expect(uiPayload.selected_issue_identifier).not.toBe('CO-424');
      expect(uiPayload.running.map((entry) => entry.issue_identifier)).not.toContain('CO-424');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('persists polling snapshots without serializing unpersisted claim mutations', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: {
          schema_version: 1,
          updated_at: '2026-03-09T00:00:30.000Z',
          rehydrated_at: null,
          latest_provider_key: null,
          latest_reason: null,
          polling: null,
          claims: []
        }
      });
      const context = assembly.requestContextShared;
      const providerIntakeState = context.providerIntakeState;
      expect(providerIntakeState).toBeDefined();
      if (!providerIntakeState) {
        throw new Error('Expected provider intake state to be available');
      }

      await context.persist.providerIntake?.();

      providerIntakeState.latest_provider_key = 'linear:ISSUE-1';
      providerIntakeState.latest_reason = 'provider_issue_start_launched';
      providerIntakeState.claims.push({
        provider: 'linear',
        provider_key: 'linear:ISSUE-1',
        issue_id: 'ISSUE-1',
        issue_identifier: 'PRE-1',
        issue_title: 'Unpersisted issue',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-09T00:01:00.000Z',
        task_id: 'linear-issue-1',
        mapping_source: 'provider_id_fallback',
        state: 'starting',
        reason: 'provider_issue_start_launched',
        accepted_at: '2026-03-09T00:01:00.000Z',
        updated_at: '2026-03-09T00:01:00.000Z',
        last_delivery_id: 'delivery-1',
        last_event: 'issue',
        last_action: 'update',
        last_webhook_timestamp: 1_700_000_000_000,
        run_id: null,
        run_manifest_path: null
      });

      await context.persist.providerIntakePolling?.({
        enabled: true,
        checking: true,
        stuck: true,
        restart_required: true,
        reason: 'provider_refresh_lifecycle_stuck'
      });

      const providerIntakeSnapshot = JSON.parse(
        await readFile(join(paths.runDir, PROVIDER_INTAKE_STATE_FILE), 'utf8')
      ) as ProviderIntakeState;
      expect(providerIntakeSnapshot.claims).toHaveLength(0);
      expect(providerIntakeSnapshot.latest_provider_key).toBeNull();
      expect(providerIntakeSnapshot.latest_reason).toBeNull();
      expect(providerIntakeSnapshot.polling).toMatchObject({
        enabled: true,
        checking: true,
        stuck: true,
        restart_required: true,
        reason: 'provider_refresh_lifecycle_stuck'
      });
      expect(providerIntakeSnapshot.updated_at).not.toBe('2026-03-09T00:00:30.000Z');
      expect(providerIntakeState.claims).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('timestamps polling-only persistence when no provider intake snapshot exists yet', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T00:02:00.000Z'));
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: null
      });

      await assembly.requestContextShared.persist.providerIntakePolling?.({
        enabled: true,
        checking: true
      });

      const providerIntakeSnapshot = JSON.parse(
        await readFile(join(paths.runDir, PROVIDER_INTAKE_STATE_FILE), 'utf8')
      ) as ProviderIntakeState;
      expect(providerIntakeSnapshot.updated_at).toBe('2026-03-09T00:02:00.000Z');
      expect(providerIntakeSnapshot.polling).toMatchObject({
        enabled: true,
        checking: true
      });
      expect(providerIntakeSnapshot.authority).toEqual({
        status: 'unavailable',
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(providerIntakeSnapshot.claims).toEqual([]);

      const context = assembly.requestContextShared;
      const presenterContext = {
        controlStore: context.controlStore,
        paths: context.paths,
        readCompatibilityProjection: () => context.runtime.snapshot().readCompatibilityProjection()
      };
      const apiPayload = await readCompatibilityState(presenterContext);
      const uiPayload = await readUiDataset(presenterContext);
      expect(apiPayload.provider_intake).toBeNull();
      expect(apiPayload.provider_intake_unavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(apiPayload.polling).toMatchObject({
        enabled: true,
        checking: true
      });
      expect(uiPayload.provider_intake).toBeNull();
      expect(uiPayload.provider_intake_unavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(uiPayload.polling).toMatchObject({
        enabled: true,
        checking: true
      });
    } finally {
      vi.useRealTimers();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('invalidates committed machine-status snapshots after polling-only persistence', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: null
      });

      const initialDataset =
        assembly.requestContextShared.runtime.snapshot().readCommittedMachineStatusDataset();
      expect(initialDataset.polling).toBeNull();

      await assembly.requestContextShared.persist.providerIntakePolling?.(
        {
          enabled: true,
          checking: true,
          updated_at: '2026-03-09T00:02:00.000Z',
          stuck: true,
          restart_required: true,
          reason: 'provider_refresh_lifecycle_stuck'
        },
        '2026-03-09T00:02:00.000Z'
      );

      const refreshedDataset =
        assembly.requestContextShared.runtime.snapshot().readCommittedMachineStatusDataset();
      expect(refreshedDataset).not.toBe(initialDataset);
      expect(initialDataset.polling).toBeNull();
      expect(refreshedDataset.polling).toMatchObject({
        enabled: true,
        checking: true,
        updated_at: '2026-03-09T00:02:00.000Z',
        stuck: true,
        restart_required: true,
        reason: 'provider_refresh_lifecycle_stuck'
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('keeps the newest top-level provider intake timestamp when polling persistence arrives late', async () => {
    const { root, env, paths } = await createRunRoot('task-1084');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const assembly = createControlServerSeededRuntimeAssembly({
        runId: 'run-1',
        token: 'control-token',
        config,
        paths,
        sessionTtlMs: 60_000,
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: {
          schema_version: 1,
          updated_at: '2026-03-09T00:05:00.000Z',
          rehydrated_at: null,
          latest_provider_key: null,
          latest_reason: null,
          polling: null,
          claims: []
        }
      });

      await assembly.requestContextShared.persist.providerIntake?.();
      await assembly.requestContextShared.persist.providerIntakePolling?.({
        enabled: true,
        checking: true,
        updated_at: '2026-03-09T00:02:00.000Z'
      }, '2026-03-09T00:05:00.000Z');

      const providerIntakeSnapshot = JSON.parse(
        await readFile(join(paths.runDir, PROVIDER_INTAKE_STATE_FILE), 'utf8')
      ) as ProviderIntakeState;
      expect(providerIntakeSnapshot.updated_at).toBe('2026-03-09T00:05:00.000Z');
      expect(providerIntakeSnapshot.polling).toMatchObject({
        enabled: true,
        checking: true,
        updated_at: '2026-03-09T00:02:00.000Z'
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
