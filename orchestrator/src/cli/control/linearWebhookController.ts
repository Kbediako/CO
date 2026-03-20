import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { isoTimestamp } from '../utils/time.js';
import type { ControlState } from './controlState.js';
import { evaluateTrackerDispatchPilot } from './trackerDispatchPilot.js';
import {
  resolveLiveLinearTrackedIssueById,
  type LiveLinearTrackedIssue
} from './linearDispatchSource.js';
import type { ProviderIssueHandoffService } from './providerIssueHandoff.js';

const LINEAR_WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;
const LINEAR_ADVISORY_SEEN_DELIVERY_LIMIT = 100;

export type LinearAdvisoryDeliveryOutcome = 'accepted' | 'duplicate' | 'ignored' | 'rejected';

interface LinearAdvisoryDeliveryRecord {
  delivery_id: string;
  event: string | null;
  action: string | null;
  issue_id: string | null;
  webhook_timestamp: number | null;
  processed_at: string;
  outcome: LinearAdvisoryDeliveryOutcome;
  reason: string;
}

interface LinearAdvisoryLatestEvent {
  delivery_id: string;
  event: string | null;
  action: string | null;
  issue_id: string | null;
  webhook_timestamp: number | null;
  processed_at: string;
}

export interface LinearAdvisoryState {
  schema_version: number;
  updated_at: string;
  latest_delivery_id: string | null;
  latest_result: LinearAdvisoryDeliveryOutcome | null;
  latest_reason: string | null;
  latest_event: LinearAdvisoryLatestEvent | null;
  latest_accepted_at: string | null;
  tracked_issue: LiveLinearTrackedIssue | null;
  seen_deliveries: LinearAdvisoryDeliveryRecord[];
}

export interface LinearWebhookAuditEventInput {
  deliveryId: string;
  event: string | null;
  action: string | null;
  issueId: string | null;
  outcome: LinearAdvisoryDeliveryOutcome;
  reason: string;
}

export interface LinearWebhookControllerInput {
  req: Pick<http.IncomingMessage, 'method' | 'url' | 'headers'>;
  res: http.ServerResponse;
  linearAdvisoryState: LinearAdvisoryState;
  readRawBody: (req: http.IncomingMessage) => Promise<Buffer>;
  persistLinearAdvisory: () => Promise<void>;
  emitAuditEvent: (input: LinearWebhookAuditEventInput) => Promise<void>;
  readFeatureToggles: () => ControlState['feature_toggles'];
  publishRuntime: () => void;
  providerIssueHandoff?: ProviderIssueHandoffService | null;
  env?: NodeJS.ProcessEnv;
  now?: () => number;
}

