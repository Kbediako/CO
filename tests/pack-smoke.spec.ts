import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function readText(path: string): Promise<string> {
  return await readFile(path, 'utf8');
}

describe('scripts/pack-smoke env isolation', () => {
  it('strips inherited review control variables for deterministic downstream smoke runs', async () => {
    const { buildPackSmokeReviewEnv } = await import('../scripts/pack-smoke.mjs');
    const env = buildPackSmokeReviewEnv('/tmp/pack-smoke', {
      PATH: '/usr/bin',
      CUSTOM_FLAG: '1',
      FORCE_CODEX_REVIEW: '1',
      CODEX_CLI_BIN: '/tmp/custom-codex',
      CODEX_CONFIG_OVERRIDES: 'model="gpt-5.3-codex"',
      CODEX_MCP_CONFIG_OVERRIDES: 'mcp_servers.delegation.enabled=false',
      NOTES: 'wrong notes',
      SKIP_DIFF_BUDGET: '1',
      DIFF_BUDGET_STAGE: '1',
      DIFF_BUDGET_OVERRIDE_REASON: 'injected-from-parent',
      DIFF_BUDGET_BASE: 'origin/main',
      DIFF_BUDGET_MAX_FILES: '999',
      TASK: 'unexpected-task',
      MCP_RUNNER_TASK_ID: 'unexpected-task',
      CODEX_ORCHESTRATOR_ROOT: '/tmp/other-root',
      CODEX_ORCHESTRATOR_RUN_DIR: '/tmp/other-run',
      CODEX_ORCHESTRATOR_RUNS_DIR: '/tmp/other-runs',
      CODEX_ORCHESTRATOR_OUT_DIR: '/tmp/other-out',
      CODEX_REVIEW_ALLOW_HEAVY_COMMANDS: '1',
      CODEX_REVIEW_TIMEOUT_SECONDS: '3'
    });

    expect(env.PATH).toBe('/usr/bin');
    expect(env.CUSTOM_FLAG).toBe('1');
    expect(env.FORCE_CODEX_REVIEW).toBeUndefined();
    expect(env.CODEX_CLI_BIN).toBeUndefined();
    expect(env.CODEX_CONFIG_OVERRIDES).toBeUndefined();
    expect(env.CODEX_MCP_CONFIG_OVERRIDES).toBeUndefined();
    expect(env.NOTES).toContain('pack smoke review coverage');
    expect(env.SKIP_DIFF_BUDGET).toBeUndefined();
    expect(env.DIFF_BUDGET_STAGE).toBeUndefined();
    expect(env.DIFF_BUDGET_OVERRIDE_REASON).toBeUndefined();
    expect(env.DIFF_BUDGET_BASE).toBeUndefined();
    expect(env.DIFF_BUDGET_MAX_FILES).toBeUndefined();
    expect(env.TASK).toBeUndefined();
    expect(env.MCP_RUNNER_TASK_ID).toBe('pack-smoke');
    expect(env.CODEX_ORCHESTRATOR_ROOT).toBe('/tmp/pack-smoke');
    expect(env.CODEX_ORCHESTRATOR_RUN_DIR).toBeUndefined();
    expect(env.CODEX_ORCHESTRATOR_RUNS_DIR).toBeUndefined();
    expect(env.CODEX_ORCHESTRATOR_OUT_DIR).toBeUndefined();
    expect(env.CODEX_REVIEW_ALLOW_HEAVY_COMMANDS).toBeUndefined();
    expect(env.CODEX_REVIEW_TIMEOUT_SECONDS).toBeUndefined();
    expect(env.CODEX_REVIEW_NON_INTERACTIVE).toBe('1');
  });
});

describe('scripts/pack-smoke marketplace coverage contract', () => {
  it('fails closed when Codex is unavailable unless an explicit reasoned local opt-out is set', async () => {
    const { resolveMarketplaceSmokePrerequisite } = await import('../scripts/pack-smoke.mjs');

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'missing-codex',
        allowMarketplaceSkip: false,
        codexAvailable: false,
        marketplaceCapable: false
      })
    ).toEqual({
      status: 'fail',
      reason: 'codex-unavailable',
      message:
        'Marketplace smoke requires missing-codex in PATH. Set PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 with PACK_SMOKE_MARKETPLACE_SKIP_REASON only for local-dev opt-out.'
    });

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'missing-codex',
        allowMarketplaceSkip: true,
        marketplaceSkipReason: '',
        codexAvailable: false,
        marketplaceCapable: false
      })
    ).toEqual({
      status: 'fail',
      reason: 'missing-skip-reason',
      message:
        'PACK_SMOKE_MARKETPLACE_SKIP_REASON is required when PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 skips marketplace coverage.'
    });

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'missing-codex',
        allowMarketplaceSkip: true,
        marketplaceSkipReason: 'local docs-only validation; no marketplace coverage claimed',
        codexAvailable: false,
        marketplaceCapable: false
      })
    ).toEqual({
      status: 'skip',
      reason: 'codex-unavailable',
      message:
        'Skipping marketplace smoke: missing-codex is unavailable in this environment. Reason: local docs-only validation; no marketplace coverage claimed'
    });
  });

  it('fails closed when Codex lacks marketplace support unless the opt-out is explicit and reasoned', async () => {
    const { resolveMarketplaceSmokePrerequisite } = await import('../scripts/pack-smoke.mjs');

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'codex-0.118',
        allowMarketplaceSkip: false,
        codexAvailable: true,
        marketplaceCapable: false
      })
    ).toEqual({
      status: 'fail',
      reason: 'marketplace-unsupported',
      message:
        'Marketplace smoke requires a Codex CLI with `marketplace add` support. Set PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 with PACK_SMOKE_MARKETPLACE_SKIP_REASON only for local-dev opt-out.'
    });

    expect(
      resolveMarketplaceSmokePrerequisite({
        codexBin: 'codex-0.118',
        allowMarketplaceSkip: true,
        marketplaceSkipReason: 'explicit pre-0.121 compatibility lane; no release coverage claimed',
        codexAvailable: true,
        marketplaceCapable: false
      })
    ).toEqual({
      status: 'skip',
      reason: 'marketplace-unsupported',
      message:
        'Skipping marketplace smoke: codex-0.118 does not expose codex marketplace add. Reason: explicit pre-0.121 compatibility lane; no release coverage claimed'
    });
  });

  it('pins CI and release workflows to install marketplace-capable Codex before pack:smoke', async () => {
    const workflows = [
      '.github/workflows/core-lane.yml',
      '.github/workflows/pack-smoke-backstop.yml',
      '.github/workflows/release.yml'
    ];

    for (const workflow of workflows) {
      const text = await readText(workflow);
      const installIndex = text.indexOf('npm install --global @openai/codex@0.121.0');
      const smokeIndices = [...text.matchAll(/npm run pack:smoke/gu)].map((match) => match.index ?? -1);
      expect(installIndex, `${workflow} must install Codex 0.121.0`).toBeGreaterThanOrEqual(0);
      expect(smokeIndices.length, `${workflow} must run pack:smoke`).toBeGreaterThan(0);
      for (const smokeIndex of smokeIndices) {
        expect(smokeIndex, `${workflow} must run every pack:smoke after Codex install`).toBeGreaterThan(
          installIndex
        );
      }
      expect(text, `${workflow} must not opt out of marketplace smoke`).not.toContain(
        'PACK_SMOKE_ALLOW_MARKETPLACE_SKIP'
      );
    }
  });
});
