export const PROVIDER_WORKER_HOST_ENV_KEY = 'CODEX_ORCHESTRATOR_PROVIDER_WORKER_HOST';
const DEFAULT_PROVIDER_WORKER_HOST_MAX_CONCURRENT_AGENTS = 1;

export interface ProviderWorkerHostConfig {
  name: string;
  transport: 'ssh';
  ssh_destination: string;
  ssh_options: string[];
  max_concurrent_agents: number;
  node_path: string | null;
}

const ACTIVE_PROVIDER_WORKER_HOST_CLAIM_STATES = new Set(['starting', 'running', 'resuming']);

export function resolveProviderWorkerHostConfig(metadata: unknown): ProviderWorkerHostConfig[] {
  const record = asRecord(metadata);
  const workerHostsRecord = asRecord(record?.worker_hosts ?? record?.workerHosts);
  const hostEntries = Array.isArray(workerHostsRecord?.hosts)
    ? workerHostsRecord.hosts
    : Array.isArray(record?.worker_hosts)
      ? record.worker_hosts
      : Array.isArray(record?.workerHosts)
        ? record.workerHosts
        : [];
  if (hostEntries.length === 0) {
    return [];
  }

  const names = new Set<string>();
  return hostEntries.map((entry, index) => {
    const host = asRecord(entry);
    if (!host) {
      throw new Error(`provider worker host entry #${index + 1} must be an object.`);
    }
    const name = readRequiredString(host, 'name', `provider worker host entry #${index + 1}`);
    if (names.has(name)) {
      throw new Error(`provider worker host "${name}" is duplicated.`);
    }
    names.add(name);
    const transport = readOptionalString(host, 'transport') ?? 'ssh';
    if (transport !== 'ssh') {
      throw new Error(
        `provider worker host "${name}" transport must be "ssh" for the current distributed worker-host lane.`
      );
    }
    const sshDestination = readRequiredString(
      host,
      'ssh_destination',
      `provider worker host "${name}"`
    );
    return {
      name,
      transport: 'ssh',
      ssh_destination: sshDestination,
      ssh_options: readStringArray(host, 'ssh_options'),
      max_concurrent_agents:
        readOptionalPositiveInteger(host, 'max_concurrent_agents', `provider worker host "${name}"`) ??
        DEFAULT_PROVIDER_WORKER_HOST_MAX_CONCURRENT_AGENTS,
      node_path: readOptionalString(host, 'node_path')
    };
  });
}

export function cloneProviderWorkerHostConfigs(
  hosts: ProviderWorkerHostConfig[] | null | undefined
): ProviderWorkerHostConfig[] {
  return Array.isArray(hosts)
    ? hosts.map((host) => ({
        ...host,
        ssh_options: [...host.ssh_options]
      }))
    : [];
}

export function normalizeProviderWorkerHostName(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function findProviderWorkerHost(
  hosts: ProviderWorkerHostConfig[] | null | undefined,
  name: string | null | undefined
): ProviderWorkerHostConfig | null {
  const normalizedName = normalizeProviderWorkerHostName(name);
  if (!normalizedName || !Array.isArray(hosts)) {
    return null;
  }
  return hosts.find((host) => host.name === normalizedName) ?? null;
}

export function selectProviderWorkerHost(input: {
  hosts: ProviderWorkerHostConfig[] | null | undefined;
  claims:
    | Array<{
        provider_key?: string | null;
        state?: string | null;
        worker_host?: string | null;
      }>
    | null
    | undefined;
  currentProviderKey?: string | null | undefined;
  preferredHost?: string | null | undefined;
}):
  | {
      kind: 'local';
      host: null;
      occupancy: Map<string, number>;
    }
  | {
      kind: 'remote';
      host: ProviderWorkerHostConfig;
      occupancy: Map<string, number>;
    }
  | {
      kind: 'exhausted';
      host: null;
      occupancy: Map<string, number>;
    } {
  const hosts = cloneProviderWorkerHostConfigs(input.hosts);
  const occupancy = buildProviderWorkerHostOccupancy({
    claims: input.claims,
    currentProviderKey: input.currentProviderKey
  });
  if (hosts.length === 0) {
    return {
      kind: 'local',
      host: null,
      occupancy
    };
  }

  const preferred = findProviderWorkerHost(hosts, input.preferredHost);
  if (preferred && hasProviderWorkerHostCapacity(preferred, occupancy)) {
    return {
      kind: 'remote',
      host: preferred,
      occupancy
    };
  }

  const selected = [...hosts]
    .map((host, index) => ({
      host,
      index,
      used: occupancy.get(host.name) ?? 0,
      remaining: host.max_concurrent_agents - (occupancy.get(host.name) ?? 0)
    }))
    .filter((entry) => entry.remaining > 0)
    .sort((left, right) => {
      if (right.remaining !== left.remaining) {
        return right.remaining - left.remaining;
      }
      if (left.used !== right.used) {
        return left.used - right.used;
      }
      return left.index - right.index;
    })[0]?.host ?? null;

  if (!selected) {
    return {
      kind: 'exhausted',
      host: null,
      occupancy
    };
  }

  return {
    kind: 'remote',
    host: selected,
    occupancy
  };
}

function buildProviderWorkerHostOccupancy(input: {
  claims:
    | Array<{
        provider_key?: string | null;
        state?: string | null;
        worker_host?: string | null;
      }>
    | null
    | undefined;
  currentProviderKey?: string | null | undefined;
}): Map<string, number> {
  const occupancy = new Map<string, number>();
  if (!Array.isArray(input.claims)) {
    return occupancy;
  }
  for (const claim of input.claims) {
    if (claim.provider_key && input.currentProviderKey && claim.provider_key === input.currentProviderKey) {
      continue;
    }
    if (!ACTIVE_PROVIDER_WORKER_HOST_CLAIM_STATES.has(normalizeClaimState(claim.state))) {
      continue;
    }
    const workerHost = normalizeProviderWorkerHostName(claim.worker_host);
    if (!workerHost) {
      continue;
    }
    occupancy.set(workerHost, (occupancy.get(workerHost) ?? 0) + 1);
  }
  return occupancy;
}

function hasProviderWorkerHostCapacity(
  host: ProviderWorkerHostConfig,
  occupancy: Map<string, number>
): boolean {
  return (occupancy.get(host.name) ?? 0) < host.max_concurrent_agents;
}

function normalizeClaimState(value: string | null | undefined): string {
  return typeof value === 'string' ? value : '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readOptionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  source: string
): string {
  const value = readOptionalString(record, key);
  if (!value) {
    throw new Error(`${source} requires a non-empty ${key}.`);
  }
  return value;
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array of strings.`);
  }
  return value.map((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new Error(`${key}[${index}] must be a non-empty string.`);
    }
    return entry;
  });
}

function readPositiveInteger(
  record: Record<string, unknown>,
  key: string,
  source: string
): number {
  const value = record[key];
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (parsed > 0) {
      return parsed;
    }
  }
  throw new Error(`${source} requires ${key} to be a positive integer.`);
}

function readOptionalPositiveInteger(
  record: Record<string, unknown>,
  key: string,
  source: string
): number | null {
  if (record[key] === undefined || record[key] === null) {
    return null;
  }
  return readPositiveInteger(record, key, source);
}