export async function handleLinearWebhookRequest(input: LinearWebhookControllerInput): Promise<boolean> {
  const { req, res } = input;
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== '/integrations/linear/webhook') {
    return false;
  }
  const env = input.env ?? process.env;
  const now = input.now ?? Date.now;
  if (req.method !== 'POST') {
    writeLinearWebhookResponse(res, 405, 'rejected', 'method_not_allowed');
    return true;
  }

  const deliveryId = readHeaderValue(req.headers['linear-delivery']);
  if (!deliveryId) {
    writeLinearWebhookResponse(res, 400, 'rejected', 'linear_delivery_header_missing');
    return true;
  }

  const signature = readHeaderValue(req.headers['linear-signature']);
  if (!signature) {
    writeLinearWebhookResponse(res, 401, 'rejected', 'linear_signature_missing');
    return true;
  }

  const webhookSecret = env.CO_LINEAR_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    writeLinearWebhookResponse(res, 503, 'rejected', 'linear_webhook_secret_missing');
    return true;
  }

  const rawBody = await input.readRawBody(req as http.IncomingMessage);
  if (!isLinearWebhookSignatureValid(signature, rawBody, webhookSecret)) {
    writeLinearWebhookResponse(res, 401, 'rejected', 'linear_signature_invalid');
    return true;
  }

  const payload = parseJsonRecord(rawBody);
  if (!payload) {
    writeLinearWebhookResponse(res, 400, 'rejected', 'invalid_json');
    return true;
  }

  const eventName = readHeaderValue(req.headers['linear-event']) ?? readStringValue(payload, 'type') ?? null;
  const action = readStringValue(payload, 'action') ?? null;
  const issueId = readLinearWebhookIssueId(payload);
  const webhookTimestamp = resolveLinearWebhookTimestamp(payload);
  if (!webhookTimestamp) {
    await recordAndPersistLinearAdvisoryOutcome(input, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp: null,
      outcome: 'rejected',
      reason: 'linear_webhook_timestamp_invalid'
    });
    writeLinearWebhookResponse(res, 401, 'rejected', 'linear_webhook_timestamp_invalid');
    return true;
  }

  if (Math.abs(now() - webhookTimestamp) > LINEAR_WEBHOOK_MAX_AGE_MS) {
    await recordAndPersistLinearAdvisoryOutcome(input, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'rejected',
      reason: 'linear_webhook_timestamp_expired'
    });
    writeLinearWebhookResponse(res, 401, 'rejected', 'linear_webhook_timestamp_expired');
    return true;
  }

  if (hasSeenLinearDelivery(input.linearAdvisoryState, deliveryId)) {
    markLinearAdvisoryDuplicate(input.linearAdvisoryState, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp
    });
    await input.persistLinearAdvisory();
    await input.emitAuditEvent({
      deliveryId,
      event: eventName,
      action,
      issueId,
      outcome: 'duplicate',
      reason: 'linear_delivery_duplicate'
    });
    writeLinearWebhookResponse(res, 200, 'duplicate', 'linear_delivery_duplicate');
    return true;
  }

  const sourceSetup = resolveLinearWebhookSourceSetup(input.readFeatureToggles(), env);
  if ('error' in sourceSetup) {
    await recordAndPersistLinearAdvisoryOutcome(input, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'rejected',
      reason: sourceSetup.error
    });
    writeLinearWebhookResponse(res, sourceSetup.status, 'rejected', sourceSetup.error);
    return true;
  }

  if ((eventName ?? '').toLowerCase() !== 'issue' || (readStringValue(payload, 'type') ?? '').toLowerCase() !== 'issue') {
    await recordAndPersistLinearAdvisoryOutcome(input, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'ignored',
      reason: 'linear_event_unsupported'
    });
    writeLinearWebhookResponse(res, 200, 'ignored', 'linear_event_unsupported');
    return true;
  }

  if (action !== 'create' && action !== 'update') {
    await recordAndPersistLinearAdvisoryOutcome(input, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'ignored',
      reason: 'linear_action_unsupported'
    });
    writeLinearWebhookResponse(res, 200, 'ignored', 'linear_action_unsupported');
    return true;
  }

  if (!issueId) {
    await recordAndPersistLinearAdvisoryOutcome(input, {
      deliveryId,
      event: eventName,
      action,
      issueId: null,
      webhookTimestamp,
      outcome: 'rejected',
      reason: 'linear_issue_id_missing'
    });
    writeLinearWebhookResponse(res, 400, 'rejected', 'linear_issue_id_missing');
    return true;
  }

  const resolution = await resolveLiveLinearTrackedIssueById({
    issueId,
    sourceSetup: sourceSetup.sourceSetup,
    env
  });

  if (resolution.kind === 'ready') {
    await input.providerIssueHandoff?.handleAcceptedTrackedIssue({
      trackedIssue: resolution.tracked_issue,
      deliveryId,
      event: eventName,
      action,
      webhookTimestamp
    });
    await recordAndPersistLinearAdvisoryOutcome(input, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'accepted',
      reason: 'linear_delivery_accepted',
      trackedIssue: resolution.tracked_issue
    });
    writeLinearWebhookResponse(res, 200, 'accepted', 'linear_delivery_accepted');
    input.publishRuntime();
    return true;
  }

  if (shouldIgnoreLinearResolutionReason(resolution.reason)) {
    await recordAndPersistLinearAdvisoryOutcome(input, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'ignored',
      reason: resolution.reason
    });
    writeLinearWebhookResponse(res, 200, 'ignored', resolution.reason);
    return true;
  }

  await recordAndPersistLinearAdvisoryOutcome(input, {
    deliveryId,
    event: eventName,
    action,
    issueId,
    webhookTimestamp,
    outcome: 'rejected',
    reason: resolution.reason
  });
  writeLinearWebhookResponse(res, resolution.status, 'rejected', resolution.reason);
  return true;
}

