import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  type ReviewShellDialect,
  type ReviewShellEnvInterpreterDependencies,
  type ReviewShellEnvState,
  buildCommandEnvAssignments,
  buildNestedShellEnvState,
  collectInlineEnvAssignments,
  createEmptyReviewShellEnvState,
  updateReviewShellEnvStateForSegment
} from './review-shell-env-interpreter.js';
import {
  type ShellControlSeparator,
  extractShellCommandPayload,
  inferStaticShellTruthiness,
  normalizeCommandToken,
  segmentRunsInParentShell,
  separatorCarriesParentShellStateForward,
  splitShellControlSegments,
  splitShellControlSegmentsDetailed,
  stripLeadingEnvAssignments,
  tokenizeShellSegment,
  unwrapEnvCommandTokens
} from './review-shell-command-parser.js';
import {
  ARCHITECTURE_CONTEXT_META_SURFACE_KIND,
  classifyMetaSurfaceDirectDetailed,
  classifyActiveCloseoutBundleCandidate,
  expandMetaSurfaceOperandCandidates,
  extractMetaSurfaceOperands,
  isTouchedReviewScopePathFamilyOperand,
  isTouchedScopePath,
  normalizeActiveCloseoutBundleRoot,
  normalizeAuditMetaSurfaceEnvVar,
  normalizeAuditMetaSurfaceEnvVarPathMap,
  normalizeAuditStartupAnchorPath,
  normalizeScopePath,
  normalizeScopeRoot,
  resolveGitInvocation,
  segmentMatchesAuditStartupAnchorPath
} from './review-meta-surface-normalization.js';
import {
  classifyShellProbeCommandLine,
  detectHeavyReviewCommand,
  isLikelyReviewCommandLine
} from './review-command-probe-classification.js';
import {
  type ReviewCommandIntentViolation,
  type ReviewCommandIntentViolationKind,
  classifyCommandIntentCommandLine,
  classifyCommandIntentToolLine,
  formatCommandIntentViolationLabel,
  isReviewOrchestrationCommand
} from './review-command-intent-classification.js';
import { extractInspectionTargets } from './review-inspection-target-parsing.js';

