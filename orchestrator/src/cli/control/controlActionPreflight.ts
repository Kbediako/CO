import { isoTimestamp } from '../utils/time.js';
import type { ControlAction, ControlState, ControlTransport } from './controlState.js';

const TRANSPORT_MUTATING_ACTIONS = new Set<ControlAction['action']>(['pause', 'resume', 'cancel']);
const TRANSPORT_IDENTITY_PATTERN = /^[A-Za-z0-9._:@-]{1,128}$/;
const TRANSPORT_SOURCE_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
const TRANSPORT_PRINCIPAL_PATTERN = /^[A-Za-z0-9._:@/=-]{1,256}$/;
const TRANSPORT_NONCE_PATTERN = /^[A-Za-z0-9._~:/+=-]{8,256}$/;
const TRANSPORT_METADATA_KEYS = [
  'actor_id',
  'actorId',
  'actor_source',
  'actorSource',
  'transport_principal',
  'transportPrincipal',
  'principal',
  'transport_nonce',
  'transportNonce',
  'transport_nonce_expires_at',
  'transportNonceExpiresAt',
  'nonce',
  'nonce_expires_at',
  'nonceExpiresAt'
] as const;
const DEFAULT_TRANSPORT_IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_TRANSPORT_NONCE_MAX_TTL_MS = 10 * 60 * 1000;
const MAX_TRANSPORT_POLICY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ControlActionAuthKind = 'control' | 'session';

export interface TransportMutatingPolicy {
  enabled: boolean;
  idempotencyWindowMs: number;
  nonceMaxTtlMs: number;
  allowedTransports: ReadonlySet<ControlTransport> | null;
}

export interface TransportMutationRequest {
  transport: ControlTransport;
  actorId: string;
  actorSource: string;
  principal: string;
  nonce: string;
  nonceExpiresAt: string;
  nonceExpiresAtMs: number;
}

export interface TransportMutationResolveResult {
  request: TransportMutationRequest | null;
  status?: number;
  error?: string;
  partial?: {
    transport: ControlTransport | null;
    actorId?: string | null;
    actorSource?: string | null;
    principal?: string | null;
  };
}

export interface NormalizedControlActionRequest {
  action: ControlAction['action'];
  requestId: string | null;
  intentId: string | null;
  requestedBy: string;
  reason: string | undefined;
  confirmNonce: string | undefined;
  deferTransportResolutionToConfirmation: boolean;
  transportMutation: TransportMutationRequest | null;
}

export type ControlActionNormalizationResult =
  | {
      ok: true;
      value: NormalizedControlActionRequest;
    }
  | {
      ok: false;
      status: number;
      error: string;
      traceability?: Record<string, unknown>;
    };

export type TransportMutationPreflightResult =
  | {
      ok: true;
      idempotencyWindowMs: number | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
      traceability: Record<string, unknown>;
    };

export function normalizeControlActionRequest(input: {
  body: Record<string, unknown>;
  authKind: ControlActionAuthKind;
  snapshot: ControlState;
  taskId: string | null;
  manifestPath: string;
}): ControlActionNormalizationResult {
  const action = readStringValue(input.body, 'action');
  if (!isControlAction(action)) {
    return { ok: false, status: 400, error: 'invalid_action' };
  }
  if (input.authKind === 'session' && action !== 'pause' && action !== 'resume') {
    return { ok: false, status: 403, error: 'ui_action_disallowed' };
  }
  if (input.authKind === 'session' && hasCoordinatorMetadata(input.body)) {
    return { ok: false, status: 403, error: 'ui_control_metadata_disallowed' };
  }

  const requestId = readStringValue(input.body, 'request_id', 'requestId') ?? null;
  const intentId = readStringValue(input.body, 'intent_id', 'intentId') ?? null;
  const requestedBy = readStringValue(input.body, 'requested_by', 'requestedBy') ?? 'ui';
  const reason = readStringValue(input.body, 'reason');
  const confirmNonce =
    action === 'cancel' ? readStringValue(input.body, 'confirm_nonce', 'confirmNonce') : undefined;
  const deferTransportResolutionToConfirmation =
    action === 'cancel' && Boolean(confirmNonce) && !hasAnyOwnProperty(input.body, ['transport']);
  const transportMutationResult: TransportMutationResolveResult = deferTransportResolutionToConfirmation
    ? { request: null }
    : resolveTransportMutationRequest(input.body, action);
  if (transportMutationResult.error) {
    return {
      ok: false,
      status: transportMutationResult.status ?? 400,
      error: transportMutationResult.error,
      traceability: buildCanonicalTraceability({
        action,
        decision: 'rejected',
        requestId,
        intentId,
        taskId: input.taskId,
        runId: input.snapshot.run_id,
        manifestPath: input.manifestPath,
        transport: transportMutationResult.partial?.transport ?? null,
        actorId: transportMutationResult.partial?.actorId ?? null,
        actorSource: transportMutationResult.partial?.actorSource ?? null,
        principal: transportMutationResult.partial?.principal ?? null
      })
    };
  }

  return {
    ok: true,
    value: {
      action,
      requestId,
      intentId,
      requestedBy,
      reason,
      confirmNonce,
      deferTransportResolutionToConfirmation,
      transportMutation: transportMutationResult.request
    }
  };
}

