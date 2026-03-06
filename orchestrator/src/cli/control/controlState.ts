import { createHash } from 'node:crypto';

const TRANSPORT_STATE_MAX_ENTRIES = 512;

export type ControlTransport = 'discord' | 'telegram';

export interface ControlAction {
  request_id?: string | null;
  intent_id?: string | null;
  requested_by: string;
  requested_at: string;
  action: 'pause' | 'resume' | 'cancel' | 'fail';
  reason?: string | null;
  transport?: ControlTransport | null;
  actor_id?: string | null;
  actor_source?: string | null;
  transport_principal?: string | null;
}

export interface TransportNonceEntry {
  nonce_sha256: string;
  action: ControlAction['action'];
  transport: ControlTransport;
  request_id: string | null;
  intent_id: string | null;
  consumed_at: string;
  expires_at: string;
}

export interface TransportIdempotencyEntry {
  key_type: 'request' | 'intent';
  key: string;
  action: ControlAction['action'];
  transport: ControlTransport;
  request_id: string | null;
  intent_id: string | null;
  actor_id: string | null;
  actor_source: string | null;
  transport_principal: string | null;
  control_seq: number;
  recorded_at: string;
  expires_at: string;
}

export interface TransportMutationState {
  consumed_nonces: TransportNonceEntry[];
  idempotency_index: TransportIdempotencyEntry[];
}

export interface TransportActionContext {
  transport: ControlTransport;
  actorId: string;
  actorSource: string;
  principal: string;
  idempotencyWindowMs: number;
}

export interface ControlState {
  run_id: string;
  control_seq: number;
  latest_action?: ControlAction | null;
  feature_toggles?: Record<string, unknown> | null;
  transport_mutation?: TransportMutationState | null;
}

export interface ControlStateStoreOptions {
  runId: string;
  controlSeq?: number;
  latestAction?: ControlAction | null;
  featureToggles?: Record<string, unknown> | null;
  transportMutation?: TransportMutationState | null;
  now?: () => string;
}

export class ControlStateStore {
  private readonly now: () => string;
  private state: ControlState;

  constructor(options: ControlStateStoreOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.state = {
      run_id: options.runId,
      control_seq: options.controlSeq ?? 0,
      latest_action: options.latestAction ?? null,
      feature_toggles: options.featureToggles ?? null,
      transport_mutation: normalizeTransportMutationState(options.transportMutation)
    };
  }

  updateAction(input: {
    action: ControlAction['action'];
    requestedBy: string;
    requestId?: string | null;
    intentId?: string | null;
    reason?: string | null;
    transportContext?: TransportActionContext;
  }): {
    snapshot: ControlState;
    idempotentReplay: boolean;
    replayEntry?: TransportIdempotencyEntry | null;
  } {
    this.pruneTransportState();
    const latest = this.state.latest_action ?? null;
    const normalizedRequestId = input.requestId ?? null;
    const normalizedIntentId = input.intentId ?? null;
    if (input.transportContext) {
      const replayEntry = this.findTransportIdempotencyReplay({
        action: input.action,
        transport: input.transportContext.transport,
        requestId: normalizedRequestId,
        intentId: normalizedIntentId
      });
      if (replayEntry) {
        return {
          snapshot: this.snapshot(),
          idempotentReplay: true,
          replayEntry
        };
      }
    }
    const requestReplay =
      !input.transportContext &&
      !!normalizedRequestId &&
      latest?.action === input.action &&
      latest.request_id === normalizedRequestId;
    const intentReplay =
      !input.transportContext &&
      !!normalizedIntentId &&
      latest?.action === input.action &&
      latest.intent_id === normalizedIntentId;
    if (requestReplay || intentReplay) {
      return { snapshot: this.snapshot(), idempotentReplay: true, replayEntry: null };
    }
    this.state.control_seq += 1;
    this.state.latest_action = {
      request_id: input.requestId ?? null,
      intent_id: input.intentId ?? null,
      requested_by: input.requestedBy,
      requested_at: this.now(),
      action: input.action,
      reason: input.reason ?? null,
      transport: input.transportContext?.transport ?? null,
      actor_id: input.transportContext?.actorId ?? null,
      actor_source: input.transportContext?.actorSource ?? null,
      transport_principal: input.transportContext?.principal ?? null
    };
    if (input.transportContext) {
      this.recordTransportIdempotency({
        action: input.action,
        requestId: normalizedRequestId,
        intentId: normalizedIntentId,
        transport: input.transportContext.transport,
        actorId: input.transportContext.actorId,
        actorSource: input.transportContext.actorSource,
        principal: input.transportContext.principal,
        controlSeq: this.state.control_seq,
        windowMs: input.transportContext.idempotencyWindowMs
      });
    }
    return { snapshot: this.snapshot(), idempotentReplay: false, replayEntry: null };
  }

