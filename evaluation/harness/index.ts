import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { createExecutionPlan } from '../../adapters/index.js';
import type { AdapterCommandOverrides, AdapterExecutionPlan } from '../../adapters/types.js';
import { loadScenarioById, loadScenarios } from './scenario-loader.js';
import { buildRewarders } from './rewarders/index.js';
import type {
  EvaluationScenario,
  EvaluationScenarioResult,
  LearningEpochResult,
  LearningScheduleConfig,
  LearningScheduleOptions,
  LearningScheduleResult,
  LoadedScenario,
  PatternAssertion,
  PatternAssertionResult,
  Rewarder,
  RewarderId,
  RewardSummary,
  RunScenarioOptions,
  ScenarioGoalResult,
  ScenarioGoalConfig,
  TfgrpoSampleMetadata
} from './types.js';

const STDIO_LIMIT = 10_000; // bytes
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_EPOCHS = 3;
const DEFAULT_SAMPLE_SIZE = 100;
const DEFAULT_TRAIN_TEMP = 0.7;
const DEFAULT_EVAL_TEMP = 0.3;
const DIFF_PREVIEW_LIMIT = 2_500;

type FileSnapshot =
  | { status: 'present'; content: string }
  | { status: 'missing' }
  | { status: 'error'; error: string };

function buildEnvOverrides(custom: Record<string, string> | undefined): Record<string, string> {
  const overrides = { ...(custom ?? {}) };
  const projectNodeModules = path.resolve(process.cwd(), 'node_modules');
  const existingNodePath = overrides.NODE_PATH ?? process.env.NODE_PATH;
  overrides.NODE_PATH = existingNodePath
    ? `${existingNodePath}${path.delimiter}${projectNodeModules}`
    : projectNodeModules;
  return overrides;
}

function substituteFixture(value: string | undefined, fixturePath: string): string | undefined {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replaceAll('{fixture}', fixturePath);
}

function applyFixtureToOverrides(overrides: AdapterCommandOverrides | undefined, fixturePath: string): AdapterCommandOverrides {
  if (!overrides) {
    return {};
  }

  const next: AdapterCommandOverrides = { ...overrides };
  if (next.args) {
    next.args = next.args.map((arg) => substituteFixture(arg, fixturePath) ?? arg);
  }
  if (next.cwd) {
    next.cwd = substituteFixture(next.cwd, fixturePath);
  }
  if (next.env) {
    next.env = Object.fromEntries(
      Object.entries(next.env).map(([key, value]) => [key, substituteFixture(value, fixturePath) ?? value])
    );
  }
  return next;
}

function applyFixtureToCommand(plan: AdapterExecutionPlan, fixturePath: string): AdapterExecutionPlan {
  const command = plan.command;
  const resolvedEnv = Object.fromEntries(
    Object.entries(command.env).map(([key, value]) => [key, substituteFixture(value, fixturePath) ?? value])
  );
  const resolvedArgs = command.args.map((arg) => substituteFixture(arg, fixturePath) ?? arg);
  const resolvedCwd = substituteFixture(command.cwd, fixturePath);

  return {
    adapter: plan.adapter,
    goal: plan.goal,
    command: {
      ...command,
      args: resolvedArgs,
      env: resolvedEnv,
      cwd: resolvedCwd
    }
  };
}

async function buildPlansForFixture(
  scenario: LoadedScenario,
  fixturePath: string
): Promise<AdapterExecutionPlan[]> {
  const plans: AdapterExecutionPlan[] = [];

  for (const goal of scenario.goals) {
    const goalId = typeof goal === 'string' ? goal : goal.goal;
    const goalOverrides: AdapterCommandOverrides =
      typeof goal === 'string' ? {} : { ...(goal as ScenarioGoalConfig) };
    delete (goalOverrides as Partial<ScenarioGoalConfig>).goal;

    const scenarioOverrides = scenario.overrides?.[goalId] ?? {};
    const overrides = applyFixtureToOverrides(
      { ...scenarioOverrides, ...goalOverrides },
      fixturePath
    );
    const executionPlan = createExecutionPlan(scenario.adapterId, goalId, {
      ...overrides,
      useEvaluationDefaults: overrides.useEvaluationDefaults ?? true
    });
    plans.push(applyFixtureToCommand(executionPlan, fixturePath));
  }

  return plans;
}

