import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { createExecutionPlan } from '../../adapters/index.js';
import type { AdapterCommandOverrides, AdapterExecutionPlan } from '../../adapters/types.js';
import { loadScenarioById, loadScenarios } from './scenario-loader.js';
import type {
  EvaluationScenario,
  EvaluationScenarioResult,
  LoadedScenario,
  PatternAssertion,
  PatternAssertionResult,
  RunScenarioOptions,
  ScenarioGoalResult
} from './types.js';

const STDIO_LIMIT = 10_000; // bytes
const DEFAULT_TIMEOUT_MS = 30_000;

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
    const overrides = applyFixtureToOverrides(scenario.overrides?.[goal], fixturePath);
    const executionPlan = createExecutionPlan(scenario.adapterId, goal, {
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
    let killedByTimeout = false;

    const finish = (result: ScenarioGoalResult): void => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
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
      child.kill('SIGKILL');
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
  fixturePath: string
): Promise<PatternAssertionResult[]> {
  if (!assertions || assertions.length === 0) {
    return [];
  }

  const results: PatternAssertionResult[] = [];

  for (const assertion of assertions) {
    const scopeRoot = assertion.scope === 'repo' ? process.cwd() : fixturePath;
    const targetPath = path.resolve(scopeRoot, assertion.path);

    if (assertion.type === 'file-exists') {
      try {
        await fs.access(targetPath);
        results.push({ assertion, status: 'passed' });
      } catch (error) {
        results.push({
          assertion,
          status: 'failed',
          details: `File not found: ${targetPath} (${error instanceof Error ? error.message : error})`
        });
      }
    } else if (assertion.type === 'file-contains') {
      try {
        const content = await fs.readFile(targetPath, 'utf8');
        const needles = Array.isArray(assertion.includes) ? assertion.includes : [assertion.includes];
        const missing = needles.filter((needle) => !content.includes(needle));
        if (missing.length === 0) {
          results.push({ assertion, status: 'passed' });
        } else {
          results.push({
            assertion,
            status: 'failed',
            details: `Missing expected content: ${missing.join(', ')} in ${targetPath}`
          });
        }
      } catch (error) {
        results.push({
          assertion,
          status: 'failed',
          details: `Failed to read ${targetPath}: ${error instanceof Error ? error.message : error}`
        });
      }
    }
  }

  return results;
}

export async function runScenario(
  scenarioId: string | EvaluationScenario,
  options: RunScenarioOptions = {}
): Promise<EvaluationScenarioResult> {
  const mode = options.mode ?? 'mcp';
  const loaded: LoadedScenario =
    typeof scenarioId === 'string' ? await loadScenarioById(scenarioId) : { ...(scenarioId as EvaluationScenario), sourcePath: '<inline>' };

  const sourceFixturePath = path.resolve(process.cwd(), loaded.fixture.path);
  await fs.access(sourceFixturePath);

  let plans = await buildPlansForFixture(loaded, sourceFixturePath);
  const needsCopy = Boolean(loaded.fixture.copyToTemp || plans.some((plan) => plan.command.requiresCleanFixture));

  const { workingDir, cleanup } = await copyFixtureIfNeeded(sourceFixturePath, needsCopy);
  try {
    if (needsCopy && workingDir !== sourceFixturePath) {
      plans = await buildPlansForFixture(loaded, workingDir);
    }

    const startedAt = new Date();
    const goalResults: ScenarioGoalResult[] = [];
    const envOverrides = buildEnvOverrides(options.env);

    for (const plan of plans) {
      const timeoutMs = plan.command.timeoutMs ?? options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
      const result = await runCommand(plan, workingDir, envOverrides, timeoutMs);
      goalResults.push(result);
      if (result.status === 'failed') {
        break;
      }
    }

    const patternResults = await evaluatePatternAssertions(loaded.patternAssertions, workingDir);

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
      patternAssertions: patternResults
    };

    if (options.outputDir) {
      const outputDir = path.resolve(process.cwd(), options.outputDir);
      await ensureDirectoryExists(outputDir);
      const target = path.join(outputDir, `${loaded.id}.json`);
      await fs.writeFile(target, JSON.stringify(evaluationResult, null, 2));
    }

    return evaluationResult;
  } finally {
    await cleanup();
  }
}

export async function runAllScenarios(options: RunScenarioOptions = {}): Promise<EvaluationScenarioResult[]> {
  const scenarios = await loadScenarios();
  const results: EvaluationScenarioResult[] = [];

  for (const scenario of scenarios) {
    const result = await runScenario(scenario, options);
    results.push(result);
  }

  return results;
}

export { loadScenarios } from './scenario-loader.js';
export * from './types.js';