  isTransportNonceConsumed(nonce: string): boolean {
    this.pruneTransportState();
    const digest = hashTransportNonce(nonce);
    return (
      this.state.transport_mutation?.consumed_nonces.some((entry) => entry.nonce_sha256 === digest) ?? false
    );
  }

  consumeTransportNonce(input: {
    nonce: string;
    action: ControlAction['action'];
    transport: ControlTransport;
    requestId?: string | null;
    intentId?: string | null;
    expiresAt: string;
  }): void {
    this.pruneTransportState();
    const state = this.ensureTransportMutationState();
    const digest = hashTransportNonce(input.nonce);
    if (state.consumed_nonces.some((entry) => entry.nonce_sha256 === digest)) {
      return;
    }
    state.consumed_nonces.push({
      nonce_sha256: digest,
      action: input.action,
      transport: input.transport,
      request_id: input.requestId ?? null,
      intent_id: input.intentId ?? null,
      consumed_at: this.now(),
      expires_at: input.expiresAt
    });
    state.consumed_nonces = trimExpiredOverflowEntries(
      state.consumed_nonces,
      TRANSPORT_STATE_MAX_ENTRIES,
      this.resolveNowMs()
    );
  }

  rollbackTransportNonce(nonce: string): void {
    this.pruneTransportState();
    const state = this.state.transport_mutation;
    if (!state) {
      return;
    }
    const digest = hashTransportNonce(nonce);
    state.consumed_nonces = state.consumed_nonces.filter((entry) => entry.nonce_sha256 !== digest);
    if (state.consumed_nonces.length === 0 && state.idempotency_index.length === 0) {
      this.state.transport_mutation = null;
    }
  }

  updateFeatureToggles(toggles: Record<string, unknown>): void {
    const current = this.state.feature_toggles ?? {};
    this.state.feature_toggles = mergeObjects(current, toggles);
  }

  snapshot(): ControlState {
    return structuredClone(this.state);
  }

  setLatestAction(input: {
    action: ControlAction['action'];
    requestedBy: string;
    requestId?: string | null;
    intentId?: string | null;
    reason?: string | null;
  }): void {
    this.state.latest_action = {
      request_id: input.requestId ?? null,
      intent_id: input.intentId ?? null,
      requested_by: input.requestedBy,
      requested_at: this.now(),
      action: input.action,
      reason: input.reason ?? null
    };
  }

  private ensureTransportMutationState(): TransportMutationState {
    if (!this.state.transport_mutation) {
      this.state.transport_mutation = {
        consumed_nonces: [],
        idempotency_index: []
      };
    }
    return this.state.transport_mutation;
  }

  private pruneTransportState(nowMsInput?: number): void {
    const state = this.state.transport_mutation;
    if (!state) {
      return;
    }
    const nowMs = this.resolveNowMs(nowMsInput);
    state.consumed_nonces = state.consumed_nonces.filter((entry) => {
      const expiresAt = Date.parse(entry.expires_at);
      return Number.isFinite(expiresAt) && expiresAt > nowMs;
    });
    state.idempotency_index = state.idempotency_index.filter((entry) => {
      const expiresAt = Date.parse(entry.expires_at);
      return Number.isFinite(expiresAt) && expiresAt > nowMs;
    });
  }

  private findTransportIdempotencyReplay(input: {
    action: ControlAction['action'];
    transport: ControlTransport;
    requestId: string | null;
    intentId: string | null;
  }): TransportIdempotencyEntry | null {
    const index = this.state.transport_mutation?.idempotency_index ?? [];
    for (const entry of index) {
      if (entry.action !== input.action || entry.transport !== input.transport) {
        continue;
      }
      if (entry.key_type === 'request' && input.requestId && entry.key === input.requestId) {
        return { ...entry };
      }
      if (entry.key_type === 'intent' && input.intentId && entry.key === input.intentId) {
        return { ...entry };
      }
    }
    return null;
  }

