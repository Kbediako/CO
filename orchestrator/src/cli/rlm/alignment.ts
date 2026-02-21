import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type {
  RlmAlignmentAction,
  RlmAlignmentConsensusSnapshot,
  RlmAlignmentDecision,
  RlmAlignmentDimensionScores,
  RlmAlignmentFinalSummary,
  RlmAlignmentRiskLevel,
  RlmIntentChangeLevel,
  RlmIntentSnapshot,
  RlmIntentVersion
} from './types.js';

const ALIGNMENT_SCHEMA_VERSION = 1;
const ALIGNMENT_HASH_GENESIS = 'GENESIS';
const ACTION_ORDER: RlmAlignmentAction[] = ['pass', 'nudge', 'replan', 'block_escalate'];
const ALIGNMENT_EVENT_TYPES = new Set<AlignmentLedgerEvent['event_type']>([
  'intent_update',
  'sentinel',
  'deep_audit',
  'consensus_snapshot',
  'final_summary'
]);

export interface AlignmentWeights {
  goal_alignment: number;
  constraint_compliance: number;
  action_evidence_coherence: number;
  completeness: number;
  context_continuity: number;
  efficiency_discipline: number;
}

export interface AlignmentBands {
  pass_min: number;
  nudge_min: number;
  replan_min: number;
}

export interface AlignmentDeepAuditPolicy {
  min_contradictions: number;
  override_streak_trigger: number;
  on_high_risk: boolean;
}

export interface AlignmentConsensusPolicy {
  top_score_min: number;
  margin_min: number;
  required_votes: number;
}

export interface AlignmentAntiGamingPolicy {
  verbosity_free_tokens: number;
  max_penalty: number;
}

export interface AlignmentAntiOscillationPolicy {
  cooldown_turns: number;
}

export interface AlignmentConfirmationPolicy {
  mandatory_turn_window: number;
}

export interface AlignmentRoutePolicy {
  sentinel_model: string;
  high_reasoning_model: string;
  arbitration_model: string;
  high_reasoning_available: boolean;
}

export interface AlignmentPolicy {
  weights: AlignmentWeights;
  bands: AlignmentBands;
  deep_audit: AlignmentDeepAuditPolicy;
  consensus: AlignmentConsensusPolicy;
  anti_gaming: AlignmentAntiGamingPolicy;
  anti_oscillation: AlignmentAntiOscillationPolicy;
  confirmation: AlignmentConfirmationPolicy;
  route: AlignmentRoutePolicy;
}

export const DEFAULT_ALIGNMENT_POLICY: AlignmentPolicy = {
  weights: {
    goal_alignment: 30,
    constraint_compliance: 20,
    action_evidence_coherence: 15,
    completeness: 15,
    context_continuity: 10,
    efficiency_discipline: 10
  },
  bands: {
    pass_min: 85,
    nudge_min: 70,
    replan_min: 50
  },
  deep_audit: {
    min_contradictions: 2,
    override_streak_trigger: 2,
    on_high_risk: true
  },
  consensus: {
    top_score_min: 0.7,
    margin_min: 0.15,
    required_votes: 2
  },
  anti_gaming: {
    verbosity_free_tokens: 420,
    max_penalty: 0.35
  },
  anti_oscillation: {
    cooldown_turns: 2
  },
  confirmation: {
    mandatory_turn_window: 20
  },
  route: {
    sentinel_model: 'gpt-5.3-spark',
    high_reasoning_model: 'gpt-5.3-codex',
    arbitration_model: 'gpt-5.3-codex',
    high_reasoning_available: true
  }
};

export interface AlignmentScoreInput {
  contradictions: number;
  evidence_count: number;
  verbosity_tokens: number;
  intent: 'continue' | 'final' | 'pause' | 'fail';
  risk_level: RlmAlignmentRiskLevel;
  deep_audit: boolean;
}

export interface AlignmentScoreResult {
  score: number;
  confidence: number;
  action: RlmAlignmentAction;
  policy_band: RlmAlignmentAction;
  dimensions: RlmAlignmentDimensionScores;
}

export interface AlignmentDeepAuditInput {
  contradictions: number;
  override_streak: number;
  risk_level: RlmAlignmentRiskLevel;
  low_consensus_confidence: boolean;
}

export interface AlignmentDeepAuditResult {
  triggered: boolean;
  reasons: string[];
}

export interface AlignmentConsensusVote {
  evaluator_id: string;
  action: RlmAlignmentAction;
  confidence: number;
  veto?: boolean;
}

export interface AlignmentConsensusResult {
  accepted: boolean;
  top_action: RlmAlignmentAction;
  top_votes: number;
  top_confidence: number;
  margin: number;
  veto: boolean;
  reasons: string[];
}

export interface AlignmentGateInput {
  turn: number;
  risk_level: RlmAlignmentRiskLevel;
  action: RlmAlignmentAction;
  confidence: number;
  high_reasoning_available: boolean;
  consensus_snapshot?: AlignmentConsensusResult | null;
  consensus_lock_active?: boolean;
}

export interface AlignmentGateResult {
  requires_confirmation: boolean;
  confidence_gate_passed: boolean;
  reasons: string[];
}

interface AlignmentIngestionSessionState {
  run_id: string;
  session_key: string;
  completed: boolean;
}

