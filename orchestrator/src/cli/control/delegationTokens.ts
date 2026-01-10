import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export interface DelegationTokenRecord {
  token_id: string;
  token_hash: string;
  parent_run_id: string;
  child_run_id: string;
  created_at: string;
  expires_at?: string | null;
}

export interface DelegationTokenStoreOptions {
  now?: () => string;
  seed?: DelegationTokenRecord[];
}

export class DelegationTokenStore {
  private readonly now: () => string;
  private readonly records = new Map<string, DelegationTokenRecord>();

  constructor(options: DelegationTokenStoreOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    if (options.seed) {
      for (const record of options.seed) {
        this.records.set(record.token_id, { ...record });
      }
    }
  }

  issue(parentRunId: string, childRunId: string): { token: string; record: DelegationTokenRecord } {
    const token = randomBytes(32).toString('hex');
    const record: DelegationTokenRecord = {
      token_id: `dlt-${randomBytes(8).toString('hex')}`,
      token_hash: hashToken(token),
      parent_run_id: parentRunId,
      child_run_id: childRunId,
      created_at: this.now(),
      expires_at: null
    };
    this.records.set(record.token_id, record);
    return { token, record };
  }

  register(token: string, parentRunId: string, childRunId: string): DelegationTokenRecord {
    const record: DelegationTokenRecord = {
      token_id: `dlt-${randomBytes(8).toString('hex')}`,
      token_hash: hashToken(token),
      parent_run_id: parentRunId,
      child_run_id: childRunId,
      created_at: this.now(),
      expires_at: null
    };
    this.records.set(record.token_id, record);
    return { ...record };
  }

  validate(token: string, parentRunId: string, childRunId: string): DelegationTokenRecord | null {
    const tokenHash = hashToken(token);
    for (const record of this.records.values()) {
      if (record.parent_run_id !== parentRunId || record.child_run_id !== childRunId) {
        continue;
      }
      if (timingSafeEqualStrings(record.token_hash, tokenHash)) {
        return { ...record };
      }
    }
    return null;
  }

  list(): DelegationTokenRecord[] {
    return Array.from(this.records.values()).map((record) => ({ ...record }));
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function timingSafeEqualStrings(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}
