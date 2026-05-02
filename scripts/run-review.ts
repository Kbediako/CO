#!/usr/bin/env node
/**
 * Helper to launch `codex review` non-interactively with the latest run manifest
 * path included as evidence for reviewers.
 *
 * Note: some codex CLI versions reject combining diff-scoping flags
 * (`--uncommitted`, `--base`, `--commit`) with a custom prompt. This wrapper
 * still writes the full prompt artifact for audit continuity. Explicit scoped
 * launches omit any prompt argument because the current Codex CLI still treats
 * stdin (`-`) as `[PROMPT]` and rejects it when scope flags are present, so the
 * bounded live context transport for scoped runs is `--title` instead.
 */

import { spawn } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  parseRuntimeMode,
  type RuntimeMode
} from '../orchestrator/src/cli/runtime/index.js';
import { parseArgs as parseCliArgs, hasFlag } from './lib/cli-args.js';
import { pathExists } from './lib/docs-helpers.js';
import {
  allowHeavyReviewCommands,
  enforceBoundedReviewMode,
  prepareReviewExecutionBoundaryPreflight,
  REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY,
  REVIEW_ENFORCE_BOUNDED_MODE_ENV_KEY
} from './lib/review-execution-boundary-preflight.js';
import {
  runReviewLaunchAttemptShell
} from './lib/review-launch-attempt.js';
import {
  prepareReviewNonInteractiveHandoffShell,
  shouldForceNonInteractive,
  shouldPrintNonInteractiveHandoff
} from './lib/review-non-interactive-handoff.js';
import {
  addBoundedReviewConstraintsToScopedTitle,
  buildActiveCloseoutProvenanceLines,
  buildReviewPromptContext,
  type MissingReviewNotesWaiver,
  type ReviewSurface
} from './lib/review-prompt-context.js';
import {
  type ReviewTerminationBoundaryRecord,
  ReviewExecutionState
} from './lib/review-execution-state.js';
import {
  runCodexReview
} from './lib/review-execution-runtime.js';
import {
  logReviewTelemetrySummary as logReviewExecutionTelemetrySummary,
  type ReviewLaunchContext,
  type ReviewTelemetryPayload,
  writeReviewExecutionTelemetry
} from './lib/review-execution-telemetry.js';
import {
  assessReviewScope,
  getLargeScopeGateError,
  buildLargeScopeAdvisoryPromptLines,
  buildScopeNotes,
  collectReviewScopePaths,
  formatScopeMetrics,
  logReviewScopeAssessment,
  resolveLargeScopeOverrideReason,
  resolveEffectiveScopeMode
} from './lib/review-scope-advisory.js';
import { collectManifests, resolveEnvironmentPaths } from './lib/run-manifests.js';

const BENIGN_STDIO_ERROR_CODES = new Set(['EPIPE', 'ERR_STREAM_DESTROYED']);
const REVIEW_AUTO_ISSUE_LOG_ENV_KEY = 'CODEX_REVIEW_AUTO_ISSUE_LOG';
const REVIEW_ENABLE_DELEGATION_MCP_ENV_KEY = 'CODEX_REVIEW_ENABLE_DELEGATION_MCP';
const REVIEW_DISABLE_DELEGATION_MCP_ENV_KEY = 'CODEX_REVIEW_DISABLE_DELEGATION_MCP';
const REVIEW_TELEMETRY_DEBUG_ENV_KEY = 'CODEX_REVIEW_DEBUG_TELEMETRY';
const REVIEW_SURFACE_ENV_KEY = 'CODEX_REVIEW_SURFACE';
const REVIEW_AUTHORITATIVE_GATE_ENV_KEY = 'CODEX_REVIEW_AUTHORITATIVE_GATE';
const REVIEW_BREAK_GLASS_NOTES_FALLBACK_ENV_KEY = 'CODEX_REVIEW_BREAK_GLASS_NOTES_FALLBACK';
const REVIEW_BREAK_GLASS_OWNER_ENV_KEY = 'CODEX_REVIEW_BREAK_GLASS_OWNER';
const REVIEW_BREAK_GLASS_EXPIRES_AT_ENV_KEY = 'CODEX_REVIEW_BREAK_GLASS_EXPIRES_AT';
const REVIEW_BREAK_GLASS_REASON_ENV_KEY = 'CODEX_REVIEW_BREAK_GLASS_REASON';
const REVIEW_BREAK_GLASS_EVIDENCE_ENV_KEY = 'CODEX_REVIEW_BREAK_GLASS_EVIDENCE';
const PROVIDER_LINEAR_WORKER_PIPELINE_ID = 'provider-linear-worker';
const PROVIDER_WORKSPACE_ROOT_DIRNAME = '.workspaces';
const PRESERVE_PROVIDER_ARTIFACT_ROOTS_ENV =
  'CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS';

interface CliOptions {
  manifest?: string;
  runsDir: string;
  task?: string;
  runtimeMode?: RuntimeMode;
  base?: string;
  commit?: string;
  title?: string;
  uncommitted?: boolean;
  nonInteractive?: boolean;
  autoIssueLog?: boolean;
  enableDelegationMcp?: boolean;
  disableDelegationMcp?: boolean;
  surface?: ReviewSurface;
  help?: boolean;
}

