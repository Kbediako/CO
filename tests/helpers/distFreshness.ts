import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';

import * as ts from 'typescript';

type DependencyClosure = {
  files: ReadonlySet<string>;
  hasUnresolvedTrackedDependency: boolean;
};

type CachedDependencyClosure = {
  closure: DependencyClosure;
  newestClosureFreshnessToken: number;
  trackedFileStates: ReadonlyMap<string, TrackedFileState>;
};

type DependencyClosureLookup = {
  cachedClosure: CachedDependencyClosure;
  newestTrackedAppearanceToken: number | null;
};

type TrackedFileState = {
  freshnessToken: number | null;
  changeToken: number | null;
};

type TrackedChangeSetEntry = {
  previousState: TrackedFileState;
  currentState: TrackedFileState;
};

const SOURCE_EXTENSION_PRIORITY = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs'
] as const;

const dependencyClosureCache = new Map<string, Promise<CachedDependencyClosure>>();

export async function shouldUseFreshDist(sourceEntry: string, distEntry: string): Promise<boolean> {
  let distStats;
  try {
    distStats = await stat(distEntry);
  } catch {
    return false;
  }

  try {
    await stat(sourceEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return true;
    }
    return false;
  }

  try {
    const { cachedClosure, newestTrackedAppearanceToken } = await getDependencyClosureCached(sourceEntry);
    const { closure, newestClosureFreshnessToken } = cachedClosure;
    if (closure.hasUnresolvedTrackedDependency) {
      return false;
    }
    if (
      newestTrackedAppearanceToken !== null &&
      getChangeToken(distStats) < newestTrackedAppearanceToken
    ) {
      return false;
    }
    return getFreshnessToken(distStats) >= newestClosureFreshnessToken;
  } catch {
    return false;
  }
}

async function getDependencyClosureCached(sourceEntry: string): Promise<DependencyClosureLookup> {
  const cacheKey = resolve(sourceEntry);
  const cached = dependencyClosureCache.get(cacheKey);
  if (!cached) {
    return {
      cachedClosure: await refreshDependencyClosure(cacheKey),
      newestTrackedAppearanceToken: null
    };
  }
  const cachedClosure = await cached;
  const trackedChangeSet = await getTrackedChangeSet(cachedClosure.trackedFileStates);
  if (trackedChangeSet === null) {
    return { cachedClosure, newestTrackedAppearanceToken: null };
  }

  const refreshedClosure = await refreshDependencyClosure(cacheKey);
  const newestTrackedAppearanceToken = closureChanged(cachedClosure, refreshedClosure)
    ? getNewestTrackedAppearanceToken(trackedChangeSet)
    : null;
  return {
    cachedClosure: refreshedClosure,
    newestTrackedAppearanceToken
  };
}

function refreshDependencyClosure(sourceEntry: string): Promise<CachedDependencyClosure> {
  const refreshed = discoverDependencyClosure(sourceEntry).catch((error) => {
    dependencyClosureCache.delete(sourceEntry);
    throw error;
  });
  dependencyClosureCache.set(sourceEntry, refreshed);
  return refreshed;
}

async function discoverDependencyClosure(sourceEntry: string): Promise<CachedDependencyClosure> {
  const files = new Set<string>();
  const trackedPaths = new Set<string>();
  let hasUnresolvedTrackedDependency = false;
  const pending = [sourceEntry];

  while (pending.length > 0) {
    const currentFile = pending.pop();
    if (!currentFile || files.has(currentFile)) {
      continue;
    }
    files.add(currentFile);
    trackedPaths.add(currentFile);

    const sourceText = await readFile(currentFile, 'utf8');
    for (const specifier of collectRelativeRuntimeSpecifiers(currentFile, sourceText)) {
      const { resolvedDependency, trackedCandidates } = await resolveRelativeSourceDependency(
        currentFile,
        specifier
      );
      for (const candidate of trackedCandidates) {
        trackedPaths.add(candidate);
      }
      if (!resolvedDependency) {
        hasUnresolvedTrackedDependency = true;
        continue;
      }
      if (!files.has(resolvedDependency)) {
        pending.push(resolvedDependency);
      }
    }
  }

  const trackedFileStates = await readTrackedFileStates(trackedPaths);
  return {
    closure: { files, hasUnresolvedTrackedDependency },
    newestClosureFreshnessToken: getNewestClosureFreshnessToken(files, trackedFileStates),
    trackedFileStates
  };
}

function collectRelativeRuntimeSpecifiers(filePath: string, sourceText: string): string[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const specifiers = new Set<string>();

  const addSpecifier = (value: string | null | undefined): void => {
    if (!value) {
      return;
    }
    if (value.startsWith('./') || value.startsWith('../')) {
      specifiers.add(value);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      if (!isTypeOnlyImport(node)) {
        addSpecifier(getModuleSpecifierText(node.moduleSpecifier));
      }
    } else if (ts.isExportDeclaration(node)) {
      if (!isTypeOnlyExport(node)) {
        addSpecifier(getModuleSpecifierText(node.moduleSpecifier));
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (!node.isTypeOnly && ts.isExternalModuleReference(node.moduleReference)) {
        addSpecifier(getModuleSpecifierText(node.moduleReference.expression));
      }
    } else if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
        addSpecifier(getCallSpecifier(node));
      } else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addSpecifier(getCallSpecifier(node));
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return [...specifiers];
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) {
    return false;
  }
  if (clause.isTypeOnly) {
    return true;
  }
  if (clause.name) {
    return false;
  }
  const bindings = clause.namedBindings;
  if (!bindings) {
    return false;
  }
  if (ts.isNamespaceImport(bindings)) {
    return false;
  }
  return bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly);
}

