import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

async function readText(path: string): Promise<string> {
  return await readFile(path, 'utf8');
}

type WorkflowStep = {
  'continue-on-error'?: unknown;
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
const shellAssignmentPattern = String.raw`[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S+)`;
const packSmokeInvocationPattern = new RegExp(
  String.raw`(?:^|[;&|()]\s*|\b(?:if|then|do|while|until)\s+)(?:!\s+)?(?:${shellAssignmentPattern}\s+)*npm\s+run\s+pack:smoke(?=$|[\s;|&)])`,
  'gu'
);
const nonBlockingPackSmokePattern = /(?:^|[ \t])\|\|[ \t]|;[ \t]*(?:true|exit[ \t]+0)\b/u;

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
  const condition = typeof step.if === 'string' ? step.if.trim() : '';
  return condition.length > 0 ? condition : 'success()';
}

function unwrapActionsExpression(condition: string): string {
  const trimmed = condition.trim();
  const match = trimmed.match(/^\$\{\{\s*([\s\S]*?)\s*\}\}$/u);
  return match?.[1]?.trim() ?? trimmed;
}

function hasNonSuccessStatusCheck(condition: string): boolean {
  return /\b(always|cancelled|failure)\s*\(/iu.test(unwrapActionsExpression(condition));
}

function installConditionCoversSmokeStep(installCondition: string, smokeCondition: string): boolean {
  if (installCondition === smokeCondition) {
    return true;
  }
  return installCondition === 'success()' && !hasNonSuccessStatusCheck(smokeCondition);
}

function normalizeShellContinuations(run: string): string {
  return run.replace(/\\\r?\n[ \t]*/gu, ' ');
}

function getHeredocDelimiter(line: string): string | null {
  const match = line.match(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/u);
  return match?.[1] ?? null;
}

function getRunCommandLines(run: string): string[] {
  const commandLines: string[] = [];
  let heredocDelimiter: string | null = null;
  for (const rawLine of normalizeShellContinuations(run).split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (heredocDelimiter) {
      if (line === heredocDelimiter) {
        heredocDelimiter = null;
      }
      continue;
    }
    if (!line || line.startsWith('#')) {
      continue;
    }
    const nextHeredocDelimiter = getHeredocDelimiter(line);
    if (nextHeredocDelimiter) {
      heredocDelimiter = nextHeredocDelimiter;
      continue;
    }
    commandLines.push(line);
  }
  return commandLines;
}

function hasCommandText(run: string, command: string): boolean {
  return normalizeShellContinuations(run).includes(command);
}

type PackSmokeCommandOccurrence = {
  endIndex: number;
  line: string;
  matchText: string;
  startIndex: number;
};

function getPackSmokeCommandOccurrences(run: string): PackSmokeCommandOccurrence[] {
  const occurrences: PackSmokeCommandOccurrence[] = [];
  for (const line of getRunCommandLines(run)) {
    for (const match of line.matchAll(packSmokeInvocationPattern)) {
      occurrences.push({
        startIndex: match.index ?? 0,
        line,
        matchText: match[0],
        endIndex: (match.index ?? 0) + match[0].length
      });
    }
  }
  return occurrences;
}

function hasPackSmokeCommand(run: string): boolean {
  return getPackSmokeCommandOccurrences(run).length > 0;
}

function hasActiveShellCondition(beforeOccurrence: string): boolean {
  const controlTokens = [...beforeOccurrence.matchAll(/\b(if|while|until|then|do)\b/gu)];
  const lastControlToken = controlTokens.at(-1)?.[1];
  return lastControlToken === 'if' || lastControlToken === 'while' || lastControlToken === 'until';
}

function isConditionPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  const matchText = occurrence.matchText.trimStart();
  if (/^(?:then|do)\s+/u.test(matchText)) {
    return false;
  }
  return (
    /^(?:if|while|until)\s+/u.test(matchText) ||
    hasActiveShellCondition(occurrence.line.slice(0, occurrence.startIndex))
  );
}

function isNegatedPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return /!\s+(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S+)\s+)*npm\s+run\s+pack:smoke/u.test(
    occurrence.matchText
  );
}

function hasNonBlockingPackSmokeCommand(run: string): boolean {
  return getPackSmokeCommandOccurrences(run).some((occurrence) =>
    (
      isConditionPackSmokeOccurrence(occurrence) ||
      isNegatedPackSmokeOccurrence(occurrence) ||
      nonBlockingPackSmokePattern.test(occurrence.line.slice(occurrence.endIndex))
    )
  );
}

function isDedicatedCodexInstallRun(run: string): boolean {
  const commandLines = getRunCommandLines(run);
  return commandLines.length === 1 && commandLines[0] === codexInstallCommand;
}