function buildExplicitScopeRetryGateError(
  options: Pick<CliOptions, 'base' | 'commit' | 'uncommitted'>
): string | null {
  if (options.commit) {
    return 'explicit `--commit` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.';
  }
  if (options.base) {
    return 'explicit `--base` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.';
  }
  if (options.uncommitted) {
    return 'explicit `--uncommitted` review scope must remain auditable; rerun without that flag only if you intentionally want the wrapper default working-tree review.';
  }
  return null;
}

function buildExplicitScopeSurfaceGateError(
  options: Pick<CliOptions, 'base' | 'commit' | 'uncommitted'>,
  reviewSurface: ReviewSurface
): string | null {
  if (reviewSurface === 'diff') {
    return null;
  }
  if (!(options.base || options.commit || options.uncommitted)) {
    return null;
  }
  return `explicit scoped review cannot honor --surface ${reviewSurface} because current Codex CLI rejects inline prompt transport under --base/--commit/--uncommitted; the wrapper only has bounded --title transport there when supported and otherwise falls back to artifact-only scoped context, so rerun with the default diff surface or drop the explicit scope if you need ${reviewSurface} prompt context.`;
}

function resolveMissingReviewNotesWaiverFromEnv(env: NodeJS.ProcessEnv): MissingReviewNotesWaiver | null {
  if (!envFlagEnabled(env[REVIEW_BREAK_GLASS_NOTES_FALLBACK_ENV_KEY])) {
    return null;
  }
  return {
    owner: env[REVIEW_BREAK_GLASS_OWNER_ENV_KEY],
    expiresAt: env[REVIEW_BREAK_GLASS_EXPIRES_AT_ENV_KEY],
    reason: env[REVIEW_BREAK_GLASS_REASON_ENV_KEY],
    evidence: env[REVIEW_BREAK_GLASS_EVIDENCE_ENV_KEY]
  };
}

function buildAuthoritativeNonInteractiveGateError(params: {
  env: NodeJS.ProcessEnv;
  nonInteractive: boolean;
}): string | null {
  if (
    !envFlagEnabled(params.env[REVIEW_AUTHORITATIVE_GATE_ENV_KEY]) ||
    !params.nonInteractive ||
    envFlagEnabled(params.env.FORCE_CODEX_REVIEW)
  ) {
    return null;
  }
  return `${REVIEW_AUTHORITATIVE_GATE_ENV_KEY}=1 disallows prompt-only non-interactive review handoff; set FORCE_CODEX_REVIEW=1 so the authoritative review gate executes and writes terminal telemetry.`;
}

function installStdioErrorGuards(): void {
  const guard = (error: NodeJS.ErrnoException) => {
    const code = typeof error?.code === 'string' ? error.code : '';
    if (BENIGN_STDIO_ERROR_CODES.has(code)) {
      return;
    }
    setImmediate(() => {
      throw error;
    });
  };

  process.stdout.on('error', guard);
  process.stderr.on('error', guard);
}

installStdioErrorGuards();

