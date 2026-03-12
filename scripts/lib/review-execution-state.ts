import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const REVIEW_DELEGATION_STARTUP_LINE_RE = /\bmcp:\s*delegation\s+(starting|ready)\b/i;
const REVIEW_PROGRESS_SIGNAL_LINE_RE = /^(thinking|exec|codex)\b/i;
const REVIEW_HEAVY_SCRIPT_TARGETS = new Set([
  'test',
  'lint',
  'build',
  'typecheck',
  'check',
  'docs:check',
  'docs:freshness'
]);
const REVIEW_NON_BOUNDARY_HEAVY_SCRIPT_TARGETS = new Set(['typecheck', 'check']);
const REVIEW_VALIDATION_SUITE_SCRIPT_TARGETS = new Set(
  [...REVIEW_HEAVY_SCRIPT_TARGETS].filter(
    (target) => !REVIEW_NON_BOUNDARY_HEAVY_SCRIPT_TARGETS.has(target)
  )
);
const REVIEW_PACKAGE_RUN_SUBCOMMAND_ALIASES = new Set(['run', 'run-script', 'rum', 'urn']);
const REVIEW_PACKAGE_TEST_SUBCOMMAND_ALIASES = new Set(['test', 't', 'tst']);
const REVIEW_SHELL_COMMANDS = new Set([
  'bash',
  'sh',
  'zsh',
  'ksh',
  'fish',
  'pwsh',
  'powershell',
  'cmd',
  'cmd.exe'
]);
const REVIEW_SHELL_PROBE_ENV_VARS = new Set(['MANIFEST', 'RUNNER_LOG', 'RUN_LOG']);
const DEFAULT_REVIEW_OUTPUT_PREVIEW_LIMIT = 32_768;
const DEFAULT_REVIEW_OUTPUT_SUMMARY_TAIL_LINE_LIMIT = 20;
const DEFAULT_REVIEW_OUTPUT_SUMMARY_HEAVY_COMMAND_LIMIT = 8;
const DEFAULT_REVIEW_OUTPUT_SUMMARY_COMMAND_LIMIT = 64;
const DEFAULT_LOW_SIGNAL_TIMEOUT_MS = 180_000;
const DEFAULT_VERDICT_STABILITY_TIMEOUT_MS = 180_000;
const DEFAULT_META_SURFACE_TIMEOUT_MS = 180_000;
const REVIEW_ACTIVE_CLOSEOUT_BUNDLE_KIND = 'review-closeout-bundle';
const RELEVANT_REINSPECTION_MIN_COMMAND_STARTS = 8;
const RELEVANT_REINSPECTION_MAX_DISTINCT_TARGETS = 4;
const RELEVANT_REINSPECTION_MIN_REPEAT_TARGET_HITS = 3;
const STARTUP_ANCHOR_META_SURFACE_SIGNAL_BUDGET = 1;
const STARTUP_ANCHOR_ALLOWED_META_SURFACE_KINDS = new Set(['review-support']);
const ARCHITECTURE_CONTEXT_META_SURFACE_KIND = 'architecture-context';
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
const REVIEW_INSPECTION_TARGET_PATH_RE =
  /^(?:[A-Za-z0-9_./-]+\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|py|rb|php|go|rs|java|c|cc|cpp|cxx|h|hh|hpp|cs|swift|kt|kts|scala|exs?|sh|bash|zsh|fish|ps1|sql|html?|css|scss|less))$/u;
const REVIEW_INSPECTION_TARGET_RE =
  /([A-Za-z0-9_./-]+\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|py|rb|php|go|rs|java|c|cc|cpp|cxx|h|hh|hpp|cs|swift|kt|kts|scala|exs?|sh|bash|zsh|fish|ps1|sql|html?|css|scss|less))/gu;
