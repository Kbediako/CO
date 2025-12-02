import type { PlanResult, RunSummary } from '../types.js';
import type {
  CliManifest as SharedCliManifest,
  CliManifestCommand as SharedCliManifestCommand,
  RunStatus
} from '../../../packages/shared/manifest/types.js';

export type PipelineStage = CommandStage | SubPipelineStage;

export interface PipelineDefinition {
  id: string;
  title: string;
  description?: string;
  stages: PipelineStage[];
  tags?: string[];
  guardrailsRequired?: boolean;
}

export interface CommandStage {
  kind: 'command';
  id: string;
  title: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  allowFailure?: boolean;
  summaryHint?: string;
  session?: {
    id?: string;
    reuse?: boolean;
    persist?: boolean;
  };
}

export interface SubPipelineStage {
  kind: 'subpipeline';
  id: string;
  title: string;
  pipeline: string;
  optional?: boolean;
}

export interface PlanPreviewCommandStage {
  index: number;
  id: string;
  title: string;
  kind: 'command';
  command: string;
  cwd: string | null;
  env: Record<string, string> | null;
  allowFailure: boolean;
  summaryHint: string | null;
}

export interface PlanPreviewSubPipelineStage {
  index: number;
  id: string;
  title: string;
  kind: 'subpipeline';
  pipeline: string;
  optional: boolean;
}

export type PlanPreviewStage = PlanPreviewCommandStage | PlanPreviewSubPipelineStage;

export interface PlanPreviewResult {
  pipeline: {
    id: string;
    title: string;
    description: string | null;
    source: 'default' | 'user' | null;
  };
  stages: PlanPreviewStage[];
  plan: PlanResult;
  targetId?: string | null;
}

export type CliManifest = SharedCliManifest;
export type CliManifestCommand = SharedCliManifestCommand;
export type CommandStatus = CliManifestCommand['status'];
export type CommandKind = CliManifestCommand['kind'];
export type { RunStatus };

export type ChildRunRecord = CliManifest['child_runs'][number];
export type ApprovalRecord = CliManifest['approvals'][number];
export type PromptPackManifestEntry = NonNullable<NonNullable<CliManifest['prompt_packs']>>[number];

export type LearningManifestSection = NonNullable<CliManifest['learning']>;
export type LearningValidationPolicy = NonNullable<LearningManifestSection['validation']> & {
  reason?: string | null;
  log_path?: string | null;
  last_error?: string | null;
  git_status_path?: string | null;
  git_log_path?: string | null;
};
export type LearningValidationMode = LearningValidationPolicy['mode'];
export type LearningValidationStatus = NonNullable<LearningValidationPolicy['status']>;
export type LearningGrouping = NonNullable<LearningValidationPolicy['grouping']>;
export type LearningSnapshotManifest = NonNullable<LearningManifestSection['snapshot']>;
export type LearningSnapshotStatus = LearningSnapshotManifest['status'];
export type LearningQueueRecord = NonNullable<LearningManifestSection['queue']>;
export type LearningScenarioRecord = NonNullable<LearningManifestSection['scenario']>;
export type LearningScenarioStatus = LearningScenarioRecord['status'];
export type LearningAlertRecord = NonNullable<LearningManifestSection['alerts']>[number];
export type LearningAlertType = LearningAlertRecord['type'];
export type LearningApprovalRecord = NonNullable<LearningManifestSection['approvals']>[number];
export type LearningApprovalState = LearningApprovalRecord['state'];
export type LearningCrystalizerRecord = NonNullable<LearningManifestSection['crystalizer']>;
export type LearningReviewRecord = NonNullable<LearningManifestSection['review']>;
export type LearningRegressionsRecord = NonNullable<LearningManifestSection['regressions']>;
export type LearningPatternHygieneRecord = NonNullable<LearningManifestSection['pattern_hygiene']>;
export type LearningThroughputRecord = NonNullable<LearningManifestSection['throughput']>;

export type TfgrpoManifestSection = NonNullable<CliManifest['tfgrpo']>;
export type TfgrpoToolMetricsSummary = NonNullable<TfgrpoManifestSection['tool_metrics']>;
export type TfgrpoToolMetric = TfgrpoToolMetricsSummary['per_tool'][number];
export type TfgrpoExperienceSummary = NonNullable<TfgrpoManifestSection['experiences']>;

export type HandleRecord = NonNullable<CliManifest['handles']>[number];
export type PrivacyManifest = NonNullable<CliManifest['privacy']>;
export type PrivacyDecisionRecord = PrivacyManifest['decisions'][number];
export type PrivacyTotals = PrivacyManifest['totals'];

export interface StartOptions {
  taskId?: string;
  pipelineId?: string;
  parentRunId?: string | null;
  approvalPolicy?: string;
  format?: 'text' | 'json';
  targetStageId?: string;
  runEvents?: import('./events/runEvents.js').RunEventEmitter;
}

export interface PlanOptions {
  taskId?: string;
  pipelineId?: string;
  targetStageId?: string;
}

export interface ResumeOptions {
  runId: string;
  resumeToken?: string;
  actor?: string;
  reason?: string;
  format?: 'text' | 'json';
  targetStageId?: string;
  runEvents?: import('./events/runEvents.js').RunEventEmitter;
}

export interface StatusOptions {
  runId: string;
  watch?: boolean;
  interval?: number;
  format?: 'text' | 'json';
}

export interface PipelineExecutionResult {
  manifest: CliManifest;
  runSummary: RunSummary;
}

export type { TaskContext, RunSummary } from '../types.js';

export interface PipelineRunExecutionResult {
  success: boolean;
  notes: string[];
  manifest: CliManifest;
  manifestPath: string;
  logPath: string;
}

export interface TaskMetadataEntry {
  id: string;
  slug: string;
  title: string;
}
