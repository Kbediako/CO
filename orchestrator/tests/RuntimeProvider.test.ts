import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { resolveRuntimeMode } from '../src/cli/runtime/mode.js';
import { resolveRuntimeSelection } from '../src/cli/runtime/provider.js';

describe('runtime mode resolution', () => {
  it('resolves precedence as flag > env > config > manifest > default', () => {
    const env = { CODEX_ORCHESTRATOR_RUNTIME_MODE: 'appserver' } as NodeJS.ProcessEnv;
    const blankEnv = { CODEX_ORCHESTRATOR_RUNTIME_MODE: '' } as NodeJS.ProcessEnv;

    expect(
      resolveRuntimeMode({
        flag: 'cli',
        env,
        configDefault: 'appserver',
        manifestMode: 'appserver',
        preferManifest: true
      })
    ).toEqual({ mode: 'cli', source: 'flag' });

    expect(
      resolveRuntimeMode({
        env,
        configDefault: 'cli',
        manifestMode: 'cli',
        preferManifest: true
      })
    ).toEqual({ mode: 'appserver', source: 'env' });

    expect(
      resolveRuntimeMode({
        env: blankEnv,
        configDefault: 'appserver',
        manifestMode: 'cli',
        preferManifest: true
      })
    ).toEqual({ mode: 'appserver', source: 'config' });

    expect(
      resolveRuntimeMode({
        env: blankEnv,
        configDefault: null,
        manifestMode: 'appserver',
        preferManifest: true
      })
    ).toEqual({ mode: 'appserver', source: 'manifest' });

    expect(
      resolveRuntimeMode({
        env: blankEnv,
        configDefault: null,
        manifestMode: null,
        preferManifest: true
      })
    ).toEqual({
      mode: 'appserver',
      source: 'default'
    });
  });

  it('ignores ambient process env when an explicit env object is provided', () => {
    const previousRuntimeMode = process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE;
    process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE = 'appserver';

    try {
      expect(
        resolveRuntimeMode({
          env: {},
          configDefault: 'cli',
          manifestMode: 'appserver',
          preferManifest: true
        })
      ).toEqual({ mode: 'cli', source: 'config' });
    } finally {
      if (previousRuntimeMode === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE;
      } else {
        process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE = previousRuntimeMode;
      }
    }
  });
});

describe('runtime provider selection', () => {
  it('keeps cli mode unchanged', async () => {
    const selection = await resolveRuntimeSelection({
      requestedMode: 'cli',
      source: 'flag',
      executionMode: 'mcp',
      repoRoot: process.cwd(),
      env: {},
      runId: 'runtime-cli'
    });

    expect(selection.selected_mode).toBe('cli');
    expect(selection.provider).toBe('CliRuntimeProvider');
    expect(selection.fallback.occurred).toBe(false);
  });

  it('falls back from appserver to cli when forced preflight failure is set', async () => {
    const selection = await resolveRuntimeSelection({
      requestedMode: 'appserver',
      source: 'env',
      executionMode: 'mcp',
      repoRoot: process.cwd(),
      env: {
        CODEX_ORCHESTRATOR_APPSERVER_FORCE_PRECHECK_FAIL: '1'
      },
      runId: 'runtime-fallback'
    });

    expect(selection.requested_mode).toBe('appserver');
    expect(selection.selected_mode).toBe('cli');
    expect(selection.provider).toBe('CliRuntimeProvider');
    expect(selection.fallback.occurred).toBe(true);
    expect(selection.fallback.code).toBe('forced-preflight-failure');
  });

  it('reports codex command unavailability truthfully when the configured binary is missing', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'runtime-provider-missing-bin-'));
    try {
      const selection = await resolveRuntimeSelection({
        requestedMode: 'appserver',
        source: 'env',
        executionMode: 'mcp',
        repoRoot: process.cwd(),
        env: {
          CODEX_CLI_BIN: join(tempRoot, 'codex-missing-for-runtime-provider-test')
        },
        runId: 'runtime-missing-codex-bin'
      });

      expect(selection.requested_mode).toBe('appserver');
      expect(selection.selected_mode).toBe('cli');
      expect(selection.provider).toBe('CliRuntimeProvider');
      expect(selection.fallback.occurred).toBe(true);
      expect(selection.fallback.code).toBe('codex-command-unavailable');
      expect(selection.fallback.reason).toContain('Codex CLI executable');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('reports missing repo roots truthfully when appserver probes cannot enter the workspace', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'runtime-provider-missing-root-'));
    const missingRepoRoot = join(tempRoot, 'deleted-worktree');
    try {
      await rm(tempRoot, { recursive: true, force: true });

      const selection = await resolveRuntimeSelection({
        requestedMode: 'appserver',
        source: 'env',
        executionMode: 'mcp',
        repoRoot: missingRepoRoot,
        env: {
          CODEX_CLI_BIN: process.execPath
        },
        runId: 'runtime-missing-repo-root'
      });

      expect(selection.requested_mode).toBe('appserver');
      expect(selection.selected_mode).toBe('cli');
      expect(selection.provider).toBe('CliRuntimeProvider');
      expect(selection.fallback.occurred).toBe(true);
      expect(selection.fallback.code).toBe('runtime-workspace-unavailable');
      expect(selection.fallback.reason).toContain('repo root is unavailable');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails fast for unsupported cloud+appserver mode', async () => {
    await expect(
      resolveRuntimeSelection({
        requestedMode: 'appserver',
        source: 'flag',
        executionMode: 'cloud',
        repoRoot: process.cwd(),
        env: {},
        runId: 'runtime-unsupported'
      })
    ).rejects.toThrow(/Unsupported mode combination/);
  });

  it('coerces implicit default appserver mode to cli for cloud execution', async () => {
    const selection = await resolveRuntimeSelection({
      requestedMode: 'appserver',
      source: 'default',
      executionMode: 'cloud',
      repoRoot: process.cwd(),
      env: {},
      runId: 'runtime-cloud-default'
    });

    expect(selection.requested_mode).toBe('cli');
    expect(selection.selected_mode).toBe('cli');
    expect(selection.provider).toBe('CliRuntimeProvider');
    expect(selection.fallback.occurred).toBe(false);
  });

  it('coerces manifest-derived appserver mode to cli for cloud execution', async () => {
    const selection = await resolveRuntimeSelection({
      requestedMode: 'appserver',
      source: 'manifest',
      executionMode: 'cloud',
      repoRoot: process.cwd(),
      env: {},
      runId: 'runtime-cloud-manifest'
    });

    expect(selection.requested_mode).toBe('cli');
    expect(selection.selected_mode).toBe('cli');
    expect(selection.provider).toBe('CliRuntimeProvider');
    expect(selection.fallback.occurred).toBe(false);
  });
});