const REVIEW_META_SURFACE_DELEGATION_TOOL_LINE_RE =
  /^tool\s+delegation\.delegate\.(?:spawn|status|pause|cancel)\(/iu;
const REVIEW_COMMAND_INTENT_DELEGATION_TOOL_LINE_RE =
  /^tool\s+delegation\.delegate\.(?:spawn|pause|cancel)\(/iu;
const REVIEW_DIRECT_VALIDATION_RUNNERS = new Set(['vitest', 'jest']);
const REVIEW_COMMAND_INTENT_VIOLATION_SAMPLE_LIMIT = 8;

export type ReviewCommandIntentViolationKind =
  | 'validation-suite'
  | 'validation-runner'
  | 'review-orchestration'
  | 'delegation-control';

export type ReviewScopeMode = 'uncommitted' | 'base' | 'commit';
export type ReviewStartupAnchorMode = 'diff' | 'audit';
type ReviewShellDialect = 'bashlike' | 'zsh' | 'other';

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
  outputLogPath: string;
  repoRoot: string;
  includeRawTelemetry: boolean;
  telemetryDebugEnvKey: string;
}

export interface PersistReviewTelemetryOptions extends ReviewExecutionTelemetryPayloadOptions {
  telemetryPath: string;
  state: ReviewExecutionState;
}

interface RedactedReviewTelemetryPayload {
  version: number;
  generated_at: string;
  status: 'succeeded' | 'failed';
  error: string | null;
  output_log_path: string;
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

interface ReviewCommandIntentViolation {
  kind: ReviewCommandIntentViolationKind;
  sample: string;
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
      this.relevantReinspectionDwellViolation?.distinctTargets ?? summary.distinctInspectionTargets;
    const maxTargetHits =
      this.relevantReinspectionDwellViolation?.maxTargetHits ?? summary.maxInspectionTargetHits;
    return {
      triggered: derivedTriggered,
      reason: derivedTriggered && detectedAtMs !== null
        ? `bounded review relevant-reinspection dwell boundary violated after ${formatDurationMs(
            Math.max(0, detectedAtMs - this.startedAtMs)
          )}: ${commandStarts} command start(s) repeatedly revisited ${distinctTargets} bounded relevant target(s) (max target hit count ${maxTargetHits}) after startup-anchor success without concrete findings or meta-surface drift${
            violationSample
              ? ` via ${violationSample}`
              : ''
          }.`
        : null,
      anchorObserved: this.startupAnchorObserved,
      commandStarts: this.commandStarts.length,
      distinctTargets: summary.distinctInspectionTargets,
      maxTargetHits: summary.maxInspectionTargetHits,
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
  ): RedactedReviewTelemetryPayload {
    const summary = this.buildOutputSummary();
    const persistedSummary = sanitizeTelemetrySummaryForPersistence(
      summary,
      options.includeRawTelemetry,
      options.telemetryDebugEnvKey
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
      summary: persistedSummary
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
    while (this.recentInspectionTargetSamples.length > LOW_SIGNAL_RECENT_COMMAND_WINDOW) {
      this.recentInspectionTargetSamples.shift();
    }
    const signature = extractInspectionCommandSignature(commandLine, targets);
    if (!signature) {
      return targets;
    }
    this.recentInspectionSignatures.push(signature);
    while (this.recentInspectionSignatures.length > LOW_SIGNAL_RECENT_COMMAND_WINDOW) {
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
    const dwellShaped =
      this.startupAnchorObserved &&
      this.reviewProgressObserved &&
      this.commandStarts.length >= RELEVANT_REINSPECTION_MIN_COMMAND_STARTS &&
      summary.distinctInspectionTargets > 0 &&
      summary.distinctInspectionTargets <= RELEVANT_REINSPECTION_MAX_DISTINCT_TARGETS &&
      summary.maxInspectionTargetHits >= RELEVANT_REINSPECTION_MIN_REPEAT_TARGET_HITS &&
      summary.metaSurfaceSignals === 0 &&
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
        distinctTargets: summary.distinctInspectionTargets,
        maxTargetHits: summary.maxInspectionTargetHits
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

  private buildInspectionTargetSummary(): {
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
    for (const targets of this.recentInspectionTargetSamples) {
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
    for (const signature of this.recentInspectionSignatures) {
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
): Promise<ReviewOutputSummary> {
  const payload = options.state.buildTelemetryPayload(options);
  await writeFile(options.telemetryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload.summary;
}

export function logReviewTelemetrySummary(
  summary: ReviewOutputSummary,
  telemetryPath: string,
  options: LogReviewTelemetryOptions
): void {
  console.error(
    `[run-review] review telemetry: ${summary.commandStarts.length} command start(s), ${summary.heavyCommandStarts.length} heavy command start(s), ${summary.startupEvents} delegation startup event(s), ${summary.reviewProgressSignals} review progress signal(s).`
  );
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

type ShellControlSeparator = ';' | '\n' | '&&' | '||' | '|' | '&' | null;

type ShellControlSegment = {
  segment: string;
  separatorAfter: ShellControlSeparator;
};

function splitShellControlSegmentsDetailed(command: string): ShellControlSegment[] {
  if (!command.trim()) {
    return [];
  }
  const segments: ShellControlSegment[] = [];
  let current = '';
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;

  const pushCurrent = (separatorAfter: ShellControlSeparator) => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      segments.push({ segment: trimmed, separatorAfter });
    }
    current = '';
  };

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index] ?? '';
    const next = command[index + 1] ?? '';

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      current += char;
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      current += char;
      continue;
    }

    if (char === ';' || char === '\n') {
      pushCurrent(char);
      continue;
    }

    if (char === '&') {
      if (next === '&') {
        pushCurrent('&&');
        index += 1;
        continue;
      }
      pushCurrent('&');
      continue;
    }

    if (char === '|') {
      if (next === '|') {
        pushCurrent('||');
        index += 1;
        continue;
      }
      pushCurrent('|');
      continue;
    }

    current += char;
  }

  pushCurrent(null);
  return segments;
}

function splitShellControlSegments(command: string): string[] {
  return splitShellControlSegmentsDetailed(command).map((entry) => entry.segment);
}

function separatorCarriesParentShellStateForward(
  separator: ShellControlSeparator
): boolean {
  return separator !== '|' && separator !== '&';
}

function inferStaticShellTruthiness(segment: string): boolean | null {
  const rawTokens = tokenizeShellSegment(segment);
  const strippedTokens = stripLeadingEnvAssignments(rawTokens);
  if (strippedTokens.length === 0) {
    return null;
  }
  const tokens = unwrapEnvCommandTokens(strippedTokens);
  if (tokens.length === 0) {
    return null;
  }
  const command = normalizeCommandToken(tokens[0] ?? '');
  if (command === 'true' || command === ':' || command === 'export' || command === 'unset') {
    return true;
  }
  if (command === 'false') {
    return false;
  }
  return null;
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

function segmentRunsInParentShell(
  separatorBefore: ShellControlSeparator,
  previousSegmentTruthiness: boolean | null
): boolean {
  if (separatorBefore === null || separatorBefore === ';' || separatorBefore === '\n' || separatorBefore === '&') {
    return true;
  }
  if (separatorBefore === '|') {
    return false;
  }
  if (separatorBefore === '&&') {
    return previousSegmentTruthiness === true;
  }
  if (separatorBefore === '||') {
    return previousSegmentTruthiness === false;
  }
  return false;
}

function tokenizeShellSegment(segment: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;

  const pushCurrent = () => {
    if (current.length > 0) {
      tokens.push(current);
      current = '';
    }
  };

  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index] ?? '';

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
        continue;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (/\s/u.test(char)) {
      pushCurrent();
      continue;
    }

    current += char;
  }

  pushCurrent();
  return tokens;
}

function normalizeCommandToken(token: string): string {
  const normalized = token.trim().replace(/\\/gu, '/');
  const basename = normalized.split('/').pop() ?? normalized;
  return basename.replace(/\.(?:exe|cmd|bat|ps1)$/i, '').toLowerCase();
}

function stripLeadingEnvAssignments(tokens: string[]): string[] {
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    index += 1;
  }
  return tokens.slice(index);
}

function packageOptionConsumesValue(option: string): boolean {
  if (/^--(?:prefix|workspace|filter|cwd)$/iu.test(option)) {
    return true;
  }
  if (/^-(?:C|w)$/iu.test(option)) {
    return true;
  }
  return false;
}

function resolvePackageScriptTarget(args: string[]): string | null {
  let index = 0;
  while (index < args.length) {
    const token = args[index] ?? '';
    const normalized = token.toLowerCase();

    if (normalized === '--') {
      const fallback = args[index + 1];
      return fallback ? fallback.toLowerCase() : null;
    }

    if (REVIEW_PACKAGE_TEST_SUBCOMMAND_ALIASES.has(normalized)) {
      return 'test';
    }

    if (REVIEW_PACKAGE_RUN_SUBCOMMAND_ALIASES.has(normalized)) {
      index += 1;
      while (index < args.length) {
        const candidate = args[index] ?? '';
        const candidateNormalized = candidate.toLowerCase();
        if (candidateNormalized === '--') {
          index += 1;
          continue;
        }
        if (candidate.startsWith('-')) {
          index += packageOptionConsumesValue(candidate) ? 2 : 1;
          continue;
        }
        return candidateNormalized;
      }
      return null;
    }

    if (token.startsWith('-')) {
      index += packageOptionConsumesValue(token) ? 2 : 1;
      continue;
    }

    return normalized;
  }
  return null;
}

function unwrapEnvCommandTokens(tokens: string[]): string[] {
  if (tokens.length === 0 || normalizeCommandToken(tokens[0] ?? '') !== 'env') {
    return tokens;
  }

  let index = 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const normalized = token.toLowerCase();

    if (token === '--') {
      index += 1;
      break;
    }

    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      index += 1;
      continue;
    }

    if (normalized === '-u' || normalized === '--unset') {
      index += 2;
      continue;
    }

    if (normalized.startsWith('--unset=')) {
      index += 1;
      continue;
    }

    if (token.startsWith('-')) {
      index += 1;
      continue;
    }

    break;
  }

  return tokens.slice(index);
}

function hasHeavyCommandTokens(tokens: string[]): boolean {
  if (tokens.length === 0) {
    return false;
  }
  const unwrappedTokens = unwrapEnvCommandTokens(tokens);
  if (unwrappedTokens.length === 0) {
    return false;
  }

  if (unwrappedTokens.length !== tokens.length) {
    return hasHeavyCommandTokens(unwrappedTokens);
  }

  const command = normalizeCommandToken(unwrappedTokens[0] ?? '');
  const args = unwrappedTokens.slice(1);

  if (command === 'npm' || command === 'pnpm' || command === 'yarn' || command === 'bun') {
    const scriptTarget = resolvePackageScriptTarget(args);
    return scriptTarget !== null && REVIEW_HEAVY_SCRIPT_TARGETS.has(scriptTarget);
  }

  if (command === 'pytest') {
    return true;
  }

  if (command === 'python' || command === 'python3' || command === 'py') {
    for (let index = 0; index < args.length - 1; index += 1) {
      if ((args[index] ?? '').toLowerCase() !== '-m') {
        continue;
      }
      if (normalizeCommandToken(args[index + 1] ?? '') === 'pytest') {
        return true;
      }
    }
  }

  const firstArg = normalizeCommandToken(args[0] ?? '');
  if (command === 'go' && firstArg === 'test') {
    return true;
  }
  if (command === 'cargo' && firstArg === 'test') {
    return true;
  }
  if (command === 'mvn' || command === 'mvnw' || command === 'gradle' || command === 'gradlew') {
    return args.some((arg) => {
      const normalized = normalizeCommandToken(arg);
      return normalized === 'test' || normalized.endsWith(':test');
    });
  }

  return false;
}

function isShellCommandFlagWithPayload(flag: string): boolean {
  const normalized = flag.toLowerCase();
  if (normalized === '/c' || normalized === '-c') {
    return true;
  }
  return /^-[^-]*c[^-]*$/u.test(normalized);
}

function extractShellCommandPayload(tokens: string[]): string | null {
  if (tokens.length < 2) {
    return null;
  }
  const command = normalizeCommandToken(tokens[0] ?? '');
  if (!REVIEW_SHELL_COMMANDS.has(command)) {
    return null;
  }
  for (let index = 1; index < tokens.length; index += 1) {
    if (!isShellCommandFlagWithPayload(tokens[index] ?? '')) {
      continue;
    }
    if (command === 'cmd') {
      const payload = tokens.slice(index + 1).join(' ').trim();
      return payload.length > 0 ? payload : null;
    }
    const payload = tokens[index + 1];
    return payload ? payload.trim() : null;
  }
  return null;
}

function detectHeavyReviewCommandFromSegment(segment: string, depth = 0): string | null {
  const tokens = stripLeadingEnvAssignments(tokenizeShellSegment(segment));
  if (tokens.length === 0) {
    return null;
  }

  if (depth < 3) {
    const payload = extractShellCommandPayload(tokens);
    if (payload) {
      const nestedSegments = splitShellControlSegments(payload);
      for (const nestedSegment of nestedSegments) {
        const nestedHeavyCommand = detectHeavyReviewCommandFromSegment(nestedSegment, depth + 1);
        if (nestedHeavyCommand) {
          return nestedHeavyCommand;
        }
      }
    }
  }

  return hasHeavyCommandTokens(tokens) ? segment.trim() : null;
}

function detectHeavyReviewCommand(line: string): string | null {
  const segments = splitShellControlSegments(line);
  for (const segment of segments) {
    const heavyCommand = detectHeavyReviewCommandFromSegment(segment);
    if (heavyCommand) {
      return heavyCommand;
    }
  }
  return null;
}

function tokenReferencesReviewShellProbeEnvVar(token: string): boolean {
  const normalized = token.trim().toUpperCase();
  if (!normalized) {
    return false;
  }
  for (const envVar of REVIEW_SHELL_PROBE_ENV_VARS) {
    if (normalized === envVar) {
      return true;
    }
    if (new RegExp(`\\$${envVar}(?=$|[^A-Z0-9_])`, 'u').test(normalized)) {
      return true;
    }
    if (new RegExp(`\\$\\{${envVar}(?=$|[:}?+\\-/])`, 'u').test(normalized)) {
      return true;
    }
    if (new RegExp(`(^|[^A-Z0-9_])${envVar}(?=$|[^A-Z0-9_])`, 'u').test(normalized)) {
      return true;
    }
  }
  return false;
}

function grepOptionConsumesValue(option: string): boolean {
  const normalized = option.toLowerCase();
  return (
    normalized === '-e' ||
    normalized === '-f' ||
    normalized === '-m' ||
    normalized === '--regexp' ||
    normalized === '--file' ||
    normalized === '--max-count' ||
    normalized === '--after-context' ||
    normalized === '--before-context' ||
    normalized === '--context'
  );
}

function grepSegmentUsesExplicitSearchTargets(args: string[]): boolean {
  let patternConsumed = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? '';
    if (!patternConsumed) {
      if (arg === '--') {
        continue;
      }
      if (grepOptionConsumesValue(arg)) {
        if (index + 1 < args.length) {
          if (arg === '-e' || arg === '--regexp') {
            patternConsumed = true;
          }
          index += 1;
        }
        continue;
      }
      if (arg.startsWith('-') && arg !== '-') {
        continue;
      }
      patternConsumed = true;
      continue;
    }
    if (arg === '--') {
      continue;
    }
    if (arg.startsWith('<')) {
      continue;
    }
    return true;
  }
  return false;
}