export interface AlignmentCheckerConfig {
  enabled: boolean;
  enforce: boolean;
  repo_root: string;
  run_dir: string;
  task_id: string;
  run_id: string;
  thread_id: string;
  agent_id: string;
  goal: string;
  policy?: Partial<AlignmentPolicy>;
  now?: () => string;
}

export interface AlignmentCheckerTurnInput {
  turn: number;
  intent: 'continue' | 'final' | 'pause' | 'fail';
  planner_prompt_bytes: number;
  planner_errors: string[];
  read_count: number;
  search_count: number;
  subcall_count: number;
  risk_level: RlmAlignmentRiskLevel;
  evidence_refs: string[];
}

export interface AlignmentCheckerTurnResult {
  decision: RlmAlignmentDecision;
  enforce_block: boolean;
  enforce_reason?: string;
}

export interface AlignmentLedgerEvent {
  event_id: string;
  timestamp_utc: string;
  thread_id: string;
  task_id: string;
  run_id: string;
  agent_id: string;
  event_type: 'intent_update' | 'sentinel' | 'deep_audit' | 'consensus_snapshot' | 'final_summary';
  intent_version: string;
  schema_version: number;
  payload: Record<string, unknown>;
  score_metadata: Record<string, unknown>;
  provenance: Record<string, unknown>;
  idempotency_key: string;
  prev_hash: string;
  hash: string;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolvePolicy(policy?: Partial<AlignmentPolicy>): AlignmentPolicy {
  return {
    weights: { ...DEFAULT_ALIGNMENT_POLICY.weights, ...(policy?.weights ?? {}) },
    bands: { ...DEFAULT_ALIGNMENT_POLICY.bands, ...(policy?.bands ?? {}) },
    deep_audit: { ...DEFAULT_ALIGNMENT_POLICY.deep_audit, ...(policy?.deep_audit ?? {}) },
    consensus: { ...DEFAULT_ALIGNMENT_POLICY.consensus, ...(policy?.consensus ?? {}) },
    anti_gaming: { ...DEFAULT_ALIGNMENT_POLICY.anti_gaming, ...(policy?.anti_gaming ?? {}) },
    anti_oscillation: {
      ...DEFAULT_ALIGNMENT_POLICY.anti_oscillation,
      ...(policy?.anti_oscillation ?? {})
    },
    confirmation: { ...DEFAULT_ALIGNMENT_POLICY.confirmation, ...(policy?.confirmation ?? {}) },
    route: { ...DEFAULT_ALIGNMENT_POLICY.route, ...(policy?.route ?? {}) }
  };
}

function actionSeverity(action: RlmAlignmentAction): number {
  const index = ACTION_ORDER.indexOf(action);
  return index >= 0 ? index : 0;
}

function moreSevereAction(action: RlmAlignmentAction): RlmAlignmentAction {
  const severity = actionSeverity(action);
  return ACTION_ORDER[Math.min(ACTION_ORDER.length - 1, severity + 1)] ?? 'block_escalate';
}

function actionFromScore(score: number, bands: AlignmentBands): RlmAlignmentAction {
  if (score >= bands.pass_min) {
    return 'pass';
  }
  if (score >= bands.nudge_min) {
    return 'nudge';
  }
  if (score >= bands.replan_min) {
    return 'replan';
  }
  return 'block_escalate';
}

function computeVerbosityPenalty(tokens: number, policy: AlignmentAntiGamingPolicy): number {
  const safeTokens = Math.max(0, Math.floor(tokens));
  const freeTokens = Math.max(1, Math.floor(policy.verbosity_free_tokens));
  const overflow = Math.max(0, safeTokens - freeTokens);
  if (overflow === 0) {
    return 0;
  }
  const ratio = overflow / freeTokens;
  return clamp(ratio * 0.2, 0, policy.max_penalty);
}

function deriveDimensions(input: AlignmentScoreInput, policy: AlignmentPolicy): RlmAlignmentDimensionScores {
  const contradictions = Math.max(0, input.contradictions);
  const evidence = Math.max(0, input.evidence_count);
  const verbosityPenalty = computeVerbosityPenalty(input.verbosity_tokens, policy.anti_gaming);

  const goalAlignment = clamp(1 - contradictions * 0.14, 0, 1);
  const constraintCompliance = clamp(1 - contradictions * 0.2, 0, 1);
  const evidenceCoherence = clamp(0.68 + Math.min(0.28, evidence * 0.07) - contradictions * 0.08, 0, 1);
  const completeness = clamp(0.72 + Math.min(0.24, evidence * 0.06) - contradictions * 0.06, 0, 1);
  const continuityPenalty = input.intent === 'pause' || input.intent === 'fail' ? 0.2 : 0;
  const continuity = clamp(0.88 - contradictions * 0.09 - continuityPenalty, 0, 1);
  const efficiency = clamp(1 - verbosityPenalty, 0, 1);

  return {
    goal_alignment: round2(goalAlignment * 100),
    constraint_compliance: round2(constraintCompliance * 100),
    action_evidence_coherence: round2(evidenceCoherence * 100),
    completeness: round2(completeness * 100),
    context_continuity: round2(continuity * 100),
    efficiency_discipline: round2(efficiency * 100)
  };
}

export function scoreAlignment(input: AlignmentScoreInput, policyInput?: Partial<AlignmentPolicy>): AlignmentScoreResult {
  const policy = resolvePolicy(policyInput);
  const dimensions = deriveDimensions(input, policy);
  const normalized = {
    goal_alignment: dimensions.goal_alignment / 100,
    constraint_compliance: dimensions.constraint_compliance / 100,
    action_evidence_coherence: dimensions.action_evidence_coherence / 100,
    completeness: dimensions.completeness / 100,
    context_continuity: dimensions.context_continuity / 100,
    efficiency_discipline: dimensions.efficiency_discipline / 100
  };

  const weighted =
    normalized.goal_alignment * policy.weights.goal_alignment +
    normalized.constraint_compliance * policy.weights.constraint_compliance +
    normalized.action_evidence_coherence * policy.weights.action_evidence_coherence +
    normalized.completeness * policy.weights.completeness +
    normalized.context_continuity * policy.weights.context_continuity +
    normalized.efficiency_discipline * policy.weights.efficiency_discipline;

  const score = Math.round(clamp(weighted, 0, 100));
  const contradictionPenalty = Math.min(0.25, Math.max(0, input.contradictions) * 0.05);
  const auditBoost = input.deep_audit ? 0.04 : 0;
  const confidence = round2(
    clamp(score / 100 - contradictionPenalty + auditBoost, 0.05, 0.99)
  );
  const action = actionFromScore(score, policy.bands);

  return {
    score,
    confidence,
    action,
    policy_band: action,
    dimensions
  };
}

export function shouldRunDeepAudit(
  input: AlignmentDeepAuditInput,
  policyInput?: Partial<AlignmentPolicy>
): AlignmentDeepAuditResult {
  const policy = resolvePolicy(policyInput);
  const reasons: string[] = [];
  if (input.contradictions >= policy.deep_audit.min_contradictions) {
    reasons.push('contradictions');
  }
  if (input.override_streak >= policy.deep_audit.override_streak_trigger) {
    reasons.push('override_streak');
  }
  if (policy.deep_audit.on_high_risk && input.risk_level === 'high') {
    reasons.push('high_risk');
  }
  if (input.low_consensus_confidence) {
    reasons.push('low_consensus_confidence');
  }
  return {
    triggered: reasons.length > 0,
    reasons
  };
}

function scoreActionGroup(votes: AlignmentConsensusVote[], action: RlmAlignmentAction): { count: number; confidence: number } {
  const matching = votes.filter((entry) => entry.action === action);
  if (matching.length === 0) {
    return { count: 0, confidence: 0 };
  }
  const total = matching.reduce((sum, entry) => sum + clamp(entry.confidence, 0, 1), 0);
  return {
    count: matching.length,
    confidence: round2(total / matching.length)
  };
}

export function evaluateConsensus(
  votes: AlignmentConsensusVote[],
  policyInput?: Partial<AlignmentPolicy>
): AlignmentConsensusResult {
  const policy = resolvePolicy(policyInput);
  const grouped = ACTION_ORDER.map((action) => ({ action, ...scoreActionGroup(votes, action) }));
  grouped.sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return right.confidence - left.confidence;
  });

  const top = grouped[0] ?? { action: 'pass' as RlmAlignmentAction, count: 0, confidence: 0 };
  const runnerUp = grouped[1] ?? { confidence: 0 };
  const margin = round2(top.confidence - runnerUp.confidence);
  const veto = votes.some((entry) => entry.veto === true);
  const reasons: string[] = [];

  if (top.count < policy.consensus.required_votes) {
    reasons.push('insufficient_votes');
  }
  if (top.confidence < policy.consensus.top_score_min) {
    reasons.push('low_confidence');
  }
  if (margin < policy.consensus.margin_min) {
    reasons.push('low_margin');
  }
  if (veto) {
    reasons.push('veto');
  }

  return {
    accepted: reasons.length === 0,
    top_action: top.action,
    top_votes: top.count,
    top_confidence: top.confidence,
    margin,
    veto,
    reasons
  };
}

