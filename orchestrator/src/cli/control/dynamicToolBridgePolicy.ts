export type DynamicToolBridgeAction = 'status' | 'pause' | 'resume' | 'cancel';

export type DynamicToolBridgePolicyErrorCode =
  | 'dynamic_tool_bridge_disabled'
  | 'dynamic_tool_bridge_kill_switched'
  | 'dynamic_tool_bridge_source_missing'
  | 'dynamic_tool_bridge_source_invalid'
  | 'dynamic_tool_bridge_source_not_allowed'
  | 'dynamic_tool_bridge_action_not_allowed';

export interface DynamicToolBridgePolicy {
  configured: boolean;
  enabled: boolean;
  killSwitch: boolean;
  allowedActions: ReadonlySet<DynamicToolBridgeAction>;
  allowedSourceIds: ReadonlySet<string>;
}

export interface DynamicToolBridgeEvaluation {
  ok: boolean;
  error?: DynamicToolBridgePolicyErrorCode;
  policy: DynamicToolBridgePolicy;
  sourceId?: string;
}

const ALL_DYNAMIC_TOOL_BRIDGE_ACTIONS: ReadonlySet<DynamicToolBridgeAction> = new Set([
  'status',
  'pause',
  'resume',
  'cancel'
]);
const DEFAULT_ALLOWED_SOURCE_IDS: ReadonlySet<string> = new Set(['appserver_dynamic_tool']);
const SOURCE_ID_KEYS = ['id', 'source_id', 'sourceId', 'bridge_source', 'bridgeSource'] as const;
const FLAT_SOURCE_KEYS = ['bridge_source', 'bridgeSource', 'source_id', 'sourceId'] as const;

export function evaluateDynamicToolBridgeRequest(input: {
  featureToggles: Record<string, unknown> | null | undefined;
  action: DynamicToolBridgeAction;
  args: Record<string, unknown>;
}): DynamicToolBridgeEvaluation {
  const policy = resolveDynamicToolBridgePolicy(input.featureToggles ?? null);
  if (!policy.enabled) {
    return { ok: false, error: 'dynamic_tool_bridge_disabled', policy };
  }
  if (policy.killSwitch) {
    return { ok: false, error: 'dynamic_tool_bridge_kill_switched', policy };
  }
  const source = resolveDynamicToolBridgeSource(input.args);
  if (source.kind === 'missing') {
    return { ok: false, error: 'dynamic_tool_bridge_source_missing', policy };
  }
  if (source.kind === 'invalid') {
    return { ok: false, error: 'dynamic_tool_bridge_source_invalid', policy };
  }
  if (!policy.allowedSourceIds.has(source.sourceId)) {
    return { ok: false, error: 'dynamic_tool_bridge_source_not_allowed', policy };
  }
  if (!policy.allowedActions.has(input.action)) {
    return { ok: false, error: 'dynamic_tool_bridge_action_not_allowed', policy };
  }
  return { ok: true, policy, sourceId: source.sourceId };
}

export function resolveDynamicToolBridgePolicy(
  featureToggles: Record<string, unknown> | null
): DynamicToolBridgePolicy {
  const toggles = featureToggles ?? {};
  const direct = readRecordValue(toggles, 'dynamic_tool_bridge');
  const coordinator = readRecordValue(toggles, 'coordinator');
  const nested = coordinator ? readRecordValue(coordinator, 'dynamic_tool_bridge') : undefined;
  const policy = nested ?? direct ?? {};

  const allowedActions = normalizeAllowedActions(
    readStringArrayValue(policy, 'allowed_actions', 'allowedActions', 'action_allowlist', 'actionAllowlist')
  );
  const allowedSources = normalizeAllowedSources(
    readStringArrayValue(policy, 'allowed_sources', 'allowedSources', 'source_allowlist', 'sourceAllowlist')
  );

  return {
    configured: Boolean(nested || direct),
    enabled: readBooleanValue(policy, 'enabled') ?? false,
    killSwitch: readBooleanValue(policy, 'kill_switch', 'killSwitch') ?? false,
    allowedActions,
    allowedSourceIds: allowedSources
  };
}

type DynamicToolBridgeSourceResolution =
  | { kind: 'ready'; sourceId: string }
  | { kind: 'missing' }
  | { kind: 'invalid' };

export function resolveDynamicToolBridgeSource(args: Record<string, unknown>): DynamicToolBridgeSourceResolution {
  const hasSourceObject = Object.prototype.hasOwnProperty.call(args, 'source');
  const rawSource = args.source;
  if (hasSourceObject && (!rawSource || typeof rawSource !== 'object' || Array.isArray(rawSource))) {
    return { kind: 'invalid' };
  }
  const sourceObject = hasSourceObject ? (rawSource as Record<string, unknown>) : null;

  const sourceIdFromObject = sourceObject ? readStringValue(sourceObject, ...SOURCE_ID_KEYS) : undefined;
  const sourceIdFromFlat = readStringValue(args, ...FLAT_SOURCE_KEYS);
  const sourceId = sourceIdFromObject ?? sourceIdFromFlat;
  if (sourceId) {
    return { kind: 'ready', sourceId: sourceId.toLowerCase() };
  }

  const hasRecognizedObjectKey =
    sourceObject !== null && SOURCE_ID_KEYS.some((key) => Object.prototype.hasOwnProperty.call(sourceObject, key));
  const hasRecognizedFlatKey = FLAT_SOURCE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(args, key));
  if (hasSourceObject || hasRecognizedObjectKey || hasRecognizedFlatKey) {
    return { kind: 'invalid' };
  }
  return { kind: 'missing' };
}

function normalizeAllowedActions(values: string[] | undefined): ReadonlySet<DynamicToolBridgeAction> {
  if (!values) {
    return new Set(ALL_DYNAMIC_TOOL_BRIDGE_ACTIONS);
  }
  const allowed = new Set<DynamicToolBridgeAction>();
  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'status' || normalized === 'pause' || normalized === 'resume' || normalized === 'cancel') {
      allowed.add(normalized);
    }
  }
  return allowed;
}

function normalizeAllowedSources(values: string[] | undefined): ReadonlySet<string> {
  if (!values) {
    return new Set(DEFAULT_ALLOWED_SOURCE_IDS);
  }
  const allowed = new Set<string>();
  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (normalized.length > 0) {
      allowed.add(normalized);
    }
  }
  return allowed;
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
