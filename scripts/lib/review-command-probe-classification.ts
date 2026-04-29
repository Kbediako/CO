import {
  REVIEW_SHELL_COMMANDS,
  extractShellCommandPayload,
  normalizeCommandToken,
  normalizeShellCommandPathSeparators,
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
  'docs:freshness',
  'docs:freshness:maintain',
  'eval:test',
  'repo:stewardship',
  'pack:smoke'
]);

const REVIEW_HEAVY_SCRIPT_TARGET_PREFIXES = ['test:'];
const REVIEW_REPO_LOCAL_VALIDATION_SCRIPT_TARGETS = new Set([
  'delegation-guard.mjs',
  'diff-budget.mjs',
  'docs-freshness-maintain.mjs',
  'docs-freshness.mjs',
  'docs-hygiene.ts',
  'pack-smoke.mjs',
  'repo-stewardship-audit.mjs',
  'run-test-all.mjs',
  'spec-guard.mjs'
]);
const REVIEW_HELP_ONLY_NODE_RUN_VALIDATION_TARGETS = new Set([
  'docs:freshness',
  'docs:freshness:maintain',
  'repo:stewardship'
]);
const REVIEW_HELP_ONLY_REPO_LOCAL_VALIDATION_SCRIPT_TARGETS = new Set([
  'delegation-guard.mjs',
  'diff-budget.mjs',
  'docs-freshness-maintain.mjs',
  'docs-freshness.mjs',
  'repo-stewardship-audit.mjs',
  'spec-guard.mjs'
]);
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
const REVIEW_PACKAGE_RUN_SUBCOMMAND_ALIASES = new Set(['run', 'run-script', 'rum', 'urn']);
const REVIEW_PACKAGE_TEST_SUBCOMMAND_ALIASES = new Set(['test', 't', 'tst']);
const REVIEW_SHELL_PROBE_ENV_VARS = new Set(['MANIFEST', 'RUNNER_LOG', 'RUN_LOG']);
const REVIEW_DIRECT_VALIDATION_RUNNERS = new Set(['vitest', 'jest', 'pytest']);
const REVIEW_LIKELY_COMMANDS = new Set([
  'npm',
  'pnpm',
  'yarn',
  'bun',
  'npx',
  'bunx',
  'git',
  'bash',
  'sh',
  'zsh',
  'ksh',
  'fish',
  'python',
  'python3',
  'py',
  'pytest',
  'go',
  'cargo',
  'mvn',
  'mvnw',
  'gradle',
  'gradlew',
  'node',
  'codex',
  'codex-orchestrator',
  'cmd',
  'powershell',
  'pwsh',
  'sed',
  'rg',
  'grep',
  'cat',
  'head',
  'tail',
  'nl',
  'awk',
  'find',
  'ls'
]);

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

