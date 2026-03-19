import path from 'node:path';

import {
  formatRuntimeSelectionSummary,
  type RuntimeCodexCommandContext
} from '../../orchestrator/src/cli/runtime/index.js';
import type { ReviewSurface } from './review-prompt-context.js';
import {
  ARCHITECTURE_ALLOWED_META_SURFACE_KINDS,
  AUDIT_ALLOWED_META_SURFACE_KINDS,
  formatDurationMs,
  type ReviewStartupAnchorMode
} from './review-execution-state.js';
import {
  resolveReviewRuntimeContext,
  type ReviewLaunchCliOptions
} from './review-launch-attempt.js';

export const DEFAULT_REVIEW_STARTUP_LOOP_MIN_EVENTS = 8;
export const DEFAULT_REVIEW_MONITOR_INTERVAL_SECONDS = 60;
export const REVIEW_MONITOR_INTERVAL_ENV_KEY = 'CODEX_REVIEW_MONITOR_INTERVAL_SECONDS';
export const REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY = 'CODEX_REVIEW_ALLOW_HEAVY_COMMANDS';
export const REVIEW_ENFORCE_BOUNDED_MODE_ENV_KEY = 'CODEX_REVIEW_ENFORCE_BOUNDED_MODE';
export const REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY = 'CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS';
export const REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY =
  'CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS';
export const REVIEW_META_SURFACE_TIMEOUT_ENV_KEY = 'CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS';

export interface ReviewExecutionBoundaryPreflightOptions {
  cliOptions: Pick<ReviewLaunchCliOptions, 'runtimeMode'>;
  manifestPath: string;
  env: NodeJS.ProcessEnv;
  repoRoot: string;
  reviewSurface: ReviewSurface;
  architectureSurfacePaths: string[];
  scopeTouchedPaths: string[];
  activeCloseoutBundleRoots: string[];
  runnerLogExists: boolean;
  runnerLogPath: string;
  allowHeavyCommands: boolean;
  resolveReviewRuntimeContextFn?: typeof resolveReviewRuntimeContext;
}

export interface ReviewExecutionBoundaryPreflightResult {
  runtimeContext: RuntimeCodexCommandContext;
  timeoutMs: number | null;
  stallTimeoutMs: number | null;
  startupLoopTimeoutMs: number | null;
  startupLoopMinEvents: number;
  monitorIntervalMs: number | null;
  lowSignalTimeoutMs: number | null;
  verdictStabilityTimeoutMs: number | null;
  metaSurfaceTimeoutMs: number | null;
  allowedMetaSurfaceKinds: readonly string[];
  touchedPaths: string[];
  startupAnchorMode: ReviewStartupAnchorMode | null;
  enforceStartupAnchorBoundary: boolean;
  enforceActiveCloseoutBundleRereadBoundary: boolean;
  enforceRelevantReinspectionDwellBoundary: boolean;
  auditStartupAnchorPaths: string[];
  allowedMetaSurfacePaths: string[];
  auditStartupAnchorEnvVarPaths: Record<string, string>;
  allowedMetaSurfaceEnvVarPaths: Record<string, string>;
}

export function allowHeavyReviewCommands(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env[REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY]);
}

export function enforceBoundedReviewMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env[REVIEW_ENFORCE_BOUNDED_MODE_ENV_KEY]);
}

