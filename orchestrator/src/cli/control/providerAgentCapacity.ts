import { normalizeProviderLinearWorkflowState } from './providerLinearWorkflowStates.js';

export const DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS = 10;
export const DEFAULT_LOCAL_PROVIDER_MAX_CONCURRENT_AGENTS = 3;

export function resolveProviderPollDispatchLimits(
  featureToggles: Record<string, unknown> | null | undefined,
  options: {
    localWorkerOnly?: boolean;
  } = {}
): {
  maxConcurrentAgents: number;
  maxConcurrentAgentsByState: Map<string, number>;
} {
  const agentConfig = readProviderPollAgentConfig(featureToggles);
  const explicitMaxConcurrentAgents = readPositiveIntegerValue(
    agentConfig,
    'max_concurrent_agents',
    'maxConcurrentAgents'
  );
  const maxConcurrentAgentsByState = readPositiveIntegerMap(
    agentConfig,
    'max_concurrent_agents_by_state',
    'maxConcurrentAgentsByState'
  );
  return {
    maxConcurrentAgents:
      explicitMaxConcurrentAgents ??
      (
        options.localWorkerOnly === true
          ? DEFAULT_LOCAL_PROVIDER_MAX_CONCURRENT_AGENTS
          : DEFAULT_PROVIDER_MAX_CONCURRENT_AGENTS
      ),
    maxConcurrentAgentsByState
  };
}

function readProviderPollAgentConfig(
  featureToggles: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  const direct = readRecordValue(featureToggles, 'agent');
  const nested = readRecordValue(readRecordValue(featureToggles, 'coordinator'), 'agent');
  if (!direct && !nested) {
    return null;
  }
  return {
    ...(nested ?? {}),
    ...(direct ?? {})
  };
}

function readPositiveIntegerMap(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): Map<string, number> {
  const value = readRecordValue(record, ...keys);
  if (!value) {
    return new Map<string, number>();
  }

  const entries = new Map<string, number>();
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const normalizedKey = normalizeProviderLinearWorkflowState(rawKey);
    const parsedValue = readPositiveIntegerValue({ value: rawValue }, 'value');
    if (!normalizedKey || parsedValue === null) {
      continue;
    }
    entries.set(normalizedKey, parsedValue);
  }
  return entries;
}

function readPositiveIntegerValue(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || !/^\d+$/.test(trimmed)) {
        continue;
      }
      const parsed = Number.parseInt(trimmed, 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return null;
}

function readRecordValue(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): Record<string, unknown> | null {
  for (const key of keys) {
    const value = record?.[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}
