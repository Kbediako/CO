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
  'continue-on-error'?: unknown;
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
const shellIdentifierPattern = String.raw`[A-Za-z_][A-Za-z0-9_]*`;
const shellAssignmentPattern = String.raw`${shellIdentifierPattern}=(?:"[^"]*"|'[^']*'|\S+)`;
const packSmokeInvocationPrefixPattern = String.raw`(?:\(\s*)*(?:${shellAssignmentPattern}\s+)*`;
const packSmokeInvocationPattern = new RegExp(
  String.raw`(?:^|[;&|(){}]\s*|\b(?:if|then|do|while|until)\s+)(?:!\s+)?(?:${shellAssignmentPattern}\s+)*npm\s+run\s+pack:smoke(?=$|[\s;|&)])`,
  'gu'
);
const shellFunctionOpenPattern = new RegExp(
  String.raw`(?:^|[;&]\s*)(?:function\s+${shellIdentifierPattern}(?:\s*\(\))?|${shellIdentifierPattern}\s*\(\))\s*\{`,
  'gu'
);
const shellFunctionOpenBeforeOccurrencePattern = new RegExp(
  String.raw`(?:^|[;&]\s*)(?:function\s+${shellIdentifierPattern}(?:\s*\(\))?|${shellIdentifierPattern}\s*\(\))\s*\{\s*$`,
  'u'
);
const shellFunctionSignaturePattern = new RegExp(
  String.raw`(?:^|[;&]\s*)(?:function\s+${shellIdentifierPattern}(?:\s*\(\))?|${shellIdentifierPattern}\s*\(\))\s*$`,
  'u'
);
const trueShortCircuitBeforePackSmokePattern = new RegExp(
  String.raw`(?:^|[;&()]\s*)true\s*\|\|\s*${packSmokeInvocationPrefixPattern}$`,
  'u'
);
const falseShortCircuitBeforePackSmokePattern = new RegExp(
  String.raw`(?:^|[;&()]\s*)false\s*&&\s*${packSmokeInvocationPrefixPattern}$`,
  'u'
);
const fallbackShortCircuitBeforePackSmokePattern = new RegExp(
  String.raw`(?:^|[;&()]\s*)[^\n]*\|\|\s*${packSmokeInvocationPrefixPattern}$`,
  'u'
);
const nonBlockingPackSmokePattern = /\|\||\|&?|(?:^|[\s;])&(?![&>])|;[ \t]*(?:true|exit[ \t]+0)\b/u;
const heredocOperatorPattern = /<<-?\s*(?:"([^"]+)"|'([^']+)'|([^<>\s;&|()]+))/u;

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
  const expression = unwrapActionsExpression(condition);
  return (
    /\b(always|cancelled|failure)\s*\(/iu.test(expression) ||
    /!\s*success\s*\(/iu.test(expression) ||
    (/\bsuccess\s*\(/iu.test(expression) && /\|\|/u.test(expression))
  );
}

function isFalseExpressionTerm(term: string): boolean {
  let expression = term.trim();
  while (/^\(\s*[\s\S]*\s*\)$/u.test(expression)) {
    expression = expression.replace(/^\(\s*([\s\S]*?)\s*\)$/u, '$1').trim();
  }
  return /^false$/iu.test(expression);
}

function isAlwaysFalseCondition(condition: string): boolean {
  const expression = unwrapActionsExpression(condition).trim();
  if (/\|\|/u.test(expression)) {
    return false;
  }
  return expression.split(/&&/u).some((term) => isFalseExpressionTerm(term));
}

function installConditionCoversSmokeStep(installCondition: string, smokeCondition: string): boolean {
  if (isAlwaysFalseCondition(smokeCondition)) {
    return false;
  }
  if (installCondition === smokeCondition) {
    return true;
  }
  return installCondition === 'success()' && !hasNonSuccessStatusCheck(smokeCondition);
}

function normalizeShellContinuations(run: string): string {
  return run
    .replace(/\\\r?\n[ \t]*/gu, ' ')
    .replace(/(\|\||\|&?)[ \t]*\r?\n[ \t]*/gu, '$1 ')
    .replace(/\r?\n[ \t]*(?=(?:\|\||\|&?)(?:\s|$))/gu, ' ');
}

function getHeredocDelimiter(line: string): string | null {
  const match = line.match(heredocOperatorPattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
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
      const commandLine = line.replace(heredocOperatorPattern, '').trim();
      if (commandLine.length > 0) {
        commandLines.push(commandLine);
      }
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
  commandStartIndex: number;
  endIndex: number;
  hasErrexitDisabled: boolean;
  isInsideControlBlock: boolean;
  isInsideFunctionBlock: boolean;
  line: string;
  matchText: string;
  startIndex: number;
};

function updateErrexitDisabled(disabled: boolean, text: string): boolean {
  let next = disabled;
  const setErrexitPattern = /(?:^|[;&|()]\s*)set\s+(?:([+-])[A-Za-z]*e[A-Za-z]*|([+-])o\s+errexit)(?=$|[\s;|&)])/gu;
  for (const match of text.matchAll(setErrexitPattern)) {
    next = (match[1] ?? match[2]) === '+';
  }
  return next;
}

function countMatches(text: string, pattern: RegExp): number {
  return Array.from(text.matchAll(pattern)).length;
}

function updateShellControlDepth(depth: number, line: string): number {
  const openCount = countMatches(line, /(?:^|[;&]\s*)(?:for|if|while|until|case)\b/gu);
  const closeCount = countMatches(line, /(?:^|[;&]\s*)(?:fi|done|esac)\b/gu);
  return Math.max(0, depth + openCount - closeCount);
}

function getCommandSubstitutionDepth(text: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === '$' && text[index + 1] === '(') {
      depth += 1;
      index += 1;
      continue;
    }
    if (current === ')' && depth > 0) {
      depth -= 1;
    }
  }
  return depth;
}

