import type { ControlPlaneManifestSection } from '../control-plane/types.js';
import type { SchedulerManifest } from '../scheduler/types.js';
import type { PlanResult, RunSummary } from '../types.js';
import type { SandboxState, ToolRunStatus } from '../../../packages/shared/manifest/types.js';

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

export interface CliManifestCommand {
  index: number;
  id: string;
  title: string;
  command: string | null;
  kind: 'command' | 'subpipeline';
  status: CommandStatus;
  started_at: string | null;
  completed_at: string | null;
  exit_code: number | null;
  summary: string | null;
  log_path: string | null;
  error_file: string | null;
  sub_run_id?: string | null;
}

export type CommandStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export interface ChildRunRecord {
  run_id: string;
  pipeline_id: string;
  status: RunStatus;
  manifest: string;
}

export interface ApprovalRecord {
  actor: string;
  timestamp: string;
  reason?: string;
}

export interface PromptPackManifestEntry {
  id: string;
  domain: string;
  stamp: string;
  experience_slots: number;
  sources: string[];
  experiences?: string[];
}

export type LearningValidationMode = 'per-task' | 'grouped';
export type LearningValidationStatus =
  | 'pending'
  | 'validated'
  | 'snapshot_failed'
  | 'stalled_snapshot'
  | 'needs_manual_scenario';

export interface LearningValidationPolicy {
  mode: LearningValidationMode;
  grouping?: LearningGrouping | null;
  status?: LearningValidationStatus;
  reason?: string | null;
  log_path?: string | null;
  last_error?: string | null;
  git_status_path?: string | null;
  git_log_path?: string | null;
}

export interface LearningGrouping {
  id: string;
  members: string[];
  window_hours?: number;
}

export type LearningSnapshotStatus = 'pending' | 'captured' | 'snapshot_failed' | 'stalled_snapshot';

export interface LearningSnapshotManifest {
  tag: string;
  commit_sha: string;
  tarball_path: string;
  tarball_digest: string;
  storage_path: string;
  retention_days: number;
  status: LearningSnapshotStatus;
  attempts: number;
  created_at: string;
  last_error?: string | null;
  git_status_path?: string | null;
  git_log_path?: string | null;
}

export interface LearningQueueRecord {
  snapshot_id: string;
  diff_path: string | null;
  prompt_path: string | null;
  execution_history_path: string | null;
  manifest_path: string;
  enqueued_at: string;
  payload_path: string;
  status: 'queued' | 'failed';
}

export type LearningScenarioStatus = 'pending' | 'synthesized' | 'needs_manual_scenario';

export interface LearningScenarioRecord {
  path: string | null;
  generated_at: string | null;
  source: 'execution_history' | 'prompt' | 'diff' | 'template' | 'manual';
  status: LearningScenarioStatus;
  attempts: number;
  partial_path?: string | null;
  manual_template?: string | null;
  approver?: string | null;
  reason?: string | null;
}

export type LearningAlertType = 'snapshot_failed' | 'stalled_snapshot' | 'needs_manual_scenario' | 'budget_exceeded';

