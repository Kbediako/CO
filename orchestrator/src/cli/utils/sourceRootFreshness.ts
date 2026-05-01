import { existsSync, realpathSync, readFileSync } from 'node:fs';
import { basename, dirname, join, normalize, resolve, sep } from 'node:path';

import {
  inspectCheckoutPosture,
  type CheckoutPostureCommit,
  type CheckoutPostureInspection,
  type CheckoutPostureStatus
} from './checkoutPosture.js';

export type SourceRootFreshnessStatus = 'current' | 'warning' | 'unavailable';
export type SourceRootEntrypointKind = 'source' | 'dist' | 'bootstrap' | 'unknown';
export type SourceRootDriftClass =
  | 'shared_checkout_drift'
  | 'supervised_source_root_drift'
  | 'source_vs_dist_drift'
  | 'global_binary_package_provenance_drift';

export interface SourceRootCheckoutFreshness {
  status: CheckoutPostureStatus;
  repo_root: string;
  inside_git_worktree: boolean;
  base_ref: 'origin/main';
  ahead: number | null;
  behind: number | null;
  dirty: CheckoutPostureInspection['dirty'];
  head: CheckoutPostureCommit | null;
  upstream: CheckoutPostureCommit | null;
  detail: string;
}

export interface SourceRootFreshnessInspection {
  schema_version: 1;
  status: SourceRootFreshnessStatus;
  observed_at: string;
  intended_repo_root: string | null;
  intended_repo_root_realpath: string | null;
  command_path: string | null;
  command_path_realpath: string | null;
  package_root: string | null;
  package_root_realpath: string | null;
  source_root: string | null;
  source_root_realpath: string | null;
  entrypoint_kind: SourceRootEntrypointKind;
  base_ref: 'origin/main';
  source_checkout: SourceRootCheckoutFreshness | null;
  intended_checkout: SourceRootCheckoutFreshness | null;
  drift_classes: SourceRootDriftClass[];
  provenance: {
    command_path_source: 'explicit' | 'argv' | 'unresolved';
    package_root_source: 'explicit' | 'command_path' | 'package_json' | 'unresolved';
    source_root_source: 'package_root' | 'command_path' | 'unresolved';
    command_path_inside_package: boolean | null;
    package_root_matches_intended: boolean | null;
    source_root_matches_intended: boolean | null;
    source_entry_exists: boolean | null;
    dist_entry_exists: boolean | null;
  };
  guidance: string[];
  detail: string;
}

