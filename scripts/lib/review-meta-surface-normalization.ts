import path from 'node:path';

import { normalizeCommandToken } from './review-shell-command-parser.js';

const REVIEW_ACTIVE_CLOSEOUT_BUNDLE_KIND = 'review-closeout-bundle';
export const ARCHITECTURE_CONTEXT_META_SURFACE_KIND = 'architecture-context';

export type ReviewMetaSurfaceSample = {
  kind: string;
  candidate: string;
  operand: string;
};

export function expandMetaSurfaceOperandCandidates(
  command: string,
  args: string[],
  operand: string,
  envAssignments: ReadonlyMap<string, string> = new Map(),
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string> = new Map(),
  blockedEnvVars: ReadonlySet<string> = new Set(),
  repoRoot: string | null = null
): string[] {
  const candidates: string[] = [];
  const normalizedEnvVar = normalizeAuditMetaSurfaceEnvVar(operand);
  const resolvedEnvPath = resolveAuditMetaSurfaceEnvOperandPath(
    operand,
    envAssignments,
    auditStartupAnchorEnvVarPaths,
    blockedEnvVars,
    repoRoot
  );
  if (resolvedEnvPath) {
    candidates.push(resolvedEnvPath);
  }
  if (normalizedEnvVar && blockedEnvVars.has(normalizedEnvVar)) {
    return candidates;
  }
  candidates.push(operand);
  const gitRevisionPathCandidate = extractGitRevisionPathCandidate(command, args, operand);
  if (gitRevisionPathCandidate) {
    candidates.push(gitRevisionPathCandidate);
  }
  return candidates;
}

export function segmentMatchesAuditStartupAnchorPath(
  command: string,
  args: string[],
  envAssignments: ReadonlyMap<string, string>,
  auditStartupAnchorPaths: ReadonlySet<string>,
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string>,
  blockedEnvVars: ReadonlySet<string>,
  repoRoot: string | null
): boolean {
  if (auditStartupAnchorPaths.size === 0) {
    return false;
  }
  for (const operand of extractMetaSurfaceOperands(command, args)) {
    for (const candidate of expandMetaSurfaceOperandCandidates(
      command,
      args,
      operand,
      envAssignments,
      auditStartupAnchorEnvVarPaths,
      blockedEnvVars,
      repoRoot
    )) {
      const normalizedOperand = normalizeAuditStartupAnchorPath(candidate, repoRoot);
      if (normalizedOperand && auditStartupAnchorPaths.has(normalizedOperand)) {
        return true;
      }
    }
  }
  return false;
}

export function classifyMetaSurfaceDirectDetailed(
  command: string,
  args: string[],
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null,
  activeCloseoutBundleRoots: ReadonlySet<string> = new Set(),
  envAssignments: ReadonlyMap<string, string> = new Map(),
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string> = new Map(),
  blockedEnvVars: ReadonlySet<string> = new Set(),
  inlineAssignedEnvVars: ReadonlySet<string> = new Set(),
  allowedMetaSurfacePaths: ReadonlySet<string> = new Set()
): ReviewMetaSurfaceSample[] {
  const detailedSamples: ReviewMetaSurfaceSample[] = [];
  for (const operand of extractMetaSurfaceOperands(command, args)) {
    const resolvedEnvPath = resolveAuditMetaSurfaceEnvOperandPath(
      operand,
      envAssignments,
      auditStartupAnchorEnvVarPaths,
      blockedEnvVars,
      repoRoot
    );
    const normalizedEnvVar = normalizeAuditMetaSurfaceEnvVar(operand);
    if (resolvedEnvPath && normalizedEnvVar) {
      const allowedAuditEnvPath = auditStartupAnchorEnvVarPaths.get(normalizedEnvVar) ?? null;
      if (normalizedEnvVar === 'MANIFEST') {
        if (allowedAuditEnvPath && resolvedEnvPath === allowedAuditEnvPath) {
          detailedSamples.push({ kind: 'run-manifest', candidate: resolvedEnvPath, operand });
          continue;
        }
      }
      if (normalizedEnvVar === 'RUNNER_LOG' || normalizedEnvVar === 'RUN_LOG') {
        if (allowedAuditEnvPath && resolvedEnvPath === allowedAuditEnvPath) {
          detailedSamples.push({ kind: 'run-runner-log', candidate: resolvedEnvPath, operand });
          continue;
        }
      }
    }
    const candidates =
      resolvedEnvPath &&
      normalizedEnvVar &&
      !inlineAssignedEnvVars.has(normalizedEnvVar)
        ? [resolvedEnvPath]
        : expandMetaSurfaceOperandCandidates(
            command,
            args,
            operand,
            envAssignments,
            auditStartupAnchorEnvVarPaths,
            blockedEnvVars,
            repoRoot
          );
    for (const candidate of candidates) {
      const operandKind = classifyMetaSurfaceOperand(
        candidate,
        touchedPaths,
        repoRoot,
        activeCloseoutBundleRoots,
        allowedMetaSurfacePaths
      );
      if (operandKind) {
        detailedSamples.push({ kind: operandKind, candidate, operand });
        break;
      }
    }
  }
  return detailedSamples;
}

