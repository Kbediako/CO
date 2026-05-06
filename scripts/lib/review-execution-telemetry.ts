import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  ReviewOutputSummary,
  ReviewTerminationBoundaryKind,
  ReviewTerminationBoundaryRecord
} from './review-execution-state.js';

export interface ReviewTelemetryPayload {
  version: number;
  generated_at: string;
  status: 'succeeded' | 'failed';
  review_outcome: ReviewOutcomeDisposition;
  review_verdict: ReviewSemanticVerdict;
  highest_finding_priority: ReviewFindingPriority | null;
  finding_count: number;
  error: string | null;
  output_log_path: string;
  launch_context: ReviewLaunchContext | null;
  termination_boundary: ReviewTerminationBoundaryRecord | null;
  summary: ReviewOutputSummary;
}

export type ReviewOutcomeDisposition =
  | 'clean-success'
  | 'bounded-success'
  | 'failed-boundary'
  | 'failed-other';

export type ReviewSemanticVerdict = 'findings' | 'clean' | 'unknown';
export type ReviewFindingPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface ReviewSemanticVerdictSummary {
  review_verdict: ReviewSemanticVerdict;
  highest_finding_priority: ReviewFindingPriority | null;
  finding_count: number;
}

export interface ReviewLaunchContext {
  scope_flag_mode: 'commit' | 'base' | 'uncommitted' | null;
  prompt_delivery: 'inline' | 'artifact-only';
  reviewer_visible_context_transport: 'inline-prompt' | 'scoped-title' | 'artifact-only';
  reviewer_visible_title_source: 'user' | 'notes-surface' | null;
  legacy_fallback_attempt?: 'review-wrapper-read-only-sandbox-compatibility';
  legacy_fallback_owner?: 'CO-485';
  legacy_fallback_trigger?: string;
  legacy_fallback_introduced_at?: string;
  legacy_fallback_review_at?: string;
  legacy_fallback_expires_at?: string;
  legacy_fallback_removal_condition?: string;
}

export interface BuildReviewTelemetryPayloadOptions {
  status: 'succeeded' | 'failed';
  error?: string | null;
  terminationBoundary?: ReviewTerminationBoundaryRecord | null;
  outputLogPath: string;
  repoRoot: string;
  includeRawTelemetry: boolean;
  telemetryDebugEnvKey: string;
  launchContext?: ReviewLaunchContext | null;
  reviewOutputText?: string | null;
  summary: ReviewOutputSummary;
}

export interface PersistReviewTelemetryOptions {
  payload: ReviewTelemetryPayload;
  telemetryPath: string;
}

export interface ReviewTelemetryPayloadBuilder {
  buildTelemetryPayload(options: {
    status: 'succeeded' | 'failed';
    error?: string | null;
    terminationBoundary?: ReviewTerminationBoundaryRecord | null;
    outputLogPath: string;
    repoRoot: string;
    includeRawTelemetry: boolean;
    telemetryDebugEnvKey: string;
    launchContext?: ReviewLaunchContext | null;
    reviewOutputText?: string | null;
  }): ReviewTelemetryPayload;
}

export interface WriteReviewExecutionTelemetryOptions {
  state: ReviewTelemetryPayloadBuilder;
  status: 'succeeded' | 'failed';
  error?: string | null;
  terminationBoundary?: ReviewTerminationBoundaryRecord | null;
  outputLogPath: string;
  repoRoot: string;
  telemetryPath: string;
  includeRawTelemetry: boolean;
  telemetryDebugEnvKey: string;
  launchContext?: ReviewLaunchContext | null;
  logPersistFailure?: (message: string) => void;
}

export interface LogReviewTelemetryOptions {
  debugTelemetry: boolean;
  telemetryDebugEnvKey: string;
}

export function deriveReviewOutcomeDisposition(options: {
  status: 'succeeded' | 'failed';
  terminationBoundary: ReviewTerminationBoundaryRecord | null;
}): ReviewOutcomeDisposition {
  if (options.status === 'succeeded') {
    return options.terminationBoundary ? 'bounded-success' : 'clean-success';
  }
  return options.terminationBoundary ? 'failed-boundary' : 'failed-other';
}

