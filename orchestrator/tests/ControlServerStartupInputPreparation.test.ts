import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { computeEffectiveDelegationConfig } from '../src/cli/config/delegationConfig.js';
import {
  LINEAR_ADVISORY_STATE_FILE,
  PROVIDER_INTAKE_STATE_FILE
} from '../src/cli/control/controlPersistenceFiles.js';
import { prepareControlServerStartupInputs } from '../src/cli/control/controlServerStartupInputPreparation.js';
import type { ConfirmationStoreSnapshot } from '../src/cli/control/confirmations.js';
import type { ControlState } from '../src/cli/control/controlState.js';
import type { DelegationTokenRecord } from '../src/cli/control/delegationTokens.js';
import type { LinearAdvisoryState } from '../src/cli/control/linearWebhookController.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';
import type { QuestionRecord } from '../src/cli/control/questions.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

async function createRunRoot(taskId: string) {
  const root = await mkdtemp(join(tmpdir(), 'control-server-startup-input-prep-'));
  const env = { repoRoot: root, runsRoot: join(root, '.runs'), outRoot: join(root, 'out'), taskId };
  const paths = resolveRunPaths(env, 'run-1');
  await mkdir(paths.runDir, { recursive: true });
  return { root, env, paths };
}

describe('prepareControlServerStartupInputs', () => {
  it('returns the ready-instance inputs with seeded runtime state preserved', async () => {
    const { root, env, paths } = await createRunRoot('task-1121');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });
    const controlSeed: ControlState = {
      run_id: 'run-1',
      control_seq: 4,
      feature_toggles: {
        dispatch_pilot: { enabled: true }
      }
    };
    const confirmationsSeed: ConfirmationStoreSnapshot = {
      pending: [
        {
          request_id: 'req-1',
          action: 'cancel',
          tool: 'ui.cancel',
          params: { run: 'run-1' },
          action_params_digest: 'digest-1',
          digest_alg: 'sha256',
          requested_at: '2026-03-12T00:00:00.000Z',
          expires_at: '2026-03-12T00:05:00.000Z',
          approved_by: 'operator',
          approved_at: '2026-03-12T00:01:00.000Z'
        }
      ],
      issued: [
        {
          request_id: 'req-1',
          nonce_id: 'nonce-1',
          issued_at: '2026-03-12T00:01:00.000Z',
          expires_at: '2026-03-12T00:05:00.000Z'
        }
      ],
      consumed_nonce_ids: ['nonce-0']
    };
    const questions: QuestionRecord[] = [
      {
        question_id: 'q-0007',
        parent_run_id: 'run-1',
        from_run_id: 'child-run',
        from_manifest_path: null,
        prompt: 'Need approval',
        urgency: 'high',
        status: 'queued',
        queued_at: '2026-03-12T00:02:00.000Z',
        expires_at: '2026-03-12T00:10:00.000Z',
        expires_in_ms: 480000,
        auto_pause: true,
        expiry_fallback: 'pause'
      }
    ];
    const tokens: DelegationTokenRecord[] = [
      {
        token_id: 'dlt-1',
        token_hash: 'token-hash',
        parent_run_id: 'run-1',
        child_run_id: 'child-run',
        created_at: '2026-03-12T00:03:00.000Z',
        expires_at: null
      }
    ];
    const linearAdvisorySeed: LinearAdvisoryState = {
      schema_version: 1,
      updated_at: '2026-03-12T00:04:00.000Z',
      latest_delivery_id: 'delivery-1',
      latest_result: 'accepted',
      latest_reason: 'linear_delivery_accepted',
      latest_event: {
        delivery_id: 'delivery-1',
        event: 'issue',
        action: 'update',
        issue_id: 'ISSUE-1',
        webhook_timestamp: 1_700_000_000_000,
        processed_at: '2026-03-12T00:04:00.000Z'
      },
      latest_accepted_at: '2026-03-12T00:04:00.000Z',
      tracked_issue: {
        id: 'ISSUE-1',
        identifier: 'PRE-1',
        title: 'Seeded issue',
        url: 'https://linear.app/asabeko/issue/PRE-1/seeded-issue',
        team: {
          id: 'team-1',
          key: 'PRE',
          name: 'Preprod'
        },
        project: {
          id: 'project-1',
          name: 'Coordinator'
        }
      },
      seen_deliveries: [
        {
          delivery_id: 'delivery-1',
          event: 'issue',
          action: 'update',
          issue_id: 'ISSUE-1',
          webhook_timestamp: 1_700_000_000_000,
          processed_at: '2026-03-12T00:04:00.000Z',
          outcome: 'accepted',
          reason: 'linear_delivery_accepted'
        }
      ]
    };
    const providerIntakeSeed: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-12T00:04:30.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:ISSUE-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:ISSUE-1',
          issue_id: 'ISSUE-1',
          issue_identifier: 'PRE-1',
          issue_title: 'Seeded issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-12T00:04:00.000Z',
          issue_assignee_id: null,
          issue_assignee_name: null,
          issue_blocked_by: null,
          task_id: 'linear-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-12T00:04:30.000Z',
          updated_at: '2026-03-12T00:04:30.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'issue',
          last_action: 'update',
          last_webhook_timestamp: 1_700_000_000_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: null,
          launch_token: null,
          launch_started_at: null,
          retry_queued: null,
          retry_attempt: null,
          retry_due_at: null,
          retry_error: null
        }
      ]
    };

    try {
      await writeFile(paths.controlPath, JSON.stringify(controlSeed), 'utf8');
      await writeFile(paths.confirmationsPath, JSON.stringify(confirmationsSeed), 'utf8');
      await writeFile(paths.questionsPath, JSON.stringify({ questions }), 'utf8');
      await writeFile(paths.delegationTokensPath, JSON.stringify({ tokens }), 'utf8');
      await writeFile(
        join(paths.runDir, LINEAR_ADVISORY_STATE_FILE),
        JSON.stringify(linearAdvisorySeed),
        'utf8'
      );
      await writeFile(
        join(paths.runDir, PROVIDER_INTAKE_STATE_FILE),
        JSON.stringify(providerIntakeSeed),
        'utf8'
      );

      const prepared = await prepareControlServerStartupInputs({
        paths,
        config,
        runId: 'run-1',
        sessionTtlMs: 60_000
      });
      const context = prepared.requestContextShared;

      expect(Object.keys(prepared).sort()).toEqual(['controlToken', 'host', 'requestContextShared']);
      expect(prepared.host).toBe(config.ui.bindHost);
      expect(prepared.controlToken).toMatch(/^[a-f0-9]{48}$/);
      expect(context.token).toBe(prepared.controlToken);
      expect(context.config).toBe(config);
      expect(context.paths).toBe(paths);
      expect(context.controlStore.snapshot()).toMatchObject({
        run_id: 'run-1',
        control_seq: 4,
        feature_toggles: {
          dispatch_pilot: { enabled: true },
          rlm: { policy: config.rlm.policy }
        }
      });
      expect(context.confirmationStore.snapshot()).toEqual(confirmationsSeed);
      expect(context.questionQueue.list()).toEqual(questions);
      expect(context.delegationTokens.list()).toEqual(tokens);
      expect(context.linearAdvisoryState).toEqual(linearAdvisorySeed);
      expect(context.providerIntakeState).toEqual(providerIntakeSeed);
      expect(context.runtime).toBeDefined();
      expect(context.eventTransport).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns empty startup inputs when no seed files exist', async () => {
    const { root, env, paths } = await createRunRoot('task-1121');
    const config = computeEffectiveDelegationConfig({ repoRoot: env.repoRoot, layers: [] });

    try {
      const prepared = await prepareControlServerStartupInputs({
        paths,
        config,
        runId: 'run-1',
        sessionTtlMs: 60_000
      });
      const context = prepared.requestContextShared;

      expect(prepared.host).toBe(config.ui.bindHost);
      expect(prepared.controlToken).toMatch(/^[a-f0-9]{48}$/);
      expect(context.token).toBe(prepared.controlToken);
      expect(context.controlStore.snapshot()).toMatchObject({
        run_id: 'run-1',
        control_seq: 0,
        feature_toggles: {
          rlm: { policy: config.rlm.policy }
        }
      });
      expect(context.confirmationStore.snapshot()).toEqual({
        pending: [],
        issued: [],
        consumed_nonce_ids: []
      });
      expect(context.questionQueue.list()).toEqual([]);
      expect(context.delegationTokens.list()).toEqual([]);
      expect(context.linearAdvisoryState).toEqual({
        schema_version: 1,
        updated_at: new Date(0).toISOString(),
        latest_delivery_id: null,
        latest_result: null,
        latest_reason: null,
        latest_event: null,
        latest_accepted_at: null,
        tracked_issue: null,
        seen_deliveries: []
      });
      expect(context.providerIntakeState).toEqual({
        schema_version: 1,
        updated_at: new Date(0).toISOString(),
        rehydrated_at: null,
        latest_provider_key: null,
        latest_reason: null,
        claims: []
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