export function inspectSourceRootFreshness(input: {
  intendedRepoRoot?: string | null;
  argv?: string[] | null;
  commandPath?: string | null;
  commandPathRealpath?: string | null;
  packageRoot?: string | null;
  packageRootRealpath?: string | null;
  sourceRootRealpath?: string | null;
  cwd?: string | null;
  now?: () => string;
} = {}): SourceRootFreshnessInspection {
  const observedAt = input.now?.() ?? new Date().toISOString();
  const intendedRepoRoot = normalizeOptionalPath(input.intendedRepoRoot);
  const intendedRepoRootRealpath = realpathIfAvailable(intendedRepoRoot);
  const commandPathSource = normalizeOptionalString(input.commandPath)
    ? 'explicit'
    : normalizeCommandPathFromArgv(input.argv)?.source ?? 'unresolved';
  const commandPath = resolveCandidatePath(
    normalizeOptionalString(input.commandPath) ?? normalizeCommandPathFromArgv(input.argv)?.path ?? null,
    input.cwd
  );
  const commandPathRealpath = normalizeOptionalPath(input.commandPathRealpath) ?? realpathIfAvailable(commandPath);
  const explicitPackageRoot = normalizeOptionalPath(input.packageRoot);
  const commandPackageRoot = resolvePackageRootFromCommandPath(commandPathRealpath ?? commandPath);
  const packageJsonRoot = commandPackageRoot ? null : findPackageJsonRoot(commandPathRealpath ?? commandPath);
  const packageRoot = explicitPackageRoot ?? commandPackageRoot ?? packageJsonRoot;
  const packageRootSource: SourceRootFreshnessInspection['provenance']['package_root_source'] =
    explicitPackageRoot
      ? 'explicit'
      : commandPackageRoot
        ? 'command_path'
        : packageJsonRoot
        ? 'package_json'
        : 'unresolved';
  const packageRootRealpath = normalizeOptionalPath(input.packageRootRealpath) ?? realpathIfAvailable(packageRoot);
  const commandPathInsidePackage = pathIsInside(commandPathRealpath ?? commandPath, packageRootRealpath ?? packageRoot);
  const commandSourceRoot = commandPackageRoot ?? packageJsonRoot;
  const sourceRoot = commandPathInsidePackage === false && commandSourceRoot
    ? commandSourceRoot
    : packageRoot ?? commandSourceRoot;
  const sourceRootSource: SourceRootFreshnessInspection['provenance']['source_root_source'] =
    commandPathInsidePackage === false && commandSourceRoot
      ? 'command_path'
      : packageRoot
        ? 'package_root'
        : sourceRoot
        ? 'command_path'
        : 'unresolved';
  const sourceRootRealpath = normalizeOptionalPath(input.sourceRootRealpath) ?? realpathIfAvailable(sourceRoot);
  const sourceEntryExists = sourceRootRealpath ? existsSync(join(sourceRootRealpath, 'bin', 'codex-orchestrator.ts')) : null;
  const distEntryExists = sourceRootRealpath ? existsSync(join(sourceRootRealpath, 'dist', 'bin', 'codex-orchestrator.js')) : null;
  const entrypointKind = classifyEntrypointKind(commandPath, commandPathRealpath, sourceRootRealpath, sourceEntryExists);
  const sourceCheckout = sourceRootRealpath ? summarizeCheckout(inspectCheckoutPosture(sourceRootRealpath)) : null;
  const intendedCheckout = intendedRepoRootRealpath
    ? summarizeCheckout(inspectCheckoutPosture(intendedRepoRootRealpath))
    : null;
  const packageRootMatchesIntended = comparePaths(packageRootRealpath, intendedRepoRootRealpath);
  const sourceRootMatchesIntended = comparePaths(sourceRootRealpath, intendedRepoRootRealpath);
  const driftClasses = classifyDriftClasses({
    intendedCheckout,
    sourceCheckout,
    sourceRootMatchesIntended,
    packageRootMatchesIntended,
    commandPathInsidePackage,
    entrypointKind,
    sourceEntryExists
  });
  const status = resolveFreshnessStatus({ sourceRootRealpath, sourceCheckout, driftClasses });

  return {
    schema_version: 1,
    status,
    observed_at: observedAt,
    intended_repo_root: intendedRepoRoot,
    intended_repo_root_realpath: intendedRepoRootRealpath,
    command_path: commandPath,
    command_path_realpath: commandPathRealpath,
    package_root: packageRoot,
    package_root_realpath: packageRootRealpath,
    source_root: sourceRoot,
    source_root_realpath: sourceRootRealpath,
    entrypoint_kind: entrypointKind,
    base_ref: 'origin/main',
    source_checkout: sourceCheckout,
    intended_checkout: intendedCheckout,
    drift_classes: driftClasses,
    provenance: {
      command_path_source: commandPathSource,
      package_root_source: packageRootSource,
      source_root_source: sourceRootSource,
      command_path_inside_package: commandPathInsidePackage,
      package_root_matches_intended: packageRootMatchesIntended,
      source_root_matches_intended: sourceRootMatchesIntended,
      source_entry_exists: sourceEntryExists,
      dist_entry_exists: distEntryExists
    },
    guidance: buildSourceRootGuidance(driftClasses, status),
    detail: buildSourceRootDetail(driftClasses, status)
  };
}