export function coerceReviewOutcomeDisposition(
  value: unknown
): ReviewOutcomeDisposition | null {
  switch (value) {
    case 'clean-success':
    case 'bounded-success':
    case 'failed-boundary':
    case 'failed-other':
      return value;
    default:
      return null;
  }
}

export function resolveReviewOutcomeDisposition(payload: {
  status: 'succeeded' | 'failed';
  review_outcome?: ReviewOutcomeDisposition | null;
  termination_boundary: ReviewTerminationBoundaryRecord | null;
}): ReviewOutcomeDisposition {
  const derivedDisposition = deriveReviewOutcomeDisposition({
    status: payload.status,
    terminationBoundary: payload.termination_boundary
  });
  const explicitDisposition = coerceReviewOutcomeDisposition(payload.review_outcome ?? null);
  return explicitDisposition === derivedDisposition ? explicitDisposition : derivedDisposition;
}

export function formatReviewOutcomeSummary(payload: {
  status: 'succeeded' | 'failed';
  review_outcome?: ReviewOutcomeDisposition | null;
  termination_boundary: ReviewTerminationBoundaryRecord | null;
  review_verdict?: ReviewSemanticVerdict | null;
  highest_finding_priority?: ReviewFindingPriority | null;
  finding_count?: number | null;
}): string {
  const disposition = resolveReviewOutcomeDisposition(payload);
  const boundaryKind = payload.termination_boundary?.kind ?? null;
  const wrapperSummary = (() => {
    switch (disposition) {
    case 'clean-success':
      return 'clean success';
    case 'bounded-success':
      return boundaryKind
        ? `bounded success via ${boundaryKind}; not a wrapper failure`
        : 'bounded success with preserved termination boundary; not a wrapper failure';
    case 'failed-boundary':
      return boundaryKind
        ? `review-wrapper failure via ${boundaryKind}`
        : 'review-wrapper failure via explicit termination boundary';
    case 'failed-other':
      return 'review command failed without termination-boundary classification; not an explicit wrapper-boundary failure';
    }
  })();
  const semanticSummary = formatReviewSemanticVerdictSummary(payload);
  return semanticSummary ? `${wrapperSummary}; ${semanticSummary}` : wrapperSummary;
}

export function buildReviewTelemetryPayload(
  options: BuildReviewTelemetryPayloadOptions
): ReviewTelemetryPayload {
  const terminationBoundary = sanitizeTerminationBoundaryForPersistence(
    options.terminationBoundary ?? null,
    options.includeRawTelemetry,
    options.telemetryDebugEnvKey
  );
  const semanticVerdict = analyzeReviewSemanticVerdict(options.reviewOutputText ?? '');
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    status: options.status,
    review_outcome: deriveReviewOutcomeDisposition({
      status: options.status,
      terminationBoundary
    }),
    review_verdict: semanticVerdict.review_verdict,
    highest_finding_priority: semanticVerdict.highest_finding_priority,
    finding_count: semanticVerdict.finding_count,
    error: sanitizeTelemetryErrorForPersistence(
      options.error ?? null,
      options.includeRawTelemetry,
      options.telemetryDebugEnvKey
    ),
    output_log_path: path.relative(options.repoRoot, options.outputLogPath),
    launch_context: options.launchContext ?? null,
    termination_boundary: terminationBoundary,
    summary: sanitizeTelemetrySummaryForPersistence(
      options.summary,
      options.includeRawTelemetry,
      options.telemetryDebugEnvKey
    )
  };
}

export async function persistReviewTelemetry(
  options: PersistReviewTelemetryOptions
): Promise<ReviewTelemetryPayload> {
  await writeFile(options.telemetryPath, `${JSON.stringify(options.payload, null, 2)}\n`, 'utf8');
  return options.payload;
}

