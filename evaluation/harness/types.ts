import type {
  AdapterCommandOverrides,
  AdapterExecutionPlan,
  AdapterGoal,
  ResolvedAdapterCommand
} from '../../adapters/types.js';

export type EvaluationMode = 'mcp' | 'cloud';

export interface ScenarioFixtureConfig {
  path: string;
  copyToTemp?: boolean;
}

export type PatternAssertion =
  | {
      type: 'file-exists';
      path: string;
      scope?: 'fixture' | 'repo';
      note?: string;
    }
  | {
      type: 'file-contains';
      path: string;
      includes: string | string[];
      scope?: 'fixture' | 'repo';
      note?: string;
    };

export interface EvaluationScenario {
  id: string;
  title: string;
  adapterId: string;
  goals: AdapterGoal[];
  fixture: ScenarioFixtureConfig;
  overrides?: Partial<Record<AdapterGoal, AdapterCommandOverrides>>;
  patternAssertions?: PatternAssertion[];
}

export interface ScenarioGoalResult {
  goal: AdapterGoal;
  command: ResolvedAdapterCommand;
  status: 'passed' | 'failed';
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  error?: string;
}

export interface PatternAssertionResult {
  assertion: PatternAssertion;
  status: 'passed' | 'failed';
  details?: string;
}

export interface EvaluationScenarioResult {
  scenario: {
    id: string;
    title: string;
    adapterId: string;
  };
  mode: EvaluationMode;
  fixturePath: string;
  startedAt: string;
  completedAt: string;
  goals: ScenarioGoalResult[];
  patternAssertions: PatternAssertionResult[];
}

export interface RunScenarioOptions {
  mode?: EvaluationMode;
  outputDir?: string;
  env?: Record<string, string>;
  defaultTimeoutMs?: number;
}

export type LoadedScenario = EvaluationScenario & {
  sourcePath: string;
};

export type { AdapterExecutionPlan };
