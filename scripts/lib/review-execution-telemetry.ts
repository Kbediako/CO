import { writeFile } from 'node:fs/promises';
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
}): string {
  const disposition = resolveReviewOutcomeDisposition(payload);
  const boundaryKind = payload.termination_boundary?.kind ?? null;
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
}

export function buildReviewTelemetryPayload(
  options: BuildReviewTelemetryPayloadOptions
): ReviewTelemetryPayload {
  const terminationBoundary = sanitizeTerminationBoundaryForPersistence(
    options.terminationBoundary ?? null,
    options.includeRawTelemetry,
    options.telemetryDebugEnvKey
  );
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    status: options.status,
    review_outcome: deriveReviewOutcomeDisposition({
      status: options.status,
      terminationBoundary
    }),
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
      launchContext: options.launchContext ?? null
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
