import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  ReviewOutputSummary,
  ReviewTerminationBoundaryKind,
  ReviewTerminationBoundaryRecord
} from './review-execution-state.js';
import {
  buildReviewContractTelemetry,
  type ReviewContractAxisName,
  type ReviewContractAxisVerdict,
  type ReviewContractMode,
  type ReviewContractProposalCounts,
  type ReviewContractTelemetry,
  type ReviewContractTelemetrySource
} from './review-contract.js';

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
  contract_path?: string | null;
  contract_mode?: ReviewContractMode | null;
  contract_validation?: ReviewContractTelemetry['contract_validation'] | null;
  contract_overall_verdict?: ReviewContractAxisVerdict | null;
  axis_verdicts?: Record<ReviewContractAxisName, ReviewContractAxisVerdict | null> | null;
  axis_finding_counts?: Record<ReviewContractAxisName, number> | null;
  proposal_counts?: ReviewContractProposalCounts | null;
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
  prompt_delivery: 'inline' | 'artifact-only' | 'stdin';
  reviewer_visible_context_transport: 'inline-prompt' | 'stdin-prompt' | 'scoped-title' | 'artifact-only';
  reviewer_visible_title_source: 'user' | 'notes-surface' | null;
  transport?: 'codex-review' | 'codex-exec-output-schema';
  output_schema_path?: string;
  output_last_message_path?: string;
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
  contractTelemetry?: ReviewContractTelemetry | null;
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
    contractTelemetry?: ReviewContractTelemetry | null;
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
  contractMode?: ReviewContractMode;
  contractPath?: string | null;
  contractTelemetrySource?: ReviewContractTelemetrySource;
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
  contract_mode?: ReviewContractMode | null;
  contract_validation?: ReviewContractTelemetry['contract_validation'] | null;
  contract_overall_verdict?: ReviewContractAxisVerdict | null;
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
  const contractSummary = formatReviewContractTelemetrySummary(payload);
  return [wrapperSummary, semanticSummary, contractSummary].filter(Boolean).join('; ');
}

