export type AdapterGoal = 'build' | 'test' | 'lint';

export interface AdapterCommandEvaluationConfig {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  requiresCleanFixture?: boolean;
  supportsParallel?: boolean;
  timeoutMs?: number;
}

export interface AdapterCommand {
  id: AdapterGoal;
  title: string;
  command: string;
  args: string[];
  description: string;
  env?: Record<string, string>;
  cwd?: string;
  evaluation?: AdapterCommandEvaluationConfig;
}

export interface LanguageAdapter {
  id: string;
  language: string;
  description: string;
  runtime: {
    name: string;
    version: string;
  };
  commands: {
    build: AdapterCommand;
    test: AdapterCommand;
    lint?: AdapterCommand;
  };
  metadata: {
    defaultPackageManager?: string;
    tags?: string[];
    docs?: string[];
  };
}
export interface ResolvedAdapterCommand {
  id: AdapterGoal;
  title: string;
  command: string;
  args: string[];
  description: string;
  env: Record<string, string>;
  cwd?: string;
  requiresCleanFixture: boolean;
  supportsParallel: boolean;
  timeoutMs?: number;
}

export interface AdapterExecutionPlan {
  adapter: LanguageAdapter;
  goal: AdapterGoal;
  command: ResolvedAdapterCommand;
}

export interface AdapterCommandOverrides {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeoutMs?: number;
  requiresCleanFixture?: boolean;
  supportsParallel?: boolean;
  useEvaluationDefaults?: boolean;
}
