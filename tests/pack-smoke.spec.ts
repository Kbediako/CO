import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

async function readText(path: string): Promise<string> {
  return await readFile(path, 'utf8');
}

type WorkflowStep = {
  env?: unknown;
  if?: unknown;
  run?: unknown;
};

type WorkflowJob = {
  env?: unknown;
  steps?: unknown;
};

type WorkflowFile = {
  env?: unknown;
  jobs?: Record<string, WorkflowJob>;
};

const marketplaceSkipToken = 'PACK_SMOKE_ALLOW_MARKETPLACE_SKIP';
const codexInstallCommand = 'npm install --global @openai/codex@0.121.0';
const packSmokeCommand = 'npm run pack:smoke';

type CommandOccurrence = {
  index: number;
  line: string;
};

async function readWorkflow(path: string): Promise<WorkflowFile> {
  const parsed = load(await readText(path));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${path} must parse as a workflow object`);
  }
  return parsed as WorkflowFile;
}

function getWorkflowSteps(job: WorkflowJob): WorkflowStep[] {
  return Array.isArray(job.steps) ? (job.steps as WorkflowStep[]) : [];
}

function containsMarketplaceSkipEnv(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsMarketplaceSkipEnv(entry));
  }
  return Object.entries(value as Record<string, unknown>).some(
    ([key, entry]) =>
      key.includes(marketplaceSkipToken) ||
      (typeof entry === 'string' && entry.includes(marketplaceSkipToken)) ||
      containsMarketplaceSkipEnv(entry)
  );
}

function expectNoMarketplaceSkipEnv(value: unknown, label: string): void {
  expect(containsMarketplaceSkipEnv(value), `${label} must not opt out of marketplace smoke via env`).toBe(false);
}

function getStepCondition(step: WorkflowStep): string {
  return typeof step.if === 'string' ? step.if.trim() : '';
}

function isExecutableCommandOccurrence(line: string, index: number): boolean {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('#')) {
    return false;
  }
  const prefix = line.slice(0, index).trimEnd();
  return prefix === '' || prefix.endsWith('&&') || prefix.endsWith(';');
}

function normalizeShellContinuations(run: string): string {
  return run.replace(/\\\r?\n[ \t]*/gu, ' ');
}

function getExecutableCommandOccurrences(run: string, command: string): CommandOccurrence[] {
  const occurrences: CommandOccurrence[] = [];
  const normalizedRun = normalizeShellContinuations(run);
  let offset = 0;
  for (const line of normalizedRun.split(/\r?\n/u)) {
    let searchFrom = 0;
    let index = line.indexOf(command, searchFrom);
    while (index >= 0) {
      if (isExecutableCommandOccurrence(line, index)) {
        occurrences.push({ index: offset + index, line });
      }
      searchFrom = index + command.length;
      index = line.indexOf(command, searchFrom);
    }
    offset += line.length + 1;
  }
  return occurrences;
}

function isSoftFailedCodexInstall(occurrence: CommandOccurrence): boolean {
  const commandIndex = occurrence.line.indexOf(codexInstallCommand);
  const afterCommand = commandIndex >= 0 ? occurrence.line.slice(commandIndex + codexInstallCommand.length) : '';
  return afterCommand.includes('||');
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
      const workflowFile = await readWorkflow(workflow);
      expectNoMarketplaceSkipEnv(workflowFile.env, `${workflow} workflow`);
      let smokeStepCount = 0;
      for (const [jobName, job] of Object.entries(workflowFile.jobs ?? {})) {
        expectNoMarketplaceSkipEnv(job.env, `${workflow} job ${jobName}`);
        const codexInstallConditions = new Set<string>();
        for (const [stepIndex, step] of getWorkflowSteps(job).entries()) {
          expectNoMarketplaceSkipEnv(step.env, `${workflow} job ${jobName} step ${stepIndex + 1}`);
          const stepCondition = getStepCondition(step);
          const run = typeof step.run === 'string' ? step.run : '';
          expect(run, `${workflow} job ${jobName} must not opt out of marketplace smoke`).not.toContain(
            marketplaceSkipToken
          );
          const installOccurrences = getExecutableCommandOccurrences(run, codexInstallCommand);
          for (const installOccurrence of installOccurrences) {
            expect(
              isSoftFailedCodexInstall(installOccurrence),
              `${workflow} job ${jobName} step ${stepIndex + 1} must not soft-fail Codex install`
            ).toBe(false);
          }
          const validInstallOccurrences = installOccurrences.filter(
            (installOccurrence) => !isSoftFailedCodexInstall(installOccurrence)
          );
          const smokeOccurrences = getExecutableCommandOccurrences(run, packSmokeCommand);
          for (const smokeOccurrence of smokeOccurrences) {
            smokeStepCount += 1;
            const installBeforeInSameStep = validInstallOccurrences.some(
              (installOccurrence) => installOccurrence.index < smokeOccurrence.index
            );
            expect(
              codexInstallConditions.has(stepCondition) || installBeforeInSameStep,
              `${workflow} job ${jobName} step ${stepIndex + 1} must install Codex 0.121.0 before pack:smoke with matching if condition`
            ).toBe(true);
          }
          if (validInstallOccurrences.length > 0) {
            codexInstallConditions.add(stepCondition);
          }
        }
      }
      expect(smokeStepCount, `${workflow} must run pack:smoke`).toBeGreaterThan(0);
    }
  });
});
