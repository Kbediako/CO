import {
  extractShellCommandPayload,
  normalizeCommandToken,
  splitShellControlSegments,
  stripLeadingEnvAssignments,
  tokenizeShellSegment,
  unwrapEnvCommandTokens
} from './review-shell-command-parser.js';
import {
  REVIEW_HEAVY_SCRIPT_TARGETS,
  resolvePackageScriptTarget
} from './review-command-probe-classification.js';

const REVIEW_NON_BOUNDARY_HEAVY_SCRIPT_TARGETS = new Set(['typecheck', 'check']);
const REVIEW_VALIDATION_SUITE_SCRIPT_TARGETS = new Set(
  [...REVIEW_HEAVY_SCRIPT_TARGETS].filter(
    (target) => !REVIEW_NON_BOUNDARY_HEAVY_SCRIPT_TARGETS.has(target)
  )
);
const REVIEW_COMMAND_INTENT_DELEGATION_TOOL_LINE_RE =
  /^tool\s+delegation\.delegate\.(?:spawn|pause|cancel)\(/iu;
const REVIEW_DIRECT_VALIDATION_RUNNERS = new Set(['vitest', 'jest']);

export type ReviewCommandIntentViolationKind =
  | 'validation-suite'
  | 'validation-runner'
  | 'review-orchestration'
  | 'delegation-control';

export interface ReviewCommandIntentViolation {
  kind: ReviewCommandIntentViolationKind;
  sample: string;
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

export function classifyCommandIntentToolLine(line: string): ReviewCommandIntentViolation | null {
  if (REVIEW_COMMAND_INTENT_DELEGATION_TOOL_LINE_RE.test(line)) {
    return {
      kind: 'delegation-control',
      sample: line.trim()
    };
  }
  return null;
}

export function classifyCommandIntentCommandLine(
  commandLine: string,
  options: { allowValidationCommandIntents: boolean }
): ReviewCommandIntentViolation | null {
  const normalized = normalizeReviewCommandLine(commandLine).replace(/\\/gu, '/');
  const segments = splitShellControlSegments(normalized);
  for (const segment of segments) {
    const violation = classifyCommandIntentSegment(segment, options, 0);
    if (violation) {
      return violation;
    }
  }
  return null;
}

function classifyCommandIntentSegment(
  segment: string,
  options: { allowValidationCommandIntents: boolean },
  depth: number
): ReviewCommandIntentViolation | null {
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
        const nestedViolation = classifyCommandIntentSegment(nestedSegment, options, depth + 1);
        if (nestedViolation) {
          return nestedViolation;
        }
      }
    }
  }

  const command = normalizeCommandToken(tokens[0] ?? '');
  const args = tokens.slice(1);
  if (isReviewOrchestrationCommand(command, args)) {
    return {
      kind: 'review-orchestration',
      sample: segment.trim()
    };
  }

  if (
    !options.allowValidationCommandIntents &&
    isPackageManagerValidationSuiteCommand(command, args)
  ) {
    return {
      kind: 'validation-suite',
      sample: segment.trim()
    };
  }

  if (!options.allowValidationCommandIntents && isDirectValidationRunnerCommand(command, args)) {
    return {
      kind: 'validation-runner',
      sample: segment.trim()
    };
  }

  return null;
}