async function ensureDirectoryExists(target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
}

async function copyFixtureIfNeeded(source: string, shouldCopy: boolean): Promise<{ workingDir: string; cleanup: () => Promise<void> }> {
  if (!shouldCopy) {
    return {
      workingDir: source,
      cleanup: async () => {}
    };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-eval-'));
  await fs.cp(source, tempDir, { recursive: true });
  return {
    workingDir: tempDir,
    cleanup: async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  };
}

function truncateOutput(value: string): string {
  if (value.length <= STDIO_LIMIT) {
    return value;
  }
  return value.slice(0, STDIO_LIMIT) + `\n… truncated (${value.length - STDIO_LIMIT} bytes omitted)`;
}

function normalizeLineEndings(value: string): string {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

function splitLines(value: string): string[] {
  const normalized = normalizeLineEndings(value);
  const lines = normalized.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

function truncatePreview(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  return value.slice(0, limit) + `\n… truncated (${value.length - limit} chars omitted)`;
}

function resolveScopedPath(scopeRoot: string, relativePath: string): { targetPath: string; error?: string } {
  const resolved = path.resolve(scopeRoot, relativePath);
  const rel = path.relative(scopeRoot, resolved);
  const escapesScope = rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
  if (!escapesScope) {
    return { targetPath: resolved };
  }
  return {
    targetPath: resolved,
    error: `Path escapes scope root: ${relativePath}`
  };
}

async function readFileSnapshot(targetPath: string): Promise<FileSnapshot> {
  try {
    const content = await fs.readFile(targetPath, 'utf8');
    return { status: 'present', content: normalizeLineEndings(content) };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code?: string }).code;
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        return { status: 'missing' };
      }
    }
    return { status: 'error', error: error instanceof Error ? error.message : String(error) };
  }
}

function buildUnifiedDiff(oldContent: string | null, newContent: string | null, label: string): string {
  const oldText = normalizeLineEndings(oldContent ?? '');
  const newText = normalizeLineEndings(newContent ?? '');
  if (oldText === newText) {
    return '';
  }

  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const n = oldLines.length;
  const m = newLines.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i]![j] =
        oldLines[i] === newLines[j] ? (dp[i + 1]?.[j + 1] ?? 0) + 1 : Math.max(dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0);
    }
  }

  type DiffOp = { kind: 'equal' | 'delete' | 'insert'; line: string };
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ kind: 'equal', line: oldLines[i]! });
      i += 1;
      j += 1;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      ops.push({ kind: 'delete', line: oldLines[i]! });
      i += 1;
    } else {
      ops.push({ kind: 'insert', line: newLines[j]! });
      j += 1;
    }
  }
  while (i < n) {
    ops.push({ kind: 'delete', line: oldLines[i]! });
    i += 1;
  }
  while (j < m) {
    ops.push({ kind: 'insert', line: newLines[j]! });
    j += 1;
  }

  const firstChangeIndex = ops.findIndex((op) => op.kind !== 'equal');
  if (firstChangeIndex === -1) {
    return '';
  }
  let lastChangeIndex = ops.length - 1;
  while (lastChangeIndex >= 0 && ops[lastChangeIndex]!.kind === 'equal') {
    lastChangeIndex -= 1;
  }

  const sliced = ops.slice(firstChangeIndex, lastChangeIndex + 1);

  let oldPos = 0;
  let newPos = 0;
  for (const op of ops.slice(0, firstChangeIndex)) {
    if (op.kind !== 'insert') {
      oldPos += 1;
    }
    if (op.kind !== 'delete') {
      newPos += 1;
    }
  }

  const oldCount = sliced.reduce((count, op) => count + (op.kind !== 'insert' ? 1 : 0), 0);
  const newCount = sliced.reduce((count, op) => count + (op.kind !== 'delete' ? 1 : 0), 0);
  const oldStart = oldCount === 0 ? oldPos : oldPos + 1;
  const newStart = newCount === 0 && m === 0 ? 0 : newPos + 1;

  const diffLines: string[] = [];
  const normalizedLabel = label.replaceAll('\\', '/');
  diffLines.push(`--- a/${normalizedLabel}`);
  diffLines.push(`+++ b/${normalizedLabel}`);
  diffLines.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);

  for (const op of sliced) {
    const prefix = op.kind === 'equal' ? ' ' : op.kind === 'delete' ? '-' : '+';
    diffLines.push(`${prefix}${op.line}`);
  }

  return diffLines.join('\n');
}