  private recordTransportIdempotency(input: {
    action: ControlAction['action'];
    requestId: string | null;
    intentId: string | null;
    transport: ControlTransport;
    actorId: string;
    actorSource: string;
    principal: string;
    controlSeq: number;
    windowMs: number;
  }): void {
    const state = this.ensureTransportMutationState();
    const recordedAt = this.now();
    const nowMs = Date.parse(recordedAt);
    const effectiveNowMs = Number.isFinite(nowMs) ? nowMs : Date.now();
    const expiresAt = new Date(effectiveNowMs + Math.max(1, input.windowMs)).toISOString();
    if (input.requestId) {
      state.idempotency_index = state.idempotency_index.filter(
        (entry) => !(entry.key_type === 'request' && entry.key === input.requestId)
      );
      state.idempotency_index.push({
        key_type: 'request',
        key: input.requestId,
        action: input.action,
        transport: input.transport,
        request_id: input.requestId,
        intent_id: input.intentId,
        actor_id: input.actorId,
        actor_source: input.actorSource,
        transport_principal: input.principal,
        control_seq: input.controlSeq,
        recorded_at: recordedAt,
        expires_at: expiresAt
      });
    }
    if (input.intentId) {
      state.idempotency_index = state.idempotency_index.filter(
        (entry) => !(entry.key_type === 'intent' && entry.key === input.intentId)
      );
      state.idempotency_index.push({
        key_type: 'intent',
        key: input.intentId,
        action: input.action,
        transport: input.transport,
        request_id: input.requestId,
        intent_id: input.intentId,
        actor_id: input.actorId,
        actor_source: input.actorSource,
        transport_principal: input.principal,
        control_seq: input.controlSeq,
        recorded_at: recordedAt,
        expires_at: expiresAt
      });
    }
    state.idempotency_index = trimExpiredOverflowEntries(
      state.idempotency_index,
      TRANSPORT_STATE_MAX_ENTRIES,
      effectiveNowMs
    );
  }

  private resolveNowMs(nowMsInput?: number): number {
    if (Number.isFinite(nowMsInput) && typeof nowMsInput === 'number') {
      return nowMsInput;
    }
    const fallbackNow = Date.parse(this.now());
    return Number.isFinite(fallbackNow) ? fallbackNow : Date.now();
  }
}

function mergeObjects(base: Record<string, unknown>, update: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(update)) {
    if (Array.isArray(value)) {
      merged[key] = [...value];
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const current = (merged[key] as Record<string, unknown>) ?? {};
      merged[key] = mergeObjects(current, value as Record<string, unknown>);
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

function normalizeTransportMutationState(input: TransportMutationState | null | undefined): TransportMutationState | null {
  if (!input) {
    return null;
  }
  const consumed = Array.isArray(input.consumed_nonces)
    ? input.consumed_nonces
        .filter((entry): entry is TransportNonceEntry => Boolean(entry && typeof entry === 'object'))
        .map((entry) => ({ ...entry }))
    : [];
  const index = Array.isArray(input.idempotency_index)
    ? input.idempotency_index
        .filter((entry): entry is TransportIdempotencyEntry => Boolean(entry && typeof entry === 'object'))
        .map((entry) => ({ ...entry }))
    : [];
  if (consumed.length === 0 && index.length === 0) {
    return null;
  }
  return {
    consumed_nonces: consumed,
    idempotency_index: index
  };
}

function hashTransportNonce(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function trimExpiredOverflowEntries<T extends { expires_at: string }>(
  entries: T[],
  maxEntries: number,
  nowMs: number
): T[] {
  if (entries.length <= maxEntries) {
    return entries;
  }
  let overflow = entries.length - maxEntries;
  const trimmed = entries.filter((entry) => {
    if (overflow <= 0) {
      return true;
    }
    const expiresAt = Date.parse(entry.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) {
      overflow -= 1;
      return false;
    }
    return true;
  });
  if (trimmed.length <= maxEntries) {
    return trimmed;
  }
  return trimmed.slice(trimmed.length - maxEntries);
}
