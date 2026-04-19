import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import process from 'node:process';

import { acquireLockWithRetry, type LockRetryOptions } from '../../persistence/lockFile.js';

export const PROVIDER_OPERATOR_AUTOPILOT_LIFECYCLE_FILENAME =
  'provider-operator-autopilot-lifecycle.json';
const PROVIDER_OPERATOR_AUTOPILOT_LIFECYCLE_LOCK_RETRY: LockRetryOptions = {
  maxAttempts: 450,
  initialDelayMs: 10,
  backoffFactor: 1.2,
  maxDelayMs: 100,
  staleMs: 30_000
};

export type ProviderOperatorAutopilotLifecycleState =
  | 'acknowledged'
  | 'cleared'
  | 'dismissed';

export interface ProviderOperatorAutopilotLifecycleRecord {
  action_instance_id: string;
  kind: 'local_rollout';
  issue_id: string;
  issue_identifier: string | null;
  state: ProviderOperatorAutopilotLifecycleState;
  actor: string;
  reason: string;
  recorded_at: string;
  source: 'co-status' | 'operator-autopilot';
}

export interface ProviderOperatorAutopilotLifecycleStore {
  version: 1;
  records: ProviderOperatorAutopilotLifecycleRecord[];
}

export function resolveProviderOperatorAutopilotLifecyclePath(runDir: string): string {
  return join(runDir, PROVIDER_OPERATOR_AUTOPILOT_LIFECYCLE_FILENAME);
}

export async function readProviderOperatorAutopilotLifecycleRecords(
  lifecyclePath: string
): Promise<ProviderOperatorAutopilotLifecycleRecord[]> {
  let raw: string;
  try {
    raw = await readFile(lifecyclePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const parsed = JSON.parse(raw) as unknown;
  return parseProviderOperatorAutopilotLifecycleStore(parsed).records;
}

export async function appendProviderOperatorAutopilotLifecycleRecord(
  lifecyclePath: string,
  record: ProviderOperatorAutopilotLifecycleRecord
): Promise<ProviderOperatorAutopilotLifecycleStore> {
  return withProviderOperatorAutopilotLifecycleWriteLock(lifecyclePath, async () => {
    const records = await readProviderOperatorAutopilotLifecycleRecords(lifecyclePath);
    const nextStore: ProviderOperatorAutopilotLifecycleStore = {
      version: 1,
      records: [...records, cloneProviderOperatorAutopilotLifecycleRecord(record)]
    };
    await writeProviderOperatorAutopilotLifecycleStore(lifecyclePath, nextStore);
    return cloneProviderOperatorAutopilotLifecycleStore(nextStore);
  });
}

export function cloneProviderOperatorAutopilotLifecycleRecord(
  record: ProviderOperatorAutopilotLifecycleRecord
): ProviderOperatorAutopilotLifecycleRecord {
  return {
    action_instance_id: record.action_instance_id,
    kind: record.kind,
    issue_id: record.issue_id,
    issue_identifier: record.issue_identifier,
    state: record.state,
    actor: record.actor,
    reason: record.reason,
    recorded_at: record.recorded_at,
    source: record.source
  };
}

export function parseProviderOperatorAutopilotLifecycleRecord(
  value: unknown
): ProviderOperatorAutopilotLifecycleRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const actionInstanceId = normalizeNonEmptyString(value.action_instance_id);
  const issueId = normalizeNonEmptyString(value.issue_id);
  const state = normalizeLifecycleState(value.state);
  const actor = normalizeNonEmptyString(value.actor);
  const reason = normalizeNonEmptyString(value.reason);
  const recordedAt = normalizeNonEmptyString(value.recorded_at);
  if (
    !actionInstanceId ||
    value.kind !== 'local_rollout' ||
    !issueId ||
    !state ||
    !actor ||
    !reason ||
    !recordedAt ||
    (value.source !== 'co-status' && value.source !== 'operator-autopilot')
  ) {
    return null;
  }
  return {
    action_instance_id: actionInstanceId,
    kind: 'local_rollout',
    issue_id: issueId,
    issue_identifier: normalizeOptionalString(value.issue_identifier),
    state,
    actor,
    reason,
    recorded_at: recordedAt,
    source: value.source
  };
}

function parseProviderOperatorAutopilotLifecycleStore(
  value: unknown
): ProviderOperatorAutopilotLifecycleStore {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.records)) {
    throw new Error('Operator autopilot lifecycle store is malformed.');
  }
  const records = value.records.map(parseProviderOperatorAutopilotLifecycleRecord);
  if (records.some((record) => record === null)) {
    throw new Error('Operator autopilot lifecycle store contains malformed records.');
  }
  return {
    version: 1,
    records: records.map((record) =>
      cloneProviderOperatorAutopilotLifecycleRecord(
        record as ProviderOperatorAutopilotLifecycleRecord
      )
    )
  };
}

async function writeProviderOperatorAutopilotLifecycleStore(
  lifecyclePath: string,
  store: ProviderOperatorAutopilotLifecycleStore
): Promise<void> {
  await mkdir(dirname(lifecyclePath), { recursive: true });
  const tempPath = `${lifecyclePath}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
    await rename(tempPath, lifecyclePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function cloneProviderOperatorAutopilotLifecycleStore(
  store: ProviderOperatorAutopilotLifecycleStore
): ProviderOperatorAutopilotLifecycleStore {
  return {
    version: 1,
    records: store.records.map(cloneProviderOperatorAutopilotLifecycleRecord)
  };
}

async function withProviderOperatorAutopilotLifecycleWriteLock<T>(
  lifecyclePath: string,
  body: () => Promise<T>
): Promise<T> {
  const lockPath = `${lifecyclePath}.lock`;
  const lock = await acquireLockWithRetry({
    taskId: 'provider-operator-autopilot-lifecycle',
    lockPath,
    retry: PROVIDER_OPERATOR_AUTOPILOT_LIFECYCLE_LOCK_RETRY,
    ensureDirectory: async () => {
      await mkdir(dirname(lockPath), { recursive: true });
    },
    createError: (_taskId, attempts) =>
      new Error(
        `Timed out waiting for operator autopilot lifecycle store lock after ${attempts} attempts.`
      )
  });
  try {
    return await body();
  } finally {
    await lock.release();
  }
}

function normalizeLifecycleState(
  value: unknown
): ProviderOperatorAutopilotLifecycleState | null {
  return value === 'acknowledged' || value === 'cleared' || value === 'dismissed'
    ? value
    : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNonEmptyString(value: unknown): string | null {
  return normalizeOptionalString(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