export function extractMetaSurfaceOperands(command: string, args: string[]): string[] {
  const operands: string[] = [];
  let positionalIndex = 0;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? '';
    if (!token) {
      continue;
    }

    if (token === '--') {
      for (const tail of args.slice(index + 1)) {
        if (shouldCollectMetaSurfacePositional(command, positionalIndex)) {
          operands.push(tail);
        }
        positionalIndex += 1;
      }
      break;
    }

    if (token.startsWith('--manifest=')) {
      operands.push(token.slice('--manifest='.length));
      continue;
    }

    if (token.startsWith('-')) {
      if (token === '--manifest') {
        const manifestValue = args[index + 1];
        if (manifestValue) {
          operands.push(manifestValue);
          index += 1;
        }
        continue;
      }
      if (metaSurfaceOptionConsumesValue(command, token) && !token.includes('=')) {
        index += 1;
      }
      continue;
    }

    if (shouldCollectMetaSurfacePositional(command, positionalIndex)) {
      operands.push(token);
    }
    positionalIndex += 1;
  }

  return operands;
}

export function normalizeAuditStartupAnchorPath(
  candidate: string,
  repoRoot: string | null
): string | null {
  const normalized = candidate.trim().replace(/\\/gu, '/');
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith('$')) {
    return null;
  }
  if (normalized.startsWith('/')) {
    return normalizeScopePath(normalized);
  }
  if (/^[A-Za-z]:\//u.test(normalized)) {
    return normalizeScopePath(normalized);
  }
  if (!repoRoot) {
    return normalizeScopePath(normalized);
  }
  return normalizeScopePath(path.resolve(repoRoot, normalized));
}

export function normalizeAuditMetaSurfaceEnvVar(candidate: string): string | null {
  const trimmed = candidate.trim();
  const match = /^\$(?:\{)?([A-Z_]+)(?:\})?$/iu.exec(trimmed);
  return match?.[1]?.toUpperCase() ?? null;
}

export function normalizeAuditMetaSurfaceEnvVarPathMap(
  entries: Record<string, string> | undefined,
  repoRoot: string | null
): Map<string, string> {
  const normalized = new Map<string, string>();
  if (!entries) {
    return normalized;
  }
  for (const [key, value] of Object.entries(entries)) {
    const normalizedKey = key.trim().replace(/^\$/u, '').replace(/[{}]/gu, '').toUpperCase();
    const normalizedValue = normalizeAuditStartupAnchorPath(value, repoRoot);
    if (normalizedKey && normalizedValue) {
      normalized.set(normalizedKey, normalizedValue);
    }
  }
  return normalized;
}