function segmentLooksLikeShellProbe(rawTokens: string[], depth = 0): boolean {
  const strippedTokens = stripLeadingEnvAssignments(rawTokens);
  if (strippedTokens.length === 0) {
    return false;
  }
  const tokens = unwrapEnvCommandTokens(strippedTokens);
  if (tokens.length === 0) {
    return false;
  }
  const command = normalizeCommandToken(tokens[0] ?? '');
  const args = tokens.slice(1);
  if (depth < 3 && REVIEW_SHELL_COMMANDS.has(command)) {
    const nestedPayload = extractShellCommandPayload(tokens);
    return nestedPayload ? payloadContainsShellProbe(nestedPayload, depth + 1) : false;
  }
  const referencesReviewEnvVar = args.some((token) => tokenReferencesReviewShellProbeEnvVar(token));
  if (!referencesReviewEnvVar) {
    return false;
  }
  if (command === 'printf' || command === 'echo' || command === 'printenv') {
    return true;
  }
  if (command === 'grep') {
    return !grepSegmentUsesExplicitSearchTargets(args);
  }
  if (command === 'declare' || command === 'typeset') {
    return args.some((arg) => arg === '-p' || arg === '-xp' || arg === '-px');
  }
  return false;
}

function payloadContainsShellProbe(payload: string, depth = 0): boolean {
  const segments = splitShellControlSegmentsDetailed(payload);
  for (const { segment } of segments) {
    if (segmentLooksLikeShellProbe(tokenizeShellSegment(segment), depth)) {
      return true;
    }
  }
  return false;
}

function classifyShellProbeCommandLine(commandLine: string): string | null {
  const normalized = normalizeReviewCommandLine(commandLine);
  if (detectHeavyReviewCommand(normalized)) {
    return null;
  }
  const shellTokens = stripLeadingEnvAssignments(tokenizeShellSegment(normalized));
  const payload = extractShellCommandPayload(shellTokens);
  if (!payload) {
    return null;
  }
  return payloadContainsShellProbe(payload) ? normalized : null;
}

function isLikelyReviewCommandLine(line: string): boolean {
  if (!line) {
    return false;
  }
  if (detectHeavyReviewCommand(line)) {
    return true;
  }
  const shellTokens = stripLeadingEnvAssignments(tokenizeShellSegment(line));
  if (extractShellCommandPayload(shellTokens)) {
    return true;
  }
  if (
    /^(?:npm|pnpm|yarn|bun|node|npx|git|bash|sh|zsh|python|pytest|go|cargo|mvn|gradle(?:w)?)\b/i.test(
      line
    )
  ) {
    return true;
  }
  if (line.includes(' in ') && /\s-\w+\s+/u.test(line)) {
    return true;
  }
  return false;
}

function extractInspectionTargets(
  commandLine: string,
  options: {
    touchedPaths?: ReadonlySet<string>;
    repoRoot?: string | null;
  } = {}
): string[] {
  const normalized = commandLine.replace(/\\/gu, '/');
  if (options.touchedPaths && options.touchedPaths.size > 0) {
    const parsedTargets = extractParsedInspectionTargets(
      normalized,
      options.touchedPaths,
      options.repoRoot ?? null
    );
    if (parsedTargets.length > 0) {
      return parsedTargets;
    }
  }
  const targets = new Set<string>();
  for (const match of normalized.matchAll(REVIEW_INSPECTION_TARGET_RE)) {
    const target = match[1]?.trim();
    if (!target) {
      continue;
    }
    targets.add(target.replace(/^\.\/+/u, ''));
  }
  return [...targets];
}

function extractParsedInspectionTargets(
  commandLine: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null
): string[] {
  const touchedTargets = new Set<string>();
  const genericTargets = new Set<string>();
  for (const segment of splitShellControlSegments(commandLine)) {
    collectParsedInspectionTargetsFromSegment(
      segment,
      touchedPaths,
      repoRoot,
      touchedTargets,
      genericTargets
    );
  }
  return touchedTargets.size > 0 ? [...touchedTargets] : [...genericTargets];
}

