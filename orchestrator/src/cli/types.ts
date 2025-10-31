import type { PlanResult, RunSummary } from '../types.js';

export type PipelineStage = CommandStage | SubPipelineStage;

export interface PipelineDefinition {
  id: string;
  title: string;
  description?: string;
  stages: PipelineStage[];
  tags?: string[];
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
    source: 'default' | 'user';
  };
  stages: PlanPreviewStage[];
  plan: PlanResult;
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
}

export type RunStatus = 'queued' | 'in_progress' | 'succeeded' | 'failed' | 'cancelled';

export interface StartOptions {
  taskId?: string;
  pipelineId?: string;
  parentRunId?: string | null;
  approvalPolicy?: string;
  format?: 'text' | 'json';
}

export interface PlanOptions {
  taskId?: string;
  pipelineId?: string;
}

export interface ResumeOptions {
  runId: string;
  resumeToken?: string;
  actor?: string;
  reason?: string;
  format?: 'text' | 'json';
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
