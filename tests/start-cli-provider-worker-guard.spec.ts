import { describe, expect, it } from 'vitest';

import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV
} from '../scripts/lib/provider-run-contract.js';
import { assertProviderLinearWorkerStartAllowed } from '../orchestrator/src/cli/startCliRequestShell.js';

describe('provider-linear-worker direct-start guard', () => {
  it('rejects provider-linear-worker starts without control-host provenance and points to recovery', () => {
    expect(() =>
      assertProviderLinearWorkerStartAllowed({
        pipelineId: 'provider-linear-worker',
        issueId: '0b2377a2-366f-4309-a508-610e524c9d94',
        issueIdentifier: 'CO-393',
        env: {}
      })
    ).toThrow(/control-host recover --issue-id/u);
  });

  it('allows provider-linear-worker starts with complete control-host provenance', () => {
    expect(() =>
      assertProviderLinearWorkerStartAllowed({
        pipelineId: 'provider-linear-worker',
        issueId: '0b2377a2-366f-4309-a508-610e524c9d94',
        issueIdentifier: 'CO-393',
        env: {
          [PROVIDER_LAUNCH_SOURCE_ENV]: PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
          [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: 'local-mcp',
          [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: 'control-host',
          [PROVIDER_LAUNCH_TOKEN_ENV]: 'launch-token'
        }
      })
    ).not.toThrow();
  });
});