export function normalizeLinearAdvisoryState(input: LinearAdvisoryState | null): LinearAdvisoryState {
  const state = input ?? {
    schema_version: 1,
    updated_at: new Date(0).toISOString(),
    latest_delivery_id: null,
    latest_result: null,
    latest_reason: null,
    latest_event: null,
    latest_accepted_at: null,
    tracked_issue: null,
    seen_deliveries: []
  };
  return {
    schema_version: 1,
    updated_at:
      typeof state.updated_at === 'string' && state.updated_at.trim().length > 0
        ? state.updated_at
        : new Date(0).toISOString(),
    latest_delivery_id: typeof state.latest_delivery_id === 'string' ? state.latest_delivery_id : null,
    latest_result:
      state.latest_result === 'accepted' ||
      state.latest_result === 'duplicate' ||
      state.latest_result === 'ignored' ||
      state.latest_result === 'rejected'
        ? state.latest_result
        : null,
    latest_reason: typeof state.latest_reason === 'string' ? state.latest_reason : null,
    latest_event: state.latest_event ?? null,
    latest_accepted_at: typeof state.latest_accepted_at === 'string' ? state.latest_accepted_at : null,
    tracked_issue: state.tracked_issue ?? null,
    seen_deliveries: Array.isArray(state.seen_deliveries)
      ? state.seen_deliveries.slice(-LINEAR_ADVISORY_SEEN_DELIVERY_LIMIT)
      : []
  };
}

async function recordAndPersistLinearAdvisoryOutcome(
  input: Pick<
    LinearWebhookControllerInput,
    'linearAdvisoryState' | 'persistLinearAdvisory' | 'emitAuditEvent'
  >,
  outcome: {
    deliveryId: string;
    event: string | null;
    action: string | null;
    issueId: string | null;
    webhookTimestamp: number | null;
    outcome: LinearAdvisoryDeliveryOutcome;
    reason: string;
    trackedIssue?: LiveLinearTrackedIssue | null;
  }
): Promise<void> {
  recordLinearAdvisoryOutcome(input.linearAdvisoryState, outcome);
  await input.persistLinearAdvisory();
  await input.emitAuditEvent({
    deliveryId: outcome.deliveryId,
    event: outcome.event,
    action: outcome.action,
    issueId: outcome.issueId,
    outcome: outcome.outcome,
    reason: outcome.reason
  });
}

function writeLinearWebhookResponse(
  res: http.ServerResponse,
  status: number,
  outcome: LinearAdvisoryDeliveryOutcome,
  reason: string
): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: outcome, reason, timestamp: isoTimestamp() }));
}

export function resolveLinearWebhookSourceSetup(
  featureToggles: ControlState['feature_toggles'],
  env: NodeJS.ProcessEnv
):
  | { sourceSetup: { provider: 'linear'; workspace_id: string | null; team_id: string | null; project_id: string | null } }
  | { status: number; error: string } {
  const evaluation = evaluateTrackerDispatchPilot({
    featureToggles,
    defaultIssueIdentifier: null,
    env
  });
  if (!evaluation.summary.configured) {
    return { status: 503, error: 'dispatch_source_unavailable' };
  }
  if (!evaluation.summary.enabled) {
    return { status: 409, error: 'dispatch_source_disabled' };
  }
  if (evaluation.summary.kill_switch) {
    return { status: 409, error: 'dispatch_source_kill_switched' };
  }
  if (!evaluation.summary.source_setup || evaluation.summary.source_setup.provider !== 'linear') {
    return { status: 422, error: 'dispatch_source_binding_missing' };
  }
  return { sourceSetup: evaluation.summary.source_setup };
}

