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
  trackedFreshnessTokens: ReadonlyMap<string, number | null>;
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
    const { closure, newestClosureFreshnessToken } = await getDependencyClosureCached(sourceEntry);
    if (closure.hasUnresolvedTrackedDependency) {
      return false;
    }
    return getFreshnessToken(distStats) >= newestClosureFreshnessToken;
  } catch {
    return false;
  }
}

async function getDependencyClosureCached(sourceEntry: string): Promise<CachedDependencyClosure> {
  const cacheKey = resolve(sourceEntry);
  const cached = dependencyClosureCache.get(cacheKey);
  if (!cached) {
    return await refreshDependencyClosure(cacheKey);
  }
  const cachedClosure = await cached;
  if (await trackedFilesChanged(cachedClosure.trackedFreshnessTokens)) {
    return await refreshDependencyClosure(cacheKey);
  }
  return cachedClosure;
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

  const trackedFreshnessTokens = await readTrackedFreshnessTokens(trackedPaths);
  return {
    closure: { files, hasUnresolvedTrackedDependency },
    newestClosureFreshnessToken: getNewestClosureFreshnessToken(files, trackedFreshnessTokens),
    trackedFreshnessTokens
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
  trackedFreshnessTokens: ReadonlyMap<string, number | null>
): number {
  let newestFreshnessToken = 0;
  for (const file of files) {
    const freshnessToken = trackedFreshnessTokens.get(file);
    if (freshnessToken === null || freshnessToken === undefined) {
      throw new Error(`Missing freshness token for tracked dependency: ${file}`);
    }
    newestFreshnessToken = Math.max(newestFreshnessToken, freshnessToken);
  }
  return newestFreshnessToken;
}

async function readTrackedFreshnessTokens(
  files: Iterable<string>
): Promise<ReadonlyMap<string, number | null>> {
  const trackedFiles = [...files];
  const freshnessTokens = await Promise.all(trackedFiles.map(async (file) => await readFreshnessToken(file)));
  return new Map(trackedFiles.map((file, index) => [file, freshnessTokens[index]]));
}

async function trackedFilesChanged(
  trackedFreshnessTokens: ReadonlyMap<string, number | null>
): Promise<boolean> {
  const trackedFiles = [...trackedFreshnessTokens.keys()];
  const currentFreshnessTokens = await Promise.all(
    trackedFiles.map(async (file) => await readFreshnessToken(file))
  );

  return trackedFiles.some((file, index) => {
    return currentFreshnessTokens[index] !== trackedFreshnessTokens.get(file);
  });
}

function getFreshnessToken(stats: { ctimeMs: number; mtimeMs: number }): number {
  return Math.max(stats.mtimeMs, stats.ctimeMs);
}

async function readFreshnessToken(file: string): Promise<number | null> {
  try {
    return getFreshnessToken(await stat(file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
