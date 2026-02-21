export type RlmRoles = 'single' | 'triad';
export type RlmMode = 'iterative' | 'symbolic';

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

export interface RlmContextInfo {
  object_id: string;
  index_path: string;
  chunk_count: number;
}

export interface RlmSymbolicRead {
  pointer?: string;
  offset?: number;
  start_byte?: number;
  bytes: number;
  reason?: string;
}

export interface RlmSymbolicSearch {
  query: string;
  top_k?: number;
  reason?: string;
  clamped_top_k?: boolean;
  hits?: RlmSymbolicSearchHit[];
}

export interface RlmSymbolicSearchHit {
  pointer: string;
  offset: number;
  start_byte: number;
  match_bytes: number;
  score: number;
  preview: string;
}

export interface RlmSymbolicSnippet {
  pointer?: string;
  offset?: number;
  start_byte?: number;
  bytes: number;
}

export interface RlmSymbolicSpan {
  start_byte: number;
  end_byte: number;
}

export interface RlmSymbolicSubcallArtifacts {
  input: string;
  prompt: string;
  output: string;
  meta: string;
}

export interface RlmSymbolicSubcall {
  id: string;
  purpose: string;
  parent_pointer?: string;
  output_pointer?: string;
  output_var?: string;
  snippets?: RlmSymbolicSnippet[];
  spans?: RlmSymbolicSpan[];
  max_input_bytes: number;
  artifact_paths: RlmSymbolicSubcallArtifacts;
  clamped?: {
    snippets: boolean;
    bytes: boolean;
  };
  status?: string;
}

export interface RlmSymbolicVariableBinding {
  name: string;
  pointer: string;
  iteration: number;
  subcall_id: string;
  output_bytes: number;
  output_path: string;
}

export interface RlmSymbolicDeliberationArtifacts {
  prompt: string;
  output: string;
  meta: string;
}

export interface RlmSymbolicDeliberation {
  status: 'ran' | 'skipped' | 'error';
  reason: string;
  strategy: 'collab' | 'single-agent';
  prompt_bytes?: number;
  output_bytes?: number;
  artifact_paths?: RlmSymbolicDeliberationArtifacts;
  error?: string;
}

export type RlmAlignmentRiskLevel = 'low' | 'medium' | 'high';
export type RlmAlignmentAction = 'pass' | 'nudge' | 'replan' | 'block_escalate';
export type RlmIntentChangeLevel = 'major' | 'minor' | 'patch';

export interface RlmIntentVersion {
  major: number;
  minor: number;
  patch: number;
  label: string;
}

export interface RlmIntentSnapshot {
  goals: string[];
  constraints: string[];
  priorities: string[];
  style_preferences: string[];
  evidence_refs: string[];
  confidence: {
    overall: number;
    notes?: string;
  };
}

export interface RlmAlignmentDimensionScores {
  goal_alignment: number;
  constraint_compliance: number;
  action_evidence_coherence: number;
  completeness: number;
  context_continuity: number;
  efficiency_discipline: number;
}

export interface RlmAlignmentConsensusSnapshot {
  turn: number;
  accepted: boolean;
  top_action: RlmAlignmentAction;
  top_votes: number;
  top_confidence: number;
  margin: number;
  veto: boolean;
  reasons?: string[];
}

export interface RlmAlignmentDecision {
  turn: number;
  action: RlmAlignmentAction;
  score: number;
  confidence: number;
  risk_level: RlmAlignmentRiskLevel;
  policy_band: 'pass' | 'nudge' | 'replan' | 'block_escalate';
  route_model: string;
  route_strategy: 'sentinel' | 'deep_audit' | 'arbitration';
  deep_audit: boolean;
  deep_audit_reasons?: string[];
  requires_confirmation: boolean;
  confidence_gate_passed: boolean;
  intent_version: RlmIntentVersion;
  intent_change: RlmIntentChangeLevel;
  dimensions: RlmAlignmentDimensionScores;
  consensus_snapshot?: RlmAlignmentConsensusSnapshot;
  enforcement_blocked?: boolean;
  enforcement_reason?: string;
}

export interface RlmAlignmentLedgerSummary {
  ledger_path: string;
  projection_path: string;
  events: number;
  last_hash: string;
}

export interface RlmAlignmentFinalSummary {
  enabled: boolean;
  enforce: boolean;
  turns_evaluated: number;
  deep_audit_count: number;
  requires_confirmation_count: number;
  override_rate: number;
  consensus_acceptance_rate: number;
  action_counts: Record<RlmAlignmentAction, number>;
  route_counts: Record<'sentinel' | 'deep_audit' | 'arbitration', number>;
  intent_version: RlmIntentVersion;
  rollback_recommended: boolean;
  ledger: RlmAlignmentLedgerSummary;
}

export interface RlmSymbolicIteration {
  iteration: number;
  planner_prompt_bytes: number;
  reads: RlmSymbolicRead[];
  subcalls: RlmSymbolicSubcall[];
  variable_bindings?: RlmSymbolicVariableBinding[];
  deliberation?: RlmSymbolicDeliberation;
  alignment?: RlmAlignmentDecision;
  searches?: RlmSymbolicSearch[];
  planner_errors?: string[];
  clamped?: {
    reads?: boolean;
    searches?: boolean;
    subcalls?: boolean;
  };
  truncation?: {
    searches_dropped?: boolean;
    reads_dropped?: boolean;
    subcalls_dropped?: boolean;
    deliberation_dropped?: boolean;
    prompt_truncated?: boolean;
  };
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
  version: number;
  mode: RlmMode;
  context: RlmContextInfo;
  symbolic_iterations: RlmSymbolicIteration[];
  goal: string;
  validator: string | null;
  roles: RlmRoles;
  maxIterations: number;
  maxMinutes?: number | null;
  iterations: RlmIterationState[];
  final?: {
    status: RlmFinalStatus;
    exitCode: number;
    final_answer?: string;
    alignment?: RlmAlignmentFinalSummary;
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
  mode: RlmMode;
  context: RlmContextInfo;
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
