import {
  extractShellCommandPayload,
  normalizeCommandToken,
  normalizeShellCommandPathSeparators,
  splitShellControlSegments,
  stripLeadingEnvAssignments,
  tokenizeShellSegment,
  unwrapEnvCommandTokens
} from './review-shell-command-parser.js';
import {
  isReviewHeavyScriptTarget,
  isReviewRepoLocalValidationScriptTarget,
  resolveNodeRuntimeScriptTarget,
  resolvePackageScriptTarget
} from './review-command-probe-classification.js';

const REVIEW_NON_BOUNDARY_HEAVY_SCRIPT_TARGETS = new Set(['typecheck', 'check']);
const REVIEW_COMMAND_INTENT_DELEGATION_TOOL_LINE_RE =
  /^tool\s+delegation\.delegate\.(?:spawn|pause|cancel)\(/iu;
const REVIEW_DIRECT_VALIDATION_RUNNERS = new Set(['vitest', 'jest', 'pytest']);
const NODE_OPTION_VALUE_FLAGS = new Set([
  '-C',
  '-r',
  '--conditions',
  '--debug-port',
  '--inspect-port',
  '--require',
  '--import',
  '--loader',
  '--experimental-loader',
  '--input-type',
  '--env-file',
  '--env-file-if-exists',
  '--title',
  '--watch-kill-signal',
  '--watch-path'
]);
const NODE_NON_SCRIPT_EXECUTION_FLAGS = new Set(['-e', '--eval', '-p', '--print', '-c', '--check']);
const NODE_RUNTIME_SCRIPT_FLAGS = new Set(['--run']);
const PYTHON_OPTION_VALUE_FLAGS = new Set(['-W', '-X', '--check-hash-based-pycs']);
const REVIEW_HELP_REQUEST_OPTION_VALUE_FLAGS = new Set([
  '-c',
  '-C',
  '--ask-for-approval',
  '--base',
  '--cd',
  '--commit',
  '--config',
  '--config-file',
  '--cwd',
  '--manifest',
  '--model',
  '--profile',
  '--reasoning-effort',
  '--runtime-mode',
  '--runs-dir',
  '--surface',
  '--task',
  '--title'
]);
const REVIEW_PACKAGE_RUN_SUBCOMMAND_ALIASES = new Set(['run', 'run-script', 'rum', 'urn']);
const REVIEW_PACKAGE_OPTION_VALUE_FLAGS = new Set(['--prefix', '--workspace', '--filter', '--cwd', '-C', '-w']);

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
  const normalized = normalizeShellCommandPathSeparators(normalizeReviewCommandLine(commandLine));
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
      const nestedSegments = splitShellControlSegments(
        normalizeShellCommandPathSeparators(payload)
      );
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

  if (
    !options.allowValidationCommandIntents &&
    isRepoLocalValidationSuiteCommand(command, args)
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
    const reviewScriptArgs = resolvePackageReviewScriptArgs(args);
    return reviewScriptArgs !== null && !hasCliHelpRequest(reviewScriptArgs);
  }

  const firstArg = normalizeCommandToken(args[0] ?? '');
  const startPipelineIndex = firstArg === 'start' ? findStartReviewPipelineArgIndex(args) : null;
  if (command === 'codex-orchestrator') {
    if (
      (firstArg === 'review' && hasCliHelpRequest(args.slice(1))) ||
      (startPipelineIndex !== null &&
        (hasCliHelpRequest(args.slice(1, startPipelineIndex)) ||
          hasCliHelpRequest(args.slice(startPipelineIndex + 1))))
    ) {
      return false;
    }
    return firstArg === 'review' || startPipelineIndex !== null;
  }
  if (command === 'codex') {
    return firstArg === 'review' && !hasCliHelpRequest(args.slice(1));
  }
  if (command === 'node') {
    const runtimeScriptTarget = resolveNodeRuntimeScriptTarget(args);
    if (runtimeScriptTarget === 'review') {
      return !hasCliHelpRequest(args);
    }
    const entryScript = resolveNodeEntryScriptToken(args);
    return (
      entryScript !== null &&
      isReviewRunnerScriptToken(entryScript) &&
      !hasCliHelpRequest(args)
    );
  }
  return false;
}

function isReviewPipelineTarget(target: string): boolean {
  return target === 'docs-review' || target === 'implementation-gate' || target === 'diagnostics';
}

const CLI_BOOLEAN_FLAG_KEYS = new Set([
  'apply',
  'auto-issue-log',
  'blocked-by-source',
  'cloud',
  'cloud-preflight',
  'codex-cli',
  'codex-force',
  'collab',
  'devtools',
  'dry-run',
  'force',
  'help',
  'interactive',
  'issue-log',
  'multi-agent',
  'no-interactive',
  'repo-config-required',
  'refresh-skills',
  'ui',
  'usage',
  'watch',
  'yes'
]);

