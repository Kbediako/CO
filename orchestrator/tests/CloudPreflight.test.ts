import { describe, expect, it } from 'vitest';

import { buildCloudPreflightRequest } from '../src/cli/utils/cloudPreflight.js';

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
