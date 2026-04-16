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

  it('matches machine-readable cloud diagnostic categories', () => {
    const cases = new Map([
      ['env_config', 'env_config'],
      ['no_environment_id', 'env_config'],
      ['auth_mismatch', 'auth_mismatch'],
      ['cloud_connector_auth_drift', 'cloud_connector_auth_drift'],
      ['missing_github_connector_link', 'cloud_connector_auth_drift'],
      ['github_connection_not_found', 'cloud_connector_auth_drift'],
      ['cloud_denial', 'cloud_denial'],
      ['cloud_access_denied', 'cloud_denial'],
      ['cloud_execution_denied', 'cloud_denial'],
      ['not_allowed_in_cloud', 'cloud_denial'],
      ['quota_rate_limit', 'quota_rate_limit'],
      ['rate_limited', 'quota_rate_limit'],
      ['rate_limit_exceeded', 'quota_rate_limit'],
      ['usage_limit_reached', 'quota_rate_limit']
    ] as const);
    for (const [statusDetail, diagnosticCategory] of cases) {
      expect(diagnoseCloudFailure({ status: 'failed', error: null, statusDetail }).diagnostic_category)
        .toBe(diagnosticCategory);
    }
  });

  it('keeps machine-readable cloud status details stable when prose mentions quota', () => {
    expect(diagnoseCloudFailure({
      status: 'failed',
      error: 'rate limit context included in the cloud wrapper',
      statusDetail: 'auth_mismatch'
    }).diagnostic_category).toBe('auth_mismatch');
    expect(diagnoseCloudFailure({
      status: 'failed',
      error: 'quota exhausted after environment lookup failed',
      statusDetail: 'env_config'
    }).diagnostic_category).toBe('env_config');
    expect(diagnoseCloudFailure({
      status: 'failed',
      error: 'rate limit exhausted in wrapped prose',
      statusDetail: 'cloud_denial'
    }).diagnostic_category).toBe('cloud_denial');
    expect(diagnoseCloudFailure({
      status: 'failed',
      error: 'Guardian policy denial blocked the request.',
      statusDetail: 'timed out'
    }).diagnostic_category).toBe('guardian_policy_denial');
    expect(diagnoseCloudFailure({
      status: 'failed',
      error: 'Guardian policy denial blocked the request.',
      statusDetail: 'Guardian review timed out'
    }).diagnostic_category).toBe('guardian_policy_denial');
  });

  it('classifies GitHub connector admission drift distinctly from provider runtime', () => {
    const missingLink = diagnoseCloudFailure({
      status: 'failed',
      error:
        'codex cloud exec failed with exit 1: HTTP 400 missing_github_connector_link: GitHub connection not found for user',
      statusDetail: null
    });
    const prose = diagnoseCloudFailure({
      status: 'failed',
      error: 'CODEX_CLOUD_ENV_ID was present, but GitHub connection not found for user before task creation.',
      statusDetail: null
    });

    for (const diagnosis of [missingLink, prose]) {
      expect(diagnosis.category).toBe('credentials');
      expect(diagnosis.diagnostic_category).toBe('cloud_connector_auth_drift');
      expect(diagnosis.diagnostic_category).not.toBe('provider_runtime');
      expect(diagnosis.guidance).toContain('Repair or relink the GitHub connector');
    }
  });

  it('preserves Codex 0.121 quota/rate-limit distinctions', () => {
    const diagnosis = diagnoseCloudFailure({
      status: 'failed',
      error: 'Rate limit exhausted for prolite account; unknown WHAM plan value was decoded.',
      statusDetail: null
    });
    const tokenQuota = diagnoseCloudFailure({
      status: 'failed',
      error: 'Token quota exceeded for this account.',
      statusDetail: null
    });
    const tokenRateLimit = diagnoseCloudFailure({
      status: 'failed',
      error: 'Rate limit for tokens reached.',
      statusDetail: null
    });
    const expiredAuthToken = diagnoseCloudFailure({
      status: 'failed',
      error: 'Auth token expired; login required.',
      statusDetail: null
    });
    expect(diagnosis.category).toBe('execution');
    expect(diagnosis.diagnostic_category).toBe('quota_rate_limit');
    expect(tokenQuota.diagnostic_category).toBe('quota_rate_limit');
    expect(tokenRateLimit.diagnostic_category).toBe('quota_rate_limit');
    expect(expiredAuthToken.diagnostic_category).toBe('auth_mismatch');
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
    const enumTimeout = diagnoseCloudFailure({
      status: 'failed',
      error: null,
      statusDetail: 'guardian_timeout'
    });
    const enumDenial = diagnoseCloudFailure({
      status: 'failed',
      error: null,
      statusDetail: 'guardian_policy_denial'
    });
    expect(timeout.diagnostic_category).toBe('guardian_timeout');
    expect(timeoutLabel.diagnostic_category).toBe('guardian_timeout');
    expect(enumTimeout.diagnostic_category).toBe('guardian_timeout');
    expect(denial.diagnostic_category).toBe('guardian_policy_denial');
    expect(enumDenial.diagnostic_category).toBe('guardian_policy_denial');
  });

  it('classifies active auth profile mismatches and cloud denials separately', () => {
    const mismatch = diagnoseCloudFailure({
      status: 'failed',
      error: 'Active auth profile does not match the Codex account for this environment.',
      statusDetail: null
    });
    const mismatchWithPlanContext = diagnoseCloudFailure({
      status: 'failed',
      error: 'Active auth profile forbidden for this prolite account.',
      statusDetail: null
    });
    const mismatchWithQuotaContext = diagnoseCloudFailure({
      status: 'failed',
      error: 'Account mismatch while rate limit exhausted for this profile.',
      statusDetail: null
    });
    const denial = diagnoseCloudFailure({
      status: 'failed',
      error: 'Codex cloud execution denied for this branch.',
      statusDetail: null
    });
    expect(mismatch.category).toBe('credentials');
    expect(mismatch.diagnostic_category).toBe('auth_mismatch');
    expect(mismatchWithPlanContext.category).toBe('credentials');
    expect(mismatchWithPlanContext.diagnostic_category).toBe('auth_mismatch');
    expect(mismatchWithQuotaContext.category).toBe('credentials');
    expect(mismatchWithQuotaContext.diagnostic_category).toBe('auth_mismatch');
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