function findStartReviewPipelineArgIndex(args: string[]): number | null {
  for (let index = 1; index < args.length; index += 1) {
    const token = args[index] ?? '';
    if (token === '--') {
      const next = args[index + 1] ?? '';
      return isReviewPipelineTarget(normalizeCommandToken(next)) ? index + 1 : null;
    }
    if (!token.startsWith('--')) {
      return isReviewPipelineTarget(normalizeCommandToken(token)) ? index : null;
    }
    const key = token.slice(2);
    if (key.includes('=') || CLI_BOOLEAN_FLAG_KEYS.has(key)) {
      continue;
    }
    const next = args[index + 1];
    if (next && !next.startsWith('--')) {
      index += 1;
    }
  }
  return null;
}

function hasCliHelpRequest(
  tokens: string[],
  options: { allowBareHelp?: boolean } = {}
): boolean {
  const positionals: string[] = [];
  let sawNonBareHelpToken = false;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? '';
    const optionName = normalizeCliOptionName(token);
    if (optionName === '--') {
      break;
    }
    if (optionName === '--help' || optionName === '-h') {
      return true;
    }
    if (token.startsWith('-')) {
      if (
        REVIEW_HELP_REQUEST_OPTION_VALUE_FLAGS.has(optionName) &&
        !hasInlineOptionValue(token) &&
        tokens[index + 1]
      ) {
        index += 1;
      }
      sawNonBareHelpToken = true;
      continue;
    }
    const positional = normalizeCommandToken(token);
    positionals.push(positional);
    if (positional !== 'help') {
      sawNonBareHelpToken = true;
    }
  }
  return Boolean(options.allowBareHelp && !sawNonBareHelpToken && positionals.length === 1 && positionals[0] === 'help');
}

function resolvePackageReviewScriptArgs(args: string[]): string[] | null {
  let index = 0;
  while (index < args.length) {
    const token = args[index] ?? '';
    const normalized = normalizeCommandToken(token);

    if (normalized === '--') {
      const target = normalizeCommandToken(args[index + 1] ?? '');
      return target === 'review' ? stripPackageRunSeparator(args.slice(index + 2)) : null;
    }

    if (REVIEW_PACKAGE_RUN_SUBCOMMAND_ALIASES.has(normalized)) {
      index += 1;
      while (index < args.length) {
        const candidate = args[index] ?? '';
        const candidateNormalized = normalizeCommandToken(candidate);
        if (candidateNormalized === '--') {
          index += 1;
          continue;
        }
        if (candidate.startsWith('-')) {
          index += packageReviewOptionConsumesValue(candidate) && !hasInlineOptionValue(candidate) ? 2 : 1;
          continue;
        }
        return candidateNormalized === 'review'
          ? stripPackageRunSeparator(args.slice(index + 1))
          : null;
      }
      return null;
    }

    if (token.startsWith('-')) {
      index += packageReviewOptionConsumesValue(token) && !hasInlineOptionValue(token) ? 2 : 1;
      continue;
    }

    return normalized === 'review' ? stripPackageRunSeparator(args.slice(index + 1)) : null;
  }
  return null;
}

function stripPackageRunSeparator(args: string[]): string[] {
  return normalizeCommandToken(args[0] ?? '') === '--' ? args.slice(1) : args;
}

function packageReviewOptionConsumesValue(token: string): boolean {
  return REVIEW_PACKAGE_OPTION_VALUE_FLAGS.has(normalizeCliOptionName(token));
}

function isReviewRunnerScriptToken(token: string): boolean {
  return /^(?:.*\/)?run-review\.(?:js|ts|mjs|cjs|mts|cts|\{js,ts\})$/iu.test(token);
}

function resolveNodeEntryScriptToken(args: string[]): string | null {
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? '';
    const optionName = normalizeCliOptionName(token);
    if (optionName === '--') {
      const explicitScript = args[index + 1] ?? '';
      return explicitScript ? normalizeCommandToken(explicitScript) : null;
    }
    if (
      NODE_NON_SCRIPT_EXECUTION_FLAGS.has(optionName) ||
      NODE_RUNTIME_SCRIPT_FLAGS.has(optionName)
    ) {
      return null;
    }
    if (token.startsWith('-')) {
      index += advancePastNodeOption(args, index) - 1;
      continue;
    }
    return normalizeCommandToken(token);
  }
  return null;
}