export function getEnforceContractReviewFailureReason(payload: {
  status?: 'succeeded' | 'failed' | null;
  review_outcome?: ReviewOutcomeDisposition | null;
  termination_boundary?: ReviewTerminationBoundaryRecord | null;
  launch_context?: Pick<ReviewLaunchContext, 'legacy_fallback_attempt'> | null;
  contract_mode?: ReviewContractMode | null;
  contract_validation?: ReviewContractTelemetry['contract_validation'] | null;
  contract_overall_verdict?: ReviewContractAxisVerdict | null;
  review_verdict?: ReviewSemanticVerdict | null;
} | null, expectedMode?: ReviewContractMode | null): string | null {
  const mode = payload?.contract_mode ?? expectedMode ?? null;
  if (mode !== 'enforce') {
    return null;
  }
  if (!payload) {
    return 'review contract telemetry is missing';
  }
  const reviewOutcome = payload.status
    ? resolveReviewOutcomeDisposition({
        status: payload.status,
        review_outcome: payload.review_outcome ?? null,
        termination_boundary: payload.termination_boundary ?? null
      })
    : coerceReviewOutcomeDisposition(payload.review_outcome ?? null);
  if (reviewOutcome && reviewOutcome !== 'clean-success') {
    return `review outcome is ${reviewOutcome}`;
  }
  if (payload.launch_context?.legacy_fallback_attempt) {
    return `review launch used legacy fallback ${payload.launch_context.legacy_fallback_attempt}`;
  }
  const validationStatus = payload.contract_validation?.status ?? 'missing';
  if (validationStatus !== 'valid') {
    return `review contract validation is ${validationStatus}`;
  }
  const overall = payload.contract_overall_verdict ?? 'unknown';
  if (overall !== 'clean') {
    return `review contract overall verdict is ${overall}`;
  }
  const semanticVerdict = payload.review_verdict ?? 'unknown';
  if (semanticVerdict !== 'clean') {
    return `semantic review verdict is ${semanticVerdict}`;
  }
  return null;
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
  const contractTelemetry = options.contractTelemetry ?? null;
  const useContractSemanticVerdict = contractTelemetry?.contract_mode === 'enforce';
  const effectiveSemanticVerdict =
    useContractSemanticVerdict && contractTelemetry
      ? {
          review_verdict: contractTelemetry.review_verdict,
          highest_finding_priority: contractTelemetry.highest_finding_priority,
          finding_count: contractTelemetry.finding_count
        }
      : semanticVerdict;
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    status: options.status,
    review_outcome: deriveReviewOutcomeDisposition({
      status: options.status,
      terminationBoundary
    }),
    review_verdict: effectiveSemanticVerdict.review_verdict,
    highest_finding_priority: effectiveSemanticVerdict.highest_finding_priority,
    finding_count: effectiveSemanticVerdict.finding_count,
    error: sanitizeTelemetryErrorForPersistence(
      options.error ?? null,
      options.includeRawTelemetry,
      options.telemetryDebugEnvKey
    ),
    output_log_path: path.relative(options.repoRoot, options.outputLogPath),
    launch_context: options.launchContext ?? null,
    termination_boundary: terminationBoundary,
    ...(contractTelemetry
      ? {
          contract_path: contractTelemetry.contract_path,
          contract_mode: contractTelemetry.contract_mode,
          contract_validation: contractTelemetry.contract_validation,
          contract_overall_verdict: contractTelemetry.contract_overall_verdict,
          axis_verdicts: contractTelemetry.axis_verdicts,
          axis_finding_counts: contractTelemetry.axis_finding_counts,
          proposal_counts: contractTelemetry.proposal_counts
        }
      : {}),
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
    const reviewOutputText = await readReviewOutputLog(options.outputLogPath);
    const contractTelemetry =
      options.contractMode && options.contractPath
        ? await buildReviewContractTelemetry({
            mode: options.contractMode,
        outputText: reviewOutputText,
        repoRoot: options.repoRoot,
        contractPath: options.contractPath,
        source: options.contractTelemetrySource
      })
        : null;
    const payloadOptions: Parameters<ReviewTelemetryPayloadBuilder['buildTelemetryPayload']>[0] = {
      status: options.status,
      error: options.error ?? null,
      outputLogPath: options.outputLogPath,
      repoRoot: options.repoRoot,
      includeRawTelemetry: options.includeRawTelemetry,
      telemetryDebugEnvKey: options.telemetryDebugEnvKey,
      launchContext: options.launchContext ?? null,
      reviewOutputText,
      contractTelemetry
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
  let inActionableDefectSection = false;
  for (const line of verdictText.split(/\r?\n/u)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }
    if (isTopLevelReviewRuntimeLine(trimmedLine)) {
      continue;
    }
    if (isActionableDefectSplitHeadingLine(trimmedLine)) {
      inActionableDefectSection = true;
      continue;
    }
    if (inActionableDefectSection) {
      if (isBareActionableDefectNestedHeadingLine(trimmedLine)) {
        continue;
      }
      if (isNonActionableReviewSectionBreakLine(trimmedLine)) {
        inActionableDefectSection = false;
        continue;
      }
      if (isBareReviewSectionBreakHeadingLine(trimmedLine)) {
        inActionableDefectSection = false;
        continue;
      }
      const carriedFinding = parseActionableDefectSummaryFinding(trimmedLine);
      if (carriedFinding) {
        findings.push(carriedFinding);
        continue;
      }
      if (isReviewSectionBreakLine(trimmedLine)) {
        inActionableDefectSection = false;
        continue;
      }
    }
    const finding = parseReviewFindingLine(line) ?? parseActionableDefectFindingLine(line);
    if (finding) {
      findings.push(finding);
    }
  }

  const findingsSummary = summarizeReviewFindings(findings);
  if (findingsSummary) {
    return findingsSummary;
  }

  return {
    review_verdict:
      hasCleanReviewVerdict(verdictText) || hasCleanActionableDefectSectionVerdict(verdictText)
        ? 'clean'
        : 'unknown',
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

export function formatReviewContractTelemetrySummary(payload: {
  contract_mode?: ReviewContractMode | null;
  contract_validation?: ReviewContractTelemetry['contract_validation'] | null;
  contract_overall_verdict?: ReviewContractAxisVerdict | null;
}): string | null {
  if (!payload.contract_mode || payload.contract_mode === 'off') {
    return null;
  }
  const validation = payload.contract_validation;
  const status = validation?.status ?? 'missing';
  const errorCount = validation?.errors?.length ?? 0;
  const overall = payload.contract_overall_verdict ?? 'none';
  if (payload.contract_mode === 'shadow' && status === 'missing') {
    return null;
  }
  return `review contract: mode=${payload.contract_mode}, validation=${status}, overall=${overall}, errors=${errorCount}`;
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
  let sawNonRuntimeCommandOutput = false;
  let sawEarlierCodexMarker = false;
  let sawNestedTranscriptMarker = false;
  for (let index = markerIndex - 1; index >= 0; index -= 1) {
    const trimmed = lines[index]?.trim() ?? '';
    if (!trimmed) {
      continue;
    }
    if (trimmed === 'codex') {
      sawNonRuntimeCommandOutput = true;
      sawEarlierCodexMarker = true;
      continue;
    }
    if (isCodexTranscriptMarkerLine(trimmed)) {
      sawNonRuntimeCommandOutput = true;
      sawNestedTranscriptMarker = true;
      continue;
    }
    if (isTopLevelReviewRuntimeLine(trimmed)) {
      continue;
    }
    if (isCommandResultHeaderLine(lines[index] ?? '')) {
      const commandLine =
        extractInlineCommandLineFromResultHeader(lines[index] ?? '') ??
        findCommandLineBeforeResultHeader(lines, index);
      if (isReviewTranscriptInspectionCommandLine(commandLine)) {
        return !sawNonRuntimeCommandOutput || sawEarlierCodexMarker || sawNestedTranscriptMarker;
      }
    }
    sawNonRuntimeCommandOutput = true;
  }
  return false;
}

function isTopLevelReviewRuntimeLine(trimmedLine: string): boolean {
  return (
    trimmedLine.startsWith('[run-review]') ||
    /^\d{4}-\d{2}-\d{2}T[^\s]+\s+(?:TRACE|DEBUG|INFO|WARN|ERROR)\s/u.test(trimmedLine) ||
    isCodexRolloutItemCleanupNoiseLine(trimmedLine)
  );
}

function isCodexRolloutItemCleanupNoiseLine(trimmedLine: string): boolean {
  return /^(?:(?:trace|debug|info|warn|error)\s+|\d{4}-\d{2}-\d{2}T[^\s]+\s+(?:trace|debug|info|warn|error)\s+)?codex_core::session:\s+failed to record rollout items:\s+thread\b.*\bnot found\b/iu.test(
    trimmedLine
  );
}

function isCodexTranscriptMarkerLine(trimmedLine: string): boolean {
  return (
    trimmedLine === 'user' ||
    trimmedLine === 'thinking' ||
    trimmedLine === 'exec' ||
    trimmedLine === '--------' ||
    /^OpenAI Codex v/u.test(trimmedLine) ||
    /^(workdir|model|provider|approval|sandbox|reasoning effort|session id):\s/u.test(trimmedLine)
  );
}

function isCommandResultHeaderLine(line: string): boolean {
  return STANDALONE_COMMAND_RESULT_HEADER_PATTERN.test(line) || extractInlineCommandLineFromResultHeader(line) !== null;
}

const STANDALONE_COMMAND_RESULT_HEADER_PATTERN =
  /^\s+(?:succeeded|exited \d+|failed) in \d+(?:\.\d+)?(?:ms|s):\s*$/u;

const COMMAND_RESULT_TRAILER_PATTERN =
  /\s(?:succeeded|exited \d+|failed) in \d+(?:\.\d+)?(?:ms|s):\s*$/u;

function extractInlineCommandLineFromResultHeader(line: string): string | null {
  const trailerMatch = line.match(COMMAND_RESULT_TRAILER_PATTERN);
  if (!trailerMatch || typeof trailerMatch.index !== 'number') {
    return null;
  }
  const beforeStatus = line.slice(0, trailerMatch.index).trimEnd();
  const cwdDelimiterIndex = beforeStatus.lastIndexOf(' in ');
  if (cwdDelimiterIndex <= 0) {
    return null;
  }
  const commandLine = beforeStatus.slice(0, cwdDelimiterIndex).trim();
  return commandLine && commandLine.length > 0 ? commandLine : null;
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
    return trimmed === 'codex' || isCodexTranscriptMarkerLine(trimmed);
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
  if (!isRecord(parsed)) return null;
  const structuredFindings = Array.isArray(parsed.findings) ? parsed.findings : null;
  if (structuredFindings && structuredFindings.length > 0) {
    const findings = structuredFindings.map(parseStructuredReviewFinding);
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
        finding_count: structuredFindings.length
      }
    );
  }

  const summarizedVerdict = coerceReviewSemanticVerdict(parsed.review_verdict);
  if (summarizedVerdict) {
    const findingCount =
      typeof parsed.finding_count === 'number' && Number.isFinite(parsed.finding_count)
        ? Math.max(0, Math.trunc(parsed.finding_count))
        : 0;
    return {
      review_verdict: summarizedVerdict,
      highest_finding_priority:
        summarizedVerdict === 'findings' ? coerceReviewFindingPriority(parsed.highest_finding_priority) : null,
      finding_count: summarizedVerdict === 'findings' ? findingCount : 0
    };
  }
  if (structuredFindings && structuredFindings.length === 0 && hasStructuredCleanReviewVerdict(parsed)) {
    return {
      review_verdict: 'clean',
      highest_finding_priority: null,
      finding_count: 0
    };
  }
  return null;
}

