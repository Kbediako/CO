import { afterEach, describe, expect, it } from 'vitest';
import process from 'node:process';

import { resolveCloudBranch } from '../src/cli/services/orchestratorCloudBranchResolution.js';

const ORIGINAL_CLOUD_BRANCH = process.env.CODEX_CLOUD_BRANCH;

afterEach(() => {
  if (ORIGINAL_CLOUD_BRANCH === undefined) {
    delete process.env.CODEX_CLOUD_BRANCH;
    return;
  }
  process.env.CODEX_CLOUD_BRANCH = ORIGINAL_CLOUD_BRANCH;
});

describe('resolveCloudBranch', () => {
  it('prefers env overrides over process env', () => {
    process.env.CODEX_CLOUD_BRANCH = 'process-branch';

    expect(resolveCloudBranch({ CODEX_CLOUD_BRANCH: ' refs/heads/override-branch ' })).toBe(
      'refs/heads/override-branch'
    );
  });

  it('falls back to process env when the override is blank', () => {
    process.env.CODEX_CLOUD_BRANCH = ' refs/heads/process-branch ';

    expect(resolveCloudBranch({ CODEX_CLOUD_BRANCH: '   ' })).toBe('refs/heads/process-branch');
  });

  it('returns null when no branch is configured', () => {
    delete process.env.CODEX_CLOUD_BRANCH;

    expect(resolveCloudBranch()).toBeNull();
  });
});
