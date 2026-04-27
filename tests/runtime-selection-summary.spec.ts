import { describe, expect, it } from 'vitest';

import { formatRuntimeSelectionSummary } from '../orchestrator/src/cli/runtime/codexCommand.js';
import type { RuntimeSelection } from '../orchestrator/src/cli/runtime/types.js';

function buildRuntimeSelection(overrides: Partial<RuntimeSelection> = {}): RuntimeSelection {
  return {
    requested_mode: 'cli',
    selected_mode: 'cli',
    source: 'default',
    provider: 'CliRuntimeProvider',
    env_overrides: {},
    runtime_session_id: null,
    fallback: {
      occurred: false,
      policy: 'auto',
      policy_source: 'default',
      code: null,
      reason: null,
      from_mode: null,
      to_mode: null,
      original_target: null,
      fallback_target: null,
      blocking_reason: null,
      checked_at: '2026-04-26T00:00:00.000Z'
    },
    ...overrides
  };
}

describe('formatRuntimeSelectionSummary', () => {
  it('includes fallback policy source when fallback does not occur', () => {
    expect(formatRuntimeSelectionSummary(buildRuntimeSelection())).toContain(
      'fallback_policy_source=default'
    );
  });

  it('includes fallback policy source when fallback occurs', () => {
    const summary = formatRuntimeSelectionSummary(
      buildRuntimeSelection({
        requested_mode: 'appserver',
        selected_mode: 'cli',
        fallback: {
          occurred: true,
          policy: 'strict',
          policy_source: 'env',
          code: 'appserver-preflight-failed',
          reason: 'Appserver preflight failed.',
          from_mode: 'appserver',
          to_mode: 'cli',
          original_target: 'runtime:appserver',
          fallback_target: 'runtime:cli',
          blocking_reason: 'Appserver preflight failed.',
          expiry: {
            owner: 'CO-396',
            trigger: 'runtimeMode=appserver preflight failure',
            introduced_date: '2026-02-27',
            review_date: '2026-05-10',
            maximum_lifetime: '2026-05-26',
            removal_condition: 'Use cli or strict before launch.',
            validation: 'runtime provider tests'
          },
          checked_at: '2026-04-26T00:00:00.000Z'
        }
      })
    );

    expect(summary).toContain('fallback_policy=strict fallback_policy_source=env');
    expect(summary).toContain('fallback=appserver-preflight-failed');
    expect(summary).toContain('expiry_owner=CO-396 expiry_review=2026-05-10 expiry_max=2026-05-26');
  });
});