export async function writeReviewExecutionTelemetry(
  options: WriteReviewExecutionTelemetryOptions
): Promise<ReviewTelemetryPayload | null> {
  try {
    const payloadOptions: Parameters<ReviewTelemetryPayloadBuilder['buildTelemetryPayload']>[0] = {
      status: options.status,
      error: options.error ?? null,
      outputLogPath: options.outputLogPath,
      repoRoot: options.repoRoot,
      includeRawTelemetry: options.includeRawTelemetry,
      telemetryDebugEnvKey: options.telemetryDebugEnvKey,
      launchContext: options.launchContext ?? null,
      reviewOutputText: await readReviewOutputLog(options.outputLogPath)
    };
    if (Object.prototype.hasOwnProperty.call(options, 'terminationBoundary')) {
      payloadOptions.terminationBoundary = options.terminationBoundary;
    }
    const payload = options.state.buildTelemetryPayload(payloadOptions);
    return await persistReviewTelemetry({
      payload,
      telemetryPath: options.telemetryPath
    });
  } catch (telemetryError) {
    const telemetryMessage =
      telemetryError instanceof Error ? telemetryError.message : String(telemetryError);
    const logPersistFailure =
      options.logPersistFailure ??
      ((message: string) => {
        console.error(`[run-review] failed to persist review telemetry: ${message}`);
      });
    logPersistFailure(telemetryMessage);
    return null;
  }
}

export function analyzeReviewSemanticVerdict(outputText: string): ReviewSemanticVerdictSummary {
  const verdictText = extractFinalReviewVerdictText(outputText);
  const structuredVerdict = analyzeStructuredReviewVerdict(verdictText);
  if (structuredVerdict) {
    return structuredVerdict;
  }

  const findings: ParsedReviewFinding[] = [];
  for (const line of verdictText.split(/\r?\n/u)) {
    const finding = parseReviewFindingLine(line);
    if (finding) {
      findings.push(finding);
    }
  }

  const findingsSummary = summarizeReviewFindings(findings);
  if (findingsSummary) {
    return findingsSummary;
  }

  return {
    review_verdict: hasCleanReviewVerdict(verdictText) ? 'clean' : 'unknown',
    highest_finding_priority: null,
    finding_count: 0
  };
}

export function formatReviewSemanticVerdictSummary(payload: {
  review_verdict?: ReviewSemanticVerdict | null;
  highest_finding_priority?: ReviewFindingPriority | null;
  finding_count?: number | null;
}): string | null {
  if (payload.review_verdict === 'findings') {
    const findingCount =
      typeof payload.finding_count === 'number' && Number.isFinite(payload.finding_count)
        ? Math.max(0, Math.trunc(payload.finding_count))
        : 0;
    const findingLabel = findingCount === 1 ? 'finding' : 'findings';
    const priority = payload.highest_finding_priority
      ? `, highest ${payload.highest_finding_priority}`
      : '';
    return `semantic review verdict: findings (${findingCount} ${findingLabel}${priority})`;
  }
  if (payload.review_verdict === 'clean') {
    return 'semantic review verdict: clean';
  }
  if (payload.review_verdict === 'unknown') {
    return 'semantic review verdict: unknown';
  }
  return null;
}

export function coerceReviewSemanticVerdict(value: unknown): ReviewSemanticVerdict | null {
  return value === 'findings' || value === 'clean' || value === 'unknown' ? value : null;
}

export function coerceReviewFindingPriority(value: unknown): ReviewFindingPriority | null {
  return value === 'P0' || value === 'P1' || value === 'P2' || value === 'P3' ? value : null;
}

async function readReviewOutputLog(outputLogPath: string): Promise<string | null> {
  try {
    return await readFile(outputLogPath, 'utf8');
  } catch {
    return null;
  }
}

interface ParsedReviewFinding {
  priority: ReviewFindingPriority | null;
  text: string;
}

function extractFinalReviewVerdictText(outputText: string): string {
  const lines = outputText.split(/\r?\n/u);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.trim() === 'codex') {
      if (isLikelyInspectedCommandOutputMarker(lines, index)) {
        continue;
      }
      return lines.slice(index + 1).join('\n').trim();
    }
  }
  return looksLikeCodexTranscript(lines) ? '' : outputText;
}

function isLikelyInspectedCommandOutputMarker(lines: string[], markerIndex: number): boolean {
  for (let index = markerIndex - 1; index >= 0; index -= 1) {
    const trimmed = lines[index]?.trim() ?? '';
    if (!trimmed) {
      continue;
    }
    if (isTopLevelReviewRuntimeLine(trimmed)) {
      continue;
    }
    if (isCommandResultHeaderLine(lines[index] ?? '')) {
      const commandLine = findCommandLineBeforeResultHeader(lines, index);
      if (isReviewTranscriptInspectionCommandLine(commandLine)) {
        const candidateVerdict = lines.slice(markerIndex + 1).join('\n');
        const hasVerdict =
          analyzeStructuredReviewVerdict(candidateVerdict) ||
          hasCleanReviewVerdict(candidateVerdict) ||
          candidateVerdict.split(/\r?\n/u).some((line) => parseReviewFindingLine(line) !== null);
        return !((lines[markerIndex - 1]?.trim() ?? '') === '' && hasVerdict);
      }
      return looksLikeCodexTranscript(lines.slice(index + 1, markerIndex));
    }
  }
  return false;
}

