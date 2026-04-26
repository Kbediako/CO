import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { assertProviderLinearWorkerStartAllowed } from '../orchestrator/src/cli/startCliRequestShell.js';
import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV
} from '../scripts/lib/provider-run-contract.js';

const cleanupRoots: string[] = [];
const ISSUE_ID = '0b2377a2-366f-4309-a508-610e524c9d94';
const ISSUE_IDENTIFIER = 'CO-393';
const CONTROL_HOST_TASK_ID = 'local-mcp';
const CONTROL_HOST_RUN_ID = 'control-host';
const LAUNCH_TOKEN = 'launch-token';

afterEach(async () => {
  await Promise.all(cleanupRoots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })
  ));
});

describe('provider-linear-worker direct-start guard', () => {
  it('rejects provider-linear-worker starts without control-host provenance and points to recovery', () => {
    expectGuard({ env: {} }).toThrow(/control-host recover --issue-id/u);
  });

  it('allows provider-linear-worker starts with matching control-host intake reservation', async () => {
    const runsRoot = await createRunsRoot(providerIntakeState());

    expectGuard({ env: createGuardEnv(runsRoot) }).not.toThrow();
  });

  const copiedProvenanceCases = [
    ['a different requested issue', { issueId: 'different-linear-issue' }, /reservation for requested issue is missing/u],
    ['a different requested identifier', { issueIdentifier: 'CO-999' }, /issue identifier mismatch/u],
    ['a mismatched launch token', { env: { [PROVIDER_LAUNCH_TOKEN_ENV]: 'copied-wrong-token' } }, /launch provenance mismatch/u],
    ['a different control-host task or run', { env: { [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: 'other-control-host' } }, /provider-intake state could not be read/u]
  ] as const;

  for (const [name, input, message] of copiedProvenanceCases) {
    it(`rejects copied provenance for ${name}`, async () => {
      const runsRoot = await createRunsRoot(providerIntakeState());

      expectGuard({
        issueId: input.issueId,
        issueIdentifier: input.issueIdentifier,
        env: createGuardEnv(runsRoot, input.env)
      }).toThrow(message);
    });
  }

  it('rejects missing or malformed control-host intake state', async () => {
    const missingRoot = await createRunsRoot();
    expectGuard({ env: createGuardEnv(missingRoot) }).toThrow(
      /provider-intake state could not be read/u
    );

    const malformedRoot = await createRunsRoot('{not-json');
    expectGuard({ env: createGuardEnv(malformedRoot) }).toThrow(
      /provider-intake state could not be read/u
    );
  });
});

function expectGuard(input: {
  issueId?: string;
  issueIdentifier?: string;
  env: Record<string, string | undefined>;
}) {
  return expect(() =>
    assertProviderLinearWorkerStartAllowed({
      pipelineId: 'provider-linear-worker',
      issueId: input.issueId ?? ISSUE_ID,
      issueIdentifier: input.issueIdentifier ?? ISSUE_IDENTIFIER,
      env: input.env
    })
  );
}

async function createRunsRoot(state?: unknown): Promise<string> {
  const runsRoot = await mkdtemp(join(tmpdir(), 'provider-start-guard-'));
  cleanupRoots.push(runsRoot);
  const stateDir = join(runsRoot, CONTROL_HOST_TASK_ID, 'cli', CONTROL_HOST_RUN_ID);
  await mkdir(stateDir, { recursive: true });
  if (state !== undefined) {
    await writeFile(
      join(stateDir, 'provider-intake-state.json'),
      typeof state === 'string' ? state : JSON.stringify(state),
      'utf8'
    );
  }
  return runsRoot;
}

function providerIntakeState(overrides: Record<string, unknown> = {}): unknown {
  return {
    schema_version: 1,
    updated_at: '2026-04-26T18:00:00.000Z',
    claims: [
      {
        provider: 'linear', provider_key: `linear:${ISSUE_ID}`, issue_id: ISSUE_ID,
        issue_identifier: ISSUE_IDENTIFIER, issue_title: 'Control host provider recovery',
        task_id: `linear-${ISSUE_ID}`, state: 'starting', launch_source: 'control-host',
        launch_token: LAUNCH_TOKEN,
        ...overrides
      }
    ]
  };
}

function createGuardEnv(
  runsRoot: string,
  overrides: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
  return {
    CODEX_ORCHESTRATOR_RUNS_DIR: runsRoot, [PROVIDER_LAUNCH_SOURCE_ENV]: PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
    [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: CONTROL_HOST_TASK_ID, [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: CONTROL_HOST_RUN_ID,
    [PROVIDER_LAUNCH_TOKEN_ENV]: LAUNCH_TOKEN,
    ...overrides
  };
}