export function validateTransportMutationPreflight(input: {
  action: ControlAction['action'];
  requestId: string | null;
  intentId: string | null;
  taskId: string | null;
  snapshot: ControlState;
  manifestPath: string;
  transportMutation: TransportMutationRequest | null;
  isTransportNonceConsumed(nonce: string): boolean;
}): TransportMutationPreflightResult {
  if (!input.transportMutation) {
    return { ok: true, idempotencyWindowMs: null };
  }

  const transportPolicy = resolveTransportMutatingPolicy(input.snapshot.feature_toggles);
  const traceability = buildCanonicalTraceability({
    action: input.action,
    decision: 'rejected',
    requestId: input.requestId,
    intentId: input.intentId,
    taskId: input.taskId,
    runId: input.snapshot.run_id,
    manifestPath: input.manifestPath,
    transport: input.transportMutation.transport,
    actorId: input.transportMutation.actorId,
    actorSource: input.transportMutation.actorSource,
    principal: input.transportMutation.principal
  });

  if (!transportPolicy.enabled) {
    return {
      ok: false,
      status: 403,
      error: 'transport_mutating_controls_disabled',
      traceability
    };
  }
  if (
    transportPolicy.allowedTransports &&
    !transportPolicy.allowedTransports.has(input.transportMutation.transport)
  ) {
    return {
      ok: false,
      status: 403,
      error: 'transport_mutating_transport_not_allowed',
      traceability
    };
  }
  if (!input.requestId && !input.intentId) {
    return {
      ok: false,
      status: 400,
      error: 'transport_idempotency_key_missing',
      traceability
    };
  }
  const nowMs = Date.now();
  if (input.transportMutation.nonceExpiresAtMs <= nowMs) {
    return {
      ok: false,
      status: 409,
      error: 'transport_nonce_expired',
      traceability
    };
  }
  if (input.transportMutation.nonceExpiresAtMs - nowMs > transportPolicy.nonceMaxTtlMs) {
    return {
      ok: false,
      status: 400,
      error: 'transport_nonce_expiry_out_of_range',
      traceability
    };
  }
  if (input.isTransportNonceConsumed(input.transportMutation.nonce)) {
    return {
      ok: false,
      status: 409,
      error: 'transport_nonce_replayed',
      traceability
    };
  }
  return {
    ok: true,
    idempotencyWindowMs: transportPolicy.idempotencyWindowMs
  };
}

export function resolveTransportMutationRequestFromConfirmationScope(input: {
  body: Record<string, unknown>;
  params: Record<string, unknown>;
  action: ControlAction['action'];
}): TransportMutationResolveResult {
  const hasBodyTransportField = hasAnyOwnProperty(input.body, ['transport']);
  const hasBodyTransportMetadata = hasAnyOwnProperty(input.body, TRANSPORT_METADATA_KEYS);
  const hasConfirmedTransportField = hasAnyOwnProperty(input.params, ['transport']);
  const hasConfirmedTransportMetadata = hasAnyOwnProperty(input.params, TRANSPORT_METADATA_KEYS);
  const confirmedTransportRaw = readStringValue(input.params, 'transport');
  const confirmedTransport = parseTransport(confirmedTransportRaw);
  if (!confirmedTransport) {
    if (
      hasConfirmedTransportField ||
      hasConfirmedTransportMetadata ||
      hasBodyTransportField ||
      hasBodyTransportMetadata
    ) {
      return {
        request: null,
        status: 409,
        error: 'confirmation_scope_mismatch',
        partial: { transport: null }
      };
    }
    return { request: null };
  }

  const confirmedActorId = readStringValue(input.params, 'actor_id', 'actorId');
  const confirmedActorSource = readStringValue(input.params, 'actor_source', 'actorSource');
  const confirmedPrincipal = readStringValue(
    input.params,
    'transport_principal',
    'transportPrincipal',
    'principal'
  );
  const topLevelTransport = readStringValue(input.body, 'transport');
  const topLevelActorId = readStringValue(input.body, 'actor_id', 'actorId');
  const topLevelActorSource = readStringValue(input.body, 'actor_source', 'actorSource');
  const topLevelPrincipal = readStringValue(
    input.body,
    'transport_principal',
    'transportPrincipal',
    'principal'
  );
  const hasTopLevelActorId = hasAnyOwnProperty(input.body, ['actor_id', 'actorId']);
  const hasTopLevelActorSource = hasAnyOwnProperty(input.body, ['actor_source', 'actorSource']);
  const hasTopLevelPrincipal = hasAnyOwnProperty(input.body, [
    'transport_principal',
    'transportPrincipal',
    'principal'
  ]);
  if (
    (hasBodyTransportField && topLevelTransport !== confirmedTransport) ||
    (hasTopLevelActorId && topLevelActorId !== confirmedActorId) ||
    (hasTopLevelActorSource && topLevelActorSource !== confirmedActorSource) ||
    (hasTopLevelPrincipal && topLevelPrincipal !== confirmedPrincipal)
  ) {
    return {
      request: null,
      status: 409,
      error: 'confirmation_scope_mismatch',
      partial: {
        transport: confirmedTransport,
        actorId: confirmedActorId ?? null,
        actorSource: confirmedActorSource ?? null,
        principal: confirmedPrincipal ?? null
      }
    };
  }

  return resolveTransportMutationRequest(
    {
      ...input.body,
      transport: confirmedTransport,
      actor_id: confirmedActorId,
      actor_source: confirmedActorSource,
      transport_principal: confirmedPrincipal
    },
    input.action
  );
}