export function buildConsensusVotes(input: {
  action: RlmAlignmentAction;
  confidence: number;
  risk_level: RlmAlignmentRiskLevel;
  policy_veto: boolean;
}): AlignmentConsensusVote[] {
  const primaryConfidence = clamp(input.confidence, 0.05, 0.99);
  const penalty = input.risk_level === 'high' ? 0.12 : 0.07;
  const secondaryAction =
    primaryConfidence >= 0.74 ? input.action : moreSevereAction(input.action);
  const tertiaryAction =
    primaryConfidence >= 0.82 ? input.action : moreSevereAction(secondaryAction);

  return [
    {
      evaluator_id: 'e1',
      action: input.action,
      confidence: round2(primaryConfidence)
    },
    {
      evaluator_id: 'e2',
      action: secondaryAction,
      confidence: round2(clamp(primaryConfidence - penalty, 0.05, 0.99))
    },
    {
      evaluator_id: 'e3',
      action: tertiaryAction,
      confidence: round2(clamp(primaryConfidence - penalty * 1.4, 0.05, 0.99)),
      veto: input.policy_veto
    }
  ];
}

export function decideConfirmationGate(
  input: AlignmentGateInput,
  policyInput?: Partial<AlignmentPolicy>
): AlignmentGateResult {
  const policy = resolvePolicy(policyInput);
  const reasons: string[] = [];

  const mandatoryWindow = Math.max(0, Math.floor(policy.confirmation.mandatory_turn_window));
  const mediumOrHighRisk = input.risk_level === 'medium' || input.risk_level === 'high';
  if (input.turn <= mandatoryWindow && mediumOrHighRisk) {
    reasons.push('turn_window_requires_confirmation');
  }
  if (input.action === 'block_escalate') {
    reasons.push('block_requires_confirmation');
  }
  if (
    !input.high_reasoning_available &&
    (mediumOrHighRisk || input.action === 'replan' || input.action === 'block_escalate')
  ) {
    reasons.push('high_reasoning_unavailable');
  }

  if (input.consensus_lock_active) {
    reasons.push('consensus_lock_active');
  }

  const consensusAccepted = input.consensus_snapshot
    ? input.consensus_snapshot.accepted
    : !input.consensus_lock_active;
  const confidenceGatePassed =
    input.confidence >= policy.consensus.top_score_min && consensusAccepted;
  if (!confidenceGatePassed) {
    reasons.push('confidence_gate_failed');
  }

  return {
    requires_confirmation: reasons.length > 0,
    confidence_gate_passed: confidenceGatePassed,
    reasons
  };
}