function normalizeUnifiedDiff(diff: string): string {
  const normalized = normalizeLineEndings(diff);
  const lines = normalized.split('\n');
  const filtered = lines
    .filter((line) => !(line.startsWith('--- ') || line.startsWith('+++ ')))
    .map((line) => (line.startsWith('@@') ? '@@ ... @@' : line));
  while (filtered.length > 0 && filtered[filtered.length - 1] === '') {
    filtered.pop();
  }
  return filtered.join('\n');
}

function parseWriteInstruction(instruction: string): { relativePath: string; content: string } {
  const firstSep = instruction.indexOf('|');
  const secondSep = firstSep === -1 ? -1 : instruction.indexOf('|', firstSep + 1);
  if (firstSep === -1 || secondSep === -1) {
    throw new Error(`Invalid agentTask instruction; expected WRITE|<path>|<content>.`);
  }

  const verb = instruction.slice(0, firstSep).trim();
  if (verb !== 'WRITE') {
    throw new Error(`Unsupported agentTask verb '${verb}'. Only WRITE is supported.`);
  }

  const relativePath = instruction.slice(firstSep + 1, secondSep).trim();
  if (!relativePath) {
    throw new Error(`Invalid agentTask instruction; missing relative path.`);
  }

  return { relativePath, content: instruction.slice(secondSep + 1) };
}

async function applyAgentTaskInstruction(instruction: string, fixtureRoot: string): Promise<void> {
  const parsed = parseWriteInstruction(instruction);
  const resolved = resolveScopedPath(fixtureRoot, parsed.relativePath);
  if (resolved.error) {
    throw new Error(`agentTask WRITE rejected: ${resolved.error}`);
  }
  await fs.mkdir(path.dirname(resolved.targetPath), { recursive: true });
  await fs.writeFile(resolved.targetPath, parsed.content, 'utf8');
}

async function captureDiffBaselines(
  assertions: PatternAssertion[] | undefined,
  fixturePath: string
): Promise<Map<string, FileSnapshot>> {
  const snapshots = new Map<string, FileSnapshot>();
  if (!assertions) {
    return snapshots;
  }

  for (const assertion of assertions) {
    if (assertion.type !== 'diff-match') {
      continue;
    }
    const scopeRoot = assertion.scope === 'repo' ? process.cwd() : fixturePath;
    const resolved = resolveScopedPath(scopeRoot, assertion.path);
    if (resolved.error) {
      snapshots.set(resolved.targetPath, { status: 'error', error: resolved.error });
      continue;
    }
    if (snapshots.has(resolved.targetPath)) {
      continue;
    }
    snapshots.set(resolved.targetPath, await readFileSnapshot(resolved.targetPath));
  }

  return snapshots;
}

