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
  });

  it('falls back to execution when status is terminal without a known pattern', () => {
    const diagnosis = diagnoseCloudFailure({
      status: 'failed',
      error: 'Task failed with unknown reason',
      statusDetail: null
    });
    expect(diagnosis.category).toBe('execution');
  });
});
