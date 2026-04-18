import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  computeEffectiveDelegationConfig,
  parseDelegationConfigOverride,
  splitDelegationConfigOverrides
} from '../src/cli/config/delegationConfig.js';

const repoRoot = '/repo';

type DelegationConfigLayer = Parameters<typeof computeEffectiveDelegationConfig>[0]['layers'][number];

function makeLayer(input: DelegationConfigLayer) {
  return input;
}

type DelegationConfigModule = typeof import('../src/cli/config/delegationConfig.js');

async function importDelegationConfigWithoutTomlParser(): Promise<DelegationConfigModule> {
  vi.resetModules();
  vi.doMock('node:module', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:module')>();
    const fallbackRequire = actual.createRequire(import.meta.url);
    return {
      ...actual,
      createRequire: () => (id: string) => {
        if (id === '@iarna/toml') {
          throw new Error('simulate missing TOML dependency');
        }
        return fallbackRequire(id);
      }
    };
  });

  try {
    return (await import('../src/cli/config/delegationConfig.js')) as DelegationConfigModule;
  } finally {
    vi.doUnmock('node:module');
  }
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

  it('keeps fallback TOML parsing scoped to delegation config roots', async () => {
    const fallbackConfig = await importDelegationConfigWithoutTomlParser();
    const tempRoot = await mkdtemp(join(tmpdir(), 'delegation-config-fallback-'));
    const codexHome = join(tempRoot, 'codex-home');
    const tempRepo = join(tempRoot, 'repo');
    const outsideRoot = join(tempRoot, 'outside');

    await mkdir(join(tempRepo, '.codex'), { recursive: true });
    await mkdir(codexHome, { recursive: true });
    await mkdir(outsideRoot, { recursive: true });

    try {
      await writeFile(
        join(codexHome, 'config.toml'),
        [
          '[agents]',
          'max_threads = 12',
          'max_depth = 4',
          'legacy = {',
          '',
          '[mcp_servers.delegation]',
          'command = "node"',
          '',
          '[paths]',
          `allowed_roots = ["${tempRepo}", "${outsideRoot}"]`,
          '',
          '[ui]',
          `allowed_run_roots = ["${tempRepo}", "${outsideRoot}"]`
        ].join('\n'),
        'utf8'
      );
      await writeFile(
        join(tempRepo, '.codex', 'orchestrator.toml'),
        [
          '[paths]',
          `allowed_roots = ["${tempRepo}"]`,
          '',
          '[ui]',
          `allowed_run_roots = ["${tempRepo}"]`
        ].join('\n'),
        'utf8'
      );

      const resolvedRepo = await realpath(tempRepo);
      const configFiles = await fallbackConfig.loadDelegationConfigFiles({
        repoRoot: tempRepo,
        codexHome
      });
      const effective = fallbackConfig.computeEffectiveDelegationConfig({
        repoRoot: tempRepo,
        layers: [configFiles.global!, configFiles.repo!]
      });

      expect(configFiles.global).not.toHaveProperty('agents');
      expect(configFiles.global).not.toHaveProperty('mcp_servers');
      expect(configFiles.global?.paths?.allowedRoots).toEqual([tempRepo, outsideRoot]);
      expect(configFiles.global?.ui?.allowedRunRoots).toEqual([tempRepo, outsideRoot]);
      expect(effective.paths.allowedRoots).toEqual([resolvedRepo]);
      expect(effective.ui.allowedRunRoots).toEqual([resolvedRepo]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('parses integer budget fields when the TOML dependency is unavailable', async () => {
    const fallbackConfig = await importDelegationConfigWithoutTomlParser();
    const layer = fallbackConfig.parseDelegationConfigOverride(
      [
        '[rlm]',
        'max_iterations = 7',
        'max_subcalls = 11',
        'max_subcall_depth = 2',
        'wall_clock_timeout_ms = 1234',
        'budget_tokens = 4321',
        '',
        '[confirm]',
        'max_pending = 4',
        'expires_in_ms = 9000'
      ].join('\n'),
      'env'
    );

    expect(layer?.rlm?.maxIterations).toBe(7);
    expect(layer?.rlm?.maxSubcalls).toBe(11);
    expect(layer?.rlm?.maxSubcallDepth).toBe(2);
    expect(layer?.rlm?.wallClockTimeoutMs).toBe(1234);
    expect(layer?.rlm?.budgetTokens).toBe(4321);
    expect(layer?.confirm?.maxPending).toBe(4);
    expect(layer?.confirm?.expiresInMs).toBe(9000);
  });
});
