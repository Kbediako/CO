import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS,
  resolveProviderPollDispatchLimits
} from '../src/cli/control/providerAgentCapacity.js';

describe('provider agent capacity', () => {
  it('rejects partial string parses in provider concurrency limits', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents: '12agents',
          max_concurrent_agents_by_state: {
            'In Progress': '7',
            Ready: '1.5',
            Merging: '3agents'
          }
        }
      }
    });

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS);
    expect(limits.maxConcurrentAgentsByState.get('in progress')).toBe(7);
    expect(limits.maxConcurrentAgentsByState.has('ready')).toBe(false);
    expect(limits.maxConcurrentAgentsByState.has('merging')).toBe(false);
  });
});