export async function prepareReviewExecutionBoundaryPreflight(
  options: ReviewExecutionBoundaryPreflightOptions
): Promise<ReviewExecutionBoundaryPreflightResult> {
  const resolveRuntimeContext =
    options.resolveReviewRuntimeContextFn ?? resolveReviewRuntimeContext;
  const runtimeContext = await resolveRuntimeContext({
    options: options.cliOptions,
    manifestPath: options.manifestPath,
    env: options.env,
    repoRoot: options.repoRoot
  });
  console.log(`[run-review] ${formatRuntimeSelectionSummary(runtimeContext.runtime)}.`);

  const timeoutMs = resolveReviewTimeoutMs(options.env);
  if (timeoutMs !== null) {
    console.log(
      `[run-review] enforcing codex review timeout at ${Math.round(timeoutMs / 1000)}s (configured via CODEX_REVIEW_TIMEOUT_SECONDS).`
    );
  }

  const stallTimeoutMs = resolveReviewStallTimeoutMs(options.env);
  if (stallTimeoutMs !== null) {
    console.log(
      `[run-review] enforcing codex review stall timeout at ${Math.round(
        stallTimeoutMs / 1000
      )}s of no output (configured via CODEX_REVIEW_STALL_TIMEOUT_SECONDS).`
    );
  }

  const startupLoopTimeoutMs = resolveReviewStartupLoopTimeoutMs(options.env);
  const startupLoopMinEvents = resolveReviewStartupLoopMinEvents(options.env);
  if (startupLoopTimeoutMs !== null) {
    console.log(
      `[run-review] enforcing delegation-startup loop timeout at ${Math.round(
        startupLoopTimeoutMs / 1000
      )}s after ${startupLoopMinEvents} startup events (configured via CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS).`
    );
  }

  const monitorIntervalMs = resolveReviewMonitorIntervalMs(options.env);
  if (monitorIntervalMs === null) {
    console.log(
      '[run-review] patience-first monitor checkpoints disabled (configured via CODEX_REVIEW_MONITOR_INTERVAL_SECONDS=0).'
    );
  } else {
    console.log(
      `[run-review] patience-first monitor checkpoints every ${formatDurationMs(
        monitorIntervalMs
      )} (set CODEX_REVIEW_MONITOR_INTERVAL_SECONDS=0 to disable).`
    );
  }

  const lowSignalTimeoutMs = options.allowHeavyCommands
    ? null
    : resolveReviewLowSignalTimeoutMs(options.env);
  const verdictStabilityTimeoutMs = options.allowHeavyCommands
    ? null
    : resolveReviewVerdictStabilityTimeoutMs(options.env);
  const metaSurfaceTimeoutMs = options.allowHeavyCommands
    ? null
    : resolveReviewMetaSurfaceTimeoutMs(options.env);
  const allowedMetaSurfaceKinds =
    options.reviewSurface === 'audit'
      ? AUDIT_ALLOWED_META_SURFACE_KINDS
      : options.reviewSurface === 'architecture'
        ? ARCHITECTURE_ALLOWED_META_SURFACE_KINDS
        : ([] as const);
  const architectureRelevantPaths =
    options.reviewSurface === 'architecture'
      ? options.architectureSurfacePaths
          .map((entry) => path.relative(options.repoRoot, entry))
          .filter((entry) => entry.length > 0)
      : [];
  const touchedPaths =
    options.reviewSurface === 'architecture'
      ? [...new Set([...options.scopeTouchedPaths, ...architectureRelevantPaths])]
      : [...options.scopeTouchedPaths];
  const startupAnchorMode: ReviewStartupAnchorMode | null = options.allowHeavyCommands
    ? null
    : options.reviewSurface === 'audit'
      ? 'audit'
      : options.reviewSurface === 'diff' && touchedPaths.length > 0
        ? 'diff'
        : null;
  const enforceStartupAnchorBoundary = startupAnchorMode !== null;
  const enforceActiveCloseoutBundleRereadBoundary =
    options.reviewSurface === 'diff' &&
    !options.allowHeavyCommands &&
    options.activeCloseoutBundleRoots.length > 0;
  const announceRelevantReinspectionDwellBoundary =
    (options.reviewSurface === 'diff' || options.reviewSurface === 'architecture') &&
    !options.allowHeavyCommands &&
    touchedPaths.length > 0;
  const enforceRelevantReinspectionDwellBoundary =
    announceRelevantReinspectionDwellBoundary && lowSignalTimeoutMs !== null;
  const auditStartupAnchorPaths =
    options.reviewSurface === 'audit'
      ? [options.manifestPath, ...(options.runnerLogExists ? [options.runnerLogPath] : [])]
      : [];
  const allowedMetaSurfacePaths =
    options.reviewSurface === 'audit'
      ? [...auditStartupAnchorPaths]
      : options.reviewSurface === 'architecture'
        ? [...options.architectureSurfacePaths]
        : [];
  const auditStartupAnchorEnvVarPaths =
    options.reviewSurface === 'audit'
      ? {
          MANIFEST: options.manifestPath,
          ...(options.runnerLogExists
            ? { RUNNER_LOG: options.runnerLogPath, RUN_LOG: options.runnerLogPath }
            : {})
        }
      : {};
  const allowedMetaSurfaceEnvVarPaths =
    options.reviewSurface === 'audit' ? { ...auditStartupAnchorEnvVarPaths } : {};

  if (!options.allowHeavyCommands) {
    if (lowSignalTimeoutMs === null) {
      console.log(
        `[run-review] low-signal drift guard disabled (${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0).`
      );
    } else {
      console.log(
        `[run-review] low-signal drift guard enabled after ${formatDurationMs(
          lowSignalTimeoutMs
        )} of repetitive bounded activity (set ${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0 to disable).`
      );
    }
    if (verdictStabilityTimeoutMs === null) {
      console.log(
        `[run-review] verdict-stability guard disabled (${REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY}=0).`
      );
    } else {
      console.log(
        `[run-review] verdict-stability guard enabled after ${formatDurationMs(
          verdictStabilityTimeoutMs
        )} of repeated speculative no-progress output (set ${REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY}=0 to disable).`
      );
    }
    if (metaSurfaceTimeoutMs === null) {
      console.log(
        `[run-review] meta-surface expansion guard disabled (${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY}=0).`
      );
    } else if (allowedMetaSurfaceKinds.length > 0) {
      const allowedMetaSurfaceLabel =
        options.reviewSurface === 'audit'
          ? 'allowed audit meta surfaces'
          : 'allowed architecture meta surfaces';
      console.log(
        `[run-review] meta-surface expansion guard enabled after ${formatDurationMs(
          metaSurfaceTimeoutMs
        )} of sustained off-task meta activity; ${allowedMetaSurfaceLabel}: ${allowedMetaSurfaceKinds.join(
          ', '
        )} (set ${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY}=0 to disable).`
      );
    } else {
      console.log(
        `[run-review] meta-surface expansion guard enabled after ${formatDurationMs(
          metaSurfaceTimeoutMs
        )} of sustained off-task meta activity (set ${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY}=0 to disable).`
      );
    }
    if (startupAnchorMode === 'diff') {
      console.log(
        '[run-review] startup-anchor boundary enabled for diff mode; repeated memory/skills/review-docs/manifest/review-artifact reads before the first startup anchor will terminate the review.'
      );
    } else if (startupAnchorMode === 'audit') {
      console.log(
        '[run-review] startup-anchor boundary enabled for audit mode; repeated memory/skills/review-doc reads before the first manifest/runner-log startup anchor will terminate the review.'
      );
    }
    if (announceRelevantReinspectionDwellBoundary) {
      if (lowSignalTimeoutMs === null) {
        console.log(
          `[run-review] bounded relevant reinspection dwell boundary disabled (${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0).`
        );
      } else {
        console.log(
          `[run-review] bounded relevant reinspection dwell boundary enabled after ${formatDurationMs(
            lowSignalTimeoutMs
          )} of repetitive on-task reinspection without concrete findings (set ${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0 to disable).`
        );
      }
    }
  }

  return {
    runtimeContext,
    timeoutMs,
    stallTimeoutMs,
    startupLoopTimeoutMs,
    startupLoopMinEvents,
    monitorIntervalMs,
    lowSignalTimeoutMs,
    verdictStabilityTimeoutMs,
    metaSurfaceTimeoutMs,
    allowedMetaSurfaceKinds: [...allowedMetaSurfaceKinds],
    touchedPaths,
    startupAnchorMode,
    enforceStartupAnchorBoundary,
    enforceActiveCloseoutBundleRereadBoundary,
    enforceRelevantReinspectionDwellBoundary,
    auditStartupAnchorPaths,
    allowedMetaSurfacePaths,
    auditStartupAnchorEnvVarPaths,
    allowedMetaSurfaceEnvVarPaths
  };
}