async function runCommand(
  plan: AdapterExecutionPlan,
  cwd: string,
  env: Record<string, string>,
  timeoutMs: number
): Promise<ScenarioGoalResult> {
  const startedAt = Date.now();
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  return await new Promise<ScenarioGoalResult>((resolve) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    let forceKillTimer: NodeJS.Timeout | undefined;
    let killedByTimeout = false;

    const finish = (result: ScenarioGoalResult): void => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (forceKillTimer) {
        clearTimeout(forceKillTimer);
        forceKillTimer = undefined;
      }
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const child = spawn(plan.command.command, plan.command.args, {
      cwd: plan.command.cwd ?? cwd,
      env: { ...process.env, ...plan.command.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => stdoutChunks.push(chunk));
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => stderrChunks.push(chunk));

    child.once('error', (error) => {
      finish({
        goal: plan.goal,
        command: plan.command,
        status: 'failed',
        exitCode: null,
        stdout: truncateOutput(stdoutChunks.join('')),
        stderr: truncateOutput(stderrChunks.join('')),
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error)
      });
    });

    timer = setTimeout(() => {
      killedByTimeout = true;
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore kill errors
      }
      if (process.platform !== 'win32') {
        forceKillTimer = setTimeout(() => {
          if (!child.killed) {
            try {
              child.kill('SIGKILL');
            } catch {
              // ignore kill errors
            }
          }
        }, 250);
      }
    }, timeoutMs);

    child.once('exit', (code) => {
      const status = code === 0 && !killedByTimeout ? 'passed' : 'failed';
      const error = killedByTimeout
        ? `Command timed out after ${timeoutMs}ms`
        : code === 0
          ? undefined
          : `Exited with code ${code}`;

      finish({
        goal: plan.goal,
        command: plan.command,
        status,
        exitCode: code,
        stdout: truncateOutput(stdoutChunks.join('')),
        stderr: truncateOutput(stderrChunks.join('')),
        durationMs: Date.now() - startedAt,
        error
      });
    });
  });
}

async function evaluatePatternAssertions(
  assertions: PatternAssertion[] | undefined,
  fixturePath: string,
  baselineSnapshots: Map<string, FileSnapshot>
): Promise<PatternAssertionResult[]> {
  if (!assertions || assertions.length === 0) {
    return [];
  }

  const results: PatternAssertionResult[] = [];

  for (const assertion of assertions) {
    const assertionType = (assertion as unknown as { type?: unknown }).type;
    const scopeRoot = assertion.scope === 'repo' ? process.cwd() : fixturePath;
    const resolved = resolveScopedPath(scopeRoot, assertion.path);
    if (resolved.error) {
      results.push({
        assertion,
        status: 'failed',
        details: resolved.error
      });
      continue;
    }

    const targetPath = resolved.targetPath;

    if (assertionType === 'file-exists') {
      const typed = assertion as Extract<PatternAssertion, { type: 'file-exists' }>;
      try {
        await fs.access(targetPath);
        results.push({ assertion: typed, status: 'passed' });
      } catch (error) {
        results.push({
          assertion: typed,
          status: 'failed',
          details: `File not found: ${targetPath} (${error instanceof Error ? error.message : error})`
        });
      }
    } else if (assertionType === 'file-contains') {
      const typed = assertion as Extract<PatternAssertion, { type: 'file-contains' }>;
      try {
        const content = await fs.readFile(targetPath, 'utf8');
        const needles = Array.isArray(typed.includes) ? typed.includes : [typed.includes];
        const missing = needles.filter((needle) => !content.includes(needle));
        if (missing.length === 0) {
          results.push({ assertion: typed, status: 'passed' });
        } else {
          results.push({
            assertion: typed,
            status: 'failed',
            details: `Missing expected content: ${missing.join(', ')} in ${targetPath}`
          });
        }
      } catch (error) {
        results.push({
          assertion: typed,
          status: 'failed',
          details: `Failed to read ${targetPath}: ${error instanceof Error ? error.message : error}`
        });
      }
    } else if (assertionType === 'diff-match') {
      const typed = assertion as Extract<PatternAssertion, { type: 'diff-match' }>;
      const baseline = baselineSnapshots.get(targetPath) ?? ({ status: 'missing' } satisfies FileSnapshot);
      const final = await readFileSnapshot(targetPath);

      if (baseline.status === 'error') {
        results.push({
          assertion: typed,
          status: 'failed',
          details: `Failed to capture baseline for ${targetPath}: ${baseline.error}`
        });
        continue;
      }

      if (final.status === 'error') {
        results.push({
          assertion: typed,
          status: 'failed',
          details: `Failed to read final contents for ${targetPath}: ${final.error}`
        });
        continue;
      }

      if (baseline.status === 'missing' && final.status === 'missing') {
        results.push({
          assertion: typed,
          status: 'failed',
          details: `File missing in both baseline and final state: ${targetPath}`
        });
        continue;
      }

      const rawDiff = buildUnifiedDiff(
        baseline.status === 'present' ? baseline.content : null,
        final.status === 'present' ? final.content : null,
        typed.path
      );
      const normalizedDiff = normalizeUnifiedDiff(rawDiff);
      const expected = normalizeLineEndings(typed.expectedDiff);

      if (!normalizedDiff) {
        results.push({
          assertion: typed,
          status: 'failed',
          details: `Diff was empty for ${targetPath} (expected a change containing:\n${truncatePreview(expected, DIFF_PREVIEW_LIMIT)})`
        });
        continue;
      }

      if (normalizedDiff.includes(expected)) {
        results.push({ assertion: typed, status: 'passed' });
      } else {
        results.push({
          assertion: typed,
          status: 'failed',
          details:
            `Diff did not contain expected substring for ${targetPath}\n\n` +
            `Expected:\n${truncatePreview(expected, DIFF_PREVIEW_LIMIT)}\n\n` +
            `Actual diff:\n${truncatePreview(normalizedDiff, DIFF_PREVIEW_LIMIT)}`
        });
      }
    } else {
      throw new Error(
        `Unknown pattern assertion type '${String(assertionType)}' for path ${targetPath}.` +
          ` Update evaluation/harness/types.ts and evaluation/harness/index.ts to support it.`
      );
    }
  }

  return results;
}

