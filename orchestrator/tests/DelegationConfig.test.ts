import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  computeEffectiveDelegationConfig,
  parseDelegationConfigOverride,
  splitDelegationConfigOverrides
} from '../src/cli/config/delegationConfig.js';

const repoRoot = '/repo';

function makeLayer(input: Record<string, unknown>) {
  return input as Parameters<typeof computeEffectiveDelegationConfig>[0]['layers'][number];
}

describe('delegation config layering', () => {
  it('defaults to safe settings when configs are missing', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: []
    });

    expect(result.delegate.allowNested).toBe(false);
    expect(result.delegate.allowedToolServers).toEqual([]);
    expect(result.delegate.toolProfile).toEqual([]);
    expect(result.paths.allowedRoots).toEqual([repoRoot]);
    expect(result.github.enabled).toBe(false);
    expect(result.github.operations).toEqual([]);
    expect(result.runner.mode).toBe('prod');
    expect(result.rlm.environment).toBe('docker');
    expect(result.ui.bindHost).toBe('127.0.0.1');
  });

  it('defaults RLM budgets and depth caps', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: []
    });

    expect(result.rlm.maxIterations).toBe(50);
    expect(result.rlm.maxSubcalls).toBe(200);
    expect(result.rlm.maxSubcallDepth).toBe(1);
    expect(result.rlm.wallClockTimeoutMs).toBe(30 * 60 * 1000);
  });

  it('caps delegate.toolProfile to repo allowedToolServers', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: [
        makeLayer({
          source: 'repo',
          delegate: { allowedToolServers: ['shell', 'filesystem'] }
        }),
        makeLayer({
          source: 'global',
          delegate: { toolProfile: ['shell', 'github'] }
        })
      ]
    });

    expect(result.delegate.toolProfile).toEqual(['shell']);
  });

  it('intersects allowed roots with repo cap', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: [
        makeLayer({
          source: 'env',
          paths: { allowedRoots: ['/tmp', '/repo/docs'] }
        })
      ]
    });

    expect(result.paths.allowedRoots).toEqual(['/repo/docs']);
  });

  it('intersects multiple allowed roots consistently', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: [
        makeLayer({
          source: 'repo',
          paths: { allowedRoots: ['/repo', '/shared'] }
        }),
        makeLayer({
          source: 'env',
          paths: { allowedRoots: ['/repo/docs', '/other'] }
        })
      ]
    });

    expect(result.paths.allowedRoots).toEqual(['/repo/docs']);
  });

  it('caps ui.allowedRunRoots to the repo allowlist', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: [
        makeLayer({
          source: 'repo',
          ui: { allowedRunRoots: ['/repo', '/shared'] }
        }),
        makeLayer({
          source: 'env',
          ui: { allowedRunRoots: ['/shared', '/other'] }
        })
      ]
    });

    expect(result.ui.allowedRunRoots).toEqual(['/shared']);
  });

  it('keeps ui.allowedRunRoots empty when overrides fall outside the repo cap', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: [
        makeLayer({
          source: 'repo',
          ui: { allowedRunRoots: ['/repo'] }
        }),
        makeLayer({
          source: 'env',
          ui: { allowedRunRoots: ['/other'] }
        })
      ]
    });

    expect(result.ui.allowedRunRoots).toEqual([]);
  });

  it('treats an explicit empty repo allowedRunRoots as a denylist', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: [
        makeLayer({
          source: 'repo',
          ui: { allowedRunRoots: [] }
        }),
        makeLayer({
          source: 'env',
          ui: { allowedRunRoots: ['/repo'] }
        })
      ]
    });

    expect(result.ui.allowedRunRoots).toEqual([]);
  });

  it('treats an explicit empty repo allowedRoots as a denylist', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: [
        makeLayer({
          source: 'repo',
          paths: { allowedRoots: [] }
        }),
        makeLayer({
          source: 'env',
          paths: { allowedRoots: ['/repo/docs'] }
        })
      ]
    });

    expect(result.paths.allowedRoots).toEqual([]);
  });

  it('reads GitHub enablement only from repo config', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: [
        makeLayer({ source: 'global', github: { enabled: true, operations: ['merge'] } }),
        makeLayer({ source: 'repo', github: { enabled: false, operations: ['merge'] } })
      ]
    });

    expect(result.github.enabled).toBe(false);
    expect(result.github.operations).toEqual([]);
  });

  it('enforces allowed modes for runner and rlm environment', () => {
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: [
        makeLayer({ source: 'repo', runner: { allowedModes: ['prod'] }, rlm: { allowedEnvironments: ['docker'] } }),
        makeLayer({ source: 'env', runner: { mode: 'dev' }, rlm: { environment: 'local' } })
      ]
    });

    expect(result.runner.mode).toBe('prod');
    expect(result.rlm.environment).toBe('docker');
  });

  it('realpath-resolves allowed roots to prevent symlink escapes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'delegation-roots-'));
    const repoPath = join(root, 'repo');
    const outsidePath = join(root, 'outside');
    const linkPath = join(repoPath, 'escape');
    await mkdir(repoPath, { recursive: true });
    await mkdir(outsidePath, { recursive: true });
    await symlink(outsidePath, linkPath);

    try {
      const result = computeEffectiveDelegationConfig({
        repoRoot: repoPath,
        layers: [
          makeLayer({
            source: 'env',
            paths: { allowedRoots: [linkPath] }
          })
        ]
      });

      expect(result.paths.allowedRoots).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('parses delegation config overrides with dotted keys', () => {
    const layer = parseDelegationConfigOverride('delegate.allow_nested=true', 'env');
    expect(layer?.delegate?.allowNested).toBe(true);
  });

  it('splits delegation config overrides from env strings', () => {
    const overrides = splitDelegationConfigOverrides('delegate.allow_nested=true;ui.bind_host="127.0.0.1"');
    expect(overrides).toEqual(['delegate.allow_nested=true', 'ui.bind_host="127.0.0.1"']);
  });

  it('preserves TOML arrays when splitting overrides', () => {
    const overrides = splitDelegationConfigOverrides(
      'ui.allowed_run_roots=["/a","/b"],delegate.allow_nested=true'
    );
    expect(overrides).toEqual(['ui.allowed_run_roots=["/a","/b"]', 'delegate.allow_nested=true']);
  });

  it('treats whitespace-only override strings for string arrays as empty lists', () => {
    const layer = parseDelegationConfigOverride('ui.allowed_run_roots="   "', 'env');
    expect(layer?.ui?.allowedRunRoots).toEqual([]);
  });

  it('applies CLI overrides after env overrides', () => {
    const envLayer = parseDelegationConfigOverride('rlm.max_iterations=5', 'env');
    const cliLayer = parseDelegationConfigOverride('rlm.max_iterations=9', 'cli');
    const result = computeEffectiveDelegationConfig({
      repoRoot,
      layers: [envLayer!, cliLayer!]
    });

    expect(result.rlm.maxIterations).toBe(9);
  });
});