export function isReviewHeavyScriptTarget(target: string): boolean {
  const normalized = target.toLowerCase();
  return (
    REVIEW_HEAVY_SCRIPT_TARGETS.has(normalized) ||
    REVIEW_HEAVY_SCRIPT_TARGET_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

export function isReviewRepoLocalValidationScriptTarget(target: string): boolean {
  return REVIEW_REPO_LOCAL_VALIDATION_SCRIPT_TARGETS.has(normalizeCommandToken(target));
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

  if (REVIEW_DIRECT_VALIDATION_RUNNERS.has(command)) {
    return true;
  }

  if (command === 'npm' || command === 'pnpm' || command === 'yarn' || command === 'bun') {
    const scriptTarget = resolvePackageScriptTarget(args);
    return scriptTarget !== null && isReviewHeavyScriptTarget(scriptTarget);
  }

  if (command === 'node') {
    const runtimeScriptTarget = resolveNodeRuntimeScriptTarget(args);
    if (runtimeScriptTarget !== null && isReviewHeavyScriptTarget(runtimeScriptTarget)) {
      return !isReviewHelpOnlyNodeRunValidationLookup(
        runtimeScriptTarget,
        resolveNodeRuntimeScriptArgs(args) ?? []
      );
    }
    const entryScript = resolveNodeEntryScriptInvocation(args);
    return (
      entryScript !== null &&
      isReviewRepoLocalValidationScriptTarget(entryScript.script) &&
      !isReviewHelpOnlyRepoLocalValidationScriptLookup(entryScript.script, entryScript.args)
    );
  }

  if (isReviewRepoLocalValidationScriptTarget(command)) {
    return !isReviewHelpOnlyRepoLocalValidationScriptLookup(command, args);
  }

  const launcherTarget = resolveValidationLauncherTarget(command, args);
  if (launcherTarget !== null && REVIEW_DIRECT_VALIDATION_RUNNERS.has(launcherTarget)) {
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

function resolveNodeEntryScriptToken(args: string[]): string | null {
  return resolveNodeEntryScriptInvocation(args)?.script ?? null;
}

interface NodeEntryScriptInvocation {
  script: string;
  args: string[];
}

function resolveNodeEntryScriptInvocation(args: string[]): NodeEntryScriptInvocation | null {
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? '';
    const optionName = normalizeCliOptionName(token);
    if (optionName === '--') {
      const explicitScript = args[index + 1] ?? '';
      return explicitScript
        ? {
            script: explicitScript,
            args: args.slice(index + 2)
          }
        : null;
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
    return {
      script: token,
      args: args.slice(index + 1)
    };
  }
  return null;
}

export function resolveNodeRuntimeScriptTarget(args: string[]): string | null {
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? '';
    const optionName = normalizeCliOptionName(token);
    if (optionName === '--') {
      return null;
    }
    if (NODE_NON_SCRIPT_EXECUTION_FLAGS.has(optionName)) {
      return null;
    }
    if (NODE_RUNTIME_SCRIPT_FLAGS.has(optionName)) {
      if (hasInlineOptionValue(token)) {
        return normalizeCommandToken(extractInlineOptionValue(token));
      }
      const scriptTarget = args[index + 1] ?? '';
      return scriptTarget ? normalizeCommandToken(scriptTarget) : null;
    }
    if (token.startsWith('-')) {
      index += advancePastNodeOption(args, index) - 1;
      continue;
    }
    return null;
  }
  return null;
}

function resolveNodeRuntimeScriptArgs(args: string[]): string[] | null {
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? '';
    const optionName = normalizeCliOptionName(token);
    if (optionName === '--') {
      return null;
    }
    if (NODE_NON_SCRIPT_EXECUTION_FLAGS.has(optionName)) {
      return null;
    }
    if (NODE_RUNTIME_SCRIPT_FLAGS.has(optionName)) {
      return hasInlineOptionValue(token) ? args.slice(index + 1) : args.slice(index + 2);
    }
    if (token.startsWith('-')) {
      index += advancePastNodeOption(args, index) - 1;
      continue;
    }
    return null;
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
  return 1;
}

function normalizeCliOptionName(token: string): string {
  const equalsIndex = token.indexOf('=');
  const optionName = equalsIndex >= 0 ? token.slice(0, equalsIndex) : token;
  return optionName.startsWith('--') ? optionName.toLowerCase() : optionName;
}

function hasInlineOptionValue(token: string): boolean {
  return token.includes('=');
}

function hasForwardedScriptHelpRequest(
  args: string[],
  options: { allowBareHelp?: boolean } = {}
): boolean {
  return hasCliHelpRequest(stripPackageRunSeparator(args), {
    allowBareHelp: options.allowBareHelp ?? true
  });
}

function stripPackageRunSeparator(args: string[]): string[] {
  return normalizeCommandToken(args[0] ?? '') === '--' ? args.slice(1) : args;
}

function hasCliHelpRequest(
  tokens: string[],
  options: { allowBareHelp?: boolean } = {}
): boolean {
  const positionals: string[] = [];
  const helpFlags = new Map<string, boolean>();
  let sawNonBareHelpToken = false;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? '';
    const optionName = normalizeCliOptionName(token);
    if (optionName === '--') {
      break;
    }
    if (optionName === '--help' || optionName === '-h') {
      const helpKey = optionName === '--help' ? 'help' : 'h';
      let enabled = true;
      if (hasInlineOptionValue(token)) {
        if (isDisabledCliHelpValue(extractCliInlineOptionValue(token))) {
          enabled = false;
        }
      } else {
        const nextToken = tokens[index + 1] ?? '';
        if (nextToken && !nextToken.startsWith('-')) {
          enabled = !isDisabledCliHelpValue(nextToken);
          index += 1;
        }
      }
      helpFlags.set(helpKey, enabled);
      sawNonBareHelpToken = true;
      continue;
    }
    if (token.startsWith('-')) {
      sawNonBareHelpToken = true;
      continue;
    }
    const positional = normalizeCommandToken(token);
    positionals.push(positional);
    if (positional !== 'help') {
      sawNonBareHelpToken = true;
    }
  }
  if ([...helpFlags.values()].some(Boolean)) {
    return true;
  }
  return Boolean(options.allowBareHelp && !sawNonBareHelpToken && positionals.length === 1 && positionals[0] === 'help');
}

function isDisabledCliHelpValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'false' || normalized === '0';
}

function extractCliInlineOptionValue(token: string): string {
  const equalsIndex = token.indexOf('=');
  if (equalsIndex < 0) {
    return '';
  }
  const value = token.slice(equalsIndex + 1);
  const nextEqualsIndex = value.indexOf('=');
  return nextEqualsIndex >= 0 ? value.slice(0, nextEqualsIndex) : value;
}

function extractInlineOptionValue(token: string): string {
  const equalsIndex = token.indexOf('=');
  return equalsIndex >= 0 ? token.slice(equalsIndex + 1) : '';
}

export function isReviewHelpOnlyNodeRunValidationLookup(target: string, args: string[]): boolean {
  return (
    REVIEW_HELP_ONLY_NODE_RUN_VALIDATION_TARGETS.has(target.toLowerCase()) &&
    hasForwardedScriptHelpRequest(args, { allowBareHelp: false })
  );
}

export function isReviewHelpOnlyRepoLocalValidationScriptLookup(script: string, args: string[]): boolean {
  return (
    REVIEW_HELP_ONLY_REPO_LOCAL_VALIDATION_SCRIPT_TARGETS.has(normalizeCommandToken(script)) &&
    hasForwardedScriptHelpRequest(args)
  );
}

function resolveValidationLauncherTarget(command: string, args: string[]): string | null {
  if (command === 'npx' || command === 'bunx') {
    return resolveFirstBinaryLauncherTarget(args);
  }

  const firstArg = normalizeCommandToken(args[0] ?? '');
  if (command === 'npm' && firstArg === 'exec') {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'pnpm' && (firstArg === 'dlx' || firstArg === 'exec')) {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'yarn' && (firstArg === 'dlx' || firstArg === 'exec')) {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
  }
  if (command === 'bun' && firstArg === 'x') {
    return resolveFirstBinaryLauncherTarget(args.slice(1), { skipDlx: false });
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
      index += binaryLauncherOptionExpectsValue(token) && !token.includes('=') ? 2 : 1;
      continue;
    }
    return normalizeCommandToken(token);
  }
  return null;
}