export function resolveTransportMutationRequest(
  body: Record<string, unknown>,
  action: ControlAction['action']
): TransportMutationResolveResult {
  const mutatingAction = TRANSPORT_MUTATING_ACTIONS.has(action);
  const hasTransportField = Object.prototype.hasOwnProperty.call(body, 'transport');
  const hasTransportMetadata = TRANSPORT_METADATA_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(body, key)
  );
  if (mutatingAction && hasTransportMetadata && !hasTransportField) {
    return { request: null, status: 400, error: 'transport_invalid', partial: { transport: null } };
  }
  const rawTransport = body.transport;
  const normalizedTransport = typeof rawTransport === 'string' ? rawTransport.trim() : undefined;
  if (hasTransportField && mutatingAction && !normalizedTransport) {
    return { request: null, status: 400, error: 'transport_invalid', partial: { transport: null } };
  }
  const transport = parseTransport(normalizedTransport);
  if (normalizedTransport && !transport) {
    return { request: null, status: 400, error: 'transport_unsupported', partial: { transport: null } };
  }
  if (!transport || !mutatingAction) {
    return { request: null };
  }

  const actorId = readStringValue(body, 'actor_id', 'actorId');
  if (!actorId) {
    return { request: null, status: 400, error: 'transport_actor_id_missing', partial: { transport } };
  }
  if (!TRANSPORT_IDENTITY_PATTERN.test(actorId)) {
    return {
      request: null,
      status: 400,
      error: 'transport_actor_id_invalid',
      partial: { transport, actorId }
    };
  }

  const actorSource = readStringValue(body, 'actor_source', 'actorSource');
  if (!actorSource) {
    return {
      request: null,
      status: 400,
      error: 'transport_actor_source_missing',
      partial: { transport, actorId }
    };
  }
  if (!TRANSPORT_SOURCE_PATTERN.test(actorSource)) {
    return {
      request: null,
      status: 400,
      error: 'transport_actor_source_invalid',
      partial: { transport, actorId, actorSource }
    };
  }
  if (!actorSource.toLowerCase().startsWith(transport)) {
    return {
      request: null,
      status: 400,
      error: 'transport_actor_source_mismatch',
      partial: { transport, actorId, actorSource }
    };
  }

  const principal = readStringValue(body, 'transport_principal', 'transportPrincipal', 'principal');
  if (!principal) {
    return {
      request: null,
      status: 400,
      error: 'transport_principal_missing',
      partial: { transport, actorId, actorSource }
    };
  }
  if (!TRANSPORT_PRINCIPAL_PATTERN.test(principal)) {
    return {
      request: null,
      status: 400,
      error: 'transport_principal_invalid',
      partial: { transport, actorId, actorSource, principal }
    };
  }

  const nonce = readStringValue(body, 'transport_nonce', 'transportNonce', 'nonce');
  if (!nonce) {
    return {
      request: null,
      status: 400,
      error: 'transport_nonce_missing',
      partial: { transport, actorId, actorSource, principal }
    };
  }
  if (!TRANSPORT_NONCE_PATTERN.test(nonce)) {
    return {
      request: null,
      status: 400,
      error: 'transport_nonce_invalid',
      partial: { transport, actorId, actorSource, principal }
    };
  }

  const rawExpiry = readStringValue(
    body,
    'transport_nonce_expires_at',
    'transportNonceExpiresAt',
    'nonce_expires_at',
    'nonceExpiresAt'
  );
  if (!rawExpiry) {
    return {
      request: null,
      status: 400,
      error: 'transport_nonce_expiry_missing',
      partial: { transport, actorId, actorSource, principal }
    };
  }
  const nonceExpiresAtMs = Date.parse(rawExpiry);
  if (!Number.isFinite(nonceExpiresAtMs)) {
    return {
      request: null,
      status: 400,
      error: 'transport_nonce_expiry_invalid',
      partial: { transport, actorId, actorSource, principal }
    };
  }

  return {
    request: {
      transport,
      actorId,
      actorSource,
      principal,
      nonce,
      nonceExpiresAt: new Date(nonceExpiresAtMs).toISOString(),
      nonceExpiresAtMs
    }
  };
}

