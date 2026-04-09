import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';

import * as ts from 'typescript';

type DependencyClosure = {
  files: ReadonlySet<string>;
  hasUnresolvedTrackedDependency: boolean;
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

const dependencyClosureCache = new Map<string, Promise<DependencyClosure>>();

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
    const closure = await getDependencyClosure(sourceEntry);
    if (closure.hasUnresolvedTrackedDependency) {
      return false;
    }
    const newestTrackedMtime = await getNewestTrackedMtime(closure.files);
    return distStats.mtimeMs >= newestTrackedMtime;
  } catch {
    return false;
  }
}

function getDependencyClosure(sourceEntry: string): Promise<DependencyClosure> {
  const cacheKey = resolve(sourceEntry);
  let cached = dependencyClosureCache.get(cacheKey);
  if (!cached) {
    cached = discoverDependencyClosure(cacheKey);
    dependencyClosureCache.set(cacheKey, cached);
  }
  return cached;
}

async function discoverDependencyClosure(sourceEntry: string): Promise<DependencyClosure> {
  const files = new Set<string>();
  let hasUnresolvedTrackedDependency = false;
  const pending = [sourceEntry];

  while (pending.length > 0) {
    const currentFile = pending.pop();
    if (!currentFile || files.has(currentFile)) {
      continue;
    }
    files.add(currentFile);

    const sourceText = await readFile(currentFile, 'utf8');
    for (const specifier of collectRelativeRuntimeSpecifiers(currentFile, sourceText)) {
      const resolvedDependency = await resolveRelativeSourceDependency(currentFile, specifier);
      if (!resolvedDependency) {
        hasUnresolvedTrackedDependency = true;
        continue;
      }
      if (!files.has(resolvedDependency)) {
        pending.push(resolvedDependency);
      }
    }
  }

  return { files, hasUnresolvedTrackedDependency };
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
): Promise<string | null> {
  const candidateBase = resolve(dirname(fromFile), specifier);
  for (const candidate of buildResolutionCandidates(candidateBase)) {
    try {
      const candidateStats = await stat(candidate);
      if (candidateStats.isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }
  return null;
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

async function getNewestTrackedMtime(files: Iterable<string>): Promise<number> {
  const trackedFiles = [...files];
  const stats = await Promise.all(trackedFiles.map((file) => stat(file)));
  return stats.reduce((newest, entry) => Math.max(newest, entry.mtimeMs), 0);
}