function getShellGroupingDepth(text: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === '(') {
      depth += 1;
      continue;
    }
    if (current === ')' && depth > 0) {
      depth -= 1;
    }
  }
  return depth;
}

function getShellBraceGroupingDepth(text: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === '{') {
      depth += 1;
      continue;
    }
    if (current === '}' && depth > 0) {
      depth -= 1;
    }
  }
  return depth;
}

function hasOpenShortCircuitGroupBeforeOccurrence(beforeOccurrence: string, pattern: RegExp): boolean {
  return Array.from(beforeOccurrence.matchAll(pattern)).some((match) => {
    const matchIndex = match.index ?? 0;
    const openParenIndex = beforeOccurrence.indexOf('(', matchIndex);
    return openParenIndex >= 0 && getShellGroupingDepth(beforeOccurrence.slice(openParenIndex)) > 0;
  });
}

function hasOpenShortCircuitBraceGroupBeforeOccurrence(beforeOccurrence: string, pattern: RegExp): boolean {
  return Array.from(beforeOccurrence.matchAll(pattern)).some((match) => {
    const matchIndex = match.index ?? 0;
    const openBraceIndex = beforeOccurrence.indexOf('{', matchIndex);
    return openBraceIndex >= 0 && getShellBraceGroupingDepth(beforeOccurrence.slice(openBraceIndex)) > 0;
  });
}

type ShellFunctionState = {
  depth: number;
  pendingDefinition: boolean;
};

function getShellFunctionOpenBraceIndexes(line: string, pendingDefinition: boolean): Set<number> {
  const indexes = new Set<number>();
  if (pendingDefinition) {
    const pendingOpenMatch = line.match(/^\s*\{/u);
    if (pendingOpenMatch?.index !== undefined) {
      indexes.add(pendingOpenMatch.index + pendingOpenMatch[0].lastIndexOf('{'));
    }
  }
  for (const match of line.matchAll(shellFunctionOpenPattern)) {
    indexes.add((match.index ?? 0) + match[0].lastIndexOf('{'));
  }
  return indexes;
}

function updateShellFunctionState(depth: number, pendingDefinition: boolean, line: string): ShellFunctionState {
  const functionOpenBraceIndexes = getShellFunctionOpenBraceIndexes(line, pendingDefinition);
  let nextDepth = depth;
  for (let index = 0; index < line.length; index += 1) {
    const current = line[index];
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === '{' && (nextDepth > 0 || functionOpenBraceIndexes.has(index))) {
      nextDepth += 1;
      continue;
    }
    if (current === '}' && nextDepth > 0) {
      nextDepth -= 1;
    }
  }
  return {
    depth: nextDepth,
    pendingDefinition: nextDepth === 0 && functionOpenBraceIndexes.size === 0 && shellFunctionSignaturePattern.test(line)
  };
}