interface OscillationState {
  previous_action: RlmAlignmentAction | null;
  cooldown_remaining: number;
}

function applyAntiOscillation(
  candidate: RlmAlignmentAction,
  state: OscillationState,
  policyInput?: Partial<AlignmentPolicy>
): { action: RlmAlignmentAction; state: OscillationState } {
  const policy = resolvePolicy(policyInput);
  const previous = state.previous_action;
  const inCooldown = state.cooldown_remaining > 0;

  if (previous && inCooldown && actionSeverity(candidate) < actionSeverity(previous)) {
    return {
      action: previous,
      state: {
        previous_action: previous,
        cooldown_remaining: Math.max(0, state.cooldown_remaining - 1)
      }
    };
  }

  const changed = previous !== null && previous !== candidate;
  return {
    action: candidate,
    state: {
      previous_action: candidate,
      cooldown_remaining: changed
        ? Math.max(0, Math.floor(policy.anti_oscillation.cooldown_turns))
        : Math.max(0, state.cooldown_remaining - 1)
    }
  };
}

function incrementIntentVersion(
  version: RlmIntentVersion,
  change: RlmIntentChangeLevel
): RlmIntentVersion {
  if (change === 'major') {
    const major = version.major + 1;
    return { major, minor: 0, patch: 0, label: `${major}.0.0` };
  }
  if (change === 'minor') {
    const minor = version.minor + 1;
    return {
      major: version.major,
      minor,
      patch: 0,
      label: `${version.major}.${minor}.0`
    };
  }
  const patch = version.patch + 1;
  return {
    major: version.major,
    minor: version.minor,
    patch,
    label: `${version.major}.${version.minor}.${patch}`
  };
}

function deriveIntentChange(input: {
  intent: 'continue' | 'final' | 'pause' | 'fail';
  contradictions: number;
  risk_level: RlmAlignmentRiskLevel;
}): RlmIntentChangeLevel {
  if (input.intent === 'fail' || input.contradictions >= 3) {
    return 'major';
  }
  if (input.intent === 'final' || input.risk_level === 'high' || input.intent === 'pause') {
    return 'minor';
  }
  return 'patch';
}

