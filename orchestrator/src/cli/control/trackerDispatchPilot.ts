import {
  hasLinearApiCredentials,
  hasLinearSourceBinding,
  resolveLinearSourceSetup,
  resolveLiveLinearDispatchRecommendation,
  type LiveLinearTrackedActivity,
  type LiveLinearTrackedIssue
} from './linearDispatchSource.js';

export type DispatchPilotStatus =
  | 'disabled'
  | 'kill_switched'
  | 'ready'
  | 'source_unavailable'
  | 'source_malformed';

export type DispatchPilotSourceStatus = 'disabled' | 'blocked' | 'ready' | 'unavailable' | 'malformed';

export interface DispatchPilotSummary {
  advisory_only: true;
  configured: boolean;
  enabled: boolean;
  kill_switch: boolean;
  status: DispatchPilotStatus;
  source_status: DispatchPilotSourceStatus;
  reason: string;
  source_setup: DispatchPilotSourceSetup | null;
}

export interface DispatchPilotSourceSetup {
  provider: 'linear';
  workspace_id: string | null;
  team_id: string | null;
  project_id: string | null;
}

export type DispatchPilotTrackedActivity = LiveLinearTrackedActivity;
export type DispatchPilotTrackedIssue = LiveLinearTrackedIssue;

export interface DispatchPilotRecommendation {
  issue_identifier: string | null;
  dispatch_id: string;
  summary: string;
  rationale: string | null;
  confidence: number | null;
  generated_at: string | null;
  source_setup: DispatchPilotSourceSetup;
  tracked_issue: DispatchPilotTrackedIssue | null;
}

export interface DispatchPilotFailure {
  status: number;
  code: 'dispatch_source_unavailable' | 'dispatch_source_malformed';
  reason: string;
}

export interface DispatchPilotEvaluation {
  summary: DispatchPilotSummary;
  recommendation: DispatchPilotRecommendation | null;
  failure: DispatchPilotFailure | null;
}

interface DispatchPilotSourceParseReady {
  kind: 'ready';
  recommendation: DispatchPilotRecommendation;
  sourceSetup: DispatchPilotSourceSetup;
}

interface DispatchPilotSourceParseLiveLinear {
  kind: 'live_linear';
  source: Record<string, unknown>;
  sourceSetup: DispatchPilotSourceSetup;
}

interface DispatchPilotSourceParseUnavailable {
  kind: 'unavailable';
}

interface DispatchPilotSourceParseMalformed {
  kind: 'malformed';
  reason: string;
}

type DispatchPilotSourceParseResult =
  | DispatchPilotSourceParseReady
  | DispatchPilotSourceParseLiveLinear
  | DispatchPilotSourceParseUnavailable
  | DispatchPilotSourceParseMalformed;

export function evaluateTrackerDispatchPilot(input: {
  featureToggles: Record<string, unknown> | null | undefined;
  defaultIssueIdentifier?: string | null;
  env?: NodeJS.ProcessEnv;
}): DispatchPilotEvaluation {
  const resolved = resolveDispatchPilotPolicy(input.featureToggles ?? null);
  const enabled = readBooleanValue(resolved.policy, 'enabled') ?? false;
  const killSwitch = readBooleanValue(resolved.policy, 'kill_switch', 'killSwitch') ?? false;
  const source = parseDispatchPilotSource(resolved.policy, input.defaultIssueIdentifier ?? null);

  if (!enabled) {
    return buildDisabledEvaluation(resolved.configured, killSwitch);
  }

  if (killSwitch) {
    return buildKillSwitchedEvaluation(resolved.configured, source);
  }

  if (source.kind === 'live_linear') {
    const sourceSetup = resolveLinearSourceSetup(source.sourceSetup, input.env ?? process.env);
    if (!hasLinearSourceBinding(sourceSetup)) {
      return buildFailureEvaluation({
        configured: resolved.configured,
        sourceStatus: 'malformed',
        reason: 'dispatch_source_binding_missing',
        status: 422,
        code: 'dispatch_source_malformed',
        sourceSetup
      });
    }

    if (!hasLinearApiCredentials(input.env)) {
      return buildFailureEvaluation({
        configured: resolved.configured,
        sourceStatus: 'unavailable',
        reason: 'dispatch_source_credentials_missing',
        status: 503,
        code: 'dispatch_source_unavailable',
        sourceSetup
      });
    }

    return buildFailureEvaluation({
      configured: resolved.configured,
      sourceStatus: 'unavailable',
      reason: 'dispatch_source_live_requires_async_evaluation',
      status: 503,
      code: 'dispatch_source_unavailable',
      sourceSetup
    });
  }

  if (source.kind === 'unavailable') {
    return buildFailureEvaluation({
      configured: resolved.configured,
      sourceStatus: 'unavailable',
      reason: 'dispatch_source_unavailable',
      status: 503,
      code: 'dispatch_source_unavailable',
      sourceSetup: null
    });
  }

  if (source.kind === 'malformed') {
    return buildFailureEvaluation({
      configured: resolved.configured,
      sourceStatus: 'malformed',
      reason: source.reason,
      status: 422,
      code: 'dispatch_source_malformed',
      sourceSetup: null
    });
  }

  return buildReadyEvaluation({
    configured: resolved.configured,
    recommendation: source.recommendation,
    sourceSetup: source.sourceSetup
  });
}