function getPackSmokeCommandOccurrences(run: string): PackSmokeCommandOccurrence[] {
  const occurrences: PackSmokeCommandOccurrence[] = [];
  let controlDepth = 0;
  let errexitDisabled = false;
  let functionDepth = 0;
  let pendingFunctionDefinition = false;
  for (const line of getRunCommandLines(run)) {
    for (const match of line.matchAll(packSmokeInvocationPattern)) {
      const startIndex = match.index ?? 0;
      const commandOffset = match[0].search(/npm\s+run\s+pack:smoke/u);
      const commandStartIndex = startIndex + (commandOffset >= 0 ? commandOffset : 0);
      const functionStateBeforeOccurrence = updateShellFunctionState(
        functionDepth,
        pendingFunctionDefinition,
        line.slice(0, commandStartIndex)
      );
      occurrences.push({
        startIndex,
        commandStartIndex,
        hasErrexitDisabled: updateErrexitDisabled(errexitDisabled, line.slice(0, commandStartIndex)),
        isInsideControlBlock: controlDepth > 0,
        isInsideFunctionBlock: functionStateBeforeOccurrence.depth > 0,
        line,
        matchText: match[0],
        endIndex: startIndex + match[0].length
      });
    }
    controlDepth = updateShellControlDepth(controlDepth, line);
    errexitDisabled = updateErrexitDisabled(errexitDisabled, line);
    const functionState = updateShellFunctionState(functionDepth, pendingFunctionDefinition, line);
    functionDepth = functionState.depth;
    pendingFunctionDefinition = functionState.pendingDefinition;
  }
  return occurrences;
}

function hasPackSmokeCommand(run: string): boolean {
  return getPackSmokeCommandOccurrences(run).length > 0;
}

function hasOpenShellControlBlock(beforeOccurrence: string): boolean {
  const openCount = countMatches(beforeOccurrence, /(?:^|[;&]\s*)(?:for|if|while|until|case)\b/gu);
  const closeCount = countMatches(beforeOccurrence, /(?:^|[;&]\s*)(?:fi|done|esac)\b/gu);
  return openCount > closeCount;
}

function hasConstantShortCircuitBeforeOccurrence(beforeOccurrence: string): boolean {
  return (
    trueShortCircuitBeforePackSmokePattern.test(beforeOccurrence) ||
    falseShortCircuitBeforePackSmokePattern.test(beforeOccurrence) ||
    hasOpenShortCircuitGroupBeforeOccurrence(beforeOccurrence, /(?:^|[;&()]\s*)true\s*\|\|\s*\(/gu) ||
    hasOpenShortCircuitGroupBeforeOccurrence(beforeOccurrence, /(?:^|[;&()]\s*)false\s*&&\s*\(/gu) ||
    hasOpenShortCircuitBraceGroupBeforeOccurrence(beforeOccurrence, /(?:^|[;&()]\s*)true\s*\|\|\s*\{/gu) ||
    hasOpenShortCircuitBraceGroupBeforeOccurrence(beforeOccurrence, /(?:^|[;&()]\s*)false\s*&&\s*\{/gu)
  );
}

function hasFallbackShortCircuitBeforeOccurrence(beforeOccurrence: string): boolean {
  return (
    fallbackShortCircuitBeforePackSmokePattern.test(beforeOccurrence) ||
    hasOpenShortCircuitGroupBeforeOccurrence(beforeOccurrence, /\|\|\s*\(/gu) ||
    hasOpenShortCircuitBraceGroupBeforeOccurrence(beforeOccurrence, /\|\|\s*\{/gu)
  );
}

function hasFunctionDefinitionBeforeOccurrence(beforeOccurrence: string): boolean {
  return (
    updateShellFunctionState(0, false, beforeOccurrence).depth > 0 ||
    shellFunctionOpenBeforeOccurrencePattern.test(beforeOccurrence)
  );
}

function isConditionPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  const matchText = occurrence.matchText.trimStart();
  return (
    occurrence.isInsideControlBlock ||
    /^(?:if|while|until|then|do)\s+/u.test(matchText) ||
    hasOpenShellControlBlock(occurrence.line.slice(0, occurrence.commandStartIndex))
  );
}

function isFunctionPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return (
    occurrence.isInsideFunctionBlock ||
    hasFunctionDefinitionBeforeOccurrence(occurrence.line.slice(0, occurrence.commandStartIndex))
  );
}

function isConstantShortCircuitPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return hasConstantShortCircuitBeforeOccurrence(occurrence.line.slice(0, occurrence.commandStartIndex));
}

function isFallbackShortCircuitPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return hasFallbackShortCircuitBeforeOccurrence(occurrence.line.slice(0, occurrence.commandStartIndex));
}

function isNegatedPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return /!\s+(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S+)\s+)*npm\s+run\s+pack:smoke/u.test(
    occurrence.matchText
  );
}

