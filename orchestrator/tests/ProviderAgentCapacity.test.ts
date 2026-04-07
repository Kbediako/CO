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

  it('returns the default when feature toggles are null', () => {
    const limits = resolveProviderPollDispatchLimits(null);

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS);
    expect(limits.maxConcurrentAgentsByState.size).toBe(0);
  });

  it('returns the default when feature toggles are undefined', () => {
    const limits = resolveProviderPollDispatchLimits(undefined);

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS);
    expect(limits.maxConcurrentAgentsByState.size).toBe(0);
  });

  it('returns the default when feature toggles are an empty object', () => {
    const limits = resolveProviderPollDispatchLimits({});

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS);
    expect(limits.maxConcurrentAgentsByState.size).toBe(0);
  });

  it('reads max_concurrent_agents from the direct agent key', () => {
    const limits = resolveProviderPollDispatchLimits({
      agent: {
        max_concurrent_agents: 5
      }
    });

    expect(limits.maxConcurrentAgents).toBe(5);
  });

  it('reads max_concurrent_agents from a numeric integer value', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents: 15
        }
      }
    });

    expect(limits.maxConcurrentAgents).toBe(15);
  });

  it('reads max_concurrent_agents from a valid string integer', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents: '8'
        }
      }
    });

    expect(limits.maxConcurrentAgents).toBe(8);
  });

  it('falls back to default when max_concurrent_agents is zero', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents: 0
        }
      }
    });

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS);
  });

  it('falls back to default when max_concurrent_agents is negative', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents: -3
        }
      }
    });

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS);
  });

  it('falls back to default when max_concurrent_agents is a non-integer float', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents: 3.5
        }
      }
    });

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS);
  });

  it('falls back to default when max_concurrent_agents is a string "0"', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents: '0'
        }
      }
    });

    expect(limits.maxConcurrentAgents).toBe(DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS);
  });

  it('lets direct agent key override coordinator.agent for max_concurrent_agents', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents: 3
        }
      },
      agent: {
        max_concurrent_agents: 9
      }
    });

    expect(limits.maxConcurrentAgents).toBe(9);
  });

  it('reads max_concurrent_agents via the camelCase alias key maxConcurrentAgents', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          maxConcurrentAgents: 6
        }
      }
    });

    expect(limits.maxConcurrentAgents).toBe(6);
  });

  it('reads max_concurrent_agents_by_state with multiple valid states', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents: 10,
          max_concurrent_agents_by_state: {
            'In Progress': 5,
            Ready: 3,
            Merging: 2
          }
        }
      }
    });

    expect(limits.maxConcurrentAgentsByState.get('in progress')).toBe(5);
    expect(limits.maxConcurrentAgentsByState.get('ready')).toBe(3);
    expect(limits.maxConcurrentAgentsByState.get('merging')).toBe(2);
  });

  it('ignores by-state entries where the state key does not normalize to a known state', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents_by_state: {
            unknown_state_xyz: 5
          }
        }
      }
    });

    expect(limits.maxConcurrentAgentsByState.has('unknown_state_xyz')).toBe(false);
    expect(limits.maxConcurrentAgentsByState.size).toBe(0);
  });

  it('ignores by-state entries with array values', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents_by_state: {
            'In Progress': [1, 2, 3]
          }
        }
      }
    });

    expect(limits.maxConcurrentAgentsByState.has('in progress')).toBe(false);
  });

  it('returns an empty by-state map when max_concurrent_agents_by_state is absent', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          max_concurrent_agents: 4
        }
      }
    });

    expect(limits.maxConcurrentAgentsByState.size).toBe(0);
  });

  it('reads max_concurrent_agents_by_state via the camelCase alias key maxConcurrentAgentsByState', () => {
    const limits = resolveProviderPollDispatchLimits({
      coordinator: {
        agent: {
          maxConcurrentAgentsByState: {
            'In Progress': 4
          }
        }
      }
    });

    expect(limits.maxConcurrentAgentsByState.get('in progress')).toBe(4);
  });
});