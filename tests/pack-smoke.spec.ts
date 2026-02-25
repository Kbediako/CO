import { describe, expect, it } from 'vitest';

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
