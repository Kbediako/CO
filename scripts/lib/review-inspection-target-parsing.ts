import {
  extractShellCommandPayload,
  normalizeCommandToken,
  splitShellControlSegments,
  stripLeadingEnvAssignments,
  tokenizeShellSegment,
  unwrapEnvCommandTokens
} from './review-shell-command-parser.js';
import {
  expandMetaSurfaceOperandCandidates,
  extractMetaSurfaceOperands,
  isTouchedReviewScopePathFamilyOperand,
  isTouchedScopePath,
  normalizeScopePath,
  relativizeOperandToRepoRoot
} from './review-meta-surface-normalization.js';

const REVIEW_INSPECTION_TARGET_PATH_RE =
  /^(?:[A-Za-z0-9_./-]+\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|py|rb|php|go|rs|java|c|cc|cpp|cxx|h|hh|hpp|cs|swift|kt|kts|scala|exs?|sh|bash|zsh|fish|ps1|sql|html?|css|scss|less))$/u;
const REVIEW_INSPECTION_TARGET_RE =
  /([A-Za-z0-9_./-]+\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|py|rb|php|go|rs|java|c|cc|cpp|cxx|h|hh|hpp|cs|swift|kt|kts|scala|exs?|sh|bash|zsh|fish|ps1|sql|html?|css|scss|less))/gu;

export function extractInspectionTargets(
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

export function extractParsedInspectionTargets(
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

export function collectParsedInspectionTargetsFromSegment(
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

export function resolveTouchedInspectionTarget(
  candidate: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null
): string | null {
  for (const touchedPath of touchedPaths) {
    const normalizedTouchedPath = normalizeScopePath(touchedPath);
    if (!normalizedTouchedPath) {
      continue;
    }
    const touchedPathSet = new Set<string>([normalizedTouchedPath]);
    if (
      isTouchedScopePath(candidate, touchedPathSet, repoRoot) ||
      isTouchedReviewScopePathFamilyOperand(candidate, touchedPathSet, repoRoot)
    ) {
      return normalizedTouchedPath;
    }
  }
  return null;
}