function collectParsedInspectionTargetsFromSegment(
  segment: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null,
  touchedTargets: Set<string>,
  genericTargets: Set<string>,
  depth = 0
): void {
  const strippedTokens = stripLeadingEnvAssignments(tokenizeShellSegment(segment));
  if (strippedTokens.length === 0) {
    return;
  }
  const tokens = unwrapEnvCommandTokens(strippedTokens);
  if (tokens.length === 0) {
    return;
  }
  if (depth < 3) {
    const payload = extractShellCommandPayload(tokens);
    if (payload) {
      for (const nestedSegment of splitShellControlSegments(payload)) {
        collectParsedInspectionTargetsFromSegment(
          nestedSegment,
          touchedPaths,
          repoRoot,
          touchedTargets,
          genericTargets,
          depth + 1
        );
      }
      return;
    }
  }
  const command = normalizeCommandToken(tokens[0] ?? '');
  const args = tokens.slice(1);
  for (const operand of extractMetaSurfaceOperands(command, args)) {
    for (const candidate of expandMetaSurfaceOperandCandidates(
      command,
      args,
      operand,
      new Map(),
      new Map(),
      new Set(),
      repoRoot
    )) {
      const matchedTouchedPath = resolveTouchedInspectionTarget(candidate, touchedPaths, repoRoot);
      if (matchedTouchedPath) {
        touchedTargets.add(matchedTouchedPath);
        continue;
      }
      const normalizedCandidate = relativizeOperandToRepoRoot(candidate, repoRoot).replace(
        /^\.\/+/u,
        ''
      );
      if (REVIEW_INSPECTION_TARGET_PATH_RE.test(normalizedCandidate)) {
        genericTargets.add(normalizedCandidate);
      }
    }
  }
}

