import { describe, expect, it } from 'vitest';

import {
  normalizeProviderLinearChildLanePathSelectors,
  resolveProviderLinearChildLaneScopeContract
} from '../src/cli/providerLinearChildLanePhaseContract.js';

describe('providerLinearChildLanePhaseContract', () => {
  it('accepts canonical persisted selector payloads', () => {
    expect(
      normalizeProviderLinearChildLanePathSelectors([
        {
          kind: 'prefix',
          value: 'orchestrator/src/',
          source: 'phase',
          phase: 'implementation'
        }
      ])
    ).toEqual([
      {
        kind: 'prefix',
        value: 'orchestrator/src/',
        source: 'phase',
        phase: 'implementation'
      }
    ]);
  });

  it('rejects persisted selector payloads that duplicate a path signature', () => {
    expect(
      normalizeProviderLinearChildLanePathSelectors([
        {
          kind: 'exact',
          value: 'AGENTS.md',
          source: 'file',
          phase: null
        },
        {
          kind: 'exact',
          value: 'AGENTS.md',
          source: 'phase',
          phase: 'docs'
        }
      ])
    ).toBeNull();
  });

  it('rejects file selectors that carry a stray phase field', () => {
    expect(
      normalizeProviderLinearChildLanePathSelectors([
        {
          kind: 'exact',
          value: 'AGENTS.md',
          source: 'file',
          phase: 'docs'
        }
      ])
    ).toBeNull();
  });

  it('rejects non-canonical phase selector metadata', () => {
    expect(
      normalizeProviderLinearChildLanePathSelectors([
        {
          kind: 'prefix',
          value: 'orchestrator/src/',
          source: 'phase',
          phase: 'Implementation'
        }
      ])
    ).toBeNull();
  });

  it('rejects prototype phase names when resolving supported scopes', () => {
    expect(() =>
      resolveProviderLinearChildLaneScopeContract({
        files: [],
        phases: ['constructor']
      })
    ).toThrow(/Unsupported child-lane phases: constructor/);
  });
});
