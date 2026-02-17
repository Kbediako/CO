import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { logger } from '../../logger.js';
import { resolveEnvironmentPaths } from '../../../../scripts/lib/run-manifests.js';
import { findPackageRoot } from './packageInfo.js';

export type GuardProfile = 'strict' | 'warn' | 'auto';
export type EffectiveGuardProfile = 'strict' | 'warn';

const DEFAULT_PROFILE: GuardProfile = 'auto';
const REPO_STRICT_MARKERS = ['AGENTS.md', join('tasks', 'index.json'), join('docs', 'TASKS.md')];
const DELEGATION_GUARD_RELATIVE_PATH = join('scripts', 'delegation-guard.mjs');

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

export function parseGuardProfile(raw: string | undefined | null): GuardProfile {
  const normalized = String(raw ?? '').trim().toLowerCase();
  if (normalized === 'strict' || normalized === 'warn' || normalized === 'auto') {
    return normalized;
  }
  return DEFAULT_PROFILE;
}

export function hasRepoStrictMarkers(
  repoRoot: string,
  fileExists: (path: string) => boolean = existsSync
): boolean {
  return REPO_STRICT_MARKERS.every((marker) => fileExists(join(repoRoot, marker)));
}

export function resolveEffectiveGuardProfile(
  repoRoot: string,
  env: NodeJS.ProcessEnv = process.env,
  fileExists: (path: string) => boolean = existsSync
): EffectiveGuardProfile {
  const requested = parseGuardProfile(
    env.CODEX_ORCHESTRATOR_GUARD_PROFILE ?? env.CODEX_GUARD_PROFILE
  );
  if (requested === 'strict' || requested === 'warn') {
    return requested;
  }
  return hasRepoStrictMarkers(repoRoot, fileExists) ? 'strict' : 'warn';
}

export function buildDelegationGuardEnv(
  env: NodeJS.ProcessEnv,
  profile: EffectiveGuardProfile
): NodeJS.ProcessEnv {
  const taskId = (env.MCP_RUNNER_TASK_ID ?? '').trim();
  const existingOverride = (env.DELEGATION_GUARD_OVERRIDE_REASON ?? '').trim();
  if (profile !== 'warn' || taskId || existingOverride) {
    return { ...env };
  }
  return {
    ...env,
    DELEGATION_GUARD_OVERRIDE_REASON:
      'No MCP_RUNNER_TASK_ID provided (warn profile): delegation evidence check bypassed.'
  };
}

export function buildDelegationGuardScriptCandidates(
  repoRoot: string,
  packageRoot: string
): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const candidate of [
    join(repoRoot, DELEGATION_GUARD_RELATIVE_PATH),
    join(packageRoot, DELEGATION_GUARD_RELATIVE_PATH)
  ]) {
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    deduped.push(candidate);
  }
  return deduped;
}

export function resolveDelegationGuardScriptPath(
  repoRoot: string,
  packageRoot: string,
  fileExists: (path: string) => boolean = existsSync
): string | null {
  const candidates = buildDelegationGuardScriptCandidates(repoRoot, packageRoot);
  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function runDelegationGuardRunner(argv: string[] = process.argv.slice(2)): Promise<void> {
  const { repoRoot } = resolveEnvironmentPaths();
  const packageRoot = resolvePackageRoot(process.env);
  const candidates = buildDelegationGuardScriptCandidates(repoRoot, packageRoot);
  const guardPath = resolveDelegationGuardScriptPath(repoRoot, packageRoot);
  const profile = resolveEffectiveGuardProfile(repoRoot);

  if (!guardPath) {
    if (profile === 'strict') {
      logger.error(
        `[delegation-guard] failed: no guard script found (${candidates.join(', ')}) (strict profile)`
      );
      process.exit(1);
      return;
    }
    logger.warn(
      `[delegation-guard] skipped: no guard script found (${candidates.join(', ')}) (warn profile)`
    );
    process.exit(0);
    return;
  }

  const child = spawn(process.execPath, [guardPath, ...argv], {
    stdio: 'inherit',
    env: buildDelegationGuardEnv(process.env, profile)
  });

  child.on('error', (error) => {
    logger.error(`[delegation-guard] failed: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (typeof code === 'number') {
      process.exit(code);
      return;
    }
    if (signal) {
      logger.error(`[delegation-guard] exited with signal ${signal}`);
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
  void runDelegationGuardRunner();
}