export function normalizeScopePath(value: string): string {
  return value.trim().replace(/\\/gu, '/').replace(/^\.\//u, '');
}

export function normalizeScopeRoot(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = normalizeScopePath(value).replace(/\/+$/u, '');
  return normalized.length > 0 ? normalized : null;
}

export function normalizeActiveCloseoutBundleRoot(
  value: string | undefined,
  repoRoot: string | null
): string | null {
  if (!value) {
    return null;
  }
  const normalized = normalizeAuditStartupAnchorPath(value, repoRoot);
  const repoRelativeRoot = normalized ? relativizeOperandToRepoRoot(normalized, repoRoot) : '';
  return repoRelativeRoot.length > 0 ? repoRelativeRoot.replace(/\/+$/u, '') : null;
}

export function relativizeOperandToRepoRoot(operand: string, repoRoot: string | null): string {
  if (!repoRoot) {
    return operand;
  }
  if (operand === repoRoot) {
    return '';
  }
  if (operand.startsWith(`${repoRoot}/`)) {
    return operand.slice(repoRoot.length + 1);
  }
  return operand;
}

export function isTouchedScopePath(
  operand: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null = null
): boolean {
  const normalizedOperand = normalizeScopePath(operand);
  const repoRelativeOperand = relativizeOperandToRepoRoot(normalizedOperand, repoRoot);
  const equivalentOperands = new Set<string>([repoRelativeOperand]);
  for (const touchedPath of touchedPaths) {
    if (equivalentOperands.has(normalizeScopePath(touchedPath))) {
      return true;
    }
  }
  return false;
}

export function isTouchedReviewScopePathFamilyOperand(
  operand: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null = null
): boolean {
  const normalizedOperand = normalizeScopePath(operand);
  const repoRelativeOperand = relativizeOperandToRepoRoot(normalizedOperand, repoRoot);
  const shellEnvInterpreterPathFamily = [
    'scripts/lib/review-shell-env-interpreter.ts',
    'dist/scripts/lib/review-shell-env-interpreter.js'
  ];
  if (shellEnvInterpreterPathFamily.includes(repoRelativeOperand)) {
    return shellEnvInterpreterPathFamily.some((familyPath) =>
      isTouchedScopePath(familyPath, touchedPaths, repoRoot)
    );
  }
  const promptContextPathFamily = [
    'scripts/lib/review-prompt-context.ts',
    'dist/scripts/lib/review-prompt-context.js',
    'tests/review-prompt-context.spec.ts'
  ];
  if (promptContextPathFamily.includes(repoRelativeOperand)) {
    return promptContextPathFamily.some((familyPath) =>
      isTouchedScopePath(familyPath, touchedPaths, repoRoot)
    );
  }
  const reviewScopePathFamily = [
    'scripts/lib/review-scope-paths.ts',
    'dist/scripts/lib/review-scope-paths.js',
    'tests/review-scope-paths.spec.ts'
  ];
  if (!reviewScopePathFamily.includes(repoRelativeOperand)) {
    const reviewMetaSurfaceNormalizationPathFamily = [
      'scripts/lib/review-meta-surface-normalization.ts',
      'dist/scripts/lib/review-meta-surface-normalization.js',
      'tests/review-meta-surface-normalization.spec.ts'
    ];
    if (reviewMetaSurfaceNormalizationPathFamily.includes(repoRelativeOperand)) {
      return reviewMetaSurfaceNormalizationPathFamily.some((familyPath) =>
        isTouchedScopePath(familyPath, touchedPaths, repoRoot)
      );
    }
    const reviewInspectionTargetParsingPathFamily = [
      'scripts/lib/review-inspection-target-parsing.ts',
      'dist/scripts/lib/review-inspection-target-parsing.js',
      'tests/review-inspection-target-parsing.spec.ts',
      'scripts/lib/review-execution-state.ts',
      'tests/review-execution-state.spec.ts'
    ];
    if (reviewInspectionTargetParsingPathFamily.includes(repoRelativeOperand)) {
      return reviewInspectionTargetParsingPathFamily.some((familyPath) =>
        isTouchedScopePath(familyPath, touchedPaths, repoRoot)
      );
    }
    const reviewCommandProbeClassificationPathFamily = [
      'scripts/lib/review-command-probe-classification.ts',
      'dist/scripts/lib/review-command-probe-classification.js',
      'tests/review-command-probe-classification.spec.ts',
      'scripts/lib/review-execution-state.ts',
      'tests/review-execution-state.spec.ts'
    ];
    if (reviewCommandProbeClassificationPathFamily.includes(repoRelativeOperand)) {
      return reviewCommandProbeClassificationPathFamily.some((familyPath) =>
        isTouchedScopePath(familyPath, touchedPaths, repoRoot)
      );
    }
    const reviewCommandIntentClassificationPathFamily = [
      'scripts/lib/review-command-intent-classification.ts',
      'dist/scripts/lib/review-command-intent-classification.js',
      'tests/review-command-intent-classification.spec.ts',
      'scripts/lib/review-execution-state.ts',
      'tests/review-execution-state.spec.ts'
    ];
    if (!reviewCommandIntentClassificationPathFamily.includes(repoRelativeOperand)) {
      return false;
    }
    return reviewCommandIntentClassificationPathFamily.some((familyPath) =>
      isTouchedScopePath(familyPath, touchedPaths, repoRoot)
    );
  }
  return reviewScopePathFamily.some((familyPath) =>
    isTouchedScopePath(familyPath, touchedPaths, repoRoot)
  );
}

function resolveAuditMetaSurfaceEnvOperandPath(
  operand: string,
  envAssignments: ReadonlyMap<string, string>,
  auditStartupAnchorEnvVarPaths: ReadonlyMap<string, string>,
  blockedEnvVars: ReadonlySet<string>,
  repoRoot: string | null
): string | null {
  const normalizedEnvVar = normalizeAuditMetaSurfaceEnvVar(operand);
  if (!normalizedEnvVar) {
    return null;
  }
  if (blockedEnvVars.has(normalizedEnvVar)) {
    return null;
  }
  const inlineValue = envAssignments.get(normalizedEnvVar);
  if (inlineValue !== undefined) {
    const normalizedInlinePath = normalizeAuditStartupAnchorPath(inlineValue, repoRoot);
    if (normalizedInlinePath) {
      return normalizedInlinePath;
    }
    return null;
  }
  return auditStartupAnchorEnvVarPaths.get(normalizedEnvVar) ?? null;
}

function extractGitRevisionPathCandidate(
  command: string,
  args: string[],
  operand: string
): string | null {
  if (command !== 'git') {
    return null;
  }
  const invocation = resolveGitInvocation(args);
  if (invocation.subcommand !== 'show') {
    return null;
  }
  const normalizedOperand = operand.replace(/\\/gu, '/');
  if (normalizedOperand.startsWith(':')) {
    return normalizedOperand.slice(1);
  }
  if (normalizedOperand.includes('://')) {
    return null;
  }
  const separatorIndex = normalizedOperand.lastIndexOf(':');
  if (separatorIndex <= 0 || separatorIndex === normalizedOperand.length - 1) {
    return null;
  }
  return normalizedOperand.slice(separatorIndex + 1);
}

export function resolveGitInvocation(
  args: string[]
): { subcommand: string | null; subcommandArgs: string[] } {
  let index = 0;
  while (index < args.length) {
    const token = args[index] ?? '';
    const normalized = normalizeCommandToken(token);
    if (!normalized) {
      index += 1;
      continue;
    }
    if (normalized === '--') {
      return { subcommand: null, subcommandArgs: [] };
    }
    if (token.startsWith('-')) {
      index += gitOptionConsumesValue(token) && !token.includes('=') ? 2 : 1;
      continue;
    }
    return { subcommand: normalized, subcommandArgs: args.slice(index + 1) };
  }
  return { subcommand: null, subcommandArgs: [] };
}

function gitOptionConsumesValue(option: string): boolean {
  const normalized = option.toLowerCase();
  return (
    normalized === '-c' ||
    normalized === '-C' ||
    normalized === '--git-dir' ||
    normalized.startsWith('--git-dir=') ||
    normalized === '--work-tree' ||
    normalized.startsWith('--work-tree=') ||
    normalized === '--namespace' ||
    normalized.startsWith('--namespace=') ||
    normalized === '--exec-path' ||
    normalized.startsWith('--exec-path=') ||
    normalized === '--config-env' ||
    normalized.startsWith('--config-env=') ||
    normalized === '--super-prefix' ||
    normalized.startsWith('--super-prefix=')
  );
}

function metaSurfaceOptionConsumesValue(command: string, option: string): boolean {
  const normalized = option.toLowerCase();
  if (command === 'rg') {
    return (
      normalized === '-g' ||
      normalized === '--glob' ||
      normalized.startsWith('--glob=') ||
      normalized === '--iglob' ||
      normalized.startsWith('--iglob=') ||
      normalized === '-e' ||
      normalized === '--regexp' ||
      normalized.startsWith('--regexp=') ||
      normalized === '-f' ||
      normalized === '--file' ||
      normalized.startsWith('--file=') ||
      normalized === '--pre' ||
      normalized.startsWith('--pre=') ||
      normalized === '--pre-glob' ||
      normalized.startsWith('--pre-glob=') ||
      normalized === '-r' ||
      normalized === '--replace' ||
      normalized.startsWith('--replace=') ||
      normalized === '-t' ||
      normalized === '--type' ||
      normalized.startsWith('--type=') ||
      normalized === '--type-not' ||
      normalized.startsWith('--type-not=')
    );
  }
  if (command === 'grep' || command === 'ggrep') {
    return normalized === '-e' || normalized === '-f';
  }
  return false;
}

function shouldCollectMetaSurfacePositional(command: string, positionalIndex: number): boolean {
  if (command === 'rg' || command === 'grep' || command === 'ggrep') {
    return positionalIndex >= 1;
  }
  return true;
}

function classifyMetaSurfaceOperand(
  operand: string,
  touchedPaths: ReadonlySet<string>,
  repoRoot: string | null,
  activeCloseoutBundleRoots: ReadonlySet<string> = new Set(),
  allowedMetaSurfacePaths: ReadonlySet<string> = new Set()
): string | null {
  const normalized = operand.trim().replace(/\\/gu, '/');
  if (!normalized) {
    return null;
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(normalized)) {
    return null;
  }
  if (
    isTouchedScopePath(normalized, touchedPaths, repoRoot) ||
    isTouchedReviewScopePathFamilyOperand(normalized, touchedPaths, repoRoot)
  ) {
    return null;
  }
  const activeCloseoutBundleKind = classifyActiveCloseoutBundleCandidate(
    normalized,
    activeCloseoutBundleRoots,
    repoRoot
  );
  if (activeCloseoutBundleKind) {
    return activeCloseoutBundleKind;
  }
  if (/^\$(?:\{)?MANIFEST(?:\})?$/iu.test(normalized)) {
    return 'run-manifest';
  }
  if (/^\$(?:\{)?(?:RUNNER_LOG|RUN_LOG)(?:\})?$/iu.test(normalized)) {
    return 'run-runner-log';
  }
  if (normalized.includes('.codex/memories/')) {
    return 'codex-memories';
  }
  if (normalized.includes('.codex/skills/')) {
    return 'codex-skills';
  }
  if (normalized.includes('.runs/') && normalized.endsWith('/manifest.json')) {
    return 'run-manifest';
  }
  if (normalized.includes('.runs/') && normalized.endsWith('/runner.ndjson')) {
    return 'run-runner-log';
  }
  const normalizedAllowedMetaSurfacePath = normalizeAuditStartupAnchorPath(normalized, repoRoot);
  if (
    normalizedAllowedMetaSurfacePath !== null &&
    allowedMetaSurfacePaths.has(normalizedAllowedMetaSurfacePath)
  ) {
    return ARCHITECTURE_CONTEXT_META_SURFACE_KIND;
  }
  if (
    normalized.includes('/review/') &&
    /\/(?:prompt\.txt|output\.log|telemetry\.json)$/iu.test(normalized)
  ) {
    return 'review-artifacts';
  }
  if (
    matchesPathSuffix(normalized, 'scripts/pack-smoke.mjs') ||
    matchesPathSuffix(normalized, 'scripts/pack-smoke.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/run-manifests.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/run-manifests.d.ts') ||
    matchesPathSuffix(normalized, 'scripts/lib/review-shell-env-interpreter.ts') ||
    matchesPathSuffix(normalized, 'dist/scripts/lib/review-shell-env-interpreter.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/review-prompt-context.ts') ||
    matchesPathSuffix(normalized, 'dist/scripts/lib/review-prompt-context.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/review-scope-paths.ts') ||
    matchesPathSuffix(normalized, 'dist/scripts/lib/review-scope-paths.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/review-meta-surface-normalization.ts') ||
    matchesPathSuffix(normalized, 'dist/scripts/lib/review-meta-surface-normalization.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/review-inspection-target-parsing.ts') ||
    matchesPathSuffix(normalized, 'dist/scripts/lib/review-inspection-target-parsing.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/review-command-probe-classification.ts') ||
    matchesPathSuffix(normalized, 'dist/scripts/lib/review-command-probe-classification.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/review-command-intent-classification.ts') ||
    matchesPathSuffix(normalized, 'dist/scripts/lib/review-command-intent-classification.js') ||
    matchesPathSuffix(normalized, 'scripts/run-review.ts') ||
    matchesPathSuffix(normalized, 'scripts/run-review.js') ||
    matchesPathSuffix(normalized, 'scripts/lib/review-execution-state.ts') ||
    matchesPathSuffix(normalized, 'tests/review-prompt-context.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/review-meta-surface-normalization.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/review-inspection-target-parsing.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/review-command-probe-classification.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/review-command-intent-classification.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/review-scope-paths.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/run-review.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/run-review.spec.js') ||
    matchesPathSuffix(normalized, 'tests/review-execution-state.spec.ts') ||
    matchesPathSuffix(normalized, 'tests/review-execution-state.spec.js')
  ) {
    return 'review-support';
  }
  if (
    matchesPathSuffix(normalized, 'docs/standalone-review-guide.md') ||
    matchesPathSuffix(normalized, 'docs/guides/review-artifacts.md') ||
    /(?:^|\/)docs\/(?:PRD|TECH_SPEC|ACTION_PLAN)-.*standalone-review.*\.md$/iu.test(normalized) ||
    /(?:^|\/)docs\/findings\/.*standalone-review.*\.md$/iu.test(normalized)
  ) {
    return 'review-docs';
  }
  return null;
}

function matchesPathSuffix(value: string, relativePath: string): boolean {
  const normalizedRelativePath = normalizeScopePath(relativePath);
  return value === normalizedRelativePath || value.endsWith(`/${normalizedRelativePath}`);
}

export function classifyActiveCloseoutBundleCandidate(
  candidate: string,
  activeCloseoutBundleRoots: ReadonlySet<string>,
  repoRoot: string | null
): string | null {
  if (activeCloseoutBundleRoots.size === 0) {
    return null;
  }
  const normalized = normalizeScopePath(candidate);
  const repoRelativeOperand = relativizeOperandToRepoRoot(normalized, repoRoot);
  for (const root of activeCloseoutBundleRoots) {
    if (repoRelativeOperand === root || repoRelativeOperand.startsWith(`${root}/`)) {
      return REVIEW_ACTIVE_CLOSEOUT_BUNDLE_KIND;
    }
  }
  return null;
}
