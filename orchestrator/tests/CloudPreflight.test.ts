import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildCloudPreflightRequest, runCloudPreflight } from '../src/cli/utils/cloudPreflight.js';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function createFakeCodex(script: string): Promise<{ dir: string; bin: string; log: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'cloud-preflight-'));
  createdDirs.push(dir);
  const bin = join(dir, 'codex');
  const log = join(dir, 'codex.log');
  await writeFile(bin, script, 'utf8');
  await chmod(bin, 0o755);
  return { dir, bin, log };
}

async function runCloudPreflightWithCloudList(options: {
  environmentId: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  logCommands?: boolean;
}): Promise<{ result: Awaited<ReturnType<typeof runCloudPreflight>>; log: string }> {
  const { dir, bin, log } = await createFakeCodex(
    [
      '#!/bin/sh',
      'if [ -n "$CODEX_TEST_LOG" ]; then',
      '  printf "%s\\n" "$*" >> "$CODEX_TEST_LOG"',
      'fi',
      'if [ "$1" = "--version" ]; then',
      '  echo "codex 0.0.0-test"',
      '  exit 0',
      'fi',
      'if [ "$1" = "cloud" ] && [ "$2" = "list" ]; then',
      '  if [ -n "$CODEX_TEST_CLOUD_LIST_STDERR" ]; then',
      '    printf "%s\\n" "$CODEX_TEST_CLOUD_LIST_STDERR" 1>&2',
      '  fi',
      '  if [ -n "$CODEX_TEST_CLOUD_LIST_STDOUT" ]; then',
      '    printf "%s\\n" "$CODEX_TEST_CLOUD_LIST_STDOUT"',
      '  fi',
      '  exit "${CODEX_TEST_CLOUD_LIST_EXIT_CODE:-0}"',
      'fi',
      'if [ "$1" = "cloud" ] && [ "$2" = "exec" ]; then',
      '  echo "cloud exec should not run during preflight" 1>&2',
      '  exit 2',
      'fi',
      'exit 1'
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
    const { result } = await runCloudPreflightWithCloudList({
      environmentId: 'env-forbidden',
      stderr: 'Error: environment env-other not found; forbidden for active account',
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
    expect(result.issues.map((issue) => issue.code)).not.toContain('missing_environment');
  });
});