function hashLedgerEvent(event: Omit<AlignmentLedgerEvent, 'hash'>): string {
  const canonical = JSON.stringify({
    event_id: event.event_id,
    timestamp_utc: event.timestamp_utc,
    thread_id: event.thread_id,
    task_id: event.task_id,
    run_id: event.run_id,
    agent_id: event.agent_id,
    event_type: event.event_type,
    intent_version: event.intent_version,
    schema_version: event.schema_version,
    payload: event.payload,
    score_metadata: event.score_metadata,
    provenance: event.provenance,
    idempotency_key: event.idempotency_key,
    prev_hash: event.prev_hash
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function parseLedgerLine(line: string): AlignmentLedgerEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (typeof parsed.idempotency_key !== 'string' || typeof parsed.hash !== 'string') {
      return null;
    }
    if (
      typeof parsed.event_type !== 'string' ||
      !ALIGNMENT_EVENT_TYPES.has(parsed.event_type as AlignmentLedgerEvent['event_type'])
    ) {
      return null;
    }
    if (
      parsed.score_metadata !== undefined &&
      (parsed.score_metadata === null || typeof parsed.score_metadata !== 'object')
    ) {
      return null;
    }
    if (
      parsed.payload !== undefined &&
      (parsed.payload === null || typeof parsed.payload !== 'object')
    ) {
      return null;
    }
    return parsed as unknown as AlignmentLedgerEvent;
  } catch {
    return null;
  }
}

function buildProjection(events: AlignmentLedgerEvent[], now: string): Record<string, unknown> {
  const actionCounts: Record<RlmAlignmentAction, number> = {
    pass: 0,
    nudge: 0,
    replan: 0,
    block_escalate: 0
  };
  let deepAudits = 0;
  let confirmations = 0;
  let consensusSnapshots = 0;

  for (const event of events) {
    const eventType = typeof event.event_type === 'string' ? event.event_type : null;
    const scoreMetadata =
      event.score_metadata && typeof event.score_metadata === 'object'
        ? (event.score_metadata as Record<string, unknown>)
        : null;
    const decisionEvent = eventType === 'sentinel' || eventType === 'deep_audit';
    if (decisionEvent) {
      const scoreAction = scoreMetadata?.action;
      if (typeof scoreAction === 'string' && Object.hasOwn(actionCounts, scoreAction)) {
        const typed = scoreAction as RlmAlignmentAction;
        actionCounts[typed] += 1;
      }
      if (scoreMetadata?.requires_confirmation === true) {
        confirmations += 1;
      }
    }
    if (eventType === 'deep_audit') {
      deepAudits += 1;
    }
    if (eventType === 'consensus_snapshot') {
      consensusSnapshots += 1;
    }
  }

  const tail = events.length > 0 ? events[events.length - 1] : null;
  const tailMetadata =
    tail?.score_metadata && typeof tail.score_metadata === 'object'
      ? (tail.score_metadata as Record<string, unknown>)
      : null;
  return {
    schema_version: ALIGNMENT_SCHEMA_VERSION,
    derived_from: 'alignment-ledger',
    generated_at: now,
    totals: {
      events: events.length,
      deep_audits: deepAudits,
      confirmations,
      consensus_snapshots: consensusSnapshots,
      actions: actionCounts
    },
    latest: tail
      ? {
          event_id: tail.event_id,
          event_type: tail.event_type,
          intent_version: tail.intent_version,
          action: tailMetadata?.action ?? null,
          score: tailMetadata?.score ?? null,
          confidence: tailMetadata?.confidence ?? null
        }
      : null,
    hash_tail: tail?.hash ?? ALIGNMENT_HASH_GENESIS
  };
}

export class AlignmentLedgerWriter {
  private readonly repoRoot: string;

  private readonly ledgerPath: string;

  private readonly projectionPath: string;

  private readonly now: () => string;

  private initialized = false;

  private lastHash = ALIGNMENT_HASH_GENESIS;

  private readonly idempotencyKeys = new Set<string>();

  private readonly events: AlignmentLedgerEvent[] = [];

  constructor(params: {
    repoRoot: string;
    runDir: string;
    now?: () => string;
  }) {
    this.repoRoot = params.repoRoot;
    const alignmentDir = join(params.runDir, 'alignment');
    this.ledgerPath = join(alignmentDir, 'ledger.jsonl');
    this.projectionPath = join(alignmentDir, 'projection.json');
    this.now = params.now ?? (() => new Date().toISOString());
  }

  private async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await mkdir(join(this.ledgerPath, '..'), { recursive: true });

    let raw = '';
    try {
      raw = await readFile(this.ledgerPath, 'utf8');
    } catch {
      raw = '';
    }

    for (const line of raw.split(/\r?\n/u)) {
      const event = parseLedgerLine(line);
      if (!event) {
        continue;
      }
      this.events.push(event);
      this.idempotencyKeys.add(event.idempotency_key);
      this.lastHash = event.hash;
    }

    this.initialized = true;
  }

  async append(
    event: Omit<AlignmentLedgerEvent, 'event_id' | 'timestamp_utc' | 'schema_version' | 'prev_hash' | 'hash'>
  ): Promise<AlignmentLedgerEvent | null> {
    await this.init();
    if (this.idempotencyKeys.has(event.idempotency_key)) {
      return null;
    }

    const base: Omit<AlignmentLedgerEvent, 'hash'> = {
      ...event,
      event_id: randomUUID(),
      timestamp_utc: this.now(),
      schema_version: ALIGNMENT_SCHEMA_VERSION,
      prev_hash: this.lastHash
    };
    const hash = hashLedgerEvent(base);
    const fullEvent: AlignmentLedgerEvent = {
      ...base,
      hash
    };

    const serialized = `${JSON.stringify(fullEvent)}\n`;
    await writeFile(this.ledgerPath, serialized, { encoding: 'utf8', flag: 'a' });

    this.events.push(fullEvent);
    this.idempotencyKeys.add(fullEvent.idempotency_key);
    this.lastHash = fullEvent.hash;

    const projection = buildProjection(this.events, this.now());
    await writeFile(this.projectionPath, JSON.stringify(projection, null, 2), 'utf8');

    return fullEvent;
  }

  summary(): {
    ledger_path: string;
    projection_path: string;
    events: number;
    last_hash: string;
  } {
    return {
      ledger_path: relative(this.repoRoot, this.ledgerPath),
      projection_path: relative(this.repoRoot, this.projectionPath),
      events: this.events.length,
      last_hash: this.lastHash
    };
  }
}

export class AlignmentChecker {
  private readonly enabled: boolean;

  private readonly enforce: boolean;

  private readonly policy: AlignmentPolicy;

  private readonly taskId: string;

  private readonly runId: string;

  private readonly threadId: string;

  private readonly agentId: string;

  private readonly goal: string;

