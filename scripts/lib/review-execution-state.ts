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
const DEFAULT_REVIEW_OUTPUT_PREVIEW_LIMIT = 32_768;
const DEFAULT_REVIEW_OUTPUT_SUMMARY_TAIL_LINE_LIMIT = 20;
const DEFAULT_REVIEW_OUTPUT_SUMMARY_HEAVY_COMMAND_LIMIT = 8;
const DEFAULT_REVIEW_OUTPUT_SUMMARY_COMMAND_LIMIT = 64;
const DEFAULT_LOW_SIGNAL_TIMEOUT_MS = 180_000;
const DEFAULT_META_SURFACE_TIMEOUT_MS = 180_000;
const LOW_SIGNAL_MIN_THINKING_BLOCKS = 10;
const LOW_SIGNAL_MIN_COMMAND_STARTS = 10;
const LOW_SIGNAL_MAX_DISTINCT_TARGETS = 4;
const LOW_SIGNAL_MIN_REPEAT_TARGET_HITS = 3;
const LOW_SIGNAL_MIN_REPEAT_SIGNATURE_HITS = 4;
const LOW_SIGNAL_RECENT_COMMAND_WINDOW = LOW_SIGNAL_MIN_COMMAND_STARTS;
const META_SURFACE_MIN_COMMAND_STARTS = 6;
const META_SURFACE_MIN_SIGNALS = 4;
const META_SURFACE_MIN_DISTINCT_SURFACES = 3;
const META_SURFACE_MIN_REPEAT_HITS = 2;
const META_SURFACE_RECENT_SIGNAL_WINDOW = 8;
const REVIEW_INSPECTION_TARGET_RE =
  /([A-Za-z0-9_./-]+\.(?:[cm]?js|[jt]sx?|json|md|ya?ml|toml))/gu;
