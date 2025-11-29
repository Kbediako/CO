import type {
  AdapterCommandOverrides,
  AdapterExecutionPlan,
  AdapterGoal,
  ResolvedAdapterCommand
} from '../../adapters/types.js';

export type EvaluationMode = 'mcp' | 'cloud';

export type RewarderId = 'gt' | 'relative';

export interface RewardScore {
  rewarderId: RewarderId;
  score: number;
  evidence?: string;
}

export interface RewardSummary {
  gtScore: number;
  relativeRank: number;
  scores: RewardScore[];
}

export type TemperatureMode = 'train' | 'eval';

export interface TfgrpoSampleMetadata {
  epoch: number;
  sampleIndex: number;
  sampleSize: number;
  temperatureMode: TemperatureMode;
  temperature: number;
  scenarioId: string;
}

export interface ScenarioFixtureConfig {
  path: string;
  copyToTemp?: boolean;
}

export type ScenarioGoalConfig = AdapterCommandOverrides & { goal: AdapterGoal };

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
  goals: Array<AdapterGoal | ScenarioGoalConfig>;
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
  reward?: RewardSummary;
  tfgrpo?: TfgrpoSampleMetadata;
}

export interface RunScenarioOptions {
  mode?: EvaluationMode;
  outputDir?: string;
  env?: Record<string, string>;
  defaultTimeoutMs?: number;
  rewarders?: RewarderId[];
  tfgrpoSample?: TfgrpoSampleMetadata;
}

export type LoadedScenario = EvaluationScenario & {
  sourcePath: string;
};

export type { AdapterExecutionPlan };

export interface Rewarder {
  id: RewarderId;
  evaluate(cohort: EvaluationScenarioResult[]): Map<EvaluationScenarioResult, RewardScore>;
}

export interface LearningScheduleOptions {
  epochs?: number;
  sampleSize?: number;
  rewarders?: RewarderId[];
  mode?: EvaluationMode;
  scenarioIds?: string[];
  rngSeed?: number;
  temperatureTrain?: number;
  temperatureEval?: number;
  env?: Record<string, string>;
  defaultTimeoutMs?: number;
  outputDir?: string;
}

export interface LearningScheduleConfig {
  epochs: number;
  sampleSize: number;
  rewarders: RewarderId[];
  temperatureTrain: number;
  temperatureEval: number;
  mode: EvaluationMode;
  scenarioIds: string[] | null;
  rngSeed: number;
}

export interface LearningEpochResult {
  epoch: number;
  temperature: number;
  temperatureMode: TemperatureMode;
  samples: EvaluationScenarioResult[];
}

export interface LearningScheduleResult {
  config: LearningScheduleConfig;
  epochs: LearningEpochResult[];
}