export async function runScenario(
  scenarioId: string | EvaluationScenario,
  options: RunScenarioOptions = {}
): Promise<EvaluationScenarioResult> {
  const mode = options.mode ?? 'mcp';
  const rewarderIds = normalizeRewarderIds(options.rewarders);
  const loaded: LoadedScenario =
    typeof scenarioId === 'string' ? await loadScenarioById(scenarioId) : { ...(scenarioId as EvaluationScenario), sourcePath: '<inline>' };

  const sourceFixturePath = path.resolve(process.cwd(), loaded.fixture.path);
  await fs.access(sourceFixturePath);

  let plans = await buildPlansForFixture(loaded, sourceFixturePath);
  const needsCopy = Boolean(
    loaded.fixture.copyToTemp ||
      loaded.agentTask?.instruction ||
      plans.some((plan) => plan.command.requiresCleanFixture)
  );

  const { workingDir, cleanup } = await copyFixtureIfNeeded(sourceFixturePath, needsCopy);
  try {
    if (needsCopy && workingDir !== sourceFixturePath) {
      plans = await buildPlansForFixture(loaded, workingDir);
    }

    const startedAt = new Date();
    const goalResults: ScenarioGoalResult[] = [];
    const envOverrides = buildEnvOverrides(options.env);
    const baselineSnapshots = await captureDiffBaselines(loaded.patternAssertions, workingDir);

    if (loaded.agentTask?.instruction) {
      await applyAgentTaskInstruction(loaded.agentTask.instruction, workingDir);
    }

    for (const plan of plans) {
      const timeoutMs = plan.command.timeoutMs ?? options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
      const result = await runCommand(plan, workingDir, envOverrides, timeoutMs);
      goalResults.push(result);
      if (result.status === 'failed') {
        break;
      }
    }

    const patternResults = await evaluatePatternAssertions(loaded.patternAssertions, workingDir, baselineSnapshots);

    const completedAt = new Date();
    const evaluationResult: EvaluationScenarioResult = {
      scenario: {
        id: loaded.id,
        title: loaded.title,
        adapterId: loaded.adapterId
      },
      mode,
      fixturePath: workingDir,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      goals: goalResults,
      patternAssertions: patternResults,
      ...(options.tfgrpoSample ? { tfgrpo: options.tfgrpoSample } : {})
    };

    if (rewarderIds.length > 0) {
      const rewarders = instantiateRewarders(rewarderIds);
      scoreResultsWithRewarders([evaluationResult], rewarders);
    }

    if (options.outputDir) {
      const outputDir = path.resolve(process.cwd(), options.outputDir);
      await persistScenarioResult(outputDir, evaluationResult);
    }

    return evaluationResult;
  } finally {
    await cleanup();
  }
}

