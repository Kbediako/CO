import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import {
  buildSpecGuardScriptCandidates,
  resolveSpecGuardScriptPath
} from '../src/cli/utils/specGuardRunner.js';

describe('spec guard script resolution', () => {
  it('prefers repo-local script over package-local fallback', () => {
    const repoRoot = '/repo';
    const packageRoot = '/package';
    const repoScript = join(repoRoot, 'scripts', 'spec-guard.mjs');
    const packageScript = join(packageRoot, 'scripts', 'spec-guard.mjs');
    const exists = (path: string) => path === repoScript || path === packageScript;

    expect(resolveSpecGuardScriptPath(repoRoot, packageRoot, exists)).toBe(repoScript);
  });

  it('falls back to package-local script when repo-local script is missing', () => {
    const repoRoot = '/repo';
    const packageRoot = '/package';
    const packageScript = join(packageRoot, 'scripts', 'spec-guard.mjs');
    const exists = (path: string) => path === packageScript;

    expect(resolveSpecGuardScriptPath(repoRoot, packageRoot, exists)).toBe(packageScript);
  });

  it('returns null when no script exists in either location', () => {
    expect(resolveSpecGuardScriptPath('/repo', '/package', () => false)).toBeNull();
  });

  it('deduplicates candidate paths when repoRoot and packageRoot are the same', () => {
    const root = '/shared';
    const candidates = buildSpecGuardScriptCandidates(root, root);
    expect(candidates).toEqual([join(root, 'scripts', 'spec-guard.mjs')]);
  });
});
