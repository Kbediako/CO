import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

function splitNodePath(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function uniqueEntries(entries: string[]): string[] {
  return [...new Set(entries)];
}

function canonicalizeExistingPath(target: string): string {
  try {
    return realpathSync.native(target);
  } catch {
    try {
      return realpathSync(target);
    } catch {
      return path.resolve(target);
    }
  }
}

function isWithinAncestor(target: string, ancestor: string): boolean {
  const relative = path.relative(ancestor, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function detectRepoRoot(startDir: string): string | undefined {
  let current: string | undefined = path.resolve(startDir);

  while (current) {
    const gitPath = path.join(current, '.git');
    if (existsSync(gitPath)) {
      const stats = statSync(gitPath);
      if (stats.isDirectory()) {
        return current;
      }

      if (stats.isFile()) {
        const contents = readFileSync(gitPath, 'utf8');
        const match = contents.match(/^gitdir:\s*(.+)$/im);
        if (match?.[1]) {
          const resolvedGitDir = path.resolve(current, match[1].trim());
          const worktreeMarker = `${path.sep}.git${path.sep}worktrees${path.sep}`;
          const worktreeMarkerIndex = resolvedGitDir.indexOf(worktreeMarker);
          if (worktreeMarkerIndex !== -1) {
            const parentRepoRoot = resolvedGitDir.slice(0, worktreeMarkerIndex);
            return isWithinAncestor(
              canonicalizeExistingPath(current),
              canonicalizeExistingPath(parentRepoRoot)
            )
              ? parentRepoRoot
              : current;
          }
          if (path.basename(resolvedGitDir) === '.git') {
            const parentRepoRoot = path.dirname(resolvedGitDir);
            return isWithinAncestor(
              canonicalizeExistingPath(current),
              canonicalizeExistingPath(parentRepoRoot)
            )
              ? parentRepoRoot
              : current;
          }
        }
        return current;
      }
    }

    const parent = path.dirname(current);
    current = parent === current ? undefined : parent;
  }

  return undefined;
}

export function collectNodeModulePaths(startDir: string): string[] {
  const resolvedStartDir = path.resolve(startDir);
  const results: string[] = [path.join(resolvedStartDir, 'node_modules')];
  const repoRoot = detectRepoRoot(resolvedStartDir);
  if (!repoRoot) {
    return uniqueEntries(results);
  }
  const canonicalRepoRoot = canonicalizeExistingPath(repoRoot);
  let current: string | undefined = resolvedStartDir;

  while (current) {
    const candidate = path.join(current, 'node_modules');
    if (candidate !== results[0] && existsSync(candidate)) {
      results.push(candidate);
    }
    if (canonicalizeExistingPath(current) === canonicalRepoRoot) {
      break;
    }

    const parent = path.dirname(current);
    current = parent === current ? undefined : parent;
  }

  return uniqueEntries(results);
}

export function buildEnvOverrides(
  custom: Record<string, string> | undefined,
  startDirs: string | string[] = process.cwd()
): Record<string, string> {
  const overrides = { ...(custom ?? {}) };
  const existingNodePath = overrides.NODE_PATH ?? process.env.NODE_PATH;
  const searchRoots = Array.isArray(startDirs) ? startDirs : [startDirs];
  const mergedNodePath = uniqueEntries([
    ...splitNodePath(existingNodePath),
    ...searchRoots.flatMap((startDir) => collectNodeModulePaths(startDir))
  ]);

  if (mergedNodePath.length > 0) {
    overrides.NODE_PATH = mergedNodePath.join(path.delimiter);
  }

  return overrides;
}
