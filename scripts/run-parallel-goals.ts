#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { createExecutionPlan, getAdapters } from '../adapters/index.js';
import type { AdapterExecutionPlan, AdapterGoal, LanguageAdapter, ResolvedAdapterCommand } from '../adapters/types.js';

interface CliOptions {
  dryRun: boolean;
  adapters: string[];
  goals: AdapterGoal[];
  verbose: boolean;
}

interface GoalResult {
  adapter: LanguageAdapter;
  command: ResolvedAdapterCommand;
  status: 'success' | 'failed';
  error?: Error;
  startedAt: number;
  endedAt: number;
}

const DEFAULT_OPTIONS: CliOptions = {
  dryRun: true,
  adapters: [],
  goals: ['build', 'test'],
  verbose: false
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { ...DEFAULT_OPTIONS };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--execute') {
      options.dryRun = false;
    } else if (arg.startsWith('--adapters=')) {
      const [, value] = arg.split('=');
      options.adapters = value.split(',').map((item) => item.trim()).filter(Boolean);
    } else if (arg.startsWith('--goals=')) {
      const [, value] = arg.split('=');
      options.goals = value
        .split(',')
        .map((item) => item.trim())
        .filter((item): item is AdapterGoal => ['build', 'test', 'lint'].includes(item as AdapterGoal));
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }

  if (options.goals.length === 0) {
    options.goals = ['build', 'test'];
  }

  return options;
}

function filterAdapters(adapters: LanguageAdapter[], selectedIds: string[]): LanguageAdapter[] {
  if (selectedIds.length === 0) {
    return adapters;
  }

  return adapters.filter((adapter) => selectedIds.includes(adapter.id));
}

function createExecutionPlans(adapters: LanguageAdapter[], goals: AdapterGoal[]): AdapterExecutionPlan[] {
  const plans: AdapterExecutionPlan[] = [];

  for (const adapter of adapters) {
    for (const goal of goals) {
      if (adapter.commands[goal]) {
        plans.push(createExecutionPlan(adapter.id, goal));
      }
    }
  }

  return plans;
}

async function executePlan(plan: AdapterExecutionPlan, dryRun: boolean, verbose: boolean): Promise<GoalResult> {
  const startedAt = Date.now();
  if (dryRun) {
    if (verbose) {
      console.log(
        `[dry-run] ${plan.adapter.id} → ${plan.command.id}: ${plan.command.command} ${plan.command.args.join(' ')}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      adapter: plan.adapter,
      command: plan.command,
      status: 'success',
      startedAt,
      endedAt: Date.now()
    };
  }

  return new Promise<GoalResult>((resolve) => {
    let settled = false;
    const finish = (result: GoalResult): void => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const child = spawn(plan.command.command, plan.command.args, {
      cwd: plan.command.cwd ?? process.cwd(),
      env: { ...process.env, ...(plan.command.env ?? {}) },
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.once('error', (error) => {
      finish({
        adapter: plan.adapter,
        command: plan.command,
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
        startedAt,
        endedAt: Date.now()
      });
    });

    child.once('exit', (code) => {
      const endedAt = Date.now();
      if (code === 0) {
        finish({
          adapter: plan.adapter,
          command: plan.command,
          status: 'success',
          startedAt,
          endedAt
        });
      } else {
        finish({
          adapter: plan.adapter,
          command: plan.command,
          status: 'failed',
          error: new Error(`Command ${plan.command.command} ${plan.command.args.join(' ')} exited with code ${code}`),
          startedAt,
          endedAt
        });
      }
    });
  });
}

export async function runParallelGoals(options: Partial<CliOptions> = {}): Promise<GoalResult[]> {
  const cliOptions = { ...DEFAULT_OPTIONS, ...options } satisfies CliOptions;
  const adapters = filterAdapters(getAdapters(), cliOptions.adapters);

  if (adapters.length === 0) {
    throw new Error('No adapters match the requested filters.');
  }

  if (adapters.length < 2 && cliOptions.verbose) {
    console.warn('Only one adapter selected — parallelism will target goal-level concurrency.');
  }

  const plans = createExecutionPlans(adapters, cliOptions.goals);
  if (plans.length === 0) {
    throw new Error('No execution plans generated for requested goals.');
  }

  const tasks = plans.map((plan) => executePlan(plan, cliOptions.dryRun, cliOptions.verbose));
  const results = await Promise.all(tasks);

  const failures = results.filter((result) => result.status === 'failed');
  if (failures.length > 0) {
    const error = failures[0]?.error ?? new Error('Unknown failure running parallel goals');
    throw error;
  }

  return results;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  try {
    const results = await runParallelGoals(options);
    const summary = results.map((result) => ({
      adapter: result.adapter.id,
      goal: result.command.id,
      status: result.status,
      durationMs: result.endedAt - result.startedAt
    }));

    console.table(summary);
  } catch (error) {
    console.error('[parallel-goals] failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

const modulePath = fileURLToPath(import.meta.url);
const isDirectRun = process.argv.slice(1).some((arg) => {
  try {
    return resolve(process.cwd(), arg) === modulePath;
  } catch {
    return false;
  }
});

if (isDirectRun) {
  void main();
}