function resolveTouchedInspectionTarget(
  candidate: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null
): string | null {
  for (const touchedPath of touchedPaths) {
    const normalizedTouchedPath = normalizeScopePath(touchedPath);
    if (!normalizedTouchedPath) {
      continue;
    }
    if (isTouchedScopePath(candidate, new Set<string>([normalizedTouchedPath]), repoRoot)) {
      return normalizedTouchedPath;
    }
  }
  return null;
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

function classifyCommandIntentToolLine(line: string): ReviewCommandIntentViolation | null {
  if (REVIEW_COMMAND_INTENT_DELEGATION_TOOL_LINE_RE.test(line)) {
    return {
      kind: 'delegation-control',
      sample: line.trim()
    };
  }
  return null;
}

function classifyCommandIntentCommandLine(
  commandLine: string,
  options: { allowValidationCommandIntents: boolean }
): ReviewCommandIntentViolation | null {
  const normalized = normalizeReviewCommandLine(commandLine).replace(/\\/gu, '/');
  const segments = splitShellControlSegments(normalized);
  for (const segment of segments) {
    const violation = classifyCommandIntentSegment(segment, options, 0);
    if (violation) {
      return violation;
    }
  }
  return null;
}

function classifyCommandIntentSegment(
  segment: string,
  options: { allowValidationCommandIntents: boolean },
  depth: number
): ReviewCommandIntentViolation | null {
  const strippedTokens = stripLeadingEnvAssignments(tokenizeShellSegment(segment));
  if (strippedTokens.length === 0) {
    return null;
  }

  const tokens = unwrapEnvCommandTokens(strippedTokens);
  if (tokens.length === 0) {
    return null;
  }

  if (depth < 3) {
    const payload = extractShellCommandPayload(tokens);
    if (payload) {
      const nestedSegments = splitShellControlSegments(payload);
      for (const nestedSegment of nestedSegments) {
        const nestedViolation = classifyCommandIntentSegment(nestedSegment, options, depth + 1);
        if (nestedViolation) {
          return nestedViolation;
        }
      }
    }
  }

  const command = normalizeCommandToken(tokens[0] ?? '');
  const args = tokens.slice(1);
  if (isReviewOrchestrationCommand(command, args)) {
    return {
      kind: 'review-orchestration',
      sample: segment.trim()
    };
  }

  if (
    !options.allowValidationCommandIntents &&
    isPackageManagerValidationSuiteCommand(command, args)
  ) {
    return {
      kind: 'validation-suite',
      sample: segment.trim()
    };
  }

  if (!options.allowValidationCommandIntents && isDirectValidationRunnerCommand(command, args)) {
    return {
      kind: 'validation-runner',
      sample: segment.trim()
    };
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

type ReviewShellEnvState = {
  shellVars: Map<string, string>;
  exportedVars: Set<string>;
  blockedEnvVars: Set<string>;
};

function createEmptyReviewShellEnvState(
  initialEnvVarPaths: ReadonlyMap<string, string> = new Map()
): ReviewShellEnvState {
  const shellVars = new Map<string, string>();
  for (const [envVar, envPath] of initialEnvVarPaths.entries()) {
    shellVars.set(envVar, envPath);
  }
  return {
    shellVars,
    exportedVars: new Set(shellVars.keys()),
    blockedEnvVars: new Set()
  };
}

function cloneReviewShellEnvState(shellEnvState: ReviewShellEnvState): ReviewShellEnvState {
  return {
    shellVars: new Map(shellEnvState.shellVars),
    exportedVars: new Set(shellEnvState.exportedVars),
    blockedEnvVars: new Set(shellEnvState.blockedEnvVars)
  };
}

function buildBlockedEnvVarSet(
  shellEnvState: ReviewShellEnvState,
  rawTokens: string[]
): Set<string> {
  const blockedEnvVars = new Set(shellEnvState.blockedEnvVars);
  for (const envVar of collectInlineEnvUnsetVars(rawTokens)) {
    blockedEnvVars.add(envVar);
  }
  for (const envVar of collectInlineEnvAssignments(rawTokens).keys()) {
    blockedEnvVars.delete(envVar);
  }
  return blockedEnvVars;
}

function collectLeadingShellAssignments(tokens: string[]): Map<string, string> {
  const assignments = new Map<string, string>();
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    recordInlineEnvAssignment(assignments, tokens[index] ?? '');
    index += 1;
  }
  return assignments;
}

function buildCommandEnvAssignments(
  shellEnvState: ReviewShellEnvState,
  rawTokens: string[]
): Map<string, string> {
  const envAssignments = commandUsesCleanEnvironment(rawTokens)
    ? new Map<string, string>()
    : mergeEnvAssignments(shellEnvState.shellVars, new Map());
  for (const envVar of shellEnvState.blockedEnvVars) {
    envAssignments.delete(envVar);
  }
  return mergeEnvAssignments(envAssignments, collectInlineEnvAssignments(rawTokens));
}

function buildNestedShellEnvState(
  shellEnvState: ReviewShellEnvState,
  rawTokens: string[]
): ReviewShellEnvState {
  const blockedEnvVars = buildBlockedEnvVarSet(shellEnvState, rawTokens);
  const usesCleanEnvironment = commandUsesCleanEnvironment(rawTokens);
  const shellVars = new Map<string, string>();
  if (!usesCleanEnvironment) {
    for (const envVar of shellEnvState.exportedVars) {
      if (blockedEnvVars.has(envVar)) {
        continue;
      }
      const value = shellEnvState.shellVars.get(envVar);
      if (value !== undefined) {
        shellVars.set(envVar, value);
      }
    }
  }
  for (const [key, value] of collectInlineEnvAssignments(rawTokens).entries()) {
    shellVars.set(key, value);
    blockedEnvVars.delete(key);
  }
  return {
    shellVars,
    exportedVars: new Set(shellVars.keys()),
    blockedEnvVars
  };
}

function updateReviewShellEnvStateForSegment(
  shellEnvState: ReviewShellEnvState,
  rawTokens: string[],
  shellDialect: ReviewShellDialect = 'other'
): ReviewShellEnvState {
  const nextState = cloneReviewShellEnvState(shellEnvState);
  const leadingAssignments = collectLeadingShellAssignments(rawTokens);
  const strippedTokens = stripLeadingEnvAssignments(rawTokens);

  if (strippedTokens.length === 0) {
    for (const [key, value] of leadingAssignments.entries()) {
      nextState.shellVars.set(key, value);
      nextState.blockedEnvVars.delete(key);
    }
    return nextState;
  }

  const tokens = unwrapEnvCommandTokens(strippedTokens);
  if (tokens.length === 0) {
    return nextState;
  }

  const command = normalizeCommandToken(tokens[0] ?? '');
  if (command === 'export') {
    const exportTokens = tokens.slice(1);
    const bashLikeUnexportMode = shellDialect === 'bashlike' && exportTokens.includes('-n');
    if (shellDialect === 'bashlike' && !bashLikeUnexportMode) {
      applyBashLikeLeadingBareExportAssignments(nextState, exportTokens, leadingAssignments);
    }
    applyExportTokensToReviewShellEnvState(
      nextState,
      exportTokens,
      leadingAssignments,
      shellDialect
    );
    return nextState;
  }

  if (command === 'unset') {
    applyUnsetTokensToReviewShellEnvState(nextState, tokens.slice(1));
    return nextState;
  }

  return nextState;
}

function applyBashLikeLeadingBareExportAssignments(
  shellEnvState: ReviewShellEnvState,
  tokens: string[],
  leadingAssignments: ReadonlyMap<string, string>
): void {
  if (leadingAssignments.size === 0) {
    return;
  }

  const bareExportTargets = new Set<string>();
  for (const token of tokens) {
    if (!token || token.startsWith('-') || /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      continue;
    }
    const normalized = token.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase();
    if (normalized) {
      bareExportTargets.add(normalized);
    }
  }

  for (const [key, value] of leadingAssignments.entries()) {
    if (!bareExportTargets.has(key)) {
      continue;
    }
    shellEnvState.shellVars.set(key, value);
    shellEnvState.exportedVars.add(key);
    shellEnvState.blockedEnvVars.delete(key);
  }
}

function applyExportTokensToReviewShellEnvState(
  shellEnvState: ReviewShellEnvState,
  tokens: string[],
  leadingAssignments: ReadonlyMap<string, string> = new Map(),
  shellDialect: ReviewShellDialect = 'other'
): void {
  let bashLikeExportMode: 'export' | 'unexport' = 'export';
  for (const token of tokens) {
    if (!token) {
      continue;
    }
    if (shellDialect === 'bashlike' && token === '-n') {
      bashLikeExportMode = 'unexport';
      continue;
    }
    if (token === '--') {
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      if (bashLikeExportMode === 'unexport') {
        continue;
      }
      const assignments = new Map<string, string>();
      recordInlineEnvAssignment(assignments, token);
      for (const [key, value] of assignments.entries()) {
        let resolvedValue = value;
        const normalizedInlineEnvVar = normalizeAuditMetaSurfaceEnvVar(value);
        if (normalizedInlineEnvVar) {
          const expansionEnv = new Map(shellEnvState.shellVars);
          for (const [leadingKey, leadingValue] of leadingAssignments.entries()) {
            if (leadingKey !== key) {
              expansionEnv.set(leadingKey, leadingValue);
            }
          }
          const currentValue = expansionEnv.get(normalizedInlineEnvVar);
          resolvedValue = currentValue ?? '';
        }
        shellEnvState.shellVars.set(key, resolvedValue);
        shellEnvState.exportedVars.add(key);
        shellEnvState.blockedEnvVars.delete(key);
      }
      continue;
    }
    if (token.startsWith('-')) {
      continue;
    }
    const normalized = token.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase();
    if (!normalized) {
      continue;
    }
    if (bashLikeExportMode === 'unexport') {
      shellEnvState.exportedVars.delete(normalized);
      continue;
    }
    if (shellEnvState.shellVars.has(normalized)) {
      shellEnvState.exportedVars.add(normalized);
      shellEnvState.blockedEnvVars.delete(normalized);
    }
  }
}

function applyUnsetTokensToReviewShellEnvState(
  shellEnvState: ReviewShellEnvState,
  tokens: string[]
): void {
  for (const token of tokens) {
    if (!token || token.startsWith('-')) {
      continue;
    }
    const normalized = token.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase();
    if (!normalized) {
      continue;
    }
    shellEnvState.shellVars.delete(normalized);
    shellEnvState.exportedVars.delete(normalized);
    shellEnvState.blockedEnvVars.add(normalized);
  }
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
  const envAssignments = buildCommandEnvAssignments(shellEnvState, rawTokens);
  const nextShellEnvState = updateReviewShellEnvStateForSegment(
    shellEnvState,
    rawTokens,
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
      let nestedShellEnvState = buildNestedShellEnvState(shellEnvState, rawTokens);
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
  const inlineAssignedEnvVars = new Set(collectInlineEnvAssignments(rawTokens).keys());
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

function expandMetaSurfaceOperandCandidates(
  command: string,
  args: string[],
  operand: string,
  envAssignments: ReadonlyMap<string, string> = new Map(),
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string> = new Map(),
  blockedEnvVars: ReadonlySet<string> = new Set(),
  repoRoot: string | null = null
): string[] {
  const candidates: string[] = [];
  const normalizedEnvVar = normalizeAuditMetaSurfaceEnvVar(operand);
  const resolvedEnvPath = resolveAuditMetaSurfaceEnvOperandPath(
    operand,
    envAssignments,
    auditStartupAnchorEnvVarPaths,
    blockedEnvVars,
    repoRoot
  );
  if (resolvedEnvPath) {
    candidates.push(resolvedEnvPath);
  }
  if (normalizedEnvVar && blockedEnvVars.has(normalizedEnvVar)) {
    return candidates;
  }
  candidates.push(operand);
  const gitRevisionPathCandidate = extractGitRevisionPathCandidate(command, args, operand);
  if (gitRevisionPathCandidate) {
    candidates.push(gitRevisionPathCandidate);
  }
  return candidates;
}

function collectInlineEnvAssignments(tokens: string[]): Map<string, string> {
  const assignments = new Map<string, string>();
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    recordInlineEnvAssignment(assignments, tokens[index] ?? '');
    index += 1;
  }

  if (normalizeCommandToken(tokens[index] ?? '') !== 'env') {
    return assignments;
  }

  index += 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const normalized = token.toLowerCase();
    if (token === '--') {
      index += 1;
      break;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      recordInlineEnvAssignment(assignments, token);
      index += 1;
      continue;
    }
    if (normalized === '-u' || normalized === '--unset') {
      index += 2;
      continue;
    }
    if (normalized.startsWith('--unset=')) {
      index += 1;
      continue;
    }
    if (token.startsWith('-')) {
      index += 1;
      continue;
    }
    break;
  }
  return assignments;
}

function commandUsesCleanEnvironment(tokens: string[]): boolean {
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    index += 1;
  }

  if (normalizeCommandToken(tokens[index] ?? '') !== 'env') {
    return false;
  }

  index += 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const normalized = token.toLowerCase();
    if (token === '--') {
      return false;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      index += 1;
      continue;
    }
    if (normalized === '-i' || normalized === '--ignore-environment') {
      return true;
    }
    if ((normalized === '-u' || normalized === '--unset') && index + 1 < tokens.length) {
      index += 2;
      continue;
    }
    if (normalized.startsWith('--unset=')) {
      index += 1;
      continue;
    }
    if (token.startsWith('-')) {
      index += 1;
      continue;
    }
    return false;
  }

  return false;
}

function collectInlineEnvUnsetVars(tokens: string[]): Set<string> {
  const unsetVars = new Set<string>();
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    index += 1;
  }

  if (normalizeCommandToken(tokens[index] ?? '') !== 'env') {
    return unsetVars;
  }

  index += 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const normalized = token.toLowerCase();
    if (token === '--') {
      index += 1;
      break;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      index += 1;
      continue;
    }
    if ((normalized === '-u' || normalized === '--unset') && index + 1 < tokens.length) {
      const envVar = tokens[index + 1]?.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase();
      if (envVar) {
        unsetVars.add(envVar);
      }
      index += 2;
      continue;
    }
    if (normalized.startsWith('--unset=')) {
      const envVar = normalized
        .slice('--unset='.length)
        .trim()
        .replace(/^\$/u, '')
        .replace(/[{}]/gu, '')
        .toUpperCase();
      if (envVar) {
        unsetVars.add(envVar);
      }
      index += 1;
      continue;
    }
    if (token.startsWith('-')) {
      index += 1;
      continue;
    }
    break;
  }
  return unsetVars;
}