export interface LearningAlertRecord {
  type: LearningAlertType;
  channel: 'slack' | 'pagerduty';
  target: string;
  message: string;
  created_at: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface LearningApprovalRecord {
  actor: string;
  timestamp: string;
  reason?: string | null;
  state: 'stalled_snapshot' | 'needs_manual_scenario' | 'requeue';
}

export interface LearningCrystalizerRecord {
  candidate_path: string | null;
  model: string;
  prompt_pack: string;
  prompt_pack_stamp: string | null;
  budget_usd: number;
  cost_usd: number | null;
  status: 'pending' | 'succeeded' | 'skipped' | 'failed';
  error?: string | null;
  created_at: string;
}

export interface LearningReviewRecord {
  rejections: number;
  latency_ms: number | null;
  last_reviewer?: string | null;
  updated_at: string;
}

export interface LearningRegressionsRecord {
  detected: number;
  detail_path?: string | null;
}

export interface LearningPatternHygieneRecord {
  promoted: number;
  deprecated: number;
  notes?: string[];
  updated_at: string;
}

export interface LearningThroughputRecord {
  candidates: number;
  active: number;
  deprecated: number;
  updated_at: string;
}

export interface LearningManifestSection {
  snapshot?: LearningSnapshotManifest | null;
  queue?: LearningQueueRecord | null;
  scenario?: LearningScenarioRecord | null;
  validation?: LearningValidationPolicy | null;
  crystalizer?: LearningCrystalizerRecord | null;
  alerts?: LearningAlertRecord[];
  approvals?: LearningApprovalRecord[];
  review?: LearningReviewRecord | null;
  regressions?: LearningRegressionsRecord | null;
  pattern_hygiene?: LearningPatternHygieneRecord | null;
  throughput?: LearningThroughputRecord | null;
}

export interface TfgrpoToolMetric {
  tool: string;
  tokens: number;
  cost_usd: number;
  latency_ms: number;
  attempts: number;
  status: ToolRunStatus;
  sandbox_state: SandboxState;
}

export interface TfgrpoToolMetricsSummary {
  tool_calls: number;
  token_total: number;
  cost_usd: number;
  latency_ms: number;
  per_tool: TfgrpoToolMetric[];
}

export interface TfgrpoExperienceSummary {
  ids: string[];
  written: number;
  manifest_path: string | null;
}

export interface TfgrpoManifestSection {
  epoch: number | null;
  group_id: string | null;
  group_size: number | null;
  tool_metrics?: TfgrpoToolMetricsSummary;
  experiences?: TfgrpoExperienceSummary;
}

export interface HandleRecord {
  handle_id: string;
  correlation_id: string;
  stage_id: string | null;
  pipeline_id: string;
  status: 'open' | 'closed';
  frame_count: number;
  latest_sequence: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface PrivacyDecisionRecord {
  handle_id: string;
  sequence: number;
  action: 'allow' | 'redact' | 'block';
  rule?: string | null;
  reason?: string | null;
  timestamp: string;
  stage_id: string | null;
}

export interface PrivacyTotals {
  total_frames: number;
  redacted_frames: number;
  blocked_frames: number;
  allowed_frames: number;
}

export interface PrivacyManifest {
  mode: 'shadow' | 'enforce';
  decisions: PrivacyDecisionRecord[];
  totals: PrivacyTotals;
  log_path?: string | null;
}

export interface CliManifest {
  version: number;
  task_id: string;
  task_slug: string | null;
  run_id: string;
  parent_run_id: string | null;
  pipeline_id: string;
  pipeline_title: string;
  runner: 'codex-cli';
  approval_policy: string | null;
  status: RunStatus;
  status_detail: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
  heartbeat_at: string | null;
  heartbeat_interval_seconds: number;
  heartbeat_stale_after_seconds: number;
  artifact_root: string;
  compat_path: string;
  log_path: string;
  summary: string | null;
  metrics_recorded: boolean;
  resume_token: string;
  resume_events: Array<{
    timestamp: string;
    actor: string;
    reason: string;
    outcome: 'accepted' | 'blocked';
    detail?: string;
  }>;
  approvals: ApprovalRecord[];
  commands: CliManifestCommand[];
  child_runs: ChildRunRecord[];
  run_summary_path: string | null;
  plan_target_id: string | null;
  instructions_hash: string | null;
  instructions_sources: string[];
  prompt_packs?: PromptPackManifestEntry[] | null;
  guardrails_required?: boolean;
  control_plane?: ControlPlaneManifestSection;
  scheduler?: SchedulerManifest;
  handles?: HandleRecord[];
  privacy?: PrivacyManifest;
  guardrail_status?: {
    present: boolean;
    recommendation: string | null;
    summary: string;
    computed_at: string;
    counts: {
      total: number;
      succeeded: number;
      failed: number;
      skipped: number;
      other: number;
    };
  };
  learning?: LearningManifestSection | null;
  tfgrpo?: TfgrpoManifestSection | null;
}

export type RunStatus = 'queued' | 'in_progress' | 'succeeded' | 'failed' | 'cancelled';

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
