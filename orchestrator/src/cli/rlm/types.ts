export type RlmRoles = 'single' | 'triad';

export type ValidatorEcosystem = 'node' | 'python' | 'go' | 'rust';

export interface ValidatorCandidate {
  command: string;
  reason: string;
  ecosystem: ValidatorEcosystem;
}

export interface ValidatorDetectionResult {
  status: 'selected' | 'ambiguous' | 'missing';
  command: string | null;
  reason?: string;
  candidates: ValidatorCandidate[];
}

export interface RlmIterationState {
  n: number;
  startedAt: string;
  summary: string | null;
  validatorExitCode: number | null;
  validatorLogPath: string | null;
  diffSummary: string | null;
}

export type RlmFinalStatus =
  | 'passed'
  | 'budget_complete'
  | 'max_iterations'
  | 'max_minutes'
  | 'no_validator'
  | 'invalid_config'
  | 'error';

export interface RlmState {
  goal: string;
  validator: string | null;
  roles: RlmRoles;
  maxIterations: number;
  maxMinutes?: number | null;
  iterations: RlmIterationState[];
  final?: {
    status: RlmFinalStatus;
    exitCode: number;
  };
}

export interface RlmAgentInput {
  goal: string;
  iteration: number;
  maxIterations: number;
  roles: RlmRoles;
  subagentsEnabled: boolean;
  validatorCommand: string | null;
  lastValidatorOutput: string | null;
  diffSummary: string | null;
  repoRoot: string;
}

export interface RlmAgentResult {
  output: string;
  summary?: string | null;
}

export interface RlmValidatorResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError?: boolean;
}

export interface RlmLoopOptions {
  goal: string;
  validatorCommand: string | null;
  maxIterations: number;
  maxMinutes?: number | null;
  roles: RlmRoles;
  subagentsEnabled: boolean;
  repoRoot: string;
  runDir: string;
  runAgent: (input: RlmAgentInput) => Promise<RlmAgentResult>;
  runValidator?: (command: string) => Promise<RlmValidatorResult>;
  collectDiffSummary?: (repoRoot: string) => Promise<string>;
  now?: () => string;
  logger?: (line: string) => void;
}

export interface RlmLoopResult {
  state: RlmState;
  exitCode: number;
  error?: string | null;
}
