import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { logger } from '../../logger.js';
import { resolveEnvironmentPaths } from '../../../../scripts/lib/run-manifests.js';
import { findPackageRoot } from './packageInfo.js';

const SPEC_GUARD_RELATIVE_PATH = join('scripts', 'spec-guard.mjs');

function normalizePath(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function resolvePackageRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = normalizePath(env.CODEX_ORCHESTRATOR_PACKAGE_ROOT);
  if (configured) {
    return configured;
  }
  try {
    return findPackageRoot();
  } catch {
    return process.cwd();
  }
}

export function buildSpecGuardScriptCandidates(
  repoRoot: string,
  packageRoot: string
): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const candidate of [
    join(repoRoot, SPEC_GUARD_RELATIVE_PATH),
    join(packageRoot, SPEC_GUARD_RELATIVE_PATH)
  ]) {
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    deduped.push(candidate);
  }
  return deduped;
}

export function resolveSpecGuardScriptPath(
  repoRoot: string,
  packageRoot: string,
  fileExists: (path: string) => boolean = existsSync
): string | null {
  const candidates = buildSpecGuardScriptCandidates(repoRoot, packageRoot);
  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function runSpecGuardRunner(argv: string[] = process.argv.slice(2)): Promise<void> {
  const { repoRoot } = resolveEnvironmentPaths();
  const packageRoot = resolvePackageRoot(process.env);
  const candidates = buildSpecGuardScriptCandidates(repoRoot, packageRoot);
  const specGuardPath = resolveSpecGuardScriptPath(repoRoot, packageRoot);

  if (!specGuardPath) {
    logger.warn(`[spec-guard] skipped: no guard script found (${candidates.join(', ')})`);
    process.exit(0);
    return;
  }

  const child = spawn(process.execPath, [specGuardPath, ...argv], {
    stdio: 'inherit'
  });

  child.on('error', (error) => {
    logger.error(`[spec-guard] failed: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (typeof code === 'number') {
      process.exit(code);
      return;
    }
    if (signal) {
      logger.error(`[spec-guard] exited with signal ${signal}`);
    }
    process.exit(1);
  });
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectExecution()) {
  void runSpecGuardRunner();
}
