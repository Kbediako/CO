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
  splitShellControlSegmentsDetailed,
  stripLeadingEnvAssignments,
  tokenizeShellSegment,
  unwrapEnvCommandTokens
} from './review-shell-command-parser.js';
import {
  classifyMetaSurfaceDirectDetailed,
  classifyActiveCloseoutBundleCandidate,
  extractMetaSurfaceOperands,
  isTouchedReviewScopePathFamilyOperand,
  isTouchedScopePath,
  normalizeAuditMetaSurfaceEnvVar,
  normalizeAuditStartupAnchorPath,
  resolveGitInvocation,
  segmentMatchesAuditStartupAnchorPath
} from './review-meta-surface-normalization.js';
import { isReviewOrchestrationCommand } from './review-command-intent-classification.js';

const REVIEW_META_SURFACE_DELEGATION_TOOL_LINE_RE =
  /^tool\s+delegation\.delegate\.(?:spawn|status|pause|cancel)\(/iu;
const AUDIT_ALLOWED_META_SURFACE_KINDS = ['run-manifest', 'run-runner-log'] as const;
const AUDIT_ALLOWED_META_SURFACE_KIND_SET = new Set<string>(AUDIT_ALLOWED_META_SURFACE_KINDS);

export const REVIEW_ACTIVE_CLOSEOUT_BUNDLE_KIND = 'review-closeout-bundle';

type ReviewScopeMode = 'uncommitted' | 'base' | 'commit';
type ReviewStartupAnchorMode = 'diff' | 'audit';

interface ReviewAllowedMetaSurfaces {
  allowedMetaSurfacePaths: ReadonlySet<string>;
  allowedMetaSurfaceEnvVarPaths: ReadonlyMap<string, string>;
}

interface ReviewMetaSurfaceSample {
  kind: string;
  candidate: string;
  operand: string;
}

interface ReviewStartupAnchorBoundaryProgress {
  anchorObserved: boolean;
  preAnchorMetaSurfaceSamples: string[];
}

interface ReviewStartupAnchorBoundaryOptions {
  repoRoot: string | null;
  activeCloseoutBundleRoots: ReadonlySet<string>;
  touchedPaths: ReadonlySet<string>;
  scopeMode: ReviewScopeMode;
  startupAnchorMode: ReviewStartupAnchorMode | null;
  auditStartupAnchorPaths: ReadonlySet<string>;
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string>;
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

export function classifyMetaSurfaceToolLine(line: string): string | null {
  if (REVIEW_META_SURFACE_DELEGATION_TOOL_LINE_RE.test(line)) {
    return 'delegation-control';
  }
  return null;
}

export function classifyMetaSurfaceCommandLine(
  commandLine: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null,
  activeCloseoutBundleRoots: ReadonlySet<string>,
  allowedAuditMetaSurfaces: ReviewAllowedMetaSurfaces
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

export function classifyMetaSurfaceOutputLine(
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

export function analyzeStartupAnchorBoundaryProgress(
  commandLine: string,
  options: ReviewStartupAnchorBoundaryOptions
): ReviewStartupAnchorBoundaryProgress {
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
  allowedAuditMetaSurfaces: ReviewAllowedMetaSurfaces,
  shellEnvState: ReviewShellEnvState,
  depth = 0,
  shellDialect: ReviewShellDialect = 'other'
): { kind: string | null; nextShellEnvState: ReviewShellEnvState } {
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
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string>,
  repoRoot: string | null,
  activeCloseoutBundleRoots: ReadonlySet<string>,
  progress: ReviewStartupAnchorBoundaryProgress,
  shellEnvState: ReviewShellEnvState,
  depth = 0,
  shellDialect: ReviewShellDialect = 'other'
): ReviewShellEnvState {
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

function isAllowedAuditMetaSurfaceSample(
  sample: ReviewMetaSurfaceSample,
  allowedAuditMetaSurfaces: ReviewAllowedMetaSurfaces,
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
