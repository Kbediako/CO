import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCAL_PROVIDER_MAX_CONCURRENT_AGENTS,
  DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS,
  resolveProviderPollDispatchLimits
} from '../src/cli/control/providerAgentCapacity.js';

describe('provider agent capacity', () => {
  it('defaults shared provider concurrency to the existing global cap', () => {
    const limits = resolveProviderPollDispatchLimits(null);

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS);
    expect(limits.maxConcurrentAgents).toBe(10);
    expect([...limits.maxConcurrentAgentsByState.entries()]).toEqual([]);
  });

  it('uses the safer local cap only when the host is running without worker hosts or explicit limits', () => {
    const limits = resolveProviderPollDispatchLimits(null, { localWorkerOnly: true });

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_LOCAL_PROVIDER_MAX_CONCURRENT_AGENTS);
    expect(limits.maxConcurrentAgents).toBe(3);
    expect([...limits.maxConcurrentAgentsByState.entries()]).toEqual([]);
  });

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

  it('keeps the safer local fallback cap even when state-specific limits are configured', () => {
    const limits = resolveProviderPollDispatchLimits(
      {
        coordinator: {
          agent: {
            max_concurrent_agents_by_state: {
              'In Progress': '7'
            }
          }
        }
      },
      { localWorkerOnly: true }
    );

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_LOCAL_PROVIDER_MAX_CONCURRENT_AGENTS);
    expect(limits.maxConcurrentAgentsByState.get('in progress')).toBe(7);
  });

  it('honours explicit max_concurrent_agents even in local-only mode', () => {
    const limits = resolveProviderPollDispatchLimits(
      {
        coordinator: {
          agent: {
            max_concurrent_agents: '9'
          }
        }
      },
      { localWorkerOnly: true }
    );

    expect(limits.maxConcurrentAgents).toBe(9);
    expect([...limits.maxConcurrentAgentsByState.entries()]).toEqual([]);
  });
});