function extractLeadingJsonObjectText(verdictText: string): string | null {
  let trimmed = stripLeadingReviewRuntimeNoise(verdictText).trimStart();
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

function stripLeadingReviewRuntimeNoise(value: string): string {
  const lines = value.split(/\r?\n/u);
  let index = 0;
  for (; index < lines.length; index += 1) {
    const trimmed = lines[index]?.trim() ?? '';
    if (!trimmed || isTopLevelReviewRuntimeLine(trimmed)) {
      continue;
    }
    break;
  }
  return lines.slice(index).join('\n');
}

function parseReviewFindingLine(
  line: string
): ParsedReviewFinding | null {
  const candidate = normalizeReviewLabelCandidate(line);
  const match = candidate.match(/^\s*(?:[-*]\s*)?(?:\d+[.)]\s*)?(?:>\s*)?\[(P[0-3])\]:?\s+(.+?)\s*$/u);
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

function parseActionableDefectFindingLine(line: string): ParsedReviewFinding | null {
  const text = parseActionableDefectSummaryText(line);
  return text ? parseActionableDefectSummaryFinding(text) : null;
}

function parseActionableDefectSummaryFinding(text: string): ParsedReviewFinding | null {
  const summaryText = normalizeActionableDefectSummaryBody(text);
  if (!summaryText || isNoOpActionableDefectSummary(summaryText)) {
    return null;
  }
  const normalized = normalizeReviewVerdictClause(summaryText);
  if (isValidationNotRunClause(normalized) || isBenignCleanReviewFollowupClause(normalized)) {
    return null;
  }
  const prioritizedFinding = parseReviewFindingLine(summaryText);
  if (prioritizedFinding) {
    const normalizedPrioritizedText = normalizeReviewVerdictClause(prioritizedFinding.text);
    if (
      isNoOpActionableDefectSummary(prioritizedFinding.text) ||
      isValidationNotRunClause(normalizedPrioritizedText) ||
      isBenignCleanReviewFollowupClause(normalizedPrioritizedText)
    ) {
      return null;
    }
  }
  return {
    priority: prioritizedFinding?.priority ?? null,
    text: `actionable defect: ${prioritizedFinding?.text ?? summaryText}`
  };
}

function normalizeActionableDefectSummaryBody(text: string): string {
  const candidate = normalizeReviewLabelCandidate(text);
  const summaryMatch = candidate.match(/^(?:(?:review\s+)?summary|findings?|defects?)\s*:\s*(?<body>.+?)$/iu);
  return summaryMatch?.groups?.body?.trim() ?? candidate;
}

function parseActionableDefectSummaryText(line: string): string | null {
  const candidate = normalizeReviewLabelCandidate(line);
  const inlineNeutralPrefaceBody = extractInlineNeutralCleanReviewPrefaceBody(candidate);
  if (inlineNeutralPrefaceBody && inlineNeutralPrefaceBody !== candidate) {
    return parseActionableDefectSummaryText(inlineNeutralPrefaceBody);
  }

  const directMatch = candidate.match(/^\s*(?:[-*]\s*)?(?:>\s*)?(?:\d+[.)]\s*)?actionable\s+defects?:\s+(.+?)\s*$/iu);
  if (directMatch?.[1]) {
    return directMatch[1].trim();
  }
  const inlineMatch = candidate.match(/^(?<prefix>.+?)[.!?,;]\s+actionable\s+defects?:\s+(?<summary>.+?)\s*$/iu);
  const summary = inlineMatch?.groups?.summary?.trim();
  if (!summary) {
    return null;
  }
  const prefix = inlineMatch?.groups?.prefix?.trim() ?? '';
  if (
    prefix &&
    isNoOpActionableDefectSummary(summary) &&
    !isAllowedActionableDefectSummaryPrefaceCandidate(prefix)
  ) {
    return `${prefix}, ${summary}`;
  }
  return summary;
}

