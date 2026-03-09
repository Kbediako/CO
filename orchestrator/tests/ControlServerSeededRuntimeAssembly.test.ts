import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { computeEffectiveDelegationConfig } from '../src/cli/config/delegationConfig.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';
import { createControlServerSeededRuntimeAssembly } from '../src/cli/control/controlServerSeededRuntimeAssembly.js';
import type { LinearAdvisoryState } from '../src/cli/control/linearWebhookController.js';

async function createRunRoot(taskId: string) {
  const root = await mkdtemp(join(tmpdir(), 'control-server-seeded-runtime-'));
  const env = { repoRoot: root, runsRoot: join(root, '.runs'), outRoot: join(root, 'out'), taskId };
  const paths = resolveRunPaths(env, 'run-1');
  await mkdir(paths.runDir, { recursive: true });
  return { root, env, paths };
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
        linearAdvisorySeed: null
      });

      expect(assembly.controlStore.snapshot().feature_toggles).toEqual({
        dispatch_pilot: { enabled: true },
        rlm: { policy: config.rlm.policy }
      });
      expect(assembly.requestContextShared.token).toBe('control-token');
      expect(assembly.requestContextShared.config).toBe(config);
      expect(assembly.requestContextShared.controlStore).toBe(assembly.controlStore);
      expect(assembly.requestContextShared.confirmationStore).toBe(assembly.confirmationStore);
      expect(assembly.requestContextShared.questionQueue).toBe(assembly.questionQueue);
      expect(assembly.requestContextShared.delegationTokens).toBe(assembly.delegationTokens);
      expect(assembly.requestContextShared.sessionTokens).toBe(assembly.sessionTokens);
      expect(assembly.requestContextShared.persist).toBe(assembly.persist);
      expect(assembly.requestContextShared.clients).toBe(assembly.clients);
      expect(assembly.requestContextShared.eventTransport).toBe(assembly.eventTransport);
      expect(assembly.requestContextShared.paths).toBe(paths);
      expect(assembly.requestContextShared.linearAdvisoryState).toBe(assembly.linearAdvisoryState);
      expect(assembly.requestContextShared.runtime).toBe(assembly.controlRuntime);
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
        linearAdvisorySeed: null
      });

      expect(assembly.controlStore.snapshot().feature_toggles).toEqual({
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
        linearAdvisorySeed: seededAdvisory
      });

      assembly.controlStore.updateAction({
        action: 'pause',
        requestedBy: 'tester',
        reason: 'manual_check'
      });
      assembly.controlStore.updateFeatureToggles({
        dispatch_pilot: { enabled: true }
      });
      const confirmation = assembly.confirmationStore.create({
        action: 'cancel',
        tool: 'ui.cancel',
        params: { run: 'run-1' }
      }).confirmation;
      assembly.confirmationStore.approve(confirmation.request_id, 'tester');
      assembly.questionQueue.enqueue({
        parentRunId: 'run-1',
        fromRunId: 'child-run',
        prompt: 'Need approval',
        urgency: 'high',
        autoPause: true
      });
      const delegation = assembly.delegationTokens.register('token-1', 'run-1', 'child-run');
      assembly.linearAdvisoryState.latest_delivery_id = 'delivery-1';
      assembly.linearAdvisoryState.latest_result = 'accepted';
      assembly.linearAdvisoryState.latest_reason = 'linear_delivery_accepted';
      assembly.linearAdvisoryState.latest_accepted_at = '2026-03-09T00:01:00.000Z';
      assembly.linearAdvisoryState.updated_at = '2026-03-09T00:01:00.000Z';
      assembly.linearAdvisoryState.seen_deliveries.push({
        delivery_id: 'delivery-1',
        event: 'issue',
        action: 'update',
        issue_id: 'ISSUE-1',
        webhook_timestamp: 1_700_000_000_000,
        processed_at: '2026-03-09T00:01:00.000Z',
        outcome: 'accepted',
        reason: 'linear_delivery_accepted'
      });

      await assembly.persist.control();
      await assembly.persist.confirmations();
      await assembly.persist.questions();
      await assembly.persist.delegationTokens();
      await assembly.persist.linearAdvisory();

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

      const advisorySnapshot = JSON.parse(await readFile(join(paths.runDir, 'linear-advisory-state.json'), 'utf8')) as LinearAdvisoryState;
      expect(advisorySnapshot.latest_delivery_id).toBe('delivery-1');
      expect(advisorySnapshot.latest_result).toBe('accepted');
      expect(advisorySnapshot.latest_reason).toBe('linear_delivery_accepted');
      expect(advisorySnapshot.seen_deliveries).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