function recordInlineEnvAssignment(assignments: Map<string, string>, token: string): void {
  const separatorIndex = token.indexOf('=');
  if (separatorIndex <= 0) {
    return;
  }
  const key = token.slice(0, separatorIndex).trim().toUpperCase();
  const value = token.slice(separatorIndex + 1).trim();
  if (!key || !value) {
    return;
  }
  assignments.set(key, value);
}

function resolveAuditMetaSurfaceEnvOperandPath(
  operand: string,
  envAssignments: ReadonlyMap<string, string>,
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string>,
  blockedEnvVars: ReadonlySet<string>,
  repoRoot: string | null
): string | null {
  const normalizedEnvVar = normalizeAuditMetaSurfaceEnvVar(operand);
  if (!normalizedEnvVar) {
    return null;
  }
  if (blockedEnvVars.has(normalizedEnvVar)) {
    return null;
  }
  const inlineValue = envAssignments.get(normalizedEnvVar);
  if (inlineValue !== undefined) {
    const normalizedInlinePath = normalizeAuditStartupAnchorPath(inlineValue, repoRoot);
    if (normalizedInlinePath) {
      return normalizedInlinePath;
    }
    return null;
  }
  return auditStartupAnchorEnvVarPaths.get(normalizedEnvVar) ?? null;
}