export async function runAllScenarios(options: RunScenarioOptions = {}): Promise<EvaluationScenarioResult[]> {
  const scenarios = await loadScenarios();
  const results: EvaluationScenarioResult[] = [];
  const rewarderIds = normalizeRewarderIds(options.rewarders);
  const resolvedOutputDir = options.outputDir ? path.resolve(process.cwd(), options.outputDir) : null;
  const scenarioOptions = {
    ...options,
    rewarders: undefined,
    outputDir: resolvedOutputDir ?? undefined
  } satisfies RunScenarioOptions;

  for (const scenario of scenarios) {
    const result = await runScenario(scenario, scenarioOptions);
    results.push(result);
  }

  if (rewarderIds.length > 0) {
    const rewarders = instantiateRewarders(rewarderIds);
    scoreResultsWithRewarders(results, rewarders);
    if (resolvedOutputDir) {
      for (const result of results) {
        await persistScenarioResult(resolvedOutputDir, result);
      }
    }
  }

  return results;
}

function normalizeRewarderIds(ids: RewarderId[] | undefined): RewarderId[] {
  if (!ids || ids.length === 0) {
    return [];
  }
  const normalized: RewarderId[] = [];
  for (const id of ids) {
    if ((id === 'gt' || id === 'relative') && !normalized.includes(id)) {
      normalized.push(id);
    }
  }
  return normalized;
}

function instantiateRewarders(ids: RewarderId[]): Rewarder[] {
  if (ids.length === 0) {
    return [];
  }
  return buildRewarders(ids);
}

function scoreResultsWithRewarders(results: EvaluationScenarioResult[], rewarders: Rewarder[]): void {
  if (results.length === 0 || rewarders.length === 0) {
    return;
  }
  for (const rewarder of rewarders) {
    const assignments = rewarder.evaluate(results);
    for (const result of results) {
      const score = assignments.get(result);
      if (!score) {
        continue;
      }
      const summary = ensureRewardSummary(result);
      summary.scores.push(score);
      if (score.rewarderId === 'gt') {
        summary.gtScore = score.score;
      } else if (score.rewarderId === 'relative') {
        summary.relativeRank = score.score;
      }
    }
  }
}

function ensureRewardSummary(result: EvaluationScenarioResult): RewardSummary {
  if (!result.reward) {
    result.reward = {
      gtScore: 0,
      relativeRank: 0,
      scores: []
    } satisfies RewardSummary;
  }
  return result.reward;
}

export function applyRewarders(results: EvaluationScenarioResult[], rewarderIds: RewarderId[]): void {
  const normalized = normalizeRewarderIds(rewarderIds);
  if (normalized.length === 0) {
    return;
  }
  const rewarders = instantiateRewarders(normalized);
  scoreResultsWithRewarders(results, rewarders);
}

async function persistScenarioResult(outputDir: string, result: EvaluationScenarioResult): Promise<void> {
  await ensureDirectoryExists(outputDir);
  const target = path.join(outputDir, `${result.scenario.id}.json`);
  await fs.writeFile(target, JSON.stringify(result, null, 2));
}