export function formatSourceRootFreshnessSummary(result: SourceRootFreshnessInspection): string[] {
  const lines: string[] = [];
  lines.push(`Source root freshness: ${result.status}`);
  lines.push(`  - command path: ${result.command_path ?? '<unresolved>'}`);
  if (result.command_path_realpath && result.command_path_realpath !== result.command_path) {
    lines.push(`    realpath: ${result.command_path_realpath}`);
  }
  lines.push(`  - package root: ${result.package_root ?? '<unresolved>'}`);
  if (result.package_root_realpath && result.package_root_realpath !== result.package_root) {
    lines.push(`    realpath: ${result.package_root_realpath}`);
  }
  lines.push(`  - source root: ${result.source_root_realpath ?? result.source_root ?? '<unresolved>'}`);
  lines.push(`  - entrypoint: ${result.entrypoint_kind}`);
  if (result.source_checkout) {
    lines.push(
      `  - source checkout: ${result.source_checkout.status} (${formatComparison(result.source_checkout)})`
    );
    if (result.source_checkout.head) {
      lines.push(`    HEAD: ${formatCommit(result.source_checkout.head)}`);
    }
    if (result.source_checkout.upstream) {
      lines.push(`    ${result.source_checkout.base_ref}: ${formatCommit(result.source_checkout.upstream)}`);
    }
  } else {
    lines.push('  - source checkout: unavailable');
  }
  if (result.drift_classes.length > 0) {
    lines.push(`  - drift classes: ${result.drift_classes.join(', ')}`);
  }
  for (const item of result.guidance) {
    lines.push(`  - ${item}`);
  }
  return lines;
}

export function normalizeSourceRootFreshnessInspection(
  value: unknown
): SourceRootFreshnessInspection | null {
  if (!isRecordLike(value) || value.schema_version !== 1) {
    return null;
  }
  const status = normalizeFreshnessStatus(value.status);
  if (!status) {
    return null;
  }
  const entrypointKind = normalizeEntrypointKind(value.entrypoint_kind);
  const driftClasses = Array.isArray(value.drift_classes)
    ? value.drift_classes.filter((entry): entry is SourceRootDriftClass => normalizeDriftClass(entry) !== null)
    : [];
  const provenance = isRecordLike(value.provenance) ? value.provenance : {};
  return {
    schema_version: 1,
    status,
    observed_at: typeof value.observed_at === 'string' ? value.observed_at : '',
    intended_repo_root: nullableString(value.intended_repo_root),
    intended_repo_root_realpath: nullableString(value.intended_repo_root_realpath),
    command_path: nullableString(value.command_path),
    command_path_realpath: nullableString(value.command_path_realpath),
    package_root: nullableString(value.package_root),
    package_root_realpath: nullableString(value.package_root_realpath),
    source_root: nullableString(value.source_root),
    source_root_realpath: nullableString(value.source_root_realpath),
    entrypoint_kind: entrypointKind ?? 'unknown',
    base_ref: 'origin/main',
    source_checkout: normalizeCheckoutFreshness(value.source_checkout),
    intended_checkout: normalizeCheckoutFreshness(value.intended_checkout),
    drift_classes: driftClasses,
    provenance: {
      command_path_source: normalizeCommandPathSource(provenance.command_path_source),
      package_root_source: normalizePackageRootSource(provenance.package_root_source),
      source_root_source: normalizeSourceRootSource(provenance.source_root_source),
      command_path_inside_package: nullableBoolean(provenance.command_path_inside_package),
      package_root_matches_intended: nullableBoolean(provenance.package_root_matches_intended),
      source_root_matches_intended: nullableBoolean(provenance.source_root_matches_intended),
      source_entry_exists: nullableBoolean(provenance.source_entry_exists),
      dist_entry_exists: nullableBoolean(provenance.dist_entry_exists)
    },
    guidance: Array.isArray(value.guidance)
      ? value.guidance.filter((entry): entry is string => typeof entry === 'string')
      : [],
    detail: typeof value.detail === 'string' ? value.detail : ''
  };
}

export function refreshSourceRootFreshnessInspection(
  prior: SourceRootFreshnessInspection,
  fallbackIntendedRepoRoot?: string | null
): SourceRootFreshnessInspection {
  const intendedRepoRoot = prior.intended_repo_root ?? fallbackIntendedRepoRoot ?? null;
  const refreshed = inspectSourceRootFreshness({
    intendedRepoRoot,
    commandPath: prior.command_path,
    commandPathRealpath: prior.command_path_realpath,
    packageRoot: prior.package_root,
    packageRootRealpath: prior.package_root_realpath,
    sourceRootRealpath: prior.source_root_realpath,
    cwd: intendedRepoRoot ?? prior.source_root ?? null
  });
  return {
    ...refreshed,
    provenance: {
      ...refreshed.provenance,
      command_path_source: prior.provenance.command_path_source,
      package_root_source: prior.provenance.package_root_source,
      source_root_source: prior.provenance.source_root_source
    }
  };
}