function shouldIgnoreLinearResolutionReason(reason: string): boolean {
  return (
    reason === 'dispatch_source_issue_not_found' ||
    reason === 'dispatch_source_workspace_mismatch' ||
    reason === 'dispatch_source_team_mismatch' ||
    reason === 'dispatch_source_project_mismatch'
  );
}

function readLinearWebhookIssueId(payload: Record<string, unknown>): string | null {
  const data = readRecordValue(payload, 'data');
  if (!data) {
    return null;
  }
  return readStringValue(data, 'id') ?? null;
}

function resolveLinearWebhookTimestamp(payload: Record<string, unknown>): number | null {
  const raw = payload.webhookTimestamp;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function parseJsonRecord(payload: Buffer): Record<string, unknown> | null {
  if (payload.length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(payload.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isLinearWebhookSignatureValid(signature: string, payload: Buffer, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return safeTokenCompare(signature, expected);
}

function hasSeenLinearDelivery(state: LinearAdvisoryState, deliveryId: string): boolean {
  return state.seen_deliveries.some((entry) => entry.delivery_id === deliveryId);
}

function markLinearAdvisoryDuplicate(
  state: LinearAdvisoryState,
  input: {
    deliveryId: string;
    event: string | null;
    action: string | null;
    issueId: string | null;
    webhookTimestamp: number | null;
  }
): void {
  state.updated_at = isoTimestamp();
  state.latest_result = 'duplicate';
  state.latest_reason = 'linear_delivery_duplicate';
  state.latest_event = {
    delivery_id: input.deliveryId,
    event: input.event,
    action: input.action,
    issue_id: input.issueId,
    webhook_timestamp: input.webhookTimestamp,
    processed_at: state.updated_at
  };
}

function recordLinearAdvisoryOutcome(
  state: LinearAdvisoryState,
  input: {
    deliveryId: string;
    event: string | null;
    action: string | null;
    issueId: string | null;
    webhookTimestamp: number | null;
    outcome: LinearAdvisoryDeliveryOutcome;
    reason: string;
    trackedIssue?: LiveLinearTrackedIssue | null;
  }
): void {
  const processedAt = isoTimestamp();
  state.updated_at = processedAt;
  state.latest_result = input.outcome;
  state.latest_reason = input.reason;
  state.latest_event = {
    delivery_id: input.deliveryId,
    event: input.event,
    action: input.action,
    issue_id: input.issueId,
    webhook_timestamp: input.webhookTimestamp,
    processed_at: processedAt
  };
  state.latest_delivery_id = input.deliveryId;
  state.seen_deliveries = [
    ...state.seen_deliveries.filter((entry) => entry.delivery_id !== input.deliveryId),
    {
      delivery_id: input.deliveryId,
      event: input.event,
      action: input.action,
      issue_id: input.issueId,
      webhook_timestamp: input.webhookTimestamp,
      processed_at: processedAt,
      outcome: input.outcome,
      reason: input.reason
    }
  ].slice(-LINEAR_ADVISORY_SEEN_DELIVERY_LIMIT);
  if (input.outcome === 'accepted' && input.trackedIssue) {
    state.latest_accepted_at = processedAt;
    state.tracked_issue = input.trackedIssue;
  }
}

function safeTokenCompare(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
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

function readRecordValue(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function readHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    const values: string[] = [];
    for (const entry of value) {
      if (typeof entry !== 'string') {
        continue;
      }
      const parts = entry.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          values.push(trimmed);
        }
      }
    }
    return readUniqueHeaderValue(values);
  }
  if (typeof value === 'string') {
    const values = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return readUniqueHeaderValue(values);
  }
  return null;
}

function readUniqueHeaderValue(values: string[]): string | null {
  if (values.length === 0) {
    return null;
  }
  const unique = new Set(values);
  if (unique.size > 1) {
    return null;
  }
  return values[0];
}