export function summarizeTrackerDispatchPilotPolicy(input: {
  featureToggles: Record<string, unknown> | null | undefined;
  env?: NodeJS.ProcessEnv;
}): DispatchPilotSummary {
  const resolved = resolveDispatchPilotPolicy(input.featureToggles ?? null);
  const enabled = readBooleanValue(resolved.policy, 'enabled') ?? false;
  const killSwitch = readBooleanValue(resolved.policy, 'kill_switch', 'killSwitch') ?? false;
  const source = parseDispatchPilotSource(resolved.policy, null);

  if (!enabled) {
    return buildDisabledSummary(resolved.configured, killSwitch);
  }

  if (killSwitch) {
    return buildKillSwitchedSummary(resolved.configured, source);
  }

  if (source.kind === 'unavailable') {
    return buildFailureSummary({
      configured: resolved.configured,
      sourceStatus: 'unavailable',
      reason: 'dispatch_source_unavailable',
      sourceSetup: null
    });
  }

  if (source.kind === 'malformed') {
    return buildFailureSummary({
      configured: resolved.configured,
      sourceStatus: 'malformed',
      reason: source.reason,
      sourceSetup: null
    });
  }

  if (source.kind === 'live_linear') {
    const sourceSetup = resolveLinearSourceSetup(source.sourceSetup, input.env ?? process.env);
    if (!hasLinearSourceBinding(sourceSetup)) {
      return buildFailureSummary({
        configured: resolved.configured,
        sourceStatus: 'malformed',
        reason: 'dispatch_source_binding_missing',
        sourceSetup
      });
    }

    if (!hasLinearApiCredentials(input.env)) {
      return buildFailureSummary({
        configured: resolved.configured,
        sourceStatus: 'unavailable',
        reason: 'dispatch_source_credentials_missing',
        sourceSetup
      });
    }

    return buildReadySummary({
      configured: resolved.configured,
      sourceSetup,
      reason: 'dispatch_source_live_deferred'
    });
  }

  return buildReadySummary({
    configured: resolved.configured,
    sourceSetup: source.sourceSetup,
    reason: 'recommendation_available'
  });
}