export function buildCanonicalTraceability(input: {
  action: ControlAction['action'];
  decision: 'applied' | 'replayed' | 'rejected';
  requestId: string | null;
  intentId: string | null;
  taskId: string | null;
  runId: string | null;
  manifestPath: string;
  transport: ControlTransport | null;
  actorId: string | null;
  actorSource: string | null;
  principal: string | null;
  timestamp?: string;
}): Record<string, unknown> {
  const timestamp = input.timestamp ?? isoTimestamp();
  return {
    actor_id: input.actorId,
    actor_source: input.actorSource,
    transport: input.transport,
    transport_principal: input.principal,
    intent_id: input.intentId,
    request_id: input.requestId,
    task_id: input.taskId,
    run_id: input.runId,
    manifest_path: input.manifestPath,
    action: input.action,
    decision: input.decision,
    timestamp
  };
}

function isControlAction(action: unknown): action is ControlAction['action'] {
  return action === 'pause' || action === 'resume' || action === 'cancel' || action === 'fail';
}

function parseTransport(value: string | undefined): ControlTransport | null {
  if (!value) {
    return null;
  }
  if (value === 'discord' || value === 'telegram') {
    return value;
  }
  return null;
}

function resolveTransportMutatingPolicy(
  featureToggles: Record<string, unknown> | null | undefined
): TransportMutatingPolicy {
  const toggles = featureToggles ?? {};
  const direct = readRecordValue(toggles, 'transport_mutating_controls');
  const coordinator = readRecordValue(toggles, 'coordinator');
  const nested = coordinator ? readRecordValue(coordinator, 'transport_mutating_controls') : undefined;
  const policy = nested ?? direct ?? {};
  const allowedTransportValues = readStringArrayValue(policy, 'allowed_transports', 'allowedTransports');
  return {
    enabled: readBooleanValue(policy, 'enabled') ?? false,
    idempotencyWindowMs: clampPolicyWindow(
      readNumberValue(policy, 'idempotency_window_ms', 'idempotencyWindowMs'),
      DEFAULT_TRANSPORT_IDEMPOTENCY_WINDOW_MS
    ),
    nonceMaxTtlMs: clampPolicyWindow(
      readNumberValue(policy, 'nonce_max_ttl_ms', 'nonceMaxTtlMs'),
      DEFAULT_TRANSPORT_NONCE_MAX_TTL_MS
    ),
    allowedTransports: resolveAllowedTransportPolicy(allowedTransportValues)
  };
}

function resolveAllowedTransportPolicy(values: string[] | undefined): ReadonlySet<ControlTransport> | null {
  if (!values) {
    return null;
  }
  const allowed = new Set<ControlTransport>();
  for (const value of values) {
    const transport = parseTransport(value);
    if (transport) {
      allowed.add(transport);
    }
  }
  return allowed;
}

function clampPolicyWindow(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(value), 1), MAX_TRANSPORT_POLICY_WINDOW_MS);
}

function hasCoordinatorMetadata(body: Record<string, unknown>): boolean {
  const disallowedKeys = [
    'intent_id',
    'intentId',
    'request_id',
    'requestId',
    'task_id',
    'taskId',
    'run_id',
    'runId',
    'manifest_path',
    'manifestPath'
  ];
  return disallowedKeys.some((key) => Object.prototype.hasOwnProperty.call(body, key));
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function hasAnyOwnProperty(record: Record<string, unknown>, keys: readonly string[]): boolean {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return true;
    }
  }
  return false;
}

function readNumberValue(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function readBooleanValue(record: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

function readRecordValue(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function readStringArrayValue(record: Record<string, unknown>, ...keys: string[]): string[] | undefined {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) {
      continue;
    }
    const parsed: string[] = [];
    for (const item of value) {
      if (typeof item !== 'string') {
        continue;
      }
      const trimmed = item.trim();
      if (trimmed.length > 0) {
        parsed.push(trimmed);
      }
    }
    return parsed;
  }
  return undefined;
}
