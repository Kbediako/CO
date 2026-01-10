import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import canonicalize from 'canonicalize';

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

export interface ConfirmationCreateResult {
  confirmation: ConfirmationRequest;
  wasCreated: boolean;
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

export interface ConfirmationNonceRecord {
  request_id: string;
  nonce_id: string;
  issued_at: string;
  expires_at: string;
}

export interface ConfirmationExpiry {
  request: ConfirmationRequest;
  nonce_id: string | null;
}

export interface ConfirmationValidationResult {
  request: ConfirmationRequest;
  nonce_id: string;
}

export interface ConfirmationStoreSnapshot {
  pending: ConfirmationRequest[];
  issued: ConfirmationNonceRecord[];
  consumed_nonce_ids: string[];
}

export interface ConfirmationStoreOptions {
  runId: string;
  now?: () => Date;
  expiresInMs: number;
  maxPending: number;
  seed?: Partial<ConfirmationStoreSnapshot>;
  secret?: Buffer;
}

const NONCE_VERSION = 1;

interface ConfirmationNoncePayload {
  v: number;
  run_id: string;
  request_id: string;
  nonce_id: string;
  action: ConfirmationAction;
  action_params_digest: string;
  issued_at: string;
  expires_at: string;
}

export class ConfirmationStore {
  private readonly runId: string;
  private readonly now: () => Date;
  private readonly expiresInMs: number;
  private readonly maxPending: number;
  private readonly secret: Buffer;
  private readonly pending = new Map<string, ConfirmationRequest>();
  private readonly digestIndex = new Map<string, string>();
  private readonly issued = new Map<string, ConfirmationNonceRecord>();
  private readonly issuedByRequest = new Map<string, string>();
  private readonly consumed = new Set<string>();

  constructor(options: ConfirmationStoreOptions) {
    this.runId = options.runId;
    this.now = options.now ?? (() => new Date());
    this.expiresInMs = options.expiresInMs;
    this.maxPending = options.maxPending;
    this.secret = options.secret ?? randomBytes(32);

    const seed = options.seed ?? {};
    const seededPending = Array.isArray(seed.pending) ? seed.pending : [];
    for (const entry of seededPending) {
      this.pending.set(entry.request_id, { ...entry });
      this.digestIndex.set(entry.action_params_digest, entry.request_id);
    }
    const seededIssued = Array.isArray(seed.issued) ? seed.issued : [];
    for (const entry of seededIssued) {
      this.issued.set(entry.nonce_id, { ...entry });
      this.issuedByRequest.set(entry.request_id, entry.nonce_id);
    }
    const seededConsumed = Array.isArray(seed.consumed_nonce_ids) ? seed.consumed_nonce_ids : [];
    for (const nonceId of seededConsumed) {
      this.consumed.add(nonceId);
    }
  }