function isTopLevelReviewRuntimeLine(trimmedLine: string): boolean {
  return trimmedLine.startsWith('[run-review]') || /^\d{4}-\d{2}-\d{2}T[^\s]+\s+(?:TRACE|DEBUG|INFO|WARN|ERROR)\s/u.test(trimmedLine);
}

function isCommandResultHeaderLine(line: string): boolean {
  return /^\s+(?:succeeded|exited \d+|failed) in \d+(?:ms|s):\s*$/u.test(line);
}

function findCommandLineBeforeResultHeader(lines: string[], headerIndex: number): string | null {
  for (let index = headerIndex - 1; index >= 0; index -= 1) {
    const trimmed = lines[index]?.trim() ?? '';
    if (!trimmed) {
      continue;
    }
    return trimmed === 'exec' ? null : trimmed;
  }
  return null;
}

function isReviewTranscriptInspectionCommandLine(commandLine: string | null): boolean {
  if (!commandLine) {
    return false;
  }
  const normalized = commandLine.toLowerCase();
  return (
    /(?:^|[/\s"'=])review\/output(?:-[^/\s"']*)?\.log(?:$|[\s"'])/u.test(normalized) ||
    /\b(?:cat|sed|tail|head|less|rg|grep|awk|nl)\b[\s\S]*(?:^|[/\s"'=])(?:nested-review|codex[^/\s"']*|[^/\s"']*transcript[^/\s"']*)\.log(?:$|[\s"'])/u.test(
      normalized
    )
  );
}

function looksLikeCodexTranscript(lines: string[]): boolean {
  return lines.some((line) => {
    const trimmed = line.trim();
    return (
      trimmed === 'user' ||
      trimmed === 'thinking' ||
      trimmed === 'exec' ||
      trimmed === 'codex' ||
      trimmed === '--------' ||
      /^OpenAI Codex v/u.test(trimmed) ||
      /^(workdir|model|provider|approval|sandbox|reasoning effort|session id):\s/u.test(trimmed)
    );
  });
}

function analyzeStructuredReviewVerdict(verdictText: string): ReviewSemanticVerdictSummary | null {
  const objectText = extractLeadingJsonObjectText(verdictText);
  if (!objectText) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(objectText);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.findings)) {
    return null;
  }
  if (parsed.findings.length === 0) {
    return {
      review_verdict: 'clean',
      highest_finding_priority: null,
      finding_count: 0
    };
  }

  const findings = parsed.findings.map(parseStructuredReviewFinding);
  return (
    summarizeReviewFindings(
      findings.map((finding, index) =>
        finding ?? {
          priority: null,
          text: `structured finding ${index + 1}`
        }
      )
    ) ?? {
      review_verdict: 'findings',
      highest_finding_priority: null,
      finding_count: parsed.findings.length
    }
  );
}

function extractLeadingJsonObjectText(verdictText: string): string | null {
  let trimmed = verdictText.trimStart();
  if (trimmed.startsWith('```')) {
    const firstNewline = trimmed.indexOf('\n');
    if (firstNewline === -1) {
      return null;
    }
    const fenceHeader = trimmed.slice(0, firstNewline).trim().toLowerCase();
    if (fenceHeader !== '```' && fenceHeader !== '```json') {
      return null;
    }
    trimmed = trimmed.slice(firstNewline + 1).trimStart();
  }

  if (!trimmed.startsWith('{')) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(0, index + 1);
      }
    }
  }
  return null;
}