function isActionableDefectSplitHeadingLine(line: string): boolean {
  const candidate = normalizeReviewLabelCandidate(line)
    .replace(/[:\s]+$/u, '')
    .trim();
  return /^actionable\s+defects?$/iu.test(candidate);
}

function isBareActionableDefectNestedHeadingLine(line: string): boolean {
  const normalized = normalizeReviewVerdictClause(line);
  return /^(?:(?:review\s+)?summary|findings?|defects?):$/u.test(normalized);
}

function isBareReviewSectionBreakHeadingLine(line: string): boolean {
  const normalized = normalizeReviewVerdictClause(line);
  return /^(?:validation|verification|checks?|tests?|test\s+suite|findings?|defects?|summary|review\s+summary|notes?|recommendations?):$/u.test(
    normalized
  );
}

function isNonActionableReviewSectionBreakLine(line: string): boolean {
  const normalized = normalizeReviewVerdictClause(line);
  return /^(?:validation|verification|checks?|tests?|test\s+suite|notes?|recommendations?)\s*:/u.test(normalized);
}

function isReviewSectionBreakLine(line: string): boolean {
  const normalized = normalizeReviewVerdictClause(line);
  return (
    /^(?:findings?|defects?):?\s*(?:none|none\s+(?:(?:was|were)\s+)?(?:found|identified|detected|seen)|no\s+findings?|n\/a|not\s+applicable)?$/u.test(
      normalized
    ) ||
    /^(?:validation|verification|checks?|tests?|test\s+suite|summary|review\s+summary|notes?|recommendations?)\s*:/u.test(
      normalized
    )
  );
}

