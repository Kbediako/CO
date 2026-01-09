import { describe, expect, it } from 'vitest';
import { computeEffectiveDelegationConfig } from '../src/cli/config/delegationConfig.js';

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
});
