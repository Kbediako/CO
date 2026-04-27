import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { resolveRuntimeMode } from '../src/cli/runtime/mode.js';
import {
  RuntimeSelectionFailure,
  resolveRuntimeSelection
} from '../src/cli/runtime/provider.js';

const APPSERVER_PREFLIGHT_EXPIRY = {
  owner: 'CO-396',
  introduced_date: '2026-02-27',
  review_date: '2026-05-10',
  maximum_lifetime: '2026-05-26'
};
const CLOUD_DEFAULT_APPSERVER_EXPIRY = {
  owner: 'CO-396',
  introduced_date: '2026-04-26',
  review_date: '2026-05-10',
  maximum_lifetime: '2026-05-26'
};

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
    expect(selection.fallback.policy).toBe('auto');
  });

  it('auto-reroutes from appserver to cli with machine-readable fallback evidence', async () => {
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
    expect(selection.fallback.policy).toBe('auto');
    expect(selection.fallback.code).toBe('forced-preflight-failure');
    expect(selection.fallback.original_target).toBe('runtime:appserver');
    expect(selection.fallback.fallback_target).toBe('runtime:cli');
    expect(selection.fallback.blocking_reason).toContain('Forced appserver preflight failure');
    expect(selection.fallback.expiry).toMatchObject(APPSERVER_PREFLIGHT_EXPIRY);
    expect(selection.fallback.expiry?.trigger).toContain('runtimeMode=appserver');
    expect(selection.fallback.expiry?.removal_condition).toContain('runtimeMode=cli');
  });

  it('strict mode fails closed when appserver preflight fails', async () => {
    try {
      await resolveRuntimeSelection({
        requestedMode: 'appserver',
        source: 'env',
        executionMode: 'mcp',
        repoRoot: process.cwd(),
        env: {
          CODEX_ORCHESTRATOR_RUNTIME_FALLBACK: 'strict',
          CODEX_ORCHESTRATOR_APPSERVER_FORCE_PRECHECK_FAIL: '1'
        },
        runId: 'runtime-strict-fallback'
      });
      throw new Error('Expected strict runtime fallback policy to fail closed');
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeSelectionFailure);
      expect((error as Error).message).toMatch(
        /Runtime fallback policy=strict original_target=runtime:appserver fallback_target=runtime:cli/
      );
      expect((error as RuntimeSelectionFailure).runtimeFallback).toMatchObject({
        occurred: false,
        policy: 'strict',
        policy_source: 'env',
        code: 'forced-preflight-failure',
        from_mode: 'appserver',
        to_mode: 'cli',
        original_target: 'runtime:appserver',
        fallback_target: 'runtime:cli'
      });
      expect((error as RuntimeSelectionFailure).runtimeFallback.expiry).toBeNull();
      expect((error as RuntimeSelectionFailure).runtimeFallback.blocking_reason).toContain(
        'Forced appserver preflight failure'
      );
    }
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
      expect(selection.fallback.policy).toBe('auto');
      expect(selection.fallback.code).toBe('codex-command-unavailable');
      expect(selection.fallback.reason).toContain('Codex CLI executable');
      expect(selection.fallback.expiry).toMatchObject(APPSERVER_PREFLIGHT_EXPIRY);
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
      expect(selection.fallback.policy).toBe('auto');
      expect(selection.fallback.code).toBe('runtime-workspace-unavailable');
      expect(selection.fallback.reason).toContain('repo root is unavailable');
      expect(selection.fallback.expiry).toMatchObject(APPSERVER_PREFLIGHT_EXPIRY);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails fast for unsupported cloud+appserver mode', async () => {
    try {
      await resolveRuntimeSelection({
        requestedMode: 'appserver',
        source: 'flag',
        executionMode: 'cloud',
        repoRoot: process.cwd(),
        env: {},
        runId: 'runtime-unsupported'
      });
      throw new Error('Expected explicit cloud appserver mode to fail closed');
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeSelectionFailure);
      expect((error as Error).message).toMatch(/Unsupported mode combination/);
      expect((error as RuntimeSelectionFailure).runtimeFallback).toMatchObject({
        occurred: false,
        policy: 'auto',
        code: 'cloud-appserver-unsupported',
        from_mode: 'appserver',
        to_mode: 'cli',
        original_target: 'execution:cloud/runtime:appserver',
        fallback_target: 'execution:cloud/runtime:cli'
      });
      expect((error as RuntimeSelectionFailure).runtimeFallback.expiry).toBeNull();
    }
  });

  it('auto-reroutes implicit default appserver mode to cli for cloud execution with fallback evidence', async () => {
    const selection = await resolveRuntimeSelection({
      requestedMode: 'appserver',
      source: 'default',
      executionMode: 'cloud',
      repoRoot: process.cwd(),
      env: {},
      runId: 'runtime-cloud-default'
    });

    expect(selection.requested_mode).toBe('appserver');
    expect(selection.selected_mode).toBe('cli');
    expect(selection.provider).toBe('CliRuntimeProvider');
    expect(selection.fallback).toMatchObject({
      occurred: true,
      policy: 'auto',
      code: 'cloud-appserver-unsupported',
      original_target: 'execution:cloud/runtime:appserver',
      fallback_target: 'execution:cloud/runtime:cli'
    });
    expect(selection.fallback.expiry).toMatchObject(CLOUD_DEFAULT_APPSERVER_EXPIRY);
    expect(selection.fallback.expiry?.removal_condition).toContain('runtimeMode=cli');
  });

  it('strict mode fails closed for implicit default cloud appserver mode', async () => {
    try {
      await resolveRuntimeSelection({
        requestedMode: 'appserver',
        source: 'default',
        executionMode: 'cloud',
        repoRoot: process.cwd(),
        env: {
          CODEX_ORCHESTRATOR_RUNTIME_FALLBACK: 'strict'
        },
        runId: 'runtime-cloud-default-strict'
      });
      throw new Error('Expected strict runtime fallback policy to fail closed');
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeSelectionFailure);
      expect((error as Error).message).toMatch(
        /Runtime fallback policy=strict original_target=execution:cloud\/runtime:appserver fallback_target=execution:cloud\/runtime:cli/
      );
      expect((error as RuntimeSelectionFailure).runtimeFallback).toMatchObject({
        occurred: false,
        policy: 'strict',
        policy_source: 'env',
        code: 'cloud-appserver-unsupported',
        from_mode: 'appserver',
        to_mode: 'cli',
        original_target: 'execution:cloud/runtime:appserver',
        fallback_target: 'execution:cloud/runtime:cli'
      });
      expect((error as RuntimeSelectionFailure).runtimeFallback.expiry).toBeNull();
    }
  });

  it('auto-reroutes manifest-derived appserver mode to cli for cloud execution', async () => {
    const selection = await resolveRuntimeSelection({
      requestedMode: 'appserver',
      source: 'manifest',
      executionMode: 'cloud',
      repoRoot: process.cwd(),
      env: {},
      runId: 'runtime-cloud-manifest'
    });

    expect(selection.requested_mode).toBe('appserver');
    expect(selection.selected_mode).toBe('cli');
    expect(selection.provider).toBe('CliRuntimeProvider');
    expect(selection.fallback.occurred).toBe(true);
    expect(selection.fallback.policy).toBe('auto');
    expect(selection.fallback.original_target).toBe('execution:cloud/runtime:appserver');
    expect(selection.fallback.fallback_target).toBe('execution:cloud/runtime:cli');
    expect(selection.fallback.expiry).toMatchObject(CLOUD_DEFAULT_APPSERVER_EXPIRY);
  });
});
