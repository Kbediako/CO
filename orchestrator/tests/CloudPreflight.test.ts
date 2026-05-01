import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildCloudPreflightAuthProvenance,
  buildCloudPreflightRequest,
  runCloudPreflight
} from '../src/cli/utils/cloudPreflight.js';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function createNodeBackedFakeCodex(script: string): Promise<{ dir: string; bin: string; log: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'cloud-preflight-'));
  createdDirs.push(dir);
  // Keep the version probe on a stable executable; the cwd-local script handles `cloud ...`.
  const bin = process.execPath;
  const log = join(dir, 'codex.log');
  await writeFile(join(dir, 'cloud'), script, 'utf8');
  return { dir, bin, log };
}

async function runCloudPreflightWithCloudList(options: {
  environmentId: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  logCommands?: boolean;
}): Promise<{ result: Awaited<ReturnType<typeof runCloudPreflight>>; log: string }> {
  const { dir, bin, log } = await createNodeBackedFakeCodex(
    [
      "const { appendFileSync } = require('node:fs');",
      'const args = process.argv.slice(2);',
      'if (process.env.CODEX_TEST_LOG) {',
      "  appendFileSync(process.env.CODEX_TEST_LOG, ['cloud', ...args].join(' ') + '\\n');",
      '}',
      "if (args[0] === 'list') {",
      '  if (process.env.CODEX_TEST_CLOUD_LIST_STDERR) {',
      "    process.stderr.write(process.env.CODEX_TEST_CLOUD_LIST_STDERR + '\\n');",
      '  }',
      '  if (process.env.CODEX_TEST_CLOUD_LIST_STDOUT) {',
      "    process.stdout.write(process.env.CODEX_TEST_CLOUD_LIST_STDOUT + '\\n');",
      '  }',
      "  process.exit(Number(process.env.CODEX_TEST_CLOUD_LIST_EXIT_CODE ?? '0'));",
      '}',
      "if (args[0] === 'exec') {",
      "  process.stderr.write('cloud exec should not run during preflight\\n');",
      '  process.exit(2);',
      '}',
      'process.exit(1);'
    ].join('\n')
  );
  const result = await runCloudPreflight({
    repoRoot: dir,
    codexBin: bin,
    environmentId: options.environmentId,
    branch: null,
    env: {
      CODEX_TEST_CLOUD_LIST_STDOUT: options.stdout ?? JSON.stringify({ tasks: [] }),
      CODEX_TEST_CLOUD_LIST_STDERR: options.stderr ?? '',
      CODEX_TEST_CLOUD_LIST_EXIT_CODE: String(options.exitCode ?? 0),
      ...(options.logCommands ? { CODEX_TEST_LOG: log } : {})
    }
  });
  return { result, log };
}

