import { goAdapter } from './go/build-test-configs.js';
import { pythonAdapter } from './python/build-test-configs.js';
import { typescriptAdapter } from './typescript/build-test-configs.js';
import type {
  AdapterCommandOverrides,
  AdapterExecutionPlan,
  AdapterGoal,
  LanguageAdapter,
  ResolvedAdapterCommand
} from './types.js';

const registry: LanguageAdapter[] = [typescriptAdapter, pythonAdapter, goAdapter];

export function getAdapters(): LanguageAdapter[] {
  return [...registry];
}

export function getAdapterById(id: string): LanguageAdapter | undefined {
  return registry.find((adapter) => adapter.id === id);
}

export function requireAdapter(id: string): LanguageAdapter {
  const adapter = getAdapterById(id);
  if (!adapter) {
    throw new Error(`Adapter '${id}' is not registered.`);
  }
  return adapter;
}

function mergeCommand(
  adapterId: string,
  goal: AdapterGoal,
  overrides: AdapterCommandOverrides
): ResolvedAdapterCommand {
  const adapter = requireAdapter(adapterId);
  const baseCommand = adapter.commands[goal];
  if (!baseCommand) {
    throw new Error(`Adapter '${adapterId}' does not expose goal '${goal}'.`);
  }

  const useEvaluationDefaults = overrides.useEvaluationDefaults === true;
  const evaluation = useEvaluationDefaults ? baseCommand.evaluation ?? {} : {};

  const command = overrides.command ?? evaluation.command ?? baseCommand.command;
  const args = overrides.args ?? evaluation.args ?? baseCommand.args;
  const env = {
    ...(baseCommand.env ?? {}),
    ...(useEvaluationDefaults ? evaluation.env ?? {} : {}),
    ...(overrides.env ?? {})
  };
  const cwd = overrides.cwd ?? (useEvaluationDefaults ? evaluation.cwd : undefined) ?? baseCommand.cwd;
  const requiresCleanFixture =
    overrides.requiresCleanFixture ??
    (useEvaluationDefaults ? evaluation.requiresCleanFixture : undefined) ??
    false;
  const supportsParallel =
    overrides.supportsParallel ??
    (useEvaluationDefaults ? evaluation.supportsParallel : undefined) ??
    true;
  const timeoutMs = overrides.timeoutMs ?? (useEvaluationDefaults ? evaluation.timeoutMs : undefined);

  return {
    id: goal,
    title: baseCommand.title,
    command,
    args,
    description: baseCommand.description,
    env,
    cwd,
    requiresCleanFixture,
    supportsParallel,
    timeoutMs
  } satisfies ResolvedAdapterCommand;
}

export function createExecutionPlan(
  adapterId: string,
  goal: AdapterGoal,
  overrides: AdapterCommandOverrides = {}
): AdapterExecutionPlan {
  const adapter = requireAdapter(adapterId);
  const command = mergeCommand(adapterId, goal, overrides);
  return { adapter, goal, command } satisfies AdapterExecutionPlan;
}

export type { LanguageAdapter } from './types.js';
export type {
  AdapterCommand,
  AdapterCommandOverrides,
  AdapterExecutionPlan,
  AdapterGoal,
  ResolvedAdapterCommand
} from './types.js';