function isNoOpActionableDefectSummary(value: string): boolean {
  const trimmed = value.replace(/\s+/gu, ' ').trim();
  if (isBlockingCleanReviewVerdictCaveat(trimmed)) {
    return false;
  }
  const candidates = [
    trimmed,
    ...getCleanReviewVerdictAllowedPrefixCandidates(trimmed),
    getActionableDefectSummaryPrefixBeforeTerminalCleanReview(trimmed)
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.some((candidate) => isNoOpActionableDefectSummaryCandidate(candidate));
}

function isNoOpActionableDefectSummaryCandidate(candidate: string): boolean {
  const verdictCandidate = normalizeCleanReviewVerdictCandidate(stripReviewListMarker(candidate));
  const normalizedCandidate = verdictCandidate
    .replace(/[.!]+$/u, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
  if (isDisqualifiedCleanReviewVerdictCandidate(verdictCandidate)) {
    return false;
  }
  return (
    /^(?:i\s+)?did\s+not\s+(?:find|identify|detect|see)\s+(?:any\s+|a\s+)?actionable\s+defects?(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?$/u.test(normalizedCandidate) ||
    /^(?:none|none (?:(?:was|were) )?(?:found|identified|detected|seen)(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?|(?:there\s+(?:are|were|is|was)\s+)?no (?:actionable\s+)?(?:defects?|issues?)(?: (?:(?:was|were) )?(?:found|identified|detected|seen))?(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?|n\/a|not applicable)$/u.test(normalizedCandidate) ||
    hasCleanReviewVerdict(candidate)
  );
}

function getActionableDefectSummaryPrefixBeforeTerminalCleanReview(candidate: string): string | null {
  const splitCandidates = candidate
    .split(CLEAN_REVIEW_VERDICT_SENTENCE_BOUNDARY)
    .map((splitCandidate) => splitCandidate.trim())
    .filter((splitCandidate) => Boolean(splitCandidate));
  if (splitCandidates.length <= 1) {
    return null;
  }
  const terminalCandidate = splitCandidates[splitCandidates.length - 1];
  if (!terminalCandidate || !isCleanReviewVerdictCandidate(terminalCandidate)) {
    return null;
  }
  const prefaces = splitCandidates.slice(0, -1);
  if (!prefaces.every((preface) => isAllowedActionableDefectSummaryPrefaceCandidate(preface))) {
    return null;
  }
  return terminalCandidate;
}

function isAllowedActionableDefectSummaryPrefaceCandidate(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (
    isNoOpActionableDefectSummaryCandidate(trimmed) ||
    isAllowedCleanReviewVerdictPrefaceCandidate(trimmed)
  ) {
    return true;
  }
  const prefix =
    getCleanReviewVerdictPrefixBeforeNonBlockingCaveat(trimmed) ??
    getCleanReviewVerdictPrefixBeforeValidationOnlyNote(trimmed) ??
    getCleanReviewVerdictPrefixBeforeBenignFollowup(trimmed);
  if (!prefix || prefix === trimmed) {
    return false;
  }
  return isAllowedActionableDefectSummaryPrefaceCandidate(prefix);
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

function hasStructuredCleanReviewVerdict(value: Record<string, unknown>): boolean {
  return normalizeOptionalString(value.overall_correctness)?.toLowerCase() === 'patch is correct';
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

const CLEAN_REVIEW_VERDICT_PATTERNS = [
  /^\s*(?:[-*]\s*)?i\s+(?:reviewed|checked|inspected|looked\s+over)\s+(?:the\s+)?(?:changes|diff|patch|implementation|code|update)(?:\s+and)?\s+(?:found|find)\s+no\s+actionable\s+(?:(?:correctness|regression)\s+)?(?:issues|findings|regressions|defects?)(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?(?:[.!]|\.\.\.|…)?\s*$/iu,
  /^\s*(?:[-*]\s*)?(?:(?:(?:I|read-only\s+(?:diff\s+)?inspection(?:\s+(?:in|for|from|against|with|of)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?)\s+)?(?:found|find)\s+no\s+actionable\s+(?:(?:correctness|regression)\s+)?(?:issues|findings|regressions|defects?)(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?(?:[.!]|\.\.\.|…)?|no\s+actionable\s+(?:(?:correctness|regression)\s+)?(?:issues|findings|regressions|defects?)(?:\s+(?:found|identified|detected|seen|(?:was|were)\s+(?:found|identified|detected|seen)))?(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?(?:[.!]|\.\.\.|…)?|no\s+findings\.?)\s*$/iu,
  /^\s*(?:[-*]\s*)?no\s+(?:concrete|discrete)\s+correctness\s+regressions?\s+(?:(?:was|were)\s+)?(?:found|identified|detected|seen)(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?(?:[.!]|\.\.\.|…)?\s*$/iu,
  /^\s*(?:[-*]\s*)?(?:(?:I|read-only\s+(?:diff\s+)?inspection(?:\s+(?:in|for|from|against|with|of)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?)\s+)?did\s+not\s+(?:find|identify|detect|see)\s+(?:any\s+|a\s+)?(?:(?:concrete|discrete|actionable|correctness)\s+)*(?:issues?|findings?|regressions?)(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?(?:[.!]|\.\.\.|…)?\s*$/iu,
  /^\s*(?:[-*]\s*)?(?:(?:I|read-only\s+(?:diff\s+)?inspection(?:\s+(?:in|for|from|against|with|of)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?)\s+)?did\s+not\s+(?:find|identify|detect|see)\s+(?:any\s+|a\s+)?actionable\s+defects?(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?(?:[.!]|\.\.\.|…)?\s*$/iu
] as const;

const REVIEW_SUBJECT_CLEAN_VERDICT_PATTERNS = [
  /^\s*(?:[-*]\s*)?(?:(?:review|(?:the\s+)?reviewer|codex|(?:the\s+)?(?:(?:standalone|bounded|read-only)\s+)?review|(?:the\s+)?(?:bounded|read-only)\s+retry)\s+)(?:found|find)\s+no\s+actionable\s+(?:(?:correctness|regression|diff-local|diff-scoped|code|docs?\/task|docs?|task|packet|registry|metadata|review|semantic|telemetry|parser|handoff|provider-worker|or)\s+)*(?:issues|findings|regressions|defects?)(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?(?:[.!]|\.\.\.|…)?\s*$/iu,
  /^\s*(?:[-*]\s*)?(?:(?:review|(?:the\s+)?reviewer|codex|(?:the\s+)?(?:(?:standalone|bounded|read-only)\s+)?review|(?:the\s+)?(?:bounded|read-only)\s+retry)\s+)did\s+not\s+(?:find|identify|detect|see)\s+(?:any\s+|a\s+)?(?:(?:concrete|discrete|actionable|correctness|diff-local|diff-scoped)\s+)*(?:issues?|findings?|regressions?|defects?)(?:\s+(?:in|for|from|against|with)\b(?:(?![.,!?:;()\n]|\s[-–—]\s).)*)?(?:[.!]|\.\.\.|…)?\s*$/iu
] as const;

const CLEAN_REVIEW_VERDICT_SENTENCE_BOUNDARY =
  /[.!]\s+(?=(?:[-*]\s*)?(?:I\b|No\b|Read-only\b|Review\b|Reviewer\b|Codex\b|The\s+reviewer\b|(?:The\s+)?(?:(?:standalone|bounded|read-only)\s+)?review\b|(?:The\s+)?(?:bounded|read-only)\s+retry\b))/iu;

function getCleanReviewVerdictCandidates(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) {
    return [];
  }
  const inlineNeutralPrefaceBody = extractInlineNeutralCleanReviewPrefaceBody(trimmed);
  const splitCandidates = trimmed
    .split(CLEAN_REVIEW_VERDICT_SENTENCE_BOUNDARY)
    .map((candidate) => candidate.trim())
    .filter((candidate) => Boolean(candidate));
  const terminalSplitCandidate =
    splitCandidates.length > 1 &&
    splitCandidates
      .slice(0, -1)
      .every((candidate) => isAllowedCleanReviewVerdictPrefaceCandidate(candidate))
      ? splitCandidates[splitCandidates.length - 1]
      : null;
  const candidates = [
    { text: trimmed, allowPrefixExtraction: true },
    ...(inlineNeutralPrefaceBody
      ? [
          {
            text: inlineNeutralPrefaceBody,
            allowPrefixExtraction: true
          }
        ]
      : []),
    ...(terminalSplitCandidate
      ? [
          {
            text: terminalSplitCandidate,
            allowPrefixExtraction: true
          }
        ]
      : [])
  ];
  return candidates.flatMap(({ text: candidate, allowPrefixExtraction }) => {
    const allowedPrefixes = allowPrefixExtraction ? getCleanReviewVerdictAllowedPrefixCandidates(candidate) : [];
    const expandedCandidates = [candidate, ...allowedPrefixes];
    return expandedCandidates.flatMap((expandedCandidate) => {
      const actionableDefectSummary = parseActionableDefectSummaryText(expandedCandidate);
      return actionableDefectSummary ? [expandedCandidate, actionableDefectSummary] : [expandedCandidate];
    });
  });
}

function getCleanReviewVerdictAllowedPrefixCandidates(candidate: string): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>([candidate]);
  let current = candidate;
  while (true) {
    const prefix =
      getCleanReviewVerdictPrefixBeforeNonBlockingCaveat(current) ??
      getCleanReviewVerdictPrefixBeforeParenthesizedValidationOnlyNote(current) ??
      getCleanReviewVerdictPrefixBeforeDashSeparatedValidationOnlyNote(current) ??
      getCleanReviewVerdictPrefixBeforeValidationOnlyNote(current) ??
      getCleanReviewVerdictPrefixBeforeBenignFollowup(current);
    if (!prefix || prefix === current || seen.has(prefix)) {
      return candidates;
    }
    candidates.push(prefix);
    seen.add(prefix);
    current = prefix;
  }
}

function isAllowedCleanReviewVerdictPrefaceCandidate(candidate: string): boolean {
  const trimmed = candidate.trim();
  const normalized = normalizeReviewVerdictClause(stripReviewListMarker(trimmed));
  if (
    isCleanReviewVerdictCandidate(trimmed) ||
    isBenignCleanReviewFollowupClause(normalized) ||
    isNeutralCleanReviewPrefaceClause(normalized)
  ) {
    return true;
  }
  const prefix =
    getCleanReviewVerdictPrefixBeforeParenthesizedValidationOnlyNote(trimmed) ??
    getCleanReviewVerdictPrefixBeforeDashSeparatedValidationOnlyNote(trimmed) ??
    getCleanReviewVerdictPrefixBeforeValidationOnlyNote(trimmed) ??
    getCleanReviewVerdictPrefixBeforeBenignFollowup(trimmed);
  if (!prefix || prefix === trimmed) {
    return false;
  }
  return isAllowedCleanReviewVerdictPrefaceCandidate(prefix);
}

function hasCleanReviewVerdict(outputText: string): boolean {
  const lines = outputText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !isTopLevelReviewRuntimeLine(line));
  if (lines.some((line) => isBlockingCleanReviewVerdictCaveat(line))) {
    return false;
  }
  let foundCleanVerdict = false;
  for (const line of lines) {
    if (getCleanReviewVerdictCandidates(line).some((candidate) => isCleanReviewVerdictCandidate(candidate))) {
      foundCleanVerdict = true;
      continue;
    }
    if (!foundCleanVerdict && isAllowedCleanReviewVerdictPrefaceCandidate(line)) {
      continue;
    }
    if (isAllowedCleanReviewVerdictCompanionLine(line)) {
      continue;
    }
    return false;
  }
  return foundCleanVerdict;
}

function hasCleanActionableDefectSectionVerdict(outputText: string): boolean {
  const lines = outputText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !isTopLevelReviewRuntimeLine(line));
  if (lines.some((line) => isBlockingCleanReviewVerdictCaveat(line))) {
    return false;
  }
  let foundCleanVerdict = false;
  let foundNoOpActionableDefectSection = false;
  let inActionableDefectSection = false;
  for (const line of lines) {
    if (isActionableDefectSplitHeadingLine(line)) {
      inActionableDefectSection = true;
      continue;
    }
    if (inActionableDefectSection) {
      if (isBareActionableDefectNestedHeadingLine(line)) {
        continue;
      }
      const sectionBody = normalizeActionableDefectSummaryBody(line);
      if (isNoOpActionableDefectSummary(sectionBody)) {
        foundNoOpActionableDefectSection = true;
        continue;
      }
      const normalizedSectionBody = normalizeReviewVerdictClause(sectionBody);
      if (
        isValidationNotRunClause(normalizedSectionBody) ||
        isBenignCleanReviewFollowupClause(normalizedSectionBody)
      ) {
        continue;
      }
      if (isReviewSectionBreakLine(line)) {
        inActionableDefectSection = false;
        if (isAllowedCleanReviewVerdictCompanionLine(line)) {
          continue;
        }
      }
      return false;
    }
    if (getCleanReviewVerdictCandidates(line).some((candidate) => isCleanReviewVerdictCandidate(candidate))) {
      foundCleanVerdict = true;
      continue;
    }
    if (!foundCleanVerdict && isAllowedCleanReviewVerdictPrefaceCandidate(line)) {
      continue;
    }
    if (isAllowedCleanReviewVerdictCompanionLine(line)) {
      continue;
    }
    return false;
  }
  return foundCleanVerdict || foundNoOpActionableDefectSection;
}

function isAllowedCleanReviewVerdictCompanionLine(line: string): boolean {
  const normalizedLine = normalizeReviewVerdictClause(stripReviewListMarker(line));
  return (
    isValidationNotRunClause(normalizedLine) ||
    isBenignCleanReviewFollowupClause(normalizedLine) ||
    isNeutralCleanReviewPrefaceClause(normalizedLine)
  );
}

function isNeutralCleanReviewPrefaceClause(normalized: string): boolean {
  if (
    isNeutralCleanReviewNoFindingClause(normalized) ||
    /^(?:actionable\s+)?(?:findings?|defects?)$/u.test(normalized) ||
    /^(?:actionable\s+)?(?:findings?|defects?):$/u.test(normalized) ||
    /^(?:actionable\s+)?(?:findings?|defects?):\s*(?:none|none\s+(?:(?:was|were)\s+)?(?:found|identified|detected|seen)|no\s+findings?|n\/a|not\s+applicable)$/u.test(
      normalized
    )
  ) {
    return true;
  }
  if (
    /\[P[0-3]\]/u.test(normalized) ||
    /\b(?:actionable|defects?|issues?|findings?|regressions?|drops?|leaks?|breaks?|fails?|errors?|bugs?|incorrect|unsafe|problem)\b/u.test(normalized)
  ) {
    return false;
  }
  return (
    /^reviewing\s+(?:co-\d+\s+)?(?:telemetry\s+parser|review\s+telemetry|provider-worker\s+handoff\s+readiness)$/u.test(
      normalized
    ) ||
    /^reviewing\s+(?:the\s+)?(?:current\s+changes|changed\s+files|uncommitted\s+diff|diff)$/u.test(normalized) ||
    /^(?:review\s+)?(?:summary|verdict|result)s?:?$/u.test(normalized) ||
    /^(?:overall|final)\s+(?:summary|verdict|result):?$/u.test(normalized)
  );
}

function isNeutralCleanReviewNoFindingClause(normalized: string): boolean {
  return /^(?:none|none\s+(?:(?:was|were)\s+)?(?:found|identified|detected|seen)|no\s+findings?|n\/a|not\s+applicable)$/u.test(
    normalized
  );
}

function extractInlineNeutralCleanReviewPrefaceBody(candidate: string): string | null {
  const match = candidate.match(
    /^\s*(?:(?:review\s+)?(?:summary|verdict|result)s?|(?:overall|final)\s+(?:summary|verdict|result)):\s+(.+?)\s*$/iu
  );
  return match?.[1]?.trim() || null;
}

function isCleanReviewVerdictCandidate(candidate: string): boolean {
  const verdictCandidate = stripReviewListMarker(candidate);
  const inlineNeutralPrefaceBody = extractInlineNeutralCleanReviewPrefaceBody(verdictCandidate);
  if (inlineNeutralPrefaceBody && isCleanReviewVerdictCandidate(inlineNeutralPrefaceBody)) {
    return true;
  }
  if (isNeutralCleanReviewNoFindingClause(normalizeReviewVerdictClause(verdictCandidate))) {
    return true;
  }
  const actionableDefectSummary = parseActionableDefectSummaryText(verdictCandidate);
  if (actionableDefectSummary && isNoOpActionableDefectSummary(actionableDefectSummary)) {
    return true;
  }
  const normalizedCandidate = normalizeCleanReviewVerdictCandidate(verdictCandidate);
  return (
    !isDisqualifiedCleanReviewVerdictCandidate(verdictCandidate) &&
    (CLEAN_REVIEW_VERDICT_PATTERNS.some((pattern) => pattern.test(normalizedCandidate)) ||
      REVIEW_SUBJECT_CLEAN_VERDICT_PATTERNS.some((pattern) => pattern.test(normalizedCandidate)))
  );
}

function stripReviewListMarker(candidate: string): string {
  return candidate.replace(/^\s*(?:(?:-\s*)|(?:\*(?!\*)\s*))?(?:>\s*)?(?:\d+[.)]\s*)?/u, '').trim();
}

function normalizeReviewLabelCandidate(candidate: string): string {
  return stripReviewMarkdownLabelSyntax(stripReviewListMarker(candidate));
}

function stripReviewMarkdownLabelSyntax(candidate: string): string {
  return candidate
    .replace(/^#{1,6}\s*/u, '')
    .replace(/^\*\*(.+?)\*\*(:?)\s*/u, (_match, label: string, separator: string) => `${label}${separator} `)
    .replace(/^__(.+?)__(:?)\s*/u, (_match, label: string, separator: string) => `${label}${separator} `)
    .replace(/\s+:\s*/u, ': ')
    .trim();
}

function normalizeCleanReviewVerdictCandidate(candidate: string): string {
  return candidate
    .replace(/(^|[\s("'`])\.(?=(?:\/|[A-Za-z0-9_-]+\/))/gu, '$1_')
    .replace(/(?<=[A-Za-z0-9_-])\.(?=[A-Za-z0-9_-])/gu, '_')
    .replace(/(?<=[A-Za-z0-9_-]):(?=\d+\b)/gu, '_line_');
}

function isDisqualifiedCleanReviewVerdictCandidate(candidate: string): boolean {
  return /\[P[0-3]\]/u.test(candidate) || getDisqualifyingCleanReviewVerdictPattern().test(candidate);
}

function isBlockingCleanReviewVerdictCaveat(candidate: string): boolean {
  if (!isDisqualifiedCleanReviewVerdictCandidate(candidate)) {
    return false;
  }
  const caveats = getDisqualifyingCleanReviewVerdictClauses(candidate);
  if (caveats.length === 0) {
    return /\[P[0-3]\]/u.test(candidate);
  }
  return caveats.some((caveat) => !isNonBlockingCleanReviewVerdictCaveat(caveat));
}

function isNonBlockingCleanReviewVerdictCaveat(candidate: string): boolean {
  const normalized = normalizeReviewVerdictClause(candidate);
  if (isValidationNotRunClause(normalized)) {
    return true;
  }
  const prefixBeforeBenignFollowup = getCleanReviewVerdictPrefixBeforeBenignFollowup(candidate);
  if (!prefixBeforeBenignFollowup || prefixBeforeBenignFollowup === candidate) {
    return false;
  }
  return isNonBlockingCleanReviewVerdictCaveat(prefixBeforeBenignFollowup);
}

function normalizeReviewVerdictClause(candidate: string): string {
  return stripReviewMarkdownLabelSyntax(candidate)
    .replace(/\b(did|do|have|had)n['’]t\b/giu, '$1 not')
    .replace(/^[.!?;,]\s*/u, '')
    .replace(/[.!]+$/u, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

function isValidationNotRunClause(normalized: string): boolean {
  if (/^(?:validation|verification|checks?|tests?|test\s+suite):$/u.test(normalized)) {
    return true;
  }
  const labeledValidationMatch = normalized.match(
    /^(?:validation|verification|checks?|tests?|test\s+suite)\s*:\s*(?<body>.+?)$/u
  );
  if (labeledValidationMatch?.groups?.body) {
    if (labeledValidationMatch.groups.body === 'not run') {
      return true;
    }
    return isValidationNotRunClause(labeledValidationMatch.groups.body);
  }
  return /^(?:(?:although|but|however|though|yet|except|unless|nevertheless|nonetheless|conversely|still|that\s+said|even\s+so|on\s+the\s+other\s+hand|in\s+contrast|by\s+contrast)\b|(?:apart|aside)\s+from)\s*,?\s+(?:(?:i\s+)?(?:did|do|have|had)\s+not\s+run\s+(?:the\s+)?(?:validation|validation\s+(?:commands?|suite)|checks?|test\s+suite|tests?)|(?:validation|validation\s+(?:commands?|suite)|checks?|test\s+suite|tests?)\s+(?:(?:was|were)\s+)?not\s+run|no\s+(?:validation|validation\s+(?:commands?|suite)|checks?|test\s+suite|tests?)\s+(?:(?:was|were)\s+)?run)$|^(?:(?:i\s+)?(?:did|do|have|had)\s+not\s+run\s+(?:the\s+)?(?:validation|validation\s+(?:commands?|suite)|checks?|test\s+suite|tests?)|(?:validation|validation\s+(?:commands?|suite)|checks?|test\s+suite|tests?)\s+(?:(?:was|were)\s+)?not\s+run|no\s+(?:validation|validation\s+(?:commands?|suite)|checks?|test\s+suite|tests?)\s+(?:(?:was|were)\s+)?run)$/u.test(normalized);
}

function getCleanReviewVerdictPrefixBeforeValidationOnlyNote(candidate: string): string | null {
  return getCleanReviewVerdictPrefixBeforeTrailingClause(candidate, /[.!,;]/u, isValidationNotRunClause);
}

function getCleanReviewVerdictPrefixBeforeParenthesizedValidationOnlyNote(candidate: string): string | null {
  const match = candidate.match(/^(?<prefix>.+?)\s+\((?<note>[^()]+)\)\s*[.!]?$/u);
  const prefix = match?.groups?.prefix?.trim();
  const note = match?.groups?.note ? normalizeReviewVerdictClause(match.groups.note) : '';
  if (!prefix || !isValidationNotRunClause(note)) {
    return null;
  }
  return prefix;
}

function getCleanReviewVerdictPrefixBeforeDashSeparatedValidationOnlyNote(candidate: string): string | null {
  const match = candidate.match(/^(?<prefix>.+?)\s+[-–—]\s+(?<note>.+?)\s*$/u);
  const prefix = match?.groups?.prefix?.trim();
  const note = match?.groups?.note ? normalizeReviewVerdictClause(match.groups.note) : '';
  if (!prefix || !isValidationNotRunClause(note)) {
    return null;
  }
  return prefix;
}

function getCleanReviewVerdictPrefixBeforeBenignFollowup(candidate: string): string | null {
  return getCleanReviewVerdictPrefixBeforeTrailingClause(candidate, /[.!;,]/u, isBenignCleanReviewFollowupClause);
}

function getCleanReviewVerdictPrefixBeforeTrailingClause(
  candidate: string,
  separatorPattern: RegExp,
  isAllowedClause: (normalized: string) => boolean
): string | null {
  const separators = [...candidate.matchAll(/[.!,;]\s+/gu)];
  for (let index = separators.length - 1; index >= 0; index -= 1) {
    const separator = separators[index];
    const separatorIndex = separator.index;
    const separatorText = separator[0];
    if (typeof separatorIndex !== 'number' || !separatorPattern.test(separatorText[0] ?? '')) {
      continue;
    }
    const followup = normalizeReviewVerdictClause(candidate.slice(separatorIndex + separatorText.length));
    if (!isAllowedClause(followup)) {
      continue;
    }
    const prefix = candidate.slice(0, separatorIndex).replace(/[,\s;]+$/u, '').trim();
    if (prefix.length > 0) {
      return prefix;
    }
  }
  return null;
}

function isBenignCleanReviewFollowupClause(normalized: string): boolean {
  if (isValidationNotRunClause(normalized)) {
    return true;
  }
  return /^(?:the\s+)?(?:implementation|patch|change|changes|diff|code|logic)\s+(?:is|are|looks?|appears?|remains?|stays?)\s+(?:sound|correct|focused|safe|consistent|reasonable)$/u.test(normalized);
}

function getCleanReviewVerdictPrefixBeforeNonBlockingCaveat(candidate: string): string | null {
  const firstCaveat = getFirstDisqualifyingCleanReviewVerdictClause(candidate);
  if (!firstCaveat || isBlockingCleanReviewVerdictCaveat(firstCaveat.clause)) {
    return null;
  }
  const prefix = candidate.slice(0, firstCaveat.index).replace(/[,\s]+$/u, '').trim();
  return prefix.length > 0 ? prefix : null;
}

function getFirstDisqualifyingCleanReviewVerdictClause(candidate: string): { index: number; clause: string } | null {
  const match = getDisqualifyingCleanReviewVerdictPattern().exec(candidate);
  if (!match) {
    return null;
  }
  return { index: match.index, clause: candidate.slice(match.index).trim() };
}

function getDisqualifyingCleanReviewVerdictClauses(candidate: string): string[] {
  const pattern = getDisqualifyingCleanReviewVerdictPattern();
  const clauses: string[] = [];
  for (let match = pattern.exec(candidate); match !== null; match = pattern.exec(candidate)) {
    clauses.push(candidate.slice(match.index).trim());
  }
  return clauses;
}

function getDisqualifyingCleanReviewVerdictPattern(): RegExp {
  return /(?<![\w/-])(?:although|but|however|though|yet|except|unless|nevertheless|nonetheless|conversely|caveats?)(?![\w/-])|(?<![\w/-])(?:with\s+)?one\s+exception\s*[:;,.]|(?<![\w/-])exceptions?\s*:|(?<![\w/-])(?:apart|aside)\s+from|(?:^|[.!?;,]\s+)(?:still|that\s+said|even\s+so|on\s+the\s+other\s+hand|in\s+contrast|by\s+contrast)\b|(?<![\w/-])(?:and|because|where|when|which)\s+(?:(?:it|this|they)\s+|the\s+[A-Za-z0-9._/-]+\s+)(?!(?:is|are|was|were|looks?|appears?|remains?|stays?|has|have)\b)\w+\b|(?<![\w/-])(?:and|because|where|when|which)\s+(?:(?:it|this|they)\s+|the\s+[A-Za-z0-9._/-]+\s+)(?:(?:is|are|was|were|looks?|appears?|remains?|stays?)\s+(?:broken|incorrect|unsafe|wrong|faulty|invalid|corrupt|bad|failing)|(?:has|have)\s+(?:bugs?|defects?|errors?|failures?))\b|(?<![\w/-])(?:where|when|which)\s+(?:(?:is|are|was|were|looks?|appears?|remains?|stays?)\s+(?:broken|incorrect|unsafe|wrong|faulty|invalid|corrupt|bad|failing)|(?:has|have)\s+(?:bugs?|defects?|errors?|failures?))\b/giu;
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
