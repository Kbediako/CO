import { describe, expect, it } from 'vitest';

import {
  classifyFailure,
  formatCloudCanaryFailureClass
} from '../scripts/cloud-canary-ci.mjs';

describe('cloud-canary-ci failure classification', () => {
  it('classifies CO-207 shaped GitHub connector admission drift distinctly', () => {
    const diagnosis = classifyFailure([
      'CODEX_CLOUD_ENV_ID was present.',
      'task id absent before cloud task creation.',
      'HTTP 400 missing_github_connector_link: GitHub connection not found for user.'
    ].join('\n'));

    expect(diagnosis).toMatchObject({
      category: 'credentials',
      diagnostic_category: 'cloud_connector_auth_drift',
      guidance: expect.stringContaining('Repair or relink the GitHub connector')
    });
    expect(formatCloudCanaryFailureClass(diagnosis)).toBe('credentials (cloud_connector_auth_drift)');
    expect(diagnosis.category).not.toBe('execution');
    expect(diagnosis.category).not.toBe('configuration');
    expect(diagnosis.diagnostic_category).not.toBe('provider_runtime');
  });

  it('keeps missing CODEX_CLOUD_ENV_ID fallback classification unchanged', () => {
    const diagnosis = classifyFailure('cloud-env-missing: Missing CODEX_CLOUD_ENV_ID.');

    expect(diagnosis).toMatchObject({
      category: 'configuration',
      diagnostic_category: 'env_config'
    });
    expect(formatCloudCanaryFailureClass(diagnosis)).toBe('configuration (env_config)');
  });
});
