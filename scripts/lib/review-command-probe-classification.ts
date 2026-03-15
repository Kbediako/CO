import {
  REVIEW_SHELL_COMMANDS,
  extractShellCommandPayload,
  normalizeCommandToken,
  splitShellControlSegments,
  splitShellControlSegmentsDetailed,
  stripLeadingEnvAssignments,
  tokenizeShellSegment,
  unwrapEnvCommandTokens
} from './review-shell-command-parser.js';

export const REVIEW_HEAVY_SCRIPT_TARGETS = new Set([
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
const REVIEW_SHELL_PROBE_ENV_VARS = new Set(['MANIFEST', 'RUNNER_LOG', 'RUN_LOG']);

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

function packageOptionConsumesValue(option: string): boolean {
  if (/^--(?:prefix|workspace|filter|cwd)$/iu.test(option)) {
    return true;
  }
  if (/^-(?:C|w)$/iu.test(option)) {
    return true;
  }
  return false;
}

export function resolvePackageScriptTarget(args: string[]): string | null {
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

export function detectHeavyReviewCommand(commandLine: string): string | null {
  const normalized = normalizeReviewCommandLine(commandLine);
  const segments = splitShellControlSegments(normalized);
  for (const segment of segments) {
    const heavyCommand = detectHeavyReviewCommandFromSegment(segment);
    if (heavyCommand) {
      return heavyCommand;
    }
  }
  return null;
}

export function tokenReferencesReviewShellProbeEnvVar(token: string): boolean {
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

export function grepSegmentUsesExplicitSearchTargets(args: string[]): boolean {
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

export function classifyShellProbeCommandLine(commandLine: string): string | null {
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

export function isLikelyReviewCommandLine(line: string): boolean {
  const normalized = normalizeReviewCommandLine(line);
  if (!normalized) {
    return false;
  }
  if (detectHeavyReviewCommand(normalized)) {
    return true;
  }
  const shellTokens = stripLeadingEnvAssignments(tokenizeShellSegment(normalized));
  if (extractShellCommandPayload(shellTokens)) {
    return true;
  }
  if (
    /^(?:npm|pnpm|yarn|bun|node|npx|git|bash|sh|zsh|python|pytest|go|cargo|mvn|gradle(?:w)?)\b/i.test(
      normalized
    )
  ) {
    return true;
  }
  if (normalized.includes(' in ') && /\s-\w+\s+/u.test(normalized)) {
    return true;
  }
  return false;
}
