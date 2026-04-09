import { describe, expect, it } from 'vitest';

import {
  resolveCodexOrchestratorBootstrapInvocation,
  resolvePackageProgramInvocation
} from '../src/cli/utils/packageProgramResolver.js';

describe('packageProgramResolver', () => {
  it('ignores inherited package-root overrides that point at a different checkout', () => {
    const localRoot = '/tmp/local-checkout';
    const foreignRoot = '/tmp/foreign-checkout';
    const files = new Set([
      `${localRoot}/bin/codex-orchestrator.ts`,
      `${localRoot}/dist/bin/codex-orchestrator.js`,
      `${foreignRoot}/bin/codex-orchestrator.ts`,
      `${foreignRoot}/dist/bin/codex-orchestrator.js`
    ]);

    const invocation = resolveCodexOrchestratorBootstrapInvocation({
      env: {
        CODEX_ORCHESTRATOR_PACKAGE_ROOT: foreignRoot
      },
      packageRoot: localRoot,
      execPath: '/usr/bin/node',
      fileExists: (candidate) => files.has(candidate)
    });

    expect(invocation.packageRoot).toBe(localRoot);
    expect(invocation.mode).toBe('dist');
    expect(invocation.args).toEqual([`${localRoot}/dist/bin/codex-orchestrator.js`]);
    expect(invocation.warning).toContain(`${localRoot}/bin/codex-orchestrator.ts`);
    expect(invocation.warning).not.toContain(foreignRoot);
  });

  it('ignores ancestor package-root overrides for nested worktrees', () => {
    const localRoot = '/tmp/repo/.workspaces/issue-checkout';
    const ancestorRoots = ['/tmp/repo', '/tmp/repo/.workspaces'];
    const files = new Set([
      `${localRoot}/bin/codex-orchestrator.ts`,
      `${localRoot}/dist/bin/codex-orchestrator.js`
    ]);

    for (const ancestorRoot of ancestorRoots) {
      const invocation = resolveCodexOrchestratorBootstrapInvocation({
        env: {
          CODEX_ORCHESTRATOR_PACKAGE_ROOT: ancestorRoot
        },
        packageRoot: localRoot,
        execPath: '/usr/bin/node',
        fileExists: (candidate) => files.has(candidate)
      });

      expect(invocation.packageRoot).toBe(localRoot);
      expect(invocation.mode).toBe('dist');
      expect(invocation.args).toEqual([`${localRoot}/dist/bin/codex-orchestrator.js`]);
      expect(invocation.warning).toContain(`${localRoot}/bin/codex-orchestrator.ts`);
    }
  });

  it('allows explicit foreign package roots when the caller opts into that contract', () => {
    const localRoot = '/tmp/local-checkout';
    const foreignRoot = '/tmp/foreign-checkout';
    const files = new Set([
      `${foreignRoot}/dist/orchestrator/src/cli/frontendTestingRunner.js`
    ]);

    const invocation = resolvePackageProgramInvocation({
      allowConfiguredForeignPackageRoot: true,
      distRelativePath: 'orchestrator/src/cli/frontendTestingRunner.js',
      env: {
        CODEX_ORCHESTRATOR_PACKAGE_ROOT: foreignRoot
      },
      packageRoot: localRoot,
      execPath: '/usr/bin/node',
      fileExists: (candidate) => files.has(candidate)
    });

    expect(invocation.packageRoot).toBe(foreignRoot);
  });

  it('pins TS_NODE_PROJECT when source mode resolves a TypeScript entrypoint', () => {
    const localRoot = '/tmp/local-checkout';
    const files = new Set([`${localRoot}/orchestrator/src/cli/providerLinearWorkerRunner.ts`]);

    const invocation = resolvePackageProgramInvocation({
      distRelativePath: 'orchestrator/src/cli/providerLinearWorkerRunner.js',
      packageRoot: localRoot,
      execPath: '/usr/bin/node',
      fileExists: (candidate) => files.has(candidate),
      resolveModulePath: () => `${localRoot}/node_modules/ts-node/esm.mjs`
    });

    expect(invocation.mode).toBe('source');
    expect(invocation.envOverrides).toEqual({
      TS_NODE_PROJECT: `${localRoot}/tsconfig.json`
    });
  });
});