const REVIEW_DELEGATION_STARTUP_LINE_RE = /\bmcp:\s*delegation\s+(starting|ready)\b/i;
const REVIEW_PROGRESS_SIGNAL_LINE_RE = /^(thinking|exec|codex)\b/i;
const DEFAULT_REVIEW_OUTPUT_PREVIEW_LIMIT = 32_768;
const DEFAULT_REVIEW_OUTPUT_SUMMARY_TAIL_LINE_LIMIT = 20;
const DEFAULT_REVIEW_OUTPUT_SUMMARY_HEAVY_COMMAND_LIMIT = 8;
const DEFAULT_REVIEW_OUTPUT_SUMMARY_COMMAND_LIMIT = 64;
const DEFAULT_LOW_SIGNAL_TIMEOUT_MS = 180_000;
const DEFAULT_VERDICT_STABILITY_TIMEOUT_MS = 180_000;
const DEFAULT_META_SURFACE_TIMEOUT_MS = 180_000;
const REVIEW_ACTIVE_CLOSEOUT_BUNDLE_KIND = 'review-closeout-bundle';
const RELEVANT_REINSPECTION_MIN_COMMAND_STARTS = 8;
const RELEVANT_REINSPECTION_BASE_MAX_DISTINCT_TARGETS = 4;
const RELEVANT_REINSPECTION_MIN_REPEAT_TARGET_HITS = 3;
const STARTUP_ANCHOR_META_SURFACE_SIGNAL_BUDGET = 1;
const STARTUP_ANCHOR_ALLOWED_META_SURFACE_KINDS = new Set(['review-support']);
export const ARCHITECTURE_ALLOWED_META_SURFACE_KINDS = [
  ARCHITECTURE_CONTEXT_META_SURFACE_KIND,
  'review-support',
  'review-docs'
] as const;
export const AUDIT_ALLOWED_META_SURFACE_KINDS = ['run-manifest', 'run-runner-log'] as const;
const AUDIT_ALLOWED_META_SURFACE_KIND_SET = new Set<string>(AUDIT_ALLOWED_META_SURFACE_KINDS);
const ALLOWED_META_SURFACE_KIND_SET = new Set<string>([
  ...AUDIT_ALLOWED_META_SURFACE_KINDS,
  ...ARCHITECTURE_ALLOWED_META_SURFACE_KINDS
]);
const COMMAND_LEVEL_ALLOWED_META_SURFACE_KIND_SET = new Set<string>(
  ARCHITECTURE_ALLOWED_META_SURFACE_KINDS
);
const LOW_SIGNAL_MIN_THINKING_BLOCKS = 10;
const LOW_SIGNAL_MIN_COMMAND_STARTS = 10;
const LOW_SIGNAL_MAX_DISTINCT_TARGETS = 4;
const LOW_SIGNAL_MIN_REPEAT_TARGET_HITS = 3;
const LOW_SIGNAL_MIN_REPEAT_SIGNATURE_HITS = 4;
const LOW_SIGNAL_RECENT_COMMAND_WINDOW = LOW_SIGNAL_MIN_COMMAND_STARTS;
const VERDICT_STABILITY_MIN_THINKING_BLOCKS = 4;
const VERDICT_STABILITY_MIN_COMMAND_STARTS = 4;
const VERDICT_STABILITY_MIN_OUTPUT_TARGET_SIGNALS = 4;
const VERDICT_STABILITY_MIN_OUTPUT_NARRATIVE_SIGNALS = 4;
const VERDICT_STABILITY_MAX_DISTINCT_OUTPUT_TARGETS = 4;
const VERDICT_STABILITY_MAX_DISTINCT_OUTPUT_SIGNATURES = 8;
const VERDICT_STABILITY_MIN_REPEAT_OUTPUT_TARGET_HITS = 2;
const VERDICT_STABILITY_MIN_REPEAT_OUTPUT_SIGNATURE_HITS = 2;
const VERDICT_STABILITY_RECENT_OUTPUT_WINDOW = 16;
const META_SURFACE_MIN_COMMAND_STARTS = 6;
const META_SURFACE_MIN_SIGNALS = 4;
const META_SURFACE_MIN_DISTINCT_SURFACES = 3;
const META_SURFACE_MIN_REPEAT_HITS = 2;
const META_SURFACE_RECENT_SIGNAL_WINDOW = 8;
const REVIEW_NARRATIVE_INSPECTION_MIN_LINE_LENGTH = 32;
const REVIEW_SPECULATIVE_NARRATIVE_LINE_RE =
  /^(?:I\b|I['’]m\b|It\s+(?:might|may|seems|feels)\b|Maybe\b|Perhaps\b)/iu;
const REVIEW_META_SURFACE_DELEGATION_TOOL_LINE_RE =
  /^tool\s+delegation\.delegate\.(?:spawn|status|pause|cancel)\(/iu;
const REVIEW_COMMAND_INTENT_VIOLATION_SAMPLE_LIMIT = 8;
export type { ReviewCommandIntentViolationKind } from './review-command-intent-classification.js';
export type ReviewTerminationBoundaryKind =
  | 'timeout'
  | 'stall'
  | 'command-intent'
  | 'shell-probe'
  | 'startup-loop'
  | 'active-closeout-bundle-reread'
  | 'startup-anchor'
  | 'meta-surface-expansion'
  | 'verdict-stability'
  | 'relevant-reinspection-dwell';
export type ReviewTerminationBoundaryProvenance =
  | 'review-timeout'
  | 'output-stall'
  | ReviewCommandIntentViolationKind
  | 'direct-shell-verification'
  | 'delegation-startup-loop'
  | 'active-closeout-self-reference-search'
  | 'pre-anchor-meta-surface'
  | 'meta-surface-kinds'
  | 'repeated-output-inspection'
  | 'targetless-speculative-narrative'
  | 'post-startup-anchor'
  | 'bounded-surface';

export type ReviewScopeMode = 'uncommitted' | 'base' | 'commit';
export type ReviewStartupAnchorMode = 'diff' | 'audit';

export interface ReviewOutputSummary {
  lineCount: number;
  commandStarts: string[];
  completionCount: number;
  startupEvents: number;
  reviewProgressSignals: number;
  thinkingBlocks: number;
  heavyCommandStarts: string[];
  distinctInspectionTargets: number;
  maxInspectionTargetHits: number;
  distinctInspectionSignatures: number;
  maxInspectionSignatureHits: number;
  outputInspectionSignals: number;
  outputNarrativeSignals: number;
  concreteOutputSignals: number;
  distinctOutputInspectionTargets: number;
  maxOutputInspectionTargetHits: number;
  distinctOutputNarrativeSignatures: number;
  maxOutputNarrativeSignatureHits: number;
  metaSurfaceSignals: number;
  distinctMetaSurfaces: number;
  maxMetaSurfaceHits: number;
  metaSurfaceKinds: string[];
  startupAnchorObserved: boolean;
  preAnchorCommandStarts: number;
  preAnchorMetaSurfaceSignals: number;
  preAnchorDistinctMetaSurfaces: number;
  preAnchorMetaSurfaceKinds: string[];
  commandIntentViolationCount: number;
  commandIntentViolationKinds: ReviewCommandIntentViolationKind[];
  commandIntentViolationSamples: string[];
  shellProbeCount: number;
  lastLines: string[];
}

export interface ReviewStartupLoopState {
  startupEvents: number;
  reviewProgressObserved: boolean;
}

export interface ReviewExecutionSnapshot extends ReviewStartupLoopState {
  startedAtMs: number;
  lastOutputAtMs: number;
  elapsedMs: number;
  idleMs: number;
  awaitingCommandLine: boolean;
  blockedHeavyCommand: string | null;
  summary: ReviewOutputSummary;
}

export interface ReviewLowSignalDriftState {
  triggered: boolean;
  reason: string | null;
  thinkingBlocks: number;
  commandStarts: number;
  distinctInspectionTargets: number;
  maxInspectionTargetHits: number;
  distinctInspectionSignatures: number;
  maxInspectionSignatureHits: number;
  timeoutMs: number | null;
}

export interface ReviewVerdictStabilityState {
  triggered: boolean;
  reason: string | null;
  thinkingBlocks: number;
  commandStarts: number;
  outputInspectionSignals: number;
  outputNarrativeSignals: number;
  concreteOutputSignals: number;
  distinctOutputInspectionTargets: number;
  maxOutputInspectionTargetHits: number;
  distinctOutputNarrativeSignatures: number;
  maxOutputNarrativeSignatureHits: number;
  timeoutMs: number | null;
}

export interface ReviewMetaSurfaceExpansionState {
  triggered: boolean;
  reason: string | null;
  commandStarts: number;
  metaSurfaceSignals: number;
  distinctMetaSurfaces: number;
  maxMetaSurfaceHits: number;
  timeoutMs: number | null;
}

export interface ReviewStartupAnchorBoundaryState {
  triggered: boolean;
  reason: string | null;
  anchorObserved: boolean;
  preAnchorCommandStarts: number;
  preAnchorMetaSurfaceSignals: number;
  preAnchorDistinctMetaSurfaces: number;
  preAnchorMetaSurfaceKinds: string[];
}

export interface ReviewCommandIntentBoundaryState {
  triggered: boolean;
  reason: string | null;
  violationKind: ReviewCommandIntentViolationKind | null;
  violationSample: string | null;
  violationCount: number;
  violationKinds: ReviewCommandIntentViolationKind[];
}

export interface ReviewShellProbeBoundaryState {
  triggered: boolean;
  reason: string | null;
  probeCount: number;
  violationSample: string | null;
}

interface ReviewActiveCloseoutBundleRereadViolation {
  sample: string;
  detectedAtMs: number;
  rereadCount: number;
}

export interface ReviewActiveCloseoutBundleRereadBoundaryState {
  triggered: boolean;
  reason: string | null;
  rereadCount: number;
  violationSample: string | null;
  anchorObserved: boolean;
}

interface ReviewRelevantReinspectionDwellViolation {
  sample: string | null;
  detectedAtMs: number;
  commandStarts: number;
  distinctTargets: number;
  maxTargetHits: number;
}

export interface ReviewRelevantReinspectionDwellBoundaryState {
  triggered: boolean;
  reason: string | null;
  anchorObserved: boolean;
  commandStarts: number;
  distinctTargets: number;
  maxTargetHits: number;
  metaSurfaceSignals: number;
  concreteOutputSignals: number;
  violationSample: string | null;
}

export interface ReviewTerminationBoundaryRecord {
  kind: ReviewTerminationBoundaryKind;
  provenance: ReviewTerminationBoundaryProvenance;
  reason: string;
  sample: string | null;
}

export interface ReviewExecutionStateOptions {
  blockHeavyCommands?: boolean;
  allowValidationCommandIntents?: boolean;
  activeCloseoutBundleRoots?: string[];
  startedAtMs?: number;
  previewLimit?: number;
  tailLineLimit?: number;
  heavyCommandLimit?: number;
  commandLimit?: number;
  lowSignalTimeoutMs?: number | null;
  verdictStabilityTimeoutMs?: number | null;
  metaSurfaceTimeoutMs?: number | null;
  allowedMetaSurfaceKinds?: string[];
  touchedPaths?: string[];
  enforceStartupAnchorBoundary?: boolean;
  enforceActiveCloseoutBundleRereadBoundary?: boolean;
  enforceRelevantReinspectionDwellBoundary?: boolean;
  scopeMode?: ReviewScopeMode;
  startupAnchorMode?: ReviewStartupAnchorMode | null;
  repoRoot?: string;
  auditStartupAnchorPaths?: string[];
  allowedMetaSurfacePaths?: string[];
  allowedMetaSurfaceEnvVars?: string[];
  auditStartupAnchorEnvVarPaths?: Record<string, string>;
  allowedMetaSurfaceEnvVarPaths?: Record<string, string>;
}

interface ReviewExecutionTelemetryPayloadOptions {
  status: 'succeeded' | 'failed';
  error?: string | null;
  terminationBoundary?: ReviewTerminationBoundaryRecord | null;
  outputLogPath: string;
  repoRoot: string;
  includeRawTelemetry: boolean;
  telemetryDebugEnvKey: string;
}

export interface PersistReviewTelemetryOptions extends ReviewExecutionTelemetryPayloadOptions {
  telemetryPath: string;
  state: ReviewExecutionState;
}

export interface ReviewTelemetryPayload {
  version: number;
  generated_at: string;
  status: 'succeeded' | 'failed';
  error: string | null;
  output_log_path: string;
  termination_boundary: ReviewTerminationBoundaryRecord | null;
  summary: ReviewOutputSummary;
}

export interface LogReviewTelemetryOptions {
  debugTelemetry: boolean;
  telemetryDebugEnvKey: string;
}

type ReviewExecutionStream = 'stdout' | 'stderr';

interface PendingFragmentsByStream {
  stdout: string;
  stderr: string;
}

interface ReviewShellProbeViolation {
  sample: string;
  detectedAtMs: number;
}

export class ReviewExecutionState {
  private readonly startedAtMs: number;
  private readonly blockHeavyCommands: boolean;
  private readonly allowValidationCommandIntents: boolean;
  private readonly activeCloseoutBundleRoots: Set<string>;
  private readonly previewLimit: number;
  private readonly tailLineLimit: number;
  private readonly heavyCommandLimit: number;
  private readonly commandLimit: number;
  private readonly lowSignalTimeoutMs: number | null;
  private readonly verdictStabilityTimeoutMs: number | null;
  private readonly metaSurfaceTimeoutMs: number | null;
  private readonly allowedMetaSurfaceKinds: Set<string>;
  private readonly touchedPaths: Set<string>;
  private readonly enforceStartupAnchorBoundary: boolean;
  private readonly enforceActiveCloseoutBundleRereadBoundary: boolean;
  private readonly enforceRelevantReinspectionDwellBoundary: boolean;
  private readonly startupAnchorScopeMode: ReviewScopeMode;
  private readonly startupAnchorMode: ReviewStartupAnchorMode | null;
  private readonly repoRoot: string | null;
  private readonly auditStartupAnchorPaths: Set<string>;
  private readonly auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string>;
  private readonly allowedMetaSurfacePaths: Set<string>;
  private readonly allowedMetaSurfaceEnvVars: Set<string>;
  private readonly allowedMetaSurfaceEnvVarPaths: ReadonlyMap<string, string>;

  private lastOutputAtMs: number;
  private preview = '';
  private lineCount = 0;
  private completionCount = 0;
  private startupEvents = 0;
  private reviewProgressSignals = 0;
  private thinkingBlocks = 0;
  private reviewProgressObserved = false;
  private startupAnchorObserved = false;
  private awaitingCommandLine = false;
  private blockedHeavyCommand: string | null = null;
  private lowSignalCandidateSinceMs: number | null = null;
  private verdictStabilityCandidateSinceMs: number | null = null;
  private metaSurfaceCandidateSinceMs: number | null = null;
  private relevantReinspectionDwellCandidateSinceMs: number | null = null;
  private startupAnchorViolationAtMs: number | null = null;
  private preAnchorCommandStarts = 0;
  private readonly commandStarts: string[] = [];
  private readonly heavyCommandStarts: string[] = [];
  private readonly recentInspectionTargetSamples: string[][] = [];
  private readonly recentInspectionSignatures: string[] = [];
  private readonly recentOutputInspectionTargetSamples: Array<string[] | null> = [];
  private readonly recentOutputNarrativeSignatures: Array<string | null> = [];
  private readonly recentConcreteOutputTargetSamples: Array<string[] | null> = [];
  private readonly recentMetaSurfaceSamples: Array<string | null> = [];
  private readonly preAnchorMetaSurfaceSamples: string[] = [];
  private readonly commandIntentViolationSamples: ReviewCommandIntentViolation[] = [];
  private readonly shellProbeSamples: string[] = [];
  private readonly lastLines: string[] = [];
  private readonly pendingFragmentsByStream: PendingFragmentsByStream = {
    stdout: '',
    stderr: ''
  };
  private commandIntentViolation: ReviewCommandIntentViolation | null = null;
  private shellProbeViolation: ReviewShellProbeViolation | null = null;
  private activeCloseoutBundleRereadViolation: ReviewActiveCloseoutBundleRereadViolation | null = null;
  private relevantReinspectionDwellViolation: ReviewRelevantReinspectionDwellViolation | null = null;
  private activeCloseoutBundleRereadCount = 0;
  private shellProbeCount = 0;
  private lastInspectionCommandLine: string | null = null;

  constructor(options: ReviewExecutionStateOptions = {}) {
    this.startedAtMs = options.startedAtMs ?? Date.now();
    this.lastOutputAtMs = this.startedAtMs;
    this.blockHeavyCommands = options.blockHeavyCommands ?? false;
    this.allowValidationCommandIntents = options.allowValidationCommandIntents ?? false;
    this.previewLimit = options.previewLimit ?? DEFAULT_REVIEW_OUTPUT_PREVIEW_LIMIT;
    this.tailLineLimit = options.tailLineLimit ?? DEFAULT_REVIEW_OUTPUT_SUMMARY_TAIL_LINE_LIMIT;
    this.heavyCommandLimit =
      options.heavyCommandLimit ?? DEFAULT_REVIEW_OUTPUT_SUMMARY_HEAVY_COMMAND_LIMIT;
    this.commandLimit = options.commandLimit ?? DEFAULT_REVIEW_OUTPUT_SUMMARY_COMMAND_LIMIT;
    const configuredLowSignalTimeoutMs = options.lowSignalTimeoutMs;
    this.lowSignalTimeoutMs =
      configuredLowSignalTimeoutMs === undefined
        ? DEFAULT_LOW_SIGNAL_TIMEOUT_MS
        : configuredLowSignalTimeoutMs === null || configuredLowSignalTimeoutMs <= 0
        ? null
        : configuredLowSignalTimeoutMs;
    const configuredVerdictStabilityTimeoutMs = options.verdictStabilityTimeoutMs;
    this.verdictStabilityTimeoutMs =
      configuredVerdictStabilityTimeoutMs === undefined
        ? DEFAULT_VERDICT_STABILITY_TIMEOUT_MS
        : configuredVerdictStabilityTimeoutMs === null || configuredVerdictStabilityTimeoutMs <= 0
        ? null
        : configuredVerdictStabilityTimeoutMs;
    const configuredMetaSurfaceTimeoutMs = options.metaSurfaceTimeoutMs;
    this.metaSurfaceTimeoutMs =
      configuredMetaSurfaceTimeoutMs === undefined
        ? DEFAULT_META_SURFACE_TIMEOUT_MS
        : configuredMetaSurfaceTimeoutMs === null || configuredMetaSurfaceTimeoutMs <= 0
        ? null
        : configuredMetaSurfaceTimeoutMs;
    this.allowedMetaSurfaceKinds = new Set(
      (options.allowedMetaSurfaceKinds ?? []).filter((kind) =>
        ALLOWED_META_SURFACE_KIND_SET.has(kind)
      )
    );
    this.repoRoot = normalizeScopeRoot(options.repoRoot);
    this.touchedPaths = new Set(
      (options.touchedPaths ?? []).map((entry) => normalizeScopePath(entry)).filter(Boolean)
    );
    this.activeCloseoutBundleRoots = new Set(
      (options.activeCloseoutBundleRoots ?? [])
        .map((entry) => normalizeActiveCloseoutBundleRoot(entry, this.repoRoot))
        .filter((entry): entry is string => Boolean(entry))
    );
    this.startupAnchorMode = options.startupAnchorMode ?? null;
    this.auditStartupAnchorPaths = new Set(
      (options.auditStartupAnchorPaths ?? [])
        .map((entry) => normalizeAuditStartupAnchorPath(entry, this.repoRoot))
        .filter((entry): entry is string => Boolean(entry))
    );
    this.auditStartupAnchorEnvVarPaths = normalizeAuditMetaSurfaceEnvVarPathMap(
      options.auditStartupAnchorEnvVarPaths,
      this.repoRoot
    );
    this.allowedMetaSurfacePaths = new Set(
      (options.allowedMetaSurfacePaths ?? [])
        .map((entry) => normalizeAuditStartupAnchorPath(entry, this.repoRoot))
        .filter((entry): entry is string => Boolean(entry))
    );
    this.allowedMetaSurfaceEnvVars = new Set(
      (options.allowedMetaSurfaceEnvVars ?? [])
        .map((entry) => entry.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase())
        .filter((entry) => entry.length > 0)
    );
    this.allowedMetaSurfaceEnvVarPaths = normalizeAuditMetaSurfaceEnvVarPathMap(
      options.allowedMetaSurfaceEnvVarPaths,
      this.repoRoot
    );
    this.enforceStartupAnchorBoundary =
      (options.enforceStartupAnchorBoundary ?? false) &&
      (this.startupAnchorMode === 'audit' || this.touchedPaths.size > 0);
    this.enforceActiveCloseoutBundleRereadBoundary =
      (options.enforceActiveCloseoutBundleRereadBoundary ?? this.enforceStartupAnchorBoundary) &&
      this.activeCloseoutBundleRoots.size > 0;
    this.enforceRelevantReinspectionDwellBoundary =
      (options.enforceRelevantReinspectionDwellBoundary ?? this.enforceStartupAnchorBoundary) &&
      this.touchedPaths.size > 0;
    this.startupAnchorScopeMode = options.scopeMode ?? 'uncommitted';
  }

  observeChunk(chunk: Buffer | string, stream: ReviewExecutionStream, nowMs = Date.now()): void {
    const next = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
    this.lastOutputAtMs = nowMs;
    if (this.preview.length < this.previewLimit) {
      this.preview = `${this.preview}${next}`.slice(0, this.previewLimit);
    }

    const combined = `${this.pendingFragmentsByStream[stream]}${next}`;
    const lines = combined.split(/\r?\n/u);
    this.pendingFragmentsByStream[stream] = lines.pop() ?? '';
    for (const line of lines) {
      this.processLine(line, nowMs);
    }
  }

  getPreview(): string {
    return this.preview;
  }

  getBlockedHeavyCommand(): string | null {
    return this.blockedHeavyCommand;
  }

  getLastOutputAtMs(): number {
    return this.lastOutputAtMs;
  }

  getStartupLoopState(): ReviewStartupLoopState {
    return {
      startupEvents: this.startupEvents,
      reviewProgressObserved: this.reviewProgressObserved
    };
  }

  buildOutputSummary(): ReviewOutputSummary {
    const inspectionTargetSummary = this.buildInspectionTargetSummary();
    const outputNarrativeSummary = this.buildOutputNarrativeSummary();
    const preAnchorMetaSurfaceSummary = this.buildPreAnchorMetaSurfaceSummary();
    return {
      lineCount: this.lineCount,
      commandStarts: [...this.commandStarts],
      completionCount: this.completionCount,
      startupEvents: this.startupEvents,
      reviewProgressSignals: this.reviewProgressSignals,
      thinkingBlocks: this.thinkingBlocks,
      heavyCommandStarts: [...this.heavyCommandStarts],
      distinctInspectionTargets: inspectionTargetSummary.distinctTargets,
      maxInspectionTargetHits: inspectionTargetSummary.maxHits,
      distinctInspectionSignatures: inspectionTargetSummary.distinctSignatures,
      maxInspectionSignatureHits: inspectionTargetSummary.maxSignatureHits,
      outputInspectionSignals: outputNarrativeSummary.outputInspectionSignals,
      outputNarrativeSignals: outputNarrativeSummary.outputNarrativeSignals,
      concreteOutputSignals: outputNarrativeSummary.concreteOutputSignals,
      distinctOutputInspectionTargets: outputNarrativeSummary.distinctOutputTargets,
      maxOutputInspectionTargetHits: outputNarrativeSummary.maxOutputTargetHits,
      distinctOutputNarrativeSignatures: outputNarrativeSummary.distinctNarrativeSignatures,
      maxOutputNarrativeSignatureHits: outputNarrativeSummary.maxNarrativeSignatureHits,
      metaSurfaceSignals: inspectionTargetSummary.metaSurfaceSignals,
      distinctMetaSurfaces: inspectionTargetSummary.distinctMetaSurfaces,
      maxMetaSurfaceHits: inspectionTargetSummary.maxMetaSurfaceHits,
      metaSurfaceKinds: inspectionTargetSummary.metaSurfaceKinds,
      startupAnchorObserved: this.startupAnchorObserved,
      preAnchorCommandStarts: this.preAnchorCommandStarts,
      preAnchorMetaSurfaceSignals: preAnchorMetaSurfaceSummary.signals,
      preAnchorDistinctMetaSurfaces: preAnchorMetaSurfaceSummary.distinctSurfaces,
      preAnchorMetaSurfaceKinds: preAnchorMetaSurfaceSummary.kinds,
      commandIntentViolationCount: this.commandIntentViolationSamples.length,
      commandIntentViolationKinds: [
        ...new Set(this.commandIntentViolationSamples.map((sample) => sample.kind))
      ].sort(),
      commandIntentViolationSamples: this.commandIntentViolationSamples.map(
        (sample) => `[${sample.kind}] ${sample.sample}`
      ),
      shellProbeCount: this.shellProbeCount,
      lastLines: [...this.lastLines]
    };
  }

  getLowSignalDriftState(nowMs = Date.now()): ReviewLowSignalDriftState {
    const summary = this.buildOutputSummary();
    const triggered =
      this.lowSignalTimeoutMs !== null &&
      this.lowSignalCandidateSinceMs !== null &&
      Math.max(0, nowMs - this.lowSignalCandidateSinceMs) >= this.lowSignalTimeoutMs;
    return {
      triggered,
      reason: triggered
        ? `low-signal review drift detected after ${formatDurationMs(
            Math.max(0, nowMs - this.startedAtMs)
          )}: ${this.thinkingBlocks} thinking blocks, ${this.commandStarts.length} command starts, ${summary.distinctInspectionTargets} repeated inspection targets (max hit count ${summary.maxInspectionTargetHits}), ${summary.distinctInspectionSignatures} repeated inspection signatures (max hit count ${summary.maxInspectionSignatureHits}), sustained for ${formatDurationMs(Math.max(0, nowMs - this.lowSignalCandidateSinceMs!))}.`
        : null,
      thinkingBlocks: this.thinkingBlocks,
      commandStarts: this.commandStarts.length,
      distinctInspectionTargets: summary.distinctInspectionTargets,
      maxInspectionTargetHits: summary.maxInspectionTargetHits,
      distinctInspectionSignatures: summary.distinctInspectionSignatures,
      maxInspectionSignatureHits: summary.maxInspectionSignatureHits,
      timeoutMs: this.lowSignalTimeoutMs
    };
  }

  getVerdictStabilityState(nowMs = Date.now()): ReviewVerdictStabilityState {
    const summary = this.buildOutputSummary();
    const triggered =
      this.verdictStabilityTimeoutMs !== null &&
      this.verdictStabilityCandidateSinceMs !== null &&
      Math.max(0, nowMs - this.verdictStabilityCandidateSinceMs) >=
        this.verdictStabilityTimeoutMs;
    return {
      triggered,
      reason: triggered
        ? summary.distinctOutputInspectionTargets > 0
          ? `bounded review verdict-stability drift detected after ${formatDurationMs(
              Math.max(0, nowMs - this.startedAtMs)
            )}: ${this.thinkingBlocks} thinking blocks, ${this.commandStarts.length} command starts, ${summary.outputInspectionSignals} repeated output inspection signals across ${summary.distinctOutputInspectionTargets} target(s) (max hit count ${summary.maxOutputInspectionTargetHits}), ${summary.distinctOutputNarrativeSignatures} repeated narrative signature(s) (max hit count ${summary.maxOutputNarrativeSignatureHits}), sustained for ${formatDurationMs(Math.max(0, nowMs - this.verdictStabilityCandidateSinceMs!))}.`
          : `bounded review verdict-stability drift detected after ${formatDurationMs(
              Math.max(0, nowMs - this.startedAtMs)
            )}: ${this.thinkingBlocks} thinking blocks, ${this.commandStarts.length} command starts, ${summary.outputNarrativeSignals} repeated speculative narrative signal(s) with no concrete output targets, ${summary.distinctOutputNarrativeSignatures} repeated narrative signature(s) (max hit count ${summary.maxOutputNarrativeSignatureHits}), sustained for ${formatDurationMs(Math.max(0, nowMs - this.verdictStabilityCandidateSinceMs!))}.`
        : null,
      thinkingBlocks: this.thinkingBlocks,
      commandStarts: this.commandStarts.length,
      outputInspectionSignals: summary.outputInspectionSignals,
      outputNarrativeSignals: summary.outputNarrativeSignals,
      concreteOutputSignals: summary.concreteOutputSignals,
      distinctOutputInspectionTargets: summary.distinctOutputInspectionTargets,
      maxOutputInspectionTargetHits: summary.maxOutputInspectionTargetHits,
      distinctOutputNarrativeSignatures: summary.distinctOutputNarrativeSignatures,
      maxOutputNarrativeSignatureHits: summary.maxOutputNarrativeSignatureHits,
      timeoutMs: this.verdictStabilityTimeoutMs
    };
  }

  getMetaSurfaceExpansionState(nowMs = Date.now()): ReviewMetaSurfaceExpansionState {
    const summary = this.buildOutputSummary();
    const activeCloseoutBundleRereadTriggered =
      this.enforceActiveCloseoutBundleRereadBoundary &&
      this.activeCloseoutBundleRereadViolation !== null;
    const triggered =
      !activeCloseoutBundleRereadTriggered &&
      this.metaSurfaceTimeoutMs !== null &&
      this.metaSurfaceCandidateSinceMs !== null &&
      Math.max(0, nowMs - this.metaSurfaceCandidateSinceMs) >= this.metaSurfaceTimeoutMs;
    return {
      triggered,
      reason: triggered
        ? `bounded review meta-surface expansion detected after ${formatDurationMs(
            Math.max(0, nowMs - this.startedAtMs)
          )}: ${this.commandStarts.length} command starts, ${summary.metaSurfaceSignals} meta-surface signals, ${summary.distinctMetaSurfaces} distinct meta-surfaces [${summary.metaSurfaceKinds.join(', ')}] (max hit count ${summary.maxMetaSurfaceHits}), sustained for ${formatDurationMs(Math.max(0, nowMs - this.metaSurfaceCandidateSinceMs!))}.`
        : null,
      commandStarts: this.commandStarts.length,
      metaSurfaceSignals: summary.metaSurfaceSignals,
      distinctMetaSurfaces: summary.distinctMetaSurfaces,
      maxMetaSurfaceHits: summary.maxMetaSurfaceHits,
      timeoutMs: this.metaSurfaceTimeoutMs
    };
  }

  getStartupAnchorBoundaryState(nowMs = Date.now()): ReviewStartupAnchorBoundaryState {
    const summary = this.buildOutputSummary();
    const triggered = this.startupAnchorViolationAtMs !== null;
    return {
      triggered,
      reason: triggered
        ? `bounded review startup-anchor boundary violated after ${formatDurationMs(
            Math.max(0, this.startupAnchorViolationAtMs! - this.startedAtMs)
          )}: ${summary.preAnchorCommandStarts} pre-anchor command starts, ${summary.preAnchorMetaSurfaceSignals} pre-anchor meta-surface signals across ${summary.preAnchorDistinctMetaSurfaces} surface kind(s) [${summary.preAnchorMetaSurfaceKinds.join(', ')}] before the first startup anchor.`
        : null,
      anchorObserved: this.startupAnchorObserved,
      preAnchorCommandStarts: summary.preAnchorCommandStarts,
      preAnchorMetaSurfaceSignals: summary.preAnchorMetaSurfaceSignals,
      preAnchorDistinctMetaSurfaces: summary.preAnchorDistinctMetaSurfaces,
      preAnchorMetaSurfaceKinds: summary.preAnchorMetaSurfaceKinds
    };
  }

  getCommandIntentBoundaryState(nowMs = Date.now()): ReviewCommandIntentBoundaryState {
    const summary = this.buildOutputSummary();
    const violation = this.commandIntentViolation;
    return {
      triggered: violation !== null,
      reason: violation
        ? `bounded review command-intent boundary violated after ${formatDurationMs(
            Math.max(0, nowMs - this.startedAtMs)
          )}: ${formatCommandIntentViolationLabel(violation.kind)} via ${violation.sample}.`
        : null,
      violationKind: violation?.kind ?? null,
      violationSample: violation?.sample ?? null,
      violationCount: summary.commandIntentViolationCount,
      violationKinds: summary.commandIntentViolationKinds
    };
  }

  getShellProbeBoundaryState(nowMs = Date.now()): ReviewShellProbeBoundaryState {
    return {
      triggered: this.shellProbeViolation !== null,
      reason: this.shellProbeViolation
        ? `bounded review shell-probe boundary violated after ${formatDurationMs(
            Math.max(0, this.shellProbeViolation.detectedAtMs - this.startedAtMs)
          )}: repeated direct shell verification via ${this.shellProbeViolation.sample}.`
        : null,
      probeCount: this.shellProbeCount,
      violationSample: this.shellProbeViolation?.sample ?? null
    };
  }

  getActiveCloseoutBundleRereadBoundaryState(
    nowMs = Date.now()
  ): ReviewActiveCloseoutBundleRereadBoundaryState {
    return {
      triggered: this.activeCloseoutBundleRereadViolation !== null,
      reason: this.activeCloseoutBundleRereadViolation
        ? `bounded review active-closeout-bundle reread boundary violated after ${formatDurationMs(
            Math.max(0, this.activeCloseoutBundleRereadViolation.detectedAtMs - this.startedAtMs)
          )}: ${this.activeCloseoutBundleRereadViolation.rereadCount} repeated direct reread command(s) into the active closeout bundle after earlier bounded inspection via ${this.activeCloseoutBundleRereadViolation.sample}.`
        : null,
      rereadCount: this.activeCloseoutBundleRereadCount,
      violationSample: this.activeCloseoutBundleRereadViolation?.sample ?? null,
      anchorObserved: this.startupAnchorObserved
    };
  }

  getRelevantReinspectionDwellBoundaryState(
    nowMs = Date.now()
  ): ReviewRelevantReinspectionDwellBoundaryState {
    const summary = this.buildOutputSummary();
    const relevantInspectionSummary = this.buildInspectionTargetSummary(
      this.getRelevantReinspectionWindowSize()
    );
    const derivedTriggered =
      this.relevantReinspectionDwellViolation !== null ||
      (this.enforceRelevantReinspectionDwellBoundary &&
        this.lowSignalTimeoutMs !== null &&
        this.relevantReinspectionDwellCandidateSinceMs !== null &&
        Math.max(0, nowMs - this.relevantReinspectionDwellCandidateSinceMs) >=
          this.lowSignalTimeoutMs);
    const detectedAtMs =
      this.relevantReinspectionDwellViolation?.detectedAtMs ??
      (derivedTriggered && this.relevantReinspectionDwellCandidateSinceMs !== null && this.lowSignalTimeoutMs !== null
        ? this.relevantReinspectionDwellCandidateSinceMs + this.lowSignalTimeoutMs
        : null);
    const violationSample =
      this.relevantReinspectionDwellViolation?.sample ?? this.lastInspectionCommandLine;
    const commandStarts =
      this.relevantReinspectionDwellViolation?.commandStarts ?? this.commandStarts.length;
    const distinctTargets =
      this.relevantReinspectionDwellViolation?.distinctTargets ??
      relevantInspectionSummary.distinctTargets;
    const maxTargetHits =
      this.relevantReinspectionDwellViolation?.maxTargetHits ?? relevantInspectionSummary.maxHits;
    return {
      triggered: derivedTriggered,
      reason: derivedTriggered && detectedAtMs !== null
        ? `bounded review relevant-reinspection dwell boundary violated after ${formatDurationMs(
            Math.max(0, detectedAtMs - this.startedAtMs)
          )}: ${commandStarts} command start(s) repeatedly revisited ${distinctTargets} bounded relevant target(s) (max target hit count ${maxTargetHits}) ${
            this.enforceStartupAnchorBoundary
              ? 'after startup-anchor success'
              : 'within the current bounded review surface'
          } without concrete findings or meta-surface drift${
            violationSample
              ? ` via ${violationSample}`
              : ''
          }.`
        : null,
      anchorObserved: this.startupAnchorObserved,
      commandStarts: this.commandStarts.length,
      distinctTargets: relevantInspectionSummary.distinctTargets,
      maxTargetHits: relevantInspectionSummary.maxHits,
      metaSurfaceSignals: summary.metaSurfaceSignals,
      concreteOutputSignals: summary.concreteOutputSignals,
      violationSample
    };
  }

  snapshot(nowMs = Date.now()): ReviewExecutionSnapshot {
    return {
      startedAtMs: this.startedAtMs,
      lastOutputAtMs: this.lastOutputAtMs,
      elapsedMs: Math.max(0, nowMs - this.startedAtMs),
      idleMs: Math.max(0, nowMs - this.lastOutputAtMs),
      awaitingCommandLine: this.awaitingCommandLine,
      blockedHeavyCommand: this.blockedHeavyCommand,
      startupEvents: this.startupEvents,
      reviewProgressObserved: this.reviewProgressObserved,
      summary: this.buildOutputSummary()
    };
  }

  formatCheckpoint(nowMs = Date.now()): string {
    const snapshot = this.snapshot(nowMs);
    const startupStatus = snapshot.reviewProgressObserved
      ? 'review progress observed'
      : `${snapshot.startupEvents} delegation startup events, no review progress yet`;
    return `[run-review] waiting on codex review (${formatDurationMs(
      snapshot.elapsedMs
    )} elapsed, ${formatDurationMs(snapshot.idleMs)} idle; ${startupStatus}).`;
  }

  buildTelemetryPayload(
    options: ReviewExecutionTelemetryPayloadOptions
  ): ReviewTelemetryPayload {
    const summary = this.buildOutputSummary();
    const persistedSummary = sanitizeTelemetrySummaryForPersistence(
      summary,
      options.includeRawTelemetry,
      options.telemetryDebugEnvKey
    );
    const explicitTerminationBoundaryProvided = Object.prototype.hasOwnProperty.call(
      options,
      'terminationBoundary'
    );
    return {
      version: 1,
      generated_at: new Date().toISOString(),
      status: options.status,
      error: sanitizeTelemetryErrorForPersistence(
        options.error ?? null,
        options.includeRawTelemetry,
        options.telemetryDebugEnvKey
      ),
      output_log_path: path.relative(options.repoRoot, options.outputLogPath),
      termination_boundary: sanitizeTerminationBoundaryForPersistence(
        options.status === 'failed'
          ? explicitTerminationBoundaryProvided
            ? options.terminationBoundary ?? null
            : this.getTerminationBoundaryRecord(options.error ?? null)
          : null,
        options.includeRawTelemetry,
        options.telemetryDebugEnvKey
      ),
      summary: persistedSummary
    };
  }

  getTerminationBoundaryRecordForKind(
    kind: ReviewTerminationBoundaryKind,
    nowMs = Date.now()
  ): ReviewTerminationBoundaryRecord | null {
    return this.buildTerminationBoundaryRecord(kind, nowMs);
  }

  getTerminationBoundaryRecord(
    errorMessage: string | null = null,
    nowMs = Date.now()
  ): ReviewTerminationBoundaryRecord | null {
    const matchedKinds = inferTerminationBoundaryKindsFromErrorMessage(errorMessage);
    for (const kind of matchedKinds) {
      if (kind === 'timeout' && errorMessage) {
        return {
          kind: 'timeout',
          provenance: 'review-timeout',
          reason: errorMessage,
          sample: null
        };
      }
      if (kind === 'stall' && errorMessage) {
        return {
          kind: 'stall',
          provenance: 'output-stall',
          reason: errorMessage,
          sample: null
        };
      }
      if (kind === 'startup-loop' && errorMessage) {
        return {
          kind: 'startup-loop',
          provenance: 'delegation-startup-loop',
          reason: errorMessage,
          sample: null
        };
      }
      const record = this.buildTerminationBoundaryRecord(kind, nowMs);
      if (record) {
        return record;
      }
    }
    return null;
  }

  private buildTerminationBoundaryRecord(
    kind: ReviewTerminationBoundaryKind,
    nowMs: number
  ): ReviewTerminationBoundaryRecord | null {
    if (kind === 'command-intent') {
      const boundary = this.getCommandIntentBoundaryState(nowMs);
      if (!boundary.triggered || !boundary.reason || !boundary.violationKind) {
        return null;
      }
      return {
        kind,
        provenance: boundary.violationKind,
        reason: boundary.reason,
        sample: normalizeTerminationBoundarySample(boundary.violationSample)
      };
    }

    if (kind === 'shell-probe') {
      const boundary = this.getShellProbeBoundaryState(nowMs);
      if (!boundary.triggered || !boundary.reason) {
        return null;
      }
      return {
        kind,
        provenance: 'direct-shell-verification',
        reason: boundary.reason,
        sample: normalizeTerminationBoundarySample(boundary.violationSample)
      };
    }

    if (kind === 'active-closeout-bundle-reread') {
      const boundary = this.getActiveCloseoutBundleRereadBoundaryState(nowMs);
      if (!boundary.triggered || !boundary.reason) {
        return null;
      }
      return {
        kind,
        provenance: boundary.anchorObserved ? 'post-startup-anchor' : 'bounded-surface',
        reason: boundary.reason,
        sample: normalizeTerminationBoundarySample(boundary.violationSample)
      };
    }

    if (kind === 'startup-anchor') {
      const boundary = this.getStartupAnchorBoundaryState(nowMs);
      if (!boundary.triggered || !boundary.reason) {
        return null;
      }
      return {
        kind,
        provenance: 'pre-anchor-meta-surface',
        reason: boundary.reason,
        sample: boundary.preAnchorMetaSurfaceKinds[0] ?? null
      };
    }

    if (kind === 'meta-surface-expansion') {
      const boundary = this.getMetaSurfaceExpansionState(nowMs);
      if (!boundary.triggered || !boundary.reason) {
        return null;
      }
      const summary = this.buildOutputSummary();
      const isPureActiveCloseoutSearch =
        summary.metaSurfaceKinds.length === 1 &&
        summary.metaSurfaceKinds[0] === REVIEW_ACTIVE_CLOSEOUT_BUNDLE_KIND;
      return {
        kind,
        provenance: isPureActiveCloseoutSearch
          ? 'active-closeout-self-reference-search'
          : 'meta-surface-kinds',
        reason: boundary.reason,
        sample: summary.metaSurfaceKinds[0] ?? null
      };
    }

    if (kind === 'verdict-stability') {
      const boundary = this.getVerdictStabilityState(nowMs);
      if (!boundary.triggered || !boundary.reason) {
        return null;
      }
      return {
        kind,
        provenance:
          boundary.distinctOutputInspectionTargets > 0
            ? 'repeated-output-inspection'
            : 'targetless-speculative-narrative',
        reason: boundary.reason,
        sample: null
      };
    }

    const boundary = this.getRelevantReinspectionDwellBoundaryState(nowMs);
    if (!boundary.triggered || !boundary.reason) {
      return null;
    }
    return {
      kind,
      provenance: boundary.anchorObserved ? 'post-startup-anchor' : 'bounded-surface',
      reason: boundary.reason,
      sample: normalizeTerminationBoundarySample(boundary.violationSample)
    };
  }

  private processLine(line: string, nowMs: number): void {
    this.lineCount += 1;
    const trimmed = line.trim();
    let handledAsCommandLine = false;

    if (trimmed.length > 0) {
      this.lastLines.push(trimmed);
      if (this.lastLines.length > this.tailLineLimit) {
        this.lastLines.shift();
      }
    }

    if (REVIEW_DELEGATION_STARTUP_LINE_RE.test(trimmed)) {
      this.startupEvents += 1;
    }
    if (trimmed === 'thinking') {
      this.thinkingBlocks += 1;
    }
    if (REVIEW_PROGRESS_SIGNAL_LINE_RE.test(trimmed)) {
      this.reviewProgressSignals += 1;
      this.reviewProgressObserved = true;
    }
    const metaSurfaceToolSample = classifyMetaSurfaceToolLine(trimmed);
    if (metaSurfaceToolSample) {
      this.recordMetaSurfaceToolSample(metaSurfaceToolSample, nowMs);
    }
    const commandIntentToolViolation = classifyCommandIntentToolLine(trimmed);
    if (commandIntentToolViolation) {
      this.recordCommandIntentViolation(commandIntentToolViolation);
    }

    if (trimmed === 'exec') {
      this.awaitingCommandLine = true;
      return;
    }

    if (this.awaitingCommandLine && trimmed.length > 0) {
      const commandLine = normalizeReviewCommandLine(trimmed);
      if (isLikelyReviewCommandLine(commandLine)) {
        if (this.commandStarts.length >= this.commandLimit) {
          this.commandStarts.shift();
        }
        this.commandStarts.push(commandLine);
        const metaSurfaceSample = classifyMetaSurfaceCommandLine(
          commandLine,
          this.touchedPaths,
          this.repoRoot,
          this.activeCloseoutBundleRoots,
          {
            allowedMetaSurfacePaths: this.allowedMetaSurfacePaths,
            allowedMetaSurfaceEnvVars: this.allowedMetaSurfaceEnvVars,
            allowedMetaSurfaceEnvVarPaths: this.allowedMetaSurfaceEnvVarPaths
          }
        );
        this.recordMetaSurfaceCommandSample(metaSurfaceSample, commandLine, nowMs);
        this.recordInspectionTargets(commandLine);
        this.recordStartupAnchorProgress(commandLine, nowMs);
        const shellProbeSample = classifyShellProbeCommandLine(commandLine);
        if (shellProbeSample) {
          this.recordShellProbe(shellProbeSample, nowMs);
        }
        const commandIntentViolation = classifyCommandIntentCommandLine(commandLine, {
          allowValidationCommandIntents: this.allowValidationCommandIntents
        });
        if (commandIntentViolation) {
          this.recordCommandIntentViolation(commandIntentViolation);
        }
        const heavyCommand = detectHeavyReviewCommand(commandLine);
        if (heavyCommand) {
          if (this.heavyCommandStarts.length < this.heavyCommandLimit) {
            this.heavyCommandStarts.push(commandLine);
          }
          if (this.blockHeavyCommands && !this.blockedHeavyCommand) {
            this.blockedHeavyCommand = commandLine;
          }
        }
        handledAsCommandLine = true;
        this.awaitingCommandLine = false;
      } else if (
        REVIEW_PROGRESS_SIGNAL_LINE_RE.test(trimmed) ||
        /\bsucceeded in\b|\bexited\b/i.test(trimmed)
      ) {
        this.awaitingCommandLine = false;
      }
    }

    if (!handledAsCommandLine) {
      const outputMetaSurfaceSample = classifyMetaSurfaceOutputLine(
        trimmed,
        this.activeCloseoutBundleRoots,
        this.repoRoot
      );
      if (outputMetaSurfaceSample) {
        this.recordMetaSurfaceSample(outputMetaSurfaceSample, nowMs);
      }
      this.recordConcreteOutputSignals(trimmed);
      this.recordNarrativeInspectionSignals(trimmed);
    }

    if (/\bsucceeded in\b|\bexited\b/i.test(trimmed)) {
      this.completionCount += 1;
    }

    this.updateLowSignalCandidate(nowMs);
    this.updateVerdictStabilityCandidate(nowMs);
    this.updateMetaSurfaceCandidate(nowMs);
    this.updateRelevantReinspectionDwellCandidate(nowMs);
  }

  private recordInspectionTargets(commandLine: string): string[] {
    const targets = extractInspectionTargets(commandLine, {
      touchedPaths: this.touchedPaths,
      repoRoot: this.repoRoot
    });
    if (targets.length === 0) {
      return targets;
    }
    this.lastInspectionCommandLine = commandLine;
    this.recentInspectionTargetSamples.push(targets);
    while (this.recentInspectionTargetSamples.length > this.getRecordedInspectionSignalWindowSize()) {
      this.recentInspectionTargetSamples.shift();
    }
    const signature = extractInspectionCommandSignature(commandLine, targets);
    if (!signature) {
      return targets;
    }
    this.recentInspectionSignatures.push(signature);
    while (this.recentInspectionSignatures.length > this.getRecordedInspectionSignalWindowSize()) {
      this.recentInspectionSignatures.shift();
    }
    return targets;
  }

  private recordStartupAnchorProgress(commandLine: string, nowMs: number): void {
    if (!this.enforceStartupAnchorBoundary || this.startupAnchorObserved) {
      return;
    }
    const startupBoundaryProgress = analyzeStartupAnchorBoundaryProgress(commandLine, {
      repoRoot: this.repoRoot,
      activeCloseoutBundleRoots: this.activeCloseoutBundleRoots,
      touchedPaths: this.touchedPaths,
      scopeMode: this.startupAnchorScopeMode,
      startupAnchorMode: this.startupAnchorMode,
      auditStartupAnchorPaths: this.auditStartupAnchorPaths,
      auditStartupAnchorEnvVars: this.allowedMetaSurfaceEnvVars,
      auditStartupAnchorEnvVarPaths: this.auditStartupAnchorEnvVarPaths
    });
    for (const preAnchorMetaSurfaceSample of startupBoundaryProgress.preAnchorMetaSurfaceSamples) {
      this.recordPreAnchorMetaSurfaceSample(preAnchorMetaSurfaceSample, nowMs);
    }
    if (startupBoundaryProgress.anchorObserved) {
      this.startupAnchorObserved = true;
    } else {
      this.preAnchorCommandStarts += 1;
    }
  }

  private updateLowSignalCandidate(nowMs: number): void {
    if (this.lowSignalTimeoutMs === null) {
      this.lowSignalCandidateSinceMs = null;
      return;
    }
    const summary = this.buildOutputSummary();
    const driftShaped =
      this.reviewProgressObserved &&
      this.thinkingBlocks >= LOW_SIGNAL_MIN_THINKING_BLOCKS &&
      this.commandStarts.length >= LOW_SIGNAL_MIN_COMMAND_STARTS &&
      summary.distinctInspectionTargets > 0 &&
      summary.distinctInspectionTargets <= LOW_SIGNAL_MAX_DISTINCT_TARGETS &&
      summary.maxInspectionTargetHits >= LOW_SIGNAL_MIN_REPEAT_TARGET_HITS &&
      summary.distinctInspectionSignatures > 0 &&
      summary.distinctInspectionSignatures <= LOW_SIGNAL_MAX_DISTINCT_TARGETS &&
      summary.maxInspectionSignatureHits >= LOW_SIGNAL_MIN_REPEAT_SIGNATURE_HITS;
    if (!driftShaped) {
      this.lowSignalCandidateSinceMs = null;
      return;
    }
    if (this.lowSignalCandidateSinceMs === null) {
      this.lowSignalCandidateSinceMs = nowMs;
    }
  }

  private updateRelevantReinspectionDwellCandidate(nowMs: number): void {
    if (
      !this.enforceRelevantReinspectionDwellBoundary ||
      this.lowSignalTimeoutMs === null ||
      this.relevantReinspectionDwellViolation
    ) {
      this.relevantReinspectionDwellCandidateSinceMs = null;
      return;
    }
    const summary = this.buildOutputSummary();
    const relevantInspectionSummary = this.buildInspectionTargetSummary(
      this.getRelevantReinspectionWindowSize()
    );
    const anchorSatisfied = !this.enforceStartupAnchorBoundary || this.startupAnchorObserved;
    const dwellShaped =
      anchorSatisfied &&
      this.reviewProgressObserved &&
      this.commandStarts.length >= RELEVANT_REINSPECTION_MIN_COMMAND_STARTS &&
      relevantInspectionSummary.distinctTargets > 0 &&
      relevantInspectionSummary.distinctTargets <= this.getRelevantReinspectionMaxDistinctTargets() &&
      relevantInspectionSummary.maxHits >= RELEVANT_REINSPECTION_MIN_REPEAT_TARGET_HITS &&
      relevantInspectionSummary.metaSurfaceSignals === 0 &&
      summary.concreteOutputSignals === 0;
    if (!dwellShaped) {
      this.relevantReinspectionDwellCandidateSinceMs = null;
      return;
    }
    if (this.relevantReinspectionDwellCandidateSinceMs === null) {
      this.relevantReinspectionDwellCandidateSinceMs = nowMs;
      return;
    }
    if (
      nowMs - this.relevantReinspectionDwellCandidateSinceMs >= this.lowSignalTimeoutMs &&
      this.relevantReinspectionDwellViolation === null
    ) {
      this.relevantReinspectionDwellViolation = {
        sample: this.lastInspectionCommandLine,
        detectedAtMs: nowMs,
        commandStarts: this.commandStarts.length,
        distinctTargets: relevantInspectionSummary.distinctTargets,
        maxTargetHits: relevantInspectionSummary.maxHits
      };
    }
  }

  private recordNarrativeInspectionSignals(line: string): void {
    const signature = normalizeNarrativeInspectionSignature(line);
    if (!signature) {
      this.recordOutputNarrativeMiss();
      return;
    }
    this.recentOutputNarrativeSignatures.push(signature);
    while (this.recentOutputNarrativeSignatures.length > VERDICT_STABILITY_RECENT_OUTPUT_WINDOW) {
      this.recentOutputNarrativeSignatures.shift();
    }
    const targets = extractInspectionTargets(signature);
    if (targets.length === 0) {
      this.recentOutputInspectionTargetSamples.push(null);
      while (
        this.recentOutputInspectionTargetSamples.length > VERDICT_STABILITY_RECENT_OUTPUT_WINDOW
      ) {
        this.recentOutputInspectionTargetSamples.shift();
      }
      return;
    }
    this.recentOutputInspectionTargetSamples.push(targets);
    while (this.recentOutputInspectionTargetSamples.length > VERDICT_STABILITY_RECENT_OUTPUT_WINDOW) {
      this.recentOutputInspectionTargetSamples.shift();
    }
  }

  private recordOutputNarrativeMiss(): void {
    this.recentOutputInspectionTargetSamples.push(null);
    while (this.recentOutputInspectionTargetSamples.length > VERDICT_STABILITY_RECENT_OUTPUT_WINDOW) {
      this.recentOutputInspectionTargetSamples.shift();
    }
    this.recentOutputNarrativeSignatures.push(null);
    while (this.recentOutputNarrativeSignatures.length > VERDICT_STABILITY_RECENT_OUTPUT_WINDOW) {
      this.recentOutputNarrativeSignatures.shift();
    }
  }

  private recordConcreteOutputSignals(line: string): void {
    if (this.touchedPaths.size === 0) {
      this.recentConcreteOutputTargetSamples.push(null);
      while (
        this.recentConcreteOutputTargetSamples.length > VERDICT_STABILITY_RECENT_OUTPUT_WINDOW
      ) {
        this.recentConcreteOutputTargetSamples.shift();
      }
      return;
    }
    const targets = extractConcreteOutputTargets(line, this.touchedPaths, this.repoRoot);
    this.recentConcreteOutputTargetSamples.push(targets.length > 0 ? targets : null);
    while (this.recentConcreteOutputTargetSamples.length > VERDICT_STABILITY_RECENT_OUTPUT_WINDOW) {
      this.recentConcreteOutputTargetSamples.shift();
    }
  }

  private recordMetaSurfaceCommandSample(sample: string | null, commandLine: string, nowMs: number): void {
    const nextSample =
      sample &&
      COMMAND_LEVEL_ALLOWED_META_SURFACE_KIND_SET.has(sample) &&
      this.allowedMetaSurfaceKinds.has(sample)
        ? null
        : sample;
    this.recentMetaSurfaceSamples.push(nextSample);
    while (this.recentMetaSurfaceSamples.length > META_SURFACE_RECENT_SIGNAL_WINDOW) {
      this.recentMetaSurfaceSamples.shift();
    }
    if (
      this.enforceActiveCloseoutBundleRereadBoundary &&
      nextSample === REVIEW_ACTIVE_CLOSEOUT_BUNDLE_KIND &&
      this.commandStarts.length > 1
    ) {
      this.activeCloseoutBundleRereadCount += 1;
      if (!this.activeCloseoutBundleRereadViolation && this.activeCloseoutBundleRereadCount > 1) {
        this.activeCloseoutBundleRereadViolation = {
          sample: commandLine,
          detectedAtMs: nowMs,
          rereadCount: this.activeCloseoutBundleRereadCount
        };
      }
    }
  }

  private recordMetaSurfaceToolSample(sample: string, nowMs: number): void {
    this.recordMetaSurfaceSample(sample, nowMs);
  }

  private recordCommandIntentViolation(violation: ReviewCommandIntentViolation): void {
    if (!this.commandIntentViolation) {
      this.commandIntentViolation = violation;
    }
    this.commandIntentViolationSamples.push(violation);
    while (this.commandIntentViolationSamples.length > REVIEW_COMMAND_INTENT_VIOLATION_SAMPLE_LIMIT) {
      this.commandIntentViolationSamples.shift();
    }
  }

  private recordShellProbe(sample: string, nowMs: number): void {
    this.shellProbeCount += 1;
    this.shellProbeSamples.push(sample);
    while (this.shellProbeSamples.length > REVIEW_COMMAND_INTENT_VIOLATION_SAMPLE_LIMIT) {
      this.shellProbeSamples.shift();
    }
    if (!this.shellProbeViolation && this.shellProbeCount > 1) {
      this.shellProbeViolation = {
        sample,
        detectedAtMs: nowMs
      };
    }
  }

  private recordMetaSurfaceSample(sample: string | null, _nowMs: number): void {
    const nextSample =
      sample && this.allowedMetaSurfaceKinds.has(sample) ? null : sample;
    this.recentMetaSurfaceSamples.push(nextSample);
    while (this.recentMetaSurfaceSamples.length > META_SURFACE_RECENT_SIGNAL_WINDOW) {
      this.recentMetaSurfaceSamples.shift();
    }
  }

  private recordPreAnchorMetaSurfaceSample(sample: string, nowMs: number): void {
    if (STARTUP_ANCHOR_ALLOWED_META_SURFACE_KINDS.has(sample)) {
      return;
    }
    this.preAnchorMetaSurfaceSamples.push(sample);
    if (
      this.startupAnchorViolationAtMs === null &&
      this.preAnchorMetaSurfaceSamples.length > STARTUP_ANCHOR_META_SURFACE_SIGNAL_BUDGET
    ) {
      this.startupAnchorViolationAtMs = nowMs;
    }
  }

  private updateMetaSurfaceCandidate(nowMs: number): void {
    if (this.metaSurfaceTimeoutMs === null) {
      this.metaSurfaceCandidateSinceMs = null;
      return;
    }
    const summary = this.buildOutputSummary();
    const expansionShaped =
      this.reviewProgressObserved &&
      this.commandStarts.length >= META_SURFACE_MIN_COMMAND_STARTS &&
      summary.metaSurfaceSignals >= META_SURFACE_MIN_SIGNALS &&
      (summary.distinctMetaSurfaces >= META_SURFACE_MIN_DISTINCT_SURFACES ||
        summary.maxMetaSurfaceHits >= META_SURFACE_MIN_REPEAT_HITS);
    if (!expansionShaped) {
      this.metaSurfaceCandidateSinceMs = null;
      return;
    }
    if (this.metaSurfaceCandidateSinceMs === null) {
      this.metaSurfaceCandidateSinceMs = nowMs;
    }
  }

  private updateVerdictStabilityCandidate(nowMs: number): void {
    if (this.verdictStabilityTimeoutMs === null) {
      this.verdictStabilityCandidateSinceMs = null;
      return;
    }
    const summary = this.buildOutputSummary();
    const fileTargetDriftShaped =
      this.reviewProgressObserved &&
      this.thinkingBlocks >= VERDICT_STABILITY_MIN_THINKING_BLOCKS &&
      this.commandStarts.length >= VERDICT_STABILITY_MIN_COMMAND_STARTS &&
      summary.outputInspectionSignals >= VERDICT_STABILITY_MIN_OUTPUT_TARGET_SIGNALS &&
      summary.distinctOutputInspectionTargets > 0 &&
      summary.distinctOutputInspectionTargets <= VERDICT_STABILITY_MAX_DISTINCT_OUTPUT_TARGETS &&
      summary.maxOutputInspectionTargetHits >= VERDICT_STABILITY_MIN_REPEAT_OUTPUT_TARGET_HITS &&
      summary.distinctOutputNarrativeSignatures > 0 &&
      summary.distinctOutputNarrativeSignatures <=
        VERDICT_STABILITY_MAX_DISTINCT_OUTPUT_SIGNATURES &&
      summary.maxOutputNarrativeSignatureHits >=
        VERDICT_STABILITY_MIN_REPEAT_OUTPUT_SIGNATURE_HITS;
    const genericNarrativeDriftShaped =
      this.reviewProgressObserved &&
      this.thinkingBlocks >= VERDICT_STABILITY_MIN_THINKING_BLOCKS &&
      this.commandStarts.length >= VERDICT_STABILITY_MIN_COMMAND_STARTS &&
      summary.outputNarrativeSignals >= VERDICT_STABILITY_MIN_OUTPUT_NARRATIVE_SIGNALS &&
      summary.distinctOutputInspectionTargets === 0 &&
      summary.concreteOutputSignals === 0 &&
      summary.distinctOutputNarrativeSignatures > 0 &&
      summary.distinctOutputNarrativeSignatures <=
        VERDICT_STABILITY_MAX_DISTINCT_OUTPUT_SIGNATURES &&
      summary.maxOutputNarrativeSignatureHits >=
        VERDICT_STABILITY_MIN_REPEAT_OUTPUT_SIGNATURE_HITS;
    const driftShaped = fileTargetDriftShaped || genericNarrativeDriftShaped;
    if (!driftShaped) {
      this.verdictStabilityCandidateSinceMs = null;
      return;
    }
    if (this.verdictStabilityCandidateSinceMs === null) {
      this.verdictStabilityCandidateSinceMs = nowMs;
    }
  }

  private buildInspectionTargetSummary(windowSize = LOW_SIGNAL_RECENT_COMMAND_WINDOW): {
    distinctTargets: number;
    maxHits: number;
    distinctSignatures: number;
    maxSignatureHits: number;
    metaSurfaceSignals: number;
    distinctMetaSurfaces: number;
    maxMetaSurfaceHits: number;
    metaSurfaceKinds: string[];
  } {
    const recentTargetHits = new Map<string, number>();
    const relevantTargetSamples = this.recentInspectionTargetSamples.slice(-windowSize);
    for (const targets of relevantTargetSamples) {
      for (const target of targets) {
        recentTargetHits.set(target, (recentTargetHits.get(target) ?? 0) + 1);
      }
    }
    let maxHits = 0;
    for (const hits of recentTargetHits.values()) {
      if (hits > maxHits) {
        maxHits = hits;
      }
    }
    const recentSignatureHits = new Map<string, number>();
    const relevantSignatures = this.recentInspectionSignatures.slice(-windowSize);
    for (const signature of relevantSignatures) {
      recentSignatureHits.set(signature, (recentSignatureHits.get(signature) ?? 0) + 1);
    }
    let maxSignatureHits = 0;
    for (const hits of recentSignatureHits.values()) {
      if (hits > maxSignatureHits) {
        maxSignatureHits = hits;
      }
    }
    const recentMetaSurfaceHits = new Map<string, number>();
    for (const sample of this.recentMetaSurfaceSamples) {
      if (!sample) {
        continue;
      }
      recentMetaSurfaceHits.set(sample, (recentMetaSurfaceHits.get(sample) ?? 0) + 1);
    }
    let maxMetaSurfaceHits = 0;
    for (const hits of recentMetaSurfaceHits.values()) {
      if (hits > maxMetaSurfaceHits) {
        maxMetaSurfaceHits = hits;
      }
    }
    return {
      distinctTargets: recentTargetHits.size,
      maxHits,
      distinctSignatures: recentSignatureHits.size,
      maxSignatureHits,
      metaSurfaceSignals: [...recentMetaSurfaceHits.values()].reduce((sum, hits) => sum + hits, 0),
      distinctMetaSurfaces: recentMetaSurfaceHits.size,
      maxMetaSurfaceHits,
      metaSurfaceKinds: [...recentMetaSurfaceHits.keys()].sort()
    };
  }

  private getRelevantReinspectionMaxDistinctTargets(): number {
    return Math.max(RELEVANT_REINSPECTION_BASE_MAX_DISTINCT_TARGETS, this.touchedPaths.size);
  }

  private getRelevantReinspectionWindowSize(): number {
    return Math.max(
      LOW_SIGNAL_RECENT_COMMAND_WINDOW,
      this.getRelevantReinspectionMaxDistinctTargets() * RELEVANT_REINSPECTION_MIN_REPEAT_TARGET_HITS
    );
  }

  private getRecordedInspectionSignalWindowSize(): number {
    return this.getRelevantReinspectionWindowSize();
  }

  private buildOutputNarrativeSummary(): {
    outputInspectionSignals: number;
    outputNarrativeSignals: number;
    concreteOutputSignals: number;
    distinctOutputTargets: number;
    maxOutputTargetHits: number;
    distinctNarrativeSignatures: number;
    maxNarrativeSignatureHits: number;
  } {
    const outputTargetHits = new Map<string, number>();
    for (const targets of this.recentOutputInspectionTargetSamples) {
      if (!targets) {
        continue;
      }
      for (const target of targets) {
        outputTargetHits.set(target, (outputTargetHits.get(target) ?? 0) + 1);
      }
    }
    let maxOutputTargetHits = 0;
    for (const hits of outputTargetHits.values()) {
      if (hits > maxOutputTargetHits) {
        maxOutputTargetHits = hits;
      }
    }
    const outputNarrativeSignatureHits = new Map<string, number>();
    for (const signature of this.recentOutputNarrativeSignatures) {
      if (!signature) {
        continue;
      }
      outputNarrativeSignatureHits.set(
        signature,
        (outputNarrativeSignatureHits.get(signature) ?? 0) + 1
      );
    }
    let maxNarrativeSignatureHits = 0;
    for (const hits of outputNarrativeSignatureHits.values()) {
      if (hits > maxNarrativeSignatureHits) {
        maxNarrativeSignatureHits = hits;
      }
    }
    let concreteOutputSignals = 0;
    for (const targets of this.recentConcreteOutputTargetSamples) {
      if (!targets) {
        continue;
      }
      concreteOutputSignals += targets.length;
    }
    return {
      outputInspectionSignals: [...outputTargetHits.values()].reduce((sum, hits) => sum + hits, 0),
      outputNarrativeSignals: [...outputNarrativeSignatureHits.values()].reduce(
        (sum, hits) => sum + hits,
        0
      ),
      concreteOutputSignals,
      distinctOutputTargets: outputTargetHits.size,
      maxOutputTargetHits,
      distinctNarrativeSignatures: outputNarrativeSignatureHits.size,
      maxNarrativeSignatureHits
    };
  }

  private buildPreAnchorMetaSurfaceSummary(): {
    signals: number;
    distinctSurfaces: number;
    kinds: string[];
  } {
    const preAnchorMetaSurfaceHits = new Map<string, number>();
    for (const sample of this.preAnchorMetaSurfaceSamples) {
      preAnchorMetaSurfaceHits.set(sample, (preAnchorMetaSurfaceHits.get(sample) ?? 0) + 1);
    }
    return {
      signals: [...preAnchorMetaSurfaceHits.values()].reduce((sum, hits) => sum + hits, 0),
      distinctSurfaces: preAnchorMetaSurfaceHits.size,
      kinds: [...preAnchorMetaSurfaceHits.keys()].sort()
    };
  }
}

export async function persistReviewTelemetry(
  options: PersistReviewTelemetryOptions
): Promise<ReviewTelemetryPayload> {
  const payload = options.state.buildTelemetryPayload(options);
  await writeFile(options.telemetryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

export function logReviewTelemetrySummary(
  payload: ReviewTelemetryPayload,
  telemetryPath: string,
  options: LogReviewTelemetryOptions
): void {
  const summary = payload.summary;
  console.error(
    `[run-review] review telemetry: ${summary.commandStarts.length} command start(s), ${summary.heavyCommandStarts.length} heavy command start(s), ${summary.startupEvents} delegation startup event(s), ${summary.reviewProgressSignals} review progress signal(s).`
  );
  if (payload.termination_boundary) {
    console.error(
      `[run-review] termination boundary: ${payload.termination_boundary.kind} (${payload.termination_boundary.provenance}).`
    );
  }
  const lastCommand = summary.commandStarts.at(-1);
  if (lastCommand) {
    if (options.debugTelemetry) {
      console.error(`[run-review] last command started: ${lastCommand}`);
    } else {
      console.error(
        `[run-review] last command started: [redacted] (set ${options.telemetryDebugEnvKey}=1 to print raw command text).`
      );
    }
  }
  if (summary.completionCount < summary.commandStarts.length) {
    console.error(
      `[run-review] command completions observed: ${summary.completionCount}; possible in-flight command at termination.`
    );
  }
  if (summary.heavyCommandStarts.length > 0) {
    if (options.debugTelemetry) {
      console.error(
        `[run-review] heavy commands detected: ${summary.heavyCommandStarts.join(' | ')}`
      );
    } else {
      console.error(
        `[run-review] heavy commands detected: ${summary.heavyCommandStarts.length} sample(s) captured (set ${options.telemetryDebugEnvKey}=1 to print raw command text).`
      );
    }
  }
  if (summary.metaSurfaceSignals > 0) {
    console.error(
      `[run-review] meta-surface signals detected: ${summary.metaSurfaceSignals} sample(s) across ${summary.distinctMetaSurfaces} surface kind(s) [${summary.metaSurfaceKinds.join(', ')}]; max repeated surface hits ${summary.maxMetaSurfaceHits}.`
    );
  }
  if (summary.lastLines.length > 0) {
    if (options.debugTelemetry) {
      console.error(`[run-review] output tail: ${summary.lastLines.join(' || ')}`);
    } else {
      console.error(
        `[run-review] output tail captured: ${summary.lastLines.length} line(s) hidden by default (set ${options.telemetryDebugEnvKey}=1 to print raw tail).`
      );
    }
  }
  console.error(`[run-review] review telemetry saved to: ${telemetryPath}`);
}

function inferTerminationBoundaryKindsFromErrorMessage(
  errorMessage: string | null
): ReviewTerminationBoundaryKind[] {
  if (!errorMessage) {
    return [];
  }
  const kinds: ReviewTerminationBoundaryKind[] = [];
  if (errorMessage.includes('codex review timed out after')) {
    kinds.push('timeout');
  }
  if (errorMessage.includes('codex review stalled with no output for')) {
    kinds.push('stall');
  }
  if (errorMessage.includes('bounded command-intent boundary')) {
    kinds.push('command-intent');
  }
  if (errorMessage.includes('shell-probe boundary violated')) {
    kinds.push('shell-probe');
  }
  if (errorMessage.includes('appears stuck in delegation startup loop')) {
    kinds.push('startup-loop');
  }
  if (errorMessage.includes('active-closeout-bundle reread boundary violated')) {
    kinds.push('active-closeout-bundle-reread');
  }
  if (errorMessage.includes('startup-anchor boundary violated')) {
    kinds.push('startup-anchor');
  }
  if (errorMessage.includes('meta-surface expansion detected')) {
    kinds.push('meta-surface-expansion');
  }
  if (errorMessage.includes('relevant-reinspection dwell boundary violated')) {
    kinds.push('relevant-reinspection-dwell');
  }
  if (errorMessage.includes('verdict-stability drift detected')) {
    kinds.push('verdict-stability');
  }
  return kinds;
}

function normalizeTerminationBoundarySample(sample: string | null): string | null {
  if (!sample) {
    return null;
  }
  const trimmed = sample.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeTerminationBoundaryForPersistence(
  boundary: ReviewTerminationBoundaryRecord | null,
  includeRawTelemetry: boolean,
  telemetryDebugEnvKey: string
): ReviewTerminationBoundaryRecord | null {
  if (!boundary) {
    return null;
  }
  if (includeRawTelemetry) {
    return boundary;
  }
  const redactedSample = boundary.sample
    ? `[redacted ${boundary.kind} sample; set ${telemetryDebugEnvKey}=1 to persist raw sample]`
    : null;
  return {
    ...boundary,
    reason:
      boundary.sample && redactedSample
        ? boundary.reason.split(boundary.sample).join(redactedSample)
        : boundary.reason,
    sample: redactedSample
  };
}

export function formatDurationMs(durationMs: number): string {
  const roundedMs = Math.max(0, Math.round(durationMs));
  if (roundedMs < 1000) {
    return `${roundedMs}ms`;
  }

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m ${seconds}s`;
}

function normalizeReviewCommandLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) {
    return '';
  }
  const succeededIndex = trimmed.indexOf(' succeeded in ');
  if (succeededIndex >= 0) {
    return trimmed.slice(0, succeededIndex).trimEnd();
  }
  const exitedIndex = trimmed.indexOf(' exited ');
  if (exitedIndex >= 0) {
    return trimmed.slice(0, exitedIndex).trimEnd();
  }
  return trimmed;
}

function detectReviewShellDialect(tokens: string[]): ReviewShellDialect {
  const command = normalizeCommandToken(tokens[0] ?? '');
  if (command === 'zsh') {
    return 'zsh';
  }
  if (command === 'bash' || command === 'sh' || command === 'ksh') {
    return 'bashlike';
  }
  return 'other';
}

function normalizeNarrativeInspectionSignature(line: string): string | null {
  const normalized = line.trim().replace(/\s+/gu, ' ');
  if (normalized.length < REVIEW_NARRATIVE_INSPECTION_MIN_LINE_LENGTH) {
    return null;
  }
  if (
    normalized === 'thinking' ||
    normalized === 'exec' ||
    REVIEW_PROGRESS_SIGNAL_LINE_RE.test(normalized) ||
    isLikelyReviewCommandLine(normalized) ||
    /^mcp:/iu.test(normalized) ||
    /^(?:diff --git|index |--- |\+\+\+ |@@|```)/u.test(normalized) ||
    /\bsucceeded in\b|\bexited\b/iu.test(normalized)
  ) {
    return null;
  }
  if (!REVIEW_SPECULATIVE_NARRATIVE_LINE_RE.test(normalized)) {
    return null;
  }
  return normalized;
}

function extractConcreteOutputTargets(
  line: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null
): string[] {
  const normalized = line.trim().replace(/\s+/gu, ' ');
  if (
    normalized.length === 0 ||
    normalized === 'thinking' ||
    normalized === 'exec' ||
    REVIEW_PROGRESS_SIGNAL_LINE_RE.test(normalized) ||
    isLikelyReviewCommandLine(normalized) ||
    /^mcp:/iu.test(normalized) ||
    /^(?:diff --git|index |--- |\+\+\+ |@@|```)/u.test(normalized) ||
    /^[`"']/u.test(normalized) ||
    /\bsucceeded in\b|\bexited\b/iu.test(normalized) ||
    normalizeNarrativeInspectionSignature(normalized)
  ) {
    return [];
  }
  const concreteTargets = new Set<string>();
  for (const touchedPath of touchedPaths) {
    const normalizedTouchedPath = normalizeScopePath(touchedPath);
    if (normalizedTouchedPath.length === 0) {
      continue;
    }
    const escapedTouchedPath = escapeRegex(normalizedTouchedPath);
    const lineMarkerRe = new RegExp(
      `${escapedTouchedPath}(?::\\d+(?::\\d+)?)\\b|${escapedTouchedPath}#L\\d+(?:C\\d+)?\\b`,
      'iu'
    );
    if (lineMarkerRe.test(normalized) && isTouchedScopePath(normalizedTouchedPath, touchedPaths, repoRoot)) {
      concreteTargets.add(normalizedTouchedPath);
    }
  }
  return [...concreteTargets];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function extractInspectionCommandSignature(commandLine: string, targets: string[]): string | null {
  if (targets.length === 0) {
    return null;
  }
  return normalizeReviewCommandLine(commandLine);
}

function classifyMetaSurfaceToolLine(line: string): string | null {
  if (REVIEW_META_SURFACE_DELEGATION_TOOL_LINE_RE.test(line)) {
    return 'delegation-control';
  }
  return null;
}

function classifyMetaSurfaceCommandLine(
  commandLine: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null,
  activeCloseoutBundleRoots: ReadonlySet<string>,
  allowedAuditMetaSurfaces: {
    allowedMetaSurfacePaths: ReadonlySet<string>;
    allowedMetaSurfaceEnvVars: ReadonlySet<string>;
    allowedMetaSurfaceEnvVarPaths: ReadonlyMap<string, string>;
  }
): string | null {
  const normalized = normalizeReviewCommandLine(commandLine).replace(/\\/gu, '/');
  const segments = splitShellControlSegmentsDetailed(normalized);
  let shellEnvState = createEmptyReviewShellEnvState(
    allowedAuditMetaSurfaces.allowedMetaSurfaceEnvVarPaths
  );
  let separatorBefore: ShellControlSeparator = null;
  let previousSegmentTruthiness: boolean | null = null;
  for (const { segment, separatorAfter } of segments) {
    const runsInParentShell = segmentRunsInParentShell(separatorBefore, previousSegmentTruthiness);
    const result = classifyMetaSurfaceSegment(
      segment,
      touchedPaths,
      repoRoot,
      activeCloseoutBundleRoots,
      allowedAuditMetaSurfaces,
      shellEnvState
    );
    if (runsInParentShell && separatorCarriesParentShellStateForward(separatorAfter)) {
      shellEnvState = result.nextShellEnvState;
    }
    if (result.kind) {
      return result.kind;
    }
    previousSegmentTruthiness = inferStaticShellTruthiness(segment);
    separatorBefore = separatorAfter;
  }
  return null;
}

function classifyMetaSurfaceOutputLine(
  line: string,
  activeCloseoutBundleRoots: ReadonlySet<string>,
  repoRoot: string | null
): string | null {
  const normalized = line.replace(/\\/gu, '/');
  const sourceFieldMatch = /^(.*):\d+(?::\d+)?(?:[: -]|$)/u.exec(normalized);
  if (!sourceFieldMatch) {
    return null;
  }
  const sourceField = sourceFieldMatch[1]?.trim() ?? '';
  return classifyActiveCloseoutBundleCandidate(sourceField, activeCloseoutBundleRoots, repoRoot);
}

function analyzeStartupAnchorBoundaryProgress(
  commandLine: string,
  options: {
    repoRoot: string | null;
    activeCloseoutBundleRoots: ReadonlySet<string>;
    touchedPaths: ReadonlySet<string>;
    scopeMode: ReviewScopeMode;
    startupAnchorMode: ReviewStartupAnchorMode | null;
    auditStartupAnchorPaths: ReadonlySet<string>;
    auditStartupAnchorEnvVars: ReadonlySet<string>;
    auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string>;
  }
): { anchorObserved: boolean; preAnchorMetaSurfaceSamples: string[] } {
  const normalized = normalizeReviewCommandLine(commandLine).replace(/\\/gu, '/');
  const segments = splitShellControlSegmentsDetailed(normalized);
  const progress = {
    anchorObserved: false,
    preAnchorMetaSurfaceSamples: [] as string[]
  };
  let shellEnvState = createEmptyReviewShellEnvState(options.auditStartupAnchorEnvVarPaths);
  let separatorBefore: ShellControlSeparator = null;
  let previousSegmentTruthiness: boolean | null = null;
  for (const { segment, separatorAfter } of segments) {
    if (progress.anchorObserved) {
      break;
    }
    const runsInParentShell = segmentRunsInParentShell(separatorBefore, previousSegmentTruthiness);
    const nextShellEnvState = analyzeStartupAnchorBoundarySegment(
      segment,
      options.touchedPaths,
      options.scopeMode,
      options.startupAnchorMode,
      options.auditStartupAnchorPaths,
      options.auditStartupAnchorEnvVars,
      options.auditStartupAnchorEnvVarPaths,
      options.repoRoot,
      options.activeCloseoutBundleRoots,
      progress,
      shellEnvState
    );
    if (runsInParentShell && separatorCarriesParentShellStateForward(separatorAfter)) {
      shellEnvState = nextShellEnvState;
    }
    previousSegmentTruthiness = inferStaticShellTruthiness(segment);
    separatorBefore = separatorAfter;
  }
  return progress;
}

function classifyMetaSurfaceSegment(
  segment: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null,
  activeCloseoutBundleRoots: ReadonlySet<string>,
  allowedAuditMetaSurfaces: {
    allowedMetaSurfacePaths: ReadonlySet<string>;
    allowedMetaSurfaceEnvVars: ReadonlySet<string>;
    allowedMetaSurfaceEnvVarPaths: ReadonlyMap<string, string>;
  },
  shellEnvState: ReviewShellEnvState,
  depth = 0,
  shellDialect: ReviewShellDialect = 'other'
) : { kind: string | null; nextShellEnvState: ReviewShellEnvState } {
  const rawTokens = tokenizeShellSegment(segment);
  const envAssignments = buildCommandEnvAssignments(
    shellEnvState,
    rawTokens,
    REVIEW_SHELL_ENV_INTERPRETER_DEPENDENCIES
  );
  const nextShellEnvState = updateReviewShellEnvStateForSegment(
    shellEnvState,
    rawTokens,
    REVIEW_SHELL_ENV_INTERPRETER_DEPENDENCIES,
    shellDialect
  );
  const strippedTokens = stripLeadingEnvAssignments(rawTokens);
  if (strippedTokens.length === 0) {
    return { kind: null, nextShellEnvState };
  }

  const tokens = unwrapEnvCommandTokens(strippedTokens);
  if (tokens.length === 0) {
    return { kind: null, nextShellEnvState };
  }

  if (depth < 3) {
    const payload = extractShellCommandPayload(tokens);
    if (payload) {
      const nestedShellDialect = detectReviewShellDialect(tokens);
      const nestedSegments = splitShellControlSegmentsDetailed(payload);
      let nestedShellEnvState = buildNestedShellEnvState(
        shellEnvState,
        rawTokens,
        REVIEW_SHELL_ENV_INTERPRETER_DEPENDENCIES
      );
      let separatorBefore: ShellControlSeparator = null;
      let previousSegmentTruthiness: boolean | null = null;
      for (const { segment: nestedSegment, separatorAfter } of nestedSegments) {
        const runsInParentShell = segmentRunsInParentShell(separatorBefore, previousSegmentTruthiness);
        const nestedResult = classifyMetaSurfaceSegment(
          nestedSegment,
          touchedPaths,
          repoRoot,
          activeCloseoutBundleRoots,
          allowedAuditMetaSurfaces,
          nestedShellEnvState,
          depth + 1,
          nestedShellDialect
        );
        if (runsInParentShell && separatorCarriesParentShellStateForward(separatorAfter)) {
          nestedShellEnvState = nestedResult.nextShellEnvState;
        }
        if (nestedResult.kind) {
          return { kind: nestedResult.kind, nextShellEnvState };
        }
        previousSegmentTruthiness = inferStaticShellTruthiness(nestedSegment);
        separatorBefore = separatorAfter;
      }
      const rebindingKind = detectAuditEnvRebindingMetaSurface(
        payload,
        nestedShellEnvState.shellVars,
        allowedAuditMetaSurfaces.allowedMetaSurfaceEnvVarPaths,
        repoRoot
      );
      if (rebindingKind) {
        return { kind: rebindingKind, nextShellEnvState };
      }
      return { kind: null, nextShellEnvState };
    }
  }

  const command = normalizeCommandToken(tokens[0] ?? '');
  const args = tokens.slice(1);
  const inlineAssignedEnvVars = new Set(
    collectInlineEnvAssignments(rawTokens, REVIEW_SHELL_ENV_INTERPRETER_DEPENDENCIES).keys()
  );
  if (isReviewOrchestrationCommand(command, args)) {
    return { kind: 'review-orchestration', nextShellEnvState };
  }
  const metaSurfaceSamples = classifyMetaSurfaceDirectDetailed(
    command,
    args,
    touchedPaths,
    repoRoot,
    activeCloseoutBundleRoots,
    envAssignments,
    allowedAuditMetaSurfaces.allowedMetaSurfaceEnvVarPaths,
    shellEnvState.blockedEnvVars,
    inlineAssignedEnvVars,
    allowedAuditMetaSurfaces.allowedMetaSurfacePaths
  );
  for (const sample of metaSurfaceSamples) {
    if (!isAllowedAuditMetaSurfaceSample(sample, allowedAuditMetaSurfaces, repoRoot)) {
      return { kind: sample.kind, nextShellEnvState };
    }
  }
  return { kind: null, nextShellEnvState };
}

function isDiffScopeAnchorCommand(
  command: string,
  args: string[],
  scopeMode: ReviewScopeMode,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null
): boolean {
  if (scopeMode !== 'uncommitted') {
    return false;
  }
  if (command !== 'git') {
    return false;
  }

  const invocation = resolveGitInvocation(args);
  if (invocation.subcommand !== 'diff' || !gitDiffArgsAreScopeOnly(invocation.subcommandArgs)) {
    return false;
  }

  const pathspecs = extractGitDiffPathspecs(invocation.subcommandArgs);
  if (pathspecs.length === 0) {
    return true;
  }

  return pathspecs.some((pathspec) => isTouchedScopePath(pathspec, touchedPaths, repoRoot));
}

function gitDiffArgsAreScopeOnly(args: string[]): boolean {
  let sawScopeSeparator = false;
  for (const arg of args) {
    if (!arg) {
      continue;
    }
    if (arg === '--') {
      sawScopeSeparator = true;
      continue;
    }
    if (sawScopeSeparator || arg.startsWith('-')) {
      continue;
    }
    return false;
  }
  return true;
}

function extractGitDiffPathspecs(args: string[]): string[] {
  const separatorIndex = args.indexOf('--');
  if (separatorIndex === -1 || separatorIndex === args.length - 1) {
    return [];
  }
  return args
    .slice(separatorIndex + 1)
    .map((arg) => arg.trim())
    .filter((arg) => arg.length > 0);
}

function detectAuditEnvRebindingMetaSurface(
  payload: string,
  envAssignments: ReadonlyMap<string, string>,
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string>,
  repoRoot: string | null
): 'run-manifest' | 'run-runner-log' | null {
  for (const [envVar, activePath] of auditStartupAnchorEnvVarPaths.entries()) {
    const reboundPath = envAssignments.get(envVar);
    const normalizedReboundPath = reboundPath
      ? normalizeAuditStartupAnchorPath(reboundPath, repoRoot)
      : null;
    if (!normalizedReboundPath || normalizedReboundPath === activePath) {
      continue;
    }
    if (!new RegExp(`\\$(?:\\{)?${envVar}(?:\\})?\\b`, 'u').test(payload)) {
      continue;
    }
    if (envVar === 'MANIFEST') {
      return 'run-manifest';
    }
    if (envVar === 'RUNNER_LOG' || envVar === 'RUN_LOG') {
      return 'run-runner-log';
    }
  }
  return null;
}

function analyzeStartupAnchorBoundarySegment(
  segment: string,
  touchedPaths: ReadonlySet<string>,
  scopeMode: ReviewScopeMode,
  startupAnchorMode: ReviewStartupAnchorMode | null,
  auditStartupAnchorPaths: ReadonlySet<string>,
  auditStartupAnchorEnvVars: ReadonlySet<string>,
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string>,
  repoRoot: string | null,
  activeCloseoutBundleRoots: ReadonlySet<string>,
  progress: { anchorObserved: boolean; preAnchorMetaSurfaceSamples: string[] },
  shellEnvState: ReviewShellEnvState,
  depth = 0,
  shellDialect: ReviewShellDialect = 'other'
) : ReviewShellEnvState {
  const rawTokens = tokenizeShellSegment(segment);
  const envAssignments = buildCommandEnvAssignments(
    shellEnvState,
    rawTokens,
    REVIEW_SHELL_ENV_INTERPRETER_DEPENDENCIES
  );
  const nextShellEnvState = updateReviewShellEnvStateForSegment(
    shellEnvState,
    rawTokens,
    REVIEW_SHELL_ENV_INTERPRETER_DEPENDENCIES,
    shellDialect
  );
  const strippedTokens = stripLeadingEnvAssignments(rawTokens);
  if (strippedTokens.length === 0) {
    return nextShellEnvState;
  }

  const tokens = unwrapEnvCommandTokens(strippedTokens);
  if (tokens.length === 0) {
    return nextShellEnvState;
  }

  if (depth < 3) {
    const payload = extractShellCommandPayload(tokens);
    if (payload) {
      const nestedShellDialect = detectReviewShellDialect(tokens);
      const nestedSegments = splitShellControlSegmentsDetailed(payload);
      let nestedShellEnvState = buildNestedShellEnvState(
        shellEnvState,
        rawTokens,
        REVIEW_SHELL_ENV_INTERPRETER_DEPENDENCIES
      );
      let separatorBefore: ShellControlSeparator = null;
      let previousSegmentTruthiness: boolean | null = null;
      for (const { segment: nestedSegment, separatorAfter } of nestedSegments) {
        if (progress.anchorObserved) {
          return nextShellEnvState;
        }
        const runsInParentShell = segmentRunsInParentShell(separatorBefore, previousSegmentTruthiness);
        const nextNestedShellEnvState = analyzeStartupAnchorBoundarySegment(
          nestedSegment,
          touchedPaths,
          scopeMode,
          startupAnchorMode,
          auditStartupAnchorPaths,
          auditStartupAnchorEnvVars,
          auditStartupAnchorEnvVarPaths,
          repoRoot,
          activeCloseoutBundleRoots,
          progress,
          nestedShellEnvState,
          depth + 1,
          nestedShellDialect
        );
        if (runsInParentShell && separatorCarriesParentShellStateForward(separatorAfter)) {
          nestedShellEnvState = nextNestedShellEnvState;
        }
        previousSegmentTruthiness = inferStaticShellTruthiness(nestedSegment);
        separatorBefore = separatorAfter;
      }
      return nextShellEnvState;
    }
  }

  const command = normalizeCommandToken(tokens[0] ?? '');
  const args = tokens.slice(1);
  const metaSurfaceSamples = classifyMetaSurfaceDirectDetailed(
    command,
    args,
    touchedPaths,
    repoRoot,
    activeCloseoutBundleRoots,
    envAssignments,
    auditStartupAnchorEnvVarPaths,
    shellEnvState.blockedEnvVars
  );
  const directRebindingKind =
    startupAnchorMode === 'audit'
      ? detectAuditEnvRebindingMetaSurface(
          segment,
          envAssignments,
          auditStartupAnchorEnvVarPaths,
          repoRoot
        )
      : null;
  const auditStartupAnchorObserved =
    startupAnchorMode === 'audit' &&
    segmentMatchesAuditStartupAnchorPath(
      command,
      args,
      envAssignments,
      auditStartupAnchorPaths,
      auditStartupAnchorEnvVarPaths,
      shellEnvState.blockedEnvVars,
      repoRoot
    );
  if (!progress.anchorObserved) {
    const preAnchorSamples = metaSurfaceSamples
      .filter(
        (sample) =>
          !(
            startupAnchorMode === 'audit' &&
            isAllowedAuditMetaSurfaceSample(
              sample,
              {
                allowedMetaSurfacePaths: auditStartupAnchorPaths,
                allowedMetaSurfaceEnvVars: auditStartupAnchorEnvVars,
                allowedMetaSurfaceEnvVarPaths: auditStartupAnchorEnvVarPaths
              },
              repoRoot
            )
          )
      )
      .map((sample) => sample.kind);
    if (directRebindingKind && !preAnchorSamples.includes(directRebindingKind)) {
      preAnchorSamples.push(directRebindingKind);
    }
    progress.preAnchorMetaSurfaceSamples.push(...preAnchorSamples);
  }
  const startupAnchorObserved =
    startupAnchorMode === 'audit'
      ? auditStartupAnchorObserved
      : segmentDirectHasTouchedPathAnchor(command, args, touchedPaths, repoRoot) ||
        isDiffScopeAnchorCommand(command, args, scopeMode, touchedPaths, repoRoot);
  if (startupAnchorObserved) {
    progress.anchorObserved = true;
  }
  return nextShellEnvState;
}

function segmentDirectHasTouchedPathAnchor(
  command: string,
  args: string[],
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null
): boolean {
  for (const operand of extractMetaSurfaceOperands(command, args)) {
    for (const candidate of [operand]) {
      if (
        isTouchedScopePath(candidate, touchedPaths, repoRoot) ||
        isTouchedReviewScopePathFamilyOperand(candidate, touchedPaths, repoRoot)
      ) {
        return true;
      }
    }
  }
  return false;
}

function classifyMetaSurfaceDirect(
  command: string,
  args: string[],
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null,
  activeCloseoutBundleRoots: ReadonlySet<string> = new Set(),
  allowedMetaSurfacePaths: ReadonlySet<string> = new Set()
): string[] {
  return classifyMetaSurfaceDirectDetailed(
    command,
    args,
    touchedPaths,
    repoRoot,
    activeCloseoutBundleRoots,
    new Map(),
    new Map(),
    new Set(),
    new Set(),
    allowedMetaSurfacePaths
  ).map((sample) => sample.kind);
}

function isAllowedAuditMetaSurfaceSample(
  sample: { kind: string; candidate: string; operand: string },
  allowedAuditMetaSurfaces: {
    allowedMetaSurfacePaths: ReadonlySet<string>;
    allowedMetaSurfaceEnvVars: ReadonlySet<string>;
    allowedMetaSurfaceEnvVarPaths: ReadonlyMap<string, string>;
  },
  repoRoot: string | null
): boolean {
  if (!AUDIT_ALLOWED_META_SURFACE_KIND_SET.has(sample.kind)) {
    return false;
  }
  const normalizedCandidate = normalizeAuditStartupAnchorPath(sample.candidate, repoRoot);
  return (
    normalizedCandidate !== null &&
    allowedAuditMetaSurfaces.allowedMetaSurfacePaths.has(normalizedCandidate)
  );
}

const REVIEW_SHELL_ENV_INTERPRETER_DEPENDENCIES: ReviewShellEnvInterpreterDependencies = {
  normalizeAuditMetaSurfaceEnvVar,
  normalizeCommandToken,
  stripLeadingEnvAssignments,
  unwrapEnvCommandTokens
};

function sanitizeTelemetrySummaryForPersistence(
  summary: ReviewOutputSummary,
  includeRawTelemetry: boolean,
  telemetryDebugEnvKey: string
): ReviewOutputSummary {
  if (includeRawTelemetry) {
    return summary;
  }
  return {
    ...summary,
    commandStarts: redactTelemetryLines(summary.commandStarts, 'command', telemetryDebugEnvKey),
    heavyCommandStarts: redactTelemetryLines(
      summary.heavyCommandStarts,
      'heavy-command',
      telemetryDebugEnvKey
    ),
    commandIntentViolationSamples: redactTelemetryLines(
      summary.commandIntentViolationSamples,
      'command-intent',
      telemetryDebugEnvKey
    ),
    lastLines: redactTelemetryLines(summary.lastLines, 'output-line', telemetryDebugEnvKey)
  };
}

function redactTelemetryLines(lines: string[], label: string, telemetryDebugEnvKey: string): string[] {
  return lines.map(
    (_line, index) =>
      `[redacted ${label} ${index + 1}; set ${telemetryDebugEnvKey}=1 to persist raw values]`
  );
}

function sanitizeTelemetryErrorForPersistence(
  error: string | null,
  includeRawTelemetry: boolean,
  telemetryDebugEnvKey: string
): string | null {
  if (!error || includeRawTelemetry) {
    return error;
  }
  return `[redacted error; set ${telemetryDebugEnvKey}=1 to persist raw values]`;
}