function advancePastNodeOption(args: string[], index: number): number {
  const token = args[index] ?? '';
  if (hasInlineOptionValue(token)) {
    return 1;
  }
  const optionName = normalizeCliOptionName(token);
  if (NODE_OPTION_VALUE_FLAGS.has(optionName)) {
    return args[index + 1] ? 2 : 1;
  }

  const nextToken = args[index + 1] ?? '';
  if (
    nextToken &&
    !nextToken.startsWith('-') &&
    hasLaterNodeReviewRunnerCandidate(args, index + 2)
  ) {
    return 2;
  }
  return 1;
}

function hasLaterNodeReviewRunnerCandidate(args: string[], startIndex: number): boolean {
  for (let index = startIndex; index < args.length; index += 1) {
    const token = args[index] ?? '';
    const optionName = normalizeCliOptionName(token);
    if (optionName === '--') {
      const explicitScript = args[index + 1] ?? '';
      return explicitScript ? isReviewRunnerScriptToken(normalizeCommandToken(explicitScript)) : false;
    }
    if (token.startsWith('-')) {
      if (hasInlineOptionValue(token)) {
        continue;
      }
      if (NODE_OPTION_VALUE_FLAGS.has(optionName)) {
        index += args[index + 1] ? 1 : 0;
      }
      continue;
    }
    return isReviewRunnerScriptToken(normalizeCommandToken(token));
  }
  return false;
}

function normalizeCliOptionName(token: string): string {
  const equalsIndex = token.indexOf('=');
  const optionName = equalsIndex >= 0 ? token.slice(0, equalsIndex) : token;
  return optionName.startsWith('--') ? optionName.toLowerCase() : optionName;
}

function hasInlineOptionValue(token: string): boolean {
  return token.includes('=');
}

function extractInlineOptionValue(token: string): string {
  const equalsIndex = token.indexOf('=');
  return equalsIndex >= 0 ? token.slice(equalsIndex + 1) : '';
}

function isDirectValidationRunnerCommand(command: string, args: string[]): boolean {
  if (REVIEW_DIRECT_VALIDATION_RUNNERS.has(command)) {
    return true;
  }

  if (command === 'python' || command === 'python3' || command === 'py') {
    for (let index = 0; index < args.length - 1; index += 1) {
      const token = args[index] ?? '';
      const optionName = normalizeCliOptionName(token);
      if (optionName === '--' || optionName === '-c' || token === '-') {
        break;
      }
      if (optionName === '-m') {
        return normalizeCommandToken(args[index + 1] ?? '') === 'pytest';
      }
      if (!token.startsWith('-')) {
        break;
      }
      if (pythonOptionConsumesValue(token)) {
        index += hasInlineOptionValue(token) ? 0 : 1;
        continue;
      }
    }
  }

  const launcherTarget = resolveValidationLauncherTarget(command, args);
  return launcherTarget !== null && REVIEW_DIRECT_VALIDATION_RUNNERS.has(launcherTarget);
}

function isPackageManagerValidationSuiteCommand(command: string, args: string[]): boolean {
  if (command !== 'npm' && command !== 'pnpm' && command !== 'yarn' && command !== 'bun') {
    return false;
  }
  const scriptTarget = resolvePackageScriptTarget(args);
  if (scriptTarget === null) {
    return false;
  }
  // Keep package-manager `test` launches inside the validation-suite boundary even
  // when they pass file selectors: repo-defined scripts can still expand them into
  // broader suites or chained wrappers.
  return isReviewValidationSuiteScriptTarget(scriptTarget);
}

function isRepoLocalValidationSuiteCommand(command: string, args: string[]): boolean {
  if (command === 'node') {
    const runtimeScriptTarget = resolveNodeRuntimeScriptTarget(args);
    if (
      runtimeScriptTarget !== null &&
      isReviewValidationSuiteScriptTarget(runtimeScriptTarget)
    ) {
      return true;
    }
    const entryScript = resolveNodeEntryScriptToken(args);
    return entryScript !== null && isReviewRepoLocalValidationScriptTarget(entryScript);
  }
  return isReviewRepoLocalValidationScriptTarget(command);
}

function isReviewValidationSuiteScriptTarget(target: string): boolean {
  const normalized = target.toLowerCase();
  return (
    !REVIEW_NON_BOUNDARY_HEAVY_SCRIPT_TARGETS.has(normalized) &&
    isReviewHeavyScriptTarget(normalized)
  );
}

function pythonOptionConsumesValue(token: string): boolean {
  return hasInlineOptionValue(token) || PYTHON_OPTION_VALUE_FLAGS.has(normalizeCliOptionName(token));
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