function classifyDriftClasses(input: {
  intendedCheckout: SourceRootCheckoutFreshness | null;
  sourceCheckout: SourceRootCheckoutFreshness | null;
  sourceRootMatchesIntended: boolean | null;
  packageRootMatchesIntended: boolean | null;
  commandPathInsidePackage: boolean | null;
  entrypointKind: SourceRootEntrypointKind;
  sourceEntryExists: boolean | null;
}): SourceRootDriftClass[] {
  const classes: SourceRootDriftClass[] = [];
  if (checkoutHasPostureDrift(input.intendedCheckout)) {
    classes.push('shared_checkout_drift');
  }
  if (
    input.sourceRootMatchesIntended === false ||
    checkoutIsStaleOrDiverged(input.sourceCheckout) ||
    (!input.intendedCheckout && checkoutHasPostureDrift(input.sourceCheckout))
  ) {
    classes.push('supervised_source_root_drift');
  }
  if (input.entrypointKind === 'dist' && input.sourceEntryExists === true) {
    classes.push('source_vs_dist_drift');
  }
  if (input.packageRootMatchesIntended === false || input.commandPathInsidePackage === false) {
    classes.push('global_binary_package_provenance_drift');
  }
  return [...new Set(classes)];
}

function resolveFreshnessStatus(input: {
  sourceRootRealpath: string | null;
  sourceCheckout: SourceRootCheckoutFreshness | null;
  driftClasses: SourceRootDriftClass[];
}): SourceRootFreshnessStatus {
  if (!input.sourceRootRealpath || !input.sourceCheckout) {
    return 'unavailable';
  }
  if (input.sourceCheckout.status === 'unavailable') {
    return 'unavailable';
  }
  return input.driftClasses.length > 0 ? 'warning' : 'current';
}

function checkoutHasPostureDrift(checkout: SourceRootCheckoutFreshness | null): boolean {
  if (!checkout) {
    return false;
  }
  return (
    checkout.status === 'stale' ||
    checkout.status === 'ahead' ||
    checkout.status === 'diverged' ||
    checkout.dirty.status === 'dirty'
  );
}

function checkoutIsStaleOrDiverged(checkout: SourceRootCheckoutFreshness | null): boolean {
  return checkout?.status === 'stale' || checkout?.status === 'diverged';
}

function summarizeCheckout(checkout: CheckoutPostureInspection): SourceRootCheckoutFreshness {
  return {
    status: checkout.status,
    repo_root: checkout.repo_root,
    inside_git_worktree: checkout.inside_git_worktree,
    base_ref: checkout.base_ref,
    ahead: checkout.ahead,
    behind: checkout.behind,
    dirty: checkout.dirty,
    head: checkout.head,
    upstream: checkout.upstream,
    detail: checkout.detail
  };
}

function classifyEntrypointKind(
  commandPath: string | null,
  commandPathRealpath: string | null,
  sourceRootRealpath: string | null,
  sourceEntryExists: boolean | null
): SourceRootEntrypointKind {
  const candidates = [commandPathRealpath, commandPath].filter((entry): entry is string => Boolean(entry));
  for (const candidate of candidates) {
    const normalized = normalize(candidate);
    if (normalized.endsWith(join('bin', 'codex-orchestrator.ts'))) {
      return 'source';
    }
    if (normalized.endsWith(join('dist', 'bin', 'codex-orchestrator.js'))) {
      return 'dist';
    }
  }
  if (sourceRootRealpath && sourceEntryExists === true) {
    for (const candidate of candidates) {
      if (normalize(candidate) === join(sourceRootRealpath, 'bin', 'codex-orchestrator.js')) {
        return 'bootstrap';
      }
    }
  }
  return 'unknown';
}

