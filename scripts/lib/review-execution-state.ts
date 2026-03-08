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

export interface ReviewOutputSummary {
  lineCount: number;
  commandStarts: string[];
  completionCount: number;
  startupEvents: number;
  reviewProgressSignals: number;
  heavyCommandStarts: string[];
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

export interface ReviewExecutionStateOptions {
  blockHeavyCommands?: boolean;
  startedAtMs?: number;
  previewLimit?: number;
  tailLineLimit?: number;
  heavyCommandLimit?: number;
  commandLimit?: number;
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

  private lastOutputAtMs: number;
  private preview = '';
  private lineCount = 0;
  private completionCount = 0;
  private startupEvents = 0;
  private reviewProgressSignals = 0;
  private reviewProgressObserved = false;
  private awaitingCommandLine = false;
  private blockedHeavyCommand: string | null = null;
  private readonly commandStarts: string[] = [];
  private readonly heavyCommandStarts: string[] = [];
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
      this.processLine(line);
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
    return {
      lineCount: this.lineCount,
      commandStarts: [...this.commandStarts],
      completionCount: this.completionCount,
      startupEvents: this.startupEvents,
      reviewProgressSignals: this.reviewProgressSignals,
      heavyCommandStarts: [...this.heavyCommandStarts],
      lastLines: [...this.lastLines]
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

  private processLine(line: string): void {
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
    if (REVIEW_PROGRESS_SIGNAL_LINE_RE.test(trimmed)) {
      this.reviewProgressSignals += 1;
      this.reviewProgressObserved = true;
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
