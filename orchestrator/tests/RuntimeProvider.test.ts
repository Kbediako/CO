import { describe, expect, it } from 'vitest';

import { resolveRuntimeMode } from '../src/cli/runtime/mode.js';
import { resolveRuntimeSelection } from '../src/cli/runtime/provider.js';

describe('runtime mode resolution', () => {
  it('resolves precedence as flag > env > config > manifest > default', () => {
    const env = { CODEX_ORCHESTRATOR_RUNTIME_MODE: 'appserver' } as NodeJS.ProcessEnv;

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
        env: {},
        configDefault: 'appserver',
        manifestMode: 'cli',
        preferManifest: true
      })
    ).toEqual({ mode: 'appserver', source: 'config' });

    expect(
      resolveRuntimeMode({
        env: {},
        configDefault: null,
        manifestMode: 'appserver',
        preferManifest: true
      })
    ).toEqual({ mode: 'appserver', source: 'manifest' });

    expect(resolveRuntimeMode({ env: {}, configDefault: null, manifestMode: null, preferManifest: true })).toEqual({
      mode: 'cli',
      source: 'default'
    });
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
});