function binaryLauncherOptionExpectsValue(option: string): boolean {
  const normalized = option.toLowerCase();
  return (
    normalized === '-p' ||
    normalized === '--package' ||
    normalized === '-c' ||
    normalized === '--call' ||
    normalized === '--node-options'
  );
}

function detectHeavyReviewCommandFromSegment(segment: string, depth = 0): string | null {
  const tokens = stripLeadingEnvAssignments(tokenizeShellSegment(segment));
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
  const normalized = normalizeShellCommandPathSeparators(normalizeReviewCommandLine(commandLine));
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
  const segments = splitShellControlSegmentsDetailed(
    normalizeShellCommandPathSeparators(payload)
  );
  for (const { segment } of segments) {
    if (segmentLooksLikeShellProbe(tokenizeShellSegment(segment), depth)) {
      return true;
    }
  }
  return false;
}

export function classifyShellProbeCommandLine(commandLine: string): string | null {
  const normalized = normalizeShellCommandPathSeparators(normalizeReviewCommandLine(commandLine));
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
  const normalized = normalizeShellCommandPathSeparators(normalizeReviewCommandLine(line));
  if (!normalized) {
    return false;
  }
  if (detectHeavyReviewCommand(normalized)) {
    return true;
  }
  const segments = splitShellControlSegments(normalized);
  for (const segment of segments) {
    const shellTokens = stripLeadingEnvAssignments(tokenizeShellSegment(segment));
    if (extractShellCommandPayload(shellTokens)) {
      return true;
    }
    const unwrappedTokens = unwrapEnvCommandTokens(shellTokens);
    const command = normalizeCommandToken(unwrappedTokens[0] ?? shellTokens[0] ?? '');
    if (REVIEW_LIKELY_COMMANDS.has(command)) {
      return true;
    }
  }
  if (normalized.includes(' in ') && /\s-\w+\s+/u.test(normalized)) {
    return true;
  }
  return false;
}
