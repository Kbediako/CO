import { describe, expect, it } from 'vitest';

import { diagnoseCloudFailure } from '../src/cli/adapters/cloudFailureDiagnostics.js';

describe('diagnoseCloudFailure', () => {
  it('classifies credential-like errors', () => {
    const diagnosis = diagnoseCloudFailure({
      status: 'failed',
      error: 'Unauthorized: missing API key',
      statusDetail: null
    });
    expect(diagnosis.category).toBe('credentials');
  });

  it('classifies cloud environment config errors', () => {
    const diagnosis = diagnoseCloudFailure({
      status: 'failed',
      error: null,
      statusDetail: 'cloud-env-missing'
    });
    expect(diagnosis.category).toBe('configuration');
    expect(diagnosis.diagnostic_category).toBe('env_config');
  });

  it('preserves Codex 0.121 quota/rate-limit distinctions', () => {
    const diagnosis = diagnoseCloudFailure({
      status: 'failed',
      error: 'Rate limit exhausted for prolite account; unknown WHAM plan value was decoded.',
      statusDetail: null
    });
    expect(diagnosis.category).toBe('execution');
    expect(diagnosis.diagnostic_category).toBe('quota_rate_limit');
  });

  it('separates Guardian timeout and Guardian policy denial diagnostics', () => {
    const timeout = diagnoseCloudFailure({
      status: 'failed',
      error: 'Guardian review timed out with timeout-specific guidance.',
      statusDetail: null
    });
    const timeoutLabel = diagnoseCloudFailure({
      status: 'failed',
      error: 'Guardian review timeout with timeout-specific guidance.',
      statusDetail: null
    });
    const denial = diagnoseCloudFailure({
      status: 'failed',
      error: 'Guardian policy denial blocked the request.',
      statusDetail: null
    });
    expect(timeout.diagnostic_category).toBe('guardian_timeout');
    expect(timeoutLabel.diagnostic_category).toBe('guardian_timeout');
    expect(denial.diagnostic_category).toBe('guardian_policy_denial');
  });

  it('classifies active auth profile mismatches and cloud denials separately', () => {
    const mismatch = diagnoseCloudFailure({
      status: 'failed',
      error: 'Active auth profile does not match the Codex account for this environment.',
      statusDetail: null
    });
    const denial = diagnoseCloudFailure({
      status: 'failed',
      error: 'Codex cloud execution denied for this branch.',
      statusDetail: null
    });
    expect(mismatch.category).toBe('credentials');
    expect(mismatch.diagnostic_category).toBe('auth_mismatch');
    expect(denial.category).toBe('credentials');
    expect(denial.diagnostic_category).toBe('cloud_denial');
  });

  it('falls back to execution when status is terminal without a known pattern', () => {
    const diagnosis = diagnoseCloudFailure({
      status: 'failed',
      error: 'Task failed with unknown reason',
      statusDetail: null
    });
    expect(diagnosis.category).toBe('execution');
    expect(diagnosis.diagnostic_category).toBe('provider_runtime');
  });
});
