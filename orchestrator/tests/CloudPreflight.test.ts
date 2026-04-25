import { afterEach, describe, expect, it, vi } from 'vitest';

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn()
}));

vi.mock('node:child_process', () => ({
  spawn: spawnMock
}));

import { buildCloudPreflightRequest, runCloudPreflight } from '../src/cli/utils/cloudPreflight.js';

afterEach(() => {
  spawnMock.mockReset();
});

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
});

describe('runCloudPreflight', () => {
  it('reports codex unavailable when spawning the Codex version check throws ETXTBSY synchronously', async () => {
    const spawnError = new Error('text file busy') as NodeJS.ErrnoException;
    spawnError.code = 'ETXTBSY';
    spawnMock.mockImplementationOnce(() => {
      throw spawnError;
    });

    const result = await runCloudPreflight({
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
  });
});