describe('buildCloudPreflightRequest', () => {
  it('prefers the explicit branch override over env branch', () => {
    const request = buildCloudPreflightRequest({
      repoRoot: '/tmp/repo',
      environmentId: 'env-123',
      branch: ' refs/heads/override-branch ',
      env: {
        CODEX_CLI_BIN: '/tmp/fake-codex',
        CODEX_CLOUD_BRANCH: 'refs/heads/env-branch'
      }
    });

    expect(request).toMatchObject({
      repoRoot: '/tmp/repo',
      codexBin: '/tmp/fake-codex',
      environmentId: 'env-123',
      branch: 'refs/heads/override-branch'
    });
  });

  it('falls back to env branch when the explicit branch override is blank', () => {
    const request = buildCloudPreflightRequest({
      repoRoot: '/tmp/repo',
      environmentId: 'env-123',
      branch: '   ',
      env: {
        CODEX_CLI_BIN: '/tmp/fake-codex',
        CODEX_CLOUD_BRANCH: 'refs/heads/env-branch'
      }
    });

    expect(request.branch).toBe('refs/heads/env-branch');
  });

  it('returns a null branch when both explicit and env branches are blank', () => {
    const request = buildCloudPreflightRequest({
      repoRoot: '/tmp/repo',
      environmentId: 'env-123',
      branch: '',
      env: {
        CODEX_CLI_BIN: '/tmp/fake-codex',
        CODEX_CLOUD_BRANCH: '   '
      }
    });

    expect(request.branch).toBeNull();
  });

  it('resolves the codex bin from the passed env without changing the raw branch contract', () => {
    const request = buildCloudPreflightRequest({
      repoRoot: '/tmp/repo',
      environmentId: 'env-123',
      env: {
        CODEX_CLI_BIN: '/tmp/fake-codex',
        CODEX_CLOUD_BRANCH: 'refs/heads/env-branch'
      }
    });

    expect(request.codexBin).toBe('/tmp/fake-codex');
    expect(request.branch).toBe('refs/heads/env-branch');
  });

  it('reports Agent Identity as known cloud preflight credential provenance', () => {
    const provenance = buildCloudPreflightAuthProvenance({
      environmentId: 'env-agent',
      branch: 'agent-branch',
      env: {
        CODEX_AGENT_IDENTITY: 'agent-identity-raw-value'
      }
    });

    expect(provenance).toMatchObject({
      providerKind: 'codex_cloud',
      cloudEnvId: 'env-agent',
      cloudBranch: 'agent-branch',
      credentialSource: 'env:CODEX_AGENT_IDENTITY',
      authFreshness: 'env_credential_present'
    });
    expect(JSON.stringify(provenance)).not.toContain('agent-identity-raw-value');
  });

  it('probes configured cloud env visibility before cloud exec', async () => {
    const { result, log } = await runCloudPreflightWithCloudList({
      environmentId: 'env-visible',
      stdout: JSON.stringify({ tasks: [{ id: 'task-test', environment_id: 'env-visible' }] }),
      logCommands: true
    });

    expect(result.ok).toBe(true);
    const commandLog = await readFile(log, 'utf8');
    expect(commandLog).toContain('cloud list --env env-visible --limit 1 --json');
    expect(commandLog).not.toContain('cloud exec');
  });

  it('accepts successful cloud list payload shapes that match the requested environment', async () => {
    for (const [environmentId, stdout] of [
      ['env-nested', JSON.stringify({ tasks: [{ id: 'task-test', environment: { id: 'env-nested' } }] })],
      ['Kbediako/CO', JSON.stringify({ tasks: [{ id: 'task-test', environment_id: null, environment_label: 'Kbediako/CO' }] })],
      ['kbediako/co', JSON.stringify({ tasks: [{ id: 'task-test', environment_id: null, environment_label: 'Kbediako/CO' }] })],
      ['Kbediako/CO', JSON.stringify({ tasks: [{ id: 'task-test', environment_id: 'env-canonical', environment_label: 'Kbediako/CO' }] })],
      ['env-empty', JSON.stringify({ tasks: [] })],
      [
        'env-visible',
        JSON.stringify({
          tasks: [{ id: 'task-test', environment_id: 'env-visible', title: 'environment not found incident notes' }]
        })
      ]
    ] as const) {
      const { result } = await runCloudPreflightWithCloudList({ environmentId, stdout });
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
    }
  });

  it('rejects successful cloud list payloads that cannot prove the requested environment', async () => {
    for (const [stdout, expectedMessage] of [
      ['[]', 'unexpected codex cloud list JSON payload'],
      [JSON.stringify({ tasks: [{ id: 'task-test', environment_id: 'env-other' }] }), 'different environment identity: env-other'],
      [JSON.stringify({ tasks: [{ id: 'task-test' }] }), 'task rows without an environment identity'],
      [
        JSON.stringify({ tasks: [{ id: 'task-test', environment_id: null, environment_label: 'env-other' }] }),
        'different environment identity: env-other'
      ]
    ] as const) {
      const { result } = await runCloudPreflightWithCloudList({ environmentId: 'env-requested', stdout });
      expect(result.ok).toBe(false);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'environment_unavailable',
            message: expect.stringContaining(expectedMessage)
          })
        ])
      );
    }
  });

  it('classifies not-found cloud env probes separately from missing_environment', async () => {
    const longWarning = 'x'.repeat(520);
    for (const { environmentId, stderr, exitCode, expectedMessage } of [
      {
        environmentId: 'env-missing',
        stderr: "Error: environment 'env-missing' not found; run codex cloud to list available environments",
        exitCode: 1,
        expectedMessage: "environment 'env-missing' not found"
      },
      {
        environmentId: 'env-missing-zero',
        stderr: "Error: environment 'env-missing-zero' not found; run codex cloud to list available environments",
        expectedMessage: "environment 'env-missing-zero' not found"
      },
      {
        environmentId: 'env-credential-token',
        stderr: "Error: environment 'env-credential-token' not found; run codex cloud to list available environments",
        exitCode: 1,
        expectedMessage: "environment 'env-credential-token' not found"
      },
      {
        environmentId: 'env-long-warning',
        stderr: `${longWarning}\nError: environment 'env-long-warning' not found; run codex cloud to list available environments`,
        exitCode: 1,
        expectedMessage: longWarning.slice(0, 120)
      }
    ]) {
      const { result } = await runCloudPreflightWithCloudList({ environmentId, stderr, exitCode });
      expect(result.ok).toBe(false);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'environment_not_found',
            message: expect.stringContaining(expectedMessage)
          })
        ])
      );
      expect(result.issues.map((issue) => issue.code)).not.toContain('missing_environment');
    }
  });

  it('classifies configured cloud env probe failures as unavailable when they are not not-found shaped', async () => {
    for (const { environmentId, stderr, expectedMessage } of [
      {
        environmentId: 'env-forbidden',
        stderr: 'Error: environment env-other not found; forbidden for active account',
        expectedMessage: 'forbidden for active account'
      },
      {
        environmentId: 'env-prod',
        stderr: 'Error: environment env-prod-old not found',
        expectedMessage: 'env-prod-old not found'
      }
    ] as const) {
      const { result } = await runCloudPreflightWithCloudList({
        environmentId,
        stderr,
        exitCode: 1
      });

      expect(result.ok).toBe(false);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'environment_unavailable',
            message: expect.stringContaining(expectedMessage)
          })
        ])
      );
      expect(result.issues.map((issue) => issue.code)).not.toContain('missing_environment');
      expect(result.issues.map((issue) => issue.code)).not.toContain('environment_not_found');
    }
  });

  it('classifies requested-env not-found probe failures as unavailable when wrapped auth signals are present', async () => {
    const { result } = await runCloudPreflightWithCloudList({
      environmentId: 'env-forbidden',
      stderr: 'Error: environment env-forbidden not found; forbidden for active account',
      exitCode: 1
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'environment_unavailable',
          message: expect.stringContaining('forbidden for active account')
        })
      ])
    );
    expect(result.issues.map((issue) => issue.code)).not.toContain('environment_not_found');
  });

  it('redacts sensitive cloud probe output before embedding issue messages', async () => {
    const { result } = await runCloudPreflightWithCloudList({
      environmentId: 'env-forbidden',
      stderr:
        'Error: environment env-forbidden not found; forbidden for active account user@example.com OPENAI_API_KEY=sk-testsecret1234567890 Authorization: Bearer sess-secret1234567890 CODEX_AGENT_IDENTITY=agent-identity-secret CODEX_AGENT_IDENTITY={"id":"agent-identity-deep-id","account":{"owner":{"id":"agent-identity-deep-owner"}}} agent_identity: { "id": "agent-identity-pretty-id", "account": { "owner": { "id": "agent-identity-pretty-owner" } } } CODEX_AGENT_IDENTITY="agent identity spaced secret" CODEX_AGENT_IDENTITY="{\\"id\\":\\"agent-identity-escaped-env-id\\",\\"subject\\":\\"agent-identity-escaped-env-subject\\"}" CODEX_AGENT_IDENTITY={"id":"agent-identity-object-id","subject":"agent-identity-object-subject"} {"CODEX_AGENT_IDENTITY":"agent-identity-json-secret"} {"CODEX_AGENT_IDENTITY":"{\\"id\\":\\"agent-identity-escaped-json-id\\",\\"subject\\":\\"agent-identity-escaped-json-subject\\"}"} {"CODEX_AGENT_IDENTITY":{"id":"agent-identity-json-object-id","subject":"agent-identity-json-object-subject"}} agent_identity: agent-identity-colon-secret agent_identity: \'agent identity colon spaced secret\' agent_identity: {"id":"agent-identity-colon-object-id","subject":"agent-identity-colon-object-subject"} Bearer standalonesecret1234567890',
      exitCode: 1
    });

    expect(result.ok).toBe(false);
    const message = result.issues.map((issue) => issue.message).join('\n');
    expect(message).toContain('forbidden for active account');
    expect(message).toContain('<redacted-email>');
    expect(message).toContain('OPENAI_API_KEY=<redacted>');
    expect(message).toContain('CODEX_AGENT_IDENTITY=<redacted>');
    expect(message).toContain('"CODEX_AGENT_IDENTITY":"<redacted>"');
    expect(message).toContain('agent_identity=<redacted>');
    expect(message).toContain('authorization: Bearer <redacted>');
    expect(message).not.toContain('user@example.com');
    expect(message).not.toContain('sk-testsecret1234567890');
    expect(message).not.toContain('agent-identity-secret');
    expect(message).not.toContain('agent-identity-deep-id');
    expect(message).not.toContain('agent-identity-deep-owner');
    expect(message).not.toContain('agent-identity-pretty-id');
    expect(message).not.toContain('agent-identity-pretty-owner');
    expect(message).not.toContain('agent identity spaced secret');
    expect(message).not.toContain('agent-identity-escaped-env-id');
    expect(message).not.toContain('agent-identity-escaped-env-subject');
    expect(message).not.toContain('agent-identity-object-id');
    expect(message).not.toContain('agent-identity-object-subject');
    expect(message).not.toContain('agent-identity-json-secret');
    expect(message).not.toContain('agent-identity-escaped-json-id');
    expect(message).not.toContain('agent-identity-escaped-json-subject');
    expect(message).not.toContain('agent-identity-json-object-id');
    expect(message).not.toContain('agent-identity-json-object-subject');
    expect(message).not.toContain('agent-identity-colon-secret');
    expect(message).not.toContain('agent identity colon spaced secret');
    expect(message).not.toContain('agent-identity-colon-object-id');
    expect(message).not.toContain('agent-identity-colon-object-subject');
    expect(message).not.toContain('sess-secret1234567890');
    expect(message).not.toContain('standalonesecret1234567890');
  });

  it('reports codex unavailable when spawning the Codex version check throws ETXTBSY synchronously', async () => {
    const spawnError = new Error('text file busy') as NodeJS.ErrnoException;
    spawnError.code = 'ETXTBSY';
    const spawnMock = vi.fn(() => {
      throw spawnError;
    });

    vi.resetModules();
    vi.doMock('node:child_process', () => ({
      spawn: spawnMock
    }));

    try {
      const { runCloudPreflight: runCloudPreflightWithMockedSpawn } = await import(
        '../src/cli/utils/cloudPreflight.js'
      );

      const result = await runCloudPreflightWithMockedSpawn({
        repoRoot: '/tmp/repo',
        codexBin: '/tmp/busy-codex',
        environmentId: 'env-123',
        branch: null,
        env: {}
      });

      expect(result).toMatchObject({
        ok: false,
        issues: [
          {
            code: 'codex_unavailable',
            message: 'Codex CLI is unavailable (/tmp/busy-codex --version failed).'
          }
        ],
        details: {
          codexBin: '/tmp/busy-codex',
          environmentId: 'env-123',
          branch: null
        }
      });
      expect(spawnMock).toHaveBeenCalledWith('/tmp/busy-codex', ['--version'], {
        cwd: '/tmp/repo',
        env: {},
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } finally {
      vi.doUnmock('node:child_process');
      vi.resetModules();
    }
  });
});