export function resolveReviewTimeoutMs(env: NodeJS.ProcessEnv = process.env): number | null {
  const configured = env.CODEX_REVIEW_TIMEOUT_SECONDS?.trim();
  if (!configured) {
    return null;
  }

  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error('CODEX_REVIEW_TIMEOUT_SECONDS must be a finite number.');
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

export function resolveReviewStallTimeoutMs(env: NodeJS.ProcessEnv = process.env): number | null {
  const configured = env.CODEX_REVIEW_STALL_TIMEOUT_SECONDS?.trim();
  if (!configured) {
    return null;
  }

  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error('CODEX_REVIEW_STALL_TIMEOUT_SECONDS must be a finite number.');
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

export function resolveReviewStartupLoopTimeoutMs(
  env: NodeJS.ProcessEnv = process.env
): number | null {
  const configured = env.CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS?.trim();
  if (!configured) {
    return null;
  }

  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error('CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS must be a finite number.');
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

export function resolveReviewStartupLoopMinEvents(
  env: NodeJS.ProcessEnv = process.env
): number {
  const configured = env.CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS?.trim();
  if (!configured) {
    return DEFAULT_REVIEW_STARTUP_LOOP_MIN_EVENTS;
  }

  const parsed = Number(configured);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new Error('CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS must be a positive integer.');
  }
  return parsed;
}

export function resolveReviewMonitorIntervalMs(
  env: NodeJS.ProcessEnv = process.env
): number | null {
  const configured = env[REVIEW_MONITOR_INTERVAL_ENV_KEY]?.trim();
  if (!configured) {
    return DEFAULT_REVIEW_MONITOR_INTERVAL_SECONDS * 1000;
  }

  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error(`${REVIEW_MONITOR_INTERVAL_ENV_KEY} must be a finite number.`);
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

export function resolveReviewLowSignalTimeoutMs(
  env: NodeJS.ProcessEnv = process.env
): number | null {
  const configured = env[REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY]?.trim();
  if (!configured) {
    return 180_000;
  }
  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error(`${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY} must be a finite number.`);
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

export function resolveReviewVerdictStabilityTimeoutMs(
  env: NodeJS.ProcessEnv = process.env
): number | null {
  const configured = env[REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY]?.trim();
  if (!configured) {
    return 180_000;
  }
  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error(`${REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY} must be a finite number.`);
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

export function resolveReviewMetaSurfaceTimeoutMs(
  env: NodeJS.ProcessEnv = process.env
): number | null {
  const configured = env[REVIEW_META_SURFACE_TIMEOUT_ENV_KEY]?.trim();
  if (!configured) {
    return 180_000;
  }
  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error(`${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY} must be a finite number.`);
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