function parseReviewFindingLine(
  line: string
): ParsedReviewFinding | null {
  const match = line.match(/^\s*(?:[-*]\s*)?(?:\d+[.)]\s*)?(?:>\s*)?\[(P[0-3])\]\s+(.+?)\s*$/u);
  if (!match) {
    return null;
  }
  const priority = coerceReviewFindingPriority(match[1]);
  const text = match[2]?.trim();
  if (!priority || !text) {
    return null;
  }
  return { priority, text };
}

function parseStructuredReviewFinding(value: unknown): ParsedReviewFinding | null {
  if (!isRecord(value)) {
    return null;
  }
  const title = normalizeOptionalString(value.title);
  const titleFinding = title ? parseReviewFindingLine(title) : null;
  const priority = titleFinding?.priority ?? parseStructuredReviewFindingPriority(value.priority);
  if (!priority) {
    return null;
  }
  return {
    priority,
    text:
      titleFinding?.text ??
      title ??
      normalizeOptionalString(value.body) ??
      `structured ${priority} finding`
  };
}

function parseStructuredReviewFindingPriority(value: unknown): ReviewFindingPriority | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return coerceReviewFindingPriority(`P${value}`);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toUpperCase();
    return coerceReviewFindingPriority(trimmed.startsWith('P') ? trimmed : `P${trimmed}`);
  }
  return null;
}

function summarizeReviewFindings(
  findings: ParsedReviewFinding[]
): ReviewSemanticVerdictSummary | null {
  const findingKeys = new Map<string, ReviewFindingPriority | null>();
  for (const finding of findings) {
    const priorityKey = finding.priority ?? 'unknown';
    const key = `${priorityKey}:${normalizeReviewFindingText(finding.text)}`;
    if (!findingKeys.has(key)) {
      findingKeys.set(key, finding.priority);
    }
  }

  if (findingKeys.size === 0) {
    return null;
  }

  const priorities = [...findingKeys.values()].filter(
    (priority): priority is ReviewFindingPriority => priority !== null
  );
  return {
    review_verdict: 'findings',
    highest_finding_priority: priorities.sort(compareReviewFindingPriority)[0] ?? null,
    finding_count: findingKeys.size
  };
}

function normalizeReviewFindingText(value: string): string {
  return value
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

function compareReviewFindingPriority(
  left: ReviewFindingPriority,
  right: ReviewFindingPriority
): number {
  return reviewFindingPriorityRanks[left] - reviewFindingPriorityRanks[right];
}

const reviewFindingPriorityRanks: Record<ReviewFindingPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function hasCleanReviewVerdict(outputText: string): boolean {
  return outputText
    .split(/\r?\n/u)
    .some((line) =>
      /^\s*(?:[-*]\s*)?(?:(?:(?:I|[A-Z][^.\n]*?)\s+)?(?:found|find)\s+no\s+actionable\s+(?:(?:correctness|regression)\s+)?(?:issues|findings|regressions)(?:\s+(?:in|for|from|against|with)\b.*)?[.!]?|(?:(?:I|[A-Z][^.\n]*?)\s+)?did\s+not\s+identify\s+an?\s+actionable\s+(?:(?:correctness|regression)\s+)?(?:issue|finding|regression)(?:\s+(?:in|for|from|against|with)\b.*)?[.!]?|no\s+actionable\s+(?:(?:correctness|regression)\s+)?(?:issues|findings|regressions)(?:\s+(?:found|identified|were found|were identified))?(?:\s+(?:in|for|from|against|with)\b.*)?[.!]?|no\s+findings\.?)\s*$/iu.test(
        line
      )
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function logReviewTelemetrySummary(
  payload: ReviewTelemetryPayload,
  telemetryPath: string,
  options: LogReviewTelemetryOptions
): void {
  const summary = payload.summary;
  console.error(`[run-review] review outcome: ${formatReviewOutcomeSummary(payload)}.`);
  console.error(
    `[run-review] review telemetry: ${summary.commandStarts.length} command start(s), ${summary.heavyCommandStarts.length} heavy command start(s), ${summary.startupEvents} delegation startup event(s), ${summary.reviewProgressSignals} review progress signal(s).`
  );
  if (summary.commandIntentViolationCount > 0) {
    console.error(
      `[run-review] command-intent violations detected: ${summary.commandIntentViolationCount} sample(s) across ${summary.commandIntentViolationKinds.join(', ')}.`
    );
  }
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

export function inferTerminationBoundaryKindsFromErrorMessage(
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