function isContinueOnErrorEnabled(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  return typeof value === 'string' && value.trim().length > 0 && value.trim() !== 'false';
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
        const codexInstallConditions: string[] = [];
        for (const [stepIndex, step] of getWorkflowSteps(job).entries()) {
          expectNoMarketplaceSkipEnv(step.env, `${workflow} job ${jobName} step ${stepIndex + 1}`);
          const stepCondition = getStepCondition(step);
          const run = typeof step.run === 'string' ? step.run : '';
          expect(run, `${workflow} job ${jobName} must not opt out of marketplace smoke`).not.toContain(
            marketplaceSkipToken
          );
          if (hasCommandText(run, codexInstallCommand)) {
            expect(
              isContinueOnErrorEnabled(step['continue-on-error']),
              `${workflow} job ${jobName} step ${stepIndex + 1} must not continue-on-error Codex install`
            ).toBe(false);
            expect(
              isDedicatedCodexInstallRun(run),
              `${workflow} job ${jobName} step ${stepIndex + 1} must use a dedicated Codex 0.121.0 install step`
            ).toBe(true);
            codexInstallConditions.push(stepCondition);
          }
          if (hasPackSmokeCommand(run)) {
            smokeStepCount += 1;
            expect(
              isContinueOnErrorEnabled(step['continue-on-error']),
              `${workflow} job ${jobName} step ${stepIndex + 1} must not continue-on-error pack:smoke`
            ).toBe(false);
            expect(
              hasNonBlockingPackSmokeCommand(run),
              `${workflow} job ${jobName} step ${stepIndex + 1} must run pack:smoke as a blocking command`
            ).toBe(false);
            expect(
              codexInstallConditions.some((installCondition) =>
                installConditionCoversSmokeStep(installCondition, stepCondition)
              ),
              `${workflow} job ${jobName} step ${stepIndex + 1} must install Codex 0.121.0 before pack:smoke with matching if condition`
            ).toBe(true);
          }
        }
      }
      expect(smokeStepCount, `${workflow} must run pack:smoke`).toBeGreaterThan(0);
    }
  });

  it('only treats dedicated Codex install steps as workflow proof', () => {
    expect(isDedicatedCodexInstallRun(codexInstallCommand)).toBe(true);
    expect(isDedicatedCodexInstallRun(`${codexInstallCommand} || true`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`${codexInstallCommand} \\\n  || true`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`[[ "$NEEDS_CODEX" == 1 ]] && ${codexInstallCommand}`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`exit 0; ${codexInstallCommand}`)).toBe(false);
    expect(isDedicatedCodexInstallRun(`cat <<EOF\n${codexInstallCommand}\nEOF`)).toBe(false);
    expect(hasPackSmokeCommand(packSmokeCommand)).toBe(true);
    expect(hasPackSmokeCommand(`FOO=1 BAR="two words" ${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`${packSmokeCommand} -- --flag`)).toBe(true);
    expect(hasPackSmokeCommand(`npm run lint && ${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`if ${packSmokeCommand}; then echo ok; fi`)).toBe(true);
    expect(hasPackSmokeCommand(`if FOO=1 ${packSmokeCommand} -- --flag; then echo ok; fi`)).toBe(true);
    expect(hasPackSmokeCommand(`echo ${packSmokeCommand}`)).toBe(false);
    expect(hasPackSmokeCommand(`${packSmokeCommand}:other`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} || true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand}; exit 0`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} -- --flag || true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if ${packSmokeCommand}; then echo ok; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if FOO=1 ${packSmokeCommand} -- --flag; then echo ok; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if npm run lint && ${packSmokeCommand}; then echo ok; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`! ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || true && ${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker; then ${packSmokeCommand}; fi`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} -- --flag`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`echo ${packSmokeCommand} || true`)).toBe(false);
    expect(isContinueOnErrorEnabled(true)).toBe(true);
    expect(isContinueOnErrorEnabled('true')).toBe(true);
    expect(isContinueOnErrorEnabled('false')).toBe(false);
    expect(getStepCondition({})).toBe('success()');
    expect(installConditionCoversSmokeStep('success()', 'success()')).toBe(true);
    expect(
      installConditionCoversSmokeStep('success()', "${{ steps.downstream-smoke.outputs.required == 'true' }}")
    ).toBe(true);
    expect(installConditionCoversSmokeStep('success()', 'always()')).toBe(false);
    expect(installConditionCoversSmokeStep("${{ always() && inputs.force == 'true' }}", 'always()')).toBe(false);
    expect(
      installConditionCoversSmokeStep(
        "${{ always() && inputs.force == 'true' }}",
        "${{ always() && inputs.force == 'true' }}"
      )
    ).toBe(true);
  });
});