function isTypeOnlyExport(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) {
    return true;
  }
  const clause = node.exportClause;
  if (!clause) {
    return false;
  }
  if (ts.isNamespaceExport(clause)) {
    return false;
  }
  return clause.elements.length > 0 && clause.elements.every((element) => element.isTypeOnly);
}

function getModuleSpecifierText(node: ts.Expression | undefined): string | null {
  return node && ts.isStringLiteralLike(node) ? node.text : null;
}

function getCallSpecifier(node: ts.CallExpression): string | null {
  if (node.arguments.length !== 1) {
    return null;
  }
  const [argument] = node.arguments;
  return ts.isStringLiteralLike(argument) ? argument.text : null;
}

async function resolveRelativeSourceDependency(
  fromFile: string,
  specifier: string
): Promise<{ resolvedDependency: string | null; trackedCandidates: string[] }> {
  const candidateBase = resolve(dirname(fromFile), specifier);
  const candidates = buildResolutionCandidates(candidateBase);
  for (const [index, candidate] of candidates.entries()) {
    try {
      const candidateStats = await stat(candidate);
      if (candidateStats.isFile()) {
        return {
          resolvedDependency: candidate,
          trackedCandidates: candidates.slice(0, index + 1)
        };
      }
    } catch {
      continue;
    }
  }
  return { resolvedDependency: null, trackedCandidates: candidates };
}

function buildResolutionCandidates(candidateBase: string): string[] {
  const candidates = new Set<string>();
  const extension = extname(candidateBase);
  if (extension.length > 0) {
    const stem = candidateBase.slice(0, -extension.length);
    candidates.add(candidateBase);
    for (const sourceExtension of SOURCE_EXTENSION_PRIORITY) {
      candidates.add(`${stem}${sourceExtension}`);
    }
    return [...candidates];
  }

  for (const sourceExtension of SOURCE_EXTENSION_PRIORITY) {
    candidates.add(`${candidateBase}${sourceExtension}`);
    candidates.add(join(candidateBase, `index${sourceExtension}`));
  }
  return [...candidates];
}

function getNewestClosureFreshnessToken(
  files: Iterable<string>,
  trackedFileStates: ReadonlyMap<string, TrackedFileState>
): number {
  let newestFreshnessToken = 0;
  for (const file of files) {
    const freshnessToken = trackedFileStates.get(file)?.freshnessToken;
    if (freshnessToken === null || freshnessToken === undefined) {
      throw new Error(`Missing freshness token for tracked dependency: ${file}`);
    }
    newestFreshnessToken = Math.max(newestFreshnessToken, freshnessToken);
  }
  return newestFreshnessToken;
}

async function readTrackedFileStates(
  files: Iterable<string>
): Promise<ReadonlyMap<string, TrackedFileState>> {
  const trackedFiles = [...files];
  const trackedFileStates = await Promise.all(
    trackedFiles.map(async (file) => await readTrackedFileState(file))
  );
  return new Map(trackedFiles.map((file, index) => [file, trackedFileStates[index]]));
}

async function getTrackedChangeSet(
  trackedFileStates: ReadonlyMap<string, TrackedFileState>
): Promise<ReadonlyMap<string, TrackedChangeSetEntry> | null> {
  const trackedFiles = [...trackedFileStates.keys()];
  const currentTrackedFileStates = await Promise.all(
    trackedFiles.map(async (file) => await readTrackedFileState(file))
  );

  const changedTrackedFiles = new Map<string, TrackedChangeSetEntry>();
  for (const [index, file] of trackedFiles.entries()) {
    const previousState = trackedFileStates.get(file);
    const currentState = currentTrackedFileStates[index];
    if (
      previousState?.freshnessToken !== currentState.freshnessToken ||
      previousState.changeToken !== currentState.changeToken
    ) {
      changedTrackedFiles.set(file, {
        previousState: previousState ?? { freshnessToken: null, changeToken: null },
        currentState
      });
    }
  }

  return changedTrackedFiles.size > 0 ? changedTrackedFiles : null;
}

function getFreshnessToken(stats: { ctimeMs: number; mtimeMs: number }): number {
  return stats.mtimeMs;
}

function getChangeToken(stats: { ctimeMs: number; mtimeMs: number }): number {
  return Math.max(stats.mtimeMs, stats.ctimeMs);
}

function closureChanged(previous: CachedDependencyClosure, current: CachedDependencyClosure): boolean {
  if (previous.closure.hasUnresolvedTrackedDependency !== current.closure.hasUnresolvedTrackedDependency) {
    return true;
  }

  if (previous.closure.files.size !== current.closure.files.size) {
    return true;
  }

  for (const file of previous.closure.files) {
    if (!current.closure.files.has(file)) {
      return true;
    }
  }

  return false;
}

function getNewestTrackedAppearanceToken(
  trackedChangeSet: ReadonlyMap<string, TrackedChangeSetEntry>
): number | null {
  let newestTrackedAppearanceToken: number | null = null;
  for (const { previousState, currentState } of trackedChangeSet.values()) {
    if (previousState.freshnessToken !== null || currentState.changeToken === null) {
      continue;
    }
    newestTrackedAppearanceToken = Math.max(newestTrackedAppearanceToken ?? 0, currentState.changeToken);
  }
  return newestTrackedAppearanceToken;
}

async function readTrackedFileState(file: string): Promise<TrackedFileState> {
  try {
    const stats = await stat(file);
    return {
      freshnessToken: getFreshnessToken(stats),
      changeToken: getChangeToken(stats)
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { freshnessToken: null, changeToken: null };
    }
    throw error;
  }
}