export async function runLearningSchedule(options: LearningScheduleOptions = {}): Promise<LearningScheduleResult> {
  const config = resolveLearningScheduleConfig(options);
  const rewarders = instantiateRewarders(config.rewarders);
  const allScenarios = await loadScenarios();
  const pool = selectScenarioPool(allScenarios, config.scenarioIds);
  if (pool.length === 0) {
    throw new Error('No evaluation scenarios available for the TF-GRPO learning schedule.');
  }

  const epochs: LearningEpochResult[] = [];
  const rng = createDeterministicRng(config.rngSeed);
  const scheduleOutputDir = options.outputDir ? path.resolve(process.cwd(), options.outputDir) : null;

  for (let epoch = 1; epoch <= config.epochs; epoch += 1) {
    const temperatureMode = epoch === config.epochs ? 'eval' : 'train';
    const temperature = temperatureMode === 'train' ? config.temperatureTrain : config.temperatureEval;
    const epochResults: EvaluationScenarioResult[] = [];

    for (let sampleIndex = 0; sampleIndex < config.sampleSize; sampleIndex += 1) {
      const scenario = pickScenario(pool, rng);
      const tfgrpoSample: TfgrpoSampleMetadata = {
        epoch,
        sampleIndex,
        sampleSize: config.sampleSize,
        temperatureMode,
        temperature,
        scenarioId: scenario.id
      };

      const envOverrides = buildSampleEnv(options.env, {
        scenarioId: scenario.id,
        epoch,
        sampleIndex,
        config,
        temperatureMode,
        temperature
      });

      const sampleOutputDir = scheduleOutputDir
        ? path.join(
            scheduleOutputDir,
            `epoch-${String(epoch).padStart(2, '0')}`,
            `sample-${String(sampleIndex).padStart(3, '0')}`
          )
        : undefined;

      const result = await runScenario(scenario, {
        mode: config.mode,
        env: envOverrides,
        defaultTimeoutMs: options.defaultTimeoutMs,
        tfgrpoSample,
        outputDir: sampleOutputDir
      });
      epochResults.push(result);
    }

    if (rewarders.length > 0) {
      scoreResultsWithRewarders(epochResults, rewarders);
    }

    const epochSummary: LearningEpochResult = {
      epoch,
      temperature,
      temperatureMode,
      samples: epochResults
    };

    if (scheduleOutputDir) {
      await ensureDirectoryExists(scheduleOutputDir);
      const epochFile = path.join(scheduleOutputDir, `epoch-${String(epoch).padStart(2, '0')}.json`);
      await fs.writeFile(
        epochFile,
        JSON.stringify(
          {
            epoch: epochSummary.epoch,
            temperature: epochSummary.temperature,
            temperatureMode: epochSummary.temperatureMode,
            sampleCount: epochSummary.samples.length,
            rewarders: config.rewarders,
            samples: epochSummary.samples.map((sample) => ({
              scenarioId: sample.scenario.id,
              reward: sample.reward ?? null,
              tfgrpo: sample.tfgrpo ?? null,
              goals: sample.goals.map((goal) => ({
                goal: goal.goal,
                status: goal.status,
                durationMs: goal.durationMs
              }))
            }))
          },
          null,
          2
        )
      );
    }

    epochs.push(epochSummary);
  }

  return {
    config,
    epochs
  } satisfies LearningScheduleResult;
}