const REVIEW_META_SURFACE_DELEGATION_TOOL_LINE_RE =
  /^tool\s+delegation\.delegate\.(?:spawn|status|pause|cancel)\(/iu;

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
  metaSurfaceSignals: number;
  distinctMetaSurfaces: number;
  maxMetaSurfaceHits: number;
  metaSurfaceKinds: string[];
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

export interface ReviewMetaSurfaceExpansionState {
  triggered: boolean;
  reason: string | null;
  commandStarts: number;
  metaSurfaceSignals: number;
  distinctMetaSurfaces: number;
  maxMetaSurfaceHits: number;
  timeoutMs: number | null;
}

export interface ReviewExecutionStateOptions {
  blockHeavyCommands?: boolean;
  startedAtMs?: number;
  previewLimit?: number;
  tailLineLimit?: number;
  heavyCommandLimit?: number;
  commandLimit?: number;
  lowSignalTimeoutMs?: number | null;
  metaSurfaceTimeoutMs?: number | null;
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

export class ReviewExecutionState {
  private readonly startedAtMs: number;
  private readonly blockHeavyCommands: boolean;
  private readonly previewLimit: number;
  private readonly tailLineLimit: number;
  private readonly heavyCommandLimit: number;
  private readonly commandLimit: number;
  private readonly lowSignalTimeoutMs: number | null;
  private readonly metaSurfaceTimeoutMs: number | null;

  private lastOutputAtMs: number;
  private preview = '';
  private lineCount = 0;
  private completionCount = 0;
  private startupEvents = 0;
  private reviewProgressSignals = 0;
  private thinkingBlocks = 0;
  private reviewProgressObserved = false;
  private awaitingCommandLine = false;
  private blockedHeavyCommand: string | null = null;
  private lowSignalCandidateSinceMs: number | null = null;
  private metaSurfaceCandidateSinceMs: number | null = null;
  private readonly commandStarts: string[] = [];
  private readonly heavyCommandStarts: string[] = [];
  private readonly recentInspectionTargetSamples: string[][] = [];
  private readonly recentInspectionSignatures: string[] = [];
  private readonly recentMetaSurfaceSamples: Array<string | null> = [];
  private readonly lastLines: string[] = [];
  private readonly pendingFragmentsByStream: PendingFragmentsByStream = {
    stdout: '',
    stderr: ''
  };

  constructor(options: ReviewExecutionStateOptions = {}) {
    this.startedAtMs = options.startedAtMs ?? Date.now();
    this.lastOutputAtMs = this.startedAtMs;
    this.blockHeavyCommands = options.blockHeavyCommands ?? false;
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
    const configuredMetaSurfaceTimeoutMs = options.metaSurfaceTimeoutMs;
    this.metaSurfaceTimeoutMs =
      configuredMetaSurfaceTimeoutMs === undefined
        ? DEFAULT_META_SURFACE_TIMEOUT_MS
        : configuredMetaSurfaceTimeoutMs === null || configuredMetaSurfaceTimeoutMs <= 0
        ? null
        : configuredMetaSurfaceTimeoutMs;
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
      metaSurfaceSignals: inspectionTargetSummary.metaSurfaceSignals,
      distinctMetaSurfaces: inspectionTargetSummary.distinctMetaSurfaces,
      maxMetaSurfaceHits: inspectionTargetSummary.maxMetaSurfaceHits,
      metaSurfaceKinds: inspectionTargetSummary.metaSurfaceKinds,
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

  getMetaSurfaceExpansionState(nowMs = Date.now()): ReviewMetaSurfaceExpansionState {
    const summary = this.buildOutputSummary();
    const triggered =
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
      this.recordMetaSurfaceToolSample(metaSurfaceToolSample);
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
        this.recordInspectionTargets(commandLine);
        const metaSurfaceSample = classifyMetaSurfaceCommandLine(commandLine);
        this.recordMetaSurfaceCommandSample(metaSurfaceSample);
        const heavyCommand = detectHeavyReviewCommand(commandLine);
        if (heavyCommand) {
          if (this.heavyCommandStarts.length < this.heavyCommandLimit) {
            this.heavyCommandStarts.push(commandLine);
          }
          if (this.blockHeavyCommands && !this.blockedHeavyCommand) {
            this.blockedHeavyCommand = commandLine;
          }
        }
        this.awaitingCommandLine = false;
      } else if (
        REVIEW_PROGRESS_SIGNAL_LINE_RE.test(trimmed) ||
        /\bsucceeded in\b|\bexited\b/i.test(trimmed)
      ) {
        this.awaitingCommandLine = false;
      }
    }

    if (/\bsucceeded in\b|\bexited\b/i.test(trimmed)) {
      this.completionCount += 1;
    }

    this.updateLowSignalCandidate(nowMs);
    this.updateMetaSurfaceCandidate(nowMs);
  }

  private recordInspectionTargets(commandLine: string): void {
    const targets = extractInspectionTargets(commandLine);
    if (targets.length === 0) {
      return;
    }
    this.recentInspectionTargetSamples.push(targets);
    while (this.recentInspectionTargetSamples.length > LOW_SIGNAL_RECENT_COMMAND_WINDOW) {
      this.recentInspectionTargetSamples.shift();
    }
    const signature = extractInspectionCommandSignature(commandLine, targets);
    if (!signature) {
      return;
    }
    this.recentInspectionSignatures.push(signature);
    while (this.recentInspectionSignatures.length > LOW_SIGNAL_RECENT_COMMAND_WINDOW) {
      this.recentInspectionSignatures.shift();
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

  private recordMetaSurfaceCommandSample(sample: string | null): void {
    this.recordMetaSurfaceSample(sample);
  }

  private recordMetaSurfaceToolSample(sample: string): void {
    this.recordMetaSurfaceSample(sample);
  }

  private recordMetaSurfaceSample(sample: string | null): void {
    this.recentMetaSurfaceSamples.push(sample);
    while (this.recentMetaSurfaceSamples.length > META_SURFACE_RECENT_SIGNAL_WINDOW) {
      this.recentMetaSurfaceSamples.shift();
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

function splitShellControlSegments(command: string): string[] {
  if (!command.trim()) {
    return [];
  }
  const segments: string[] = [];
  let current = '';
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      segments.push(trimmed);
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
      pushCurrent();
      continue;
    }

    if (char === '&') {
      if (next === '&') {
        pushCurrent();
        index += 1;
        continue;
      }
      pushCurrent();
      continue;
    }

    if (char === '|') {
      if (next === '|') {
        pushCurrent();
        index += 1;
        continue;
      }
      pushCurrent();
      continue;
    }

    current += char;
  }

  pushCurrent();
  return segments;
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

function extractInspectionTargets(commandLine: string): string[] {
  const normalized = commandLine.replace(/\\/gu, '/');
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

function classifyMetaSurfaceCommandLine(commandLine: string): string | null {
  const normalized = normalizeReviewCommandLine(commandLine).replace(/\\/gu, '/');
  const segments = splitShellControlSegments(normalized);
  for (const segment of segments) {
    const kind = classifyMetaSurfaceSegment(segment);
    if (kind) {
      return kind;
    }
  }
  return null;
}

function classifyMetaSurfaceSegment(segment: string, depth = 0): string | null {
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
        const nestedKind = classifyMetaSurfaceSegment(nestedSegment, depth + 1);
        if (nestedKind) {
          return nestedKind;
        }
      }
    }
  }

  const command = normalizeCommandToken(tokens[0] ?? '');
  const args = tokens.slice(1);
  if (isReviewOrchestrationCommand(command, args)) {
    return 'review-orchestration';
  }

  for (const operand of extractMetaSurfaceOperands(command, args)) {
    const operandKind = classifyMetaSurfaceOperand(operand);
    if (operandKind) {
      return operandKind;
    }
  }

  return null;
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

function classifyMetaSurfaceOperand(operand: string): string | null {
  const normalized = operand.trim().replace(/\\/gu, '/');
  if (!normalized) {
    return null;
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
  return null;
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