export function isReviewOrchestrationCommand(command: string, args: string[]): boolean {
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

function isDirectValidationRunnerCommand(command: string, args: string[]): boolean {
  if (REVIEW_DIRECT_VALIDATION_RUNNERS.has(command)) {
    return true;
  }

  const launcherTarget = resolveValidationLauncherTarget(command, args);
  return launcherTarget !== null && REVIEW_DIRECT_VALIDATION_RUNNERS.has(launcherTarget);
}

function isPackageManagerValidationSuiteCommand(command: string, args: string[]): boolean {
  if (command !== 'npm' && command !== 'pnpm' && command !== 'yarn' && command !== 'bun') {
    return false;
  }
  const scriptTarget = resolvePackageScriptTarget(args);
  return scriptTarget !== null && REVIEW_VALIDATION_SUITE_SCRIPT_TARGETS.has(scriptTarget);
}

function resolveValidationLauncherTarget(command: string, args: string[]): string | null {
  if (command === 'npx' || command === 'bunx') {
    return resolveFirstBinaryLauncherTarget(args);
  }

  const firstArg = normalizeCommandToken(args[0] ?? '');
  if (command === 'npm' && firstArg === 'exec') {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'npm' && firstArg === 'run') {
    return resolvePackageScriptInvocationTarget(args.slice(1));
  }
  if (command === 'pnpm' && (firstArg === 'dlx' || firstArg === 'exec')) {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'pnpm' && firstArg === 'run') {
    return resolvePackageScriptInvocationTarget(args.slice(1));
  }
  if (command === 'pnpm' && firstArg && !firstArg.startsWith('-')) {
    return firstArg;
  }
  if (command === 'yarn' && (firstArg === 'dlx' || firstArg === 'exec')) {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'yarn' && firstArg === 'run') {
    return resolvePackageScriptInvocationTarget(args.slice(1));
  }
  if (command === 'yarn' && firstArg && !firstArg.startsWith('-')) {
    return firstArg;
  }
  if (command === 'bun' && firstArg === 'x') {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'bun' && firstArg === 'run') {
    return resolvePackageScriptInvocationTarget(args.slice(1));
  }
  if (command === 'bun' && firstArg && !firstArg.startsWith('-')) {
    return firstArg;
  }

  return null;
}

function resolvePackageScriptInvocationTarget(args: string[]): string | null {
  let index = 0;
  while (index < args.length) {
    const token = args[index] ?? '';
    const normalized = token.toLowerCase();
    if (normalized === '--') {
      const target = args[index + 1];
      return target ? normalizeCommandToken(target) : null;
    }
    if (token.startsWith('-')) {
      index += packageScriptOptionConsumesValue(token) && !token.includes('=') ? 2 : 1;
      continue;
    }
    return normalizeCommandToken(token);
  }
  return null;
}

function resolveFirstBinaryLauncherTarget(
  args: string[],
  options: { skipDlx?: boolean } = {}
): string | null {
  let index = 0;
  while (index < args.length) {
    const token = args[index] ?? '';
    const normalized = token.toLowerCase();
    if (normalized === '--') {
      const target = args[index + 1];
      return target ? normalizeCommandToken(target) : null;
    }
    if (options.skipDlx !== false && (normalized === 'dlx' || normalized === 'exec')) {
      index += 1;
      continue;
    }
    if (token.startsWith('-')) {
      index += binaryLauncherOptionConsumesValue(token) && !token.includes('=') ? 2 : 1;
      continue;
    }
    return normalizeCommandToken(token);
  }
  return null;
}

function binaryLauncherOptionConsumesValue(option: string): boolean {
  const normalized = option.toLowerCase();
  return (
    normalized === '-p' ||
    normalized === '--package' ||
    normalized.startsWith('--package=') ||
    normalized === '-c' ||
    normalized === '--call' ||
    normalized.startsWith('--call=') ||
    normalized === '--node-options' ||
    normalized.startsWith('--node-options=')
  );
}

function packageScriptOptionConsumesValue(option: string): boolean {
  const normalized = option.toLowerCase();
  return (
    normalized === '-c' ||
    normalized === '--cwd' ||
    normalized.startsWith('--cwd=') ||
    normalized === '--filter' ||
    normalized.startsWith('--filter=') ||
    normalized === '--workspace' ||
    normalized.startsWith('--workspace=') ||
    normalized === '--workspaces' ||
    normalized === '--top-level' ||
    normalized === '--since' ||
    normalized.startsWith('--since=')
  );
}

export function formatCommandIntentViolationLabel(kind: ReviewCommandIntentViolationKind): string {
  if (kind === 'validation-suite') {
    return 'validation suite launch';
  }
  if (kind === 'validation-runner') {
    return 'direct validation runner launch';
  }
  if (kind === 'review-orchestration') {
    return 'nested review or pipeline launch';
  }
  return 'delegation control activity';
}