function resolveLearningScheduleConfig(options: LearningScheduleOptions): LearningScheduleConfig {
  const env = process.env;
  const epochs = clampToPositiveInteger(options.epochs ?? parsePositiveInteger(env.TFGRPO_EPOCHS) ?? DEFAULT_EPOCHS);
  const sampleSize = clampToPositiveInteger(
    options.sampleSize ?? parsePositiveInteger(env.TFGRPO_SAMPLE_SIZE) ?? DEFAULT_SAMPLE_SIZE
  );
  const temperatureTrain = options.temperatureTrain ?? parseFloatSafe(env.TFGRPO_TRAIN_TEMP) ?? DEFAULT_TRAIN_TEMP;
  const temperatureEval = options.temperatureEval ?? parseFloatSafe(env.TFGRPO_EVAL_TEMP) ?? DEFAULT_EVAL_TEMP;
  const rewarders = normalizeRewarderIds(
    options.rewarders ?? parseRewarderList(env.TFGRPO_REWARDERS) ?? []
  );
  const scenarioIds = options.scenarioIds ?? parseStringList(env.TFGRPO_SCENARIOS);
  const rngSeed = sanitizeRngSeed(options.rngSeed ?? parseInt(env.TFGRPO_SEED ?? '', 10));
  const mode = options.mode ?? 'mcp';
  return {
    epochs,
    sampleSize,
    rewarders,
    temperatureTrain,
    temperatureEval,
    mode,
    scenarioIds: scenarioIds?.length ? scenarioIds : null,
    rngSeed
  } satisfies LearningScheduleConfig;
}

function parseRewarderList(value: string | undefined): RewarderId[] | null {
  if (!value) {
    return null;
  }
  const tokens = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  const ids: RewarderId[] = [];
  for (const token of tokens) {
    if (token === 'gt' || token === 'relative') {
      ids.push(token);
    }
  }
  return ids.length ? ids : null;
}

function parseStringList(value: string | undefined): string[] | null {
  if (!value) {
    return null;
  }
  const tokens = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return tokens.length ? tokens : null;
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function clampToPositiveInteger(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.floor(value);
}

function parseFloatSafe(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function sanitizeRngSeed(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) {
    return Date.now();
  }
  return Math.floor(value);
}

function selectScenarioPool(scenarios: LoadedScenario[], scenarioIds: string[] | null): LoadedScenario[] {
  if (!scenarioIds || scenarioIds.length === 0) {
    return scenarios;
  }
  const pool = scenarios.filter((scenario) => scenarioIds.includes(scenario.id));
  if (pool.length !== scenarioIds.length) {
    const missing = scenarioIds.filter((id) => !pool.some((scenario) => scenario.id === id));
    throw new Error(`Unknown evaluation scenarios: ${missing.join(', ')}`);
  }
  return pool;
}

function createDeterministicRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function pickScenario(pool: LoadedScenario[], rng: () => number): LoadedScenario {
  if (pool.length === 1) {
    return pool[0]!;
  }
  const index = Math.floor(rng() * pool.length) % pool.length;
  return pool[index]!
}

function buildSampleEnv(
  base: Record<string, string> | undefined,
  params: {
    scenarioId: string;
    epoch: number;
    sampleIndex: number;
    config: LearningScheduleConfig;
    temperatureMode: 'train' | 'eval';
    temperature: number;
  }
): Record<string, string> {
  const overrides: Record<string, string> = {
    TFGRPO_EPOCH: String(params.epoch),
    TFGRPO_EPOCHS: String(params.config.epochs),
    TFGRPO_SAMPLE_INDEX: String(params.sampleIndex),
    TFGRPO_SAMPLE_SIZE: String(params.config.sampleSize),
    TFGRPO_TEMPERATURE_MODE: params.temperatureMode,
    TFGRPO_TEMPERATURE: params.temperature.toString(),
    TFGRPO_TRAIN_TEMP: params.config.temperatureTrain.toString(),
    TFGRPO_EVAL_TEMP: params.config.temperatureEval.toString(),
    TFGRPO_SCENARIO_ID: params.scenarioId
  };
  if (params.config.rewarders.length > 0) {
    overrides.TFGRPO_REWARDERS = params.config.rewarders.join(',');
  }
  return { ...(base ?? {}), ...overrides };
}

export { loadScenarios } from './scenario-loader.js';
export * from './types.js';