function parseBooleanOptionValue(raw: string | boolean, label: string): boolean {
  if (typeof raw === 'boolean') {
    return raw;
  }
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid ${label} value "${raw}". Expected true|false.`);
}

function parseRuntimeModeOption(raw: string | boolean, label: string): RuntimeMode {
  if (typeof raw !== 'string') {
    throw new Error(`${label} requires a value. Expected one of: cli, appserver.`);
  }
  const parsed = parseRuntimeMode(raw);
  if (!parsed) {
    throw new Error(`Invalid ${label} value "${raw}". Expected one of: cli, appserver.`);
  }
  return parsed;
}

function parseReviewSurfaceOption(raw: string | boolean, label: string): ReviewSurface {
  if (typeof raw !== 'string') {
    throw new Error(`${label} requires a value. Expected one of: diff, audit, architecture.`);
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'diff' || normalized === 'audit' || normalized === 'architecture') {
    return normalized;
  }
  throw new Error(`Invalid ${label} value "${raw}". Expected one of: diff, audit, architecture.`);
}

function inferTaskFromManifestPath(manifestPath: string): string | null {
  const segments = path.normalize(manifestPath).split(path.sep).filter((segment) => segment.length > 0);
  const fileName = segments.at(-1);
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment !== '.runs' && segment !== 'runs') {
      continue;
    }
    const taskSegment = segments[index + 1];
    const layoutSegment = segments[index + 2];
    if (taskSegment && (layoutSegment === 'cli' || layoutSegment === 'mcp')) {
      return taskSegment;
    }
    const runSegment = segments[index + 2];
    const maybeManifest = segments[index + 3];
    if (taskSegment && runSegment && (maybeManifest === 'manifest.json' || fileName === 'manifest.json')) {
      return taskSegment;
    }
  }
  return null;
}

function resolveReviewEnvironmentPaths(): { repoRoot: string; defaultRunsDir: string; defaultOutDir: string } {
  const { repoRoot, runsRoot, outRoot } = resolveEnvironmentPaths();
  return {
    repoRoot,
    defaultRunsDir: runsRoot,
    defaultOutDir: outRoot
  };
}

function resolveProviderTaskIdFromEnv(env: NodeJS.ProcessEnv, repoRoot?: string): string | null {
  const candidates = [env.CODEX_ORCHESTRATOR_TASK_ID?.trim(), env.MCP_RUNNER_TASK_ID?.trim(), env.TASK?.trim()].filter(Boolean) as string[];
  const repoTask = repoRoot && env.CODEX_ORCHESTRATOR_PIPELINE_ID === PROVIDER_LINEAR_WORKER_PIPELINE_ID && path.basename(path.dirname(repoRoot)) === PROVIDER_WORKSPACE_ROOT_DIRNAME ? path.basename(repoRoot) : null;
  if (repoTask && candidates.includes(repoTask)) return repoTask;
  return env.MCP_RUNNER_TASK_ID?.trim() || env.TASK?.trim() || env.CODEX_ORCHESTRATOR_TASK_ID?.trim() || null;
}

function isPathWithinRoot(root: string, candidate: string): boolean {
  const relativePath = path.relative(root, candidate);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  );
}

function firstPathSegment(relativePath: string): string {
  return relativePath.split(path.sep).filter((segment) => segment.length > 0)[0] ?? '';
}

function isDefaultRunsLayoutSegment(segment: string): boolean {
  return segment === '.runs' || segment === 'runs';
}

function isProviderIssueWorkspaceRootForEnv(repoRoot: string, env: NodeJS.ProcessEnv): boolean {
  if (env.CODEX_ORCHESTRATOR_PIPELINE_ID !== PROVIDER_LINEAR_WORKER_PIPELINE_ID) {
    return false;
  }
  const taskId = resolveProviderTaskIdFromEnv(env, repoRoot);
  return Boolean(
    taskId &&
      path.basename(repoRoot) === taskId &&
      path.basename(path.dirname(repoRoot)) === PROVIDER_WORKSPACE_ROOT_DIRNAME
  );
}

function resolveConfiguredReviewRoot(env: NodeJS.ProcessEnv): string | null {
  const configuredRoot = env.CODEX_ORCHESTRATOR_ROOT?.trim();
  if (!configuredRoot) {
    return null;
  }
  return path.isAbsolute(configuredRoot)
    ? path.resolve(configuredRoot)
    : path.resolve(process.cwd(), configuredRoot);
}

function resolveProviderSharedRootForEnv(repoRoot: string, env: NodeJS.ProcessEnv): string | null {
  if (!isProviderIssueWorkspaceRootForEnv(repoRoot, env)) {
    return null;
  }
  const sharedRoot = path.dirname(path.dirname(repoRoot));
  return resolveConfiguredReviewRoot(env) === sharedRoot ? sharedRoot : null;
}

function resolveConfiguredReviewArtifactRoot(
  repoRoot: string,
  env: NodeJS.ProcessEnv,
  configured: string | undefined,
  fallbackDirname: string
): string {
  const inheritedSharedRoot = resolveProviderSharedRootForEnv(repoRoot, env);
  const baseRoot = inheritedSharedRoot ?? repoRoot;
  const normalized = configured?.trim();
  if (!normalized) {
    return path.resolve(baseRoot, fallbackDirname);
  }
  return path.isAbsolute(normalized) ? path.resolve(normalized) : path.resolve(baseRoot, normalized);
}

function resolveWorkspaceArtifactRootForSharedRoot(
  repoRoot: string,
  env: NodeJS.ProcessEnv,
  sharedArtifactRoot: string,
  fallbackDirname: string,
  allowCustomCounterpart = false
): string | null {
  const inheritedSharedRoot = resolveProviderSharedRootForEnv(repoRoot, env);
  const sharedRoot = inheritedSharedRoot ?? path.dirname(path.dirname(repoRoot));
  if (!isPathWithinRoot(sharedRoot, sharedArtifactRoot)) {
    return null;
  }
  const relativeArtifactRoot = path.relative(sharedRoot, sharedArtifactRoot);
  const firstSegment = firstPathSegment(relativeArtifactRoot);
  if (
    (fallbackDirname === '.runs' && isDefaultRunsLayoutSegment(firstSegment)) ||
    firstSegment === fallbackDirname ||
    allowCustomCounterpart
  ) {
    return path.resolve(repoRoot, relativeArtifactRoot);
  }
  return null;
}

function resolveReviewEnvPath(raw: string, repoRoot: string, env: NodeJS.ProcessEnv = process.env): string {
  const inheritedSharedRoot = resolveProviderSharedRootForEnv(repoRoot, env);
  const relativeBaseRoot = inheritedSharedRoot ?? repoRoot;
  const resolved = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(relativeBaseRoot, raw);
  if (!isProviderIssueWorkspaceRootForEnv(repoRoot, env) || isPathWithinRoot(repoRoot, resolved)) {
    return resolved;
  }
  const sharedRunsRoot = resolveConfiguredReviewArtifactRoot(
    repoRoot,
    env,
    env.CODEX_ORCHESTRATOR_RUNS_DIR || '.runs',
    '.runs'
  );
  if (!isPathWithinRoot(sharedRunsRoot, resolved)) {
    return resolved;
  }
  const workspaceRunsRoot = resolveWorkspaceArtifactRootForSharedRoot(
    repoRoot,
    env,
    sharedRunsRoot,
    '.runs',
    true
  );
  if (!workspaceRunsRoot) {
    return resolved;
  }
  const workspaceCandidate = path.resolve(workspaceRunsRoot, path.relative(sharedRunsRoot, resolved));
  return existsSync(workspaceCandidate) ? workspaceCandidate : resolved;
}

function resolveReviewRunsDirPath(raw: string, repoRoot: string, env: NodeJS.ProcessEnv = process.env): string {
  const inheritedSharedRoot = resolveProviderSharedRootForEnv(repoRoot, env);
  return path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(inheritedSharedRoot ?? repoRoot, raw);
}

function inferRunsRootFromManifestPath(
  manifestPath: string,
  env: NodeJS.ProcessEnv = process.env,
  repoRoot: string | null = null
): string | null {
  const resolvedManifestPath = path.resolve(manifestPath);
  if (path.basename(resolvedManifestPath) !== 'manifest.json') {
    return null;
  }
  const runDir = path.dirname(resolvedManifestPath);
  const layoutDir = path.dirname(runDir);
  if (path.basename(layoutDir) !== 'cli' && path.basename(layoutDir) !== 'mcp') {
    return null;
  }
  const taskDir = path.dirname(layoutDir);
  const runsRoot = path.dirname(taskDir);
  if (path.basename(runsRoot) === '.runs' || path.basename(runsRoot) === 'runs') {
    return runsRoot;
  }
  if (repoRoot) {
    const configuredRunsRoot = resolveConfiguredReviewArtifactRoot(
      repoRoot,
      env,
      env.CODEX_ORCHESTRATOR_RUNS_DIR,
      '.runs'
    );
    if (isPathWithinRoot(configuredRunsRoot, resolvedManifestPath)) {
      return configuredRunsRoot;
    }
  }
  return null;
}

function resolveReviewExecutionArtifactRoots(
  env: NodeJS.ProcessEnv,
  environmentPaths: { repoRoot: string; defaultRunsDir: string; defaultOutDir: string },
  manifestPath: string
): { runsDir: string; outDir: string; preserveProviderArtifactRoots: boolean } {
  const manifestRunsRoot = inferRunsRootFromManifestPath(manifestPath, env, environmentPaths.repoRoot);
  if (
    !manifestRunsRoot ||
    !isProviderIssueWorkspaceRootForEnv(environmentPaths.repoRoot, env) ||
    isPathWithinRoot(environmentPaths.defaultRunsDir, manifestPath)
  ) {
    return {
      runsDir: environmentPaths.defaultRunsDir,
      outDir: environmentPaths.defaultOutDir,
      preserveProviderArtifactRoots: false
    };
  }

  const configuredOutDir = env.CODEX_ORCHESTRATOR_OUT_DIR?.trim();
  const resolvedConfiguredOutDir = configuredOutDir
    ? resolveConfiguredReviewArtifactRoot(environmentPaths.repoRoot, env, configuredOutDir, 'out')
    : null;
  const workspaceConfiguredOutDir = resolvedConfiguredOutDir
    ? resolveWorkspaceArtifactRootForSharedRoot(
        environmentPaths.repoRoot,
        env,
        resolvedConfiguredOutDir,
        'out',
        isPathWithinRoot(environmentPaths.repoRoot, manifestPath)
      )
    : null;
  const outDir = workspaceConfiguredOutDir ?? resolvedConfiguredOutDir ?? environmentPaths.defaultOutDir;
  return {
    runsDir: manifestRunsRoot,
    outDir,
    preserveProviderArtifactRoots: true
  };
}

function buildReviewExecutionEnv(
  env: NodeJS.ProcessEnv,
  environmentPaths: { repoRoot: string; defaultRunsDir: string; defaultOutDir: string },
  manifestPath: string
): NodeJS.ProcessEnv {
  const artifactRoots = resolveReviewExecutionArtifactRoots(env, environmentPaths, manifestPath);
  const preserveProviderArtifactRoots =
    artifactRoots.preserveProviderArtifactRoots ||
    env[PRESERVE_PROVIDER_ARTIFACT_ROOTS_ENV] === '1';
  const reviewEnv: NodeJS.ProcessEnv = {
    ...env,
    CODEX_ORCHESTRATOR_ROOT: environmentPaths.repoRoot,
    CODEX_ORCHESTRATOR_RUNS_DIR: artifactRoots.runsDir,
    CODEX_ORCHESTRATOR_OUT_DIR: artifactRoots.outDir,
    CODEX_ORCHESTRATOR_RUN_DIR: path.dirname(manifestPath),
    CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
  };
  if (preserveProviderArtifactRoots) {
    reviewEnv[PRESERVE_PROVIDER_ARTIFACT_ROOTS_ENV] = '1';
  }
  return reviewEnv;
}

function parseArgs(
  argv: string[],
  environmentPaths: { repoRoot: string; defaultRunsDir: string }
): CliOptions {
  const options: CliOptions = { runsDir: environmentPaths.defaultRunsDir };
  const { args, entries, positionals } = parseCliArgs(argv);
  if (hasFlag(args, 'help') || hasFlag(args, 'h') || positionals.includes('help')) {
    options.help = true;
    return options;
  }

  for (const entry of entries) {
    if (entry.key === 'manifest' && typeof entry.value === 'string') {
      options.manifest = resolveReviewEnvPath(entry.value, environmentPaths.repoRoot);
    } else if (entry.key === 'runs-dir' && typeof entry.value === 'string') {
      options.runsDir = resolveReviewRunsDirPath(entry.value, environmentPaths.repoRoot);
    } else if (entry.key === 'task' && typeof entry.value === 'string') {
      options.task = entry.value;
    } else if (entry.key === 'runtime-mode') {
      options.runtimeMode = parseRuntimeModeOption(entry.value, '--runtime-mode');
    } else if (entry.key === 'base' && typeof entry.value === 'string') {
      options.base = entry.value;
    } else if (entry.key === 'commit' && typeof entry.value === 'string') {
      options.commit = entry.value;
    } else if (entry.key === 'title' && typeof entry.value === 'string') {
      options.title = entry.value;
    } else if (entry.key === 'uncommitted') {
      options.uncommitted = true;
    } else if (entry.key === 'non-interactive') {
      options.nonInteractive = true;
    } else if (entry.key === 'auto-issue-log') {
      options.autoIssueLog = parseBooleanOptionValue(entry.value, '--auto-issue-log');
    } else if (entry.key === 'enable-delegation-mcp') {
      options.enableDelegationMcp = parseBooleanOptionValue(entry.value, '--enable-delegation-mcp');
    } else if (entry.key === 'disable-delegation-mcp') {
      options.disableDelegationMcp = parseBooleanOptionValue(entry.value, '--disable-delegation-mcp');
    } else if (entry.key === 'surface') {
      options.surface = parseReviewSurfaceOption(entry.value, '--surface');
    }
  }

  if (hasFlag(args, 'uncommitted')) {
    options.uncommitted = true;
  }
  if (hasFlag(args, 'non-interactive')) {
    options.nonInteractive = true;
  }
  if (hasFlag(args, 'auto-issue-log')) {
    options.autoIssueLog = true;
  }
  if (hasFlag(args, 'enable-delegation-mcp')) {
    options.enableDelegationMcp = true;
  }
  if (hasFlag(args, 'disable-delegation-mcp')) {
    options.disableDelegationMcp = true;
  }

  if (!options.manifest) {
    const envManifest = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH ?? process.env.MANIFEST;
    if (envManifest && envManifest.trim().length > 0) {
      options.manifest = resolveReviewEnvPath(envManifest.trim(), environmentPaths.repoRoot);
    }
  }

  if (!options.task && options.manifest) {
    const taskFromManifest = inferTaskFromManifestPath(options.manifest);
    if (taskFromManifest) {
      options.task = taskFromManifest;
    }
  }

  if (!options.task && !options.manifest) {
    const taskFromEnv = resolveProviderTaskIdFromEnv(process.env, environmentPaths.repoRoot);
    if (taskFromEnv) {
      options.task = taskFromEnv;
    }
  }

  if (options.surface === undefined) {
    const fromEnv = process.env[REVIEW_SURFACE_ENV_KEY];
    if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
      options.surface = parseReviewSurfaceOption(fromEnv, REVIEW_SURFACE_ENV_KEY);
    }
  }

  if (options.autoIssueLog === undefined) {
    const fromEnv = process.env[REVIEW_AUTO_ISSUE_LOG_ENV_KEY];
    if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
      options.autoIssueLog = parseBooleanOptionValue(fromEnv, REVIEW_AUTO_ISSUE_LOG_ENV_KEY);
    }
  }

  if (options.disableDelegationMcp === undefined) {
    const fromEnv = process.env[REVIEW_DISABLE_DELEGATION_MCP_ENV_KEY];
    if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
      options.disableDelegationMcp = parseBooleanOptionValue(fromEnv, REVIEW_DISABLE_DELEGATION_MCP_ENV_KEY);
    }
  }

  if (options.enableDelegationMcp === undefined) {
    const fromEnv = process.env[REVIEW_ENABLE_DELEGATION_MCP_ENV_KEY];
    if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
      options.enableDelegationMcp = parseBooleanOptionValue(
        fromEnv,
        REVIEW_ENABLE_DELEGATION_MCP_ENV_KEY
      );
    }
  }

  return options;
}

async function resolveManifestPath(options: CliOptions, repoRoot: string): Promise<string> {
  if (options.manifest) {
    if (!(await pathExists(options.manifest))) throw new Error(`Manifest not found: ${options.manifest}`);
    return options.manifest;
  }

  const runDirManifest = await resolveManifestPathFromRunDir(repoRoot);
  const requestedTask = options.task?.trim();
  const runDirTask = runDirManifest ? inferTaskFromManifestPath(runDirManifest) : null;
  if (
    runDirManifest &&
    (!requestedTask || runDirTask === null || (typeof runDirTask === 'string' && runDirTask === requestedTask))
  ) {
    return runDirManifest;
  }

  const manifests = await collectManifests(options.runsDir, options.task);
  if (manifests.length === 0) {
    throw new Error('No run manifests found. Provide --manifest or execute the orchestrator first.');
  }

  const scored = await Promise.all(
    manifests.map(async (manifestPath) => {
      try {
        const fileStat = await stat(manifestPath);
        return { manifestPath, mtimeMs: fileStat.mtimeMs };
      } catch {
        return { manifestPath, mtimeMs: 0 };
      }
    })
  );

  scored.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return resolveReviewEnvPath(scored[0]?.manifestPath ?? manifests[0], repoRoot);
}

async function resolveManifestPathFromRunDir(repoRoot: string): Promise<string | null> {
  const configuredRunDir = process.env.CODEX_ORCHESTRATOR_RUN_DIR?.trim();
  if (!configuredRunDir) {
    return null;
  }

  const manifestPath = path.join(resolveReviewEnvPath(configuredRunDir, repoRoot), 'manifest.json');
  return (await pathExists(manifestPath)) ? manifestPath : null;
}

export async function runReviewCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  process.exitCode = 0;
  try {
    const environmentPaths = resolveReviewEnvironmentPaths();
    const { repoRoot } = environmentPaths;
    const options = parseArgs(argv, environmentPaths);
    if (options.help) {
      printReviewWrapperHelp();
      return 0;
    }
    const reviewSurface = options.surface ?? 'diff';
    const explicitScopeSurfaceGateError = buildExplicitScopeSurfaceGateError(options, reviewSurface);
    if (explicitScopeSurfaceGateError) {
      throw new Error(explicitScopeSurfaceGateError);
    }
    if (shouldRunDiffBudget()) {
      await runDiffBudget(options, repoRoot);
    } else {
      console.log('[run-review] skipping diff budget (already executed by pipeline).');
    }
    const manifestPath = await resolveManifestPath(options, repoRoot);

    const relativeManifest = path.relative(repoRoot, manifestPath);
    const runnerLogPath = path.join(path.dirname(manifestPath), 'runner.ndjson');
    const runnerLogExists = await pathExists(runnerLogPath);
    const relativeRunnerLog = path.relative(repoRoot, runnerLogPath);
    const manifestTask = inferTaskFromManifestPath(manifestPath);
    const envTask = resolveProviderTaskIdFromEnv(process.env, repoRoot);
    const taskKey = options.task ?? envTask ?? manifestTask;
    const taskLabel = taskKey ?? 'unknown-task';
    const diffBudgetOverride = process.env.DIFF_BUDGET_OVERRIDE_REASON?.trim();
    const scopeMode = resolveEffectiveScopeMode(options);
    const allowHeavyCommands = allowHeavyReviewCommands();
    const {
      promptLines,
      reviewTaskContext,
      activeCloseoutBundleRoots,
      scopedReviewerVisibleTitle
    } = await buildReviewPromptContext({
      repoRoot,
      taskKey,
      taskLabel,
      reviewSurface,
      relativeManifest,
      runnerLogExists,
      relativeRunnerLog,
      notes: process.env.NOTES,
      authoritativeGate: envFlagEnabled(process.env[REVIEW_AUTHORITATIVE_GATE_ENV_KEY]),
      missingNotesWaiver: resolveMissingReviewNotesWaiverFromEnv(process.env),
      scopeMode,
      includeBoundedReviewConstraints: !allowHeavyCommands
    });
    const explicitScopedReview = Boolean(options.base || options.commit || options.uncommitted);
    const explicitReviewTitle =
      typeof options.title === 'string' && options.title.trim().length > 0 ? options.title.trim() : null;
    const effectiveReviewTitle = explicitReviewTitle
      ? explicitScopedReview && !allowHeavyCommands
        ? addBoundedReviewConstraintsToScopedTitle({ title: explicitReviewTitle })
        : explicitReviewTitle
      : explicitScopedReview
        ? scopedReviewerVisibleTitle
        : null;
    const effectiveTitleSource = explicitReviewTitle
      ? 'user'
      : explicitScopedReview
        ? 'notes-surface'
        : undefined;
    const enforceBoundedMode = !allowHeavyCommands && enforceBoundedReviewMode();
    if (allowHeavyCommands) {
      console.log(
        `[run-review] heavy review commands allowed (${REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY}=1).`
      );
    } else {
      console.log(
        `[run-review] bounded review guidance enabled by default (set ${REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY}=1 to opt into unrestricted heavy-command execution).`
      );
      if (enforceBoundedMode) {
        console.log(
          `[run-review] bounded enforcement enabled (${REVIEW_ENFORCE_BOUNDED_MODE_ENV_KEY}=1); heavy command starts will terminate the review.`
        );
      }
    }

    const scopePathCollection = await collectReviewScopePaths(options, repoRoot);
    const scopeNotes = buildScopeNotes(options, scopePathCollection);
    if (scopeNotes.length > 0) {
      promptLines.push('', ...scopeNotes);
    }
    const activeCloseoutProvenanceLines = buildActiveCloseoutProvenanceLines(
      repoRoot,
      activeCloseoutBundleRoots
    );
    if (activeCloseoutProvenanceLines.length > 0) {
      promptLines.push('', ...activeCloseoutProvenanceLines);
    }
    const scopeAssessment = await assessReviewScope(options, repoRoot);
    const scopeMetrics = formatScopeMetrics(scopeAssessment);
    const largeScopeOverrideReason = resolveLargeScopeOverrideReason(process.env);
    const stdinIsTTY = process.stdin?.isTTY === true;
    const requestedNonInteractive =
      options.nonInteractive ?? shouldForceNonInteractive(process.env, stdinIsTTY);
    const authoritativeNonInteractiveGateError = buildAuthoritativeNonInteractiveGateError({
      env: process.env,
      nonInteractive: requestedNonInteractive
    });
    if (authoritativeNonInteractiveGateError) {
      throw new Error(authoritativeNonInteractiveGateError);
    }
    const promptOnlyHandoff = shouldPrintNonInteractiveHandoff({
      env: process.env,
      nonInteractive: requestedNonInteractive,
      stdinIsTTY
    });
    logReviewScopeAssessment(scopeAssessment, scopeMetrics, console, largeScopeOverrideReason);
    const largeScopeGateError = getLargeScopeGateError(
      scopeAssessment,
      scopeMetrics,
      largeScopeOverrideReason
    );
    const explicitScopeRetryGateError = buildExplicitScopeRetryGateError(options);
    const retryWithoutScopeFlagsAssessment =
      explicitScopeRetryGateError !== null || resolveEffectiveScopeMode(options) === 'uncommitted'
        ? null
        : await assessReviewScope({}, repoRoot);
    const retryWithoutScopeFlagsGateError =
      explicitScopeRetryGateError ??
      (retryWithoutScopeFlagsAssessment === null
        ? null
        : getLargeScopeGateError(
            retryWithoutScopeFlagsAssessment,
            formatScopeMetrics(retryWithoutScopeFlagsAssessment),
            null
          ));
    if (largeScopeGateError && !promptOnlyHandoff) {
      throw new Error(largeScopeGateError);
    }
    const scopeAdvisoryPromptLines = buildLargeScopeAdvisoryPromptLines(
      scopeAssessment,
      scopeMetrics,
      largeScopeOverrideReason
    );
    if (scopeAdvisoryPromptLines.length > 0) {
      promptLines.push('', ...scopeAdvisoryPromptLines);
    }

    if (reviewSurface === 'audit' && diffBudgetOverride) {
      promptLines.push('', `Diff budget override: ${diffBudgetOverride}`);
    }

    const prompt = promptLines.join('\n');
    const reviewBaseEnv = buildReviewExecutionEnv(process.env, environmentPaths, manifestPath);
    const { artifactPaths, nonInteractive, reviewEnv, handedOff } =
      await prepareReviewNonInteractiveHandoffShell({
        cliNonInteractive: options.nonInteractive,
        env: reviewBaseEnv,
        manifestPath,
        prompt,
        repoRoot,
        runnerLogExists,
        runnerLogPath,
        stdinIsTTY
      });
    if (handedOff) {
      return typeof process.exitCode === 'number' ? process.exitCode : 0;
    }

    const boundaryPreflight = await prepareReviewExecutionBoundaryPreflight({
      cliOptions: options,
      manifestPath,
      env: reviewEnv,
      repoRoot,
      reviewSurface,
      architectureSurfacePaths: reviewTaskContext.architectureSurfacePaths,
      scopeTouchedPaths: scopePathCollection.paths,
      activeCloseoutBundleRoots,
      runnerLogExists,
      runnerLogPath,
      allowHeavyCommands
    });
    const {
      runtimeContext,
      timeoutMs,
      stallTimeoutMs,
      startupLoopTimeoutMs,
      startupLoopMinEvents,
      monitorIntervalMs,
      lowSignalTimeoutMs,
      verdictStabilityTimeoutMs,
      metaSurfaceTimeoutMs,
      allowedMetaSurfaceKinds,
      touchedPaths,
      startupAnchorMode,
      enforceStartupAnchorBoundary,
      enforceActiveCloseoutBundleRereadBoundary,
      enforceRelevantReinspectionDwellBoundary,
      auditStartupAnchorPaths,
      allowedMetaSurfacePaths,
      auditStartupAnchorEnvVarPaths,
      allowedMetaSurfaceEnvVarPaths
    } = boundaryPreflight;
    const autoIssueLogEnabled = options.autoIssueLog ?? false;
    const runReview = async (resolved: { command: string; args: string[] }) =>
      runCodexReview({
        command: resolved.command,
        args: resolved.args,
        env: runtimeContext.env,
        stdio: nonInteractive ? ['ignore', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
        activeCloseoutBundleRoots,
        blockHeavyCommands: enforceBoundedMode,
        allowValidationCommandIntents: allowHeavyCommands,
        timeoutMs,
        stallTimeoutMs,
        startupLoopTimeoutMs,
        startupLoopMinEvents,
        monitorIntervalMs,
        lowSignalTimeoutMs,
        verdictStabilityTimeoutMs,
        metaSurfaceTimeoutMs,
        enforceStartupAnchorBoundary,
        enforceActiveCloseoutBundleRereadBoundary,
        enforceRelevantReinspectionDwellBoundary,
        allowedMetaSurfaceKinds: [...allowedMetaSurfaceKinds],
        scopeMode,
        startupAnchorMode,
        auditStartupAnchorPaths,
        allowedMetaSurfacePaths,
        auditStartupAnchorEnvVarPaths,
        allowedMetaSurfaceEnvVarPaths,
        repoRoot,
        touchedPaths,
        outputLogPath: artifactPaths.outputLogPath
      });
    const writeTelemetry = async (
      state: ReviewExecutionState,
      status: 'succeeded' | 'failed',
      errorMessage?: string | null,
      terminationBoundary?: ReviewTerminationBoundaryRecord | null,
      launchContext?: ReviewLaunchContext | null
    ): Promise<ReviewTelemetryPayload | null> =>
      writeReviewExecutionTelemetry({
        state,
        status,
        error: errorMessage ?? null,
        terminationBoundary,
        launchContext: launchContext ?? null,
        outputLogPath: artifactPaths.outputLogPath,
        repoRoot,
        telemetryPath: artifactPaths.telemetryPath,
        includeRawTelemetry: envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]),
        telemetryDebugEnvKey: REVIEW_TELEMETRY_DEBUG_ENV_KEY
      });

    await runReviewLaunchAttemptShell({
      cliOptions: {
        ...options,
        title: effectiveReviewTitle ?? undefined,
        titleSource: effectiveTitleSource
      },
      prompt,
      retryWithoutScopeFlagsGateError,
      runtimeContext,
      repoRoot,
      manifestPath,
      artifactPaths,
      autoIssueLogEnabled,
      telemetryDebugEnabled: envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]),
      telemetryDebugEnvKey: REVIEW_TELEMETRY_DEBUG_ENV_KEY,
      runReview,
      writeTelemetry,
      logTelemetrySummary: logReviewExecutionTelemetrySummary,
      logTerminationBoundaryFallback
    });

    return typeof process.exitCode === 'number' ? process.exitCode : 0;
  } catch (error) {
    console.error('[run-review] failed:', error instanceof Error ? error.message : String(error));
    process.exitCode = typeof (error as { exitCode?: unknown })?.exitCode === 'number' ? (error as { exitCode: number }).exitCode : 1;
    return process.exitCode;
  }
}

export function isDirectExecution(entryArg = process.argv[1], metaUrl = import.meta.url): boolean {
  if (typeof entryArg !== 'string' || entryArg.length === 0) {
    return false;
  }

  const candidateUrls = new Set<string>();
  try {
    candidateUrls.add(pathToFileURL(path.resolve(entryArg)).href);
  } catch {
    // Fall through to the realpath candidate so missing/cwd issues still fail closed.
  }
  try {
    candidateUrls.add(pathToFileURL(realpathSync(entryArg)).href);
  } catch {
    // Missing or unreadable entry points should not be treated as direct execution.
  }
  return candidateUrls.has(metaUrl);
}

if (isDirectExecution()) {
  void runReviewCli();
}

async function runDiffBudget(options: CliOptions, repoRoot: string): Promise<void> {
  const scriptPath = path.join(repoRoot, 'scripts', 'diff-budget.mjs');
  const relativeScriptPath = path.relative(repoRoot, scriptPath);
  if (!(await pathExists(scriptPath))) {
    console.log(
      `[run-review] skipping diff budget (missing ${relativeScriptPath}; downstream npm environment detected).`
    );
    return;
  }
  const args = [scriptPath];

  if (options.commit) {
    args.push('--commit', options.commit);
  } else if (options.base) {
    args.push('--base', options.base);
  }

  const diffBudgetEnv = { ...process.env };
  // The review wrapper's scope is driven by explicit CLI flags; inherited base env vars
  // would silently change the default uncommitted review surface.
  delete diffBudgetEnv.BASE_SHA;
  delete diffBudgetEnv.DIFF_BUDGET_BASE;

  await new Promise<void>((resolve, reject) => {
    const child = spawn('node', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: diffBudgetEnv,
      cwd: repoRoot
    });
    child.stdout?.on('data', (chunk: Buffer) => {
      process.stdout.write(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
    });
    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            code === null
              ? `diff budget terminated by signal ${signal ?? 'unknown'}`
              : `diff budget exited with code ${code}`
          )
        );
      }
    });
  });
}

function shouldRunDiffBudget(): boolean {
  return !(envFlagEnabled(process.env.DIFF_BUDGET_STAGE) || envFlagEnabled(process.env.SKIP_DIFF_BUDGET));
}

function logTerminationBoundaryFallback(
  boundaryRecord: ReviewTerminationBoundaryRecord | null
): void {
  if (!boundaryRecord) {
    return;
  }
  console.error(
    `[run-review] termination boundary: ${boundaryRecord.kind} (${boundaryRecord.provenance}).`
  );
}

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function printReviewWrapperHelp(): void {
  console.log(`Usage: npm run review -- [options]

Standalone review wrapper for Codex review with manifest-backed context.

Options:
  --manifest <path>              Explicit run manifest path.
  --task <task-id>               Task id used to resolve latest manifest.
  --runtime-mode <cli|appserver> Runtime mode for the underlying Codex review call.
  --runs-dir <path>              Override .runs root for manifest discovery.
  --uncommitted                  Review uncommitted diff scope.
  --base <ref>                   Review diff from base ref.
  --commit <sha>                 Review a single commit.
  --title <title>                Set a custom review title.
  --surface <diff|audit|architecture>  Review surface (default: diff).
  --non-interactive              Force non-interactive Codex review mode.
  --auto-issue-log[=true|false]  Capture issue bundle on failure.
  --enable-delegation-mcp[=true|false]   Enable delegation MCP for this review run.
  --disable-delegation-mcp[=true|false]  Disable delegation MCP for this review run.
  -h, --help                     Show this help.

Environment:
  NOTES (required)               Goal/summary/risks context for review gate runs.
  ${REVIEW_AUTHORITATIVE_GATE_ENV_KEY}=1  Disallow prompt-only non-interactive handoff as a successful review gate.
  ${REVIEW_BREAK_GLASS_NOTES_FALLBACK_ENV_KEY}=1  Allow missing NOTES only with owner, expiry, reason, and evidence env fields.
  MANIFEST                       Alternative manifest path source.
  MCP_RUNNER_TASK_ID / TASK      Task id fallback when --task is omitted.
  ${REVIEW_SURFACE_ENV_KEY}      Review surface fallback when --surface is omitted.
  CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON  Auditable override for large uncommitted review scope gating.

Behavior:
  Explicit --uncommitted/--base/--commit wrapper runs keep prompt/context in review/prompt.txt
                                and launch codex review without any prompt argument because current CLI still treats stdin (\`-\`) as [PROMPT]; reviewer-visible scoped context first rides on --title (user-provided when present, otherwise synthesized from NOTES + surface) with bounded no-validation guidance visible where the current Codex review surface honors titles. If Codex rejects a synthesized scoped title, the wrapper retries the same explicit scope without \`--title\` and falls back to artifact-only context. If bounded review blocks a validation command, the wrapper retries once with a reviewer-visible inline no-validation prompt that names the original scope and runs under a read-only permission-profile override, falling back to one expiry-enforced legacy read-only sandbox override only when the active Codex CLI rejects \`default_permissions\`; successful retry preserves the command-intent boundary in telemetry as bounded-success and records legacy fallback metadata when that compatibility path is used.
  Explicit scoped wrapper runs  Support only the default diff surface; audit/architecture still require prompt-capable unscoped review.
  Unscoped wrapper runs         Pass the saved prompt/context inline to codex review.
`);
}