function mergeEnvAssignments(
  inheritedEnvAssignments: ReadonlyMap<string, string>,
  nextEnvAssignments: ReadonlyMap<string, string>
): Map<string, string> {
  const merged = new Map(inheritedEnvAssignments);
  for (const [key, value] of nextEnvAssignments.entries()) {
    merged.set(key, value);
  }
  return merged;
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

function extractGitRevisionPathCandidate(
  command: string,
  args: string[],
  operand: string
): string | null {
  if (command !== 'git') {
    return null;
  }
  const invocation = resolveGitInvocation(args);
  if (invocation.subcommand !== 'show') {
    return null;
  }
  const normalizedOperand = operand.replace(/\\/gu, '/');
  if (normalizedOperand.startsWith(':')) {
    return normalizedOperand.slice(1);
  }
  if (normalizedOperand.includes('://')) {
    return null;
  }
  const separatorIndex = normalizedOperand.lastIndexOf(':');
  if (separatorIndex <= 0 || separatorIndex === normalizedOperand.length - 1) {
    return null;
  }
  return normalizedOperand.slice(separatorIndex + 1);
}

function resolveGitInvocation(args: string[]): { subcommand: string | null; subcommandArgs: string[] } {
  let index = 0;
  while (index < args.length) {
    const token = args[index] ?? '';
    const normalized = normalizeCommandToken(token);
    if (!normalized) {
      index += 1;
      continue;
    }
    if (normalized === '--') {
      return { subcommand: null, subcommandArgs: [] };
    }
    if (token.startsWith('-')) {
      index += gitOptionConsumesValue(token) && !token.includes('=') ? 2 : 1;
      continue;
    }
    return { subcommand: normalized, subcommandArgs: args.slice(index + 1) };
  }
  return { subcommand: null, subcommandArgs: [] };
}

function gitOptionConsumesValue(option: string): boolean {
  const normalized = option.toLowerCase();
  return (
    normalized === '-c' ||
    normalized === '-C' ||
    normalized === '--git-dir' ||
    normalized.startsWith('--git-dir=') ||
    normalized === '--work-tree' ||
    normalized.startsWith('--work-tree=') ||
    normalized === '--namespace' ||
    normalized.startsWith('--namespace=') ||
    normalized === '--exec-path' ||
    normalized.startsWith('--exec-path=') ||
    normalized === '--config-env' ||
    normalized.startsWith('--config-env=') ||
    normalized === '--super-prefix' ||
    normalized.startsWith('--super-prefix=')
  );
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
  const envAssignments = buildCommandEnvAssignments(shellEnvState, rawTokens);
  const nextShellEnvState = updateReviewShellEnvStateForSegment(
    shellEnvState,
    rawTokens,
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
      let nestedShellEnvState = buildNestedShellEnvState(shellEnvState, rawTokens);
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

function segmentMatchesAuditStartupAnchorPath(
  command: string,
  args: string[],
  envAssignments: ReadonlyMap<string, string>,
  auditStartupAnchorPaths: ReadonlySet<string>,
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string>,
  blockedEnvVars: ReadonlySet<string>,
  repoRoot: string | null
): boolean {
  if (auditStartupAnchorPaths.size === 0) {
    return false;
  }
  for (const operand of extractMetaSurfaceOperands(command, args)) {
    for (const candidate of expandMetaSurfaceOperandCandidates(
      command,
      args,
      operand,
      envAssignments,
      auditStartupAnchorEnvVarPaths,
      blockedEnvVars,
      repoRoot
    )) {
      const normalizedOperand = normalizeAuditStartupAnchorPath(candidate, repoRoot);
      if (normalizedOperand && auditStartupAnchorPaths.has(normalizedOperand)) {
        return true;
      }
    }
  }
  return false;
}

function normalizeAuditStartupAnchorPath(candidate: string, repoRoot: string | null): string | null {
  const normalized = candidate.trim().replace(/\\/gu, '/');
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith('$')) {
    return null;
  }
  if (normalized.startsWith('/')) {
    return normalizeScopePath(normalized);
  }
  if (/^[A-Za-z]:\//u.test(normalized)) {
    return normalizeScopePath(normalized);
  }
  if (!repoRoot) {
    return normalizeScopePath(normalized);
  }
  return normalizeScopePath(path.resolve(repoRoot, normalized));
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

function classifyMetaSurfaceDirectDetailed(
  command: string,
  args: string[],
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null,
  activeCloseoutBundleRoots: ReadonlySet<string> = new Set(),
  envAssignments: ReadonlyMap<string, string> = new Map(),
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string> = new Map(),
  blockedEnvVars: ReadonlySet<string> = new Set(),
  inlineAssignedEnvVars: ReadonlySet<string> = new Set(),
  allowedMetaSurfacePaths: ReadonlySet<string> = new Set()
): Array<{ kind: string; candidate: string; operand: string }> {
  const detailedSamples: Array<{ kind: string; candidate: string; operand: string }> = [];
  for (const operand of extractMetaSurfaceOperands(command, args)) {
    const resolvedEnvPath = resolveAuditMetaSurfaceEnvOperandPath(
      operand,
      envAssignments,
      auditStartupAnchorEnvVarPaths,
      blockedEnvVars,
      repoRoot
    );
    const normalizedEnvVar = normalizeAuditMetaSurfaceEnvVar(operand);
    if (resolvedEnvPath && normalizedEnvVar) {
      const allowedAuditEnvPath = auditStartupAnchorEnvVarPaths.get(normalizedEnvVar) ?? null;
      if (normalizedEnvVar === 'MANIFEST') {
        if (allowedAuditEnvPath && resolvedEnvPath === allowedAuditEnvPath) {
          detailedSamples.push({ kind: 'run-manifest', candidate: resolvedEnvPath, operand });
          continue;
        }
      }
      if (normalizedEnvVar === 'RUNNER_LOG' || normalizedEnvVar === 'RUN_LOG') {
        if (allowedAuditEnvPath && resolvedEnvPath === allowedAuditEnvPath) {
          detailedSamples.push({ kind: 'run-runner-log', candidate: resolvedEnvPath, operand });
          continue;
        }
      }
    }
    const candidates =
      resolvedEnvPath &&
      normalizedEnvVar &&
      !inlineAssignedEnvVars.has(normalizedEnvVar)
        ? [resolvedEnvPath]
        : expandMetaSurfaceOperandCandidates(
            command,
            args,
            operand,
            envAssignments,
            auditStartupAnchorEnvVarPaths,
            blockedEnvVars,
            repoRoot
          );
    for (const candidate of candidates) {
      const operandKind = classifyMetaSurfaceOperand(
        candidate,
        touchedPaths,
        repoRoot,
        activeCloseoutBundleRoots,
        allowedMetaSurfacePaths
      );
      if (operandKind) {
        detailedSamples.push({ kind: operandKind, candidate, operand });
        break;
      }
    }
  }
  return detailedSamples;
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

function normalizeAuditMetaSurfaceEnvVar(candidate: string): string | null {
  const trimmed = candidate.trim();
  const match = /^\$(?:\{)?([A-Z_]+)(?:\})?$/iu.exec(trimmed);
  return match?.[1]?.toUpperCase() ?? null;
}

function normalizeAuditMetaSurfaceEnvVarPathMap(
  entries: Record<string, string> | undefined,
  repoRoot: string | null
): Map<string, string> {
  const normalized = new Map<string, string>();
  if (!entries) {
    return normalized;
  }
  for (const [key, value] of Object.entries(entries)) {
    const normalizedKey = key.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase();
    const normalizedValue = normalizeAuditStartupAnchorPath(value, repoRoot);
    if (normalizedKey && normalizedValue) {
      normalized.set(normalizedKey, normalizedValue);
    }
  }
  return normalized;
}

function isReviewOrchestrationCommand(command: string, args: string[]): boolean {
  if (command === 'npm' || command === 'pnpm' || command === 'yarn' || command === 'bun') {
    return resolvePackageScriptTarget(args) === 'review';
  }

  const firstArg = normalizeCommandToken(args[0] ?? '');
  const secondArg = normalizeCommandToken(args[1] ?? '');
  if (command === 'codex-orchestrator') {
    return (
      firstArg === 'review' ||
      (firstArg === 'start' &&
        (secondArg === 'docs-review' ||
          secondArg === 'implementation-gate' ||
          secondArg === 'diagnostics'))
    );
  }
  if (command === 'codex') {
    return firstArg === 'review';
  }
  if (command === 'node') {
    return args.some(
      (arg) =>
        normalizeCommandToken(arg) === 'run-review.ts' ||
        normalizeCommandToken(arg) === 'run-review.js'
    );
  }
  return false;
}

function isDirectValidationRunnerCommand(command: string, args: string[]): boolean {
  if (REVIEW_DIRECT_VALIDATION_RUNNERS.has(command)) {
    return true;
  }

  const launcherTarget = resolveValidationLauncherTarget(command, args);
  return launcherTarget !== null && REVIEW_DIRECT_VALIDATION_RUNNERS.has(launcherTarget);
}

function isPackageManagerValidationSuiteCommand(command: string, args: string[]): boolean {
  if (command !== 'npm' && command !== 'pnpm' && command !== 'yarn' && command !== 'bun') {
    return false;
  }
  const scriptTarget = resolvePackageScriptTarget(args);
  return scriptTarget !== null && REVIEW_VALIDATION_SUITE_SCRIPT_TARGETS.has(scriptTarget);
}

function resolveValidationLauncherTarget(command: string, args: string[]): string | null {
  if (command === 'npx' || command === 'bunx') {
    return resolveFirstBinaryLauncherTarget(args);
  }

  const firstArg = normalizeCommandToken(args[0] ?? '');
  if (command === 'npm' && firstArg === 'exec') {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'npm' && firstArg === 'run') {
    return resolvePackageScriptInvocationTarget(args.slice(1));
  }
  if (command === 'pnpm' && (firstArg === 'dlx' || firstArg === 'exec')) {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'pnpm' && firstArg === 'run') {
    return resolvePackageScriptInvocationTarget(args.slice(1));
  }
  if (command === 'pnpm' && firstArg && !firstArg.startsWith('-')) {
    return firstArg;
  }
  if (command === 'yarn' && (firstArg === 'dlx' || firstArg === 'exec')) {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'yarn' && firstArg === 'run') {
    return resolvePackageScriptInvocationTarget(args.slice(1));
  }
  if (command === 'yarn' && firstArg && !firstArg.startsWith('-')) {
    return firstArg;
  }
  if (command === 'bun' && firstArg === 'x') {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'bun' && firstArg === 'run') {
    return resolvePackageScriptInvocationTarget(args.slice(1));
  }
  if (command === 'bun' && firstArg && !firstArg.startsWith('-')) {
    return firstArg;
  }

  return null;
}

function resolvePackageScriptInvocationTarget(args: string[]): string | null {
  let index = 0;
  while (index < args.length) {
    const token = args[index] ?? '';
    const normalized = token.toLowerCase();
    if (normalized === '--') {
      const target = args[index + 1];
      return target ? normalizeCommandToken(target) : null;
    }
    if (token.startsWith('-')) {
      index += packageScriptOptionConsumesValue(token) && !token.includes('=') ? 2 : 1;
      continue;
    }
    return normalizeCommandToken(token);
  }
  return null;
}

function resolveFirstBinaryLauncherTarget(
  args: string[],
  options: { skipDlx?: boolean } = {}
): string | null {
  let index = 0;
  while (index < args.length) {
    const token = args[index] ?? '';
    const normalized = token.toLowerCase();
    if (normalized === '--') {
      const target = args[index + 1];
      return target ? normalizeCommandToken(target) : null;
    }
    if (
      options.skipDlx !== false &&
      (normalized === 'dlx' || normalized === 'exec')
    ) {
      index += 1;
      continue;
    }
    if (token.startsWith('-')) {
      index += binaryLauncherOptionConsumesValue(token) && !token.includes('=') ? 2 : 1;
      continue;
    }
    return normalizeCommandToken(token);
  }
  return null;
}

function binaryLauncherOptionConsumesValue(option: string): boolean {
  const normalized = option.toLowerCase();
  return (
    normalized === '-p' ||
    normalized === '--package' ||
    normalized.startsWith('--package=') ||
    normalized === '-c' ||
    normalized === '--call' ||
    normalized.startsWith('--call=') ||
    normalized === '--node-options' ||
    normalized.startsWith('--node-options=')
  );
}

function packageScriptOptionConsumesValue(option: string): boolean {
  const normalized = option.toLowerCase();
  return (
    normalized === '-c' ||
    normalized === '--cwd' ||
    normalized.startsWith('--cwd=') ||
    normalized === '--filter' ||
    normalized.startsWith('--filter=') ||
    normalized === '--workspace' ||
    normalized.startsWith('--workspace=') ||
    normalized === '--workspaces' ||
    normalized === '--top-level' ||
    normalized === '--since' ||
    normalized.startsWith('--since=')
  );
}

function extractMetaSurfaceOperands(command: string, args: string[]): string[] {
  const operands: string[] = [];
  let positionalIndex = 0;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? '';
    if (!token) {
      continue;
    }

    if (token === '--') {
      for (const tail of args.slice(index + 1)) {
        if (shouldCollectMetaSurfacePositional(command, positionalIndex)) {
          operands.push(tail);
        }
        positionalIndex += 1;
      }
      break;
    }

    if (token.startsWith('--manifest=')) {
      operands.push(token.slice('--manifest='.length));
      continue;
    }

    if (token.startsWith('-')) {
      if (token === '--manifest') {
        const manifestValue = args[index + 1];
        if (manifestValue) {
          operands.push(manifestValue);
          index += 1;
        }
        continue;
      }
      if (metaSurfaceOptionConsumesValue(command, token)) {
        if (!token.includes('=')) {
          index += 1;
        }
      }
      continue;
    }

    if (shouldCollectMetaSurfacePositional(command, positionalIndex)) {
      operands.push(token);
    }
    positionalIndex += 1;
  }

  return operands;
}

function metaSurfaceOptionConsumesValue(command: string, option: string): boolean {
  const normalized = option.toLowerCase();
  if (command === 'rg') {
    return (
      normalized === '-g' ||
      normalized === '--glob' ||
      normalized.startsWith('--glob=') ||
      normalized === '--iglob' ||
      normalized.startsWith('--iglob=') ||
      normalized === '-e' ||
      normalized === '--regexp' ||
      normalized.startsWith('--regexp=') ||
      normalized === '-f' ||
      normalized === '--file' ||
      normalized.startsWith('--file=') ||
      normalized === '--pre' ||
      normalized.startsWith('--pre=') ||
      normalized === '--pre-glob' ||
      normalized.startsWith('--pre-glob=') ||
      normalized === '-r' ||
      normalized === '--replace' ||
      normalized.startsWith('--replace=') ||
      normalized === '-t' ||
      normalized === '--type' ||
      normalized.startsWith('--type=') ||
      normalized === '--type-not' ||
      normalized.startsWith('--type-not=')
    );
  }
  if (command === 'grep' || command === 'ggrep') {
    return normalized === '-e' || normalized === '-f';
  }
  return false;
}

function shouldCollectMetaSurfacePositional(command: string, positionalIndex: number): boolean {
  if (command === 'rg' || command === 'grep' || command === 'ggrep') {
    return positionalIndex >= 1;
  }
  return true;
}

function classifyMetaSurfaceOperand(
  operand: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null,
  activeCloseoutBundleRoots: ReadonlySet<string> = new Set(),
  allowedMetaSurfacePaths: ReadonlySet<string> = new Set()
): string | null {
  const normalized = operand.trim().replace(/\\/gu, '/');
  if (!normalized) {
    return null;
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(normalized)) {
    return null;
  }
  if (
    isTouchedScopePath(normalized, touchedPaths, repoRoot) ||
    isTouchedReviewScopePathFamilyOperand(normalized, touchedPaths, repoRoot)
  ) {
    return null;
  }
  const activeCloseoutBundleKind = classifyActiveCloseoutBundleCandidate(
    normalized,
    activeCloseoutBundleRoots,
    repoRoot
  );
  if (activeCloseoutBundleKind) {
    return activeCloseoutBundleKind;
  }
  if (/^\$(?:\{)?MANIFEST(?:\})?$/iu.test(normalized)) {
    return 'run-manifest';
  }
  if (/^\$(?:\{)?(?:RUNNER_LOG|RUN_LOG)(?:\})?$/iu.test(normalized)) {
    return 'run-runner-log';
  }
  if (normalized.includes('.codex/memories/')) {
    return 'codex-memories';
  }
  if (normalized.includes('.codex/skills/')) {
    return 'codex-skills';
  }
  if (normalized.includes('.runs/') && normalized.endsWith('/manifest.json')) {
    return 'run-manifest';
  }
  if (normalized.includes('.runs/') && normalized.endsWith('/runner.ndjson')) {
    return 'run-runner-log';
  }
  const normalizedAllowedMetaSurfacePath = normalizeAuditStartupAnchorPath(normalized, repoRoot);
  if (
    normalizedAllowedMetaSurfacePath !== null &&
    allowedMetaSurfacePaths.has(normalizedAllowedMetaSurfacePath)
  ) {
    return ARCHITECTURE_CONTEXT_META_SURFACE_KIND;
  }
  if (
    normalized.includes('/review/') &&
    /\/(?:prompt\.txt|output\.log|telemetry\.json)$/iu.test(normalized)
  ) {
    return 'review-artifacts';
  }
  if (
    matchesPathSuffix(normalized, 'scripts/pack-smoke.mjs') ||
    matchesPathSuffix(normalized, 'scripts/pack-smoke.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/run-manifests.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/run-manifests.d.ts') ||
    matchesPathSuffix(normalized, 'scripts/lib/review-scope-paths.ts') ||
    matchesPathSuffix(normalized, 'dist/scripts/lib/review-scope-paths.js') ||
    matchesPathSuffix(normalized, 'scripts/run-review.ts') ||
    matchesPathSuffix(normalized, 'scripts/run-review.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/review-execution-state.ts') ||
    matchesPathSuffix(normalized, 'tests/review-scope-paths.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/run-review.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/run-review.spec.js') ||
    matchesPathSuffix(normalized, 'tests/review-execution-state.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/review-execution-state.spec.js')
  ) {
    return 'review-support';
  }
  if (
    matchesPathSuffix(normalized, 'docs/standalone-review-guide.md') ||
    matchesPathSuffix(normalized, 'docs/guides/review-artifacts.md') ||
    /(?:^|\/)docs\/(?:PRD|TECH_SPEC|ACTION_PLAN)-.*standalone-review.*\.md$/iu.test(normalized) ||
    /(?:^|\/)docs\/findings\/.*standalone-review.*\.md$/iu.test(normalized)
  ) {
    return 'review-docs';
  }
  return null;
}

function normalizeScopePath(value: string): string {
  return value.trim().replace(/\\/gu, '/').replace(/^\.\//u, '');
}

function normalizeScopeRoot(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = normalizeScopePath(value).replace(/\/+$/u, '');
  return normalized.length > 0 ? normalized : null;
}

function normalizeActiveCloseoutBundleRoot(value: string | undefined, repoRoot: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = normalizeAuditStartupAnchorPath(value, repoRoot);
  const repoRelativeRoot = normalized ? relativizeOperandToRepoRoot(normalized, repoRoot) : '';
  return repoRelativeRoot.length > 0 ? repoRelativeRoot.replace(/\/+$/u, '') : null;
}

function matchesPathSuffix(value: string, relativePath: string): boolean {
  const normalizedRelativePath = normalizeScopePath(relativePath);
  return value === normalizedRelativePath || value.endsWith(`/${normalizedRelativePath}`);
}

function relativizeOperandToRepoRoot(operand: string, repoRoot: string | null): string {
  if (!repoRoot) {
    return operand;
  }
  if (operand === repoRoot) {
    return '';
  }
  if (operand.startsWith(`${repoRoot}/`)) {
    return operand.slice(repoRoot.length + 1);
  }
  return operand;
}

function classifyActiveCloseoutBundleCandidate(
  candidate: string,
  activeCloseoutBundleRoots: ReadonlySet<string>,
  repoRoot: string | null
): string | null {
  if (activeCloseoutBundleRoots.size === 0) {
    return null;
  }
  const normalized = normalizeScopePath(candidate);
  const repoRelativeOperand = relativizeOperandToRepoRoot(normalized, repoRoot);
  for (const root of activeCloseoutBundleRoots) {
    if (repoRelativeOperand === root || repoRelativeOperand.startsWith(`${root}/`)) {
      return REVIEW_ACTIVE_CLOSEOUT_BUNDLE_KIND;
    }
  }
  return null;
}

function isTouchedScopePath(
  operand: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null = null
): boolean {
  const normalizedOperand = normalizeScopePath(operand);
  const repoRelativeOperand = relativizeOperandToRepoRoot(normalizedOperand, repoRoot);
  const equivalentOperands = new Set<string>([repoRelativeOperand]);
  for (const touchedPath of touchedPaths) {
    if (equivalentOperands.has(normalizeScopePath(touchedPath))) {
      return true;
    }
  }
  return false;
}

function isTouchedReviewScopePathFamilyOperand(
  operand: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null = null
): boolean {
  const normalizedOperand = normalizeScopePath(operand);
  const repoRelativeOperand = relativizeOperandToRepoRoot(normalizedOperand, repoRoot);
  const reviewScopePathFamily = [
    'scripts/lib/review-scope-paths.ts',
    'dist/scripts/lib/review-scope-paths.js',
    'tests/review-scope-paths.spec.ts'
  ];
  if (!reviewScopePathFamily.includes(repoRelativeOperand)) {
    return false;
  }
  return reviewScopePathFamily.some((path) => isTouchedScopePath(path, touchedPaths, repoRoot));
}

function formatCommandIntentViolationLabel(kind: ReviewCommandIntentViolationKind): string {
  if (kind === 'validation-runner') {
    return 'direct validation runner launch';
  }
  if (kind === 'review-orchestration') {
    return 'nested review or pipeline launch';
  }
  return 'delegation control activity';
}

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
