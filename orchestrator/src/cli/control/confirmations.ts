import { createHash, randomBytes } from 'node:crypto';

export type ConfirmationAction = 'cancel' | 'merge' | 'other';

export interface ConfirmationRequest {
  request_id: string;
  action: ConfirmationAction;
  tool: string;
  params: Record<string, unknown>;
  action_params_digest: string;
  digest_alg: 'sha256';
  requested_at: string;
  expires_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface ConfirmationCreateInput {
  action: ConfirmationAction;
  tool: string;
  params: Record<string, unknown>;
}

export interface ConfirmationNonce {
  request_id: string;
  nonce_id: string;
  confirm_nonce: string;
  action_params_digest: string;
  digest_alg: 'sha256';
  issued_at: string;
  expires_at: string;
}

export interface ConfirmationStoreOptions {
  now?: () => Date;
  expiresInMs: number;
  maxPending: number;
  seed?: ConfirmationRequest[];
}

export class ConfirmationStore {
  private readonly now: () => Date;
  private readonly expiresInMs: number;
  private readonly maxPending: number;
  private readonly pending = new Map<string, ConfirmationRequest>();
  private readonly digestIndex = new Map<string, string>();

  constructor(options: ConfirmationStoreOptions) {
    this.now = options.now ?? (() => new Date());
    this.expiresInMs = options.expiresInMs;
    this.maxPending = options.maxPending;
    if (options.seed) {
      for (const entry of options.seed) {
        this.pending.set(entry.request_id, { ...entry });
        this.digestIndex.set(entry.action_params_digest, entry.request_id);
      }
    }
  }

  create(input: ConfirmationCreateInput): ConfirmationRequest {
    const actionParamsDigest = buildActionParamsDigest({ tool: input.tool, params: input.params });
    const existingId = this.digestIndex.get(actionParamsDigest);
    if (existingId) {
      const existing = this.pending.get(existingId);
      if (existing) {
        return existing;
      }
      this.digestIndex.delete(actionParamsDigest);
    }

    if (this.pending.size >= this.maxPending) {
      throw new Error('confirmation_pending_limit_reached');
    }

    const requestId = `req-${randomBytes(8).toString('hex')}`;
    const now = this.now();
    const expiresAt = new Date(now.getTime() + this.expiresInMs);

    const request: ConfirmationRequest = {
      request_id: requestId,
      action: input.action,
      tool: input.tool,
      params: { ...input.params },
      action_params_digest: actionParamsDigest,
      digest_alg: 'sha256',
      requested_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      approved_by: null,
      approved_at: null
    };

    this.pending.set(requestId, request);
    this.digestIndex.set(actionParamsDigest, requestId);
    return request;
  }

  approve(requestId: string, actor: string): void {
    const entry = this.pending.get(requestId);
    if (!entry) {
      throw new Error('confirmation_request_not_found');
    }
    entry.approved_by = actor;
    entry.approved_at = this.now().toISOString();
  }

  get(requestId: string): ConfirmationRequest | undefined {
    const entry = this.pending.get(requestId);
    return entry ? { ...entry } : undefined;
  }

  expire(): ConfirmationRequest[] {
    const now = this.now().getTime();
    const expired: ConfirmationRequest[] = [];
    for (const [requestId, entry] of this.pending.entries()) {
      const expiry = Date.parse(entry.expires_at);
      if (Number.isFinite(expiry) && expiry <= now) {
        this.pending.delete(requestId);
        this.digestIndex.delete(entry.action_params_digest);
        expired.push({ ...entry });
      }
    }
    return expired;
  }

  consume(requestId: string): ConfirmationNonce {
    const entry = this.pending.get(requestId);
    if (!entry) {
      throw new Error('confirmation_request_not_found');
    }
    if (!entry.approved_at) {
      throw new Error('confirmation_not_approved');
    }
    this.pending.delete(requestId);
    this.digestIndex.delete(entry.action_params_digest);

    const issuedAt = this.now();
    const confirmNonce = randomBytes(32).toString('hex');
    const nonceId = `nonce-${randomBytes(8).toString('hex')}`;

    return {
      request_id: requestId,
      nonce_id: nonceId,
      confirm_nonce: confirmNonce,
      action_params_digest: entry.action_params_digest,
      digest_alg: 'sha256',
      issued_at: issuedAt.toISOString(),
      expires_at: entry.expires_at
    };
  }

  listPending(): ConfirmationRequest[] {
    return Array.from(this.pending.values());
  }
}

export function buildActionParamsDigest(input: { tool: string; params: Record<string, unknown> }): string {
  const sanitized = stripConfirmNonce({ tool: input.tool, params: input.params });
  const canonical = canonicalize(sanitized);
  return createHash('sha256').update(canonical).digest('hex');
}

function stripConfirmNonce(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripConfirmNonce);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      if (key === 'confirm_nonce') {
        continue;
      }
      const cleaned = stripConfirmNonce(record[key]);
      if (typeof cleaned !== 'undefined') {
        result[key] = cleaned;
      }
    }
    return result;
  }
  return value;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Non-finite numbers are not allowed in canonical JSON.');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalize(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => typeof record[key] !== 'undefined')
      .sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(null);
}