  private readonly runDir: string;

  private readonly ledger: AlignmentLedgerWriter;

  private readonly ingestionStatePath: string;

  private ingestionRunKey: string | null = null;

  private intentVersion: RlmIntentVersion = { major: 1, minor: 0, patch: 0, label: '1.0.0' };

  private intentSnapshot: RlmIntentSnapshot;

  private oscillation: OscillationState = { previous_action: null, cooldown_remaining: 0 };

  private overrideStreak = 0;

  private consensusLowConfidence = false;

  private consensusLockActive = false;

  private turnsEvaluated = 0;

  private deepAuditCount = 0;

  private requiresConfirmationCount = 0;

  private consensusSnapshots = 0;

  private consensusAccepted = 0;

  private readonly actionCounts: Record<RlmAlignmentAction, number> = {
    pass: 0,
    nudge: 0,
    replan: 0,
    block_escalate: 0
  };

  private readonly routeCounts: Record<'sentinel' | 'deep_audit' | 'arbitration', number> = {
    sentinel: 0,
    deep_audit: 0,
    arbitration: 0
  };

  private now: () => string;

  constructor(config: AlignmentCheckerConfig) {
    this.enabled = config.enabled;
    this.enforce = config.enforce;
    this.policy = resolvePolicy(config.policy);
    this.taskId = config.task_id;
    this.runId = config.run_id;
    this.threadId = config.thread_id;
    this.agentId = config.agent_id;
    this.goal = config.goal;
    this.runDir = config.run_dir;
    this.ingestionStatePath = join(this.runDir, 'alignment', 'ingestion-session.json');
    this.intentSnapshot = {
      goals: [config.goal],
      constraints: [],
      priorities: ['safety', 'correctness', 'minimal_change'],
      style_preferences: ['concise', 'evidence-linked'],
      evidence_refs: [],
      confidence: {
        overall: 0.9,
        notes: 'bootstrap'
      }
    };
    this.now = config.now ?? (() => new Date().toISOString());
    this.ledger = new AlignmentLedgerWriter({
      repoRoot: config.repo_root,
      runDir: config.run_dir,
      now: this.now
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private async ensureIngestionRunKey(): Promise<string> {
    if (this.ingestionRunKey) {
      return this.ingestionRunKey;
    }

    await mkdir(join(this.runDir, 'alignment'), { recursive: true });

    let session: AlignmentIngestionSessionState | null = null;
    try {
      const raw = await readFile(this.ingestionStatePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AlignmentIngestionSessionState>;
      if (
        typeof parsed.run_id === 'string' &&
        typeof parsed.session_key === 'string' &&
        typeof parsed.completed === 'boolean'
      ) {
        session = {
          run_id: parsed.run_id,
          session_key: parsed.session_key,
          completed: parsed.completed
        };
      }
    } catch {
      session = null;
    }

    if (session && session.run_id === this.runId && session.completed === false) {
      this.ingestionRunKey = session.session_key;
      return this.ingestionRunKey;
    }

    const sessionKey = `${this.runId}:${randomUUID()}`;
    this.ingestionRunKey = sessionKey;
    const nextSession: AlignmentIngestionSessionState = {
      run_id: this.runId,
      session_key: sessionKey,
      completed: false
    };
    await writeFile(this.ingestionStatePath, JSON.stringify(nextSession, null, 2), 'utf8');
    return sessionKey;
  }

  private async markIngestionSessionCompleted(): Promise<void> {
    if (!this.ingestionRunKey) {
      return;
    }
    const completedSession: AlignmentIngestionSessionState = {
      run_id: this.runId,
      session_key: this.ingestionRunKey,
      completed: true
    };
    await writeFile(this.ingestionStatePath, JSON.stringify(completedSession, null, 2), 'utf8');
  }

  private buildIntentSnapshot(input: {
    evidence_refs: string[];
    confidence: number;
    intent: 'continue' | 'final' | 'pause' | 'fail';
    contradictions: number;
  }): RlmIntentSnapshot {
    const constraints = [
      ...(input.intent === 'fail' ? ['halt-on-failure'] : []),
      ...(input.contradictions > 0 ? [`contradictions:${input.contradictions}`] : []),
      ...(input.intent === 'final' ? ['final-answer-needs-validation'] : [])
    ];

    return {
      goals: [this.goal],
      constraints,
      priorities: ['safety', 'goal_alignment', 'constraint_compliance'],
      style_preferences: ['evidence-linked', 'non-oscillating'],
      evidence_refs: input.evidence_refs.slice(0, 12),
      confidence: {
        overall: round2(clamp(input.confidence, 0, 1)),
        notes: `intent=${input.intent}`
      }
    };
  }

  private async appendLedgerEvent(
    event: Omit<AlignmentLedgerEvent, 'event_id' | 'timestamp_utc' | 'schema_version' | 'prev_hash' | 'hash'>
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await this.ledger.append(event);
  }

  async evaluateTurn(input: AlignmentCheckerTurnInput): Promise<AlignmentCheckerTurnResult | null> {
    if (!this.enabled) {
      return null;
    }

    const contradictions =
      Math.max(0, input.planner_errors.length) + (input.intent === 'fail' ? 1 : 0) + (input.intent === 'pause' ? 1 : 0);

    let deepAudit = shouldRunDeepAudit(
      {
        contradictions,
        override_streak: this.overrideStreak,
        risk_level: input.risk_level,
        low_consensus_confidence: this.consensusLowConfidence
      },
      this.policy
    );

    let scoreResult = scoreAlignment(
      {
        contradictions,
        evidence_count: Math.max(0, input.read_count + input.search_count + input.subcall_count),
        verbosity_tokens: Math.ceil(Math.max(0, input.planner_prompt_bytes) / 4),
        intent: input.intent,
        risk_level: input.risk_level,
        deep_audit: deepAudit.triggered
      },
      this.policy
    );

    let oscillated = applyAntiOscillation(scoreResult.action, this.oscillation, this.policy);
    let stabilizedAction = oscillated.action;

    const projectedOverrideStreak = stabilizedAction === 'pass' ? 0 : this.overrideStreak + 1;
    const overrideAwareDeepAudit = shouldRunDeepAudit(
      {
        contradictions,
        override_streak: projectedOverrideStreak,
        risk_level: input.risk_level,
        low_consensus_confidence: this.consensusLowConfidence
      },
      this.policy
    );

    const deepAuditChanged =
      overrideAwareDeepAudit.triggered !== deepAudit.triggered ||
      overrideAwareDeepAudit.reasons.join('|') !== deepAudit.reasons.join('|');
    if (deepAuditChanged) {
      deepAudit = overrideAwareDeepAudit;
      scoreResult = scoreAlignment(
        {
          contradictions,
          evidence_count: Math.max(0, input.read_count + input.search_count + input.subcall_count),
          verbosity_tokens: Math.ceil(Math.max(0, input.planner_prompt_bytes) / 4),
          intent: input.intent,
          risk_level: input.risk_level,
          deep_audit: deepAudit.triggered
        },
        this.policy
      );
      oscillated = applyAntiOscillation(scoreResult.action, this.oscillation, this.policy);
      stabilizedAction = oscillated.action;
    }
    this.oscillation = oscillated.state;

    let routeStrategy: 'sentinel' | 'deep_audit' | 'arbitration' =
      deepAudit.triggered ? 'deep_audit' : 'sentinel';
    let routeModel =
      routeStrategy === 'sentinel'
        ? this.policy.route.sentinel_model
        : this.policy.route.high_reasoning_model;

    let consensusSnapshot: RlmAlignmentConsensusSnapshot | undefined;
    let consensusResult: AlignmentConsensusResult | null = null;
    if (input.turn % 20 === 0) {
      routeStrategy = 'arbitration';
      routeModel = this.policy.route.arbitration_model;
      const votes = buildConsensusVotes({
        action: stabilizedAction,
        confidence: scoreResult.confidence,
        risk_level: input.risk_level,
        policy_veto: stabilizedAction === 'block_escalate'
      });
      consensusResult = evaluateConsensus(votes, this.policy);
      consensusSnapshot = {
        turn: input.turn,
        accepted: consensusResult.accepted,
        top_action: consensusResult.top_action,
        top_votes: consensusResult.top_votes,
        top_confidence: consensusResult.top_confidence,
        margin: consensusResult.margin,
        veto: consensusResult.veto,
        reasons: consensusResult.reasons.length > 0 ? consensusResult.reasons : undefined
      };
      this.consensusSnapshots += 1;
      if (consensusResult.accepted) {
        this.consensusAccepted += 1;
        this.consensusLowConfidence = false;
        this.consensusLockActive = false;
      } else {
        this.consensusLowConfidence = true;
        this.consensusLockActive = true;
      }
    }

    const gate = decideConfirmationGate(
      {
        turn: input.turn,
        risk_level: input.risk_level,
        action: stabilizedAction,
        confidence: scoreResult.confidence,
        high_reasoning_available: this.policy.route.high_reasoning_available,
        consensus_snapshot: consensusResult,
        consensus_lock_active: this.consensusLockActive
      },
      this.policy
    );

    if (stabilizedAction === 'pass') {
      this.overrideStreak = 0;
    } else {
      this.overrideStreak += 1;
    }

    const intentChange = deriveIntentChange({
      intent: input.intent,
      contradictions,
      risk_level: input.risk_level
    });
    this.intentVersion = incrementIntentVersion(this.intentVersion, intentChange);
    this.intentSnapshot = this.buildIntentSnapshot({
      evidence_refs: input.evidence_refs,
      confidence: scoreResult.confidence,
      intent: input.intent,
      contradictions
    });

    const enforceBlock = this.enforce && stabilizedAction === 'block_escalate';
    const enforceReason = enforceBlock
      ? gate.requires_confirmation
        ? 'block_and_confirmation_required'
        : 'block_escalate'
      : undefined;

    const decision: RlmAlignmentDecision = {
      turn: input.turn,
      action: stabilizedAction,
      score: scoreResult.score,
      confidence: scoreResult.confidence,
      risk_level: input.risk_level,
      policy_band: scoreResult.policy_band,
      route_model: routeModel,
      route_strategy: routeStrategy,
      deep_audit: deepAudit.triggered,
      deep_audit_reasons: deepAudit.reasons.length > 0 ? deepAudit.reasons : undefined,
      requires_confirmation: gate.requires_confirmation,
      confidence_gate_passed: gate.confidence_gate_passed,
      intent_version: this.intentVersion,
      intent_change: intentChange,
      dimensions: scoreResult.dimensions,
      consensus_snapshot: consensusSnapshot,
      enforcement_blocked: enforceBlock,
      enforcement_reason: enforceReason
    };

    const scoreMetadata = {
      action: decision.action,
      score: decision.score,
      confidence: decision.confidence,
      requires_confirmation: decision.requires_confirmation,
      risk_level: decision.risk_level
    };
    const turnKey = `${await this.ensureIngestionRunKey()}:turn:${input.turn}`;

    await this.appendLedgerEvent({
      thread_id: this.threadId,
      task_id: this.taskId,
      run_id: this.runId,
      agent_id: this.agentId,
      event_type: 'intent_update',
      intent_version: this.intentVersion.label,
      payload: {
        turn: input.turn,
        intent_change: intentChange,
        snapshot: this.intentSnapshot
      },
      score_metadata: scoreMetadata,
      provenance: {
        source: 'alignment_checker',
        route_strategy: routeStrategy,
        route_model: routeModel
      },
      idempotency_key: `${turnKey}:intent`
    });

    await this.appendLedgerEvent({
      thread_id: this.threadId,
      task_id: this.taskId,
      run_id: this.runId,
      agent_id: this.agentId,
      event_type: deepAudit.triggered ? 'deep_audit' : 'sentinel',
      intent_version: this.intentVersion.label,
      payload: {
        turn: input.turn,
        planner_errors: input.planner_errors,
        deep_audit_reasons: deepAudit.reasons,
        route_strategy: routeStrategy,
        route_model: routeModel,
        gate_reasons: gate.reasons
      },
      score_metadata: scoreMetadata,
      provenance: {
        source: 'alignment_checker',
        route_strategy: routeStrategy,
        route_model: routeModel
      },
      idempotency_key: `${turnKey}:check`
    });

    if (consensusSnapshot) {
      await this.appendLedgerEvent({
        thread_id: this.threadId,
        task_id: this.taskId,
        run_id: this.runId,
        agent_id: this.agentId,
        event_type: 'consensus_snapshot',
        intent_version: this.intentVersion.label,
        payload: { ...consensusSnapshot },
        score_metadata: scoreMetadata,
        provenance: {
          source: 'alignment_checker',
          route_strategy: 'arbitration',
          route_model: this.policy.route.arbitration_model
        },
        idempotency_key: `${turnKey}:consensus`
      });
    }

    this.turnsEvaluated += 1;
    this.actionCounts[decision.action] += 1;
    this.routeCounts[routeStrategy] += 1;
    if (decision.deep_audit) {
      this.deepAuditCount += 1;
    }
    if (decision.requires_confirmation) {
      this.requiresConfirmationCount += 1;
    }

    return {
      decision,
      enforce_block: enforceBlock,
      enforce_reason: enforceReason
    };
  }

  async finalize(): Promise<RlmAlignmentFinalSummary | undefined> {
    if (!this.enabled) {
      return undefined;
    }

    const turns = Math.max(1, this.turnsEvaluated);
    const overrideCount =
      this.actionCounts.nudge + this.actionCounts.replan + this.actionCounts.block_escalate;
    const overrideRate = round2(overrideCount / turns);
    const consensusAcceptanceRate =
      this.consensusSnapshots === 0 ? 0 : round2(this.consensusAccepted / this.consensusSnapshots);
    const rollbackRecommended =
      this.actionCounts.block_escalate > 0 ||
      (this.consensusSnapshots > 0 && consensusAcceptanceRate < 0.8);

    const summary: RlmAlignmentFinalSummary = {
      enabled: true,
      enforce: this.enforce,
      turns_evaluated: this.turnsEvaluated,
      deep_audit_count: this.deepAuditCount,
      requires_confirmation_count: this.requiresConfirmationCount,
      override_rate: overrideRate,
      consensus_acceptance_rate: consensusAcceptanceRate,
      action_counts: { ...this.actionCounts },
      route_counts: { ...this.routeCounts },
      intent_version: this.intentVersion,
      rollback_recommended: rollbackRecommended,
      ledger: this.ledger.summary()
    };

    await this.appendLedgerEvent({
      thread_id: this.threadId,
      task_id: this.taskId,
      run_id: this.runId,
      agent_id: this.agentId,
      event_type: 'final_summary',
      intent_version: this.intentVersion.label,
      payload: { ...summary },
      score_metadata: {
        action: 'final_summary',
        score: null,
        confidence: null,
        requires_confirmation: false,
        risk_level: null
      },
      provenance: {
        source: 'alignment_checker',
        route_strategy: 'sentinel',
        route_model: this.policy.route.sentinel_model
      },
      idempotency_key: `${await this.ensureIngestionRunKey()}:final`
    });

    await this.markIngestionSessionCompleted();

    return {
      ...summary,
      ledger: this.ledger.summary()
    };
  }
}

export const __test__ = {
  actionFromScore,
  moreSevereAction,
  incrementIntentVersion,
  deriveIntentChange,
  hashLedgerEvent,
  resolvePolicy,
  buildProjection
};