function resolvePackageRootFromCommandPath(commandPath: string | null): string | null {
  if (!commandPath) {
    return null;
  }
  const normalized = normalize(commandPath);
  const commandDir = dirname(normalized);
  const parentDir = dirname(commandDir);
  if (basename(commandDir) === 'bin') {
    if (basename(parentDir) === 'dist') {
      const packageRoot = dirname(parentDir);
      return isCodexOrchestratorPackageRoot(packageRoot) ? packageRoot : null;
    }
    return isCodexOrchestratorPackageRoot(parentDir) ? parentDir : null;
  }
  return null;
}

function findPackageJsonRoot(commandPath: string | null): string | null {
  if (!commandPath) {
    return null;
  }
  let current = dirname(commandPath);
  for (;;) {
    const packageJsonPath = join(current, 'package.json');
    if (existsSync(packageJsonPath) && packageJsonLooksLikeCodexOrchestrator(packageJsonPath)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function packageJsonLooksLikeCodexOrchestrator(packageJsonPath: string): boolean {
  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: unknown };
    return parsed.name === '@kbediako/codex-orchestrator' || parsed.name === 'codex-orchestrator';
  } catch {
    return false;
  }
}

function isCodexOrchestratorPackageRoot(root: string): boolean {
  return packageJsonLooksLikeCodexOrchestrator(join(root, 'package.json'));
}

function resolveCandidatePath(path: string | null, cwd: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  return resolve(cwd ?? process.cwd(), path);
}

function normalizeCommandPathFromArgv(argv: string[] | null | undefined): { path: string; source: 'argv' } | null {
  if (!Array.isArray(argv)) {
    return null;
  }
  const candidate = argv.find((entry, index) =>
    index > 0 &&
    typeof entry === 'string' &&
    /(?:^|[/\\])(?:codex-orchestrator|codex-orch)(?:\.(?:js|ts))?$/u.test(entry)
  );
  return candidate ? { path: candidate, source: 'argv' } : null;
}

function realpathIfAvailable(path: string | null): string | null {
  if (!path) {
    return null;
  }
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

function comparePaths(left: string | null, right: string | null): boolean | null {
  if (!left || !right) {
    return null;
  }
  return normalize(left) === normalize(right);
}

function pathIsInside(child: string | null, parent: string | null): boolean | null {
  if (!child || !parent) {
    return null;
  }
  const normalizedChild = normalize(child);
  const normalizedParent = normalize(parent);
  const normalizedParentPrefix = normalizedParent.endsWith(sep)
    ? normalizedParent
    : `${normalizedParent}${sep}`;
  return normalizedChild === normalizedParent || normalizedChild.startsWith(normalizedParentPrefix);
}

function buildSourceRootGuidance(
  driftClasses: SourceRootDriftClass[],
  status: SourceRootFreshnessStatus
): string[] {
  if (status === 'current') {
    return ['Supervised command, package root, and source checkout match the intended repo root for the local origin/main ref.'];
  }
  const guidance: string[] = [
    'Status reads only inspect local paths and git refs; they do not fetch, relink global packages, rebuild dist, or mutate checkouts.'
  ];
  if (driftClasses.includes('supervised_source_root_drift')) {
    guidance.push('Restart or relaunch the supervised control-host from the intended current source root before trusting provider-worker posture.');
  }
  if (driftClasses.includes('source_vs_dist_drift')) {
    guidance.push('The process is using dist while a source entrypoint exists; rebuild dist or restore the source loader before relying on fresh TypeScript changes.');
  }
  if (driftClasses.includes('global_binary_package_provenance_drift')) {
    guidance.push('Check the global package/binary link target against the intended repository root before starting long-running control-host work.');
  }
  if (driftClasses.includes('shared_checkout_drift')) {
    guidance.push('Resolve shared checkout posture separately from supervised source-root freshness.');
  }
  return guidance;
}

function buildSourceRootDetail(
  driftClasses: SourceRootDriftClass[],
  status: SourceRootFreshnessStatus
): string {
  if (status === 'current') {
    return 'The supervised source root matches the intended repository root and is current against local origin/main.';
  }
  if (status === 'unavailable') {
    return 'Source-root freshness is unavailable because command/package/source root provenance could not be resolved to a readable checkout.';
  }
  return `Detected source/root drift: ${driftClasses.join(', ')}.`;
}

function normalizeFreshnessStatus(value: unknown): SourceRootFreshnessStatus | null {
  return value === 'current' || value === 'warning' || value === 'unavailable' ? value : null;
}

function normalizeEntrypointKind(value: unknown): SourceRootEntrypointKind | null {
  return value === 'source' || value === 'dist' || value === 'bootstrap' || value === 'unknown' ? value : null;
}

function normalizeDriftClass(value: unknown): SourceRootDriftClass | null {
  return value === 'shared_checkout_drift' ||
    value === 'supervised_source_root_drift' ||
    value === 'source_vs_dist_drift' ||
    value === 'global_binary_package_provenance_drift'
    ? value
    : null;
}

function normalizeCommandPathSource(
  value: unknown
): SourceRootFreshnessInspection['provenance']['command_path_source'] {
  return value === 'explicit' || value === 'argv' || value === 'unresolved' ? value : 'unresolved';
}

function normalizePackageRootSource(
  value: unknown
): SourceRootFreshnessInspection['provenance']['package_root_source'] {
  return value === 'explicit' || value === 'command_path' || value === 'package_json' || value === 'unresolved'
    ? value
    : 'unresolved';
}

function normalizeSourceRootSource(
  value: unknown
): SourceRootFreshnessInspection['provenance']['source_root_source'] {
  return value === 'package_root' || value === 'command_path' || value === 'unresolved' ? value : 'unresolved';
}

function normalizeCheckoutFreshness(value: unknown): SourceRootCheckoutFreshness | null {
  if (!isRecordLike(value)) {
    return null;
  }
  const status =
    value.status === 'current' ||
    value.status === 'stale' ||
    value.status === 'ahead' ||
    value.status === 'diverged' ||
    value.status === 'unavailable'
      ? value.status
      : null;
  if (!status || typeof value.repo_root !== 'string') {
    return null;
  }
  return {
    status,
    repo_root: value.repo_root,
    inside_git_worktree: value.inside_git_worktree === true,
    base_ref: 'origin/main',
    ahead: finiteNumberOrNull(value.ahead),
    behind: finiteNumberOrNull(value.behind),
    dirty: normalizeDirty(value.dirty),
    head: normalizeCommit(value.head),
    upstream: normalizeCommit(value.upstream),
    detail: typeof value.detail === 'string' ? value.detail : ''
  };
}

function normalizeDirty(value: unknown): SourceRootCheckoutFreshness['dirty'] {
  if (!isRecordLike(value)) {
    return {
      status: 'unknown',
      changed_paths: null,
      detail: 'dirty state unavailable'
    };
  }
  return {
    status:
      value.status === 'clean' || value.status === 'dirty' || value.status === 'unknown'
        ? value.status
        : 'unknown',
    changed_paths: finiteNumberOrNull(value.changed_paths),
    detail: typeof value.detail === 'string' ? value.detail : 'dirty state unavailable'
  };
}

function normalizeCommit(value: unknown): CheckoutPostureCommit | null {
  if (
    !isRecordLike(value) ||
    typeof value.hash !== 'string' ||
    typeof value.short_hash !== 'string' ||
    typeof value.committed_date !== 'string' ||
    typeof value.subject !== 'string'
  ) {
    return null;
  }
  return {
    hash: value.hash,
    short_hash: value.short_hash,
    committed_date: value.committed_date,
    subject: value.subject
  };
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeOptionalPath(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? resolve(normalized) : null;
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatComparison(checkout: SourceRootCheckoutFreshness): string {
  if (checkout.ahead === null || checkout.behind === null) {
    return checkout.detail;
  }
  return `HEAD is ${checkout.ahead} ahead, ${checkout.behind} behind ${checkout.base_ref}`;
}

function formatCommit(commit: CheckoutPostureCommit): string {
  return `${commit.short_hash} ${commit.committed_date} ${commit.subject}`;
}