export async function evaluateTrackerDispatchPilotAsync(input: {
  featureToggles: Record<string, unknown> | null | undefined;
  defaultIssueIdentifier?: string | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<DispatchPilotEvaluation> {
  const resolved = resolveDispatchPilotPolicy(input.featureToggles ?? null);
  const enabled = readBooleanValue(resolved.policy, 'enabled') ?? false;
  const killSwitch = readBooleanValue(resolved.policy, 'kill_switch', 'killSwitch') ?? false;
  const source = parseDispatchPilotSource(resolved.policy, input.defaultIssueIdentifier ?? null);

  if (!enabled) {
    return buildDisabledEvaluation(resolved.configured, killSwitch);
  }

  if (killSwitch) {
    return buildKillSwitchedEvaluation(resolved.configured, source);
  }

  if (source.kind === 'unavailable') {
    return buildFailureEvaluation({
      configured: resolved.configured,
      sourceStatus: 'unavailable',
      reason: 'dispatch_source_unavailable',
      status: 503,
      code: 'dispatch_source_unavailable',
      sourceSetup: null
    });
  }

  if (source.kind === 'malformed') {
    return buildFailureEvaluation({
      configured: resolved.configured,
      sourceStatus: 'malformed',
      reason: source.reason,
      status: 422,
      code: 'dispatch_source_malformed',
      sourceSetup: null
    });
  }

  if (source.kind === 'ready') {
    return buildReadyEvaluation({
      configured: resolved.configured,
      recommendation: source.recommendation,
      sourceSetup: source.sourceSetup
    });
  }

  const liveResolution = await resolveLiveLinearDispatchRecommendation({
    source: source.source,
    sourceSetup: source.sourceSetup,
    defaultIssueIdentifier: input.defaultIssueIdentifier ?? null,
    env: input.env,
    fetchImpl: input.fetchImpl
  });

  if (liveResolution.kind !== 'ready') {
    return buildFailureEvaluation({
      configured: resolved.configured,
      sourceStatus: liveResolution.kind === 'malformed' ? 'malformed' : 'unavailable',
      reason: liveResolution.reason,
      status: liveResolution.status,
      code: liveResolution.code,
      sourceSetup: liveResolution.kind === 'malformed' ? source.sourceSetup : source.sourceSetup
    });
  }

  return buildReadyEvaluation({
    configured: resolved.configured,
    sourceSetup: liveResolution.source_setup,
    recommendation: {
      issue_identifier: liveResolution.tracked_issue.identifier ?? input.defaultIssueIdentifier ?? null,
      dispatch_id: liveResolution.dispatch_id,
      summary: liveResolution.summary,
      rationale: liveResolution.rationale,
      confidence: liveResolution.confidence,
      generated_at: liveResolution.generated_at,
      source_setup: liveResolution.source_setup,
      tracked_issue: liveResolution.tracked_issue
    }
  });
}

function buildDisabledEvaluation(configured: boolean, killSwitch: boolean): DispatchPilotEvaluation {
  return {
    summary: buildDisabledSummary(configured, killSwitch),
    recommendation: null,
    failure: null
  };
}

function buildKillSwitchedEvaluation(
  configured: boolean,
  source: DispatchPilotSourceParseResult
): DispatchPilotEvaluation {
  return {
    summary: buildKillSwitchedSummary(configured, source),
    recommendation: null,
    failure: null
  };
}

function buildReadyEvaluation(input: {
  configured: boolean;
  recommendation: DispatchPilotRecommendation;
  sourceSetup: DispatchPilotSourceSetup;
}): DispatchPilotEvaluation {
  return {
    summary: buildReadySummary({
      configured: input.configured,
      sourceSetup: input.sourceSetup,
      reason: 'recommendation_available'
    }),
    recommendation: input.recommendation,
    failure: null
  };
}

function buildFailureEvaluation(input: {
  configured: boolean;
  sourceStatus: 'unavailable' | 'malformed';
  reason: string;
  status: number;
  code: DispatchPilotFailure['code'];
  sourceSetup: DispatchPilotSourceSetup | null;
}): DispatchPilotEvaluation {
  return {
    summary: buildFailureSummary({
      configured: input.configured,
      sourceStatus: input.sourceStatus,
      reason: input.reason,
      sourceSetup: input.sourceSetup
    }),
    recommendation: null,
    failure: {
      status: input.status,
      code: input.code,
      reason: input.reason
    }
  };
}

function buildDisabledSummary(configured: boolean, killSwitch: boolean): DispatchPilotSummary {
  return {
    advisory_only: true,
    configured,
    enabled: false,
    kill_switch: killSwitch,
    status: 'disabled',
    source_status: 'disabled',
    reason: 'pilot_disabled_default_off',
    source_setup: null
  };
}

function buildKillSwitchedSummary(
  configured: boolean,
  source: DispatchPilotSourceParseResult
): DispatchPilotSummary {
  return {
    advisory_only: true,
    configured,
    enabled: true,
    kill_switch: true,
    status: 'kill_switched',
    source_status: 'blocked',
    reason: 'pilot_kill_switch_enabled',
    source_setup: source.kind === 'ready' || source.kind === 'live_linear' ? source.sourceSetup : null
  };
}

function buildReadySummary(input: {
  configured: boolean;
  sourceSetup: DispatchPilotSourceSetup;
  reason: string;
}): DispatchPilotSummary {
  return {
    advisory_only: true,
    configured: input.configured,
    enabled: true,
    kill_switch: false,
    status: 'ready',
    source_status: 'ready',
    reason: input.reason,
    source_setup: input.sourceSetup
  };
}

function buildFailureSummary(input: {
  configured: boolean;
  sourceStatus: 'unavailable' | 'malformed';
  reason: string;
  sourceSetup: DispatchPilotSourceSetup | null;
}): DispatchPilotSummary {
  return {
    advisory_only: true,
    configured: input.configured,
    enabled: true,
    kill_switch: false,
    status: input.sourceStatus === 'unavailable' ? 'source_unavailable' : 'source_malformed',
    source_status: input.sourceStatus,
    reason: input.reason,
    source_setup: input.sourceSetup
  };
}

function resolveDispatchPilotPolicy(
  featureToggles: Record<string, unknown> | null
): { policy: Record<string, unknown>; configured: boolean } {
  const toggles = featureToggles ?? {};
  const direct = readRecordValue(toggles, 'dispatch_pilot');
  const coordinator = readRecordValue(toggles, 'coordinator');
  const nested = coordinator ? readRecordValue(coordinator, 'dispatch_pilot') : undefined;
  if (nested) {
    return { policy: nested, configured: true };
  }
  if (direct) {
    return { policy: direct, configured: true };
  }
  return { policy: {}, configured: false };
}

function parseDispatchPilotSource(
  policy: Record<string, unknown>,
  defaultIssueIdentifier: string | null
): DispatchPilotSourceParseResult {
  if (!Object.prototype.hasOwnProperty.call(policy, 'source')) {
    return { kind: 'unavailable' };
  }
  const rawSource = policy.source;
  if (!rawSource || typeof rawSource !== 'object' || Array.isArray(rawSource)) {
    return { kind: 'malformed', reason: 'dispatch_source_not_object' };
  }
  const source = rawSource as Record<string, unknown>;
  const provider = readStringValue(source, 'provider', 'source_provider', 'sourceProvider');
  const normalizedProvider = normalizeDispatchSourceProvider(provider);
  if (!normalizedProvider) {
    return {
      kind: 'malformed',
      reason: provider ? 'dispatch_source_provider_unsupported' : 'dispatch_source_provider_missing'
    };
  }

  const bindingSource = readRecordValue(source, 'linear') ?? source;
  const sourceSetup: DispatchPilotSourceSetup = {
    provider: normalizedProvider,
    workspace_id: readStringValue(bindingSource, 'workspace_id', 'workspaceId') ?? null,
    team_id: readStringValue(bindingSource, 'team_id', 'teamId') ?? null,
    project_id: readStringValue(bindingSource, 'project_id', 'projectId') ?? null
  };

  if (isLiveDispatchSource(source)) {
    return {
      kind: 'live_linear',
      source,
      sourceSetup
    };
  }

  if (!sourceSetup.workspace_id && !sourceSetup.team_id && !sourceSetup.project_id) {
    return {
      kind: 'malformed',
      reason: 'dispatch_source_binding_missing'
    };
  }

  const summary = readStringValue(source, 'summary', 'dispatch_summary', 'dispatchSummary');
  if (!summary) {
    return { kind: 'malformed', reason: 'dispatch_source_summary_missing' };
  }

  const dispatchId = readStringValue(source, 'dispatch_id', 'dispatchId') ?? 'dispatch-advisory';
  const issueIdentifier = readStringValue(source, 'issue_identifier', 'issueIdentifier') ?? defaultIssueIdentifier;
  const rationale = readStringValue(source, 'rationale', 'reason') ?? null;
  const confidence = readNumberValue(source, 'confidence', 'score') ?? null;
  if (confidence !== null && (confidence < 0 || confidence > 1)) {
    return { kind: 'malformed', reason: 'dispatch_source_confidence_out_of_range' };
  }

  const generatedAtRaw = readStringValue(source, 'generated_at', 'generatedAt');
  let generatedAt: string | null = null;
  if (generatedAtRaw) {
    const generatedAtMs = Date.parse(generatedAtRaw);
    if (!Number.isFinite(generatedAtMs)) {
      return { kind: 'malformed', reason: 'dispatch_source_generated_at_invalid' };
    }
    generatedAt = new Date(generatedAtMs).toISOString();
  }

  return {
    kind: 'ready',
    recommendation: {
      issue_identifier: issueIdentifier ?? null,
      dispatch_id: dispatchId,
      summary,
      rationale,
      confidence,
      generated_at: generatedAt,
      source_setup: sourceSetup,
      tracked_issue: null
    },
    sourceSetup
  };
}

function isLiveDispatchSource(source: Record<string, unknown>): boolean {
  if (readBooleanValue(source, 'live')) {
    return true;
  }
  const mode = readStringValue(source, 'mode', 'source_mode', 'sourceMode');
  return Boolean(mode && mode.trim().toLowerCase() === 'live');
}

function normalizeDispatchSourceProvider(value: string | undefined): DispatchPilotSourceSetup['provider'] | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'linear' || normalized === 'linear_advisory') {
    return 'linear';
  }
  return null;
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

function readRecordValue(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
