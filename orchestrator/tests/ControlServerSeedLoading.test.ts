import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import { logger } from '../src/logger.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';
import { readControlServerSeeds } from '../src/cli/control/controlServerSeedLoading.js';
import {
  LINEAR_ADVISORY_STATE_FILE,
  PROVIDER_INTAKE_STATE_FILE
} from '../src/cli/control/controlPersistenceFiles.js';
import type { ControlState } from '../src/cli/control/controlState.js';
import type { ConfirmationStoreSnapshot } from '../src/cli/control/confirmations.js';
import type { QuestionRecord } from '../src/cli/control/questions.js';
import type { DelegationTokenRecord } from '../src/cli/control/delegationTokens.js';
import type { LinearAdvisoryState } from '../src/cli/control/linearWebhookController.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';

async function createRunRoot(taskId: string) {
  const root = await mkdtemp(join(tmpdir(), 'control-server-seed-loading-'));
  const env = { repoRoot: root, runsRoot: join(root, '.runs'), outRoot: join(root, 'out'), taskId };
  const paths = resolveRunPaths(env, 'run-1');
  await mkdir(paths.runDir, { recursive: true });
  return { root, paths };
}

describe('readControlServerSeeds', () => {
  it('returns null for all six seeds when the files are missing', async () => {
    const { root, paths } = await createRunRoot('task-1086');

    try {
      await expect(readControlServerSeeds(paths)).resolves.toEqual({
        controlSeed: null,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed: null,
        providerIntakeSeed: null
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('loads all six seeds with their stored payload shapes preserved', async () => {
    const { root, paths } = await createRunRoot('task-1086');
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
          requested_at: '2026-03-09T11:00:00.000Z',
          expires_at: '2026-03-09T11:05:00.000Z',
          approved_by: 'operator',
          approved_at: '2026-03-09T11:01:00.000Z'
        }
      ],
      issued: [
        {
          request_id: 'req-1',
          nonce_id: 'nonce-1',
          issued_at: '2026-03-09T11:01:00.000Z',
          expires_at: '2026-03-09T11:05:00.000Z'
        }
      ],
      consumed_nonce_ids: ['nonce-0']
    };
    const questions: QuestionRecord[] = [
      {
        question_id: 'q-0001',
        parent_run_id: 'run-1',
        from_run_id: 'child-run',
        from_manifest_path: null,
        prompt: 'Need approval',
        urgency: 'high',
        status: 'queued',
        queued_at: '2026-03-09T11:02:00.000Z',
        expires_at: '2026-03-09T11:10:00.000Z',
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
        created_at: '2026-03-09T11:03:00.000Z',
        expires_at: null
      }
    ];
    const linearAdvisorySeed: LinearAdvisoryState = {
      schema_version: 1,
      updated_at: '2026-03-09T11:04:00.000Z',
      latest_delivery_id: 'delivery-1',
      latest_result: 'accepted',
      latest_reason: 'linear_delivery_accepted',
      latest_event: {
        delivery_id: 'delivery-1',
        event: 'issue',
        action: 'update',
        issue_id: 'ISSUE-1',
        webhook_timestamp: 1_700_000_000_000,
        processed_at: '2026-03-09T11:04:00.000Z'
      },
      latest_accepted_at: '2026-03-09T11:04:00.000Z',
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
          processed_at: '2026-03-09T11:04:00.000Z',
          outcome: 'accepted',
          reason: 'linear_delivery_accepted'
        }
      ]
    };
    const providerIntakeSeed: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-09T11:04:30.000Z',
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
          issue_updated_at: '2026-03-09T11:04:00.000Z',
          task_id: 'linear-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-09T11:04:30.000Z',
          updated_at: '2026-03-09T11:04:30.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'issue',
          last_action: 'update',
          last_webhook_timestamp: 1_700_000_000_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: null,
          launch_token: null
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

      await expect(readControlServerSeeds(paths)).resolves.toEqual({
        controlSeed,
        confirmationsSeed,
        questionsSeed: { questions },
        delegationSeed: { tokens },
        linearAdvisorySeed,
        providerIntakeSeed
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('warns and returns null for malformed JSON without losing other valid seeds', async () => {
    const { root, paths } = await createRunRoot('task-1086');
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const controlSeed: ControlState = {
      run_id: 'run-1',
      control_seq: 2
    };
    const linearAdvisorySeed: LinearAdvisoryState = {
      schema_version: 1,
      updated_at: '2026-03-09T11:04:00.000Z',
      latest_delivery_id: null,
      latest_result: null,
      latest_reason: null,
      latest_event: null,
      latest_accepted_at: null,
      tracked_issue: null,
      seen_deliveries: []
    };

    try {
      await writeFile(paths.controlPath, JSON.stringify(controlSeed), 'utf8');
      await writeFile(paths.questionsPath, '{not-json', 'utf8');
      await writeFile(
        join(paths.runDir, LINEAR_ADVISORY_STATE_FILE),
        JSON.stringify(linearAdvisorySeed),
        'utf8'
      );

      await expect(readControlServerSeeds(paths)).resolves.toEqual({
        controlSeed,
        confirmationsSeed: null,
        questionsSeed: null,
        delegationSeed: null,
        linearAdvisorySeed,
        providerIntakeSeed: null
      });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain(`Failed to read JSON file ${paths.questionsPath}:`);
    } finally {
      warn.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });
});