function isCommandSubstitutionPackSmokeOccurrence(occurrence: PackSmokeCommandOccurrence): boolean {
  return getCommandSubstitutionDepth(occurrence.line.slice(0, occurrence.commandStartIndex)) > 0;
}

function hasNonBlockingPackSmokeCommand(run: string): boolean {
  return getPackSmokeCommandOccurrences(run).some((occurrence) =>
    (
      isConditionPackSmokeOccurrence(occurrence) ||
      isFunctionPackSmokeOccurrence(occurrence) ||
      isConstantShortCircuitPackSmokeOccurrence(occurrence) ||
      isFallbackShortCircuitPackSmokeOccurrence(occurrence) ||
      isNegatedPackSmokeOccurrence(occurrence) ||
      isCommandSubstitutionPackSmokeOccurrence(occurrence) ||
      occurrence.hasErrexitDisabled ||
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
              isContinueOnErrorEnabled(job['continue-on-error']),
              `${workflow} job ${jobName} must not continue-on-error when it runs pack:smoke`
            ).toBe(false);
            expect(
              isContinueOnErrorEnabled(step['continue-on-error']),
              `${workflow} job ${jobName} step ${stepIndex + 1} must not continue-on-error pack:smoke`
            ).toBe(false);
            expect(
              hasNonBlockingPackSmokeCommand(run),
              `${workflow} job ${jobName} step ${stepIndex + 1} must run pack:smoke as a blocking command`
            ).toBe(false);
            expect(
              isAlwaysFalseCondition(stepCondition),
              `${workflow} job ${jobName} step ${stepIndex + 1} must not disable pack:smoke with an always-false if condition`
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
    expect(isDedicatedCodexInstallRun(`cat <<'EOF-MARK'\n${codexInstallCommand}\nEOF-MARK`)).toBe(false);
    expect(hasPackSmokeCommand(packSmokeCommand)).toBe(true);
    expect(hasPackSmokeCommand(`FOO=1 BAR="two words" ${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`${packSmokeCommand} -- --flag`)).toBe(true);
    expect(hasPackSmokeCommand(`npm run lint && ${packSmokeCommand}`)).toBe(true);
    expect(hasPackSmokeCommand(`if ${packSmokeCommand}; then echo ok; fi`)).toBe(true);
    expect(hasPackSmokeCommand(`if FOO=1 ${packSmokeCommand} -- --flag; then echo ok; fi`)).toBe(true);
    expect(hasPackSmokeCommand(`${packSmokeCommand} <<'EOF-MARK'\nbody\nEOF-MARK`)).toBe(true);
    expect(hasPackSmokeCommand(`cat <<EOF; ${packSmokeCommand}\nbody\nEOF`)).toBe(true);
    expect(hasPackSmokeCommand(`echo ${packSmokeCommand}`)).toBe(false);
    expect(hasPackSmokeCommand(`cat <<'EOF-MARK'\n${packSmokeCommand}\nEOF-MARK`)).toBe(false);
    expect(hasPackSmokeCommand(`${packSmokeCommand}:other`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} || true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand}||true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand}\n|| true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} | tee smoke.log`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} |& tee smoke.log`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} |\n tee smoke.log`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} &`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand}&echo done`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} -- --flag &`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand}; exit 0`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand};true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} -- --flag || true`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`true || ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`false && ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || (${packSmokeCommand})`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || (echo retry; ${packSmokeCommand})`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || { echo retry; ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || FOO=1 ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`false && (FOO=1 ${packSmokeCommand})`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`false && { FOO=1 ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if ${packSmokeCommand}; then echo ok; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if FOO=1 ${packSmokeCommand} -- --flag; then echo ok; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if npm run lint && ${packSmokeCommand}; then echo ok; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker; then ${packSmokeCommand}; fi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker; then\n  ${packSmokeCommand}\nfi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker\nthen\n  ${packSmokeCommand}\nfi`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`for marker in "$MARKERS"; do\n  ${packSmokeCommand}\ndone`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`while false; do ${packSmokeCommand}; done`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`while false; do\n  ${packSmokeCommand}\ndone`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker; then\n  echo skip\nfi\n${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`if test -f marker; then echo skip; fi; ${packSmokeCommand}`)).toBe(
      false
    );
    expect(hasNonBlockingPackSmokeCommand(`while false; do echo skip; done; ${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`for marker in "$MARKERS"; do echo skip; done; ${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`cat <<EOF; ${packSmokeCommand} || true\nbody\nEOF`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`if ${packSmokeCommand} <<'EOF-MARK'; then echo ok; fi\nbody\nEOF-MARK`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() {\n  ${packSmokeCommand}\n}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`function run_smoke() {\n  ${packSmokeCommand}\n}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke ()\n{\n  ${packSmokeCommand}\n}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { echo setup; ${packSmokeCommand}; }`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { { echo setup; } ${packSmokeCommand}; }`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() {\n  { echo setup; }\n  ${packSmokeCommand}\n}`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`function run_smoke() { echo setup; ${packSmokeCommand}; }`)).toBe(
      true
    );
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { echo setup; }; ${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`run_smoke() { { echo setup; } }; ${packSmokeCommand}`)).toBe(
      false
    );
    expect(hasNonBlockingPackSmokeCommand(`{ ${packSmokeCommand}; }`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`set +e\n${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`set +e; ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`set +e\nset -e\n${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`set +o errexit\n${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`set +o errexit\nset -o errexit\n${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`set +euo pipefail\n${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`set +euo pipefail\nset -euo pipefail\n${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`! ${packSmokeCommand}`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`echo "$(${packSmokeCommand})"`)).toBe(true);
    expect(hasNonBlockingPackSmokeCommand(`npm run lint || true && ${packSmokeCommand}`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} -- --flag`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} 2>&1`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`${packSmokeCommand} &> smoke.log`)).toBe(false);
    expect(hasNonBlockingPackSmokeCommand(`echo ${packSmokeCommand} || true`)).toBe(false);
    expect(isContinueOnErrorEnabled(true)).toBe(true);
    expect(isContinueOnErrorEnabled('true')).toBe(true);
    expect(isContinueOnErrorEnabled('false')).toBe(false);
    expect(getStepCondition({})).toBe('success()');
    expect(installConditionCoversSmokeStep('success()', 'success()')).toBe(true);
    expect(
      installConditionCoversSmokeStep('success()', "${{ steps.downstream-smoke.outputs.required == 'true' }}")
    ).toBe(true);
    expect(isAlwaysFalseCondition('false')).toBe(true);
    expect(isAlwaysFalseCondition('${{ false }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ (false) }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ success() && false }}')).toBe(true);
    expect(isAlwaysFalseCondition('${{ false && inputs.force }}')).toBe(true);
    expect(isAlwaysFalseCondition("${{ steps.downstream-smoke.outputs.required == 'true' }}")).toBe(false);
    expect(isAlwaysFalseCondition('${{ inputs.enabled || false }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', 'false')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ false }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', 'always()')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ !success() }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ success() || inputs.force }}')).toBe(false);
    expect(installConditionCoversSmokeStep('success()', '${{ success() && inputs.force }}')).toBe(true);
    expect(installConditionCoversSmokeStep("${{ always() && inputs.force == 'true' }}", 'always()')).toBe(false);
    expect(
      installConditionCoversSmokeStep(
        "${{ always() && inputs.force == 'true' }}",
        "${{ always() && inputs.force == 'true' }}"
      )
    ).toBe(true);
  });
});