  create(input: ConfirmationCreateInput): ConfirmationCreateResult {
    const actionParamsDigest = buildActionParamsDigest({ tool: input.tool, params: input.params });
    const existingId = this.digestIndex.get(actionParamsDigest);
    if (existingId) {
      const existing = this.pending.get(existingId);
      if (existing) {
        return { confirmation: { ...existing }, wasCreated: false };
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
    return { confirmation: { ...request }, wasCreated: true };
  }

  approve(requestId: string, actor: string): void {
    const entry = this.pending.get(requestId);
    if (!entry) {
      throw new Error('confirmation_request_not_found');
    }
    entry.approved_by = actor;
    entry.approved_at = this.now().toISOString();
  }

  issue(requestId: string): ConfirmationNonce {
    const entry = this.pending.get(requestId);
    if (!entry) {
      throw new Error('confirmation_request_not_found');
    }
    if (!entry.approved_at) {
      throw new Error('confirmation_not_approved');
    }

    const existingNonceId = this.issuedByRequest.get(requestId);
    if (existingNonceId) {
      return this.buildNonce(entry, this.issued.get(existingNonceId));
    }

    const issuedAt = this.now().toISOString();
    const nonceId = `nonce-${randomBytes(8).toString('hex')}`;
    const record: ConfirmationNonceRecord = {
      request_id: requestId,
      nonce_id: nonceId,
      issued_at: issuedAt,
      expires_at: entry.expires_at
    };
    this.issued.set(nonceId, record);
    this.issuedByRequest.set(requestId, nonceId);
    return this.buildNonce(entry, record);
  }

  validateNonce(input: {
    confirmNonce: string;
    tool: string;
    params: Record<string, unknown>;
  }): ConfirmationValidationResult {
    const parsed = parseConfirmNonce(input.confirmNonce, this.secret);
    if (!parsed) {
      throw new Error('confirmation_invalid');
    }
    const payload = parsed.payload;
    if (payload.v !== NONCE_VERSION) {
      throw new Error('confirmation_invalid');
    }
    if (payload.run_id !== this.runId) {
      throw new Error('confirmation_scope_mismatch');
    }

    if (this.consumed.has(payload.nonce_id)) {
      throw new Error('nonce_already_consumed');
    }
    const record = this.issued.get(payload.nonce_id);
    if (!record || record.request_id !== payload.request_id) {
      throw new Error('confirmation_invalid');
    }

    const request = this.pending.get(payload.request_id);
    if (!request) {
      throw new Error('confirmation_request_not_found');
    }
    if (!request.approved_at) {
      throw new Error('confirmation_not_approved');
    }

    const expectedDigest = buildActionParamsDigest({ tool: input.tool, params: input.params });
    if (payload.action_params_digest !== expectedDigest) {
      throw new Error('confirmation_scope_mismatch');
    }
    if (payload.action !== request.action) {
      throw new Error('confirmation_scope_mismatch');
    }

    const expiresAt = Date.parse(payload.expires_at);
    if (Number.isFinite(expiresAt) && expiresAt <= this.now().getTime()) {
      throw new Error('confirmation_expired');
    }

    this.pending.delete(payload.request_id);
    this.digestIndex.delete(request.action_params_digest);
    this.issued.delete(payload.nonce_id);
    this.issuedByRequest.delete(payload.request_id);
    this.consumed.add(payload.nonce_id);

    return { request: { ...request }, nonce_id: payload.nonce_id };
  }

  get(requestId: string): ConfirmationRequest | undefined {
    const entry = this.pending.get(requestId);
    return entry ? { ...entry } : undefined;
  }

  expire(): ConfirmationExpiry[] {
    const now = this.now().getTime();
    const expired: ConfirmationExpiry[] = [];
    for (const [requestId, entry] of this.pending.entries()) {
      const expiry = Date.parse(entry.expires_at);
      if (Number.isFinite(expiry) && expiry <= now) {
        this.pending.delete(requestId);
        this.digestIndex.delete(entry.action_params_digest);
        const nonceId = this.issuedByRequest.get(requestId) ?? null;
        if (nonceId) {
          this.issued.delete(nonceId);
          this.issuedByRequest.delete(requestId);
        }
        expired.push({ request: { ...entry }, nonce_id: nonceId });
      }
    }
    return expired;
  }

  listPending(): ConfirmationRequest[] {
    return Array.from(this.pending.values()).map((entry) => ({ ...entry }));
  }

  snapshot(): ConfirmationStoreSnapshot {
    return {
      pending: this.listPending(),
      issued: Array.from(this.issued.values()).map((entry) => ({ ...entry })),
      consumed_nonce_ids: Array.from(this.consumed.values())
    };
  }

  private buildNonce(entry: ConfirmationRequest, record?: ConfirmationNonceRecord): ConfirmationNonce {
    if (!record) {
      throw new Error('confirmation_nonce_missing');
    }
    const payload: ConfirmationNoncePayload = {
      v: NONCE_VERSION,
      run_id: this.runId,
      request_id: record.request_id,
      nonce_id: record.nonce_id,
      action: entry.action,
      action_params_digest: entry.action_params_digest,
      issued_at: record.issued_at,
      expires_at: record.expires_at
    };
    const confirmNonce = encodeConfirmNonce(payload, this.secret);

    return {
      request_id: record.request_id,
      nonce_id: record.nonce_id,
      confirm_nonce: confirmNonce,
      action_params_digest: entry.action_params_digest,
      digest_alg: 'sha256',
      issued_at: record.issued_at,
      expires_at: record.expires_at
    };
  }
}

export function buildActionParamsDigest(input: { tool: string; params: Record<string, unknown> }): string {
  const sanitized = stripConfirmNonce({ tool: input.tool, params: input.params });
  const canonicalizeFn = canonicalize as unknown as (input: unknown) => string | undefined;
  const canonical = canonicalizeFn(sanitized);
  if (typeof canonical !== 'string') {
    throw new Error('Unable to canonicalize confirmation params.');
  }
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

function encodeConfirmNonce(payload: ConfirmationNoncePayload, secret: Buffer): string {
  const serialized = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(serialized).digest('hex');
  const encoded = Buffer.from(serialized, 'utf8').toString('base64url');
  return `${encoded}.${signature}`;
}

function parseConfirmNonce(
  token: string,
  secret: Buffer
): { payload: ConfirmationNoncePayload } | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    return null;
  }
  let payload: ConfirmationNoncePayload;
  try {
    const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
    payload = JSON.parse(decoded) as ConfirmationNoncePayload;
  } catch {
    return null;
  }
  const expected = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  if (!timingSafeEqualStrings(signature, expected)) {
    return null;
  }
  return { payload };
}

function timingSafeEqualStrings(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}
